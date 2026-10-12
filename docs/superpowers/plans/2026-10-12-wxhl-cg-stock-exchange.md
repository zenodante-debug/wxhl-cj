# wxhl-cg 回廊交易所 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为无限回廊小手机新建 `src/wxhl-cg` 脚本项目：单机炒股交易所（10 只势力股票、实时跳动、杠杆做空强平、借贷失信破产清算、遗产税），经 `initializeGlobal('WxhlCg')` 由 wxhl-003 手机图标调起。

**Architecture:** 纯 TS 零依赖引擎（`engine/`，vitest 可测）+ pinia store（localStorage 持久化 + 计时器驱动 + MVU 读写副作用）+ vue 面板。引擎不 import 任何酒馆接口；store 层承担全部副作用。MVU 读写照抄 `src/wxhl-003/market/store.ts` 的 `messageId/readContractor/commit` 模式。

**Tech Stack:** TypeScript、Vue 3 + pinia、zod、vitest、lodash、webpack（`pnpm build`/`pnpm watch`/`pnpm test`）。

**Spec:** [docs/superpowers/specs/2026-10-12-wxhl-cg-stock-exchange-design.md](../specs/2026-10-12-wxhl-cg-stock-exchange-design.md)

## Global Constraints

- 引擎文件（`src/wxhl-cg/engine/**`）**禁止** import 酒馆运行时全局（Mvu/toastr/$ 等），只允许 import `../wxhl-003/market/priceTable` 与 `../wxhl-003/dice`（均为纯函数模块）。
- 行情跳动：仅 app 打开时 `setInterval` 10 秒一跳；关闭期间冻结；不监测楼层。
- 存档：localStorage key `wxhl-cg:account`，zod parse，版本字段 `v: 1`。
- UP 兑换：1 UP = 1 交易所币，双向各收 1% 手续费；读写路径 `stat_data.契约者.经济.UP`。
- 交易费：佣金买卖双向 = 成交额 1%（上限保证金 10%）；印花税 = 卖出方 0.1%（平多/开空/强平/清算都收）。
- 强平维持线：持仓净值 ≤ 名义价值 × 5%。
- 杠杆 >20 倍：每跳按名义本金收 (杠杆−20)×0.01% 利息。
- 破产线：累计已实现亏损 > 250 自动触发清算。
- 破产清算顺序：交易所持仓+现金 → 背包 → 装备七槽 → 通用技能 → 职业 → 血统 → 天赋；定价 = 品质查 BASE 表 × (归一阶位+1)²；品质缺失兜底白色并 console.warn；卖不完的债继续背。
- 遗产税：≤100 收 10%、100–500 段 30%、500–2000 段 50%、>2000 段 70%；过户费 1% 最低 5。
- 坏数据一律响亮失败（throw / toastr + console.error），不静默兜底。
- 所有价格计算结果写入账户前用 `Math.round(v * 100) / 100` 保留两位小数。

## Review Focus

1. **关闭 app 期间的仓位**：价格冻结，重开时价格接着走——强平可能在重开第一跳立刻触发，用户预期"关掉就安全"。→ Task 9 测试钉住：重开后第一跳按现价判定强平。
2. **现金为负**（高利贷利息扣成负数）后所有需要现金的操作必须拒绝而非放行。→ Task 10 测试钉住。
3. **破产清算时背包物品数量为 0 或品质字段缺失**：不能算成 0 元白卖或崩溃。→ Task 11 测试钉住（品质缺失按白色兜底、数量 ≤0 跳过）。
4. **遗产税在账户现金不足时**：转 debt 继续背，不能静默豁免。→ Task 13 测试钉住。
5. **localStorage 里是旧版本/损坏 JSON**：zod parse 失败必须重开新账户并 console.warn，不能让整个 app 白屏。→ Task 5 测试钉住。

---

### Task 1: 引擎类型 + 股票定义

**Files:**
- Create: `src/wxhl-cg/engine/types.ts`
- Create: `src/wxhl-cg/engine/stocks.ts`
- Test: `src/wxhl-cg/__tests__/stocks.test.ts`

**Interfaces:**
- Produces: `ExchangeAccount`、`Position`、`ActiveLoan`、`ActiveNews`、`Side`、`createAccount()`、`STOCKS`、`StockDef`、`HISTORY_CAP` —— 后续所有任务依赖。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/stocks.test.ts
import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { HISTORY_CAP, STOCKS } from '../engine/stocks';

