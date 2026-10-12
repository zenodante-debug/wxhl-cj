# wxhl-cg 交易所 · UI 重做与玩法修补 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把回廊交易所从"多页签挂机玩具"改成单页、有基准线/强平线、红绿分明、常驻计时的交易所；砍掉借贷/遗产税/徽章/本局概念；保留破产清算变卖瀑布（改由破产线自动触发）。

**Architecture:** 沿用 `src/wxhl-cg` 独立脚本：`engine/`（纯函数 + vitest）+ `store.ts`（副作用：localStorage / 10s 常驻计时 / MVU 读写）+ `ui/`（单页面板）。窗口从"铺满视口"改为"状态栏窗口尺寸的浮窗"。

**Tech Stack:** TypeScript、Vue 3 + pinia、zod、vitest、webpack（`pnpm build` / `pnpm test`）。

**Spec:** [docs/superpowers/specs/2026-10-12-wxhl-cg-stock-exchange-design.md](../specs/2026-10-12-wxhl-cg-stock-exchange-design.md)（本计划含对其的定向修订，见 Task 7）

## Global Constraints

- 引擎（`src/wxhl-cg/engine/**`）禁止 import 酒馆运行时全局；只允许 import `../wxhl-003/market/priceTable` 与 `../wxhl-003/dice`（纯函数模块）。
- 颜色口径（用户 2026-10-12 拍板）：**红 = 亏损，绿 = 盈利**（与 A 股惯例相反，必须严格照此）。
- 所有输入框、按钮必须有显式背景色与文字色，禁止出现白底白字（浏览器默认控件样式）。
- 计时器常驻：脚本加载即开跳（10 秒/跳），不依赖面板是否打开。
- 费用：佣金 = clamp(成交额×1%, 1, 保证金×10%)；印花税 = min(成交额×0.1%, 保证金×1%)（仅卖出方）；最低保证金 = 5。
- 破产线 = 250（累计已实现亏损），越过即自动清算。
- 清算瀑布顺序不变：交易所持仓+现金 → 背包 → 装备七槽 → 通用技能 → 职业 → 血统 → 天赋；定价 = 品质查 BASE 表 × (归一阶位+1)²；抵不完的部分继续背（`debt`），账户冻结直到清偿。
- 金额一律 `round2` 两位小数。
- 坏数据响亮失败（throw / toastr + console.error），不静默兜底。

## Review Focus

1. **破产自动清算时的 MVU 不可读**：不能卡死计时器、不能半清算（交易所侧已平仓但主卡没动）。→ Task 2 测试钉住"写回失败则整体回滚 + 记日志 + 下一跳重试"。
2. **最低保证金 5**：qty×价格/杠杆 < 5 时必须拒绝而不是放行。→ Task 2 测试钉住。
3. **佣金下限 1 与印花税上限**：小额单的费用不能为 0 也不能超过保证金比例。→ Task 2 测试钉住。
4. **破产线判定用的是已实现亏损**：浮亏不计入（否则持仓瞬间就会触发）。→ Task 2 测试钉住。
5. **日志无限增长**：localStorage 里的 logs 必须有上限。→ Task 3 测试钉住。
6. **图表 y 轴范围**：强平线/开仓线可能远在价格序列之外，漏进去会把价格线压成一条直线。→ Task 4 测试钉住几何函数对越界线的处理。

---

### Task 1: 引擎瘦身 —— 砍掉借贷 / 失信 / 高利贷 / 遗产税

**Files:**
- Delete: `src/wxhl-cg/engine/loan.ts`、`src/wxhl-cg/__tests__/loan.test.ts`
- Delete: `src/wxhl-cg/engine/inheritance.ts`、`src/wxhl-cg/__tests__/inheritance.test.ts`
- Modify: `src/wxhl-cg/engine/types.ts`（去 `ActiveLoan`/`LoanState`/`loan`/`loanState`/`deathMarked`；加 `netInvested`、`logs`、`openPrices`）
- Modify: `src/wxhl-cg/store.ts`（去借贷/遗产税方法、`tickLoan`、死亡结算、schema 字段）
- Modify: `src/wxhl-cg/ui/ExchangePanel.vue`（摘掉借贷页签与相关按钮/handler，其余暂留）

