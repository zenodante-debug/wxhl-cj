<template>
  <div class="wxhl-combat-root">
    <!-- 悬浮入口（面板关闭时唯一可见物）：可拖动，位置持久化 -->
    <button
      v-if="!外壳.面板可见"
      ref="悬浮球"
      class="combat-launcher"
      :class="{ dragging: 拖动中 }"
      title="拖动可移动 · 点击打开战斗引擎"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @click="onClick"
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
          <CombatView v-if="外壳.页签 === '战斗'" />
          <SettingsView v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { 外壳初始状态, 切换外壳, 切换页签, type 外壳状态 } from './engine/shell';
import { 夹取位置, 默认位置, 算作拖动, type 视口 } from './engine/orb';
import CombatView from './views/CombatView.vue';
import SettingsView from './views/SettingsView.vue';

const 外壳 = ref<外壳状态>(外壳初始状态());

// ================================================================
// 悬浮球定位与拖动
//
// 对齐 wxhl-003 小手机悬浮球的语义（指针捕获 + visualViewport 夹取 + 位置持久化），
// 但用**独立的 localStorage 键**，并**刻意错开默认落点** ——
// 两个脚本各自独立运行、互不知道对方，只能靠约定不同的默认位置避免叠在一起。
//
// 层级说明：本脚本的根 #wxhl-combat-root 是 2147483645、小手机根是 2147483640
//（spec §12.1 要求战斗面板压住小手机桌面），所以**桌面端我们的球画在小手机球之上**。
// 一个根只能有一个层叠上下文，改不了这件事 —— 只能靠不重叠的默认位置 + 可拖动来解决。
// ================================================================

const 位置键 = 'wxhl-combat-orb-position-v1';
/** 悬浮球挂在酒馆页面（父文档）上，所以视口与 localStorage 都读父窗口的 */
const 宿主 = window.parent ?? window;

function 读视口(): 视口 {
  const vv = (宿主 as any).visualViewport;
  return {
    left: vv?.offsetLeft || 0,
    top: vv?.offsetTop || 0,
    width: vv?.width || 宿主.innerWidth,
    height: vv?.height || 宿主.innerHeight,
  };
}

function 读存的位置(): { left: number; top: number } | null {
  try {
    const v = JSON.parse(宿主.localStorage.getItem(位置键) || 'null');
    return Number.isFinite(v?.left) && Number.isFinite(v?.top) ? { left: v.left, top: v.top } : null;
  } catch {
    return null;
  }
}

function 存位置(left: number, top: number): void {
  try {
    宿主.localStorage.setItem(位置键, JSON.stringify({ left, top }));
  } catch {
    /* 忽略 */
  }
}

const 悬浮球 = ref<HTMLButtonElement | null>(null);
const 拖动中 = ref(false);
/** 当前落点（内存里的一份，避免每次归位都读 localStorage） */
const 已存坐标 = ref<{ left: number; top: number } | null>(null);
let 拖动: {
  pointerId: number;
  startX: number;
  startY: number;
  left: number;
  top: number;
  moved: boolean;
} | null = null;
/** 拖动结束后的一小段时间里抑制 click，免得「拖完顺手开面板」 */
let 抑制点击到 = 0;

/**
 * 把球摆到「视口坐标」。
 * 先按视口坐标设一次，再用 getBoundingClientRect（同为视口坐标）量出实际偏差并抵消 ——
 * 父文档里 fixed 的包含块可能不是视口（祖先有 transform/filter/backdrop-filter 或 pinch-zoom），
 * 直接设 left/top 会跑偏。与小手机同一套自校正做法。
 */
