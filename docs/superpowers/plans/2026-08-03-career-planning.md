# 职业路线规划 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 wxhl-003 插件中新增职业规划功能，与论坛、设置平级作为桌面第三个图标入口，支持玩家输入关键词/想法，AI 两轮生成融合职业方案（框架→细节），方案持久化到 localStorage 并可管理。

**Architecture:** 在现有 `App.vue` 的 `currentView` 导航模式中新增 `'career'` 视图，在 `store.ts` 中新增 `useCareerStore`（pinia），在 `data.ts` 中新增 `CareerPlan` 类型。两轮 AI 生成复用现有的 `aiGenerate()` 函数和世界书内容。

**Tech Stack:** Vue 3 + Pinia + TypeScript + SCSS（完全复用现有技术栈和代码模式）

## Global Constraints

- 使用酒馆助手接口（`generateRaw`、`getWorldbook`、`getWorldbookNames` 等）直接调用，无需导入
- 使用 pinia `defineStore` + `watchEffect` 实现 localStorage 自动同步
- CSS 使用现有 `--bg`/`--amber`/`--chalk`/`--blood` 等变量体系，在 `<style lang="scss" scoped>` 中编写
- 职业系统规则使用用户提供的原文（`<职业系统>` + `<职业融合>`），不做精简
- JSON Schema 验证 + 3 次重试机制与论坛一致
- `string` 类型承载复杂文本字段，避免 AI 产出不一致的嵌套结构

---

### Task 1: 新增 CareerPlan 类型定义

**Files:**
- Modify: `src/wxhl-003/data.ts`（追加类型定义）

**Interfaces:**
- Produces: `CareerPlan` interface, `CAREER_SYSTEM_RULES` const, `WORLD_SUMMARY` const

- [ ] **Step 1: 在 data.ts 末尾追加类型和常量**

在 `src/wxhl-003/data.ts` 文件末尾追加以下内容：

```typescript
// ================================================================
// 职业规划
// ================================================================

export interface CareerPlan {
  id: number
  createdAt: string
  keywords: string
  phase: 'v1' | 'complete'

  // === 第一轮：框架 ===
  name: string
  rarity: string
  coreConcept: string
  mainJob: {
    name: string
    rarity: string
    acquisition: string
    classTree: string
    attributeTendency: string
  }
  subJob: {
    name: string
    rarity: string
    world: string
    acquisition: string
    classTree: string
    attributeTendency: string
  }
  affinity: {
    result: string
    reasons: string
  }
  evolution: {
    firstClass: string
    secondClass: string
    thirdClass: string
  }

  // === 第二轮：细节 ===
  mainSkillTree?: string
  subSkillTree?: string
  mainPassives?: string
  subPassives?: string
  combinedAttributes?: string
  equipmentFit?: string
  stepGuide?: string[]
  risks?: string
}

/** 职业系统规则原文（嵌入 AI prompt） */
export const CAREER_SYSTEM_RULES = `# 职业系统:
  ## 核心定义:
    - 职业是契约者选择的战斗/生存专精方向
    - 同一时间只能持有1个职业，转职在原职业基础上进化
    - 职业提供: 专属技能树、属性加成、被动特性、装备适性
    - 职业独立于契约者等级，拥有独立的职业熟练度等级
    - 职业种类不设固定列表，由GM根据副本世界观动态生成
    - 获得职业时，由GM根据世界观和该职业的品质(稀有度)一次性锚定并写入完整的转职树，转职树的生成要严格参照转职的词条，生成独具特色的各个转职。
        - 品质决定树的分支深度：白色(向下展开1层)、蓝色(展2层)、金色(展3层)、紫/银(展4层)

    ## 职业的输出格式（严格按照以下格式生成和发放职业）：
      职业:
      名称: 无
      稀有度: 无
      转职阶段: 无
      职业等级: 0
      PEXP_当前: 0
      PEXP_升级所需: 0
      主属性加成:
        属性: 无
        值: 0
      副属性加成:
        属性: 无
        值: 0
      职业技能: {}
      职业特性: {}
      传承技能: {}
      转职树:
        名称: 无
        状态: 当前
        分支: {}


  ## 职业获取_职业书:
    获取渠道:
      回廊职业馆: 出售白色/蓝色基础职业书，100~400 UP
      高级市场（少尉解锁）: 刷新金色/紫色职业书，800~3000 UP
      副本掉落: BOSS/隐藏BOSS击杀后概率掉落，品质随机
      隐藏任务奖励: 通常金色及以上
      其他契约者交易: 高级市场寄售或副本内直接交易
      晋升试炼奖励: 阶位突破时回廊可能赠予对应阶位的转职书

  ## 职业稀有度:
    白色_普通: 基础职业，技能树浅（3~4个专属技能），可一转
    蓝色_精良: 进阶职业，技能树中（5~6个专属技能），可二转
    金色_稀有: 高级职业，技能树深（7~8个专属技能），可三转
    紫色_传说: 极稀有，技能树极深（8~10个专属技能），可三转+隐藏转职
    银色_唯一: 全回廊仅此一本，完整独立体系，专属进化路线，可三转+隐藏转职

  ## 职业熟练度:
    等级范围: Lv.1~Lv.10，每次转职后重置为Lv.1
    升级货币: PEXP（职业经验）
    PEXP获取:
      副本中使用职业专属技能（每次战斗结算）: 5~15
      完成与职业定位相关的行动: 10~20
      副本通关基础奖励: 难度系数×20
      完成职业专属支线: 50~100
    升级阈值: Lv.1→2:50, Lv.2→3:80, Lv.3→4:120, Lv.4→5:170, Lv.5→6:230, Lv.6→7:300, Lv.7→8:380, Lv.8→9:470, Lv.9→10:570
    等级奖励:
      奇数级（1/3/5/7/9）: 解锁1个职业专属技能（初始等级为Lv.1）
      偶数级（2/4/6/8/10）: 获得1个职业被动特性或属性加成

 ## 转职系统:
    定义：每一个职业上设不同的转职路线，类似dnf的转职，如剑士的一转可以变成魔剑士和剑王等等，即不同的专精情况与构筑路线。每一个转职都会有转职树的劈叉，每一个分支都能继续向下衍生至少两个分支
    基础职业: 使用职业书学习，职业等级上限Lv.10
    一转: 职业Lv.10 + 契约者阶位≥二阶 + 一转职业书，等级重置上限Lv.10
    二转: 一转职业Lv.10 + 阶位≥三阶 + 二转职业书，等级重置上限Lv.10
    三转: 二转职业Lv.10 + 阶位≥四阶 + 三转职业书，等级重置上限Lv.10
    隐藏转职: 三转Lv.10 + 特殊条件（传说/唯一职业专属）
    转职书获取:
      一转书: 回廊职业馆500 UP / II~III级副本掉落
      二转书: 高级市场2000 UP / IV级副本BOSS掉落 / 隐藏任务
      三转书: V~VI级副本隐藏BOSS掉落 / 特定副本成就奖励
      隐藏转职书: 唯一触发条件，不可购买
    不可逆性: 转职后无法回退（除非获得极稀有的职业重置卷轴），完全更换职业需使用新基础职业书且原职业全部清零

 ##  属性加成:
    规则: 每个职业激活时提供固定的属性倾向加成，随职业等级成长，转职后加成叠加
    成长表:
      Lv.1~3: 主属性+1，副属性+0
      Lv.4~6: 主属性+2，副属性+1
      Lv.7~9: 主属性+3，副属性+1
      Lv.10: 主属性+4，副属性+2
    主副属性: 由职业类型决定（近战物理主STR副CON，暗杀型主AGI副PER等）

  ## 职业专属技能:
    - 只有持有该职业时才能使用
    - 初始解锁时统一为Lv.1。升级规则与通用技能完全一致：契约者需前往回廊强化室，花费UP将职业技能从Lv.1最高升至Lv.5，以此获得更强的基础数值、机制扩展与极意特效。
    - 转职后前一阶段核心技能保留为传承技能（最多保留3个），传承技能保留原有的升级进度。
    - 其余技能在转职时失去，被新职业技能替代，且原先投入的强化UP不予返还。

 ## 职业被动特性:
    - 永久生效的被动效果，由GM根据职业定位和稀有度设计，要求贴合职业。
    - 示例方向: 近战物理叠层增伤、暗杀低HP暴击翻倍、法术连续施法MP递减、防御静止时防御提升

 ##  装备适性:
    - 特定职业可额外激活对应标注装备的隐藏词条
    - 无适性标注的装备任何人都能正常使用，只是无法触发隐藏词条

  ## 与其他系统交互:
    与天赋: 职业方向与天赋特质高度契合时，GM可判定触发天职共鸣，为特定技能提供额外加成
    与敌人: 精英及以上敌人可拥有职业，额外获得属性加成和2~3个职业技能
    与CR评价: 用职业特性巧妙通关的CR提升幅度高于纯属性碾压

