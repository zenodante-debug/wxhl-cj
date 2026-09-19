// ================================================================
// 敌人生成（副本角色）· AI 输出校验与变量映射
// 纯函数, 无副作用, 不触碰酒馆接口
//
// 铁律（用户规则原文）: AI 严禁写入
//   属性.加成 / 属性.实际 / 属性.属性修正值
//   衍生属性的 HP_最大 / MP_最大 / 耐力_最大 / 防御 / 闪避值 / 移动距离 / 负重_上限
//   任何 *_当前
// 这些全部由用户卡里的前端脚本代算（MVU 的 schema 会用 prefault 自动补 0）。
// 因此 mapEnemyToVariables 返回的对象里, 这些被禁的键一个都不出现。
// ================================================================

/** 副本角色的三个固定类型, 顺序即生成顺序（杂兵 → 精英 → BOSS） */
export const ENEMY_KINDS = ['杂兵', '精英', 'BOSS'] as const;

export type EnemyKind = (typeof ENEMY_KINDS)[number];

/** 四维属性基础值 */
const 四维Schema = z.object({
  STR: z.coerce.number().min(0),
  AGI: z.coerce.number().min(0),
  CON: z.coerce.number().min(0),
  PER: z.coerce.number().min(0),
});

/** 剧情性加成（用户规则原文：「属性.自定义加成（剧情性加成，默认0）」）—— 缺省或漏写一律按 0 处理 */
const 自定义加成Schema = z.object({
  STR: z.coerce.number().prefault(0),
  AGI: z.coerce.number().prefault(0),
  CON: z.coerce.number().prefault(0),
  PER: z.coerce.number().prefault(0),
}).prefault({});

/**
 * 衍生属性的 7 个「额外加成」字段 —— **只有这 7 个白名单字段允许 AI 写入**。
 * HP_最大 / MP_最大 / 耐力_最大 / 防御 / 闪避值 / 移动距离 / 负重_上限 一律不在此列（前端代算）。
 */
const 衍生额外加成Schema = z.object({
  HP额外加成: z.coerce.number().prefault(0),
  MP额外加成: z.coerce.number().prefault(0),
  耐力额外加成: z.coerce.number().prefault(0),
  防御额外加成: z.coerce.number().prefault(0),
  闪避额外加成: z.coerce.number().prefault(0),
  移动距离额外加成: z.coerce.number().prefault(0),
  负重额外加成: z.coerce.number().prefault(0),
});

/**
 * 单个副本角色。装备槽位多、结构深, 本模块**只做透传与字段白名单, 不逐字段校验**
 * —— 装备防御/装备闪避的绝对值公式由 prompt 交给 AI 算好。
 */
const 敌人Schema = z.object({
  名称: z.string().min(1),
  类型: z.enum(ENEMY_KINDS),
  外貌: z.string().prefault('无'),
  构筑: z.string().prefault('无'),
  等级: z.coerce.number().int().min(1).max(999),
  阶位: z.string().prefault('无'),
  // 玩家视角下的威胁评估（如「极低单体，集群麻烦」）—— 只用于 <enemy> 面板, 不写进变量
  威胁: z.string().prefault(''),
  天赋: z.record(z.string(), z.any()).prefault({}),
  血统: z.record(z.string(), z.any()).prefault({}),
  称号: z.record(z.string(), z.any()).prefault({}),
  属性基础: 四维Schema,
  属性自定义加成: 自定义加成Schema,
  衍生额外加成: 衍生额外加成Schema.prefault({}),
  通用技能: z.record(z.string(), z.any()).prefault({}),
  装备: z.record(z.string(), z.any()).prefault({}),
  特殊状态: z.record(z.string(), z.any()).prefault({}),
  背包: z.record(z.string(), z.any()).prefault({}),
  职业: z.record(z.string(), z.any()).optional(),
});

