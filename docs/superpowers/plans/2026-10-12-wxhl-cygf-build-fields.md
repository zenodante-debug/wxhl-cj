# wxhl-cygf 构筑补齐 Implementation Plan（spec §10）

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 构筑重新支持填四维属性数值 + 等级 + 位阶，职业完整镜像新卡 schema（含职业简介）；构筑可从玩家存档一键读取、也可粘贴变量 JSON 捕捉。宿主新增只读桥接动作 `readContractor`。

**Spec:** [spec §10](../specs/2026-10-11-wxhl-cygf-ui-rework-design.md)
**用户提供的新版权威结构**：`C:/Users/zero/Downloads/酒馆助手脚本-变量结构-特殊资源通用版 (1).json`
**参考实现（读取存档）**：`src/wxhl-003/workshop.ts` 的 `extractContractSave` + `src/wxhl-003/data.ts` 的 `CONTRACT_SAVE_KEYS`

## Global Constraints

- 禁 pnpm：`npx vitest run` / `npm run build` / `npx eslint`
- 桥接**只读**动作不进 `MUTATING_ACTIONS`（不进互斥队列）
- `readContractor` 只回 `['头部','属性','衍生属性','职业','通用技能','装备']` 白名单子树 + 重算 `属性.实际`；**绝不**带 经济/背包/人际关系/副本经历/论坛档案/系统日志
- 页面渲染一律 `textContent`；粘贴解析对无法识别的输入**响亮报错**
- 别再加"只认父窗口"的桥接守卫（宿主在兄弟 iframe 回包）
- 共享分支：显式圈路径提交，禁 `git add -A`

## Review Focus

1. `readContractor` 返回体里**混进了白名单外的字段**（经济/背包…）→ 测试钉住（断言返回体不含这些键）
2. 桥接动作被误加进 `MUTATING_ACTIONS`（读动作不该排队）→ 测试钉住
3. `属性.实际` 重算漏了 `自定义加成` → 测试钉住
4. `parseBuildJson` 对**无法识别**的 JSON 静默产出空构筑 → 测试钉住（必须抛）
5. 粘贴 `{stat_data:{契约者:{…}}}` 时把 `等级/阶位` 映射丢了 → 测试钉住

---

### Task A: 宿主侧（契约修订 + `readContractor` + 构建推送）

**Files:**
- Modify: `src/wxhl-cygf/pack/build.ts`
- Modify: `src/wxhl-cygf/actions.ts`
- Replace: `src/wxhl-cygf/变量结构_特殊资源通用版.json`（换成用户 2026-10-12 的新版）
- Test: `src/wxhl-cygf/__tests__/pack.test.ts`、`src/wxhl-cygf/__tests__/actions.test.ts`

**Interfaces:**
- Produces（Task B 依赖）: `BuildPayload` 新增 `等级: number`、`阶位: string`、`属性基础: {STR,AGI,CON,PER}`；`职业Schema` 镜像新卡；桥接动作 `readContractor`（payload 无参）→ `{ 契约者: {...} }`

- [ ] **Step 1: Write the failing tests**

`pack.test.ts` 的 build describe 里追加：

```typescript
  it('等级/阶位/四维属性可填，且分配方向保留', () => {
    const parsed = BuildPack.parse({
      ...base, type: 'build',
      build: {
        构筑名: '重装堡垒', 定位: '换血', 等级: 7, 阶位: '二阶',
        属性基础: { STR: 12, AGI: 6, CON: 14, PER: 8 },
        属性分配方向: { 主属性: 'CON', 副属性: 'STR' },
      },
    });
    expect(parsed.build.等级).toBe(7);
    expect(parsed.build.阶位).toBe('二阶');
    expect(parsed.build.属性基础).toEqual({ STR: 12, AGI: 6, CON: 14, PER: 8 });
    expect(parsed.build.属性分配方向.主属性).toBe('CON');
  });

  it('等级/阶位/属性基础有默认值（老包不炸）', () => {
    const parsed = BuildPack.parse({ ...base, type: 'build', build: { 构筑名: 'x', 定位: 'y' } });
    expect(parsed.build.等级).toBe(1);
    expect(parsed.build.阶位).toBe('一阶');
    expect(parsed.build.属性基础.STR).toBe(5);
  });

  it('职业镜像新卡：职业简介/转职阶段/职业等级/主副属性加成都能填', () => {
    const parsed = BuildPack.parse({
      ...base, type: 'build',
      build: {
        构筑名: 'x', 定位: 'y',
        职业: { 名称: '卫士', 稀有度: '蓝色', 转职阶段: '基础', 职业等级: 3,
          职业简介: '以盾护人、以守为攻的前排', 主属性加成: { 属性: 'CON', 值: 2 } },
      },
    });
    expect(parsed.build.职业.职业简介).toContain('前排');
    expect(parsed.build.职业.主属性加成).toEqual({ 属性: 'CON', 值: 2 });
  });
```

