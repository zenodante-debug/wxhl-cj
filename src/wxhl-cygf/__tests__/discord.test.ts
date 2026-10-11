import { describe, expect, it } from 'vitest';
import { AUTH_CHANNEL, classifyAuthMessage } from '../discord';

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
