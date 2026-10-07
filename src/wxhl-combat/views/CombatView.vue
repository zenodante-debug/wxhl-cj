<template>
  <div class="combat-view-root">
    <template v-if="阶段 === '准备'">
      <SetupView
        :忙碌="开战中"
        :禁用="翻译失败清单.length > 0"
        :进度="开战进度"
        @开战="开始战斗"
      />

      <!-- 翻译复核：失败项列出**原因**，勾选后可只重发这些（spec §5.4） -->
      <div v-if="翻译失败清单.length > 0" class="review-panel">
        <h4>翻译复核 · {{ 翻译失败清单.length }} 项未成功</h4>
        <p class="review-hint">
          勾选要重试的项后点「重新解析选中项」（仍是一次批量调用，只发选中的）；也可以直接带着缺失开战 —— 缺失项会写进战斗日志，不会静默。
        </p>
        <label v-for="(f, i) in 翻译失败清单" :key="i" class="review-row">
          <input type="checkbox" v-model="f.选中" />
          <span class="review-who">{{ f.单位 }} · {{ f.名称 }}</span>
          <span class="review-why">{{ f.原因 }}</span>
        </label>
        <div class="review-actions">
          <button :disabled="复核忙碌 || 选中项数 === 0" @click="重新解析">
            {{ 复核忙碌 ? '重新解析中…' : `重新解析选中项（${选中项数}）` }}
          </button>
          <button class="ghost" :disabled="复核忙碌" @click="带着缺失开战">带着缺失开战</button>
        </div>
      </div>

      <!-- 开战失败（如 API 未配置）会留在此态：错误只在 日志 里，必须在这里也渲染出来 -->
      <div v-if="日志.length" class="prep-log">
        <div v-for="(s, i) in 日志" :key="i" class="prep-log-entry">{{ s }}</div>
      </div>
    </template>
    <template v-else-if="阶段 === '战斗'">
      <BattleView
        :状态="战斗"
        :日志="日志"
        :敌方意图="敌方意图列表"
        :禁用="忙碌"
        @执行本轮="执行本轮"
      />
      <PendingModal :待决="战斗.待决" @决策="处理决策" />
    </template>
    <div v-else class="settle-stage">
      <h3>战斗结束</h3>
      <p class="dim">正在生成收尾正文…</p>
      <!-- 收尾期间还要写回变量 / 落楼，失败只记在 日志 里：这里也要渲染，否则错误被吞掉 -->
      <div v-if="日志.length" class="settle-log">
        <div v-for="(s, i) in 日志" :key="i" class="settle-log-entry">{{ s }}</div>
      </div>
      <button :disabled="忙碌" @click="回准备">回到准备</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue';
import SetupView from './SetupView.vue';
import BattleView from './BattleView.vue';
import PendingModal from './PendingModal.vue';
import { 初始化战斗状态, 开场距离随机, 开场距离选项 } from '../engine/setup';
import { 结算行动, 找单位 } from '../engine/loop';
import { 阶段A资源恢复, 阶段F结算 } from '../engine/turn';
import { 行动槽重置 } from '../engine/actionEconomy';
import { 移动距离计算, 移动额度重置 } from '../engine/distance';
import { 构造行动声明, type 行动槽填写 } from '../engine/actionInput';
import type { 敌方意图, 意图行动 } from '../ai/enemyTactics';
import {
  生成敌方意图,
  读战斗状态,
  写战斗状态,
  写收尾楼层,
  写回战斗结果,
  读取战斗单位,
  读取单位效果源,
  翻译战斗解释,
} from '../store';
import type { 单位效果源, 翻译失败项 } from '../store';
import type { 战斗状态, 战斗单位, 战斗解释 } from '../types';

