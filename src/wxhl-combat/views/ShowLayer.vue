<template>
  <!-- 演出层：覆盖在决斗场地面上，只放动画元素，绝不挡操作（pointer-events:none） -->
  <div class="show-layer" aria-hidden="true">
    <!-- 环境火把（决斗场两侧，永远在场） -->
    <span class="env-torch left"></span>
    <span class="env-torch right"></span>

    <!-- 攻击轨迹（SVG 满幅，坐标按百分比换算） -->
    <svg v-if="播放.轨迹.length" class="traj-svg" viewBox="0 0 100 100" preserveAspectRatio="none">
      <line
        v-for="(t, i) in 播放.轨迹"
        :key="'t' + 批次 + '-' + i"
        :x1="t.x1"
        y1="50"
        :x2="t.x2"
        y2="50"
        class="traj"
        :class="{ miss: t.未命中 }"
        :style="{ animationDelay: t.延迟 + 's' }"
        pathLength="100"
      />
    </svg>

    <!-- 伤害/提示飘字 -->
    <div
      v-for="(f, i) in 播放.飘字"
      :key="'f' + 批次 + '-' + i"
      class="floater"
      :class="f.类名"
      :style="{ left: f.左 + '%', animationDelay: f.延迟 + 's' }"
    >
      {{ f.文本 }}
    </div>

    <!-- 打断金色裂纹 -->
    <div
      v-for="(c, i) in 播放.裂纹"
      :key="'c' + 批次 + '-' + i"
      class="crack"
      :style="{ left: c.左 + '%', animationDelay: c.延迟 + 's' }"
    ></div>

    <!-- 规则系光环 -->
    <div
      v-for="(h, i) in 播放.光环"
      :key="'h' + 批次 + '-' + i"
      class="halo"
      :class="h.色"
      :style="{ left: h.左 + '%', animationDelay: h.延迟 + 's' }"
    ></div>
  </div>

  <!-- 变身全屏演出（挂在视口上，压暗全场 → 铭牌亮出） -->
  <div
    v-for="(m, i) in 播放.变身"
    :key="'m' + 批次 + '-' + i"
    class="transform-show"
    :style="{ animationDelay: m.延迟 + 's' }"
  >
    <div class="ts-plate">{{ m.形态 }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { 演出事件 } from '../engine/showEvents';

// ================================================================
// 演出层（决斗场美术）：把演出事件画成飘字/轨迹/裂纹/光环/变身全屏。
//
// - 位置：复用决斗场地面的坐标系（单位显示名 → 横向百分比，由 BattleView 喂进来）
// - 播放：全部事件**一次性**渲染、用 animation-delay 错峰 —— 不用定时器，
//   SSR/静态渲染下也能断言；下一回合开始时由上层整体换掉
// - 性能：DOM 上限 24（超出即弃，不排队）；全部 transform/opacity 动画
// ================================================================

const props = defineProps<{
  事件: 演出事件[];
  /** 单位键/显示名 → 地砖横向百分比（与距离轴同一套坐标） */
  坐标?: Record<string, number>;
  /** 批次号：每批 +1 —— 当 key 前缀用，新批次整批重建节点，CSS 动画自然重播 */
  批次: number;
}>();

/** 演出元素总数上限（手机端防掉帧；变身全屏单独算，最多 2 个） */
const 上限 = 24;

/** 规则系效果 → 光环配色 */
function 光环色(效果?: string): string {
  switch (效果) {
    case '即死':
      return 'black';
    case '无敌':
    case '锁血':
      return 'gold';
    case '必中':
    case '穿透':
      return 'white';
    default:
      return 'blood';
  }
}

interface 飘字 { 文本: string; 左: number; 延迟: number; 类名: string }
interface 轨迹 { x1: number; x2: number; 延迟: number; 未命中: boolean }
interface 裂纹 { 左: number; 延迟: number }
interface 光环 { 左: number; 延迟: number; 色: string }
interface 变身 { 形态: string; 延迟: number }

const 播放 = computed<{ 飘字: 飘字[]; 轨迹: 轨迹[]; 裂纹: 裂纹[]; 光环: 光环[]; 变身: 变身[] }>(() => {
  const 飘字: 飘字[] = [];
  const 轨迹: 轨迹[] = [];
  const 裂纹: 裂纹[] = [];
  const 光环: 光环[] = [];
  const 变身: 变身[] = [];

  // 先键后名：同名单位（一波两只「骨卫兵」）按名会锚错棋子（最终评审实锤），最后兜底场心 50%
  const 查 = (键?: string, 名?: string): number =>
    (键 && props.坐标?.[键]) ?? (名 && props.坐标?.[名]) ?? 50;

  let 序号 = 0;
  for (const e of props.事件 ?? []) {
    if (!e?.类) continue;
    const 延迟 = Math.round(序号 * 0.45 * 100) / 100;
    序号++;

    switch (e.类) {
      case '命中':
        飘字.push({ 文本: `-${e.伤害 ?? 0}`, 左: 查(e.守方键, e.守方), 延迟, 类名: 'dmg' });
        if (e.攻方 && e.守方) 轨迹.push({ x1: 查(e.攻方键, e.攻方), x2: 查(e.守方键, e.守方), 延迟, 未命中: false });
        break;
      case '未命中':
        飘字.push({ 文本: '未命中', 左: 查(e.守方键, e.守方), 延迟, 类名: 'miss' });
        if (e.攻方 && e.守方) 轨迹.push({ x1: 查(e.攻方键, e.攻方), x2: 查(e.守方键, e.守方), 延迟, 未命中: true });
        break;
      case '打断成功':
        裂纹.push({ 左: 查(e.单位键, e.单位), 延迟 });
        break;
      case '打断失败':
        飘字.push({ 文本: '打断失败', 左: 查(e.单位键, e.单位), 延迟, 类名: 'miss' });
        break;
      case '反应防御':
        飘字.push({ 文本: '格挡', 左: 查(e.单位键, e.单位), 延迟, 类名: 'guard' });
        break;
      case '濒死':
        飘字.push({ 文本: '濒死！', 左: 查(e.守方键, e.守方), 延迟, 类名: 'dying' });
        break;
      case '规则系':
        光环.push({ 左: 查(e.单位键, e.单位), 延迟, 色: 光环色(e.效果) });
        break;
      case '变身':
        if (变身.length < 2) 变身.push({ 形态: e.形态 ?? '觉醒', 延迟 });
        break;
    }
  }

  // DOM 上限：按优先级砍 —— 飘字（伤害数字最要紧）> 轨迹 > 裂纹 > 光环
  const 保留飘字 = 飘字.slice(0, 上限);
  const 余1 = Math.max(0, 上限 - 保留飘字.length);
  const 保留轨迹 = 轨迹.slice(0, 余1);
  const 余2 = Math.max(0, 余1 - 保留轨迹.length);
  const 保留裂纹 = 裂纹.slice(0, 余2);
  const 余3 = Math.max(0, 余2 - 保留裂纹.length);
  const 保留光环 = 光环.slice(0, 余3);
  return { 飘字: 保留飘字, 轨迹: 保留轨迹, 裂纹: 保留裂纹, 光环: 保留光环, 变身 };
});
</script>

<style scoped lang="scss">
@use '../theme.scss' as t;

.show-layer {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: hidden;
  z-index: 3;
}

/* ---------- 环境火把 ---------- */
.env-torch {
  position: absolute;
  top: 6px;
  width: 10px;
  height: 10px;
  border-radius: 50% 50% 50% 0;
  transform: rotate(-45deg);
  background: radial-gradient(circle at 60% 40%, var(--cb-ember), rgba(138, 32, 32, 0.85));
  box-shadow:
    0 0 14px rgba(216, 145, 74, 0.75),
    0 0 34px rgba(216, 145, 74, 0.35);
  animation: cbTorchFlick 4.6s ease-in-out infinite;

  &.left {
    left: 8px;
  }
  &.right {
    right: 8px;
    animation-delay: 1.3s;
  }
}

/* ---------- 攻击轨迹 ---------- */
.traj-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}

