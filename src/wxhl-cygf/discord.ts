import { PANEL_ID, workshopOrigin } from './panel';

export const AUTH_CHANNEL = 'wxhl-workshop:auth';
/** 挂在酒馆主窗口上的运行时键：热重载时用它找到并拆掉上一实例的监听 */
const AUTH_RUNTIME_KEY = '__wxhlCygfAuthTeardown';

export type AuthMessage =
  | { kind: 'open'; url: string }
  | { kind: 'success'; hash: string }
  | { kind: 'error'; error: string; errorDescription?: string };

/** 把原始 postMessage data 归类为登录消息；不认得的一律 null */
export function classifyAuthMessage(data: unknown): AuthMessage | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, any>;
  if (d.channel !== AUTH_CHANNEL) return null;
  switch (d.action) {
    case 'openDiscordLogin':
      return typeof d.url === 'string' && d.url !== '' ? { kind: 'open', url: d.url } : null;
    case 'discordLoginSuccess':
      return typeof d.hash === 'string' ? { kind: 'success', hash: d.hash } : null;
    case 'discordLoginError':
      return {
        kind: 'error',
        error: typeof d.error === 'string' && d.error !== '' ? d.error : '未知错误',
        errorDescription: typeof d.errorDescription === 'string' ? d.errorDescription : undefined,
      };
    default:
      return null;
  }
}

/**
 * 登录转发（范例一职责，修正其通配符 origin 缺陷）：
 * 工坊请求开授权弹窗 → 授权完成页通知 opener → 宿主把 hash 转发回工坊 iframe（限定工坊 origin）。
 * 挂在酒馆主页面窗口上；返回拆卸函数。
 */
export function installAuthRelay(): () => void {
  let loginWindow: Window | null = null;
  let workshopFrame: Window | null = null;

  const getFrameWindow = (): Window | null =>
    ($(`#${PANEL_ID} iframe.wxhl-cygf-frame`)[0] as HTMLIFrameElement | undefined)?.contentWindow ?? null;

  const listener = (event: MessageEvent) => {
    if (event.origin !== workshopOrigin()) {
      console.warn(`[wxhl创意工坊] 拒绝来自 ${event.origin} 的登录消息`);
      return;
    }
    const message = classifyAuthMessage(event.data);
    if (!message) return;
    switch (message.kind) {
      case 'open': {
        if (loginWindow && !loginWindow.closed) loginWindow.close();
        workshopFrame = (event.source as Window | null) ?? getFrameWindow();
        loginWindow = window.parent.open(message.url, 'discord_login', 'width=600,height=800,scrollbars=yes,resizable=yes');
        if (!loginWindow) {
          toastr.warning('请允许弹出窗口以完成 Discord 登录', '创意工坊');
          return;
        }
        toastr.info('请在弹出窗口中完成 Discord 登录', '创意工坊');
        return;
      }
      case 'success': {
        const target = workshopFrame && !workshopFrame.closed ? workshopFrame : getFrameWindow();
        if (!target) {
          toastr.warning('登录已完成，但工坊面板已关闭 —— 请重新打开创意工坊', '创意工坊');
        } else {
          target.postMessage({ channel: AUTH_CHANNEL, action: 'discordLoginComplete', hash: message.hash }, workshopOrigin());
          toastr.success('Discord 登录成功', '创意工坊');
        }
        setTimeout(() => {
          if (loginWindow && !loginWindow.closed) loginWindow.close();
        }, 200);
        return;
      }
      case 'error': {
        toastr.error(message.errorDescription ?? message.error, 'Discord 登录失败');
        if (loginWindow && !loginWindow.closed) loginWindow.close();
        return;
      }
    }
  };

  const target = window.parent ?? window;
  // 热重载不触发 pagehide：先拆上一实例的监听，否则一次登录请求会弹两个窗口、成功回执发两遍
  const previous = (target as any)[AUTH_RUNTIME_KEY];
  if (typeof previous === 'function') previous();

  target.addEventListener('message', listener);
  const teardown = () => {
    target.removeEventListener('message', listener);
    if ((target as any)[AUTH_RUNTIME_KEY] === teardown) delete (target as any)[AUTH_RUNTIME_KEY];
  };
  (target as any)[AUTH_RUNTIME_KEY] = teardown;

  console.info('[wxhl创意工坊] Discord 登录转发已启用');
  return teardown;
}
