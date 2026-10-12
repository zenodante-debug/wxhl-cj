<!-- 回廊交易所 · 右下：持仓（含距强平距离，强平不再莫名其妙） -->
<script setup lang="ts">
import { useExchangeStore } from '../store';
import { liquidationPrice, positionPnl } from '../engine/trading';

const store = useExchangeStore();
const acct = computed(() => store.acct);
const rows = computed(() =>
  Object.entries(acct.value.positions).map(([code, p]) => {
    const price = acct.value.prices[code];
    const liq = liquidationPrice(p);
    const pnl = positionPnl(p, price);
    // 距强平：现价距离强平价的百分比（1 倍杠杆无强平线）
    const dist = Number.isFinite(liq) && liq > 0 ? Math.abs((price - liq) / price) * 100 : null;
    return { code, ...p, price, liq, pnl, dist };
  }),
);
const closest = computed(() => {
  const withDist = rows.value.filter(r => r.dist !== null);
  if (!withDist.length) return null;
  return withDist.reduce((a, b) => (a.dist! <= b.dist! ? a : b)).code;
});

function doClose(code: string) {
  try {
    const r = store.closeOrder(code);
    toastr.success(`平仓 ${code}：盈亏 ${r.pnl >= 0 ? '+' : ''}${r.pnl}`);
  } catch (e: any) {
    toastr.error(e?.message ?? '平仓失败');
  }
}
</script>

<template>
  <div class="cg-card">
    <div class="cg-card-title">持仓<span class="cg-count">{{ rows.length }} 笔</span></div>
    <div v-if="!rows.length" class="cg-empty">空仓</div>
    <div v-for="r in rows" :key="r.code" class="cg-pos" :class="{ danger: r.code === closest }">
      <div class="cg-pos-head">
        <span class="mono">{{ r.code }}</span>
        <span :class="r.side === 'long' ? 'side-long' : 'side-short'">{{ r.side === 'long' ? '多' : '空' }}</span>
        <span class="mono dim">×{{ r.leverage }}</span>
        <span class="mono pnl" :class="r.pnl >= 0 ? 'up' : 'down'">{{ r.pnl > 0 ? '+' : '' }}{{ r.pnl }}</span>
      </div>
      <div class="cg-pos-sub">
        <span class="mono dim">{{ r.qty }} 股 @{{ r.entryPrice }}</span>
        <span v-if="r.dist !== null">
          距强平
          <b class="mono" :class="r.dist < 5 ? 'down' : 'dim'">{{ r.dist.toFixed(1) }}%</b>
          <span class="dim mono">（{{ r.liq }}）</span>
        </span>
        <span v-else class="dim">1 倍无强平</span>
      </div>
      <button class="cg-close-pos" @click="doClose(r.code)">平仓</button>
    </div>
  </div>
</template>
