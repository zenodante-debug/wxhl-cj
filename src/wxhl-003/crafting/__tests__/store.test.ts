import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  BlueprintDataSchema, 配方Schema, blueprintItemName,
  type 图纸数据, type 道具类型,
} from '../recipes';
import type { Quality } from '../equipTables';
import type { DesignTarget } from '../blueprintAI';
import { assembleMaker, useCraftingStore } from '../store';

/** AI 调用一律换成假实现：既不出网，也能精确指定「AI 返回了什么」（改名等异常返回全靠它构造）。
 *  store 的其余依赖（MVU / 聊天变量 / toastr）是酒馆宿主注入的运行时全局，测试里在 beforeEach 搭最小实现。
 *  注：generateBlueprint 收的是 DesignTarget**本身**（store 只透传、不改写），下面的 C5 用例就钉这一点。 */
const { genMock } = vi.hoisted(() => ({ genMock: vi.fn() }));
vi.mock('../blueprintAI', () => ({
  generateBlueprint: genMock,
  completeBlueprint: vi.fn(),
}));

// 回归测试：归一位阶 返回 0 基下标（一阶→0），制作者阶位必须 +1 转回 1 基，
// 否则一阶契约者 阶位上限=0，validateCraft 会拦住一切制作。
describe('assembleMaker · 制作者组装（归一位阶 0基→1基 回归）', () => {
  const fake = (阶位: string, 技能阶位: string) => ({
    头部: { 姓名: '老狼', 阶位 },
    属性: {
      基础: { STR: 8, AGI: 6, CON: 6, PER: 7 },
      属性修正值: { STR: 0, AGI: 0, CON: 0, PER: 2 },
    },
    通用技能: { 锻造: { 分类: '基础', 阶位: 技能阶位, 等级: 3 } },
    职业: { 名称: '无' },
  });

  it('一阶契约者：阶位上限=1、技能阶位=1（不能是0）', () => {
    const m = assembleMaker(fake('一阶', '一阶'), '锻造');
    expect(m.阶位上限).toBe(1);
    expect(m.技能?.阶位).toBe(1);
    expect(m.技能?.等级).toBe(3);
    expect(m.姓名).toBe('老狼');
  });

  it('三阶契约者：阶位上限=3、技能阶位=3', () => {
    const m = assembleMaker(fake('三阶', '三阶'), '锻造');
    expect(m.阶位上限).toBe(3);
    expect(m.技能?.阶位).toBe(3);
  });

  it('阶位认不出来时兜底为一阶（不产出0）', () => {
    const m = assembleMaker(fake('超脱', '？？？'), '锻造');
    expect(m.阶位上限).toBe(1);
    expect(m.技能?.阶位).toBe(1);
  });

  it('未掌握该行业技能：技能=undefined', () => {
    const m = assembleMaker(fake('一阶', '一阶'), '炼金');
    expect(m.技能).toBeUndefined();
  });
});

// ================================================================
// 经济守卫回归（v2 终审修复：Fix 1 / Fix 2）
// 这几条路径的失败模式是「静默扣钱」（花钱买到没有数值的哑弹、同名图纸重复付费）与
// 「静默丢物品」（图纸既传不上去也没处可去），正是重构时最容易悄悄破坏、人工复核最难发现的一类，
// 故钉成永久测试。断言一律同时看「返回值 + 存档逐位不变 + 玩家看得到理由」三面。
// v2.1（Task 4）：Fix 1 的「道具名白名单」已按新版规则作废（自定义道具正是这一版的目的），
// 其位置由「结构化定价」与「放开自创名」两组用例接管；Fix 2 的同名禁购与丢弃一字未动。
// ================================================================

/** 假 toastr：错误与警告收进 提示、成功收进 成功 —— 「不许假报成功」这类断言要看得到 success。 */
const 提示: string[] = [];
const 成功: string[] = [];
/** 假聊天变量（getVariables 读、replaceVariables 写，用来喂 配方库）。 */
let chatVars: any = {};
/** 假存档（Mvu.getMvuData 读它、replaceMvuData 写回它 —— commit 之后还要回读，故必须是同一个对象）。 */
let mvu: any = {};

