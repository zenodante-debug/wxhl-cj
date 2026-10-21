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

describe('build · 转职树（递归分支，对齐主卡）', () => {
  const wrap = (转职树: any) => ({ ...base, type: 'build', build: { 构筑名: 'x', 定位: 'y', 职业: { 名称: '卫士', 转职树 } } });

  it('空转职树 → 默认 名称=无 / 状态=未选择 / 分支={}', () => {
    const parsed = BuildPack.parse(wrap({}));
    expect(parsed.build.职业.转职树.名称).toBe('无');
    expect(parsed.build.职业.转职树.状态).toBe('未选择');
    expect(parsed.build.职业.转职树.分支).toEqual({});
  });

  it('递归分支树往返：多层嵌套 + 详情字段保留 + 深层补默认', () => {
    const 树 = {
      名称: '卫士之路',
      状态: '当前',
      分支: {
        '一转·卫士': {
          状态: '已完成',
          详情: {
            详细内容: '以盾护人',
            效果: '防御+2',
            主属性加成: { 属性: 'CON', 值: 3 },
            副属性加成: { 属性: 'STR', 值: 1 },
            职业特性: { 盾墙: '受击减伤' },
            职业技能: { 盾击: { 类型: '主动' } },
          },
          分支: {
            '二转·铁壁': { 状态: '当前', 分支: { '三转·不破': { 状态: '未解锁' } } },
          },
        },
      },
    };
    const root = BuildPack.parse(wrap(树)).build.职业.转职树;
    expect(root.名称).toBe('卫士之路');
    expect(root.状态).toBe('当前');
    expect(root.分支['一转·卫士'].详情.主属性加成).toEqual({ 属性: 'CON', 值: 3 });
    expect(root.分支['一转·卫士'].分支['二转·铁壁'].分支['三转·不破'].状态).toBe('未解锁');
    expect(root.分支['一转·卫士'].分支['二转·铁壁'].分支['三转·不破'].详情.详细内容).toBe('无');
  });

  it('状态接受枚举之外的字符串（union + string 兜底）', () => {
    expect(BuildPack.parse(wrap({ 状态: '转生中' })).build.职业.转职树.状态).toBe('转生中');
  });

  it('反例：分支值不是节点对象 / 详情不是对象 → 拒绝', () => {
    expect(BuildPack.safeParse(wrap({ 分支: { x: 42 } })).success).toBe(false);
    expect(BuildPack.safeParse(wrap({ 分支: { x: { 详情: '不是对象' } } })).success).toBe(false);
  });

  it('反例：状态是数字 → 拒绝', () => {
    expect(BuildPack.safeParse(wrap({ 状态: 123 })).success).toBe(false);
  });
});

describe('build · 装备全字段（对齐主卡 装备槽Schema）', () => {
  it('18 字段全填往返保留；空槽补默认', () => {
    const 主武器 = {
      名称: '斩首大剑', 类型: '双手剑', 品质: '紫色', 阶位: '二阶', 穿戴门槛: 'STR 12',
      强化等级: 5, 伤害骰: '2d6', 倍率: 1.5, 主属性: 'STR', 副属性: 'CON',
      主属性加成: 4, 副属性加成: 2, 装备防御: 3, 装备闪避: 1, 负重: 8,
      效果: { 破甲: '无视 2 点防御' }, 描述: '斩首者之刃', 数量: 1,
    };
    const parsed = BuildPack.parse({ ...base, type: 'build', build: { 构筑名: 'x', 定位: 'y', 主要装备: { 主武器 } } });
    expect(parsed.build.主要装备.主武器).toEqual(主武器);
    // 未提供的槽位由 schema prefault 补齐
    expect(parsed.build.主要装备.头部.名称).toBe('无');
    expect(parsed.build.主要装备.头部.数量).toBe(1);
    expect(parsed.build.主要装备.头部.效果).toEqual({});
  });

  it('只给名称的槽位：其余字段全部落到默认', () => {
    const parsed = BuildPack.parse({ ...base, type: 'build', build: { 构筑名: 'x', 定位: 'y', 主要装备: { 头部: { 名称: '铁盔' } } } });
    expect(parsed.build.主要装备.头部).toEqual({
      名称: '铁盔', 类型: '无', 品质: '无', 阶位: '无', 穿戴门槛: '无', 强化等级: 0, 伤害骰: '无', 倍率: 0,
      主属性: '无', 副属性: '无', 主属性加成: 0, 副属性加成: 0, 装备防御: 0, 装备闪避: 0, 负重: 0, 效果: {}, 描述: '无', 数量: 1,
    });
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

describe('装备·效果 兼容字符串（主卡口径）', () => {
  const base = {
    format: 'wxhl-mod@2', id: 'p1', name: 'x', version: '1.0.0',
    author: { name: 'a' }, description: 'd', cover: '',
  };
  const 造包 = (效果: unknown) => ({
    ...base, type: 'build',
    build: { 构筑名: 'x', 定位: 'y', 主要装备: { 主武器: { 名称: '斩首大剑', 效果 } } },
  });

  it('对象照收', () => {
    const parsed = BuildPack.parse(造包({ 灼烧: '每回合 2 点' }));
    expect(parsed.build.主要装备.主武器.效果).toEqual({ 灼烧: '每回合 2 点' });
  });

  it('纯字符串归一成 {}（不再把整包卡死在 422）', () => {
    expect(BuildPack.parse(造包('无')).build.主要装备.主武器.效果).toEqual({});
    expect(BuildPack.parse(造包('')).build.主要装备.主武器.效果).toEqual({});
  });

  it('技能/称号 的 效果 仍只收对象（不跟着放宽）', () => {
    const 坏 = { ...base, type: 'build', build: { 构筑名: 'x', 定位: 'y', 称号: { 名称: 't', 效果: '纯文本' } } };
    expect(BuildPack.safeParse(坏).success).toBe(false);
  });
});
