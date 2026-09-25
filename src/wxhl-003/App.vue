<template>
  <!-- FLOATING BUTTON -->
  <div
    v-show="!expanded"
    ref="btnRef"
    class="float-btn"
    :class="[deviceMode + '-mode', { dragging: isDragging }]"
    :style="btnStyle"
    @mousedown.prevent="onDragStart"
    @touchstart.prevent="onTouchStart"
    @touchmove="onTouchMove"
    @touchend="onTouchEnd"
  >
    <div class="btn-core">
      <svg class="btn-glyph" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.2">
        <path d="M3 21V3h6l3 4 3-4h6v18H3z" stroke-linecap="round" stroke-linejoin="round" />
        <line x1="9" y1="12" x2="15" y2="12" stroke-linecap="round" opacity="0.6" />
        <line x1="9" y1="16" x2="13" y2="16" stroke-linecap="round" opacity="0.4" />
      </svg>
    </div>
    <div class="btn-halo"></div>
  </div>

  <!-- PANEL -->
  <Transition name="panel">
    <div v-if="expanded" class="panel-overlay" @click.self="collapse">
      <div
        ref="panelRef"
        class="phone-frame"
        :class="{ 'sb-open': currentView === 'statusbar' }"
        :style="[panelAnimStyle, phoneVars]"
      >
        <button class="minimize-btn" @click.stop="collapse"><span></span></button>
        <!-- 内容层：字体缩放（zoom）只作用于它，手机框外壳不随之变形 -->
        <div class="phone-content">
          <div class="status-bar">
            <span class="status-time">{{ clockTime }}</span
            ><span class="status-label">◆ 回廊终端 · v2</span>
          </div>

        <!-- ============ DESKTOP ============ -->
        <div v-if="currentView === 'desktop'" class="desktop-view" :style="desktopBg">
          <div v-if="!store.settings.wallpaper" class="corridor-bg">
            <div class="corridor-ceiling"></div>
            <div class="corridor-left"></div>
            <div class="corridor-right"></div>
            <div class="corridor-floor"></div>
            <div class="corridor-end"></div>
          </div>
          <!-- 滚动层：背景与页脚固定，图标区可滚（隐藏滚动条） -->
          <div class="desktop-scroll">
            <div class="idle-plate" @click="openStatusbar">
              <div class="ip-title">◆ 契 约 者 ◆</div>
              <div class="ip-name">{{ idle.name }}</div>
              <div class="ip-line">Lv.{{ idle.lv }} · {{ idle.tier }} · {{ idle.army }}</div>
              <div class="ip-bars">
                <div class="ip-bar">
                  <span class="ip-bl">HP</span>
                  <div class="ip-track"><div class="ip-fill hp" :style="{ width: idleHpPct + '%' }"></div></div>
                </div>
                <div class="ip-bar">
                  <span class="ip-bl">MP</span>
                  <div class="ip-track"><div class="ip-fill mp" :style="{ width: idleMpPct + '%' }"></div></div>
                </div>
                <div class="ip-bar">
                  <span class="ip-bl">SP</span>
                  <div class="ip-track"><div class="ip-fill sp" :style="{ width: idleSpPct + '%' }"></div></div>
                </div>
              </div>
            </div>
            <div class="app-grid" v-show="desktopPage === 0">
              <div class="app-icon-wrapper" @click="openForum">
                <div class="app-icon forum-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="14" rx="2" />
                    <path d="M7 7h10M7 11h8M7 15h4" />
                  </svg>
                </div>
                <span class="app-label">回廊论坛</span>
                <span class="app-sub">{{ appSubs.forum }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openCareer">
                <div class="app-icon career-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                </div>
                <span class="app-label">职业规划</span>
                <span class="app-sub">{{ appSubs.career }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openDungeon">
                <div class="app-icon dungeon-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 2L20 6v6c0 5-3.5 8-8 10-4.5-2-8-5-8-10V6l8-4z" />
                    <path d="M9 12l2 2 4-4" />
                  </svg>
                </div>
                <span class="app-label">副本攻略</span>
                <span class="app-sub">{{ appSubs.dungeon }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openArena">
                <div class="app-icon arena-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M7 3L3 7v6l4 4h6l4-4V7l-4-4H7z" />
                    <path d="M7 7l3 3m2-3l3 3" />
                    <path d="M12 10l3 6M12 10l-3 6" />
                  </svg>
                </div>
                <span class="app-label">PvP竞技场</span>
                <span class="app-sub">{{ appSubs.arena }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openDungeonRoll">
                <div class="app-icon dungeonroll-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="3" y="3" width="18" height="18" rx="4" />
                    <circle cx="8.5" cy="8.5" r="1.3" />
                    <circle cx="15.5" cy="8.5" r="1.3" />
                    <circle cx="8.5" cy="15.5" r="1.3" />
                    <circle cx="15.5" cy="15.5" r="1.3" />
                    <circle cx="12" cy="12" r="1.3" />
                  </svg>
                </div>
                <span class="app-label">副本生成</span>
                <span class="app-sub">{{ appSubs.roll }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openMarket">
                <div class="app-icon market-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M12 3v3M8 21h8M12 6l-7 4h14l-7-4z" />
                    <path d="M5 10l-2 5a3.5 3.5 0 0 0 7 0l-2-5M19 10l-2 5a3.5 3.5 0 0 0 7 0l-2-5" />
                  </svg>
                </div>
                <span class="app-label">自由市场</span>
                <span class="app-sub">{{ appSubs.market }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openCrafting">
                <div class="app-icon crafting-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M14 4l6 6-1.8 1.8-6-6L14 4z" />
                    <path d="M12.2 7.8L4 16l2 2 8.2-8.2" />
                    <path d="M15 11l-3 3" />
                  </svg>
                </div>
                <span class="app-label">工坊</span>
                <span class="app-sub">{{ appSubs.crafting }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openSettlement">
                <div class="app-icon settlement-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M6 3h12v18l-6-4-6 4V3z" />
                    <path d="M9 8h6M9 12h4" />
                  </svg>
                </div>
                <span class="app-label">副本结算</span>
                <span class="app-sub">{{ appSubs.settlement }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openStatusbar">
                <div class="app-icon statusbar-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <rect x="4" y="3" width="16" height="18" rx="2" />
                    <circle cx="9" cy="8" r="1.6" />
                    <path d="M13 7h5M13 10.5h5M7.5 14.5h9M7.5 17.5h6" />
                  </svg>
                </div>
                <span class="app-label">状态栏</span>
                <span class="app-sub">{{ appSubs.statusbar }}</span>
              </div>
            </div>
            <div class="app-grid" v-show="desktopPage === 1">
              <div class="app-icon-wrapper" @click="openRank">
                <div class="app-icon rank-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <path d="M8 21h8M12 17v4" />
                    <path d="M7 4h10v5a5 5 0 0 1-10 0V4z" />
                    <path d="M7 6H4.5a2.5 2.5 0 0 0 2.5 5M17 6h2.5a2.5 2.5 0 0 1-2.5 5" />
                  </svg>
                </div>
                <span class="app-label">玩家排行榜</span>
                <span class="app-sub">{{ appSubs.rank }}</span>
              </div>
              <div class="app-icon-wrapper" @click="openSettings">
                <div class="app-icon settings-icon">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                    <circle cx="12" cy="12" r="3" />
                    <path
                      d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"
                    />
                  </svg>
                </div>
                <span class="app-label">终端设置</span>
                <span class="app-sub">{{ appSubs.settings }}</span>
              </div>
            </div>
          </div>
          <div class="desktop-pager">
            <button class="pager-arrow" :disabled="desktopPage === 0" @click="desktopPage = 0">‹</button>
            <span class="pager-dot" :class="{ on: desktopPage === 0 }" @click="desktopPage = 0"></span>
            <span class="pager-dot" :class="{ on: desktopPage === 1 }" @click="desktopPage = 1"></span>
            <button class="pager-arrow" :disabled="desktopPage === 1" @click="desktopPage = 1">›</button>
          </div>
          <div class="desktop-footer"><span>◆ 无 限 回 廊 ◆</span></div>
        </div>

        <!-- ============ FORUM ============ -->
        <div v-if="currentView === 'forum'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="goDesktop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">{{ activeThread ? activeThread.title : '回廊论坛' }}</span
            ><span class="hdr-spacer"></span>
          </div>

          <template v-if="!activeThread">
            <div class="section-tabs">
              <button
                v-for="sec in SECTIONS"
                :key="sec.key"
                class="section-tab"
                :class="{ active: store.activeSection === sec.key }"
                @click="store.activeSection = sec.key"
              >
                <span class="tab-icon">{{ sec.icon }}</span
                ><span class="tab-label">{{ sec.label }}</span>
              </button>
              <button
                v-if="store.activeSection !== 'rank'"
                class="section-tab refresh-tab"
                @click="onRefresh"
                :disabled="store.refreshing"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  :class="{ spinning: store.refreshing }"
                >
                  <polyline points="23 4 23 10 17 10" />
                  <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" /></svg
                ><span class="tab-label">{{ store.refreshing ? '生成中...' : '刷新' }}</span>
              </button>
              <button
                v-if="store.activeSection !== 'rank'"
                class="section-tab influence-tab"
                @click="onExtractInfluence"
                :disabled="store.influenceAnalyzing"
                :class="{ hasEvents: store.influenceEvents.length > 0 }"
              >
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  stroke-width="2"
                  :class="{ spinning: store.influenceAnalyzing }"
                >
                  <path d="M12 2l3 7 7 .9-5.3 4.6 1.6 6.9L12 18.7 5.7 21.4l1.6-6.9L2 9.9l7-.9z" /></svg
                ><span class="tab-label">{{ store.influenceAnalyzing ? '分析中...' : '玩家影响' }}</span
                ><span v-if="store.influenceEvents.length > 0" class="influence-badge">{{
                  store.influenceEvents.length
                }}</span>
              </button>
            </div>
            <template v-if="store.activeSection === 'rank'">
              <div class="rank-tabs">
                <button
                  v-for="(rb, i) in RANK_BOARDS"
                  :key="rb.key"
                  class="rank-tab"
                  :class="{ active: store.rankIndex === i }"
                  @click="store.rankIndex = i"
                >
                  {{ rb.key }}
                </button>
                <button
                  class="rank-tab refresh-tab"
                  @click="store.refreshRankings()"
                  :disabled="store.rankRefreshing"
                  title="读取玩家排名"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    stroke-width="2"
                    :class="{ spinning: store.rankRefreshing }"
                  >
                    <polyline points="23 4 23 10 17 10" />
                    <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
                  </svg>
                  <span class="tab-label">{{ store.rankRefreshing ? '读取中' : '刷新排名' }}</span>
                </button>
              </div>
              <div class="scroll-area">
                <div class="rank-board">
                  <div class="rank-title">{{ RANK_BOARDS[store.rankIndex].title }}</div>
                  <div v-if="store.playerRank && store.rankIndex === playerTier" class="rank-player-banner">
                    🎯 你的排名已录入！
                  </div>
                  <div class="rank-hdr">
                    <span class="rh-rank">#</span><span class="rh-name">契约者</span><span class="rh-lv">Lv</span
                    ><span class="rh-team">所属</span>
                  </div>
                  <template v-for="it in rankedItems" :key="it.rank">
                    <div class="rank-row" :class="{ top3: Number(it.rank) <= 3, player: it._player }">
                      <span class="ri-rank" :class="'r' + it.rank">{{ it.rank }}</span>
                      <span class="ri-name">{{ it.name }}</span>
                      <span class="ri-lv">{{ it.lv }}</span>
                      <span class="ri-team">{{ it.team }}</span>
                    </div>
                  </template>
                </div>
              </div>
            </template>
            <template v-else>
              <div class="scroll-area">
                <div v-if="store.influenceError" class="refresh-err">{{ store.influenceError }}</div>
                <div v-if="store.influenceEvents.length > 0" class="influence-panel">
                  <div class="infl-title">
                    <span>📰 玩家影响事件</span><button class="infl-clear" @click="store.clearInfluence()">清除</button>
                  </div>
                  <div v-for="(ev, ei) in store.influenceEvents" :key="ei" class="infl-item">
                    <span class="infl-dot">●</span><span class="infl-text">{{ ev.event }}</span
                    ><span class="infl-impact">{{ ev.impact }}</span>
                  </div>
                  <div class="infl-hint">这些大事会在刷新时融入论坛帖子</div>
                </div>
                <div v-if="store.lastError && store.activeSection === lastErrorSection" class="refresh-err">
                  {{ store.lastError }}
                </div>
                <div
                  v-for="t in sectionThreads"
                  :key="t.id"
                  class="thread-card"
                  :class="{ mine: t.author === '我' }"
                  @click="openThread(t)"
                >
                  <div class="tc-top">
                    <span class="tc-title">{{ t.title }}</span
                    ><span class="tc-replies">{{ t.replies }}回</span>
                  </div>
                  <div class="tc-preview">{{ t.preview }}</div>
                  <div class="tc-meta">
                    <span>{{ t.author }}</span
                    ><span>{{ t.time }}</span>
                  </div>
                  <div class="tc-hot">
                    <span class="hot-label">🔥</span><span class="hot-author">{{ t.hotAuthor }}</span
                    >: {{ t.hotComment }} <span class="hot-likes">👍{{ t.hotLikes }}</span>
                  </div>
                </div>
                <div v-if="sectionThreads.length === 0" class="empty-msg">暂无帖子 · 点击「刷新」由AI生成</div>
              </div>
              <div class="post-bar">
                <button class="post-btn" @click="showPostDialog = true">✏️ 发帖</button>
              </div>
            </template>
          </template>

          <!-- Thread detail -->
          <template v-else>
            <div v-if="store.generating" class="gen-overlay">
              <div class="gen-spinner"></div>
              <span>AI 生成帖子内容...</span>
            </div>
            <div v-else-if="store.lastError && activeThread" class="refresh-err">
              {{ store.lastError }} <button class="retry-link" @click="openThread(activeThread)">重试</button>
            </div>
            <template v-else>
              <div class="scroll-area">
                <div
                  v-for="(p, i) in activeThread.posts || []"
                  :key="i"
                  class="d-post"
                  :class="{ nest1: p.depth === 1, nest2: p.depth === 2 }"
                >
                  <div class="dp-head">
                    <span class="dp-author">{{ p.author }}</span
                    ><span class="dp-floor">#{{ p.floor }}</span
                    ><span class="dp-time">{{ p.time }}</span>
                  </div>
                  <div class="dp-content">{{ p.content }}</div>
                </div>
              </div>
              <div class="reply-bar">
                <span v-if="store.replying" class="reply-wait">AI 回复中...</span>
                <input
                  v-model="replyDraft"
                  class="reply-input"
                  placeholder="写下回复..."
                  @keyup.enter="sendReply"
                  :disabled="store.replying"
                />
                <button class="reply-btn" @click="sendReply" :disabled="!replyDraft.trim() || store.replying">
                  发送
                </button>
              </div>
            </template>
          </template>

          <!-- 发帖对话框 -->
          <div v-if="showPostDialog" class="dialog-mask" @click.self="showPostDialog = false">
            <div class="dialog-box">
              <div class="dialog-title">发帖 · {{ sectionName }}</div>
              <input v-model="postTitle" class="dialog-input single" placeholder="标题..." maxlength="40" />
              <textarea v-model="postContent" class="dialog-input" placeholder="正文..." rows="4"></textarea>
              <div class="dialog-btns">
                <button class="dialog-btn cancel" @click="showPostDialog = false">取消</button>
                <button class="dialog-btn confirm" @click="onPost" :disabled="!postTitle.trim() || !postContent.trim()">
                  发布
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- ============ SETTINGS MENU ============ -->
        <div v-if="currentView === 'settings'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="goDesktop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">终端设置</span><span class="hdr-spacer"></span>
          </div>
          <div class="scroll-area settings-menu">
            <button class="menu-btn" @click="settingsPage = 'api'">
              <span class="menu-icon">🔌</span><span>API 设置</span><span class="menu-arrow">›</span>
            </button>
            <button class="menu-btn" @click="settingsPage = 'worldbook'">
              <span class="menu-icon">📖</span><span>世界书设置</span><span class="menu-arrow">›</span>
            </button>
            <button class="menu-btn" @click="settingsPage = 'wallpaper'">
              <span class="menu-icon">🖼️</span><span>壁纸设置</span><span class="menu-arrow">›</span>
            </button>
            <button class="menu-btn" @click="settingsPage = 'display'">
              <span class="menu-icon">🔤</span><span>显示与字体</span><span class="menu-arrow">›</span>
            </button>
            <button class="menu-btn" @click="settingsPage = 'workshop-author'">
              <span class="menu-icon">🗃️</span><span>收录契约者</span><span class="menu-arrow">›</span>
            </button>
          </div>
        </div>

        <!-- ============ SETTINGS SUB-PAGES ============ -->
        <div v-if="currentView === 'settings' && settingsPage === 'api'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="settingsPage = ''">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">API 设置</span><span class="hdr-spacer"></span>
          </div>
          <div class="scroll-area settings-inner">
            <div class="set-block">
              <div class="set-label">API 方案</div>
              <div class="set-row">
                <select
                  class="prof-select"
                  :value="store.settings.activeApiProfile"
                  @change="applyApiProfile(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">（未使用方案）</option>
                  <option v-for="p in store.settings.apiProfiles" :key="p.name" :value="p.name">{{ p.name }}</option>
                </select>
                <button class="test-btn" @click="saveApiProfile">保存为方案</button>
                <button
                  class="test-btn"
                  @click="store.settings.activeApiProfile && deleteApiProfile(store.settings.activeApiProfile)"
                >
                  删除方案
                </button>
              </div>
            </div>
            <div class="set-block">
              <div class="set-label">API 模式</div>
              <div class="set-row">
                <button
                  class="mode-btn"
                  :class="{ active: store.settings.apiMode === 'single' }"
                  @click="store.settings.apiMode = 'single'"
                >
                  单 API</button
                ><button
                  class="mode-btn"
                  :class="{ active: store.settings.apiMode === 'multi' }"
                  @click="store.settings.apiMode = 'multi'"
                >
                  多 API
                </button>
              </div>
            </div>
            <div class="set-block">
              <div class="set-label">主 API</div>
              <ApiFields
                :cfg="store.settings.primary"
                :models="store.models"
                :loading="store.loadingModels"
                @fetch-models="store.fetchModels(store.settings.primary)"
              /><button
                class="test-btn"
                @click="store.testConnection(store.settings.primary)"
                :disabled="store.testing"
              >
                {{ store.testing ? '测试中...' : '测试连接' }}
              </button>
            </div>
            <div v-if="store.settings.apiMode === 'multi'" class="set-block">
              <div class="set-label">副 API</div>
              <ApiFields
                :cfg="store.settings.secondary"
                :models="store.models"
                :loading="store.loadingModels"
                @fetch-models="store.fetchModels(store.settings.secondary)"
              /><button
                class="test-btn"
                @click="store.testConnection(store.settings.secondary)"
                :disabled="store.testing"
              >
                {{ store.testing ? '测试中...' : '测试连接' }}
              </button>
            </div>
            <div v-if="store.testResult" class="test-msg" :class="{ ok: store.testResult.startsWith('✅') }">
              {{ store.testResult }}
            </div>
          </div>
        </div>

        <div v-if="currentView === 'settings' && settingsPage === 'worldbook'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="settingsPage = ''">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">世界书设置</span><span class="hdr-spacer"></span>
          </div>
          <div class="scroll-area settings-inner">
            <div class="set-block">
              <div class="set-label">世界书方案</div>
              <div class="set-row">
                <select
                  class="prof-select"
                  :value="store.settings.activeWorldbookProfile"
                  @change="applyWorldbookProfile(($event.target as HTMLSelectElement).value)"
                >
                  <option value="">（未使用方案）</option>
                  <option v-for="p in store.settings.worldbookProfiles" :key="p.name" :value="p.name">
                    {{ p.name }}
                  </option>
                </select>
                <button class="test-btn" @click="saveWorldbookProfile">保存为方案</button>
                <button
                  class="test-btn"
                  @click="
                    store.settings.activeWorldbookProfile &&
                    deleteWorldbookProfile(store.settings.activeWorldbookProfile)
                  "
                >
                  删除方案
                </button>
              </div>
            </div>
            <div class="set-block">
              <div class="set-label">选择用于AI生成的世界书</div>
              <button class="wb-load-btn" @click="store.loadWorldbookList()">🔄 刷新列表</button>
              <div class="wb-search-row">
                <input v-model="wbSearch" type="text" class="wb-search" placeholder="搜索条目名…（100+ 条目时用）" />
                <button v-if="wbSearch" class="wb-mini" @click="wbSearch = ''">清空</button>
              </div>

              <div v-if="store.allWorldbookNames.length === 0" class="set-hint">未检测到世界书</div>
              <div v-for="name in store.allWorldbookNames" :key="name" class="wb-block">
                <div class="wb-row" @click="toggleWb(name)">
                  <span class="wb-check" :class="{ on: store.settings.selectedWorldbooks.includes(name) }">{{
                    store.settings.selectedWorldbooks.includes(name) ? '☑' : '☐'
                  }}</span>
                  <span class="wb-name">{{ name }}</span>
                  <button class="wb-expand" @click.stop="toggleWbExpand(name)">
                    {{ wbExpanded[name] ? '▾' : '▸' }}
                  </button>
                </div>
                <div v-if="wbExpanded[name]" class="wb-entries">
                  <div class="wb-entry-actions">
                    <button
                      class="wb-mini"
                      @click="
                        setVisibleWbEntries(
                          name,
                          wbVisibleEntries(name).map(e => e.name),
                          true,
                        )
                      "
                    >
                      全选{{ wbSearch ? '（搜索结果）' : '' }}
                    </button>
                    <button
                      class="wb-mini"
                      @click="
                        setVisibleWbEntries(
                          name,
                          wbVisibleEntries(name).map(e => e.name),
                          false,
                        )
                      "
                    >
                      全不选{{ wbSearch ? '（搜索结果）' : '' }}
                    </button>
                    <span class="wb-count"
                      >{{ wbVisibleEntries(name).length }} / {{ (wbEntries[name] || []).length }} 条</span
                    >
                  </div>
                  <div v-if="(wbEntries[name] || []).length === 0" class="set-hint">（该世界书没有条目或读取失败）</div>
                  <div v-else-if="wbVisibleEntries(name).length === 0" class="set-hint">
                    （没有匹配「{{ wbSearch }}」的条目）
                  </div>
                  <div
                    v-for="e in wbVisibleEntries(name)"
                    :key="e.name"
                    class="wb-entry"
                    @click="toggleWbEntry(name, e.name)"
                  >
                    <span class="wb-check" :class="{ on: wbEntryChecked(name, e.name) }">{{
                      wbEntryChecked(name, e.name) ? '☑' : '☐'
                    }}</span>
                    <span class="wb-entry-name">{{ e.name }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentView === 'settings' && settingsPage === 'wallpaper'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="settingsPage = ''">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">壁纸设置</span><span class="hdr-spacer"></span>
          </div>
          <div class="scroll-area settings-inner">
            <div class="set-block">
              <div class="set-label">当前壁纸</div>
              <div class="wp-preview" :style="wallpaperPreviewStyle"></div>
              <button v-if="store.settings.wallpaper" class="wp-clear-btn" @click="store.settings.wallpaper = ''">
                清除壁纸（恢复长廊）
              </button>
            </div>
            <div class="set-block">
              <div class="set-label">上传自定义壁纸</div>
              <label class="wp-upload-btn"
                ><input type="file" accept="image/*" @change="onWallpaperUpload" hidden />📁 选择图片文件</label
              >
            </div>
            <div class="set-block">
              <div class="set-label">预设壁纸</div>
              <div class="wp-grid">
                <div
                  v-for="(wp, i) in presetWallpapers"
                  :key="i"
                  class="wp-preset"
                  :class="{ selected: store.settings.wallpaper === wp.url }"
                  @click="store.settings.wallpaper = wp.url"
                >
                  <div class="wp-preset-img" :style="{ backgroundImage: 'url(' + wp.url + ')' }"></div>
                  <span class="wp-preset-label">{{ wp.name }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div v-if="currentView === 'settings' && settingsPage === 'display'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="settingsPage = ''">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">显示与字体</span><span class="hdr-spacer"></span>
          </div>
          <div class="scroll-area settings-inner">
            <div class="set-block">
              <div class="set-label">字体</div>
              <div class="set-row">
                <select class="prof-select" v-model="store.settings.fontFamily">
                  <option v-for="f in FONT_OPTIONS" :key="f.label" :value="f.value">{{ f.label }}</option>
                </select>
              </div>
              <div class="set-hint">只作用于小手机内部，与酒馆页面字体隔离</div>
            </div>
            <div class="set-block">
              <div class="set-label">
                手机尺寸 <span class="set-val">{{ Math.round(store.settings.phoneScale * 100) }}%</span>
              </div>
              <input
                class="set-range"
                type="range"
                min="0.8"
                max="1.5"
                step="0.05"
                v-model.number="store.settings.phoneScale"
              />
              <div class="set-hint">小手机窗口与字体一起等比放大缩小；手机端会自动贴合屏幕</div>
            </div>
            <div class="set-block">
              <div class="set-label">
                字体大小 <span class="set-val">{{ Math.round(store.settings.fontScale * 100) }}%</span>
              </div>
              <input
                class="set-range"
                type="range"
                min="0.85"
                max="1.4"
                step="0.05"
                v-model.number="store.settings.fontScale"
              />
              <div class="set-hint">在「手机尺寸」的基础上，再单独放大 / 缩小文字</div>
            </div>
            <div class="set-block">
              <button class="set-reset-btn" @click="resetDisplay">恢复默认（100%）</button>
            </div>
          </div>
        </div>

        <div v-if="currentView === 'settings' && settingsPage === 'workshop-author'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="settingsPage = ''">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">收录契约者</span><span class="hdr-spacer"></span>
          </div>
          <div class="scroll-area settings-inner">
            <div class="set-block">
              <div class="set-label">粘贴玩家存档 JSON</div>
              <textarea
                v-model="workshopStore.authorDraft"
                class="dialog-input"
                rows="8"
                placeholder='{"契约者":{...},"外貌":"...","简介":"...","上传者":"..."}'
                @input="workshopStore.previewPaste(workshopStore.authorDraft)"
              ></textarea>
              <div v-if="workshopStore.authorError" class="set-err">{{ workshopStore.authorError }}</div>
              <div v-if="workshopStore.previewSave" class="author-preview">
                <div class="ap-name">
                  {{ workshopStore.previewSave.契约者.头部.姓名 }} · Lv.{{
                    workshopStore.previewSave.契约者.头部.等级
                  }}
                  · {{ workshopStore.previewSave.契约者.头部.阶位 }}
                </div>
                <div class="ap-meta">{{ workshopStore.previewSave.契约者.职业.名称 || '无职业' }}</div>
              </div>
              <button class="test-btn" @click="workshopStore.writeToWorldbook()" :disabled="!workshopStore.previewSave">
                写入世界书
              </button>
            </div>
            <div class="set-block">
              <div class="set-label">当前契约者库</div>
              <div v-for="c in workshopStore.contracts" :key="c.name" class="wb-row">
                <span class="wb-name">{{ c.name }} · {{ c.阶位 }} · Lv.{{ c.等级 }}</span>
                <button class="author-del" @click="onRemoveContract(c.name)">移除</button>
              </div>
              <button class="wb-load-btn" @click="workshopStore.loadContracts()">🔄 刷新列表</button>
            </div>
          </div>
        </div>

        <!-- ============ CAREER ============ -->
        <!-- 新建方案 / 修改方案 对话框 -->
        <div
          v-if="currentView === 'career' && (showNewDialog || showModifyDialog)"
          class="dialog-mask"
          @click.self="
            showNewDialog = false;
            showModifyDialog = false;
          "
        >
          <div class="dialog-box">
            <div class="dialog-title">
              {{
                showModifyDialog
                  ? '修改方案'
                  : careerStore.activePlanType === 'roadmap'
                    ? '新建生涯规划'
                    : '新建职业方案'
              }}
            </div>
            <textarea
              v-model="newPlanKeywords"
              class="dialog-input"
              :placeholder="dialogPlaceholder"
              rows="4"
            ></textarea>
            <div class="dialog-btns">
              <button
                class="dialog-btn cancel"
                @click="
                  showNewDialog = false;
                  showModifyDialog = false;
                "
              >
                取消
              </button>
              <button
                class="dialog-btn confirm"
                @click="onNewPlan"
                :disabled="!newPlanKeywords.trim() || careerStore.generatingV1"
              >
                {{ careerStore.generatingV1 ? '生成中...' : showModifyDialog ? '重新生成' : '生成方案' }}
              </button>
            </div>
          </div>
        </div>

        <!-- 删除确认对话框 -->
        <div v-if="currentView === 'career' && deleteTargetId" class="dialog-mask" @click.self="deleteTargetId = 0">
          <div class="dialog-box">
            <div class="dialog-title">确认删除</div>
            <div class="dialog-body">确定要删除这个方案吗？此操作不可撤销。</div>
            <div class="dialog-btns">
              <button class="dialog-btn cancel" @click="deleteTargetId = 0">取消</button>
              <button class="dialog-btn danger" @click="onDeletePlan">删除</button>
            </div>
          </div>
        </div>

        <!-- 职业规划列表页 -->
        <div v-if="currentView === 'career' && careerView === 'list'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="goDesktop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">职业规划</span><span class="hdr-spacer"></span>
          </div>

          <!-- Tab Bar -->
          <div class="section-tabs">
            <button
              class="section-tab"
              :class="{ active: careerStore.activePlanType === 'fusion' }"
              @click="careerStore.activePlanType = 'fusion'"
            >
              <span class="tab-icon">🔀</span><span class="tab-label">融合方案</span>
            </button>
            <button
              class="section-tab"
              :class="{ active: careerStore.activePlanType === 'roadmap' }"
              @click="careerStore.activePlanType = 'roadmap'"
            >
              <span class="tab-icon">🗺️</span><span class="tab-label">现有职业规划</span>
            </button>
          </div>

          <div v-if="careerStore.generatingV1" class="gen-overlay">
            <div class="gen-spinner"></div>
            <span>AI 正在设计职业方案...</span>
          </div>

          <template v-else>
            <div v-if="careerStore.lastError" class="refresh-err">
              {{ careerStore.lastError }} <button class="retry-link" @click="showNewDialog = true">重试</button>
            </div>

            <!-- ============ 融合方案列表 ============ -->
            <template v-if="careerStore.activePlanType === 'fusion'">
              <div v-if="careerStore.plans.length === 0" class="empty-state">
                <div class="empty-icon">🔀</div>
                <div class="empty-text">尚未创建融合职业方案</div>
                <div class="empty-sub">输入关键词或想法，让 AI 为你设计融合职业路线</div>
              </div>
              <div v-else class="scroll-area">
                <div
                  v-for="p in careerStore.plans"
                  :key="p.id"
                  class="plan-card"
                  @click="
                    viewingPlan = p;
                    viewingRoadmap = null;
                    careerView = 'detail';
                  "
                >
                  <div class="pc-top">
                    <span class="pc-name">{{ p.name }}</span
                    ><span class="pc-rarity" :class="'rarity-' + p.rarity">{{ p.rarity }}</span>
                  </div>
                  <div class="pc-concept">{{ p.coreConcept }}</div>
                  <div class="pc-meta">
                    <span class="pc-tag">{{ p.keywords.slice(0, 40) }}{{ p.keywords.length > 40 ? '...' : '' }}</span
                    ><span class="pc-time">{{ p.createdAt }}</span
                    ><span v-if="p.phase === 'v1'" class="pc-phase pending">未完成</span
                    ><span v-else class="pc-phase done">已完成</span>
                  </div>
                </div>
              </div>
            </template>

            <!-- ============ 生涯规划列表 ============ -->
            <template v-if="careerStore.activePlanType === 'roadmap'">
              <div v-if="careerStore.roadmaps.length === 0" class="empty-state">
                <div class="empty-icon">🗺️</div>
                <div class="empty-text">尚未创建生涯规划</div>
                <div class="empty-sub">基于你当前持有的职业，让 AI 为你制定职业发展路线</div>
              </div>
              <div v-else class="scroll-area">
                <div
                  v-for="r in careerStore.roadmaps"
                  :key="r.id"
                  class="plan-card"
                  @click="
                    viewingRoadmap = r;
                    viewingPlan = null;
                    careerView = 'detail';
                  "
                >
                  <div class="pc-top">
                    <span class="pc-name">{{ r.title }}</span
                    ><span v-if="r.phase === 'v1'" class="pc-phase pending">未完成</span
                    ><span v-else class="pc-phase done">已完成</span>
                  </div>
                  <div class="pc-concept">{{ r.recommendedDirection }}</div>
                  <div class="pc-meta">
                    <span class="pc-tag">{{ r.keywords.slice(0, 40) }}{{ r.keywords.length > 40 ? '...' : '' }}</span
                    ><span class="pc-time">{{ r.createdAt }}</span>
                  </div>
                </div>
              </div>
            </template>

            <div class="career-fab">
              <button
                class="fab-btn"
                @click="
                  showNewDialog = true;
                  showModifyDialog = false;
                  newPlanKeywords = '';
                "
              >
                {{ careerStore.activePlanType === 'roadmap' ? '＋ 新建生涯规划' : '＋ 新建融合方案' }}
              </button>
            </div>
          </template>
        </div>

        <!-- ============ 融合方案详情页 ============ -->
        <div
          v-if="currentView === 'career' && careerView === 'detail' && viewingPlan && !viewingRoadmap"
          class="app-page"
        >
          <div class="app-header">
            <button
              class="hdr-btn"
              @click="
                careerView = 'list';
                viewingPlan = null;
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="hdr-title">{{ viewingPlan.name }}</span>
            <button class="hdr-btn del" @click="deleteTargetId = viewingPlan.id" title="删除方案">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>

          <div v-if="careerStore.generatingV2" class="gen-overlay">
            <div class="gen-spinner"></div>
            <span>AI 正在生成方案细节...</span>
          </div>

          <template v-else>
            <div v-if="careerStore.lastError" class="refresh-err">{{ careerStore.lastError }}</div>
            <div class="scroll-area detail-scroll">
              <!-- 目标概览 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🎯</span>目标概览</div>
                <div class="db-row">
                  <span class="db-label">融合职业</span><span class="db-value">{{ viewingPlan.name }}</span>
                </div>
                <div class="db-row">
                  <span class="db-label">稀有度</span
                  ><span class="db-value rarity-badge" :class="'rarity-' + viewingPlan.rarity">{{
                    viewingPlan.rarity
                  }}</span>
                </div>
                <div class="db-row">
                  <span class="db-label">核心定位</span><span class="db-value">{{ viewingPlan.coreConcept }}</span>
                </div>
              </div>
              <!-- 主职业 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">⚔️</span>主职业（回廊原生）</div>
                <div class="db-row">
                  <span class="db-label">职业名称</span><span class="db-value">{{ viewingPlan.mainJob.name }}</span>
                </div>
                <div class="db-row">
                  <span class="db-label">稀有度</span><span class="db-value">{{ viewingPlan.mainJob.rarity }}</span>
                </div>
                <div class="db-row">
                  <span class="db-label">属性倾向</span
                  ><span class="db-value">{{ viewingPlan.mainJob.attributeTendency }}</span>
                </div>
                <div class="db-section">
                  <span class="db-label">获取方式</span>
                  <div class="db-text">{{ viewingPlan.mainJob.acquisition }}</div>
                </div>
                <div class="db-section">
                  <span class="db-label">转职路线</span>
                  <div class="db-text">{{ viewingPlan.mainJob.classTree }}</div>
                </div>
              </div>
              <!-- 副职业 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🌍</span>副职业（副本职业）</div>
                <div class="db-row">
                  <span class="db-label">职业名称</span><span class="db-value">{{ viewingPlan.subJob.name }}</span>
                </div>
                <div class="db-row">
                  <span class="db-label">稀有度</span><span class="db-value">{{ viewingPlan.subJob.rarity }}</span>
                </div>
                <div class="db-row">
                  <span class="db-label">来源世界</span><span class="db-value">{{ viewingPlan.subJob.world }}</span>
                </div>
                <div class="db-row">
                  <span class="db-label">属性倾向</span
                  ><span class="db-value">{{ viewingPlan.subJob.attributeTendency }}</span>
                </div>
                <div class="db-section">
                  <span class="db-label">获取方法</span>
                  <div class="db-text">{{ viewingPlan.subJob.acquisition }}</div>
                </div>
                <div class="db-section">
                  <span class="db-label">转职路线</span>
                  <div class="db-text">{{ viewingPlan.subJob.classTree }}</div>
                </div>
              </div>
              <!-- 相性分析 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🔗</span>相性分析</div>
                <div class="db-row">
                  <span class="db-label">判定结果</span
                  ><span class="db-value affinity-high">{{ viewingPlan.affinity.result }}</span>
                </div>
                <div class="db-section">
                  <span class="db-label">判定理由</span>
                  <div class="db-text">{{ viewingPlan.affinity.reasons }}</div>
                </div>
              </div>
              <!-- 进化路线 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">⬆️</span>进化路线图</div>
                <div class="db-section">
                  <span class="db-label">一转</span>
                  <div class="db-text">{{ viewingPlan.evolution.firstClass }}</div>
                </div>
                <div class="db-section">
                  <span class="db-label">二转</span>
                  <div class="db-text">{{ viewingPlan.evolution.secondClass }}</div>
                </div>
                <div class="db-section">
                  <span class="db-label">三转</span>
                  <div class="db-text">{{ viewingPlan.evolution.thirdClass }}</div>
                </div>
              </div>
              <!-- 第二轮细节 -->
              <template v-if="viewingPlan.phase === 'complete'">
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
                  <div v-for="(step, si) in viewingPlan.stepGuide" :key="si" class="step-item">
                    <span class="step-num">{{ si + 1 }}</span
                    ><span class="step-text">{{ step }}</span>
                  </div>
                </div>
                <div class="detail-block warning">
                  <div class="db-title"><span class="db-icon">⚠️</span>风险提示</div>
                  <div class="db-text">{{ viewingPlan.risks }}</div>
                </div>
              </template>
              <!-- V1 操作 -->
              <div v-if="viewingPlan.phase === 'v1'" class="detail-footer">
                <button class="confirm-btn" @click="onConfirmPlan(viewingPlan)" :disabled="careerStore.generatingV2">
                  {{ careerStore.generatingV2 ? '生成中...' : '继续生成细节' }}
                </button>
                <button
                  class="confirm-btn modify"
                  @click="onModifyClick(viewingPlan)"
                  :disabled="careerStore.generatingV1"
                >
                  修改方案
                </button>
                <div class="confirm-hint">
                  当前仅有框架信息。可继续生成细节，或点击「修改方案」提出调整意见后重新生成框架
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ============ 生涯规划详情页 ============ -->
        <div
          v-if="currentView === 'career' && careerView === 'detail' && viewingRoadmap && !viewingPlan"
          class="app-page"
        >
          <div class="app-header">
            <button
              class="hdr-btn"
              @click="
                careerView = 'list';
                viewingRoadmap = null;
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="hdr-title">{{ viewingRoadmap.title }}</span>
            <button class="hdr-btn del" @click="deleteTargetId = viewingRoadmap.id" title="删除方案">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>

          <div v-if="careerStore.generatingV2" class="gen-overlay">
            <div class="gen-spinner"></div>
            <span>AI 正在生成规划细节...</span>
          </div>

          <template v-else>
            <div v-if="careerStore.lastError" class="refresh-err">{{ careerStore.lastError }}</div>
            <div class="scroll-area detail-scroll">
              <!-- 路线概览 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🎯</span>路线概览</div>
                <div class="db-row">
                  <span class="db-label">路线标题</span><span class="db-value">{{ viewingRoadmap.title }}</span>
                </div>
              </div>
              <!-- 当前状况 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">📋</span>当前状况分析</div>
                <div class="db-text">{{ viewingRoadmap.currentState }}</div>
              </div>
              <!-- 推荐方向 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🧭</span>推荐发展方向</div>
                <div class="db-text">{{ viewingRoadmap.recommendedDirection }}</div>
              </div>
              <!-- 目标世界 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🌍</span>建议进入的副本世界</div>
                <div v-for="(w, wi) in viewingRoadmap.targetWorlds" :key="wi" class="step-item">
                  <span class="step-num">{{ wi + 1 }}</span
                  ><span class="step-text">{{ w }}</span>
                </div>
              </div>
              <!-- 融合建议 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🔀</span>融合建议</div>
                <div class="db-text">{{ viewingRoadmap.fusionAdvice }}</div>
              </div>
              <!-- 转职路线 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">⬆️</span>转职路线</div>
                <div class="db-text">{{ viewingRoadmap.evolutionPath }}</div>
              </div>
              <!-- 第二轮细节 -->
              <template v-if="viewingRoadmap.phase === 'complete'">
                <div class="detail-block">
                  <div class="db-title"><span class="db-icon">🗺️</span>分步执行计划</div>
                  <div v-for="(step, si) in viewingRoadmap.stepPlan" :key="si" class="step-item">
                    <span class="step-num">{{ si + 1 }}</span
                    ><span class="step-text">{{ step }}</span>
                  </div>
                </div>
                <div class="detail-block">
                  <div class="db-title"><span class="db-icon">⚡</span>技能构筑建议</div>
                  <div class="db-text">{{ viewingRoadmap.skillAdvice }}</div>
                </div>
                <div class="detail-block">
                  <div class="db-title"><span class="db-icon">🛡️</span>装备构筑建议</div>
                  <div class="db-text">{{ viewingRoadmap.equipmentAdvice }}</div>
                </div>
                <div class="detail-block warning">
                  <div class="db-title"><span class="db-icon">⚠️</span>风险提示</div>
                  <div class="db-text">{{ viewingRoadmap.risks }}</div>
                </div>
              </template>
              <!-- V1 操作 -->
              <div v-if="viewingRoadmap.phase === 'v1'" class="detail-footer">
                <button
                  class="confirm-btn"
                  @click="onConfirmRoadmap(viewingRoadmap)"
                  :disabled="careerStore.generatingV2"
                >
                  {{ careerStore.generatingV2 ? '生成中...' : '继续生成细节' }}
                </button>
                <button
                  class="confirm-btn modify"
                  @click="onModifyRoadmapClick(viewingRoadmap)"
                  :disabled="careerStore.generatingV1"
                >
                  修改方案
                </button>
                <div class="confirm-hint">
                  当前仅有框架信息。可继续生成细节，或点击「修改方案」提出调整意见后重新生成框架
                </div>
              </div>
            </div>
          </template>
        </div>

        <!-- ============ 副本攻略向导对话框 ============ -->
        <div
          v-if="currentView === 'dungeon' && showDungeonWizard"
          class="dialog-mask"
          @click.self="showDungeonWizard = false"
        >
          <div class="dialog-box">
            <!-- 第1步：选阵营 -->
            <template v-if="dungeonStep === 'faction'">
              <div class="dialog-title">选择阵营偏向</div>
              <div class="dungeon-faction-row">
                <button
                  v-for="f in ['正道', '邪道', '中立']"
                  :key="f"
                  class="faction-btn"
                  :class="{ active: dungeonFaction === f }"
                  @click="dungeonFaction = f as Faction"
                >
                  {{ f }}
                </button>
              </div>
              <div class="dialog-btns">
                <button class="dialog-btn cancel" @click="showDungeonWizard = false">取消</button>
                <button class="dialog-btn confirm" @click="dungeonStep = 'choice'">下一步</button>
              </div>
            </template>
            <!-- 第2步：目标 or AI攻略 -->
            <template v-else-if="dungeonStep === 'choice'">
              <div class="dialog-title">选择生成方式</div>
              <button class="dungeon-choice-btn" @click="dungeonStep = 'goal'">🎯 目标输入</button>
              <button class="dungeon-choice-btn" @click="dungeonStep = 'mode'">🧠 AI攻略</button>
              <div class="dialog-btns">
                <button class="dialog-btn cancel" @click="dungeonStep = 'faction'">上一步</button>
              </div>
            </template>
            <!-- 第3a步：目标输入 -->
            <template v-else-if="dungeonStep === 'goal'">
              <div class="dialog-title">输入世界目标</div>
              <textarea
                v-model="dungeonGoal"
                class="dialog-input"
                placeholder="想在这个世界获得什么？力量、职业、装备、道具，甚至攻略对象都可以..."
                rows="4"
              ></textarea>
              <div class="dialog-btns">
                <button class="dialog-btn cancel" @click="dungeonStep = 'choice'">上一步</button>
                <button
                  class="dialog-btn confirm"
                  @click="
                    dungeonMode = 'goal';
                    confirmDungeonWizard();
                  "
                  :disabled="!dungeonGoal.trim() || dungeonStore.generatingV1"
                >
                  {{ dungeonStore.generatingV1 ? '生成中...' : '生成攻略' }}
                </button>
              </div>
            </template>
            <!-- 第3b步：选模式 -->
            <template v-else-if="dungeonStep === 'mode'">
              <div class="dialog-title">选择攻略模式</div>
              <button
                v-for="m in DUNGEON_MODES"
                :key="m.key"
                class="dungeon-mode-btn"
                :class="{ active: dungeonMode === m.key }"
                @click="dungeonMode = m.key"
              >
                <span class="dm-icon">{{ m.icon }}</span
                ><span class="dm-text"
                  ><b>{{ m.label }}</b
                  ><i>{{ m.desc }}</i></span
                >
              </button>
              <div class="dialog-btns">
                <button class="dialog-btn cancel" @click="dungeonStep = 'choice'">上一步</button>
                <button
                  class="dialog-btn confirm"
                  @click="confirmDungeonWizard()"
                  :disabled="dungeonStore.generatingV1"
                >
                  {{ dungeonStore.generatingV1 ? '生成中...' : '生成攻略' }}
                </button>
              </div>
            </template>
          </div>
        </div>

        <!-- 删除确认对话框 -->
        <div v-if="currentView === 'dungeon' && deleteTargetId" class="dialog-mask" @click.self="deleteTargetId = 0">
          <div class="dialog-box">
            <div class="dialog-title">确认删除</div>
            <div class="dialog-body">确定要删除这个副本攻略吗？此操作不可撤销。</div>
            <div class="dialog-btns">
              <button class="dialog-btn cancel" @click="deleteTargetId = 0">取消</button>
              <button class="dialog-btn danger" @click="onDeleteDungeon">删除</button>
            </div>
          </div>
        </div>

        <!-- 副本攻略列表页 -->
        <div v-if="currentView === 'dungeon' && dungeonView === 'list'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="goDesktop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">副本攻略</span><span class="hdr-spacer"></span>
          </div>

          <div v-if="dungeonStore.generatingV1" class="gen-overlay">
            <div class="gen-spinner"></div>
            <span>AI 正在规划副本攻略...</span>
          </div>

          <template v-else>
            <div v-if="dungeonStore.lastError" class="refresh-err">
              {{ dungeonStore.lastError }} <button class="retry-link" @click="openDungeonWizard">重试</button>
            </div>

            <div v-if="dungeonStore.dungeons.length === 0" class="empty-state">
              <div class="empty-icon">🗡️</div>
              <div class="empty-text">尚未生成副本攻略</div>
              <div class="empty-sub">选择阵营偏向和攻略模式，AI 将通读副本与玩家数据生成完整路线</div>
            </div>

            <div v-else class="scroll-area">
              <div
                v-for="d in dungeonStore.dungeons"
                :key="d.id"
                class="plan-card"
                @click="
                  viewingDungeon = d;
                  dungeonView = 'detail';
                "
              >
                <div class="pc-top">
                  <span class="pc-name">{{ d.dungeonName }}</span>
                  <span class="pc-tag">{{ d.faction }}</span>
                  <span v-if="d.mode === 'goal'" class="pc-tag">🎯目标</span>
                  <span v-else class="pc-tag">{{ DUNGEON_MODES.find(m => m.key === d.mode)?.label || d.mode }}</span>
                </div>
                <div class="pc-concept">{{ d.routeOverview }}</div>
                <div class="pc-meta">
                  <span class="pc-time">{{ d.createdAt }}</span>
                  <span v-if="d.phase === 'v1'" class="pc-phase pending">未完成</span>
                  <span v-else class="pc-phase done">已完成</span>
                </div>
              </div>
            </div>

            <div class="career-fab">
              <button class="fab-btn" @click="openDungeonWizard">＋ 新建攻略</button>
            </div>
          </template>
        </div>

        <!-- 副本攻略详情页 -->
        <div v-if="currentView === 'dungeon' && dungeonView === 'detail' && viewingDungeon" class="app-page">
          <div class="app-header">
            <button
              class="hdr-btn"
              @click="
                dungeonView = 'list';
                viewingDungeon = null;
              "
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <span class="hdr-title">{{ viewingDungeon.dungeonName }}</span>
            <button class="hdr-btn del" @click="deleteTargetId = viewingDungeon.id" title="删除攻略">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
              </svg>
            </button>
          </div>

          <div v-if="dungeonStore.generatingV2" class="gen-overlay">
            <div class="gen-spinner"></div>
            <span>AI 正在生成攻略细节...</span>
          </div>

          <template v-else>
            <div v-if="dungeonStore.lastError" class="refresh-err">{{ dungeonStore.lastError }}</div>
            <div class="scroll-area detail-scroll">
              <!-- 概览 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🗡️</span>攻略概览</div>
                <div class="db-row">
                  <span class="db-label">阵营偏向</span><span class="db-value">{{ viewingDungeon.faction }}</span>
                </div>
                <div class="db-row">
                  <span class="db-label">攻略模式</span
                  ><span class="db-value">{{
                    viewingDungeon.mode === 'goal'
                      ? '目标导向：' + viewingDungeon.playerGoal
                      : DUNGEON_MODES.find(m => m.key === viewingDungeon.mode)?.label || viewingDungeon.mode
                  }}</span>
                </div>
                <div class="db-section">
                  <span class="db-label">路线总览</span>
                  <div class="db-text">{{ viewingDungeon.routeOverview }}</div>
                </div>
              </div>
              <!-- 主线支线 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">📜</span>主线与支线执行计划</div>
                <div class="db-text">{{ viewingDungeon.questExecution }}</div>
              </div>
              <!-- 成就 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🏆</span>成就达成方案</div>
                <div class="db-text">{{ viewingDungeon.achievementPlan }}</div>
              </div>
              <!-- 隐藏任务 -->
              <div class="detail-block">
                <div class="db-title"><span class="db-icon">🔍</span>隐藏任务攻略</div>
                <div class="db-text">{{ viewingDungeon.hiddenQuestStrategy }}</div>
              </div>
              <!-- 第二轮细节 -->
              <template v-if="viewingDungeon.phase === 'complete'">
                <div class="detail-block">
                  <div class="db-title"><span class="db-icon">🗺️</span>分步执行路线</div>
                  <div v-for="(step, si) in viewingDungeon.stepPlan" :key="si" class="step-item">
                    <span class="step-num">{{ si + 1 }}</span
                    ><span class="step-text">{{ step }}</span>
                  </div>
                </div>
                <div class="detail-block">
                  <div class="db-title"><span class="db-icon">⚔️</span>战斗建议</div>
                  <div class="db-text">{{ viewingDungeon.combatAdvice }}</div>
                </div>
                <div class="detail-block">
                  <div class="db-title"><span class="db-icon">🎒</span>资源优先级</div>
                  <div class="db-text">{{ viewingDungeon.resourceAdvice }}</div>
                </div>
                <div class="detail-block warning">
                  <div class="db-title"><span class="db-icon">⚠️</span>风险与预案</div>
                  <div class="db-text">{{ viewingDungeon.risks }}</div>
                </div>
              </template>
              <!-- V1 操作 -->
              <div v-if="viewingDungeon.phase === 'v1'" class="detail-footer">
                <button
                  class="confirm-btn"
                  @click="onConfirmDungeon(viewingDungeon)"
                  :disabled="dungeonStore.generatingV2"
                >
                  {{ dungeonStore.generatingV2 ? '生成中...' : '继续生成细节' }}
                </button>
                <button
                  class="confirm-btn modify"
                  @click="onModifyDungeonClick(viewingDungeon)"
                  :disabled="dungeonStore.generatingV1"
                >
                  修改方案
                </button>
                <button
                  class="confirm-btn reroll"
                  @click="onRerollDungeon(viewingDungeon)"
                  :disabled="dungeonStore.generatingV1"
                >
                  {{ dungeonStore.generatingV1 ? '生成中...' : '🔄 重roll' }}
                </button>
                <div class="confirm-hint">当前仅有框架信息。可继续生成细节、修改方案，或用相同条件重新生成</div>
              </div>
            </div>
          </template>
        </div>

        <!-- ============ 副本生成 ============ -->
        <div v-if="currentView === 'dungeonRoll'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="goDesktop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">副本生成</span><span class="hdr-spacer"></span>
          </div>

          <div class="scroll-area">
            <div v-if="dungeonGenStore.lastError" class="refresh-err">{{ dungeonGenStore.lastError }}</div>

            <div v-if="playerCycleLabel" class="roll-cycle">{{ playerCycleLabel }}</div>

            <div class="roll-mode-tabs">
              <button class="roll-mode-tab" :class="{ active: rollMode === 'random' }" @click="rollMode = 'random'">
                🎲 随机掷骰
              </button>
              <button class="roll-mode-tab" :class="{ active: rollMode === 'custom' }" @click="rollMode = 'custom'">
                ✍️ 自选生成
              </button>
            </div>

            <div v-if="rollMode === 'custom'" class="custom-panel">
              <div class="cp-field">
                <span class="cp-label">世界观名</span>
                <input
                  v-model="customWorld"
                  class="cp-input"
                  placeholder="如：火影忍者 / 赛博朋克2077（留空则由 AI 自选）"
                  maxlength="30"
                />
              </div>
              <div class="cp-field">
                <span class="cp-label">队友世界观</span>
                <input
                  v-model="customMateWorld"
                  class="cp-input"
                  placeholder="队友来自的世界观（留空则自动匹配）"
                  maxlength="30"
                />
              </div>
              <div class="cp-field">
                <span class="cp-label">队友人物</span>
                <input
                  v-model="customMateNames"
                  class="cp-input"
                  placeholder="具体人物，如：刻晴、甘雨（留空则自动匹配）"
                  maxlength="60"
                />
              </div>
              <div v-for="opt in CUSTOM_OPTIONS" :key="opt.key" class="cp-field">
                <span class="cp-label">{{ opt.label }}</span>
                <select v-model="customPicks[opt.key]" class="cp-select">
                  <option value="">🎲 随机</option>
                  <option v-for="v in opt.values" :key="v" :value="v">{{ v }}</option>
                </select>
              </div>
            </div>

            <div class="roll-options">
              <div class="cp-field">
                <label class="cp-label cp-label-check">
                  <input v-model="eventEnabled" type="checkbox" :disabled="dungeonGenStore.rolling || dungeonGenStore.generating" />
                  读取动态事件
                </label>
                <span class="set-hint">按赛季/周期/阶位判定本轮生效的事件，其优先级高于骰值与自选</span>
              </div>
              <div class="cp-field">
                <label class="cp-label cp-label-check">
                  <input v-model="mateEnabled" type="checkbox" :disabled="(playerCR ?? 0) <= 4 || dungeonGenStore.rolling || dungeonGenStore.generating" />
                  匹配同人契约者
                </label>
                <select v-model="mateGender" class="cp-select" :disabled="!mateEnabled">
                  <option value="不限">不限</option>
                  <option value="男">男</option>
                  <option value="女">女</option>
                </select>
                <span v-if="(playerCR ?? 0) <= 4" class="set-hint">低 CR 没有榜单可退，队友本就是 IP 契约者</span>
              </div>
              <div v-if="eventEnabled && rollMode === 'custom'" class="refresh-err">
                ⚠️ 已开启动态事件：其优先级高于上方所有自选字段，冲突时以事件为准。
              </div>
            </div>

            <button
              class="roll-btn"
              :disabled="dungeonGenStore.rolling || dungeonGenStore.generating"
              @click="onRollClick"
            >
              {{ dungeonGenStore.rolling ? '掷骰中...' : rollMode === 'random' ? '🎲 掷骰' : '🎲 按自选条件掷骰' }}
            </button>

            <template v-if="dungeonGenStore.current">
              <div class="roll-section">
                <div class="roll-section-title">世界底色与局势</div>
                <div v-for="r in dungeonGenStore.current.buildRecords" :key="r.标签" class="roll-row">
                  <span class="roll-label">{{ r.标签 }}</span>
                  <span class="roll-expr">{{ r.表达式 }}</span>
                  <span class="roll-value">{{ r.骰值 }}</span>
                  <span class="roll-map">{{ r.映射 }}</span>
                </div>
                <div v-if="dungeonGenStore.current.customWorld" class="cp-world-badge">
                  指定世界观：《{{ dungeonGenStore.current.customWorld }}》
                </div>
              </div>
              <div class="roll-section">
                <div class="roll-section-title">奖励骰（{{ dungeonGenStore.current.rewardRecords.length }} 个）</div>
                <div v-for="r in dungeonGenStore.current.rewardRecords" :key="r.标签" class="roll-row">
                  <span class="roll-label">{{ r.标签 }}</span>
                  <span class="roll-expr">{{ r.表达式 }}</span>
                  <span class="roll-value">{{ r.骰值 }}</span>
                  <span class="roll-map">{{ r.映射 }}</span>
                </div>
              </div>
              <div v-if="current晋升" class="set-hint set-hint-inset">
                本次为晋升试炼，第 3 条支线的奖励由系统指定（不取上表第 3 组支线骰）
              </div>
              <button class="confirm-btn" :disabled="dungeonGenStore.generating" @click="onGenerateDungeon">
                {{ dungeonGenStore.generating ? '生成中...' : '生成副本' }}
              </button>

              <div v-if="dungeonGenStore.current?.result" class="dungeon-card">
                <div class="dc-name">{{ dungeonGenStore.current.result.副本名称 }}</div>
                <div v-if="dungeonGenStore.current.触发的动态事件?.length" class="dc-line">
                  <b>动态事件</b>
                  <span>{{ dungeonGenStore.current.触发的动态事件.join('、') }}</span>
                </div>
                <div class="dc-meta">{{ dungeonGenStore.current.result.副本来源 }}</div>
                <div class="dc-meta">
                  【{{ dungeonGenStore.current.build.副本类型 }}】 · {{ dungeonGenStore.current.build.时间限制天 }}天 ·
                  基准等级 Lv.{{ playerLevel }}
                </div>
                <div class="dc-bg">{{ dungeonGenStore.current.result.副本背景 }}</div>

                <details class="dc-details">
                  <summary>主线任务</summary>
                  <div class="dc-line">{{ dungeonGenStore.current.result.主线任务.名称 }}</div>
                  <div class="dc-sub">{{ dungeonGenStore.current.result.主线任务.说明 }}</div>
                </details>

                <details class="dc-details">
                  <summary>支线任务 ×3</summary>
                  <div v-for="t in dungeonGenStore.current.result.支线任务" :key="t.名称" class="dc-line">
                    <b>{{ t.名称 }}</b>
                    <div class="dc-sub">{{ t.说明 }}</div>
                  </div>
                </details>

                <details class="dc-details">
                  <summary>隐藏任务 ×2</summary>
                  <div v-for="t in dungeonGenStore.current.result.隐藏任务" :key="t.名称" class="dc-line">
                    <b>{{ t.名称 }}</b>
                    <div class="dc-sub">{{ t.说明 }}</div>
                  </div>
                </details>

                <details class="dc-details">
                  <summary>世界事件 ×2</summary>
                  <div v-for="e in dungeonGenStore.current.result.世界事件" :key="e.名称" class="dc-line">
                    <b>{{ e.名称 }}</b>
                    <div class="dc-sub">{{ e.说明 }}</div>
                    <div class="dc-sub">影响：{{ e.影响 }}</div>
                  </div>
                </details>

                <details class="dc-details">
                  <summary>副本成就 ×6</summary>
                  <div v-for="(a, i) in dungeonGenStore.current.result.副本成就" :key="a.名称" class="dc-line">
                    <b>{{ ACHIEVEMENT_TIERS[i] }} {{ a.名称 }}</b>
                    <div class="dc-sub">{{ a.难度 }}</div>
                  </div>
                </details>

                <details class="dc-details">
                  <summary>契约者名单 / 固有角色</summary>
                  <div class="dc-line">
                    <b>契约者</b>
                    <div class="dc-sub">
                      {{
                        dungeonGenStore.current.result.其他契约者
                          .map(c => '[' + (c.称号 === '无' ? '无称号' : c.称号) + ']' + c.真名 + ' Lv.' + c.等级)
                          .join('，')
                      }}
                    </div>
                  </div>
                  <div class="dc-line">
                    <b>固有角色</b>
                    <div class="dc-sub">
                      {{
                        dungeonGenStore.current.result.固有角色
                          .map(r => r.名称 + ' (Lv.' + clamp固有角色等级(r.位阶, r.等级) + ' | ' + r.位阶 + ')')
                          .join('，')
                      }}
                    </div>
                  </div>
                </details>

                <div v-if="dungeonGenStore.current.enemies?.length" class="enemy-block">
                  <div class="roll-section-title">副本角色</div>
                  <div class="set-hint">
                    📌 三种副本角色的生成规则已内置在本脚本里；但规则引用的系统模块（&lt;技能模版和限制&gt; /
                    &lt;装备效果强度限制&gt; / &lt;装备与消耗品系统&gt; / &lt;天赋系统&gt; / &lt;血统系统&gt; /
                    &lt;特殊技能模版&gt; 等）需要你到「终端设置 → 世界书」里勾选，否则生成的数值没有依据。
                  </div>

                  <div v-for="(slot, i) in dungeonGenStore.current.enemies" :key="slot.数据.名称" class="enemy-row">
                    <span class="wb-check" :class="{ on: enemyChecked[i] }" @click="onToggleEnemy(i)">{{
                      enemyChecked[i] ? '☑' : '☐'
                    }}</span>
                    <span class="enemy-name">{{ slot.数据.名称 }}</span>
                    <span class="enemy-kind">{{ slot.数据.类型 }}</span>
                    <span class="enemy-lv">Lv.{{ slot.数据.等级 }}</span>
                    <span v-if="slot.已写入" class="enemy-wrote">✓ 已写入</span>
                  </div>

                  <div class="dc-actions">
                    <button class="confirm-btn" :disabled="dungeonGenStore.writingEnemies" @click="onWriteEnemies">
                      {{ dungeonGenStore.writingEnemies ? '写入中...' : '写入选中的' }}
                    </button>
                  </div>

                  <div
                    v-for="slot in dungeonGenStore.current.enemies.filter(s => s.面板)"
                    :key="'p-' + slot.数据.名称"
                    class="enemy-panel"
                  >
                    <div class="roll-section-title">{{ slot.数据.名称 }} · 状态卡</div>
                    <pre class="enemy-panel-text">{{ slot.面板 }}</pre>
                    <button class="confirm-btn modify" @click="onCopyEnemyPanel(slot.面板)">复制面板文本</button>
                  </div>
                </div>

                <div class="dc-actions">
                  <button
                    class="confirm-btn"
                    :disabled="dungeonGenStore.writing"
                    @click="onWriteDungeon(dungeonGenStore.current.id)"
                  >
                    {{ dungeonGenStore.current.written ? '已写入存档' : '写入存档' }}
                  </button>
                  <button class="confirm-btn modify" @click="onFillDungeonInput(dungeonGenStore.current.id)">
                    填入输入框
                  </button>
                  <button class="confirm-btn modify" @click="onCopyPanel(dungeonGenStore.current)">复制面板文本</button>
                  <button
                    class="confirm-btn reroll"
                    :disabled="dungeonGenStore.rolling || dungeonGenStore.generating || dungeonGenStore.writingEnemies"
                    @click="onRerollDungeonGen"
                  >
                    🔄 重roll
                  </button>
                  <button
                    class="confirm-btn"
                    :disabled="dungeonGenStore.generatingEnemies || dungeonGenStore.writingEnemies"
                    @click="onGenerateEnemies"
                  >
                    {{ dungeonGenStore.generatingEnemies ? '生成中...' : '敌人生成' }}
                  </button>
                </div>
              </div>

              <div v-if="dungeonGenStore.rolledDungeons.length > 1" class="roll-section">
                <div class="roll-section-title">历史记录</div>
                <div
                  v-for="d in dungeonGenStore.rolledDungeons"
                  :key="d.id"
                  class="roll-row"
                  :class="{ active: dungeonGenStore.current?.id === d.id }"
                  @click="!dungeonGenStore.writingEnemies && dungeonGenStore.select(d.id)"
                >
                  <span class="roll-label">{{ d.result?.副本名称 || '（未生成）' }}</span>
                  <span class="roll-expr">{{ d.build.副本类型 }}</span>
                  <span class="roll-map">{{ d.createdAt }}</span>
                  <button
                    class="retry-link"
                    :disabled="dungeonGenStore.writingEnemies"
                    @click.stop="dungeonGenStore.remove(d.id)"
                  >
                    删除
                  </button>
                </div>
              </div>
            </template>

            <div v-else class="empty-state">
              <div class="empty-text">尚未掷骰</div>
              <div class="empty-sub">点上面的按钮掷出副本类型、世界底色、局势、IP 热度与全部奖励骰</div>
            </div>
          </div>

          <div v-if="dungeonGenStore.generating" class="gen-overlay">
            <div class="gen-spinner"></div>
            <span>AI 正在构建副本...</span>
          </div>
        </div>

        <!-- ============ 副本结算 ============ -->
        <div v-if="currentView === 'settlement'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="goDesktop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">副本结算</span><span class="hdr-spacer"></span>
          </div>

          <div class="scroll-area">
            <div v-if="settlementStore.lastError" class="refresh-err">{{ settlementStore.lastError }}</div>

            <template v-if="!settlementStore.settlement">
              <div class="set-hint">
                结算会读取当前副本的任务与奖励、并读取聊天记录判定完成情况。确认写入前不会改动任何变量。
              </div>
              <button class="roll-btn" :disabled="settlementStore.generating" @click="onGenerateSettlement">
                {{ settlementStore.generating ? '结算中...' : '副本结算' }}
              </button>
            </template>

            <template v-else>
              <!-- 资格分逐项: 规则第二步要求「明文逐项展示」, 而规则给的面板模板里没有分项行 —— 面板保持严格模板, 分项放这里 -->
              <div class="settlement-scores">
                <div class="ss-title">资格分逐项 · 本次 {{ settlementStore.settlement.计算结果.资格分_本次 }}</div>
                <div class="ss-row">
                  <span>评价分</span><span>{{ settlementStore.settlement.计算结果.资格分_评价 }}</span>
                </div>
                <div class="ss-row">
                  <span>击杀分</span><span>{{ settlementStore.settlement.计算结果.资格分_击杀 }}</span>
                </div>
                <div class="ss-row">
                  <span>任务分</span><span>{{ settlementStore.settlement.计算结果.资格分_任务 }}</span>
                </div>
                <!-- 规则第十一步要求「本次资格分**累加进赛季资格分**并明文展示」: 上面三行只有「本次」,
             而真正写进存档的是「旧资格分 + 本次」= 新资格分 —— 不摆出来玩家无从核对写进去的是什么。 -->
                <div class="ss-row">
                  <span>赛季累计（结算后）</span><span>{{ settlementStore.settlement.计算结果.新资格分 }}</span>
                </div>
              </div>

              <div class="roll-section">
                <div class="roll-section-title">结算面板（数字全部来自模块计算, 可直接复制）</div>
                <pre class="enemy-panel-text">{{ settlementStore.settlement.面板 }}</pre>
              </div>

              <div class="set-hint">
                面板的「掉落清单」列的是本次掉落量；写进存档的「背包.数量」是已有 + 本次的余额 —— 两者语义不同,
                不是不一致。
              </div>

              <div class="dc-actions">
                <button class="confirm-btn modify" @click="onCopySettlementPanel">复制面板文本</button>
                <!-- 写入成功后才可用: 本模块是累加语义, 结算必须真正落进存档, 面板上的数才与存档同源 -->
                <button
                  class="confirm-btn modify"
                  :disabled="
                    settlementStore.generating || settlementStore.writing || !settlementStore.settlement.写入完成
                  "
                  @click="onFillSettlementInput"
                >
                  填入输入框
                </button>
                <button
                  class="confirm-btn reroll"
                  :disabled="
                    settlementStore.generating ||
                    settlementStore.writing ||
                    settlementStore.settlement.已写入 ||
                    settlementStore.settlement.写入完成
                  "
                  @click="onGenerateSettlement"
                >
                  {{ settlementStore.generating ? '结算中...' : '🔄 重算' }}
                </button>
                <button
                  class="confirm-btn"
                  :disabled="
                    settlementStore.generating ||
                    settlementStore.writing ||
                    settlementStore.settlement.已写入 ||
                    settlementStore.settlement.写入完成
                  "
                  @click="onConfirmSettlement"
                >
                  {{
                    settlementStore.settlement.已写入
                      ? '已写入（回读失败）'
                      : settlementStore.settlement.写入完成
                        ? '已写入存档'
                        : settlementStore.writing
                          ? '写入中...'
                          : '确认结算'
                  }}
                </button>
                <button
                  class="confirm-btn reroll"
                  :disabled="settlementStore.generating || settlementStore.writing || settlementStore.settlement.已写入"
                  @click="onDiscardSettlement"
                >
                  放弃本次结算
                </button>
              </div>
              <!-- 已写入 = 变量已经落进存档（只是回读没核对上）: 累加语义下重试会让整份结算翻倍, 重算/确认入口都锁掉 -->
              <div class="set-hint">
                「放弃本次结算」只丢弃这份预览（面板文本与「填入输入框」的提示词将无法再取得），不会撤销已经写入存档的数值。
              </div>
              <div v-if="settlementStore.settlement.已写入" class="set-hint settle-warn">
                ⚠ 本次结算已经写进存档（回读校验失败, 明细见上方红框）。累加语义下再次结算会让数值翻倍，请先读存档确认。
              </div>
              <div v-else-if="settlementStore.settlement.写入完成" class="set-hint">
                ✓
                本次结算已写入存档。点「填入输入框」把玩家送进回廊的结算空间（只填入、不发送）。重复结算会让数值翻倍，重算/确认入口已锁住。
              </div>
              <div v-else class="set-hint settle-warn">⚠ 确认后会写入存档并清空副本资料，不可撤销</div>
            </template>
          </div>

          <div v-if="settlementStore.generating" class="gen-overlay">
            <div class="gen-spinner"></div>
            <span>AI 正在结算副本...</span>
          </div>
          <!-- writing 期间全屏遮罩: 遮住返回按钮与整页, 结算写入不可中断也不可半途切走 -->
          <div v-if="settlementStore.writing" class="write-mask">
            <div class="gen-spinner"></div>
            <span>正在写入存档...</span>
          </div>
        </div>

        <!-- ============ PVP ARENA ============ -->
        <div v-if="currentView === 'arena' && arenaView === 'list'" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="goDesktop">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">PvP竞技场</span><span class="hdr-spacer"></span>
          </div>

          <!-- 我的构筑区 -->
          <div class="scroll-area arena-my">
            <div class="set-block">
              <div class="set-label">我的构筑</div>
              <div v-if="workshopStore.mySave" class="my-save-preview">
                <div class="ms-name">
                  {{ workshopStore.mySave.契约者.头部.姓名 || '未命名' }} · Lv.{{
                    workshopStore.mySave.契约者.头部.等级 ?? 0
                  }}
                </div>
                <div class="ms-meta">
                  {{ workshopStore.mySave.契约者.头部.阶位 || '一阶' }} ·
                  {{ workshopStore.mySave.契约者.职业.名称 || '无职业' }}
                </div>
              </div>
              <div class="set-row arena-actions">
                <button class="fab-btn arena-upload" @click="onExtractSave" :disabled="workshopStore.extracting">
                  {{ workshopStore.extracting ? '提取中...' : '上传角色构筑' }}
                </button>
                <button v-if="workshopStore.mySave" class="fab-btn arena-edit" @click="openArenaEdit()">
                  编辑构筑
                </button>
                <button v-if="workshopStore.mySave" class="fab-btn arena-dl" @click="workshopStore.downloadMySave()">
                  下载存档
                </button>
              </div>
            </div>
            <div class="set-block">
              <div class="set-label">AI 生成简介</div>
              <label class="wb-row toggle-row"
                ><input type="checkbox" v-model="workshopStore.aiIntroEnabled" /><span
                  >提取后自动生成一句话简介（可关）</span
                ></label
              >
            </div>
          </div>

          <!-- 对手列表 -->
          <div class="arena-section-label">契约者对手库</div>
          <div v-if="workshopStore.loadingContracts" class="gen-overlay">
            <div class="gen-spinner"></div>
            <span>读取契约者角色库...</span>
          </div>
          <template v-else>
            <div v-if="workshopStore.worldbookError" class="refresh-err">{{ workshopStore.worldbookError }}</div>
            <div v-else-if="workshopStore.contracts.length === 0" class="empty-state">
              <div class="empty-icon">⚔️</div>
              <div class="empty-text">契约者角色库为空</div>
              <div class="empty-sub">作者可在「终端设置 → 收录契约者」添加对手；或玩家先上传自己的构筑发给作者</div>
            </div>
            <div v-else class="scroll-area">
              <template v-for="g in tieredContracts" :key="g.tier">
                <div class="tier-label">{{ g.label }}</div>
                <div
                  v-for="c in g.cards"
                  :key="c.name"
                  class="contract-card"
                  @click="
                    viewingCard = c;
                    arenaView = 'detail';
                  "
                >
                  <div class="cc-top">
                    <span class="cc-name">{{ c.name }}</span
                    ><span class="cc-lv">Lv.{{ c.等级 }}</span>
                  </div>
                  <div class="cc-meta">{{ c.军衔 }} · {{ c.职业 }}</div>
                  <div v-if="c.简介" class="cc-intro">{{ c.简介 }}</div>
                  <div class="cc-foot">
                    <span>{{ c.上传者 || '匿名' }}</span
                    ><span class="cc-tag">{{ c.阶位 }}</span>
                  </div>
                </div>
              </template>
            </div>
          </template>
        </div>

        <!-- 构筑编辑页（模块化结构化表单） -->
        <div v-if="currentView === 'arena' && arenaView === 'edit' && workshopStore.mySave" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="arenaView = 'list'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">编辑构筑</span><span class="hdr-spacer"></span>
          </div>
          <div class="scroll-area arena-edit-form">
            <!-- 外貌栏（可选） -->
            <div class="set-block">
              <div class="set-label">外貌（可选，不填则对战时自动用装备生成）</div>
              <textarea
                v-model="workshopStore.mySave.外貌"
                class="dialog-input"
                rows="2"
                placeholder="如：身披黑色风衣、腰间别着长刀的冷面契约者"
              ></textarea>
            </div>
            <!-- 简介栏 -->
            <div class="set-block">
              <div class="set-label">简介（可手改 AI 生成结果）</div>
              <textarea
                v-model="workshopStore.mySave.简介"
                class="dialog-input"
                rows="2"
                placeholder="一句话卖点"
              ></textarea>
            </div>
            <!-- 六模块表单 -->
            <div v-for="mod in editModules" :key="mod.key" class="set-block edit-module">
              <div class="set-label">{{ mod.label }}</div>
              <EditableObject
                :value="workshopStore.mySave.契约者[mod.key]"
                @update:value="v => (workshopStore.mySave.契约者[mod.key] = v)"
              />
            </div>
            <div class="set-row arena-actions" style="margin-top: 12px">
              <button class="fab-btn arena-dl" @click="workshopStore.downloadMySave()">校验并下载</button>
            </div>
          </div>
        </div>

        <!-- 对手详情页 -->
        <div v-if="currentView === 'arena' && arenaView === 'detail' && viewingCard" class="app-page">
          <div class="app-header">
            <button class="hdr-btn" @click="arenaView = 'list'">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">{{ viewingCard.name }}</span
            ><span class="hdr-spacer"></span>
          </div>
          <div class="scroll-area arena-detail">
            <div class="set-block">
              <div class="set-label">契约者信息</div>
              <div class="cd-name">
                {{ viewingCard.name }} <span class="cd-tag">{{ viewingCard.阶位 }}</span>
              </div>
              <div class="cd-meta">Lv.{{ viewingCard.等级 }} · {{ viewingCard.军衔 }} · {{ viewingCard.职业 }}</div>
              <div v-if="viewingCard.外貌" class="cd-appearance">外貌：{{ viewingCard.外貌 }}</div>
              <div v-if="viewingCard.简介" class="cd-intro">{{ viewingCard.简介 }}</div>
              <div class="cd-foot">上传者：{{ viewingCard.上传者 || '匿名' }}</div>
            </div>
            <div v-if="viewingCard.save.契约者.职业.名称" class="set-block">
              <div class="set-label">职业</div>
              <div class="cd-job">
                {{ viewingCard.save.契约者.职业.名称 }}（{{ viewingCard.save.契约者.职业.稀有度 || '未知' }}）
              </div>
              <div v-if="viewingCard.save.契约者.职业.转职阶段" class="cd-sub">
                {{ viewingCard.save.契约者.职业.转职阶段 }}
              </div>
            </div>
            <div v-if="viewingCard.save.契约者.属性.实际" class="set-block">
              <div class="set-label">属性</div>
              <div class="cd-attrs">
                <span>STR {{ viewingCard.save.契约者.属性.实际.STR ?? 0 }}</span
                ><span>AGI {{ viewingCard.save.契约者.属性.实际.AGI ?? 0 }}</span
                ><span>CON {{ viewingCard.save.契约者.属性.实际.CON ?? 0 }}</span
                ><span>PER {{ viewingCard.save.契约者.属性.实际.PER ?? 0 }}</span>
              </div>
            </div>
            <div v-if="Object.keys(viewingCard.save.契约者.装备 || {}).length" class="set-block">
              <div class="set-label">装备</div>
              <div v-for="(slot, sk) in viewingCard.save.契约者.装备" :key="sk" class="cd-slot">
                <span class="cd-slot-name">{{ sk }}</span
                ><span>{{ slot?.名称 || '无' }}</span>
              </div>
            </div>
          </div>
          <div class="arena-bottom-bar">
            <button class="fab-btn arena-battle" @click="showBattleConfirm = true">⚔️ 发起对战</button>
          </div>
        </div>

        <!-- 对战确认弹窗 -->
        <div
          v-if="currentView === 'arena' && showBattleConfirm"
          class="dialog-mask"
          @click.self="showBattleConfirm = false"
        >
          <div class="dialog-box">
            <div class="dialog-title">发起对战</div>
            <div class="dialog-body">将把「{{ viewingCard?.name }}」写入当前敌人数据，并开始对战。确定吗？</div>
            <div class="dialog-btns">
              <button class="dialog-btn cancel" @click="showBattleConfirm = false">取消</button>
              <button class="dialog-btn confirm" @click="onStartBattle">发起</button>
            </div>
          </div>
        </div>

        <!-- ============ STATUSBAR PAGE（状态栏：收进手机框内的 app 页面） ============ -->
        <!-- ============ MARKET ============ -->
        <div v-if="currentView === 'market'" class="app-page">
          <MarketView @close="goDesktop" />
        </div>

        <!-- ============ CRAFTING ============ -->
        <div v-if="currentView === 'crafting'" class="app-page">
          <CraftingView @close="goDesktop" @goto-market="onGotoMarket" />
        </div>

        <!-- ============ RANK（玩家排行榜） ============ -->
        <div v-if="currentView === 'rank'" class="app-page">
          <RankView @close="goDesktop" />
        </div>

        <!-- ============ STATUSBAR ============ -->
        <div v-if="currentView === 'statusbar'" class="app-page sb-page">
          <div class="app-header">
            <button class="hdr-btn" @click="closeStatusbar">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="15 18 9 12 15 6" />
              </svg></button
            ><span class="hdr-title">契约者状态档案</span><span class="hdr-spacer"></span>
          </div>
          <div ref="sbBodyRef" class="sb-body"></div>
        </div>
        </div>
      </div></div
  ></Transition>
</template>

<script setup lang="ts">
import {
  useForumStore,
  useCareerStore,
  useDungeonStore,
  useWorkshopStore,
  useDungeonGenStore,
  useSettlementStore,
} from './store';
import {
  SECTIONS,
  RANK_BOARDS,
  type ForumThread,
  type CareerPlan,
  type CareerRoadmap,
  type DungeonStrategy,
  type Faction,
  type DungeonMode,
  type WorkshopCard,
  DUNGEON_MODES,
  TIER_ORDER,
} from './data';
import ApiFields from './ApiFields.vue';
import EditableObject from './EditableObject.vue';
import MarketView from './market/MarketView.vue';
import { useMarketStore } from './market/store';
import RankView from './rank/RankView.vue';
import CraftingView from './crafting/CraftingView.vue';
import {
  isNewbieDungeon,
  归一位阶,
  GENRES,
  ERAS,
  FEATURE_TAGS,
  SUB_MODULES,
  MEDIA_SOURCES,
  type BuildOverrides,
} from './dice';
import { clamp固有角色等级 } from './dungeonRules';
import { mountStatusbar } from './statusbar/core';
import { canUseHubFacility, HUB_GATE_HINT } from './hubGate';
import './statusbar/theme.scss';

const store = useForumStore();
const careerStore = useCareerStore();
const dungeonStore = useDungeonStore();
const workshopStore = useWorkshopStore();
const dungeonGenStore = useDungeonGenStore();
const settlementStore = useSettlementStore();
const marketStore = useMarketStore();
const SK = 'wxhl003_btn_pos';

// ============ 视口尺寸（visualViewport → 自身 → 父窗口回退）============
// 视口尺寸：自身优先 → 父窗口回退（参考代码方案）
function getVW(): number {
  // 脚本运行在隐藏 iframe 中：优先从父窗口（酒馆主页面）获取 visualViewport
  try {
    if (window.parent !== window && window.parent.visualViewport && window.parent.visualViewport.width > 0)
      return window.parent.visualViewport.width;
  } catch (e) {}
  try {
    if (window.visualViewport && window.visualViewport.width > 0) return window.visualViewport.width;
  } catch (e) {}
  let w = window.innerWidth || document.documentElement.clientWidth || 0;
  if (w === 0 && window.parent !== window) {
    try {
      let pw = window.parent.innerWidth || window.parent.document.documentElement.clientWidth || 0;
      if (pw > 0) w = pw;
    } catch (e) {}
  }
  return w > 0 ? w : 800;
}
function getVH(): number {
  try {
    if (window.parent !== window && window.parent.visualViewport && window.parent.visualViewport.height > 0)
      return window.parent.visualViewport.height;
  } catch (e) {}
  try {
    if (window.visualViewport && window.visualViewport.height > 0) return window.visualViewport.height;
  } catch (e) {}
  let h = window.innerHeight || document.documentElement.clientHeight || 0;
  if (h === 0 && window.parent !== window) {
    try {
      let ph = window.parent.innerHeight || window.parent.document.documentElement.clientHeight || 0;
      if (ph > 0) h = ph;
    } catch (e) {}
  }
  return h > 0 ? h : 600;
}

/**
 * 手机布局判定（与 mobile-compat.js 的 isPhone 同口径：粗指针 / 无悬停 / 视口 ≤768）。
 * 手机端悬浮按钮由 mobile-compat 独占定位与拖动（指针捕获 + visualViewport 夹取 + 位置持久化），
 * Vue 这套（btnStyle 内联 + mobile/tablet-mode 强制 CSS + 触摸拖动）在手机端一律让位，
 * 否则两套互相 removeProperty / placeButton 吸回，把按钮顶到角落锁死（bug #2）。
 */
function isMobileLayout(): boolean {
  try {
    const w = window.parent !== window ? window.parent : window;
    const coarse = w.matchMedia?.('(pointer: coarse)')?.matches;
    const noHover = w.matchMedia?.('(hover: none)')?.matches;
    const vw = w.visualViewport?.width || w.innerWidth || 9999;
    return Boolean(coarse || noHover || vw <= 768);
  } catch (e) {
    return false;
  }
}

// ============ 状态 ============
const expanded = ref(false);
const currentView = ref<
  'desktop' | 'forum' | 'settings' | 'career' | 'dungeon' | 'arena' | 'dungeonRoll' | 'settlement' | 'statusbar' | 'market' | 'crafting'
>('desktop');
const settingsPage = ref('');
const activeThread = ref<ForumThread | null>(null);
const desktopPage = ref(0);
const replyDraft = ref('');
const showPostDialog = ref(false);
const postTitle = ref('');
const postContent = ref('');
const isDragging = ref(false);
const deviceMode = ref('desktop');
const userDragged = ref(false);
const careerView = ref<'list' | 'detail'>('list');
const viewingPlan = ref<CareerPlan | null>(null);
const viewingRoadmap = ref<CareerRoadmap | null>(null);
const newPlanKeywords = ref('');
const showNewDialog = ref(false);
const showModifyDialog = ref(false);
const deleteTargetId = ref(0);

// ============ 副本攻略状态 ============
const dungeonView = ref<'list' | 'detail'>('list');
const viewingDungeon = ref<DungeonStrategy | null>(null);
const showDungeonWizard = ref(false);
const dungeonFaction = ref<Faction>('中立');
const dungeonStep = ref<'faction' | 'choice' | 'goal' | 'mode'>('faction');
const dungeonGoal = ref('');
const dungeonMode = ref<DungeonMode>('speedrun');
const dungeonModifyId = ref(0);

// ============ 竞技场状态 ============
const arenaView = ref<'list' | 'detail' | 'edit'>('list');
const viewingCard = ref<WorkshopCard | null>(null);
const showBattleConfirm = ref(false);

// ============ 状态栏页面（收进手机框内的 app 页，框体随之展开） ============
const sbBodyRef = ref<HTMLElement | null>(null);
let sbUnmount: (() => void) | null = null;
async function mountStatusbarPage() {
  await nextTick();
  if (sbBodyRef.value && !sbUnmount) {
    sbUnmount = mountStatusbar(sbBodyRef.value);
  }
}
function teardownStatusbar() {
  sbUnmount?.();
  sbUnmount = null;
}
function openStatusbar() {
  currentView.value = 'statusbar';
  mountStatusbarPage();
}
function closeStatusbar() {
  teardownStatusbar();
  currentView.value = 'desktop';
}
// 状态栏核心是命令式挂载（非 Vue 渲染），离开页面或最小化手机时要卸载，回来时在原位重挂载
watch(currentView, v => {
  if (v !== 'statusbar') teardownStatusbar();
});
watch(expanded, v => {
  if (!v) teardownStatusbar();
  else if (currentView.value === 'statusbar') mountStatusbarPage();
});
onUnmounted(teardownStatusbar);

// ============ 桌面待机铭牌 ============
const idle = reactive({
  name: '---',
  lv: 1,
  tier: '一阶',
  army: '列兵',
  hpCur: 0,
  hpMax: 0,
  mpCur: 0,
  mpMax: 0,
  spCur: 0,
  spMax: 0,
});
const idleHpPct = computed(() => Math.min((idle.hpCur / Math.max(idle.hpMax, 1)) * 100, 100));
const idleMpPct = computed(() => Math.min((idle.mpCur / Math.max(idle.mpMax, 1)) * 100, 100));
const idleSpPct = computed(() => Math.min((idle.spCur / Math.max(idle.spMax, 1)) * 100, 100));
function refreshIdle() {
  try {
    if (typeof Mvu === 'undefined') return;
    const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
    const c = data?.stat_data?.契约者;
    if (!c) return;
    idle.name = c.头部?.姓名 ?? '---';
    idle.lv = Number(c.头部?.等级) || 1;
    idle.tier = c.头部?.阶位 ?? '一阶';
    idle.army = c.头部?.军衔 ?? '列兵';
    idle.hpCur = Number(c.衍生属性?.HP_当前) || 0;
    idle.hpMax = Number(c.衍生属性?.HP_最大) || 0;
    idle.mpCur = Number(c.衍生属性?.MP_当前) || 0;
    idle.mpMax = Number(c.衍生属性?.MP_最大) || 0;
    idle.spCur = Number(c.衍生属性?.耐力_当前) || 0;
    idle.spMax = Number(c.衍生属性?.耐力_最大) || 0;
  } catch (_) {
    /* 读取失败保持占位 */
  }
}
onMounted(refreshIdle);
watch(expanded, v => {
  if (v) refreshIdle();
});

// ============ 桌面图标状态行 ============
const appSubs = computed(() => ({
  forum: store.threads.length ? `${store.threads.length} 帖` : '暂无帖子',
  settings: '系统',
  career: careerStore.plans.length ? `${careerStore.plans.length} 方案` : '未规划',
  dungeon: dungeonStore.dungeons.length ? `${dungeonStore.dungeons.length} 攻略` : '未开荒',
  arena: workshopStore.contracts.length ? `${workshopStore.contracts.length} 契约` : '无契约',
  roll: dungeonGenStore.rolledDungeons.length ? `${dungeonGenStore.rolledDungeons.length} 次掷骰` : '未掷骰',
  market: '以物易物，童叟无欺',
  crafting: '千锤百炼，巧夺天工',
  rank: '以等级论高下',
  settlement: '结算空间',
  statusbar: idle.name,
}));
async function onStartBattle() {
  if (!viewingCard.value) return;
  const ok = await workshopStore.startBattle(viewingCard.value);
  if (ok) {
    showBattleConfirm.value = false;
    collapse();
  }
}
async function onRemoveContract(name: string) {
  if (window.confirm('确认移除契约者「' + name + '」？')) await workshopStore.removeContract(name);
}

// ============ 副本生成 ============
const playerCycle = ref<number>(1);
// 注: 不能叫 playerTier —— 该名已被下方排行榜的 computed 占用
const playerTierName = ref<string>('一阶');
/** 契约者 CR: 决定同人契约者开关是否可用（与 `buildMatchPool` 的 `cr <= 4` 同一条分界线） */
const playerCR = ref(0);
/**
 * 本轮是否晋升试炼 —— 读条目上**掷骰时**记下的快照。
 *
 * 不在这里重算: 判定（阶位上限表 + 边界谓词）的唯一来源是 store 的 `readPlayerBrief`,
 * 面板再抄一份的话, 改了那边忘了这边, 这条提示就会对奖励说谎。
 */
const current晋升 = computed(() => dungeonGenStore.current?.晋升试炼 ?? false);
const playerCycleLabel = computed(() =>
  isNewbieDungeon(playerCycle.value, playerTierName.value)
    ? '当前副本周期 1 · 新手副本 · 强制和平 · 仅 1 名 IP 队友'
    : `当前副本周期 ${playerCycle.value} · 常规副本`,
);

function refreshPlayerCycle() {
  try {
    let vars: any = {};
    try {
      const mid = typeof getCurrentMessageId === 'function' ? getCurrentMessageId() : -1;
      if (mid && mid !== -1) vars = getVariables?.({ type: 'message', message_id: mid }) ?? {};
    } catch (_) {}
    if (!vars?.stat_data?.契约者) {
      try {
        vars = getVariables?.({ type: 'message', message_id: -1 }) ?? {};
      } catch (_) {}
    }
    if (!vars?.stat_data?.契约者) {
      try {
        vars = getVariables?.({ type: 'chat' }) ?? {};
      } catch (_) {}
    }
    playerCycle.value = Number(vars?.stat_data?.契约者?.赛季信息?.当前副本周期) || 1;
    playerTierName.value = String(vars?.stat_data?.契约者?.头部?.阶位 ?? '') || '一阶';
    playerLevel.value = Number(vars?.stat_data?.契约者?.头部?.等级) || 1;
    playerCR.value = Number(vars?.stat_data?.契约者?.头部?.CR) || 0;
  } catch (_) {
    playerCycle.value = 1;
    playerTierName.value = '一阶';
    playerCR.value = 0;
  }
}

function openDungeonRoll() {
  currentView.value = 'dungeonRoll';
  dungeonGenStore.lastError = '';
  refreshPlayerCycle();
  // 进入面板时也同步一次 —— 选中没变时上面的 watch 不会触发, 而面板必须反映当前条目的开关
  syncSwitchesFromCurrent();
}

function openMarket() {
  // 世界限定（#6）：自由市场仅在回廊/现实可用，副本内禁用
  if (!canUseHubFacility()) {
    toastr.warning(HUB_GATE_HINT);
    return;
  }
  currentView.value = 'market';
}

/** 工坊→市场联动：记录待上架物品名，切到市场后由 MarketView 预选 */
function onGotoMarket(name: string) {
  if (!canUseHubFacility()) {
    toastr.warning(HUB_GATE_HINT);
    return;
  }
  marketStore.pendingSell = name;
  currentView.value = 'market';
}

function openCrafting() {
  // 世界限定（#6）：工坊仅在回廊/现实可用，副本内禁用
  if (!canUseHubFacility()) {
    toastr.warning(HUB_GATE_HINT);
    return;
  }
  currentView.value = 'crafting';
}

function openRank() {
  currentView.value = 'rank';
}

// ============ 副本生成 · 自选模式 ============
const rollMode = ref<'random' | 'custom'>('random');
const customWorld = ref('');
const customMateWorld = ref('');
const customMateNames = ref('');
/** 每轮单独选: 是否额外匹配 1 名同人契约者（CR≥5 时才有意义, 低 CR 会禁用） */
const mateEnabled = ref(false);
const mateGender = ref<'男' | '女' | '不限'>('不限');
/** 每轮单独选: 是否读取 EJS 动态事件。默认开（用户 2026-09-25 拍板） */
const eventEnabled = ref(true);
const customPicks = ref<Record<string, string>>({
  媒介来源: '',
  题材大类: '',
  时代背景: '',
  核心特色标签: '',
  队友标签: '',
  副模块: '',
});
const CUSTOM_OPTIONS = [
  { key: '媒介来源', label: '媒介来源', values: MEDIA_SOURCES },
  { key: '题材大类', label: '题材大类', values: GENRES },
  { key: '时代背景', label: '时代背景', values: ERAS },
  { key: '核心特色标签', label: '特色标签', values: FEATURE_TAGS },
  // 队友标签是独立于核心特色标签的第二颗 1d50（圈定 IP 队友来源范围）, 故单列一项。
  // 它的覆盖分支（含 markRecordSelfPick）在 dice.ts 里早已就绪 —— 少了这个下拉, 那条路径
  // 在产品里没有任何入口, 从 UI 侧看就是死代码。
  { key: '队友标签', label: '队友标签', values: FEATURE_TAGS },
  { key: '副模块', label: '副模块', values: SUB_MODULES },
] as const;

/**
 * 把面板开关同步成「当前条目的事实」。
 *
 * `generate()` 读的是**条目**上的 `事件开关` / `同人开关`（掷骰那一刻记下的）, 而面板控件是
 * **下一次掷骰的「输入」** —— 两者是不同的东西。选中一条历史条目时若不单向同步, 面板会显示
 * 与这一轮实际行为不符的勾选, 最坏是一条误导性警告: 面板写着「事件优先」而这一轮根本不注入事件。
 *
 * 不做成 computed: 控件仍必须能被用户自由编辑。
 */
function syncSwitchesFromCurrent() {
  const cur = dungeonGenStore.current;
  if (!cur) return;
  eventEnabled.value = cur.事件开关 ?? true;
  mateEnabled.value = cur.同人开关 ?? false;
  mateGender.value = cur.同人性别 ?? '不限';
}
// 选中历史条目（`select` 只改 selectedId, `current` 是 computed → id 一变就触发）时同步
watch(() => dungeonGenStore.current?.id, syncSwitchesFromCurrent);

function onRollClick() {
  const 同人 = { 开关: mateEnabled.value, 性别: mateGender.value };
  if (rollMode.value === 'random') {
    dungeonGenStore.doRoll(同人, eventEnabled.value);
    return;
  }
  const overrides: BuildOverrides = {};
  for (const o of CUSTOM_OPTIONS) {
    const v = customPicks.value[o.key];
    if (v) overrides[o.key] = v;
  }
  dungeonGenStore.doCustomRoll(
    overrides, customWorld.value, customMateWorld.value, customMateNames.value, 同人, eventEnabled.value,
  );
}
async function onGenerateDungeon() {
  await dungeonGenStore.generate();
}

function openSettlement() {
  currentView.value = 'settlement';
  // 只清错误, **不清预览**（与 openDungeonRoll 同款）: `computeSettlement` 的 RP/PEXP 带随机掷骰,
  // 重新结算会得到一组不同的数 —— 若玩家已把上一份面板复制给聊天, 清掉它就会造出
  // 「聊天里看到的」与「写进存档的」不同源, 恰好违反本模块的核心不变量。
  settlementStore.lastError = '';
}
async function onGenerateSettlement() {
  await settlementStore.generateSettlement();
}
async function onConfirmSettlement() {
  await settlementStore.writeSettlement();
}
/** 把「进入回廊结算空间」的提示词填入输入框（只填入不发送）; 守卫与提示都在 store 的 fillInput 里 */
async function onFillSettlementInput() {
  await settlementStore.fillInput();
}
/**
 * 放弃当前预览（`reset()` 的唯一调用点）。
 *
 * 会丢掉一份**已付过 AI 费用**的面板, 故先 `confirm` 二次确认。
 * 已经写进存档的数值**不会**因此撤销 —— 那条路径由 `已写入` 拦在按钮的 `:disabled` 上,
 * 这里再兜一道（否则一旦 disabled 没跟上, 玩家会连同「已写入、请读存档确认」这条警示一起丢掉）。
 */
function onDiscardSettlement() {
  if (!settlementStore.settlement) return;
  if (settlementStore.settlement.已写入) return;
  if (
    !window.confirm(
      '放弃这份结算预览？\n\n· 面板文本与「填入输入框」的提示词将无法再取得（本次 AI 费用不退）\n· 已写入存档的数值不会因此撤销\n\n确定放弃？',
    )
  )
    return;
  settlementStore.reset();
}
/** 复制结算面板（复用副本生成的面板复制逻辑, 只是文本来源不同） */
async function onCopySettlementPanel() {
  await onCopyPanel({ panelText: settlementStore.settlement?.面板 });
}

const ACHIEVEMENT_TIERS = ['★ 探索级', '★★ 挑战级', '★★★ 破局级', '★★★★ 史诗级', '★★★★★ 传说级', '★★★★★★ 世界天花板'];
const playerLevel = ref(1);

async function onWriteDungeon(id: number) {
  await dungeonGenStore.writeToSave(id);
}
async function onFillDungeonInput(id: number) {
  await dungeonGenStore.fillInput(id);
}
function onRerollDungeonGen() {
  // 透传当前面板的开关: 重 roll 是「同一轮再来一次」, 不该把玩家勾的开关悄悄重置
  dungeonGenStore.reroll({ 开关: mateEnabled.value, 性别: mateGender.value }, eventEnabled.value);
}

/** 复制 <Panel Enhancement> 面板文本, 用于贴给别人或存底 */
async function onCopyPanel(entry: { panelText?: string }) {
  if (!entry?.panelText) {
    toastr.info('还没有面板文本');
    return;
  }
  try {
    await navigator.clipboard.writeText(entry.panelText);
    toastr.success('面板文本已复制');
  } catch (e: any) {
    toastr.error('复制失败: ' + (e?.message || e));
  }
}

/** 敌人生成: 三个副本角色的勾选状态, 默认全勾 */
const enemyChecked = ref<boolean[]>([true, true, true]);

// 切换历史条目时勾选状态重置为全勾 —— 否则上一条目的取消会带到下一条
watch(
  () => dungeonGenStore.current?.id,
  () => {
    enemyChecked.value = [true, true, true];
  },
);

async function onGenerateEnemies() {
  enemyChecked.value = [true, true, true];
  await dungeonGenStore.generateEnemies();
}

function onToggleEnemy(i: number) {
  enemyChecked.value[i] = !enemyChecked.value[i];
}

async function onWriteEnemies() {
  const 选中 = enemyChecked.value.map((on, i) => (on ? i : -1)).filter(i => i >= 0);
  if (选中.length === 0) {
    toastr.info('请至少勾选一个副本角色');
    return;
  }
  await dungeonGenStore.writeEnemies(选中);
}

/** 复制某个副本角色的 <enemy> 面板 */
async function onCopyEnemyPanel(文本: string) {
  if (!文本) {
    toastr.info('面板要写入存档后才会生成');
    return;
  }
  try {
    await navigator.clipboard.writeText(文本);
    toastr.success('面板文本已复制');
  } catch (e: any) {
    toastr.error('复制失败: ' + (e?.message || e));
  }
}

// ============ 构筑编辑 · 六字段模块 ============
const editModules = [
  { key: '头部', label: '头部' },
  { key: '属性', label: '属性' },
  { key: '衍生属性', label: '衍生属性' },
  { key: '职业', label: '职业' },
  { key: '通用技能', label: '通用技能' },
  { key: '装备', label: '装备' },
];
// 存档 schema 的 阶位 prefault 为中文「一阶」，而分组键与 TIER_ORDER 都取阿拉伯数字「1阶」；
// 用共享的 归一位阶 把写法归一后再分组（一阶/1阶/一/1/第一阶/１阶/一階… 都归到同一组），
// 否则同一阶位会因写法不同被拆成两组、或被扔进末尾的「其他」组。
// 归一后仍认不出的（六阶/试炼阶 等）保留原写法当组名，追加为末尾「其他」组，避免契约者被静默丢弃；
// 「超脱」虽然归不出来，但它是 TIER_ORDER 的合法成员，仍落在它自己的那一组。
const normTier = (t: string): string => {
  const i = 归一位阶(t);
  return i === undefined || i >= TIER_ORDER.length ? t : TIER_ORDER[i];
};
const tieredContracts = computed(() => {
  const map: Record<string, WorkshopCard[]> = {};
  for (const c of workshopStore.contracts) {
    (map[normTier(c.阶位)] ||= []).push(c);
  }
  // 组内按等级降序。store 已按「阶位→等级」排过一遍，这里是分组后的兜底重排（幂等，非双重排序）
  for (const k of Object.keys(map)) map[k].sort((a, b) => b.等级 - a.等级);
  // 已知阶位按 TIER_ORDER 顺序排列；未知阶位追加为末尾「其他」组，避免契约者被静默丢弃
  const tiered = TIER_ORDER.map((label, i) => ({ label, tier: i, cards: map[label] || [] })).filter(
    g => g.cards.length > 0,
  );
  const rest = Object.keys(map).filter(k => !TIER_ORDER.includes(k));
  return tiered.concat(rest.map(k => ({ label: k, tier: TIER_ORDER.length, cards: map[k] })));
});
async function onExtractSave() {
  const ok = await workshopStore.extractMySave();
  if (ok && workshopStore.aiIntroEnabled) await workshopStore.generateIntro();
  if (ok) arenaView.value = 'edit';
}

const dialogPlaceholder = computed(() => {
  if (showModifyDialog.value) return '输入修改意见...\n例如：把稀有度改成蓝色、副职业换成忍者相关的...';
  if (careerStore.activePlanType === 'roadmap')
    return '输入发展方向...\n例如：我想往暗杀方向发展、我想进火影世界拿写轮眼...\n（将自动读取你当前持有的职业数据）';
  return '输入关键词或想法...\n例如：我想要一个暗杀型的职业，最好结合忍者元素...';
});

function defaultBottom() {
  return Math.max(8, (getVH() - 64) / 2);
}
const btnBottom = ref(defaultBottom());
const btnRight = ref(8);
const btnRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);
const clockTime = ref('');
const lastErrorSection = ref('');
let clockTimer = 0;

function updateDeviceMode() {
  // 手机端让位给 mobile-compat：不更新 mobile/tablet 强制定位类、不清理它的内联样式
  if (isMobileLayout()) {
    deviceMode.value = 'desktop';
    return;
  }
  const w = getVW();
  deviceMode.value = w <= 480 ? 'mobile' : w <= 768 ? 'tablet' : 'desktop'; // 始终更新CSS类名，让媒体查询生效
  if (userDragged.value) return; // 用户已手动拖动：保留其自定义位置，只更新类名
  const el = btnRef.value;
  if (!el) return;
  // 切换模式时清除 JS 设置的 important 样式，交还给 CSS 媒体查询或 Vue btnStyle
  el.style.removeProperty('left');
  el.style.removeProperty('top');
  el.style.removeProperty('right');
  el.style.removeProperty('bottom');
  el.style.removeProperty('transform');
  el.style.removeProperty('width');
  el.style.removeProperty('height');
  if (w <= 480) {
    btnBottom.value = 24;
    btnRight.value = 12;
  } else if (w <= 768) {
    btnBottom.value = 15;
    btnRight.value = 15;
  } else {
    btnBottom.value = cl(btnBottom.value, 0, getVH() - 64);
    btnRight.value = cl(btnRight.value, 0, getVW() - 64);
  }
}

function syncBtnFromRect() {
  try {
    const el = btnRef.value;
    if (!el) return;
    const r = el.getBoundingClientRect();
    btnRight.value = getVW() - r.right;
    btnBottom.value = getVH() - r.bottom;
    dor = btnRight.value;
    dob = btnBottom.value;
  } catch (e) {}
}

// Preset wallpapers
const presetWallpapers = [
  { name: '预设壁纸 1', url: '' },
  { name: '预设壁纸 2', url: '' },
  { name: '预设壁纸 3', url: '' },
];

const sectionThreads = computed(() => store.threads.filter(t => t.section === store.activeSection));
const sectionName = computed(() => SECTIONS.find(s => s.key === store.activeSection)?.label || store.activeSection);
const playerTier = computed(() => {
  const pr = store.playerRank;
  if (!pr) return -1;
  const lv = Number(pr.lv);
  if (lv <= 20) return 0;
  if (lv <= 40) return 1;
  if (lv <= 60) return 2;
  if (lv <= 80) return 3;
  return 4;
});
const rankedItems = computed(() => {
  const board = RANK_BOARDS[store.rankIndex];
  if (!store.playerRank || store.rankIndex !== playerTier.value)
    return board.items.map((it, i) => ({ ...it, rank: String(i + 1) }));
  const result: any[] = [];
  const pr = store.playerRank;
  let inserted = false;
  for (let i = 0; i < 10; i++) {
    const curRank = result.length + 1;
    if (!inserted && pr.rank <= curRank) {
      result.push({ rank: String(curRank), name: pr.name, lv: pr.lv, team: pr.team, _player: true });
      inserted = true;
    }
    if (result.length < 10 && i < board.items.length) {
      const src = board.items[i];
      const r = result.length + 1;
      if (r <= 10) result.push({ rank: String(r), name: src.name, lv: src.lv, team: src.team });
    }
  }
  if (!inserted && result.length < 10) {
    result.push({ rank: String(result.length + 1), name: pr.name, lv: pr.lv, team: pr.team, _player: true });
  }
  return result.slice(0, 10);
});
const btnStyle = computed(() => ({ bottom: btnBottom.value + 'px', right: btnRight.value + 'px' }));
const panelAnimStyle = computed(() => (expanded.value ? { transformOrigin: originStr.value } : {}));
const originStr = computed(() => {
  const vw = getVW(),
    vh = getVH();
  const pw = vw <= 480 ? vw : vw <= 768 ? 320 : document.documentElement.clientWidth * 0.94;
  const ph = vw <= 480 ? vh : vw <= 768 ? 600 : document.documentElement.clientHeight * 0.88;
  const btnCX = vw - btnRight.value - 32;
  const btnCY = vh - btnBottom.value - 32;
  return `${btnCX}px ${btnCY}px`;
});
const desktopBg = computed(() =>
  store.settings.wallpaper ? { background: `url(${store.settings.wallpaper}) center/cover no-repeat` } : {},
);
const wallpaperPreviewStyle = computed(() =>
  store.settings.wallpaper
    ? { backgroundImage: `url(${store.settings.wallpaper})`, backgroundSize: 'cover', backgroundPosition: 'center' }
    : { background: 'var(--bg)' },
);

/** 字体预设（Settings.fontFamily 直接存 CSS font-family 串；'' = 用默认黑体栈） */
const FONT_OPTIONS = [
  { label: '默认（黑体）', value: '' },
  { label: '宋体 / 衬线', value: "'Noto Serif SC', 'SimSun', serif" },
  { label: '楷体', value: "'KaiTi', 'STKaiti', 'Kaiti SC', serif" },
  { label: '圆体', value: "'Yuanti SC', 'PingFang SC', 'Microsoft YaHei', sans-serif" },
  { label: '等宽', value: "'JetBrains Mono', 'Courier New', monospace" },
];
const DEFAULT_FONT = "'Noto Sans SC', 'PingFang SC', system-ui, sans-serif";

/** 手机框 CSS 变量：
 *  --ps 手机尺寸缩放（窗口与字体**等比**放大，保持一致）
 *  --fs 字体大小（在窗口缩放的基础上，再单独缩放文字）
 *  --cz 内容层实际缩放 = --ps × --fs（content zoom）：窗口按 --ps 变大、内容按 --cz 放大，
 *      于是「手机尺寸」把窗口与字一起放大，「字体大小」只额外放大字。 */
const phoneVars = computed(() => {
  const ps = store.settings.phoneScale || 1;
  const fs = store.settings.fontScale || 1;
  return {
    '--wxhl-font': store.settings.fontFamily || DEFAULT_FONT,
    '--ps': String(ps),
    '--fs': String(fs),
    '--cz': String(ps * fs),
  };
});

function resetDisplay() {
  store.settings.fontFamily = '';
  store.settings.phoneScale = 1;
  store.settings.fontScale = 1;
}

function onWallpaperUpload(e: Event) {
  const file = (e.target as HTMLInputElement).files?.[0];
  if (!file) return;
  const r = new FileReader();
  r.onload = () => {
    store.settings.wallpaper = r.result as string;
  };
  r.readAsDataURL(file);
}

// ============ DRAG (事件监听必须在酒馆主页面document上，因为组件挂载在主页面DOM) ============
const pageDoc = window.parent.document;
let dsx = 0,
  dsy = 0,
  dob = 0,
  dor = 0,
  hasMoved = false;
function cl(n: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, n));
}
function onDragStart(e: MouseEvent) {
  if (isMobileLayout()) return; // 手机端拖动交给 mobile-compat（指针捕获）
  if (e.button !== 0) return;
  dsx = e.clientX;
  dsy = e.clientY;
  dob = btnBottom.value;
  dor = btnRight.value;
  hasMoved = false;
  pageDoc.addEventListener('mousemove', onDragMove);
  pageDoc.addEventListener('mouseup', onDragEnd);
}
function onDragMove(e: MouseEvent) {
  const dx = dsx - e.clientX,
    dy = dsy - e.clientY;
  if (!hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    hasMoved = true;
    isDragging.value = true;
    syncBtnFromRect();
  }
  if (hasMoved) {
    btnRight.value = cl(dor + dx, 0, getVW() - 64);
    btnBottom.value = cl(dob + dy, 0, getVH() - 64);
  }
}
function onDragEnd() {
  pageDoc.removeEventListener('mousemove', onDragMove);
  pageDoc.removeEventListener('mouseup', onDragEnd);
  isDragging.value = false;
  if (hasMoved) {
    userDragged.value = true;
    deviceMode.value = 'desktop';
    savePos();
  } else {
    expand();
  }
}
function onTouchStart(e: TouchEvent) {
  if (isMobileLayout()) return; // 手机端拖动交给 mobile-compat（指针捕获）
  const t = e.touches[0];
  dsx = t.clientX;
  dsy = t.clientY;
  dob = btnBottom.value;
  dor = btnRight.value;
  hasMoved = false;
}
function onTouchMove(e: TouchEvent) {
  if (isMobileLayout()) return; // 手机端拖动交给 mobile-compat；此处理不可再读残留坐标误判 hasMoved
  const t = e.touches[0];
  const dx = dsx - t.clientX,
    dy = dsy - t.clientY;
  if (!hasMoved && (Math.abs(dx) > 4 || Math.abs(dy) > 4)) {
    hasMoved = true;
    isDragging.value = true;
    syncBtnFromRect();
  }
  if (hasMoved) {
    e.preventDefault();
    btnRight.value = cl(dor + dx, 0, getVW() - 64);
    btnBottom.value = cl(dob + dy, 0, getVH() - 64);
  }
}
function onTouchEnd() {
  if (isMobileLayout()) return; // 手机端点按打开由 mobile-compat 统一触发（__WXHL_OPEN_PHONE__）
  isDragging.value = false;
  if (hasMoved) {
    userDragged.value = true;
    deviceMode.value = 'desktop';
    savePos();
  } else {
    expand();
  }
}

// ============ NAV ============
function expand() {
  syncBtnFromRect();
  expanded.value = true;
  store.init();
}
function collapse() {
  expanded.value = false;
}
function openForum() {
  currentView.value = 'forum';
  activeThread.value = null;
}
function openSettings() {
  currentView.value = 'settings';
  settingsPage.value = '';
}
function goDesktop() {
  currentView.value = 'desktop';
  activeThread.value = null;
  settingsPage.value = '';
}
async function openThread(t: ForumThread) {
  activeThread.value = t;
  if (!t.posts || t.posts.length <= 1) {
    await store.generateThreadDetail(t);
  }
}
async function sendReply() {
  if (!replyDraft.value.trim() || !activeThread.value) return;
  const n = new Date();
  const time =
    n.getMonth() +
    1 +
    '月' +
    n.getDate() +
    '日 ' +
    String(n.getHours()).padStart(2, '0') +
    ':' +
    String(n.getMinutes()).padStart(2, '0');
  activeThread.value.posts!.push({
    id: Date.now(),
    floor: activeThread.value.posts!.length + 1,
    author: '我',
    time,
    content: replyDraft.value.trim(),
    depth: 1,
  });
  activeThread.value.replies++;
  replyDraft.value = '';
  await store.generateReplies(activeThread.value);
}
function toggleWb(name: string) {
  const i = store.settings.selectedWorldbooks.indexOf(name);
  if (i >= 0) store.settings.selectedWorldbooks.splice(i, 1);
  else store.settings.selectedWorldbooks.push(name);
}

// ============ 世界书：条目级勾选 + 搜索 + 方案 ============
// 条目懒加载：展开某个世界书时才去取它的条目标题（getWorldbook 是异步的）
const wbEntries = ref<Record<string, { name: string }[]>>({});
const wbExpanded = ref<Record<string, boolean>>({});

async function toggleWbExpand(name: string) {
  wbExpanded.value[name] = !wbExpanded.value[name];
  if (wbExpanded.value[name] && !wbEntries.value[name]) {
    try {
      const es = await getWorldbook(name);
      wbEntries.value[name] = (es || []).map((e: any) => ({ name: e.name }));
    } catch (_) {
      wbEntries.value[name] = [];
    }
  }
}

/** null = 整本全取; 数组 = 只取这些 */
function wbEntryChecked(wb: string, entry: string): boolean {
  const f = store.settings.worldbookEntryFilter?.[wb];
  return !f || f.includes(entry);
}

// ---- 搜索（世界书可能有 100+ 条目，必须能搜）----
// 语义：一个搜索框全局共用，作用于当前展开的那个世界书的条目列表；
// 匹配方式为不区分大小写的子串匹配（中文与 <XX系统> 这类都适用）。
const wbSearch = ref('');

/** 当前显示的条目 = 全部条目按关键词过滤（不区分大小写的子串匹配） */
function wbVisibleEntries(wb: string): { name: string }[] {
  const all = wbEntries.value[wb] || [];
  const q = wbSearch.value.trim().toLowerCase();
  if (!q) return all;
  return all.filter(e => e.name.toLowerCase().includes(q));
}

function toggleWbEntry(wb: string, entry: string) {
  if (!store.settings.worldbookEntryFilter) store.settings.worldbookEntryFilter = {};
  const all = (wbEntries.value[wb] || []).map(e => e.name);
  const cur = store.settings.worldbookEntryFilter?.[wb];
  const next = cur ? [...cur] : [...all]; // 从「整本」进入精确模式时，先把当前全选展开
  const i = next.indexOf(entry);
  if (i >= 0) next.splice(i, 1);
  else next.push(entry);
  // 与全选等价时就退回「整本」，避免存一堆无意义的数组
  store.settings.worldbookEntryFilter[wb] = next.length === all.length ? null : next;
}

/**
 * 全选 / 全不选。
 * ⚠️ 作用对象是**当前搜索过滤后可见的条目**，不是整本 —— 这样「搜关键词 → 全选」可以批量勾选。
 * @param visible 当前可见的条目名列表
 */
function setVisibleWbEntries(wb: string, visible: string[], on: boolean) {
  if (!store.settings.worldbookEntryFilter) store.settings.worldbookEntryFilter = {};
  const all = (wbEntries.value[wb] || []).map(e => e.name);
  const cur = store.settings.worldbookEntryFilter?.[wb];
  const base = cur ? [...cur] : [...all]; // 从「整本」进入精确模式时先展开成全选
  const set = new Set(base);
  for (const n of visible) {
    if (on) set.add(n);
    else set.delete(n);
  }
  const next = [...set];
  store.settings.worldbookEntryFilter[wb] = next.length === all.length ? null : next;
}

// ---- 世界书方案（快照 = selectedWorldbooks + worldbookEntryFilter）----
function saveWorldbookProfile() {
  const name = prompt('方案名称', '方案 ' + (store.settings.worldbookProfiles.length + 1));
  if (!name) return;
  const value = {
    selectedWorldbooks: [...store.settings.selectedWorldbooks],
    worldbookEntryFilter: JSON.parse(JSON.stringify(store.settings.worldbookEntryFilter ?? {})),
  };
  const i = store.settings.worldbookProfiles.findIndex(p => p.name === name);
  if (i >= 0) store.settings.worldbookProfiles[i] = { name, value };
  else store.settings.worldbookProfiles.push({ name, value });
  store.settings.activeWorldbookProfile = name;
}

function applyWorldbookProfile(name: string) {
  // 空名 = 「未使用方案」: 必须先清空状态, 否则 find 找不到就 early return,
  // 而 :value 没变 Vue 也不会补 DOM —— 显示残留成「未使用方案」但状态仍是旧方案名
  if (!name) {
    store.settings.activeWorldbookProfile = '';
    return;
  }
  const p = store.settings.worldbookProfiles.find(x => x.name === name);
  if (!p) return;
  store.settings.selectedWorldbooks = [...p.value.selectedWorldbooks];
  store.settings.worldbookEntryFilter = JSON.parse(JSON.stringify(p.value.worldbookEntryFilter));
  store.settings.activeWorldbookProfile = name;
}

function deleteWorldbookProfile(name: string) {
  store.settings.worldbookProfiles = store.settings.worldbookProfiles.filter(p => p.name !== name);
  if (store.settings.activeWorldbookProfile === name) store.settings.activeWorldbookProfile = '';
}

// ---- API 方案（快照 = apiMode + primary + secondary；与世界书方案各自独立）----
function saveApiProfile() {
  const name = prompt('方案名称', 'API 方案 ' + (store.settings.apiProfiles.length + 1));
  if (!name) return;
  const value = {
    apiMode: store.settings.apiMode,
    primary: { ...store.settings.primary },
    secondary: { ...store.settings.secondary },
  };
  const i = store.settings.apiProfiles.findIndex(p => p.name === name);
  if (i >= 0) store.settings.apiProfiles[i] = { name, value };
  else store.settings.apiProfiles.push({ name, value });
  store.settings.activeApiProfile = name;
}

function applyApiProfile(name: string) {
  // 空名 = 「未使用方案」: 同 applyWorldbookProfile, 必须先清空状态
  if (!name) {
    store.settings.activeApiProfile = '';
    return;
  }
  const p = store.settings.apiProfiles.find(x => x.name === name);
  if (!p) return;
  store.settings.apiMode = p.value.apiMode;
  // 关键: 拷贝回活字段, 不能把方案的 cfg 对象引用直接赋给 settings.primary,
  // 否则之后编辑主 API 会连带改掉方案里存的值
  store.settings.primary = { ...p.value.primary };
  store.settings.secondary = { ...p.value.secondary };
  store.settings.activeApiProfile = name;
}

function deleteApiProfile(name: string) {
  store.settings.apiProfiles = store.settings.apiProfiles.filter(p => p.name !== name);
  if (store.settings.activeApiProfile === name) store.settings.activeApiProfile = '';
}
async function onRefresh() {
  lastErrorSection.value = store.activeSection;
  await store.refreshSection(store.activeSection);
}
async function onExtractInfluence() {
  await store.extractInfluence();
}
function onPost() {
  if (!postTitle.value.trim() || !postContent.value.trim() || !store.activeSection) return;
  const thread = store.createThread(store.activeSection, postTitle.value, postContent.value);
  postTitle.value = '';
  postContent.value = '';
  showPostDialog.value = false;
  activeThread.value = thread;
}
function openCareer() {
  currentView.value = 'career';
  careerView.value = 'list';
  viewingPlan.value = null;
  viewingRoadmap.value = null;
  careerStore.lastError = '';
}
function openDungeon() {
  currentView.value = 'dungeon';
  dungeonView.value = 'list';
  viewingDungeon.value = null;
  dungeonStore.lastError = '';
}
function openArena() {
  currentView.value = 'arena';
  arenaView.value = 'list';
  viewingCard.value = null;
  workshopStore.worldbookError = '';
  workshopStore.loadContracts();
}
function openArenaEdit() {
  currentView.value = 'arena';
  arenaView.value = 'edit';
}
// ============ 副本攻略向导 ============
function openDungeonWizard() {
  dungeonStep.value = 'faction';
  dungeonFaction.value = '中立';
  dungeonGoal.value = '';
  dungeonMode.value = 'speedrun';
  dungeonModifyId.value = 0;
  showDungeonWizard.value = true;
}
function startDungeonCreate() {
  // 从 choice 进入：选目标或模式
  // goal 或 mode 都会在确认时生成
  if (dungeonStep.value === 'choice') return;
  showDungeonWizard.value = false;
  dungeonStep.value = 'faction';
}
async function confirmDungeonWizard() {
  showDungeonWizard.value = false;
  if (dungeonModifyId.value) {
    await dungeonStore.modifyDungeon(dungeonModifyId.value, dungeonGoal.value);
    if (viewingDungeon.value)
      viewingDungeon.value = dungeonStore.dungeons.find(d => d.id === dungeonModifyId.value) || viewingDungeon.value;
    dungeonModifyId.value = 0;
  } else {
    await dungeonStore.createDungeon(dungeonFaction.value, dungeonMode.value, dungeonGoal.value);
  }
}
function onModifyDungeonClick(d: DungeonStrategy) {
  openDungeonWizard();
  dungeonModifyId.value = d.id;
  dungeonFaction.value = d.faction;
  dungeonStep.value = 'goal'; // 修改模式直接进入目标输入
}
async function onRerollDungeon(d: DungeonStrategy) {
  if (dungeonStore.generatingV1) return;
  const idx = dungeonStore.dungeons.findIndex(x => x.id === d.id);
  if (idx >= 0) {
    const src = dungeonStore.dungeons[idx];
    await dungeonStore.createDungeon(src.faction, src.mode, src.playerGoal);
    // 刷新 viewingDungeon 指向最新
    viewingDungeon.value = dungeonStore.dungeons[0] || viewingDungeon.value;
  }
}
async function onConfirmDungeon(d: DungeonStrategy) {
  viewingDungeon.value = d;
  await dungeonStore.confirmDungeon(d.id);
  viewingDungeon.value = dungeonStore.dungeons.find(x => x.id === d.id) || viewingDungeon.value;
}
function onDeleteDungeon() {
  if (deleteTargetId.value) {
    dungeonStore.deleteDungeon(deleteTargetId.value);
    if (viewingDungeon.value && viewingDungeon.value.id === deleteTargetId.value) {
      viewingDungeon.value = null;
      dungeonView.value = 'list';
    }
    deleteTargetId.value = 0;
  }
}
async function onNewPlan() {
  if (!newPlanKeywords.value.trim()) return;
  showNewDialog.value = false;
  const kw = newPlanKeywords.value.trim();
  newPlanKeywords.value = '';
  if (showModifyDialog.value) {
    showModifyDialog.value = false;
    if (viewingRoadmap.value) {
      await careerStore.modifyRoadmap(viewingRoadmap.value.id, kw);
      viewingRoadmap.value = careerStore.roadmaps.find(r => r.id === viewingRoadmap.value!.id) || viewingRoadmap.value;
    } else if (viewingPlan.value) {
      await careerStore.modifyPlan(viewingPlan.value.id, kw);
      viewingPlan.value = careerStore.plans.find(p => p.id === viewingPlan.value!.id) || viewingPlan.value;
    }
  } else if (careerStore.activePlanType === 'roadmap') {
    await careerStore.createRoadmap(kw);
  } else {
    await careerStore.createPlan(kw);
  }
}
async function onConfirmPlan(plan: CareerPlan) {
  viewingPlan.value = plan;
  await careerStore.confirmPlan(plan.id);
  viewingPlan.value = careerStore.plans.find(p => p.id === plan.id) || viewingPlan.value;
}
async function onConfirmRoadmap(roadmap: CareerRoadmap) {
  viewingRoadmap.value = roadmap;
  await careerStore.confirmRoadmap(roadmap.id);
  viewingRoadmap.value = careerStore.roadmaps.find(r => r.id === roadmap.id) || viewingRoadmap.value;
}
function onModifyClick(plan: CareerPlan) {
  showModifyDialog.value = true;
  showNewDialog.value = true;
  newPlanKeywords.value = '';
}
function onModifyRoadmapClick(roadmap: CareerRoadmap) {
  showModifyDialog.value = true;
  showNewDialog.value = true;
  newPlanKeywords.value = '';
}
function onDeletePlan() {
  if (deleteTargetId.value) {
    if (careerStore.activePlanType === 'roadmap') {
      careerStore.deleteRoadmap(deleteTargetId.value);
      if (viewingRoadmap.value && viewingRoadmap.value.id === deleteTargetId.value) {
        viewingRoadmap.value = null;
        careerView.value = 'list';
      }
    } else {
      careerStore.deletePlan(deleteTargetId.value);
      if (viewingPlan.value && viewingPlan.value.id === deleteTargetId.value) {
        viewingPlan.value = null;
        careerView.value = 'list';
      }
    }
    deleteTargetId.value = 0;
  }
}

// ============ STORAGE ============
function savePos() {
  try {
    localStorage.setItem(SK, JSON.stringify({ bottom: btnBottom.value, right: btnRight.value }));
  } catch (_) {}
}
function loadPos() {
  try {
    const r = localStorage.getItem(SK);
    let restored = false;
    if (r) {
      const { bottom, right } = JSON.parse(r);
      const vw = getVW(),
        vh = getVH();
      if (
        typeof bottom === 'number' &&
        typeof right === 'number' &&
        bottom >= 0 &&
        bottom <= vh - 64 &&
        right >= 0 &&
        right <= vw - 64
      ) {
        // 仅桌面端恢复 Vue 保存的位置；移动布局（手机/平板）一律让位给 mobile-compat 的定位
        if (!isMobileLayout()) {
          btnBottom.value = cl(bottom, 0, vh - 64);
          btnRight.value = cl(right, 0, vw - 64);
          userDragged.value = true;
          deviceMode.value = 'desktop';
          restored = true;
        } else {
          localStorage.removeItem(SK);
        }
      }
    }
    if (!restored) {
      btnBottom.value = defaultBottom();
      btnRight.value = 8;
      localStorage.removeItem(SK);
      updateDeviceMode();
    }
  } catch (e) {
    btnBottom.value = defaultBottom();
    btnRight.value = 8;
    updateDeviceMode();
  }
}

// ============ CLOCK / RESIZE ============
function tick() {
  const n = new Date();
  clockTime.value = String(n.getHours()).padStart(2, '0') + ':' + String(n.getMinutes()).padStart(2, '0');
}
function onResize() {
  updateDeviceMode();
}
onMounted(() => {
  loadPos();
  tick();
  clockTimer = window.setInterval(tick, 30000);
  window.addEventListener('resize', onResize);
  if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  // 暴露「打开小手机」给 mobile-compat：手机端悬浮球的点按打开由它统一触发（避免与 Vue 这套点按判定打架）
  try {
    (window.parent as any).__WXHL_OPEN_PHONE__ = expand;
  } catch (_) {}
});
onUnmounted(() => {
  window.clearInterval(clockTimer);
  window.removeEventListener('resize', onResize);
  if (window.visualViewport) window.visualViewport.removeEventListener('resize', onResize);
  try {
    if ((window.parent as any).__WXHL_OPEN_PHONE__ === expand) delete (window.parent as any).__WXHL_OPEN_PHONE__;
  } catch (_) {}
  pageDoc.removeEventListener('mousemove', onDragMove);
  pageDoc.removeEventListener('mouseup', onDragEnd);
});
</script>

<style lang="scss" scoped>
// ============ VARIABLES ============
.float-btn,
.panel-overlay {
  --bg: #150e0a;
  --bg2: #241812;
  --bg3: #2e1e14;
  --rust: #4a2010;
  --rust-l: #6a3020;
  --blood: #6a1818;
  --blood-b: #a02020;
  --amber: #f0d080;
  --amber-d: #c8a860;
  --chalk: #f0e8da;
  --chalk-d: #c0b09a;
  --iron: #4a4440;
  --iron-d: #2a2825;
  /* SVG 颗粒纹理（feTurbulence，无图片资源） */
  --grain: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='140' height='140' filter='url(%23n)' opacity='0.55'/%3E%3C/svg%3E");
}

// ============ FLOAT BTN ============
.float-btn {
  position: fixed;
  z-index: 2147483640;
  pointer-events: auto;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: linear-gradient(145deg, #2a2520, #141210);
  border: 2px solid rgba(200, 160, 100, 0.2);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow:
    0 4px 24px rgba(0, 0, 0, 0.6),
    inset 0 1px 0 rgba(220, 180, 120, 0.1);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  transition:
    transform 0.2s,
    box-shadow 0.2s,
    border-color 0.2s;
  &:hover {
    transform: scale(1.06);
    border-color: rgba(240, 208, 128, 0.4);
    box-shadow:
      0 6px 32px rgba(0, 0, 0, 0.7),
      0 0 0 6px rgba(180, 40, 40, 0.2);
  }
  &.dragging {
    transform: scale(1.1);
    cursor: grabbing;
    border-color: rgba(240, 208, 128, 0.6);
    box-shadow:
      0 8px 40px rgba(0, 0, 0, 0.7),
      0 0 0 10px rgba(180, 40, 40, 0.3);
    transition: none;
  }
}
.btn-core {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: center;
}
.btn-glyph {
  width: 30px;
  height: 30px;
  color: var(--amber-d);
  transition: color 0.2s;
  .float-btn:hover & {
    color: var(--amber);
  }
}
.btn-halo {
  position: absolute;
  inset: -5px;
  border-radius: 50%;
  border: 2px solid rgba(180, 40, 40, 0.25);
  animation: bloodPulse 3s ease-in-out infinite;
  .float-btn:hover & {
    border-color: rgba(180, 40, 40, 0.55);
    animation-duration: 1.5s;
  }
  .float-btn.dragging & {
    border-color: rgba(180, 40, 40, 0.7);
    animation-duration: 1s;
  }
}
@keyframes bloodPulse {
  0%,
  100% {
    opacity: 0.3;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.07);
  }
}

// ============ PANEL / PHONE ============
.panel-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483630;
  pointer-events: auto;
  background: rgba(0, 0, 0, 0.65);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left);
}
.panel-enter-active {
  transition: opacity 0.35s;
  .phone-frame {
    transition:
      transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1),
      opacity 0.3s;
  }
}
.panel-leave-active {
  transition: opacity 0.25s;
  .phone-frame {
    transition:
      transform 0.3s ease-in,
      opacity 0.2s;
  }
}
.panel-enter-from {
  opacity: 0;
  .phone-frame {
    transform: scale(0.1);
    opacity: 0;
  }
}
.panel-leave-to {
  opacity: 0;
  .phone-frame {
    transform: scale(0.1);
    opacity: 0;
  }
}
.phone-frame {
  width: min(calc(320px * var(--ps, 1)), 92vw);
  height: min(calc(640px * var(--ps, 1)), 88vh);
  /* 字体与颜色锁定在小手机内部：font-family/color 均可继承，隔离酒馆页面的环境样式 */
  font-family: var(--wxhl-font, 'Noto Sans SC', 'PingFang SC', system-ui, sans-serif);
  color: var(--chalk, #f0e8da);
  border-radius: 42px;
  background: linear-gradient(180deg, #241812, #150e0a);
  border: 2px solid rgba(140, 100, 60, 0.25);
  box-shadow:
    0 0 0 6px #2a2520,
    0 0 0 8px rgba(80, 40, 20, 0.3),
    0 30px 80px rgba(0, 0, 0, 0.7);
  position: relative;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}
/* 内容层：字体缩放在此层，手机外壳不随字号变形。
   用 zoom（会影响布局）而非 transform：宽高先除以 --cz、zoom 再乘回来，
   布局盒仍等于手机框内尺寸 → flex/百分比定位都正确，而内部文字按 --cz 放大。
   --cz = --ps × --fs：手机尺寸把窗口与字等比放大，字体大小再额外放大字。
   @supports 兜底：不支持 zoom 的浏览器退回普通铺满（只是不缩放字体，不会错位）。 */
.phone-content {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}
@supports (zoom: 1) {
  .phone-content {
    flex: none;
    zoom: var(--cz, 1);
    width: calc(100% / var(--cz, 1));
    height: calc(100% / var(--cz, 1));
  }
}
/* 手机外壳四角铆钉 */
.phone-frame::before {
  content: '';
  position: absolute;
  inset: 8px;
  pointer-events: none;
  z-index: 30;
  background:
    radial-gradient(circle 2.5px at 14px 14px, rgba(200, 160, 110, 0.5) 50%, transparent 51%),
    radial-gradient(circle 2.5px at calc(100% - 14px) 14px, rgba(200, 160, 110, 0.5) 50%, transparent 51%),
    radial-gradient(circle 2.5px at 14px calc(100% - 14px), rgba(200, 160, 110, 0.5) 50%, transparent 51%),
    radial-gradient(circle 2.5px at calc(100% - 14px) calc(100% - 14px), rgba(200, 160, 110, 0.5) 50%, transparent 51%);
}
.status-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 28px 0;
  height: 32px;
  flex-shrink: 0;
  font-size: 11px;
  color: var(--amber-d);
  font-family: 'Courier New', monospace;
}
.status-label {
  font-size: 10px;
  letter-spacing: 2px;
  color: var(--blood-b);
}
.minimize-btn {
  position: absolute;
  top: 36px;
  right: 16px;
  z-index: 20;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  border: 1.5px solid rgba(200, 160, 100, 0.25);
  background: rgba(20, 14, 10, 0.8);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s;
  span {
    display: block;
    width: 10px;
    height: 1.5px;
    background: rgba(240, 208, 128, 0.7);
    border-radius: 1px;
  }
  &:hover {
    background: rgba(180, 40, 40, 0.25);
    border-color: rgba(180, 40, 40, 0.5);
  }
}

// ============ DESKTOP ============
.desktop-view {
  flex: 1;
  display: flex;
  flex-direction: column;
  position: relative;
}
/* 主页面滚动层：背景/页脚留在原地，内容超出时可滚（滚动条隐藏） */
.desktop-scroll {
  position: relative;
  z-index: 2;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.corridor-bg {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: #150e0a;
  /* 顶部吊灯光锥 */
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 50%;
    transform: translateX(-50%);
    width: 70%;
    height: 60%;
    background: radial-gradient(
      ellipse at 50% 0%,
      rgba(240, 208, 128, 0.12) 0%,
      rgba(240, 208, 128, 0.04) 45%,
      transparent 70%
    );
    pointer-events: none;
    z-index: 1;
  }
  /* 墙面颗粒 */
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background-image: var(--grain);
    opacity: 0.14;
    mix-blend-mode: overlay;
    pointer-events: none;
    z-index: 1;
  }
}
.corridor-ceiling {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 30%;
  background: linear-gradient(180deg, #181410, #100c09 60%, #0c0806);
  border-bottom: 1px solid rgba(80, 40, 20, 0.35);
  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 20%;
    right: 20%;
    height: 1px;
    background: rgba(200, 40, 30, 0.35);
    box-shadow: 0 0 8px rgba(200, 40, 30, 0.25);
  }
}
.corridor-left {
  position: absolute;
  top: 30%;
  left: 0;
  bottom: 25%;
  width: 25%;
  background: linear-gradient(90deg, rgba(30, 15, 8, 0.9), rgba(15, 8, 4, 0.4));
  clip-path: polygon(0 0, 100% 8%, 100% 92%, 0 100%);
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 40% 30%, rgba(80, 20, 12, 0.45), transparent 60%),
      radial-gradient(ellipse at 60% 70%, rgba(50, 14, 8, 0.35), transparent 50%);
    animation: fleshPulse 4s ease-in-out infinite;
  }
}
.corridor-right {
  position: absolute;
  top: 30%;
  right: 0;
  bottom: 25%;
  width: 25%;
  background: linear-gradient(270deg, rgba(30, 15, 8, 0.9), rgba(15, 8, 4, 0.4));
  clip-path: polygon(0 8%, 100% 0, 100% 100%, 0 92%);
  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background:
      radial-gradient(ellipse at 60% 40%, rgba(80, 20, 12, 0.4), transparent 55%),
      radial-gradient(ellipse at 30% 60%, rgba(50, 14, 8, 0.35), transparent 50%);
    animation: fleshPulse 4.5s ease-in-out infinite 1s;
  }
}
.corridor-floor {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 25%;
  background: linear-gradient(0deg, #0e0a06, #0a0805 60%, transparent);
  background-image:
    linear-gradient(90deg, rgba(60, 35, 20, 0.25) 1px, transparent 1px),
    linear-gradient(0deg, rgba(60, 35, 20, 0.2) 1px, transparent 1px);
  background-size: 30px 30px;
  border-top: 1px solid rgba(70, 35, 20, 0.35);
}
.corridor-end {
  position: absolute;
  top: 30%;
  left: 25%;
  right: 25%;
  bottom: 25%;
  background: radial-gradient(ellipse at center, rgba(200, 40, 25, 0.2), transparent 70%);
  animation: endBreathe 3s ease-in-out infinite;
}
@keyframes fleshPulse {
  0%,
  100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}
@keyframes endBreathe {
  0%,
  100% {
    opacity: 0.5;
    transform: scale(1);
  }
  50% {
    opacity: 0.9;
    transform: scale(1.03);
  }
}
.app-grid {
  position: relative;
  z-index: 2;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 18px 8px;
  padding: 20px 14px 0;
  justify-items: center;
}
.app-icon-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  transition: transform 0.15s;
  &:active {
    transform: scale(0.88);
  }
}
.app-icon {
  position: relative;
  width: 60px;
  height: 60px;
  border-radius: 15px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5);
  transition: box-shadow 0.2s;
  /* 铭牌铆钉角 */
  &::after {
    content: '';
    position: absolute;
    inset: 4px;
    pointer-events: none;
    background:
      radial-gradient(circle 1.5px at 5px 5px, rgba(240, 208, 128, 0.5) 50%, transparent 51%),
      radial-gradient(circle 1.5px at calc(100% - 5px) 5px, rgba(240, 208, 128, 0.5) 50%, transparent 51%),
      radial-gradient(circle 1.5px at 5px calc(100% - 5px), rgba(240, 208, 128, 0.5) 50%, transparent 51%),
      radial-gradient(circle 1.5px at calc(100% - 5px) calc(100% - 5px), rgba(240, 208, 128, 0.5) 50%, transparent 51%);
  }
  .app-icon-wrapper:hover & {
    box-shadow:
      0 8px 30px rgba(0, 0, 0, 0.7),
      0 0 20px rgba(180, 40, 40, 0.35);
  }
  svg {
    width: 28px;
    height: 28px;
    color: var(--amber-d);
    filter: drop-shadow(0 0 4px rgba(240, 208, 128, 0.35));
  }
}
.forum-icon {
  background: linear-gradient(135deg, #3a1a10, #201008);
  border: 1.5px solid rgba(240, 208, 128, 0.25);
}
.settings-icon {
  background: linear-gradient(135deg, #2a2825, #181410);
  border: 1.5px solid rgba(200, 140, 100, 0.25);
}
.crafting-icon {
  background: linear-gradient(135deg, #3a2410, #20140a);
  border: 1.5px solid rgba(200, 150, 80, 0.3);
}
.app-label {
  font-size: 11px;
  color: var(--chalk);
  letter-spacing: 2px;
  font-family: 'Noto Serif SC', serif;
  margin-top: 4px;
}
.app-sub {
  font-size: 9px;
  color: var(--chalk-d);
  letter-spacing: 1px;
  font-family: 'Courier New', monospace;
}
.idle-plate {
  position: relative;
  z-index: 2;
  margin: 18px 20px 0;
  padding: 14px 12px 12px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  background:
    radial-gradient(circle 2px at 8px 8px, rgba(240, 208, 128, 0.45) 50%, transparent 51%),
    radial-gradient(circle 2px at calc(100% - 8px) 8px, rgba(240, 208, 128, 0.45) 50%, transparent 51%),
    radial-gradient(circle 2px at 8px calc(100% - 8px), rgba(240, 208, 128, 0.45) 50%, transparent 51%),
    radial-gradient(circle 2px at calc(100% - 8px) calc(100% - 8px), rgba(240, 208, 128, 0.45) 50%, transparent 51%),
    linear-gradient(180deg, rgba(36, 24, 18, 0.92), rgba(21, 14, 10, 0.9));
  border: 2px solid var(--iron);
  box-shadow:
    inset 0 0 24px rgba(0, 0, 0, 0.5),
    0 6px 20px rgba(0, 0, 0, 0.4);
  transition: all 0.3s;
  &:hover {
    border-color: var(--amber-d);
    filter: brightness(1.15);
  }
}
.ip-title {
  font-family: 'Noto Serif SC', serif;
  font-size: 10px;
  letter-spacing: 4px;
  color: var(--amber-d);
}
.ip-name {
  font-family: 'Noto Serif SC', serif;
  font-size: 22px;
  font-weight: 900;
  letter-spacing: 3px;
  color: var(--amber);
  text-shadow: 0 0 12px rgba(240, 208, 128, 0.4);
}
.ip-line {
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: var(--chalk);
  letter-spacing: 1px;
}
.ip-bars {
  display: flex;
  gap: 10px;
  margin-top: 6px;
}
.ip-bar {
  display: flex;
  align-items: center;
  gap: 5px;
}
.ip-bl {
  font-size: 9px;
  color: var(--amber-d);
  font-family: 'Noto Serif SC', serif;
  letter-spacing: 1px;
}
.ip-track {
  position: relative;
  width: 52px;
  height: 5px;
  background: rgba(20, 12, 8, 0.6);
  border: 1px solid rgba(100, 50, 20, 0.3);
  border-radius: 2px;
  overflow: hidden;
  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: repeating-linear-gradient(90deg, transparent 0 7px, rgba(0, 0, 0, 0.55) 7px 8px);
    pointer-events: none;
  }
}
.ip-fill {
  height: 100%;
  transition: width 0.6s;
  &.hp {
    background: linear-gradient(90deg, #2a0808, #8a2020);
  }
  &.mp {
    background: linear-gradient(90deg, #1a2a22, #4a7060);
  }
  &.sp {
    background: linear-gradient(90deg, #2a1008, #5a2812);
  }
}
.desktop-pager {
  position: absolute;
  bottom: 50px;
  left: 0;
  right: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  z-index: 2;
}
.pager-arrow {
  background: none;
  border: 1px solid var(--amber-d, rgba(180, 140, 60, 0.6));
  color: var(--amber-d, rgba(180, 140, 60, 0.6));
  border-radius: 50%;
  width: 26px;
  height: 26px;
  font-size: 15px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}
.pager-arrow:disabled {
  opacity: 0.3;
  cursor: default;
}
.pager-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: rgba(127, 127, 127, 0.4);
  cursor: pointer;
}
.pager-dot.on {
  background: var(--amber-d, #b48c3c);
}
.desktop-footer {
  position: absolute;
  bottom: 30px;
  left: 0;
  right: 0;
  text-align: center;
  z-index: 2;
  font-size: 10px;
  color: var(--amber-d);
  letter-spacing: 4px;
  opacity: 0.6;
}

// ============ APP PAGE ============
.app-page {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: linear-gradient(180deg, #1a1410, #100c09);
  position: relative;
  z-index: 5;
  min-height: 0;
}
.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 12px;
  height: 44px;
  flex-shrink: 0;
  background: rgba(30, 20, 14, 0.95);
  border-bottom: 1px solid rgba(80, 40, 20, 0.35);
}
.hdr-btn {
  width: 36px;
  height: 36px;
  border: none;
  background: transparent;
  color: var(--amber-d);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  flex-shrink: 0;
  svg {
    width: 18px;
    height: 18px;
  }
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}
.hdr-title {
  font-size: 13px;
  font-weight: 600;
  color: var(--chalk);
  letter-spacing: 1px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
  text-align: center;
}
.hdr-spacer {
  width: 36px;
  flex-shrink: 0;
}

// ============ SCROLL ============
// 各处滚动容器统一隐藏滚动条（滚动功能保留）
.scroll-area {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  min-height: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
// ============ SECTION TABS ============
.section-tabs {
  display: flex;
  gap: 2px;
  padding: 6px 4px;
  flex-shrink: 0;
  overflow-x: auto;
  flex-wrap: wrap;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}
.section-tab {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 5px 8px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--chalk-d);
  font-size: 10px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
  white-space: nowrap;
  &:hover {
    color: var(--chalk);
    border-color: rgba(120, 80, 40, 0.25);
  }
  &.active {
    color: var(--amber);
    background: rgba(180, 40, 40, 0.12);
    border-color: rgba(180, 40, 40, 0.3);
  }
  .tab-icon {
    font-size: 12px;
  }
  .tab-label {
    font-size: 10px;
  }
}
.refresh-tab {
  border-color: rgba(100, 140, 180, 0.3);
  color: #8ab4d8;
  &:hover {
    border-color: rgba(100, 140, 180, 0.6);
    color: #a0c8e8;
  }
  &:disabled {
    opacity: 0.4;
  }
}
.influence-tab {
  border-color: rgba(240, 200, 80, 0.3);
  color: #d8c060;
  &:hover {
    border-color: rgba(240, 200, 80, 0.6);
    color: #f0d080;
  }
  &:disabled {
    opacity: 0.4;
  }
  &.hasEvents {
    border-color: rgba(240, 200, 80, 0.6);
    background: rgba(240, 200, 80, 0.12);
    color: #f0d080;
  }
  .influence-badge {
    background: rgba(240, 200, 80, 0.25);
    color: #f0d080;
    font-size: 9px;
    border-radius: 8px;
    padding: 0 5px;
    line-height: 14px;
  }
}
.influence-panel {
  padding: 8px 10px;
  margin: 4px 8px;
  background: rgba(240, 200, 80, 0.06);
  border: 1px solid rgba(240, 200, 80, 0.25);
  border-radius: 8px;
}
.infl-title {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 11px;
  color: #f0d080;
  margin-bottom: 6px;
  font-weight: 600;
}
.infl-clear {
  background: transparent;
  border: none;
  color: #d8c060;
  font-size: 10px;
  cursor: pointer;
  &:hover {
    color: #f0d080;
    text-decoration: underline;
  }
}
.infl-item {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  flex-wrap: wrap;
  padding: 3px 0;
  font-size: 11px;
  color: var(--chalk);
  line-height: 1.4;
}
.infl-dot {
  color: #f0d080;
  font-size: 8px;
  margin-top: 4px;
}
.infl-text {
  flex: 1 1 65%;
  min-width: 0;
}
.infl-impact {
  flex: 0 1 auto;
  font-size: 9px;
  color: #d8c060;
  white-space: normal;
  margin-top: 2px;
}
.infl-hint {
  font-size: 10px;
  color: var(--chalk-d);
  opacity: 0.6;
  margin-top: 4px;
}
.spinning {
  animation: spin 1s linear infinite;
}
@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

// ============ THREAD CARDS ============
.thread-card {
  padding: 10px 12px;
  cursor: pointer;
  border-bottom: 1px solid rgba(80, 40, 20, 0.18);
  transition: background 0.1s;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}
.tc-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 4px;
}
.tc-title {
  font-size: 12.5px;
  color: var(--chalk);
  font-weight: 500;
  flex: 1;
  margin-right: 8px;
  line-height: 1.3;
}
.tc-replies {
  font-size: 10px;
  color: var(--amber-d);
  white-space: nowrap;
  flex-shrink: 0;
}
.tc-preview {
  font-size: 11px;
  color: var(--chalk-d);
  margin-bottom: 4px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.tc-meta {
  display: flex;
  gap: 10px;
  font-size: 10px;
  color: var(--chalk-d);
  margin-bottom: 4px;
}
.tc-hot {
  font-size: 10px;
  color: var(--amber-d);
  background: rgba(180, 40, 40, 0.08);
  padding: 4px 8px;
  border-radius: 4px;
  line-height: 1.4;
  border-left: 2px solid rgba(180, 40, 40, 0.35);
}
.hot-label {
  margin-right: 4px;
}
.hot-author {
  color: var(--amber);
  font-weight: 500;
}
.hot-likes {
  margin-left: 6px;
  color: var(--chalk-d);
}
.thread-card.mine {
  background: rgba(240, 200, 80, 0.07);
  border-left: 2px solid rgba(240, 200, 80, 0.5);
  .tc-title {
    color: #f0d080;
  }
}
.post-bar {
  flex-shrink: 0;
  padding: 8px 12px;
  display: flex;
  justify-content: center;
  background: rgba(30, 20, 14, 0.6);
}
.post-btn {
  width: 100%;
  padding: 9px;
  background: rgba(240, 200, 80, 0.12);
  border: 1px solid rgba(240, 200, 80, 0.3);
  color: #d8c060;
  font-size: 12px;
  border-radius: 8px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: all 0.2s;
  &:hover {
    background: rgba(240, 200, 80, 0.22);
    border-color: rgba(240, 200, 80, 0.5);
  }
}
.dialog-input.single {
  margin-bottom: 8px;
  height: 36px;
  resize: none;
}

// ============ RANKINGS ============
.rank-tabs {
  display: flex;
  gap: 4px;
  padding: 6px 8px;
  flex-shrink: 0;
}
.rank-tab {
  flex: 1;
  padding: 5px 0;
  border: 1px solid rgba(80, 40, 20, 0.3);
  background: transparent;
  color: var(--chalk-d);
  font-size: 10px;
  cursor: pointer;
  border-radius: 4px;
  text-align: center;
  transition: all 0.2s;
  &:hover {
    color: var(--chalk);
  }
  &.active {
    color: var(--amber);
    border-color: rgba(180, 40, 40, 0.5);
    background: rgba(180, 40, 40, 0.12);
  }
}
.rank-board {
  padding: 8px;
}
.rank-title {
  text-align: center;
  font-size: 13px;
  color: var(--amber);
  margin-bottom: 10px;
  letter-spacing: 1px;
}
.rank-player-banner {
  text-align: center;
  font-size: 10px;
  color: var(--amber);
  padding: 4px 0;
  background: rgba(240, 208, 128, 0.08);
  border-radius: 4px;
  margin-bottom: 6px;
}
.rank-row.player {
  background: rgba(240, 208, 128, 0.12);
  border: 1px solid rgba(240, 208, 128, 0.4);
  border-radius: 4px;
  margin: 2px 0;
  .ri-rank {
    color: var(--amber) !important;
  }
}
.rank-hdr {
  display: flex;
  padding: 4px 8px;
  font-size: 10px;
  color: var(--chalk-d);
  border-bottom: 1px solid rgba(80, 40, 20, 0.35);
  margin-bottom: 4px;
  .rh-rank {
    width: 24px;
  }
  .rh-name {
    flex: 1;
  }
  .rh-lv {
    width: 36px;
    text-align: center;
  }
  .rh-team {
    width: 72px;
    text-align: right;
  }
}
.rank-row {
  display: flex;
  align-items: center;
  padding: 6px 8px;
  font-size: 11px;
  color: var(--chalk);
  border-bottom: 1px solid rgba(80, 40, 20, 0.1);
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
  &.top3 {
    background: rgba(180, 40, 40, 0.06);
  }
  &.player {
    background: rgba(240, 208, 128, 0.12);
    border: 1px solid rgba(240, 208, 128, 0.4);
    border-radius: 4px;
    .ri-name {
      color: var(--amber);
      font-weight: 700;
    }
  }
  .ri-rank {
    width: 24px;
    font-weight: 700;
    color: var(--chalk-d);
    &.r1 {
      color: #f0c040;
    }
    &.r2 {
      color: #c0c0c0;
    }
    &.r3 {
      color: #cd7f32;
    }
  }
}
.ri-name {
  flex: 1;
}
.ri-lv {
  width: 36px;
  text-align: center;
  color: var(--amber-d);
}
.ri-team {
  width: 72px;
  text-align: right;
  font-size: 10px;
  color: var(--chalk-d);
}

// ============ THREAD DETAIL ============
.d-post {
  padding: 10px 14px;
  border-bottom: 1px solid rgba(80, 40, 20, 0.18);
  .dp-head {
    display: flex;
    gap: 8px;
    align-items: center;
    margin-bottom: 4px;
  }
  .dp-author {
    font-size: 11px;
    color: var(--amber);
    font-weight: 600;
  }
  .dp-floor {
    font-size: 10px;
    color: var(--chalk-d);
    font-family: 'Courier New', monospace;
  }
  .dp-time {
    font-size: 10px;
    color: var(--chalk-d);
    margin-left: auto;
  }
  .dp-content {
    font-size: 12px;
    color: var(--chalk);
    line-height: 1.6;
    white-space: pre-wrap;
    word-break: break-word;
  }
}
.reply-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  flex-shrink: 0;
  background: rgba(30, 20, 14, 0.95);
  border-top: 1px solid rgba(80, 40, 20, 0.3);
}
.reply-input {
  flex: 1;
  padding: 7px 10px;
  background: rgba(16, 12, 8, 0.7);
  border: 1px solid rgba(80, 40, 20, 0.35);
  border-radius: 6px;
  color: var(--chalk);
  font-size: 11px;
  outline: none;
  &::placeholder {
    color: var(--chalk-d);
    opacity: 0.5;
  }
  &:focus {
    border-color: rgba(180, 40, 40, 0.5);
  }
}
.reply-btn {
  flex-shrink: 0;
  padding: 7px 14px;
  background: rgba(180, 40, 40, 0.25);
  border: 1px solid rgba(180, 40, 40, 0.4);
  color: var(--amber);
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
  &:hover {
    background: rgba(180, 40, 40, 0.4);
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
}
.reply-wait {
  font-size: 10px;
  color: var(--amber-d);
  white-space: nowrap;
}
.gen-overlay {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--amber-d);
  font-size: 12px;
}
.gen-spinner {
  width: 32px;
  height: 32px;
  border: 3px solid rgba(180, 40, 40, 0.2);
  border-top-color: var(--amber);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}
.d-post.nest1 {
  margin-left: 16px;
  border-left: 2px solid rgba(100, 140, 180, 0.3);
}
.d-post.nest2 {
  margin-left: 32px;
  border-left: 2px solid rgba(140, 100, 60, 0.25);
}
.retry-link {
  background: transparent;
  border: none;
  color: var(--amber);
  cursor: pointer;
  text-decoration: underline;
  font-size: 11px;
}

// ============ SETTINGS MENU ============
.settings-menu {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.menu-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 14px 16px;
  background: rgba(30, 18, 12, 0.5);
  border: 1px solid rgba(80, 40, 20, 0.25);
  border-radius: 10px;
  color: var(--chalk);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(180, 40, 40, 0.08);
    border-color: rgba(180, 40, 40, 0.3);
  }
  .menu-icon {
    font-size: 18px;
    width: 28px;
    text-align: center;
  }
  .menu-arrow {
    margin-left: auto;
    color: var(--chalk-d);
    font-size: 18px;
  }
}

// ============ SETTINGS SUB-PAGES ============
.settings-inner {
  padding: 8px 12px;
}
.set-block {
  margin-bottom: 14px;
}
.set-label {
  font-size: 11px;
  color: var(--amber);
  margin-bottom: 6px;
  letter-spacing: 1px;
}
.set-row {
  display: flex;
  gap: 8px;
}
.set-hint {
  font-size: 10px;
  color: var(--chalk-d);
  opacity: 0.6;
  padding: 4px 0;
}
/* 显示与字体 */
.set-val {
  color: var(--amber);
  font-size: 11px;
  margin-left: 6px;
}
.set-range {
  width: 100%;
  accent-color: var(--amber-d, #c8a860);
  cursor: pointer;
}
.set-reset-btn {
  width: 100%;
  padding: 8px;
  background: rgba(46, 30, 20, 0.7);
  border: 1px solid rgba(140, 100, 60, 0.35);
  border-radius: 6px;
  color: var(--chalk-d);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(70, 44, 26, 0.8);
    color: var(--chalk);
  }
}
.mode-btn {
  flex: 1;
  padding: 8px;
  background: rgba(16, 12, 8, 0.7);
  border: 1px solid rgba(80, 40, 20, 0.3);
  color: var(--chalk-d);
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    color: var(--chalk);
  }
  &.active {
    color: var(--amber);
    border-color: rgba(180, 40, 40, 0.5);
    background: rgba(180, 40, 40, 0.15);
  }
}
.test-btn {
  display: block;
  width: 100%;
  margin-top: 8px;
  padding: 8px;
  background: rgba(60, 100, 140, 0.2);
  border: 1px solid rgba(80, 120, 160, 0.4);
  color: #90c0e0;
  font-size: 11px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(60, 100, 140, 0.35);
  }
  &:disabled {
    opacity: 0.4;
  }
}
.test-msg {
  margin-top: 6px;
  padding: 6px 10px;
  background: rgba(180, 40, 40, 0.1);
  border: 1px solid rgba(180, 40, 40, 0.3);
  border-radius: 4px;
  font-size: 10px;
  color: var(--blood-b);
  word-break: break-all;
  &.ok {
    background: rgba(40, 140, 80, 0.1);
    border-color: rgba(40, 140, 80, 0.3);
    color: #60d080;
  }
}
.wb-load-btn {
  display: block;
  width: 100%;
  margin-bottom: 6px;
  padding: 6px;
  background: rgba(100, 80, 40, 0.15);
  border: 1px solid rgba(140, 100, 40, 0.3);
  color: var(--amber-d);
  font-size: 10px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: rgba(100, 80, 40, 0.25);
  }
}
.wb-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 8px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}
.wb-check {
  font-size: 12px;
  color: var(--chalk-d);
  &.on {
    color: var(--amber);
  }
}
.wb-name {
  font-size: 11px;
  color: var(--chalk);
}
.wb-search-row {
  display: flex;
  gap: 6px;
  margin-bottom: 6px;
}
.wb-search {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  background: rgba(16, 12, 8, 0.7);
  border: 1px solid rgba(80, 40, 20, 0.35);
  border-radius: 4px;
  color: var(--chalk);
  font-size: 11px;
  outline: none;
  &::placeholder {
    color: var(--chalk-d);
    opacity: 0.5;
  }
  &:focus {
    border-color: rgba(180, 40, 40, 0.5);
  }
}
.wb-block {
  margin-bottom: 2px;
}
.wb-expand {
  margin-left: auto;
  flex-shrink: 0;
  width: 22px;
  height: 22px;
  background: transparent;
  border: 1px solid rgba(80, 40, 20, 0.3);
  border-radius: 4px;
  color: var(--amber-d);
  font-size: 10px;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:hover {
    background: rgba(255, 255, 255, 0.05);
  }
}
.wb-entries {
  padding: 4px 0 6px 10px;
  border-left: 1px solid rgba(80, 40, 20, 0.25);
  margin: 0 0 4px 8px;
}
.wb-entry-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 4px;
  flex-wrap: wrap;
}
.wb-mini {
  padding: 3px 8px;
  background: rgba(100, 80, 40, 0.15);
  border: 1px solid rgba(140, 100, 40, 0.3);
  color: var(--amber-d);
  font-size: 10px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: rgba(100, 80, 40, 0.25);
  }
}
.wb-count {
  font-size: 10px;
  color: var(--chalk-d);
  opacity: 0.7;
  margin-left: auto;
}
.wb-entry {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 6px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.1s;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}
.wb-entry-name {
  font-size: 11px;
  color: var(--chalk-d);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.prof-select {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  background: rgba(16, 12, 8, 0.7);
  border: 1px solid rgba(80, 40, 20, 0.35);
  border-radius: 4px;
  color: var(--chalk);
  font-size: 11px;
  outline: none;
  &:focus {
    border-color: rgba(180, 40, 40, 0.5);
  }
}
.set-row .test-btn {
  width: auto;
  flex-shrink: 0;
  margin-top: 0;
  padding: 6px 10px;
  white-space: nowrap;
}

// ============ WALLPAPER ============
.wp-preview {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  border: 1px solid rgba(80, 40, 20, 0.35);
  margin-bottom: 8px;
  background: var(--bg);
}
.wp-clear-btn {
  display: block;
  width: 100%;
  padding: 6px;
  background: rgba(180, 40, 40, 0.15);
  border: 1px solid rgba(180, 40, 40, 0.3);
  color: var(--amber-d);
  font-size: 10px;
  border-radius: 4px;
  cursor: pointer;
  &:hover {
    background: rgba(180, 40, 40, 0.25);
  }
}
.wp-upload-btn {
  display: block;
  width: 100%;
  padding: 10px;
  background: rgba(60, 100, 140, 0.15);
  border: 1px solid rgba(80, 120, 160, 0.3);
  color: #90c0e0;
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  &:hover {
    background: rgba(60, 100, 140, 0.25);
  }
}
.wp-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}
.wp-preset {
  cursor: pointer;
  text-align: center;
  transition: transform 0.15s;
  &:hover {
    transform: scale(1.03);
  }
  &.selected {
    .wp-preset-img {
      border-color: var(--amber);
      box-shadow: 0 0 12px rgba(240, 208, 128, 0.3);
    }
  }
}
.wp-preset-img {
  width: 100%;
  aspect-ratio: 9/16;
  border-radius: 6px;
  border: 2px solid rgba(80, 40, 20, 0.3);
  background-size: cover;
  background-position: center;
  background-color: var(--bg);
}
.wp-preset-label {
  font-size: 10px;
  color: var(--chalk-d);
  margin-top: 4px;
  display: block;
}

