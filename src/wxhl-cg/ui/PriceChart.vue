<!-- 回廊交易所 · 走势图：价格折线 + 开盘基准线 / 开仓价线 / 强平线（绿=盈利方向，红=亏损方向） -->
<script setup lang="ts">
import { chartGeometry, type ChartLine } from './chartGeometry';

const props = defineProps<{
  data: number[];
  lines?: ChartLine[];
  width?: number;
  height?: number;
}>();

const w = computed(() => props.width ?? 320);
const h = computed(() => props.height ?? 140);
const geo = computed(() => chartGeometry({ data: props.data, lines: props.lines ?? [], width: w.value, height: h.value }));
const stroke = computed(() => (geo.value.up ? 'var(--cg-up)' : 'var(--cg-down)'));
const LINE_STYLE: Record<ChartLine['kind'], { color: string; dash: string }> = {
  base: { color: 'var(--cg-dim)', dash: '4 3' },
  entry: { color: 'var(--cg-amber-dim)', dash: '6 3' },
  liq: { color: 'var(--cg-down)', dash: '2 2' },
};
</script>

<template>
  <div class="cg-chart">
    <svg :width="w" :height="h" :viewBox="`0 0 ${w} ${h}`">
      <!-- 基准/开仓/强平线 -->
      <g v-for="(l, i) in geo.lineY" :key="i">
        <line
          x1="0"
          :y1="l.y"
          :x2="w"
          :y2="l.y"
          :stroke="LINE_STYLE[l.kind].color"
          :stroke-dasharray="LINE_STYLE[l.kind].dash"
          stroke-width="1"
        />
        <text :x="3" :y="l.y - 3" :fill="LINE_STYLE[l.kind].color" font-size="10">{{ l.label }}</text>
      </g>
      <!-- 价格折线 -->
      <path :d="geo.polyline" fill="none" :stroke="stroke" stroke-width="1.6" stroke-linejoin="round" />
    </svg>
    <div class="cg-chart-axis">
      <span>{{ geo.max.toFixed(2) }}</span>
      <span>{{ geo.min.toFixed(2) }}</span>
    </div>
  </div>
</template>

<style scoped>
.cg-chart {
  position: relative;
  background: var(--cg-sub, #1a100a);
  border: 1px solid var(--cg-border-soft, #33221a);
  border-radius: 6px;
  overflow: hidden;
}
.cg-chart-axis {
  position: absolute;
  right: 4px;
  top: 2px;
  bottom: 2px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  font-family: var(--cg-font-mono, monospace);
  font-size: 10px;
  color: var(--cg-dim, #7d6c58);
  pointer-events: none;
}
</style>
