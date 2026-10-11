# wxhl-cygf 创意工坊 UI 整改 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把创意工坊从"三类简陋上传 + 下拉筛选"改成 **5 个并列分类（副本/事件/机制拓展/构筑/人设）+ 顶部导航 + 卡片四要素（封面/名字/简介/上传者）+ 按类型专属上传（含世界书 JSON 一键导入）**，包格式升到 `wxhl-mod@2`。

**Architecture:** 五类包的差异全部在**云端渲染**——宿主脚本不变（仍只把条目写进「无限回廊mod」）。`event` 包自带 EJS 控制器，与主卡控制器**并行**（已核实：`findControllers` 取并集、`buildEventSection` 用 `Promise.all` 并行渲染，且附加世界书已在副本生成的条目池里）。

**Tech Stack:** zod 4（共享契约）/ 原生 JS 页面（无构建）/ Cloudflare Worker + D1 / vitest（cloudflare 下测试为 `.test.js`）

**Spec:** [docs/superpowers/specs/2026-10-11-wxhl-cygf-ui-rework-design.md](../specs/2026-10-11-wxhl-cygf-ui-rework-design.md)
**用户提供的世界书导入补丁（只作参考，逻辑要并进正式代码，不直接打补丁）**：`C:/Users/zero/Downloads/创意工坊-世界书JSON导入-网站补丁/worldbook-json-import/`

## Global Constraints

- **禁 pnpm**：`npx vitest run` / `npm run build` / `npx eslint`
- 包格式字面量 `wxhl-mod@2`；五类型 id `dungeon | event | mechanism | build | persona`；显示名 `副本 | 事件 | 机制拓展 | 构筑 | 人设`
- `cover` 只接受空串或 `http(s)://` 且不含空白/引号/尖括号的 URL（防属性注入）
- 卡片四要素必填口径：`name` / `description`（≥1 字）/ `author.name` 必填，`cover` 可空（页面用主题占位图）
- **响亮失败**：世界书导入遇到不支持的设置 → **整次拒绝并列出原因**，绝不静默丢弃某条或改设置
- `page-lib.js` 是**纯 JS**（浏览器直接 import，无构建）；页面渲染任何投稿内容一律 `textContent`，禁 `innerHTML`
- 事件命名规范：条目名 `事件_<包名>_<事件名>`，控制器名 `EJS/<包名>控制器`；`event` 包条目必须 `事件_` 或 `EJS/` 开头
- 别再加 `event.source` 之类"只认父窗口"的桥接守卫（宿主在**兄弟 iframe** 回包，加了必然拦死——2026-10-11 踩过）
- **共享分支**：另一会话并行提交 wxhl-combat，提交一律显式圈路径，禁 `git add -A`
- commit 格式：`feat(wxhl-cygf): ...` / `fix(wxhl-cygf): ...`

## Review Focus

spec 未显式覆盖、最可能咬人的五类输入（每条已把测试钉进对应任务）：

1. **`cover` 里塞破坏属性的值**（`" onerror=…`）→ 校验必须拒 → Task 1 测试钉住
2. **世界书导出里的高级设置**（向量化/分组/独立扫描深度…）→ 必须**整次拒绝并点名**，不能只丢那一条 → Task 2a 测试钉住
3. **事件条目名不合规范**（没 `事件_` 前缀）→ 拒绝 → Task 1 测试钉住
4. **老库里已有 @1 的包**（`pack_json` 是旧格式）→ 列表/详情不能崩 → Task 3 测试钉住
5. **封面图裂链**（URL 有效但图 404）→ 页面回退占位图而不是破图 → Task 4 人工清单 + Task 2b 的回退逻辑

---

### Task 1: pack 契约 @2（五类型 + cover）

**Files:**
- Modify: `src/wxhl-cygf/pack/manifest.ts`
- Create: `src/wxhl-cygf/pack/entries.ts`（由旧 `extension.ts` 改名演化）
- Delete: `src/wxhl-cygf/pack/extension.ts`、`src/wxhl-cygf/pack/character.ts`
- Create: `src/wxhl-cygf/pack/mechanism.ts`、`src/wxhl-cygf/pack/event.ts`、`src/wxhl-cygf/pack/dungeon.ts`、`src/wxhl-cygf/pack/persona.ts`
- Modify: `src/wxhl-cygf/pack/build.ts`（去属性数值）、`src/wxhl-cygf/pack/index.ts`
- Test: `src/wxhl-cygf/__tests__/pack.test.ts`（重写）

**Interfaces:**
- Produces（Task 2/3 依赖）:
  - `PackManifest`、`PackType`（`z.enum(['dungeon','event','mechanism','build','persona'])`）
  - `EntrySchema`（世界书条目，字段同一期 `ExtensionEntry`，**不改**）
  - `MechanismPack`（`type:'mechanism'` + `条目: EntrySchema[]`）
  - `EventPack`（`type:'event'` + `事件条目: EntrySchema[]` + `控制器条目?: {名称,正文}`）
  - `DungeonPack`（`type:'dungeon'` + 4.1 字段 + `额外条目?: EntrySchema[]`）
  - `BuildPack` / `PersonaPack`
  - `ContentPack = z.discriminatedUnion('type', [...])`（五成员）

- [ ] **Step 1: Write the failing test**

