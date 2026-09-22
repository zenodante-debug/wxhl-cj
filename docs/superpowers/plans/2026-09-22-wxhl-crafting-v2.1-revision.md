# 工坊 v2.1（图纸系统修订）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 按玩家反馈修订图纸系统：成品类型改称「道具」、装备支持饰品与自由种类名（数值走 AI 选定的参照模板）、道具支持自定义生成（结构化数值）、核心材料可多选、新增「设计要求」输入框、阶位上限保留。

**Architecture:** 沿用 v2 分层。核心是**把「名字」与「数值来源」拆开**：`装备基础` 变成自由文本种类名（显示用），新增 `参照模板` 承载数值（仍查世界书表，保证平衡可测）；道具从「按名查 GOODS_BASE」改为「AI 产出结构化类型+固定值」，由世界书公式算成品数值。

**Tech Stack:** 同 v2（TypeScript / Vue 3 script setup / pinia / zod 4 / vitest）

**Spec:** `docs/superpowers/specs/2026-09-21-wxhl-crafting-workshop-design.md`（本计划是对其 §6/§7 的修订，冲突处以本计划为准）

## Global Constraints

- **auto-import 约定**：`vue`/`pinia`/`z`/`klona` 无需 import；`_`/`$`/`toastr`/`Mvu`/`getVariables`/`replaceVariables`/`getCurrentMessageId` 为运行时全局。测试文件只 import `vitest` 与被测模块。
- **测试命令** `pnpm test`；**类型门是 `npx tsc --noEmit`（crafting/ 零新增错误），不是 `pnpm build`**（后者 transpileOnly 不做类型检查）；**`.vue` 无 vue-tsc，必须由评审逐行人工核对**。
- **主卡 MVU 零改动**：只写 `契约者.背包` / `契约者.经济.UP`；配方库存聊天变量 `wxhl003_crafting`。
- **【无兼容】旧图纸不迁移**：已知存档里可能有写着 `成品类型: '消耗品'` 的图纸，直接变为非法（`readBlueprint` 的 safeParse 会返回 null，该物品成为无出口的僵尸）。**这是用户明确接受的结果**，不要写迁移代码。
- **`归一位阶` 返回 0 基下标**，比较/展示前必须 +1（本项目已踩过一次）。
- **世界书数值口径不变**：装备数值一律从 `WEAPON_TABLE`/`ARMOR_BASE`/`ATTR_BONUS`/`穿戴门槛` 取；道具数值一律按世界书公式（恢复 = 固定值 + 修正×阶位倍率；伤害 = 基础骰 + 修正）。
- 违禁判定口径（v2 最终形态）不得放宽。

---

### Task 1: recipes.ts —— 数据模型修订

**Files:**
- Modify: `src/wxhl-003/crafting/recipes.ts`
- Test: `src/wxhl-003/crafting/__tests__/recipes.test.ts`

**Interfaces:**
- Produces（后续任务按此消费）:
  - `成品类型` 枚举改为 `z.enum(['装备', '道具'])`（**`消耗品` 一词在源码中彻底消失**，仅在世界书引文注释里可保留）
  - `配方Schema` 新增字段：
    - `参照模板: z.string().prefault('')` —— 数值模板：武器= `WEAPON_TABLE` 键 / 防具= `ArmorSpectrum` / 饰品= `''`
    - `道具类型: z.enum(['恢复HP','恢复MP','状态','弹药','餐食','爆炸物','陷阱','其他']).prefault('其他')`
    - `道具固定值: z.coerce.number().prefault(0)`
    - `关联属性: z.enum(['PER','CON']).prefault('PER')`
    - `设计要求: z.string().prefault('')` —— 玩家填的成品方向，存档留痕
  - `装备基础` 语义变更：从「数值模板键」变为「**自由文本种类名**」（如「浮游炮」「指环」），仅用于显示与命名
  - `GOODS_BASE` 删除，替换为 `道具基准价(类型: 道具类型, 固定值: number): number`（一阶单价，UP）
  - `STANDARD_GOODS_RECIPES` 的 `成品类型` 改为 `'道具'`，并为每条补 `道具类型`/`道具固定值`/`关联属性`（**照抄现 `GOODS_BASE` 的取值**）
  - `TEMPLATE_RECIPES` 的 `成品类型` 改为 `'装备'`，并补 `参照模板`（= 原 `装备基础` 的位置已有值，此处保持空，制作时由玩家/UI 选）

