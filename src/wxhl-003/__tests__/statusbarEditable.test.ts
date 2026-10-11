// 可编辑原子：纯字符串函数，只吐 HTML，不碰 DOM。
import { describe, expect, it } from 'vitest';
import { editableKey, editSpan, editText, escapeAttr } from '../statusbar/editable';

describe('escapeAttr', () => {
  it('把双引号转义，避免炸属性', () => {
    expect(escapeAttr('a"b')).toBe('a&quot;b');
  });
  it('null / undefined 变空串', () => {
    expect(escapeAttr(null)).toBe('');
    expect(escapeAttr(undefined)).toBe('');
  });
});

describe('editSpan / editText', () => {
  it('editSpan 带 editable-num 与 data-path', () => {
    const h = editSpan(3, '契约者.特殊资源.职业.充能.当前');
    expect(h).toContain('class="editable-num"');
    expect(h).toContain('data-path="契约者.特殊资源.职业.充能.当前"');
  });
  it('editText 带 editable-text，且 data-val 里的引号被转义', () => {
    const h = editText('说"话"', '契约者.状态.特殊状态.中毒.说明');
    expect(h).toContain('class="editable-text"');
    expect(h).toContain('data-val="说&quot;话&quot;"');
  });
});

describe('editableKey', () => {
  it('data-path 指父对象、data-key 是当前键', () => {
    const h = editableKey('充能', '契约者.特殊资源.职业');
    expect(h).toContain('class="editable-key"');
    expect(h).toContain('data-path="契约者.特殊资源.职业"');
    expect(h).toContain('data-key="充能"');
  });
  it('键里的引号被转义', () => {
    expect(editableKey('a"b', 'p')).toContain('data-key="a&quot;b"');
  });
});
