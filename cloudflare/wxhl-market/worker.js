// 无限回廊 · 自由市场 Worker（存储层：Cloudflare D1）
// 部署: 见同目录 README.md。绑定: D1 数据库，变量名 MARKET_DB。
//
// 存储选型说明（2026-09-22 从 KV 迁移）：
//   KV 的 list() 有每日配额，而「逛市场」每次都要遍历全库 key，配额很快爆掉
//   （表现为 1101 / "KV list() limit exceeded for the day"）。
//   D1 免费版每天 500 万行读 / 10 万行写，且能 WHERE / ORDER BY / LIMIT，
//   不再需要把全库 key 拉出来——挂单再多也不会拖垮浏览。
//
// 模式: 上架即扣物/购买即扣款在玩家本地结算, 服务器只记账挂货款, 卖家随时领取;
//       服务器无法校验卖家是否真有此物, 熟人小圈子以信义为本——但价格与装备规则由本 Worker 硬校验。
// 防伪装: 服务器不信任客户端的 kind 字段, 一律按物品快照自行分类定价
//         (品质可定价 + 类型可判分类 → 装备; 带装备字段却定不了价 → 拒绝; 其余 → 道具)。
// 定价: 参考价 = 一阶基准价 × 阶位²(×1/×4/×9/×16/×25);
//       装备区间 = [基准下限, 基准上限×溢价](蓝×1.0/金×1.5/紫×2.0); 白装/银装拒绝上架;
//       道具区间 = [5, 3000] × 阶位²; 单价 × 数量 = 成交总价。
// 规则: 世界书<装备效果强度限制>+<装备与消耗品系统>——效果≤2条(破限器上限3, >3拒)、
//       主/副属性加成按基准表、防闪软上限、骰面格式 d4~d40、
//       必中/无敌/锁血/即死/无限 仅四阶以上紫银可出现。
//       灰色封印(原品质) 解包按原品质定价。
// 注意: 本文件与 src/wxhl-003/market/{priceTable,equipRules}.ts 是同一套规则, 改动须两边同步。
//       国内直连 workers.dev 不通, 绑定自定义域名 market.657868.xyz。
//
// 本文件还含**玩家排行榜**（按等级排名, 见下方「玩家排行榜」段）:
//   /rank/submit · /rank/top · /rank/admin/{list,delete,purge,clear}
//   它自带 ensureRankSchema, 不经过市场那套建表 —— 两边互不波及。

// ———— 价格表 [下限, 上限]（经济系统·恒定物价体系） ————
const BASE = {
  武器: { 白色: [30, 60], 蓝色: [100, 200], 金色: [400, 800], 紫色: [1500, 3000], 银色: [1500, 3000] },
  防具: { 白色: [15, 40], 蓝色: [50, 150], 金色: [250, 600], 紫色: [1000, 2000], 银色: [1000, 2000] },
  饰品: { 白色: [20, 40], 蓝色: [60, 150], 金色: [300, 700], 紫色: [1200, 2500], 银色: [1200, 2500] },
};
const PREMIUM = { 白色: 1, 蓝色: 1.0, 金色: 1.5, 紫色: 2.0, 银色: 2.0 };
// 允许挂单区间（2026-09-23 用户定稿）：参考价 = 基准价 × 阶位²（系统一）
//   最低 = 参考价下限 × 50%，最高 = 参考价上限 × 200%（原品质溢价表作废）
const PRICE_FLOOR_RATE = 0.5;
const PRICE_CEIL_RATE = 2;
// 道具按所填品质查武器基准（与前端 GOODS_BASE_CATEGORY 一致）
const GOODS_BASE_CATEGORY = '武器';

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
const DICE_FACES = [4, 6, 8, 10, 12, 20, 40];
const DICE_RE = /^(\d*)d(\d+)$/i;
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
// opsKey 是「运营通道」：与 Worker 的 WELFARE_KEY 环境变量一致时，允许 0 UP 赠品挂单
// （发福利用）。玩家端拿不到这个密钥，价格下限对他们依旧严格。
export function checkPrice(kind, item, sellerTier, price, opsKey, welfareKey) {
  const fail = (reason, min = 0, max = 0) => ({ ok: false, min, max, reason });
  if (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 9999999)
    return fail('价格超出允许范围');
  const 运营 = Number(price) === 0 && !!welfareKey && opsKey === welfareKey;
  const tier = String(item?.阶位 ?? '') || String(sellerTier ?? '一阶');
  const f = tierFactor(tier);
  if (!f) return fail('阶位无法识别');

  if (kind === 'goods') {
    const qty = Number(item?.数量 ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) return fail('数量须为 1~999 的整数');
    const q = parseQuality(item?.品质);
    if (!q || q.quality === '银色')
      return fail('道具需填写品质（白色/蓝色/金色/紫色）——请在上架界面补全后再挂单');
    const base = BASE[GOODS_BASE_CATEGORY][q.quality];
    const min = Math.floor(base[0] * f * PRICE_FLOOR_RATE);
    const max = Math.floor(base[1] * f * PRICE_CEIL_RATE);
    if (!运营 && Number(price) < min) return fail(`价格过低，道具单价不得低于 ${min} UP`, min, max);
    if (Number(price) > max) return fail(`价格过高，道具单价不得超过 ${max} UP`, min, max);
    return { ok: true, min: 运营 ? 0 : min, max, reason: '' };
  }

  const q = parseQuality(item?.品质);
  const category = parseCategory(item);
  if (!q || !category || !BASE[category][q.quality]) return fail('装备缺少可定价的品质/类型字段');
  if (q.quality === '白色') return fail('白色装备没有市场，回廊不收录');
  if (q.quality === '银色') return fail('银色装备有价无市，只走剧情，不进入市场');
  const ref = BASE[category][q.quality];
  const min = Math.floor(ref[0] * f * PRICE_FLOOR_RATE);
  const max = Math.floor(ref[1] * f * PRICE_CEIL_RATE);
  if (!运营 && Number(price) < min) return fail(`价格过低，不得低于参考价的 50%（${min} UP）`, min, max);
  if (Number(price) > max) return fail(`价格过高，不得超过参考价的 200%（${max} UP）`, min, max);
  return { ok: true, min: 运营 ? 0 : min, max, reason: '' };
}

