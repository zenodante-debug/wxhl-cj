import { describe, expect, it } from 'vitest';
import { BASE } from '../../market/priceTable';
import type { Bag } from '../../market/settle';
import {
  blueprintPrice,
  collectBlueprints,
  mergeBlueprintData,
  readBlueprint,
  uploadBlueprint,
  writeBlueprint,
} from '../blueprint';
import { BlueprintDataSchema, blueprintItemName, type 图纸数据 } from '../recipes';

const 金配方 = {
  名称: '狼王牙刃', 来源: '图纸' as const, 行业: '锻造' as const, 成品类型: '装备' as const,
  装备子类: '武器' as const, 品质: '金色' as const, 阶位: 3, 装备基础: '短剑',
  材料: [{ 类别: '怪物素材' as const, 数量: 1, 核心: true }],
  技能要求: { 分类: '高级' as const, 等级: 1 }, 批量上限: 1, 成品名: '', 效果: [], 描述: '',
  // 装备夹具：v2.1 新增的道具/模板字段取 schema 默认值
  参照模板: '', 道具类型: '其他' as const, 道具固定值: 0, 关联属性: 'PER' as const, 设计要求: '',
};
const 图纸物品 = blueprintItemName('狼王牙刃');

function bagWith蓝图的(): Bag {
  return {
    [图纸物品]: { 名称: 图纸物品, 描述: '狼王牙刃的制作图纸', 数量: 1, 图纸数据: { 配方: 金配方, 制作者: 'AI', 补全: false, 版本: 1 } },
    精铁: { 名称: '精铁', 描述: '', 数量: 5 },
  };
}

describe('blueprintPrice · 图纸定价（成品一阶中值×2×阶位系数）', () => {
  it('金三阶武器 = 10800', () => {
    expect(blueprintPrice('装备', '武器', 3, '金色')).toBe(10800);
  });
  it('金三阶防具 = 7650；金三阶饰品 = 9000', () => {
    expect(blueprintPrice('装备', '防具', 3, '金色')).toBe(7650);
    expect(blueprintPrice('装备', '饰品', 3, '金色')).toBe(9000);
  });
  it('紫三阶武器 = 40500', () => {
    expect(blueprintPrice('装备', '武器', 3, '紫色')).toBe(40500);
  });
  it('金一阶武器 = 1200（对照 spec 表）', () => {
    expect(blueprintPrice('装备', '武器', 1, '金色')).toBe(1200);
  });
  it('道具图纸 = 一阶单价×20×阶位系数', () => {
    expect(blueprintPrice('道具', '', 3, '金色', 40)).toBe(7200);
  });
});

describe('图纸背包读写', () => {
  it('collectBlueprints 只挑出带合法图纸数据的物品', () => {
    const list = collectBlueprints(bagWith蓝图的());
    expect(list.length).toBe(1);
    expect(list[0].物品名).toBe(图纸物品);
    expect(list[0].数据.配方.品质).toBe('金色');
  });
  it('readBlueprint 可读、非图纸返回 null', () => {
    expect(readBlueprint(bagWith蓝图的(), 图纸物品)?.配方.名称).toBe('狼王牙刃');
    expect(readBlueprint(bagWith蓝图的(), '精铁')).toBeNull();
  });
  it('writeBlueprint 回写数据且不动数量/名称/描述', () => {
    const bag = bagWith蓝图的();
    const next = writeBlueprint(bag, 图纸物品, { ...readBlueprint(bag, 图纸物品)!, 补全: true });
    expect(next[图纸物品].数量).toBe(1);
    expect(next[图纸物品].名称).toBe(图纸物品);
    expect(next[图纸物品].描述).toBe('狼王牙刃的制作图纸');
    expect((next[图纸物品] as any).图纸数据.补全).toBe(true);
    expect((bag[图纸物品] as any).图纸数据.补全).toBe(false); // 不改原对象
  });
});

