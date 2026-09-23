<template>
  <div class="mkt-page">
    <div class="mkt-header">
      <button class="hdr-btn" @click="emit('close')">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="15 18 9 12 15 6" />
        </svg>
      </button>
      <span class="hdr-title">自由市场</span>
      <span class="hdr-bal">{{ store.playerUP }} UP<template v-if="store.playerRP"> · {{ store.playerRP }} RP</template></span>
      <button class="hdr-btn bell" @click="openNotices">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
          <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </svg>
        <span v-if="store.unread" class="bell-badge">{{ store.unread }}</span>
      </button>
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
        <button v-for="f in CATEGORY_FILTERS" :key="f.key" class="mkt-chip" :class="{ active: catFilter === f.key }" @click="catFilter = f.key">
          {{ f.label }}
        </button>
      </div>
      <div class="mkt-filters">
        <button v-for="f in TIER_FILTERS" :key="f.key" class="mkt-chip" :class="{ active: tierFilter === f.key }" @click="tierFilter = f.key">
          {{ f.label }}
        </button>
      </div>
      <div class="mkt-filters">
        <button v-for="f in FILTERS" :key="f.key" class="mkt-chip" :class="{ active: filter === f.key }" @click="filter = f.key">
          {{ f.label }}
        </button>
      </div>
      <div v-if="filteredListings.length === 0" class="mkt-empty">
        {{ store.loading ? '市集加载中…' : '没有符合条件的挂单' }}
      </div>
      <div v-for="l in filteredListings" :key="l.id" class="mkt-card">
        <div class="mc-head" @click="detailOpen = l">
          <span class="mc-name" :style="{ color: qualityColor(l.item) }">{{ l.item.名称 }}</span>
          <span class="mc-price">{{ l.price * l.qty }} UP</span>
        </div>
        <div class="mc-tags" @click="detailOpen = l">
          <span v-if="l.kind === 'equip'" class="mc-tag">{{ qualityLabel(l.item) }}·{{ l.item.类型 }}·{{ l.item.阶位 || l.tier }}</span>
          <span v-else class="mc-tag goods">道具·{{ qualityLabel(l.item) }}·{{ l.item.阶位 || l.tier }}</span>
          <span class="mc-tag">×{{ l.qty }}</span>
          <span v-if="l.qty > 1" class="mc-tag">单价 {{ l.price }}</span>
          <span v-if="l.op" class="mc-tag op">超模·{{ l.op.tier }}</span>
        </div>
        <div v-if="l.item.描述" class="mc-desc" @click="detailOpen = l">{{ l.item.描述 }}</div>
        <div class="mc-foot">
          <span class="mc-seller">{{ l.seller }} · {{ l.tier }} · {{ timeAgo(l.created) }}</span>
          <button class="mc-detail" @click="detailOpen = l">详情</button>
          <button v-if="l.client !== myClient" class="mc-buy" :disabled="store.purchasing" @click="detailOpen = l">购买</button>
          <span v-else class="mc-own">我的挂单</span>
        </div>
      </div>
    </div>

    <!-- ============ 上架（多选批量） ============ -->
    <div v-if="tab === 'sell'" class="mkt-body">
      <div class="mkt-hint">
        勾选要上架的物品（可多选，多件只审核一次）→ 补全品质/阶位、填数量与单价 → 一次提交（先审核，再确认费用）。
      </div>
      <div class="mkt-hint dim">
        品质与阶位由你填写，回廊会审核是否与物品效果相符；效果超出所填阶位（超模）可上架，但需支付超模费。
        价格须在参考价的 50%~200% 之间。上架另收总价 20% 所得税，购买方付 10% 手续费。
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
          <span class="mc-tag">{{ entry.tag || '道具' }}</span>
        </div>

        <div v-if="sellSel[entry.name]" class="sell-form">
          <label class="sf-row">
            <span>品质</span>
            <select v-model="sellSel[entry.name].quality">
              <option v-for="q in QUALITY_OPTIONS" :key="q" :value="q">{{ q }}</option>
            </select>
          </label>
          <label class="sf-row">
            <span>阶位</span>
            <select v-model="sellSel[entry.name].tier">
              <option v-for="t in TIER_OPTIONS" :key="t" :value="t">{{ t }}</option>
            </select>
          </label>
          <label class="sf-row">
            <span>数量</span>
            <input v-model.number="sellSel[entry.name].qty" type="number" min="1" :max="entry.item.数量" />
          </label>
          <label class="sf-row">
            <span>单价 UP</span>
            <input v-model.number="sellSel[entry.name].price" type="number" min="0" max="9999999" />
          </label>
          <label class="sf-row col">
            <span>描述（可编辑补充，500 字内）</span>
            <textarea v-model="sellSel[entry.name].desc" rows="3" maxlength="500" placeholder="物品自带描述会预填在这里"></textarea>
          </label>
          <div v-if="sellSel[entry.name].price !== ''" class="sf-hint">
            总价：{{ Number(sellSel[entry.name].price) * Number(sellSel[entry.name].qty || 0) }} UP（单价 × 数量）
            ｜ 所得税(20%)：{{ Math.ceil(Number(sellSel[entry.name].price) * Number(sellSel[entry.name].qty || 0) * 0.2) }} UP
          </div>
          <template v-if="selectedRow(entry.name)?.equipCheck">
            <div v-if="selectedRow(entry.name)!.equipCheck!.errors.length || selectedRow(entry.name)!.equipCheck!.warnings.length" class="sf-check">
              <div v-for="e in selectedRow(entry.name)!.equipCheck!.errors" :key="e" class="sf-err">✕ {{ e }}</div>
              <div v-for="w in selectedRow(entry.name)!.equipCheck!.warnings" :key="w" class="sf-warn">⚠ {{ w }}</div>
            </div>
            <div v-else class="sf-check ok">✓ 结构校验通过（效果条目 / 骰面格式）</div>
          </template>
          <div v-if="selectedRow(entry.name)?.priceHint" class="sf-hint" :class="{ bad: !selectedRow(entry.name)!.priceHint!.ok }">
            {{
              selectedRow(entry.name)!.priceHint!.ok
                ? `合法区间 ${selectedRow(entry.name)!.priceHint!.min} ~ ${selectedRow(entry.name)!.priceHint!.max} UP`
                : selectedRow(entry.name)!.priceHint!.reason
            }}
          </div>
        </div>
      </div>

      <div v-if="selCount > 0" class="mkt-submit">
        <button class="mc-buy big" :disabled="sellableCount === 0 || prepping || store.reviewing || store.listing" @click="doSellAll">
          {{ prepping || store.reviewing ? 'AI 审核中…' : store.listing ? '上架中…' : `提交 ${sellableCount} / ${selCount} 件（先审核）` }}
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
        <button class="mc-buy big" :disabled="store.pending <= 0 || store.collecting" @click="store.collect()">
          {{ store.collecting ? '领取中…' : '领取全部货款' }}
        </button>
      </div>

      <div class="mkt-hint">出售记录（最近 100 条）</div>
      <div v-if="store.sales.length === 0" class="mkt-empty">还没有卖出过物品</div>
      <div v-for="s in store.sales" :key="s.id" class="mkt-card sale">
        <div class="mc-head">
          <span class="mc-name" :style="{ color: qualityColor(s.item) }">{{ s.item.名称 }}</span>
          <span class="mc-price">{{ s.price * s.qty }} UP</span>
        </div>
        <div class="mc-foot">
          <span class="mc-seller">×{{ s.qty }} · 买家：<b class="buyer">{{ s.buyer }}</b> · {{ timeAgo(s.created) }}</span>
        </div>
      </div>

      <div class="mkt-hint">我的在售挂单</div>
      <div v-if="store.myListings.length === 0" class="mkt-empty">没有在售挂单</div>
      <div v-for="l in store.myListings" :key="l.id" class="mkt-card">
        <div class="mc-head" @click="detailOpen = l">
          <span class="mc-name" :style="{ color: qualityColor(l.item) }">{{ l.item.名称 }}</span>
          <span class="mc-price">{{ l.price * l.qty }} UP</span>
        </div>
        <div class="mc-tags">
          <span class="mc-tag">×{{ l.qty }}</span>
          <span v-if="l.qty > 1" class="mc-tag">单价 {{ l.price }}</span>
          <span v-if="l.op" class="mc-tag op">超模·{{ l.op.tier }}</span>
        </div>
        <div class="mc-foot">
          <span class="mc-seller">{{ timeAgo(l.created) }}</span>
          <button class="mc-detail" @click="detailOpen = l">详情</button>
          <button class="mc-cancel" @click="store.cancel(l)">下架取回</button>
        </div>
      </div>
    </div>

    <!-- ============ 费用确认（上架第二阶段） ============ -->
    <div v-if="prep" class="mkt-mask" @click.self="prep = null">
      <div class="mkt-dialog">
        <div class="md-title">上架费用确认</div>
        <div v-for="it in prep.listable" :key="it.name" class="fee-row">
          <div class="fee-name">
            「{{ it.name }}」×{{ it.qty }} · 单价 {{ it.price }} UP
            <span v-if="it.op" class="fee-op">超模·{{ it.op.realTier }}</span>
          </div>
          <div class="fee-line">所得税(20%)：{{ it.tax }} UP</div>
          <template v-if="it.op">
            <div class="fee-line op">超模费：{{ it.op.rp }} RP + {{ it.op.up }} UP</div>
            <div v-for="p in it.op.points" :key="p" class="fee-point">· {{ p }}</div>
          </template>
        </div>
        <div class="md-total">
          合计需付：<b>{{ prep.upNeeded }} UP</b><template v-if="prep.rpNeeded"> + <b>{{ prep.rpNeeded }} RP</b></template>
        </div>
        <div class="md-line dim">
          当前持有 {{ prep.upHave }} UP<template v-if="prep.rpNeeded"> · {{ prep.rpHave }} RP</template>
          <template v-if="!prep.affordable"> —— 余额不足，请先筹措</template>
        </div>
        <div class="md-line dim">费用直接从你的存档扣除（不交给任何人）。已售物品的所得税不退。</div>
        <div class="md-actions">
          <button class="mc-cancel" @click="prep = null">取消</button>
          <button class="mc-buy" :disabled="!prep.affordable || store.listing" @click="confirmCommit">
            {{ store.listing ? '上架中…' : '确认支付并上架' }}
          </button>
        </div>
      </div>
    </div>

    <!-- ============ 商品详情 / 购买 ============ -->
    <div v-if="detailOpen" class="mkt-mask" @click.self="detailOpen = null">
      <div class="mkt-dialog detail">
        <div class="md-title-row">
          <span class="md-title" :style="{ color: qualityColor(detailOpen.item) }">{{ detailOpen.item.名称 }}</span>
          <button class="md-close" @click="detailOpen = null">✕</button>
        </div>
        <div class="mc-tags">
          <span v-if="detailOpen.kind === 'equip'" class="mc-tag">
            {{ qualityLabel(detailOpen.item) }}·{{ detailOpen.item.类型 }}·{{ detailOpen.item.阶位 || detailOpen.tier }}
          </span>
          <span v-else class="mc-tag goods">道具·{{ qualityLabel(detailOpen.item) }}·{{ detailOpen.item.阶位 || detailOpen.tier }}</span>
          <span class="mc-tag">×{{ detailOpen.qty }}</span>
          <span v-if="detailOpen.op" class="mc-tag op">超模·{{ detailOpen.op.tier }}</span>
        </div>

        <div v-if="detailOpen.kind === 'equip'" class="md-grid">
          <span v-if="has(detailOpen.item.伤害骰)">伤害骰</span><span v-if="has(detailOpen.item.伤害骰)">{{ detailOpen.item.伤害骰 }}</span>
          <span v-if="Number(detailOpen.item.倍率)">倍率</span><span v-if="Number(detailOpen.item.倍率)">{{ detailOpen.item.倍率 }}</span>
          <span v-if="has(detailOpen.item.主属性)">主属性</span>
          <span v-if="has(detailOpen.item.主属性)">{{ detailOpen.item.主属性 }} +{{ detailOpen.item.主属性加成 ?? 0 }}</span>
          <span v-if="has(detailOpen.item.副属性)">副属性</span>
          <span v-if="has(detailOpen.item.副属性)">{{ detailOpen.item.副属性 }} +{{ detailOpen.item.副属性加成 ?? 0 }}</span>
          <span v-if="Number(detailOpen.item.装备防御)">装备防御</span><span v-if="Number(detailOpen.item.装备防御)">{{ detailOpen.item.装备防御 }}</span>
          <span v-if="Number(detailOpen.item.装备闪避)">装备闪避</span><span v-if="Number(detailOpen.item.装备闪避)">{{ detailOpen.item.装备闪避 }}</span>
          <span v-if="Number(detailOpen.item.负重)">负重</span><span v-if="Number(detailOpen.item.负重)">{{ detailOpen.item.负重 }}kg</span>
          <span v-if="Number(detailOpen.item.强化等级)">强化等级</span><span v-if="Number(detailOpen.item.强化等级)">+{{ detailOpen.item.强化等级 }}</span>
          <span v-if="has(detailOpen.item.穿戴门槛)">穿戴门槛</span><span v-if="has(detailOpen.item.穿戴门槛)">{{ detailOpen.item.穿戴门槛 }}</span>
        </div>

        <div v-if="effectList(detailOpen.item).length" class="md-block">
          <div class="md-block-title">效果</div>
          <div v-for="ef in effectList(detailOpen.item)" :key="ef.name" class="md-effect"><b>{{ ef.name }}</b>：{{ ef.text }}</div>
        </div>

        <div v-if="has(detailOpen.item.描述)" class="md-block">
          <div class="md-block-title">描述</div>
          <div class="md-desc-full">{{ detailOpen.item.描述 }}</div>
        </div>

        <div class="md-line dim">卖家：{{ detailOpen.seller }} · {{ detailOpen.tier }} · 上架于 {{ timeAgo(detailOpen.created) }}</div>

        <!-- 部分购买：只买走一部分，剩余继续挂在市场上 -->
        <div v-if="detailOpen.client !== myClient" class="md-qty">
          <span class="md-qty-label">购买数量</span>
          <button class="qty-btn" :disabled="buyQty <= 1" @click="stepQty(-1)">−</button>
          <input class="qty-input" type="number" min="1" :max="detailOpen.qty" :value="buyQty" @input="onQtyInput" />
          <button class="qty-btn" :disabled="buyQty >= detailOpen.qty" @click="stepQty(1)">＋</button>
          <button
            class="qty-all"
            :disabled="buyQty >= detailOpen.qty"
            @click="buyQty = clampQty(detailOpen.qty, detailOpen.qty)"
          >
            全买
          </button>
          <span class="md-qty-max">共 {{ detailOpen.qty }} 件</span>
        </div>

        <div class="md-total">
          单价 <b>{{ detailOpen.price }} UP</b> × {{ shownQty }} = <b class="big">{{ buyMath.total }} UP</b>
        </div>
        <div v-if="detailOpen.client !== myClient" class="md-line dim">
          购买手续费(10%)：{{ buyMath.fee }} UP ｜ 实付 <b>{{ buyMath.pay }} UP</b>
          ｜ 支付后持有 {{ store.playerUP }} → {{ store.playerUP - buyMath.pay }} UP
        </div>

        <div class="md-actions">
          <button class="mc-cancel" @click="detailOpen = null">关闭</button>
          <button v-if="detailOpen.client !== myClient" class="mc-buy" :disabled="store.purchasing" @click="doBuy">
            {{ store.purchasing ? '支付中…' : '确认支付' }}
          </button>
          <button v-else class="mc-cancel" @click="doCancelMine(detailOpen)">下架取回</button>
        </div>
      </div>
    </div>

    <!-- ============ 通知中心 ============ -->
    <div v-if="showNotices" class="mkt-mask" @click.self="showNotices = false">
      <div class="mkt-dialog detail">
        <div class="md-title-row">
          <span class="md-title">市场通知</span>
          <button class="md-close" @click="showNotices = false">✕</button>
        </div>
        <div v-if="store.notices.length === 0" class="mkt-empty">暂无通知</div>
        <div v-for="n in store.notices" :key="n.id" class="notice">
          <div class="notice-head">
            <span class="notice-title">{{ n.title }}</span>
            <span class="notice-time">{{ timeAgo(n.ts) }}</span>
          </div>
          <div class="notice-body">{{ n.body }}</div>
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
  parseQuality,
  tierIndexOfItem,
  type MarketItemSnapshot,
  type PriceCheck,
} from './priceTable';
import { validateEquip } from './equipRules';
import type { Bag } from './settle';
import { useMarketStore, type SellPrep } from './store';
import { DEFAULT_QTY, buyTotals, clampQty } from './buyQty';

