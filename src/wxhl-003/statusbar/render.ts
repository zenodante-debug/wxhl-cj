// ================================================================
// 状态栏 · 渲染器（纯函数）
//
// 只吃数据、吐 HTML 字符串，不碰 DOM / jQuery —— 于是可以直接单测。
// core.ts 的个人面板与实体卡片共用这里，消除"个人一套、实体一套"的重复。
//
// 折叠沿用 mate-sub + data-sub-key + expand_subs（core.ts:152 / 181-187）：
// 生成的 HTML 自己带上 collapsed / hidden class，事后由 applyUiStateToDom() 套状态。
// ================================================================

import { editSpan, editText } from './editable';

/**
 * 拼 lodash 路径。键名里的 `.` 会被 lodash 当成分隔符，
 * 于是「魔能.爆裂」会读写到 魔能 → 爆裂 这一层而非原名的那一条 —— 故转义成 `\.`。
 */
export function joinPath(parent: string, key: string): string {
  return parent + '.' + String(key).replace(/\./g, '\\.');
}

const 增益词 = /增益|强化|buff/i;
const 减益词 = /减益|负面|debuff/i;

/** 特殊状态的分类归一：先认减益，再认增益，其余归其他 */
export function statusKind(raw: unknown): '增益' | '减益' | '其他' {
  const s = String(raw ?? '').trim();
  if (减益词.test(s)) return '减益';
  if (增益词.test(s)) return '增益';
  return '其他';
}

/** 空值判定：null / undefined / 空串 都算空（0 与 false 不算空） */
function 空值(v: any): boolean {
  return v === null || v === undefined || v === '';
}

/** 特殊状态列表。`states` 即某个 `状态.特殊状态` 对象，`basePath` 是它的完整数据路径 */
export function renderSpecialStatusList(states: any, basePath: string): string {
  let entries: [string, any][];
  try {
    entries = Object.entries(states || {}).filter(([, v]) => !空值(v));
  } catch (e) {
    console.warn('[wxhl-statusbar] 特殊状态读取失败', basePath, e);
    return '<span class="empty-hint">无</span>';
  }
  if (entries.length === 0) return '<span class="empty-hint">无</span>';

  return entries
    .map(function ([name, entry]) {
      const 对象 = entry !== null && typeof entry === 'object' && !Array.isArray(entry);
      const o: any = 对象 ? entry : null;
      const kind = statusKind(o ? (o.分类 ?? o.类型) : '');
      const tag = kind === '增益' ? 'tag-green' : kind === '减益' ? 'tag-red' : 'tag-gray';
      const path = joinPath(basePath, name);

      let h =
        '<div class="state-line"><span class="tag ' + tag + '">' + kind + '</span> ' +
        '<strong style="color:#ddd5c8;">' + name + '</strong>';

      if (!o) {
        /* 旧字符串格式：整串就是说明 */
        h += ' <span style="font-size:13px;color:#a09080;">' + editText(String(entry), path) + '</span>';
      } else {
        const 说明键 = ['说明', '描述', '效果'].find(k => !空值(o[k]));
        if (说明键) {
          h += ' <span style="font-size:13px;color:#a09080;">' + editText(String(o[说明键]), joinPath(path, 说明键)) + '</span>';
        }
        if (!空值(o.层数)) {
          h += ' <span class="tag tag-orange">' + editSpan(o.层数, joinPath(path, '层数')) + '层</span>';
        }
        if (!空值(o.持续时间)) {
          h += ' <span style="font-size:12px;color:#807060;">持续：' + editText(String(o.持续时间), joinPath(path, '持续时间')) + '</span>';
        }
        if (!空值(o.来源)) {
          h += ' <span style="font-size:12px;color:#807060;">来源：' + editText(String(o.来源), joinPath(path, '来源')) + '</span>';
        }
      }
      return h + '</div>';
    })
    .join('');
}
