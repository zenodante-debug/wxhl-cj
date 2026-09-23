// 假 D1：只实现本 Worker 用到的 SQL 子集
// （CREATE TABLE/INDEX、INSERT [OR REPLACE]、ON CONFLICT 累加、SELECT+WHERE/ORDER BY/LIMIT、DELETE）
// 供 smoke.mjs 与 worker.test.js 共用，避免两处实现漂移。
//
// 注意：判定必须用 ^ 锚定的前缀匹配——INSERT 语句里含 `created` 列名，/CREATE/i 会误匹配。
export function makeFakeD1() {
  const listings = new Map();
  const earnings = new Map();
  const sales = new Map();

  return {
    prepare(sql) {
      const st = { _a: [], bind(...a) { st._a = a; return st; } };

      st.first = async () => {
        if (/FROM listings/i.test(sql)) return listings.get(st._a[0]) ?? null;
        if (/FROM earnings/i.test(sql)) {
          const v = earnings.get(st._a[0]);
          return v === undefined ? null : { amount: v };
        }
        return null;
      };

      st.all = async () => {
        if (/FROM sales/i.test(sql)) {
          const client = st._a[0];
          const rows = [...sales.values()].filter(s => s.client === client).sort((a, b) => b.created - a.created);
          return { results: rows.slice(0, st._a[1] ?? 100) };
        }
        let rows = [...listings.values()];
        const where = sql.split(/WHERE/i)[1] ?? '';
        let i = 0;
        for (const cond of where.split(/AND/i).map(s => s.trim()).filter(Boolean)) {
          if (/^id = \?/i.test(cond)) { const v = st._a[i++]; rows = rows.filter(r => r.id === v); }
          else if (/^client = \?/i.test(cond)) { const v = st._a[i++]; rows = rows.filter(r => r.client === v); }
          else if (/^category = \?/i.test(cond)) { const v = st._a[i++]; rows = rows.filter(r => r.category === v); }
          else if (/^tier_idx = \?/i.test(cond)) { const v = st._a[i++]; rows = rows.filter(r => r.tier_idx === v); }
          else if (/^quality = \?/i.test(cond)) { const v = st._a[i++]; rows = rows.filter(r => r.quality === v); }
        }
        rows.sort((a, b) => b.created - a.created);
        const lim = st._a[st._a.length - 1];
        if (typeof lim === 'number') rows = rows.slice(0, lim);
        return { results: rows };
      };

      st.run = async () => {
        if (/^INSERT INTO earnings/i.test(sql)) {
          earnings.set(st._a[0], (earnings.get(st._a[0]) ?? 0) + st._a[1]);
          return { changes: 1 };
        }
        if (/^INSERT (OR REPLACE )?INTO sales/i.test(sql)) {
          const a = st._a;
          sales.set(a[0], { id: a[0], client: a[1], buyer: a[2], item_json: a[3], qty: a[4], price: a[5], created: a[6] });
          return { changes: 1 };
        }
        if (/^INSERT INTO listings/i.test(sql)) {
          const a = st._a;
          listings.set(a[0], {
            id: a[0], client: a[1], seller: a[2], tier: a[3], kind: a[4],
            category: a[5], tier_idx: a[6], quality: a[7], item_name: a[8],
            item_json: a[9], qty: a[10], price: a[11], created: a[12], op_json: a[13] ?? null,
          });
          return { changes: 1 };
        }
        if (/^CREATE/i.test(sql)) return { changes: 0 };
        if (/^DELETE FROM listings/i.test(sql)) return { changes: listings.delete(st._a[0]) ? 1 : 0 };
        if (/^DELETE FROM earnings/i.test(sql)) {
          if (earnings.get(st._a[0]) !== st._a[1]) return { changes: 0 };
          earnings.delete(st._a[0]);
          return { changes: 1 };
        }
        return { changes: 0 };
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
