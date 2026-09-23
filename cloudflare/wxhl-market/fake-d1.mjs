// 假 D1：只实现本 Worker 用到的 SQL 子集
// （CREATE TABLE/INDEX、INSERT [OR REPLACE]／SELECT…ON CONFLICT、UPDATE 条件扣减、
//   SELECT+WHERE/ORDER BY/LIMIT/OFFSET、COUNT(*)、DELETE、
//   orders 表的发布/大厅/接单/交付/验收/退货/待领取/ACK）
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

// ———— orders 表的四条语句 ————
// 订单段的 SQL 形态很少（就下面这几条），所以**整句**锚定而不是拆 WHERE：
// 这些语句的占位符全是位置参数，拆着认一旦看漏，参数就静默错位（例如把 maker 当 status），
// 测试照样绿。整句锚定后，worker 改了 LIMIT / 排序 / 少了守卫条件，假件立刻炸 —— 宁可炸也不要错位。
// 比对前先把空白归一，免得被换行与缩进差异绕过。
const oneLine = sql => sql.replace(/\s+/g, ' ').trim();
/** 大厅：只出「待接单」且排除自己发的，新的在前，最多 100 条 */
const ORDER_HALL_SQL =
  /^SELECT \* FROM orders WHERE status = \? AND poster != \? ORDER BY created DESC LIMIT 100$/i;
/** 接单：WHERE 带 status 守卫，受影响 0 行即「已被接走」—— 并发仲裁点 */
const ORDER_ACCEPT_SQL =
  /^UPDATE orders SET maker = \?, status = \?, updated = \? WHERE id = \? AND status = \?$/i;
/** 发布：maker 是显式 NULL，所以占位符比列数少一个 */
const ORDER_INSERT_SQL =
  /^INSERT INTO orders \(id, poster, maker, spec_json, deposit, final, status, created, updated\) VALUES \(\?, \?, NULL, \?, \?, \?, \?, \?, \?\)$/i;
/** 断言用：查单行的接单人/状态 */
const ORDER_BY_ID_SQL = /^SELECT maker, status FROM orders WHERE id = \?$/i;

// ———— v4a 第二段（交付 / 验收 / 退货 / 待领取 / ACK）新增的形态 ————
// 同样整句锚定。理由同上：这些语句全是位置参数，拆着认一旦看漏就静默错位
// （比如把 item_json 当 updated 绑），测试照样绿。整句锚定后 worker 少写一个守卫条件、
// 改一处 LIMIT，假件立刻炸出来。
/** 读整行（.first()）：交付/验收/退货前先看状态与当事人 */
const ORDER_ONE_SQL = /^SELECT \* FROM orders WHERE id = \?$/i;
/** 待领取汇总（.all()）：`poster = ? OR maker = ?` 里的 OR 拼不进按 AND 切分的通用 WHERE */
const ORDER_MINE_SQL =
  /^SELECT \* FROM orders WHERE poster = \? OR maker = \? ORDER BY updated DESC LIMIT 200$/i;
/** 状态推进：带 item_json 的是交付，不带的是一条验收/退货 —— 两条分开锚，免得参数错位 */
const ORDER_ADVANCE_SQL =
  /^UPDATE orders SET status = \?, updated = \? WHERE id = \? AND status = \?$/i;
const ORDER_ADVANCE_ITEM_SQL =
  /^UPDATE orders SET status = \?, updated = \?, item_json = \? WHERE id = \? AND status = \?$/i;
/** ACK：把某一**项**的 ack 位置 1。列名限定为按项 ACK 的三个合法列 —— 拼错列名即炸，不静默放过 */
const ORDER_ACK_SQL =
  /^UPDATE orders SET (maker_deposit_ack|maker_final_ack|poster_ack) = 1, updated = \? WHERE id = \?$/i;
/** 双方 ACK 完删行 */
const ORDER_DELETE_SQL = /^DELETE FROM orders WHERE id = \?$/i;

/** 从语句里取 WHERE 片段（去掉 ORDER BY 之后的部分） */
const whereOf = sql => (sql.split(/WHERE/i)[1] ?? '').split(/ORDER BY/i)[0].trim();