##  副本职业:
    核心定义:
      - 副本世界中的各类力量体系（查克拉、念能力、魔术回路、赛亚人血脉、恶魔果实、巨人之力、霸气、斗气等），统一归类为副本职业
      - 副本职业与回廊原生职业共用同一套职业框架：稀有度、职业等级Lv.1~Lv.10、转职机制、技能树
      - 副本职业不存在"职业书"这一物品，无法购买，只能在副本中通过特定条件亲身获取
    获取方式:
      规则: 副本职业只能由契约者在副本中挖掘获得，GM根据副本世界观设定具体获取条件
      常见途径:
        - 击败特定敌人并继承其力量（如击杀恶魔果实能力者后果实重生、吸收巨人脊髓液）
        - 副本NPC传授（需极高好感度或完成指定任务链）
        - 使用特定物品或经历特定仪式（如食用恶魔果实、注入查克拉种子、打通魔术回路）
        - 战斗中触发潜力觉醒（如濒死激活写轮眼、战斗压力下触发赛亚人变身）
        - 隐藏任务或隐藏区域的奖励
      说明: 获取的稀有度由来源决定，GM根据原著设定判定品质
    稀有度:
      规则: 与回廊原生职业共用同一品质体系——白色、蓝色、金色、紫色、银色。稀有度由该力量体系在原著中的天花板和稀有程度决定。
      示例:
        白色: 普通查克拉忍者、基础念能力者、普通魔术师、低级赛亚人战士
        蓝色: 单属性特化忍者（风遁使）、强化系念能力者、下级恶魔果实（烟雾果实等）
        金色: 血继限界（冰遁、木遁）、特质系念能力者、自然系恶魔果实
        紫色: 宇智波写轮眼、王族赛亚人血脉、远坂级魔术回路、幻兽种恶魔果实
        银色: 轮回写轮眼、传说中的超级赛亚人之神、根源接触者（副本唯一）
    技能获取:
      规则: 副本职业的技能随职业等级提升解锁，与回廊原生职业规则一致——奇数级仅解锁技能（初始Lv.1，需去强化室付费升级），偶数级获得被动特性或属性加成
      技能内容: 由副本世界观决定，GM根据原著能力设定设计
      示例_白色查克拉忍者:
        Lv.1: 查克拉操控（被动，可使用查克拉）、替身术
        Lv.3: D级忍术（变化之术、分身术）
        Lv.5: C级忍术（基础元素遁术1种）
        Lv.7: B级忍术（影分身之术）
        Lv.9: A级忍术（大型元素遁术）
      示例_紫色写轮眼:
        Lv.1: 写轮眼·一勾玉（洞察体术，复制C级及以下忍术）
        Lv.3: 写轮眼·二勾玉（洞察范围扩大，复制B级忍术）
        Lv.5: 写轮眼·三勾玉（完全体写轮眼，复制A级忍术，幻术·写轮眼）
        Lv.7: 瞳力强化（写轮眼消耗降低，幻术判定+2）
        Lv.9: 查克拉亲和强化（元素遁术威力提升，可习得火遁·豪火球等宇智波传承术）

 ##   转职路线:
      规则:
        - 副本职业拥有独立于回廊原生职业的专属转职路线
        - 转职路线由原著力量体系的进化路径决定
        - 与回廊原生转职共用阶位要求（一转需二阶、二转需三阶、三转需四阶）
        - 不需要转职书
        - 不需要满足原著中的苛刻进化条件——回廊将原著中的极端触发条件（至亲之死、极度愤怒、特殊血统仪式等）统一替换为回廊标准转职考核：阶位达标 + 职业等级Lv.10 + 回廊晋升试炼中的专项测试
        - 设计意图: 回廊提取了力量体系的成长框架，剥离了原著的剧情依赖条件。契约者通过自身实力和努力推动进化，不需要复刻原著的命运轨迹
      示例:
        写轮眼路线: 写轮眼（基础）→ 万花筒写轮眼（一转）→ 永恒万花筒写轮眼（二转）→ 轮回眼（三转）
        赛亚人路线: 赛亚人战士（基础）→ 超级赛亚人（一转）→ 超级赛亚人3（二转）→ 超级赛亚人之神（三转）
        恶魔果实路线: 果实能力者（基础）→ 能力深化（一转）→ 果实觉醒·初阶（二转）→ 果实觉醒·完全体（三转）
        念能力路线: 念能力者（基础）→ 念能力高手（一转）→ 念大师（二转）→ 念之极致（三转）