- [ ] **Step 1: Write the failing test**（追加到既有测试文件）

```ts
describe('v2.1 数据模型修订', () => {
  it('成品类型枚举为 装备/道具，不含 消耗品', () => {
    const 道具配方 = STANDARD_GOODS_RECIPES[0];
    expect(道具配方.成品类型).toBe('道具');
    expect(配方Schema.parse({ ...道具配方 }).成品类型).toBe('道具');
    expect(() => 配方Schema.parse({ ...道具配方, 成品类型: '消耗品' })).toThrow();
  });
  it('标准道具配方带结构化数值，且与旧 GOODS_BASE 取值一致', () => {
    const 治疗 = STANDARD_GOODS_RECIPES.find(r => r.名称 === '基础治疗药剂')!;
    expect(治疗.道具类型).toBe('恢复HP');
    expect(治疗.道具固定值).toBe(20);
    expect(治疗.关联属性).toBe('PER');
  });
  it('配方可承载多个核心材料', () => {
    const r = 配方Schema.parse({
      名称: 'x', 来源: '自定义', 行业: '锻造', 成品类型: '装备', 品质: '蓝色',
      材料: [
        { 类别: '金属', 数量: 1, 核心: true },
        { 类别: '怪物素材', 数量: 1, 核心: true },
        { 类别: '任意', 数量: 2, 核心: false },
      ],
      技能要求: { 分类: '基础', 等级: 3 },
    });
    expect(r.材料.filter(m => m.核心).length).toBe(2);
  });
  it('道具基准价随类型与固定值变化', () => {
    expect(道具基准价('恢复HP', 40)).toBeGreaterThan(道具基准价('恢复HP', 20));
    expect(道具基准价('状态', 0)).toBeGreaterThan(0);
  });
  it('参照模板与设计要求默认空串', () => {
    expect(TEMPLATE_RECIPES[0].参照模板).toBe('');
    expect(TEMPLATE_RECIPES[0].设计要求).toBe('');
  });
});
```

- [ ] **Step 2: Run test to verify it fails** — `pnpm test -- src/wxhl-003/crafting/__tests__/recipes.test.ts`，Expected: FAIL

- [ ] **Step 3: Write implementation**

`配方Schema` 改动：

```ts
  成品类型: z.enum(['装备', '道具']),
  装备子类: z.enum(['武器', '防具', '饰品']).or(z.literal('')).prefault(''),
  /** 自由文本种类名（如「浮游炮」「指环」），仅显示与命名用 */
  装备基础: z.string().prefault(''),
  /** 数值模板：武器=WEAPON_TABLE 键 / 防具=ArmorSpectrum / 饰品='' */
  参照模板: z.string().prefault(''),
  /** 道具数值（替代旧的按名查表） */
  道具类型: z.enum(['恢复HP', '恢复MP', '状态', '弹药', '餐食', '爆炸物', '陷阱', '其他']).prefault('其他'),
  道具固定值: z.coerce.number().prefault(0),
  关联属性: z.enum(['PER', 'CON']).prefault('PER'),
  /** 玩家填写的成品方向/要求，存档留痕并作为 AI 定制的主输入 */
  设计要求: z.string().prefault(''),
```

删除 `GOODS_BASE`，新增：

```ts
/**
 * 道具一阶基准单价（UP/件）——用于图纸定价（成品单价 × 20 × 阶位系数）。
 * 设计填补（可调初值）：恢复/伤害类随固定值线性增长，其余按类型给底价。
 */
export function 道具基准价(类型: 道具类型, 固定值: number): number {
  const v = Math.max(0, Number(固定值) || 0);
  const 底价: Record<道具类型, number> = {
    恢复HP: 10, 恢复MP: 12, 状态: 25, 弹药: 10, 餐食: 20, 爆炸物: 30, 陷阱: 25, 其他: 20,
  };
  const 系数: Record<道具类型, number> = {
    恢复HP: 0.75, 恢复MP: 0.75, 状态: 0, 弹药: 0.5, 餐食: 0.5, 爆炸物: 1, 陷阱: 0.5, 其他: 0.5,
  };
  return Math.max(1, Math.round(底价[类型] + v * 系数[类型]));
}
```

