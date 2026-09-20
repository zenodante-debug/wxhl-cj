# 设置模块整改：世界书条目级勾选 + 两套方案（① ② ③）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让「终端设置 → 世界书」支持**按条目勾选**，并给世界书选择与 API 配置各加一套**方案保存/切换**。

**Architecture:** 活配置（`settings.selectedWorldbooks` / `worldbookEntryFilter` / `apiMode` / `primary` / `secondary`）仍是**行为唯一来源** —— `getWorldbookContent()` 与 `getActiveCfg()` 的调用方一行不改。方案只是**快照**：保存 = 把活配置拷进方案；切换 = 把方案拷回活配置。

**Tech Stack:** TypeScript / Vue 3 SFC / Pinia / zod 4 / vitest

**Spec:** 无独立 spec；本计划由 2026-09-19 与用户的多轮对话确定（见「已确认的决定」）。

## 已确认的决定（不要再问）

1. **世界书读取走世界书**，不内联成常量 —— 用户的理由：等会还要加一个模块也需要这些规则，放世界书里是通用可达的。
2. **世界书方案与 API 方案是两份独立的方案**，各管各的，互不影响。
3. **`selectedWorldbooks` 保持整本勾选语义**，条目级筛选是**新增**的一个字段，旧设置不丢。
4. 敌人（副本角色）生成**依赖本计划的 ①**，将单独出计划（④）。本计划不含 ④。

## Global Constraints

- 工作分支 `feat/wxhl-dungeon-roll-module`（**不要合并、不要新建分支**）。
- **只 `git add` 本任务明确涉及的文件，严禁 `git add -A` / `git add .`。** 仓库工作区有大量无关的未提交改动。
- 不新增任何依赖。源码里不要手写 `z`/`ref`/`defineStore`/`klona`/`_`/`$`/`toastr`/`YAML` 的 import。
- 测试文件放 `src/wxhl-003/__tests__/`。
- **`pnpm build` 不做类型检查**（`ts-loader` + `transpileOnly: true`）；`.vue` 更是完全不检查 —— 涉及 `App.vue` 的改动必须逐行自查。
- 仓库 `tsc --noEmit` 现有 **10 条既存错误**，不要新增。
- **不要改**：`dice.ts` / `dungeonRules.ts` / `dungeonGen.ts` / `forumPrompts.ts` / `data.ts` 的规则常量 / `App.vue` 里除设置页与脚本绑定之外的部分（含状态栏 `◆ 回廊终端 · v2`）。
- 一律半角符号与冒号。文案：简体中文。

---

## 存储设计（三个任务共用）

`src/wxhl-003/store.ts` 的 `Settings` 接口**新增字段**（全部带默认值，保证旧 localStorage 数据不丢）：

```ts
export interface Profile<T> { name: string; value: T }

export interface Settings {
  // ……现有字段不动……
  apiMode: 'single' | 'multi'
  primary: ApiConfig; secondary: ApiConfig
  selectedWorldbooks: string[]
  wallpaper: string

  /** 世界书名 → 只读这些条目; null / 缺省 = 整本全取（＝改动前的行为） */
  worldbookEntryFilter: Record<string, string[] | null>

  /** 世界书方案（快照 = selectedWorldbooks + worldbookEntryFilter） */
  worldbookProfiles: Profile<{ selectedWorldbooks: string[]; worldbookEntryFilter: Record<string, string[] | null> }>[]
  activeWorldbookProfile: string      // 方案名; '' = 未使用方案

  /** API 方案（快照 = apiMode + primary + secondary） */
  apiProfiles: Profile<{ apiMode: 'single' | 'multi'; primary: ApiConfig; secondary: ApiConfig }>[]
  activeApiProfile: string
}
```

`load()` 里对每个新字段补默认值（`?? {}` / `?? []` / `?? ''`），**不要动既有的读取逻辑**。

**关键约定**：方案是**快照**，不是活配置。`getActiveCfg(settings)` 与 `getWorldbookContent()` **继续读活字段**，因此它们的调用方一行都不用改。

---

### Task 1: 世界书条目级读取（数据结构 + 读取逻辑，不含 UI）

