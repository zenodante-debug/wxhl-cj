// ================================================================
// 系统日志 · 跨模块共享
// 写入 stat_data.系统日志 的瞬态记录：AI 下一楼读到后由状态栏清空（读完即清），
// 故各流程只追加、保持简洁，无需截断。统一前缀 [前端面板交互：…] 与状态栏现有格式一致，
// 让 AI 能把「玩家在面板里做的操作」与正文剧情对齐（东西从哪来、到哪去）。
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
 * 把一条简洁日志并入传入的 mvu 数据（**不写库**）。
 * 调用方在自己已有的 MVU 事务里、`replaceMvuData` 之前调用 ——
 * 与事务同一次落档，避免额外读写与「日志读了旧档、事务又盖回去」的丢更新竞态。
 */
export function pushSyslog(mvu: any, text: string): void {
  const path = ['stat_data', '系统日志'];
  const logs = _.get(mvu, path, []);
  const arr = Array.isArray(logs) ? logs.slice() : [];
  arr.push(`[前端面板交互：${text}]`);
  _.set(mvu, path, arr);
}

/**
 * 独立追加一条日志（自读自写当前楼层）。
 * 仅用于**当前没有在进行 MVU 事务**的流程（如订单接单——只调服务器、不落本地变量）；
 * 已在写变量的流程请改用 pushSyslog 并入既有事务。
 */
export async function logSyslog(text: string): Promise<void> {
  try {
    const mid = messageId();
    const mvu = Mvu.getMvuData({ type: 'message', message_id: mid });
    pushSyslog(mvu, text);
    await Mvu.replaceMvuData(mvu, { type: 'message', message_id: mid });
  } catch (e) {
    console.warn('[无限回廊] 写入系统日志失败', e);
  }
}
