import { describe, expect, it } from 'vitest';
import { buildSettlementPrompt, buildSettlementEnterPrompt } from '../settlementGen';
import { computeSettlement, type SettlementGenResult, type SettlementSnapshot } from '../settlementRules';

describe('buildSettlementPrompt', () => {
  const p = buildSettlementPrompt('契约者: 刘林', '[玩家]: 打完了', '世界书内容');

  it('内联了规则原文', () => {
    expect(p).toContain('副本结算');
    expect(p).toContain('第一步_评价判定');
    expect(p).toContain('第十一步_副本经历与面板更新');
  });

  it('带【优先级声明】, 明确禁止输出结算面板', () => {
    expect(p).toContain('不适用于本次生成');
    expect(p).toContain('严禁');
    // 真断言: 显式禁止的那句本身。规则原文里没有这一句, 删掉优先级声明即红。
    expect(p).toContain('在 JSON 前后输出任何 <Settlement Beautification> 面板或结算画面');
  });

  it('武装 F 守卫: 主线失败必须填 "F"', () => {
    // 真断言: 规则原文里没有「填 "F"」这个串, 删掉 prompt 那句即红。
    expect(p).toContain('填 "F"');
  });

  it('副本天数指向 客观时间', () => {
    // 天数来自 当前时间.客观时间（= 本次副本已度过的天数）, 不是已废弃的 副本日期。
    // 真断言: '客观时间'/'副本日期' 都不在规则原文 SETTLEMENT_RULES 里（见 data.ts 的 grep）,
    // 所以这两条只在 settlementGen.ts 的这句话上成立 —— 改回 副本日期 即红。
    expect(p).toContain('客观时间');
    expect(p).not.toContain('副本日期');
  });

  it('点名了 JSON 的每个字段', () => {
    for (const k of ['评价等级', '击杀', '濒死次数', '副本天数', '完成的支线',
      '完成的隐藏任务', '达成的成就', '职业专属支线条数', '天赋试炼次数', '掉落物品', '称号', '史诗记录']) {
      expect(p).toContain(k);
    }
  });

  it('三条硬要求点名', () => {
    expect(p).toContain('不要计算');          // AI 不许算数
    expect(p).toContain('逐字一致');          // 完成的支线必须用变量里的键名
    expect(p).toContain('数值由系统计算');     // 倍率/汇总由模块算
  });

  it('带上玩家数据与聊天记录', () => {
    expect(p).toContain('契约者: 刘林');
    expect(p).toContain('[玩家]: 打完了');
    expect(p).toContain('世界书内容');
  });

  it('空输入时回退到占位串', () => {
    const q = buildSettlementPrompt('契约者: 刘林', '', '');
    expect(q).toContain('（未读取到聊天记录）');
    expect(q).toContain('（无世界书内容）');
  });
});

