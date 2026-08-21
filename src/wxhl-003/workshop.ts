import { CONTRACT_SAVE_KEYS, TIER_ORDER, type WorkshopCard } from './data.ts'

/** 从完整 stat_data.契约者 摘出 PvP 六字段，并重算属性.实际 */
export function extractContractSave(契约者: any): any {
  const picked: any = {}
  for (const key of CONTRACT_SAVE_KEYS) picked[key] = 契约者?.[key]
  const 属性 = picked.属性
  if (属性 && 属性.基础 && 属性.加成) {
    属性.实际 = {
      STR: (属性.基础.STR || 0) + (属性.加成.STR || 0) + (属性.自定义加成?.STR || 0),
      AGI: (属性.基础.AGI || 0) + (属性.加成.AGI || 0) + (属性.自定义加成?.AGI || 0),
      CON: (属性.基础.CON || 0) + (属性.加成.CON || 0) + (属性.自定义加成?.CON || 0),
      PER: (属性.基础.PER || 0) + (属性.加成.PER || 0) + (属性.自定义加成?.PER || 0),
    }
  }
  return picked
}

/** 用装备槽位生成默认外貌；无装备返回空串 */
export function generateDefaultAppearance(装备: any): string {
  const slots = ['头部', '躯干', '手部', '下装', '饰品', '主武器', '副武器']
  const names = slots
    .map(s => 装备?.[s]?.名称)
    .filter((n): n is string => !!n && n !== '无')
  if (names.length === 0) return ''
  return '身着【' + names.slice(0, 4).join('】、【') + '】的契约者'
}

/** 阶位 → TIER_ORDER 索引；未知归末尾 */
export function tierOf(阶位: string): number {
  const i = TIER_ORDER.indexOf(阶位)
  return i === -1 ? TIER_ORDER.length : i
}

/** AI 生成简介的 prompt */
export function buildIntroPrompt(save: any): string {
  const c = save?.契约者 || {}
  const h = c.头部 || {}
  const 职 = c.职业 || {}
  const attr = c.属性?.实际 || {}
  return `你是无限回廊的契约者。以下是你当前的构筑数据。请用一句话（30字以内）写出你的角色人设卖点，用于 PvP 竞技场简介，语气贴合角色、有吸引力，不要提及"构筑数据"这类元信息。

【姓名】${h.姓名 || '未知'}
【等级】Lv.${h.等级 ?? 0} · ${h.阶位 || '一阶'}
【职业】${职.名称 || '无'}${职.稀有度 ? '（' + 职.稀有度 + '）' : ''}
【属性】STR${attr.STR ?? 0} / AGI${attr.AGI ?? 0} / CON${attr.CON ?? 0} / PER${attr.PER ?? 0}`
}

/** 发起对战时玩家发出的挑战消息（player 视角，引导 AI 抽取副本作为模拟战场） */
export function buildBattleIntroMessage(card: WorkshopCard): string {
  const h = card.save?.契约者?.头部 || {}
  const 职 = card.save?.契约者?.职业 || {}
  const lines = [
    '当前位置传送到了回廊主城的竞技场，竞技场是供契约者之间进行匹配对战的地方，对战输赢并无奖励，在战斗中死亡也是虚拟死亡，不会造成任何损失，所以你可能匹配到任何人，从一阶到五阶，甚至超脱者。可以选择随机匹配/自由选择对手。',
    '',
    `你选择了对手是：契约者「${card.name}」(${h.阶位 || '一阶'})，请从副本生成模块里抽取一个副本作为模拟战场，只作为模拟战场环境而不是作为副本：`,
    '',
    '【对手信息】',
    `姓名：${card.name}（${h.阶位 || '一阶'}）`,
    `等级：Lv.${h.等级 ?? 0} · ${h.军衔 || '列兵'}`,
  ]
  if (职.名称) lines.push('职业：' + 职.名称 + (职.稀有度 && 职.稀有度 !== '无' ? '（' + 职.稀有度 + '）' : ''))
  if (card.外貌) lines.push('外貌：' + card.外貌)
  if (card.简介) lines.push('简介：' + card.简介)
  return lines.join('\n')
}