function 摆放(left: number, top: number): void {
  const el = 悬浮球.value;
  if (!el) return;
  const 设 = (l: number, t: number) => {
    el.style.setProperty('left', `${l}px`, 'important');
    el.style.setProperty('top', `${t}px`, 'important');
    el.style.setProperty('right', 'auto', 'important');
    el.style.setProperty('bottom', 'auto', 'important');
  };
  设(left, top);
  const rect = el.getBoundingClientRect();
  const dx = left - rect.left;
  const dy = top - rect.top;
  if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) 设(left + dx, top + dy);
}

/** 归位：拖动中不打扰；其余情况按「已拖动的位置 → 存档 → 默认」并夹进视口 */
function 归位(): void {
  if (拖动中.value) return;
  const 视口 = 读视口();
  const 起点 = 已存坐标.value ?? 读存的位置() ?? 默认位置(视口);
  const 夹好 = 夹取位置(起点.left, 起点.top, 视口);
  已存坐标.value = 夹好;
  摆放(夹好.left, 夹好.top);
}

function onPointerDown(e: PointerEvent): void {
  if (e.button > 0) return;
  const el = 悬浮球.value;
  if (!el) return;
  const rect = el.getBoundingClientRect();
  拖动 = {
    pointerId: e.pointerId,
    startX: e.clientX,
    startY: e.clientY,
    left: rect.left,
    top: rect.top,
    moved: false,
  };
  拖动中.value = true;
  摆放(rect.left, rect.top); // 先钉在当前视口位置，避免起点跳变
  try {
    el.setPointerCapture(e.pointerId);
  } catch {
    /* 忽略 */
  }
}

function onPointerMove(e: PointerEvent): void {
  if (!拖动 || e.pointerId !== 拖动.pointerId) return;
  const dx = e.clientX - 拖动.startX;
  const dy = e.clientY - 拖动.startY;
  if (!拖动.moved && 算作拖动(dx, dy)) 拖动.moved = true;
  if (!拖动.moved) return;
  e.preventDefault();
  const 夹好 = 夹取位置(拖动.left + dx, 拖动.top + dy, 读视口());
  已存坐标.value = 夹好;
  摆放(夹好.left, 夹好.top);
}

function onPointerUp(e: PointerEvent): void {
  if (!拖动 || e.pointerId !== 拖动.pointerId) return;
  const moved = 拖动.moved;
  拖动 = null;
  拖动中.value = false;
  try {
    悬浮球.value?.releasePointerCapture(e.pointerId);
  } catch {
    /* 忽略 */
  }
  if (moved) {
    const rect = 悬浮球.value?.getBoundingClientRect();
    if (rect) {
      已存坐标.value = { left: rect.left, top: rect.top };
      存位置(rect.left, rect.top);
    }
    抑制点击到 = Date.now() + 500;
  }
}

function onClick(e: MouseEvent): void {
  if (Date.now() < 抑制点击到) {
    e.preventDefault();
    e.stopImmediatePropagation();
    return;
  }
  外壳.value = 切换外壳(外壳.value, '打开');
}

onMounted(() => {
  归位();
  宿主.addEventListener('resize', 归位);
  宿主.visualViewport?.addEventListener('resize', 归位);
  宿主.visualViewport?.addEventListener('scroll', 归位);
});

onBeforeUnmount(() => {
  宿主.removeEventListener('resize', 归位);
  宿主.visualViewport?.removeEventListener('resize', 归位);
  宿主.visualViewport?.removeEventListener('scroll', 归位);
});
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
  // 位置由 JS 用 !important 覆盖（含包含块自校正）；这里的 right/top 只是挂载前的兜底
  position: fixed;
  right: 14px;
  top: 66%;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid #555;
  background: #1a1a1a;
  color: #fff;
  font-size: 24px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 18px #000a;
  pointer-events: auto;
  cursor: grab;
  touch-action: none; // 触摸拖动必需：否则浏览器会当成滚动手势
  user-select: none;

  &:hover {
    background: #2a2a2a;
  }

  &.dragging {
    cursor: grabbing;
    // 拖动中不做过渡，避免跟手迟滞
    transition: none;
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
