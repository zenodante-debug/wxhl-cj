# 副本生成模块（阶段 A）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 wxhl-003 小手机内新增「🎲 副本生成」模块，玩家掷骰 → AI 按《副本生成》规则产出副本 → 写入 MVU 变量 → 生成「进入副本」提示词填入酒馆输入框。

**Architecture:** 把「随机」从 AI 手里彻底拿走。新增 `dice.ts` 用 `crypto` 掷出全部骰子（含 53 个奖励骰）并锁定为数据；`dungeonRules.ts` 用 zod 校验 AI 返回的 JSON 并把骰值与文案拼成变量结构；`dungeonGen.ts` 只负责把规则原文 + 锁定骰值表 + 玩家数据组成 prompt。**AI 不产出任何数值**，只产出文案与物品名，因此结构上无法篡改骰值。

**Tech Stack:** TypeScript / Vue 3 SFC / Pinia / zod 4 / vitest（新增）/ 酒馆助手接口（`generateRaw`、`Mvu.*`、`triggerSlash`）

**Spec:** `docs/superpowers/specs/2026-09-19-dungeon-roll-and-forum-prompts-design.md`

## Global Constraints

- 工作分支：**`feat/wxhl-dungeon-roll-module`**（已从 `master` 创建，同检出）。**不要**切回 `master`，也**不要**建 worktree —— 用户的酒馆实时监听盯着这个检出的 `dist/`，换目录会让他测不到改动。
- **仓库工作区里有大量未提交改动**（`dist/` 下多个产物、`src/views/*.vue`、`webpack.config.ts` 等），它们不属于本计划。提交时只 `git add` 本任务明确涉及的文件，**禁止 `git add -A` / `git add .`**。
- 成品脚本 = `dist/wxhl-003/index.js`，由 `pnpm build` 产出；酒馆侧的脚本名/ID 由用户自己保留。
- 手机端适配外壳 `cdn-loader.js` / `mobile-compat.js` 由 webpack 自动注入产物首尾，**本计划不修改它们**。
- **不要新增任何运行时依赖**（`dependencies`）。只允许新增 `vitest` 到 `devDependencies`。
- 自动导入（`unplugin-auto-import`）已在 webpack 中配好，源码里 **不要手写** `import { z } from 'zod'`、`import { ref } from 'vue'`、`import { defineStore } from 'pinia'`、`import { klona } from 'klona'` —— 直接用全局 `z` / `ref` / `defineStore` / `klona`。
- `_`(lodash) / `$`(jquery) / `toastr` / `YAML` 是 webpack external 映射到酒馆页面运行时全局，**同样不要 import**，直接用。
- 全角/半角：规则文本与用户可见文案里的字段名、冒号一律半角。
- 文案语言：简体中文。
- 所有新增源码文件放在 `src/wxhl-003/`，测试文件放在 `src/wxhl-003/__tests__/`。
- 骰值区间映射的**文字**必须与 spec A2 一致：品质 = `白色/蓝色/金色/紫色/银色`，类型 = `消耗品/装备/技能卷轴/特殊`。
- **类型检查**：webpack 用 `ts-loader` + `transpileOnly: true`，所以 `pnpm build` **不做类型检查**。仓库当前 `pnpm exec tsc --noEmit` 有 **12 个既存错误**（`@types/function/worldbook.d.ts`、`@vueuse/core` 蓝牙类型、`src/index.ts` 的 scss 副作用导入、`src/wxhl-003/workshop.ts` 两处、`初始模板`/`示例` 的 CDN 导入，以及 `store.ts:327` 未使用的 `MODULE_SUMMARY`）。**不要去修这些既存错误** —— 它们与本计划无关，修了会把无关改动卷进提交。
  检查本计划新增代码的类型时，用范围化命令：
  ```bash
  pnpm exec tsc --noEmit 2>&1 | grep -E "wxhl-003/(dice|dungeonRules|dungeonGen)" || echo "新增文件无类型错误"
  ```
  修改 `store.ts` 后改用 `grep "wxhl-003/store.ts"`，并与上面那 1 条既存错误（`MODULE_SUMMARY`）区分开。

---

### Task 1: vitest 基础设施

**Files:**
- Create: `vitest.config.ts`
- Create: `src/wxhl-003/__tests__/setup.ts`
- Modify: `package.json`（`scripts` 加 `test`；`devDependencies` 加 `vitest`）

**Interfaces:**
- Consumes: 无
- Produces: `pnpm test` 可运行；后续任务的 `*.test.ts` 放在 `src/wxhl-003/__tests__/` 下自动被发现；测试环境里 `z`、`klona`、`_` 可用

- [ ] **Step 1: 安装 vitest**

```bash
pnpm add -D vitest
```

- [ ] **Step 2: 写 `vitest.config.ts`**

关键点：必须复现 webpack 里的 `unpluginAutoImport` 配置（否则源码里的全局 `z`/`ref`/`defineStore` 在测试里是 undefined），并复现 `@`/`@util` 路径别名。

```ts
import { fileURLToPath } from 'node:url';
import unpluginAutoImport from 'unplugin-auto-import/vite';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      '@util': fileURLToPath(new URL('./util', import.meta.url)),
    },
  },
  plugins: [
    unpluginAutoImport({
      dts: false,
      imports: [
        'vue',
        'pinia',
        '@vueuse/core',
        { from: 'dedent', imports: [['default', 'dedent']] },
        { from: 'klona', imports: ['klona'] },
        { from: 'vue-final-modal', imports: ['useModal'] },
        { from: 'zod', imports: ['z'] },
      ],
    }),
  ],
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
    setupFiles: ['src/wxhl-003/__tests__/setup.ts'],
  },
});
```

- [ ] **Step 3: 写 `src/wxhl-003/__tests__/setup.ts`**

`_`(lodash) 在 webpack 里是 external 映射到酒馆页面运行时全局，测试环境必须自己挂上去，否则任何用到 `_.clamp` 等 lodash 的模块一 import 就炸。

```ts
import _ from 'lodash';

globalThis._ = _;
```

- [ ] **Step 4: 给 `package.json` 加 test 脚本**

在 `"scripts"` 里、`"lint"` 之前插入：

```json
"test": "vitest run",
"test:watch": "vitest",
```

- [ ] **Step 5: 写一个冒烟测试验证设施可用**

Create: `src/wxhl-003/__tests__/setup.test.ts`

```ts
import { describe, expect, it } from 'vitest';

describe('测试设施', () => {
  it('自动导入的 z 可用', () => {
    expect(typeof z.object).toBe('function');
  });

  it('lodash 全局 _ 可用', () => {
    expect(_.clamp(15, 0, 10)).toBe(10);
  });

  it('crypto.getRandomValues 可用', () => {
    const buf = new Uint32Array(1);
    crypto.getRandomValues(buf);
    expect(buf[0]).toBeGreaterThanOrEqual(0);
  });
});
```

- [ ] **Step 6: 运行测试**

Run: `pnpm test`
Expected: 3 个测试全部 PASS

- [ ] **Step 7: 确认没有破坏构建**

Run: `pnpm build`
Expected: 构建成功（如有 `dist/wxhl-003/index.js` 产出）

- [ ] **Step 8: 提交**

```bash
git add package.json pnpm-lock.yaml vitest.config.ts src/wxhl-003/__tests__/setup.ts src/wxhl-003/__tests__/setup.test.ts
git commit -m "test(wxhl): 引入 vitest 并复现自动导入与全局 _ 环境"
```

---

### Task 2: `dice.ts` — 随机源与构建骰

**Files:**
- Create: `src/wxhl-003/dice.ts`
- Test: `src/wxhl-003/__tests__/dice.test.ts`

**Interfaces:**
- Consumes: 无（本文件不 import 任何项目内模块，保持纯函数）
- Produces:
  - `type RollRecord = { 标签: string; 表达式: string; 骰值: number; 映射: string }`
  - `function rollDie(faces: number): number` — 返回 1..faces
  - `type BuildRoll = { 副本类型: '和平'|'阵营'|'血腥'; 副本类型骰?: number; 媒介来源: string; 题材大类: string; 时代背景: string; 核心特色标签: string; 核心特色标签骰: number; 副模块: string; 副模块骰: number; IP热度: string; 时间限制天: number; 是新手副本: boolean; 是日常副本: boolean }`
  - `const MEDIA_SOURCES / GENRES / ERAS / FEATURE_TAGS / SUB_MODULES: readonly string[]`（下标 0 对应骰值 1）
  - `function ipHeatOf(d: number): string`
  - `function rollBuild(副本周期: number): { build: BuildRoll; records: RollRecord[] }`

- [ ] **Step 1: 写失败测试**

Create: `src/wxhl-003/__tests__/dice.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { FEATURE_TAGS, SUB_MODULES, ipHeatOf, rollBuild, rollDie } from '../dice';

describe('rollDie', () => {
  it('始终落在 1..faces 内', () => {
    for (const faces of [3, 4, 6, 9, 40, 50]) {
      for (let i = 0; i < 2000; i++) {
        const v = rollDie(faces);
        expect(v).toBeGreaterThanOrEqual(1);
        expect(v).toBeLessThanOrEqual(faces);
      }
    }
  });

  it('1d1 恒为 1', () => {
    for (let i = 0; i < 50; i++) expect(rollDie(1)).toBe(1);
  });

  it('各面都能出现（1d6 掷 6000 次，每面至少 700 次）', () => {
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 6000; i++) counts[rollDie(6) - 1]++;
    for (const c of counts) expect(c).toBeGreaterThan(700);
  });
});

describe('骰表', () => {
  it('核心特色标签与副模块各有 50 项', () => {
    expect(FEATURE_TAGS).toHaveLength(50);
    expect(SUB_MODULES).toHaveLength(50);
  });

  it('第 41~50 项是日常标签', () => {
    expect(FEATURE_TAGS[40]).toContain('学园日常');
    expect(FEATURE_TAGS[49]).toContain('温馨家庭');
    expect(SUB_MODULES[40]).toContain('社团存续');
    expect(SUB_MODULES[49]).toContain('黄金日常');
  });
});

describe('ipHeatOf', () => {
  it('按 1-15 / 16-25 / 26-35 / 36-40 分档', () => {
    expect(ipHeatOf(1)).toBe('较冷门');
    expect(ipHeatOf(15)).toBe('较冷门');
    expect(ipHeatOf(16)).toBe('中等');
    expect(ipHeatOf(25)).toBe('中等');
    expect(ipHeatOf(26)).toBe('较热门');
    expect(ipHeatOf(35)).toBe('较热门');
    expect(ipHeatOf(36)).toBe('世界知名');
    expect(ipHeatOf(40)).toBe('世界知名');
  });
});

describe('rollBuild', () => {
  it('新手副本（周期 1）强制和平且不掷副本类型骰', () => {
    for (let i = 0; i < 200; i++) {
      const { build, records } = rollBuild(1);
      expect(build.是新手副本).toBe(true);
      expect(build.副本类型).toBe('和平');
      expect(build.副本类型骰).toBeUndefined();
      expect(records.some(r => r.标签 === '副本类型')).toBe(false);
    }
  });

  it('非新手副本会掷副本类型骰，1=和平 2=阵营 3~4=血腥', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 3000; i++) {
      const { build } = rollBuild(2);
      expect(build.是新手副本).toBe(false);
      expect(build.副本类型骰).toBeGreaterThanOrEqual(1);
      expect(build.副本类型骰).toBeLessThanOrEqual(4);
      // 日常副本（特色标签 41~50）的副本类型已被规则 §6 覆盖为「和平」, 而
      // 副本类型骰 仍保留 D4 原始值, 故原始映射断言只对非日常副本成立。
      // 覆盖行为由下一条用例「日常副本（特色标签 41~50）强制视为和平」断言。
      if (!build.是日常副本) {
        expect(build.副本类型).toBe(
          build.副本类型骰 === 1 ? '和平' : build.副本类型骰 === 2 ? '阵营' : '血腥',
        );
      }
      seen.add(build.副本类型);
    }
    expect(seen).toEqual(new Set(['和平', '阵营', '血腥']));
  });

  it('日常副本（特色标签 41~50）强制视为和平', () => {
    for (let i = 0; i < 20000; i++) {
      const { build } = rollBuild(2);
      if (build.是日常副本) {
        expect(build.核心特色标签骰).toBeGreaterThanOrEqual(41);
        expect(build.副本类型).toBe('和平');
        return;
      }
    }
    throw new Error('20000 次都没掷出日常副本，骰表可能有问题');
  });

  it('时间限制落在 3~14 天', () => {
    for (let i = 0; i < 2000; i++) {
      const { build } = rollBuild(3);
      expect(build.时间限制天).toBeGreaterThanOrEqual(3);
      expect(build.时间限制天).toBeLessThanOrEqual(14);
    }
  });

  it('记录的骰值与其映射一致', () => {
    const { build, records } = rollBuild(5);
    const tag = records.find(r => r.标签 === '核心特色标签')!;
    expect(tag.骰值).toBe(build.核心特色标签骰);
    expect(tag.映射).toBe(build.核心特色标签);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/wxhl-003/__tests__/dice.test.ts`
Expected: FAIL —— `Failed to resolve import "../dice"`

- [ ] **Step 3: 实现 `src/wxhl-003/dice.ts` 的随机源与骰表**

