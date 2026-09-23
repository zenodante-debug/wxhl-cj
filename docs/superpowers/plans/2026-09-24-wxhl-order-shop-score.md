# 工坊订单店铺评分制（v4b 改版）实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 订单评分从（未实现的）星级改为店铺分数制：接单绑定店铺（未开店不准接单）、完成 +1 / 评分 0–5 / 退货 −2 / 弃单 −5、服务器店铺排行榜、弃单赔偿 订金×3。

**Architecture:** Cloudflare Worker 加第四个独立段 `shop_scores`（照 rank/order 段模子），orders 表原地加 `maker_shop` + `poster_comp_ack` 两列；前端在 `crafting/order/` 下加 `rep/` 纯函数层（score/shop/history），store 在原子状态转换成功后上报分数；UI 加「店铺排行」子页签。

**Tech Stack:** Cloudflare Workers + D1（SQLite）、Vue 3 `<script setup>` + pinia、zod 4、vitest（worker.test.js 与 src 测试同 runner）、webpack（transpileOnly，**无 vue-tsc**）。

**Spec:** `docs/superpowers/specs/2026-09-23-wxhl-order-shop-score-design.md`

## Global Constraints

- pnpm 11 依赖校验会卡死代理：所有 pnpm 命令必须 `pnpm --config.verify-deps-before-run=false <cmd>`
- 构建是 `transpileOnly: true`：**不做类型检查**，类型错误只能靠 vitest 与评审肉眼
- MVU 写入纪律：只写 `stat_data.契约者.背包` 与 `stat_data.契约者.经济.UP`；写入基底取 **await 之后的新读值**；店铺名读取是**只读**路径
- fake-d1 **认不出的 SQL 一律抛错**（不许开白名单）；新增 SQL 形态必须逐条登记进 `fake-d1.mjs`
- 服务器信义模型：分数上报不校验来源（与赔偿同等级信任）
- 部署顺序：**先 `wrangler deploy` Worker，后前端 bundle**（本计划不含部署，用户确认后另行执行）
- commit 信息中文、带 `(wxhl)` scope，照 git log 既有风格

## Review Focus

1. **老订单行 `maker_shop` 为 NULL**：验收/退货时分数上报必须跳过（不炸、不报），DTO 里回退显示玩家姓名 → Task 2 worker 测试钉住 DTO 的 null 口径；Task 4 store 用 `if (单.maker_shop)` 守卫
2. **同名店铺共享一行分数**：两个不同接单者用同一店铺名时分数累加进同一行（用户已确认接受）→ Task 1 测试钉住 UPSERT 按名累加
3. **赔不起时弃单**：`spendUP` 必须在**任何请求之前**抛错拦截（零请求零写入）→ Task 4 代码评审点（store 无法单测，靠代码形状核对：预验块在 `busy = true` 与 `abandonOrder` 之前）
4. **`应领` 漏补 `poster_comp` 的空真陷阱**：已弃单若返回空清单，`.every()` 空真成立会静默删行、赔偿款蒸发 → Task 2 测试钉住「双 ACK 后才删行」且「只 ACK 订金不删行」
5. **评分脏输入**：NaN / 小数 / 负数 / 99 必须钳到 [1, 6] 的合法 delta → Task 3 测试钉住钳制

---

### Task 1: Worker 店铺分数段（shop_scores）

**Files:**
- Modify: `cloudflare/wxhl-market/worker.js`（新段插在订单段之后、`const RANK_COLS` 之前；dispatch 插在 handleOrder 之后）
- Modify: `cloudflare/wxhl-market/fake-d1.mjs`
- Test: `cloudflare/wxhl-market/worker.test.js`

**Interfaces:**
- Consumes: worker.js 既有 `withRetry`、`changesOf`、`json`、`cors` 形状（照 handleRank 的用法）
- Produces（Task 4 前端依赖的确切形状）:
  - `POST /shop/score` 请求 `{name: string, delta: number}` → 响应 `{score: number}`；400 时响应体是中文原因
  - `GET /shop/rank?name=<店铺名>` → `{list: {name, score, updated}[], total: number, me: {rank, entry} | null, near: {rank, entry}[]}`（形状与 `/rank/top` 完全一致，仅 lv/title/job 换成 score）
  - 排序：`score DESC, updated ASC, name ASC`（同分先到先排前）

- [ ] **Step 1: 写失败测试**

在 `worker.test.js` 末尾追加（文件已有 `env`/`post`/`get` 助手与 `makeFakeD1` 导入，直接复用）：

```js
describe('店铺分数段', () => {
  const score = (name, delta) => worker.fetch(post('/shop/score', { name, delta }), env());
  const rank = name => worker.fetch(get('/shop/rank?name=' + encodeURIComponent(name)), env()).then(r => r.json());

  it('上报即建行，再次上报按名累加并刷新 updated', async () => {
    let r = await score('铁匠铺', 1);
    expect(r.status).toBe(200);
    expect((await r.json()).score).toBe(1);
    r = await score('铁匠铺', 4);
    expect((await r.json()).score).toBe(5);
    r = await score('铁匠铺', -2);
    expect((await r.json()).score).toBe(3);
  });

  it('同名店铺共享一行（两个接单者同名店铺 → 分数累加进同一行）', async () => {
    await score('同名铺', 2);
    await score('同名铺', 3);
    const b = await rank('同名铺');
    expect(b.total).toBe(1);
    expect(b.me.entry.score).toBe(5);
  });

  it('排行：分数高者在前；同分先到先排前', async () => {
    const e = env();
    const s = (n, d) => worker.fetch(post('/shop/score', { name: n, delta: d }), e);
    await s('早到', 5);   // 先达到 5 分
    await s('晚到', 5);   // 同分，后到
    await s('高分', 6);
    const b = await worker.fetch(get('/shop/rank?name='), e).then(r => r.json());
    expect(b.list.map(x => x.name)).toEqual(['高分', '早到', '晚到']);
  });

  it('me 与邻居：20 名外给出 rank 与 near', async () => {
    const e = env();
    for (let i = 1; i <= 25; i++) await worker.fetch(post('/shop/score', { name: `铺${i}`, delta: 100 - i }), e);
    await worker.fetch(post('/shop/score', { name: '我', delta: 1 }), e);
    const b = await worker.fetch(get('/shop/rank?name=' + encodeURIComponent('我')), e).then(r => r.json());
    expect(b.total).toBe(26);
    expect(b.me.rank).toBeGreaterThan(20);
    expect(b.near.some(n => n.entry.name === '我')).toBe(true);
  });

  it('脏输入：空名 / delta 0 / 非整数 / |delta|>100 一律 400', async () => {
    for (const body of [{ name: '', delta: 1 }, { name: 'x', delta: 0 }, { name: 'x', delta: 1.5 }, { name: 'x', delta: 101 }, { name: 'x', delta: -101 }]) {
      const r = await worker.fetch(post('/shop/score', body), env());
      expect(r.status).toBe(400);
    }
  });
});
```

- [ ] **Step 2: 跑测试确认全灭**

Run: `pnpm --config.verify-deps-before-run=false test cloudflare/wxhl-market/worker.test.js`
Expected: FAIL（`/shop/score` 404 / `fetch` 返回 not found）

- [ ] **Step 3: fake-d1 支持 shop_scores**

`fake-d1.mjs` 改动：

① `ranks` Map 声明（第 79 行附近）下面加：

```js
  /** 店铺分数。主键是店铺名 —— 同名店铺共享一行（用户已确认的口径） */
  const shops = new Map();
```

② 顶部 `rankOrder` 函数后加：

```js
/** shop_scores 的排序键：分数高的在前；同分先到的在前；再同按店名，保证名次可复现 */
function shopOrder(a, b) {
  if (a.score !== b.score) return b.score - a.score;
  if (a.updated !== b.updated) return a.updated - b.updated;
  return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
}

/** 店铺名次统计用的条件（带 OR，得在按 AND 切分之前先认出来） */
const SHOP_TIE_WHERE =
  /^score > \? OR \(score = \? AND updated < \?\) OR \(score = \? AND updated = \? AND name < \?\)$/i;
```

③ `evalRankWhere` 后加：

```js
  function evalShopWhere(row, whereStr, args) {
    if (SHOP_TIE_WHERE.test(whereStr)) {
      const [score, , updated, , , name] = args;
      return (
        row.score > score ||
        (row.score === score && row.updated < updated) ||
        (row.score === score && row.updated === updated && row.name < name)
      );
    }
    return evalSimpleWhere(row, whereStr, args);
  }
```

④ `runSelect` 里 `if (/FROM ranks/i.test(sql))` 块**之前**加（shop_scores 含 "scores"，不会误匹配 ranks；放前放后均可，保持就近）：

