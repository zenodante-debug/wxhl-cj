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

    <!-- 结算日志 -->
    <div class="battle-log">
      <div v-for="(s, i) in 日志" :key="i" class="log-entry">{{ s }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { 距离带 } from '../engine/distance';
import type { 战斗状态, 战斗单位 } from '../types';

const props = defineProps<{
  状态: 战斗状态;
  日志: string[];
}>();

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

.battle-log { border-top: 1px solid #2a2a2a; padding-top: 10px; max-height: 30vh; overflow-y: auto; }
.log-entry { padding: 3px 0; font-size: 13px; color: #bbb; }
</style>
