# wxhl-cg 回廊交易所 · 设计文档

日期：2026-10-12
状态：待用户评审

## 1. 背景与目标

为「无限回廊」角色卡的小手机新增一个**炒股 app**：参考《杀戮尖塔》mod「杀跌尖塔」（SpireStocks，素材已提取存于 `docs/reference/spire-stocks-strings.txt`），做单机版交易所。

已确认的边界：

- **单机**：不做联机、不做全球榜、不做徽章收集。
- **形态**：独立脚本项目 `src/wxhl-cg`（方案 A），通过 `initializeGlobal('WxhlCg', …)` 暴露接口；小手机（wxhl-003）只新增一个 app 图标调起。
- **行情**：仅在 app 打开时每 10 秒一跳，纯脚本内计时器，不监测楼层、不补跳。
- **存档**：浏览器 localStorage（跨聊天、跨档持久）。换新档想继续玩股市，必须先清欠（遗产税/债务）。
- **货币**：交易所内部记账，与主卡 UP 双向兑换，1 UP = 1 交易所币，双向各收 1% 手续费。
- **借贷**：交易所内置借贷窗口（无固定 NPC），一次一笔，未还清不能再借。
- **破产清算**：按固定瀑布变卖主卡角色资产抵债（见 §8）。

## 2. 总体架构

```
src/wxhl-cg/
  index.ts            # 入口：fixed 根节点挂载 vue 面板 + initializeGlobal('WxhlCg', { open, toggle, isOpen })
  engine/             # 纯 TS 零依赖引擎（vitest 可测，不 import 酒馆接口）
    types.ts          # 账户/持仓/借款/新闻/清算 类型
    stocks.ts         # 10 只势力股票定义（名称/代码/基准价/波动率分档）
    market.ts         # 行情跳动（几何随机游走 + 新闻冲击）
    news.ts           # 新闻池：标题情绪与实际冲击分离（照搬原作"新闻不一定准"）
    trading.ts        # 开平仓、佣金/印花税、强平判定、杠杆利息
    loan.ts           # 借贷/失信/高利贷 状态机
    bankruptcy.ts     # 破产清算瀑布（纯计算：输入资产快照，输出清算清单）
    inheritance.ts    # 遗产税累进计算
  store.ts            # pinia：驱动引擎、localStorage 持久化、MVU 读写（UP 兑换/清算写回）
  ui/
    ExchangePanel.vue # 主面板（行情/个股/持仓/借贷/资产 五页签）
    ...               # 子组件：股票行、迷你走势线、交易对话框、借贷窗口、清算确认清单
  __tests__/          # vitest，只测 engine（纯函数）
```

约定（沿用 wxhl-combat 已验证模式）：

- `index.ts` 学 wxhl-combat：`createScriptIdDiv` 挂 `position: fixed; z-index: 2147483647; pointer-events: none` 根节点，尺寸用 `window.parent.visualViewport`，`teleportStyle()` 复制样式，`pagehide` 卸载。
- 面板显示态由 `WxhlCg.open()/toggle()` 控制；wxhl-003 侧 `await waitGlobalInitialized('WxhlCg')` 后调用。
- 引擎不碰 `Mvu`/localStorage/DOM；store 层负责所有副作用。坏数据一律响亮失败（toastr + console.error），不静默兜底（项目既定原则）。
- 构建/测试：`pnpm build` / `pnpm watch` / `pnpm test`（vitest）。

## 3. 数据模型（localStorage）

key：`wxhl-cg:account`（JSON，zod parse，版本字段 `v` 便于迁移）。

```ts
interface ExchangeAccount {
  v: 1;
  cash: number;                       // 交易所币，可为负（高利贷利息可扣成负数）
  positions: Record<string, Position>; // key = 股票代码
  prices: Record<string, number>;      // 股票代码 -> 现价
  priceHistory: Record<string, number[]>; // 每股票最近 60 跳（画走势线）
  tick: number;                        // 累计跳动数（借贷到期、利息的计时单位）
  loan: ActiveLoan | null;             // 一次一笔
  loanState: 'none' | 'normal' | 'overdue' | 'delinquent'; // 失信 = delinquent
  highInterestLoan: boolean;           // 高利贷未清标记
  debt: number;                        // 清算后剩余债务（跨档背着）
  bankruptcyCount: number;
  deathTaxDue: { estate: number; tax: number; fee: number } | null; // 待缴遗产税
  cumulativeLoss: number;              // 累计已实现亏损（破产线判定用）
  frozen: boolean;                     // 失信冻结中
  news: { text: string; stock: string; impact: number; ttl: number } | null;
}

interface Position {
  side: 'long' | 'short';
  qty: number;              // 股数
  entryPrice: number;       // 开仓均价
  leverage: number;         // 1–100
  margin: number;           // 占用保证金
}

interface ActiveLoan {
  principal: number;
  rate: number;             // 单期利率
  dueTick: number;          // 到期跳动数
  highInterest: boolean;    // 高利贷：还 2.5 倍 + 递增利息
  accrued: number;          // 高利贷已累计利息
}
```