const 阶段 = ref<'准备' | '战斗' | '收尾'>('准备');
const 战斗 = ref<战斗状态>({
  进行中: false, 回合: 0, 先攻: [], 单位: {}, 待决: null, 领域: [],
});
const 日志 = ref<string[]>([]);
const 敌方意图列表 = ref<敌方意图[]>([]);
/** 忙碌锁：回合编排 / 本轮结算 / 收尾期间挡重入（AI 调用是异步长操作） */
const 忙碌 = ref(false);
/** 战斗已分出胜负：挡住收尾期间误点「执行本轮」 */
const 战斗结束 = ref(false);
/**
 * 开战进度。
 * 开战要连发几十个 AI 请求（每个效果翻一次 + 一次敌方意图），
 * 没有这个玩家看到的就是「点了没反应」（实测反馈的 bug）。
 */
const 开战中 = ref(false);
const 开战进度 = ref('');
/** 翻译失败清单（复核界面用）：带原因与来源，勾选后只重发选中的 */
const 翻译失败清单 = ref<Array<翻译失败项 & { 选中: boolean }>>([]);
/** 停在复核界面时暂存的待开战上下文（重试成功后才真正开战） */
const 待开战 = ref<{ 单位列表: 战斗单位[]; 开场模式: string } | null>(null);
/** 复核界面自己在忙（重试期间挡重入） */
const 复核忙碌 = ref(false);
/** 已勾选的失败项数 */
const 选中项数 = computed(() => 翻译失败清单.value.filter(f => f.选中).length);

function 空战斗(): 战斗状态 {
  return { 进行中: false, 回合: 0, 先攻: [], 单位: {}, 待决: null, 领域: [] };
}

onMounted(async () => {
  // 刷新恢复（Review Focus 2）
  const 恢复 = await 读战斗状态();
  if (恢复) {
    战斗.value = 恢复;
    阶段.value = '战斗';
    日志.value.push('已从持久化恢复战斗');
  }
});

async function 开始战斗(选择: { id: string; 阵营: '我方' | '敌方' }[], 开场模式: string) {
  if (开战中.value) return; // 按钮已禁用，这里再挡一层重入
  日志.value = [];
  敌方意图列表.value = [];
  战斗结束.value = false;
  翻译失败清单.value = [];
  待开战.value = null;
  阶段.value = '准备'; // 失败时留在准备态（Review Focus 5）
  开战中.value = true;
  try {
    开战进度.value = '读取参战单位…';
    const 单位列表: 战斗单位[] = [];
    const 效果源: Record<string, 单位效果源[]> = {};
    for (const c of 选择) {
      单位列表.push(await 读取战斗单位(c.id, c.阵营));
      效果源[c.id] = await 读取单位效果源(c.id);
    }

    // 一次性翻译（**整场 1 次 AI 调用**，spec §10.1）。
    const 总条数 = 单位列表.reduce((n, u) => n + (效果源[u.id]?.length ?? 0), 0);
    开战进度.value = `翻译全部效果（${总条数} 项，1 次 AI 调用）…`;
    const { 表, 失败 } = await 翻译战斗解释(
      单位列表.map(u => ({ id: u.id, 效果源: 效果源[u.id] ?? [] })),
    );
    应用翻译(单位列表, 表);

    // 有失败 → 停在复核界面：显示**原因**、可勾选重试，而不是直接带着缺失开战
    if (失败.length > 0) {
      翻译失败清单.value = 失败.map(f => ({ ...f, 选中: true }));
      待开战.value = { 单位列表, 开场模式 };
      开战进度.value = `${失败.length} 项翻译失败，勾选后可重试，或直接带着缺失开战`;
      return;
    }

    await 落定开战(单位列表, 开场模式);
  } catch (e: any) {
    日志.value.push(`开战失败：${e?.message ?? e}`);
  } finally {
    开战中.value = false;
  }
}

/** 把翻译结果合并进各单位（重试时也走这里，所以是合并不是替换） */
function 应用翻译(单位列表: 战斗单位[], 表: Record<string, Record<string, 战斗解释>>) {
  for (const u of 单位列表) u.技能 = { ...(u.技能 ?? {}), ...(表[u.id] ?? {}) };
}

