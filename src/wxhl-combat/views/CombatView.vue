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
          勾选要重试的项后点「重新解析选中项」（只发选中的；条目多了会切成几批、顺序发送，不并发）；也可以直接带着缺失开战 —— 缺失项会写进战斗日志，不会静默。
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
      <!-- 额外行动回合：**当场打断**（玩家口径「技能加额外行动次数，当场打断行动，选择额外行动选项」）。
           这时只把该单位摆出来让它重新指定一轮行动，其余界面照旧可见（能看出为什么多了一轮）。 -->
      <div v-if="有效追加待办" class="extra-round-banner" role="status">
        ⚡「{{ 有效追加待办.名称 }}」获得额外行动回合 —— 请为它指定这一轮的追加行动（槽位已重置为一整套）
      </div>
      <BattleView
        ref="战场视图"
        :状态="有效追加待办 ? 追加状态 : 战斗"
        :日志="日志"
        :敌方意图="有效追加待办 ? [] : 敌方意图列表"
        :追加模式="!!有效追加待办"
        :演出事件="演出事件列表"
        :演出批次="演出批次"
        :禁用="忙碌"
        :进度="战场进度"
        @执行本轮="有效追加待办 ? 提交追加行动回合($event) : 执行本轮($event)"
        @放弃追加="放弃追加行动回合"
        @逃离战斗="逃离战斗"
      />
      <PendingModal :待决="战斗.待决" @决策="处理决策" />
    </template>
    <div v-else class="settle-stage" :class="结局文案">
      <!-- 三态横幅：金漆凯旋 / 血字陨落 / 灰字撤退 -->
      <div class="settle-banner" :class="结局文案">
        <h3 class="sb-title">{{ 结局横幅.标题 }}</h3>
      </div>
      <p v-if="结局文案 !== '逃离'" class="dim">正在生成收尾正文…</p>

      <!-- 战利品：按击杀发放钥匙（杂兵白 / 精英白银 / BOSS黄金 / 隐藏BOSS钻石 / 契约者血腥） -->
      <div v-if="结局文案 === '胜利' && 战利品.length" class="loot-list">
        <div class="loot-title">战利品</div>
        <div v-for="(k, i) in 战利品" :key="i" class="loot-row">
          <span class="loot-key" :class="钥匙类名(k.钥匙)">⚿</span>
          <span class="loot-name">{{ k.名 }}</span>
          <span class="loot-tier" :class="钥匙类名(k.钥匙)">{{ k.钥匙 }}</span>
        </div>
      </div>

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
import {
  开一轮,
  走一步,
  提交追加行动,
  敌方反应预置,
  开战常驻结算,
  阶段A规则结算,
  阶段F规则结算,
  回合开始行动槽,
  回合开始额度,
  回合开始追加行动,
  type 轮次状态,
} from '../engine/loop';
import { 阶段A资源恢复, 阶段F结算, 冷却递减, 濒死检定一轮, 濒死结算到底, 判定战局, 能行动 } from '../engine/turn';
import { 构造行动声明, type 行动槽填写 } from '../engine/actionInput';
import { 显示名 } from '../engine/viewModel';
import { 演出事件提取, type 演出事件 } from '../engine/showEvents';
import { 击杀明细 } from '../ai/aftermath';
import type { 敌方意图, 意图行动 } from '../ai/enemyTactics';
import { 随机意图, 随机意图说明 } from '../ai/enemyRoll';
import { 读设置, useSettingsStore } from '../settingsStore';
import {
  生成敌方意图,
  读战斗状态,
  写战斗状态,
  写收尾楼层,
  写回战斗结果,
  读取战斗单位,
  重算参战衍生属性,
  读取单位效果源,
  整理翻译缓存,
  翻译战斗解释,
  重置AI调用计数,
  取AI调用计数,
} from '../store';
import type { 单位效果源, 翻译失败项 } from '../store';
import type { 战斗状态, 战斗单位, 战斗解释, 结算步骤 } from '../types';

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
/** 收尾界面标题（胜利/败北/逃离）—— 逃离没有收尾正文，标题和副标要分开写 */
const 结局文案 = ref<'胜利' | '败北' | '逃离'>('胜利');

/** 三态收尾横幅：金漆凯旋 / 血字陨落 / 灰字撤退 */
const 结局横幅 = computed(() => {
  switch (结局文案.value) {
    case '败北':
      return { 标题: '陨落' };
    case '逃离':
      return { 标题: '撤退' };
    default:
      return { 标题: '凯旋' };
  }
});

/** 战利品：胜利时按击杀列出钥匙（五档配色）；败北/逃离没有 */
const 战利品 = computed(() => (结局文案.value === '胜利' ? 击杀明细(战斗.value) : []));