```js
    if (/FROM shop_scores/i.test(sql)) {
      const whereStr = whereOf(sql);
      const rows = whereStr ? [...shops.values()].filter(r => evalShopWhere(r, whereStr, args)) : [...shops.values()];
      if (/COUNT\(\*\)/i.test(sql)) return { results: [], first: { n: rows.length } };
      const consumed = whereStr ? whereStr.split(/\?/).length - 1 : 0;
      let out = [...rows].sort(shopOrder);
      if (/OFFSET/i.test(sql)) out = out.slice(Number(args[consumed + 1]) || 0);
      const limit = args[consumed];
      if (typeof limit === 'number') out = out.slice(0, limit);
      return { results: out.map(r => ({ ...r })) };
    }
```

⑤ `run()` 里 `if (/^INSERT INTO ranks/i.test(sql))` 块后加：

```js
          // ———— 店铺分数：UPSERT 累加（ON CONFLICT DO UPDATE SET score = score + excluded.score）————
          if (/^INSERT INTO shop_scores/i.test(sql)) {
            const [name, delta, updated] = st._a;
            const cur = shops.get(name);
            shops.set(name, { name, score: (cur?.score ?? 0) + Number(delta), updated: Number(updated) });
            return ok(1);
          }
```

- [ ] **Step 4: worker.js 加店铺段**

在 `const RANK_COLS` 之前（订单段 `handleOrder` 结束之后）插入整段：

```js
// ════════════════════════════════════════════════════════════════════════════
// 店铺评分（v4b）：订单信誉的**分数制**——完成 +1、验收评分 0–5、退货 −2、弃单 −5。
// 主键是**店铺名**（跟着店名走：改名 = 新店从 0；同名店铺共享一行，用户已确认）。
// 第四次复制「独立段」组织方式（市场 → 排行榜 → 订单 → 店铺评分）：自带 ensureShopSchema，
// 排在 fetch 里 ensureSchema(env) **之前**，四方互不波及。照 handleRank 的模子复制。
// 信义模型：分数由客户端在原子状态转换成功后自报，服务端不校验来源（与赔偿款同一信任级别）。
// ════════════════════════════════════════════════════════════════════════════

const SHOP_TOP_N = 20;
const SHOP_NAME_MAX = 32;
/** 只用来挡数字垃圾，**不是玩法上限** —— 合法 delta ∈ [−5, +6] */
const SHOP_DELTA_MAX = 100;
const SHOP_ORDER_SQL = `ORDER BY score DESC, updated ASC, name ASC`;
/** 排在我前面的行：(分更高) 或 (同分且到得更早) 或 (完全同键但店名更小) */
const SHOP_AHEAD_SQL = `score > ? OR (score = ? AND updated < ?) OR (score = ? AND updated = ? AND name < ?)`;
const SHOP_COLS = `name, score, updated`;

/** 店铺评分建表：独立于市场/排行榜/订单，失败只影响本段 */
let shopSchemaReady = false;
async function ensureShopSchema(env) {
  if (shopSchemaReady) return;
  await env.MARKET_DB.batch([
    env.MARKET_DB.prepare(
      `CREATE TABLE IF NOT EXISTS shop_scores (
         name TEXT PRIMARY KEY,
         score INTEGER NOT NULL DEFAULT 0,
         updated INTEGER NOT NULL
       )`,
    ),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_shop_scores ON shop_scores (score DESC, updated ASC, name ASC)`),
  ]);
  shopSchemaReady = true;
}

const countShops = async db => Number((await db.prepare(`SELECT COUNT(*) AS n FROM shop_scores`).first())?.n ?? 0);

/** 名次 = 排在我前面的行数 + 1 */
async function shopRankOf(db, row) {
  const r = await db
    .prepare(`SELECT COUNT(*) AS n FROM shop_scores WHERE ${SHOP_AHEAD_SQL}`)
    .bind(row.score, row.score, row.updated, row.score, row.updated, row.name)
    .first();
  return Number(r?.n ?? 0) + 1;
}