```ts
// ================================================================
// 副本生成 · 掷骰引擎
// 纯函数, 不依赖任何酒馆运行时全局 (只依赖 crypto), 便于单元测试
// ================================================================

/** 一次掷骰的完整记录, 用于 UI 展示与注入 prompt 作为「已锁定骰值表」 */
export interface RollRecord {
  标签: string;
  表达式: string;
  /** 骰面原始值 */
  骰值: number;
  /** 按规则区间映射出的文字, 无映射时为 '' */
  映射: string;
}

/**
 * 掷一颗骰子, 返回 1..faces。
 * 用拒绝采样消除取模偏差: 先把 2^32 截到 faces 的整数倍, 落在尾巴上的样本重掷。
 */
export function rollDie(faces: number): number {
  if (!Number.isInteger(faces) || faces < 1) throw new Error('骰面数必须是正整数: ' + faces);
  if (faces === 1) return 1;
  const limit = Math.floor(0x100000000 / faces) * faces;
  const buf = new Uint32Array(1);
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return (v % faces) + 1;
}

/** 媒介来源 (D6) */
export const MEDIA_SOURCES = [
  '实体小说', '影视作品', '电子游戏', '动漫作品', '民俗怪谈', '桌面与规则体系',
] as const;

/** 题材大类 (D6) */
export const GENRES = [
  '奇幻/神话', '玄幻/仙侠', '科幻/未来', '历史/演义', '现代/异能', '现实/日常',
] as const;

/** 时代背景 (D6) */
export const ERAS = [
  '上古/太古', '古代/中世纪', '近代/工业化', '现代/当代', '近未来/赛博', '遥远未来/星际',
] as const;

/** 核心特色标签 (D50), 下标 0 对应骰值 1; 第 41~50 项为日常标签 */
export const FEATURE_TAGS = [
  '丧尸/生化危机', '克苏鲁/不可名状', '泰坦巨兽/怪兽宇宙', '废土/核战后', '诡异民俗/中、日式恐怖',
  '无限流/多元交汇', '规则怪谈/怪异模因', '赛博朋克/矩阵空间', '虚拟网游', '荒诞喜剧/反套路',
  '吸血鬼/黑暗哥特', '童话反转/黑深残', '梦核/阈限空间', '微缩世界/巨物恐惧', '异常收容/SCP风',
  '超级英雄/美漫风', '平行宇宙/时间断层', '维多利亚诡案/雾都', '热血王道/宿命羁绊', '机甲维度/钢铁巨兵',
  '恋爱喜剧/修罗场', '里番向', '深渊地狱/极恶位面', '史诗战场/绞肉机战壕', '硬核武斗/国术格斗',
  '反乌托邦/虚假社会', '物欲都市/资本帝国', '现代战争/战术特种', '全员恶人/哥谭风', '魔法学园/派系斗争',
  '深海恐惧/水下幽闭', '异星虫灾/无尽同化', '蒸汽朋克/工业巨兽', '神明陨落/信仰黄昏', '极端气候/生态灾变',
  '特摄宇宙/巨大化英雄', '废土修仙/灵气变异', '蛮荒纪元/史前巨兽', '浮空岛屿/破碎大陆', '极道黑帮/地下秩序',
  '学园日常/青春群像', '美食经营/餐厅物语', '恋爱喜剧/纯爱修罗场', '偶像艺能/娱乐圈生态', '体育竞技/热血部活',
  '职场喜剧/社畜生态', '治愈田园/慢生活', '综艺游戏/整活现场', '宅文化/兴趣社团', '温馨家庭/邻里日常',
] as const;

/** 副模块 (D50), 下标 0 对应骰值 1; 第 41~50 项为原生日常机制 */
export const SUB_MODULES = [
  '大逃杀', '绝境求生', '天灾降临', '绝症倒计时', '狩猎靶标',
  '狼人背叛', '卧底潜伏', '声望崩塌', '阵营对抗', '禁止杀戮',
  '密室解谜', '时间轮回', '叙述诡计', '连环凶案', '因果逆转',
  '据点塔防', '两军对垒', '斩首行动', '护送任务', '资源争夺',
  '地牢深潜', '巨物围猎', '碎片拼凑', '怪物图鉴', '遗迹破译',
  '全员禁魔', '科技锁死', '属性压制', '原著附身', '多方乱战',
  '白手起家', '权欲交易', '领地建设', '表里世界', '移动迷宫',
  '寻宝竞速', '信仰掠夺', '身份替换', '筹码赌局', '剧本演出',
  '社团存续', '目标达成', '人际修罗场', '委托代办', '秘密守护',
  '季节活动', '养成计划', '日常异变', '身份体验', '黄金日常',
] as const;

/** IP 热度 (D40) */
export function ipHeatOf(d: number): string {
  if (d <= 15) return '较冷门';
  if (d <= 25) return '中等';
  if (d <= 35) return '较热门';
  return '世界知名';
}

/** 构建骰结果 */
export interface BuildRoll {
  副本类型: '和平' | '阵营' | '血腥';
  /** 新手副本不投此骰, 日常副本虽投骰但被规则覆盖, 两种情况都保留原始骰值供审计 */
  副本类型骰?: number;
  副本类型被日常规则覆盖?: boolean;
  媒介来源: string;
  题材大类: string;
  时代背景: string;
  核心特色标签: string;
  核心特色标签骰: number;
  副模块: string;
  副模块骰: number;
  IP热度: string;
  IP热度骰: number;
  时间限制天: number;
  是新手副本: boolean;
  是日常副本: boolean;
}
```

- [ ] **Step 4: 实现 `rollBuild`**

追加到 `src/wxhl-003/dice.ts`：

```ts
/**
 * 掷出全部「构建骰」。
 * 顺序与规则一致: 副本类型 → 媒介来源 → 题材大类 → 时代背景 → 核心特色标签 → 副模块 → IP热度 → 时间限制。
 * @param 副本周期 stat_data.契约者.赛季信息.当前副本周期, ===1 时是新手副本
 */
export function rollBuild(副本周期: number): { build: BuildRoll; records: RollRecord[] } {
  const records: RollRecord[] = [];
  const 是新手副本 = 副本周期 === 1;

  // ① 副本类型 (D4) —— 新手副本强制和平且不投骰
  let 副本类型骰: number | undefined;
  let 副本类型: BuildRoll['副本类型'] = '和平';
  if (!是新手副本) {
    副本类型骰 = rollDie(4);
    副本类型 = 副本类型骰 === 1 ? '和平' : 副本类型骰 === 2 ? '阵营' : '血腥';
    records.push({ 标签: '副本类型', 表达式: '1d4', 骰值: 副本类型骰, 映射: 副本类型 });
  }

  // ② 媒介来源 (D6)
  const 媒介骰 = rollDie(6);
  const 媒介来源 = MEDIA_SOURCES[媒介骰 - 1];
  records.push({ 标签: '媒介来源', 表达式: '1d6', 骰值: 媒介骰, 映射: 媒介来源 });

  // ③ 题材大类 (D6)
  const 题材骰 = rollDie(6);
  const 题材大类 = GENRES[题材骰 - 1];
  records.push({ 标签: '题材大类', 表达式: '1d6', 骰值: 题材骰, 映射: 题材大类 });

  // ④ 时代背景 (D6)
  const 时代骰 = rollDie(6);
  const 时代背景 = ERAS[时代骰 - 1];
  records.push({ 标签: '时代背景', 表达式: '1d6', 骰值: 时代骰, 映射: 时代背景 });

  // ⑤ 核心特色标签 (D50) —— 41~50 触发日常副本调和规则
  const 标签骰 = rollDie(50);
  const 核心特色标签 = FEATURE_TAGS[标签骰 - 1];
  records.push({ 标签: '核心特色标签', 表达式: '1d50', 骰值: 标签骰, 映射: 核心特色标签 });
  const 是日常副本 = 标签骰 >= 41;

  // 日常副本强制视为和平 (规则 §6 优先级高于 D4)
  let 副本类型被日常规则覆盖 = false;
  if (是日常副本 && 副本类型 !== '和平') {
    副本类型被日常规则覆盖 = true;
    副本类型 = '和平';
  }
  if (副本类型被日常规则覆盖) {
    records.push({
      标签: '副本类型（日常规则覆盖）',
      表达式: '规则 §6',
      骰值: 标签骰,
      映射: '日常副本强制视为和平',
    });
  }

  // ⑥ 副模块 (D50)
  const 副模块骰 = rollDie(50);
  const 副模块 = SUB_MODULES[副模块骰 - 1];
  records.push({ 标签: '副模块', 表达式: '1d50', 骰值: 副模块骰, 映射: 副模块 });

  // ⑦ IP 热度 (D40)
  const ip骰 = rollDie(40);
  const IP热度 = ipHeatOf(ip骰);
  records.push({ 标签: 'IP热度', 表达式: '1d40', 骰值: ip骰, 映射: IP热度 });

  // ⑧ 时间限制 (1d12+2 → 3~14 天)
  const 时间骰 = rollDie(12);
  const 时间限制天 = 时间骰 + 2;
  records.push({ 标签: '时间限制', 表达式: '1d12+2', 骰值: 时间骰, 映射: 时间限制天 + '天' });

  return {
    build: {
      副本类型,
      副本类型骰,
      副本类型被日常规则覆盖: 副本类型被日常规则覆盖 || undefined,
      媒介来源,
      题材大类,
      时代背景,
      核心特色标签,
      核心特色标签骰: 标签骰,
      副模块,
      副模块骰,
       IP热度,
      IP热度骰: ip骰,
      时间限制天,
      是新手副本,
      是日常副本,
    },
    records,
  };
}
```

- [ ] **Step 5: 运行测试确认通过**

Run: `pnpm test src/wxhl-003/__tests__/dice.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/dice.ts src/wxhl-003/__tests__/dice.test.ts
git commit -m "feat(wxhl): 新增副本生成掷骰引擎的随机源与构建骰"
```

---

### Task 3: `dice.ts` — 奖励骰与奖励文本拼装

**Files:**
- Modify: `src/wxhl-003/dice.ts`（追加）
- Test: `src/wxhl-003/__tests__/dice-rewards.test.ts`

**Interfaces:**
- Consumes: Task 2 的 `RollRecord`、`rollDie`
- Produces:
  - `type Quality = '白色'|'蓝色'|'金色'|'紫色'|'银色'`
  - `type ItemType = '消耗品'|'装备'|'技能卷轴'|'特殊'`
  - `function qualityOf(table: readonly (readonly [number, Quality])[], d: number): Quality`
  - `function itemTypeOf(table: readonly (readonly [number, ItemType])[], d: number): ItemType`
  - `interface RewardRoll { up: number; exp: number; rp: number; quality: Quality; itemType: ItemType }`
  - `interface RewardSet { 主线: RewardRoll; 支线: RewardRoll[]; 隐藏: RewardRoll[]; 成就: RewardRoll[] }`
  - `function rollRewards(): { rewards: RewardSet; records: RollRecord[] }`
  - `function composeRewardText(r: RewardRoll, 物品名: string): string`

- [ ] **Step 1: 写失败测试**

Create: `src/wxhl-003/__tests__/dice-rewards.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { composeRewardText, itemTypeOf, qualityOf, rollRewards } from '../dice';

describe('qualityOf / itemTypeOf', () => {
  const 支线品质 = [[1, '白色'], [4, '蓝色'], [6, '金色']] as const;
  const 支线类型 = [[4, '消耗品'], [7, '装备'], [9, '技能卷轴']] as const;

  it('按区间右端点取档', () => {
    expect(qualityOf(支线品质, 1)).toBe('白色');
    expect(qualityOf(支线品质, 2)).toBe('蓝色');
    expect(qualityOf(支线品质, 4)).toBe('蓝色');
    expect(qualityOf(支线品质, 5)).toBe('金色');
    expect(qualityOf(支线品质, 6)).toBe('金色');
  });

  it('类型区间同理', () => {
    expect(itemTypeOf(支线类型, 1)).toBe('消耗品');
    expect(itemTypeOf(支线类型, 4)).toBe('消耗品');
    expect(itemTypeOf(支线类型, 5)).toBe('装备');
    expect(itemTypeOf(支线类型, 7)).toBe('装备');
    expect(itemTypeOf(支线类型, 8)).toBe('技能卷轴');
    expect(itemTypeOf(支线类型, 9)).toBe('技能卷轴');
  });

  it('超出区间时抛出而不是静默返回错误值', () => {
    expect(() => qualityOf(支线品质, 7)).toThrow();
  });
});

describe('rollRewards', () => {
  it('数量正确: 主线 1 / 支线 3 / 隐藏 2 / 成就 6', () => {
    const { rewards } = rollRewards();
    expect(rewards.支线).toHaveLength(3);
    expect(rewards.隐藏).toHaveLength(2);
    expect(rewards.成就).toHaveLength(6);
  });

  it('共掷出 53 个奖励骰', () => {
    const { records } = rollRewards();
    expect(records).toHaveLength(53);
  });

  it('各奖励项的数值落在规则区间内', () => {
    for (let i = 0; i < 500; i++) {
      const { rewards } = rollRewards();
      expect(rewards.主线.up).toBeGreaterThanOrEqual(251);
      expect(rewards.主线.up).toBeLessThanOrEqual(350);
      expect(rewards.主线.exp).toBeGreaterThanOrEqual(151);
      expect(rewards.主线.exp).toBeLessThanOrEqual(250);

      for (const s of rewards.支线) {
        expect(s.up).toBeGreaterThanOrEqual(51);
        expect(s.up).toBeLessThanOrEqual(200);
        expect(s.exp).toBeGreaterThanOrEqual(21);
        expect(s.exp).toBeLessThanOrEqual(50);
      }
      for (const h of rewards.隐藏) {
        expect(h.up).toBeGreaterThanOrEqual(301);
        expect(h.up).toBeLessThanOrEqual(500);
        expect(h.rp).toBeGreaterThanOrEqual(1);
        expect(h.rp).toBeLessThanOrEqual(3);
      }
      // ★ 固定 1 RP; ★★ 1~3; ★★★ 2~4; ★★★★ 3~5; ★★★★★ 4~6; ★★★★★★ 5~7
      expect(rewards.成就[0].rp).toBe(1);
      expect(rewards.成就[1].rp).toBeGreaterThanOrEqual(1);
      expect(rewards.成就[1].rp).toBeLessThanOrEqual(3);
      expect(rewards.成就[2].rp).toBeGreaterThanOrEqual(2);
      expect(rewards.成就[2].rp).toBeLessThanOrEqual(4);
      expect(rewards.成就[3].rp).toBeGreaterThanOrEqual(3);
      expect(rewards.成就[3].rp).toBeLessThanOrEqual(5);
      expect(rewards.成就[4].rp).toBeGreaterThanOrEqual(4);
      expect(rewards.成就[4].rp).toBeLessThanOrEqual(6);
      expect(rewards.成就[5].rp).toBeGreaterThanOrEqual(5);
      expect(rewards.成就[5].rp).toBeLessThanOrEqual(7);
    }
  });

  it('成就 UP 随梯度递增（区间不重叠）', () => {
    const { rewards } = rollRewards();
    for (let i = 1; i < 6; i++) {
      expect(rewards.成就[i].up).toBeGreaterThan(rewards.成就[i - 1].up);
    }
  });

  it('★★★★ 及以上只会出蓝/金/紫/银, 不会出白', () => {
    for (let i = 0; i < 3000; i++) {
      const { rewards } = rollRewards();
      for (const a of rewards.成就.slice(3)) expect(a.quality).not.toBe('白色');
    }
  });

  it('★★★★★★ 的类型只会是 装备/技能卷轴/特殊', () => {
    for (let i = 0; i < 3000; i++) {
      const { rewards } = rollRewards();
      expect(['装备', '技能卷轴', '特殊']).toContain(rewards.成就[5].itemType);
    }
  });
});

describe('composeRewardText', () => {
  it('主线格式: UP + EXP', () => {
    expect(
      composeRewardText({ up: 342, exp: 187, rp: 0, quality: '蓝色', itemType: '装备' }, ''),
    ).toBe('342 UP + 187 EXP');
  });

  it('带 RP 时插入 RP 段', () => {
    expect(
      composeRewardText({ up: 400, exp: 200, rp: 2, quality: '金色', itemType: '消耗品' }, '圣水'),
    ).toBe('400 UP + 200 EXP + 2 RP + 【金色】消耗品：圣水');
  });

  it('无物品名时省略物品段', () => {
    expect(
      composeRewardText({ up: 400, exp: 200, rp: 2, quality: '金色', itemType: '消耗品' }, ''),
    ).toBe('400 UP + 200 EXP + 2 RP');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/wxhl-003/__tests__/dice-rewards.test.ts`
