import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { computeSettlement, type SettlementSnapshot } from '../settlementRules';
import { useSettlementStore, useForumStore, 解析副本天数, type SettlementPreview } from '../store';

/**
 * `useSettlementStore` 的**两阶段**结算、写入 / 填入守卫。
 *
 * 这里钉的是:
 * 1. **阶段一（第 1~3 步）是纯脚本** —— 读变量、判评价、算资源清单, **一次 AI 请求都不发**,
 *    也不要求配置 API;
 * 2. **阶段二只为「生成物品」调 AI**, 可单独重跑, 且**不碰阶段一的任何数值**;
 * 3. 阶段二未生成时不许写入（写入一次性, 还会清空副本资料）;
 * 4. **`toastr.success` 与 `写入完成` 的先后顺序** —— 顺序写反会让一次回读**通过**的写入同时带上
 *    `已写入`（回读失败）标记, 于是一次成功被谎报成失败、放弃被禁、而填入口却仍可点。
 * 5. `已写入` / `写入完成` 两个标记是**代码强制的互斥**, 且任一为真时写入与填入都一律不放行。
 *
 * 需要一个能跑通两阶段的最小环境: pinia + Mvu / toastr / 楼层探测 / 变量读取（`getVariables`）
 * 这几个全局桩, 以及 `generateRaw`（= `aiGenerate` 的底层, 阶段二的 AI 调用）的 spy。
 * 除 AI 与 MVU 两层外跑的都是真代码（`组装完成清单` / `computeSettlement` / `buildSettlementWrites`）。
 */

/**
 * 一份**真变量树**（阶段一读的就是它）。
 *
 * 完成情况全写在 `状态` 字段里: 主线 `已完成`、支线 1 条 `已完成`（另一条 `进行中`）、
 * 隐藏任务 1 条 `已完成`、成就 1 条 `已达成`（1★, 另一条 `未达成`）。
 * 于是期望: 星和 1（<5）、完成支线 1 → 评价 **C**; 完成清单 4 条; 副本天数 3（`客观时间: '3天'`）。
 */
const 契约者变量 = {
  当前副本元数据: { 副本名称: '血色黎明' },
  当前副本任务: {
    主线任务: { 名称: '血色的黎明', 说明: '打进钟楼', 奖励: '250 UP + 500 EXP', 状态: '已完成' },
    支线任务: {
      收集物资: { 说明: '凑齐三箱药', 奖励: '30 UP + 60 EXP + 1 RP', 状态: '已完成' },
      没做完的支线: { 说明: '谁也没做完', 奖励: '999 UP + 999 EXP', 状态: '进行中' },
    },
    隐藏任务: { 旧日回响: { 说明: '把钟楼下的回响听完', 奖励: '80 UP + 150 EXP', 状态: '已完成' } },
    副本成就: {
      初见: { 说明: '第一次踏进回廊', 难度: '★ 探索级 · 顺路可完成', 奖励: '20 UP + 40 EXP + 2 RP', 状态: '已达成' },
      无人问津: { 说明: '日落前找到第三个名字', 难度: '★★★ 破局级 · 组队可完成', 奖励: '60 UP + 120 EXP', 状态: '未达成' },
    },
  },
  头部: { 姓名: '刘林', 阶位: '三阶', CR: 5, EXP_当前: 1234, RP_当前: 40, 军衔: '上等兵' },
  经济: { UP: 77 },
  职业: { PEXP_当前: 100, 职业等级: 5, PEXP_升级所需: 200 },
  当前时间: { 现实日期: '2025年5月10日', 现实时间: '凌晨00:01', 客观时间: '3天' },
  赛季信息: { 当前副本周期: 3 },
  资格分: 100,
  背包: { 血刃: { 数量: 1 } },
  小队: { 成员: {} },
};

/** MVU 的内存替身: getMvuData 返回上一次 replaceMvuData 交出来的对象（写入即生效） */
let 存档: any;

