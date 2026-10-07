<template>
  <div class="battle-view">
    <div class="battle-header">
      <h3>第 {{ 状态.回合 }} 回合</h3>
      <div class="order">先攻：{{ 状态.先攻.join(' → ') }}</div>
      <!-- 逃离：界面逃生口（卡在战斗里时的出路）。要再点一次确认，防误触 -->
      <button class="flee-btn" :disabled="禁用" @click="逃离点击">
        {{ 逃离确认 ? '再点一次确认逃离' : '逃离战斗' }}
      </button>
    </div>

    <!-- 一维距离条 -->
    <div class="distance-bar">
      <div
        v-for="u in 排序单位"
        :key="u.id"
        class="distance-marker"
        :class="{ ally: u.阵营 === '我方', enemy: u.阵营 === '敌方' }"
        :style="{ left: 距离百分比(u.距离) + '%' }"
        :title="`${u.id} · ${u.距离}米`"
      >
        {{ u.名称 }}
      </div>
    </div>

    <!-- 单位卡 -->
    <div class="unit-cards">
      <div
        v-for="u in 排序单位"
        :key="u.id"
        class="unit-card"
        :class="{ enemy: u.阵营 === '敌方', ally: u.阵营 === '我方', dead: u.濒死 !== null }"
      >
        <div class="unit-name">{{ u.名称 }}</div>
        <div class="unit-hp">HP {{ u.HP_当前 }}/{{ u.HP_最大 }} · MP {{ u.MP_当前 }}/{{ u.MP_最大 }} · 耐力 {{ u.耐力_当前 }}/{{ u.耐力_最大 }}</div>
        <!-- 防御/闪避/属性 都要展示出来 —— 玩家要看得见面板才打得出决策（实战反馈：这些根本没显示） -->
        <div class="unit-stats">
          防御 {{ u.防御 }} · 闪避 {{ u.闪避值 }} · {{ u.阶位 }}
        </div>
        <div class="unit-attrs">STR {{ u.属性.实际.STR }} · AGI {{ u.属性.实际.AGI }} · CON {{ u.属性.实际.CON }} · PER {{ u.属性.实际.PER }}</div>
        <div class="unit-dist">{{ u.距离 }}米（{{ 距离带(u.距离) }}）· 额度 {{ u.额度 }}</div>
        <div class="unit-slots">主{{ u.行动槽.主要 }} 次{{ u.行动槽.次要 }} 移{{ u.行动槽.移动 }} 反{{ u.行动槽.反应 }}</div>
        <div v-if="u.状态.length" class="unit-status">状态: {{ u.状态.map(s => s.名 + (s.层数 ? `×${s.层数}` : '')).join('，') }}</div>
        <div v-if="u.护盾 > 0" class="unit-shield">护盾: {{ u.护盾 }}</div>
      </div>
    </div>

    <!-- 行动区：每个我方单位各自填槽 → 「执行本轮」 -->
    <div class="action-zone">
      <!-- 进度：生成敌方意图是一次几十秒的 AI 调用。没有这个，玩家看到的是一个灰按钮 +
           空白意图区，会以为界面坏了（和之前「点开战没反应」同一类） -->
      <div v-if="进度" class="progress" role="status" aria-live="polite">
        <span class="spinner" aria-hidden="true"></span>
        <span>{{ 进度 }}</span>
      </div>

      <!-- 敌方意图（阶段 ③ 预公开）；未开战/无意图时不渲染 -->
      <div v-if="敌方意图?.length" class="intent-block">
        <div class="intent-title">敌方意图</div>
        <div v-for="(yi, i) in 敌方意图" :key="i" class="intent-row">
          <span class="intent-unit">{{ yi.单位 }}</span>
          <span class="intent-acts">{{ yi.行动.map(a => a.类型 + (a.技能 ? `（${a.技能}）` : '（基础攻击）')).join(' → ') }}</span>
        </div>
      </div>

      <!-- 我方每个单位一块（实战反馈：以前只能操作契约者，队友完全没法指挥） -->
      <div v-for="u in 我方单位" :key="u.id" class="unit-action">
        <div class="ua-head">
          <span class="ua-name">{{ u.名称 }}</span>
          <span class="ua-meta">
            HP {{ u.HP_当前 }}/{{ u.HP_最大 }} · 距 {{ u.距离 }}米 · 额度 {{ u.额度 }} · 槽 主{{ u.行动槽.主要 }} 次{{ u.行动槽.次要 }} 移{{ u.行动槽.移动 }}
          </span>
          <button class="ua-detail-btn" @click="切换详情(u.id)">
            {{ 详情展开.includes(u.id) ? '收起效果' : `效果详情（${技能条目(u).length}）` }}
          </button>
        </div>

        <!-- 效果详情表：光看名字选不了行动（实战反馈：技能/装备看不出详细效果） -->
        <div v-if="详情展开.includes(u.id)" class="detail-table">
          <div class="dt-row dt-head">
            <span>名称</span><span>行动</span><span>射程</span><span>目标</span><span>消耗</span><span>冷却</span><span>倍率</span><span>规则</span>
          </div>
          <div v-for="d in 技能条目(u)" :key="d.名" class="dt-row">
            <span class="dt-name" :title="d.名">{{ d.名 }}</span>
            <span>{{ d.行动消耗 || '—' }}</span>
            <span>{{ d.射程 || '—' }}</span>
            <span>{{ d.目标 || '—' }}</span>
            <span>{{ d.消耗 || '—' }}</span>
            <span>{{ d.冷却 ?? '—' }}</span>
            <span>{{ d.倍率 }}</span>
            <span>{{ d.规则数 ? `${d.规则数} 条` : '—' }}</span>
          </div>
          <div v-if="!技能条目(u).length" class="dt-empty">
            （这个单位没有任何已翻译的技能/装备效果 —— 只能用基础攻击）
          </div>
        </div>

        <div class="slot-row">
          <label class="slot">
            <span class="slot-label">主要</span>
            <select v-model="填写表[u.键].主要">
              <option value="">（不出手）</option>
              <option v-for="s in 技能条目(u)" :key="s.名" :value="s.名">{{ s.摘要 }}</option>
            </select>
          </label>
          <label class="slot">
            <span class="slot-label">次要</span>
            <select v-model="填写表[u.键].次要">
              <option value="">（不出手）</option>
              <option v-for="s in 技能条目(u)" :key="s.名" :value="s.名">{{ s.摘要 }}</option>
            </select>
          </label>
          <label class="slot">
            <span class="slot-label">移动（目标距离·米）</span>
            <input type="number" min="0" v-model.number="填写表[u.键].移动" />
          </label>
          <label class="slot">
            <span class="slot-label">反应（预置）</span>
            <select v-model="填写表[u.键].反应">
              <option value="">不预置</option>
              <option v-for="r in 反应选项" :key="r" :value="r">{{ r }}</option>
            </select>
          </label>
          <label class="slot">
            <span class="slot-label">目标</span>
            <select v-model="目标表[u.键]">
              <option value="">（选择目标）</option>
              <optgroup label="敌方（攻击）">
                <option v-for="e in 敌方单位" :key="e.键" :value="e.键">{{ e.显示 }}</option>
              </optgroup>
              <optgroup label="我方（支援：上 buff / 治疗 / 护盾）">
                <option v-for="a in 支援目标(u)" :key="a.键" :value="a.键">{{ a.显示 }}</option>
              </optgroup>
            </select>
          </label>
        </div>
      </div>

      <div class="action-submit">
        <button class="execute-btn" :disabled="!可提交本轮 || 禁用" @click="执行本轮">执行本轮</button>
        <span class="dim">至少给一个单位下达行动（没下命令的单位本回合不出手）</span>
      </div>
    </div>

    <!-- 结算日志 -->
    <div class="battle-log">
      <div v-for="(s, i) in 日志" :key="i" class="log-entry">{{ s }}</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { 距离带 } from '../engine/distance';
