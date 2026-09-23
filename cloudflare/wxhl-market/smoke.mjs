// 本地冒烟脚本（不依赖测试框架/网络，直接驱动 worker.js 走一遍全部接口）
// 用法: node smoke.mjs
import worker, { checkPrice } from './worker.js';
import { makeFakeD1 } from './fake-d1.mjs';

const env = { MARKET_DB: makeFakeD1() };
const post = (p, b) => new Request('https://t.local' + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const get = p => new Request('https://t.local' + p);
const call = (req, e = env) => worker.fetch(req, e);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ✅', name); }
  else { fail++; console.log('  ❌', name, extra); }
}

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

console.log('\n=== 1. 上架（真实存档装备） ===');
let r = await call(post('/market/list', 披风));
const listed = await r.json();
check('上架 200 且有 id', r.status === 200 && !!listed.id, JSON.stringify(listed));

console.log('=== 2. 浏览市集 ===');
r = await call(get('/market/listings'));
let j = await r.json();
check('返回 1 条', j.listings.length === 1, JSON.stringify(j).slice(0, 200));
check('服务器认定 kind=equip', j.listings[0]?.kind === 'equip');
check('item 快照完整（含效果）', j.listings[0]?.item?.效果?.夜幕隐匿 !== undefined);
check('不下发 client 字段', j.listings[0]?.client === undefined);
const id = j.listings[0].id;

console.log('=== 3. 服务端筛选 ===');
r = await call(get('/market/listings?category=防具&tier=0&quality=蓝色'));
check('按 防具/一阶/蓝色 能筛到', (await r.json()).listings.length === 1);
r = await call(get('/market/listings?category=武器'));
check('按 武器 筛不到', (await r.json()).listings.length === 0);

console.log('=== 4. 价格区间（参考价 50%~200%）===');
// 用独立探测 client，避免污染 c1 的挂单列表（第 7 段要断言"已售出不在我的挂单里"）
const 探测 = { ...披风, client: 'cProbe' };
r = await call(post('/market/list', { ...探测, price: 25 }));
check('下限 25（=50×50%）可挂', r.status === 200, await r.clone().text());
r = await call(post('/market/list', { ...探测, price: 301 }));
check('超上限 301（>150×200%）拒', r.status === 400, await r.clone().text());
r = await call(post('/market/list', { ...探测, price: 24 }));
check('低于下限 24 拒', r.status === 400);
r = await call(post('/market/list', { ...探测, price: 300 }));
check('上限 300 可挂', r.status === 200);

