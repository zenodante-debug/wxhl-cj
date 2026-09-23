// 假 D1：只实现本 Worker 用到的 SQL 子集
// （CREATE TABLE/INDEX、INSERT [OR REPLACE]／SELECT…ON CONFLICT、UPDATE 条件扣减、
//   SELECT+WHERE/ORDER BY/LIMIT/OFFSET、COUNT(*)、DELETE）
// 供 smoke.mjs、worker.test.js、rank.test.js、buy.test.js **共用** —— 只有这一份。
//
// 2026-09-23 合并：此前仓库里同时存在 fake-d1.js 与 fake-d1.mjs 两份假 D1，各自被不同测试引用。
// 两份假件漂移正是这个项目反复踩的坑，已合并为本文件；新增 SQL 一律加在这里，不要再另起一份。
//
// 注意：
// - 判定必须用 `^` 锚定的前缀匹配 —— INSERT 语句里含 `created` 列名，/CREATE/i 会误匹配。
// - **认不出的 SQL / WHERE 一律抛错**，不静默放过。否则 worker 改了 SQL 而假 D1 装没看见，
//   测试会假绿（2026-09-22 踩过：`INSERT INTO sales` 曾静默走进兜底分支）。
// - `run()` 返回形状照**真 D1**：变更行数在 `result.meta.changes`，**不是**顶层 `changes`。
//   2026-09-22 踩过：假件返回顶层 `changes`，worker 也就照着读，测试全绿而线上删除计数恒为 0。
// - 排序/名次/LIMIT OFFSET，以及部分购买「条件扣减」四步（超量时四步全不动）的语义，
//   都已用真 SQLite（`node:sqlite`）核对过 —— D1 就是 SQLite。

/** 真 D1 的 D1Result 形状 */
const ok = changes => ({ success: true, meta: { changes } });

