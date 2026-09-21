// src/wxhl-003/crafting/store.ts
// ================================================================
// 工坊 store：MVU 读写严格照 market/store.ts writeToSave 模式
// （楼层探测 → _.set → replaceMvuData → 回读校验）
// 材料档案持久化到小手机聊天变量（键 wxhl003_crafting），主卡 schema 零改动
// ================================================================
import { rollDie, 归一位阶 } from '../dice';
import type { MarketItemSnapshot } from '../market/priceTable';
import { bagAdd, bagRemove, type Bag } from '../market/settle';
import {
  autoPick, executeCraft, validateCraft, type CraftInput, type CraftOutcome,
} from './craft';
import {
  STANDARD_GOODS_RECIPES, TEMPLATE_RECIPES,
  type MaterialCategory, type 材料档案条目, type 配方,
} from './recipes';
import type { Attr } from './equipTables';
import { 启发式归类 } from './recipes';

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

function loadCodex(): Record<string, 材料档案条目> {
  try {
    const vars = getVariables({ type: 'chat' }) as any;
    return vars?.[CHAT_KEY]?.材料档案 ?? {};
  } catch (_) {
    return {};
  }
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
  const codex = ref<Record<string, 材料档案条目>>(loadCodex());
  const playerName = ref('无名契约者');
  const playerTier = ref('一阶');
  const playerUP = ref(0);
  const bag = ref<Bag>({});
  const lastOutcome = ref<CraftOutcome | null>(null);
  const lastError = ref('');

  const allRecipes = computed<配方[]>(() => [...TEMPLATE_RECIPES, ...STANDARD_GOODS_RECIPES]);

  // 材料档案变更 → 读-并-写聊天变量（不覆盖其他 key）
  watchEffect(() => {
    try {
      const vars = (getVariables({ type: 'chat' }) ?? {}) as any;
      replaceVariables({ ...vars, [CHAT_KEY]: { 材料档案: klona(codex.value) } }, { type: 'chat' });
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
      设施: facilityInfo(), 制作者,
    };

    const errs = validateCraft(input, bag.value);
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

  return {
    codex, playerName, playerTier, playerUP, bag, lastOutcome, lastError,
    allRecipes, syncFromMvu, facilityInfo, matchMaterials, setCodex, doCraft,
  };
});
