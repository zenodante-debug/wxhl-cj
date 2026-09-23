<template>
  <div class="ord-wrap">
    <!-- R1：部分领取未完成的**常驻**提示条（不是 toastr——toast 几秒就消失，
         而 ACK 非原子：中途失败会留下未入账的钱/物，玩家必须一直看得到这条，
         直到下一次 refresh()/claimAll() 清掉 store.lastError 为止） -->
    <div v-if="部分领取提示" class="ord-warnbar">{{ 部分领取提示 }}</div>
    <!-- 错误条：与 CraftingView 同款（普通错误；部分领取那条走上面的常驻提示条，不重复显示） -->
    <div v-if="普通错误" class="ord-error">{{ 普通错误 }}</div>

    <div class="ord-subtabs">
      <button class="ord-subtab" :class="{ active: sub === 'hall' }" @click="sub = 'hall'">订单大厅</button>
      <button class="ord-subtab" :class="{ active: sub === 'mine' }" @click="sub = 'mine'">我的</button>
    </div>

    <!-- ============ 订单大厅 ============ -->
    <template v-if="sub === 'hall'">
      <div class="ord-card ord-pub">
        <div class="oc-head">
          <span class="oc-name">发布订单</span>
          <span class="oc-tag">订金发布时托管 · 尾款验收时支付</span>
        </div>
        <div class="ord-form">
          <label>名称<input v-model="pub.名称" type="text" maxlength="30" placeholder="想要什么？如 狼牙短剑" /></label>
          <label>成品类型
            <select v-model="pub.成品类型">
              <option value="装备">装备</option>
              <option value="道具">道具</option>
            </select>
          </label>
          <label v-if="pub.成品类型 === '装备'">装备子类
            <select v-model="pub.装备子类">
              <option value="">不限</option>
              <option value="武器">武器</option>
              <option value="防具">防具</option>
              <option value="饰品">饰品</option>
            </select>
          </label>
          <label>品质
            <select v-model="pub.品质">
              <option value="">不限</option>
              <option value="金色">金色</option>
              <option value="紫色">紫色</option>
            </select>
          </label>
          <label>阶位
            <select v-model.number="pub.阶位">
              <option :value="0">不限</option>
              <option v-for="t in 5" :key="t" :value="t">{{ t }}阶</option>
            </select>
          </label>
          <label class="ord-col">效果要求
            <textarea v-model="pub.效果要求" rows="2" maxlength="200" placeholder="如 命中+10%、附带火伤；可留空"></textarea>
          </label>
          <label class="ord-col">说明
            <textarea v-model="pub.说明" rows="2" maxlength="200" placeholder="补充说明，可留空"></textarea>
          </label>
          <label>订金 UP<input v-model.number="pub.订金" type="number" min="1" step="1" /></label>
          <label>尾款 UP<input v-model.number="pub.尾款" type="number" min="0" step="1" /></label>
        </div>
        <div class="ord-total">合计 {{ 合计 }} UP（订金 + 尾款）</div>
        <button class="ord-go" :disabled="!可发布" @click="发布">发布订单</button>
      </div>

      <div v-if="!store.hall.length" class="ord-empty">{{ store.loading ? '大厅加载中…' : '大厅暂无订单，去发一单吧' }}</div>
      <div v-for="o in store.hall" :key="o.id" class="ord-card">
        <div class="oc-head">
          <span class="oc-name">{{ 需求单摘要(o.spec) }}</span>
          <span class="oc-tag">{{ o.status }}</span>
        </div>
        <div v-if="o.spec.效果要求" class="oc-line">效果要求：{{ o.spec.效果要求 }}</div>
        <div v-if="o.spec.说明" class="oc-line ord-desc">{{ o.spec.说明 }}</div>
        <div class="oc-line">订金 {{ o.deposit }} UP ＋ 尾款 {{ o.final }} UP</div>
        <div class="oc-foot">
          <span class="oc-meta">{{ o.poster }} · {{ timeAgo(o.created) }}</span>
          <button class="ord-mini" :disabled="store.busy" @click="store.accept(o.id)">接单</button>
        </div>
      </div>
    </template>

    <!-- ============ 我的 ============ -->
    <template v-else>
      <!-- 待领取：服务器账本里已归属、还没领回本地的钱与物 -->
      <div v-if="有待领" class="ord-card ord-claim">
        <div class="oc-head">
          <span class="oc-name">待领取</span>
          <span class="oc-tag">{{ store.claim.待领.length }} 项</span>
        </div>
        <div class="oc-line">{{ 待领汇总 }}</div>
        <button class="ord-go" :disabled="store.busy || !有待领" @click="领取">全部领取</button>
      </div>

      <div class="ord-sect">我发布的（{{ store.asPoster.length }}）</div>
      <div v-if="!store.asPoster.length" class="ord-empty">还没有订单</div>
      <div v-for="o in store.asPoster" :key="o.id" class="ord-card">
        <div class="oc-head">
          <span class="oc-name">{{ 需求单摘要(o.spec) }}</span>
          <span class="oc-tag">{{ o.status }}</span>
        </div>
        <div v-if="o.spec.效果要求" class="oc-line">效果要求：{{ o.spec.效果要求 }}</div>
        <div v-if="o.spec.说明" class="oc-line ord-desc">{{ o.spec.说明 }}</div>
        <div class="oc-line">订金 {{ o.deposit }} UP ＋ 尾款 {{ o.final }} UP</div>
        <div class="oc-line">接单者：{{ o.maker ?? '暂无' }}</div>
        <div v-if="o.status === '已交付'" class="oc-foot">
          <span v-if="!可验收(o)" class="ord-hint">尾款不足（需 {{ o.final }} UP）</span>
          <span v-else class="oc-meta">{{ o.maker }} 已交付成品</span>
          <button class="ord-mini" :disabled="store.busy || !可验收(o)" @click="store.confirm(o.id)">验收</button>
          <button class="ord-mini ord-mini-dang" :disabled="store.busy" @click="store.reject(o.id)">退货</button>
        </div>
      </div>

      <div class="ord-sect">我接的（{{ store.asMaker.length }}）</div>
      <div v-if="!store.asMaker.length" class="ord-empty">还没有订单</div>
      <div v-for="o in store.asMaker" :key="o.id" class="ord-card">
        <div class="oc-head">
          <span class="oc-name">{{ 需求单摘要(o.spec) }}</span>
          <span class="oc-tag">{{ o.status }}</span>
        </div>
        <div v-if="o.spec.效果要求" class="oc-line">效果要求：{{ o.spec.效果要求 }}</div>
        <div v-if="o.spec.说明" class="oc-line ord-desc">{{ o.spec.说明 }}</div>
        <div class="oc-line">订金 {{ o.deposit }} UP ＋ 尾款 {{ o.final }} UP</div>
        <div class="oc-line">发单人：{{ o.poster }}</div>
        <template v-if="o.status === '已接单'">
          <label class="ord-deliver">交付物品
            <select v-model="deliverSel[o.id]">
              <option value="" disabled>从背包选一件成品</option>
              <option v-for="n in bagNames" :key="n" :value="n">{{ n }}（×{{ craft.bag[n]?.数量 }}）</option>
            </select>
          </label>
          <div class="oc-foot">
            <span v-if="!bagNames.length" class="ord-hint">背包里没有可交付的物品</span>
            <button class="ord-mini" :disabled="store.busy || !deliverSel[o.id]" @click="交付(o.id)">交付</button>
            <!-- v4a：弃单按钮存在但禁用（v4b 才实现），先给玩家一个明确预期 -->
            <button class="ord-mini ord-mini-dang" disabled title="弃单功能即将开放">弃单（即将开放）</button>
          </div>
        </template>
        <div v-else-if="o.status === '已交付'" class="ord-hint">等待发单人验收</div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useCraftingStore } from '../store';
