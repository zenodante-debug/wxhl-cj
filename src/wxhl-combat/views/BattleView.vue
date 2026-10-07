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

    <!-- 一维距离条：**以玩家为原点**，向左（身后/负）向右（身前/正）双向延伸。
         同一距离上的多人不再互相遮挡，而是**上下堆叠**（实战反馈）。 -->
    <div class="distance-bar" :style="{ height: 距离条高度 + 'px' }">
      <div class="axis-hint left">◀ 身后（负）</div>
      <div class="axis-hint center" :style="{ left: 原点百分比 + '%' }">玩家原点</div>
      <div class="axis-hint right">身前（正）▶</div>

      <div
        v-for="g in 分组标记"
        :key="g.距离"
        class="marker-group"
        :style="{ left: g.左 + '%' }"
      >
        <div
          v-for="(u, i) in g.单位们"
          :key="u.id"
          class="distance-marker"
          :class="{ ally: u.阵营 === '我方', enemy: u.阵营 === '敌方', self: u.类型 === '玩家' }"
          :style="{ bottom: i * 20 + 'px' }"
          :title="`${u.id} · ${u.距离}米（${距离带(u.距离)}）`"
        >
          {{ u.名称 }} {{ u.距离 }}m
        </div>
      </div>

      <div v-if="!分组标记.length" class="axis-empty">（战场上没有单位）</div>
    </div>

    <!-- 单位卡：每个角色都能展开看全套（状态/buff/装备/技能）—— 实战反馈：战斗界面看不到状态 -->
    <div class="unit-cards">
      <div
        v-for="u in 排序单位"
        :key="u.id"
        class="unit-card"
        :class="{ enemy: u.阵营 === '敌方', ally: u.阵营 === '我方', down: u.HP_当前 <= 0 }"
      >
        <div class="unit-name">
          {{ u.名称 }}
          <span v-if="u.HP_当前 <= 0" class="unit-down-tag">{{ 倒地标签(u) }}</span>
          <button class="unit-detail-btn" @click="切换角色详情(u.id)">
            {{ 展开角色.includes(u.id) ? '收起 ▴' : '详情 ▾' }}
          </button>
        </div>
        <div class="unit-hp">HP {{ u.HP_当前 }}/{{ u.HP_最大 }} · MP {{ u.MP_当前 }}/{{ u.MP_最大 }} · 耐力 {{ u.耐力_当前 }}/{{ u.耐力_最大 }}</div>
        <!-- 防御/闪避/属性 都要展示出来 —— 玩家要看得见面板才打得出决策（实战反馈：这些根本没显示） -->
        <div class="unit-stats">防御 {{ u.防御 }} · 闪避 {{ u.闪避值 }} · {{ u.阶位 }}</div>
        <div class="unit-attrs">STR {{ u.属性.实际.STR }} · AGI {{ u.属性.实际.AGI }} · CON {{ u.属性.实际.CON }} · PER {{ u.属性.实际.PER }}</div>
        <div class="unit-dist">{{ u.距离 }}米（{{ 距离带(u.距离) }}）· 额度 {{ u.额度 }}</div>
        <div class="unit-slots">主{{ u.行动槽.主要 }} 次{{ u.行动槽.次要 }} 移{{ u.行动槽.移动 }} 反{{ u.行动槽.反应 }}</div>
        <div v-if="u.状态.length" class="unit-status">状态: {{ u.状态.map(st => st.名 + (st.层数 ? `×${st.层数}` : '')).join('，') }}</div>
        <div v-if="u.护盾 > 0" class="unit-shield">护盾: {{ u.护盾 }}</div>
        <div v-if="冷却中(u)" class="unit-cd">冷却中: {{ 冷却中(u) }}</div>

        <!-- 完整详情 -->
        <div v-if="展开角色.includes(u.id)" class="unit-detail">
          <div class="ud-block">
            <div class="ud-title">武器装备</div>
            <div class="ud-line">主武器：{{ 武器文案(u.主武器) }}</div>
            <div class="ud-line">副武器：{{ 武器文案(u.副武器) }}</div>
            <div v-for="e in u.装备 ?? []" :key="e.槽 + e.名称" class="ud-line dim2">
              {{ e.槽 }}：{{ e.名称 }}<span v-if="e.摘要">（{{ e.摘要 }}）</span>
            </div>
          </div>

          <div class="ud-block">
            <div class="ud-title">状态与增益（{{ u.状态.length }}）</div>
            <div v-for="st in u.状态" :key="st.名" class="ud-line">
              {{ st.名 }}{{ st.层数 ? ` ×${st.层数}` : '' }}（剩 {{ st.持续 }} 回合）
              <span v-if="数值修正文案(st)">｜{{ 数值修正文案(st) }}</span>
              <span v-if="st.词条 && st.词条.length" class="dim2">｜词条 {{ st.词条.join('、') }}</span>
            </div>
            <div v-if="!u.状态.length" class="ud-line dim2">（无状态）</div>
            <div v-if="u.词条 && [...u.词条].length" class="ud-line">词条：{{ [...u.词条].join('、') }}</div>
            <div v-if="u.护盾 > 0" class="ud-line">护盾：{{ u.护盾 }}</div>
          </div>

          <div class="ud-block">
            <div class="ud-title">技能 / 装备效果（{{ 技能条目(u).length }}）</div>
            <div class="detail-table">
              <div class="dt-row dt-head">
                <span>名称</span><span>行动</span><span>射程</span><span>目标</span><span>消耗</span><span>冷却</span><span>倍率</span><span>规则</span>
              </div>
              <div v-for="d in 技能条目(u)" :key="d.名" class="dt-row">
                <span class="dt-name" :title="d.名">{{ d.名 }}</span>
                <span>{{ d.行动类型 }}</span>
                <span>{{ d.射程 || '—' }}</span>
                <span>{{ d.目标 || '—' }}</span>
                <span>{{ d.消耗 || '—' }}</span>
                <span>{{ d.冷却 ?? '—' }}</span>
                <span>{{ d.倍率 }}</span>
                <span>{{ d.规则数 ? d.规则数 + ' 条' : '—' }}</span>
              </div>
              <div v-if="!技能条目(u).length" class="dt-empty">（没有已翻译的效果 —— 只能用基础武器攻击）</div>
            </div>
          </div>

          <!-- 效果详情：把每条规则翻成人话。玩家反馈「点技能完全不知道有什么用，
               比如一个二阶段变身技能，完全不知道能干什么」——这里就是答案。 -->
          <div class="ud-block">
            <div class="ud-title">效果详情</div>
            <div v-for="d in 技能条目(u)" :key="'eff-' + d.名" class="ud-eff">
              <div class="ud-eff-head">
                {{ d.名 }}<span class="dim2"> · {{ d.预览.头部.join(' · ') }}</span>
              </div>
              <div v-for="(行, i) in d.预览.行" :key="i" class="ud-line dim2">{{ 行 }}</div>
            </div>
            <div v-if="!技能条目(u).length" class="ud-line dim2">（无）</div>
          </div>
        </div>
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
      <div v-for="u in 我方单位" :key="u.键" class="unit-action">
        <div class="ua-head">
          <span class="ua-name">{{ u.名称 }}</span>
          <span class="ua-meta">
            HP {{ u.HP_当前 }}/{{ u.HP_最大 }} · 距 {{ u.距离 }}米 · 额度 {{ u.额度 }} · 槽 主{{ u.行动槽.主要 }} 次{{ u.行动槽.次要 }} 移{{ u.行动槽.移动 }}
          </span>
        </div>

        <div class="slot-row">
          <!-- 按**行动类型**匹配：主要行动只列主要行动技能 + 主武器攻击；次要行动同理（副武器攻击） -->
          <label class="slot">
            <span class="slot-label">主要</span>
            <select v-model="填写表[u.键].主要">
              <option value="">（不出手）</option>
              <option v-for="o in 主要选项(u)" :key="o.值" :value="o.值">{{ o.标签 }}</option>
            </select>
          </label>
          <label class="slot">
            <span class="slot-label">次要</span>
            <select v-model="填写表[u.键].次要">
              <option value="">（不出手）</option>
              <option v-for="o in 次要选项(u)" :key="o.值" :value="o.值">{{ o.标签 }}</option>
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
              <!-- 反应动作**只列自己学过的**（行动类型 = 反应动作的技能）——
                   以前这里是硬编码的六个名字（击溃/识破/招架/闪避/格挡/闪烁），
                   没学过也能选，选了也没有任何结算。玩家反馈：取消预设，必须自己学。 -->
              <option v-for="o in 反应选项(u)" :key="o.值" :value="o.值">{{ o.标签 }}</option>
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

        <!-- 免费行动：**不限次数**，想放几个放几个（世界书：免费行动不占次数） -->
        <div class="free-row">
          <span class="slot-label">免费行动（不限次，可多选）</span>
          <label v-for="o in 免费选项(u)" :key="o.值" class="free-opt">
            <input type="checkbox" :value="o.值" v-model="填写表[u.键].免费" />
            {{ o.标签 }}
          </label>
          <span v-if="!免费选项(u).length" class="dim">（该单位没有免费行动）</span>
        </div>

        <!-- 本回合**行动顺序**：玩家反馈「我次要行动和免费行动都是上 buff，
             那总不能等我主要行动的大招放完了再上个寂寞吧？」→ 选完自己排。 -->
        <div v-if="行动条目(u).length > 1" class="order-row">
          <span class="slot-label">行动顺序（↑↓ 调）</span>
          <span v-for="(a, i) in 行动条目(u)" :key="a.键" class="order-item">
            <button class="ord-btn" :disabled="i === 0" title="上移" @click="调序(u, i, -1)">↑</button>
            <span class="ord-name">{{ a.显示 }}</span>
            <button class="ord-btn" :disabled="i === 行动条目(u).length - 1" title="下移" @click="调序(u, i, 1)">↓</button>
          </span>
        </div>

        <!-- 选中项的效果预览：玩家反馈「各个行动的选项，不知道详细效果，
             没办法直观地看出来」。选了什么，下面就摆出它到底干什么。 -->
        <div v-if="选中预览(u).length" class="preview-block">
          <div v-for="p in 选中预览(u)" :key="p.槽 + p.名" class="pv-item">
            <div class="pv-head">
              <span class="pv-slot">{{ p.槽 }}</span>
              <span class="pv-name">{{ p.名 }}</span>
              <span class="pv-meta">{{ p.预览.头部.join(' · ') }}</span>
            </div>
            <div v-for="(行, i) in p.预览.行" :key="i" class="pv-line">{{ 行 }}</div>
          </div>
        </div>
      </div>

      <div class="action-submit">
        <button class="execute-btn" :disabled="!可提交本轮 || 禁用" @click="执行本轮">
          {{ 追加模式 ? '提交追加行动' : '执行本轮' }}
        </button>
        <span class="dim">
          {{
            追加模式
              ? '这是该单位的额外行动回合（槽位已重置为一整套）—— 指定行动后继续走完本轮剩下的先攻'
              : '至少给一个单位下达行动（没下命令的单位本回合不出手）'
          }}
        </span>
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
import { 可提交, 列行动条目, type 行动槽填写 } from '../engine/actionInput';
import { 造我方条目, 造技能展示, 选中行动预览, 显示名, type 我方条目 } from '../engine/viewModel';
import { 列行动选项 } from '../engine/actionOptions';
import type { 敌方意图 } from '../ai/enemyTactics';
import type { 战斗状态 } from '../types';

