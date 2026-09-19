import { describe, expect, it } from 'vitest';
import { buildSettlementPrompt } from '../settlementGen';

describe('buildSettlementPrompt', () => {
  const p = buildSettlementPrompt('契约者: 刘林', '[玩家]: 打完了', '世界书内容');

  it('内联了规则原文', () => {
    expect(p).toContain('副本结算');
    expect(p).toContain('第一步_评价判定');
    expect(p).toContain('第十一步_副本经历与面板更新');
  });

  it('带【优先级声明】, 明确禁止输出结算面板', () => {
    expect(p).toContain('不适用于本次生成');
    expect(p).toContain('Settlement Beautification');
    expect(p).toContain('严禁');
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
});