// ———— 装备规则硬校验（世界书<装备效果强度限制>），返回拒绝原因或 null ————
// opDeclared = 挂单携带超模声明（真实阶位+费用）：数值超基准与强效果改为收费路径，跳过；
//              结构类问题（效果>3条、骰面格式）仍无条件拒绝。
function validateHard(item, quality, category, tierIdx, opDeclared) {
  const eff = item.效果 && typeof item.效果 === 'object' && !Array.isArray(item.效果)
    ? Object.keys(item.效果).length : 0;
  if (eff > 3) return `效果条目数 ${eff} 条超出上限（铁律最多 2 条，破限器上限 3 条）`;

  if (!opDeclared) {
    const 强化加成 = category === '饰品' ? Math.max(0, num(item.强化等级)) : 0;
    const bench = (BONUS[category][quality] || [])[tierIdx] ?? 0;
    const 主上限 = bench + 强化加成 + BONUS_TOLERANCE;
    const 副上限 = Math.floor(bench * 0.5) + 强化加成 + BONUS_TOLERANCE;
    if (num(item.主属性加成) > 主上限)
      return `主属性加成 ${num(item.主属性加成)} 超出该阶位基准（约 ${bench}，含容差上限 ${主上限}）——该物品属超模物品，需支付超模上架费`;
    if (num(item.副属性加成) > 副上限)
      return `副属性加成 ${num(item.副属性加成)} 超出该阶位基准（含容差上限 ${副上限}）——该物品属超模物品，需支付超模上架费`;

    const 防闪上限 = ARMOR_MAX_T1 * (ARMOR_MULT[tierIdx] ?? 1) + ARMOR_TOLERANCE;
    if (Math.abs(num(item.装备防御)) > 防闪上限)
      return `装备防御 ${num(item.装备防御)} 超出该阶位合理范围（上限约 ${防闪上限}）——该物品属超模物品，需支付超模上架费`;
    if (Math.abs(num(item.装备闪避)) > 防闪上限)
      return `装备闪避 ${num(item.装备闪避)} 超出该阶位合理范围（上限约 ${防闪上限}）——该物品属超模物品，需支付超模上架费`;

    let text = '';
    if (item.效果 && typeof item.效果 === 'object')
      text = Object.entries(item.效果).map(([k, v]) => k + String(v)).join('');
    else if (typeof item.效果 === 'string') text = item.效果;
    if (STRONG_RE.test(text)) {
      const 四阶以上紫银 = tierIdx >= 3 && (quality === '紫色' || quality === '银色');
      if (!四阶以上紫银) return '效果含必中/无敌/锁血/即死/无限类强力关键词——该物品属超模物品，需支付超模上架费';
    }
  }

  const dice = String(item.伤害骰 ?? '无').trim();
  if (dice !== '' && dice !== '无') {
    const m = dice.match(DICE_RE);
    if (!m) return `伤害骰「${dice}」格式非法（应为 Nd4/d6/d8/d10/d12/d20/d40，如 4d20）`;
    const face = Number(m[2]);
    if (!DICE_FACES.includes(face)) return `伤害骰「${dice}」骰面 d${face} 不在合法骰面内（只认 d4/d6/d8/d10/d12/d20/d40）`;
    const count = Number(m[1] || 1);
    if (count > DICE_COUNT_MAX) return `伤害骰「${dice}」骰数 ${count} 超出上限`;
  }
  return null;
}