```typescript
// src/wxhl-cygf/__tests__/pack.test.ts
import { describe, expect, it } from 'vitest';
import { ContentPack, EventPack, MechanismPack } from '../pack';
import { BuildPack } from '../pack/build';
import { DungeonPack } from '../pack/dungeon';
import { PersonaPack } from '../pack/persona';

const base = {
  format: 'wxhl-mod@2', id: 'p1', name: '雾中列车', version: '1.0.0',
  author: { name: '作者' }, description: '一列永远到不了站的列车', cover: 'https://x.test/c.png',
};
const entry = { name: '时刻表', content: '正文', keys: ['列车'] };

describe('外壳 · format/cover/必填', () => {
  it('@2 合法包通过', () => {
    expect(MechanismPack.safeParse({ ...base, type: 'mechanism', 条目: [entry] }).success).toBe(true);
  });

  it('@1 旧版本被拒（不做向后兼容）', () => {
    expect(MechanismPack.safeParse({ ...base, format: 'wxhl-mod@1', type: 'mechanism', 条目: [entry] }).success).toBe(false);
  });

  it('cover 留空可以，但破坏属性的 URL 必须拒（Review Focus #1）', () => {
    expect(MechanismPack.safeParse({ ...base, cover: '', type: 'mechanism', 条目: [entry] }).success).toBe(true);
    for (const bad of ['https://x.test/a.png" onerror="alert(1)', 'javascript:alert(1)', 'https://x.test/a b.png', 'https://x.test/a.png<script>']) {
      expect(MechanismPack.safeParse({ ...base, cover: bad, type: 'mechanism', 条目: [entry] }).success).toBe(false);
    }
  });

  it('简介必填（列表卡片要显示）', () => {
    expect(MechanismPack.safeParse({ ...base, description: '', type: 'mechanism', 条目: [entry] }).success).toBe(false);
  });

  it('未知 type 被拒', () => {
    expect(ContentPack.safeParse({ ...base, type: 'extension', 条目: [entry] }).success).toBe(false);
  });
});

describe('event · 命名规范', () => {
  it('全部条目以 事件_ 开头 → 通过；带控制器也行', () => {
    const ok = EventPack.safeParse({
      ...base, type: 'event',
      事件条目: [{ name: '事件_雾中列车_开演', content: '正文', keys: ['雾中列车'] }],
      控制器条目: { 名称: 'EJS/雾中列车控制器', 正文: "<% await getwi('事件_雾中列车_开演') %>" },
    });
    expect(ok.success).toBe(true);
  });

  it('条目名没有 事件_ 前缀 → 拒绝（Review Focus #3）', () => {
    const bad = EventPack.safeParse({ ...base, type: 'event', 事件条目: [{ name: '开演', content: '正文', keys: ['k'] }] });
    expect(bad.success).toBe(false);
  });

  it('控制器名必须以 EJS/ 开头', () => {
    const bad = EventPack.safeParse({
      ...base, type: 'event',
      事件条目: [{ name: '事件_a', content: '正文', keys: ['k'] }],
      控制器条目: { 名称: '控制器', 正文: '<% %>' },
    });
    expect(bad.success).toBe(false);
  });
});

describe('dungeon · 对齐主卡副本结构', () => {
  const dungeon = {
    ...base, type: 'dungeon',
    副本名称: '雾中列车', 副本类型: '和平', 基准等级: 3, 时间限制: '三天',
    背景设定: '…', 地图与区域: '…', 敌人配置: '…',
    主线任务: { 名称: '活着下车', 说明: '…', 奖励: '…' },
    支线任务: [{ 名称: '找到乘务员', 说明: '…', 奖励: '…' }],
    世界事件: [], 隐藏任务: [], 成就: [],
    GM指导: '节奏偏慢，鼓励探索',
  };

  it('合法副本通过；副本类型限三选一', () => {
    expect(DungeonPack.safeParse(dungeon).success).toBe(true);
    expect(DungeonPack.safeParse({ ...dungeon, 副本类型: '恐怖' }).success).toBe(false);
  });

  it('缺背景设定/GM指导 → 拒绝', () => {
    expect(DungeonPack.safeParse({ ...dungeon, 背景设定: '' }).success).toBe(false);
    expect(DungeonPack.safeParse({ ...dungeon, GM指导: '' }).success).toBe(false);
  });

  it('额外条目可选，字段同世界书条目', () => {
    expect(DungeonPack.safeParse({ ...dungeon, 额外条目: [entry] }).success).toBe(true);
  });
});

describe('build · 去掉属性数值，只留分配方向', () => {
  const build = {
    构筑名: '重装堡垒', 定位: '物理破坏配合高容错换血',
    属性分配方向: { 主属性: 'STR', 副属性: 'CON' },
    职业: { 名称: '卫士', 稀有度: '蓝色' },
    通用技能: { 横扫: { 类型: '主动' } },
    主要装备: { 主武器: { 名称: '斩首大剑' } },
  };

  it('合法构筑通过，默认字段补齐', () => {
    const parsed = BuildPack.parse({ ...base, type: 'build', build });
    expect(parsed.build.属性分配方向.主属性).toBe('STR');
    expect(parsed.build.天赋.名称).toBe('无');
    expect(parsed.build.职业.转职树.名称).toBe('无');
    expect(parsed.build.主要装备.主武器.名称).toBe('斩首大剑');
    expect(parsed.build.主要装备.躯干.名称).toBe('无');
  });

  it('不再有 属性基础 这种数值字段（性质：未知键被 strip，不报错）', () => {
    const parsed = BuildPack.parse({ ...base, type: 'build', build: { ...build, 属性基础: { STR: 99 } } });
    expect('属性基础' in parsed.build).toBe(false);
  });

  it('主属性必须是四维之一', () => {
    expect(BuildPack.safeParse({ ...base, type: 'build', build: { ...build, 属性分配方向: { 主属性: 'LUK' } } }).success).toBe(false);
  });
});

describe('persona · 人设', () => {
  const persona = { 角色名: '雾中剑客', 性格: '沉默', 爱好: ['擦拭佩剑'], 厌恶: ['喧嚣'], 背景故事: '…' };

  it('合法人设通过；爱好/厌恶默认空数组', () => {
    const parsed = PersonaPack.parse({ ...base, type: 'persona', persona });
    expect(parsed.persona.构筑方向).toBe('');
    expect(PersonaPack.parse({ ...base, type: 'persona', persona: { 角色名: 'x', 性格: '', 背景故事: 'y' } }).persona.爱好).toEqual([]);
  });

  it('缺角色名/背景故事 → 拒绝', () => {
    expect(PersonaPack.safeParse({ ...base, type: 'persona', persona: { ...persona, 角色名: '' } }).success).toBe(false);
    expect(PersonaPack.safeParse({ ...base, type: 'persona', persona: { ...persona, 背景故事: '' } }).success).toBe(false);
  });

  it('可选构筑：粘贴合法 BuildPayload 时填入', () => {
    const parsed = PersonaPack.parse({ ...base, type: 'persona', persona: { ...persona, 构筑方向: '走高闪避', 构筑: { 构筑名: '雾中剑客', 定位: 'x' } } });
    expect(parsed.persona.构筑?.构筑名).toBe('雾中剑客');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wxhl-cygf/__tests__/pack.test.ts`
Expected: FAIL（模块/导出不存在）

- [ ] **Step 3: Write minimal implementation**

`pack/manifest.ts`：

