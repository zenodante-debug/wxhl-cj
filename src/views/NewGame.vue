<template>
  <div class="newgame-root">
    <!-- Choice Screen -->
    <div v-if="screen === 'choice'" class="choice-screen">
      <!-- Corridor background layer -->
      <div class="choice-corridor-bg">
        <div class="choice-ceiling">
          <div class="choice-pipe"></div>
          <div class="choice-pipe delay"></div>
          <div class="choice-bulb">
            <div class="choice-bulb-wire"></div>
            <div class="choice-bulb-glass"></div>
          </div>
        </div>
        <div class="choice-walls">
          <div class="choice-wall-left">
            <div class="choice-flesh-veins"></div>
            <div class="choice-rust-patches"></div>
            <div class="choice-blood-streak s1"></div>
          </div>
          <div class="choice-wall-right">
            <div class="choice-flesh-veins right"></div>
            <div class="choice-rust-patches right"></div>
            <div class="choice-blood-streak s2"></div>
            <div class="choice-handprint"></div>
          </div>
        </div>
        <div class="choice-floor">
          <div class="choice-floor-lines"></div>
        </div>
        <div class="choice-far-glow"></div>
      </div>

      <!-- Ember particles overlay -->
      <canvas ref="emberCanvas" class="choice-ember-canvas"></canvas>

      <!-- Content -->
      <a class="back-link" @click="goBack">← 回廊入口</a>

      <div class="choice-inner">
        <div class="choice-header">
          <div class="choice-icon">◆</div>
          <h1 class="choice-title">踏 入 回 廊</h1>
          <p class="choice-subtitle">选择你与深渊缔约的方式</p>
        </div>

        <div class="choice-cards">
          <button class="choice-card" @click="screen = 'custom'">
            <span class="card-icon">⚒</span>
            <span class="card-body">
              <span class="card-label">自 主 捏 人</span>
              <span class="card-desc">自行分配属性、书写特质、具现装备</span>
            </span>
            <span class="card-arrow">→</span>
          </button>

          <button class="choice-card" @click="screen = 'preset'">
            <span class="card-icon">◆</span>
            <span class="card-body">
              <span class="card-label">开 局 预 设</span>
              <span class="card-desc">使用预制的契约者档案，直接坠入深渊</span>
            </span>
            <span class="card-arrow">→</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Character Creation Screen -->
    <div v-else-if="screen === 'custom'" class="custom-screen">
      <div class="screen-header">
        <a class="back-link" @click="screen = 'choice'">← 返回选择</a>
      </div>
      <CharacterCreation @complete="onCharacterComplete" />
    </div>

    <!-- Preset Selection Screen -->
    <div v-else-if="screen === 'preset'" class="preset-screen">
      <div class="screen-header">
        <a class="back-link" @click="screen = 'choice'">← 返回选择</a>
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

// Ember particles for choice screen
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
  for (let i = 0; i < 40; i++) {
    embers.push({
      x: Math.random() * c.width,
      y: Math.random() * c.height,
      r: Math.random() * 1.0 + 0.2,
      vx: (Math.random() - 0.5) * 0.15,
      vy: -(Math.random() * 0.12 + 0.03),
      o: Math.random() * 0.3 + 0.06,
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
    p.x += p.vx + Math.sin(frame * 0.008 + p.life) * 0.15
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
    ctx.beginPath()
    ctx.fillStyle = `rgba(200,100,40,${a * 0.12})`
    ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2)
    ctx.fill()
  }
}

