// ================================================================
// 无限回廊 · 前端战斗引擎 · 宽容 JSON 提取
// 纯函数，不碰酒馆接口
//
// 为什么单独成模块：模型返回的「JSON」常常包着 ```json 围栏、带前后说明文字，
// 或者只截了个大概。裸 `JSON.parse` 遇到这些会直接把整批结果丢掉 ——
// 敌方意图曾因此在整场战斗里一个回合都解析不出来（敌人全程不出招）。
// 这里把「直接 parse → 代码围栏 → 首个平衡括号段 → **截断抢救**」四级兜底收在一处，
// 供 store.aiGenerate 与 ai/enemyTactics 共用。
//
// 为什么需要「截断抢救」（玩家反馈：用 DeepSeek 经常报非法 JSON）：
// 输出被 max_tokens 切掉尾巴时，JSON 永远等不到闭合 —— 前三层全部失败，
// 整批结果丢弃、再重试 3 次（又截断），白烧几十秒。
// 而列表型结果（翻译条目 / 敌方意图）下游是**逐条按编号对号入座**的，
// 所以「捞回已经完整的 N 条」严格优于「整批作废」：剩下的那几条本来就有复核重试的出路。
// ================================================================

export interface 提取结果 {
  值: any;
  /** true = 原文被截断过，返回的是**抢救出来的部分**（下游应把缺的条目记成失败并重试） */
  截断: boolean;
}

/**
 * 从一段文本里抠出 JSON 并解析（宽容版）。
 * 顺序：整体 parse → ```json 围栏 → 从首个 `{`/`[` 起按括号配平截取 → **截断抢救**。
 * 连一个完整元素都救不回来时抛错，错误信息带上原文开头。
 */
export function 提取JSON宽容(text: string): 提取结果 {
  const 文 = String(text ?? '');

  try {
    return { 值: JSON.parse(文.trim()), 截断: false };
  } catch (_) {}

  const 围栏 = 文.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (围栏) {
    const 内 = 围栏[1].trim();
    try {
      return { 值: JSON.parse(内), 截断: false };
    } catch (_) {}
    // 围栏里也可能被截断（闭合的 ``` 是模型自己补的，里面的 JSON 没闭合）
    const 救 = 从起点抢救(内, 0);
    if (救) return 救;
  }

  const 起点 = 文.search(/[\{\[]/);
  if (起点 >= 0) {
    const 平衡 = 平衡括号段(文, 起点);
    if (平衡 !== null) {
      try {
        return { 值: JSON.parse(平衡), 截断: false };
      } catch (_) {}
    }
    const 救 = 从起点抢救(文, 起点);
    if (救) return 救;
  }

  throw new Error('AI 回复中未找到有效 JSON，原始回复: ' + 文.slice(0, 300));
}

/** 兼容入口：只取值，忽略「是否截断」（调用方不需要区分时用它） */
export function 提取JSON(text: string): any {
  return 提取JSON宽容(text).值;
}

/** 扫描器的状态（括号配平 + 字符串/转义感知） */
interface 扫描态 {
  深度: number;
  在串内: boolean;
  转义: boolean;
}

function 喂(态: 扫描态, ch: string): void {
  if (态.转义) {
    态.转义 = false;
    return;
  }
  if (ch === '\\') {
    态.转义 = true;
    return;
  }
  if (ch === '"') {
    态.在串内 = !态.在串内;
    return;
  }
  if (态.在串内) return;
  if (ch === '{' || ch === '[') 态.深度++;
  else if (ch === '}' || ch === ']') 态.深度--;
}

/** 从 起点 开始的**完整**平衡括号段（找不到闭合 → null） */
function 平衡括号段(文: string, 起点: number): string | null {
  const 态: 扫描态 = { 深度: 0, 在串内: false, 转义: false };
  for (let i = 起点; i < 文.length; i++) {
    喂(态, 文[i]);
    if (态.深度 === 0 && !态.在串内) return 文.slice(起点, i + 1);
  }
  return null;
}

/** 前缀里还没闭合的括号（按出现顺序）→ 需要补的收尾字符串 */
function 缺失的收尾(切: string): string {
  const 栈: string[] = [];
  const 态: 扫描态 = { 深度: 0, 在串内: false, 转义: false };
  for (const ch of 切) {
    const 前 = 态.深度;
    喂(态, ch);
    if (态.深度 > 前) 栈.push(ch === '{' ? '}' : ']');
    else if (态.深度 < 前) 栈.pop();
  }
  // 在字符串里被切断（模型输出切在文案中间）→ 先补一个引号把字符串收掉
  const 引号 = 态.在串内 && !态.转义 ? '"' : '';
  return 引号 + 栈.reverse().join('');
}

/**
 * 截断抢救：从后往前试「安全截点」（`}` / `]` 刚闭合完某个元素的位置），
 * 补上缺失的收尾括号再 parse —— 第一个成功的即为结果。
 */
function 从起点抢救(文: string, 起点: number): 提取结果 | null {
  const 剩余 = 文.slice(起点);

  // 收集截点：深度 >= 1（说明还在根结构内部）时的每个闭合括号位置
  const 候选: number[] = [];
  const 态: 扫描态 = { 深度: 0, 在串内: false, 转义: false };
  for (let i = 0; i < 剩余.length; i++) {
    const ch = 剩余[i];
    喂(态, ch);
    if ((ch === '}' || ch === ']') && !态.在串内 && 态.深度 >= 1) 候选.push(i);
  }

  for (let k = 候选.length - 1; k >= 0; k--) {
    const 切 = 剩余.slice(0, 候选[k] + 1);
    const 补 = 缺失的收尾(切);
    if (!补) continue; // 已经闭合了（不该走到这里）
    try {
      return { 值: JSON.parse(切 + 补), 截断: true };
    } catch (_) {
      // 这个截点补不回来（比如切在半个键名上）→ 往前再试一个
    }
  }
  return null;
}
