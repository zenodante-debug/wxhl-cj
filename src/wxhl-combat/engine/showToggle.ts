// ================================================================
// 无限回廊 · 决斗场美术 · 演出开关
//
// 玩家裁决：「重演出，加可关闭」—— 设置里一个开关，关掉演出层**不渲染**（零成本）；
// 系统级 prefers-reduced-motion 一律等同关闭（无障碍约定，不问玩家）。
// ================================================================

import { 读设置 } from '../settingsStore';

/**
 * 演出该不该开（纯函数，可单测）。
 * @param 演出设置 设置页「战斗演出」的值
 * @param 减弱动效 系统 prefers-reduced-motion 的值
 */
export function 演出应该开(演出设置: boolean, 减弱动效: boolean): boolean {
  if (!演出设置) return false;
  return !减弱动效;
}

/** 读环境（设置 + 系统偏好）算出演出该不该开 —— 视图层用。
 *  SSR / 测试环境没有酒馆 API（getVariables）与 matchMedia：按默认**开**渲染
 * （演出层只影响视觉，不影响逻辑；生产环境里设置值才会真生效）。 */
export function 演出开启(): boolean {
  let 设置开 = true;
  try {
    设置开 = 读设置().演出 !== false;
  } catch {
    // 没有酒馆 API 的环境（SSR/测试）：按默认开
  }
  let 减弱 = false;
  try {
    减弱 = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
  } catch {
    // SSR / 老环境没有 matchMedia：按"不减弱"处理
  }
  return 演出应该开(设置开, 减弱);
}
