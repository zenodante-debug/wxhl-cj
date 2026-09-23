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
      <!-- eslint-disable-next-line better-tailwindcss/no-unknown-classes -->
      <button class="ord-subtab" :class="{ active: sub === 'rank' }" @click="切排行">店铺排行</button>
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
    <template v-else-if="sub === 'mine'">
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
        <div class="oc-line">接单者：{{ o.maker_shop ?? o.maker ?? '暂无' }}</div>
        <div v-if="o.status === '已交付'" class="oc-foot">
          <span v-if="!可验收(o)" class="ord-hint">尾款不足（需 {{ o.final }} UP）</span>
          <span v-else class="oc-meta">{{ o.maker_shop ?? o.maker }} 已交付成品</span>
          <!-- eslint-disable-next-line better-tailwindcss/no-unknown-classes -->
          <select v-model="rateSel[o.id]" class="ord-ratesel" title="给对面店铺打分；跳过则只 +1 完成分">
            <option value="">跳过评分（+1）</option>
            <option v-for="n in [0, 1, 2, 3, 4, 5]" :key="n" :value="n">评 {{ n }} 分（共 +{{ n + 1 }}）</option>
          </select>
          <button class="ord-mini" :disabled="store.busy || !可验收(o)" @click="验收(o.id)">验收</button>
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
          <!-- 发单人肉眼验收是 spec 的设计：store 不核对品质/类型，故在这里提醒玩家自己对照，防误送 -->
          <div class="ord-deliverhint">交付前请对照订单需求（品质/类型），发单人将就成品验收</div>
          <div class="oc-foot">
            <span v-if="!bagNames.length" class="ord-hint">背包里没有可交付的物品</span>
            <button class="ord-mini" :disabled="store.busy || !deliverSel[o.id]" @click="交付(o.id)">交付</button>
            <button class="ord-mini ord-mini-dang" :disabled="store.busy" @click="弃单(o)">
              {{ abandonArm[o.id] ? `确认弃单？赔 ${o.deposit * 3} UP 且店铺 −5 分` : '弃单' }}
            </button>
          </div>
        </template>
        <div v-else-if="o.status === '已交付'" class="ord-hint">等待发单人验收</div>
      </div>

      <!-- 订单记录块：均为既有 ord-*/oc-* 组件类（scoped style 定义），tailwind 规则不认识属既有口径，新增出现处一并豁免 -->
      <!-- eslint-disable better-tailwindcss/no-unknown-classes -->
      <div class="ord-sect">订单记录（{{ 记录列表.length }}）</div>
      <div v-if="!记录列表.length" class="ord-empty">暂无记录（完成/退货/弃单后会记在这里）</div>
      <div v-for="(r, i) in 记录列表" :key="r.订单id + i" class="ord-card">
        <div class="oc-head">
          <span class="oc-name">{{ r.摘要 }}</span>
          <span class="oc-tag">{{ r.结果 }}</span>
        </div>
        <div class="oc-line">{{ r.角色 }} · 对方：{{ r.对方 }}<template v-if="r.分数变动 !== null"> · 店铺分数 {{ r.分数变动 > 0 ? '+' : '' }}{{ r.分数变动 }}</template></div>
        <div class="oc-line oc-meta">{{ new Date(r.时间).toLocaleString() }}</div>
      </div>
      <!-- eslint-enable better-tailwindcss/no-unknown-classes -->
    </template>

    <!-- ============ 店铺排行 ============ -->
    <template v-else-if="sub === 'rank'">
      <!-- eslint-disable better-tailwindcss/no-unknown-classes -->
      <div class="ord-sect">店铺排行榜（共 {{ store.shopBoard.total }} 家）</div>
      <div v-if="!store.shopName" class="ord-hint">你还未开店：开店接单后即可上榜（完成 +1，验收评分 0–5，退货 −2，弃单 −5）</div>
      <div v-if="!店铺榜行.length" class="ord-empty">{{ store.loading ? '加载中…' : '暂无店铺上榜' }}</div>
      <div v-for="(row, i) in 店铺榜行" :key="i" class="ord-rankrow" :class="{ mine: row.kind === 'entry' && row.mine }">
        <span v-if="row.kind === 'gap'" class="ord-gap">⋯</span>
        <template v-else>
          <span class="ord-rk">#{{ row.rank }}</span>
          <span class="ord-rn">{{ row.entry.name }}</span>
          <span class="ord-rs">{{ row.entry.score }} 分</span>
        </template>
      </div>
      <!-- eslint-enable better-tailwindcss/no-unknown-classes -->
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { useCraftingStore } from '../store';
import type { 订单 } from './api';
import { loadHistory, type 订单记录 } from './rep/history';
import { shopBoardRows } from './rep/shop';
import { 需求单Schema, 需求单摘要 } from './spec';
import { useOrderStore, 可交付候选 } from './store';

