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
}).prefault({});

export type Settings = z.infer<typeof Settings>;
export type ApiConfig = z.infer<typeof ApiConfigSchema>;

export const 默认设置: Settings = Settings.parse({});