/** ranks 的排序键：等级高的在前；同等级先上传的在前；再同则按姓名，保证名次可复现 */
function rankOrder(a, b) {
  if (a.lv !== b.lv) return b.lv - a.lv;
  if (a.updated !== b.updated) return a.updated - b.updated;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** 名次统计用的条件（带 OR，得在按 AND 切分之前先认出来） */
const RANK_TIE_WHERE =
  /^lv > \? OR \(lv = \? AND updated < \?\) OR \(lv = \? AND updated = \? AND name < \?\)$/i;

/** 从语句里取 WHERE 片段（去掉 ORDER BY 之后的部分） */
const whereOf = sql => (sql.split(/WHERE/i)[1] ?? '').split(/ORDER BY/i)[0].trim();

export function makeFakeD1() {
  const listings = new Map();
  const earnings = new Map();
  /** name → { name, lv, title, job, updated }，主键就是姓名 —— 同名写入即顶掉 */
  const ranks = new Map();
  /** 出售记录。主键是**每笔成交各自的 id**（不是挂单 id），同一挂单多次成交互不覆盖 */
  const sales = new Map();

  /** 求值 `列 比较符 ?` 形式的条件；认不出就抛错（见文件头注释） */
  function evalSimpleWhere(row, whereStr, args) {
    let i = 0;
    return whereStr.split(/\s+AND\s+/i).every(cond => {
      const m = cond.trim().match(/^(\w+)\s*(<=|>=|<|>|=)\s*\?$/);
      if (!m) throw new Error(`fakeD1 不认识这个 WHERE 条件: 「${cond.trim()}」`);
      const v = args[i++];
      if (m[2] === '<') return row[m[1]] < v;
      if (m[2] === '>') return row[m[1]] > v;
      if (m[2] === '<=') return row[m[1]] <= v;
      if (m[2] === '>=') return row[m[1]] >= v;
      return row[m[1]] === v;
    });
  }

  function evalRankWhere(row, whereStr, args) {
    if (RANK_TIE_WHERE.test(whereStr)) {
      const [lv, , updated, , , name] = args;
      return (
        row.lv > lv ||
        (row.lv === lv && row.updated < updated) ||
        (row.lv === lv && row.updated === updated && row.name < name)
      );
    }
    return evalSimpleWhere(row, whereStr, args);
  }

  /** 通用筛选 + 排序 + LIMIT/OFFSET；order 省略则不排序 */
  function page(rows, sql, args, order) {
    const whereStr = whereOf(sql);
    const consumed = whereStr ? whereStr.split(/\?/).length - 1 : 0;
    let out = whereStr ? rows.filter(r => evalSimpleWhere(r, whereStr, args)) : rows;
    if (order) out = [...out].sort(order);
    if (/OFFSET/i.test(sql)) out = out.slice(Number(args[consumed + 1]) || 0);
    const limit = args[consumed];
    if (typeof limit === 'number') out = out.slice(0, limit);
    return out;
  }

  function runDelete(sql, args) {
    if (/^DELETE FROM listings/i.test(sql)) {
      const id = args[0];
      const row = listings.get(id);
      if (!row) return ok(0);
      // 「卖光了才删」的形态带 qty <= 0 守卫；cancel 的形态没有
      if (/qty\s*<=\s*0/i.test(sql) && Number(row.qty) > 0) return ok(0);
      listings.delete(id);
      return ok(1);
    }
    if (/^DELETE FROM ranks/i.test(sql)) {
      const whereStr = whereOf(sql);
      if (!whereStr) {
        const n = ranks.size;
        ranks.clear();
        return ok(n);
      }
      const doomed = [...ranks.values()].filter(r => evalRankWhere(r, whereStr, args));
      for (const r of doomed) ranks.delete(r.name);
      return ok(doomed.length);
    }
    // DELETE FROM earnings WHERE client = ? AND amount = ?
    const client = args[0];
    if (!earnings.has(client)) return ok(0);
    if (earnings.get(client) !== args[1]) return ok(0);
    earnings.delete(client);
    return ok(1);
  }

  function runSelect(sql, args) {
    if (/FROM listings/i.test(sql)) {
      return { results: page([...listings.values()], sql, args, (a, b) => b.created - a.created).map(r => ({ ...r })) };
    }
    if (/FROM sales/i.test(sql)) {
      return { results: page([...sales.values()], sql, args, (a, b) => b.created - a.created).map(r => ({ ...r })) };
    }
    if (/FROM ranks/i.test(sql)) {
      const whereStr = whereOf(sql);
      const rows = whereStr ? [...ranks.values()].filter(r => evalRankWhere(r, whereStr, args)) : [...ranks.values()];
      if (/COUNT\(\*\)/i.test(sql)) return { results: [], first: { n: rows.length } };
      const consumed = whereStr ? whereStr.split(/\?/).length - 1 : 0;
      let out = [...rows].sort(rankOrder);
      if (/OFFSET/i.test(sql)) out = out.slice(Number(args[consumed + 1]) || 0);
      const limit = args[consumed];
      if (typeof limit === 'number') out = out.slice(0, limit);
      return { results: out.map(r => ({ ...r })) };
    }
    if (/FROM earnings/i.test(sql)) {
      const v = earnings.get(args[0]);
      return { results: [], first: v === undefined ? null : { amount: v } };
    }
    throw new Error(`fakeD1 不认识的 SELECT: 「${sql.slice(0, 60)}…」`);
  }

  /** 部分购买/出售记录共用的「库存够才动手」守卫：返回挂单行，不够就 null */
  function claimable(id, need) {
    const row = listings.get(id);
    return row && Number(row.qty) >= Number(need) ? row : null;
  }

  return {
    prepare(sql) {
      const st = {
        _a: [],
        bind(...a) { st._a = a; return st; },
        async first() {
          const r = runSelect(sql, st._a);
          // COUNT(*) 之类的聚合走 .first；普通查询取第一行
          if (r.first !== undefined) return r.first;
          return r.results?.[0] ?? null;
        },
        async all() { return runSelect(sql, st._a); },
        async run() {
          // ———— 部分购买：条件式记出售记录（库存够才记） ————
          if (/^INSERT OR REPLACE INTO sales/i.test(sql)) {
            const [saleId, buyer, qty, created, id, need] = st._a;
            const row = claimable(id, need);
            if (!row) return ok(0);
            sales.set(saleId, {
              id: saleId, client: row.client, buyer, item_json: row.item_json,
              qty: Number(qty), price: Number(row.price), created: Number(created),
            });
            return ok(1);
          }
          // ———— 部分购买：条件式记账货款（单价 × 买走数量） ————
          if (/^INSERT INTO earnings[\s\S]*SELECT/i.test(sql)) {
            const [qty, id, need] = st._a;
            const row = claimable(id, need);
            if (!row) return ok(0);
            earnings.set(row.client, (earnings.get(row.client) ?? 0) + Number(row.price) * Number(qty));
            return ok(1);
          }
          // ———— 部分购买：原子扣减（并发仲裁点） ————
          if (/^UPDATE listings SET qty = qty - \?/i.test(sql)) {
            const [qty, id, need] = st._a;
            const row = claimable(id, need);
            if (!row) return ok(0);
            row.qty = Number(row.qty) - Number(qty);
            return ok(1);
          }
          // 整份购买（旧路径，为向后兼容保留）：无条件累加
          if (/^INSERT INTO earnings \(client, amount\) VALUES/i.test(sql)) {
            earnings.set(st._a[0], (earnings.get(st._a[0]) ?? 0) + st._a[1]);
            return ok(1);
          }
          if (/^INSERT INTO ranks/i.test(sql)) {
            const [name, lv, title, job, updated] = st._a;
            // 无条件覆盖 = 同名后来的顶掉先前的（同一个玩家换新存档也走这条）
            ranks.set(name, { name, lv: Number(lv), title, job, updated: Number(updated) });
            return ok(1);
          }
          if (/^INSERT INTO listings/i.test(sql)) {
            const a = st._a;
            listings.set(a[0], {
              id: a[0], client: a[1], seller: a[2], tier: a[3], kind: a[4],
              category: a[5], tier_idx: a[6], quality: a[7], item_name: a[8],
              item_json: a[9], qty: a[10], price: a[11], created: a[12], op_json: a[13] ?? null,
            });
            return ok(1);
          }
          if (/^CREATE/i.test(sql)) return ok(0);
          if (/^DELETE/i.test(sql)) return runDelete(sql, st._a);
          throw new Error(`fakeD1 不认识的 SQL: 「${sql.slice(0, 60)}…」`);
        },
      };
      return st;
    },

    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
}
