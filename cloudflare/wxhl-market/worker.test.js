import { describe, expect, it } from 'vitest';
import worker, { checkPrice, 应领 } from './worker.js';
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

// ================================================================
// 工坊订单（v4a 第一段）：发布 / 大厅 / 原子接单
// 服务器只中转飞行中订单，交付验收与领取留给后续任务。
// 本文件顶部已 import worker / makeFakeD1，这里不重复 import。
// ================================================================

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

  // M-2：poster 建单时已 trim 落库，exclude 不 trim 的话「 甲 」≠「甲」会把自己的单漏进大厅
  it('大厅 exclude 会 trim：带空白的姓名不把自己的单漏进大厅', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    const hall = await (await call(env, '/order/list?exclude=' + encodeURIComponent(' 甲 '))).json();
    expect(hall.orders.some(o => o.id === id)).toBe(false);
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
    expect(mine.claim.items[0].item.名称).toBe('狼牙短剑');   // 发单人待领成品

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
    expect(makerMine.claim.items[0].item.名称).toBe('剑');   // 退回的成品
    expect(makerMine.claim.deposit).toBe(300);      // 订金仍是接单者的（未领则仍待领）——「不退」指发单人拿不回去

    const posterMine = await (await call(env, `/order/mine?who=${encodeURIComponent('甲')}`)).json();
    expect(posterMine.claim.deposit).toBe(0);       // 发单人永远拿不回订金
    expect(posterMine.claim.final).toBe(0);         // 退货不付尾款
    expect(posterMine.claim.items).toHaveLength(0);       // 成品已退回，发单人不再持有
  });
});

// ———— 订单领取的公共小工具（ACK 用例共用）————
/** 走完整链路：发布 → 接单 → 交付 → 验收，停在「已完成」（终态）；返回订单 id */
async function 到已完成(env, item = { 名称: '剑', 数量: 1 }, over = {}) {
  const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700, ...over }))).json();
  await call(env, '/order/accept', postJson({ id, maker: '乙' }));
  await call(env, '/order/deliver', postJson({ id, maker: '乙', item }));
  await call(env, '/order/confirm', postJson({ id, poster: '甲' }));
  return id;
}
/** 按项领取：Ruling I 起 body 带 `项`（订金 / 尾款 / 成品） */
const 领 = (env, id, who, side, 项) => call(env, '/order/ack', postJson({ id, who, side, 项 }));
/** 直接数行：删行与否的最终判据 */
const 行数 = async (env, id) =>
  (await env.MARKET_DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).all()).results.length;
/** 取某人的待领取汇总 */
const 待领 = async (env, who) => (await call(env, `/order/mine?who=${encodeURIComponent(who)}`)).json();

