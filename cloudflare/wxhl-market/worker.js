// 无限回廊 · 自由市场 Worker
// 部署: Cloudflare Dashboard → Workers & Pages → wxhl-market → 编辑代码 → 粘贴本文件 →
//       Settings → Variables → KV Namespace Bindings 绑定一个 KV 命名空间, 变量名填 MARKET。
//       (或用 wrangler deploy, 见同目录 README.md)
// 模式: 上架即扣物/购买即扣款在玩家本地结算, 服务器只记账挂货款, 卖家随时领取;
//       服务器无法校验卖家是否真有此物, 熟人小圈子以信义为本——但价格与装备规则由本 Worker 硬校验。
// 防伪装: 服务器不信任客户端的 kind 字段, 一律按物品快照自行分类定价
//         (装备字段信号 → 必须有可定价品质+可判定类型; 无信号 → 道具)。
// 定价: 参考价 = 一阶基准价 × 阶位²(×1/×4/×9/×16/×25);
//       装备区间 = [基准下限, 基准上限×溢价](蓝×1.0/金×1.5/紫×2.0); 白装/银装拒绝上架;
//       道具区间 = [5, 3000] × 阶位²。
// 规则: 世界书<装备效果强度限制>+<装备与消耗品系统>——效果≤2条(破限器上限3, >3拒)、
//       主/副属性加成按基准表、防闪软上限、骰面格式 d4~d40、
//       必中/无敌/锁血/即死/无限 仅四阶以上紫银可出现。
//       灰色封印(原品质) 解包按原品质定价。
// 注意: 本文件与 src/wxhl-003/market/{priceTable,equipRules}.ts 是同一套规则, 改动须两边同步。
//       国内直连 workers.dev 不通, 绑定自定义域名 market.657868.xyz。

// ———— 价格表 [下限, 上限]（经济系统·恒定物价体系） ————
const BASE = {
  武器: { 白色: [30, 60], 蓝色: [100, 200], 金色: [400, 800], 紫色: [1500, 3000], 银色: [1500, 3000] },
  防具: { 白色: [15, 40], 蓝色: [50, 150], 金色: [250, 600], 紫色: [1000, 2000], 银色: [1000, 2000] },
  饰品: { 白色: [20, 40], 蓝色: [60, 150], 金色: [300, 700], 紫色: [1200, 2500], 银色: [1200, 2500] },
};
const PREMIUM = { 白色: 1, 蓝色: 1.0, 金色: 1.5, 紫色: 2.0, 银色: 2.0 };
const GOODS_BASE = [5, 3000];

// ———— 装备规则基准（世界书<装备与消耗品系统>主属性加成基准表；银色数值等同紫色） ————
const BONUS = {
  武器: { 白色: [1, 1, 2, 4, 6], 蓝色: [1, 2, 4, 6, 9], 金色: [2, 3, 5, 9, 12], 紫色: [3, 5, 8, 13, 18], 银色: [3, 5, 8, 13, 18] },
  防具: { 白色: [0, 1, 1, 2, 3], 蓝色: [0, 1, 2, 3, 5], 金色: [1, 2, 3, 4, 6], 紫色: [2, 3, 4, 7, 10], 银色: [2, 3, 4, 7, 10] },
  饰品: { 白色: [0, 1, 1, 2, 3], 蓝色: [0, 1, 2, 3, 5], 金色: [1, 2, 3, 5, 7], 紫色: [1, 3, 5, 8, 11], 银色: [1, 3, 5, 8, 11] },
};
const ARMOR_MULT = [1, 2, 4, 7, 11]; // 防具防/闪阶位倍率
const ARMOR_MAX_T1 = 15;             // 一阶防/闪绝对值上限（紫银极重防御）
const ARMOR_TOLERANCE = 6;
const BONUS_TOLERANCE = 2;           // 数值容差（真实存档与基准表存在小幅偏差）
const DICE_RE = /^\d*d(4|6|8|10|12|40)$/i;
const DICE_COUNT_MAX = 20;
const STRONG_RE = /必中|无敌|锁血|即死|无限/;

const TIER_DIGITS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

function tierDigit(tier) {
  const m = String(tier ?? '').match(/[一二三四五1-5]/);
  return m ? TIER_DIGITS[m[0]] : null;
}
function tierFactor(tier) {
  const n = tierDigit(tier);
  return n ? n * n : null;
}
function tierIdxOf(tier) {
  const n = tierDigit(tier);
  return n ? n - 1 : null;
}
function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}
function notNone(v) {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return !['', '无', 'none', 'None'].includes(v.trim());
  if (typeof v === 'number') return v !== 0;
  return true;
}

