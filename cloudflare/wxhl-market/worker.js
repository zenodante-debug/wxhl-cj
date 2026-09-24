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
// 银色 2026-09-23 放开售卖准入：**基准价 = 同表紫色 × 10**（银装数值仍等同紫装，
// 但作为副本唯一剧情物品按溢价一档定价）。与 src/wxhl-003/market/priceTable.ts 必须同步。
const BASE = {
  武器: { 白色: [30, 60], 蓝色: [100, 200], 金色: [400, 800], 紫色: [1500, 3000], 银色: [15000, 30000] },
  防具: { 白色: [15, 40], 蓝色: [50, 150], 金色: [250, 600], 紫色: [1000, 2000], 银色: [10000, 20000] },
  饰品: { 白色: [20, 40], 蓝色: [60, 150], 金色: [300, 700], 紫色: [1200, 2500], 银色: [12000, 25000] },
};
// 注：原 PREMIUM（品质溢价表）自 2026-09-23 起作废，已删除。
// 允许挂单区间（2026-09-23 用户定稿）：参考价 = 基准价 × 阶位²（系统一）
//   最低 = 参考价下限 × 50%，最高 = 参考价上限 × 200%（原品质溢价表作废）
const PRICE_FLOOR_RATE = 0.5;
const PRICE_CEIL_RATE = 2;
// 道具按所填品质查武器基准（与前端 GOODS_BASE_CATEGORY 一致）
const GOODS_BASE_CATEGORY = '武器';

// ———— 装备规则基准（世界书<装备与消耗品系统>主属性加成最高值表；含超脱档 = 五阶×1.2 取整） ————
const BONUS = {
  武器: { 白色: [1, 1, 2, 4, 6, 7], 蓝色: [1, 2, 4, 6, 9, 11], 金色: [2, 3, 5, 9, 12, 14], 紫色: [3, 5, 8, 13, 18, 22], 银色: [3, 5, 8, 13, 18, 22] },
  防具: { 白色: [0, 1, 1, 2, 3, 4], 蓝色: [0, 1, 2, 3, 5, 6], 金色: [1, 2, 3, 4, 6, 7], 紫色: [2, 3, 4, 7, 10, 12], 银色: [2, 3, 4, 7, 10, 12] },
  饰品: { 白色: [0, 1, 1, 2, 3, 4], 蓝色: [0, 1, 2, 3, 5, 6], 金色: [1, 2, 3, 5, 7, 8], 紫色: [1, 3, 5, 8, 11, 14], 银色: [1, 3, 5, 8, 11, 14] },
};
const ARMOR_MULT = [1, 2, 4, 7, 11]; // 防具防/闪阶位倍率
const ARMOR_MAX_T1 = 15;             // 一阶防/闪绝对值上限（紫银极重防御）
const ARMOR_TOLERANCE = 6;
const DICE_FACES = [4, 6, 8, 10, 12, 20, 40];
const DICE_RE = /^(\d*)d(\d+)$/i;
const DICE_COUNT_MAX = 20;
const STRONG_RE = /必中|无敌|锁血|即死|无限/;

const TIER_DIGITS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

