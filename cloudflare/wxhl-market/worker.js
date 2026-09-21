// 无限回廊 · 自由市场 Worker
// 部署: Cloudflare Dashboard → Workers & Pages → wxhl-market → 编辑代码 → 粘贴本文件 →
//       Settings → Variables → KV Namespace Bindings 绑定一个 KV 命名空间, 变量名填 MARKET。
//       (或用 wrangler deploy, 见同目录 README.md)
// 模式: 上架即扣物/购买即扣款在玩家本地结算, 服务器只记账挂货款, 卖家随时领取;
//       服务器无法校验卖家是否真有此物, 熟人小圈子以信义为本——但价格由本 Worker 硬校验。
// 定价: 参考价 = 一阶基准价 × 阶位²(一阶×1/二阶×4/三阶×9/四阶×16/五阶×25);
//       蓝装禁溢价(≤参考上限), 金≤参考上限×1.5, 紫≤参考上限×2;
//       下限 = 参考下限×0.4(对应系统 40% 回收价); 白装/银装拒绝上架。
//       消耗品/道具(kind=goods)自由出价, 仅防刷上限。
// 注意: 本文件价格规则与 src/wxhl-003/market/priceTable.ts 是同一套, 改动须两边同步。
//       国内直连 workers.dev 不通, 需绑自定义域名(当前: market.657868.xyz)。

// ———— 一阶基准价表 [下限, 上限], 来自经济系统文档 ————
const BASE = {
  武器: { 白色: [30, 60], 蓝色: [100, 200], 金色: [400, 800], 紫色: [1500, 3000] },
  防具: { 白色: [15, 40], 蓝色: [50, 150], 金色: [250, 600], 紫色: [1000, 2000] },
  饰品: { 白色: [20, 40], 蓝色: [60, 150], 金色: [300, 700], 紫色: [1200, 2500] },
};
// 溢价上限倍率(相对参考价上限)
const PREMIUM = { 蓝色: 1.0, 金色: 1.5, 紫色: 2.0 };
// 贱卖下限倍率(相对参考价下限), 对应系统 40% 回收价
const FLOOR_RATE = 0.4;

const TIER_DIGITS = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

// 阶位 → 系数 x²; 认不出返回 null (前端已归一, 这里只做宽容解析)
function tierFactor(tier) {
  const m = String(tier ?? '').match(/[一二三四五1-5]/);
  const n = m ? TIER_DIGITS[m[0]] : null;
  return n ? n * n : null;
}

// 挂单价格校验: → { ok, min, max, reason }
export function checkPrice(kind, item, sellerTier, price) {
  const fail = (reason, min = 0, max = 0) => ({ ok: false, min, max, reason });
  if (!Number.isFinite(Number(price)) || Number(price) < 0 || Number(price) > 9999999)
    return fail('价格超出允许范围');
  if (kind === 'goods') {
    const qty = Number(item?.数量 ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return fail('数量须为 1~99 的整数');
    return { ok: true, min: 0, max: 9999999, reason: '' };
  }
  const 品质 = String(item?.品质 ?? '');
  const 类型 = String(item?.类型 ?? '');
  if (!BASE[类型]?.[品质]) return fail('装备缺少可定价的品质/类型字段');
  if (品质 === '白色') return fail('白色装备没有市场，回廊不收录');
  if (品质 === '银色') return fail('银色装备有价无市，只走剧情，不进入市场');
  const f = tierFactor(String(item?.阶位 ?? '') || sellerTier);
  if (!f) return fail('阶位无法识别');
  const ref = BASE[类型][品质];
  const min = Math.floor(ref[0] * f * FLOOR_RATE);
  const max = Math.floor(ref[1] * f * (PREMIUM[品质] ?? 1));
  if (Number(price) < min) return fail(`价格过低，不得低于 ${min} UP`, min, max);
  if (Number(price) > max) return fail(`价格过高，${品质}装备不得超过 ${max} UP`, min, max);
  return { ok: true, min, max, reason: '' };
}

// 挂单整包校验: 防脏数据写爆 KV + 价格硬校验
function validateListing(b) {
  if (!b) return 'bad request';
  if (typeof b.client !== 'string' || b.client.length === 0 || b.client.length > 64) return 'client 缺失或过长';
  if (typeof (b.seller ?? '') !== 'string' || String(b.seller).length > 24) return 'seller 过长';
  if (typeof (b.tier ?? '') !== 'string' || String(b.tier).length > 12) return 'tier 过长';
  if (b.kind !== 'equip' && b.kind !== 'goods') return 'kind 须为 equip 或 goods';
  if (!b.item || typeof b.item.名称 !== 'string' || b.item.名称.length === 0 || b.item.名称.length > 40)
    return '物品名称缺失或过长';
  if (typeof (b.item.描述 ?? '') !== 'string' || String(b.item.描述).length > 200) return '物品描述过长';
  if (!Number.isInteger(Number(b.qty)) || Number(b.qty) < 1 || Number(b.qty) > 99) return '数量须为 1~99 的整数';
  if (JSON.stringify(b.item).length > 2048) return '物品快照过大';
  const chk = checkPrice(b.kind, b.item, String(b.tier ?? '一阶'), Number(b.price));
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
          kind: b.kind,
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
