// 订单店铺评分 · 分数变动（纯函数，不碰网络与存档）
//
// 规则（2026-09-23 定稿）：完成一单 +1 保底；验收时发单人可再给 0–5 直接加上；
// 退货 −2；弃单 −5；付不起尾款取消不计。分数由客户端在原子状态转换成功后上报，
// 防重复靠服务端 UPDATE 的 status 守卫（两个标签页同时操作只有一个转换成功）。

/** 验收加分：跳过评分（null）只 +1 保底；给分则 1 + 评分（评分钳到 0..5 整数） */
export function 验收加分(评分: number | null): number {
  if (评分 === null) return 1;
  const r = Math.round(Number(评分));
  if (!Number.isFinite(r)) return 1;
  return 1 + Math.min(5, Math.max(0, r));
}

/** 退货扣分：发单人对成品不满意 */
export function 退货扣分(): number {
  return -2;
}

/** 弃单扣分：接单人主动弃单（另赔订金×3，钱走待领取体系，不在此处） */
export function 弃单扣分(): number {
  return -5;
}