import type { 订单 } from './api';
import { 需求单Schema, 需求单摘要 } from './spec';
import { useOrderStore } from './store';

const store = useOrderStore();
const craft = useCraftingStore();

const sub = ref<'hall' | 'mine'>('hall');

// ---------------- R1：部分领取的常驻提示条 ----------------
// store.claimAll 的 ACK 循环非原子：回执失败的条目**不入账**、仍留在服务器待领清单里。
// store 会把「部分领取未完成：…」写进 lastError（refresh/claimAll 才清），这里把它从普通错误里
// 摘出来走常驻提示条 —— 不许用 toast（3 秒消失后玩家不知道还有钱/物没领回来）。
const 部分领取前缀 = '部分领取未完成';
const 部分领取提示 = computed(() => (store.lastError.startsWith(部分领取前缀) ? store.lastError : ''));
const 普通错误 = computed(() => (部分领取提示.value ? '' : store.lastError));

// ---------------- 发布订单 ----------------
const pub = reactive({
  名称: '',
  成品类型: '装备' as '装备' | '道具',
  装备子类: '' as '' | '武器' | '防具' | '饰品',
  品质: '' as '' | '金色' | '紫色',
  阶位: 0,
  效果要求: '',
  说明: '',
  订金: 100,
  尾款: 100,
});

