// ================================================================
// 无限回廊 · 前端战斗引擎 · 资源池
// 纯函数，不碰酒馆接口
// 任意命名资源（保存/充能/加护/冻结标记…）+ 每回合衰减
// ================================================================

/**
 * 资源操作
 * 操作类型：获得/消耗/设为/恢复
 */
export function 资源操作(
  资源: Record<string, number>,
  名: string,
  操作: '获得' | '消耗' | '设为' | '恢复',
  量: number,
): Record<string, number> {
  const 新资源 = { ...资源 };
  const 当前值 = 新资源[名] || 0;

  switch (操作) {
    case '获得':
    case '恢复':
      新资源[名] = 当前值 + 量;
      break;
    case '消耗':
      新资源[名] = Math.max(当前值 - 量, 0); // 不能为负
      break;
    case '设为':
      新资源[名] = 量;
      break;
  }

  return 新资源;
}

/**
 * 资源衰减（回合结束时调用）
 * 每个资源按衰减表递减，到 0 或负数时归零
 */
export function 资源衰减(
  资源: Record<string, number>,
  衰减表: Record<string, number>,
): Record<string, number> {
  const 新资源 = { ...资源 };

  for (const [名, 衰减量] of Object.entries(衰减表)) {
    const 当前值 = 新资源[名] || 0;
    新资源[名] = Math.max(当前值 - 衰减量, 0);
  }

  return 新资源;
}
