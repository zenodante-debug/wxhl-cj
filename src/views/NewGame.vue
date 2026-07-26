<template>
  <div class="newgame-root">
    <!-- Choice Screen: Behind the door, interior with two doors -->
    <div v-if="screen === 'choice'" class="choice-screen">
      <!-- Interior background -->
      <div class="interior-bg">
        <!-- Ceiling -->
        <div class="int-ceiling">
          <div class="int-pipe p1"></div>
          <div class="int-pipe p2"></div>
          <div class="int-bulb">
            <div class="int-bulb-wire"></div>
            <div class="int-bulb-glass"></div>
          </div>
        </div>

        <!-- Left wall with door -->
        <div class="int-wall int-wall-left">
          <div class="int-flesh-veins"></div>
          <div class="int-rust-patches"></div>
          <div class="int-blood-streak"></div>

          <!-- Door 1: 自主捏人 -->
          <div class="int-doorway" @click="screen = 'custom'">
            <div class="int-door-recess">
              <div class="int-door-plate">自 主 捏 人</div>
              <div class="int-door-status">⚒ 铸造你的契约</div>
            </div>
            <div class="int-door-glow"></div>
          </div>
        </div>

        <!-- Right wall with door -->
        <div class="int-wall int-wall-right">
          <div class="int-flesh-veins right"></div>
          <div class="int-rust-patches right"></div>
          <div class="int-handprint"></div>

          <!-- Door 2: 开局预设 -->
          <div class="int-doorway" @click="screen = 'preset'">
            <div class="int-door-recess">
              <div class="int-door-plate">开 局 预 设</div>
              <div class="int-door-status">◆ 直接坠入深渊</div>
            </div>
            <div class="int-door-glow"></div>
          </div>
        </div>

        <!-- Floor -->
        <div class="int-floor">
          <div class="int-floor-lines"></div>
          <div class="int-floor-blood"></div>
        </div>

        <!-- Far wall hint -->
        <div class="int-far-wall">
          <div class="int-far-text">你已踏入回廊</div>
        </div>
      </div>

      <!-- Ember particles -->
      <canvas ref="emberCanvas" class="choice-ember-canvas"></canvas>

      <!-- Content overlay -->
      <a class="back-link" @click="goBack">← 转身离开</a>

      <div class="choice-inner">
        <div class="choice-header">
          <div class="choice-icon">◆</div>
          <h1 class="choice-title">契 约 之 厅</h1>
          <p class="choice-subtitle">选择一扇门，缔结你的命运</p>
        </div>
      </div>
    </div>

    <!-- Character Creation Screen -->
    <div v-else-if="screen === 'custom'" class="custom-screen">
      <div class="screen-header">
        <a class="back-link" @click="screen = 'choice'">← 返回大厅</a>
      </div>
      <CharacterCreation @complete="onCharacterComplete" />
    </div>

    <!-- Preset Selection Screen -->
    <div v-else-if="screen === 'preset'" class="preset-screen">
      <div class="screen-header">
        <a class="back-link" @click="screen = 'choice'">← 返回大厅</a>
      </div>
      <PresetSelect @select="onPresetSelect" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { useGameStore } from '../store/game'
import CharacterCreation from '../components/CharacterCreation.vue'
import PresetSelect from '../components/PresetSelect.vue'

const router = useRouter()
const store = useGameStore()
const screen = ref<'choice' | 'custom' | 'preset'>('choice')

// Ember particles
const emberCanvas = ref<HTMLCanvasElement | null>(null)
let embers: Array<{ x: number; y: number; r: number; vx: number; vy: number; o: number; life: number }> = []
let ctx: CanvasRenderingContext2D | null = null
let frame = 0
let tickerCleanup: (() => void) | null = null

function initEmbers() {
  const c = emberCanvas.value
  if (!c || !c.parentElement) return
  const rect = c.parentElement.getBoundingClientRect()
  c.width = rect.width
  c.height = rect.height
  ctx = c.getContext('2d')
  embers = []
  for (let i = 0; i < 35; i++) {
    embers.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 0.9 + 0.2,
      vx: (Math.random() - 0.5) * 0.12,
      vy: -(Math.random() * 0.1 + 0.02),
      o: Math.random() * 0.25 + 0.05,
      life: Math.random(),
    })
  }
}