# 职业融合

## 核心定义
- 当契约者同时持有回廊原生职业和副本职业时，可选择将两者融合为一个全新的混合职业
- 融合终身仅限一次，不可逆，不可更改
- 融合时契约者必须指定一个为主职业、一个为副职业
- 融合后的职业是契约者独有的混合职业，在变量框架中作为单一职业显示

## 前提
- 契约者当前必须持有一个回廊原生职业，且获得了一个副本职业

## 相性判定
- 触发: 契约者同时持有原生职业和副本职业时，回廊自动进行相性判定
- 判定依据
  - 属性倾向: 两个职业的主属性、副属性是否重叠或互补
  - 战斗方式: 近战+近战强化型=高相性，远程法术+纯肉搏=低相性
  - 主题逻辑: 剑术+风遁=高相性，圣光牧师+恶魔之力=低相性
- 判定结果
  - 高相性: 可以选择融合
  - 低相性: 不能融合，只能选择替换当前职业或保留当前职业放弃副本职业

## 主副职业选择
- 规则: 融合时契约者必须从两个职业中选择一个作为主职业、一个作为副职业。选择不可更改。
- 主职业待遇
  - 完整技能树，所有技能正常解锁
  - 完整属性加成，不做削减
  - 完整转职路线，可进化至三转（最高阶段）
  - 转职时主职业元素优先体现在融合职业名称和核心能力中
- 副职业待遇
  - 进化上限锁定: 最高只能进化到二转，无法达到三转
  - 属性加成减半: 副职业提供的主属性和副属性加成均减半（向下取整）
  - 核心技能限制: 仅保留最多3个核心技能（由GM根据该职业定位判定），不开放完整技能树
  - 被动特性照常: 副职业偶数级获得的被动特性正常获得，不做削减
  - 核心技能升级: 副职业的3个核心技能随副职业转职而升级，但不会解锁新的非核心技能
- 示例
  - 主剑士 + 副写轮眼
    - 融合名: 写轮眼剑士
    - 主职业: 剑士技能树完整可用，可三转至剑神
    - 副职业: 写轮眼仅保留洞察、复制忍术、幻术三个核心技能，被动特性正常获得，最高进化到永恒万花筒（二转），无法达到轮回眼（三转），写轮眼属性加成减半
  - 主写轮眼 + 副剑士
    - 融合名: 剑术宇智波
    - 主职业: 写轮眼技能树完整可用，可三转至轮回眼
    - 副职业: 剑士仅保留3个核心剑术技能，被动特性正常获得，最高进化到二转，剑士属性加成减半

## 融合后效果
- 变量框架
  - 融合后的混合职业在变量中作为单一职业显示
  - 名称字段显示融合名
  - 稀有度字段显示主职业稀有度
  - 转职阶段字段显示主职业当前阶段
  - 属性加成字段显示合计值（主职业完整 + 副职业减半）
  - 职业技能字段同时列出主职业技能和副职业核心技能（副职业技能标注[副]前缀）
  - 职业特性字段同时列出主职业和副职业的被动特性
  - 传承技能字段保持原有规则
- 职业等级: 不重置，PEXP不重置
- 进化难度翻倍
  - PEXP升级阈值×2: 原Lv.1→2需50 PEXP，融合后需100 PEXP；原Lv.2→3需80，融合后需160；以此类推所有等级
  - 转职考核难度×2: 回廊晋升试炼中职业相关测试内容的难度加倍
  - 设计意图: 同时推进两条进化路线的代价是付出双倍努力——勇敢者的回报
- 转职
  - 主职业和副职业同步进化
  - 每次转职同时推进两条路线
  - 副职业在二转后停止进化，后续转职仅推进主职业
  - 转职条件需满足回廊原生转职的阶位要求
  - 示例: 主剑士副写轮眼
    - 一转: 万花筒·剑圣（剑士一转 + 写轮眼一转）
    - 二转: 永恒万花筒·刃极（剑士二转 + 写轮眼二转，副职业到此为止）
    - 三转: 刃极·无双（剑士三转，写轮眼维持永恒万花筒不再进化）

## 替换（低相性时或主动选择）
- 规则
  - 当前职业被完全清除（等级、PEXP、技能、特性清零）
  - 副本职业成为新的基础职业，从Lv.1开始
  - 可从旧职业中选择最多3个技能作为传承技能保留
- 说明: 替换不消耗融合次数

## 未持有职业时
- 规则: 契约者无职业状态下获得副本职业，直接作为基础职业使用，不涉及融合，不消耗融合次数

## 特殊情况
- 多个副本职业
  - 同一时间只能持有1个职业（含融合后的混合职业）
  - 获得新副本职业时必须选择: 替换当前职业或放弃新副本职业
  - 已经融合过的契约者不可再次融合，只能替换或放弃
- 融合后再获得新副本职业
  - 已融合的混合职业视为一个整体
  - 新副本职业只能替换这个整体，不能再次融合
  - 替换后融合状态永久失去`

/** 世界观模块摘要（与论坛共享） */
export const WORLD_SUMMARY = '无限回廊副本系统（40主模块×40副模块×3副本类型）：主模块: 低武江湖/高武大荒/古典修仙/洪荒神话/东方志异/诡异民俗/日常都市/都市异能/黑帮谍战/智斗博弈/现代怪异/超凡竞技/硬核科幻/太空歌剧/赛博朋克/废土生存/机甲巨兽/末日生化/智械危机/星际虫灾/低魔中世纪/高魔史诗/蒸汽维多利亚/暗黑魂系/暗黑哥特/魔法学院/克苏鲁神话/异常收容/规则怪谈/梦核超现实/童话反转/阈限空间/VR游戏/历史演义/美漫超英/Galgame向/深渊地狱/热血王道/黄文里番/荒诞喜剧。副模块: 大逃杀/绝境求生/天灾降临/绝症倒计时/狩猎靶标/狼人背叛/卧底潜伏/声望崩塌/阵营对抗/禁止杀戮/密室解谜/时间轮回/叙述诡计/连环凶案/因果逆转/据点塔防/两军对垒/斩首行动/护送任务/资源争夺/地牢深潜/巨物围猎/碎片拼凑/怪物图鉴/遗迹破译/全员禁魔/科技锁死/属性压制/原著附身/多方乱战/白手起家/权欲交易/领地建设/表里世界/移动迷宫/寻宝竞速/信仰掠夺/身份替换/筹码赌局/剧本演出。副本类型: 和平/阵营/血腥。CR难度: 漠视→观察→关注→重视→期待→炼狱。势力: 特管局/恶魔旅团/方舟集团/瑞辰基金会/神圣教会/零号局/OETA/APJC/EJSSA。奖励: UP货币/EXP/装备(白蓝紫金)/技能卷轴/RP/职业书/称号'
```

