// ================================================================
// 无限回廊 · 前端战斗引擎 · 掷骰
// 纯函数，不依赖任何酒馆运行时全局 (只依赖 crypto)，便于单元测试
// 复用 wxhl-003 的拒绝采样逻辑
// ================================================================

/**
 * 掷一颗骰子，返回 1..faces。
 * 用拒绝采样消除取模偏差: 先把 2^32 截到 faces 的整数倍，落在尾巴上的样本重掷。
 */
export function rollDie(faces: number): number {
  if (!Number.isInteger(faces) || faces < 1) throw new Error('骰面数必须是正整数: ' + faces);
  if (faces === 1) return 1;
  const limit = Math.floor(0x100000000 / faces) * faces;
  const buf = new Uint32Array(1);
  let v: number;
  do {
    crypto.getRandomValues(buf);
    v = buf[0];
  } while (v >= limit);
  return (v % faces) + 1;
}
