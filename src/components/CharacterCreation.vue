<template>
  <div class="cc-root">
    <!-- Ember particles -->
    <div class="ember-layer" ref="emberRef"></div>

    <div class="cc-scroll">
      <header class="cc-header">
        <h1>灵 魂 契 约</h1>
        <div class="cc-divider">◆ 无限回廊 ◆</div>
      </header>

      <p class="cc-whisper">
        "将你的特质与渴望刻印于此。未落笔者，将于须臾后归于虚无。"
      </p>

      <!-- 1. Name -->
      <div class="cc-section">
        <h2 class="cc-section-title">壹 · 落款真名</h2>
        <input
          type="text"
          v-model="form.name"
          class="cc-input"
          placeholder="写下你在现实世界中的名字..."
        />
      </div>

      <!-- 2. Core Trait -->
      <div class="cc-section">
        <h2 class="cc-section-title">贰 · 灵魂特质</h2>
        <p class="cc-whisper">
          回忆你生前最深刻的执念、本能，或你是一个什么样的人。回廊将据此为你凝结一项初始天赋。
        </p>
        <textarea
          v-model="form.trait"
          class="cc-textarea cc-textarea-lg"
          placeholder="例如：一个极度冷静的法医，习惯在危机中剖析逻辑；一个戏命赌徒，将生命献祭于混沌……"
        ></textarea>
      </div>

      <!-- 3. Attribute Allocation -->
      <div class="cc-section">
        <h2 class="cc-section-title">叁 · 基因重组</h2>
        <p class="cc-whisper">
          凡人皆有定数，超越即为代价。将15点潜能分配至你的躯壳之中。
        </p>

        <div class="cc-points">
          残存潜能：<span class="cc-points-val">{{ remainingPoints }}</span>
        </div>

        <div
          v-for="attr in attributes"
          :key="attr.key"
          class="cc-attr-row"
        >
          <div class="cc-attr-info">
            <span class="cc-attr-name">{{ attr.label }}</span>
            <span class="cc-attr-desc">{{ attr.desc }}</span>
          </div>
          <div class="cc-attr-ctrls">
            <button class="cc-attr-btn" @click="adjust(attr.key, -1)">−</button>
            <span class="cc-attr-val">{{ form.attrs[attr.key] }}</span>
            <button class="cc-attr-btn" @click="adjust(attr.key, 1)">+</button>
          </div>
        </div>
      </div>

      <!-- 4. Initial Gear -->
      <div class="cc-section">
        <h2 class="cc-section-title">肆 · 物质投影</h2>
        <p class="cc-whisper">
          你可凭空带走一件现实中的凡俗防身之物，以度过最初的绝望。
        </p>
        <input
          type="text"
          v-model="form.gear"
          class="cc-input"
          placeholder="例如：一把沙漠之鹰手枪 或 一把锰钢战术砍刀..."
        />
      </div>

      <!-- 5. Guide Question -->
      <div class="cc-section">
        <h2 class="cc-section-title">伍 · 虚空刺探</h2>
        <p class="cc-whisper">
          趁现在，向接引你的资深者提出最后一个疑问。
        </p>
        <textarea
          v-model="form.question"
          class="cc-textarea"
          placeholder="写下你的疑问（留空则直接坠入深渊）..."
        ></textarea>
      </div>

      <!-- 6. Additional Notes -->
      <div class="cc-section">
        <h2 class="cc-section-title">陆 · 隐秘沉淀</h2>
        <textarea
          v-model="form.notes"
          class="cc-textarea"
          placeholder="任何关于你现实中未写明的特殊病史、执念、或隐秘的知识..."
        ></textarea>
      </div>

      <!-- Preview -->
      <div class="cc-section">
        <h2 class="cc-section-title">最终刻印</h2>
        <textarea
          v-model="outputPrompt"
          class="cc-output"
          readonly
          placeholder="点击下方『缔结契约』，于此凝望你的命运..."
        ></textarea>
      </div>

      <!-- Buttons -->
      <div class="cc-buttons">
        <button class="cc-btn cc-btn-primary" @click="generateContract">缔结契约</button>
        <button class="cc-btn" @click="copyContract" v-if="outputPrompt">拓印文书</button>
        <button class="cc-btn cc-btn-clear" @click="clearAll">抹除重写</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref, computed, onMounted, onUnmounted } from 'vue'

