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

<style scoped>
/* ———— 状态栏同款暖色板（照抄 src/wxhl-003/statusbar/theme.scss）———— */
.cg-overlay {
  --cg-void: #080504;
  --cg-bg: #120b07;
  --cg-panel: #241812;
  --cg-panel-2: #2e1e14;
  --cg-sub: #1a100a;
  --cg-border: #4a3226;
  --cg-border-soft: #33221a;
  --cg-hover: #3a2418;
  --cg-amber: #e8c078;
  --cg-amber-dim: #c8a060;
  --cg-gold: #d0a850;
  --cg-ember: #d8914a;
  --cg-chalk: #e8dfd2;
  --cg-chalk-dim: #b3a390;
  --cg-dim: #7d6c58;
  --cg-up: #6ac08a;
  --cg-down: #d05040;
  --cg-font-display: 'Noto Serif SC', 'SimSun', serif;
  --cg-font-body: 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif;
  --cg-font-mono: 'JetBrains Mono', 'Courier New', monospace;

  position: fixed;
  inset: 0;
  z-index: 2147483640;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  padding: env(safe-area-inset-top, 0) env(safe-area-inset-right, 0) env(safe-area-inset-bottom, 0)
    env(safe-area-inset-left, 0);
  pointer-events: auto;
  font-family: var(--cg-font-body);
  color: var(--cg-chalk);
}
.cg-panel {
  width: min(980px, 94vw);
  height: min(92dvh, 920px);
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px;
  box-sizing: border-box;
  background: var(--cg-void);
  border: 1px solid var(--cg-border);
  border-radius: 18px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.6);
}

/* ———— 控件基线：修"白底白字"（浏览器默认控件样式在这种深色面板上必然串色）———— */
.cg-panel input,
.cg-panel button,
.cg-panel select {
  background: var(--cg-panel);
  color: var(--cg-chalk);
  border: 1px solid var(--cg-border);
  border-radius: 6px;
  padding: 4px 8px;
  font: inherit;
  font-family: var(--cg-font-body);
}
.cg-panel input::placeholder {
  color: var(--cg-dim);
}
.cg-panel button {
  cursor: pointer;
}
.cg-panel button:hover:not(:disabled) {
  background: var(--cg-hover);
}
.cg-panel button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}
.cg-panel input[type='range'] {
  padding: 0;
  border: none;
  background: transparent;
  accent-color: var(--cg-amber);
}

/* ———— 顶栏 ———— */
.cg-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--cg-border-soft);
}
.cg-title {
  font-family: var(--cg-font-display);
  font-size: 16px;
  letter-spacing: 2px;
  color: var(--cg-amber);
}
.cg-head-sub {
  font-size: 11px;
  color: var(--cg-dim);
}
.cg-head-btn {
  margin-left: auto;
  font-size: 12px;
  padding: 3px 10px;
}
.cg-head-btn + .cg-head-btn {
  margin-left: 0;
}
.cg-x {
  color: var(--cg-chalk-dim);
}

.cg-news {
  padding: 4px 8px;
  border-radius: 6px;
  background: var(--cg-sub);
  border-left: 3px solid var(--cg-gold);
  font-size: 12px;
  line-height: 1.5;
}
.cg-news.good {
  border-left-color: var(--cg-up);
}
.cg-news.bad {
  border-left-color: var(--cg-down);
}
.cg-news.muted {
  color: var(--cg-dim);
  border-left-color: var(--cg-border);
}
.cg-news-tag {
  color: var(--cg-amber-dim);
  margin-right: 4px;
}