describe('uploadBlueprint · 上传学习', () => {
  it('成功：扣图纸物品、配方入库', () => {
    const r = uploadBlueprint(bagWith蓝图的(), 图纸物品, {});
    expect('bag' in r).toBe(true);
    if (!('bag' in r)) return;
    expect(r.bag[图纸物品]).toBeUndefined();
    expect(r.bag.精铁.数量).toBe(5);
    expect(r.配方库['狼王牙刃'].品质).toBe('金色');
  });
  it('同名已掌握 → 拒绝', () => {
    const r = uploadBlueprint(bagWith蓝图的(), 图纸物品, { 狼王牙刃: 金配方 });
    expect('error' in r && r.error).toContain('已掌握');
  });
  it('物品不存在 → 拒绝', () => {
    const r = uploadBlueprint({}, 图纸物品, {});
    expect('error' in r).toBe(true);
  });
  it('图纸数量为 0 → 拒绝（bagRemove 抛错被转成 error）', () => {
    const bag = bagWith蓝图的();
    const 空 = { ...bag, [图纸物品]: { ...bag[图纸物品], 数量: 0 } };
    const r = uploadBlueprint(空, 图纸物品, {});
    expect('error' in r).toBe(true);
    if ('error' in r) expect(r.error).toContain('数量不足');
  });
  it('配方名撞原型链键（constructor）不误判为已掌握', () => {
    const 名 = 'constructor';
    const 物品 = blueprintItemName(名);
    const bag: Bag = {
      [物品]: {
        名称: 物品, 描述: '', 数量: 1,
        图纸数据: { 配方: { ...金配方, 名称: 名 }, 制作者: 'AI', 补全: false, 版本: 1 },
      },
    };
    const r = uploadBlueprint(bag, 物品, {});
    expect('bag' in r).toBe(true);
    if ('bag' in r) expect(r.配方库[名].品质).toBe('金色');
  });
});

describe('blueprintPrice · 非法输入一律抛错（不得返回 0 价 / NaN 价）', () => {
  it('阶位 0（TIER_COEF 哨兵）与未知阶位 9 抛错', () => {
    expect(() => blueprintPrice('装备', '武器', 0, '金色')).toThrow();
    expect(() => blueprintPrice('装备', '武器', 9, '金色')).toThrow();
  });
  it('装备缺子类、道具缺一阶单价（含 0）抛错', () => {
    expect(() => blueprintPrice('装备', '', 1, '金色')).toThrow();
    expect(() => blueprintPrice('道具', '', 1, '金色')).toThrow();
    expect(() => blueprintPrice('道具', '', 1, '金色', 0)).toThrow();
  });
  it('未知子类/品质抛错（不再静默产 NaN）', () => {
    expect(() => blueprintPrice('装备', '法器' as any, 1, '金色')).toThrow();
    expect(() => blueprintPrice('装备', '武器', 1, '银色' as any)).toThrow();
  });
});

describe('blueprintPrice × market BASE 交叉断言（防两表手抄漂移）', () => {
  it('一阶价/2 === round(BASE 区间中值)，12 档全覆盖', () => {
    for (const 子类 of ['武器', '防具', '饰品'] as const) {
      for (const 品质 of ['白色', '蓝色', '金色', '紫色'] as const) {
        const [下限, 上限] = BASE[子类][品质];
        // 防具白色 (15+40)/2=27.5 → 上取整 28
        const 中值 = Math.round((下限 + 上限) / 2);
        expect(blueprintPrice('装备', 子类, 1, 品质)).toBe(中值 * 2);
      }
    }
  });
});

