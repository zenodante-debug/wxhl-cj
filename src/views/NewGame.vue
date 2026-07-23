<template>
  <CorridorTunnel ref="tunnelRef">
    <template #particles>
      <EmberParticles :particle-count="40" base-color="180,80,30" :speed="0.08" />
    </template>

    <div class="newgame-content">
      <a class="back-link" @click="goBack">← 回廊入口</a>

      <RustFrame title="契 约 者 创 建" class="newgame-panel">
        <div class="placeholder-area">
          <div class="placeholder-icon">⌂</div>
          <div class="placeholder-title">即 将 开 放</div>
          <div class="placeholder-desc">内容敬请期待...</div>
        </div>
      </RustFrame>

      <button class="confirm-btn" disabled>确认创建</button>
    </div>
  </CorridorTunnel>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import CorridorTunnel from '../components/CorridorTunnel.vue'
import EmberParticles from '../components/EmberParticles.vue'
import RustFrame from '../components/RustFrame.vue'
import { useGameStore } from '../store/game'

const router = useRouter()
const store = useGameStore()

onMounted(() => {
  const tl = gsap.timeline({ delay: 0.4 })
  tl.fromTo('.newgame-content', { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' })
})

function goBack() {
  store.pullBack()
  router.push('/')
}
</script>

<style scoped>
.newgame-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  padding: 20px;
}

.back-link {
  align-self: flex-start;
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--amber-dim);
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
  margin-bottom: 12px;
}

.back-link:hover {
  color: var(--amber);
}

.newgame-panel {
  width: 75%;
  max-width: 400px;
}

.placeholder-area {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32px 0;
  border: 1px dashed rgba(100, 50, 20, 0.3);
  min-height: 120px;
}

.placeholder-icon {
  font-size: 2rem;
  color: var(--iron);
  margin-bottom: 12px;
}

.placeholder-title {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 3px;
  color: var(--amber-dim);
  margin-bottom: 8px;
}

.placeholder-desc {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--chalk-dim);
}

.confirm-btn {
  margin-top: 20px;
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 4px;
  padding: 10px 32px;
  background: rgba(10, 6, 4, 0.5);
  border: 2px solid var(--iron-dark);
  color: var(--chalk-dim);
  opacity: 0.4;
  pointer-events: none;
}
</style>
