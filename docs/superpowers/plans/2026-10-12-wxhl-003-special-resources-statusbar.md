# 小手机状态栏 · 特殊资源 / 特殊状态 / 职业区 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让小手机状态栏读懂新的变量结构 —— 通用「特殊资源」池按来源分组递归折叠、特殊状态结构化展示、职业区支持职业简介与嵌套特性。

**Architecture:** 新增 `statusbar/render.ts` 承载三个**纯函数**渲染器（零 DOM/jQuery，只吃数据吐 HTML 字符串），由 `core.ts` 的个人面板与实体卡片共同调用，消除现在"个人一套、实体一套"的重复。折叠沿用既有的 `mate-sub` + `data-sub-key` + `expand_subs` 机制。为打破循环依赖，把 `escapeAttr` / `editSpan` / `editText` 从 `core.ts` 抽到新的 `statusbar/editable.ts`。

**Tech Stack:** TypeScript、lodash（全局 `_`）、jQuery（仅 `core.ts` 侧）、Vitest（纯函数单测，`environment: 'node'`）

**Spec:** `docs/superpowers/specs/2026-10-12-wxhl-003-special-resources-statusbar-design.md`

## Global Constraints

- **测试命令必须带 `--maxWorkers=4`**：`npx vitest run --maxWorkers=4`。不带参数的默认并行度会一次 spawn 166 个 worker 把环境打爆，报出与真实结果无关的 `Vitest failed to find the runner`。
- **回归基线**：2418 通过 / 1 失败。唯一的失败是 `cloudflare/wxhl-market/rank.test.js`（市场加了 `hasMore` 后旧断言未更新），**与本计划无关，不得在本计划中修**。任何任务结束时通过数不得低于 2418。
- **纯函数模块不得 import `core.ts`**（会成环）。`render.ts` 只允许 import `./editable`。
- **折叠键一律用数据路径**（经 `joinPath` 转义），不得用标题文本 —— `group`/`section` 那两套折叠用标题当键，动态生成同名分组会撞键。
- **渲染器不抛异常**：任何畸形值一律降级或跳过，并 `console.warn` 带路径。状态栏是玩家随时打开的面板，一个坏条目不该让整块白屏。
- **不新增 `.career-resource*` 之类的新样式类**：复用现有 `mate-sub` / `mate-sub-title` / `mate-sub-toggle` / `mate-sub-body` / `skill-line` / `state-line` / `empty-hint` / `tag-green` / `tag-red` / `tag-gray` / `tag-orange`（全部已存在于 `statusbar/theme.scss`，嵌套在 `.wxhl-sb` 下）。
- **不读 `职业.职业资源`**（旧字段已废弃）。
- **不写任何 MVU 论坛档案**。

## Review Focus

按最可能先咬人的顺序，以下五类输入/条件在 spec 里是隐含的，各自钉在拥有该代码的任务上：

1. **资源条目的键名里含 `.`** —— lodash 会把 `.` 当路径分隔符，读写会落到错的层级甚至凭空造出嵌套对象。期望：键名里的 `.` 被转义成 `\.`，读写仍落在原名的那一条上。（Task 4）
2. **资源条目是空值** —— `null` / `''` / 空对象 / 空数组。期望：整条跳过，不产生空行、不产生悬空的折叠块。（Task 4）
3. **特殊状态仍是旧字符串格式** —— 老存档里 `特殊状态.中毒 = "每回合掉 3 血"`。期望：正常显示、标签为「其他」、内容可编辑，**不得**渲染成 `[object Object]`。（Task 2）
4. **资源改名 / 清空** —— 改名不得误删或覆盖兄弟条目；清空是删除，必须有确认。期望：重名时提示且不执行，清空时先 `confirm`。（Task 7）
5. **两个不同实体下的同名折叠键** —— 例如两个副本角色都有「特殊资源」子树。期望：键由实体路径前缀区分，展开一个不影响另一个。（Task 6）

---

### Task 1: 准备 —— 权威变量结构入库 + 抽出可编辑原子

**Files:**
- Create: `src/wxhl-003/变量结构_特殊资源通用版.json`
- Create: `src/wxhl-003/statusbar/editable.ts`
- Create: `src/wxhl-003/__tests__/statusbarEditable.test.ts`
- Modify: `src/wxhl-003/statusbar/core.ts`（删除本地 `escapeAttr`/`editSpan`/`editText` 定义，改为 import）

**Interfaces:**
- Consumes: 无
- Produces:
  - `escapeAttr(str: any): string`
  - `editSpan(val: any, path: string): string`
  - `editText(val: any, path: string): string`
  - `editableKey(name: string, parentPath: string): string` —— 可改名的键；`data-path` 指向父对象，`data-key` 是当前键

- [ ] **Step 1: 把权威变量结构复制进仓库**

用文件内容替换（不要手抄）—— 源文件：

```text
C:\Users\zero\Downloads\酒馆助手脚本-变量结构-特殊资源通用版 (1).json
```

目标路径 `src/wxhl-003/变量结构_特殊资源通用版.json`。这是**主卡权威结构、只读副本**，与 `src/wxhl-cygf/变量结构_特殊资源通用版.json` 同一先例（见 `src/wxhl-cygf/README.md:33`），代码只读它、不改它。