**Interfaces:**
- Produces: `LogEntry`、`ExchangeAccount.netInvested: number`、`ExchangeAccount.logs: LogEntry[]`、`ExchangeAccount.openPrices: Record<string, number>`、`LOG_CAP`

- [ ] **Step 1: 写失败测试（新类型字段存在且默认正确）**

```ts
// src/wxhl-cg/__tests__/stocks.test.ts 追加
it('账户带 净投入/日志/开盘基准价 字段', () => {
  const acct = createAccount();
  expect(acct.netInvested).toBe(0);
  expect(acct.logs).toEqual([]);
  expect(acct.openPrices['TGJ']).toBe(100);
  expect('loan' in acct).toBe(false);
  expect('loanState' in acct).toBe(false);
  expect('deathMarked' in acct).toBe(false);
});
```

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run src/wxhl-cg/__tests__/stocks.test.ts` → FAIL

- [ ] **Step 3: 改 types.ts**（去三个字段、加三个字段与 LogEntry）

```ts
export type LogKind = 'news' | 'trade' | 'system';
export interface LogEntry {
  tick: number;
  time: string; // 现实时钟 HH:MM:SS
  kind: LogKind;
  text: string;
}
export const LOG_CAP = 200; // 存档上限（界面只显示最近 50 条）
```
`createAccount()` 里：删 `loan`/`loanState`/`deathMarked`，加 `netInvested: 0, logs: [], openPrices: {...prices}`。

- [ ] **Step 4: 删文件 + 清 store.ts**

```bash
git rm src/wxhl-cg/engine/loan.ts src/wxhl-cg/__tests__/loan.test.ts
git rm src/wxhl-cg/engine/inheritance.ts src/wxhl-cg/__tests__/inheritance.test.ts
```
`store.ts`：
- 删 import：`HIGH_INTEREST_REPAY_MULT, loanOffer, repayDebt, repayLoan, takeHighInterestLoan, takeLoan, tickLoan`、`estateValue, inheritanceTax, settleInheritance, transferFee`
- 删函数：`borrow/borrowHigh/repay/payDebt/loanOffer/markDeath/inheritancePreview`、`totalOwed` 的借款部分（破产只按 `acct.debt` 计）
- 删 `doTick` 里的 `tickLoan(acct.value)`
- 删 `open()` 里的死亡结算分支（只留 `panelOpen=true; startTicker()`）
- `AccountSchema`：删 `loan`/`loanState`/`deathMarked`，加 `netInvested: z.number()`、`openPrices: z.record(z.string(), z.number())`、`logs: z.array(z.object({ tick: z.number(), time: z.string(), kind: z.enum(['news','trade','system']), text: z.string() }))`
- 删 `storeFlow.test.ts` 里依赖借贷/遗产税/负 UP 的用例（保 C1/I3/I4 三条），`loanState` 相关断言一并清

- [ ] **Step 5: 面板摘掉借贷页签**（最小改动，保持可编译；整页在 Task 5 重写）

删 `tab === 'loan'` 的整个 `<div>`、页签按钮、`loanAmt/debtAmt/doBorrow/doRepay/doBorrowHigh/doPayDebt` handler 与 `loanOffer` 引用；`tab` 类型收敛为 `'market' | 'positions' | 'assets'`。

- [ ] **Step 6: 跑全部测试 + 构建** — `pnpm test`（除已知 cloudflare hasMore 存量失败外全绿）+ `pnpm build` 成功

- [ ] **Step 7: Commit**

```bash
git add -A src/wxhl-cg && git commit -m "refactor(wxhl-cg): 砍掉借贷/失信/高利贷/遗产税，账户加净投入/日志/开盘基准价"
```

---

### Task 2: 破产线自动触发 + 费用护栏

**Files:**
- Modify: `src/wxhl-cg/engine/trading.ts`（佣金/印花税/最低保证金）
- Create: `src/wxhl-cg/engine/bankrupt.ts`（破产线判定 + 触发条件，纯函数）
- Modify: `src/wxhl-cg/store.ts`（doTick 检测破产线 → 自动清算 + 回滚重试）
- Test: `src/wxhl-cg/__tests__/trading.test.ts`、`src/wxhl-cg/__tests__/bankrupt.test.ts`、`src/wxhl-cg/__tests__/storeFlow.test.ts`

**Interfaces:**
- Consumes: `computeLiquidation`（既有）、`closePosition(acct, code, force)`
- Produces: `BANKRUPTCY_LINE = 250`、`shouldGoBankrupt(acct): boolean`、`tradePreview(acct, code, side, qty, leverage): { notional, margin, fee, stamp, total }`

- [ ] **Step 1: 写失败测试**

```ts
// trading.test.ts 追加
it('佣金下限 1、上限保证金 10%', () => {
  expect(commission(10, 100)).toBe(1);        // 1% = 0.1 → 下限 1
  expect(commission(100000, 1000)).toBe(100); // 1% = 1000 → 上限 100
});
it('印花税上限 = 保证金 1%', () => {
  const a = withCash(10000);
  openPosition(a, 'TGJ', 'short', 1000, 100); // 名义 100000 保证金 1000
  // 0.1% = 100 > 上限 10
  expect(closeStampOf(a)).toBe(10); // 经由 closePosition 的 stamp 字段断言
});
it('最低保证金 5：小单拒绝', () => {
  const a = withCash(10000);
  expect(() => openPosition(a, 'TGJ', 'long', 1, 100)).toThrow(/最低保证金/); // 100/100 = 1 < 5
});

