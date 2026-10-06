<template>
  <div class="wxhl-combat-root">
    <!-- 全屏覆盖层 -->
    <div v-if="visible" class="combat-overlay">
      <CombatView />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import CombatView from './CombatView.vue';

const visible = ref(true); // 开发阶段默认显示
</script>

<style scoped lang="scss">
.wxhl-combat-root {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 9999;
}

.combat-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.combat-panel {
  background: #1a1a1a;
  border: 1px solid #333;
  border-radius: 8px;
  padding: 24px;
  color: #fff;
  text-align: center;
}

button {
  margin-top: 16px;
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
</style>
