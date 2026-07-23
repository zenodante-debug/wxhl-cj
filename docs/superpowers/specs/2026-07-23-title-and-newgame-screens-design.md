# 无限回廊 — 标题界面 & 开局创建页面设计

> **日期**: 2026-07-23
> **状态**: 待审阅
> **关联**: [[wxhl-corridor-main]] — 后续迁移 wxhl 走廊主页面

---

## 1. 概述

为"无限回廊"酒馆助手前端界面引入两个新页面：

- **标题界面（TitleScreen）**：作为项目加载后的首个页面，提供游戏入口
- **开局创建页面（NewGame）**：缺省占位，后续由用户填充具体内容

两页共享"里世界长廊"视觉主题，沿用 wxhl 项目的色板、材质和氛围，但在动效和交互细节上进一步提升。

### 1.1 约束条件

| 约束 | 说明 |
|------|------|
| 运行环境 | SillyTavern 消息楼层 iframe 内 |
| 禁止高度单位 | 不得使用 `vh`、`%`（对高度）、`min-height` 等会导致无限拉长的属性 |
| 尺寸方案 | `max-width: 800px; width: 100%; aspect-ratio: 16/9`（宽屏） |
| UI 框架 | Vue 3 + Pinia + Vue Router（`createMemoryHistory()`） |
| 动画库 | GSAP |
| 样式方案 | TailwindCSS + `<style scoped>` |
| 入口初始化 | `$(() => {})`（非 `DOMContentLoaded`） |
| 字体图标 | FontAwesome free |

### 1.2 视觉关键词

> 参照《寂静岭 P.T.》— "里世界"、"一条深不见底的长廊"、"铁锈"

**色板（继承自 wxhl）**：

| 变量名 | 色值 | 用途 |
|--------|------|------|
| `--bg-void` | `#060403` | 背景虚空 |
| `--rust-dark` | `#1a0a05` | 深铁锈 |
| `--rust` | `#2a1008` | 铁锈 |
| `--rust-mid` | `#3d1a0c` | 中铁锈 |
| `--rust-light` | `#5a2812` | 浅铁锈 |
| `--blood-dry` | `#2a0808` | 干涸血迹 |
| `--blood` | `#4a1010` | 血迹 |
| `--blood-bright` | `#7a1818` | 新鲜血迹 |
| `--blood-wet` | `#a02020` | 湿润血迹 |
| `--flesh-base` | `#1a0c08` | 血肉基础 |
| `--iron` | `#3a3430` | 铁色边框 |
| `--iron-dark` | `#1a1815` | 深铁 |
| `--amber` | `#e0c080` | 琥珀色（高亮文字） |
| `--amber-dim` | `#b8a070` | 暗琥珀 |
| `--chalk` | `#ddd5c8` | 粉笔白（正文） |
| `--chalk-dim` | `#a09080` | 暗粉笔 |
| `--emerge` | `#f0e8d8` | 浮现白（最高亮） |

**字体**：
- Display: `'Noto Serif SC', 'SimSun', serif`（标题、装饰文字）
- Body: `'Noto Sans SC', 'PingFang SC', system-ui, sans-serif`（正文）
- Mono: `'JetBrains Mono', monospace`（数据、代码）

---

## 2. 项目结构

```
src/
├── index.html                 # <head></head><body><div id="app"></div></body>
├── index.ts                   # 入口：Vue App + Pinia + Router + $() 挂载
├── App.vue                    # <RouterView /> 含路由过渡动画
├── index.scss                 # 全局样式：CSS 变量定义、reset
├── store/
│   └── game.ts                # Pinia store：楼层检测
├── views/
│   ├── TitleScreen.vue        # 标题界面
│   ├── NewGame.vue            # 开局创建页面（缺省占位）
│   └── MainGame.vue           # 主游戏页面（占位，后续迁移 wxhl）
└── components/
    ├── EmberParticles.vue     # Canvas 余烬粒子（可复用）
    ├── CorridorTunnel.vue     # CSS 3D 长廊透视背景（可复用）
    └── RustFrame.vue          # 铁锈边框装饰面板
```

### 2.1 组件职责

**EmberParticles** — 纯 Canvas 粒子层
- 接收 `particleCount`、`speed`、`color` 等 props
- 用 `gsap.ticker` 驱动渲染循环
- 挂载时初始化 Canvas，卸载时销毁 ticker
- 不依赖任何外部状态

**CorridorTunnel** — CSS 3D 长廊透视背景
- 纯 CSS + 静态 DOM：左墙、右墙、地面、天花板管线、远处血光
- 接收 `depth` prop 控制 perspective 值（用于路由过渡时推近/拉远）
- 墙上铁锈斑块、血痕、手印为伪元素叠加层
- 吊灯 flicker 用 CSS animation + scoped style