// ============ MISC ============
.set-err {
  margin-top: 8px;
  padding: 8px 12px;
  background: rgba(180, 40, 40, 0.12);
  border: 1px solid rgba(180, 40, 40, 0.35);
  border-radius: 6px;
  font-size: 11px;
  color: var(--blood-b);
}
.refresh-err {
  padding: 8px 12px;
  margin: 4px 8px;
  background: rgba(180, 40, 40, 0.12);
  border: 1px solid rgba(180, 40, 40, 0.3);
  border-radius: 6px;
  font-size: 10px;
  color: var(--blood-b);
}
.empty-msg {
  text-align: center;
  padding: 30px 0;
  color: var(--chalk-d);
  font-size: 12px;
  opacity: 0.7;
}

// ============ RESPONSIVE: mobile / tablet device modes ============
// CSS !important 权重高于 Vue :style 内联样式，自动覆盖非拖动时的位置
.float-btn.float-btn.float-btn.mobile-mode:not(.dragging) {
  left: auto !important;
  top: auto !important;
  right: 12px !important;
  bottom: 24px !important;
  width: 48px !important;
  height: 48px !important;
  transform: none !important;
}
.float-btn.float-btn.float-btn.tablet-mode:not(.dragging) {
  left: auto !important;
  top: auto !important;
  right: 15px !important;
  bottom: 15px !important;
  width: 54px !important;
  height: 54px !important;
  transform: none !important;
}
@media (max-width: 480px) {
  .phone-frame.phone-frame {
    width: 94vw !important;
    max-width: 100% !important;
    height: 88vh !important;
    height: 88dvh !important;
    max-height: calc(100vh - 20px) !important;
    max-height: calc(100dvh - 20px) !important;
    border-radius: 28px !important;
  }
}
@media (min-width: 481px) and (max-width: 768px) {
  .phone-frame.phone-frame {
    width: calc(320px * var(--ps, 1)) !important;
    max-width: 92vw !important;
    height: calc(600px * var(--ps, 1)) !important;
    max-height: calc(100vh - 30px) !important;
    max-height: calc(100dvh - 30px) !important;
  }
}