`actions.test.ts` 的 dispatchAction describe 里追加：

```typescript
  it('readContractor 是只读动作，不进互斥队列', () => {
    expect(MUTATING_ACTIONS.has('readContractor')).toBe(false);
  });

  it('readContractor 只回构筑白名单字段，并重算 属性.实际', async () => {
    const 契约者 = {
      头部: { 等级: 7, 阶位: '二阶', 天赋: { 名称: '石肤' } }, 
      属性: { 基础: { STR: 10, AGI: 5, CON: 12, PER: 6 }, 加成: { STR: 1, AGI: 2, CON: 0, PER: 1 }, 自定义加成: { STR: 0, AGI: 0, CON: 3, PER: 0 } },
      职业: { 名称: '卫士', 职业简介: '前排' },
      通用技能: {}, 装备: {}, 衍生属性: {},
      // 下面这些**必须不出现**在返回体里（Review Focus #1）
      经济: { UP: 9999 }, 背包: { 好东西: { 数量: 3 } }, 人际关系: { 某人: {} }, 副本经历: {}, 论坛档案: {}, 小队: {}, 其他契约者: {}, 副本角色: {},
    };
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({ stat_data: { 契约者 } }));
    vi.stubGlobal('getLastMessageId', vi.fn().mockReturnValue(12));

    const result = (await dispatchAction('readContractor', {})) as any;
    const c = result.契约者;
    expect(Object.keys(c).sort()).toEqual(['头部', '属性', '衍生属性', '职业', '通用技能', '装备'].sort());
    expect(c.属性.实际).toEqual({ STR: 11, AGI: 7, CON: 15, PER: 7 }); // 基础+加成+自定义（Review Focus #3）
    expect(c).not.toHaveProperty('经济');
    expect(JSON.stringify(c)).not.toContain('UP');
  });

  it('readContractor 读不到契约者 → 响亮报错', async () => {
    vi.stubGlobal('getVariables', vi.fn().mockReturnValue({ stat_data: {} }));
    vi.stubGlobal('getLastMessageId', vi.fn().mockReturnValue(3));
    await expect(dispatchAction('readContractor', {})).rejects.toThrow(/契约者/);
  });
```

- [ ] **Step 2: Run tests → RED**：`npx vitest run src/wxhl-cygf/__tests__/pack.test.ts src/wxhl-cygf/__tests__/actions.test.ts`

- [ ] **Step 3: Implement**

`pack/build.ts`：`职业Schema` 换成完整镜像（字段名逐字对齐新卡）：

```typescript
export const 职业Schema = z.object({
  名称: z.string().prefault('无'),
  稀有度: z.string().prefault('无'),
  转职阶段: z.string().prefault('基础'),
  职业等级: z.coerce.number().prefault(0),
  PEXP_当前: z.coerce.number().prefault(0),
  PEXP_升级所需: z.coerce.number().prefault(0),
  主属性加成: z.object({ 属性: z.string().prefault('无'), 值: z.coerce.number().prefault(0) }).prefault({}),
  副属性加成: z.object({ 属性: z.string().prefault('无'), 值: z.coerce.number().prefault(0) }).prefault({}),
  职业简介: z.string().prefault('无').describe('职业的简短介绍、机制方向与发展定位'),
  职业技能: z.record(z.string(), 技能Schema).prefault({}),
  职业特性: z.record(z.string(), z.union([z.string(), z.record(z.string(), z.any())])).prefault({}),
  传承技能: z.record(z.string(), 技能Schema).prefault({}),
  转职树: z.object({ 名称: z.string().prefault('无'), 分支: z.record(z.string(), z.any()).prefault({}) }).prefault({}),
}).catchall(z.any()).prefault({});
```

`BuildPayload` 加三个字段（放在 `定位` 之后）：

```typescript
  等级: z.coerce.number().int().min(1).prefault(1),
  阶位: z.string().prefault('一阶'),
  属性基础: z.object({
    STR: z.coerce.number().prefault(5), AGI: z.coerce.number().prefault(5),
    CON: z.coerce.number().prefault(5), PER: z.coerce.number().prefault(5),
  }).prefault({}),
```

`actions.ts` 加动作（**不要**加进 `MUTATING_ACTIONS`）：