- [ ] **Step 2: 构建检查**

```bash
cd "C:/Users/zero/Downloads/tavern_helper-template-main" && pnpm build
```

预期：构建成功，无类型错误和编译错误。

- [ ] **Step 3: 提交**

```bash
git add src/wxhl-003/data.ts
git commit -m "feat: add CareerPlan types and career system rules to data.ts"
```

---

### Task 2: 新增 useCareerStore

**Files:**
- Modify: `src/wxhl-003/store.ts`（追加 useCareerStore 定义）

**Interfaces:**
- Consumes: `CareerPlan`, `CAREER_SYSTEM_RULES`, `WORLD_SUMMARY` from `./data`
- Consumes: `aiGenerate()`, `extractJSON()`, `getActiveCfg()`, `getWorldbookContent()` 等 store.ts 内部已有函数
- Consumes: `useForumStore` 中的 `getWorldbookContent()` 方法（通过引用复用）
- Produces: `useCareerStore()` — pinia store，导出给 App.vue 使用

- [ ] **Step 1: 在 store.ts 末尾追加 useCareerStore**

在 `src/wxhl-003/store.ts` 文件末尾（`useForumStore` 定义之后）追加以下内容：

```typescript
// ================================================================
// 职业规划 Store
// ================================================================
import { type CareerPlan, CAREER_SYSTEM_RULES, WORLD_SUMMARY } from './data'

const CP_SK = 'wxhl003_career_plans'

function loadCareerPlans(): CareerPlan[] {
  try {
    const r = localStorage.getItem(CP_SK)
    if (r) return JSON.parse(r)
  } catch (_) {}
  return []
}

function saveCareerPlans(plans: CareerPlan[]) {
  try { localStorage.setItem(CP_SK, JSON.stringify(plans)) } catch (_) {}
}

// ============ JSON Schema: 第一轮 ============
const CAREER_V1_SCHEMA = {
  name: 'career_plan_v1',
  value: {
    type: 'object',
    properties: {
      name: { type: 'string' },
      rarity: { type: 'string' },
      coreConcept: { type: 'string' },
      mainJob: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rarity: { type: 'string' },
          acquisition: { type: 'string' },
          classTree: { type: 'string' },
          attributeTendency: { type: 'string' },
        },
        required: ['name', 'rarity', 'acquisition', 'classTree', 'attributeTendency'],
      },
      subJob: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          rarity: { type: 'string' },
          world: { type: 'string' },
          acquisition: { type: 'string' },
          classTree: { type: 'string' },
          attributeTendency: { type: 'string' },
        },
        required: ['name', 'rarity', 'world', 'acquisition', 'classTree', 'attributeTendency'],
      },
      affinity: {
        type: 'object',
        properties: {
          result: { type: 'string' },
          reasons: { type: 'string' },
        },
        required: ['result', 'reasons'],
      },
      evolution: {
        type: 'object',
        properties: {
          firstClass: { type: 'string' },
          secondClass: { type: 'string' },
          thirdClass: { type: 'string' },
        },
        required: ['firstClass', 'secondClass', 'thirdClass'],
      },
    },
    required: ['name', 'rarity', 'coreConcept', 'mainJob', 'subJob', 'affinity', 'evolution'],
  },
}

// ============ JSON Schema: 第二轮 ============
const CAREER_V2_SCHEMA = {
  name: 'career_plan_v2',
  value: {
    type: 'object',
    properties: {
      mainSkillTree: { type: 'string' },
      subSkillTree: { type: 'string' },
      mainPassives: { type: 'string' },
      subPassives: { type: 'string' },
      combinedAttributes: { type: 'string' },
      equipmentFit: { type: 'string' },
      stepGuide: { type: 'array', items: { type: 'string' } },
      risks: { type: 'string' },
    },
    required: ['mainSkillTree', 'subSkillTree', 'mainPassives', 'subPassives', 'combinedAttributes', 'equipmentFit', 'stepGuide', 'risks'],
  },
}

// ============ 生成 Prompt 构建 ============
function buildCareerV1Prompt(keywords: string, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的职业规划AI。请根据以下规则，为契约者设计一个融合职业方案。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【世界观模块摘要】
${WORLD_SUMMARY}

【契约者的想法】
${keywords}

【任务要求】
请根据契约者输入的关键词或混乱想法，理解其意图并梳理出清晰的方向，然后设计一个融合职业方案。方案必须包含以下所有字段：

1. **name**: 融合职业名称（如"写轮眼刺客"、"恶魔猎手·炎拳"、"风遁剑圣"等），要体现主副职业融合的特色
2. **rarity**: 主职业稀有度（白色/蓝色/金色/紫色/银色），并提供稀有度判定理由
3. **coreConcept**: 一句话核心定位，概括这个融合职业的战斗风格和核心特色
4. **mainJob**: 回廊原生主职业
   - name: 职业名称
   - rarity: 稀有度
   - acquisition: 获取方式和大致花费UP
   - classTree: 完整转职路线（从基础到三转的每个分支名称和核心能力）
   - attributeTendency: 属性倾向（如"主STR副CON"）
5. **subJob**: 副本副职业
   - name: 职业名称
   - rarity: 稀有度，并给出稀有度判定依据
   - world: 来自哪个副本世界（具体作品名）
   - acquisition: 在该世界中如何获取（具体步骤和条件）
   - classTree: 转职路线（最高到二转）
   - attributeTendency: 属性倾向
6. **affinity**: 相性分析
   - result: 判定结果（必须是"高相性"）
   - reasons: 详细判定理由（属性重叠度、战斗方式契合度、主题逻辑）
7. **evolution**: 进化路线图
   - firstClass: 一转的名称、达成条件、核心变化
   - secondClass: 二转的名称、达成条件、核心变化
   - thirdClass: 三转的名称、达成条件、核心变化（副职业二转后停止进化）`
}

