import type { BuildRoll, RewardSet } from './dice';
import { composeRewardText } from './dice';

// ================================================================
// 副本生成 · AI 输出校验与变量映射
// 纯函数, 无副作用, 不触碰酒馆接口
// ================================================================

/** 成就梯度档位名, 顺序必须与 dice.ts 的 成就梯度 一致 */
const 成就档位 = [
  '★ 探索级',
  '★★ 挑战级',
  '★★★ 破局级',
  '★★★★ 史诗级',
  '★★★★★ 传说级',
  '★★★★★★ 世界天花板',
] as const;

const 主线任务Schema = z.object({ 名称: z.string(), 说明: z.string() });
const 支线任务Schema = z.object({ 名称: z.string(), 说明: z.string(), 物品名: z.string().prefault('') });
const 隐藏任务Schema = z.object({ 名称: z.string(), 说明: z.string(), 物品名: z.string().prefault('') });
const 世界事件Schema = z.object({ 名称: z.string(), 说明: z.string(), 影响: z.string() });
const 成就Schema = z.object({
  名称: z.string(),
  说明: z.string(),
  难度: z.string(),
  物品名: z.string().prefault(''),
});

/**
 * AI 返回内容的校验 schema。
 * 数组长度用 length 精确约束 —— 状态栏与正则都依赖「3 支线 / 2 隐藏 / 2 世界事件 / 6 成就」这个固定结构。
 */
export const DungeonGenResultSchema = z.object({
  副本名称: z.string().min(1),
  副本来源: z.string().min(1),
  副本背景: z.string().min(1),
  日常调和说明: z.string().prefault(''),
  主线任务: 主线任务Schema,
  支线任务: z.array(支线任务Schema).length(3),
  世界事件: z.array(世界事件Schema).length(2),
  隐藏任务: z.array(隐藏任务Schema).length(2),
  副本成就: z.array(成就Schema).length(6),
  固有角色: z.array(
    z.object({ 名称: z.string().min(1), 位阶: z.string(), 等级: z.coerce.number().int().min(1).max(200) }),
  ),
  其他契约者: z.array(
    z.object({ 真名: z.string().min(1), 称号: z.string(), 等级: z.coerce.number().int().min(1).max(200), 阵营: z.string() }),
  ),
});

export type DungeonGenResult = z.output<typeof DungeonGenResultSchema>;

export interface PlayerBrief {
  姓名: string;
  等级: number;
  阶位: string;
  CR: number;
}

/**
 * 把 AI 结果 + 已锁定骰值映射成 `契约者` 下的变量字段。
 * 返回的键名与 schema 中 `契约者` 的子字段同名, 调用方负责逐条 _.set。
 */
export function mapToVariables(
  result: DungeonGenResult,
  build: BuildRoll,
  rewards: RewardSet,
  player: PlayerBrief,
): Record<string, unknown> {
  const 当前副本元数据 = {
    副本名称: result.副本名称,
    副本来源: result.副本来源,
    副本类型: build.副本类型,
    // 时间限制是已锁定的骰值 (1d12+2), 不从 AI 结果取, 否则 AI 的措辞会让它与骰值不一致
    时间限制: `${build.时间限制天}天`,
    // 规则 §四: 以契约者进本时的当前等级为基准
    基准等级: player.等级,
  };

  const 支线任务: Record<string, unknown> = {};
  result.支线任务.forEach((t, i) => {
    支线任务[t.名称] = {
      说明: t.说明,
      奖励: composeRewardText(rewards.支线[i], t.物品名),
      状态: '进行中',
    };
  });

  const 世界事件: Record<string, unknown> = {};
  result.世界事件.forEach(e => {
    // 变量里世界事件只有「奖励」字段, 规则给的是「影响」, 故把影响文本落在奖励字段
    世界事件[e.名称] = { 说明: e.说明, 奖励: e.影响, 状态: '进行中' };
  });

  const 隐藏任务: Record<string, unknown> = {};
  result.隐藏任务.forEach((t, i) => {
    隐藏任务[t.名称] = {
      说明: t.说明,
      奖励: composeRewardText(rewards.隐藏[i], t.物品名),
      状态: '未触发',
    };
  });

  const 副本成就: Record<string, unknown> = {};
  result.副本成就.forEach((a, i) => {
    副本成就[a.名称] = {
      说明: a.说明,
      难度: `${成就档位[i]} · ${a.难度}`,
      奖励: composeRewardText(rewards.成就[i], a.物品名),
      状态: '未达成',
    };
  });

  const 固有角色名单: Record<string, unknown> = {};
  result.固有角色.forEach(r => {
    固有角色名单[r.名称] = { 位阶: r.位阶, 等级: r.等级, 状态: '存活' };
  });

  const 其他契约者名单: Record<string, unknown> = {};
  result.其他契约者.forEach(c => {
    其他契约者名单[c.真名] = {
      称号: c.称号 === '无' || c.称号 === '' ? '无称号' : c.称号,
      等级: c.等级,
      阵营: c.阵营,
      状态: '存活',
    };
  });

  const 主线 = result.主线任务;
  return {
    当前副本元数据,
    当前副本任务: {
      主线任务: {
        名称: 主线.名称,
        说明: 主线.说明,
        奖励: composeRewardText(rewards.主线, ''),
        状态: '进行中',
      },
      支线任务,
      世界事件,
      隐藏任务,
      副本成就,
    },
    固有角色名单,
    其他契约者名单,
  };
}

