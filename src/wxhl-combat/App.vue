<template>
  <div class="wxhl-combat-root">
    <!-- 全屏覆盖层 -->
    <div v-if="visible" class="combat-overlay">
      <div class="combat-panel">
        <h1>无限回廊 · 战斗引擎</h1>
        <p>战斗系统开发中</p>
        <button @click="visible = false">关闭</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const visible = ref(false);

// TODO: 战斗状态管理
// TODO: 开战检测
// TODO: 战斗 UI
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
