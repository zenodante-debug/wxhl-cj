// ================================================================
// 回廊交易所（wxhl-cg）与手机（wxhl-003）之间的调起桥。
// 两条通道，手机侧按顺序尝试：
//   1. window.parent.WxhlCg —— 同源直连（wxhl-combat 已在用 window.parent 读 visualViewport，
//      证明脚本 iframe 对父页面是同源可读写的）。交易所脚本挂载时把接口写在这里。
//   2. waitGlobalInitialized('WxhlCg') —— 酒馆助手的全局接口共享（老通道，保留兼容）。
// 两边的返回值形状不同，本函数统一归一。
// ================================================================

export interface ExchangeApi {
  open(): void;
  close?(): void;
  isOpen?(): boolean;
}

/**
 * 从候选值里取出交易所接口：
 * - 候选本身就是接口对象（waitGlobalInitialized 的返回值）→ 直接用；
 * - 候选是作用域对象、接口挂在 `.WxhlCg` 上（window.parent）→ 取内层。
 * 形状不对一律返回 null（宁可判"没加载"也不要在调用时炸）。
 */
export function pickExchangeApi(candidate: any): ExchangeApi | null {
  if (!candidate) return null;
  if (typeof candidate.open === 'function') return candidate as ExchangeApi;
  const nested = candidate.WxhlCg;
  if (nested && typeof nested.open === 'function') return nested as ExchangeApi;
  return null;
}