复制后确认它是合法 JSON 且 `content` 字段里含 `职业简介`：

```bash
python -c "import json;d=json.load(open(r'src/wxhl-003/变量结构_特殊资源通用版.json',encoding='utf-8'));print('职业简介' in d['content'], '职业目录' in d['content'])"
```

预期输出：`True False`

- [ ] **Step 2: 为新模块写失败测试**

创建 `src/wxhl-003/__tests__/statusbarEditable.test.ts`：

```ts
// 可编辑原子：纯字符串函数，只吐 HTML，不碰 DOM。
import { editableKey, editSpan, editText, escapeAttr } from '../statusbar/editable';

describe('escapeAttr', () => {
  it('把双引号转义，避免炸属性', () => {
    expect(escapeAttr('a"b')).toBe('a&quot;b');
  });
  it('null / undefined 变空串', () => {
    expect(escapeAttr(null)).toBe('');
    expect(escapeAttr(undefined)).toBe('');
  });
});

describe('editSpan / editText', () => {
  it('editSpan 带 editable-num 与 data-path', () => {
    const h = editSpan(3, '契约者.特殊资源.职业.充能.当前');
    expect(h).toContain('class="editable-num"');
    expect(h).toContain('data-path="契约者.特殊资源.职业.充能.当前"');
  });
  it('editText 带 editable-text，且 data-val 里的引号被转义', () => {
    const h = editText('说"话"', '契约者.状态.特殊状态.中毒.说明');
    expect(h).toContain('class="editable-text"');
    expect(h).toContain('data-val="说&quot;话&quot;"');
  });
});

describe('editableKey', () => {
  it('data-path 指父对象、data-key 是当前键', () => {
    const h = editableKey('充能', '契约者.特殊资源.职业');
    expect(h).toContain('class="editable-key"');
    expect(h).toContain('data-path="契约者.特殊资源.职业"');
    expect(h).toContain('data-key="充能"');
  });
  it('键里的引号被转义', () => {
    expect(editableKey('a"b', 'p')).toContain('data-key="a&quot;b"');
  });
});
```

- [ ] **Step 3: 跑测试确认失败**

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarEditable.test.ts`
Expected: FAIL —— `Failed to resolve import "../statusbar/editable"`

- [ ] **Step 4: 创建 `statusbar/editable.ts`**

把 `core.ts:69` 的 `escapeAttr`、`core.ts:190` 的 `editSpan`、`core.ts:193` 的 `editText` **原样搬过来**（三者的实现一字不改），加上 `editableKey`：

```ts
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
```

- [ ] **Step 5: 跑测试确认通过**

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarEditable.test.ts`
Expected: PASS（5 个用例）

- [ ] **Step 6: 让 `core.ts` 改用新模块**

在 `core.ts` 顶部（`import { 位阶修正值系数, ... } from './tier';` 那一带）加：

```ts
import { editSpan, editText, escapeAttr } from './editable';
```

然后**删掉** `core.ts` 内部的这三处定义：

- `core.ts:68-71` 的 `function escapeAttr(str: any) { ... }`（含其上那行注释 `/* HTML属性转义：... */`，注释一并搬走）
- `core.ts:190-192` 的 `function editSpan(val: any, path: string) { ... }`
- `core.ts:193-195` 的 `function editText(val: any, path: string) { ... }`

删完后 `core.ts` 里这三个名字仍被大量调用（`renderSkillsHtml`、`renderEquipHtml`、`populateCharacterData` 等），靠上面的 import 解析 —— **不要**改成 `editable.editSpan(...)` 之类的调用形式，保持调用点不变，改动面最小。

- [ ] **Step 7: 跑全量回归**

Run: `npx vitest run --maxWorkers=4`
Expected: 2423 通过（2418 基线 + 新增 5）/ 1 失败（那个既有的市场测试）

- [ ] **Step 8: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 与改动前相同的错误数（本仓库有既有基线；把改动**前**跑一次的数字记下来，改完不得增加）

- [ ] **Step 9: 提交**

```bash
git add src/wxhl-003/变量结构_特殊资源通用版.json src/wxhl-003/statusbar/editable.ts src/wxhl-003/__tests__/statusbarEditable.test.ts src/wxhl-003/statusbar/core.ts
git commit -m "refactor(wxhl): 状态栏可编辑原子抽成 editable.ts + 权威变量结构入库"
```

---

### Task 2: 特殊状态渲染器（纯函数）

**Files:**
- Create: `src/wxhl-003/statusbar/render.ts`
- Create: `src/wxhl-003/__tests__/statusbarRender.test.ts`

**Interfaces:**
- Consumes: `./editable` 的 `editSpan` / `editText` / `editableKey` / `escapeAttr`
- Produces:
  - `statusKind(raw: unknown): '增益' | '减益' | '其他'`
  - `joinPath(parent: string, key: string): string` —— 转义键名里的 `.`
  - `renderSpecialStatusList(states: any, basePath: string): string`

- [ ] **Step 1: 写失败测试**

创建 `src/wxhl-003/__tests__/statusbarRender.test.ts`（本任务只写第一部分，后续任务往同一文件追加 describe）：

