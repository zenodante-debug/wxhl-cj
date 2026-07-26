<template>
  <div class="ps-root">
    <div class="ps-scroll">

      <!-- Header -->
      <header class="ps-header">
        <div class="ps-icon">◆</div>
        <h1 class="ps-title">命 运 跃 迁</h1>
        <p class="ps-subtitle">选择接入回廊的方式，时间线不可逆转</p>
      </header>

      <!-- Warning -->
      <div class="ps-warn">
        <span class="ps-warn-icon">⚠</span>
        <span class="ps-warn-text">失败即抹杀。这里没有宽恕，只有绝对冰冷的数据与规则。</span>
      </div>

      <!-- Category 1: 系统进程分支 -->
      <div class="ps-section">
        <div class="ps-section-head">
          <span class="ps-section-ico">🔮</span>
          <span class="ps-section-title">系统进程分支</span>
          <span class="ps-section-badge">PROCESS</span>
        </div>
        <div class="ps-grid">
          <button
            v-for="p in processPresets"
            :key="p.id"
            class="ps-card"
            :class="'ps-card-' + p.color"
            @click="startCorridor(p.swipeId)"
          >
            <span class="ps-card-num">{{ p.num }}</span>
            <span class="ps-card-body">
              <span class="ps-card-name">{{ p.name }}</span>
              <span class="ps-card-desc">{{ p.desc }}</span>
            </span>
            <span v-if="p.tag" class="ps-card-utag" :class="'ps-utag-' + p.tagColor">{{ p.tag }}</span>
          </button>
        </div>
      </div>

      <!-- Category 2: 预设身世 -->
      <div class="ps-section">
        <div class="ps-section-head">
          <span class="ps-section-ico">🧬</span>
          <span class="ps-section-title">预设身世载入</span>
          <span class="ps-section-badge">PRESET</span>
        </div>
        <p class="ps-section-hint">选择此区域将自动分配初始属性与专长基础。</p>
        <div class="ps-grid">
          <button
            v-for="p in identityPresets"
            :key="p.id"
            class="ps-card"
            :class="'ps-card-' + p.color"
            @click="startCorridor(p.swipeId)"
          >
            <span class="ps-card-num">{{ p.num }}</span>
            <span class="ps-card-body">
              <span class="ps-card-name">{{ p.name }}</span>
              <span class="ps-card-desc">{{ p.desc }}</span>
            </span>
          </button>
        </div>
      </div>

      <!-- Footer -->
      <div class="ps-footer">
        <p class="ps-foot-warn">点击上方数据块将立即执行时空跳跃。</p>
        <p class="ps-foot-note">※ 请确保角色卡 Alternate Greetings 已配置对应 Swipe ID。</p>
        <p class="ps-foot-ver">GM NODE : ONLINE</p>
      </div>

    </div>
  </div>
</template>

<script setup lang="ts">
interface Preset {
  id: string
  num: string
  name: string
  desc: string
  swipeId: number
  color: 'purple' | 'green' | 'yellow' | 'blue'
  tag?: string
  tagColor?: string
}

// Swipe IDs shifted: removed guides 1-2, old 3→1, 4→2, 5→3, ..., 14→12
const processPresets: Preset[] = [
  { id: 'memory',    num: '01', name: '记忆覆写', desc: '跳过引导，直接载入已有数据或完全自定义属性。',   swipeId: 1, color: 'green',  tag: '导入', tagColor: 'green' },
  { id: 'companion', num: '02', name: '陪玩选择', desc: '作为高维存在，选择你的专属陪玩。',               swipeId: 2, color: 'green',  tag: '捏人', tagColor: 'green' },
]

const identityPresets: Preset[] = [
  { id: 'p03', num: '03', name: '古武传人',     desc: '极高STR/AGI，近战专精。',                 swipeId: 3,  color: 'yellow' },
  { id: 'p04', num: '04', name: '专业杀手',     desc: '极高AGI/PER，潜行爆发。',                 swipeId: 4,  color: 'yellow' },
  { id: 'p05', num: '05', name: '国际雇佣兵',   desc: '均衡体魄，熟练掌握各类热武器。',           swipeId: 5,  color: 'yellow' },
  { id: 'p06', num: '06', name: '退伍兵王',     desc: '极高CON，强悍意志与生存力。',             swipeId: 6,  color: 'yellow' },
  { id: 'p07', num: '07', name: '私家侦探',     desc: '极高PER，洞察细微线索。',                 swipeId: 7,  color: 'yellow' },
  { id: 'p08', num: '08', name: '科研工作者',   desc: '特化解析能力，易掌握黑科技。',             swipeId: 8,  color: 'yellow' },
  { id: 'p09', num: '09', name: '神秘学爱好者', desc: '极高PER，法术极高亲和力。',               swipeId: 9,  color: 'yellow' },
  { id: 'p10', num: '10', name: '道士下山',     desc: '掌握基础术法与符箓，感知天机。',           swipeId: 10, color: 'yellow' },
  { id: 'p11', num: '11', name: '特管局预备役', desc: '现实官方背景，熟知基础情报。',             swipeId: 11, color: 'blue' },
  { id: 'p12', num: '12', name: '黑帮少爷',     desc: '万界商人。',                               swipeId: 12, color: 'yellow' },
]