const props = defineProps<{
  状态: 战斗状态;
  日志: string[];
  /** 敌方意图（阶段 ③ 预公开）；未开战时为空数组 */
  敌方意图?: 敌方意图[];
  /** 上层忙碌（回合编排 / 本轮结算中）→ 禁用「执行本轮」，挡异步重入 */
  禁用?: boolean;
  /** 正在忙什么（如「正在生成敌方意图（第 3 回合）…」）—— 非空时显示转圈圈 */
  进度?: string;
  /** 追加行动回合模式：只给某个单位指定行动，按钮文案与提示随之变化 */
  追加模式?: boolean;
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
    .map(u => ({ ...u, 名称: 显示名(u) }))
    .sort((a, b) => a.距离 - b.距离),
);

/**
 * 距离轴的两端。
 * **玩家是原点**（距离 0），负数是身后、正数是身前 —— 所以轴是双向的，
 * 不能像以前那样把玩家放在最左端、只往右延伸（实战反馈：开场看不到"负距离"这一侧）。
 * 两端各留一点余量，免得贴边的标记被裁掉。
 */
const 距离范围 = computed(() => {
  const 距离们 = 排序单位.value.map(u => u.距离 ?? 0);
  const 最远 = Math.max(10, ...距离们.map(Math.abs));
  return { 最小: Math.min(-10, ...距离们), 最大: Math.max(10, ...距离们), 绝对值: 最远 };
});

