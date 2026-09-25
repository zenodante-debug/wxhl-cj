// ================================================================
// 副本生成 · EJS 动态事件控制器渲染
//
// 纯函数, 零酒馆依赖 —— `evalTemplate` / `prepareContext` 以参数注入
// （照 settlementRules.ts 注入 `掷` 的先例）, 因此不装插件也能单测。
// 酒馆接口只在 store.ts 出现。
// ================================================================

export interface WorldbookEntry {
  名称: string;
  正文: string;
}

export interface EventSection {
  /** 要拼进 prompt 的正文；空串 = 不注入 */
  段落: string;
  /** 本次判发生效的 事件_* 条目名（去重、保序） */
  触发: string[];
  /** 控制器引用了、但条目表里找不到的名字 */
  缺失: string[];
  /** 非空 = 整节被跳过，附原因（供界面提示）。「渲染成功但没事件」**不算跳过** */
  跳过原因?: string;
}

/** 事件条目的名前缀（实测用户卡上 18 条事件全用它） */
const 事件前缀 = '事件_';

/**
 * 找出「控制器」条目。
 *
 * 判据取**并集**（满足其一即可）:
 * - 名字以 `EJS/` 开头 —— 用户卡上的命名约定（`EJS/主线事件控制器`）;
 * - 正文同时含 `<%` 与 `getwi(` —— 该插件控制器的最小特征。
 *
 * 并集是为了以后加了第二条控制器也不会漏；实测两种判据都命中同一条。
 */
export function findControllers(条目表: WorldbookEntry[]): WorldbookEntry[] {
  return 条目表.filter(e => {
    if (e.名称.startsWith('EJS/')) return true;
    return e.正文.includes('<%') && e.正文.includes('getwi(');
  });
}

/** 段落的开头（含三条死命令）—— 逐字照 spec §五.2 */
const 段落头 = [
  '============ 本次副本的动态事件（回廊已判定生效 · 最高优先级） ============',
  '以下事件由回廊的事件控制器按你当前的赛季 / 周期 / 阶位 / 所处世界判定为【本次副本生效】。',
  '它们不是建议，是本次副本**必然牵涉**的剧情；主线任务、世界事件、支线任务必须与之相称。',
  '',
].join('\n');

const 段落尾 = [
  '',
  '【三条死命令】',
  '1. 这些事件的优先级**高于上文所有锁定骰值与自选指定**。若某个事件强制要求某个字段',
  '   （副本类型、世界观、主线任务、支线任务、副本内容），**以事件为准**，不要因为与骰值冲突就改掉事件。',
  '2. 上面**未列出**的动态事件，本次【一律不生效】—— 严禁把它们的剧情、人物、势力写进副本。',
  '3. 上面**已列出**的事件若点名了具体契约者，**「其他契约者」完全由事件接管**：',
  '   点名的人必须**全部在场、不多不少**；此时**不要**再从后文「匹配参考」抽榜单，',
  '   也**不要**再加同人契约者。事件写明了人数就以它为准',
  '   （如「整个副本仅有他们三名契约者」⇒ 恰好 3 名）。',
  '',
].join('\n');

// ⚠️ 上面这段里**没有、也绝不允许有**「多条事件矛盾怎么办」的条款。
// spec §五.2 明确写了「刻意不加的一条」: 事件互相矛盾时由 AI 自行圆场, **系统不做裁决**
// （用户 2026-09-25 拍板）。后来者不要"好心"补一句「以更具体者为准」之类的规则 —— 那会推翻这个决定。

/**
 * 超时哨兵 —— 把「超时」与「真失败」分开。
 *
 * 若共用一条 `catch` 并统一加前缀, 超时会被渲染成「控制器渲染失败: 控制器渲染超时」,
 * 而 spec §八 把两者列为**两条不同文案**（超时就是「控制器渲染超时」, 不带前缀）。
 *
 * 用标记属性而不是 `instanceof 子类`: 跨 realm / 打包后子类判定不稳, 而标记一定在。
 */
function 超时错误(): Error {
  const e: any = new Error('控制器渲染超时');
  e.是超时 = true;
  return e;
}

/** 给 promise 套上超时。无论谁先结束都清掉定时器; 超时用带标记的错误 */
function 带超时<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((res, rej) => {
    const t = setTimeout(() => rej(超时错误()), ms);
    p.then(
      v => { clearTimeout(t); res(v); },
      e => { clearTimeout(t); rej(e); },
    );
  });
}