function buildCareerV2Prompt(plan: CareerPlan, worldbookText: string): string {
  const worldCtx = worldbookText ? '\n【世界观参考】\n' + worldbookText : ''
  return `你是无限回廊的职业规划AI。你已经为契约者设计了一个融合职业方案的框架，现在需要补充方案的具体细节。

【职业系统规则】
${CAREER_SYSTEM_RULES}

${worldCtx}

【已确认的职业方案框架】
- 融合职业名称: ${plan.name}
- 稀有度: ${plan.rarity}
- 核心定位: ${plan.coreConcept}
- 主职业: ${plan.mainJob.name}（${plan.mainJob.rarity}）— 属性倾向: ${plan.mainJob.attributeTendency}
- 主职业转职: ${plan.mainJob.classTree}
- 副职业: ${plan.subJob.name}（${plan.subJob.rarity}）— 来自《${plan.subJob.world}》— 属性倾向: ${plan.subJob.attributeTendency}
- 副职业转职: ${plan.subJob.classTree}
- 相性: ${plan.affinity.result} — ${plan.affinity.reasons}
- 一转: ${plan.evolution.firstClass}
- 二转: ${plan.evolution.secondClass}
- 三转: ${plan.evolution.thirdClass}

【任务要求】
请在以上框架的基础上，生成以下具体细节（每个字段都要详细填充）：

1. **mainSkillTree**: 主职业技能树。从Lv.1到Lv.9，奇数级各解锁什么技能，技能名称+简要效果。稀有度越高技能越丰富。
2. **subSkillTree**: 副职业保留的3个核心技能。技能名称+效果，说明为何选中这3个作为核心。随副职业转职，这3个技能如何升级进化。
3. **mainPassives**: 主职业偶数级（Lv.2/4/6/8/10）获得的被动特性，每个特性的名称和效果。
4. **subPassives**: 副职业偶数级获得的被动特性。
5. **combinedAttributes**: 融合后属性加成合计值。主职业完整+副职业减半（向下取整）。按Lv.1~3/4~6/7~9/10四个阶段展示主副属性数值变化。
6. **equipmentFit**: 装备适性建议。适合哪些类型的装备，可能触发隐藏词条的装备类型。
7. **stepGuide**: 分步获取指南。从零开始的完整步骤，每一步具体要做什么：
   - Step 1: 在回廊做什么准备
   - Step 2: 获取主职业书
   - Step 3: 进入副本世界获取副本职业
   - Step 4: 进行融合
   - 后续步骤: 练级转职的方向建议
8. **risks**: 风险提示。必须包含：融合终身仅一次不可逆、PEXP升级阈值翻倍、转职考核难度翻倍，以及该具体方案的特殊风险。`
}

// ================================================================
// PINIA STORE: useCareerStore
// ================================================================
export const useCareerStore = defineStore('career', () => {
  const plans = ref<CareerPlan[]>(loadCareerPlans())
  const generatingV1 = ref(false)
  const generatingV2 = ref(false)
  const lastError = ref('')

  // 自动同步 localStorage
  watchEffect(() => saveCareerPlans(plans.value))

  // 引用论坛 store 的 getWorldbookContent（复用世界书选择）
  function getForumStore() {
    // useForumStore 在同一文件中定义，可直接调用
    return useForumStore()
  }

  /** 第一轮生成：框架 */
  async function createPlan(keywords: string) {
    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV1.value = true
    lastError.value = ''
    try {
      const wb = await forumStore.getWorldbookContent()
      const prompt = buildCareerV1Prompt(keywords, wb)
      const raw = await aiGenerate(cfg, prompt, CAREER_V1_SCHEMA)
      const data = extractJSON(raw)

      const now = new Date()
      const ts = now.getFullYear() + '-' +
        String(now.getMonth() + 1).padStart(2, '0') + '-' +
        String(now.getDate()).padStart(2, '0') + ' ' +
        String(now.getHours()).padStart(2, '0') + ':' +
        String(now.getMinutes()).padStart(2, '0')

      const maxId = plans.value.reduce((m, p) => Math.max(m, p.id), 0)
      const plan: CareerPlan = {
        id: maxId + 1,
        createdAt: ts,
        keywords,
        phase: 'v1',
        name: data.name || '未命名',
        rarity: data.rarity || '白色',
        coreConcept: data.coreConcept || '',
        mainJob: data.mainJob || { name: '', rarity: '', acquisition: '', classTree: '', attributeTendency: '' },
        subJob: data.subJob || { name: '', rarity: '', world: '', acquisition: '', classTree: '', attributeTendency: '' },
        affinity: data.affinity || { result: '', reasons: '' },
        evolution: data.evolution || { firstClass: '', secondClass: '', thirdClass: '' },
      }
      plans.value.unshift(plan)
    } catch (e: any) {
      lastError.value = e.message || '生成失败'
    } finally {
      generatingV1.value = false
    }
  }

  /** 第二轮生成：细节 */
  async function confirmPlan(id: number) {
    const idx = plans.value.findIndex(p => p.id === id)
    if (idx < 0) return

    const forumStore = getForumStore()
    const cfg = getActiveCfg(forumStore.settings)
    if (!cfg.url || !cfg.apiKey) { lastError.value = '请先在终端设置中配置 API'; return }

    generatingV2.value = true
    lastError.value = ''
    try {
      const plan = plans.value[idx]
      const wb = await forumStore.getWorldbookContent()
      const prompt = buildCareerV2Prompt(plan, wb)
      const raw = await aiGenerate(cfg, prompt, CAREER_V2_SCHEMA)
      const data = extractJSON(raw)

      plans.value[idx] = {
        ...plan,
        phase: 'complete',
        mainSkillTree: data.mainSkillTree || '',
        subSkillTree: data.subSkillTree || '',
        mainPassives: data.mainPassives || '',
        subPassives: data.subPassives || '',
        combinedAttributes: data.combinedAttributes || '',
        equipmentFit: data.equipmentFit || '',
        stepGuide: Array.isArray(data.stepGuide) ? data.stepGuide : [],
        risks: data.risks || '',
      }
    } catch (e: any) {
      lastError.value = e.message || '生成细节失败'
    } finally {
      generatingV2.value = false
    }
  }

  /** 删除方案 */
  function deletePlan(id: number) {
    plans.value = plans.value.filter(p => p.id !== id)
  }

  return {
    plans, generatingV1, generatingV2, lastError,
    createPlan, confirmPlan, deletePlan,
  }
})
```

- [ ] **Step 2: 构建检查**

```bash
cd "C:/Users/zero/Downloads/tavern_helper-template-main" && pnpm build
```

预期：构建成功，新增的 store 无类型错误。

- [ ] **Step 3: 提交**

```bash
git add src/wxhl-003/store.ts
git commit -m "feat: add useCareerStore with two-round AI generation and localStorage persistence"
```

---

### Task 3: 在 App.vue 中添加职业规划视图

**Files:**
- Modify: `src/wxhl-003/App.vue`（加图标、career 视图模板、career 相关逻辑和样式）

**Interfaces:**
- Consumes: `useCareerStore` from `./store`
- Consumes: `CareerPlan` from `./data`

- [ ] **Step 1: 在桌面 app-grid 中添加第三个图标**

在模板中的 `.app-grid` div 内、`settings-icon` 之后追加：

```html
<div class="app-icon-wrapper" @click="openCareer"><div class="app-icon career-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg></div><span class="app-label">职业规划</span></div>
```

- [ ] **Step 2: 添加 career 视图状态变量**

在 `<script setup>` 中，紧挨着其他状态变量声明处追加：

```typescript
import { useCareerStore } from './store'
import { type CareerPlan } from './data'

