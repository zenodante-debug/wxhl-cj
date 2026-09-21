import { describe, expect, it } from 'vitest';
import { assembleMaker } from '../store';

// 回归测试：归一位阶 返回 0 基下标（一阶→0），制作者阶位必须 +1 转回 1 基，
// 否则一阶契约者 阶位上限=0，validateCraft 会拦住一切制作。
describe('assembleMaker · 制作者组装（归一位阶 0基→1基 回归）', () => {
  const fake = (阶位: string, 技能阶位: string) => ({
    头部: { 姓名: '老狼', 阶位 },
    属性: {
      基础: { STR: 8, AGI: 6, CON: 6, PER: 7 },
      属性修正值: { STR: 0, AGI: 0, CON: 0, PER: 2 },
    },
    通用技能: { 锻造: { 分类: '基础', 阶位: 技能阶位, 等级: 3 } },
    职业: { 名称: '无' },
  });

  it('一阶契约者：阶位上限=1、技能阶位=1（不能是0）', () => {
    const m = assembleMaker(fake('一阶', '一阶'), '锻造');
    expect(m.阶位上限).toBe(1);
    expect(m.技能?.阶位).toBe(1);
    expect(m.技能?.等级).toBe(3);
    expect(m.姓名).toBe('老狼');
  });

  it('三阶契约者：阶位上限=3、技能阶位=3', () => {
    const m = assembleMaker(fake('三阶', '三阶'), '锻造');
    expect(m.阶位上限).toBe(3);
    expect(m.技能?.阶位).toBe(3);
  });

  it('阶位认不出来时兜底为一阶（不产出0）', () => {
    const m = assembleMaker(fake('超脱', '？？？'), '锻造');
    expect(m.阶位上限).toBe(1);
    expect(m.技能?.阶位).toBe(1);
  });

  it('未掌握该行业技能：技能=undefined', () => {
    const m = assembleMaker(fake('一阶', '一阶'), '炼金');
    expect(m.技能).toBeUndefined();
  });
});