// ———— 挂单整包校验: 结构防刷 + 服务器自行分类定价 + 装备规则硬校验 ————
// 返回拒绝原因字符串, null = 通过。同时把服务器认定的分类与筛选列写进 out。
// opsKey / welfareKey：运营通道密钥（见 checkPrice 注释）
// 超模声明 b.op = { tier, rp, up }：携带时跳过数值/强效果拒绝（费用由前端从存档代扣，服务器记账展示）
const TIER_NAMES_ALL = ['一阶', '二阶', '三阶', '四阶', '五阶', '超脱'];

function parseOp(b) {
  if (b.op === undefined || b.op === null) return { declared: false };
  const op = b.op;
  if (typeof op !== 'object' || Array.isArray(op)) return { error: 'op 字段格式非法' };
  if (!TIER_NAMES_ALL.includes(op.tier)) return { error: 'op.tier 须为 一阶~五阶/超脱' };
  if (!Number.isInteger(Number(op.rp)) || Number(op.rp) < 0 || Number(op.rp) > 9999999) return { error: 'op.rp 非法' };
  if (!Number.isInteger(Number(op.up)) || Number(op.up) < 0 || Number(op.up) > 9999999) return { error: 'op.up 非法' };
  return { declared: true, tier: String(op.tier), rp: Number(op.rp), up: Number(op.up) };
}

function validateListing(b, out, opsKey, welfareKey) {
  if (!b) return 'bad request';
  if (typeof b.client !== 'string' || b.client.length === 0 || b.client.length > 64) return 'client 缺失或过长';
  if (typeof (b.seller ?? '') !== 'string' || String(b.seller).length > 24) return 'seller 过长';
  if (typeof (b.tier ?? '') !== 'string' || String(b.tier).length > 12) return 'tier 过长';
  if (!b.item || typeof b.item.名称 !== 'string' || b.item.名称.length === 0 || b.item.名称.length > 40)
    return '物品名称缺失或过长';
  if (typeof (b.item.描述 ?? '') !== 'string' || String(b.item.描述).length > 500) return '物品描述过长（上限 500 字）';
  if (!Number.isInteger(Number(b.qty)) || Number(b.qty) < 1 || Number(b.qty) > 999) return '数量须为 1~999 的整数';
  if (JSON.stringify(b.item).length > 4096) return '物品快照过大';

  const op = parseOp(b);
  if (op.error) return op.error;

  const hasMarkers = hasEquipMarkers(b.item);
  const q = parseQuality(b.item.品质);
  const category = q ? parseCategory(b.item) : null;
  const tier = String(b.item.阶位 ?? '') || String(b.tier ?? '一阶');

  if (q && category) {
    b.kind = 'equip';
    const chk = checkPrice('equip', b.item, String(b.tier ?? '一阶'), Number(b.price), opsKey, welfareKey);
    if (!chk.ok) return chk.reason;
    const idx = tierIdxOf(tier);
    if (idx === null) return '阶位无法识别';
    const hard = validateHard(b.item, q.quality, category, idx, op.declared);
    if (hard) return hard;
    out.category = category;
    out.tier_idx = idx;
    out.op = op.declared ? { tier: op.tier, rp: op.rp, up: op.up } : null;
    return null;
  }
  if (hasMarkers) return '物品带装备字段但品质或类型无法识别，无法定价——请补全「品质」与「类型」';

  b.kind = 'goods';
  const chk = checkPrice('goods', b.item, String(b.tier ?? '一阶'), Number(b.price), opsKey, welfareKey);
  if (!chk.ok) return chk.reason;
  out.category = '道具';
  out.tier_idx = tierIdxOf(tier);
  out.op = op.declared ? { tier: op.tier, rp: op.rp, up: op.up } : null;
  return null;
}

