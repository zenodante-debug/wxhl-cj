# PvP竞技场（创意工坊）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 wxhl-003 小手机新增「PvP竞技场」App：玩家提取自己的构筑存档（六字段+外貌）下载发作者；作者收录进世界书「契约者角色库」；玩家按阶位浏览契约者并发起对战（写入 `当前敌人` 变量 + 插正文），交角色卡现有对战系统驱动。

**Architecture:** 数据全存于世界书「契约者角色库」（条目 `enabled:false`，`getWorldbook()` 仍能读到）。存档为 `{契约者:{头部,属性,衍生属性,职业,通用技能,装备}, 外貌, 简介, 上传者}` JSON。玩家侧 `getVariables()` 读 `stat_data.契约者` → lodash 摘六字段 → 模块化结构化表单编辑 → Blob 下载 `.json`。对战 `Mvu.getMvuData()`+`_.set()` 写 `stat_data.契约者.当前敌人.{对手名}` → `Mvu.replaceMvuData()` → `createChatMessages()` 插正文。

**Tech Stack:** Vue3 `<script setup>` + pinia + zod 4（全局 `z`）+ lodash（全局 `_`）+ webpack（全局注入 `z`/`_`）+ 酒馆助手接口（`getWorldbook`/`createWorldbookEntries`/`deleteWorldbookEntries`/`Mvu`/`createChatMessages`/`getVariables`/`generateRaw`）。

**Spec:** `docs/superpowers/specs/2026-08-21-pvp-arena-workshop-design.md`

## Global Constraints

- 项目用全局 `z`（zod 4）与 `_`（lodash），代码中直接使用、不 import（`global.d.ts` 已声明）
- `pnpm build` 为 webpack `transpileOnly`（不查类型）；类型正确性依赖 **tsconfig `strict`**，必须自行保证
- 存档字段范围 = 头部/属性/衍生属性/职业/通用技能/装备 六字段，**排除**背包/经济/个人产业/副本经历/人际关系/小队/当前副本元数据/固有角色/当前副本任务/状态/资格分/赛季信息/排行榜
- 存档顶层含 `外貌`（可选，默认自动用装备生成）/`简介`（AI 生成后可改）/`上传者`
- 世界书条目 `enabled: false`，`getWorldbook()` 读取不受影响
- 对战写入 `stat_data.契约者.当前敌人.{对手名}`，**不清空、不覆盖**现有敌人
- 纯逻辑验证用 `node` 直接跑 `.ts`（node 22，项目内可 import lodash/zod），UI 用 `pnpm build` + 浏览器实机
- 每次任务结束 `git commit`

---

### Task 1: data.ts — PvP 类型、常量与 PvPSaveSchema

**Files:**
- Modify: `src/wxhl-003/data.ts`（追加到文件末尾，保持现有论坛/职业/副本类型不动）

**Interfaces:**
- Produces:
  - `export const WORKSHOP_WORLDBOOK_NAME = '契约者角色库'`
  - `export const CONTRACT_SAVE_KEYS = ['头部','属性','衍生属性','职业','通用技能','装备'] as const`
  - `export const TIER_ORDER = ['1阶','2阶','3阶','4阶','5阶','超脱'] as const`
  - `export const PvPSaveSchema: z.ZodType`（zod 4，解析后含重算的 `属性.实际`）
  - `export type PvPSave = z.output<typeof PvPSaveSchema>`
  - `export interface WorkshopCard { name; 阶位; 等级; 军衔; 职业; 简介; 上传者; 外貌; save: PvPSave }`
- Consumes: 全局 `z`（zod 4）、`_`（lodash）

- [ ] **Step 1: 在 `data.ts` 末尾追加常量与类型**

```ts
// ================================================================
// PvP 竞技场 · 创意工坊
// ================================================================
export const WORKSHOP_WORLDBOOK_NAME = '契约者角色库'
export const CONTRACT_SAVE_KEYS = ['头部','属性','衍生属性','职业','通用技能','装备'] as const
export const TIER_ORDER = ['1阶','2阶','3阶','4阶','5阶','超脱'] as const

// 四维属性（基础/加成/自定义/实际共用结构）
const PvpAttr = z.object({
  STR: z.coerce.number().prefault(0),
  AGI: z.coerce.number().prefault(0),
  CON: z.coerce.number().prefault(0),
  PER: z.coerce.number().prefault(0),
}).prefault({})

/** PvP 存档校验 schema：六字段 + 外貌/简介/上传者，属性.实际自动重算 */
export const PvPSaveSchema = z.object({
  契约者: z.looseObject({
    头部: z.looseObject({
      姓名: z.string().prefault(''),
      等级: z.coerce.number().prefault(1),
      阶位: z.string().prefault('一阶'),
      军衔: z.string().prefault('列兵'),
      CR: z.coerce.number().prefault(3),
    }).prefault({}),
    属性: z.looseObject({
      基础: PvpAttr,
      加成: PvpAttr,
      自定义加成: PvpAttr,
    }).prefault({}).transform(d => ({
      ...d,
      实际: {
        STR: (d.基础?.STR || 0) + (d.加成?.STR || 0) + (d.自定义加成?.STR || 0),
        AGI: (d.基础?.AGI || 0) + (d.加成?.AGI || 0) + (d.自定义加成?.AGI || 0),
        CON: (d.基础?.CON || 0) + (d.加成?.CON || 0) + (d.自定义加成?.CON || 0),
        PER: (d.基础?.PER || 0) + (d.加成?.PER || 0) + (d.自定义加成?.PER || 0),
      },
    })),
    衍生属性: z.looseObject({}).prefault({}),
    职业: z.looseObject({
      名称: z.string().prefault('无'),
      稀有度: z.string().prefault('无'),
      转职阶段: z.string().prefault('无'),
      职业等级: z.coerce.number().prefault(0),
    }).prefault({}),
    通用技能: z.record(z.string(), z.any()).prefault({}),
    装备: z.looseObject({}).prefault({}),
  }).prefault({}),
  外貌: z.string().prefault(''),
  简介: z.string().prefault(''),
  上传者: z.string().prefault(''),
})
export type PvPSave = z.output<typeof PvPSaveSchema>

/** 竞技场列表展示用契约者卡片 */
export interface WorkshopCard {
  name: string
  阶位: string
  等级: number
  军衔: string
  职业: string
  简介: string
  上传者: string
  外貌: string
  save: PvPSave
}
```