```ts
// 状态栏渲染器：纯函数，只吐 HTML 字符串。
import { joinPath, renderSpecialStatusList, statusKind } from '../statusbar/render';

describe('joinPath', () => {
  it('普通键直接拼', () => {
    expect(joinPath('契约者.特殊资源', '职业')).toBe('契约者.特殊资源.职业');
  });
  it('键里的点被转义，免得 lodash 把它当分隔符', () => {
    expect(joinPath('契约者.特殊资源', '魔能.爆裂')).toBe('契约者.特殊资源.魔能\\.爆裂');
  });
});

describe('statusKind', () => {
  it.each([
    ['增益', '增益'],
    ['强化', '增益'],
    ['buff', '增益'],
    ['BUFF', '增益'],
    ['减益', '减益'],
    ['负面', '减益'],
    ['debuff', '减益'],
    ['其他', '其他'],
    ['', '其他'],
  ])('%s → %s', (input, expected) => {
    expect(statusKind(input)).toBe(expected);
  });
  it('认不出（undefined / null）归其他', () => {
    expect(statusKind(undefined)).toBe('其他');
    expect(statusKind(null)).toBe('其他');
  });
});

describe('renderSpecialStatusList', () => {
  it('旧字符串格式：原样显示、标签归其他、内容可编辑', () => {
    const h = renderSpecialStatusList({ 中毒: '每回合掉 3 血' }, '契约者.状态.特殊状态');
    expect(h).toContain('tag-gray');
    expect(h).toContain('其他');
    expect(h).toContain('每回合掉 3 血');
    expect(h).toContain('data-path="契约者.状态.特殊状态.中毒"');
    expect(h).not.toContain('[object Object]');
  });

  it('结构化格式：分类上色 + 说明/层数/持续/来源', () => {
    const h = renderSpecialStatusList(
      {
        狂暴: { 分类: '增益', 说明: '攻击 +30%', 来源: '血统', 持续时间: '3 回合', 层数: 2 },
      },
      '契约者.状态.特殊状态',
    );
    expect(h).toContain('tag-green');
    expect(h).toContain('增益');
    expect(h).toContain('攻击 +30%');
    expect(h).toContain('3 回合');
    expect(h).toContain('血统');
    expect(h).toContain('data-path="契约者.状态.特殊状态.狂暴.层数"');
    expect(h).toContain('层');
  });

  it('缺省字段不渲染：没有层数就没有「层」字', () => {
    const h = renderSpecialStatusList({ 虚弱: { 分类: '减益', 说明: '力气小' } }, 'p');
    expect(h).toContain('tag-red');
    expect(h).not.toContain('层');
    expect(h).not.toContain('持续：');
    expect(h).not.toContain('来源：');
  });

  it('兼容旧字段名 描述 / 效果', () => {
    expect(renderSpecialStatusList({ a: { 描述: '甲' } }, 'p')).toContain('甲');
    expect(renderSpecialStatusList({ b: { 效果: '乙' } }, 'p')).toContain('乙');
  });

  it('空值条目跳过；全空显示「无」', () => {
    expect(renderSpecialStatusList({}, 'p')).toContain('无');
    expect(renderSpecialStatusList({ a: '', b: null, c: undefined }, 'p')).toContain('无');
  });

  it('对象型状态不得渲染成 [object Object]', () => {
    expect(renderSpecialStatusList({ x: { 分类: '增益' } }, 'p')).not.toContain('[object Object]');
  });
});
```

> 注：上面 `expect(h).toContain('every'.length ? ... : '')` 是笔误的占位，实现时**改成** `expect(h).toContain('每回合掉 3 血');`。

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarRender.test.ts`
Expected: FAIL —— `Failed to resolve import "../statusbar/render"`

- [ ] **Step 3: 写实现**

创建 `src/wxhl-003/statusbar/render.ts`：

```ts
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
```

`escapeAttr` 与 `editableKey` 本任务用不到，先不 import —— Task 4 会用到，届时把顶部那行改成：

```ts
import { editableKey, editSpan, editText, escapeAttr } from './editable';
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarRender.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/statusbar/render.ts src/wxhl-003/__tests__/statusbarRender.test.ts
git commit -m "feat(wxhl): 状态栏特殊状态渲染器（分类归一 + 结构化字段 + 旧格式兼容）"
```

---

### Task 3: 特殊状态接入个人面板与实体卡片

**Files:**
- Modify: `src/wxhl-003/statusbar/core.ts`（`1898-1912` 个人、`1434-1448` 实体）

**Interfaces:**
- Consumes: Task 2 的 `renderSpecialStatusList(states, basePath)`
- Produces: 无新接口

- [ ] **Step 1: 改个人面板（core.ts:1898-1912）**

把这一整段：

```ts
      let specStates = d('契约者.状态.特殊状态', {}),
        ssHtml = '',
        ssKeys = Object.keys(specStates);
      if (ssKeys.length === 0) ssHtml = '<span class="empty-hint">无</span>';
      else {
        ssKeys.forEach(function (k) {
          ssHtml +=
            '<div class="state-line"><span class="tag tag-red">' +
            k +
            '</span> <span style="font-size:13px;color:#a09080;">' +
            editText(specStates[k] || '', '契约者.状态.特殊状态.' + k) +
            '</span></div>';
        });
      }
      $c.find('#state-special').html(ssHtml);
