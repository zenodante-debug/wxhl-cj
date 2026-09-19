/** 奖励文本里的三个数值 */
export interface RewardNumbers { UP: number; EXP: number; RP: number }

const 空奖励: RewardNumbers = { UP: 0, EXP: 0, RP: 0 };

/**
 * 解析变量里 `奖励` 字段的文本。
 *
 * 格式由 dice.ts:composeRewardText 固定生成。**格式非法时抛错, 绝不静默当 0** ——
 * 静默当 0 会让玩家少拿奖励而无人察觉, 与本模块「宁可难看也不圆上」的口径一致。
 * 只有「无」与空串是合法的「没有奖励」。
 */
export function parseRewardText(文本: string): RewardNumbers {
  const t = (文本 ?? '').trim();
  if (t === '' || t === '无') return { ...空奖励 };
  // 按 ' + ' 切段后逐段判形状。**不要用单条大正则** —— 末段的 `.+` 是贪婪的,
  // 会把「物品名 + 尾巴」整段吃掉, 于是非法输入被当成合法(见 ledger Ruling 1)。
  const 段 = t.split(' + ');
  const m1 = /^(\d+) UP$/.exec(段[0] ?? '');
  const m2 = /^(\d+) EXP$/.exec(段[1] ?? '');
  if (!m1 || !m2) throw new Error('奖励文本格式无法解析: ' + t);
  let i = 2;
  let RP = 0;
  const m3 = /^(\d+) RP$/.exec(段[i] ?? '');
  if (m3) { RP = Number(m3[1]); i++; }
  if (i < 段.length) {
    // 至多还剩一段物品段
    if (i !== 段.length - 1 || !/^【[^】]*】[^：]*：.+$/.test(段[i])) {
      throw new Error('奖励文本格式无法解析: ' + t);
    }
  }
  return { UP: Number(m1[1]), EXP: Number(m2[1]), RP };
}

const 击杀Schema = z.object({
  精英: z.coerce.number().int().min(0).prefault(0),
  BOSS: z.coerce.number().int().min(0).prefault(0),
  隐藏BOSS: z.coerce.number().int().min(0).prefault(0),
}).prefault({});

export const SettlementGenResultSchema = z.object({
  评价等级: z.enum(['S', 'A', 'B', 'C', 'D', 'F']),
  评价依据: z.string().prefault(''),
  击杀: 击杀Schema,
  濒死次数: z.coerce.number().int().min(0).prefault(0),
  副本天数: z.coerce.number().int().min(0).prefault(0),
  完成的支线: z.array(z.string()).prefault([]),
  完成的隐藏任务: z.array(z.string()).prefault([]),
  达成的成就: z.array(z.string()).prefault([]),
  职业专属支线条数: z.coerce.number().int().min(0).prefault(0),
  天赋试炼次数: z.coerce.number().int().min(0).prefault(0),
  掉落物品: z.array(z.object({
    名称: z.string().min(1),
    品质: z.string().prefault('无'),
    属性: z.string().prefault(''),
    效果: z.string().prefault(''),
    数量: z.coerce.number().int().min(1).prefault(1),
  })).prefault([]),
  称号: z.object({
    名称: z.string().prefault(''),
    效果: z.record(z.string(), z.string()).prefault({}),
  }).nullable().prefault(null),
  史诗记录: z.string().prefault(''),
});

export type SettlementGenResult = z.output<typeof SettlementGenResultSchema>;