- [ ] **Step 2: 写临时验证脚本并运行**

创建根目录 `verify_workshop.ts`（后续任务逐步扩充此文件；与 `dump_schema.ts` 同模式）：

```ts
/* eslint-disable */
// @ts-nocheck
import _ from 'lodash'
import z from 'zod'
import assert from 'node:assert/strict'

globalThis._ = _
globalThis.z = z

const { PvPSaveSchema } = await import('./src/wxhl-003/data.ts')

// 有效存档：正常解析
const valid = PvPSaveSchema.parse({
  契约者: {
    头部: { 姓名: '张三', 等级: 10, 阶位: '2阶' },
    属性: { 基础: { STR: 8 }, 加成: { STR: 2 } },
  },
})
assert.equal(valid.契约者.头部.等级, 10)
assert.equal(valid.契约者.属性.实际.STR, 10)   // transform 重算
// 坏条目：缺字段也能解析（prefault 兜底），不抛错
const empty = PvPSaveSchema.parse({})
assert.equal(empty.契约者.头部.姓名, '')
console.log('VERIFY_OK task1')
```

运行：`node verify_workshop.ts`
Expected: 输出 `VERIFY_OK task1`，无未捕获错误。

- [ ] **Step 3: 提交**

```bash
git add src/wxhl-003/data.ts verify_workshop.ts
git commit -m "feat(arena): add PvPSaveSchema and workshop types"
```

---

### Task 2: workshop.ts — 存档提取、外貌生成、阶位分组纯逻辑

**Files:**
- Create: `src/wxhl-003/workshop.ts`

**Interfaces:**
- Produces:
  - `export function extractContractSave(契约者: any): any` — 摘六字段，重算 `属性.实际`，返回可传给 PvPSaveSchema 的对象
  - `export function generateDefaultAppearance(装备: any): string` — 遍历 8 槽位拼装外貌，无装备返回 `''`
  - `export function tierOf(阶位: string): number` — 返回 TIER_ORDER 索引；未知返回 `TIER_ORDER.length`（末尾）
  - `export function buildIntroPrompt(save: any): string` — AI 简介 prompt（含六字段概要）
  - `export function buildBattleIntroMessage(card: WorkshopCard): string` — 对手登场正文
- Consumes: `PvPSaveSchema`、`CONTRACT_SAVE_KEYS`、`TIER_ORDER`、`WorkshopCard` from `./data`

- [ ] **Step 1: 写实现**

```ts
import { CONTRACT_SAVE_KEYS, TIER_ORDER, type WorkshopCard } from './data'

/** 从完整 stat_data.契约者 摘出 PvP 六字段，并重算属性.实际 */
export function extractContractSave(契约者: any): any {
  const picked: any = {}
  for (const key of CONTRACT_SAVE_KEYS) picked[key] = 契约者?.[key]
  const 属性 = picked.属性
  if (属性 && 属性.基础 && 属性.加成) {
    属性.实际 = {
      STR: (属性.基础.STR || 0) + (属性.加成.STR || 0) + (属性.自定义加成?.STR || 0),
      AGI: (属性.基础.AGI || 0) + (属性.加成.AGI || 0) + (属性.自定义加成?.AGI || 0),
      CON: (属性.基础.CON || 0) + (属性.加成.CON || 0) + (属性.自定义加成?.CON || 0),
      PER: (属性.基础.PER || 0) + (属性.加成.PER || 0) + (属性.自定义加成?.PER || 0),
    }
  }
  return picked
}

/** 用装备槽位生成默认外貌；无装备返回空串 */
export function generateDefaultAppearance(装备: any): string {
  const slots = ['头部', '躯干', '手部', '下装', '饰品', '主武器', '副武器']
  const names = slots
    .map(s => 装备?.[s]?.名称)
    .filter((n): n is string => !!n && n !== '无')
  if (names.length === 0) return ''
  return '身着【' + names.slice(0, 4).join('】、【') + '】的契约者'
}

/** 阶位 → TIER_ORDER 索引；未知归末尾 */
export function tierOf(阶位: string): number {
  const i = TIER_ORDER.indexOf(阶位)
  return i === -1 ? TIER_ORDER.length : i
}

/** AI 生成简介的 prompt */
export function buildIntroPrompt(save: any): string {
  const c = save?.契约者 || {}
  const h = c.头部 || {}
  const 职 = c.职业 || {}
  const attr = c.属性?.实际 || {}
  return `你是无限回廊的契约者。以下是你当前的构筑数据。请用一句话（30字以内）写出你的角色人设卖点，用于 PvP 竞技场简介，语气贴合角色、有吸引力，不要提及"构筑数据"这类元信息。

【姓名】${h.姓名 || '未知'}
【等级】Lv.${h.等级 ?? 0} · ${h.阶位 || '一阶'}
【职业】${职.名称 || '无'}${职.稀有度 ? '（' + 职.稀有度 + '）' : ''}
【属性】STR${attr.STR ?? 0} / AGI${attr.AGI ?? 0} / CON${attr.CON ?? 0} / PER${attr.PER ?? 0}`
}

/** 发起对战时插入正文的对手登场描述 */
export function buildBattleIntroMessage(card: WorkshopCard): string {
  const h = card.save?.契约者?.头部 || {}
  const 职 = card.save?.契约者?.职业 || {}
  const lines = [
    '在回廊主城的 PvP 竞技场，一名契约者向你发起了挑战！',
    '',
    `【对手：${card.name}】${h.阶位 ? '（' + h.阶位 + '）' : ''}`,
  ]
  if (card.外貌) lines.push('外貌：' + card.外貌)
  if (职.名称) lines.push('职业：' + 职.名称 + (职.稀有度 ? '（' + 职.稀有度 + '）' : ''))
  if (card.简介) lines.push('简介：' + card.简介)
  lines.push('', '对战开始！')
  return lines.join('\n')
}
```

- [ ] **Step 2: 扩充 `verify_workshop.ts` 并运行**

