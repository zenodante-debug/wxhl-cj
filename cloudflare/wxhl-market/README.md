# wxhl-market · 自由市场 Worker 部署说明

无限回廊跨玩家自由市场。单文件 Worker（`worker.js`）+ 一个 **D1 数据库**。

> **2026-09-22 从 KV 迁到 D1**：KV 的 `list()` 有每日配额，而旧设计每次「逛市场」都要
> 遍历全库 key，配额很快爆掉，表现为接口返回 **error 1101**（"KV list() limit exceeded for the day"）。
> D1 免费版每天 500 万行读 / 10 万行写，且能 `WHERE / ORDER BY / LIMIT`，挂单再多也不会拖垮浏览。

## 数据表（Worker 首次收到请求时自动建表）

```sql
listings(id PK, client, seller, tier, kind, category, tier_idx, quality,
         item_name, item_json, qty, price, created, op_json)
earnings(client PK, amount)          -- 卖家待领货款
sales(id PK, client, buyer, item_json, qty, price, created)  -- 出售记录（含买家名）
orders(id PK, poster, maker, spec_json, deposit, final, status, item_json, rating, comp_json,
       maker_deposit_ack, maker_final_ack, poster_ack, created, updated)  -- 工坊订单（长流程，状态是行上字段）
```

- `price` = **单价**，成交总价 = `price × 买走数量`
- `category` / `tier_idx` / `quality` 是**服务端按物品快照自行判定**的筛选列
  （不信任客户端上报，防"标成道具"绕过装备价格上限）
- `op_json` = 超模声明 `{ tier, rp, up }`（效果真实阶位高于名义阶位时携带）
- 购买（**支持部分购买**）：一个 D1 batch 里四步都带 `qty >= ?` 守卫 ——
  条件写 `sales` → 条件累加 `earnings` → `UPDATE listings SET qty = qty - ?` → 卖光才 `DELETE`。
  库存不够时四步全不动，看 UPDATE 的 `meta.changes` 回 409。整个 batch 是事务，不会有"扣了库存没记账"的中间态
- `sales.id` 是**每笔成交各自的唯一 id**（不是挂单 id）—— 同一挂单多次成交不能互相顶掉
- 领取：条件删除（`WHERE client = ? AND amount = ?`）避免并发双花
- **加列走 ensureSchema 里的 ALTER 迁移**：`CREATE TABLE IF NOT EXISTS` 不会改老表结构，
  新增列必须显式 ALTER（列已存在时报错属预期，已吞掉）

## 定价规则（2026-09-23 定稿）

| 项 | 规则 |
|---|---|
| 参考价 | 一阶基准价 × 阶位²（系统一；超脱 = 五阶基准价 × 20） |
| 允许区间 | **参考价下限 × 50% ~ 参考价上限 × 200%**（原品质溢价表已作废） |
| **银色** | **2026-09-23 放开售卖**：基准价 = **同表紫色 × 10**（银装数值仍等同紫装，作为副本唯一剧情物品按溢价一档定价）。一阶银武器参考 [15000,30000] → 允许 [7500,60000] |
| 装备 | 白装不收（无市场）；蓝/金/紫/银均可上架 |
| 道具 | **与武器同表**（按所填品质查武器基准，**银色同银武器**）；**必须填写品质**，缺则拒并要求补全 |
| 上架税 | 总价 × 20%，上架时从存档 UP 扣除（0 元单免税）；下架不退 |
| 购买手续费 | 总价 × 10%，买家付 |
| 超模费 | 真实阶位 > 名义阶位时：`RP = 50 × 修正系数和`、`UP = 真实阶位基准价 × 修正系数和`（修正系数 1/2/4/7/11/20；超脱=20） |

> 银色溢价只放大 **UP**：`RP = 50 × 系数和` 的公式里没有基准价，天然不受影响；而 `UP = 一阶基准价 × 定价系数 × 系数和` 会跟着 ×10（如 一阶→二阶超模：紫 18,000 UP、银 180,000 UP）。
> 超模物品**不再直接拒绝**：由前端 AI 判定效果真实阶位 + 确定性数值反查（取较高者），
> 收费后放行（挂单携带 `op` 声明）；服务器对带 `op` 的挂单跳过数值/强效果拒绝，
> 但**结构类问题（效果 >3 条、骰面格式非法）仍无条件拒绝**。