**RustFrame** — 可复用的铁锈边框内容面板
- 外层 `border: 2px solid var(--iron)`，内侧 `border: 1px solid rgba(100,50,20,0.15)`
- `<slot>` 插槽放置任意内容
- 可选 prop `title: string`

---

## 3. 路由设计

| 路径 | 组件 | 说明 |
|------|------|------|
| `/` | `TitleScreen` | 默认入口，标题界面 |
| `/new-game` | `NewGame` | 开局创建页面 |
| `/main` | `MainGame` | 主游戏页面（占位） |

使用 `createMemoryHistory()` 创建 router（禁止在 `$(() => {})` 内执行）。

### 3.1 路由跳转逻辑

在 `TitleScreen` 中点击"踏入回廊"按钮时：

```ts
function enterCorridor() {
  const lastId = getLastMessageId()  // 酒馆助手 API
  if (lastId === 0) {
    router.push('/new-game')
  } else {
    router.push('/main')
  }
}
```

### 3.2 路由过渡动画

使用 Vue 的 `<RouterView>` 过渡：

- **`/ → /new-game`**：长廊 `perspective` 从 800px 推近到 500px（模拟走入深处），墙壁 `rotateY` 角度各收缩 5°，新页面内容从 `opacity: 0` + `scale(0.95)` 浮现
- **`/ → /main`**：同样推近效果，主页面从血光中展开
- **`/new-game → /`**：反向动画，长廊回退

---

## 4. 标题界面（TitleScreen）详细设计

### 4.1 画面纵深层次

```
┌─────────────────────────────────────────────────┐
│  [天花版]  管道走向 · 吊灯 flicker 闪烁         │
├─────────────────────────────────────────────────┤
│  左墙 ←── 透视长廊（CSS 3D） ──→ 右墙          │
│   铁锈斑块    ░ 余烬粒子飘散 ░    血手印        │
│   血痕 streaks                 肉纹 veins       │
│              ┌──────────────┐                   │
│              │   无 限 回 廊  │  ← 标题（大）   │
│              │     z e n o   │  ← 作者名        │
│              │              │                   │
│              │  ◆ 踏 入 回 廊 ◆│ ← CTA 按钮     │
│              └──────────────┘                   │
├─────────────────────────────────────────────────┤
│  [地面]   汇聚网格线 · 血泊                      │
│                                                 │
│         ◇ 尽头血光 portalBreathe ◇               │
└─────────────────────────────────────────────────┘

容器尺寸：max-width: 800px; width: 100%; aspect-ratio: 16/9 (450px)
```

### 4.2 元素详情

#### 天花板
- 高度 ~12% 容器高度
- 顶部渐变暗色条（`#050302` → `#0a0705` → `#120c08`）
- 2 根横向管道（`pipe-run`）：深铁色圆角条，底部有滴水动画（`pipeDrip`）
- 吊灯：从天花板正中垂下，细线 + 椭圆形灯泡，flicker 动画（7s 周期，偶发暗闪）

#### 长廊透视

**左墙**（`#wall-left`）：
- `position: absolute; left: 0; width: 36%;`
- 背景：径向渐变 + 线性渐变混合模拟铁锈/血肉质感
- `clip-path: polygon(0 0, 100% 5%, 100% 95%, 0 100%)` — 近宽远窄的透视
- `border-right: 1px solid rgba(120,40,20,0.2)` — 与地面的接缝线
- 叠加层：肉纹（flesh-veins）、铁锈斑块（rust-patches）、血痕（blood-streak）、墙上刻字（"NO RETURN"、"契约即枷锁"）

**右墙**（`#wall-right`）：
- 左右镜像布局
- `clip-path: polygon(0 5%, 100% 0, 100% 100%, 0 95%)`
- 叠加层：肉纹（右向）、铁锈斑块（右向）、血痕、血手印（handprint）

**地面**（`#floor-plain`）：
- `position: absolute; bottom: 0; left: 14%; right: 14%; height: 22%;`
- `clip-path: polygon(0 30%, 100% 30%, 100% 100%, 0 100%)` — 近宽远窄
- 汇聚线：`repeating-linear-gradient` 水平线 + `conic-gradient` 放射线
- 血泊：左下角 `radial-gradient` 暗红色椭圆
- 裂缝：`linear-gradient` 细线

**远处血光**（`.portal-glow`）：
- 位于走廊正中尽头
- `radial-gradient(ellipse at center, rgba(180,60,20,0.15) ...)`
- `animation: portalBreathe 4s ease-in-out infinite` — 呼吸式明暗变化

#### 标题区域（居中覆盖）