.traj {
  stroke: rgba(208, 80, 64, 0.85);
  stroke-width: 0.7;
  stroke-linecap: round;
  stroke-dasharray: 100;
  stroke-dashoffset: 100;
  filter: drop-shadow(0 0 1.2px rgba(208, 80, 64, 0.8));
  animation: cbTraj 0.45s ease-out forwards;

  &.miss {
    stroke: rgba(125, 108, 88, 0.6);
    filter: none;
  }
}

@keyframes cbTraj {
  to {
    stroke-dashoffset: 0;
    opacity: 0;
  }
}

/* ---------- 飘字 ---------- */
.floater {
  position: absolute;
  bottom: 26px;
  transform: translateX(-50%);
  font-family: var(--cb-font-display);
  font-size: 16px;
  font-weight: 900;
  color: var(--cb-blood-wet);
  text-shadow:
    0 0 6px rgba(0, 0, 0, 0.9),
    0 0 14px rgba(208, 80, 64, 0.5);
  opacity: 0;
  animation: cbDamageFloat 0.9s ease-out forwards;

  &.miss {
    color: var(--cb-dim);
    font-size: 13px;
    text-shadow: none;
  }

  &.guard {
    color: var(--cb-shield);
    font-size: 13px;
  }

  &.dying {
    color: var(--cb-blood-wet);
    font-size: 15px;
    letter-spacing: 2px;
  }
}