/** 本文件挂到 globalThis 上的构建期全局（照原值还原, 见 afterEach） */
const 桩键 = [
  'Mvu', 'waitGlobalInitialized', 'getCurrentMessageId', 'toastr', '$', 'triggerSlash',
  'getVariables', 'generateRaw',
] as const;
let 原值: Record<string, unknown> = {};

/**
 * 桩在**文件级**: 两阶段的用例都用到它们（后一个 describe 若没有自己的 beforeEach,
 * 会沿用上一个测试留下的 pinia 与已经被还原掉的全局 —— 那会让新用例读到旧 store 的状态）。
 */
beforeEach(() => {
  setActivePinia(createPinia());
  原值 = {};
  for (const k of 桩键) 原值[k] = (globalThis as any)[k];
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
  // 阶段一读变量走的这一口（read契约者）; 阶段二调 AI 走 `generateRaw`（aiGenerate 的底层）——
  // 两者都是 spy, 好让「阶段一不发 AI 请求」能被正面断言而不是靠"没报错"倒推。
  (globalThis as any).getVariables = () => ({ stat_data: { 契约者: 契约者变量 } });
  (globalThis as any).generateRaw = vi.fn(async () => '{"掉落物品":[]}');
});

// 这些桩是本文件**私有**的: 用完必须还原。vitest 默认 `isolate: true` 时它们不会泄漏,
// 但一旦有人用 `--no-isolate`（或关掉隔离）, 残留的 `Mvu` / `toastr` 会污染同 worker 的其它文件。
afterEach(() => {
  for (const k of 桩键) {
    if (原值[k] === undefined) delete (globalThis as any)[k];
    else (globalThis as any)[k] = 原值[k];
  }
});

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
    // 2026-09-25 改后这三张清单都带 `状态`（完成与否只看它, 不再由 AI 报名单）,
    // 且多了一张支线清单与主线状态 —— 夹具照着真快照补齐, 免得接线漏字段时这里照样绿。
    成就清单: [],
    隐藏任务清单: [],
    支线清单: [],
    主线状态: '已完成',
    小队成员: [{ 名称: '阿澈', 当前EXP: 500, 当前UP: 9 }],
  } as SettlementSnapshot;
  // 阶段一 + 阶段二的容器: 2026-09-25 改后 `ai` 已不在预览里 ——
  // 预览只存「阶段一的确定性结果」与「阶段二的掉落物品(`null` = 未生成)」,
  // 给纯函数的判定容器由 store 现组装（`组装判定`）。
  const 假物品 = [{ 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 1 }];

  /** 一份「阶段一已完成、阶段二已生成、尚未写入」的预览 */
  function 新预览(): SettlementPreview {
    return {
      快照,
      计算结果: computeSettlement(输入, 满骰()),
      完成清单: [{ 类别: '主线', 名称: '血色的黎明', 奖励: '250 UP + 500 EXP' }],
      评价依据: '已达成成就合计 10★ → A（成就 ≥10★）',
      副本天数: 3,
      掉落物品: 假物品,
      面板: '<面板>',
      结算空间提示词: '（测试用）结算空间提示词\n第二行',
      已写入: false,
      写入完成: false,
    };
  }

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

  it('2026-09-25 改: 写入的字段里**没有**称号与副本经历（改由正文 AI 补写）', async () => {
    // 这条钉的是「写入清单真的少了那两项」: 面板/存档的称号与正文 AI 写的称号必须是同一个,
    // 所以模块这一侧一个都不能写 —— 一旦有人把它们加回 buildSettlementWrites, 这里即红。
    const store = useSettlementStore();
    store.settlement = 新预览();
    expect(await store.writeSettlement()).toBe(true);
    const 契约者 = 存档.stat_data.契约者;
    expect(契约者.头部.称号).toBeUndefined();
    expect(契约者.副本经历).toBeUndefined();
    // 反退化: 该写的仍然在（否则「不写称号」在「整份写入都空转」下也会绿）
    expect(契约者.头部.EXP_当前).toBe(1234 + store.settlement!.计算结果.最终EXP);
  });

  it('阶段二未生成时**拒绝写入**（写入一次性, 还会清空副本资料 —— 那时物品再也写不进去）', async () => {
    const store = useSettlementStore();
    const p = 新预览();
    p.掉落物品 = null;
    p.面板 = null;
    p.结算空间提示词 = null;
    store.settlement = p;
    expect(await store.writeSettlement()).toBe(false);
    expect(store.lastError).toContain('物品还没生成');
    expect(store.settlement!.写入完成).toBe(false);
    expect(store.settlement!.已写入).toBe(false);
    // 反退化: 同一份预览补上物品就能写 —— 否则上面那句在「写入恒失败」下也绿
    store.settlement!.掉落物品 = 假物品;
    expect(await store.writeSettlement()).toBe(true);
  });
});

