import { describe, expect, it } from 'vitest';
import { checkPrice } from './worker.js';
import worker from './worker.js';

// ================================================================
// 与前端 priceTable/equipRules 同规则的镜像测试 + 真实存档回归
// ================================================================

describe('worker checkPrice（与前端 priceTable 同规则镜像）', () => {
  it('蓝·武器·二阶 [400,800]，底价=基准下限', () => {
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 400).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 800).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 801).ok).toBe(false);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 399).ok).toBe(false);
  });
  it('金+50% / 紫+100%', () => {
    expect(checkPrice('equip', { 品质: '金色', 类型: '防具', 阶位: '一阶' }, '一阶', 250).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '金色', 类型: '防具', 阶位: '一阶' }, '一阶', 900).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '金色', 类型: '防具', 阶位: '一阶' }, '一阶', 901).ok).toBe(false);
    expect(checkPrice('equip', { 品质: '紫色', 类型: '饰品', 阶位: '三阶' }, '一阶', 10800).ok).toBe(true);
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
  it('goods [5,3000]×阶位²，物品阶位优先', () => {
    expect(checkPrice('goods', { 数量: 5, 阶位: '一阶' }, '一阶', 15).ok).toBe(true);
    expect(checkPrice('goods', { 数量: 5, 阶位: '一阶' }, '五阶', 3000).ok).toBe(true); // 物品一阶封顶3000
    expect(checkPrice('goods', { 数量: 5, 阶位: '一阶' }, '五阶', 3001).ok).toBe(false);
    expect(checkPrice('goods', { 数量: 5 }, '五阶', 50000).ok).toBe(true); // 无阶位按卖家五阶 [125,75000]
    expect(checkPrice('goods', { 数量: 5 }, '五阶', 80000).ok).toBe(false);
    expect(checkPrice('goods', { 数量: 5, 阶位: '一阶' }, '一阶', 4).ok).toBe(false);
    expect(checkPrice('goods', { 数量: 100 }, '一阶', 15).ok).toBe(false);
  });
});

// ———— 六接口（假 KV 环境） ————
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

/** 真实存档风格：夜翼披风（躯干_极轻·蓝色·一阶，基准防具蓝一阶 [50,150]） */
const 披风挂单 = {
  client: 'seller1', seller: '测试甲', tier: '一阶', kind: 'equip',
  item: {
    名称: '夜翼披风', 类型: '躯干_极轻', 品质: '蓝色', 阶位: '一阶', 穿戴门槛: 'AGI≥7',
    强化等级: 0, 伤害骰: '无', 倍率: 0, 主属性: 'AGI', 副属性: 'PER', 主属性加成: 0,
    副属性加成: 0, 装备防御: 0, 装备闪避: 2, 负重: 1,
    效果: { 夜幕隐匿: '微光环境下潜行判定+2。', 滞空滑翔: '坠落伤害减半。' },
    描述: '血族羽翼披肩', 数量: 1,
  },
  qty: 1, price: 100,
};