/**
 * AI 返回内容的校验 schema。
 * `<副本角色生成规则>` 规定每次固定生成 3 个（1 杂兵 + 1 精英 + 1 BOSS）, 故长度精确约束为 3。
 */
export const EnemyGenResultSchema = z.object({
  敌人: z.array(敌人Schema).length(3),
});

export type EnemyGenResult = z.output<typeof EnemyGenResultSchema>;

/** 单个副本角色的解析后类型 */
export type GeneratedEnemy = EnemyGenResult['敌人'][number];

/** 装备的七个槽位, 顺序即面板里的展示顺序 */
const 装备槽顺序 = ['头部', '躯干', '手部', '下装', '饰品', '主武器', '副武器'] as const;

/** 衍生属性的 7 个「额外加成」白名单键 —— 必须与 `衍生额外加成Schema` 保持一致 */
const 衍生额外加成键 = ['HP额外加成', 'MP额外加成', '耐力额外加成', '防御额外加成', '闪避额外加成', '移动距离额外加成', '负重额外加成'] as const;

/**
 * 把单个副本角色映射成 `契约者.副本角色.<名称>` 的实体对象（键名对齐用户 schema 的 `实体Schema`）。
 *
 * **只挑白名单顶层键组装** —— AI 多给的字段（尤其 `属性.实际` 之类被禁字段）一律不透传。
 * 被禁的 `属性.加成` / `属性.实际` / `属性.属性修正值`、衍生属性的最大值/当前值
 * 与任何 `*_当前` 都不会出现在返回值里, 由 MVU schema 的 prefault 代算补 0。
 */
export function mapEnemyToVariables(e: GeneratedEnemy): Record<string, unknown> {
  const 称号 = e.称号 && typeof e.称号 === 'object' && Object.keys(e.称号).length > 0 ? e.称号 : { 名称: '无', 效果: {} };

  return {
    外貌: e.外貌 ?? '无',
    类型: e.类型,
    构筑: e.构筑 ?? '无',
    好感度: 0,
    头部: {
      等级: e.等级,
      阶位: e.阶位,
      天赋: e.天赋 ?? {},
      血统: e.血统 ?? {},
      称号: {
        当前称号: 称号,
        '备用称号（只记录不生效）': { 名称: '无', 效果: {} },
      },
    },
    // 只写 基础 与 自定义加成; 加成 / 实际 / 属性修正值 由前端代算, 严禁写入
    属性: {
      基础: e.属性基础 ?? { STR: 0, AGI: 0, CON: 0, PER: 0 },
      自定义加成: e.属性自定义加成 ?? { STR: 0, AGI: 0, CON: 0, PER: 0 },
    },
    // 只写 7 个额外加成（按白名单键重建, 绝不直接展开 AI 给的对象 —— 防止未校验数据里
    // 混入 HP_最大 之类被禁字段）; 最大值 / 当前值 由前端代算, 严禁写入
    衍生属性: 衍生额外加成键.reduce<Record<string, number>>((acc, k) => {
      const v = (e.衍生额外加成 as Record<string, unknown> | undefined)?.[k];
      acc[k] = typeof v === 'number' && Number.isFinite(v) ? v : 0;
      return acc;
    }, {}),
    // 规则原文: 杂兵、精英无职业 —— 直接不写该键, 由 MVU schema 的 prefault 兜底
    ...(e.类型 === 'BOSS' && e.职业 ? { 职业: e.职业 } : {}),
    通用技能: e.通用技能 ?? {},
    装备: e.装备 ?? {},
    // 只写 特殊状态; 生命状态由前端代算, 严禁写入
    状态: { 特殊状态: e.特殊状态 ?? {} },
    背包: e.背包 ?? {},
  };
}

/** 空值判定: undefined / null / 空串 都算「无内容」 */
function 是空(值: unknown): boolean {
  return 值 === undefined || 值 === null || (typeof 值 === 'string' && 值.trim().length === 0);
}