`STANDARD_GOODS_RECIPES` 的 `goods()` 工厂签名扩展为带 `道具类型`/`道具固定值`/`关联属性`（取值照抄旧 `GOODS_BASE`），并把 `成品类型: '消耗品'` 改为 `'道具'`。

- [ ] **Step 4: Run test** — Expected: PASS（含既有测试；既有「v1 只有白/蓝品质」等断言若因枚举改名而红，按新语义修正断言本身，不得删除）

- [ ] **Step 5: Commit** — `feat(wxhl): 配方模型修订——成品类型改道具/参照模板/道具结构化数值/设计要求`

---

### Task 2: craft.ts —— 饰品、参照模板、道具数值、多核心材料

**Files:**
- Modify: `src/wxhl-003/crafting/craft.ts`
- Test: `src/wxhl-003/crafting/__tests__/craft.test.ts`

**Interfaces:**
- Consumes: Task 1 的 `参照模板`/`道具类型`/`道具固定值`/`关联属性`
- Produces:
  - `CraftInput.核心材料` 从单件改为**列表**：`核心材料: { 物品名: string; 数量: number }[]`（`辅料` 保持列表）
  - `buildEquip` 三分支：武器（`参照模板` 查 `WEAPON_TABLE`）/ 防具（`参照模板` 查光谱）/ **饰品（`attrBonus('饰品')`，无防闪无伤害骰）**
  - `buildGoods` 改为消费 `配方.道具类型`/`道具固定值`/`关联属性` + `配方.效果`，**不再查 `GOODS_BASE`**
  - 装备/道具的 `名称` 一律优先 `配方.成品名`，为空才回落 `核心材料名 + 类型词`

- [ ] **Step 1: Write the failing test**

```ts
describe('v2.1 制作修订', () => {
  it('饰品：数值走 attrBonus(饰品)，无伤害骰无防闪', () => {
    const input = makeInput({
      配方: 配方Schema.parse({
        名称: '指环', 来源: '图纸', 行业: '锻造', 成品类型: '装备', 装备子类: '饰品',
        品质: '蓝色', 阶位: 1, 装备基础: '寒铁指环', 参照模板: '', 成品名: '寒铁指环',
        材料: [{ 类别: '金属', 数量: 1, 核心: true }],
        技能要求: { 分类: '基础', 等级: 3 },
      }),
      核心材料: [{ 物品名: '精铁', 数量: 1 }],
      辅料: [],
    });
    const p = executeCraft(input, 10, () => 0.5).新增[0] as any;
    expect(p.类型).toBe('饰品');
    expect(p.名称).toBe('寒铁指环');
    expect(p.主属性加成).toBeGreaterThan(0);
    expect(p.伤害骰).toBe('无');
  });
  it('装备种类自由：名称用自由文本，数值取参照模板', () => {
    const input = makeInput({
      配方: 配方Schema.parse({
        名称: '浮游炮', 来源: '图纸', 行业: '工程', 成品类型: '装备', 装备子类: '武器',
        品质: '蓝色', 阶位: 1, 装备基础: '浮游炮', 参照模板: '突击步枪', 成品名: '浮游炮',
        材料: [{ 类别: '金属', 数量: 2, 核心: true }],
        技能要求: { 分类: '基础', 等级: 3 },
      }),
      核心材料: [{ 物品名: '精铁', 数量: 2 }],
      辅料: [],
    });
    const p = executeCraft(input, 10, () => 0.5).新增[0] as any;
    expect(p.名称).toBe('浮游炮');
    expect(p.伤害骰).toBe('3d8'); // 突击步枪一阶白=3d6，蓝+1级→d8
  });
  it('道具自定义：AI 给的类型/固定值决定成品数值，且效果落装', () => {
    const input = makeInput({
      配方: 配方Schema.parse({
        名称: '狼血秘药', 来源: '图纸', 行业: '炼金', 成品类型: '道具', 品质: '金色', 阶位: 1,
        道具类型: '恢复HP', 道具固定值: 45, 关联属性: 'PER', 成品名: '狼血秘药',
        材料: [{ 类别: '草药', 数量: 2, 核心: true }],
        技能要求: { 分类: '高级', 等级: 1 },
        效果: [{ 类型: '常驻', 描述: '饮下后短暂提升感知' }],
      }),
      核心材料: [{ 物品名: '月光草', 数量: 2 }],
      辅料: [],
    });
    const p = executeCraft(input, 15, () => 0.99).新增[0] as any;
    expect(p.名称).toBe('狼血秘药');
    expect(p.效果['饮下后短暂提升感知']).toBeDefined();
    expect(p.描述).toContain('45'); // 固定值×阶位 + 修正×阶位系数
  });
  it('多核心材料：失败时每件各损毁一半', () => {
    const input = makeInput({
      核心材料: [{ 物品名: '精铁', 数量: 2 }, { 物品名: '兽骨', 数量: 3 }],
      辅料: [],
    });
    const out = executeCraft(input, 2, () => 0.5); // 失败
    expect(out.扣减).toEqual([
      { 物品名: '精铁', 数量: 1 },
      { 物品名: '兽骨', 数量: 2 },
    ]);
  });
});
```