## 4. 行情引擎

- **跳动**：app 打开时 `setInterval` 10s 一跳；`tick++`；几何随机游走 `price *= exp(σ·N(0,1) + drift)`，σ 按股票分档；价格下限 0.01（不清零退市）。
- **股票池**（10 只，波动低→很高，名称/代码初稿可调）：

| 代码 | 名称 | 势力 | 波动档 | σ |
|---|---|---|---|---|
| TGJ | 特管局后勤 | 特管局 | 极低 | 0.4% |
| OETA | OETA 安保 | OETA | 低 | 0.8% |
| LHJ | 零号局情报 | 零号局 | 中低 | 1.2% |
| EJS | EJSSA 竞技 | EJSSA | 中低 | 1.6% |
| FM | 非盟商会 | 非盟 | 中 | 2.2% |
| PLH | 泛联控股 | 泛东亚联合体 | 中高 | 3.0% |
| SJH | 圣辉教会 | 神圣教会 | 中高 | 3.8% |
| FZJT | 方舟集团 | 方舟集团 | 高 | 5.0% |
| RCJJ | 瑞辰基金会 | 瑞辰基金会 | 很高 | 6.5% |
| EML | 恶魔旅团黑产 | 恶魔旅团 | 极高 | 9.0% |

- **新闻**：每 5–10 跳随机抽一条（按股票加权），标题分利好/利空，**实际冲击 ±（1–3 × σ）独立 roll，可能与标题相反**；冲击以 drift 形式作用于其后 3 跳。新闻池基于提取的尖塔素材改写为回廊势力版。
- 关闭 app：清计时器，价格冻结在 localStorage；重开接着走。

## 5. 交易规则（照搬原作数值）

- 做多/做空；杠杆 1–100 倍；保证金 = 名义价值 / 杠杆。
- **佣金**：买卖双向，成交额 1%，单笔上限为保证金的 10%。
- **印花税**：卖出方 0.1%（平多、开空收；强平、清算也收）。
- **强平**：每跳检查，持仓净值跌破维持线（净值 ≤ 保证金 × 5%，即做多强平价 = 开仓价×(1−0.95/杠杆)）即按现价强平，费用照收。（2026-10-12 实现期修订：原稿「保证金 ≤ 名义价值 × 5%」会使 >20 倍杠杆开仓即破线（1/杠杆 < 5% 恒成立），与 1–100 倍设计矛盾，故维持线改按保证金计。）
- **杠杆利息**：杠杆 >20 倍时，每跳按名义本金收利息（费率 = (杠杆−20) × 0.01%，快进快出税）。
- **破产线**：`cumulativeLoss > 250` 自动触发破产清算（§8）。
- 价格只在 app 打开时变动，因此强平/利息也只在打开时结算。

## 6. UP 兑换

- 读写 `stat_data.契约者.经济.UP`，照抄 `src/wxhl-003/market/store.ts` 的 Mvu 读写模式（`Mvu.getMvuData` 最新楼层 → 改 → `Mvu.replaceMvuData`）。
- 入金：扣 UP → 加交易所币 ×0.99（1% 手续费）；出金反向同样 1%。
- 读不到 MVU（如界面不在楼层上下文）：toastr 报错、账本不动。
- **主卡 UP 允许为负**（2026-10-12 用户确认，游戏内已实测）。交易所侧语义：UP 为负时**出金照常**（UP 向 0 回升）；**入金被拒绝**（会让欠额更深），报错不动账本。UP 可扣到恰好 0。

## 7. 借贷 / 失信 / 高利贷

- **借贷窗口**：交易所内置页签；一次一笔，未还清不能再借。额度 = min(净资产 × 50%, 5000)，利率按净资产分档（越穷越贵：净资产 <1000 收 30%，<5000 收 20%，否则 12%），期限 100 跳。
- **到期未还** → 失信（`delinquent`）：交易所冻结（禁止开平仓与借贷，只可读），借款转入催收。
- **高利贷**：失信状态下可借的救命钱：还 2.5 倍本金；未清期间每跳利息递增（第 n 跳 +10×n，可扣成负数）。还清或破产清算后移除。
- **解除失信**：还清欠款，或走破产清算（§8）。

## 8. 破产清算 · 资产变卖瀑布

触发：自动（累计亏损 >250）或失信时手动「申请破产」。**清算前弹确认清单**（逐项列出将失去什么、抵多少 UP），确认才执行。

严格按序变卖，每类卖完仍不足才动下一类；同类内从最便宜卖起，够抵债即停：

