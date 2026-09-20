# 副本结算（Settlement）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在小手机主页面新增「副本结算」模块 —— 读变量与聊天记录、AI 做判定、**模块做全部算术**、拼出 `<Settlement Beautification>` 画面，玩家确认后才写存档。

**Architecture:** 沿用副本生成/敌人生成的三段式：`settlementGen.ts` 造 prompt（纯函数）→ AI 回 JSON（**只含判定与文案，不含任何算术结果**）→ `settlementRules.ts` 用 zod 校验、做全部算术、拼面板、产出写入清单（纯函数）→ `store.ts` 写 MVU。骰子由模块掷（`dice.ts` 的 `rollDie`），**以参数注入**以便单测。

**Tech Stack:** TypeScript / Vue 3 SFC / Pinia / zod 4 / vitest

**Spec:** `docs/superpowers/specs/2026-09-20-dungeon-settlement-design.md`（**执行前必读**）
**规则原文（逐字内联的来源）:** `docs/superpowers/specs/2026-09-20-dungeon-settlement-rules-verbatim.md`

## Global Constraints

- 工作分支沿用 `feat/wxhl-dungeon-roll-module`（用户已确认不另开分支）。
- **只 `git add` 本任务明确涉及的文件，严禁 `git add -A` / `git add .`。** 仓库有大量无关的未提交改动。
- 不新增依赖。源码里**不得手写** `z` / `ref` / `computed` / `watch` / `watchEffect` / `defineStore` / `klona` / `_` / `$` / `toastr` / `YAML` 的 import（构建时全局注入）。
- 测试文件放 `src/wxhl-003/__tests__/`。
- **`pnpm build` 不做类型检查**（`ts-loader` + `transpileOnly`）；**`.vue` 更是完全不检查**。涉及 `App.vue` 的任务必须逐行自查。
- 仓库 `pnpm exec tsc --noEmit` 现有 **10 条**既存错误，不得新增。
- **不要改**用户提供的逐字规则常量（`data.ts` 里 `DUNGEON_GENERATION_RULES` / `ENEMY_GEN_RULES` / `BOSS_TEMPLATE_RULES` / `BUILD_DESIGN_RULES` / `FACTION_PROFILES` / `RANK_BOARDS` 等）；不要改 `dice.ts` / `dungeonRules.ts` / `enemyRules.ts` 的既有逻辑；不要动 `App.vue` 里与本模块无关的部分（含状态栏 `◆ 回廊终端 · v2`）。
- 一律半角符号与冒号；文案简体中文。
- **断言子串若被 `**` 加粗标记从中间断开，`toContain` 必然失败** —— 本项目已踩过三次，写断言前逐字复制。

---

## 已确认的关键决定（用户拍板，不要再问）

1. 模块算、AI 判定与写文案。**AI 不碰任何算术结果。**
2. **先出结算画面，确认后才写存档。** 可「重算」。
3. **结算后流程不做进模块** —— 画面末尾列出两个选项，交给聊天。
4. **模块只算 EXP / UP / RP / PEXP 四个增量**，不做逐级升级、不做军衔晋升 —— 前端脚本自动执行升级。
5. **队友的位阶修正统一用玩家的**，且队友拿到与玩家**完全相同**的最终 EXP / UP 数额。
6. **队友的 UP 写进该成员的 `背包`**，条目名「现金UP」。
7. **RP 的区间值由模块掷骰**。
8. **成就的 RP 直接等于星数**，不掷骰。
9. **副本周期 10 + 1 = 1**。
10. **称号**：模块**不写** `称号.当前称号`，写进 `称号.备用称号（只记录不生效）`。
11. **清空**：`其他契约者` / `副本角色` / `其他契约者名单` / `固有角色名单` 清空；`当前副本元数据` / `当前副本任务` 清零回默认。
12. **副本内天数按 `当前时间.副本日期`**，由 AI 读出并报告。

**Spec 里两处标了 ⚠️ 待确认、本计划按以下取值实现**（若用户推翻，改这两个纯函数即可）：
- CR 分档取 `Math.floor(CR)` 后查表
- `newCR >= 10 → 3`

---

## 文件结构

| 文件 | 责任 |
|---|---|
| `src/wxhl-003/data.ts` | **改**：新增内联常量 `SETTLEMENT_RULES`（逐字） |
| `src/wxhl-003/settlementRules.ts` | **新建**：zod schema、奖励文本解析、全部算术、面板拼装、写入清单（纯函数，零酒馆依赖） |
| `src/wxhl-003/settlementGen.ts` | **新建**：`buildSettlementPrompt`（纯函数） |
| `src/wxhl-003/__tests__/settlementRules.test.ts` | **新建** |
| `src/wxhl-003/__tests__/settlementGen.test.ts` | **新建** |
| `src/wxhl-003/store.ts` | **改**：新增 `useSettlementStore`（`generateSettlement` / `writeSettlement`） |
| `src/wxhl-003/App.vue` | **改**：主页面图标 + `currentView: 'settlement'` 视图 |

---

### Task 1: 规则常量 + schema + 奖励文本解析