/** 米 → 横向百分比（玩家原点落在中间某处，而不是最左端） */
function 距离百分比(d: number): number {
  const { 最小, 最大 } = 距离范围.value;
  const 跨度 = Math.max(最大 - 最小, 1);
  return Math.min(100, Math.max(0, ((d - 最小) / 跨度) * 100));
}

/** 玩家原点（0 米）在条上的横向位置 */
const 原点百分比 = computed(() => 距离百分比(0));

/** 同一个距离上的单位**上下堆叠**（以前会完全重叠、互相遮挡） */
const 分组标记 = computed(() => {
  const 按距离 = new Map<number, typeof 排序单位.value>();
  for (const u of 排序单位.value) {
    const 距离 = u.距离 ?? 0;
    按距离.set(距离, [...(按距离.get(距离) ?? []), u]);
  }
  return [...按距离.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([距离, 单位们]) => ({ 距离, 左: 距离百分比(距离), 单位们 }));
});

/** 同一点最多叠几个 → 决定条的高度 */
const 距离条高度 = computed(() =>
  Math.max(46, 52 + (Math.max(0, ...分组标记.value.map(g => g.单位们.length)) - 1) * 20),
);

// ==================== 我方行动区 ====================

// 条目的形状在 engine/viewModel（有测试钉死）—— **条目继承 战斗单位**，
// 所以模板里直接写 u.HP_当前 / u.行动槽.主要 就行，不要写 u.单位.xxx
// （写错这一层会在运行时抛错、把整个组件渲染成一片空白，实战踩过）。
const 我方单位 = computed<我方条目[]>(() => 造我方条目(props.状态.单位));

