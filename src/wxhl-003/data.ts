// ================================================================
// 无限回廊 · 论坛数据
// ================================================================

export interface ForumPost {
  id: number
  floor: number
  author: string
  time: string
  content: string
  depth?: number  // 0=OP, 1=comment, 2=nested reply
}

export interface ForumThread {
  id: number
  title: string        // t
  preview: string      // p
  author: string       // a
  replies: number      // r
  time: string         // tm
  hotComment: string   // hc
  hotAuthor: string    // ha
  hotLikes: number     // hl
  section: string
  posts?: ForumPost[]
}

export interface RankItem {
  rank: string
  name: string
  lv: string
  team: string
}

export interface RankBoard {
  key: string
  title: string
  items: RankItem[]
}

// ============ 论坛分区 ============
export const SECTIONS: { key: string; label: string; icon: string }[] = [
  { key: 'complaints', label: '契约者吐槽区', icon: '💬' },
  { key: 'intel',     label: '势力情报分享区', icon: '🔍' },
  { key: 'dungeon',   label: '副本经历分享区', icon: '⚔️' },
  { key: 'build',     label: '构筑分享区', icon: '📐' },
  { key: 'trade',     label: '装备道具交易区', icon: '💰' },
  { key: 'rank',      label: '契约者排行榜', icon: '🏆' },
]