/** 组装 <Panel Enhancement> 面板文本, 仅用于存档与复制, 不填入输入框 */
export function assemblePanelText(
  result: DungeonGenResult,
  build: BuildRoll,
  rewards: RewardSet,
  player: PlayerBrief,
): string {
  const L: string[] = [];
  L.push('<Panel Enhancement>');
  L.push('<副本任务>');
  L.push(`## 副本名称: ${result.副本名称}`);
  L.push(`## 副本背景: ${result.副本背景}`);
  L.push(`## 副本来源: ${result.副本来源}`);
  L.push(`## 副本类型: 【${build.副本类型}】`);
  L.push(`## 时间限制: ${build.时间限制天}天`);
  L.push('## 主线任务');
  L.push(`名称: ${result.主线任务.名称}`);
  L.push(`描述: ${result.主线任务.说明}`);
  L.push(`奖励: ${composeRewardText(rewards.主线, '')}`);
  L.push('惩罚: 抹杀');
  result.支线任务.forEach((t, i) => {
    L.push(`## 支线任务${i + 1}`);
    L.push(`名称: ${t.名称}`);
    L.push(`描述: ${t.说明}`);
    L.push(`奖励: ${composeRewardText(rewards.支线[i], t.物品名)}`);
  });
  result.隐藏任务.forEach((t, i) => {
    L.push(`## 隐藏任务${i + 1}`);
    L.push(`名称: ${t.名称}`);
    L.push(`描述: ${t.说明}`);
    L.push(`奖励: ${composeRewardText(rewards.隐藏[i], t.物品名)}`);
  });
  L.push('</副本任务>');
  L.push('<副本世界事件和成就列表>');
  result.世界事件.forEach((e, i) => {
    L.push(`## 世界事件${i + 1}`);
    L.push(`名称: ${e.名称}`);
    L.push(`描述: ${e.说明}`);
    L.push(`影响: ${e.影响}`);
  });
  L.push('## 副本成就奖励梯度');
  result.副本成就.forEach((a, i) => {
    L.push(`${成就档位[i]}：${a.难度} | ${composeRewardText(rewards.成就[i], a.物品名)}`);
  });
  L.push('</副本世界事件和成就列表>');
  L.push('<副本人物生成>');
  L.push('## 契约者名单');
  const 契约者 = [
    `[契约者]${player.姓名} Lv.${player.等级}`,
    ...result.其他契约者.map(c => `[${c.称号 === '无' || c.称号 === '' ? '无称号' : c.称号}]${c.真名} Lv.${c.等级}`),
  ];
  L.push(`契约者: ${契约者.join('，')}`);
  L.push('## 固有角色');
  L.push(`角色列表: ${result.固有角色.map(r => `${r.名称} (Lv.${r.等级} | ${r.位阶})`).join('，')}`);
  L.push('</副本人物生成>');
  L.push('</Panel Enhancement>');
  return L.join('\n');
}
