// ================================================================
// 无限回廊 · 战斗引擎 · 悬浮球定位
// 纯函数，不碰酒馆接口
//
// 语义对齐 wxhl-003 的 mobile-compat.js（小手机悬浮球）：
// 同样的 52px 尺寸、10px 夹取间距、5px 拖动阈值，
// 但**用独立的 localStorage 键与错开的默认落点** —— 两个脚本各自独立运行、
// 互不知道对方，只能靠约定不同的默认位置避免叠在一起。
// ================================================================

export interface 视口 {
  left: number;
  top: number;
  width: number;
  height: number;
}

/** 悬浮球尺寸（与小手机一致） */
export const 悬浮球尺寸 = 52;
/** 夹取时距视口边缘的最小间距（与小手机一致） */
export const 夹取间距 = 10;
/** 位移超过该像素数才算「拖动」，否则算「点按」（与小手机一致） */
export const 拖动阈值 = 5;
/** 贴右缘的横向留白（与小手机一致） */
const 右缘留白 = 14;
/**
 * 默认落点的纵向比例。
 * 小手机用 42%；这里取 66% —— **刻意错开**，否则两个球开局就叠在一起。
 */
const 默认纵向比例 = 0.66;

/**
 * 把坐标夹进视口内（留出间距），保证悬浮球永远可点。
 * 视口比球还小时退化为「贴左上间距处」，不会把球夹到视口外。
 */
export function 夹取位置(
  left: number,
  top: number,
  视口: 视口,
  尺寸 = 悬浮球尺寸,
  间距 = 夹取间距,
): { left: number; top: number } {
  const 最小左 = 视口.left + 间距;
  const 最小上 = 视口.top + 间距;
  const 最大左 = Math.max(视口.left + 视口.width - 尺寸 - 间距, 最小左);
  const 最大上 = Math.max(视口.top + 视口.height - 尺寸 - 间距, 最小上);
  return {
    left: Math.min(Math.max(left, 最小左), 最大左),
    top: Math.min(Math.max(top, 最小上), 最大上),
  };
}

/** 默认落点：贴右缘、纵向 66%（与小手机的 42% 错开） */
export function 默认位置(
  视口: 视口,
  尺寸 = 悬浮球尺寸,
  间距 = 夹取间距,
): { left: number; top: number } {
  return 夹取位置(
    视口.left + 视口.width - 尺寸 - 右缘留白,
    视口.top + 视口.height * 默认纵向比例 - 尺寸 / 2,
    视口,
    尺寸,
    间距,
  );
}

/** 位移是否够得上「拖动」（欧氏距离 ≥ 阈值） */
export function 算作拖动(dx: number, dy: number): boolean {
  return Math.hypot(dx, dy) >= 拖动阈值;
}
