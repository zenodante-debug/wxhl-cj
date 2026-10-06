<template>
  <div class="battle-view">
    <div class="battle-header">
      <h3>第 {{ 状态.回合 }} 回合</h3>
      <div class="order">先攻：{{ 状态.先攻.join(' → ') }}</div>
    </div>

    <!-- 一维距离条 -->
    <div class="distance-bar">
      <div
        v-for="u in 排序单位"
        :key="u.id"
        class="distance-marker"
        :class="{ ally: u.阵营 === '我方', enemy: u.阵营 === '敌方' }"
        :style="{ left: 距离百分比(u.距离) + '%' }"
        :title="`${u.id} · ${u.距离}米`"
      >
        {{ u.名称 }}
      </div>
    </div>

    <!-- 单位卡 -->
    <div class="unit-cards">
      <div
        v-for="u in 排序单位"
        :key="u.id"
        class="unit-card"
        :class="{ enemy: u.阵营 === '敌方', ally: u.阵营 === '我方', dead: u.濒死 !== null }"
      >
        <div class="unit-name">{{ u.名称 }}</div>
        <div class="unit-hp">HP {{ u.HP_当前 }}/{{ u.HP_最大 }}</div>
        <div class="unit-dist">{{ u.距离 }}米（{{ 距离带(u.距离) }}）</div>
        <div class="unit-slots">主{{ u.行动槽.主要 }} 次{{ u.行动槽.次要 }} 移{{ u.行动槽.移动 }} 反{{ u.行动槽.反应 }}</div>
        <div v-if="u.状态.length" class="unit-status">状态: {{ u.状态.map(s => s.名 + (s.层数 ? `×${s.层数}` : '')).join('，') }}</div>
        <div v-if="u.护盾 > 0" class="unit-shield">护盾: {{ u.护盾 }}</div>
      </div>
    </div>

    <!-- 行动区：玩家填槽 → 「执行本轮」 -->
    <div class="action-zone">
      <!-- 敌方意图（阶段 ③ 预公开）；未开战/无意图时不渲染 -->
      <div v-if="敌方意图?.length" class="intent-block">
        <div class="intent-title">敌方意图</div>
        <div v-for="(yi, i) in 敌方意图" :key="i" class="intent-row">
          <span class="intent-unit">{{ yi.单位 }}</span>
          <span class="intent-acts">{{ yi.行动.map(a => a.类型 + (a.技能 ? `（${a.技能}）` : '')).join(' → ') }}</span>
        </div>
      </div>

      <!-- 行动槽：四个控件 -->
      <div class="slot-row">
        <label class="slot">
          <span class="slot-label">主要</span>
          <select v-model="槽填写.主要">
            <option value="">（不出手）</option>
            <option v-for="s in 我方技能名" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="slot">
          <span class="slot-label">次要</span>
          <select v-model="槽填写.次要">
            <option value="">（不出手）</option>
            <option v-for="s in 我方技能名" :key="s" :value="s">{{ s }}</option>
          </select>
        </label>
        <label class="slot">
          <span class="slot-label">移动（目标距离·米）</span>
          <input type="number" min="0" v-model.number="槽填写.移动" />
        </label>
        <label class="slot">
          <span class="slot-label">反应</span>
          <select v-model="槽填写.反应">
            <option value="">不预置</option>
            <option v-for="r in 反应选项" :key="r" :value="r">{{ r }}</option>
          </select>
        </label>
      </div>

      <!-- 目标 + 执行 -->
      <div class="action-submit">
        <label class="slot">
          <span class="slot-label">目标</span>
          <select v-model="目标">
            <option value="">（选择目标）</option>
            <option v-for="e in 敌方单位名" :key="e" :value="e">{{ e }}</option>
          </select>
        </label>
        <button class="execute-btn" :disabled="!可提交(槽填写) || 禁用" @click="执行本轮">执行本轮</button>
      </div>
    </div>

    <!-- 结算日志 -->
    <div class="battle-log">
      <div v-for="(s, i) in 日志" :key="i" class="log-entry">{{ s }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { 距离带 } from '../engine/distance';
import { 可提交, type 行动槽填写 } from '../engine/actionInput';
import type { 敌方意图 } from '../ai/enemyTactics';
import type { 战斗状态, 战斗单位 } from '../types';

const props = defineProps<{
  状态: 战斗状态;
  日志: string[];
  /** 敌方意图（阶段 ③ 预公开）；未开战时为空数组 */
  敌方意图?: 敌方意图[];
  /** 上层忙碌（回合编排 / 本轮结算中）→ 禁用「执行本轮」，挡异步重入 */
  禁用?: boolean;
}>();

const emit = defineEmits<{ (e: '执行本轮', 填写: 行动槽填写, 目标: string): void }>();

// 距玩家排序（0 在前）—— 只补名称，不动其他字段（HP 等保持原样）
const 排序单位 = computed(() =>
  Object.values(props.状态.单位)
    .map(u => ({ ...u, 名称: u.id.split('.').pop() || u.id }))
    .sort((a, b) => a.距离 - b.距离),
);

const 最大距离 = computed(() => Math.max(100, ...排序单位.value.map(u => u.距离)));
function 距离百分比(d: number): number {
  return Math.min(100, (d / 最大距离.value) * 100);
}

// ==================== 玩家行动区 ====================

/** 玩家单位「契约者」的技能名列表（= 状态.单位['契约者'].技能 的键） */
const 我方技能名 = computed(() => Object.keys(props.状态.单位['契约者']?.技能 ?? {}));

/** 所有敌方单位的短名（状态.单位 里 阵营 === '敌方' 的键） */
const 敌方单位名 = computed(() =>
  Object.entries(props.状态.单位)
    .filter(([, u]) => u.阵营 === '敌方')
    .map(([名]) => 名),
);

/** 反应槽可选项（空 = 不预置） */
const 反应选项 = ['击溃', '识破', '招架', '闪避', '格挡', '闪烁'];

const 槽填写 = ref<行动槽填写>({});
const 目标 = ref('');

// 目标默认值：只有一个敌人时自动选中它；所选目标失效时重置
watch(
  敌方单位名,
  列表 => {
    if (!列表.includes(目标.value)) 目标.value = 列表.length === 1 ? 列表[0] : '';
  },
  { immediate: true },
);

/** 「执行本轮」：交出行槽 + 目标，随后清空四个槽（避免下一回合误带上一轮的选择） */
function 执行本轮(): void {
  if (!可提交(槽填写.value)) return;
  emit('执行本轮', 槽填写.value, 目标.value);
  槽填写.value = {};
}
</script>

<style scoped lang="scss">
.battle-view { color: #ddd; }
.battle-header { margin-bottom: 12px; }
.order { color: #999; font-size: 13px; }

.distance-bar {
  position: relative;
  height: 46px;
  margin: 16px 0;
  border-bottom: 2px solid #444;
}
.distance-marker {
  position: absolute;
  bottom: 6px;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  white-space: nowrap;

  &.ally { background: #1d3a1d; border: 1px solid #3a6a3a; color: #9d9; }
  &.enemy { background: #3a1d1d; border: 1px solid #6a3a3a; color: #d99; }
}

.unit-cards { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.unit-card {
  padding: 10px 12px;
  border: 1px solid #333;
  border-radius: 8px;
  min-width: 150px;
  &.enemy { border-color: #6a3a3a; }
  &.ally { border-color: #3a6a3a; }
  &.dead { opacity: 0.5; }
  .unit-name { font-weight: 700; }
  .unit-hp { color: #f88; font-size: 13px; }
  .unit-dist, .unit-slots { color: #999; font-size: 12px; }
  .unit-status { color: #fa0; font-size: 12px; }
  .unit-shield { color: #8af; font-size: 12px; }
}

.action-zone {
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1a1a1a;
}
.intent-block { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #333; }
.intent-title { color: #d99; font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.intent-row { font-size: 12px; color: #bbb; }
.intent-unit { color: #d99; margin-right: 8px; }

.slot-row { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 10px; }
.slot { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #999; }
.slot-label { color: #999; }
.slot select, .slot input {
  background: #101010;
  color: #ddd;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 13px;
}
.slot input[type='number'] { width: 90px; }

.action-submit { display: flex; gap: 10px; align-items: flex-end; }
.execute-btn {
  background: #1d3a1d;
  color: #9d9;
  border: 1px solid #3a6a3a;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;

  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:not(:disabled):hover { background: #254a25; }
}

.battle-log { border-top: 1px solid #2a2a2a; padding-top: 10px; max-height: 30vh; overflow-y: auto; }
.log-entry { padding: 3px 0; font-size: 13px; color: #bbb; }
</style>