**Files:**
- Modify: `src/wxhl-003/store.ts`（`Settings` / `load()` / `getWorldbookContent()`）
- Test: `src/wxhl-003/__tests__/worldbookFilter.test.ts`

**Interfaces:**
- Consumes: 无
- Produces:
  - `Settings.worldbookEntryFilter: Record<string, string[] | null>`
  - `export function filterWorldbookEntries(entries: {name:string; content:string; enabled?:boolean}[], filter: string[] | null | undefined): {name:string; content:string}[]`

- [ ] **Step 1: 确认条目有 `name` 字段**

Run: `grep -n "name\|content\|enabled" @types/function/worldbook.d.ts | head -20`

条目类型里应有 `name: string` 与 `content: string`。**若字段名不是 `name`，后面所有用到的地方都要改成实际字段名**，并在报告里写明。

- [ ] **Step 2: 写失败测试**

`filterWorldbookEntries` 是**纯函数**，抽到 `store.ts` 顶层导出（不在任何 store 内），这样可单测。

Create: `src/wxhl-003/__tests__/worldbookFilter.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { filterWorldbookEntries } from '../store';

const 条目 = [
  { name: '副本角色生成规则', content: 'A', enabled: true },
  { name: '技能模版和限制', content: 'B', enabled: true },
  { name: '某个关灯条目', content: 'C', enabled: false },
  { name: '装备与消耗品系统', content: 'D' },   // enabled 缺省 = 启用
];

describe('filterWorldbookEntries', () => {
  it('filter 为 null / undefined 时 = 整本全取（只按 enabled 过滤）', () => {
    for (const f of [null, undefined]) {
      const r = filterWorldbookEntries(条目, f);
      expect(r.map(e => e.name)).toEqual(['副本角色生成规则', '技能模版和限制', '装备与消耗品系统']);
    }
  });

  it('filter 为空数组时什么都不取（用户全不选）', () => {
    expect(filterWorldbookEntries(条目, [])).toEqual([]);
  });

  it('filter 指定条目时只取这些，且仍排除 enabled:false', () => {
    expect(filterWorldbookEntries(条目, ['技能模版和限制', '某个关灯条目']).map(e => e.name))
      .toEqual(['技能模版和限制']);
  });

  it('filter 里有不存在的条目名时静默忽略', () => {
    expect(filterWorldbookEntries(条目, ['不存在的东西', '技能模版和限制']).map(e => e.name))
      .toEqual(['技能模版和限制']);
  });
});
```

- [ ] **Step 3: 运行确认失败**

Run: `pnpm test src/wxhl-003/__tests__/worldbookFilter.test.ts`
Expected: FAIL —— `filterWorldbookEntries is not a function`

- [ ] **Step 4: 实现纯函数**

在 `store.ts` 顶层（`Settings` 接口附近，**不在任何 store 内**）加：

```ts
/**
 * 按条目筛选世界书内容。
 * @param filter null / undefined = 整本全取; 数组 = 只取这些条目名（空数组 = 一条不取）
 */
export function filterWorldbookEntries(
  entries: { name: string; content: string; enabled?: boolean }[],
  filter: string[] | null | undefined,
): { name: string; content: string }[] {
  return entries
    .filter(e => e.enabled !== false)
    .filter(e => !filter || filter.includes(e.name))
    .map(e => ({ name: e.name, content: e.content }))
    .filter(e => Boolean(e.content));
}
```

- [ ] **Step 5: 运行确认通过**

Run: `pnpm test src/wxhl-003/__tests__/worldbookFilter.test.ts`
Expected: 全部 PASS

- [ ] **Step 6: 接进 `getWorldbookContent()`**

把现有实现改成（**只改循环体，其余不动**）：

```ts
  async function getWorldbookContent(): Promise<string> {
    const sel = settings.selectedWorldbooks
    if (sel.length === 0) return ''
    const parts: string[] = []
    for (const name of sel) {
      try {
        const entries = await getWorldbook(name)
        if (entries && entries.length > 0) {
          const picked = filterWorldbookEntries(
            entries as { name: string; content: string; enabled?: boolean }[],
            settings.worldbookEntryFilter?.[name],
          )
          const text = picked.map(e => e.content).join('\n\n')
          if (text) parts.push('【' + name + '】\n' + text)
        }
      } catch (_) {}
    }
    return parts.join('\n\n')
  }
```

