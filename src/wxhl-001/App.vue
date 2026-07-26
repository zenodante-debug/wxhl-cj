<template>
  <div id="hud-bar">
    <!-- HP -->
    <div class="hud-stat">
      <span class="hud-label">HP</span>
      <div class="hud-track">
        <div class="hud-fill hp" :style="{ width: hpPercent + '%' }"></div>
      </div>
      <span class="hud-num">{{ hpCurrent }} / {{ hpMax }}</span>
    </div>

    <!-- MP -->
    <div class="hud-stat">
      <span class="hud-label">MP</span>
      <div class="hud-track">
        <div class="hud-fill mp" :style="{ width: mpPercent + '%' }"></div>
      </div>
      <span class="hud-num">{{ mpCurrent }} / {{ mpMax }}</span>
    </div>

    <!-- 耐力 -->
    <div class="hud-stat">
      <span class="hud-label">耐力</span>
      <div class="hud-track">
        <div class="hud-fill sp" :style="{ width: spPercent + '%' }"></div>
      </div>
      <span class="hud-num">{{ spCurrent }} / {{ spMax }}</span>
    </div>

    <!-- 契约者名称 -->
    <div class="hud-stat hud-name">
      <span class="hud-label">契约者</span>
      <span class="hud-num">{{ name }}</span>
    </div>

    <!-- 生命状态 -->
    <div class="hud-stat">
      <span class="hud-label">状态</span>
      <span class="hud-num" :class="{ danger: isDanger }">{{ lifeState }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useDataStore } from './store';

const store = useDataStore();

const hpCurrent = computed(() => store.data.契约者.衍生属性.HP_当前);
const hpMax = computed(() => store.data.契约者.衍生属性.HP_最大);
const hpPercent = computed(() =>
  Math.min((hpCurrent.value / Math.max(hpMax.value, 1)) * 100, 100),
);

const mpCurrent = computed(() => store.data.契约者.衍生属性.MP_当前);
const mpMax = computed(() => store.data.契约者.衍生属性.MP_最大);
const mpPercent = computed(() =>
  Math.min((mpCurrent.value / Math.max(mpMax.value, 1)) * 100, 100),
);

const spCurrent = computed(() => store.data.契约者.衍生属性.耐力_当前);
const spMax = computed(() => store.data.契约者.衍生属性.耐力_最大);
const spPercent = computed(() =>
  Math.min((spCurrent.value / Math.max(spMax.value, 1)) * 100, 100),
);

const name = computed(() => store.data.契约者.头部.姓名);
const lifeState = computed(() => store.data.契约者.状态.生命状态);

/** 生命状态不为"健康"时高亮为危险色 */
const isDanger = computed(() => lifeState.value !== '健康');
</script>

<style lang="scss" scoped>
/* ============================================================
   HUD BAR — 底部状态条
   无限回廊 · 铁锈凝血美学
   ============================================================ */

#hud-bar {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
  width: 100%;
  padding: 8px 24px;
  background: linear-gradient(
    0deg,
    rgba(8, 5, 4, 0.95) 0%,
    rgba(12, 8, 6, 0.9) 60%,
    transparent 100%
  );
  border-top: 1px solid rgba(60, 30, 20, 0.2);
}

.hud-stat {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: var(--font-mono);
}

.hud-label {
  font-size: 0.8rem;
  letter-spacing: 2px;
  color: var(--amber-dim);
  width: 36px;
  text-align: right;
  font-family: var(--font-display);
}

.hud-track {
  width: 100px;
  height: 6px;
  background: rgba(20, 12, 8, 0.6);
  border: 1px solid rgba(100, 50, 20, 0.3);
  overflow: hidden;
  border-radius: 2px;
}

.hud-fill {
  height: 100%;
  transition: width 0.6s;
}

.hud-fill.hp {
  background: linear-gradient(90deg, #2a0808, #7a1818);
}

.hud-fill.mp {
  background: linear-gradient(90deg, #2a4040, #4a7060);
}

.hud-fill.sp {
  background: linear-gradient(90deg, #1a0a05, #5a2812);
}

.hud-num {
  font-size: 0.85rem;
  color: var(--chalk);
  min-width: 65px;
  letter-spacing: 1px;
  white-space: nowrap;
}

.hud-num.danger {
  color: var(--blood-wet);
}

.hud-name {
  margin-left: auto;
}

.hud-name .hud-num {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 3px;
  color: var(--amber);
  font-weight: 700;
}

/* ============ 响应式 ============ */
@media (max-width: 768px) {
  #hud-bar {
    gap: 10px;
    padding: 6px 10px;
  }

  .hud-track {
    width: 60px;
  }

  .hud-num {
    font-size: 0.72rem;
    min-width: 50px;
  }

  .hud-label {
    font-size: 0.68rem;
    width: 26px;
  }
}

@media (max-width: 480px) {
  #hud-bar {
    gap: 4px;
    padding: 4px 6px;
  }

  .hud-track {
    width: 40px;
    height: 5px;
  }

  .hud-label {
    font-size: 0.6rem;
    width: 22px;
  }

  .hud-num {
    font-size: 0.6rem;
    min-width: 40px;
  }
}
</style>
