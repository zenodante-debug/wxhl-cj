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

## 自定义域名

`657868.xyz` 已在 Cloudflare 账号内，`wrangler.toml` 里的 routes 会自动绑定
`market.657868.xyz`（国内直连 workers.dev 不通，必须绑域名）。

> 注意：TOML **注释行末尾不能有反斜杠**——它会被当作续行符，把下一行的 `routes` 吞掉。

## 接口

| 方法/路径 | 说明 |
|---|---|
| POST `/market/list` | 上架（服务器自行分类 → 价格校验 → 装备规则硬校验） |
| GET `/market/listings` | 在售挂单，最新 50 条。支持 `?category=武器/防具/饰品/道具`、`?tier=0..4`、`?quality=蓝色`、`?limit=N` |
| POST `/market/buy` | 购买（卖家挂账总价、删除挂单） |
| POST `/market/cancel` | 卖家下架 |
| POST `/market/collect` | 领取全部货款 |
| GET `/market/mine?client=` | 我的货款 + 我的在售挂单 |

不下发 `client` 字段（避免房主标识泄露）。

## 本地验证（不需要网络）

```bash
node smoke.mjs          # 用假 D1 跑完整六接口 + 价格/规则校验，28 项断言
```

线上冒烟：见下方 curl 示例。

```bash
# 上架（蓝·防具·一阶，合法区间 50~150）
curl -X POST https://market.657868.xyz/market/list -H 'Content-Type: application/json' \
  --data-binary @listing.json     # 中文请用文件，别用 -d 内联（终端编码会坏）
# 浏览 / 筛选
curl https://market.657868.xyz/market/listings
curl 'https://market.657868.xyz/market/listings?category=防具&quality=蓝色'
```

## 前端对接

`src/wxhl-003/market/api.ts` 的 `MARKET_API` 常量指向最终域名（当前
`https://market.657868.xyz`）。改域名只需改这一处。

价格规则与 `src/wxhl-003/market/priceTable.ts`、装备规则与 `equipRules.ts`
是同一套，**改动须两边同步**，两侧测试互为镜像防漂移。