// ============ CAREER ICON ============
.career-icon {
  background: linear-gradient(135deg, #2a2010, #1a1008);
  border: 1.5px solid rgba(200, 180, 100, 0.25);
}
.dungeon-icon {
  background: linear-gradient(135deg, #1a1420, #0c0810);
  border: 1.5px solid rgba(140, 100, 200, 0.25);
}
.arena-icon {
  background: linear-gradient(135deg, #1a2220, #0c1210);
  border: 1.5px solid rgba(120, 180, 200, 0.25);
}

// ============ DIALOG ============
.dialog-mask {
  position: absolute;
  inset: 0;
  z-index: 30;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
}
.dialog-box {
  width: 88%;
  max-width: 280px;
  background: linear-gradient(180deg, #201810, #14100a);
  border: 1px solid rgba(140, 100, 40, 0.35);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8);
}
.dialog-title {
  font-size: 13px;
  color: var(--amber);
  font-weight: 600;
  margin-bottom: 10px;
  letter-spacing: 1px;
}
.dialog-body {
  font-size: 11px;
  color: var(--chalk-d);
  margin-bottom: 12px;
  line-height: 1.5;
}
.dialog-input {
  width: 100%;
  padding: 10px;
  background: rgba(16, 12, 8, 0.8);
  border: 1px solid rgba(80, 40, 20, 0.4);
  border-radius: 8px;
  color: var(--chalk);
  font-size: 11px;
  resize: none;
  outline: none;
  font-family: inherit;
  &::placeholder {
    color: var(--chalk-d);
    opacity: 0.5;
  }
  &:focus {
    border-color: rgba(180, 40, 40, 0.5);
  }
}
.dialog-btns {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  justify-content: flex-end;
}
.dialog-btn {
  padding: 7px 18px;
  border-radius: 6px;
  font-size: 11px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
  &.cancel {
    background: transparent;
    color: var(--chalk-d);
    border-color: rgba(80, 40, 20, 0.3);
    &:hover {
      color: var(--chalk);
    }
  }
  &.confirm {
    background: rgba(180, 40, 40, 0.2);
    border-color: rgba(180, 40, 40, 0.4);
    color: var(--amber);
    &:hover {
      background: rgba(180, 40, 40, 0.35);
    }
    &:disabled {
      opacity: 0.3;
      cursor: default;
    }
  }
  &.danger {
    background: rgba(180, 40, 40, 0.3);
    border-color: rgba(180, 40, 40, 0.5);
    color: #f06050;
    &:hover {
      background: rgba(180, 40, 40, 0.5);
    }
  }
}

// ============ DUNGEON WIZARD ============
.dungeon-faction-row {
  display: flex;
  gap: 6px;
  margin-bottom: 4px;
}
.faction-btn {
  flex: 1;
  padding: 10px 0;
  background: rgba(16, 12, 8, 0.7);
  border: 1px solid rgba(80, 40, 20, 0.3);
  color: var(--chalk-d);
  font-size: 12px;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    color: var(--chalk);
  }
  &.active {
    background: rgba(240, 208, 128, 0.15);
    border-color: rgba(240, 208, 128, 0.5);
    color: var(--amber);
    font-weight: 600;
  }
}
.dungeon-choice-btn {
  display: block;
  width: 100%;
  padding: 12px;
  margin-bottom: 8px;
  background: rgba(30, 18, 12, 0.5);
  border: 1px solid rgba(80, 40, 20, 0.3);
  border-radius: 8px;
  color: var(--chalk);
  font-size: 13px;
  cursor: pointer;
  transition: all 0.2s;
  &:hover {
    background: rgba(180, 40, 40, 0.12);
    border-color: rgba(180, 40, 40, 0.4);
  }
}
.dungeon-mode-btn {
  display: flex;
  align-items: center;
  gap: 10px;
  width: 100%;
  padding: 10px 12px;
  margin-bottom: 6px;
  background: rgba(16, 12, 8, 0.7);
  border: 1px solid rgba(80, 40, 20, 0.3);
  border-radius: 8px;
  color: var(--chalk);
  font-size: 12px;
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  &:hover {
    border-color: rgba(180, 40, 40, 0.4);
  }
  &.active {
    background: rgba(180, 40, 40, 0.15);
    border-color: rgba(180, 40, 40, 0.5);
  }
  .dm-icon {
    font-size: 18px;
    flex-shrink: 0;
  }
  .dm-text {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }
  b {
    font-size: 12px;
    color: var(--chalk);
  }
  i {
    font-size: 10px;
    color: var(--chalk-d);
    font-style: normal;
  }
}

// ============ CAREER LIST ============
.empty-state {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 30px 20px;
  text-align: center;
}
.empty-icon {
  font-size: 40px;
  margin-bottom: 12px;
  opacity: 0.6;
}
.empty-text {
  font-size: 14px;
  color: var(--chalk);
  margin-bottom: 6px;
  font-weight: 500;
}
.empty-sub {
  font-size: 11px;
  color: var(--chalk-d);
  line-height: 1.5;
  max-width: 240px;
}
.plan-card {
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid rgba(80, 40, 20, 0.18);
  transition: background 0.1s;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}
.pc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}
.pc-name {
  font-size: 13px;
  color: var(--chalk);
  font-weight: 600;
}
.pc-rarity {
  font-size: 10px;
  padding: 2px 8px;
  border-radius: 4px;
  font-weight: 500;
  &.rarity-白色 {
    background: rgba(180, 180, 180, 0.15);
    color: #c0c0c0;
  }
  &.rarity-蓝色 {
    background: rgba(80, 140, 220, 0.15);
    color: #80b0e0;
  }
  &.rarity-金色 {
    background: rgba(240, 200, 40, 0.15);
    color: #f0c028;
  }
  &.rarity-紫色 {
    background: rgba(160, 80, 220, 0.15);
    color: #a050dc;
  }
  &.rarity-银色 {
    background: rgba(200, 200, 220, 0.15);
    color: #c8c8dc;
  }
}
.pc-concept {
  font-size: 11px;
  color: var(--chalk-d);
  margin-bottom: 6px;
  line-height: 1.4;
}
.pc-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 10px;
}
.pc-tag {
  color: var(--amber-d);
  background: rgba(240, 208, 128, 0.08);
  padding: 1px 6px;
  border-radius: 3px;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.pc-time {
  color: var(--chalk-d);
  opacity: 0.6;
}
.pc-phase {
  padding: 1px 6px;
  border-radius: 3px;
  &.pending {
    background: rgba(180, 140, 40, 0.15);
    color: var(--amber-d);
  }
  &.done {
    background: rgba(40, 140, 80, 0.12);
    color: #60d080;
  }
}
.career-fab {
  flex-shrink: 0;
  padding: 10px 14px;
  display: flex;
  justify-content: center;
}
.fab-btn {
  width: 100%;
  padding: 10px;
  background: rgba(180, 40, 40, 0.15);
  border: 1px solid rgba(180, 40, 40, 0.35);
  color: var(--amber);
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: all 0.2s;
  &:hover {
    background: rgba(180, 40, 40, 0.28);
    border-color: rgba(180, 40, 40, 0.5);
  }
}

// ============ CAREER DETAIL ============
.detail-scroll {
  padding: 8px 12px;
}
.detail-block {
  padding: 12px;
  margin-bottom: 10px;
  background: rgba(30, 18, 12, 0.35);
  border: 1px solid rgba(80, 40, 20, 0.2);
  border-radius: 10px;
  &.warning {
    background: rgba(180, 40, 40, 0.08);
    border-color: rgba(180, 40, 40, 0.3);
  }
}
.db-title {
  font-size: 12px;
  color: var(--amber);
  font-weight: 600;
  margin-bottom: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
}
.db-icon {
  font-size: 14px;
}
.db-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 3px 0;
  font-size: 11px;
  & + .db-row {
    border-top: 1px solid rgba(80, 40, 20, 0.1);
  }
}
.db-label {
  color: var(--chalk-d);
  flex-shrink: 0;
  margin-right: 10px;
  min-width: 50px;
}
.db-value {
  color: var(--chalk);
  text-align: right;
  line-height: 1.4;
  word-break: break-word;
}
.db-section {
  padding: 6px 0;
  & + .db-section {
    border-top: 1px solid rgba(80, 40, 20, 0.1);
  }
  .db-label {
    margin-bottom: 4px;
    display: block;
    font-size: 10px;
    color: var(--amber-d);
    letter-spacing: 1px;
  }
}
.db-text {
  font-size: 11px;
  color: var(--chalk);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}