- 绝对定位，`top: 30%; left: 50%; transform: translateX(-50%)`
- 不设背景，文字直接浮在长廊之上

**游戏名 "无限回廊"**：
- 字体：`var(--font-display)`，`font-size: 2.4rem`，`letter-spacing: 8px`
- 颜色：`var(--emerge)`
- 文字阴影：`0 0 20px rgba(200,150,80,0.3)` 琥珀色微光
- 入场：`filter: blur(8px)` → `blur(0)`，`letter-spacing: 20px` → `8px`，duration 0.8s，ease `power3.out`

**作者名 "zeno"**：
- 字体：`var(--font-mono)`，`font-size: 0.9rem`，`letter-spacing: 4px`
- 颜色：`var(--amber-dim)`，`opacity: 0.7`
- 位于标题下方 16px
- 入场：`opacity: 0; y: 10px` → `opacity: 0.7; y: 0`，delay 0.3s

#### "踏入回廊"按钮

- 位于作者名下方 32px
- 字体：`var(--font-display)`，`font-size: 1.2rem`，`letter-spacing: 6px`
- `padding: 12px 40px`
- 背景：`rgba(10,6,4,0.7)`（半透明暗色，让后方长廊可见）
- 边框：`2px solid var(--iron)`
- 颜色：`var(--amber)`
- 左右 `◆` 装饰：`font-size: 0.7rem`，`color: var(--amber-dim)`，hover 时各旋转 ±45°

**按钮三态**：

| 状态 | 边框 | 发光 | 文字色 | 缩放 |
|------|------|------|--------|------|
| 默认 | `#3a3430`（iron） | 无 | `#e0c080`（amber） | 1 |
| Hover | `#7a1818`（blood-bright） | `box-shadow: 0 0 24px rgba(160,30,20,0.4)` | `#f0e8d8`（emerge） | 1.03 |
| Active | `#a02020`（blood-wet） | 发光增强 | `#f0e8d8` | 0.97 |

- Hover 过渡：`all 0.3s cubic-bezier(0.16, 1, 0.3, 1)`
- Active 过渡：`0.1s`

### 4.3 动效时序（GSAP Timeline）

```
t=0.0s  场景 opacity 0→1                        (0.5s)
t=0.2s  远处血光 portal-glow opacity 0→0.5      (0.8s)
t=0.5s  余烬粒子 Canvas 开始绘制                 (持续)
t=0.6s  左墙 铁锈斑块 staggered 渐显            (0.4s)
t=0.7s  右墙 铁锈斑块 staggered 渐显            (0.4s)
t=0.8s  吊灯 flicker 亮起                        (0.3s)
t=1.2s  "无限回廊" 模糊→清晰 + 色散             (0.8s, power3.out)
t=1.8s  "zeno" 淡入 + 上浮                       (0.5s)
t=2.4s  "踏入回廊" 按钮 淡入 + scale(0.95→1)    (0.4s, back.out)
```

### 4.4 氛围持续动画（CSS Animation）

| 元素 | 动画 | 周期 |
|------|------|------|
| 吊灯闪烁 | `bulbFlick`：opacity 在 1/0.2 间突变 | 7s |
| 血光呼吸 | `portalBreathe`：opacity 0.4↔0.7 | 4s |
| 肉纹脉动 | `fleshPulse`：opacity 0.45↔0.6 | 8s |
| 管道滴水 | `pipeDrip`：scaleY 1↔4 | 5s |
| 按钮呼吸（待交互时） | `btnPulse`：box-shadow 强弱交替 | 3s |

---

## 5. 开局创建页面（NewGame）缺省设计

### 5.1 布局

复用 `CorridorTunnel` 和 `EmberParticles` 作为背景氛围层。

内容区居中覆盖：

```
┌──────────────────────────────────┐
│  ← 回廊入口 （返回链接）         │
│                                  │
│     契 约 者 创 建               │  ← 标题
│  ┌────────────────────────┐     │
│  │                        │     │
│  │   ⌂ 即 将 开 放 ⌂     │     │  ← 占位区
│  │                        │     │  （后续填充角色创建表单）
│  │   内容敬请期待...       │     │
│  │                        │     │
│  └────────────────────────┘     │
│                                  │
│       [确认创建]（灰色不可点击） │
└──────────────────────────────────┘
```

### 5.2 元素详情

- **返回链接**：左上角 `← 回廊入口`，字体 `var(--font-display)`，颜色 `var(--amber-dim)`，hover 变亮
- **标题**：`font-size: 1.6rem`，`var(--emerge)`，入场从下方浮现
- **占位区**：`RustFrame` 组件包裹，内部虚线边框 `border: 1px dashed rgba(100,50,20,0.3)`，居中灰暗文字
- **确认按钮**：与"踏入回廊"按钮同风格但置灰，`opacity: 0.4`，`pointer-events: none`，文字"确认创建"
- **入场动画**：页面加载后，面板从 `opacity: 0; y: 30px` 滑入，duration 0.5s，delay 0.3s（等长廊推近完成）

