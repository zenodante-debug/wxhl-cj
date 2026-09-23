# 无限回廊 · 工坊订单店铺评分制（v4b 改版）设计文档

日期：2026-09-23
归属：`src/wxhl-003/crafting/order/` + `src/wxhl-003/crafting/order/rep/`（新）+ `cloudflare/wxhl-market/worker.js` 新增独立段
前置：`2026-09-23-wxhl-crafting-orders-design.md`（v4a 已上线）；本文**取代**其 §5.3 的星级评价方案（该方案从未实现）

## 1. 背景与目标

v4a 上线后复盘：原 v4b 的「0–5 星平均评价」不适合做排行榜。本次改版三件事：

1. **星级 → 分数制**：店铺分数是可累加的整数，天然可排名
2. **接单绑定店铺**：接单人身份从玩家姓名改为**店铺**（读变量 `契约者.个人产业.当前店铺.名称`），**未开店不准接单**；评分对象从玩家改为店铺
3. **服务器店铺排行榜**：照玩家排行榜的独立段套路，按分数排名

## 2. 决策记录（已与用户确认）

| 决策点 | 结论 |
|---|---|
| 分数规则 | 初始 0；**完成一单 +1**；验收时发单人可再给 **0–5 分**直接加上；**弃单 −5**；**退货 −2**；付不起尾款取消**不计** |
| 评分是否必填 | **可跳过**——跳过的订单只 +1 保底分 |
| 分数主键 | **跟着店名走**（key = 店铺名）。改名 = 新店从 0 开始；同名店铺共享分数（接受此风险） |
| 同分排序 | **先到先排前**（`updated` 升序：先达到该分数的店铺排前面） |
| 接单闸门 | `当前店铺.名称` 为 `'无'` 或空 → 拦截，toast 提示未开店 |
| 本地订单记录 | **保留** localStorage `wxhl003_order_rep`（服务器不存历史，本地记录供回看分数变动来源） |
| 赔偿（沿用 v4b 原案） | 弃单强制赔偿 **订金 × 3**，接单者客户端本地扣、经服务器转发给发单人待领 |
| 服务器职责 | 仍是**纯中转**；`shop_scores` 表与排行榜同量级（一店一行），不撑爆免费档 |

## 3. 分数变动总表

| 事件 | 上报方（客户端） | delta | 时机 |
|---|---|---|---|
| 验收满意 | 发单人 | `+1`（跳过评分）或 `+1 + 评分` | `/order/confirm` 成功后 |
| 退货不满意 | 发单人 | `−2` | `/order/reject` 成功后 |
| 弃单 | 接单人 | `−5`（同时本地扣赔偿 订金×3） | `/order/abandon` 成功后 |
| 尾款不足取消 | — | `0` | 不计入 |

**防重复**：分数上报紧跟服务端**原子状态转换**（`UPDATE … WHERE status=…`）。双开标签页同时操作时只有一个转换成功，只有成功方上报 —— 不需要 first 旗那套（first 旗只护钱物领取，分数不是待领物）。

**上报失败**（网络抖动）：分数丢了就丢了，不重试不补偿——分数是荣誉值不是钱，丢一两分可接受；钱物通道不受影响。

## 4. 服务器设计

### 4.1 建表（独立段，第四次复制该组织方式：市场 → 排行榜 → 订单 → **店铺评分**）

```sql
CREATE TABLE IF NOT EXISTS shop_scores (
  name    TEXT PRIMARY KEY,        -- 店铺名
  score   INTEGER NOT NULL DEFAULT 0,
  updated INTEGER NOT NULL         -- 同分时先到先排前（升序）
);
```

`ensureShopSchema` 照 `ensureRankSchema`/`ensureOrderSchema` 的模子：自带建表、`handleShop` 在 fetch 里排在 `ensureSchema(env)` **之前**，四方互不波及。

