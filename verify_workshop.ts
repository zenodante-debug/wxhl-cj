/* eslint-disable */
// @ts-nocheck
import _ from 'lodash'
import z from 'zod'
import assert from 'node:assert/strict'

globalThis._ = _
globalThis.z = z

const { PvPSaveSchema } = await import('./src/wxhl-003/data.ts')

// 有效存档：正常解析
const valid = PvPSaveSchema.parse({
  契约者: {
    头部: { 姓名: '张三', 等级: 10, 阶位: '2阶' },
    属性: { 基础: { STR: 8 }, 加成: { STR: 2 } },
  },
})
assert.equal(valid.契约者.头部.等级, 10)
assert.equal(valid.契约者.属性.实际.STR, 10)   // transform 重算
// 坏条目：缺字段也能解析（prefault 兜底），不抛错
const empty = PvPSaveSchema.parse({})
assert.equal(empty.契约者.头部.姓名, '')
console.log('VERIFY_OK task1')