```ts
const { extractContractSave, generateDefaultAppearance, tierOf, buildBattleIntroMessage } = await import('./src/wxhl-003/workshop.ts')

const contract = { 头部: { 姓名: '李四' }, 属性: { 基础: { STR: 5 }, 加成: { STR: 3 } }, 背包: { 药: { 数量: 1 } } }
const save = extractContractSave(contract)
assert.deepEqual(Object.keys(save), CONTRACT_SAVE_KEYS)   // 只含六字段，无背包
assert.equal(save.属性.实际.STR, 8)

assert.equal(tierOf('3阶'), 2)
assert.equal(tierOf('未知阶位'), TIER_ORDER.length)

assert.equal(generateDefaultAppearance({ 主武器: { 名称: '长刀' } }), '身着【长刀】的契约者')
assert.equal(generateDefaultAppearance({}), '')

const card = { name: '王五', 阶位: '1阶', 等级: 5, 军衔: '列兵', 职业: '剑士', 简介: '快刀', 上传者: 'a', 外貌: '', save: PvPSaveSchema.parse({ 契约者: { 头部: { 姓名: '王五' }, 职业: { 名称: '剑士' } } }) }
const msg = buildBattleIntroMessage(card)
assert.ok(msg.includes('王五'))
assert.ok(msg.includes('对战开始'))

console.log('VERIFY_OK task2')
```

运行：`node verify_workshop.ts`
Expected: 输出 `VERIFY_OK task2`。

- [ ] **Step 3: 提交**

```bash
git add src/wxhl-003/workshop.ts verify_workshop.ts
git commit -m "feat(arena): add save extraction, appearance, tier pure logic"
```

---

### Task 3: store.ts — useWorkshopStore（读世界书列表 + 提取我的构筑 + AI 简介 + 下载）

**Files:**
- Modify: `src/wxhl-003/store.ts`（末尾追加；复用模块级 `getActiveCfg`/`aiGenerate`/`extractJSON`/`readPlayerData` 模式）

**Interfaces:**
- Produces: `export const useWorkshopStore = defineStore('workshop', () => {...})`，返回：
  - `contracts: Ref<WorkshopCard[]>`、`loadingContracts: Ref<boolean>`、`worldbookError: Ref<string>`
  - `mySave: Ref<PvPSave | null>`、`extracting: Ref<boolean>`
  - `aiIntroEnabled: Ref<boolean>`（默认 `true`）、`introGenerating: Ref<boolean>`
  - `async loadContracts(): Promise<void>` — 读世界书 → 解析条目 → 生成卡片 → 按阶位+等级排序
  - `async extractMySave(): Promise<boolean>` — 读玩家契约者 → 摘六字段 → 设 mySave（外貌空串）
  - `async generateIntro(): Promise<void>` — AI 生成简介写入 mySave.简介
  - `downloadMySave(): void` — 校验后 Blob 下载 `.json`
- Consumes: `useForumStore`（settings、getWorldbookContent）、`WORKSHOP_WORLDBOOK_NAME`、`PvPSaveSchema`、`extractContractSave`、`buildIntroPrompt`；全局 `getWorldbook`/`getVariables`/`generateRaw`

- [ ] **Step 1: 在 store.ts 末尾追加 useWorkshopStore**

```ts
// ================================================================
// PvP 竞技场 · 创意工坊
// ================================================================
import { WORKSHOP_WORLDBOOK_NAME, PvPSaveSchema, type WorkshopCard, type PvPSave } from './data'
import { extractContractSave, buildIntroPrompt, tierOf } from './workshop'

export const useWorkshopStore = defineStore('workshop', () => {
  const contracts = ref<WorkshopCard[]>([])
  const loadingContracts = ref(false)
  const worldbookError = ref('')
  const mySave = ref<PvPSave | null>(null)
  const extracting = ref(false)
  const aiIntroEnabled = ref(true)
  const introGenerating = ref(false)

  /** 读世界书「契约者角色库」→ 解析为卡片列表（按阶位分组、组内等级降序） */
  async function loadContracts() {
    loadingContracts.value = true
    worldbookError.value = ''
    try {
      // 注意：条目 enabled 字段不影响读取——契约者库条目按设计均为 enabled:false（不进 AI 上下文），但 getWorldbook 会返回全部条目
      const entries = await getWorldbook(WORKSHOP_WORLDBOOK_NAME)
      const cards: WorkshopCard[] = []
      let bad = 0
      for (const e of entries) {
        try {
          const save = PvPSaveSchema.parse(JSON.parse(e.content))
          const h = save.契约者.头部
          const 职 = save.契约者.职业
          cards.push({
            name: h.姓名 || e.name || '未知契约者',
            阶位: h.阶位 || '一阶',
            等级: h.等级 || 1,
            军衔: h.军衔 || '列兵',
            职业: 职.名称 || '无',
            简介: save.简介 || '',
            上传者: save.上传者 || '',
            外貌: save.外貌 || '',
            save,
          })
        } catch (_) { bad++ }
      }
      if (bad > 0) toastr.warning(`契约者角色库有 ${bad} 条条目损坏，已跳过`)
      contracts.value = cards.sort((a, b) => {
        const t = tierOf(a.阶位) - tierOf(b.阶位)
        return t !== 0 ? t : b.等级 - a.等级
      })
    } catch (e: any) {
      // 世界书尚不存在（新装）→ 视为空库，显示空态引导
      contracts.value = []
      worldbookError.value = ''
    } finally { loadingContracts.value = false }
  }

  /** 读取当前玩家契约者 → 摘六字段为我的构筑 */
  async function extractMySave(): Promise<boolean> {
    extracting.value = true
    try {
      let vars: any = {}
      try {
        const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1
        if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {}
      } catch (_) {}
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {} } catch (_) {} }
      if (!vars?.stat_data?.契约者) { try { vars = getVariables?.({ type: 'chat' }) ?? {} } catch (_) {} }
      const character = vars?.stat_data?.契约者
      if (!character) { toastr.warning('未检测到玩家契约者数据'); return false }
      // extractContractSave 返回顶层六字段 {头部,...}，需包进 {契约者:{...}} 才能被 PvPSaveSchema 解析
      const save = PvPSaveSchema.parse({ 契约者: extractContractSave(character) })
      mySave.value = save
      return true
    } catch (e: any) {
      toastr.error('提取构筑失败: ' + (e?.message || e))
      return false
    } finally { extracting.value = false }
  }

  /** AI 生成一句话简介写入 mySave.简介 */
  async function generateIntro() {
    const save = mySave.value
    if (!save) return
    const forumStore = useForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { toastr.warning('请先在终端设置中配置 API'); return }
    introGenerating.value = true
    try {
      const raw = await aiGenerate(cfg, buildIntroPrompt(save))
      save.简介 = (typeof raw === 'string' ? raw : (raw as any).content || '').trim().slice(0, 60)
    } catch (e: any) {
      toastr.error('生成简介失败: ' + (e?.message || e))
    } finally { introGenerating.value = false }
  }

  /** 校验后下载存档为 .json 文件 */
  function downloadMySave() {
    if (!mySave.value) return
    try {
      const validated = PvPSaveSchema.parse(mySave.value)
      const blob = new Blob([JSON.stringify(validated, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = (validated.契约者.头部.姓名 || '契约者') + '_构筑存档.json'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toastr.success('构筑存档已下载')
    } catch (e: any) {
      toastr.error('存档校验失败: ' + (e?.message || e))
    }
  }

  return {
    contracts, loadingContracts, worldbookError, mySave, extracting,
    aiIntroEnabled, introGenerating,
    loadContracts, extractMySave, generateIntro, downloadMySave,
  }
})
```

