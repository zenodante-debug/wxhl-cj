<!-- 回廊交易所 · 主面板：行情 / 持仓 / 资产 -->
<script setup lang="ts">
import { useExchangeStore } from '../store';
import { STOCKS } from '../engine/stocks';
import { netAssets, openPosition, closePosition, positionPnl } from '../engine/trading';
import SparkLine from './SparkLine.vue';

const store = useExchangeStore();
const acct = computed(() => store.acct);
const tab = ref<'market' | 'positions' | 'assets'>('market');
const detail = ref<string | null>(null);
const qty = ref(1);
const leverage = ref(1);

const net = computed(() => netAssets(acct.value));

function pct(code: string): number {
  const h = acct.value.priceHistory[code];
  if (!h || h.length < 2) return 0;
  return ((h[h.length - 1] - h[0]) / h[0]) * 100;
}

function buy(code: string, side: 'long' | 'short') {
  try {
    openPosition(acct.value, code, side, qty.value, leverage.value);
    store.persist();
    toastr.success(`已开${side === 'long' ? '多' : '空'} ${code} ×${qty.value}`);
  } catch (e: any) {
    toastr.error(e?.message ?? '开仓失败');
  }
}

function close(code: string) {
  try {
    const r = closePosition(acct.value, code);
    store.persist();
    toastr.success(`平仓 ${code}：盈亏 ${r.pnl >= 0 ? '+' : ''}${r.pnl}`);
  } catch (e: any) {
    toastr.error(e?.message ?? '平仓失败');
  }
}
</script>

<template>
  <div v-if="store.panelOpen" class="cg-panel">
    <div class="cg-head">
      <span class="cg-title">回廊交易所</span>
      <span class="cg-net">净资产 {{ net }}</span>
      <button class="cg-close" @click="store.close()">✕</button>
    </div>
    <div v-if="acct.news" class="cg-news">{{ acct.news.sentiment === 'good' ? '📈' : '📉' }} {{ acct.news.text }}</div>
    <div class="cg-tabs">
      <button :class="{ on: tab === 'market' }" @click="tab = 'market'">行情</button>
      <button :class="{ on: tab === 'positions' }" @click="tab = 'positions'">持仓</button>
      <button :class="{ on: tab === 'assets' }" @click="tab = 'assets'">资产</button>
    </div>

    <div v-if="tab === 'market' && !detail" class="cg-list">
      <div v-for="s in STOCKS" :key="s.code" class="cg-row" @click="detail = s.code">
        <div class="cg-row-name">{{ s.name }}<span class="cg-code">{{ s.code }}</span></div>
        <SparkLine :data="acct.priceHistory[s.code]" />
        <div class="cg-price">{{ acct.prices[s.code] }}</div>
        <div class="cg-pct" :class="pct(s.code) >= 0 ? 'up' : 'down'">{{ pct(s.code).toFixed(2) }}%</div>
      </div>
    </div>

    <div v-else-if="tab === 'market' && detail" class="cg-detail">
      <button @click="detail = null">← 返回</button>
      <h3>{{ detail }}</h3>
      <SparkLine :data="acct.priceHistory[detail]" :width="300" :height="120" />
      <div>现价 {{ acct.prices[detail] }}</div>
      <label>数量 <input v-model.number="qty" type="number" min="1" /></label>
      <label>杠杆 <input v-model.number="leverage" type="range" min="1" max="100" /> ×{{ leverage }}</label>
      <div class="cg-btns">
        <button class="buy" @click="buy(detail, 'long')">做多</button>
        <button class="sell" @click="buy(detail, 'short')">做空</button>
      </div>
    </div>

    <div v-else-if="tab === 'positions'" class="cg-list">
      <div v-if="!Object.keys(acct.positions).length" class="cg-empty">空仓</div>
      <div v-for="(p, code) in acct.positions" :key="code" class="cg-row">
        <div class="cg-row-name">{{ code }} {{ p.side === 'long' ? '多' : '空' }} ×{{ p.leverage }}</div>
        <div class="cg-pct" :class="positionPnl(p, acct.prices[code]) >= 0 ? 'up' : 'down'">
          {{ positionPnl(p, acct.prices[code]) }}
        </div>
        <button @click="close(code)">平仓</button>
      </div>
    </div>

    <div v-else class="cg-assets">
      <div>现金：{{ acct.cash }}</div>
      <div>净资产：{{ net }}</div>
      <div>累计亏损：{{ acct.cumulativeLoss }}（破产线 250）</div>
      <div v-if="acct.frozen" class="cg-frozen">⛔ 账户冻结中</div>
      <!-- Task 7 在此加 UP 兑换；Task 12 加借贷/破产；Task 14 加遗产税 -->
    </div>
  </div>
</template>

<style scoped>
.cg-panel {
  position: fixed;
  inset: 0;
  background: #0d0f14;
  color: #e6e6e6;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  font-size: 14px;
}
.cg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #262a33;
}
.cg-title {
  font-weight: 700;
}
.cg-net {
  margin-left: auto;
  opacity: 0.8;
}
.cg-close {
  background: none;
  border: none;
  color: #999;
  font-size: 16px;
}
.cg-news {
  padding: 6px 14px;
  background: #1a2030;
  font-size: 12px;
}
.cg-tabs {
  display: flex;
  gap: 4px;
  padding: 8px 14px;
}
.cg-tabs button {
  flex: 1;
  padding: 6px;
  background: #171b23;
  border: 1px solid #262a33;
  color: #ccc;
  border-radius: 6px;
}
.cg-tabs button.on {
  background: #24406e;
  color: #fff;
}
.cg-list {
  flex: 1;
  overflow-y: auto;
  padding: 0 14px;
}
.cg-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 0;
  border-bottom: 1px solid #1c2029;
}
.cg-row-name {
  flex: 1;
}
.cg-code {
  opacity: 0.5;
  margin-left: 6px;
  font-size: 11px;
}
.cg-pct.up {
  color: #e5484d;
}
.cg-pct.down {
  color: #30a46c;
}
.cg-detail,
.cg-assets {
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.cg-btns {
  display: flex;
  gap: 10px;
}
.cg-btns .buy {
  flex: 1;
  background: #e5484d;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 6px;
}
.cg-btns .sell {
  flex: 1;
  background: #30a46c;
  color: #fff;
  border: none;
  padding: 10px;
  border-radius: 6px;
}
.cg-empty {
  opacity: 0.5;
  text-align: center;
  padding: 30px;
}
.cg-frozen {
  color: #f7b955;
}
</style>
