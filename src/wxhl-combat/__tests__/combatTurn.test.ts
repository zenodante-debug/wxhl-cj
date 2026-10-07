import { afterEach, describe, expect, it, vi } from 'vitest';
import type { 战斗状态 } from '../types';

// mock 工厂会被提升到 import 之前，故用 vi.hoisted 持有可变配置
const h = vi.hoisted(() => ({
  快路: { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 30000 },
}));

vi.mock('../settingsStore', () => ({
  读设置: () => ({
    快路: h.快路,
    强路: { url: '', apiKey: '', model: '', timeout: 30000 },
  }),
  useSettingsStore: () => ({ settings: {} }),
  get快路: () => h.快路,
  get强路: () => ({ url: '', apiKey: '', model: '', timeout: 30000 }),
}));

import { 生成敌方意图 } from '../store';

function 造状态(): 战斗状态 {
  return {
    进行中: true,
    回合: 2,
    先攻: ['副本角色.骨卫兵', '契约者'],
    单位: {
      骨卫兵: {
        id: '副本角色.骨卫兵', 阵营: '敌方', 类型: '精英',
        属性: { 实际: { STR: 20, AGI: 12, CON: 10, PER: 8 } }, 阶位: '二阶',
        HP_当前: 60, HP_最大: 60, MP_当前: 0, MP_最大: 0,
        耐力_当前: 10, 耐力_最大: 10, 防御: 8, 闪避值: 12,
        距离: 10, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
        额度: 45, 冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null,
        资源: {}, 词条: new Set(), 技能: {},
      },
      契约者: {
        id: '契约者', 阵营: '我方', 类型: '玩家',
        属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } }, 阶位: '一阶',
        HP_当前: 100, HP_最大: 100, MP_当前: 0, MP_最大: 0,
        耐力_当前: 10, 耐力_最大: 10, 防御: 5, 闪避值: 10,
        距离: 0, 行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
        额度: 10, 冷却: {}, 护盾: 0, 架势: null, 状态: [], 濒死: null,
        资源: {}, 词条: new Set(), 技能: {},
      },
    },
    待决: null,
    领域: [],
  };
}

describe('store · 生成敌方意图', () => {
  afterEach(() => {
    h.快路 = { url: 'https://a.b', apiKey: 'k', model: 'm', timeout: 30000 };
    delete (globalThis as any).generateRaw;
  });

  it('API 未配置 → 抛「API 未配置」', async () => {
    h.快路 = { url: '', apiKey: '', model: '', timeout: 30000 };
    await expect(生成敌方意图(造状态())).rejects.toThrow('API 未配置');
  });

  it('AI 返回合法意图数组 → 解析并返回', async () => {
    (globalThis as any).generateRaw = async () =>
      JSON.stringify([
        { 单位: '骨卫兵', 行动: [{ 类型: '主要行动', 技能: '骨爪撕裂', 目标: '玩家' }] },
      ]);

    const 意图 = await 生成敌方意图(造状态());

    expect(意图).toHaveLength(1);
    expect(意图[0].单位).toBe('骨卫兵');
    expect(意图[0].行动[0].技能).toBe('骨爪撕裂');
  });

  it('AI 返回找不到意图数组的 JSON → 抛错（由 开始回合 记日志，不静默）', async () => {
    (globalThis as any).generateRaw = async () => '{"a":1}';
    await expect(生成敌方意图(造状态())).rejects.toThrow('找不到意图数组');
  });

  it('必须走 json_schema 通道 —— 以前不传 schema，零校验零重试，一次围栏就让整回合消失', async () => {
    let 收到的: any = null;
    (globalThis as any).generateRaw = async (cfg: any) => {
      收到的 = cfg;
      return '{"意图":[]}';
    };

    await 生成敌方意图(造状态());

    expect(收到的.json_schema).toBeDefined();
    expect(收到的.json_schema.name).toBe('enemy_intent');
  });

  it('模型把 JSON 包在 ```json 围栏里 → 照样解析出意图（回归：敌人不出招的第二个根因）', async () => {
    (globalThis as any).generateRaw = async () =>
      '```json\n{"意图":[{"单位":"骨卫兵","行动":[{"类型":"主要行动","技能":"骨爪撕裂","目标":"玩家"}]}]}\n```';

    const 意图 = await 生成敌方意图(造状态());

    expect(意图).toHaveLength(1);
    expect(意图[0].行动[0].技能).toBe('骨爪撕裂');
  });

  it('发给模型的提示词里必须带上该单位的技能表原名（否则模型只能瞎编 → 行动被跳过）', async () => {
    let 提示词 = '';
    (globalThis as any).generateRaw = async (cfg: any) => {
      提示词 = cfg.user_input;
      return '{"意图":[]}';
    };
    const 状态 = 造状态();
    状态.单位.骨卫兵.技能 = { 骨爪撕裂: { 行动消耗: '主要行动', 射程: '近战', 目标: '单体', 消耗: '无', 冷却: 0, 分类: '基础', 类型: '主动', 可预判: true, 规则: [], 托管: [] } };

    await 生成敌方意图(状态);

    expect(提示词).toContain('骨爪撕裂');
  });
});