/** 数值兜底: 只接受**有限数**（合法的 0 与负数照收）; 其余（undefined / NaN / 字符串）退回兜底值 */
function 取数(值: unknown, 兜底: number): number {
  return typeof 值 === 'number' && Number.isFinite(值) ? 值 : 兜底;
}

/**
 * 已代算模式下渲染一个数值: 有限数（含 0 与负数）原样打印; undefined / NaN / 非数字印 `—`。
 *
 * **绝不退回自算值** —— 印 `—` 说明前端脚本真出了问题（键名不符 / 它自己算出 NaN）,
 * 这时候必须让人看见, 不能替它用一个"看着像真的"的数圆上。
 * 注意 NaN 必须用有限性判断挡下（`NaN ?? x` 仍是 NaN）。
 */
function 印数(值: unknown): string {
  const n = 取数(值, NaN);
  return Number.isFinite(n) ? String(n) : '—';
}

/**
 * 把「效果」渲染成 `效果名--效果内容`, 多个效果用 `；` 分隔。
 * 这是用户规则里 `[技能]` 行的形状（`--` 是效果名与内容之间的固定分隔）。
 */
function 拼效果(效果: unknown): string {
  if (typeof 效果 === 'string') return 效果.trim();
  if (!效果 || typeof 效果 !== 'object') return '';
  const 条目 = Object.entries(效果 as Record<string, any>).filter(([, v]) => !是空(v));
  if (条目.length === 0) return '';
  return 条目
    .map(([名, 内容]) => {
      const 文本 = typeof 内容 === 'string' ? 内容 : JSON.stringify(内容);
      return 名 ? `${名}--${文本}` : 文本;
    })
    .join('；');
}

/** 渲染「{{名称及效果，无则填无}}」: 形如 `腐臭血肉（腐臭--被近战命中时使对方中毒1回合）` */
function 名称及效果(对象: unknown): string {
  if (!对象 || typeof 对象 !== 'object') return '无';
  const d = 对象 as Record<string, any>;
  const 名称 = typeof d.名称 === 'string' && d.名称.trim().length > 0 ? d.名称 : '无';
  const 效果串 = 拼效果(d.效果);
  if (名称 === '无' && !效果串) return '无';
  return 效果串 ? `${名称}（${效果串}）` : 名称;
}

/** 把字符串 / 数组 / 对象统一渲染成 `；` 分隔的清单（用于职业特性、职业技能） */
function 拼清单(值: unknown): string {
  if (typeof 值 === 'string') return 值.trim() || '无';
  if (Array.isArray(值)) {
    const 串 = 值
      .map(v => (typeof v === 'string' ? v : v && typeof v === 'object' && typeof (v as any).名称 === 'string' ? (v as any).名称 : ''))
      .filter((s: string) => s.length > 0)
      .join('；');
    return 串 || '无';
  }
  if (!值 || typeof 值 !== 'object') return '无';
  const 条目 = Object.entries(值 as Record<string, any>).filter(([, v]) => !是空(v));
  if (条目.length === 0) return '无';
  return 条目.map(([名, v]) => (typeof v === 'string' && v.trim().length > 0 ? `${名}: ${v}` : 名)).join('；');
}