describe('buildSettlementEnterPrompt', () => {
  // 固定骰子（与 settlementRules.test.ts 同款）: 让 computed 完全可写死,
  // 从而能断言「prompt 里的数就是 computed 的那一份」, 而不是另算的一份。
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
  const c = computeSettlement(输入, 满骰());
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
    成就清单: [
      { 名称: '初见', 说明: '第一次踏进回廊', 难度: '★ 探索级 · 顺路可完成', 奖励: '20 UP + 40 EXP + 2 RP' },
      { 名称: '血雨行者', 说明: '在血雨里不闪不避站满全程', 难度: '★★★★★★ 世界天花板 · 绝无仅有', 奖励: '500 UP + 900 EXP' },
    ],
    隐藏任务清单: [
      { 名称: '旧日回响', 说明: '钟楼下把旧日的回响听完', 奖励: '80 UP + 150 EXP' },
      { 名称: '无人知晓', 说明: '日落前找到第三个名字', 奖励: '999 UP + 999 EXP' },
    ],
    小队成员: [{ 名称: '阿澈', 当前EXP: 500, 当前UP: 9 }],
  } as SettlementSnapshot;
  const 假AI = {
    评价等级: 'S', 评价依据: '…', 击杀: { 精英: 2, BOSS: 1, 隐藏BOSS: 1 },
    濒死次数: 0, 副本天数: 3,
    完成的支线: ['收集物资'], 完成的隐藏任务: ['旧日回响'], 达成的成就: ['初见'],
    职业专属支线条数: 2, 天赋试炼次数: 1,
    掉落物品: [{ 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 1 }],
    称号: { 名称: '血夜行者', 效果: { 嗜血: '击杀回血' } },
    史诗记录: '他在血雨里站成了碑。',
  } as SettlementGenResult;

  const p = buildSettlementEnterPrompt(c, 假AI, 快照);

  it('第一组: 开场处境 —— 结算已完成、进入回廊结算空间', () => {
    expect(p).toContain('我已经完成了本次副本的结算');
    expect(p).toContain('结算空间');
  });

  it('第二组: 数值与 computed 同源（逐项照抄, 不是另算一份）', () => {
    expect(p).toContain(`- 最终评价: ${c.评价等级}（本次资格分 ${c.资格分_本次}）`);
    expect(p).toContain(`- 评价倍率: ×${c.评价倍率}`);
    expect(p).toContain(`- CR态度: ${c.CR态度}`);
    expect(p).toContain(`- CR奖励倍率: ×${Math.round(c.CR奖励倍率 * 100)}%`);
    expect(p).toContain(`- 位阶修正: ×${c.位阶修正}`);
    expect(p).toContain(`- 基础EXP汇总: ${c.基础EXP汇总}`);
    expect(p).toContain(`- 基础UP汇总: ${c.基础UP汇总}`);
    expect(p).toContain(`- 最终EXP: ${c.最终EXP}`);
    expect(p).toContain(`- 最终UP: ${c.最终UP}`);
    expect(p).toContain(`- RP获得: ${c.RP}`);
    expect(p).toContain(`- PEXP获得: ${c.PEXP}`);
    expect(p).toContain(`- 更新后CR: ${c.更新后CR}`);
    expect(p).toContain(`- 回廊态度: ${c.更新后回廊态度}`);
    expect(p).toContain(`- 副本周期: ${c.新周期}`);
    // 余额类 = 快照旧值 + 本次（与面板同口径, 不是照抄旧值、也不是裸增量）
    expect(p).toContain(`- 当前RP余额: ${快照.当前RP + c.RP}`);
    expect(p).toContain(`- 当前PEXP: ${快照.当前PEXP + c.PEXP}`);
    // 反退化: 这两条若把 旧值 或 裸增量 写进去就该红
    expect(快照.当前RP + c.RP).not.toBe(c.RP);
    expect(快照.当前RP + c.RP).not.toBe(快照.当前RP);
    expect(快照.当前PEXP + c.PEXP).not.toBe(c.PEXP);
  });

  it('第二组: 掉落 / 称号 / 成就 / 隐藏任务公示 / 史诗记录 / 现实时间 都在场', () => {
    expect(p).toContain('- 掉落清单: 血刃（金色｜STR+5｜流血）×1');
    expect(p).toContain('- 称号获得: 血夜行者');
    expect(p).toContain('- 称号效果: 嗜血：击杀回血');
    expect(p).toContain(`- 史诗记录: ${快照.副本名称} · ${c.评价等级} · ${假AI.史诗记录}`);
    expect(p).toContain(`- 现实时间: ${c.新现实日期} ${快照.当前现实时间}`);
    // 达成与否拿 AI 名单比对快照全量清单, 与面板同一口径
    expect(p).toContain('- 副本成就已达成: 初见（奖励: 20 UP + 40 EXP + 2 RP）');
    expect(p).toContain('- 副本成就未达成: 血雨行者（奖励: 500 UP + 900 EXP）');
    expect(p).toContain('- 隐藏任务公示: 旧日回响（已完成 · 奖励: 80 UP + 150 EXP）、无人知晓（未触发 · 奖励: 999 UP + 999 EXP）');
  });

  it('第二组: 同名掉落先聚合再打印（与面板 / 写入清单同一口径）', () => {
    const 两条同名 = {
      ...假AI,
      掉落物品: [
        { 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 1 },
        { 名称: '血刃', 品质: '金色', 属性: 'STR+5', 效果: '流血', 数量: 2 },
      ],
    } as SettlementGenResult;
    const q = buildSettlementEnterPrompt(c, 两条同名, 快照);
    expect(q).toContain('- 掉落清单: 血刃（金色｜STR+5｜流血）×3');
    expect(q.match(/血刃/g)?.length).toBe(1);
  });

  it('第三组: 硬约束逐字在场（整句, 不被 ** 断开）', () => {
    // 这四句是本功能的核心 —— 规则原文里有整套结算流程, AI 看到「结算」极可能自己再跑一遍,
    // 而本模块是累加语义: 重复应用会让玩家数值翻倍且不可撤销。逐字断言, 删一句即红。
    expect(p).toContain('本次副本的结算已经由系统全部执行完毕');
    expect(p).toContain('所有变量都已经写进存档了');
    expect(p).toContain('1. 不要再执行 <副本结算> 的任何结算步骤。结算已经结束了 —— 没有第二次结算。');
    expect(p).toContain('2. 不要再修改任何变量。不要 insert、不要 replace、不要 delta、不要 set 任何字段, 一个都不要改。');
    expect(p).toContain('3. 不要再自己重算任何数值。');
    expect(p).toContain('只能照抄它们');
    expect(p).toContain('本次完全不适用, 请彻底忽略它。');
  });

  it('第三组: 不内联规则原文（不给 AI 任何可以照着重跑的材料）', () => {
    // '第一步_评价判定' 是 SETTLEMENT_RULES 里的一句话标记（见上方 buildSettlementPrompt 的测试）——
    // 它不出现在这里, 证明本 prompt 有意**没有**把结算规则原文塞进去。
    expect(p).not.toContain('第一步_评价判定');
    expect(p).not.toContain('SETTLEMENT_RULES');
  });

  it('第四组: 请求叙事结算空间, 并在末尾列出结算后流程的两个选项', () => {
    expect(p).toContain('请以【回廊结算空间】为场景写一段开场叙事');
    expect(p).toContain('进入休息周期');
    expect(p).toContain('回廊主城停留 24 小时');
    expect(p).toContain('花费 UP 延长副本滞留');
    expect(p).toContain('50 UP/天');
  });

  it('非 A/S 级（称号为 null）时不出现「获得称号」的假象, 而是如实说跳过', () => {
    // AI 即便给了称号, 只要 computed 不是 A/S, 就不能印出来 —— 与面板 / 写入清单同一道守卫
    const cB = computeSettlement({ ...输入, 评价等级: 'B' }, 满骰());
    const pB = buildSettlementEnterPrompt(cB, 假AI, 快照);
    expect(pB).not.toContain('血夜行者');
    expect(pB).not.toContain('嗜血');
    expect(pB).toContain('本次没有称号');
    expect(pB).toContain('未达 A/S');
    expect(pB).toContain('跳过');
    // 反退化: A/S 级时称号照常印出来（否则上面两条在「称号恒不印」下也绿）
    expect(p).toContain('血夜行者');
  });
});
