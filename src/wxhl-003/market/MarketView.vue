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
          v-for="f in CATEGORY_FILTERS"
          :key="f.key"
          class="mkt-chip"
          :class="{ active: catFilter === f.key }"
          @click="catFilter = f.key"
        >
          {{ f.label }}
        </button>
      </div>
      <div class="mkt-filters">
        <button
          v-for="f in TIER_FILTERS"
          :key="f.key"
          class="mkt-chip"
          :class="{ active: tierFilter === f.key }"
          @click="tierFilter = f.key"
        >
          {{ f.label }}
        </button>
      </div>
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
        {{ store.loading ? '市集加载中…' : '没有符合条件的挂单' }}
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
          <button
            v-if="l.client !== myClient"
            class="mc-buy"
            :disabled="store.purchasing"
            @click="confirmBuy = l"
          >
            购买
          </button>
          <span v-else class="mc-own">我的挂单</span>
        </div>
      </div>
    </div>

    <!-- ============ 上架（多选批量） ============ -->
    <div v-if="tab === 'sell'" class="mkt-body">
      <div class="mkt-hint">
        勾选要上架的物品（可多选，多件只审核一次）→ 逐件填价 → 一次提交。
        装备按品质与阶位定价并做规则校验，道具按阶位定价；全部经回廊 AI 审核，需在终端设置中配置 API。
      </div>
      <div class="mkt-hint dim">
        分错类了？点物品上的「装备/道具」标签可手动改判定口径（只影响 AI 审核与价格提示；服务器仍按物品字段定价，带装备字段的物品躲不过装备价格上限）。
      </div>
      <div v-if="bagEntries.length === 0" class="mkt-empty">背包里没有可上架的物品</div>

      <div v-for="entry in bagTagged" :key="entry.name" class="mkt-card pick">
        <div class="mc-head">
          <label class="mc-pick">
            <input type="checkbox" :checked="!!sellSel[entry.name]" @change="toggleSel(entry.name, entry.item)" />
            <span class="mc-name" :style="{ color: qualityColor(entry.item) }">{{ entry.name }}</span>
          </label>
          <span class="mc-tag">×{{ entry.item.数量 }}</span>
        </div>
        <div class="mc-tags">
          <button class="mc-kind" :class="{ equip: kindOf(entry.name) === 'equip' }" @click="cycleKind(entry.name, entry.item)">
            {{ kindOf(entry.name) === 'equip' ? '装备' : '道具' }}
          </button>
          <span class="mc-tag">{{ entry.tag || '道具' }}·{{ entry.item.阶位 || store.playerTier }}</span>
        </div>

        <!-- 选中的物品：逐件填数量与单价 -->
        <div v-if="sellSel[entry.name]" class="sell-form">
          <label class="sf-row">
            <span>数量</span>
            <input v-model.number="sellSel[entry.name].qty" type="number" min="1" :max="entry.item.数量" />
          </label>
          <label class="sf-row">
            <span>单价 UP</span>
            <input v-model.number="sellSel[entry.name].price" type="number" min="0" max="9999999" />
          </label>
          <div v-if="entry.kindCheck" class="sf-check">
            <div v-for="e in entry.kindCheck.errors" :key="e" class="sf-err">✕ {{ e }}</div>
            <div v-for="w in entry.kindCheck.warnings" :key="w" class="sf-warn">⚠ {{ w }}</div>
          </div>
          <div v-if="entry.priceHint" class="sf-hint" :class="{ bad: !entry.priceHint.ok }">
            {{ entry.priceHint.ok ? `合法区间 ${entry.priceHint.min} ~ ${entry.priceHint.max} UP` : entry.priceHint.reason }}
          </div>
        </div>
      </div>

      <!-- 批量提交栏 -->
      <div v-if="selCount > 0" class="mkt-submit">
        <button class="mc-buy big" :disabled="sellableCount === 0 || store.loading || store.reviewing || store.listing" @click="doSellAll">
          {{ store.reviewing ? 'AI 审核中…' : store.listing ? '上架中…' : `确认上架 ${sellableCount} / ${selCount} 件（一次审核）` }}
        </button>
      </div>
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
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { getClientId, type Listing } from './api';
import {
  categoryOf,
  checkPrice,
  classify,
  hasEquipMarkers,
  parseQuality,
  tierIndexOfItem,
  type MarketItemSnapshot,
  type PriceCheck,
} from './priceTable';
import { validateEquip } from './equipRules';
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
  { key: 'all', label: '全部品质' },
  { key: '蓝色', label: '蓝' },
  { key: '金色', label: '金' },
  { key: '紫色', label: '紫' },
] as const;
const filter = ref<(typeof FILTERS)[number]['key']>('all');

