import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import {
  BlueprintDataSchema, 配方Schema, blueprintItemName, 启发式归类,
  type 图纸数据, type 道具类型, type 配方,
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

/** d20 固定为 20（自然 20 = 杰作）：杰作档「扣全部投入」，扣减与实际投入逐件一致，断言才可确定。
 *  其余导出（归一位阶 等）经 importOriginal 保留真身，assembleMaker 的回归断言不受影响。
 *  路径是 `../../dice`（不是 `../dice`）：本文件在 __tests__/ 里，`../` 只到 crafting/，
 *  而 store 引的 '../dice' 落在 wxhl-003/ —— 写成 '../dice' 会静默注册一个不存在的模块、mock 不生效。 */
vi.mock('../../dice', async importOriginal => ({
  ...(await importOriginal<typeof import('../../dice')>()),
  rollDie: () => 20,
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
// Task 6 · 技能四级回退接线（映射表/精确名/模糊名/效果文本）
// v2 的判定是 `通用技能[行业]` 精确查表：技能叫「锻造术」「铸造」的玩家一律被判「未掌握生活技能」。
// ================================================================
describe('assembleMaker · 技能四级回退（接线）', () => {
  const fake = (通用技能: any) => ({
    头部: { 姓名: '老狼', 阶位: '一阶' },
    属性: { 基础: { STR: 8, AGI: 6, CON: 6, PER: 7 }, 属性修正值: { STR: 0, AGI: 0, CON: 0, PER: 2 } },
    通用技能,
    职业: { 名称: '无' },
  });

  it('映射表：「铸造」经聊天变量登记为「锻造」，采纳它的 分类/等级/阶位', () => {
    const m = assembleMaker(fake({ 铸造: { 分类: '高级', 阶位: '三阶', 等级: 4 } }), '锻造', { 锻造: ['铸造'] });
    expect(m.技能).toEqual({ 分类: '高级', 阶位: 3, 等级: 4 });
  });

  it('模糊名：「锻造术」不再被判未掌握（精确查表下 assembleMaker 会给出 undefined）', () => {
    const m = assembleMaker(fake({ 锻造术: { 分类: '基础', 阶位: '一阶', 等级: 2 } }), '锻造');
    expect(m.技能).toEqual({ 分类: '基础', 阶位: 1, 等级: 2 });
  });

  it('效果文本：技能名与行业名毫无字面关系，靠 效果 里提到的行业名认领', () => {
    const m = assembleMaker(
      fake({ 铁匠之心: { 分类: '基础', 阶位: '一阶', 等级: 1, 效果: { 精通: '提升锻造成功率' } } }),
      '锻造',
    );
    expect(m.技能?.等级).toBe(1);
  });

  it('四级都不中 → 技能 undefined（沿用「未掌握」路径，不凭空造一条技能）', () => {
    expect(assembleMaker(fake({ 剑术: { 分类: '基础', 阶位: '一阶', 等级: 5 } }), '锻造').技能).toBeUndefined();
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
/** 假确认框：capture 弹窗正文。确认框是玩家**付费那一刻**唯一看到的东西，文案值得钉住。 */
let 确认框 = '';
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
  确认框 = '';
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
  (globalThis as any).window = {
    confirm: (m: string) => {
      确认框 = m;
      return true;
    },
  };
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

describe('确认框 · 数值来源必须在付费那一刻可见（v2.1 名字与数值分家）', () => {
  it('装备：种类名与「数值参照」分列，数值取自武器表实算', async () => {
    genMock.mockResolvedValue({
      ok: true, 数据: 图纸('浮游炮', '装备', { 装备基础: '浮游炮', 参照模板: '突击步枪' }), clamped: [],
    });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('浮游炮', '装备', { 种类: '浮游炮' }))).toBe(true);
    // 突击步枪 一阶 = [3 骰, d6, 倍率 0.5, 负重 4kg]；金色升两档骰面 → d6→d10
    expect(确认框).toContain('装备·武器（种类：浮游炮） ｜ 数值参照【突击步枪】→ 伤害骰 3d10 / 倍率 0.5 / 负重 4kg');
    // 武器这行的三个数字都不波动（伤害骰/倍率/负重）→ 不该出现波动说明（见下面的波动说明用例）
    expect(确认框).not.toContain('成功档 80%~100% 波动');
    // 同一份摘要也是图纸物品的「描述」，两处同源（AI 自创的种类名绝不冒充数值来源）
    expect(当前背包()[blueprintItemName('浮游炮')].描述).toContain('数值参照【突击步枪】→ 伤害骰 3d10');
  });

  it('道具：展示 道具类型 + 固定值 + 关联属性', async () => {
    genMock.mockResolvedValue({
      ok: true, 数据: 图纸('不存在的药', '道具', { 道具类型: '恢复HP', 道具固定值: 20 }), clamped: [],
    });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('不存在的药', '道具'))).toBe(true);
    // 恢复HP 的固定值 = **基准恢复量**（成功档过 fluctuate）→ 说明句紧跟固定值之后、在关联属性之前
    expect(确认框).toContain('金色·1阶 道具 ｜ 道具数值：恢复HP · 固定值 20（成功档 80%~100% 波动）（吃 PER 修正）');
  });

  it('饰品：展示 attrBonus 实算的主/副属性加成（饰品没有参照模板这一栏）', async () => {
    genMock.mockResolvedValue({
      ok: true, 数据: 图纸('寒铁指环', '装备', { 装备子类: '饰品', 装备基础: '指环', 参照模板: '' }), clamped: [],
    });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('寒铁指环', '装备', { 装备子类: '饰品', 种类: '指环' }))).toBe(true);
    // attrBonus('饰品', 一阶, 金色) = 主 1 / 副 floor(1×0.5) = 0
    // 主/副属性加成同样过 fluctuate → 说明句紧跟加成之后，「无伤害骰/防御/负重」之前
    expect(确认框).toContain(
      '装备·饰品（种类：指环） ｜ 饰品数值：主属性加成 +1 / 副属性 +0（成功档 80%~100% 波动）（无伤害骰/防御/负重）',
    );
  });

  it('未指定参照模板的武器图纸：不假装有数值（也不抛错）', async () => {
    genMock.mockResolvedValue({
      ok: true, 数据: 图纸('无名刀', '装备', { 装备基础: '无名刀', 参照模板: '' }), clamped: [],
    });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('无名刀', '装备', { 种类: '无名刀' }))).toBe(true);
    expect(确认框).toContain('未指定数值参照');
  });

  // ---- 波动说明（T6 追加）：显示的是**基准值**，成功档会 fluctuate 到 80%~100% ----
  // 只挂在**行内真有波动项**的行上，且紧跟会波动的那几项：无差别挂到整行末尾＝对武器/爆炸物说谎。
  it('防具：说明夹在「闪避」与「负重」之间（负重不过 fluctuate，放行尾会读成它也在波动）', async () => {
    genMock.mockResolvedValue({
      ok: true, 数据: 图纸('狼皮甲', '装备', { 装备子类: '防具', 装备基础: '兽皮甲', 参照模板: '轻装' }), clamped: [],
    });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('狼皮甲', '装备', { 装备子类: '防具', 种类: '兽皮甲' }))).toBe(true);
    // armorStats('轻装', 一阶, 金色) = 防御 3 / 闪避 3 / 负重 2
    expect(确认框).toContain('数值参照【轻装】→ 装备防御 3 / 闪避 3（成功档 80%~100% 波动） / 负重 2kg');
  });

  it('恢复MP 与恢复HP 同口径（固定值当基准恢复量，过 fluctuate）', async () => {
    genMock.mockResolvedValue({
      ok: true, 数据: 图纸('醒神药', '道具', { 道具类型: '恢复MP', 道具固定值: 25 }), clamped: [],
    });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('醒神药', '道具'))).toBe(true);
    expect(确认框).toContain('道具数值：恢复MP · 固定值 25（成功档 80%~100% 波动）（吃 PER 修正）');
  });

  it('爆炸物：固定值是**附加固定伤害**、不波动 → 一个字都不加（无差别挂上去才是假话）', async () => {
    genMock.mockResolvedValue({
      ok: true, 数据: 图纸('烈性炸药包', '道具', { 道具类型: '爆炸物', 道具固定值: 30 }), clamped: [],
    });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('烈性炸药包', '道具'))).toBe(true);
    expect(确认框).toContain('道具数值：爆炸物 · 固定值 30（吃 PER 修正）');
    expect(确认框).not.toContain('波动');
  });

  it('恢复类但固定值为 0：「· 固定值」整段省略，说明随之省略（与视图同款条件）', async () => {
    genMock.mockResolvedValue({
      ok: true, 数据: 图纸('淡药', '道具', { 道具类型: '恢复HP', 道具固定值: 0 }), clamped: [],
    });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('淡药', '道具'))).toBe(true);
    expect(确认框).toContain('道具数值：恢复HP（吃 PER 修正）');
    expect(确认框).not.toContain('波动');
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