- [ ] **Step 2: Run** — Expected: FAIL

- [ ] **Step 3: Write implementation**

关键改动点：
- `CraftInput.核心材料` 改类型为数组；`validateCraft` 的数量校验、`executeCraft` 的扣减/损毁、`buildEquip`/`buildGoods` 的命名全部遍历数组
- 失败档：`扣减 = 核心材料.map(m => ({ ...m, 数量: Math.ceil(m.数量 / 2) }))`（世界书原文即「每种核心材料损毁 50%」）
- 大失败档：全部投入材料（核心 + 辅料）
- `buildEquip`：`const 基础 = input.配方.参照模板 || input.子类型;`
  - 武器分支：`weaponStats(基础, tier, q)`
  - 防具分支：`armorStats(基础 as ArmorSpectrum, tier, q)`
  - **饰品分支（新）**：`attrBonus('饰品', tier, q)` 取主/副属性加成；`伤害骰: '无'`、`倍率: 0`、`装备防御: 0`、`装备闪避: 0`、`负重: 0`；`穿戴门槛` **按轻装档**（`THRESHOLD_BASE['轻装']`）—— 世界书未给饰品专属门槛基准，饰品属轻量装备故借用最宽松的轻装档，**注释标明为设计填补**
  - 三分支的 `名称`: `配方.成品名 || 内置命名规则`
- `buildGoods`：`const 基准 = input.配方.道具固定值`；恢复类按 `基准×阶位 + 修正×阶位系数`；爆炸类按 `基准` 作为骰数基准（保留现有 `品质骰 × 阶位` 逻辑）并叠加 `配方.效果` 写入 `效果` 字段

- [ ] **Step 4: Run** — Expected: PASS（既有测试中凡构造 `CraftInput` 的需同步改为数组形式；`makeInput` 的默认 `核心材料` 改为数组）

- [ ] **Step 5: Commit** — `feat(wxhl): 制作支持饰品/参照模板/道具结构化数值/多核心材料`

---

### Task 3: blueprintAI.ts —— AI 定制扩展

**Files:**
- Modify: `src/wxhl-003/crafting/blueprintAI.ts`
- Test: `src/wxhl-003/crafting/__tests__/blueprintAI.test.ts`

**Interfaces:**
- Produces:
  - `DesignTarget` 扩展为：
    ```ts
    export interface DesignTarget {
      成品类型: '装备' | '道具';
      装备子类: '武器' | '防具' | '饰品' | '';
      种类: string;        // 自由文本，如「浮游炮」
      品质: '金色' | '紫色';
      阶位: number;
      核心材料: string[];  // 多选
      行业: string;
      设计要求: string;    // 玩家填的方向/要求
      名称: string;        // 玩家填的成品名（可为空 → AI 生成）
    }
    ```
  - `DESIGN_SCHEMA` 输出新增 `参照模板`（装备时必填）、`道具类型`/`道具固定值`/`关联属性`（道具时必填）
  - `sanitizeDesign(raw, 目标)` 校验：
    - 装备：`参照模板` 必须是 `WEAPON_TABLE` 键（武器/饰品？见下）或 `ArmorSpectrum`（防具），**与 `装备子类` 同类**；非法 → `ok:false`
    - 饰品：`参照模板` 允许为空（数值走 `attrBonus('饰品')`）
    - 道具：`道具类型` 必须在枚举内，`道具固定值` 必须是非负有限数；越界 → 钳到合理区间（**钳制上限按品质**：白/蓝 ≤ 60、金 ≤ 120、紫 ≤ 200，可调常量，注释标明为设计填补）
    - `名称`：空则用 AI 返回的名称；`成品名` 一律取该名称
    - 银色仍一律拒