## 部署

```bash
npm install -g wrangler        # 或 npx wrangler
wrangler login
wrangler d1 create wxhl-market-db
# 把输出的 database_id 填进 wrangler.toml 的 [[d1_databases]].database_id
wrangler deploy
```

Dashboard 兜底：Workers & Pages → `wxhl-market` → 粘贴 `worker.js` →
Settings → Bindings → **D1 database**，变量名填 `MARKET_DB`。

> **发版顺序**：先 `wrangler deploy` Worker、**再**发前端。前端的订单页签打的是本 Worker 的
> `/order/*` 端点——Worker 部署前发前端，订单页签会显示「订单服务连接失败」。

## 玩家排行榜的管理密钥（可选，但强烈建议配）

排行榜的运营清理端点（`/rank/admin/*`）要一个 Worker secret。**没配就一律 403**
（不会因为环境变量缺失而放行）：

```bash
wrangler secret put RANK_ADMIN_KEY
# 粘贴 cloudflare/wxhl-market/.rank-admin-key.txt 里的那一行
```

密钥只存在 Worker 里，前端 bundle 拿不到。本地那份 `.rank-admin-key.txt` 已在
`.gitignore` 中，不要提交。

## 自定义域名

`657868.xyz` 已在 Cloudflare 账号内，`wrangler.toml` 里的 routes 会自动绑定
`market.657868.xyz`（国内直连 workers.dev 不通，必须绑域名）。

> 注意：TOML **注释行末尾不能有反斜杠**——它会被当作续行符，把下一行的 `routes` 吞掉。

## 接口

### 自由市场

| 方法/路径 | 说明 |
|---|---|
| POST `/market/list` | 上架（服务器自行分类 → 价格校验 → 装备规则校验；超模物品须带 `op` 声明） |
| GET `/market/listings` | 在售挂单，最新 50 条。支持 `?category=武器/防具/饰品/道具`、`?tier=0..4`、`?quality=蓝色`、`?limit=N` |
| POST `/market/buy` | 购买 `{ id, buyer, client, qty }`。**支持部分购买**：只买走 `qty` 件，剩余继续挂着；`qty` 省略 = 买光剩余（旧客户端兼容）。按 单价×qty 给卖家挂账并写出售记录，卖光才删挂单。库存不足（被别人抢先）→ 409 |
| POST `/market/cancel` | 卖家下架，回 `{ ok, returned }`。**returned 是服务端此刻的剩余数量**（部分成交后本地缓存是陈旧的，按它加回背包会多拿） |
| POST `/market/collect` | 领取全部货款 |
| GET `/market/mine?client=` | 我的货款 + 我的在售挂单 |
| GET `/market/sales?client=` | **我的出售记录**（最近 100 条，含买家名） |

不下发 `client` 字段（避免房主标识泄露）。

### 玩家排行榜

排名依据是**等级**（资格分每赛季清零，不用它）。唯一键是**契约者姓名**：同名后来者
顶掉先前者（同一个玩家换新存档也走这条），服务器不做身份校验——和自由市场同一套
信义模型。**Lv.1 不上榜，Lv.10 起**才能参与；等级**无上限**。
排序：等级高的在前 → 同等级**先上传的在前** → 再同则按姓名（保证名次可复现）。

| 方法/路径 | 说明 |
|---|---|
| POST `/rank/submit` | 上传 `{ name, lv, title, job }`，回 `{ rank, total }`。`lv` 须为 ≥10 的整数 |
| GET `/rank/top?name=` | `{ list: 前 20, total, me, near }`。我在 20 名外时 `near` 给前后各一名（不含已在榜单区的第 20 名） |
| POST `/rank/admin/list` | `{ key, offset?, limit? }` → `{ total, rows }`，审计全表 |
| POST `/rank/admin/delete` | `{ key, names: [] }` → `{ deleted }`，定向删 |
| POST `/rank/admin/purge` | `{ key, before?, belowLv?, aboveLv? }` → `{ deleted }`。**至少给一个条件**，否则拒绝 |
| POST `/rank/admin/clear` | `{ key, confirm: 'CLEAR' }` → `{ deleted }`，清空 |

排行榜自带 `ensureRankSchema`，**不经过市场那套建表**：两边任何一方出问题都不会
波及另一方。