// ———— 品质归一（含灰色封印解包） ————
function parseQuality(raw) {
  if (typeof raw !== 'string') return null;
  const s = raw.trim();
  if (!s) return null;
  const m = s.match(/[白蓝金紫银]/);
  if (!m) return null;
  const map = { 白: '白色', 蓝: '蓝色', 金: '金色', 紫: '紫色', 银: '银色' };
  return { quality: map[m[0]], gray: /灰色封印|灰色/.test(s) };
}

// ———— 装备信号与类型分类（判定顺序同前端 priceTable.ts） ————
function hasEquipMarkers(item) {
  return (
    notNone(item?.穿戴门槛) ||
    notNone(item?.伤害骰) ||
    notNone(item?.倍率) ||
    notNone(item?.装备防御) ||
    notNone(item?.装备闪避) ||
    notNone(item?.负重) ||
    notNone(item?.主属性) ||
    Object.prototype.hasOwnProperty.call(item ?? {}, '强化等级')
  );
}
const WEAPON_RE = /武器|兵器|剑|刀|匕|斧|枪|炮|杖|棍|棒|弓|弩|锤|矛|镰|爪|鞭|戟|铳/;
const ACCESSORY_RE = /饰品|戒指|指环|项链|吊坠|坠子|护符|徽章|面具|耳环|手镯|胸针|别针|发饰|眼镜/;
const ARMOR_RE = /防具|头部|躯干|手部|下装|极轻|轻装|中装|重装|极重|甲|铠|衣|袍|盾/;

function parseCategory(item) {
  const t = String(item?.类型 ?? '');
  if (WEAPON_RE.test(t)) return '武器';
  if (notNone(item?.伤害骰)) return '武器';
  if (ACCESSORY_RE.test(t)) return '饰品';
  if (ARMOR_RE.test(t)) return '防具';
  if (notNone(item?.装备防御) || notNone(item?.装备闪避)) return '防具';
  if (notNone(item?.主属性) || notNone(item?.主属性加成)) return '饰品';
  return null;
}