/* ———— 三栏 ———— */
.cg-grid {
  flex: 1;
  display: grid;
  grid-template-columns: 210px minmax(280px, 1fr) 270px;
  gap: 8px;
  min-height: 0;
}
.cg-list,
.cg-center,
.cg-right {
  min-height: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cg-list,
.cg-center {
  background: var(--cg-bg);
  border: 1px solid var(--cg-border-soft);
  border-radius: 8px;
  padding: 8px;
}
.cg-list {
  overflow-y: auto;
}
.cg-right {
  overflow-y: auto;
}
.cg-list-head,
.cg-card-title,
.cg-log-head {
  font-family: var(--cg-font-display);
  font-size: 12px;
  letter-spacing: 2px;
  color: var(--cg-amber-dim);
  margin-bottom: 4px;
}

/* ———— 股票行 ———— */
.cg-row {
  padding: 5px 6px;
  border-radius: 6px;
  cursor: pointer;
  border: 1px solid transparent;
}
.cg-row:hover {
  background: var(--cg-hover);
}
.cg-row.on {
  background: var(--cg-panel);
  border-color: var(--cg-border);
}
.cg-row-top,
.cg-row-bot {
  display: flex;
  align-items: center;
  gap: 6px;
}
.cg-row-name {
  flex: 1;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cg-row-price,
.cg-row-bot {
  font-size: 11px;
}
.cg-row-bot .dim {
  width: 34px;
}
.cg-row-bot span:last-child {
  margin-left: auto;
}

/* ———— 详情 ———— */
.cg-center {
  overflow-y: auto;
}
.cg-detail-head {
  display: flex;
  align-items: baseline;
  gap: 8px;
}
.cg-detail-name {
  font-family: var(--cg-font-display);
  font-size: 15px;
  color: var(--cg-chalk);
}
.cg-detail-price {
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}
.big {
  font-size: 22px;
}
.cg-trade {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}
.cg-field {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--cg-chalk-dim);
}
.cg-field input[type='number'] {
  width: 72px;
}
.cg-field-wide {
  flex: 1;
}
.cg-field-wide input[type='range'] {
  flex: 1;
}
.cg-fee {
  font-size: 11px;
  line-height: 1.6;
  color: var(--cg-chalk-dim);
  background: var(--cg-sub);
  border-radius: 6px;
  padding: 5px 7px;
}
.cg-actions {
  display: flex;
  gap: 8px;
}
.cg-actions button {
  flex: 1;
  padding: 8px;
  font-size: 13px;
  letter-spacing: 1px;
  border: none;
}
.cg-buy {
  background: #2c5c3f;
  color: #eafff1;
}
.cg-buy:hover:not(:disabled) {
  background: #356f4c !important;
}
.cg-sell {
  background: #6b2a24;
  color: #ffeceb;
}
.cg-sell:hover:not(:disabled) {
  background: #7d322b !important;
}
.cg-hint {
  font-size: 11px;
  color: var(--cg-dim);
}

/* ———— 右栏卡片 ———— */
.cg-card {
  background: var(--cg-bg);
  border: 1px solid var(--cg-border-soft);
  border-radius: 8px;
  padding: 8px;
}
.cg-count {
  margin-left: 6px;
  color: var(--cg-dim);
  letter-spacing: 0;
}
.cg-kv {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  line-height: 1.9;
}
.cg-kv .k {
  color: var(--cg-chalk-dim);
}
.mono {
  font-family: var(--cg-font-mono);
}
.dim {
  color: var(--cg-dim);
}
.up {
  color: var(--cg-up);
}
.down {
  color: var(--cg-down);
}
.cg-bar {
  height: 3px;
  background: var(--cg-sub);
  border-radius: 2px;
  overflow: hidden;
  margin: 4px 0 6px;
}
.cg-bar i {
  display: block;
  height: 100%;
  background: var(--cg-ember);
}
.cg-debt {
  background: #2a1210;
  border: 1px solid #6b2a24;
  border-radius: 6px;
  padding: 6px;
  font-size: 12px;
  margin-bottom: 6px;
}
.cg-sub-title {
  font-size: 11px;
  color: var(--cg-dim);
  margin: 6px 0 3px;
}
.cg-presets {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 4px;
}
.cg-presets button {
  font-size: 11px;
  padding: 4px 2px;
}

/* ———— 持仓 ———— */
.cg-pos {
  border-top: 1px solid var(--cg-border-soft);
  padding: 5px 0;
  position: relative;
}
.cg-pos.danger {
  background: #2a1210;
  border-radius: 6px;
  padding: 5px 6px;
}
.cg-pos-head {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
}
.side-long {
  color: var(--cg-up);
}
.side-short {
  color: var(--cg-ember);
}
.cg-pos-head .pnl {
  margin-left: auto;
}
.cg-pos-sub {
  display: flex;
  gap: 8px;
  font-size: 11px;
  margin: 2px 0 4px;
}
.cg-close-pos {
  font-size: 11px;
  padding: 2px 10px;
}
.cg-empty {
  color: var(--cg-dim);
  font-size: 12px;
  padding: 8px 0;
  text-align: center;
}

/* ———— 日报 ———— */
.cg-log {
  height: 132px;
  background: var(--cg-bg);
  border: 1px solid var(--cg-border-soft);
  border-radius: 8px;
  padding: 6px 8px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.cg-log-body {
  flex: 1;
  overflow-y: auto;
  font-size: 11.5px;
  line-height: 1.7;
}
.cg-log-row {
  display: flex;
  gap: 6px;
  border-left: 2px solid var(--cg-border);
  padding-left: 6px;
}
.cg-log-row.news {
  border-left-color: var(--cg-gold);
}
.cg-log-row.trade {
  border-left-color: var(--cg-up);
}
.cg-log-row.system {
  border-left-color: var(--cg-ember);
}
.cg-log-tag {
  color: var(--cg-dim);
  flex: none;
}
.cg-log-text {
  flex: 1;
}

/* ———— 窄屏堆叠 + 手机端窗口尺寸 ————
   手机阈值与状态栏一致（mobile-compat.js:12-17）：粗指针 / 无 hover / 宽 ≤768。
   这里用 CSS 表达是因为 #wxhl-cg-root 已被 index.ts 的 updateSize() 设成
   visualViewport 尺寸，于是 overlay 100% == visualViewport，
   面板 100% + overlay padding 6px 即 "visualViewport − 12"，与状态栏手机端规则同值。 */
@media (max-width: 860px) {
  .cg-grid {
    grid-template-columns: 1fr;
    overflow-y: auto;
  }
  .cg-list {
    max-height: 180px;
  }
}
@media (pointer: coarse), (hover: none), (max-width: 768px) {
  .cg-overlay {
    padding: 6px;
  }
  .cg-panel {
    width: 100%;
    height: 100%;
    border-radius: 14px;
  }
}
</style>
