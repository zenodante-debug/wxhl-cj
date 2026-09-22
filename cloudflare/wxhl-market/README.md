# wxhl-market · 自由市场 Worker 部署说明

无限回廊跨玩家自由市场。单文件 Worker（`worker.js`）+ 一个 **D1 数据库**。

> **2026-09-22 从 KV 迁到 D1**：KV 的 `list()` 有每日配额，而旧设计每次「逛市场」都要
> 遍历全库 key，配额很快爆掉，表现为接口返回 **error 1101**（"KV list() limit exceeded for the day"）。
> D1 免费版每天 500 万行读 / 10 万行写，且能 `WHERE / ORDER BY / LIMIT`，挂单再多也不会拖垮浏览。

## 数据表（Worker 首次收到请求时自动建表）

```sql
listings(id PK, client, seller, tier, kind, category, tier_idx, quality,
         item_name, item_json, qty, price, created)
earnings(client PK, amount)          -- 卖家待领货款
```

- `price` = **单价**，成交总价 = `price × qty`
- `category` / `tier_idx` / `quality` 是**服务端按物品快照自行判定**的筛选列
  （不信任客户端上报，防"标成道具"绕过装备价格上限）
- 购买：给卖家 `earnings` 累加总价 + 删除挂单（D1 batch）
- 领取：条件删除（`WHERE client = ? AND amount = ?`）避免并发双花

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
| POST `/market/list` | 上架（服务器自行分类 → 价格校验 → 装备规则硬校验） |
| GET `/market/listings` | 在售挂单，最新 50 条。支持 `?category=武器/防具/饰品/道具`、`?tier=0..4`、`?quality=蓝色`、`?limit=N` |
| POST `/market/buy` | 购买（卖家挂账总价、删除挂单） |
| POST `/market/cancel` | 卖家下架 |
| POST `/market/collect` | 领取全部货款 |
| GET `/market/mine?client=` | 我的货款 + 我的在售挂单 |

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

## 本地验证（不需要网络）

```bash
node smoke.mjs          # 用假 D1 跑市场六接口 + 排行榜端点，62 项断言
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
