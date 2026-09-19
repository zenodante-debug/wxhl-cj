import { describe, expect, it } from 'vitest';
import type { BuildRoll, RollRecord } from '../dice';
import { buildDungeonPrompt, buildEnemyPrompt, buildEnterPrompt } from '../dungeonGen';

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
  const p = buildDungeonPrompt(build, records, '契约者: 刘林\n等级: Lv.11', '世界书内容', '人榜候选…', '二阶', 11);

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
    const p2 = buildDungeonPrompt(build, records, '契约者: 刘林', '世界书内容', '人榜候选…', '三阶', 47);
    expect(p2).toContain('阶位固定为【三阶】');
  });

  it('把固有角色锚定规则与队伍最高等级写进 prompt', () => {
    const p3 = buildDungeonPrompt(build, records, '契约者: 刘林', '世界书内容', '人榜候选…', '三阶', 47);
    expect(p3).toContain('固有角色锚定与战力表现');
    expect(p3).toContain('队伍最高等级】Lv.47');
    expect(p3).toContain('本次副本剧情实际牵涉到');
    expect(p3).toContain('不要一律挑该世界观');
    expect(p3).toContain('不代表该档就该是这些名角色');
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

describe('buildEnemyPrompt', () => {
  it('敌人 prompt 含三类型、基准等级、内联规则与必需字段', () => {
    const p = buildEnemyPrompt(build, '契约者: 刘林', '世界书内容', 11);
    expect(p).toContain('Lv.11');
    expect(p).toContain('杂兵');
    expect(p).toContain('精英');
    expect(p).toContain('BOSS');
    expect(p).toContain('副本角色生成规则');   // 内联规则确实注入了
    expect(p).toContain('威胁');               // 面板靠它
    expect(p).toContain('装备防御');
  });

  it('把写入白名单铁律与装备防闪绝对值公式整段带上', () => {
    const p = buildEnemyPrompt(build, '契约者: 刘林', '', 11);
    expect(p).toContain('严禁写入');
    expect(p).toContain('装备防闪绝对值公式');
  });

  it('带上玩家数据与世界书参考原文', () => {
    const p = buildEnemyPrompt(build, '契约者: 刘林', '世界书内容', 11);
    expect(p).toContain('契约者: 刘林');
    expect(p).toContain('世界书内容');
  });

  it('按公式算好三者的等级并写进 prompt', () => {
    const p = buildEnemyPrompt(build, '契约者: 刘林', '', 20);
    expect(p).toContain('杂兵 Lv.12');   // round(20 × 0.6)
    expect(p).toContain('精英 Lv.18');   // round(20 × 0.9)
    expect(p).toContain('BOSS Lv.24');   // round(20 × 1.2)
  });

  it('敌人 prompt 声明了面板协议的优先级, 并收集剧情性加成', () => {
    const p = buildEnemyPrompt(build, '契约者: 刘林', '世界书内容', 11);
    expect(p).toContain('不适用于本次生成');
    expect(p).toContain('属性自定义加成');
    // 把失败模式点死: AI 若在 JSON 前后追一份面板, extractJSON 会解析失败
    expect(p).toContain('在 JSON 前后输出任何 <enemy> 面板或状态卡');
  });
});
