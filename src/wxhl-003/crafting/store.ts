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
  STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES, blueprintItemName,
  type MaterialCategory, type 材料档案条目, type 配方, type 配方库, type 图纸数据,
} from './recipes';
import { ARMOR_NAME, WEAPON_TABLE, type Attr } from './equipTables';
import { 启发式归类 } from './recipes';
import {
  blueprintPrice, collectBlueprints, readBlueprint, uploadBlueprint, writeBlueprint,
} from './blueprint';
import { completeBlueprint, generateBlueprint, type DesignTarget } from './blueprintAI';

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

/** 道具一阶单价表（UP/件）：AI 定制「消耗品」图纸的定价基数
 *  （spec §7.1：道具图纸 = 成品一阶单价 × 20 × 阶位系数；×20 在 blueprint.ts 的 GOODS_MULT 里）。
 *  取值抄自设计文档 §2 世界书物价表；未列名的新奇消耗品走 DEFAULT 兜底（均为可调初值）。 */
const GOODS_UNIT_PRICE: Record<string, number> = {
  基础治疗药剂: 15, 强效治疗药剂: 40, 急救包: 80,
  基础精神药剂: 20, 强效精神药剂: 45, 冥想熏香: 70,
  净化药剂: 25, 万能解毒剂: 60, 兴奋剂: 35,
  普通弹药20发: 10, 穿甲弹药20发: 25, 元素弹药20发: 30,
};
/** 未列名消耗品的兜底一阶单价（≈ 世界书道具价中位，可调） */
const DEFAULT_GOODS_UNIT_PRICE = 25;

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

/** 图纸可读摘要：AI 风味文案 + 机械要点（确认弹窗与图纸物品「描述」共用） */
function 图纸摘要(数据: 图纸数据): string {
  const r = 数据.配方;
  const 类型 = r.成品类型 === '装备'
    ? `装备·${r.装备子类}${r.装备基础 ? `（${r.装备基础}）` : ''}`
    : '消耗品';
  const 材料 = r.材料.map(m => `${m.核心 ? '★' : ''}${m.类别}×${m.数量}`).join('、');
  return [
    r.描述,
    `${r.品质}·${r.阶位}阶 ${类型}`,
    `材料：${材料}`,
    ...效果行(数据).map(l => `效果：${l}`),
  ].filter(Boolean).join('\n');
}

/**
 * 制作者组装（纯函数导出，便于回归测试）。
 * 注意：归一位阶 返回 0 基下标（一阶→0），仓库惯例是 `n + 1` 转回 1 基
 * （见 settlementRules.ts 阶数）；认不出来时兜底为一阶（与「未知当一阶」一致）。
 */
export function assembleMaker(c: any, 行业: string): CraftInput['制作者'] {
  const sk = c.通用技能?.[行业];
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
    核心材料名: string;
    越阶材料: boolean;
    劣质材料: boolean;
  }): Promise<CraftOutcome | null> {
    if (!syncFromMvu()) return null;
    const r = readContractor();
    if (!r) return null;
    const c = r.c;

    const 制作者 = assembleMaker(c, args.配方.行业);

    // 核心材料 = 玩家选定；辅料 = autoPick 自动拣选（排除核心物品）
    const 核心需求 = args.配方.材料.find(m => m.核心);
    const 核心材料 = { 物品名: args.核心材料名, 数量: (核心需求?.数量 ?? 1) * args.数量 };
    const 辅料: { 物品名: string; 数量: number }[] = [];
    for (const req of args.配方.材料.filter(m => !m.核心)) {
      const picks = autoPick(bag.value, codex.value, req.类别, req.数量 * args.数量, [args.核心材料名]);
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

    // 紫配方的高阶材料校验（spec §6.1）：从材料档案查玩家实际投入的核心材料的阶位；
    // 未归档材料由 codexOf 启发式归档为 1 阶 → 白材料做紫装会被 validateCraft 拦下
    const errs = validateCraft(input, bag.value, codexOf(args.核心材料名).阶位);
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

  /** AI 定制图纸：生成 → 标价 → 玩家确认 → 扣 UP → 图纸物品入包（一次 commit 写 背包 + 经济.UP） */
  async function designBlueprint(目标: DesignTarget): Promise<boolean> {
    if (designing.value) return false;
    // 早失败：先确认存档可读、顺手刷新 UP，再去烧 token
    if (!syncFromMvu()) return false;
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

      // 定价：装备按成品一阶中值×2，消耗品按道具一阶单价×20，阶位系数由 blueprintPrice 内部乘
      // 用 sanitizeDesign 收口后的 r（成品类型/装备子类/阶位/品质已归一到目标值），免去手写映射；
      // 道具单价先按玩家点名的目标查表（AI 可能给配方改名），再退回收口后的成品名
      let 价: number;
      try {
        价 = blueprintPrice(
          r.成品类型, r.装备子类, r.阶位, r.品质,
          r.成品类型 === '消耗品'
            ? (GOODS_UNIT_PRICE[目标.名称] ?? GOODS_UNIT_PRICE[r.成品名] ?? DEFAULT_GOODS_UNIT_PRICE)
            : undefined,
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

  /** 回写图纸的「装备基础」（武器类型 / 防具光谱）：残缺图纸的 装备基础 为空时，
   *  completeBlueprint 会因装备基础校验不过而拒绝，需要先补这一格——UI 不该自备 MVU 管道。
   *  先验后写：该值会被 craft.ts 的 buildEquip 直接查表消费（weaponStats / armorStats），
   *  编造的值会产出坏成品，故只收 equipTables 真实表里的键。 */
  async function setBpBase(物品名: string, 装备基础: string): Promise<boolean> {
    // 纯入参校验放在最前：不合法时不必碰存档，存档读不到也照样能报出参数错
    if (!Object.hasOwn(WEAPON_TABLE, 装备基础) && !Object.hasOwn(ARMOR_NAME, 装备基础)) {
      const msg = `非法装备基础「${装备基础}」：武器须是 WEAPON_TABLE 的键（${Object.keys(WEAPON_TABLE).join('/')}），防具须是光谱之一（${Object.keys(ARMOR_NAME).join('/')}）`;
      lastError.value = msg;
      toastr.error(msg);
      return false;
    }
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
    const newBag = writeBlueprint(当前背包, 物品名, { ...数据, 配方: { ...数据.配方, 装备基础 } });
    // 只写 背包（不碰 UP）；一次 commit
    _.set(rr.mvu, ['stat_data', '契约者', '背包'], newBag);
    await commit(rr.mvu, rr.mid, [[['stat_data', '契约者', '背包'], newBag]]);
    syncFromMvu();
    toastr.success(`图纸「${物品名}」装备基础已设为「${装备基础}」`);
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
    designBlueprint, completeBp, setBpBase, uploadBp, deleteRecipe,
  };
});