/** 单个装备条目: `名称（品质·阶位·强化+n·伤害骰·倍率·装备防御·装备闪避·效果: …）`; 缺槽返回「无」 */
function 装备条目(数据: unknown): string {
  if (!数据 || typeof 数据 !== 'object') return '无';
  const d = 数据 as Record<string, any>;
  const 名称 = typeof d.名称 === 'string' && d.名称.trim().length > 0 ? d.名称 : '无';
  if (名称 === '无') return '无';
  const 部件: string[] = [];
  if (typeof d.类型 === 'string' && d.类型.trim() && d.类型 !== '无') 部件.push(d.类型);
  if (typeof d.品质 === 'string' && d.品质.trim() && d.品质 !== '无') 部件.push(d.品质);
  if (typeof d.阶位 === 'string' && d.阶位.trim() && d.阶位 !== '无') 部件.push(d.阶位);
  if (typeof d.强化等级 === 'number' && d.强化等级 > 0) 部件.push(`强化+${d.强化等级}`);
  if (typeof d.伤害骰 === 'string' && d.伤害骰.trim() && d.伤害骰 !== '无') 部件.push(`伤害骰${d.伤害骰}`);
  if (typeof d.倍率 === 'number' && d.倍率 > 0) 部件.push(`倍率${d.倍率}`);
  if (typeof d.装备防御 === 'number' && d.装备防御 !== 0) 部件.push(`装备防御${d.装备防御 > 0 ? '+' : ''}${d.装备防御}`);
  if (typeof d.装备闪避 === 'number' && d.装备闪避 !== 0) 部件.push(`装备闪避${d.装备闪避 > 0 ? '+' : ''}${d.装备闪避}`);
  const 效果串 = 拼效果(d.效果);
  if (效果串) 部件.push(`效果: ${效果串}`);
  return 部件.length > 0 ? `${名称}（${部件.join('·')}）` : 名称;
}

/** 汇总七个槽位的装备防御 / 装备闪避绝对值（AI 已按公式算好, 前端只做 Σ 累加） */
function 汇总装备防闪(装备: unknown): { 防御: number; 闪避: number } {
  let 防御 = 0;
  let 闪避 = 0;
  if (!装备 || typeof 装备 !== 'object') return { 防御, 闪避 };
  for (const 槽 of 装备槽顺序) {
    const 数据 = (装备 as Record<string, any>)[槽];
    if (!数据 || typeof 数据 !== 'object') continue;
    if (typeof 数据.装备防御 === 'number' && Number.isFinite(数据.装备防御)) 防御 += 数据.装备防御;
    if (typeof 数据.装备闪避 === 'number' && Number.isFinite(数据.装备闪避)) 闪避 += 数据.装备闪避;
  }
  return { 防御, 闪避 };
}

/** 位阶修正值系数（用户规则 6-2）：一阶1 / 二阶2 / 三阶4 / 四阶7 / 五阶11 */
const 位阶修正系数: Record<string, number> = { 一阶: 1, 二阶: 2, 三阶: 4, 四阶: 7, 五阶: 11 };

/** 最大HP 的类型系数（用户规则 6-2）：杂兵8 / 精英10 / BOSS20 —— 本模块只生成这三种 */
const HP系数: Record<EnemyKind, number> = { 杂兵: 8, 精英: 10, BOSS: 20 };

/** 面板用的衍生属性计算结果 */
export interface EnemyDerivedStats {
  最大HP: number;
  最大MP: number;
  最大耐力: number;
  防御: number;
  闪避值: number;
  移动距离: number;
  负重上限: number;
}

/** 写入后回读到的实体。字段全部可选 —— 面板要在字段缺失时也能退化输出, 不能抛错 */
export type 回读实体 = Record<string, any>;

/**
 * 回读到的实体里, 用户卡的前端脚本是否已完成代算。
 *
 * 判据取多信号: `衍生属性.HP_最大 > 0 || 衍生属性.闪避值 > 0`
 * —— 这两项由**同一支前端脚本一次算完**, 同生共死, 一起被判据看到。
 *
 * 为什么不能只看 `HP_最大 > 0`: 「前端代算出的 HP_最大 恒为正」是**假的不变量**。
 * 它的公式是 （CON修正 + 5）× HP系数, 而 `四维Schema` 只要求 `min(0)`, **CON = 0 是合法值**
 * （构筑设计思路还明确鼓励「完全放弃防御、容错率为零」的极端 dump）:
 *   一阶 CON=0 → HP_最大 = 0;  二阶 CON≤2、三阶 CON≤3、四阶/五阶 CON≤4 时 HP_最大 也 ≤ 0。
 * 单信号会把这批合法角色误判成「未代算」→ 面板静默走回退 → 四维取基础、装备加成不可见,
 * 正是本轮要消灭的那个偏低 bug 原样复活且毫无报错。
 * 第二信号 `闪避值` 的基线是 `10 + AGI修正×0.5 + …`, 几乎恒 > 0（只有极重装甲堆叠才可能压到 ≤0）,
 * 且它与 `HP_最大` 出自同一次代算, 用 `> 0` 即可覆盖上述漏网情形。
 *
 * 也不用 `属性.实际` 判定: prefault 会把它补成 {STR:0,...} 这种"看着存在其实是空的"值。
 * 两条信号都被 prefault 补 0（或该键根本不存在）时才判为未代算。
 */