/** 钥匙档位 → 配色 class（杂兵白 / 精英白银 / BOSS黄金 / 隐藏BOSS钻石 / 契约者血腥） */
function 钥匙类名(钥匙: string): string {
  if (钥匙.includes('钻石')) return 'k-diamond';
  if (钥匙.includes('黄金')) return 'k-gold';
  if (钥匙.includes('白银')) return 'k-silver';
  if (钥匙.includes('血腥')) return 'k-blood';
  return 'k-white';
}
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
/**
 * 战场内的进度文案（「结算本轮…」/「正在生成敌方意图（第 N 回合）…」）。
 * 生成敌方意图是一次几十秒的 AI 调用，这期间界面只有一个灰按钮和空白意图区 ——
 * 没有这行字，玩家会以为坏了（和之前「点开战没反应」同一类反馈）。
 */
const 战场进度 = ref('');
/**
 * **本场战斗**的意图模式：开战时从设置里读一次就定下来。
 * 以前每回合都重新读设置 —— 一旦中途读到别的值（现场出现过"第 3 回合又变成调 AI"），
 * 战斗行为会在半途改变，而且无从查证。现在钉死 + 写进日志，任何异常都看得见。
 */
const 本战意图模式 = ref<'ai' | '随机'>('ai');
/** BattleView 实例引用（结算成功后调它的 清空填写） */
const 战场视图 = ref<{ 清空填写: () => void } | null>(null);

/**
 * 「额外行动回合」的当场打断状态：
 * - `轮次快照` = 停住那一刻的轮次（玩家提交后从它继续走完剩下的先攻）
 * - `追加待办` = 欠着追加回合的那个单位（非空时战斗界面切到"只给它指定行动"）
 */
const 轮次快照 = ref<轮次状态 | null>(null);
const 追加待办 = ref<{ 键: string; 名称: string } | null>(null);

/** 本轮的演出事件（决斗场美术：飘字/轨迹/变身…）。
 *  **不能在回合开始时清空** —— 结算赋值与回合开始之间只有微任务，
 *  清空会赶在首次 paint 之前，整场演出永远看不见（最终评审实锤）。
 *  改为每批一个递增批次号：新批次整批重建 DOM 节点，CSS 动画自然重播；
 *  旧批次动画本来就以 opacity:0 收尾，被替换时不可见、零成本。 */
const 演出事件列表 = ref<演出事件[]>([]);
const 演出批次 = ref(0);

/**
 * 追加待办的生命周期（防跨战斗状态污染）：开始战斗 / 逃离 / 回准备 / 收尾 都必须清 —
 * 不然玩家"暂停中逃离 → 开新战"会把旧战斗的轮次快照继续结算（代码评审实锤过这条腐化路径）。
 */
function 清追加待办(): void {
  追加待办.value = null;
  轮次快照.value = null;
}

/** 模板只认这个：追加待办的单位不在当前战场上时视为**没有**待办（stale ref 的第二道防线） */
const 有效追加待办 = computed(() => {
  const 待办 = 追加待办.value;
  if (!待办) return null;
  return 战斗.value.单位[待办.键] ? 待办 : null;
});

/** 追加回合时只把该单位摆出来（其余单位这一轮已经动过了） */
const 追加状态 = computed<战斗状态>(() => {
  const 待办 = 有效追加待办.value;
  if (!待办) return 战斗.value;
  const 单位 = 战斗.value.单位[待办.键];
  if (!单位) return 战斗.value;
  return { ...战斗.value, 先攻: [单位.id], 单位: { [待办.键]: 单位 } };
});

function 空战斗(): 战斗状态 {
  return { 进行中: false, 回合: 0, 先攻: [], 单位: {}, 待决: null, 领域: [] };
}

onMounted(async () => {
  // 刷新恢复（Review Focus 2）
  const 恢复 = await 读战斗状态();
  if (恢复) {
    // 幂等：同名状态"后覆盖先"，重复结算不会叠加
    战斗.value = 开战常驻结算(恢复);
    阶段.value = '战斗';
    日志.value.push('已从持久化恢复战斗');
  }
});