describe('订单 · 待领取与 ACK（Review Focus 3/4）', () => {
  it('双方 ACK 后 orders 表无该行', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    // 必须是**终态**才谈得上删行：走到「已完成」，三项应领（接单者订金/尾款、发单人成品）才齐全。
    const id = await 到已完成(env);

    const a1 = await (await 领(env, id, '甲', 'poster', '成品')).json();
    expect(a1.deleted).toBe(false);                 // 只领了一项，行还在
    const a2 = await (await 领(env, id, '乙', 'maker', '订金')).json();
    expect(a2.deleted).toBe(false);                 // 尾款还没领，仍不删
    const a3 = await (await 领(env, id, '乙', 'maker', '尾款')).json();
    expect(a3.deleted).toBe(true);                  // 应领项全齐 → 删行

    expect(await 行数(env, id)).toBe(0);
  });

  it('未接单的单没有 maker 当事人：按 maker 侧 ACK 必须 400 且不删行（Ruling G 回归）', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    const r = await 领(env, id, '乙', 'maker', '订金');
    expect(r.status).toBe(400);
    // 拦在**当事人校验**上，而不是恰好被 payload 校验（side/项 错配）顺手挡掉 —— 否则这条回归用例是假绿的
    expect(await r.text()).toContain('当事人');
    // 放行会让第三方把这单删掉：订金已在发单人客户端扣掉，却没有接单人 gainUP 补上 → 钱凭空消失
    expect(await 行数(env, id)).toBe(1);
  });

  it('重复领取是幂等的：ACK 两次不报错，且不会让行消失两次', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const id = await 到已完成(env);
    expect((await 领(env, id, '甲', 'poster', '成品')).status).toBe(200);
    const again = await (await 领(env, id, '甲', 'poster', '成品')).json();
    expect(again.deleted).toBe(false);              // 同一项再领一次只是把 1 再写一遍，行不该消失
    await 领(env, id, '乙', 'maker', '订金');
    expect((await (await 领(env, id, '乙', 'maker', '尾款')).json()).deleted).toBe(true);

    // 行已被删：再 ACK 不该报错（幂等），也不该把它「删第二次」
    const 死后 = await 领(env, id, '乙', 'maker', '尾款');
    expect(死后.status).toBe(200);
    expect((await 死后.json()).deleted).toBe(true); // 当作已领完
    expect(await 行数(env, id)).toBe(0);
  });

  // ———— I-1：first 标志（双开标签页的双发闸） ————
  // 两个标签页共享同一存档、读到同一份待领清单：UPDATE 带 `AND <列>=0`，只有真正把
  // 0 翻成 1 的那次回 first:true；客户端只为 first=true 的条目入账，否则两页各入一次＝双发钱。
  it('first 标志：首次 ACK first=true、重复 first=false，且重复不妨碍后续流程删行', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const id = await 到已完成(env);

    const a1 = await (await 领(env, id, '甲', 'poster', '成品')).json();
    expect(a1.first).toBe(true);                    // 首次：位 0→1
    const a2 = await (await 领(env, id, '甲', 'poster', '成品')).json();
    expect(a2.first).toBe(false);                   // 重复：位已是 1，UPDATE 改 0 行
    expect(a2.deleted).toBe(false);                 // 行仍在（乙两项未领）

    await 领(env, id, '乙', 'maker', '订金');
    const a3 = await (await 领(env, id, '乙', 'maker', '尾款')).json();
    expect(a3.first).toBe(true);
    expect(a3.deleted).toBe(true);                  // 应领项全齐 → 删行（中间夹过一次重复 ACK也不妨碍）
    expect(await 行数(env, id)).toBe(0);
  });

  it('行已被删后的幂等 ACK 回 first=false（权益早被领走，本次只是补回执）', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const id = await 到已完成(env);
    await 领(env, id, '甲', 'poster', '成品');
    await 领(env, id, '乙', 'maker', '订金');
    await 领(env, id, '乙', 'maker', '尾款');
    const 死后 = await (await 领(env, id, '乙', 'maker', '尾款')).json();
    expect(死后.ok).toBe(true);
    expect(死后.deleted).toBe(true);
    expect(死后.first).toBe(false);
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

// ================================================================
// Ruling I：ACK 按项。
// 旧设计是**每侧一个位管终身**，各项 claim 全门控在「该侧尚未 ACK」——
// 接单者权益却分阶段产生（订金在接单、尾款在验收、退回成品在退货），
// 故领了订金就永久领不到尾款/退回成品，而对方 ACK 后行被删 → 钱凭空蒸发。
// 下列用例是这条裁定的反证：旧设计下它们必然红。
// ================================================================
describe('订单 · 按项领取（Ruling I）', () => {
  it('接单时领走订金，验收完成仍能领到尾款（单一位设计下这一步领不到）', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));

    // 接单当下就领走订金 —— 这一步在旧设计里会把「接单者已领」那个位永久置 1
    const d = await (await 领(env, id, '乙', 'maker', '订金')).json();
    expect(d.deleted).toBe(false);                  // 已接单但非终态：不删
    expect((await 待领(env, '乙')).claim.deposit).toBe(0);

    // 交付 → 验收：尾款**此时才产生**
    await call(env, '/order/deliver', postJson({ id, maker: '乙', item: { 名称: '剑', 数量: 1 } }));
    expect((await call(env, '/order/confirm', postJson({ id, poster: '甲' }))).status).toBe(200);

    const mine = await 待领(env, '乙');
    expect(mine.asMaker[0].status).toBe('已完成');
    expect(mine.claim.final).toBe(700);             // ← 回归点：领过订金也必须看得见尾款

    expect((await (await 领(env, id, '乙', 'maker', '尾款')).json()).deleted).toBe(false); // 发单人未领成品
    expect((await 待领(env, '乙')).claim.final).toBe(0);
    expect((await (await 领(env, id, '甲', 'poster', '成品')).json()).deleted).toBe(true);
    expect(await 行数(env, id)).toBe(0);
  });

  it('退货（已取消）后接单者能领回退回的成品（与尾款共用一位，不互相锁死）', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));
    await 领(env, id, '乙', 'maker', '订金');        // 先领订金：旧设计里退回的成品从此就领不到了
    await call(env, '/order/deliver', postJson({ id, maker: '乙', item: { 名称: '剑', 数量: 1 } }));
    await call(env, '/order/reject', postJson({ id, poster: '甲' }));

    const mine = await 待领(env, '乙');
    expect(mine.asMaker[0].status).toBe('已取消');
    expect(mine.claim.items).toHaveLength(1);
    expect(mine.claim.items[0].id).toBe(id);        // 待领项带订单 id，客户端才知道该 ACK 哪张单
    expect(mine.claim.items[0].item.名称).toBe('剑');
    expect(mine.claim.final).toBe(0);               // 退货不付尾款

    const r = await (await 领(env, id, '乙', 'maker', '尾款')).json(); // 退回的成品走「尾款」位
    expect(r.deleted).toBe(true);                   // 已取消的应领项＝订金＋退回成品，都领完了
    expect(await 行数(env, id)).toBe(0);
  });

  it('非终态的单，双方领完当下应领项也不删行（后续还会产生尾款）', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));
    expect((await (await 领(env, id, '乙', 'maker', '订金')).json()).deleted).toBe(false);
    await call(env, '/order/deliver', postJson({ id, maker: '乙', item: { 名称: '剑', 数量: 1 } }));

    // 此刻双方手上能领的都领了（接单者订金、发单人成品），但状态是「已交付」——
    // 旧设计（双方各领一侧即删）会在这里删行，随后验收产生的尾款就没了着落。
    expect((await (await 领(env, id, '甲', 'poster', '成品')).json()).deleted).toBe(false);
    expect(await 行数(env, id)).toBe(1);

    await call(env, '/order/confirm', postJson({ id, poster: '甲' }));
    expect((await 待领(env, '乙')).claim.final).toBe(700);   // 行还在 → 尾款领得到
  });

  it('side / 项 非法（缺席、大小写错、错配）→ 400，且不误置任何位', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));

    expect((await call(env, '/order/ack', postJson({ id, who: '乙', 项: '订金' }))).status).toBe(400);                 // side 缺席
    expect((await call(env, '/order/ack', postJson({ id, who: '乙', side: 'Maker', 项: '订金' }))).status).toBe(400);  // 大小写错
    expect((await call(env, '/order/ack', postJson({ id, who: '乙', side: 'maker' }))).status).toBe(400);              // 项 缺席
    expect((await call(env, '/order/ack', postJson({ id, who: '乙', side: 'maker', 项: '成品' }))).status).toBe(400);   // maker 领 成品
    expect((await call(env, '/order/ack', postJson({ id, who: '甲', side: 'poster', 项: '订金' }))).status).toBe(400);  // poster 领 订金

    // 当事人校验对两侧对称：发单人也不能冒名把接单者的权益位置上
    const 冒名 = await 领(env, id, '乙', 'poster', '成品');
    expect(冒名.status).toBe(400);
    expect(await 冒名.text()).toContain('当事人');

    const { results } = await env.MARKET_DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).all();
    expect(results[0].poster_ack).toBe(0);          // 旧代码会把缺席的 side 静默当 poster 并置位
    expect(results[0].maker_deposit_ack).toBe(0);
    expect(results[0].maker_final_ack).toBe(0);
  });

  it('应领为空集的终态行（v4b 弃单）即使双方都 ACK，也滞留不删（滞留可救、丢失不可救）', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));
    // v4a 没有弃单路由：这里用 worker 自己的推进语句（与 confirm/reject 同形）把行推到 v4b 的终态。
    // 目的只有一个 —— 构造出「终态 且 应领(行) 为空集」这一行，钉住删行的兜底守卫。
    await env.MARKET_DB.prepare(`UPDATE orders SET status = ?, updated = ? WHERE id = ? AND status = ?`)
      .bind('已弃单', Date.now(), id, '已接单').run();
    expect(应领({ status: '已弃单', maker: '乙' })).toEqual([]);      // 前提：应领真是空集

    // 双方各领一项：`.every()` 对空集空真 → 若没有 length>0 守卫，这里会把行静默删掉，
    // 而 v4b 的弃单赔偿还没定口径 —— 那笔钱就凭空没了着落。
    expect((await (await 领(env, id, '乙', 'maker', '订金')).json()).deleted).toBe(false);
    expect((await (await 领(env, id, '甲', 'poster', '成品')).json()).deleted).toBe(false);
    expect(await 行数(env, id)).toBe(1);                            // 宁可滞留（v4c 的 purge 兜底）
  });

  it('应领(行)：只认终态，非终态一项都不算（删行判据的数据源）', () => {
    const 行 = (status, maker = '乙') => ({ status, maker });
    expect(应领(行('待接单', null))).toEqual(['poster']);        // 撤销/无人接：只有发单人有权领回
    expect(应领(行('已取消', null))).toEqual(['poster']);
    expect(应领(行('已完成'))).toEqual(['maker_deposit', 'maker_final', 'poster']);
    expect(应领(行('已取消'))).toEqual(['maker_deposit', 'maker_final']);
    expect(应领(行('已弃单'))).toEqual([]);                      // v4b 才有弃单赔偿口径
    for (const s of ['待接单', '已接单', '已交付']) expect(应领(行(s))).toEqual([]);  // 非终态：不删行
  });
});