export function makeFakeD1() {
  const listings = new Map();
  const earnings = new Map();
  /** name → { name, lv, title, job, updated }，主键就是姓名 —— 同名写入即顶掉 */
  const ranks = new Map();
  /** 出售记录。主键是**每笔成交各自的 id**（不是挂单 id），同一挂单多次成交互不覆盖 */
  const sales = new Map();
  /** 工坊订单。主键是订单 id；状态是行上的字段（长流程，不是「有行/无行」） */
  const orders = new Map();

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
    // 订单段：双方 ACK 完删行。整句锚定，理由见上方常量处。
    if (ORDER_DELETE_SQL.test(oneLine(sql))) {
      const id = args[0];
      if (!orders.has(id)) return ok(0);
      orders.delete(id);
      return ok(1);
    }
    // DELETE FROM earnings WHERE client = ? AND amount = ?
    // 整句锚定（原来是落到这里的兜底分支）：兜底会把任何**没认出来的 DELETE** 静默当成
    // 「记账没命中」返回 0 行 —— 那正是文件头警告的假绿形态。订单段下一步会加
    // `DELETE FROM orders`，不锚死它就会悄悄走进这里、删了跟没删一样而测试全绿。
    if (!/^DELETE FROM earnings WHERE client = \? AND amount = \?$/i.test(oneLine(sql)))
      throw new Error(`fakeD1 不认识的 DELETE: 「${sql.slice(0, 60)}…」`);
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
    if (/FROM orders/i.test(sql)) {
      const line = oneLine(sql);
      // 大厅：`!=` 不在 evalSimpleWhere 的支持集里（那个只认 <= >= < > =），所以这两条整句认
      if (ORDER_HALL_SQL.test(line)) {
        const [status, exclude] = args;
        const rows = [...orders.values()]
          .filter(r => r.status === status && r.poster !== exclude)
          .sort((a, b) => b.created - a.created);
        const limit = Number(line.match(/LIMIT (\d+)/i)[1]);
        return { results: rows.slice(0, limit).map(r => ({ ...r })) };
      }
      if (ORDER_BY_ID_SQL.test(line)) {
        const row = orders.get(args[0]);
        // 只投影语句点名的两列（真 D1 不会多给）
        return { results: row ? [{ maker: row.maker, status: row.status }] : [] };
      }
      // 读整行：交付/验收/退货/ACK 都要先看状态与当事人，真 D1 会给出全部列
      if (ORDER_ONE_SQL.test(line)) {
        const row = orders.get(args[0]);
        return { results: row ? [{ ...row }] : [] };
      }
      // 待领取汇总：发单侧 + 接单侧的订单，新的在前
      if (ORDER_MINE_SQL.test(line)) {
        const [poster, maker] = args;
        const rows = [...orders.values()]
          .filter(r => r.poster === poster || r.maker === maker)
          .sort((a, b) => b.updated - a.updated);
        return { results: rows.slice(0, 200).map(r => ({ ...r })) };
      }
      throw new Error(`fakeD1 不认识这个 orders 查询: 「${sql.slice(0, 60)}…」`);
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
          // ———— 工坊订单：发布。maker 是显式 NULL，所以绑定的 8 个参数跳过它 ————
          if (ORDER_INSERT_SQL.test(oneLine(sql))) {
            const [id, poster, spec_json, deposit, final, status, created, updated] = st._a;
            orders.set(id, {
              id, poster, maker: null, spec_json,
              deposit: Number(deposit), final: Number(final), status,
              // 本轮不写的列也照真表 schema 补上，行形状与真 D1 一致（后续段要用）。
              // Ruling I：ack 位按项三个（订金 / 尾款(含退回成品) / 成品），不再是每侧一个。
              item_json: null, rating: null, comp_json: null,
              maker_deposit_ack: 0, maker_final_ack: 0, poster_ack: 0,
              created: Number(created), updated: Number(updated),
            });
            return ok(1);
          }
          // ———— 工坊订单：原子接单（并发仲裁点）————
          // WHERE 里的 status 就是「还是待接单吗」的守卫：状态不符则一行都不动，
          // 返回 meta.changes = 0，worker 据此回「手慢了」。
          if (ORDER_ACCEPT_SQL.test(oneLine(sql))) {
            const [maker, status, updated, id, need] = st._a;
            const row = orders.get(id);
            if (!row || row.status !== need) return ok(0);
            row.maker = maker;
            row.status = status;
            row.updated = Number(updated);
            return ok(1);
          }
          // ———— 工坊订单：交付（多写一列 item_json）。WHERE 的旧状态是并发守卫 ————
          if (ORDER_ADVANCE_ITEM_SQL.test(oneLine(sql))) {
            const [status, updated, item_json, id, need] = st._a;
            const row = orders.get(id);
            if (!row || row.status !== need) return ok(0);
            row.status = status;
            row.item_json = item_json;
            row.updated = Number(updated);
            return ok(1);
          }
          // ———— 工坊订单：验收 / 退货（不带 item_json，参数比上一条少一个）————
          if (ORDER_ADVANCE_SQL.test(oneLine(sql))) {
            const [status, updated, id, need] = st._a;
            const row = orders.get(id);
            if (!row || row.status !== need) return ok(0);
            row.status = status;
            row.updated = Number(updated);
            return ok(1);
          }
          // ———— 工坊订单：ACK 记某一项已领取（重复 ACK 只是再写一次 1）————
          const ackM = oneLine(sql).match(ORDER_ACK_SQL);
          if (ackM) {
            const [updated, id] = st._a;
            const row = orders.get(id);
            if (!row) return ok(0);
            row[ackM[1]] = 1;
            row.updated = Number(updated);
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
