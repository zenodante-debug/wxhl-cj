import { describe, expect, it, vi } from 'vitest';
import { BRIDGE_CHANNEL, createBridgeListener } from '../bridge';

const ORIGIN = 'https://cygf.657868.xyz';
const request = (action: string, payload = {}) => ({ channel: BRIDGE_CHANNEL, kind: 'request', id: 'r1', action, payload });

function makeEvent(data: unknown, origin = ORIGIN) {
  const source = { postMessage: vi.fn() };
  return { event: { data, origin, source } as unknown as MessageEvent, source };
}

describe('createBridgeListener · 桥接监听', () => {
  it('合法请求 → dispatch → ok 回包发 event.origin（Review Focus #5 的正面）', async () => {
    const { event, source } = makeEvent(request('handshake'));
    const dispatch = vi.fn().mockResolvedValue({ ok: 'fine' });
    const listener = createBridgeListener({ allowedOrigin: ORIGIN, dispatch });
    await listener(event);
    expect(dispatch).toHaveBeenCalledWith('handshake', {});
    expect(source.postMessage).toHaveBeenCalledWith(
      { channel: BRIDGE_CHANNEL, kind: 'response', id: 'r1', ok: true, payload: { ok: 'fine' } },
      ORIGIN,
    );
  });

  it('dispatch 抛错 → {ok:false,error} 回包，异常不外泄', async () => {
    const { event, source } = makeEvent(request('getEntries'));
    const listener = createBridgeListener({ allowedOrigin: ORIGIN, dispatch: vi.fn().mockRejectedValue(new Error('世界书不存在')) });
    await listener(event);
    expect(source.postMessage).toHaveBeenCalledWith(
      expect.objectContaining({ ok: false, error: '世界书不存在' }),
      ORIGIN,
    );
  });

  it('origin 不匹配 → 静默拒绝：不 dispatch、不回包（Review Focus #5）', async () => {
    const { event, source } = makeEvent(request('handshake'), 'https://evil.example.com');
    const dispatch = vi.fn();
    const listener = createBridgeListener({ allowedOrigin: ORIGIN, dispatch });
    await listener(event);
    expect(dispatch).not.toHaveBeenCalled();
    expect(source.postMessage).not.toHaveBeenCalled();
  });

  it('非桥接消息（别的 channel / 普通对象）→ 完全忽略', async () => {
    const dispatch = vi.fn();
    const listener = createBridgeListener({ allowedOrigin: ORIGIN, dispatch });
    await listener(makeEvent({ hello: 'world' }).event);
    await listener(makeEvent({ channel: 'creative-workshop:worldbook', kind: 'request', id: 'x', action: 'y' }).event);
    expect(dispatch).not.toHaveBeenCalled();
  });
});