const emit = defineEmits<{ complete: [prompt: string] }>()

interface Attrs {
  str: number
  agi: number
  con: number
  per: number
}

const form = reactive({
  name: '',
  trait: '',
  gear: '',
  question: '',
  notes: '',
  attrs: { str: 5, agi: 5, con: 5, per: 5 } as Attrs,
})

const MAX_POINTS = 15

const remainingPoints = computed(() => {
  const { str, agi, con, per } = form.attrs
  return MAX_POINTS - ((str - 5) + (agi - 5) + (con - 5) + (per - 5))
})

const attributes = [
  { key: 'str' as const, label: '力量 (STR)', desc: '肌肉爆发、负重极限与近战毁伤' },
  { key: 'agi' as const, label: '敏捷 (AGI)', desc: '神经反射、躯体协调与远程校准' },
  { key: 'con' as const, label: '体力 (CON)', desc: '生命力、抗打击耐受与异常抗性' },
  { key: 'per' as const, label: '感知 (PER)', desc: '五感穿透、危机直觉、科技解析与超自然亲和' },
]

const outputPrompt = ref('')

// Ember particles
const emberRef = ref<HTMLElement | null>(null)
let emberInterval: ReturnType<typeof setInterval> | null = null

function spawnEmber() {
  if (!emberRef.value) return
  const spark = document.createElement('div')
  spark.className = 'spark'
  const left = Math.random() * 100
  spark.style.left = left + '%'
  spark.style.animationDuration = (2 + Math.random() * 4) + 's'
  spark.style.animationDelay = Math.random() * 3 + 's'
  const drift = (Math.random() - 0.5) * 40
  spark.style.setProperty('--drift', drift + 'px')
  emberRef.value.appendChild(spark)
  setTimeout(() => spark.remove(), 7000)
}

onMounted(() => {
  // Load saved
  const saved = localStorage.getItem('cc_form_v1')
  if (saved) {
    try {
      const parsed = JSON.parse(saved)
      Object.assign(form, parsed)
    } catch { /* ignore */ }
  }
  const savedOutput = localStorage.getItem('cc_output_v1')
  if (savedOutput) outputPrompt.value = savedOutput

  // Start embers
  for (let i = 0; i < 30; i++) spawnEmber()
  emberInterval = setInterval(spawnEmber, 300)
})

onUnmounted(() => {
  if (emberInterval) clearInterval(emberInterval)
})

function adjust(key: keyof Attrs, amount: number) {
  if (amount > 0) {
    if (remainingPoints.value > 0 && form.attrs[key] < 10) form.attrs[key]++
  } else {
    if (form.attrs[key] > 5) form.attrs[key]--
  }
  save()
}

function save() {
  localStorage.setItem('cc_form_v1', JSON.stringify({ ...form }))
}

function generateContract() {
  if (remainingPoints.value > 0) {
    if (!confirm(`残存 ${remainingPoints.value} 点潜能未激发，此举形同自戮。执意如此？`)) return
  }

  const name = form.name.trim() || '无名者'
  const trait = form.trait.trim() || '无突出执念'
  const gear = form.gear.trim() || '赤手空拳'
  const question = form.question.trim() || '无言步入深渊'
  const notes = form.notes.trim() || '无形之秘'
  const { str, agi, con, per } = form.attrs

  const prompt = `【无限回廊 · 玩家契约登录档案】
落款真名：${name}

壹 · 生前核心特质
${trait}

贰 · 四维基因分配（凡人均值5，极值10）
[ STR:${str} | AGI:${agi} | CON:${con} | PER:${per} ]

叁 · 初始具现装备
${gear}

肆 · 虚空刺探（玩家疑问）
${question}

伍 · 隐秘潜能储备
${notes}

【系统契约接入指令】
请将以上信息作为玩家的唯一生存底牌写入无限回廊设定。
依据"壹 · 生前核心特质"，为其构建一项合理的【初始天赋】（严格限定为白色品质，切勿赋予过高战力）。
请以"匹配开场白中的引导者性格"的身份与口吻作出正式回应：
1. 若玩家在肆提出了问询，请耐心解答回廊规则与危机情报；
2. 引导玩家完成契约刻印，指引其领取具现装备；
3. 正式宣布第一期生存试炼副本开始。
后续世界线必须严格尊重玩家面板，保持高危险性与硬核法则。`

  outputPrompt.value = prompt
  localStorage.setItem('cc_output_v1', prompt)
}