```typescript
/** 竞技场同款白名单：只回构筑相关子树，绝不带经济/背包/人际关系/副本经历/论坛档案 */
const CONTRACT_SAVE_KEYS = ['头部', '属性', '衍生属性', '职业', '通用技能', '装备'] as const;

/** 重算 属性.实际 = 基础 + 加成 + 自定义加成（照 src/wxhl-003/workshop.ts 的 extractContractSave） */
function recomputeActual(属性: any): void {
  if (!属性?.基础) return;
  属性.实际 = {
    STR: (属性.基础.STR ?? 0) + (属性.加成?.STR ?? 0) + (属性.自定义加成?.STR ?? 0),
    AGI: (属性.基础.AGI ?? 0) + (属性.加成?.AGI ?? 0) + (属性.自定义加成?.AGI ?? 0),
    CON: (属性.基础.CON ?? 0) + (属性.加成?.CON ?? 0) + (属性.自定义加成?.CON ?? 0),
    PER: (属性.基础.PER ?? 0) + (属性.加成?.PER ?? 0) + (属性.自定义加成?.PER ?? 0),
  };
}

function readContractor(): { 契约者: Record<string, unknown> } {
  const pick = (messageId: number | 'latest') => {
    const vars = getVariables({ type: 'message', message_id: messageId }) as any;
    // 用可选链而不是 lodash `_`：宿主脚本没有引 lodash
    return vars?.stat_data?.契约者 as Record<string, any> | undefined;
  };
  let 契约者: Record<string, any> | undefined;
  try {
    契约者 = pick(typeof getLastMessageId === 'function' ? getLastMessageId() : -1);
  } catch { /* 楼层接口不可用 */ }
  if (!契约者) 契约者 = pick(-1);
  if (!契约者) throw new Error('读不到当前契约者：请确认已加载角色卡并在有存档的楼层使用');

  const 摘出: Record<string, unknown> = {};
  for (const key of CONTRACT_SAVE_KEYS) 摘出[key] = 契约者[key];
  recomputeActual(摘出.属性);
  return { 契约者: 摘出 };
}
```

在 `handleAction` 的 switch 里加 `case 'readContractor': return readContractor();`

替换 `src/wxhl-cygf/变量结构_特殊资源通用版.json` 为用户 2026-10-12 的新版（`cp` 过来即可，注意文件名带空格要加引号）。

- [ ] **Step 4: 全绿 + 构建**：`npx vitest run src/wxhl-cygf/`、`npm run build`

- [ ] **Step 5: Commit + push**

```bash
git add src/wxhl-cygf dist/wxhl-cygf
git commit -m "feat(wxhl-cygf): 构筑回填数值/等级/阶位、职业镜像新卡；宿主新增只读 readContractor"
bash scripts/push-cygf.sh   # 记下新的 commit 号，Task C 要用
```

---

### Task B: 页面（build 表单补字段 + 读取存档 + 粘贴捕捉）

**Files:**
- Modify: `cloudflare/wxhl-cygf/page-lib.js`（加纯函数 `parseBuildJson`）
- Modify: `cloudflare/wxhl-cygf/workshop.html`（build 表单字段 + 两个入口）
- Test: `cloudflare/wxhl-cygf/page-lib.test.js`

**Interfaces:**
- Produces: `parseBuildJson(text) → BuildPayload`（无法识别则抛人话错误）

- [ ] **Step 1: Test**

```javascript
describe('parseBuildJson · 粘贴变量捕捉构筑', () => {
  const 契约者 = {
    头部: { 等级: 7, 阶位: '二阶', 天赋: { 名称: '石肤', 品质: '蓝色' }, 血统: { 名称: '无' }, 称号: { 名称: '无' } },
    属性: { 基础: { STR: 12, AGI: 6, CON: 14, PER: 8 }, 加成: { STR: 1, AGI: 1, CON: 1, PER: 1 } },
    职业: { 名称: '卫士', 稀有度: '蓝色', 职业简介: '前排' },
    通用技能: { 横扫: { 类型: '主动' } }, 装备: { 主武器: { 名称: '斩首大剑' } },
  };

  it('吃 {stat_data:{契约者}} 完整变量：等级/阶位/四维/职业/技能/装备都进得来', () => {
    const build = parseBuildJson(JSON.stringify({ stat_data: { 契约者 } }));
    expect(build.等级).toBe(7);
    expect(build.阶位).toBe('二阶');
    expect(build.属性基础.STR).toBe(12);
    expect(build.职业.名称).toBe('卫士');
    expect(build.通用技能.横扫.类型).toBe('主动');
    expect(build.主要装备.主武器.名称).toBe('斩首大剑');
    expect(build.构筑名).toBe('卫士'); // 没给构筑名时用职业名兜底
  });

  it('也吃 {契约者:{…}} 与裸契约者子树', () => {
    expect(parseBuildJson(JSON.stringify({ 契约者 })).等级).toBe(7);
    expect(parseBuildJson(JSON.stringify(契约者)).等级).toBe(7);
  });

  it('本身就是构筑载荷时直接采用', () => {
    const build = parseBuildJson(JSON.stringify({ 构筑名: '重装堡垒', 定位: '换血', 等级: 3 }));
    expect(build.构筑名).toBe('重装堡垒');
    expect(build.等级).toBe(3);
  });

  it('无法识别 → 响亮报错（Review Focus #4/#5）', () => {
    expect(() => parseBuildJson('{oops')).toThrow(/JSON/);
    expect(() => parseBuildJson(JSON.stringify({ 随便: 1 }))).toThrow(/构筑|契约者/);
    expect(() => parseBuildJson(JSON.stringify({ stat_data: { 契约者: { 经济: { UP: 1 } } } }))).toThrow(/构筑|契约者/);
  });
});
```

