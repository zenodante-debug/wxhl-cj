import { dispatchAction } from './actions';

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
export interface BridgeDeps {
  allowedOrigin: string;
  dispatch: (action: string, payload: Record<string, any>) => Promise<unknown>;
}

/**
 * 依赖注入的监听器工厂：真实装配和测试共用同一套校验/分发/回包逻辑。
 * 安全约定：只接受 allowedOrigin 的请求；回包发 event.origin，绝不用 '*'。
 */
export function createBridgeListener(deps: BridgeDeps): (event: MessageEvent) => Promise<void> {
  return async (event: MessageEvent) => {
    const request = parseBridgeRequest(event.data);
    if (!request) return;
    if (event.origin !== deps.allowedOrigin) {
      console.warn(`[wxhl创意工坊] 拒绝来自 ${event.origin} 的桥接消息`);
      return;
    }
    const source = event.source as Window | null;
    try {
      const payload = await deps.dispatch(request.action, request.payload);
      source?.postMessage(successResponse(request.id, payload), event.origin);
    } catch (error) {
      console.error(`[wxhl创意工坊] 桥接动作 ${request.action} 失败:`, error);
      source?.postMessage(failureResponse(request.id, error), event.origin);
    }
  };
}

/** 挂到酒馆主页面窗口（工坊 iframe 的 postMessage 发往其父窗口）。返回拆卸函数。 */
export function installBridge(allowedOrigin: string): () => void {
  const listener = createBridgeListener({ allowedOrigin, dispatch: dispatchAction });
  const target = window.parent ?? window;
  target.addEventListener('message', listener);
  console.info('[wxhl创意工坊] 世界书桥接已启用, 允许来源:', allowedOrigin);
  return () => target.removeEventListener('message', listener);
}
