<template>
  <CorridorTunnel ref="tunnelRef" aspect-ratio="9 / 16">
    <template #particles>
      <EmberParticles :particle-count="60" base-color="180,80,30" :speed="0.12" />
    </template>

    <!-- Doors (behind content, in the corridor) -->
    <div class="doors-container" ref="doorsRef">
      <div class="door-frame">
        <div class="door door-left" ref="doorLeftRef">
          <div class="door-panel">
            <div class="door-rivet r1"></div>
            <div class="door-rivet r2"></div>
            <div class="door-rivet r3"></div>
            <div class="door-rivet r4"></div>
            <div class="door-symbol">◆</div>
          </div>
        </div>
        <div class="door door-right" ref="doorRightRef">
          <div class="door-panel">
            <div class="door-rivet r1"></div>
            <div class="door-rivet r2"></div>
            <div class="door-rivet r3"></div>
            <div class="door-rivet r4"></div>
            <div class="door-symbol">◆</div>
          </div>
        </div>
      </div>
      <!-- Light behind doors -->
      <div class="door-light" ref="doorLightRef"></div>
    </div>

    <!-- Content overlay -->
    <div class="title-content" ref="contentRef">
      <h1 ref="titleRef" class="game-title">无 限 回 廊</h1>
      <p ref="authorRef" class="author-name">z e n o</p>
      <button
        ref="btnRef"
        class="start-btn"
        :class="{ 'btn-hidden': animating }"
        :disabled="animating"
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
const contentRef = ref<HTMLElement | null>(null)
const doorsRef = ref<HTMLElement | null>(null)
const doorLeftRef = ref<HTMLElement | null>(null)
const doorRightRef = ref<HTMLElement | null>(null)
const doorLightRef = ref<HTMLElement | null>(null)

const animating = ref(false)