export function 前端已代算(实体: 回读实体 | undefined | null): boolean {
  const 衍生 = (实体 as any)?.衍生属性;
  return 取数(衍生?.HP_最大, 0) > 0 || 取数(衍生?.闪避值, 0) > 0;
}

/** 算衍生 的原始输入 —— 四维 / 阶位 / 类型 / 装备 / 额外加成, 与实体结构解耦 */
interface 衍生输入 {
  四维: { STR?: number; AGI?: number; CON?: number; PER?: number };
  阶位: string;
  类型: string;
  装备: unknown;
  额外加成: Record<string, unknown>;
}

/**
 * 按用户规则 6-2 的公式计算衍生属性（唯一定义处, 面板的两条取值路径都走它）。
 * 这些数值**仍然严禁写入变量**: 用户规则把衍生属性的计算职责给了用户卡里的前端脚本,
 * 模块只是为了让面板数字与前端代算结果一致才复算一遍。
 *
 * - 「实际属性值」取 输入.四维 —— 调用方决定是「基础」还是「实际」
 * - 「修正值」=（实际属性值 − 5）× 位阶修正系数
 * - `负重上限` 用的是 **STR 实际值**（不是 STR 修正值）
 * - `Σ装备防御`/`Σ装备闪避` 为七槽求和（AI 已按步骤二公式算好绝对值, 缺槽按 0 计）
 */
function 算衍生(输入: 衍生输入): EnemyDerivedStats {
  const 系数 = 位阶修正系数[输入.阶位] ?? 1;
  const 基础 = (输入.四维 ?? { STR: 0, AGI: 0, CON: 0, PER: 0 }) as Record<string, number>;
  const 额外 = (输入.额外加成 ?? {}) as Record<string, unknown>;
  const 取额外 = (键: string): number => {
    const v = 额外[键];
    return typeof v === 'number' && Number.isFinite(v) ? v : 0;
  };
  const 修正 = (实际值: number): number => (实际值 - 5) * 系数;

  const CON修正 = 修正(基础.CON ?? 0);
  const AGI修正 = 修正(基础.AGI ?? 0);
  const PER修正 = 修正(基础.PER ?? 0);
  // 负重上限用的是 STR 实际值, 不是 STR 修正值
  const STR实际值 = 基础.STR ?? 0;
  const 防闪 = 汇总装备防闪(输入.装备);

  return {
    最大HP: (CON修正 + 5) * (HP系数[输入.类型 as EnemyKind] ?? 8) + 取额外('HP额外加成'),
    最大MP: PER修正 * 10 + 取额外('MP额外加成'),
    最大耐力: (CON修正 + 5) * 10 + 取额外('耐力额外加成'),
    防御: Math.floor((CON修正 + 5) * 0.2) + 防闪.防御 + 取额外('防御额外加成'),
    闪避值: 10 + Math.floor(AGI修正 * 0.5) + 防闪.闪避 + 取额外('闪避额外加成'),
    移动距离: 5 + AGI修正 + 取额外('移动距离额外加成'),
    负重上限: STR实际值 * 5 + 取额外('负重额外加成'),
  };
}