// bankrupt.test.ts
it('破产线：已实现亏损 > 250 才触发，浮亏不算', () => {
  const a = createAccount();
  a.cumulativeLoss = 250;
  expect(shouldGoBankrupt(a)).toBe(false);
  a.cumulativeLoss = 250.01;
  expect(shouldGoBankrupt(a)).toBe(true);
});
it('tradePreview 与实际开仓扣款一致', () => {
  const a = withCash(10000);
  const p = tradePreview(a, 'TGJ', 'long', 2, 5);
  const cash0 = a.cash;
  openPosition(a, 'TGJ', 'long', 2, 5);
  expect(cash0 - a.cash).toBe(p.total);
});
```

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run src/wxhl-cg/__tests__/trading.test.ts src/wxhl-cg/__tests__/bankrupt.test.ts` → FAIL

- [ ] **Step 3: 实现**

```ts
// trading.ts
export const MIN_MARGIN = 5;
export const COMMISSION_MIN = 1;
export const STAMP_MARGIN_CAP = 0.01;
export function commission(notional: number, margin: number): number {
  return round2(Math.min(Math.max(notional * COMMISSION_RATE, COMMISSION_MIN), margin * COMMISSION_MARGIN_CAP));
}
export function stampTax(notional: number, margin: number): number {
  return round2(Math.min(notional * STAMP_RATE, margin * STAMP_MARGIN_CAP));
}
// stampTax 在 openPosition（开空）与 closePosition（平多）里替换原来的 round2(notional*STAMP_RATE)
// openPosition 里 margin < MIN_MARGIN 时 throw new Error(`保证金 ${margin} 低于最低保证金 ${MIN_MARGIN}`)
export function tradePreview(acct, code, side, qty, leverage) { /* 与 openPosition 同算式，只算不动账本 */ }
```

```ts
// bankrupt.ts
import type { ExchangeAccount } from './types';
export const BANKRUPTCY_LINE = 250;
/** 只按已实现亏损判定（浮亏不动），越过即应清算 */
export function shouldGoBankrupt(acct: ExchangeAccount): boolean {
  return acct.cumulativeLoss > BANKRUPTCY_LINE && acct.debt <= 0;
}
```

`store.ts` 的 `doTick`：`tickTrading` 之后
```ts
if (shouldGoBankrupt(acct.value)) {
  try { await autoLiquidate(); }        // = 原 declareBankruptcy（去掉 loan 部分），末尾写日志
  catch (e) { console.error(...); log('system', '破产清算失败：' + msg + '，下一跳重试'); }
}
```
`autoLiquidate` 保持既有"快照 → 强平 → 计算 → MVU 写回 → 改账本，失败整体回滚"结构，并：`debt = liq.remainingDebt`；`debt > 0` ⇒ `frozen = true`；写日志（system）。

