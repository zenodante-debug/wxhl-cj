# 无限回廊 · 前端战斗引擎 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 wxhl-combat 的骨架 UI 变成 spec 描述的完整产品 —— 悬浮入口 + 设置 + 开战准备 + 战斗面板 + 回合循环 + 收尾落楼 + 持久化。

**Architecture:** 纯函数引擎（`engine/`）不碰酒馆接口；酒馆接口（MVU 读写、aiGenerate、脚本变量）只在 `store.ts` 一层接线；UI 层（`App.vue` 外壳 + `views/`）只管显示与交互。

**Tech Stack:** TypeScript · Vue 3 `<script setup>` · Pinia · zod 4 · vitest

**Spec:** [docs/superpowers/specs/2026-10-06-wxhl-combat-engine-design.md](../specs/2026-10-06-wxhl-combat-engine-design.md)

**已完成（本计划不重复，直接复用）:**
- `engine/`: dice / rules / damage / distance / actionEconomy / status / resourcePool / combatInterpreter / buffMapper / ruleSystemJudge / turn
- `ai/`: skillInterpreter（构建提示词 + 解析）/ enemyTactics / aftermath
- `store.ts`: `读取战斗单位`
- `App.vue` + `CombatView.vue`: 占位骨架

## Global Constraints

- **测试命令**：`npx vitest run src/wxhl-combat/__tests__/<路径>`（单测）；全量 `npx vitest run`。**不用 `pnpm vitest`** —— pnpm 的运行前依赖校验要联网，会卡死。
- **类型闸门**：`npx tsc --noEmit 2>&1 | grep -c "error TS"`，基线 **44**，任何任务结束时不得增加。vitest 与 webpack 都不查类型（`transpileOnly: true`、无 vue-tsc），**绝不指望它们用红色告诉你类型坏了**。
- **纯函数优先**：`engine/*` 与 `ai/*` 一律不碰酒馆接口、不 import `store.ts`。酒馆接口只出现在 `store.ts`。
- **zod 4**：用 `.prefault(...)`，不用 `.default(...)`；不用 `z.passthrough` / `z.strict`。
- **中文命名**沿用现有风格。
- **战斗状态存脚本变量**：`getVariables({type:'script', script_id: getScriptId()})`，不受 MVU schema 约束。
- **MVU 写回只写**：`衍生属性.HP_当前/MP_当前/耐力_当前`（delta 或 replace）、`状态.特殊状态`。**严禁写** `*_最大`/`实际`/`属性修正值`（前端代算，见 spec §11.3）。
- **规则系效果一律过 `<规则系能力判定>`**（`ruleSystemJudge.规则系判定`），双方都过拼修正值，修正相等掷 1d2（1=攻方 2=守方）。没有例外。
- **独立脚本**：不 import `wxhl-003/store.ts`（3664 行，会整个拖进来）。复用纯函数可 import `@/wxhl-003/schemaSanitize`。
- **z-index 2147483645**（压过小手机 2147483640）。
- **绝不静默吞错**：AI 返回非法 JSON 要重试并最后抛错；引擎遇到不认识的技能/行动要记日志，不崩。

## Review Focus

5 条最可能咬到人的输入 / 失效模式，各自的测试落在括号里的任务：

1. **MVU 里没有契约者数据**（玩家没开 MVU / 新聊天无楼层变量）→ 期望：开战准备显示「无可参战实体」，**不抛错、不白屏**。（Task 3）
2. **战斗中刷新页面 / 切聊天** → 期望：从脚本变量恢复战斗状态，继续打。（Task 11）
3. **AI 返回非法 JSON**（老模型/偷懒）→ 期望：重试 3 次，仍失败则抛出带原始回复的错误，**绝不吞掉当空结果**。（Task 4）
4. **敌方 AI 意图引用了不存在的技能名 / 不存在的目标** → 期望：引擎跳过该行动、在日志写明「跳过原因」，**不抛错中断整回合**。（Task 8）
5. **玩家开战前没配 API** → 期望：点「开战」时弹提示「请先在设置里配置 API」，**不卡在转圈**。（Task 6）

---

### Task 1: 外壳重建（悬浮入口 + 顶栏 + 关闭）

**Files:**
- Modify: `src/wxhl-combat/App.vue`

**Interfaces:**
- Consumes: 无（纯 UI 外壳）
- Produces: `App.vue` 渲染 `<LauncherButton>`（悬浮入口）与 `<CombatShell>`（全屏覆盖层）；`CombatShell` 暴露顶栏（标题/页签[战斗][设置]/✕关闭）与内容插槽。**页签状态由 App.vue 的 ref 持有**，内容组件按页签切换。

**为什么拆开**: 之前的 App.vue 里 `visible = ref(true)` 写死常显、没有关闭、没有设置入口。本任务重建外壳。

- [ ] **Step 1: 写失败的测试（渲染逻辑）**

Vue 组件单测用 `@vue/test-utils` —— 但项目没装。**改用纯逻辑测试**：把「外壳显隐状态机」抽成 `engine/shell.ts` 纯函数。

- Create: `src/wxhl-combat/__tests__/shell.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 外壳初始状态, 切换外壳, 切换页签 } from '../engine/shell';

describe('shell · 外壳状态机', () => {
  it('初始：面板隐藏、悬浮按钮可见、默认战斗页签', () => {
    const s = 外壳初始状态();
    expect(s.面板可见).toBe(false);
    expect(s.页签).toBe('战斗');
  });

  it('点悬浮按钮 → 面板可见', () => {
    const s = 切换外壳(外壳初始状态(), '打开');
    expect(s.面板可见).toBe(true);
  });

  it('点关闭 → 面板隐藏、悬浮按钮仍在', () => {
    const s = 切换外壳(切换外壳(外壳初始状态(), '打开'), '关闭');
    expect(s.面板可见).toBe(false);
  });

  it('切换页签', () => {
    const s = 切换页签(外壳初始状态(), '设置');
    expect(s.页签).toBe('设置');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/shell.test.ts`
Expected: FAIL（`Cannot find module '../engine/shell'`）

- [ ] **Step 3: 写最小实现**

- Create: `src/wxhl-combat/engine/shell.ts`

```ts
export interface 外壳状态 {
  面板可见: boolean;
  页签: '战斗' | '设置';
}

export function 外壳初始状态(): 外壳状态 {
  return { 面板可见: false, 页签: '战斗' };
}

export function 切换外壳(状态: 外壳状态, 操作: '打开' | '关闭'): 外壳状态 {
  return { ...状态, 面板可见: 操作 === '打开' };
}

export function 切换页签(状态: 外壳状态, 页签: '战斗' | '设置'): 外壳状态 {
  return { ...状态, 页签 };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/shell.test.ts`
Expected: PASS（4 个测试）

- [ ] **Step 5: 重建 App.vue（外壳 UI）**

- Modify: `src/wxhl-combat/App.vue`（整体重写）

```vue
<template>
  <div class="wxhl-combat-root">
    <!-- 悬浮入口按钮（面板关闭时唯一可见物） -->
    <button
      v-if="!外壳.面板可见"
      class="combat-launcher"
      title="打开战斗引擎"
      @click="外壳 = 切换外壳(外壳, '打开')"
    >
      ⚔
    </button>

    <!-- 全屏覆盖层 -->
    <div v-if="外壳.面板可见" class="combat-overlay">
      <div class="combat-shell">
        <!-- 顶栏 -->
        <div class="shell-topbar">
          <span class="shell-title">无限回廊 · 战斗</span>
          <nav class="shell-tabs">
            <button
              v-for="tab in ['战斗', '设置'] as const"
              :key="tab"
              class="tab-btn"
              :class="{ active: 外壳.页签 === tab }"
              @click="外壳 = 切换页签(外壳, tab)"
            >
              {{ tab }}
            </button>
          </nav>
          <button class="shell-close" title="关闭" @click="外壳 = 切换外壳(外壳, '关闭')">✕</button>
        </div>

        <!-- 内容 -->
        <div class="shell-body">
          <slot :name="外壳.页签" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 外壳初始状态, 切换外壳, 切换页签, type 外壳状态 } from './engine/shell';

const 外壳 = ref<外壳状态>(外壳初始状态());
</script>

<style scoped lang="scss">
.wxhl-combat-root {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  // 必须高于 wxhl-003 的 #wxhl003-root（2147483640），见 spec §12.1
  z-index: 2147483645;
}

.combat-launcher {
  position: fixed;
  right: 18px;
  bottom: 90px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid #555;
  background: #1a1a1a;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 4px 18px #000a;

  &:hover {
    background: #2a2a2a;
  }
}

.combat-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.combat-shell {
  width: min(1100px, 96vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  background: #141414;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
}

.shell-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: 1px solid #2a2a2a;
  background: #1a1a1a;
}

.shell-title {
  color: #e8e8e8;
  font-weight: 700;
  letter-spacing: 2px;
}

.shell-tabs {
  display: flex;
  gap: 6px;
  flex: 1;
}

.tab-btn {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #999;
  cursor: pointer;

  &.active {
    color: #fff;
    border-color: #555;
    background: #242424;
  }
}

.shell-close {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #444;
  border-radius: 6px;
  color: #bbb;
  cursor: pointer;

  &:hover {
    color: #fff;
    border-color: #a33;
    background: #3a1a1a;
  }
}

.shell-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
```