describe('worker 六接口 · 真实存档物品', () => {
  it('夜翼披风上架成功且服务器认定 kind=equip', async () => {
    const e = env();
    const res = await worker.fetch(post('/market/list', 披风挂单), e);
    expect(res.status).toBe(200);
    const { id } = await res.json();
    const browse = await (await worker.fetch(get('/market/listings'), e)).json();
    const l = browse.listings.find(x => x.id === id);
    expect(l).toBeTruthy();
    expect(l.kind).toBe('equip');
    expect(l.item.名称).toBe('夜翼披风');
  });

  it('防具蓝装一阶超价（>150）被拒', async () => {
    const e = env();
    const res = await worker.fetch(post('/market/list', { ...披风挂单, price: 200 }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('不得超过');
  });

  it('防具蓝装一阶低于基准下限（<50）被拒', async () => {
    const e = env();
    const res = await worker.fetch(post('/market/list', { ...披风挂单, price: 40 }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('低于');
  });

  it('效果条目 >3 被拒（铁律2条/破限器3条）', async () => {
    const e = env();
    const item = { ...披风挂单.item, 效果: { 一: 'a', 二: 'b', 三: 'c', 四: 'd' } };
    const res = await worker.fetch(post('/market/list', { ...披风挂单, item }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('效果条目');
  });

  it('主属性加成超基准被拒（蓝·防具·一阶基准0，容差2）', async () => {
    const e = env();
    const item = { ...披风挂单.item, 主属性加成: 5 };
    const res = await worker.fetch(post('/market/list', { ...披风挂单, item }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('主属性加成');
  });

  it('低阶装备含"必中"类强力关键词被拒', async () => {
    const e = env();
    const item = { ...披风挂单.item, 效果: { 必中打击: '攻击必定命中。', 滞空滑翔: '减伤。' } };
    const res = await worker.fetch(post('/market/list', { ...披风挂单, item }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('必中');
  });

  it('伪装防护：客户端传 kind=goods 的装备仍按装备定价', async () => {
    const e = env();
    // 夜翼披风传成 goods 并试图按道具区间挂 2500（防具蓝一阶上限只有 150）
    const res = await worker.fetch(post('/market/list', { ...披风挂单, kind: 'goods', price: 2500 }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('不得超过');
  });

  it('剥离属性字段伪装道具（品质+类型保留）仍按装备定价', async () => {
    const e = env();
    // 蓝武二阶上限 800；剥离全部属性字段后谎称道具挂 5000（道具区间二阶可到 12000）
    const res = await worker.fetch(post('/market/list', {
      client: 'seller1', seller: '测试甲', tier: '二阶', kind: 'goods',
      item: { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶' },
      qty: 1, price: 5000,
    }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('不得超过');
  });

  it('带装备字段但品质无法识别 → 拒绝', async () => {
    const e = env();
    const item = { ...披风挂单.item, 品质: '特殊' };
    const res = await worker.fetch(post('/market/list', { ...披风挂单, item, kind: 'goods' }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('品质');
  });

  it('消耗品（有品质无装备字段）走道具区间，服务器认定 kind=goods', async () => {
    const e = env();
    const res = await worker.fetch(post('/market/list', {
      client: 'seller1', seller: '测试甲', tier: '一阶', kind: 'equip', // 客户端谎称装备也没用
      item: { 名称: '圣水凝晶', 品质: '蓝色', 类型: '消耗品药剂', 阶位: '一阶', 描述: '恢复药剂', 数量: 10, 效果: { 纯净恢复: '回血。' } },
      qty: 10, price: 15,
    }), e);
    expect(res.status).toBe(200);
    const browse = await (await worker.fetch(get('/market/listings'), e)).json();
    expect(browse.listings[0].kind).toBe('goods');
  });

  it('buy/cancel/collect/mine 全流程', async () => {
    const e = env();
    let res = await worker.fetch(post('/market/list', 披风挂单), e);
    const { id } = await res.json();
    // 自己买自己 → 403
    res = await worker.fetch(post('/market/buy', { id, buyer: '测试甲', client: 'seller1' }), e);
    expect(res.status).toBe(403);
    // 买家购买
    res = await worker.fetch(post('/market/buy', { id, buyer: '测试乙', client: 'buyer1' }), e);
    expect(res.status).toBe(200);
    // 重复购买 → 404
    res = await worker.fetch(post('/market/buy', { id, buyer: '测试丙', client: 'buyer2' }), e);
    expect(res.status).toBe(404);
    // 卖家货款挂账 → 领取 → 再领 0
    res = await worker.fetch(get('/market/mine?client=seller1'), e);
    expect((await res.json()).pending).toBe(100);
    res = await worker.fetch(post('/market/collect', { client: 'seller1' }), e);
    expect((await res.json()).gained).toBe(100);
    res = await worker.fetch(post('/market/collect', { client: 'seller1' }), e);
    expect((await res.json()).gained).toBe(0);
  });

  it('cancel：只有卖家本人能下架', async () => {
    const e = env();
    let res = await worker.fetch(post('/market/list', 披风挂单), e);
    const { id } = await res.json();
    res = await worker.fetch(post('/market/cancel', { id, client: 'someoneelse' }), e);
    expect(res.status).toBe(403);
    res = await worker.fetch(post('/market/cancel', { id, client: 'seller1' }), e);
    expect(res.status).toBe(200);
    res = await worker.fetch(get('/market/listings'), e);
    expect((await res.json()).listings.some(l => l.id === id)).toBe(false);
  });

  it('未知路径 404', async () => {
    const res = await worker.fetch(get('/nope'), env());
    expect(res.status).toBe(404);
  });
});