onMounted(() => {
  gsap.fromTo('.choice-inner', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.4 })
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

function onCharacterComplete(promptText: string) {
  console.info('[NewGame] Character contract generated:', promptText.substring(0, 100) + '...')
  router.push('/main')
}

function onPresetSelect(presetId: string) {
  console.info('[NewGame] Preset selected:', presetId)
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
  transition: color 0.2s;
  padding: 10px 14px;
  display: inline-block;
  flex-shrink: 0;
  z-index: 10;
  position: relative;
}

.back-link:hover { color: var(--amber); }

.screen-header { flex-shrink: 0; position: relative; z-index: 10; }

/* ===== CHOICE SCREEN CORRIDOR BACKGROUND ===== */
.choice-corridor-bg {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
}

/* Ceiling */
.choice-ceiling {
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 11%;
  background: linear-gradient(180deg, #050302 0%, #0a0705 60%, #120c08 100%);
  z-index: 4;
  border-bottom: 1px solid var(--iron-dark);
  display: flex;
  align-items: flex-end;
  justify-content: center;
}

.choice-pipe {
  position: absolute;
  width: 10px;
  height: 100%;
  background: linear-gradient(90deg, #1a1612, #252018, #1a1612);
  border-radius: 0 0 2px 2px;
}
.choice-pipe:nth-child(1) { left: 25%; }
.choice-pipe:nth-child(2) { left: 70%; }
.choice-pipe:nth-child(1)::after {
  content: '';
  position: absolute;
  bottom: -3px; left: 50%;
  width: 2px; height: 5px;
  background: rgba(80, 100, 70, 0.6);
  border-radius: 1px;
  animation: pipeDrip 5s ease-in-out infinite;
}
.choice-pipe.delay:nth-child(2)::after {
  content: '';
  position: absolute;
  bottom: -3px; left: 50%;
  width: 2px; height: 5px;
  background: rgba(80, 100, 70, 0.6);
  border-radius: 1px;
  animation: pipeDrip 5s ease-in-out infinite 2s;
}

@keyframes pipeDrip {
  0%, 85%, 100% { transform: scaleY(1); opacity: 0.5; }
  90% { transform: scaleY(4); opacity: 1; }
}

.choice-bulb {
  position: absolute;
  bottom: 0; left: 50%;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}
.choice-bulb-wire {
  width: 1px; height: 6px; background: var(--iron);
}
.choice-bulb-glass {
  width: 20px; height: 11px;
  background: radial-gradient(ellipse at 50% 30%, rgba(210, 180, 140, 0.8), rgba(180, 140, 100, 0.3));
  border-radius: 50% / 40%;
  box-shadow: 0 0 30px rgba(200, 160, 100, 0.4), 0 0 60px rgba(200, 150, 80, 0.2);
  animation: bulbFlick 7s ease-in-out infinite;
}

@keyframes bulbFlick {
  0%, 24%, 26%, 28%, 30%, 100% { opacity: 1; }
  25%, 27%, 29% { opacity: 0.15; }
}

/* Walls */
.choice-walls {
  position: absolute;
  top: 11%; bottom: 0;
  left: 0; right: 0;
}

.choice-wall-left {
  position: absolute;
  top: 0; bottom: 0; left: 0;
  width: 34%;
  background:
    radial-gradient(ellipse at 100% 20%, var(--flesh-light) 0%, transparent 35%),
    radial-gradient(ellipse at 90% 60%, rgba(80, 20, 8, 0.4) 0%, transparent 40%),
    linear-gradient(90deg, var(--rust-dark) 0%, var(--rust) 50%, var(--rust-mid) 100%);
  clip-path: polygon(0 0, 100% 4%, 100% 96%, 0 100%);
  border-right: 1px solid rgba(120, 40, 20, 0.2);
}

.choice-wall-right {
  position: absolute;
  top: 0; bottom: 0; right: 0;
  width: 34%;
  background:
    radial-gradient(ellipse at 0% 30%, var(--flesh-light) 0%, transparent 35%),
    radial-gradient(ellipse at 10% 50%, rgba(80, 20, 8, 0.4) 0%, transparent 40%),
    linear-gradient(270deg, var(--rust-dark) 0%, var(--rust) 50%, var(--rust-mid) 100%);
  clip-path: polygon(0 4%, 100% 0, 100% 100%, 0 96%);
  border-left: 1px solid rgba(120, 40, 20, 0.2);
}

/* Flesh veins */
.choice-flesh-veins {
  position: absolute; inset: 0; opacity: 0.45;
  pointer-events: none;
  background:
    radial-gradient(ellipse at 80% 15%, rgba(60, 15, 10, 0.6) 0%, transparent 25%),
    radial-gradient(ellipse at 75% 45%, rgba(40, 10, 8, 0.4) 0%, transparent 20%),
    radial-gradient(ellipse at 85% 70%, rgba(50, 12, 8, 0.5) 0%, transparent 22%);
  animation: fleshPulse 8s ease-in-out infinite;
}
.choice-flesh-veins.right {
  background:
    radial-gradient(ellipse at 20% 20%, rgba(60, 15, 10, 0.6) 0%, transparent 25%),
    radial-gradient(ellipse at 25% 55%, rgba(40, 10, 8, 0.4) 0%, transparent 20%),
    radial-gradient(ellipse at 15% 65%, rgba(50, 12, 8, 0.5) 0%, transparent 22%);
}

@keyframes fleshPulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.55; }
}

/* Rust patches */
.choice-rust-patches {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(circle at 60% 30%, rgba(120, 50, 20, 0.3) 0%, transparent 30%),
    radial-gradient(circle at 80% 60%, rgba(100, 40, 15, 0.25) 0%, transparent 25%);
}
.choice-rust-patches.right {
  background:
    radial-gradient(circle at 40% 25%, rgba(120, 50, 20, 0.3) 0%, transparent 30%),
    radial-gradient(circle at 20% 55%, rgba(100, 40, 15, 0.25) 0%, transparent 25%);
}

/* Blood streaks */
.choice-blood-streak {
  position: absolute; pointer-events: none;
  background: linear-gradient(180deg, transparent, rgba(120, 15, 10, 0.3) 20%, rgba(80, 8, 5, 0.5) 60%, rgba(50, 5, 3, 0.2) 100%);
}
.choice-blood-streak.s1 { right: 12%; top: 8%; width: 3px; height: 35%; }
.choice-blood-streak.s2 { left: 18%; top: 15%; width: 3px; height: 30%; }

/* Handprint */
.choice-handprint {
  position: absolute; pointer-events: none;
  left: 12%; top: 50%;
  width: 22px; height: 26px;
  border-radius: 40% 40% 35% 35%;
  background: rgba(100, 15, 8, 0.22);
  box-shadow: 0 0 6px rgba(80, 10, 5, 0.18);
  transform: rotate(10deg);
}

/* Floor */
.choice-floor {
  position: absolute;
  bottom: 0; left: 14%; right: 14%;
  height: 20%;
  background: linear-gradient(0deg, rgba(10, 6, 4, 0.85) 0%, rgba(20, 12, 8, 0.6) 40%, rgba(25, 15, 10, 0.2) 70%, transparent 100%);
  clip-path: polygon(0 30%, 100% 30%, 100% 100%, 0 100%);
}

.choice-floor-lines {
  position: absolute; inset: 0; pointer-events: none;
}
.choice-floor-lines::before {
  content: '';
  position: absolute; inset: 0;
  background: repeating-linear-gradient(0deg, transparent, transparent 5px, rgba(60, 30, 20, 0.1) 5px, rgba(60, 30, 20, 0.1) 6px);
}

/* Far end blood glow */
.choice-far-glow {
  position: absolute;
  top: 18%; bottom: 24%;
  left: 32%; right: 32%;
  background: radial-gradient(ellipse at center, rgba(180, 60, 20, 0.15) 0%, rgba(120, 30, 10, 0.06) 40%, transparent 70%);
  animation: portalBreathe 4s ease-in-out infinite;
}

@keyframes portalBreathe {
  0%, 100% { opacity: 0.35; }
  50% { opacity: 0.6; }
}

/* Ember canvas */
.choice-ember-canvas {
  position: absolute;
  inset: 0;
  z-index: 2;
  pointer-events: none;
}

/* ===== Choice Content ===== */
.choice-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 20px 20px;
  z-index: 10;
  position: relative;
}

