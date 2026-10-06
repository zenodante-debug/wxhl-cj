<template>
  <div class="combat-view-root">
    <template v-if="阶段 === '准备'">
      <SetupView @开战="开始战斗" />
      <!-- 开战失败（如 API 未配置）会留在此态：错误只在 日志 里，必须在这里也渲染出来 -->
      <div v-if="日志.length" class="prep-log">
        <div v-for="(s, i) in 日志" :key="i" class="prep-log-entry">{{ s }}</div>
      </div>
    </template>
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
import { 初始化战斗状态, 开场距离随机, 开场距离选项 } from '../engine/setup';
import { 读战斗状态, 写战斗状态, 读取战斗单位, 读取单位效果源, 翻译战斗解释 } from '../store';
import type { 单位效果源 } from '../store';
import type { 战斗状态, 战斗单位 } from '../types';

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
  日志.value = [];
  阶段.value = '准备'; // 失败时留在准备态（Review Focus 5）
  try {
    const 单位列表: 战斗单位[] = [];
    const 效果源: Record<string, 单位效果源[]> = {};
    for (const c of 选择) {
      单位列表.push(await 读取战斗单位(c.id, c.阵营));
      效果源[c.id] = await 读取单位效果源(c.id);
    }

    // 一次性翻译（整场缓存）。API 未配置时抛「API 未配置：请先在设置里配置 API」
    for (const u of 单位列表) {
      const 源 = 效果源[u.id] ?? [];
      if (源.length === 0) {
        u.技能 = {};
        continue;
      }
      u.技能 = await 翻译战斗解释(源);
    }

    const 选项 = 开场距离选项().find(o => o.名 === 开场模式) ?? 开场距离选项()[2];
    const 战斗0 = 初始化战斗状态(单位列表, 开场距离随机(选项.范围));
    战斗.value = 战斗0;
    await 写战斗状态(战斗0);
    日志.value.push(`开战：${开场模式}，共 ${单位列表.length} 个单位`);
    阶段.value = '战斗';
  } catch (e: any) {
    日志.value.push(`开战失败：${e?.message ?? e}`);
  }
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

<style scoped lang="scss">
.prep-log {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid #2a2a2a;

  .prep-log-entry { padding: 3px 0; font-size: 13px; color: #f99; }
}
</style>

