import { describe, expect, it } from 'vitest';
import { checkPrice } from './worker.js';

describe('worker checkPrice（与前端 priceTable 同规则镜像）', () => {
  it('蓝·武器·二阶 [400,800]，禁溢价', () => {
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 800).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 801).ok).toBe(false);
  });
  it('下限=基准下限×阶位²×0.4', () => {
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 160).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 159).ok).toBe(false);
  });
  it('金+50% / 紫+100%', () => {
    expect(checkPrice('equip', { 品质: '金色', 类型: '防具', 阶位: '一阶' }, '一阶', 900).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '金色', 类型: '防具', 阶位: '一阶' }, '一阶', 901).ok).toBe(false);
    expect(checkPrice('equip', { 品质: '紫色', 类型: '饰品', 阶位: '三阶' }, '一阶', 45000).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '紫色', 类型: '饰品', 阶位: '三阶' }, '一阶', 45001).ok).toBe(false);
  });
  it('白/银拒绝', () => {
    expect(checkPrice('equip', { 品质: '白色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok).toBe(false);
    expect(checkPrice('equip', { 品质: '银色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok).toBe(false);
  });
  it('缺字段拒绝 / 缺阶位回退卖家阶位', () => {
    expect(checkPrice('equip', { 类型: '武器' }, '一阶', 100).ok).toBe(false);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器' }, '三阶', 1800).ok).toBe(true);
  });
  it('goods 自由出价+防刷', () => {
    expect(checkPrice('goods', { 数量: 5 }, '一阶', 15).ok).toBe(true);
    expect(checkPrice('goods', { 数量: 100 }, '一阶', 15).ok).toBe(false);
    expect(checkPrice('goods', { 数量: 5 }, '一阶', 10000000).ok).toBe(false);
  });
});

// ———— 六接口（假 KV 环境） ————
import worker from './worker.js';

function fakeKv() {
  const m = new Map();
  return {
    async get(k) { return m.has(k) ? m.get(k) : null; },
    async put(k, v) { m.set(k, String(v)); },
    async delete(k) { m.delete(k); },
    async list({ prefix, cursor } = {}) {
      const keys = [...m.keys()].filter(k => !prefix || k.startsWith(prefix)).sort().map(name => ({ name }));
      return { keys, list_complete: true, cursor: '' };
    },
  };
}

const env = () => ({ MARKET: fakeKv() });
const post = (path, body) =>
  new Request('https://test.local' + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
const get = path => new Request('https://test.local' + path);

const 蓝刀挂单 = {
  client: 'seller1', seller: '测试甲', tier: '二阶', kind: 'equip',
  item: { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶', 描述: '冒烟' },
  qty: 1, price: 600,
};

describe('worker 六接口', () => {
  it('list → listings → buy → mine/collect 全流程', async () => {
    const e = env();
    // 上架
    let res = await worker.fetch(post('/market/list', 蓝刀挂单), e);
    expect(res.status).toBe(200);
    const { id } = await res.json();
    expect(id).toBeTruthy();
    // 浏览
    res = await worker.fetch(get('/market/listings'), e);
    const { listings } = await res.json();
    expect(listings.some(l => l.id === id && l.item.名称 === '制式长刀')).toBe(true);
    // 自己买自己的单 → 403
    res = await worker.fetch(post('/market/buy', { id, buyer: '测试甲', client: 'seller1' }), e);
    expect(res.status).toBe(403);
    // 买家购买
    res = await worker.fetch(post('/market/buy', { id, buyer: '测试乙', client: 'buyer1' }), e);
    expect(res.status).toBe(200);
    // 重复购买 → 404（单已删）
    res = await worker.fetch(post('/market/buy', { id, buyer: '测试丙', client: 'buyer2' }), e);
    expect(res.status).toBe(404);
    // 卖家货款挂账
    res = await worker.fetch(get('/market/mine?client=seller1'), e);
    const mine = await res.json();
    expect(mine.pending).toBe(600);
    // 领取
    res = await worker.fetch(post('/market/collect', { client: 'seller1' }), e);
    const { gained } = await res.json();
    expect(gained).toBe(600);
    // 再领为 0
    res = await worker.fetch(post('/market/collect', { client: 'seller1' }), e);
    expect((await res.json()).gained).toBe(0);
  });

  it('超价挂单被拒并返回原因', async () => {
    const e = env();
    const res = await worker.fetch(post('/market/list', { ...蓝刀挂单, price: 900 }), e); // 蓝装上限 800
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('不得超过');
  });

  it('白装挂单被拒', async () => {
    const e = env();
    const res = await worker.fetch(
      post('/market/list', { ...蓝刀挂单, item: { 名称: '铁剑', 品质: '白色', 类型: '武器', 阶位: '一阶' }, price: 50 }),
      e,
    );
    expect(res.status).toBe(400);
  });

  it('cancel：只有卖家本人能下架', async () => {
    const e = env();
    let res = await worker.fetch(post('/market/list', 蓝刀挂单), e);
    const { id } = await res.json();
    res = await worker.fetch(post('/market/cancel', { id, client: 'someoneelse' }), e);
    expect(res.status).toBe(403);
    res = await worker.fetch(post('/market/cancel', { id, client: 'seller1' }), e);
    expect(res.status).toBe(200);
    // 市集里已没有这单
    res = await worker.fetch(get('/market/listings'), e);
    expect((await res.json()).listings.some(l => l.id === id)).toBe(false);
  });

  it('goods 自由出价能上架', async () => {
    const e = env();
    const res = await worker.fetch(
      post('/market/list', { client: 'seller1', seller: '测试甲', tier: '一阶', kind: 'goods', item: { 名称: '基础治疗药剂', 描述: '回血' }, qty: 5, price: 15 }),
      e,
    );
    expect(res.status).toBe(200);
  });

  it('未知路径 404', async () => {
    const res = await worker.fetch(get('/nope'), env());
    expect(res.status).toBe(404);
  });
});