// ———— D1 建表（每个 isolate 只跑一次；失败下次请求重试，不让建表问题拖垮整个 Worker） ————
let schemaReady = false;
async function ensureSchema(env) {
  if (schemaReady) return;
  await env.MARKET_DB.batch([
    env.MARKET_DB.prepare(
      `CREATE TABLE IF NOT EXISTS listings (
         id TEXT PRIMARY KEY,
         client TEXT NOT NULL,
         seller TEXT NOT NULL,
         tier TEXT NOT NULL,
         kind TEXT NOT NULL,
         category TEXT NOT NULL,
         tier_idx INTEGER,
         quality TEXT,
         item_name TEXT NOT NULL,
         item_json TEXT NOT NULL,
         qty INTEGER NOT NULL,
         price INTEGER NOT NULL,
         created INTEGER NOT NULL,
         op_json TEXT
       )`,
    ),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_listings_created ON listings (created DESC)`),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_listings_client ON listings (client)`),
    env.MARKET_DB.prepare(
      `CREATE TABLE IF NOT EXISTS earnings (
         client TEXT PRIMARY KEY,
         amount INTEGER NOT NULL
       )`,
    ),
    // 出售记录（成交时写入，供卖家在「我的」查看买家名；随挂单删除而保留）
    env.MARKET_DB.prepare(
      `CREATE TABLE IF NOT EXISTS sales (
         id TEXT PRIMARY KEY,
         client TEXT NOT NULL,
         buyer TEXT NOT NULL,
         item_json TEXT NOT NULL,
         qty INTEGER NOT NULL,
         price INTEGER NOT NULL,
         created INTEGER NOT NULL
       )`,
    ),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_sales_client ON sales (client, created DESC)`),
  ]);
  // 迁移：给**已存在的旧表**补新列（CREATE TABLE IF NOT EXISTS 不会改老表结构）。
  // 列已存在时 ALTER 会报错，属预期，吞掉即可。
  const migrations = [`ALTER TABLE listings ADD COLUMN op_json TEXT`];
  for (const sql of migrations) {
    try {
      await env.MARKET_DB.prepare(sql).run();
    } catch (_) {
      /* 列已存在 */
    }
  }
  schemaReady = true;
}

/** 行 → 下发给前端的挂单对象（与旧 KV 版字段完全一致，前端零改动；超模物品多带 op） */
function rowToListing(r) {
  const op = r.op_json ? JSON.parse(r.op_json) : null;
  return {
    id: r.id,
    seller: r.seller,
    tier: r.tier,
    kind: r.kind,
    item: JSON.parse(r.item_json),
    qty: r.qty,
    price: r.price,
    created: r.created,
    ...(op ? { op } : {}),
  };
}

function json(data, headers, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, 'Content-Type': 'application/json' },
  });
}

/** 写冲突（D1 偶发 database is busy）重试几次 */
async function withRetry(fn, tries = 3) {
  let lastErr;
  for (let i = 0; i < tries; i++) {
    try {
      return await fn();
    } catch (e) {
      lastErr = e;
      if (!/busy|locked/i.test(String(e && e.message))) throw e;
      await new Promise(r => setTimeout(r, 60 * (i + 1)));
    }
  }
  throw lastErr;
}

// ════════════════════════════════════════════════════════════════════════════
// 玩家排行榜
//
// 排名依据是**等级**，不是资格分 —— 资格分每赛季清零，等级不会。
// 唯一键是**契约者姓名**：同名后来者顶掉先前者（同一个玩家换新存档也走这条），
//   服务器不做身份校验，和自由市场同一套信义模型（熟人圈子，以信义为本）。
// Lv.1 不上榜，**Lv.10 起**才能参与；等级**无上限**（可以超脱）。
// 排序：等级高的在前 → 同等级先上传的在前 → 再同则按姓名（保证名次可复现）。
//
// 建表与访问都走**独立**的 ensureRankSchema，不经过市场那套：
//   市场数据库出问题不会波及榜单，榜单建表失败也不会波及市场。
// 管理端点（/rank/admin/*）需要 Worker secret `RANK_ADMIN_KEY`；**没配就一律 403**，
//   不能因为没配就放行。密钥只存在于 Worker，前端 bundle 里拿不到。
// ════════════════════════════════════════════════════════════════════════════

const RANK_MIN_LV = 10;
const RANK_TOP_N = 20;
const RANK_NAME_MAX = 24;
const RANK_TEXT_MAX = 32;
/** 只用来挡数字垃圾，**不是玩法上限** —— 等级无上限 */
const RANK_LV_MAX = 999999;
const RANK_ORDER_SQL = `ORDER BY lv DESC, updated ASC, name ASC`;
/** 排在我前面的行：(lv 更大) 或 (同等级且传得更早) 或 (完全同键但姓名更小) */
const RANK_AHEAD_SQL = `lv > ? OR (lv = ? AND updated < ?) OR (lv = ? AND updated = ? AND name < ?)`;

/** 文本归一：空串与「无」都算没有，回落到兜底文案 */
function rankText(v, fallback) {
  const s = typeof v === 'string' ? v.trim() : '';
  return !s || s === '无' ? fallback : s;
}

/** 上传整包校验 → { ok: true, payload } 或 { ok: false, reason } */
function checkRankSubmission(b) {
  const fail = reason => ({ ok: false, reason });
  if (!b || typeof b !== 'object') return fail('bad request');

  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (!name) return fail('契约者姓名不能为空');
  if (name.length > RANK_NAME_MAX) return fail(`契约者姓名过长（上限 ${RANK_NAME_MAX} 字）`);

  const lv = Number(b.lv);
  if (!Number.isInteger(lv)) return fail('等级必须是整数');
  if (lv < RANK_MIN_LV) return fail(`Lv.${RANK_MIN_LV} 起才能参与排行（Lv.1 不上榜）`);
  if (lv > RANK_LV_MAX) return fail(`等级 ${lv} 超出合理范围`);

  const title = rankText(b.title, '无称号');
  const job = rankText(b.job, '无职业');
  if (title.length > RANK_TEXT_MAX) return fail(`称号过长（上限 ${RANK_TEXT_MAX} 字）`);
  if (job.length > RANK_TEXT_MAX) return fail(`职业过长（上限 ${RANK_TEXT_MAX} 字）`);

  return { ok: true, payload: { name, lv, title, job } };
}

/** 排行榜建表：独立于市场，失败只影响榜单 */
let rankSchemaReady = false;
async function ensureRankSchema(env) {
  if (rankSchemaReady) return;
  await env.MARKET_DB.batch([
    env.MARKET_DB.prepare(
      `CREATE TABLE IF NOT EXISTS ranks (
         name TEXT PRIMARY KEY,
         lv INTEGER NOT NULL,
         title TEXT NOT NULL,
         job TEXT NOT NULL,
         updated INTEGER NOT NULL
       )`,
    ),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_ranks_lv ON ranks (lv DESC, updated ASC, name ASC)`),
  ]);
  rankSchemaReady = true;
}