/* ---------- 打断金色裂纹 ---------- */
.crack {
  position: absolute;
  bottom: 22px;
  width: 34px;
  height: 34px;
  transform: translateX(-50%);
  border-radius: 50%;
  border: 2px solid var(--cb-gold);
  box-shadow:
    0 0 12px rgba(208, 168, 80, 0.8),
    inset 0 0 8px rgba(208, 168, 80, 0.5);
  opacity: 0;
  animation: cbCrackFlash 0.6s ease-out forwards;
}

/* ---------- 规则系光环 ---------- */
.halo {
  position: absolute;
  bottom: 22px;
  width: 28px;
  height: 28px;
  transform: translateX(-50%);
  border-radius: 50%;
  border: 2px solid var(--cb-blood-wet);
  opacity: 0;
  animation: cbCrackFlash 0.8s ease-out forwards;

  &.gold {
    border-color: var(--cb-gold);
    box-shadow: 0 0 14px rgba(208, 168, 80, 0.7);
  }
  &.white {
    border-color: #eee;
    box-shadow: 0 0 14px rgba(240, 240, 240, 0.6);
  }
  &.black {
    border-color: #201018;
    background: rgba(16, 4, 8, 0.5);
    box-shadow: 0 0 14px rgba(120, 10, 30, 0.8);
  }
}

/* ---------- 变身全屏演出 ---------- */
.transform-show {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background:
    radial-gradient(ellipse at 50% 50%, rgba(74, 16, 16, 0.35) 0%, rgba(4, 2, 1, 0.75) 75%);
  pointer-events: none;
  opacity: 0;
  animation: cbTransformPulse 2.2s ease-out forwards;
  z-index: 2147483646;
}

.ts-plate {
  @include t.cb-stone(18px 34px);
  @include t.cb-rivets(9px);
  color: var(--cb-amber);
  font-family: var(--cb-font-display);
  font-size: 30px;
  font-weight: 900;
  letter-spacing: 8px;
  text-shadow:
    0 0 16px rgba(232, 192, 120, 0.6),
    0 0 40px rgba(208, 80, 64, 0.4);
}
</style>