// ================================================================
// C4 · 多核心材料的类别映射与数量
// 旧口径把**所有**选中材料都按「第一条核心需求」的数量扣：配方「金属×2 + 怪物素材×1」会两样都按 2 扣。
// 现口径按 codexOf 的类别把每件材料认领到对应需求、扣**该需求**的数量，并做覆盖检查。
// ================================================================
describe('C4 · 多核心材料：按类别映射到核心需求、扣该需求的数量', () => {
  const 配方 = (名称: string, 材料: { 类别: string; 数量: number; 核心: boolean }[]) =>
    配方Schema.parse({
      名称, 来源: '自定义', 行业: '锻造', 成品类型: '装备', 装备子类: '防具',
      品质: '白色', 材料, 技能要求: { 分类: '基础', 等级: 1 }, 参照模板: '轻装',
    }) as 配方;

  /** 双核心：金属×2 + 怪物素材×1（两样都核心，故意**不给辅料**——辅料的 autoPick 会混进无关扣减） */
  const 双核 = 配方('双核测试甲', [
    { 类别: '金属', 数量: 2, 核心: true },
    { 类别: '怪物素材', 数量: 1, 核心: true },
  ]);
  /** 单核心：金属×2 */
  const 单核 = 配方('单核测试甲', [{ 类别: '金属', 数量: 2, 核心: true }]);
  /** 同类别两条需求：金属×2 + 金属×1（钉「同类别多选按顺序分配」） */
  const 双金属 = 配方('双金属测试甲', [
    { 类别: '金属', 数量: 2, 核心: true },
    { 类别: '金属', 数量: 1, 核心: true },
  ]);
  /** 需求类别「任意」：没有任何物品的档案类别叫「任意」，只能靠通配兜底匹配上 */
  const 任意核 = 配方('任意核测试甲', [{ 类别: '任意', 数量: 1, 核心: true }]);

  /** 备料：回廊主城设施（不限「仅白色」以外的品质）+ 锻造技能 + 材料
   *  分类走 启发式归类：精铁/精铁2→金属，狼牙/兽骨→怪物素材 */
  const 备料 = (): void => {
    mvu.stat_data.契约者.当前世界 = '回廊';
    mvu.stat_data.契约者.通用技能.锻造 = { 分类: '基础', 阶位: '一阶', 等级: 3 };
    mvu.stat_data.契约者.背包 = {
      精铁: { 名称: '精铁', 数量: 10 },
      精铁2: { 名称: '精铁2', 数量: 10 },
      狼牙: { 名称: '狼牙', 数量: 5 },
      兽骨: { 名称: '兽骨', 数量: 5 },
    };
  };
  const 开工 = (配方: 配方, 核心材料名: string[]) =>
    useCraftingStore().doCraft({
      配方, 阶位: 1, 子类型: '轻装', 副属性: 'AGI', 数量: 1,
      核心材料名, 越阶材料: false, 劣质材料: false,
    });
  const 存有 = (名: string) => Number(当前背包()[名]?.数量 ?? 0);

  it('金属×2 + 怪物素材×1：分别按 2 / 1 扣（不是两样都扣 2）', async () => {
    备料();
    const out = await 开工(双核, ['精铁', '狼牙']);
    expect(out?.结果).toBe('杰作'); // d20 固定 20 → 杰作：扣全部投入，扣减与投入逐件一致
    expect(out?.扣减).toEqual([
      { 物品名: '精铁', 数量: 2 },
      { 物品名: '狼牙', 数量: 1 },
    ]);
    expect(存有('精铁')).toBe(8);
    expect(存有('狼牙')).toBe(4); // 旧口径会扣 2（按金属需求）→ 会是 3
  });

  it('金属×2 + 怪物素材×1：只选两件金属 → 拒（「怪物素材」需求没着落），零变量变动', async () => {
    备料();
    expect(await 开工(双核, ['精铁', '精铁2'])).toBeNull();
    expect(提示[0]).toContain('怪物素材');
    expect(提示[0]).toContain('没有对应材料');
    expect(存有('精铁')).toBe(10);
    expect(存有('精铁2')).toBe(10);
  });

  it('多余材料（对不上任何核心需求）→ 拒并点名', async () => {
    备料();
    expect(await 开工(单核, ['精铁', '狼牙'])).toBeNull();
    expect(提示[0]).toContain('狼牙');
    expect(提示[0]).toContain('对不上本配方的核心需求');
    expect(存有('精铁')).toBe(10);
  });

  it('一件核心材料都没选 → 拒（「请先选择核心材料」守卫）', async () => {
    备料();
    expect(await 开工(单核, [])).toBeNull();
    expect(提示[0]).toBe('请先选择核心材料');
    expect(存有('精铁')).toBe(10);
    expect(当前UP()).toBe(20000);
  });

  it('同类别两条需求：按选择顺序分配（金属×2 给第一件、金属×1 给第二件）', async () => {
    备料();
    const out = await 开工(双金属, ['精铁', '精铁2']);
    expect(out?.扣减).toEqual([
      { 物品名: '精铁', 数量: 2 },
      { 物品名: '精铁2', 数量: 1 },
    ]);
    expect(存有('精铁')).toBe(8);
    expect(存有('精铁2')).toBe(9);
  });

  it('需求类别为「任意」：任何一件选中材料都能认领（否则这张图纸永远做不出）', async () => {
    备料();
    const out = await 开工(任意核, ['兽骨']);
    expect(out?.扣减).toEqual([{ 物品名: '兽骨', 数量: 1 }]);
    expect(存有('兽骨')).toBe(4);
  });
});

