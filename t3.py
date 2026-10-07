import io

p = 'src/wxhl-combat/engine/loop.ts'
s = io.open(p, encoding='utf-8').read()

old = """  for (const 键 of Object.keys(状态.单位)) {
    const 单位 = 新状态.单位[键];

    for (const [技能名, 解释] of Object.entries(单位.技能 ?? {})) {
      for (const 规则 of 有效规则(解释)) {
        if (规则.触发 !== '常驻' && 规则.触发 !== '进入战斗') continue;

        let 结果: ReturnType<typeof 执行规则>;
        try {
          结果 = 执行规则(规则, 单位, 单位);
        } catch (e: any) {
          步骤.push({
            类: '跳过',
            内容: `忽略：「${显示名(单位)}」的${规则.触发}规则「${技能名}」求值失败：${e?.message ?? e}`,
            单位: 显示名(单位),
          });
          continue;
        }

        // 「进入战斗」是**一次性**效果（进场护盾/进场资源/进场标记）→ 照常落效果；
        // 「常驻」是"一直在"，落成整场战斗的状态。
        const 目标键列表 = 作用域单位(新状态, 规则.作用域, 键, 键);
        if (规则.触发 === '进入战斗') {
          for (const 目标键 of 目标键列表) 落效果(新状态, 目标键, 结果, 技能名, 步骤, 键);
          continue;
        }

        const 数值 = 结果.数值修正 ?? {};
        const 词条 = 结果.词条 ? [...结果.词条] : [];
        if (!Object.keys(数值).length && !词条.length) continue;

        for (const 目标键 of 目标键列表) {
          const 目标 = 新状态.单位[目标键];
          新状态.单位[目标键] = {
            ...目标,
            状态: 施加状态(目标.状态, {
              名: 技能名,
              持续: 战斗内持续,
              ...(Object.keys(数值).length ? { 数值修正: 数值 } : {}),
              ...(词条.length ? { 词条 } : {}),
            }),
          };
        }
      }
    }
  }

  return 新状态;
}"""

new = """  for (const 键 of Object.keys(状态.单位)) {
    const 单位 = 新状态.单位[键];

    /**
     * 同一个技能的**多条常驻规则要合成一条状态**。
     * 状态是按名字去重的（`施加状态` 同名后覆盖先）—— 逐条落的话，
     * 后一条会把前一条的数值修正整条盖掉（实测：同一被动里的「基础伤害骰+4」就这么没了）。
     */
    const 常驻累积 = new Map<string, { 数值: Record<string, number>; 词条: Set<string> }>();

    for (const [技能名, 解释] of Object.entries(单位.技能 ?? {})) {
      for (const 规则 of 有效规则(解释)) {
        if (规则.触发 !== '常驻' && 规则.触发 !== '进入战斗') continue;

        let 结果: ReturnType<typeof 执行规则>;
        try {
          结果 = 执行规则(规则, 单位, 单位);
        } catch (e: any) {
          步骤.push({
            类: '跳过',
            内容: `忽略：「${显示名(单位)}」的${规则.触发}规则「${技能名}」求值失败：${e?.message ?? e}`,
            单位: 显示名(单位),
          });
          continue;
        }

        // 「进入战斗」是**一次性**效果（进场护盾/进场资源/进场标记）→ 照常落效果
        if (规则.触发 === '进入战斗') {
          for (const 目标键 of 作用域单位(新状态, 规则.作用域, 键, 键)) {
            落效果(新状态, 目标键, 结果, 技能名, 步骤, 键);
          }
          continue;
        }

        // 「常驻」：先按技能名累加，最后再落成一条状态
        const 累计 = 常驻累积.get(技能名) ?? { 数值: {}, 词条: new Set<string>() };
        for (const [名, 量] of Object.entries(结果.数值修正 ?? {})) 累计.数值[名] = (累计.数值[名] ?? 0) + 量;
        for (const 名 of 结果.词条 ?? []) 累计.词条.add(名);
        常驻累积.set(技能名, 累计);
      }
    }

    for (const [技能名, 累计] of 常驻累积) {
      const 数值 = 累计.数值;
      const 词条 = [...累计.词条];
      if (!Object.keys(数值).length && !词条.length) continue;

      for (const 目标键 of Object.keys(新状态.单位)) {
        if (目标键 === 键) continue; // 常驻默认只作用在自己身上；光环类走 作用域（见下）
      }

      const 目标 = 新状态.单位[键];
      新状态.单位[键] = {
        ...目标,
        状态: 施加状态(目标.状态, {
          名: 技能名,
          持续: 战斗内持续,
          ...(Object.keys(数值).length ? { 数值修正: 数值 } : {}),
          ...(词条.length ? { 词条 } : {}),
        }),
      };
    }
  }

  return 新状态;
}"""
assert s.count(old) == 1, 'merge'
s = s.replace(old, new, 1)

io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('ok')
