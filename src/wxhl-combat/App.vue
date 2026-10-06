<template>
  <div class="wxhl-combat-root">
    <!-- 悬浮入口按钮（面板关闭时唯一可见物） -->
    <button
      v-if="!外壳.面板可见"
      class="combat-launcher"
      title="打开战斗引擎"
      @click="外壳 = 切换外壳(外壳, '打开')"
    >
      ⚔
    </button>

    <!-- 全屏覆盖层 -->
    <div v-if="外壳.面板可见" class="combat-overlay">
      <div class="combat-shell">
        <!-- 顶栏 -->
        <div class="shell-topbar">
          <span class="shell-title">无限回廊 · 战斗</span>
          <nav class="shell-tabs">
            <button
              v-for="tab in ['战斗', '设置'] as const"
              :key="tab"
              class="tab-btn"
              :class="{ active: 外壳.页签 === tab }"
              @click="外壳 = 切换页签(外壳, tab)"
            >
              {{ tab }}
            </button>
          </nav>
          <button class="shell-close" title="关闭" @click="外壳 = 切换外壳(外壳, '关闭')">✕</button>
        </div>

        <!-- 内容 -->
        <div class="shell-body">
          <CombatView v-if="外壳.页签 === '战斗'" />
          <SettingsView v-else />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { 外壳初始状态, 切换外壳, 切换页签, type 外壳状态 } from './engine/shell';
import CombatView from './views/CombatView.vue';
import SettingsView from './views/SettingsView.vue';

const 外壳 = ref<外壳状态>(外壳初始状态());
</script>

<style scoped lang="scss">
.wxhl-combat-root {
  position: fixed;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  // 必须高于 wxhl-003 的 #wxhl003-root（2147483640），见 spec §12.1
  z-index: 2147483645;
}

.combat-launcher {
  position: fixed;
  right: 18px;
  bottom: 90px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: 1px solid #555;
  background: #1a1a1a;
  color: #fff;
  font-size: 24px;
  cursor: pointer;
  pointer-events: auto;
  box-shadow: 0 4px 18px #000a;

  &:hover {
    background: #2a2a2a;
  }
}

.combat-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.82);
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: auto;
}

.combat-shell {
  width: min(1100px, 96vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  background: #141414;
  border: 1px solid #333;
  border-radius: 10px;
  overflow: hidden;
}

.shell-topbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  border-bottom: 1px solid #2a2a2a;
  background: #1a1a1a;
}

.shell-title {
  color: #e8e8e8;
  font-weight: 700;
  letter-spacing: 2px;
}

.shell-tabs {
  display: flex;
  gap: 6px;
  flex: 1;
}

.tab-btn {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 6px;
  color: #999;
  cursor: pointer;

  &.active {
    color: #fff;
    border-color: #555;
    background: #242424;
  }
}

.shell-close {
  padding: 4px 10px;
  background: transparent;
  border: 1px solid #444;
  border-radius: 6px;
  color: #bbb;
  cursor: pointer;

  &:hover {
    color: #fff;
    border-color: #a33;
    background: #3a1a1a;
  }
}

.shell-body {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}
</style>