import { 可提交, type 行动槽填写 } from '../engine/actionInput';
import type { 敌方意图 } from '../ai/enemyTactics';
import type { 战斗状态, 战斗单位, 战斗解释 } from '../types';

const props = defineProps<{
  状态: 战斗状态;
  日志: string[];
  /** 敌方意图（阶段 ③ 预公开）；未开战时为空数组 */
  敌方意图?: 敌方意图[];
  /** 上层忙碌（回合编排 / 本轮结算中）→ 禁用「执行本轮」，挡异步重入 */
  禁用?: boolean;
  /** 正在忙什么（如「正在生成敌方意图（第 3 回合）…」）—— 非空时显示转圈圈 */
  进度?: string;
}>();

const emit = defineEmits<{
  /** 每个我方单位各自的填写 + 目标；键 = 状态.单位 的键（短名） */
  (e: '执行本轮', 各单位: Record<string, { 填写: 行动槽填写; 目标: string }>): void;
  (e: '逃离战斗'): void;
}>();

/** 逃离按钮：第一次点只是亮出确认，第二次才真正逃离（界面逃生口，防误触） */
const 逃离确认 = ref(false);
let 逃离计时: ReturnType<typeof setTimeout> | undefined;
function 逃离点击() {
  if (!逃离确认.value) {
    逃离确认.value = true;
    clearTimeout(逃离计时);
    逃离计时 = setTimeout(() => (逃离确认.value = false), 3000);
    return;
  }
  逃离确认.value = false;
  emit('逃离战斗');
}

