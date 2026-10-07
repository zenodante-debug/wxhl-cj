// ================================================================
// 无限回廊 · 前端战斗引擎 · buff 映射器
// 纯函数，不碰酒馆接口
// buff ↔ 特殊状态 双向映射（分层字符串）
// ================================================================

import type { 状态条目 } from '../types';

/**
 * buff → 字符串（写入 MVU 变量的 状态.特殊状态）
 * 格式：人类段|引擎段
 * 例子："2层|持续3回合"、"持续2回合|@修正=伤害:0.3"
 */
export function buff转字符串(buff: 状态条目): string {
  const 段: string[] = [];

  // 层数（人类段）
  if (buff.层数 !== undefined && buff.层数 > 1) {
    段.push(`${buff.层数}层`);
  }

  // 持续回合（人类段）
  段.push(`持续${buff.持续}回合`);

  // 数值修正（引擎段）。前缀 `@修正=` 是刻意的：不加前缀的话，
  // 「伤害:0.3」会被 `字符串转buff` 当成一个词条名吞掉。
  if (buff.数值修正 && Object.keys(buff.数值修正).length > 0) {
    段.push(`@修正=${Object.entries(buff.数值修正).map(([k, v]) => `${k}:${v}`).join(',')}`);
  }

  // 词条（引擎段）
  if (buff.词条 && buff.词条.length > 0) {
    段.push(buff.词条.join(','));
  }

  return 段.join('|');
}

/**
 * 字符串 → buff（从 MVU 变量的 状态.特殊状态 读出）
 */
export function 字符串转buff(名: string, 字符串: string): 状态条目 {
  const 段 = 字符串.split('|');

  let 持续 = 1;
  let 层数: number | undefined;
  let 词条: string[] | undefined;
  let 数值修正: Record<string, number> | undefined;

  for (const s of 段) {
    // 解析层数
    const 层数匹配 = s.match(/^(\d+)层$/);
    if (层数匹配) {
      层数 = parseInt(层数匹配[1]);
      continue;
    }

    // 解析持续回合
    const 持续匹配 = s.match(/^持续(\d+)回合$/);
    if (持续匹配) {
      持续 = parseInt(持续匹配[1]);
      continue;
    }

    // 解析数值修正（引擎段）
    const 修正匹配 = s.match(/^@修正=(.+)$/);
    if (修正匹配) {
      数值修正 = {};
      for (const 项 of 修正匹配[1].split(',')) {
        const [键, 值] = 项.split(':');
        const 数 = Number(值);
        if (键 && Number.isFinite(数)) 数值修正[键] = 数;
      }
      continue;
    }

    // 其他都当词条
    if (s.trim()) {
      if (!词条) 词条 = [];
      词条.push(...s.split(','));
    }
  }

  return {
    名,
    持续,
    层数,
    词条,
    ...(数值修正 && Object.keys(数值修正).length ? { 数值修正 } : {}),
  };
}