function copyContract() {
  if (!outputPrompt.value) return
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(outputPrompt.value).catch(() => fallbackCopy())
  } else {
    fallbackCopy()
  }
}

function fallbackCopy() {
  const ta = document.createElement('textarea')
  ta.value = outputPrompt.value
  ta.style.position = 'fixed'
  ta.style.opacity = '0'
  document.body.appendChild(ta)
  ta.select()
  document.execCommand('copy')
  document.body.removeChild(ta)
}

function clearAll() {
  if (!confirm('擦除刻印，等同于灵魂溃散。确认？')) return
  form.name = ''
  form.trait = ''
  form.gear = ''
  form.question = ''
  form.notes = ''
  form.attrs = { str: 5, agi: 5, con: 5, per: 5 }
  outputPrompt.value = ''
  localStorage.removeItem('cc_form_v1')
  localStorage.removeItem('cc_output_v1')
}
</script>

<style scoped>
/* ===== Root ===== */
.cc-root {
  flex: 1;
  overflow: hidden;
  position: relative;
  background:
    radial-gradient(ellipse at 50% 0%, rgba(180, 60, 20, 0.06) 0%, transparent 50%),
    radial-gradient(ellipse at 50% 100%, rgba(10, 5, 2, 0.9) 0%, transparent 40%),
    linear-gradient(180deg, #0e0906 0%, #080503 50%, #0c0705 100%);
  display: flex;
  flex-direction: column;
}

.ember-layer {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  overflow: hidden;
}

.spark {
  position: absolute;
  bottom: -20px;
  width: 3px;
  height: 3px;
  background-color: #ffcc77;
  border-radius: 50%;
  box-shadow: 0 0 4px 1px #ff4500, 0 0 10px 3px #8b0000;
  opacity: 0;
  animation: flyUp linear forwards;
}

@keyframes flyUp {
  0% { transform: translateY(0) translateX(0) scale(1.2); opacity: 0; }
  5% { opacity: 1; }
  70% { opacity: 0.8; }
  100% { transform: translateY(calc(-100% - 120px)) translateX(var(--drift, 0px)) scale(0.3); opacity: 0; }
}

/* ===== Scroll ===== */
.cc-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 16px 32px;
  position: relative;
  z-index: 2;
}

.cc-scroll::-webkit-scrollbar { width: 3px; }
.cc-scroll::-webkit-scrollbar-track { background: transparent; }
.cc-scroll::-webkit-scrollbar-thumb { background: rgba(120, 50, 20, 0.3); border-radius: 2px; }

/* ===== Header ===== */
.cc-header {
  text-align: center;
  margin-bottom: 16px;
}

.cc-header h1 {
  font-family: var(--font-display);
  font-size: 1.5rem;
  letter-spacing: 4px;
  color: var(--blood-bright);
  margin: 0 0 8px;
  text-shadow: 0 0 12px rgba(160, 30, 20, 0.4);
}

.cc-divider {
  font-family: var(--font-display);
  font-size: 0.7rem;
  color: var(--amber-dim);
  letter-spacing: 3px;
  opacity: 0.7;
}

/* ===== Whisper text ===== */
.cc-whisper {
  font-family: var(--font-body);
  font-size: 0.7rem;
  color: var(--chalk-dim);
  font-style: italic;
  line-height: 1.6;
  margin: 0 0 12px;
  padding-left: 10px;
  border-left: 2px solid rgba(120, 50, 20, 0.3);
}

/* ===== Sections ===== */
.cc-section {
  margin-bottom: 14px;
}

.cc-section-title {
  font-family: var(--font-display);
  font-size: 0.9rem;
  letter-spacing: 2px;
  color: var(--amber);
  margin: 0 0 6px;
  padding-bottom: 3px;
  border-bottom: 1px solid rgba(180, 120, 60, 0.2);
}

/* ===== Inputs ===== */
.cc-input {
  width: 100%;
  background: rgba(10, 6, 4, 0.6);
  border: none;
  border-bottom: 1px solid rgba(180, 120, 60, 0.3);
  color: var(--emerge);
  font-family: var(--font-body);
  font-size: 0.8rem;
  padding: 7px 4px;
  outline: none;
  transition: border-color 0.3s;
}