const emit = defineEmits<{ close: [] }>();
const store = useMarketStore();

const TABS = [
  { key: 'browse', label: '逛市场' },
  { key: 'sell', label: '上架' },
  { key: 'mine', label: '我的' },
] as const;
const tab = ref<(typeof TABS)[number]['key']>('browse');
const myClient = getClientId();

// 银色 2026-09-23 起可售卖（基准价 = 紫装 × 10）
const QUALITY_OPTIONS = ['白色', '蓝色', '金色', '紫色', '银色'] as const;
const TIER_OPTIONS = ['一阶', '二阶', '三阶', '四阶', '五阶', '超脱阶'] as const;

// ============ 逛市场 ============
const FILTERS = [
  { key: 'all', label: '全部品质' },
  { key: '蓝色', label: '蓝' },
  { key: '金色', label: '金' },
  { key: '紫色', label: '紫' },
  { key: '银色', label: '银' },
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
  { key: '5', label: '超脱' },
] as const;
const tierFilter = ref<(typeof TIER_FILTERS)[number]['key']>('all');

const filteredListings = computed(() =>
  store.listings.filter(l => {
    if (catFilter.value !== 'all' && categoryOf(l.item) !== catFilter.value) return false;
    if (tierFilter.value !== 'all' && tierIndexOfItem(l.item, l.tier) !== Number(tierFilter.value)) return false;
    if (filter.value !== 'all' && parseQuality(l.item.品质)?.quality !== filter.value) return false;
    return true;
  }),
);

