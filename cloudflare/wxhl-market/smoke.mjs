// 临时冒烟脚本（不自建测试框架，直接驱动 worker.js 走一遍六接口）
// 用法: node smoke.mjs
import worker, { checkPrice } from './worker.js';

// ———— 假 D1（按本 Worker 实际用到的 SQL 子集实现） ————
function fakeD1() {
  const listings = new Map();
  const earnings = new Map();
  return {
    prepare(sql) {
      const st = { _a: [], bind(...a) { st._a = a; return st; } };
      st.first = async () => {
        if (/FROM listings/i.test(sql)) {
          const id = st._a[0];
          return listings.get(id) ?? null;
        }
        if (/FROM earnings/i.test(sql)) {
          const v = earnings.get(st._a[0]);
          return v === undefined ? null : { amount: v };
        }
        return null;
      };
      st.all = async () => {
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
        // 注意：判断顺序必须在前面，且用 ^ 锚定——INSERT 语句里有 created 列名，/CREATE/i 会误匹配
        if (/^INSERT INTO earnings/i.test(sql)) {
          earnings.set(st._a[0], (earnings.get(st._a[0]) ?? 0) + st._a[1]);
          return { changes: 1 };
        }
        if (/^INSERT INTO listings/i.test(sql)) {
          const a = st._a;
          listings.set(a[0], {
            id: a[0], client: a[1], seller: a[2], tier: a[3], kind: a[4],
            category: a[5], tier_idx: a[6], quality: a[7], item_name: a[8],
            item_json: a[9], qty: a[10], price: a[11], created: a[12],
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
    async batch(sts) { const o = []; for (const s of sts) o.push(await s.run()); return o; },
  };
}

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

console.log(`\n结果: ${pass} 通过 / ${fail} 失败`);
process.exit(fail === 0 ? 0 : 1);
