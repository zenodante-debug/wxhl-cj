<template>
  <div class="setup-view">
    <div v-if="loading" class="hint">读取实体名单中…</div>
    <div v-else-if="名单.length === 0" class="hint">
      当前无可参战实体（MVU 变量里没有契约者/小队成员/副本角色）
    </div>

    <template v-else>
      <!-- 参战名单：一排石质铭牌，名字用衬线大字（决斗场点将台） -->
      <div class="setup-roster">
        <div class="roster-head">
          <span>参战</span><span>名称</span><span>类型</span><span>阶位</span><span>HP</span><span>阵营</span>
        </div>
        <template v-for="u in 名单" :key="u.id">
          <div class="plate-row" :class="{ off: !选中[u.id] }">
            <input type="checkbox" v-model="选中[u.id]" />
            <span class="plate-name">{{ u.名称 }}</span>
            <span class="dim">{{ u.类型 }}</span>
            <span class="dim">{{ u.阶位 }}</span>
            <span class="dim mono">{{ u.HP_当前 }}/{{ u.HP_最大 }}</span>
            <select v-model="阵营[u.id]" :disabled="!选中[u.id]">
              <option value="我方">我方</option>
              <option value="敌方">敌方</option>
              <option value="待定">不参战</option>
            </select>
          </div>

          <!-- 快捷物品栏：**每个我方单位各 3 个**（玩家口径）。
               选项 = **这个单位自己背包**里的物品（读变量拉取），带数量好决定带哪三件。 -->
          <div v-if="显示快捷栏(!!选中[u.id], 阵营[u.id])" class="quick-bar">
            <span class="quick-label">快捷物品栏</span>
            <select v-for="i in 栏位下标" :key="i" v-model="快捷[u.id][i]">
              <option value="">（空栏位）</option>
              <option v-for="物 in 背包表[u.id] ?? []" :key="物.名称" :value="物.名称">
                {{ 物.名称 }} ×{{ 物.数量 }}
              </option>
            </select>
            <span v-if="(背包表[u.id] ?? []).length === 0" class="dim">（这个单位的背包是空的）</span>
          </div>
        </template>
      </div>

      <div class="distance-row">
        <label>开场距离
          <select v-model="开场模式">
            <option v-for="o in 开场距离选项()" :key="o.名" :value="o.名">{{ o.名 }}（{{ o.范围[0] }}~{{ o.范围[1] }}米）</option>
          </select>
        </label>
        <span class="dim">实际距离开战时掷骰</span>
      </div>

      <button class="start-btn" :disabled="开战单位数 === 0 || 敌方单位数 === 0 || 忙碌 || 禁用" @click="开战">
        {{ 忙碌 ? '开战中…' : `开战（${开战单位数} 个单位）` }}
      </button>
      <!-- 没有敌方单位就开不了战（玩家实测：只勾了自己进去，出不来也没法结束） -->
      <p v-if="敌方单位数 === 0" class="no-enemy-hint">没有选任何敌方单位 —— 在名单里把对手勾成「敌方」才能开战</p>

      <!-- 开战要连发几十个 AI 请求（每个效果翻一次 + 一次敌方意图），没有进度就是「点了没反应」 -->
      <div v-if="忙碌" class="progress" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span>{{ 进度 || '准备中…' }}</span>
      </div>
      <div v-else-if="进度" class="progress done">{{ 进度 }}</div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import { 读取可参战单位, 读取背包, type 可参战单位, type 背包物品 } from '../store';
import { 造空栏位, 显示快捷栏, 收集快捷物品 } from '../engine/quickItems';
import { 开场距离选项 } from '../engine/setup';

defineProps<{
  /** 开战进行中：禁用按钮、显示进度 */
  忙碌?: boolean;
  /** 进度文案 */
  进度?: string;
  /** 另外的禁用理由（如：翻译复核未处理完，此时点开战会重跑整轮翻译） */
  禁用?: boolean;
}>();

const emit = defineEmits<{
  (e: '开战', 选择: { id: string; 阵营: '我方' | '敌方' }[], 开场模式: string, 快捷物品: Record<string, string[]>): void;
}>();

