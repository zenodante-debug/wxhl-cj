export interface 外壳状态 {
  面板可见: boolean;
  页签: '战斗' | '设置';
}

export function 外壳初始状态(): 外壳状态 {
  return { 面板可见: false, 页签: '战斗' };
}

export function 切换外壳(状态: 外壳状态, 操作: '打开' | '关闭'): 外壳状态 {
  return { ...状态, 面板可见: 操作 === '打开' };
}

export function 切换页签(状态: 外壳状态, 页签: '战斗' | '设置'): 外壳状态 {
  return { ...状态, 页签 };
}