// ============ 初始帖子数据 ============
export const INITIAL_THREADS: ForumThread[] = [
  // ---- 契约者吐槽区 ----
  { id: 1, section:'complaints', title:'刚进准备区就被恶魔旅团三个二阶堵门收保护费',
    preview:'卡在传送门外不交50UP就威胁弄死你，特管局呢？', author:'血泪萌新', replies:247, time:'8分钟前',
    hotComment:'特管局不管一阶区，自求多福吧兄弟', hotAuthor:'过来人', hotLikes:89 },
  { id: 2, section:'complaints', title:'有人遇到过02号雌小鬼引导员吗',
    preview:'杂鱼杂鱼叫个不停，要不是主城禁武早把她头拧了', author:'碎骨者', replies:502, time:'1小时前',
    hotComment:'我觉得挺可爱的啊（小声）', hotAuthor:'匿名列兵', hotLikes:234 },
  { id: 3, section:'complaints', title:'医疗中心修断腿要100UP通关才拿180UP',
    preview:'这游戏是人玩的？我现在单腿跳着走', author:'断腿列兵', replies:156, time:'3小时前',
    hotComment:'找方舟集团外勤买黑市接骨药水只要40UP', hotAuthor:'省钱达人', hotLikes:312 },
  { id: 4, section:'complaints', title:'第一次进副本就是血腥世界的来报到',
    preview:'开局被三个老哥围着砍，没看清主线任务是什么', author:'已故的张三', replies:1204, time:'5小时前',
    hotComment:'血腥世界概率只有5%你运气真好（反话）', hotAuthor:'幸存者老王', hotLikes:567 },
  { id: 5, section:'complaints', title:'恶魔旅团的保护费从30%涨到50%了',
    preview:'这赛季他们疯了吗，一阶区快没活人了', author:'愤怒的韭菜', replies:389, time:'6小时前',
    hotComment:'上赛季有猛人把收费的打进医疗中心，第二天被六个人堵厕所', hotAuthor:'吃瓜群众', hotLikes:445 },
  { id: 6, section:'complaints', title:'求问回廊主城哪里能洗澡',
    preview:'引导结束后浑身粘液感受不了了', author:'洁癖患者', replies:67, time:'8小时前',
    hotComment:'广场西侧公共浴场免费的，但是混浴', hotAuthor:'热心市民', hotLikes:78 },
  { id: 7, section:'complaints', title:'回廊的食物为什么吃起来没有味道',
    preview:'明明看着像正常饭菜但是咬下去跟嚼纸一样', author:'美食绝望者', replies:134, time:'10小时前',
    hotComment:'回廊不提供真正的食物，那只是维持生命的能量块伪装', hotAuthor:'老人', hotLikes:201 },
  { id: 8, section:'complaints', title:'有没有人和我一样死过一次才来的回廊',
    preview:'我记得自己明明被车撞了，醒来就在这里了', author:'困惑新人', replies:892, time:'12小时前',
    hotComment:'所有人都是这样来的，别想了，想多了会疯', hotAuthor:'三年老兵', hotLikes:634 },
  { id: 9, section:'complaints', title:'主城禁武规则真的绝对吗',
    preview:'看到恶魔旅团的人在主城嚣张我就来气', author:'愤怒的拳头', replies:234, time:'14小时前',
    hotComment:'绝对的，有人试过拔刀0.01秒就被弹飞出主城了', hotAuthor:'亲眼见证者', hotLikes:345 },
  { id: 10, section:'complaints', title:'01号大姐姐引导员好温柔啊',
    preview:'耐心给我讲了两个小时规则还送了我一瓶治疗药剂', author:'幸福萌新', replies:78, time:'16小时前',
    hotComment:'等你进了副本就知道这温柔值多少钱了', hotAuthor:'过来人', hotLikes:123 },

  // ---- 势力情报分享区 ----
  { id: 11, section:'intel', title:'一阶新人必看：CR3.0观察态度下敌人强化实测',
    preview:'基准等级+1不是开玩笑，杂兵都比你高一级', author:'退役指导员', replies:89, time:'1小时前',
    hotComment:'我CR4.0了还没死，是不是该骄傲一下', hotAuthor:'作死选手', hotLikes:56 },
  { id: 12, section:'intel', title:'恶魔旅团收保护费的固定时间段整理',
    preview:'凌晨2点到6点他们不在，趁这时候出门', author:'匿名好心人', replies:312, time:'4小时前',
    hotComment:'谢谢你救了我的命和钱包', hotAuthor:'感恩的新人', hotLikes:201 },
  { id: 13, section:'intel', title:'特管局基础合作待遇一览',
    preview:'挂名不收费，完成任务有额外UP补贴', author:'编制党', replies:167, time:'6小时前',
    hotComment:'挂名容易转正难，正式编制要连续三个B级以上', hotAuthor:'内部人士', hotLikes:134 },
  { id: 14, section:'intel', title:'方舟集团情报贩子价目表（非官方整理）',
    preview:'基础副本情报50UP，详细攻略200UP，隐藏任务线索500UP起', author:'情报贩子K', replies:245, time:'8小时前',
    hotComment:'花了500UP买的线索是一句谜语，血亏', hotAuthor:'冤大头', hotLikes:189 },
  { id: 15, section:'intel', title:'神圣教会在一阶区公开招募信徒',
    preview:'宣誓信仰给白色防具一套加50UP启动资金', author:'传教观察员', replies:178, time:'10小时前',
    hotComment:'代价是进副本得优先完成教会附加任务，不划算', hotAuthor:'前信徒', hotLikes:156 },
  { id: 16, section:'intel', title:'生化危机副本暴君实测防御值超过15',
    preview:'普通手枪基本刮痧，建议蓝色以上武器', author:'探索者Alpha', replies:134, time:'12小时前',
    hotComment:'我用白色短刀捅暴君三十刀造成0点伤害（含泪）', hotAuthor:'近战受害者', hotLikes:223 },
  { id: 17, section:'intel', title:'瑞辰基金会的资助合同暗藏陷阱',
    preview:'签了之后副本收益要上缴40%，合同期三个赛季', author:'法律顾问', replies:267, time:'14小时前',
    hotComment:'但是他们给的启动资金确实多，看个人取舍吧', hotAuthor:'受资助者', hotLikes:178 },
  { id: 18, section:'intel', title:'零号局的人进副本后行事风格极其冷酷',
    preview:'遇到他们千万别挡路，他们不介意顺手解决障碍', author:'幸存者', replies:345, time:'1天前',
    hotComment:'俄罗斯人打仗不讲武德这我早就知道了', hotAuthor:'常识人', hotLikes:289 },

  // ---- 副本经历分享区 ----
  { id: 19, section:'dungeon', title:'从咒术回战活着回来了',
    preview:'诅咒师领域展开困住差点当场暴毙，太恶心了', author:'幸存者', replies:178, time:'20分钟前',
    hotComment:'咒术回战出的技能卷轴品质贼高，值得冒险', hotAuthor:'赏金猎人', hotLikes:98 },
  { id: 20, section:'dungeon', title:'电锯人副本恶魔掉落的钥匙品质出奇的高',
    preview:'打了一个精英恶魔开出蓝色武器，血赚', author:'赏金猎人', replies:95, time:'2小时前',
    hotComment:'那个副本恶魔攻击欲望极强，不给你喘息时间', hotAuthor:'探索者Beta', hotLikes:67 },
  { id: 21, section:'dungeon', title:'葬送的芙莉莲副本魔族精英太难打',
    preview:'智商碾压型敌人，会预判你的预判', author:'魔法白痴', replies:134, time:'5小时前',
    hotComment:'那个副本适合PER高的玩家，纯近战去了就是送', hotAuthor:'法术流玩家', hotLikes:112 },
  { id: 22, section:'dungeon', title:'生化危机副本S级通关心得',
    preview:'关键是找到暴君行动规律，避开正面硬刚', author:'策略大师', replies:267, time:'8小时前',
    hotComment:'说得轻巧，暴君追人时我脑子一片空白', hotAuthor:'恐惧症患者', hotLikes:189 },
  { id: 23, section:'dungeon', title:'进了火影忍者副本遇到中忍考试',
    preview:'和原著NPC一起考试，差点被大蛇丸团灭', author:'幸运儿', replies:445, time:'10小时前',
    hotComment:'大蛇丸是固有角色吧？你疯了敢靠近他', hotAuthor:'常识人', hotLikes:334 },
  { id: 24, section:'dungeon', title:'鬼灭之刃副本鬼的再生能力太恶心',
    preview:'砍了十几刀白砍，必须用日轮刀', author:'砍刀哥', replies:89, time:'14小时前',
    hotComment:'副本里从刀匠那接支线获取日轮刀，别傻乎乎自己砍', hotAuthor:'攻略组', hotLikes:156 },
  { id: 25, section:'dungeon', title:'进了东京喰种副本差点被当食物',
    preview:'开局就被A级喰种盯上了，跑了三条街才甩掉', author:'腿软的人', replies:312, time:'1天前',
    hotComment:'那个副本最好带穿甲弹，普通子弹打不穿赫子', hotAuthor:'武器专家', hotLikes:234 },
  { id: 26, section:'dungeon', title:'一人之下副本的异人体系可以学',
    preview:'完成特定支线能获得炁体源流相关的副本职业', author:'东方爱好者', replies:567, time:'1天前',
    hotComment:'但是副本里全性真人太恶心了，固有角色别惹', hotAuthor:'前车之鉴', hotLikes:445 },

  // ---- 构筑分享区 ----
  { id: 27, section:'build', title:'一阶纯STR近战流心得',
    preview:'前期伤害高但脆，CON至少拉到8保命', author:'力量白痴', replies:56, time:'4小时前',
    hotComment:'STR10力量极限拳王，打杂兵一拳一个真爽', hotAuthor:'暴力美学', hotLikes:45 },
  { id: 28, section:'build', title:'AGI暗杀流暴击范围扩展机制实测',
    preview:'AGI拉到12暴击范围扩展到自然17，太香了', author:'影子', replies:201, time:'1天前',
    hotComment:'AGI流前期脆后期神，熬过前三个副本就起飞', hotAuthor:'毕业玩家', hotLikes:178 },
  { id: 29, section:'build', title:'PER法术流开荒前三个副本很痛苦但后期碾压',
    preview:'没有好技能卷轴之前就是废物，成型后无敌', author:'魔法信徒', replies:134, time:'1天前',
    hotComment:'好的法术技能卷轴太贵了，蓝色的要300UP起', hotAuthor:'穷鬼法师', hotLikes:89 },
  { id: 30, section:'build', title:'CON肉盾流可行性分析',
    preview:'不会死但也杀不了人，适合组队当前排', author:'铁壁', replies:78, time:'2天前',
    hotComment:'肉盾流在淘汰赛里很强，耗死所有人就赢了', hotAuthor:'战术家', hotLikes:67 },
  { id: 31, section:'build', title:'均衡流千万别玩',
    preview:'什么都会一点什么都不精，打谁都打不过', author:'后悔的均衡人', replies:312, time:'2天前',
    hotComment:'均衡流唯一优势是不会被针对，但没有爆发力', hotAuthor:'分析师', hotLikes:234 },
  { id: 32, section:'build', title:'双修流STR+PER实测',
    preview:'近战法术切换打副本舒服但属性点不够用', author:'双修玩家', replies:45, time:'3天前',
    hotComment:'一阶只有35点总属性（含初始20），双修摊太薄了', hotAuthor:'数据党', hotLikes:56 },
  { id: 33, section:'build', title:'AGI+CON生存流适合solo玩家',
    preview:'打不死人但也死不了，适合稳扎稳打慢慢通关', author:'乌龟玩家', replies:89, time:'3天前',
    hotComment:'这个流派淘汰赛里不行，最后缩圈你输出不够', hotAuthor:'淘汰赛选手', hotLikes:67 },
  { id: 34, section:'build', title:'纯PER玻璃炮到底能不能玩',
    preview:'伤害确实爆炸但被碰一下就半血，心态炸了', author:'碎玻璃', replies:156, time:'4天前',
    hotComment:'带个肉盾队友就行了，solo别玩纯PER', hotAuthor:'组队党', hotLikes:112 },

  // ---- 装备道具交易区 ----
  { id: 35, section:'trade', title:'出蓝色一阶长剑强化+3',
    preview:'STR主属性加成8，副属性AGI加成3，伤害骰1d8，开价180UP', author:'卖剑书生', replies:12, time:'20分钟前',
    hotComment:'150UP收，多了不要', hotAuthor:'砍价王', hotLikes:3 },
  { id: 36, section:'trade', title:'收购基础治疗药剂×5',
    preview:'下个副本马上开了没囤够药，15UP一瓶有的私聊', author:'急需补给', replies:8, time:'45分钟前',
    hotComment:'广场东侧杂货铺10UP一瓶，你被坑了兄弟', hotAuthor:'好心人', hotLikes:12 },
  { id: 37, section:'trade', title:'白色基础职业书「剑士」转让150UP',
    preview:'职业馆买200UP的，后来开到蓝色的了', author:'换职业了', replies:23, time:'2小时前',
    hotComment:'白色职业书只展开1层转职树，性价比一般', hotAuthor:'职业研究者', hotLikes:18 },
  { id: 38, section:'trade', title:'出白色轻甲套装（躯干+腿部）打包100UP',
    preview:'防御加成各3，闪避各+2，适合AGI流新人', author:'毕业换代', replies:34, time:'4小时前',
    hotComment:'这价格良心了，单件杂货铺要70UP', hotAuthor:'装备鉴定师', hotLikes:28 },
  { id: 39, section:'trade', title:'收一阶蓝色匕首AGI主属性',
    preview:'出价250UP有货私聊，急', author:'影子玩家', replies:5, time:'6小时前',
    hotComment:'蓝色匕首行情300UP以上，250难收到', hotAuthor:'市场分析', hotLikes:8 },
  { id: 40, section:'trade', title:'出售副本掉落白色钥匙×3',
    preview:'每把20UP，杂兵掉的，开出来大概率白色制式装备', author:'清仓甩卖', replies:15, time:'8小时前',
    hotComment:'钥匙不是绑定的吗还能交易？', hotAuthor:'困惑新人', hotLikes:34 },
  { id: 41, section:'trade', title:'收蓝色一阶法杖PER主属性',
    preview:'出300UP，品相好可加价，法术流急需', author:'穷鬼法师', replies:7, time:'10小时前',
    hotComment:'蓝色法杖比近战武器稀有，350UP才是正常价', hotAuthor:'装备贩子', hotLikes:12 },
  { id: 42, section:'trade', title:'出金色一阶护符，副本BOSS掉的',
    preview:'CON主属性加成12，附带每回合恢复3HP效果，开价700UP', author:'欧皇', replies:89, time:'12小时前',
    hotComment:'金色一阶？你是怎么在一阶打出金色钥匙的', hotAuthor:'震惊群众', hotLikes:234 },
]

