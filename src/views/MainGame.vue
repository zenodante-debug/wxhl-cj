<template>
  <CorridorTunnel>
    <template #particles>
      <EmberParticles :particle-count="50" base-color="180,80,30" :speed="0.1" />
    </template>

    <div class="main-placeholder">
      <div class="placeholder-text">◆ 无限回廊 ◆</div>
      <div class="placeholder-sub">主页面（待从 wxhl 迁移）</div>
    </div>
  </CorridorTunnel>
</template>

<script setup lang="ts">
import CorridorTunnel from '../components/CorridorTunnel.vue'
import EmberParticles from '../components/EmberParticles.vue'
</script>

<style scoped>
.main-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.placeholder-text {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 6px;
  color: var(--amber);
}

.placeholder-sub {
  font-family: var(--font-mono);
  font-size: 0.75rem;
  color: var(--chalk-dim);
}
</style>
