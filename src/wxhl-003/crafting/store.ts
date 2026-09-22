// src/wxhl-003/crafting/store.ts
// ================================================================
// 工坊 store：MVU 读写严格照 market/store.ts writeToSave 模式
// （楼层探测 → _.set → replaceMvuData → 回读校验）
// 材料档案 + 配方库持久化到小手机聊天变量（键 wxhl003_crafting，读-并-写保留同键其他字段），
// 主卡 schema 零改动：只写 契约者.背包 与 契约者.经济.UP
// ================================================================
import { rollDie, 归一位阶 } from '../dice';
import type { MarketItemSnapshot } from '../market/priceTable';
import { bagAdd, bagRemove, spendUP, type Bag } from '../market/settle';
import {
  autoPick, executeCraft, validateCraft, type CraftInput, type CraftOutcome,
} from './craft';
import {
  STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES, blueprintItemName, 道具基准价,
  type MaterialCategory, type 材料档案条目, type 配方, type 配方库, type 图纸数据,
} from './recipes';
import { ARMOR_NAME, WEAPON_TABLE, armorStats, attrBonus, weaponStats, type ArmorSpectrum, type Attr } from './equipTables';
import { 启发式归类 } from './recipes';
import {
  blueprintPrice, collectBlueprints, readBlueprint, uploadBlueprint, writeBlueprint,
} from './blueprint';
import { completeBlueprint, generateBlueprint, type DesignTarget } from './blueprintAI';
import { resolveSkill } from './skillMatch';

const CHAT_KEY = 'wxhl003_crafting';

function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

function readContractor(): { mvu: any; c: any; mid: number | 'latest' } | null {
  try {
    const mid = messageId();
    const mvu = Mvu.getMvuData({ type: 'message', message_id: mid });
    const c = _.get(mvu, ['stat_data', '契约者']);
    return c ? { mvu, c, mid } : null;
  } catch (_) {
    return null;
  }
}

async function commit(mvu: any, mid: number | 'latest', checks: [string[], unknown][]): Promise<void> {
  await Mvu.replaceMvuData(mvu, { type: 'message', message_id: mid });
  const after = Mvu.getMvuData({ type: 'message', message_id: mid });
  for (const [path, expectVal] of checks) {
    const got = _.get(after, path);
    if (expectVal === undefined ? got !== undefined : !_.isEqual(got, expectVal)) {
      toastr.warning('变量已写入但回读核对不上: ' + path.join('.'));
    }
  }
}

/** 聊天变量读取：同时取出材料档案与配方库（键不存在时各自兜底空表） */
function loadChatState(): { 材料档案: Record<string, 材料档案条目>; 配方库: 配方库 } {
  try {
    const vars = getVariables({ type: 'chat' }) as any;
    const s = vars?.[CHAT_KEY] ?? {};
    return { 材料档案: s.材料档案 ?? {}, 配方库: s.配方库 ?? {} };
  } catch (_) {
    return { 材料档案: {}, 配方库: {} };
  }
}

/** 行业技能映射（聊天变量 `wxhl003_crafting.行业技能映射`，缺省 `{}`）：行业名 → 该行业可替代的技能名列表。
 *  喂给 `resolveSkill` 的第一级回退 —— 「铸造」算不算「锻造」这种无字面关系，只能靠玩家自己登记。
 *  永远现读、不进 store state：本任务**只读**（UI 编辑入口留待后续），也就没有"忘了响应式"的问题；
 *  坏形状（非对象/键值非数组）一律当空表，由 resolveSkill 逐级降级，绝不让变量编辑器手滑炸掉开工。 */
function readSkillMap(): Record<string, string[]> {
  try {
    const vars = getVariables({ type: 'chat' }) as any;
    const m = vars?.[CHAT_KEY]?.行业技能映射;
    return m && typeof m === 'object' ? m : {};
  } catch (_) {
    return {};
  }
}

/** 图纸效果逐条摘要（确认弹窗与图纸物品「描述」共用；数值 0 视为无该效果故省略） */
function 效果行(数据: 图纸数据): string[] {
  return 数据.配方.效果.map(e => {
    const 数值 = [
      e.命中闪避 ? `命中/闪避 ${e.命中闪避 > 0 ? '+' : ''}${e.命中闪避}%` : '',
      e.伤害百分比 ? `伤害 ${e.伤害百分比 > 0 ? '+' : ''}${e.伤害百分比}%` : '',
      e.属性加成 ? `属性 ${e.属性加成 > 0 ? '+' : ''}${e.属性加成}` : '',
    ].filter(Boolean).join('，');
    const 条件 = e.触发条件 ? `（${e.触发条件}${e.消耗 ? `｜消耗：${e.消耗}` : ''}）` : '';
    return `【${e.类型}】${e.描述}${数值 ? `（${数值}）` : ''}${条件}`;
  });
}

/** 成功档波动说明（与 CraftingView 的 `波动说明` 逐字同一句）：本行显示的是**基准值**，
 *  而防具的装备防御/闪避、饰品的主/副属性加成、恢复类道具的恢复量在「成功」档会被 `fluctuate`
 *  压到基准的 80%~100%（精制/杰作取基准）。不说清，玩家会拿基准值当保底而觉得被坑。 */
