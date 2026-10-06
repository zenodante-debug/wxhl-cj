import { rollDie } from './dice';
import { 先攻判定 } from './rules';
import type { 战斗状态, 战斗单位 } from '../types';

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

/**
 * 初始化战斗状态（开战那一步）。
 * - 先攻：每个单位掷 1d20 + AGI修正，降序；同分 AGI 属性值高者优先。
 * - 距离：契约者本体为 0，其余单位为开场距离。
 * - 行动槽重置为满（免费不重置）。
 *
 * 键的选择（与 loop/enemyTactics/persistence 的既有 fixture 一致）：
 * - `先攻` 里放**单位 id**（变量路径全名，如 `副本角色.骨卫兵`）—— `loop.找单位` 会按 id 精确匹配。
 * - `状态.单位` 的键用**短名**（`契约者` / `骨卫兵`）—— 敌方意图提示词的回例输出短名，
 *   `loop.找单位` 先按键查找；若键用全名，「单位: "骨卫兵"」这种引用会查不到而被跳过。
 */
export function 初始化战斗状态(单位列表: 战斗单位[], 开场距离: number): 战斗状态 {
  const 掷骰 = 单位列表.map(u => ({ u, 先攻: 先攻判定(u.属性.实际.AGI, u.阶位) }));
  掷骰.sort((a, b) => b.先攻 - a.先攻 || b.u.属性.实际.AGI - a.u.属性.实际.AGI);

  const 单位: Record<string, 战斗单位> = {};
  for (const u of 单位列表) {
    const 键 = u.id === '契约者' ? '契约者' : u.id.split('.').pop()!;
    单位[键] = {
      ...u,
      距离: u.id === '契约者' ? 0 : 开场距离,
      行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: u.行动槽.免费 },
    };
  }

  return {
    进行中: true,
    回合: 1,
    先攻: 掷骰.map(x => x.u.id),
    单位,
    待决: null,
    领域: [],
  };
}