```

替换成：

```ts
      $c.find('#state-special').html(renderSpecialStatusList(d('契约者.状态.特殊状态', {}), '契约者.状态.特殊状态'));
```

- [ ] **Step 2: 改实体卡片（core.ts:1434-1448）**

把这一整段：

```ts
      /* ---------- 特殊状态 ---------- */
      const specStates = _.get(state, '特殊状态', {}),
        ssKeys = Object.keys(specStates);
      if (ssKeys.length > 0) {
        h += '<div style="margin-top:6px;">';
        ssKeys.forEach(function (k) {
          h +=
            '<div class="state-line"><span class="tag tag-red">' +
            k +
            '</span> <span style="font-size:13px;color:#a09080;">' +
            editText(specStates[k] || '', targetPath + '.状态.特殊状态.' + k) +
            '</span></div>';
        });
        h += '</div>';
      }
```

替换成：

```ts
      /* ---------- 特殊状态 ---------- */
      const ssHtml = renderSpecialStatusList(_.get(state, '特殊状态', {}), targetPath + '.状态.特殊状态');
      if (!ssHtml.includes('class="empty-hint"')) h += '<div style="margin-top:6px;">' + ssHtml + '</div>';
```

（实体卡片上原本「一条都没有就整块不出现」，保留这个行为：靠 `empty-hint` 判定。）

- [ ] **Step 3: 加 import**

在 `core.ts` 顶部 import 区加：

```ts
import { renderSpecialStatusList } from './render';
```

- [ ] **Step 4: 跑全量回归**

Run: `npx vitest run --maxWorkers=4`
Expected: 通过数与 Task 1 结束时相同（2423），1 个既有失败

- [ ] **Step 5: 手动核对（在酒馆里）**

打开状态栏 → `◆ 状态`：给某个存档的 `契约者.状态.特殊状态` 手写一条对象（如 `中毒: {分类: "减益", 说明: "每回合掉 3 血", 层数: 2}`），确认面板显示红标签「减益」+ 说明 + `2层`，**且不出现 `[object Object]`**。

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/statusbar/core.ts
git commit -m "feat(wxhl): 个人面板与实体卡片接入结构化特殊状态"
```

---

### Task 4: 特殊资源树渲染器（纯函数）

**Files:**
- Modify: `src/wxhl-003/statusbar/render.ts`
- Modify: `src/wxhl-003/__tests__/statusbarRender.test.ts`（追加 describe）

**Interfaces:**
- Consumes: Task 2 的 `joinPath`
- Produces: `renderResourceTree(data: any, basePath: string, expanded: Set<string>, keyBase: string): string`

- [ ] **Step 1: 写失败测试**

往 `statusbarRender.test.ts` 追加：

```ts
import { renderResourceTree } from '../statusbar/render';

describe('renderResourceTree', () => {
  const 无 = new Set<string>();

  it('空对象 → 暂无资源', () => {
    expect(renderResourceTree({}, 'p', 无, 'k')).toContain('暂无资源');
  });

  it('带 当前/上限 的条目：显示计数与单位', () => {
    const h = renderResourceTree(
      { 职业: { 充能: { 当前: 2, 上限: 3, 单位: '层', 恢复方式: '短休' } } },
      '契约者.特殊资源', 无, 'k',
    );
    expect(h).toContain('充能');
    expect(h).toContain('data-path="契约者.特殊资源.职业.充能.当前"');
    expect(h).toContain('data-path="契约者.特殊资源.职业.充能.上限"');
    expect(h).toContain('短休');
  });

  it('缺 当前 → 显示未记录', () => {
    const h = renderResourceTree({ g: { r: { 上限: 5 } } }, 'p', 无, 'k');
    expect(h).toContain('未记录');
  });

  it('嵌套对象 → 折叠块，标题带条数', () => {
    const h = renderResourceTree({ 血统: { 龙裔: { 龙息: { 当前: 1, 上限: 1 } } } }, 'p', 无, 'k');
    expect(h).toContain('mate-sub');
    expect(h).toContain('data-sub-key="k.血统"');
    expect(h).toContain('龙息');
  });

  it('数组 → 折叠块，标题带长度', () => {
    const h = renderResourceTree({ 列表: [10, 20] }, 'p', 无, 'k');
    expect(h).toContain('(2)');
    expect(h).toContain('10');
    expect(h).toContain('20');
  });

  it('标量 → 一行 名称：值', () => {
    const h = renderResourceTree({ 备注: '随便写点' }, 'p', 无, 'k');
    expect(h).toContain('备注');
    expect(h).toContain('随便写点');
  });

  it('空值条目整条跳过，不产生空行', () => {
    const h = renderResourceTree({ a: null, b: '', c: {}, d: [] }, 'p', 无, 'k');
    expect(h).not.toContain('skill-line');
  });

  it('键名含点：data-path 里被转义，且不产生错层', () => {
    const h = renderResourceTree({ 职业: { '魔能.爆裂': { 当前: 1, 上限: 1 } } }, '契约者.特殊资源', 无, 'k');
    expect(h).toContain('data-path="契约者.特殊资源.职业.魔能\\.爆裂.当前"');
  });

  it('默认折叠：未展开时带 collapsed / hidden', () => {
    const h = renderResourceTree({ g: { a: { 当前: 1, 上限: 1 } } }, 'p', 无, 'k');
    expect(h).toContain('collapsed');
    expect(h).toContain('hidden');
  });

  it('已展开：根块与分组块都不带 collapsed', () => {
    const h = renderResourceTree({ g: { a: { 当前: 1, 上限: 1 } } }, 'p', new Set(['k', 'k.g']), 'k');
    expect(h).not.toContain('collapsed');
  });

  it('畸形值不抛异常', () => {
    expect(() => renderResourceTree({ a: new Date() } as any, 'p', 无, 'k')).not.toThrow();
    expect(() => renderResourceTree(null, 'p', 无, 'k')).not.toThrow();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarRender.test.ts`