Expected: FAIL —— `composeRewardText is not a function`

- [ ] **Step 3: 实现品质/类型映射与奖励骰**

追加到 `src/wxhl-003/dice.ts`：

```ts
// ================================================================
// 奖励骰与奖励文本
// ================================================================

export type Quality = '白色' | '蓝色' | '金色' | '紫色' | '银色';
export type ItemType = '消耗品' | '装备' | '技能卷轴' | '特殊';

/** 区间表: [区间右端点(含), 文字], 必须按右端点升序且覆盖到骰面上限 */
export type RangeTable<T extends string> = readonly (readonly [number, T])[];

/** 按区间表把骰值映射成文字; 落在表外视为编码错误, 直接抛出 */
export function qualityOf(table: RangeTable<Quality>, d: number): Quality {
  return pickFromTable(table, d);
}
export function itemTypeOf(table: RangeTable<ItemType>, d: number): ItemType {
  return pickFromTable(table, d);
}
function pickFromTable<T extends string>(table: RangeTable<T>, d: number): T {
  for (const [right, label] of table) if (d <= right) return label;
  throw new Error(`骰值 ${d} 超出区间表上限 ${table[table.length - 1][0]}`);
}

// 规则各奖励行给定的区间表
const 品质_支线 = [[1, '白色'], [4, '蓝色'], [6, '金色']] as RangeTable<Quality>;
const 类型_支线 = [[4, '消耗品'], [7, '装备'], [9, '技能卷轴']] as RangeTable<ItemType>;
const 品质_隐藏 = [[3, '蓝色'], [7, '金色'], [9, '紫色'], [10, '银色']] as RangeTable<Quality>;
const 类型_隐藏 = [[6, '装备'], [9, '技能卷轴'], [10, '特殊']] as RangeTable<ItemType>;
const 品质_星1 = [[2, '白色'], [5, '蓝色']] as RangeTable<Quality>;
const 品质_星2 = [[1, '白色'], [4, '蓝色'], [5, '金色']] as RangeTable<Quality>;
const 品质_星3 = [[3, '蓝色'], [5, '金色']] as RangeTable<Quality>;
const 品质_星4 = [[3, '蓝色'], [7, '金色'], [8, '紫色']] as RangeTable<Quality>;
const 类型_星4 = [[6, '装备'], [9, '技能卷轴']] as RangeTable<ItemType>;
const 品质_星5 = [[1, '金色'], [3, '紫色']] as RangeTable<Quality>;
const 类型_星5 = [[5, '装备'], [9, '技能卷轴']] as RangeTable<ItemType>;
const 品质_星6 = [[3, '紫色'], [5, '银色']] as RangeTable<Quality>;
const 类型_星6 = [[3, '装备'], [6, '技能卷轴'], [7, '特殊']] as RangeTable<ItemType>;

export interface RewardRoll {
  up: number;
  exp: number;
  rp: number;
  quality: Quality;
  itemType: ItemType;
}

export interface RewardSet {
  主线: RewardRoll;
  支线: RewardRoll[];
  隐藏: RewardRoll[];
  成就: RewardRoll[];
}

/** 成就梯度各档的 [UP骰面, UP加值, EXP骰面, EXP加值, RP底, RP骰面]。RP骰面为 0 表示该档 RP 是固定值、不掷骰 */
const 成就梯度 = [
  { 名: '★ 探索级', up: [11, 24], exp: [11, 14], rp: [1, 0], 品质: 品质_星1, 类型: 类型_支线 },
  { 名: '★★ 挑战级', up: [21, 49], exp: [11, 34], rp: [0, 3], 品质: 品质_星2, 类型: 类型_支线 },
  { 名: '★★★ 破局级', up: [31, 84], exp: [21, 49], rp: [1, 3], 品质: 品质_星3, 类型: 类型_支线 },
  { 名: '★★★★ 史诗级', up: [61, 169], exp: [31, 84], rp: [2, 3], 品质: 品质_星4, 类型: 类型_星4 },
  { 名: '★★★★★ 传说级', up: [121, 339], exp: [41, 129], rp: [3, 3], 品质: 品质_星5, 类型: 类型_星5 },
  { 名: '★★★★★★ 世界天花板', up: [241, 679], exp: [91, 254], rp: [4, 3], 品质: 品质_星6, 类型: 类型_星6 },
] as const;

/** 掷出全部奖励骰。数值全部由本函数产出, AI 永不参与 */
export function rollRewards(): { rewards: RewardSet; records: RollRecord[] } {
  const records: RollRecord[] = [];

  /** 掷 UP/EXP 段并记账 */
  const rollMain = (标签: string, upFaces: number, upAdd: number, expFaces: number, expAdd: number) => {
    const upR = rollDie(upFaces);
    const expR = rollDie(expFaces);
    records.push({ 标签: 标签 + '·UP', 表达式: `1d${upFaces}+${upAdd}`, 骰值: upR, 映射: String(upR + upAdd) });
    records.push({ 标签: 标签 + '·EXP', 表达式: `1d${expFaces}+${expAdd}`, 骰值: expR, 映射: String(expR + expAdd) });
    return { up: upR + upAdd, exp: expR + expAdd };
  };

  /** 掷品质/类型段并记账 */
  const rollItem = (标签: string, 品质表: RangeTable<Quality>, 品质面: number, 类型表: RangeTable<ItemType>, 类型面: number) => {
    const qR = rollDie(品质面);
    const tR = rollDie(类型面);
    const quality = qualityOf(品质表, qR);
    const itemType = itemTypeOf(类型表, tR);
    records.push({ 标签: 标签 + '·品质', 表达式: `1d${品质面}`, 骰值: qR, 映射: quality });
    records.push({ 标签: 标签 + '·类型', 表达式: `1d${类型面}`, 骰值: tR, 映射: itemType });
    return { quality, itemType };
  };

  // 主线: 1d100+250 UP + 1d100+150 EXP (无物品)
  const 主线数值 = rollMain('主线', 100, 250, 100, 150);
  const 主线: RewardRoll = { ...主线数值, rp: 0, quality: '金色', itemType: '装备' };

  // 支线 ×3: 1d150+50 UP + 1d30+20 EXP + 品质 1d6 + 类型 1d9
  const 支线: RewardRoll[] = [];
  for (let i = 1; i <= 3; i++) {
    const 数值 = rollMain(`支线${i}`, 150, 50, 30, 20);
    const 物品 = rollItem(`支线${i}`, 品质_支线, 6, 类型_支线, 9);
    支线.push({ ...数值, rp: 0, ...物品 });
  }

  // 隐藏 ×2: 1d200+300 UP + 1d100+100 EXP + 1d3 RP + 品质 1d10 + 类型 1d10
  const 隐藏: RewardRoll[] = [];
  for (let i = 1; i <= 2; i++) {
    const 数值 = rollMain(`隐藏${i}`, 200, 300, 100, 100);
    const rpR = rollDie(3);
    records.push({ 标签: `隐藏${i}·RP`, 表达式: '1d3', 骰值: rpR, 映射: String(rpR) });
    const 物品 = rollItem(`隐藏${i}`, 品质_隐藏, 10, 类型_隐藏, 10);
    隐藏.push({ ...数值, rp: rpR, ...物品 });
  }

  // 成就 ×6: 按梯度表。★ 的 1 RP 是规则给定的固定值, 不掷骰也不记入掷骰记录
  const 成就: RewardRoll[] = 成就梯度.map(g => {
    const 数值 = rollMain(g.名, g.up[0], g.up[1], g.exp[0], g.exp[1]);
    const [rp底, rp面] = g.rp;
    let rp = rp底;
    if (rp面 > 0) {
      const rpR = rollDie(rp面);
      records.push({ 标签: g.名 + '·RP', 表达式: `1d${rp面}+${rp底}`, 骰值: rpR, 映射: String(rpR + rp底) });
      rp = rpR + rp底;
    }
    const 物品 = rollItem(g.名, g.品质, g.品质[g.品质.length - 1][0], g.类型, g.类型[g.类型.length - 1][0]);
    return { ...数值, rp, ...物品 };
  });

  return { rewards: { 主线, 支线, 隐藏, 成就 }, records };
}

/** 拼装奖励文本。物品名为空时省略物品段。RP 为 0 时省略 RP 段 */
export function composeRewardText(r: RewardRoll, 物品名: string): string {
  const parts = [`${r.up} UP`, `${r.exp} EXP`];
  if (r.rp > 0) parts.push(`${r.rp} RP`);
  if (物品名) parts.push(`【${r.quality}】${r.itemType}：${物品名}`);
  return parts.join(' + ');
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/wxhl-003/__tests__/dice-rewards.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 跑全量测试确认没打破 Task 2**

Run: `pnpm test`
Expected: 全部 PASS

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/dice.ts src/wxhl-003/__tests__/dice-rewards.test.ts
git commit -m "feat(wxhl): 新增奖励骰与奖励文本拼装"
```

---

### Task 4: `data.ts` — 把 `DUNGEON_GENERATION_RULES` 更新到 D50 新版

**Files:**
- Modify: `src/wxhl-003/data.ts:634-847`（整个常量体）

**Interfaces:**
- Consumes: 无
- Produces: `DUNGEON_GENERATION_RULES`（新版全文），供 Task 6 的 `dungeonGen.ts` 注入 prompt

**背景：** 现有常量是**旧版且从未被 import 过**（死代码）。它写的是 D40 核心特色标签 / D40 副模块 / 力量层级 D4 投骰，且缺少「日常副本调和规则」整节。

- [ ] **Step 1: 用新版全文替换常量体**

**规则原文在 `docs/superpowers/specs/2026-09-19-dungeon-generation-rules-verbatim.md`** —— 读它，然后把它 `<副本生成>` 与 `</副本生成>` 之间的内容（**含这两个标签本身**）逐字替换掉 `src/wxhl-003/data.ts` 中 `export const DUNGEON_GENERATION_RULES = \`...\`` 的反引号内容。

**逐字复制，不要改写、不要精简、不要调整格式、不要"顺手优化"。** 替换后核对以下各节都存在：

- `## 一、 副本来源与世界选择`，包含 `### 1. 副本类型判定`（D4）、`### 2. 组合主模块判定`（①媒介来源 D6 / ②题材大类 D6 / ③时代背景 D6 / **④力量层级：特别注释，不受限制，不投骰** / ⑤核心特色标签 **D50**）、`### 3. 副模块判定`（**D50**）、`### 4. IP热度判定`（D40）、`### 5. 综合构建与冲突调和`、**`### 6. 日常副本调和规则`**（整节新增）
- `## 二、 三种世界生成逻辑与任务防暴走规范`
- `## 三、 契约者匹配机制（多人副本）`（IP 角色按核心特色标签 **1d50** 决定）
- `## 四、 敌人生态与动态难度锁定`
- `## 五、 CR难度修正`
- `## 六、 副本生成格式（四大区强制输出）`
- `## 七、 任务奖励基础规范`（含 `### 任务奖励` 与 `### 副本成就奖励梯度`）
- `## 输出格式保真（正则匹配硬性要求，违反即判定输出无效）`
- `<Panel Enhancement>` 模板全文