const RANK_COLS = `name, lv, title, job, updated`;
const countRanks = async db => Number((await db.prepare(`SELECT COUNT(*) AS n FROM ranks`).first())?.n ?? 0);

/**
 * D1 的 `run()` 把变更行数放在 **`meta.changes`**，不是顶层 `changes`。
 * 2026-09-22 踩过：读到 undefined 后 `?? 0` 兜底，导致管理的删除计数恒为 0
 * —— 明明删掉了却报「删了 0 条」。这里不设顶层回退，免得把同类错误再藏起来。
 */
const changesOf = r => Number(r?.meta?.changes ?? 0);

/** 名次 = 排在我前面的行数 + 1 */
async function rankOf(db, row) {
  const r = await db
    .prepare(`SELECT COUNT(*) AS n FROM ranks WHERE ${RANK_AHEAD_SQL}`)
    .bind(row.lv, row.lv, row.updated, row.lv, row.updated, row.name)
    .first();
  return Number(r?.n ?? 0) + 1;
}

/** 非榜单路径返回 null，交给下面的市场分支 */
async function handleRank(url, request, env, cors) {
  if (!url.pathname.startsWith('/rank/')) return null;
  const db = env.MARKET_DB;

  try {
    await ensureRankSchema(env);
  } catch (e) {
    return new Response('排行榜数据库初始化失败: ' + String(e && e.message ? e.message : e), { status: 500, headers: cors });
  }

  const bad = msg => new Response(msg, { status: 400, headers: cors });

  // POST /rank/submit  { name, lv, title, job }  →  { rank, total }
  // 上传后直接回名次，前端点完按钮立刻知道自己第几，省一次往返。
  if (url.pathname === '/rank/submit' && request.method === 'POST') {
    let b;
    try {
      b = await request.json();
    } catch {
      return bad('bad request');
    }
    const chk = checkRankSubmission(b);
    if (!chk.ok) return bad(chk.reason);

    const { name, lv, title, job } = chk.payload;
    const updated = Date.now();
    // 无条件覆盖 = 同名后来的顶掉先前的（换新存档等级更低也照样覆盖）
    await withRetry(() =>
      db
        .prepare(
          `INSERT INTO ranks (name, lv, title, job, updated) VALUES (?, ?, ?, ?, ?)
           ON CONFLICT(name) DO UPDATE SET lv=excluded.lv, title=excluded.title, job=excluded.job, updated=excluded.updated`,
        )
        .bind(name, lv, title, job, updated)
        .run(),
    );
    const total = await countRanks(db);
    return json({ rank: await rankOf(db, { name, lv, updated }), total }, cors);
  }

  // GET /rank/top?name=xxx  →  { list: 前 20, total, me, near }
  // 不传 name 就只出榜单（me 为 null）。
  if (url.pathname === '/rank/top' && request.method === 'GET') {
    const name = String(url.searchParams.get('name') ?? '').trim().slice(0, RANK_NAME_MAX);
    const rows = await db
      .prepare(`SELECT ${RANK_COLS} FROM ranks ${RANK_ORDER_SQL} LIMIT ?`)
      .bind(RANK_TOP_N)
      .all();
    const list = rows.results ?? [];
    const total = await countRanks(db);

    let me = null;
    let near = [];
    if (name) {
      const mine = await db.prepare(`SELECT ${RANK_COLS} FROM ranks WHERE name = ?`).bind(name).first();
      if (mine) {
        const rank = await rankOf(db, mine);
        me = { rank, entry: mine };
        // 名次在 TOP_N 之外：补「前一名 + 我 + 后一名」。
        // 起点抬到 TOP_N+1，免得把榜单区已经显示过的第 TOP_N 名重复下发。
        if (rank > RANK_TOP_N) {
          const start = Math.max(RANK_TOP_N + 1, rank - 1);
          const nb = await db
            .prepare(`SELECT ${RANK_COLS} FROM ranks ${RANK_ORDER_SQL} LIMIT ? OFFSET ?`)
            .bind(rank + 1 - start + 1, start - 1)
            .all();
          near = (nb.results ?? []).map((entry, i) => ({ rank: start + i, entry }));
        }
      }
    }
    return json({ list, total, me, near }, { ...cors, 'Cache-Control': 'no-store' });
  }

  // ———— 管理端点（运营清理）：全部要 RANK_ADMIN_KEY，密钥不对一律 403 ————
  if (url.pathname.startsWith('/rank/admin/')) {
    let b;
    try {
      b = await request.json();
    } catch {
      return bad('bad request');
    }
    // 没配就拒绝：绝不能因为环境变量缺失而放行
    if (!env.RANK_ADMIN_KEY || b.key !== env.RANK_ADMIN_KEY) {
      return new Response('forbidden', { status: 403, headers: cors });
    }
    const limit = Math.min(Math.max(Number(b.limit ?? 20) || 20, 1), 200);
    const offset = Math.max(Number(b.offset ?? 0) || 0, 0);

    // POST /rank/admin/list  { key, offset?, limit? }  →  { total, rows }  审计用
    if (url.pathname === '/rank/admin/list') {
      const rows = await db
        .prepare(`SELECT ${RANK_COLS} FROM ranks ${RANK_ORDER_SQL} LIMIT ? OFFSET ?`)
        .bind(limit, offset)
        .all();
      return json({ total: await countRanks(db), rows: rows.results ?? [] }, { ...cors, 'Cache-Control': 'no-store' });
    }

    // POST /rank/admin/delete  { key, names: [] }  →  { deleted }  定向删
    if (url.pathname === '/rank/admin/delete') {
      const names = Array.isArray(b.names) ? b.names.filter(n => typeof n === 'string' && n).slice(0, 200) : [];
      if (!names.length) return bad('names 不能为空');
      let deleted = 0;
      await withRetry(async () => {
        for (const n of names) {
          const r = await db.prepare(`DELETE FROM ranks WHERE name = ?`).bind(n.slice(0, RANK_NAME_MAX)).run();
          deleted += changesOf(r);
        }
      });
      return json({ deleted }, cors);
    }

    // POST /rank/admin/purge  { key, before?, belowLv?, aboveLv? }  →  { deleted }
    // 定期清理：删久未更新的 / 等级过低或异常高的。**不给条件就拒绝**，免得手滑清库。
    if (url.pathname === '/rank/admin/purge') {
      const where = [];
      const args = [];
      if (Number.isFinite(Number(b.before))) {
        where.push('updated < ?');
        args.push(Number(b.before));
      }
      if (Number.isFinite(Number(b.belowLv))) {
        where.push('lv < ?');
        args.push(Number(b.belowLv));
      }
      if (Number.isFinite(Number(b.aboveLv))) {
        where.push('lv > ?');
        args.push(Number(b.aboveLv));
      }
      if (!where.length) return bad('必须至少给一个条件（before / belowLv / aboveLv），否则拒绝执行');
      const r = await withRetry(() => db.prepare(`DELETE FROM ranks WHERE ${where.join(' AND ')}`).bind(...args).run());
      return json({ deleted: changesOf(r) }, cors);
    }

    // POST /rank/admin/clear  { key, confirm: 'CLEAR' }  →  { deleted }  清空
    if (url.pathname === '/rank/admin/clear') {
      if (b.confirm !== 'CLEAR') return bad('清空需要 confirm 字段字面填 CLEAR');
      const r = await withRetry(() => db.prepare(`DELETE FROM ranks`).run());
      return json({ deleted: changesOf(r) }, cors);
    }

    return new Response('not found', { status: 404, headers: cors });
  }

  return new Response('not found', { status: 404, headers: cors });
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

    // 玩家排行榜自成一段：自带 ensureRankSchema，**排在这之前**，连市场的建表都不经过 ——
    // 两边任何一方出问题都不会波及另一方。
    const rankRes = await handleRank(url, request, env, cors);
    if (rankRes) return rankRes;

    // 建表：只在需要访问数据时初始化（未建好就返回明确原因，而不是 1101）
    try {
      await ensureSchema(env);
    } catch (e) {
      return new Response('数据库初始化失败: ' + String(e && e.message ? e.message : e), { status: 500, headers: cors });
    }

    // ———— 自由市场: 玩家把背包物品挂上全服市场, 其他玩家用 UP 购买 ————
    // 挂单 id 用「毫秒时间戳-随机数」生成，字典序即时间序（老数据沿用同一格式）；
    // 列表查询走 SQL ORDER BY created DESC LIMIT，不再遍历全库 key。

    // POST /market/list  { client, seller, tier, kind, item, qty, price }  →  { id }
    if (url.pathname === '/market/list' && request.method === 'POST') {
      try {
        const b = await request.json();
        const cols = {};
        const reason = validateListing(b, cols, b.opsKey, env.WELFARE_KEY);
        if (reason) return new Response(reason, { status: 400, headers: cors });
        const id = String(Date.now()).padStart(15, '0') + '-' + Math.random().toString(36).slice(2, 8);
        await withRetry(() =>
          env.MARKET_DB.prepare(
            `INSERT INTO listings (id, client, seller, tier, kind, category, tier_idx, quality, item_name, item_json, qty, price, created, op_json)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          )
            .bind(
              id,
              b.client.slice(0, 64),
              String(b.seller ?? '无名契约者').slice(0, 24),
              String(b.tier ?? '').slice(0, 12),
              b.kind,
              cols.category ?? '道具',
              cols.tier_idx ?? null,
              parseQuality(b.item.品质)?.quality ?? null,
              String(b.item.名称).slice(0, 40),
              JSON.stringify(b.item),
              Number(b.qty),
              Number(b.price),
              Date.now(),
              cols.op ? JSON.stringify(cols.op) : null,
            )
            .run(),
        );
        return json({ id }, cors);
      } catch {
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // GET /market/listings  →  { listings: [在售挂单, 最新 50 条] }
    // 可选查询参数（服务端筛选，前端暂未使用；老前端传空即全量最新 50 条）
    if (url.pathname === '/market/listings' && request.method === 'GET') {
      try {
        const where = [];
        const args = [];
        const category = url.searchParams.get('category');
        const tierIdx = url.searchParams.get('tier');
        const quality = url.searchParams.get('quality');
        if (category) { where.push('category = ?'); args.push(category); }
        if (tierIdx !== null && tierIdx !== '') { where.push('tier_idx = ?'); args.push(Number(tierIdx)); }
        if (quality) { where.push('quality = ?'); args.push(quality); }
        const limit = Math.min(Math.max(Number(url.searchParams.get('limit') ?? 50) || 50, 1), 200);
        const sql =
          `SELECT id, seller, tier, kind, item_json, qty, price, created, op_json FROM listings` +
          (where.length ? ` WHERE ${where.join(' AND ')}` : '') +
          ` ORDER BY created DESC LIMIT ?`;
        const rows = await env.MARKET_DB.prepare(sql).bind(...args, limit).all();
        return json({ listings: (rows.results ?? []).map(rowToListing) }, { ...cors, 'Cache-Control': 'no-store' });
      } catch (e) {
        console.error('[wxhl-market] listings 查询失败', String(e));
        return new Response('市集查询失败: ' + String(e && e.message ? e.message : e), { status: 500, headers: cors });
      }
    }

    // POST /market/buy  { id, buyer, client }  →  { ok }
    //   给卖家挂账后删除挂单（买家付款在买家本地结算，服务器只记账）。
    //   成交价 = 单价 × 数量，与前端一致。
    if (url.pathname === '/market/buy' && request.method === 'POST') {
      try {
        const { id, buyer, client } = await request.json();
        const row = await env.MARKET_DB.prepare(`SELECT * FROM listings WHERE id = ?`).bind(String(id ?? '')).first();
        if (!row) return new Response('not found', { status: 404, headers: cors });
        if (client && String(client).slice(0, 64) === row.client) {
          return new Response('own listing', { status: 403, headers: cors });
        }
        const total = Number(row.price) * Number(row.qty);
        const now = Date.now();
        await withRetry(() =>
          env.MARKET_DB.batch([
            env.MARKET_DB.prepare(
              `INSERT INTO earnings (client, amount) VALUES (?, ?)
               ON CONFLICT(client) DO UPDATE SET amount = amount + excluded.amount`,
            ).bind(row.client, total),
            // 出售记录：买家名写入，卖家可在「我的」查看
            env.MARKET_DB.prepare(
              `INSERT OR REPLACE INTO sales (id, client, buyer, item_json, qty, price, created)
               VALUES (?, ?, ?, ?, ?, ?, ?)`,
            ).bind(row.id, row.client, String(buyer ?? '匿名').slice(0, 24), row.item_json, row.qty, row.price, now),
            env.MARKET_DB.prepare(`DELETE FROM listings WHERE id = ?`).bind(row.id),
          ]),
        );
        return json({ ok: true }, cors);
      } catch {
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // POST /market/cancel  { id, client }  →  卖家下架取回挂单
    if (url.pathname === '/market/cancel' && request.method === 'POST') {
      try {
        const { id, client } = await request.json();
        const row = await env.MARKET_DB.prepare(`SELECT client FROM listings WHERE id = ?`).bind(String(id ?? '')).first();
        if (!row) return new Response('not found', { status: 404, headers: cors });
        if (row.client !== String(client).slice(0, 64)) return new Response('forbidden', { status: 403, headers: cors });
        await withRetry(() =>
          env.MARKET_DB.prepare(`DELETE FROM listings WHERE id = ?`).bind(String(id)).run(),
        );
        return json({ ok: true }, cors);
      } catch {
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // POST /market/collect  { client }  →  { gained }  领取全部挂账 UP（读后即清）
    if (url.pathname === '/market/collect' && request.method === 'POST') {
      try {
        const { client } = await request.json();
        if (!client) return new Response('bad request', { status: 400, headers: cors });
        const key = String(client).slice(0, 64);
        const row = await env.MARKET_DB.prepare(`SELECT amount FROM earnings WHERE client = ?`).bind(key).first();
        const gained = Number(row?.amount ?? 0);
        if (gained > 0) {
          // 条件删除：与读取到的金额一致才清零，避免并发领取双花
          await withRetry(() =>
            env.MARKET_DB.prepare(`DELETE FROM earnings WHERE client = ? AND amount = ?`).bind(key, gained).run(),
          );
        }
        return json({ gained }, cors);
      } catch {
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // GET /market/mine?client=xxx  →  { pending, listings: [我未售出的挂单] }
    if (url.pathname === '/market/mine' && request.method === 'GET') {
      try {
        const client = String(url.searchParams.get('client') ?? '').slice(0, 64);
        const earn = await env.MARKET_DB.prepare(`SELECT amount FROM earnings WHERE client = ?`).bind(client).first();
        const rows = await env.MARKET_DB.prepare(
          `SELECT id, seller, tier, kind, item_json, qty, price, created, op_json FROM listings WHERE client = ? ORDER BY created DESC LIMIT 200`,
        )
          .bind(client)
          .all();
        return json(
          { pending: Number(earn?.amount ?? 0), listings: (rows.results ?? []).map(rowToListing) },
          { ...cors, 'Cache-Control': 'no-store' },
        );
      } catch (e) {
        console.error('[wxhl-market] mine 查询失败', String(e));
        return new Response('摊位查询失败: ' + String(e && e.message ? e.message : e), { status: 500, headers: cors });
      }
    }

    // GET /market/sales?client=xxx  →  { sales: [我的出售记录，最近 100 条，含买家名] }
    if (url.pathname === '/market/sales' && request.method === 'GET') {
      try {
        const client = String(url.searchParams.get('client') ?? '').slice(0, 64);
        const rows = await env.MARKET_DB.prepare(
          `SELECT id, buyer, item_json, qty, price, created FROM sales WHERE client = ? ORDER BY created DESC LIMIT 100`,
        )
          .bind(client)
          .all();
        return json(
          {
            sales: (rows.results ?? []).map(r => ({
              id: r.id,
              buyer: r.buyer,
              item: JSON.parse(r.item_json),
              qty: r.qty,
              price: r.price,
              created: r.created,
            })),
          },
          { ...cors, 'Cache-Control': 'no-store' },
        );
      } catch (e) {
        console.error('[wxhl-market] sales 查询失败', String(e));
        return new Response('出售记录查询失败: ' + String(e && e.message ? e.message : e), { status: 500, headers: cors });
      }
    }

    return new Response('not found', { status: 404, headers: cors });
  },
};