- [ ] **Step 4: 跑测试确认通过** — 同上命令 → PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(wxhl-cg): 破产线自动触发清算 + 佣金下限/印花税上限/最低保证金"`

---

### Task 3: 账户指标 + 交易所日报日志

**Files:**
- Modify: `src/wxhl-cg/engine/types.ts`（已加字段）、`src/wxhl-cg/engine/metrics.ts`（新建：纯计算）、`src/wxhl-cg/store.ts`（记账 + 写日志）
- Test: `src/wxhl-cg/__tests__/metrics.test.ts`

**Interfaces:**
- Produces: `positionEquitySum(acct)`（= 持仓权益）、`totalPnl(acct)`（总盈亏）、`pushLog(acct, kind, text)`、`visibleLogs(acct)`（倒序最近 50）

- [ ] **Step 1: 写失败测试**

```ts
it('净投入随入金/出金变动，总盈亏 = 净资产 − 净投入', () => {
  const a = createAccount();
  a.cash = 990; a.netInvested = 1000;   // 模拟存入 1000UP → 990 币
  a.positions = { TGJ: { side: 'long', qty: 1, entryPrice: 100, leverage: 1, margin: 100 } };
  a.prices['TGJ'] = 110;
  expect(positionEquitySum(a)).toBe(110);
  expect(netAssets(a)).toBe(1100);
  expect(totalPnl(a)).toBe(100);
});
it('日志倒序、封顶 50 条可见、存档封顶 200 条', () => {
  const a = createAccount();
  for (let i = 0; i < 260; i++) pushLog(a, 'system', `第${i}条`);
  expect(a.logs.length).toBe(LOG_CAP);
  const v = visibleLogs(a);
  expect(v.length).toBe(50);
  expect(v[0].text).toBe('第259条');
});
```

- [ ] **Step 2: 跑测试确认失败** — `pnpm vitest run src/wxhl-cg/__tests__/metrics.test.ts` → FAIL

- [ ] **Step 3: 实现 metrics.ts + store 记账**

```ts
// engine/metrics.ts
export function positionEquitySum(acct: ExchangeAccount): number { /* Σ positionEquity */ }
export function totalPnl(acct: ExchangeAccount): number { return round2(netAssets(acct) - acct.netInvested); }
export function pushLog(acct: ExchangeAccount, kind: LogKind, text: string): void {
  const d = new Date();
  const time = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}:${String(d.getSeconds()).padStart(2, '0')}`;
  acct.logs.push({ tick: acct.tick, time, kind, text });
  if (acct.logs.length > LOG_CAP) acct.logs.splice(0, acct.logs.length - LOG_CAP);
}
export function visibleLogs(acct: ExchangeAccount): LogEntry[] { return acct.logs.slice(-50).reverse(); }
```
`store.ts`：
- `depositUP`：`acct.netInvested = round2(acct.netInvested + credited)`；`pushLog('system', '存入 100UP → 99 币')`
- `withdrawUP`：`acct.netInvested = round2(acct.netInvested - amount)`；日志同理
- `doTick`：`tickMarket` 产生新闻时 `pushLog('news', acct.news!.text)`
- 开仓/平仓/强平/破产：各自 `pushLog('trade', '做多 TGJ ×10 @100 保证金 100（佣金 1 + 印花税 0）')`

- [ ] **Step 4: 跑测试确认通过** — 同上 → PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(wxhl-cg): 账户指标（持仓权益/净投入/总盈亏）+ 交易所日报日志"`

---

### Task 4: 走势图 PriceChart.vue（基准线 / 开仓线 / 强平线）

**Files:**
- Create: `src/wxhl-cg/ui/chartGeometry.ts`（纯函数，可测）、`src/wxhl-cg/ui/PriceChart.vue`
- Delete: `src/wxhl-cg/ui/SparkLine.vue`（列表里的小走势图改用 `PriceChart` 的精简模式，或保留 SparkLine 但改配色——见 Step 3）
- Test: `src/wxhl-cg/__tests__/chartGeometry.test.ts`

**Interfaces:**
- Produces: `chartGeometry(opts: { data: number[]; lines: {value: number; label: string; kind: 'base'|'entry'|'liq'}[]; width: number; height: number; pad?: number }): { polyline: string; gridY: {y: number; value: number}[]; lineY: {y: number; label: string; kind: string}[]; up: boolean }`

