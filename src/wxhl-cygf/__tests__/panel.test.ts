import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_WORKSHOP_URL, resolveWorkshopUrl, shouldTogglePanel, workshopOrigin } from '../panel';

afterEach(() => vi.unstubAllGlobals());

describe('resolveWorkshopUrl · 工坊地址', () => {
  it('脚本变量无覆盖 → 默认地址', () => {
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({}));
    vi.stubGlobal('getScriptId', vi.fn().mockReturnValue('script-id'));
    expect(resolveWorkshopUrl()).toBe(DEFAULT_WORKSHOP_URL);
  });

  it('脚本变量给了合法 https 地址 → 用覆盖值', () => {
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({ wxhl_cygf_workshop_url: 'https://test.657868.xyz/' }));
    vi.stubGlobal('getScriptId', vi.fn().mockReturnValue('script-id'));
    expect(resolveWorkshopUrl()).toBe('https://test.657868.xyz/');
  });

  it.each([
    ['http 明文', 'http://insecure.example.com'],
    ['空串', ''],
    ['非字符串', 42],
  ])('非法覆盖值（%s）→ 回退默认', (_label, value) => {
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({ wxhl_cygf_workshop_url: value }));
    vi.stubGlobal('getScriptId', vi.fn().mockReturnValue('script-id'));
    expect(resolveWorkshopUrl()).toBe(DEFAULT_WORKSHOP_URL);
  });

  it('getVariables 抛错 → 回退默认（读变量失败不该炸面板）', () => {
    vi.stubGlobal('getVariables', vi.fn(() => { throw new Error('变量系统不可用'); }));
    vi.stubGlobal('getScriptId', vi.fn().mockReturnValue('script-id'));
    expect(resolveWorkshopUrl()).toBe(DEFAULT_WORKSHOP_URL);
  });

  it('workshopOrigin 取 URL 的 origin', () => {
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({}));
    vi.stubGlobal('getScriptId', vi.fn().mockReturnValue('x'));
    expect(workshopOrigin()).toBe('https://cygf.657868.xyz');
  });
});

describe('shouldTogglePanel · 打开防抖', () => {
  it('150ms 内重复触发 → 忽略；之后 → 放行', () => {
    expect(shouldTogglePanel(1000, 900)).toBe(false);
    expect(shouldTogglePanel(1000, 849)).toBe(true);
  });
});