- [ ] **Step 7: `Settings` 与 `load()` 补字段**

`Settings` 接口加 `worldbookEntryFilter: Record<string, string[] | null>`；`load()` 的返回对象与兜底对象都补 `worldbookEntryFilter: p.worldbookEntryFilter || {}` / `{}`。

- [ ] **Step 8: 构建 / 类型检查 / 全量测试**

Run: `pnpm build && pnpm test && pnpm exec tsc --noEmit 2>&1 | grep -c "error TS"`
Expected: 构建成功；全量通过（现有 78 + 新增 4）；错误数仍 **10**

- [ ] **Step 9: 提交**

```bash
git add src/wxhl-003/store.ts src/wxhl-003/__tests__/worldbookFilter.test.ts
git commit -m "feat(wxhl): 世界书内容支持按条目筛选"
```

---

### Task 2: 世界书设置页 — 条目级勾选 + 世界书方案

**Files:**
- Modify: `src/wxhl-003/App.vue`（设置页世界书区块 + 脚本绑定）

**Interfaces:**
- Consumes: Task 1 的 `Settings.worldbookEntryFilter`；新增的 `worldbookProfiles` / `activeWorldbookProfile`
- Produces: 可用的世界书设置页

**⚠️ `App.vue` 是 `.vue` 文件，本仓库不做任何类型检查**（webpack `transpileOnly`、无 `vue-tsc`）。本任务**必须逐行自查**：模板里引用的每个标识符都要在 `<script setup>` 里有定义、标签开闭配对。

- [ ] **Step 1: 脚本部分——条目列表的懒加载**

`getWorldbook(name)` 是异步的，设置页展开某个世界书时才去取它的条目标题：

```ts
const wbEntries = ref<Record<string, { name: string }[]>>({})
const wbExpanded = ref<Record<string, boolean>>({})

async function toggleWbExpand(name: string) {
  wbExpanded.value[name] = !wbExpanded.value[name]
  if (wbExpanded.value[name] && !wbEntries.value[name]) {
    try {
      const es = await getWorldbook(name)
      wbEntries.value[name] = (es || []).map((e: any) => ({ name: e.name }))
    } catch (_) { wbEntries.value[name] = [] }
  }
}

/** null = 整本全取; 数组 = 只取这些 */
function wbEntryChecked(wb: string, entry: string): boolean {
  const f = store.settings.worldbookEntryFilter?.[wb]
  return !f || f.includes(entry)
}

// ---- 搜索（世界书可能有 100+ 条目，必须能搜）----
const wbSearch = ref('')

/** 当前显示的条目 = 全部条目按关键词过滤（不区分大小写的子串匹配） */
function wbVisibleEntries(wb: string): { name: string }[] {
  const all = wbEntries.value[wb] || []
  const q = wbSearch.value.trim().toLowerCase()
  if (!q) return all
  return all.filter(e => e.name.toLowerCase().includes(q))
}

function toggleWbEntry(wb: string, entry: string) {
  const all = (wbEntries.value[wb] || []).map(e => e.name)
  const cur = store.settings.worldbookEntryFilter?.[wb]
  const next = cur ? [...cur] : [...all]          // 从「整本」进入精确模式时，先把当前全选展开
  const i = next.indexOf(entry)
  if (i >= 0) next.splice(i, 1); else next.push(entry)
  // 与全选等价时就退回「整本」，避免存一堆无意义的数组
  store.settings.worldbookEntryFilter[wb] = next.length === all.length ? null : next
}

/**
 * 全选 / 全不选。
 * ⚠️ 作用对象是**当前搜索过滤后可见的条目**，不是整本 —— 这样「搜关键词 → 全选」可以批量勾选。
 * @param visible 当前可见的条目名列表
 */
function setVisibleWbEntries(wb: string, visible: string[], on: boolean) {
  const all = (wbEntries.value[wb] || []).map(e => e.name)
  const cur = store.settings.worldbookEntryFilter?.[wb]
  const base = cur ? [...cur] : [...all]          // 从「整本」进入精确模式时先展开成全选
  const set = new Set(base)
  for (const n of visible) { if (on) set.add(n); else set.delete(n) }
  const next = [...set]
  store.settings.worldbookEntryFilter[wb] = next.length === all.length ? null : next
}
```