// ============ 排行榜数据 ============
export const RANK_BOARDS: RankBoard[] = [
  {
    key: '人榜', title: '人榜（一阶 Lv.1~20）· 第21赛季',
    items: [
      { rank:'1', name:'「无距之刃」', lv:'20', team:'特管局' },
      { rank:'2', name:'「镀金笼」', lv:'20', team:'APJC' },
      { rank:'3', name:'「试剂品」', lv:'20', team:'瑞辰基金会' },
      { rank:'4', name:'「红线瞄准」', lv:'20', team:'OETA' },
      { rank:'5', name:'「殉道之焰」', lv:'20', team:'神圣教会' },
      { rank:'6', name:'「碎齿」', lv:'20', team:'恶魔旅团' },
      { rank:'7', name:'「毒牙」', lv:'18', team:'恶魔旅团' },
      { rank:'8', name:'「肉盾」', lv:'17', team:'恶魔旅团' },
      { rank:'9', name:'「催债人」', lv:'16', team:'恶魔旅团' },
      { rank:'10', name:'「走狗」', lv:'15', team:'恶魔旅团' },
    ],
  },
  {
    key: '黄榜', title: '黄榜（二阶 Lv.21~40）· 第21赛季',
    items: [
      { rank:'1', name:'「超新星」', lv:'40', team:'OETA' },
      { rank:'2', name:'「红色绞肉机」', lv:'40', team:'零号局' },
      { rank:'3', name:'「寸劲」', lv:'40', team:'特管局' },
      { rank:'4', name:'「公式解」', lv:'40', team:'EJSSA' },
      { rank:'5', name:'「潜行者」', lv:'40', team:'方舟集团' },
      { rank:'6', name:'「噬魂」', lv:'34', team:'恶魔旅团' },
      { rank:'7', name:'「铁蹄」', lv:'33', team:'恶魔旅团' },
      { rank:'8', name:'「蛛网」', lv:'32', team:'恶魔旅团' },
      { rank:'9', name:'「裂地」', lv:'31', team:'恶魔旅团' },
      { rank:'10', name:'「血债」', lv:'30', team:'恶魔旅团' },
    ],
  },
  {
    key: '玄榜', title: '玄榜（三阶 Lv.41~60）· 第21赛季',
    items: [
      { rank:'1', name:'「雷切」', lv:'60', team:'APJC' },
      { rank:'2', name:'「黄金猎犬」', lv:'60', team:'瑞辰基金会' },
      { rank:'3', name:'「暴风突击」', lv:'60', team:'OETA' },
      { rank:'4', name:'「铁壁」', lv:'60', team:'特管局' },
      { rank:'5', name:'「圣盾之矛」', lv:'60', team:'神圣教会' },
      { rank:'6', name:'「屠夫」', lv:'60', team:'恶魔旅团' },
      { rank:'7', name:'「锁链」', lv:'60', team:'恶魔旅团' },
      { rank:'8', name:'「腐蚀」', lv:'60', team:'恶魔旅团' },
      { rank:'9', name:'「碎骨」', lv:'59', team:'恶魔旅团' },
      { rank:'10', name:'「暗刺」', lv:'58', team:'恶魔旅团' },
    ],
  },
  {
    key: '地榜', title: '地榜（四阶 Lv.61~80）· 第21赛季',
    items: [
      { rank:'1', name:'「铁幕先驱」', lv:'80', team:'OETA' },
      { rank:'2', name:'「白骨沙皇」', lv:'80', team:'零号局' },
      { rank:'3', name:'「无声令」', lv:'80', team:'特管局' },
      { rank:'4', name:'「一刀两断」', lv:'80', team:'APJC' },
      { rank:'5', name:'「灰烬审判」', lv:'80', team:'神圣教会' },
      { rank:'6', name:'「献祭之犬」', lv:'80', team:'恶魔旅团' },
      { rank:'7', name:'「血色合同」', lv:'80', team:'瑞辰基金会' },
      { rank:'8', name:'「千面行者」', lv:'80', team:'独立散人' },
      { rank:'9', name:'「临界观测」', lv:'78', team:'EJSSA' },
      { rank:'10', name:'「方舟守门人」', lv:'77', team:'方舟集团' },
    ],
  },
  {
    key: '天榜', title: '天榜（五阶 Lv.81~100）· 第21赛季',
    items: [
      { rank:'1', name:'「天榜之首·执剑镇国」', lv:'100', team:'特管局' },
      { rank:'2', name:'「机械之神」', lv:'100', team:'OETA' },
      { rank:'3', name:'「永夜真祖」', lv:'100', team:'瑞辰基金会' },
      { rank:'4', name:'「根源窥视者」', lv:'100', team:'EJSSA' },
      { rank:'5', name:'「绝对零度」', lv:'100', team:'零号局' },
      { rank:'6', name:'「忍术之神」', lv:'100', team:'APJC' },
      { rank:'7', name:'「圣裁之翼」', lv:'100', team:'神圣教会' },
      { rank:'8', name:'「堕落晨星」', lv:'100', team:'恶魔旅团' },
      { rank:'9', name:'「病毒君王」', lv:'99', team:'方舟集团' },
      { rank:'10', name:'「征服者」', lv:'99', team:'非盟特委会' },
    ],
  },
]

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

