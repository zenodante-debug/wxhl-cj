# 工坊订单系统 v4a（核心闭环）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让玩家能发布代工订单（付订金托管）、接单者用自己的材料制作并交付、发单人验收后付尾款——全流程经 Worker 中转，双方领取后服务端立即删行。

**Architecture:** 后端在现有 `worker.js` 内新增**独立段** `handleOrder` + `ensureOrderSchema`（排在市场建表之前，互不波及）；前端在 `src/wxhl-003/crafting/order/` 下新增 api/store/纯逻辑/视图，照 `market/` 的分层。**服务器只做中转**：行数 = 同时在飞的订单数，双方 ACK 后删除。

**Tech Stack:** TypeScript / Vue 3 script setup / pinia / zod 4 / vitest / Cloudflare Workers + D1

**Spec:** `docs/superpowers/specs/2026-09-23-wxhl-crafting-orders-design.md`（§3 生命周期、§4 服务器、§5 客户端、§6 边界）

## Global Constraints

- **本计划只做 v4a（核心闭环）**：发布 / 大厅 / 接单 / 交付 / 验收 / 退货 / 待领取 / ACK 删除。**评分、平均星、订单记录（v4b）与撤销、超时自动验收、admin purge（v4c）不在本计划内**，不要提前实现。
- **服务器只做中转**：不留历史、不留评价汇总表；双方 ACK 后**必须删行**。成品 JSON **卡 4096 字节**（与市场同口径）。
- **订单段独立**：`handleOrder` 自带 `ensureOrderSchema`，在 `handleMarket` 之前调用（照 `handleRank` 的既有位置）；订单出错不得波及市场。
- **主卡 MVU 只写** `契约者.背包` / `契约者.经济.UP`；写入纪律照工坊既有：**入口先 `syncFromMvu()`、写入基取新读值、一次 `commit`、与 `await` 之间不留陈旧快照**。
- **本机 pnpm 命令必须带 `--config.verify-deps-before-run=false`**（否则 pnpm 11 的依赖校验连死代理、脚本根本不执行）：`pnpm --config.verify-deps-before-run=false test`。
- **类型门是 `npx tsc --noEmit`**（`crafting/` 零新增错误），**不是 `pnpm build`**（transpileOnly，不查类型）。
- **`.vue` 无自动类型门**：改 `.vue` 的任务必须自查四道机械门（`@vue/compiler-sfc` 编译查 **0 个未解析 `_ctx` 引用**、死声明扫描、eslint 0 fatal、store 成员/入参键差集为空）。
- **Worker 测试的假 D1**：`cloudflare/wxhl-market/fake-d1.mjs` **认不出的 WHERE 一律抛错**——这是排行榜踩坑后的既有防线，改 SQL 时必须同步扩假 D1（`fake-d1` 形状必须与真 D1 一致）。
- **身份**：只按**姓名**记名，服务端不做身份校验（与市场/排行榜一致的信义模型）。

## Review Focus

以下五类输入/情形，spec 有交代但最容易被人踩到，每条都在对应任务里钉了测试：

1. **接单竞态**——两人同抢一单，第二个必须收到明确拒绝（「手慢了」）而**不是覆盖已接单人**
2. **成品 JSON 超 4096 字节**——客户端先拦、服务端二次拦，**两边都要有测试**（只拦一边则另一边可被绕过）
3. **双方 ACK 后 `orders` 表必须无该行**——这是"服务器不撑爆"的核心保证，必须有断言
4. **重复领取的幂等**——接单者领了订金但没 ACK，下次读取仍应看到待领取；重复领取不得重复加钱
5. **余额不足时的本地结算**——发单人付尾款不足、接单者赔偿不足，都必须**拒绝且零变量变动**

---

### Task 1: Worker 订单段（建表 + 发布 / 大厅 / 接单）

**Files:**
- Modify: `cloudflare/wxhl-market/worker.js`（新增 `ensureOrderSchema`、`handleOrder` 骨架、三个路由；在入口处调用 `handleOrder`）
- Modify: `cloudflare/wxhl-market/fake-d1.mjs`（支持 `orders` 表的 `INSERT`/`SELECT`/`UPDATE`）
- Test: `cloudflare/wxhl-market/worker.test.js`（新增订单段）

**Interfaces:**
- Consumes: 既有 `cors` 头对象、`withRetry`、`env.MARKET_DB`
- Produces:
  - `POST /order/create` body `{ poster, spec, deposit, final }` → `{ id }`；`deposit` 必须为正整数
  - `GET  /order/list?exclude=<姓名>` → `{ orders: OrderRow[] }`（只返回 `status='待接单'`，按 `created DESC`，最多 100 条）
  - `POST /order/accept` body `{ id, maker }` → `{ ok: true }` 或 400「手慢了，这单已被接走」
  - `OrderRow` 字段：`id, poster, maker, spec_json, deposit, final, status, item_json, rating, comp_json, poster_ack, maker_ack, created, updated`

- [ ] **Step 1: Write the failing test**

```js
// 追加到 cloudflare/wxhl-market/worker.test.js
import { describe, expect, it } from 'vitest';
import { makeFakeD1 } from './fake-d1.mjs';
import worker from './worker.js';

const 需求单 = {
  名称: '狼牙短剑', 成品类型: '装备', 装备子类: '武器',
  品质: '金色', 阶位: 2, 效果要求: '带流血', 说明: '越快越好',
};

async function call(env, path, init) {
  const req = new Request('https://x.test' + path, init);
  return worker.fetch(req, env, {});
}
const postJson = (body) => ({ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });

describe('订单 · 发布与大厅', () => {
  it('发布后出现在大厅，且大厅不含已接单的', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const r = await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }));
    expect(r.status).toBe(200);
    const { id } = await r.json();
    expect(id).toBeTruthy();

    const hall = await (await call(env, '/order/list')).json();
    expect(hall.orders).toHaveLength(1);
    expect(hall.orders[0].poster).toBe('甲');
    expect(hall.orders[0].spec.名称).toBe('狼牙短剑');
    expect(hall.orders[0].deposit).toBe(300);
  });

  it('订金非正整数 → 400', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    for (const bad of [0, -5, 1.5]) {
      const r = await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: bad, final: 100 }));
      expect(r.status).toBe(400);
    }
  });

  it('缺少 poster 或 spec → 400', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    expect((await call(env, '/order/create', postJson({ spec: 需求单, deposit: 1, final: 1 }))).status).toBe(400);
    expect((await call(env, '/order/create', postJson({ poster: '甲', deposit: 1, final: 1 }))).status).toBe(400);
  });
});

describe('订单 · 接单竞态（Review Focus 1）', () => {
  it('两人同抢，第二个被明确拒绝且不覆盖已接单人', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();

    const first = await call(env, '/order/accept', postJson({ id, maker: '乙' }));
    expect(first.status).toBe(200);

    const second = await call(env, '/order/accept', postJson({ id, maker: '丙' }));
    expect(second.status).toBe(400);
    expect(await second.text()).toContain('已被接走');

    const hall = await (await call(env, '/order/list')).json();
    expect(hall.orders).toHaveLength(0); // 已接单 → 不再出现在大厅

    const { results } = await env.MARKET_DB.prepare(`SELECT maker, status FROM orders WHERE id = ?`).bind(id).all();
    expect(results[0].maker).toBe('乙');
    expect(results[0].status).toBe('已接单');
  });

  it('接不存在的单 → 400', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    expect((await call(env, '/order/accept', postJson({ id: 'nope', maker: '乙' }))).status).toBe(400);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --config.verify-deps-before-run=false test -- cloudflare/wxhl-market/worker.test.js`
