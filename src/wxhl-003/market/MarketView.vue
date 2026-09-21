<template>
  <div class="mkt-page">
    <div class="mkt-header">
      <button class="hdr-btn" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span class="hdr-title">自由市场</span>
      <span class="hdr-up">{{ store.playerUP }} UP</span>
      <button class="hdr-btn" :disabled="store.loading" @click="store.refresh()">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" :class="{ spinning: store.loading }">
          <polyline points="23 4 23 10 17 10" />
          <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
        </svg>
      </button>
    </div>

    <div class="mkt-tabs">
      <button v-for="t in TABS" :key="t.key" class="mkt-tab" :class="{ active: tab === t.key }" @click="tab = t.key">
        {{ t.label }}
      </button>
    </div>

    <div v-if="store.lastError" class="mkt-error">{{ store.lastError }}</div>

    <!-- ============ 逛市场 ============ -->
    <div v-if="tab === 'browse'" class="mkt-body">
      <div class="mkt-filters">
        <button
          v-for="f in FILTERS"
          :key="f.key"
          class="mkt-chip"
          :class="{ active: filter === f.key }"
          @click="filter = f.key"
        >
          {{ f.label }}
        </button>
      </div>
      <div v-if="filteredListings.length === 0" class="mkt-empty">
        {{ store.loading ? '市集加载中…' : '市集空空如也，去上架第一单吧' }}
      </div>
      <div v-for="l in filteredListings" :key="l.id" class="mkt-card">
        <div class="mc-head">
          <span class="mc-name" :style="{ color: qualityColor(l.item) }">{{ l.item.名称 }}</span>
          <span class="mc-price">{{ l.price }} UP</span>
        </div>
        <div class="mc-tags">
          <span v-if="l.kind === 'equip'" class="mc-tag">{{ l.item.品质 }}·{{ l.item.类型 }}·{{ l.item.阶位 || l.tier }}</span>
          <span v-else class="mc-tag goods">道具</span>
          <span class="mc-tag">×{{ l.qty }}</span>
        </div>
        <div v-if="l.item.描述" class="mc-desc">{{ l.item.描述 }}</div>
        <div class="mc-foot">
          <span class="mc-seller">{{ l.seller }} · {{ l.tier }} · {{ timeAgo(l.created) }}</span>
          <button v-if="l.client !== myClient" class="mc-buy" @click="confirmBuy = l">购买</button>
          <span v-else class="mc-own">我的挂单</span>
        </div>
      </div>
    </div>

    <!-- ============ 上架 ============ -->
    <div v-if="tab === 'sell'" class="mkt-body">
      <template v-if="!sellPick">
        <div class="mkt-hint">选择要上架的背包物品（装备价格由回廊校验，道具自由出价）</div>
        <div v-if="bagEntries.length === 0" class="mkt-empty">背包里没有可上架的物品</div>
        <div v-for="[name, item] in bagEntries" :key="name" class="mkt-card pick" @click="pickItem(name, item)">
          <div class="mc-head">
            <span class="mc-name" :style="{ color: qualityColor(item) }">{{ name }}</span>
            <span class="mc-tag">×{{ item.数量 }}</span>
          </div>
          <div class="mc-tags">
            <span v-if="isEquip({ ...item, 名称: name })" class="mc-tag">{{ item.品质 }}·{{ item.类型 }}·{{ item.阶位 || store.playerTier }}</span>
            <span v-else class="mc-tag goods">道具·自由出价</span>
          </div>
        </div>
      </template>
      <template v-else>
        <div class="mkt-card">
          <div class="mc-head">
            <span class="mc-name" :style="{ color: qualityColor(sellPick.item) }">{{ sellPick.name }}</span>
            <button class="mc-repick" @click="sellPick = null">重选</button>
          </div>
          <div class="mc-tags">
            <span v-if="sellKind === 'equip'" class="mc-tag">
              {{ sellPick.item.品质 }}·{{ sellPick.item.类型 }}·{{ sellPick.item.阶位 || store.playerTier }}（装备校验）
            </span>
            <span v-else class="mc-tag goods">道具·自由出价</span>
            <span class="mc-tag">持有 ×{{ sellPick.item.数量 }}</span>
          </div>
          <div class="sell-form">
            <label class="sf-row">
              <span>数量</span>
              <input v-model.number="sellQty" type="number" min="1" :max="sellPick.item.数量" />
            </label>
            <label class="sf-row">
              <span>单价 UP</span>
              <input v-model.number="sellPrice" type="number" min="0" max="9999999" />
            </label>
            <div v-if="sellKind === 'equip' && priceHint" class="sf-hint" :class="{ bad: !priceHint.ok }">
              {{ priceHint.ok ? `合法区间 ${priceHint.min} ~ ${priceHint.max} UP` : priceHint.reason }}
            </div>
            <div v-if="sellKind === 'goods'" class="sf-hint">道具自由出价，回廊不做价格校验</div>
            <button class="mc-buy big" :disabled="!canSell || store.loading" @click="doSell">
              {{ store.loading ? '上架中…' : '确认上架' }}
            </button>
          </div>
        </div>
      </template>
    </div>

    <!-- ============ 我的 ============ -->
    <div v-if="tab === 'mine'" class="mkt-body">
      <div class="mkt-card proceeds">
        <div class="mc-head">
          <span class="mc-name">待领货款</span>
          <span class="mc-price">{{ store.pending }} UP</span>
        </div>
        <button class="mc-buy big" :disabled="store.pending <= 0 || store.loading" @click="store.collect()">
          领取全部货款
        </button>
      </div>
      <div class="mkt-hint">我的在售挂单</div>
      <div v-if="store.myListings.length === 0" class="mkt-empty">没有在售挂单</div>
      <div v-for="l in store.myListings" :key="l.id" class="mkt-card">
        <div class="mc-head">
          <span class="mc-name" :style="{ color: qualityColor(l.item) }">{{ l.item.名称 }}</span>
          <span class="mc-price">{{ l.price }} UP</span>
        </div>
        <div class="mc-foot">
          <span class="mc-seller">×{{ l.qty }} · {{ timeAgo(l.created) }}</span>
          <button class="mc-cancel" @click="store.cancel(l)">下架取回</button>
        </div>
      </div>
    </div>

    <!-- ============ 购买确认 ============ -->
    <div v-if="confirmBuy" class="mkt-mask" @click.self="confirmBuy = null">
      <div class="mkt-dialog">
        <div class="md-title">确认购买</div>
        <div class="md-line">
          「{{ confirmBuy.item.名称 }}」×{{ confirmBuy.qty }}，单价 <b>{{ confirmBuy.price }} UP</b>
        </div>
        <div class="md-line dim">卖家：{{ confirmBuy.seller }} · 支付后当前持有 {{ store.playerUP }} → {{ store.playerUP - confirmBuy.price }} UP</div>
        <div class="md-actions">
          <button class="mc-cancel" @click="confirmBuy = null">再想想</button>
          <button class="mc-buy" :disabled="store.loading" @click="doBuy">确认支付</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue';