- [ ] **Step 1: Write the failing test**

```ts
describe('v2.1 AI 定制', () => {
  const 目标: DesignTarget = {
    成品类型: '装备', 装备子类: '武器', 种类: '浮游炮', 品质: '金色', 阶位: 1,
    核心材料: ['精铁', '兽骨'], 行业: '工程', 设计要求: '会飞的连射炮', 名称: '浮游炮',
  };
  it('装备：AI 给参照模板则采用，成品名取玩家填的名称', () => {
    const r = sanitizeDesign({ ...rawAI({ 参照模板: '突击步枪' }) }, 目标);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.参照模板).toBe('突击步枪');
    expect(r.数据.配方.装备基础).toBe('浮游炮');
    expect(r.数据.配方.成品名).toBe('浮游炮');
  });
  it('装备：参照模板与子类不同类 → 拒', () => {
    const r = sanitizeDesign({ ...rawAI({ 参照模板: '轻装' }) }, 目标); // 轻装是防具光谱
    expect(r.ok).toBe(false);
  });
  it('装备：参照模板缺失 → 拒', () => {
    expect(sanitizeDesign({ ...rawAI({ 参照模板: '' }) }, 目标).ok).toBe(false);
  });
  it('饰品：参照模板可为空', () => {
    const t = { ...目标, 装备子类: '饰品' as const, 种类: '指环' };
    const r = sanitizeDesign({ ...rawAI({ 参照模板: '' }) }, t);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.装备子类).toBe('饰品');
  });
  it('道具：类型与固定值落库，超上限被钳', () => {
    const t: DesignTarget = { ...目标, 成品类型: '道具', 装备子类: '', 种类: '', 品质: '金色' };
    const r = sanitizeDesign(rawAI({ 道具类型: '恢复HP', 道具固定值: 999, 关联属性: 'PER' }), t);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.数据.配方.道具类型).toBe('恢复HP');
    expect(r.数据.配方.道具固定值).toBeLessThanOrEqual(120);
    expect(r.clamped.length).toBeGreaterThan(0);
  });
  it('道具：非法类型 → 拒', () => {
    const t: DesignTarget = { ...目标, 成品类型: '道具', 装备子类: '', 种类: '' };
    expect(sanitizeDesign(rawAI({ 道具类型: '随便', 道具固定值: 10 }), t).ok).toBe(false);
  });
  it('设计要求与多核心材料进提示词', () => {
    const p = buildDesignPrompt(目标);
    expect(p).toContain('会飞的连射炮');
    expect(p).toContain('精铁');
    expect(p).toContain('兽骨');
  });
});
```

（`rawAI()` 造 AI 返回体；装备 case 需补 `参照模板` 字段）

- [ ] **Step 2: Run** — Expected: FAIL
- [ ] **Step 3: Write implementation**（提示词需明确要求：`参照模板` 只能取给定表内的值并说明该表；道具必须给结构化类型与固定值；名称依据玩家设计要求与材料生成；不填名称时由 AI 起名）
- [ ] **Step 4: Run** — Expected: PASS
- [ ] **Step 5: Commit** — `feat(wxhl): AI 定制扩展——参照模板/饰品/结构化道具/设计要求与多核心材料`

---

### Task 4: store.ts —— 定价与守卫调整

**Files:**
- Modify: `src/wxhl-003/crafting/store.ts`
- Test: `src/wxhl-003/crafting/__tests__/store.test.ts`

