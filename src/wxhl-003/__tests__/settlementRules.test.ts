import { describe, expect, it } from 'vitest';
import { parseRewardText } from '../settlementRules';

describe('parseRewardText', () => {
  it('解析标准的奖励文本', () => {
    expect(parseRewardText('50 UP + 100 EXP + 3 RP + 【金色】武器：某物'))
      .toEqual({ UP: 50, EXP: 100, RP: 3 });
  });

  it('没有 RP 段时 RP 记 0', () => {
    expect(parseRewardText('250 UP + 500 EXP')).toEqual({ UP: 250, EXP: 500, RP: 0 });
  });

  it('「无」与空串表示没有奖励, 记全 0（不是格式错误）', () => {
    expect(parseRewardText('无')).toEqual({ UP: 0, EXP: 0, RP: 0 });
    expect(parseRewardText('')).toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  it('数字为 0 也照常解析', () => {
    expect(parseRewardText('0 UP + 0 EXP')).toEqual({ UP: 0, EXP: 0, RP: 0 });
  });

  // 关键: 格式非法必须抛错, 绝不静默当 0 —— 静默当 0 会让玩家少拿奖励且无人察觉
  it('格式非法时抛错', () => {
    expect(() => parseRewardText('随便一段没有数字的文字')).toThrow();
    expect(() => parseRewardText('UP + 100 EXP')).toThrow();
    expect(() => parseRewardText('50 UP + 100 EXP + 3 RP + 【金色】武器：某物 + 尾巴')).toThrow();
  });

  it('抛出的错误里带上原始文本, 便于定位是哪一条任务', () => {
    expect(() => parseRewardText('坏掉的奖励')).toThrow(/坏掉的奖励/);
  });
});
