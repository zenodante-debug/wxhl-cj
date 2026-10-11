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