function drawEmbers() {
  if (!emberCanvas.value || !ctx) return
  const c = emberCanvas.value
  frame++
  ctx.clearRect(0, 0, c.width, c.height)
  for (const p of embers) {
    p.y += p.vy
    p.x += p.vx + Math.sin(frame * 0.007 + p.life) * 0.12
    p.life -= 0.001
    if (p.life <= 0 || p.y < -20) {
      p.y = c.height + 20
      p.x = Math.random() * c.width
      p.life = 1
    }
    const a = p.o * Math.max(0, p.life)
    if (a < 0.01) continue
    ctx.beginPath()
    ctx.fillStyle = `rgba(180,80,30,${a})`
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
    ctx.fill()
  }
}

onMounted(() => {
  gsap.fromTo('.choice-inner', { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out', delay: 0.3 })
  gsap.fromTo('.int-doorway', { opacity: 0, y: 15 }, { opacity: 1, y: 0, duration: 0.5, stagger: 0.15, ease: 'power2.out', delay: 0.5 })

  if (screen.value === 'choice') {
    setTimeout(() => {
      initEmbers()
      gsap.ticker.add(drawEmbers)
      tickerCleanup = () => gsap.ticker.remove(drawEmbers)
    }, 100)
  }
})

onUnmounted(() => {
  if (tickerCleanup) tickerCleanup()
})

function goBack() {
  store.pullBack()
  router.push('/')
}

function onCharacterComplete(_promptText: string) {
  router.push('/main')
}

function onPresetSelect(_presetId: string) {
  router.push('/main')
}
</script>

<style scoped>
/* ===== Root ===== */
.newgame-root {
  width: 100%;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  position: relative;
  background: var(--bg-void);
}

.choice-screen,
.custom-screen,
.preset-screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow-y: auto;
  overflow-x: hidden;
  z-index: 5;
}

/* ===== Back link ===== */
.back-link {
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--amber-dim);
  cursor: pointer;
  text-decoration: none;
  padding: 10px 14px;
  display: inline-block;
  flex-shrink: 0;
  z-index: 10;
  position: relative;
  transition: color 0.2s;
}
.back-link:hover { color: var(--amber); }
.screen-header { flex-shrink: 0; position: relative; z-index: 10; }

