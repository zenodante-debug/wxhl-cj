<!-- 回廊交易所 · 单页主面板：左行情 / 中详情 / 右上资产 / 右下持仓 / 下日报 -->
<script setup lang="ts">
import { useExchangeStore } from '../store';
import { STOCKS } from '../engine/stocks';
import { liquidationPrice, tradePreview } from '../engine/trading';
import type { ChartLine } from './chartGeometry';
import PriceChart from './PriceChart.vue';
import SparkLine from './SparkLine.vue';
import AssetPanel from './AssetPanel.vue';
import PositionsPanel from './PositionsPanel.vue';
import TradeLog from './TradeLog.vue';

const store = useExchangeStore();
const acct = computed(() => store.acct);

/** 当前查看的股票；未选中时用列表第一只 */
const pickedCode = ref<string>(STOCKS[0].code);
const detail = computed(() => STOCKS.find(s => s.code === pickedCode.value) ?? STOCKS[0]);
const price = computed(() => acct.value.prices[detail.value.code]);
const openPrice = computed(() => acct.value.openPrices[detail.value.code] ?? price.value);
/** 涨跌幅按"开盘基准价"算（开盘 = 本次脚本加载） */
const pct = computed(() => ((price.value - openPrice.value) / openPrice.value) * 100);

function pctOf(code: string): number {
  const open = acct.value.openPrices[code] ?? acct.value.prices[code];
  return ((acct.value.prices[code] - open) / open) * 100;
}

const position = computed(() => acct.value.positions[detail.value.code]);

/** 图上三条线：开盘基准 / 开仓价 / 强平价 */
const chartLines = computed<ChartLine[]>(() => {
  const lines: ChartLine[] = [{ value: openPrice.value, label: `开盘 ${openPrice.value}`, kind: 'base' }];
  const pos = position.value;
  if (pos) {
    lines.push({ value: pos.entryPrice, label: `成本 ${pos.entryPrice}`, kind: 'entry' });
    const liq = liquidationPrice(pos);
    if (Number.isFinite(liq) && liq > 0) lines.push({ value: liq, label: `强平 ${liq}`, kind: 'liq' });
  }
  return lines;
});

const qty = ref(10);
const leverage = ref(1);

/** 倒计时只做显示（1 秒刷新一次），不推进行情 */
const now = ref(Date.now());
let clock: ReturnType<typeof setInterval> | null = null;
onMounted(() => {
  clock = setInterval(() => (now.value = Date.now()), 1000);
});
onUnmounted(() => {
  if (clock) clearInterval(clock);
});
const secondsLeft = computed(() => Math.max(0, Math.ceil((store.nextTickAt - now.value) / 1000)));

/** 下单费用预览（做多/做空各一份），参数非法时为 null */
function previewOf(side: 'long' | 'short') {
  try {
    return tradePreview(acct.value, detail.value.code, side, qty.value, leverage.value);
  } catch {
    return null;
  }
}
const previewLong = computed(() => previewOf('long'));
const previewShort = computed(() => previewOf('short'));

function doOrder(side: 'long' | 'short') {
  try {
    const r = store.placeOrder(detail.value.code, side, qty.value, leverage.value);
    toastr.success(`开${side === 'long' ? '多' : '空'} ${detail.value.code} ×${qty.value}（保证金 ${r.margin}）`);
  } catch (e: any) {
    toastr.error(e?.message ?? '下单失败');
  }
}
</script>