// ================================================================
// Ruling L：`claim` 必须给出**显式待领清单** `待领: [{ id, 项 }]`。
// 只有汇总数字是不够的：ACK 是逐单逐项的，客户端从若干张单的「和」里反推不出该对哪张单的哪一项发 ACK；
// 图省事把每张单的每一项都 ACK 一遍，就会提前置位尚不存在的权益（「已接单」就 ACK 尾款 →
// `maker_final_ack=1` → 真走到「已完成」时尾款永远领不到）—— 即 Ruling I 那一类漏洞的入口。
// ================================================================
describe('订单 · 待领清单（Ruling L）', () => {
  /** 该单在该用户待领清单里的项，按顺序（入参是 `/order/mine` 的整个响应体） */
  const 项集 = (mine, id) => mine.claim.待领.filter(e => e.id === id).map(e => e.项);

  it('接单后只列「订金」；领掉订金并验收后才列出「尾款」', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));

    // 还没完成：**只能**领订金。清单里若出现「尾款」，客户端照 ACK 就会把尾款位提前置 1（永久锁死）
    expect(项集(await 待领(env, '乙'), id)).toEqual(['订金']);
    expect((await 待领(env, '乙')).claim.final).toBe(0);

    await 领(env, id, '乙', 'maker', '订金');
    await call(env, '/order/deliver', postJson({ id, maker: '乙', item: { 名称: '剑', 数量: 1 } }));
    await call(env, '/order/confirm', postJson({ id, poster: '甲' }));

    // 同单同 id：订金已领 → 不再列；尾款此时才列
    expect(项集(await 待领(env, '乙'), id)).toEqual(['尾款']);
    expect((await 待领(env, '乙')).claim.final).toBe(700);
  });

  it('汇总与清单同源：逐单对应，不是只看总数（a 领掉后 b 仍在）', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const a = (await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json()).id;
    const b = (await (await call(env, '/order/create', postJson({ poster: '丙', spec: 需求单, deposit: 200, final: 100 }))).json()).id;
    await call(env, '/order/accept', postJson({ id: a, maker: '乙' }));
    await call(env, '/order/accept', postJson({ id: b, maker: '乙' }));

    let mine = await 待领(env, '乙');
    expect(mine.claim.deposit).toBe(500);                       // 300 + 200：两条都在清单里，总数才对得上
    expect(项集(mine, a)).toEqual(['订金']);
    expect(项集(mine, b)).toEqual(['订金']);

    await 领(env, a, '乙', 'maker', '订金');
    mine = await 待领(env, '乙');
    expect(mine.claim.deposit).toBe(200);                       // 只剩 b
    expect(项集(mine, a)).toEqual([]);                          // a：钱没了，条目也同步没了
    expect(项集(mine, b)).toEqual(['订金']);
  });

  it('成品也进清单：发单人「成品」；退货后接单者的「尾款」条目给的是**物**不是钱', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const { id } = await (await call(env, '/order/create', postJson({ poster: '甲', spec: 需求单, deposit: 300, final: 700 }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));
    await call(env, '/order/deliver', postJson({ id, maker: '乙', item: { 名称: '剑', 数量: 1 } }));

    // 已交付：发单人列「成品」，且与 `items` 同源（同一条 = 同一个 id）
    const poster = await 待领(env, '甲');
    expect(项集(poster, id)).toEqual(['成品']);
    expect(poster.claim.items.map(e => e.id)).toEqual([id]);
    expect(项集(await 待领(env, '乙'), id)).toEqual(['订金']);   // 接单者此时只有订金可领

    await call(env, '/order/reject', postJson({ id, poster: '甲' }));
    // 已取消：发单人两手空空；接单者拿退回的成品 —— 走**同一个** `maker_final` 位，故 项 也叫「尾款」
    expect(项集(await 待领(env, '甲'), id)).toEqual([]);
    const maker = await 待领(env, '乙');
    expect(项集(maker, id)).toEqual(['订金', '尾款']);
    expect(maker.claim.final).toBe(0);              // 但这一条给的是物：`final` 汇总（钱）不该被它撑大
    expect(maker.claim.items.map(e => e.id)).toEqual([id]);
  });
});