const 当前UP = () => Number(mvu.stat_data.契约者.经济.UP);
const 当前背包 = () => mvu.stat_data.契约者.背包;

/** AI 定制表单提交出去的那一份（与 blueprintAI.DesignTarget 同形；v2.1 起含 种类/设计要求/核心材料[]）。
 *  去掉 `as any` 是有意的：这层类型检查就是 C5「入参形状对上」的第一道证据。 */
const 目标 = (
  名称: string,
  成品类型: '装备' | '道具',
  覆盖: Partial<DesignTarget> = {},
): DesignTarget => ({
  名称,
  成品类型,
  装备子类: 成品类型 === '装备' ? '武器' : '',
  种类: 成品类型 === '装备' ? '巨剑' : '',
  品质: '金色',
  阶位: 1,
  核心材料: ['止血草'],
  行业: '炼金',
  设计要求: '',
  ...覆盖,
});

/** 图纸配方的可覆盖字段（只列本文件用得到的几个） */
interface 图纸覆盖 {
  装备子类?: '武器' | '防具' | '饰品' | '';
  装备基础?: string;
  参照模板?: string;
  道具类型?: 道具类型;
  道具固定值?: number;
  品质?: Quality;
  阶位?: number;
}

/** AI 生成的合法图纸数据（走 schema，保证与 store 消费的形状一致）。
 *  默认：金色一阶武器（参照模板「短剑」，WEAPON_TABLE 真键）。
 *  道具默认 恢复HP/固定值 20 —— 与内置「基础治疗药剂」的实际配方值一致，定价断言才对得上真实用例。 */
const 图纸 = (名称: string, 成品类型: '装备' | '道具' = '道具', 覆盖: 图纸覆盖 = {}) =>
  BlueprintDataSchema.parse({
    配方: 配方Schema.parse({
      名称,
      来源: '图纸',
      行业: '炼金',
      成品类型,
      装备子类: 覆盖.装备子类 ?? (成品类型 === '装备' ? '武器' : ''),
      装备基础: 覆盖.装备基础 ?? (成品类型 === '装备' ? '巨剑' : ''),
      参照模板: 覆盖.参照模板 ?? (成品类型 === '装备' ? '短剑' : ''),
      品质: 覆盖.品质 ?? '金色',
      阶位: 覆盖.阶位 ?? 1,
      道具类型: 覆盖.道具类型 ?? '恢复HP',
      道具固定值: 覆盖.道具固定值 ?? 20,
      材料: [{ 类别: '草药', 数量: 2, 核心: true }],
      技能要求: { 分类: '高级', 等级: 1 },
      批量上限: 1,
      成品名: 名称,
      描述: '风味文案',
      效果: [],
    }),
    制作者: 'AI',
    补全: false,
    版本: 1,
  });

/** 背包里的一张图纸物品（collectBlueprints / readBlueprint 认的是 图纸数据） */
const 图纸物品 = (名称: string, 数量 = 1, 数据: 图纸数据 = 图纸(名称)) => ({
  名称: blueprintItemName(名称),
  描述: 'd',
  品质: '金色',
  阶位: '1阶',
  类型: '图纸',
  图纸数据: 数据,
  数量,
});

