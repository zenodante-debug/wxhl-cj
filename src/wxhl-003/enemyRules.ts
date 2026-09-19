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
      自定义加成: { STR: 0, AGI: 0, CON: 0, PER: 0 },
    },
    // 只写 7 个额外加成; 最大值 / 当前值 由前端代算, 严禁写入
    衍生属性: { ...e.衍生额外加成 },
    职业: e.职业,
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
 * 拼 `<enemy>…</enemy>` 面板文本, **严格对齐用户规则第七步的输出格式**（与 <检定模块> 的 <enemy> 一致）。
 *
 * 取舍: `[生命|` 行只能写占位值 `1/1` —— 用户规则说「当前HP=最大HP（新实体满血出场）, 真实数值由
 * 用户卡里的前端脚本代算」, 本模块不知道那套派生公式, 故用 1/1 占位。同理 `[防御|` 行只给
 * 装备防御 / 装备闪避七槽的 Σ（衍生「防御」「闪避值」由前端代算, 模块不算）。
 * `[职业|` 行仅 BOSS 输出; 杂兵 / 精英省略。
 */
export function assembleEnemyPanel(e: GeneratedEnemy): string {
  const 防闪 = 汇总装备防闪(e.装备);
  const 威胁 = typeof e.威胁 === 'string' && e.威胁.trim().length > 0 ? e.威胁 : `${e.阶位} · Lv.${e.等级}`;
  const L: string[] = [];

  L.push('<enemy>');
  L.push(`[名称|${e.名称}]`);
  L.push(`[类型|${e.类型}]`);
  L.push(`[外观|${e.外貌 ?? '无'}]`);
  // 占位值: 用户规则规定新实体满血出场, 真实 HP 由用户卡里的前端脚本代算, 模块不知道公式
  L.push('[生命|1/1]');
  L.push(`[威胁|${威胁}]`);
  L.push(`[属性|【等级】Lv.${e.等级} | 【阶位】${e.阶位} | STR:${e.属性基础.STR} | AGI:${e.属性基础.AGI} | CON:${e.属性基础.CON} | PER:${e.属性基础.PER}]`);
  L.push(`[防御|【防御】${防闪.防御} | 【闪避】${防闪.闪避}]`);
  L.push(`[底牌|【称号】${名称及效果(e.称号)} / 【天赋】${名称及效果(e.天赋)} / 【血统】${名称及效果(e.血统)}]`);
  // 职业行仅 BOSS 输出（杂兵 / 精英不填职业, 省略整行）
  if (e.类型 === 'BOSS') L.push(拼职业行(e.职业));
  L.push(`[装备|${拼装备行(e.装备)}]`);
  L.push(`[技能|${拼技能行(e.通用技能)}]`);
  L.push('</enemy>');

  return L.join('\n');
}