onMounted(() => {
  const tl = gsap.timeline({ paused: false })

  // Set initial states
  gsap.set('.portal-glow', { opacity: 0 })
  gsap.set('.wall-left .rust-patches', { opacity: 0 })
  gsap.set('.wall-right .rust-patches', { opacity: 0 })
  gsap.set('.bulb-glass', { opacity: 0 })
  gsap.set(titleRef.value, { opacity: 0, filter: 'blur(8px)', letterSpacing: '20px' })
  gsap.set(authorRef.value, { opacity: 0, y: 10 })
  gsap.set(btnRef.value, { opacity: 0, scale: 0.95 })
  gsap.set(doorsRef.value, { opacity: 0 })

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
    // Fade in doors behind the UI
    .to(doorsRef.value, { opacity: 1, duration: 0.6, ease: 'power2.in' }, 1.0)

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
  if (animating.value) return
  animating.value = true

  // Kill button pulse
  gsap.killTweensOf(btnRef.value)

  const tl = gsap.timeline({
    onComplete: () => {
      const lastId = typeof getLastMessageId === 'function' ? getLastMessageId() : 0
      store.pushDeeper()
      if (lastId === 0) {
        router.push('/new-game')
      } else {
        router.push('/main')
      }
    },
  })

  // Fade out title + button
  tl.to([titleRef.value, authorRef.value, btnRef.value], {
    opacity: 0, y: -20, duration: 0.5, ease: 'power3.in',
  }, 0)

  // Light blazes from behind doors
  tl.to(doorLightRef.value, {
    opacity: 1,
    duration: 0.4,
    ease: 'power2.in',
  }, 0.3)

  // Doors swing open - left rotates left, right rotates right
  tl.to(doorLeftRef.value, {
    rotateY: -110,
    duration: 1.0,
    ease: 'power3.inOut',
  }, 0.5)

  tl.to(doorRightRef.value, {
    rotateY: 110,
    duration: 1.0,
    ease: 'power3.inOut',
  }, 0.5)

  // Light fades to white as we "walk through"
  tl.to(doorLightRef.value, {
    scale: 3,
    opacity: 0,
    duration: 0.6,
    ease: 'power2.in',
  }, 1.3)

  // Camera push forward
  tl.to(doorsRef.value, {
    scale: 2.5,
    opacity: 0,
    duration: 0.7,
    ease: 'power3.in',
  }, 1.1)
}

function onBtnHover() {
  if (animating.value) return
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
  if (animating.value) return
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
  if (animating.value) return
  gsap.to(btnRef.value, {
    scale: 0.97,
    borderColor: 'var(--blood-wet)',
    boxShadow: '0 0 32px rgba(160, 30, 20, 0.5)',
    duration: 0.1,
    ease: 'power2.out',
  })
}

function onBtnUp() {
  if (animating.value) return
  gsap.to(btnRef.value, {
    scale: 1.03,
    duration: 0.1,
    ease: 'power2.out',
  })
}
</script>

<style scoped>
/* ===== Content ===== */
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

.start-btn.btn-hidden {
  pointer-events: none;
}

.btn-diamond {
  font-size: 0.7rem;
  color: var(--amber-dim);
  display: inline-block;
}

.btn-diamond.left { margin-right: 8px; }
.btn-diamond.right { margin-left: 8px; }

/* ===== Doors Container ===== */
.doors-container {
  position: absolute;
  top: 12%;
  bottom: 20%;
  left: 18%;
  right: 18%;
  z-index: 30;
  display: flex;
  align-items: center;
  justify-content: center;
  perspective: 800px;
  transform-origin: center center;
}

/* ===== Door Frame ===== */
.door-frame {
  width: 100%;
  height: 100%;
  position: relative;
  border: 4px solid var(--iron);
  box-shadow: inset 0 0 60px rgba(0, 0, 0, 0.7), 0 0 0 2px rgba(100, 40, 20, 0.3);
  background: #060302;
}

/* ===== Individual Doors ===== */
.door {
  position: absolute;
  top: 0;
  bottom: 0;
  width: 50%;
  transform-origin: center left;
}

.door-left {
  left: 0;
  transform-origin: left center;
}

.door-right {
  right: 0;
  transform-origin: right center;
}

.door-panel {
  width: 100%;
  height: 100%;
  background:
    linear-gradient(180deg, #1a120c 0%, #140c06 30%, #1a100a 60%, #120a05 100%);
  border: 2px solid var(--iron-dark);
  position: relative;
  box-shadow: inset 0 0 40px rgba(0, 0, 0, 0.5);
}

.door-left .door-panel {
  border-right: 1px solid rgba(120, 50, 20, 0.3);
  background:
    linear-gradient(90deg, #1a120c 0%, #231810 50%, #1a120c 100%),
    repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(40, 15, 5, 0.15) 8px, rgba(40, 15, 5, 0.15) 9px);
}

.door-right .door-panel {
  border-left: 1px solid rgba(120, 50, 20, 0.3);
  background:
    linear-gradient(270deg, #1a120c 0%, #231810 50%, #1a120c 100%),
    repeating-linear-gradient(0deg, transparent, transparent 8px, rgba(40, 15, 5, 0.15) 8px, rgba(40, 15, 5, 0.15) 9px);
}

/* Door rivets */
.door-rivet {
  position: absolute;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: radial-gradient(circle at 40% 35%, #3a3028, #1a1410);
  border: 1px solid rgba(60, 40, 20, 0.6);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
}

.door-left .door-rivet {
  right: 16px;
}

.door-right .door-rivet {
  left: 16px;
}

.r1 { top: 14%; }
.r2 { top: 38%; }
.r3 { top: 62%; }
.r4 { top: 86%; }

/* Door center symbol */
.door-symbol {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 1.5rem;
  color: var(--amber-dim);
  text-shadow: 0 0 8px rgba(200, 150, 80, 0.3);
  opacity: 0.6;
}

.door-left .door-symbol {
  right: 20px;
}

.door-right .door-symbol {
  left: 20px;
}

/* Light behind doors */
.door-light {
  position: absolute;
  inset: 0;
  background: radial-gradient(ellipse at center, rgba(255, 120, 30, 0.8) 0%, rgba(200, 60, 15, 0.5) 30%, rgba(120, 20, 5, 0.2) 60%, transparent 100%);
  opacity: 0;
  pointer-events: none;
  z-index: -1;
}
</style>