const careerStore = useCareerStore()
const careerView = ref<'list' | 'detail'>('list')
const viewingPlan = ref<CareerPlan | null>(null)
const newPlanKeywords = ref('')
const showNewDialog = ref(false)
const deleteTargetId = ref(0)
```

- [ ] **Step 3: 添加 career 导航函数**

在 `<script setup>` 中，紧挨着现有的导航函数（`openForum`、`openSettings` 等）追加：

```typescript
function openCareer() { currentView.value = 'career'; careerView.value = 'list'; viewingPlan.value = null; careerStore.lastError = '' }
async function onNewPlan() {
  if (!newPlanKeywords.value.trim()) return
  showNewDialog.value = false
  await careerStore.createPlan(newPlanKeywords.value.trim())
  newPlanKeywords.value = ''
}
async function onConfirmPlan(plan: CareerPlan) { viewingPlan.value = plan; await careerStore.confirmPlan(plan.id) }
function onDeletePlan() {
  if (deleteTargetId.value) {
    careerStore.deletePlan(deleteTargetId.value)
    if (viewingPlan.value && viewingPlan.value.id === deleteTargetId.value) { viewingPlan.value = null; careerView.value = 'list' }
    deleteTargetId.value = 0
  }
}
```

- [ ] **Step 4: 添加 career 视图模板**

在模板中，紧挨着 `</div>`（`<!-- ============ SETTINGS SUB-PAGES ============ -->` 所有 `v-if="currentView==='settings'"` 块的结束标签之后、`</div></div></Transition>` 之前）插入以下 career 视图：

```html
<!-- ============ CAREER ============ -->
<!-- 新建方案对话框 -->
<div v-if="currentView==='career'&&showNewDialog" class="dialog-mask" @click.self="showNewDialog=false">
  <div class="dialog-box">
    <div class="dialog-title">新建职业方案</div>
    <textarea v-model="newPlanKeywords" class="dialog-input" placeholder="输入关键词或想法...&#10;例如：我想要一个暗杀型的职业，最好结合忍者元素..." rows="4"></textarea>
    <div class="dialog-btns">
      <button class="dialog-btn cancel" @click="showNewDialog=false">取消</button>
      <button class="dialog-btn confirm" @click="onNewPlan" :disabled="!newPlanKeywords.trim()||careerStore.generatingV1">{{ careerStore.generatingV1 ? '生成中...' : '生成方案' }}</button>
    </div>
  </div>
</div>

<!-- 删除确认对话框 -->
<div v-if="currentView==='career'&&deleteTargetId" class="dialog-mask" @click.self="deleteTargetId=0">
  <div class="dialog-box">
    <div class="dialog-title">确认删除</div>
    <div class="dialog-body">确定要删除这个职业方案吗？此操作不可撤销。</div>
    <div class="dialog-btns">
      <button class="dialog-btn cancel" @click="deleteTargetId=0">取消</button>
      <button class="dialog-btn danger" @click="onDeletePlan">删除</button>
    </div>
  </div>
</div>

<!-- 职业规划列表页 -->
<div v-if="currentView==='career'&&careerView==='list'" class="app-page">
  <div class="app-header"><button class="hdr-btn" @click="goDesktop"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button><span class="hdr-title">职业规划</span><span class="hdr-spacer"></span></div>

  <div v-if="careerStore.generatingV1" class="gen-overlay"><div class="gen-spinner"></div><span>AI 正在设计职业方案...</span></div>

  <template v-else>
    <div v-if="careerStore.lastError" class="refresh-err">{{ careerStore.lastError }} <button v-if="careerStore.generatingV1===false" class="retry-link" @click="showNewDialog=true">重试</button></div>

    <div v-if="careerStore.plans.length===0" class="empty-state">
      <div class="empty-icon">📋</div>
      <div class="empty-text">尚未创建职业方案</div>
      <div class="empty-sub">输入关键词或想法，让 AI 为你设计融合职业路线</div>
    </div>

    <div v-else class="scroll-area">
      <div v-for="p in careerStore.plans" :key="p.id" class="plan-card" @click="viewingPlan=p;careerView='detail'">
        <div class="pc-top">
          <span class="pc-name">{{ p.name }}</span>
          <span class="pc-rarity" :class="'rarity-'+p.rarity">{{ p.rarity }}</span>
        </div>
        <div class="pc-concept">{{ p.coreConcept }}</div>
        <div class="pc-meta">
          <span class="pc-tag">{{ p.keywords.slice(0, 40) }}{{ p.keywords.length > 40 ? '...' : '' }}</span>
          <span class="pc-time">{{ p.createdAt }}</span>
          <span v-if="p.phase==='v1'" class="pc-phase pending">未完成</span>
          <span v-else class="pc-phase done">已完成</span>
        </div>
      </div>
    </div>

    <div class="career-fab">
      <button class="fab-btn" @click="showNewDialog=true">＋ 新建方案</button>
    </div>
  </template>
</div>

