import { describe, expect, it } from 'vitest';
import { ContentPack, EventPack, MechanismPack } from '../pack';
import { BuildPack } from '../pack/build';
import { DungeonPack } from '../pack/dungeon';
import { PersonaPack } from '../pack/persona';

const base = {
  format: 'wxhl-mod@2', id: 'p1', name: '雾中列车', version: '1.0.0',
  author: { name: '作者' }, description: '一列永远到不了站的列车', cover: 'https://x.test/c.png',
};
const entry = { name: '时刻表', content: '正文', keys: ['列车'] };

describe('外壳 · format/cover/必填', () => {
  it('@2 合法包通过', () => {
    expect(MechanismPack.safeParse({ ...base, type: 'mechanism', 条目: [entry] }).success).toBe(true);
  });

  it('@1 旧版本被拒（不做向后兼容）', () => {
    expect(MechanismPack.safeParse({ ...base, format: 'wxhl-mod@1', type: 'mechanism', 条目: [entry] }).success).toBe(false);
  });

  it('cover 留空可以，但破坏属性的 URL 必须拒（Review Focus #1）', () => {
    expect(MechanismPack.safeParse({ ...base, cover: '', type: 'mechanism', 条目: [entry] }).success).toBe(true);
    for (const bad of ['https://x.test/a.png" onerror="alert(1)', 'javascript:alert(1)', 'https://x.test/a b.png', 'https://x.test/a.png<script>']) {
      expect(MechanismPack.safeParse({ ...base, cover: bad, type: 'mechanism', 条目: [entry] }).success).toBe(false);
    }
  });

  it('简介必填（列表卡片要显示）', () => {
    expect(MechanismPack.safeParse({ ...base, description: '', type: 'mechanism', 条目: [entry] }).success).toBe(false);
  });

  it('未知 type 被拒', () => {
    expect(ContentPack.safeParse({ ...base, type: 'extension', 条目: [entry] }).success).toBe(false);
  });
});

describe('event · 命名规范', () => {
  it('全部条目以 事件_ 开头 → 通过；带控制器也行', () => {
    const ok = EventPack.safeParse({
      ...base, type: 'event',
      事件条目: [{ name: '事件_雾中列车_开演', content: '正文', keys: ['雾中列车'] }],
      控制器条目: { 名称: 'EJS/雾中列车控制器', 正文: "<% await getwi('事件_雾中列车_开演') %>" },
    });
    expect(ok.success).toBe(true);
  });

  it('条目名没有 事件_ 前缀 → 拒绝（Review Focus #3）', () => {
    const bad = EventPack.safeParse({ ...base, type: 'event', 事件条目: [{ name: '开演', content: '正文', keys: ['k'] }] });
    expect(bad.success).toBe(false);
  });

  it('控制器名必须以 EJS/ 开头', () => {
    const bad = EventPack.safeParse({
      ...base, type: 'event',
      事件条目: [{ name: '事件_a', content: '正文', keys: ['k'] }],
      控制器条目: { 名称: '控制器', 正文: '<% %>' },
    });
    expect(bad.success).toBe(false);
  });
});

describe('dungeon · 对齐主卡副本结构', () => {
  const dungeon = {
    ...base, type: 'dungeon',
    副本名称: '雾中列车', 副本类型: '和平', 基准等级: 3, 时间限制: '三天',
    背景设定: '…', 地图与区域: '…', 敌人配置: '…',
    主线任务: { 名称: '活着下车', 说明: '…', 奖励: '…' },
    支线任务: [{ 名称: '找到乘务员', 说明: '…', 奖励: '…' }],
    世界事件: [], 隐藏任务: [], 成就: [],
    GM指导: '节奏偏慢，鼓励探索',
  };

  it('合法副本通过；副本类型限三选一', () => {
    expect(DungeonPack.safeParse(dungeon).success).toBe(true);
    expect(DungeonPack.safeParse({ ...dungeon, 副本类型: '恐怖' }).success).toBe(false);
  });

  it('缺背景设定/GM指导 → 拒绝', () => {
    expect(DungeonPack.safeParse({ ...dungeon, 背景设定: '' }).success).toBe(false);
    expect(DungeonPack.safeParse({ ...dungeon, GM指导: '' }).success).toBe(false);
  });

  it('额外条目可选，字段同世界书条目', () => {
    expect(DungeonPack.safeParse({ ...dungeon, 额外条目: [entry] }).success).toBe(true);
  });
});