/** 非店铺路径返回 null，交给下面的市场分支 */
async function handleShop(url, request, env, cors) {
  if (!url.pathname.startsWith('/shop/')) return null;
  const db = env.MARKET_DB;

  try {
    await ensureShopSchema(env);
  } catch (e) {
    return new Response('店铺评分数据库初始化失败: ' + String(e && e.message ? e.message : e), { status: 500, headers: cors });
  }

  // POST /shop/score  { name, delta }  →  { score }
  // 信义模型：不校验来源。delta 钳在非零整数且 |delta| ≤ SHOP_DELTA_MAX，只挡数字垃圾。
  if (url.pathname === '/shop/score' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch { return new Response('bad request', { status: 400, headers: cors }); }
    const name = String(b?.name ?? '').trim();
    if (!name) return new Response('店铺名不能为空', { status: 400, headers: cors });
    if (name.length > SHOP_NAME_MAX) return new Response(`店铺名过长（上限 ${SHOP_NAME_MAX} 字）`, { status: 400, headers: cors });
    const delta = Number(b?.delta);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > SHOP_DELTA_MAX)
      return new Response(`delta 必须是非零整数且 |delta| ≤ ${SHOP_DELTA_MAX}`, { status: 400, headers: cors });
    await withRetry(() =>
      db.prepare(
        `INSERT INTO shop_scores (name, score, updated) VALUES (?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET score = score + excluded.score, updated = excluded.updated`,
      ).bind(name, delta, Date.now()).run(),
    );
    const row = await db.prepare(`SELECT score FROM shop_scores WHERE name = ?`).bind(name).first();
    return json({ score: Number(row?.score ?? delta) }, cors);
  }

  // GET /shop/rank?name=<店铺名>  →  { list: 前 20, total, me, near }
  // 不传 name 就只出榜单（me 为 null）。形状与 /rank/top 完全一致。
  if (url.pathname === '/shop/rank' && request.method === 'GET') {
    const name = String(url.searchParams.get('name') ?? '').trim().slice(0, SHOP_NAME_MAX);
    const rows = await db.prepare(`SELECT ${SHOP_COLS} FROM shop_scores ${SHOP_ORDER_SQL} LIMIT ?`).bind(SHOP_TOP_N).all();
    const list = rows.results ?? [];
    const total = await countShops(db);

    let me = null;
    let near = [];
    if (name) {
      const mine = await db.prepare(`SELECT ${SHOP_COLS} FROM shop_scores WHERE name = ?`).bind(name).first();
      if (mine) {
        const rank = await shopRankOf(db, mine);
        me = { rank, entry: mine };
        if (rank > SHOP_TOP_N) {
          const start = Math.max(SHOP_TOP_N + 1, rank - 1);
          const nb = await db
            .prepare(`SELECT ${SHOP_COLS} FROM shop_scores ${SHOP_ORDER_SQL} LIMIT ? OFFSET ?`)
            .bind(rank + 1 - start + 1, start - 1)
            .all();
          near = (nb.results ?? []).map((entry, i) => ({ rank: start + i, entry }));
        }
      }
    }
    return json({ list, total, me, near }, { ...cors, 'Cache-Control': 'no-store' });
  }

  return new Response('not found', { status: 404, headers: cors });
}
```

在 `export default` 的 fetch 里，`handleOrder` dispatch 之后、`ensureSchema(env)` 之前插：

```js
    // 店铺评分自成一段：同样排在市场建表之前，与市场/排行榜/订单四方互不波及。
    const shopRes = await handleShop(url, request, env, cors);
    if (shopRes) return shopRes;
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm --config.verify-deps-before-run=false test cloudflare/wxhl-market/worker.test.js`
Expected: PASS（新 describe 5 个 it 全绿，旧测试不回归）

- [ ] **Step 6: Commit**

```bash
git add cloudflare/wxhl-market/worker.js cloudflare/wxhl-market/fake-d1.mjs cloudflare/wxhl-market/worker.test.js
git commit -m "feat(wxhl): 店铺分数段——/shop/score UPSERT 累加 + /shop/rank 榜单（同分先到先排前）"
```

---

### Task 2: Worker 订单段改造（maker_shop / 弃单 / 赔偿待领）

**Files:**
- Modify: `cloudflare/wxhl-market/worker.js`（ensureOrderSchema 迁移、ACK 映射、应领/待领项、accept、新增 abandon、mine、toOrderDto）
- Modify: `cloudflare/wxhl-market/fake-d1.mjs`
- Test: `cloudflare/wxhl-market/worker.test.js`

**Interfaces:**
- Consumes: Task 1 无需依赖（本任务只动订单段）
- Produces（Task 4/6 依赖）:
  - `POST /order/accept` 请求体**新增必填** `maker_shop: string`（空 → 400）
  - `POST /order/abandon` 请求 `{id, maker}` → `{ok: true}`；仅 `已接单` 状态可弃、仅接单人本人
  - 订单 DTO 新增 `maker_shop: string | null`（老行回退 null）
  - `/order/mine` 的 `claim` 新增 `comp: number | null`（赔偿合计）；`待领` 条目 `项` 可能为 `'赔偿'`，金额 = `deposit × 3`
  - `/order/ack` 接受 `(side='poster', 项='赔偿')`；`(side='maker', 项='赔偿')` → 400

- [ ] **Step 1: 写失败测试**

`worker.test.js` 末尾追加（复用既有助手；发布/接单/交付/验收的连贯调用照文件里订单段既有测试的写法）：

```js
describe('订单段 v4b：店铺名 / 弃单 / 赔偿', () => {
  const 需求单 = { 名称: '狼牙短剑', 成品类型: '装备', 装备子类: '武器', 品质: '', 阶位: 0, 效果要求: '', 说明: '' };
  const 建单 = (e, over = {}) =>
    worker.fetch(post('/order/create', { poster: '甲', spec: 需求单, deposit: 100, final: 200, ...over }), e).then(r => r.json());
  const mine = (e, who) => worker.fetch(get('/order/mine?who=' + encodeURIComponent(who)), e).then(r => r.json());

  it('接单必须带店铺名；DTO 带 maker_shop', async () => {
    const e = env();
    const { id } = await 建单(e);
    const bad = await worker.fetch(post('/order/accept', { id, maker: '乙' }), e);
    expect(bad.status).toBe(400);
    const ok = await worker.fetch(post('/order/accept', { id, maker: '乙', maker_shop: '乙的铁匠铺' }), e);
    expect(ok.status).toBe(200);
    const m = await mine(e, '甲');
    expect(m.asPoster[0].maker_shop).toBe('乙的铁匠铺');
  });

  it('弃单：仅已接单可弃、仅本人可弃；弃单后发单人有赔偿待领（订金×3），接单者订金照领', async () => {
    const e = env();
    const { id } = await 建单(e);
    // 待接单不能弃
    expect((await worker.fetch(post('/order/abandon', { id, maker: '乙' }), e)).status).toBe(400);
    await worker.fetch(post('/order/accept', { id, maker: '乙', maker_shop: '铺' }), e);
    // 非本人不能弃
    expect((await worker.fetch(post('/order/abandon', { id, maker: '丙' }), e)).status).toBe(400);
    const ok = await worker.fetch(post('/order/abandon', { id, maker: '乙' }), e);
    expect(ok.status).toBe(200);
    const mp = await mine(e, '甲');
    expect(mp.claim.comp).toBe(300);
    expect(mp.claim.待领).toContainEqual({ id, 项: '赔偿', 金额: 300 });
    const mm = await mine(e, '乙');
    expect(mm.claim.deposit).toBe(100);
  });

  it('赔偿 ACK：maker 侧 ACK 赔偿 → 400；只 ACK 订金不删行；订金+赔偿都 ACK 才删行', async () => {
    const e = env();
    const { id } = await 建单(e);
    await worker.fetch(post('/order/accept', { id, maker: '乙', maker_shop: '铺' }), e);
    await worker.fetch(post('/order/abandon', { id, maker: '乙' }), e);
    // maker 侧不许 ACK 赔偿
    expect((await worker.fetch(post('/order/ack', { id, who: '乙', side: 'maker', 项: '赔偿' }), e)).status).toBe(400);
    // 接单者领订金
    const a1 = await worker.fetch(post('/order/ack', { id, who: '乙', side: 'maker', 项: '订金' }), e).then(r => r.json());
    expect(a1.first).toBe(true);
    expect(a1.deleted).toBe(false);          // 赔偿还没领，不许删行（空真陷阱防线）
    // 发单人领赔偿
    const a2 = await worker.fetch(post('/order/ack', { id, who: '甲', side: 'poster', 项: '赔偿' }), e).then(r => r.json());
    expect(a2.first).toBe(true);
    expect(a2.deleted).toBe(true);           // 应领全部置位 → 删行
    // 幂等：行已删再 ACK → deleted:true, first:false
    const a3 = await worker.fetch(post('/order/ack', { id, who: '甲', side: 'poster', 项: '赔偿' }), e).then(r => r.json());
    expect(a3).toEqual({ ok: true, deleted: true, first: false });
  });

  it('已交付后不许弃单', async () => {
    const e = env();
    const { id } = await 建单(e);
    await worker.fetch(post('/order/accept', { id, maker: '乙', maker_shop: '铺' }), e);
    await worker.fetch(post('/order/deliver', { id, maker: '乙', item: { 名称: '剑', 数量: 1 } }), e);
    expect((await worker.fetch(post('/order/abandon', { id, maker: '乙' }), e)).status).toBe(400);
  });

  it('老订单行（maker_shop 为 null）DTO 回退 null，不炸', async () => {
    const e = env();
    const { id } = await 建单(e);
    // 直接改 fake 行模拟老数据：接单但不带店铺名列（fake 的 accept 总会写 maker_shop，
    // 这里改为直接断言未接单行的 DTO）
    const hall = await worker.fetch(get('/order/list?exclude='), e).then(r => r.json());
    expect(hall.orders[0].maker_shop).toBeNull();
    expect(hall.orders[0].id).toBe(id);
  });
});
```

- [ ] **Step 2: 跑测试确认全灭**

Run: `pnpm --config.verify-deps-before-run=false test cloudflare/wxhl-market/worker.test.js`
Expected: FAIL（accept 不要 maker_shop 也能 200 / abandon 404 / DTO 无 maker_shop）

- [ ] **Step 3: fake-d1 同步订单段新形态**

① `ORDER_ACCEPT_SQL` 整条替换（worker 的 accept 要加 `maker_shop = ?`）：

```js
/** 接单：WHERE 带 status 守卫，受影响 0 行即「已被接走」—— 并发仲裁点 */
const ORDER_ACCEPT_SQL =
  /^UPDATE orders SET maker = \?, maker_shop = \?, status = \?, updated = \? WHERE id = \? AND status = \?$/i;
```

② `ORDER_ACK_SQL` 的列名交替加 `poster_comp_ack`：

```js
const ORDER_ACK_SQL =
  /^UPDATE orders SET (maker_deposit_ack|maker_final_ack|poster_ack|poster_comp_ack) = 1, updated = \? WHERE id = \? AND \1 = 0$/i;
```

③ `run()` 里 ORDER_ACCEPT_SQL 的处理块改成：

```js
          if (ORDER_ACCEPT_SQL.test(oneLine(sql))) {
            const [maker, maker_shop, status, updated, id, need] = st._a;
            const row = orders.get(id);
            if (!row || row.status !== need) return ok(0);
            row.maker = maker;
            row.maker_shop = maker_shop;
            row.status = status;
            row.updated = Number(updated);
            return ok(1);
          }
```

④ ORDER_INSERT_SQL 处理块的行形状补两列（保持与真表 schema 一致）：

```js
              item_json: null, rating: null, comp_json: null, maker_shop: null,
              maker_deposit_ack: 0, maker_final_ack: 0, poster_ack: 0, poster_comp_ack: 0,
```

⑤ ALTER 迁移语句显式 no-op（现在靠 throw 进 worker 的 catch 也能过，但「认出并 no-op」才是假件的诚实语义；放在 `run()` 末尾 throw 之前）：

```js
          // 迁移语句：假件的行本来就带全部列，ALTER 对它恒为 no-op —— 但要是改了别的形态照样炸
          if (/^ALTER TABLE orders ADD COLUMN (maker_shop TEXT|poster_comp_ack INTEGER NOT NULL DEFAULT 0|maker_deposit_ack INTEGER NOT NULL DEFAULT 0|maker_final_ack INTEGER NOT NULL DEFAULT 0)$/i.test(oneLine(sql))) return ok(0);
```

- [ ] **Step 4: worker.js 订单段改造**

① `ensureOrderSchema` 的 `orderMigrations` 数组追加两条：

```js
  const orderMigrations = [
    `ALTER TABLE orders ADD COLUMN maker_deposit_ack INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN maker_final_ack INTEGER NOT NULL DEFAULT 0`,
    // v4b：接单人店铺名（评分归属）与赔偿款 ACK 位（弃单时发单人领取订金×3）
    `ALTER TABLE orders ADD COLUMN maker_shop TEXT`,
    `ALTER TABLE orders ADD COLUMN poster_comp_ack INTEGER NOT NULL DEFAULT 0`,
  ];
```

② `ACK_KEY_COL` / `ACK_COLS` 替换为：

```js
/** ACK 项键 → 列名 */
const ACK_KEY_COL = {
  maker_deposit: 'maker_deposit_ack',
  maker_final: 'maker_final_ack',
  poster: 'poster_ack',
  poster_comp: 'poster_comp_ack',
};
/** 入参 (side, 项) → 列名。表中没有的组合视为非法，调用方回 400（不静默落到 poster） */
const ACK_COLS = {
  maker: { 订金: 'maker_deposit_ack', 尾款: 'maker_final_ack' },
  poster: { 成品: 'poster_ack', 赔偿: 'poster_comp_ack' },
};
```

③ `应领(row)` 在 `已取消` 分支后加：

```js
  // 已弃单（v4b）：接单者领订金（弃单不退订金），发单人领赔偿款（订金×3，走 poster_comp 位）
  if (row.status === 订单状态.已弃单) return ['maker_deposit', 'poster_comp'];