/** 超时走它自己的文案, 其余走调用方给的文案 */
function 跳过原因文案(e: any, 非超时: string): string {
  return e?.是超时 ? '控制器渲染超时' : 非超时;
}

/**
 * 渲染控制器 → 取出生效的 `事件_*` 条目 → 拼成 prompt 段落。
 *
 * **任何失败都降级为「跳过」，绝不抛**：副本生成不该因为一个渲染故障整次白跑。
 */
export async function buildEventSection(args: {
  条目表: WorldbookEntry[];
  evalTemplate: (code: string, ctx: Record<string, unknown>) => Promise<string>;
  prepareContext: () => Promise<Record<string, unknown>>;
  超时毫秒?: number;
}): Promise<EventSection> {
  const 空: EventSection = { 段落: '', 触发: [], 缺失: [] };
  const 控制器 = findControllers(args.条目表);
  if (控制器.length === 0) {
    return { ...空, 跳过原因: '世界书里没有 EJS 控制器条目' };
  }

  const 表 = new Map(args.条目表.map(e => [e.名称, e.正文]));
  const 触发: string[] = [];
  const 缺失: string[] = [];
  // 只读顶替插件的 getwi: 探针实测能顶掉（三次 run 的 shim 全为 true）。
  // 顶掉的意义有二 —— 不产生插件的副作用, 且我们能拿到**触发了哪些条目名**的精确清单。
  const 只读Getwi = async (名: string): Promise<string> => {
    触发.push(名);
    const 正文 = 表.get(名);
    if (正文 === undefined) {
      缺失.push(名);
      return '';
    }
    return 正文;
  };

  const 超时 = args.超时毫秒 ?? 5000;

  // `prepareContext()` **也必须在超时内** —— 修复前它是全模块唯一一条不在超时里的失败路径,
  // 一旦挂住: `generate()` 永不返回 → `generating` 永为 true → UI 永远显示「生成中...」
  // 且**没有任何提示** —— 正是 spec §八 最想避免的那种表现（看起来还在转）。
  let ctx: Record<string, unknown>;
  try {
    ctx = await 带超时(args.prepareContext(), 超时);
  } catch (e: any) {
    return { ...空, 跳过原因: 跳过原因文案(e, '插件环境初始化失败: ' + (e?.message ?? e)) };
  }

  try {
    await 带超时(
      Promise.all(
        控制器.map(c =>
          // currentWorld 强制成「副本」: 控制器第一行是
          // `if (typeof currentWorld === 'undefined') var currentWorld = getvar(...)`,
          // 因此在执行环境里**预置**这个键即可让守卫短路（探针实测有效）。
          args.evalTemplate(c.正文, { ...ctx, currentWorld: '副本', getwi: 只读Getwi }),
        ),
      ),
      超时,
    );
  } catch (e: any) {
    return { ...空, 缺失, 跳过原因: 跳过原因文案(e, '控制器渲染失败: ' + (e?.message ?? e)) };
  }

  // 只留事件条目、去重保序。
  //
  // ⚠️ 控制器在 currentWorld === '副本' 时还会 getwi 四条**规则**条目
  // （副本任务规范 / 敌人模板设计 / 副本任务变种 / 副本角色生成规则）—— 这里**刻意全部丢弃**,
  // 只取 `事件_`。别以为「控制器只吐事件」: 三条规则仓库里没有, 且世界书的「敌人模板设计」
  // 与仓库内联的「敌人模版设计」用字不同, 一起喂会给 AI 互相矛盾的规则（spec §八.1,
  // 用户 2026-09-25 拍板「先只喂事件」）。丢掉正是本函数只读 getwi 的第二重意义。
  //
  // 还要求 `表.has(n)`: 控制器引用了**不存在的条目**时 getwi 只能返回空串,
  // 那种名字属于「引用悬空」(已记进 `缺失`), 不能算作本次判发生效的事件 ——
  // 否则会拼出一个只有 【名字】 而正文空白的段落, 还假装事件生效了。
  const 触发事件 = [...new Set(触发)].filter(n => n.startsWith(事件前缀) && 表.has(n));
  const 缺失事件 = [...new Set(缺失)];
  if (触发事件.length === 0) {
    return { 段落: '', 触发: [], 缺失: 缺失事件 };
  }

  const 正文段 = 触发事件
    .map(名 => `【${名}】\n${表.get(名) ?? ''}`)
    .join('\n\n');
  return { 段落: 段落头 + 正文段 + 段落尾, 触发: 触发事件, 缺失: 缺失事件 };
}
