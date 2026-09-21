# wxhl-market · 自由市场 Worker 部署说明

无限回廊跨玩家自由市场。单文件 Worker（`worker.js`）+ 一个 KV 命名空间。

## 方式一：wrangler CLI（需要能访问 npm 与 Cloudflare）

```bash
npm install -g wrangler        # 或 npx wrangler
wrangler login                 # 浏览器授权
wrangler kv namespace create MARKET
# 把输出的 id 填进 wrangler.toml 的 [[kv_namespaces]].id
wrangler deploy                # 部署到 wxhl-market.<账号>.workers.dev
```

## 方式二：Dashboard 粘贴（网络受限时的兜底，九渊同款）

1. Cloudflare Dashboard → Workers & Pages → Create → 命名 `wxhl-market`
2. Edit code → 把 `worker.js` **整个文件**粘贴进去 → Deploy
3. Settings → Variables → KV Namespace Bindings → Add：
   - Variable name: `MARKET`
   - KV namespace: 新建一个（如 `wxhl-market-kv`）

## 绑自定义域名（国内必须，workers.dev 直连不通）

前提：域名 `657868.xyz` 已在 Cloudflare 账号内（Sites → Add a domain；若注册商在别处，
需把域名的 NS 记录改成 Cloudflare 分配的两个 nameserver，等生效）。

Workers → wxhl-market → Settings → Domains & Routes → Add → Custom domain →
填 `market.657868.xyz`，证书自动签发。

用 wrangler 的话，改为取消 wrangler.toml 里 routes 的注释再 `wrangler deploy`。

## 冒烟测试

```bash
# 上架（蓝·武器·二阶，合法区间 160~800）
curl -X POST https://market.657868.xyz/market/list -H 'Content-Type: application/json' \
  -d '{"client":"smoke1","seller":"测试甲","tier":"二阶","kind":"equip","item":{"名称":"制式长刀","品质":"蓝色","类型":"武器","阶位":"二阶","描述":"冒烟"},"qty":1,"price":600}'
# 期望 {"id":"..."}

# 超价拒单（蓝装禁溢价，900 > 800）
curl -X POST https://market.657868.xyz/market/list -H 'Content-Type: application/json' \
  -d '{"client":"smoke1","seller":"测试甲","tier":"二阶","kind":"equip","item":{"名称":"制式长刀","品质":"蓝色","类型":"武器","阶位":"二阶"},"qty":1,"price":900}'
# 期望 400 + 中文拒绝原因

curl https://market.657868.xyz/market/listings
# 购买（另一个 client）→ 卖家货款 → 领取 → 下架，逐个验证：
curl -X POST https://market.657868.xyz/market/buy -H 'Content-Type: application/json' \
  -d '{"id":"<上一步的id>","buyer":"测试乙","client":"smoke2"}'
curl "https://market.657868.xyz/market/mine?client=smoke1"      # pending 应为 600
curl -X POST https://market.657868.xyz/market/collect -H 'Content-Type: application/json' \
  -d '{"client":"smoke1"}'                                       # gained 应为 600
```

## 前端对接

`src/wxhl-003/market/api.ts` 的 `MARKET_API` 常量指向最终域名（当前已填
`https://market.657868.xyz`）。改域名只需改这一处。

价格规则与 `src/wxhl-003/market/priceTable.ts` 是同一套，**改动须两边同步**，
两侧测试（`worker.test.js` / `__tests__/priceTable.test.ts`）互为镜像防漂移。