- [ ] **Step 1: 写失败测试**

```ts
it('价格折线点数与数据一致，且都在绘图区内', () => {
  const g = chartGeometry({ data: [10, 12, 11, 15], lines: [], width: 200, height: 100 });
  expect(g.polyline.split('L').length).toBe(4);
});
it('基准线落在对应价位上；越界的线被夹到边界而不影响价格线比例', () => {
  const g = chartGeometry({ data: [100, 101, 99], lines: [{ value: 100, label: '开盘', kind: 'base' }], width: 200, height: 100 });
  expect(g.lineY[0].label).toBe('开盘');
  // 强平线远低于/高于数据范围时夹边界
  const g2 = chartGeometry({ data: [100, 101], lines: [{ value: 1, label: '强平', kind: 'liq' }], width: 200, height: 100 });
  expect(g2.lineY[0].y).toBeLessThanOrEqual(100);
});
it('涨跌方向：相对首值向上为 up', () => {
  expect(chartGeometry({ data: [10, 12], lines: [], width: 10, height: 10 }).up).toBe(true);
  expect(chartGeometry({ data: [10, 9], lines: [], width: 10, height: 10 }).up).toBe(false);
});
```

- [ ] **Step 2: 跑测试确认失败** → FAIL

- [ ] **Step 3: 实现 chartGeometry.ts + PriceChart.vue**

规则（写进实现注释）：
- y 轴范围只按**价格序列**定（min/max 加 2% padding）；`entry`/`liq`/`base` 线若越界则夹到上下边界（**不**把范围拉大，避免价格线被压平——Review Focus 6）
- 颜色：`up ? '#30a46c' : '#e5484d'`（绿盈红亏）；基准线灰虚线；开仓线琥珀；强平线红虚线并标注"强平"
- 列表里的迷你图沿用 `SparkLine`，但配色改为绿涨红跌，与主图一致

- [ ] **Step 4: 跑测试确认通过** → PASS

- [ ] **Step 5: Commit** — `git commit -m "feat(wxhl-cg): 走势图带开盘基准线/开仓价线/强平线（绿盈红亏）"`

---

### Task 5: 单页布局重写 + 配色修复 + 存取预设

**Files:**
- Modify: `src/wxhl-cg/ui/ExchangePanel.vue`（整页重写）
- Create: `src/wxhl-cg/ui/AssetPanel.vue`、`src/wxhl-cg/ui/PositionsPanel.vue`、`src/wxhl-cg/ui/TradeLog.vue`（拆小文件，避免单文件过长）

**Interfaces:**
- Consumes: Task 3 的 `positionEquitySum/totalPnl/visibleLogs`、Task 4 的 `PriceChart`、Task 2 的 `tradePreview`
- Produces: 单页布局；`store.depositUP/withdrawUP` 的预设入口；`store.doTick()` 的"点击跳过"

- [ ] **Step 1: 按图纸实现布局**

```
┌ header: 回廊交易所 · 下次跳动 7s [跳过] · [✕] ┐
├──────────┬──────────────────┬─────────────────┤
│ 股票列表  │ PriceChart       │ 账户资产         │
│ (含迷你图 │ + 现价/涨跌幅     │ 现金/UP/持仓权益 │
│  与涨跌幅)│ + 数量/杠杆       │ 净投入/总盈亏    │
│          │ + 费用预览        │ 破产线进度       │
│          │ + 做多/做空       │─────────────────│
│          │                  │ 持仓(距强平%)    │
├──────────┴──────────────────┴─────────────────┤
│ 交易所日报（最近 50 条，新闻/操作混排，倒序）   │
└───────────────────────────────────────────────┘
```

- [ ] **Step 2: 配色板照抄状态栏（`src/wxhl-003/statusbar/theme.scss:21-48`），全套变量搬进 `.cg-panel` 作用域**

