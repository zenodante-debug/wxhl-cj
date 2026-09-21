# wxhl-003 自由市场 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 wxhl-003 小手机中新增跨玩家自由市场：Cloudflare Worker + KV 做全服挂单与货款记账，装备价格强校验，本地 MVU 结算 UP 与背包。

**Architecture:** Worker 为单文件自包含 JS（支持 Dashboard 粘贴部署，内含价格表与校验，命名导出供 vitest）；前端新增 `src/wxhl-003/market/` 模块（priceTable / settle / api / MarketView.vue），桌面新增「自由市场」图标入口。结算复用项目现有 `Mvu.getMvuData → _.set → replaceMvuData → 回读校验` 模式。

**Tech Stack:** Cloudflare Workers + KV、TypeScript、Vue 3、Pinia、vitest。

**Spec:** `docs/superpowers/specs/2026-09-20-wxhl-003-free-market-design.md`

## Global Constraints

- 变量路径（stat_data 下）：`契约者.经济.UP`、`契约者.背包`（record<物品名, {描述,数量,...}>，数量≤0 条目被 schema 自动清除）、`契约者.头部.姓名`、`契约者.头部.阶位`
- 参考价 = 一阶基准价 × 阶位²；蓝禁溢价(≤上限)、金 ≤上限×1.5、紫 ≤上限×2；下限 = 基准下限×0.4；白/银拒绝上架
- 消耗品/道具自由出价：qty 整数 1~99，price 0~9,999,999
- 域名 `657868.xyz`（用户提供），Worker 名 `wxhl-market`，KV 绑定变量名 `MARKET`
- 测试：`pnpm test`（vitest），Worker 测试为纯 JS 无需环境
- 已确认不做：RP 交易、以物易物、强化等级定价、消耗品白名单、原子交易

---

### Task 1: 前端价格表 `market/priceTable.ts`

**Files:**
- Create: `src/wxhl-003/market/priceTable.ts`
- Test: `src/wxhl-003/market/__tests__/priceTable.test.ts`

**Interfaces:**
- Consumes: `归一位阶`、`tierIndexOf` from `../dice`（阶位归一复用，不重写）
- Produces:
  ```ts
  export type MarketKind = 'equip' | 'goods';
  export interface MarketItemSnapshot { 名称: string; 描述?: string; 数量?: number; 品质?: string; 类型?: string; 阶位?: string; [k: string]: unknown }
  export interface PriceCheck { ok: boolean; min: number; max: number; reason: string }
  export function isEquip(item: MarketItemSnapshot): boolean            // 有品质且类型∈武器/防具/饰品
  export function refRange(品质: string, 类型: string, 阶位: string): { min: number; max: number } | null  // 参考价区间（未×溢价）
  export function checkPrice(kind: MarketKind, item: MarketItemSnapshot, sellerTier: string, price: number): PriceCheck
  ```

- [ ] **Step 1: 写失败测试**

`src/wxhl-003/market/__tests__/priceTable.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { checkPrice, isEquip, refRange } from '../priceTable';

const 蓝武器 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶' };
const 金防具 = { 名称: '秘银胸甲', 品质: '金色', 类型: '防具', 阶位: '一阶' };
const 紫饰品 = { 名称: '龙血吊坠', 品质: '紫色', 类型: '饰品', 阶位: '三阶' };
const 药剂 = { 名称: '基础治疗药剂', 描述: '回血', 数量: 5 };

describe('isEquip', () => {
  it('有品质且类型为武器/防具/饰品的是装备', () => {
    expect(isEquip(蓝武器)).toBe(true);
    expect(isEquip(药剂)).toBe(false);
    expect(isEquip({ 名称: '怪东西', 品质: '蓝色', 类型: '材料' })).toBe(false);
  });
});

describe('refRange · 一阶基准×阶位²', () => {
  it('蓝·武器·二阶 = [100,200]×4', () => {
    expect(refRange('蓝色', '武器', '二阶')).toEqual({ min: 400, max: 800 });
  });
  it('紫·饰品·三阶 = [1200,2500]×9', () => {
    expect(refRange('紫色', '饰品', '三阶')).toEqual({ min: 10800, max: 22500 });
  });
  it('未知品质返回 null', () => {
    expect(refRange('彩色', '武器', '一阶')).toBeNull();
  });
});

describe('checkPrice · equip', () => {
  it('蓝装平价：上限=参考上限，禁溢价', () => {
    expect(checkPrice('equip', 蓝武器, '一阶', 800).ok).toBe(true);
    expect(checkPrice('equip', 蓝武器, '一阶', 801).ok).toBe(false);
  });
  it('下限=基准下限×阶位²×0.4，允许贱卖不许离谱', () => {
    expect(checkPrice('equip', 蓝武器, '一阶', 160).ok).toBe(true);   // 400×0.4
    expect(checkPrice('equip', 蓝武器, '一阶', 159).ok).toBe(false);
  });
  it('金装最多+50%', () => {
    expect(checkPrice('equip', 金防具, '一阶', 900).ok).toBe(true);   // 600×1.5
    expect(checkPrice('equip', 金防具, '一阶', 901).ok).toBe(false);
  });
  it('紫装最多+100%', () => {
    expect(checkPrice('equip', 紫饰品, '一阶', 22500).ok).toBe(true); // 22500×2? 注意:22500×2=45000
  });
  it('紫装上限=参考上限×2', () => {
    expect(checkPrice('equip', 紫饰品, '一阶', 45000).ok).toBe(true);
    expect(checkPrice('equip', 紫饰品, '一阶', 45001).ok).toBe(false);
  });
  it('白装拒绝上架', () => {
    const r = checkPrice('equip', { 名称: '铁剑', 品质: '白色', 类型: '武器', 阶位: '一阶' }, '一阶', 50);
    expect(r.ok).toBe(false);
    expect(r.reason).toContain('白');
  });
  it('银装拒绝上架', () => {
    const r = checkPrice('equip', { 名称: '圣剑', 品质: '银色', 类型: '武器', 阶位: '一阶' }, '一阶', 99999);
    expect(r.ok).toBe(false);
  });
  it('装备缺品质/类型拒绝', () => {
    expect(checkPrice('equip', { 名称: '无名', 类型: '武器' }, '一阶', 100).ok).toBe(false);
    expect(checkPrice('equip', { 名称: '无名', 品质: '蓝色' }, '一阶', 100).ok).toBe(false);
  });
  it('物品缺阶位时按卖家阶位算', () => {
    const 无阶蓝武 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器' };
    // 卖家三阶 → [100,200]×9 = [900,1800]
    expect(checkPrice('equip', 无阶蓝武, '三阶', 1800).ok).toBe(true);
    expect(checkPrice('equip', 无阶蓝武, '三阶', 1801).ok).toBe(false);
  });
});

describe('checkPrice · goods 自由出价', () => {
  it('正常范围通过', () => {
    expect(checkPrice('goods', 药剂, '一阶', 15).ok).toBe(true);
  });
  it('数量与价格防刷', () => {
    expect(checkPrice('goods', { ...药剂, 数量: 100 }, '一阶', 15).ok).toBe(false);
    expect(checkPrice('goods', 药剂, '一阶', 10000000).ok).toBe(false);
    expect(checkPrice('goods', 药剂, '一阶', -1).ok).toBe(false);
  });
});
```

