// ================================================================
// 副本生成 · 掷骰引擎
// 纯函数, 不依赖任何酒馆运行时全局 (只依赖 crypto), 便于单元测试
// ================================================================

/** 一次掷骰的完整记录, 用于 UI 展示与注入 prompt 作为「已锁定骰值表」 */
export interface RollRecord {
  标签: string;
  表达式: string;
  /** 骰面原始值 */
  骰值: number;
  /** 按规则区间映射出的文字, 无映射时为 '' */
  映射: string;
}

/**
 * 掷一颗骰子, 返回 1..faces。
 * 用拒绝采样消除取模偏差: 先把 2^32 截到 faces 的整数倍, 落在尾巴上的样本重掷。
 */
export function rollDie(faces: number): number {
  if (!Number.isInteger(faces) || faces < 1) throw new Error('骰面数必须是正整数: ' + faces);
  if (faces === 1) return 1;
  const limit = Math.floor(0x100000000 / faces) * faces;
  const buf = new Uint32Array(1);
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return (v % faces) + 1;
}

/** 媒介来源 (D6) */
export const MEDIA_SOURCES = ['实体小说', '影视作品', '电子游戏', '动漫作品', '民俗怪谈', '桌面与规则体系'] as const;

/** 题材大类 (D6) */
export const GENRES = ['奇幻/神话', '玄幻/仙侠', '科幻/未来', '历史/演义', '现代/异能', '现实/日常'] as const;

/** 时代背景 (D6) */
export const ERAS = ['上古/太古', '古代/中世纪', '近代/工业化', '现代/当代', '近未来/赛博', '遥远未来/星际'] as const;

/** 核心特色标签 (D50), 下标 0 对应骰值 1; 第 41~50 项为日常标签 */
export const FEATURE_TAGS = [
  '丧尸/生化危机',
  '克苏鲁/不可名状',
  '泰坦巨兽/怪兽宇宙',
  '废土/核战后',
  '诡异民俗/中、日式恐怖',
  '无限流/多元交汇',
  '规则怪谈/怪异模因',
  '赛博朋克/矩阵空间',
  '虚拟网游',
  '荒诞喜剧/反套路',
  '吸血鬼/黑暗哥特',
  '童话反转/黑深残',
  '梦核/阈限空间',
  '微缩世界/巨物恐惧',
  '异常收容/SCP风',
  '超级英雄/美漫风',
  '平行宇宙/时间断层',
  '维多利亚诡案/雾都',
  '热血王道/宿命羁绊',
  '机甲维度/钢铁巨兵',
  '恋爱喜剧/修罗场',
  '里番向',
  '深渊地狱/极恶位面',
  '史诗战场/绞肉机战壕',
  '硬核武斗/国术格斗',
  '反乌托邦/虚假社会',
  '物欲都市/资本帝国',
  '现代战争/战术特种',
  '全员恶人/哥谭风',
  '魔法学园/派系斗争',
  '深海恐惧/水下幽闭',
  '异星虫灾/无尽同化',
  '蒸汽朋克/工业巨兽',
  '神明陨落/信仰黄昏',
  '极端气候/生态灾变',
  '特摄宇宙/巨大化英雄',
  '废土修仙/灵气变异',
  '蛮荒纪元/史前巨兽',
  '浮空岛屿/破碎大陆',
  '极道黑帮/地下秩序',
  '学园日常/青春群像',
  '美食经营/餐厅物语',
  '恋爱喜剧/纯爱修罗场',
  '偶像艺能/娱乐圈生态',
  '体育竞技/热血部活',
  '职场喜剧/社畜生态',
  '治愈田园/慢生活',
  '综艺游戏/整活现场',
  '宅文化/兴趣社团',
  '温馨家庭/邻里日常',
] as const;