```css
.cg-panel {
  --cg-void: #080504;      /* 最底 */
  --cg-bg: #120b07;        /* 面板底 */
  --cg-panel: #241812;     /* 卡片 */
  --cg-panel-2: #2e1e14;
  --cg-sub: #1a100a;
  --cg-border: #4a3226;
  --cg-border-soft: #33221a;
  --cg-hover: #3a2418;
  --cg-amber: #e8c078;     /* 主强调 */
  --cg-amber-dim: #c8a060;
  --cg-gold: #d0a850;
  --cg-ember: #d8914a;
  --cg-chalk: #e8dfd2;     /* 主文字 */
  --cg-chalk-dim: #b3a390;
  --cg-dim: #7d6c58;       /* 次要文字 */
  --cg-up: #6ac08a;        /* 盈利（绿） */
  --cg-down: #d05040;      /* 亏损（红） */
  --cg-font-display: 'Noto Serif SC', 'SimSun', serif;
  --cg-font-body: 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif;
  --cg-font-mono: 'JetBrains Mono', 'Courier New', monospace;
  background: var(--cg-void);
  color: var(--cg-chalk);
  font-family: var(--cg-font-body);
}
```
标题/股票名用 `--cg-font-display`，数字一律 `--cg-font-mono`。**红绿只用于盈亏与涨跌数字**（`--cg-up`/`--cg-down`），不做大块背景。

- [ ] **Step 3: 修白底白字**

面板根作用域下给所有控件显式配色（这是本任务必须落地的一条）：
```css
.cg-panel input, .cg-panel button, .cg-panel select {
  background: var(--cg-panel); color: var(--cg-chalk);
  border: 1px solid var(--cg-border); border-radius: 6px;
  padding: 4px 8px; font: inherit; font-family: var(--cg-font-body);
}
.cg-panel input::placeholder { color: var(--cg-dim); }
.cg-panel button { cursor: pointer; }
.cg-panel button:hover { background: var(--cg-hover); }
.cg-panel button:disabled { opacity: .45; cursor: not-allowed; }
.cg-panel input[type='range'] { padding: 0; border: none; background: transparent; }
```
（`.cg-panel` 上可能被酒馆页面的全局样式穿透，必要时对 `input/button` 用 `!important`——先不加，肉眼核对不行再加。）

- [ ] **Step 4: 存取四预设**

`100UP / 1000UP / 一半 / 全部` 四个按钮 × 存入/取出两排；每个按钮先算可用量并 clamp，不可用时禁用并显示 tooltip 文案；日志记录实际发生额。

- [ ] **Step 5: 构建 + 人工核对勾选**（无自动测试；逐条对照用户十条）

- [ ] **Step 6: Commit** — `git commit -m "feat(wxhl-cg): 单页布局（左行情/中详情/右上资产/右下持仓/下日报）+ 状态栏配色 + 存取预设"`

---

### Task 6: 常驻计时 + 窗口尺寸/手机适配

**Files:**
- Modify: `src/wxhl-cg/index.ts`、`src/wxhl-cg/store.ts`、`src/wxhl-cg/ui/ExchangePanel.vue`（窗口容器 CSS）

**Interfaces:**
- Produces: `store.nextTickAt`（下一跳时间戳）+ `store.skipTick()`；窗口容器尺寸规则

尺寸规则**直接取自 `src/wxhl-003/App.vue:6208-6219`（状态栏打开态）与 `src/wxhl-003/mobile-compat.js:209-251`**：

| | 桌面端（非手机） | 手机端（`isPhone()` 为真） |
|---|---|---|
| 宽 | `min(980px, 94vw)` | `visualViewport.width - 12` |
| 高 | `min(92dvh, 920px)`（保留 `92vh` 回退行） | `visualViewport.height - 12` |
| 圆角 | 18px | 14px |
| 定位 | 居中（遮罩 flex 居中即可） | `visualViewport.offsetLeft/Top` + `getBoundingClientRect()` 自校正 |

手机阈值与状态栏一致（`mobile-compat.js:12-17`）：`(pointer: coarse)` 或 `(hover: none)` 或 `visualViewport.width ≤ 768`。

- [ ] **Step 1: 常驻计时**

`index.ts` 挂载后立即 `store.startTicker()`（不再等 `open()`）；`store.nextTickAt = Date.now() + TICK_MS`，在 `startTicker()` 与每次 `doTick()` 末尾刷新；新增 `skipTick()` = 立即 `doTick()` 且重置 `nextTickAt`（不叠加 interval）。组件里用 1s 的 `setInterval` 只做倒计时显示（不推进行情）。