注意：上面 `紫装最多+100%` 第一条用例里注释写错了方向，实现时以第二条用例（上限×2）为准，第一条改为断言 22500 也在区间内（介于参考上限与×2上限之间，合法）。

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-003/market/__tests__/priceTable.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 priceTable.ts**

```ts
import { 归一位阶, tierIndexOf } from '../dice';

export type MarketKind = 'equip' | 'goods';

export interface MarketItemSnapshot {
  名称: string;
  描述?: string;
  数量?: number;
  品质?: string;
  类型?: string;
  阶位?: string;
  [k: string]: unknown;
}

export interface PriceCheck { ok: boolean; min: number; max: number; reason: string }

/** 一阶基准价表 [下限, 上限]，来自经济系统文档 */
const BASE: Record<string, Record<string, [number, number]>> = {
  武器: { 白色: [30, 60], 蓝色: [100, 200], 金色: [400, 800], 紫色: [1500, 3000] },
  防具: { 白色: [15, 40], 蓝色: [50, 150], 金色: [250, 600], 紫色: [1000, 2000] },
  饰品: { 白色: [20, 40], 蓝色: [60, 150], 金色: [300, 700], 紫色: [1200, 2500] },
};

/** 溢价上限倍率（相对参考上限） */
const PREMIUM: Record<string, number> = { 蓝色: 1.0, 金色: 1.5, 紫色: 2.0 };

const EQUIP_TYPES = ['武器', '防具', '饰品'];

export function isEquip(item: MarketItemSnapshot): boolean {
  return typeof item.品质 === 'string' && item.品质.length > 0 && EQUIP_TYPES.includes(String(item.类型 ?? ''));
}

function tierFactor(tier: string): number | null {
  const idx = tierIndexOf(归一位阶(tier));
  if (idx < 0) return null;
  return (idx + 1) ** 2;
}

export function refRange(品质: string, 类型: string, 阶位: string): { min: number; max: number } | null {
  const base = BASE[类型]?.[品质];
  const f = tierFactor(阶位);
  if (!base || !f) return null;
  return { min: base[0] * f, max: base[1] * f };
}

export function checkPrice(kind: MarketKind, item: MarketItemSnapshot, sellerTier: string, price: number): PriceCheck {
  const fail = (reason: string, min = 0, max = 0): PriceCheck => ({ ok: false, min, max, reason });
  if (!Number.isFinite(price) || price < 0 || price > 9_999_999) return fail('价格超出允许范围');

  if (kind === 'goods') {
    const qty = Number(item.数量 ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 99) return fail('数量须为 1~99 的整数');
    return { ok: true, min: 0, max: 9_999_999, reason: '' };
  }

  // equip
  const 品质 = String(item.品质 ?? '');
  const 类型 = String(item.类型 ?? '');
  if (!BASE[类型]?.[品质]) return fail('装备缺少可定价的品质/类型字段');
  if (品质 === '白色') return fail('白色装备没有市场，回廊不收录');
  if (品质 === '银色') return fail('银色装备有价无市，只走剧情，不进入市场');
  const 阶位 = String(item.阶位 ?? '') || sellerTier;
  const ref = refRange(品质, 类型, 阶位);
  if (!ref) return fail('阶位无法识别');
  const min = Math.floor(ref.min * 0.4);
  const max = Math.floor(ref.max * (PREMIUM[品质] ?? 1));
  if (price < min) return fail(`价格过低，不得低于 ${min} UP`, min, max);
  if (price > max) return fail(`价格过高，${品质}装备不得超过 ${max} UP`, min, max);
  return { ok: true, min, max, reason: '' };
}
```