const 合计 = computed(() => Math.max(0, Number(pub.订金) || 0) + Math.max(0, Number(pub.尾款) || 0));
/** 发布守卫：名称非空 + 订金正整数 + 尾款非负整数 + 非忙碌（busy 是 store 的双击防护，这里先挡一层） */
const 可发布 = computed(
  () =>
    !store.busy &&
    pub.名称.trim() !== '' &&
    Number.isInteger(pub.订金) && pub.订金 > 0 &&
    Number.isInteger(pub.尾款) && pub.尾款 >= 0,
);

async function 发布(): Promise<void> {
  if (!可发布.value) return;
  // 道具没有装备子类：schema 里该字段恒为空串（与定制图纸同口径），这里按死再交 schema 兜底
  const spec = 需求单Schema.parse({
    名称: pub.名称.trim(),
    成品类型: pub.成品类型,
    装备子类: pub.成品类型 === '装备' ? pub.装备子类 : '',
    品质: pub.品质,
    阶位: pub.阶位,
    效果要求: pub.效果要求.trim(),
    说明: pub.说明.trim(),
  });
  const ok = await store.publish(spec, pub.订金, pub.尾款);
  // 成功才清描述性字段（订金已托管）；类型/金额保留，方便照同一套再发一单
  if (ok) { pub.名称 = ''; pub.效果要求 = ''; pub.说明 = ''; }
}

// ---------------- 我的：验收 / 交付 / 领取 ----------------
/** 验收守卫：尾款从发单人 UP 里扣（store.confirm 会再校一遍），余额不足先禁按钮并给提示 */
function 可验收(o: 订单): boolean {
  return craft.playerUP >= o.final;
}

/** 交付物品下拉候选：背包里数量 > 0 的物品名（交付快照固定 数量=1，由 store.deliver 按死） */
const bagNames = computed(() => Object.keys(craft.bag).filter(n => Number(craft.bag[n]?.数量 ?? 0) > 0));
/** 每张「我接的」单的交付选择（订单 id → 物品名） */
const deliverSel = reactive<Record<string, string>>({});

async function 交付(id: string): Promise<void> {
  const n = deliverSel[id];
  if (!n) return;
  const ok = await store.deliver(id, n);
  if (ok) delete deliverSel[id];
}

/** 待领取汇总行：钱按「订金 X + 尾款 Y UP」、物按「N 件物品」（口径与 store.claimAll 的成功播报一致） */
const 待领汇总 = computed(() => {
  const c = store.claim;
  const parts: string[] = [];
  if (c.deposit > 0 || c.final > 0) parts.push(`订金 ${c.deposit} + 尾款 ${c.final} UP`);
  if ((c.items?.length ?? 0) > 0) parts.push(`${c.items.length} 件物品`);
  return parts.join(' ＋ ');
});
const 有待领 = computed(() => (store.claim.待领?.length ?? 0) > 0);

async function 领取(): Promise<void> {
  await store.claimAll(); // 结果（含部分领取）经 store.lastError 走顶部常驻提示条/错误条
}