import { getClientId, type Listing } from './api';
import { checkPrice, isEquip, type MarketItemSnapshot, type PriceCheck } from './priceTable';
import type { Bag } from './settle';
import { useMarketStore } from './store';

const emit = defineEmits<{ close: [] }>();
const store = useMarketStore();

const TABS = [
  { key: 'browse', label: '逛市场' },
  { key: 'sell', label: '上架' },
  { key: 'mine', label: '我的' },
] as const;
const tab = ref<(typeof TABS)[number]['key']>('browse');

const myClient = getClientId();

// ============ 逛市场 ============
const FILTERS = [
  { key: 'all', label: '全部' },
  { key: '蓝色', label: '蓝' },
  { key: '金色', label: '金' },
  { key: '紫色', label: '紫' },
  { key: 'goods', label: '道具' },
] as const;
const filter = ref<(typeof FILTERS)[number]['key']>('all');

const filteredListings = computed(() => {
  if (filter.value === 'all') return store.listings;
  if (filter.value === 'goods') return store.listings.filter(l => l.kind === 'goods');
  return store.listings.filter(l => l.kind === 'equip' && l.item.品质 === filter.value);
});

const confirmBuy = ref<Listing | null>(null);

async function doBuy() {
  if (!confirmBuy.value) return;
  const ok = await store.buy(confirmBuy.value);
  if (ok) confirmBuy.value = null;
}

// ============ 上架 ============
const sellPick = ref<{ name: string; item: MarketItemSnapshot & { 数量: number } } | null>(null);
const sellQty = ref(1);
const sellPrice = ref(0);