若 `dice.ts` 的导出名不是 `归一位阶`/`tierIndexOf`，以 dice.ts 实际导出为准（测试文件 tier.test.ts 第 2 行已确认两者存在）。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-003/market/__tests__/priceTable.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/market/
git commit -m "feat(wxhl): 自由市场价格表与挂单校验纯函数（方案A：装备强校验/道具自由出价）"
```

---

### Task 2: 本地结算 `market/settle.ts`

**Files:**
- Create: `src/wxhl-003/market/settle.ts`
- Test: `src/wxhl-003/market/__tests__/settle.test.ts`

**Interfaces:**
- Consumes: `MarketItemSnapshot` from `./priceTable`
- Produces（全部为纯函数，输入输出都是普通对象，不碰 MVU）：
  ```ts
  export type Bag = Record<string, MarketItemSnapshot & { 数量: number }>;
  export function bagRemove(bag: Bag, name: string, qty: number): Bag        // 上架扣减；数量不足 throw
  export function bagAdd(bag: Bag, snapshot: MarketItemSnapshot, qty: number): Bag  // 同名合并数量，否则整条入包
  export function spendUP(up: number, price: number): number                  // 不足 throw
  export function gainUP(up: number, gained: number): number
  ```

- [ ] **Step 1: 写失败测试**

`src/wxhl-003/market/__tests__/settle.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from '../settle';

const 刀 = { 名称: '制式长刀', 品质: '蓝色', 类型: '武器', 阶位: '二阶', 数量: 2 };

describe('bagRemove · 上架扣减', () => {
  it('扣部分数量', () => {
    const bag: Bag = { 制式长刀: { ...刀 } };
    expect(bagRemove(bag, '制式长刀', 1).制式长刀.数量).toBe(1);
  });
  it('扣光后条目被移除', () => {
    const bag: Bag = { 制式长刀: { ...刀 } };
    expect(bagRemove(bag, '制式长刀', 2).制式长刀).toBeUndefined();
  });
  it('数量不足抛错且不修改原 bag', () => {
    const bag: Bag = { 制式长刀: { ...刀 } };
    expect(() => bagRemove(bag, '制式长刀', 3)).toThrow();
    expect(bag.制式长刀.数量).toBe(2);
  });
  it('物品不存在抛错', () => {
    expect(() => bagRemove({}, '不存在的', 1)).toThrow();
  });
});

describe('bagAdd · 购入/取回', () => {
  it('同名合并数量', () => {
    const bag: Bag = { 制式长刀: { ...刀 } };
    expect(bagAdd(bag, 刀, 3).制式长刀.数量).toBe(5);
  });
  it('新物品整条入包', () => {
    const bag = bagAdd({}, { ...刀, 描述: '好刀' }, 1);
    expect(bag.制式长刀.数量).toBe(1);
    expect(bag.制式长刀.描述).toBe('好刀');
  });
});