/** 翻译过关（或玩家选择带着缺失走）之后，真正开战 */
async function 落定开战(单位列表: 战斗单位[], 开场模式: string) {
  开战进度.value = '掷先攻、初始化战场…';
  const 选项 = 开场距离选项().find(o => o.名 === 开场模式) ?? 开场距离选项()[2];
  const 战斗0 = 初始化战斗状态(单位列表, 开场距离随机(选项.范围));
  战斗.value = 战斗0;
  await 写战斗状态(战斗0);
  日志.value.push(`开战：${开场模式}，共 ${单位列表.length} 个单位`);
  阶段.value = '战斗';

  // 进入第 1 回合：重置行动槽/额度 → 阶段A → 生成敌方意图
  开战进度.value = '生成敌方意图…';
  await 开始回合();
}

/** 复核界面：重新解析**勾选的那些**（仍是一次批量调用，只发选中的） */
async function 重新解析() {
  const 选中 = 翻译失败清单.value.filter(f => f.选中);
  if (选中.length === 0 || 复核忙碌.value || !待开战.value) return;
  复核忙碌.value = true;
  try {
    // 按单位分组后一次发出
    const 分组 = new Map<string, 单位效果源[]>();
    for (const f of 选中) {
      const 组 = 分组.get(f.单位) ?? [];
      组.push(f.来源);
      分组.set(f.单位, 组);
    }
    const { 表, 失败 } = await 翻译战斗解释(
      [...分组.entries()].map(([id, 效果源]) => ({ id, 效果源 })),
    );
    应用翻译(待开战.value.单位列表, 表);
    // 清单只保留这一轮**仍失败**的（成功的已经进技能表了）
    翻译失败清单.value = 失败.map(f => ({ ...f, 选中: true }));
    const 成功数 = 选中.length - 失败.length;
    日志.value.push(
      失败.length === 0
        ? `重新解析成功：${成功数} 项已补上`
        : `重新解析：${成功数} 项成功、${失败.length} 项仍失败（原因已更新）`,
    );
    if (翻译失败清单.value.length === 0) {
      开战进度.value = '全部翻译成功，可以开战了';
    }
  } catch (e: any) {
    日志.value.push(`重新解析失败：${e?.message ?? e}`);
  } finally {
    复核忙碌.value = false;
  }
}

/** 放弃重试，带着缺失开战（把缺失项与原因记进日志，绝不静默） */
async function 带着缺失开战() {
  const ctx = 待开战.value;
  if (!ctx || 开战中.value || 复核忙碌.value) return;
  开战中.value = true;
  try {
    if (翻译失败清单.value.length > 0) {
      日志.value.push(
        `带着 ${翻译失败清单.value.length} 项未翻译开战：` +
          翻译失败清单.value.map(f => `${f.名称}（${f.原因}）`).join('；'),
      );
    }
    翻译失败清单.value = [];
    await 落定开战(ctx.单位列表, ctx.开场模式);
  } catch (e: any) {
    日志.value.push(`开战失败：${e?.message ?? e}`);
  } finally {
    开战中.value = false;
  }
}

/**
 * 推进一个回合的开局（含错误兜底 + 忙碌锁 + 持久化）：
 * 重置行动槽/额度 → 阶段A 资源恢复 → 记回合头 → 生成敌方意图。
 * 由 开始战斗 之后、每轮结算之后调用。
 */
async function 开始回合() {
  if (忙碌.value) return;
  忙碌.value = true;
  try {
    try {
      await 推进回合();
    } catch (e: any) {
      日志.value.push(`回合开始失败：${e?.message ?? e}`);
    }
    await 写战斗状态(战斗.value);
  } catch (e: any) {
    日志.value.push(`保存战斗状态失败：${e?.message ?? e}`);
  } finally {
    忙碌.value = false;
  }
}

/**
 * 回合开局的纯编排（不含锁；可能因 AI 失败抛错）。
 *
 * 行动槽与移动额度必须**每回合重置**：
 * - spec §9.1「回合开始时重置为默认」（免费槽不重置）；
 * - spec §8.2「本回合额度 = 【移动距离】，每回合重置为满额」。
 * 不重置则第 2 回合起所有单位槽位/额度耗尽，整个循环死掉。
 */