const detailOpen = ref<Listing | null>(null);
const showNotices = ref(false);
function openNotices() {
  showNotices.value = true;
  store.markAllRead();
}

/** 详情弹层里选定的购买数量（部分购买）。打开弹层时重置为默认 1 */
const buyQty = ref(DEFAULT_QTY);
watch(detailOpen, l => {
  buyQty.value = clampQty(DEFAULT_QTY, l ? l.qty : DEFAULT_QTY);
});

/** 金额按「实际会买的件数」算：别人的挂单用选定的数量，自己的挂单用剩余全量 */
const shownQty = computed(() => {
  const l = detailOpen.value;
  if (!l) return DEFAULT_QTY;
  return l.client === myClient ? l.qty : buyQty.value;
});
/** 总价 / 手续费 / 实付（规则与测试在 buyQty.ts） */
const buyMath = computed(() => buyTotals(detailOpen.value?.price ?? 0, shownQty.value));

function stepQty(delta: number) {
  if (!detailOpen.value) return;
  buyQty.value = clampQty(buyQty.value + delta, detailOpen.value.qty);
}

/** 手输数量：立刻夹到 [1, 剩余]，清空也不会变成 NaN */
function onQtyInput(e: Event) {
  if (!detailOpen.value) return;
  buyQty.value = clampQty((e.target as HTMLInputElement).value as unknown as number, detailOpen.value.qty);
}