describe('UP 结算', () => {
  it('扣款与余额不足', () => {
    expect(spendUP(500, 300)).toBe(200);
    expect(() => spendUP(200, 300)).toThrow();
  });
  it('入款', () => {
    expect(gainUP(500, 300)).toBe(800);
    expect(gainUP(500, 0)).toBe(500);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-003/market/__tests__/settle.test.ts`
Expected: FAIL（模块不存在）

- [ ] **Step 3: 实现 settle.ts**

```ts
import type { MarketItemSnapshot } from './priceTable';

export type Bag = Record<string, MarketItemSnapshot & { 数量: number }>;

/** 上架扣减：数量不足或物品不存在抛错；返回新 bag（不改原对象） */
export function bagRemove(bag: Bag, name: string, qty: number): Bag {
  const cur = bag[name];
  if (!cur) throw new Error(`背包中没有「${name}」`);
  const left = Number(cur.数量) - qty;
  if (left < 0) throw new Error(`「${name}」数量不足：现有 ${cur.数量}，需要 ${qty}`);
  const next = { ...bag };
  if (left === 0) delete next[name];
  else next[name] = { ...cur, 数量: left };
  return next;
}

/** 购入/取回：同名合并数量，否则以快照整条入包 */
export function bagAdd(bag: Bag, snapshot: MarketItemSnapshot, qty: number): Bag {
  const name = snapshot.名称;
  const cur = bag[name];
  const next = { ...bag };
  next[name] = cur
    ? { ...cur, 数量: Number(cur.数量) + qty }
    : ({ ...snapshot, 数量: qty } as MarketItemSnapshot & { 数量: number });
  return next;
}

export function spendUP(up: number, price: number): number {
  if (up < price) throw new Error(`UP 不足：现有 ${up}，需要 ${price}`);
  return up - price;
}

export function gainUP(up: number, gained: number): number {
  return up + gained;
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-003/market/__tests__/settle.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-003/market/
git commit -m "feat(wxhl): 自由市场本地结算纯函数（背包增减/UP 收支）"
```

---

### Task 3: Worker 单文件 `cloudflare/wxhl-market/worker.js`

**Files:**
- Create: `cloudflare/wxhl-market/worker.js`
- Test: `cloudflare/wxhl-market/worker.test.js`
- Modify: `vitest.config.ts:28`（include 增加 `'cloudflare/**/*.test.js'`）

**Interfaces:**
- Consumes: 无（自包含；价格表与 Task 1 同规则，JS 实现）
- Produces:
  - `export function checkPrice(kind, item, sellerTier, price)` → `{ok, min, max, reason}`（命名导出供测试）
  - `export default { fetch(request, env) }`，路由见 spec §3.5；KV 绑定名 `MARKET`

- [ ] **Step 1: 扩展 vitest include**

`vitest.config.ts` 第 28 行改为：

```ts
include: ['src/**/__tests__/**/*.test.ts', 'cloudflare/**/*.test.js'],
```

- [ ] **Step 2: 写失败测试**

`cloudflare/wxhl-market/worker.test.js`（纯 JS，node 环境直接跑）：

```js
import { describe, expect, it } from 'vitest';
import { checkPrice } from './worker.js';

describe('worker checkPrice（与前端 priceTable 同规则镜像）', () => {
  it('蓝·武器·二阶 [400,800]，禁溢价', () => {
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 800).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 801).ok).toBe(false);
  });
  it('下限=基准下限×阶位²×0.4', () => {
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 160).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器', 阶位: '二阶' }, '一阶', 159).ok).toBe(false);
  });
  it('金+50% / 紫+100%', () => {
    expect(checkPrice('equip', { 品质: '金色', 类型: '防具', 阶位: '一阶' }, '一阶', 900).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '金色', 类型: '防具', 阶位: '一阶' }, '一阶', 901).ok).toBe(false);
    expect(checkPrice('equip', { 品质: '紫色', 类型: '饰品', 阶位: '三阶' }, '一阶', 45000).ok).toBe(true);
    expect(checkPrice('equip', { 品质: '紫色', 类型: '饰品', 阶位: '三阶' }, '一阶', 45001).ok).toBe(false);
  });
  it('白/银拒绝', () => {
    expect(checkPrice('equip', { 品质: '白色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok).toBe(false);
    expect(checkPrice('equip', { 品质: '银色', 类型: '武器', 阶位: '一阶' }, '一阶', 50).ok).toBe(false);
  });
  it('缺字段拒绝 / 缺阶位回退卖家阶位', () => {
    expect(checkPrice('equip', { 类型: '武器' }, '一阶', 100).ok).toBe(false);
    expect(checkPrice('equip', { 品质: '蓝色', 类型: '武器' }, '三阶', 1800).ok).toBe(true);
  });
  it('goods 自由出价+防刷', () => {
    expect(checkPrice('goods', { 数量: 5 }, '一阶', 15).ok).toBe(true);
    expect(checkPrice('goods', { 数量: 100 }, '一阶', 15).ok).toBe(false);
    expect(checkPrice('goods', { 数量: 5 }, '一阶', 10000000).ok).toBe(false);
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `pnpm vitest run cloudflare/wxhl-market/worker.test.js`
Expected: FAIL（worker.js 不存在）

- [ ] **Step 4: 实现 worker.js**

完整实现要点（基于九渊 worker.js 改写，差异如下）：

1. KV 绑定名全部从 `env.ACH` 改为 `env.MARKET`；删除 `/unlock`、`/stats`、`/ghost*` 三块路由，只保留 market 六接口。
2. 文件顶部放价格表与校验（命名导出）：

```js
// 一阶基准价表（与 src/wxhl-003/market/priceTable.ts 同规则，改动须两边同步）
const BASE = {
  武器: { 白色: [30, 60], 蓝色: [100, 200], 金色: [400, 800], 紫色: [1500, 3000] },
  防具: { 白色: [15, 40], 蓝色: [50, 150], 金色: [250, 600], 紫色: [1000, 2000] },
  饰品: { 白色: [20, 40], 蓝色: [60, 150], 金色: [300, 700], 紫色: [1200, 2500] },
};
const PREMIUM = { 蓝色: 1.0, 金色: 1.5, 紫色: 2.0 };
const TIER_IDX = { 一: 1, 二: 2, 三: 3, 四: 4, 五: 5, 1: 1, 2: 2, 3: 3, 4: 4, 5: 5 };

function tierFactor(tier) {
  const m = String(tier ?? '').match(/[一二三四五1-5]/);
  const n = m ? TIER_IDX[m[0]] : null;
  return n ? n * n : null;
}

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
  const min = Math.floor(ref[0] * f * 0.4);
  const max = Math.floor(ref[1] * f * (PREMIUM[品质] ?? 1));
  if (Number(price) < min) return fail(`价格过低，不得低于 ${min} UP`, min, max);
  if (Number(price) > max) return fail(`价格过高，${品质}装备不得超过 ${max} UP`, min, max);
  return { ok: true, min, max, reason: '' };
}
```

3. `/market/list` 校验改为：

```js
function validListing(b) {
  if (!b) return false;
  if (typeof b.client !== 'string' || b.client.length === 0 || b.client.length > 64) return false;
  if (typeof (b.seller ?? '') !== 'string' || String(b.seller).length > 24) return false;
  if (typeof (b.tier ?? '') !== 'string' || String(b.tier).length > 12) return false;
  if (b.kind !== 'equip' && b.kind !== 'goods') return false;
  if (!b.item || typeof b.item.名称 !== 'string' || b.item.名称.length === 0 || b.item.名称.length > 40) return false;
  if (typeof (b.item.描述 ?? '') !== 'string' || String(b.item.描述).length > 200) return false;
  if (!Number.isInteger(Number(b.qty)) || Number(b.qty) < 1 || Number(b.qty) > 99) return false;
  if (JSON.stringify(b.item).length > 2048) return false;
  return checkPrice(b.kind, b.item, String(b.tier ?? '一阶'), Number(b.price)).ok;
}
```

`POST /market/list` 在校验失败时返回 `400` + checkPrice 的 reason（而非笼统 'bad request'），方便前端展示拒绝原因：

```js
const chk = checkPrice(b.kind, b.item, String(b.tier ?? '一阶'), Number(b.price));
if (!validListing(b)) return new Response(chk.reason || 'bad request', { status: 400, headers: cors });
```

挂单存储 JSON 增加 `kind`、`tier` 字段；`/market/listings` 与 `/market/mine` 下发时带上这两个字段。其余五接口（listings/buy/cancel/collect/mine）逻辑与九渊一致，仅 `env.ACH` → `env.MARKET`。

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run cloudflare/wxhl-market/worker.test.js`
Expected: PASS；随后 `pnpm test` 全量确认无回归。

- [ ] **Step 6: Commit**

```bash
git add cloudflare/ vitest.config.ts
git commit -m "feat(wxhl): 自由市场 Worker 单文件版（六接口+装备价格强校验，KV 绑定 MARKET）"
```

---

### Task 4: 前端 API 封装 `market/api.ts`

**Files:**
- Create: `src/wxhl-003/market/api.ts`

**Interfaces:**
- Consumes: `MarketItemSnapshot` from `./priceTable`
- Produces:
  ```ts
  export const MARKET_API: string;   // 默认 'https://market.657868.xyz'，Task 6 部署后校对
  export function getClientId(): string;   // localStorage 'wxhl003_market_client'，首次随机生成
  export interface Listing { id: string; client: string; seller: string; tier: string; kind: 'equip'|'goods'; item: MarketItemSnapshot; qty: number; price: number; created: number }
  export function fetchListings(): Promise<Listing[]>
  export function createListing(p: { seller: string; tier: string; kind: 'equip'|'goods'; item: MarketItemSnapshot; qty: number; price: number }): Promise<{ id: string }>  // 非 2xx 时 throw Error(响应文本=拒绝原因)
  export function buyListing(id: string, buyer: string): Promise<void>
  export function cancelListing(id: string): Promise<void>
  export function collectProceeds(): Promise<number>   // gained
  export function fetchMine(): Promise<{ pending: number; listings: Listing[] }>
  ```

- [ ] **Step 1: 实现 api.ts**

```ts
import type { MarketItemSnapshot } from './priceTable';

/** 部署域名：绑定自定义域名后改这里 */
export const MARKET_API = 'https://market.657868.xyz';

const CLIENT_KEY = 'wxhl003_market_client';

export function getClientId(): string {
  let id = '';
  try { id = localStorage.getItem(CLIENT_KEY) ?? ''; } catch (_) {}
  if (!id) {
    id = 'c' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
    try { localStorage.setItem(CLIENT_KEY, id); } catch (_) {}
  }
  return id;
}

export interface Listing {
  id: string; client: string; seller: string; tier: string;
  kind: 'equip' | 'goods'; item: MarketItemSnapshot;
  qty: number; price: number; created: number;
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(MARKET_API + path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
  });
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

const post = (path: string, body: unknown) =>
  req(path, { method: 'POST', body: JSON.stringify(body) });

export function fetchListings(): Promise<Listing[]> {
  return req<{ listings: Listing[] }>('/market/listings').then(r => r.listings);
}

export function createListing(p: { seller: string; tier: string; kind: 'equip' | 'goods'; item: MarketItemSnapshot; qty: number; price: number }): Promise<{ id: string }> {
  return post('/market/list', { client: getClientId(), ...p });
}

export function buyListing(id: string, buyer: string): Promise<void> {
  return post('/market/buy', { id, buyer, client: getClientId() });
}

export function cancelListing(id: string): Promise<void> {
  return post('/market/cancel', { id, client: getClientId() });
}

export function collectProceeds(): Promise<number> {
  return post<{ gained: number }>('/market/collect', { client: getClientId() }).then(r => r.gained);
}

export function fetchMine(): Promise<{ pending: number; listings: Listing[] }> {
  return req(`/market/mine?client=${encodeURIComponent(getClientId())}`);
}
```

- [ ] **Step 2: 类型检查**

Run: `pnpm build:dev`
Expected: 编译通过无 TS 错误

- [ ] **Step 3: Commit**

```bash
git add src/wxhl-003/market/api.ts
git commit -m "feat(wxhl): 自由市场 API 封装与客户端标识"
```

---

### Task 5: store 挂 market 状态 + MVU 结算动作

**Files:**
- Modify: `src/wxhl-003/store.ts`（新增 market 相关的 state 与 actions，挂在现有 forum store 同文件内的独立 `useMarketStore`）
- Create: `src/wxhl-003/market/store.ts`（若 store.ts 过大则独立此文件，推荐独立）

**Interfaces:**
- Consumes: Task 2 `bagRemove/bagAdd/spendUP/gainUP`；Task 3 api 全部；Task 1 `checkPrice/isEquip`；现有 `Mvu`、`getCurrentMessageId`（参照 store.ts:2540-2562 的楼层探测与回读校验写法）
- Produces:
  ```ts
  export const useMarketStore: () => {
    listings: Ref<Listing[]>; pending: Ref<number>; loading: Ref<boolean>; lastError: Ref<string>;
    playerName: Ref<string>; playerTier: Ref<string>; playerUP: Ref<number>; playerBag: Ref<Bag>;
    refresh(): Promise<void>;
    sell(name: string, snapshot: MarketItemSnapshot, kind: 'equip'|'goods', qty: number, price: number): Promise<boolean>;
    buy(l: Listing): Promise<boolean>;
    cancel(l: Listing): Promise<boolean>;
    collect(): Promise<boolean>;
  }
  ```

- [ ] **Step 1: 实现 market/store.ts**

关键结构（Mvu 读写严格照 store.ts:2531-2576 模式）：

```ts
import { defineStore } from 'pinia';
import { ref } from 'vue';
import { bagAdd, bagRemove, gainUP, spendUP, type Bag } from './settle';
import { buyListing, cancelListing, collectProceeds, createListing, fetchListings, fetchMine, type Listing } from './api';
import type { MarketItemSnapshot } from './priceTable';

function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

/** 读 stat_data.契约者；失败返回 null */
function readContractor(): { mvu: any; c: any; mid: number | 'latest' } | null {
  try {
    const mid = messageId();
    const mvu = Mvu.getMvuData({ type: 'message', message_id: mid });
    const c = _.get(mvu, ['stat_data', '契约者']);
    return c ? { mvu, c, mid } : null;
  } catch (_) { return null; }
}

export const useMarketStore = defineStore('wxhl003-market', () => {
  const listings = ref<Listing[]>([]);
  const pending = ref(0);
  const loading = ref(false);
  const lastError = ref('');

  const playerName = ref('');
  const playerTier = ref('一阶');
  const playerUP = ref(0);
  const playerBag = ref<Bag>({});

  function syncFromMvu(): boolean {
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量（契约者不存在）'; return false; }
    playerName.value = String(r.c.头部?.姓名 ?? '无名契约者');
    playerTier.value = String(r.c.头部?.阶位 ?? '一阶');
    playerUP.value = Number(r.c.经济?.UP ?? 0);
    playerBag.value = (r.c.背包 ?? {}) as Bag;
    return true;
  }

  /** 落档 + 回读校验（回读失败=已写但未核对上，toastr 警告不视为失败） */
  async function commit(mvu: any, mid: number | 'latest', checks: [string[], unknown][]): Promise<void> {
    await Mvu.replaceMvuData(mvu, { type: 'message', message_id: mid });
    const after = Mvu.getMvuData({ type: 'message', message_id: mid });
    for (const [path, expectVal] of checks) {
      const got = _.get(after, path);
      if (expectVal === undefined ? got !== undefined : got === undefined) {
        toastr.warning('变量已写入但回读核对不上: ' + path.join('.'));
      }
    }
  }

  async function refresh() {
    loading.value = true;
    lastError.value = '';
    try {
      syncFromMvu();
      const [all, mine] = await Promise.all([fetchListings(), fetchMine()]);
      listings.value = all.reverse();      // key 升序=旧→新，界面要最新在前
      pending.value = mine.pending;
    } catch (e: any) {
      lastError.value = e?.message || '市场连接失败';
    } finally { loading.value = false; }
  }
  // sell/buy/cancel/collect 见 Step 2
  return { listings, pending, loading, lastError, playerName, playerTier, playerUP, playerBag, refresh };
});
```

- [ ] **Step 2: 四个结算动作（同文件，放进 defineStore 并 return）**

```ts
  /** 上架：先本地扣背包 → 服务器登记；服务器失败则回滚 */
  async function sell(name: string, snapshot: MarketItemSnapshot, kind: 'equip' | 'goods', qty: number, price: number): Promise<boolean> {
    lastError.value = '';
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    let newBag: Bag;
    try { newBag = bagRemove((r.c.背包 ?? {}) as Bag, name, qty); }
    catch (e: any) { lastError.value = e.message; return false; }
    _.set(r.mvu, ['stat_data', '契约者', '背包'], newBag);
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '背包', name], qty >= Number((r.c.背包?.[name] as any)?.数量 ?? 0) ? undefined : 1]]);
    try {
      await createListing({ seller: playerName.value, tier: playerTier.value, kind, item: { ...snapshot, 名称: name, 数量: qty }, qty, price });
    } catch (e: any) {
      // 回滚：把物品加回去
      const rb = readContractor();
      if (rb) {
        _.set(rb.mvu, ['stat_data', '契约者', '背包'], bagAdd((rb.c.背包 ?? {}) as Bag, { ...snapshot, 名称: name }, qty));
        await commit(rb.mvu, rb.mid, []);
      }
      lastError.value = e?.message || '上架被拒绝';
      toastr.error('上架失败: ' + lastError.value);
      return false;
    }
    toastr.success(`「${name}」×${qty} 已上架`);
    await refresh();
    return true;
  }

  /** 购买：先服务器销账 → 本地扣 UP 入包；本地失败无法回滚服务器，先本地校验余额再动服务器 */
  async function buy(l: Listing): Promise<boolean> {
    lastError.value = '';
    const r = readContractor();
    if (!r) { lastError.value = '读不到存档变量'; return false; }
    const up = Number(r.c.经济?.UP ?? 0);
    try { spendUP(up, l.price); } catch (e: any) { lastError.value = e.message; toastr.error(e.message); return false; }
    try {
      await buyListing(l.id, playerName.value);
    } catch (e: any) {
      lastError.value = e?.message || '购买失败';
      toastr.error('购买失败: ' + lastError.value);
      return false;
    }
    _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], up - l.price);
    _.set(r.mvu, ['stat_data', '契约者', '背包'], bagAdd((r.c.背包 ?? {}) as Bag, l.item, l.qty));
    await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], up - l.price]]);
    toastr.success(`购得「${l.item.名称}」×${l.qty}`);
    await refresh();
    return true;
  }

  /** 下架：先服务器删单 → 本地回包 */
  async function cancel(l: Listing): Promise<boolean> {
    lastError.value = '';
    try { await cancelListing(l.id); }
    catch (e: any) { lastError.value = e?.message || '下架失败'; toastr.error(lastError.value); return false; }
    const r = readContractor();
    if (r) {
      _.set(r.mvu, ['stat_data', '契约者', '背包'], bagAdd((r.c.背包 ?? {}) as Bag, l.item, l.qty));
      await commit(r.mvu, r.mid, []);
    }
    toastr.success(`「${l.item.名称}」已取回`);
    await refresh();
    return true;
  }

  /** 领取货款：先服务器清零 → 本地加 UP */
  async function collect(): Promise<boolean> {
    lastError.value = '';
    let gained = 0;
    try { gained = await collectProceeds(); }
    catch (e: any) { lastError.value = e?.message || '领取失败'; toastr.error(lastError.value); return false; }
    if (gained <= 0) { toastr.info('没有待领货款'); return true; }
    const r = readContractor();
    if (r) {
      const up = Number(r.c.经济?.UP ?? 0);
      _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], gainUP(up, gained));
      await commit(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], up + gained]]);
    }
    toastr.success(`领取货款 ${gained} UP`);
    await refresh();
    return true;
  }