beforeEach(() => {
  提示.length = 0;
  成功.length = 0;
  chatVars = {};
  genMock.mockReset();
  mvu = {
    stat_data: {
      契约者: {
        头部: { 姓名: '老狼', 阶位: '一阶' },
        属性: { 基础: { STR: 8, AGI: 6, CON: 6, PER: 7 }, 属性修正值: { STR: 0, AGI: 0, CON: 0, PER: 2 } },
        通用技能: { 炼金: { 分类: '高级', 阶位: '一阶', 等级: 3 } },
        职业: { 名称: '炼金术士' },
        经济: { UP: 20000 },
        背包: {},
      },
    },
  };
  (globalThis as any).getVariables = () => chatVars;
  (globalThis as any).replaceVariables = (v: any) => {
    chatVars = v;
  };
  (globalThis as any).getCurrentMessageId = () => -1;
  (globalThis as any).Mvu = {
    getMvuData: () => mvu,
    replaceMvuData: async (d: any) => {
      mvu = d;
    },
  };
  (globalThis as any).toastr = {
    error: (m: string) => 提示.push(m),
    warning: (m: string) => 提示.push(m),
    success: (m: string) => 成功.push(m),
  };
  (globalThis as any).window = { confirm: () => true };
  setActivePinia(createPinia());
});

// ================================================================
// v2.1（Task 4）：放开自定义道具名 / 道具定价改结构化基准 / 参照模板收口
// ================================================================

describe('C2 · 自定义道具名不再被拒（v2.1 的目的就是 AI 自创道具）', () => {
  it('自创道具名：不再早退，正常调用 AI 并付费入包（v2 会在烧 token 前按白名单拒掉）', async () => {
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('不存在的药'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('不存在的药', '道具'))).toBe(true);
    expect(genMock).toHaveBeenCalledTimes(1);
    expect(当前背包()[blueprintItemName('不存在的药')].图纸数据.配方.名称).toBe('不存在的药');
    expect(成功[0]).toContain('已获得图纸');
  });

  it('保留的守卫：配方库已掌握 → 仍在烧 token 前早退、零变量变动', async () => {
    chatVars = { wxhl003_crafting: { 配方库: { 不存在的药: 图纸('不存在的药').配方 } } };
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('不存在的药', '道具'))).toBe(false);
    expect(genMock).not.toHaveBeenCalled();
    expect(当前UP()).toBe(20000);
    expect(当前背包()).toEqual({});
    expect(提示[0]).toContain('已掌握该配方');
  });

  it('入参透传（C5）：DesignTarget 原样交给 generateBlueprint（种类/设计要求/核心材料[]/名称 不被改写）', async () => {
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('浮游炮', '装备', { 参照模板: '突击步枪' }), clamped: [] });
    const s = useCraftingStore();
    const t = 目标('浮游炮', '装备', {
      种类: '浮游炮', 核心材料: ['精铁', '兽骨'], 设计要求: '要能连射', 阶位: 2, 品质: '紫色',
    });
    expect(await s.designBlueprint(t)).toBe(true);
    expect(genMock).toHaveBeenCalledWith(t); // 同一个对象引用透传：store 这层不重排、不裁剪字段
  });
});

describe('C1 · 道具定价走结构化基准（不再按成品名查 GOODS_UNIT_PRICE）', () => {
  it('恢复HP/固定值20：道具基准价 25 × 20 × 1阶系数 = 500', async () => {
    // 旧口径：按名「基础治疗药剂」查 GOODS_UNIT_PRICE 得 15 → 15×20 = 300（UP 19700）。
    // 新口径：道具基准价(恢复HP, 20) = round(10 + 20×0.75) = 25 → ×20×1 = 500
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('基础治疗药剂'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具'))).toBe(true);
    expect(当前UP()).toBe(19500); // 20000 − 500
  });

  it('价只看 道具类型/道具固定值：AI 改成品名不改价（旧口径按产出名查表 = 800）', async () => {
    // 旧口径：按产出名「强效治疗药剂」查得 40 → 800（UP 19200）；新口径与名字无关：
    // 道具基准价(恢复HP, 50) = round(10 + 50×0.75) = 48 → ×20×1 = 960
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('强效治疗药剂', '道具', { 道具固定值: 50 }), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具'))).toBe(true);
    expect(当前UP()).toBe(19040); // 20000 − 960
  });

  it('不同道具类型给出不同基准价（同一固定值下 恢复HP 25 vs 弹药 10）', async () => {
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('穿甲弹', '道具', { 道具类型: '弹药', 道具固定值: 20 }), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('穿甲弹', '道具'))).toBe(true);
    // 道具基准价(弹药, 20) = round(10 + 20×0.5) = 20 → ×20×1 = 400
    expect(当前UP()).toBe(19600); // 20000 − 400
  });

  it('装备不受影响：仍走 EQUIP_MID（金色一阶武器 600 × 2 × 1 = 1200）', async () => {
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('狼王牙刃', '装备'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('狼王牙刃', '装备'))).toBe(true);
    expect(当前UP()).toBe(18800); // 20000 − 1200
    expect(当前背包()[blueprintItemName('狼王牙刃')].图纸数据.配方.参照模板).toBe('短剑');
  });
});

