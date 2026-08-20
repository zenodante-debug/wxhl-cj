/* eslint-disable */
// @ts-nocheck
import _ from 'lodash'
import z from 'zod'
import assert from 'node:assert/strict'

globalThis._ = _
globalThis.z = z

const { PvPSaveSchema, CONTRACT_SAVE_KEYS, TIER_ORDER } = await import('./src/wxhl-003/data.ts')

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

const { extractContractSave, generateDefaultAppearance, tierOf, buildBattleIntroMessage } = await import('./src/wxhl-003/workshop.ts')

const contract = { 头部: { 姓名: '李四' }, 属性: { 基础: { STR: 5 }, 加成: { STR: 3 } }, 背包: { 药: { 数量: 1 } } }
const save = extractContractSave(contract)
assert.deepEqual(Object.keys(save), CONTRACT_SAVE_KEYS)   // 只含六字段，无背包
assert.equal(save.属性.实际.STR, 8)

assert.equal(tierOf('3阶'), 2)
assert.equal(tierOf('未知阶位'), TIER_ORDER.length)

assert.equal(generateDefaultAppearance({ 主武器: { 名称: '长刀' } }), '身着【长刀】的契约者')
assert.equal(generateDefaultAppearance({}), '')

const card = { name: '王五', 阶位: '1阶', 等级: 5, 军衔: '列兵', 职业: '剑士', 简介: '快刀', 上传者: 'a', 外貌: '', save: PvPSaveSchema.parse({ 契约者: { 头部: { 姓名: '王五' }, 职业: { 名称: '剑士' } } }) }
const msg = buildBattleIntroMessage(card)
assert.ok(msg.includes('王五'))
assert.ok(msg.includes('对战开始'))

console.log('VERIFY_OK task2')