const loading = ref(true);
const 名单 = ref<可参战单位[]>([]);
const 选中 = ref<Record<string, boolean>>({});
const 阵营 = ref<Record<string, '我方' | '敌方' | '待定'>>({});
const 开场模式 = ref('对峙/室内');
/** 每个单位自己的背包（快捷物品栏的选项来源）—— 读**该单位自己**的，不是玩家的 */
const 背包表 = ref<Record<string, 背包物品[]>>({});
/** 每个单位的 3 个栏位（值 = 背包物品名，空串 = 没选） */
const 快捷 = ref<Record<string, string[]>>({});
/** 模板里 v-for 用的固定下标（别在模板里反复调函数造数组） */
const 栏位下标 = [0, 1, 2];

onMounted(async () => {
  try {
    名单.value = await 读取可参战单位();
    for (const u of 名单.value) {
      选中.value[u.id] = u.默认阵营 !== '待定';
      阵营.value[u.id] = u.默认阵营;
      快捷.value[u.id] = 造空栏位();
    }
    // 背包逐个读：**读不到就是空列表**（副本角色/其他契约者不一定有背包），绝不能因此开不了战。
    for (const u of 名单.value) {
      try {
        背包表.value[u.id] = await 读取背包(u.id);
      } catch {
        背包表.value[u.id] = [];
      }
    }
  } finally {
    loading.value = false;
  }
});

const 开战单位数 = computed(
  () => 名单.value.filter(u => 选中.value[u.id] && 阵营.value[u.id] !== '待定').length,
);

const 敌方单位数 = computed(
  () => 名单.value.filter(u => 选中.value[u.id] && 阵营.value[u.id] === '敌方').length,
);

function 开战() {
  const 选择 = 名单.value
    .filter(u => 选中.value[u.id] && 阵营.value[u.id] !== '待定')
    .map(u => ({ id: u.id, 阵营: 阵营.value[u.id] as '我方' | '敌方' }));
  emit('开战', 选择, 开场模式.value, 收集快捷物品(名单.value, 选中.value, 阵营.value, 快捷.value));
}
</script>

<style scoped lang="scss">
@use '../theme.scss' as t;

.setup-view {
  color: var(--cb-chalk-dim);
  font-family: var(--cb-font-body);
}

.hint {
  color: var(--cb-dim);
  padding: 24px;
  text-align: center;
  font-family: var(--cb-font-display);
  letter-spacing: 2px;
}

/* ---------- 点将台：一排石质铭牌 ---------- */
.setup-roster {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.roster-head {
  display: grid;
  grid-template-columns: 40px 1.5fr 1fr 0.8fr 0.8fr 0.9fr;
  gap: 8px;
  padding: 4px 12px;
  color: var(--cb-dim);
  font-size: 12px;
  letter-spacing: 2px;
  border-bottom: 1px solid var(--cb-border-soft);
}

.plate-row {
  @include t.cb-stone(8px 12px);
  display: grid;
  grid-template-columns: 40px 1.5fr 1fr 0.8fr 0.8fr 0.9fr;
  gap: 8px;
  align-items: center;
  transition: opacity 0.15s;

  &.off {
    opacity: 0.45;
  }
}

.plate-name {
  color: var(--cb-chalk);
  font-family: var(--cb-font-display);
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 1px;
}

.mono {
  font-family: var(--cb-font-mono);
  font-size: 12px;
}

.dim {
  color: var(--cb-dim);
  font-size: 13px;
}

/* 快捷物品栏：缩进在铭牌下面，和参战名单一眼能对上是谁的 */
.quick-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin: -2px 0 6px 40px;
  padding: 6px 12px;
  border-left: 2px solid var(--cb-border-soft);
  font-size: 13px;
}

.quick-label {
  color: var(--cb-dim);
  letter-spacing: 1px;
}

.quick-bar select {
  max-width: 180px;
}

.distance-row {
  @include t.cb-stone(10px 14px);
  margin: 14px 0;
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 决斗场闸门（开战） */
.start-btn {
  @include t.cb-gate;
}

.no-enemy-hint {
  margin-top: 8px;
  font-size: 12px;
  color: var(--cb-blood-wet);
}

select {
  @include t.cb-plaque;
  padding: 3px 8px;
}

input[type='checkbox'] {
  accent-color: var(--cb-amber);
}

.progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 12px;
  font-size: 13px;
  color: var(--cb-amber-dim);
  line-height: 1.5;

  &.done {
    color: var(--cb-copper);
  }
}

.spinner {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border: 2px solid var(--cb-border);
  border-top-color: var(--cb-amber);
  border-radius: 50%;
  animation: progress-spin 0.8s linear infinite;
}

@keyframes progress-spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