```typescript
import { z } from 'zod';

export const PackAuthor = z.object({
  name: z.string().min(1),
  discord: z.string().prefault(''),
});

/** 五个并列分类——与页面顶部导航一一对应 */
export const PackType = z.enum(['dungeon', 'event', 'mechanism', 'build', 'persona']);
export const PACK_TYPE_LABEL: Record<z.infer<typeof PackType>, string> = {
  dungeon: '副本', event: '事件', mechanism: '机制拓展', build: '构筑', persona: '人设',
};

/** 封面：空串可以；非空必须是干净的 http(s) 链接（挡 `" onerror=…` 这类属性逃逸） */
const CoverUrl = z.union([
  z.literal(''),
  z.string().regex(/^https?:\/\/[^\s"'<>\\]+$/, '封面须是 http(s) 图片链接，且不含空白/引号/尖括号'),
]);

export const PackManifest = z.object({
  format: z.literal('wxhl-mod@2'),
  id: z.string().min(1),
  name: z.string().min(1),
  type: PackType,
  version: z.string().regex(/^\d+\.\d+\.\d+$/, '版本号须为 x.y.z'),
  author: PackAuthor,
  tags: z.array(z.string()).prefault([]),
  description: z.string().min(1, '需要一句话简介（列表卡片要显示）'),
  cover: CoverUrl.prefault(''),
  requires: z.object({ cardVersion: z.string().prefault('') }).prefault({}),
});
```

`pack/entries.ts`（原 extension.ts 的 `ExtensionEntry` 改名 `EntrySchema`，字段一字不改）：

```typescript
import { z } from 'zod';

export const EntrySchema = z
  .object({
    name: z.string().min(1).describe('条目名'),
    content: z.string().min(1).describe('条目正文'),
    enabled: z.boolean().prefault(true),
    constant: z.boolean().prefault(false).describe('true=蓝灯常驻；false=绿灯按关键词激活'),
    keys: z.array(z.string().min(1)).prefault([]).describe('绿灯主关键词'),
    keysSecondary: z.array(z.string().min(1)).prefault([]),
    position: z.enum(['before_char', 'after_char', 'at_depth']).prefault('after_char'),
    depth: z.coerce.number().int().min(0).prefault(0),
    order: z.coerce.number().int().prefault(100),
    probability: z.coerce.number().min(0).max(100).prefault(100),
    sticky: z.coerce.number().int().min(0).nullable().prefault(null),
    cooldown: z.coerce.number().int().min(0).nullable().prefault(null),
    delay: z.coerce.number().int().min(0).nullable().prefault(null),
    preventRecursion: z.boolean().prefault(false),
    excludeRecursion: z.boolean().prefault(false),
  })
  .refine(entry => entry.constant || entry.keys.length > 0, { message: '绿灯条目至少需要一个主关键词（或设 constant: true 为蓝灯）' });
```

`pack/mechanism.ts`：

```typescript
import { z } from 'zod';
import { EntrySchema } from './entries';
import { PackManifest } from './manifest';

export const MechanismPack = PackManifest.extend({
  type: z.literal('mechanism'),
  条目: z.array(EntrySchema).min(1, '机制拓展至少要有一条世界书条目'),
});
```

`pack/event.ts`：

```typescript
import { z } from 'zod';
import { EntrySchema } from './entries';
import { PackManifest } from './manifest';

export const ControllerSchema = z.object({
  名称: z.string().regex(/^EJS\//, '控制器条目名必须以 EJS/ 开头'),
  正文: z.string().min(1).describe('EJS 模板正文，用 getwi(\\'事件_…\\') 挑事件'),
});

export const EventPack = PackManifest.extend({
  type: z.literal('event'),
  事件条目: z
    .array(EntrySchema)
    .min(1, '事件包至少要有一条事件条目')
    .refine(entries => entries.every(e => e.name.startsWith('事件_')), {
      message: '事件条目名必须以 事件_ 开头（推荐 事件_<包名>_<事件名>，避免与其他包撞名）',
    }),
  控制器条目: ControllerSchema.optional(),
});
```

`pack/dungeon.ts`：

```typescript
import { z } from 'zod';
import { EntrySchema } from './entries';
import { PackManifest } from './manifest';

const 任务Schema = z.object({ 名称: z.string().min(1), 说明: z.string().min(1), 奖励: z.string().prefault('') });
const 成就Schema = z.object({ 名称: z.string().min(1), 说明: z.string().min(1), 难度: z.string().prefault(''), 奖励: z.string().prefault('') });

export const DungeonPack = PackManifest.extend({
  type: z.literal('dungeon'),
  副本名称: z.string().min(1),
  副本类型: z.enum(['和平', '阵营', '血腥']),
  基准等级: z.coerce.number().int().min(1).prefault(1),
  时间限制: z.string().prefault('未指定'),
  背景设定: z.string().min(1),
  地图与区域: z.string().min(1),
  敌人配置: z.string().min(1),
  主线任务: 任务Schema,
  支线任务: z.array(任务Schema).prefault([]),
  世界事件: z.array(任务Schema).prefault([]),
  隐藏任务: z.array(任务Schema).prefault([]),
  成就: z.array(成就Schema).prefault([]),
  GM指导: z.string().min(1, 'GM 指导不能为空（主持话术与判定口径）'),
  额外条目: z.array(EntrySchema).prefault([]),
});
```

`pack/build.ts`（**去掉属性数值**；技能/装备槽子 schema 保留原样）：

```typescript
import { z } from 'zod';
import { PackManifest } from './manifest';

// —— 以下三个子 schema 与一期一致（对齐主卡 变量结构_特殊资源通用版.json），不改 ——
export const 技能Schema = z.object({
  分类: z.string().prefault('基础'), 类型: z.string().prefault('主动'), 行动类型: z.string().prefault('主要行动'),
  关联属性: z.string().prefault(''), 消耗: z.string().prefault(''), 冷却: z.string().prefault(''), 射程: z.string().prefault(''),
  目标: z.string().prefault(''), 阶位: z.string().prefault(''), 属性要求: z.string().prefault(''),
  等级: z.coerce.number().prefault(1), 效果: z.record(z.string(), z.any()).prefault({}),
}).catchall(z.any()).prefault({});

export const 装备槽Schema = z.object({
  名称: z.string().prefault('无'), 类型: z.string().prefault('无'), 品质: z.string().prefault('无'), 阶位: z.string().prefault('无'),
  穿戴门槛: z.string().prefault('无'), 强化等级: z.coerce.number().prefault(0), 伤害骰: z.string().prefault('无'),
  倍率: z.coerce.number().prefault(0), 主属性: z.string().prefault('无'), 副属性: z.string().prefault('无'),
  主属性加成: z.coerce.number().prefault(0), 副属性加成: z.coerce.number().prefault(0),
  装备防御: z.coerce.number().prefault(0), 装备闪避: z.coerce.number().prefault(0), 负重: z.coerce.number().prefault(0),
  效果: z.record(z.string(), z.string()).prefault({}), 描述: z.string().prefault('无'), 数量: z.coerce.number().prefault(1),
}).prefault({});

export const 装备Schema = z.object({
  主武器: 装备槽Schema, 副武器: 装备槽Schema, 头部: 装备槽Schema,
  躯干: 装备槽Schema, 手部: 装备槽Schema, 下装: 装备槽Schema, 饰品: 装备槽Schema,
}).prefault({});

const 头部组件Schema = z.object({
  名称: z.string().prefault('无'), 品质: z.string().prefault('无'),
  属性加成: z.string().prefault('无'), 效果: z.record(z.string(), z.string()).prefault({}),
}).prefault({});

/** 只给方向，不给数值（用户 2026-10-11 定稿） */
export const 属性方向Schema = z.object({
  主属性: z.enum(['STR', 'AGI', 'CON', 'PER']),
  副属性: z.enum(['STR', 'AGI', 'CON', 'PER', '无']).prefault('无'),
});

export const 职业Schema = z.object({
  名称: z.string().prefault('无'), 稀有度: z.string().prefault('无'),
  职业特性: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.any())])).prefault({}),
  职业技能: z.record(z.string(), 技能Schema).prefault({}),
  传承技能: z.record(z.string(), 技能Schema).prefault({}),
  转职树: z.object({ 名称: z.string().prefault('无'), 分支: z.record(z.string(), z.any()).prefault({}) }).prefault({}),
}).catchall(z.any()).prefault({});