async function doBuy() {
  if (!detailOpen.value) return;
  const ok = await store.buy(detailOpen.value, buyQty.value);
  if (ok) detailOpen.value = null;
}

async function doCancelMine(l: Listing) {
  const ok = await store.cancel(l);
  if (ok) detailOpen.value = null;
}

// ============ 上架（多选批量 · 两阶段） ============
interface SellEntry {
  name: string;
  item: MarketItemSnapshot & { 数量: number };
  qty: number;
  price: number | string;
  desc: string;
  quality: string;
  tier: string;
}

const sellSel = reactive<Record<string, SellEntry>>({});
const kindOverride = reactive<Record<string, 'equip' | 'goods'>>({});
const prep = ref<SellPrep | null>(null);
const prepping = ref(false);

const bagEntries = computed(() => Object.entries(store.playerBag as Bag).filter(([, item]) => Number(item.数量) > 0));

const bagRows = computed(() =>
  bagEntries.value.map(([name, item]) => {
    const auto = classify({ ...item, 名称: name });
    const kind: 'equip' | 'goods' = kindOverride[name] ?? (auto.kind === 'equip' ? 'equip' : 'goods');
    const tag = auto.kind === 'equip' ? `${auto.gray ? `灰色封印(${auto.quality})` : auto.quality}·${auto.category}` : '';
    return { name, item, kind, auto, tag };
  }),
);