注意：`aiGenerate` 在 store.ts 已定义（模块级，Task 3 的 store 在同一文件可直接调用）；`getActiveCfg` 同。`useForumStore` 同文件。`readPlayerData` 探测模式需在顶部已有 `getCurrentMessageId` 类型（全局声明）。

- [ ] **Step 2: 编译验证**

Run: `pnpm build`
Expected: 无 webpack 编译错误（`transpileOnly` 只查语法/模块，不查类型）；`dist/wxhl-003/index.js` 更新。

- [ ] **Step 3: 提交**

```bash
git add src/wxhl-003/store.ts
git commit -m "feat(arena): add workshop store with contracts load and save extraction"
```

---

### Task 4: store.ts — 收录契约者 + 发起对战

**Files:**
- Modify: `src/wxhl-003/store.ts`（`useWorkshopStore` 内追加）

**Interfaces:**
- Produces（追加到 `useWorkshopStore` 返回）：
  - `authorDraft: Ref<string>`、`previewSave: Ref<PvPSave | null>`、`authorError: Ref<string>`
  - `previewPaste(text: string): void` — 解析校验
  - `async writeToWorldbook(): Promise<boolean>` — `createWorldbookEntries` 写入
  - `async removeContract(name: string): Promise<void>` — `deleteWorldbookEntries`
  - `async startBattle(card: WorkshopCard): Promise<boolean>` — 写变量 + 插正文
- Consumes: `WORKSHOP_WORLDBOOK_NAME`、`PvPSaveSchema`、`generateDefaultAppearance`、`buildBattleIntroMessage`；全局 `createWorldbookEntries`/`deleteWorldbookEntries`/`Mvu`/`createChatMessages`/`waitGlobalInitialized`

- [ ] **Step 1: 在 useWorkshopStore 内追加收录与对战逻辑**

```ts
  // ---- 作者收录 ----
  const authorDraft = ref('')
  const previewSave = ref<PvPSave | null>(null)
  const authorError = ref('')

  function previewPaste(text: string) {
    authorDraft.value = text
    authorError.value = ''
    previewSave.value = null
    try {
      previewSave.value = PvPSaveSchema.parse(JSON.parse(text))
    } catch (e: any) {
      authorError.value = '存档 JSON 解析失败: ' + (e?.message || e)
    }
  }

  async function writeToWorldbook(): Promise<boolean> {
    if (!previewSave.value) { authorError.value = '请先校验存档'; return false }
    try {
      const save = previewSave.value
      const name = save.契约者.头部.姓名 || '未命名契约者'
      await createWorldbookEntries(WORKSHOP_WORLDBOOK_NAME, [{
        name,
        enabled: false,
        content: JSON.stringify(save),
      }])
      toastr.success('已收录契约者「' + name + '」')
      previewSave.value = null
      authorDraft.value = ''
      await loadContracts()
      return true
    } catch (e: any) {
      authorError.value = '写入世界书失败: ' + (e?.message || e)
      return false
    }
  }

  async function removeContract(name: string) {
    try {
      await deleteWorldbookEntries(WORKSHOP_WORLDBOOK_NAME, entry => entry.name === name)
      toastr.success('已移除契约者「' + name + '」')
      await loadContracts()
    } catch (e: any) {
      toastr.error('移除失败: ' + (e?.message || e))
    }
  }

  // ---- 发起对战 ----
  async function startBattle(card: WorkshopCard): Promise<boolean> {
    try {
      await waitGlobalInitialized('Mvu')
      const enemy = {
        外貌: card.外貌 || generateDefaultAppearance(card.save.契约者.装备),
        头部: card.save.契约者.头部,
        属性: card.save.契约者.属性,
        衍生属性: card.save.契约者.衍生属性,
        职业: card.save.契约者.职业,
        通用技能: card.save.契约者.通用技能,
        装备: card.save.契约者.装备,
      }
      // 用当前楼层（与 readPlayerData 探测模式一致；脚本环境 getCurrentMessageId 可用）
      const message_id = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : 'latest'
      const mvu = Mvu.getMvuData({ type: 'message', message_id })
      _.set(mvu, 'stat_data.契约者.当前敌人.' + card.name, enemy)
      await Mvu.replaceMvuData(mvu, { type: 'message', message_id })
      await createChatMessages([{ role: 'assistant', message: buildBattleIntroMessage(card) }])
      toastr.success('对战开始！对手已写入')
      return true
    } catch (e: any) {
      toastr.error('发起对战失败: ' + (e?.message || e))
      return false
    }
  }
```

- [ ] **Step 2: 更新 useWorkshopStore 的 return 与 imports**

```ts
  return {
    contracts, loadingContracts, worldbookError, mySave, extracting,
    aiIntroEnabled, introGenerating,
    loadContracts, extractMySave, generateIntro, downloadMySave,
    authorDraft, previewSave, authorError,
    previewPaste, writeToWorldbook, removeContract, startBattle,
  }
```

`useWorkshopStore` 顶部 import 追加：`import { generateDefaultAppearance, buildBattleIntroMessage, buildIntroPrompt, extractContractSave, tierOf } from './workshop'`

- [ ] **Step 3: 编译验证**

Run: `pnpm build`
Expected: 无编译错误；`dist/wxhl-003/index.js` 更新。

