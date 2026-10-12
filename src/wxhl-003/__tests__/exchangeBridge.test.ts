import { describe, expect, it } from 'vitest';
import { pickExchangeApi } from '../exchangeBridge';

describe('pickExchangeApi', () => {
  it('直接给接口对象（waitGlobalInitialized 的返回值形状）', () => {
    const api = { open: () => {} };
    expect(pickExchangeApi(api)).toBe(api);
  });
  it('给作用域（window.parent 形状，接口挂在 .WxhlCg 上）', () => {
    const api = { open: () => {} };
    expect(pickExchangeApi({ WxhlCg: api })).toBe(api);
  });
  it('undefined / null / 空对象 / 形状不对 → null', () => {
    expect(pickExchangeApi(undefined)).toBeNull();
    expect(pickExchangeApi(null)).toBeNull();
    expect(pickExchangeApi({})).toBeNull();
    expect(pickExchangeApi({ WxhlCg: {} })).toBeNull();
    expect(pickExchangeApi({ WxhlCg: { open: 'x' } })).toBeNull();
  });
});