`orders` 表原地加两列（老表不重建，`ALTER` 失败=列已存在则吞掉，同 v4a Ruling I 的加列手法）：

```sql
ALTER TABLE orders ADD COLUMN maker_shop TEXT;                              -- 接单人店铺名
ALTER TABLE orders ADD COLUMN poster_comp_ack INTEGER NOT NULL DEFAULT 0;   -- 赔偿款 ACK 位
```

fake-d1 必须教会认这两条 `ALTER` 与 `shop_scores` 的全部 SQL——**认不出的一律照抛**（既有防线，不许开白名单）。

### 4.2 新端点

| 端点 | 方法 | 作用 |
|---|---|---|
| `/shop/score` | POST | `{name, delta}` → UPSERT：`score = score + delta`、`updated = now`，返回 `{score}`。**信义模型**，不校验来源（与赔偿款同一信任级别） |
| `/shop/rank` | GET | `?name=` → `{list: 前20, total, me, near}`（照 `/rank/top` 形状），排序 `score DESC, updated ASC` |
| `/order/abandon` | POST | `{id, maker}` → 原子 `已接单→已弃单`，挂 `comp = deposit×3`；受影响 0 行即拒 |

### 4.3 既有端点改动

- `/order/accept`：多收 `maker_shop`（必填非空，否则 400——服务端也挡一道未开店），存进订单行
- `/order/mine`、`/order/list`：返回的订单带 `maker_shop` 字段
- `待领项(r, who)`：加赔偿条目——`status='已弃单'` 且 `r.poster === who` 且 `poster_comp_ack !== 1` → 出 `{项:'赔偿', 金额: deposit×3}`
- `ACK_COLS.poster` 加 `赔偿: 'poster_comp_ack'`；行删除规则不变（应领项全部置位后删行）

## 5. 客户端设计

### 5.1 接单闸门（store.accept）

```
读 stat_data.契约者.个人产业.当前店铺.名称
  = '无' / '' / 缺失 → toast「未开设店铺，不能接单」，拦截（零请求零写入）
  否则 → acceptOrder(id, maker=玩家姓名, makerShop=店铺名)
```

注意：`maker` 仍是玩家姓名（当事人键、ACK 的 `who` 不变），`maker_shop` 只是展示与评分归属。读店铺名是**只读**路径，不改 MVU 写入纪律（仍只写 `背包`/`经济.UP`）。

### 5.2 分数上报（order/rep/score.ts，纯函数可测）

```ts
export function 验收加分(评分: number | null): number   // null → 1；否则 1 + 评分（评分钳 0..5 整数）
export function 退货扣分(): number                       // -2
export function 弃单扣分(): number                       // -5
```

`api.ts` 加 `reportShopScore(name, delta)` 与 `fetchShopRank(name)`。三个调用点：

- `confirm()`：`confirmOrder` 成功且尾款落档后，`reportShopScore(单.maker_shop, 验收加分(评分))`；上报失败只 console.warn，不影响主流程
- `reject()`：`rejectOrder` 成功后 `reportShopScore(单.maker_shop, -2)`
- 新增 `abandon(id)`：① 先本地预验余额（`spendUP(当前UP, 订金×3)` 抛错即拒，**零请求零写入**——赔不起就不许弃单）→ ② `abandonOrder` → ③ 新读值扣款落档（同 publish 的纪律）→ ④ `reportShopScore(自己店铺, -5)` → ⑤ 记本地记录

### 5.3 赔偿款领取（复用现有待领取/ACK 体系）

`待领项` 的 `项` 联合类型加 `'赔偿'`；`claimAll` 的 side 映射加 `赔偿 → 'poster'`（成品归发单人、订金/尾款归接单者、赔偿归发单人）。金额逐条自带（Ruling M 纪律不变）。

### 5.4 本地订单记录（order/rep/history.ts + localStorage）

键：`wxhl003_order_rep`（与既有 API 配置同处，不进 MVU、不进正文 token）。