- [ ] **Step 2: 核对 ④力量层级已不再是投骰项**

Run: `grep -n "力量层级" src/wxhl-003/data.ts`
Expected: 出现「特别注释」与「力量层级不受限制」，且**不再**出现「D4的②」这样的投骰表述

- [ ] **Step 3: 核对 D50 与日常规则存在**

Run: `grep -c "D50的①\|D50的②\|日常副本调和规则" src/wxhl-003/data.ts`
Expected: `3`（或更多）

- [ ] **Step 4: 确认没有引入模板字符串语法错误**

Run: `pnpm build`
Expected: 构建成功。若报 `Unterminated template literal`，说明原文里混进了反引号，需要转义成 `\``

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/data.ts
git commit -m "fix(wxhl): 将副本生成规则常量更新到 D50 新版并补上日常副本调和规则"
```

---

### Task 5: `dungeonRules.ts` — AI 输出校验与变量映射

**Files:**
- Create: `src/wxhl-003/dungeonRules.ts`
- Test: `src/wxhl-003/__tests__/dungeonRules.test.ts`

**Interfaces:**
- Consumes: Task 2 `BuildRoll`；Task 3 `RewardSet` / `composeRewardText`
- Produces:
  - `const DungeonGenResultSchema`（zod）
  - `type DungeonGenResult = z.output<typeof DungeonGenResultSchema>`
  - `type PlayerBrief = { 姓名: string; 等级: number; 阶位: string; CR: number }`
  - `function mapToVariables(result: DungeonGenResult, build: BuildRoll, rewards: RewardSet, player: PlayerBrief): Record<string, unknown>` —— 返回 `{ '当前副本元数据': …, '当前副本任务': …, '固有角色名单': …, '其他契约者名单': … }`，键名对应 `契约者` 下的字段名
  - `function assemblePanelText(result: DungeonGenResult, build: BuildRoll, rewards: RewardSet, player: PlayerBrief): string`

- [ ] **Step 1: 写失败测试**

Create: `src/wxhl-003/__tests__/dungeonRules.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import type { BuildRoll, RewardSet } from '../dice';
import { DungeonGenResultSchema, assemblePanelText, mapToVariables } from '../dungeonRules';

const build: BuildRoll = {
  副本类型: '血腥',
  副本类型骰: 3,
  媒介来源: '电子游戏',
  题材大类: '科幻/未来',
  时代背景: '近未来/赛博',
  核心特色标签: '赛博朋克/矩阵空间',
  核心特色标签骰: 8,
  副模块: '大逃杀',
  副模块骰: 1,
  IP热度: '世界知名',
  IP热度骰: 38,
  时间限制天: 7,
  是新手副本: false,
  是日常副本: false,
};

const 奖励 = (up: number, exp: number, rp: number): any => ({ up, exp, rp, quality: '金色', itemType: '装备' });

const rewards: RewardSet = {
  主线: 奖励(342, 187, 0),
  支线: [奖励(120, 40, 0), 奖励(130, 45, 0), 奖励(140, 50, 0)],
  隐藏: [奖励(400, 220, 2), 奖励(410, 230, 3)],
  成就: [奖励(30, 20, 1), 奖励(60, 40, 2), 奖励(100, 60, 3), 奖励(200, 100, 4), 奖励(400, 180, 5), 奖励(800, 300, 6)],
};

const result = {
  副本名称: '夜雨霓虹',
  副本来源: '《赛博朋克2077》（电子游戏）',
  副本背景: '一段背景描述',
  日常调和说明: '',
  主线任务: { 名称: '主线名', 说明: '主线说明' },
  支线任务: [
    { 名称: '支线一', 说明: '说明一', 物品名: '接入仓' },
    { 名称: '支线二', 说明: '说明二', 物品名: '义体' },
    { 名称: '支线三', 说明: '说明三', 物品名: '芯片' },
  ],
  世界事件: [
    { 名称: '事件一', 说明: '说明一', 影响: '影响一' },
    { 名称: '事件二', 说明: '说明二', 影响: '影响二' },
  ],
  隐藏任务: [
    { 名称: '隐藏一', 说明: '说明一', 物品名: '黑墙碎片' },
    { 名称: '隐藏二', 说明: '说明二', 物品名: '灵魂杀手' },
  ],
  副本成就: [
    { 名称: '成就一', 说明: '说明一', 难度: '顺路可完成', 物品名: '挂件' },
    { 名称: '成就二', 说明: '说明二', 难度: '需特定规划', 物品名: '挂件' },
    { 名称: '成就三', 说明: '说明三', 难度: '改变局部战局', 物品名: '挂件' },
    { 名称: '成就四', 说明: '说明四', 难度: '深度介入', 物品名: '挂件' },
    { 名称: '成就五', 说明: '说明五', 难度: '直面核心灾难', 物品名: '挂件' },
    { 名称: '成就六', 说明: '说明六', 难度: '触碰世界底层规则', 物品名: '挂件' },
  ],
  固有角色: [
    { 名称: '摩根·黑手', 位阶: '四阶', 等级: 70 },
    { 名称: '强尼·银手', 位阶: '三阶', 等级: 55 },
  ],
  其他契约者: [
    { 真名: '陈默', 称号: '无', 等级: 11, 阵营: '中立' },
    { 真名: '林晚', 称号: '夜莺', 等级: 12, 阵营: '特管局' },
  ],
};

const player = { 姓名: '刘林', 等级: 11, 阶位: '一阶', CR: 4.5 };

describe('DungeonGenResultSchema', () => {
  it('接受合法结果', () => {
    expect(() => DungeonGenResultSchema.parse(result)).not.toThrow();
  });

  it('数组长度不对时拒绝', () => {
    expect(() => DungeonGenResultSchema.parse({ ...result, 支线任务: result.支线任务.slice(0, 2) })).toThrow();
    expect(() => DungeonGenResultSchema.parse({ ...result, 副本成就: result.副本成就.slice(0, 5) })).toThrow();
  });
});

describe('mapToVariables', () => {
  const vars = mapToVariables(result, build, rewards, player);

  it('写入基准等级 = 玩家当前等级', () => {
    expect((vars.当前副本元数据 as any).基准等级).toBe(11);
  });

  it('副本类型取构建骰的有效值', () => {
    expect((vars.当前副本元数据 as any).副本类型).toBe('血腥');
  });

  it('时间限制取已锁定的骰值, 而不是 AI 返回的字符串', () => {
    // fixture 里 build.时间限制天 === 7
    expect((vars.当前副本元数据 as any).时间限制).toBe('7天');
  });

  it('主线任务奖励由骰值拼装, 状态为进行中', () => {
    const 主线 = (vars.当前副本任务 as any).主线任务;
    expect(主线.奖励).toBe('342 UP + 187 EXP');
    expect(主线.状态).toBe('进行中');
  });

  it('支线任务以任务名为键', () => {
    const 支线 = (vars.当前副本任务 as any).支线任务;
    expect(Object.keys(支线)).toEqual(['支线一', '支线二', '支线三']);
    expect(支线.支线一.奖励).toBe('120 UP + 40 EXP + 【金色】装备：接入仓');
  });

  it('世界事件把「影响」写进变量的奖励字段', () => {
    const 世界事件 = (vars.当前副本任务 as any).世界事件;
    expect(世界事件.事件一.奖励).toBe('影响一');
    expect(世界事件.事件一.状态).toBe('进行中');
  });

  it('隐藏任务初始状态为未触发', () => {
    const 隐藏 = (vars.当前副本任务 as any).隐藏任务;
    expect(隐藏.隐藏一.状态).toBe('未触发');
    expect(隐藏.隐藏一.奖励).toBe('400 UP + 220 EXP + 2 RP + 【金色】装备：黑墙碎片');
  });

  it('成就带梯度星级的难度字段, 初始未达成', () => {
    const 成就 = (vars.当前副本任务 as any).副本成就;
    const keys = Object.keys(成就);
    expect(keys[0]).toBe('成就一');
    expect(成就.成就一.难度).toBe('★ 探索级 · 顺路可完成');
    expect(成就.成就六.难度).toBe('★★★★★★ 世界天花板 · 触碰世界底层规则');
    expect(成就.成就一.状态).toBe('未达成');
  });

  it('称号为「无」的契约者写成「无称号」', () => {
    const 名单 = vars.其他契约者名单 as any;
    expect(名单.陈默.称号).toBe('无称号');
    expect(名单.林晚.称号).toBe('夜莺');
    expect(名单.陈默.状态).toBe('存活');
  });

  it('固有角色名单带位阶与等级', () => {
    const 名单 = vars.固有角色名单 as any;
    expect(名单['摩根·黑手']).toEqual({ 位阶: '四阶', 等级: 70, 状态: '存活' });
  });
});

