import { describe, expect, it } from 'vitest';
import type { BuildRoll, RewardSet } from '../dice';
import { DungeonGenResultSchema, assemblePanelText, mapToVariables, clamp固有角色等级 } from '../dungeonRules';
import { buildEnemyPrompt } from '../dungeonGen';
import { 基准等级 } from '../crTable';

const build: BuildRoll = {
  副本类型: '血腥',
  副本类型骰: 3,
  媒介来源: '电子游戏',
  题材大类: '科幻/未来',
  时代背景: '近未来/赛博',
  核心特色标签: '赛博朋克/矩阵空间',
  核心特色标签骰: 8,
  队友标签: '诡异民俗/中、日式恐怖',
  队友标签骰: 5,
  副模块: '大逃杀',
  副模块骰: 1,
  IP热度: '世界知名',
  IP热度骰: 38,
  时间限制天: 7,
  是新手副本: false,
  是日常副本: false,
};

const 奖励 = (up: number, exp: number, rp: number): any => ({ up, exp, rp, quality: '金色', itemType: '装备' });

const rewards: RewardSet = {
  主线: 奖励(342, 187, 0),
  支线: [奖励(120, 40, 0), 奖励(130, 45, 0), 奖励(140, 50, 0)],
  隐藏: [奖励(400, 220, 2), 奖励(410, 230, 3)],
  成就: [奖励(30, 20, 1), 奖励(60, 40, 2), 奖励(100, 60, 3), 奖励(200, 100, 4), 奖励(400, 180, 5), 奖励(800, 300, 6)],
};

const result = {
  副本名称: '夜雨霓虹',
  副本来源: '《赛博朋克2077》（电子游戏）',
  副本背景: '一段背景描述',
  日常调和说明: '',
  主线任务: { 名称: '主线名', 说明: '主线说明' },
  支线任务: [
    { 名称: '支线一', 说明: '说明一', 物品名: '接入仓' },
    { 名称: '支线二', 说明: '说明二', 物品名: '义体' },
    { 名称: '支线三', 说明: '说明三', 物品名: '芯片' },
  ],
  世界事件: [
    { 名称: '事件一', 说明: '说明一', 影响: '影响一' },
    { 名称: '事件二', 说明: '说明二', 影响: '影响二' },
  ],
  隐藏任务: [
    { 名称: '隐藏一', 说明: '说明一', 物品名: '黑墙碎片' },
    { 名称: '隐藏二', 说明: '说明二', 物品名: '灵魂杀手' },
  ],
  副本成就: [
    { 名称: '成就一', 说明: '说明一', 难度: '顺路可完成', 物品名: '挂件' },
    { 名称: '成就二', 说明: '说明二', 难度: '需特定规划', 物品名: '挂件' },
    { 名称: '成就三', 说明: '说明三', 难度: '改变局部战局', 物品名: '挂件' },
    { 名称: '成就四', 说明: '说明四', 难度: '深度介入', 物品名: '挂件' },
    { 名称: '成就五', 说明: '说明五', 难度: '直面核心灾难', 物品名: '挂件' },
    { 名称: '成就六', 说明: '说明六', 难度: '触碰世界底层规则', 物品名: '挂件' },
  ],
  固有角色: [
    { 名称: '摩根·黑手', 位阶: '四阶' as const, 等级: 70 },
    { 名称: '强尼·银手', 位阶: '三阶' as const, 等级: 55 },
  ],
  其他契约者: [
    { 真名: '陈默', 称号: '无', 等级: 11, 阵营: '中立' },
    { 真名: '林晚', 称号: '夜莺', 等级: 12, 阵营: '特管局' },
  ],
};

const player = { 姓名: '刘林', 等级: 11, 阶位: '一阶', CR: 4.5 };

