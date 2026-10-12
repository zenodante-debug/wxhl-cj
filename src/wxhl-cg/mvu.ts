// ================================================================
// 回廊交易所 · MVU 读写：照抄 src/wxhl-003/market/store.ts 的
// messageId/readContractor/commit 模式。唯一数据路径：stat_data.契约者.经济.UP。
// ================================================================

/** 楼层探测：全局脚本 iframe 无楼层上下文时回退最新楼层（与市场一致） */
function messageId(): number | 'latest' {
  try {
    const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
    if (mid && mid !== -1) return mid;
  } catch (_) {}
  return 'latest';
}

/** 读 stat_data.契约者；读不到返回 null */
export function readContractor(): { mvu: any; c: any; mid: number | 'latest' } | null {
  try {
    const mid = messageId();
    const mvu = Mvu.getMvuData({ type: 'message', message_id: mid });
    const c = _.get(mvu, ['stat_data', '契约者']);
    return c ? { mvu, c, mid } : null;
  } catch (_) {
    return null;
  }
}

/** 落档 + 回读校验：回读不上 = 已写但未核对（照 writeToSave 惯例警告，不视为失败） */
export async function commitMvu(mvu: any, mid: number | 'latest', checks: [string[], unknown][]): Promise<void> {
  await Mvu.replaceMvuData(mvu, { type: 'message', message_id: mid });
  const after = Mvu.getMvuData({ type: 'message', message_id: mid });
  for (const [path, expectVal] of checks) {
    const got = _.get(after, path);
    if (expectVal === undefined ? got !== undefined : !_.isEqual(got, expectVal)) {
      toastr.warning('变量已写入但回读核对不上: ' + path.join('.'));
    }
  }
}

export function readUP(): number | null {
  const r = readContractor();
  return r ? Number(_.get(r.c, ['经济', 'UP']) ?? 0) : null;
}

/** 增减 UP（负数=扣减）并回读校验。读不到契约者时 throw（响亮失败）。 */
export async function adjustUP(delta: number): Promise<number> {
  const r = readContractor();
  if (!r) throw new Error('读不到存档变量（契约者不存在），兑换失败');
  const before = Number(_.get(r.c, ['经济', 'UP']) ?? 0);
  const after = Math.round((before + delta) * 100) / 100;
  if (after < 0) throw new Error(`UP 不足：需要 ${-delta}，只有 ${before}`);
  _.set(r.mvu, ['stat_data', '契约者', '经济', 'UP'], after);
  await commitMvu(r.mvu, r.mid, [[['stat_data', '契约者', '经济', 'UP'], after]]);
  return after;
}