/** 副模块 (D50), 下标 0 对应骰值 1; 第 41~50 项为原生日常机制 */
export const SUB_MODULES = [
  '大逃杀',
  '绝境求生',
  '天灾降临',
  '绝症倒计时',
  '狩猎靶标',
  '狼人背叛',
  '卧底潜伏',
  '声望崩塌',
  '阵营对抗',
  '禁止杀戮',
  '密室解谜',
  '时间轮回',
  '叙述诡计',
  '连环凶案',
  '因果逆转',
  '据点塔防',
  '两军对垒',
  '斩首行动',
  '护送任务',
  '资源争夺',
  '地牢深潜',
  '巨物围猎',
  '碎片拼凑',
  '怪物图鉴',
  '遗迹破译',
  '全员禁魔',
  '科技锁死',
  '属性压制',
  '原著附身',
  '多方乱战',
  '白手起家',
  '权欲交易',
  '领地建设',
  '表里世界',
  '移动迷宫',
  '寻宝竞速',
  '信仰掠夺',
  '身份替换',
  '筹码赌局',
  '剧本演出',
  '社团存续',
  '目标达成',
  '人际修罗场',
  '委托代办',
  '秘密守护',
  '季节活动',
  '养成计划',
  '日常异变',
  '身份体验',
  '黄金日常',
] as const;

/** IP 热度 (D40) */
export function ipHeatOf(d: number): string {
  if (d <= 15) return '较冷门';
  if (d <= 25) return '中等';
  if (d <= 35) return '较热门';
  return '世界知名';
}

/** 构建骰结果 */
export interface BuildRoll {
  副本类型: '和平' | '阵营' | '血腥';
  /** 新手副本不投此骰, 日常副本虽投骰但被规则覆盖, 两种情况都保留原始骰值供审计 */
  副本类型骰?: number;
  副本类型被日常规则覆盖?: boolean;
  媒介来源: string;
  题材大类: string;
  时代背景: string;
  核心特色标签: string;
  核心特色标签骰: number;
  /**
   * 队友标签: **与核心特色标签互相独立**的第二颗 1d50, 只用来圈定 IP 队友的来源范围。
   * 与 `核心特色标签` 值相同是允许的（两次独立掷骰本来就可能撞上）—— 代码不得让两者产生关联。
   */
  队友标签: string;
  队友标签骰: number;
  副模块: string;
  副模块骰: number;
  IP热度: string;
  IP热度骰: number;
  时间限制天: number;
  是新手副本: boolean;
  是日常副本: boolean;
}

/** 汉字数字 → 阿拉伯数字。含中文大写（壹贰叁肆伍）与口语/繁体「两」「兩」 */
const 汉字数字: Record<string, number> = {
  一: 1,
  二: 2,
  两: 2,
  兩: 2,
  三: 3,
  四: 4,
  五: 5,
  壹: 1,
  贰: 2,
  貳: 2,
  叁: 3,
  參: 3,
  肆: 4,
  伍: 5,
};

/** 全角数字 → 半角数字（中文输入法下极易打出 `１阶` / `１`） */
function 全角转半角(s: string): string {
  return s.replace(/[０-９]/g, c => String.fromCharCode(c.charCodeAt(0) - 0xfee0));
}

/**
 * 阶位写法归一 → `0..4`（一阶..五阶）; 仍认不出来返回 `undefined`。
 *
 * 实现是「**先规范化字符串、再解析**」, 而不是一张枚举表 —— 枚举表只会越写越长,
 * 且每加一种写法就要在每个调用点各补一遍。流水线:
 *   去空白 → 全角转半角 → 去前导「第」 → 去尾部「阶」/「階」/「阶位」/「階位」
 *   → 汉字数字转阿拉伯 → 解析 → 校验落在 `1..5`
 * 于是 `一阶` / `1阶` / `一` / `1` / `第一阶` / `第1阶` / `１阶` / `一階` / `壹阶` /
 * ` 三阶 ` / `五` 全部归到同一位阶。
 *
 * **认不出来的一律 `undefined`, 绝不猜**: `六阶` / `6` / `0` / `''` / `无` / `超脱` /
 * `不在副本中` 都返回 `undefined`。失败策略由**调用方各自决定**（`tierIndexOf` 取 `-1`、
 * `tierOf` 归末尾、面板印 `—`、榜单当一阶、结算抛错）—— 归一函数本身不做任何兜底。
 */
