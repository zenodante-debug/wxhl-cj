// ================================================================
// 无限回廊 · 前端战斗引擎 · 快捷物品栏（准备页的纯逻辑）
//
// 为什么单独成模块：`.vue` 在测试里是 SSR 渲染的 —— **`onMounted` 不会跑**，
// 名单永远是空的，槽位 UI 根本渲染不出来。所以"哪些单位该有栏位 / 选了什么要带进战斗"
// 这些判断一律放这里，纯函数、可单测；`SetupView.vue` 只负责画。
//
// 玩家裁定（plan §21.1）：
//   - **每个我方单位各 3 个**栏位（契约者 3 + 每个队友各 3；敌方没有）；
//   - 下拉里列**背包里全部**物品（读**该单位自己**的背包）。
// ================================================================

/** 每个我方单位的快捷物品栏位数 */
export const 快捷栏位数 = 3;

/** 三个空栏位（准备页的初始状态） */
export function 造空栏位(): string[] {
  return Array.from({ length: 快捷栏位数 }, () => '');
}

/**
 * 这个单位要不要显示快捷物品栏：**选中参战 且 阵营是我方**。
 * 敌方不给栏位（玩家口径：「给玩家的角色和队友提供三个可选栏位」）。
 */
export function 显示快捷栏(选中: boolean, 阵营: string | undefined): boolean {
  return !!选中 && 阵营 === '我方';
}

/**
 * 收集要带进战斗的快捷物品：只收**当前显示**的单位，去掉空栏位与同单位重复。
 *
 * 顺便当**净化**用：阵营被改成敌方、或取消勾选之后，之前选的物品不该跟着进战斗。
 */
export function 收集快捷物品(
  单位列表: Array<{ id: string }>,
  选中: Record<string, boolean | undefined>,
  阵营: Record<string, string | undefined>,
  栏位: Record<string, string[] | undefined>,
): Record<string, string[]> {
  const 出: Record<string, string[]> = {};
  for (const u of 单位列表) {
    if (!显示快捷栏(!!选中[u.id], 阵营[u.id])) continue;
    const 选 = [...new Set((栏位[u.id] ?? []).map(s => String(s ?? '').trim()).filter(Boolean))];
    if (选.length) 出[u.id] = 选;
  }
  return 出;
}

/**
 * 把选中的物品折算成**开战时要灌进 `单位.快捷物品` 的初始数量**。
 *
 * 为什么要灌：用掉一个就减一个、用完就用不了 —— 那个"还剩几个"需要一个计数器。
 * 灌进 `单位.快捷物品` 而**不是 `单位.资源`**（玩家口径 2026-10-11）：
 * 「特殊资源」单指层数/状态/施法资源那类，要落成状态、要写进卡面的特殊状态栏；
 * 快捷物品是背包里的道具，有自己的显示位与自己的写回路径（背包）。
 * 物品名对不上背包的（改名/删了）直接跳过。
 */
export function 快捷物品初始数量(
  选中名: string[] | undefined,
  背包: Array<{ 名称: string; 数量: number }>,
): Record<string, number> {
  const 出: Record<string, number> = {};
  for (const 名 of 选中名 ?? []) {
    const 物品 = 背包.find(b => b.名称 === 名);
    if (!物品) continue;
    const 数量 = Number(物品.数量);
    if (!Number.isFinite(数量) || 数量 <= 0) continue;
    出[名] = 数量;
  }
  return 出;
}

/**
 * 算这一场**各用掉了几个**（收尾写回背包用）。
 *
 * = 开场灌进去的数量 − 打到最后的剩余。减到 0 也只会是"用掉原数量那么多"，
 * 不会因为资源被别的规则改动而算出负数（负数一律当 0，别去加背包）。
 */
export function 快捷物品消耗(
  初始: Record<string, number> | undefined,
  结束时剩余: Record<string, number> | undefined,
): Record<string, number> {
  const 出: Record<string, number> = {};
  for (const [名, 起] of Object.entries(初始 ?? {})) {
    if (!Number.isFinite(起)) continue;
    const 尾 = Number(结束时剩余?.[名] ?? 起);
    const 用掉 = Math.max(0, Math.floor(起) - Math.floor(Number.isFinite(尾) ? 尾 : 起));
    if (用掉 > 0) 出[名] = 用掉;
  }
  return 出;
}

/**
 * 收尾用：`单位id → { 物品名: 用掉几个 }`（只留**真的用掉了**的）。
 *
 * 注意 `单位表` 的键是**短名**（`状态.单位` 的键），而 `初始表` 的键是**单位 id**（变量全路径）——
 * 所以要按 `单位.id` 找，不能按下标对齐（一波两只「骨卫兵」时按名字找会串）。
 */
export function 快捷物品写回表(
  初始表: Record<string, Record<string, number> | undefined> | undefined,
  单位表: Record<string, { id: string; 快捷物品?: Record<string, number> }> | undefined,
): Record<string, Record<string, number>> {
  const 出: Record<string, Record<string, number>> = {};
  for (const [id, 初] of Object.entries(初始表 ?? {})) {
    if (!初) continue;
    const 单位 = Object.values(单位表 ?? {}).find(u => u?.id === id);
    const 消耗 = 快捷物品消耗(初, 单位?.快捷物品);
    if (Object.keys(消耗).length) 出[id] = 消耗;
  }
  return 出;
}
