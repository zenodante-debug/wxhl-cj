/**
 * 假 D1：只实现本 Worker 用到的 SQL 子集（CREATE TABLE/INDEX、INSERT…ON CONFLICT、
 * SELECT/WHERE/ORDER BY/LIMIT/OFFSET、COUNT(*)、DELETE）。
 * 够真实到能验证业务逻辑，不追求通用。
 *
 * 注意：
 * - 判定必须用 `^` 锚定的前缀匹配 —— INSERT 语句里含 `created` 列名，/CREATE/i 会误匹配。
 * - **认不出的 WHERE 条件一律抛错**，不静默放过。否则 worker 改了 SQL 而假 D1 装没看见，
 *   测试会假绿。
 * - `run()` 的返回形状照**真 D1**：变更行数在 `result.meta.changes`，**不是**顶层 `changes`。
 *   2026-09-22 踩过：假 D1 原先返回顶层 `changes`，worker 也就照着读 `r.changes`，
 *   测试全绿而线上管理的删除计数恒为 0。假件跟真件形状不一致 = 测试白写。
 * - ranks 的排序 / 名次 / LIMIT OFFSET 语义已用真 SQLite（`node:sqlite`）核对过，
 *   与 D1 行为一致（D1 就是 SQLite）。见 rank.test.js 顶部说明。
 */

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

export function fakeD1() {
  const listings = new Map();
  const earnings = new Map();
  /** name → { name, lv, title, job, updated }，主键就是姓名 —— 同名写入即顶掉 */
  const ranks = new Map();

  function runDelete(sql, args) {
    if (/^DELETE FROM listings/i.test(sql)) {
      const id = args[0];
      if (!listings.has(id)) return ok(0);
      listings.delete(id);
      return ok(1);
    }
    if (/^DELETE FROM ranks/i.test(sql)) {
      const whereStr = (sql.split(/WHERE/i)[1] ?? '').trim();
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

  /** 求值 ranks 的 WHERE；认不出就抛错（见文件头注释） */
  function evalRankWhere(row, whereStr, args) {
    if (RANK_TIE_WHERE.test(whereStr)) {
      const [lv, , updated, , , name] = args;
      return row.lv > lv || (row.lv === lv && row.updated < updated) || (row.lv === lv && row.updated === updated && row.name < name);
    }
    let i = 0;
    return whereStr.split(/\s+AND\s+/i).every(cond => {
      const m = cond.trim().match(/^(\w+)\s*(<|>|=)\s*\?$/);
      if (!m) throw new Error(`fakeD1 不认识这个 WHERE 条件: 「${cond.trim()}」`);
      const v = args[i++];
      if (m[2] === '<') return row[m[1]] < v;
      if (m[2] === '>') return row[m[1]] > v;
      return row[m[1]] === v;
    });
  }

  function selectRanks(sql, args) {
    const whereStr = (sql.split(/WHERE/i)[1] ?? '').split(/ORDER BY/i)[0].trim();
    let rows = [...ranks.values()];
    if (whereStr) rows = rows.filter(r => evalRankWhere(r, whereStr, args));

    if (/COUNT\(\*\)/i.test(sql)) return { results: [], first: { n: rows.length } };

    // 有 WHERE 时，? 都被 WHERE 吃掉了，后面的 LIMIT/OFFSET 参数接在它后面
    let argi = whereStr ? whereStr.split(/\?/).length - 1 : 0;
    rows.sort(rankOrder);
    if (/OFFSET/i.test(sql)) {
      const offset = Number(args[argi + 1]) || 0;
      rows = rows.slice(offset);
    }
    const limit = args[argi];
    if (typeof limit === 'number') rows = rows.slice(0, limit);
    return { results: rows.map(r => ({ ...r })) };
  }

  function runSelect(sql, args) {
    if (/FROM listings/i.test(sql)) {
      let rows = [...listings.values()];
      const whereStr = sql.split(/WHERE/i)[1] ?? '';
      let argi = 0;
      for (const cond of whereStr.split(/AND/i).map(s => s.trim()).filter(Boolean)) {
        if (/^id = \?/i.test(cond)) { const v = args[argi++]; rows = rows.filter(r => r.id === v); }
        else if (/^client = \?/i.test(cond)) { const v = args[argi++]; rows = rows.filter(r => r.client === v); }
        else if (/^category = \?/i.test(cond)) { const v = args[argi++]; rows = rows.filter(r => r.category === v); }
        else if (/^tier_idx = \?/i.test(cond)) { const v = args[argi++]; rows = rows.filter(r => r.tier_idx === v); }
        else if (/^quality = \?/i.test(cond)) { const v = args[argi++]; rows = rows.filter(r => r.quality === v); }
      }
      rows.sort((a, b) => b.created - a.created);
      const limit = args[args.length - 1];
      if (typeof limit === 'number') rows = rows.slice(0, limit);
      return { results: rows.map(r => ({ ...r })) };
    }
    if (/FROM ranks/i.test(sql)) return selectRanks(sql, args);
    if (/FROM earnings/i.test(sql)) {
      const v = earnings.get(args[0]);
      return { results: [], first: v === undefined ? null : { amount: v } };
    }
    return { results: [] };
  }

  return {
    prepare(sql) {
      const stmt = {
        _args: [],
        bind(...a) { stmt._args = a; return stmt; },
        async first() {
          const r = runSelect(sql, stmt._args);
          // COUNT(*) 之类的聚合走 .first；普通查询取第一行
          if (r.first !== undefined) return r.first;
          return r.results?.[0] ?? null;
        },
        async all() { return runSelect(sql, stmt._args); },
        async run() {
          if (/^INSERT INTO earnings/i.test(sql)) {
            const [client, amount] = stmt._args;
            earnings.set(client, (earnings.get(client) ?? 0) + Number(amount));
            return ok(1);
          }
          if (/^INSERT INTO ranks/i.test(sql)) {
            const [name, lv, title, job, updated] = stmt._args;
            // 无条件覆盖 = 同名后来的顶掉先前的（同一个玩家换新存档也走这条）
            ranks.set(name, { name, lv: Number(lv), title, job, updated: Number(updated) });
            return ok(1);
          }
          if (/^INSERT INTO listings/i.test(sql)) {
            const a = stmt._args;
            listings.set(a[0], {
              id: a[0], client: a[1], seller: a[2], tier: a[3], kind: a[4],
              category: a[5], tier_idx: a[6], quality: a[7], item_name: a[8],
              item_json: a[9], qty: a[10], price: a[11], created: a[12],
            });
            return ok(1);
          }
          if (/^CREATE/i.test(sql)) return ok(0);
          if (/^DELETE/i.test(sql)) return runDelete(sql, stmt._args);
          return ok(0);
        },
      };
      return stmt;
    },
    async batch(stmts) {
      const out = [];
      for (const s of stmts) out.push(await s.run());
      return out;
    },
  };
}