- [ ] **Step 4: 提交**

```bash
git add src/wxhl-003/store.ts
git commit -m "feat(arena): add worldbook authoring and battle start to workshop store"
```

---

### Task 5: App.vue — 桌面图标 + 竞技场导航

**Files:**
- Modify: `src/wxhl-003/App.vue`（桌面图标区、`currentView` 类型、NAV 函数、imports）

**Interfaces:**
- Consumes: `useWorkshopStore`、`workshopStore` 实例
- Produces: `currentView` 新增 `'arena'`；`openArena()`；`arenaView: Ref<'list' | 'detail' | 'edit'>`、`viewingCard: Ref<WorkshopCard | null>`

- [ ] **Step 1: imports 与 store 实例**

在 `App.vue` `<script setup>` 中：
```ts
import { useWorkshopStore } from './store'
import type { WorkshopCard } from './data'
const workshopStore = useWorkshopStore()
```

- [ ] **Step 2: currentView 类型 + 竞技场状态**

```ts
const currentView = ref<'desktop'|'forum'|'settings'|'career'|'dungeon'|'arena'>('desktop')
const arenaView = ref<'list' | 'detail' | 'edit'>('list')
const viewingCard = ref<WorkshopCard | null>(null)
```

- [ ] **Step 3: 桌面加「PvP竞技场」图标**

在桌面 `app-grid` 中、`副本攻略` 图标之后追加：
```html
<div class="app-icon-wrapper" @click="openArena"><div class="app-icon arena-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M7 3L3 7v6l4 4h6l4-4V7l-4-4H7z"/><path d="M7 7l3 3m2-3l3 3"/><path d="M12 10l3 6M12 10l-3 6"/></svg></div><span class="app-label">PvP竞技场</span></div>
```

- [ ] **Step 4: NAV 函数**

```ts
function openArena() { currentView.value = 'arena'; arenaView.value = 'list'; viewingCard.value = null; workshopStore.worldbookError = ''; workshopStore.loadContracts() }
function openArenaEdit() { currentView.value = 'arena'; arenaView.value = 'edit' }
```

- [ ] **Step 5: 编译验证**

Run: `pnpm build`
Expected: 无编译错误。

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/App.vue
git commit -m "feat(arena): add desktop icon and navigation"
```

---

### Task 6: App.vue — 我的构筑区 + 上传按钮 + 构筑编辑页（模块化表单）

**Files:**
- Modify: `src/wxhl-003/App.vue`（`arena` 视图模板 + 编辑表单 + 样式）

**Interfaces:**
- Consumes: `workshopStore` 的 `mySave`/`extracting`/`aiIntroEnabled`/`introGenerating`/`extractMySave`/`generateIntro`/`downloadMySave`

**说明**：构筑编辑页采用**模块化结构化表单**——按六字段模块展示，玩家逐模块编辑。为控制 App.vue 体积，编辑表单以内联递归组件形式书写：`<template>` 定义 `EditableObject` 递归段（用 `component`/`v-for`），字符串→input、数值→number input、对象→嵌套折叠面板。

- [ ] **Step 1: 在模板中追加「PvP竞技场」主视图（我的构筑区 + 列表入口）**

在 `</template>` 结束前追加：
```html
  <!-- ============ PVP ARENA ============ -->
  <div v-if="currentView==='arena'&&arenaView==='list'" class="app-page">
    <div class="app-header"><button class="hdr-btn" @click="goDesktop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><span class="hdr-title">PvP竞技场</span><span class="hdr-spacer"></span></div>

    <!-- 我的构筑区 -->
    <div class="scroll-area arena-my">
      <div class="set-block">
        <div class="set-label">我的构筑</div>
        <div v-if="workshopStore.mySave" class="my-save-preview">
          <div class="ms-name">{{ workshopStore.mySave.契约者.头部.姓名 || '未命名' }} · Lv.{{ workshopStore.mySave.契约者.头部.等级 ?? 0 }}</div>
          <div class="ms-meta">{{ workshopStore.mySave.契约者.头部.阶位 || '一阶' }} · {{ workshopStore.mySave.契约者.职业.名称 || '无职业' }}</div>
        </div>
        <div class="set-row arena-actions">
          <button class="fab-btn arena-upload" @click="onExtractSave" :disabled="workshopStore.extracting">{{ workshopStore.extracting ? '提取中...' : '上传角色构筑' }}</button>
          <button v-if="workshopStore.mySave" class="fab-btn arena-edit" @click="openArenaEdit()">编辑构筑</button>
          <button v-if="workshopStore.mySave" class="fab-btn arena-dl" @click="workshopStore.downloadMySave()">下载存档</button>
        </div>
      </div>
      <div class="set-block">
        <div class="set-label">AI 生成简介</div>
        <label class="wb-row toggle-row"><input type="checkbox" v-model="workshopStore.aiIntroEnabled"/><span>提取后自动生成一句话简介（可关）</span></label>
      </div>
    </div>

    <!-- 对手列表 -->
    <div class="arena-section-label">契约者对手库</div>
    <div v-if="workshopStore.loadingContracts" class="gen-overlay"><div class="gen-spinner"></div><span>读取契约者角色库...</span></div>
    <template v-else>
      <div v-if="workshopStore.worldbookError" class="refresh-err">{{ workshopStore.worldbookError }}</div>
      <div v-else-if="workshopStore.contracts.length===0" class="empty-state">
        <div class="empty-icon">⚔️</div>
        <div class="empty-text">契约者角色库为空</div>
        <div class="empty-sub">作者可在「终端设置 → 收录契约者」添加对手；或玩家先上传自己的构筑发给作者</div>
      </div>
      <div v-else class="scroll-area">
        <template v-for="g in tieredContracts" :key="g.tier">
          <div class="tier-label">{{ g.label }}</div>
          <div v-for="c in g.cards" :key="c.name" class="contract-card" @click="viewingCard=c;arenaView='detail'">
            <div class="cc-top"><span class="cc-name">{{ c.name }}</span><span class="cc-lv">Lv.{{ c.等级 }}</span></div>
            <div class="cc-meta">{{ c.军衔 }} · {{ c.职业 }}</div>
            <div v-if="c.简介" class="cc-intro">{{ c.简介 }}</div>
            <div class="cc-foot"><span>{{ c.上传者 || '匿名' }}</span><span class="cc-tag">{{ c.阶位 }}</span></div>
          </div>
        </template>
      </div>
    </template>
  </div>