const bagEntries = computed(() =>
  Object.entries(store.playerBag as Bag).filter(([, item]) => Number(item.数量) > 0),
);

function pickItem(name: string, item: MarketItemSnapshot & { 数量: number }) {
  sellPick.value = { name, item };
  sellQty.value = 1;
  sellPrice.value = 0;
}

const sellKind = computed<'equip' | 'goods'>(() =>
  sellPick.value && isEquip({ ...sellPick.value.item, 名称: sellPick.value.name }) ? 'equip' : 'goods',
);

const priceHint = computed<PriceCheck | null>(() => {
  if (!sellPick.value || sellKind.value !== 'equip') return null;
  return checkPrice('equip', { ...sellPick.value.item, 名称: sellPick.value.name, 数量: sellQty.value }, store.playerTier, sellPrice.value);
});

const canSell = computed(() => {
  if (!sellPick.value) return false;
  if (!Number.isInteger(sellQty.value) || sellQty.value < 1 || sellQty.value > sellPick.value.item.数量) return false;
  if (!Number.isFinite(sellPrice.value) || sellPrice.value < 0) return false;
  if (sellKind.value === 'equip') return priceHint.value?.ok === true;
  return sellQty.value <= 99;
});

async function doSell() {
  if (!sellPick.value || !canSell.value) return;
  const ok = await store.sell(sellPick.value.name, sellPick.value.item, sellKind.value, sellQty.value, sellPrice.value);
  if (ok) sellPick.value = null;
}

// ============ 展示辅助 ============
function qualityColor(item: MarketItemSnapshot): string {
  switch (item.品质) {
    case '蓝色':
      return '#4a9eff';
    case '金色':
      return '#d4a017';
    case '紫色':
      return '#a55eea';
    case '银色':
      return '#c0c8d8';
    default:
      return 'var(--chalk-d, #9c8f80)';
  }
}

