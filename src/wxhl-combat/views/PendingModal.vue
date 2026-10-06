<template>
  <div v-if="待决" class="pending-backdrop">
    <div class="pending-modal">
      <template v-if="待决.类 === '打断'">
        <h4>敌方要出手了（可打断）</h4>
        <p>{{ 待决.攻方 }} → {{ 待决.守方 }}</p>
        <div class="btns">
          <button @click="emit('决策', '击溃')">击溃</button>
          <button @click="emit('决策', '识破')">识破</button>
          <button @click="emit('决策', '不打断')">不打断</button>
        </div>
      </template>

      <template v-else-if="待决.类 === '防御'">
        <h4>你将被击中，造成 {{ 待决.伤害 }} 点</h4>
        <div class="btns">
          <button @click="emit('决策', '招架')">招架</button>
          <button @click="emit('决策', '闪避')">闪避</button>
          <button @click="emit('决策', '格挡')">格挡</button>
          <button @click="emit('决策', '闪烁')">闪烁</button>
          <button @click="emit('决策', '受着')">受着</button>
        </div>
      </template>

      <template v-else-if="待决.类 === '转阶段'">
        <h4>BOSS 转阶段（{{ 待决.阈值 }}）</h4>
        <p>将清除负面状态、获得护盾，并强制施放必杀职业技能</p>
        <div class="btns">
          <button @click="emit('决策', '确认')">确认</button>
        </div>
      </template>

      <template v-else-if="待决.类 === '濒死'">
        <h4>{{ 待决.id }} 濒死判定</h4>
        <p>已成功 {{ 待决.已成功 }} 次，已失败 {{ 待决.已失败 }} 次（3 败死亡，2 成稳定）</p>
        <div class="btns">
          <button @click="emit('决策', '判定')">进行 CON 判定（DC12）</button>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { 待决点 } from '../types';

defineProps<{ 待决: 待决点 | null }>();
const emit = defineEmits<{ (e: '决策', 选择: string): void }>();
</script>

<style scoped lang="scss">
.pending-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2147483646;
}
.pending-modal {
  background: #1c1c1c;
  border: 1px solid #444;
  border-radius: 10px;
  padding: 20px 24px;
  color: #ddd;
  min-width: 320px;

  h4 { margin: 0 0 10px; }
  p { color: #999; font-size: 13px; }
  .btns { display: flex; gap: 8px; margin-top: 14px; flex-wrap: wrap; }
  .btns button {
    padding: 8px 14px;
    background: #242424;
    border: 1px solid #444;
    border-radius: 6px;
    color: #eee;
    cursor: pointer;
    &:hover { background: #333; }
  }
}
</style>