async function startCorridor(swipeId: number) {
  try {
    await setChatMessages([{ message_id: 0, swipe_id: swipeId }])
    if (typeof triggerSlash === 'function') {
      triggerSlash('/echo severity=success ✅ 载入成功：意识覆写完成，欢迎来到无限回廊。')
    }
  } catch (error: any) {
    console.error('跃迁失败:', error)
    alert('跃迁失败：数据链断裂。\n请检查角色卡的 Alternate Greetings 是否包含了第 ' + swipeId + ' 个开场白。\n\n系统报错：' + (error?.message || error))
  }
}
</script>

<style scoped>
/* ===== Root ===== */
.ps-root {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
}

.ps-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 16px 14px 28px;
  width: 100%;
}

.ps-scroll::-webkit-scrollbar { width: 3px; }
.ps-scroll::-webkit-scrollbar-track { background: transparent; }
.ps-scroll::-webkit-scrollbar-thumb { background: rgba(120, 50, 20, 0.3); border-radius: 2px; }

/* ===== Header ===== */
.ps-header {
  text-align: center;
  margin-bottom: 16px;
}

.ps-icon {
  font-size: 1.5rem;
  color: var(--blood-bright);
  margin-bottom: 6px;
  text-shadow: 0 0 10px rgba(160, 30, 20, 0.4);
}

.ps-title {
  font-family: var(--font-display);
  font-size: 1.6rem;
  letter-spacing: 6px;
  color: var(--emerge);
  margin: 0 0 6px;
}

.ps-subtitle {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--chalk-dim);
  letter-spacing: 2px;
  margin: 0;
}

/* ===== Warning ===== */
.ps-warn {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 10px 12px;
  border-left: 3px solid var(--blood-bright);
  background: rgba(160, 30, 20, 0.08);
  margin-bottom: 18px;
}

.ps-warn-icon {
  color: var(--blood-bright);
  font-size: 0.9rem;
  flex-shrink: 0;
}

.ps-warn-text {
  font-family: var(--font-body);
  font-size: 0.8rem;
  color: var(--chalk-dim);
  line-height: 1.5;
}

/* ===== Section ===== */
.ps-section {
  margin-bottom: 20px;
}

.ps-section-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(120, 50, 20, 0.25);
  margin-bottom: 12px;
  background: rgba(5, 2, 1, 0.4);
}

.ps-section-ico {
  font-size: 1.1rem;
}

.ps-section-title {
  font-family: var(--font-display);
  font-size: 1rem;
  font-weight: bold;
  color: var(--emerge);
  letter-spacing: 2px;
}

.ps-section-badge {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: 0.7rem;
  color: var(--chalk-dim);
  letter-spacing: 1px;
}

.ps-section-hint {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--amber-dim);
  margin: 0 0 10px;
  padding: 0 4px;
}

/* ===== Grid ===== */
.ps-grid {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/* ===== Card ===== */
.ps-card {
  width: 100%;
  padding: 14px 14px;
  background: rgba(10, 6, 4, 0.8);
  border: 1px solid var(--iron);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

.ps-card:hover {
  border-color: var(--blood-bright);
  box-shadow: 0 0 12px rgba(160, 30, 20, 0.2);
  transform: translateX(3px);
}

.ps-card:active {
  transform: scale(0.98);
  transition: all 0.1s;
}

/* Color left-border variants */
.ps-card-purple { border-left: 2px solid rgba(160, 110, 240, 0.5); }
.ps-card-purple:hover { border-left-color: #a371f7; }
.ps-card-green  { border-left: 2px solid rgba(80, 200, 100, 0.4); }
.ps-card-green:hover  { border-left-color: #56d364; }
.ps-card-yellow { border-left: 2px solid rgba(220, 180, 60, 0.4); }
.ps-card-yellow:hover { border-left-color: #e3b341; }
.ps-card-blue   { border-left: 2px solid rgba(74, 158, 255, 0.4); }
.ps-card-blue:hover   { border-left-color: #4a9eff; }

.ps-card-num {
  font-family: var(--font-mono);
  font-size: 0.9rem;
  font-weight: bold;
  color: var(--amber);
  flex-shrink: 0;
  min-width: 26px;
}

.ps-card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.ps-card-name {
  font-family: var(--font-display);
  font-size: 0.95rem;
  letter-spacing: 2px;
  color: var(--emerge);
  margin-bottom: 3px;
}

.ps-card-desc {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--chalk-dim);
  line-height: 1.4;
}

.ps-card-utag {
  font-family: var(--font-mono);
  font-size: 0.65rem;
  padding: 2px 6px;
  border: 1px solid rgba(100, 50, 20, 0.3);
  background: rgba(20, 10, 5, 0.5);
  color: var(--chalk-dim);
  flex-shrink: 0;
}

.ps-utag-green { color: #56d364; border-color: rgba(80, 200, 100, 0.3); }

/* ===== Footer ===== */
.ps-footer {
  text-align: center;
  margin-top: 20px;
  padding-top: 14px;
  border-top: 1px solid rgba(100, 50, 20, 0.2);
}

.ps-foot-warn {
  font-family: var(--font-body);
  font-size: 0.75rem;
  color: var(--blood-bright);
  margin: 0 0 5px;
  line-height: 1.5;
}

.ps-foot-note {
  font-family: var(--font-body);
  font-size: 0.65rem;
  color: var(--chalk-dim);
  margin: 0 0 8px;
}

.ps-foot-ver {
  font-family: var(--font-mono);
  font-size: 0.6rem;
  color: rgba(100, 50, 20, 0.4);
  letter-spacing: 2px;
}
</style>
