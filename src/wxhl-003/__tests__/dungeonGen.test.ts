import { describe, expect, it } from 'vitest';
import type { BuildRoll, RollRecord } from '../dice';
import { buildDungeonPrompt, buildEnemyPrompt, buildEnterPrompt, mapEnemiesToVariables } from '../dungeonGen';

const build: BuildRoll = {
  副本类型: '和平',
  媒介来源: '民俗怪谈',
  题材大类: '现代/异能',
  时代背景: '现代/当代',
  核心特色标签: '规则怪谈/怪异模因',
  核心特色标签骰: 7,
  副模块: '密室解谜',
  副模块骰: 11,
  IP热度: '中等',
  IP热度骰: 20,
  时间限制天: 5,
  是新手副本: false,
  是日常副本: false,
};

const records: RollRecord[] = [
  { 标签: '副本类型', 表达式: '1d4', 骰值: 1, 映射: '和平' },
  { 标签: '核心特色标签', 表达式: '1d50', 骰值: 7, 映射: '规则怪谈/怪异模因' },
  { 标签: '主线·UP', 表达式: '1d100+250', 骰值: 92, 映射: '342' },
];

describe('buildDungeonPrompt', () => {
  const p = buildDungeonPrompt(build, records, '契约者: 刘林\n等级: Lv.11', '世界书内容', '人榜候选…', '二阶');

  it('包含规则原文的关键节', () => {
    expect(p).toContain('副本生成');
    expect(p).toContain('日常副本调和规则');
  });

  it('包含全部锁定骰值与其映射', () => {
    expect(p).toContain('1d100+250');
    expect(p).toContain('342');
    expect(p).toContain('规则怪谈/怪异模因');
  });

  it('带禁止改动骰值的死命令', () => {
    expect(p).toContain('严禁');
    expect(p).toContain('改动、重掷、忽略、四舍五入或自行编造');
  });

  it('带上玩家数据与匹配池原文', () => {
    expect(p).toContain('契约者: 刘林');
    expect(p).toContain('人榜候选…');
  });

  it('要求只返回 JSON', () => {
    expect(p).toContain('JSON');
  });

  it('含「规则原文格式不适用本次生成」的优先级声明', () => {
    expect(p).toContain('不适用于本次生成');
  });

  it('时间限制天数写进 prompt', () => {
    expect(p).toContain('时间限制: 5 天');
  });

  it('把契约者阶位作为物品的硬性约束写进 prompt', () => {
    const p2 = buildDungeonPrompt(build, records, '契约者: 刘林', '世界书内容', '人榜候选…', '三阶');
    expect(p2).toContain('阶位固定为【三阶】');
  });
});

describe('buildEnterPrompt', () => {
  const result = { 副本名称: '夜雨霓虹' } as any;
  const p = buildEnterPrompt(result, build);

  it('是玩家第一人称视角', () => {
    expect(p).toContain('我');
    expect(p).toContain('传送完成');
  });

  it('点名要 AI 读取的变量路径', () => {
    for (const k of ['当前副本元数据', '当前副本任务', '其他契约者名单', '固有角色名单']) {
      expect(p).toContain(k);
    }
  });

  it('要求输出进入副本后的场景', () => {
    expect(p).toContain('场景');
  });
});

describe('敌人生成占位', () => {
  it('buildEnemyPrompt 明确抛出「规则待实现」而不是返回空串', () => {
    expect(() => buildEnemyPrompt()).toThrow(/待实现/);
  });

  it('mapEnemiesToVariables 同样抛出', () => {
    expect(() => mapEnemiesToVariables()).toThrow(/待实现/);
  });
});