**注意**：`store.settings.worldbookEntryFilter` 必须是**已存在的对象**（Task 1 的 `load()` 已保证）。若为 undefined 需在赋值前兜底 `??=`。

- [ ] **Step 2: 模板部分——世界书列表加展开**

把现有的世界书行（`App.vue:142` 附近）改成「整本勾选 + 展开箭头 + 展开后的条目列表」，并在世界书区块**顶部加一个搜索框**：

```html
<div class="wb-search-row">
  <input v-model="wbSearch" type="text" class="wb-search" placeholder="搜索条目名…（100+ 条目时用）"/>
  <button v-if="wbSearch" class="wb-mini" @click="wbSearch=''">清空</button>
</div>

<div v-for="name in store.allWorldbookNames" :key="name" class="wb-block">
  <div class="wb-row" @click="toggleWb(name)">
    <span class="wb-check" :class="{on: store.settings.selectedWorldbooks.includes(name)}">{{ store.settings.selectedWorldbooks.includes(name)?'☑':'☐' }}</span>
    <span class="wb-name">{{ name }}</span>
    <button class="wb-expand" @click.stop="toggleWbExpand(name)">{{ wbExpanded[name] ? '▾' : '▸' }}</button>
  </div>
  <div v-if="wbExpanded[name]" class="wb-entries">
    <div class="wb-entry-actions">
      <button class="wb-mini" @click="setVisibleWbEntries(name, wbVisibleEntries(name).map(e=>e.name), true)">全选{{ wbSearch ? '（搜索结果）' : '' }}</button>
      <button class="wb-mini" @click="setVisibleWbEntries(name, wbVisibleEntries(name).map(e=>e.name), false)">全不选{{ wbSearch ? '（搜索结果）' : '' }}</button>
      <span class="wb-count">{{ wbVisibleEntries(name).length }} / {{ (wbEntries[name]||[]).length }} 条</span>
    </div>
    <div v-if="(wbEntries[name]||[]).length===0" class="set-hint">（该世界书没有条目或读取失败）</div>
    <div v-else-if="wbVisibleEntries(name).length===0" class="set-hint">（没有匹配「{{ wbSearch }}」的条目）</div>
    <div v-for="e in wbVisibleEntries(name)" :key="e.name" class="wb-entry" @click="toggleWbEntry(name, e.name)">
      <span class="wb-check" :class="{on: wbEntryChecked(name, e.name)}">{{ wbEntryChecked(name, e.name)?'☑':'☐' }}</span>
      <span class="wb-entry-name">{{ e.name }}</span>
    </div>
  </div>
</div>
```

**搜索的语义**（写进代码注释，别让后面的人改错）：
- 一个搜索框**全局共用**，作用于当前展开的那个世界书的条目列表
- 匹配方式：**不区分大小写的子串匹配**（中文与 `<XX系统>` 这类都适用）
- **「全选 / 全不选」作用的是当前搜索过滤后可见的条目，不是整本** —— 所以「搜关键词 → 全选」可以批量勾选。按钮文案在有搜索词时会带上「（搜索结果）」提示
- 计数 `N / M 条` 让用户知道筛掉了多少

- [ ] **Step 3: 脚本 + 模板——世界书方案**

```ts
function saveWorldbookProfile() {
  const name = prompt('方案名称', '方案 ' + (store.settings.worldbookProfiles.length + 1))
  if (!name) return
  const value = {
    selectedWorldbooks: [...store.settings.selectedWorldbooks],
    worldbookEntryFilter: JSON.parse(JSON.stringify(store.settings.worldbookEntryFilter ?? {})),
  }
  const i = store.settings.worldbookProfiles.findIndex(p => p.name === name)
  if (i >= 0) store.settings.worldbookProfiles[i] = { name, value }
  else store.settings.worldbookProfiles.push({ name, value })
  store.settings.activeWorldbookProfile = name
}

function applyWorldbookProfile(name: string) {
  const p = store.settings.worldbookProfiles.find(x => x.name === name)
  if (!p) return
  store.settings.selectedWorldbooks = [...p.value.selectedWorldbooks]
  store.settings.worldbookEntryFilter = JSON.parse(JSON.stringify(p.value.worldbookEntryFilter))
  store.settings.activeWorldbookProfile = name
}

function deleteWorldbookProfile(name: string) {
  store.settings.worldbookProfiles = store.settings.worldbookProfiles.filter(p => p.name !== name)
  if (store.settings.activeWorldbookProfile === name) store.settings.activeWorldbookProfile = ''
}
```