**Files:**
- Modify: `src/wxhl-003/data.ts`（在既有规则常量附近追加）
- Create: `src/wxhl-003/settlementRules.ts`
- Test: `src/wxhl-003/__tests__/settlementRules.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `const SETTLEMENT_RULES: string`（`data.ts` 导出）
  - `const SettlementGenResultSchema`（zod）
  - `type SettlementGenResult = z.output<typeof SettlementGenResultSchema>`
  - `interface RewardNumbers { UP: number; EXP: number; RP: number }`
  - `function parseRewardText(文本: string): RewardNumbers`

- [ ] **Step 1: 内联规则常量**

把 `docs/superpowers/specs/2026-09-20-dungeon-settlement-rules-verbatim.md` 里
`<副本结算>…</副本结算>` 那一整块**逐字**复制为 `data.ts` 的导出常量：

```ts
/** 副本结算规则（用户提供, 逐字内联）—— 见 docs/superpowers/specs/2026-09-20-dungeon-settlement-rules-verbatim.md */
export const SETTLEMENT_RULES = `<副本结算>
...逐字复制, 一个字都不要改...
</副本结算>`;
```

⚠️ 用**模板字符串**（反引号）。规则正文里若出现反引号或 `${`，按原样保留 —— 先 grep 确认没有：
`grep -c '`' docs/superpowers/specs/2026-09-20-dungeon-settlement-rules-verbatim.md`（预期 0）
`grep -c '\${' docs/superpowers/specs/2026-09-20-dungeon-settlement-rules-verbatim.md`（预期 0）
若不为 0，**停下来报告**，不要自行转义。

- [ ] **Step 2: 写失败测试**

Create: `src/wxhl-003/__tests__/settlementRules.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { parseRewardText } from '../settlementRules';

describe('parseRewardText', () => {
  it('解析标准的奖励文本', () => {
    expect(parseRewardText('50 UP + 100 EXP + 3 RP + 【金色】武器：某物'))
      .toEqual({ UP: 50, EXP: 100, RP: 3 });
  });

  it('没有 RP 段时 RP 记 0', () => {
    expect(parseRewardText('250 UP + 500 EXP')).toEqual({ UP: 250, EXP: 500, RP: 0 });
  });

  it('「无」与空串表示没有奖励, 记全 0（不是格式错误）', () => {
    expect(parseRewardText('无')).toEqual({ UP: 0, EXP: 0, RP: 0 });
    expect(parseRewardText('')).toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  it('数字为 0 也照常解析', () => {
    expect(parseRewardText('0 UP + 0 EXP')).toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  // 关键: 格式非法必须抛错, 绝不静默当 0 —— 静默当 0 会让玩家少拿奖励且无人察觉
  it('格式非法时抛错', () => {
    expect(() => parseRewardText('随便一段没有数字的文字')).toThrow();
    expect(() => parseRewardText('UP + 100 EXP')).toThrow();
    expect(() => parseRewardText('50 UP + 100 EXP + 3 RP + 【金色】武器：某物 + 尾巴')).toThrow();
  });

  it('抛出的错误里带上原始文本, 便于定位是哪一条任务', () => {
    expect(() => parseRewardText('坏掉的奖励')).toThrow(/坏掉的奖励/);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `pnpm test src/wxhl-003/__tests__/settlementRules.test.ts`
Expected: FAIL —— `Failed to resolve import "../settlementRules"`

- [ ] **Step 4: 实现**

Create: `src/wxhl-003/settlementRules.ts`

奖励文本的格式由 `dice.ts:composeRewardText` 固定生成，**只有这四种形状**：

```
"N UP + M EXP"                                    // 无 RP、无物品
"N UP + M EXP + K RP"                             // 有 RP、无物品
"N UP + M EXP + 【品质】类型：物品名"                // 无 RP、有物品
"N UP + M EXP + K RP + 【品质】类型：物品名"         // 全有
```

实现要点：

```ts
/** 奖励文本里的三个数值 */
export interface RewardNumbers { UP: number; EXP: number; RP: number }

const 空奖励: RewardNumbers = { UP: 0, EXP: 0, RP: 0 };

/**
 * 解析变量里 `奖励` 字段的文本。
 *
 * 格式由 dice.ts:composeRewardText 固定生成。**格式非法时抛错, 绝不静默当 0** ——
 * 静默当 0 会让玩家少拿奖励而无人察觉, 与本模块「宁可难看也不圆上」的口径一致。
 * 只有「无」与空串是合法的「没有奖励」。
 */
export function parseRewardText(文本: string): RewardNumbers {
  const t = (文本 ?? '').trim();
  if (t === '' || t === '无') return { ...空奖励 };
  // 按 ' + ' 切段后逐段判形状。**不要用单条大正则** —— 末段的 `.+` 是贪婪的,
  // 会把「物品名 + 尾巴」整段吃掉, 于是非法输入被当成合法(见 ledger Ruling 1)。
  const 段 = t.split(' + ');
  const m1 = /^(\d+) UP$/.exec(段[0] ?? '');
  const m2 = /^(\d+) EXP$/.exec(段[1] ?? '');
  if (!m1 || !m2) throw new Error('奖励文本格式无法解析: ' + t);
  let i = 2;
  let RP = 0;
  const m3 = /^(\d+) RP$/.exec(段[i] ?? '');
  if (m3) { RP = Number(m3[1]); i++; }
  if (i < 段.length) {
    // 至多还剩一段物品段
    if (i !== 段.length - 1 || !/^【[^】]*】[^：]*：.+$/.test(段[i])) {
      throw new Error('奖励文本格式无法解析: ' + t);
    }
  }
  return { UP: Number(m1[1]), EXP: Number(m2[1]), RP };
}
```

zod schema（AI 的返回值，**只含判定与文案**）：

```ts
const 击杀Schema = z.object({
  精英: z.coerce.number().int().min(0).prefault(0),
  BOSS: z.coerce.number().int().min(0).prefault(0),
  隐藏BOSS: z.coerce.number().int().min(0).prefault(0),
}).prefault({});

export const SettlementGenResultSchema = z.object({
  评价等级: z.enum(['S', 'A', 'B', 'C', 'D', 'F']),
  评价依据: z.string().prefault(''),
  击杀: 击杀Schema,
  濒死次数: z.coerce.number().int().min(0).prefault(0),
  副本天数: z.coerce.number().int().min(0).prefault(0),
  完成的支线: z.array(z.string()).prefault([]),
  完成的隐藏任务: z.array(z.string()).prefault([]),
  达成的成就: z.array(z.string()).prefault([]),
  职业专属支线条数: z.coerce.number().int().min(0).prefault(0),
  天赋试炼次数: z.coerce.number().int().min(0).prefault(0),
  掉落物品: z.array(z.object({
    名称: z.string().min(1),
    品质: z.string().prefault('无'),
    属性: z.string().prefault(''),
    效果: z.string().prefault(''),
    数量: z.coerce.number().int().min(1).prefault(1),
  })).prefault([]),
  称号: z.object({
    名称: z.string().prefault(''),
    效果: z.record(z.string(), z.string()).prefault({}),
  }).nullable().prefault(null),
  史诗记录: z.string().prefault(''),
});

export type SettlementGenResult = z.output<typeof SettlementGenResultSchema>;
```

**`评价等级` 含 `'F'`** —— 让 AI 能如实回报「主线失败」，由 store 拦下并提示，而不是让它硬凑一个等级。

- [ ] **Step 5: 运行确认通过**

Run: `pnpm test src/wxhl-003/__tests__/settlementRules.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: 构建 / 全量测试 / tsc**

Run: `pnpm build && pnpm test && pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: 构建成功；全量通过（123 + 新增 6）；错误数仍 **10**

- [ ] **Step 7: 提交**

```bash
git add src/wxhl-003/data.ts src/wxhl-003/settlementRules.ts src/wxhl-003/__tests__/settlementRules.test.ts
git commit -m "feat(wxhl): 内联副本结算规则, 新增校验 schema 与奖励文本解析"
```

---

### Task 2: 算术（`computeSettlement`）

**Files:**
- Modify: `src/wxhl-003/settlementRules.ts`
- Test: `src/wxhl-003/__tests__/settlementRules.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `RewardNumbers`
- Produces:
  - `interface SettlementInputs`
  - `interface SettlementComputed`
  - `function computeSettlement(输入: SettlementInputs, 掷?: (面数: number) => number): SettlementComputed`

- [ ] **Step 1: 写失败测试**

追加到 `settlementRules.test.ts`：

```ts
import { computeSettlement } from '../settlementRules';

/** 固定的假骰子: 永远掷出「最大值」, 让断言可写死 */
const 满骰 = () => (面数: number) => 面数;
/** 永远掷出 1 */
const 壹骰 = () => () => 1;

const 基准输入 = {
  评价等级: 'S' as const,
  击杀: { 精英: 2, BOSS: 1, 隐藏BOSS: 1 },
  濒死次数: 0,
  副本天数: 3,
  基础EXP汇总: 100,
  基础UP汇总: 50,
  完成的支线数: 2,
  隐藏任务数: 2,
  成就星数: [1, 3, 6],
  天赋试炼次数: 1,
  职业专属支线条数: 2,
  CR: 5,
  阶位: '三阶',
  旧周期: 3,
  旧资格分: 100,
  现实日期: '2025年5月10日',
};

describe('computeSettlement · 资格分', () => {
  it('评价分 + 击杀分 + 任务分', () => {
    const r = computeSettlement(基准输入, 满骰());
    expect(r.资格分_评价).toBe(50);        // S
    expect(r.资格分_击杀).toBe(2 * 5 + 1 * 15 + 1 * 30);  // 55
    expect(r.资格分_任务).toBe(2 * 5 + 2 * 20 + 3 * 10);   // 80
    expect(r.资格分_本次).toBe(50 + 55 + 80);              // 185
  });
});

describe('computeSettlement · 倍率', () => {
  it('最终EXP = 基础 × 评价 × CR × 位阶', () => {
    const r = computeSettlement(基准输入, 满骰());
    expect(r.评价倍率).toBe(2.0);
    expect(r.CR态度).toBe('关注');
    expect(r.CR奖励倍率).toBe(1.5);
    expect(r.位阶修正).toBe(3);            // 三阶
    expect(r.最终EXP).toBe(100 * 2.0 * 1.5 * 3);   // 900
    expect(r.最终UP).toBe(50 * 2.0 * 1.5 * 3);     // 450
  });

  it('CR 取 Math.floor 后分档（2.5 落到 2 → 漠视）', () => {
    expect(computeSettlement({ ...基准输入, CR: 2.5 }, 满骰()).CR态度).toBe('漠视');
    expect(computeSettlement({ ...基准输入, CR: 3.0 }, 满骰()).CR态度).toBe('观察');
    expect(computeSettlement({ ...基准输入, CR: 9.9 }, 满骰()).CR态度).toBe('期待');
    expect(computeSettlement({ ...基准输入, CR: 10 }, 满骰()).CR态度).toBe('炼狱');
  });

  it('D 级 ×0.7, 一阶位阶修正 ×1', () => {
    const r = computeSettlement({ ...基准输入, 评价等级: 'D', CR: 1, 阶位: '一阶' }, 满骰());
    expect(r.评价倍率).toBe(0.7);
    expect(r.最终EXP).toBe(Math.round(100 * 0.7 * 1.0 * 1));
  });
});

describe('computeSettlement · RP', () => {
  it('隐藏任务掷满 + 成就按星数 + S级+3 + 隐藏BOSS掷满 + 天赋试炼掷满 + 炼狱附加', () => {
    // 满骰: 隐藏任务 2×3=6, 成就 1+3+6=10, S级 +3, 隐藏BOSS 1×4=4, 天赋试炼 1×2=2
    // CR=5 非炼狱 → 附加 0
    expect(computeSettlement(基准输入, 满骰()).RP).toBe(6 + 10 + 3 + 4 + 2);
  });

  it('非 S 级没有 +3', () => {
    expect(computeSettlement({ ...基准输入, 评价等级: 'A' }, 满骰()).RP).toBe(6 + 10 + 4 + 2);
  });

  it('炼狱(CR=10) 才有通关附加', () => {
    expect(computeSettlement({ ...基准输入, CR: 10 }, 满骰()).RP).toBe(6 + 10 + 3 + 4 + 2 + 3);
  });

  it('掷 1 时取下限', () => {
    // 隐藏 2×1=2, 成就 10, S级 3, 隐藏BOSS 1×2=2, 天赋试炼 1×1=1
    expect(computeSettlement(基准输入, 壹骰()).RP).toBe(2 + 10 + 3 + 2 + 1);
  });
});

describe('computeSettlement · PEXP', () => {
  it('(100 + Σ掷50~100) × 评价倍率', () => {
    // 满骰: 2 条 × 100 = 200 → (100+200) × 2.0 = 600
    expect(computeSettlement(基准输入, 满骰()).PEXP).toBe(600);
    // 壹骰: 2 条 × 50 = 100 → (100+100) × 2.0 = 400
    expect(computeSettlement(基准输入, 壹骰()).PEXP).toBe(400);
  });
});

describe('computeSettlement · CR / 周期 / 时间 / 资格分', () => {
  it('CR 变动与回廊态度', () => {
    expect(computeSettlement({ ...基准输入, 评价等级: 'S', CR: 5 }, 满骰()).更新后CR).toBe(5.5);
    expect(computeSettlement({ ...基准输入, 评价等级: 'B', CR: 5 }, 满骰()).CR变动).toBe(0);
    expect(computeSettlement({ ...基准输入, 评价等级: 'D', CR: 5 }, 满骰()).更新后CR).toBe(4.5);
  });

  it('CR 达到或超过 10 时回调至 3', () => {
    expect(computeSettlement({ ...基准输入, 评价等级: 'S', CR: 10 }, 满骰()).更新后CR).toBe(3);
    expect(computeSettlement({ ...基准输入, 评价等级: 'S', CR: 9.8 }, 满骰()).更新后CR).toBe(3);
  });

  it('更新后回廊态度按变动后的 CR 查表', () => {
    const r = computeSettlement({ ...基准输入, 评价等级: 'S', CR: 6.8 }, 满骰());
    expect(r.更新后CR).toBe(7.3);
    expect(r.更新后回廊态度).toBe('重视');
  });

  it('周期 10 + 1 = 1', () => {
    expect(computeSettlement({ ...基准输入, 旧周期: 3 }, 满骰()).新周期).toBe(4);
    expect(computeSettlement({ ...基准输入, 旧周期: 10 }, 满骰()).新周期).toBe(1);
  });

  it('现实日期加上副本天数（含跨月）', () => {
    expect(computeSettlement({ ...基准输入, 副本天数: 3 }, 满骰()).新现实日期).toBe('2025年5月13日');
    expect(computeSettlement({ ...基准输入, 现实日期: '2025年5月30日', 副本天数: 3 }, 满骰()).新现实日期).toBe('2025年6月2日');
    expect(computeSettlement({ ...基准输入, 现实日期: '2025年12月30日', 副本天数: 3 }, 满骰()).新现实日期).toBe('2026年1月2日');
  });

  it('现实日期格式不认识时不猜, 返回空串', () => {
    expect(computeSettlement({ ...基准输入, 现实日期: '不知道' }, 满骰()).新现实日期).toBe('');
  });

  it('资格分累加', () => {
    expect(computeSettlement({ ...基准输入, 旧资格分: 100 }, 满骰()).新资格分).toBe(100 + 185);
  });
});
```

- [ ] **Step 2: 运行确认失败**

Run: `pnpm test src/wxhl-003/__tests__/settlementRules.test.ts`
Expected: FAIL —— `computeSettlement is not a function`

- [ ] **Step 3: 实现**

追加到 `settlementRules.ts`：

```ts
/** 算术的全部输入（AI 判定 + 变量快照, 两者都由调用方备好） */
export interface SettlementInputs {
  评价等级: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  击杀: { 精英: number; BOSS: number; 隐藏BOSS: number };
  濒死次数: number;
  副本天数: number;
  基础EXP汇总: number;
  基础UP汇总: number;
  /** 本次完成的支线任务数（= AI 报告的 `完成的支线`.length）—— 资格分的「支线+5/条」用它, **不是**职业专属支线条数 */
  完成的支线数: number;
  隐藏任务数: number;
  /** 每个已达成成就的星数（★=1 … ★★★★★★=6） */
  成就星数: number[];
  天赋试炼次数: number;
  职业专属支线条数: number;
  /** 结算前的 CR */
  CR: number;
  /** 玩家的阶位, 一阶~五阶 */
  阶位: string;
  旧周期: number;
  旧资格分: number;
  现实日期: string;
}

/** 算术的全部产物（面板与写入清单都只读它） */
export interface SettlementComputed {
  评价等级: SettlementInputs['评价等级'];
  评价倍率: number;
  CR态度: string;
  CR奖励倍率: number;
  位阶修正: number;
  基础EXP汇总: number;
  基础UP汇总: number;
  最终EXP: number;
  最终UP: number;
  RP: number;
  PEXP: number;
  资格分_评价: number;
  资格分_击杀: number;
  资格分_任务: number;
  资格分_本次: number;
  CR变动: number;
  更新后CR: number;
  更新后回廊态度: string;
  新周期: number;
  新资格分: number;
  新现实日期: string;
}

/** 评价倍率（规则第四步） */
const 评价倍率表: Record<string, number> = { S: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.7, F: 0 };

/** CR 分档 → [态度, 奖励倍率]（规则第十步）。按 Math.floor(CR) 取档 */
function CR分档(CR: number): [string, number] {
  const n = Math.floor(CR);
  if (n <= 2) return ['漠视', 1.0];
  if (n <= 4) return ['观察', 1.2];
  if (n <= 6) return ['关注', 1.5];
  if (n <= 8) return ['重视', 3.0];
  if (n <= 9) return ['期待', 6.0];
  return ['炼狱', 15.0];
}

/** 阶位 → 阶数（规则第四步的「位阶修正={{user}}阶数」, 是 1~5 而非敌人生成的 1/2/4/7/11） */
const 阶数表: Record<string, number> = {
  一阶: 1, 二阶: 2, 三阶: 3, 四阶: 4, 五阶: 5,
  '1阶': 1, '2阶': 2, '3阶': 3, '4阶': 4, '5阶': 5,
};

/** 现实日期字符串 `2025年5月10日` 加 N 天; 格式不认识返回空串（不猜） */
function 加天数(日期: string, 天数: number): string {
  const m = /^(\d+)年(\d+)月(\d+)日$/.exec((日期 ?? '').trim());
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 天数));
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

/**
 * 全部算术。
 *
 * @param 掷 掷骰函数（默认 dice.ts 的 rollDie）。**以参数注入是为了可单测** ——
 *           RP 有个区间来源要掷, 不注入就没法写断言。
 */
export function computeSettlement(
  输入: SettlementInputs,
  掷: (面数: number) => number = rollDie,
): SettlementComputed { /* 按 Spec 第五节实现 */ }
```

实现体按 Spec 第五节，逐条：

- **资格分**：评价分 `{S:50,A:35,B:20,C:10,D:0,F:0}` + 击杀分（精英×5 + BOSS×15 + 隐藏BOSS×30）+ 任务分（`完成的支线数×5` + `隐藏任务数×20` + `成就星数.length×10`）
- **倍率**：`评价倍率 = 评价倍率表[评价等级]`；`[CR态度, CR奖励倍率] = CR分档(输入.CR)`；`位阶修正 = 阶数表[阶位] ?? 1`
- **最终**：`最终EXP = Math.round(基础EXP汇总 × 评价倍率 × CR奖励倍率 × 位阶修正)`，UP 同理
- **RP**：`隐藏任务数 × 掷(3)`（即 1~3）+ `Σ成就星数` +（S 级 ? 3 : 0）+ `击杀.隐藏BOSS × (2 + 掷(3) - 1)`（即 **2~4**）+ `天赋试炼次数 × 掷(2)`（即 1~2）+（`Math.floor(CR) >= 10` ? `掷(3)` : 0）
  - ⚠️ 规则原文第五步逐字是「击杀稀有/隐藏BOSS **2~4**」，**不是 1~4** —— 所以是 `2 + 掷(3) - 1` 而不是 `掷(4)`。本计划早先的版本写错过，测试的 `壹骰` 用例（期望 18，其中隐藏BOSS 贡献下限 2）把它钉住了。
  - ⚠️ 「掷 1~N」用 `掷(N)` 实现（`rollDie(3)` 返回 1~3）
- **PEXP**：`Σ_{i<职业专属支线条数} (50 + 掷(51) - 1)`，即每条掷 50~100；然后 `Math.round((100 + Σ) × 评价倍率)`
  - ⚠️ `rollDie(51)` 返回 1~51，减 1 后加 50 = 50~100。**别写成 `50 + 掷(50)`**（那是 51~100，错）
- **CR**：`CR变动 = {S:0.5, A:0.3, B:0, C:0, D:-0.5, F:0}[评价等级]`；`新 = 输入.CR + CR变动`；`if (新 >= 10) 新 = 3`；再 clamp 到 1~10；`更新后回廊态度 = CR分档(更新后CR)[0]`
- **周期**：`新 = 旧周期 + 1; if (新 > 10) 新 = 1`
- **时间**：`新现实日期 = 加天数(输入.现实日期, 输入.副本天数)`
- **资格分累加**：`新资格分 = 输入.旧资格分 + 资格分_本次`

import `rollDie`：`import { rollDie } from './dice';`（**项目内模块必须显式 import**；`dice.ts` 是纯函数模块，无副作用）

- [ ] **Step 4: 运行确认通过**

Run: `pnpm test src/wxhl-003/__tests__/settlementRules.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 构建 / 全量测试 / tsc** → 同 Task 1 Step 6

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/settlementRules.ts src/wxhl-003/__tests__/settlementRules.test.ts
git commit -m "feat(wxhl): 副本结算的全部算术（资格分/倍率/RP/PEXP/CR/周期/时间）"
```

---

### Task 3: 面板拼装 + 写入清单

**Files:**
- Modify: `src/wxhl-003/settlementRules.ts`
- Test: `src/wxhl-003/__tests__/settlementRules.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `SettlementGenResult` / `parseRewardText`；Task 2 的 `SettlementComputed`
- Produces:
  - `interface SettlementSnapshot`（读存档需要的只读视图）
  - `function 汇总基础奖励(快照: SettlementSnapshot, ai: SettlementGenResult): { EXP: number; UP: number }`
  - `function assembleSettlementPanel(c: SettlementComputed, ai: SettlementGenResult, 快照: SettlementSnapshot): string`
  - `interface SettlementWrite { 路径: string[]; 值: unknown }`
  - `function buildSettlementWrites(c: SettlementComputed, ai: SettlementGenResult, 快照: SettlementSnapshot): SettlementWrite[]`

⚠️ **`汇总基础奖励` 必须是纯函数、必须在 S3 落地并测试** —— 它决定「哪些任务的奖励计入结算」，
是整个模块里最容易算错又最难在实机上看出来的一步（少算一条支线，画面上只是数字小一点）。
**不要把它写进 store** —— store 里没有测试。

- [ ] **Step 1: 写失败测试**

追加（子串**逐字从实现复制**，别凭记忆）：

```ts
import { assembleSettlementPanel, buildSettlementWrites, 汇总基础奖励 } from '../settlementRules';

/** 与 SettlementSnapshot 逐字对应的假快照 */
const 假快照 = {
  副本名称: '血色黎明',
  当前EXP: 0,
  当前UP: 0,
  当前RP: 40,
  当前PEXP: 100,
  军衔: '上等兵',
  职业等级: 5,
  PEXP_升级所需: 200,
  当前CR: 5,
  当前现实时间: '凌晨00:01',
  任务奖励: {
    '主线': '250 UP + 500 EXP',
    '收集物资': '30 UP + 60 EXP + 1 RP',
    '旧日回响': '80 UP + 150 EXP',
    '初见': '20 UP + 40 EXP + 2 RP',
    '没做完的支线': '999 UP + 999 EXP',
  } as Record<string, string>,
  小队成员: [{ 名称: '阿澈', 当前EXP: 0, 当前UP: 0 }],
};

const 假AI = {
  评价等级: 'S', 评价依据: '…', 击杀: { 精英: 2, BOSS: 1, 隐藏BOSS: 1 },
  濒死次数: 0, 副本天数: 3,
  完成的支线: ['收集物资'], 完成的隐藏任务: ['旧日回响'], 达成的成就: ['初见'],
  职业专属支线条数: 2, 天赋试炼次数: 1,
  掉落物品: [{ 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 1 }],
  称号: { 名称: '血夜行者', 效果: { 嗜血: '击杀回血' } },
  史诗记录: '他在血雨里站成了碑。',
} as any;

describe('汇总基础奖励', () => {
  it('只汇总主线 + AI 报告完成的那些, 未完成的支线不计入', () => {
    const r = 汇总基础奖励(假快照 as any, 假AI);
    expect(r.EXP).toBe(500 + 60 + 150 + 40);   // 主线 + 收集物资 + 旧日回响 + 初见
    expect(r.UP).toBe(250 + 30 + 80 + 20);
    expect(r.EXP).not.toBe(500 + 60 + 150 + 40 + 999);   // 「没做完的支线」不计入
  });

  it('AI 报告了变量里不存在的键名时, 以 0 计并在结果里列出', () => {
    const r = 汇总基础奖励(假快照 as any, { ...假AI, 完成的支线: ['收集物资', '不存在的任务'] } as any);
    expect(r.EXP).toBe(500 + 60 + 150 + 40);
    expect(r.未找到).toEqual(['不存在的任务']);
  });

  it('某条奖励文本非法时抛错, 不静默当 0', () => {
    const 坏快照 = { ...假快照, 任务奖励: { ...假快照.任务奖励, '收集物资': '坏掉的奖励' } };
    expect(() => 汇总基础奖励(坏快照 as any, 假AI)).toThrow(/收集物资|坏掉的奖励/);
  });
});

describe('assembleSettlementPanel', () => {
  const c = computeSettlement(基准输入, 满骰());
  const p = assembleSettlementPanel(c, 假AI, 假快照 as any);

  it('被 <Settlement Beautification> 包裹', () => {
    expect(p.trimStart().startsWith('<Settlement Beautification>')).toBe(true);
    expect(p.trimEnd().endsWith('</Settlement Beautification>')).toBe(true);
  });

  it('含全部 ## 行', () => {
    for (const k of ['## 最终评价:', '## 评价倍率:', '## CR态度:', '## CR奖励倍率:', '## 位阶修正:',
      '## 基础EXP汇总:', '## 基础UP汇总:', '## 最终EXP:', '## 最终UP:', '## RP获得:', '## 当前RP余额:',
      '## 军衔状态:', '## PEXP获得:', '## 当前PEXP:', '## 职业进度:', '## 称号获得:', '## 称号效果:',
      '## 称号选择:', '## 掉落清单:', '## 副本成就已达成:', '## 副本成就未达成:', '## 隐藏任务公示:',
      '## CR变动:', '## 更新后CR:', '## 回廊态度:', '## 史诗记录:', '## 副本周期:', '## 现实时间:']) {
      expect(p).toContain(k);
    }
    expect(p).toContain('<基础结算奖励>');
    expect(p).toContain('<特殊结算奖励>');
  });

  it('数字来自 computed 而不是 AI', () => {
    expect(p).toContain('## 最终EXP: 900');
    expect(p).toContain('## 位阶修正: ×3');
    expect(p).toContain('## CR奖励倍率: ×150%');
  });

  it('当前RP余额 = 旧余额 + 本次获得', () => {
    expect(p).toContain('## 当前RP余额: ' + (40 + c.RP));
  });

  it('CR 为 0 时显示「不变」而不是 +0', () => {
    const r = computeSettlement({ ...基准输入, 评价等级: 'B' }, 满骰());
    expect(assembleSettlementPanel(r, 假AI, 假快照 as any)).toContain('## CR变动: 不变');
  });

  it('称号行在非 A/S 级时留空', () => {
    const r = computeSettlement({ ...基准输入, 评价等级: 'C' }, 满骰());
    const p2 = assembleSettlementPanel(r, { ...假AI, 称号: null } as any, 假快照 as any);
    expect(p2).not.toContain('## 称号获得: 血夜行者');
  });

  it('末尾列出结算后流程的两个选项', () => {
    expect(p).toContain('休息周期');
    expect(p).toContain('50 UP/天');
  });
});

describe('buildSettlementWrites', () => {
  const c = computeSettlement(基准输入, 满骰());
  const w = buildSettlementWrites(c, 假AI, 假快照 as any);
  const 取 = (路径: string[]) => w.find(x => x.路径.join('.') === 路径.join('.'))?.值;

  it('四个增量是「旧值 + 增量」而不是增量本身', () => {
    expect(取(['头部', 'EXP_当前'])).toBe(0 + c.最终EXP);
    expect(取(['经济', 'UP'])).toBe(0 + c.最终UP);
    expect(取(['头部', 'RP_当前'])).toBe(40 + c.RP);
    expect(取(['职业', 'PEXP_当前'])).toBe(100 + c.PEXP);
  });

  it('队友拿到与玩家完全相同的 EXP / UP', () => {
    expect(取(['小队', '成员', '阿澈', '头部', 'EXP_当前'])).toBe(0 + c.最终EXP);
    expect(取(['小队', '成员', '阿澈', '背包', '现金UP', '数量'])).toBe(0 + c.最终UP);
  });

  it('清空与清零', () => {
    for (const k of ['其他契约者', '副本角色', '其他契约者名单', '固有角色名单']) {
      expect(取([k])).toEqual({});
    }
    expect(取(['当前副本元数据', '副本名称'])).toBe('未生成');
    expect(取(['当前副本任务', '主线任务', '名称'])).toBe('无');
  });

  it('副本经历写入「副本名 → {评价等级, 简要说明}」', () => {
    expect(取(['副本经历', '血色黎明'])).toEqual({ 评价等级: 'S', 简要说明: '他在血雨里站成了碑。' });
  });

  it('称号只写「备用称号（只记录不生效）」, 绝不碰「当前称号」', () => {
    expect(取(['头部', '称号', '备用称号（只记录不生效）'])).toEqual(假AI.称号);
    expect(w.some(x => x.路径.join('.') === '头部.称号.当前称号')).toBe(false);
  });

  it('只允许写这三个 *_当前, 其余一律不出现', () => {
    const 允许 = new Set(['EXP_当前', 'RP_当前', 'PEXP_当前']);
    const 坏键 = ['实际', '加成', '属性修正值', 'HP_最大', 'MP_最大', '耐力_最大', '防御', '闪避值',
      '移动距离', '负重_上限', 'HP_当前', 'MP_当前', '耐力_当前',
      'EXP_升级所需', 'RP_下一级', 'PEXP_升级所需', '职业等级', '军衔'];
    for (const x of w) {
      for (const k of x.路径) {
        expect(坏键).not.toContain(k);
        if (k.endsWith('_当前')) expect(允许.has(k)).toBe(true);
      }
    }
  });

  it('掉落物品写进背包', () => {
    expect(取(['背包', '血刃', '数量'])).toBe(1);
    expect(取(['背包', '血刃', '描述'])).toContain('金色');
  });
});
```

⚠️ 测试里的 `假快照` **必须与 `SettlementSnapshot` 接口逐字对应**（多一个字段少一个字段都不行 ——
`readSettlementSnapshot` 会按它组装，字段名不一致会让 store 拿到 `undefined` 而单测照样绿）。
写完后**把接口与 fixture 并排比一遍**，在报告里说明你比过。

- [ ] **Step 2: 运行确认失败** → `assembleSettlementPanel is not a function`

- [ ] **Step 3: 实现**

**`SettlementSnapshot`**（store 从 MVU 变量里摘出来的只读视图，纯函数不去碰 MVU）：

```ts
export interface SettlementSnapshot {
  副本名称: string;
  当前EXP: number;
  当前UP: number;
  当前RP: number;
  当前PEXP: number;
  军衔: string;
  职业等级: number;
  PEXP_升级所需: number;
  当前CR: number;
  当前现实时间: string;
  /**
   * 任务名 → 该任务的 `奖励` 原文。**汇总基础奖励 只认这张表**。
   * 必须包含主线（键名固定为 `主线`）、全部支线、全部隐藏任务、全部成就
   * —— 由 `readSettlementSnapshot` 从 `当前副本任务` 的四个容器摊平而来。
   * 世界事件**不放进来**（它的 `奖励` 字段存的是「影响」文本, 不是数值）。
   */
  任务奖励: Record<string, string>;
  /**
   * 背包里**已有**物品的数量（物品名 → 数量）。
   * ⚠️ 掉落写入必须**累加**到它上面, 不能覆盖 —— 否则玩家原有的同名物品会被结算冲掉。
   */
  已有背包: Record<string, number>;
  /**
   * 当前副本任务里的**全部**成就（含未达成的）—— 规则第九步要求公示「本次错过的成就达成条件」。
   * 已达成与否由面板拿 `ai.达成的成就` 的名单去比对（不读变量的 `状态` 字段, 口径与 汇总基础奖励 一致）。
   */
  成就清单: { 名称: string; 说明: string; 难度: string; 奖励: string }[];
  /** 当前副本任务里的**全部**隐藏任务（含未触发的）—— 同上, 已完否由 `ai.完成的隐藏任务` 比对 */
  隐藏任务清单: { 名称: string; 说明: string; 奖励: string }[];
  小队成员: { 名称: string; 当前EXP: number; 当前UP: number }[];
}
```

**`汇总基础奖励(快照, ai)`** —— 决定「哪些任务的奖励计入结算」：

```
计入 = 快照.任务奖励['主线']
     + 快照.任务奖励[ai.完成的支线 里的每一个]
     + 快照.任务奖励[ai.完成的隐藏任务 里的每一个]
     + 快照.任务奖励[ai.达成的成就 里的每一个]
返回 { EXP: Σ解析(...).EXP, UP: Σ解析(...).UP, 未找到: string[] }
```

- `未找到` = AI 报告了、但 `快照.任务奖励` 里没有的键名（**不抛错，列出来**，由调用方在面板/提示里展示）
- 任何一条**存在**的奖励文本解析失败 → **抛错**（`parseRewardText` 已经会抛），
  错误信息里带上任务名便于定位：`rethrow as '任务「X」的奖励文本无法解析: ...'`

**`assembleSettlementPanel`** —— 严格按规则原文的 `<Settlement Beautification>` 逐行输出。
两个 `<基础结算奖励>` / `<特殊结算奖励>` 子块、**每一行都是 `## 名称: 值`**。
数值一律取 `computed`；`## 军衔状态` / `## 当前PEXP` / `## 职业进度` 是照抄 `快照`。

⚠️ **`## 最终评价:` 的格式是 `[评价等级]+[资格分（）]`**，即形如 `## 最终评价: S+185`（括号是规则原文的占位符，**不要**输出字面的 `（）`）。**若你有别的读法，先在报告里说明再实现。**

`## CR变动` 为 0 时输出 `不变`，否则输出带符号的 `+0.5` / `-0.5`。
`## 评价倍率` 输出 `×2` / `×1.5` 这类；`## CR奖励倍率` 输出百分数 `×150%`；`## 位阶修正` 输出 `×3`。
`## 称号获得` / `## 称号效果` 在 `ai.称号` 为 null 时留空。`## 称号选择` 固定输出 `待聊天中决定`。
`## 现实时间` = `computed.新现实日期` + 原 `现实时间` 字符串（快照里带上）。
面板**末尾**追加结算后流程的两个选项（规则原文的「结算后流程」一节），
并明确写「**请在聊天中告知你的选择**」。

**`buildSettlementWrites`** —— 返回路径相对 `stat_data.契约者` 的写入清单。路径一律用**数组**（名字可能含 `「.」`）。

| 路径 | 值 |
|---|---|
| `['头部','EXP_当前']` | `快照.当前EXP + c.最终EXP` |
| `['经济','UP']` | `快照.当前UP + c.最终UP` |
| `['头部','RP_当前']` | `快照.当前RP + c.RP` |
| `['职业','PEXP_当前']` | `快照.当前PEXP + c.PEXP` |
| `['资格分']` | `c.新资格分` |
| `['头部','CR']` | `c.更新后CR` |
| `['头部','回廊态度']` | `c.更新后回廊态度` |
| `['赛季信息','当前副本周期']` | `c.新周期` |
| `['当前时间','现实日期']` | `c.新现实日期`（**为空串时整条跳过**，并在面板里说明） |
| `['副本经历', 快照.副本名称]` | `{ 评价等级: c.评价等级, 简要说明: ai.史诗记录 }` |
| `['头部','称号','备用称号（只记录不生效）']` | `ai.称号 ?? { 名称:'无', 效果:{} }` |
| 每个小队成员 | `['小队','成员',名,'头部','EXP_当前']` = `该成员当前EXP + c.最终EXP`；`['小队','成员',名,'背包','现金UP','数量']` = `该成员当前UP + c.最终UP` |
| 每个掉落 | **先按物品名聚合**（同名掉落数量相加），然后 `['背包', 名, '数量']` = **`快照.已有背包[名] ?? 0` + 聚合后的数量**（**累加，不是覆盖** —— 覆盖会冲掉玩家原有的同名物品）；`['背包', 名, '描述']` = `` `${品质}｜${属性}｜${效果}` `` |
| `['其他契约者']` / `['副本角色']` / `['其他契约者名单']` / `['固有角色名单']` | `{}` |
| `['当前副本元数据','副本名称'\|'副本来源'\|'副本类型'\|'时间限制']` | `'未生成'`；`['当前副本元数据','基准等级']` = `1` |
| `['当前副本任务','主线任务','名称'\|'说明'\|'奖励']` | `'无'`；`['当前副本任务','主线任务','状态']` = `'进行中'`；其余四类 = `{}` |

**绝不写**：`称号.当前称号`、`头部.EXP_升级所需`、`头部.军衔`、`头部.RP_下一级`、`职业.PEXP_升级所需`、`职业.职业等级`、任何 `衍生属性.*` / `属性.*`。

- [ ] **Step 4: 运行确认通过**

- [ ] **Step 5: 构建 / 全量测试 / tsc** → 同前

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/settlementRules.ts src/wxhl-003/__tests__/settlementRules.test.ts
git commit -m "feat(wxhl): 副本结算的面板拼装与写入清单"
```

---

### Task 4: 结算 prompt

**Files:**
- Create: `src/wxhl-003/settlementGen.ts`
- Test: `src/wxhl-003/__tests__/settlementGen.test.ts`

**Interfaces:**
- Consumes: `data.ts` 的 `SETTLEMENT_RULES`
- Produces: `function buildSettlementPrompt(变量快照文本: string, 聊天记录: string, worldbookText: string): string`

- [ ] **Step 1: 写失败测试**

```ts
import { describe, expect, it } from 'vitest';
import { buildSettlementPrompt } from '../settlementGen';

describe('buildSettlementPrompt', () => {
  const p = buildSettlementPrompt('契约者: 刘林', '[玩家]: 打完了', '世界书内容');

  it('内联了规则原文', () => {
    expect(p).toContain('副本结算');
    expect(p).toContain('第一步_评价判定');
    expect(p).toContain('第十一步_副本经历与面板更新');
  });

  it('带【优先级声明】, 明确禁止输出结算面板', () => {
    expect(p).toContain('不适用于本次生成');
    expect(p).toContain('Settlement Beautification');
    expect(p).toContain('严禁');
  });

  it('点名了 JSON 的每个字段', () => {
    for (const k of ['评价等级', '击杀', '濒死次数', '副本天数', '完成的支线',
      '完成的隐藏任务', '达成的成就', '职业专属支线条数', '天赋试炼次数', '掉落物品', '称号', '史诗记录']) {
      expect(p).toContain(k);
    }
  });

  it('三条硬要求点名', () => {
    expect(p).toContain('不要计算');          // AI 不许算数
    expect(p).toContain('逐字一致');          // 完成的支线必须用变量里的键名
    expect(p).toContain('数值由系统计算');     // 倍率/汇总由模块算
  });

  it('带上玩家数据与聊天记录', () => {
    expect(p).toContain('契约者: 刘林');
    expect(p).toContain('[玩家]: 打完了');
    expect(p).toContain('世界书内容');
  });
});
```

- [ ] **Step 2: 运行确认失败** → `Failed to resolve import "../settlementGen"`

- [ ] **Step 3: 实现**

`buildSettlementPrompt` 的结构（照 `dungeonGen.ts:buildEnemyPrompt` 的写法）：

```
============ 任务 ============
为本次副本做结算。你只做「判定」与「写文案」, 一切算术由系统完成。

============ 规则原文 ============
${SETTLEMENT_RULES}

============ 输出格式（只回 JSON） ============
【优先级声明】上文规则原文的「结算格式：必须被 <Settlement Beautification> 包含」那一整节
是给跑团 GM 用的, **不适用于本次生成** —— 结算画面由系统在收到你的 JSON 后另行拼装。
本次生成只按下面的 JSON 要求输出, 两处要求冲突时以本节为准。
**严禁**在 JSON 前后输出任何 <Settlement Beautification> 面板或结算画面, 那会导致解析失败、整次结算白跑。

只返回一个 JSON 对象, 不要 markdown 代码块, 不要任何解释文字。结构如下:
{ ...与 SettlementGenResultSchema 逐字对应的示例... }

- 【不要计算】严禁输出任何算术结果(最终EXP/最终UP/RP/PEXP/倍率/资格分)—— 那些数值由系统计算。
  你只负责判定与文案。你算的数会被丢弃, 且会让系统无法判断你是否理解了任务。
- 【逐字一致】「完成的支线」「完成的隐藏任务」「达成的成就」里的名字, 必须与下面变量快照里的键名**逐字一致**。
  不确定的宁可不填, 也不要写近似的名字。
- 【评价等级】按规则原文第一步的判据给出 S/A/B/C/D。**若主线失败, 填 "F"** —— 系统会据此中止结算。
- 【掉落物品】严格按 <装备与消耗品系统> 生成名称/品质/属性/效果, 并考虑第八步的 CR 掉落加成。
- 【称号】仅当评价为 A 或 S 时给出; 否则填 null。
- 【副本天数】从变量快照的 当前时间.副本日期 与聊天记录中读出。

============ 变量快照 ============
${变量快照文本}

============ 聊天记录 ============
${聊天记录 || '（未读取到聊天记录）'}

============ 世界观/规则参考 ============
${worldbookText || '（无世界书内容）'}
```

- [ ] **Step 4: 运行确认通过**
- [ ] **Step 5: 构建 / 全量测试 / tsc** → 同前
- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/settlementGen.ts src/wxhl-003/__tests__/settlementGen.test.ts
git commit -m "feat(wxhl): 副本结算 prompt（含优先级声明, 禁止 AI 输出结算面板）"
```

---

### Task 5: store 接线 + 主页面视图

**Files:**
- Modify: `src/wxhl-003/store.ts`（新增 `useSettlementStore`）
- Modify: `src/wxhl-003/App.vue`（主页面图标 + 视图）

**Interfaces:**
- Consumes: Task 1–S4 的全部导出
- Produces: store 的 `settlement` / `generating` / `writing` / `lastError` / `generateSettlement()` / `writeSettlement()` / `reset()`

- [ ] **Step 1: store —— 读快照**

新增一个纯读取函数（放在 `useSettlementStore` 之前的模块作用域，便于复用）：

```ts
/** 从 stat_data 里摘出结算需要的只读快照 */
function readSettlementSnapshot(): SettlementSnapshot | null
```

按 `readPlayerBrief()` 同款的楼层探测（`getCurrentMessageId` → `-1` 回退），读 `契约者`：
`当前副本元数据.副本名称`、`头部.EXP_当前`、`经济.UP`、`头部.RP_当前`、`职业.PEXP_当前`、
`头部.军衔`、`职业.职业等级`、`职业.PEXP_升级所需`、`头部.CR`、`当前时间.现实时间`、
`小队.成员` 每个成员的 `头部.EXP_当前` 与 `背包['现金UP'].数量`。
读不到 `契约者` 时返回 `null`。

**`任务奖励` 的摊平规则**（这一步极易写错，逐条照做）：

| 来源 | 键名 |
|---|---|
| `当前副本任务.主线任务` | 固定用 **`'主线'`** 作键（主线没有名字可当键） |
| `当前副本任务.支线任务` | 用容器里的**键名原文** |
| `当前副本任务.隐藏任务` | 同上 |
| `当前副本任务.副本成就` | 同上 |
| `当前副本任务.世界事件` | **不摊平**（它的 `奖励` 存的是「影响」文本，不是数值） |

值一律取该条目的 `奖励` 字段原文。容器不存在或为空时跳过（不抛错）。

- [ ] **Step 2: store —— `generateSettlement()`**

参照既有 `generate()` 写：
1. 守卫 `if (generating.value) return`
2. `快照 = readSettlementSnapshot()`；为 `null` → `lastError = '读取不到契约者数据'`
3. **`快照.副本名称` 为空或 `'未生成'`** → `lastError = '当前没有进行中的副本'`，return
4. 读主线状态：`当前副本任务.主线任务.状态 === '失败'` → `lastError = '主线失败 = 抹杀，不进入结算流程'`，**不调 AI**，return
5. API 配置守卫（与 `generate()` 逐字同款）
6. 组装变量快照文本（`当前副本元数据` / `当前副本任务` / `其他契约者名单` / `固有角色名单` / `副本角色` 的名称列表 / 玩家 `头部` + `职业` + `经济` 的 JSON）
7. `const wb = await getForumStore().getWorldbookContent()`
8. `const prompt = buildSettlementPrompt(文本, readRecentChat(30), wb)`
9. `aiGenerate(cfg, prompt, { name: 'dungeon_settlement', value: JSON.parse(JSON.stringify(z.toJSONSchema(SettlementGenResultSchema, { io: 'input' }))) })`
10. `SettlementGenResultSchema.parse(extractJSON(raw))`
11. **`if (parsed.评价等级 === 'F')` → `lastError = '主线失败 = 抹杀，不进入结算流程'`**，return（不产出画面）
12. `const 基础 = 汇总基础奖励(快照, parsed)` —— **纯函数，Task 3 已实现并测试**。
    **任何一条奖励文本解析失败都会 throw**（由 catch 接住 → `toastr.error`），不静默当 0。
    `基础.未找到` 非空时，在 `lastError` 里如实列出「变量中未找到这些任务：…」（**不阻断结算**，但让玩家看见）
13. `const computed = computeSettlement({ ...从快照与 parsed 组装..., 基础EXP汇总: 基础.EXP, 基础UP汇总: 基础.UP }, rollDie)`
14. `panelText = assembleSettlementPanel(computed, parsed, 快照)`
15. 把 `{ 快照, computed, ai: parsed, 面板: panelText }` 存进 ref

- [ ] **Step 3: store —— `writeSettlement()`**

参照 `writeToSave` + 敌人生成的 `writeEnemies`：
1. 没有预览结果 → `lastError = '请先结算'`
2. `await waitGlobalInitialized('Mvu')` → 楼层探测
3. `const writes = buildSettlementWrites(computed, ai, 快照)`
4. `mvu = Mvu.getMvuData(...)`；`for (const w of writes) _.set(mvu, ['stat_data','契约者', ...w.路径], w.值)`
5. `await Mvu.replaceMvuData(...)`
6. **回读校验**：逐条 `_.get(after, ['stat_data','契约者', ...w.路径]) === undefined` → 抛错（数组路径，与既有同款）
7. 成功后清掉预览（`settlement.value = null`）—— 结算是一次性的
8. `toastr.success('副本结算已写入')`

**UI 互斥**：`writing` 期间禁用「重算」与「确认结算」，并禁用主页面图标与视图切换（照敌人生成的做法）。

- [ ] **Step 4: App.vue —— 主页面图标**

在 `app-grid` 里追加一个（放在「副本生成」之后）：

```html
<div class="app-icon-wrapper" @click="openSettlement"><div class="app-icon settlement-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M6 3h12v18l-6-4-6 4V3z"/><path d="M9 8h6M9 12h4"/></svg></div><span class="app-label">副本结算</span></div>
```

`currentView` 的类型联合加 `'settlement'`；加 `openSettlement()`（与 `openDungeonRoll` 同款，含 `lastError` 清空）。

- [ ] **Step 5: App.vue —— 视图**

新增 `<div v-if="currentView==='settlement'" class="app-page">`，含：
- 返回按钮（照既有视图的返回写法）
- `lastError` 显示位
- **没有预览时**：「副本结算」按钮（`:disabled="settlementStore.generating"`）+ 一行说明「结算会读取当前副本的任务与奖励、并读取聊天记录判定完成情况」
- **有预览时**：`<pre>` 展示 `panelText`（`white-space: pre-wrap` + `word-break: break-all`）、「复制面板文本」按钮、「重算」按钮、**「确认结算」按钮**（`:disabled="settlementStore.writing"`）+ 一行醒目提示「确认后会写入存档并清空副本资料，不可撤销」

**`.vue` 无类型检查 —— 逐行自查**：新增标识符全部有定义、标签开闭配对、`--text-dim` 零出现、没动无关区域（含状态栏）。

- [ ] **Step 6: 构建 / 全量测试 / tsc / 自查**

Run: `pnpm build && pnpm test && pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: 构建成功；测试全绿；错误数仍 **10**

- [ ] **Step 7: 提交**

```bash
git add src/wxhl-003/store.ts src/wxhl-003/App.vue
git commit -m "feat(wxhl): 主页面新增副本结算模块"
```

---

## 完成标准

1. `pnpm test` 全绿、`pnpm build` 成功、`tsc --noEmit` 仍 **10** 条既存错误
2. 主页面出现「副本结算」图标，点进去可用
3. 点「副本结算」→ 出结算画面（可重算）→ 点「确认结算」→ 写存档 + 回读校验
4. **面板上的每一个数字都来自模块**，AI 的 JSON 里没有任何算术结果
5. 存档里**不该出现** `属性.*` / `衍生属性.*` / `称号.当前称号` / `军衔` / `EXP_升级所需` / `RP_下一级` / `职业等级` / `PEXP_升级所需`
6. 主线失败时**不结算**、不调 AI、不写任何变量
7. 奖励文本格式非法时**明确报错**，不静默当 0

## 验证方式

`settlementRules.ts` 的解析、算术、面板、写入清单**全部由单测覆盖**。
**AI 实际判定质量与写入后的存档正确性只能靠用户在酒馆里验收** —— 交付时给清单：
打一次副本 → 点结算 → 核对画面数字（尤其倍率乘算）→ 确认 → 读存档核对四个增量/CR/资格分/周期/现实日期/副本资料已清空/队友也拿到 EXP 与「现金UP」→ 再点一次应提示「没有进行中的副本」。

## 已知取舍（交付时向用户说明）

- **依赖奖励文本格式**：变量里存的是文本，模块只能解析。格式非法时选择明确报错而不是当 0 —— 让问题可见。
- **完成与否以 AI 报告为准**，不读变量 `状态` 字段。AI 漏报会少算奖励，玩家可在画面上看到逐项来源并「重算」。
- **`## 职业进度` 与 `## 军衔状态` 是照抄现有字段**，模块不算 —— 它们由前端脚本维护。前端若没维护会显示 0 / 旧值。
- **不做结算后流程**（休息周期 / 花 UP 延长滞留），画面末尾列出两个选项交给聊天。
