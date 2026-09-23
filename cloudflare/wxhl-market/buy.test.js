import { describe, expect, it } from 'vitest';
import { makeFakeD1 } from './fake-d1.mjs';
import worker from './worker.js';

// ================================================================
// 自由市场 · 部分购买（2026-09-23）
//
// 规则：所有挂单都允许只买一部分；单价 × 买走数量 = 本次成交额；
//       服务端按「条件扣减」做并发仲裁 —— 库存不够时四步全不动，回 409。
//       `UPDATE` 的 meta.changes 是仲裁信号（真 SQLite 已核对：超量时 sales/earn/upd 全为 0）。
//
// 手续费不在这层：它是**买家本地**扣的（每次成交额的 10% 向上取整），服务器只记卖家货款。
// ================================================================

const env = () => ({ MARKET_DB: makeFakeD1() });
const post = (path, body) =>
  new Request('https://test.local' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const get = path => new Request('https://test.local' + path);

/** 上架弹药 ×100、单价 50 UP（蓝色道具按武器基准 [100,200]，一阶区间 = 50~400） */
async function 挂弹药(e, over = {}) {
  const res = await worker.fetch(
    post('/market/list', {
      client: 'seller-c', seller: '军火商', tier: '一阶', kind: 'goods',
      item: { 名称: '步枪弹', 数量: 100, 品质: '蓝色', 阶位: '一阶', 描述: '制式弹药' },
      qty: 100, price: 50,
      ...over,
    }),
    e,
  );
  expect(res.status, await res.clone().text()).toBe(200);
  return (await res.json()).id;
}

/** 挂单当前剩余数量；已卖光返回 null */
async function 剩余(e, id) {
  const { listings } = await (await worker.fetch(get('/market/listings'), e)).json();
  return listings.find(l => l.id === id)?.qty ?? null;
}

const 买 = (e, id, qty, buyer = '买家甲', client = 'buyer-c') =>
  worker.fetch(post('/market/buy', { id, buyer, client, qty }), e);

const 货款 = async (e, client = 'seller-c') =>
  (await (await worker.fetch(get('/market/mine?client=' + client), e)).json()).pending;

const 出售记录 = async (e, client = 'seller-c') =>
  (await (await worker.fetch(get('/market/sales?client=' + client), e)).json()).sales;

describe('部分购买 · 扣减与记账', () => {
  it('买 30/100 → 挂单剩 70，货款 +1500（50×30）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    const res = await 买(e, id, 30);
    expect(res.status).toBe(200);
    expect(await 剩余(e, id)).toBe(70);
    expect(await 货款(e)).toBe(1500);
  });

  it('恰好买光 → 挂单消失，货款 +5000（50×100）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    expect((await 买(e, id, 100)).status).toBe(200);
    expect(await 剩余(e, id)).toBeNull();
    expect(await 货款(e)).toBe(5000);
  });

  it('分多次买：货款累加，挂单一路减到 0 才消失', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 30);
    await 买(e, id, 30, '买家乙', 'buyer-d');
    expect(await 剩余(e, id)).toBe(40);
    expect(await 货款(e)).toBe(3000);
    await 买(e, id, 40, '买家丙', 'buyer-e');
    expect(await 剩余(e, id)).toBeNull();
    expect(await 货款(e)).toBe(5000);
  });

  it('买 1 件也行（最小粒度）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    expect((await 买(e, id, 1)).status).toBe(200);
    expect(await 剩余(e, id)).toBe(99);
    expect(await 货款(e)).toBe(50);
  });

  it('装备类挂单同样可按数量买（qty>1 的装备）', async () => {
    const e = env();
    const res = await worker.fetch(
      post('/market/list', {
        client: 'seller-c', seller: '铁匠', tier: '一阶', kind: 'equip',
        item: {
          名称: '制式短剑', 类型: '武器', 品质: '蓝色', 阶位: '一阶', 数量: 3,
          伤害骰: 'd8', 效果: { 锋利: '伤害+1。' },
        },
        qty: 3, price: 100,
      }),
      e,
    );
    expect(res.status).toBe(200);
    const { id } = await res.json();
    expect((await 买(e, id, 2)).status).toBe(200);
    expect(await 剩余(e, id)).toBe(1);
    expect(await 货款(e)).toBe(200);
  });
});