describe('mergeBlueprintData · 补全（base 优先，绝不覆盖已有合法值）', () => {
  const 底稿 = (): 图纸数据 => BlueprintDataSchema.parse({ 配方: 金配方, 制作者: '玩家', 补全: false, 版本: 1 });
  /** AI 补全结果天然只带部分字段，测试里用 cast 收窄 */
  const 补 = (配方: Record<string, unknown>) => ({ 配方 }) as unknown as Partial<图纸数据>;

  it('只填缺失：已合法的 品质=金色 不被 AI 的 紫色 改写', () => {
    expect(mergeBlueprintData(底稿(), 补({ 品质: '紫色' })).配方.品质).toBe('金色');
  });
  it('补齐缺失：base 效果为空数组时用 AI 的效果', () => {
    const r = mergeBlueprintData(底稿(), 补({ 效果: [{ 类型: '常驻', 描述: '灼烧', 属性加成: 3 }] }));
    expect(r.配方.效果.length).toBe(1);
    expect(r.配方.效果[0].属性加成).toBe(3);
  });
  it('配方名不可被 AI 改写（配方库去重键）', () => {
    expect(mergeBlueprintData(底稿(), 补({ 名称: 'AI乱改' })).配方.名称).toBe('狼王牙刃');
  });
  it('补全恒为 true', () => {
    expect(底稿().补全).toBe(false);
    expect(mergeBlueprintData(底稿(), 补({})).补全).toBe(true);
    expect(mergeBlueprintData(底稿(), {}).补全).toBe(true);
  });
  it('顶层 制作者/版本 base 优先，缺失才用 AI', () => {
    const r = mergeBlueprintData(底稿(), { 制作者: 'AI', 版本: 9 });
    expect(r.制作者).toBe('玩家');
    expect(r.版本).toBe(1);
    const r2 = mergeBlueprintData({ 配方: 金配方 }, { 制作者: 'AI', 版本: 9 });
    expect(r2.制作者).toBe('AI');
    expect(r2.版本).toBe(9);
  });
  it('base 字段为空/非法时才让 AI 覆盖', () => {
    const 坏 = { 配方: { ...金配方, 品质: '银色' }, 制作者: '', 版本: 0 };
    const r = mergeBlueprintData(坏, { 配方: { 品质: '金色' }, 制作者: 'AI', 版本: 1 } as unknown as Partial<图纸数据>);
    expect(r.配方.品质).toBe('金色'); // 银色非法 → 让位
    expect(r.制作者).toBe('AI'); // 空串 → 让位
    expect(r.版本).toBe(1); // 数值 0 → 让位
  });
  it('收口：补全后仍缺必填字段（材料）时 parse 抛错', () => {
    expect(() => mergeBlueprintData({}, 补({ 名称: '半成品' }))).toThrow();
  });
  // 终审 M2：0 是 道具固定值 的合法取值（弹药/状态/餐食/陷阱 全为 0），不是「未填」。
  // 若按未填处理，base 的合法 0 会被 AI 的非零值静默覆盖——对恢复类图纸就是免费加强，且不记入 clamped。
  it('道具固定值 0 是合法值 → 不被 AI 的非零值改写', () => {
    const 道具底稿 = (道具固定值: number | undefined = 0): 图纸数据 =>
      BlueprintDataSchema.parse({
        配方: {
          名称: '制式爆炸物', 来源: '标准', 行业: '工程', 成品类型: '道具', 品质: '蓝色',
          材料: [{ 类别: '火药', 数量: 2, 核心: true }], 技能要求: { 分类: '基础', 等级: 3 },
          道具类型: '爆炸物', 道具固定值, 关联属性: 'PER',
        },
        制作者: '玩家', 补全: false, 版本: 1,
      });
    expect(mergeBlueprintData(道具底稿(), 补({ 道具固定值: 999 })).配方.道具固定值).toBe(0);
    expect(mergeBlueprintData(道具底稿(), 补({ 道具固定值: 999 })).配方.道具类型).toBe('爆炸物');
    // 边界：字段真的缺席（raw 底稿未过 parse）时仍要让 AI 补上
    const 缺字段 = { 配方: { ...道具底稿().配方, 道具固定值: undefined } };
    expect(mergeBlueprintData(缺字段, 补({ 道具固定值: 45 })).配方.道具固定值).toBe(45);
  });
  it('其余数值字段的 0 仍按未填处理（阶位/版本让位给 AI）', () => {
    const 坏 = { 配方: { ...金配方, 阶位: 0 }, 制作者: '玩家', 版本: 0 };
    const r = mergeBlueprintData(坏, { 配方: { 阶位: 3 }, 版本: 2 } as unknown as Partial<图纸数据>);
    expect(r.配方.阶位).toBe(3);
    expect(r.版本).toBe(2);
  });
});
