import { describe, expect, it } from 'vitest';
import { 提取JSON } from '../ai/jsonExtract';

describe('提取JSON · 模型返回的「JSON」三级兜底', () => {
  it('整体就是合法 JSON → 直接解析', () => {
    expect(提取JSON('{"a":1}')).toEqual({ a: 1 });
  });

  it('外面套 ```json 围栏 → 剥掉围栏（敌方意图曾整场解析不出来）', () => {
    expect(提取JSON('```json\n[{"单位":"骨卫兵"}]\n```')).toEqual([{ 单位: '骨卫兵' }]);
  });

  it('无语言标记的围栏也认', () => {
    expect(提取JSON('```\n{"a":1}\n```')).toEqual({ a: 1 });
  });

  it('前后夹带解释文字 → 按括号配平截取', () => {
    expect(提取JSON('好的，这是意图：\n[{"单位":"甲"}]\n以上就是全部。')).toEqual([{ 单位: '甲' }]);
  });

  it('字符串里的括号/花括号不参与配平', () => {
    expect(提取JSON('{"技能":"斩{击}","备注":"["}')).toEqual({ 技能: '斩{击}', 备注: '[' });
  });

  it('转义引号不被误判为串尾', () => {
    expect(提取JSON('{"备注":"他说\\"打\\"了"}')).toEqual({ 备注: '他说"打"了' });
  });

  it('完全找不到 JSON → 抛错并带上原文开头（便于日志定位）', () => {
    expect(() => 提取JSON('我不会输出 JSON')).toThrow(/未找到有效 JSON.*我不会输出/s);
  });
});
