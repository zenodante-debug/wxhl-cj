import { describe, expect, it } from 'vitest';

// ================================================================
// 防具：views/*.vue 的 import 契约
//
// `.vue` 不被 tsc 检查（无 vue-tsc），`vue/compiler-sfc` 也只查语法、**不解析 import**。
// 于是「.vue 引用了模块里并不存在的导出」这种坏，两个闸门都是全绿的（Task 13e 评审抓到过：
// CombatView import 了未 export 的 `找单位`，循环第一轮就 `is not a function`）。
// 唯一能抓到的闸门 = 真 import 一遍：导入失败 / 绑定 undefined 都会让本测试变红。
//
// 下面的符号必须与 `src/wxhl-combat/views/*.vue` 的 import 行逐字一致。
// ================================================================

import {
  读取可参战单位,
  读取战斗单位,
  读取单位效果源,
  翻译战斗解释,
  生成敌方意图,
  读战斗状态,
  写战斗状态,
  写回战斗结果,
  写收尾楼层,
} from '../store';
import { 读设置, useSettingsStore } from '../settingsStore';
import { 找单位, 跑敌方意图, 结算行动 } from '../engine/loop';
import { 初始化战斗状态, 开场距离选项, 开场距离随机 } from '../engine/setup';
import { 阶段A资源恢复, 阶段F结算 } from '../engine/turn';
import { 行动槽重置 } from '../engine/actionEconomy';
import { 距离带, 移动距离计算, 移动额度重置 } from '../engine/distance';
import { 构造行动声明, 可提交 } from '../engine/actionInput';

describe('views 的 import 契约', () => {
  it('views/*.vue 引用的每个导出都真实存在', () => {
    const 符号 = [
      // views/SetupView.vue
      读取可参战单位,
      开场距离选项,
      // views/CombatView.vue
      初始化战斗状态,
      开场距离随机,
      结算行动,
      找单位,
      阶段A资源恢复,
      阶段F结算,
      行动槽重置,
      移动距离计算,
      移动额度重置,
      构造行动声明,
      生成敌方意图,
      读战斗状态,
      写战斗状态,
      写收尾楼层,
      写回战斗结果,
      读取战斗单位,
      读取单位效果源,
      翻译战斗解释,
      // views/BattleView.vue
      距离带,
      可提交,
      // views/SettingsView.vue
      useSettingsStore,
      // 非 view 直接引用，但同属 store 的公开入口（防回归）
      读设置,
      跑敌方意图,
    ];

    for (const f of 符号) expect(f).toBeDefined();
  });
});
