<!-- 回廊交易所 · 右下：持仓（一笔一行，同股可多笔/多空对冲；显示距强平） -->
<script setup lang="ts">
import { useExchangeStore } from '../store';
import { liquidationDistance, liquidationPrice, positionPnl } from '../engine/trading';

const store = useExchangeStore();
const acct = computed(() => store.acct);

const rows = computed(() =>
  acct.value.positions.map(p => {
    const price = acct.value.prices[p.code];
    return {
      ...p,
      price,
      liq: liquidationPrice(p),
      pnl: positionPnl(p, price),
      dist: liquidationDistance(p, price),
    };
  }),
);

/** 离强平最近的那一笔（整行高亮，让"快爆了"一眼可见） */
const closestId = computed(() => {
  const withDist = rows.value.filter(r => r.dist !== null);
  if (!withDist.length) return null;
  return withDist.reduce((a, b) => (a.dist! <= b.dist! ? a : b)).id;
});

function doClose(id: string, code: string) {
  try {
    const r = store.closeOrder(id);
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
    <div v-for="r in rows" :key="r.id" class="cg-pos" :class="{ danger: r.id === closestId }">
      <div class="cg-pos-head">
        <span class="mono">{{ r.code }}</span>
        <span :class="r.side === 'long' ? 'side-long' : 'side-short'">{{ r.side === 'long' ? '多' : '空' }}</span>
        <span class="mono dim">×{{ r.leverage }}</span>
        <span class="mono pnl" :class="r.pnl >= 0 ? 'up' : 'down'">{{ r.pnl > 0 ? '+' : '' }}{{ r.pnl }}</span>
      </div>
      <div class="cg-pos-sub">
        <span class="mono dim">{{ r.qty }} 股 @{{ r.entryPrice }} · 保证金 {{ r.margin }}</span>
      </div>
      <div class="cg-pos-sub">
        <span v-if="r.dist !== null">
          距强平
          <b class="mono" :class="r.dist < 5 ? 'down' : 'dim'">{{ r.dist.toFixed(1) }}%</b>
          <span class="dim mono">（{{ r.liq }}）</span>
        </span>
        <span v-else class="dim">1 倍无强平</span>
        <button class="cg-close-pos" @click="doClose(r.id, r.code)">平仓</button>
      </div>
    </div>
  </div>
</template>