async function 开始战斗(选择: { id: string; 阵营: '我方' | '敌方' }[], 开场模式: string) {
  if (开战中.value) return; // 按钮已禁用，这里再挡一层重入
  // 开战前**强制把设置存一次**：面板内存里看到的 = 真正写进脚本变量的（开战读的就是它）。
  // 玩家实测过「设置完却没写进脚本变量」——这条兜底让那种情况不可能再发生；
  // 真写不进去时 保存() 会返回失败，设置页也会显示红字提醒。
  try {
    const r = useSettingsStore().保存();
    if (!r.成功) 日志.value.push(`⚠ 设置没存进脚本变量：${r.原因} —— 本次开战可能读不到 API 配置`);
  } catch (e: any) {
    console.log('[wxhl-combat] 开战前保存设置失败', e?.message ?? e);
  }
  // 读出来的是什么，也留一条（出现「未配置」时报错旁边就有对照）
  try {
    const s = 读设置();
    console.log('[wxhl-combat][诊断] 开战读到的设置', {
      快路: { URL: s.快路?.url ? '已填' : '空', Key: s.快路?.apiKey ? '已填' : '空', 模型: s.快路?.model || '空' },
      强路: { URL: s.强路?.url ? '已填' : '空', Key: s.强路?.apiKey ? '已填' : '空' },
      意图模式: s.意图模式,
    });
  } catch (e: any) {
    console.log('[wxhl-combat][诊断] 开战读设置抛错', e?.message ?? e);
  }
  清追加待办(); // 上一场暂停中留下的追加待办绝不能带进新战斗
  演出事件列表.value = []; // 上一场的演出残批也不能带进新战斗
  演出批次.value++;
  日志.value = [];
  敌方意图列表.value = [];
  战斗结束.value = false;
  战场进度.value = '';
  翻译失败清单.value = [];
  待开战.value = null;
  阶段.value = '准备'; // 失败时留在准备态（Review Focus 5）

  // 没有敌方单位 → 开不了战（玩家实测：只勾了自己进去，出不来也没法结束）。
  // 挡住它；真要中途走，战斗界面里有「逃离战斗」。
  if (!选择.some(c => c.阵营 === '敌方')) {
    日志.value.push('无法开战：没有选任何敌方单位（在名单里把对手勾成「敌方」）');
    return;
  }

  开战中.value = true;
  重置AI调用计数(); // 面板会显示本战斗累计调了几次 AI —— 排查"翻译是不是还在并发"
  本战意图模式.value = 读设置().意图模式; // 本场战斗固定用这个模式
  try {
    // ⚠️ 必须在读单位**之前**：HP_最大/防御/闪避/属性.实际 是"小手机"代算落盘的，
    // 玩家不开小手机就不会算 —— 战斗脚本自己算一遍，否则读到的是过期面板（实战反馈）。
    开战进度.value = '重算衍生属性（防御/闪避/HP 上限）…';
    await 重算参战衍生属性();

    开战进度.value = '读取参战单位…';
    const 单位列表: 战斗单位[] = [];
    const 效果源: Record<string, 单位效果源[]> = {};
    for (const c of 选择) {
      单位列表.push(await 读取战斗单位(c.id, c.阵营));
      效果源[c.id] = await 读取单位效果源(c.id);
    }

    const 待翻清单 = 单位列表.map(u => ({ id: u.id, 效果源: 效果源[u.id] ?? [] }));

    // 跨战斗缓存（spec §10.2）：先按**本次参战名单**裁剪缓存 ——
    // 技能删了/改名了/换装备了/升过级了（指纹变了），旧翻译随之清掉；新增的等下面去翻。
    开战进度.value = '整理翻译缓存…';
    const 整理 = await 整理翻译缓存(待翻清单);
    if (整理.保留 > 0 || 整理.清理 > 0) {
      日志.value.push(`翻译缓存：保留 ${整理.保留} 项，清理 ${整理.清理} 项`);
    }

    // 未命中缓存的条目一次批量调用（**整场只 1 次**，spec §10.1）；全命中时一次 AI 都不调。
    const 总条数 = 单位列表.reduce((n, u) => n + (效果源[u.id]?.length ?? 0), 0);
    开战进度.value = `翻译效果（共 ${总条数} 项，缓存外的 1 次 AI 调用）…`;
    const { 表, 失败, 缓存 } = await 翻译战斗解释(待翻清单);
    应用翻译(单位列表, 表);
    日志.value.push(`翻译缓存：命中 ${缓存.命中} 项，需翻译 ${缓存.待翻} 项（本战斗累计 AI 调用 ${取AI调用计数()} 次）`);

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

  // 开战常驻结算：把被动/装备/天赋/血统/职业特性的常驻增益**落成状态** ——
  // 这样它们既真的生效（常驻修正只读状态），又能在面板与写回 MVU 的「特殊状态」里看见。
  // 以前只认 `作用域: 自身`，"我方全体"这类光环被整条丢掉（实战反馈：增益没写进状态里）。
  开战进度.value = '结算常驻效果（被动 / 装备 / 天赋 / 血统）…';
  const 常驻步骤: 结算步骤[] = [];
  const 战斗0 = 开战常驻结算(
    初始化战斗状态(单位列表, 开场距离随机(选项.范围)),
    常驻步骤,
  );
  战斗.value = 战斗0;
  await 写战斗状态(战斗0);
  日志.value.push(`开战：${开场模式}，共 ${单位列表.length} 个单位（意图模式：${本战意图模式.value}）`);
  if (常驻步骤.length) 日志.value.push('常驻效果：', ...常驻步骤.map(x => x.内容));
  阶段.value = '战斗';

  // 进入第 1 回合：重置行动槽/额度 → 阶段A → 生成敌方意图
  开战进度.value = '生成敌方意图…';
  await 开始回合();
}

/** 复核界面：重新解析**勾选的那些**（切块顺序发送，不并发） */
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
  let 已收尾 = false;
  try {
    try {
      await 推进回合();
      // 阶段A 的濒死检定就可能定生死（契约者连续三次失败 = 抹杀；或全员昏迷）→ 当场收尾
      已收尾 = await 检查结局();
    } catch (e: any) {
      日志.value.push(`回合开始失败：${e?.message ?? e}`);
    }
    // 收尾 已经把持久化清掉了，别再把战斗状态写回去
    if (!已收尾) await 写战斗状态(战斗.value);
  } catch (e: any) {
    日志.value.push(`保存战斗状态失败：${e?.message ?? e}`);
  } finally {
    忙碌.value = false;
  }
}