// ================================================================
// Task 6 · doCraft 读聊天变量的「行业技能映射」
// 映射表是玩家唯一能表达「铸造 = 锻造」这类无字面关系的手段；本任务只做**读取**（UI 编辑入口留待后续），
// 故这里从 doCraft 的入口把聊天变量喂进去，验证它真的一路走到 resolveSkill。
// ================================================================
describe('Task 6 · 行业技能映射（wxhl003_crafting.行业技能映射）驱动开工', () => {
  const 单核甲 = 配方Schema.parse({
    名称: '映射表测试甲', 来源: '自定义', 行业: '锻造', 成品类型: '装备', 装备子类: '防具',
    品质: '白色', 材料: [{ 类别: '金属', 数量: 2, 核心: true }],
    技能要求: { 分类: '基础', 等级: 1 }, 参照模板: '轻装',
  }) as 配方;

  /** 备料：回廊主城设施（白色配方不限品质）+ 只学了「铸造」的玩家 + 10 精铁 */
  const 备料 = (): void => {
    mvu.stat_data.契约者.当前世界 = '回廊';
    mvu.stat_data.契约者.通用技能 = { 铸造: { 分类: '高级', 阶位: '一阶', 等级: 3 } };
    mvu.stat_data.契约者.背包 = { 精铁: { 名称: '精铁', 数量: 10 } };
  };
  const 开工 = () =>
    useCraftingStore().doCraft({
      配方: 单核甲, 阶位: 1, 子类型: '轻装', 副属性: 'AGI', 数量: 1, 核心材料名: ['精铁'],
      越阶材料: false, 劣质材料: false,
    });

  it('登记了「锻造 → 铸造」：采纳铸造的技能开工（d20 固定 20 → 杰作）', async () => {
    备料();
    chatVars = { wxhl003_crafting: { 行业技能映射: { 锻造: ['铸造'] } } };
    const out = await 开工();
    expect(out?.结果).toBe('杰作');
    expect(out?.扣减).toEqual([{ 物品名: '精铁', 数量: 2 }]);
    expect(Number(当前背包()['精铁'].数量)).toBe(8);
    expect(成功[0]).toContain('杰作');
  });

  it('没有映射表：「铸造」认不出来 → 拒（旧的精确查表行为不变，零变量变动）', async () => {
    备料();
    expect(await 开工()).toBeNull();
    expect(提示[0]).toBe('未掌握生活技能「锻造」');
    expect(Number(当前背包()['精铁'].数量)).toBe(10);
    expect(成功).toEqual([]);
  });

  it('映射表数据坏掉（值不是数组）：当空表处理，不炸（变量由 AI/GM 直写）', async () => {
    备料();
    chatVars = { wxhl003_crafting: { 行业技能映射: { 锻造: '铸造' } } };
    expect(await 开工()).toBeNull();
    expect(提示[0]).toBe('未掌握生活技能「锻造」');
  });

  it('模糊名也走同一条路：「锻造术」无需映射表即可开工', async () => {
    备料();
    mvu.stat_data.契约者.通用技能 = { 锻造术: { 分类: '基础', 阶位: '一阶', 等级: 3 } };
    chatVars = {};
    expect((await 开工())?.结果).toBe('杰作');
  });
});

