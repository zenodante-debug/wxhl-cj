# 副本生成 · 队友来源 / EJS 动态事件 / 晋升试炼 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 wxhl-003 的副本生成模块加上「队友来源锚定」「EJS 动态事件注入（最高优先级）」「晋升试炼支线」三件事，并保证不开事件开关的玩家行为不变。

**Architecture:** 全部逻辑落在**纯函数**里（`dice.ts` / `dungeonRules.ts` / `dungeonGen.ts` / 新增 `dungeonEvents.ts`），酒馆接口（`EjsTemplate` / `getWorldbook`）只经 `store.ts` 一层接线注入，因此不装插件也能单测。EJS 控制器用**我们自己的只读 `getwi` 顶替**插件那个，从而拿到「触发了哪些条目名」的精确清单且无副作用。

**Tech Stack:** TypeScript · Vue 3 `<script setup>` · Pinia · zod 4 · vitest（`pnpm vitest run`）

**Spec:** `docs/superpowers/specs/2026-09-25-dungeon-teammates-and-ejs-events-design.md`
（规则原文：`2026-09-25-ejs-main-event-controller-verbatim.md`、`2026-09-25-ascension-trial-verbatim.md`）

## Global Constraints

- **包管理器 pnpm；测试命令 `pnpm vitest run <路径>`**（全量 `pnpm test`）。测试文件放 `src/wxhl-003/__tests__/*.test.ts`。
- **纯函数优先**：`dice.ts` / `dungeonRules.ts` / `dungeonGen.ts` / `dungeonEvents.ts` 一律不碰酒馆接口、不 import store。酒馆接口只出现在 `store.ts`。
- **绝不静默吞错**：格式非法要抛错（`parseRewardText`）、渲染失败要给出 `跳过原因`（`dungeonEvents`）。本项目的既有口径是「宁可难看也不圆上」。
- **zod 4**，用 `.prefault(...)`，不用 `.default(...)`；不用 `z.passthrough` / `z.strict`。
- **中文命名**沿用现有风格（字段名、函数名、注释）。
- **`build.队友标签` 与 `build.核心特色标签` 是两颗独立的 1d50**，任何代码都不得让它们互相关联。
- **事件只在它实际点到的地方有权威**（spec §三）。事件没提到的字段，骰值 / 自选 / 匹配池照常生效。
- **多条事件互相矛盾时不写任何裁决条款**（spec §三，用户拍板）。**不要"好心"补规则。**
- **`App.vue` 的「支线任务 ×3」保持写死** —— 条数仍是 3（晋升试炼替换第 3 条，不开第 4 条）。
- **类型闸门是 `tsc --noEmit`，不是 vitest。**（2026-09-25 实测补记）`vitest.config.ts` 没开 typecheck，
  且 `ts-loader` 三个 rule 全是 `transpileOnly: true` —— **vitest 与 webpack 都不查类型**。
  所以任何改到接口 / 必填字段的任务，收尾必须跑 `pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"`，
  其值应**等于本任务开始前的基线**（本次改动前的全仓基线是 **44** 条既有错误；Task 1 结束后仍是 44）。
  **绝不要**指望 vitest 用红色告诉你类型坏了 —— 它不会。

### 本计划对 spec 的两处实现细化（不改变任何行为，仅落地方式）

1. **`buildDungeonPrompt` 只加一个可选参数**，不是 spec §九 写的「新增参数（队友标签、同人契约者、动态事件段、晋升试炼段）」四个。原因：它现在已有 10 个位置参数，再加 3 个会到 13 个。改为在末尾加**一个**分组对象：
   ```ts
   附加?: {
     同人契约者?: { 开关: boolean; 性别: string };
     动态事件段?: string;
     晋升试炼?: boolean;
   }
   ```
   **`队友标签` 不进参数** —— 它在 `build.队友标签` 里，函数直接读 `build`。
2. **`晋升奖励前缀` 常量放 `dice.ts`，不放 `dungeonRules.ts`**（spec §七.2 写的是后者）。原因：它是「奖励文本格式」的一半，另一半 `composeRewardText` 就在 `dice.ts`；放那儿还能避免 `settlementRules.ts` 反向依赖 `dungeonRules.ts`。

## Review Focus

5 条最可能咬到人的输入 / 失效模式，各自的测试落在括号里的任务：

1. **玩家没装「提示词模板语法」插件**（`typeof EjsTemplate === 'undefined'`）→ 期望：整节静默跳过、界面一句提示、**生成照常完成**，绝不抛错中断。（Task 4 / Task 6）
2. **控制器渲染超时或抛错**（模板里有死循环、或某个 `getwi` 目标不存在）→ 期望：同上，且 `缺失` 名单如实列出引用了但找不到的条目名。（Task 4）
3. **AI 不回 `事件点名角色` 字段**（老 API / 模型偷懒）→ 期望：`.prefault([])` 兜住，缺席名单为空，**不误报**。（Task 3）
4. **晋升奖励文本里带数字**（`等级上限+20，+3自由属性点`）→ 期望：`parseRewardText` 认前缀返回零奖励，**绝不把 `20` 当成 UP 或把 `3` 当成 RP**。（Task 2）
5. **CR=5 的边界** → 期望：落进「榜单匹配池」那一侧（与 `buildMatchPool` 的 `cr <= 4` 一致），**不落缝**。（Task 7）

---

## 前置：建分支

当前在 `master`（默认分支），先开分支再动代码。

```bash
git checkout -b feat/dungeon-teammates-and-events
```

---

### Task 1: 队友标签骰（`dice.ts`）

**Files:**
- Modify: `src/wxhl-003/dice.ts`（`BuildRoll` 接口、`rollBuild`、`BuildOverrides`、`applyBuildOverrides`）
- Test: `src/wxhl-003/__tests__/dice.test.ts`

**Interfaces:**
- Consumes: 现有 `FEATURE_TAGS`、`rollDie`、`indexInTable`、`markRecordSelfPick`
- Produces:
  - `BuildRoll.队友标签: string`（`FEATURE_TAGS` 里的原值）
  - `BuildRoll.队友标签骰: number`（1~50）
  - `BuildOverrides.队友标签?: string`

- [ ] **Step 1: 写失败的测试**

追加到 `src/wxhl-003/__tests__/dice.test.ts` 末尾（`describe` 内部，与现有用例同级）。若文件里没 import `applyBuildOverrides`，在顶部 import 里补上：

```ts
  it('rollBuild 产出「队友标签」骰, 值落在 FEATURE_TAGS 内', () => {
    const { build, records } = rollBuild(5, '一阶');
    expect(FEATURE_TAGS).toContain(build.队友标签);
    expect(build.队友标签骰).toBeGreaterThanOrEqual(1);
    expect(build.队友标签骰).toBeLessThanOrEqual(50);
    expect(build.队友标签).toBe(FEATURE_TAGS[build.队友标签骰 - 1]);
    const rec = records.find(r => r.标签 === '队友标签')!;
    expect(rec.表达式).toBe('1d50');
    expect(rec.映射).toBe(build.队友标签);
  });

  it('新手副本也投队友标签骰', () => {
    // 规则里新手副本的队友本就是「来自随机世界观的 IP 角色」, 这颗骰把「随机世界观」具体化
    const { build, records } = rollBuild(1, '一阶');
    expect(build.是新手副本).toBe(true);
    expect(records.some(r => r.标签 === '队友标签')).toBe(true);
  });

  it('覆盖核心特色标签不会改动队友标签（两颗骰互不相干）', () => {
    const { build, records } = rollBuild(5, '一阶');
    const { build: b2 } = applyBuildOverrides(build, records, { 核心特色标签: '赛博朋克/矩阵空间' });
    expect(b2.队友标签).toBe(build.队友标签);
    expect(b2.队友标签骰).toBe(build.队友标签骰);
  });

  it('队友标签可被自选覆盖, 并记为「自选」', () => {
    const { build, records } = rollBuild(5, '一阶');
    const { build: b2, records: r2 } = applyBuildOverrides(build, records, { 队友标签: '赛博朋克/矩阵空间' });
    expect(b2.队友标签).toBe('赛博朋克/矩阵空间');
    const rec = r2.find(r => r.标签 === '队友标签')!;
    expect(rec.表达式).toBe('自选');
    expect(rec.映射).toBe('赛博朋克/矩阵空间');
  });
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-003/__tests__/dice.test.ts`
Expected: FAIL —— `build.队友标签` 是 `undefined`，`records.find(r => r.标签 === '队友标签')` 返回 `undefined`（`rec.表达式` 抛 "Cannot read properties of undefined"）。

- [ ] **Step 3: 改 `BuildRoll` 接口**

在 `src/wxhl-003/dice.ts` 的 `BuildRoll` 里，`核心特色标签骰: number;` 之后插入：

```ts
  /**
   * 队友标签: **与核心特色标签互相独立**的第二颗 1d50, 只用来圈定 IP 队友的来源范围。
   * 与 `核心特色标签` 值相同是允许的（两次独立掷骰本来就可能撞上）—— 代码不得让两者产生关联。
   */
  队友标签: string;
  队友标签骰: number;
```

- [ ] **Step 4: `rollBuild` 补一次 1d50**

在 `src/wxhl-003/dice.ts` 的 `rollBuild` 里，`const 是日常副本 = 标签骰 >= 41;` **之后**（即「日常副本强制视为和平」那段之前）插入：

```ts
  // ⑤.5 队友标签 (D50) —— 与上一颗骰**互相独立**, 只用来圈 IP 队友的来源范围。
  // 新手副本也投: 规则里新手副本的队友本就是「来自随机世界观的 IP 角色」, 这颗骰把「随机」具体化。
  const 队友标签骰 = rollDie(50);
  const 队友标签 = FEATURE_TAGS[队友标签骰 - 1];
  records.push({ 标签: '队友标签', 表达式: '1d50', 骰值: 队友标签骰, 映射: 队友标签 });
```