Expected: FAIL —— `renderResourceTree is not a function`

- [ ] **Step 3: 实现在 `render.ts` 末尾追加**

先把 `render.ts` 顶部那行 import 补全（本任务要用到 `escapeAttr` 与 `editableKey`）：

```ts
import { editableKey, editSpan, editText, escapeAttr } from './editable';
```

然后在文件末尾追加：

```ts
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
```

要点：`渲染节点` 的第五个参数 `父路径` 是「这个节点所在的父对象路径」，只有叶子条目会用它生成可改名键；数组项与更深层递归传当前 `路径`（数组项传 `null`，即数组里的东西没有名字可改）。空的分组/数组整块消失，不留悬空折叠块。

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarRender.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/statusbar/render.ts src/wxhl-003/__tests__/statusbarRender.test.ts
git commit -m "feat(wxhl): 通用特殊资源树渲染器（按来源分组、递归折叠、可编辑）"
```

---

### Task 5: 特殊资源接入个人面板

**Files:**
- Modify: `src/wxhl-003/statusbar/template.html`（`◆ 状态` 的 `特殊状态` sub-section 之后）
- Modify: `src/wxhl-003/statusbar/core.ts`（`#state-special` 填充处之后）

**Interfaces:**
- Consumes: Task 4 的 `renderResourceTree(data, basePath, expanded, keyBase)`
- Produces: 无新接口

- [ ] **Step 1: 模板加槽位**

`template.html` 里找到 `◆ 状态` 的 sub-section（约 `276-280`）：

```html
                    <div class="sub-section">
                      <div class="sub-title">特殊状态</div>
                      <div id="state-special"><span class="empty-hint">无</span></div>
                    </div>
```

在它**后面**紧挨着插入同级的一块：

```html
                    <div class="sub-section">
                      <div class="sub-title">特殊资源</div>
                      <div id="state-resources"></div>
                    </div>
```

- [ ] **Step 2: 填充逻辑**

在 `core.ts` 里 Task 3 改好的那行

```ts
      $c.find('#state-special').html(renderSpecialStatusList(d('契约者.状态.特殊状态', {}), '契约者.状态.特殊状态'));
```

**后面**加一行：

```ts
      $c.find('#state-resources').html(
        renderResourceTree(d('契约者.特殊资源', {}), '契约者.特殊资源', _ui.expand_subs, '契约者.特殊资源'),
      );
```

- [ ] **Step 3: 加 import**

`core.ts` 顶部：

```ts
import { renderResourceTree, renderSpecialStatusList } from './render';
```

- [ ] **Step 4: 跑全量回归**

Run: `npx vitest run --maxWorkers=4`
Expected: 与 Task 1 结束时相同（2423 通过 / 1 既有失败）

- [ ] **Step 5: 手动核对（在酒馆里）**

给存档写 `契约者.特殊资源 = {职业: {充能: {当前: 2, 上限: 3, 单位: "层", 说明: "..."}}, 血统: {龙裔: {龙息: {当前: 1, 上限: 1}}}}`，打开 `◆ 状态`：能看到「特殊资源」块，点标题能展开/收起，刷新页面后展开状态还在（`mvu_statusbar_ui_state`）。

- [ ] **Step 6: 提交**

```bash
git add src/wxhl-003/statusbar/template.html src/wxhl-003/statusbar/core.ts
git commit -m "feat(wxhl): 个人面板接入通用特殊资源面板"
```

---

### Task 6: 特殊资源接入三类实体卡片

**Files:**
- Modify: `src/wxhl-003/statusbar/core.ts`（`renderEntityCard`：`subKeyBase` 声明区 `1183-1193`、子区块末尾 `1432` 附近）

**Interfaces:**
- Consumes: Task 4 的 `renderResourceTree`
- Produces: 无新接口

- [ ] **Step 1: 补折叠键与展开态**

在 `core.ts:1187-1193` 那一组 `const subXxxExpanded / safeSubXxx` 里，追加两行（紧跟 `safeSubBag` 之后）：

```ts
      const subResExpanded = _ui.expand_subs.has(subKeyBase + '.特殊资源');
      const safeSubRes = escapeAttr(subKeyBase + '.特殊资源');
```

- [ ] **Step 2: 在子区块序列末尾追加资源块**

找到背包子区块的收尾（`core.ts:1432` 的 `h += '</div>';` 之后、`/* ---------- 特殊状态 ---------- */` 之前），插入：

