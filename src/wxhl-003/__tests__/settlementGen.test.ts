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
    expect(p).toContain('严禁');
    // 真断言: 显式禁止的那句本身。规则原文里没有这一句, 删掉优先级声明即红。
    expect(p).toContain('在 JSON 前后输出任何 <Settlement Beautification> 面板或结算画面');
  });

  it('武装 F 守卫: 主线失败必须填 "F"', () => {
    // 真断言: 规则原文里没有「填 "F"」这个串, 删掉 prompt 那句即红。
    expect(p).toContain('填 "F"');
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