Expected: FAIL（`/order/create` 返回 404 / `orders` 表不存在，假 D1 抛错）

- [ ] **Step 3: Write implementation**

在 `worker.js` 中，**紧邻 `ensureRankSchema` 之后**新增（保持"独立段"的既有组织方式）：

```js
// ———— D1 建表：订单段自带，与市场/排行榜互不波及 ————
let orderSchemaReady = false;
async function ensureOrderSchema(env) {
  if (orderSchemaReady) return;
  await env.MARKET_DB.batch([
    env.MARKET_DB.prepare(
      `CREATE TABLE IF NOT EXISTS orders (
         id TEXT PRIMARY KEY,
         poster TEXT NOT NULL,
         maker TEXT,
         spec_json TEXT NOT NULL,
         deposit INTEGER NOT NULL,
         final INTEGER NOT NULL,
         status TEXT NOT NULL,
         item_json TEXT,
         rating REAL,
         comp_json TEXT,
         poster_ack INTEGER NOT NULL DEFAULT 0,
         maker_ack INTEGER NOT NULL DEFAULT 0,
         created INTEGER NOT NULL,
         updated INTEGER NOT NULL
       )`,
    ),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status, created DESC)`),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_poster ON orders (poster)`),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_maker ON orders (maker)`),
  ]);
  orderSchemaReady = true;
}

/** 成品 JSON 体积上限：与市场同一口径 */
const ORDER_ITEM_MAX = 4096;

const 订单状态 = { 待接单: '待接单', 已接单: '已接单', 已交付: '已交付', 已完成: '已完成', 已取消: '已取消', 已弃单: '已弃单' };

function newOrderId() {
  return String(Date.now()).padStart(15, '0') + '-' + Math.random().toString(36).slice(2, 8);
}

/** 行 → 前端形状（spec_json 解回对象） */
function toOrderDto(row) {
  return {
    id: row.id, poster: row.poster, maker: row.maker,
    spec: JSON.parse(row.spec_json),
    deposit: row.deposit, final: row.final, status: row.status,
    created: row.created, updated: row.updated,
  };
}