```ts
      /* ---------- 特殊资源子区块 ---------- */
      h += '<div class="mate-sub" style="margin-top:4px;">';
      h +=
        '<div class="mate-sub-header" data-sub-key="' +
        safeSubRes +
        '"><span class="mate-sub-title" style="color:' +
        subTitleColor +
        ';">特殊资源</span><span class="mate-sub-toggle' +
        (subResExpanded ? '' : ' collapsed') +
        '">▼</span></div>';
      h +=
        '<div class="mate-sub-body' +
        (subResExpanded ? '' : ' hidden') +
        '">' +
        renderResourceTree(_.get(m, '特殊资源', {}), targetPath + '.特殊资源', _ui.expand_subs, subKeyBase + '.特殊资源') +
        '</div>';
      h += '</div>';
```

- [ ] **Step 3: 跑全量回归**

Run: `npx vitest run --maxWorkers=4`
Expected: 与 Task 1 结束时相同

- [ ] **Step 4: 手动核对折叠键不串**

在酒馆里让存档同时有两个副本角色（如 `哥布林` 与 `史莱姆`），各自给一份 `特殊资源`。展开 `哥布林` 的资源块，确认 `史莱姆` 的资源块**没有跟着展开**（键前缀不同）。刷新后再确认展开态各自保留。

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/statusbar/core.ts
git commit -m "feat(wxhl): 小队成员/其他契约者/副本角色接入通用特殊资源面板"
```

---

### Task 7: 资源改名与清空删除

**Files:**
- Modify: `src/wxhl-003/statusbar/core.ts`（`bindEditable()` `528-556` 内追加）

**Interfaces:**
- Consumes: `editableKey` 产出的 `.editable-key`（`data-path` = 父对象路径，`data-key` = 当前键）
- Produces: `renameOrDeleteKey(parentPath: string, oldKey: string, newKey: string): Promise<void>`（`core.ts` 内部函数，不导出）

- [ ] **Step 1: 实现改名/删除**

在 `bindEditable()` 末尾（`core.ts:555` 之后、函数闭合 `}` 之前）追加：

```ts
    $c.off('blur', '.editable-key').on('blur', '.editable-key', function (this: HTMLElement) {
      const parentPath = $(this).attr('data-path')!,
        oldKey = $(this).attr('data-key')!,
        newKey = $(this).text().trim();

      if (newKey === oldKey) return;

      if (newKey === '') {
        if (!confirm('确认删除资源 [' + oldKey + '] 吗？此操作不可逆！')) {
          populateCharacterData();
          return;
        }
        void removeKey(parentPath, oldKey);
        return;
      }

      void renameOrDeleteKey(parentPath, oldKey, newKey);
    });
```

在 `bindEditable()` **之前**（`core.ts:527` 附近）定义这两个 async 函数：

```ts
  /** 删除某个键（清空名字 = 删除该条资源） */
  async function removeKey(parentPath: string, key: string) {
    try {
      const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      const 路径 = joinPath(parentPath, key);
      appendSystemLog(data, `你删除了资源 [${key}]`);
      _.unset(data.stat_data, 路径);
      await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
    } catch (e) {
      console.error('资源删除失败', e);
    }
    populateCharacterData();
  }

  /** 改名 = 删旧键 + 建新键；与兄弟键重名则提示并不执行 */
  async function renameOrDeleteKey(parentPath: string, oldKey: string, newKey: string) {
    try {
      const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      const parent = _.get(data.stat_data, parentPath, null);
      if (!parent || typeof parent !== 'object') {
        console.warn('[wxhl-statusbar] 找不到资源父对象', parentPath);
        populateCharacterData();
        return;
      }
      if (Object.prototype.hasOwnProperty.call(parent, newKey)) {
        alert('已存在同名资源「' + newKey + '」，改名未执行。');
        populateCharacterData();
        return;
      }
      const 值 = _.get(data.stat_data, joinPath(parentPath, oldKey));
      appendSystemLog(data, `你把资源 [${oldKey}] 改名为 [${newKey}]`);
      _.unset(data.stat_data, joinPath(parentPath, oldKey));
      _.set(data.stat_data, joinPath(parentPath, newKey), 值);
      await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
    } catch (e) {
      console.error('资源改名失败', e);
    }
    populateCharacterData();
  }
```

并在 `core.ts` 顶部把 `joinPath` 一起 import：

```ts
import { joinPath, renderResourceTree, renderSpecialStatusList } from './render';
```

- [ ] **Step 2: 为改名/删除的路径转义补测试**

在 `statusbarRender.test.ts` 的 `joinPath` describe 里追加：

```ts
  it('round-trip：转义后的路径能被 lodash 读回同一条', () => {
    const obj: any = { 职业: { '魔能.爆裂': { 当前: 1 } } };
    expect(_.get(obj, joinPath('职业', '魔能.爆裂') + '.当前')).toBe(1);
    _.set(obj, joinPath('职业', '魔能.爆裂') + '.当前', 7);
    expect(obj.职业['魔能.爆裂'].当前).toBe(7);
  });
```

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarRender.test.ts`
Expected: PASS

- [ ] **Step 3: 跑全量回归**

Run: `npx vitest run --maxWorkers=4`
Expected: 2424 通过（多一个 round-trip 用例）/ 1 既有失败

- [ ] **Step 4: 手动核对**

