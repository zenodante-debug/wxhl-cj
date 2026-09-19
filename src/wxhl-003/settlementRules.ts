import { rollDie } from './dice';

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

/** 算术的全部输入（AI 判定 + 变量快照, 两者都由调用方备好） */
export interface SettlementInputs {
  评价等级: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
  击杀: { 精英: number; BOSS: number; 隐藏BOSS: number };
  濒死次数: number;
  副本天数: number;
  基础EXP汇总: number;
  基础UP汇总: number;
  /** 本次完成的支线任务数（= AI 报告的 `完成的支线`.length）—— 资格分的「支线+5/条」用它, **不是**职业专属支线条数 */
  完成的支线数: number;
  隐藏任务数: number;
  /** 每个已达成成就的星数（★=1 … ★★★★★★=6） */
  成就星数: number[];
  天赋试炼次数: number;
  /** 只用于第六步 PEXP 的「掷 50~100 × 条数」；**资格分的「支线+5/条」用的是 `完成的支线数`**, 别混 */
  职业专属支线条数: number;
  /** 结算前的 CR */
  CR: number;
  /** 玩家的阶位, 一阶~五阶 */
  阶位: string;
  旧周期: number;
  旧资格分: number;
  现实日期: string;
}

/** 算术的全部产物（面板与写入清单都只读它） */
export interface SettlementComputed {
  评价等级: SettlementInputs['评价等级'];
  评价倍率: number;
  CR态度: string;
  CR奖励倍率: number;
  位阶修正: number;
  基础EXP汇总: number;
  基础UP汇总: number;
  最终EXP: number;
  最终UP: number;
  RP: number;
  PEXP: number;
  资格分_评价: number;
  资格分_击杀: number;
  资格分_任务: number;
  资格分_本次: number;
  CR变动: number;
  更新后CR: number;
  更新后回廊态度: string;
  新周期: number;
  新资格分: number;
  新现实日期: string;
}

/** 评价倍率（规则第四步） */
const 评价倍率表: Record<string, number> = { S: 2.0, A: 1.5, B: 1.2, C: 1.0, D: 0.7, F: 0 };

/** CR 分档 → [态度, 奖励倍率]（规则第十步）。按 Math.floor(CR) 取档 */
function CR分档(CR: number): [string, number] {
  const n = Math.floor(CR);
  if (n <= 2) return ['漠视', 1.0];
  if (n <= 4) return ['观察', 1.2];
  if (n <= 6) return ['关注', 1.5];
  if (n <= 8) return ['重视', 3.0];
  if (n <= 9) return ['期待', 6.0];
  return ['炼狱', 15.0];
}

/**
 * 阶位的别名写法 → 规范写法。**与 `enemyRules.ts` 的 `阶位别名` 是同一套口径**
 * （汉字 / `N阶` / 裸数字 `N`）—— 那张表没有导出, 且那个文件已交付待验收, 故这里
 * 有意重写一份（重复已记入 ledger, 留给终审 triage）。
 */
const 阶位别名: Record<string, string> = {
  一阶: '一阶', '1阶': '一阶', '1': '一阶',
  二阶: '二阶', '2阶': '二阶', '2': '二阶',
  三阶: '三阶', '3阶': '三阶', '3': '三阶',
  四阶: '四阶', '4阶': '四阶', '4': '四阶',
  五阶: '五阶', '5阶': '五阶', '5': '五阶',
};

/** 规范阶位 → 阶数（一阶1 … 五阶5）。这是规则第四步的「位阶修正={{user}}阶数」, 与敌人生成的 1/2/4/7/11 **不是同一个东西** */
const 阶数表: Record<string, number> = { 一阶: 1, 二阶: 2, 三阶: 3, 四阶: 4, 五阶: 5 };

/**
 * 阶位 → 阶数。先 `trim`、再归一别名（汉字 / `N阶` / 裸数字 `N`）, **归一后仍不认识就抛错**。
 *
 * 这里比 `enemyRules.ts:归一位阶` 多一个 `trim`: 那边不 trim 的失败模式是**面板印 `—`**（局部降级,
 * 记录为 deferred minor）, 这边是**整次结算被挡住** —— 同样的宽容度在两种后果下不是同一个取舍。
 * `trim` 不可能把合法阶位变成非法（单调安全）, 只会救回纯空白造成的误挡。
 *
 * 绝不 `?? 1` 静默按一阶算 —— 五阶真实是 ×5, 按 ×1 算会让**写进存档的最终 EXP/UP 差 5 倍**,
 * 而玩家拿到的是一个「像真的」的数。
 */
function 阶数(阶位: string): number {
  const 归一 = 阶位别名[String(阶位 ?? '').trim()];
  const n = 归一 === undefined ? undefined : 阶数表[归一];
  if (n === undefined) {
    throw new Error(
      '阶位无法识别, 不能结算（契约者.头部.阶位 请写成 一阶~五阶 / 1阶~5阶 / 1~5）: ' + JSON.stringify(阶位),
    );
  }
  return n;
}

/** 现实日期字符串 `2025年5月10日` 加 N 天; 格式不认识返回空串（不猜） */
function 加天数(日期: string, 天数: number): string {
  const m = /^(\d+)年(\d+)月(\d+)日$/.exec((日期 ?? '').trim());
  if (!m) return '';
  const d = new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3]) + 天数));
  return `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日`;
}