/** 从 AI 原始产物算衍生属性（面板回退路径之外, 现有测试仍直接用它） */
export function computeDerivedStats(e: GeneratedEnemy): EnemyDerivedStats {
  return 算衍生({ 四维: e.属性基础, 阶位: e.阶位, 类型: e.类型, 装备: e.装备, 额外加成: e.衍生额外加成 as Record<string, unknown> });
}

/**
 * 从回读到的实体算衍生属性（＝前端尚未代算时的回退路径）。
 *
 * ⚠️ 它读的是 `mapEnemyToVariables` 映射出的**实体形状**（`实体.属性.基础` / `实体.头部.阶位` /
 * `实体.衍生属性` 的 7 个额外加成键）—— 因此回退面板与那个映射函数是**隐式耦合**的:
 * 日后若改动了映射的字段名或结构, 回退面板会跟着悄悄变样, 而调用方不会收到任何编译期提示。
 * 改映射时请一并回看这里。
 */
function 从实体算衍生(实体: 回读实体): EnemyDerivedStats {
  return 算衍生({
    四维: 实体?.属性?.基础 ?? {},
    阶位: 实体?.头部?.阶位 ?? '',
    类型: 实体?.类型 ?? '杂兵',
    装备: 实体?.装备,
    额外加成: 实体?.衍生属性 ?? {},
  });
}

/**
 * `[技能]` 行: `技能名:（类型·行动类型·关联属性·消耗·冷却）效果名--效果内容`, 多个技能用 `；` 分隔。
 * 逐字对齐用户规则的示例（半角冒号、全角括号、`·` 分隔、`--` 连接效果名与内容）。
 */
function 拼技能行(通用技能: unknown): string {
  if (!通用技能 || typeof 通用技能 !== 'object') return '无';
  const 条目 = Object.entries(通用技能 as Record<string, any>);
  if (条目.length === 0) return '无';
  return 条目
    .map(([名, s]) => {
      if (!s || typeof s !== 'object') return 名;
      const d = s as Record<string, any>;
      const 括注 = [d.类型, d.行动类型, d.关联属性, d.消耗, d.冷却]
        .filter((x: unknown) => typeof x === 'string' && x.trim().length > 0)
        .join('·');
      return `${名}:（${括注}）${拼效果(d.效果) || '无'}`;
    })
    .join('；');
}

/** `[装备]` 行: 七槽按固定顺序逐一输出, 缺槽写「无」, 槽间用 ` / ` 分隔 */
function 拼装备行(装备: unknown): string {
  return 装备槽顺序
    .map(槽 => {
      const 数据 = 装备 && typeof 装备 === 'object' ? (装备 as Record<string, any>)[槽] : undefined;
      return `【${槽}】${装备条目(数据)}`;
    })
    .join(' / ');
}

/** `[职业]` 行（仅 BOSS 输出）: 职业名称 / 职业特性 / 职业技能 */
function 拼职业行(职业: unknown): string {
  const d = 职业 && typeof 职业 === 'object' ? (职业 as Record<string, any>) : {};
  const 名称 = typeof d.名称 === 'string' && d.名称.trim().length > 0 ? d.名称 : '无';
  const 稀有度 = typeof d.稀有度 === 'string' && d.稀有度.trim().length > 0 && d.稀有度 !== '无' ? `（${d.稀有度}）` : '';
  return `[职业|【职业名称】${名称}${稀有度} / 【职业特性】${拼清单(d.职业特性)} / 【职业技能】${拼清单(d.职业技能)}]`;
}