// ———— 工坊订单: 发单人出钱、接单者出材料与图纸，交付后验收付尾款 ————
// 服务器只做中转：只留飞行中订单，双方领取后由 /order/ack 删行；不留历史与评价汇总。
async function handleOrder(url, request, env, cors) {
  const p = url.pathname;
  if (!p.startsWith('/order/')) return null;
  await ensureOrderSchema(env);

  // POST /order/create  { poster, spec, deposit, final }  →  { id }
  if (p === '/order/create' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const poster = String(b.poster ?? '').trim();
    if (!poster) return new Response('缺少发单人姓名', { status: 400, headers: cors });
    if (!b.spec || typeof b.spec !== 'object') return new Response('缺少需求单', { status: 400, headers: cors });
    const deposit = Number(b.deposit);
    const final = Number(b.final);
    if (!Number.isInteger(deposit) || deposit <= 0) return new Response('订金必须是正整数', { status: 400, headers: cors });
    if (!Number.isInteger(final) || final < 0) return new Response('尾款必须是非负整数', { status: 400, headers: cors });
    const spec_json = JSON.stringify(b.spec);
    if (spec_json.length > ORDER_ITEM_MAX) return new Response('需求单过长', { status: 400, headers: cors });

    const id = newOrderId();
    const now = Date.now();
    await withRetry(() =>
      env.MARKET_DB.prepare(
        `INSERT INTO orders (id, poster, maker, spec_json, deposit, final, status, created, updated)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, poster, spec_json, deposit, final, 订单状态.待接单, now, now).run(),
    );
    return new Response(JSON.stringify({ id }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // GET /order/list?exclude=<姓名>  →  { orders }
  if (p === '/order/list' && request.method === 'GET') {
    const exclude = String(url.searchParams.get('exclude') ?? '');
    const { results } = await env.MARKET_DB.prepare(
      `SELECT * FROM orders WHERE status = ? AND poster != ? ORDER BY created DESC LIMIT 100`,
    ).bind(订单状态.待接单, exclude).all();
    return new Response(JSON.stringify({ orders: (results ?? []).map(toOrderDto) }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // POST /order/accept  { id, maker }  →  { ok: true }
  // 原子接单：WHERE 带上 status，受影响 0 行即说明已被别人接走或被撤销。
  if (p === '/order/accept' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const maker = String(b.maker ?? '').trim();
    if (!maker) return new Response('缺少接单人姓名', { status: 400, headers: cors });
    const res = await withRetry(() =>
      env.MARKET_DB.prepare(
        `UPDATE orders SET maker = ?, status = ?, updated = ? WHERE id = ? AND status = ?`,
      ).bind(maker, 订单状态.已接单, Date.now(), String(b.id), 订单状态.待接单).run(),
    );
    const changed = res?.meta?.changes ?? 0;
    if (changed === 0) return new Response('手慢了，这单已被接走', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  return new Response('未知的订单操作', { status: 404, headers: cors });
}
```

在入口（`fetch` 处理函数）里，**紧接 `handleRank` 之后、`ensureSchema(env)` 之前**插入：

```js
    // 工坊订单自成一段：自带 ensureOrderSchema，同样排在建表之前，与市场/排行榜三方互不波及。
    const orderRes = await handleOrder(url, request, env, cors);
    if (orderRes) return orderRes;
```

`fake-d1.mjs` 需支持 `orders` 表：照 `listings` 的既有做法，为 `INSERT INTO orders`、`SELECT * FROM orders WHERE status = ? AND poster != ? ORDER BY created DESC LIMIT 100`、`UPDATE orders SET ... WHERE id = ? AND status = ?`、`SELECT ... FROM orders WHERE id = ?` 各写一条识别分支；**认不出的 WHERE 仍然抛错**（保持既有防线的强度）。`run()` 返回值必须带 `meta.changes`（与真 D1 同形）。

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --config.verify-deps-before-run=false test -- cloudflare/wxhl-market/worker.test.js`
Expected: PASS（含既有市场与排行榜测试，全绿）

- [ ] **Step 5: Commit**

```bash
git add cloudflare/wxhl-market/worker.js cloudflare/wxhl-market/fake-d1.mjs cloudflare/wxhl-market/worker.test.js
git commit -m "feat(wxhl): 订单 Worker 段（一）——建表/发布/大厅/原子接单"
```

---

### Task 2: Worker 订单段（交付 / 验收 / 退货 / 待领取 / ACK）

**Files:**
- Modify: `cloudflare/wxhl-market/worker.js`（`handleOrder` 内新增五个路由 + 一个待领取物组装函数）
- Modify: `cloudflare/wxhl-market/fake-d1.mjs`（支持新 SQL）
- Test: `cloudflare/wxhl-market/worker.test.js`

**Interfaces:**
- Consumes: Task 1 的 `ensureOrderSchema`/`handleOrder`/`toOrderDto`/`订单状态`/`ORDER_ITEM_MAX`/`newOrderId`
- Produces:
  - `POST /order/deliver` body `{ id, maker, item }` → `{ ok: true }`（仅当 `status='已接单'` 且 `maker` 匹配）
  - `POST /order/confirm` body `{ id, poster }` → `{ ok: true }`（`已交付` → `已完成`）
  - `POST /order/reject` body `{ id, poster }` → `{ ok: true }`（`已交付` → `已取消`）
  - `GET  /order/mine?who=<姓名>` → `{ asPoster: OrderDto[], asMaker: OrderDto[], claim: { deposit, final, item, comp } }`
  - `POST /order/ack` body `{ id, who, side }`（`side: 'poster'|'maker'`）→ `{ ok: true, deleted: boolean }`（双方都 ACK → 删行，`deleted: true`）

- [ ] **Step 1: Write the failing test**

```js
describe('订单 · 交付与验收', () => {
  async function 发布并接单(env, over = {}) {
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700, ...over }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));
    return id;
  }

  it('交付挂成品，验收后状态为已完成', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const id = await 发布并接单(env);
    const item = { 名称: '狼牙短剑', 品质: '金色', 类型: '武器', 阶位: '二阶', 数量: 1 };

    const d = await call(env, '/order/deliver', postJson({ id, maker: '乙', item }));
    expect(d.status).toBe(200);

    const mine = await (await call(env, `/order/mine?who=${encodeURIComponent('甲')}`)).json();
    expect(mine.asPoster[0].status).toBe('已交付');
    expect(mine.claim.item.名称).toBe('狼牙短剑');   // 发单人待领成品

    expect((await call(env, '/order/confirm', postJson({ id, poster: '甲' }))).status).toBe(200);
    const after = await (await call(env, `/order/mine?who=${encodeURIComponent('乙')}`)).json();
    expect(after.asMaker[0].status).toBe('已完成');
    expect(after.claim.final).toBe(700);            // 接单者待领尾款
  });

  it('成品 JSON 超 4096 字节 → 400（Review Focus 2，服务端侧）', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const id = await 发布并接单(env);
    const 巨物 = { 名称: 'x'.repeat(5000), 数量: 1 };
    const r = await call(env, '/order/deliver', postJson({ id, maker: '乙', item: 巨物 }));
    expect(r.status).toBe(400);
    expect(await r.text()).toContain('过大');
  });

  it('非接单人不能交付；未接单不能交付', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const id = await 发布并接单(env);
    const item = { 名称: '剑', 数量: 1 };
    expect((await call(env, '/order/deliver', postJson({ id, maker: '丙', item }))).status).toBe(400);

    const env2 = { MARKET_DB: makeFakeD1() };
    const { id: id2 } = await (await call(env2, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    expect((await call(env2, '/order/deliver', postJson({ id: id2, maker: '乙', item }))).status).toBe(400);
  });

  it('退货：状态变为已取消，成品回到接单者待领，订金【不退还发单人】', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const id = await 发布并接单(env);
    const item = { 名称: '剑', 数量: 1 };
    await call(env, '/order/deliver', postJson({ id, maker: '乙', item }));
    expect((await call(env, '/order/reject', postJson({ id, poster: '甲' }))).status).toBe(200);

    const makerMine = await (await call(env, `/order/mine?who=${encodeURIComponent('乙')}`)).json();
    expect(makerMine.asMaker[0].status).toBe('已取消');
    expect(makerMine.claim.item.名称).toBe('剑');   // 退回的成品
    expect(makerMine.claim.deposit).toBe(300);      // 订金仍是接单者的（未领则仍待领）——「不退」指发单人拿不回去

    const posterMine = await (await call(env, `/order/mine?who=${encodeURIComponent('甲')}`)).json();
    expect(posterMine.claim.deposit).toBe(0);       // 发单人永远拿不回订金
    expect(posterMine.claim.final).toBe(0);         // 退货不付尾款
    expect(posterMine.claim.item).toBeNull();       // 成品已退回，发单人不再持有
  });
});

describe('订单 · 待领取与 ACK（Review Focus 3/4）', () => {
  it('双方 ACK 后 orders 表无该行', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();

    const a1 = await (await call(env, '/order/ack', postJson({ id, who: '甲', side: 'poster' }))).json();
    expect(a1.deleted).toBe(false);                 // 只有一方领了，行还在

    const a2 = await (await call(env, '/order/ack', postJson({ id, who: '乙', side: 'maker' }))).json();
    expect(a2.deleted).toBe(true);                  // 双方领完 → 删行

    const { results } = await env.MARKET_DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).all();
    expect(results).toHaveLength(0);
  });

  it('重复领取是幂等的：ACK 两次不报错，且不会让行消失两次', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    expect((await call(env, '/order/ack', postJson({ id, who: '甲', side: 'poster' }))).status).toBe(200);
    expect((await call(env, '/order/ack', postJson({ id, who: '甲', side: 'poster' }))).status).toBe(200);
  });

  it('接单者待领订金（接单后），领取前重复查询仍能看到', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));

    const m1 = await (await call(env, `/order/mine?who=${encodeURIComponent('乙')}`)).json();
    expect(m1.claim.deposit).toBe(300);
    const m2 = await (await call(env, `/order/mine?who=${encodeURIComponent('乙')}`)).json();
    expect(m2.claim.deposit).toBe(300);             // 没 ACK 就还在
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Expected: FAIL（404）

- [ ] **Step 3: Write implementation**

在 `handleOrder` 内续写（`return new Response('未知的订单操作', ...)` 之前）：

