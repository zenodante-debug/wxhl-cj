import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import { BlueprintDataSchema, 配方Schema, blueprintItemName } from '../recipes';
import { assembleMaker, useCraftingStore } from '../store';

/** AI 调用一律换成假实现：既不出网，也能精确指定「AI 返回了什么」（改名等异常返回全靠它构造）。
 *  store 的其余依赖（MVU / 聊天变量 / toastr）是酒馆宿主注入的运行时全局，测试里在 beforeEach 搭最小实现。 */
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

/** AI 定制表单提交出去的那一份（与 blueprintAI.DesignTarget 同形） */
const 目标 = (名称: string, 成品类型: '装备' | '道具') => ({
  名称,
  成品类型,
  子类: 成品类型 === '装备' ? '巨剑' : '',
  品质: '金色' as const,
  阶位: 1,
  核心材料: '止血草',
  行业: '炼金',
});

/** AI 生成的合法图纸数据（走 schema，保证与 store 消费的形状一致） */
const 图纸 = (名称: string, 成品类型: '装备' | '道具' = '道具') =>
  BlueprintDataSchema.parse({
    配方: 配方Schema.parse({
      名称,
      来源: '图纸',
      行业: '炼金',
      成品类型,
      装备子类: 成品类型 === '装备' ? '武器' : '',
      装备基础: 成品类型 === '装备' ? '巨剑' : '',
      品质: '金色',
      阶位: 1,
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
const 图纸物品 = (名称: string, 数量 = 1) => ({
  名称: blueprintItemName(名称),
  描述: 'd',
  品质: '金色',
  阶位: '1阶',
  类型: '图纸',
  图纸数据: 图纸(名称),
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

describe('Fix 1 · 定制道具图纸必须命中内置标准道具配方（否则花钱买到哑弹）', () => {
  it('玩家自创名：拒绝、不烧 AI token、零变量变动', async () => {
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('不存在的药', '道具') as any)).toBe(false);
    expect(genMock).not.toHaveBeenCalled();
    expect(当前UP()).toBe(20000);
    expect(当前背包()).toEqual({});
    expect(提示[0]).toContain('道具图纸仅支持已有配方');
    expect(提示[0]).toContain('基础治疗药剂');
  });

  it('AI 把成品名改到表外：按最终名复查后拒绝（否则「改名即绕过」）', async () => {
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('不存在的药'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具') as any)).toBe(false);
    expect(genMock).toHaveBeenCalledTimes(1);
    expect(当前UP()).toBe(20000);
    expect(当前背包()).toEqual({});
    expect(提示[0]).toContain('不在配方表内');
  });

  it('已知名：正常扣款（一阶单价 15 × 20 × 1 阶系数 = 300）并把图纸入包', async () => {
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('基础治疗药剂'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具') as any)).toBe(true);
    expect(当前UP()).toBe(19700);
    expect(当前背包()[blueprintItemName('基础治疗药剂')].图纸数据.配方.名称).toBe('基础治疗药剂');
  });

  it('装备不受该名单限制（守卫别把装备一起误伤）', async () => {
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('狼王牙刃', '装备'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('狼王牙刃', '装备') as any)).toBe(true);
  });

  it('AI 改名到另一个合法道具名：按产出名计价，而不是玩家的点名价', async () => {
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('强效治疗药剂'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具') as any)).toBe(true);
    expect(当前UP()).toBe(19200); // 强效治疗药剂 40 × 20 × 1，不是点名的 15
  });
});

describe('Fix 2 · 同名图纸禁止重复购买，背包图纸可丢弃', () => {
  it('配方库已掌握：拒绝、不烧 AI token、零变量变动', async () => {
    chatVars = { wxhl003_crafting: { 配方库: { 基础治疗药剂: 图纸('基础治疗药剂').配方 } } };
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具') as any)).toBe(false);
    expect(genMock).not.toHaveBeenCalled();
    expect(当前UP()).toBe(20000);
    expect(当前背包()).toEqual({});
    expect(提示[0]).toContain('已掌握该配方');
  });

  it('背包里已有同名图纸物品：拒绝且零变量变动', async () => {
    mvu.stat_data.契约者.背包 = { [blueprintItemName('基础治疗药剂')]: 图纸物品('基础治疗药剂') };
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('基础治疗药剂', '道具') as any)).toBe(false);
    expect(genMock).not.toHaveBeenCalled();
    expect(当前UP()).toBe(20000);
    expect(提示[0]).toContain('背包里已有一张同名图纸');
  });

  it('AI 把成品名改成背包里已有的图纸名：按最终名复查后仍拒绝', async () => {
    mvu.stat_data.契约者.背包 = { [blueprintItemName('狼王牙刃')]: 图纸物品('狼王牙刃') };
    genMock.mockResolvedValue({ ok: true, 数据: 图纸('狼王牙刃', '装备'), clamped: [] });
    const s = useCraftingStore();
    expect(await s.designBlueprint(目标('虎王牙刃', '装备') as any)).toBe(false);
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