.rarity-badge {
  padding: 1px 8px;
  border-radius: 4px;
  font-weight: 500;
  &.rarity-白色 {
    background: rgba(180, 180, 180, 0.15);
    color: #c0c0c0;
  }
  &.rarity-蓝色 {
    background: rgba(80, 140, 220, 0.15);
    color: #80b0e0;
  }
  &.rarity-金色 {
    background: rgba(240, 200, 40, 0.15);
    color: #f0c028;
  }
  &.rarity-紫色 {
    background: rgba(160, 80, 220, 0.15);
    color: #a050dc;
  }
  &.rarity-银色 {
    background: rgba(200, 200, 220, 0.15);
    color: #c8c8dc;
  }
}
.affinity-high {
  color: #60d080 !important;
  font-weight: 600;
}
.step-item {
  display: flex;
  gap: 8px;
  padding: 4px 0;
  align-items: flex-start;
  & + .step-item {
    border-top: 1px solid rgba(80, 40, 20, 0.1);
  }
}
.step-num {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  background: rgba(240, 208, 128, 0.15);
  border: 1px solid rgba(240, 208, 128, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 10px;
  color: var(--amber);
  font-weight: 600;
}
.step-text {
  font-size: 11px;
  color: var(--chalk);
  line-height: 1.5;
  flex: 1;
}
.detail-footer {
  padding: 16px 12px 24px;
  text-align: center;
}
.confirm-btn {
  width: 100%;
  padding: 12px;
  background: rgba(180, 40, 40, 0.2);
  border: 1px solid rgba(180, 40, 40, 0.4);
  color: var(--amber);
  font-size: 13px;
  border-radius: 8px;
  cursor: pointer;
  letter-spacing: 1px;
  transition: all 0.2s;
  &:hover {
    background: rgba(180, 40, 40, 0.35);
  }
  &:disabled {
    opacity: 0.3;
    cursor: default;
  }
  &.modify {
    background: rgba(100, 140, 180, 0.15);
    border-color: rgba(100, 140, 180, 0.3);
    color: #90c0e0;
    margin-top: 6px;
    &:hover {
      background: rgba(100, 140, 180, 0.3);
    }
  }
  &.reroll {
    background: rgba(160, 120, 40, 0.15);
    border-color: rgba(160, 120, 40, 0.3);
    color: #d0b070;
    margin-top: 6px;
    &:hover {
      background: rgba(160, 120, 40, 0.3);
    }
  }
}
.confirm-hint {
  font-size: 10px;
  color: var(--chalk-d);
  margin-top: 8px;
  opacity: 0.6;
  line-height: 1.4;
}
.hdr-btn.del {
  svg {
    color: rgba(200, 80, 60, 0.7);
  }
  &:hover {
    background: rgba(180, 40, 40, 0.2);
    svg {
      color: #f06050;
    }
  }
}

// ============ PVP ARENA ============
.arena-my {
  padding: 12px;
}
.arena-actions {
  flex-wrap: wrap;
}
.arena-upload {
  background: rgba(180, 40, 40, 0.15);
  border-color: rgba(180, 40, 40, 0.35);
}
.arena-edit {
  background: rgba(120, 80, 40, 0.15);
  border-color: rgba(140, 100, 40, 0.35);
}
.arena-dl {
  background: rgba(40, 120, 80, 0.15);
  border-color: rgba(60, 140, 100, 0.35);
}
.arena-section-label {
  font-size: 11px;
  color: var(--amber);
  padding: 8px 12px 4px;
  letter-spacing: 1px;
}
.tier-label {
  font-size: 10px;
  color: var(--chalk-d);
  padding: 8px 12px 4px;
  opacity: 0.8;
}
.contract-card {
  padding: 12px 14px;
  cursor: pointer;
  border-bottom: 1px solid rgba(80, 40, 20, 0.18);
  transition: background 0.1s;
  &:hover {
    background: rgba(255, 255, 255, 0.03);
  }
}
.cc-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cc-name {
  font-size: 13px;
  color: var(--chalk);
  font-weight: 600;
}
.cc-lv {
  font-size: 10px;
  color: var(--amber);
}
.cc-meta {
  font-size: 10px;
  color: var(--chalk-d);
  margin-top: 2px;
}
.cc-intro {
  font-size: 11px;
  color: var(--chalk);
  margin-top: 4px;
  line-height: 1.4;
}
.cc-foot {
  display: flex;
  justify-content: space-between;
  font-size: 10px;
  color: var(--chalk-d);
  margin-top: 6px;
  opacity: 0.7;
}
.cc-tag {
  color: var(--amber);
}
.my-save-preview {
  background: rgba(40, 120, 80, 0.1);
  border: 1px solid rgba(60, 140, 100, 0.3);
  border-radius: 8px;
  padding: 8px 10px;
  margin-bottom: 8px;
}
.ms-name {
  font-size: 13px;
  color: var(--chalk);
  font-weight: 600;
}
.ms-meta {
  font-size: 10px;
  color: var(--chalk-d);
  margin-top: 2px;
}
.toggle-row {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--chalk-d);
  font-size: 11px;
}
.edit-module {
  margin-bottom: 14px;
}

