# 职业路线规划 - 设计规格

> 日期: 2026-08-03 | 项目: wxhl-003 酒馆助手插件

## 概述

在 wxhl-003 手机插件中新增「职业规划」功能，与现有「回廊论坛」「终端设置」平级，作为桌面第三个图标。玩家输入关键词或混乱想法，AI 根据职业系统规则和融合规则生成复合职业方案，并以该融合职业为目标规划获取路线图。

## 架构

### 导航结构

```
桌面 (desktop)
├── 回廊论坛 (forum)       ← 现有
├── 职业规划 (career)      ← 新增
└── 终端设置 (settings)    ← 现有
```

职业规划内部视图：

```
职业规划列表页
├── 空态：提示文字 + 居中「新建方案」按钮
├── 方案卡片列表（名称 + 稀有度色标 + 关键词 + 时间 + 状态标签）
├── 删除确认
└── 底部「新建方案」按钮

新建方案弹层
├── 文本输入区（关键词或想法）
└── 生成 / 取消

方案详情页
├── 返回按钮 + 方案名称标题
├── 全部信息块以分段卡片展示
├── 未完成方案显示「继续生成」按钮
└── 删除此方案按钮
```

### 文件变更

| 文件 | 改动 |
|------|------|
| `App.vue` | 桌面加第三个图标；`currentView` 新增 `'career'`；新增 career 列表页、详情页、新建弹层模板 |
| `store.ts` | 新增 `useCareerStore`：方案 CRUD、两轮 AI 生成、localStorage 持久化 |
| `data.ts` | 新增 `CareerPlan`、`CareerPlanV1`、`CareerPlanV2` 类型定义 |

不新增文件。

## 组件 / 数据流

### 数据模型

```typescript
interface CareerPlan {
  id: number
  createdAt: string
  keywords: string           // 玩家原始输入
  phase: 'v1' | 'complete'  // 生成阶段

  // === 第一轮：框架 ===
  name: string               // 融合职业名称
  rarity: string             // 白色/蓝色/金色/紫色/银色
  coreConcept: string        // 一句话核心定位
  mainJob: {
    name: string
    rarity: string
    acquisition: string
    classTree: string
    attributeTendency: string
  }
  subJob: {
    name: string
    rarity: string
    world: string
    acquisition: string
    classTree: string
    attributeTendency: string
  }
  affinity: {
    result: string
    reasons: string
  }
  evolution: {
    firstClass: string
    secondClass: string
    thirdClass: string
  }

  // === 第二轮：细节（phase === 'complete' 时存在）===
  mainSkillTree?: string
  subSkillTree?: string
  mainPassives?: string
  subPassives?: string
  combinedAttributes?: string
  equipmentFit?: string
  stepGuide?: string[]
  risks?: string
}
```

### Store

`useCareerStore`（pinia）：

- `plans: CareerPlan[]` — 所有方案
- `generatingV1: boolean` — 第一轮生成中
- `generatingV2: boolean` — 第二轮生成中
- `lastError: string`
- `loadPlans()` / `createPlan(keywords)` / `confirmPlan(id)` / `deletePlan(id)`

localStorage key: `wxhl003_career_plans`，通过 `watchEffect` 自动同步。

### 生成流程（两轮）

```
第1轮：输入关键词 + 职业规则 + 世界观 → AI 生成框架 JSON
       ↓
  方案以 phase:'v1' 存入列表，展示框架卡片
       ↓
  用户确认方向 → 进入第2轮
  用户不满意 → 重新第1轮
       ↓
第2轮：已有框架 + 职业规则 + 世界观 → AI 生成细节 JSON
       ↓
  补充字段写入方案，phase 改为 'complete'
```

### Prompt 结构

1. **死命令**: 只返回合法 JSON，无 markdown
2. **世界观**: 从用户选择的世界书中读取（与论坛共享同一世界书选择 + `getWorldbookContent()`）
3. **职业规则**: 用户提供的 `<职业系统>` + `<职业融合>` 原文
4. **玩家输入**: 关键词或想法
5. **生成指令**: 融合职业方案的具体要求

第1轮和第2轮使用不同的 JSON Schema 约束。

## 错误处理

| 状态 | 处理 |
|------|------|
| API 未配置 | 提示"请先在终端设置中配置 API" |
| 第1轮生成失败 | 显示错误信息 + 重试按钮 |
| 第1轮 JSON 格式错误 | 内置 3 次重试（与论坛一致） |
| 第2轮生成失败 | 显示错误信息 + 保留第1轮数据 + 可重试 |
| 空列表 | "尚未创建职业方案"提示 |

## UI 状态覆盖

| 状态 | 展示 |
|------|------|
| 空列表 | 居中提示 + 新建按钮 |
| 第一轮生成中 | loading spinner + "AI 正在设计职业方案..." |
| 方案列表 | 卡片：名称、稀有度色标、关键词、时间、(未完成/已完成)标签 |
| 方案详情（已完成） | 全部信息块分段卡片展示 |
| 方案详情（未完成） | 第一轮内容 + "继续生成细节"按钮 |
| 删除 | 简单确认交互 |

## 复用

- **API 调用**: 复用 `aiGenerate()` 的 JSON 验证 + 3 次重试 + 格式修复逻辑
- **世界书**: 复用 `getWorldbookContent()`（共享 `settings.selectedWorldbooks`）
- **样式**: 复用现有 CSS 变量、`.app-page` / `.app-header` / `.scroll-area` / `.hdr-btn` 等类
- **localStorage**: 复用 `watchEffect(() => save(...))` 模式