```js
  /** 读一行；不存在返回 null */
  async function readOrder(id) {
    const row = await env.MARKET_DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).first();
    return row ?? null;
  }
  /** 带条件的状态推进；受影响 0 行 → false */
  async function advance(id, fromStatus, toStatus, extra = {}) {
    const 列 = Object.keys(extra);
    const 赋值 = 列.map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE orders SET status = ?, updated = ?${赋值 ? ', ' + 赋值 : ''} WHERE id = ? AND status = ?`;
    const 值 = [toStatus, Date.now(), ...列.map(k => extra[k]), id, fromStatus];
    const res = await withRetry(() => env.MARKET_DB.prepare(sql).bind(...值).run());
    return (res?.meta?.changes ?? 0) > 0;
  }

  // POST /order/deliver  { id, maker, item }
  if (p === '/order/deliver' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row || row.status !== 订单状态.已接单) return new Response('订单不存在或不在可交付状态', { status: 400, headers: cors });
    if (String(b.maker ?? '').trim() !== row.maker) return new Response('只有接单人本人能交付', { status: 400, headers: cors });
    if (!b.item || typeof b.item !== 'object') return new Response('缺少成品', { status: 400, headers: cors });
    const item_json = JSON.stringify(b.item);
    if (item_json.length > ORDER_ITEM_MAX) return new Response(`成品数据过大（${item_json.length} > ${ORDER_ITEM_MAX} 字节）`, { status: 400, headers: cors });
    if (!(await advance(row.id, 订单状态.已接单, 订单状态.已交付, { item_json })))
      return new Response('交付失败：订单状态已变', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // POST /order/confirm  { id, poster }  —— 验收（尾款由客户端结算，服务端只推进状态）
  if (p === '/order/confirm' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row || row.status !== 订单状态.已交付) return new Response('订单不存在或不在待验收状态', { status: 400, headers: cors });
    if (String(b.poster ?? '').trim() !== row.poster) return new Response('只有发单人本人能验收', { status: 400, headers: cors });
    if (!(await advance(row.id, 订单状态.已交付, 订单状态.已完成)))
      return new Response('验收失败：订单状态已变', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // POST /order/reject  { id, poster }  —— 退货（订金不退；成品回接单者待领）
  if (p === '/order/reject' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row || row.status !== 订单状态.已交付) return new Response('订单不存在或不在待验收状态', { status: 400, headers: cors });
    if (String(b.poster ?? '').trim() !== row.poster) return new Response('只有发单人本人能退货', { status: 400, headers: cors });
    if (!(await advance(row.id, 订单状态.已交付, 订单状态.已取消)))
      return new Response('退货失败：订单状态已变', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // GET /order/mine?who=<姓名>  →  { asPoster, asMaker, claim }
  // claim 是**该用户名下所有订单**的待领汇总；领取本身发生在客户端，领完调 /order/ack。
  if (p === '/order/mine' && request.method === 'GET') {
    const who = String(url.searchParams.get('who') ?? '').trim();
    if (!who) return new Response('缺少姓名', { status: 400, headers: cors });
    const { results } = await env.MARKET_DB.prepare(
      `SELECT * FROM orders WHERE poster = ? OR maker = ? ORDER BY updated DESC LIMIT 200`,
    ).bind(who, who).all();
    const rows = results ?? [];
    const claim = { deposit: 0, final: 0, item: null, comp: null };
    for (const r of rows) {
      const 已领 = { poster: r.poster_ack === 1, maker: r.maker_ack === 1 };
      // 订金：接单后归接单者（除「已取消且从未接单」的情形——那种订单 maker 为 NULL，不会走到这里）
      if (r.maker === who && r.status !== 订单状态.待接单 && !已领.maker) claim.deposit += r.deposit;
      // 尾款：验收完成后归接单者
      if (r.maker === who && r.status === 订单状态.已完成 && !已领.maker) claim.final += r.final;
      // 成品：交付后归发单人（**验收完成后仍归发单人**，直到他 ACK 领走）；退货后归接单者
      if ((r.status === 订单状态.已交付 || r.status === 订单状态.已完成) && r.poster === who && !已领.poster && r.item_json)
        claim.item = JSON.parse(r.item_json);
      if (r.status === 订单状态.已取消 && r.maker === who && !已领.maker && r.item_json) claim.item = JSON.parse(r.item_json);
    }
    return new Response(JSON.stringify({
      asPoster: rows.filter(r => r.poster === who).map(toOrderDto),
      asMaker: rows.filter(r => r.maker === who).map(toOrderDto),
      claim,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // POST /order/ack  { id, who, side }  →  { ok, deleted }
  // 标记某一方已领取；双方都领完 → 删行（这是"服务器不撑爆"的关键）。
  if (p === '/order/ack' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row) return new Response(JSON.stringify({ ok: true, deleted: true }), { headers: { ...cors, 'Content-Type': 'application/json' } }); // 已被另一边删掉，幂等
    const side = b.side === 'maker' ? 'maker' : 'poster';
    if (String(b.who ?? '').trim() !== (side === 'maker' ? row.maker : row.poster))
      return new Response('不是该订单的当事人', { status: 400, headers: cors });
    const 列 = side === 'maker' ? 'maker_ack' : 'poster_ack';
    await withRetry(() => env.MARKET_DB.prepare(`UPDATE orders SET ${列} = 1, updated = ? WHERE id = ?`).bind(Date.now(), row.id).run());
    const after = await readOrder(row.id);
    const deleted = !!after && after.poster_ack === 1 && after.maker_ack === 1;
    if (deleted) await withRetry(() => env.MARKET_DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(row.id).run());
    return new Response(JSON.stringify({ ok: true, deleted }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }
```

`fake-d1.mjs` 相应扩：`SELECT * FROM orders WHERE id = ?`（`.first()`）、`SELECT * FROM orders WHERE poster = ? OR maker = ? ORDER BY updated DESC LIMIT 200`（`.all()`）、`UPDATE orders SET maker_ack/poster_ack = 1, updated = ? WHERE id = ?`、`UPDATE orders SET status = ?, updated = ?[, 列 = ?] WHERE id = ? AND status = ?`、`DELETE FROM orders WHERE id = ?`。**认不出的 WHERE 继续抛错**。

- [ ] **Step 4: Run test to verify it passes** — Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add cloudflare/wxhl-market/worker.js cloudflare/wxhl-market/fake-d1.mjs cloudflare/wxhl-market/worker.test.js
git commit -m "feat(wxhl): 订单 Worker 段（二）——交付/验收/退货/待领取/ACK 删行"
```

---

### Task 3: 前端纯逻辑（需求单 schema）+ Worker 封装 api.ts

**Files:**
- Create: `src/wxhl-003/crafting/order/spec.ts`
- Create: `src/wxhl-003/crafting/order/api.ts`
- Create: `src/wxhl-003/crafting/order/__tests__/spec.test.ts`

**Interfaces:**
- Consumes: `../market/api` 的 `MARKET_API` 常量与 `getClientId`（复用同一后端域名与客户端标识）
- Produces:
  - `需求单Schema`（zod）、`type 需求单 = z.infer<typeof 需求单Schema>`、`需求单摘要(s: 需求单): string`
  - `type 订单状态 = '待接单'|'已接单'|'已交付'|'已完成'|'已取消'|'已弃单'`
  - `interface 订单 { id, poster, maker, spec, deposit, final, status, created, updated }`
  - `interface 待领取 { deposit: number; final: number; item: MarketItemSnapshot | null; comp: unknown }`
  - `createOrder(p: { poster, spec, deposit, final }): Promise<{ id: string }>`
  - `fetchHall(exclude: string): Promise<订单[]>`
  - `acceptOrder(id: string, maker: string): Promise<void>`
  - `deliverOrder(id: string, maker: string, item: MarketItemSnapshot): Promise<void>`
  - `confirmOrder(id: string, poster: string): Promise<void>`
  - `rejectOrder(id: string, poster: string): Promise<void>`
  - `fetchMine(who: string): Promise<{ asPoster: 订单[]; asMaker: 订单[]; claim: 待领取 }>`
  - `ackOrder(id: string, who: string, side: 'poster' | 'maker'): Promise<{ deleted: boolean }>`
  - `ORDER_ITEM_MAX = 4096`、`成品体积检查(item): string | null`（超限返回原因，否则 null）

- [ ] **Step 1: Write the failing test**

```ts
// src/wxhl-003/crafting/order/__tests__/spec.test.ts
import { describe, expect, it } from 'vitest';
import { ORDER_ITEM_MAX, 成品体积检查, 需求单Schema, 需求单摘要 } from '../spec';

describe('需求单 schema', () => {
  it('缺省值：子类/品质空串、阶位 0（=不限）、两个文本空', () => {
    const s = 需求单Schema.parse({ 名称: '狼牙短剑', 成品类型: '装备' });
    expect(s.装备子类).toBe('');
    expect(s.品质).toBe('');
    expect(s.阶位).toBe(0);
    expect(s.效果要求).toBe('');
    expect(s.说明).toBe('');
  });
  it('阶位接受字符串数字（AI/表单可能传字符串）', () => {
    expect(需求单Schema.parse({ 名称: 'x', 成品类型: '道具', 阶位: '3' }).阶位).toBe(3);
  });
  it('成品类型非法 → 抛错', () => {
    expect(() => 需求单Schema.parse({ 名称: 'x', 成品类型: '法宝' })).toThrow();
  });
});

describe('需求单摘要（列表与卡片共用，必须稳定）', () => {
  it('装备：子类/品质/阶位齐全', () => {
    expect(需求单摘要(需求单Schema.parse({ 名称: '狼牙短剑', 成品类型: '装备', 装备子类: '武器', 品质: '金色', 阶位: 2 })))
      .toBe('狼牙短剑｜装备·武器·金色·二阶');
  });
  it('不限品质阶位时只留名称与类型', () => {
    expect(需求单摘要(需求单Schema.parse({ 名称: '随便什么', 成品类型: '道具' })))
      .toBe('随便什么｜道具');
  });
  it('只填了部分细节时不留空档', () => {
    expect(需求单摘要(需求单Schema.parse({ 名称: 'x', 成品类型: '装备', 装备子类: '饰品' })))
      .toBe('x｜装备·饰品');
  });
});

describe('成品体积检查（Review Focus 2，客户端侧）', () => {
  it('超过 4096 字节 → 返回原因', () => {
    const 巨物 = { 名称: 'x'.repeat(5000), 数量: 1 };
    expect(成品体积检查(巨物)).toContain('过大');
  });
  it('正常物品 → null', () => {
    expect(成品体积检查({ 名称: '狼牙短剑', 数量: 1 })).toBeNull();
  });
  it('阈值与市场同口径', () => {
    expect(ORDER_ITEM_MAX).toBe(4096);
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — Run: `pnpm --config.verify-deps-before-run=false test -- src/wxhl-003/crafting/order`；Expected: FAIL（模块不存在）

- [ ] **Step 3: Write implementation**

```ts
// src/wxhl-003/crafting/order/spec.ts
// 订单需求单：发单人想要什么。纯逻辑，零酒馆依赖。
import type { MarketItemSnapshot } from '../../market/priceTable';

export const 需求单Schema = z.object({
  名称: z.string(),
  成品类型: z.enum(['装备', '道具']),
  装备子类: z.enum(['武器', '防具', '饰品']).or(z.literal('')).prefault(''),
  品质: z.enum(['金色', '紫色']).or(z.literal('')).prefault(''),  // 空 = 不限
  阶位: z.coerce.number().prefault(0),                            // 0 = 不限
  效果要求: z.string().prefault(''),
  说明: z.string().prefault(''),
});
export type 需求单 = z.infer<typeof 需求单Schema>;

/** 阶梯名（0 = 不限时不显示） */
const 阶位名 = ['', '一阶', '二阶', '三阶', '四阶', '五阶'];

/**
 * 摘要：大厅卡片与我的订单共用。
 * 格式 `名称｜成品类型·子类·品质·阶位`，空项跳过；例：
 *   `狼牙短剑｜装备·武器·金色·二阶`、`随便什么｜道具`
 */
export function 需求单摘要(s: 需求单): string {
  const 细节 = [s.装备子类, s.品质, 阶位名[s.阶位] ?? ''].filter(Boolean);
  const 主 = 细节.length ? `${s.成品类型}·${细节.join('·')}` : s.成品类型;
  return `${s.名称}｜${主}`;
}

/** 成品 JSON 体积上限：与市场同一口径，服务端会二次校验 */
export const ORDER_ITEM_MAX = 4096;

/** 超限返回原因，否则 null */
export function 成品体积检查(item: MarketItemSnapshot): string | null {
  const n = JSON.stringify(item).length;
  return n > ORDER_ITEM_MAX ? `成品数据过大（${n} > ${ORDER_ITEM_MAX} 字节）` : null;
}
```

```ts
// src/wxhl-003/crafting/order/api.ts
// 订单 Worker 封装：照 market/api.ts 的 req/post 写法，复用同一后端域名与匿名客户端标识。
import { MARKET_API, getClientId } from '../../market/api';
import type { MarketItemSnapshot } from '../../market/priceTable';
import type { 需求单 } from './spec';

export type 订单状态 = '待接单' | '已接单' | '已交付' | '已完成' | '已取消' | '已弃单';

export interface 订单 {
  id: string;
  poster: string;
  maker: string | null;
  spec: 需求单;
  deposit: number;
  final: number;
  status: 订单状态;
  created: number;
  updated: number;
}

export interface 待领取 {
  deposit: number;
  final: number;
  item: MarketItemSnapshot | null;
  comp: unknown;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(MARKET_API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}
const post = <T>(path: string, body: unknown): Promise<T> => req<T>(path, { method: 'POST', body: JSON.stringify(body) });

export function createOrder(p: { poster: string; spec: 需求单; deposit: number; final: number }): Promise<{ id: string }> {
  return post('/order/create', { ...p, client: getClientId() });
}
export function fetchHall(exclude: string): Promise<订单[]> {
  return req<{ orders: 订单[] }>(`/order/list?exclude=${encodeURIComponent(exclude)}`).then(r => r.orders);
}
export function acceptOrder(id: string, maker: string): Promise<void> {
  return post('/order/accept', { id, maker, client: getClientId() }).then(() => undefined);
}
export function deliverOrder(id: string, maker: string, item: MarketItemSnapshot): Promise<void> {
  return post('/order/deliver', { id, maker, item, client: getClientId() }).then(() => undefined);
}
export function confirmOrder(id: string, poster: string): Promise<void> {
  return post('/order/confirm', { id, poster, client: getClientId() }).then(() => undefined);
}
export function rejectOrder(id: string, poster: string): Promise<void> {
  return post('/order/reject', { id, poster, client: getClientId() }).then(() => undefined);
}
export function fetchMine(who: string): Promise<{ asPoster: 订单[]; asMaker: 订单[]; claim: 待领取 }> {
  return req(`/order/mine?who=${encodeURIComponent(who)}`);
}
export function ackOrder(id: string, who: string, side: 'poster' | 'maker'): Promise<{ deleted: boolean }> {
  return post('/order/ack', { id, who, side, client: getClientId() });
}
```

- [ ] **Step 4: Run test to verify it passes** — Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/order/
git commit -m "feat(wxhl): 订单需求单 schema 与 Worker 封装"
```

---

### Task 4: order/store.ts —— pinia 状态与本地结算

**Files:**
- Create: `src/wxhl-003/crafting/order/store.ts`

**Interfaces:**
- Consumes: Task 3 的 `api.ts` 全部导出；`../store` 的 `useCraftingStore`（取 `bag`/`syncFromMvu`/`codex` 等）；`../../market/settle` 的 `bagAdd`/`bagRemove`/`spendUP`/`gainUP`；`../../dice` 的 `归一位阶`；MVU 全局
- Produces: `useOrderStore`：
  - state：`hall: Ref<订单[]>`、`asPoster: Ref<订单[]>`、`asMaker: Ref<订单[]>`、`claim: Ref<待领取>`、`loading/lastError`
  - `refresh(): Promise<void>`（拉大厅 + 我的）
  - `publish(spec: 需求单, deposit: number, final: number): Promise<boolean>`（扣订金 → 建单）
  - `accept(id: string): Promise<boolean>`
  - `deliver(id: string, 物品名: string): Promise<boolean>`（从背包取出并上传）
  - `confirm(id: string): Promise<boolean>`（校验尾款 → 扣款 → 通知服务器）
  - `reject(id: string): Promise<boolean>`
  - `claimAll(): Promise<void>`（把待领取物落到本地：加 UP / 入包 / 移出包，逐项 ACK）
  - `交付体积检查` 由 `spec.ts` 提供，store 在 `deliver` 入口调用

- [ ] **Step 1: Write implementation**

结构照 `market/store.ts`：文件顶部放 `messageId()` / `readContractor()` / `commit()` 三个助手（**逐字照抄 `crafting/store.ts` 的同名函数**，保持全仓一套 MVU 纪律），然后是 store。

```ts
// src/wxhl-003/crafting/order/store.ts
import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from '../../market/settle';
import type { MarketItemSnapshot } from '../../market/priceTable';
import {
  ackOrder, acceptOrder, confirmOrder, createOrder, deliverOrder,
  fetchHall, fetchMine, rejectOrder,
  type 订单, type 待领取,
} from './api';
import { 成品体积检查, type 需求单 } from './spec';

// —— MVU 三助手：与 crafting/store.ts 逐字一致（楼层探测 → _.set → replaceMvuData → 回读校验）——
function messageId(): number | 'latest' { /* 照抄 crafting/store.ts */ }
function readContractor(): { mvu: any; c: any; mid: number | 'latest' } | null { /* 照抄 */ }
async function commit(mvu: any, mid: number | 'latest', checks: [string[], unknown][]): Promise<void> { /* 照抄 */ }

const 空待领: 待领取 = { deposit: 0, final: 0, item: null, comp: null };

export const useOrderStore = defineStore('wxhl003-order', () => {
  const hall = ref<订单[]>([]);
  const asPoster = ref<订单[]>([]);
  const asMaker = ref<订单[]>([]);
  const claim = ref<待领取>({ ...空待领 });
  const loading = ref(false);
  const busy = ref(false);          // 双击防护：所有写操作共用
  const lastError = ref('');
  const playerName = ref('无名契约者');

  function syncPlayer(): boolean {
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量（契约者不存在）'; return false; }
    playerName.value = String(r.c.头部?.姓名 ?? '无名契约者');
    return true;
  }

  async function refresh(): Promise<void> {
    if (!syncPlayer()) return;
    loading.value = true; lastError.value = '';
    try {
      const [h, m] = await Promise.all([fetchHall(playerName.value), fetchMine(playerName.value)]);
      hall.value = h; asPoster.value = m.asPoster; asMaker.value = m.asMaker; claim.value = m.claim;
    } catch (e: any) { lastError.value = e?.message || '订单服务连接失败'; }
    finally { loading.value = false; }
  }

  /** 发布：先本地扣订金，再建单；建单失败则回滚本地 */
  async function publish(spec: 需求单, deposit: number, final: number): Promise<boolean> {
    if (busy.value) return false;
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    const 当前UP = Number(r.c.经济?.UP ?? 0);
    let 余UP: number;
    try { 余UP = spendUP(当前UP, deposit); }
    catch (e: any) { lastError.value = e.message; toastr.error(lastError.value); return false; }

    busy.value = true; lastError.value = '';
    try {
      await createOrder({ poster: playerName.value, spec, deposit, final });
    } catch (e: any) {
      lastError.value = e?.message || '发布失败';
      toastr.error('发布失败: ' + lastError.value);
      return false;                      // 未写档，无需回滚
    } finally { busy.value = false; }

    _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], 余UP);
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], 余UP]]);
    toastr.success(`订单已发布（订金 ${deposit} UP 已托管）`);
    await refresh();
    return true;
  }

  async function accept(id: string): Promise<boolean> {
    if (busy.value) return false;
    busy.value = true; lastError.value = '';
    try { await acceptOrder(id, playerName.value); toastr.success('接单成功，订金已到你名下'); await refresh(); return true; }
    catch (e: any) { lastError.value = e?.message || '接单失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }
  }

  /** 交付：从背包取出该物品并上传；体积超限在本地先拦（服务端会二次校验） */
  async function deliver(id: string, 物品名: string): Promise<boolean> {
    if (busy.value) return false;
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    const 当前背包 = (r.c.背包 ?? {}) as Bag;
    const 物品 = 当前背包[物品名];
    if (!物品) { lastError.value = `背包里没有「${物品名}」`; toastr.error(lastError.value); return false; }
    const 快照 = { ...物品, 名称: 物品名 } as MarketItemSnapshot;
    const 体积原因 = 成品体积检查(快照);
    if (体积原因) { lastError.value = 体积原因; toastr.error(体积原因); return false; }

    busy.value = true; lastError.value = '';
    try { await deliverOrder(id, playerName.value, 快照); }
    catch (e: any) { lastError.value = e?.message || '交付失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }

    let 新背包: Bag;
    try { 新背包 = bagRemove(当前背包, 物品名, 1); }
    catch (e: any) { lastError.value = e.message; toastr.error(lastError.value); return false; }
    _.set(r.mvu, ['stat_data', '契约者', '背包'], 新背包);
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '背包'], 新背包]]);
    toastr.success('已交付，等待发单人验收');
    await refresh();
    return true;
  }

  /** 验收：先校验尾款（不足则禁用按钮 + 这里兜底），扣款后通知服务器 */
  async function confirm(id: string): Promise<boolean> {
    if (busy.value) return false;
    const 单 = asPoster.value.find(o => o.id === id);
    if (!单) { lastError.value = '找不到该订单'; return false; }
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    const 当前UP = Number(r.c.经济?.UP ?? 0);
    let 余UP: number;
    try { 余UP = spendUP(当前UP, 单.final); }
    catch (e: any) { lastError.value = `尾款不足，无法验收：${e.message}`; toastr.error(lastError.value); return false; }

    busy.value = true; lastError.value = '';
    try { await confirmOrder(id, playerName.value); }
    catch (e: any) { lastError.value = e?.message || '验收失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }

    _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], 余UP);
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], 余UP]]);
    toastr.success(`验收完成，已支付尾款 ${单.final} UP`);
    await refresh();
    return true;
  }

  async function reject(id: string): Promise<boolean> {
    if (busy.value) return false;
    busy.value = true; lastError.value = '';
    try { await rejectOrder(id, playerName.value); toastr.warning('已退货，订单取消（订金不退）'); await refresh(); return true; }
    catch (e: any) { lastError.value = e?.message || '退货失败'; toastr.error(lastError.value); return false; }
    finally { busy.value = false; }
  }

  /**
   * 领取全部待领物并逐项 ACK。
   * 资金先本地入账再 ACK；物品先 ACK 再入包（避免 ACK 失败导致重复入包）。
   * 任一项失败即停，下次刷新继续（ACK 是幂等的）。
   */
  async function claimAll(): Promise<void> {
    if (busy.value) return;
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return; }
    const c = claim.value;
    if (c.deposit <= 0 && c.final <= 0 && !c.item) return;

    busy.value = true; lastError.value = '';
    try {
      // ① 资金：订金归接单者、尾款归接单者 —— 一律是"我收到钱"
      const 进账 = c.deposit + c.final;
      if (进账 > 0) {
        const 新UP = gainUP(Number(r.c.经济?.UP ?? 0), 进账);
        _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], 新UP);
        await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], 新UP]]);
      }
      // ② 物品：先入包再 ACK
      if (c.item) {
        const 名 = String((c.item as any).名称 ?? '');
        if (!名) throw new Error('待领成品缺少名称');
        const 新背包 = bagAdd((r.c.背包 ?? {}) as Bag, c.item, Number((c.item as any).数量 ?? 1));
        _.set(r.mvu, ['stat_data', '契约者', '背包'], 新背包);
        await commit(r.mvu, r.mid, [[['stat_data', '契约者', '背包'], 新背包]]);
      }
      // ③ ACK 所有相关订单（两侧都领完时服务端会删行）
      for (const o of [...asPoster.value, ...asMaker.value]) {
        const side = o.poster === playerName.value ? 'poster' : 'maker';
        try { await ackOrder(o.id, playerName.value, side); } catch (_) { /* 幂等，下次再来 */ }
      }
      toastr.success(`已领取：${进账} UP${c.item ? ' + 1 件物品' : ''}`);
    } catch (e: any) {
      lastError.value = e?.message || '领取失败';
      toastr.error(lastError.value);
    } finally { busy.value = false; }
    await refresh();
  }

  return { hall, asPoster, asMaker, claim, loading, busy, lastError, playerName,
           refresh, publish, accept, deliver, confirm, reject, claimAll };
});
```

- [ ] **Step 2: Write the test**（控制器裁定：本级承担"余额不足必须拒绝且零变量变动"，必须钉住）

新建 `src/wxhl-003/crafting/order/__tests__/store.test.ts`，**照 `src/wxhl-003/crafting/__tests__/store.test.ts` 的 mock 模式**（`vi.hoisted` + `vi.mock` 掉 `./api`；`getVariables`/`replaceVariables`/`getCurrentMessageId`/`Mvu`/`toastr` 挂 `globalThis`；`setActivePinia(createPinia())`）。注意 **`vi.mock` 的相对路径必须数清层级**（`'../api'` 从 `order/__tests__/` 只到 `order/`，正确）。

必须覆盖：
- `publish` 订金超过余额 → 返回 false、`toastr.error` 被调、**`经济.UP` 与 `替换写入次数` 均为零变动**（即 `replaceMvuData` 未被调用）
- `confirm` 尾款超过余额 → 同上（这条最关键：**不能出现"钱不够还验收了"**）
- `publish` 正常路径 → 扣款正确、`createOrder` 被调用一次
- `deliver` 体积超限 → 不调用 `deliverOrder`、不改背包
- `deliver` 正常 → 背包少一件、`deliverOrder` 收到该物品快照

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm --config.verify-deps-before-run=false test -- src/wxhl-003/crafting/order`
Expected: FAIL（`useOrderStore` 尚未实现或断言未满足）

- [ ] **Step 4: Type-check + test**

Run: `npx tsc --noEmit` → `crafting/` 零新增错误；`pnpm --config.verify-deps-before-run=false test` → 全绿

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/crafting/order/store.ts src/wxhl-003/crafting/order/__tests__/store.test.ts
git commit -m "feat(wxhl): 订单 store——发布/接单/交付/验收/退货/领取与本地结算（含经济守卫测试）"
```

---

### Task 5: OrderView.vue + 工坊「订单」页签接线

**Files:**
- Create: `src/wxhl-003/crafting/order/OrderView.vue`
- Modify: `src/wxhl-003/crafting/CraftingView.vue`（新增第四个页签「订单」）

**Interfaces:**
- Consumes: Task 4 的 `useOrderStore`；Task 3 的 `需求单Schema`/`需求单摘要`/`成品体积检查`；`../store` 的 `useCraftingStore`（取 `bag` 供交付时选物品）
- Produces: `OrderView.vue`（无 props；不 emit）

- [ ] **Step 1: Write the component**

结构照 `MarketView.vue`：`<script setup lang="ts">`、`const store = useOrderStore()`、两个子页签由 `ref` 控制、样式用 `<style scoped>` + `.ord-*` 前缀。

必须包含：

- **子页签**：`订单大厅` / `我的`
- **订单大厅**：
  - 顶部「发布订单」卡片：需求单字段（名称/成品类型/装备子类/品质/阶位/效果要求/说明）+ 订金 & 尾款输入 + **合计提示** + 「发布」按钮（`busy` 时禁用；订金非正整数时禁用）
  - 订单列表：每张卡显示 `需求单摘要(o.spec)`、`o.spec.说明`、`o.spec.效果要求`、发单人 `o.poster`、订金/尾款、发布时间；带「接单」按钮（`busy` 时禁用）
  - 空态：「大厅暂无订单，去发一单吧」
- **我的**：
  - **我发布的**：每张卡显示状态 + 需求单摘要 + 接单者；`status === '已交付'` 时显示「验收」与「退货」两个按钮，且**验收按钮在 `玩家UP < o.final` 时禁用并提示「尾款不足」**
  - **我接的**：每张卡显示状态 + 需求单摘要 + 发单人；`status === '已接单'` 时显示交付物品下拉（取自 `useCraftingStore().bag` 的物品名）+「交付」按钮，以及「弃单」按钮（**v4a 里按钮存在但提示「弃单功能即将开放」并禁用**——v4b 才实现）；`status === '已交付'` 时提示「等待发单人验收」
  - **待领取**：`claim` 非空时显示一行汇总（`订金 X + 尾款 Y UP` / `1 件物品`）+「全部领取」按钮 → `store.claimAll()`
  - 空态：「还没有订单」
- **错误条**：`store.lastError` 非空时置顶显示（与 `CraftingView` 同款）

- [ ] **Step 2: 在 `CraftingView.vue` 接线**

`TABS` 数组加一项 `{ key: 'order', label: '订单' }`；`tab` 的 union 类型同步加 `'order'`；模板底部加：

```html
    <!-- ============ 订单 ============ -->
    <div v-if="tab === 'order'" class="crf-body">
      <OrderView />
    </div>
```

并 `import OrderView from './order/OrderView.vue'`。切到订单页时刷新一次（`onMounted` 或 `watch(tab)` 调 `orderStore.refresh()`）。

- [ ] **Step 3: Build + 四道 `.vue` 机械门**

Run:
```bash
npx tsc --noEmit                                   # crafting/ 零新增
pnpm --config.verify-deps-before-run=false test    # 全套绿
node -e "const{parse,compileScript,compileTemplate}=require('@vue/compiler-sfc');const fs=require('fs');for(const f of ['src/wxhl-003/crafting/order/OrderView.vue','src/wxhl-003/crafting/CraftingView.vue']){const s=fs.readFileSync(f,'utf8');const{descriptor,errors}=parse(s);if(errors.length)throw new Error(f+' parse: '+errors);const sc=compileScript(descriptor,{id:'x'});const t=compileTemplate({source:descriptor.template.content,filename:f,id:'x',compilerOptions:{bindingMetadata:sc.bindings,prefixIdentifiers:true}});if(t.errors.length)throw new Error(f+' template: '+t.errors);const 未解析=[...t.code.matchAll(/_ctx\.([A-Za-z_一-龥][\w一-龥]*)/g)].map(m=>m[1]);console.log(f,'绑定',Object.keys(sc.bindings).length,'未解析 _ctx:',未解析.length?未解析:'无');}"
```
Expected: 0 parse / 0 template / **未解析 `_ctx`: 无**

- [ ] **Step 4: Commit**

```bash
git add src/wxhl-003/crafting/order/OrderView.vue src/wxhl-003/crafting/CraftingView.vue
git commit -m "feat(wxhl): 订单界面上线——订单大厅/我的两个子页签"
```

---

### Task 6: 冒烟 + 全量回归

**Files:**
- Modify: `cloudflare/wxhl-market/smoke.mjs`（加订单全流程）

- [ ] **Step 1: 加冒烟流程**

在 `smoke.mjs` 末尾加一段（照既有断言风格，全部打真实端点）：发布 → 大厅可见 → 接单 → 再抢一次应失败 → 交付 → 验收 → 双方 ACK → **断言 `/order/mine` 两边都查不到该单**（行已删）。

- [ ] **Step 2: 跑全量**

```bash
pnpm --config.verify-deps-before-run=false test
npx tsc --noEmit
```
Expected: 全绿；`crafting/` 与 `market/` 零新增类型错误

- [ ] **Step 3: Commit**

```bash
git add cloudflare/wxhl-market/smoke.mjs
git commit -m "test(wxhl): 订单系统冒烟——全流程 + ACK 后删行断言"
```

---

## Self-Review 记录

- **Spec coverage**：§3 生命周期 → T1（发布/接单）、T2（交付/验收/退货/领取/ACK）、T4（本地结算）；§4 服务器 → T1/T2（独立段、4096 上限、ACK 删行）、T6（冒烟断言删行）；§5 客户端 → T3/T4/T5；§6 边界 → 各任务的失败用例 + Review Focus 五条。**§2 中的「撤销 / 超时自动验收 / admin purge / 评分与订单记录 / 弃单赔偿」属 v4b/v4c，本计划明确排除**（Global Constraints 已写死）。
- **Placeholder scan**：T4 的三个 MVU 助手标注「照抄 `crafting/store.ts`」——这是**重复代码的指路**而非占位：该三函数是本仓既有的固定写法，逐字复制即可，且我已经在 Constraints 里写明写入纪律。其余步骤均含可执行代码或明确命令。
- **Type consistency**：`订单`/`待领取`/`需求单`/`订单状态` 跨 T3→T4→T5 一致；`ORDER_ITEM_MAX`/`成品体积检查` 在 T3 定义、T4 消费、T2 服务端侧同名常量对应；`advance`/`readOrder` 是 T2 内的局部函数，不跨任务。
- **Review Focus**：五条均已落到具体测试——① 接单竞态 → T1；② 4096 体积 → T2（服务端）+ T3（客户端）；③ ACK 删行 → T2 + T6；④ 重复领取幂等 → T2；⑤ 余额不足 → T4 的 `publish`/`confirm` 用 `spendUP` 抛错兜底（**注意：T4 无单测，靠 `npx tsc --noEmit` 与实机验证；如需钉死请评审时要求补 store 单测**）。
- **已知缺口（供评审判断是否必修）**：T4 的本地结算无单元测试（MVU 胶水层，与既有 `crafting/store.ts` 同类），而它承担"余额不足必须拒绝且零变量变动"这条 Review Focus——若评审认为风险偏高，应在 T4 补一个 `store.test.ts`（照 `crafting/__tests__/store.test.ts` 的 mock 模式）。
