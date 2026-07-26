<template>
  <div class="newgame-root">
    <!-- Choice Screen -->
    <div v-if="screen === 'choice'" class="choice-screen">
      <a class="back-link" @click="goBack">← 回廊入口</a>

      <div class="choice-inner">
        <div class="choice-header">
          <div class="choice-icon">◆</div>
          <h1 class="choice-title">踏 入 回 廊</h1>
          <p class="choice-subtitle">选择你与深渊缔约的方式</p>
        </div>

        <div class="choice-cards">
          <button class="choice-card" @click="screen = 'custom'">
            <div class="card-icon">⚒</div>
            <div class="card-label">自 主 捏 人</div>
            <div class="card-desc">自行分配属性、书写特质、具现装备</div>
            <div class="card-arrow">→</div>
          </button>

          <button class="choice-card" @click="screen = 'preset'">
            <div class="card-icon">◆</div>
            <div class="card-label">开 局 预 设</div>
            <div class="card-desc">使用预制的契约者档案，直接坠入深渊</div>
            <div class="card-arrow">→</div>
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
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import gsap from 'gsap'
import { useGameStore } from '../store/game'
import CharacterCreation from '../components/CharacterCreation.vue'
import PresetSelect from '../components/PresetSelect.vue'

const router = useRouter()
const store = useGameStore()
const screen = ref<'choice' | 'custom' | 'preset'>('choice')

onMounted(() => {
  gsap.fromTo('.choice-screen', { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out', delay: 0.3 })
})

function goBack() {
  store.pullBack()
  router.push('/')
}

function onCharacterComplete(promptText: string) {
  // Store the generated contract and navigate to main game
  console.info('[NewGame] Character contract generated:', promptText.substring(0, 100) + '...')
  router.push('/main')
}

function onPresetSelect(presetId: string) {
  console.info('[NewGame] Preset selected:', presetId)
  router.push('/main')
}
</script>

<style scoped>
/* ===== Root: vertical aspect ratio for mobile ===== */
.newgame-root {
  max-width: 450px;
  width: 100%;
  aspect-ratio: 9 / 16;
  overflow: hidden;
  position: relative;
  background: var(--bg-void);
  margin: 0 auto;
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
}

/* ===== Back link ===== */
.back-link {
  font-family: var(--font-display);
  font-size: 0.75rem;
  color: var(--amber-dim);
  cursor: pointer;
  text-decoration: none;
  transition: color 0.2s;
  padding: 10px 14px;
  display: inline-block;
  flex-shrink: 0;
}

.back-link:hover {
  color: var(--amber);
}

.screen-header {
  flex-shrink: 0;
}

/* ===== Choice Screen ===== */
.choice-screen {
  background:
    radial-gradient(ellipse at 50% 0%, rgba(180, 60, 20, 0.12) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 100%, rgba(120, 30, 10, 0.08) 0%, transparent 40%),
    linear-gradient(180deg, #0a0705 0%, #060403 50%, #0a0705 100%);
}

.choice-inner {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 24px 24px;
}

.choice-header {
  text-align: center;
  margin-bottom: 32px;
}

.choice-icon {
  font-size: 1.5rem;
  color: var(--blood-bright);
  margin-bottom: 8px;
  animation: iconPulse 3s ease-in-out infinite;
}

@keyframes iconPulse {
  0%, 100% { opacity: 0.5; text-shadow: 0 0 8px rgba(160, 30, 20, 0.3); }
  50% { opacity: 1; text-shadow: 0 0 16px rgba(160, 30, 20, 0.6); }
}

.choice-title {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 6px;
  color: var(--emerge);
  margin: 0 0 8px;
}

.choice-subtitle {
  font-family: var(--font-body);
  font-size: 0.75rem;
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
  background: rgba(10, 6, 4, 0.8);
  border: 2px solid var(--iron);
  cursor: pointer;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
  overflow: hidden;
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
  box-shadow: 0 0 20px rgba(160, 30, 20, 0.25);
  transform: translateX(3px);
}

.choice-card:hover::before {
  border-color: rgba(160, 30, 20, 0.25);
}

.choice-card:active {
  transform: scale(0.98);
  transition: all 0.1s;
}

.card-icon {
  font-size: 1.4rem;
  color: var(--amber);
  flex-shrink: 0;
  width: 36px;
  text-align: center;
}

.card-label {
  font-family: var(--font-display);
  font-size: 1rem;
  letter-spacing: 3px;
  color: var(--emerge);
  margin-bottom: 2px;
}

.card-desc {
  font-family: var(--font-body);
  font-size: 0.65rem;
  color: var(--chalk-dim);
  line-height: 1.3;
}

.choice-card .card-label,
.choice-card .card-desc {
  display: block;
}

.choice-card > :not(.card-icon):not(.card-arrow) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-arrow {
  font-size: 0.8rem;
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
