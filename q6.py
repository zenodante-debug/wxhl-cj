import io

# ---------- 1) types：数值修正目标 加「最终乘区」 ----------
p = 'src/wxhl-combat/types.ts'
s = io.open(p, encoding='utf-8').read()
old = """export type 数值修正目标 =
  | '伤害'"""
new = """export type 数值修正目标 =
  | '伤害'
  /** 真·最终伤害倍率（增量写法：填 4 = 最终伤害 ×5）。
   *  与「伤害」的区别：「伤害」进**效果乘区**（世界书的递减曲线，×5 表达不出来），
   *  「最终乘区」是直接乘在最终伤害上 —— 卡面写"该次攻击最终伤害×N"就该用它。 */
  | '最终乘区'"""
assert s.count(old) == 1, 'types'
s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('types ok')

# ---------- 2) loop：使用时规则提取「本次修正」而不落状态 ----------
p2 = 'src/wxhl-combat/engine/loop.ts'
s2 = io.open(p2, encoding='utf-8').read()

old2 = """  /** true = 受击视角（规则主人是**被打的那个**，见 `作用域单位`） */
  受击视角 = false,
): void {"""
new2 = """  /** true = 受击视角（规则主人是**被打的那个**，见 `作用域单位`） */
  受击视角 = false,
  /**
   * 收集模式：**不把 `数值修正` 落成状态**，而是把它们累加后返回。
   * 用途：「使用时」的数值修正是"**本次攻击**"的临时修正（卡面：该次攻击最终伤害×N），
   * 落成状态就会持续好几回合（语义错），所以收集起来直接喂给这一次的伤害计算。
   * 其余动作（护盾/状态/词条/资源…）照常落地。
   */
  收集数值修正 = false,
): Record<string, number> {"""
assert s2.count(old2) == 1, 'sig'
s2 = s2.replace(old2, new2, 1)

old3 = """): void {
  const 施方 = 新状态.单位[施方键];

  for (const 规则 of 有效规则(解释)) {
    if (!触发点列表.includes(规则.触发)) continue;

    let 结果: ReturnType<typeof 执行规则>;
    try {
      结果 = 执行规则(规则, 施方, 新状态.单位[受方键], 数值上下文);
    } catch (e: any) {
      步骤.push({
        类: '跳过',
        内容: `忽略：「${显示名(施方)}」的${规则.触发}规则求值失败：${e?.message ?? e}`,
        单位: 显示名(施方),
      });
      continue;
    }

    for (const 键 of 作用域单位(新状态, 规则.作用域, 施方键, 受方键, 受击视角)) {
      落效果(新状态, 键, 结果, 动作名, 步骤, 施方键);
    }
  }
}"""
new3 = """): Record<string, number> {
  const 施方 = 新状态.单位[施方键];
  const 收集: Record<string, number> = {};

  for (const 规则 of 有效规则(解释)) {
    if (!触发点列表.includes(规则.触发)) continue;

    let 结果: ReturnType<typeof 执行规则>;
    try {
      结果 = 执行规则(规则, 施方, 新状态.单位[受方键], 数值上下文);
    } catch (e: any) {
      步骤.push({
        类: '跳过',
        内容: `忽略：「${显示名(施方)}」的${规则.触发}规则求值失败：${e?.message ?? e}`,
        单位: 显示名(施方),
      });
      continue;
    }

    if (收集数值修正 && 结果.数值修正) {
      for (const [键名, 量] of Object.entries(结果.数值修正)) 收集[键名] = (收集[键名] ?? 0) + 量;
      delete 结果.数值修正;
    }

    for (const 键 of 作用域单位(新状态, 规则.作用域, 施方键, 受方键, 受击视角)) {
      落效果(新状态, 键, 结果, 动作名, 步骤, 施方键);
    }
  }

  return 收集;
}"""
assert s2.count(old3) == 1, 'body'
s2 = s2.replace(old3, new3, 1)

io.open(p2, 'w', encoding='utf-8', newline='').write(s2)
print('应用规则 ok')
