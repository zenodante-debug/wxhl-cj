import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_WORKSHOP_URL, panelRects, panelViewport, resolveWorkshopUrl, shouldTogglePanel, workshopOrigin } from '../panel';

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
    ['userinfo 指向他域', 'https://cygf.657868.xyz@evil.com'],
    ['带凭据的地址', 'https://user:pass@evil.com'],
    ['破坏 HTML 属性的值', 'https://x" onmouseover="alert(1)'],
    ['引号破坏属性（无空格）', 'https://x"onload="alert(1)"'],
    ['不是 URL', 'not a url'],
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

describe('panelViewport / panelRects · 手机端落位（2026-10-12 照抄社区改进版）', () => {
  it('可视视口含 offset 与回退', () => {
    const withVv = { visualViewport: { offsetLeft: 5, offsetTop: 7, width: 360, height: 640 }, innerWidth: 999, innerHeight: 999 } as unknown as Window;
    expect(panelViewport(withVv)).toEqual({ left: 5, top: 7, width: 360, height: 640 });
    const noVv = { innerWidth: 800, innerHeight: 600 } as unknown as Window;
    expect(panelViewport(noVv)).toEqual({ left: 0, top: 0, width: 800, height: 600 });
  });

  it('手机（≤600）：iframe 铺满视口留 16px，不外溢', () => {
    const { panel, frame } = panelRects({ left: 0, top: 0, width: 390, height: 844 });
    expect(panel).toEqual({ left: 0, top: 0, width: 390, height: 844 });
    expect(frame.width).toBe(390 - 16);
    expect(frame.height).toBe(844 - 16);
    expect(frame.left).toBe(8);
    expect(frame.top).toBe(8);
  });

  it('桌面：96vw × min(820, 92vh)，上限 1180×820，且居中', () => {
    const wide = panelRects({ left: 0, top: 0, width: 2000, height: 1200 });
    expect(wide.frame.width).toBe(1180);
    expect(wide.frame.height).toBe(820);
    expect(wide.frame.left).toBe((2000 - 1180) / 2);
    const small = panelRects({ left: 0, top: 0, width: 1000, height: 700 });
    expect(small.frame.width).toBe(960);
    expect(small.frame.height).toBe(644);
  });
});
