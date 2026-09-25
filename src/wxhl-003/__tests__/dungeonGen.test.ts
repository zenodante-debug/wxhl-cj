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
  队友标签: '赛博朋克/矩阵空间',
  队友标签骰: 8,
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
  const p = buildDungeonPrompt(build, records, '契约者: 刘林\n等级: Lv.11', '世界书内容', '人榜候选…', '二阶', 11, '危机四伏');

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
    const p2 = buildDungeonPrompt(build, records, '契约者: 刘林', '世界书内容', '人榜候选…', '三阶', 47, '九死一生');
    expect(p2).toContain('阶位固定为【三阶】');
  });

  it('把 CR 档的生机评估注入 prompt（氛围上下文, 不给数值）', () => {
    const p4 = buildDungeonPrompt(build, records, '契约者: 刘林', '世界书内容', '人榜候选…', '三阶', 47, '九死一生');
    expect(p4).toContain('回廊难度评估');
    expect(p4).toContain('生机评估: 【九死一生】');
    // 反退化: 换一档就必须跟着换 —— 断言钉在**带标签的那一行**上
    // （prompt 正文里也举例提过「九死一生」, 只断「不包含九死一生」会被正文顶绿）
    const p5 = buildDungeonPrompt(build, records, '契约者: 刘林', '世界书内容', '人榜候选…', '三阶', 47, '正常运转');
    expect(p5).toContain('生机评估: 【正常运转】');
    expect(p5).not.toContain('生机评估: 【九死一生】');
  });

  it('把固有角色锚定规则与队伍最高等级写进 prompt', () => {
    const p3 = buildDungeonPrompt(build, records, '契约者: 刘林', '世界书内容', '人榜候选…', '三阶', 47, '九死一生');
    expect(p3).toContain('固有角色锚定与战力表现');
    expect(p3).toContain('队伍最高等级】Lv.47');
    expect(p3).toContain('本次副本剧情实际牵涉到');
    expect(p3).toContain('不要一律挑该世界观');
    expect(p3).toContain('不代表该档就该是这些名角色');
  });
});

describe('buildDungeonPrompt · 队友来源锚定段', () => {
  const p = buildDungeonPrompt(build, records, '契约者: 刘林', '', '人榜候选…', '一阶', 11, '危机四伏');

  it('写明本次队友标签', () => {
    expect(p).toContain('赛博朋克/矩阵空间');
    expect(p).toContain('队友来源锚定');
  });

  it('写明「不得与本次副本世界观相同」', () => {
    expect(p).toContain('不得与本次副本世界观相同');
  });

  it('写明等级锚定与新手例外', () => {
    expect(p).toContain('资深契约者');
    expect(p).toContain('Lv.1 新人');
  });

  it('同人开关关闭时, 不出现「恰好 1 名同人契约者」', () => {
    const 关 = buildDungeonPrompt(build, records, '契约者: 刘林', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 同人契约者: { 开关: false, 性别: '不限' } });
    expect(关).not.toContain('恰好匹配 1 名同人契约者');

    const 开 = buildDungeonPrompt(build, records, '契约者: 刘林', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 同人契约者: { 开关: true, 性别: '女' } });
    expect(开).toContain('恰好匹配 1 名同人契约者');
    expect(开).toContain('女');
  });
});

describe('buildDungeonPrompt · 动态事件段', () => {
  it('不传事件段时, 整段不出现', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏');
    expect(p).not.toContain('本次副本的动态事件');
  });

  it('传了事件段时, 插在「回廊难度评估」之后、「契约者数据」之前', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 动态事件段: '【事件_白焰降临】\n正文在这里' });
    expect(p).toContain('正文在这里');
    expect(p.indexOf('回廊难度评估')).toBeLessThan(p.indexOf('正文在这里'));
    expect(p.indexOf('正文在这里')).toBeLessThan(p.indexOf('============ 契约者数据'));
  });

  it('事件段存在时, 锁定骰值段末尾追加「以动态事件为准」的例外', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 动态事件段: 'X' });
    expect(p).toContain('以动态事件为准');
  });

  it('事件段不存在时, 那句话一个字都不出现（不给不开事件的玩家引入松动）', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏');
    expect(p).not.toContain('以动态事件为准');
  });
});

describe('buildDungeonPrompt · 晋升试炼段', () => {
  it('触发时含「第 3 条支线必须就是【专属晋升任务】」', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏',
      undefined, undefined, { 晋升试炼: true });
    expect(p).toContain('第 3 条支线任务**必须就是【专属晋升任务】');
    expect(p).toContain('不干涉淘汰赛的生存与排名规则');
  });

  it('未触发时不含该段', () => {
    const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏');
    expect(p).not.toContain('【专属晋升任务】');
  });
});

describe('buildDungeonPrompt · 事件点名角色输出契约', () => {
  const p = buildDungeonPrompt(build, records, 'c', '', '池', '一阶', 11, '危机四伏');

  it('JSON 契约与说明里都声明了「事件点名角色」, 且禁止把契约者本人列进去', () => {
    expect(p).toContain('事件点名角色');
    expect(p).toContain('不要把契约者本人');
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