1. **交易所持仓 + 现金**：持仓按现价强平（佣金印花税照收）。
2. **背包物品**（`stat_data.契约者.背包`）：按市场基准价——品质查 `BASE` 表（`src/wxhl-003/market/priceTable.ts`）× 归一阶位²。
3. **装备七槽**（`stat_data.契约者.装备`：头部/躯干/手部/下装/饰品/主武器/副武器）：同上定价；卖掉的槽重置为「无」。
4. **通用技能**（`stat_data.契约者.通用技能`，record）：逐个移除，定价 = 品质查 BASE 武器列 × 玩家当前归一阶位²；品质缺失/不可解析 → 按白色兜底并 console.warn。
5. **职业**（`stat_data.契约者.职业`）：`稀有度` 当品质查表（紫色职业→紫、金色职业→金……）× 阶位²；重置为 prefault（名称「无」，转职树/职业技能清空）。
6. **血统**（`stat_data.契约者.头部.血统`）：品质查表 × 阶位²；重置为「普通地球人类/白色」。
7. **天赋**（`stat_data.契约者.头部.天赋`）：品质查表 × 阶位²；重置为「无」。

清算所得全部抵入欠款（UP 与交易所币 1:1）。**卖完仍抵不完的债务继续背着**（`debt` 字段，跨档持久）：账户保持冻结，还清才解冻。清算完成后失信标记解除（若债务清零）或保留（债务未清），`bankruptcyCount++`。

资产写回一律走 `Mvu.replaceMvuData`；写回失败 → 响亮报错、不继续后续步骤（宁可失败也不半清算）。

## 9. 遗产税

- **实时预告**：资产页显示"现在死了要交多少"。
- **死亡标记**：资产页提供「宣告死亡 / 放弃本局」按钮；另做防御性自动检测（打开 app 时读 `契约者.状态.生命状态` / `衍生属性.HP_当前`，读不到就跳过，不做硬耦合）。
- **扣缴**：有死亡标记的账户，下次打开 app 先结算遗产税+过户费，缴清（或现金不足则转 `debt`）才解锁交易。
- **税率**（超额累进，按账户总遗产估值）：≤100 币 10%；100–500 段 30%；500–2000 段 50%；>2000 段 70%。另收过户手续费 = 遗产 ×1%（最低 5 币）。遗产税不算交易亏损、不计入 250 破产线。

## 10. UI

小手机内全屏面板（暗色、贴合现有手机 app 风格）：

- **行情页**：股票列表（名称/现价/涨跌幅/迷你走势线），顶部新闻滚动条。
- **个股页**：走势大图、做多/做空、数量、杠杆滑条（1–100）、实时强平价与费用预览。
- **持仓页**：各仓位浮动盈亏、保证金覆盖率、平仓按钮。
- **借贷页**：当前借款/额度/利率/到期跳动数、高利贷入口（失信时）、还款。
- **资产页**：现金/净资产/累计盈亏、UP 兑换（入金/出金）、遗产税预告、「宣告死亡」「申请破产」按钮、破产记录。

## 11. wxhl-003 集成

- `App.vue` 加一个 app 图标「交易所」（图标 fontawesome `fa-chart-line`），`onclick: await waitGlobalInitialized('WxhlCg'); WxhlCg.open()`。
- 门禁：与市场/工坊一致——`canUseHubFacility()`（副本内禁用），守卫失败 toastr 提示。
- wxhl-cg 未加载时图标点击提示"交易所脚本未加载"。

## 12. 测试

vitest 单测 engine（纯函数，不碰酒馆接口）：

- market：价格波动非负、σ 分档生效、新闻冲击 drift 应用 3 跳后消失。
- trading：佣金/印花税数值、强平线触发、杠杆利息只在 >20 倍收。
- loan：一次一笔约束、到期→失信流转、高利贷递增利息、2.5 倍偿还。
- bankruptcy：瀑布顺序（背包→装备→技能→职业→血统→天赋）、同类最便宜先卖、够抵债即停、品质缺失兜底白色、剩余债务结转。
- inheritance：超额累进各档位边界（100/500/2000）、1% 过户费最低 5。
- store 层（有限覆盖）：localStorage 读写 round-trip、zod 版本迁移。

## 13. 分期

- **v1a**：引擎 + 基础交易 + 新闻 + UP 兑换 + localStorage + 手机图标接入。
- **v1b**：杠杆/做空/强平/杠杆利息。
- **v1c**：借贷/失信/高利贷 + 破产清算瀑布（含 MVU 资产写回）。
- **v1d**：遗产税 + 死亡标记。

## 14. 明确不做（本期）

联机、全球亏空榜/富有榜、结算徽章、数据上传、塔顶结局剧情联动、楼层/回合驱动的行情。