describe('assemblePanelText', () => {
  const text = assemblePanelText(result, build, rewards, player);

  it('以 <Panel Enhancement> 包裹并闭合', () => {
    expect(text.startsWith('<Panel Enhancement>')).toBe(true);
    expect(text.trimEnd().endsWith('</Panel Enhancement>')).toBe(true);
  });

  it('包含三块子标签', () => {
    expect(text).toContain('<副本任务>');
    expect(text).toContain('</副本任务>');
    expect(text).toContain('<副本世界事件和成就列表>');
    expect(text).toContain('<副本人物生成>');
  });

  it('成就梯度输出全部 6 行且按 ★→★★★★★★ 顺序', () => {
    const idx = ['★ 探索级', '★★ 挑战级', '★★★ 破局级', '★★★★ 史诗级', '★★★★★ 传说级', '★★★★★★ 世界天花板'].map(s =>
      text.indexOf(s),
    );
    expect(idx.every(i => i >= 0)).toBe(true);
    for (let i = 1; i < idx.length; i++) expect(idx[i]).toBeGreaterThan(idx[i - 1]);
  });

  it('契约者名单格式为 [称号]真名 Lv.X', () => {
    expect(text).toContain('[无称号]陈默 Lv.11');
    expect(text).toContain('[夜莺]林晚 Lv.12');
  });

  it('固有角色格式为 名称 (Lv.X | 阶位)', () => {
    expect(text).toContain('摩根·黑手 (Lv.70 | 四阶)');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/wxhl-003/__tests__/dungeonRules.test.ts`
Expected: FAIL —— `Failed to resolve import "../dungeonRules"`

- [ ] **Step 3: 实现 schema 与映射**

Create: `src/wxhl-003/dungeonRules.ts`

```ts
import type { BuildRoll, RewardSet } from './dice';
import { composeRewardText } from './dice';

// ================================================================
// 副本生成 · AI 输出校验与变量映射
// 纯函数, 无副作用, 不触碰酒馆接口
// ================================================================

/** 成就梯度档位名, 顺序必须与 dice.ts 的 成就梯度 一致 */
const 成就档位 = [
  '★ 探索级',
  '★★ 挑战级',
  '★★★ 破局级',
  '★★★★ 史诗级',
  '★★★★★ 传说级',
  '★★★★★★ 世界天花板',
] as const;

const 主线任务Schema = z.object({ 名称: z.string(), 说明: z.string() });
const 支线任务Schema = z.object({ 名称: z.string(), 说明: z.string(), 物品名: z.string().prefault('') });
const 隐藏任务Schema = z.object({ 名称: z.string(), 说明: z.string(), 物品名: z.string().prefault('') });
const 世界事件Schema = z.object({ 名称: z.string(), 说明: z.string(), 影响: z.string() });
const 成就Schema = z.object({
  名称: z.string(),
  说明: z.string(),
  难度: z.string(),
  物品名: z.string().prefault(''),
});

/**
 * AI 返回内容的校验 schema。
 * 数组长度用 length 精确约束 —— 状态栏与正则都依赖「3 支线 / 2 隐藏 / 2 世界事件 / 6 成就」这个固定结构。
 */
export const DungeonGenResultSchema = z.object({
  副本名称: z.string().min(1),
  副本来源: z.string().min(1),
  副本背景: z.string().min(1),
  日常调和说明: z.string().prefault(''),
  主线任务: 主线任务Schema,
  支线任务: z.array(支线任务Schema).length(3),
  世界事件: z.array(世界事件Schema).length(2),
  隐藏任务: z.array(隐藏任务Schema).length(2),
  副本成就: z.array(成就Schema).length(6),
  固有角色: z.array(z.object({ 名称: z.string().min(1), 位阶: z.string(), 等级: z.coerce.number() })),
  其他契约者: z.array(
    z.object({ 真名: z.string().min(1), 称号: z.string(), 等级: z.coerce.number(), 阵营: z.string() }),
  ),
});

export type DungeonGenResult = z.output<typeof DungeonGenResultSchema>;

export interface PlayerBrief {
  姓名: string;
  等级: number;
  阶位: string;
  CR: number;
}

/**
 * 把 AI 结果 + 已锁定骰值映射成 `契约者` 下的变量字段。
 * 返回的键名与 schema 中 `契约者` 的子字段同名, 调用方负责逐条 _.set。
 */
export function mapToVariables(
  result: DungeonGenResult,
  build: BuildRoll,
  rewards: RewardSet,
  player: PlayerBrief,
): Record<string, unknown> {
  const 当前副本元数据 = {
    副本名称: result.副本名称,
    副本来源: result.副本来源,
    副本类型: build.副本类型,
    // 时间限制是已锁定的骰值 (1d12+2), 不从 AI 结果取, 否则 AI 的措辞会让它与骰值不一致
    时间限制: `${build.时间限制天}天`,
    // 规则 §四: 以契约者进本时的当前等级为基准
    基准等级: player.等级,
  };

  const 支线任务: Record<string, unknown> = {};
  result.支线任务.forEach((t, i) => {
    支线任务[t.名称] = {
      说明: t.说明,
      奖励: composeRewardText(rewards.支线[i], t.物品名),
      状态: '进行中',
    };
  });

  const 世界事件: Record<string, unknown> = {};
  result.世界事件.forEach(e => {
    // 变量里世界事件只有「奖励」字段, 规则给的是「影响」, 故把影响文本落在奖励字段
    世界事件[e.名称] = { 说明: e.说明, 奖励: e.影响, 状态: '进行中' };
  });

  const 隐藏任务: Record<string, unknown> = {};
  result.隐藏任务.forEach((t, i) => {
    隐藏任务[t.名称] = {
      说明: t.说明,
      奖励: composeRewardText(rewards.隐藏[i], t.物品名),
      状态: '未触发',
    };
  });

  const 副本成就: Record<string, unknown> = {};
  result.副本成就.forEach((a, i) => {
    副本成就[a.名称] = {
      说明: a.说明,
      难度: `${成就档位[i]} · ${a.难度}`,
      奖励: composeRewardText(rewards.成就[i], a.物品名),
      状态: '未达成',
    };
  });

  const 固有角色名单: Record<string, unknown> = {};
  result.固有角色.forEach(r => {
    固有角色名单[r.名称] = { 位阶: r.位阶, 等级: r.等级, 状态: '存活' };
  });

  const 其他契约者名单: Record<string, unknown> = {};
  result.其他契约者.forEach(c => {
    其他契约者名单[c.真名] = {
      称号: c.称号 === '无' || c.称号 === '' ? '无称号' : c.称号,
      等级: c.等级,
      阵营: c.阵营,
      状态: '存活',
    };
  });

  const 主线 = result.主线任务;
  return {
    当前副本元数据,
    当前副本任务: {
      主线任务: {
        名称: 主线.名称,
        说明: 主线.说明,
        奖励: composeRewardText(rewards.主线, ''),
        状态: '进行中',
      },
      支线任务,
      世界事件,
      隐藏任务,
      副本成就,
    },
    固有角色名单,
    其他契约者名单,
  };
}

/** 组装 <Panel Enhancement> 面板文本, 仅用于存档与复制, 不填入输入框 */
export function assemblePanelText(
  result: DungeonGenResult,
  build: BuildRoll,
  rewards: RewardSet,
  player: PlayerBrief,
): string {
  const L: string[] = [];
  L.push('<Panel Enhancement>');
  L.push('<副本任务>');
  L.push(`## 副本名称: ${result.副本名称}`);
  L.push(`## 副本背景: ${result.副本背景}`);
  L.push(`## 副本来源: ${result.副本来源}`);
  L.push(`## 副本类型: 【${build.副本类型}】`);
  L.push(`## 时间限制: ${build.时间限制天}天`);
  L.push('## 主线任务');
  L.push(`名称: ${result.主线任务.名称}`);
  L.push(`描述: ${result.主线任务.说明}`);
  L.push(`奖励: ${composeRewardText(rewards.主线, '')}`);
  L.push('惩罚: 抹杀');
  result.支线任务.forEach((t, i) => {
    L.push(`## 支线任务${i + 1}`);
    L.push(`名称: ${t.名称}`);
    L.push(`描述: ${t.说明}`);
    L.push(`奖励: ${composeRewardText(rewards.支线[i], t.物品名)}`);
  });
  result.隐藏任务.forEach((t, i) => {
    L.push(`## 隐藏任务${i + 1}`);
    L.push(`名称: ${t.名称}`);
    L.push(`描述: ${t.说明}`);
    L.push(`奖励: ${composeRewardText(rewards.隐藏[i], t.物品名)}`);
  });
  L.push('</副本任务>');
  L.push('<副本世界事件和成就列表>');
  result.世界事件.forEach((e, i) => {
    L.push(`## 世界事件${i + 1}`);
    L.push(`名称: ${e.名称}`);
    L.push(`描述: ${e.说明}`);
    L.push(`影响: ${e.影响}`);
  });
  L.push('## 副本成就奖励梯度');
  result.副本成就.forEach((a, i) => {
    L.push(`${成就档位[i]}：${a.难度} | ${composeRewardText(rewards.成就[i], a.物品名)}`);
  });
  L.push('</副本世界事件和成就列表>');
  L.push('<副本人物生成>');
  L.push('## 契约者名单');
  const 契约者 = [
    `[契约者]${player.姓名} Lv.${player.等级}`,
    ...result.其他契约者.map(c => `[${c.称号 === '无' || c.称号 === '' ? '无称号' : c.称号}]${c.真名} Lv.${c.等级}`),
  ];
  L.push(`契约者: ${契约者.join('，')}`);
  L.push('## 固有角色');
  L.push(`角色列表: ${result.固有角色.map(r => `${r.名称} (Lv.${r.等级} | ${r.位阶})`).join('，')}`);
  L.push('</副本人物生成>');
  L.push('</Panel Enhancement>');
  return L.join('\n');
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/wxhl-003/__tests__/dungeonRules.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 范围化类型检查**

Run: `pnpm exec tsc --noEmit 2>&1 | grep "wxhl-003/dungeonRules" || echo "dungeonRules.ts 无类型错误"`
Expected: 输出「dungeonRules.ts 无类型错误」。**忽略其它既存错误**（见 Global Constraints）。

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/dungeonRules.ts src/wxhl-003/__tests__/dungeonRules.test.ts
git commit -m "feat(wxhl): 新增副本生成结果的校验 schema 与变量映射"
```

---

### Task 6: `dungeonGen.ts` — prompt 构造与进本提示词

**Files:**
- Create: `src/wxhl-003/dungeonGen.ts`
- Test: `src/wxhl-003/__tests__/dungeonGen.test.ts`

**Interfaces:**
- Consumes: Task 2/3 `BuildRoll` `RewardSet` `RollRecord`；Task 4 `DUNGEON_GENERATION_RULES`；Task 5 `PlayerBrief` `DungeonGenResult`
- Produces:
  - `function buildDungeonPrompt(build: BuildRoll, records: RollRecord[], playerText: string, worldbookText: string, 匹配池: string): string`
  - `function buildEnterPrompt(result: DungeonGenResult, build: BuildRoll): string`
  - `function buildEnemyPrompt(): string`（阶段 C 占位）
  - `function mapEnemiesToVariables(): Record<string, unknown>`（阶段 C 占位）

- [ ] **Step 1: 写失败测试**

Create: `src/wxhl-003/__tests__/dungeonGen.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import type { BuildRoll, RollRecord } from '../dice';
import { buildDungeonPrompt, buildEnemyPrompt, buildEnterPrompt, mapEnemiesToVariables } from '../dungeonGen';

const build: BuildRoll = {
  副本类型: '和平',
  媒介来源: '民俗怪谈',
  题材大类: '现代/异能',
  时代背景: '现代/当代',
  核心特色标签: '规则怪谈/怪异模因',
  核心特色标签骰: 7,
  副模块: '密室解谜',
  副模块骰: 11,
  IP热度: '中等',
  IP热度骰: 20,
  时间限制天: 5,
  是新手副本: false,
  是日常副本: false,
};

const records: RollRecord[] = [
  { 标签: '副本类型', 表达式: '1d4', 骰值: 1, 映射: '和平' },
  { 标签: '核心特色标签', 表达式: '1d50', 骰值: 7, 映射: '规则怪谈/怪异模因' },
  { 标签: '主线·UP', 表达式: '1d100+250', 骰值: 92, 映射: '342' },
];

describe('buildDungeonPrompt', () => {
  const p = buildDungeonPrompt(build, records, '契约者: 刘林\n等级: Lv.11', '世界书内容', '人榜候选…');

  it('包含规则原文的关键节', () => {
    expect(p).toContain('副本生成');
    expect(p).toContain('日常副本调和规则');
  });

  it('包含全部锁定骰值与其映射', () => {
    expect(p).toContain('1d100+250');
    expect(p).toContain('342');
    expect(p).toContain('规则怪谈/怪异模因');
  });

  it('带禁止改动骰值的死命令', () => {
    expect(p).toContain('严禁');
    expect(p).toContain('骰');
  });

  it('带上玩家数据与匹配池原文', () => {
    expect(p).toContain('契约者: 刘林');
    expect(p).toContain('人榜候选…');
  });

  it('要求只返回 JSON', () => {
    expect(p).toContain('JSON');
  });

  it('时间限制天数写进 prompt', () => {
    expect(p).toContain('5');
  });
});

describe('buildEnterPrompt', () => {
  // fixture 必须是完整的 DungeonGenResult —— 只用 `as any` 塞一个残缺对象会让类型守卫失效
  const result = {
    副本名称: '夜雨霓虹',
    其他契约者: [
      { 真名: '陈默', 称号: '无', 等级: 11, 阵营: '中立' },
      { 真名: '林晚', 称号: '夜莺', 等级: 12, 阵营: '特管局' },
    ],
  } as unknown as DungeonGenResult;
  const p = buildEnterPrompt(result, build);

  it('是玩家第一人称视角', () => {
    expect(p).toContain('我');
    expect(p).toContain('传送完成');
  });

  it('点名要 AI 读取的变量路径', () => {
    for (const k of ['当前副本元数据', '当前副本任务', '其他契约者名单', '固有角色名单']) {
      expect(p).toContain(k);
    }
  });

  it('要求输出进入副本后的场景', () => {
    expect(p).toContain('场景');
  });
});

describe('敌人生成占位', () => {
  it('buildEnemyPrompt 明确抛出「规则待实现」而不是返回空串', () => {
    expect(() => buildEnemyPrompt()).toThrow(/待实现/);
  });

  it('mapEnemiesToVariables 同样抛出', () => {
    expect(() => mapEnemiesToVariables()).toThrow(/待实现/);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `pnpm test src/wxhl-003/__tests__/dungeonGen.test.ts`
Expected: FAIL —— `Failed to resolve import "../dungeonGen"`

- [ ] **Step 3: 实现 `dungeonGen.ts`**

```ts
import { DUNGEON_GENERATION_RULES } from './data';
import type { BuildRoll, RollRecord } from './dice';
import type { DungeonGenResult } from './dungeonRules';

// ================================================================
// 副本生成 · Prompt 构造
// 纯字符串拼装, 无副作用
// ================================================================

/** 把掷骰记录排成对齐的锁定骰值表 */
function formatLockedRolls(records: RollRecord[]): string {
  return records.map(r => `| ${r.标签} | ${r.表达式} | ${r.骰值} | ${r.映射 || '—'} |`).join('\n');
}

/**
 * 组装副本生成 prompt。
 * @param playerText   从 stat_data 摘出的玩家数据文本
 * @param worldbookText 选中的世界书内容, 可为空
 * @param 匹配池        按 CR 规则取出的榜单候选, 或「自由生成同阶契约者」指令
 */
export function buildDungeonPrompt(
  build: BuildRoll,
  records: RollRecord[],
  playerText: string,
  worldbookText: string,
  匹配池: string,
): string {
  return `${DUNGEON_GENERATION_RULES}

============ 本次掷骰已锁定, 严禁改动 ============
以下骰值由系统用密码学随机数掷定, 已经锁定。你**严禁**改动、重掷、忽略、四舍五入或自行编造任何数值。
你唯一的职责是把这些骰值翻译成符合规则的内容。若某条骰值与你的构思冲突, 以骰值为准。

【本次锁定骰值】
- 副本类型: ${build.副本类型}${build.副本类型被日常规则覆盖 ? '（原骰值被日常副本调和规则强制覆盖）' : ''}
- 媒介来源: ${build.媒介来源}
- 题材大类: ${build.题材大类}
- 时代背景: ${build.时代背景}
- 核心特色标签: ${build.核心特色标签}
- 副模块: ${build.副模块}
- IP热度: ${build.IP热度}
- 时间限制: ${build.时间限制天} 天
- 本次为${build.是新手副本 ? '【新手副本】—— 强制和平, 且只匹配 1 名来自随机世界观的 IP 角色队友, 同为新人' : '常规副本'}
${build.是日常副本 ? '- 本次为【日常副本】—— 核心特色标签 ∈ 41~50, 规则 §6 日常副本调和规则强制生效, 优先级高于副本类型与副模块的字面冲突' : ''}

【全部掷骰明细（含奖励骰, 供你核对）】
| 标签 | 表达式 | 骰值 | 映射 |
|------|------|------|------|
${formatLockedRolls(records)}

注: UP / EXP / RP / 物品品质 / 物品类型的**数值与档位已由系统掷定**, 你不要输出这些数值,
只需要为每个需要物品的任务给出一个符合本副本世界观的具体物品名。

============ 契约者数据 ============
${playerText || '（未读取到玩家数据）'}

============ 匹配参考 ============
${匹配池 || '（无）'}
${worldbookText ? '\n============ 世界观参考 ============\n' + worldbookText : ''}

============ 输出要求 ============
【优先级声明】上面规则原文末尾的「## 输出格式保真」与 `<Panel Enhancement>` 模板是给跑团 GM 用的,
**不适用于本次生成**。本次生成只按下面的 JSON 要求输出, 两种要求冲突时以本节为准。
（原因: 规则原文里那套是「把成品面板打印到聊天楼层」的格式; 本次只是产出数据, 面板文本由系统另行拼装。）

只返回一个 JSON 对象, 不要 markdown 代码块, 不要任何解释文字。字段如下:
{
  "副本名称": "字符串",
  "副本来源": "《作品名》（媒介来源）",
  "副本背景": "字符串",
  "日常调和说明": "非日常副本填空字符串",
  "主线任务": { "名称": "字符串", "说明": "字符串" },
  "支线任务": [ { "名称": "字符串", "说明": "字符串", "物品名": "字符串" } ],
  "世界事件": [ { "名称": "字符串", "说明": "字符串", "影响": "字符串" } ],
  "隐藏任务": [ { "名称": "字符串", "说明": "字符串", "物品名": "字符串" } ],
  "副本成就": [ { "名称": "字符串", "说明": "字符串", "难度": "字符串", "物品名": "字符串" } ],
  "固有角色": [ { "名称": "字符串", "位阶": "字符串", "等级": 数字 } ],
  "其他契约者": [ { "真名": "字符串", "称号": "无或称号", "等级": 数字, "阵营": "字符串" } ]
}

数量硬性要求: 支线任务恰好 3 条, 世界事件恰好 2 条, 隐藏任务恰好 2 条, 副本成就恰好 6 条
（副本成就必须按 ★ 探索级 → ★★ 挑战级 → ★★★ 破局级 → ★★★★ 史诗级 → ★★★★★ 传说级 → ★★★★★★ 世界天花板 的顺序）。
副本成就的「难度」字段只填**该成就的达成难度描述**（如「顺路可完成的环境交互」），
**不要**把梯度档位名写进去 —— 档位名由系统另行拼接, 你重复写会导致面板显示成「★ 探索级 · ★ 探索级」。
物品名必须出自本副本世界观的具体设定, 禁止通用化（不要写「一把剑」, 要写《作品名》里真实存在的具体物品）。
物品的**品质与类型已由系统掷定, 你无权改动**; 但你选择的具体物品名, 其剧情分量应与该契约者当前阶位相称
（不要让一个一阶新人拿到世界观里最强神器级别的专属物, 优先选同世界观中分量相符的具体物品）。
所有契约者真名公开, 禁止代号或假名。`;
}

/** 玩家视角的「进入副本」提示词, 填入酒馆输入框（只填入不发送） */
export function buildEnterPrompt(result: DungeonGenResult, build: BuildRoll): string {
  const 队友 = result.其他契约者?.length ?? 0;
  return `传送完成，我踏入了本次副本的降临点。

本次副本【${result.副本名称}】的资料已经写入我的契约者档案——当前副本元数据、当前副本任务、其他契约者名单、固有角色名单。

请读取这些变量，以我进入副本后的开场场景作为回复，需要包含：
1. 我降临的具体地点、时间与当前处境
2. 本次副本的时间限制与阶段进度
3. 主线任务的下达（以回廊系统的口吻呈现）
4. 与我同时降临的 ${队友} 名其他契约者，以及他们在我视野内的样子
5. 出现在我视野内的固有角色

副本类型是【${build.副本类型}】，副模块是【${build.副模块}】，时间限制 ${build.时间限制天} 天。`;
}

// ================================================================
// 敌人生成（阶段 C 占位, 规则待补）
// ================================================================

/** @throws 恒抛出 —— 敌人生成规则尚未提供 */
export function buildEnemyPrompt(): string {
  throw new Error('敌人生成规则待实现');
}

/** @throws 恒抛出 —— 敌人生成规则尚未提供 */
export function mapEnemiesToVariables(): Record<string, unknown> {
  throw new Error('敌人生成规则待实现');
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `pnpm test src/wxhl-003/__tests__/dungeonGen.test.ts`
Expected: 全部 PASS

- [ ] **Step 5: 跑全量测试、类型检查与构建**

Run: `pnpm test && pnpm build && pnpm exec tsc --noEmit 2>&1 | grep "wxhl-003/dungeonGen" || echo "dungeonGen.ts 无类型错误"`
Expected: 测试全 PASS，构建成功，输出「dungeonGen.ts 无类型错误」

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/dungeonGen.ts src/wxhl-003/__tests__/dungeonGen.test.ts
git commit -m "feat(wxhl): 新增副本生成 prompt 与进本提示词构造, 预留敌人生成接缝"
```

---

### Task 7: `store.ts` — `useDungeonGenStore`（掷骰、生成、持久化）

**Files:**
- Modify: `src/wxhl-003/store.ts`（文件末尾追加新 store；顶部 import 增加）

**Interfaces:**
- Consumes: `rollBuild` `rollRewards` `BuildRoll` `RewardSet` `RollRecord`（`./dice`）；`DungeonGenResultSchema` `mapToVariables` `assemblePanelText` `PlayerBrief`（`./dungeonRules`）；`buildDungeonPrompt` `buildEnterPrompt`（`./dungeonGen`）；`aiGenerate` `extractJSON` `getActiveCfg`（本文件内已有，同文件直接调用）
- Produces: `useDungeonGenStore`，暴露
  - state: `rolledDungeons: Ref<RolledDungeon[]>`、`rolling`、`generating`、`writing`、`lastError`
  - getters: `latest: ComputedRef<RolledDungeon | null>`
  - actions: `doRoll()`、`generate()`、`reroll()`、`writeToSave(id)`、`fillInput(id)`、`remove(id)`
  - `type RolledDungeon`

**说明：** 本任务只到「生成」为止。`writeToSave` / `fillInput` 在 Task 8 实现，本任务先留抛出 `待实现` 的桩，保证 store 能返回完整接口。

- [ ] **Step 1: 在 `store.ts` 顶部补充 import**

在 `store.ts:3` 之后新增一行：

```ts
import { rollBuild, rollRewards, type BuildRoll, type RewardSet, type RollRecord } from './dice'
import { DungeonGenResultSchema, assemblePanelText, mapToVariables, type DungeonGenResult, type PlayerBrief } from './dungeonRules'
import { buildDungeonPrompt, buildEnterPrompt } from './dungeonGen'
```

- [ ] **Step 2: 在 `store.ts` 末尾追加 store**

```ts
// ================================================================
// 副本生成
// ================================================================
const DGEN_SK = 'wxhl003_rolled_dungeons'

/** 一次「掷骰 + 生成」的完整产物 */
export interface RolledDungeon {
  id: number
  createdAt: string
  /** 全部骰值与映射, 含奖励骰 */
  buildRecords: RollRecord[]
  rewardRecords: RollRecord[]
  build: BuildRoll
  rewards: RewardSet
  /** AI 产出, 通过 zod 校验后才写入 */
  result?: DungeonGenResult
  panelText?: string
  enterPrompt?: string
  /** 已写入存档的痕迹 */
  written?: { at: string; messageId: number | 'latest' }
}

const 成就档位名 = ['★ 探索级', '★★ 挑战级', '★★★ 破局级', '★★★★ 史诗级', '★★★★★ 传说级', '★★★★★★ 世界天花板']

function loadRolledDungeons(): RolledDungeon[] {
  try {
    const r = localStorage.getItem(DGEN_SK)
    if (r) return JSON.parse(r)
  } catch (_) {}
  return []
}

function saveRolledDungeons(list: RolledDungeon[]) {
  try { localStorage.setItem(DGEN_SK, JSON.stringify(list)) } catch (_) {}
}

/** 阶位写法归一: schema 用「一阶」，TIER_ORDER 用「1阶」，榜单按下标 0~4 取 */
const 阶位归一: Record<string, number> = {
  '一阶': 0, '二阶': 1, '三阶': 2, '四阶': 3, '五阶': 4,
  '1阶': 0, '2阶': 1, '3阶': 2, '4阶': 3, '5阶': 4,
}

/** 按 CR 决定队友匹配池（规则 §三 与用户口径: ≥6 升一阶, ≥7 升两阶, =10 天榜） */
function buildMatchPool(cr: number, 阶位: string): string {
  const idx = 阶位归一[阶位] ?? 0
  if (cr <= 4) {
    return `玩家 CR=${cr}（≤4）：请自由生成同阶契约者作为队友，**不要**从排行榜抓人。等级与玩家同阶相近。`
  }
  const 偏移 = cr >= 10 ? 4 - idx : cr >= 7 ? 2 : cr >= 6 ? 1 : 0
  const board = RANK_BOARDS[Math.min(4, idx + 偏移)]
  const lines = board.items.map(i => `- ${i.name} ${i.team} Lv.${i.lv}`)
  return `玩家 CR=${cr}，阶位=${阶位}：从【${board.title}】中挑选队友。榜单候选（只有称号与势力，真名由你补全）：
${lines.join('\n')}
要求：被选中的契约者必须补上真名（禁止代号），并给出阵营。`;
}

export const useDungeonGenStore = defineStore('dungeonGen', () => {
  const rolledDungeons = ref<RolledDungeon[]>(loadRolledDungeons())
  const rolling = ref(false)
  const generating = ref(false)
  const writing = ref(false)
  const lastError = ref('')

  watchEffect(() => saveRolledDungeons(rolledDungeons.value))

  const latest = computed(() => rolledDungeons.value[0] ?? null)

  function getForumStore() { return useForumStore() }

  function nowStamp(): string {
    const d = new Date()
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') +
      ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
  }

  /** 读 stat_data 里的副本周期与玩家简报 */
  function readPlayerBrief(): { 副本周期: number; player: PlayerBrief; text: string } {
    const 兜底 = { 副本周期: 1, player: { 姓名: '', 等级: 1, 阶位: '一阶', CR: 3 }, text: '' }
    try {
      let vars: any = {}
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1
        if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {}
      } catch (_) {}
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {} } catch (_) {} }
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type: 'chat' }) ?? {} } catch (_) {} }
      const c = vars?.stat_data?.契约者
      if (!c) return 兜底
      const h = c.头部 ?? {}
      const player: PlayerBrief = {
        姓名: h.姓名 || '未知契约者',
        等级: Number(h.等级) || 1,
        阶位: h.阶位 || '一阶',
        CR: Number(h.CR) || 3,
      }
      const 副本周期 = Number(c.赛季信息?.当前副本周期) || 1
      const lines = [
        '【头部】' + JSON.stringify(h),
        '【职业】' + JSON.stringify(c.职业 ?? {}),
        '【属性】' + JSON.stringify(c.属性 ?? {}),
        '【小队】' + JSON.stringify(c.小队 ?? {}),
        '【副本经历】' + JSON.stringify(c.副本经历 ?? {}),
      ]
      return { 副本周期, player, text: lines.join('\n') }
    } catch (_) { return 兜底 }
  }

  /** 掷骰: 只掷, 不调 AI */
  function doRoll() {
    rolling.value = true
    lastError.value = ''
    try {
      const { 副本周期, player } = readPlayerBrief()
      const { build, records: buildRecords } = rollBuild(副本周期)
      const { rewards, records: rewardRecords } = rollRewards()
      const maxId = rolledDungeons.value.reduce((m, d) => Math.max(m, d.id), 0)
      const entry: RolledDungeon = {
        id: maxId + 1,
        createdAt: nowStamp(),
        buildRecords,
        rewardRecords,
        build,
        rewards,
      }
      rolledDungeons.value.unshift(entry)
    } catch (e: any) {
      lastError.value = e.message || '掷骰失败'
    } finally {
      rolling.value = false
    }
  }

  /** 生成: 用最新一次掷骰结果调 AI 产出副本内容 */
  async function generate() {
    if (generating.value) return
    const entry = latest.value
    if (!entry) { lastError.value = '请先掷骰'; return }

    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generating.value = true
    lastError.value = ''
    try {
      const { player, text: playerText } = readPlayerBrief()
      const wb = await forumStore.getWorldbookContent()
      const 匹配池 = buildMatchPool(player.CR, player.阶位)
      const prompt = buildDungeonPrompt(entry.build, [...entry.buildRecords, ...entry.rewardRecords], playerText, wb, 匹配池)
      const raw = await aiGenerate(cfg, prompt, {
        name: 'dungeon_generation',
        value: JSON.parse(JSON.stringify(z.toJSONSchema(DungeonGenResultSchema, { io: 'input' }))),
      })
      const parsed = DungeonGenResultSchema.parse(extractJSON(raw))
      const idx = rolledDungeons.value.findIndex(d => d.id === entry.id)
      if (idx < 0) return
      rolledDungeons.value[idx] = {
        ...rolledDungeons.value[idx],
        result: parsed,
        panelText: assemblePanelText(parsed, entry.build, entry.rewards, player),
        enterPrompt: buildEnterPrompt(parsed, entry.build),
      }
    } catch (e: any) {
      lastError.value = e.message || '生成失败'
    } finally {
      generating.value = false
    }
  }

  /** 重roll: 丢弃 AI 产物, 重新掷骰 */
  function reroll() {
    const entry = latest.value
    if (entry) rolledDungeons.value = rolledDungeons.value.filter(d => d.id !== entry.id)
    doRoll()
  }

  /** 写入 MVU 变量（Task 8 实现） */
  async function writeToSave(_id: number): Promise<boolean> {
    lastError.value = '写入存档将在下一步实现'
    return false
  }

  /** 填入酒馆输入框（Task 8 实现） */
  async function fillInput(_id: number): Promise<boolean> {
    lastError.value = '填入输入框将在下一步实现'
    return false
  }

  function remove(id: number) {
    rolledDungeons.value = rolledDungeons.value.filter(d => d.id !== id)
  }

  return {
    rolledDungeons, rolling, generating, writing, lastError, latest,
    doRoll, generate, reroll, writeToSave, fillInput, remove,
  }
})
```

- [ ] **Step 3: 构建与范围化类型检查**

Run: `pnpm build && pnpm exec tsc --noEmit 2>&1 | grep "wxhl-003/store.ts"`
Expected: 构建成功；类型检查**只应出现那 1 条既存错误** `store.ts(327,9): error TS6133: 'MODULE_SUMMARY' is declared but its value is never read`。出现任何**其它** store.ts 错误都必须修掉。

- [ ] **Step 4: 记录 JSON schema 兜底方案（只在真的被拒时才做）**

`z.toJSONSchema(DungeonGenResultSchema)` 生成的 schema 可能带 `$ref`/`anyOf`，部分 OpenAI 兼容端点会拒绝。若实测中 `generateRaw` 因 schema 报错，退化路径：在 `dungeonRules.ts` 里另导出一个手写的 `DUNGEON_GEN_JSON_SCHEMA` 常量（照 `store.ts:1158` 的 `DUNGEON_V1_SCHEMA` 写法），把 Task 7 Step 2 里的 `value` 换成它。**先用生成的 schema 试，只有被拒时才退化** —— 手写 schema 与 zod 定义容易失同步。

- [ ] **Step 5: 确认 `RANK_BOARDS` 已被 import**

`store.ts:1` 的 import 里已含 `RANK_BOARDS`。若没有，补上。

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/store.ts
git commit -m "feat(wxhl): 新增副本生成 store 的掷骰、AI 生成与持久化"
```

---

### Task 8: `store.ts` — 写变量与填输入框

**Files:**
- Modify: `src/wxhl-003/store.ts`（替换 Task 7 留下的两个桩函数）

**Interfaces:**
- Consumes: Task 7 的 `RolledDungeon`、`mapToVariables`
- Produces: 可用的 `writeToSave(id)` / `fillInput(id)`

- [ ] **Step 1: 补 import，然后替换 `writeToSave` 实现**

**先补 import**：Task 7 的 store 代码里没有用到 `mapToVariables`，在 `noUnusedLocals` 下它会被报为死代码，所以 Task 7 的实现者把它从 import 行里删掉了。本任务的 `writeToSave` 要用它，**必须先在 `store.ts` 顶部那行 dungeonRules 的 import 里加回 `mapToVariables`**：

```ts
import { DungeonGenResultSchema, assemblePanelText, mapToVariables, type DungeonGenResult, type PlayerBrief } from './dungeonRules'
```

然后替换 `writeToSave`：

```ts
  /** 把生成结果写进 MVU 变量。逐条 _.set, 不清空不覆盖无关字段 */
  async function writeToSave(id: number): Promise<boolean> {
    const entry = rolledDungeons.value.find(d => d.id === id)
    if (!entry?.result) { lastError.value = '该条目还没有生成结果'; return false }
    writing.value = true
    lastError.value = ''
    try {
      await waitGlobalInitialized('Mvu')
      // 与竞技场写「当前敌人」保持一致的楼层探测: 全局脚本 iframe 无楼层上下文时回退最新楼层
      let message_id: number | 'latest' = -1
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1
        if (mid && mid !== -1) message_id = mid
      } catch (_) {}
      const { player } = readPlayerBrief()
      const vars = mapToVariables(entry.result, entry.build, entry.rewards, player)
      const mvu = Mvu.getMvuData({ type: 'message', message_id })
      for (const [key, value] of Object.entries(vars)) {
        // 数组路径: 每个元素都是字面量 key, 名字含「.」也不会被 lodash 当作层级分隔
        _.set(mvu, ['stat_data', '契约者', key], value)
      }
      await Mvu.replaceMvuData(mvu, { type: 'message', message_id })
      const idx = rolledDungeons.value.findIndex(d => d.id === id)
      if (idx >= 0) {
        rolledDungeons.value[idx] = { ...rolledDungeons.value[idx], written: { at: nowStamp(), messageId: message_id } }
      }
      toastr.success('副本已写入存档')
      return true
    } catch (e: any) {
      lastError.value = e?.message || '写入存档失败'
      toastr.error('写入存档失败: ' + lastError.value)
      return false
    } finally {
      writing.value = false
    }
  }
```

- [ ] **Step 2: 替换 `fillInput` 实现**

```ts
  /** 把「进入副本」提示词填入酒馆输入框, 只填入不发送 */
  async function fillInput(id: number): Promise<boolean> {
    const entry = rolledDungeons.value.find(d => d.id === id)
    if (!entry?.enterPrompt) { lastError.value = '该条目还没有进本提示词'; return false }
    lastError.value = ''
    const text = entry.enterPrompt
    // 优先直接操作输入框并派发 input 事件（行为可预测）；失败再退回 STScript /setinput
    try {
      const $ta = $('#send_textarea')
      if ($ta.length === 0) throw new Error('未找到输入框 #send_textarea')
      $ta.val(text).trigger('input')
      toastr.success('已填入输入框')
      return true
    } catch (e: any) {
      try {
        // /setinput 取整行剩余内容, 换行会截断命令, 故压成单行
        await triggerSlash('/setinput ' + text.replace(/\r?\n/g, ' '))
        toastr.success('已填入输入框')
        return true
      } catch (_) {
        lastError.value = e?.message || '填入输入框失败'
        toastr.error('填入输入框失败: ' + lastError.value)
        return false
      }
    }
  }
```

- [ ] **Step 3: 确认 `writing` 已导出**

Task 7 的 return 里已含 `writing`。若没有，补上。

- [ ] **Step 4: 构建与范围化类型检查**

Run: `pnpm build && pnpm exec tsc --noEmit 2>&1 | grep "wxhl-003/store.ts"`
Expected: 构建成功；store.ts 仍只应出现那 1 条既存错误（`MODULE_SUMMARY`）

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/store.ts
git commit -m "feat(wxhl): 副本生成支持写入 MVU 变量与填入输入框"
```

---

### Task 9: `App.vue` — 桌面图标、视图骨架与掷骰面板

**Files:**
- Modify: `src/wxhl-003/App.vue`

**Interfaces:**
- Consumes: `useDungeonGenStore`（Task 7）
- Produces: `currentView === 'dungeonRoll'` 的视图与掷骰面板

- [ ] **Step 1: 桌面加第 6 个图标**

在 `App.vue:26`（PvP竞技场那行）之后插入：

```html
      <div class="app-icon-wrapper" @click="openDungeonRoll"><div class="app-icon dungeonroll-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="4"/><circle cx="8.5" cy="8.5" r="1.3"/><circle cx="15.5" cy="8.5" r="1.3"/><circle cx="8.5" cy="15.5" r="1.3"/><circle cx="15.5" cy="15.5" r="1.3"/><circle cx="12" cy="12" r="1.3"/></svg></div><span class="app-label">副本生成</span></div>
```

- [ ] **Step 2: 加视图（插在副本攻略详情页之后）**

在 `App.vue` 的副本攻略详情页 `</div>` 之后、PvP 竞技场视图之前插入：

```html
<!-- ============ 副本生成 ============ -->
<div v-if="currentView==='dungeonRoll'" class="app-page">
  <div class="app-header"><button class="hdr-btn" @click="goDesktop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><span class="hdr-title">副本生成</span><span class="hdr-spacer"></span></div>

  <div class="scroll-area">
    <div v-if="dungeonGenStore.lastError" class="refresh-err">{{ dungeonGenStore.lastError }}</div>

    <div v-if="playerCycleLabel" class="roll-cycle">{{ playerCycleLabel }}</div>

    <button class="roll-btn" :disabled="dungeonGenStore.rolling" @click="onRollDungeon">
      {{ dungeonGenStore.rolling ? '掷骰中...' : '🎲 掷骰' }}
    </button>

    <template v-if="dungeonGenStore.latest">
      <div class="roll-section">
        <div class="roll-section-title">世界底色与局势</div>
        <div v-for="r in dungeonGenStore.latest.buildRecords" :key="r.标签" class="roll-row">
          <span class="roll-label">{{ r.标签 }}</span>
          <span class="roll-expr">{{ r.表达式 }}</span>
          <span class="roll-value">{{ r.骰值 }}</span>
          <span class="roll-map">{{ r.映射 }}</span>
        </div>
      </div>
      <div class="roll-section">
        <div class="roll-section-title">奖励骰（{{ dungeonGenStore.latest.rewardRecords.length }} 个）</div>
        <div v-for="r in dungeonGenStore.latest.rewardRecords" :key="r.标签" class="roll-row">
          <span class="roll-label">{{ r.标签 }}</span>
          <span class="roll-expr">{{ r.表达式 }}</span>
          <span class="roll-value">{{ r.骰值 }}</span>
          <span class="roll-map">{{ r.映射 }}</span>
        </div>
      </div>
      <button class="confirm-btn" :disabled="dungeonGenStore.generating" @click="onGenerateDungeon">
        {{ dungeonGenStore.generating ? '生成中...' : '生成副本' }}
      </button>
    </template>

    <div v-else class="empty-state">
      <div class="empty-text">尚未掷骰</div>
      <div class="empty-sub">点上面的按钮掷出副本类型、世界底色、局势、IP 热度与全部奖励骰</div>
    </div>
  </div>

  <div v-if="dungeonGenStore.generating" class="gen-overlay"><div class="gen-spinner"></div><span>AI 正在构建副本...</span></div>
</div>
```

- [ ] **Step 3: 加脚本部分**

**先把新 store 加进 App.vue 顶部的 store 导入行**（`App.vue:615`，现在是 `import { useForumStore, useCareerStore, useDungeonStore, useWorkshopStore } from './store'`），补成：

```ts
import { useForumStore, useCareerStore, useDungeonStore, useWorkshopStore, useDungeonGenStore } from './store'
```

然后在 `<script setup>` 内、`const workshopStore = useWorkshopStore()` 那一组附近加：

```ts
const dungeonGenStore = useDungeonGenStore()
```

**再改 `currentView` 的联合类型**（`App.vue:693` 附近），加入 `'dungeonRoll'`：

```ts
const currentView = ref<'desktop'|'forum'|'settings'|'career'|'dungeon'|'dungeonRoll'|'arena'>('desktop')
```

不改这行的话，`openDungeonRoll()` 里的赋值与模板里的比较都会是类型错误（本仓库不做 `.vue` 类型检查，所以只会在运行时表现为视图切不过去）。

然后在同一批脚本绑定里继续加：

```ts
const playerCycle = ref<number>(1)
const playerCycleLabel = computed(() =>
  playerCycle.value === 1
    ? '当前副本周期 1 · 新手副本 · 强制和平 · 仅 1 名 IP 队友'
    : `当前副本周期 ${playerCycle.value} · 常规副本`,
)

function refreshPlayerCycle() {
  try {
    let vars: any = {}
    try {
      const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1
      if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {}
    } catch (_) {}
    if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {} } catch (_) {} }
    if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type: 'chat' }) ?? {} } catch (_) {} }
    playerCycle.value = Number(vars?.stat_data?.契约者?.赛季信息?.当前副本周期) || 1
  } catch (_) { playerCycle.value = 1 }
}

function openDungeonRoll() {
  currentView.value = 'dungeonRoll'
  dungeonGenStore.lastError = ''
  refreshPlayerCycle()
}

function onRollDungeon() { dungeonGenStore.doRoll() }
async function onGenerateDungeon() { await dungeonGenStore.generate() }
```

- [ ] **Step 4: 加样式（追加到 `<style scoped>` 末尾）**

```scss
.roll-cycle{font-size:11px;color:var(--chalk-d);text-align:center;padding:8px 0}
.roll-btn{display:block;width:calc(100% - 24px);margin:8px 12px;padding:14px;border:none;border-radius:10px;background:linear-gradient(135deg,#7c3aed,#4c1d95);color:#fff;font-size:15px;font-weight:700;letter-spacing:2px;cursor:pointer;&:disabled{opacity:.5}}
.roll-section{margin:10px 12px;border:1px solid rgba(120,80,40,.3);border-radius:8px;overflow:hidden}
.roll-section-title{padding:6px 8px;background:rgba(120,80,40,.18);font-size:11px;font-weight:700}
.roll-row{display:grid;grid-template-columns:1fr auto auto 1fr;gap:6px;align-items:center;padding:4px 8px;font-size:11px;border-top:1px solid rgba(120,80,40,.12)}
.roll-label{color:var(--chalk-d);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.roll-expr{color:var(--chalk-d);font-family:monospace;font-size:10px}
.roll-value{font-weight:700;color:#f0c674;font-family:monospace}
.roll-map{text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dungeonroll-icon{background:linear-gradient(135deg,#7c3aed,#4c1d95)}
```

- [ ] **Step 5: 构建验证**

Run: `pnpm build`
Expected: 构建成功。

**注意**：`tsc` 不检查 `.vue` 文件，仓库也没有装 `vue-tsc`，所以模板里的绑定错误（拼错 store 属性名、少写 `ref` 等）**不会被构建或类型检查拦住**，只会在 Task 11 的实测里暴露。本步只保证打包不炸。

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/App.vue
git commit -m "feat(wxhl): 副本生成入口与掷骰面板"
```

---

### Task 10: `App.vue` — 副本卡片、操作按钮与历史列表

**Files:**
- Modify: `src/wxhl-003/App.vue`

**Interfaces:**
- Consumes: Task 8 的 `writeToSave` / `fillInput`、Task 9 的视图
- Produces: 完整的副本生成交互

- [ ] **Step 1: 在掷骰面板之后插入卡片与历史**

在 Task 9 的「生成副本」按钮之后、`<div v-else class="empty-state">` 之前插入 `v-if="dungeonGenStore.latest?.result"` 的卡片块：

```html
    <div v-if="dungeonGenStore.latest?.result" class="dungeon-card">
      <div class="dc-name">{{ dungeonGenStore.latest.result.副本名称 }}</div>
      <div class="dc-meta">{{ dungeonGenStore.latest.result.副本来源 }}</div>
      <div class="dc-meta">【{{ dungeonGenStore.latest.build.副本类型 }}】 · {{ dungeonGenStore.latest.build.时间限制天 }}天 · 基准等级 Lv.{{ playerLevel }}</div>
      <div class="dc-bg">{{ dungeonGenStore.latest.result.副本背景 }}</div>

      <details class="dc-details"><summary>主线任务</summary>
        <div class="dc-line">{{ dungeonGenStore.latest.result.主线任务.名称 }}</div>
        <div class="dc-sub">{{ dungeonGenStore.latest.result.主线任务.说明 }}</div>
      </details>

      <details class="dc-details"><summary>支线任务 ×3</summary>
        <div v-for="t in dungeonGenStore.latest.result.支线任务" :key="t.名称" class="dc-line">
          <b>{{ t.名称 }}</b><div class="dc-sub">{{ t.说明 }}</div>
        </div>
      </details>

      <details class="dc-details"><summary>隐藏任务 ×2</summary>
        <div v-for="t in dungeonGenStore.latest.result.隐藏任务" :key="t.名称" class="dc-line">
          <b>{{ t.名称 }}</b><div class="dc-sub">{{ t.说明 }}</div>
        </div>
      </details>

      <details class="dc-details"><summary>世界事件 ×2</summary>
        <div v-for="e in dungeonGenStore.latest.result.世界事件" :key="e.名称" class="dc-line">
          <b>{{ e.名称 }}</b><div class="dc-sub">{{ e.说明 }}</div><div class="dc-sub">影响：{{ e.影响 }}</div>
        </div>
      </details>

      <details class="dc-details"><summary>副本成就 ×6</summary>
        <div v-for="(a, i) in dungeonGenStore.latest.result.副本成就" :key="a.名称" class="dc-line">
          <b>{{ ACHIEVEMENT_TIERS[i] }} {{ a.名称 }}</b><div class="dc-sub">{{ a.难度 }}</div>
        </div>
      </details>

      <details class="dc-details"><summary>契约者名单 / 固有角色</summary>
        <div class="dc-line"><b>契约者</b>
          <div class="dc-sub">{{ dungeonGenStore.latest.result.其他契约者.map(c => '[' + (c.称号 === '无' ? '无称号' : c.称号) + ']' + c.真名 + ' Lv.' + c.等级).join('，') }}</div>
        </div>
        <div class="dc-line"><b>固有角色</b>
          <div class="dc-sub">{{ dungeonGenStore.latest.result.固有角色.map(r => r.名称 + ' (Lv.' + r.等级 + ' | ' + r.位阶 + ')').join('，') }}</div>
        </div>
      </details>

      <div class="dc-actions">
        <button class="confirm-btn" :disabled="dungeonGenStore.writing" @click="onWriteDungeon(dungeonGenStore.latest.id)">
          {{ dungeonGenStore.latest.written ? '已写入存档' : '写入存档' }}
        </button>
        <button class="confirm-btn modify" @click="onFillDungeonInput(dungeonGenStore.latest.id)">填入输入框</button>
        <button class="confirm-btn modify" @click="onCopyPanel(dungeonGenStore.latest)">复制面板文本</button>
        <button class="confirm-btn reroll" :disabled="dungeonGenStore.rolling || dungeonGenStore.generating" @click="onRerollDungeonGen">🔄 重roll</button>
        <button class="confirm-btn" @click="onEnemyGenPlaceholder">敌人生成</button>
      </div>
    </div>

    <div v-if="dungeonGenStore.rolledDungeons.length > 1" class="roll-section">
      <div class="roll-section-title">历史记录</div>
      <div v-for="d in dungeonGenStore.rolledDungeons" :key="d.id" class="roll-row">
        <span class="roll-label">{{ d.result?.副本名称 || '（未生成）' }}</span>
        <span class="roll-expr">{{ d.build.副本类型 }}</span>
        <span class="roll-map">{{ d.createdAt }}</span>
        <button class="retry-link" @click="dungeonGenStore.remove(d.id)">删除</button>
      </div>
    </div>
```

- [ ] **Step 2: 加脚本**

```ts
const ACHIEVEMENT_TIERS = ['★ 探索级', '★★ 挑战级', '★★★ 破局级', '★★★★ 史诗级', '★★★★★ 传说级', '★★★★★★ 世界天花板']
const playerLevel = ref(1)

async function onWriteDungeon(id: number) { await dungeonGenStore.writeToSave(id) }
async function onFillDungeonInput(id: number) { await dungeonGenStore.fillInput(id) }
function onRerollDungeonGen() { dungeonGenStore.reroll() }

/** 复制 <Panel Enhancement> 面板文本, 用于贴给别人或存底 */
async function onCopyPanel(entry: { panelText?: string }) {
  if (!entry?.panelText) { toastr.info('还没有面板文本'); return }
  try {
    await navigator.clipboard.writeText(entry.panelText)
    toastr.success('面板文本已复制')
  } catch (e: any) {
    toastr.error('复制失败: ' + (e?.message || e))
  }
}

/** 敌人生成占位（阶段 C 实现） */
function onEnemyGenPlaceholder() { toastr.info('敌人生成规则待补，下一阶段实现') }
```

在 `refreshPlayerCycle()` 里补一行读出等级：

```ts
    playerLevel.value = Number(vars?.stat_data?.契约者?.头部?.等级) || 1
```

- [ ] **Step 3: 加样式**

```scss
.dungeon-card{margin:10px 12px;padding:10px;border:1px solid rgba(120,80,40,.35);border-radius:10px;background:rgba(30,20,15,.5)}
.dc-name{font-size:15px;font-weight:700;color:#f0c674}
.dc-meta{font-size:11px;color:var(--chalk-d);margin-top:2px}
.dc-bg{font-size:12px;margin-top:6px;line-height:1.5}
.dc-details{margin-top:6px;font-size:12px;& summary{cursor:pointer;color:#c9a227;font-weight:700}}
.dc-line{margin-top:4px}
.dc-sub{font-size:11px;color:var(--chalk-d);line-height:1.45}
.dc-actions{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
```

- [ ] **Step 4: 构建验证**

Run: `pnpm build`
Expected: 构建成功

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/App.vue
git commit -m "feat(wxhl): 副本生成卡片、写入/填入操作与历史列表"
```

---

### Task 11: 酒馆实测验收（**由用户执行，不由 subagent 执行**）

**Files:** 无（纯验证；发现问题则回到对应任务修）

**Interfaces:**
- Consumes: 阶段 A 全部产物
- Produces: 一份交给用户逐条勾选的验证单 + 用户回报的实测结果

**重要：本任务不派 subagent。** 执行者（controller）没有挂载 chrome-devtools MCP，无法驱动酒馆页面。本任务的产出是**一份可勾选的验证单**，交给用户在酒馆里跑，用户回报结果后如有问题再回到对应任务修。

**执行顺序：本任务是整个阶段的最后一步。** 先做完 Task 1~10 与 Task 12 的代码工作，再产出验证单交给用户。Task 12 的 Step 4（更新 spec 状态）留到用户回报实测通过之后再做。

**前置（用户侧）：** 确认 `$('#extensions_settings')` 里「酒馆助手-实时监听-允许监听」已开启 —— 开启后代码变更会热重载，不必手动 `pnpm build`；否则需要先 `pnpm build` 再把 `dist/wxhl-003/index.js` 导入酒馆替换同名脚本。

**执行者要做的：** 把下面 Step 1~9 整理成一份清单交给用户，然后**停下等回报**。不要自己动手实测，也不要假装测过。

- [ ] **Step 1: 确认脚本已加载且入口可见**

打开小手机 → 桌面应出现第 6 个图标「副本生成」。点击能进入视图且顶部显示「当前副本周期 N · …」。

- [ ] **Step 2: 验证掷骰**

点「🎲 掷骰」。检查：
- 世界底色与局势区显示的骰值范围正确（D6 三项 1~6、D50 两项 1~50、D40 一项 1~40、时间 3~14 天）
- 奖励骰区恰好 53 行
- 若 核心特色标签 ≥ 41，副本类型显示为「和平」
- **仅当 D4 掷出 2/3/4（即确实发生了覆盖）时**，额外出现一行「副本类型（日常规则覆盖）」。
  D4 掷出 1 时本来就是和平、没有发生覆盖，因此**不出现**该行才是正确行为
- 若 `当前副本周期 === 1`，不出现「副本类型」掷骰行，且类型为和平

- [ ] **Step 3: 验证生成**

点「生成副本」。等待 AI 返回后检查卡片：
- 副本名称/来源/背景/时间限制齐全
- 支线 3 条、隐藏 2 条、世界事件 2 条、成就 6 条且按 ★→★★★★★★ 排列

- [ ] **Step 4: 验证写入存档**

点「写入存档」。然后在 Console 里读取变量核对：

```js
const mid = -1
const v = getVariables({ type: 'message', message_id: mid })
console.log(JSON.stringify(v.stat_data.契约者.当前副本元数据, null, 2))
console.log(JSON.stringify(v.stat_data.契约者.当前副本任务, null, 2))
console.log(JSON.stringify(v.stat_data.契约者.其他契约者名单, null, 2))
console.log(JSON.stringify(v.stat_data.契约者.固有角色名单, null, 2))
```

Expected：
- `当前副本元数据.基准等级` 等于玩家当前等级
- 主线/支线的 `奖励` 数值与掷骰面板上显示的奖励骰**逐一对得上**
- 世界事件的 `奖励` 字段是「影响」文本
- 成就的 `难度` 形如 `★ 探索级 · …`
- 称号为「无」的契约者在名单里是 `无称号`
- **无关字段未被清空**（先记下写入前 `契约者.小队` / `背包` / `装备` 的快照，写入后对比不变）

- [ ] **Step 5: 验证填入输入框（桌面端）**

点「填入输入框」。检查酒馆输入框 `#send_textarea` 内容为进本提示词，且**没有被自动发送**。

- [ ] **Step 6: 验证填入输入框（手机端视口）**

用 devtools 切到手机视口（或按 `mobile-compat.js` 的判定条件模拟 `pointer: coarse`），重跑 Step 5。
Expected：同样成功。**若 `/setinput` 与 `#send_textarea` 都失败**，记录实际 DOM 结构与报错，回到 Task 8 修 `fillInput` 的选择器。

- [ ] **Step 7: 验证重roll**

点「🔄 重roll」。
Expected：生成新的一轮掷骰（骰值与上一轮不同），旧条目从列表移除；**存档里的副本数据保持不变**（重roll 不自动写入）。

- [ ] **Step 8: 验证敌人生成按钮**

点「敌人生成」。
Expected：弹出 toastr「敌人生成规则待补，下一阶段实现」，不发起任何请求、不改动任何变量。

- [ ] **Step 9: 验证复制面板文本**

点「复制面板文本」，把剪贴板内容粘贴到任意文本框检查。
Expected：是完整的 `<Panel Enhancement>` 文本，含三块子标签、6 行成就梯度（★→★★★★★★ 顺序）、`[称号]真名 Lv.X` 与 `名称 (Lv.X | 阶位)` 两种格式。

- [ ] **Step 10: 记录验收结果**

把 Steps 1-8 的实际结果写进提交说明或回报给用户，**失败的项要附上 Console 原始报错**，不要只写「失败」。

---

### Task 12: 敌人生成按钮占位与收尾

**Files:**
- Modify: `src/wxhl-003/App.vue`（如需调整按钮提示文案）

**Interfaces:**
- Consumes: Task 6 的 `buildEnemyPrompt` / `mapEnemiesToVariables` 桩
- Produces: 阶段 A 完整交付

- [ ] **Step 1: 确认占位按钮的提示可发现**

Task 10 的「敌人生成」按钮用的是点击弹 toastr（手机端原生 `title` 提示不显示，所以没用 `title`）。确认点击后弹出「敌人生成规则待补，下一阶段实现」。

- [ ] **Step 2: 确认接缝函数仍是显式抛出**

Run: `grep -n "待实现" src/wxhl-003/dungeonGen.ts`
Expected: 两处（`buildEnemyPrompt` 与 `mapEnemiesToVariables`），确保阶段 C 实现时不会静默返回空值

- [ ] **Step 3: 全量测试与构建**

Run: `pnpm test && pnpm build`
Expected: 测试全 PASS，构建成功

- [ ] **Step 4: 更新 spec 状态**

把 `docs/superpowers/specs/2026-09-19-dungeon-roll-and-forum-prompts-design.md` 开头的 `状态：待评审` 改为 `状态：阶段 A 已实现（YYYY-MM-DD），阶段 B 待启动`。

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/App.vue src/wxhl-003/dungeonGen.ts docs/superpowers/specs/2026-09-19-dungeon-roll-and-forum-prompts-design.md
git commit -m "feat(wxhl): 敌人生成占位按钮与阶段 A 收尾"
```

---

## 完成标准

阶段 A 完成的定义：

1. `pnpm test` 全绿，`pnpm build` 成功
2. 桌面有「副本生成」图标，能掷出 53+ 奖励骰与全部构建骰
3. AI 产出的副本经 zod 校验后写入 `契约者` 下 4 个变量字段，且奖励数值与掷骰面板逐一对得上
4. 「填入输入框」在桌面端与手机端视口下都可用，且不自动发送
5. 重roll 不污染存档
6. 「敌人生成」按钮存在且明确提示规则待补

后续：阶段 B（论坛提示词整改）另写一份计划，依赖本阶段对 `data.ts` 的改动。