export function 归一位阶(阶位: unknown): number | undefined {
  // 变量里已是数字时也认（AI 偶尔会把 `3` 写成数字而不是字符串）
  if (typeof 阶位 === 'number') {
    return Number.isInteger(阶位) && 阶位 >= 1 && 阶位 <= 5 ? 阶位 - 1 : undefined;
  }
  if (typeof 阶位 !== 'string') return undefined;
  const s = 全角转半角(阶位.replace(/\s+/g, ''))
    .replace(/^第/, '')
    .replace(/(阶位|階位|阶|階)$/, '');
  if (/^[0-9]+$/.test(s)) {
    const n = Number(s);
    return n >= 1 && n <= 5 ? n - 1 : undefined;
  }
  const n = 汉字数字[s];
  return n === undefined ? undefined : n - 1;
}

/**
 * 阶位写法归一: schema 用「一阶」, TIER_ORDER 用「1阶」; 返回 0..4, **未知返回 -1**。
 *
 * `-1` 是**本调用点自己的失败策略**（`isNewbieDungeon` 用它做 `=== 0` 判定, 未知即「不是新手」）,
 * 与 `workshop.ts:tierOf` 的「归末尾」、面板的「印 `—`」、结算的「抛错」刻意不同 ——
 * 归一本身交给 `归一位阶`, 这里只负责把 `undefined` 翻成 -1。
 */
export function tierIndexOf(阶位: string): number {
  return 归一位阶(阶位) ?? -1;
}

/**
 * 新手副本判定: 副本周期为 1 **且** 契约者为一阶。
 * 只看周期会把「已升阶、刚开始新一轮」的老玩家误判为新人。
 */
export function isNewbieDungeon(副本周期: number, 阶位: string): boolean {
  return 副本周期 === 1 && tierIndexOf(阶位) === 0;
}

/**
 * 掷出全部「构建骰」。
 * 顺序与规则一致: 副本类型 → 媒介来源 → 题材大类 → 时代背景 → 核心特色标签 → 队友标签 → 副模块 → IP热度 → 时间限制。
 * @param 副本周期 stat_data.契约者.赛季信息.当前副本周期
 * @param 阶位 stat_data.契约者.头部.阶位, 与副本周期共同决定是否新手副本
 */
export function rollBuild(副本周期: number, 阶位: string): { build: BuildRoll; records: RollRecord[] } {
  const records: RollRecord[] = [];
  const 是新手副本 = isNewbieDungeon(副本周期, 阶位);

  // ① 副本类型 (D4) —— 新手副本强制和平且不投骰
  let 副本类型骰: number | undefined;
  let 副本类型: BuildRoll['副本类型'] = '和平';
  if (!是新手副本) {
    副本类型骰 = rollDie(4);
    副本类型 = 副本类型骰 === 1 ? '和平' : 副本类型骰 === 2 ? '阵营' : '血腥';
    records.push({ 标签: '副本类型', 表达式: '1d4', 骰值: 副本类型骰, 映射: 副本类型 });
  }

  // ② 媒介来源 (D6)
  const 媒介骰 = rollDie(6);
  const 媒介来源 = MEDIA_SOURCES[媒介骰 - 1];
  records.push({ 标签: '媒介来源', 表达式: '1d6', 骰值: 媒介骰, 映射: 媒介来源 });

  // ③ 题材大类 (D6)
  const 题材骰 = rollDie(6);
  const 题材大类 = GENRES[题材骰 - 1];
  records.push({ 标签: '题材大类', 表达式: '1d6', 骰值: 题材骰, 映射: 题材大类 });

  // ④ 时代背景 (D6)
  const 时代骰 = rollDie(6);
  const 时代背景 = ERAS[时代骰 - 1];
  records.push({ 标签: '时代背景', 表达式: '1d6', 骰值: 时代骰, 映射: 时代背景 });

  // ⑤ 核心特色标签 (D50) —— 41~50 触发日常副本调和规则
  const 标签骰 = rollDie(50);
  const 核心特色标签 = FEATURE_TAGS[标签骰 - 1];
  records.push({ 标签: '核心特色标签', 表达式: '1d50', 骰值: 标签骰, 映射: 核心特色标签 });
  const 是日常副本 = 标签骰 >= 41;

  // ⑤.5 队友标签 (D50) —— 与上一颗骰**互相独立**, 只用来圈 IP 队友的来源范围。
  // 新手副本也投: 规则里新手副本的队友本就是「来自随机世界观的 IP 角色」, 这颗骰把「随机」具体化。
  const 队友标签骰 = rollDie(50);
  const 队友标签 = FEATURE_TAGS[队友标签骰 - 1];
  records.push({ 标签: '队友标签', 表达式: '1d50', 骰值: 队友标签骰, 映射: 队友标签 });

  // 日常副本强制视为和平 (规则 §6 优先级高于 D4)
  let 副本类型被日常规则覆盖 = false;
  if (是日常副本 && 副本类型 !== '和平') {
    副本类型被日常规则覆盖 = true;
    副本类型 = '和平';
  }
  if (副本类型被日常规则覆盖) {
    records.push({
      标签: '副本类型（日常规则覆盖）',
      表达式: '规则 §6',
      骰值: 标签骰,
      映射: '日常副本强制视为和平',
    });
  }

  // ⑥ 副模块 (D50)
  const 副模块骰 = rollDie(50);
  const 副模块 = SUB_MODULES[副模块骰 - 1];
  records.push({ 标签: '副模块', 表达式: '1d50', 骰值: 副模块骰, 映射: 副模块 });

  // ⑦ IP 热度 (D40)
  const ip骰 = rollDie(40);
  const IP热度 = ipHeatOf(ip骰);
  records.push({ 标签: 'IP热度', 表达式: '1d40', 骰值: ip骰, 映射: IP热度 });

  // ⑧ 时间限制 (1d12+2 → 3~14 天)
  const 时间骰 = rollDie(12);
  const 时间限制天 = 时间骰 + 2;
  records.push({ 标签: '时间限制', 表达式: '1d12+2', 骰值: 时间骰, 映射: 时间限制天 + '天' });

  return {
    build: {
      副本类型,
      副本类型骰,
      副本类型被日常规则覆盖: 副本类型被日常规则覆盖 || undefined,
      媒介来源,
      题材大类,
      时代背景,
      核心特色标签,
      核心特色标签骰: 标签骰,
      队友标签,
      队友标签骰,
      副模块,
      副模块骰,
      IP热度,
      IP热度骰: ip骰,
      时间限制天,
      是新手副本,
      是日常副本,
    },
    records,
  };
}

