import { afterEach, describe, expect, it, vi } from 'vitest';
import { BRIDGE_CHANNEL, createBridgeListener, installBridge } from '../bridge';

afterEach(() => vi.unstubAllGlobals());

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

describe('installBridge · 重载守卫', () => {
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

  it('重复安装先拆上一实例的监听：热重载不会把一条请求处理两次', () => {
    const { listeners, target } = makeTarget();
    vi.stubGlobal('window', { parent: target });
    installBridge(ORIGIN);
    const firstListener = listeners[0];
    installBridge(ORIGIN);
    expect(target.removeEventListener).toHaveBeenCalledWith('message', firstListener);
    expect(listeners).toHaveLength(1);
  });

  it('teardown 幂等：重复调用不抛错，且不误删后续实例的键', () => {
    const { target } = makeTarget();
    vi.stubGlobal('window', { parent: target });
    const teardown = installBridge(ORIGIN);
    teardown();
    expect(() => teardown()).not.toThrow();
    const second = installBridge(ORIGIN);
    teardown(); // 旧实例的 teardown 不该把新实例的守卫键删掉
    expect((target as any).__wxhlCygfBridgeTeardown).toBe(second);
    second();
  });
});

describe('createBridgeListener · 只认面板 iframe 的来源', () => {
  it('来源不是面板 iframe → 丢弃，不 dispatch 也不回包', async () => {
    const { event, source } = makeEvent(request('handshake'));
    const dispatch = vi.fn();
    const listener = createBridgeListener({ allowedOrigin: ORIGIN, dispatch, expectedSource: () => ({ other: true } as unknown as Window) });
    await listener(event);
    expect(dispatch).not.toHaveBeenCalled();
    expect(source.postMessage).not.toHaveBeenCalled();
  });

  it('expectedSource 返回 null（未开面板/测试）→ 跳过该校验，照常处理', async () => {
    const { event, source } = makeEvent(request('handshake'));
    const dispatch = vi.fn().mockResolvedValue({ ok: true });
    const listener = createBridgeListener({ allowedOrigin: ORIGIN, dispatch, expectedSource: () => null });
    await listener(event);
    expect(dispatch).toHaveBeenCalled();
    expect(source.postMessage).toHaveBeenCalled();
  });
});