```

注意 buy 的顺序是有意为之：余额校验在本地先行（不足则不动服务器），服务器销账成功才落本地变量——避免出现「服务器已销账但本地 UP 不足」的倒挂。

- [ ] **Step 3: 类型检查 + 全量测试**

Run: `pnpm build:dev && pnpm test`
Expected: 编译通过，测试无回归

- [ ] **Step 4: Commit**

```bash
git add src/wxhl-003/market/store.ts
git commit -m "feat(wxhl): 自由市场 store——MVU 结算四动作（上架/购买/下架/领取）"
```

---

### Task 6: 界面 `MarketView.vue` + App.vue 接入

**Files:**
- Create: `src/wxhl-003/market/MarketView.vue`
- Modify: `src/wxhl-003/App.vue`（currentView 联合类型 + openMarket + app-grid 图标 + 视图挂载）

**Interfaces:**
- Consumes: `useMarketStore`（Task 5）、`checkPrice/isEquip/refRange`（Task 1）、`Listing`（Task 4）
- Produces: `<MarketView />` 组件，props 无，emit `close`

- [ ] **Step 1: MarketView.vue**

结构与现有页面（forum/arena）一致的 `.app-page` 容器，顶部返回按钮 emit('close')。三个页签 `tab = ref<'browse'|'sell'|'mine'>('browse')`：

- **browse**：`store.listings` 卡片列表，每张卡显示 `item.名称`、品质阶位（equip 时 `item.品质·item.类型·item.阶位`）、`qty`、`price`、seller、相对时间；品质筛选 chips（全部/蓝/金/紫/道具）；购买按钮（自己 client 的单显示「我的挂单」不可买）→ 确认框 → `store.buy(l)`。
- **sell**：从 `store.playerBag` 列出数量>0 的物品；选中后 `isEquip(item)` 判定 kind；equip 时调用 `checkPrice('equip', item, store.playerTier, price)` 实时显示「合法区间 min~max UP」并禁用越价提交；goods 仅提示数量上限。提交 → `store.sell(...)`。
- **mine**：`store.pending` + 领取按钮（`store.collect()`）；我的挂单列表（`listings` 里 client===getClientId() 的，或单独调 fetchMine——用 refresh 里已取的 mine.listings，在 store 加 `myListings` ref 存储）→ 下架按钮 `store.cancel(l)`。

样式复用 global.css 现有 app-page/card 类；品质色：蓝 #4a9eff、金 #d4a017、紫 #a55eea（与现有稀有度配色保持一致，先看 global.css 是否已有对应 class 再新增）。

进入页面时 `onMounted(() => store.refresh())`。

- [ ] **Step 2: App.vue 接入**

1. 第 2119-2121 行 currentView 联合类型加 `'market'`。
2. 新增 `function openMarket() { currentView.value = 'market'; }` 与 `appSubs.market = '自由市场'`（appSubs 对象按现有键补一个，初始值如 '以物易物，童叟无欺'）。
3. app-grid 里新增图标块（放在 dungeonRoll 图标之后）：

```html
<div class="app-icon-wrapper" @click="openMarket">
  <div class="app-icon market-icon">
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
      <path d="M12 3v3M8 21h8M12 6l-7 4h14l-7-4z" />
      <path d="M5 10l-2 5a3.5 3.5 0 0 0 7 0l-2-5M19 10l-2 5a3.5 3.5 0 0 0 7 0l-2-5" />
    </svg>
  </div>
  <span class="app-label">自由市场</span>
  <span class="app-sub">{{ appSubs.market }}</span>