// ================================================================
// matchMaterials 源头排除图纸（T5 评审抓到的真花钱漏洞）
// 启发式归类按子串匹配：`图纸·秘银护符` 会被「银」字归进「金属」，于是出现在制作页的核心材料候选里；
// 玩家勾中 → 分配核心材料 认领 → bagRemove 消耗 —— 4,500~112,500 UP 买来的生产资料一次性烧掉，不可逆。
// 排除收口在本函数（制作页候选的唯一供水方），而不是各调用点：修在调用点就得每加一个消费点重修一次。
// ================================================================
describe('matchMaterials · 候选里不得出现图纸（否则手工勾选就能烧掉生产资料）', () => {
  /** 备货：一张会被误归成「金属」的图纸 + 真金属/怪物素材；图纸名里的「银」是漏洞成立的原因 */
  const 备货 = (): void => {
    mvu.stat_data.契约者.背包 = {
      '图纸·秘银护符': { 名称: '图纸·秘银护符', 数量: 1, 类型: '图纸' },
      精铁: { 名称: '精铁', 数量: 5 },
      狼牙: { 名称: '狼牙', 数量: 2 },
      兽骨: { 名称: '兽骨', 数量: 3 },
    };
  };

  it('被误归成「金属」的图纸不出现在金属候选里（旧实现会）', () => {
    备货();
    const s = useCraftingStore();
    s.syncFromMvu();
    // 先复核漏洞前提：这条启发式确实会把图纸归成金属（不是凭空假设的输入）
    expect(启发式归类('图纸·秘银护符')).toBe('金属');
    const 金属 = s.matchMaterials('金属');
    expect(金属).toContain('精铁');
    expect(金属).not.toContain('图纸·秘银护符');
  });

  it('「任意」候选同样排除图纸，真材料一个不少', () => {
    备货();
    const s = useCraftingStore();
    s.syncFromMvu();
    const 任意 = s.matchMaterials('任意');
    expect(任意).not.toContain('图纸·秘银护符');
    expect(任意).toEqual(expect.arrayContaining(['精铁', '狼牙', '兽骨']));
  });

  it('其它类别的过滤未被误伤（排除图纸不是把整张候选清空）', () => {
    备货();
    const s = useCraftingStore();
    s.syncFromMvu();
    expect(s.matchMaterials('怪物素材')).toEqual(expect.arrayContaining(['狼牙', '兽骨']));
    expect(s.matchMaterials('草药')).toEqual([]);
  });
});

