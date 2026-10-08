// 无限回廊 · 战斗引擎 · 设置
// 存脚本变量 getVariables({type:'script', script_id})，不受 MVU schema 约束

const ApiConfigSchema = z.object({
  url: z.string().prefault(''),
  apiKey: z.string().prefault(''),
  model: z.string().prefault(''),
  timeout: z.coerce.number().prefault(30000),
});

export const Settings = z.object({
  快路: ApiConfigSchema.prefault({}),
  强路: ApiConfigSchema.prefault({}),
  /**
   * 敌方意图怎么产生：
   * - 'ai'   —— 每回合 1 次 AI 调用，让模型读面板做战术决策（默认）
   * - '随机' —— **不调 AI**：按行动类型给每个单位列选项，掷骰子抽（1dN）决定用哪个
   *              （玩家要的省调用模式："主要行动有三个选项就 1d3"）
   */
  意图模式: z.enum(['ai', '随机']).prefault('ai'),
  /**
   * 战斗演出（决斗场美术）：飘字 / 攻击轨迹 / 变身全屏 / 打断裂纹 / 环境火光。
   * 玩家裁决：「重演出，加可关闭」—— 默认开；关掉时演出层**不渲染**（零成本）。
   * 系统 prefers-reduced-motion 时一律等同关闭（engine/showToggle）。
   */
  演出: z.boolean().prefault(true),
}).prefault({});

export type Settings = z.infer<typeof Settings>;
export type ApiConfig = z.infer<typeof ApiConfigSchema>;

export const 默认设置: Settings = Settings.parse({});