```ts
interface 订单记录 {
  订单id: string;
  角色: '发单人' | '接单人';
  对方: string;            // 对方店铺名（接单人是店铺；发单人侧记玩家名）
  摘要: string;            // 需求单摘要（名称｜成品类型·子类·品质·阶位）
  结果: '完成' | '退货' | '弃单' | '被取消';
  分数变动: number;        // 本店因此单的分数增减（发单人侧记 0）
  时间: number;
}
```

写入点：confirm / reject / abandon 成功后各记一条；接单人侧的「完成」在领取尾款（ACK first）时记。容量钳制：只留最近 100 条（FIFO），防 localStorage 膨胀。UI 展示在「我的 → 订单记录」。

### 5.5 UI（OrderView.vue）

- 子页签变三个：**订单大厅 / 我的 / 店铺排行**
- **店铺排行**：照 RankView.vue 的样式（名次、店铺名、分数，自己高亮，前 20 + 我的名次）；数据走 `fetchShopRank(自己的店铺名)`，未开店传空也能看榜
- **我发布的**：订单详情接单人处显示店铺名 +（若有）当前分数
- **验收弹层**：加可选 0–5 分输入（留空 = 跳过只 +1），按钮文案提示「验收并评分」
- **我接的**：「已接单」状态加【弃单】按钮，点击前确认框写明代价（赔 订金×3 + 店铺 −5 分）
- **我的 → 订单记录**：本地历史列表（时间、角色、对方、结果、分数变动）

## 6. 错误与边界

| 情况 | 处理 |
|---|---|
| 未开店接单 | 客户端闸门拦截；服务端 `/order/accept` 缺 `maker_shop` 也 400 |
| 改名开店 | 新店从 0 分开始（用户已确认的口径）；旧订单行的 `maker_shop` 是接单时的快照，评分仍打到旧店名 |
| 赔不起（弃单时 UP < 订金×3） | **不许弃单**：spendUP 抛错拦截在请求之前，提示「赔偿不足，无法弃单」 |
| 分数上报失败 | 只 warn 不重试（荣誉值可丢，钱物不可丢） |
| 店铺名同名 | 共享一条分数（用户已确认接受） |
| 老订单行无 `maker_shop` | ALTER 后该列为 NULL：展示回退为玩家姓名，评分上报跳过（没有归属店） |
| fake-d1 认不出的 SQL | 照抛（既有防线，新 SQL 逐条登记） |

## 7. 测试策略

- **worker.test.js**：shop_scores 段（UPSERT 累加、负数、排序 score DESC + updated ASC、rank 前20/邻居/me）、accept 带 maker_shop、abandon 原子转换、赔偿进待领项、赔偿 ACK 后删行
- **纯函数（vitest）**：`score.ts` 三分支 + 评分钳制；接单闸门（店铺名解析：'无'/空/正常）；history 容量钳制
- **smoke.mjs**：全流程加断言——验收后店铺分数 = 1+评分、退货后 −2、弃单后 −5 且赔偿可领、双 ACK 后行删除
- **`.vue` 无自动类型门**：四道机械门（@vue/compiler-sfc 0 未解析 `_ctx`、死声明扫描、eslint、store 成员差集）

## 8. 部署顺序

**先 Worker 后前端**（既有纪律）：新前端配老 Worker 时 `maker_shop`/abandon 会 404/400，但都不动钱物（接单/弃单整体失败，无半成品状态）；老前端配新 Worker 完全无感（新列有默认值，新端点没人调）。

## 9. 不做的事（YAGNI）

- 不做分数防刷（信义模型下客户端可自报，与赔偿同等级信任；真要防需要服务端权威记账，超出免费档定位）
- 不做发单人侧信誉（只有店铺有分数）
- 不做订单催办、留言、议价
- v4c（撤销、48h 超时惰性判定、admin purge）仍按原计划在后续分期，本次不动