/** 勾选后的逐件：价格提示（按所填品质/阶位）+ 结构调整 */
const sellRows = computed(() =>
  bagRows.value
    .filter(r => sellSel[r.name])
    .map(r => {
      const sel = sellSel[r.name];
      const snap = { ...r.item, 名称: r.name, 数量: sel.qty, 品质: sel.quality, 阶位: sel.tier };
      const priceNum = Number(sel.price);
      const priceValid = sel.price !== '' && Number.isFinite(priceNum) && priceNum >= 0;
      const equipCheck = r.kind === 'equip' && r.auto.kind === 'equip' ? validateEquip(snap, r.auto, tierIndexOfItem({ 阶位: sel.tier }, store.playerTier) ?? 0) : null;
      return {
        name: r.name,
        item: r.item,
        kind: r.kind,
        entry: sel,
        priceHint: priceValid ? checkPrice(r.kind, snap, store.playerTier, priceNum) : null,
        equipCheck,
        canSell:
          Number.isInteger(sel.qty) &&
          sel.qty >= 1 &&
          sel.qty <= r.item.数量 &&
          priceValid &&
          (!equipCheck || equipCheck.ok),
      };
    }),
);

const bagTagged = computed(() => bagRows.value.map(r => ({ ...r, sel: sellSel[r.name] ?? null })));
const selCount = computed(() => sellRows.value.length);
const sellableCount = computed(() => sellRows.value.filter(r => r.canSell).length);