describe('build · 构筑字段（方向 + 数值回填 + 职业镜像新卡）', () => {
  const build = {
    构筑名: '重装堡垒', 定位: '物理破坏配合高容错换血',
    属性分配方向: { 主属性: 'STR', 副属性: 'CON' },
    职业: { 名称: '卫士', 稀有度: '蓝色' },
    通用技能: { 横扫: { 类型: '主动' } },
    主要装备: { 主武器: { 名称: '斩首大剑' } },
  };

  it('合法构筑通过，默认字段补齐', () => {
    const parsed = BuildPack.parse({ ...base, type: 'build', build });
    expect(parsed.build.属性分配方向.主属性).toBe('STR');
    expect(parsed.build.天赋.名称).toBe('无');
    expect(parsed.build.职业.转职树.名称).toBe('无');
    expect(parsed.build.主要装备.主武器.名称).toBe('斩首大剑');
    expect(parsed.build.主要装备.躯干.名称).toBe('无');
  });

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

  it('未知键仍被 strip，不报错', () => {
    const parsed = BuildPack.parse({ ...base, type: 'build', build: { ...build, 不存在字段: 1 } });
    expect('不存在字段' in parsed.build).toBe(false);
  });

  it('主属性必须是四维之一', () => {
    expect(BuildPack.safeParse({ ...base, type: 'build', build: { ...build, 属性分配方向: { 主属性: 'LUK' } } }).success).toBe(false);
  });
});

describe('persona · 人设', () => {
  const persona = { 角色名: '雾中剑客', 性格: '沉默', 爱好: ['擦拭佩剑'], 厌恶: ['喧嚣'], 背景故事: '…' };

  it('合法人设通过；爱好/厌恶默认空数组', () => {
    const parsed = PersonaPack.parse({ ...base, type: 'persona', persona });
    expect(parsed.persona.构筑方向).toBe('');
    expect(PersonaPack.parse({ ...base, type: 'persona', persona: { 角色名: 'x', 性格: '', 背景故事: 'y' } }).persona.爱好).toEqual([]);
  });

  it('缺角色名/背景故事 → 拒绝', () => {
    expect(PersonaPack.safeParse({ ...base, type: 'persona', persona: { ...persona, 角色名: '' } }).success).toBe(false);
    expect(PersonaPack.safeParse({ ...base, type: 'persona', persona: { ...persona, 背景故事: '' } }).success).toBe(false);
  });

  it('可选构筑：粘贴合法 BuildPayload 时填入', () => {
    const parsed = PersonaPack.parse({ ...base, type: 'persona', persona: { ...persona, 构筑方向: '走高闪避', 构筑: { 构筑名: '雾中剑客', 定位: 'x', 属性分配方向: { 主属性: 'AGI' } } } });
    expect(parsed.persona.构筑?.构筑名).toBe('雾中剑客');
  });

  it('外观三件套：缺省为三个空串；带外观（含部分）都能通过', () => {
    const 缺省 = PersonaPack.parse({ ...base, type: 'persona', persona });
    expect(缺省.persona.外观).toEqual({ 外貌: '', 衣着: '', 装备幻化: '' });

    const 全填 = PersonaPack.parse({
      ...base,
      type: 'persona',
      persona: { ...persona, 外观: { 外貌: '银白长发', 衣着: '玄色长风衣', 装备幻化: '佩剑泛微光' } },
    });
    expect(全填.persona.外观).toEqual({ 外貌: '银白长发', 衣着: '玄色长风衣', 装备幻化: '佩剑泛微光' });

    const 部分 = PersonaPack.parse({ ...base, type: 'persona', persona: { ...persona, 外观: { 外貌: '短发' } } });
    expect(部分.persona.外观).toEqual({ 外貌: '短发', 衣着: '', 装备幻化: '' });
  });
});