// ================================================================
// 自选覆盖（副本生成 · 自选模式）
// ================================================================

/** 自选覆盖项: 未提供的字段保持掷骰结果 */
export interface BuildOverrides {
  媒介来源?: string;
  题材大类?: string;
  时代背景?: string;
  核心特色标签?: string;
  队友标签?: string;
  副模块?: string;
}

/** 从骰表反查序号（1 起）; 值不在表内说明调用方传了表外数据, 直接抛错 */
function indexInTable(table: readonly string[], value: string, 字段名: string): number {
  const idx = table.indexOf(value);
  if (idx < 0) throw new Error(`自选${字段名}「${value}」不在骰表内`);
  return idx + 1;
}

/** 把 records 里对应标签的条目替换为「自选」标记; 找不到则补一条 */
function markRecordSelfPick(records: RollRecord[], 标签: string, 骰值: number, 映射: string): RollRecord[] {
  const entry: RollRecord = { 标签, 表达式: '自选', 骰值, 映射 };
  const idx = records.findIndex(r => r.标签 === 标签);
  if (idx < 0) return [...records, entry];
  return records.map((r, i) => (i === idx ? entry : r));
}

/**
 * 把自选覆盖应用到掷骰结果上（纯函数, 不改传入对象）。
 * 覆盖会同步修正骰值映射, 并按新标签重算日常调和规则:
 * 选 41~50 日常标签 → 强制和平; 从日常换回非日常 → 按原始副本类型骰恢复。
 */