function selectedRow(name: string) {
  return sellRows.value.find(r => r.name === name) ?? null;
}

function defaultQuality(item: MarketItemSnapshot): string {
  // 银色已可售卖，不再回落成白色（回落会按白装价挂上去，严重低估）
  return parseQuality(item.品质)?.quality ?? '白色';
}

function toggleSel(name: string, item: MarketItemSnapshot & { 数量: number }) {
  if (sellSel[name]) delete sellSel[name];
  else
    sellSel[name] = {
      name,
      item,
      qty: 1,
      price: '',
      desc: String(item.描述 ?? ''),
      quality: defaultQuality(item),
      tier: String(item.阶位 ?? '') || store.playerTier,
    };
}

function cycleKind(name: string, item: MarketItemSnapshot) {
  const auto = classify({ ...item, 名称: name });
  const cur = kindOverride[name] ?? (auto.kind === 'equip' ? 'equip' : 'goods');
  const next = cur === 'equip' ? 'goods' : 'equip';
  const autoKind = auto.kind === 'equip' ? 'equip' : 'goods';
  if (next === autoKind) delete kindOverride[name];
  else kindOverride[name] = next;
}

function kindOf(name: string): 'equip' | 'goods' {
  return kindOverride[name] ?? bagRows.value.find(r => r.name === name)?.kind ?? 'goods';
}

/** 阶段一：提交审核 + 算费 */
async function doSellAll() {
  const entries = sellRows.value
    .filter(r => r.canSell)
    .map(r => ({
      name: r.name,
      snapshot: {
        ...r.item,
        描述: String(r.entry.desc ?? ''),
        品质: r.entry.quality,
        阶位: r.entry.tier,
      } as MarketItemSnapshot,
      kind: r.kind,
      qty: Number(r.entry.qty),
      price: Number(r.entry.price),
    }));
  if (entries.length === 0) return;
  prepping.value = true;
  try {
    prep.value = await store.prepareSell(entries);
  } catch (e: any) {
    store.lastError = e?.message || 'AI 审核失败';
  } finally {
    prepping.value = false;
  }
}

/** 阶段二：确认费用 → 执行上架 + 扣费 */
async function confirmCommit() {
  if (!prep.value) return;
  const entries = prep.value.listable.map(i => i.name);
  const ok = await store.commitSell(prep.value);
  if (ok) {
    for (const n of entries) delete sellSel[n];
    prep.value = null;
  }
}