在酒馆里：把某个资源名改成别的名字 → 条目仍在、值不丢、`系统日志` 多一条记录；改成空 → 弹确认，取消则原样，确认则删掉；改成另一个已存在的资源名 → 弹「已存在同名资源」，条目不变。

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/statusbar/core.ts src/wxhl-003/__tests__/statusbarRender.test.ts
git commit -m "feat(wxhl): 特殊资源条目可改名、清空即删除"
```

---

### Task 8: 职业区渲染器（纯函数）

**Files:**
- Modify: `src/wxhl-003/statusbar/render.ts`
- Modify: `src/wxhl-003/__tests__/statusbarRender.test.ts`（追加 describe）

**Interfaces:**
- Consumes: Task 2 的 `joinPath`、`./editable` 的 `editText` / `editSpan`
- Produces:
  - `renderCareerSection(career: any, basePath: string, expanded: Set<string>, keyBase: string): string`

- [ ] **Step 1: 写失败测试**

追加：

```ts
import { renderCareerSection } from '../statusbar/render';

describe('renderCareerSection', () => {
  const 无 = new Set<string>();

  it('职业简介：渲染成一行且可编辑', () => {
    const h = renderCareerSection({ 职业简介: '以短休换爆发' }, '契约者.职业', 无, 'k');
    expect(h).toContain('职业简介');
    expect(h).toContain('以短休换爆发');
    expect(h).toContain('data-path="契约者.职业.职业简介"');
  });

  it('职业简介缺省时显示「无」', () => {
    const h = renderCareerSection({}, '契约者.职业', 无, 'k');
    expect(h).toContain('职业简介');
  });

  it('扁平职业特性：文字叶节点直接显示', () => {
    const h = renderCareerSection({ 职业特性: { 坚韧: '受到的伤害 -1' } }, '契约者.职业', 无, 'k');
    expect(h).toContain('坚韧');
    expect(h).toContain('受到的伤害 -1');
  });

  it('嵌套职业特性：分组折叠，递归出子节点', () => {
    const h = renderCareerSection(
      { 职业特性: { 龙裔系: { 龙鳞: '防御 +2', 龙息: '每场一次' } } },
      '契约者.职业', 无, 'k',
    );
    expect(h).toContain('mate-sub');
    expect(h).toContain('龙裔系');
    expect(h).toContain('龙鳞');
    expect(h).toContain('龙息');
  });

  it('兼容旧写法 {效果: "..."}', () => {
    const h = renderCareerSection({ 职业特性: { 坚韧: { 效果: '减伤 1' } } }, '契约者.职业', 无, 'k');
    expect(h).toContain('减伤 1');
  });

  it('职业技能与传承技能各自成块', () => {
    const h = renderCareerSection(
      { 职业技能: { 斩击: { 名称: '斩击', 等级: 1 } }, 传承技能: { 祖传: { 名称: '祖传' } } },
      '契约者.职业', 无, 'k',
    );
    expect(h).toContain('职业技能');
    expect(h).toContain('斩击');
    expect(h).toContain('传承技能');
    expect(h).toContain('祖传');
  });

  it('空职业不抛异常', () => {
    expect(() => renderCareerSection(null, 'p', 无, 'k')).not.toThrow();
    expect(() => renderCareerSection({}, 'p', 无, 'k')).not.toThrow();
  });
});
```

- [ ] **Step 2: 跑测试确认失败**

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarRender.test.ts`
Expected: FAIL —— `renderCareerSection is not a function`

- [ ] **Step 3: 实现**

在 `render.ts` 末尾追加。技能块**复用 `core.ts` 的 `renderSkillsHtml` 会成环**，所以这里自己写一个精简版技能列表（现有 `renderSkillsHtml` 逻辑复杂且依赖 `_`；职业区只需要名称 + 等级 + 其余字段）：

```ts
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
```

- [ ] **Step 4: 跑测试确认通过**

Run: `npx vitest run --maxWorkers=4 src/wxhl-003/__tests__/statusbarRender.test.ts`
Expected: PASS

- [ ] **Step 5: 提交**

```bash
git add src/wxhl-003/statusbar/render.ts src/wxhl-003/__tests__/statusbarRender.test.ts
git commit -m "feat(wxhl): 职业区渲染器（职业简介 + 递归职业特性 + 技能块）"
```

---

### Task 9: 职业区接入个人面板与实体卡片

**Files:**
- Modify: `src/wxhl-003/statusbar/template.html`（`◆ 职业` 的 section-body）
- Modify: `src/wxhl-003/statusbar/core.ts`（个人 `1954-1979`、实体 `1349-1367`）

**Interfaces:**
- Consumes: Task 8 的 `renderCareerSection(career, basePath, expanded, keyBase)`
- Produces: 无新接口

- [ ] **Step 1: 个人面板模板改成单一容器**

`template.html` 的 `◆ 职业` section-body 里，保留上方的静态行（名称 / 稀有度·阶段 / 职业等级 / PEXP / 主属性加成 / 副属性加成），把后面三个 sub-section

```html
                    <div class="sub-section">
                      <div class="sub-title">职业特性</div>
                      <div id="job-traits"></div>
                    </div>
                    <div class="sub-section">
                      <div class="sub-title">职业技能</div>
                      <div id="job-skills"></div>
                    </div>
                    <div class="sub-section">
                      <div class="sub-title">传承技能</div>
                      <div id="job-legacy"></div>
                    </div>
```

