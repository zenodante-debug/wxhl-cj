import { beforeEach, describe, expect, it } from 'vitest';
import { computeSettlement, type SettlementGenResult, type SettlementSnapshot } from '../settlementRules';
import { useSettlementStore } from '../store';

/**
 * `useSettlementStore` 的写入 / 填入守卫。
 *
 * 这里钉的是两件事:
 * 1. **`toastr.success` 与 `写入完成` 的先后顺序** —— 顺序写反会让一次回读**通过**的写入同时带上
 *    `已写入`（回读失败）标记, 于是一次成功被谎报成失败、放弃被禁、而填入口却仍可点。
 * 2. `已写入` / `写入完成` 两个标记是**代码强制的互斥**, 且任一为真时写入与填入都一律不放行。
 *
 * 需要一个能跑通 `writeSettlement` 最小环境: pinia + Mvu / toastr / 楼层探测这几个全局桩。
 * 写入路径本身是真代码（`buildSettlementWrites` 真跑）, 只有 MVU 那一层被替换成一进一出的内存对象。
 */
describe('useSettlementStore · 写入后的状态与守卫', () => {
  const 满骰 = () => (面数: number) => 面数;
  const 输入 = {
    评价等级: 'S' as const,
    击杀: { 精英: 2, BOSS: 1, 隐藏BOSS: 1 },
    副本天数: 3,
    基础EXP汇总: 100,
    基础UP汇总: 50,
    完成的支线数: 2,
    隐藏任务数: 2,
    成就星数: [1, 3, 6],
    天赋试炼次数: 1,
    职业专属支线条数: 2,
    CR: 5,
    阶位: '三阶',
    旧周期: 3,
    旧资格分: 100,
    现实日期: '2025年5月10日',
  };
  const 快照 = {
    副本名称: '血色黎明',
    当前EXP: 1234,
    当前UP: 77,
    当前RP: 40,
    当前PEXP: 100,
    军衔: '上等兵',
    职业等级: 5,
    PEXP_升级所需: 200,
    当前CR: 5,
    当前现实日期: '2025年5月10日',
    当前现实时间: '凌晨00:01',
    旧资格分: 100,
    任务奖励: {},
    已有背包: {},
    成就清单: [],
    隐藏任务清单: [],
    小队成员: [{ 名称: '阿澈', 当前EXP: 500, 当前UP: 9 }],
  } as SettlementSnapshot;
  const 假AI = {
    评价等级: 'S', 评价依据: '…', 击杀: { 精英: 2, BOSS: 1, 隐藏BOSS: 1 },
    濒死次数: 0, 副本天数: 3,
    完成的支线: [], 完成的隐藏任务: [], 达成的成就: [],
    职业专属支线条数: 2, 天赋试炼次数: 1,
    掉落物品: [{ 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 1 }],
    称号: { 名称: '血夜行者', 效果: { 嗜血: '击杀回血' } },
    史诗记录: '他在血雨里站成了碑。',
  } as SettlementGenResult;

  /** 一份「刚结算完、尚未写入」的预览 */
  function 新预览() {
    return {
      快照,
      计算结果: computeSettlement(输入, 满骰()),
      ai: 假AI,
      面板: '<面板>',
      结算空间提示词: '（测试用）结算空间提示词\n第二行',
      已写入: false,
      写入完成: false,
    };
  }

  /** MVU 的内存替身: getMvuData 返回上一次 replaceMvuData 交出来的对象（写入即生效） */
  let 存档: any;

  beforeEach(() => {
    setActivePinia(createPinia());
    存档 = {};
    (globalThis as any).Mvu = {
      getMvuData: () => 存档,
      replaceMvuData: async (mvu: any) => { 存档 = mvu; },
    };
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getCurrentMessageId = () => -1;
    (globalThis as any).toastr = { success: () => {}, error: () => {}, info: () => {}, warning: () => {} };
    (globalThis as any).$ = () => ({ length: 0 });
    (globalThis as any).triggerSlash = async () => {};
  });

  it('正常路径（toastr 不抛）: 写入成功保留预览、标 写入完成, 且不出现 已写入', async () => {
    const store = useSettlementStore();
    store.settlement = 新预览();
    expect(await store.writeSettlement()).toBe(true);
    const p = store.settlement;
    expect(p).not.toBeNull();
    expect(p!.写入完成).toBe(true);
    expect(p!.已写入).toBe(false);
    // 保留预览 = 填入口拿得到提示词（本次改动的全部理由）
    expect(p!.结算空间提示词).not.toBe('');
  });

  it('toastr.success 抛错: 退化成保守的回读失败态, 绝不两个标记同时为真', async () => {
    // 顺序写反（先打 `写入完成` 再 toastr）时, 这条会看到 写入完成=true 且 已写入=true 而红。
    (globalThis as any).toastr = {
      success: () => { throw new Error('toastr boom') },
      error: () => {}, info: () => {}, warning: () => {},
    };
    const store = useSettlementStore();
    store.settlement = 新预览();
    expect(await store.writeSettlement()).toBe(false);
    const p = store.settlement!;
    expect(p.写入完成 && p.已写入).toBe(false);
    expect(p.写入完成).toBe(false);
    expect(p.已写入).toBe(true);
  });

  it('写入完成 时 writeSettlement 拒绝重复写入（累加语义下再写一次就是翻倍）', async () => {
    const store = useSettlementStore();
    const p = 新预览();
    p.写入完成 = true;
    store.settlement = p;
    expect(await store.writeSettlement()).toBe(false);
    expect(store.lastError).toContain('不能重复写入');
  });

  it('已写入 时 writeSettlement 同样拒绝（互斥是代码事实, 不是注释里的约定）', async () => {
    const store = useSettlementStore();
    const p = 新预览();
    p.已写入 = true;
    store.settlement = p;
    expect(await store.writeSettlement()).toBe(false);
    expect(store.lastError).toContain('不能重复写入');
  });

  it('没有预览时 fillInput 拦住（请先结算）', async () => {
    const store = useSettlementStore();
    expect(await store.fillInput()).toBe(false);
    expect(store.lastError).toContain('请先结算');
  });

  it('有预览但未写入时 fillInput 拦住（请先写入存档）', async () => {
    const store = useSettlementStore();
    store.settlement = 新预览();
    expect(await store.fillInput()).toBe(false);
    expect(store.lastError).toContain('请先写入存档');
  });

  it('已写入（回读失败）时 fillInput 拦住, 并提示先读存档', async () => {
    const store = useSettlementStore();
    const p = 新预览();
    p.已写入 = true;
    store.settlement = p;
    expect(await store.fillInput()).toBe(false);
    expect(store.lastError).toContain('读存档');
  });

  it('写入完成后 fillInput 真的填入（退回 /setinput 并压成单行, 只填入不发送）', async () => {
    const 命令: string[] = [];
    (globalThis as any).triggerSlash = async (c: string) => { 命令.push(c) };
    const store = useSettlementStore();
    const p = 新预览();
    p.写入完成 = true;
    store.settlement = p;
    expect(await store.fillInput()).toBe(true);
    expect(命令).toEqual(['/setinput （测试用）结算空间提示词 第二行']);
  });
});
