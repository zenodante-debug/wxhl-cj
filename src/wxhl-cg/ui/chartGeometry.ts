// ================================================================
// 回廊交易所 · 走势图几何（纯函数，供 PriceChart.vue 与单测共用）。
// 关键约定：y 轴范围**只按价格序列**定；基准线/开仓线/强平线若越界则夹到边界，
// 绝不把范围拉大——否则一条远在天边的强平线会把价格线压成一条直线。
// ================================================================

export interface ChartLine {
  value: number;
  label: string;
  kind: 'base' | 'entry' | 'liq';
}

export interface ChartGeometry {
  /** SVG polyline 的 points 字符串 */
  polyline: string;
  points: { x: number; y: number }[];
  lineY: { y: number; label: string; kind: ChartLine['kind'] }[];
  min: number;
  max: number;
  /** 末值 ≥ 首值 → 绿（盈利方向）；用户口径：绿=盈利、红=亏损 */
  up: boolean;
}

export function chartGeometry(opts: {
  data: number[];
  lines: ChartLine[];
  width: number;
  height: number;
  pad?: number;
}): ChartGeometry {
  const { data, lines, width, height } = opts;
  const pad = opts.pad ?? 6;
  const inner = Math.max(1, height - pad * 2);

  const rawMin = Math.min(...data);
  const rawMax = Math.max(...data);
  // 序列全平时给一点假范围，避免除零
  const min = rawMax === rawMin ? rawMin * 0.99 : rawMin;
  const max = rawMax === rawMin ? rawMax * 1.01 : rawMax;
  const span = max - min || 1;

  const yOf = (v: number) => {
    const y = pad + (1 - (v - min) / span) * inner;
    return Math.min(height, Math.max(0, y)); // 越界的线夹到边界
  };
  const xOf = (i: number) => (data.length <= 1 ? 0 : (i / (data.length - 1)) * width);

  const points = data.map((v, i) => ({ x: xOf(i), y: yOf(v) }));
  const polyline = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  return {
    polyline,
    points,
    lineY: lines.map(l => ({ y: yOf(l.value), label: l.label, kind: l.kind })),
    min: rawMin,
    max: rawMax,
    up: data[data.length - 1] >= data[0],
  };
}