const 波动说明 = '（成功档 80%~100% 波动）';

/** 数值来源一行（v2.1）：v2.1 把「名字」与「数值」分了家——种类名是自由文本、AI 自创（「浮游炮」），
 *  真正的数值来自 参照模板 / 结构化字段。玩家若在**付费那一刻**看不到这一行，就只能对着自创名猜强度。
 *  数值一律从 equipTables 的**实际表**取（weaponStats/armorStats/attrBonus），绝不硬编码字符串——
 *  表一改，硬编码的文案就开始骗人。文案与 CraftingView 的「数值来源文本」逐字对齐，制作页与确认框同口径。
 *  本函数是**展示路径**：非法阶位/模板（AI·GM 直写背包的坏图纸）一律不抛错，只回落成不带数值的写法。
 *
 *  `波动说明` 只挂在**行内真有波动项**的那几行，且紧跟会波动的那几项之后（不是行尾）：
 *    - 防具：防御/闪避波动，负重**不**波动 → 夹在两者之间，免得读成负重也在波动
 *    - 饰品：主/副属性加成波动（行内没有别的数字）
 *    - 恢复HP/恢复MP 道具：固定值当**基准恢复量**过 fluctuate；爆炸物的固定值是**附加固定伤害**
 *      （不进 fluctuate），弹药/餐食/状态/陷阱/其他连数值口径都只是标签
 *    - 武器：伤害骰/倍率/负重都不波动（行内也没列属性加成）→ 一个字都不加
 *  无差别挂上去就是一句新的谎话，故按事实逐行收窄。 */
function 数值来源行(r: 配方): string {
  if (r.成品类型 === '道具') {
    const 波动 = r.道具类型 === '恢复HP' || r.道具类型 === '恢复MP' ? 波动说明 : '';
    return `道具数值：${r.道具类型}${r.道具固定值 ? ` · 固定值 ${r.道具固定值}${波动}` : ''}（吃 ${r.关联属性} 修正）`;
  }
  try {
    if (r.装备子类 === '饰品') {
      const b = attrBonus('饰品', r.阶位, r.品质);
      return `饰品数值：主属性加成 +${b.主} / 副属性 +${b.副}${波动说明}（无伤害骰/防御/负重）`;
    }
    if (!r.参照模板) return '未指定数值参照——补全或制作前请先选一个';
    if (r.装备子类 === '武器') {
      const w = weaponStats(r.参照模板, r.阶位, r.品质);
      return `数值参照【${r.参照模板}】→ 伤害骰 ${w.伤害骰} / 倍率 ${w.倍率} / 负重 ${w.负重}kg`;
    }
    const a = armorStats(r.参照模板 as ArmorSpectrum, r.阶位, r.品质);
    return `数值参照【${r.参照模板}】→ 装备防御 ${a.装备防御} / 闪避 ${a.装备闪避}${波动说明} / 负重 ${a.负重}kg`;
  } catch (_) {
    return r.装备子类 === '饰品' ? '饰品数值：只加主/副属性加成' : `数值参照【${r.参照模板}】`;
  }
}

/** 图纸可读摘要：AI 风味文案 + 机械要点（确认弹窗与图纸物品「描述」共用） */
function 图纸摘要(数据: 图纸数据): string {
  const r = 数据.配方;
  // 种类名与数值来源是**两个字段**（v2.1）：前者标「种类：」、后者另起一段，免得玩家把自创名当数值来源
  const 类型 = r.成品类型 === '装备'
    ? `装备·${r.装备子类}${r.装备基础 ? `（种类：${r.装备基础}）` : ''}`
    : '道具';
  const 材料 = r.材料.map(m => `${m.核心 ? '★' : ''}${m.类别}×${m.数量}`).join('、');
  return [
    r.描述,
    `${r.品质}·${r.阶位}阶 ${类型} ｜ ${数值来源行(r)}`,
    `材料：${材料}`,
    ...效果行(数据).map(l => `效果：${l}`),
  ].filter(Boolean).join('\n');
}

/**
 * 核心需求 → 玩家选定材料的映射（v2.1 多核心）。
 *
 * 每件选中的材料按 `codexOf` 的类别认领配方里一条 `核心: true` 且类别相同的需求，扣**该需求**的数量
 * （同类别多选时按顺序分配）——配方「金属×2 + 怪物素材×1」就扣 精铁×2、狼牙×1，而不是两样都扣 2。
 * 合同性与覆盖性都在这里收口，任何一条满足不了都只返回理由（不抛错，由调用方 toastr + lastError）：
 *   - 覆盖性（先查）：核心需求有 N 条，就必须条条有材料认领——少选的会被点名
 *   - 合同性（后查）：选中材料对不上任何核心需求 → 拒（多余材料不许混进来白扣）
 * 配方给的「任意」当兜底通配：类别先精确匹配、都匹配不上才交给它——AI 偶尔会在核心材料上填「任意」，
 * 不兜底的话那张图纸永远做不出来（没有任何物品的类别叫「任意」）。
 */
