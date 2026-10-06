<template>
  <div class="combat-view-root">
    <SetupView v-if="阶段 === '准备'" @开战="开始战斗" />
    <template v-else-if="阶段 === '战斗'">
      <BattleView :状态="战斗" :日志="日志" />
      <PendingModal :待决="战斗.待决" @决策="处理决策" />
    </template>
    <div v-else class="settle-stage">
      <h3>战斗结束</h3>
      <p class="dim">正在生成收尾正文…</p>
      <button @click="回准备">回到准备</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue';
import SetupView from './SetupView.vue';
import BattleView from './BattleView.vue';
import PendingModal from './PendingModal.vue';
import { 开场距离随机, 开场距离选项 } from '../engine/setup';
import { 读战斗状态, 写战斗状态 } from '../store';
import type { 战斗状态 } from '../types';

const 阶段 = ref<'准备' | '战斗' | '收尾'>('准备');
const 战斗 = ref<战斗状态>({
  进行中: false, 回合: 0, 先攻: [], 单位: {}, 待决: null, 领域: [],
});
const 日志 = ref<string[]>([]);

onMounted(async () => {
  // 刷新恢复（Review Focus 2）
  const 恢复 = await 读战斗状态();
  if (恢复) {
    战斗.value = 恢复;
    阶段.value = '战斗';
    日志.value.push('已从持久化恢复战斗');
  }
});

async function 开始战斗(选择: { id: string; 阵营: '我方' | '敌方' }[], 开场模式: string) {
  // TODO(Task 13)：读实体、翻译技能、先攻、初始化战斗状态
  const 选项 = 开场距离选项().find(o => o.名 === 开场模式)!;
  const 开场距离 = 开场距离随机(选项.范围);
  日志.value.push(`开战：${开场模式}，开场距离 ${开场距离}米`);
  阶段.value = '战斗';
}

function 处理决策(选择: string) {
  日志.value.push(`玩家决策: ${选择}`);
  战斗.value.待决 = null;
}

async function 回准备() {
  await 写战斗状态(null);
  阶段.value = '准备';
}
</script>