function timeAgo(created: number): string {
  const s = Math.max(0, Math.floor((Date.now() - created) / 1000));
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)}分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)}小时前`;
  return `${Math.floor(s / 86400)}天前`;
}

onMounted(() => store.refresh());

// 跨 app 联动：工坊「上架市场」跳转时预选物品（背包未同步好则等下次变化再试）
watch(
  () => [store.pendingSell, store.playerBag] as const,
  () => {
    const name = store.pendingSell;
    if (!name) return;
    const item = (store.playerBag as Bag)[name];
    if (!item || Number(item.数量) <= 0) return;
    tab.value = 'sell';
    pickItem(name, item);
    store.pendingSell = '';
  },
  { immediate: true },
);
</script>

<style lang="scss" scoped>
.spinning {
  animation: mkt-spin 1s linear infinite;
}
@keyframes mkt-spin {
  to {
    transform: rotate(360deg);
  }
}

.mkt-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: linear-gradient(180deg, #1a1410, #100c09);
}
.mkt-header {
  display: flex;
  align-items: center;
  padding: 0 12px;
  height: 44px;
  flex-shrink: 0;
  background: rgba(30, 20, 14, 0.95);
  border-bottom: 1px solid rgba(80, 40, 20, 0.35);
}
.hdr-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--amber-d, #b08a4f);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  &:disabled {
    opacity: 0.5;
  }
  svg {
    width: 20px;
    height: 20px;
  }
}
.hdr-title {
  flex: 1;
  font-size: 14px;
  color: var(--chalk, #d8cdbd);
  letter-spacing: 2px;
  margin-left: 4px;
}
.hdr-up {
  font-size: 11px;
  color: var(--amber-d, #b08a4f);
  margin-right: 6px;
  font-variant-numeric: tabular-nums;
}

.mkt-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 8px;
  flex-shrink: 0;
}
.mkt-tab {
  flex: 1;
  padding: 6px 0;
  border: 1px solid transparent;
  border-radius: 6px;
  background: transparent;
  color: var(--chalk-d, #9c8f80);
  font-size: 12px;
  cursor: pointer;
  &.active {
    color: var(--amber, #d8b36a);
    border-color: rgba(176, 138, 79, 0.45);
    background: rgba(176, 138, 79, 0.12);
  }
}

.mkt-error {
  margin: 4px 10px;
  padding: 6px 10px;
  font-size: 11px;
  color: #e0705c;
  background: rgba(224, 112, 92, 0.1);
  border: 1px solid rgba(224, 112, 92, 0.3);
  border-radius: 6px;
}

.mkt-body {
  flex: 1;
  overflow-y: auto;
  padding: 6px 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-height: 0;
}
.mkt-filters {
  display: flex;
  gap: 4px;
  flex-shrink: 0;
}
.mkt-chip {
  padding: 3px 10px;
  font-size: 11px;
  border-radius: 10px;
  border: 1px solid rgba(176, 138, 79, 0.3);
  background: transparent;
  color: var(--chalk-d, #9c8f80);
  cursor: pointer;
  &.active {
    color: var(--amber, #d8b36a);
    background: rgba(176, 138, 79, 0.15);
  }
}
.mkt-hint {
  font-size: 11px;
  color: var(--chalk-d, #9c8f80);
  opacity: 0.8;
}
.mkt-empty {
  padding: 30px 0;
  text-align: center;
  font-size: 12px;
  color: var(--chalk-d, #9c8f80);
  opacity: 0.6;
}

.mkt-card {
  border: 1px solid rgba(80, 40, 20, 0.4);
  border-radius: 8px;
  background: rgba(40, 26, 18, 0.55);
  padding: 8px 10px;
  display: flex;
  flex-direction: column;
  gap: 5px;
  &.pick {
    cursor: pointer;
    &:hover {
      border-color: rgba(176, 138, 79, 0.5);
    }
  }
  &.proceeds {
    border-color: rgba(176, 138, 79, 0.4);
  }
}
.mc-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mc-name {
  font-size: 13px;
  font-weight: 600;
}
.mc-price {
  font-size: 13px;
  color: var(--amber, #d8b36a);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.mc-tags {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.mc-tag {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  background: rgba(176, 138, 79, 0.12);
  color: var(--chalk-d, #9c8f80);
  &.goods {
    background: rgba(90, 140, 100, 0.15);
    color: #7fb08a;
  }
}
.mc-desc {
  font-size: 11px;
  color: var(--chalk-d, #9c8f80);
  opacity: 0.85;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.mc-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.mc-seller {
  font-size: 10px;
  color: var(--chalk-d, #9c8f80);
  opacity: 0.7;
}
.mc-own {
  font-size: 10px;
  color: var(--amber-d, #b08a4f);
}
.mc-buy {
  padding: 4px 14px;
  font-size: 11px;
  border: none;
  border-radius: 6px;
  background: rgba(176, 138, 79, 0.85);
  color: #181008;
  cursor: pointer;
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
  &.big {
    padding: 7px 0;
    width: 100%;
    font-size: 12px;
  }
}
.mc-cancel {
  padding: 4px 12px;
  font-size: 11px;
  border-radius: 6px;
  border: 1px solid rgba(224, 112, 92, 0.5);
  background: transparent;
  color: #e0705c;
  cursor: pointer;
}
.mc-repick {
  border: none;
  background: transparent;
  color: var(--amber-d, #b08a4f);
  font-size: 11px;
  cursor: pointer;
}

.sell-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 4px;
}
.sf-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: var(--chalk-d, #9c8f80);
  span {
    width: 56px;
    flex-shrink: 0;
  }
  input {
    flex: 1;
    min-width: 0;
    padding: 5px 8px;
    font-size: 13px;
    border-radius: 6px;
    border: 1px solid rgba(80, 40, 20, 0.5);
    background: rgba(16, 12, 9, 0.8);
    color: var(--chalk, #d8cdbd);
    outline: none;
    &:focus {
      border-color: rgba(176, 138, 79, 0.6);
    }
  }
}
.sf-hint {
  font-size: 11px;
  color: #7fb08a;
  &.bad {
    color: #e0705c;
  }
}

.mkt-mask {
  position: absolute;
  inset: 0;
  z-index: 20;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}
.mkt-dialog {
  width: 100%;
  max-width: 300px;
  border-radius: 10px;
  border: 1px solid rgba(176, 138, 79, 0.4);
  background: #1e150e;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.md-title {
  font-size: 14px;
  color: var(--amber, #d8b36a);
  letter-spacing: 2px;
}
.md-line {
  font-size: 12px;
  color: var(--chalk, #d8cdbd);
  &.dim {
    color: var(--chalk-d, #9c8f80);
    font-size: 11px;
  }
}
.md-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}
</style>