// 距玩家排序（0 在前）—— 用变量里的姓名（头部.姓名）；老存档没有名称字段时退回 id 末段
const 排序单位 = computed(() =>
  Object.values(props.状态.单位)
    .map(u => ({ ...u, 名称: 名称(u) }))
    .sort((a, b) => a.距离 - b.距离),
);

const 最大距离 = computed(() => Math.max(100, ...排序单位.value.map(u => u.距离)));
function 距离百分比(d: number): number {
  return Math.min(100, (d / 最大距离.value) * 100);
}

function 名称(u: 战斗单位): string {
  return u.名称 || u.id.split('.').pop() || u.id;
}

// ==================== 我方行动区 ====================

/** 键 = 状态.单位 的键（短名）—— 引擎的 找单位 两种键都认，这里统一用键 */
interface 我方条目 {
  键: string;
  名称: string;
  单位: 战斗单位;
  技能: Record<string, 战斗解释>;
}

/** 所有我方单位（契约者本体 + 小队成员 + 其余被划为我方的单位） */
const 我方单位 = computed<我方条目[]>(() =>
  Object.entries(props.状态.单位)
    .filter(([, u]) => u.阵营 === '我方')
    .map(([键, u]) => ({ 键, 名称: 名称(u), 单位: u, 技能: u.技能 ?? {} })),
);

/** 每个我方单位各自的槽位填写；键 = 状态.单位 的键 */
const 填写表 = reactive<Record<string, 行动槽填写>>({});
const 目标表 = reactive<Record<string, string>>({});

// 单位增删时补齐/清理填写表（Vue 3 的 reactive 对象新增键也是响应式的）
watch(
  我方单位,
  列表 => {
    const 在场上 = new Set(列表.map(x => x.键));
    for (const x of 列表) {
      if (!填写表[x.键]) 填写表[x.键] = {};
      if (目标表[x.键] === undefined) 目标表[x.键] = '';
    }
    for (const 键 of Object.keys(填写表)) if (!在场上.has(键)) delete 填写表[键];
    for (const 键 of Object.keys(目标表)) if (!在场上.has(键)) delete 目标表[键];
  },
  { immediate: true, deep: false },
);

/** 敌方单位（可攻击目标） */
const 敌方单位 = computed(() =>
  Object.entries(props.状态.单位)
    .filter(([, u]) => u.阵营 === '敌方' && u.HP_当前 > 0)
    .map(([键, u]) => ({ 键, 显示: `${名称(u)}（HP ${u.HP_当前}/${u.HP_最大} · 距 ${u.距离}米 · 防 ${u.防御} 闪 ${u.闪避值}）` })),
);

/** 支援目标（我方，含自己 —— 上 buff / 治疗都走支援行动） */
function 支援目标(自己: 我方条目) {
  return 我方单位.value
    .filter(x => x.单位.HP_当前 > 0)
    .map(x => ({
      键: x.键,
      显示: `${x.单位.id === 自己.单位.id ? '自己：' : ''}${x.名称}（HP ${x.单位.HP_当前}/${x.单位.HP_最大}）`,
    }));
}

