import { describe, expect, it } from 'vitest';
import { BRIDGE_CHANNEL, failureResponse, parseBridgeRequest, successResponse } from '../bridge';

describe('parseBridgeRequest · 桥接消息解析', () => {
  const valid = { channel: BRIDGE_CHANNEL, kind: 'request', id: 'r1', action: 'handshake' };

  it('合法请求 → 解析成功，payload 缺省为 {}', () => {
    expect(parseBridgeRequest(valid)).toEqual({
      channel: BRIDGE_CHANNEL, kind: 'request', id: 'r1', action: 'handshake', payload: {},
    });
  });

  it('保留云端给的 payload', () => {
    const req = parseBridgeRequest({ ...valid, payload: { worldbookName: '无限回廊mod' } });
    expect(req?.payload).toEqual({ worldbookName: '无限回廊mod' });
  });

  it.each([
    ['非对象', 'a string'],
    ['null', null],
    ['channel 不对', { ...valid, channel: 'creative-workshop:worldbook' }],
    ['kind 不是 request', { ...valid, kind: 'response' }],
    ['缺 id', { ...valid, id: '' }],
    ['缺 action', { ...valid, action: '' }],
  ])('%s → null', (_label, data) => {
    expect(parseBridgeRequest(data)).toBeNull();
  });
});

describe('响应构造', () => {
  it('successResponse', () => {
    expect(successResponse('r1', { a: 1 })).toEqual({
      channel: BRIDGE_CHANNEL, kind: 'response', id: 'r1', ok: true, payload: { a: 1 },
    });
  });

  it('failureResponse 把 Error 转成人话，非 Error 用 String', () => {
    expect(failureResponse('r1', new Error('世界书不存在'))).toEqual({
      channel: BRIDGE_CHANNEL, kind: 'response', id: 'r1', ok: false, error: '世界书不存在',
    });
    expect(failureResponse('r2', '裸字符串').ok).toBe(false);
    expect((failureResponse('r2', 404) as { error: string }).error).toBe('404');
  });
});