export const BuildPayload = z.object({
  构筑名: z.string().min(1),
  定位: z.string().min(1).describe('战术流派/小队定位一句话'),
  属性分配方向: 属性方向Schema,
  天赋: 头部组件Schema,
  血统: 头部组件Schema,
  称号: z.object({ 名称: z.string().prefault('无'), 效果: z.record(z.string(), z.string()).prefault({}) }).prefault({}),
  职业: 职业Schema,
  通用技能: z.record(z.string(), 技能Schema).prefault({}),
  主要装备: 装备Schema,
  背包建议: z.record(z.string(), z.object({ 描述: z.string().prefault(''), 数量: z.coerce.number().prefault(1) }).catchall(z.any())).prefault({}),
});

export const BuildPack = PackManifest.extend({
  type: z.literal('build'),
  build: BuildPayload,
});
```

`pack/persona.ts`：

```typescript
import { z } from 'zod';
import { BuildPayload } from './build';
import { PackManifest } from './manifest';

export const PersonaPayload = z.object({
  角色名: z.string().min(1),
  性格: z.string().prefault(''),
  爱好: z.array(z.string()).prefault([]),
  厌恶: z.array(z.string()).prefault([]),
  背景故事: z.string().min(1),
  构筑方向: z.string().prefault('').describe('自由文本：粗浅写构筑思路即可'),
  构筑: BuildPayload.optional().describe('可选：粘贴一份完整构筑'),
});

export const PersonaPack = PackManifest.extend({
  type: z.literal('persona'),
  persona: PersonaPayload,
});
```

`pack/index.ts`：

```typescript
import { z } from 'zod';
import { BuildPack } from './build';
import { DungeonPack } from './dungeon';
import { EventPack } from './event';
import { MechanismPack } from './mechanism';
import { PersonaPack } from './persona';

export { PackManifest, PackType, PACK_TYPE_LABEL, PackAuthor } from './manifest';
export { EntrySchema } from './entries';
export { MechanismPack } from './mechanism';
export { EventPack, ControllerSchema } from './event';
export { DungeonPack } from './dungeon';
export { BuildPack, BuildPayload, 技能Schema, 装备槽Schema, 装备Schema } from './build';
export { PersonaPack, PersonaPayload } from './persona';

