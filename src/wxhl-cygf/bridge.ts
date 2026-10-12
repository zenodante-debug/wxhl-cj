import { dispatchAction } from './actions';
import { PANEL_ID } from './panel';

export const BRIDGE_CHANNEL = 'wxhl-workshop:worldbook';

export interface BridgeRequest {
  channel: typeof BRIDGE_CHANNEL;
  kind: 'request';
  id: string;
  action: string;
  payload: Record<string, any>;
}

export type BridgeResponse =
  | { channel: typeof BRIDGE_CHANNEL; kind: 'response'; id: string; ok: true; payload: unknown }
  | { channel: typeof BRIDGE_CHANNEL; kind: 'response'; id: string; ok: false; error: string };

export function parseBridgeRequest(data: unknown): BridgeRequest | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, any>;
  if (d.channel !== BRIDGE_CHANNEL || d.kind !== 'request') return null;
  if (typeof d.id !== 'string' || d.id === '') return null;
  if (typeof d.action !== 'string' || d.action === '') return null;
  return {
    channel: BRIDGE_CHANNEL,
    kind: 'request',
    id: d.id,
    action: d.action,
    payload: (d.payload ?? {}) as Record<string, any>,
  };
}

export function successResponse(id: string, payload: unknown): BridgeResponse {
  return { channel: BRIDGE_CHANNEL, kind: 'response', id, ok: true, payload };
}

export function failureResponse(id: string, error: unknown): BridgeResponse {
  return {
    channel: BRIDGE_CHANNEL,
    kind: 'response',
    id,
    ok: false,
    error: error instanceof Error ? error.message : String(error),
  };
}

// ==================== 监听器装配 ====================
/** 挂在酒馆主窗口上的运行时键：热重载时用它找到并拆掉上一实例的监听 */
const BRIDGE_RUNTIME_KEY = '__wxhlCygfBridgeTeardown';

export interface BridgeDeps {
  allowedOrigin: string;
  dispatch: (action: string, payload: Record<string, any>) => Promise<unknown>;
  /** 只有这个 window 能驱动桥（面板 iframe）；返回 null 表示跳过该校验（测试/未开面板时） */
  expectedSource?: () => Window | null;
}

let hostReply: ((target: Window, message: unknown, origin: string) => void) | null = null;
let hostReplyUnavailable = false;

/**
 * 回包：在**宿主页面域**里执行 postMessage，让页面收到的 `event.source` 是酒馆主窗口。
 *
 * 为什么需要：脚本跑在兄弟 iframe 里，直接 `target.postMessage(...)` 时页面看到的
 * `event.source` 是**本脚本 iframe**；而页面（或将来收紧的页面）会校验
 * `event.source === window.parent`（2026-10-11 我们正因此把桥整条打断过）。
 * 在宿主域里执行后 source 就是酒馆主窗口，两边口径一致。
 * 宿主域不可用（CSP 禁 `Function` 等）时回退直接回包 —— 页面当前不校验 source，同样能送达。
 */
function sendBridgeReply(target: Window, message: unknown, origin: string): void {
  // 测试环境（node）没有 window：直接回包即可
  if (typeof window === 'undefined') {
    target.postMessage(message, origin);
    return;
  }
  const host = (window.parent ?? window) as Window & { Function?: FunctionConstructor };
  if (host !== window && !hostReplyUnavailable) {
    try {
      if (!hostReply) {
        // 固定可信代码，请求数据只作为参数传入，绝不拼接成代码
        hostReply = new (host as unknown as { Function: FunctionConstructor }).Function(
          'targetWindow',
          'message',
          'targetOrigin',
          '"use strict"; targetWindow.postMessage(message, targetOrigin);',
        ) as (t: Window, m: unknown, o: string) => void;
      }
      hostReply(target, message, origin);
      return;
    } catch (error) {
      hostReplyUnavailable = true;
      console.warn('[wxhl创意工坊] 宿主域回包不可用，回退直接回包:', error);
    }
  }
  target.postMessage(message, origin);
}

/** 面板 iframe 的 window —— 只有它能驱动桥（别的脚本/框架发来的请求一律丢） */
export function panelFrameWindow(): Window | null {
  try {
    const doc = (window.parent ?? window).document;
    const frame = doc.querySelector(`#${PANEL_ID} iframe.wxhl-cygf-frame`) as HTMLIFrameElement | null;
    return frame?.contentWindow ?? null;
  } catch {
    return null;
  }
}

/**
 * 依赖注入的监听器工厂：真实装配和测试共用同一套校验/分发/回包逻辑。
 * 安全约定：只接受 allowedOrigin 且来自面板 iframe 的请求；回包发 event.origin，绝不用 '*'。
 */
export function createBridgeListener(deps: BridgeDeps): (event: MessageEvent) => Promise<void> {
  return async (event: MessageEvent) => {
    const request = parseBridgeRequest(event.data);
    if (!request) return;
    if (event.origin !== deps.allowedOrigin) {
      console.warn(`[wxhl创意工坊] 拒绝来自 ${event.origin} 的桥接消息`);
      return;
    }
    const expected = deps.expectedSource?.() ?? null;
    if (expected && event.source !== expected) return;
    const source = event.source as Window | null;
    try {
      const payload = await deps.dispatch(request.action, request.payload);
      if (source) sendBridgeReply(source, successResponse(request.id, payload), event.origin);
    } catch (error) {
      console.error(`[wxhl创意工坊] 桥接动作 ${request.action} 失败:`, error);
      if (source) sendBridgeReply(source, failureResponse(request.id, error), event.origin);
    }
  };
}

/** 挂到酒馆主页面窗口（工坊 iframe 的 postMessage 发往其父窗口）。返回拆卸函数。 */
export function installBridge(allowedOrigin: string): () => void {
  const target = window.parent ?? window;
  // 脚本热重载不会触发 pagehide：重载时必须先拆掉上一实例的监听，
  // 否则一条请求会被处理两次（世界书写两遍、同一 id 回两个包）
  const previous = (target as any)[BRIDGE_RUNTIME_KEY];
  if (typeof previous === 'function') previous();

  const listener = createBridgeListener({ allowedOrigin, dispatch: dispatchAction, expectedSource: panelFrameWindow });
  target.addEventListener('message', listener);

  const teardown = () => {
    target.removeEventListener('message', listener);
    if ((target as any)[BRIDGE_RUNTIME_KEY] === teardown) delete (target as any)[BRIDGE_RUNTIME_KEY];
  };
  (target as any)[BRIDGE_RUNTIME_KEY] = teardown;

  console.info('[wxhl创意工坊] 世界书桥接已启用, 允许来源:', allowedOrigin);
  return teardown;
}
