import { afterEach, describe, expect, it, vi } from 'vitest';
import { AUTH_CHANNEL, classifyAuthMessage, installAuthRelay } from '../discord';

afterEach(() => vi.unstubAllGlobals());

describe('classifyAuthMessage · 登录消息分类', () => {
  it('openDiscordLogin → open（带 url）', () => {
    expect(classifyAuthMessage({ channel: AUTH_CHANNEL, action: 'openDiscordLogin', url: 'https://discord.com/oauth2/authorize?x' }))
      .toEqual({ kind: 'open', url: 'https://discord.com/oauth2/authorize?x' });
  });

  it('discordLoginSuccess → success（带 hash）', () => {
    expect(classifyAuthMessage({ channel: AUTH_CHANNEL, action: 'discordLoginSuccess', hash: '#token=abc' }))
      .toEqual({ kind: 'success', hash: '#token=abc' });
  });

  it('discordLoginError → error（errorDescription 可选）', () => {
    expect(classifyAuthMessage({ channel: AUTH_CHANNEL, action: 'discordLoginError', error: 'access_denied', errorDescription: '用户取消' }))
      .toEqual({ kind: 'error', error: 'access_denied', errorDescription: '用户取消' });
    expect(classifyAuthMessage({ channel: AUTH_CHANNEL, action: 'discordLoginError' }))
      .toEqual({ kind: 'error', error: '未知错误', errorDescription: undefined });
  });

  it.each([
    ['别的 channel', { channel: 'wxhl-workshop:worldbook', action: 'openDiscordLogin', url: 'https://x' }],
    ['未知 action', { channel: AUTH_CHANNEL, action: 'rm-rf' }],
    ['open 缺 url', { channel: AUTH_CHANNEL, action: 'openDiscordLogin' }],
    ['open 的 url 是空串', { channel: AUTH_CHANNEL, action: 'openDiscordLogin', url: '' }],
    ['success 缺 hash', { channel: AUTH_CHANNEL, action: 'discordLoginSuccess' }],
    ['非对象', 'discord'],
    ['null', null],
  ])('%s → null', (_label, data) => {
    expect(classifyAuthMessage(data)).toBeNull();
  });
});

describe('installAuthRelay · 重载守卫', () => {
  function makeTarget() {
    const listeners: unknown[] = [];
    return {
      listeners,
      target: {
        addEventListener: vi.fn((_type: string, listener: unknown) => {
          listeners.push(listener);
        }),
        removeEventListener: vi.fn((_type: string, listener: unknown) => {
          const index = listeners.indexOf(listener);
          if (index >= 0) listeners.splice(index, 1);
        }),
      },
    };
  }

  it('重复安装先拆上一实例的监听：热重载不会一次登录弹两个窗口', () => {
    const { listeners, target } = makeTarget();
    vi.stubGlobal('window', { parent: target });
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({}));
    vi.stubGlobal('getScriptId', vi.fn().mockReturnValue('x'));
    installAuthRelay();
    const firstListener = listeners[0];
    installAuthRelay();
    expect(target.removeEventListener).toHaveBeenCalledWith('message', firstListener);
    expect(listeners).toHaveLength(1);
  });
});