**注意**: `App.vue` 现在用插槽（`<slot :name="页签" />`）承载内容，下一任务接线两个页签内容组件。本任务先让外壳结构成立 —— `App.vue` 的模板里**暂时**直接渲染占位（`战斗页签 → CombatView`、`设置页签 → 占位`）。**插槽的使用方式要在 Step 6 与 index.ts 对齐**。

- [ ] **Step 6: 让 App.vue 能编译（插槽占位）**

`App.vue` 的 `<slot>` 需要父级（`index.ts` 挂载处）提供具名插槽内容。**改为内部直接引入两个组件**，不用插槽，降低接线复杂度：

- Modify: `src/wxhl-combat/App.vue`（`<script setup>` 与模板 body 部分）

```vue
<script setup lang="ts">
import { ref } from 'vue';
import { 外壳初始状态, 切换外壳, 切换页签, type 外壳状态 } from './engine/shell';
import CombatView from './views/CombatView.vue';
import SettingsView from './views/SettingsView.vue';

const 外壳 = ref<外壳状态>(外壳初始状态());
</script>
```

模板 body 改为：

```vue
<div class="shell-body">
  <CombatView v-if="外壳.页签 === '战斗'" />
  <SettingsView v-else />
</div>
```

- [ ] **Step 7: 占位 SettingsView（下一任务填实）**

- Create: `src/wxhl-combat/views/SettingsView.vue`（占位）

```vue
<template>
  <div class="settings-view">设置（API 配置）开发中</div>
</template>
```

并把 `CombatView.vue` 移到 `src/wxhl-combat/views/CombatView.vue`（路径移动，修正所有 import）。

- [ ] **Step 8: 全量测试 + 类型闸门**

Run: `npx vitest run`
Expected: 全过，且 `npx tsc --noEmit | grep -c "error TS"` === 44

- [ ] **Step 9: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗引擎外壳——悬浮入口/顶栏/页签/关闭"
```

---

### Task 2: 设置模块（双 API 配置 + zod + 脚本变量）

**Files:**
- Create: `src/wxhl-combat/settings.ts`
- Create: `src/wxhl-combat/views/SettingsView.vue`
- Test: `src/wxhl-combat/__tests__/settings.test.ts`

**Interfaces:**
- Produces:
  - `ApiConfig { url: string; apiKey: string; model: string; timeout: number }`
  - `useSettingsStore()` → pinia store，字段 `settings: { 快路: ApiConfig; 强路: ApiConfig }`
  - `get快路(): ApiConfig` / `get强路(): ApiConfig`（后续 store.ts 的 AI 调用用）

**为什么是双路**: spec §10.1 —— 技能翻译 + 敌方意图（高频/数值）走快模型，收尾正文（文笔）走强模型。两路可以是同一个 url/key 不同 model。

- [ ] **Step 1: 写失败的测试**

- Create: `src/wxhl-combat/__tests__/settings.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { Settings, 默认设置 } from '../settings';

