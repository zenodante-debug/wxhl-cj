import { rollDie } from './dice';

export function 开场距离选项(): { 名: string; 范围: [number, number] }[] {
  return [
    { 名: '伏击/狙击', 范围: [200, 800] },
    { 名: '开阔遭遇', 范围: [20, 100] },
    { 名: '对峙/室内', 范围: [3, 15] },
    { 名: '贴身缠斗', 范围: [0, 2] },
  ];
}

/** 范围内随机整数（用 rollDie 的真随机） */
export function 开场距离随机(范围: [number, number]): number {
  const [lo, hi] = 范围;
  const 宽度 = hi - lo + 1;
  return lo + (rollDie(宽度) - 1);
}