const CATEGORY_FILTERS = [
  { key: 'all', label: '全部类型' },
  { key: '武器', label: '武器' },
  { key: '防具', label: '防具' },
  { key: '饰品', label: '饰品' },
  { key: '道具', label: '道具' },
] as const;
const catFilter = ref<(typeof CATEGORY_FILTERS)[number]['key']>('all');

const TIER_FILTERS = [
  { key: 'all', label: '全部阶位' },
  { key: '0', label: '一阶' },
  { key: '1', label: '二阶' },
  { key: '2', label: '三阶' },
  { key: '3', label: '四阶' },
  { key: '4', label: '五阶' },
] as const;
const tierFilter = ref<(typeof TIER_FILTERS)[number]['key']>('all');

const filteredListings = computed(() =>
  store.listings.filter(l => {
    // 类型筛选：装备按 武器/防具/饰品，其余归道具
    if (catFilter.value !== 'all' && categoryOf(l.item) !== catFilter.value) return false;
    // 阶位筛选：物品自身阶位优先，缺省按卖家阶位
    if (tierFilter.value !== 'all' && tierIndexOfItem(l.item, l.tier) !== Number(tierFilter.value)) return false;
    // 品质筛选：按解包后的原品质（灰色封印(紫色) 也算紫色）
    if (filter.value !== 'all' && parseQuality(l.item.品质)?.quality !== filter.value) return false;
    return true;
  }),
);

const confirmBuy = ref<Listing | null>(null);

async function doBuy() {
  if (!confirmBuy.value) return;
  const ok = await store.buy(confirmBuy.value);
  if (ok) confirmBuy.value = null;
}

// ============ 上架（多选批量） ============
export interface SellEntry {
  name: string;
  item: MarketItemSnapshot & { 数量: number };
  /** 数量/单价 输入缓冲（price 为空串表示未填） */
  qty: number;
  price: number | string;
}

/** 已勾选待上架的物品（名称 → 输入缓冲） */
const sellSel = reactive<Record<string, SellEntry>>({});
/** 卖家手动标注口径（只影响 AI 审核与价格提示；服务器仍按物品字段定价） */
const kindOverride = reactive<Record<string, 'equip' | 'goods'>>({});

const bagEntries = computed(() =>
  Object.entries(store.playerBag as Bag).filter(([, item]) => Number(item.数量) > 0),
);

/** 每件物品的自动判定（重量级价格提示/装备校验只在勾选后算） */
const bagRows = computed(() =>
  bagEntries.value.map(([name, item]) => {
    const auto = classify({ ...item, 名称: name });
    /** 自动判定为装备的物品仍可被玩家标成道具（纠正误判）；自动判定为道具则只能标成装备 */
    const kind: 'equip' | 'goods' = kindOverride[name] ?? (auto.kind === 'equip' ? 'equip' : 'goods');
    const 无法定价 =
      auto.kind === 'goods' &&
      hasEquipMarkers({ ...item, 名称: name }) &&
      !kindOverride[name]; // 未手动标注且带装备字段却定不了价 → 服务器会拒
    return { name, item, kind, auto, 无法定价 };
  }),
);

/** 勾选后的逐件价格提示与装备校验 */
const sellRows = computed(() =>
  bagRows.value
    .filter(r => sellSel[r.name])
    .map(r => {
      const sel = sellSel[r.name];
      const snap = { ...r.item, 名称: r.name, 数量: sel.qty };
      const priceNum = Number(sel.price);
      const priceValid = sel.price !== '' && Number.isFinite(priceNum) && priceNum >= 0;
      const equipCheck =
        r.kind === 'equip'
          ? validateEquip(
              snap,
              r.auto.kind === 'equip' ? r.auto : { quality: '蓝色', category: '武器', gray: false },
              tierIndexOfItem(r.item, store.playerTier) ?? 0,
            )
          : null;
      return {
        ...r,
        entry: sel,
        // 价格合法区间提示（按标注口径算）
        priceHint: priceValid ? checkPrice(r.kind, snap, store.playerTier, priceNum) : null,
        equipCheck,
        canSell:
          !r.无法定价 &&
          Number.isInteger(sel.qty) &&
          sel.qty >= 1 &&
          sel.qty <= r.item.数量 &&
          priceValid &&
          (!equipCheck || equipCheck.ok),
      };
    }),
);

