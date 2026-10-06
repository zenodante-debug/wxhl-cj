// ================================================================
// 无限回廊 · 前端战斗引擎 · 酒馆接口接线
// MVU 变量读写 / 脚本变量读写 / AI 调用
// ================================================================

import type { 战斗单位 } from './types';

/**
 * 从 MVU 变量读取战斗单位
 * @param 路径 变量路径键，如 '副本角色.骨卫兵' | '小队.成员.白露露' | '契约者'
 */
export async function 读取战斗单位(路径: string): Promise<战斗单位> {
  await waitGlobalInitialized('Mvu');
  const vars = getVariables({ type: 'message', message_id: -1 });
  const stat_data = vars?.stat_data;

  if (!stat_data?.契约者) {
    throw new Error('MVU 变量中没有契约者数据');
  }

  // 解析路径
  if (路径 === '契约者') {
    return {
      id: '契约者',
      阵营: '我方',
      类型: '玩家',
      // 属性/资源数值由开战流程填充，此处给占位默认值
      属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } },
      阶位: '一阶',
      HP_当前: 100,
      HP_最大: 100,
      MP_当前: 50,
      MP_最大: 50,
      耐力_当前: 100,
      耐力_最大: 100,
      防御: 0,
      闪避值: 10,
      距离: 0,
      行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
      额度: 0,
      冷却: {},
      护盾: 0,
      架势: null,
      状态: [],
      濒死: null,
      资源: {},
      词条: new Set(),
    };
  }

  // 副本角色.骨卫兵 / 小队.成员.白露露 / 其他契约者.某某
  // 容器路径段数可变（'小队.成员' 是两段），最后一段是名称，其余是容器路径
  const parts = 路径.split('.');
  if (parts.length < 2) {
    throw new Error(`无效的单位路径: ${路径}`);
  }

  const 名称 = parts[parts.length - 1];
  const 容器 = parts.slice(0, -1).join('.');
  const 容器对象 = 容器
    .split('.')
    .reduce<any>((node, key) => (node ? node[key] : undefined), stat_data.契约者);
  const 实体 = 容器对象?.[名称];

  if (!实体) {
    throw new Error(`单位不存在: ${路径}`);
  }

  // 判定阵营
  let 阵营: '我方' | '敌方' = '敌方';
  if (容器 === '小队.成员') 阵营 = '我方';
  if (容器 === '其他契约者') 阵营 = '敌方'; // 默认敌方，可手动改

  return {
    id: 路径,
    阵营,
    类型: 实体.类型 || '杂兵',
    // 属性/资源数值由开战流程填充，此处给占位默认值
    属性: { 实际: { STR: 10, AGI: 10, CON: 10, PER: 10 } },
    阶位: '一阶',
    HP_当前: 100,
    HP_最大: 100,
    MP_当前: 50,
    MP_最大: 50,
    耐力_当前: 100,
    耐力_最大: 100,
    防御: 0,
    闪避值: 10,
    距离: 0,
    行动槽: { 主要: 1, 次要: 1, 移动: 1, 反应: 1, 免费: 999 },
    额度: 0,
    冷却: {},
    护盾: 0,
    架势: null,
    状态: [],
    濒死: null,
    资源: {},
    词条: new Set(),
  };
}

export interface 可参战单位 {
  id: string;
  名称: string;
  容器: '契约者本体' | '小队.成员' | '其他契约者' | '副本角色';
  类型: string;
  阶位: string;
  等级: number;
  HP_当前: number;
  HP_最大: number;
  默认阵营: '我方' | '敌方' | '待定';
}

/** 从 MVU 变量读四类容器，展开成可参战单位列表。MVU 无契约者数据时返回空数组。 */
export async function 读取可参战单位(): Promise<可参战单位[]> {
  await waitGlobalInitialized('Mvu');
  const vars = getVariables({ type: 'message', message_id: -1 });
  const 契约者 = vars?.stat_data?.契约者;

  if (!契约者) return [];

  const 结果: 可参战单位[] = [];

  // 契约者本体
  结果.push({
    id: '契约者',
    名称: 契约者.头部?.姓名 || '契约者',
    容器: '契约者本体',
    类型: '玩家',
    阶位: 契约者.头部?.阶位 || '一阶',
    等级: Number(契约者.头部?.等级) || 1,
    HP_当前: Number(契约者.衍生属性?.HP_当前) || 0,
    HP_最大: Number(契约者.衍生属性?.HP_最大) || 0,
    默认阵营: '我方',
  });

  const 展开 = (
    容器: '小队.成员' | '其他契约者' | '副本角色',
    默认阵营: 可参战单位['默认阵营'],
  ) => {
    // 容器名是带点的路径（如 '小队.成员'），对应 MVU 变量里的嵌套结构：
    // 契约者.小队.成员.<名称>。逐段下钻，任一段缺失都当作空容器。
    const obj =
      (容器
        .split('.')
        .reduce<any>((node, key) => (node ? node[key] : undefined), 契约者) as
        | Record<string, any>
        | undefined) || {};
    for (const [名称, 实体] of Object.entries<any>(obj)) {
      结果.push({
        id: `${容器}.${名称}`,
        名称,
        容器,
        类型: 实体.类型 || '杂兵',
        阶位: 实体.头部?.阶位 || '一阶',
        等级: Number(实体.头部?.等级) || 1,
        HP_当前: Number(实体.衍生属性?.HP_当前) || 0,
        HP_最大: Number(实体.衍生属性?.HP_最大) || 0,
        默认阵营,
      });
    }
  };

  展开('小队.成员', '我方');
  展开('其他契约者', '待定');   // 敌友中立都可能 → 开战时手动选
  展开('副本角色', '敌方');     // 固有角色可能中立 → 开战时可改

  return 结果;
}
