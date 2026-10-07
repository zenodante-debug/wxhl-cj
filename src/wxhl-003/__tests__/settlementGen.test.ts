import { describe, expect, it } from 'vitest';
import { buildItemGenPrompt, buildSettlementEnterPrompt } from '../settlementGen';
import { assembleSettlementPanel, computeSettlement, type SettlementGenResult, type SettlementSnapshot } from '../settlementRules';
import { SETTLEMENT_RULES } from '../data';

/**
 * 2026-09-25 改: `buildSettlementPrompt`（让 AI 一次做六件事）已删除, 换成 `buildItemGenPrompt`
 * —— AI 只剩一件事: 按脚本给出的「完成清单 + 奖励原文」生成掉落物品。
 * 于是下面钉的是**新口径**: 只回 JSON、不许输出评价/称号/完成名单、不内联规则原文之外的东西。
 */
describe('buildItemGenPrompt', () => {
  const 完成清单 = '- 主线「血色的黎明」｜奖励原文: 250 UP + 500 EXP\n- 成就「初见」｜奖励原文: 20 UP + 40 EXP + 2 RP';
  const p = buildItemGenPrompt(完成清单, 'S', '关注', '[玩家]: 打完了', '世界书内容');

  it('内联了规则原文（装备/消耗品的生成规范在里面）', () => {
    expect(p).toContain('副本结算');
    expect(p).toContain('第一步_评价判定');
    expect(p).toContain('第十一步_副本经历与面板更新');
  });

  it('带【优先级声明】, 明确禁止输出结算面板', () => {
    expect(p).toContain('不适用于本次生成');
    expect(p).toContain('严禁');
    // 真断言: 显式禁止的那句本身。规则原文里没有这一句, 删掉优先级声明即红。
    expect(p).toContain('输出任何 <Settlement Beautification> 面板或结算画面');
  });

  it('只回 JSON: 结构里只有「掉落物品」一个字段', () => {
    expect(p).toContain('只返回一个 JSON 对象, 不要 markdown 代码块, 不要任何解释文字');
    expect(p).toContain('"掉落物品": [ { "名称": "字符串", "品质": "字符串", "属性": "字符串", "效果": "字符串", "数量": 1 } ]');
  });

  it('新口径: 点名「不要输出评价 / 称号 / 史诗记录 / 完成名单」', () => {
    // AI 不再判任何东西 —— 它若照旧回一份评价, 那些字段会被丢弃, 但更糟的是可能把
    // 面板文本一起吐出来（`extractJSON` 解析失败 → 整次白跑）。所以这条要逐字在场。
    expect(p).toContain('**不要**输出评价等级、击杀、濒死、完成名单、称号、史诗记录');
    expect(p).toContain('评价与完成情况已由系统从变量判定完毕, 你输出的这些字段会被丢弃');
  });

  it('日数不再由 AI 读（天数改由脚本解析变量的 客观时间）', () => {
    // 真断言: '客观时间'/'副本日期' 都不在规则原文 SETTLEMENT_RULES 里（见 data.ts 的 grep）,
    // 所以这两条只在**有人把天数判断塞回这个 prompt** 时才成立 —— 那正是要挡的回归。
    expect(p).not.toContain('客观时间');
    expect(p).not.toContain('副本日期');
  });

  it('技能以物品形式发放, 不另立字段', () => {
    expect(p).toContain('技能书');
    expect(p).toContain('卷轴');
    expect(p).toContain('不要另立字段');
  });

  it('数量与效果的类型要求点名（填 0 会让整次 parse 失败）', () => {
    expect(p).toContain('至少为 1');
    expect(p).toContain('填 0 会让整次 parse 失败');
    expect(p).toContain('写成字符串');
    expect(p).toContain('没有掉落就给空数组');
  });

  it('带上完成清单（含奖励原文）、评价、CR 态度、聊天记录与世界书', () => {
    expect(p).toContain(完成清单);
    expect(p).toContain('- 评价等级: S');
    expect(p).toContain('- 结算前回廊态度（CR态）: 关注');
    expect(p).toContain('[玩家]: 打完了');
    expect(p).toContain('世界书内容');
  });

  it('空聊天 / 空世界书时回退到占位串', () => {
    const q = buildItemGenPrompt('（无）', 'D', '漠视', '', '');
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
    // 夹具必须同时撑起「分隔符」与「空值占位」两条路径, 否则防漂移测试是假锁:
    // 单元素数组的 join 不产生分隔符; 说明非空则占位常量永不执行。
    // 于是这里**每组都放两条**（逼出 `；`), 并各放**一条说明为空**的（逼出 无说明 / 无达成条件）。
    成就清单: [
      { 名称: '初见', 说明: '', 难度: '★ 探索级 · 顺路可完成', 奖励: '20 UP + 40 EXP + 2 RP' },   // 已达成 + 说明空 → 无说明
      { 名称: '血雨初尝', 说明: '第一次沾到血', 难度: '★★ 挑战级 · 顺路可完成', 奖励: '40 UP + 80 EXP' },
      { 名称: '血雨行者', 说明: '在血雨里不闪不避站满全程', 难度: '★★★★★★ 世界天花板 · 绝无仅有', 奖励: '500 UP + 900 EXP' },
      { 名称: '无人问津', 说明: '', 难度: '★★★ 破局级 · 组队可完成', 奖励: '60 UP + 120 EXP' },   // 未达成 + 说明空 → 无达成条件
    ],
    隐藏任务清单: [
      { 名称: '旧日回响', 说明: '钟楼下把旧日的回响听完', 奖励: '80 UP + 150 EXP' },
      { 名称: '无人知晓', 说明: '', 奖励: '999 UP + 999 EXP' },                                    // 说明空 → 无说明
    ],
    小队成员: [{ 名称: '阿澈', 当前EXP: 500, 当前UP: 9 }],
  } as SettlementSnapshot;
  const 假AI = {
    评价等级: 'S', 评价依据: '…', 击杀: { 精英: 2, BOSS: 1, 隐藏BOSS: 1 },
    濒死次数: 0, 副本天数: 3,
    完成的支线: ['收集物资'], 完成的隐藏任务: ['旧日回响'], 达成的成就: ['初见', '血雨初尝'],
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

  it('第二组: 掉落 / 现实时间 都在场', () => {
    expect(p).toContain('- 掉落清单: 血刃（金色｜STR+5｜流血）×1');
    expect(p).toContain(`- 现实时间: ${c.新现实日期} ${快照.当前现实时间}`);
  });

  it('第二组: 称号与史诗记录**不在**模块给出的结果清单里（它们是正文 AI 的活）', () => {
    // 2026-09-25 改: 模块不再提供称号与史诗记录, 于是清单里不该出现这两行 ——
    // 若它们还在, AI 会拿一个模块编的名字去叙述, 而真正写进存档的是它自己生成的另一个称号。
    expect(p).not.toContain('- 称号获得: ');
    expect(p).not.toContain('- 称号效果: ');
    expect(p).not.toContain('- 史诗记录: ');
  });

  it('第二组: 成就 / 隐藏任务公示与结算面板**逐字同口径**（列 / 分隔符 / 空值占位都一致）', () => {
    // 「同面板口径」不是「看起来像」: 把两侧同一行的**值**取出来逐字比。
    // 任一侧改了列（难度 / 完成描述 / 达成条件）、分隔符（；/ 、/ ｜）或空值占位文案 → 此条即红。
    // 这也是「两份格式助手拷贝不许漂开」的钉子（本次审查明确不合并这两份拷贝, 只锁行为一致）。
    const 面板 = assembleSettlementPanel(c, 假AI, 快照);
    const 取值 = (文本: string, 前缀: string) => (文本.split('\n').find(l => l.startsWith(前缀)) ?? '').slice(前缀.length);
    for (const 标签 of ['副本成就已达成', '副本成就未达成', '隐藏任务公示']) {
      expect(取值(p, '- ' + 标签 + ': ')).toBe(取值(面板, '## ' + 标签 + ': '));
    }
    // 反退化 A: 三条都非空（否则「两侧都空」也会绿）
    expect(取值(p, '- 副本成就已达成: ')).not.toBe('');
    expect(取值(p, '- 副本成就未达成: ')).not.toBe('');
    expect(取值(p, '- 隐藏任务公示: ')).not.toBe('');
    // 反退化 B: 夹具必须真的走到「分隔符」与「空值占位」两条分支 —— 否则上面那条整值比对
    // 在**单元素数组 / 说明全非空**的夹具下是**假锁**（join 不产生分隔符、占位常量永不执行,
    // 把 gen 侧的分隔符或占位改坏也照样全绿）。这里正面钉住夹具确实覆盖了这两条路径。
    for (const 标签 of ['副本成就已达成', '副本成就未达成', '隐藏任务公示']) {
      expect(取值(p, '- ' + 标签 + ': ')).toContain('；');
    }
    expect(取值(p, '- 副本成就已达成: ')).toContain('（变量中未记录说明）');
    expect(取值(p, '- 副本成就未达成: ')).toContain('（变量中未记录达成条件）');
    expect(取值(p, '- 隐藏任务公示: ')).toContain('（变量中未记录说明）');
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
    // 这几句是本功能的核心 —— 规则原文里有整套结算流程, AI 看到「结算」极可能自己再跑一遍,
    // 而本模块是累加语义: 重复应用会让玩家数值翻倍且不可撤销。逐字断言, 删一句即红。
    expect(p).toContain('本次副本的结算已经由系统全部执行完毕');
    expect(p).toContain('所有变量都已经写进存档了');
    expect(p).toContain('所以下面五条是死命令, 必须逐条遵守');
    expect(p).toContain('1. 不要再执行 <副本结算> 的任何结算步骤。结算已经结束了 —— 没有第二次结算。');
    expect(p).toContain('2. 不要再修改任何变量。不要 insert、不要 replace、不要 delta、不要 set 任何字段, 一个都不要改。');
    expect(p).toContain('3. 不要再自己重算任何数值。');
    expect(p).toContain('只能照抄它们');
    expect(p).toContain('本次完全不适用, 请彻底忽略它。');
  });

  it('第三组: 约束力最强的那两句逐字在场（此前零覆盖 —— 删掉它们其余全绿）', () => {
    // 1) 违背后果句: 只有把「再加一倍 / 无法撤销 / 毁存档」讲明白, 模型才会当真。
    expect(p).toContain('会让玩家的 EXP / UP / RP / PEXP / 资格分在已结算的基础上再加一倍');
    expect(p).toContain('而这无法撤销, 会直接毁掉玩家的存档');
    // 2) 「结算」二字的特别提醒 —— 本 prompt 所处的场景里最容易被模型踩的那个坑。
    expect(p).toContain('不要因为你看到的剧情里有「结算」二字, 就再走一遍流程');
  });

  it('第三组: 显式禁止输出结算面板（规则原文末尾的 <Settlement Beautification> 格式）', () => {
    expect(p).toContain('只输出叙事, 不要输出任何结算面板');
    expect(p).toContain('不要输出 <Settlement Beautification> 格式的文本');
    expect(p).toContain('也不要输出「## 名称: 值」式的结算行');
  });

  // canary 标记: 散布在规则原文的第一 / 三 / 六 / 八 / 十一步, 供下面两条测试共用一个列表。
  const 规则标记 = [
    '第一步_评价判定',
    '第三步_EXP与UP基础核算',
    '第六步_PEXP结算',
    '第八步_掉落结算',
    '第十一步_副本经历与面板更新',
  ];

  it('第三组: 不内联规则原文（不给 AI 任何可以照着重跑的材料）', () => {
    // 1) 整段: 若有人把 SETTLEMENT_RULES 原样塞进来, 这条即红。
    //    （今天恒绿 —— 函数体根本不引用它; 它钉的是**将来**内部改动。）
    expect(p).not.toContain(SETTLEMENT_RULES);
    // 2) 分散标记: 只内联规则的**一部分**（例如只塞「第八步_掉落结算」或格式段）也必须红 ——
    //    单钉一个标记时, 部分内联不会触发。
    for (const 标记 of 规则标记) {
      expect(p).not.toContain(标记);
    }
    // 反退化: **逐个**确认上面每个标记确实在规则的原文里。
    // 只钉一个的话, 其余四个被改名时 `not.toContain` 会静默变成永真。
    for (const 标记 of 规则标记) {
      expect(SETTLEMENT_RULES).toContain(标记);
    }
  });

  it('第四组: 请求叙事结算空间, 并在末尾列出结算后流程的两个选项', () => {
    expect(p).toContain('请以【回廊结算空间】为场景写一段开场叙事');
    expect(p).toContain('进入休息周期');
    expect(p).toContain('回廊主城停留 24 小时');
    expect(p).toContain('花费 UP 延长副本滞留');
    expect(p).toContain('50 UP/天');
  });

  // 2026-09-25 改: 称号与副本经历不再由模块写入变量, 改由正文 AI 按本 prompt 补写。
  // 下面一组钉的就是那一段（称号的 A/S 闸门仍在, 只是从「模块印不印」变成「AI 写不写」）。
  describe('你要补写: 称号 与 副本经历', () => {
    it('点明要写哪两条路径, 并给出 MVU 命令的写法', () => {
      expect(p).toContain('你要补写：称号 与 副本经历');
      expect(p).toContain('契约者.头部.称号.当前称号');
      expect(p).toContain(`契约者.副本经历.${快照.副本名称}`);
      expect(p).toContain('_.set');
      expect(p).toContain('<UpdateVariable>');
      // 副本经历的字段名与写入清单/面板同口径（评价等级 + 简要说明）
      expect(p).toContain('"评价等级"');
      expect(p).toContain('"简要说明"');
      // 副本名必须逐字用变量里的那一个（否则会写出第二条不同的经历键）
      expect(p).toContain(`副本名**逐字**用「${快照.副本名称}」`);
    });

    it('把「这两项要你写」讲成死命令的**唯一**例外（否则与「一个字段都别改」自相矛盾）', () => {
      expect(p).toContain('上面死命令的**唯一**例外');
      expect(p).toContain('第 2 条的例外**仅限**本文末尾「你要补写」点名的两条路径');
      // 死命令本身仍在（不能因为有了例外就把整段约束撤掉）
      expect(p).toContain('不要 insert、不要 replace、不要 delta、不要 set 任何字段, 一个都不要改。');
    });

    it('A/S 级: 要求生成本副本专属称号并写入（不再是模块印一个名字）', () => {
      const 要求 = '请按契约者在本副本的表现生成一个**独一无二**的称号';
      expect(p).toContain(要求);
      expect(p).toContain('- 本次评价: S');
      // 反退化: 未达 A/S 的措辞不能同时出现（否则「允许 A/S」与「跳过」两句互相打架）
      expect(p).not.toContain('**不要**写这一条, 整个跳过');
    });

    it('非 A/S 级: 明确要求**不要**写称号这一条（规则第七步「未达 A 级直接跳过」）', () => {
      const cB = computeSettlement({ ...输入, 评价等级: 'B' }, 满骰());
      const pB = buildSettlementEnterPrompt(cB, 假AI, 快照);
      expect(pB).toContain('未达 A/S');
      expect(pB).toContain('跳过');
      expect(pB).toContain('**不要**写这一条, 整个跳过');
      // 反退化: B 级时不许再要求生成称号（否则上面那条在「两段都印」下也绿）
      expect(pB).not.toContain('请按契约者在本副本的表现生成一个**独一无二**的称号');
      // 副本经历与评价无关: 任何级别都要写, 所以它必须在场
      expect(pB).toContain(`契约者.副本经历.${快照.副本名称}`);
    });
  });
});
