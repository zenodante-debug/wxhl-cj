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
  const parts = 路径.split('.');
  if (parts.length !== 2) {
    throw new Error(`无效的单位路径: ${路径}`);
  }

  const [容器, 名称] = parts;
  const 实体 = stat_data.契约者[容器]?.[名称];

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