.choice-header {
  text-align: center;
  margin-bottom: 28px;
}

.choice-icon {
  font-size: 1.6rem;
  color: var(--blood-bright);
  margin-bottom: 8px;
  animation: iconPulse 3s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { opacity: 0.5; text-shadow: 0 0 8px rgba(160, 30, 20, 0.3); }
  50% { opacity: 1; text-shadow: 0 0 18px rgba(160, 30, 20, 0.6); }
}

.choice-title {
  font-family: var(--font-display);
  font-size: 1.8rem;
  letter-spacing: 8px;
  color: var(--emerge);
  margin: 0 0 8px;
  text-shadow: 0 0 14px rgba(200, 150, 80, 0.25);
}

.choice-subtitle {
  font-family: var(--font-body);
  font-size: 0.9rem;
  color: var(--chalk-dim);
  letter-spacing: 2px;
  margin: 0;
}

/* ===== Choice Cards ===== */
.choice-cards {
  display: flex;
  flex-direction: column;
  gap: 14px;
  width: 100%;
}

.choice-card {
  width: 100%;
  padding: 18px 16px;
  background: rgba(10, 6, 4, 0.75);
  border: 2px solid var(--iron);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}

.choice-card::before {
  content: '';
  position: absolute;
  inset: 3px;
  pointer-events: none;
  border: 1px solid rgba(100, 50, 20, 0.12);
  transition: border-color 0.3s;
}

.choice-card:hover {
  border-color: var(--blood-bright);
  box-shadow: 0 0 22px rgba(160, 30, 20, 0.25);
  transform: translateX(3px);
}
.choice-card:hover::before { border-color: rgba(160, 30, 20, 0.25); }
.choice-card:active { transform: scale(0.98); transition: all 0.1s; }

.card-icon {
  font-size: 1.5rem;
  color: var(--amber);
  flex-shrink: 0;
  width: 40px;
  text-align: center;
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-label {
  font-family: var(--font-display);
  font-size: 1.15rem;
  letter-spacing: 4px;
  color: var(--emerge);
  margin-bottom: 3px;
}

.card-desc {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--chalk-dim);
  line-height: 1.4;
}

.card-arrow {
  font-size: 0.9rem;
  color: var(--amber-dim);
  flex-shrink: 0;
  transition: transform 0.3s;
}
.choice-card:hover .card-arrow {
  transform: translateX(4px);
  color: var(--blood-bright);
}

/* ===== Custom/Preset screens ===== */
.custom-screen,
.preset-screen {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(180, 60, 20, 0.08) 0%, transparent 40%),
    linear-gradient(180deg, #0a0705 0%, #060403 50%, #0a0705 100%);
}
</style>