然后在 `return { build: { ... } }` 里，`核心特色标签骰: 标签骰,` 之后加两行：

```ts
      队友标签,
      队友标签骰,
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-003/__tests__/dice.test.ts`
Expected: PASS（含新 3 条 + 原有全部用例）。

- [ ] **Step 6: `BuildOverrides` 与 `applyBuildOverrides`**

`BuildOverrides` 接口里 `核心特色标签?: string;` 之后加：

```ts
  队友标签?: string;
```

`applyBuildOverrides` 里，`if (overrides.核心特色标签 !== undefined) { ... }` 那一段**之后**、`// 按（可能被覆盖的）标签骰重算日常调和规则` **之前**插入：

```ts
  if (overrides.队友标签 !== undefined) {
    const 骰 = indexInTable(FEATURE_TAGS, overrides.队友标签, '队友标签');
    build.队友标签 = overrides.队友标签;
    build.队友标签骰 = 骰;
    records = markRecordSelfPick(records, '队友标签', 骰, overrides.队友标签);
  }
```

⚠️ **不要**把 `队友标签` 混进下面那段「重算日常调和规则」——那个只看 `核心特色标签骰`。

- [ ] **Step 7: 修三处 fixture + 跑测试**

> ⚠️ **执行补记（2026-09-25）**：本步原文写的是「dungeonGen.test.ts 会编译报错，留给 Task 5」——
> **那个前提是错的**。`vitest.config.ts` 没开 typecheck，`ts-loader` 三个 rule 全是 `transpileOnly: true`，
> 所以 vitest 与 webpack **都不查类型**：`dungeonGen.test.ts` 单跑是 18 passed 全绿。
> 类型错误只有 `pnpm exec tsc --noEmit` 看得见（改动前基线 44 条错误，全仓无 typecheck 脚本）。
>
> 因此必须**在本任务内**把三处 fixture 补齐 —— 否则类型破碎的树会静默穿过 Task 2~4。
> 三处都要补 `队友标签` 与 `队友标签骰` 两个字段：
> - `src/wxhl-003/__tests__/dungeonGen.test.ts:5`
> - `src/wxhl-003/__tests__/dice-overrides.test.ts:15`（`makeBuild()` 的返回字面量）
> - `src/wxhl-003/__tests__/dungeonRules.test.ts:7`

补的值随 fixture 语境自定（如 `队友标签: FEATURE_TAGS[0], 队友标签骰: 1`）。
`dice-overrides.test.ts` 的 `makeBuild(over)` 已有 `...over` 展开，直接加在展开之前即可。

Run: `pnpm vitest run src/wxhl-003/__tests__/dice.test.ts src/wxhl-003/__tests__/dice-overrides.test.ts src/wxhl-003/__tests__/dungeonGen.test.ts src/wxhl-003/__tests__/dungeonRules.test.ts`
Expected: PASS（全绿）。

Run: `pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: **44**（= 改动前基线；本次引入的 3 条必须全部消失）。

- [ ] **Step 8: 提交**

```bash
git add src/wxhl-003/dice.ts src/wxhl-003/__tests__/dice.test.ts
git commit -m "feat(wxhl): 副本生成新增独立的队友标签骰"
```

---

### Task 2: `parseRewardText` 识别晋升奖励前缀（**跨模块阻塞项**）

> ⚠️ 先做这个：不做的话，玩家一旦完成晋升支线，**整次结算必然抛错**（spec §七）。

**Files:**
- Modify: `src/wxhl-003/dice.ts`（只加一个导出常量）
- Modify: `src/wxhl-003/settlementRules.ts:16-36`（`parseRewardText`）
- Test: `src/wxhl-003/__tests__/settlementRules.test.ts`

**Interfaces:**
- Produces: `export const 晋升奖励前缀 = '【晋升试炼】'`（`dice.ts`）
- Consumes: 无

- [ ] **Step 1: 写失败的测试**

追加到 `src/wxhl-003/__tests__/settlementRules.test.ts`：

```ts
import { parseRewardText } from '../settlementRules';
import { 晋升奖励前缀 } from '../dice';