// ============ ARENA DETAIL / AUTHOR ============
.arena-detail {
  padding: 12px;
}
.cd-name {
  font-size: 15px;
  color: var(--chalk);
  font-weight: 700;
  display: flex;
  align-items: center;
  gap: 6px;
}
.cd-tag {
  font-size: 10px;
  color: var(--amber);
  border: 1px solid rgba(180, 40, 40, 0.4);
  border-radius: 3px;
  padding: 1px 5px;
}
.cd-meta {
  font-size: 11px;
  color: var(--chalk-d);
  margin-top: 4px;
}
.cd-appearance {
  font-size: 11px;
  color: var(--chalk);
  margin-top: 6px;
  line-height: 1.4;
}
.cd-intro {
  font-size: 12px;
  color: var(--chalk);
  margin-top: 8px;
  padding: 8px;
  background: rgba(180, 40, 40, 0.08);
  border-radius: 6px;
}
.cd-foot {
  font-size: 10px;
  color: var(--chalk-d);
  margin-top: 6px;
  opacity: 0.7;
}
.cd-job {
  font-size: 12px;
  color: var(--chalk);
  font-weight: 500;
}
.cd-sub {
  font-size: 11px;
  color: var(--chalk-d);
  margin-top: 2px;
}
.cd-attrs {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  font-size: 12px;
  color: var(--chalk);
}
.cd-slot {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  color: var(--chalk-d);
  padding: 2px 0;
  border-bottom: 1px dashed rgba(80, 40, 20, 0.15);
}
.cd-slot-name {
  color: var(--amber);
}
.arena-bottom-bar {
  padding: 8px 12px;
  flex-shrink: 0;
  background: rgba(30, 20, 14, 0.95);
  border-top: 1px solid rgba(80, 40, 20, 0.35);
}
.arena-battle {
  width: 100%;
  background: rgba(180, 40, 40, 0.2);
  border-color: rgba(180, 40, 40, 0.5);
  font-size: 14px;
}
.author-preview {
  background: rgba(40, 120, 80, 0.1);
  border: 1px solid rgba(60, 140, 100, 0.3);
  border-radius: 6px;
  padding: 8px 10px;
  margin: 8px 0;
}
.ap-name {
  font-size: 13px;
  color: var(--chalk);
  font-weight: 600;
}
.ap-meta {
  font-size: 10px;
  color: var(--chalk-d);
  margin-top: 2px;
}
.author-del {
  background: none;
  border: 1px solid rgba(180, 40, 40, 0.4);
  color: #d06050;
  border-radius: 4px;
  font-size: 10px;
  padding: 2px 8px;
  cursor: pointer;
  margin-left: auto;
}