### 5.3 后续扩展点

- 占位区替换为实际的契约者创建表单（姓名输入、属性分配、职业选择等）
- 确认按钮激活逻辑
- 创建完成后的路由跳转

---

## 6. 主游戏页面（MainGame）占位

当前仅作为路由目标存在：

```vue
<template>
  <div class="main-game-placeholder">
    主页面（待从 wxhl 迁移）
  </div>
</template>
```

后续将把 wxhl 项目的走廊全景、HUD、门洞交互、手机终端等逐一迁移为 Vue 组件。

---

## 7. 技术实现要点

### 7.1 尺寸安全

所有容器使用：

```scss
.title-scene {
  max-width: 800px;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  position: relative;
}
```

- 不使用 `vh`、`%`（对高度）、`min-height`
- 主体内容不用 `position: absolute` 脱离文档流（内部装饰层除外）
- 不产生横向滚动条

### 7.2 粒子系统

`EmberParticles.vue`：

```ts
// 核心结构
const props = defineProps<{
  particleCount?: number   // 默认 50
  baseColor?: string       // 默认 '180,80,30'
  speed?: number           // 默认 0.1
}>()

// 使用 GSAP ticker 驱动
gsap.ticker.add(drawFrame)
// onUnmounted 时移除 ticker
```

### 7.3 路由过渡

通过 `CorridorTunnel` 的 `depth` prop 变化 + CSS transition 实现：

```scss
.corridor-scene {
  transition: perspective 0.6s cubic-bezier(0.16, 1, 0.3, 1);
}
```

路由变更时用 `watch` + `nextTick` 改变 depth 值。

### 7.4 入口初始化

```ts
// index.ts
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import { createRouter, createMemoryHistory } from 'vue-router'
import App from './App.vue'
import './index.scss'

const router = createRouter({
  history: createMemoryHistory(),
  routes: [
    { path: '/', component: () => import('./views/TitleScreen.vue') },
    { path: '/new-game', component: () => import('./views/NewGame.vue') },
    { path: '/main', component: () => import('./views/MainGame.vue') },
  ],
})

$(() => {
  const app = createApp(App).use(createPinia()).use(router)
  app.mount('#app')
})
```

### 7.5 Pinia Store

```ts
// store/game.ts
export const useGameStore = defineStore('game', () => {
  const depth = ref(800) // 长廊 perspective 值

  function pushDeeper() {
    depth.value = 500 // 走入深处
  }
  function pullBack() {
    depth.value = 800 // 回到入口
  }

  return { depth, pushDeeper, pullBack }
})
```

---

## 8. 文件清单

| 文件 | 状态 | 说明 |
|------|------|------|
| `src/index.html` | 新建 | 仅 `<div id="app">` |
| `src/index.ts` | 新建 | 入口逻辑 |
| `src/App.vue` | 新建 | `<RouterView>` + 过渡 |
| `src/index.scss` | 新建 | CSS 变量 + reset |
| `src/store/game.ts` | 新建 | Pinia store |
| `src/views/TitleScreen.vue` | 新建 | 标题界面（重点） |
| `src/views/NewGame.vue` | 新建 | 缺省占位 |
| `src/views/MainGame.vue` | 新建 | 占位 |
| `src/components/EmberParticles.vue` | 新建 | Canvas 粒子 |
| `src/components/CorridorTunnel.vue` | 新建 | CSS 3D 长廊 |
| `src/components/RustFrame.vue` | 新建 | 铁锈边框面板 |

---

## 9. 验收标准

### 标题界面
- [ ] 加载后首屏即为标题界面
- [ ] 长廊透视正确渲染，墙面、地面、天花板无错位
- [ ] 余烬粒子从底部向上飘散
- [ ] 吊灯 flicker 动画正常
- [ ] 血光呼吸动画正常
- [ ] 入场动效时序正确（1.2s 标题出现，1.8s 作者名，2.4s 按钮）
- [ ] 按钮三态（默认/hover/active）正确
- [ ] 点击"踏入回廊"正确检测楼层并跳转

### 开局创建页面
- [ ] 从标题界面正确过渡（长廊推近）
- [ ] 占位面板正确显示
- [ ] 返回按钮可回到标题界面
- [ ] 确认按钮不可点击（灰色）

### 通用
- [ ] iframe 内不产生纵向/横向滚动条
- [ ] 窗口高度不会无限拉长
- [ ] 移动端宽度自适应正常
- [ ] `pnpm build` 无报错