// 只有一个敌人时自动选中它（省一步）；目标失效则重置
watch(
  敌方单位,
  列表 => {
    const 唯一 = 列表.length === 1 ? 列表[0].键 : '';
    for (const x of 我方单位.value) {
      const 现有 = 目标表[x.键];
      const 有效 = 现有 && (列表.some(e => e.键 === 现有) || 我方单位.value.some(a => a.键 === 现有));
      if (!有效) 目标表[x.键] = 唯一;
    }
  },
  { immediate: true },
);

/** 反应槽可选项（空 = 不预置） */
const 反应选项 = ['击溃', '识破', '招架', '闪避', '格挡', '闪烁'];

/** 效果详情展开中的单位键 */
const 详情展开 = ref<string[]>([]);
function 切换详情(键: string) {
  详情展开.value = 详情展开.value.includes(键)
    ? 详情展开.value.filter(k => k !== 键)
    : [...详情展开.value, 键];
}

/** 一个技能的展示信息（下拉摘要 + 详情表共用） */
function 技能条目(条目: 我方条目) {
  return Object.entries(条目.技能).map(([名, 解释]) => {
    const 倍率 = typeof 解释.伤害倍率 === 'number' && 解释.伤害倍率 > 0 ? `×${解释.伤害倍率}` : '无伤害';
    const 段 = [解释.行动消耗, 解释.射程, 倍率].filter(Boolean).join(' · ');
    return {
      名,
      摘要: `${名}（${段}）`,
      行动消耗: 解释.行动消耗 ?? '',
      射程: 解释.射程 ?? '',
      目标: 解释.目标 ?? '',
      消耗: 解释.消耗 ?? '',
      冷却: 解释.冷却,
      倍率,
      规则数: (解释.规则 ?? []).filter(Boolean).length,
    };
  });
}

/** 能不能点「执行本轮」：至少一个单位真的出手（只预置反应不算） */
const 可提交本轮 = computed(() =>
  我方单位.value.some(x => 可提交(填写表[x.键] ?? {})),
);

/**
 * 「执行本轮」：交出**每个单位各自的**填写与目标。
 * 不在这里清空槽位：清空要等上层真的收下了（否则结算失败时玩家的填写会凭空消失）。
 */
function 执行本轮(): void {
  if (!可提交本轮.value) return;
  const 各单位: Record<string, { 填写: 行动槽填写; 目标: string }> = {};
  for (const x of 我方单位.value) {
    const 填写 = 填写表[x.键];
    if (!填写) continue;
    各单位[x.键] = { 填写: { ...填写 }, 目标: 目标表[x.键] ?? '' };
  }
  emit('执行本轮', 各单位);
}

/** 上层结算完通知清空（避免下一回合误带上一轮的选择） */
function 清空填写() {
  for (const 键 of Object.keys(填写表)) 填写表[键] = {};
}
defineExpose({ 清空填写 });
</script>

