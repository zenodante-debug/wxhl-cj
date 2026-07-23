<template>
  <div class="title-screen">
    <CorridorTunnel>
      <EmberParticles :particleCount="60" />
      <template #particles>
        <EmberParticles :particleCount="40" baseColor="160,40,10" :speed="0.15" />
      </template>
    </CorridorTunnel>
  </div>
</template>

<script setup lang="ts">
import CorridorTunnel from '../components/CorridorTunnel.vue'
import EmberParticles from '../components/EmberParticles.vue'
</script>

<style scoped>
.title-screen {
  max-width: 800px;
  width: 100%;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  position: relative;
  background: var(--bg-void);
}
</style>