/**
 * 两阶段拆分 —— 2026-09-25 用户定稿: 「结算必须分成两个显式阶段, 而不是一次点击里把脚本+AI 连着跑完」。
 *
 * 阶段一 = 第 1~3 步（纯脚本读变量, **一次 AI 请求都不发**）;
 * 阶段二 = 只为「生成物品」调一次 AI, 可单独重跑（重掷物品）, **不碰阶段一的任何数值**。
 */
describe('结算两阶段 · 阶段一纯脚本 / 阶段二只生成物品', () => {
  it('阶段一: 读变量算出完成清单 / 评价 / 资源清单, 且**一次 AI 请求都不发、也不要求配置 API**', () => {
    const store = useSettlementStore();
    // 特意**不**配置 API: 阶段一根本不该看这一项（它不调 AI）
    expect(useForumStore().settings.primary.url).toBe('');

    expect(store.computeSettlementStage1()).toBe(true);

    // 1) AI 没被碰过 —— 这是「阶段一纯脚本」的正脸断言（不是靠"没报错"倒推）
    expect((globalThis as any).generateRaw).not.toHaveBeenCalled();
    expect(store.lastError).not.toContain('API');

    const p = store.settlement!;
    // 2) 完成清单来自变量的 `状态`（主线 + 1 支线 + 1 隐藏 + 1 成就; 未完成 / 未达成的不进来）
    expect(p.完成清单.map(x => `${x.类别}:${x.名称}`)).toEqual([
      '主线:血色的黎明', '支线:收集物资', '隐藏任务:旧日回响', '成就:初见',
    ]);
    // 每条都带上奖励原文（阶段二生成物品的唯一依据）
    expect(p.完成清单[1].奖励).toBe('30 UP + 60 EXP + 1 RP');
    // 3) 评价: 星和 1（<5）、完成支线 1 → C
    expect(p.计算结果.评价等级).toBe('C');
    expect(p.评价依据).toContain('支线');
    // 4) 资源清单（与写入同源的那一份）: 基础 = 主线 500/250 + 支线 60/30 + 隐藏 150/80 + 成就 40/20
    expect(p.计算结果.基础EXP汇总).toBe(500 + 60 + 150 + 40);
    expect(p.计算结果.基础UP汇总).toBe(250 + 30 + 80 + 20);
    expect(p.计算结果.最终EXP).toBe(Math.round(750 * 1.0 * 1.5 * 3));   // C 级 ×1.0, CR5→关注 ×1.5, 三阶 ×3
    expect(p.计算结果.最终UP).toBe(Math.round(380 * 1.0 * 1.5 * 3));
    expect(p.计算结果.新周期).toBe(4);
    // 副本天数来自变量的 `客观时间: '3天'` → 现实日期 +3 天（天数解析真的接进了算术）
    expect(p.计算结果.新现实日期).toBe('2025年5月13日');
    // 5) 中间态: 物品 / 面板 / 提示词都还没有 —— 它们要等阶段二
    expect(p.掉落物品).toBeNull();
    expect(p.面板).toBeNull();
    expect(p.结算空间提示词).toBeNull();
  });

  it('阶段一: 主线未完成 → F 抹杀, 仍然不发 AI 请求、不产出预览', () => {
    const 主线没完成 = JSON.parse(JSON.stringify(契约者变量));
    主线没完成.当前副本任务.主线任务.状态 = '进行中';
    (globalThis as any).getVariables = () => ({ stat_data: { 契约者: 主线没完成 } });

    const store = useSettlementStore();
    expect(store.computeSettlementStage1()).toBe(false);
    expect(store.lastError).toContain('抹杀');
    expect(store.settlement).toBeNull();
    expect((globalThis as any).generateRaw).not.toHaveBeenCalled();
  });

  it('阶段二: 只调一次 AI 补出掉落物品, 并拼出面板与提示词; 提示词里**不含任何数值结果**', async () => {
    const store = useSettlementStore();
    useForumStore().settings.primary = { url: 'http://test', apiKey: 'k', model: 'm', timeout: 1, maxRetries: 0 };
    expect(store.computeSettlementStage1()).toBe(true);

    (globalThis as any).generateRaw = vi.fn(async () =>
      '{"掉落物品":[{"名称":"血刃","品质":"金色","属性":"STR+5","效果":"流血","数量":1}]}');

    expect(await store.generateItems()).toBe(true);
    const p = store.settlement!;
    expect(p.掉落物品).toEqual([{ 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 1 }]);
    expect(p.面板).toContain('## 掉落清单: 血刃（金色｜STR+5｜流血）×1');
    expect(p.结算空间提示词).toContain('你要补写：称号 与 副本经历');

    // 提示词只给「生成物品所需」的东西: 完成清单+奖励原文 / 评价与 CR 态度 / 聊天记录 / 世界书
    const 提示词 = ((globalThis as any).generateRaw.mock.calls[0][0] as any).user_input as string;
    expect(提示词).toContain('30 UP + 60 EXP + 1 RP');    // 奖励原文
    expect(提示词).toContain('- 评价等级: C');
    expect(提示词).toContain('- 结算前回廊态度（CR态）: 关注');
    expect(提示词).toContain('（未读取到聊天记录）');
    // **不塞数值结果**: 阶段一算出来的那些数一个都不该出现在这里
    // （断「结果清单那一段」的段头与行格式, 再断最终 EXP/UP 这两个四位数 ——
    //  规则原文里本来就有 `## 最终EXP: [具体数值]`、`×100%`、`(100 + …)` 这些字样/小数字,
    //  拿 '100' 这种值去断言会误报, 所以只挑不可能与规则文本撞车的四位数）
    expect(提示词).not.toContain('本次结算结果');
    expect(提示词).not.toContain('- 最终评价:');
    expect(提示词).not.toContain(String(p.计算结果.最终EXP));
    expect(提示词).not.toContain(String(p.计算结果.最终UP));
    // 反退化: 这两个数确实存在于面板里（否则上面两条在「数根本算不出来」下也绿）
    expect(p.计算结果.最终EXP).toBeGreaterThanOrEqual(1000);
    expect(p.面板).toContain(`## 最终EXP: ${p.计算结果.最终EXP}`);
    expect(p.面板).toContain(`## PEXP获得: ${p.计算结果.PEXP}`);
  });

  it('阶段二重跑 = 重掷物品: 整块替换掉落, 而阶段一的数值 / 完成清单一个都不动', async () => {
    const store = useSettlementStore();
    useForumStore().settings.primary = { url: 'http://test', apiKey: 'k', model: 'm', timeout: 1, maxRetries: 0 };
    store.computeSettlementStage1();
    (globalThis as any).generateRaw = vi.fn(async () => '{"掉落物品":[]}');
    expect(await store.generateItems()).toBe(true);

    // 阶段一的产物: 记下引用（重跑后必须还是同一个对象 —— 那才叫"没重算"）
    const p = store.settlement!;
    const 结果 = p.计算结果;
    const 清单 = p.完成清单;
    const 依据 = p.评价依据;
    const 天数 = p.副本天数;
    expect(p.掉落物品).toEqual([]);

    (globalThis as any).generateRaw = vi.fn(async () =>
      '{"掉落物品":[{"名称":"第二把血刃","品质":"紫色","属性":"AGI+3","效果":"穿刺","数量":2}]}');
    expect(await store.generateItems()).toBe(true);

    expect(p.掉落物品).toEqual([{ 名称: '第二把血刃', 品质: '紫色', 属性: 'AGI+3', 效果: '穿刺', 数量: 2 }]);
    // 阶段一的一切原样: 同一个对象、同一个数、同一份清单
    expect(store.settlement!.计算结果).toBe(结果);
    expect(store.settlement!.完成清单).toBe(清单);
    expect(store.settlement!.评价依据).toBe(依据);
    expect(store.settlement!.副本天数).toBe(天数);
    // 面板/提示词跟着掉落清单重拼（否则画面上的掉落与提示词里的掉落会各说一套）
    expect(store.settlement!.面板).toContain('第二把血刃');
    expect(store.settlement!.结算空间提示词).toContain('第二把血刃');
  });

  it('AI 没给掉落物品 → 空数组, 不因此整次失败（物品是锦上添花）', async () => {
    const store = useSettlementStore();
    useForumStore().settings.primary = { url: 'http://test', apiKey: 'k', model: 'm', timeout: 1, maxRetries: 0 };
    store.computeSettlementStage1();
    (globalThis as any).generateRaw = vi.fn(async () => '{}');
    expect(await store.generateItems()).toBe(true);
    expect(store.settlement!.掉落物品).toEqual([]);
    expect(store.settlement!.面板).toContain('## 掉落清单: 无');
  });

  it('写入之后不许再重掷物品（存档里已有本次掉落, 换了就是两份不同源的数）', async () => {
    const store = useSettlementStore();
    useForumStore().settings.primary = { url: 'http://test', apiKey: 'k', model: 'm', timeout: 1, maxRetries: 0 };
    store.computeSettlementStage1();
    (globalThis as any).generateRaw = vi.fn(async () => '{"掉落物品":[]}');
    expect(await store.generateItems()).toBe(true);
    expect(await store.writeSettlement()).toBe(true);

    (globalThis as any).generateRaw.mockClear();
    expect(await store.generateItems()).toBe(false);
    expect(store.lastError).toContain('不能再重掷物品');
    expect((globalThis as any).generateRaw).not.toHaveBeenCalled();
  });

  it('阶段二没配置 API 时如实报错, 且阶段一的预览原样保留', async () => {
    const store = useSettlementStore();
    store.computeSettlementStage1();
    expect(await store.generateItems()).toBe(false);
    expect(store.lastError).toContain('配置 API');
    expect(store.settlement!.掉落物品).toBeNull();
    expect(store.settlement!.计算结果.评价等级).toBe('C');   // 阶段一的成果没被这次失败抹掉
  });

  it('没有任何预览时, 阶段二拒绝（请先完成阶段一）', async () => {
    const store = useSettlementStore();
    expect(await store.generateItems()).toBe(false);
    expect(store.lastError).toContain('阶段一');
  });
});