```

④ `待领项(r, who)` 在成品分支后加：

```js
  // 赔偿：弃单后归发单人（金额恒为订金×3，不占任何既有位）
  if (r.poster === who && r.status === 订单状态.已弃单 && r.poster_comp_ack !== 1) 出.push({ 项: '赔偿', 金额: r.deposit * 3, 成品: false });
```

⑤ `toOrderDto` 加 `maker_shop`：

```js
function toOrderDto(row) {
  return {
    id: row.id, poster: row.poster, maker: row.maker, maker_shop: row.maker_shop ?? null,
    spec: JSON.parse(row.spec_json),
    deposit: row.deposit, final: row.final, status: row.status,
    created: row.created, updated: row.updated,
  };
}
```

⑥ `/order/accept` 块替换为（多收 `maker_shop`，服务端也挡一道未开店）：

```js
  // POST /order/accept  { id, maker, maker_shop }  →  { ok: true }
  // 原子接单：WHERE 带上 status，受影响 0 行即说明已被别人接走或被撤销。
  // maker_shop 必填：评分跟着店铺走，没店就没有评分归属 —— 客户端有开店闸门，这里再挡一道。
  if (p === '/order/accept' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const maker = String(b.maker ?? '').trim();
    if (!maker) return new Response('缺少接单人姓名', { status: 400, headers: cors });
    const maker_shop = String(b.maker_shop ?? '').trim();
    if (!maker_shop) return new Response('缺少店铺名（未开店不能接单）', { status: 400, headers: cors });
    if (maker_shop.length > 32) return new Response('店铺名过长（上限 32 字）', { status: 400, headers: cors });
    const res = await withRetry(() =>
      env.MARKET_DB.prepare(
        `UPDATE orders SET maker = ?, maker_shop = ?, status = ?, updated = ? WHERE id = ? AND status = ?`,
      ).bind(maker, maker_shop, 订单状态.已接单, Date.now(), String(b.id), 订单状态.待接单).run(),
    );
    const changed = changesOf(res);
    if (changed === 0) return new Response('手慢了，这单已被接走', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
```

⑦ `/order/reject` 块之后加 `/order/abandon`：

```js
  // POST /order/abandon  { id, maker }  —— 弃单（订金不退归接单者；发单人待领赔偿 订金×3）
  // 赔偿款由接单者客户端在收到成功后本地 spendUP 扣除（信义模型，服务端碰不到存档）。
  // 仅「已接单」可弃：已交付后成品在托管里，退路是发单人验收/退货，不许接单者一弃了之。
  if (p === '/order/abandon' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row || row.status !== 订单状态.已接单) return new Response('订单不存在或不在可弃单状态', { status: 400, headers: cors });
    if (String(b.maker ?? '').trim() !== row.maker) return new Response('只有接单人本人能弃单', { status: 400, headers: cors });
    if (!(await advance(row.id, 订单状态.已接单, 订单状态.已弃单)))
      return new Response('弃单失败：订单状态已变', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
```

⑧ `/order/mine` 的 claim 派生循环里加赔偿分支（`claim` 初始化里已有 `comp: null`，v4a 就留了这个槽）：

```js
      for (const p of 待领项(r, who)) {
        if (p.成品) claim.items.push({ id: r.id, item: JSON.parse(r.item_json) });
        else if (p.项 === '订金') claim.deposit += p.金额;
        else if (p.项 === '赔偿') claim.comp = (claim.comp ?? 0) + p.金额;
        else claim.final += p.金额;
        claim.待领.push({ id: r.id, 项: p.项, 金额: p.金额 });
      }
```

- [ ] **Step 5: 跑测试确认通过（含 v4a 旧订单测试不回归）**

Run: `pnpm --config.verify-deps-before-run=false test cloudflare/wxhl-market/worker.test.js`
Expected: PASS。**注意**：v4a 旧测试里若有 `/order/accept` 不带 `maker_shop` 的调用，现在会 400 —— 把那些调用补上 `maker_shop: '测试铺'`（这是预期内的签名变更，不是回归）。

- [ ] **Step 6: Commit**

```bash
git add cloudflare/wxhl-market/worker.js cloudflare/wxhl-market/fake-d1.mjs cloudflare/wxhl-market/worker.test.js
git commit -m "feat(wxhl): 订单段 v4b——接单绑定店铺名 + 弃单 + 赔偿待领项（订金×3）"
```

---

### Task 3: 前端纯函数层（rep/score.ts · rep/shop.ts · rep/history.ts）

**Files:**
- Create: `src/wxhl-003/crafting/order/rep/score.ts`
- Create: `src/wxhl-003/crafting/order/rep/shop.ts`
- Create: `src/wxhl-003/crafting/order/rep/history.ts`
- Test: `src/wxhl-003/crafting/order/__tests__/rep.test.ts`

**Interfaces:**
- Consumes: 无（纯函数层）；`shop.ts` 类型镜像 Task 1 的 `/shop/rank` 响应
- Produces（Task 4/5 依赖的确切签名）:

```ts
// rep/score.ts
export function 验收加分(评分: number | null): number;  // null→1；否则 1+钳制(0..5)
export function 退货扣分(): number;                      // -2
export function 弃单扣分(): number;                      // -5

// rep/shop.ts
export const SHOP_TOP_N: 20;
export function readShopName(契约者: any): string;       // '无'/空/缺失 → ''（未开店）
export interface ShopRankEntry { name: string; score: number; updated: number }
export interface ShopRankBoard { list: ShopRankEntry[]; total: number; me: { rank: number; entry: ShopRankEntry } | null; near: { rank: number; entry: ShopRankEntry }[] }
export type ShopBoardRow = { kind: 'entry'; rank: number; entry: ShopRankEntry; mine: boolean } | { kind: 'gap' };
export function shopBoardRows(board: ShopRankBoard): ShopBoardRow[];

// rep/history.ts
export interface 订单记录 { 订单id: string; 角色: '发单人' | '接单人'; 对方: string; 摘要: string; 结果: '完成' | '退货' | '弃单' | '被取消'; 分数变动: number | null; 时间: number }
export function loadHistory(): 订单记录[];
export function appendHistory(rec: 订单记录): void;      // localStorage 键 wxhl003_order_rep，只留最近 100 条
```

- [ ] **Step 1: 写失败测试**

创建 `src/wxhl-003/crafting/order/__tests__/rep.test.ts`（目录已有其他测试则照其导入风格；vitest 环境下 `z`、`_`、`defineStore` 等是自动全局，但纯函数模块仍用显式 import）：

```ts
import { describe, expect, it, beforeEach, vi } from 'vitest';
import { 验收加分, 退货扣分, 弃单扣分 } from '../rep/score';
import { readShopName, shopBoardRows, SHOP_TOP_N, type ShopRankBoard } from '../rep/shop';
import { appendHistory, loadHistory, type 订单记录 } from '../rep/history';

describe('score · 分数变动', () => {
  it('跳过评分只 +1 保底', () => {
    expect(验收加分(null)).toBe(1);
  });
  it('给分则 1 + 评分', () => {
    expect(验收加分(0)).toBe(1);
    expect(验收加分(5)).toBe(6);
    expect(验收加分(3)).toBe(4);
  });
  it('脏输入钳制：NaN/负数/超界/小数', () => {
    expect(验收加分(NaN)).toBe(1);
    expect(验收加分(-3)).toBe(1);
    expect(验收加分(99)).toBe(6);
    expect(验收加分(4.6)).toBe(6);  // 四舍五入到 5 再加 1
  });
  it('退货 −2 / 弃单 −5', () => {
    expect(退货扣分()).toBe(-2);
    expect(弃单扣分()).toBe(-5);
  });
});

describe('shop · 店铺名读取', () => {
  it("'无' / 空串 / 缺失路径都算未开店", () => {
    expect(readShopName({ 个人产业: { 当前店铺: { 名称: '无' } } })).toBe('');
    expect(readShopName({ 个人产业: { 当前店铺: { 名称: '  ' } } })).toBe('');
    expect(readShopName({ 个人产业: {} })).toBe('');
    expect(readShopName({})).toBe('');
    expect(readShopName(null)).toBe('');
  });
  it('正常店铺名原样返回（去首尾空白）', () => {
    expect(readShopName({ 个人产业: { 当前店铺: { 名称: ' 秦记铁匠铺 ' } } })).toBe('秦记铁匠铺');
  });
});

describe('shop · 榜单行展开', () => {
  const 条目 = (name: string, score: number) => ({ name, score, updated: 1 });
  it('我在榜内：无省略号，mine 标记正确', () => {
    const board: ShopRankBoard = { list: [条目('a', 9), 条目('b', 8)], total: 2, me: { rank: 2, entry: 条目('b', 8) }, near: [] };
    const rows = shopBoardRows(board);
    expect(rows.map(r => r.kind)).toEqual(['entry', 'entry']);
    expect(rows[1].kind === 'entry' && rows[1].mine).toBe(true);
  });
  it('我在榜外：省略号 + 邻居；服务器漏发我时补我自己的行', () => {
    const list = Array.from({ length: SHOP_TOP_N }, (_, i) => 条目(`铺${i}`, 100 - i));
    const board: ShopRankBoard = { list, total: 30, me: { rank: 25, entry: 条目('我', 1) }, near: [{ rank: 24, entry: 条目('前', 2) }] };
    const rows = shopBoardRows(board);
    expect(rows[SHOP_TOP_N].kind).toBe('gap');
    expect(rows.some(r => r.kind === 'entry' && r.mine && r.rank === 25)).toBe(true);
  });
});

describe('history · 本地订单记录', () => {
  const mem = new Map<string, string>();
  beforeEach(() => {
    mem.clear();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => mem.get(k) ?? null,
      setItem: (k: string, v: string) => void mem.set(k, String(v)),
      removeItem: (k: string) => void mem.delete(k),
    });
  });
  const 记录 = (i: number): 订单记录 => ({ 订单id: `o${i}`, 角色: '接单人', 对方: '甲', 摘要: '剑｜装备·武器', 结果: '完成', 分数变动: null, 时间: i });

  it('空/损坏数据都读回空数组', () => {
    expect(loadHistory()).toEqual([]);
    mem.set('wxhl003_order_rep', '{不是JSON');
    expect(loadHistory()).toEqual([]);
    mem.set('wxhl003_order_rep', '{"不是数组":1}');
    expect(loadHistory()).toEqual([]);
  });
  it('追加可读回；形状残缺的历史条目被滤掉', () => {
    appendHistory(记录(1));
    mem.set('wxhl003_order_rep', JSON.stringify([...loadHistory(), { 坏: true }, 记录(2)]));
    expect(loadHistory().map(r => r.订单id)).toEqual(['o1', 'o2']);
  });
  it('容量钳制：只留最近 100 条', () => {
    for (let i = 0; i < 130; i++) appendHistory(记录(i));
    const all = loadHistory();
    expect(all.length).toBe(100);
    expect(all[0].订单id).toBe('o30');
    expect(all[99].订单id).toBe('o129');
  });
});
```

- [ ] **Step 2: 跑测试确认全灭**

Run: `pnpm --config.verify-deps-before-run=false test src/wxhl-003/crafting/order`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 score.ts**

```ts
// 订单店铺评分 · 分数变动（纯函数，不碰网络与存档）
//
// 规则（2026-09-23 定稿）：完成一单 +1 保底；验收时发单人可再给 0–5 直接加上；
// 退货 −2；弃单 −5；付不起尾款取消不计。分数由客户端在原子状态转换成功后上报，
// 防重复靠服务端 UPDATE 的 status 守卫（两个标签页同时操作只有一个转换成功）。

/** 验收加分：跳过评分（null）只 +1 保底；给分则 1 + 评分（评分钳到 0..5 整数） */
export function 验收加分(评分: number | null): number {
  if (评分 === null) return 1;
  const r = Math.round(Number(评分));
  if (!Number.isFinite(r)) return 1;
  return 1 + Math.min(5, Math.max(0, r));
}

/** 退货扣分：发单人对成品不满意 */
export function 退货扣分(): number {
  return -2;
}

/** 弃单扣分：接单人主动弃单（另赔订金×3，钱走待领取体系，不在此处） */
export function 弃单扣分(): number {
  return -5;
}
```

- [ ] **Step 4: 实现 shop.ts**

```ts
// 店铺归属与店铺榜单 · 纯逻辑
//
// 接单人身份 = 变量里的**当前店铺**（契约者.个人产业.当前店铺.名称）：
// '无'/空/缺失 = 未开店，未开店不准接单（store.accept 的闸门用 readShopName 判定）。
// 评分跟着店名走（spec §2）：改名 = 新店从 0；同名店铺共享一行分数。
// ShopRankBoard 形状镜像 Worker 的 /shop/rank（与玩家排行榜 /rank/top 同形，lv→score）。

/** 店铺榜单一屏的名次数；名次在此之外时另取前后邻居 */
export const SHOP_TOP_N = 20;

/**
 * 读当前店铺名。'无'/空白/路径缺失 → ''（未开店）。只读存档，不写任何变量。
 * 注意：schema 里 `当前店铺.名称` 的 prefault 就是 '无'，所以判空必须把 '无' 算进去。
 */
export function readShopName(契约者: any): string {
  const raw = 契约者?.个人产业?.当前店铺?.名称;
  const s = typeof raw === 'string' ? raw.trim() : '';
  return s === '无' ? '' : s;
}

/** 服务器回传的店铺榜条目 */
export interface ShopRankEntry {
  name: string;
  score: number;
  /** 服务端记录的最近变动时间戳；同分时**先到的排前面** */
  updated: number;
}

/** `GET /shop/rank` 的响应（形状与玩家排行榜 RankBoard 一致） */
export interface ShopRankBoard {
  list: ShopRankEntry[];
  total: number;
  me: { rank: number; entry: ShopRankEntry } | null;
  near: { rank: number; entry: ShopRankEntry }[];
}

/** 榜单一行：条目行，或「⋯」省略号分隔 */
export type ShopBoardRow =
  | { kind: 'entry'; rank: number; entry: ShopRankEntry; mine: boolean }
  | { kind: 'gap' };

/**
 * 把服务器响应摊成可渲染的行：前 SHOP_TOP_N + （我在榜外时）省略号 + 邻居。
 * 服务器没下发邻居时（异常兜底），至少把「我」那一行补上 —— 不能让玩家看不见自己。
 * （与 rank/rank.ts 的 boardRows 同构；类型不同（lv→score）故各写一份，不做强行泛型。）
 */
export function shopBoardRows(board: ShopRankBoard): ShopBoardRow[] {
  const rows: ShopBoardRow[] = (board.list ?? []).map((entry, i) => ({
    kind: 'entry',
    rank: i + 1,
    entry,
    mine: board.me?.rank === i + 1,
  }));

  const me = board.me;
  if (!me || me.rank <= SHOP_TOP_N) return rows;

  rows.push({ kind: 'gap' });
  const near = board.near ?? [];
  for (const n of near) {
    rows.push({ kind: 'entry', rank: n.rank, entry: n.entry, mine: n.rank === me.rank });
  }
  if (!near.some(n => n.rank === me.rank)) {
    rows.push({ kind: 'entry', rank: me.rank, entry: me.entry, mine: true });
  }
  return rows;
}
```

- [ ] **Step 5: 实现 history.ts**

```ts
// 本地订单记录 · localStorage（不进 MVU、不进正文 token，与既有 API 配置同处）
//
// 服务器只做中转、不留历史（免费档内存纪律），所以「我这店分数为什么变」只能本地记：
// 每次终局动作（验收/退货/弃单/领尾款）由当事客户端写一条。只留最近 100 条防膨胀。
// 读回一律防御式解析：数据被改坏/清过/形状残缺都不许炸，顶多当作没有记录。

const KEY = 'wxhl003_order_rep';
const MAX = 100;

export interface 订单记录 {
  订单id: string;
  角色: '发单人' | '接单人';
  对方: string;              // 发单人侧记店铺名（老订单回退玩家名）；接单人侧记发单人姓名
  摘要: string;              // 需求单摘要（名称｜成品类型·子类·品质·阶位）
  结果: '完成' | '退货' | '弃单' | '被取消';
  /** 本店因此单的分数增减；发单人侧恒 0，接单人「完成」时确切分值在发单人客户端（不可得）记 null */
  分数变动: number | null;
  时间: number;
}

/** 形状校验：缺 订单id/时间 的条目一律滤掉（历史是给人看的，残缺行没有展示价值） */
function 是合法记录(v: any): v is 订单记录 {
  return !!v && typeof v === 'object' && typeof v.订单id === 'string' && Number.isFinite(Number(v.时间));
}

export function loadHistory(): 订单记录[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const v = JSON.parse(raw);
    return Array.isArray(v) ? v.filter(是合法记录) : [];
  } catch (_) {
    return [];
  }
}