### 工坊订单（v4a）

发单人出钱、接单者出材料与图纸；成品走 **escrow 托管**（交付后存在订单行的 `item_json` 里，
发单人领取、退货时直接退到接单者待领——不经过任何人的背包中转）。服务器只留飞行中订单，
应领项全部 ACK 后删行。

| 方法/路径 | 说明 |
|---|---|
| POST `/order/create` | 发布 `{ poster, spec, deposit, final }` → `{ id }`。订金须正整数、尾款非负整数，需求单 ≤4096 字节 |
| GET `/order/list?exclude=` | 订单大厅：`status=待接单` 且排除自己发的（`exclude` 服务端 trim），最新 100 条 |
| POST `/order/accept` | 接单 `{ id, maker }`。**原子**：`UPDATE ... WHERE status='待接单'`，0 行 → 400"手慢了" |
| POST `/order/deliver` | 交付 `{ id, maker, item }`：成品快照 ≤4096 字节，上传后由服务器托管 |
| POST `/order/confirm` | 验收 `{ id, poster }`（尾款在客户端结算，服务端只推进状态） |
| POST `/order/reject` | 退货 `{ id, poster }`：成品从托管直接退到接单者待领，**订金不退** |
| GET `/order/mine?who=` | `{ asPoster, asMaker, claim }`；`claim.待领` 是逐项领取清单（含逐项金额），客户端照它 ACK |
| POST `/order/ack` | 领取回执 `{ id, who, side, 项 }` → `{ ok, deleted, first }`。`first=true` 表示本次真正置位（首次）；应领项全部置位 → 删行 |

订单段自带 `ensureOrderSchema`（照排行榜的隔离套路），与市场/排行榜三方互不波及。

## 本地验证（不需要网络）

```bash
node smoke.mjs          # 用假 D1 跑市场+工坊订单全流程（含部分购买、银色定价、订单全流程至 ACK 后删行），74 项断言；订单端点回 404（未部署的旧 worker）时该段自动跳过
```

线上冒烟：见下方 curl 示例。

```bash
# 上架（蓝·防具·一阶，合法区间 50~150）
curl -X POST https://market.657868.xyz/market/list -H 'Content-Type: application/json' \
  --data-binary @listing.json     # 中文请用文件，别用 -d 内联（终端编码会坏）
# 浏览 / 筛选
curl https://market.657868.xyz/market/listings
curl 'https://market.657868.xyz/market/listings?category=防具&quality=蓝色'

# 榜单（中文同样走文件）
curl https://market.657868.xyz/rank/top
curl --get --data-urlencode 'name=林千尺' https://market.657868.xyz/rank/top

# 工坊订单：发布（订金在发单人客户端扣除，服务器只记账托管；中文同样走文件）
curl -X POST https://market.657868.xyz/order/create -H 'Content-Type: application/json' \
  --data-binary @order.json   # {"poster":"林千尺","spec":{"名称":"狼牙短剑","成品类型":"装备","装备子类":"武器","品质":"金色","阶位":2,"效果要求":"","说明":""},"deposit":300,"final":700}

# 运营清理：定期删掉 90 天没更新过的条目
curl -X POST https://market.657868.xyz/rank/admin/purge -H 'Content-Type: application/json' \
  --data-binary "{\"key\":\"$(cat .rank-admin-key.txt)\",\"before\":$(( ($(date +%s) - 7776000) * 1000 ))}"
```

`wrangler d1 execute` 兜底（管理端点没覆盖的操作）：

```bash
wrangler d1 execute wxhl-market-db --remote --command "SELECT name, lv, updated FROM ranks ORDER BY lv DESC LIMIT 20"
```

## 前端对接

自由市场：`src/wxhl-003/market/api.ts` 的 `MARKET_API` 常量指向最终域名（当前
`https://market.657868.xyz`）。改域名只需改这一处。

玩家排行榜：`src/wxhl-003/rank/api.ts` 的 `RANK_API`，同一个域名（排行榜与市场
共用这个 Worker）。排序、名次、邻居全在客户端脚本算（`rank/rank.ts`），不烧 AI token。

价格规则与 `src/wxhl-003/market/priceTable.ts`、装备规则与 `equipRules.ts`
是同一套，**改动须两边同步**，两侧测试互为镜像防漂移。
