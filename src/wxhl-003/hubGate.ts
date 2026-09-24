// ================================================================
// 主城设施门禁 · 跨模块共享
// 自由市场 / 工坊 / 储藏室 等仅在「回廊」或「现实」可用；进入副本后（当前世界变为副本世界）
// 一律禁用 —— 副本里摸不到主城的商铺、工坊与储藏室，贴合设定。
// 注意这与 crafting/store.ts 的 facilityInfo 是两层：本门禁管「能不能开门」，
// facilityInfo 管「开进去后按什么设施规则算」（回廊设施加成 / 现实野外简陋），互不冲突。
// ================================================================

/** 楼层探测：全局脚本 iframe 无楼层上下文时回退最新楼层（与各 store 的 messageId 逐字一致） */
function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

/**
 * 当前世界（默认「现实」）。读不到时也按「现实」放行 ——
 * 门禁的目的是拦「副本内」，而读不到变量通常意味着 MVU 未就绪而非身处副本，误锁会挡住正常使用。
 */
export function currentWorld(): string {
  try {
    const mid = messageId();
    const mvu = Mvu.getMvuData({ type: 'message', message_id: mid });
    return String(_.get(mvu, ['stat_data', '契约者', '当前世界'], '现实'));
  } catch (_) {
    return '现实';
  }
}

/** 主城设施（自由市场 / 工坊 / 储藏室）当前是否可用：当前世界 ∈ {回廊, 现实} */
export function canUseHubFacility(): boolean {
  return ['回廊', '现实'].includes(currentWorld());
}

/** 门禁拦截时的统一提示文案 */
export const HUB_GATE_HINT = '副本中无法使用此设施，需回到回廊或现实';
