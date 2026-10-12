<!-- 回廊交易所 · 列表里的迷你走势线（绿涨红跌，与主图一致） -->
<script setup lang="ts">
const props = defineProps<{ data: number[]; width?: number; height?: number }>();
const w = computed(() => props.width ?? 96);
const h = computed(() => props.height ?? 28);
const path = computed(() => {
  const d = props.data;
  if (d.length < 2) return '';
  const min = Math.min(...d);
  const max = Math.max(...d);
  const span = max - min || 1;
  return d
    .map(
      (v, i) =>
        `${i === 0 ? 'M' : 'L'}${((i / (d.length - 1)) * w.value).toFixed(1)},${(h.value - 2 - ((v - min) / span) * (h.value - 4)).toFixed(1)}`,
    )
    .join(' ');
});
/** 绿=盈利方向（末值 ≥ 首值），红=亏损方向 */
const up = computed(() => props.data.length >= 2 && props.data[props.data.length - 1] >= props.data[0]);
</script>

<template>
  <svg :width="w" :height="h" class="spark">
    <path :d="path" fill="none" :stroke="up ? 'var(--cg-up, #6ac08a)' : 'var(--cg-down, #d05040)'" stroke-width="1.5" />
  </svg>
</template>