</div>
```

4. 视图挂载（放在 arena 视图块之后）：

```html
<div v-if="currentView === 'market'" class="app-page">
  <MarketView @close="currentView = 'desktop'" />
</div>
```

5. script 顶部 `import MarketView from './market/MarketView.vue';`

- [ ] **Step 3: 构建验证**

Run: `pnpm build:dev`
Expected: 编译通过；dist/wxhl-003/index.js 重新生成

- [ ] **Step 4: Commit**

```bash
git add src/wxhl-003/market/MarketView.vue src/wxhl-003/App.vue
git commit -m "feat(wxhl): 自由市场界面——桌面图标入口+逛市场/上架/我的三页签"
```

---

### Task 7: 部署 + 冒烟测试

**Files:**
- Create: `cloudflare/wxhl-market/README.md`（部署说明）

- [ ] **Step 1: 部署 Worker**

优先 wrangler（若用户网络已恢复）：`wrangler login` → `wrangler kv namespace create MARKET` → 在 `cloudflare/wxhl-market/wrangler.toml` 写绑定 → `wrangler deploy`。
兜底（网络不通时）：Dashboard → Workers & Pages → 创建 `wxhl-market` → 粘贴 worker.js → Settings → Variables → KV Namespace Bindings 绑定新建 KV，变量名 `MARKET`。

- [ ] **Step 2: 绑自定义域名**

Workers → wxhl-market → Settings → Domains & Routes → 添加 `market.657868.xyz`（域名已在 Cloudflare 则自动签发证书）。

- [ ] **Step 3: curl 冒烟六接口**

```bash
curl -X POST https://market.657868.xyz/market/list -H 'Content-Type: application/json' \
  -d '{"client":"smoke1","seller":"测试甲","tier":"二阶","kind":"equip","item":{"名称":"制式长刀","品质":"蓝色","类型":"武器","阶位":"二阶","描述":"冒烟"},"qty":1,"price":600}'