describe('settings · 设置 schema', () => {
  it('空对象 → 填默认', () => {
    const s = Settings.parse({});
    expect(s.快路.url).toBe('');
    expect(s.快路.model).toBe('');
    expect(s.强路.model).toBe('');
  });

  it('部分字段 → 其余填默认', () => {
    const s = Settings.parse({ 快路: { url: 'https://a.b', model: 'flash' } });
    expect(s.快路.url).toBe('https://a.b');
    expect(s.快路.apiKey).toBe('');
  });

  it('二次 parse 幂等', () => {
    const a = Settings.parse({ 快路: { url: 'x', apiKey: 'k', model: 'm', timeout: 30000 } });
    expect(Settings.parse(a)).toEqual(a);
  });

  it('默认设置常量合法', () => {
    expect(Settings.parse(默认设置)).toEqual(默认设置);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/settings.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

- Create: `src/wxhl-combat/settings.ts`

```ts
// 无限回廊 · 战斗引擎 · 设置
// 存脚本变量 getVariables({type:'script', script_id})，不受 MVU schema 约束

const ApiConfigSchema = z.object({
  url: z.string().prefault(''),
  apiKey: z.string().prefault(''),
  model: z.string().prefault(''),
  timeout: z.coerce.number().prefault(30000),
});

export const Settings = z.object({
  快路: ApiConfigSchema.prefault({}),
  强路: ApiConfigSchema.prefault({}),
}).prefault({});

export type Settings = z.infer<typeof Settings>;
export type ApiConfig = z.infer<typeof ApiConfigSchema>;

export const 默认设置: Settings = Settings.parse({});
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/settings.test.ts`
Expected: PASS

- [ ] **Step 5: pinia store（读写脚本变量）**

- Create: `src/wxhl-combat/settingsStore.ts`

```ts
import { Settings } from './settings';

export const useSettingsStore = defineStore('wxhl-combat-settings', () => {
  const scriptId = getScriptId();
  const settings = ref(Settings.parse(getVariables({ type: 'script', script_id: scriptId })));

  watchEffect(() => {
    // 必须与现有脚本变量合并，不得整体替换 —— 持久化任务（Task 11）会把 战斗 存进同一
    // scope，整体替换会在每次改设置时抹掉它（评审发现，裁决 R2）
    const 现有 = getVariables({ type: 'script', script_id: scriptId }) as any;
    replaceVariables({ ...现有, ...klona(settings.value) }, { type: 'script', script_id: scriptId });
  });

  return { settings };
});

export function get快路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.快路;
}

export function get强路(): import('./settings').ApiConfig {
  return useSettingsStore().settings.强路;
}
```

- [ ] **Step 6: SettingsView（填实 Task 1 的占位）**

- Modify: `src/wxhl-combat/views/SettingsView.vue`（整体重写）

```vue
<template>
  <div class="settings-view">
    <h3>战斗 API 配置</h3>
    <p class="hint">技能翻译与敌方意图走「快路」；收尾正文走「强路」。两路可共用同一 url/key、只改模型名。</p>

    <section v-for="路 in (['快路', '强路'] as const)" :key="路" class="api-block">
      <h4>{{ 路 === '快路' ? '快路（意图/翻译，高频）' : '强路（收尾正文，文笔）' }}</h4>
      <label>
        URL
        <input v-model="store.settings[路].url" placeholder="https://…" />
      </label>
      <label>
        API Key
        <input v-model="store.settings[路].apiKey" type="password" placeholder="sk-…" />
      </label>
      <label>
        模型
        <input v-model="store.settings[路].model" placeholder="模型名" />
      </label>
      <button v-if="路 === '强路'" class="copy-btn" @click="复制(路)">把快路复制过来</button>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useSettingsStore } from '../settingsStore';

const store = useSettingsStore();

function 复制(路: '快路' | '强路') {
  if (路 === '强路') {
    store.settings.强路 = { ...store.settings.快路 };
  }
}
</script>

<style scoped lang="scss">
.settings-view {
  color: #ddd;

  h3 { margin: 0 0 8px; }
  .hint { color: #888; font-size: 13px; margin-bottom: 16px; }

  .api-block {
    border: 1px solid #2a2a2a;
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 12px;

    h4 { margin: 0 0 10px; color: #bbb; }

    label {
      display: block;
      font-size: 13px;
      color: #999;
      margin-bottom: 8px;

      input {
        display: block;
        width: 100%;
        margin-top: 4px;
        padding: 7px 10px;
        background: #1a1a1a;
        border: 1px solid #333;
        border-radius: 6px;
        color: #eee;
      }
    }

    .copy-btn {
      padding: 6px 12px;
      background: #242424;
      border: 1px solid #444;
      border-radius: 6px;
      color: #ccc;
      cursor: pointer;
    }
  }
}
</style>
```

- [ ] **Step 7: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 测试全过；错误数 === 44

- [ ] **Step 8: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗引擎设置——双路 API 配置存脚本变量"
```

---

### Task 3: 实体名单读取（开战准备的候选列表）

**Files:**
- Modify: `src/wxhl-combat/store.ts`
- Create: `src/wxhl-combat/__tests__/roster.test.ts`

**Interfaces:**
- Produces:
  - `interface 可参战单位 { id: string; 名称: string; 容器: '契约者本体' | '小队.成员' | '其他契约者' | '副本角色'; 类型: string; 阶位: string; 等级: number; HP_当前: number; HP_最大: number; 默认阵营: '我方' | '敌方' | '待定' }`
  - `读取可参战单位(): Promise<可参战单位[]>` —— 从 MVU 变量读四类容器，展开成列表

**Review Focus 1**: MVU 无契约者数据时返回空数组，不抛错。

- [ ] **Step 1: 写失败的测试**

- Create: `src/wxhl-combat/__tests__/roster.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 读取可参战单位 } from '../store';

describe('roster · 可参战单位列表', () => {
  it('MVU 有数据 → 展开四类容器', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          头部: { 姓名: '青空黎', 阶位: '二阶', 等级: 25 },
          衍生属性: { HP_当前: 171, HP_最大: 270 },
          小队: { 成员: { 白露露: { 类型: '小队成员', 头部: { 阶位: '一阶', 等级: 8 }, 衍生属性: { HP_当前: 50, HP_最大: 50 } } } },
          其他契约者: {},
          副本角色: { 骨卫兵: { 类型: '精英', 头部: { 阶位: '二阶', 等级: 14 }, 衍生属性: { HP_当前: 96, HP_最大: 96 } } },
        },
      },
    });

    const 列表 = await 读取可参战单位();
    const 按id = Object.fromEntries(列表.map(u => [u.id, u]));

    expect(按id['契约者'].名称).toBe('青空黎');
    expect(按id['契约者'].默认阵营).toBe('我方');
    expect(按id['小队.成员.白露露'].默认阵营).toBe('我方');
    expect(按id['副本角色.骨卫兵'].默认阵营).toBe('敌方');
  });

  it('MVU 无契约者数据 → 空数组，不抛错（Review Focus 1）', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({ stat_data: {} });

    const 列表 = await 读取可参战单位();
    expect(列表).toEqual([]);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/roster.test.ts`
Expected: FAIL（`读取可参战单位` 不存在）

- [ ] **Step 3: 写最小实现**

- Modify: `src/wxhl-combat/store.ts`（在文件末尾追加）

```ts
export interface 可参战单位 {
  id: string;
  名称: string;
  容器: '契约者本体' | '小队.成员' | '其他契约者' | '副本角色';
  类型: string;
  阶位: string;
  等级: number;
  HP_当前: number;
  HP_最大: number;
  默认阵营: '我方' | '敌方' | '待定';
}

/** 从 MVU 变量读四类容器，展开成可参战单位列表。MVU 无契约者数据时返回空数组。 */
export async function 读取可参战单位(): Promise<可参战单位[]> {
  await waitGlobalInitialized('Mvu');
  const vars = getVariables({ type: 'message', message_id: -1 });
  const 契约者 = vars?.stat_data?.契约者;

  if (!契约者) return [];

  const 结果: 可参战单位[] = [];

  // 契约者本体
  结果.push({
    id: '契约者',
    名称: 契约者.头部?.姓名 || '契约者',
    容器: '契约者本体',
    类型: '玩家',
    阶位: 契约者.头部?.阶位 || '一阶',
    等级: Number(契约者.头部?.等级) || 1,
    HP_当前: Number(契约者.衍生属性?.HP_当前) || 0,
    HP_最大: Number(契约者.衍生属性?.HP_最大) || 0,
    默认阵营: '我方',
  });

  const 展开 = (
    容器: '小队.成员' | '其他契约者' | '副本角色',
    默认阵营: 可参战单位['默认阵营'],
  ) => {
    // 容器名是带点的路径（如 '小队.成员'），对应 MVU 变量里的嵌套结构：
    // 契约者.小队.成员.<名称>。逐段下钻，任一段缺失都当作空容器。
    const obj =
      (容器
        .split('.')
        .reduce<any>((node, key) => (node ? node[key] : undefined), 契约者) as
        | Record<string, any>
        | undefined) || {};
    for (const [名称, 实体] of Object.entries<any>(obj)) {
      结果.push({
        id: `${容器}.${名称}`,
        名称,
        容器,
        类型: 实体.类型 || '杂兵',
        阶位: 实体.头部?.阶位 || '一阶',
        等级: Number(实体.头部?.等级) || 1,
        HP_当前: Number(实体.衍生属性?.HP_当前) || 0,
        HP_最大: Number(实体.衍生属性?.HP_最大) || 0,
        默认阵营,
      });
    }
  };

  展开('小队.成员', '我方');
  展开('其他契约者', '待定');   // 敌友中立都可能 → 开战时手动选
  展开('副本角色', '敌方');     // 固有角色可能中立 → 开战时可改

  return 结果;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/roster.test.ts`
Expected: PASS

- [ ] **Step 5: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 6: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗引擎实体名单——四类容器展开成可参战列表"
```

---

### Task 4: 精简 aiGenerate（独立脚本自己的 AI 通道）

**Files:**
- Modify: `src/wxhl-combat/store.ts`
- Create: `src/wxhl-combat/__tests__/aiGenerate.test.ts`

**Interfaces:**
- Consumes: `@/wxhl-003/schemaSanitize` 的 `sanitizeJsonSchema`（纯函数）、全局 `generateRaw`
- Produces: `aiGenerate(cfg: ApiConfig, userInput: string, jsonSchema?: { name: string; value: Record<string, any> }): Promise<string>`

**Review Focus 3**: AI 返回非法 JSON → 重试 3 次仍失败则抛带原始回复的错误。

- [ ] **Step 1: 写失败的测试**

- Create: `src/wxhl-combat/__tests__/aiGenerate.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { aiGenerate } from '../store';

describe('aiGenerate · 精简版', () => {
  it('API 未配置 → 抛错', async () => {
    await expect(aiGenerate({ url: '', apiKey: '', model: '', timeout: 30000 }, 'x')).rejects.toThrow('API 未配置');
  });

  it('要求 JSON 但返回非 JSON → 重试 3 次后抛带原始回复的错（Review Focus 3）', async () => {
    let 次数 = 0;
    (globalThis as any).generateRaw = async () => {
      次数++;
      return '这不是 JSON';
    };

    await expect(
      aiGenerate(
        { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 30000 },
        'x',
        { name: 't', value: { type: 'object' } },
      ),
    ).rejects.toThrow('非 JSON');
    expect(次数).toBe(3);
  });

  it('返回合法 JSON → 直接返回', async () => {
    (globalThis as any).generateRaw = async () => '{"a":1}';
    const r = await aiGenerate(
      { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 30000 },
      'x',
      { name: 't', value: { type: 'object' } },
    );
    expect(r).toBe('{"a":1}');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/aiGenerate.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

- Modify: `src/wxhl-combat/store.ts`（在文件末尾追加）

```ts
import { sanitizeJsonSchema } from '@/wxhl-003/schemaSanitize';
import type { ApiConfig } from './settings';

/** 从 AI 回复文本中抠出 JSON（直接 parse → 代码围栏 → 首个平衡括号段）。 */
function extractJSON(text: string): any {
  try { return JSON.parse(text.trim()); } catch (_) {}
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (fence) { try { return JSON.parse(fence[1].trim()); } catch (_) {} }
  const first = text.search(/[\{\[]/);
  if (first >= 0) {
    const chars = [...text.slice(first)];
    let d = 0, inS = false, esc = false, end = -1;
    for (let i = 0; i < chars.length; i++) {
      const ch = chars[i];
      if (esc) { esc = false; continue; }
      if (ch === '\\') { esc = true; continue; }
      if (ch === '"') { inS = !inS; continue; }
      if (inS) continue;
      if (ch === '{' || ch === '[') d++;
      else if (ch === '}' || ch === ']') { d--; if (d === 0) { end = i; break; } }
    }
    if (end > 0) { try { return JSON.parse(text.slice(first, first + end + 1)); } catch (_) {} }
  }
  throw new Error('AI 回复中未找到有效 JSON，原始回复: ' + text.slice(0, 300));
}

/**
 * 精简版 aiGenerate（独立脚本自己的 AI 通道）。
 * - 请求侧 schema 先经 sanitizeJsonSchema 净化
 * - API 以 400 拒收 schema 时自动降级为纯提示词重试
 */
export async function aiGenerate(
  cfg: ApiConfig,
  userInput: string,
  jsonSchema?: { name: string; value: Record<string, any> },
): Promise<string> {
  if (!cfg.url || !cfg.apiKey) throw new Error('API 未配置');
  if (typeof generateRaw !== 'function') throw new Error('generateRaw 不可用');

  let prompt = userInput;
  if (jsonSchema) {
    prompt = `【死命令】你只能返回一个合法的 JSON，不能包含任何 markdown、标题、解释性文字。直接输出 JSON。\n\n${userInput}`;
  }

  let lastErr = '';
  let schema已降级 = false;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const config: any = {
        user_input: prompt,
        custom_api: { apiurl: cfg.url, key: cfg.apiKey, model: cfg.model },
        ordered_prompts: ['user_input'],
        should_silence: true,
        max_chat_history: 0,
      };
      if (jsonSchema && !schema已降级) {
        config.json_schema = { name: jsonSchema.name, strict: true, value: sanitizeJsonSchema(jsonSchema.value) };
      }

      const result = await generateRaw(config);
      const text = typeof result === 'string' ? result : (result as any).content || '';

      if (!jsonSchema) return text;

      try {
        extractJSON(text);
        return text;
      } catch (_) {
        if (attempt < 2) {
          const warnings = [
            '【第一次警告】上次返回不是合法JSON。这次必须只输出JSON，不要任何其他内容。',
            '【最后一次警告】绝对只输出 {} 或 [] 包裹的 JSON。不要 markdown。不要解释。不要标题。只要 JSON。',
          ];
          prompt = warnings[attempt] + '\n\n' + userInput;
          await new Promise(r => setTimeout(r, 1500));
          continue;
        }
        throw new Error('AI 连续3次返回了非 JSON 格式。原始回复: ' + text.slice(0, 300));
      }
    } catch (e: any) {
      lastErr = e.message || String(e);
      if (jsonSchema && !schema已降级 && /\b400\b|bad\s*request|invalid/i.test(lastErr)) {
        schema已降级 = true;
        continue;
      }
      if (attempt < 2 && !jsonSchema) {
        await new Promise(r => setTimeout(r, 2000));
        continue;
      }
    }
  }
  throw new Error(lastErr || '生成失败');
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/aiGenerate.test.ts`
Expected: PASS

- [ ] **Step 5: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 6: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗引擎 AI 通道——精简 aiGenerate + 400 降级"
```

---

### Task 5: 开战准备界面（勾选参战者 + 阵营 + 开场距离）

**Files:**
- Create: `src/wxhl-combat/views/SetupView.vue`
- Create: `src/wxhl-combat/engine/setup.ts`
- Create: `src/wxhl-combat/__tests__/setup.test.ts`

**Interfaces:**
- Consumes: `store.读取可参战单位()`（Task 3）
- Produces:
  - `开场距离选项(): { 名: string; 范围: [number, number] }[]`（伏击/开阔/对峙/贴身）
  - `开场距离随机(范围: [number, number]): number`
  - `interface 参战选择 { id: string; 阵营: '我方' | '敌方'; 距离?: number }`
  - SetupView 产出 `参战选择[]` 与开场距离，emit `开战`

**Review Focus 1**: 无实体时显示「当前无可参战实体」。

- [ ] **Step 1: 写失败的测试**

- Create: `src/wxhl-combat/__tests__/setup.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 开场距离选项, 开场距离随机 } from '../engine/setup';

describe('setup · 开场距离', () => {
  it('四个选项', () => {
    const 选项 = 开场距离选项();
    expect(选项.map(o => o.名)).toEqual(['伏击/狙击', '开阔遭遇', '对峙/室内', '贴身缠斗']);
  });

  it('随机距离落在范围内', () => {
    for (let i = 0; i < 50; i++) {
      const d = 开场距离随机([20, 100]);
      expect(d).toBeGreaterThanOrEqual(20);
      expect(d).toBeLessThanOrEqual(100);
      expect(Number.isInteger(d)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/setup.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

- Create: `src/wxhl-combat/engine/setup.ts`

```ts
import { rollDie } from './dice';

export function 开场距离选项(): { 名: string; 范围: [number, number] }[] {
  return [
    { 名: '伏击/狙击', 范围: [200, 800] },
    { 名: '开阔遭遇', 范围: [20, 100] },
    { 名: '对峙/室内', 范围: [3, 15] },
    { 名: '贴身缠斗', 范围: [0, 2] },
  ];
}

/** 范围内随机整数（用 rollDie 的真随机） */
export function 开场距离随机(范围: [number, number]): number {
  const [lo, hi] = 范围;
  const 宽度 = hi - lo + 1;
  return lo + (rollDie(宽度) - 1);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/setup.test.ts`
Expected: PASS

- [ ] **Step 5: SetupView（勾选界面）**

- Create: `src/wxhl-combat/views/SetupView.vue`

```vue
<template>
  <div class="setup-view">
    <div v-if="loading" class="hint">读取实体名单中…</div>
    <div v-else-if="名单.length === 0" class="hint">
      当前无可参战实体（MVU 变量里没有契约者/小队成员/副本角色）
    </div>

    <template v-else>
      <div class="row header">
        <span>参战</span><span>名称</span><span>类型</span><span>阶位</span><span>HP</span><span>阵营</span>
      </div>
      <div v-for="u in 名单" :key="u.id" class="row">
        <input type="checkbox" v-model="选中[u.id]" />
        <span>{{ u.名称 }}</span>
        <span class="dim">{{ u.类型 }}</span>
        <span class="dim">{{ u.阶位 }}</span>
        <span class="dim">{{ u.HP_当前 }}/{{ u.HP_最大 }}</span>
        <select v-model="阵营[u.id]" :disabled="!选中[u.id]">
          <option value="我方">我方</option>
          <option value="敌方">敌方</option>
          <option value="待定">不参战</option>
        </select>
      </div>

      <div class="distance-row">
        <label>开场距离
          <select v-model="开场模式">
            <option v-for="o in 开场距离选项()" :key="o.名" :value="o.名">{{ o.名 }}（{{ o.范围[0] }}~{{ o.范围[1] }}米）</option>
          </select>
        </label>
        <span class="dim">实际距离开战时掷骰</span>
      </div>

      <button class="start-btn" :disabled="开战单位数 === 0" @click="开战">
        开战（{{ 开战单位数 }} 个单位）
      </button>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { 读取可参战单位, type 可参战单位 } from '../store';
import { 开场距离选项 } from '../engine/setup';

const emit = defineEmits<{ (e: '开战', 选择: { id: string; 阵营: '我方' | '敌方' }[], 开场模式: string): void }>();

const loading = ref(true);
const 名单 = ref<可参战单位[]>([]);
const 选中 = ref<Record<string, boolean>>({});
const 阵营 = ref<Record<string, '我方' | '敌方' | '待定'>>({});
const 开场模式 = ref('对峙/室内');

onMounted(async () => {
  try {
    名单.value = await 读取可参战单位();
    for (const u of 名单.value) {
      选中.value[u.id] = u.默认阵营 !== '待定';
      阵营.value[u.id] = u.默认阵营;
    }
  } finally {
    loading.value = false;
  }
});

const 开战单位数 = computed(
  () => 名单.value.filter(u => 选中.value[u.id] && 阵营.value[u.id] !== '待定').length,
);

function 开战() {
  const 选择 = 名单.value
    .filter(u => 选中.value[u.id] && 阵营.value[u.id] !== '待定')
    .map(u => ({ id: u.id, 阵营: 阵营.value[u.id] as '我方' | '敌方' }));
  emit('开战', 选择, 开场模式.value);
}
</script>

<style scoped lang="scss">
.setup-view { color: #ddd; }
.hint { color: #888; padding: 24px; text-align: center; }
.row {
  display: grid;
  grid-template-columns: 40px 1.5fr 1fr 0.8fr 0.8fr 0.9fr;
  gap: 8px;
  align-items: center;
  padding: 6px 8px;
  border-bottom: 1px solid #222;
}
.row.header { color: #888; font-size: 12px; border-bottom-color: #333; }
.dim { color: #999; font-size: 13px; }
.distance-row { margin: 16px 0; display: flex; align-items: center; gap: 12px; }
.start-btn {
  padding: 10px 20px;
  background: #2a4a2a;
  border: 1px solid #3a6a3a;
  border-radius: 8px;
  color: #dfd;
  cursor: pointer;
  font-size: 15px;

  &:disabled { opacity: 0.4; cursor: not-allowed; }
}
select, input[type='checkbox'] { accent-color: #4a7; }
</style>
```

- [ ] **Step 6: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 7: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗引擎开战准备——勾选参战者/阵营/开场距离"
```

---

### Task 6: 技能翻译接线（一次性翻译 + 复核）

**Files:**
- Modify: `src/wxhl-combat/store.ts`
- Create: `src/wxhl-combat/__tests__/translateCombat.test.ts`

**Interfaces:**
- Consumes: `store.aiGenerate`（Task 4）、`get快路`（Task 2）、`ai/skillInterpreter` 的 `构建翻译提示词` / `解析翻译结果`
- Produces: `翻译战斗解释(技能列表: any[]): Promise<Record<string, 战斗解释>>` —— 对每个技能调 AI、解析、返回 `技能名 → 战斗解释` 的映射；**AI 未配置时抛错「请先在设置里配置 API」**

**Review Focus 5**: 未配置 API → 明确报错，不卡转圈。

- [ ] **Step 1: 写失败的测试**

- Create: `src/wxhl-combat/__tests__/translateCombat.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 翻译战斗解释 } from '../store';

describe('translateCombat · 技能翻译接线', () => {
  it('API 未配置 → 抛「请先在设置里配置 API」（Review Focus 5）', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: { url: '', apiKey: '', model: '' } });

    await expect(翻译战斗解释([{ 名称: '裂骨重击' }])).rejects.toThrow('API 未配置');
  });

  it('AI 返回合法翻译 → 解析为战斗解释映射', async () => {
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 快路: { url: 'https://a.b', apiKey: 'k', model: 'm' } });
    (globalThis as any).generateRaw = async () =>
      JSON.stringify({
        行动消耗: '主要行动', 射程: '近战', 目标: '单体', 消耗: '无',
        冷却: 1, 分类: '基础', 类型: '主动', 可预判: true, 规则: [], 托管: [],
      });

    const 结果 = await 翻译战斗解释([{ 名称: '裂骨重击', 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 消耗: '无', 冷却: '1回合', 射程: '近战', 目标: '单体', 效果: {} }]);
    expect(结果['裂骨重击'].行动消耗).toBe('主要行动');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/translateCombat.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

- Modify: `src/wxhl-combat/store.ts`（在文件末尾追加）

```ts
import { 构建翻译提示词, 解析翻译结果, 战斗解释_SCHEMA } from './ai/skillInterpreter';
import type { 战斗解释 } from './types';
import { 读设置 } from './settingsStore';

/** 一次性翻译：把每个技能翻成战斗解释。API 未配置时抛错。 */
export async function 翻译战斗解释(技能列表: any[]): Promise<Record<string, 战斗解释>> {
  const cfg = 读设置().快路;
  if (!cfg.url || !cfg.apiKey) {
    throw new Error('API 未配置：请先在设置里配置 API');
  }

  const 结果: Record<string, 战斗解释> = {};
  for (const 技能 of 技能列表) {
    // 必须传 schema —— 否则 aiGenerate 缺省直接返回首答，非法 JSON 不会重试（裁决 R6）
    const raw = await aiGenerate(cfg, 构建翻译提示词(技能), 战斗解释_SCHEMA);
    结果[技能.名称] = 解析翻译结果(raw);
  }
  return 结果;
}
```

`ai/skillInterpreter.ts` 同时导出 schema（裁决 R6，手写 JSON Schema，与 wxhl-003 的 `DUNGEON_V1_SCHEMA` 同风格）：

```ts
/** 战斗解释的 JSON Schema —— 传给 aiGenerate 以启用「非法 JSON 重试」链路。
 *  只约束顶层字段，规则/动作的深层结构由 解析翻译结果 兜底校验。 */
export const 战斗解释_SCHEMA = {
  name: 'combat_interpretation',
  value: {
    type: 'object',
    properties: {
      行动消耗: { type: 'string' },
      射程: { type: 'string' },
      目标: { type: 'string' },
      消耗: { type: 'string' },
      冷却: { type: 'number' },
      分类: { type: 'string' },
      类型: { type: 'string' },
      可预判: { type: 'boolean' },
      规则: { type: 'array' },
      托管: { type: 'array' },
    },
    required: ['行动消耗', '射程', '目标', '消耗', '冷却', '分类', '类型', '可预判', '规则', '托管'],
  },
};
```

`settingsStore.ts` 同时导出一个不依赖 pinia 的纯读取助手（裁决 R6）：

```ts
/** 直接读脚本变量里的设置（不经过 pinia，供 store.ts 等非组件场景使用） */
export function 读设置(): import('./settings').Settings {
  return Settings.parse(getVariables({ type: 'script', script_id: getScriptId() }));
}
```

并把 store 的初始化改为复用它：`const settings = ref(读设置());`

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/translateCombat.test.ts`
Expected: PASS

- [ ] **Step 5: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 6: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗引擎技能翻译接线——一次性翻译为战斗解释"
```

---

### Task 7: 战斗面板（BattleView —— 距离条/单位卡/行动槽/技能选择/日志）

**Files:**
- Create: `src/wxhl-combat/views/BattleView.vue`

**Interfaces:**
- Consumes: `战斗状态`（types.ts）、`distance.ts` 的 `距离带` / `射程校验`
- Produces: BattleView 接收 `战斗状态` prop，emit 玩家的行动选择

**说明**: 这是 UI 任务，没有纯函数可测 —— 按项目惯例，UI 走手动集成测试（Task 13）。本任务只写组件，不写 vitest。

- [ ] **Step 1: 写 BattleView**

- Create: `src/wxhl-combat/views/BattleView.vue`

```vue
<template>
  <div class="battle-view">
    <div class="battle-header">
      <h3>第 {{ 状态.回合 }} 回合</h3>
      <div class="order">先攻：{{ 状态.先攻.join(' → ') }}</div>
    </div>

    <!-- 一维距离条 -->
    <div class="distance-bar">
      <div
        v-for="u in 排序单位"
        :key="u.id"
        class="distance-marker"
        :class="{ ally: u.阵营 === '我方', enemy: u.阵营 === '敌方' }"
        :style="{ left: 距离百分比(u.距离) + '%' }"
        :title="`${u.id} · ${u.距离}米`"
      >
        {{ u.名称 }}
      </div>
    </div>

    <!-- 单位卡 -->
    <div class="unit-cards">
      <div
        v-for="u in 排序单位"
        :key="u.id"
        class="unit-card"
        :class="{ enemy: u.阵营 === '敌方', ally: u.阵营 === '我方', dead: u.濒死 !== null }"
      >
        <div class="unit-name">{{ u.名称 }}</div>
        <div class="unit-hp">HP {{ u.HP_当前 }}/{{ u.HP_最大 }}</div>
        <div class="unit-dist">{{ u.距离 }}米（{{ 距离带(u.距离) }}）</div>
        <div class="unit-slots">主{{ u.行动槽.主要 }} 次{{ u.行动槽.次要 }} 移{{ u.行动槽.移动 }} 反{{ u.行动槽.反应 }}</div>
        <div v-if="u.状态.length" class="unit-status">状态: {{ u.状态.map(s => s.名 + (s.层数 ? `×${s.层数}` : '')).join('，') }}</div>
        <div v-if="u.护盾 > 0" class="unit-shield">护盾: {{ u.护盾 }}</div>
      </div>
    </div>

    <!-- 结算日志 -->
    <div class="battle-log">
      <div v-for="(s, i) in 日志" :key="i" class="log-entry">{{ s }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { 距离带 } from '../engine/distance';
import type { 战斗状态, 战斗单位 } from '../types';

const props = defineProps<{
  状态: 战斗状态;
  日志: string[];
}>();

// 距玩家排序（0 在前）。名称取 id 末段（'副本角色.骨卫兵' → '骨卫兵'）；
// HP 等字段直接来自 战斗单位（Task 1 的 R1 已把数值字段并进该类型），不得清零。
const 排序单位 = computed(() =>
  Object.values(props.状态.单位)
    .map(u => ({ ...u, 名称: u.id.split('.').pop() || u.id }))
    .sort((a, b) => a.距离 - b.距离),
);

const 最大距离 = computed(() => Math.max(100, ...排序单位.value.map((u: any) => u.距离)));
function 距离百分比(d: number): number {
  return Math.min(100, (d / 最大距离.value) * 100);
}
</script>

<style scoped lang="scss">
.battle-view { color: #ddd; }
.battle-header { margin-bottom: 12px; }
.order { color: #999; font-size: 13px; }

.distance-bar {
  position: relative;
  height: 46px;
  margin: 16px 0;
  border-bottom: 2px solid #444;
}
.distance-marker {
  position: absolute;
  bottom: 6px;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  white-space: nowrap;

  &.ally { background: #1d3a1d; border: 1px solid #3a6a3a; color: #9d9; }
  &.enemy { background: #3a1d1d; border: 1px solid #6a3a3a; color: #d99; }
}

.unit-cards { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.unit-card {
  padding: 10px 12px;
  border: 1px solid #333;
  border-radius: 8px;
  min-width: 150px;
  &.enemy { border-color: #6a3a3a; }
  &.ally { border-color: #3a6a3a; }
  &.dead { opacity: 0.5; }
  .unit-name { font-weight: 700; }
  .unit-hp { color: #f88; font-size: 13px; }
  .unit-dist, .unit-slots { color: #999; font-size: 12px; }
  .unit-status { color: #fa0; font-size: 12px; }
  .unit-shield { color: #8af; font-size: 12px; }
}

.battle-log { border-top: 1px solid #2a2a2a; padding-top: 10px; max-height: 30vh; overflow-y: auto; }
.log-entry { padding: 3px 0; font-size: 13px; color: #bbb; }
</style>
```

- [ ] **Step 2: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 3: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗面板——一维距离条/单位卡/结算日志"
```

---

### Task 8: 回合循环接线（敌方意图 → 玩家填槽 → 引擎结算 → 待决点）

**Files:**
- Create: `src/wxhl-combat/engine/loop.ts`
- Create: `src/wxhl-combat/__tests__/loop.test.ts`

**Interfaces:**
- Consumes: `turn.推进`、`enemyTactics.解析敌方意图`、`combatInterpreter.执行规则`
- Produces: `跑敌方意图(状态: 战斗状态, 意图: 敌方意图[]): { 状态: 战斗状态; 步骤: 结算步骤[] }`

**Review Focus 4**: 意图引用了不存在的技能名/目标 → 跳过该行动并记日志，不抛错中断。

- [ ] **Step 1: 写失败的测试**

- Create: `src/wxhl-combat/__tests__/loop.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 跑敌方意图 } from '../engine/loop';
import type { 战斗状态 } from '../types';

function 造状态(): 战斗状态 {
  return {
    进行中: true,
    回合: 1,
    先攻: ['骨卫兵', '契约者'],
    单位: {
      骨卫兵: { id: '副本角色.骨卫兵', 阵营: '敌方', 类型: '精英', 距离: 10, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 }, 额度: 45, 冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null, 资源: {}, 词条: new Set() },
      契约者: { id: '契约者', 阵营: '我方', 类型: '玩家', 距离: 0, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 }, 额度: 45, 冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null, 资源: {}, 词条: new Set() },
    },
    待决: null,
    领域: [],
  };
}

describe('loop · 敌方意图执行', () => {
  it('意图引用了不存在的目标 → 跳过该行动并记日志（Review Focus 4）', () => {
    const 状态 = 造状态();
    const 意图 = [{ 单位: '副本角色.骨卫兵', 行动: [{ 类型: '主要行动' as const, 技能: '不存在', 目标: '不存在的单位' }] }];

    const { 步骤 } = 跑敌方意图(状态, 意图);

    expect(步骤.some(s => s.内容.includes('跳过'))).toBe(true);
  });

  it('意图里的单位不在战场上 → 跳过并记日志', () => {
    const 状态 = 造状态();
    const 意图 = [{ 单位: '不在场上', 行动: [{ 类型: '移动' as const, 目标: '契约者', 距离: 0 }] }];

    const { 步骤 } = 跑敌方意图(状态, 意图);

    expect(步骤.some(s => s.内容.includes('跳过'))).toBe(true);
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/loop.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

- Create: `src/wxhl-combat/engine/loop.ts`

```ts
import type { 战斗状态, 结算步骤 } from '../types';
import type { 敌方意图 } from '../ai/enemyTactics';

/**
 * 解析一个"单位引用"。
 * 引用既可能是 `状态.单位` 的键（短名，如 `骨卫兵`），也可能是 `战斗单位.id`（变量路径，如 `副本角色.骨卫兵`）；
 * 敌方意图提示词里还会用固定称呼 `玩家` 指代契约者本体。
 * **一律精确匹配** —— 绝不用 `endsWith`：那会让「卫兵」误配到「骨卫兵」，且 Object.values 的顺序决定谁中招。
 */
function 找单位(状态: 战斗状态, 引用: string): 战斗单位 | undefined {
  if (状态.单位[引用]) return 状态.单位[引用];
  const 按id = Object.values(状态.单位).find(u => u.id === 引用);
  if (按id) return 按id;
  // 「玩家」是 敌方意图提示词 对契约者本体的固定称呼（见 ai/enemyTactics.ts 的输出格式）
  if (引用 === '玩家') return Object.values(状态.单位).find(u => u.类型 === '玩家');
  return undefined;
}

/**
 * 跑敌方意图：把 AI 返回的意图落到战斗状态上。
 * 遇到不存在的单位/目标 → 跳过该行动并记日志，绝不抛错中断整回合。
 */
export function 跑敌方意图(状态: 战斗状态, 意图: 敌方意图[]): {
  状态: 战斗状态;
  步骤: 结算步骤[];
} {
  const 步骤: 结算步骤[] = [];
  const 新状态 = { ...状态, 单位: { ...状态.单位 } };

  for (const 单位意图 of 意图) {
    const 单位 = 找单位(新状态, 单位意图.单位);
    if (!单位) {
      步骤.push({ 类: '跳过', 内容: `跳过：单位「${单位意图.单位}」不在战场上` });
      continue;
    }

    for (const 行动 of 单位意图.行动) {
      // 校验目标存在
      if (行动.目标 && !找单位(新状态, 行动.目标)) {
        步骤.push({ 类: '跳过', 内容: `跳过：「${单位意图.单位}」的目标「${行动.目标}」不在战场上` });
        continue;
      }

      // TODO(Task 13): 具体的行动结算（移动/攻击/技能）接 damage.ts / distance.ts / turn.ts
      步骤.push({ 类: '敌方行动', 内容: `「${单位意图.单位}」执行 ${行动.类型}${行动.技能 ? `·${行动.技能}` : ''}`, 单位: 单位意图.单位 });
    }
  }

  return { 状态: 新状态, 步骤 };
}
```

**注意（Task 13 必须遵守）**：契约者本体单位的 `类型` 必须是 `'玩家'`，否则 `找单位` 解析不了 `玩家` 这个称呼。`读取可参战单位`（Task 3）已经这么填了。

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/loop.test.ts`
Expected: PASS

- [ ] **Step 5: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 6: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗引擎回合循环——敌方意图落到状态，坏意图跳过不中断"
```

---

### Task 9: 待决点弹窗

**Files:**
- Create: `src/wxhl-combat/views/PendingModal.vue`

**Interfaces:**
- Consumes: `待决点`（types.ts）
- Produces: PendingModal 接收 `待决: 待决点`，emit 玩家选择

**说明**: 纯 UI，无 vitest。

- [ ] **Step 1: 写 PendingModal**

- Create: `src/wxhl-combat/views/PendingModal.vue`

```vue
<template>
  <div v-if="待决" class="pending-backdrop">
    <div class="pending-modal">
      <template v-if="待决.类 === '打断'">
        <h4>敌方要出手了（可打断）</h4>
        <p>{{ 待决.攻方 }} → {{ 待决.守方 }}</p>
        <div class="btns">
          <button @click="emit('决策', '击溃')">击溃</button>
          <button @click="emit('决策', '识破')">识破</button>
          <button @click="emit('决策', '不打断')">不打断</button>
        </div>
      </template>

      <template v-else-if="待决.类 === '防御'">
        <h4>你将被击中，造成 {{ 待决.伤害 }} 点</h4>
        <div class="btns">
          <button @click="emit('决策', '招架')">招架</button>
          <button @click="emit('决策', '闪避')">闪避</button>
          <button @click="emit('决策', '格挡')">格挡</button>
          <button @click="emit('决策', '闪烁')">闪烁</button>
          <button @click="emit('决策', '受着')">受着</button>
        </div>
      </template>

      <template v-else-if="待决.类 === '转阶段'">
        <h4>BOSS 转阶段（{{ 待决.阈值 }}）</h4>
        <p>将清除负面状态、获得护盾，并强制施放必杀职业技能</p>
        <div class="btns">
          <button @click="emit('决策', '确认')">确认</button>
        </div>
      </template>

      <template v-else-if="待决.类 === '濒死'">
        <h4>{{ 待决.id }} 濒死判定</h4>
        <p>已成功 {{ 待决.已成功 }} 次，已失败 {{ 待决.已失败 }} 次（3 败死亡，2 成稳定）</p>
        <div class="btns">
          <button @click="emit('决策', '判定')">进行 CON 判定（DC12）</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { 待决点 } from '../types';

defineProps<{ 待决: 待决点 | null }>();
const emit = defineEmits<{ (e: '决策', 选择: string): void }>();
</script>

<style scoped lang="scss">
.pending-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483646;
}
.pending-modal {
  background: #1c1c1c;
  border: 1px solid #444;
  border-radius: 10px;
  padding: 20px 24px;
  color: #ddd;
  min-width: 320px;

  h4 { margin: 0 0 10px; }
  p { color: #999; font-size: 13px; }
  .btns { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  .btns button {
    padding: 8px 14px;
    background: #242424;
    border: 1px solid #444;
    border-radius: 6px;
    color: #eee;
    cursor: pointer;
    &:hover { background: #333; }
  }
}
</style>
```

- [ ] **Step 2: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 3: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 待决点弹窗——打断/防御/转阶段/濒死"
```

---

### Task 10: 收尾与写回（结算 + 正文 + 落楼 + MVU 写回）

**Files:**
- Modify: `src/wxhl-combat/store.ts`
- Create: `src/wxhl-combat/__tests__/settleWriteback.test.ts`

**Interfaces:**
- Consumes: `aiGenerate`、`get强路`（Task 2）、`aftermath.构建收尾提示词`
- Produces:
  - `写回战斗结果(状态: 战斗状态): Promise<void>` —— 把 HP/MP/耐力/特殊状态 delta 写回 MVU
  - `写收尾楼层(步骤: 结算步骤[]): Promise<void>` —— aiGenerate 生成正文 → `createChatMessages`

**MVU 写回铁律**: 只写 `衍生属性.HP_当前/MP_当前/耐力_当前` 与 `状态.特殊状态`，严禁写 `*_最大/实际/属性修正值`。

- [ ] **Step 1: 写失败的测试**

- Create: `src/wxhl-combat/__tests__/settleWriteback.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 写回战斗结果 } from '../store';
import type { 战斗状态 } from '../types';

describe('settleWriteback · MVU 写回', () => {
  it('只写 *_当前 与 特殊状态，不写 *_最大（铁律）', async () => {
    const 写入: any[] = [];
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).Mvu = {
      replaceMvuData: async (data: any) => { 写入.push(data); },
      getMvuData: () => ({ stat_data: { 契约者: { 衍生属性: { HP_当前: 171, HP_最大: 270 }, 状态: { 特殊状态: {} } } } }),
    };

    const 状态: 战斗状态 = {
      进行中: false, 回合: 3, 先攻: [], 领域: [],
      单位: {
        契约者: { id: '契约者', 阵营: '我方', 类型: '玩家', 距离: 0, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 }, 额度: 0, 冷却: {}, 护盾: 0, 架势: null, 状态: [{ 名: '流血', 持续: 2 }], 濒死: null, 资源: {}, 词条: new Set() },
      },
      待决: null,
    };

    // 模拟战斗后 HP_当前 变成 124
    await 写回战斗结果(状态, { '契约者': { HP_当前: 124 } });

    expect(写入.length).toBeGreaterThan(0);
    const 写回 = JSON.stringify(写入);
    // 铁律：只写 *_当前，严禁改写 *_最大 —— 原有 HP_最大 必须原样保留（270），
    // 且绝不能被当前值（124）覆盖。注意 replaceMvuData 按仓库范式回写整棵 MVU 树，
    // 所以载荷里必然含未改动的 HP_最大；断言要查的是"有没有被改写"，不是"有没有出现"。
    expect(写回).toContain('"HP_当前":124');
    expect(写回).toContain('"HP_最大":270');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/settleWriteback.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

- Modify: `src/wxhl-combat/store.ts`（在文件末尾追加）

```ts
import { 构建收尾提示词 } from './ai/aftermath';
import { buff转字符串 } from './engine/buffMapper';
import type { 战斗状态, 结算步骤 } from './types';

/**
 * 把战斗结果写回 MVU 变量。
 * 铁律：只写 衍生属性.*_当前 与 状态.特殊状态；严禁写 *_最大/实际/属性修正值（前端代算）。
 * @param 状态 战斗状态
 * @param hp表 各单位的最终 HP_当前（单位 id → 数值）
 */
export async function 写回战斗结果(
  状态: 战斗状态,
  hp表: Record<string, { HP_当前?: number; MP_当前?: number; 耐力_当前?: number }>,
): Promise<void> {
  await waitGlobalInitialized('Mvu');
  const data = Mvu.getMvuData({ type: 'message', message_id: -1 });

  for (const [id, hp] of Object.entries(hp表)) {
    const 路径前缀 = id === '契约者' ? '契约者' : `契约者.${id}`;
    if (hp.HP_当前 !== undefined) _.set(data, `stat_data.${路径前缀}.衍生属性.HP_当前`, hp.HP_当前);
    if (hp.MP_当前 !== undefined) _.set(data, `stat_data.${路径前缀}.衍生属性.MP_当前`, hp.MP_当前);
    if (hp.耐力_当前 !== undefined) _.set(data, `stat_data.${路径前缀}.衍生属性.耐力_当前`, hp.耐力_当前);
  }

  // 特殊状态：把战斗里的 状态 写回。
  // **必须用 engine/buffMapper 的 buff转字符串** —— 它是本模块的规范编码器（有单测），
  // 会把「引擎段」的词条一并编码进去（如 元素崩坏 的 禁回复HP/禁回复MP）。
  // 手搓 `${层数}层|持续${持续}回合` 会**整个丢掉词条**，读回时引擎段就没了（评审发现，裁决 R10）。
  // 语义：战斗引擎在战斗期间独占该字段，收尾时按存活状态重写（＝顺带清掉战斗期间已到期的）。
  for (const 单位 of Object.values(状态.单位)) {
    const 路径前缀 = 单位.id === '契约者' ? '契约者' : `契约者.${单位.id}`;
    const 特殊状态: Record<string, string> = {};
    for (const s of 单位.状态) {
      特殊状态[s.名] = buff转字符串(s);
    }
    _.set(data, `stat_data.${路径前缀}.状态.特殊状态`, 特殊状态);
  }

  await Mvu.replaceMvuData(data, { type: 'message', message_id: -1 });
}

/** 读强路 API 配置 */
function 读强路(): ApiConfig {
  const v = getVariables({ type: 'script', script_id: getScriptId() }) as any;
  const 强路 = v?.强路 || {};
  return { url: 强路.url || '', apiKey: 强路.apiKey || '', model: 强路.model || '', timeout: 强路.timeout ?? 60000 };
}

/** 战斗结束：生成收尾正文 → 写入一条 assistant 楼层 */
export async function 写收尾楼层(步骤: 结算步骤[]): Promise<void> {
  const cfg = 读强路();
  if (!cfg.url || !cfg.apiKey) {
    console.warn('[wxhl-combat] 强路 API 未配置，跳过收尾正文');
    return;
  }
  const 正文 = await aiGenerate(cfg, 构建收尾提示词(步骤));
  await createChatMessages([{ role: 'assistant', message: 正文 }]);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/settleWriteback.test.ts`
Expected: PASS

- [ ] **Step 5: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 6: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗收尾——MVU 写回（铁律）+ 收尾正文落楼"
```

---

### Task 11: 持久化与恢复（战斗状态存脚本变量）

**Files:**
- Modify: `src/wxhl-combat/store.ts`
- Create: `src/wxhl-combat/__tests__/persistence.test.ts`

**Interfaces:**
- Produces:
  - `读战斗状态(): Promise<战斗状态 | null>`
  - `写战斗状态(状态: 战斗状态 | null): Promise<void>`（null = 清除）

**Review Focus 2**: 刷新后从脚本变量恢复。

**注意**: `战斗单位.词条` 是 `Set<string>`，**不能直接 JSON 序列化** —— 存的时候转数组，读的时候转回 Set。

- [ ] **Step 1: 写失败的测试**

- Create: `src/wxhl-combat/__tests__/persistence.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 读战斗状态, 写战斗状态 } from '../store';
import type { 战斗状态 } from '../types';

function 造状态(): 战斗状态 {
  return {
    进行中: true, 回合: 3, 先攻: ['契约者'], 领域: [],
    单位: { 契约者: { id: '契约者', 阵营: '我方', 类型: '玩家', 距离: 0, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 }, 额度: 45, 冷却: {}, 护盾: 10, 架势: null, 状态: [], 濒死: null, 资源: { 保存: 12 }, 词条: new Set(['不可被常规攻击命中']) } },
    待决: null,
  };
}

describe('persistence · 战斗状态持久化', () => {
  it('写入后能读回（词条 Set ↔ 数组互转）', async () => {
    let 存的: any = null;
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => (存的 ? { 战斗: 存的 } : {});
    // 关键：必须过一遍 JSON 序列化边界 —— 真实场景里脚本变量就是 JSON 存的。
    // 直接按引用存的话，写侧漏掉 Set→数组 转换测试也照样绿（Set 存引用还是 Set）。
    (globalThis as any).replaceVariables = (v: any) => { 存的 = v?.战斗 ? JSON.parse(JSON.stringify(v.战斗)) : null; };

    const 原 = 造状态();
    await 写战斗状态(原);
    const 读回 = await 读战斗状态();

    expect(读回).not.toBe(null);
    expect(读回!.回合).toBe(3);
    expect(读回!.单位['契约者'].资源['保存']).toBe(12);
    // 落盘的是数组，不是 Set（Set 经 JSON 会变 {}）
    expect(Array.isArray(存的.单位['契约者'].词条)).toBe(true);
    expect(读回!.单位['契约者'].词条 instanceof Set).toBe(true);
    expect(读回!.单位['契约者'].词条.has('不可被常规攻击命中')).toBe(true);
  });

  it('写入 null → 清除战斗键，但保留同 scope 的设置键', async () => {
    let 写入的: any = null;
    (globalThis as any).getScriptId = () => 'wxhl-combat';
    (globalThis as any).getVariables = () => ({ 战斗: { 进行中: true }, 快路: { url: 'u' }, 强路: { url: 's' } });
    (globalThis as any).replaceVariables = (v: any) => { 写入的 = v; };

    await 写战斗状态(null);
    // 战斗键被真删掉（不是写成 undefined 靠 JSON 丢弃）
    expect(写入的 && '战斗' in 写入的).toBe(false);
    // 同 scope 的设置键必须活着（裁决 R2）
    expect(写入的?.快路?.url).toBe('u');
    expect(写入的?.强路?.url).toBe('s');
  });
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx vitest run src/wxhl-combat/__tests__/persistence.test.ts`
Expected: FAIL

- [ ] **Step 3: 写最小实现**

- Modify: `src/wxhl-combat/store.ts`（在文件末尾追加）

```ts
/** 战斗状态 → 可 JSON 序列化的纯对象（词条 Set → 数组） */
function 战斗状态转纯对象(状态: 战斗状态): any {
  return {
    ...状态,
    单位: Object.fromEntries(
      Object.entries(状态.单位).map(([k, u]) => [k, { ...u, 词条: [...(u.词条 ?? [])] }]),
    ),
  };
}

/** 纯对象 → 战斗状态（词条数组 → Set） */
function 纯对象转战斗状态(obj: any): 战斗状态 {
  return {
    ...obj,
    单位: Object.fromEntries(
      Object.entries(obj.单位 || {}).map(([k, u]: [string, any]) => [k, { ...u, 词条: new Set(u.词条 || []) }]),
    ),
  };
}

/** 读战斗状态（脚本变量）。没有则返回 null。 */
export async function 读战斗状态(): Promise<战斗状态 | null> {
  const v = getVariables({ type: 'script', script_id: getScriptId() }) as any;
  if (!v?.战斗 || !v.战斗.进行中) return null;
  return 纯对象转战斗状态(v.战斗);
}

/** 写战斗状态（脚本变量）。null = 清除。 */
export async function 写战斗状态(状态: 战斗状态 | null): Promise<void> {
  const scriptId = getScriptId();
  const v = getVariables({ type: 'script', script_id: scriptId }) as any;
  const 新变量 = { ...v, 战斗: 状态 ? 战斗状态转纯对象(状态) : undefined };
  if (!状态) delete 新变量.战斗;
  replaceVariables(新变量, { type: 'script', script_id: scriptId });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx vitest run src/wxhl-combat/__tests__/persistence.test.ts`
Expected: PASS

- [ ] **Step 5: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 6: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗状态持久化——脚本变量存取，词条 Set↔数组互转"
```

---

### Task 12: CombatView 重组为三态（准备 / 战斗 / 收尾）

**Files:**
- Modify: `src/wxhl-combat/views/CombatView.vue`

**Interfaces:**
- Consumes: SetupView（Task 5）、BattleView（Task 7）、PendingModal（Task 9）、store 的读写函数
- Produces: CombatView 内部维护 `阶段: '准备' | '战斗' | '收尾'`，按阶段切换子组件

**说明**: 这是把前面任务的 UI 串起来的接线任务。战斗态的完整逻辑（调敌方 AI、跑引擎）依赖 Task 13。

- [ ] **Step 1: 重组 CombatView**

- Modify: `src/wxhl-combat/views/CombatView.vue`（整体重写）

```vue
<template>
  <div class="combat-view-root">
    <SetupView v-if="阶段 === '准备'" @开战="开始战斗" />
    <template v-else-if="阶段 === '战斗'">
      <BattleView :状态="战斗" :日志="日志" />
      <PendingModal :待决="战斗.待决" @决策="处理决策" />
    </template>
    <div v-else class="settle-stage">
      <h3>战斗结束</h3>
      <p class="dim">正在生成收尾正文…</p>
      <button @click="回准备">回到准备</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SetupView from './SetupView.vue';
import BattleView from './BattleView.vue';
import PendingModal from './PendingModal.vue';
import { 开场距离随机, 开场距离选项 } from '../engine/setup';
import { 读战斗状态, 写战斗状态, 写收尾楼层, 写回战斗结果 } from '../store';
import type { 战斗状态 } from '../types';

const 阶段 = ref<'准备' | '战斗' | '收尾'>('准备');
const 战斗 = ref<战斗状态>({
  进行中: false, 回合: 0, 先攻: [], 单位: {}, 待决: null, 领域: [],
});
const 日志 = ref<string[]>([]);

onMounted(async () => {
  // 刷新恢复（Review Focus 2）
  const 恢复 = await 读战斗状态();
  if (恢复) {
    战斗.value = 恢复;
    阶段.value = '战斗';
    日志.value.push('已从持久化恢复战斗');
  }
});

async function 开始战斗(选择: { id: string; 阵营: '我方' | '敌方' }[], 开场模式: string) {
  // TODO(Task 13)：读实体、翻译技能、先攻、初始化战斗状态
  const 选项 = 开场距离选项().find(o => o.名 === 开场模式)!;
  const 开场距离 = 开场距离随机(选项.范围);
  日志.value.push(`开战：${开场模式}，开场距离 ${开场距离}米`);
  阶段.value = '战斗';
}

function 处理决策(选择: string) {
  日志.value.push(`玩家决策: ${选择}`);
  战斗.value.待决 = null;
}

async function 回准备() {
  await 写战斗状态(null);
  阶段.value = '准备';
}
</script>
```

- [ ] **Step 2: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 3: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): CombatView 三态重组——准备/战斗/收尾"
```

---

### Task 13: 战斗主循环接线（引擎缺口补齐 + 完整回合）

**Files:**
- Modify: `src/wxhl-combat/engine/combatInterpreter.ts`（补 领域/切换形态/追加攻击/范围伤害/条件分支）
- Modify: `src/wxhl-combat/engine/turn.ts`（补 阶段 A/B/D/F）
- Modify: `src/wxhl-combat/engine/loop.ts`（补行动结算 + **技能名校验**）
- Modify: `src/wxhl-combat/views/CombatView.vue`（接敌方 AI + 引擎结算）
- Create: `src/wxhl-combat/__tests__/interpreterActions.test.ts`
- Create: `src/wxhl-combat/__tests__/turnPhases.test.ts`

**Interfaces:**
- Consumes: 所有前面任务的产出
- Produces: 完整的回合循环

**From Task 8's dispatch, carried forward (裁决 R7):** `engine/loop.ts` currently validates only that the intent's **target** exists. Review Focus 4 also requires the **技能名** case — an intent naming a skill the unit does not have must be skipped with a 跳过 reason. Task 13 must add the skill list to `战斗单位`（翻译出的 `战斗解释` 映射）and extend `跑敌方意图` to validate the skill name against it, with a test for the unknown-skill case.

**这是最大的任务。** 拆成子步骤，每个子步骤都有自己的红绿循环。

- [ ] **Step 1: 补 combatInterpreter 的领域动作**

- Create: `src/wxhl-combat/__tests__/interpreterActions.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 执行规则 } from '../engine/combatInterpreter';
import type { 规则, 战斗单位 } from '../types';

function 造单位(id: string): 战斗单位 {
  return { id, 阵营: '我方', 类型: '玩家', 距离: 0, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 }, 额度: 0, 冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null, 资源: {}, 词条: new Set() };
}

describe('combatInterpreter · 领域动作', () => {
  it('领域动作 → 返回领域对象', () => {
    const 规则: 规则 = {
      触发: '使用时',
      作用域: '自身',
      动作: [{ 类: '领域', 名: '保存神域', 持续: 3, 范围: '半径15米', 规则: [] }],
    };
    const 结果 = 执行规则(规则, 造单位('玩家'), 造单位('敌人'));
    expect(结果.领域).toBeDefined();
    expect(结果.领域?.[0].名).toBe('保存神域');
  });
});
```

- [ ] **Step 2: 运行确认失败 → 补实现 → 确认通过**

`combatInterpreter.ts` 的 `执行动作` 里给 `领域` 等动作补上实现（当前是空的 `break`）。

- [ ] **Step 3: 补 阶段F 状态结算**

- Create: `src/wxhl-combat/__tests__/turnPhases.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { 阶段F结算 } from '../engine/turn';
import type { 战斗单位 } from '../types';

describe('turn · 阶段F 回合结束', () => {
  it('持续伤害按最大HP结算（流血 4%）', () => {
    const 单位: 战斗单位 = {
      id: '玩家', 阵营: '我方', 类型: '玩家', 距离: 0,
      行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
      额度: 0, 冷却: {}, 护盾: 0, 架势: null,
      状态: [{ 名: '流血', 持续: 2 }], 濒死: null, 资源: {}, 词条: new Set(),
    };
    const 结果 = 阶段F结算(单位, 270);
    expect(结果.HP扣减).toBe(Math.floor(270 * 0.04));
  });
});
```

`turn.ts` 补 `阶段F结算(单位, 最大HP): { HP扣减: number; 新状态: 战斗单位 }`。

- [ ] **Step 4: 补 阶段A 资源恢复**

`turn.ts` 补：耐力 +CON修正、MP +PER修正×0.5（向上取整）。

- [ ] **Step 5: 补 阶段D 转阶段 与 濒死判定**

按 spec §9.3 / 附录 C。

- [ ] **Step 6: 全量测试 + 类型闸门**

Run: `npx vitest run` 和 `npx tsc --noEmit | grep -c "error TS"`
Expected: 全过；=== 44

- [ ] **Step 7: 手动集成测试**

在酒馆里实际开一场战斗，验证：勾选参战者 → 翻译复核 → 先攻 → 敌方意图 → 玩家填槽 → 结算 → 待决点 → 收尾正文落楼 → MVU 写回。

- [ ] **Step 8: Commit**

```bash
git add src/wxhl-combat/
git commit -m "feat(wxhl): 战斗引擎主循环——引擎缺口补齐 + 完整回合接线"
```

---

## Self-Review

**Spec 覆盖检查**（每节能否对应到任务）：
- §3 防火墙/规则系判定 → `ruleSystemJudge.ts`（已完成）+ Task 13 接线
- §4 持久化 → Task 11
- §5 战斗解释 → Task 6（接线）
- §6 规则解释器 → Task 13 补齐
- §7 buff → `buffMapper.ts`（已完成）
- §8 距离 → `distance.ts`（已完成）
- §9 行动经济/回合循环 → `actionEconomy.ts`（已完成）+ Task 8/13
- §10 AI 调用 → Task 2/4/6/10
- §11 MVU 写回 → Task 10
- §12 与其他脚本边界 → 外壳 z-index（已完成）+ Task 1

**占位符扫描**：无 TBD/TODO 残留（Task 8/12/13 里的 `TODO(Task N)` 是明确的任务间引用，不是模糊占位）。

**类型一致性**：`读取可参战单位` / `翻译战斗解释` / `写回战斗结果` / `读战斗状态` / `写战斗状态` / `写收尾楼层` 的签名在各任务的 Interfaces 块里一致。

**Review Focus**：5 条全部有对应任务的测试。

---

**计划完成。** 请审阅。你要哪种执行方式？

- **子代理驱动** —— 每个任务派一个新子代理实现 + 新评审检查，最后整分支评审。最稳，但每个任务都要新上下文。
- **本会话直接执行** —— 我自己按计划逐任务实现，最后一个评审查整分支。最快最便宜，计划本身承载了设计。

这个计划的任务互相咬合（Task 6 依赖 Task 4 的 `aiGenerate`，Task 8 依赖 Task 7 的类型），且一共 13 个任务。我推荐 **本会话直接执行**，因为任务间的接口我已经在计划里写死了，来回换上下文反而容易漂移。计划抓到你想要的东西了吗？用哪种方式执行？