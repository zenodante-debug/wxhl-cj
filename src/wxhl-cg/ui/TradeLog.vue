<!-- 回廊交易所 · 底部：交易所日报（最近 50 条，新闻 / 交易 / 系统倒序混排） -->
<script setup lang="ts">
import { useExchangeStore } from '../store';
import { visibleLogs } from '../engine/metrics';

const store = useExchangeStore();
const rows = computed(() => visibleLogs(store.acct));
const TAG: Record<string, string> = { news: '新闻', trade: '交易', system: '系统' };
</script>

<template>
  <div class="cg-log">
    <div class="cg-log-head">交易所日报<span class="dim">（最近 50 条）</span></div>
    <div class="cg-log-body">
      <div v-if="!rows.length" class="cg-empty">暂无记录</div>
      <div v-for="(l, i) in rows" :key="i" class="cg-log-row" :class="l.kind">
        <span class="mono dim">{{ l.time }}</span>
        <span class="cg-log-tag">{{ TAG[l.kind] }}</span>
        <span class="cg-log-text">{{ l.text }}</span>
      </div>
    </div>
  </div>
</template>