// 阶位解析（2026-09-23 支持「超脱」）：
//   一~五阶 = 1..5；超脱 = 6（经济系统里超脱是五阶之上的第 6 档，位阶修正系数 20）
//   定价系数 x²：超脱 = 五阶基准价 × 20 = 一阶基准 × 500（用户早先定稿口径）
function tierDigit(tier) {
  const s = String(tier ?? '');
  if (/超脱/.test(s)) return 6;
  const m = s.match(/[一二三四五1-5]/);
  return m ? TIER_DIGITS[m[0]] : null;
}
function tierFactor(tier) {
  const n = tierDigit(tier);
  if (!n) return null;
  return n <= 5 ? n * n : 25 * 20;
}
function tierIdxOf(tier) {
  const n = tierDigit(tier);
  return n ? n - 1 : null; // 超脱 → 5
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
  if (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 1000000000)
    return fail('价格超出允许范围');
  const 运营 = Number(price) === 0 && !!welfareKey && opsKey === welfareKey;
  const tier = String(item?.阶位 ?? '') || String(sellerTier ?? '一阶');
  const f = tierFactor(tier);
  if (!f) return fail('阶位无法识别');

  if (kind === 'goods') {
    const qty = Number(item?.数量 ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 999) return fail('数量须为 1~999 的整数');
    const q = parseQuality(item?.品质);
    if (!q) return fail('道具需填写品质（白色/蓝色/金色/紫色/银色）——请在上架界面补全后再挂单');
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
// tierIdx >= 5（超脱）：已是最顶级，其上无阶可超，数值/强效果一律跳过（只查结构）。
function validateHard(item, quality, category, tierIdx, opDeclared) {
  const eff = item.效果 && typeof item.效果 === 'object' && !Array.isArray(item.效果)
    ? Object.keys(item.效果).length : 0;
  if (eff > 3) return `效果条目数 ${eff} 条超出上限（铁律最多 2 条，破限器上限 3 条）`;

  if (!opDeclared && tierIdx < 5) {
    const 强化加成 = category === '饰品' ? Math.max(0, num(item.强化等级)) : 0;
    const bench = (BONUS[category][quality] || [])[tierIdx] ?? 0;
    const 主上限 = bench + 强化加成;
    const 副上限 = Math.floor(bench * 0.5) + 强化加成;
    if (num(item.主属性加成) > 主上限)
      return `主属性加成 ${num(item.主属性加成)} 超出该阶位最高值（${quality}${category}最高约 ${bench}${强化加成 > 0 ? `，强化+${强化加成}` : ''}）——该物品属超模物品，需支付超模上架费`;
    if (num(item.副属性加成) > 副上限)
      return `副属性加成 ${num(item.副属性加成)} 超出该阶位最高值（含强化上限 ${副上限}）——该物品属超模物品，需支付超模上架费`;

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
  if (!Number.isInteger(Number(op.rp)) || Number(op.rp) < 0 || Number(op.rp) > 1000000000) return { error: 'op.rp 非法' };
  if (!Number.isInteger(Number(op.up)) || Number(op.up) < 0 || Number(op.up) > 1000000000) return { error: 'op.up 非法' };
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

/**
 * D1 的 `run()` / `batch()` 把变更行数放在 **`meta.changes`**，不是顶层 `changes`。
 * 2026-09-22 踩过：读到 undefined 后 `?? 0` 兜底，导致管理的删除计数恒为 0
 * —— 明明删掉了却报「删了 0 条」。这里不设顶层回退，免得把同类错误再藏起来。
 *
 * 市场与排行榜共用：市场的部分购买拿它当**并发仲裁信号**（UPDATE 影响 0 行 = 没买到）。
 */
const changesOf = r => Number(r?.meta?.changes ?? 0);

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

// ════════════════════════════════════════════════════════════════════════════
// 工坊订单（v4a 第一段：建表 / 发布 / 大厅 / 原子接单）
//
// 第三次重复「独立段」的组织方式（市场 → 排行榜 → 订单）：自带 ensureOrderSchema，
// 排在 fetch 里 ensureSchema(env) **之前**，三方互不波及。照 ensureRankSchema 的模子复制。
//
// 与市场的差别：市场是「钱货两讫」的一次性交易，订单是**长流程**（待接单 → 已接单 →
// 已交付 → 已完成）。因此状态是行上的一个字段而不是「有行/无行」，
// 并发仲裁点也从 DELETE 的 affected rows 挪到 UPDATE 的 meta.changes。
// ════════════════════════════════════════════════════════════════════════════

// ———— D1 建表：订单段自带，与市场/排行榜互不波及 ————
let orderSchemaReady = false;
async function ensureOrderSchema(env) {
  if (orderSchemaReady) return;
  await env.MARKET_DB.batch([
    env.MARKET_DB.prepare(
      `CREATE TABLE IF NOT EXISTS orders (
         id TEXT PRIMARY KEY,
         poster TEXT NOT NULL,
         maker TEXT,
         spec_json TEXT NOT NULL,
         deposit INTEGER NOT NULL,
         final INTEGER NOT NULL,
         status TEXT NOT NULL,
         item_json TEXT,
         rating REAL,
         comp_json TEXT,
         maker_deposit_ack INTEGER NOT NULL DEFAULT 0,
         maker_final_ack INTEGER NOT NULL DEFAULT 0,
         poster_ack INTEGER NOT NULL DEFAULT 0,
         created INTEGER NOT NULL,
         updated INTEGER NOT NULL
       )`,
    ),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_status ON orders (status, created DESC)`),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_poster ON orders (poster)`),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_orders_maker ON orders (maker)`),
  ]);
  // 迁移：给**已存在的旧表**补新列（CREATE TABLE IF NOT EXISTS 不会改老表结构）。
  // 2026-09-23 Ruling I：原 `maker_ack`/`poster_ack` 两个「每侧一个位」换成按项三列
  // （接单者的权益分阶段产生，一个位会把尾款与退回成品永久锁死）。`poster_ack` 两版同名，
  // 只需补两个新列；老表里遗留的 `maker_ack` 变成死列，代码不再读写它。
  // 列已存在时 ALTER 会报错，属预期，吞掉即可（与市场那段补 op_json 的写法一致）。
  const orderMigrations = [
    `ALTER TABLE orders ADD COLUMN maker_deposit_ack INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE orders ADD COLUMN maker_final_ack INTEGER NOT NULL DEFAULT 0`,
    // v4b：接单人店铺名（评分归属）与赔偿款 ACK 位（弃单时发单人领取订金×3）
    `ALTER TABLE orders ADD COLUMN maker_shop TEXT`,
    `ALTER TABLE orders ADD COLUMN poster_comp_ack INTEGER NOT NULL DEFAULT 0`,
  ];
  for (const sql of orderMigrations) {
    try {
      await env.MARKET_DB.prepare(sql).run();
    } catch (_) {
      /* 列已存在 */
    }
  }
  orderSchemaReady = true;
}

/** 成品 JSON 体积上限：与市场同一口径 */
const ORDER_ITEM_MAX = 4096;

const 订单状态 = { 待接单: '待接单', 已接单: '已接单', 已交付: '已交付', 已完成: '已完成', 已取消: '已取消', 已弃单: '已弃单' };

// ———— 按项 ACK：接单者的权益是**分阶段产生**的，不能每侧只留一个位 ————
// 旧设计（每侧一个 `maker_ack`/`poster_ack`）会把后来才产生的权益永久锁死：
//   客户端在**接单时**领走订金 → 该位永久置 1 → 尾款与退回成品从此都被「该侧已领」挡住领不到，
//   而发单人一侧 ACK 后行被删 —— 发单人已 spendUP 扣掉的尾款、接单者应得的退回成品凭空消失。
//   （与 Ruling G 是同一类经济损失：钱在客户端结算，服务器只留记录，删行即蒸发。）
// 所以改成三个位：订金（接单即可领）、尾款/退回成品（互斥，共用一个位）、成品（发单人）。
/** ACK 项键 → 列名 */
const ACK_KEY_COL = {
  maker_deposit: 'maker_deposit_ack',
  maker_final: 'maker_final_ack',
  poster: 'poster_ack',
  poster_comp: 'poster_comp_ack',
};
/** 入参 (side, 项) → 列名。表中没有的组合视为非法，调用方回 400（不静默落到 poster） */
const ACK_COLS = {
  maker: { 订金: 'maker_deposit_ack', 尾款: 'maker_final_ack' },
  poster: { 成品: 'poster_ack', 赔偿: 'poster_comp_ack' },
};

/**
 * 这张单**此刻**欠哪几项待领（键名同 ACK_KEY_COL）—— 也就是「删行前必须全部领完」的那份清单。
 *
 * 要点：**非终态一律返回空**。权益是随状态推进陆续产生的（订婚金 → 交付产成品 → 验收产尾款），
 * 若在「已交付」就因双方领了当下这两项而删行，随后验收产生的尾款、或退货产生的退回成品就没了着落。
 * 只有终态（已完成 / 已取消 / 已弃单）才谈得上「权益已全部产生」。
 *
 * 已弃单（v4b）：接单者领订金（弃单不退订金），发单人领赔偿款（订金×3，走 poster_comp 位）。
 * 空清单即「无可删依据」：删行条件另有 `应领(行).length > 0` 兜底，空清单的终态行**不删、滞留**
 * （宁可滞留也不静默删行）。新增终态时**必须**先在此补上它的应领项，否则那笔权益永远不会被算作「已领」而滞留。
 * 无接单人（v4c 撤销）只有发单人有权领回。
 */
export function 应领(row) {
  if (!row.maker) return ['poster'];
  if (row.status === 订单状态.已完成) return ['maker_deposit', 'maker_final', 'poster'];
  // 已取消（交付后退货）：接单者领订金 + 退回的成品（成品走 maker_final 位），发单人什么都没有
  if (row.status === 订单状态.已取消) return ['maker_deposit', 'maker_final'];
  // 已弃单（v4b）：接单者领订金（弃单不退订金），发单人领赔偿款（订金×3，走 poster_comp 位）
  if (row.status === 订单状态.已弃单) return ['maker_deposit', 'poster_comp'];
  return [];
}

/**
 * 逐单算「此刻这个人还能领哪几项」—— `/order/mine` 的**三个视图全部由它派生**：
 * 汇总数字（`deposit`/`final`）、`items`（物）、`待领`（逐单逐项清单，客户端照它 ACK）。
 *
 * 绝不另写第二套判断：只要出现「汇总说有钱、`待领` 里却没这条」，
 * 客户端就无从 ACK 那笔钱（或那件成品）→ 权益被永久锁死 —— Ruling I / L 堵的正是这一类。
 *
 * 返回 [{ 项, 金额, 成品 }]：
 * - `项` ∈ `订金` | `尾款` | `成品`，直接就是 `/order/ack` 的入参；
 * - `金额` 计入同名的汇总数字（仅 `成品` 项为 0——它给的是物不是钱）；也是 `待领` 条目下发给客户端的
 *   **逐项金额**：客户端「先回执、后入账，只为回执成功的条目入账」，靠它认出「这项我已经发过了」，
 *   否则 ACK 失败而钱已入账时，每次刷新都会再发一遍（Ruling M）。
 * - `成品: true` 表示这一项领的是成品快照（不是 UP），值取自 `row.item_json`。
 *
 * 注意「尾款」这一个 **`maker_final` 位**承载两种权益，互斥、共用一个 `项` 名：
 * 已完成 → 尾款是**钱**；已取消（交付后退货）→ 同一个位退的是**成品**（故 `成品: true`、不进 `final` 汇总）。
 * 客户端不必区分，见 `项: '尾款'` 就 ACK 该单的 `maker_final` 位即可。
 */
function 待领项(r, who) {
  const 出 = [];
  // 订金：接单后归接单者（`maker === who` 已蕴含「已接单」）；发单人**任何状态都不加** —— 「订金不退」的全部含义。
  if (r.maker === who && r.maker_deposit_ack !== 1) 出.push({ 项: '订金', 金额: r.deposit, 成品: false });
  // 尾款（钱）：验收完成后归接单者
  if (r.maker === who && r.status === 订单状态.已完成 && r.maker_final_ack !== 1) 出.push({ 项: '尾款', 金额: r.final, 成品: false });
  // 退回的成品：同一个 `maker_final` 位（已取消只退成品、不付尾款）
  if (r.maker === who && r.status === 订单状态.已取消 && r.maker_final_ack !== 1 && r.item_json) 出.push({ 项: '尾款', 金额: 0, 成品: true });
  // 成品：交付后归发单人（**验收完成后仍归发单人**，直到他 ACK 领走 —— 已完成不能漏，否则验收完反而丢了成品）
  if (r.poster === who && (r.status === 订单状态.已交付 || r.status === 订单状态.已完成) && r.poster_ack !== 1 && r.item_json)
    出.push({ 项: '成品', 金额: 0, 成品: true });
  // 赔偿：弃单后归发单人（金额恒为订金×3，不占任何既有位）
  if (r.poster === who && r.status === 订单状态.已弃单 && r.poster_comp_ack !== 1) 出.push({ 项: '赔偿', 金额: r.deposit * 3, 成品: false });
  return 出;
}

function newOrderId() {
  return String(Date.now()).padStart(15, '0') + '-' + Math.random().toString(36).slice(2, 8);
}

/** 行 → 前端形状（spec_json 解回对象） */
function toOrderDto(row) {
  return {
    id: row.id, poster: row.poster, maker: row.maker, maker_shop: row.maker_shop ?? null,
    spec: JSON.parse(row.spec_json),
    deposit: row.deposit, final: row.final, status: row.status,
    created: row.created, updated: row.updated,
  };
}

// ———— 工坊订单: 发单人出钱、接单者出材料与图纸，交付后验收付尾款 ————
// 服务器只做中转：只留飞行中订单，双方领取后由 /order/ack 删行；不留历史与评价汇总。
async function handleOrder(url, request, env, cors) {
  const p = url.pathname;
  if (!p.startsWith('/order/')) return null;

  // 建表失败要回**带 CORS 的可读 500**，而不是让异常窜出 fetch ——
  // 那样客户端只会看到一个没有 CORS 头的 1101/500，控制台里连原因都读不出来。
  // 照 handleRank 包 ensureRankSchema 的模子来（市场那边也是同样的包法）。
  try {
    await ensureOrderSchema(env);
  } catch (e) {
    return new Response('订单数据库初始化失败: ' + String(e && e.message ? e.message : e), { status: 500, headers: cors });
  }

  // POST /order/create  { poster, spec, deposit, final }  →  { id }
  if (p === '/order/create' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const poster = String(b.poster ?? '').trim();
    if (!poster) return new Response('缺少发单人姓名', { status: 400, headers: cors });
    if (!b.spec || typeof b.spec !== 'object') return new Response('缺少需求单', { status: 400, headers: cors });
    const deposit = Number(b.deposit);
    const final = Number(b.final);
    if (!Number.isInteger(deposit) || deposit <= 0) return new Response('订金必须是正整数', { status: 400, headers: cors });
    if (!Number.isInteger(final) || final < 0) return new Response('尾款必须是非负整数', { status: 400, headers: cors });
    const spec_json = JSON.stringify(b.spec);
    if (spec_json.length > ORDER_ITEM_MAX) return new Response('需求单过长', { status: 400, headers: cors });

    const id = newOrderId();
    const now = Date.now();
    await withRetry(() =>
      env.MARKET_DB.prepare(
        `INSERT INTO orders (id, poster, maker, spec_json, deposit, final, status, created, updated)
         VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?)`,
      ).bind(id, poster, spec_json, deposit, final, 订单状态.待接单, now, now).run(),
    );
    return new Response(JSON.stringify({ id }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // GET /order/list?exclude=<姓名>  →  { orders }
  // exclude 要 trim：poster 在建单时已 trim 落库，这边不 trim 的话（客户端传了带空白的姓名），
  // 「 甲 」≠「甲」会把玩家自己的单漏进他的大厅视角。
  if (p === '/order/list' && request.method === 'GET') {
    const exclude = String(url.searchParams.get('exclude') ?? '').trim();
    const { results } = await env.MARKET_DB.prepare(
      `SELECT * FROM orders WHERE status = ? AND poster != ? ORDER BY created DESC LIMIT 100`,
    ).bind(订单状态.待接单, exclude).all();
    return new Response(JSON.stringify({ orders: (results ?? []).map(toOrderDto) }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }

  // POST /order/accept  { id, maker, maker_shop }  →  { ok: true }
  // 原子接单：WHERE 带上 status，受影响 0 行即说明已被别人接走或被撤销。
  // maker_shop 必填：评分跟着店铺走，没店就没有评分归属 —— 客户端有开店闸门，这里再挡一道。
  if (p === '/order/accept' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const maker = String(b.maker ?? '').trim();
    if (!maker) return new Response('缺少接单人姓名', { status: 400, headers: cors });
    const maker_shop = String(b.maker_shop ?? '').trim();
    if (!maker_shop) return new Response('缺少店铺名（未开店不能接单）', { status: 400, headers: cors });
    if (maker_shop.length > 32) return new Response('店铺名过长（上限 32 字）', { status: 400, headers: cors });
    const res = await withRetry(() =>
      env.MARKET_DB.prepare(
        `UPDATE orders SET maker = ?, maker_shop = ?, status = ?, updated = ? WHERE id = ? AND status = ?`,
      ).bind(maker, maker_shop, 订单状态.已接单, Date.now(), String(b.id), 订单状态.待接单).run(),
    );
    const changed = changesOf(res);
    if (changed === 0) return new Response('手慢了，这单已被接走', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  /** 读一行；不存在返回 null */
  async function readOrder(id) {
    const row = await env.MARKET_DB.prepare(`SELECT * FROM orders WHERE id = ?`).bind(id).first();
    return row ?? null;
  }

  /**
   * 带条件的状态推进；受影响 0 行 → false。
   * `AND status = ?` 是**并发守卫**：长流程里状态可能已被另一方推走（交付后又被验收/退货），
   * 0 行即说明读到的状态已过期，绝不能按旧状态覆盖回去。
   */
  async function advance(id, fromStatus, toStatus, extra = {}) {
    const 列 = Object.keys(extra);
    const 赋值 = 列.map(k => `${k} = ?`).join(', ');
    const sql = `UPDATE orders SET status = ?, updated = ?${赋值 ? ', ' + 赋值 : ''} WHERE id = ? AND status = ?`;
    const 值 = [toStatus, Date.now(), ...列.map(k => extra[k]), id, fromStatus];
    const res = await withRetry(() => env.MARKET_DB.prepare(sql).bind(...值).run());
    return changesOf(res) > 0;
  }

  // POST /order/deliver  { id, maker, item }
  // 交付：先把成品快照过体积关（与市场同一口径），再原子推进状态。
  if (p === '/order/deliver' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row || row.status !== 订单状态.已接单) return new Response('订单不存在或不在可交付状态', { status: 400, headers: cors });
    if (String(b.maker ?? '').trim() !== row.maker) return new Response('只有接单人本人能交付', { status: 400, headers: cors });
    if (!b.item || typeof b.item !== 'object') return new Response('缺少成品', { status: 400, headers: cors });
    const item_json = JSON.stringify(b.item);
    if (item_json.length > ORDER_ITEM_MAX) return new Response(`成品数据过大（${item_json.length} > ${ORDER_ITEM_MAX} 字节）`, { status: 400, headers: cors });
    if (!(await advance(row.id, 订单状态.已接单, 订单状态.已交付, { item_json })))
      return new Response('交付失败：订单状态已变', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // POST /order/confirm  { id, poster }  —— 验收（尾款由客户端结算，服务端只推进状态）
  if (p === '/order/confirm' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row || row.status !== 订单状态.已交付) return new Response('订单不存在或不在待验收状态', { status: 400, headers: cors });
    if (String(b.poster ?? '').trim() !== row.poster) return new Response('只有发单人本人能验收', { status: 400, headers: cors });
    if (!(await advance(row.id, 订单状态.已交付, 订单状态.已完成)))
      return new Response('验收失败：订单状态已变', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // POST /order/reject  { id, poster }  —— 退货（订金不退；成品回接单者待领）
  // 「订金不退」只体现在待领归属上：发单人的 claim 永远不加 deposit（见 /order/mine），
  // 而对接单者，这单已不是「待接单」，订金继续挂在他名下等他 ACK 领走 —— 不是没收。
  if (p === '/order/reject' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row || row.status !== 订单状态.已交付) return new Response('订单不存在或不在待验收状态', { status: 400, headers: cors });
    if (String(b.poster ?? '').trim() !== row.poster) return new Response('只有发单人本人能退货', { status: 400, headers: cors });
    if (!(await advance(row.id, 订单状态.已交付, 订单状态.已取消)))
      return new Response('退货失败：订单状态已变', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // POST /order/abandon  { id, maker }  —— 弃单（订金不退归接单者；发单人待领赔偿 订金×3）
  // 赔偿款由接单者客户端在收到成功后本地 spendUP 扣除（信义模型，服务端碰不到存档）。
  // 仅「已接单」可弃：已交付后成品在托管里，退路是发单人验收/退货，不许接单者一弃了之。
  if (p === '/order/abandon' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row || row.status !== 订单状态.已接单) return new Response('订单不存在或不在可弃单状态', { status: 400, headers: cors });
    if (String(b.maker ?? '').trim() !== row.maker) return new Response('只有接单人本人能弃单', { status: 400, headers: cors });
    if (!(await advance(row.id, 订单状态.已接单, 订单状态.已弃单)))
      return new Response('弃单失败：订单状态已变', { status: 400, headers: cors });
    return new Response(JSON.stringify({ ok: true }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // GET /order/mine?who=<姓名>  →  { asPoster, asMaker, claim }
  // claim 是该用户名下所有订单的待领**汇总**；领取本身发生在客户端，领完调 /order/ack。
  // 一旦 ACK 过（该项的 ack 位为 1），该项就不再出现在 claim 里 —— 汇总与「已领」互斥。
  // Ruling L：另给**显式清单** `待领: [{ id, 项, 金额 }]`，客户端照它逐条 ACK（`金额` 见 Ruling M）。
  //   只有汇总数字是不够的：ACK 是逐单逐项的（`{id, who, side, 项}`），从若干张单的**和**里
  //   反推不出该对哪张单的哪一项发 ACK；客户端若图省事把每张单的每一项都 ACK 一遍，
  //   就会**提前置位尚不存在的权益**（订单还在「已接单」就 ACK 尾款 → `maker_final_ack=1`
  //   → 等它真走到「已完成」时尾款永远领不到）。这正是 Ruling I 那一类漏洞的入口。
  if (p === '/order/mine' && request.method === 'GET') {
    const who = String(url.searchParams.get('who') ?? '').trim();
    if (!who) return new Response('缺少姓名', { status: 400, headers: cors });
    const { results } = await env.MARKET_DB.prepare(
      `SELECT * FROM orders WHERE poster = ? OR maker = ? ORDER BY updated DESC LIMIT 200`,
    ).bind(who, who).all();
    const rows = results ?? [];
    const claim = { deposit: 0, final: 0, items: [], 待领: [], comp: null };
    for (const r of rows) {
      // 三个视图（汇总数字 / `items` / `待领`）**全部**由 `待领项` 派生，绝不另写第二套判断：
      // 一个说有钱、另一个没条目，客户端就 ACK 不到，那笔钱/那件成品会被永久锁死。
      for (const p of 待领项(r, who)) {
        if (p.成品) claim.items.push({ id: r.id, item: JSON.parse(r.item_json) });
        else if (p.项 === '订金') claim.deposit += p.金额;
        else if (p.项 === '赔偿') claim.comp = (claim.comp ?? 0) + p.金额;
        else claim.final += p.金额;
        // Ruling M：条目自带**逐项金额**。客户端必须「先回执、后入账，只为回执成功的条目入账」——
        // 若 ACK 失败而钱已入账，服务器下次仍会列出该项，只有条目自带金额才能让客户端认出
        // 「这项我已经发过了」，从而跳过它；否则每次刷新都会再发一遍 → 无限刷钱。
        // `金额` 与汇总数字出自同一个 `p.金额`：`deposit` ≡ Σ(订金条目金额)、`final` ≡ Σ(尾款且金额>0)，
        // 恒等式是结构性的，不靠两处各自维护。
        claim.待领.push({ id: r.id, 项: p.项, 金额: p.金额 });
      }
    }
    return new Response(JSON.stringify({
      asPoster: rows.filter(r => r.poster === who).map(toOrderDto),
      asMaker: rows.filter(r => r.maker === who).map(toOrderDto),
      claim,
    }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  // POST /order/ack  { id, who, side, 项 }  →  { ok, deleted, first }
  // 按**项**标记领取：maker 领 订金/尾款（尾款位同时承载退货后的退回成品），poster 领 成品。
  // 订单已到终态、`应领(行)` 非空、且其每一项都已置位 → 删行（这是"服务器不撑爆"的关键）。
  // 幂等：行已被另一边删掉就当「已领完」返回 deleted:true；同一项重复 ACK 改 0 行 → first:false。
  //
  // `first` 是**双开标签页的双发闸**：UPDATE 带 `AND <列>=0`，只有真正把 0 翻成 1 的那次回
  // first:true。两个标签页共享同一存档，各自读到的待领清单相同——没有这个闸，两页都会
  // 把同一笔权益入一次账（双发钱/双入包）。客户端据此「只为 first=true 的条目入账」。
  if (p === '/order/ack' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch (_) { return new Response('请求体不是合法 JSON', { status: 400, headers: cors }); }
    const row = await readOrder(String(b.id));
    if (!row) return new Response(JSON.stringify({ ok: true, deleted: true, first: false }), { headers: { ...cors, 'Content-Type': 'application/json' } }); // 已被另一边删掉，幂等（且非首次：权益早被领走）
    // side 与 项 都必须**显式合法**：拼错或缺席不得静默按 poster 处理（那会替发单人把成品位置上）
    const side = b.side;
    if (side !== 'maker' && side !== 'poster') return new Response('side 须为 maker 或 poster', { status: 400, headers: cors });
    const sideCols = ACK_COLS[side];
    const 列 = Object.prototype.hasOwnProperty.call(sideCols, b.项) ? sideCols[b.项] : null;
    if (!列) return new Response('side 与 项 不匹配（maker 领 订金/尾款，poster 领 成品/赔偿）', { status: 400, headers: cors });
    // 当事人校验：`who` 必须**逐字**等于该侧的当事人，不等即 400。
    // 这里**不给「该侧尚无当事人」留放行分支**（待接单的单 maker 为 NULL）：
    // 发单人的订金是他在客户端 spendUP 扣掉的、服务器只留记录，
    // 若任由第三方把一张从未被接单的单两边 ACK 掉，行被删而订金没有任何接单人 gainUP 补上
    // —— 那笔钱就凭空消失了。所以空单的 maker 侧必须领不了。
    if (String(b.who ?? '').trim() !== (side === 'maker' ? row.maker : row.poster))
      return new Response('不是该订单的当事人', { status: 400, headers: cors });
    // 条件置位：该位已是 1（另一标签页刚领过）→ 改 0 行 → first:false，客户端不再入账。
    // 与 accept 的 status 守卫同一手法：UPDATE 的 meta.changes 就是并发仲裁信号。
    const upd = await withRetry(() =>
      env.MARKET_DB.prepare(`UPDATE orders SET ${列} = 1, updated = ? WHERE id = ? AND ${列} = 0`).bind(Date.now(), row.id).run(),
    );
    const first = changesOf(upd) > 0;
    const after = await readOrder(row.id);
    // 只有**终态**、且该状态应领的项**全部**置位才删行。
    // 非终态（待接单/已接单/已交付）一律不删：权益还在陆续产生（交付产成品、验收产尾款），
    // 此刻把行删掉，随后产生的尾款或退回成品就没了着落 —— 与 Ruling G 同类，钱会凭空蒸发。
    const 终态 = !!after && (after.status === 订单状态.已完成 || after.status === 订单状态.已取消 || after.status === 订单状态.已弃单);
    // `应领(行).length > 0` 是**给未来状态兜底**：新增终态时若忘了在 `应领` 里补上它的应领项，
    // 空清单会让 `.every()` 空真成立 → 行被静默删掉，还没领的赔偿款凭空丢失。
    // 宁可让行滞留（由 v4c 的 purge 兜底），也不能静默删行 —— 滞留可救，丢失不可救。
    const 欠 = 终态 ? 应领(after) : [];
    const deleted = 欠.length > 0 && 欠.every(k => after[ACK_KEY_COL[k]] === 1);
    if (deleted) await withRetry(() => env.MARKET_DB.prepare(`DELETE FROM orders WHERE id = ?`).bind(row.id).run());
    return new Response(JSON.stringify({ ok: true, deleted, first }), { headers: { ...cors, 'Content-Type': 'application/json' } });
  }

  return new Response('未知的订单操作', { status: 404, headers: cors });
}

// ════════════════════════════════════════════════════════════════════════════
// 店铺评分（v4b）：订单信誉的**分数制**——完成 +1、验收评分 0–5、退货 −2、弃单 −5。
// 主键是**店铺名**（跟着店名走：改名 = 新店从 0；同名店铺共享一行，用户已确认）。
// 第四次复制「独立段」组织方式（市场 → 排行榜 → 订单 → 店铺评分）：自带 ensureShopSchema，
// 排在 fetch 里 ensureSchema(env) **之前**，四方互不波及。照 handleRank 的模子复制。
// 信义模型：分数由客户端在原子状态转换成功后自报，服务端不校验来源（与赔偿款同一信任级别）。
// ════════════════════════════════════════════════════════════════════════════

const SHOP_TOP_N = 20;
const SHOP_NAME_MAX = 32;
/** 只用来挡数字垃圾，**不是玩法上限** —— 合法 delta ∈ [−5, +6] */
const SHOP_DELTA_MAX = 100;
const SHOP_ORDER_SQL = `ORDER BY score DESC, updated ASC, name ASC`;
/** 排在我前面的行：(分更高) 或 (同分且到得更早) 或 (完全同键但店名更小) */
const SHOP_AHEAD_SQL = `score > ? OR (score = ? AND updated < ?) OR (score = ? AND updated = ? AND name < ?)`;
const SHOP_COLS = `name, score, updated`;

/** 店铺评分建表：独立于市场/排行榜/订单，失败只影响本段 */
let shopSchemaReady = false;
async function ensureShopSchema(env) {
  if (shopSchemaReady) return;
  await env.MARKET_DB.batch([
    env.MARKET_DB.prepare(
      `CREATE TABLE IF NOT EXISTS shop_scores (
         name TEXT PRIMARY KEY,
         score INTEGER NOT NULL DEFAULT 0,
         updated INTEGER NOT NULL
       )`,
    ),
    env.MARKET_DB.prepare(`CREATE INDEX IF NOT EXISTS idx_shop_scores ON shop_scores (score DESC, updated ASC, name ASC)`),
  ]);
  shopSchemaReady = true;
}

const countShops = async db => Number((await db.prepare(`SELECT COUNT(*) AS n FROM shop_scores`).first())?.n ?? 0);

/** 名次 = 排在我前面的行数 + 1 */
async function shopRankOf(db, row) {
  const r = await db
    .prepare(`SELECT COUNT(*) AS n FROM shop_scores WHERE ${SHOP_AHEAD_SQL}`)
    .bind(row.score, row.score, row.updated, row.score, row.updated, row.name)
    .first();
  return Number(r?.n ?? 0) + 1;
}

/** 非店铺路径返回 null，交给下面的市场分支 */
async function handleShop(url, request, env, cors) {
  if (!url.pathname.startsWith('/shop/')) return null;
  const db = env.MARKET_DB;

  try {
    await ensureShopSchema(env);
  } catch (e) {
    return new Response('店铺评分数据库初始化失败: ' + String(e && e.message ? e.message : e), { status: 500, headers: cors });
  }

  // POST /shop/score  { name, delta }  →  { score }
  // 信义模型：不校验来源。delta 钳在非零整数且 |delta| ≤ SHOP_DELTA_MAX，只挡数字垃圾。
  if (url.pathname === '/shop/score' && request.method === 'POST') {
    let b;
    try { b = await request.json(); } catch { return new Response('bad request', { status: 400, headers: cors }); }
    const name = String(b?.name ?? '').trim();
    if (!name) return new Response('店铺名不能为空', { status: 400, headers: cors });
    if (name.length > SHOP_NAME_MAX) return new Response(`店铺名过长（上限 ${SHOP_NAME_MAX} 字）`, { status: 400, headers: cors });
    const delta = Number(b?.delta);
    if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > SHOP_DELTA_MAX)
      return new Response(`delta 必须是非零整数且 |delta| ≤ ${SHOP_DELTA_MAX}`, { status: 400, headers: cors });
    await withRetry(() =>
      db.prepare(
        `INSERT INTO shop_scores (name, score, updated) VALUES (?, ?, ?)
         ON CONFLICT(name) DO UPDATE SET score = score + excluded.score, updated = excluded.updated`,
      ).bind(name, delta, Date.now()).run(),
    );
    const row = await db.prepare(`SELECT score FROM shop_scores WHERE name = ?`).bind(name).first();
    return json({ score: Number(row?.score ?? delta) }, cors);
  }

  // GET /shop/rank?name=<店铺名>  →  { list: 前 20, total, me, near }
  // 不传 name 就只出榜单（me 为 null）。形状与 /rank/top 完全一致。
  if (url.pathname === '/shop/rank' && request.method === 'GET') {
    const name = String(url.searchParams.get('name') ?? '').trim().slice(0, SHOP_NAME_MAX);
    const rows = await db.prepare(`SELECT ${SHOP_COLS} FROM shop_scores ${SHOP_ORDER_SQL} LIMIT ?`).bind(SHOP_TOP_N).all();
    const list = rows.results ?? [];
    const total = await countShops(db);

    let me = null;
    let near = [];
    if (name) {
      const mine = await db.prepare(`SELECT ${SHOP_COLS} FROM shop_scores WHERE name = ?`).bind(name).first();
      if (mine) {
        const rank = await shopRankOf(db, mine);
        me = { rank, entry: mine };
        if (rank > SHOP_TOP_N) {
          const start = Math.max(SHOP_TOP_N + 1, rank - 1);
          const nb = await db
            .prepare(`SELECT ${SHOP_COLS} FROM shop_scores ${SHOP_ORDER_SQL} LIMIT ? OFFSET ?`)
            .bind(rank + 1 - start + 1, start - 1)
            .all();
          near = (nb.results ?? []).map((entry, i) => ({ rank: start + i, entry }));
        }
      }
    }
    return json({ list, total, me, near }, { ...cors, 'Cache-Control': 'no-store' });
  }

  return new Response('not found', { status: 404, headers: cors });
}

const RANK_COLS = `name, lv, title, job, updated`;
const countRanks = async db => Number((await db.prepare(`SELECT COUNT(*) AS n FROM ranks`).first())?.n ?? 0);

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

    // 工坊订单自成一段：自带 ensureOrderSchema，同样排在建表之前，与市场/排行榜三方互不波及。
    const orderRes = await handleOrder(url, request, env, cors);
    if (orderRes) return orderRes;

    // 店铺评分自成一段：同样排在市场建表之前，与市场/排行榜/订单四方互不波及。
    const shopRes = await handleShop(url, request, env, cors);
    if (shopRes) return shopRes;

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

    // POST /market/buy  { id, buyer, client, qty }  →  { ok, bought }
    //   支持**部分购买**：只买走 qty 件，剩余继续挂在市场上（买家付款在买家本地结算，
    //   手续费也是买家本地扣的，服务器只按 单价 × 买走数量 给卖家记账）。
    //   并发仲裁：四条语句都带 `qty >= ?` 守卫，库存不够时**一条都不动**；
    //   看 UPDATE 那步的 meta.changes 就知道有没有成交（0 = 被别人抢先，回 409）。
    //   整个 batch 是一个事务，不存在「扣了库存没记账」的中间态。
    if (url.pathname === '/market/buy' && request.method === 'POST') {
      try {
        const { id, buyer, client, qty } = await request.json();
        const lid = String(id ?? '');
        const row = await env.MARKET_DB.prepare(`SELECT client, qty FROM listings WHERE id = ?`).bind(lid).first();
        if (!row) return new Response('not found', { status: 404, headers: cors });
        if (client && String(client).slice(0, 64) === row.client) {
          return new Response('own listing', { status: 403, headers: cors });
        }
        // 不传 qty = 买光剩余（旧客户端/旧 dist 包的原有行为，别把它们弄瘸）；
        // 显式传了就必须是 ≥1 的整数。JSON 里 qty:null 视为非法，不当作「没传」。
        const want = qty === undefined ? Number(row.qty) : Number(qty);
        if (!Number.isInteger(want) || want < 1) {
          return new Response('购买数量须为 1 以上的整数', { status: 400, headers: cors });
        }
        const now = Date.now();
        // 每笔成交一个**唯一** id：同一挂单多次成交不能互相覆盖（旧代码用挂单 id 作主键会顶掉）
        const saleId = `${lid}-${now.toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        const results = await withRetry(() =>
          env.MARKET_DB.batch([
            // 1) 条件记出售记录（库存够才记）
            env.MARKET_DB.prepare(
              `INSERT OR REPLACE INTO sales (id, client, buyer, item_json, qty, price, created)
               SELECT ?, client, ?, item_json, ?, price, ? FROM listings WHERE id = ? AND qty >= ?`,
            ).bind(saleId, String(buyer ?? '匿名').slice(0, 24), want, now, lid, want),
            // 2) 条件记账货款（单价 × 买走数量）。SELECT 形式下 WHERE 用来消解 ON 的歧义
            env.MARKET_DB.prepare(
              `INSERT INTO earnings (client, amount)
               SELECT client, price * ? FROM listings WHERE id = ? AND qty >= ?
               ON CONFLICT(client) DO UPDATE SET amount = amount + excluded.amount`,
            ).bind(want, lid, want),
            // 3) 原子扣减 —— 并发仲裁点
            env.MARKET_DB.prepare(`UPDATE listings SET qty = qty - ? WHERE id = ? AND qty >= ?`).bind(want, lid, want),
            // 4) 卖光了才删挂单
            env.MARKET_DB.prepare(`DELETE FROM listings WHERE id = ? AND qty <= 0`).bind(lid),
          ]),
        );
        if (changesOf(results[2]) === 0) {
          return new Response('库存不足：这件挂单的剩余数量已经变了，请刷新后再买', { status: 409, headers: cors });
        }
        return json({ ok: true, bought: want }, cors);
      } catch (e) {
        console.error('[wxhl-market] buy 失败', String(e));
        return new Response('bad request', { status: 400, headers: cors });
      }
    }

    // POST /market/cancel  { id, client }  →  { ok, returned }  卖家下架取回
    //   回传**服务端此刻的剩余数量**：部分成交后客户端缓存的那份 qty 是陈旧的，
    //   按它往背包加会让卖家多拿回物品。
    //   删除影响 0 行 = 这单已经被别人下架/买光 → 404，避免并发下架把物品加回两次。
    if (url.pathname === '/market/cancel' && request.method === 'POST') {
      try {
        const { id, client } = await request.json();
        const lid = String(id ?? '');
        const row = await env.MARKET_DB.prepare(`SELECT client, qty FROM listings WHERE id = ?`).bind(lid).first();
        if (!row) return new Response('not found', { status: 404, headers: cors });
        if (row.client !== String(client ?? '').slice(0, 64)) return new Response('forbidden', { status: 403, headers: cors });
        const del = await withRetry(() => env.MARKET_DB.prepare(`DELETE FROM listings WHERE id = ?`).bind(lid).run());
        if (changesOf(del) === 0) return new Response('not found', { status: 404, headers: cors });
        return json({ ok: true, returned: Number(row.qty) }, cors);
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