# 期望 {"id":"..."}；再 curl /market/listings 应见此单；用 price=900 再试应 400 拒绝（蓝装禁溢价）
# /market/buy（另一个 client）→ /market/mine?client=smoke1 应见 pending=600 → /market/collect 得 gained=600
# 清理：再挂一单用 /market/cancel 下架
```

- [ ] **Step 4: 校对前端 MARKET_API**

确认 `api.ts` 的 `MARKET_API` 与实际域名一致，commit。

- [ ] **Step 5: 酒馆内手动验收**

开实时监听同步到酒馆：上架一件真装备 → 换买家视角购买 → 领取货款 → 下架一单，核对 `契约者.经济.UP` 与 `契约者.背包` 变动正确。

- [ ] **Step 6: Commit + push**

```bash
git add cloudflare/wxhl-market/README.md src/wxhl-003/market/api.ts
git commit -m "chore(wxhl): 自由市场部署完成，MARKET_API 指向 market.657868.xyz"
```

---

## Self-Review 记录

- Spec §3.3 校验规则 → Task 1（前端）+ Task 3（Worker 镜像），双侧同值测试防漂移 ✓
- Spec §3.5 六接口 → Task 3 ✓（unlock/stats/ghost 不移植）
- Spec §4.3 文件结构 → Task 1/2/4/5/6 ✓（store 独立为 market/store.ts，比 spec 写的更细，符合文件单一职责）
- Spec §4.4 结算与回滚 → Task 5；buy 顺序调整为「本地校验余额→服务器销账→本地落账」避免倒挂 ✓
- Spec §6 测试 → Task 1/2/3 单测 + Task 7 冒烟/手动 ✓
- 类型一致性：checkPrice/isEquip/refRange、Listing、Bag、sell/buy/cancel/collect 在 Task 1/2/3/4/5/6 间签名一致 ✓