/**
 * 已分出胜负就收尾；返回是否已结束。
 * 两处要用（阶段A 之后 / 一轮结算之后），判定本身在 engine/turn.判定战局（纯函数、有单测）。
 */
async function 检查结局(): Promise<boolean> {
  // 我方全员倒地 → 这仗已经打不下去：把濒死检定**一次算到底**（连着掷到"稳定/死亡"），
  // 然后直接判战局收尾。**不再空转回合** —— 每空转一回合都要调一次 AI 生成敌方意图，太浪费
  //（玩家反馈：所有友方失去行动能力就该直接结束战斗）。
  const 我方可动 = Object.values(战斗.value.单位).some(u => u.阵营 === '我方' && 能行动(u));
  if (!我方可动) {
    const 新单位 = { ...战斗.value.单位 };
    const 濒死行: string[] = [];
    for (const [键, u] of Object.entries(新单位)) {
      if (u.阵营 !== '我方' || u.HP_当前 > 0) continue;
      const r = 濒死结算到底(u);
      新单位[键] = r.单位;
      濒死行.push(...r.日志);
    }
    if (濒死行.length) {
      日志.value.push('我方全员倒地 —— 一次性结算濒死检定：', ...濒死行);
      战斗.value = { ...战斗.value, 单位: 新单位 };
    }
  }

  const 结局 = 判定战局(战斗.value);
  if (!结局) return false;
  日志.value.push(结局 === '胜利' ? '—— 胜利 ——' : '—— 败北 ——');
  await 收尾(结局);
  return true;
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
  const 濒死日志: string[] = [];
  for (const [键, u] of Object.entries(战斗.value.单位)) {
    // 行动槽与移动额度都用引擎的纯函数：除了基础重置，还会叠加状态携带的
    // 「反应动作」「次要行动」「移动距离」修正（血统给额外反应动作这类效果）
    // 上回合欠下的额外行动回合没用掉（其行动顺位已过 / 没下命令）→ 明示过期，不静默吞掉
    if ((u.追加行动 ?? 0) > 0) {
      濒死日志.push(`「${显示名(u)}」上回合有 ${u.追加行动} 个额外行动回合未使用，已过期`);
    }
    let 单位: 战斗单位 = {
      ...阶段A资源恢复(冷却递减(u)), // 冷却每回合 -1（与行动槽同为「回合开始重置」）
      行动槽: 回合开始行动槽(u),
      额度: 回合开始额度(u),
      // 常驻被动写「每回合额外一个行动回合」→ 每回合重新算（不是累加，避免越滚越多）
      追加行动: 回合开始追加行动(u),
    };
    // 阶段A「生命状态检查」：倒下的单位**每回合**做一次濒死 CON 检定（DC12，2 成功稳定 / 3 失败死亡）。
    // 世界书：HP 归零即进入濒死判定，失败达三次才宣告抹杀 —— 不死在别处，就在这一行。
    const 检定 = 濒死检定一轮(单位);
    if (检定) {
      单位 = 检定.单位;
      濒死日志.push(检定.文本);
    }
    新单位[键] = 单位;
  }
  // 阶段A「回合开始」的规则结算：每回合蓄能 / 护盾回复 / 回合开始的自动增益都靠它
  //（早先没有任何东西执行这个触发点，卡面上"每回合…"的效果全是静默失效的）
  const 回合开始步骤: 结算步骤[] = [];
  战斗.value = 阶段A规则结算({ ...战斗.value, 单位: 新单位 }, 回合开始步骤);
  日志.value.push(
    `—— 第 ${战斗.value.回合} 回合 ——`,
    ...濒死日志,
    ...回合开始步骤.map(x => x.内容),
  );

  // 敌方意图：**每回合一次**，必须在阶段A（行动槽/额度重置、资源恢复）之后生成 ——
  // 否则提示词里给出的是上一轮的残槽，模型会按「槽已用完」决策，直接导致敌人不出招。
  // 也用回合开始时的 HP/距离/状态：这正是「意图预公开」的前提（spec §9.2 ③）。
  // 两种意图模式（设置里选）：AI 生成 / 掷骰子抽（**不调 AI**）
  if (本战意图模式.value === '随机') {
    敌方意图列表.value = 随机意图(战斗.value);
    日志.value.push(...随机意图说明(敌方意图列表.value, 战斗.value));
    日志.value.push('（意图模式：掷骰 —— 本回合没有调用 AI）');
    return;
  }

  日志.value.push('（意图模式：AI —— 每回合 1 次调用）');
  战场进度.value = `正在生成敌方意图（第 ${战斗.value.回合} 回合，1 次 AI 调用）…`;
  try {
    敌方意图列表.value = await 生成敌方意图(战斗.value);
  } catch (e: any) {
    // 意图生成失败不再让本回合"凭空消失" —— 兜底成掷骰抽行动（会真的用技能，不是只会平A）
    日志.value.push(`意图生成失败（${e?.message ?? e}）→ 改用掷骰抽行动`);
    敌方意图列表.value = 随机意图(战斗.value);
  } finally {
    战场进度.value = '';
  }
  if (敌方意图列表.value.length === 0) {
    日志.value.push('模型没有给出任何敌方意图 → 改用掷骰抽行动');
    敌方意图列表.value = 随机意图(战斗.value);
  }
  日志.value.push(
    ...敌方意图列表.value.flatMap(x =>
      // 没写技能 = 基础攻击：日志里也要看得见，否则「敌人只是挥了下拳头」会被当成没出招
      x.行动.map(
        a => `【意图】${x.单位} → ${a.类型}${a.技能 ? `·${a.技能}` : a.武器 ? `·${a.武器}攻击` : '·基础攻击'}`,
      ),
    ),
  );
  // 面板里也能看见 AI 计数：一场战斗 = 技能翻译 1 次 + 每回合意图 1 次，超过就是有问题
  日志.value.push(`（敌方意图就绪，本战斗累计 AI 调用 ${取AI调用计数()} 次）`);
}

