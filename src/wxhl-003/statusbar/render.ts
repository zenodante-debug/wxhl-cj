// ================================================================
// 状态栏 · 渲染器（纯函数）
//
// 只吃数据、吐 HTML 字符串，不碰 DOM / jQuery —— 于是可以直接单测。
// core.ts 的个人面板与实体卡片共用这里，消除"个人一套、实体一套"的重复。
//
// 折叠沿用 mate-sub + data-sub-key + expand_subs（core.ts:152 / 181-187）：
// 生成的 HTML 自己带上 collapsed / hidden class，事后由 applyUiStateToDom() 套状态。
// ================================================================

import { editableKey, editSpan, editText, escapeAttr } from './editable';

/**
 * 拼 lodash 路径。键名里的 `.`（以及 `[` `]`）会被 lodash 当成路径语法，
 * 于是「魔能.爆裂」会读写到 魔能 → 爆裂 那一层，而不是名叫「魔能.爆裂」的那一条。
 *
 * 注意：lodash 4 的**反斜杠转义无效**（`_.toPath('a\\.b')` 仍按点切分，实测 4.18.1），
 * 所以必须走方括号写法 `['魔能.爆裂']`。常规键保持 `a.b` 形式不变。
 */
export function joinPath(parent: string, key: string): string {
  const k = String(key);
  if (!/[.[\]]/.test(k)) return parent + '.' + k;
  return parent + "['" + k.replace(/\\/g, '\\\\').replace(/'/g, "\\'") + "']";
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

const 是对象 = (v: any): boolean => v !== null && typeof v === 'object' && !Array.isArray(v);
/** 条目自带计数？（有 当前 或 上限 任一） */
const 有计数 = (v: any): boolean =>
  Object.prototype.hasOwnProperty.call(v, '当前') || Object.prototype.hasOwnProperty.call(v, '上限');
/** 该对象是不是「分组」（而不是一条叶子条目）：显式标注，或含嵌套对象/数组 */
const 是分组 = (v: any): boolean =>
  v.类型 === '分组' || Object.values(v).some(x => 是对象(x) || Array.isArray(x));

/** 折叠块：生成的 HTML 自己带 collapsed / hidden，事后由 applyUiStateToDom() 套状态 */
function 折叠块(标题Html: string, 内容: string, 键: string, 展开: boolean): string {
  return (
    '<div class="mate-sub" style="margin-top:4px;">' +
    '<div class="mate-sub-header" data-sub-key="' + escapeAttr(键) + '">' +
    '<span class="mate-sub-title">' + 标题Html + '</span>' +
    '<span class="mate-sub-toggle' + (展开 ? '' : ' collapsed') + '">▼</span></div>' +
    '<div class="mate-sub-body' + (展开 ? '' : ' hidden') + '">' + 内容 + '</div>' +
    '</div>'
  );
}

/**
 * 通用特殊资源树。`data` 即某个 `特殊资源` 对象（一级 key = 来源），
 * `keyBase` 是折叠键前缀（个人面板给 '契约者.特殊资源'，实体给 subKeyBase + '.特殊资源'）。
 */
export function renderResourceTree(data: any, basePath: string, expanded: Set<string>, keyBase: string): string {
  const 集合 = expanded instanceof Set ? expanded : new Set<string>();

  /** 计数文本：`当前 / 上限 单位`，当前缺失显示「未记录」 */
  const 计数 = (v: any, 路径: string): string => {
    const cur = v.当前, max = v.上限;
    const curHtml =
      空值(cur) || !Number.isFinite(Number(cur))
        ? '<span class="empty-hint" style="padding:0;display:inline;">未记录</span>'
        : editSpan(cur, joinPath(路径, '当前'));
    const unit = 空值(v.单位) ? '点' : v.单位;
    return curHtml + ' / ' + editSpan(max ?? 0, joinPath(路径, '上限')) + ' ' + editText(String(unit), joinPath(路径, '单位'));
  };

  /** 叶子条目：名称（可改名）+ 计数 + 其余标量字段 */
  const 条目叶 = (名称: string, v: any, 路径: string, 父路径: string | null): string => {
    const 名 = 父路径 === null ? 名称 : editableKey(名称, 父路径);
    let h = '<div class="skill-line"><span style="color:#e0c080;font-weight:bold;">' + 名 + '</span>';
    if (有计数(v)) h += ' <span style="color:#a09080;">' + 计数(v, 路径) + '</span>';
    Object.keys(v).forEach(function (k) {
      if (k === '当前' || k === '上限' || k === '单位' || k === '类型') return;
      const val = v[k];
      if (空值(val) || 是对象(val) || Array.isArray(val)) return;
      h += '<div style="margin-top:2px;font-size:13px;color:#a09080;">' + k + '：' + editText(String(val), joinPath(路径, k)) + '</div>';
    });
    return h + '</div>';
  };

  const 渲染节点 = (名称: string, 值: any, 路径: string, 键: string, 父路径: string | null): string => {
    try {
      if (空值(值)) return '';
      if (值 instanceof Date || typeof 值 === 'function') return '';

      if (Array.isArray(值)) {
        if (值.length === 0) return '';
        const 内容 = 值
          .map((项, i) => 渲染节点('[' + (i + 1) + ']', 项, 路径 + '.' + i, 键 + '.' + i, null))
          .join('');
        return 内容 === '' ? '' : 折叠块(名称 + ' (' + 值.length + ')', 内容, 键, 集合.has(键));
      }

      if (是对象(值)) {
        const 键们 = Object.keys(值);
        if (键们.length === 0) return '';
        const 计Html = 有计数(值) ? '　' + 计数(值, 路径) : '';
        if (是分组(值)) {
          const 内容 = 键们
            .filter(k => k !== '类型' && k !== '当前' && k !== '上限' && k !== '单位')
            .map(k => 渲染节点(k, 值[k], joinPath(路径, k), 键 + '.' + k, 路径))
            .join('');
          return 内容 === '' ? '' : 折叠块(名称 + 计Html, 内容, 键, 集合.has(键));
        }
        return 条目叶(名称, 值, 路径, 父路径);
      }

      /* 标量 */
      return (
        '<div class="skill-line"><span style="color:#e0c080;font-weight:bold;">' + 名称 + '</span>' +
        '<div style="margin-top:2px;font-size:13px;color:#a09080;">' + editText(String(值), 路径) + '</div></div>'
      );
    } catch (e) {
      console.warn('[wxhl-statusbar] 资源渲染失败', 路径, e);
      return '';
    }
  };

  const 根们 = Object.keys(data || {});
  if (根们.length === 0) return '<span class="empty-hint">暂无资源</span>';

  /* 根层：数据路径从 basePath 起、折叠键从 keyBase 起；父路径传 basePath（根下面这一层才可改名） */
  const 内容 = 根们
    .map(k => 渲染节点(k, data[k], joinPath(basePath, k), keyBase + '.' + k, basePath))
    .join('');

  if (内容 === '') return '<span class="empty-hint">暂无资源</span>';
  return 折叠块('<span style="color:#a09080;">资源列表 (' + 根们.length + ')</span>', 内容, keyBase, 集合.has(keyBase));
}

/** 职业特性：值可能是文字叶，也可能是嵌套分组，递归渲染 */
function 渲染特性(name: string, value: any, 路径: string, 键: string, 集合: Set<string>): string {
  if (空值(value)) return '';
  if (typeof value === 'string') {
    return (
      '<div class="skill-line"><span style="color:#b8a070;font-weight:bold;">' + name + '</span><br>' +
      '<span style="font-size:13px;color:#a09080;">' + editText(value, 路径) + '</span></div>'
    );
  }
  if (是对象(value)) {
    /* 旧写法 {效果: "..."} 且没有更深嵌套 → 当文字叶处理 */
    const keys = Object.keys(value);
    const nested = keys.some(k => 是对象(value[k]) || Array.isArray(value[k]));
    if (!nested && !空值(value.效果)) {
      return (
        '<div class="skill-line"><span style="color:#b8a070;font-weight:bold;">' + name + '</span><br>' +
        '<span style="font-size:13px;color:#a09080;">' + editText(String(value.效果), joinPath(路径, '效果')) + '</span></div>'
      );
    }
    if (keys.length === 0) return '';
    const 内容 = keys.map(k => 渲染特性(k, value[k], joinPath(路径, k), 键 + '.' + k, 集合)).join('');
    return 折叠块(name + ' (' + keys.length + ')', 内容, 键, 集合.has(键));
  }
  return '';
}

/** 精简技能列表：名称 + 等级 + 其余标量字段，全部可编辑 */
function 渲染技能列表(skills: any, 路径: string): string {
  const keys = Object.keys(skills || {});
  if (keys.length === 0) return '<span class="empty-hint">无或未知</span>';
  return keys
    .map(function (k) {
      const s = skills[k] || {};
      const p = joinPath(路径, k);
      let h = '<div class="skill-line"><span style="color:#e0c080;font-weight:bold;font-size:15px;">' +
        editText(_.get(s, '名称', '') || k, joinPath(p, '名称')) + '</span>';
      const lv = _.get(s, '等级', '');
      if (!空值(lv) && lv !== '无') h += ' <span style="color:#a09080;font-size:12px;">Lv.' + editSpan(lv, joinPath(p, '等级')) + '</span>';
      ['分类', '类型', '阶位', '消耗', '冷却'].forEach(function (f) {
        const v = _.get(s, f, '');
        if (空值(v) || v === '无') return;
        h += '<div style="margin-top:2px;font-size:13px;color:#a09080;">' + f + '：' + editText(String(v), joinPath(p, f)) + '</div>';
      });
      return h + '</div>';
    })
    .join('');
}

/**
 * 职业区主体：职业简介 + 职业特性（递归）+ 职业技能 + 传承技能。
 * 个人面板与实体卡片共用 —— 上方「名称/稀有度/职业等级/PEXP/主副属性加成」是静态行，
 * 各自保留在原地，本函数只负责需要逻辑的那几块。
 */
export function renderCareerSection(career: any, basePath: string, expanded: Set<string>, keyBase: string): string {
  const 集合 = expanded instanceof Set ? expanded : new Set<string>();
  const c = career || {};
  let h = '';

  /* 职业简介 */
  h +=
    '<div class="row"><span class="label">职业简介</span><span class="value-dim">' +
    editText(_.get(c, '职业简介', '无') || '无', joinPath(basePath, '职业简介')) +
    '</span></div>';

  /* 职业特性 */
  const 特性 = _.get(c, '职业特性', {}),
    特性键 = Object.keys(特性 || {});
  if (特性键.length === 0) {
    h += '<span class="empty-hint">暂无职业特性</span>';
  } else {
    h += 特性键.map(k => 渲染特性(k, 特性[k], joinPath(joinPath(basePath, '职业特性'), k), keyBase + '.职业特性.' + k, 集合)).join('');
  }

  /* 职业技能 */
  h +=
    '<div style="margin-top:6px;"><span class="mate-sub-title" style="color:#a09080;font-size:13px;">职业技能</span>' +
    渲染技能列表(_.get(c, '职业技能', {}), joinPath(basePath, '职业技能')) +
    '</div>';

  /* 传承技能 */
  h +=
    '<div style="margin-top:6px;"><span class="mate-sub-title" style="color:#a09080;font-size:13px;">传承技能</span>' +
    渲染技能列表(_.get(c, '传承技能', {}), joinPath(basePath, '传承技能')) +
    '</div>';

  return h;
}
