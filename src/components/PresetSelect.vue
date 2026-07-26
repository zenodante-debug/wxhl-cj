<template>
  <div class="ps-root">
    <div class="ps-scroll">
      <header class="ps-header">
        <div class="ps-icon">◆</div>
        <h1 class="ps-title">开 局 预 设</h1>
        <p class="ps-subtitle">选择一份已刻印的契约，直接坠入深渊</p>
      </header>

      <div class="ps-grid">
        <button
          v-for="preset in presets"
          :key="preset.id"
          class="ps-card"
          @click="selectPreset(preset.id)"
        >
          <div class="ps-card-badge" :class="preset.difficulty">
            {{ preset.difficultyLabel }}
          </div>
          <div class="ps-card-name">{{ preset.name }}</div>
          <div class="ps-card-line"></div>
          <div class="ps-card-desc">{{ preset.desc }}</div>
          <div class="ps-card-tags">
            <span v-for="tag in preset.tags" :key="tag" class="ps-tag">{{ tag }}</span>
          </div>
        </button>
      </div>

      <p class="ps-hint">更多预设即将开放...</p>
    </div>
  </div>
</template>

<script setup lang="ts">
const emit = defineEmits<{ select: [id: string] }>()

interface Preset {
  id: string
  name: string
  desc: string
  difficulty: 'easy' | 'normal' | 'hard'
  difficultyLabel: string
  tags: string[]
}

const presets: Preset[] = [
  {
    id: 'soldier',
    name: '前线突击兵',
    desc: '一名经历过三次副本的老练士兵，装备精良但旧伤累累。携带先锋突击步枪与战术背心，属性偏向体力与力量。',
    difficulty: 'easy',
    difficultyLabel: '适合新手',
    tags: ['战斗型', '装备齐全', '军衔:上士'],
  },
  {
    id: 'survivor',
    name: '荒野求生者',
    desc: '来自文明崩溃后的废土，精通侦察与生存技巧。携带轻便装备与野外工具包，更依赖感知而非蛮力。',
    difficulty: 'normal',
    difficultyLabel: '进阶挑战',
    tags: ['生存型', '高感知', '轻装'],
  },
  {
    id: 'blank',
    name: '空白灵魂',
    desc: '一无所有，一无所知。只身坠入回廊，仅凭本能求生。无装备、无技能、无记忆——但拥有最大的成长空间。',
    difficulty: 'hard',
    difficultyLabel: '硬核模式',
    tags: ['白板开局', '高成长', '全属性5'],
  },
]

function selectPreset(id: string) {
  emit('select', id)
}
</script>

<style scoped>
/* ===== Root ===== */
.ps-root {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.ps-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 16px 32px;
}

.ps-scroll::-webkit-scrollbar { width: 3px; }
.ps-scroll::-webkit-scrollbar-track { background: transparent; }
.ps-scroll::-webkit-scrollbar-thumb { background: rgba(120, 50, 20, 0.3); border-radius: 2px; }

/* ===== Header ===== */
.ps-header {
  text-align: center;
  margin-bottom: 20px;
}

.ps-icon {
  font-size: 1.3rem;
  color: var(--blood-bright);
  margin-bottom: 6px;
  text-shadow: 0 0 10px rgba(160, 30, 20, 0.4);
}

.ps-title {
  font-family: var(--font-display);
  font-size: 1.3rem;
  letter-spacing: 5px;
  color: var(--emerge);
  margin: 0 0 6px;
}

.ps-subtitle {
  font-family: var(--font-body);
  font-size: 0.65rem;
  color: var(--chalk-dim);
  letter-spacing: 1px;
  margin: 0;
}

/* ===== Grid ===== */
.ps-grid {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* ===== Card ===== */
.ps-card {
  width: 100%;
  padding: 14px;
  background: rgba(10, 6, 4, 0.8);
  border: 1px solid var(--iron);
  cursor: pointer;
  text-align: left;
  position: relative;
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.ps-card:hover {
  border-color: var(--blood-bright);
  box-shadow: 0 0 16px rgba(160, 30, 20, 0.2);
  transform: translateX(2px);
}

.ps-card:active {
  transform: scale(0.98);
  transition: all 0.1s;
}

.ps-card-badge {
  display: inline-block;
  padding: 2px 8px;
  font-family: var(--font-mono);
  font-size: 0.55rem;
  letter-spacing: 1px;
  margin-bottom: 8px;
}

.ps-card-badge.easy {
  background: rgba(60, 100, 50, 0.2);
  color: #6a9070;
  border: 1px solid rgba(80, 120, 70, 0.3);
}

.ps-card-badge.normal {
  background: rgba(180, 120, 40, 0.2);
  color: var(--amber);
  border: 1px solid rgba(180, 120, 40, 0.3);
}

.ps-card-badge.hard {
  background: rgba(160, 30, 20, 0.2);
  color: var(--blood-bright);
  border: 1px solid rgba(160, 30, 20, 0.3);
}

.ps-card-name {
  font-family: var(--font-display);
  font-size: 0.9rem;
  letter-spacing: 3px;
  color: var(--emerge);
  margin-bottom: 6px;
}

.ps-card-line {
  height: 1px;
  background: linear-gradient(90deg, rgba(160, 100, 60, 0.3), transparent);
  margin-bottom: 8px;
}

.ps-card-desc {
  font-family: var(--font-body);
  font-size: 0.65rem;
  color: var(--chalk-dim);
  line-height: 1.5;
  margin-bottom: 8px;
}

.ps-card-tags {
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
}

.ps-tag {
  font-family: var(--font-mono);
  font-size: 0.55rem;
  padding: 2px 6px;
  color: var(--amber-dim);
  border: 1px solid rgba(120, 80, 30, 0.25);
  background: rgba(40, 20, 10, 0.3);
  letter-spacing: 1px;
}

/* ===== Hint ===== */
.ps-hint {
  text-align: center;
  font-family: var(--font-display);
  font-size: 0.55rem;
  color: rgba(120, 50, 20, 0.4);
  letter-spacing: 2px;
  margin-top: 20px;
}
</style>