async function 执行本轮(各单位: Record<string, { 填写: 行动槽填写; 目标: string }>) {
  if (忙碌.value || 战斗结束.value) return;
  忙碌.value = true;
  战场进度.value = '结算本轮…';
  let 进下一回合 = false;
  // ⚠️ 必须声明在 try **外面**：finally 里要用它。写在 try 里（块级作用域）会让 finally 抛
  // ReferenceError，紧跟着的 忙碌.value = false 就永远执行不到 —— 界面卡在「结算本轮」转不动。
  let 本轮已结算 = false;
  try {
    // 把每个我方单位各自的填写翻成行动声明 —— 队友也要能被指挥（实战反馈：以前只能操作契约者）
    const 我方行动: Record<string, 意图行动[]> = {};
    const 预置反应: string[] = [];
    for (const [键, { 填写, 目标 }] of Object.entries(各单位)) {
      const { 行动, 预置反应: 反应 } = 构造行动声明(填写, 目标);
      if (行动.length > 0) 我方行动[键] = 行动 as 意图行动[];
      if (反应) 预置反应.push(`${键}：${反应}`);
    }

    if (Object.keys(我方行动).length === 0) {
      日志.value.push('请至少给一个单位下达行动，再执行本轮');
      return;
    }

    // 多目标时目标可留空 → 带目标的声明若目标为空，先提示（不结算、不清空填写）
    for (const [键, 列表] of Object.entries(我方行动)) {
      if (列表.some(a => a.类型 !== '移动' && !a.目标)) {
        日志.value.push(`「${键}」还有行动没选目标，请先补齐再执行本轮`);
        return;
      }
    }

    if (预置反应.length) 日志.value.push(`（已预置反应：${预置反应.join('；')}）`);

    // 预置反应写到**单位**上：引擎被攻击时读「守方.预置反应」（只有学过的反应动作技能才认）。
    // 以前它只被拼进上面那句日志，没有任何结算路径读它 —— 玩家反馈「选了完全没用」。
    // 敌方也用同一套：`敌方反应预置` 给每个学过反应技能的敌人预置第一个可用的（「有预置就自动用」）。
    const 状态0: 战斗状态 = 敌方反应预置({ ...战斗.value, 单位: { ...战斗.value.单位 } });
    for (const [键, { 填写 }] of Object.entries(各单位)) {
      const u = 状态0.单位[键];
      if (!u) continue;
      const 反应 = (填写.反应 ?? '').trim();
      状态0.单位[键] = { ...u, 预置反应: 反应 || undefined };
    }

    const 结局 = await 推进轮次(开一轮(状态0, 我方行动, 敌方意图列表.value));
    本轮已结算 = 结局.本轮已结算;
    进下一回合 = 结局.进下一回合;
  } catch (e: any) {
    日志.value.push(`本轮结算失败：${e?.message ?? e}`);
  } finally {
    // 只有真的结算成功了才清空填写（结算失败 / 目标没选全时不能把玩家的输入丢掉）
    if (本轮已结算) 战场视图.value?.清空填写();
    战场进度.value = '';
    忙碌.value = false;
  }

  // 锁已释放再进下一回合（开始回合 自带锁与错误兜底；此刻无 await 间隙，不会被重入）
  if (进下一回合) await 开始回合();
}