/**
 * `解析副本天数` —— 2026-09-25 改后**天数不再让 AI 读**, 改由脚本从 `当前时间.客观时间` 解析。
 * 这个字段的实际写法本仓库看不到（卡不在仓库里）, 所以口径是「开头一个可选的 `第` + 连续数字,
 * 认不出填 0, 不编造」。
 */
describe('解析副本天数 · 取开头数字, 认不出填 0', () => {
  it('纯数字 / 带单位 / 带前缀的写法都取到天数', () => {
    expect(解析副本天数(3)).toBe(3);
    expect(解析副本天数('3')).toBe(3);
    expect(解析副本天数('3天')).toBe(3);
    expect(解析副本天数('第3天')).toBe(3);
    expect(解析副本天数(' 12 天')).toBe(12);
  });

  it('认不出来一律 0（**不编造** —— 宁可现实日期不更新, 也不推一个像真的日子）', () => {
    expect(解析副本天数('不在副本中')).toBe(0);
    expect(解析副本天数(undefined)).toBe(0);
    expect(解析副本天数(null)).toBe(0);
    expect(解析副本天数('')).toBe(0);
    expect(解析副本天数({})).toBe(0);
  });

  it('0 是合法的「今天」, 不是「认不出」', () => {
    expect(解析副本天数(0)).toBe(0);
    expect(解析副本天数('0天')).toBe(0);
  });
});
