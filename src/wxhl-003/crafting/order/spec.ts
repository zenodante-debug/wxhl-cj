// 订单需求单：发单人想要什么。纯逻辑，零酒馆依赖。
import type { MarketItemSnapshot } from '../../market/priceTable';

export const 需求单Schema = z.object({
  名称: z.string(),
  成品类型: z.enum(['装备', '道具']),
  装备子类: z.enum(['武器', '防具', '饰品']).or(z.literal('')).prefault(''),
  品质: z.enum(['金色', '紫色']).or(z.literal('')).prefault(''), // 空 = 不限
  阶位: z.coerce.number().prefault(0), // 0 = 不限
  效果要求: z.string().prefault(''),
  说明: z.string().prefault(''),
});
export type 需求单 = z.infer<typeof 需求单Schema>;

/** 阶梯名（0 = 不限时不显示） */
const 阶位名 = ['', '一阶', '二阶', '三阶', '四阶', '五阶'];

/**
 * 摘要：大厅卡片与我的订单共用。
 * 格式 `名称｜成品类型·子类·品质·阶位`，空项跳过；例：
 *   `狼牙短剑｜装备·武器·金色·二阶`、`随便什么｜道具`
 */
export function 需求单摘要(s: 需求单): string {
  const 细节 = [s.装备子类, s.品质, 阶位名[s.阶位] ?? ''].filter(Boolean);
  const 主 = 细节.length ? `${s.成品类型}·${细节.join('·')}` : s.成品类型;
  return `${s.名称}｜${主}`;
}

/** 成品 JSON 体积上限：与市场同一口径，服务端会二次校验 */
export const ORDER_ITEM_MAX = 4096;

/** 超限返回原因，否则 null */
export function 成品体积检查(item: MarketItemSnapshot): string | null {
  const n = JSON.stringify(item).length;
  return n > ORDER_ITEM_MAX ? `成品数据过大（${n} > ${ORDER_ITEM_MAX} 字节）` : null;
}