function 分配核心材料(
  需求列表: 配方['材料'],
  选中: string[],
  查类别: (物品名: string) => MaterialCategory | '未分类',
  批量: number,
): { ok: true; 材料: { 物品名: string; 数量: number }[] } | { ok: false; 理由: string } {
  const 待配 = [...需求列表];
  const 材料: { 物品名: string; 数量: number }[] = [];
  const 多余: string[] = [];
  for (const 物品名 of 选中) {
    const 类别 = 查类别(物品名);
    let i = 待配.findIndex(req => req.类别 === 类别);
    if (i === -1) i = 待配.findIndex(req => req.类别 === '任意');
    if (i === -1) {
      多余.push(`「${物品名}」（类别 ${类别}）`);
      continue;
    }
    材料.push({ 物品名, 数量: 待配.splice(i, 1)[0].数量 * 批量 });
  }
  // 先报「需求没着落」（漏选），再报「材料多余」（多选）：漏选是玩家更可能犯的错，且理由里点名的是
  // 配方要求的那门类别，比反过来说「你选的某某对不上」更贴近玩家要补的东西
  if (待配.length > 0) {
    return { ok: false, 理由: `核心需求「${待配.map(r => r.类别).join('/')}」没有对应材料，请选择该类别的一件` };
  }
  if (多余.length > 0) {
    return {
      ok: false,
      理由: 需求列表.length === 0
        ? `该配方不需要核心材料，核心材料${多余.join('、')}不能混进来`
        : `核心材料${多余.join('、')}对不上本配方的核心需求（需 ${需求列表.map(r => r.类别).join('/')}）`,
    };
  }
  return { ok: true, 材料 };
}

/**
 * 制作者组装（纯函数导出，便于回归测试）。
 * 注意：归一位阶 返回 0 基下标（一阶→0），仓库惯例是 `n + 1` 转回 1 基
 * （见 settlementRules.ts 阶数）；认不出来时兜底为一阶（与「未知当一阶」一致）。
 *
 * `行业` 对应的技能由 `resolveSkill` 四级回退解析（映射表/精确名/模糊名/效果文本），
 * 而**不再**是 `c.通用技能[行业]` 精确查表：技能叫「锻造术」的玩家以前会被判「未掌握生活技能」。
 * 映射表是 I/O（聊天变量），故由调用方读出后喂进来 —— 本函数保持纯函数、可单测。
 */
export function assembleMaker(
  c: any,
  行业: string,
  映射表?: Record<string, string[]>,
): CraftInput['制作者'] {
  const sk = resolveSkill(c?.通用技能 ?? {}, 行业, 映射表)?.技能;
  return {
    姓名: String(c.头部?.姓名 ?? '无名契约者'),
    阶位上限: (归一位阶(c.头部?.阶位 ?? '一阶') ?? 0) + 1,
    基础属性: {
      STR: Number(c.属性?.基础?.STR ?? 5), AGI: Number(c.属性?.基础?.AGI ?? 5),
      CON: Number(c.属性?.基础?.CON ?? 5), PER: Number(c.属性?.基础?.PER ?? 5),
    },
    属性修正值: {
      STR: Number(c.属性?.属性修正值?.STR ?? 0), AGI: Number(c.属性?.属性修正值?.AGI ?? 0),
      CON: Number(c.属性?.属性修正值?.CON ?? 0), PER: Number(c.属性?.属性修正值?.PER ?? 0),
    },
    技能: sk
      ? { 分类: String(sk.分类 ?? '基础'), 阶位: (归一位阶(sk.阶位) ?? 0) + 1, 等级: Number(sk.等级 ?? 1) }
      : undefined,
    职业名: String(c.职业?.名称 ?? '无'),
  };
}

/** 当前存档的制作者组成（按行业取该行业的生活技能）。
 *  供 UI 在开工前算「检定值上限 = 20 + 行业对应基础属性 + 技能等级」并与 DC 对比（executeCraft 同式，d20 取满值）。
 *  与 facilityInfo 同形：直接读 MVU、非响应式，调用点放在 computed 里。
 *  读不到存档返回 null（与 assembleMaker 的纯函数契约分开——这一层才是 I/O）。
 *  技能映射表也在这里读（同为 I/O）：UI 的「检定值上限」与 doCraft 必须看到同一套技能，否则提示与实测会对不上。 */
export function makerFor(行业: string): CraftInput['制作者'] | null {
  const r = readContractor();
  return r ? assembleMaker(r.c, 行业, readSkillMap()) : null;
}