/** 模板用：每件背包物品 + 勾选状态（放最后，避免引用未初始化的 sellRows） */
const bagTagged = computed(() =>
  bagRows.value.map(r => ({ ...r, sel: sellSel[r.name] ?? null })),
);

const selCount = computed(() => sellRows.value.length);
const sellableCount = computed(() => sellRows.value.filter(r => r.canSell).length);

function toggleSel(name: string, item: MarketItemSnapshot & { 数量: number }) {
  if (sellSel[name]) delete sellSel[name];
  else sellSel[name] = { name, item, qty: 1, price: '' };
}

/** 切换装备/道具标注口径 */
function cycleKind(name: string, item: MarketItemSnapshot) {
  const auto = classify({ ...item, 名称: name });
  const cur = kindOverride[name] ?? (auto.kind === 'equip' ? 'equip' : 'goods');
  const next = cur === 'equip' ? 'goods' : 'equip';
  // 自动判定为道具的物品，标成"装备"才有意义；标回自动值则清除覆盖
  if (next === (auto.kind === 'equip' ? 'equip' : 'goods')) delete kindOverride[name];
  else kindOverride[name] = next;
}

function kindOf(name: string): 'equip' | 'goods' {
  return kindOverride[name] ?? bagRows.value.find(r => r.name === name)?.kind ?? 'goods';
}

/** 批量提交：一次 AI 审核覆盖全部勾选物品 */
async function doSellAll() {
  const entries = sellRows.value
    .filter(r => r.canSell)
    .map(r => ({
      name: r.name,
      snapshot: r.item as MarketItemSnapshot,
      kind: r.kind,
      qty: Number(r.entry.qty),
      price: Number(r.entry.price),
    }));
  if (entries.length === 0) return;
  const ok = await store.sellBatch(entries);
  if (ok) {
    for (const e of entries) delete sellSel[e.name];
  }
}

// ============ 展示辅助 ============
/** 背包物品的装备标签（「蓝色·防具」，道具返回空串） */
function equipTag(name: string, item: MarketItemSnapshot): string {
  const c = classify({ ...item, 名称: name });
  if (c.kind !== 'equip') return '';
  const q = c.gray ? `灰色封印(${c.quality})` : c.quality;
  return `${q}·${c.category}`;
}

/** 背包物品列表（一次性算好装备标签，避免模板每个卡片重复 classify） */
const bagTagged = computed(() =>
  bagEntries.value.map(([name, item]) => ({ name, item, tag: equipTag(name, item) })),
);

function qualityColor(item: MarketItemSnapshot): string {
  // 按解包后的原品质上色（灰色封印(紫色) → 紫色）
  switch (parseQuality(item.品质)?.quality) {
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
    if (!sellSel[name]) sellSel[name] = { name, item, qty: 1, price: '' };
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
/* 勾选框 + 物品名 */
.mc-pick {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  min-width: 0;
  input[type='checkbox'] {
    accent-color: #b08a4f;
    flex-shrink: 0;
  }
}
/* 装备/道具 标注切换 */
.mc-kind {
  font-size: 10px;
  padding: 1px 6px;
  border-radius: 4px;
  border: 1px solid rgba(122, 176, 138, 0.45);
  background: rgba(90, 140, 100, 0.15);
  color: #7fb08a;
  cursor: pointer;
  &.equip {
    border-color: rgba(176, 138, 79, 0.5);
    background: rgba(176, 138, 79, 0.15);
    color: var(--amber, #d8b36a);
  }
}
/* 批量提交栏 */
.mkt-submit {
  position: sticky;
  bottom: 0;
  padding-top: 6px;
  background: linear-gradient(180deg, transparent, #100c09 40%);
}
.mkt-hint.dim {
  opacity: 0.6;
  font-size: 10px;
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
.sf-check {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.25);
  font-size: 11px;
  line-height: 1.4;
  &.ok {
    color: #7fb08a;
  }
}
.sf-err {
  color: #e0705c;
}
.sf-warn {
  color: #d8b36a;
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
