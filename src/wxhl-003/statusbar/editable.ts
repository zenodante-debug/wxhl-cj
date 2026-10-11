// ================================================================
// 状态栏 · 可编辑原子
//
// 从 core.ts 抽出来，供 core.ts 与 render.ts 共用 ——
// 否则 render.ts 导入 core.ts、core.ts 又导入 render.ts，会成环。
// 全部是纯字符串函数：只吐 HTML，不碰 DOM，因此可以直接单测。
// ================================================================

/** HTML属性转义：防止实体名/物品名含引号时炸属性 */
export function escapeAttr(str: any) {
  return String(str === undefined || str === null ? '' : str).replace(/"/g, '&quot;');
}

/** 可编辑数字 span（点击改数） */
export function editSpan(val: any, path: string) {
  return `<span class="editable-num" data-path="${path}" data-val="${val}" title="点击修改数字">${val}</span>`;
}

/** 可编辑文本 span（失焦保存） */
export function editText(val: any, path: string) {
  return `<span class="editable-text" contenteditable="true" spellcheck="false" data-path="${path}" data-val="${(val + '').replace(/"/g, '&quot;')}" title="点击修改文字，失去焦点自动保存">${val}</span>`;
}

/**
 * 可改名的键。
 * 键不是字段，改名要动结构：data-path 给父对象路径、data-key 给当前键名，
 * 由 core.ts 的 blur 处理器做「改名 = unset 旧键 + set 新键」「清空 = 删除」。
 */
export function editableKey(name: string, parentPath: string) {
  return `<span class="editable-key" contenteditable="true" spellcheck="false" data-path="${parentPath}" data-key="${escapeAttr(name)}" title="点击改名；清空即删除">${name}</span>`;
}