function timeAgo(ts: number): string {
  const s = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (s < 60) return '刚刚';
  if (s < 3600) return `${Math.floor(s / 60)}分钟前`;
  if (s < 86400) return `${Math.floor(s / 3600)}小时前`;
  return `${Math.floor(s / 86400)}天前`;
}

// 每次切进订单页（v-if 重挂载）都把背包/UP 从存档同步一遍：
// 「验收」按钮的 尾款不足 判定与交付下拉都读 craft store 的缓存，不刷新会拿到旧余额
onMounted(() => {
  craft.syncFromMvu();
});
</script>

<style scoped>
.ord-wrap { display: flex; flex-direction: column; gap: 8px; }

/* R1 常驻提示条：琥珀警示色，与红色错误条区分开——它不是「出错了」，是「还有账没结完」 */
.ord-warnbar {
  padding: 6px 10px;
  font-size: 11px;
  color: #d4a017;
  background: rgba(212, 160, 23, 0.1);
  border: 1px solid rgba(212, 160, 23, 0.4);
  border-radius: 6px;
  white-space: pre-wrap;
}
.ord-error {
  padding: 6px 10px;
  font-size: 11px;
  color: #c0392b;
  background: rgba(192, 57, 43, 0.08);
  border: 1px solid rgba(192, 57, 43, 0.3);
  border-radius: 6px;
  white-space: pre-wrap;
}

.ord-subtabs { display: flex; border-bottom: 1px solid rgba(127, 127, 127, 0.25); }
.ord-subtab { flex: 1; padding: 6px 0; background: none; border: none; cursor: pointer; opacity: 0.6; font-size: 12px; }
.ord-subtab.active { opacity: 1; font-weight: 700; border-bottom: 2px solid currentColor; }

.ord-card { border: 1px solid rgba(127, 127, 127, 0.3); border-radius: 8px; padding: 8px 10px; }
.ord-pub { border-color: rgba(184, 134, 11, 0.55); }
.ord-claim { border-color: rgba(74, 157, 95, 0.5); }

.oc-head { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.oc-name { font-weight: 700; }
.oc-tag { font-size: 11px; opacity: 0.7; white-space: nowrap; }
.oc-line { font-size: 12px; opacity: 0.85; margin-top: 4px; }
.ord-desc { opacity: 0.65; font-style: italic; }
.oc-foot { display: flex; justify-content: flex-end; align-items: center; gap: 8px; margin-top: 6px; }
.oc-meta { font-size: 11px; opacity: 0.7; margin-right: auto; }

.ord-form { display: flex; flex-direction: column; gap: 8px; margin-top: 8px; }
.ord-form label { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 12px; }
.ord-form select, .ord-form input { max-width: 60%; }
.ord-form label.ord-col { flex-direction: column; align-items: stretch; }
.ord-form textarea { width: 100%; box-sizing: border-box; font: inherit; font-size: 12px; resize: vertical; }

.ord-total { margin-top: 8px; font-size: 12px; opacity: 0.8; }
.ord-go { margin-top: 8px; width: 100%; padding: 8px; border-radius: 8px; border: none; background: #b8860b; color: #fff; font-weight: 700; cursor: pointer; }
.ord-go:disabled { opacity: 0.4; cursor: not-allowed; }

.ord-mini { padding: 5px 12px; border-radius: 6px; border: 1px solid #b8860b; background: none; color: #b8860b; font-size: 12px; cursor: pointer; }
.ord-mini-dang { border-color: #c0392b; color: #c0392b; }
.ord-mini:disabled, .ord-mini-dang:disabled { opacity: 0.4; cursor: not-allowed; }

.ord-sect { margin-top: 4px; padding: 6px 2px; border-bottom: 1px solid rgba(127, 127, 127, 0.25); font-weight: 700; font-size: 12px; }
.ord-empty { opacity: 0.6; text-align: center; padding: 8px; font-size: 12px; }
.ord-hint { font-size: 11px; color: #e67e22; margin-right: auto; }
.ord-deliver { display: flex; justify-content: space-between; align-items: center; gap: 8px; margin-top: 6px; font-size: 12px; }
.ord-deliver select { max-width: 65%; }
</style>
