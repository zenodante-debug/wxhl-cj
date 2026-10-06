import { describe, expect, it } from 'vitest';
import { Settings, 默认设置 } from '../settings';

describe('settings · 设置 schema', () => {
  it('空对象 → 填默认', () => {
    const s = Settings.parse({});
    expect(s.快路.url).toBe('');
    expect(s.快路.model).toBe('');
    expect(s.强路.model).toBe('');
  });

  it('部分字段 → 其余填默认', () => {
    const s = Settings.parse({ 快路: { url: 'https://a.b', model: 'flash' } });
    expect(s.快路.url).toBe('https://a.b');
    expect(s.快路.apiKey).toBe('');
  });

  it('二次 parse 幂等', () => {
    const a = Settings.parse({ 快路: { url: 'x', apiKey: 'k', model: 'm', timeout: 30000 } });
    expect(Settings.parse(a)).toEqual(a);
  });

  it('默认设置常量合法', () => {
    expect(Settings.parse(默认设置)).toEqual(默认设置);
  });
});