// ============ 展示辅助 ============
function qualityLabel(item: MarketItemSnapshot): string {
  const q = parseQuality(item.品质);
  if (!q) return String(item.品质 ?? '道具');
  return q.gray ? `灰色封印(${q.quality})` : q.quality;
}

function qualityColor(item: MarketItemSnapshot): string {
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

function has(v: unknown): boolean {
  if (v === undefined || v === null) return false;
  if (typeof v === 'string') return !['', '无', 'none', 'None'].includes(v.trim());
  if (typeof v === 'number') return v !== 0;
  return true;
}

function effectList(item: MarketItemSnapshot): { name: string; text: string }[] {
  const e = item.效果;
  if (e && typeof e === 'object' && !Array.isArray(e)) {
    return Object.entries(e as Record<string, unknown>).map(([name, text]) => ({ name, text: String(text) }));
  }
  if (typeof e === 'string' && e.trim()) return [{ name: '效果', text: e }];
  return [];
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)}分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)}小时前`;
  return `${Math.floor(s / 86400)}天前`;
}

onMounted(() => store.refresh());

// 跨 app 联动：工坊「上架市场」跳转时预选物品
watch(
  () => [store.pendingSell, store.playerBag] as const,
  () => {
    const name = store.pendingSell;
    if (!name) return;
    const item = (store.playerBag as Bag)[name];
    if (!item || Number(item.数量) <= 0) return;
    tab.value = 'sell';
    if (!sellSel[name]) toggleSel(name, item);
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
  position: relative;
  &:disabled {
    opacity: 0.5;
  }
  svg {
    width: 20px;
    height: 20px;
  }
}
.bell-badge {
  position: absolute;
  top: 3px;
  right: 2px;
  min-width: 14px;
  height: 14px;
  padding: 0 3px;
  border-radius: 7px;
  background: #e0705c;
  color: #fff;
  font-size: 9px;
  line-height: 14px;
  text-align: center;
}
.hdr-title {
  flex: 1;
  font-size: 14px;
  color: var(--chalk, #d8cdbd);
  letter-spacing: 2px;
  margin-left: 4px;
}
.hdr-bal {
  font-size: 11px;
  color: var(--amber-d, #b08a4f);
  margin-right: 4px;
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
  white-space: pre-wrap;
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
  flex-wrap: wrap;
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
  opacity: 0.85;
  line-height: 1.5;
  &.dim {
    opacity: 0.6;
    font-size: 10px;
  }
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
  &.sale {
    border-color: rgba(122, 176, 138, 0.3);
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
  &.op {
    background: rgba(224, 112, 92, 0.18);
    color: #e0705c;
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
  opacity: 0.75;
  .buyer {
    color: var(--amber, #d8b36a);
  }
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
.mc-detail {
  padding: 3px 10px;
  font-size: 10px;
  border-radius: 6px;
  border: 1px solid rgba(176, 138, 79, 0.4);
  background: transparent;
  color: var(--amber-d, #b08a4f);
  cursor: pointer;
}
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
  > span {
    width: 64px;
    flex-shrink: 0;
  }
  input,
  select {
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
  &.col {
    flex-direction: column;
    align-items: stretch;
    gap: 4px;
    > span {
      width: auto;
    }
    textarea {
      width: 100%;
      padding: 5px 8px;
      font-size: 12px;
      line-height: 1.5;
      border-radius: 6px;
      border: 1px solid rgba(80, 40, 20, 0.5);
      background: rgba(16, 12, 9, 0.8);
      color: var(--chalk, #d8cdbd);
      outline: none;
      resize: vertical;
      font-family: inherit;
      &:focus {
        border-color: rgba(176, 138, 79, 0.6);
      }
    }
  }
}
.sf-hint {
  font-size: 11px;
  color: #7fb08a;
  line-height: 1.5;
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

.mkt-submit {
  position: sticky;
  bottom: 0;
  padding-top: 6px;
  background: linear-gradient(180deg, transparent, #100c09 40%);
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
  max-width: 320px;
  border-radius: 10px;
  border: 1px solid rgba(176, 138, 79, 0.4);
  background: #1e150e;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  &.detail {
    max-height: 88%;
    overflow-y: auto;
  }
}
.md-title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.md-title {
  font-size: 14px;
  color: var(--amber, #d8b36a);
  letter-spacing: 2px;
}
.md-close {
  border: none;
  background: transparent;
  color: var(--chalk-d, #9c8f80);
  font-size: 14px;
  cursor: pointer;
  padding: 0 4px;
}
.md-grid {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 3px 10px;
  font-size: 11px;
  color: var(--chalk, #d8cdbd);
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  span:nth-child(odd) {
    color: var(--chalk-d, #9c8f80);
  }
}
.md-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
}
.md-block-title {
  font-size: 11px;
  color: var(--amber, #d8b36a);
  letter-spacing: 1px;
}
.md-effect {
  font-size: 11px;
  color: var(--chalk, #d8cdbd);
  line-height: 1.5;
  padding-left: 6px;
  border-left: 2px solid rgba(176, 138, 79, 0.4);
  b {
    color: var(--amber, #d8b36a);
  }
}
.md-desc-full {
  font-size: 11px;
  color: var(--chalk, #d8cdbd);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.md-qty {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 0;
  border-top: 1px solid rgba(80, 40, 20, 0.35);
  font-size: 12px;
  color: var(--chalk, #d8cdbd);
}
.md-qty-label {
  flex-shrink: 0;
  color: var(--amber-d, #b08a4f);
}
.qty-btn {
  width: 26px;
  height: 24px;
  border: 1px solid rgba(160, 120, 60, 0.5);
  border-radius: 4px;
  background: rgba(90, 62, 28, 0.5);
  color: var(--amber, #d8b36a);
  font-size: 14px;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
.qty-input {
  width: 54px;
  height: 24px;
  box-sizing: border-box;
  border: 1px solid rgba(160, 120, 60, 0.5);
  border-radius: 4px;
  background: rgba(20, 14, 10, 0.8);
  color: var(--chalk, #d8cdbd);
  text-align: center;
  font-size: 12px;
  /* 数字输入框的上下箭头在窄弹层里很挤，去掉 */
  -moz-appearance: textfield;
  appearance: textfield;
  &::-webkit-outer-spin-button,
  &::-webkit-inner-spin-button {
    -webkit-appearance: none;
    margin: 0;
  }
}
.qty-all {
  height: 24px;
  padding: 0 8px;
  border: 1px solid rgba(160, 120, 60, 0.5);
  border-radius: 4px;
  background: transparent;
  color: var(--amber-d, #b08a4f);
  font-size: 11px;
  cursor: pointer;
  flex-shrink: 0;
  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
}
.md-qty-max {
  margin-left: auto;
  color: #7a6448;
  font-size: 11px;
  flex-shrink: 0;
}
.md-total {
  font-size: 12px;
  color: var(--chalk, #d8cdbd);
  border-top: 1px solid rgba(80, 40, 20, 0.35);
  padding-top: 6px;
  b {
    color: var(--amber, #d8b36a);
  }
  .big {
    font-size: 14px;
  }
}
.md-line {
  font-size: 12px;
  color: var(--chalk, #d8cdbd);
  &.dim {
    color: var(--chalk-d, #9c8f80);
    font-size: 11px;
    line-height: 1.5;
  }
}
.md-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 4px;
}

/* 费用确认弹层 */
.fee-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
}
.fee-name {
  font-size: 12px;
  color: var(--chalk, #d8cdbd);
}
.fee-op {
  font-size: 10px;
  color: #e0705c;
  margin-left: 4px;
}
.fee-line {
  font-size: 11px;
  color: var(--chalk-d, #9c8f80);
  &.op {
    color: #e0705c;
  }
}
.fee-point {
  font-size: 10px;
  color: var(--chalk-d, #9c8f80);
  opacity: 0.8;
  padding-left: 6px;
}

/* 通知中心 */
.notice {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.22);
  border-left: 2px solid rgba(176, 138, 79, 0.5);
}
.notice-head {
  display: flex;
  justify-content: space-between;
  gap: 8px;
}
.notice-title {
  font-size: 12px;
  color: var(--amber, #d8b36a);
}
.notice-time {
  font-size: 10px;
  color: var(--chalk-d, #9c8f80);
  white-space: nowrap;
}
.notice-body {
  font-size: 11px;
  color: var(--chalk, #d8cdbd);
  line-height: 1.5;
  white-space: pre-wrap;
}
</style>