describe('C3 · setBpTemplate：参照模板的校验与回写', () => {
  /** 往背包塞一张指定子类的装备图纸，返回物品名 */
  const 塞图纸 = (名称: string, 覆盖: 图纸覆盖 = {}) => {
    const 名 = blueprintItemName(名称);
    mvu.stat_data.契约者.背包 = { [名]: 图纸物品(名称, 1, 图纸(名称, '装备', 覆盖)) };
    return 名;
  };
  const 参照模板 = (名: string) => 当前背包()[名].图纸数据.配方.参照模板;
  const 装备基础 = (名: string) => 当前背包()[名].图纸数据.配方.装备基础;

  it('武器图纸：写入 WEAPON_TABLE 键 → 回写 参照模板（不覆写自由文本的 装备基础、不碰 UP）', async () => {
    const 名 = 塞图纸('狼王牙刃');
    const s = useCraftingStore();
    expect(await s.setBpTemplate(名, '法杖')).toBe(true);
    expect(参照模板(名)).toBe('法杖');
    expect(装备基础(名)).toBe('巨剑'); // 种类名只归 AI/玩家填，本动作不碰
    expect(当前UP()).toBe(20000); // 只写背包
    expect(成功[0]).toContain('参照模板');
  });

  it('武器图纸：给防具光谱（重装）→ 拒（跨类），零变量变动', async () => {
    const 名 = 塞图纸('狼王牙刃');
    const s = useCraftingStore();
    expect(await s.setBpTemplate(名, '重装')).toBe(false);
    expect(参照模板(名)).toBe('短剑'); // 原值仍在
    expect(提示[0]).toContain('武器');
    expect(成功).toEqual([]);
  });

  it('防具图纸：写入光谱 → 成功；给武器键 → 拒', async () => {
    const 名 = 塞图纸('狼皮甲', { 装备子类: '防具' });
    const s = useCraftingStore();
    expect(await s.setBpTemplate(名, '轻装')).toBe(true);
    expect(参照模板(名)).toBe('轻装');
    expect(await s.setBpTemplate(名, '短剑')).toBe(false);
    expect(参照模板(名)).toBe('轻装');
    expect(提示[0]).toContain('防具');
  });

  it('饰品/道具图纸：不用这一栏 → 一律拒', async () => {
    const 饰品名 = 塞图纸('寒铁指环', { 装备子类: '饰品', 参照模板: '' });
    mvu.stat_data.契约者.背包[blueprintItemName('灵药')] = 图纸物品('灵药', 1, 图纸('灵药'));
    const s = useCraftingStore();
    expect(await s.setBpTemplate(饰品名, '短剑')).toBe(false);
    expect(await s.setBpTemplate(blueprintItemName('灵药'), '轻装')).toBe(false);
    expect(提示.length).toBe(2);
    expect(提示.every(m => m.includes('无法指定参照模板'))).toBe(true);
    expect(成功).toEqual([]);
  });

  it('非图纸物品 / 不在背包 → 拒（不是通用改字段后门）', async () => {
    mvu.stat_data.契约者.背包 = { 止血草: { 名称: '止血草', 数量: 5 } };
    const s = useCraftingStore();
    expect(await s.setBpTemplate('止血草', '短剑')).toBe(false);
    expect(await s.setBpTemplate(blueprintItemName('不存在'), '短剑')).toBe(false);
    expect(当前背包()['止血草'].数量).toBe(5);
    expect(当前UP()).toBe(20000);
    expect(成功).toEqual([]);
  });
});