```

- [ ] **Step 2: 追加构筑编辑页（模块化结构化表单）**

```html
  <div v-if="currentView==='arena'&&arenaView==='edit'&&workshopStore.mySave" class="app-page">
    <div class="app-header"><button class="hdr-btn" @click="arenaView='list'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><span class="hdr-title">编辑构筑</span><span class="hdr-spacer"></span></div>
    <div class="scroll-area arena-edit-form">
      <!-- 外貌栏（可选） -->
      <div class="set-block">
        <div class="set-label">外貌（可选，不填则对战时自动用装备生成）</div>
        <textarea v-model="workshopStore.mySave.外貌" class="dialog-input" rows="2" placeholder="如：身披黑色风衣、腰间别着长刀的冷面契约者"></textarea>
      </div>
      <!-- 简介栏 -->
      <div class="set-block">
        <div class="set-label">简介（可手改 AI 生成结果）</div>
        <textarea v-model="workshopStore.mySave.简介" class="dialog-input" rows="2" placeholder="一句话卖点"></textarea>
      </div>
      <!-- 六模块表单 -->
      <div v-for="mod in editModules" :key="mod.key" class="set-block edit-module">
        <div class="set-label">{{ mod.label }}</div>
        <EditableObject :value="workshopStore.mySave.契约者[mod.key]" @update:value="v => (workshopStore.mySave.契约者[mod.key] = v)"/>
      </div>
      <div class="set-row arena-actions" style="margin-top:12px">
        <button class="fab-btn arena-dl" @click="workshopStore.downloadMySave()">校验并下载</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: 定义 `EditableObject` 递归组件 + `editModules` + 相关 computed/函数**

在 `<script setup>` 中追加：
```ts
import EditableObject from './EditableObject.vue'
import { TIER_ORDER } from './data'

const editModules = [
  { key: '头部', label: '头部' },
  { key: '属性', label: '属性' },
  { key: '衍生属性', label: '衍生属性' },
  { key: '职业', label: '职业' },
  { key: '通用技能', label: '通用技能' },
  { key: '装备', label: '装备' },
]
const tieredContracts = computed(() => {
  const map: Record<string, WorkshopCard[]> = {}
  for (const c of workshopStore.contracts) { (map[c.阶位] ||= []).push(c) }
  return TIER_ORDER.map((label, i) => ({ label, tier: i, cards: map[label] || [] })).filter(g => g.cards.length > 0)
})
async function onExtractSave() {
  const ok = await workshopStore.extractMySave()
  if (ok && workshopStore.aiIntroEnabled) await workshopStore.generateIntro()
  if (ok) arenaView.value = 'edit'
}
```

在 `<template>` 顶部（或组件内）定义递归 `EditableObject`——为控制体积，用同文件内 `<script setup>` 的组件递归需单独声明。简化方案：定义为一个**独立的局部组件** `EditableObject.vue`（见 Task 6 Step 4）。

- [ ] **Step 4: 创建 `src/wxhl-003/EditableObject.vue` 递归编辑组件**

```vue
<script setup lang="ts">
// 自递归组件需显式命名，供模板中的 <EditableObject> 自我引用
defineOptions({ name: 'EditableObject' })
const props = defineProps<{ value: any }>()
const emit = defineEmits<{ (e: 'update:value', v: any): void }>()
const local = ref(klona(props.value ?? {}))
watch(() => props.value, v => { local.value = klona(v ?? {}) })
watch(local, v => emit('update:value', klona(v)), { deep: true })
function isObj(v: any) { return v && typeof v === 'object' && !Array.isArray(v) }
function isNum(v: any) { return typeof v === 'number' }
function set(path: string[], val: any) {
  const o = local.value
  let cur = o
  for (let i = 0; i < path.length - 1; i++) cur = cur[path[i]]
  cur[path[path.length - 1]] = val
}
</script>

<template>
  <div class="editable-object">
    <template v-for="(v, k) in local" :key="String(k)">
      <div v-if="isObj(v)" class="eo-block">
        <div class="eo-key">{{ k }}</div>
        <EditableObject :value="v" @update:value="set([String(k)], $event)"/>
      </div>
      <div v-else-if="isNum(v)" class="eo-row">
        <span class="eo-label">{{ k }}</span>
        <input type="number" class="eo-input num" :value="v" @input="set([String(k)], Number(($event.target as HTMLInputElement).value))"/>
      </div>
      <div v-else class="eo-row">
        <span class="eo-label">{{ k }}</span>
        <textarea v-if="String(v).length > 30" class="eo-input" :value="v" @input="set([String(k)], ($event.target as HTMLInputElement).value)"></textarea>
        <input v-else class="eo-input" :value="v" @input="set([String(k)], ($event.target as HTMLInputElement).value)"/>
      </div>
    </template>
  </div>
</template>

<style scoped lang="scss">
.editable-object{display:flex;flex-direction:column;gap:2px;padding:4px 0}
.eo-block{border:1px solid rgba(80,40,20,0.25);border-radius:6px;padding:4px 6px;margin:2px 0;background:rgba(16,12,8,0.3)}
.eo-key{font-size:10px;color:var(--amber);letter-spacing:1px;margin-bottom:2px}
.eo-row{display:flex;align-items:center;gap:6px;padding:2px 0;font-size:11px}
.eo-label{flex-shrink:0;color:var(--chalk-d);min-width:40px}
.eo-input{flex:1;background:rgba(16,12,8,0.8);border:1px solid rgba(80,40,20,0.4);border-radius:4px;color:var(--chalk);font-size:11px;padding:4px 6px;outline:none;font-family:inherit}
.eo-input.num{max-width:80px}
</style>
```

（组件自递归引用需 `name: 'EditableObject'` 或使用 `defineOptions`；本项目 webpack vue-loader 支持 `<script setup>` 自引用需在组件内 `defineOptions({ name: 'EditableObject' })`，如不支持则在模板中用 `component :is` 包装。）

- [ ] **Step 5: 追加竞技场相关样式到 App.vue `<style scoped>`**

