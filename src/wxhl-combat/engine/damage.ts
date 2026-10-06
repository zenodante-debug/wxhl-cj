// ================================================================
// 无限回廊 · 前端战斗引擎 · 伤害计算
// 纯函数，不碰酒馆接口
// 世界书原文：spec 附录 B.4「伤害六步」+ B.3「判定」
// ================================================================

import { rollDie } from './dice';
import { 属性修正值 } from './rules';

/**
 * 混合伤害（最低1）= 基础伤害 − 实际防御
 * 世界书原文：第一步_基础伤害区
 */
export function 混合伤害(基础伤害: number, 实际防御: number): number {
  return Math.max(基础伤害 - 实际防御, 1);
}

// ==================== 伤害六步 ====================

/** 攻击部位（世界书原文：第二步_部位锁定） */
export type 攻击部位 = '头部' | '臂部' | '腿部' | '眼部/核心';

/**
 * 解析伤害骰式。
 * 认 `2d8`（骰数 d 骰面）与 `d6`（省略骰数 = 1）两种写法，其余一律抛错。
 */
export function 解析伤害骰(式: string): { 骰数: number; 骰面: number } {
  const 匹配 = /^(\d*)[dD](\d+)$/.exec((式 ?? '').trim());
  if (!匹配) throw new Error(`无法解析伤害骰式: ${式}`);

  const 骰数 = 匹配[1] === '' ? 1 : Number(匹配[1]);
  const 骰面 = Number(匹配[2]);
  if (!Number.isInteger(骰数) || 骰数 < 1) throw new Error(`伤害骰式骰数非法: ${式}`);
  if (!Number.isInteger(骰面) || 骰面 < 1) throw new Error(`伤害骰式骰面非法: ${式}`);

  return { 骰数, 骰面 };
}

/** 掷伤害骰：把骰式解析成骰数/骰面后逐颗掷骰求和。 */
export function 掷伤害骰(式: string): number {
  const { 骰数, 骰面 } = 解析伤害骰(式);
  let 和 = 0;
  for (let i = 0; i < 骰数; i++) 和 += rollDie(骰面);
  return 和;
}

/**
 * 第一步_基础伤害 · 武器伤害（向上取整）
 * 世界书原文：((武器伤害骰 + 强化等级) × (1 + (阶位−1)/2) + 属性修正) × 武器倍率
 * @param 骰值 武器伤害骰已掷出的点数之和
 * @param 阶位 位阶序数（1 = 一阶 … 5 = 五阶）
 */
export function 武器伤害(骰值: number, 强化等级: number, 阶位: number, 属性修正: number, 倍率: number): number {
  return Math.ceil(((骰值 + 强化等级) * (1 + (阶位 - 1) / 2) + 属性修正) * 倍率);
}

/**
 * 第一步_基础伤害 · 技能伤害（向上取整）
 * 世界书原文：技能基础伤害 × (1 + (阶位−1)/2)
 */
export function 技能伤害(基础伤害: number, 阶位: number): number {
  return Math.ceil(基础伤害 * (1 + (阶位 - 1) / 2));
}

/**
 * 第二步_部位锁定 · 伤害倍率
 * 世界书原文：头部×1.5 | 臂部×0.75 | 腿部×0.75 | 眼部/核心×2 | 未声明部位×1
 */
export function 部位倍率(部位?: 攻击部位): number {
  switch (部位) {
    case '头部': return 1.5;
    case '臂部': return 0.75;
    case '腿部': return 0.75;
    case '眼部/核心': return 2;
    default: return 1;
  }
}

/**
 * 第二步_部位锁定 · DC 加值
 * 世界书原文：头部 DC+10×敌人位阶 | 臂部/腿部 DC+5×敌人位阶 | 眼部/核心 DC+20×敌人位阶 | 未声明 0
 * @param 敌人阶位 敌人的位阶序数（1 = 一阶 …）
 */
export function 部位DC加值(部位: 攻击部位 | undefined, 敌人阶位: number): number {
  switch (部位) {
    case '头部': return 10 * 敌人阶位;
    case '臂部': return 5 * 敌人阶位;
    case '腿部': return 5 * 敌人阶位;
    case '眼部/核心': return 20 * 敌人阶位;
    default: return 0;
  }
}

/**
 * 第三步_暴击 · 暴击范围（自然骰面下限）
 * 世界书原文：基础暴击率5%（自然20）；每10点AGI属性值扩大暴击范围1（最低扩展至自然15）
 */
