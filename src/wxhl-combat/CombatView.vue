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
        <div class="unit-hp">
          HP: {{ id === '玩家' ? 玩家属性.HP_当前 : 敌人属性.HP_当前 }}/{{
            id === '玩家' ? 玩家属性.HP_最大 : 敌人属性.HP_最大
          }}
        </div>
        <div class="unit-distance">距离: {{ 单位.距离 }}m ({{ id === '敌人' ? 敌人距离带 : '-' }})</div>
        <div class="unit-type">{{ 单位.类型 }}</div>
        <div class="unit-actions">
          行动槽: 主{{ 单位.行动槽.主要 }} 次{{ 单位.行动槽.次要 }} 移{{ 单位.行动槽.移动 }} 反{{ 单位.行动槽.反应 }}
        </div>
      </div>
    </div>

    <div class="combat-info">
      <div>玩家移动距离: {{ 玩家移动距离 }}米 | 当前额度: {{ 状态.单位.玩家.额度 }}米</div>
      <div>近战可攻击: {{ 近战可攻击 ? '✔' : '✗' }}</div>
    </div>

    <div class="combat-actions">
      <button @click="开始回合">开始回合</button>
      <button @click="攻击" :disabled="!近战可攻击">攻击</button>
      <button @click="移动('前进', 5)">前进 5米</button>
      <button @click="移动('前进', 10)">前进 10米</button>
      <button @click="移动('后退', 5)">后退 5米</button>
      <button @click="移动('后退', 10)">后退 10米</button>
    </div>

    <div class="combat-log">
      <div v-for="(步骤, i) in 步骤列表" :key="i" class="log-entry">
        {{ 步骤.内容 }}
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { 推进 } from '../engine/turn';
import { 攻击结算 } from '../engine/damage';
import { 射程校验, 移动距离计算, 距离带, 移动额度消耗, 借机攻击判定 } from '../engine/distance';
import { 行动槽消耗, 行动槽重置 } from '../engine/actionEconomy';
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

// 临时属性数据（第一阶段硬编码）
const 玩家属性 = ref({
  属性: { 实际: { STR: 25, AGI: 20, CON: 20, PER: 15 } },
  阶位: '二阶',
  HP_当前: 100,
  HP_最大: 100,
});

const 敌人属性 = ref({
  属性: { 实际: { STR: 15, AGI: 10, CON: 12, PER: 8 } },
  阶位: '一阶',
  HP_当前: 80,
  HP_最大: 80,
  闪避值: 12,
  防御: 3,
});

const 步骤列表 = ref<结算步骤[]>([]);

// 计算移动距离
const 玩家移动距离 = computed(() => {
  return 移动距离计算(玩家属性.value.属性.实际.AGI, 玩家属性.value.阶位, 0);
});

// 计算距离带
const 敌人距离带 = computed(() => {
  return 距离带(状态.value.单位.敌人.距离);
});

// 检查近战是否可以攻击
const 近战可攻击 = computed(() => {
  return 射程校验('近战', 状态.value.单位.敌人.距离);
});

function 开始回合() {
  // 重置行动槽
  状态.value.单位.玩家.行动槽 = 行动槽重置(状态.value.单位.玩家.行动槽);
  状态.value.单位.敌人.行动槽 = 行动槽重置(状态.value.单位.敌人.行动槽);

  // 重置移动额度
  状态.value.单位.玩家.额度 = 玩家移动距离.value;

  const { 状态: 新状态, 步骤 } = 推进(状态.value, { 类: '开始回合' });
  状态.value = 新状态;
  步骤列表.value.push(...步骤);
}

function 攻击() {
  // 检查射程
  if (!近战可攻击.value) {
    步骤列表.value.push({
      类: '攻击',
      内容: `❌ 射程不足：敌人在 ${状态.value.单位.敌人.距离}米（${敌人距离带.value}），近战无法攻击`,
    });
    return;
  }

  // 检查行动槽
  if (状态.value.单位.玩家.行动槽.主要 <= 0) {
    步骤列表.value.push({
      类: '攻击',
      内容: '❌ 行动槽不足：主要行动已用完',
    });
    return;
  }

  // 扣行动槽
  状态.value.单位.玩家.行动槽 = 行动槽消耗(状态.value.单位.玩家.行动槽, '主要行动');

  const 结果 = 攻击结算(玩家属性.value, 敌人属性.value);

  if (结果.命中) {
    敌人属性.value.HP_当前 = 结果.HP_新值;
    步骤列表.value.push({
      类: '攻击',
      内容: `✔ 玩家命中敌人，造成 ${结果.伤害} 点伤害 → 敌人 HP ${结果.HP_新值}/${敌人属性.value.HP_最大}`,
    });
  } else {
    步骤列表.value.push({
      类: '攻击',
      内容: '✗ 玩家攻击未命中',
    });
  }
}

function 移动(方向: '前进' | '后退', 移动量: number) {
  const 玩家 = 状态.value.单位.玩家;
  const 敌人 = 状态.value.单位.敌人;

  // 检查行动槽
  if (玩家.行动槽.移动 <= 0) {
    步骤列表.value.push({
      类: '移动',
      内容: '❌ 行动槽不足：移动已用完',
    });
    return;
  }

  // 检查移动额度
  if (移动量 > 玩家.额度) {
    步骤列表.value.push({
      类: '移动',
      内容: `❌ 移动额度不足：当前 ${玩家.额度} 米，需要 ${移动量} 米`,
    });
    return;
  }

  const 原距离 = 敌人.距离;
  let 新距离 = 原距离;

  if (方向 === '前进') {
    新距离 = Math.max(原距离 - 移动量, 0);
  } else {
    新距离 = 原距离 + 移动量;
  }

  // 检查借机攻击
  const 触发借机 = 借机攻击判定(原距离, 新距离, {});
  if (触发借机 && 敌人.行动槽.反应 > 0) {
    敌人.行动槽 = 行动槽消耗(敌人.行动槽, '反应动作');
    步骤列表.value.push({
      类: '借机攻击',
      内容: `⚠ 触发借机攻击：敌人用反应动作反击`,
    });
  }

  // 扣行动槽
  玩家.行动槽 = 行动槽消耗(玩家.行动槽, '移动');

  // 扣移动额度
  玩家.额度 = 移动额度消耗(玩家.额度, 移动量);

  // 更新距离
  敌人.距离 = 新距离;

  步骤列表.value.push({
    类: '移动',
    内容: `${方向 === '前进' ? '→' : '←'} 玩家${方向} ${移动量}米（额度 ${玩家.额度 + 移动量}→${玩家.额度}），敌人距离 ${敌人.距离}米`,
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
  min-width: 140px;

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

  .unit-distance {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
  }

  .unit-type {
    font-size: 12px;
    color: #888;
    margin-top: 4px;
  }

  .unit-actions {
    font-size: 11px;
    color: #666;
    margin-top: 6px;
    padding-top: 6px;
    border-top: 1px solid #333;
  }
}

.combat-info {
  margin-bottom: 16px;
  padding: 8px;
  background: #222;
  border-radius: 4px;
  font-size: 14px;
  color: #aaa;

  div {
    padding: 2px 0;
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