/** 每个我方单位各自的槽位填写；键 = 状态.单位 的键 */
const 填写表 = reactive<Record<string, 行动槽填写>>({});
const 目标表 = reactive<Record<string, string>>({});
/** 玩家调过的行动顺序（键 → 有序键列表）；没调过的单位不在这里，用默认顺序 */
const 顺序表 = reactive<Record<string, string[]>>({});

// 单位增删时补齐/清理填写表（Vue 3 的 reactive 对象新增键也是响应式的）
watch(
  我方单位,
  列表 => {
    const 在场上 = new Set(列表.map(x => x.键));
    for (const x of 列表) {
      if (!填写表[x.键]) 填写表[x.键] = {};
      if (!填写表[x.键].免费) 填写表[x.键].免费 = [];
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
    .map(([键, u]) => ({ 键, 显示: `${显示名(u)}（HP ${u.HP_当前}/${u.HP_最大} · 距 ${u.距离}米 · 防 ${u.防御} 闪 ${u.闪避值}）` })),
);

/** 支援目标（我方，含自己 —— 上 buff / 治疗都走支援行动） */
function 支援目标(自己: 我方条目) {
  return 我方单位.value
    .filter(x => x.HP_当前 > 0)
    .map(x => ({
      键: x.键,
      显示: `${x.id === 自己.id ? '自己：' : ''}${x.名称}（HP ${x.HP_当前}/${x.HP_最大}）`,
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

/**
 * 反应动作可选项：**只列该单位学过的、行动类型为「反应动作」的技能**。
 * 玩家口径：「反应动作不应该是有预设的那些反应动作，必须是技能的类型是反应动作才算上。
 * 取消预设的反应动作，必须要自己学。」→ 没学过就是空的（下拉里只剩"不预置"）。
 */
function 反应选项(u: 我方条目) {
  return 列行动选项(u, '反应动作');
}

/** 展开详情的单位 id（详情在**单位卡**上，能一次看全状态/装备/技能） */
const 展开角色 = ref<string[]>([]);
function 切换角色详情(id: string) {
  展开角色.value = 展开角色.value.includes(id)
    ? 展开角色.value.filter(k => k !== id)
    : [...展开角色.value, id];
}

/** 倒地标签：HP ≤ 0 时说明是濒死检定中 / 已稳定昏迷 / 已死亡（世界书三个阶段） */
function 倒地标签(u: 战斗单位): string {
  if (u.HP_当前 > 0) return '';
  const 失败 = u.濒死?.失败 ?? 0;
  if (失败 >= 3) return '已死亡';
  if (!u.濒死) return '已稳定（昏迷）';
  return `濒死（${u.濒死.成功}/2 成功，${失败}/3 失败）`;
}

/** 武器一句话（没有就是徒手） */
function 武器文案(w: 战斗单位['主武器']): string {
  if (!w) return '无（徒手 1d4 · ×0.5）';
  return `${w.伤害骰} · ×${w.倍率}${w.强化等级 ? ` · 强化+${w.强化等级}` : ''}`;
}

/** 状态携带的数值修正（支援 buff / 破甲这类落成状态的效果） */
function 数值修正文案(st: { 数值修正?: Record<string, number> }): string {
  const 条 = Object.entries(st.数值修正 ?? {});
  if (!条.length) return '';
  return 条.map(([k, v]) => `${k}${v >= 0 ? '+' : ''}${v}`).join('、');
}

/** 还在冷却里的技能（空串 = 没有，模板里 v-if 直接可用） */
function 冷却中(u: 战斗单位): string {
  return Object.entries(u.冷却 ?? {})
    .filter(([, 剩余]) => 剩余 > 0)
    .map(([名, 剩余]) => `${名}(${剩余})`)
    .join('、');
}

/**
 * 该单位在某个行动类型下能做什么 —— 技能按**行动消耗**归类，外加该类型的基础武器攻击。
 * 不能主动释放的（被动/光环/行动消耗「无」的装备与天赋）不会出现在这里，
 * 它们的数值效果由引擎的 `常驻修正` 直接算（玩家反馈：防具不该算行动）。
 */
function 主要选项(u: 我方条目) {
  return 列行动选项(u, '主要行动');
}
function 次要选项(u: 我方条目) {
  return 列行动选项(u, '次要行动');
}
/** 免费行动：不限次数，界面上是多选（勾几个放几个） */
function 免费选项(u: 我方条目) {
  return 列行动选项(u, '免费行动');
}

/** 技能/装备的展示条目（形状在 engine/viewModel，有测试钉死） */
function 技能条目(条目: 我方条目) {
  return 造技能展示(条目.技能);
}

/**
 * 该单位**已经选中**的行动的效果预览（主要/次要下拉 + 免费多选）。
 * 形状与逻辑在 `engine/viewModel.选中行动预览`（纯函数、有测试钉死）。
 */
function 选中预览(u: 我方条目) {
  return 选中行动预览(u, 填写表[u.键] ?? {});
}

/**
 * 该单位本回合已选的行动条目（有序）。键的推法**来自引擎**（`列行动条目`）——
 * 界面不自己推一遍键，否则两边一旦不一致，排序会静默失效。
 */
function 行动条目(u: 我方条目) {
  const 基础 = 列行动条目(填写表[u.键] ?? {}, '');
  const 序 = 顺序表[u.键] ?? [];
  if (!序.length) return 基础;
  const 有序 = 序.map(k => 基础.find(x => x.键 === k)).filter(Boolean) as typeof 基础;
  return [...有序, ...基础.filter(x => !有序.includes(x))];
}

/** ↑↓ 调序：把当前顺序固化进 顺序表（换位置只是换数组里两个元素） */
function 调序(u: 我方条目, i: number, 方向: -1 | 1) {
  const 列表 = 行动条目(u).map(x => x.键);
  const j = i + 方向;
  if (j < 0 || j >= 列表.length) return;
  [列表[i], 列表[j]] = [列表[j], 列表[i]];
  顺序表[u.键] = 列表;
}

/**
 * 能不能点「执行本轮」：至少要有一个单位真的出手（只预置反应不算）。
 * 我方全员倒地时不会走到这里 —— CombatView 会直接把濒死检定算到底并结束战斗
 * （不再空转回合、也不再调 AI）。
 */
const 可提交本轮 = computed(() => 我方单位.value.some(x => 可提交(填写表[x.键] ?? {})));

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
    // 带上玩家排好的**行动顺序**（没调过就是默认顺序，引擎自己会兜底）
    各单位[x.键] = {
      填写: { ...填写, 行动顺序: 行动条目(x).map(a => a.键) },
      目标: 目标表[x.键] ?? '',
    };
  }
  emit('执行本轮', 各单位);
}

/** 上层结算完通知清空（避免下一回合误带上一轮的选择） */
function 清空填写() {
  for (const 键 of Object.keys(填写表)) 填写表[键] = {};
  for (const 键 of Object.keys(顺序表)) delete 顺序表[键]; // 顺序也一起清（下一回合重排）
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
  height: 46px; /* 由 距离条高度 动态覆盖（同一距离人多时变高） */
  margin: 16px 0 22px;
  border-bottom: 2px solid #444;
}

.axis-hint {
  position: absolute;
  bottom: 2px;
  font-size: 10px;
  color: #666;
  pointer-events: none;

  &.left { left: 0; }
  &.center { transform: translateX(-50%); color: #6a8a6a; }
  &.right { right: 0; }
}

.axis-empty {
  position: absolute;
  bottom: 16px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 12px;
  color: #666;
}

/* 同一距离的一组：整个组在横向定位，组内上下堆叠 */
.marker-group {
  position: absolute;
  bottom: 6px;
  transform: translateX(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.distance-marker {
  position: relative;
  padding: 2px 8px;
  margin-top: 2px;
  border-radius: 10px;
  font-size: 12px;
  white-space: nowrap;

  &.ally { background: #1d3a1d; border: 1px solid #3a6a3a; color: #9d9; }
  &.enemy { background: #3a1d1d; border: 1px solid #6a3a3a; color: #d99; }
  &.self { border-color: #8ab; color: #cef; }
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

.free-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px dashed #2a2a2a;
  font-size: 12px;
}

.free-opt {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #bbb;
  cursor: pointer;

  input { accent-color: #4a7; }
}

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

/* 行动顺序（↑↓） */
.order-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  margin: 6px 0 2px;
}
.order-item {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  background: #1e1e24;
  border: 1px solid #33334a;
  border-radius: 5px;
  padding: 1px 4px;
}
.ord-name { font-size: 12px; color: #cdd; }
.ord-btn {
  background: transparent;
  color: #99a;
  border: none;
  cursor: pointer;
  font-size: 12px;
  padding: 0 3px;
  &:disabled { opacity: 0.25; cursor: default; }
  &:not(:disabled):hover { color: #fff; }
}

/* 选中项的效果预览 */
.preview-block {
  margin: 6px 0 2px;
  padding: 6px 8px;
  background: #17171c;
  border: 1px solid #2c2c38;
  border-radius: 6px;
}
.pv-item { margin-bottom: 4px; }
.pv-head { display: flex; flex-wrap: wrap; gap: 6px; align-items: baseline; }
.pv-slot {
  font-size: 11px;
  color: #8ab;
  border: 1px solid #33475a;
  border-radius: 4px;
  padding: 0 4px;
}
.pv-name { font-size: 13px; color: #e0e6ee; }
.pv-meta { font-size: 11px; color: #778; }
.pv-line { font-size: 12px; color: #a8b4c0; padding-left: 8px; }

/* 效果详情（详情面板里的人话区） */
.ud-eff { margin-bottom: 6px; }
.ud-eff-head { font-size: 13px; color: #dde; }
</style>