const store = useOrderStore();
const craft = useCraftingStore();

const sub = ref<'hall' | 'mine' | 'rank'>('hall');

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
  craft.syncFromMvu(); // 发布扣了订金：验收按钮的余额判定要看到新 UP（M-3）
}

// ---------------- 我的：验收 / 交付 / 领取 ----------------
/** 验收守卫：尾款从发单人 UP 里扣（store.confirm 会再校一遍），余额不足先禁按钮并给提示 */
function 可验收(o: 订单): boolean {
  return craft.playerUP >= o.final;
}

// ---------------- M-3：订单动作后同步工坊 store ----------------
// 「尾款不足」禁用态读 craft.playerUP、交付下拉读 craft.bag，而订单动作直接写 MVU——
// 不回同步的话，按钮状态要等切页签（onMounted 的 syncFromMvu）才刷新。
// 四个写 MVU 的动作（发布/交付/验收/领取）await 完都 sync 一次；sync 只是重读存档，失败也无害。
// ---------------- 验收评分（可选，跳过只 +1 保底） ----------------
/** 每张「已交付」单的评分选择（订单 id → '' 跳过 | 0..5） */
const rateSel = reactive<Record<string, number | ''>>({});

async function 验收(id: string): Promise<void> {
  const v = rateSel[id];
  await store.confirm(id, v === '' || v === undefined ? null : Number(v)); // 验收扣了尾款（其余「已交付」单的余额判定要跟着刷新）
  delete rateSel[id];
  craft.syncFromMvu();
  记录刷新.value++; // 验收写了一条本地记录
}

/** 交付物品下拉候选：背包里数量 > 0 且不是图纸的物品名（Ruling N：图纸是生产资料，
 *  这里挡一道让玩家看不到选项；真正的拦截在 store.deliver，绕过 UI 也送不出去）。
 *  交付快照固定 数量=1，由 store.deliver 按死。 */
const bagNames = computed(() => 可交付候选(craft.bag));
/** 每张「我接的」单的交付选择（订单 id → 物品名） */
const deliverSel = reactive<Record<string, string>>({});

async function 交付(id: string): Promise<void> {
  const n = deliverSel[id];
  if (!n) return;
  const ok = await store.deliver(id, n);
  if (ok) delete deliverSel[id];
  craft.syncFromMvu(); // 交付从背包取走了一件：下拉候选要看到新背包
}

// ---------------- 弃单（两段确认：先亮代价，再执行） ----------------
// 不用 confirm() 弹窗（移动端兼容差）：第一次点击武装，按钮文案变成代价确认；第二次才执行。
// 武装态不落任何数据，切单/刷新即自然失效。
const abandonArm = reactive<Record<string, boolean>>({});

async function 弃单(o: 订单): Promise<void> {
  if (!abandonArm[o.id]) {
    for (const k of Object.keys(abandonArm)) delete abandonArm[k]; // 同时只武装一张单，避免多点
    abandonArm[o.id] = true;
    return;
  }
  delete abandonArm[o.id];
  await store.abandon(o.id);
  craft.syncFromMvu(); // 弃单扣了赔偿：余额判定要看到新 UP
  记录刷新.value++;
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
  craft.syncFromMvu();    // 领取可能加了 UP/入了包（first=true 的条目）：余额判定与交付下拉要看到新值
  记录刷新.value++;       // 领取可能记了「完成」记录
}

// ---------------- 订单记录（localStorage；动作后 bump 计数重读） ----------------
const 记录刷新 = ref(0);
const 记录列表 = computed<订单记录[]>(() => {
  void 记录刷新.value;
  return loadHistory().slice().reverse(); // 新的在前
});

// ---------------- 店铺排行 ----------------
const 店铺榜行 = computed(() => shopBoardRows(store.shopBoard));
async function 切排行(): Promise<void> {
  sub.value = 'rank';
  await store.refreshShopRank();
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
.ord-deliverhint { font-size: 11px; opacity: 0.65; margin-top: 2px; }

/* 店铺排行 */
.ord-rankrow { display: flex; align-items: center; gap: 8px; padding: 5px 8px; border-radius: 6px; font-size: 12px; }
.ord-rankrow.mine { background: rgba(184, 134, 11, 0.15); font-weight: 700; }
.ord-rk { width: 34px; opacity: 0.7; }
.ord-rn { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ord-rs { font-variant-numeric: tabular-nums; }
.ord-gap { text-align: center; flex: 1; opacity: 0.5; }
.ord-ratesel { max-width: 46%; font-size: 12px; }
</style>