模板（放在世界书区块顶部）：

```html
<div class="set-block">
  <div class="set-label">世界书方案</div>
  <div class="set-row">
    <select class="prof-select" :value="store.settings.activeWorldbookProfile" @change="applyWorldbookProfile(($event.target as HTMLSelectElement).value)">
      <option value="">（未使用方案）</option>
      <option v-for="p in store.settings.worldbookProfiles" :key="p.name" :value="p.name">{{ p.name }}</option>
    </select>
    <button class="test-btn" @click="saveWorldbookProfile">保存为方案</button>
    <button class="test-btn" @click="store.settings.activeWorldbookProfile && deleteWorldbookProfile(store.settings.activeWorldbookProfile)">删除方案</button>
  </div>
</div>
```

- [ ] **Step 4: 样式**

复用既有设置页风格，新增 `.wb-block` / `.wb-expand` / `.wb-entries` / `.wb-entry` / `.wb-entry-name` / `.wb-mini` / `.wb-entry-actions` / `.prof-select`。**只用已存在的 CSS 变量**（`--amber`/`--amber-d`/`--chalk`/`--chalk-d`/`--iron`/`--iron-d`/`--rust`/`--blood`/`--bg`）。**没有 `--text-dim`**。

- [ ] **Step 5: 自查清单（必做）**

- 列出新增模板里出现的**每个**标识符，逐个确认在 `<script setup>` 有定义（`wbSearch`/`wbVisibleEntries`/`wbEntries`/`wbExpanded`/`toggleWbExpand`/`wbEntryChecked`/`toggleWbEntry`/`setVisibleWbEntries`/`saveWorldbookProfile`/`applyWorldbookProfile`/`deleteWorldbookProfile`/`store`/`toggleWb`）
- **确认 `setAllWbEntries` 已不再被引用**（它被 `setVisibleWbEntries` 取代了）—— 模板里若还有旧调用就是漏改
- 确认搜索框的 `v-model="wbSearch"` 已绑定，且「清空」按钮只在有搜索词时出现
- 确认「全选/全不选」调用的是 `setVisibleWbEntries(...)` 且传的是 `wbVisibleEntries(name).map(e=>e.name)`
- 确认新增标签开闭配对
- 确认没破坏设置页其它区块
- 确认 `--text-dim` 零出现

- [ ] **Step 6: 构建 / 测试**

Run: `pnpm build && pnpm test`
Expected: 构建成功；全量测试仍通过（本任务不新增测试）

- [ ] **Step 7: 提交**

```bash
git add src/wxhl-003/App.vue
git commit -m "feat(wxhl): 世界书设置支持条目级勾选与方案保存切换"
```

---

### Task 3: API 方案保存 / 切换

**Files:**
- Modify: `src/wxhl-003/App.vue`（设置页 API 区块 + 脚本绑定）

**Interfaces:**
- Consumes: Task 2 建立的方案 UI 写法（保持一致）；新增的 `apiProfiles` / `activeApiProfile`
- Produces: 可用的 API 方案

**⚠️ 同样：`.vue` 不做类型检查，逐行自查。**

- [ ] **Step 1: `Settings` 与 `load()` 补字段**

`store.ts` 的 `Settings` 加 `apiProfiles: Profile<{apiMode:'single'|'multi'; primary: ApiConfig; secondary: ApiConfig}>[]` 与 `activeApiProfile: string`；`load()` 两处补 `?? []` / `?? ''`。

（`Profile<T>` 类型在 Task 1 的存储设计里已定义。）

- [ ] **Step 2: 脚本——保存 / 切换 / 删除**