describe('Fix 2 · 同名图纸禁止重复购买，背包图纸可丢弃', () => {
  it('配方库已掌握：拒绝、不烧 AI token、零变量变动', async () => {
    chatVars = { wxhl003_crafting: { 配方库: { 基础治疗药剂: 图纸('基础治疗药剂').配方 } } };
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具'))).toBe(false);
    expect(genMock).not.toHaveBeenCalled();
    expect(当前UP()).toBe(20000);
    expect(当前背包()).toEqual({});
    expect(提示[0]).toContain('已掌握该配方');
  });

  it('背包里已有同名图纸物品：拒绝且零变量变动', async () => {
    mvu.stat_data.契约者.背包 = { [blueprintItemName('基础治疗药剂')]: 图纸物品('基础治疗药剂') };
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具'))).toBe(false);
    expect(genMock).not.toHaveBeenCalled();
    expect(当前UP()).toBe(20000);
    expect(提示[0]).toContain('背包里已有一张同名图纸');
  });

  it('AI 把成品名改成背包里已有的图纸名：按最终名复查后仍拒绝', async () => {
    mvu.stat_data.契约者.背包 = { [blueprintItemName('狼王牙刃')]: 图纸物品('狼王牙刃', 1, 图纸('狼王牙刃', '装备')) };
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('狼王牙刃', '装备'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('虎王牙刃', '装备'))).toBe(false);
    expect(当前UP()).toBe(20000);
    expect(提示[0]).toContain('背包里已有一张同名图纸');
  });

  it('discardBp：只写 契约者.背包（不碰 经济.UP），整条物品消失', async () => {
    const 名 = blueprintItemName('基础治疗药剂');
    mvu.stat_data.契约者.背包 = { [名]: 图纸物品('基础治疗药剂', 2), 止血草: { 名称: '止血草', 数量: 5 } };
    const s = useCraftingStore();
    expect(await s.discardBp(名)).toBe(true);
    expect(当前背包()[名]).toBeUndefined();
    expect(当前背包()['止血草'].数量).toBe(5);
    expect(当前UP()).toBe(20000);
    expect(成功[0]).toContain('已丢弃');
  });

  it('discardBp：数量异常（缺字段/0/非数）→ 拒绝、不写档、不假报成功', async () => {
    // 这张卡只认 图纸数据、不要求 数量，故数量缺失从 UI 可达；而 bagRemove 对 NaN 既不抛错也不删除，
    // 若不自己收口就会「条目原地留存 + 弹成功提示」演成假成功（这正是本用例钉住的回归）。
    for (const 数量 of [undefined, 0, NaN, -1]) {
      const 名 = blueprintItemName('基础治疗药剂');
      mvu.stat_data.契约者.背包 = { [名]: { ...图纸物品('基础治疗药剂'), 数量 } };
      const s = useCraftingStore();
      expect(await s.discardBp(名)).toBe(false);
      expect(当前背包()[名]).toBeDefined(); // 条目原地留存，但没有假报成功
      expect(当前UP()).toBe(20000);
      expect(提示[0]).toContain('数量异常');
      expect(成功).toEqual([]);
      提示.length = 0;
    }
  });

  it('discardBp：非图纸物品 / 不在背包 → 拒绝且零变量变动（不是通用删物品后门）', async () => {
    mvu.stat_data.契约者.背包 = { 止血草: { 名称: '止血草', 数量: 5 } };
    const s = useCraftingStore();
    expect(await s.discardBp('止血草')).toBe(false);
    expect(await s.discardBp(blueprintItemName('不存在'))).toBe(false);
    expect(当前背包()['止血草'].数量).toBe(5);
    expect(提示.length).toBe(2);
  });
});
