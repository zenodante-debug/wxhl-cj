// 临时冒烟脚本（不自建测试框架，直接驱动 worker.js 走一遍六接口）
// 用法: node smoke.mjs
import { fakeD1 } from "./fake-d1.js";
import worker, { checkPrice } from './worker.js';

const env = { MARKET_DB: fakeD1() };
const post = (p, b) => new Request('https://t.local' + p, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(b) });
const get = p => new Request('https://t.local' + p);
const call = (req) => worker.fetch(req, env);

let pass = 0, fail = 0;
function check(name, cond, extra = '') {
  if (cond) { pass++; console.log('  ✅', name); }
  else { fail++; console.log('  ❌', name, extra); }
}

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

console.log('=== 4. 价格与规则拒绝 ===');
r = await call(post('/market/list', { ...披风, price: 200 }));
check('超价拒绝(>150)', r.status === 400, await r.clone().text());
r = await call(post('/market/list', { ...披风, price: 40 }));
check('低于基准下限拒绝(<50)', r.status === 400);
r = await call(post('/market/list', { ...披风, item: { ...披风.item, 效果: { a: '1', b: '2', c: '3', d: '4' } } }));
check('效果>3条拒绝', r.status === 400, await r.clone().text());
r = await call(post('/market/list', { ...披风, kind: 'goods', price: 2500 }));
check('伪装道具绕价仍拒', r.status === 400);
r = await call(post('/market/list', { ...披风, item: { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, tier: '二阶', price: 5000 }));
check('剥离字段伪装道具仍拒', r.status === 400);

console.log('=== 5. 购买 ===');
r = await call(post('/market/buy', { id, buyer: '测试甲', client: 'c1' }));
check('自买自拒 403', r.status === 403);
r = await call(post('/market/buy', { id, buyer: '测试乙', client: 'c2' }));
check('他人购买 200', r.status === 200);
r = await call(post('/market/buy', { id, buyer: '测试丙', client: 'c3' }));
check('重复购买 404', r.status === 404);

console.log('=== 6. 货款与领取（总价 = 单价×数量）===');
r = await call(get('/market/mine?client=c1'));
j = await r.json();
check('卖家挂账 100', j.pending === 100, JSON.stringify(j).slice(0, 120));
check('已售出不在我的挂单里', j.listings.length === 0);
r = await call(post('/market/collect', { client: 'c1' }));
check('领取 100', (await r.json()).gained === 100);
r = await call(post('/market/collect', { client: 'c1' }));
check('再领为 0', (await r.json()).gained === 0);

console.log('=== 7. 多件整组（50 发子弹 × 单价 25 = 1250） ===');
r = await call(post('/market/list', {
  client: 'c9', seller: '测试甲', tier: '一阶', kind: 'goods',
  item: { 名称: '穿甲弹药', 类型: '弹药', 阶位: '一阶', 描述: '20发一组', 数量: 50, 效果: {} },
  qty: 50, price: 25,
}));
const ammo = await r.json();
check('50 发上架 200', r.status === 200, JSON.stringify(ammo));
r = await call(post('/market/buy', { id: ammo.id, buyer: '测试乙', client: 'c2' }));
check('购买 200', r.status === 200);
r = await call(get('/market/mine?client=c9'));
check('总价 1250 挂账（25×50）', (await r.json()).pending === 1250);

console.log('=== 8. 下架 ===');
r = await call(post('/market/list', 披风));
const l2 = await r.json();
r = await call(post('/market/cancel', { id: l2.id, client: '别人' }));
check('非卖家下架 403', r.status === 403);
r = await call(post('/market/cancel', { id: l2.id, client: 'c1' }));
check('卖家下架 200', r.status === 200);
r = await call(get('/market/listings'));
check('下架后市集无此单', !(await r.json()).listings.some(x => x.id === l2.id));

console.log('=== 9. 纯函数 checkPrice 抽查 ===');
check('蓝武器二阶 400~800', checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 800).ok && !checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 801).ok);
check('白装拒绝', !checkPrice('equip', { 品质: '白色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok);
check('道具 5~3000×阶位²', checkPrice('goods', { 数量: 5, 阶位: '一阶' }, '一阶', 3000).ok && !checkPrice('goods', { 数量: 5, 阶位: '一阶' }, '一阶', 3001).ok);

console.log('=== 10. 运营通道（0 UP 福利）===');
check('无密钥时 0 UP 被拒', !checkPrice('goods', { 数量: 1, 阶位: '一阶' }, '一阶', 0).ok);
check('密钥不匹配时 0 UP 被拒', !checkPrice('goods', { 数量: 1, 阶位: '一阶' }, '一阶', 0, 'wrong', 'secret').ok);
check('未配置 WELFARE_KEY 时 0 UP 被拒', !checkPrice('goods', { 数量: 1, 阶位: '一阶' }, '一阶', 0, 'secret', undefined).ok);
check('密钥匹配时 0 UP 放行', checkPrice('goods', { 数量: 1, 阶位: '一阶' }, '一阶', 0, 'secret', 'secret').ok);
check('密钥匹配时装备也可 0 UP', checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 0, 'secret', 'secret').ok);
check('密钥匹配也拦不住非 0 低价（4 < 5）', !checkPrice('goods', { 数量: 1, 阶位: '一阶' }, '一阶', 4, 'secret', 'secret').ok);

// 真实走一遍：无密钥挂 0 元应被拒；带密钥应成功
const 福利券 = {
  client: 'welfare', seller: '无由回廊', tier: '一阶', kind: 'goods',
  item: {
    名称: '十倍界王拳体验卡', 类型: '特殊道具', 品质: '特殊', 阶位: '一阶', 数量: 1,
    描述: '超规格体验卡：使用后全基础属性翻10倍；代价是每回合流失 30% 最大HP/最大MP/最大耐力（按最大值计算，非上限），可自行解除。',
  },
  qty: 1, price: 0,
};
const envKey = { MARKET_DB: env.MARKET_DB, WELFARE_KEY: 'secret' };
r = await worker.fetch(post('/market/list', 福利券), env);
check('无密钥挂 0 元 → 400', r.status === 400, await r.clone().text());
r = await worker.fetch(post('/market/list', { ...福利券, opsKey: 'wrong' }), envKey);
check('密钥错误挂 0 元 → 400', r.status === 400);
r = await worker.fetch(post('/market/list', { ...福利券, opsKey: 'secret' }), envKey);
const coupon = await r.json();
check('带正确密钥挂 0 元 → 200', r.status === 200, JSON.stringify(coupon));
r = await worker.fetch(get('/market/listings'), env);
check('市集能看到且 kind=goods', (await r.json()).listings.some(l => l.id === coupon.id && l.kind === 'goods'));
r = await worker.fetch(post('/market/buy', { id: coupon.id, buyer: '测试乙', client: 'c2' }), env);
check('0 UP 可被购买', r.status === 200);
r = await worker.fetch(get('/market/mine?client=welfare'), env);
check('0 元单不产生货款', (await r.json()).pending === 0);
r = await worker.fetch(post('/market/list', { ...福利券, price: 3000 }), env);
check('密钥通道不影响正常定价（3000 可挂）', r.status === 200);

// ════════ 玩家排行榜 ════════
console.log('\n=== 7. 玩家排行榜：上传与顶掉 ===');
r = await call(get('/rank/top'));
j = await r.json();
check('空榜 → 三样都是空的', j.total === 0 && j.list.length === 0 && j.me === null, JSON.stringify(j));

r = await call(post('/rank/submit', { name: '林千尺', lv: 9, title: '无', job: '无' }));
check('Lv.9 上传 → 400（Lv.1 不上榜）', r.status === 400, await r.clone().text());

r = await call(post('/rank/submit', { name: '林千尺', lv: 27, title: '「无距之刃」', job: '次元行者' }));
j = await r.json();
check('Lv.27 上传 → 第 1 名', r.status === 200 && j.rank === 1 && j.total === 1, JSON.stringify(j));

r = await call(post('/rank/submit', { name: '林千尺', lv: 20, title: '「新称号」', job: '次元行者' }));
j = await r.json();
check('同名换新存档（等级更低）照样顶掉，不新增行', j.total === 1, JSON.stringify(j));
j = await (await call(get('/rank/top'))).json();
check('顶掉后榜单里就一条且是新数据', j.list.length === 1 && j.list[0].lv === 20 && j.list[0].title === '「新称号」');

console.log('=== 8. 玩家排行榜：排序与名次 ===');
for (let i = 1; i <= 22; i++) {
  await call(post('/rank/submit', { name: '契约者' + String(i).padStart(2, '0'), lv: 120 - i, title: '无称号', job: '无职业' }));
}
j = await (await call(get('/rank/top'))).json();
check('一次只出前 20 名，total 是全服人数', j.list.length === 20 && j.total === 23, `list=${j.list.length} total=${j.total}`);
check('按等级降序', j.list[0].lv === 119 && j.list[19].lv === 100, `${j.list[0].lv}/${j.list[19].lv}`);

j = await (await call(get('/rank/top?name=' + encodeURIComponent('契约者05')))).json();
check('我在前 20 → me.rank 正确且不下发 near', j.me.rank === 5 && j.near.length === 0, JSON.stringify(j.me));

j = await (await call(get('/rank/top?name=' + encodeURIComponent('契约者21')))).json();
check('我第 21 名 → near 只给 #21/#22（#20 不重复）', j.me.rank === 21 && JSON.stringify(j.near.map(n => n.rank)) === '[21,22]', JSON.stringify(j.near));

j = await (await call(get('/rank/top?name=' + encodeURIComponent('查无此人')))).json();
check('没上传过 → me 为 null，榜单照常', j.me === null && j.list.length === 20);

console.log('=== 9. 玩家排行榜：运营清理通道 ===');
r = await call(post('/rank/admin/list', { key: 'smoke-admin' }));
check('没配 RANK_ADMIN_KEY 时一律 403', r.status === 403, String(r.status));

const adminEnv = { MARKET_DB: env.MARKET_DB, RANK_ADMIN_KEY: 'smoke-admin' };
const admin = (p, b) => worker.fetch(post(p, b), adminEnv);
r = await admin('/rank/admin/list', { key: '错的' });
check('密钥不对 → 403', r.status === 403);

r = await admin('/rank/admin/list', { key: 'smoke-admin' });
j = await r.json();
check('list 能看到全表', j.total === 23 && j.rows.length === 20, JSON.stringify({ total: j.total, rows: j.rows.length }));

r = await admin('/rank/admin/purge', { key: 'smoke-admin' });
check('purge 不给条件 → 400（防手滑清库）', r.status === 400, await r.clone().text());

r = await admin('/rank/admin/delete', { key: 'smoke-admin', names: ['契约者01', '契约者02'] });
check('delete 定向删两条', (await r.json()).deleted === 2);
check('删完剩 21 条（23-2）', (await (await call(get('/rank/top'))).json()).total === 21);

// 此时在场：契约者03..22（Lv.117..98）+ 林千尺（前面已改成 Lv.20），共 21 条
// belowLv:100 命中的是 契约者21(Lv.99)、契约者22(Lv.98)、林千尺(Lv.20) —— 3 条
r = await admin('/rank/admin/purge', { key: 'smoke-admin', belowLv: 100 });
j = await r.json();
check('purge by belowLv 清掉 3 条低等级', j.deleted === 3, JSON.stringify(j));
check('purge 后剩 18 条', (await (await call(get('/rank/top'))).json()).total === 18);

r = await admin('/rank/admin/clear', { key: 'smoke-admin', confirm: 'clear' });
check('clear 确认字不对 → 400', r.status === 400);
r = await admin('/rank/admin/clear', { key: 'smoke-admin', confirm: 'CLEAR' });
check('clear 成功清空 18 条', (await r.json()).deleted === 18);
check('清空后榜单为空', (await (await call(get('/rank/top'))).json()).total === 0);

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