// ———— 价格校验: → { ok, min, max, reason } ————
export function checkPrice(kind, item, sellerTier, price) {
  const fail = (reason, min = 0, max = 0) => ({ ok: false, min, max, reason });
  if (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 9999999)
    return fail('价格超出允许范围');
  const tier = String(item?.阶位 ?? '') || String(sellerTier ?? '一阶');

  if (kind === 'goods') {
    const qty = Number(item?.数量 ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return fail('数量须为 1~99 的整数');
    const f = tierFactor(tier);
    if (!f) return fail('阶位无法识别');
    const min = GOODS_BASE[0] * f;
    const max = GOODS_BASE[1] * f;
    if (Number(price) < min) return fail(`价格过低，道具单价不得低于 ${min} UP`, min, max);
    if (Number(price) > max) return fail(`价格过高，道具单价不得超过 ${max} UP`, min, max);
    return { ok: true, min, max, reason: '' };
  }

  const q = parseQuality(item?.品质);
  const category = parseCategory(item);
  if (!q || !category || !BASE[category][q.quality]) return fail('装备缺少可定价的品质/类型字段');
  if (q.quality === '白色') return fail('白色装备没有市场，回廊不收录');
  if (q.quality === '银色') return fail('银色装备有价无市，只走剧情，不进入市场');
  const f = tierFactor(tier);
  if (!f) return fail('阶位无法识别');
  const ref = BASE[category][q.quality];
  const min = Math.floor(ref[0] * f);
  const max = Math.floor(ref[1] * f * (PREMIUM[q.quality] ?? 1));
  if (Number(price) < min) return fail(`价格过低，不得低于基准下限 ${min} UP`, min, max);
  if (Number(price) > max) return fail(`价格过高，${q.quality}装备不得超过 ${max} UP`, min, max);
  return { ok: true, min, max, reason: '' };
}

// ———— 装备规则硬校验（世界书<装备效果强度限制>），返回拒绝原因或 null ————
function validateHard(item, quality, category, tierIdx) {
  const eff = item.效果 && typeof item.效果 === 'object' && !Array.isArray(item.效果)
    ? Object.keys(item.效果).length : 0;
  if (eff > 3) return `效果条目数 ${eff} 条超出上限（铁律最多 2 条，破限器上限 3 条）`;

  const 强化加成 = category === '饰品' ? Math.max(0, num(item.强化等级)) : 0;
  const bench = (BONUS[category][quality] || [])[tierIdx] ?? 0;
  const 主上限 = bench + 强化加成 + BONUS_TOLERANCE;
  const 副上限 = Math.floor(bench * 0.5) + 强化加成 + BONUS_TOLERANCE;
  if (num(item.主属性加成) > 主上限)
    return `主属性加成 ${num(item.主属性加成)} 超出该阶位基准（约 ${bench}，含容差上限 ${主上限}）`;
  if (num(item.副属性加成) > 副上限)
    return `副属性加成 ${num(item.副属性加成)} 超出该阶位基准（含容差上限 ${副上限}）`;

  const 防闪上限 = ARMOR_MAX_T1 * (ARMOR_MULT[tierIdx] ?? 1) + ARMOR_TOLERANCE;
  if (Math.abs(num(item.装备防御)) > 防闪上限)
    return `装备防御 ${num(item.装备防御)} 超出该阶位合理范围（上限约 ${防闪上限}）`;
  if (Math.abs(num(item.装备闪避)) > 防闪上限)
    return `装备闪避 ${num(item.装备闪避)} 超出该阶位合理范围（上限约 ${防闪上限}）`;

  const dice = String(item.伤害骰 ?? '无').trim();
  if (dice !== '' && dice !== '无') {
    if (!DICE_RE.test(dice)) return `伤害骰「${dice}」格式非法（只认 Nd4/d6/d8/d10/d12/d20/d40）`;
    const count = Number((dice.match(/^(\d*)d/i) || [])[1]) || 1;
    if (count > DICE_COUNT_MAX) return `伤害骰骰数 ${count} 超出上限`;
  }

  let text = '';
  if (item.效果 && typeof item.效果 === 'object')
    text = Object.entries(item.效果).map(([k, v]) => k + String(v)).join('');
  else if (typeof item.效果 === 'string') text = item.效果;
  if (STRONG_RE.test(text)) {
    const 四阶以上紫银 = tierIdx >= 3 && (quality === '紫色' || quality === '银色');
    if (!四阶以上紫银) return '效果含必中/无敌/锁血/即死/无限类强力关键词，仅四阶以上紫/银装备可出现';
  }
  return null;
}

// ———— 挂单整包校验: 结构防刷 + 服务器自行分类定价 + 装备规则硬校验 ————
// 返回拒绝原因字符串, null = 通过。同时通过 mutate b.kind 落下服务器认定的分类。
function validateListing(b) {
  if (!b) return 'bad request';
  if (typeof b.client !== 'string' || b.client.length === 0 || b.client.length > 64) return 'client 缺失或过长';
  if (typeof (b.seller ?? '') !== 'string' || String(b.seller).length > 24) return 'seller 过长';
  if (typeof (b.tier ?? '') !== 'string' || String(b.tier).length > 12) return 'tier 过长';
  if (!b.item || typeof b.item.名称 !== 'string' || b.item.名称.length === 0 || b.item.名称.length > 40)
    return '物品名称缺失或过长';
  if (typeof (b.item.描述 ?? '') !== 'string' || String(b.item.描述).length > 200) return '物品描述过长';
  if (!Number.isInteger(Number(b.qty)) || Number(b.qty) < 1 || Number(b.qty) > 99) return '数量须为 1~99 的整数';
  if (JSON.stringify(b.item).length > 2048) return '物品快照过大';

  // 服务器自行分类: 客户端 kind 仅供参考
  // 装备 = 品质可定价 + 类型/信号可判分类（防剥离属性字段伪装道具绕价）；
  // 带装备字段却定不了价的直接拒绝；两者皆无才是道具
  const hasMarkers = hasEquipMarkers(b.item);
  const q = parseQuality(b.item.品质);
  const category = q ? parseCategory(b.item) : null;
  const tier = String(b.item.阶位 ?? '') || String(b.tier ?? '一阶');

  if (q && category) {
    b.kind = 'equip';
    const chk = checkPrice('equip', b.item, String(b.tier ?? '一阶'), Number(b.price));
    if (!chk.ok) return chk.reason;
    const idx = tierIdxOf(tier);
    if (idx === null) return '阶位无法识别';
    const hard = validateHard(b.item, q.quality, category, idx);
    if (hard) return hard;
    return null;
  }
  if (hasMarkers) {
    return '物品带装备字段但品质或类型无法识别，无法定价——请补全「品质」与「类型」';
  }

  b.kind = 'goods';
  const chk = checkPrice('goods', b.item, String(b.tier ?? '一阶'), Number(b.price));
  return chk.ok ? null : chk.reason;
}

// 列出全部在售挂单的 key (KV list 分页游走, 字典序 = 上架时间序)
async function list_market_keys(env) {
  const names = [];
  let cursor;
  while (true) {
    const page = await env.MARKET.list(cursor ? { prefix: 'm:i:', cursor } : { prefix: 'm:i:' });
    for (const k of page.keys) names.push(k.name);
    if (page.list_complete) break;
    cursor = page.cursor;
  }
  return names;
}

function json(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };
    if (request.method === 'OPTIONS') return new Response(null, { headers: cors });

    // ———— 自由市场: 玩家把背包物品挂上全服市场, 其他玩家用 UP 购买 ————
    // 挂单 id 用「毫秒时间戳-随机数」生成: KV 计数器读改写不保证立即可见, 会撞号互相覆盖;
    // 定长时间戳的字典序即时间序, 市集浏览按 key 升序扫描取尾部即为最新挂单。
    // 售出/下架直接删除挂单键, 市集里只剩在售单, 扫描量恒小。

    // POST /market/list  { client, seller, tier, kind, item, qty, price }  →  { id }
    if (url.pathname === '/market/list' && request.method === 'POST') {
      try {
        const b = await request.json();
        const reason = validateListing(b);
        if (reason) return new Response(reason, { status: 400, headers: cors });
        const id = String(Date.now()).padStart(15, '0') + '-' + Math.random().toString(36).slice(2, 8);
        await env.MARKET.put(`m:i:${id}`, JSON.stringify({
          id,
          client: b.client.slice(0, 64),
          seller: String(b.seller ?? '无名契约者').slice(0, 24),
          tier: String(b.tier ?? '').slice(0, 12),
          kind: b.kind, // validateListing 已按物品快照重新认定
          item: b.item,
          qty: Number(b.qty),
          price: Number(b.price),
          created: Date.now(),
        }), { expirationTtl: 60 * 60 * 24 * 30 }); // 30 天无人问津则自动下架
        return json({ id }, cors);
      } catch {
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // GET /market/listings  →  { listings: [在售挂单, 最新 50 条] }
    if (url.pathname === '/market/listings' && request.method === 'GET') {
      const names = await list_market_keys(env);
      const listings = [];
      for (const name of names.slice(-50)) {
        const raw = await env.MARKET.get(name);
        if (!raw) continue;
        const l = JSON.parse(raw);
        listings.push({ id: l.id, seller: l.seller, tier: l.tier, kind: l.kind, item: l.item, qty: l.qty, price: l.price, created: l.created });
      }
      return json({ listings }, { ...cors, 'Cache-Control': 'no-store' });
    }

    // POST /market/buy  { id, buyer, client }  →  { ok }
    //   给卖家挂账后删除挂单 (买家付款在买家本地结算, 服务器只记账);
    //   KV 无原子判重, 极小概率两买家同刻购买同一单会双计一次货款, 小圈子市集可接受
    if (url.pathname === '/market/buy' && request.method === 'POST') {
      try {
        const { id, buyer, client } = await request.json();
        const key = `m:i:${String(id ?? '')}`;
        const raw = await env.MARKET.get(key);
        if (!raw) return new Response('not found', { status: 404, headers: cors });
        const l = JSON.parse(raw);
        if (client && String(client).slice(0, 64) === l.client) {
          return new Response('own listing', { status: 403, headers: cors });
        }
        await env.MARKET.put(`m:pro:${l.client}`, String(Number((await env.MARKET.get(`m:pro:${l.client}`)) ?? 0) + Number(l.price ?? 0)));
        await env.MARKET.delete(key);
        return json({ ok: true }, cors);
      } catch {
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // POST /market/cancel  { id, client }  →  卖家下架取回挂单
    if (url.pathname === '/market/cancel' && request.method === 'POST') {
      try {
        const { id, client } = await request.json();
        const key = `m:i:${String(id ?? '')}`;
        const raw = await env.MARKET.get(key);
        if (!raw) return new Response('not found', { status: 404, headers: cors });
        const l = JSON.parse(raw);
        if (l.client !== String(client).slice(0, 64)) return new Response('forbidden', { status: 403, headers: cors });
        await env.MARKET.delete(key);
        return json({ ok: true }, cors);
      } catch {
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // POST /market/collect  { client }  →  { gained }  领取全部挂账 UP (读后即清)
    if (url.pathname === '/market/collect' && request.method === 'POST') {
      try {
        const { client } = await request.json();
        if (!client) return new Response('bad request', { status: 400, headers: cors });
        const key = `m:pro:${String(client).slice(0, 64)}`;
        const gained = Number((await env.MARKET.get(key)) ?? 0);
        if (gained > 0) await env.MARKET.put(key, '0');
        return json({ gained }, cors);
      } catch {
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // GET /market/mine?client=xxx  →  { pending, listings: [我未售出的挂单] }
    if (url.pathname === '/market/mine' && request.method === 'GET') {
      const client = String(url.searchParams.get('client') ?? '').slice(0, 64);
      const pending = Number((await env.MARKET.get(`m:pro:${client}`)) ?? 0);
      const names = await list_market_keys(env);
      const listings = [];
      for (const name of names) {
        const raw = await env.MARKET.get(name);
        if (!raw) continue;
        const l = JSON.parse(raw);
        if (l.client !== client) continue;
        listings.push({ id: l.id, seller: l.seller, tier: l.tier, kind: l.kind, item: l.item, qty: l.qty, price: l.price, created: l.created });
      }
      return json({ pending, listings }, { ...cors, 'Cache-Control': 'no-store' });
    }

    return new Response('not found', { status: 404, headers: cors });
  },
};