describe('DungeonGenResultSchema', () => {
  it('接受合法结果', () => {
    expect(() => DungeonGenResultSchema.parse(result)).not.toThrow();
  });

  it('数组长度不对时拒绝', () => {
    expect(() => DungeonGenResultSchema.parse({ ...result, 支线任务: result.支线任务.slice(0, 2) })).toThrow();
    expect(() => DungeonGenResultSchema.parse({ ...result, 副本成就: result.副本成就.slice(0, 5) })).toThrow();
  });

  it('拒绝越界的 AI 等级', () => {
    const 改等级 = (n: number) => ({
      ...result,
      其他契约者: [{ ...result.其他契约者[0], 等级: n }, result.其他契约者[1]],
    });
    expect(() => DungeonGenResultSchema.parse(改等级(0))).toThrow();
    expect(() => DungeonGenResultSchema.parse(改等级(201))).toThrow();
    expect(() => DungeonGenResultSchema.parse(改等级(11.5))).toThrow();
    expect(() => DungeonGenResultSchema.parse(改等级(11))).not.toThrow();
  });

  it('拒绝不在枚举里的位阶', () => {
    const 坏 = { ...result, 固有角色: [{ 名称: '某人', 位阶: '三阶·战略兵器级', 等级: 50 }, result.固有角色[1]] };
    expect(() => DungeonGenResultSchema.parse(坏)).toThrow();
  });
});

describe('clamp固有角色等级', () => {
  it('把越界的固有角色等级夹进该阶位区间', () => {
    expect(clamp固有角色等级('三阶', 5)).toBe(41);
    expect(clamp固有角色等级('三阶', 999)).toBe(60);
    expect(clamp固有角色等级('三阶', 50)).toBe(50);
    expect(clamp固有角色等级('凡人极限', 77)).toBe(1);
    expect(clamp固有角色等级('超脱', 3)).toBe(101);
  });
});

describe('mapToVariables', () => {
  const vars = mapToVariables(result, build, rewards, player);

  it('写入基准等级 = 玩家当前等级 + CR 档偏移（不再是裸的玩家等级）', () => {
    // player: 等级 11, CR 4.5 → 关注档（4.1~6.0）→ +4
    expect((vars.当前副本元数据 as any).基准等级).toBe(15);
  });

  it('存档里的基准等级 === 敌人生成收到的基准等级（两处同源）', () => {
    // store.generateEnemies 走的就是这句: buildEnemyPrompt(..., 基准等级(player.等级, player.CR))
    // 分开写两遍偏移时, 这里会红 —— 那正是写进存档的基准等级与敌人实际等级对不上的情形
    const 写给存档 = (vars.当前副本元数据 as any).基准等级;
    const 给敌人 = 基准等级(player.等级, player.CR);
    expect(写给存档).toBe(给敌人);
    const p = buildEnemyPrompt(build, '契约者: 刘林', '', 给敌人);
    expect(p).toContain('主线基准等级 = Lv.15');
    expect(p).toContain('BOSS Lv.18');     // round(15 × 1.2)
    expect(p).toContain('杂兵 Lv.9');      // round(15 × 0.6)
    // 反退化: 若某处又退回裸的玩家等级, 敌人等级会变成 round(11×…) 那一套
    expect(p).not.toContain('主线基准等级 = Lv.11');
  });

  it('副本类型取构建骰的有效值', () => {
    expect((vars.当前副本元数据 as any).副本类型).toBe('血腥');
  });

  it('时间限制取已锁定的骰值, 而不是 AI 返回的字符串', () => {
    // fixture 里 build.时间限制天 === 7
    expect((vars.当前副本元数据 as any).时间限制).toBe('7天');
  });

  it('主线任务奖励由骰值拼装, 状态为进行中', () => {
    const 主线 = (vars.当前副本任务 as any).主线任务;
    expect(主线.奖励).toBe('342 UP + 187 EXP');
    expect(主线.状态).toBe('进行中');
  });

  it('支线任务以任务名为键', () => {
    const 支线 = (vars.当前副本任务 as any).支线任务;
    expect(Object.keys(支线)).toEqual(['支线一', '支线二', '支线三']);
    expect(支线.支线一.奖励).toBe('120 UP + 40 EXP + 【金色】装备：接入仓');
  });

  it('世界事件把「影响」写进变量的奖励字段', () => {
    const 世界事件 = (vars.当前副本任务 as any).世界事件;
    expect(世界事件.事件一.奖励).toBe('影响一');
    expect(世界事件.事件一.状态).toBe('进行中');
  });

  it('隐藏任务初始状态为未触发', () => {
    const 隐藏 = (vars.当前副本任务 as any).隐藏任务;
    expect(隐藏.隐藏一.状态).toBe('未触发');
    expect(隐藏.隐藏一.奖励).toBe('400 UP + 220 EXP + 2 RP + 【金色】装备：黑墙碎片');
  });

  it('成就带梯度星级的难度字段, 初始未达成', () => {
    const 成就 = (vars.当前副本任务 as any).副本成就;
    const keys = Object.keys(成就);
    expect(keys[0]).toBe('成就一');
    expect(成就.成就一.难度).toBe('★ 探索级 · 顺路可完成');
    expect(成就.成就六.难度).toBe('★★★★★★ 世界天花板 · 触碰世界底层规则');
    expect(成就.成就一.状态).toBe('未达成');
  });

  it('称号为「无」的契约者写成「无称号」', () => {
    const 名单 = vars.其他契约者名单 as any;
    expect(名单.陈默.称号).toBe('无称号');
    expect(名单.林晚.称号).toBe('夜莺');
    expect(名单.陈默.状态).toBe('存活');
  });

  it('固有角色名单带位阶与等级', () => {
    const 名单 = vars.固有角色名单 as any;
    expect(名单['摩根·黑手']).toEqual({ 位阶: '四阶', 等级: 70, 状态: '存活' });
  });

  it('落库时等级已被夹进区间', () => {
    const 低 = { ...result, 固有角色: [{ 名称: '弱者', 位阶: '五阶', 等级: 3 }, result.固有角色[1]] };
    const v = mapToVariables(DungeonGenResultSchema.parse(低), build, rewards, player);
    expect((v.固有角色名单 as any).弱者.等级).toBe(81);
  });

  it('超脱的极大等级被夹进区间而不是让整次生成失败', () => {
    // 3000 落在超脱区间 [101, 99999] 内 → 原样保留; 关键是上限放宽后不再拒绝整次生成
    // (上限为旧值 999 时, 这里会抛 ZodError 让整次生成失败)
    const 大 = { ...result, 固有角色: [{ 名称: '背景板', 位阶: '超脱' as const, 等级: 3000 }, result.固有角色[1]] };
    const v = mapToVariables(DungeonGenResultSchema.parse(大), build, rewards, player);
    expect((v.固有角色名单 as any).背景板.等级).toBe(3000);
    // 低于区间下界的超脱值 → 夹到 101
    const 小 = { ...result, 固有角色: [{ 名称: '背景板', 位阶: '超脱' as const, 等级: 3 }, result.固有角色[1]] };
    const v2 = mapToVariables(DungeonGenResultSchema.parse(小), build, rewards, player);
    expect((v2.固有角色名单 as any).背景板.等级).toBe(101);
  });
});