describe('parseRewardText · 晋升试炼奖励前缀', () => {
  it('前缀开头 → 返回零奖励, 不抛错', () => {
    const 文本 = 晋升奖励前缀 + '一阶→二阶: 等级上限+20，+3自由属性点，天赋品质强制提升1级。';
    expect(parseRewardText(文本)).toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  it('前缀相同但后缀乱写 → 仍返回零奖励（前缀即契约, 不解析后缀）', () => {
    expect(parseRewardText(晋升奖励前缀 + '随便写点什么 +20 UP')).toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  it('四阶→五阶那条也认', () => {
    expect(parseRewardText(晋升奖励前缀 + '四阶→五阶: 等级上限+20，+8自由属性点，天赋进入完全体形态。'))
      .toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  it('没把闸门放宽: 不带前缀的非法文本仍然抛错', () => {
    expect(() => parseRewardText('等级上限+20，+3自由属性点')).toThrow();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-003/__tests__/settlementRules.test.ts -t 晋升试炼奖励前缀`
Expected: FAIL —— `晋升奖励前缀` 未定义（import 失败），或（先注释掉 import 后）`parseRewardText` 抛 `奖励文本格式无法解析`。

- [ ] **Step 3: 加常量**

`src/wxhl-003/dice.ts`，紧邻 `composeRewardText` 上方加：

```ts
/**
 * 「非数值奖励」的固定前缀 —— 目前只有晋升试炼用。
 *
 * 存在的理由: 奖励文本有两种语义, `composeRewardText` 产出的是**数值**奖励
 * (`N UP + N EXP …`), 而晋升试炼的奖励是 `等级上限+20，+3自由属性点…` 这类**不可用数值表达**的东西。
 * `parseRewardText` 是严格格式的、格式不符即抛错, 因此必须有一条**明确可识别**的合法形态,
 * 否则玩家一完成晋升支线, 整次结算就会被抛错挡下。
 *
 * 放这里而不是 `dungeonRules.ts`: 它是奖励文本格式的一半, 另一半 `composeRewardText` 就在本文件;
 * 且这样 `settlementRules.ts` 不必反向依赖 `dungeonRules.ts`。
 */
export const 晋升奖励前缀 = '【晋升试炼】';
```

- [ ] **Step 4: 改 `parseRewardText`**

`src/wxhl-003/settlementRules.ts` 顶部 import 补上 `晋升奖励前缀`：

```ts
import { rollDie, 归一位阶, 晋升奖励前缀 } from './dice';
```

在 `parseRewardText` 函数体里，`if (t === '' || t === '无') return { ...空奖励 };` **之后**插入：

```ts
  // 非数值奖励（晋升试炼）: **前缀即契约, 不解析后缀** —— 它给的是「等级上限+20」这类
  // 无法用 UP/EXP 表达的东西。返回零奖励是**合法**表示「这条任务没有数值奖励」,
  // 与下面的「非法格式抛错」不冲突: 那一条针对的是**看起来像数值奖励却写坏了**的文本。
  if (t.startsWith(晋升奖励前缀)) return { ...空奖励 };
```

- [ ] **Step 5: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-003/__tests__/settlementRules.test.ts`
Expected: PASS（新 4 条 + 原有全部用例 —— 原有那批「非法格式抛错」的用例必须**仍然绿**，这是「没放宽闸门」的证据）。

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/dice.ts src/wxhl-003/settlementRules.ts src/wxhl-003/__tests__/settlementRules.test.ts
git commit -m "feat(wxhl): 结算识别晋升试炼奖励前缀, 不再整次抛错"
```

---

### Task 3: `dungeonRules.ts` —— 晋升奖励覆盖 / 事件点名 / 缺席校验

**Files:**
- Modify: `src/wxhl-003/dungeonRules.ts`
- Modify: `src/wxhl-003/store.ts`（**仅为让类型闸门回基线**，见 Step 8）
- Test: `src/wxhl-003/__tests__/dungeonRules.test.ts`

**Interfaces:**
- Consumes: `晋升奖励前缀`（`dice.ts`，Task 2）
- Produces:
  - `export const 晋升奖励表: readonly string[]`（4 条，下标 = `归一位阶` 的返回值 0..3）
  - `PlayerBrief.晋升试炼: boolean`
  - `DungeonGenResultSchema` 新增字段 `事件点名角色: string[]`（缺省 `[]`）
  - `export function 点名缺席者(result: DungeonGenResult): string[]`

- [ ] **Step 1: 写失败的测试**

追加到 `src/wxhl-003/__tests__/dungeonRules.test.ts`：

> ⚠️ **执行补记（2026-09-25）**：本步原文的测试用了 `Object.values(v.支线任务)[2]` —— **那是错的**。
> `mapToVariables` 的返回是**嵌套**的（`{ 当前副本元数据, 当前副本任务: { 主线任务, 支线任务, … } }`），
> `v.支线任务` 恒为 `undefined`，三处断言永远不可能变绿（`v` 是 `any`，所以 tsc 也不会报）。
> 正确路径是 `v.当前副本任务.支线任务`。已就地修正。
>
> 另：同文件两个**共享 fixture**（`build: BuildRoll` 与 `player: PlayerBrief`-like 字面量）
> 在 Step 3/4 之后会缺 `事件点名角色` 与 `晋升试炼` 字段（`DungeonGenResult` / `PlayerBrief` 的
> **输出**类型都是必填，`.prefault` 只影响输入类型）。补上它们才能让 `tsc` 回 44。

```ts
import { 点名缺席者, 晋升奖励表, DungeonGenResultSchema, mapToVariables, type DungeonGenResult } from '../dungeonRules';
import { 晋升奖励前缀 } from '../dice';

const 最小结果 = (over: Partial<DungeonGenResult> = {}) =>
  DungeonGenResultSchema.parse({
    副本名称: '血色黎明', 副本来源: '《某作品》（动漫作品）', 副本背景: '…',
    主线任务: { 名称: '主线', 说明: '…' },
    支线任务: [
      { 名称: '支线甲', 说明: '…', 物品名: '甲' },
      { 名称: '支线乙', 说明: '…', 物品名: '乙' },
      { 名称: '支线丙', 说明: '…', 物品名: '丙' },
    ],
    世界事件: [ { 名称: 'E1', 说明: '…', 影响: '…' }, { 名称: 'E2', 说明: '…', 影响: '…' } ],
    隐藏任务: [ { 名称: 'H1', 说明: '…', 物品名: '' }, { 名称: 'H2', 说明: '…', 物品名: '' } ],
    副本成就: ['★', '★★', '★★★', '★★★★', '★★★★★', '★★★★★★'].map((_, i) => ({
      名称: 'A' + i, 说明: '…', 难度: '…', 物品名: '',
    })),
    固有角色: [],
    其他契约者: [],
    ...over,
  });

describe('晋升试炼 · 第 3 条支线奖励覆盖', () => {
  // ⚠️ 四组奖励都要给全 —— `mapToVariables` 会按 result 的条数逐条取
  // `rewards.隐藏[i]` / `rewards.成就[i]`，给空数组会取到 `undefined` 并在 `composeRewardText` 里抛错。
  const 一条 = { up: 10, exp: 5, rp: 0, quality: '白色' as const, itemType: '消耗品' as const };
  const 假奖励 = {
    主线: { up: 1, exp: 1, rp: 0, quality: '金色' as const, itemType: '装备' as const },
    支线: [0, 1, 2].map(() => ({ ...一条 })),
    隐藏: [0, 1].map(() => ({ ...一条 })),
    成就: [0, 1, 2, 3, 4, 5].map(() => ({ ...一条 })),
  };

  it('晋升试炼=true → 第 3 条支线奖励是晋升前缀, 且不含 UP/EXP 字样', () => {
    const r = 最小结果();
    const v: any = mapToVariables(r, { 队友标签: 'x', 队友标签骰: 1 } as any, 假奖励 as any,
      { 姓名: '刘林', 等级: 20, 阶位: '一阶', CR: 3, 晋升试炼: true });
    const 第三条: any = Object.values(v.当前副本任务.支线任务)[2];
    expect(第三条.奖励.startsWith(晋升奖励前缀)).toBe(true);
    expect(第三条.奖励).not.toContain('UP');
    expect(第三条.奖励).not.toContain('EXP');
    expect(第三条.奖励).toContain('等级上限+20');
  });

  it('晋升试炼=false → 第 3 条支线走原 composeRewardText 路径', () => {
    const r = 最小结果();
    const v: any = mapToVariables(r, { 队友标签: 'x', 队友标签骰: 1 } as any, 假奖励 as any,
      { 姓名: '刘林', 等级: 11, 阶位: '一阶', CR: 3, 晋升试炼: false });
    expect(Object.values(v.支线任务)[2]).toMatchObject({ 奖励: '10 UP + 5 EXP + 【白色】消耗品：丙' });
  });

  it('四阶玩家的晋升奖励是「完全体形态」那条', () => {
    const r = 最小结果();
    const v: any = mapToVariables(r, { 队友标签: 'x', 队友标签骰: 1 } as any, 假奖励 as any,
      { 姓名: '刘林', 等级: 80, 阶位: '四阶', CR: 9, 晋升试炼: true });
    const 第三条: any = Object.values(v.当前副本任务.支线任务)[2];
    expect(第三条.奖励).toBe(晋升奖励前缀 + 晋升奖励表[3]);
  });
});

describe('点名缺席者', () => {
  it('点名人出现在其他契约者 → 不算缺席', () => {
    const r = 最小结果({ 事件点名角色: ['塞拉菲娜'], 其他契约者: [{ 真名: '塞拉菲娜', 称号: '无', 等级: 20, 阵营: '教会' }] });
    expect(点名缺席者(r)).toEqual([]);
  });

  it('点名人出现在固有角色 → 也不算缺席', () => {
    const r = 最小结果({ 事件点名角色: ['弗尔弗尔'], 固有角色: [{ 名称: '弗尔弗尔', 位阶: '一阶', 等级: 20 }] });
    expect(点名缺席者(r)).toEqual([]);
  });

  it('两边都没有 → 进缺席名单', () => {
    const r = 最小结果({ 事件点名角色: ['塞拉菲娜', '弗尔弗尔'] });
    expect(点名缺席者(r)).toEqual(['塞拉菲娜', '弗尔弗尔']);
  });

  it('事件点名角色缺省（AI 没回）→ 缺席名单为空, 不误报', () => {
    expect(点名缺席者(最小结果())).toEqual([]);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-003/__tests__/dungeonRules.test.ts`
Expected: FAIL —— `点名缺席者` / `晋升奖励表` 未导出；`PlayerBrief` 缺 `晋升试炼`；`事件点名角色` 被 schema 剥掉。

- [ ] **Step 3: 加常量与 `PlayerBrief` 字段**

`src/wxhl-003/dungeonRules.ts` 顶部 import 补 `晋升奖励前缀`：

```ts
import { composeRewardText, 晋升奖励前缀 } from './dice';
```

在 `固有角色位阶枚举` 附近加：

```ts
/**
 * 晋升试炼奖励原文（逐字照 `<晋升试炼>` 文档, 下标 = `归一位阶(阶位)` 的返回值 0..3）。
 * 五阶不在表内 —— 用户 2026-09-25 拍板「五阶 Lv.100 不触发」。
 */
export const 晋升奖励表 = [
  '一阶→二阶: 等级上限+20，+3自由属性点，天赋品质强制提升1级。',
  '二阶→三阶: 等级上限+20，+5自由属性点，天赋品质强制提升1级。',
  '三阶→四阶: 等级上限+20，+5自由属性点，天赋品质强制提升1级。',
  '四阶→五阶: 等级上限+20，+8自由属性点，天赋进入完全体形态。',
] as const;
```

`PlayerBrief` 接口加一个字段：

```ts
export interface PlayerBrief {
  姓名: string;
  等级: number;
  阶位: string;
  CR: number;
  /** 是否触发晋升试炼（等级满了当前位阶上限）。由 `readPlayerBrief` 算好, 见 store.ts */
  晋升试炼: boolean;
}
```

- [ ] **Step 4: zod schema 加 `事件点名角色`**

`DungeonGenResultSchema` 里，`其他契约者: z.array(...)` **之后**加：

```ts
  /**
   * 本次生效的动态事件**强制要求在场**的人物（真名, 逐字）。
   * 由 AI 复述 —— 事件正文是自然语言, 从散文里正则抠名字必然漏（`{{user}}`、称号、全名/简称混用）。
   * `.prefault([])`: 不开事件、或 AI 不回这个字段时都不报错。
   */
  事件点名角色: z.array(z.string()).prefault([]),
```

- [ ] **Step 5: 加 `点名缺席者` 纯函数**

在 `mapToVariables` 附近加：

```ts
/**
 * 事件点名了、但名单里找不到的人。
 *
 * 只在 `其他契约者` 与 `固有角色` **两边都找不到**时才算缺席 ——
 * 事件可能点名契约者（如塞拉菲娜、弗尔弗尔）, 也可能点名副本世界的固有角色, 两种都合法。
 *
 * **只报警、不阻断**（由 store 写进 lastError）: AI 的输出仍是最终结果,
 * 照本项目「宁可难看也不圆上」的一贯口径 —— 不静默吞掉, 也不替 AI 改名单。
 */
export function 点名缺席者(result: DungeonGenResult): string[] {
  const 在场 = new Set<string>([
    ...result.其他契约者.map(c => c.真名),
    ...result.固有角色.map(r => r.名称),
  ]);
  return result.事件点名角色.filter(名 => !在场.has(名));
}
```

- [ ] **Step 6: `mapToVariables` 覆盖第 3 条支线奖励**

`mapToVariables` 里，`const 支线任务: Record<string, unknown> = {};` 那段改为：

```ts
  // 晋升试炼: 第 3 条支线的奖励**替换**为晋升奖励原文（用户 2026-09-25 拍板「替换掉第 3 条」）。
  // 下标 2 是硬编码的 —— 契约就是「恰好 3 条」, 见 DungeonGenResultSchema 的 .length(3)。
  // 前缀由 dice.ts 定义, 结算侧 parseRewardText 靠它识别「非数值奖励」。
  const 晋升下标 = player.晋升试炼 ? 归一位阶(player.阶位) : undefined;
  const 晋升奖励 = 晋升下标 !== undefined && 晋升下标 <= 3
    ? 晋升奖励前缀 + 晋升奖励表[晋升下标]
    : undefined;

  const 支线任务: Record<string, unknown> = {};
  result.支线任务.forEach((t, i) => {
    支线任务[t.名称] = {
      说明: t.说明,
      奖励: i === 2 && 晋升奖励 ? 晋升奖励 : composeRewardText(rewards.支线[i], t.物品名),
      状态: '进行中',
    };
  });
```

`dungeonRules.ts` 顶部 import 补 `归一位阶`：

```ts
import { composeRewardText, 归一位阶, 晋升奖励前缀 } from './dice';
```

> `player.晋升试炼` 为真但阶位认不出或落在五阶时 `晋升奖励` 是 `undefined` → 退回原路径，**不抛错**。
> 触发判定本身（`readPlayerBrief`）已经保证不会出现这种组合；这里是第二道兜底。

- [ ] **Step 7: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-003/__tests__/dungeonRules.test.ts`
Expected: PASS（新 7 条 + 原有全部用例）。

- [ ] **Step 8: `store.ts` 最小改动 —— 让类型闸门回基线**

> ⚠️ **执行补记（2026-09-25，Task 2 评审的 ⚠️ 项暴露）**：本任务的 Step 3 把 `PlayerBrief.晋升试炼`
> 加成**必填**，而 `readPlayerBrief`（`store.ts`）是该类型**唯一的生产者**。不改它，`store.ts`
> 会立刻多出一条 tsc 错误，并把类型破碎的树留给 Task 4、5 —— 而 vitest 看不见类型，没有闸门会红。
> 所以**类型与它的生产者必须一起落地**：本步在 `store.ts` 补上判定。
>
> 边界：本步**只补判定**。`readPlayerBrief` 的 return 导出、`buildMatchPool` 的 export、
> 以及那两张判定表测试，仍然全部归 **Task 6**（那里是 store 接线任务）。

`src/wxhl-003/store.ts` 里，在 `useDungeonGenStore` **之外**（紧邻 `buildMatchPool` 上方）加：

```ts
/** 各阶位的等级上限（下标 = `归一位阶` 的返回值 0..3）。五阶不在表内 —— 用户 2026-09-25 拍板 Lv.100 不触发晋升试炼 */
const 晋升阶位上限 = [20, 40, 60, 80] as const;
```

在 `readPlayerBrief` 里、`const player: PlayerBrief = {` **之前**加：

```ts
      // 晋升试炼判定: 等级满了当前位阶上限。用 `>=` 而非 `==` —— 多给的经验不至于漏判。
      // 阶位认不出或为五阶（idx === 4）时一律不触发。
      const 阶位序 = 归一位阶(h.阶位);
      const 晋升试炼 = 阶位序 !== undefined && 阶位序 <= 3 && (Number(h.等级) || 1) >= 晋升阶位上限[阶位序];
```

`player` 字面量里加 `晋升试炼,`；`const 兜底 = { ... }` 里的 `player` 加 `晋升试炼: false`。

> `归一位阶` 已在 `store.ts` 的 `'./dice'` import 里，无需新增 import。

Run: `pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: **44**（= 本任务开始前的全仓基线）。

- [ ] **Step 9: 提交**

```bash
git add src/wxhl-003/dungeonRules.ts src/wxhl-003/store.ts src/wxhl-003/__tests__/dungeonRules.test.ts
git commit -m "feat(wxhl): 晋升试炼支线奖励覆盖 + 事件点名校验纯函数"
```

---

### Task 4: `dungeonEvents.ts` —— EJS 控制器渲染

**Files:**
- Create: `src/wxhl-003/dungeonEvents.ts`
- Test: `src/wxhl-003/__tests__/dungeonEvents.test.ts`

**Interfaces:**
- Consumes: 无（`evalTemplate` / `prepareContext` 是**注入**的，不 import 插件）
- Produces:
  ```ts
  export interface WorldbookEntry { 名称: string; 正文: string }
  export interface EventSection {
    段落: string;
    触发: string[];
    缺失: string[];
    跳过原因?: string;
  }
  export function findControllers(条目表: WorldbookEntry[]): WorldbookEntry[];
  export function buildEventSection(args: {
    条目表: WorldbookEntry[];
    evalTemplate: (code: string, ctx: Record<string, unknown>) => Promise<string>;
    prepareContext: () => Promise<Record<string, unknown>>;
    超时毫秒?: number;
  }): Promise<EventSection>;
  ```

- [ ] **Step 1: 写失败的测试**

创建 `src/wxhl-003/__tests__/dungeonEvents.test.ts`：

```ts
import { describe, expect, it } from 'vitest';
import { buildEventSection, findControllers, type WorldbookEntry } from '../dungeonEvents';

const 事件 = (名: string, 正文 = '正文'): WorldbookEntry => ({ 名称: 名, 正文 });

/** 一个最小可用的假控制器: 被渲染时只是把所有 getwi 的调用记下来并拼成文本 */
const 假控制器 = (名 = 'EJS/主线事件控制器'): WorldbookEntry => ({
  名称: 名,
  正文: `<% if (typeof currentWorld === 'undefined') var currentWorld = getvar('x'); _%>\n<%- await getwi('事件_甲') %>`,
});

const 假环境 = () => ({
  prepareContext: async () => ({ getvar: () => '', getwi: async () => '' }),
  evalTemplate: async (code: string, ctx: Record<string, unknown>) => {
    // 模拟控制器行为: 调用注入进来的 getwi, 把结果拼起来
    const getwi = ctx.getwi as (n: string) => Promise<string>;
    const 出: string[] = [];
    for (const m of code.matchAll(/getwi\('([^']+)'\)/g)) 出.push(await getwi(m[1]));
    return 出.join('\n');
  },
});

describe('findControllers · 控制器识别', () => {
  it('名字以 EJS/ 开头即命中', () => {
    expect(findControllers([事件('EJS/主线事件控制器', '没有 getwi')]).map(e => e.名称))
      .toEqual(['EJS/主线事件控制器']);
  });

  it('名字没前缀但正文同时含 <% 与 getwi( 也命中', () => {
    expect(findControllers([事件('随便什么名', '<% await getwi("x") %>')]).map(e => e.名称))
      .toEqual(['随便什么名']);
  });

  it('两者都不满足 → 空数组', () => {
    expect(findControllers([事件('普通条目', '就是一段设定文本')])).toEqual([]);
    expect(findControllers([事件('只有 getwi(', 'await getwi("x")')])).toEqual([]);
  });
});

describe('buildEventSection · 只留事件条目', () => {
  it('fired 里的规则条目被丢掉, 只留 事件_ 前缀', async () => {
    const 条目表 = [
      假控制器(),
      事件('副本任务规范', '规则正文'),
      事件('事件_恶魔旅团', '恶魔旅团正文'),
      事件('事件_白焰降临', '白焰降临正文'),
    ];
    const 控制器 = {
      名称: 'EJS/主线事件控制器',
      正文: `<%- await getwi('副本任务规范') %><%- await getwi('事件_恶魔旅团') %><%- await getwi('事件_白焰降临') %>`,
    };
    const r = await buildEventSection({ 条目表: [控制器, ...条目表.slice(1)], ...假环境() });
    expect(r.触发).toEqual(['事件_恶魔旅团', '事件_白焰降临']);
    expect(r.段落).toContain('恶魔旅团正文');
    expect(r.段落).toContain('白焰降临正文');
    expect(r.段落).not.toContain('规则正文');
  });

  it('段落在无事件时是空串, 且跳过原因为空（不是失败）', async () => {
    const r = await buildEventSection({ 条目表: [假控制器()], ...假环境() });
    expect(r.触发).toEqual([]);
    expect(r.段落).toBe('');
    expect(r.跳过原因).toBeUndefined();
  });
});

describe('buildEventSection · 失败一律降级不抛', () => {
  it('没有控制器 → 跳过原因非空, 不抛', async () => {
    const r = await buildEventSection({ 条目表: [事件('普通', '文本')], ...假环境() });
    expect(r.段落).toBe('');
    expect(r.跳过原因).toBeTruthy();
  });

  it('prepareContext 抛错 →同上', async () => {
    const r = await buildEventSection({
      条目表: [假控制器()],
      prepareContext: async () => { throw new Error('插件没初始化'); },
      evalTemplate: async () => '',
    });
    expect(r.段落).toBe('');
    expect(r.跳过原因).toContain('插件没初始化');
  });

  it('evalTemplate 抛错 → 同上', async () => {
    const r = await buildEventSection({
      条目表: [假控制器()],
      ...假环境(),
      evalTemplate: async () => { throw new Error('模板炸了'); },
    });
    expect(r.段落).toBe('');
    expect(r.跳过原因).toContain('模板炸了');
  });

  it('超时 → 跳过原因是超时, 不一直挂着', async () => {
    const r = await buildEventSection({
      条目表: [假控制器()],
      prepareContext: async () => ({}),
      evalTemplate: () => new Promise(() => {}),   // 永不 resolve
      超时毫秒: 30,
    });
    expect(r.段落).toBe('');
    expect(r.跳过原因).toContain('超时');
  });
});

describe('buildEventSection · 注入契约', () => {
  it('currentWorld 被强制成「副本」', async () => {
    let 见到的: Record<string, unknown> = {};
    await buildEventSection({
      条目表: [假控制器()],
      prepareContext: async () => ({ getvar: () => '回廊' }),
      evalTemplate: async (_c, ctx) => { 见到的 = ctx; return ''; },
    });
    expect(见到的.currentWorld).toBe('副本');
  });

  it('getwi 被顶替成我们的只读版本（不是插件那个）', async () => {
    const 插件原版 = async () => '插件原版';
    let 见到的: any = null;
    await buildEventSection({
      条目表: [假控制器(), 事件('事件_甲', '甲的正文')],
      prepareContext: async () => ({ getwi: 插件原版 }),
      evalTemplate: async (code, ctx) => {
        见到的 = ctx.getwi;
        const getwi = ctx.getwi as (n: string) => Promise<string>;
        for (const m of code.matchAll(/getwi\('([^']+)'\)/g)) await getwi(m[1]);
        return '';
      },
    });
    expect(见到的).not.toBe(插件原版);
    expect(await 见到的('事件_甲')).toBe('甲的正文');
  });

  it('控制器引用了条目表里没有的名字 → 记进缺失, 不阻断', async () => {
    const r2 = await buildEventSection({
      条目表: [{ 名称: 'EJS/x', 正文: `<%- await getwi('事件_不存在') %>` }],
      ...假环境(),
    });
    expect(r2.缺失).toEqual(['事件_不存在']);
    expect(r2.段落).toBe('');   // 取不到内容 ⇒ 段落仍为空
    expect(r2.跳过原因).toBeUndefined();   // 但**不是**失败 —— 没有跳过原因
  });

  it('引用的名字都在表里 → 缺失为空', async () => {
    const r = await buildEventSection({
      条目表: [
        { 名称: 'EJS/x', 正文: `<%- await getwi('事件_甲') %>` },
        事件('事件_甲', '甲的正文'),
      ],
      ...假环境(),
    });
    expect(r.缺失).toEqual([]);
    expect(r.触发).toEqual(['事件_甲']);
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-003/__tests__/dungeonEvents.test.ts`
Expected: FAIL —— `Cannot find module '../dungeonEvents'`。

- [ ] **Step 3: 写实现**

创建 `src/wxhl-003/dungeonEvents.ts`：

```ts
// ================================================================
// 副本生成 · EJS 动态事件控制器渲染
//
// 纯函数, 零酒馆依赖 —— `evalTemplate` / `prepareContext` 以参数注入
// （照 settlementRules.ts 注入 `掷` 的先例）, 因此不装插件也能单测。
// 酒馆接口只在 store.ts 出现。
// ================================================================

export interface WorldbookEntry {
  名称: string;
  正文: string;
}

export interface EventSection {
  /** 要拼进 prompt 的正文；空串 = 不注入 */
  段落: string;
  /** 本次判发生效的 事件_* 条目名（去重、保序） */
  触发: string[];
  /** 控制器引用了、但条目表里找不到的名字 */
  缺失: string[];
  /** 非空 = 整节被跳过，附原因（供界面提示）。「渲染成功但没事件」**不算跳过** */
  跳过原因?: string;
}

/** 事件条目的名前缀（实测用户卡上 18 条事件全用它） */
const 事件前缀 = '事件_';

/**
 * 找出「控制器」条目。
 *
 * 判据取**并集**（满足其一即可）:
 * - 名字以 `EJS/` 开头 —— 用户卡上的命名约定（`EJS/主线事件控制器`）;
 * - 正文同时含 `<%` 与 `getwi(` —— 该插件控制器的最小特征。
 *
 * 并集是为了以后加了第二条控制器也不会漏；实测两种判据都命中同一条。
 */
export function findControllers(条目表: WorldbookEntry[]): WorldbookEntry[] {
  return 条目表.filter(e => {
    if (e.名称.startsWith('EJS/')) return true;
    return e.正文.includes('<%') && e.正文.includes('getwi(');
  });
}

/** 段落的开头（含三条死命令）—— 逐字照 spec §五.2 */
const 段落头 = [
  '============ 本次副本的动态事件（回廊已判定生效 · 最高优先级） ============',
  '以下事件由回廊的事件控制器按你当前的赛季 / 周期 / 阶位 / 所处世界判定为【本次副本生效】。',
  '它们不是建议，是本次副本**必然牵涉**的剧情；主线任务、世界事件、支线任务必须与之相称。',
  '',
].join('\n');

const 段落尾 = [
  '',
  '【三条死命令】',
  '1. 这些事件的优先级**高于上文所有锁定骰值与自选指定**。若某个事件强制要求某个字段',
  '   （副本类型、世界观、主线任务、支线任务、副本内容），**以事件为准**，不要因为与骰值冲突就改掉事件。',
  '2. 上面**未列出**的动态事件，本次【一律不生效】—— 严禁把它们的剧情、人物、势力写进副本。',
  '3. 上面**已列出**的事件若点名了具体契约者，**「其他契约者」完全由事件接管**：',
  '   点名的人必须**全部在场、不多不少**；此时**不要**再从后文「匹配参考」抽榜单，',
  '   也**不要**再加同人契约者。事件写明了人数就以它为准',
  '   （如「整个副本仅有他们三名契约者」⇒ 恰好 3 名）。',
  '',
].join('\n');

// ⚠️ 上面这段里**没有、也绝不允许有**「多条事件矛盾怎么办」的条款。
// spec §五.2 明确写了「刻意不加的一条」: 事件互相矛盾时由 AI 自行圆场, **系统不做裁决**
// （用户 2026-09-25 拍板）。后来者不要"好心"补一句「以更具体者为准」之类的规则 —— 那会推翻这个决定。

/**
 * 渲染控制器 → 取出生效的 `事件_*` 条目 → 拼成 prompt 段落。
 *
 * **任何失败都降级为「跳过」，绝不抛**：副本生成不该因为一个渲染故障整次白跑。
 */
export async function buildEventSection(args: {
  条目表: WorldbookEntry[];
  evalTemplate: (code: string, ctx: Record<string, unknown>) => Promise<string>;
  prepareContext: () => Promise<Record<string, unknown>>;
  超时毫秒?: number;
}): Promise<EventSection> {
  const 空: EventSection = { 段落: '', 触发: [], 缺失: [] };
  const 控制器 = findControllers(args.条目表);
  if (控制器.length === 0) {
    return { ...空, 跳过原因: '世界书里没有 EJS 控制器条目' };
  }

  const 表 = new Map(args.条目表.map(e => [e.名称, e.正文]));
  const 触发: string[] = [];
  const 缺失: string[] = [];
  // 只读顶替插件的 getwi: 探针实测能顶掉（三次 run 的 shim 全为 true）。
  // 顶掉的意义有二 —— 不产生插件的副作用, 且我们能拿到**触发了哪些条目名**的精确清单。
  const 只读Getwi = async (名: string): Promise<string> => {
    触发.push(名);
    const 正文 = 表.get(名);
    if (正文 === undefined) {
      缺失.push(名);
      return '';
    }
    return 正文;
  };

  let ctx: Record<string, unknown>;
  try {
    ctx = await args.prepareContext();
  } catch (e: any) {
    return { ...空, 跳过原因: '插件环境初始化失败: ' + (e?.message ?? e) };
  }

  try {
    const 超时 = args.超时毫秒 ?? 5000;
    await Promise.race([
      Promise.all(
        控制器.map(c =>
          // currentWorld 强制成「副本」: 控制器第一行是
          // `if (typeof currentWorld === 'undefined') var currentWorld = getvar(...)`,
          // 因此在执行环境里**预置**这个键即可让守卫短路（探针实测有效）。
          args.evalTemplate(c.正文, { ...ctx, currentWorld: '副本', getwi: 只读Getwi }),
        ),
      ),
      new Promise((_, rej) => setTimeout(() => rej(new Error('控制器渲染超时')), 超时)),
    ]);
  } catch (e: any) {
    return { ...空, 缺失, 跳过原因: '控制器渲染失败: ' + (e?.message ?? e) };
  }

  // 只留事件条目、去重保序。
  //
  // ⚠️ **必须同时要求 `表.has(n)`**（执行补记 2026-09-25，原计划漏了这个条件）：
  // 控制器引用**不存在的条目**时 `getwi` 只能返回空串，那个名字属于「引用悬空」（已记进 `缺失`），
  // **不能算作本次判发生效的事件** —— 否则会拼出一个只有 `【名字】` 而正文空白的段落，
  // 对着 AI 假称事件生效了。原计划的实现正是如此，与本任务自己的测试「取不到内容 ⇒ 段落仍为空」直接矛盾。
  const 触发事件 = [...new Set(触发)].filter(n => n.startsWith(事件前缀) && 表.has(n));
  const 缺失事件 = [...new Set(缺失)];
  if (触发事件.length === 0) {
    return { 段落: '', 触发: [], 缺失: 缺失事件 };
  }

  const 正文段 = 触发事件
    .map(名 => `【${名}】\n${表.get(名) ?? ''}`)
    .join('\n\n');
  return { 段落: 段落头 + 正文段 + 段落尾, 触发: 触发事件, 缺失: 缺失事件 };
}
```

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-003/__tests__/dungeonEvents.test.ts`
Expected: PASS（**13 条** —— 原计划此处写「11 条」是陈旧数字，brief 代码里实际是 13 个 `it()`）。

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/dungeonEvents.ts src/wxhl-003/__tests__/dungeonEvents.test.ts
git commit -m "feat(wxhl): EJS 动态事件控制器渲染（纯函数 + 全失败降级）"
```

---

### Task 5: `dungeonGen.ts` —— prompt 四段文案

**Files:**
- Modify: `src/wxhl-003/dungeonGen.ts`（`buildDungeonPrompt`）
- Test: `src/wxhl-003/__tests__/dungeonGen.test.ts`（**原有 5 处调用点不用改** ——
  `附加` 是可选的，位置参数在末尾；已由 Task 5 评审确认。）

**Interfaces:**
- Consumes: `build.队友标签`（Task 1）
- Produces: `buildDungeonPrompt` 末尾新增一个可选参数 `附加`
  ```ts
  附加?: {
    同人契约者?: { 开关: boolean; 性别: string };
    动态事件段?: string;
    晋升试炼?: boolean;
  }
  ```

- [ ] **Step 1: 确认 fixture + 写失败的测试**

`src/wxhl-003/__tests__/dungeonGen.test.ts` 顶部 `const build: BuildRoll = { ... }` 里的
`队友标签` / `队友标签骰` 两个字段**已在 Task 1 补齐**（见 Task 1 Step 7 的执行补记）——
本步只**确认**它们在，然后追加下面的测试。

追加：

```ts
describe('buildDungeonPrompt · 队友来源锚定段', () => {
  const p = buildDungeonPrompt(build, records, '契约者: 刘林', '', '人榜候选…', '一阶', 11, '危机四伏');

  it('写明本次队友标签', () => {
    expect(p).toContain('赛博朋克/矩阵空间');
    expect(p).toContain('队友来源锚定');
  });

  it('写明「不得与本次副本世界观相同」', () => {
    expect(p).toContain('不得与本次副本世界观相同');
  });

  it('写明等级锚定与新手例外', () => {
    expect(p).toContain('资深契约者');
    expect(p).toContain('Lv.1 新人');
  });

  it('同人开关关闭时, 不出现「恰好 1 名同人契约者」', () => {
    const 关 = buildDungeonPrompt(build, records, '契约者: 刘林', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 同人契约者: { 开关: false, 性别: '不限' } });
    expect(关).not.toContain('恰好匹配 1 名同人契约者');

    const 开 = buildDungeonPrompt(build, records, '契约者: 刘林', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 同人契约者: { 开关: true, 性别: '女' } });
    expect(开).toContain('恰好匹配 1 名同人契约者');
    expect(开).toContain('女');
  });
});

describe('buildDungeonPrompt · 动态事件段', () => {
  it('不传事件段时, 整段不出现', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏');
    expect(p).not.toContain('本次副本的动态事件');
  });

  it('传了事件段时, 插在「回廊难度评估」之后、「契约者数据」之前', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 动态事件段: '【事件_白焰降临】\n正文在这里' });
    expect(p).toContain('正文在这里');
    expect(p.indexOf('回廊难度评估')).toBeLessThan(p.indexOf('正文在这里'));
    expect(p.indexOf('正文在这里')).toBeLessThan(p.indexOf('============ 契约者数据'));
  });

  it('事件段存在时, 锁定骰值段末尾追加「以动态事件为准」的例外', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 动态事件段: 'X' });
    expect(p).toContain('以动态事件为准');
  });

  it('事件段不存在时, 那句话一个字都不出现（不给不开事件的玩家引入松动）', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏');
    expect(p).not.toContain('以动态事件为准');
  });
});

describe('buildDungeonPrompt · 晋升试炼段', () => {
  it('触发时含「第 3 条支线必须就是【专属晋升任务】」', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 晋升试炼: true });
    expect(p).toContain('第 3 条支线任务**必须就是【专属晋升任务】');
    expect(p).toContain('不干涉淘汰赛的生存与排名规则');
  });

  it('未触发时不含该段', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏');
    expect(p).not.toContain('【专属晋升任务】');
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-003/__tests__/dungeonGen.test.ts`
Expected: FAIL —— `buildDungeonPrompt` 只接受 10 个参数，多传的第 11 个被忽略；`队友来源锚定` / `以动态事件为准` 等字符串都找不到。

- [ ] **Step 3: 加参数与三段文案**

`src/wxhl-003/dungeonGen.ts` 的 `buildDungeonPrompt` 签名末尾（`队友指定?` 之后）加：

```ts
  /**
   * 本次生成的可选附加段与开关。
   * 分组成一个对象而不是三个位置参数: 本函数已有 10 个位置参数, 再散着加会到 13 个。
   */
  附加?: {
    /** 同人契约者开关（CR≥5 时面板上可选）。关闭或缺省 ⇒ 不出现该段 */
    同人契约者?: { 开关: boolean; 性别: string };
    /** 动态事件段（`dungeonEvents.buildEventSection` 的产物）。空串 = 不注入 */
    动态事件段?: string;
    /** 是否触发晋升试炼（等级满了当前位阶上限） */
    晋升试炼?: boolean;
  },
```

函数体开头（`const 世界观锚定 = ...` 之前）加一行：

```ts
  const 动态事件段 = 附加?.动态事件段 ?? '';
```

`晋升试炼段` / `队友来源锚定` / `同人段` 三个常量的**完整定义**见本步的 ① ② ⑤；把它们都放在函数体开头这段位置（与 `世界观锚定` / `队友锚定` 并列）。

**① 队友来源锚定段** —— 插在 `${世界观锚定}${队友锚定}` 之后、「本次掷骰已锁定」之前：

```ts
  const 队友来源锚定 = `
============ 队友来源锚定（强制） ============
本次【队友标签】= ${build.队友标签}。它只用来圈定「哪些 IP 可以被匹配」这个范围。
- 「其他契约者」里的 **IP / 同人角色**必须取自该标签范围内的**真实 IP 作品**里的**真实角色**，
  真名公开；不得凭空原创、不得跨到标签范围外的作品。
- 其**来源世界观不得与本次副本世界观相同**（副本世界观见上文与本段之后的信息）。
- **等级锚定**：IP 队友都是**资深契约者**，等级必须按匹配规则与玩家相近
  （同 CR → 同阶位 → 等级相近），不要随手给一个数字。
  **例外**：新手副本的那名 IP 队友是 **Lv.1 新人**，与玩家同为新人。
- 回廊原生契约者不受本段约束，仍按后文「匹配参考」的名单与规则走。
`;
```

**② 同人契约者段** —— 仅当 `附加?.同人契约者?.开关` 为真时非空：

```ts
  const 同人段 = 附加?.同人契约者?.开关
    ? `
============ 同人契约者（本次开启） ============
本次**恰好匹配 1 名同人契约者**，不多不少。其**性别**为【${附加.同人契约者.性别}】。
该角色同样受上一段的「队友标签 → 世界观 → 真实角色」与「不得与本次副本世界观相同」约束。
`
    : '';
```

**③ 锁定骰值段的例外句** —— 找到 `【本次锁定骰值】` 那一段的结尾（`${formatLockedRolls(records)}` 之后、`注: UP / EXP /…` 之前的换行处），在**该段末尾**追加，且只在 `动态事件段` 非空时拼：

```ts
${动态事件段 ? `
⚠️ 例外（仅在本次有动态事件时生效）: 若下文「本次副本的动态事件」强制要求某个字段
（如副本类型），**以动态事件为准**；其余未被事件点到的骰值仍然严禁改动。
` : ''}
```

**④ 动态事件段与晋升试炼段的插入位置** —— 在 `============ 回廊难度评估 ============` 那一段**之后**、
`============ 契约者数据 ============` **之前**插入：

```ts
${晋升试炼段}${动态事件段 ? '\n' + 动态事件段 + '\n' : ''}
```

**⑤ 晋升试炼段全文**：

```ts
  const 晋升试炼段 = 附加?.晋升试炼
    ? `
============ 晋升试炼（回廊强制 · 不可拒绝） ============
契约者已达到当前位阶上限，回廊强制触发晋升试炼。
- 你生成的**第 3 条支线任务**必须就是【专属晋升任务】，且**恰好是第 3 条**（不改条数）。
- 它的难度必须是**极高**：单杀隐藏BOSS / 收集特定规则道具 / 完成某某仪式 一类，
  不是普通支线能比的；说明里要写清判定方式。
- 它的「物品名」字段填空字符串（本次不给物品奖励）。
- 它的**奖励由系统另行写入**（晋升奖励），你**不要**输出 UP / EXP / RP 相关文字。
- 若本次同时生效了「回廊淘汰赛」等事件：晋升任务仍以支线形式发放，
  **不干涉淘汰赛的生存与排名规则**；队伍中其他未晋升的队友可协助完成它。
- 主线与晋升支线的关系：主线成功但晋升支线未完成 = 晋升失败（**无惩罚**）；主线失败 = 抹杀。
`
    : '';
```

**⑥ `事件点名角色` 的输出契约 —— 必须补，否则这个字段是死代码**

> ⚠️ **执行补记（2026-09-25，Task 3 评审的 Minor #2 追出来的计划漏洞）**：
> Task 3 给 schema 加了 `事件点名角色`、Task 6 拿它做软校验，但**原计划里没有任何一步告诉 AI 去填它** ——
> 于是它恒为 `[]`，软校验永不触发，是死代码。本步补上。

在 `dungeonGen.ts` 的输出契约里做两件事：

**(a)** 「字段如下」那个 JSON 结构块中，`"其他契约者"` 那一行**之后**加一行：

```
  "事件点名角色": [ "字符串" ]
```

**(b)** 在紧随其后的说明列表里加一条：

```
- 「事件点名角色」只填**本次生效的动态事件强制要求在场**的人物**真名**（逐字，与事件正文一致）。
  **绝对不要把契约者本人（{{user}}）列进去** —— 他必然在场，写进去会被系统判成「点名了缺席者」。
  没有事件、或事件没点名任何具体人物时，填空数组 `[]`。
```

配套测试（加进 Step 1）：prompt 里必须出现 `事件点名角色` 这个字段名，且出现「不要把契约者本人」那句。


- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-003/__tests__/dungeonGen.test.ts`
Expected: PASS（新增 11 条 + 原有全部用例）。

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/dungeonGen.ts src/wxhl-003/__tests__/dungeonGen.test.ts
git commit -m "feat(wxhl): 副本生成 prompt 增加队友锚定/同人开关/动态事件/晋升试炼四段"
```

---

### Task 6: `store.ts` —— 接线

**Files:**
- Modify: `src/wxhl-003/store.ts`
- Test: `src/wxhl-003/__tests__/dungeonStore.test.ts`（**新建**）

**Interfaces:**
- Consumes: `buildEventSection`（Task 4）、`点名缺席者` / `PlayerBrief.晋升试炼`（Task 3）、`buildDungeonPrompt` 的 `附加`（Task 5）
- Produces:
  - `RolledDungeon.同人开关?: boolean`、`.同人性别?: '男' | '女' | '不限'`、`.事件开关?: boolean`、`.触发的动态事件?: string[]`
  - forumStore `getCardWorldbookEntries(): Promise<WorldbookEntry[]>`
  - `doCustomRoll` 新增三个参数

- [ ] **Step 1: 写失败的测试**

创建 `src/wxhl-003/__tests__/dungeonStore.test.ts`（照 `settlementStore.test.ts` 的桩模式）：

```ts
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { useDungeonGenStore } from '../store';

/**
 * `readPlayerBrief` 的晋升试炼判定。
 * 判定规则（spec §六.1）: `归一位阶(阶位) ∈ 0..3` 且 `等级 >= [20,40,60,80][idx]`。
 * 五阶与认不出的阶位一律不触发。
 */
describe('readPlayerBrief · 晋升试炼判定', () => {
  const 桩键 = ['getVariables', 'getCurrentMessageId'] as const;
  let 原值: Record<string, unknown> = {};

  /** 造一份只含判定所需字段的存档 */
  function 挂存档(等级: number, 阶位: string) {
    (globalThis as any).getVariables = () => ({
      stat_data: { 契约者: { 头部: { 姓名: '刘林', 等级, 阶位, CR: 3 }, 赛季信息: { 当前副本周期: 3 } } },
    });
    (globalThis as any).getCurrentMessageId = () => -1;
  }

  beforeEach(() => {
    setActivePinia(createPinia());
    原值 = {};
    for (const k of 桩键) 原值[k] = (globalThis as any)[k];
  });
  afterEach(() => {
    for (const k of 桩键) {
      if (原值[k] === undefined) delete (globalThis as any)[k];
      else (globalThis as any)[k] = 原值[k];
    }
  });

  it.each([
    [19, '一阶', false],
    [20, '一阶', true],
    [25, '一阶', true],   // 用 >=, 多给的经验不至于漏判
    [39, '二阶', false],
    [40, '二阶', true],
    [60, '三阶', true],
    [80, '四阶', true],
    [100, '五阶', false], // 五阶不在表内
    [100, '超脱者', false],
    [20, '认不出的阶位', false],
  ])('Lv.%i %s → 晋升试炼=%s', (等级, 阶位, 期望) => {
    挂存档(等级 as number, 阶位 as string);
    const s = useDungeonGenStore();
    expect(s.readPlayerBrief().player.晋升试炼).toBe(期望);
  });
});

/**
 * **CR=5 的边界**（Review Focus 第 5 条）。
 * 分界必须与 `buildMatchPool` 的 `cr <= 4` 一致 —— 字面「CR 大于五」会让 CR=5 落缝
 * （既不抓榜、又不给同人开关）。
 */
describe('buildMatchPool · CR 边界', () => {
  it('CR=4 → 自由生成, 不抓榜', () => {
    expect(buildMatchPool(4, '一阶')).toContain('不要');
    expect(buildMatchPool(4, '一阶')).not.toContain('榜单候选');
  });

  it('CR=5 → 走榜单（与 cr <= 4 的分界一致, 不落缝）', () => {
    expect(buildMatchPool(5, '一阶')).toContain('榜单候选');
  });

  it('CR=6 → 也走榜单', () => {
    expect(buildMatchPool(6, '一阶')).toContain('榜单候选');
  });
});
```

顶部 import 补 `buildMatchPool`：

```ts
import { buildMatchPool, useDungeonGenStore } from '../store';
```

- [ ] **Step 2: 跑测试确认失败**

Run: `pnpm vitest run src/wxhl-003/__tests__/dungeonStore.test.ts`
Expected: FAIL —— `s.readPlayerBrief` 不是函数（store 没导出它）。

- [ ] **Step 3: 导出 `readPlayerBrief` 与 `buildMatchPool`**

> **执行补记（2026-09-25）**：`晋升阶位上限` 常量与 `readPlayerBrief` 里的 `晋升试炼` 判定
> **已在 Task 3 Step 8 落地**（类型与它的生产者一起走，否则类型闸门会红）。
> 本步**只做两件导出**，不要重复添加判定逻辑。

1. 在 `useDungeonGenStore` 的 return 里加 `readPlayerBrief,`（供测试与调试用）。
2. 把文件里现有的模块级函数 `function buildMatchPool(...)` 改成 `export function buildMatchPool(...)`
   （**只加 `export`，函数体一行不动**），供边界测试直接调用。

- [ ] **Step 4: 跑测试确认通过**

Run: `pnpm vitest run src/wxhl-003/__tests__/dungeonStore.test.ts`
Expected: PASS（10 条）。

- [ ] **Step 5: 加 `RolledDungeon` 字段与 `getCardWorldbookEntries`**

`RolledDungeon` 接口末尾加：

```ts
  /** 每轮单独选: 是否额外匹配 1 名同人契约者（CR≥5 时面板可选） */
  同人开关?: boolean;
  /** 那名同人契约者的性别 */
  同人性别?: '男' | '女' | '不限';
  /** 每轮单独选: 是否读取并注入 EJS 动态事件。**默认开** */
  事件开关?: boolean;
  /** 本次渲染出的生效事件名（由 generate 写入, 供界面展示） */
  触发的动态事件?: string[];
```

forumStore 里 `getWorldbookContent` 之后加：

```ts
  /**
   * 读**卡绑定 + 全局开启**的世界书条目（只读, 不筛条目级 filter）。
   *
   * 专供 EJS 控制器用: 控制器与事件条目在卡绑定世界书里, 而玩家的「设置 → 世界书」
   * 勾选是另一回事（spec §一 要求「不管有没有勾选都要能读」）。
   * **只读这几本** —— 用户卡上有 91 本世界书, 全量扫描太慢。
   */
  async function getCardWorldbookEntries(): Promise<{ 名称: string; 正文: string }[]> {
    const 名单 = new Set<string>();
    try {
      const cb = getCharWorldbookNames('current');
      if (cb.primary) 名单.add(cb.primary);
      for (const w of cb.additional ?? []) 名单.add(w);
    } catch (_) {}
    try {
      for (const w of getGlobalWorldbookNames?.() ?? []) 名单.add(w);
    } catch (_) {}

    const 出: { 名称: string; 正文: string }[] = [];
    const 已见 = new Set<string>();
    for (const 名 of 名单) {
      try {
        const entries = await getWorldbook(名);
        for (const e of entries) {
          if (已见.has(e.name)) continue;   // 同名的取先出现的
          已见.add(e.name);
          出.push({ 名称: e.name, 正文: e.content ?? '' });
        }
      } catch (_) {}
    }
    return 出;
  }
```

并在 forumStore 的 return 里加 `getCardWorldbookEntries,`。

- [ ] **Step 6: `doRoll` / `doCustomRoll` 记录开关**

`doRoll` 与 `doCustomRoll` 的 `entry` 对象里各加（`doRoll` 用默认值，`doCustomRoll` 用参数）：

```ts
      同人开关: false,
      同人性别: '不限',
      事件开关: true,   // 默认开（用户 2026-09-25 拍板）
```

`doCustomRoll` 的签名改为：

```ts
  function doCustomRoll(
    overrides: BuildOverrides,
    worldview: string,
    mateWorld: string,
    mateNames: string,
    同人: { 开关: boolean; 性别: '男' | '女' | '不限' },
    事件: boolean,
  ) {
```

`doRoll` 也加两个可选参数：`function doRoll(同人: { 开关: boolean; 性别: '男' | '女' | '不限' } = { 开关: false, 性别: '不限' }, 事件 = true)`。

- [ ] **Step 7: `generate()` 接线**

`generate()` 里，`const wb = await forumStore.getWorldbookContent();` 之后加：

```ts
      // 动态事件: **先判开关** —— 关掉时连控制器都不渲染（spec §三 最后一条）。
      // 任何失败都只降级不阻断: `buildEventSection` 内部已吞掉所有异常并给出跳过原因。
      let 动态事件段 = '';
      let 触发的动态事件: string[] = [];
      if (entry.事件开关 ?? true) {
        if (typeof EjsTemplate === 'undefined') {
          // 插件没装 —— 与「渲染失败」同一条降级路径: **只提示, 不阻断**（Review Focus 第 1 条）。
          // 不能指望 buildEventSection 兜住这个: 它在 store 侧才被解引用, 直接写会在闭包里抛 ReferenceError。
          lastError.value = '本次未注入动态事件：未安装「提示词模板语法」插件';
        } else {
          const 条目表 = await forumStore.getCardWorldbookEntries();
          const 事件 = await buildEventSection({
            条目表,
            evalTemplate: (code, ctx) => EjsTemplate.evalTemplate(code, ctx),
            prepareContext: () => EjsTemplate.prepareContext(),
          });
          动态事件段 = 事件.段落;
          触发的动态事件 = 事件.触发;
          if (事件.跳过原因) lastError.value = '本次未注入动态事件：' + 事件.跳过原因;
          else if (事件.缺失.length) lastError.value = '控制器引用了找不到的条目：' + 事件.缺失.join('、');
        }
      }
```

`buildDungeonPrompt(...)` 调用末尾追加第 11 个参数：

```ts
        entry.customWorld,
        { 来源世界观: entry.mateWorld, 人物: entry.mateNames },
        {
          同人契约者: { 开关: entry.同人开关 ?? false, 性别: entry.同人性别 ?? '不限' },
          动态事件段,
          晋升试炼: player.晋升试炼,
        },
```

解析出 `parsed` 之后、写回 `rolledDungeons` 之前加软校验：

```ts
      // 软校验: 事件点名的人必须在名单里。**只报警、不阻断**（照本项目「宁可难看也不圆上」的口径）。
      // **先排除契约者本人** —— 他既不在「其他契约者」也不在「固有角色」里, 而事件正文常用
      // 「{{user}}」指代他, AI 偶尔会把他列进「事件点名角色」。那是**误报**:
      // prompt 已明令不要列（Task 5 ⑥b）, 这里再兜一道 —— 误报比不报更糟, 它会让玩家学会无视警告。
      const 缺席 = 点名缺席者(parsed).filter(名 => 名 !== player.姓名);
      if (缺席.length) lastError.value = '事件点名的人物未出现在名单里：' + 缺席.join('、');
```

写回时带上 `触发的动态事件`：

```ts
        enterPrompt: buildEnterPrompt(parsed, entry.build),
        触发的动态事件,
```

顶部 import 补：

```ts
import { buildEventSection } from './dungeonEvents';
```

以及把 `点名缺席者` 加进 `./dungeonRules` 的既有 import 列表。

- [ ] **Step 8: 跑全部测试**

Run: `pnpm test`
Expected: PASS（全量）。

- [ ] **Step 9: 提交**

```bash
git add src/wxhl-003/store.ts src/wxhl-003/__tests__/dungeonStore.test.ts
git commit -m "feat(wxhl): 副本生成接线动态事件/同人开关/晋升试炼 + 点名软校验"
```

---

### Task 7: `App.vue` —— 面板控件

**Files:**
- Modify: `src/wxhl-003/App.vue`（掷骰面板模板 ~1543-1578、script ~2469-2499、生成结果卡片 ~1630 附近）
- Modify: `src/wxhl-003/store.ts`（**只改 `reroll` 一处**，见 Step 1 的执行补记）

**Interfaces:**
- Consumes: `doRoll` / `doCustomRoll` 的新参数（Task 6）、`current.触发的动态事件`（Task 6）

- [ ] **Step 1: 加三个 ref 与传参**

`App.vue` 的 `// ============ 副本生成 · 自选模式 ============` 那一段里，`const customMateNames = ref('');` 之后加：

```ts
/** 每轮单独选: 是否额外匹配 1 名同人契约者（CR≥5 时才有意义, 低 CR 会禁用） */
const mateEnabled = ref(false);
const mateGender = ref<'男' | '女' | '不限'>('不限');
/** 每轮单独选: 是否读取 EJS 动态事件。默认开（用户 2026-09-25 拍板） */
const eventEnabled = ref(true);
```

`onRollClick` 改为：

```ts
function onRollClick() {
  const 同人 = { 开关: mateEnabled.value, 性别: mateGender.value };
  if (rollMode.value === 'random') {
    dungeonGenStore.doRoll(同人, eventEnabled.value);
    return;
  }
  const overrides: BuildOverrides = {};
  for (const o of CUSTOM_OPTIONS) {
    const v = customPicks.value[o.key];
    if (v) overrides[o.key] = v;
  }
  dungeonGenStore.doCustomRoll(
    overrides, customWorld.value, customMateWorld.value, customMateNames.value, 同人, eventEnabled.value,
  );
}
```

`onRollDungeon()` 那个只调 `doRoll()` 的旧函数**删掉**（`onRollClick` 已覆盖它）；若别处还引用它，一并改为带默认参数的 `doRoll()`。

**`reroll()` 也必须带上开关**（执行补记 2026-09-25，Task 6 实现者发现的 brief 缺口）：

`store.ts` 的 `reroll()` 现在调**无参**的 `doRoll()`，于是「重 roll」会**静默把两个开关重置**
（同人开关 → `false`）。玩家勾了同人开关、掷完不满意、点重 roll —— 开关就悄悄没了。

修法（两处，都很小）：
- `store.ts`：`function reroll(同人: { 开关: boolean; 性别: '男' | '女' | '不限' } = { 开关: false, 性别: '不限' }, 事件 = true)`
  —— 与 `doRoll` 同款签名，并把它两个都透传下去（`doRoll(同人, 事件)`）。
- `App.vue:2554`：调用点由 `dungeonGenStore.reroll();` 改为
  `dungeonGenStore.reroll({ 开关: mateEnabled.value, 性别: mateGender.value }, eventEnabled.value);`

> §九 的文件清单本行也应加上 `store.ts`（本步只改 `reroll` 一处）。

> ⚠️ **CR=5 的边界**（Review Focus 第 5 条）：`buildMatchPool` 的分界是 `cr <= 4`，所以 CR=5 属于「榜单匹配池」那一侧。同人开关的禁用条件必须写成 `playerCR <= 4`，**不要**写成 `playerCR < 5` 之外的花样 —— 两者在此等价，但沿用与 `buildMatchPool` 同一个字面量，避免以后改一处忘另一处。

- [ ] **Step 2: 加模板控件**

在 `<div v-if="rollMode === 'custom'" class="custom-panel">` **之后**（即两种模式都能看到的位置）插入：

```html
            <div class="cp-field">
              <label class="cp-label">
                <input v-model="eventEnabled" type="checkbox" :disabled="dungeonGenStore.rolling || dungeonGenStore.generating" />
                读取动态事件
              </label>
              <span class="set-hint">按赛季/周期/阶位判定本轮生效的事件，其优先级高于骰值与自选</span>
            </div>
            <div class="cp-field">
              <label class="cp-label">
                <input v-model="mateEnabled" type="checkbox" :disabled="(playerCR ?? 0) <= 4 || dungeonGenStore.rolling || dungeonGenStore.generating" />
                匹配同人契约者
              </label>
              <select v-model="mateGender" class="cp-select" :disabled="!mateEnabled">
                <option value="不限">不限</option>
                <option value="男">男</option>
                <option value="女">女</option>
              </select>
              <span v-if="(playerCR ?? 0) <= 4" class="set-hint">低 CR 没有榜单可退，队友本就是 IP 契约者</span>
            </div>
```

**「事件赢 + 明确警告」**（spec §二 #16）—— 紧接上面那个 `</div>` 之后再加一段：

```html
            <div v-if="eventEnabled && rollMode === 'custom'" class="refresh-err">
              ⚠️ 已开启动态事件：其优先级高于上方所有自选字段，冲突时以事件为准。
            </div>
```

> **为什么是「事前通用警告」而不是「事后逐项比对」**：事后比对要解析 AI 输出、逐字段判断谁被覆盖，
> 而 AI 的输出是自然语言拼装的，判不准；且玩家在**掷骰前**就该知道自选会被事件压过。
> 用**事前警告**既准确又零解析成本 —— 这正是 spec §五.4 定的做法。

> `playerCR` 需已存在。**先确认**：若 `App.vue` 里没有这个 ref，就在同一段 script 里加
> `const playerCR = ref(0);`，并在已有的读存档逻辑（`playerCycle` 附近，见 `App.vue:2418`）里补
> `playerCR.value = Number(vars?.stat_data?.契约者?.头部?.CR) || 0;`。

- [ ] **Step 3: 掷骰明细加「晋升试炼」小字**

在奖励骰明细那段（`buildRecords` / `rewardRecords` 渲染附近）之后加：

```html
              <div v-if="dungeonGenStore.current.build && current晋升" class="set-hint">
                本次为晋升试炼，第 3 条支线的奖励由系统指定（不取上表第 3 组支线骰）
              </div>
```

`current晋升` 用 computed —— 但它读的是**已存的 ref**，不在模板里现读存档。
`App.vue` 现有的 `playerCycle` 那段读取逻辑（见 `App.vue:2418` 附近）里已经拿到整个 `vars`，
在同处补两个 ref 即可：

```ts
const playerLevel = ref(1);
const playerRank = ref('一阶');
// —— 在现有 playerCycle.value = ... 那一行旁边补：
//   playerLevel.value = Number(vars?.stat_data?.契约者?.头部?.等级) || 1;
//   playerRank.value = String(vars?.stat_data?.契约者?.头部?.阶位 ?? '一阶');
//   playerCR.value = Number(vars?.stat_data?.契约者?.头部?.CR) || 0;   // 若还没有 playerCR

/** 各阶位等级上限（与 store 的晋升阶位上限同口径；五阶不在表内 ⇒ Lv.100 不触发） */
const 晋升阶位上限 = [20, 40, 60, 80];
const current晋升 = computed(() => {
  const idx = 归一位阶(playerRank.value);
  return idx !== undefined && idx <= 3 && playerLevel.value >= 晋升阶位上限[idx];
});
```

`App.vue` 顶部 import 补 `归一位阶`（若已有则跳过）：

```ts
import { 归一位阶 } from './dice';
```

- [ ] **Step 4: 生成结果卡片列出本次生效事件**

在副本名称那一行下方（`App.vue:1630` 附近）加：

```html
              <div v-if="dungeonGenStore.current.触发的动态事件?.length" class="dc-line">
                <span class="dc-key">动态事件</span>
                <span>{{ dungeonGenStore.current.触发的动态事件.join('、') }}</span>
              </div>
```

- [ ] **Step 5: 验证**

Run: `pnpm test`
Expected: PASS（全量；本任务只动 `.vue`，不应影响任何测试）。

再跑一次类型检查与构建：

Run: `pnpm build`
Expected: 构建成功（无 TS 报错）。

- [ ] **Step 6: 人工验证（在酒馆里）**

按仓库规则用 chrome-devtools 连上酒馆（或让用户在页面上看）：

1. 打开小手机 → 副本生成 → 掷骰面板：应看到「读取动态事件」（默认勾选）与「匹配同人契约者」两个控件；用一阶 CR=1 的档，同人开关应是**禁用**的并显示提示。
2. 点掷骰：明细里应多出一行「队友标签 / 1d50 / N / 某标签」。
3. 点生成：控制台应出现动态事件相关日志；生成结果卡片应列出生效事件名（若当前周期有事件）。
4. 把「读取动态事件」取消勾选再生成一次：prompt 里不应再有事件段（可在 `console` 里查 `buildDungeonPrompt` 的产物，或看生成结果是否变化）。

- [ ] **Step 7: 提交**

```bash
git add src/wxhl-003/App.vue
git commit -m "feat(wxhl): 副本生成面板增加事件/同人开关与晋升提示"
```

---

## 收尾

- [ ] **全量测试 + 构建**

```bash
pnpm test && pnpm build
```
Expected: 全绿。

- [ ] **更新 spec 的两处实现细化**

把本计划开头那两条（`附加` 分组参数、`晋升奖励前缀` 落在 `dice.ts`）回写进
`docs/superpowers/specs/2026-09-25-dungeon-teammates-and-ejs-events-design.md` 的 §九，免得 spec 与代码说的不是一回事。

```bash
git add docs/superpowers/specs/2026-09-25-dungeon-teammates-and-ejs-events-design.md
git commit -m "docs(wxhl): 回写实现细化（附加参数分组 / 晋升前缀位置）"
```

- [ ] **请求代码评审**

用 `superpowers:requesting-code-review` 对整个分支做一次评审，重点看 Review Focus 那 5 条。

---

## 已知未覆盖（本计划不做，已在 spec 记录）

- 控制器同时吐出的 4 条**规则条目**被丢弃（spec §八.1）。
- 事件里的**数值锚定**（好感度 20）与**敌人构筑**（恶魔旅团 5 人）归正文 API（spec §一.1）。
- **多条事件矛盾**不裁决（spec §三）。
- 结算侧的 **CR 晋升 ±1.0** 与 **`超脱者` 阶位抛错**（spec §7.4、附录 A.1）—— 等结算专项。