export function 暴击范围(AGI实际值: number): number {
  return Math.max(15, 20 - Math.floor(AGI实际值 / 10));
}

/** 第三步_暴击 · 暴击倍率（暴击 ×1.5，未暴击 ×1） */
export function 暴击倍率(暴击: boolean): number {
  return 暴击 ? 1.5 : 1;
}

/**
 * 第四步_效果乘区
 * 世界书原文：总增伤 = Σ(倍率−1)；
 *   if 总增伤 ≤ 1.0：效果乘区 = 1 + 总增伤
 *   else：效果乘区 = 2 + (总增伤 − 1.0) × 0.25
 */
export function 效果乘区(总增伤: number): number {
  if (总增伤 <= 1.0) return 1 + 总增伤;
  return 2 + (总增伤 - 1.0) * 0.25;
}

/**
 * 第六步_最终伤害
 * 世界书原文：最终伤害 = (混合伤害 × 部位锁定倍率 × 暴击倍率 × 效果乘区) − 护盾值 − 减伤值
 *            减伤值按比例折算：混合×部位×暴击×乘区 × 减伤比例
 *            最低 0（不得为负）
 */
export function 最终伤害(输入: {
  混合伤害: number;
  部位倍率: number;
  暴击倍率: number;
  效果乘区: number;
  护盾: number;
  减伤比例: number;
}): number {
  const 乘区后 = 输入.混合伤害 * 输入.部位倍率 * 输入.暴击倍率 * 输入.效果乘区;
  const 减伤值 = 乘区后 * 输入.减伤比例;
  return Math.max(乘区后 - 输入.护盾 - 减伤值, 0);
}

// ==================== 判定（spec 附录 B.3） ====================

/**
 * 武器命中 = 1d20 + 属性修正 + 被动加成 + AGI修正×0.2 ≥ 目标闪避值
 */
export function 命中判定(输入: {
  骰值: number;
  属性修正: number;
  被动加成: number;
  AGI修正: number;
  目标闪避值: number;
}): boolean {
  return 输入.骰值 + 输入.属性修正 + 输入.被动加成 + 输入.AGI修正 * 0.2 >= 输入.目标闪避值;
}

/**
 * 技能命中 = 1d20 + 属性修正×(1 + 技能阶位/5) + 被动加成 + AGI修正×0.2 ≥ 目标闪避值（或技能DC）
 */
export function 技能命中判定(输入: {
  骰值: number;
  属性修正: number;
  技能阶位: number;
  被动加成: number;
  AGI修正: number;
  目标闪避值: number;
}): boolean {
  return (
    输入.骰值 +
    输入.属性修正 * (1 + 输入.技能阶位 / 5) +
    输入.被动加成 +
    输入.AGI修正 * 0.2 >=
    输入.目标闪避值
  );
}

// ==================== 旧接口（第一阶段最简版，保留兼容） ====================

interface 攻击方 {
  属性: { 实际: { STR: number; AGI: number; CON: number; PER: number } };
  阶位: string;
}

interface 防御方 {
  属性: { 实际: { STR: number; AGI: number; CON: number; PER: number } };
  阶位: string;
  HP_当前: number;
  HP_最大: number;
  闪避值: number;
  防御: number;
}

/**
 * 攻击结算（第一阶段最简版，保留给 views/ 与既有测试）
 * 命中 = 1d20 + STR修正 ≥ 闪避值
 * 伤害 = STR修正 − 防御（最低1）
 *
 * 已改为委托 B.3/B.4 的判定与伤害函数（口径统一，不再各写一份）。
 */
export function 攻击结算(攻方: 攻击方, 守方: 防御方): {
  命中: boolean;
  伤害: number;
  HP_新值: number;
} {
  const STR修正 = 属性修正值(攻方.属性.实际.STR, 攻方.阶位);

  const 命中 = 命中判定({
    骰值: rollDie(20),
    属性修正: STR修正,
    被动加成: 0,
    AGI修正: 0,
    目标闪避值: 守方.闪避值,
  });

  if (!命中) {
    return { 命中: false, 伤害: 0, HP_新值: 守方.HP_当前 };
  }

  const 伤害 = 混合伤害(STR修正, 守方.防御);
  const HP_新值 = Math.max(守方.HP_当前 - 伤害, 0);

  return { 命中: true, 伤害, HP_新值 };
}