describe('部分购买 · 库存守卫（并发仲裁）', () => {
  it('买超过剩余 → 409，且挂单与货款都不动', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 70); // 剩 30
    const res = await 买(e, id, 31);
    expect(res.status).toBe(409);
    expect(await 剩余(e, id)).toBe(30);
    expect(await 货款(e)).toBe(3500);
    expect(await 出售记录(e)).toHaveLength(1);
  });

  it('按初始数量的整份买不来：别人先买走一部分后就买不成了（防超卖）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 60); // 剩 40
    expect((await 买(e, id, 100, '买家乙', 'buyer-d')).status).toBe(409);
    expect(await 剩余(e, id)).toBe(40);
  });

  it('卖光后再买 → 404（挂单已不存在）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 100);
    expect((await 买(e, id, 1)).status).toBe(404);
  });

  it('库存不足时不留下任何出售记录', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 99);
    await 买(e, id, 5, '买家乙', 'buyer-d'); // 只剩 1，必失败
    const rows = await 出售记录(e);
    expect(rows).toHaveLength(1);
    expect(rows[0].qty).toBe(99);
  });
});

describe('部分购买 · 请求校验', () => {
  it('数量非法 → 400（0 / 负数 / 小数 / 非数字 / null）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    for (const qty of [0, -1, 1.5, 'abc', null]) {
      expect((await 买(e, id, qty)).status, `qty=${String(qty)} 应被拒`).toBe(400);
    }
    expect(await 剩余(e, id)).toBe(100);
    expect(await 货款(e)).toBe(0);
  });

  it('**不传** qty = 买光剩余（向后兼容：旧 dist 包就是这么调的，别把老玩家弄瘸）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 40); // 先买走 40，剩 60
    const res = await worker.fetch(post('/market/buy', { id, buyer: '买家乙', client: 'buyer-d' }), e);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, bought: 60 });
    expect(await 剩余(e, id)).toBeNull();
    expect(await 货款(e)).toBe(5000);
  });

  it('挂单不存在 → 404', async () => {
    const e = env();
    expect((await 买(e, 'no-such-id', 1)).status).toBe(404);
  });

  it('不能买自己的挂单 → 403', async () => {
    const e = env();
    const id = await 挂弹药(e);
    expect((await 买(e, id, 1, '军火商', 'seller-c')).status).toBe(403);
  });
});

describe('部分购买 · 出售记录', () => {
  it('同一挂单的多笔成交各自留一条记录，不互相覆盖', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 30, '买家甲', 'buyer-a');
    await 买(e, id, 20, '买家乙', 'buyer-b');
    const rows = await 出售记录(e);
    expect(rows).toHaveLength(2);
    expect(rows.map(r => r.qty).sort((a, b) => a - b)).toEqual([20, 30]);
    expect(rows.map(r => r.buyer).sort()).toEqual(['买家乙', '买家甲']);
  });

  it('记录里的 price 是**单价**，不是成交总额', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 30);
    const [row] = await 出售记录(e);
    expect(row.price).toBe(50);
    expect(row.qty).toBe(30);
    expect(row.item.名称).toBe('步枪弹');
  });

  it('每一笔记录的 id 都不同（否则 INSERT OR REPLACE 会互相顶掉）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 10);
    await 买(e, id, 10, '买家乙', 'buyer-b');
    const rows = await 出售记录(e);
    expect(new Set(rows.map(r => r.id)).size).toBe(2);
  });
});

describe('下架 · 按服务端剩余数量取回', () => {
  it('部分成交后下架，返回的是**剩余**数量而不是原始数量', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 30);
    const res = await worker.fetch(post('/market/cancel', { id, client: 'seller-c' }), e);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, returned: 70 });
  });

  it('没人买过时下架，返回原始数量', async () => {
    const e = env();
    const id = await 挂弹药(e);
    const res = await worker.fetch(post('/market/cancel', { id, client: 'seller-c' }), e);
    expect(await res.json()).toEqual({ ok: true, returned: 100 });
  });

  it('卖光后下架 → 404（挂单已不存在）', async () => {
    const e = env();
    const id = await 挂弹药(e);
    await 买(e, id, 100);
    expect((await worker.fetch(post('/market/cancel', { id, client: 'seller-c' }), e)).status).toBe(404);
  });

  it('不是自己的挂单不能下架 → 403', async () => {
    const e = env();
    const id = await 挂弹药(e);
    expect((await worker.fetch(post('/market/cancel', { id, client: 'someone-else' }), e)).status).toBe(403);
  });
});
