<template>
  <div class="combat-view">
    <div class="combat-header">
      <h2>第 {{ 状态.回合 }} 回合</h2>
      <div class="initiative-order">
        先攻顺序：{{ 状态.先攻.join(' → ') }}
      </div>
    </div>

    <div class="combat-field">
      <div
        v-for="(单位, id) in 状态.单位"
        :key="id"
        class="unit-card"
        :class="{ enemy: 单位.阵营 === '敌方', ally: 单位.阵营 === '我方' }"
      >
        <div class="unit-name">{{ id }}</div>
        <div class="unit-hp">HP: {{ 单位.距离 }}m</div>
        <div class="unit-type">{{ 单位.类型 }}</div>
      </div>
    </div>

    <div class="combat-actions">
      <button @click="开始回合">开始回合</button>
      <button @click="攻击">攻击</button>
    </div>

    <div class="combat-log">
      <div v-for="(步骤, i) in 步骤列表" :key="i" class="log-entry">
        {{ 步骤.内容 }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 推进 } from '../engine/turn';
import type { 战斗状态, 结算步骤 } from '../types';

const 状态 = ref<战斗状态>({
  进行中: true,
  回合: 1,
  先攻: ['玩家', '敌人'],
  单位: {
    玩家: {
      id: '玩家',
      阵营: '我方',
      类型: '玩家',
      距离: 0,
      行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
      额度: 0,
      冷却: {},
      护盾: 0,
      架势: null,
      状态: [],
      濒死: null,
      资源: {},
      词条: new Set(),
    },
    敌人: {
      id: '敌人',
      阵营: '敌方',
      类型: '杂兵',
      距离: 10,
      行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
      额度: 0,
      冷却: {},
      护盾: 0,
      架势: null,
      状态: [],
      濒死: null,
      资源: {},
      词条: new Set(),
    },
  },
  待决: null,
  领域: [],
});

const 步骤列表 = ref<结算步骤[]>([]);

function 开始回合() {
  const { 状态: 新状态, 步骤 } = 推进(状态.value, { 类: '开始回合' });
  状态.value = 新状态;
  步骤列表.value.push(...步骤);
}

function 攻击() {
  // TODO: 实现攻击逻辑
  步骤列表.value.push({
    类: '攻击',
    内容: '玩家攻击敌人',
  });
}
</script>

<style scoped lang="scss">
.combat-view {
  padding: 16px;
  color: #fff;
  background: #1a1a1a;
  height: 100%;
  overflow-y: auto;
}

.combat-header {
  margin-bottom: 16px;

  h2 {
    margin: 0 0 8px 0;
    font-size: 20px;
  }

  .initiative-order {
    font-size: 14px;
    color: #aaa;
  }
}

.combat-field {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.unit-card {
  padding: 12px;
  border: 1px solid #333;
  border-radius: 4px;
  min-width: 120px;

  &.enemy {
    border-color: #a33;
  }

  &.ally {
    border-color: #3a3;
  }

  .unit-name {
    font-weight: bold;
    margin-bottom: 4px;
  }

  .unit-hp {
    font-size: 14px;
    color: #aaa;
  }

  .unit-type {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
  }
}

.combat-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;

  button {
    padding: 8px 16px;
    background: #333;
    border: 1px solid #555;
    border-radius: 4px;
    color: #fff;
    cursor: pointer;

    &:hover {
      background: #444;
    }
  }
}

.combat-log {
  border-top: 1px solid #333;
  padding-top: 12px;

  .log-entry {
    padding: 4px 0;
    font-size: 14px;
    color: #ccc;
  }
}
</style>