/* ===== INTERIOR BACKGROUND ===== */
.interior-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  background:
    radial-gradient(ellipse at 50% 40%, rgba(180, 60, 20, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 100%, rgba(80, 20, 8, 0.1) 0%, transparent 35%),
    linear-gradient(180deg, #0c0806 0%, #080503 50%, #0a0604 100%);
}

/* Ceiling */
.int-ceiling {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 10%;
  background: linear-gradient(180deg, #040201 0%, #0a0604 70%, #0f0a07 100%);
  z-index: 4;
  border-bottom: 1px solid var(--iron-dark);
}
.int-pipe {
  position: absolute;
  width: 8px; height: 100%;
  background: linear-gradient(90deg, #181410, #221e18, #181410);
  border-radius: 0 0 2px 2px;
}
.int-pipe.p1 { left: 30%; }
.int-pipe.p2 { left: 65%; }

.int-bulb {
  position: absolute;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  display: flex; flex-direction: column; align-items: center;
}
.int-bulb-wire { width: 1px; height: 5px; background: var(--iron); }
.int-bulb-glass {
  width: 16px; height: 9px;
  background: radial-gradient(ellipse at 50% 30%, rgba(210, 180, 140, 0.7), rgba(180, 140, 100, 0.25));
  border-radius: 50% / 40%;
  box-shadow: 0 0 25px rgba(200, 160, 100, 0.35), 0 0 50px rgba(200, 150, 80, 0.15);
  animation: bulbFlick 7s ease-in-out infinite;
}
@keyframes bulbFlick {
  0%, 24%, 26%, 28%, 30%, 100% { opacity: 1; }
  25%, 27%, 29% { opacity: 0.12; }
}

/* Walls */
.int-wall {
  position: absolute;
  top: 0; bottom: 20%;
  width: 34%;
  overflow: hidden;
}
.int-wall-left {
  left: 0;
  background:
    radial-gradient(ellipse at 100% 20%, rgba(40, 15, 8, 0.5) 0%, transparent 40%),
    radial-gradient(ellipse at 90% 60%, rgba(50, 15, 5, 0.3) 0%, transparent 35%),
    linear-gradient(90deg, #0d0805 0%, #100a07 50%, #0e0906 100%);
  clip-path: polygon(0 0, 100% 6%, 100% 94%, 0 100%);
  border-right: 1px solid rgba(80, 30, 15, 0.2);
}
.int-wall-right {
  right: 0;
  background:
    radial-gradient(ellipse at 0% 30%, rgba(40, 15, 8, 0.5) 0%, transparent 40%),
    radial-gradient(ellipse at 10% 55%, rgba(50, 15, 5, 0.3) 0%, transparent 35%),
    linear-gradient(270deg, #0d0805 0%, #100a07 50%, #0e0906 100%);
  clip-path: polygon(0 6%, 100% 0, 100% 100%, 0 94%);
  border-left: 1px solid rgba(80, 30, 15, 0.2);
}

/* Flesh veins */
.int-flesh-veins {
  position: absolute; inset: 0;
  opacity: 0.4; pointer-events: none;
  background:
    radial-gradient(ellipse at 80% 20%, rgba(50, 12, 8, 0.5) 0%, transparent 22%),
    radial-gradient(ellipse at 75% 50%, rgba(35, 8, 5, 0.35) 0%, transparent 18%);
  animation: fleshPulse 8s ease-in-out infinite;
}
.int-flesh-veins.right {
  background:
    radial-gradient(ellipse at 20% 25%, rgba(50, 12, 8, 0.5) 0%, transparent 22%),
    radial-gradient(ellipse at 25% 55%, rgba(35, 8, 5, 0.35) 0%, transparent 18%);
}
@keyframes fleshPulse {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.5; }
}

/* Rust patches */
.int-rust-patches {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(circle at 70% 35%, rgba(100, 40, 15, 0.25) 0%, transparent 25%),
    radial-gradient(circle at 60% 70%, rgba(80, 30, 10, 0.2) 0%, transparent 20%);
}
.int-rust-patches.right {
  background:
    radial-gradient(circle at 30% 30%, rgba(100, 40, 15, 0.25) 0%, transparent 25%),
    radial-gradient(circle at 40% 65%, rgba(80, 30, 10, 0.2) 0%, transparent 20%);
}

.int-blood-streak {
  position: absolute; pointer-events: none;
  right: 15%; top: 10%; width: 2px; height: 30%;
  background: linear-gradient(180deg, transparent, rgba(100, 12, 8, 0.3), rgba(60, 6, 3, 0.15), transparent);
}
.int-handprint {
  position: absolute; pointer-events: none;
  left: 15%; top: 52%;
  width: 20px; height: 24px;
  border-radius: 40% 40% 35% 35%;
  background: rgba(80, 12, 6, 0.2);
  box-shadow: 0 0 5px rgba(60, 8, 4, 0.15);
  transform: rotate(8deg);
}

/* ===== DOORWAYS ===== */
.int-doorway {
  position: absolute;
  top: 18%; bottom: 25%;
  width: 55%;
  cursor: pointer;
  z-index: 6;
  transition: all 0.35s cubic-bezier(0.16, 1, 0.3, 1);
}
.int-wall-left .int-doorway { left: 22%; }
.int-wall-right .int-doorway { right: 22%; }

.int-doorway:hover {
  filter: brightness(1.25);
  transform: scale(1.04);
}
.int-doorway:hover .int-door-glow { opacity: 0.7; }
.int-doorway:active { transform: scale(0.97); transition: all 0.1s; }

.int-door-recess {
  width: 100%; height: 100%;
  background: linear-gradient(180deg, rgba(12, 7, 4, 0.95), rgba(18, 11, 7, 0.92));
  border: 2px solid var(--iron);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-shadow: inset 0 0 30px rgba(0, 0, 0, 0.6);
  position: relative;
}
.int-door-recess::after {
  content: '';
  position: absolute; inset: 3px; pointer-events: none;
  border: 1px solid rgba(100, 50, 20, 0.15);
}

.int-door-plate {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 4px;
  color: var(--amber);
  text-shadow: 0 0 8px rgba(200, 150, 80, 0.25);
}

.int-door-status {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  letter-spacing: 2px;
  color: var(--chalk-dim);
  text-align: center;
}

.int-door-glow {
  position: absolute;
  inset: -5px;
  pointer-events: none;
  background: radial-gradient(ellipse at center, rgba(200, 80, 20, 0.15) 0%, rgba(140, 40, 10, 0.06) 40%, transparent 70%);
  opacity: 0.4;
  transition: opacity 0.4s;
  animation: doorGlowPulse 3s ease-in-out infinite;
}
@keyframes doorGlowPulse {
  0%, 100% { opacity: 0.3; }
  50% { opacity: 0.55; }
}

/* Floor */
.int-floor {
  position: absolute;
  bottom: 0; left: 14%; right: 14%;
  height: 20%;
  background: linear-gradient(0deg, rgba(8, 5, 3, 0.85) 0%, rgba(15, 10, 6, 0.55) 40%, rgba(20, 12, 8, 0.15) 70%, transparent 100%);
  clip-path: polygon(0 30%, 100% 30%, 100% 100%, 0 100%);
}
.int-floor-lines {
  position: absolute; inset: 0; pointer-events: none;
}
.int-floor-lines::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(50, 25, 15, 0.1) 5px, rgba(50, 25, 15, 0.1) 6px);
}
.int-floor-blood {
  position: absolute;
  right: 25%; top: 35%;
  width: 35px; height: 22px;
  background: radial-gradient(ellipse at center, rgba(60, 8, 4, 0.3) 0%, transparent 65%);
  border-radius: 50%;
  pointer-events: none;
}

/* Far wall */
.int-far-wall {
  position: absolute;
  top: 24%; bottom: 26%;
  left: 32%; right: 32%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
  background: linear-gradient(180deg, rgba(6, 3, 2, 0.9), rgba(8, 4, 3, 0.85));
  border: 1px solid rgba(80, 30, 15, 0.15);
}

.int-far-text {
  font-family: var(--font-display);
  font-size: 0.7rem;
  letter-spacing: 3px;
  color: var(--amber-dim);
  opacity: 0.5;
  text-shadow: 0 0 6px rgba(200, 150, 80, 0.2);
}

/* Ember canvas */
.choice-ember-canvas {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

/* ===== Choice Content Overlay ===== */
.choice-inner {
  position: absolute;
  bottom: 18%;
  left: 0; right: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.choice-header {
  text-align: center;
}

.choice-icon {
  font-size: 1.3rem;
  color: var(--blood-bright);
  margin-bottom: 4px;
  animation: iconPulse 3s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { opacity: 0.4; text-shadow: 0 0 6px rgba(160, 30, 20, 0.3); }
  50% { opacity: 1; text-shadow: 0 0 14px rgba(160, 30, 20, 0.5); }
}

.choice-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 6px;
  color: var(--emerge);
  margin: 0 0 4px;
  text-shadow: 0 0 10px rgba(200, 150, 80, 0.2);
}

.choice-subtitle {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--chalk-dim);
  letter-spacing: 2px;
  margin: 0;
}

/* ===== Custom/Preset screens ===== */
.custom-screen,
.preset-screen {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(180, 60, 20, 0.08) 0%, transparent 40%),
    linear-gradient(180deg, #0a0705 0%, #060403 50%, #0a0705 100%);
}
</style>