async function 推进回合() {
  const 新单位: Record<string, 战斗单位> = {};
  for (const [键, u] of Object.entries(战斗.value.单位)) {
    新单位[键] = {
      ...阶段A资源恢复(u),
      行动槽: 行动槽重置(u.行动槽),
      额度: 移动额度重置(移动距离计算(u.属性.实际.AGI, u.阶位, 0)),
    };
  }
  战斗.value = { ...战斗.value, 单位: 新单位 };
  日志.value.push(`—— 第 ${战斗.value.回合} 回合 ——`);

  // 敌方意图：一次 AI 调用，为全体敌方决定本回合行动
  敌方意图列表.value = await 生成敌方意图(战斗.value);
  日志.value.push(
    ...敌方意图列表.value.flatMap(x =>
      x.行动.map(a => `【意图】${x.单位} → ${a.类型}${a.技能 ? `·${a.技能}` : ''}`),
    ),
  );
}

async function 执行本轮(填写: 行动槽填写, 目标: string) {
  if (忙碌.value || 战斗结束.value) return;
  忙碌.value = true;
  let 进下一回合 = false;
  try {
    const { 行动: 玩家行动, 预置反应 } = 构造行动声明(填写, 目标);

    // Task 13d Minor：多敌人时目标可留空 → 带目标的声明若目标为空，不结算，先提示
    if (玩家行动.some(a => a.类型 !== '移动' && !a.目标)) {
      日志.value.push('请先选择目标，再执行本轮');
      return;
    }

    if (预置反应) 日志.value.push(`（已预置反应：${预置反应}）`);

    let 状态 = 战斗.value;
    const 追加日志: string[] = [];

    // 按先攻顺序逐单位行动（玩家与敌方交错）。
    // 结算行动 是纯函数：状态用局部变量逐次推进，循环外一次性写回，避免半成品暴露给 UI。
    for (const id of [...状态.先攻]) {
      const u = 状态.单位[id] ?? Object.values(状态.单位).find(x => x.id === id);
      if (!u) continue;

      const 是玩家 = u.id === '契约者';
      // 敌方意图的「单位」可能是短名/全路径/「玩家」——用 找单位 归一化后再按 id 比对
      const 本意图 = 敌方意图列表.value.find(x => 找单位(状态, x.单位)?.id === u.id);
      const 本行动: 意图行动[] = 是玩家 ? (玩家行动 as 意图行动[]) : (本意图?.行动 ?? []);

      for (const a of 本行动) {
        // 每个行动前按 id 重取行动者：上一个行动可能已改了它的 HP（如一命换一命的自我代价），
        // 结算行动的存活守卫要看到最新值，不能拿本轮开头的旧引用。
        const 行动者 = Object.values(状态.单位).find(x => x.id === u.id);
        if (!行动者) break;

        const r = 结算行动(状态, 行动者, a);
        状态 = r.状态;
        追加日志.push(...r.步骤.map(s => s.内容));
      }
    }

    // 阶段F：持续伤害与状态递减
    const 新单位 = { ...状态.单位 };
    for (const [键, u] of Object.entries(新单位)) {
      const r = 阶段F结算(u, u.HP_最大);
      if (r.HP扣减 > 0) 追加日志.push(`${键} 持续伤害 -${r.HP扣减} → HP ${r.新状态.HP_当前}`);
      新单位[键] = r.新状态;
    }

    战斗.value = { ...状态, 回合: 状态.回合 + 1, 单位: 新单位 };
    日志.value.push(...追加日志);
    敌方意图列表.value = [];

    // 结算胜负：任一方全部「战斗不能」（HP ≤ 0）→ 收尾
    // 最小终止条件 —— 玩家侧也必须有一条，否则契约者 HP 归零后敌方每轮打一个 0 血目标、循环永不终止。
    // （濒死 CON 检定 / 转阶段仍留 13f 的待决点交互）
    const 敌方存活 = Object.values(战斗.value.单位).some(u => u.阵营 === '敌方' && u.HP_当前 > 0);
    const 我方存活 = Object.values(战斗.value.单位).some(u => u.阵营 === '我方' && u.HP_当前 > 0);
    if (!敌方存活 || !我方存活) {
      日志.value.push(!我方存活 ? '—— 败北 ——' : '—— 胜利 ——');
      await 收尾();
      return; // 收尾 走完 finally 释放忙碌锁，不再进下一回合
    }

    await 写战斗状态(战斗.value);
    进下一回合 = true;
  } catch (e: any) {
    日志.value.push(`本轮结算失败：${e?.message ?? e}`);
  } finally {
    忙碌.value = false;
  }

  // 锁已释放再进下一回合（开始回合 自带锁与错误兜底；此刻无 await 间隙，不会被重入）
  if (进下一回合) await 开始回合();
}