// ============ DUNGEON ROLL ============
.roll-cycle {
  font-size: 11px;
  color: var(--chalk-d);
  text-align: center;
  padding: 8px 0;
}
.roll-btn {
  display: block;
  width: calc(100% - 24px);
  margin: 8px 12px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: linear-gradient(135deg, #7c3aed, #4c1d95);
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 2px;
  cursor: pointer;
  &:disabled {
    opacity: 0.5;
  }
}
.roll-section {
  margin: 10px 12px;
  border: 1px solid rgba(120, 80, 40, 0.3);
  border-radius: 8px;
  overflow: hidden;
}
.roll-section-title {
  padding: 6px 8px;
  background: rgba(120, 80, 40, 0.18);
  font-size: 11px;
  font-weight: 700;
}
.roll-row {
  display: grid;
  grid-template-columns: 1fr auto auto 1fr;
  gap: 6px;
  align-items: center;
  padding: 4px 8px;
  font-size: 11px;
  border-top: 1px solid rgba(120, 80, 40, 0.12);
}
.roll-row.active {
  background: rgba(120, 80, 40, 0.28);
}
.roll-label {
  color: var(--chalk-d);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.roll-expr {
  color: var(--chalk-d);
  font-family: monospace;
  font-size: 10px;
}
.roll-value {
  font-weight: 700;
  color: #f0c674;
  font-family: monospace;
}
.roll-map {
  text-align: right;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dungeonroll-icon {
  background: linear-gradient(135deg, #7c3aed, #4c1d95);
}
.dungeon-card {
  margin: 10px 12px;
  padding: 10px;
  border: 1px solid rgba(120, 80, 40, 0.35);
  border-radius: 10px;
  background: rgba(30, 20, 15, 0.5);
}
.dc-name {
  font-size: 15px;
  font-weight: 700;
  color: #f0c674;
}
.dc-meta {
  font-size: 11px;
  color: var(--chalk-d);
  margin-top: 2px;
}
.dc-bg {
  font-size: 12px;
  margin-top: 6px;
  line-height: 1.5;
}
.dc-details {
  margin-top: 6px;
  font-size: 12px;
  & summary {
    cursor: pointer;
    color: #c9a227;
    font-weight: 700;
  }
}
.dc-line {
  margin-top: 4px;
}
.dc-sub {
  font-size: 11px;
  color: var(--chalk-d);
  line-height: 1.45;
}
.dc-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 10px;
}
.enemy-block {
  margin-top: 10px;
}
.enemy-row {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 8px;
  font-size: 12px;
  color: var(--chalk);
  border-bottom: 1px solid rgba(80, 40, 20, 0.18);
}
.enemy-name {
  flex: 1;
  color: var(--chalk);
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.enemy-kind {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--amber-d);
  background: rgba(180, 40, 40, 0.12);
  border: 1px solid rgba(180, 40, 40, 0.3);
  border-radius: 3px;
  padding: 1px 6px;
}
.enemy-lv {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--chalk-d);
  font-family: 'Courier New', monospace;
}
.enemy-wrote {
  flex-shrink: 0;
  font-size: 10px;
  color: var(--amber);
}
.enemy-panel {
  margin-top: 10px;
}
.enemy-panel-text {
  white-space: pre-wrap;
  word-break: break-all;
  font-size: 11px;
  line-height: 1.5;
  color: var(--chalk);
  background: var(--iron-d);
  border: 1px solid var(--iron);
  border-radius: 6px;
  padding: 8px;
  margin: 6px 0;
  max-height: 320px;
  overflow: auto;
  font-family: 'Courier New', monospace;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

// ============ 副本结算 ============
.settlement-icon {
  background: linear-gradient(135deg, #3a1a2a, #20101a);
  border: 1.5px solid rgba(200, 120, 160, 0.25);
}
.settlement-scores {
  margin: 10px 12px;
  border: 1px solid rgba(120, 80, 40, 0.3);
  border-radius: 8px;
  overflow: hidden;
}
.ss-title {
  padding: 6px 8px;
  background: rgba(120, 80, 40, 0.18);
  font-size: 11px;
  font-weight: 700;
}
.ss-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 8px;
  font-size: 11px;
  border-top: 1px solid rgba(120, 80, 40, 0.12);
}
.settle-warn {
  color: var(--blood-b);
  opacity: 1;
}
.write-mask {
  position: absolute;
  inset: 0;
  z-index: 40;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--amber-d);
  font-size: 12px;
}

// ============ 状态栏页面 ============
.statusbar-icon {
  background: linear-gradient(135deg, #3a2a10, #201508);
  border: 1.5px solid rgba(240, 208, 128, 0.3);
}
/* 状态栏打开时手机框展开为宽屏面板（桌面端）；手机端由 mobile-compat 贴满可见视口 */
.phone-frame {
  transition:
    width 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    height 0.35s cubic-bezier(0.16, 1, 0.3, 1),
    border-radius 0.35s;
}
.phone-frame.sb-open {
  width: min(980px, 94vw);
  height: min(92vh, 920px);
  height: min(92dvh, 920px);
  border-radius: 18px;
}
.sb-page {
  background: var(--sb-void, #080504);
}
.sb-body {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  min-height: 0;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar {
    display: none;
  }
}

// ============ 副本生成 · 自选模式 ============
.roll-mode-tabs {
  display: flex;
  gap: 6px;
  margin: 0 12px 8px;
}
.roll-mode-tab {
  flex: 1;
  padding: 6px 0;
  background: rgba(30, 20, 14, 0.7);
  border: 1px solid rgba(120, 80, 40, 0.3);
  border-radius: 6px;
  color: var(--chalk-d);
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
  &.active {
    color: var(--amber);
    border-color: rgba(240, 208, 128, 0.5);
    background: rgba(120, 80, 40, 0.2);
  }
}
.custom-panel {
  margin: 0 12px 10px;
  padding: 10px;
  border: 1px solid rgba(120, 80, 40, 0.35);
  border-radius: 8px;
  background: rgba(30, 20, 15, 0.5);
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cp-field {
  display: flex;
  align-items: center;
  gap: 8px;
}
.cp-label {
  font-size: 11px;
  color: var(--chalk-d);
  width: 56px;
  flex-shrink: 0;
}
.cp-input,
.cp-select {
  flex: 1;
  min-width: 0;
  padding: 6px 8px;
  background: rgba(16, 12, 8, 0.7);
  border: 1px solid rgba(80, 40, 20, 0.35);
  border-radius: 6px;
  color: var(--chalk);
  font-size: 12px;
  outline: none;
  &:focus {
    border-color: rgba(240, 208, 128, 0.5);
  }
}
.cp-world-badge {
  margin-top: 6px;
  font-size: 11px;
  color: var(--amber);
}
// 副本生成的两个开关（动态事件 / 同人契约者）: 沿用 .custom-panel 的那套盒子与 12px 内缩 ——
// 它们在**两种掷骰模式下**都要显示, 所以不能塞进只属于自选模式的 .custom-panel, 只能另起一个
// 同款容器; 字段因此和上方的自选字段落在同一条竖线上（12px 边距 + 10px 内边距）。
.roll-options {
  margin: 0 12px 10px;
  padding: 10px;
  border: 1px solid rgba(120, 80, 40, 0.35);
  border-radius: 8px;
  background: rgba(30, 20, 15, 0.5);
  display: flex;
  flex-direction: column;
  gap: 8px;

  // 提示文字比「标签 + 下拉」长得多, 让它独占一行（全仓的 .set-hint 本来也都是独占一行的块）。
  // 否则它带着内容宽度参与同一行的伸缩, 会把同一行里的下拉挤到只剩 padding + border 的十几像素
  // —— CR≤4 时同人性别下拉正好与提示同排。
  .cp-field {
    flex-wrap: wrap;
  }
  .set-hint {
    flex-basis: 100%;
  }
  // .refresh-err 自带 4px/8px 边距: 进了本容器要归零, 否则比同排的开关行多缩 8px
  .refresh-err {
    margin: 0;
  }
}
// 复选框标签: 内容是「复选框 + 六七个汉字」, 直接套 .cp-label 的 56px 定宽会溢出、压到右侧提示。
// 用 min-width 而非 width —— 两行的控件因此仍从同一条竖线开始, 字再长也只是把它撑开, 不会被裁。
// 104px = 复选框 13 + 间距 6 + 七个汉字 77 + 余量。
.cp-label-check {
  width: auto;
  min-width: 104px;
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}
// 直接挂在 .scroll-area 上的 .set-hint 要自己补 12px 内缩 —— .scroll-area 没有 padding, 而它上下的
// .roll-section / .roll-btn 都落在 12px 线上。只能做修饰类: 其余 9 处 .set-hint 都在已有 padding 的
// 容器里, 给共享的 .set-hint 加 margin 会把那 9 处双重缩进。
.set-hint-inset {
  margin: 0 12px;
}
</style>