<!-- 职业方案详情页 -->
<div v-if="currentView==='career'&&careerView==='detail'&&viewingPlan" class="app-page">
  <div class="app-header">
    <button class="hdr-btn" @click="careerView='list';viewingPlan=null"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 18 9 12 15 6"/></svg></button>
    <span class="hdr-title">{{ viewingPlan.name }}</span>
    <button class="hdr-btn del" @click="deleteTargetId=viewingPlan.id" title="删除方案"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></button>
  </div>

  <div v-if="careerStore.generatingV2" class="gen-overlay"><div class="gen-spinner"></div><span>AI 正在生成方案细节...</span></div>

  <template v-else>
    <div v-if="careerStore.lastError" class="refresh-err">{{ careerStore.lastError }}</div>

    <div class="scroll-area detail-scroll">
      <!-- 目标概览 -->
      <div class="detail-block">
        <div class="db-title"><span class="db-icon">🎯</span>目标概览</div>
        <div class="db-row"><span class="db-label">融合职业</span><span class="db-value">{{ viewingPlan.name }}</span></div>
        <div class="db-row"><span class="db-label">稀有度</span><span class="db-value rarity-badge" :class="'rarity-'+viewingPlan.rarity">{{ viewingPlan.rarity }}</span></div>
        <div class="db-row"><span class="db-label">核心定位</span><span class="db-value">{{ viewingPlan.coreConcept }}</span></div>
      </div>

      <!-- 主职业 -->
      <div class="detail-block">
        <div class="db-title"><span class="db-icon">⚔️</span>主职业（回廊原生）</div>
        <div class="db-row"><span class="db-label">职业名称</span><span class="db-value">{{ viewingPlan.mainJob.name }}</span></div>
        <div class="db-row"><span class="db-label">稀有度</span><span class="db-value">{{ viewingPlan.mainJob.rarity }}</span></div>
        <div class="db-row"><span class="db-label">属性倾向</span><span class="db-value">{{ viewingPlan.mainJob.attributeTendency }}</span></div>
        <div class="db-section"><span class="db-label">获取方式</span><div class="db-text">{{ viewingPlan.mainJob.acquisition }}</div></div>
        <div class="db-section"><span class="db-label">转职路线</span><div class="db-text">{{ viewingPlan.mainJob.classTree }}</div></div>
      </div>

      <!-- 副职业 -->
      <div class="detail-block">
        <div class="db-title"><span class="db-icon">🌍</span>副职业（副本职业）</div>
        <div class="db-row"><span class="db-label">职业名称</span><span class="db-value">{{ viewingPlan.subJob.name }}</span></div>
        <div class="db-row"><span class="db-label">稀有度</span><span class="db-value">{{ viewingPlan.subJob.rarity }}</span></div>
        <div class="db-row"><span class="db-label">来源世界</span><span class="db-value">{{ viewingPlan.subJob.world }}</span></div>
        <div class="db-row"><span class="db-label">属性倾向</span><span class="db-value">{{ viewingPlan.subJob.attributeTendency }}</span></div>
        <div class="db-section"><span class="db-label">获取方法</span><div class="db-text">{{ viewingPlan.subJob.acquisition }}</div></div>
        <div class="db-section"><span class="db-label">转职路线</span><div class="db-text">{{ viewingPlan.subJob.classTree }}</div></div>
      </div>

      <!-- 相性分析 -->
      <div class="detail-block">
        <div class="db-title"><span class="db-icon">🔗</span>相性分析</div>
        <div class="db-row"><span class="db-label">判定结果</span><span class="db-value affinity-high">{{ viewingPlan.affinity.result }}</span></div>
        <div class="db-section"><span class="db-label">判定理由</span><div class="db-text">{{ viewingPlan.affinity.reasons }}</div></div>
      </div>

      <!-- 进化路线 -->
      <div class="detail-block">
        <div class="db-title"><span class="db-icon">⬆️</span>进化路线图</div>
        <div class="db-section"><span class="db-label">一转</span><div class="db-text">{{ viewingPlan.evolution.firstClass }}</div></div>
        <div class="db-section"><span class="db-label">二转</span><div class="db-text">{{ viewingPlan.evolution.secondClass }}</div></div>
        <div class="db-section"><span class="db-label">三转</span><div class="db-text">{{ viewingPlan.evolution.thirdClass }}</div></div>
      </div>

      <!-- 第二轮细节（仅已完成方案显示） -->
      <template v-if="viewingPlan.phase==='complete'">
        <div class="detail-block">
          <div class="db-title"><span class="db-icon">📜</span>主职业技能树</div>
          <div class="db-text">{{ viewingPlan.mainSkillTree }}</div>
        </div>
        <div class="detail-block">
          <div class="db-title"><span class="db-icon">📜</span>副职业核心技能</div>
          <div class="db-text">{{ viewingPlan.subSkillTree }}</div>
        </div>
        <div class="detail-block">
          <div class="db-title"><span class="db-icon">✨</span>主职业被动特性</div>
          <div class="db-text">{{ viewingPlan.mainPassives }}</div>
        </div>
        <div class="detail-block">
          <div class="db-title"><span class="db-icon">✨</span>副职业被动特性</div>
          <div class="db-text">{{ viewingPlan.subPassives }}</div>
        </div>
        <div class="detail-block">
          <div class="db-title"><span class="db-icon">📊</span>融合后属性加成</div>
          <div class="db-text">{{ viewingPlan.combinedAttributes }}</div>
        </div>
        <div class="detail-block">
          <div class="db-title"><span class="db-icon">🛡️</span>装备适性</div>
          <div class="db-text">{{ viewingPlan.equipmentFit }}</div>
        </div>
        <div class="detail-block">
          <div class="db-title"><span class="db-icon">🗺️</span>分步获取指南</div>
          <div v-for="(step, si) in viewingPlan.stepGuide" :key="si" class="step-item"><span class="step-num">{{ si + 1 }}</span><span class="step-text">{{ step }}</span></div>
        </div>
        <div class="detail-block warning">
          <div class="db-title"><span class="db-icon">⚠️</span>风险提示</div>
          <div class="db-text">{{ viewingPlan.risks }}</div>
        </div>
      </template>

      <!-- 未完成方案：继续生成按钮 -->
      <div v-if="viewingPlan.phase==='v1'" class="detail-footer">
        <button class="confirm-btn" @click="onConfirmPlan(viewingPlan)" :disabled="careerStore.generatingV2">{{ careerStore.generatingV2 ? '生成中...' : '继续生成细节' }}</button>
        <div class="confirm-hint">当前仅有框架信息，点击上方按钮由 AI 补充完整技能树、属性、获取指南和风险提示</div>
      </div>
    </div>
  </template>
