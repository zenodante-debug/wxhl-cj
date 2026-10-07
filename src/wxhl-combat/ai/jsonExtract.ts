// ================================================================
// 无限回廊 · 前端战斗引擎 · 宽容 JSON 提取
// 纯函数，不碰酒馆接口
//
// 为什么单独成模块：模型返回的「JSON」常常包着 ```json 围栏、带前后说明文字，
// 或者只截了个大概。裸 `JSON.parse` 遇到这些会直接把整批结果丢掉 ——
// 敌方意图曾因此在整场战斗里一个回合都解析不出来（敌人全程不出招）。
// 这里把「直接 parse → 代码围栏 → 首个平衡括号段」三级兜底收在一处，
// 供 store.aiGenerate 与 ai/enemyTactics 共用。
// ================================================================

/**
 * 从一段文本里抠出 JSON 并解析。
 * 顺序：整体 parse → ```json 围栏 → 从首个 `{`/`[` 起按括号配平截取。
 * 全失败时抛错，错误信息带上原文开头（便于玩家/日志看到模型到底回了什么）。
 */
export function 提取JSON(text: string): any {
  const 文 = String(text ?? '');

  try {
    return JSON.parse(文.trim());
  } catch (_) {}

  const 围栏 = 文.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (围栏) {
    try {
      return JSON.parse(围栏[1].trim());
    } catch (_) {}
  }

  const 起点 = 文.search(/[\{\[]/);
  if (起点 >= 0) {
    const 字符 = [...文.slice(起点)];
    let 深度 = 0;
    let 在串内 = false;
    let 转义 = false;
    let 终点 = -1;
    for (let i = 0; i < 字符.length; i++) {
      const ch = 字符[i];
      if (转义) {
        转义 = false;
        continue;
      }
      if (ch === '\\') {
        转义 = true;
        continue;
      }
      if (ch === '"') {
        在串内 = !在串内;
        continue;
      }
      if (在串内) continue;
      if (ch === '{' || ch === '[') 深度++;
      else if (ch === '}' || ch === ']') {
        深度--;
        if (深度 === 0) {
          终点 = i;
          break;
        }
      }
    }
    if (终点 > 0) {
      try {
        return JSON.parse(文.slice(起点, 起点 + 终点 + 1));
      } catch (_) {}
    }
  }

  throw new Error('AI 回复中未找到有效 JSON，原始回复: ' + 文.slice(0, 300));
}