/**
 * 收尾：写回 MVU → 生成收尾正文落楼 → 清持久化。
 * 先切「收尾」态卸载 BattleView（忙碌锁仍持有，挡住「回到准备」）。
 */
async function 收尾() {
  战斗结束.value = true;
  阶段.value = '收尾';
  try {
    const hp表: Record<string, { HP_当前: number; MP_当前: number; 耐力_当前: number }> = {};
    for (const u of Object.values(战斗.value.单位)) {
      hp表[u.id] = { HP_当前: u.HP_当前, MP_当前: u.MP_当前, 耐力_当前: u.耐力_当前 };
    }
    await 写回战斗结果(战斗.value, hp表);
  } catch (e: any) {
    日志.value.push(`写回变量失败：${e?.message ?? e}`);
  }
  try {
    // 写收尾楼层 需要 结算步骤[]（只用到 .内容）；这里把整条日志当战报交过去
    await 写收尾楼层(日志.value.map(内容 => ({ 类: '日志', 内容 })));
  } catch (e: any) {
    日志.value.push(`收尾正文失败：${e?.message ?? e}`);
  }
  try {
    await 写战斗状态(null);
  } catch (e: any) {
    日志.value.push(`清除持久化失败：${e?.message ?? e}`);
  }
}

function 处理决策(选择: string) {
  日志.value.push(`玩家决策: ${选择}`);
  战斗.value.待决 = null;
}

async function 回准备() {
  if (忙碌.value) return;
  await 写战斗状态(null);
  战斗.value = 空战斗();
  日志.value = [];
  敌方意图列表.value = [];
  战斗结束.value = false;
  阶段.value = '准备';
}
</script>

<style scoped lang="scss">
.review-panel {
  margin-top: 16px;
  padding: 14px;
  border: 1px solid #5a3a3a;
  border-radius: 8px;
  background: #1e1616;

  h4 {
    margin: 0 0 8px;
    color: #e0a0a0;
    font-size: 14px;
  }
}

.review-hint {
  margin: 0 0 12px;
  font-size: 12px;
  line-height: 1.6;
  color: #999;
}

.review-row {
  display: flex;
  align-items: baseline;
  gap: 8px;
  padding: 5px 0;
  font-size: 13px;
  border-top: 1px solid #2a2020;
  cursor: pointer;

  input { accent-color: #a66; }
}

.review-who {
  color: #ddd;
  flex-shrink: 0;
}

.review-why {
  color: #d08a8a;
  font-size: 12px;
  line-height: 1.5;
}

.review-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;

  button {
    padding: 7px 14px;
    background: #3a2424;
    border: 1px solid #6a4040;
    border-radius: 6px;
    color: #edd;
    font-size: 13px;
    cursor: pointer;

    &:hover { background: #4a2e2e; }
    &:disabled { opacity: 0.45; cursor: default; }
  }

  .ghost {
    background: transparent;
    border-color: #444;
    color: #bbb;
    &:hover { background: #2a2a2a; }
  }
}

.prep-log {
  margin-top: 14px;
  padding-top: 10px;
  border-top: 1px solid #2a2a2a;

  .prep-log-entry { padding: 3px 0; font-size: 13px; color: #f99; }
}

.settle-stage {
  h3 { margin-bottom: 8px; }
  .dim { color: #999; font-size: 13px; }

  .settle-log {
    margin: 14px 0;
    padding-top: 10px;
    border-top: 1px solid #2a2a2a;
    max-height: 40vh;
    overflow-y: auto;

    .settle-log-entry { padding: 3px 0; font-size: 13px; color: #bbb; }
  }

  button {
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
}
</style>
