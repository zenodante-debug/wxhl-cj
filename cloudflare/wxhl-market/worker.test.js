import { describe, expect, it } from 'vitest';
import worker, { checkPrice } from './worker.js';
import { makeFakeD1 } from './fake-d1.mjs';

// ================================================================
// Worker 测试（与 smoke.mjs 同套断言，vitest 形态）
// 定价口径 2026-09-23：参考价 = 基准价 × 阶位²；允许区间 = [下限×50%, 上限×200%]
//   道具与武器同表（须填品质）；超模物品需带 op 声明方可上架
// ================================================================

const env = () => ({ MARKET_DB: makeFakeD1() });
const post = (p, b) =>
  new Request('https://t.local' + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const get = p => new Request('https://t.local' + p);

/** 真实存档：夜翼披风（蓝·防具·一阶 → 参考[50,150] → 允许[25,300]） */
const 披风 = {
  client: 'c1', seller: '测试甲', tier: '一阶', kind: 'equip',
  item: {
    名称: '夜翼披风', 类型: '躯干_极轻', 品质: '蓝色', 阶位: '一阶', 穿戴门槛: 'AGI≥7',
    强化等级: 0, 伤害骰: '无', 倍率: 0, 主属性: 'AGI', 副属性: 'PER', 主属性加成: 0,
    副属性加成: 0, 装备防御: 0, 装备闪避: 2, 负重: 1,
    效果: { 夜幕隐匿: '微光环境下潜行判定+2。', 滞空滑翔: '坠落伤害减半。' },
    描述: '血族羽翼披肩', 数量: 1,
  },
  qty: 1, price: 100,
};

describe('checkPrice · 与前端同规则', () => {
  it('蓝武二阶：参考[400,800] → 允许[200,1600]', () => {
    const w = { 品质: '蓝色', 类型: '武器', 阶位: '二阶' };
    expect(checkPrice('equip', w, '一阶', 200).ok).toBe(true);
    expect(checkPrice('equip', w, '一阶', 1600).ok).toBe(true);
    expect(checkPrice('equip', w, '一阶', 199).ok).toBe(false);
    expect(checkPrice('equip', w, '一阶', 1601).ok).toBe(false);
  });
  it('白装拒绝（回廊不收录）', () => {
    expect(checkPrice('equip', { 品质: '白色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok).toBe(false);
  });
  // 银色 2026-09-23 放开：基准 = 同表紫色 × 10
  it('银武一阶：参考[15000,30000] → 允许[7500,60000]', () => {
    const w = { 品质: '银色', 类型: '武器', 阶位: '一阶' };
    expect(checkPrice('equip', w, '一阶', 7500).ok).toBe(true);
    expect(checkPrice('equip', w, '一阶', 60000).ok).toBe(true);
    expect(checkPrice('equip', w, '一阶', 7499).ok).toBe(false);
    expect(checkPrice('equip', w, '一阶', 60001).ok).toBe(false);
  });
  it('银防具 [5000,40000] / 银饰品 [6000,50000]', () => {
    expect(checkPrice('equip', { 品质: '银色', 类型: '防具', 阶位: '一阶' }, '一阶', 5000).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '银色', 类型: '防具', 阶位: '一阶' }, '一阶', 40000).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '银色', 类型: '饰品', 阶位: '一阶' }, '一阶', 6000).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '银色', 类型: '饰品', 阶位: '一阶' }, '一阶', 50000).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '银色', 类型: '饰品', 阶位: '一阶' }, '一阶', 5999).ok).toBe(false);
  });
  it('道具与武器同表：蓝品质一阶 = [50,400]', () => {
    expect(checkPrice('goods', { 品质: '蓝色', 数量: 5, 阶位: '一阶' }, '一阶', 50).ok).toBe(true);
    expect(checkPrice('goods', { 品质: '蓝色', 数量: 5, 阶位: '一阶' }, '一阶', 400).ok).toBe(true);
    expect(checkPrice('goods', { 品质: '蓝色', 数量: 5, 阶位: '一阶' }, '一阶', 15).ok).toBe(false);
  });
  it('道具缺品质/品质不可识别 → 拒绝（要求补全）；银色已放行', () => {
    expect(checkPrice('goods', { 数量: 5, 阶位: '一阶' }, '一阶', 100).ok).toBe(false);
    expect(checkPrice('goods', { 品质: '特殊', 数量: 5, 阶位: '一阶' }, '一阶', 100).ok).toBe(false);
    expect(checkPrice('goods', { 品质: '银色', 数量: 5, 阶位: '一阶' }, '一阶', 7500).ok).toBe(true);
    expect(checkPrice('goods', { 品质: '银色', 数量: 5, 阶位: '一阶' }, '一阶', 7499).ok).toBe(false);
  });
  it('白品质道具一阶 = [15,120]（弹药等便宜消耗品）', () => {
    const ammo = { 品质: '白色', 数量: 50, 阶位: '一阶' };
    expect(checkPrice('goods', ammo, '一阶', 15).ok).toBe(true);
    expect(checkPrice('goods', ammo, '一阶', 120).ok).toBe(true);
    expect(checkPrice('goods', ammo, '一阶', 14).ok).toBe(false);
  });
});