**Interfaces:**
- `blueprintPrice` 调用改为：装备走 `EQUIP_MID`（含饰品，已就绪）；道具走 `道具基准价(配方.道具类型, 配方.道具固定值) × 20 × 阶位系数`（**不再按名查 `GOODS_UNIT_PRICE`**）
- **删除** v2 的「道具名必须在 `GOODS_BASE`」守卫（`消耗品名理由`），改为：道具只需 `道具类型` 合法即可
- `designBlueprint` 入参扩展（透传 `设计要求`/`种类`/`核心材料[]`/`名称`）
- 同名禁购、阶位上限、丢弃等既有守卫**全部保留**

- [ ] **Step 1-2: 改既有测试使其失败**（同名禁购等既有断言保留；新增道具定价与「自创道具名不再被拒」的断言）
- [ ] **Step 3: Write implementation**
- [ ] **Step 4: Run** — `npx tsc --noEmit`（crafting/ 零新增）+ `pnpm test` 全绿
- [ ] **Step 5: Commit** — `feat(wxhl): store 定价改道具结构化基准，放开自定义道具名`

---

### Task 5: CraftingView.vue —— 表单重构

**Files:**
- Modify: `src/wxhl-003/crafting/CraftingView.vue`

**Interfaces:** 消费 Task 4 的 store 导出

- [ ] **Step 1: 表单改为**

```
成品类型   ○ 装备   ○ 道具
设计要求   [多行文本]  ← 新增，AI 的主输入，如「一把会飞的连射炮，打起来像下雨」
成品名称   [文本，可留空由 AI 起名]

— 装备时 —
  子类     ○ 武器 ○ 防具 ○ 饰品
  种类     [自由文本]  如 浮游炮 / 指环 / 玄铁长枪
  数值参照 [下拉] ← AI 定完可手改；选项 = 该子类对应的表（武器 9 种 / 防具 5 光谱 / 饰品 无）

— 道具时 —
  （无额外字段；类型与固定值由 AI 产出，生成后在确认框里展示）

品质     [金 / 紫]
阶位     [1 .. min(5, 玩家阶位)]   ← 上限保留
核心材料 [多选]  ← 从背包按核心类别列出，可勾选多件
行业     [锻造/裁缝/炼金/工程/烹饪]
```

- [ ] **Step 2: 确认框**展示：成品名、参照模板（含具体数值，让玩家看到"用【突击步枪】的数值"）、道具类型与固定值、材料清单、价格、钳制记录
- [ ] **Step 3:** `npx tsc --noEmit`（crafting/ 零新增）+ `pnpm test` 全绿 + **逐行人工核对 `.vue`**（无 vue-tsc，这是唯一类型门）
- [ ] **Step 4: Commit** — `feat(wxhl): 图纸定制表单重构——设计要求/自由种类+参照模板/饰品/多选核心材料`

---

### Task 6: 全量回归与终审

- [ ] `pnpm test` 全绿
- [ ] `npx tsc --noEmit`（crafting/ 零新增）
- [ ] `pnpm build` 零 error
- [ ] 派最终评审（含 `.vue` 逐行人工核对 + 端到端路径审计）

---

## Self-Review 记录

- **覆盖检查**：用户 7 条 → #1 改名+饰品（T1/T2/T5）、#2 道具可自定义（T1/T2/T3/T4）、#3 阶位上限保留（T5 不改）、#4 多核心材料（T1/T2/T5）、#5 自由种类+AI 数值（T2/T3/T5）、#6 技能判定（**本计划不含修复，见下**）、#7 设计要求输入框（T1/T3/T5）。
- **#6 未纳入本计划**：用户问的是"怎么判断玩家有没有对应的制造系技能"，当前实现是「按技能名精确匹配行业名」。**这是设计讨论而非既定修改**——需用户决定是保持精确匹配、还是改为模糊匹配（含「锻造术」）、还是加一个行业→技能名映射表。故本计划不动它，留待用户答复后单独立项。
- **风险**：T2 的饰品 `穿戴门槛` 世界书未给基准（装备与消耗品系统只给了武器/防具），实现者需选一种并在注释标明为设计填补；T3 的道具固定值钳制上限（白蓝 60/金 120/紫 200）同为设计填补，均为可调常量。