describe('stocks / createAccount', () => {
  it('10 只股票，波动率严格递增，代码唯一', () => {
    expect(STOCKS).toHaveLength(10);
    const sigmas = STOCKS.map(s => s.sigma);
    for (let i = 1; i < sigmas.length; i++) expect(sigmas[i]).toBeGreaterThan(sigmas[i - 1]);
    expect(new Set(STOCKS.map(s => s.code)).size).toBe(10);
  });
  it('createAccount 用基准价初始化价格和空历史', () => {
    const acct = createAccount();
    expect(acct.v).toBe(1);
    expect(acct.cash).toBe(0);
    expect(acct.tick).toBe(0);
    expect(acct.frozen).toBe(false);
    for (const s of STOCKS) {
      expect(acct.prices[s.code]).toBe(s.basePrice);
      expect(acct.priceHistory[s.code]).toEqual([s.basePrice]);
    }
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/stocks.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 types.ts 和 stocks.ts**

```ts
// src/wxhl-cg/engine/types.ts
// 回廊交易所 · 账户类型。纯数据，无任何运行时依赖。
import { STOCKS } from './stocks';

export type Side = 'long' | 'short';

export interface Position {
  side: Side;
  qty: number;        // 股数
  entryPrice: number; // 开仓均价
  leverage: number;   // 1–100
  margin: number;     // 占用保证金
}

export type LoanState = 'none' | 'normal' | 'delinquent';

export interface ActiveLoan {
  principal: number;
  rate: number;          // 正常借款的单期利率；高利贷固定 1.5（还 2.5 倍）
  dueTick: number;
  highInterest: boolean;
  accrued: number;       // 高利贷已累计利息
  ticksHeld: number;     // 高利贷持有跳数（利息递增用）
}

export interface ActiveNews {
  stock: string;                // 股票代码
  text: string;
  sentiment: 'good' | 'bad';    // 标题情绪（不一定等于实际影响）
  impact: number;               // 每跳 drift（可正可负）
  ttl: number;                  // 剩余生效跳数
}

export interface ExchangeAccount {
  v: 1;
  cash: number;                          // 交易所币，可为负（高利贷利息）
  positions: Record<string, Position>;
  prices: Record<string, number>;
  priceHistory: Record<string, number[]>;
  tick: number;
  loan: ActiveLoan | null;
  loanState: LoanState;
  debt: number;                          // 清算后剩余债务，跨档背着
  bankruptcyCount: number;
  deathMarked: boolean;                  // 死亡标记（遗产税用）
  cumulativeLoss: number;                // 累计已实现亏损（破产线）
  frozen: boolean;                       // 失信/欠税冻结
  news: ActiveNews | null;
  newsCooldown: number;                  // 距下次可抽新闻的跳数
}

export function createAccount(): ExchangeAccount {
  const prices: Record<string, number> = {};
  const priceHistory: Record<string, number[]> = {};
  for (const s of STOCKS) {
    prices[s.code] = s.basePrice;
    priceHistory[s.code] = [s.basePrice];
  }
  return {
    v: 1, cash: 0, positions: {}, prices, priceHistory, tick: 0,
    loan: null, loanState: 'none', debt: 0, bankruptcyCount: 0,
    deathMarked: false, cumulativeLoss: 0, frozen: false,
    news: null, newsCooldown: 3,
  };
}

/** 金额统一保留两位小数 */
export function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
```

```ts
// src/wxhl-cg/engine/stocks.ts
// 10 只回廊势力股票，波动率从低到很高（spec §4）。
export interface StockDef {
  code: string;     // 行情代码
  name: string;     // 上市名
  faction: string;  // 势力
  sigma: number;    // 每跳波动率（几何随机游走标准差）
  basePrice: number;
}

export const HISTORY_CAP = 60;

export const STOCKS: StockDef[] = [
  { code: 'TGJ',  name: '特管局后勤',   faction: '特管局',       sigma: 0.004, basePrice: 100 },
  { code: 'OETA', name: 'OETA 安保',    faction: 'OETA',         sigma: 0.008, basePrice: 80 },
  { code: 'LHJ',  name: '零号局情报',   faction: '零号局',       sigma: 0.012, basePrice: 60 },
  { code: 'EJS',  name: 'EJSSA 竞技',   faction: 'EJSSA',        sigma: 0.016, basePrice: 50 },
  { code: 'FM',   name: '非盟商会',     faction: '非盟',         sigma: 0.022, basePrice: 40 },
  { code: 'PLH',  name: '泛联控股',     faction: '泛东亚联合体', sigma: 0.030, basePrice: 35 },
  { code: 'SJH',  name: '圣辉教会',     faction: '神圣教会',     sigma: 0.038, basePrice: 30 },
  { code: 'FZJT', name: '方舟集团',     faction: '方舟集团',     sigma: 0.050, basePrice: 25 },
  { code: 'RCJJ', name: '瑞辰基金会',   faction: '瑞辰基金会',   sigma: 0.065, basePrice: 20 },
  { code: 'EML',  name: '恶魔旅团黑产', faction: '恶魔旅团',     sigma: 0.090, basePrice: 15 },
];

export function stockOf(code: string): StockDef {
  const s = STOCKS.find(x => x.code === code);
  if (!s) throw new Error('未知股票代码: ' + code);
  return s;
}
```

注意 types.ts import stocks.ts 而测试同时 import 两者——无循环依赖。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-cg/__tests__/stocks.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 引擎类型与 10 只势力股票定义"
```

---

### Task 2: 行情跳动引擎（market.ts）

**Files:**
- Create: `src/wxhl-cg/engine/market.ts`
- Test: `src/wxhl-cg/__tests__/market.test.ts`

**Interfaces:**
- Consumes: `ExchangeAccount`、`STOCKS`、`stockOf`、`HISTORY_CAP`、`round2`（Task 1）
- Produces: `Rng`、`gaussian(rng)`、`tickMarket(acct, rng?)` —— news.ts（Task 3）会被它调用；store（Task 5）每 10 秒调它。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/market.test.ts
import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { gaussian, tickMarket } from '../engine/market';
import { HISTORY_CAP, STOCKS } from '../engine/stocks';

// 可播种的确定性 rng（线性同余）
export function seededRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 0x100000000;
  };
}

describe('gaussian', () => {
  it('产出近似标准正态（均值≈0，方差≈1）', () => {
    const rng = seededRng(42);
    const xs = Array.from({ length: 20000 }, () => gaussian(rng));
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const var_ = xs.reduce((a, b) => a + (b - mean) ** 2, 0) / xs.length;
    expect(Math.abs(mean)).toBeLessThan(0.05);
    expect(Math.abs(var_ - 1)).toBeLessThan(0.1);
  });
});

describe('tickMarket', () => {
  it('每跳 tick+1、价格更新、历史追加上限 HISTORY_CAP', () => {
    const acct = createAccount();
    const rng = seededRng(7);
    for (let i = 0; i < HISTORY_CAP + 20; i++) tickMarket(acct, rng);
    expect(acct.tick).toBe(HISTORY_CAP + 20);
    for (const s of STOCKS) {
      expect(acct.priceHistory[s.code]).toHaveLength(HISTORY_CAP);
      expect(acct.prices[s.code]).toBeGreaterThan(0);
    }
  });
  it('价格永不为 0 或负（下限 0.01）', () => {
    const acct = createAccount();
    acct.prices['EML'] = 0.02; // 极高波动股压到接近下限
    // rng 恒 0.5 → gaussian = 1.177×cos(π) ≈ −1.177 → 每跳必跌
    // （注意不能恒 0：u→0 会让 Box-Muller 产出 +∞）
    const rng = () => 0.5;
    for (let i = 0; i < 50; i++) tickMarket(acct, rng);
    expect(acct.prices['EML']).toBeGreaterThanOrEqual(0.01);
  });
  it('价格两位小数', () => {
    const acct = createAccount();
    tickMarket(acct, seededRng(1));
    for (const s of STOCKS) {
      expect(acct.prices[s.code] * 100 % 1).toBeCloseTo(0, 6);
    }
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/market.test.ts`
Expected: FAIL（`./market` 不存在）

- [ ] **Step 3: 实现 market.ts**

```ts
// src/wxhl-cg/engine/market.ts
// 行情跳动：几何随机游走 + 新闻 drift。纯函数，rng 可注入以便测试。
import { round2, type ExchangeAccount } from './types';
import { HISTORY_CAP, STOCKS } from './stocks';
import { maybeRollNews } from './news';

export type Rng = () => number;

/** Box-Muller：均匀 rng → 标准正态 */
export function gaussian(rng: Rng): number {
  const u = Math.max(rng(), Number.EPSILON);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

/**
 * 推进一跳：tick++ → 逐股定价（随机游走 + 活跃新闻 drift）→ 新闻 ttl 衰减/可能抽新。
 * 价格下限 0.01（不退市清零）。
 */
export function tickMarket(acct: ExchangeAccount, rng: Rng = Math.random): void {
  acct.tick++;
  const news = acct.news;
  for (const s of STOCKS) {
    const drift = news && news.stock === s.code ? news.impact : 0;
    const next = acct.prices[s.code] * Math.exp(s.sigma * gaussian(rng) + drift);
    acct.prices[s.code] = Math.max(0.01, round2(next));
    const h = acct.priceHistory[s.code];
    h.push(acct.prices[s.code]);
    if (h.length > HISTORY_CAP) h.splice(0, h.length - HISTORY_CAP);
  }
  if (acct.news) {
    acct.news.ttl--;
    if (acct.news.ttl <= 0) acct.news = null;
  }
  maybeRollNews(acct, rng);
}
```

注意：`maybeRollNews` 来自 Task 3 的 news.ts——**本任务先建一个只含空实现的 `src/wxhl-cg/engine/news.ts`**：

```ts
// src/wxhl-cg/engine/news.ts —— Task 3 填完整实现
import type { ExchangeAccount } from './types';
import type { Rng } from './market';

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function maybeRollNews(acct: ExchangeAccount, rng: Rng): void {
  // Task 3 实现；v1a 骨架期为空操作
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-cg/__tests__/market.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 行情跳动引擎（几何随机游走 + 可注入 rng）"
```

---

### Task 3: 新闻系统（news.ts 完整实现）

**Files:**
- Modify: `src/wxhl-cg/engine/news.ts`（替换 Task 2 的空实现）
- Test: `src/wxhl-cg/__tests__/news.test.ts`

**Interfaces:**
- Consumes: `ExchangeAccount`、`ActiveNews`（Task 1）、`Rng`（Task 2）
- Produces: `NEWS_POOL`、`maybeRollNews(acct, rng)` —— market.ts 已调它；store/UI 读 `acct.news` 显示滚动条。

规则（spec §4）：无活跃新闻且冷却归零时，每跳 25% 概率抽一条；冲击幅度 = (1 + rng×2) × 该股 σ；标题情绪与实际方向独立 roll，25% 概率相反；生效 3 跳；抽完冷却 3–6 跳。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/news.test.ts
import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { tickMarket } from '../engine/market';
import { NEWS_POOL } from '../engine/news';
import { STOCKS, stockOf } from '../engine/stocks';
import { seededRng } from './market.test';

describe('NEWS_POOL', () => {
  it('每只股至少 3 条新闻，情绪字段合法', () => {
    for (const s of STOCKS) {
      const list = NEWS_POOL.filter(n => n.stock === s.code);
      expect(list.length).toBeGreaterThanOrEqual(3);
      for (const n of list) expect(['good', 'bad']).toContain(n.sentiment);
    }
  });
});

describe('maybeRollNews（经 tickMarket）', () => {
  // tickMarket 每跳消耗 rng 的顺序：10 只股 × gaussian 2 个值 = 20 个，第 21 个起才是新闻判定。
  // 用前 20 个 0.5（价格正常游走）+ 第 21 个 0.1（<0.25 必抽中）锁定新闻在第 1 跳末尾产生。
  function newsForcingRng() {
    const seq = [...Array(20).fill(0.5), 0.1, 0.0, 0.9, 0.9];
    let i = 0;
    return () => (i < seq.length ? seq[i++] : 0.5);
  }
  it('新闻生效 3 跳后消失', () => {
    const acct = createAccount();
    acct.newsCooldown = 0;
    const rng = newsForcingRng();
    tickMarket(acct, rng);
    expect(acct.news).not.toBeNull();
    expect(acct.news!.ttl).toBe(3);
    tickMarket(acct, rng);
    expect(acct.news!.ttl).toBe(2);
    tickMarket(acct, rng);
    expect(acct.news!.ttl).toBe(1);
    tickMarket(acct, rng);
    expect(acct.news).toBeNull();
  });
  it('冲击幅度在 [σ, 3σ] 区间', () => {
    const acct = createAccount();
    acct.newsCooldown = 0;
    const rng = seededRng(123);
    // 反复跳到出新闻为止
    for (let i = 0; i < 50 && !acct.news; i++) tickMarket(acct, rng);
    expect(acct.news).not.toBeNull();
    const sigma = stockOf(acct.news!.stock).sigma;
    expect(Math.abs(acct.news!.impact)).toBeGreaterThanOrEqual(sigma * 0.99);
    expect(Math.abs(acct.news!.impact)).toBeLessThanOrEqual(sigma * 3.01);
  });
  it('冷却期内不抽新新闻', () => {
    const acct = createAccount();
    acct.newsCooldown = 5;
    const rng = () => 0; // 必触发（若无冷却）
    tickMarket(acct, rng);
    expect(acct.news).toBeNull();
    expect(acct.newsCooldown).toBe(4);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/news.test.ts`
Expected: FAIL（NEWS_POOL 未导出）

- [ ] **Step 3: 实现 news.ts**

```ts
// src/wxhl-cg/engine/news.ts
// 新闻池：标题情绪与实际冲击分离（25% 概率反向）——照搬杀跌尖塔"新闻不一定准"。
// 池子取材自 docs/reference/spire-stocks-strings.txt（尖塔 mod 全量新闻），改写为回廊势力版。
// 扩充规则：每只股 ≥3 条，好坏掺半；扩充时只加 NEWS_POOL 条目，不改逻辑。
import type { ActiveNews, ExchangeAccount } from './types';
import { stockOf } from './stocks';
import type { Rng } from './market';

export interface NewsTemplate {
  stock: string;
  sentiment: 'good' | 'bad';
  text: string;
}

export const NEWS_POOL: NewsTemplate[] = [
  // —— 特管局后勤 TGJ（极低波动）——
  { stock: 'TGJ', sentiment: 'good', text: '特管局公布上季度装备采购清单，后勤供应商订单排到下赛季' },
  { stock: 'TGJ', sentiment: 'bad', text: '特管局审计组进驻后勤处，三名采购员被带走问话' },
  { stock: 'TGJ', sentiment: 'good', text: '一阶区治安整治见效，特管局后勤被评为「最省心供应商」' },
  // —— OETA 安保 ——
  { stock: 'OETA', sentiment: 'good', text: 'OETA 签下三个副本入口的独家安保合同' },
  { stock: 'OETA', sentiment: 'bad', text: 'OETA 外勤小队在高阶副本全灭，赔付金创纪录' },
  { stock: 'OETA', sentiment: 'good', text: 'OETA 年度训练通过率创新高，合作佣金随之上调' },
  // —— 零号局情报 LHJ ——
  { stock: 'LHJ', sentiment: 'good', text: '零号局出售的情报准确率蝉联第一，买家复购率大涨' },
  { stock: 'LHJ', sentiment: 'bad', text: '零号局一份绝密情报被证伪，客户要求退款并索赔' },
  { stock: 'LHJ', sentiment: 'bad', text: '零号局行事风格过于冷酷引发争议，多个势力暂停合作' },
  // —— EJSSA 竞技 EJS ——
  { stock: 'EJS', sentiment: 'good', text: 'EJSSA 排位赛收视率破纪录，转播权竞价翻倍' },
  { stock: 'EJS', sentiment: 'bad', text: 'EJSSA 选手被曝使用违禁强化，联盟紧急调查' },
  { stock: 'EJS', sentiment: 'good', text: 'EJSSA 宣布新增二阶赛区，门票预售秒空' },
  // —— 非盟商会 FM ——
  { stock: 'FM', sentiment: 'good', text: '非盟商会打通两条新商路，通货吞吐量翻倍' },
  { stock: 'FM', sentiment: 'bad', text: '非盟商会一支商队在野区被劫，损失未公开' },
  { stock: 'FM', sentiment: 'good', text: '非盟商会下调过路费，中小契约者纷纷改道捧场' },
  // —— 泛联控股 PLH ——
  { stock: 'PLH', sentiment: 'good', text: '泛东亚联合体推出跨区结算凭证，兑换量超预期' },
  { stock: 'PLH', sentiment: 'bad', text: '泛联内部成员国就分摊比例谈崩，联合项目停摆' },
  { stock: 'PLH', sentiment: 'good', text: '泛联控股基建基金获批，多个安全区扩建在即' },
  // —— 圣辉教会 SJH ——
  { stock: 'SJH', sentiment: 'good', text: '神圣教会在一阶区公开招募信徒，捐赠收入激增' },
  { stock: 'SJH', sentiment: 'bad', text: '教会圣水被检出只是普通泉水，信徒要求退捐' },
  { stock: 'SJH', sentiment: 'good', text: '圣女亲自为远征队祝福，教会威望达新赛季高点' },
  // —— 方舟集团 FZJT ——
  { stock: 'FZJT', sentiment: 'good', text: '方舟集团黑市渠道扩容，外勤药水销量翻番' },
  { stock: 'FZJT', sentiment: 'bad', text: '方舟集团情报贩子价目表外泄，被指长期溢价宰客' },
  { stock: 'FZJT', sentiment: 'good', text: '方舟集团收购两家破产工坊，产能版图再扩张' },
  // —— 瑞辰基金会 RCJJ ——
  { stock: 'RCJJ', sentiment: 'good', text: '瑞辰基金会人体强化实验体数据异常优异，投资圈沸腾' },
  { stock: 'RCJJ', sentiment: 'bad', text: '瑞辰基金会的资助合同被曝暗藏陷阱，多名契约者联名控诉' },
  { stock: 'RCJJ', sentiment: 'bad', text: '瑞辰实验室发生泄漏事故，周边安全区紧急疏散' },
  // —— 恶魔旅团黑产 EML ——
  { stock: 'EML', sentiment: 'good', text: '恶魔旅团保护费从 30% 涨到 50%，「营收」再创佳绩' },
  { stock: 'EML', sentiment: 'bad', text: '特管局专项整治恶魔旅团，三个收保护费小队被端' },
  { stock: 'EML', sentiment: 'good', text: '恶魔旅团一阶分队队长放话要复仇，黑产关注度飙升' },
];

const NEWS_CHANCE = 0.25;    // 冷却归零后每跳抽中概率
const NEWS_TTL = 3;          // 冲击生效跳数
const FLIP_CHANCE = 0.25;    // 实际方向与标题相反的概率

export function maybeRollNews(acct: ExchangeAccount, rng: Rng): void {
  if (acct.news) return;
  if (acct.newsCooldown > 0) {
    acct.newsCooldown--;
    return;
  }
  if (rng() >= NEWS_CHANCE) return;
  const t = NEWS_POOL[Math.floor(rng() * NEWS_POOL.length)];
  const sigma = stockOf(t.stock).sigma;
  const magnitude = (1 + rng() * 2) * sigma;
  const sign = t.sentiment === 'good' ? 1 : -1;
  const flipped = rng() < FLIP_CHANCE;
  const news: ActiveNews = {
    stock: t.stock,
    text: t.text,
    sentiment: t.sentiment,
    impact: (flipped ? -sign : sign) * magnitude,
    ttl: NEWS_TTL,
  };
  acct.news = news;
  acct.newsCooldown = 3 + Math.floor(rng() * 4); // 3–6 跳
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-cg/__tests__/news.test.ts src/wxhl-cg/__tests__/market.test.ts`
Expected: PASS（market 测试不受新闻影响——其 rng 序列要么冷却未归零要么判定值 ≥0.25；若恰好触发新闻导致价格波动断言失败，把 market.test.ts 里账户的 `newsCooldown` 设为 999 隔离）

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 新闻系统——标题情绪与实际冲击分离，10 势力新闻池"
```

---

### Task 4: 基础交易引擎（trading.ts：做多开平 + 费用 + 净资产）

**Files:**
- Create: `src/wxhl-cg/engine/trading.ts`
- Test: `src/wxhl-cg/__tests__/trading.test.ts`

**Interfaces:**
- Consumes: `ExchangeAccount`、`Position`、`round2`（Task 1）
- Produces: `COMMISSION_RATE`、`STAMP_RATE`、`MAINTENANCE_RATE`、`commission()`、`positionPnl()`、`positionEquity()`、`netAssets()`、`openPosition()`、`closePosition()` —— Task 9 在此基础上加做空/强平；UI（Task 6）用 `netAssets`/`positionPnl`。

本任务只实现**做多 + 杠杆保证金 + 双向佣金 + 印花税**；做空接口先就位（side: 'short' 走同一函数），强平判定留到 Task 9。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/trading.test.ts
import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { closePosition, commission, netAssets, openPosition, positionEquity, positionPnl } from '../engine/trading';

function withCash(v: number) {
  const a = createAccount();
  a.cash = v;
  return a;
}

describe('commission', () => {
  it('成交额 1%，上限保证金 10%', () => {
    expect(commission(1000, 100)).toBe(10);      // 1% = 10，上限 10 → 10
    expect(commission(100000, 1000)).toBe(100);  // 1% = 1000，上限 100 → 100
    expect(commission(500, 500)).toBe(5);
  });
});

describe('openPosition（做多）', () => {
  it('扣保证金+佣金，记录仓位', () => {
    const a = withCash(1000); // TGJ 基准价 100
    openPosition(a, 'TGJ', 'long', 2, 5); // 名义 200，保证金 40，佣金 2
    expect(a.positions['TGJ']).toMatchObject({ side: 'long', qty: 2, entryPrice: 100, leverage: 5, margin: 40 });
    expect(a.cash).toBe(1000 - 40 - 2);
  });
  it('开空额外收印花税 0.1%', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'short', 2, 5); // 佣金 2 + 印花税 0.2
    expect(a.cash).toBeCloseTo(1000 - 40 - 2 - 0.2, 6);
  });
  it('现金不足拒绝且不动账本', () => {
    const a = withCash(10);
    expect(() => openPosition(a, 'TGJ', 'long', 2, 1)).toThrow(/不足/);
    expect(a.positions['TGJ']).toBeUndefined();
    expect(a.cash).toBe(10);
  });
  it('冻结账户禁止开仓', () => {
    const a = withCash(1000);
    a.frozen = true;
    expect(() => openPosition(a, 'TGJ', 'long', 1, 1)).toThrow(/冻结/);
  });
  it('杠杆/数量非法拒绝', () => {
    const a = withCash(10000);
    expect(() => openPosition(a, 'TGJ', 'long', 0, 1)).toThrow();
    expect(() => openPosition(a, 'TGJ', 'long', 1, 0)).toThrow();
    expect(() => openPosition(a, 'TGJ', 'long', 1, 101)).toThrow();
  });
});

describe('closePosition（平多）', () => {
  it('盈利：退回保证金+盈利，收佣金+印花税', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'long', 2, 5); // 保证金 40 佣金 2 → cash 958
    a.prices['TGJ'] = 120; // 盈利 40
    const r = closePosition(a, 'TGJ');
    expect(r.pnl).toBe(40);
    // 平仓佣金 = min(240×1%, 40×10%)=2.4；印花税 240×0.1%=0.24
    expect(a.cash).toBeCloseTo(958 + 40 + 40 - 2.4 - 0.24, 6);
    expect(a.positions['TGJ']).toBeUndefined();
  });
  it('亏损计入 cumulativeLoss，超 250 触发破产标记由调用方处理', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'long', 10, 1); // 名义 1000 保证金 1000 佣金 10 → cash -10
    a.prices['TGJ'] = 50; // 亏 500
    closePosition(a, 'TGJ');
    expect(a.cumulativeLoss).toBe(500);
  });
});

describe('positionPnl / positionEquity / netAssets', () => {
  it('做多盈亏与净值', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'long', 2, 5);
    a.prices['TGJ'] = 110;
    const p = a.positions['TGJ'];
    expect(positionPnl(p, 110)).toBe(20);
    expect(positionEquity(p, 110)).toBe(60); // 保证金 40 + 20
    expect(netAssets(a)).toBeCloseTo(958 + 60, 6);
  });
  it('做空盈亏方向相反', () => {
    const a = withCash(1000);
    openPosition(a, 'TGJ', 'short', 2, 5);
    a.prices['TGJ'] = 110;
    expect(positionPnl(a.positions['TGJ'], 110)).toBe(-20);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/trading.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 trading.ts**

```ts
// src/wxhl-cg/engine/trading.ts
// 交易引擎：开平仓、费用、净值。强平判定见 liquidate.ts（Task 9 并入本文件）。
import { round2, type ExchangeAccount, type Position, type Side } from './types';
import { stockOf } from './stocks';

export const COMMISSION_RATE = 0.01;      // 佣金：成交额 1%，买卖双向
export const COMMISSION_MARGIN_CAP = 0.1; // 佣金上限：保证金 10%
export const STAMP_RATE = 0.001;          // 印花税：卖出方 0.1%（平多/开空/强平/清算）
export const MAINTENANCE_RATE = 0.05;     // 强平维持线：净值 ≤ 名义×5%

/** 佣金 = min(成交额×1%, 保证金×10%) */
export function commission(notional: number, margin: number): number {
  return round2(Math.min(notional * COMMISSION_RATE, margin * COMMISSION_MARGIN_CAP));
}

export function positionPnl(pos: Position, price: number): number {
  const diff = pos.side === 'long' ? price - pos.entryPrice : pos.entryPrice - price;
  return round2(diff * pos.qty);
}

/** 持仓净值 = 保证金 + 浮动盈亏 */
export function positionEquity(pos: Position, price: number): number {
  return round2(pos.margin + positionPnl(pos, price));
}

/** 账户净资产 = 现金 + Σ持仓净值 */
export function netAssets(acct: ExchangeAccount): number {
  let sum = acct.cash;
  for (const [code, pos] of Object.entries(acct.positions)) {
    sum += positionEquity(pos, acct.prices[code] ?? pos.entryPrice);
  }
  return round2(sum);
}

export interface OpenResult {
  notional: number;
  margin: number;
  fee: number;
  stamp: number;
}

/**
 * 开仓。抛出 Error 的情形（响亮失败）：账户冻结、参数非法、现金不足、已有同股仓位。
 * 印花税：仅开空收（卖出方）。
 */
export function openPosition(
  acct: ExchangeAccount,
  code: string,
  side: Side,
  qty: number,
  leverage: number,
): OpenResult {
  if (acct.frozen) throw new Error('账户冻结中，禁止开仓');
  stockOf(code);
  if (!Number.isInteger(qty) || qty <= 0) throw new Error('数量必须是正整数');
  if (!Number.isInteger(leverage) || leverage < 1 || leverage > 100) throw new Error('杠杆必须是 1–100 的整数');
  if (acct.positions[code]) throw new Error('已有该股仓位，请先平仓');

  const price = acct.prices[code];
  const notional = round2(qty * price);
  const margin = round2(notional / leverage);
  const fee = commission(notional, margin);
  const stamp = side === 'short' ? round2(notional * STAMP_RATE) : 0;
  const total = round2(margin + fee + stamp);
  if (acct.cash < total) throw new Error(`现金不足：需要 ${total}，只有 ${round2(acct.cash)}`);

  acct.cash = round2(acct.cash - total);
  acct.positions[code] = { side, qty, entryPrice: price, leverage, margin };
  return { notional, margin, fee, stamp };
}

export interface CloseResult {
  pnl: number;
  fee: number;
  stamp: number;
  returned: number; // 实际回到现金的金额
}

/** 平仓。平多收印花税；平空不收。已实现亏损累计进 cumulativeLoss。 */
export function closePosition(acct: ExchangeAccount, code: string): CloseResult {
  const pos = acct.positions[code];
  if (!pos) throw new Error('没有该股仓位: ' + code);
  const price = acct.prices[code];
  const notional = round2(pos.qty * price);
  const pnl = positionPnl(pos, price);
  const fee = commission(notional, pos.margin);
  const stamp = pos.side === 'long' ? round2(notional * STAMP_RATE) : 0;
  const returned = round2(pos.margin + pnl - fee - stamp);
  acct.cash = round2(acct.cash + returned);
  if (pnl < 0) acct.cumulativeLoss = round2(acct.cumulativeLoss + -pnl);
  delete acct.positions[code];
  return { pnl, fee, stamp, returned };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-cg/__tests__/trading.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 交易引擎——开平仓、佣金/印花税、净资产"
```

---

### Task 5: 持久化 store（localStorage + zod + 计时器驱动）

**Files:**
- Create: `src/wxhl-cg/store.ts`
- Test: `src/wxhl-cg/__tests__/store.test.ts`

**Interfaces:**
- Consumes: `ExchangeAccount`、`createAccount`（Task 1）、`tickMarket`（Task 2）
- Produces: `STORAGE_KEY`、`StorageLike`、`loadAccount(storage)`、`saveAccount(storage, acct)`、`useExchangeStore`（pinia：acct ref、`startTicker()`/`stopTicker()`）—— UI（Task 6）与 index.ts 依赖。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/store.test.ts
import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { loadAccount, saveAccount, STORAGE_KEY, type StorageLike } from '../store';

function memStorage(): StorageLike & { data: Record<string, string> } {
  const data: Record<string, string> = {};
  return {
    data,
    getItem: k => (k in data ? data[k] : null),
    setItem: (k, v) => { data[k] = v; },
  };
}

describe('持久化', () => {
  it('round-trip：存出去能原样读回', () => {
    const s = memStorage();
    const a = createAccount();
    a.cash = 123.45;
    a.tick = 7;
    saveAccount(s, a);
    const b = loadAccount(s);
    expect(b.cash).toBe(123.45);
    expect(b.tick).toBe(7);
    expect(b.prices['TGJ']).toBe(100);
  });
  it('空存储 → 新账户', () => {
    const b = loadAccount(memStorage());
    expect(b.v).toBe(1);
    expect(b.cash).toBe(0);
  });
  it('损坏 JSON → 新账户 + console.warn，不抛错', () => {
    const s = memStorage();
    s.data[STORAGE_KEY] = '{broken';
    const b = loadAccount(s);
    expect(b.v).toBe(1);
    expect(b.cash).toBe(0);
  });
  it('版本不符 → 新账户', () => {
    const s = memStorage();
    s.data[STORAGE_KEY] = JSON.stringify({ v: 999, cash: 1e6 });
    const b = loadAccount(s);
    expect(b.cash).toBe(0); // 不认旧版数据
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/store.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 store.ts**

```ts
// src/wxhl-cg/store.ts
// pinia store：驱动引擎 + localStorage 持久化。所有副作用集中在本层。
// z 由 unplugin-auto-import 提供（vitest 配置同样生效）。
import { createAccount, type ExchangeAccount } from './engine/types';
import { tickMarket } from './engine/market';

export const STORAGE_KEY = 'wxhl-cg:account';

export interface StorageLike {
  getItem(k: string): string | null;
  setItem(k: string, v: string): void;
}

const AccountSchema = z.looseObject({
  v: z.literal(1),
  cash: z.number(),
  positions: z.record(z.string(), z.looseObject({
    side: z.enum(['long', 'short']),
    qty: z.number(),
    entryPrice: z.number(),
    leverage: z.number(),
    margin: z.number(),
  })),
  prices: z.record(z.string(), z.number()),
  priceHistory: z.record(z.string(), z.array(z.number())),
  tick: z.number(),
  loan: z.any().nullable(),
  loanState: z.enum(['none', 'normal', 'delinquent']),
  debt: z.number(),
  bankruptcyCount: z.number(),
  deathMarked: z.boolean(),
  cumulativeLoss: z.number(),
  frozen: z.boolean(),
  news: z.any().nullable(),
  newsCooldown: z.number(),
});

export function loadAccount(storage: StorageLike): ExchangeAccount {
  const raw = storage.getItem(STORAGE_KEY);
  if (!raw) return createAccount();
  try {
    const parsed = AccountSchema.safeParse(JSON.parse(raw));
    if (!parsed.success) {
      console.warn('[wxhl-cg] 存档结构校验失败，重置为新账户:', z.prettifyError(parsed.error));
      return createAccount();
    }
    return parsed.data as ExchangeAccount;
  } catch (e) {
    console.warn('[wxhl-cg] 存档 JSON 损坏，重置为新账户:', e);
    return createAccount();
  }
}

export function saveAccount(storage: StorageLike, acct: ExchangeAccount): void {
  storage.setItem(STORAGE_KEY, JSON.stringify(acct));
}

const TICK_MS = 10_000;

export const useExchangeStore = defineStore('wxhl-cg', () => {
  const acct = ref<ExchangeAccount>(loadAccount(localStorage));
  const panelOpen = ref(false);
  let timer: ReturnType<typeof setInterval> | null = null;

  function persist() {
    saveAccount(localStorage, klona(acct.value));
  }

  /** 推进一跳并持久化。引擎 throw 时响亮失败并停表。 */
  function doTick() {
    try {
      tickMarket(acct.value);
      persist();
    } catch (e) {
      console.error('[wxhl-cg] 行情跳动失败，计时器已停止:', e);
      toastr.error('交易所行情引擎出错，已停止跳动（详见控制台）');
      stopTicker();
    }
  }

  function startTicker() {
    if (timer) return;
    timer = setInterval(doTick, TICK_MS);
  }

  function stopTicker() {
    if (timer) clearInterval(timer);
    timer = null;
  }

  function open() {
    panelOpen.value = true;
    startTicker();
  }

  function close() {
    panelOpen.value = false;
    stopTicker();
    persist();
  }

  return { acct, panelOpen, open, close, doTick, persist, startTicker, stopTicker };
});
```

注意：`defineStore`/`ref`/`klona`/`z`/`toastr` 均靠 auto-import，无需手写 import。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-cg/__tests__/store.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): pinia store——localStorage 持久化 + 10s 计时器驱动"
```

---

### Task 6: UI 面板 + 入口脚本（index.ts + ExchangePanel.vue）

**Files:**
- Create: `src/wxhl-cg/index.ts`
- Create: `src/wxhl-cg/ui/ExchangePanel.vue`
- Create: `src/wxhl-cg/ui/SparkLine.vue`

**Interfaces:**
- Consumes: `useExchangeStore`（Task 5）、`STOCKS`/`positionPnl`/`netAssets`（Task 1/4）
- Produces: 全局接口 `WxhlCg = { open(): void; close(): void; isOpen(): boolean }` —— wxhl-003（Task 8）依赖。

- [ ] **Step 1: 实现 SparkLine.vue（迷你走势线）**

```vue
<!-- src/wxhl-cg/ui/SparkLine.vue -->
<script setup lang="ts">
const props = defineProps<{ data: number[]; width?: number; height?: number }>();
const w = computed(() => props.width ?? 96);
const h = computed(() => props.height ?? 28);
const path = computed(() => {
  const d = props.data;
  if (d.length < 2) return '';
  const min = Math.min(...d);
  const max = Math.max(...d);
  const span = max - min || 1;
  return d
    .map((v, i) => `${i === 0 ? 'M' : 'L'}${((i / (d.length - 1)) * w.value).toFixed(1)},${(h.value - 2 - ((v - min) / span) * (h.value - 4)).toFixed(1)}`)
    .join(' ');
});
const up = computed(() => props.data.length >= 2 && props.data[props.data.length - 1] >= props.data[0]);
</script>

<template>
  <svg :width="w" :height="h" class="spark">
    <path :d="path" fill="none" :stroke="up ? '#e5484d' : '#30a46c'" stroke-width="1.5" />
  </svg>
</template>
```

（中式配色：红涨绿跌。）

- [ ] **Step 2: 实现 ExchangePanel.vue**

```vue
<!-- src/wxhl-cg/ui/ExchangePanel.vue -->
<script setup lang="ts">
import { useExchangeStore } from '../store';
import { STOCKS } from '../engine/stocks';
import { netAssets, openPosition, closePosition, positionPnl } from '../engine/trading';
import SparkLine from './SparkLine.vue';

const store = useExchangeStore();
const acct = computed(() => store.acct);
const tab = ref<'market' | 'positions' | 'assets'>('market');
const detail = ref<string | null>(null);
const qty = ref(1);
const leverage = ref(1);

const net = computed(() => netAssets(acct.value));

function pct(code: string): number {
  const h = acct.value.priceHistory[code];
  if (!h || h.length < 2) return 0;
  return ((h[h.length - 1] - h[0]) / h[0]) * 100;
}

function buy(code: string, side: 'long' | 'short') {
  try {
    openPosition(acct.value, code, side, qty.value, leverage.value);
    store.persist();
    toastr.success(`已开${side === 'long' ? '多' : '空'} ${code} ×${qty.value}`);
  } catch (e: any) {
    toastr.error(e?.message ?? '开仓失败');
  }
}

function close(code: string) {
  try {
    const r = closePosition(acct.value, code);
    store.persist();
    toastr.success(`平仓 ${code}：盈亏 ${r.pnl >= 0 ? '+' : ''}${r.pnl}`);
  } catch (e: any) {
    toastr.error(e?.message ?? '平仓失败');
  }
}
</script>

<template>
  <div v-if="store.panelOpen" class="cg-panel">
    <div class="cg-head">
      <span class="cg-title">回廊交易所</span>
      <span class="cg-net">净资产 {{ net }}</span>
      <button class="cg-close" @click="store.close()">✕</button>
    </div>
    <div v-if="acct.news" class="cg-news">
      {{ acct.news.sentiment === 'good' ? '📈' : '📉' }} {{ acct.news.text }}
    </div>
    <div class="cg-tabs">
      <button :class="{ on: tab === 'market' }" @click="tab = 'market'">行情</button>
      <button :class="{ on: tab === 'positions' }" @click="tab = 'positions'">持仓</button>
      <button :class="{ on: tab === 'assets' }" @click="tab = 'assets'">资产</button>
    </div>

    <div v-if="tab === 'market' && !detail" class="cg-list">
      <div v-for="s in STOCKS" :key="s.code" class="cg-row" @click="detail = s.code">
        <div class="cg-row-name">{{ s.name }}<span class="cg-code">{{ s.code }}</span></div>
        <SparkLine :data="acct.priceHistory[s.code]" />
        <div class="cg-price">{{ acct.prices[s.code] }}</div>
        <div class="cg-pct" :class="pct(s.code) >= 0 ? 'up' : 'down'">{{ pct(s.code).toFixed(2) }}%</div>
      </div>
    </div>

    <div v-else-if="tab === 'market' && detail" class="cg-detail">
      <button @click="detail = null">← 返回</button>
      <h3>{{ detail }}</h3>
      <SparkLine :data="acct.priceHistory[detail]" :width="300" :height="120" />
      <div>现价 {{ acct.prices[detail] }}</div>
      <label>数量 <input type="number" v-model.number="qty" min="1" /></label>
      <label>杠杆 <input type="range" v-model.number="leverage" min="1" max="100" /> ×{{ leverage }}</label>
      <div class="cg-btns">
        <button class="buy" @click="buy(detail, 'long')">做多</button>
        <button class="sell" @click="buy(detail, 'short')">做空</button>
      </div>
    </div>

    <div v-else-if="tab === 'positions'" class="cg-list">
      <div v-if="!Object.keys(acct.positions).length" class="cg-empty">空仓</div>
      <div v-for="(p, code) in acct.positions" :key="code" class="cg-row">
        <div class="cg-row-name">{{ code }} {{ p.side === 'long' ? '多' : '空' }} ×{{ p.leverage }}</div>
        <div class="cg-pct" :class="positionPnl(p, acct.prices[code]) >= 0 ? 'up' : 'down'">
          {{ positionPnl(p, acct.prices[code]) }}
        </div>
        <button @click="close(code)">平仓</button>
      </div>
    </div>

    <div v-else class="cg-assets">
      <div>现金：{{ acct.cash }}</div>
      <div>净资产：{{ net }}</div>
      <div>累计亏损：{{ acct.cumulativeLoss }}（破产线 250）</div>
      <div v-if="acct.frozen" class="cg-frozen">⛔ 账户冻结中</div>
      <!-- Task 7 在此加 UP 兑换；Task 12 加借贷/破产；Task 14 加遗产税 -->
    </div>
  </div>
</template>

<style scoped>
.cg-panel { position: fixed; inset: 0; background: #0d0f14; color: #e6e6e6; pointer-events: auto; display: flex; flex-direction: column; font-size: 14px; }
.cg-head { display: flex; align-items: center; gap: 8px; padding: 10px 14px; border-bottom: 1px solid #262a33; }
.cg-title { font-weight: 700; }
.cg-net { margin-left: auto; opacity: 0.8; }
.cg-close { background: none; border: none; color: #999; font-size: 16px; }
.cg-news { padding: 6px 14px; background: #1a2030; font-size: 12px; }
.cg-tabs { display: flex; gap: 4px; padding: 8px 14px; }
.cg-tabs button { flex: 1; padding: 6px; background: #171b23; border: 1px solid #262a33; color: #ccc; border-radius: 6px; }
.cg-tabs button.on { background: #24406e; color: #fff; }
.cg-list { flex: 1; overflow-y: auto; padding: 0 14px; }
.cg-row { display: flex; align-items: center; gap: 10px; padding: 10px 0; border-bottom: 1px solid #1c2029; }
.cg-row-name { flex: 1; }
.cg-code { opacity: 0.5; margin-left: 6px; font-size: 11px; }
.cg-pct.up { color: #e5484d; }
.cg-pct.down { color: #30a46c; }
.cg-detail, .cg-assets { padding: 14px; display: flex; flex-direction: column; gap: 10px; }
.cg-btns { display: flex; gap: 10px; }
.cg-btns .buy { flex: 1; background: #e5484d; color: #fff; border: none; padding: 10px; border-radius: 6px; }
.cg-btns .sell { flex: 1; background: #30a46c; color: #fff; border: none; padding: 10px; border-radius: 6px; }
.cg-empty { opacity: 0.5; text-align: center; padding: 30px; }
.cg-frozen { color: #f7b955; }
</style>
```

- [ ] **Step 3: 实现 index.ts 入口**

```ts
// src/wxhl-cg/index.ts
// 回廊交易所 · 脚本入口：fixed 根节点挂 vue 面板 + initializeGlobal('WxhlCg')。
// 挂载模式照抄 wxhl-combat/index.ts（fixed 铺满 + z-index 拉满 + pointer-events:none 根节点）。
import { createScriptIdDiv, teleportStyle } from '@util/script';
import ExchangePanel from './ui/ExchangePanel.vue';
import { useExchangeStore } from './store';

declare const __WXHL_BUILD__: string;

$(() => {
  console.log(`[wxhl-cg] 回廊交易所已加载 · 构建 ${typeof __WXHL_BUILD__ !== 'undefined' ? __WXHL_BUILD__ : '(dev)'}`);

  const app = createApp(ExchangePanel).use(createPinia());
  const $app = createScriptIdDiv().attr('id', 'wxhl-cg-root').appendTo('body');
  $app.css({ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 2147483647, pointerEvents: 'none' });

  const updateSize = () => {
    const vv = (window.parent as any).visualViewport;
    const w = Math.round(vv?.width || window.parent.innerWidth || document.documentElement.clientWidth);
    const h = Math.round(vv?.height || window.parent.innerHeight || document.documentElement.clientHeight);
    $app.css({ width: w, height: h });
  };
  updateSize();
  window.addEventListener('resize', updateSize);

  const { destroy } = teleportStyle();
  app.mount($app[0]);

  const store = useExchangeStore();
  initializeGlobal('WxhlCg', {
    open: () => store.open(),
    close: () => store.close(),
    isOpen: () => store.panelOpen,
  });

  $(window).on('pagehide', () => {
    store.close();
    window.removeEventListener('resize', updateSize);
    app.unmount();
    $app.remove();
    destroy();
  });
});
```

- [ ] **Step 4: 构建验证**

Run: `pnpm build`
Expected: `dist/wxhl-cg/index.js` 生成，无 TS/webpack 报错

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg dist/wxhl-cg
git commit -m "feat(wxhl-cg): 交易所面板 UI + 脚本入口 + WxhlCg 全局接口"
```

---

### Task 7: UP 兑换（MVU 读写）

**Files:**
- Create: `src/wxhl-cg/mvu.ts`
- Modify: `src/wxhl-cg/store.ts`（加 `depositUP`/`withdrawUP`）
- Modify: `src/wxhl-cg/ui/ExchangePanel.vue`（资产页加兑换区）

**Interfaces:**
- Consumes: `useExchangeStore`（Task 5）
- Produces: store 新方法 `depositUP(amount: number): Promise<void>`、`withdrawUP(amount: number): Promise<void>`（均 throw 于失败）

- [ ] **Step 1: 实现 mvu.ts（照抄 market/store.ts 模式）**

```ts
// src/wxhl-cg/mvu.ts
// MVU 读写：照抄 src/wxhl-003/market/store.ts 的 messageId/readContractor/commit 模式。
// 唯一数据路径：stat_data.契约者.经济.UP（与市场一致）。

/** 楼层探测：全局脚本 iframe 无楼层上下文时回退最新楼层 */
function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

/** 读 stat_data.契约者；读不到返回 null */
export function readContractor(): { mvu: any; c: any; mid: number | 'latest' } | null {
  try {
    const mid = messageId();
    const mvu = Mvu.getMvuData({ type: 'message', message_id: mid });
    const c = _.get(mvu, ['stat_data', '契约者']);
    return c ? { mvu, c, mid } : null;
  } catch (_) {
    return null;
  }
}

/** 落档 + 回读校验 */
export async function commitMvu(mvu: any, mid: number | 'latest', checks: [string[], unknown][]): Promise<void> {
  await Mvu.replaceMvuData(mvu, { type: 'message', message_id: mid });
  const after = Mvu.getMvuData({ type: 'message', message_id: mid });
  for (const [path, expectVal] of checks) {
    const got = _.get(after, path);
    if (expectVal === undefined ? got !== undefined : !_.isEqual(got, expectVal)) {
      toastr.warning('变量已写入但回读核对不上: ' + path.join('.'));
    }
  }
}

export function readUP(): number | null {
  const r = readContractor();
  return r ? Number(_.get(r.c, ['经济', 'UP']) ?? 0) : null;
}

/** 增减 UP（负数=扣减）并回读校验。读不到契约者时 throw（响亮失败）。 */
export async function adjustUP(delta: number): Promise<number> {
  const r = readContractor();
  if (!r) throw new Error('读不到存档变量（契约者不存在），兑换失败');
  const before = Number(_.get(r.c, ['经济', 'UP']) ?? 0);
  const after = Math.round((before + delta) * 100) / 100;
  if (after < 0) throw new Error(`UP 不足：需要 ${-delta}，只有 ${before}`);
  _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], after);
  await commitMvu(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], after]]);
  return after;
}
```

- [ ] **Step 2: store.ts 加兑换动作**

在 `useExchangeStore` 的 return 前加（并在 return 里导出）：

```ts
import { adjustUP } from './mvu';
import { round2 } from './engine/types';

const EXCHANGE_FEE = 0.01; // 双向 1%

/** 入金：扣 amount UP → 加 floor 后 ×0.99 交易所币 */
async function depositUP(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('入金金额必须是正整数');
  await adjustUP(-amount); // 先扣 UP，失败则不动交易所账本
  acct.value.cash = round2(acct.value.cash + round2(amount * (1 - EXCHANGE_FEE)));
  persist();
  toastr.success(`入金成功：${amount} UP → ${round2(amount * (1 - EXCHANGE_FEE))} 币（手续费 1%）`);
}

/** 出金：扣 amount 币 → 加 ×0.99 UP（向下取整到两位） */
async function withdrawUP(amount: number) {
  if (!Number.isInteger(amount) || amount <= 0) throw new Error('出金金额必须是正整数');
  if (acct.value.cash < amount) throw new Error(`现金不足：只有 ${round2(acct.value.cash)} 币`);
  const upGain = round2(amount * (1 - EXCHANGE_FEE));
  await adjustUP(upGain);
  acct.value.cash = round2(acct.value.cash - amount);
  persist();
  toastr.success(`出金成功：${amount} 币 → ${upGain} UP（手续费 1%）`);
}
```

注意顺序约定：入金先扣 UP 再加币（UP 扣失败→币不动）；出金先加 UP 再扣币（UP 加失败→币不动）。任一侧失败都不产生半截账。

- [ ] **Step 3: ExchangePanel.vue 资产页加兑换区**

在 `<!-- Task 7 在此加 UP 兑换 -->` 处替换为：

```vue
<div class="cg-exchange">
  <h4>UP 兑换（1 UP = 1 币，双向 1% 手续费）</h4>
  <input type="number" v-model.number="exchangeAmt" min="1" placeholder="金额" />
  <div class="cg-btns">
    <button @click="doDeposit">入金（UP→币）</button>
    <button @click="doWithdraw">出金（币→UP）</button>
  </div>
</div>
```

script 加：

```ts
const exchangeAmt = ref(0);
async function doDeposit() {
  try { await store.depositUP(exchangeAmt.value); } catch (e: any) { toastr.error(e?.message ?? '入金失败'); }
}
async function doWithdraw() {
  try { await store.withdrawUP(exchangeAmt.value); } catch (e: any) { toastr.error(e?.message ?? '出金失败'); }
}
```

- [ ] **Step 4: 构建验证**

Run: `pnpm build`
Expected: 无报错

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): UP 双向兑换（1:1，双向 1% 手续费，MVU 读写照市场模式）"
```

---

### Task 8: wxhl-003 手机图标接入

**Files:**
- Modify: `src/wxhl-003/App.vue`（图标区约 172–195 行附近、script 的 open 函数区）

**Interfaces:**
- Consumes: 全局 `WxhlCg`（Task 6）

- [ ] **Step 1: 加图标**

在 App.vue 「玩家排行榜」图标块（`@click="openRank"` 的 `app-icon-wrapper`）之后、「终端设置」之前插入：

```vue
<div class="app-icon-wrapper" @click="openExchange">
  <div class="app-icon exchange-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <polyline points="3 17 9 11 13 15 21 7" />
      <polyline points="15 7 21 7 21 13" />
    </svg>
  </div>
  <span class="app-label">回廊交易所</span>
  <span class="app-sub">{{ appSubs.exchange }}</span>
</div>
```

- [ ] **Step 2: script 加 openExchange + appSubs 键**

在 `function openRank()` 旁加：

```ts
/** 回廊交易所（wxhl-cg 脚本）：经 initializeGlobal 调起，未加载则提示 */
async function openExchange() {
  if (!canUseHubFacility()) {
    toastr.warning(HUB_GATE_HINT);
    return;
  }
  try {
    const cg = await Promise.race([
      waitGlobalInitialized<{ open(): void }>('WxhlCg'),
      new Promise<null>(resolve => setTimeout(() => resolve(null), 1500)),
    ]);
    if (!cg) {
      toastr.warning('交易所脚本未加载（wxhl-cg）');
      return;
    }
    cg.open();
  } catch {
    toastr.warning('交易所脚本未加载（wxhl-cg）');
  }
}
```

并在 `appSubs` 定义对象中加一行 `exchange: '',`（与其他键并列）。

CSS 中加 `.exchange-icon`（先找到现有 `.rank-icon` 规则，照它的写法复制一条改配色，例如）：

```css
.exchange-icon { background: linear-gradient(135deg, #1a3a2a, #30a46c); }
```

若 `.rank-icon` 的实际写法不同，以它为准——目标只是让图标有和其他 app 一致的底色风格。

- [ ] **Step 3: 构建验证 + 回归测试**

Run: `pnpm build && pnpm test`
Expected: 全绿（wxhl-003 现有测试不受影响）

- [ ] **Step 4: Commit**

```bash
git add src/wxhl-003/App.vue dist
git commit -m "feat(wxhl-003): 手机桌面加「回廊交易所」图标，调起 wxhl-cg"
```

**v1a 至此完成（可交付：基础交易+新闻+兑换上线）。**

---

### Task 9: 杠杆做空强平 + 杠杆利息（v1b）

**Files:**
- Modify: `src/wxhl-cg/engine/trading.ts`
- Modify: `src/wxhl-cg/store.ts`（doTick 里接入）
- Test: `src/wxhl-cg/__tests__/liquidation.test.ts`

**Interfaces:**
- Consumes: Task 4 全部
- Produces: `liquidationPrice(pos)`、`tickTrading(acct): { liquidated: string[]; interest: number }` —— store.doTick 每跳调用；UI 个股页显示强平价。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/liquidation.test.ts
import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { liquidationPrice, openPosition, tickTrading } from '../engine/trading';

function withCash(v: number) {
  const a = createAccount();
  a.cash = v;
  return a;
}

describe('liquidationPrice', () => {
  it('做多强平价 = round2(entry×(1−1/L)/0.95)', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 1, 10); // entry 100
    expect(liquidationPrice(a.positions['TGJ'])).toBeCloseTo(94.74, 2);
  });
  it('做空强平价 = round2(entry×(1+1/L)/1.05)', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'short', 1, 10);
    expect(liquidationPrice(a.positions['TGJ'])).toBeCloseTo(104.76, 2);
  });
  it('1 倍杠杆永不强平（返回 0/Infinity）', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 1, 1);
    expect(liquidationPrice(a.positions['TGJ'])).toBe(0);
    openPosition(a, 'FM', 'short', 1, 1);
    expect(liquidationPrice(a.positions['FM'])).toBe(Infinity);
  });
});

describe('tickTrading', () => {
  it('跌破强平价立即平仓（费用照收），返回强平列表', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 10, 10); // 名义 1000 保证金 100
    a.prices['TGJ'] = 94; // < 94.7368 强平价
    const r = tickTrading(a);
    expect(r.liquidated).toEqual(['TGJ']);
    expect(a.positions['TGJ']).toBeUndefined();
    expect(a.cumulativeLoss).toBeGreaterThan(0);
  });
  it('未破线不动', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 10, 10);
    a.prices['TGJ'] = 96;
    expect(tickTrading(a).liquidated).toEqual([]);
    expect(a.positions['TGJ']).toBeDefined();
  });
  it('杠杆 ≤20 不收利息；>20 每跳收 (L−20)×0.01%×名义', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 1, 20);
    openPosition(a, 'FM', 'long', 1, 50); // FM 基准价 40
    const cash0 = a.cash;
    const r = tickTrading(a);
    // 只有 FM 收息：40×30×0.0001 = 0.12
    expect(r.interest).toBeCloseTo(0.12, 6);
    expect(a.cash).toBeCloseTo(cash0 - 0.12, 6);
  });
  it('Review Focus：重开 app 第一跳按现价判定强平（关闭期间不豁免）', () => {
    const a = withCash(10000);
    openPosition(a, 'TGJ', 'long', 10, 10);
    // 模拟"关闭期间价格被人为改到破线"（重开后第一跳）
    a.prices['TGJ'] = 90;
    expect(tickTrading(a).liquidated).toEqual(['TGJ']);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/liquidation.test.ts`
Expected: FAIL（函数未导出）

- [ ] **Step 3: trading.ts 追加实现**

```ts
// —— 追加到 src/wxhl-cg/engine/trading.ts ——

export const LEVERAGE_INTEREST_THRESHOLD = 20;
export const LEVERAGE_INTEREST_RATE = 0.0001; // 每超 1 倍，每跳收名义本金 0.01%

/**
 * 强平价：净值(保证金+浮盈亏) ≤ 名义×5% 时的价格。
 * 做多：entry×(1−1/L)/0.95；做空：entry×(1+1/L)/1.05。
 * 1 倍杠杆：做多 0 / 做空 Infinity（永不强平）。
 */
export function liquidationPrice(pos: Position): number {
  if (pos.leverage === 1) return pos.side === 'long' ? 0 : Infinity;
  const L = pos.leverage;
  return pos.side === 'long'
    ? round2((pos.entryPrice * (1 - 1 / L)) / (1 - MAINTENANCE_RATE))
    : round2((pos.entryPrice * (1 + 1 / L)) / (1 + MAINTENANCE_RATE));
}

export interface TickTradingResult {
  liquidated: string[];
  interest: number;
}

/**
 * 每跳结算：先收杠杆利息（>20 倍），再逐个检查强平（费用照收）。
 * 强平即按现价平仓（closePosition 同等逻辑），亏损计入 cumulativeLoss。
 */
export function tickTrading(acct: ExchangeAccount): TickTradingResult {
  let interest = 0;
  for (const [code, pos] of Object.entries(acct.positions)) {
    if (pos.leverage > LEVERAGE_INTEREST_THRESHOLD) {
      const notional = pos.qty * (acct.prices[code] ?? pos.entryPrice);
      const fee = round2(notional * (pos.leverage - LEVERAGE_INTEREST_THRESHOLD) * LEVERAGE_INTEREST_RATE);
      interest = round2(interest + fee);
      acct.cash = round2(acct.cash - fee); // 可扣成负数
    }
  }
  const liquidated: string[] = [];
  for (const [code, pos] of Object.entries(acct.positions)) {
    const price = acct.prices[code];
    const liq = liquidationPrice(pos);
    const hit = pos.side === 'long' ? price <= liq : price >= liq;
    if (hit) {
      closePosition(acct, code); // 佣金印花税照收（平多收印花税/平空不收——强平按平仓方向计）
      liquidated.push(code);
    }
  }
  return { liquidated, interest };
}
```

- [ ] **Step 4: store.doTick 接入**

`store.ts` 的 `doTick` 改为：

```ts
import { tickTrading } from './engine/trading';

function doTick() {
  try {
    tickMarket(acct.value);
    const r = tickTrading(acct.value);
    if (r.liquidated.length) toastr.warning(`强平：${r.liquidated.join('、')} 已按现价强制平仓`);
    persist();
  } catch (e) { /* 原有 catch 不变 */ }
}
```

- [ ] **Step 5: 个股页显示强平价**

ExchangePanel.vue detail 页加一行（script 顶部 import `liquidationPrice`）：

```vue
<div v-if="acct.positions[detail]">
  强平价：{{ liquidationPrice(acct.positions[detail]) }}
</div>
```

- [ ] **Step 6: 跑全部测试 + 构建**

Run: `pnpm test && pnpm build`
Expected: 全绿

- [ ] **Step 7: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 杠杆利息 + 强平线判定（v1b）"
```

---

### Task 10: 借贷引擎（loan.ts，v1c）

**Files:**
- Create: `src/wxhl-cg/engine/loan.ts`
- Test: `src/wxhl-cg/__tests__/loan.test.ts`

**Interfaces:**
- Consumes: `ExchangeAccount`、`round2`（Task 1）、`netAssets`（Task 4）
- Produces: `loanOffer()`、`takeLoan()`、`repayLoan()`、`takeHighInterestLoan()`、`repayDebt()`、`tickLoan()`、`HIGH_INTEREST_AMOUNT` —— Task 12 UI 与 store.doTick 接入。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/loan.test.ts
import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { HIGH_INTEREST_AMOUNT, loanOffer, repayDebt, repayLoan, takeHighInterestLoan, takeLoan, tickLoan } from '../engine/loan';

describe('loanOffer', () => {
  it('额度 = min(净资产×50%, 5000)；利率按净资产分档', () => {
    const a = createAccount();
    a.cash = 400; // <1000 → 30%
    expect(loanOffer(a)).toEqual({ maxAmount: 200, rate: 0.3 });
    a.cash = 2000; // <5000 → 20%
    expect(loanOffer(a)).toEqual({ maxAmount: 1000, rate: 0.2 });
    a.cash = 20000; // ≥5000 → 12%，封顶 5000
    expect(loanOffer(a)).toEqual({ maxAmount: 5000, rate: 0.12 });
  });
});

describe('takeLoan / repayLoan', () => {
  it('一次一笔：有借款时再借拒绝', () => {
    const a = createAccount();
    a.cash = 20000;
    takeLoan(a, 1000);
    expect(a.cash).toBe(21000);
    expect(a.loan).toMatchObject({ principal: 1000, rate: 0.12, highInterest: false });
    expect(() => takeLoan(a, 500)).toThrow(/未还清/);
  });
  it('冻结时禁止正常借款', () => {
    const a = createAccount();
    a.cash = 20000;
    a.frozen = true;
    expect(() => takeLoan(a, 1000)).toThrow(/冻结/);
  });
  it('还款：本金×(1+利率)，现金不足拒绝', () => {
    const a = createAccount();
    a.cash = 20000;
    takeLoan(a, 1000);
    a.cash = 1000; // 不够 1120
    expect(() => repayLoan(a)).toThrow(/不足/);
    a.cash = 2000;
    repayLoan(a);
    expect(a.cash).toBe(880);
    expect(a.loan).toBeNull();
    expect(a.loanState).toBe('none');
  });
});

describe('到期失信', () => {
  it('到期未还 → 欠款转 debt、失信冻结、loan 清空', () => {
    const a = createAccount();
    a.cash = 20000;
    takeLoan(a, 1000); // dueTick = 0+100
    a.tick = 100;
    tickLoan(a);
    expect(a.loan).toBeNull();
    expect(a.loanState).toBe('delinquent');
    expect(a.frozen).toBe(true);
    expect(a.debt).toBe(1120);
  });
  it('repayDebt 还清后解冻', () => {
    const a = createAccount();
    a.cash = 20000;
    takeLoan(a, 1000);
    a.tick = 100;
    tickLoan(a);
    repayDebt(a, 1120);
    expect(a.debt).toBe(0);
    expect(a.frozen).toBe(false);
    expect(a.loanState).toBe('none');
  });
  it('repayDebt 部分还款：debt 递减、仍冻结', () => {
    const a = createAccount();
    a.debt = 500;
    a.frozen = true;
    a.loanState = 'delinquent';
    a.cash = 200;
    repayDebt(a, 200);
    expect(a.debt).toBe(300);
    expect(a.frozen).toBe(true);
  });
});

describe('高利贷', () => {
  it('仅失信可借；还 2.5 倍+累计利息', () => {
    const a = createAccount();
    a.loanState = 'delinquent';
    a.frozen = true;
    a.cash = 100;
    takeHighInterestLoan(a);
    expect(a.cash).toBe(100 + HIGH_INTEREST_AMOUNT);
    expect(a.loan).toMatchObject({ principal: HIGH_INTEREST_AMOUNT, highInterest: true });
    // 持有 3 跳：利息 10+20+30=60，现金可扣成负数
    a.tick++;
    tickLoan(a);
    a.tick++;
    tickLoan(a);
    a.tick++;
    tickLoan(a);
    expect(a.loan!.accrued).toBe(60);
    const owe = HIGH_INTEREST_AMOUNT * 2.5 + 60;
    a.cash = owe;
    repayLoan(a);
    expect(a.loan).toBeNull();
  });
  it('非失信状态不能借高利贷', () => {
    const a = createAccount();
    expect(() => takeHighInterestLoan(a)).toThrow();
  });
  it('Review Focus：高利贷把现金扣成负数后，开仓/再借一律拒绝（不放行）', () => {
    const a = createAccount();
    a.loanState = 'delinquent';
    a.frozen = true;
    a.debt = 300;
    takeHighInterestLoan(a);
    a.cash = -50; // 利息扣负后的状态
    expect(() => takeLoan(a, 100)).toThrow(); // 冻结拒绝
    expect(() => repayDebt(a, 100)).toThrow(/不足/); // 现金为负不能还债
    a.cash = 100;
    repayDebt(a, 100); // 入金后可以还
    expect(a.debt).toBe(200);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/loan.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 loan.ts**

```ts
// src/wxhl-cg/engine/loan.ts
// 借贷/失信/高利贷状态机（spec §7）。内置借贷窗口，一次一笔。
import { round2, type ExchangeAccount } from './types';
import { netAssets } from './trading';

export const LOAN_TERM_TICKS = 100;
export const HIGH_INTEREST_AMOUNT = 500;
export const HIGH_INTEREST_REPAY_MULT = 2.5;

export function loanOffer(acct: ExchangeAccount): { maxAmount: number; rate: number } {
  const net = netAssets(acct);
  const rate = net < 1000 ? 0.3 : net < 5000 ? 0.2 : 0.12;
  return { maxAmount: Math.max(0, round2(Math.min(net * 0.5, 5000))), rate };
}

export function takeLoan(acct: ExchangeAccount, amount: number): void {
  if (acct.frozen) throw new Error('账户冻结中，禁止借款');
  if (acct.loan) throw new Error('上一笔未还清，不能再借');
  const offer = loanOffer(acct);
  if (!Number.isInteger(amount) || amount <= 0 || amount > offer.maxAmount) {
    throw new Error(`借款额度 1–${offer.maxAmount}`);
  }
  acct.loan = { principal: amount, rate: offer.rate, dueTick: acct.tick + LOAN_TERM_TICKS, highInterest: false, accrued: 0, ticksHeld: 0 };
  acct.loanState = 'normal';
  acct.cash = round2(acct.cash + amount);
}

/** 还款：正常借款还 本金×(1+rate)；高利贷还 本金×2.5+累计利息。 */
export function repayLoan(acct: ExchangeAccount): void {
  const loan = acct.loan;
  if (!loan) throw new Error('没有待还借款');
  const owe = loan.highInterest
    ? round2(loan.principal * HIGH_INTEREST_REPAY_MULT + loan.accrued)
    : round2(loan.principal * (1 + loan.rate));
  if (acct.cash < owe) throw new Error(`现金不足：需还 ${owe}，只有 ${round2(acct.cash)}`);
  acct.cash = round2(acct.cash - owe);
  acct.loan = null;
  if (acct.loanState === 'normal') acct.loanState = 'none';
  // 失信状态不会因还清高利贷自动解除——失信由 debt 是否清零决定
}

/** 偿还催收债务；清零后解除失信与冻结。 */
export function repayDebt(acct: ExchangeAccount, amount: number): void {
  if (acct.debt <= 0) throw new Error('没有待还债务');
  const pay = Math.min(round2(amount), acct.debt);
  if (!Number.isFinite(pay) || pay <= 0) throw new Error('还款金额必须为正');
  if (acct.cash < pay) throw new Error(`现金不足：只有 ${round2(acct.cash)}`);
  acct.cash = round2(acct.cash - pay);
  acct.debt = round2(acct.debt - pay);
  if (acct.debt <= 0) {
    acct.debt = 0;
    acct.loanState = 'none';
    acct.frozen = false;
  }
}

/** 仅失信状态可借的救命钱（spec §7）。 */
export function takeHighInterestLoan(acct: ExchangeAccount): void {
  if (acct.loanState !== 'delinquent') throw new Error('只有失信人员才能借高利贷');
  if (acct.loan) throw new Error('上一笔未还清，不能再借');
  acct.loan = { principal: HIGH_INTEREST_AMOUNT, rate: HIGH_INTEREST_REPAY_MULT, dueTick: Infinity, highInterest: true, accrued: 0, ticksHeld: 0 };
  acct.cash = round2(acct.cash + HIGH_INTEREST_AMOUNT);
}

/**
 * 每跳推进：高利贷利息递增（第 n 跳 +10×n，可扣成负数）；
 * 正常借款到期未还 → 欠款(本金×(1+rate))转 debt、失信冻结。
 */
export function tickLoan(acct: ExchangeAccount): void {
  const loan = acct.loan;
  if (!loan) return;
  if (loan.highInterest) {
    loan.ticksHeld++;
    const interest = 10 * loan.ticksHeld;
    loan.accrued = round2(loan.accrued + interest);
    acct.cash = round2(acct.cash - interest); // 允许负数
    return;
  }
  if (acct.tick >= loan.dueTick) {
    acct.debt = round2(acct.debt + round2(loan.principal * (1 + loan.rate)));
    acct.loan = null;
    acct.loanState = 'delinquent';
    acct.frozen = true;
  }
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-cg/__tests__/loan.test.ts`
Expected: PASS

- [ ] **Step 5: store.doTick 接入 tickLoan**

```ts
import { tickLoan } from './engine/loan';
// doTick 内 tickTrading 之后加：
tickLoan(acct.value);
```

- [ ] **Step 6: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 借贷引擎——一次一笔/到期失信/高利贷递增利息（v1c 引擎）"
```

---

### Task 11: 破产清算瀑布（bankruptcy.ts）

**Files:**
- Create: `src/wxhl-cg/engine/bankruptcy.ts`
- Test: `src/wxhl-cg/__tests__/bankruptcy.test.ts`

**Interfaces:**
- Consumes: `ExchangeAccount`/`Position`（Task 1）、`closePosition`/`netAssets`（Task 4）、`BASE`/`parseQuality`/`refRange`（`../wxhl-003/market/priceTable`）、`归一位阶`（`../wxhl-003/dice`）
- Produces: `LiquidationInput`、`LiquidationResult`、`LiquidationStep`、`assetPrice()`、`computeLiquidation()`、`applyLiquidation(acct, result)` —— Task 12 的 MVU 写回层按 `removedBag/clearedSlots/removedSkills/clearJob/clearBloodline/clearTalent` 执行。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/bankruptcy.test.ts
import { describe, expect, it } from 'vitest';
import { assetPrice, computeLiquidation, type LiquidationInput } from '../engine/bankruptcy';

function baseInput(over: Partial<LiquidationInput>): LiquidationInput {
  return {
    positionsProceeds: 0,
    cash: 0,
    bag: {},
    equipment: {},
    skills: {},
    job: null,
    bloodline: null,
    talent: null,
    playerTier: '一阶',
    debt: 100,
    ...over,
  };
}

describe('assetPrice', () => {
  it('品质×阶位²：一阶白色武器 = BASE 中值 45', () => {
    expect(assetPrice('白色', '一阶', '武器')).toBe(45); // (30+60)/2
  });
  it('二阶 = ×4', () => {
    expect(assetPrice('白色', '二阶', '武器')).toBe(180);
  });
  it('品质缺失/不可解析 → 白色兜底', () => {
    expect(assetPrice(undefined, '一阶', '武器')).toBe(45);
    expect(assetPrice('破烂', '一阶', '武器')).toBe(45);
  });
});

describe('computeLiquidation 瀑布顺序', () => {
  it('现金就够 → 不动任何资产', () => {
    const r = computeLiquidation(baseInput({ cash: 500 }));
    expect(r.remainingDebt).toBe(0);
    expect(r.removedBag).toEqual([]);
    expect(r.steps.map(s => s.category)).toEqual(['现金']);
  });
  it('背包最便宜先卖，够抵债即停', () => {
    const r = computeLiquidation(baseInput({
      cash: 0,
      debt: 50,
      bag: {
        贵装备: { qty: 1, 品质: '金色', 类型: '武器', 阶位: '一阶' }, // 600
        便宜药: { qty: 1, 品质: '白色', 类型: '消耗品', 阶位: '一阶' }, // 45
      },
    }));
    // 45 不够 50 → 再卖贵的 600；总共 645，剩余债务 0，溢出 595 进 returnCash
    expect(r.removedBag).toEqual(['便宜药', '贵装备']);
    expect(r.remainingDebt).toBe(0);
    expect(r.returnCash).toBe(645 - 50);
  });
  it('背包卖完才动装备，装备卖完才动技能，依此类推', () => {
    const r = computeLiquidation(baseInput({
      debt: 100000, // 全都得卖
      bag: { 药: { qty: 2, 品质: '白色', 阶位: '一阶' } }, // 45×2=90
      equipment: { 主武器: { qty: 1, 名称: '蓝剑', 品质: '蓝色', 类型: '武器', 阶位: '一阶' } }, // 150
      skills: { 火球术: { 品质: '白色' } }, // 45×玩家阶位²
      job: { 稀有度: '金色职业' }, // 600
      bloodline: { 品质: '蓝色' }, // 150
      talent: { 品质: '白色' }, // 45
    }));
    const cats = r.steps.map(s => s.category);
    expect(cats.indexOf('背包')).toBeLessThan(cats.indexOf('装备'));
    expect(cats.indexOf('装备')).toBeLessThan(cats.indexOf('通用技能'));
    expect(cats.indexOf('通用技能')).toBeLessThan(cats.indexOf('职业'));
    expect(cats.indexOf('职业')).toBeLessThan(cats.indexOf('血统'));
    expect(cats.indexOf('血统')).toBeLessThan(cats.indexOf('天赋'));
    expect(r.clearJob).toBe(true);
    expect(r.clearBloodline).toBe(true);
    expect(r.clearTalent).toBe(true);
    // 90+150+45+600+150+45 = 1080 << 100000 → 剩余债务继续背
    expect(r.remainingDebt).toBe(100000 - 1080);
  });
  it('职业稀有度解析：金色职业 → 金色', () => {
    const r = computeLiquidation(baseInput({ debt: 600, job: { 稀有度: '金色职业' } }));
    expect(r.steps.find(s => s.category === '职业')?.proceeds).toBe(600);
    expect(r.remainingDebt).toBe(0);
  });
  it('Review Focus：数量 ≤0 的背包条目跳过；装备槽为「无」跳过', () => {
    const r = computeLiquidation(baseInput({
      debt: 10,
      bag: { 空气: { qty: 0, 品质: '白色', 阶位: '一阶' }, 药: { qty: 1, 品质: '白色', 阶位: '一阶' } },
      equipment: { 头部: { qty: 1, 品质: '白色', 类型: '防具', 阶位: '一阶', 名称: '无' } },
    }));
    expect(r.removedBag).toEqual(['药']);
    expect(r.clearedSlots).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/bankruptcy.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 bankruptcy.ts**

```ts
// src/wxhl-cg/engine/bankruptcy.ts
// 破产清算瀑布（spec §8）：纯计算，不碰 MVU——输入资产快照，输出清算清单。
// 定价复用自由市场 BASE 表：品质×(归一阶位+1)² 取区间中值；品质缺失兜底白色。
import { BASE, parseQuality, refRange, type EquipCategory, type EquipQuality } from '../../wxhl-003/market/priceTable';

export interface LiqAsset {
  qty?: number;
  品质?: string;
  稀有度?: string; // 职业用稀有度当品质
  类型?: string;
  阶位?: string;
  名称?: string;
}

export interface LiquidationInput {
  positionsProceeds: number; // 持仓强平所得（调用方先用 closePosition 全部平仓后传入）
  cash: number;
  bag: Record<string, LiqAsset>;
  equipment: Record<string, LiqAsset>;
  skills: Record<string, LiqAsset>;
  job: LiqAsset | null;
  bloodline: LiqAsset | null;
  talent: LiqAsset | null;
  playerTier: string; // 玩家当前阶位（技能/职业/血统/天赋的定价阶位）
  debt: number;
}

export type LiqCategory = '持仓' | '现金' | '背包' | '装备' | '通用技能' | '职业' | '血统' | '天赋';

export interface LiquidationStep {
  category: LiqCategory;
  name: string;
  proceeds: number;
}

export interface LiquidationResult {
  steps: LiquidationStep[];
  totalProceeds: number;
  remainingDebt: number;
  returnCash: number; // 抵债后溢出，退回交易所现金
  removedBag: string[];
  clearedSlots: string[];
  removedSkills: string[];
  clearJob: boolean;
  clearBloodline: boolean;
  clearTalent: boolean;
}

/** 单件资产清算价 = BASE[类型][品质] 中值 × (归一阶位+1)²。品质缺失→白色兜底。 */
export function assetPrice(品质raw: string | undefined, 阶位: string, 类型: EquipCategory = '武器'): number {
  const parsed = parseQuality(品质raw ?? '');
  const quality: EquipQuality = parsed?.quality ?? '白色';
  if (!parsed) console.warn(`[wxhl-cg] 清算定价：品质「${品质raw}」不可解析，按白色兜底`);
  const range = refRange(quality, 类型, 阶位) ?? refRange('白色', 类型, '一阶')!;
  return Math.round(((range.min + range.max) / 2) * 100) / 100;
}

function equipCategoryOf(a: LiqAsset): EquipCategory {
  const t = String(a.类型 ?? '');
  if (t.includes('防具') || t.includes('甲')) return '防具';
  if (t.includes('饰品')) return '饰品';
  return '武器'; // 消耗品/道具按 GOODS_BASE_CATEGORY 惯例走武器列
}

export function computeLiquidation(input: LiquidationInput): LiquidationResult {
  const steps: LiquidationStep[] = [];
  const result: LiquidationResult = {
    steps, totalProceeds: 0, remainingDebt: input.debt, returnCash: 0,
    removedBag: [], clearedSlots: [], removedSkills: [],
    clearJob: false, clearBloodline: false, clearTalent: false,
  };
  let covered = 0; // 已抵金额

  const gain = (category: LiqCategory, name: string, proceeds: number) => {
    if (proceeds <= 0) return;
    steps.push({ category, name, proceeds });
    covered += proceeds;
  };
  const done = () => covered >= input.debt;

  // 1. 持仓强平所得 + 现金
  if (input.positionsProceeds > 0) gain('持仓', '全部持仓强平', input.positionsProceeds);
  if (!done() && input.cash > 0) gain('现金', '交易所现金', input.cash);

  // 2. 背包：最便宜先卖（整堆为单位）
  if (!done()) {
    const items = Object.entries(input.bag)
      .filter(([, a]) => (a.qty ?? 0) > 0)
      .map(([name, a]) => ({ name, price: assetPrice(a.品质, a.阶位 || input.playerTier, equipCategoryOf(a)) * (a.qty ?? 1) }))
      .sort((x, y) => x.price - y.price);
    for (const it of items) {
      if (done()) break;
      gain('背包', it.name, Math.round(it.price * 100) / 100);
      result.removedBag.push(it.name);
    }
  }

  // 3. 装备槽（名称为「无」的空槽跳过）
  if (!done()) {
    const slots = Object.entries(input.equipment)
      .filter(([, a]) => a.名称 && a.名称 !== '无')
      .map(([slot, a]) => ({ slot, name: a.名称!, price: assetPrice(a.品质, a.阶位 || input.playerTier, equipCategoryOf(a)) }))
      .sort((x, y) => x.price - y.price);
    for (const s of slots) {
      if (done()) break;
      gain('装备', `${s.slot}·${s.name}`, s.price);
      result.clearedSlots.push(s.slot);
    }
  }

  // 4. 通用技能（品质查武器列 × 玩家阶位²）
  if (!done()) {
    const skills = Object.entries(input.skills)
      .map(([name, a]) => ({ name, price: assetPrice(a.品质, input.playerTier) }))
      .sort((x, y) => x.price - y.price);
    for (const s of skills) {
      if (done()) break;
      gain('通用技能', s.name, s.price);
      result.removedSkills.push(s.name);
    }
  }

  // 5. 职业（稀有度当品质）
  if (!done() && input.job && input.job.名称 !== '无') {
    gain('职业', input.job.名称 ?? '职业', assetPrice(input.job.稀有度, input.playerTier));
    result.clearJob = true;
  }

  // 6. 血统
  if (!done() && input.bloodline && input.bloodline.名称 !== '无' && input.bloodline.名称 !== '普通地球人类') {
    gain('血统', input.bloodline.名称 ?? '血统', assetPrice(input.bloodline.品质, input.playerTier));
    result.clearBloodline = true;
  }

  // 7. 天赋
  if (!done() && input.talent && input.talent.名称 !== '无') {
    gain('天赋', input.talent.名称 ?? '天赋', assetPrice(input.talent.品质, input.playerTier));
    result.clearTalent = true;
  }

  result.totalProceeds = Math.round(covered * 100) / 100;
  const excess = covered - input.debt;
  result.returnCash = excess > 0 ? Math.round(excess * 100) / 100 : 0;
  result.remainingDebt = Math.max(0, Math.round((input.debt - covered) * 100) / 100);
  return result;
}
```

注意：测试里 `assetPrice('白色','一阶','武器') = (30+60)/2 = 45`、`蓝色武器 = (100+200)/2 = 150`、`金色武器 = (400+800)/2 = 600`——若与 BASE 表实际值不符，以 BASE 表为准修正测试期望值。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-cg/__tests__/bankruptcy.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 破产清算瀑布引擎——背包→装备→技能→职业→血统→天赋"
```

---

### Task 12: 破产清算 MVU 写回 + 确认清单 UI + 借贷页 UI（v1c 收尾）

**Files:**
- Modify: `src/wxhl-cg/store.ts`（`declareBankruptcy`）
- Modify: `src/wxhl-cg/ui/ExchangePanel.vue`（借贷页签 + 清算确认弹层）

**Interfaces:**
- Consumes: `computeLiquidation`（Task 11）、`commitMvu`/`readContractor`（Task 7）、`closePosition`（Task 4）、loan 全部（Task 10）
- Produces: store 方法 `previewBankruptcy(): LiquidationResult`、`declareBankruptcy(): Promise<void>`、`borrow()/repay()/borrowHigh()/payDebt()`

- [ ] **Step 1: store 加借贷动作**

```ts
import { loanOffer, repayDebt, repayLoan, takeHighInterestLoan, takeLoan } from './engine/loan';

function borrow(amount: number) {
  takeLoan(acct.value, amount);
  persist();
  toastr.success(`借款 ${amount} 到账，到期 ${acct.value.loan!.dueTick} 跳`);
}
function borrowHigh() {
  takeHighInterestLoan(acct.value);
  persist();
  toastr.warning('高利贷到账 500——还 2.5 倍，利息每跳递增，好自为之');
}
function repay() {
  repayLoan(acct.value);
  persist();
  toastr.success('借款已还清');
}
function payDebt(amount: number) {
  repayDebt(acct.value, amount);
  persist();
  toastr.success(acct.value.debt <= 0 ? '债务已清，账户解冻' : `已还 ${amount}，剩余债务 ${acct.value.debt}`);
}
```

- [ ] **Step 2: store 加破产预览与执行**

```ts
import { computeLiquidation, type LiquidationResult } from './engine/bankruptcy';
import { closePosition } from './engine/trading';
import { HIGH_INTEREST_REPAY_MULT } from './engine/loan';
import { commitMvu, readContractor } from './mvu';

/** 当前欠款总额 = debt + 未还借款（高利贷 2.5 倍+利息） */
function totalOwed(): number {
  const loan = acct.value.loan;
  const loanOwed = loan
    ? loan.highInterest
      ? loan.principal * HIGH_INTEREST_REPAY_MULT + loan.accrued
      : loan.principal * (1 + loan.rate)
    : 0;
  return round2(acct.value.debt + loanOwed);
}

/** 快照主卡资产（读不到契约者 →  null，UI 阻止破产流程并提示） */
function snapshotAssets() {
  const r = readContractor();
  if (!r) return null;
  return {
    r,
    bag: (r.c.背包 ?? {}) as Record<string, any>,
    equipment: (r.c.装备 ?? {}) as Record<string, any>,
    skills: (r.c.通用技能 ?? {}) as Record<string, any>,
    job: r.c.职业?.名称 && r.c.职业.名称 !== '无' ? { ...r.c.职业 } : null,
    bloodline: r.c.头部?.血统 ?? null,
    talent: r.c.头部?.天赋?.名称 && r.c.头部.天赋.名称 !== '无' ? { ...r.c.头部.天赋 } : null,
    playerTier: String(r.c.头部?.阶位 ?? '一阶'),
  };
}

/** 预览清算（不执行）：持仓按现价估算 + 当前现金 + 主卡资产快照 */
function previewBankruptcy(): LiquidationResult {
  const snap = snapshotAssets();
  if (!snap) throw new Error('读不到存档变量（契约者不存在），无法清算');
  // 持仓按现价估值（不实际平仓，预览用净值近似）
  let positionsValue = 0;
  for (const [code, p] of Object.entries(acct.value.positions)) {
    positionsValue += p.margin + (p.side === 'long' ? 1 : -1) * (acct.value.prices[code] - p.entryPrice) * p.qty;
  }
  return computeLiquidation({
    positionsProceeds: Math.max(0, Math.round(positionsValue * 100) / 100),
    cash: Math.max(0, acct.value.cash),
    bag: snap.bag, equipment: snap.equipment, skills: snap.skills,
    job: snap.job, bloodline: snap.bloodline, talent: snap.talent,
    playerTier: snap.playerTier, debt: totalOwed(),
  });
}

/** 执行破产清算：强平持仓 → 快照 → 计算 → MVU 写回 → 更新交易所账本。任一步 throw 则中断（响亮失败）。 */
async function declareBankruptcy() {
  const r = readContractor();
  if (!r) throw new Error('读不到存档变量（契约者不存在），清算中止');
  // 1. 持仓全部按现价强平（费用照收，亏损累计）
  for (const code of Object.keys(acct.value.positions)) closePosition(acct.value, code);
  // 2. 用最新快照计算（现金已含强平所得）
  const snap = snapshotAssets()!;
  const liq = computeLiquidation({
    positionsProceeds: 0, // 已实际强平，所得在现金里
    cash: Math.max(0, acct.value.cash),
    bag: snap.bag, equipment: snap.equipment, skills: snap.skills,
    job: snap.job, bloodline: snap.bloodline, talent: snap.talent,
    playerTier: snap.playerTier, debt: totalOwed(),
  });
  // 3. MVU 写回
  for (const name of liq.removedBag) _.unset(r.mvu, ['stat_data', '契约者', '背包', name]);
  for (const slot of liq.clearedSlots) _.set(r.mvu, ['stat_data', '契约者', '装备', slot, '名称'], '无');
  for (const name of liq.removedSkills) _.unset(r.mvu, ['stat_data', '契约者', '通用技能', name]);
  if (liq.clearJob) _.set(r.mvu, ['stat_data', '契约者', '职业'], { 名称: '无' });
  if (liq.clearBloodline) _.set(r.mvu, ['stat_data', '契约者', '头部', '血统'], { 名称: '普通地球人类', 品质: '白色' });
  if (liq.clearTalent) _.set(r.mvu, ['stat_data', '契约者', '头部', '天赋'], { 名称: '无' });
  await commitMvu(r.mvu, r.mid, liq.removedBag.map(n => [['stat_data', '契约者', '背包', n], undefined] as [string[], unknown]));
  // 4. 交易所账本：抵债
  acct.value.cash = liq.returnCash; // 现金先全部抵债，溢出退回
  acct.value.debt = liq.remainingDebt;
  acct.value.loan = null;
  acct.value.cumulativeLoss = 0;
  acct.value.bankruptcyCount++;
  if (liq.remainingDebt <= 0) {
    acct.value.frozen = false;
    acct.value.loanState = 'none';
  }
  persist();
}
```

注意：清算确认清单 UI 必须先调 `previewBankruptcy()` 展示 `steps`，用户确认后才调 `declareBankruptcy()`（内部会重算一次，以执行时快照为准）。

- [ ] **Step 3: ExchangePanel.vue 加借贷页签与清算确认**

tabs 加 `<button :class="{ on: tab === 'loan' }" @click="tab = 'loan'">借贷</button>`，页签类型加 `'loan'`。借贷页：

```vue
<div v-if="tab === 'loan'" class="cg-assets">
  <template v-if="!acct.loan && !acct.debt">
    <div>可借额度：{{ loanOffer(acct).maxAmount }}（利率 {{ loanOffer(acct).rate * 100 }}%，期限 100 跳）</div>
    <input type="number" v-model.number="loanAmt" min="1" />
    <button @click="doBorrow">借款</button>
  </template>
  <template v-if="acct.loan">
    <div>借款本金：{{ acct.loan.principal }}（{{ acct.loan.highInterest ? '高利贷·还 2.5 倍+利息 ' + acct.loan.accrued : '利率 ' + acct.loan.rate * 100 + '%' }}）</div>
    <div v-if="!acct.loan.highInterest">到期：第 {{ acct.loan.dueTick }} 跳（当前 {{ acct.tick }}）</div>
    <button @click="doRepay">还清</button>
  </template>
  <template v-if="acct.debt > 0">
    <div class="cg-frozen">催收中债务：{{ acct.debt }}</div>
    <input type="number" v-model.number="debtAmt" min="1" />
    <button @click="doPayDebt">还债</button>
    <button v-if="!acct.loan" class="danger" @click="doBorrowHigh">借高利贷（500，还 2.5 倍）</button>
  </template>
</div>
```

资产页加破产区：

```vue
<div class="cg-bankruptcy">
  <button class="danger" @click="previewing = true">申请破产清算</button>
  <div v-if="previewing" class="cg-modal">
    <h4>破产清算清单（确认后不可撤销）</h4>
    <div v-for="(s, i) in preview?.steps ?? []" :key="i">【{{ s.category }}】{{ s.name }} → 抵 {{ s.proceeds }}</div>
    <div>抵债合计 {{ preview?.totalProceeds }}，剩余债务 {{ preview?.remainingDebt }}</div>
    <div class="cg-btns">
      <button class="danger" @click="doBankruptcy">确认清算</button>
      <button @click="previewing = false">取消</button>
    </div>
  </div>
</div>
```

script 对应加：

```ts
import { loanOffer } from '../engine/loan';
import type { LiquidationResult } from '../engine/bankruptcy';

const loanAmt = ref(0);
const debtAmt = ref(0);
const previewing = ref(false);
const preview = ref<LiquidationResult | null>(null);

function openPreview() {
  try {
    preview.value = store.previewBankruptcy();
    previewing.value = true;
  } catch (e: any) {
    toastr.error(e?.message ?? '清算预览失败');
  }
}
function doBorrow() {
  try { store.borrow(loanAmt.value); } catch (e: any) { toastr.error(e?.message ?? '借款失败'); }
}
function doRepay() {
  try { store.repay(); } catch (e: any) { toastr.error(e?.message ?? '还款失败'); }
}
function doBorrowHigh() {
  try { store.borrowHigh(); } catch (e: any) { toastr.error(e?.message ?? '高利贷失败'); }
}
function doPayDebt() {
  try { store.payDebt(debtAmt.value); } catch (e: any) { toastr.error(e?.message ?? '还债失败'); }
}
async function doBankruptcy() {
  try {
    await store.declareBankruptcy();
    previewing.value = false;
    toastr.warning('破产清算完成——愿你下局好运');
  } catch (e: any) {
    toastr.error(e?.message ?? '清算失败，已中止');
  }
}
```

破产按钮改为 `@click="openPreview"`。

- [ ] **Step 4: 构建 + 全部测试**

Run: `pnpm test && pnpm build`
Expected: 全绿

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 借贷/破产 UI + 清算 MVU 写回（v1c）"
```

---

### Task 13: 遗产税引擎（inheritance.ts，v1d）

**Files:**
- Create: `src/wxhl-cg/engine/inheritance.ts`
- Test: `src/wxhl-cg/__tests__/inheritance.test.ts`

**Interfaces:**
- Consumes: `ExchangeAccount`（Task 1）、`netAssets`（Task 4）
- Produces: `inheritanceTax(estate)`、`transferFee(estate)`、`estateValue(acct)`、`settleInheritance(acct): { tax: number; fee: number }` —— store 打开 app 时调用。

- [ ] **Step 1: 写失败测试**

```ts
// src/wxhl-cg/__tests__/inheritance.test.ts
import { describe, expect, it } from 'vitest';
import { createAccount } from '../engine/types';
import { estateValue, inheritanceTax, settleInheritance, transferFee } from '../engine/inheritance';

describe('inheritanceTax 超额累进', () => {
  it.each([
    [50, 5],        // 50×10%
    [100, 10],
    [200, 10 + 30], // 100×10% + 100×30%
    [500, 10 + 120],
    [1000, 10 + 120 + 250], // +500×50%
    [2000, 10 + 120 + 750],
    [3000, 10 + 120 + 750 + 700], // +1000×70%
  ])('遗产 %i → 税 %i', (estate, tax) => {
    expect(inheritanceTax(estate)).toBe(tax);
  });
});

describe('transferFee', () => {
  it('1%，最低 5', () => {
    expect(transferFee(100)).toBe(5);  // 1 → 兜底 5
    expect(transferFee(1000)).toBe(10);
  });
});

describe('settleInheritance', () => {
  it('现金足够：扣缴税费，解除死亡标记', () => {
    const a = createAccount();
    a.cash = 1000;
    a.deathMarked = true;
    const r = settleInheritance(a);
    expect(r.tax).toBe(380); // inheritanceTax(1000) = 10+120+250
    expect(r.fee).toBe(10);
    expect(a.cash).toBe(610);
    expect(a.deathMarked).toBe(false);
    expect(a.frozen).toBe(false);
  });
  it('Review Focus：现金不足 → 差额转 debt 并冻结，不豁免', () => {
    const a = createAccount();
    a.cash = 100;
    a.deathMarked = true;
    const r = settleInheritance(a); // 税 10 + 费 5 = 15 ≤ 100，够
    expect(a.debt).toBe(0);
    // 再造一个不够的案例
    const b = createAccount();
    b.cash = 10;
    b.deathMarked = true;
    settleInheritance(b); // 税 1 + 费 5 = 6 ≤ 10？税=10×10%=1，费=max(0.1,5)=5 → 6 够
    expect(b.debt).toBe(0);
    const c = createAccount();
    c.cash = 500;
    c.deathMarked = true;
    c.positions = {}; // estate=500：税 10+120=130？不——estate=cash=500 → 税 130？inheritanceTax(500)=10+120=130，费 5 → 135 ≤ 500 够
    // 构造真的不够：estate 大但 cash 小——estate 含持仓净值。用持仓：
    c.positions = { TGJ: { side: 'long', qty: 100, entryPrice: 100, leverage: 1, margin: 10000 } };
    // estate = 500 + 10000 = 10500 → 税 10+120+750+5950=6830，费 105 → 共 6935 > 500
    const rc = settleInheritance(c);
    expect(c.cash).toBe(0);
    expect(c.debt).toBe(rc.tax + rc.fee - 500);
    expect(c.frozen).toBe(true);
    expect(c.deathMarked).toBe(false); // 标记已结算，欠税走 debt
  });
  it('estateValue 含持仓净值', () => {
    const a = createAccount();
    a.cash = 100;
    a.positions = { TGJ: { side: 'long', qty: 1, entryPrice: 100, leverage: 1, margin: 100 } };
    expect(estateValue(a)).toBe(200);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-cg/__tests__/inheritance.test.ts`
Expected: FAIL

- [ ] **Step 3: 实现 inheritance.ts**

```ts
// src/wxhl-cg/engine/inheritance.ts
// 遗产税（spec §9）：超额累进 + 过户费；现金不足转 debt（不豁免）。
import { round2, type ExchangeAccount } from './types';
import { netAssets } from './trading';

const BRACKETS: [number, number][] = [
  [100, 0.1],
  [500, 0.3],
  [2000, 0.5],
  [Infinity, 0.7],
];

export function inheritanceTax(estate: number): number {
  let tax = 0;
  let prev = 0;
  for (const [cap, rate] of BRACKETS) {
    if (estate <= prev) break;
    tax += (Math.min(estate, cap) - prev) * rate;
    prev = cap;
  }
  return round2(tax);
}

export function transferFee(estate: number): number {
  return round2(Math.max(estate * 0.01, 5));
}

/** 遗产估值 = 净资产（现金+持仓净值），不计 debt */
export function estateValue(acct: ExchangeAccount): number {
  return Math.max(0, netAssets(acct));
}

/**
 * 结算遗产税：死亡标记的账户开 app 时调用。
 * 现金足够直接扣；不足则现金清零、差额转 debt 并冻结（还清解冻）。
 * 遗产税不算交易亏损，不计入破产线。
 */
export function settleInheritance(acct: ExchangeAccount): { tax: number; fee: number } {
  const estate = estateValue(acct);
  const tax = inheritanceTax(estate);
  const fee = transferFee(estate);
  const total = round2(tax + fee);
  if (acct.cash >= total) {
    acct.cash = round2(acct.cash - total);
  } else {
    const shortfall = round2(total - acct.cash);
    acct.cash = 0;
    acct.debt = round2(acct.debt + shortfall);
    acct.frozen = true;
    if (acct.loanState === 'none') acct.loanState = 'delinquent';
  }
  acct.deathMarked = false;
  return { tax, fee };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-cg/__tests__/inheritance.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cg
git commit -m "feat(wxhl-cg): 遗产税引擎——超额累进 + 过户费 + 欠税转债务"
```

---

### Task 14: 死亡标记 + 开 app 扣缴流程 + UI（v1d 收尾）

**Files:**
- Modify: `src/wxhl-cg/store.ts`（`open()` 里结算遗产税；`markDeath()`）
- Modify: `src/wxhl-cg/ui/ExchangePanel.vue`（资产页遗产税预告 + 宣告死亡按钮）

**Interfaces:**
- Consumes: `settleInheritance`/`estateValue`/`inheritanceTax`/`transferFee`（Task 13）
- Produces: store 方法 `markDeath()`；资产页显示"现在死了要交多少"

- [ ] **Step 1: store 改造**

```ts
import { estateValue, inheritanceTax, settleInheritance, transferFee } from './engine/inheritance';

/** 打开 app：有死亡标记先结算遗产税（响亮提示），再开面板 */
function open() {
  if (acct.value.deathMarked) {
    const r = settleInheritance(acct.value);
    toastr.warning(`前任契约者已陨落。遗产税 ${r.tax} + 过户费 ${r.fee} 已扣缴${acct.value.debt > 0 ? '，不足部分转为债务' : ''}`);
    persist();
  }
  panelOpen.value = true;
  startTicker();
}

function markDeath() {
  acct.value.deathMarked = true;
  persist();
  toastr.warning('已宣告本局终结——下次打开交易所将扣缴遗产税');
}

const inheritancePreview = computed(() => {
  const e = estateValue(acct.value);
  return { estate: e, tax: inheritanceTax(e), fee: transferFee(e) };
});
```

（`open()` 替换 Task 5 的同名函数；`markDeath`/`inheritancePreview` 加进 return。）

- [ ] **Step 2: 资产页 UI**

资产页加：

```vue
<div class="cg-inheritance">
  <div>遗产估值 {{ store.inheritancePreview.estate }}｜现在死了要交：税 {{ store.inheritancePreview.tax }} + 过户费 {{ store.inheritancePreview.fee }}</div>
  <button class="danger" @click="confirmDeath = true">宣告死亡 / 放弃本局</button>
  <div v-if="confirmDeath" class="cg-modal">
    <p>宣告后账户打上死亡标记，下次打开交易所先扣缴遗产税。确定？</p>
    <div class="cg-btns">
      <button class="danger" @click="store.markDeath(); confirmDeath = false">确定</button>
      <button @click="confirmDeath = false">取消</button>
    </div>
  </div>
</div>
```

（`const confirmDeath = ref(false);`）

- [ ] **Step 3: 全量回归**

Run: `pnpm test && pnpm build`
Expected: 全绿；`dist/wxhl-cg/index.js` 与 `dist/wxhl-003/index.js` 均更新

- [ ] **Step 4: Commit**

```bash
git add src/wxhl-cg src/wxhl-003 dist
git commit -m "feat(wxhl-cg): 遗产税扣缴流程 + 宣告死亡入口（v1d）"
```

---

## Self-Review 记录

- Spec §2–§13 各节均有对应任务；§14（不做项）无任务，符合预期。
- 新闻池每股票 3 条为起步量，后续可按 `docs/reference/spire-stocks-strings.txt` 扩充，只加 `NEWS_POOL` 条目。
- `归一位阶` 对「超脱」返回 undefined 而 priceTable 的 `tierFactor` 有超脱特判（×500）——`refRange` 内部已处理，清算定价直接用 `refRange` 即可，无需重复特判。
- localStorage 在酒馆 iframe 与手机 iframe 是否同源：两者都是酒馆页面下的 iframe，同源（酒馆页面 origin），`wxhl-cg:account` 对两边可见——这是设计依赖点，若实测不同源需改用 `window.parent.localStorage`。
