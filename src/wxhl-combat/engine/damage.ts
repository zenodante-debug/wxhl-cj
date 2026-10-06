// ================================================================
// 无限回廊 · 前端战斗引擎 · 伤害计算
// 纯函数，不碰酒馆接口
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
 * 攻击结算（第一阶段最简版）
 * 命中 = 1d20 + STR修正 ≥ 闪避值
 * 伤害 = STR修正 − 防御（最低1）
 */
export function 攻击结算(攻方: 攻击方, 守方: 防御方): {
  命中: boolean;
  伤害: number;
  HP_新值: number;
} {
  const STR修正 = 属性修正值(攻方.属性.实际.STR, 攻方.阶位);
  const 命中判定 = rollDie(20) + STR修正;

  if (命中判定 < 守方.闪避值) {
    return { 命中: false, 伤害: 0, HP_新值: 守方.HP_当前 };
  }

  const 伤害 = 混合伤害(STR修正, 守方.防御);
  const HP_新值 = Math.max(守方.HP_当前 - 伤害, 0);

  return { 命中: true, 伤害, HP_新值 };
}