export const useCraftingStore = defineStore('wxhl003-crafting', () => {
  const chatState = loadChatState();
  const codex = ref<Record<string, 材料档案条目>>(chatState.材料档案);
  /** 已上传学习的配方库（键 = 配方名）；持久化到聊天变量，与内置配方合并后供 UI 展示 */
  const 配方库 = ref<配方库>(chatState.配方库);
  const playerName = ref('无名契约者');
  const playerTier = ref('一阶');
  const playerUP = ref(0);
  const bag = ref<Bag>({});
  const lastOutcome = ref<CraftOutcome | null>(null);
  const lastError = ref('');
  const designing = ref(false);
  const completing = ref(false);
  const uploading = ref(false);

  const allRecipes = computed<配方[]>(() => [
    ...TEMPLATE_RECIPES, ...STANDARD_GOODS_RECIPES, ...Object.values(配方库.value),
  ]);

  /** 背包里未上传的图纸（Task 7 的「背包图纸」区消费） */
  const 背包图纸 = computed(() => collectBlueprints(bag.value));

  /** 同名图纸/配方查重：命中返回给玩家看的理由，无命中返回 null（调用方负责 toastr + lastError）。
   *  查的是「实际会写进背包的图纸物品名」——AI 可能自行改成品名，故拿到生成结果的 r.名称 之后要再查一次。
   *  用 hasOwn：图纸名由 AI 生成，`constructor`/`toString` 之类会让真值判定误报。 */
  function 同名理由(名称: string, 背包: Bag): string | null {
    if (Object.hasOwn(配方库.value, 名称)) return `已掌握该配方「${名称}」，不能重复购买`;
    const 物品名 = blueprintItemName(名称);
    if (Object.hasOwn(背包, 物品名)) return `背包里已有一张同名图纸「${物品名}」，不能重复购买`;
    return null;
  }

  // 材料档案/配方库变更 → 读-并-写聊天变量（保留同键其他字段，也不动其他顶层变量）
  watchEffect(() => {
    try {
      const vars = (getVariables({ type: 'chat' }) ?? {}) as any;
      replaceVariables(
        { ...vars, [CHAT_KEY]: { ...(vars?.[CHAT_KEY] ?? {}), 材料档案: klona(codex.value), 配方库: klona(配方库.value) } },
        { type: 'chat' },
      );
    } catch (_) {}
  });

  function syncFromMvu(): boolean {
    const r = readContractor();
    if (!r) {
      lastError.value = '读不到存档变量（契约者不存在）';
      return false;
    }
    playerName.value = String(r.c.头部?.姓名 ?? '无名契约者');
    playerTier.value = String(r.c.头部?.阶位 ?? '一阶');
    playerUP.value = Number(r.c.经济?.UP ?? 0);
    bag.value = (r.c.背包 ?? {}) as Bag;
    lastError.value = '';
    return true;
  }

  /** 设施判定：回廊主城/店铺工作台 vs 野外简陋 */
  function facilityInfo(): { 修正: number; 仅白色: boolean; 标签: string } {
    const r = readContractor();
    const world = String(r?.c?.当前世界 ?? '');
    if (world === '回廊') {
      const list = Object.values(r?.c?.个人产业?.当前店铺?.设施清单 ?? {}).join(' ');
      if (list.includes('顶级全套工坊')) return { 修正: -3, 仅白色: false, 标签: '店铺·顶级全套工坊' };
      if (list.includes('中级工作台')) return { 修正: -1, 仅白色: false, 标签: '店铺·中级工作台' };
      return { 修正: 0, 仅白色: false, 标签: '回廊主城设施' };
    }
    return { 修正: 3, 仅白色: true, 标签: '野外简陋环境' };
  }

  /** 材料档案：未归档物品按启发式自动归档 */
  function codexOf(name: string): 材料档案条目 {
    if (!codex.value[name]) {
      codex.value[name] = { 类别: 启发式归类(name), 品质: '白色', 阶位: 1 };
    }
    return codex.value[name];
  }

  function matchMaterials(类别: MaterialCategory): string[] {
    return Object.keys(bag.value).filter(n => 类别 === '任意' || codexOf(n).类别 === 类别);
  }

  function setCodex(name: string, patch: Partial<材料档案条目>): void {
    codex.value[name] = { ...codexOf(name), ...patch };
  }

  async function doCraft(args: {
    配方: 配方;
    阶位: number;
    子类型: string;
    副属性: Attr;
    数量: number;
    /** 玩家选定的核心材料物品名（v2.1：配方可要求多种核心材料，故为多件） */
    核心材料名: string[];
    越阶材料: boolean;
    劣质材料: boolean;
  }): Promise<CraftOutcome | null> {
    if (!syncFromMvu()) return null;
    const r = readContractor();
    if (!r) return null;
    const c = r.c;

    // 技能映射表与 makerFor 同源（都现读聊天变量）：UI 的「检定值上限」与实际开工必须用同一条技能，
    // 否则会出现「提示够得着、开工却报未掌握」（或反过来）
    const 制作者 = assembleMaker(c, args.配方.行业, readSkillMap());

    // 核心材料 = 玩家选定的多件，按类别映射到配方的核心需求（v2.1 多核心，见 分配核心材料）；
    // 辅料 = autoPick 自动拣选（排除核心物品）
    const 核心需求列表 = args.配方.材料.filter(m => m.核心);
    // 配方要核心材料却没选：单件时代靠「物品名='' → 数量不足」隐式拦住，多选下空列表不进
    // validateCraft 的数量核对（会放行一次不耗核心材料的制作），故显式拦一道
    if (核心需求列表.length > 0 && args.核心材料名.length === 0) {
      const msg = '请先选择核心材料';
      toastr.error(msg);
      lastError.value = msg;
      return null;
    }
    const 分配 = 分配核心材料(核心需求列表, args.核心材料名, n => codexOf(n).类别, args.数量);
    if (!分配.ok) {
      toastr.error(分配.理由);
      lastError.value = 分配.理由;
      return null;
    }
    const 核心材料 = 分配.材料;
    const 辅料: { 物品名: string; 数量: number }[] = [];
    for (const req of args.配方.材料.filter(m => !m.核心)) {
      const picks = autoPick(bag.value, codex.value, req.类别, req.数量 * args.数量, args.核心材料名);
      if (!picks) {
        const msg = `辅料不足：需要 ${req.类别}×${req.数量 * args.数量}`;
        toastr.error(msg);
        lastError.value = msg;
        return null;
      }
      辅料.push(...picks);
    }

    const input: CraftInput = {
      配方: args.配方, 阶位: args.阶位, 子类型: args.子类型, 副属性: args.副属性,
      数量: args.数量, 核心材料, 辅料,
      缺图纸: false, 越阶材料: args.越阶材料, 劣质材料: args.劣质材料,
      // 配方库只有在图纸「上传学习」后才进得来，故从配方库开单即为已掌握，恒 true；
      // 「缺图纸」降档路径留给 AI 直接塞进背包、玩家尚未上传的图纸（不阻断，走降档 + DC+5）
      图纸持有: true,
      设施: facilityInfo(), 制作者,
    };

    // 紫配方的高阶材料校验（spec §6.1）：核心材料档位取**玩家实际投入的几件里最高的一件**
    // （v2.1 多核心：只要有一件够阶即满足）。一件没选时不给值，validateCraft 对紫配方 fail-closed；
    // 未归档材料由 codexOf 启发式归档为 1 阶 → 白材料做紫装会被 validateCraft 拦下
    const 核心档位 = args.核心材料名.length
      ? Math.max(...args.核心材料名.map(n => Number(codexOf(n).阶位)))
      : undefined;
    const errs = validateCraft(input, bag.value, 核心档位);
    if (errs.length > 0) {
      toastr.error(errs[0]);
      lastError.value = errs[0];
      return null;
    }

    const d20 = rollDie(20);
    const outcome = executeCraft(input, d20, Math.random);

    // 应用背包变动 + 炸炉扣血，一次性落档
    let newBag = klona(bag.value) as Bag;
    try {
      for (const d of outcome.扣减) newBag = bagRemove(newBag, d.物品名, d.数量);
      for (const it of outcome.新增) newBag = bagAdd(newBag, it as MarketItemSnapshot, Number(it.数量 ?? 1));
    } catch (e: any) {
      toastr.error('背包结算失败: ' + (e?.message ?? e));
      return null;
    }
    _.set(r.mvu, ['stat_data', '契约者', '背包'], newBag);
    const checks: [string[], unknown][] = [[['stat_data', '契约者', '背包'], newBag]];
    if (outcome.HP伤害 > 0) {
      const hp = Number(_.get(r.mvu, ['stat_data', '契约者', '衍生属性', 'HP_当前']) ?? 0);
      const newHp = Math.max(0, hp - outcome.HP伤害);
      _.set(r.mvu, ['stat_data', '契约者', '衍生属性', 'HP_当前'], newHp);
      checks.push([['stat_data', '契约者', '衍生属性', 'HP_当前'], newHp]);
    }
    await commit(r.mvu, r.mid, checks);

    lastOutcome.value = outcome;
    syncFromMvu();
    if (outcome.结果 === '大失败') toastr.error(`炸炉！材料全毁，受到 ${outcome.HP伤害} 点伤害`);
    else if (outcome.结果 === '失败') toastr.warning('制作失败，核心材料损毁一半');
    else toastr.success(`制作${outcome.结果}！`);
    return outcome;
  }

  // ---------------- 图纸（v2）：AI 定制 / 补全 / 上传学习 / 删除配方 ----------------

  /** AI 定制图纸：生成 → 标价 → 玩家确认 → 扣 UP → 图纸物品入包（一次 commit 写 背包 + 经济.UP）
   *  入参即 DesignTarget（成品类型/装备子类/种类/品质/阶位/核心材料[]/行业/设计要求/名称），
   *  原样透传给 generateBlueprint——提示词、留痕与硬校验都以它为准，store 这层不改写任何字段。 */
  async function designBlueprint(目标: DesignTarget): Promise<boolean> {
    if (designing.value) return false;
    // 早失败：先确认存档可读、顺手刷新 UP，再去烧 token
    if (!syncFromMvu()) return false;
    // 烧 token 前的早退只剩**同名**一道（配方库 + 背包两条路径）。v2 的「道具成品名必须在标准道具表内」
    // 白名单已删除：自定义道具正是 v2.1 的目的，而成品能否成立由 sanitizeDesign 按 道具类型 硬校验
    // （非法枚举一律拒，见 blueprintAI），这里再提前拦一道只会把 AI 自创名误杀。
    // 查的是**目标名**；AI 若自行改成品名，拿到生成结果后还会按最终名再收口一次（见下面 r.名称 处的复查）。
    const 早退 = 同名理由(目标.名称, bag.value);
    if (早退) {
      lastError.value = 早退;
      toastr.error(早退);
      return false;
    }
    designing.value = true;
    try {
      const gen = await generateBlueprint(目标);
      if (!gen.ok) {
        const msg = gen.reasons.join('；');
        lastError.value = msg;
        toastr.error(`图纸定制失败：${msg}`);
        return false;
      }
      const 数据 = gen.数据;
      const r = 数据.配方;

      // 定价：装备按成品一阶中值×2，道具按 `道具基准价(道具类型, 道具固定值)`×20，阶位系数由 blueprintPrice 内部乘。
      // 用 sanitizeDesign 收口后的 r（成品类型/装备子类/阶位/品质已归一到目标值，道具类型/固定值已钳制），
      // 免去手写映射。道具价**只认结构化字段**——v2 的按成品名查单价表已废除：自创道具名无从查表，
      // 且按名字定价会让「同数值不同名」的道具价差出十几倍（口径见 recipes.ts 的 道具基准价）。
      let 价: number;
      try {
        价 = blueprintPrice(
          r.成品类型, r.装备子类, r.阶位, r.品质,
          r.成品类型 === '道具' ? 道具基准价(r.道具类型, r.道具固定值) : undefined,
        );
      } catch (e: any) {
        const msg = `图纸定价失败：${e?.message ?? e}`;
        lastError.value = msg;
        toastr.error(msg);
        return false;
      }

      // AI 调用耗时数秒，期间市场可能改过同一楼层的存档（卖物写 背包 −物 / 经济.UP +货款）。
      // 故确认框余额、随后的扣款、以及背包写入基底一律取「确认前」的新读值——
      // 绝不能用 await 之前的 bag.value / playerUP.value，否则会把玩家这期间的卖出覆盖回去（凭空复制）。
      const rr = readContractor();
      if (!rr) {
        lastError.value = '读不到存档变量（契约者不存在）';
        toastr.error(lastError.value);
        return false;
      }
      const 当前UP = Number(rr.c.经济?.UP ?? 0);
      const 当前背包 = (rr.c.背包 ?? {}) as Bag;

      // 复查其二：同名图纸/配方（按最终名 + 新读的背包）。第二张既不能上传学习（「已掌握」会被拒），
      // 又占着背包与已付的 UP，故必须在 spendUP 之前拒掉——此处零变量变动，玩家只亏一次 AI 调用。
      const 重复 = 同名理由(r.名称, 当前背包);
      if (重复) {
        lastError.value = 重复;
        toastr.error(重复);
        return false;
      }

      const 摘要 = 图纸摘要(数据);
      const 钳制 = gen.clamped.length ? `\n\n【系统钳制】\n${gen.clamped.map(c => `· ${c}`).join('\n')}` : '';
      // 显示余额与扣款用同一个 当前UP（同一 tick 内无 await），玩家看到的就是实际扣的
      if (!window.confirm(
        `【AI 定制图纸】${r.名称}\n\n${摘要}\n\n定价：${价} UP（当前 ${当前UP} UP）${钳制}\n\n确认支付并生成图纸？`,
      )) return false; // 不付款零变量变动

      let 余UP: number;
      try {
        余UP = spendUP(当前UP, 价);
      } catch (e: any) {
        const msg = e?.message ?? 'UP 不足';
        lastError.value = msg;
        toastr.error(msg);
        return false;
      }

      // 图纸物品：描述 = AI 风味文案 + 机械要点；图纸数据 = 完整的图纸数据（上传学习时读它）
      const 物品名 = blueprintItemName(r.名称);
      const 物品 = {
        名称: 物品名, 描述: 摘要, 品质: r.品质, 阶位: `${r.阶位}阶`, 类型: '图纸', 图纸数据: klona(数据),
      };
      const 累加 = bagAdd(当前背包, 物品, 1);
      // 包里已有同名图纸时 bagAdd 只加数量、保留旧的图纸数据；本次是玩家刚花钱买下的结果，显式让它胜出
      const newBag = { ...累加, [物品名]: { ...累加[物品名], ...物品 } };
      _.set(rr.mvu, ['stat_data', '契约者', '背包'], newBag);
      _.set(rr.mvu, ['stat_data', '契约者', '经济', 'UP'], 余UP);
      await commit(rr.mvu, rr.mid, [
        [['stat_data', '契约者', '背包'], newBag],
        [['stat_data', '契约者', '经济', 'UP'], 余UP],
      ]);

      syncFromMvu();
      toastr.success(`已获得图纸「${物品名}」，花费 ${价} UP（上传学习后才进配方库）`);
      return true;
    } finally {
      designing.value = false;
    }
  }

  /** AI 补全残缺图纸：只填缺失/非法字段，回写背包物品（一次 commit 只写 背包） */
  async function completeBp(物品名: string): Promise<boolean> {
    if (completing.value) return false;
    // 先按存档刷新背包：图纸若已不在，下面直接报错，不必白烧一次 AI 调用
    if (!syncFromMvu()) return false;
    const 现有 = readBlueprint(bag.value, 物品名);
    if (!现有) {
      const msg = `「${物品名}」不是有效图纸或已不在背包`;
      lastError.value = msg;
      toastr.error(msg);
      return false;
    }
    completing.value = true;
    try {
      const res = await completeBlueprint(现有, 现有.配方.阶位);
      if (!res.ok) {
        const msg = res.reasons.join('；');
        lastError.value = msg;
        toastr.error(`图纸补全失败：${msg}`);
        return false;
      }
      const rr = readContractor();
      if (!rr) {
        lastError.value = '读不到存档变量（契约者不存在）';
        toastr.error(lastError.value);
        return false;
      }
      // 同 designBlueprint：AI 调用期间存档可能被市场改动，写入基底必须取新读的背包，
      // 不能用 await 之前的 bag.value（否则会把这期间玩家的卖出覆盖回去）
      const 当前背包 = (rr.c.背包 ?? {}) as Bag;
      if (!Object.hasOwn(当前背包, 物品名)) {
        const msg = `图纸「${物品名}」已不在背包（AI 调用期间被卖出或上传），补全结果作废`;
        lastError.value = msg;
        toastr.error(msg);
        return false;
      }
      const newBag = writeBlueprint(当前背包, 物品名, res.数据);
      _.set(rr.mvu, ['stat_data', '契约者', '背包'], newBag);
      await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '背包'], newBag]]);
      syncFromMvu();
      if (res.clamped.length) {
        toastr.warning(`已补全，但系统做了 ${res.clamped.length} 处钳制：\n${res.clamped.map(c => `· ${c}`).join('\n')}`);
      } else {
        toastr.success(`图纸「${物品名}」补全完成`);
      }
      return true;
    } finally {
      completing.value = false;
    }
  }

  /** 回写图纸的「参照模板」（武器类型键 / 防具光谱）：残缺图纸的 参照模板 为空时，
   *  completeBlueprint 会因其校验不过而拒绝，需要先补这一格——UI 不该自备 MVU 管道。
   *  边界不变量在边界上收口：该值会被 craft.ts 的 buildEquip 直接查表消费（按 装备子类 分支、
   *  按 参照模板 查 weaponStats/armorStats），故既要求它是真实表里的键，也要求它与该图纸的
   *  装备子类 同类——跨类的坏图纸会一路留到制作时才抛错。
   *  v2.1 改名：本动作写的是 参照模板（数值来源），旧名 setBpBase 写的是 装备基础——
   *  后者已退化为自由文本种类名（只参与显示/命名），UI 下拉与这里必须跟着切到 参照模板。 */
  async function setBpTemplate(物品名: string, 参照模板: string): Promise<boolean> {
    // 与 doCraft/designBlueprint/completeBp/uploadBp 一致：入口先按存档刷新，写入基底取新读值
    if (!syncFromMvu()) return false;
    const rr = readContractor();
    if (!rr) return false;
    const 当前背包 = (rr.c.背包 ?? {}) as Bag;
    const 数据 = readBlueprint(当前背包, 物品名);
    if (!数据) {
      const msg = `「${物品名}」不是有效图纸或已不在背包`;
      lastError.value = msg;
      toastr.error(msg);
      return false;
    }
    // 校验依赖图纸自身的 装备子类，故只能放在读出数据之后（错误信息也只列该子类对应的合法值）
    const 子类 = 数据.配方.装备子类;
    let 合法 = false;
    let 说明 = `该图纸的装备子类为「${子类 || '空'}」，无法指定参照模板（只有武器/防具图纸需要这一栏）`;
    if (子类 === '武器') {
      合法 = Object.hasOwn(WEAPON_TABLE, 参照模板);
      说明 = `该图纸是武器，参照模板须为武器类型（${Object.keys(WEAPON_TABLE).join('/')}）`;
    } else if (子类 === '防具') {
      合法 = Object.hasOwn(ARMOR_NAME, 参照模板);
      说明 = `该图纸是防具，参照模板须为光谱之一（${Object.keys(ARMOR_NAME).join('/')}）`;
    }
    if (!合法) {
      lastError.value = 说明;
      toastr.error(说明);
      return false;
    }
    const newBag = writeBlueprint(当前背包, 物品名, { ...数据, 配方: { ...数据.配方, 参照模板 } });
    // 只写 背包（不碰 UP）；一次 commit
    _.set(rr.mvu, ['stat_data', '契约者', '背包'], newBag);
    await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '背包'], newBag]]);
    syncFromMvu();
    toastr.success(`图纸「${物品名}」参照模板已设为「${参照模板}」`);
    return true;
  }

  /** 丢弃背包里的一张图纸物品（图纸转卖属 spec §5.2 的 v3 范围，市场不收；同名配方已掌握时也传不上去，
   *  没有这个出口玩家就只能让它永久占位）。丢弃整条物品：数量 >1 时一并丢，免得卡片留在原地像没生效。
   *  与 setBpTemplate 同形：入口 syncFromMvu → 新读背包为基底 → 一次 commit → syncFromMvu，只写 契约者.背包。
   *  入参仍按图纸收口（readBlueprint），不让这个动作变成通用的删物品后门。 */
  async function discardBp(物品名: string): Promise<boolean> {
    if (!syncFromMvu()) return false;
    const rr = readContractor();
    if (!rr) {
      lastError.value = '读不到存档变量（契约者不存在）';
      toastr.error(lastError.value);
      return false;
    }
    const 当前背包 = (rr.c.背包 ?? {}) as Bag;
    if (!readBlueprint(当前背包, 物品名)) {
      const msg = `「${物品名}」不是有效图纸或已不在背包`;
      lastError.value = msg;
      toastr.error(msg);
      return false;
    }
    // 「背包图纸」卡片只认 图纸数据、不要求 数量，故数量异常（缺字段/0/负数/非数）从 UI 可达
    // （数据只能来自 AI/GM 直接写背包）。必须在这里自己收口：bagRemove 对 NaN 既不抛错也不删除，
    // 会把「条目原地留存（数量: NaN）+ 弹出成功提示」演成假成功；数量 ≤ 0 也会被 bagRemove 静默删掉。
    const 数量 = Number((当前背包[物品名] as any)?.数量);
    if (!Number.isFinite(数量) || 数量 <= 0) {
      const msg = `图纸「${物品名}」的数量异常（变量里是 ${String((当前背包[物品名] as any)?.数量)}），无法丢弃——请先把「数量」改成正整数`;
      lastError.value = msg;
      toastr.error(msg);
      return false;
    }
    let newBag: Bag;
    try {
      newBag = bagRemove(当前背包, 物品名, 数量);
    } catch (e: any) {
      const msg = e?.message ?? '图纸数量不足';
      lastError.value = msg;
      toastr.error(msg);
      return false;
    }
    _.set(rr.mvu, ['stat_data', '契约者', '背包'], newBag);
    await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '背包'], newBag]]);
    syncFromMvu();
    toastr.success(`已丢弃图纸「${物品名}」`);
    return true;
  }

  /** 上传学习：图纸物品出包，配方登记进配方库（背包走一次 commit，配方库走聊天变量落盘） */
  async function uploadBp(物品名: string): Promise<boolean> {
    // 重入守卫：两次上传都在 await 之前读同一份 配方库.value，后完成的那次会用陈旧库覆盖，
    // 丢掉前一条配方——故与 designing/completing 同套守卫，在 await 前同步占位
    if (uploading.value) return false;
    // 与 designBlueprint/completeBp/doCraft 一致：入口先按存档刷新本地背包。
    // 本动作没有 AI 延迟，但「工坊↔市场」切换 app 是个更长的窗口——组件不卸载则 bag.value 永不刷新，
    // 用卖出前的旧背包当写入基底会把物品写回来而货款留着（凭空复制），且不会自愈。
    if (!syncFromMvu()) return false;
    const rr = readContractor();
    if (!rr) return false;
    const 当前背包 = (rr.c.背包 ?? {}) as Bag;
    const res = uploadBlueprint(当前背包, 物品名, 配方库.value);
    if ('error' in res) {
      lastError.value = res.error;
      toastr.error(res.error);
      return false;
    }
    uploading.value = true;
    try {
      // 只写 背包；配方库走 ref + watchEffect 落聊天变量，不碰 MVU
      _.set(rr.mvu, ['stat_data', '契约者', '背包'], res.bag as any);
      await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '背包'], res.bag]]);
      配方库.value = res.配方库;
      syncFromMvu();
      toastr.success(`已掌握配方「${Object.keys(res.配方库).slice(-1)[0]}」`);
      return true;
    } finally {
      uploading.value = false;
    }
  }

  /** 删除配方：只动配方库（watchEffect 自动落盘），不走 MVU 写入；图纸已在上传时消耗，不退回 */
  function deleteRecipe(名称: string): void {
    if (!Object.hasOwn(配方库.value, 名称)) return;
    if (!window.confirm(`确认删除配方「${名称}」？\n\n上传学习时图纸已被消耗，删除不会退回图纸；重新获得同一张图纸并上传才能恢复。`)) return;
    const next = { ...配方库.value };
    delete next[名称];
    配方库.value = next;
    toastr.success(`已删除配方「${名称}」`);
  }

  return {
    codex, 配方库, playerName, playerTier, playerUP, bag, lastOutcome, lastError, designing, completing, uploading,
    allRecipes, 背包图纸, syncFromMvu, facilityInfo, matchMaterials, setCodex, doCraft,
    designBlueprint, completeBp, setBpTemplate, discardBp, uploadBp, deleteRecipe,
  };
});