export function applyBuildOverrides(
  input: BuildRoll,
  inputRecords: RollRecord[],
  overrides: BuildOverrides,
): { build: BuildRoll; records: RollRecord[] } {
  let build = { ...input };
  let records = [...inputRecords];

  if (overrides.媒介来源 !== undefined) {
    const 骰 = indexInTable(MEDIA_SOURCES, overrides.媒介来源, '媒介来源');
    build.媒介来源 = overrides.媒介来源;
    records = markRecordSelfPick(records, '媒介来源', 骰, overrides.媒介来源);
  }
  if (overrides.题材大类 !== undefined) {
    const 骰 = indexInTable(GENRES, overrides.题材大类, '题材大类');
    build.题材大类 = overrides.题材大类;
    records = markRecordSelfPick(records, '题材大类', 骰, overrides.题材大类);
  }
  if (overrides.时代背景 !== undefined) {
    const 骰 = indexInTable(ERAS, overrides.时代背景, '时代背景');
    build.时代背景 = overrides.时代背景;
    records = markRecordSelfPick(records, '时代背景', 骰, overrides.时代背景);
  }
  if (overrides.副模块 !== undefined) {
    const 骰 = indexInTable(SUB_MODULES, overrides.副模块, '副模块');
    build.副模块 = overrides.副模块;
    build.副模块骰 = 骰;
    records = markRecordSelfPick(records, '副模块', 骰, overrides.副模块);
  }
  if (overrides.核心特色标签 !== undefined) {
    const 骰 = indexInTable(FEATURE_TAGS, overrides.核心特色标签, '核心特色标签');
    build.核心特色标签 = overrides.核心特色标签;
    build.核心特色标签骰 = 骰;
    records = markRecordSelfPick(records, '核心特色标签', 骰, overrides.核心特色标签);
  }
  // 队友标签是独立的一颗骰, 只改自己的值; 日常调和规则只看核心特色标签骰, 不受这里影响
  if (overrides.队友标签 !== undefined) {
    const 骰 = indexInTable(FEATURE_TAGS, overrides.队友标签, '队友标签');
    build.队友标签 = overrides.队友标签;
    build.队友标签骰 = 骰;
    records = markRecordSelfPick(records, '队友标签', 骰, overrides.队友标签);
  }

  // 按（可能被覆盖的）标签骰重算日常调和规则, 与 rollBuild 的判定口径一致
  const 是日常副本 = build.核心特色标签骰 >= 41;
  const 原骰副本类型: BuildRoll['副本类型'] =
    build.副本类型骰 === 2 ? '阵营' : build.副本类型骰 === 3 || build.副本类型骰 === 4 ? '血腥' : '和平';
  let 副本类型被日常规则覆盖 = false;
  let 副本类型 = 原骰副本类型;
  if (是日常副本 && 副本类型 !== '和平') {
    副本类型被日常规则覆盖 = true;
    副本类型 = '和平';
  }
  // 覆盖记录先清后补, 保证「日常换非日常」时记录被移除
  records = records.filter(r => r.标签 !== '副本类型（日常规则覆盖）');
  if (副本类型被日常规则覆盖) {
    records.push({
      标签: '副本类型（日常规则覆盖）',
      表达式: '规则 §6',
      骰值: build.核心特色标签骰,
      映射: '日常副本强制视为和平',
    });
  }

  build = {
    ...build,
    副本类型,
    副本类型被日常规则覆盖: 副本类型被日常规则覆盖 || undefined,
    是日常副本,
  };
  return { build, records };
}

// ================================================================
// 奖励骰与奖励文本
// ================================================================

export type Quality = '白色' | '蓝色' | '金色' | '紫色' | '银色';
export type ItemType = '消耗品' | '装备' | '技能卷轴' | '特殊';

/** 区间表: [区间右端点(含), 文字], 必须按右端点升序且覆盖到骰面上限 */
export type RangeTable<T extends string> = readonly (readonly [number, T])[];

/** 按区间表把骰值映射成文字; 落在表外视为编码错误, 直接抛出 */
export function qualityOf(table: RangeTable<Quality>, d: number): Quality {
  return pickFromTable(table, d);
}
export function itemTypeOf(table: RangeTable<ItemType>, d: number): ItemType {
  return pickFromTable(table, d);
}
function pickFromTable<T extends string>(table: RangeTable<T>, d: number): T {
  for (const [right, label] of table) if (d <= right) return label;
  throw new Error(`骰值 ${d} 超出区间表上限 ${table[table.length - 1][0]}`);
}