/**
 * 把一个轮次**走到底**：一路 `走一步` 直到走完。
 *
 * 中途遇到「额外行动回合」→ **当场打断**：把待办与轮次快照存下来，交回界面让玩家重新指定行动
 * （玩家口径：「技能加额外行动次数，当场打断行动，选择额外行动选项」）。
 * 追加回合只属于我方 —— 敌方不会因此多出招。
 */
async function 推进轮次(
  轮开始: 轮次状态,
): Promise<{ 本轮已结算: boolean; 进下一回合: boolean }> {
  const 追加日志: string[] = [];
  let 轮 = 轮开始;

  // 步数上限是安全阀：一轮里的行动总数是有限的，正常远达不到
  for (let i = 0; i < 500 && !轮.完成; i++) {
    if (轮.待决) {
      if (轮.待决.类 === '额外行动回合') {
        const id = 轮.待决.id;
        const 键 = Object.keys(轮.状态.单位).find(k => 轮.状态.单位[k].id === id) ?? id;
        const 单位 = 轮.状态.单位[键];
        追加日志.push(...轮.步骤.map(s => s.内容));
        日志.value.push(...追加日志);
        战斗.value = 轮.状态;
        // 暂停时也把到目前为止的演出放出来（打断/变身可能正是追加回合的来源）
        演出事件列表.value = 演出事件提取(轮.步骤);
        演出批次.value++;
        // 已写出去的步骤不再挂着（恢复时会把整份轮次交回来，重复写会刷屏）
        轮次快照.value = { ...轮, 步骤: [] };
        追加待办.value = { 键, 名称: 单位 ? 显示名(单位) : id };
        战场视图.value?.清空填写();
        // 暂停时也持久化一次：不然刷新页面会从回合开始态恢复，刚结算的半轮凭空消失
        try {
          await 写战斗状态(战斗.value);
        } catch {
          // 持久化失败不挡流程（下回合开始时还会再写）
        }
        return { 本轮已结算: true, 进下一回合: false };
      }
      // 其它待决点（打断/防御/濒死/转阶段）暂时没有界面 —— 记一笔跳过，绝不静默卡住
      追加日志.push(`（待决点「${轮.待决.类}」暂无处理界面 → 跳过）`);
      轮 = { ...轮, 待决: null };
      continue;
    }
    轮 = 走一步(轮);
  }

  let 状态 = 轮.状态;
  追加日志.push(...轮.步骤.map(s => s.内容));
  // 本轮的演出（决斗场美术）：从结算步骤提取；批次号 +1 → 整批重建节点、动画重播
  演出事件列表.value = 演出事件提取(轮.步骤);
  演出批次.value++;

  // 阶段F：持续伤害与状态递减 → 再来一遍「回合结束」规则（世界书的尾结算）
  const 新单位 = { ...状态.单位 };
  for (const [键, u] of Object.entries(新单位)) {
    const r = 阶段F结算(u, u.HP_最大);
    if (r.HP扣减 > 0) 追加日志.push(`${键} 持续伤害 -${r.HP扣减} → HP ${r.新状态.HP_当前}`);
    新单位[键] = r.新状态;
  }
  const 回合结束步骤: 结算步骤[] = [];
  状态 = 阶段F规则结算({ ...状态, 单位: 新单位 }, 回合结束步骤);
  追加日志.push(...回合结束步骤.map(x => x.内容));

  战斗.value = { ...状态, 回合: 状态.回合 + 1, 单位: 新单位 };
  日志.value.push(...追加日志);
  敌方意图列表.value = [];

  // 战局判定（世界书：HP 归零是**濒死**，不是死亡；死亡要濒死检定连续三次失败）。
  // 判定在 engine/turn.判定战局（纯函数、有单测）—— 别在 view 里手搓胜负条件。
  if (await 检查结局()) return { 本轮已结算: true, 进下一回合: false };

  await 写战斗状态(战斗.value);
  return { 本轮已结算: true, 进下一回合: true };
}