```scss
.arena-my{padding:12px}
.arena-actions{flex-wrap:wrap}
.arena-upload{background:rgba(180,40,40,0.15);border-color:rgba(180,40,40,0.35)}
.arena-edit{background:rgba(120,80,40,0.15);border-color:rgba(140,100,40,0.35)}
.arena-dl{background:rgba(40,120,80,0.15);border-color:rgba(60,140,100,0.35)}
.arena-section-label{font-size:11px;color:var(--amber);padding:8px 12px 4px;letter-spacing:1px}
.tier-label{font-size:10px;color:var(--chalk-d);padding:8px 12px 4px;opacity:0.8}
.contract-card{padding:12px 14px;cursor:pointer;border-bottom:1px solid rgba(80,40,20,0.18);transition:background 0.1s;&:hover{background:rgba(255,255,255,0.03)}}
.cc-top{display:flex;justify-content:space-between;align-items:center}
.cc-name{font-size:13px;color:var(--chalk);font-weight:600}
.cc-lv{font-size:10px;color:var(--amber)}
.cc-meta{font-size:10px;color:var(--chalk-d);margin-top:2px}
.cc-intro{font-size:11px;color:var(--chalk);margin-top:4px;line-height:1.4}
.cc-foot{display:flex;justify-content:space-between;font-size:10px;color:var(--chalk-d);margin-top:6px;opacity:0.7}
.cc-tag{color:var(--amber)}
.my-save-preview{background:rgba(40,120,80,0.1);border:1px solid rgba(60,140,100,0.3);border-radius:8px;padding:8px 10px;margin-bottom:8px}
.ms-name{font-size:13px;color:var(--chalk);font-weight:600}
.ms-meta{font-size:10px;color:var(--chalk-d);margin-top:2px}
.toggle-row{cursor:pointer;display:flex;align-items:center;gap:6px;color:var(--chalk-d);font-size:11px}
.edit-module{margin-bottom:14px}
```

- [ ] **Step 6: 编译验证**

Run: `pnpm build`
Expected: 无编译错误。

- [ ] **Step 7: 提交**

```bash
git add src/wxhl-003/App.vue src/wxhl-003/EditableObject.vue
git commit -m "feat(arena): add upload build, module editor, and opponent list UI"
```

---

### Task 7: App.vue — 对手详情页 + 对战确认 + 收录工具

**Files:**
- Modify: `src/wxhl-003/App.vue`（详情页模板 + 对战确认弹窗 + 设置内收录入口与页面 + 样式）

**Interfaces:**
- Consumes: `workshopStore` 的 `startBattle`/`previewPaste`/`writeToWorldbook`/`removeContract`/`authorDraft`/`previewSave`/`authorError`

- [ ] **Step 1: 对手详情页模板**

```html
  <div v-if="currentView==='arena'&&arenaView==='detail'&&viewingCard" class="app-page">
    <div class="app-header"><button class="hdr-btn" @click="arenaView='list'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><span class="hdr-title">{{ viewingCard.name }}</span><span class="hdr-spacer"></span></div>
    <div class="scroll-area arena-detail">
      <div class="set-block">
        <div class="set-label">契约者信息</div>
        <div class="cd-name">{{ viewingCard.name }} <span class="cd-tag">{{ viewingCard.阶位 }}</span></div>
        <div class="cd-meta">Lv.{{ viewingCard.等级 }} · {{ viewingCard.军衔 }} · {{ viewingCard.职业 }}</div>
        <div v-if="viewingCard.外貌" class="cd-appearance">外貌：{{ viewingCard.外貌 }}</div>
        <div v-if="viewingCard.简介" class="cd-intro">{{ viewingCard.简介 }}</div>
        <div class="cd-foot">上传者：{{ viewingCard.上传者 || '匿名' }}</div>
      </div>
      <div v-if="viewingCard.save.契约者.职业.名称" class="set-block">
        <div class="set-label">职业</div>
        <div class="cd-job">{{ viewingCard.save.契约者.职业.名称 }}（{{ viewingCard.save.契约者.职业.稀有度 || '未知' }}）</div>
        <div v-if="viewingCard.save.契约者.职业.转职阶段" class="cd-sub">{{ viewingCard.save.契约者.职业.转职阶段 }}</div>
      </div>
      <div v-if="viewingCard.save.契约者.属性.实际" class="set-block">
        <div class="set-label">属性</div>
        <div class="cd-attrs"><span>STR {{ viewingCard.save.契约者.属性.实际.STR ?? 0 }}</span><span>AGI {{ viewingCard.save.契约者.属性.实际.AGI ?? 0 }}</span><span>CON {{ viewingCard.save.契约者.属性.实际.CON ?? 0 }}</span><span>PER {{ viewingCard.save.契约者.属性.实际.PER ?? 0 }}</span></div>
      </div>
      <div v-if="Object.keys(viewingCard.save.契约者.装备||{}).length" class="set-block">
        <div class="set-label">装备</div>
        <div v-for="(slot,sk) in viewingCard.save.契约者.装备" :key="sk" class="cd-slot"><span class="cd-slot-name">{{ sk }}</span><span>{{ slot?.名称 || '无' }}</span></div>
      </div>
    </div>
    <div class="arena-bottom-bar">
      <button class="fab-btn arena-battle" @click="showBattleConfirm=true">⚔️ 发起对战</button>
    </div>
  </div>
```

- [ ] **Step 2: 对战确认弹窗**