/**
 * 全部算术。
 *
 * @param 掷 掷骰函数（默认 dice.ts 的 rollDie）。**以参数注入是为了可单测** ——
 *           RP 有个区间来源要掷, 不注入就没法写断言。
 */
export function computeSettlement(
  输入: SettlementInputs,
  掷: (面数: number) => number = rollDie,
): SettlementComputed {
  // ── F 级守卫（规则第一步/第七节）────────────────────────────────────
  // 主线失败 = 抹杀, 不进入结算。设计把守卫放在 store, 这里再挡一道: 否则 store 一旦漏掉,
  // 本函数会「正常」返回一份看着像模像样的结算（评价倍率只管 EXP/UP/PEXP, RP 与资格分
  // 照算）, 于是静默地写进存档一半、且不可逆。
  if (输入.评价等级 === 'F') throw new Error('主线失败 = 抹杀，不进入结算流程');

  // ── 资格分（规则第二步）──────────────────────────────────────────────
  const 评价分表: Record<string, number> = { S: 50, A: 35, B: 20, C: 10, D: 0, F: 0 };
  const 资格分_评价 = 评价分表[输入.评价等级] ?? 0;
  const 资格分_击杀 =
    输入.击杀.精英 * 5 + 输入.击杀.BOSS * 15 + 输入.击杀.隐藏BOSS * 30;
  // 任务分的「支线+5/条」用 完成的支线数（= AI 报告的 `完成的支线`.length, 由调用方摊平成数字）。
  // **不是**职业专属支线条数 —— 规则原文第二步的「条」指本次完成的所有支线（见 Ruling 9）。
  const 资格分_任务 =
    输入.完成的支线数 * 5 + 输入.隐藏任务数 * 20 + 输入.成就星数.length * 10;
  const 资格分_本次 = 资格分_评价 + 资格分_击杀 + 资格分_任务;

  // ── 倍率（规则第三、四步）────────────────────────────────────────────
  const 评价倍率 = 评价倍率表[输入.评价等级] ?? 0;
  const [CR态度, CR奖励倍率] = CR分档(输入.CR);       // 按「结算前」的 CR 查表
  const 位阶修正 = 阶数(输入.阶位);

  const 最终EXP = Math.round(输入.基础EXP汇总 * 评价倍率 * CR奖励倍率 * 位阶修正);
  const 最终UP = Math.round(输入.基础UP汇总 * 评价倍率 * CR奖励倍率 * 位阶修正);

  // ── RP（规则第五步）──────────────────────────────────────────────────
  // 「掷 1~N」就是 掷(N)（rollDie(3) 返回 1~3）。成就的 RP 直接等于星数, 不掷。
  // 下限不是 1 的来源要平移: `下限 + 掷(上限-下限+1) - 1` —— 隐藏BOSS 的 2~4
  // 是 `2 + 掷(3) - 1`, **不是** 掷(4)（掷(4) 的下限是 1, 与规则原文「2~4」和
  // 测试「掷 1 时取下限 = 2」都不符）。
  let RP = 0;
  RP += 输入.隐藏任务数 * 掷(3);
  RP += 输入.成就星数.reduce((和, 星) => 和 + 星, 0);
  if (输入.评价等级 === 'S') RP += 3;
  RP += 输入.击杀.隐藏BOSS * (2 + 掷(3) - 1);
  RP += 输入.天赋试炼次数 * 掷(2);
  if (Math.floor(输入.CR) >= 10) RP += 掷(3);         // 炼狱通关附加

  // ── PEXP（规则第六步）────────────────────────────────────────────────
  // 每条职业专属支线掷 50~100: 掷(51) 返回 1~51, 减 1 后加 50 = 50~100。
  // 注意**不是** `50 + 掷(50)`（那是 51~100）。
  let 支线PEXP = 0;
  for (let i = 0; i < 输入.职业专属支线条数; i++) 支线PEXP += 50 + 掷(51) - 1;
  const PEXP = Math.round((100 + 支线PEXP) * 评价倍率);

  // ── CR 变动（规则第十步）─────────────────────────────────────────────
  const CR变动表: Record<string, number> = { S: 0.5, A: 0.3, B: 0, C: 0, D: -0.5, F: 0 };
  const CR变动 = CR变动表[输入.评价等级] ?? 0;
  let 更新后CR = 输入.CR + CR变动;
  if (更新后CR >= 10) 更新后CR = 3;                   // 上限 10: 达到即回调至 3
  更新后CR = Math.min(10, Math.max(1, 更新后CR));      // 再 clamp 到 1~10
  const 更新后回廊态度 = CR分档(更新后CR)[0];

  // ── 周期 / 时间 / 资格分累加（规则第十一步）──────────────────────────
  let 新周期 = 输入.旧周期 + 1;
  if (新周期 > 10) 新周期 = 1;

  return {
    评价等级: 输入.评价等级,
    评价倍率,
    CR态度,
    CR奖励倍率,
    位阶修正,
    基础EXP汇总: 输入.基础EXP汇总,
    基础UP汇总: 输入.基础UP汇总,
    最终EXP,
    最终UP,
    RP,
    PEXP,
    资格分_评价,
    资格分_击杀,
    资格分_任务,
    资格分_本次,
    CR变动,
    更新后CR,
    更新后回廊态度,
    新周期,
    新资格分: 输入.旧资格分 + 资格分_本次,
    新现实日期: 加天数(输入.现实日期, 输入.副本天数),
  };
}