/**
 * 提交换追加行动回合：把玩家为这个单位选的行动交给引擎（消耗一层追加行动、重置整套槽），
 * 然后**接着走**剩下的先攻序列。
 */
async function 提交追加行动回合(各单位: Record<string, { 填写: 行动槽填写; 目标: string }>) {
  if (忙碌.value || !轮次快照.value || !追加待办.value) return;
  忙碌.value = true;
  战场进度.value = '结算追加行动…';
  let 本轮已结算 = false;
  let 进下一回合 = false;
  try {
    const 键 = 追加待办.value.键;
    const { 行动, 预置反应: 反应 } = 构造行动声明(各单位[键]?.填写 ?? {}, 各单位[键]?.目标 ?? '');
    let 快照 = 轮次快照.value;
    // 追加回合也给了新的反应槽 —— 玩家在追加界面里选的反应预置要写回单位，不然白选
    if (反应 && 快照.状态.单位[键]) {
      快照 = {
        ...快照,
        状态: {
          ...快照.状态,
          单位: { ...快照.状态.单位, [键]: { ...快照.状态.单位[键]!, 预置反应: 反应 } },
        },
      };
    }
    const 轮 = 提交追加行动(快照, 行动 as 意图行动[]);
    追加待办.value = null;
    轮次快照.value = null;
    const 结局 = await 推进轮次(轮);
    本轮已结算 = 结局.本轮已结算;
    进下一回合 = 结局.进下一回合;
  } catch (e: any) {
    日志.value.push(`追加行动结算失败：${e?.message ?? e}`);
  } finally {
    if (本轮已结算) 战场视图.value?.清空填写();
    战场进度.value = '';
    忙碌.value = false;
  }
  if (进下一回合) await 开始回合();
}

/** 放弃追加回合：直接交一段空行动（引擎支持空段），继续走完剩下的先攻 */
async function 放弃追加行动回合() {
  if (忙碌.value || !轮次快照.value || !追加待办.value) return;
  忙碌.value = true;
  战场进度.value = '放弃追加行动…';
  let 本轮已结算 = false;
  let 进下一回合 = false;
  try {
    日志.value.push(`「${追加待办.value.名称}」放弃了额外行动回合`);
    const 轮 = 提交追加行动(轮次快照.value, []);
    追加待办.value = null;
    轮次快照.value = null;
    const 结局 = await 推进轮次(轮);
    本轮已结算 = 结局.本轮已结算;
    进下一回合 = 结局.进下一回合;
  } catch (e: any) {
    日志.value.push(`放弃追加行动失败：${e?.message ?? e}`);
  } finally {
    if (本轮已结算) 战场视图.value?.清空填写();
    战场进度.value = '';
    忙碌.value = false;
  }
  if (进下一回合) await 开始回合();
}

/**
 * 收尾：写回 MVU → 生成收尾正文落楼 → 清持久化。
 * 先切「收尾」态卸载 BattleView（忙碌锁仍持有，挡住「回到准备」）。
 *
 * 收尾正文要按击杀发放钥匙（杂兵白/精英白银/BOSS黄金/隐藏BOSS钻石/契约者血腥）、
 * 并用主角真名 —— 这两样都在 战斗.value 里，所以要把状态传进去。
 */
async function 收尾(结局: '胜利' | '败北') {
  战斗结束.value = true;
  清追加待办(); // 收尾后旧轮次快照再无意义（回准备/新战斗都以干净状态开始）
  演出事件列表.value = [];
  演出批次.value++;
  阶段.value = '收尾';
  结局文案.value = 结局;
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
    // 写收尾楼层 需要 结算步骤[]（只用到 .内容）+ 战斗状态（击杀掉落与主角名）；这里把整条日志当战报交过去
    await 写收尾楼层(
      日志.value.map(内容 => ({ 类: '日志', 内容 })),
      战斗.value,
    );
  } catch (e: any) {
    日志.value.push(`收尾正文失败：${e?.message ?? e}`);
  }
  try {
    await 写战斗状态(null);
  } catch (e: any) {
    日志.value.push(`清除持久化失败：${e?.message ?? e}`);
  }
}

/**
 * 逃离战斗 —— 卡在战斗里的出口。
 *
 * 不走收尾正文（没有胜负叙事），不写钥匙，只把 HP/MP/耐力写回 + 清持久化，
 * 然后停在收尾界面让玩家看到日志、再点「回到准备」。
 * （规则级的「脱离近战吃借机攻击」是另一回事 —— 这是界面逃生口，不做那个判定。）
 */