```html
  <div v-if="currentView==='arena'&&showBattleConfirm" class="dialog-mask" @click.self="showBattleConfirm=false">
    <div class="dialog-box">
      <div class="dialog-title">发起对战</div>
      <div class="dialog-body">将把「{{ viewingCard?.name }}」写入当前敌人数据，并开始对战。确定吗？</div>
      <div class="dialog-btns">
        <button class="dialog-btn cancel" @click="showBattleConfirm=false">取消</button>
        <button class="dialog-btn confirm" @click="onStartBattle">发起</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 3: 设置菜单加「收录契约者」入口 + 页面**

在设置菜单（`settingsPage===''`）追加一个按钮：
```html
<button class="menu-btn" @click="settingsPage='workshop-author'"><span class="menu-icon">🗃️</span><span>收录契约者</span><span class="menu-arrow">›</span></button>
```

收录页面：
```html
  <div v-if="currentView==='settings'&&settingsPage==='workshop-author'" class="app-page">
    <div class="app-header"><button class="hdr-btn" @click="settingsPage=''"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><span class="hdr-title">收录契约者</span><span class="hdr-spacer"></span></div>
    <div class="scroll-area settings-inner">
      <div class="set-block">
        <div class="set-label">粘贴玩家存档 JSON</div>
        <textarea v-model="workshopStore.authorDraft" class="dialog-input" rows="8" placeholder='{"契约者":{...},"外貌":"...","简介":"...","上传者":"..."}' @input="workshopStore.previewPaste(workshopStore.authorDraft)"></textarea>
        <div v-if="workshopStore.authorError" class="set-err">{{ workshopStore.authorError }}</div>
        <div v-if="workshopStore.previewSave" class="author-preview">
          <div class="ap-name">{{ workshopStore.previewSave.契约者.头部.姓名 }} · Lv.{{ workshopStore.previewSave.契约者.头部.等级 }} · {{ workshopStore.previewSave.契约者.头部.阶位 }}</div>
          <div class="ap-meta">{{ workshopStore.previewSave.契约者.职业.名称 || '无职业' }}</div>
        </div>
        <button class="test-btn" @click="workshopStore.writeToWorldbook()" :disabled="!workshopStore.previewSave">写入世界书</button>
      </div>
      <div class="set-block">
        <div class="set-label">当前契约者库</div>
        <div v-for="c in workshopStore.contracts" :key="c.name" class="wb-row">
          <span class="wb-name">{{ c.name }} · {{ c.阶位 }} · Lv.{{ c.等级 }}</span>
          <button class="author-del" @click="onRemoveContract(c.name)">移除</button>
        </div>
        <button class="wb-load-btn" @click="workshopStore.loadContracts()">🔄 刷新列表</button>
      </div>
    </div>
  </div>
```

- [ ] **Step 4: script 逻辑（state + 函数）**

```ts
const showBattleConfirm = ref(false)
async function onStartBattle() {
  if (!viewingCard.value) return
  const ok = await workshopStore.startBattle(viewingCard.value)
  if (ok) { showBattleConfirm.value = false; collapse() }
}
async function onRemoveContract(name: string) {
  if (window.confirm('确认移除契约者「' + name + '」？')) await workshopStore.removeContract(name)
}
```

`currentView==='settings'` 的 `settingsPage` 需在类型上允许字符串（已是 `ref('')`，无需改）。`collapse()` 已有（关闭小手机面板）。

- [ ] **Step 5: 追加详情/收录样式**

```scss
.arena-detail{padding:12px}
.cd-name{font-size:15px;color:var(--chalk);font-weight:700;display:flex;align-items:center;gap:6px}
.cd-tag{font-size:10px;color:var(--amber);border:1px solid rgba(180,40,40,0.4);border-radius:3px;padding:1px 5px}
.cd-meta{font-size:11px;color:var(--chalk-d);margin-top:4px}
.cd-appearance{font-size:11px;color:var(--chalk);margin-top:6px;line-height:1.4}
.cd-intro{font-size:12px;color:var(--chalk);margin-top:8px;padding:8px;background:rgba(180,40,40,0.08);border-radius:6px}
.cd-foot{font-size:10px;color:var(--chalk-d);margin-top:6px;opacity:0.7}
.cd-job{font-size:12px;color:var(--chalk);font-weight:500}
.cd-sub{font-size:11px;color:var(--chalk-d);margin-top:2px}
.cd-attrs{display:flex;gap:10px;flex-wrap:wrap;font-size:12px;color:var(--chalk)}
.cd-slot{display:flex;justify-content:space-between;font-size:11px;color:var(--chalk-d);padding:2px 0;border-bottom:1px dashed rgba(80,40,20,0.15)}
.cd-slot-name{color:var(--amber)}
.arena-bottom-bar{padding:8px 12px;flex-shrink:0;background:rgba(30,20,14,0.95);border-top:1px solid rgba(80,40,20,0.35)}
.arena-battle{width:100%;background:rgba(180,40,40,0.2);border-color:rgba(180,40,40,0.5);font-size:14px}
.author-preview{background:rgba(40,120,80,0.1);border:1px solid rgba(60,140,100,0.3);border-radius:6px;padding:8px 10px;margin:8px 0}
.ap-name{font-size:13px;color:var(--chalk);font-weight:600}
.ap-meta{font-size:10px;color:var(--chalk-d);margin-top:2px}
.author-del{background:none;border:1px solid rgba(180,40,40,0.4);color:#d06050;border-radius:4px;font-size:10px;padding:2px 8px;cursor:pointer;margin-left:auto}
```

- [ ] **Step 6: 编译验证**

Run: `pnpm build`
Expected: 无编译错误。

- [ ] **Step 7: 提交**

```bash
git add src/wxhl-003/App.vue
git commit -m "feat(arena): add opponent detail, battle confirm, and authoring UI"
```

---

### Task 8: 全流程验证与收尾

**Files:**
- Modify: `verify_workshop.ts`（保留，作为纯逻辑回归脚本）

- [ ] **Step 1: 跑纯逻辑回归**

Run: `node verify_workshop.ts`
Expected: 输出 `VERIFY_OK task1` 与 `VERIFY_OK task2`，无断言失败。

- [ ] **Step 2: 全量构建**

Run: `pnpm build`
Expected: 无错误，`dist/wxhl-003/index.js` 更新。

- [ ] **Step 3: 浏览器实机验证清单**

在酒馆中加载 `dist/wxhl-003/index.js`（或热重载模式），逐一验证：
1. 桌面出现「PvP竞技场」图标，点击进入列表页（空态提示契约者库为空）
2. 点「上传角色构筑」→ 提取我的构筑 → 自动生成简介（若开）→ 进入编辑页
3. 编辑页逐模块修改字段（如职业名称、外貌栏），点「校验并下载」得到 `.json` 文件
4. 在「终端设置 → 收录契约者」粘贴该 JSON → 校验预览显示契约者名/等级/阶位 → 写入世界书
5. 回竞技场列表 → 契约者出现且按阶位分组排列 → 点进详情 → 发起对战 → 确认
6. 检查 `stat_data.契约者.当前敌人.{对手名}` 已写入（外貌为空时自动用装备生成），聊天末尾插入对手登场正文

- [ ] **Step 4: 提交收尾（含 verify 脚本保留）**

```bash
git add verify_workshop.ts
git commit -m "test(arena): keep workshop pure-logic verification script"
```