// ================================================================
// M1（终审 Minor）：executeCraft 抛错必须报给玩家，不能静默 no-op
// 坏配方（跨子类的 参照模板 / 装备子类 为空）在 schema 上**合法**——AI·GM 直写背包或旧数据可携带，
// validateCraft 又不看数值来源那一栏，故要一路走到 buildEquip 查表才抛。此前该调用在 try 之外、
// 视图 go() 也没有 try/catch：玩家点「开工」看到的是「什么都没发生」，既无 toastr 也无 lastError。
// ================================================================
describe('M1 · executeCraft 抛错不再静默（报到玩家面前 + 零变量变动）', () => {
  /** 坏配方：数值来源那一栏故意给非法值——validateCraft 不管它，只有 buildEquip 查表时才炸 */
  const 坏配方 = (参照模板: string, 装备子类: '武器' | '防具' | '' = '武器'): 配方 =>
    配方Schema.parse({
      名称: '坏刀', 来源: '自定义', 行业: '锻造', 成品类型: '装备', 装备子类,
      品质: '白色', 材料: [{ 类别: '金属', 数量: 2, 核心: true }],
      技能要求: { 分类: '基础', 等级: 1 }, 参照模板,
    }) as 配方;

  beforeEach(() => {
    mvu.stat_data.契约者.当前世界 = '回廊';
    mvu.stat_data.契约者.通用技能.锻造 = { 分类: '基础', 阶位: '一阶', 等级: 3 };
    mvu.stat_data.契约者.背包 = { 精铁: { 名称: '精铁', 数量: 10 } };
  });

  const 开工 = (配方: 配方, 子类型: string) => {
    const s = useCraftingStore();
    return {
      s,
      结果: s.doCraft({
        配方, 阶位: 1, 子类型, 副属性: 'AGI', 数量: 1,
        核心材料名: ['精铁'], 越阶材料: false, 劣质材料: false,
      }),
    };
  };

  it('武器配方的参照模板不在武器表内 → 不抛到调用方、报出具体原因、材料未扣', async () => {
    const { s, 结果 } = 开工(坏配方('光剑'), '');
    await expect(结果).resolves.toBeNull(); // 旧实现：异常冒到调用方（视图 go() 无 try/catch → 点了没反应）
    expect(s.lastError).toContain('配方数据异常');
    expect(s.lastError).toContain('光剑'); // 报得出具体原因，不是一句笼统的失败
    expect(提示[0]).toContain('配方数据异常');
    expect(Number(当前背包()['精铁'].数量)).toBe(10); // 抛错在任何写入之前，材料一件未扣
    expect(当前UP()).toBe(20000);
  });

  it('装备子类为空（旧数据形态）→ 同样接住（走防具表，子类型不在光谱里就抛）', async () => {
    const { s, 结果 } = 开工(坏配方('', ''), '短剑'); // 参照模板也空 → 回落制作时选的子类型
    await expect(结果).resolves.toBeNull();
    expect(s.lastError).toContain('配方数据异常');
    expect(s.lastError).toContain('短剑'); // 未知防具光谱：短剑
    expect(Number(当前背包()['精铁'].数量)).toBe(10);
    expect(成功).toEqual([]); // 绝不假报成功
  });
});