async function 逃离战斗() {
  if (忙碌.value || 战斗结束.value) return;
  忙碌.value = true;
  战场进度.value = '';
  清追加待办(); // 暂停中也能逃离 —— 旧战斗的追加待办绝不能带进下一场
  演出事件列表.value = [];
  演出批次.value++;
  try {
    日志.value.push('—— 你逃离了战斗 ——');
    战斗结束.value = true;
    结局文案.value = '逃离';
    阶段.value = '收尾'; // 复用收尾界面（显示日志 + 回到准备按钮），但不生成收尾正文

    try {
      const hp表: Record<string, { HP_当前: number; MP_当前: number; 耐力_当前: number }> = {};
      for (const u of Object.values(战斗.value.单位)) {
        hp表[u.id] = { HP_当前: u.HP_当前, MP_当前: u.MP_当前, 耐力_当前: u.耐力_当前 };
      }
      await 写回战斗结果(战斗.value, hp表);
    } catch (e: any) {
      日志.value.push(`逃离时写回变量失败：${e?.message ?? e}`);
    }
    try {
      await 写战斗状态(null);
    } catch (e: any) {
      日志.value.push(`逃离时清除持久化失败：${e?.message ?? e}`);
    }
  } finally {
    忙碌.value = false;
  }
}

function 处理决策(选择: string) {
  日志.value.push(`玩家决策: ${选择}`);
  战斗.value.待决 = null;
}

async function 回准备() {
  if (忙碌.value) return;
  await 写战斗状态(null);
  清追加待办();
  演出事件列表.value = [];
  演出批次.value++;
  战斗.value = 空战斗();
  日志.value = [];
  敌方意图列表.value = [];
  战场进度.value = '';
  战斗结束.value = false;
  阶段.value = '准备';
}
</script>

<style scoped lang="scss">
@use '../theme.scss' as t;

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

  /* ============ 三态横幅：金漆凯旋 / 血字陨落 / 灰字撤退 ============ */
  .settle-banner {
    @include t.cb-stone(18px 24px);
    @include t.cb-rivets(8px);
    text-align: center;
    margin-bottom: 14px;

    .sb-title {
      margin: 0;
      font-family: var(--cb-font-display);
      font-size: 34px;
      font-weight: 900;
      letter-spacing: 10px;
    }

    &.胜利 {
      border-color: rgba(208, 168, 80, 0.6);
      .sb-title {
        color: var(--cb-gold);
        text-shadow:
          0 0 16px rgba(208, 168, 80, 0.6),
          0 0 44px rgba(208, 168, 80, 0.3);
      }
    }

    &.败北 {
      border-color: var(--cb-blood-wet);
      background:
        linear-gradient(180deg, rgba(74, 16, 16, 0.35), rgba(18, 6, 4, 0.9));
      .sb-title {
        color: var(--cb-blood-wet);
        text-shadow:
          0 0 16px rgba(208, 80, 64, 0.6),
          0 2px 0 rgba(0, 0, 0, 0.8);
      }
    }

    &.逃离 {
      .sb-title {
        color: var(--cb-dim);
        letter-spacing: 6px;
      }
    }
  }

  /* ============ 战利品（钥匙五档配色） ============ */
  .loot-list {
    @include t.cb-stone(10px 14px);
    margin-bottom: 14px;

    .loot-title {
      color: var(--cb-amber-dim);
      font-size: 12px;
      letter-spacing: 3px;
      margin-bottom: 6px;
    }

    .loot-row {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 3px 0;
      font-size: 13px;
      border-bottom: 1px dotted rgba(74, 50, 38, 0.3);

      &:last-child {
        border-bottom: none;
      }
    }

    .loot-name {
      flex: 1;
      color: var(--cb-chalk-dim);
    }

    .loot-key {
      font-size: 15px;
    }

    .k-white {
      color: #d8d8d0;
    }
    .k-silver {
      color: #c8d0e0;
      text-shadow: 0 0 8px rgba(200, 208, 224, 0.5);
    }
    .k-gold {
      color: var(--cb-gold);
      text-shadow: 0 0 10px rgba(208, 168, 80, 0.6);
    }
    .k-diamond {
      color: #a8d8f0;
      text-shadow: 0 0 10px rgba(140, 210, 240, 0.7);
    }
    .k-blood {
      color: var(--cb-blood-wet);
      text-shadow: 0 0 10px rgba(208, 80, 64, 0.7);
    }
  }

  .settle-log {
    margin: 14px 0;
    padding-top: 10px;
    border-top: 1px solid var(--cb-border-soft);
    max-height: 40vh;
    overflow-y: auto;

    .settle-log-entry {
      padding: 3px 0;
      font-size: 13px;
      color: var(--cb-chalk-dim);
      font-family: var(--cb-font-mono);
    }
  }

  button {
    @include t.cb-gate;
    padding: 8px 20px;
    font-size: 13px;
    letter-spacing: 2px;
  }
}
</style>