- [ ] **Step 2: 计时与面板解耦**

`persist()` 与行情推进都不看 `panelOpen`；`panelOpen` 只控制面板显隐。

- [ ] **Step 3: 窗口 CSS（桌面端）**

```css
.cg-overlay { position: fixed; inset: 0; z-index: 2147483640; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,.65); backdrop-filter: blur(4px);
  padding: env(safe-area-inset-top,0) env(safe-area-inset-right,0) env(safe-area-inset-bottom,0) env(safe-area-inset-left,0); }
.cg-panel { width: min(980px, 94vw); height: min(92dvh, 920px); border-radius: 18px; overflow: hidden;
  display: flex; flex-direction: column; box-shadow: 0 24px 60px rgba(0,0,0,.6); }
```
（根节点 `#wxhl-cg-root` 保持 `position:fixed; inset:0; z-index:2147483647; pointer-events:none`，面板与遮罩各自 `pointer-events:auto`。）

- [ ] **Step 4: 手机端适配（在 `index.ts` 里对一个元素跑，照抄 mobile-compat 的自校正定位）**

```ts
const host = window.parent as any;
const isPhone = () => {
  const coarse = host.matchMedia?.('(pointer: coarse)')?.matches;
  const noHover = host.matchMedia?.('(hover: none)')?.matches;
  const vw = host.visualViewport?.width || host.innerWidth || 9999;
  return Boolean(coarse || noHover || vw <= 768);
};
const fit = () => {
  const el = $app.find('.cg-panel')[0] as HTMLElement | undefined;
  if (!el || !isPhone()) { /* 清掉内联样式，回到桌面端 CSS */ return; }
  const vv = host.visualViewport;
  const vp = { left: vv?.offsetLeft || 0, top: vv?.offsetTop || 0, width: vv?.width || host.innerWidth, height: vv?.height || host.innerHeight };
  const fw = vp.width - 12, fh = vp.height - 12;
  el.style.cssText += `;width:${fw}px;height:${fh}px;max-width:${fw}px;max-height:${fh}px;border-radius:14px;margin:0;`;
  // 自校正：先设 left/top，再量 getBoundingClientRect 的偏差抵消（祖先有 backdrop-filter/transform 时 fixed 包含块不是视口）
  el.style.left = `${vp.left + (vp.width - fw) / 2}px`;
  el.style.top = `${vp.top + (vp.height - fh) / 2}px`;
  const r = el.getBoundingClientRect();
  el.style.left = `${parseFloat(el.style.left) + (vp.left + (vp.width - fw) / 2 - r.left)}px`;
  el.style.top = `${parseFloat(el.style.top) + (vp.top + (vp.height - fh) / 2 - r.top)}px`;
};
host.addEventListener('resize', fit);
host.visualViewport?.addEventListener('resize', fit);
host.visualViewport?.addEventListener('scroll', fit);
fit();
```

- [ ] **Step 5: 构建 + 人工核对**（桌面宽带 / 桌面窄带 / 手机视口三档）
- [ ] **Step 6: Commit** — `git commit -m "feat(wxhl-cg): 常驻 10s 计时 + 窗口缩成状态栏尺寸并做手机端适配"`

---

### Task 7: 收尾 —— dist、spec 修订、全量回归

- [ ] **Step 1: 修订 spec**：§5 费用补 floor/cap 与最低保证金；§6 UP 兑换加预设；§7 整节改为"破产线与自动清算"（删借贷/失信/高利贷）；§9 遗产税整节删除并注明原因；§10 UI 换成单页图纸；§13 分期改写；§14 明确不做项增加徽章/本局/借贷/典当
- [ ] **Step 2: `pnpm build` 重建 + `git add dist/wxhl-cg dist/wxhl-003`**
- [ ] **Step 3: 全量 `pnpm test`**，确认除已知 cloudflare hasMore 存量失败外全绿
- [ ] **Step 4: Commit** — `git commit -m "docs(wxhl-cg): spec 同步重做后的形态 + 重建 dist"`