/** 统一的方案类型 */
export type PlanType = 'fusion' | 'roadmap'

/** 基于现有职业的生涯规划方案 */
export interface CareerRoadmap {
  id: number
  createdAt: string
  keywords: string
  phase: 'v1' | 'complete'
  planType: 'roadmap'

  // === 第一轮：框架 ===
  title: string
  currentState: string
  recommendedDirection: string
  targetWorlds: string[]
  fusionAdvice: string
  evolutionPath: string

  // === 第二轮：细节 ===
  stepPlan?: string[]
  skillAdvice?: string
  equipmentAdvice?: string
  risks?: string
}

/** 阵营偏向 */
export type Faction = '正道' | '邪道' | '中立'

/** 攻略模式 */
export type DungeonMode = 'goal' | 'speedrun' | 'perfect' | 'deep' | 'fun'

/** 副本攻略方案 */
export interface DungeonStrategy {
  id: number
  createdAt: string
  phase: 'v1' | 'complete'

  // 输入条件
  faction: Faction
  mode: DungeonMode
  playerGoal: string

  // === 第一轮：框架 ===
  dungeonName: string
  routeOverview: string
  questExecution: string
  achievementPlan: string
  hiddenQuestStrategy: string

  // === 第二轮：细节 ===
  stepPlan?: string[]
  combatAdvice?: string
  resourceAdvice?: string
  risks?: string
}

/** 攻略模式显示信息 */
export const DUNGEON_MODES: { key: DungeonMode; label: string; icon: string; desc: string }[] = [
  { key: 'speedrun', label: '速通', icon: '⚡', desc: '最快通关主线和支线' },
  { key: 'perfect', label: '完美通关', icon: '🌟', desc: '完成主线、支线、隐藏任务和全部成就' },
  { key: 'deep', label: '深度挖掘', icon: '⛏️', desc: '挖掘隐藏力量、道具，面对隐藏BOSS，介入世界事件' },
  { key: 'fun', label: '搞耍', icon: '🎭', desc: '乐子人玩法' },
]

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
