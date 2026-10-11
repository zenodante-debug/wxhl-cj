import { describe, expect, it, beforeEach } from 'vitest';
import { 读取单位效果源 } from '../store';

// ================================================================
// 玩家实测（2026-10-11）：
//   「还有，职业特性、传承技能、被动等等，一大堆增加乘区的能力、增加倍率的能力，都读不到：
//     职业特性_主职业:
//       - 天使之躯：免疫所有剧毒、疾病、流血与即死效果，HP自然恢复速度提升500%。
//       - 狂热裁决者：每击杀一名敌人，恢复5%的最大HP与MP，并使最终伤害乘区+0.1（可无限叠加）。
//       - 舍生取义：HP每下降10%，自身的全属性防御与伤害乘区同时提升0.1。…」
//
// 根因（plan §19 R1，2026-10-11 重查）：
//   权威 schema（Downloads 的 registerMvuSchema txt，职业Schema）里
//   `职业特性 = z.record(特性名, z.object({ 效果: z.string() }))` ——
//   是 `职业技能` / `传承技能` 的**兄弟字段**。
//   `读取单位效果源` 只读了 通用技能 / 职业.职业技能 / 职业.传承技能 / 装备 / 天赋 / 血统，
//   **独独漏了 `职业.职业特性`** —— 模型从来没看见过它，所以 100% 读不到。
// ================================================================

function 挂变量(契约者: any) {
  (globalThis as any).waitGlobalInitialized = async () => {};
  (globalThis as any).getVariables = () => ({ stat_data: { 契约者 } });
}

describe('store · 读取单位效果源 · 职业特性', () => {
  beforeEach(() => {
    delete (globalThis as any).getVariables;
    delete (globalThis as any).waitGlobalInitialized;
  });

  it('把 `职业.职业特性` 也拍平进待翻译清单（schema 里它是 职业技能/传承技能 的兄弟）', async () => {
    挂变量({
      职业: {
        职业技能: { 崩山: { 类型: '主动', 行动类型: '主要行动', 关联属性: 'STR', 效果: {} } },
        传承技能: { 圣光长矛: { 类型: '主动', 行动类型: '主要行动', 关联属性: 'PER', 效果: {} } },
        职业特性: {
          狂热裁决者: { 效果: '每击杀一名敌人，恢复5%的最大HP与MP，并使最终伤害乘区+0.1（可无限叠加）。' },
          舍生取义: { 效果: 'HP每下降10%，自身的全属性防御与伤害乘区同时提升0.1。' },
        },
      },
    });

    const 出 = await 读取单位效果源('契约者');
    const 名 = 出.map(x => x.名称);

    expect(名).toContain('狂热裁决者（职业特性）');
    expect(名).toContain('舍生取义（职业特性）');
    // 兄弟字段照旧还在（这条测试不许把老行为挤掉）
    expect(名).toContain('崩山');
    expect(名).toContain('圣光长矛');
  });

  it('职业特性的 `效果` 是**字符串**（不是技能那种 Record）—— 包成对象，模型才读得出一维字段', async () => {
    挂变量({
      职业: {
        职业特性: { 铁血意志: { 效果: '自身受到的任何物理伤害固定减免100点。' } },
      },
    });

    const 出 = await 读取单位效果源('契约者');
    const 条 = 出.find(x => x.名称 === '铁血意志（职业特性）')!;

    expect(条).toBeDefined();
    // 纯被动：一维字段要有无歧义的默认，别让模型猜（不然又会被翻译成主动技能）
    expect(条.类型).toBe('被动');
    expect(条.行动类型).toBe('无');
    expect(条.射程).toBe('自身');
    expect(条.目标).toBe('自身');
    expect(条.消耗).toBe('无');
    // 效果包含原文（包成对象，与技能/装备的 `效果` 形状一致）
    expect(JSON.stringify(条.效果)).toContain('物理伤害固定减免100点');
  });

  it('空效果 / 缺 效果 的特性条目直接跳过（别把空壳塞进清单）', async () => {
    挂变量({
      职业: {
        职业特性: {
          没写的: {},
          空字符串的: { 效果: '   ' },
          真有效果的: { 效果: '周围敌方闪避值降低30%。' },
        },
      },
    });

    const 名 = (await 读取单位效果源('契约者')).map(x => x.名称);
    expect(名).toContain('真有效果的（职业特性）');
    expect(名).not.toContain('没写的（职业特性）');
    expect(名).not.toContain('空字符串的（职业特性）');
  });

  it('没有 `职业` / 没有 `职业特性` 时不炸（老存档、副本角色都可能没有）', async () => {
    挂变量({ 通用技能: { 裂骨重击: { 类型: '主动', 效果: {} } } });
    const 名 = (await 读取单位效果源('契约者')).map(x => x.名称);
    expect(名).toContain('裂骨重击');

    挂变量({ 职业: {} });
    expect(await 读取单位效果源('契约者')).toEqual([]);
  });

  it('副本角色 / 小队成员也有职业特性（同一个实体形状，路径下钻）', async () => {
    (globalThis as any).waitGlobalInitialized = async () => {};
    (globalThis as any).getVariables = () => ({
      stat_data: {
        契约者: {
          小队: { 成员: { 白露露: { 职业: { 职业特性: { 剑心通明: { 效果: '命中+5。' } } } } } },
        },
      },
    });

    const 名 = (await 读取单位效果源('小队.成员.白露露')).map(x => x.名称);
    expect(名).toContain('剑心通明（职业特性）');
  });
});