describe('market/list · 上架与拒绝', () => {
  it('真实装备 100 UP 上架成功，服务器认定 kind=equip', async () => {
    const e = env();
    const res = await worker.fetch(post('/market/list', 披风), e);
    expect(res.status).toBe(200);
    const { id } = await res.json();
    const browse = await (await worker.fetch(get('/market/listings'), e)).json();
    const l = browse.listings.find(x => x.id === id);
    expect(l.kind).toBe('equip');
    expect(l.item.效果.夜幕隐匿).toBeDefined();
    expect(l.client).toBeUndefined(); // 不下发房主标识
  });

  it('价格边界：25/300 可挂，24/301 拒', async () => {
    const e = env();
    const probe = { ...披风, client: 'cProbe' };
    expect((await worker.fetch(post('/market/list', { ...probe, price: 25 }), e)).status).toBe(200);
    expect((await worker.fetch(post('/market/list', { ...probe, price: 300 }), e)).status).toBe(200);
    expect((await worker.fetch(post('/market/list', { ...probe, price: 24 }), e)).status).toBe(400);
    const res = await worker.fetch(post('/market/list', { ...probe, price: 301 }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('200%');
  });

  it('效果>3条 → 拒（结构问题，op 也不能放行）', async () => {
    const e = env();
    const item = { ...披风.item, 效果: { a: '1', b: '2', c: '3', d: '4' } };
    expect((await worker.fetch(post('/market/list', { ...披风, item }), e)).status).toBe(400);
    expect((await worker.fetch(post('/market/list', { ...披风, item, op: { tier: '超脱', rp: 1, up: 1 } }), e)).status).toBe(400);
  });

  it('数值超模：未声明 op → 拒并提示超模费；声明 op → 放行且落库', async () => {
    const e = env();
    const item = { ...披风.item, 主属性加成: 20 }; // 蓝·防具·一阶基准 0，容差 2 → 超模
    const res = await worker.fetch(post('/market/list', { ...披风, client: 'cOp', item }), e);
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('超模');

    const ok = await worker.fetch(
      post('/market/list', { ...披风, client: 'cOp', item, op: { tier: '超脱', rp: 2250, up: 2250000 } }),
      e,
    );
    expect(ok.status).toBe(200);
    const { id } = await ok.json();
    const browse = await (await worker.fetch(get('/market/listings'), e)).json();
    expect(browse.listings.find(x => x.id === id).op).toEqual({ tier: '超脱', rp: 2250, up: 2250000 });
  });

  it('op 字段非法 → 拒', async () => {
    const e = env();
    expect((await worker.fetch(post('/market/list', { ...披风, op: { tier: '不存在', rp: 1, up: 1 } }), e)).status).toBe(400);
    expect((await worker.fetch(post('/market/list', { ...披风, op: { tier: '超脱', rp: -1, up: 1 } }), e)).status).toBe(400);
  });

  it('防伪装：kind 由服务器按物品字段认定', async () => {
    const e = env();
    // 装备谎称道具并按道具区间挂高价
    expect((await worker.fetch(post('/market/list', { ...披风, kind: 'goods', price: 2500 }), e)).status).toBe(400);
    // 剥离属性字段、只留品质+类型 → 仍按装备定价
    const stripped = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶' };
    expect((await worker.fetch(post('/market/list', { ...披风, kind: 'goods', tier: '二阶', item: stripped, price: 5000 }), e)).status).toBe(400);
  });

  it('带装备字段但品质不可识别 → 拒', async () => {
    const e = env();
    const item = { ...披风.item, 品质: '特殊' };
    expect((await worker.fetch(post('/market/list', { ...披风, item, kind: 'goods' }), e)).status).toBe(400);
  });

  it('道具：白品质弹药可挂、缺品质被拒', async () => {
    const e = env();
    const ammo = {
      client: 'c9', seller: '测试甲', tier: '一阶', kind: 'goods',
      item: { 名称: '穿甲弹药', 类型: '弹药', 品质: '白色', 阶位: '一阶', 描述: '20发一组', 数量: 50 },
      qty: 50, price: 15,
    };
    const ok = await worker.fetch(post('/market/list', ammo), e);
    expect(ok.status).toBe(200);
    const noQ = await worker.fetch(
      post('/market/list', { ...ammo, item: { 名称: '神秘材料', 阶位: '一阶', 数量: 3 } }),
      e,
    );
    expect(noQ.status).toBe(400);
    expect(await noQ.text()).toContain('品质');
  });

  // ———— 银色 2026-09-23 放开售卖准入（全链路：上架 → 落库） ————
  const 银武 = {
    client: 'cSilver', seller: '圣殿', tier: '一阶', kind: 'equip',
    item: {
      名称: '圣裁之刃', 类型: '武器', 品质: '银色', 阶位: '一阶', 数量: 1,
      伤害骰: '2d20', 倍率: 2, 主属性: 'STR', 副属性: 'AGI', 主属性加成: 3, 副属性加成: 1,
      装备防御: 0, 装备闪避: 0, 负重: 3, 强化等级: 0, 穿戴门槛: 'STR≥10',
      效果: { 圣裁: '对黑暗属性目标伤害提升。', 断罪: '暴击时附加圣焰。' },
      描述: '副本唯一的银装核心',
    },
    qty: 1, price: 10000,
  };

  it('银装可上架（紫×10 区间 [7500,60000] 内）', async () => {
    const e = env();
    const res = await worker.fetch(post('/market/list', 银武), e);
    expect(res.status, await res.clone().text()).toBe(200);
    const { id } = await res.json();
    const browse = await (await worker.fetch(get('/market/listings'), e)).json();
    const l = browse.listings.find(x => x.id === id);
    expect(l.kind).toBe('equip');
    expect(l.item.品质).toBe('银色');
  });

  it('银装低于下限被拒（7499），按紫装价（3000）更是被拒', async () => {
    const e = env();
    expect((await worker.fetch(post('/market/list', { ...银武, client: 'cS2', price: 7499 }), e)).status).toBe(400);
    expect((await worker.fetch(post('/market/list', { ...银武, client: 'cS3', price: 3000 }), e)).status).toBe(400);
  });

  it('银色道具可上架（走武器表同价）', async () => {
    const e = env();
    const 银道具 = {
      client: 'cS4', seller: '圣殿', tier: '一阶', kind: 'goods',
      item: { 名称: '圣水原液', 品质: '银色', 阶位: '一阶', 描述: '副本唯一', 数量: 1 },
      qty: 1, price: 8000,
    };
    expect((await worker.fetch(post('/market/list', 银道具), e)).status).toBe(200);
    expect((await worker.fetch(post('/market/list', { ...银道具, client: 'cS5', price: 7499 }), e)).status).toBe(400);
  });
});

describe('market · 购买/出售记录/货款/下架', () => {
  it('购买写出售记录（含买家名），卖家挂账总价', async () => {
    const e = env();
    const { id } = await (await worker.fetch(post('/market/list', 披风), e)).json();
    expect((await worker.fetch(post('/market/buy', { id, buyer: '测试甲', client: 'c1' }), e)).status).toBe(403); // 自买
    expect((await worker.fetch(post('/market/buy', { id, buyer: '测试乙', client: 'c2' }), e)).status).toBe(200);
    expect((await worker.fetch(post('/market/buy', { id, buyer: '测试丙', client: 'c3' }), e)).status).toBe(404); // 已售

    const mine = await (await worker.fetch(get('/market/mine?client=c1'), e)).json();
    expect(mine.pending).toBe(100);
    expect(mine.listings.length).toBe(0);

    const sold = await (await worker.fetch(get('/market/sales?client=c1'), e)).json();
    expect(sold.sales.length).toBe(1);
    expect(sold.sales[0].buyer).toBe('测试乙');
    expect(sold.sales[0].item.名称).toBe('夜翼披风');
    expect(sold.sales[0].qty).toBe(1);
    expect(sold.sales[0].price).toBe(100);

    // 领取后清零，再领为 0
    expect((await (await worker.fetch(post('/market/collect', { client: 'c1' }), e)).json()).gained).toBe(100);
    expect((await (await worker.fetch(post('/market/collect', { client: 'c1' }), e)).json()).gained).toBe(0);
  });

  it('多件整组：单价 × 数量 = 货款', async () => {
    const e = env();
    const { id } = await (
      await worker.fetch(
        post('/market/list', {
          client: 'c9', seller: '测试甲', tier: '一阶', kind: 'goods',
          item: { 名称: '穿甲弹药', 品质: '白色', 阶位: '一阶', 数量: 50, 描述: 'x' },
          qty: 50, price: 20,
        }),
        e,
      )
    ).json();
    expect((await worker.fetch(post('/market/buy', { id, buyer: '测试乙', client: 'c2' }), e)).status).toBe(200);
    expect((await (await worker.fetch(get('/market/mine?client=c9'), e)).json()).pending).toBe(1000);
  });

  it('下架：只有卖家本人能下架', async () => {
    const e = env();
    const { id } = await (await worker.fetch(post('/market/list', 披风), e)).json();
    expect((await worker.fetch(post('/market/cancel', { id, client: '别人' }), e)).status).toBe(403);
    expect((await worker.fetch(post('/market/cancel', { id, client: 'c1' }), e)).status).toBe(200);
    const browse = await (await worker.fetch(get('/market/listings'), e)).json();
    expect(browse.listings.some(l => l.id === id)).toBe(false);
  });
});

describe('market · 运营通道（0 UP 福利）', () => {
  const 福利券 = {
    client: 'welfare', seller: '无由回廊', tier: '一阶', kind: 'goods',
    item: { 名称: '十倍界王拳体验卡', 品质: '白色', 阶位: '一阶', 数量: 1, 描述: '福利卡' },
    qty: 1, price: 0,
  };
  it('无密钥/密钥错误 → 拒；密钥正确 → 放行', async () => {
    const e = env();
    const eKey = { MARKET_DB: e.MARKET_DB, WELFARE_KEY: 'secret' };
    expect((await worker.fetch(post('/market/list', 福利券), e)).status).toBe(400);
    expect((await worker.fetch(post('/market/list', { ...福利券, opsKey: 'wrong' }), eKey)).status).toBe(400);
    const ok = await worker.fetch(post('/market/list', { ...福利券, opsKey: 'secret' }), eKey);
    expect(ok.status).toBe(200);
    const { id } = await ok.json();
    expect((await worker.fetch(post('/market/buy', { id, buyer: '测试乙', client: 'c2' }), e)).status).toBe(200);
    expect((await (await worker.fetch(get('/market/mine?client=welfare'), e)).json()).pending).toBe(0); // 0 元单无货款
  });
  it('未配置 WELFARE_KEY 时，带 opsKey 也拒', async () => {
    const e = env();
    expect((await worker.fetch(post('/market/list', { ...福利券, opsKey: 'secret' }), e)).status).toBe(400);
  });
});

describe('market · 其它', () => {
  it('未知路径 404', async () => {
    expect((await worker.fetch(get('/nope'), env())).status).toBe(404);
  });
  it('服务端筛选 category/tier/quality/limit', async () => {
    const e = env();
    await worker.fetch(post('/market/list', 披风), e);
    expect((await (await worker.fetch(get('/market/listings?category=防具&tier=0&quality=蓝色'), e)).json()).listings.length).toBe(1);
    expect((await (await worker.fetch(get('/market/listings?category=武器'), e)).json()).listings.length).toBe(0);
    expect((await (await worker.fetch(get('/market/listings?limit=1'), e)).json()).listings.length).toBe(1);
  });
});