```ts
function saveApiProfile() {
  const name = prompt('方案名称', 'API 方案 ' + (store.settings.apiProfiles.length + 1))
  if (!name) return
  const value = {
    apiMode: store.settings.apiMode,
    primary: { ...store.settings.primary },
    secondary: { ...store.settings.secondary },
  }
  const i = store.settings.apiProfiles.findIndex(p => p.name === name)
  if (i >= 0) store.settings.apiProfiles[i] = { name, value }
  else store.settings.apiProfiles.push({ name, value })
  store.settings.activeApiProfile = name
}

function applyApiProfile(name: string) {
  const p = store.settings.apiProfiles.find(x => x.name === name)
  if (!p) return
  store.settings.apiMode = p.value.apiMode
  store.settings.primary = { ...p.value.primary }
  store.settings.secondary = { ...p.value.secondary }
  store.settings.activeApiProfile = name
}

function deleteApiProfile(name: string) {
  store.settings.apiProfiles = store.settings.apiProfiles.filter(p => p.name !== name)
  if (store.settings.activeApiProfile === name) store.settings.activeApiProfile = ''
}
```

**关键**：方案存的是**快照**，切换时**拷贝**回活字段（`{...}`），不要把方案的 cfg 对象引用直接赋给 `settings.primary` —— 否则之后编辑主 API 会连带改掉方案里存的值。

- [ ] **Step 3: 模板——API 区块顶部加方案行**

与 Task 2 的世界书方案同构（下拉 + 保存为方案 + 删除方案），放在「API 模式」那一块**之前**。用一个 `<select>`，`@change` 调 `applyApiProfile`。

- [ ] **Step 4: 样式**

复用 Task 2 的 `.prof-select` 与 `.test-btn`，不必新增。

- [ ] **Step 5: 自查清单（必做）**

- 新增模板标识符逐个确认有定义（`saveApiProfile`/`applyApiProfile`/`deleteApiProfile`）
- 确认「主 API / 副 API」两个既有 `ApiFields` 仍绑定 `store.settings.primary` / `.secondary`（**切换方案后表单要立刻反映新值** —— 因为绑的是活字段，天然满足）
- 确认没破坏既有的「测试连接」按钮

- [ ] **Step 6: 构建 / 测试**

Run: `pnpm build && pnpm test`
Expected: 构建成功；全量测试仍通过

- [ ] **Step 7: 提交**

```bash
git add src/wxhl-003/store.ts src/wxhl-003/App.vue
git commit -m "feat(wxhl): API 设置支持方案保存与切换"
```

---

## 完成标准

1. `pnpm test` 全绿、`pnpm build` 成功、`tsc` 仍 **10 条**既存错误
2. 设置里的世界书**可以按条目勾选**；不勾条目时行为与改动前**完全一致**（整本全取）
3. 世界书方案与 API 方案**各自独立**，可保存 / 切换 / 删除
4. **旧 localStorage 设置不丢**（新字段都有默认值）
5. 没碰 `dice.ts` / `dungeonRules.ts` / `dungeonGen.ts` / `forumPrompts.ts` / `data.ts` 的规则常量

## 验证方式

`filterWorldbookEntries` 由单测覆盖（4 条）。**UI 部分只能靠用户在酒馆里目视确认** —— 交付时给用户一份清单：展开世界书看条目、勾几个、刷新看 prompt 是否只含勾中的、保存方案、切走再切回、确认旧设置还在。

## 后续（不在本计划内）

**④ 敌人生成（副本角色）** —— 依赖本计划的 ①。等 ① 落地后单独出计划，要点：
- 固定生成 3 个：杂兵 / 精英 / BOSS，卡片上勾选写入哪几个
- 规则来自世界书条目（`<副本角色生成规则>` / `<敌人模版设计>` / `<boss案例>` / `<技能模版和限制>` / `<装备效果强度限制>` / `<装备与消耗品系统>` / `<构筑设计思路>` / `<天赋系统>` / `<天赋效果参考>` / `<血统系统>` / `<血统效果强度限制>` / `<技能系统>` / `<特殊技能模版>` / `<检定模块>`）
- **卡片上要给用户一条提示**：请到「终端设置 → 世界书」勾选上述条目，否则生成的数值没有依据
- 写入 `契约者.副本角色`，衍生属性一律不写（由卡里的前端脚本代算）
