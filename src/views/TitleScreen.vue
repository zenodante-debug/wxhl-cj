<template>
  <CorridorTunnel ref="tunnelRef">
    <template #particles>
      <EmberParticles :particle-count="60" base-color="180,80,30" :speed="0.12" />
    </template>

    <div class="title-content">
      <h1 ref="titleRef" class="game-title">无 限 回 廊</h1>
      <p ref="authorRef" class="author-name">z e n o</p>
      <button
        ref="btnRef"
        class="start-btn"
        @mouseenter="onBtnHover"
        @mouseleave="onBtnLeave"
        @mousedown="onBtnDown"
        @mouseup="onBtnUp"
        @click="enterCorridor"
      >
        <span class="btn-diamond left">◆</span>
        踏 入 回 廊
        <span class="btn-diamond right">◆</span>
      </button>
    </div>
  </CorridorTunnel>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import CorridorTunnel from '../components/CorridorTunnel.vue'
import EmberParticles from '../components/EmberParticles.vue'
import { useGameStore } from '../store/game'

const router = useRouter()
const store = useGameStore()

const tunnelRef = ref<InstanceType<typeof CorridorTunnel> | null>(null)
const titleRef = ref<HTMLElement | null>(null)
const authorRef = ref<HTMLElement | null>(null)
const btnRef = ref<HTMLElement | null>(null)

onMounted(() => {
  const tl = gsap.timeline({ paused: false })

  gsap.set('.portal-glow', { opacity: 0 })
  gsap.set('.wall-left .rust-patches', { opacity: 0 })
  gsap.set('.wall-right .rust-patches', { opacity: 0 })
  gsap.set('.bulb-glass', { opacity: 0 })
  gsap.set(titleRef.value, { opacity: 0, filter: 'blur(8px)', letterSpacing: '20px' })
  gsap.set(authorRef.value, { opacity: 0, y: 10 })
  gsap.set(btnRef.value, { opacity: 0, scale: 0.95 })

  tl.to('.title-scene', { opacity: 1, duration: 0.5, ease: 'power2.in' }, 0)
    .to('.portal-glow', { opacity: 0.5, duration: 0.8, ease: 'power2.in' }, 0.2)
    .to('.wall-left .rust-patches', { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.6)
    .to('.wall-right .rust-patches', { opacity: 1, duration: 0.4, ease: 'power2.out' }, 0.7)
    .to('.bulb-glass', { opacity: 1, duration: 0.3, ease: 'power2.out' }, 0.8)
    .to(titleRef.value, {
      opacity: 1,
      filter: 'blur(0px)',
      letterSpacing: '8px',
      duration: 0.8,
      ease: 'power3.out',
    }, 1.2)
    .to(authorRef.value, { opacity: 0.7, y: 0, duration: 0.5, ease: 'power2.out' }, 1.8)
    .to(btnRef.value, { opacity: 1, scale: 1, duration: 0.4, ease: 'back.out(1.4)' }, 2.4)

  tl.eventCallback('onComplete', () => {
    gsap.to(btnRef.value, {
      boxShadow: '0 0 20px rgba(200, 100, 30, 0.3)',
      duration: 1.5,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut',
    })
  })
})

function enterCorridor() {
  const lastId = getLastMessageId()
  store.pushDeeper()
  if (lastId === 0) {
    router.push('/new-game')
  } else {
    router.push('/main')
  }
}

function onBtnHover() {
  gsap.to(btnRef.value, {
    scale: 1.03,
    borderColor: 'var(--blood-bright)',
    boxShadow: '0 0 24px rgba(160, 30, 20, 0.4)',
    color: 'var(--emerge)',
    duration: 0.3,
    ease: 'power2.out',
  })
  gsap.to('.btn-diamond.left', { rotation: -45, duration: 0.3, ease: 'power2.out' })
  gsap.to('.btn-diamond.right', { rotation: 45, duration: 0.3, ease: 'power2.out' })
}

function onBtnLeave() {
  gsap.to(btnRef.value, {
    scale: 1,
    borderColor: 'var(--iron)',
    boxShadow: 'none',
    color: 'var(--amber)',
    duration: 0.3,
    ease: 'power2.out',
  })
  gsap.to('.btn-diamond.left', { rotation: 0, duration: 0.3, ease: 'power2.out' })
  gsap.to('.btn-diamond.right', { rotation: 0, duration: 0.3, ease: 'power2.out' })
}

function onBtnDown() {
  gsap.to(btnRef.value, {
    scale: 0.97,
    borderColor: 'var(--blood-wet)',
    boxShadow: '0 0 32px rgba(160, 30, 20, 0.5)',
    duration: 0.1,
    ease: 'power2.out',
  })
}

function onBtnUp() {
  gsap.to(btnRef.value, {
    scale: 1.03,
    duration: 0.1,
    ease: 'power2.out',
  })
}
</script>

<style scoped>
.title-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0;
}

.game-title {
  font-family: var(--font-display);
  font-size: 2.4rem;
  letter-spacing: 8px;
  color: var(--emerge);
  text-shadow: 0 0 20px rgba(200, 150, 80, 0.3);
  margin: 0;
  white-space: nowrap;
}

.author-name {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  letter-spacing: 4px;
  color: var(--amber-dim);
  margin-top: 12px;
  opacity: 0.7;
}

.start-btn {
  margin-top: 32px;
  font-family: var(--font-display);
  font-size: 1.2rem;
  letter-spacing: 6px;
  padding: 12px 40px;
  background: rgba(10, 6, 4, 0.7);
  border: 2px solid var(--iron);
  color: var(--amber);
  cursor: pointer;
  transition: none;
  position: relative;
  outline: none;
}

.btn-diamond {
  font-size: 0.7rem;
  color: var(--amber-dim);
  display: inline-block;
}

.btn-diamond.left { margin-right: 8px; }
.btn-diamond.right { margin-left: 8px; }
</style>