/**
 * 拼 `<enemy>…</enemy>` 面板（严格对齐用户规则第七步的格式）。
 *
 * 数值的取值是**整模式二选一**（模式由 `前端已代算` 判定, 全有或全无）:
 * - **已代算** → 整个面板取回读实体里前端脚本算出的值（`属性.实际` /
 *   `衍生属性.HP_最大 / HP_当前 / 防御 / 闪避值`）;
 * - **未代算** → 整个面板退回 `从实体算衍生` 自算（＝改动前的行为）。
 *
 * 已代算模式下, 数值只认真实有限数: 合法的 `0` 与**负数**（重装/极重的装备闪避是负系数,
 * 规则步骤二明说可写负数）照原样打印; `undefined` / `NaN` / 非数字一律印 `—`, **绝不退回自算值**
 * —— 印 `—` 说明前端真出了问题, 需要被看见, 而不是用一个来自另一种口径的数悄悄盖过去
 * （那正是本轮要消灭的「生命取实体、防御取自算」混血 bug）。
 *
 * @param 名称 角色名 —— 实体本身不存名字, 名字是 `契约者.副本角色` 下的 key
 * @param 实体 写入变量后回读到的实体对象
 * @param 威胁 AI 给的威胁评估（面板专用字段, 按规则不进变量）
 */
export function assembleEnemyPanelFromEntity(名称: string, 实体: 回读实体, 威胁?: string): string {
  const 已代算 = 前端已代算(实体);
  const 衍生 = 从实体算衍生(实体);
  const 头部 = 实体?.头部;
  const 属性 = 实体?.属性;
  const 衍生属性 = 实体?.衍生属性;
  const 类型 = 实体?.类型 ?? '杂兵';
  const 阶位 = 头部?.阶位 ?? '';
  const 等级 = 取数(头部?.等级, 0);
  const 威胁文本 = typeof 威胁 === 'string' && 威胁.trim().length > 0 ? 威胁 : `${阶位} · Lv.${等级}`;
  const L: string[] = [];

  L.push('<enemy>');
  L.push(`[名称|${名称}]`);
  L.push(`[类型|${类型}]`);
  L.push(`[外观|${实体?.外貌 ?? '无'}]`);
  // 用户规则: 新实体满血出场（HP_当前 === HP_最大）; 仍优先读 HP_当前, 战斗后再次生成面板时会用到
  const 生命 = 已代算
    ? `${印数(衍生属性?.HP_当前 ?? 衍生属性?.HP_最大)}/${印数(衍生属性?.HP_最大)}`
    : `${衍生.最大HP}/${衍生.最大HP}`;
  L.push(`[生命|${生命}]`);
  L.push(`[威胁|${威胁文本}]`);
  // 已代算 → 四维取「实际」（含装备/职业/剧情的加成汇总）; 未代算 → 取「基础」。
  // 逐维取数, 不整对象 `??` —— prefault 会把缺失的「实际」补成 {STR:0,...} 这种"看着存在其实是空的"值
  const 四维源 = 已代算 ? 属性?.实际 : 属性?.基础;
  const 维 = (键: string): string => (已代算 ? 印数(四维源?.[键]) : String(取数(四维源?.[键], 0)));
  L.push(`[属性|【等级】Lv.${等级} | 【阶位】${阶位} | STR:${维('STR')} | AGI:${维('AGI')} | CON:${维('CON')} | PER:${维('PER')}]`);
  L.push(`[防御|${已代算 ? `【防御】${印数(衍生属性?.防御)} | 【闪避】${印数(衍生属性?.闪避值)}` : `【防御】${衍生.防御} | 【闪避】${衍生.闪避值}`}]`);
  L.push(`[底牌|【称号】${名称及效果(头部?.称号?.当前称号)} / 【天赋】${名称及效果(头部?.天赋)} / 【血统】${名称及效果(头部?.血统)}]`);
  // 职业行仅 BOSS 输出（杂兵 / 精英不填职业, 省略整行）
  if (类型 === 'BOSS') L.push(拼职业行(实体?.职业));
  L.push(`[装备|${拼装备行(实体?.装备)}]`);
  L.push(`[技能|${拼技能行(实体?.通用技能)}]`);
  L.push('</enemy>');

  return L.join('\n');
}
