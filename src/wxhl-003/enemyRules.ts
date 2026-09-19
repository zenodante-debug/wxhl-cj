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

/** 从装备的某个槽位取名称; 缺槽 / 未装备一律返回「无」 */
function 取装备名(装备: unknown, 槽: string): string {
  if (!装备 || typeof 装备 !== 'object') return '无';
  const 数据 = (装备 as Record<string, any>)[槽];
  if (!数据 || typeof 数据 !== 'object') return '无';
  const 名称 = 数据.名称;
  return typeof 名称 === 'string' && 名称.length > 0 ? 名称 : '无';
}

/** 汇总七个槽位的装备防御 / 装备闪避绝对值（AI 已按公式算好, 前端只做 Σ 累加） */
function 汇总装备防闪(装备: unknown): { 防御: number; 闪避: number } {
  let 防御 = 0;
  let 闪避 = 0;
  for (const 槽 of 装备槽顺序) {
    if (!装备 || typeof 装备 !== 'object') break;
    const 数据 = (装备 as Record<string, any>)[槽];
    if (!数据 || typeof 数据 !== 'object') continue;
    if (typeof 数据.装备防御 === 'number' && Number.isFinite(数据.装备防御)) 防御 += 数据.装备防御;
    if (typeof 数据.装备闪避 === 'number' && Number.isFinite(数据.装备闪避)) 闪避 += 数据.装备闪避;
  }
  return { 防御, 闪避 };
}

/** 把通用技能拼成一行摘要: 技能名(类型 · 行动类型 · 关联属性 · 射程 · Lv.n) */
function 拼技能摘要(通用技能: unknown): string {
  if (!通用技能 || typeof 通用技能 !== 'object') return '无';
  const 条目 = Object.entries(通用技能 as Record<string, any>);
  if (条目.length === 0) return '无';
  return 条目
    .map(([名, s]) => {
      if (!s || typeof s !== 'object') return 名;
      const 细节 = [s.类型, s.行动类型, s.关联属性, s.射程].filter((x: unknown) => typeof x === 'string' && x.length > 0 && x !== '无');
      const 等级 = typeof s.等级 === 'number' ? `Lv.${s.等级}` : '';
      const 括注 = [...细节, 等级].filter(Boolean).join(' · ');
      return 括注 ? `${名}(${括注})` : 名;
    })
    .join(' | ');
}

/** 天赋 / 血统 / 称号 的名称, 缺失写「无」 */
function 取名(对象: unknown): string {
  if (!对象 || typeof 对象 !== 'object') return '无';
  const 名称 = (对象 as Record<string, any>).名称;
  return typeof 名称 === 'string' && 名称.length > 0 ? 名称 : '无';
}

/**
 * 拼 `<enemy>…</enemy>` 面板文本（用户规则第七步的格式）。
 *
 * 取舍: `[生命|` 行只能写占位值 —— 真实 HP 由用户卡里的前端脚本代算, 本模块不知道公式。
 * 同理 `[防御|` 行只给装备防御/装备闪避的 Σ（衍生防御与闪避值由前端代算）。
 */
export function assembleEnemyPanel(e: GeneratedEnemy): string {
  const 防闪 = 汇总装备防闪(e.装备);
  const L: string[] = [];

  L.push('<enemy>');
  L.push(`[名称|${e.名称}]`);
  L.push(`[类型|${e.类型}]`);
  // 职业行仅 BOSS 输出（杂兵 / 精英不填职业）
  if (e.类型 === 'BOSS') {
    const 职业名 = 取名(e.职业);
    const 稀有度 = e.职业 && typeof e.职业 === 'object' ? (e.职业 as Record<string, any>).稀有度 : undefined;
    L.push(`[职业|${职业名}${typeof 稀有度 === 'string' && 稀有度.length > 0 && 稀有度 !== '无' ? `（${稀有度}）` : ''}]`);
  }
  L.push(`[外观|${e.外貌 ?? '无'}]`);
  // 占位值: 真实 HP 由前端脚本代算
  L.push('[生命|1/1]');
  L.push(`[威胁|${e.阶位 ?? '无'} · Lv.${e.等级}]`);
  L.push(`[属性|STR ${e.属性基础.STR} | AGI ${e.属性基础.AGI} | CON ${e.属性基础.CON} | PER ${e.属性基础.PER}]`);
  L.push(`[防御|装备防御 ${防闪.防御} | 装备闪避 ${防闪.闪避}]`);
  L.push(`[底牌|天赋: ${取名(e.天赋)} | 血统: ${取名(e.血统)} | 称号: ${取名(e.称号)}]`);
  L.push(`[装备|${装备槽顺序.map(槽 => `【${槽}】${取装备名(e.装备, 槽)}`).join(' | ')}]`);
  L.push(`[技能|${拼技能摘要(e.通用技能)}]`);
  L.push('</enemy>');

  return L.join('\n');
}