<style scoped lang="scss">
.battle-view { color: #ddd; }
.battle-header { margin-bottom: 12px; position: relative; }
.battle-header h3 { margin: 0 0 4px; }
.order { color: #999; font-size: 13px; padding-right: 96px; }

.flee-btn {
  position: absolute;
  top: 0;
  right: 0;
  padding: 5px 12px;
  background: #2a1d1d;
  border: 1px solid #6a3a3a;
  border-radius: 6px;
  color: #d99;
  font-size: 12px;
  cursor: pointer;

  &:hover { background: #3a2424; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
}

.distance-bar {
  position: relative;
  height: 46px;
  margin: 16px 0;
  border-bottom: 2px solid #444;
}
.distance-marker {
  position: absolute;
  bottom: 6px;
  transform: translateX(-50%);
  padding: 2px 8px;
  border-radius: 10px;
  font-size: 12px;
  white-space: nowrap;

  &.ally { background: #1d3a1d; border: 1px solid #3a6a3a; color: #9d9; }
  &.enemy { background: #3a1d1d; border: 1px solid #6a3a3a; color: #d99; }
}

.unit-cards { display: flex; gap: 10px; flex-wrap: wrap; margin-bottom: 14px; }
.unit-card {
  padding: 10px 12px;
  border: 1px solid #333;
  border-radius: 8px;
  min-width: 150px;
  &.enemy { border-color: #6a3a3a; }
  &.ally { border-color: #3a6a3a; }
  &.dead { opacity: 0.5; }
  .unit-name { font-weight: 700; }
  .unit-hp { color: #f88; font-size: 13px; }
  .unit-stats { color: #9db2d0; font-size: 12px; }
  .unit-attrs { color: #8a8a8a; font-size: 11px; }
  .unit-dist, .unit-slots { color: #999; font-size: 12px; }
  .unit-status { color: #fa0; font-size: 12px; }
  .unit-shield { color: #8af; font-size: 12px; }
}

.action-zone {
  margin-bottom: 14px;
  padding: 10px 12px;
  border: 1px solid #333;
  border-radius: 8px;
  background: #1a1a1a;
}

.progress {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  padding-bottom: 8px;
  border-bottom: 1px dashed #333;
  font-size: 13px;
  color: #9cc;
  line-height: 1.5;
}

.spinner {
  flex-shrink: 0;
  width: 12px;
  height: 12px;
  border: 2px solid #3a5a5a;
  border-top-color: #9cc;
  border-radius: 50%;
  animation: progress-spin 0.8s linear infinite;
}

@keyframes progress-spin {
  to { transform: rotate(360deg); }
}

.intent-block { margin-bottom: 10px; padding-bottom: 8px; border-bottom: 1px dashed #333; }
.intent-title { color: #d99; font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.intent-row { font-size: 12px; color: #bbb; }
.intent-unit { color: #d99; margin-right: 8px; }

/* 一个我方单位一块行动区 */
.unit-action {
  margin-bottom: 10px;
  padding: 8px 10px;
  border: 1px solid #2f3a2f;
  border-radius: 8px;
  background: #171c17;
}

.ua-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 8px;
}
.ua-name { color: #9d9; font-weight: 700; font-size: 13px; }
.ua-meta { color: #8a9a8a; font-size: 12px; }
.ua-detail-btn {
  margin-left: auto;
  padding: 3px 10px;
  background: #22303c;
  border: 1px solid #3a5a74;
  border-radius: 6px;
  color: #90c0e0;
  font-size: 12px;
  cursor: pointer;

  &:hover { background: #2b3d4c; }
}

/* 效果详情表 */
.detail-table {
  margin: 0 0 10px;
  border: 1px solid #2a2a2a;
  border-radius: 6px;
  overflow-x: auto;
  background: #131313;
}
.dt-row {
  display: grid;
  grid-template-columns: minmax(140px, 2fr) repeat(4, minmax(60px, 1fr)) minmax(50px, 0.7fr) minmax(60px, 0.8fr) minmax(60px, 0.7fr);
  gap: 6px;
  padding: 4px 8px;
  font-size: 12px;
  color: #bbb;
  border-top: 1px solid #232323;

  &.dt-head { color: #888; border-top: none; background: #191919; }
}
.dt-name { color: #ddd; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dt-empty { padding: 8px; font-size: 12px; color: #777; }

.slot-row { display: flex; gap: 10px; flex-wrap: wrap; }
.slot { display: flex; flex-direction: column; gap: 3px; font-size: 12px; color: #999; }
.slot-label { color: #999; }
.slot select, .slot input {
  background: #101010;
  color: #ddd;
  border: 1px solid #444;
  border-radius: 4px;
  padding: 4px 6px;
  font-size: 13px;
  max-width: 260px;
}
.slot input[type='number'] { width: 90px; }

.action-submit {
  display: flex;
  gap: 10px;
  align-items: center;
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px dashed #333;
}
.dim { color: #777; font-size: 12px; }

.execute-btn {
  background: #1d3a1d;
  color: #9d9;
  border: 1px solid #3a6a3a;
  border-radius: 6px;
  padding: 6px 16px;
  font-size: 13px;
  cursor: pointer;

  &:disabled { opacity: 0.4; cursor: not-allowed; }
  &:not(:disabled):hover { background: #254a25; }
}

.battle-log { border-top: 1px solid #2a2a2a; padding-top: 10px; max-height: 30vh; overflow-y: auto; }
.log-entry { padding: 3px 0; font-size: 13px; color: #bbb; }
</style>