整体替换成一行：

```html
                    <div id="job-body"></div>
```

替换前先确认这三个 id 没有被别处引用（除了马上要改的 `core.ts:1954-1979`）：

```bash
grep -rn "job-traits\|job-skills\|job-legacy" src/wxhl-003/
```

预期：只命中 `statusbar/template.html` 与 `statusbar/core.ts` 里即将被替换的那两段。若 `theme.scss` 里有针对这三个 id 的样式，把选择器改挂到 `#job-body` 上（或直接删掉，因为新内容复用已有的 `.skill-line` / `.mate-sub` 样式）。

替换后再跑一次同样的 grep，确认 `src/` 里已无残留引用。

- [ ] **Step 2: 个人面板填充逻辑**

`core.ts` 里把 `1954-1979` 这一整段：

```ts
      $c.find('#job-skills').html(renderSkillsHtml(_.get(job, '职业技能', {}), '契约者.职业.职业技能'));
      let jobTraits = _.get(job, '职业特性', {}),
        jtHtml = '',
        jtKeys = Object.keys(jobTraits);
      if (jtKeys.length === 0) jtHtml = '<span class="empty-hint">暂无职业特性</span>';
      else {
        jtKeys.forEach(function (k) {
          jtHtml +=
            '<div class="skill-line"><span style="color:#b8a070; font-weight:bold;">' +
            k +
            '</span> <br><span style="font-size:13px;color:#a09080;">' +
            editText(_.get(jobTraits[k], '效果', ''), '契约者.职业.职业特性.' + k + '.效果') +
            '</span></div>';
        });
      }
      $c.find('#job-traits').html(jtHtml);

      const legacySkills = _.get(job, '传承技能', {});
      const lsKeys = Object.keys(legacySkills);
      let lsHtml = '';
      if (lsKeys.length === 0) {
        lsHtml = '<span class="empty-hint">暂无传承技能</span>';
      } else {
        lsHtml = renderSkillsHtml(legacySkills, '契约者.职业.传承技能');
      }
      $c.find('#job-legacy').html(lsHtml);
```

替换成：

```ts
      $c.find('#job-body').html(renderCareerSection(job, '契约者.职业', _ui.expand_subs, '契约者.职业'));
```

- [ ] **Step 3: 实体卡片填充逻辑**

`core.ts:1349-1367` 这一整段：

```ts
        const jTraits = _.get(job, '职业特性', {}),
          jtKeys = Object.keys(jTraits);
        if (jtKeys.length > 0) {
          h +=
            '<div style="margin-top:6px;"><span class="mate-sub-title" style="color:#a09080;font-size:13px;">职业特性</span>';
          jtKeys.forEach(function (k) {
            h +=
              '<div class="skill-line"><span style="color:#b8a070; font-weight:bold;">' +
              k +
              '</span> <br><span style="font-size:13px;color:#a09080;">' +
              editText(_.get(jTraits[k], '效果', ''), targetPath + '.职业.职业特性.' + k + '.效果') +
              '</span></div>';
          });
          h += '</div>';
        }
        h +=
          '<div style="margin-top:6px;"><span class="mate-sub-title" style="color:#a09080;font-size:13px;">职业技能</span>' +
          renderSkillsHtml(_.get(job, '职业技能', {}), targetPath + '.职业.职业技能') +
          '</div>';
```

替换成：

```ts
        h += renderCareerSection(job, targetPath + '.职业', _ui.expand_subs, subKeyBase + '.职业');
```

- [ ] **Step 4: 加 import**

`core.ts` 顶部：

```ts
import { joinPath, renderCareerSection, renderResourceTree, renderSpecialStatusList } from './render';
```

- [ ] **Step 5: 跑全量回归**

Run: `npx vitest run --maxWorkers=4`
Expected: 与 Task 7 结束时相同（2424 通过 / 1 既有失败）

- [ ] **Step 6: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 错误数不超过 Task 1 Step 8 记下的基线

- [ ] **Step 7: 手动核对（在酒馆里）**

个人面板 `◆ 职业`：能看到「职业简介」一行且可点改；职业特性若写成嵌套分组（`{龙裔系: {龙鳞: "...", 龙息: "..."}}`）能折叠展开。切到某个副本角色的卡片，职业块里同样有简介与嵌套特性（**两处渲染一致**）。

- [ ] **Step 8: 提交**

```bash
git add src/wxhl-003/statusbar/template.html src/wxhl-003/statusbar/core.ts
git commit -m "feat(wxhl): 职业区接入职业简介与递归特性，个人面板与实体卡片共用渲染"
```

---

## 收尾

- [ ] **全量回归**：`npx vitest run --maxWorkers=4` → 2424 通过 / 1 既有失败（市场 worker 测试，不修）
- [ ] **类型检查**：`npx tsc --noEmit -p tsconfig.json` → 不高于基线
- [ ] **构建产物**：`npm run build`，确认 `dist/wxhl-003/index.js` 重新生成且体积合理
- [ ] 确认 diff 里**没有**改动 `cloudflare/`、`src/wxhl-combat/`、世界书相关文件