</div>
```

- [ ] **Step 5: 在 `<style scoped>` 末尾追加 career 相关样式**

在 `</style>` 关闭标签之前追加：

```scss
// ============ CAREER ICON ============
.career-icon{background:linear-gradient(135deg,#2a2010,#1a1008);border:1.5px solid rgba(200,180,100,0.25)}

// ============ DIALOG ============
.dialog-mask{position:absolute;inset:0;z-index:30;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center}
.dialog-box{width:88%;max-width:280px;background:linear-gradient(180deg,#201810,#14100a);border:1px solid rgba(140,100,40,0.35);border-radius:12px;padding:16px;box-shadow:0 20px 60px rgba(0,0,0,0.8)}
.dialog-title{font-size:13px;color:var(--amber);font-weight:600;margin-bottom:10px;letter-spacing:1px}
.dialog-body{font-size:11px;color:var(--chalk-d);margin-bottom:12px;line-height:1.5}
.dialog-input{width:100%;padding:10px;background:rgba(16,12,8,0.8);border:1px solid rgba(80,40,20,0.4);border-radius:8px;color:var(--chalk);font-size:11px;resize:none;outline:none;font-family:inherit;&::placeholder{color:var(--chalk-d);opacity:0.5}&:focus{border-color:rgba(180,40,40,0.5)}}
.dialog-btns{display:flex;gap:8px;margin-top:12px;justify-content:flex-end}
.dialog-btn{padding:7px 18px;border-radius:6px;font-size:11px;cursor:pointer;border:1px solid transparent;transition:all 0.2s;&.cancel{background:transparent;color:var(--chalk-d);border-color:rgba(80,40,20,0.3);&:hover{color:var(--chalk)}}&.confirm{background:rgba(180,40,40,0.2);border-color:rgba(180,40,40,0.4);color:var(--amber);&:hover{background:rgba(180,40,40,0.35)}&:disabled{opacity:0.3;cursor:default}}&.danger{background:rgba(180,40,40,0.3);border-color:rgba(180,40,40,0.5);color:#f06050;&:hover{background:rgba(180,40,40,0.5)}}}

// ============ CAREER LIST ============
.empty-state{flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:30px 20px;text-align:center}
.empty-icon{font-size:40px;margin-bottom:12px;opacity:0.6}
.empty-text{font-size:14px;color:var(--chalk);margin-bottom:6px;font-weight:500}
.empty-sub{font-size:11px;color:var(--chalk-d);line-height:1.5;max-width:240px}
.plan-card{padding:12px 14px;cursor:pointer;border-bottom:1px solid rgba(80,40,20,0.18);transition:background 0.1s;&:hover{background:rgba(255,255,255,0.03)}}
.pc-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:4px}
.pc-name{font-size:13px;color:var(--chalk);font-weight:600}
.pc-rarity{font-size:10px;padding:2px 8px;border-radius:4px;font-weight:500;&.rarity-白色{background:rgba(180,180,180,0.15);color:#c0c0c0}&.rarity-蓝色{background:rgba(80,140,220,0.15);color:#80b0e0}&.rarity-金色{background:rgba(240,200,40,0.15);color:#f0c028}&.rarity-紫色{background:rgba(160,80,220,0.15);color:#a050dc}&.rarity-银色{background:rgba(200,200,220,0.15);color:#c8c8dc}}
.pc-concept{font-size:11px;color:var(--chalk-d);margin-bottom:6px;line-height:1.4}
.pc-meta{display:flex;align-items:center;gap:8px;font-size:10px}
.pc-tag{color:var(--amber-d);background:rgba(240,208,128,0.08);padding:1px 6px;border-radius:3px;max-width:140px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.pc-time{color:var(--chalk-d);opacity:0.6}
.pc-phase{padding:1px 6px;border-radius:3px;&.pending{background:rgba(180,140,40,0.15);color:var(--amber-d)}&.done{background:rgba(40,140,80,0.12);color:#60d080}}
.career-fab{flex-shrink:0;padding:10px 14px;display:flex;justify-content:center}
.fab-btn{width:100%;padding:10px;background:rgba(180,40,40,0.15);border:1px solid rgba(180,40,40,0.35);color:var(--amber);font-size:13px;border-radius:8px;cursor:pointer;letter-spacing:1px;transition:all 0.2s;&:hover{background:rgba(180,40,40,0.28);border-color:rgba(180,40,40,0.5)}}

// ============ CAREER DETAIL ============
.detail-scroll{padding:8px 12px}
.detail-block{padding:12px;margin-bottom:10px;background:rgba(30,18,12,0.35);border:1px solid rgba(80,40,20,0.2);border-radius:10px;&.warning{background:rgba(180,40,40,0.08);border-color:rgba(180,40,40,0.3)}}
.db-title{font-size:12px;color:var(--amber);font-weight:600;margin-bottom:8px;display:flex;align-items:center;gap:6px}
.db-icon{font-size:14px}
.db-row{display:flex;justify-content:space-between;align-items:flex-start;padding:3px 0;font-size:11px;&+.db-row{border-top:1px solid rgba(80,40,20,0.1)}}
.db-label{color:var(--chalk-d);flex-shrink:0;margin-right:10px;min-width:50px}
.db-value{color:var(--chalk);text-align:right;line-height:1.4;word-break:break-word}
.db-section{padding:6px 0;&+.db-section{border-top:1px solid rgba(80,40,20,0.1)}.db-label{margin-bottom:4px;display:block;font-size:10px;color:var(--amber-d);letter-spacing:1px}}
.db-text{font-size:11px;color:var(--chalk);line-height:1.6;white-space:pre-wrap;word-break:break-word}
.rarity-badge{padding:1px 8px;border-radius:4px;font-weight:500;&.rarity-白色{background:rgba(180,180,180,0.15);color:#c0c0c0}&.rarity-蓝色{background:rgba(80,140,220,0.15);color:#80b0e0}&.rarity-金色{background:rgba(240,200,40,0.15);color:#f0c028}&.rarity-紫色{background:rgba(160,80,220,0.15);color:#a050dc}&.rarity-银色{background:rgba(200,200,220,0.15);color:#c8c8dc}}
.affinity-high{color:#60d080!important;font-weight:600}
.step-item{display:flex;gap:8px;padding:4px 0;align-items:flex-start;&+.step-item{border-top:1px solid rgba(80,40,20,0.1)}}
.step-num{width:20px;height:20px;flex-shrink:0;background:rgba(240,208,128,0.15);border:1px solid rgba(240,208,128,0.3);border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:10px;color:var(--amber);font-weight:600}
.step-text{font-size:11px;color:var(--chalk);line-height:1.5;flex:1}
.detail-footer{padding:16px 12px 24px;text-align:center}
.confirm-btn{width:100%;padding:12px;background:rgba(180,40,40,0.2);border:1px solid rgba(180,40,40,0.4);color:var(--amber);font-size:13px;border-radius:8px;cursor:pointer;letter-spacing:1px;transition:all 0.2s;&:hover{background:rgba(180,40,40,0.35)}&:disabled{opacity:0.3;cursor:default}}
.confirm-hint{font-size:10px;color:var(--chalk-d);margin-top:8px;opacity:0.6;line-height:1.4}
.hdr-btn.del{svg{color:rgba(200,80,60,0.7)}&:hover{background:rgba(180,40,40,0.2);svg{color:#f06050}}}
```

- [ ] **Step 6: 构建验证**

```bash
cd "C:/Users/zero/Downloads/tavern_helper-template-main" && pnpm build
```

预期：构建成功，整个项目无编译错误。

- [ ] **Step 7: 提交**

- [ ] **Step 8: 提交**

```bash
git add src/wxhl-003/App.vue
git commit -m "feat: add career planning view with list, detail, and create dialog"
```