// 规则各奖励行给定的区间表
const 品质_支线 = [
  [1, '白色'],
  [4, '蓝色'],
  [6, '金色'],
] as RangeTable<Quality>;
const 类型_支线 = [
  [4, '消耗品'],
  [7, '装备'],
  [9, '技能卷轴'],
] as RangeTable<ItemType>;
const 品质_隐藏 = [
  [3, '蓝色'],
  [7, '金色'],
  [9, '紫色'],
  [10, '银色'],
] as RangeTable<Quality>;
const 类型_隐藏 = [
  [6, '装备'],
  [9, '技能卷轴'],
  [10, '特殊'],
] as RangeTable<ItemType>;
const 品质_星1 = [
  [2, '白色'],
  [5, '蓝色'],
] as RangeTable<Quality>;
const 品质_星2 = [
  [1, '白色'],
  [4, '蓝色'],
  [5, '金色'],
] as RangeTable<Quality>;
const 品质_星3 = [
  [3, '蓝色'],
  [5, '金色'],
] as RangeTable<Quality>;
const 品质_星4 = [
  [3, '蓝色'],
  [7, '金色'],
  [8, '紫色'],
] as RangeTable<Quality>;
const 类型_星4 = [
  [6, '装备'],
  [9, '技能卷轴'],
] as RangeTable<ItemType>;
const 品质_星5 = [
  [1, '金色'],
  [3, '紫色'],
] as RangeTable<Quality>;
const 类型_星5 = [
  [5, '装备'],
  [9, '技能卷轴'],
] as RangeTable<ItemType>;
const 品质_星6 = [
  [3, '紫色'],
  [5, '银色'],
] as RangeTable<Quality>;
const 类型_星6 = [
  [3, '装备'],
  [6, '技能卷轴'],
  [7, '特殊'],
] as RangeTable<ItemType>;

export interface RewardRoll {
  up: number;
  exp: number;
  rp: number;
  quality: Quality;
  itemType: ItemType;
}

export interface RewardSet {
  主线: RewardRoll;
  支线: RewardRoll[];
  隐藏: RewardRoll[];
  成就: RewardRoll[];
}

/** 成就梯度各档的 [UP骰面, UP加值, EXP骰面, EXP加值, RP底, RP骰面]。RP骰面为 0 表示该档 RP 是固定值、不掷骰 */
const 成就梯度 = [
  { 名: '★ 探索级', up: [11, 24], exp: [11, 14], rp: [1, 0], 品质: 品质_星1, 类型: 类型_支线 },
  { 名: '★★ 挑战级', up: [21, 49], exp: [11, 34], rp: [0, 3], 品质: 品质_星2, 类型: 类型_支线 },
  { 名: '★★★ 破局级', up: [31, 84], exp: [21, 49], rp: [1, 3], 品质: 品质_星3, 类型: 类型_支线 },
  { 名: '★★★★ 史诗级', up: [61, 169], exp: [31, 84], rp: [2, 3], 品质: 品质_星4, 类型: 类型_星4 },
  { 名: '★★★★★ 传说级', up: [121, 339], exp: [41, 129], rp: [3, 3], 品质: 品质_星5, 类型: 类型_星5 },
  { 名: '★★★★★★ 世界天花板', up: [241, 679], exp: [91, 254], rp: [4, 3], 品质: 品质_星6, 类型: 类型_星6 },
] as const;