<template>
  <div v-if="store.panelOpen" class="cg-overlay" @click.self="store.close()">
    <div class="cg-panel">
      <div class="cg-head">
        <span class="cg-title">回廊交易所</span>
        <span class="cg-head-sub mono">第 {{ acct.tick }} 跳 · 下次跳动 {{ secondsLeft }}s</span>
        <button class="cg-head-btn" @click="store.skipTick()">跳过</button>
        <button class="cg-head-btn cg-x" @click="store.close()">✕</button>
      </div>

      <div v-if="acct.news" class="cg-news" :class="acct.news.sentiment">
        <span class="cg-news-tag">{{ acct.news.sentiment === 'good' ? '利好' : '利空' }}</span>
        {{ acct.news.text }}
      </div>
      <div v-else class="cg-news muted">暂无新闻</div>

      <div class="cg-grid">
        <!-- 左：行情 -->
        <div class="cg-list">
          <div class="cg-list-head">行情</div>
          <div
            v-for="s in STOCKS"
            :key="s.code"
            class="cg-row"
            :class="{ on: s.code === pickedCode }"
            @click="pickedCode = s.code"
          >
            <div class="cg-row-top">
              <span class="cg-row-name">{{ s.name }}</span>
              <span class="mono cg-row-price">{{ acct.prices[s.code] }}</span>
            </div>
            <div class="cg-row-bot">
              <span class="mono dim">{{ s.code }}</span>
              <SparkLine :data="acct.priceHistory[s.code]" :width="70" :height="18" />
              <span class="mono" :class="pctOf(s.code) >= 0 ? 'up' : 'down'">
                {{ pctOf(s.code) >= 0 ? '+' : '' }}{{ pctOf(s.code).toFixed(2) }}%
              </span>
            </div>
          </div>
        </div>

        <!-- 中：股价详情 -->
        <div class="cg-center">
          <div class="cg-detail-head">
            <span class="cg-detail-name">{{ detail.name }}</span>
            <span class="mono dim">{{ detail.code }} · {{ detail.faction }}</span>
          </div>
          <div class="cg-detail-price">
            <span class="mono big" :class="pct >= 0 ? 'up' : 'down'">{{ price }}</span>
            <span class="mono" :class="pct >= 0 ? 'up' : 'down'">
              {{ pct >= 0 ? '+' : '' }}{{ pct.toFixed(2) }}%（开盘 {{ openPrice }}）
            </span>
          </div>
          <PriceChart :data="acct.priceHistory[detail.code]" :lines="chartLines" :width="360" :height="150" />

          <div class="cg-trade">
            <label class="cg-field">
              数量
              <input v-model.number="qty" type="number" min="1" step="1" />
            </label>
            <label class="cg-field cg-field-wide">
              杠杆
              <input v-model.number="leverage" type="range" min="1" max="100" />
              <b class="mono">×{{ leverage }}</b>
            </label>
          </div>

          <div class="cg-fee">
            <template v-if="previewLong">
              做多需 <b class="mono">{{ previewLong.total }}</b>（保证金 {{ previewLong.margin }} + 佣金
              {{ previewLong.fee }}）
            </template>
            <template v-else>数量/杠杆不合法</template>
            <br />
            <template v-if="previewShort">
              做空需 <b class="mono">{{ previewShort.total }}</b>（保证金 {{ previewShort.margin }} + 佣金
              {{ previewShort.fee }} + 印花税 {{ previewShort.stamp }}）
            </template>
          </div>

          <div class="cg-actions">
            <button class="cg-buy" :disabled="acct.frozen || !!position || !previewLong" @click="doOrder('long')">
              做多
            </button>
            <button class="cg-sell" :disabled="acct.frozen || !!position || !previewShort" @click="doOrder('short')">
              做空
            </button>
          </div>
          <div v-if="position" class="cg-hint">已持有 {{ detail.code }}，先平仓再反手</div>
          <div v-else-if="acct.frozen" class="cg-hint down">账户冻结中：先清偿欠款</div>
          <div v-else-if="!previewLong" class="cg-hint down">保证金不足 {{ 5 }} 或参数不合法</div>
        </div>

        <!-- 右：资产 + 持仓 -->
        <div class="cg-right">
          <AssetPanel />
          <PositionsPanel />
        </div>
      </div>

      <TradeLog />
    </div>
  </div>
</template>

<!-- 样式在 ui/panel.scss（全局导入，见 index.ts） -->