// ================================================================
// Ruling M：`待领` 条目必须带**逐项金额**。
// 客户端「先回执、后入账，只为回执成功的条目入账」——若 ACK 失败而钱已入账，服务器下次仍列出该项，
// 只有条目自带金额才能让客户端认出「这项我已经发过了」并跳过；否则每次刷新再发一遍 → 无限刷钱。
// ================================================================
describe('订单 · 待领逐项金额（Ruling M）', () => {
  /** 汇总恒等式的右边：按 项 过滤后求和（`只要正数` 用于尾款——金额 0 的是退回的成品，不算钱） */
  const 金额和 = (mine, 项, 只要正数 = false) =>
    mine.claim.待领.filter(e => e.项 === 项 && (!只要正数 || e.金额 > 0)).reduce((s, e) => s + e.金额, 0);
  const 条目 = (mine, id) => mine.claim.待领.filter(e => e.id === id);

  /** 建单 → 接单，返回 id（其余状态由用例自己推进） */
  async function 建单接单(env, poster, deposit, final) {
    const { id } = await (await call(env, '/order/create', postJson({ poster, spec: 需求单, deposit, final }))).json();
    await call(env, '/order/accept', postJson({ id, maker: '乙' }));
    return id;
  }

  it('逐项金额口径：订金=deposit、尾款（钱）=final、成品与退回的成品=0', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const id = await 建单接单(env, '甲', 300, 700);

    expect(条目(await 待领(env, '乙'), id)).toEqual([{ id, 项: '订金', 金额: 300 }]);

    await call(env, '/order/deliver', postJson({ id, maker: '乙', item: { 名称: '剑', 数量: 1 } }));
    expect(条目(await 待领(env, '甲'), id)).toEqual([{ id, 项: '成品', 金额: 0 }]);   // 物：金额 0

    await call(env, '/order/confirm', postJson({ id, poster: '甲' }));
    expect(条目(await 待领(env, '乙'), id)).toEqual([
      { id, 项: '订金', 金额: 300 },                  // 还没领，照旧列出并带自己的金额
      { id, 项: '尾款', 金额: 700 },
    ]);

    // 退回的成品：同一个「尾款」项，但金额 0（客户端据此知道这条给的是物、不入账）
    const env2 = { MARKET_DB: makeFakeD1() };
    const id2 = await 建单接单(env2, '甲', 300, 700);
    await call(env2, '/order/deliver', postJson({ id: id2, maker: '乙', item: { 名称: '剑', 数量: 1 } }));
    await call(env2, '/order/reject', postJson({ id: id2, poster: '甲' }));
    expect(条目(await 待领(env2, '乙'), id2)).toEqual([
      { id: id2, 项: '订金', 金额: 300 },
      { id: id2, 项: '尾款', 金额: 0 },
    ]);
  });

  it('恒等式：deposit ≡ Σ(订金条目金额)，final ≡ Σ(金额>0 的尾款条目)，且与逐单状态同步', async () => {
    const env = { MARKET_DB: makeFakeD1() };
    const a = await 建单接单(env, '甲', 300, 700);
    const b = await 建单接单(env, '丙', 200, 100);   // 这单会走退货
    const c = await 建单接单(env, '丁', 400, 600);   // 这单只领订金

    // 三单都在：deposit = 300 + 200 + 400，且恰等于订金条目金额之和
    let mine = await 待领(env, '乙');
    expect(mine.claim.deposit).toBe(900);
    expect(mine.claim.deposit).toBe(金额和(mine, '订金'));
    expect(mine.claim.待领.filter(e => e.项 === '订金')).toHaveLength(3);

    await 领(env, a, '乙', 'maker', '订金');          // a 的订金领掉 → 金额与条目同步消失
    mine = await 待领(env, '乙');
    expect(mine.claim.deposit).toBe(600);
    expect(mine.claim.deposit).toBe(金额和(mine, '订金'));

    await call(env, '/order/deliver', postJson({ id: a, maker: '乙', item: { 名称: '剑', 数量: 1 } }));
    await call(env, '/order/confirm', postJson({ id: a, poster: '甲' }));
    // b 交付后退货：退回的成品挂在「尾款」项上，金额 0 → 不得计入 final
    await call(env, '/order/deliver', postJson({ id: b, maker: '乙', item: { 名称: '盾', 数量: 1 } }));
    await call(env, '/order/reject', postJson({ id: b, poster: '丙' }));

    mine = await 待领(env, '乙');
    expect(mine.claim.final).toBe(700);                                    // 只有 a 的尾款
    expect(mine.claim.final).toBe(金额和(mine, '尾款', true));              // ≡ 金额>0 的尾款条目之和
    // 求和时 0 不改变总数，故「钱/物」的区分必须另看条目本身：只有 a 的尾款是钱，b 的是退回的成品
    expect(条目(mine, a).map(e => [e.项, e.金额])).toEqual([['尾款', 700]]);
    expect(条目(mine, b).map(e => [e.项, e.金额])).toEqual([['订金', 200], ['尾款', 0]]);

    // 客户端的入账口径：只为「回执成功且金额>0」的条目加钱 —— 逐条累加必须等于汇总
    const 客户端入账 = mine.claim.待领.filter(e => e.金额 > 0).reduce((s, e) => s + e.金额, 0);
    expect(客户端入账).toBe(400 + 200 + 700);                              // c 订金 + b 订金 + a 尾款
    expect(客户端入账).toBe(mine.claim.deposit + mine.claim.final);        // ＝ 两个汇总之和（同一派生）
    expect(mine.claim.items.map(e => e.id)).toEqual([b]);                  // 物另算：b 退回的成品（a 的成品归发单人）
  });
});