export const ContentPack = z.discriminatedUnion('type', [DungeonPack, EventPack, MechanismPack, BuildPack, PersonaPack]);
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wxhl-cygf/` — 全绿（含既有 actions/bridge/panel/discord/ball 测试）
Run: `npm run build` — 成功

- [ ] **Step 5: Commit**

```bash
git add src/wxhl-cygf dist/wxhl-cygf
git commit -m "feat(wxhl-cygf): 包格式 @2 —— 五类并列（副本/事件/机制拓展/构筑/人设）+ 封面字段"
```

---

### Task 2a: 页面逻辑 —— 世界书 JSON 导入器（移植补丁）

**Files:**
- Modify: `cloudflare/wxhl-cygf/page-lib.js`（追加导入器导出）
- Test: `cloudflare/wxhl-cygf/page-lib.test.js`（追加 describe）

**Interfaces:**
- Produces（Task 4 页面依赖）: `MAX_IMPORT_BYTES`、`MAX_IMPORT_ENTRIES`、`parseWorldbookJson(text, filename)` → `{ name, entries, summary:{total,disabled,generatedNames} }`；抛错即整次拒绝

**移植要求**：逻辑照 `worldbook-json-import.mjs`（用户提供的补丁）**逐条搬到 page-lib.js**，保留其全部判断与错误文案口径。要点：

- 入口校验：非字符串 / 文件 > 10MB / JSON 坏 / 没有 `entries` / 全局设置（`scan_depth`/`token_budget`/`recursive_scanning`/`extensions`）有值 → 拒绝
- 条目校验：正文非空字符串；必须含 `key`/`comment`/`uid`/`disable` 之一（判定是原生世界书条目）；绿灯必须有主关键词
- 位置映射：`0 → before_char`、`1 → after_char`、`4 → at_depth`，其余拒绝
- **不支持设置整次拒绝并点名**：`vectorized/ignoreBudget/matchPersonaDescription/matchCharacterDescription/matchCharacterPersonality/matchCharacterDepthPrompt/matchScenario/matchCreatorNotes/delayUntilRecursion/outletName/group/automationId/characterFilterNames/characterFilterTags/characterFilterExclude/triggers/extensions/characterFilter`、显式给了 `scanDepth/caseSensitive/matchWholeWords`、非 AND_ANY 的 `selectiveLogic`、非 system 的 `role`、任何未知字段
- `order` 原样保留；正文（含 EJS/HTML 与换行）逐字保留；`keysSecondary` 在 `selective === false` 时丢弃
- 未命名条目生成 `条目 N` 并计数；错误聚合成一条消息（列前 10 条）

- [ ] **Step 1: Write the failing test**（追加到 `page-lib.test.js`）

```javascript
describe('世界书 JSON 导入器', () => {
  const book = (entries, extra = {}) => JSON.stringify({ name: '我的世界书', entries: Object.fromEntries(entries.map((e, i) => [String(i), e])), ...extra });
  const native = (over = {}) => ({ uid: 1, key: ['雾'], keysecondary: [], comment: '时刻表', content: '正文\n第二行', constant: false, disable: false, selective: true, position: 1, depth: 4, order: 100, probability: 100, useProbability: true, ...over });

  it('原生世界书 → 映射成工坊条目（保留正文换行/EJS、关键词、位置、递归）', () => {
    const r = parseWorldbookJson(book([native({ preventRecursion: true, sticky: 2 })]), '我的世界书.json');
    expect(r.name).toBe('我的世界书');
    expect(r.entries[0]).toMatchObject({
      name: '时刻表', content: '正文\n第二行', enabled: true, constant: false,
      keys: ['雾'], position: 'after_char', order: 100, preventRecursion: true, sticky: 2, cooldown: null,
    });
    expect(r.summary).toEqual({ total: 1, disabled: 0, generatedNames: 0 });
  });

  it('位置 0/1/4 分别映射；其他位置整次拒绝并点名', () => {
    expect(parseWorldbookJson(book([native({ position: 0 })]), 'x.json').entries[0].position).toBe('before_char');
    expect(parseWorldbookJson(book([native({ position: 4, depth: 2 })]), 'x.json').entries[0].position).toBe('at_depth');
    expect(() => parseWorldbookJson(book([native({ position: 2 })]), 'x.json')).toThrow(/插入位置/);
  });

  it('高级设置整次拒绝并点名（Review Focus #2）', () => {
    expect(() => parseWorldbookJson(book([native({ vectorized: true })]), 'x.json')).toThrow(/vectorized/);
    expect(() => parseWorldbookJson(book([native({ scanDepth: 2 })]), 'x.json')).toThrow(/scanDepth/);
    expect(() => parseWorldbookJson(book([native({ group: 'g' })]), 'x.json')).toThrow(/group/);
    // 整次拒绝：一条坏的，另一条好的也不能偷偷进去
    expect(() => parseWorldbookJson(book([native({ comment: '好条目' }), native({ vectorized: true })]), 'x.json')).toThrow(/尚未导入|不能保留/);
  });

  it('绿灯没有主关键词 → 拒绝（服务器也不接受）', () => {
    expect(() => parseWorldbookJson(book([native({ key: [] })]), 'x.json')).toThrow(/主关键词/);
  });

  it('禁用条目也照原样带来；未命名条目自动生成名字并计数', () => {
    const r = parseWorldbookJson(book([native({ disable: true, comment: '' })]), 'x.json');
    expect(r.entries[0].enabled).toBe(false);
    expect(r.entries[0].name).toBe('条目 1');
    expect(r.summary.generatedNames).toBe(1);
    expect(r.summary.disabled).toBe(1);
  });

  it('坏输入：非 JSON / 无 entries / 全局设置 / 巨大文件 → 人话报错', () => {
    expect(() => parseWorldbookJson('{oops', 'x.json')).toThrow(/JSON/);
    expect(() => parseWorldbookJson(JSON.stringify({ name: 'x' }), 'x.json')).toThrow(/entries/);
    expect(() => parseWorldbookJson(book([native()], { token_budget: 100 }), 'x.json')).toThrow(/全局设置/);
    expect(() => parseWorldbookJson('x'.repeat(MAX_IMPORT_BYTES + 1), 'x.json')).toThrow(/过大/);
  });

  it('selective=false 时丢弃次要关键词；保留正则与逗号', () => {
    const r = parseWorldbookJson(book([native({ selective: false, keysecondary: ['b'], key: ['/雾.*车/', 'a,b'] })]), 'x.json');
    expect(r.entries[0].keys).toEqual(['/雾.*车/', 'a,b']);
    expect(r.entries[0].keysSecondary).toEqual([]);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run cloudflare/wxhl-cygf/page-lib.test.js`
Expected: FAIL（`parseWorldbookJson is not a function`）

- [ ] **Step 3: Write minimal implementation**

在 `page-lib.js` 末尾追加（照补丁逐条移植，函数名/导出名按上面 Interfaces）：

```javascript
// ==================== 世界书 JSON 导入（移植自用户提供补丁 worldbook-json-import.mjs） ====================
export const MAX_IMPORT_BYTES = 10 * 1024 * 1024;
export const MAX_IMPORT_ENTRIES = 2000;

const IMPORT_POSITIONS = new Map([[0, 'before_char'], [1, 'after_char'], [4, 'at_depth']]);
const KNOWN_WORLDBOOK_FIELDS = new Set([ /* 与补丁 KNOWN_FIELDS 完全一致，逐字抄 */ ]);
const UNSUPPORTED_NONEMPTY_FIELDS = [ /* vectorized…characterFilter 那 18 个，逐字抄 */ ];
const UNSUPPORTED_IF_PRESENT = ['scanDepth', 'caseSensitive', 'matchWholeWords'];
const GLOBAL_UNSUPPORTED = ['scan_depth', 'token_budget', 'recursive_scanning', 'extensions'];

const isPlainObject = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const hasOwn = (o, k) => Object.prototype.hasOwnProperty.call(o, k);
const hasData = v => { /* 与补丁一致 */ };

function importBool(entry, field, fallback) { /* 非布尔 → 抛 `${field} 必须是布尔值` */ }
function importNumber(entry, field, fallback, opts) { /* 与补丁一致 */ }
function importNullableNumber(entry, field) { /* 与补丁一致 */ }
function importKeywords(entry, field) { /* 必须是非空字符串数组 */ }
function checkUnsupportedSettings(entry, constant, secondaryKeys, position) { /* 与补丁一致，返回错误列表 */ }
function convertWorldbookEntry(entry, index) { /* 与补丁 convertEntry 一致（含 name 生成与 generatedName 标记） */ }

export function parseWorldbookJson(text, filename = '世界书.json') { /* 与补丁 parseWorldbookJson 一致：入口校验 → 逐条 convert → 有错就整次抛 */ }
```

（**逐字对照补丁文件实现，不自己发挥**；错误文案保持一致，便于玩家对照说明。）

- [ ] **Step 4: Run test to verify it passes + Commit**

Run: `npx vitest run cloudflare/wxhl-cygf/` — 全绿

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): 世界书 JSON 导入并进页面逻辑层（移植用户补丁，整次拒绝不静默丢弃）"
```

---

### Task 2b: 页面逻辑 —— 五类渲染器与映射

**Files:**
- Modify: `cloudflare/wxhl-cygf/page-lib.js`
- Test: `cloudflare/wxhl-cygf/page-lib.test.js`

**Interfaces:**
- Produces（Task 4 依赖）: `packToWorldbookEntries(pack)`（支持五类）、`sourceMetaOf(pack)`、`PACK_TYPE_LABEL`、`coverOrPlaceholder(cover)`、`renderDungeonEntry/ renderBuildEntry / renderPersonaEntry`

- [ ] **Step 1: Write the failing test**（追加）

```javascript
describe('五类包 → 世界书条目', () => {
  const manifest = { format: 'wxhl-mod@2', id: 'p1', name: '雾中列车', version: '1.0.0', author: { name: 'a' }, description: 'd', cover: '', tags: [], requires: {} };

  it('mechanism → 逐条映射，名字加 包名 前缀', () => {
    const entries = packToWorldbookEntries({ ...manifest, type: 'mechanism', 条目: [{ name: '时刻表', content: 'x', keys: ['列车'] }] });
    expect(entries).toHaveLength(1);
    expect(entries[0].name).toBe('[回廊mod][机制拓展]雾中列车·时刻表');
    expect(entries[0].strategy.type).toBe('selective');
  });

  it('event → 条目原样（保留 事件_ 名）+ 控制器条目', () => {
    const entries = packToWorldbookEntries({
      ...manifest, type: 'event',
      事件条目: [{ name: '事件_雾中列车_开演', content: 'x', keys: ['开演'] }],
      控制器条目: { 名称: 'EJS/雾中列车控制器', 正文: '<% %>' },
    });
    expect(entries.map(e => e.name)).toEqual(['事件_雾中列车_开演', 'EJS/雾中列车控制器']);
    expect(entries[1].content).toBe('<% %>');
    expect(entries[1].strategy.type).toBe('constant'); // 控制器必须常驻才跑得到
  });

  it('dungeon → 1 条副本条目 + 额外条目', () => {
    const entries = packToWorldbookEntries({
      ...manifest, type: 'dungeon',
      副本名称: '雾中列车', 副本类型: '和平', 基准等级: 3, 时间限制: '三天',
      背景设定: 'bg', 地图与区域: 'map', 敌人配置: 'foe',
      主线任务: { 名称: '活着下车', 说明: 'm', 奖励: 'r' }, 支线任务: [], 世界事件: [], 隐藏任务: [], 成就: [],
      GM指导: 'gm', 额外条目: [{ name: '列车员', content: 'npc', keys: ['列车员'] }],
    });
    expect(entries).toHaveLength(2);
    expect(entries[0].name).toBe('[回廊mod][副本]雾中列车');
    expect(entries[0].strategy.keys).toEqual(['雾中列车']);
    expect(entries[0].content).toContain('GM 指导');
    expect(entries[0].content).toContain('活着下车');
    expect(entries[1].name).toBe('[回廊mod][副本]雾中列车·列车员');
  });

  it('build → 单条，正文含属性方向与主要装备（不含具体数值）', () => {
    const text = renderBuildEntry({ 构筑名: '重装堡垒', 定位: '换血', 属性分配方向: { 主属性: 'STR', 副属性: 'CON' }, 职业: { 名称: '卫士' }, 主要装备: { 主武器: { 名称: '斩首大剑' } } });
    expect(text).toContain('重装堡垒');
    expect(text).toContain('主 STR');
    expect(text).toContain('斩首大剑');
  });

  it('persona → 单条，含五要素；有构筑方向时带上', () => {
    const text = renderPersonaEntry({ 角色名: '雾中剑客', 性格: '沉默', 爱好: ['擦剑'], 厌恶: ['吵'], 背景故事: 'bg', 构筑方向: '高闪避流血' });
    expect(text).toContain('雾中剑客');
    expect(text).toContain('擦剑');
    expect(text).toContain('高闪避流血');
  });

  it('coverOrPlaceholder：空串与非法都回退到内置占位图（不产生破图）', () => {
    expect(coverOrPlaceholder('https://x.test/a.png')).toBe('https://x.test/a.png');
    expect(coverOrPlaceholder('')).toMatch(/^data:image\/svg\+xml/);
    expect(coverOrPlaceholder('javascript:alert(1)')).toMatch(/^data:image\/svg\+xml/);
  });
});
```

- [ ] **Step 2-3: 实现**（`page-lib.js`）

`packToWorldbookEntries` 改为按 `type` 分派：

```javascript
export const PACK_TYPE_LABEL = { dungeon: '副本', event: '事件', mechanism: '机制拓展', build: '构筑', persona: '人设' };

export function packToWorldbookEntries(pack) {
  const label = PACK_TYPE_LABEL[pack.type] ?? '内容';
  const prefix = entry => `[回廊mod][${label}]${pack.name}·${entry.name}`;
  if (pack.type === 'mechanism') {
    return (pack.条目 ?? []).map(e => ({ ...mapExtensionEntry(e), name: prefix(e) }));
  }
  if (pack.type === 'event') {
    const list = (pack.事件条目 ?? []).map(e => ({ ...mapExtensionEntry(e), name: e.name })); // 事件名保持原样（控制器按名取）
    if (pack.控制器条目) {
      list.push({ ...blankEntry(), name: pack.控制器条目.名称, content: pack.控制器条目.正文, strategy: { type: 'constant', keys: [], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' } });
    }
    return list;
  }
  if (pack.type === 'dungeon') {
    const list = [{
      ...blankEntry(),
      name: `[回廊mod][副本]${pack.name}`,
      strategy: { type: 'selective', keys: [pack.副本名称], keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
      content: renderDungeonEntry(pack),
    }];
    for (const e of pack.额外条目 ?? []) list.push({ ...mapExtensionEntry(e), name: prefix(e) });
    return list;
  }
  const payload = pack.type === 'build' ? pack.build : pack.persona;
  const keys = pack.type === 'build' ? [payload.构筑名] : [payload.角色名];
  return [{
    ...blankEntry(),
    name: `[回廊mod][${label}]${pack.name}`,
    strategy: { type: 'selective', keys, keys_secondary: { logic: 'and_any', keys: [] }, scan_depth: 'same_as_global' },
    content: pack.type === 'build' ? renderBuildEntry(payload) : renderPersonaEntry(payload),
  }];
}
```

渲染器（`renderDungeonEntry` 按 4.1 字段排版，含「GM 指导」小节；`renderBuildEntry` 去掉属性数值、改印「属性分配方向：主 X / 副 Y」；`renderPersonaEntry` 印五要素 + 构筑方向或嵌构筑）。`coverOrPlaceholder(cover)` 返回合法 URL 或内置 `data:image/svg+xml` 占位图（深色底 + 🧩）。

- [ ] **Step 4: Run test to verify it passes + Commit**

Run: `npx vitest run cloudflare/wxhl-cygf/`

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): 页面逻辑支持五类包 —— 渲染器/映射/封面占位"
```

---

### Task 3: Worker —— cover 列迁移与五类型元数据

**Files:**
- Modify: `cloudflare/wxhl-cygf/worker.ts`
- Test: `cloudflare/wxhl-cygf/worker.test.js`、`cloudflare/wxhl-cygf/db.test.js`

**Interfaces:**
- Consumes: Task 1 的 `ContentPack`（五类型 + cover）
- Produces: 列表/详情元数据含 `cover`、`type`、`typeLabel`

- [ ] **Step 1: Write the failing test**（追加到 `worker.test.js`）

```javascript
describe('cover 与五类型', () => {
  const v2 = (over = {}) => ({
    format: 'wxhl-mod@2', id: 'x', name: '雾中列车', version: '1.0.0', author: { name: 'a' },
    description: '简介', cover: 'https://x.test/c.png', tags: [], requires: {},
    type: 'mechanism', 条目: [{ name: 'n', content: 'c', keys: ['k'] }], ...over,
  });

  it('上传 @2 包 → 201，列表/详情都带 cover', async () => {
    const up = await worker.fetch(postJson('/api/packs', v2()), env());
    expect(up.status).toBe(201);
    const { id } = await up.json();
    const list = await (await worker.fetch(get('/api/packs'), env())).json();
    expect(list.packs[0]).toMatchObject({ cover: 'https://x.test/c.png', type: 'mechanism', typeLabel: '机制拓展' });
    const detail = await (await worker.fetch(get(`/api/packs/${id}`), env())).json();
    expect(detail.pack.cover).toBe('https://x.test/c.png');
  });

  it('老库里的 @1 包（pack_json 是旧格式）不炸列表，cover 回退空串（Review Focus #4）', async () => {
    await insertPack(db, { ...row(), type: 'extension', pack_json: JSON.stringify({ format: 'wxhl-mod@1', type: 'extension' }), cover: '' });
    const res = await worker.fetch(get('/api/packs'), env());
    expect(res.status).toBe(200);
    const list = await res.json();
    expect(list.packs[0].cover).toBe('');
    expect(list.packs[0].typeLabel).toBe('内容'); // 未知/旧 type 回退通用标签，不崩
  });
});
```

（`row()` 用 db.test.js 里的同名 helper；worker.test.js 里请直接内联一份最小的 `row()`。）

- [ ] **Step 2: Run test to verify it fails** → `npx vitest run cloudflare/wxhl-cygf/worker.test.js`

- [ ] **Step 3: Write minimal implementation**

```typescript
// ensureSchema：加列走 ALTER（CREATE TABLE IF NOT EXISTS 不会改老表结构）
await db.prepare(`ALTER TABLE packs ADD COLUMN cover TEXT NOT NULL DEFAULT ''`).run().catch(() => {}); // 列已存在时报错属预期

// PackRow / PackListRow 加 cover: string
// insertPack 的 INSERT 列表加 cover
// toMeta 加 cover: row.cover ?? '' 与 typeLabel: PACK_TYPE_LABEL[row.type as keyof typeof PACK_TYPE_LABEL] ?? '内容'
// toRow 从 pack.cover ?? '' 取值
```

`PACK_TYPE_LABEL` 从 `../../src/wxhl-cygf/pack` 导入（单一真源）。

- [ ] **Step 4: Run test to verify it passes + Commit**

Run: `npx vitest run cloudflare/wxhl-cygf/`；`npx eslint cloudflare/wxhl-cygf src/wxhl-cygf`

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): Worker 支持封面列与五类型元数据（ALTER 迁移，旧包不炸）"
```

---

### Task 4: workshop.html 重做（顶部导航 + 卡片四要素 + 上传五表单 + 导入）

**Files:**
- Modify: `cloudflare/wxhl-cygf/workshop.html`（整页重做）

**Interfaces:**
- Consumes: `page-lib.js` 全部导出（`PACK_TYPE_LABEL`、`parseWorldbookJson`、`packToWorldbookEntries`、`coverOrPlaceholder`、`api`、`createBridgeClient`、`computeInstalled`、`sourceMetaOf`、`isAgreementAccepted`、`acceptAgreement`）

无 jsdom：本任务不做自动化测试，靠 `node --check` 抽取脚本 + Task 5 人工清单。

- [ ] **Step 1: 重写页面**，要求逐条落实：

1. **免责声明**（保留现有逻辑与文案）
2. **顶部区**：标题「回廊创意工坊」+ **一排并列分类按钮**（全部/副本/事件/机制拓展/构筑/人设，当前项高亮，点击即筛选并回到第一页）+ 搜索框 + 「上传」按钮
3. **桥状态条**（保留：握手失败 → 横幅 + 禁用装/卸）
4. **列表**：卡片网格，每张卡 **封面图（`coverOrPlaceholder`，`img.onerror` 回退占位）+ 名字 + 简介（两行截断）+ 上传者**，右上角类型徽章（用 `PACK_TYPE_LABEL`，五色）。点卡片进详情；「加载更多」分页
5. **详情弹层**：大封面 + 简介 + 作者/版本/下载数 + **落地预览**（`packToWorldbookEntries(pack)` 逐条列出名字与正文截断）+ 安装/更新/卸载（沿用现有已装版本对比与 `removed: 0` 文案）
6. **上传视图**（重做）：
   - 顶部五选一类型；下方**按类型换表单**
   - 公共字段：名称、版本、作者名、Discord、标签、简介、**封面图 URL**
   - `mechanism` / `event`：**条目编辑器**（沿用现有逐条编辑：名称/正文/蓝灯/绿灯关键词/次要词/位置/depth/order/概率/递归/sticky·cooldown·delay）+ **「从酒馆导出的世界书 JSON」文件选择**（调 `parseWorldbookJson`，失败原样显示错误、保留草稿、显示「已导入 N 条，其中 M 条禁用」）；`event` 另加**控制器条目**输入（名称须 `EJS/` 开头 + EJS 正文），并提示事件名必须 `事件_` 开头
   - `dungeon`：结构化表单（副本名/类型三选/基准等级/时间限制/背景/地图/敌人/主线任务/支线·世界事件·隐藏任务·成就 可增删/`GM 指导` 文本域）+ 底部可导入额外条目
   - `build` / `persona`：结构化表单（build：构筑名/定位/属性分配方向（两个下拉，四维）/天赋/血统/称号/职业（名称·稀有度·职业特性·职业技能·传承技能·转职树）/通用技能/主要装备七槽/背包建议；persona：角色名/性格/爱好（逗号分隔）/厌恶/背景故事/构筑方向/可选粘贴构筑 JSON）
   - 客户端轻量校验（版本 x.y.z、名称/简介/作者非空、扩展类至少一条条目、event 命名规范、dungeon 必填项、build 主属性必选），服务端权威校验错误原样显示
   - 成功 → 管理密钥只显示一次（保留现有面板）+ 跳详情
7. **逃逸纪律**：所有投稿内容（名字/简介/正文/作者/标签）与 `cover` 一律经 `textContent` 或 `img.src` 赋值，**禁 innerHTML 拼接**；`img.onerror` 回退占位图
8. **样式**：深色主题（沿用 slate 色系）、五类徽章色（副本血红/事件琥珀/机制青蓝/构筑紫/人设金）、响应式（320px 起）

- [ ] **Step 2: 语法自检 + Commit**

Run: `node --check <(sed -n '/<script type="module">/,/<\/script>/p' cloudflare/wxhl-cygf/workshop.html | sed '1d;$d')`（或缺省用 node 抽出临时文件检查）
Run: `npx vitest run cloudflare/wxhl-cygf/` — 既有测试仍全绿

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): 工坊页面重做 —— 顶部五类导航/卡片四要素/按类型上传/世界书导入"
```

---

### Task 5: 收尾 —— 重建 bundle、验证、部署向导

**Files:**
- Modify: `cloudflare/wxhl-cygf/worker.bundle.js`（重建）
- Modify: `cloudflare/wxhl-cygf/README.md`（记五类与 cover）

- [ ] **Step 1: 全量验证**

Run: `npx vitest run cloudflare/wxhl-cygf/ src/wxhl-cygf/`（全绿）· `npx eslint cloudflare/wxhl-cygf/ src/wxhl-cygf/`（无 error）· `npm run build`（宿主脚本仍能构建，虽然本期没改它）

- [ ] **Step 2: 重建单文件并自检**

Run: `ESBUILD_WASM_PATH="C:/Users/zero/AppData/Local/Temp/esb/node_modules/esbuild-wasm" node cloudflare/wxhl-cygf/build-bundle.mjs`
（自检会打印字节数与「含页面/含子模块路由/含D1绑定名」；`wxhl-mod@2` 与「人设」也应出现在产物里）

- [ ] **Step 3: 提交 + 推送宿主仓（宿主无改动，但保持 bundle 与 src 同步）**

```bash
git add cloudflare/wxhl-cygf
git commit -m "chore(wxhl-cygf): 重建部署单文件（@2 五类）"
```

- [ ] **Step 4: 交给用户粘贴部署**

把 `worker.bundle.js` 放进剪贴板：
`powershell -NoProfile -Command "Get-Content -Raw -Encoding UTF8 'cloudflare/wxhl-cygf/worker.bundle.js' | Set-Clipboard"`
然后让用户：Cloudflare 后台 → Workers & Pages → wxhl-cygf → **Edit code** → 全选 → 粘贴 → **Deploy** → 刷新酒馆。

（宿主脚本**不用**换 URL：本期没改 `src/wxhl-cygf/`。但如果之前没有装到含悬浮球的版本，仍需换成最新 pinned URL。）

- [ ] **Step 5: 部署后验收（人工清单）**

1. 顶部五个分类按钮都在，点「副本」只显示副本
2. 卡片显示封面/名字/简介/上传者（封面留空的显示占位图，不出现破图）
3. 上传一个 `mechanism`：选一份从酒馆导出的世界书 JSON → 显示「已导入 N 条」→ 提交 → 详情页预览与实际安装的条目一致
4. 上传一个 `event`：条目名不以 `事件_` 开头时被拒；带控制器时两条都装上
5. 老包（@1，若有）在列表里仍能显示、不报错

---

## Self-Review 记录

- **Spec 覆盖**：§2 分类→T1+T4；§3 外壳/cover→T1+T3；§4 五类载荷→T1（契约）+T2b（渲染）；§5 页面→T4；§6 数据/API→T3；§7 宿主不动→T5 Step 3；§8 测试→各任务；世界书导入→T2a
- **Placeholder 扫描**：无 TBD/TODO；T2a/T2b 给出逐条移植要求与关键代码（导入器明确要求"逐字对照补丁实现"，因为补丁已写好且经过 16 项自检）；T4 给结构清单（DOM 代码体量大，但每条行为都在编号项里）
- **类型一致性**：`ContentPack`/`PACK_TYPE_LABEL`/`EntrySchema`（T1）→ T2b/T3 使用一致；`parseWorldbookJson`（T2a）→ T4 调用一致；`coverOrPlaceholder`（T2b）→ T4 使用一致
- **Review Focus**：5 条已钉（#1→T1 cover 校验；#2→T2a 整次拒绝；#3→T1 event 命名；#4→T3 旧包；#5→T2b 占位图 + T5 清单）