- [ ] **Step 2: Run → RED**

- [ ] **Step 3: Implement** `parseBuildJson`（纯函数，四种输入形状；`mainOf(json)` 依次尝试 `json.stat_data.契约者` → `json.契约者` → 长得像契约者的 `json` 本身（含 `头部`/`属性`/`职业` 任一）→ 长得像构筑载荷的 `json`（含 `构筑名`）；都不是就抛 `无法识别的 JSON：需要是从酒馆复制的契约者变量或一份构筑载荷`）。映射：`等级←头部.等级`、`阶位←头部.阶位`、`属性基础←属性.基础`、`天赋/血统/称号←头部.*`、`职业/通用技能←同名`、`主要装备←装备`、`构筑名←构筑名 || 职业.名称 || '未命名构筑'`、`定位←定位 || 职业.职业简介 || '未填写'`。

页面（`workshop.html`）build 表单加：
- **等级**（数字）、**阶位**（文本，默认 `一阶`）
- **四维属性**四个数字输入（STR/AGI/CON/PER，默认 5）
- 职业区补 **职业简介**（文本域）、**转职阶段**、**职业等级**、**主属性加成{属性,值}**、**副属性加成{属性,值}**
- 两个入口按钮：**「从我的存档读取」**（`bridge.request('readContractor')` → 用 `parseBuildJson(JSON.stringify(res))` 填表；桥不可用/读不到 → 原文显示错误）与 **「粘贴 JSON 捕捉」**（文本框 + 按钮 → `parseBuildJson` 填表，失败原文报错、不清空已填内容）
- 提交时 `属性分配方向` 由四维数值自动推导（最大的为主属性，次大的为副属性；并列取 STR>AGI>CON>PER 顺序），不再让用户手填

- [ ] **Step 4: 全绿 + `node --check` 抽取脚本**

- [ ] **Step 5: Commit**

```bash
git add cloudflare/wxhl-cygf
git commit -m "feat(wxhl-cygf): 构筑表单回填数值/等级/阶位/职业简介 + 读取存档与粘贴捕捉"
```

---

### Task C: 收尾与交接

- [ ] **Step 1: 全量验证**：`npx vitest run cloudflare/wxhl-cygf/ src/wxhl-cygf/`、`npx eslint …`（无 error）、`npm run build`
- [ ] **Step 2: 重建部署单文件**：`ESBUILD_WASM_PATH="C:/Users/zero/AppData/Local/Temp/esb/node_modules/esbuild-wasm" node cloudflare/wxhl-cygf/build-bundle.mjs`
- [ ] **Step 3: 提交**（`cloudflare/wxhl-cygf` + `src/wxhl-cygf` + `dist/wxhl-cygf`）
- [ ] **Step 4: 交接**：把 bundle 放进剪贴板（`Set-Clipboard`），告诉用户
  1. Cloudflare 后台重新粘贴部署（页面重做）
  2. 酒馆脚本换成新 pinned URL（**宿主这次改了**，必须换）
  3. 验收：读构筑、粘贴变量、四维/等级/阶位/职业简介都在

## Self-Review 记录

- **Spec 覆盖**：§10.1 → Task A（契约）+ Task B（表单）；§10.2 → Task A（职业镜像）；§10.3 → Task A（换参考文件）；§10.4 → Task A（readContractor）+ Task B（读取入口）；§10.5 → Task B（parseBuildJson）
- **Placeholder**：无 TBD；页面部分给编号式要求（DOM 体量大，行为明确）
- **类型一致性**：`BuildPayload` 新字段（A）→ `parseBuildJson` 映射（B）→ 表单字段（B）一致；`readContractor` 返回 `{契约者}`（A）→ 页面用同一形状喂 `parseBuildJson`（B）一致
- **Review Focus**：5 条已钉（#1/#2/#3 → Task A 测试；#4/#5 → Task B 测试）