// ================================================================
// 超脱阶位（2026-09-23 新增支持）
// 经济系统里超脱是五阶之上的第 6 档；定价系数 = 五阶基准价 × 20 = 一阶基准 × 500
// ================================================================
describe('超脱阶位 · 服务端支持', () => {
  const 汤姆卡 = {
    client: 'welfare-657868', seller: '无由回廊', tier: '超脱', kind: 'goods',
    item: {
      名称: '汤姆猫三分钟体验卡', 类型: '消耗品', 品质: '银色', 阶位: '超脱阶', 数量: 1,
      描述: '致敬最伟大的默片动画与不死猫神。',
      效果: {
        动画物理学: '免疫一切常规与规则级致死伤害，生命状态绝对锁定。',
        四次元背后: '无视质量与体积守恒，可掏出无限大的木槌等夸张造物。',
        荒诞现实扭曲: '将周围物理法则同化为搞笑频道，持续3分钟。',
      },
    },
    qty: 1, price: 0,
  };

  it('阶位解析：超脱 → 系数 500（一阶 × 500）', () => {
    // 银武（同表紫 ×10）一阶基准 [15000,30000]；超脱 → ×500 → 参考 [7,500,000, 15,000,000]
    const r = checkPrice('equip', { 品质: '银色', 类型: '武器', 阶位: '超脱阶' }, '一阶', 4_000_000);
    expect(r.min).toBe(3_750_000); // 7,500,000 × 50%
    expect(r.ok).toBe(true);
  });

  it('超脱物品可上架（0 UP 运营通道，3 条效果走结构上限内）', async () => {
    const env = { MARKET_DB: makeFakeD1(), WELFARE_KEY: 'secret' };
    const res = await call(env, '/market/list', postJson({ ...汤姆卡, opsKey: 'secret' }));
    expect(res.status).toBe(200);
    const { id } = await res.json();

    const browse = await (await call(env, '/market/listings')).json();
    const l = browse.listings.find(x => x.id === id);
    expect(l.item.阶位).toBe('超脱阶');
    expect(l.item.品质).toBe('银色');
  });

  it('超脱阶天然不触发超模费（其上无阶可超）', async () => {
    const env = { MARKET_DB: makeFakeD1(), WELFARE_KEY: 'secret' };
    const res = await call(env, '/market/list', postJson({ ...汤姆卡, opsKey: 'secret' }));
    const { id } = await res.json();
    const browse = await (await call(env, '/market/listings')).json();
    expect(browse.listings.find(x => x.id === id).op).toBeUndefined();
  });

  it('装备效果 4 条仍被拒（结构铁律对超脱同样生效）', async () => {
    const env = { MARKET_DB: makeFakeD1(), WELFARE_KEY: 'secret' };
    const 装备 = {
      ...汤姆卡,
      kind: 'equip',
      item: {
        ...汤姆卡.item,
        名称: '超脱试作兵器', 类型: '武器', 伤害骰: '2d20', 倍率: 2, 负重: 3, 强化等级: 0,
        效果: { a: '1', b: '2', c: '3', d: '4' },
      },
    };
    const res = await call(env, '/market/list', postJson({ ...装备, opsKey: 'secret' }));
    expect(res.status).toBe(400);
    expect(await res.text()).toContain('效果条目');
  });

  it('道具无效果条数限制（世界书那条铁律只约束装备）', async () => {
    const env = { MARKET_DB: makeFakeD1(), WELFARE_KEY: 'secret' };
    const item = { ...汤姆卡.item, 效果: { a: '1', b: '2', c: '3', d: '4' } };
    const res = await call(env, '/market/list', postJson({ ...汤姆卡, item, opsKey: 'secret' }));
    expect(res.status).toBe(200);
  });

  it('无运营密钥时超脱物品不能 0 UP 挂（价格下限照常生效）', async () => {
    const env = { MARKET_DB: makeFakeD1(), WELFARE_KEY: 'secret' };
    const res = await call(env, '/market/list', postJson(汤姆卡)); // 无 opsKey
    expect(res.status).toBe(400);
  });
});