describe('assemblePanelText', () => {
  const text = assemblePanelText(result, build, rewards, player);

  it('以 <Panel Enhancement> 包裹并闭合', () => {
    expect(text.startsWith('<Panel Enhancement>')).toBe(true);
    expect(text.trimEnd().endsWith('</Panel Enhancement>')).toBe(true);
  });

  it('包含三块子标签', () => {
    expect(text).toContain('<副本任务>');
    expect(text).toContain('</副本任务>');
    expect(text).toContain('<副本世界事件和成就列表>');
    expect(text).toContain('<副本人物生成>');
  });

  it('成就梯度输出全部 6 行且按 ★→★★★★★★ 顺序', () => {
    const idx = ['★ 探索级', '★★ 挑战级', '★★★ 破局级', '★★★★ 史诗级', '★★★★★ 传说级', '★★★★★★ 世界天花板'].map(s =>
      text.indexOf(s),
    );
    expect(idx.every(i => i >= 0)).toBe(true);
    for (let i = 1; i < idx.length; i++) expect(idx[i]).toBeGreaterThan(idx[i - 1]);
  });

  it('契约者名单格式为 [称号]真名 Lv.X', () => {
    expect(text).toContain('[无称号]陈默 Lv.11');
    expect(text).toContain('[夜莺]林晚 Lv.12');
  });

  it('固有角色格式为 名称 (Lv.X | 阶位)', () => {
    expect(text).toContain('摩根·黑手 (Lv.70 | 四阶)');
  });
});