.cc-input::placeholder {
  color: rgba(160, 140, 120, 0.35);
  font-style: italic;
  font-size: 0.7rem;
}

.cc-input:focus {
  border-bottom-color: var(--blood-bright);
}

.cc-textarea {
  width: 100%;
  background: rgba(10, 6, 4, 0.6);
  border: none;
  border-bottom: 1px solid rgba(180, 120, 60, 0.3);
  color: var(--emerge);
  font-family: var(--font-body);
  font-size: 0.8rem;
  padding: 7px 4px;
  outline: none;
  resize: none;
  height: 40px;
  min-height: 40px;
  transition: border-color 0.3s;
  line-height: 1.5;
}

.cc-textarea::placeholder {
  color: rgba(160, 140, 120, 0.35);
  font-style: italic;
  font-size: 0.7rem;
}

.cc-textarea:focus {
  border-bottom-color: var(--blood-bright);
}

.cc-textarea-lg {
  height: 70px;
  min-height: 70px;
}

/* ===== Points ===== */
.cc-points {
  text-align: center;
  font-family: var(--font-display);
  font-size: 0.85rem;
  color: var(--amber);
  letter-spacing: 2px;
  margin-bottom: 12px;
}

.cc-points-val {
  color: var(--blood-bright);
  font-size: 1rem;
}

/* ===== Attribute Row ===== */
.cc-attr-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px solid rgba(120, 50, 20, 0.15);
  gap: 8px;
}

.cc-attr-info {
  flex: 1;
  min-width: 0;
}

.cc-attr-name {
  font-family: var(--font-display);
  font-size: 0.75rem;
  font-weight: bold;
  color: var(--chalk);
  letter-spacing: 1px;
  display: block;
}

.cc-attr-desc {
  font-family: var(--font-body);
  font-size: 0.6rem;
  color: var(--chalk-dim);
  display: block;
  margin-top: 2px;
}

.cc-attr-ctrls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.cc-attr-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  border: 1px solid rgba(180, 120, 60, 0.4);
  background: transparent;
  color: var(--amber-dim);
  font-size: 1rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
  line-height: 1;
}

.cc-attr-btn:active {
  background: rgba(180, 120, 60, 0.15);
  transform: scale(0.9);
}

.cc-attr-val {
  font-family: var(--font-mono);
  font-size: 1rem;
  font-weight: bold;
  color: var(--emerge);
  width: 22px;
  text-align: center;
}

/* ===== Output ===== */
.cc-output {
  width: 100%;
  background: rgba(5, 2, 1, 0.9) !important;
  color: #d1bfae !important;
  border: 1px solid rgba(160, 30, 20, 0.4) !important;
  font-family: var(--font-mono);
  font-size: 0.65rem !important;
  padding: 10px !important;
  height: 180px !important;
  min-height: 180px !important;
  resize: none;
  white-space: pre-wrap;
  word-wrap: break-word;
  line-height: 1.5;
  outline: none;
}

.cc-output::placeholder {
  color: rgba(209, 191, 174, 0.2) !important;
}

/* ===== Buttons ===== */
.cc-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
  padding-top: 12px;
  border-top: 1px solid rgba(120, 50, 20, 0.2);
}

.cc-btn {
  width: 100%;
  padding: 12px 0;
  font-family: var(--font-display);
  font-size: 0.85rem;
  font-weight: bold;
  letter-spacing: 3px;
  cursor: pointer;
  background: transparent;
  border: 1px solid var(--iron);
  color: var(--amber-dim);
  transition: all 0.25s;
}

.cc-btn:active {
  transform: scale(0.98);
}

.cc-btn-primary {
  border-color: var(--blood-bright);
  color: var(--blood-bright);
  text-shadow: 0 0 8px rgba(160, 30, 20, 0.3);
}

.cc-btn-primary:hover {
  box-shadow: 0 0 16px rgba(160, 30, 20, 0.3);
}

.cc-btn-clear {
  border-color: rgba(120, 50, 20, 0.3);
  color: rgba(160, 140, 120, 0.5);
  font-size: 0.7rem;
  letter-spacing: 2px;
}
</style>