console.log('=== 5. 规则拒绝与超模收费路径 ===');
r = await call(post('/market/list', { ...披风, item: { ...披风.item, 效果: { a: '1', b: '2', c: '3', d: '4' } } }));
check('效果>3条拒（结构问题，不可收费放行）', r.status === 400, await r.clone().text());
const 超模披风 = { ...披风, client: 'cOp', item: { ...披风.item, 主属性加成: 20 } };
r = await call(post('/market/list', 超模披风));
check('数值超模但未声明 op → 拒并提示需付超模费', r.status === 400 && (await r.clone().text()).includes('超模'));
r = await call(post('/market/list', { ...超模披风, price: 100, op: { tier: '超脱', rp: 2250, up: 2250000 } }));
check('带 op 声明 → 可上架（收费放行）', r.status === 200, await r.clone().text());
r = await call(post('/market/list', { ...超模披风, op: { tier: '不存在', rp: 1, up: 1 } }));
check('op.tier 非法 → 拒', r.status === 400);
r = await call(post('/market/list', { ...披风, kind: 'goods', price: 2500 }));
check('伪装道具绕价仍拒', r.status === 400);
r = await call(post('/market/list', { ...披风, item: { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, tier: '二阶', price: 5000 }));
check('剥离字段伪装道具仍拒', r.status === 400);

console.log('=== 6. 购买（含买家名记录）===');
r = await call(post('/market/buy', { id, buyer: '测试甲', client: 'c1' }));
check('自买自拒 403', r.status === 403);
r = await call(post('/market/buy', { id, buyer: '测试乙', client: 'c2' }));
check('他人购买 200', r.status === 200);
r = await call(post('/market/buy', { id, buyer: '测试丙', client: 'c3' }));
check('重复购买 404', r.status === 404);

console.log('=== 7. 货款与出售记录 ===');
r = await call(get('/market/mine?client=c1'));
j = await r.json();
check('卖家挂账 100', j.pending === 100, JSON.stringify(j).slice(0, 120));
check('已售出不在我的挂单里', j.listings.length === 0);
r = await call(get('/market/sales?client=c1'));
j = await r.json();
check('出售记录有 1 条', j.sales.length === 1, JSON.stringify(j).slice(0, 200));
check('出售记录含买家名', j.sales[0]?.buyer === '测试乙');
check('出售记录含物品与总价信息', j.sales[0]?.item?.名称 === '夜翼披风' && j.sales[0]?.qty === 1 && j.sales[0]?.price === 100);
r = await call(post('/market/collect', { client: 'c1' }));
check('领取 100', (await r.json()).gained === 100);
r = await call(post('/market/collect', { client: 'c1' }));
check('再领为 0', (await r.json()).gained === 0);

console.log('=== 8. 道具（与武器同表，必须填品质）===');
r = await call(post('/market/list', {
  client: 'c9', seller: '测试甲', tier: '一阶', kind: 'goods',
  item: { 名称: '穿甲弹药', 类型: '弹药', 品质: '白色', 阶位: '一阶', 描述: '20发一组', 数量: 50 },
  qty: 50, price: 15,
}));
const ammo = await r.json();
check('白品质弹药 50 发（15 UP/发）上架 200', r.status === 200, JSON.stringify(ammo));
r = await call(post('/market/list', {
  client: 'c9', seller: '测试甲', tier: '一阶', kind: 'goods',
  item: { 名称: '神秘材料', 阶位: '一阶', 描述: '没写品质', 数量: 3 },
  qty: 3, price: 100,
}));
check('缺品质的道具 → 拒（要求补全）', r.status === 400, await r.clone().text());
r = await call(post('/market/list', {
  client: 'c9', seller: '测试甲', tier: '一阶', kind: 'goods',
  item: { 名称: '蓝色药剂', 品质: '蓝色', 阶位: '一阶', 描述: 'x', 数量: 5 },
  qty: 5, price: 50,
}));
const potion = await r.json();
check('蓝品质道具 50 UP 可挂', r.status === 200, JSON.stringify(potion));
r = await call(post('/market/list', {
  client: 'c9', seller: '测试甲', tier: '一阶', kind: 'goods',
  item: { 名称: '蓝色药剂', 品质: '蓝色', 阶位: '一阶', 描述: 'x', 数量: 5 },
  qty: 5, price: 15,
}));
check('蓝品质道具 15 UP 被拦（旧规则下能挂，扰乱市场）', r.status === 400);
r = await call(post('/market/buy', { id: ammo.id, buyer: '测试乙', client: 'c2' }));
check('购买道具 200', r.status === 200);
r = await call(get('/market/mine?client=c9'));
check('总价 750 挂账（15×50）', (await r.json()).pending === 750);

// —— 部分购买：同一个挂单可以只买走一部分，剩余继续挂着 ——
r = await call(post('/market/buy', { id: potion.id, buyer: '测试丁', client: 'c4', qty: 2 }));
j = await r.json();
check('部分购买 2/5 → 200 且回 bought=2', r.status === 200 && j.bought === 2, JSON.stringify(j));
r = await call(get('/market/listings'));
check('部分购买后挂单剩 3 件', (await r.json()).listings.find(x => x.id === potion.id)?.qty === 3);
r = await call(get('/market/mine?client=c9'));
check('货款按买走数量累计（750 + 50×2 = 850）', (await r.json()).pending === 850);

r = await call(post('/market/buy', { id: potion.id, buyer: '测试戊', client: 'c5', qty: 99 }));
check('买超过剩余 → 409（并发仲裁）', r.status === 409, await r.clone().text());
r = await call(get('/market/listings'));
check('被拒后数量不动（仍 3 件）', (await r.json()).listings.find(x => x.id === potion.id)?.qty === 3);
r = await call(get('/market/mine?client=c9'));
check('被拒后货款也不动（仍 850）', (await r.json()).pending === 850);

r = await call(post('/market/buy', { id: potion.id, buyer: '测试戊', client: 'c5', qty: 3 }));
check('买光剩余 3 件 → 200', r.status === 200);
r = await call(get('/market/listings'));
check('卖光后挂单消失', !(await r.json()).listings.some(x => x.id === potion.id));
r = await call(get('/market/mine?client=c9'));
check('货款 = 750+100+150 = 1000', (await r.json()).pending === 1000);
r = await call(get('/market/sales?client=c9'));
check(
  '同一挂单两笔成交各自留记录，不互相覆盖',
  (await r.json()).sales.filter(s => s.item.名称 === '蓝色药剂').length === 2,
);

console.log('=== 9. 下架 ===');
r = await call(post('/market/list', 披风));
const l2 = await r.json();
r = await call(post('/market/cancel', { id: l2.id, client: '别人' }));
check('非卖家下架 403', r.status === 403);
r = await call(post('/market/cancel', { id: l2.id, client: 'c1' }));
check('卖家下架 200', r.status === 200);
r = await call(get('/market/listings'));
check('下架后市集无此单', !(await r.json().then(x => x.listings)).some(x => x.id === l2.id));

// 部分成交后下架：返回的是**剩余**数量，不是当初上架的数量
r = await call(post('/market/list', {
  client: 'c9', seller: '测试甲', tier: '一阶', kind: 'goods',
  item: { 名称: '散装弹药', 品质: '白色', 阶位: '一阶', 描述: 'x', 数量: 10 },
  qty: 10, price: 15,
}));
const 散装 = await r.json();
await call(post('/market/buy', { id: 散装.id, buyer: '测试乙', client: 'c2', qty: 4 }));
r = await call(post('/market/cancel', { id: 散装.id, client: 'c9' }));
j = await r.json();
check('部分成交后下架，回传剩余 6 件', j.returned === 6, JSON.stringify(j));

console.log('=== 10. 运营通道（0 UP 福利）===');
check('无密钥时 0 UP 被拒', !checkPrice('goods', { 数量: 1, 品质: '白色', 阶位: '一阶' }, '一阶', 0).ok);
check('密钥匹配时 0 UP 放行', checkPrice('goods', { 数量: 1, 品质: '白色', 阶位: '一阶' }, '一阶', 0, 'secret', 'secret').ok);
const envKey = { MARKET_DB: env.MARKET_DB, WELFARE_KEY: 'secret' };
const 福利券 = {
  client: 'welfare', seller: '无由回廊', tier: '一阶', kind: 'goods',
  item: { 名称: '十倍界王拳体验卡', 类型: '特殊道具', 品质: '白色', 阶位: '一阶', 数量: 1, 描述: '超规格体验卡：全属性翻10倍；每回合流失30%最大HP/MP/耐力，可自行解除。' },
  qty: 1, price: 0,
};
r = await call(post('/market/list', 福利券));
check('无密钥挂 0 元 → 400', r.status === 400, await r.clone().text());
r = await call(post('/market/list', { ...福利券, opsKey: 'secret' }), envKey);
const coupon = await r.json();
check('带正确密钥挂 0 元 → 200', r.status === 200, JSON.stringify(coupon));
r = await call(post('/market/buy', { id: coupon.id, buyer: '测试乙', client: 'c2' }));
check('0 UP 可被购买', r.status === 200);

console.log('=== 11. 纯函数 checkPrice 抽查 ===');
check('蓝武二阶 参考[400,800] → 允许[200,1600]',
  checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 200).ok &&
  checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 1600).ok &&
  !checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 199).ok);
check('白装拒绝（回廊不收录）', !checkPrice('equip', { 品质: '白色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok);
// 银色 2026-09-23 放开：基准价 = 同表紫色 × 10 → 一阶银武器参考[15000,30000]，允许[7500,60000]
const 银武 = { 品质: '银色', 类型: '武器', 阶位: '一阶' };
check('银装放行：一阶 [7500,60000]',
  checkPrice('equip', 银武, '一阶', 7500).ok &&
  checkPrice('equip', 银武, '一阶', 60000).ok &&
  !checkPrice('equip', 银武, '一阶', 7499).ok &&
  !checkPrice('equip', 银武, '一阶', 60001).ok);
check('银色道具走武器表（同银武器价）',
  checkPrice('goods', { 品质: '银色', 阶位: '一阶', 数量: 1 }, '一阶', 7500).ok &&
  !checkPrice('goods', { 品质: '银色', 阶位: '一阶', 数量: 1 }, '一阶', 7499).ok);
check('道具缺品质拒绝', !checkPrice('goods', { 数量: 5, 阶位: '一阶' }, '一阶', 100).ok);

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