/** 掷出全部奖励骰。数值全部由本函数产出, AI 永不参与 */
export function rollRewards(): { rewards: RewardSet; records: RollRecord[] } {
  const records: RollRecord[] = [];

  /** 掷 UP/EXP 段并记账 */
  const rollMain = (标签: string, upFaces: number, upAdd: number, expFaces: number, expAdd: number) => {
    const upR = rollDie(upFaces);
    const expR = rollDie(expFaces);
    records.push({ 标签: 标签 + '·UP', 表达式: `1d${upFaces}+${upAdd}`, 骰值: upR, 映射: String(upR + upAdd) });
    records.push({ 标签: 标签 + '·EXP', 表达式: `1d${expFaces}+${expAdd}`, 骰值: expR, 映射: String(expR + expAdd) });
    return { up: upR + upAdd, exp: expR + expAdd };
  };

  /** 掷品质/类型段并记账 */
  const rollItem = (
    标签: string,
    品质表: RangeTable<Quality>,
    品质面: number,
    类型表: RangeTable<ItemType>,
    类型面: number,
  ) => {
    const qR = rollDie(品质面);
    const tR = rollDie(类型面);
    const quality = qualityOf(品质表, qR);
    const itemType = itemTypeOf(类型表, tR);
    records.push({ 标签: 标签 + '·品质', 表达式: `1d${品质面}`, 骰值: qR, 映射: quality });
    records.push({ 标签: 标签 + '·类型', 表达式: `1d${类型面}`, 骰值: tR, 映射: itemType });
    return { quality, itemType };
  };

  // 主线: 1d100+250 UP + 1d100+150 EXP (无物品)
  const 主线数值 = rollMain('主线', 100, 250, 100, 150);
  const 主线: RewardRoll = { ...主线数值, rp: 0, quality: '金色', itemType: '装备' };

  // 支线 ×3: 1d150+50 UP + 1d30+20 EXP + 品质 1d6 + 类型 1d9
  const 支线: RewardRoll[] = [];
  for (let i = 1; i <= 3; i++) {
    const 数值 = rollMain(`支线${i}`, 150, 50, 30, 20);
    const 物品 = rollItem(`支线${i}`, 品质_支线, 6, 类型_支线, 9);
    支线.push({ ...数值, rp: 0, ...物品 });
  }

  // 隐藏 ×2: 1d200+300 UP + 1d100+100 EXP + 1d3 RP + 品质 1d10 + 类型 1d10
  const 隐藏: RewardRoll[] = [];
  for (let i = 1; i <= 2; i++) {
    const 数值 = rollMain(`隐藏${i}`, 200, 300, 100, 100);
    const rpR = rollDie(3);
    records.push({ 标签: `隐藏${i}·RP`, 表达式: '1d3', 骰值: rpR, 映射: String(rpR) });
    const 物品 = rollItem(`隐藏${i}`, 品质_隐藏, 10, 类型_隐藏, 10);
    隐藏.push({ ...数值, rp: rpR, ...物品 });
  }

  // 成就 ×6: 按梯度表。★ 的 1 RP 是规则给定的固定值, 不掷骰也不记入掷骰记录
  const 成就: RewardRoll[] = 成就梯度.map(g => {
    const 数值 = rollMain(g.名, g.up[0], g.up[1], g.exp[0], g.exp[1]);
    const [rp底, rp面] = g.rp;
    let rp = rp底;
    if (rp面 > 0) {
      const rpR = rollDie(rp面);
      records.push({ 标签: g.名 + '·RP', 表达式: `1d${rp面}+${rp底}`, 骰值: rpR, 映射: String(rpR + rp底) });
      rp = rpR + rp底;
    }
    const 物品 = rollItem(g.名, g.品质, g.品质[g.品质.length - 1][0], g.类型, g.类型[g.类型.length - 1][0]);
    return { ...数值, rp, ...物品 };
  });

  return { rewards: { 主线, 支线, 隐藏, 成就 }, records };
}

/**
 * 「非数值奖励」的固定前缀 —— 目前只有晋升试炼用。
 *
 * 存在的理由: 奖励文本有两种语义, `composeRewardText` 产出的是**数值**奖励
 * (`N UP + N EXP …`), 而晋升试炼的奖励是 `等级上限+20，+3自由属性点…` 这类**不可用数值表达**的东西。
 * `parseRewardText` 是严格格式的、格式不符即抛错, 因此必须有一条**明确可识别**的合法形态,
 * 否则玩家一完成晋升支线, 整次结算就会被抛错挡下。
 *
 * 放这里而不是 `dungeonRules.ts`: 它是奖励文本格式的一半, 另一半 `composeRewardText` 就在本文件;
 * 且这样 `settlementRules.ts` 不必反向依赖 `dungeonRules.ts`。
 */
export const 晋升奖励前缀 = '【晋升试炼】';

/** 拼装奖励文本。物品名为空时省略物品段。RP 为 0 时省略 RP 段 */
export function composeRewardText(r: RewardRoll, 物品名: string): string {
  const parts = [`${r.up} UP`, `${r.exp} EXP`];
  if (r.rp > 0) parts.push(`${r.rp} RP`);
  if (物品名) parts.push(`【${r.quality}】${r.itemType}：${物品名}`);
  return parts.join(' + ');
}