/** 追加一条并落盘（只留最近 MAX 条）。localStorage 不可用（隐私模式等）就静默放弃——记录不是钱 */
export function appendHistory(rec: 订单记录): void {
  try {
    const list = loadHistory();
    list.push(rec);
    localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch (_) {}
}
```

- [ ] **Step 6: 跑测试确认通过**

Run: `pnpm --config.verify-deps-before-run=false test src/wxhl-003/crafting/order`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add src/wxhl-003/crafting/order/rep src/wxhl-003/crafting/order/__tests__/rep.test.ts
git commit -m "feat(wxhl): 订单店铺评分纯函数层——分数钳制/店铺名闸门/本地订单记录"
```

---

### Task 4: order/api.ts + store.ts（闸门 / 弃单 / 分数上报 / 赔偿领取 / 店铺排行）

**Files:**
- Modify: `src/wxhl-003/crafting/order/api.ts`
- Modify: `src/wxhl-003/crafting/order/store.ts`

**Interfaces:**
- Consumes: Task 2 的端点形状；Task 3 的 `验收加分/退货扣分/弃单扣分/readShopName/ShopRankBoard/appendHistory`；`./spec` 的 `需求单摘要`
- Produces（Task 5 OrderView 依赖的 store 成员）:
  - `shopName: Ref<string>`（'' = 未开店，syncPlayer 时刷新）
  - `shopBoard: Ref<ShopRankBoard>`、`refreshShopRank(): Promise<void>`
  - `accept(id)` 行为变更：未开店拦截
  - `confirm(id, 评分: number | null)` 签名变更（原 `confirm(id)`）
  - `abandon(id): Promise<boolean>`
  - `claim.comp: number | null`；`待领项.项` 联合类型加 `'赔偿'`
  - 返回对象新增：`shopName, shopBoard, refreshShopRank, abandon`

- [ ] **Step 1: api.ts 改造**

① `订单` 接口加字段，`待领项`/`待领取` 扩展：

```ts
export interface 订单 {
  id: string;
  poster: string;
  maker: string | null;
  /** 接单人店铺名（v4b；老订单行为 null，展示回退 maker） */
  maker_shop: string | null;
  spec: 需求单;
  deposit: number;
  final: number;
  status: 订单状态;
  created: number;
  updated: number;
}
```

```ts
export interface 待领项 { id: string; 项: '订金' | '尾款' | '成品' | '赔偿'; 金额: number }
export interface 待领取 {
  /** 汇总数字（订金合计）—— **仅供界面显示**。入账一律按 `待领` 逐条的 `金额` 累加（Ruling M） */
  deposit: number;
  /** 汇总数字（尾款合计）—— 同上，仅供显示 */
  final: number;
  /** 汇总数字（赔偿合计，弃单产生）—— 同上，仅供显示；没有就是 null */
  comp: number | null;
  items: { id: string; item: MarketItemSnapshot }[];
  待领: 待领项[];
}
```

② `acceptOrder` 加 `makerShop` 参数；新增 `abandonOrder` / `reportShopScore` / `fetchShopRank`：

```ts
export function acceptOrder(id: string, maker: string, makerShop: string): Promise<void> {
  return post('/order/accept', { id, maker, maker_shop: makerShop, client: getClientId() }).then(() => undefined);
}
export function abandonOrder(id: string, maker: string): Promise<void> {
  return post('/order/abandon', { id, maker, client: getClientId() }).then(() => undefined);
}
/** 店铺分数上报（信义模型）。失败由调用方决定忽略——分数是荣誉值，可丢；钱物通道不受影响 */
export function reportShopScore(name: string, delta: number): Promise<{ score: number }> {
  return post('/shop/score', { name, delta, client: getClientId() });
}
export function fetchShopRank(name: string): Promise<ShopRankBoard> {
  return req(`/shop/rank?name=${encodeURIComponent(name)}`);
}
```

文件头 import 加 `import type { ShopRankBoard } from './rep/shop';`

- [ ] **Step 2: store.ts 改造（逐块替换/插入）**

① import 区加：

```ts
import { appendHistory } from './rep/history';
import { readShopName, type ShopRankBoard } from './rep/shop';
import { 弃单扣分, 退货扣分, 验收加分 } from './rep/score';
import { abandonOrder, fetchShopRank, reportShopScore } from './api';
```
（`abandonOrder/fetchShopRank/reportShopScore` 并入既有 `./api` 的那条 import。另加 `import { 需求单摘要 } from './spec';`——spec 已 import 了 `成品体积检查, type 需求单`，并入同条。）

② `空待领` 加 `comp`：

```ts
const 空待领: 待领取 = { deposit: 0, final: 0, comp: null, items: [], 待领: [] };
```

③ store 状态区加（`playerName` 声明之后）：

```ts
  const shopName = ref('');           // 当前店铺名（'' = 未开店）；syncPlayer 时一并刷新
  const shopBoard = ref<ShopRankBoard>({ list: [], total: 0, me: null, near: [] });
```

④ `syncPlayer` 里 `playerName.value = ...` 之后加一行：

```ts
    shopName.value = readShopName(r.c);
```

⑤ `accept` 整个替换（开店闸门）：

```ts
  async function accept(id: string): Promise<boolean> {
    if (busy.value) return false;
    if (!syncPlayer()) return false;
    // 开店闸门（spec §5.1）：接单人身份是**店铺**，'无'/空 = 未开店不准接单。
    // 读店铺名是只读路径，不碰 MVU 写入纪律。
    const r0 = readContractor();
    if (!r0) { lastError.value = '读不到存档变量'; return false; }
    const shop = readShopName(r0.c);
    if (!shop) {
      lastError.value = '未开设店铺，不能接单（请先在个人产业中开设店铺）';
      toastr.error(lastError.value);
      return false;
    }
    busy.value = true; lastError.value = '';
    try { await acceptOrder(id, playerName.value, shop); toastr.success(`接单成功，订金已到你名下（店铺「${shop}」）`); await refresh(); return true; }
    catch (e: any) { lastError.value = e?.message || '接单失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }
  }
```

⑥ `confirm` 签名改 `(id: string, 评分: number | null)`，`await commit(...)` 之后、`toastr.success` 之前插入：

```ts
    // 店铺分数上报（spec §3）：完成 +1 保底，发单人给了评分就 1+评分。
    // 防重复靠服务端原子状态转换（confirmOrder 的 status 守卫）——双开标签页只有一个成功，
    // 走到这里的必然握着那次成功，直接报。上报失败只 warn：分数是荣誉值可丢，钱已落档。
    // 老订单行没有 maker_shop（评分无归属）→ 跳过，不炸。
    if (单.maker_shop) {
      try { await reportShopScore(单.maker_shop, 验收加分(评分)); }
      catch (e) { console.warn('[订单] 店铺分数上报失败', e); }
    }
    appendHistory({
      订单id: id, 角色: '发单人', 对方: 单.maker_shop ?? 单.maker ?? '',
      摘要: 需求单摘要(单.spec), 结果: '完成', 分数变动: 0, 时间: Date.now(),
    });
```

⑦ `reject` 整个替换（退货上报 −2 + 记录）：

```ts
  async function reject(id: string): Promise<boolean> {
    if (busy.value) return false;
    if (!syncPlayer()) return false;
    const 单 = asPoster.value.find(o => o.id === id);
    busy.value = true; lastError.value = '';
    try { await rejectOrder(id, playerName.value); }
    catch (e: any) { lastError.value = e?.message || '退货失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }
    // 退货 −2：同样在原子转换成功后上报；老订单无店铺归属则跳过
    if (单?.maker_shop) {
      try { await reportShopScore(单.maker_shop, 退货扣分()); }
      catch (e) { console.warn('[订单] 店铺分数上报失败', e); }
    }
    if (单) {
      appendHistory({
        订单id: id, 角色: '发单人', 对方: 单.maker_shop ?? 单.maker ?? '',
        摘要: 需求单摘要(单.spec), 结果: '退货', 分数变动: 0, 时间: Date.now(),
      });
    }
    toastr.warning('已退货，订单取消（订金不退，对方店铺 −2 分）');
    await refresh();
    return true;
  }
```

⑧ `reject` 之后新增 `abandon`（**注意守卫顺序**：预验余额必须在 busy 置位与任何请求之前——Review Focus #3）：

```ts
  /**
   * 弃单：赔 订金×3（本地扣、经服务器转发给发单人待领）+ 自己店铺 −5 分。
   * 守卫顺序与 publish 同款：spendUP 预验抛在**任何写入与任何请求之前** —— 赔不起就不许弃单，
   * 「拒绝」与「零请求零写入」是同一件事的两面。
   */
  async function abandon(id: string): Promise<boolean> {
    if (busy.value) return false;
    if (!syncPlayer()) return false;
    const 单 = asMaker.value.find(o => o.id === id);
    if (!单) { lastError.value = '找不到该订单'; return false; }
    const 赔偿 = 单.deposit * 3;
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    try { spendUP(Number(r.c.经济?.UP ?? 0), 赔偿); }
    catch (e: any) { lastError.value = `赔偿不足（需 ${赔偿} UP），无法弃单：${e.message}`; toastr.error(lastError.value); return false; }

    busy.value = true; lastError.value = '';
    try { await abandonOrder(id, playerName.value); }
    catch (e: any) { lastError.value = e?.message || '弃单失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }

    // 扣款基准与写入基底取此刻的新读值（同 publish：往返期间市场可能改过 UP）
    const rr = readContractor() ?? r;
    let 余UP: number;
    try { 余UP = spendUP(Number(rr.c.经济?.UP ?? 0), 赔偿); }
    catch (e: any) {
      lastError.value = `订单已弃单，但赔偿未能扣除：${e.message}。请核对余额`;
      toastr.error(lastError.value);
      return false;
    }
    _.set(rr.mvu, ['stat_data', '契约者', '经济', 'UP'], 余UP);
    await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '经济', 'UP'], 余UP]]);

    const shop = readShopName(rr.c);
    if (shop) {
      try { await reportShopScore(shop, 弃单扣分()); }
      catch (e) { console.warn('[订单] 店铺分数上报失败', e); }
    }
    appendHistory({
      订单id: id, 角色: '接单人', 对方: 单.poster,
      摘要: 需求单摘要(单.spec), 结果: '弃单', 分数变动: 弃单扣分(), 时间: Date.now(),
    });
    toastr.warning(`已弃单：赔偿 ${赔偿} UP，店铺 −5 分`);
    await refresh();
    return true;
  }

  /** 店铺排行榜：未开店传空也能看榜（me 为 null） */
  async function refreshShopRank(): Promise<void> {
    if (!syncPlayer()) return;
    try { shopBoard.value = await fetchShopRank(shopName.value); }
    catch (e: any) { lastError.value = '店铺排行读取失败：' + (e?.message ?? e); }
  }
```

⑨ `claimAll` 的 side 判定一行替换（赔偿归发单人）：

```ts
        const side = t.项 === '成品' || t.项 === '赔偿' ? 'poster' : 'maker';
```

⑩ `claimAll` 里 `if (checks.length > 0) { try { await commit... } catch ... }` 块**之后**、成功 toast 之前，插入接单人「完成」记录：

```ts
      // 接单人侧的「完成」记录：尾款（钱）条目 first=true 入账才算这单真成了。
      // 确切分值在发单人客户端（评分是对方给的），本地无从得知 → 分数变动记 null。
      for (const t of 待领) {
        if (t.项 === '尾款' && Number(t.金额) > 0 && 该入账.has(`${t.id}|${t.项}`)) {
          const o = asMaker.value.find(x => x.id === t.id);
          if (o) {
            appendHistory({
              订单id: o.id, 角色: '接单人', 对方: o.poster,
              摘要: 需求单摘要(o.spec), 结果: '完成', 分数变动: null, 时间: Date.now(),
            });
          }
        }
      }
```

⑪ return 对象替换为：

```ts
  return { hall, asPoster, asMaker, claim, loading, busy, lastError, playerName,
           shopName, shopBoard, refreshShopRank,
           refresh, publish, accept, deliver, confirm, reject, abandon, claimAll };
```

- [ ] **Step 3: 静态门 + 全量测试**

```bash
pnpm --config.verify-deps-before-run=false lint src/wxhl-003/crafting/order
pnpm --config.verify-deps-before-run=false test src/wxhl-003
```
Expected: eslint 0 错；vitest 全绿（store 改动无单测覆盖，靠 Task 5 的 `_ctx` 门与人工评审）

- [ ] **Step 4: Commit**

```bash
git add src/wxhl-003/crafting/order/api.ts src/wxhl-003/crafting/order/store.ts
git commit -m "feat(wxhl): 订单 store——开店闸门/弃单赔偿/分数上报/赔偿领取/店铺排行数据"
```

---

### Task 5: OrderView.vue（三子页签 / 评分 / 弃单 / 店铺显示 / 订单记录）

**Files:**
- Modify: `src/wxhl-003/crafting/order/OrderView.vue`

**Interfaces:**
- Consumes: Task 4 的 store 成员（`shopName/shopBoard/refreshShopRank/abandon/confirm(id, 评分)`）；`rep/shop` 的 `shopBoardRows`；`rep/history` 的 `loadHistory`
- Produces: 无（末端 UI）

- [ ] **Step 1: 模板改造（六处）**

① 子页签行加第三个：

```html
    <div class="ord-subtabs">
      <button class="ord-subtab" :class="{ active: sub === 'hall' }" @click="sub = 'hall'">订单大厅</button>
      <button class="ord-subtab" :class="{ active: sub === 'mine' }" @click="sub = 'mine'">我的</button>
      <button class="ord-subtab" :class="{ active: sub === 'rank' }" @click="切排行">店铺排行</button>
    </div>
```

② 「我的」块的两个 `接单者：{{ o.maker ?? '暂无' }}` 改为：

```html
        <div class="oc-line">接单者：{{ o.maker_shop ?? o.maker ?? '暂无' }}</div>
```

③ 「我发布的」的「已交付」操作区加评分下拉（`验收` 按钮之前）：

```html
        <div v-if="o.status === '已交付'" class="oc-foot">
          <span v-if="!可验收(o)" class="ord-hint">尾款不足（需 {{ o.final }} UP）</span>
          <span v-else class="oc-meta">{{ o.maker_shop ?? o.maker }} 已交付成品</span>
          <select v-model="rateSel[o.id]" class="ord-ratesel" title="给对面店铺打分；跳过则只 +1 完成分">
            <option value="">跳过评分（+1）</option>
            <option v-for="n in [0, 1, 2, 3, 4, 5]" :key="n" :value="n">评 {{ n }} 分（共 +{{ n + 1 }}）</option>
          </select>
          <button class="ord-mini" :disabled="store.busy || !可验收(o)" @click="验收(o.id)">验收</button>
          <button class="ord-mini ord-mini-dang" :disabled="store.busy" @click="store.reject(o.id)">退货</button>
        </div>
```

④ 「我接的」的弃单按钮（把禁用的「弃单（即将开放）」整颗替换）：

```html
            <button class="ord-mini ord-mini-dang" :disabled="store.busy" @click="弃单(o)">
              {{ abandonArm[o.id] ? `确认弃单？赔 ${o.deposit * 3} UP 且店铺 −5 分` : '弃单' }}
            </button>
```

⑤ 「我的」块末尾（`我接的` 列表之后）加订单记录：

```html
      <div class="ord-sect">订单记录（{{ 记录列表.length }}）</div>
      <div v-if="!记录列表.length" class="ord-empty">暂无记录（完成/退货/弃单后会记在这里）</div>
      <div v-for="(r, i) in 记录列表" :key="r.订单id + i" class="ord-card">
        <div class="oc-head">
          <span class="oc-name">{{ r.摘要 }}</span>
          <span class="oc-tag">{{ r.结果 }}</span>
        </div>
        <div class="oc-line">{{ r.角色 }} · 对方：{{ r.对方 }}<template v-if="r.分数变动 !== null"> · 店铺分数 {{ r.分数变动 > 0 ? '+' : '' }}{{ r.分数变动 }}</template></div>
        <div class="oc-line oc-meta">{{ new Date(r.时间).toLocaleString() }}</div>
      </div>
```

⑥ 「店铺排行」页签内容（放在 `</template>` 收尾前，即「我的」template 之后；把外层 `v-else` 改为 `v-else-if="sub === 'mine'"`，再新增一块）：

```html
    <!-- ============ 店铺排行 ============ -->
    <template v-else-if="sub === 'rank'">
      <div class="ord-sect">店铺排行榜（共 {{ store.shopBoard.total }} 家）</div>
      <div v-if="!store.shopName" class="ord-hint">你还未开店：开店接单后即可上榜（完成 +1，验收评分 0–5，退货 −2，弃单 −5）</div>
      <div v-if="!店铺榜行.length" class="ord-empty">{{ store.loading ? '加载中…' : '暂无店铺上榜' }}</div>
      <div v-for="(row, i) in 店铺榜行" :key="i" class="ord-rankrow" :class="{ mine: row.kind === 'entry' && row.mine }">
        <span v-if="row.kind === 'gap'" class="ord-gap">⋯</span>
        <template v-else>
          <span class="ord-rk">#{{ row.rank }}</span>
          <span class="ord-rn">{{ row.entry.name }}</span>
          <span class="ord-rs">{{ row.entry.score }} 分</span>
        </template>
      </div>
    </template>
```

- [ ] **Step 2: script 改造（五处）**

① import 区加：

```ts
import { loadHistory, type 订单记录 } from './rep/history';
import { shopBoardRows } from './rep/shop';
```

② `sub` 类型扩三态：

```ts
const sub = ref<'hall' | 'mine' | 'rank'>('hall');
```

③ 评分选择与验收改动：

```ts
// ---------------- 验收评分（可选，跳过只 +1 保底） ----------------
/** 每张「已交付」单的评分选择（订单 id → '' 跳过 | 0..5） */
const rateSel = reactive<Record<string, number | ''>>({});

async function 验收(id: string): Promise<void> {
  const v = rateSel[id];
  await store.confirm(id, v === '' || v === undefined ? null : Number(v)); // 验收扣了尾款（其余「已交付」单的余额判定要跟着刷新）
  delete rateSel[id];
  craft.syncFromMvu();
  记录刷新.value++; // 验收写了一条本地记录
}
```
（原 `验收` 函数整颗替换；`可验收` 不变。）

④ 弃单两段确认 + 记录刷新：

```ts
// ---------------- 弃单（两段确认：先亮代价，再执行） ----------------
// 不用 confirm() 弹窗（移动端兼容差）：第一次点击武装，按钮文案变成代价确认；第二次才执行。
// 武装态不落任何数据，切单/刷新即自然失效。
const abandonArm = reactive<Record<string, boolean>>({});

async function 弃单(o: 订单): Promise<void> {
  if (!abandonArm[o.id]) {
    for (const k of Object.keys(abandonArm)) delete abandonArm[k]; // 同时只武装一张单，避免多点
    abandonArm[o.id] = true;
    return;
  }
  delete abandonArm[o.id];
  await store.abandon(o.id);
  craft.syncFromMvu(); // 弃单扣了赔偿：余额判定要看到新 UP
  记录刷新.value++;
}
```

⑤ 订单记录与店铺排行：

```ts
// ---------------- 订单记录（localStorage；动作后 bump 计数重读） ----------------
const 记录刷新 = ref(0);
const 记录列表 = computed<订单记录[]>(() => {
  void 记录刷新.value;
  return loadHistory().slice().reverse(); // 新的在前
});

// ---------------- 店铺排行 ----------------
const 店铺榜行 = computed(() => shopBoardRows(store.shopBoard));
async function 切排行(): Promise<void> {
  sub.value = 'rank';
  await store.refreshShopRank();
}
```

`领取`/`交付`/`发布` 三个函数末尾各加一行 `记录刷新.value++;`（领取可能记了「完成」；后两者不动记录但无害——不，**只给 `领取` 加**：发布/交付不写记录，加了是误导）。

- [ ] **Step 3: style 追加**

```css
/* 店铺排行 */
.ord-rankrow { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 6px; font-size: 12px; }
.ord-rankrow.mine { background: rgba(184, 134, 11, 0.15); font-weight: 700; }
.ord-rk { width: 34px; opacity: 0.7; }
.ord-rn { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ord-rs { font-variant-numeric: tabular-nums; }
.ord-gap { text-align: center; flex: 1; opacity: 0.5; }
.ord-ratesel { max-width: 46%; font-size: 12px; }
```

- [ ] **Step 4: .vue 四道机械门**

```bash
# ① SFC 编译 + 未解析 _ctx 检查（0 个才算过）
node -e "const {parse,compileScript}=require('@vue/compiler-sfc');const fs=require('fs');const f='src/wxhl-003/crafting/order/OrderView.vue';const {descriptor}=parse(fs.readFileSync(f,'utf8'));const r=compileScript(descriptor,{id:'x'});const bind=Object.keys(r.bindings);const tpl=descriptor.template.content;const miss=[...tpl.matchAll(/_ctx\.([\p{L}\p{N}_$]+)/gu)].map(m=>m[1]).filter(n=>!bind.includes(n));console.log('unresolved _ctx:',[...new Set(miss)]);if(miss.length)process.exit(1)"
# ② eslint
pnpm --config.verify-deps-before-run=false lint src/wxhl-003/crafting/order
# ③ store 成员差集：模板/脚本用到的 store.* 必须都在 Task 4 的 return 清单里（肉眼 + grep 核对）
# ④ 全量测试不回归
pnpm --config.verify-deps-before-run=false test src/wxhl-003
```

Expected: ① 输出 `unresolved _ctx: []`；② 0 错；④ 全绿

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/order/OrderView.vue
git commit -m "feat(wxhl): 订单 UI——店铺排行页签/验收评分/弃单两段确认/订单记录"
```

---

### Task 6: smoke.mjs 扩展 + 全量验证 + 构建

**Files:**
- Modify: `cloudflare/wxhl-market/smoke.mjs`
- Build: `dist/wxhl-003/index.js`

**Interfaces:**
- Consumes: Task 1/2 全部端点；smoke.mjs 既有的请求助手与 `check` 断言风格（照文件里订单全流程段的写法）
- Produces: 可推送的构建产物

- [ ] **Step 1: smoke.mjs 追加店铺分数与弃单段**

照文件里既有订单全流程段的助手风格追加（请求助手以文件实际为准）：

```js
// —— 店铺分数：上报 → 累加 → 榜单排序 ——
await post('/shop/score', { name: '烟测铁匠铺', delta: 1 });
await post('/shop/score', { name: '烟测铁匠铺', delta: 5 });
await post('/shop/score', { name: '烟测另一家', delta: 3 });
const sr = await get('/shop/rank?name=' + encodeURIComponent('烟测铁匠铺'));
check('店铺分数累加', sr.me?.entry?.score === 6);
check('店铺榜单排序', sr.list[0]?.name === '烟测铁匠铺' && sr.total >= 2);

// —— 弃单 + 赔偿：发布 → 接单(带店铺) → 弃单 → 赔偿待领 → 双 ACK 删行 ——
const ab = await post('/order/create', { poster: '烟测甲', spec: 需求单样例, deposit: 50, final: 50 });
check('接单必须带店铺名', (await postRaw('/order/accept', { id: ab.id, maker: '烟测乙' })).status === 400);
await post('/order/accept', { id: ab.id, maker: '烟测乙', maker_shop: '烟测铁匠铺' });
await post('/order/abandon', { id: ab.id, maker: '烟测乙' });
const abm = await get('/order/mine?who=' + encodeURIComponent('烟测甲'));
check('弃单赔偿待领 = 订金×3', abm.claim.comp === 150 && abm.claim.待领.some(t => t.项 === '赔偿' && t.金额 === 150));
await post('/order/ack', { id: ab.id, who: '烟测乙', side: 'maker', 项: '订金' });
const ack2 = await post('/order/ack', { id: ab.id, who: '烟测甲', side: 'poster', 项: '赔偿' });
check('赔偿 ACK 后删行', ack2.deleted === true);

// —— 验收评分闭环：既有全流程段跑完后，该店分数 = 1 + 评分 ——
await post('/shop/score', { name: '烟测铁匠铺', delta: 4 }); // 模拟「验收评 3 分 → +1+3」的上报
const sr2 = await get('/shop/rank?name=' + encodeURIComponent('烟测铁匠铺'));
check('验收评分后店铺分数', sr2.me?.entry?.score === 10);
```

（`需求单样例`、`postRaw` 等以 smoke.mjs 既有符号为准进行调整；若既有段没有 raw 助手，用 `fetch` 直接写。）

**同时修补既有订单全流程段**：Task 2 把 `maker_shop` 变成了 accept 的必填项，smoke 里**既有**的 `/order/accept` 调用（全流程段）必须补上 `maker_shop: '烟测铁匠铺'`（或任意店名），否则全流程段会在接单处 400 —— 这是预期内的签名变更，不是回归。改完全文件搜一遍 `/order/accept`，确保没有漏网的旧调用。

- [ ] **Step 2: 全量验证**

```bash
node cloudflare/wxhl-market/smoke.mjs
pnpm --config.verify-deps-before-run=false test
```
Expected: smoke 全过（含 2026-09-23 之前的既有断言不回归）；vitest 全仓库绿

- [ ] **Step 3: 构建并核验产物（防"假构建成功"三件套）**

```bash
pnpm --config.verify-deps-before-run=false build
# ① 退出码为 0（上一条命令本身）
# ② 产物时间戳是此刻
ls -l dist/wxhl-003/index.js
# ③ 新代码确实进了 bundle
grep -c "店铺排行" dist/wxhl-003/index.js
grep -c "shop/score\|refreshShopRank" dist/wxhl-003/index.js
```
Expected: ② 时间戳新；③ 两处计数 > 0

- [ ] **Step 4: Commit**

```bash
git add cloudflare/wxhl-market/smoke.mjs dist/wxhl-003/index.js
git commit -m "test(wxhl): 订单店铺评分冒烟 + 重建 dist——v4b 店铺分数制"
```

---

## 部署（用户确认后执行，不在本计划任务内）

```bash
cd cloudflare/wxhl-market && npx wrangler deploy   # 先 Worker
# 验证：
curl -s -X POST https://market.657868.xyz/shop/score -H "Content-Type: application/json" -d '{}'   # 期望 400（不是 404）
curl -s "https://market.657868.xyz/shop/rank"                                                        # 期望 {"list":[],"total":0,...}
curl -s -X POST https://market.657868.xyz/order/abandon -H "Content-Type: application/json" -d '{}'  # 期望 400
# 再推前端（用户说「推送」时）：git push origin master:main
```
