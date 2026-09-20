/* wxhl-002 论坛静态数据 · 百度贴吧风格 · 字段内容不含竖线 | */
export const BOARD_NAMES = ['人榜','黄榜','玄榜','地榜','天榜']
export function randomBoardName(){return BOARD_NAMES[Math.floor(Math.random()*BOARD_NAMES.length)]}

export interface ForumPost {
  title:string; preview:string; author:string; replies:number; time:string
  hotComment:{content:string; author:string; likes:number}
}
export interface LeaderboardEntry {rank:number; title:string; level:number; team:string}
export interface ForumSection {
  id:string; name:string; icon:string; posts:ForumPost[]
  leaderboard?:{name:string; entries:LeaderboardEntry[]}
}

export const forumSections:ForumSection[]=[
{id:'tucao',name:'契约者吐槽区',icon:'💬',posts:[
  {title:'刚完成第三次副本，系统你是认真的吗',preview:'第三个副本就给我排了B级难度，差点交代在里面。队友还挂机，我一个人扛到最后，结算给了个破烂技能',author:'倒霉蛋一号',replies:234,time:'2小时前',hotComment:{content:'才B级就受不了了，等你到A级就知道什么叫真正的绝望。不过队友挂机确实恶心，建议拉黑',author:'老契约者',likes:892}},
  {title:'吐槽一下装备强化的概率，13上14碎了七次',preview:'攒了一个月的强化材料全搭进去了，碎到我怀疑人生。系统这个概率绝对是假的，我怀疑有暗改',author:'强化穷三代',replies:567,time:'5小时前',hotComment:{content:'七次算少的了，我上15碎了二十三次。建议直接用保护卷，别头铁。老哥稳住心态最重要',author:'氪佬不氪金',likes:1203}},
  {title:'今天匹配到的路人队友，打完我直接删游戏',preview:'A级副本匹配到一个全程摸鱼的，打BOSS还在看风景。输出占比百分之三，还好意思舔着脸要装备',author:'血压拉满',replies:891,time:'8小时前',hotComment:{content:'建议组固定队，路人匹配就是开盲盒。我们公会现在招人，副本稳定通关，有意私聊',author:'公会招人部',likes:445}},
  {title:'系统商城能不能上架点有用的东西',preview:'打开商城全是时装和表情包，战斗道具就那么几个。我想要点实用的消耗品，策划能不能看看玩家的需求',author:'实用主义者',replies:178,time:'12小时前',hotComment:{content:'时装怎么了，穿得好看也是实力的一部分。不过确实该加点功能性道具，比如复活币之类的',author:'外观党永不为奴',likes:567}},
  {title:'连续三周没抽到新技能了，这池子有保底吗',preview:'存了两万结晶全抽了，结果全是重复的。这抽卡系统到底有没有隐藏保底机制，感觉比手游还坑',author:'非酋代表',replies:432,time:'1天前',hotComment:{content:'有保底的，每九十抽必出S。但S里面还有细分，想抽到想要的技能确实看脸。建议存到保底再抽',author:'数据分析师',likes:987}},
  {title:'副本结算动画能不能加个跳过按钮',preview:'每次通关看完五分钟的结算动画，刷低级副本的时候简直折磨。建议加个跳过或者至少倍速播放',author:'分秒必争',replies:345,time:'1天前',hotComment:{content:'同意，特别是刷材料的时候重复看几十遍。官方论坛有人提过这个建议，据说下个版本会改',author:'情报搬运工',likes:678}},
  {title:'萌新求问，第一桶金怎么赚比较快',preview:'刚入坑三天，感觉什么都买不起。大佬们有没有什么快速赚钱的方法，除了氪金之外的',author:'贫穷萌新',replies:156,time:'2天前',hotComment:{content:'每天把日常和周长清完，低级材料挂交易行。控制住别乱强化，两周就能攒够启动资金了',author:'精打细算',likes:1123}},
]},
{id:'intel',name:'势力情报分享区',icon:'🔍',posts:[
  {title:'暗夜之刃公会昨晚拿下了第七区域控制权',preview:'据可靠消息，暗刃公会在昨晚的区域战中击败了连续守擂三周的血月联盟，成为第七区域的新霸主',author:'战地记者007',replies:678,time:'1小时前',hotComment:{content:'血月终于倒了，他们会长太狂妄了，树敌无数。暗刃这次组织得很好，恭喜',author:'吃瓜群众甲',likes:1456}},
  {title:'第三区域出现新的隐藏副本入口，坐标已确认',preview:'有人在第三区域的废弃工厂后面发现了新的空间裂隙，推测是隐藏副本的入口。目前还没有队伍成功通关',author:'探索者联盟',replies:892,time:'4小时前',hotComment:{content:'坐标收下了，今晚就带队伍去看。不过建议大家至少B级装备再去，裂隙周围的怪物等级很高',author:'先驱者',likes:723}},
  {title:'天启教团内部疑似分裂，副团长带人出走',preview:'天启教团最近几天内部气氛很诡异，副团长带走了大约三分之一的精英成员。具体原因还在打探',author:'内线消息',replies:1023,time:'6小时前',hotComment:{content:'分得好，天启教团的资源分配本来就不公平，高级成员吃独食太久了。出走这批人实力不弱',author:'知情人士',likes:1890}},
  {title:'各区势力分布图更新至第二十六期',preview:'花了一周时间整理的最新势力分布图，包括各区域的公会排名、活跃人数和近期动向。仅供参考',author:'制图师老王',replies:567,time:'10小时前',hotComment:{content:'老王出品必属精品，已经收藏了。这几个新冒出来的中小公会值得关注，潜力很大',author:'战略观察员',likes:834}},
  {title:'血月联盟正在招募新成员，待遇全面提升',preview:'丢了第七区域之后血月开始大规模招新，入会就送一套B级装备和技能书。不知道能不能东山再起',author:'血月HR',replies:456,time:'15小时前',hotComment:{content:'送B级装备确实香，但血月的问题不是人不够，是管理层太混乱。新人进去就是当炮灰',author:'过来人',likes:567}},
  {title:'即将到来的公会联赛规则有重大变化',preview:'下赛季公会联赛将从单败淘汰改为双败制，而且加入了禁用技能的机制。各公会现在都在调整战术',author:'赛事观察',replies:789,time:'1天前',hotComment:{content:'双败制对整体实力强的公会有利，不会因为一场意外就出局。禁用技能这个变化很大',author:'战术分析师',likes:1234}},
]},
{id:'dungeon',name:'副本经历分享区',icon:'⚔️',posts:[
  {title:'S级副本「深渊回廊」首通攻略，附完整配队思路',preview:'昨天终于和固定队拿下了深渊回廊的首通。这个副本的机制非常复杂，尤其是第三阶段的分身处理',author:'攻略组组长',replies:1234,time:'30分钟前',hotComment:{content:'太强了，我们卡在第二阶段三天了。按照你的配队思路调整了一下阵容，今晚感觉能过',author:'卡关者',likes:2345}},
  {title:'记录一次离谱的翻车：BOSS剩百分之一血团灭',preview:'打A级副本最终BOSS，全队满状态进P3，结果奶妈被点名秒了，然后连锁反应全倒了',author:'心态崩了',replies:456,time:'3小时前',hotComment:{content:'百分之一血的绝望我太懂了。建议带两个奶妈，容错率高很多。DPS少一点总比团灭强',author:'稳如老狗',likes:678}},
  {title:'单人通关B级副本「迷雾森林」的无伤心得',preview:'摸索了一周终于找到了一套无伤打法。核心是利用地形卡位，配合远程消耗。适合装备一般的玩家',author:'独狼玩家',replies:345,time:'7小时前',hotComment:{content:'独狼之光，看了你的视频学到了很多走位细节。可惜我没有你的耐心，还是喜欢莽',author:'莽夫一号',likes:456}},
  {title:'关于隐藏BOSS「时空旅人」的触发条件猜测',preview:'在第五区域副本中偶然触发了一个隐藏BOSS，但是没打过。复盘了一下可能的触发条件和打法',author:'解谜爱好者',replies:678,time:'9小时前',hotComment:{content:'我猜需要在限定时间内无伤通过前面三个房间。有谁验证过的麻烦回复一下',author:'理论家',likes:567}},
  {title:'C级到B级的过渡期怎么度过，卡瓶颈了',preview:'目前装备全C级加十左右，B级副本打不过，C级又觉得没收益。这个瓶颈期大家都是怎么度过的',author:'瓶颈中',replies:234,time:'14小时前',hotComment:{content:'建议先把武器和衣服升满，然后找一个靠谱的B级队伍带飞。或者先靠日常周常攒材料',author:'过渡期过来人',likes:890}},
  {title:'新出的限时副本奖励太香了，但难度也离谱',preview:'限时副本的限定奖励确实诱人，但第三个BOSS的设计太阴间了。全屏AOE加持续掉血，没有顶级奶过不去',author:'又爱又恨',replies:567,time:'2天前',hotComment:{content:'限时副本本来就是给毕业队伍打的。平民玩家建议量力而行，别上头浪费复活币',author:'理性消费',likes:345}},
]},
{id:'build',name:'构筑分享区',icon:'📐',posts:[
  {title:'版本答案：血牛反伤流构筑详解，S级副本实测',preview:'经过三个版本的迭代，血牛反伤流终于成型了。核心思路是堆叠最大生命值和反伤比例，配合生命偷取',author:'构筑鬼才',replies:1567,time:'2小时前',hotComment:{content:'抄了你的构筑，感觉确实很稳。不过我稍微改了一下技能搭配，把铁壁换成了荆棘光环',author:'改改党',likes:2345}},
  {title:'冰火双修法师的最新配装思路，DPS突破天花板',preview:'传统的法师要么走冰要么走火，但双修能吃到更多的增伤乘区。核心装备是冰火融合法杖和元素共鸣戒指',author:'法神降临',replies:890,time:'6小时前',hotComment:{content:'双修的问题是技能点不够用，前期太弱了。不过成型之后伤害确实爆炸，我亲眼见过',author:'理性讨论',likes:678}},
  {title:'辅助流构筑推荐：让你的队友打出三倍伤害',preview:'很多人忽视辅助的潜力。这套纯辅助构筑能为队伍提供百分之两百的伤害加成和全程免控',author:'辅助也有春天',replies:678,time:'11小时前',hotComment:{content:'终于有人重视辅助了。每次匹配队伍都没人愿意玩辅助，但辅助其实是队伍的发动机',author:'辅助本命',likes:1234}},
  {title:'暴击流和攻速流的数学对比，用数据说话',preview:'花了三天时间建立了一个伤害模型，对比了暴击流和攻速流在不同装备阶段的期望输出',author:'数学系契约者',replies:1023,time:'1天前',hotComment:{content:'看完你的模型我决定从攻速流转暴击流了。不过攻速流手感好，PvP可能还是更灵活',author:'实战派',likes:890}},
  {title:'低配版毕业构筑：全B级装备也能打出A级输出',preview:'给预算有限的玩家准备的构筑方案。所有装备都是可交易的B级，技能也是相对容易获得的',author:'贫民窟战神',replies:1234,time:'1天前',hotComment:{content:'这才是真正有用的攻略，不是每个人都能凑齐S级装备。已经推荐给公会新人了',author:'公会导师',likes:3456}},
  {title:'版本更新后我的刺客构筑从T0掉到了T3，求改进建议',preview:'上次更新把暗杀者的核心被动砍了百分之三十，现在输出完全不够看了。求刺客大佬指点新的构筑方向',author:'受伤的刺客',replies:567,time:'2天前',hotComment:{content:'刺客现在确实不好混，建议暂时转职或者换个流派。等官方回调不知道要等到什么时候',author:'职业摇摆人',likes:456}},
]},
{id:'trade',name:'装备道具交易区',icon:'💰',posts:[
  {title:'出A级法杖「星辰陨落」，满强化满附魔，价格可议',preview:'因为转了物理流派，这把跟了我两个月的法杖要出手了。强化加十五，附魔三级法术穿透',author:'转职中',replies:234,time:'1小时前',hotComment:{content:'好东西，私聊你了。按照当前市场价的话大概八万结晶左右，坐等回复',author:'估价师',likes:123}},
  {title:'收大量B级强化石，高于市场价百分之五回收',preview:'为了冲击十五强化收材料。B级强化石有多少要多少，量大还可议价。长期合作优先',author:'强化狂魔',replies:456,time:'4小时前',hotComment:{content:'老哥稳，上次卖给你很爽快。这次攒了一大波，晚上交易窗口见',author:'材料供应商',likes:234}},
  {title:'出稀有技能书「次元斩」，换「时空裂隙」或等价物',preview:'这张次元斩技能书是从S级副本里掉落的，不打算卖结晶，想换一张同等级的时空系技能书',author:'以物易物',replies:345,time:'7小时前',hotComment:{content:'我有时空裂隙，加你私聊了。不过次元斩最近价格在跌，可能得补一点差价',author:'时空系玩家',likes:156}},
  {title:'大量出售高级恢复药水和解毒剂，副本必备',preview:'自己练的炼金术，品质有保证。高级恢复药水现做现卖，买十送一，老顾客八折优惠',author:'炼金术士',replies:567,time:'9小时前',hotComment:{content:'用了两周了，品质确实好，比商城的性价比高多了。群里的兄弟都在这买',author:'回头客',likes:678}},
  {title:'收一个满级的「守护之盾」技能，不看品质',preview:'急需一个守护之盾技能给队伍的坦克用。不看品质不看等级，只要技能效果在就行',author:'队长本队',replies:123,time:'13小时前',hotComment:{content:'守护之盾现在很难收，大家都在等新副本掉。建议先租用一个过渡一下',author:'市场情报员',likes:234}},
  {title:'出号：准毕业级刺客号，全S级装备，因工作原因退坑',preview:'工作太忙没时间玩了。刺客号全S级装备，十二个满级技能，排名分赛区前五十',author:'社畜退坑',replies:890,time:'1天前',hotComment:{content:'好号，但这个价格估计得六位数起步了。建议走平台担保交易，安全第一',author:'账号交易老手',likes:567}},
]},
{id:'leaderboard',name:'契约者排行榜',icon:'🏆',posts:[],leaderboard:{name:'',entries:[
  {rank:1,title:'虚空行者',level:98,team:'暗夜之刃'},
  {rank:2,title:'炎帝',level:96,team:'烈焰之心'},
  {rank:3,title:'冰霜女王',level:95,team:'极寒领域'},
  {rank:4,title:'剑圣',level:94,team:'无归属'},
  {rank:5,title:'暗影君主',level:93,team:'影之协会'},
  {rank:6,title:'时之魔导师',level:92,team:'时空之塔'},
  {rank:7,title:'雷霆领主',level:91,team:'风暴之眼'},
  {rank:8,title:'圣光骑士',level:90,team:'圣殿骑士团'},
  {rank:9,title:'毒王',level:89,team:'暗影花园'},
  {rank:10,title:'钢铁巨人',level:88,team:'铁壁公会'},
]}},
]

/** 第二API预留接口：独立配置，不影响酒馆正文 */
export async function fetchForumViaSecondAPI(_url?:string,_key?:string,_model?:string):Promise<ForumSection[]>{
  // TODO: 接入独立第二API
  return forumSections
}
