/* ============================================================
   无限回廊 · 状态栏核心逻辑
   一份代码两个壳：
   - 楼内正则版：src/wxhl-statusbar 打包成自包含 HTML
   - 小手机版：  wxhl-003 App.vue 中作为大页面挂载
   所有 DOM 查询以 mountStatusbar 传入的 root 为作用域，
   因此两个实例可以共存于同一酒馆页面而互不干扰。
   ============================================================ */

import template from './template.html';

/** 挂载状态栏到 root 元素，返回卸载函数 */
export function mountStatusbar(root: HTMLElement): () => void {
  const $root = $(root).addClass('wxhl-sb');
  $root.html(template);
  const $c = $root.find('#container');

  /* ==================== UI折叠状态记忆（localStorage持久化） ==================== */
  function loadUiState() {
    try {
      const raw = localStorage.getItem('mvu_statusbar_ui_state');
      if (raw) {
        const p = JSON.parse(raw);
        return {
          expand_entities: new Set<string>(p.expand_entities || []),
          expand_subs: new Set<string>(p.expand_subs || []),
          collapsed_sections: new Set<string>(p.collapsed_sections || []),
          collapsed_groups: new Set<string>(p.collapsed_groups || []),
        };
      }
    } catch (e) {
      /* localStorage 不可用时使用默认状态 */
    }
    return {
      expand_entities: new Set<string>(),
      expand_subs: new Set<string>(),
      collapsed_sections: new Set<string>(),
      collapsed_groups: new Set<string>(),
    };
  }
  const _ui = loadUiState();

  function persistUiState() {
    try {
      localStorage.setItem(
        'mvu_statusbar_ui_state',
        JSON.stringify({
          expand_entities: [..._ui.expand_entities],
          expand_subs: [..._ui.expand_subs],
          collapsed_sections: [..._ui.collapsed_sections],
          collapsed_groups: [..._ui.collapsed_groups],
        }),
      );
    } catch (e) {
      /* localStorage 不可用时放弃持久化 */
    }
  }

  /* HTML属性转义：防止实体名/物品名含引号时炸属性 */
  function escapeAttr(str: any) {
    return String(str === undefined || str === null ? '' : str).replace(/"/g, '&quot;');
  }

  /* 最新楼层 MVU 变量（楼内正则版与手机版共用同一数据源） */
  function getAllVariables() {
    return Mvu.getMvuData({ type: 'message', message_id: 'latest' });
  }

  /* ==================== 实体类型判定 ==================== */
  function getEntityMode(entity: any) {
    const t = String(_.get(entity, '类型', ''));
    if (t.indexOf('杂兵') >= 0) return 'enemy';
    if (t.indexOf('精英') >= 0) return 'enemy';
    if (t.indexOf('BOSS') >= 0 || t.indexOf('boss') >= 0) return 'enemy';
    return 'player';
  }

  function getHpFactor(entity: any) {
    const t = String(_.get(entity, '类型', ''));
    if (t.indexOf('隐藏BOSS') >= 0 || t.indexOf('隐藏boss') >= 0) return 25;
    if (t.indexOf('BOSS') >= 0 || t.indexOf('boss') >= 0) return 20;
    if (t.indexOf('精英') >= 0) return 10;
    if (t.indexOf('杂兵') >= 0) return 8;
    return 15;
  }

  function getRankMultiplier(rankStr: string) {
    if (rankStr === '一阶') return 1;
    if (rankStr === '二阶') return 2;
    if (rankStr === '三阶') return 4;
    if (rankStr === '四阶') return 7;
    if (rankStr === '五阶') return 11;
    if (rankStr === '超脱者' || rankStr === '超脱') return 16;
    return 1;
  }

  /* ==================== 装备物品判定（字段特征法） ==================== */
  function isEquippableItem(item: any) {
    if (!item || typeof item !== 'object') return false;
    const mainAttr = String(_.get(item, '主属性', '无') || '无');
    const mainBonus = Number(_.get(item, '主属性加成', 0)) || 0;
    const subAttr = String(_.get(item, '副属性', '无') || '无');
    const subBonus = Number(_.get(item, '副属性加成', 0)) || 0;
    const dice = String(_.get(item, '伤害骰', '无') || '无');
    const def = Number(_.get(item, '装备防御', 0)) || 0;
    const dodge = Number(_.get(item, '装备闪避', 0)) || 0;
    const req = String(_.get(item, '穿戴门槛', '无') || '无');

    const hasAttr = (mainAttr !== '无' && mainAttr !== '') || (subAttr !== '无' && subAttr !== '');
    const hasBonus = mainBonus > 0 || subBonus > 0;
    const hasDice = dice !== '无' && dice !== '';
    const hasDef = def > 0;
    const hasDodge = dodge > 0;
    const hasReq = req !== '无' && req !== '';

    return hasAttr || hasBonus || hasDice || hasDef || hasDodge || hasReq;
  }

  function appendSystemLog(data: any, actionDesc: string) {
    const logMessage = `[前端面板交互：${actionDesc}]`;
    let logs = _.get(data.stat_data, '系统日志', []);
    if (!Array.isArray(logs)) logs = [];
    logs.push(logMessage);
    _.set(data.stat_data, '系统日志', logs);
  }

  function toggleGroup(header: JQuery) {
    const k = 'grp:' + header.find('.group-title').text().trim();
    if (_ui.collapsed_groups.has(k)) _ui.collapsed_groups.delete(k);
    else _ui.collapsed_groups.add(k);
    applyUiStateToDom();
    persistUiState();
  }
  function toggleSection(header: JQuery) {
    const k = 'sec:' + header.find('.section-title').text().trim();
    if (_ui.collapsed_sections.has(k)) _ui.collapsed_sections.delete(k);
    else _ui.collapsed_sections.add(k);
    applyUiStateToDom();
    persistUiState();
  }
  function toggleEntity(header: JQuery) {
    const k = header.attr('data-entity-key')!;
    if (_ui.expand_entities.has(k)) _ui.expand_entities.delete(k);
    else _ui.expand_entities.add(k);
    applyUiStateToDom();
    persistUiState();
  }
  function toggleMateSub(header: JQuery) {
    const k = header.attr('data-sub-key')!;
    if (_ui.expand_subs.has(k)) _ui.expand_subs.delete(k);
    else _ui.expand_subs.add(k);
    applyUiStateToDom();
    persistUiState();
  }

  /* 统一将Set状态应用到DOM */
  function applyUiStateToDom() {
    $c.find('.group-header').each(function () {
      const k = 'grp:' + $(this).find('.group-title').text().trim();
      const c = _ui.collapsed_groups.has(k);
      $(this).find('.group-toggle').toggleClass('collapsed', c);
      $(this).next('.group-body').toggleClass('hidden', c);
    });
    $c.find('.section-header').each(function () {
      const k = 'sec:' + $(this).find('.section-title').text().trim();
      const c = _ui.collapsed_sections.has(k);
      $(this).find('.section-toggle').toggleClass('collapsed', c);
      $(this).next('.section-body').toggleClass('hidden', c);
    });
    $c.find('.entity-header').each(function () {
      const k = $(this).attr('data-entity-key');
      if (!k) return;
      const expanded = _ui.expand_entities.has(k);
      $(this).find('.entity-toggle').first().toggleClass('collapsed', !expanded);
      $(this).next('.entity-body').toggleClass('hidden', !expanded);
    });
    $c.find('.mate-sub-header').each(function () {
      const k = $(this).attr('data-sub-key');
      if (!k) return;
      const expanded = _ui.expand_subs.has(k);
      $(this).find('.mate-sub-toggle').first().toggleClass('collapsed', !expanded);
      $(this).next('.mate-sub-body').toggleClass('hidden', !expanded);
    });
  }

  function editSpan(val: any, path: string) {
    return `<span class="editable-num" data-path="${path}" data-val="${val}" title="点击修改数字">${val}</span>`;
  }
  function editText(val: any, path: string) {
    return `<span class="editable-text" contenteditable="true" spellcheck="false" data-path="${path}" data-val="${(val + '').replace(/"/g, '&quot;')}" title="点击修改文字，失去焦点自动保存">${val}</span>`;
  }

  /* ==================== 实体自动计算 ==================== */
  function applyAutoLevelAndDerivedStats(stat_data: any, basePath: string) {
    const entity = _.get(stat_data, basePath);
    if (!entity) return false;

    const isPlayerMode = getEntityMode(entity) === 'player';
    const hpFactor = getHpFactor(entity);
    const rankStr = _.get(entity, '头部.阶位', '一阶');
    let changed = false;

    if (isPlayerMode) {
      let maxLv = 20,
        softCap = 25;
      if (rankStr === '二阶') {
        maxLv = 40;
        softCap = 40;
      } else if (rankStr === '三阶') {
        maxLv = 60;
        softCap = 55;
      } else if (rankStr === '四阶') {
        maxLv = 80;
        softCap = 70;
      } else if (rankStr === '五阶') {
        maxLv = 100;
        softCap = 9999;
      } else if (rankStr === '超脱者' || rankStr === '超脱') {
        maxLv = 9999;
        softCap = 9999;
      }

      _.set(entity, '头部.属性软上限', softCap);

      let exp = Number(_.get(entity, '头部.EXP_当前', 0)) || 0;
      let reqExp = Number(_.get(entity, '头部.EXP_升级所需', 50)) || 50;
      let level = Number(_.get(entity, '头部.等级', 1)) || 1;
      let freePoints = Number(_.get(entity, '属性.未分配属性点', 0)) || 0;

      while (exp >= reqExp && reqExp > 0 && level < maxLv) {
        exp -= reqExp;
        level += 1;
        reqExp = 50 * level;
        freePoints += 1;
        changed = true;
      }
      if (level >= maxLv && exp > 0) {
        exp = 0;
        changed = true;
      }

      if (changed) {
        _.set(entity, '头部.EXP_当前', exp);
        _.set(entity, '头部.EXP_升级所需', reqExp);
        _.set(entity, '头部.等级', level);
        _.set(entity, '属性.未分配属性点', freePoints);
      }

      const pexpThresholds = [0, 50, 80, 120, 170, 230, 300, 380, 470, 570, 99999];
      const job = _.get(entity, '职业');
      if (job && job.名称 && job.名称 !== '无') {
        let jobLv = Number(_.get(job, '职业等级', 1)) || 1;
        let jobPexp = Number(_.get(job, 'PEXP_当前', 0)) || 0;
        let jobReq = Number(_.get(job, 'PEXP_升级所需', 50)) || pexpThresholds[jobLv] || 50;
        let jobChanged = false;

        while (jobPexp >= jobReq && jobReq > 0 && jobLv < 10) {
          jobPexp -= jobReq;
          jobLv++;
          jobReq = pexpThresholds[jobLv] || 99999;
          jobChanged = true;
        }
        if (jobLv >= 10 && jobPexp > 0) {
          jobPexp = 0;
          jobChanged = true;
        }

        if (jobChanged) {
          _.set(entity, '职业.职业等级', jobLv);
          _.set(entity, '职业.PEXP_当前', jobPexp);
          _.set(entity, '职业.PEXP_升级所需', jobReq);
        }
      }
    }

    if (basePath === '契约者') {
      const rp = Number(_.get(entity, '头部.RP_当前', 0)) || 0;
      const currentArmy = _.get(entity, '头部.军衔', '列兵');
      const nextRp = Number(_.get(entity, '头部.RP_下一级', 15)) || 15;

      if (rp >= nextRp) {
        let newArmy = currentArmy;
        let newNextRp = nextRp;
        const ranks = ['列兵', '上士', '少尉', '少校', '上校', '准将', '中将', '元帅'];
        const rpThresholds = [0, 15, 35, 70, 120, 200, 350, 500];
        let currentIdx = ranks.indexOf(currentArmy);
        if (currentIdx === -1) currentIdx = 0;
        for (let i = currentIdx + 1; i < ranks.length; i++) {
          if (rp >= rpThresholds[i]) {
            newArmy = ranks[i];
            newNextRp = i + 1 < rpThresholds.length ? rpThresholds[i + 1] : 9999;
          } else {
            break;
          }
        }
        if (newArmy !== currentArmy) {
          _.set(entity, '头部.军衔', newArmy);
          _.set(entity, '头部.RP_下一级', newNextRp);
        }
      }

      const cr = Number(_.get(entity, '头部.CR', 3.0)) || 3.0;
      const att =
        cr >= 10 ? '炼狱' : cr >= 9 ? '期待' : cr >= 7 ? '重视' : cr >= 5 ? '关注' : cr >= 3 ? '观察' : '漠视';
      _.set(entity, '头部.回廊态度', att);
    }

    /* 装备/职业/天赋/血统属性加成扫描 */
    let eqBonus: Record<string, number> = { STR: 0, AGI: 0, CON: 0, PER: 0 },
      eqDef = 0,
      eqDodge = 0,
      eqWeight = 0;
    const slots = ['头部', '躯干', '手部', '下装', '饰品', '主武器', '副武器'];

    slots.forEach(slot => {
      const eq = _.get(entity, '装备.' + slot, {});
      const mAttr = _.get(eq, '主属性', ''),
        mVal = Number(_.get(eq, '主属性加成', 0)) || 0;
      const sAttr = _.get(eq, '副属性', ''),
        sVal = Number(_.get(eq, '副属性加成', 0)) || 0;
      const eqEnchant = Number(_.get(eq, '强化等级', 0)) || 0;
      if (eqBonus[mAttr] !== undefined) eqBonus[mAttr] += mVal;
      if (eqBonus[sAttr] !== undefined) eqBonus[sAttr] += sVal;
      if (slot !== '主武器' && slot !== '副武器' && slot !== '饰品') eqDef += eqEnchant;
      eqDef += Number(_.get(eq, '装备防御', 0)) || 0;
      eqDodge += Number(_.get(eq, '装备闪避', 0)) || 0;
      eqWeight += Number(_.get(eq, '负重', 0)) || 0;
    });

    const extraHp = Number(_.get(entity, '衍生属性.HP额外加成', 0)) || 0;
    const extraMp = Number(_.get(entity, '衍生属性.MP额外加成', 0)) || 0;
    const extraSp = Number(_.get(entity, '衍生属性.耐力额外加成', 0)) || 0;
    const extraDef = Number(_.get(entity, '衍生属性.防御额外加成', 0)) || 0;
    const extraDodge = Number(_.get(entity, '衍生属性.闪避额外加成', 0)) || 0;
    const extraMove = Number(_.get(entity, '衍生属性.移动距离额外加成', 0)) || 0;
    const extraLoad = Number(_.get(entity, '衍生属性.负重额外加成', 0)) || 0;

    const jobMAttr = _.get(entity, '职业.主属性加成.属性', ''),
      jobMVal = Number(_.get(entity, '职业.主属性加成.值', 0)) || 0;
    const jobSAttr = _.get(entity, '职业.副属性加成.属性', ''),
      jobSVal = Number(_.get(entity, '职业.副属性加成.值', 0)) || 0;
    const jobBonus: Record<string, number> = { STR: 0, AGI: 0, CON: 0, PER: 0 };
    if (jobBonus[jobMAttr] !== undefined) jobBonus[jobMAttr] += jobMVal;
    if (jobBonus[jobSAttr] !== undefined) jobBonus[jobSAttr] += jobSVal;

    const tBonusStr = String(_.get(entity, '头部.天赋.属性加成', ''));
    const tbVal: Record<string, number> = { STR: 0, AGI: 0, CON: 0, PER: 0 };
    const mAll = tBonusStr.match(/全属性\s*[+加]?\s*(\d+)/);
    if (mAll) {
      const v = parseInt(mAll[1]) || 0;
      tbVal.STR += v;
      tbVal.AGI += v;
      tbVal.CON += v;
      tbVal.PER += v;
    }
    const mStr = tBonusStr.match(/(?:力量|STR)\s*[+加]?\s*(\d+)/i);
    if (mStr) tbVal.STR += parseInt(mStr[1]) || 0;
    const mAgi = tBonusStr.match(/(?:敏捷|AGI)\s*[+加]?\s*(\d+)/i);
    if (mAgi) tbVal.AGI += parseInt(mAgi[1]) || 0;
    const mCon = tBonusStr.match(/(?:体质|体力|CON)\s*[+加]?\s*(\d+)/i);
    if (mCon) tbVal.CON += parseInt(mCon[1]) || 0;
    const mPer = tBonusStr.match(/(?:感知|PER)\s*[+加]?\s*(\d+)/i);
    if (mPer) tbVal.PER += parseInt(mPer[1]) || 0;

    const bloodBonusStr = String(_.get(entity, '头部.血统.属性加成', ''));
    const bloodVal: Record<string, number> = { STR: 0, AGI: 0, CON: 0, PER: 0 };
    const bmAll = bloodBonusStr.match(/全属性\s*[+加]?\s*(\d+)/);
    if (bmAll) {
      const v = parseInt(bmAll[1]) || 0;
      bloodVal.STR += v;
      bloodVal.AGI += v;
      bloodVal.CON += v;
      bloodVal.PER += v;
    }
    const bmStr = bloodBonusStr.match(/(?:力量|STR)\s*[+加]?\s*(\d+)/i);
    if (bmStr) bloodVal.STR += parseInt(bmStr[1]) || 0;
    const bmAgi = bloodBonusStr.match(/(?:敏捷|AGI)\s*[+加]?\s*(\d+)/i);
    if (bmAgi) bloodVal.AGI += parseInt(bmAgi[1]) || 0;
    const bmCon = bloodBonusStr.match(/(?:体质|体力|CON)\s*[+加]?\s*(\d+)/i);
    if (bmCon) bloodVal.CON += parseInt(bmCon[1]) || 0;
    const bmPer = bloodBonusStr.match(/(?:感知|PER)\s*[+加]?\s*(\d+)/i);
    if (bmPer) bloodVal.PER += parseInt(bmPer[1]) || 0;

    ['STR', 'AGI', 'CON', 'PER'].forEach(attr => {
      let base = Number(_.get(entity, '属性.基础.' + attr, 5)) || 5;
      if (isPlayerMode && base > softCapOf(rankStr)) {
        base = softCapOf(rankStr);
        _.set(entity, '属性.基础.' + attr, base);
      }
      const customBonus = Number(_.get(entity, '属性.自定义加成.' + attr, 0)) || 0;
      const finalBonus = eqBonus[attr] + jobBonus[attr] + tbVal[attr] + bloodVal[attr] + customBonus;
      _.set(entity, '属性.加成.' + attr, finalBonus);
      _.set(entity, '属性.实际.' + attr, base + finalBonus);
    });

    const aCon = Number(_.get(entity, '属性.实际.CON', 5)) || 5;
    const aPer = Number(_.get(entity, '属性.实际.PER', 5)) || 5;
    const aAgi = Number(_.get(entity, '属性.实际.AGI', 5)) || 5;
    const aStr = Number(_.get(entity, '属性.实际.STR', 5)) || 5;

    const oldHpMax = Number(_.get(entity, '衍生属性.HP_最大', 0)) || 0;
    const oldMpMax = Number(_.get(entity, '衍生属性.MP_最大', 0)) || 0;
    const oldSpMax = Number(_.get(entity, '衍生属性.耐力_最大', 0)) || 0;

    const rankMul = getRankMultiplier(rankStr);
    const conMod = (aCon - 5) * rankMul;
    const perMod = (aPer - 5) * rankMul;
    const agiMod = (aAgi - 5) * rankMul;
    const strMod = (aStr - 5) * rankMul;
    _.set(entity, '属性.属性修正值', { STR: strMod, AGI: agiMod, CON: conMod, PER: perMod });

    const hpMax = (conMod + 5) * hpFactor + extraHp;
    const mpMax = perMod * 10 + extraMp;
    const spMax = (conMod + 5) * 10 + extraSp;
    _.set(entity, '衍生属性.HP_最大', hpMax);
    _.set(entity, '衍生属性.MP_最大', mpMax);
    _.set(entity, '衍生属性.耐力_最大', spMax);

    const def = Math.floor((conMod + 5) * 0.2) + extraDef + eqDef;
    const dodge = Math.floor(10 + agiMod * 0.5 + extraDodge + eqDodge);
    const move = 5 + agiMod + extraMove;
    const maxLoad = aStr * 5 + extraLoad;

    _.set(entity, '衍生属性.防御', def);
    _.set(entity, '衍生属性.闪避值', dodge);
    _.set(entity, '衍生属性.移动距离', move);
    _.set(entity, '衍生属性.负重_上限', maxLoad);
    _.set(entity, '衍生属性.负重_当前', eqWeight);

    let hpc = Number(_.get(entity, '衍生属性.HP_当前', 0)) || 0;
    let mpc = Number(_.get(entity, '衍生属性.MP_当前', 0)) || 0;
    let spc = Number(_.get(entity, '衍生属性.耐力_当前', 0)) || 0;

    if (oldHpMax === 0 && hpMax > 0) hpc = hpMax;
    if (oldMpMax === 0 && mpMax > 0) mpc = mpMax;
    if (oldSpMax === 0 && spMax > 0) spc = spMax;

    if (hpMax > oldHpMax && oldHpMax > 0) hpc += hpMax - oldHpMax;
    if (mpMax > oldMpMax && oldMpMax > 0) mpc += mpMax - oldMpMax;
    if (spMax > oldSpMax && oldSpMax > 0) spc += spMax - oldSpMax;

    if (hpc > hpMax) hpc = hpMax;
    if (mpc > mpMax) mpc = mpMax;
    if (spc > spMax) spc = spMax;

    _.set(entity, '衍生属性.HP_当前', hpc);
    _.set(entity, '衍生属性.MP_当前', mpc);
    _.set(entity, '衍生属性.耐力_当前', spc);

    const ratio = hpc / Math.max(hpMax, 1);
    let lifeState = '健康';
    if (hpc <= 0) lifeState = '濒死';
    else if (ratio <= 0.3) lifeState = '重伤';
    else if (ratio <= 0.7) lifeState = '受伤';
    _.set(entity, '状态.生命状态', lifeState);

    return changed;
  }

  function softCapOf(rankStr: string) {
    if (rankStr === '二阶') return 40;
    if (rankStr === '三阶') return 55;
    if (rankStr === '四阶') return 70;
    if (rankStr === '五阶' || rankStr === '超脱者' || rankStr === '超脱') return 9999;
    return 25;
  }

  async function saveVariable(path: string, currentVal: number, newVal: number) {
    try {
      const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      let basePath = '契约者';
      const match = path.match(/^(契约者\.小队\.成员\.[^.]+|契约者\.其他契约者\.[^.]+|契约者\.副本角色\.[^.]+)/);
      if (match) basePath = match[1];

      const entity = _.get(data.stat_data, basePath, {});
      const isPlayerMode = getEntityMode(entity) === 'player';

      if (path.includes('属性.基础') && isPlayerMode) {
        const delta = newVal - currentVal;
        const free = Number(_.get(data.stat_data, basePath + '.属性.未分配属性点', 0)) || 0;
        _.set(data.stat_data, basePath + '.属性.未分配属性点', free - delta);
      }
      if (path.endsWith('.头部.等级') && isPlayerMode) {
        const delta = newVal - currentVal;
        if (delta > 0) {
          const free = Number(_.get(data.stat_data, basePath + '.属性.未分配属性点', 0)) || 0;
          _.set(data.stat_data, basePath + '.属性.未分配属性点', free + delta);
        }
      }
      _.set(data.stat_data, path, newVal);

      applyAutoLevelAndDerivedStats(data.stat_data, basePath);

      const shortPath = path.split('.').slice(-2).join('.');
      const displayName = basePath === '契约者' ? '你' : basePath.split('.').pop()!;
      appendSystemLog(data, `${displayName} 修改了数值 [${shortPath}]，从 ${currentVal} 变更为 ${newVal}`);

      await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
      populateCharacterData();
    } catch (e) {
      console.error('变量更新失败', e);
      populateCharacterData();
    }
  }

  async function saveVariableStr(path: string, currentVal: string, newVal: string) {
    try {
      const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      let basePath = '契约者';
      const match = path.match(/^(契约者\.小队\.成员\.[^.]+|契约者\.其他契约者\.[^.]+|契约者\.副本角色\.[^.]+)/);
      if (match) basePath = match[1];

      const entity = _.get(data.stat_data, basePath, {});
      const isPlayerMode = getEntityMode(entity) === 'player';

      if (path.endsWith('.头部.阶位') && isPlayerMode) {
        let free = Number(_.get(data.stat_data, basePath + '.属性.未分配属性点', 0)) || 0;
        if (currentVal === '一阶' && newVal === '二阶') free += 3;
        else if (currentVal === '二阶' && newVal === '三阶') free += 5;
        else if (currentVal === '三阶' && newVal === '四阶') free += 5;
        else if (currentVal === '四阶' && newVal === '五阶') free += 8;
        _.set(data.stat_data, basePath + '.属性.未分配属性点', free);
      }
      _.set(data.stat_data, path, newVal);

      applyAutoLevelAndDerivedStats(data.stat_data, basePath);

      const shortPath = path.split('.').slice(-2).join('.');
      const displayName = basePath === '契约者' ? '你' : basePath.split('.').pop()!;
      appendSystemLog(data, `${displayName} 修改了文本字段 [${shortPath}]，内容从 "${currentVal}" 变更为 "${newVal}"`);

      await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
      populateCharacterData();
    } catch (e) {
      console.error('文本更新失败', e);
    }
  }

  function bindEditable() {
    $c.off('click', '.editable-num').on('click', '.editable-num', function (this: HTMLElement, e: JQuery.Event) {
      if ($(this).find('input').length > 0) return;
      e.stopPropagation();
      const path = $(this).attr('data-path')!,
        currentVal = parseFloat($(this).attr('data-val')!),
        w = Math.max($(this).width()!, 20) + 15;
      const input = $(`<input type="number" step="any" class="inline-edit-input" style="width:${w}px;" />`);
      input.val(currentVal as any);
      $(this).html(input);
      input.focus().select();
      input.on('blur keydown', function (ev: any) {
        if (ev.type === 'keydown' && ev.key !== 'Enter') return;
        let newVal = parseFloat($(this).val() as string);
        if (isNaN(newVal)) newVal = currentVal;
        if (newVal !== currentVal) saveVariable(path, currentVal, newVal);
        else populateCharacterData();
      });
    });
    $c.off('blur', '.editable-text').on('blur', '.editable-text', function (this: HTMLElement) {
      const path = $(this).attr('data-path')!,
        currentVal = $(this).attr('data-val')!,
        newVal = $(this).text();
      if (newVal !== currentVal) {
        $(this).attr('data-val', newVal);
        saveVariableStr(path, currentVal, newVal);
      }
    });
  }

  function formatAttrDetail(base: number, bonus: number, customBonus: number, basePath: string, customPath: string) {
    return (
      '基础 ' +
      editSpan(base, basePath) +
      ' | 手动加成 ' +
      editSpan(customBonus, customPath) +
      ' | 总加成 ' +
      (bonus >= 0 ? '+' : '') +
      bonus
    );
  }

  function modSpan(modVal: number) {
    const sign = modVal >= 0 ? '+' : '';
    return `<span style="color:#e0c080; font-size:12px; margin-left:6px;">修正 ${sign}${modVal}</span>`;
  }

  function renderSkillsHtml(skills: any, pathPrefix: string): string {
    const keys = Object.keys(skills || {});
    if (keys.length === 0) return '<span class="empty-hint">无或未知</span>';
    let h = '';
    keys.forEach(function (k) {
      const s = skills[k] || {},
        baseP = pathPrefix ? `${pathPrefix}.${k}` : '';
      let name = _.get(s, '名称', '') || k;
      name = baseP ? editText(name, baseP + '.名称') : name;
      let cat = _.get(s, '分类', '');
      cat = baseP ? editText(cat, baseP + '.分类') : cat;
      let type = _.get(s, '类型', '');
      type = baseP ? editText(type, baseP + '.类型') : type;
      let rank = _.get(s, '阶位', '');
      rank = baseP ? editText(rank, baseP + '.阶位') : rank;
      let lv = _.get(s, '等级', '');
      lv = baseP && lv !== '' ? editSpan(lv, baseP + '.等级') : lv;

      h +=
        '<div class="skill-line"><span style="color:#e0c080; font-weight:bold; font-size:15px;">' + name + '</span> ';
      if (lv !== '' && lv !== '无') h += '<span style="color:#a09080; font-size:12px;">Lv.' + lv + '</span> ';
      if (cat && cat !== '无') {
        let catClass = 'tag-gray';
        if (cat.includes('银色') || cat.includes('传说') || cat.includes('唯一')) catClass = 'tag-purple';
        else if (cat.includes('高级') || cat.includes('金色')) catClass = 'tag-orange';
        else if (cat.includes('蓝色')) catClass = 'tag-blue';
        h += '<span class="tag ' + catClass + '">' + cat + '</span> ';
      }
      if (type && type !== '无') h += '<span class="tag tag-blue">' + type + '</span> ';
      if (rank && rank !== '无') h += '<span class="tag tag-green">' + rank + '</span> ';

      const dets = [];
      const aAttr = _.get(s, '关联属性', '');
      if (aAttr && aAttr !== '无') dets.push('判定:' + (baseP ? editText(aAttr, baseP + '.关联属性') : aAttr));
      const aAct = _.get(s, '行动类型', '');
      if (aAct && aAct !== '无') dets.push('行动:' + (baseP ? editText(aAct, baseP + '.行动类型') : aAct));
      const aCost = _.get(s, '消耗', '');
      if (aCost && aCost !== '无') dets.push('消耗:' + (baseP ? editText(aCost, baseP + '.消耗') : aCost));
      const aCd = _.get(s, '冷却', '');
      if (aCd && aCd !== '无') dets.push('冷却:' + (baseP ? editText(aCd, baseP + '.冷却') : aCd));
      const aRng = _.get(s, '射程', '');
      if (aRng && aRng !== '无' && aRng !== '自身')
        dets.push('射程:' + (baseP ? editText(aRng, baseP + '.射程') : aRng));
      const aTgt = _.get(s, '目标', '');
      if (aTgt && aTgt !== '无' && aTgt !== '自身')
        dets.push('目标:' + (baseP ? editText(aTgt, baseP + '.目标') : aTgt));
      const aReq = _.get(s, '属性要求', '');
      if (aReq && aReq !== '无') dets.push('门槛:' + (baseP ? editText(aReq, baseP + '.属性要求') : aReq));
      if (dets.length > 0)
        h += '<br><span style="font-size:13px; color:#b8a070; line-height:1.8;">' + dets.join(' | ') + '</span>';

      const eff = _.get(s, '效果', {});
      if (typeof eff === 'string') {
        if (eff && eff !== '无')
          h +=
            '<div style="margin-top:2px;font-size:14px; color:#a09080; line-height:1.5;">' +
            (baseP ? editText(eff, baseP + '.效果') : eff) +
            '</div>';
      } else {
        const effKeys = Object.keys(eff || {});
        if (effKeys.length > 0) {
          h += '<div style="margin-top:2px;">';
          effKeys.forEach(function (ek) {
            h +=
              '<div style="font-size:14px; color:#ddd5c8; line-height:1.5;"><span style="color:#b8a070;font-weight:bold;">' +
              (baseP ? editText(ek, 'ignore') : ek) +
              '</span>: <span style="color:#a09080;">' +
              (baseP ? editText(eff[ek], baseP + '.效果.' + ek) : eff[ek]) +
              '</span></div>';
          });
          h += '</div>';
        }
      }
      h += '</div>';
    });
    return h;
  }

  function renderEquipHtml(equipData: any, pathPrefix: string, targetPath: string, canUnequip: boolean) {
    let slots = ['头部', '躯干', '手部', '下装', '饰品', '主武器', '副武器'],
      h = '';

    slots.forEach(function (slot) {
      const eq = _.get(equipData, slot, {}),
        bp = pathPrefix ? `${pathPrefix}.${slot}` : '';
      const name = _.get(eq, '名称', '无');
      if (name === '无' || name === '') {
        h +=
          '<div class="equip-row"><span class="equip-slot-label">' +
          slot +
          '</span><span style="color:#6a5a48; font-size:13px;">---</span></div>';
        return;
      }

      const quality = _.get(eq, '品质', ''),
        rank = _.get(eq, '阶位', ''),
        enhance = _.get(eq, '强化等级', 0);
      const reqAttr = _.get(eq, '穿戴门槛', '无');
      const eff = _.get(eq, '效果', {}),
        desc = _.get(eq, '描述', ''),
        type = _.get(eq, '类型', ''),
        dice = _.get(eq, '伤害骰', '无'),
        mult = _.get(eq, '倍率', 0);
      const mainAttr = _.get(eq, '主属性', '无'),
        mainBonus = _.get(eq, '主属性加成', 0),
        subAttr = _.get(eq, '副属性', '无'),
        subBonus = _.get(eq, '副属性加成', 0),
        def = _.get(eq, '装备防御', 0),
        dodge = _.get(eq, '装备闪避', 0),
        weight = _.get(eq, '负重', 0);

      let tagClass = 'tag-gray';
      if (quality === '金色') tagClass = 'tag-orange';
      else if (quality === '蓝色') tagClass = 'tag-blue';
      else if (quality === '绿色') tagClass = 'tag-green';
      else if (quality === '银色' || quality === '紫色') tagClass = 'tag-purple';

      h += '<div class="equip-row">';
      h += '<span class="equip-slot-label">' + slot + '</span>';
      h +=
        '<div class="equip-name-line"><span class="equip-item-name">' +
        (bp ? editText(name, bp + '.名称') : name) +
        '</span>';
      if (canUnequip) {
        h += '<button class="btn-unequip" data-slot="' + slot + '" data-targetpath="' + targetPath + '">脱下</button>';
      }
      h += '</div>';

      h += '<div class="equip-stats-block">';
      if (quality !== '无' && quality !== '')
        h +=
          '<span class="tag ' +
          tagClass +
          '">' +
          (bp ? editText(quality, bp + '.品质') : quality) +
          ' ' +
          (rank ? (bp ? editText(rank, bp + '.阶位') : rank) : '') +
          (enhance ? ' +' + (bp ? editSpan(enhance, bp + '.强化等级') : enhance) : '') +
          '</span> ';
      if (type !== '无' && type !== '')
        h += '<span class="tag tag-blue">' + (bp ? editText(type, bp + '.类型') : type) + '</span>';
      h += '</div>';

      const stats = [];
      if (dice !== '无' && dice !== '')
        stats.push(
          '伤害:' +
            (bp ? editText(dice, bp + '.伤害骰') : dice) +
            (mult ? '(x' + (bp ? editSpan(mult, bp + '.倍率') : mult) + ')' : ''),
        );
      if (def !== 0 || dodge !== 0)
        stats.push(
          '防:' +
            (bp ? editSpan(def, bp + '.装备防御') : def) +
            ' 闪:' +
            (bp ? editSpan(dodge, bp + '.装备闪避') : dodge),
        );
      const attrArr = [];
      if (mainAttr !== '无' && mainAttr !== '')
        attrArr.push(
          (bp ? editText(mainAttr, bp + '.主属性') : mainAttr) +
            '+' +
            (bp ? editSpan(mainBonus, bp + '.主属性加成') : mainBonus),
        );
      if (subAttr !== '无' && subAttr !== '')
        attrArr.push(
          (bp ? editText(subAttr, bp + '.副属性') : subAttr) +
            '+' +
            (bp ? editSpan(subBonus, bp + '.副属性加成') : subBonus),
        );
      if (attrArr.length > 0) stats.push(attrArr.join(' '));
      if (weight > 0) stats.push((bp ? editSpan(weight, bp + '.负重') : weight) + 'kg');
      if (stats.length > 0)
        h += '<div class="equip-stats-block"><span style="color:#a09080;">' + stats.join(' | ') + '</span></div>';

      if (reqAttr && reqAttr !== '无')
        h += '<div class="equip-req-block">门槛: ' + (bp ? editText(reqAttr, bp + '.穿戴门槛') : reqAttr) + '</div>';

      if (typeof eff === 'string') {
        if (eff && eff !== '无')
          h += '<div class="equip-eff-block">' + (bp ? editText(eff, bp + '.效果') : eff) + '</div>';
      } else {
        const effKeys = Object.keys(eff || {});
        if (effKeys.length > 0) {
          h += '<div class="equip-eff-block">';
          effKeys.forEach(function (ek) {
            h +=
              '<div><span class="equip-eff-name">' +
              (bp ? editText(ek, 'ignore') : ek) +
              '</span>: ' +
              (bp ? editText(eff[ek], bp + '.效果.' + ek) : eff[ek]) +
              '</div>';
          });
          h += '</div>';
        }
      }
      if (desc !== '无' && desc !== '')
        h += '<div class="equip-desc-block">' + (bp ? editText(desc, bp + '.描述') : desc) + '</div>';

      h += '</div>';
    });
    return h;
  }

  function renderBagHtml(bagData: any, bagPathPrefix: string, canEdit: boolean) {
    const keys = Object.keys(bagData || {});
    if (keys.length === 0) return '<span class="empty-hint">背包为空</span>';
    let html = '';

    keys.forEach(function (k) {
      const item = bagData[k] || {};
      const count = _.get(item, '数量', 1);
      const desc = _.get(item, '描述', '');
      const quality = _.get(item, '品质', '');
      const rank = _.get(item, '阶位', '');
      const type = _.get(item, '类型', '');
      const enhance = _.get(item, '强化等级', 0);
      const reqAttr = _.get(item, '穿戴门槛', '无');
      const dice = _.get(item, '伤害骰', '');
      const mult = _.get(item, '倍率', 0);
      const def = _.get(item, '装备防御', 0);
      const dodge = _.get(item, '装备闪避', 0);
      const mainAttr = _.get(item, '主属性', '');
      const mainBonus = _.get(item, '主属性加成', 0);
      const subAttr = _.get(item, '副属性', '');
      const subBonus = _.get(item, '副属性加成', 0);
      const weight = _.get(item, '负重', 0);
      const eff = _.get(item, '效果', {});
      const bp = bagPathPrefix + '.' + k;
      const safeK = escapeAttr(k);

      let tagClass = 'tag-gray';
      if (quality === '金色') tagClass = 'tag-orange';
      else if (quality === '蓝色') tagClass = 'tag-blue';
      else if (quality === '绿色') tagClass = 'tag-green';
      else if (quality === '银色' || quality === '紫色') tagClass = 'tag-purple';

      html += '<div class="bag-simple-item">';
      html += '<div class="bag-item-head">';
      html += '<span class="bag-item-name">' + k + '</span>';
      if (quality && quality !== '无') {
        html +=
          '<span class="tag ' +
          tagClass +
          '">' +
          editText(quality, bp + '.品质') +
          (rank && rank !== '无' ? ' ' + editText(rank, bp + '.阶位') : '') +
          (enhance ? ' +' + editSpan(enhance, bp + '.强化等级') : '') +
          '</span>';
      }
      if (type && type !== '无') {
        html += '<span class="tag tag-blue">' + editText(type, bp + '.类型') + '</span>';
      }
      html += '<span style="color:#e0c080;">×' + editSpan(count, bp + '.数量') + '</span></div>';

      const metaLines = [];
      if (dice && dice !== '无')
        metaLines.push(
          '伤害:' + editText(dice, bp + '.伤害骰') + (mult ? '(x' + editSpan(mult, bp + '.倍率') + ')' : ''),
        );
      if (def !== 0 || dodge !== 0)
        metaLines.push('防:' + editSpan(def, bp + '.装备防御') + ' 闪:' + editSpan(dodge, bp + '.装备闪避'));
      const attrArr = [];
      if (mainAttr && mainAttr !== '无')
        attrArr.push(editText(mainAttr, bp + '.主属性') + '+' + editSpan(mainBonus, bp + '.主属性加成'));
      if (subAttr && subAttr !== '无')
        attrArr.push(editText(subAttr, bp + '.副属性') + '+' + editSpan(subBonus, bp + '.副属性加成'));
      if (attrArr.length > 0) metaLines.push(attrArr.join(' '));
      if (weight > 0) metaLines.push(editSpan(weight, bp + '.负重') + 'kg');
      if (reqAttr && reqAttr !== '无') metaLines.push('门槛:' + editText(reqAttr, bp + '.穿戴门槛'));
      if (metaLines.length > 0) html += '<div class="bag-item-meta">' + metaLines.join(' | ') + '</div>';

      if (typeof eff === 'string') {
        if (eff && eff !== '无') html += '<div class="bag-item-desc">' + editText(eff, bp + '.效果') + '</div>';
      } else {
        const effKeys = Object.keys(eff || {});
        if (effKeys.length > 0) {
          const effHtml: string[] = [];
          effKeys.forEach(function (ek) {
            effHtml.push(
              '<span style="color:#b8a070;font-weight:bold;">' +
                editText(ek, 'ignore') +
                '</span>: ' +
                editText(eff[ek], bp + '.效果.' + ek),
            );
          });
          html += '<div class="bag-item-desc">' + effHtml.join('; ') + '</div>';
        }
      }

      if (desc && desc !== '无') html += '<div class="bag-item-desc">' + editText(desc, bp + '.描述') + '</div>';

      const isEquippable = isEquippableItem(item);
      if (canEdit) {
        html += '<div class="bag-item-ctrls">';
        if (isEquippable) {
          html += '<select class="equip-target-select">' + targetOptionsHtml + '</select>';
          html +=
            '<select class="equip-slot-select"><option value="头部">头部</option><option value="躯干">躯干</option><option value="手部">手部</option><option value="下装">下装</option><option value="饰品">饰品</option><option value="主武器" selected>主武器</option><option value="副武器">副武器</option></select>';
          html += '<button class="btn-equip" data-itemname="' + safeK + '">装备</button>';
        }
        html += '<button class="btn-delete-bag" data-itemname="' + safeK + '">删除</button>';
        html += '</div>';
      }

      html += '</div>';
    });
    return html;
  }

  function getTypeTagClass(t: string) {
    if (!t) return 'tag-gray';
    if (t.indexOf('隐藏BOSS') >= 0 || t.indexOf('隐藏boss') >= 0) return 'tag-purple';
    if (t.indexOf('BOSS') >= 0 || t.indexOf('boss') >= 0) return 'tag-red';
    if (t.indexOf('精英') >= 0) return 'tag-blue';
    if (t.indexOf('杂兵') >= 0) return 'tag-gray';
    if (t === '小队成员') return 'tag-blue';
    if (t === '其他契约者') return 'tag-gold';
    return 'tag-gray';
  }

  function getFavColor(fav: number) {
    if (fav >= 60) return '#e0c080';
    if (fav >= 20) return '#6a9070';
    if (fav > -20) return '#a09080';
    if (fav > -60) return '#d08a4a';
    return '#c8483c';
  }

  /* ==================== 实体卡片渲染 ==================== */
  function renderEntityCard(name: string, m: any, container: string) {
    try {
      const targetPath = '契约者.' + container + '.' + name;
      const entityKey = container + '.' + name;
      const safeEntityKey = escapeAttr(entityKey);
      // eslint-disable-next-line better-tailwindcss/no-unknown-classes
      const style = container === '小队.成员' ? 'squad' : container === '副本角色' ? 'dungeon' : 'contractor';
      const isPlayerMode = getEntityMode(m) === 'player';
      const expanded = _ui.expand_entities.has(entityKey);

      const head = _.get(m, '头部', {}),
        lv = _.get(head, '等级', 1),
        rank = _.get(head, '阶位', ''),
        army = _.get(head, '军衔', '');
      const appearance = _.get(m, '外貌', '无');
      const typeTag = _.get(m, '类型', '');
      const build = _.get(m, '构筑', '');
      const fav = _.get(m, '好感度', 0);
      const expCur = _.get(head, 'EXP_当前', 0),
        expMax = _.get(head, 'EXP_升级所需', 50),
        talent = _.get(head, '天赋', {});
      const blood = _.get(head, '血统', {});
      const titleObj = _.get(head, '称号', {});

      const strActual = _.get(m, '属性.实际.STR', 5),
        strBase = _.get(m, '属性.基础.STR', 5),
        strBonus = _.get(m, '属性.加成.STR', 0),
        strCustom = _.get(m, '属性.自定义加成.STR', 0);
      const agiActual = _.get(m, '属性.实际.AGI', 5),
        agiBase = _.get(m, '属性.基础.AGI', 5),
        agiBonus = _.get(m, '属性.加成.AGI', 0),
        agiCustom = _.get(m, '属性.自定义加成.AGI', 0);
      const conActual = _.get(m, '属性.实际.CON', 5),
        conBase = _.get(m, '属性.基础.CON', 5),
        conBonus = _.get(m, '属性.加成.CON', 0),
        conCustom = _.get(m, '属性.自定义加成.CON', 0);
      const perActual = _.get(m, '属性.实际.PER', 5),
        perBase = _.get(m, '属性.基础.PER', 5),
        perBonus = _.get(m, '属性.加成.PER', 0),
        perCustom = _.get(m, '属性.自定义加成.PER', 0);
      const freePts = _.get(m, '属性.未分配属性点', 0);

      const rankMul = getRankMultiplier(rank);
      const strMod = (strActual - 5) * rankMul;
      const agiMod = (agiActual - 5) * rankMul;
      const conMod = (conActual - 5) * rankMul;
      const perMod = (perActual - 5) * rankMul;

      const der = _.get(m, '衍生属性', {}),
        hpMax = _.get(der, 'HP_最大', 0),
        mpMax = _.get(der, 'MP_最大', 0),
        spMax = _.get(der, '耐力_最大', 0),
        hpCur = _.get(der, 'HP_当前', 0),
        mpCur = _.get(der, 'MP_当前', 0),
        spCur = _.get(der, '耐力_当前', 0),
        defVal = _.get(der, '防御', 0),
        dodgeVal = _.get(der, '闪避值', 0),
        moveVal = _.get(der, '移动距离', 0),
        loadCur = _.get(der, '负重_当前', 0),
        loadMax = _.get(der, '负重_上限', 0);

      const job = _.get(m, '职业', {}),
        jobName = _.get(job, '名称', '');
      const state = _.get(m, '状态', {}),
        lifeState = _.get(state, '生命状态', '健康'),
        stateColors: Record<string, string> = {
          健康: 'tag-green',
          受伤: 'tag-orange',
          重伤: 'tag-red',
          濒死: 'tag-red',
        };
      const hpPct = Math.min((hpCur / Math.max(hpMax, 1)) * 100, 100),
        mpPct = Math.min((mpCur / Math.max(mpMax, 1)) * 100, 100),
        spPct = Math.min((spCur / Math.max(spMax, 1)) * 100, 100),
        expPct = Math.min((expCur / Math.max(expMax, 1)) * 100, 100);

      const subTitleColor = style === 'dungeon' ? '#c8483c' : style === 'contractor' ? '#c9a24a' : '#e0c080';

      /* ---------- 头部摘要行 ---------- */
      let h = '<div class="entity-card entity-style-' + style + '">';
      h += '<div class="entity-header entity-style-' + style + '" data-entity-key="' + safeEntityKey + '">';
      h += '<div class="entity-summary">';
      if (typeTag) h += '<span class="tag ' + getTypeTagClass(typeTag) + '">' + typeTag + '</span>';
      h += '<span class="entity-name">' + name + '</span>';
      h += '<span style="color:#a09080;">Lv.' + lv + '</span>';
      if (jobName && jobName !== '无') h += '<span class="entity-job">' + jobName + '</span>';
      h += '<span class="tag ' + (stateColors[lifeState] || 'tag-gray') + '">' + lifeState + '</span>';
      h += '<span class="entity-fav" style="color:' + getFavColor(fav) + ';">❤' + fav + '</span>';
      h += '<span class="entity-hp-compact">' + hpCur + '/' + hpMax + '</span>';
      h += '</div>';
      h += '<span class="entity-toggle' + (expanded ? '' : ' collapsed') + '">▼</span>';
      h += '</div>';
      h += '<div class="entity-body' + (expanded ? '' : ' hidden') + '">';

      /* ---------- 卡体 ---------- */
      if (build && build !== '无' && build !== '') {
        h += '<div class="entity-build-line"><b>构筑</b>：' + build + '</div>';
      }

      h +=
        '<div class="row"><span class="label">等级</span><span class="value">Lv.' +
        editSpan(lv, targetPath + '.头部.等级') +
        '</span></div>';

      h += '<div style="margin-bottom: 6px; border-bottom: 1px solid #241812; padding-bottom: 4px;">';
      h += '<div class="label" style="margin-bottom: 2px;">外貌特征</div>';
      h +=
        '<div class="value-dim" style="font-size: 13px; line-height: 1.5; text-align: left;">' + appearance + '</div>';
      h += '</div>';

      if (isPlayerMode) {
        h +=
          '<div class="row"><span class="label">EXP</span><span class="value-dim">' +
          editSpan(expCur, targetPath + '.头部.EXP_当前') +
          ' / ' +
          editSpan(expMax, targetPath + '.头部.EXP_升级所需') +
          '</span></div><div class="bar-wrap"><div class="bar-fill bar-exp" style="width:' +
          expPct +
          '%"></div></div>';
      }
      if (rank) h += '<div class="row"><span class="label">阶位</span><span class="value">' + rank + '</span></div>';
      if (army && isPlayerMode)
        h += '<div class="row"><span class="label">军衔</span><span class="value">' + army + '</span></div>';

      /* 天赋 */
      const tName = _.get(talent, '名称', '');
      if (tName && tName !== '无') {
        h +=
          '<div class="row"><span class="label">天赋</span><span class="value">' +
          editText(tName, targetPath + '.头部.天赋.名称') +
          ' <span class="tag tag-purple">' +
          editText(_.get(talent, '品质', ''), targetPath + '.头部.天赋.品质') +
          '</span></span></div>';
        const tBonus = _.get(talent, '属性加成', '');
        if (tBonus && tBonus !== '无')
          h +=
            '<div class="row"><span class="label">属性加成</span><span class="value-dim">' +
            editText(tBonus, targetPath + '.头部.天赋.属性加成') +
            '</span></div>';
        const tEffs = _.get(talent, '效果', {});
        if (typeof tEffs === 'string' && tEffs && tEffs !== '无') {
          h +=
            '<div style="font-size:13px;padding:2px 0;color:#a09080;line-height:1.5;">' +
            editText(tEffs, targetPath + '.头部.天赋.效果') +
            '</div>';
        } else {
          const teKeys = Object.keys(tEffs || {});
          if (teKeys.length > 0) {
            h += '<div style="font-size:13px;padding:2px 0;">';
            teKeys.forEach(function (k) {
              h +=
                '<div style="margin-bottom:2px;"><span style="color:#b8a070;font-weight:bold;">' +
                k +
                '</span>: <span style="color:#a09080;">' +
                editText(tEffs[k], targetPath + '.头部.天赋.效果.' + k) +
                '</span></div>';
            });
            h += '</div>';
          }
        }
      }

      /* 血统 */
      const bName = _.get(blood, '名称', '');
      if (bName && bName !== '无') {
        const bQuality = _.get(blood, '品质', '白色');
        let bTagClass = 'tag-gray';
        if (bQuality === '金色') bTagClass = 'tag-orange';
        else if (bQuality === '蓝色') bTagClass = 'tag-blue';
        else if (bQuality === '绿色') bTagClass = 'tag-green';
        else if (bQuality === '银色' || bQuality === '紫色') bTagClass = 'tag-purple';
        h +=
          '<div class="row"><span class="label">血统</span><span class="value">' +
          editText(bName, targetPath + '.头部.血统.名称') +
          ' <span class="tag ' +
          bTagClass +
          '">' +
          editText(bQuality, targetPath + '.头部.血统.品质') +
          '</span></span></div>';
        const bBonus = _.get(blood, '属性加成', '');
        if (bBonus && bBonus !== '无')
          h +=
            '<div class="row"><span class="label">属性加成</span><span class="value-dim">' +
            editText(bBonus, targetPath + '.头部.血统.属性加成') +
            '</span></div>';
        const bEffs = _.get(blood, '效果', {});
        if (typeof bEffs === 'string' && bEffs && bEffs !== '无') {
          h +=
            '<div style="font-size:13px;padding:2px 0;color:#a09080;line-height:1.5;">' +
            editText(bEffs, targetPath + '.头部.血统.效果') +
            '</div>';
        } else {
          const beKeys = Object.keys(bEffs || {});
          if (beKeys.length > 0) {
            h += '<div style="font-size:13px;padding:2px 0;">';
            beKeys.forEach(function (k) {
              h +=
                '<div style="margin-bottom:2px;"><span style="color:#b8a070;font-weight:bold;">' +
                k +
                '</span>: <span style="color:#a09080;">' +
                editText(bEffs[k], targetPath + '.头部.血统.效果.' + k) +
                '</span></div>';
            });
            h += '</div>';
          }
        }
      }

      /* 称号 */
      const curTitleObj = _.get(titleObj, '当前称号', {});
      const tNameObj = _.get(curTitleObj, '名称', '');
      if (tNameObj && tNameObj !== '无') {
        h +=
          '<div class="row"><span class="label">称号</span><span class="value">' +
          editText(tNameObj, targetPath + '.头部.称号.当前称号.名称') +
          '</span></div>';
        const tEffsObj = _.get(curTitleObj, '效果', {});
        if (typeof tEffsObj === 'string' && tEffsObj && tEffsObj !== '无') {
          h +=
            '<div style="font-size:13px;padding:2px 0;color:#a09080;line-height:1.5;">' +
            editText(tEffsObj, targetPath + '.头部.称号.当前称号.效果') +
            '</div>';
        } else {
          const ctKeysObj = Object.keys(tEffsObj || {});
          if (ctKeysObj.length > 0) {
            h += '<div style="font-size:13px;padding:2px 0;">';
            ctKeysObj.forEach(function (k) {
              h +=
                '<div style="margin-bottom:2px;"><span style="color:#b8a070;font-weight:bold;">' +
                k +
                '</span>: <span style="color:#a09080;">' +
                editText(tEffsObj[k], targetPath + '.头部.称号.当前称号.效果.' + k) +
                '</span></div>';
            });
            h += '</div>';
          }
        }
      }

      /* ---------- 属性子区块 ---------- */
      const subKeyBase = entityKey;
      const subAttrExpanded = _ui.expand_subs.has(subKeyBase + '.属性');
      const subJobExpanded = _ui.expand_subs.has(subKeyBase + '.职业');
      const subSkillExpanded = _ui.expand_subs.has(subKeyBase + '.通用技能');
      const subEquipExpanded = _ui.expand_subs.has(subKeyBase + '.装备');
      const subBagExpanded = _ui.expand_subs.has(subKeyBase + '.背包');
      const safeSubAttr = escapeAttr(subKeyBase + '.属性');
      const safeSubJob = escapeAttr(subKeyBase + '.职业');
      const safeSubSkill = escapeAttr(subKeyBase + '.通用技能');
      const safeSubEquip = escapeAttr(subKeyBase + '.装备');
      const safeSubBag = escapeAttr(subKeyBase + '.背包');

      h += '<div class="mate-sub">';
      h +=
        '<div class="mate-sub-header" data-sub-key="' +
        safeSubAttr +
        '"><span class="mate-sub-title" style="color:' +
        subTitleColor +
        ';">属性</span><span class="mate-sub-toggle' +
        (subAttrExpanded ? '' : ' collapsed') +
        '">▼</span></div>';
      h += '<div class="mate-sub-body' + (subAttrExpanded ? '' : ' hidden') + '">';

      h +=
        '<div class="row"><span class="label">STR 力量</span><span class="value">' +
        strActual +
        modSpan(strMod) +
        '</span></div>';
      h +=
        '<div class="attr-detail">' +
        formatAttrDetail(
          strBase,
          strBonus,
          strCustom,
          targetPath + '.属性.基础.STR',
          targetPath + '.属性.自定义加成.STR',
        ) +
        '</div>';
      h +=
        '<div class="row"><span class="label">AGI 敏捷</span><span class="value">' +
        agiActual +
        modSpan(agiMod) +
        '</span></div>';
      h +=
        '<div class="attr-detail">' +
        formatAttrDetail(
          agiBase,
          agiBonus,
          agiCustom,
          targetPath + '.属性.基础.AGI',
          targetPath + '.属性.自定义加成.AGI',
        ) +
        '</div>';
      h +=
        '<div class="row"><span class="label">CON 体质</span><span class="value">' +
        conActual +
        modSpan(conMod) +
        '</span></div>';
      h +=
        '<div class="attr-detail">' +
        formatAttrDetail(
          conBase,
          conBonus,
          conCustom,
          targetPath + '.属性.基础.CON',
          targetPath + '.属性.自定义加成.CON',
        ) +
        '</div>';
      h +=
        '<div class="row"><span class="label">PER 感知</span><span class="value">' +
        perActual +
        modSpan(perMod) +
        '</span></div>';
      h +=
        '<div class="attr-detail">' +
        formatAttrDetail(
          perBase,
          perBonus,
          perCustom,
          targetPath + '.属性.基础.PER',
          targetPath + '.属性.自定义加成.PER',
        ) +
        '</div>';
      if (isPlayerMode)
        h +=
          '<div class="row"><span class="label">未分配点数</span><span class="value-warn">' +
          editSpan(freePts, targetPath + '.属性.未分配属性点') +
          '</span></div>';

      h += '<div style="margin-top:6px;">';
      h +=
        '<div class="row"><span class="label">HP</span><span class="value">' +
        editSpan(hpCur, targetPath + '.衍生属性.HP_当前') +
        ' / ' +
        hpMax +
        '</span></div>';
      h += '<div class="bar-wrap"><div class="bar-fill bar-hp" style="width:' + hpPct + '%"></div></div>';
      h +=
        '<div class="row"><span class="label">MP</span><span class="value">' +
        editSpan(mpCur, targetPath + '.衍生属性.MP_当前') +
        ' / ' +
        mpMax +
        '</span></div>';
      h += '<div class="bar-wrap"><div class="bar-fill bar-mp" style="width:' + mpPct + '%"></div></div>';
      h +=
        '<div class="row"><span class="label">耐力</span><span class="value">' +
        editSpan(spCur, targetPath + '.衍生属性.耐力_当前') +
        ' / ' +
        spMax +
        '</span></div>';
      h += '<div class="bar-wrap"><div class="bar-fill bar-sp" style="width:' + spPct + '%"></div></div>';
      h += '<div class="grid-2" style="margin-top:4px;">';
      h += '<div class="row"><span class="label">防御</span><span class="value-dim">' + defVal + '</span></div>';
      h += '<div class="row"><span class="label">闪避</span><span class="value-dim">' + dodgeVal + '</span></div>';
      h += '<div class="row"><span class="label">移距</span><span class="value-dim">' + moveVal + 'm</span></div>';
      if (isPlayerMode)
        h +=
          '<div class="row"><span class="label">负重</span><span class="value-dim">' +
          loadCur +
          ' / ' +
          loadMax +
          'kg</span></div>';
      h += '</div>';
      h += '</div>';

      h += '</div>';
      h += '</div>';

      /* ---------- 职业子区块 ---------- */
      if (jobName && jobName !== '无') {
        h += '<div class="mate-sub">';
        h +=
          '<div class="mate-sub-header" data-sub-key="' +
          safeSubJob +
          '"><span class="mate-sub-title" style="color:' +
          subTitleColor +
          ';">职业</span><span class="mate-sub-toggle' +
          (subJobExpanded ? '' : ' collapsed') +
          '">▼</span></div>';
        h += '<div class="mate-sub-body' + (subJobExpanded ? '' : ' hidden') + '">';

        const jLv = _.get(job, '职业等级', 0);
        const jPexpCur = _.get(job, 'PEXP_当前', 0);
        const jPexpMax = _.get(job, 'PEXP_升级所需', 0);

        h +=
          '<div class="row"><span class="label">名称</span><span class="value">' +
          editText(jobName, targetPath + '.职业.名称') +
          '</span></div>';
        h +=
          '<div class="row"><span class="label">稀有度/阶段</span><span class="value-dim">' +
          editText(_.get(job, '稀有度', ''), targetPath + '.职业.稀有度') +
          ' ' +
          editText(_.get(job, '转职阶段', ''), targetPath + '.职业.转职阶段') +
          '</span></div>';
        h +=
          '<div class="row"><span class="label">职业等级</span><span class="value">Lv.' +
          editSpan(jLv, targetPath + '.职业.职业等级') +
          '</span></div>';
        h +=
          '<div class="row"><span class="label">PEXP</span><span class="value-dim">' +
          editSpan(jPexpCur, targetPath + '.职业.PEXP_当前') +
          ' / ' +
          editSpan(jPexpMax, targetPath + '.职业.PEXP_升级所需') +
          '</span></div>';

        const jTraits = _.get(job, '职业特性', {}),
          jtKeys = Object.keys(jTraits);
        if (jtKeys.length > 0) {
          h +=
            '<div style="margin-top:6px;"><span class="mate-sub-title" style="color:#a09080;font-size:13px;">职业特性</span>';
          jtKeys.forEach(function (k) {
            h +=
              '<div class="skill-line"><span style="color:#b8a070; font-weight:bold;">' +
              k +
              '</span> <br><span style="font-size:13px;color:#a09080;">' +
              editText(_.get(jTraits[k], '效果', ''), targetPath + '.职业.职业特性.' + k + '.效果') +
              '</span></div>';
          });
          h += '</div>';
        }
        h +=
          '<div style="margin-top:6px;"><span class="mate-sub-title" style="color:#a09080;font-size:13px;">职业技能</span>' +
          renderSkillsHtml(_.get(job, '职业技能', {}), targetPath + '.职业.职业技能') +
          '</div>';

        h += '</div>';
        h += '</div>';
      }

      /* ---------- 通用技能子区块 ---------- */
      const genSkills = _.get(m, '通用技能', {}),
        gsKeys = Object.keys(genSkills);
      let gsHtml = '';
      if (gsKeys.length === 0) {
        gsHtml = '<span class="empty-hint">暂无通用技能</span>';
      } else {
        gsHtml =
          '<span style="font-size:13px;color:#6a5a48; margin-bottom:4px; display:block;">(' +
          gsKeys.length +
          '/8)</span>' +
          renderSkillsHtml(genSkills, targetPath + '.通用技能');
      }
      h += '<div class="mate-sub">';
      h +=
        '<div class="mate-sub-header" data-sub-key="' +
        safeSubSkill +
        '"><span class="mate-sub-title" style="color:' +
        subTitleColor +
        ';">通用技能</span><span class="mate-sub-toggle' +
        (subSkillExpanded ? '' : ' collapsed') +
        '">▼</span></div>';
      h += '<div class="mate-sub-body' + (subSkillExpanded ? '' : ' hidden') + '">' + gsHtml + '</div>';
      h += '</div>';

      /* ---------- 装备子区块 ---------- */
      h += '<div class="mate-sub">';
      h +=
        '<div class="mate-sub-header" data-sub-key="' +
        safeSubEquip +
        '"><span class="mate-sub-title" style="color:' +
        subTitleColor +
        ';">装备</span><span class="mate-sub-toggle' +
        (subEquipExpanded ? '' : ' collapsed') +
        '">▼</span></div>';
      h +=
        '<div class="mate-sub-body' +
        (subEquipExpanded ? '' : ' hidden') +
        '">' +
        renderEquipHtml(_.get(m, '装备', {}), targetPath + '.装备', targetPath, isPlayerMode) +
        '</div>';
      h += '</div>';

      /* ---------- 背包子区块 ---------- */
      h += '<div class="mate-sub">';
      h +=
        '<div class="mate-sub-header" data-sub-key="' +
        safeSubBag +
        '"><span class="mate-sub-title" style="color:' +
        subTitleColor +
        ';">背包</span><span class="mate-sub-toggle' +
        (subBagExpanded ? '' : ' collapsed') +
        '">▼</span></div>';
      h +=
        '<div class="mate-sub-body' +
        (subBagExpanded ? '' : ' hidden') +
        '">' +
        renderBagHtml(_.get(m, '背包', {}), targetPath + '.背包', false) +
        '</div>';
      h += '</div>';

      /* ---------- 特殊状态 ---------- */
      const specStates = _.get(state, '特殊状态', {}),
        ssKeys = Object.keys(specStates);
      if (ssKeys.length > 0) {
        h += '<div style="margin-top:6px;">';
        ssKeys.forEach(function (k) {
          h +=
            '<div class="state-line"><span class="tag tag-red">' +
            k +
            '</span> <span style="font-size:13px;color:#a09080;">' +
            editText(specStates[k] || '', targetPath + '.状态.特殊状态.' + k) +
            '</span></div>';
        });
        h += '</div>';
      }

      h += '</div>';
      h += '</div>';

      return h;
    } catch (e) {
      console.error('renderEntityCard渲染失败:', name, e);
      return (
        '<div class="entity-card"><div style="padding:8px;color:#c8483c;">角色卡片渲染异常: ' + name + '</div></div>'
      );
    }
  }

  function updateFacilityPermissions(armyRank: string) {
    const ranks = ['列兵', '上士', '少尉', '少校', '上校', '准将', '中将', '元帅'];
    const rankIdx = ranks.indexOf(armyRank) >= 0 ? ranks.indexOf(armyRank) : 0;
    $c.find('.fac-req').each(function () {
      const reqIdx = parseInt($(this).attr('data-req') || '0');
      if (rankIdx >= reqIdx) {
        $(this).removeClass('unlocked').addClass('unlocked').text('已解锁');
      } else {
        $(this)
          .removeClass('unlocked')
          .addClass('locked')
          .text('权限不足 (' + ranks[reqIdx] + '解锁)');
      }
    });
  }

  function renderTreeNode(nodeData: any, nodeName: string): string {
    const status = _.get(nodeData, '状态', '未选择');
    let statusClass = 'node-locked';
    if (status === '已完成') statusClass = 'node-completed';
    else if (status === '当前') statusClass = 'node-current';
    else if (status === '未选择' || status === '未解锁') statusClass = 'node-locked';
    else if (status === '已放弃' || status === '跳过') statusClass = 'node-skipped';

    const detail = _.get(nodeData, '详情', null);
    let detailAttr = '';
    if (detail) {
      const safeDetail = encodeURIComponent(JSON.stringify(detail));
      detailAttr = `data-detail="${safeDetail}"`;
    }

    let html = `<li>`;
    html += `<div class="tree-node ${statusClass}" ${detailAttr}><span class="node-name">${nodeName}</span><span class="node-status">${status}</span></div>`;

    const children = _.get(nodeData, '分支', {});
    const childKeys = Object.keys(children);
    if (childKeys.length > 0) {
      html += `<ul>`;
      childKeys.forEach(function (k) {
        html += renderTreeNode(children[k], k);
      });
      html += `</ul>`;
    }
    html += `</li>`;
    return html;
  }

  function buildDetailPanelContent(detailData: any, nodeName: string) {
    if (!detailData) return `<div class="modal-desc">暂无详情数据</div>`;
    let html = `<div class="modal-title">${nodeName}</div>`;

    const desc = _.get(detailData, '详细内容', '');
    if (desc && desc !== '无') html += `<div class="modal-desc">${desc}</div>`;

    const eff = _.get(detailData, '效果', '');
    if (eff && eff !== '无') html += `<div class="modal-desc" style="color:#ddd5c8;">${eff}</div>`;

    const mAttr = _.get(detailData, '主属性加成', {}),
      sAttr = _.get(detailData, '副属性加成', {});
    if (mAttr.属性 && mAttr.属性 !== '无') {
      html += `<div class="modal-attr">预期主加成：${mAttr.属性} +${mAttr.值}</div>`;
    }
    if (sAttr.属性 && sAttr.属性 !== '无') {
      html += `<div class="modal-attr">预期副加成：${sAttr.属性} +${sAttr.值}</div>`;
    }

    const traits = _.get(detailData, '职业特性', {});
    const trKeys = Object.keys(traits);
    if (trKeys.length > 0) {
      html += `<div class="modal-skill-title">初期特性</div>`;
      trKeys.forEach(k => {
        html += `<div class="modal-skill-item"><b>${k}</b>: <br><span style="color:#a09080; font-weight:normal; display:inline-block; margin-top:2px;">${_.get(traits[k], '效果', '')}</span></div>`;
      });
    }

    const skills = _.get(detailData, '职业技能', {});
    if (Object.keys(skills).length > 0) {
      html += `<div class="modal-skill-title">初期技能</div>`;
      const skillsHtml = renderSkillsHtml(skills, '');
      html += `<div style="padding-left:4px; margin-left:2px; border-left:2px solid #33221a; margin-top:4px;">${skillsHtml}</div>`;
    }
    return html;
  }

  let targetOptionsHtml = '<option value="契约者">自己</option>';

  function populateCharacterData() {
    try {
      const all_variables = getAllVariables();
      const d = function (path: string, def: any) {
        return _.get(all_variables, 'stat_data.' + path, def);
      };

      updateFacilityPermissions(d('契约者.头部.军衔', '列兵'));

      $c.find('#env-world').html(editText(d('契约者.当前世界', '现实'), '契约者.当前世界'));
      $c.find('#env-real-date').html(editText(d('契约者.当前时间.现实日期', '---'), '契约者.当前时间.现实日期'));
      $c.find('#env-real-time').html(editText(d('契约者.当前时间.现实时间', '---'), '契约者.当前时间.现实时间'));
      $c.find('#env-dungeon-date').html(
        editText(d('契约者.当前时间.副本日期', '不在副本中'), '契约者.当前时间.副本日期'),
      );
      $c.find('#env-dungeon-time').html(
        editText(d('契约者.当前时间.副本时间', '不在副本中'), '契约者.当前时间.副本时间'),
      );
      $c.find('#env-obj-time').html(editText(d('契约者.当前时间.客观时间', '不在副本中'), '契约者.当前时间.客观时间'));
      $c.find('#env-loc').html(editText(d('契约者.当前时间.地点', '未知'), '契约者.当前时间.地点'));
      $c.find('#env-prog').html(editText(d('契约者.当前时间.阶段进度', '0%'), '契约者.当前时间.阶段进度'));

      $c.find('#h-name').html(editText(d('契约者.头部.姓名', '---'), '契约者.头部.姓名'));
      $c.find('#h-lv').html('Lv.' + editSpan(d('契约者.头部.等级', 1), '契约者.头部.等级'));
      $c.find('#h-exp').html(
        editSpan(d('契约者.头部.EXP_当前', 0), '契约者.头部.EXP_当前') +
          ' / ' +
          editSpan(d('契约者.头部.EXP_升级所需', 50), '契约者.头部.EXP_升级所需'),
      );
      $c.find('#h-rank').html(editText(d('契约者.头部.阶位', '一阶'), '契约者.头部.阶位'));
      $c.find('#h-army').text(d('契约者.头部.军衔', '列兵'));
      $c.find('#h-rp').html(
        editSpan(d('契约者.头部.RP_当前', 0), '契约者.头部.RP_当前') + ' / ' + d('契约者.头部.RP_下一级', 5),
      );
      $c.find('#h-cr').html(editSpan(d('契约者.头部.CR', 3.0), '契约者.头部.CR'));
      $c.find('#h-att').text(d('契约者.头部.回廊态度', '观察'));

      const talent = d('契约者.头部.天赋', {});
      $c.find('#h-talent-name').html(editText(_.get(talent, '名称', '无'), '契约者.头部.天赋.名称'));
      $c.find('#h-talent-quality').html(editText(_.get(talent, '品质', ''), '契约者.头部.天赋.品质'));
      $c.find('#h-talent-bonus').html(editText(_.get(talent, '属性加成', '无'), '契约者.头部.天赋.属性加成'));
      let tEffs = _.get(talent, '效果', {}),
        teHtml = '';
      if (typeof tEffs === 'string' && tEffs && tEffs !== '无') {
        teHtml =
          '<div style="font-size:13px;padding:2px 0;color:#a09080;line-height:1.5;">' +
          editText(tEffs, '契约者.头部.天赋.效果') +
          '</div>';
      } else {
        const teKeys = Object.keys(tEffs || {});
        if (teKeys.length === 0)
          teHtml = '<div class="row"><span class="label">效果</span><span class="value-dim">无</span></div>';
        else {
          teKeys.forEach(function (k) {
            teHtml +=
              '<div style="font-size:13px;padding:2px 0;"><span style="color:#b8a070;font-weight:bold;">' +
              k +
              '</span>: <span style="color:#a09080;">' +
              editText(tEffs[k], '契约者.头部.天赋.效果.' + k) +
              '</span></div>';
          });
        }
      }
      $c.find('#h-talent-effects').html(teHtml);
      if (_.get(talent, '名称', '无') === '无' || _.get(talent, '名称', '') === '')
        $c.find('#h-talent-name').addClass('value-none');
      else $c.find('#h-talent-name').removeClass('value-none');

      const blood = d('契约者.头部.血统', {});
      $c.find('#h-blood-name').html(editText(_.get(blood, '名称', '无'), '契约者.头部.血统.名称'));
      const bQuality = _.get(blood, '品质', '');
      let bTagClass = 'tag-gray';
      if (bQuality === '金色') bTagClass = 'tag-orange';
      else if (bQuality === '蓝色') bTagClass = 'tag-blue';
      else if (bQuality === '绿色') bTagClass = 'tag-green';
      else if (bQuality === '银色' || bQuality === '紫色') bTagClass = 'tag-purple';
      $c.find('#h-blood-quality').html(
        '<span class="tag ' + bTagClass + '">' + editText(bQuality, '契约者.头部.血统.品质') + '</span>',
      );
      $c.find('#h-blood-bonus').html(editText(_.get(blood, '属性加成', '无'), '契约者.头部.血统.属性加成'));
      let bEffs = _.get(blood, '效果', {}),
        beHtml = '';
      if (typeof bEffs === 'string' && bEffs && bEffs !== '无') {
        beHtml =
          '<div style="font-size:13px;padding:2px 0;color:#a09080;line-height:1.5;">' +
          editText(bEffs, '契约者.头部.血统.效果') +
          '</div>';
      } else {
        const beKeys = Object.keys(bEffs || {});
        if (beKeys.length === 0)
          beHtml = '<div class="row"><span class="label">效果</span><span class="value-dim">无</span></div>';
        else {
          beKeys.forEach(function (k) {
            beHtml +=
              '<div style="font-size:13px;padding:2px 0;"><span style="color:#b8a070;font-weight:bold;">' +
              k +
              '</span>: <span style="color:#a09080;">' +
              editText(bEffs[k], '契约者.头部.血统.效果.' + k) +
              '</span></div>';
          });
        }
      }
      $c.find('#h-blood-effects').html(beHtml);
      if (_.get(blood, '名称', '无') === '无' || _.get(blood, '名称', '') === '')
        $c.find('#h-blood-name').addClass('value-none');
      else $c.find('#h-blood-name').removeClass('value-none');

      const curTitle = d('契约者.头部.称号.当前称号', {});
      $c.find('#h-cur-title-name').html(editText(_.get(curTitle, '名称', '无'), '契约者.头部.称号.当前称号.名称'));
      let ctEffs = _.get(curTitle, '效果', {}),
        ctHtml = '';
      if (typeof ctEffs === 'string' && ctEffs && ctEffs !== '无') {
        ctHtml =
          '<div style="font-size:13px;padding:2px 0;color:#a09080;line-height:1.5;">' +
          editText(ctEffs, '契约者.头部.称号.当前称号.效果') +
          '</div>';
      } else {
        const ctKeys = Object.keys(ctEffs || {});
        if (ctKeys.length === 0)
          ctHtml = '<div class="row"><span class="label">效果</span><span class="value-dim">无</span></div>';
        else {
          ctKeys.forEach(function (k) {
            ctHtml +=
              '<div style="font-size:13px;padding:2px 0;"><span style="color:#b8a070;font-weight:bold;">' +
              k +
              '</span>: <span style="color:#a09080;">' +
              editText(ctEffs[k], '契约者.头部.称号.当前称号.效果.' + k) +
              '</span></div>';
          });
        }
      }
      $c.find('#h-cur-title-effects').html(ctHtml);
      if (!_.get(curTitle, '名称', '') || _.get(curTitle, '名称', '') === '' || _.get(curTitle, '名称', '') === '无')
        $c.find('#h-cur-title-name').addClass('value-none');
      else $c.find('#h-cur-title-name').removeClass('value-none');

      const bkTitle = d('契约者.头部.称号.备用称号（只记录不生效）', {});
      $c.find('#h-bk-title-name').html(
        editText(_.get(bkTitle, '名称', '无'), '契约者.头部.称号.备用称号（只记录不生效）.名称'),
      );
      let btEffs = _.get(bkTitle, '效果', {}),
        btHtml = '';
      if (typeof btEffs === 'string' && btEffs && btEffs !== '无') {
        btHtml =
          '<div style="font-size:13px;padding:2px 0;color:#6a5a48;line-height:1.5;">' +
          editText(btEffs, '契约者.头部.称号.备用称号（只记录不生效）.效果') +
          '</div>';
      } else {
        const btKeys = Object.keys(btEffs || {});
        if (btKeys.length === 0)
          btHtml = '<div class="row"><span class="label">效果</span><span class="value-none">无</span></div>';
        else {
          btKeys.forEach(function (k) {
            btHtml +=
              '<div style="font-size:13px;padding:2px 0;"><span style="color:#6a5a48;font-weight:bold;">' +
              k +
              '</span>: <span style="color:#6a5a48;">' +
              editText(btEffs[k], '契约者.头部.称号.备用称号（只记录不生效）.效果.' + k) +
              '</span></div>';
          });
        }
      }
      $c.find('#h-bk-title-effects').html(btHtml);
      if (!_.get(bkTitle, '名称', '') || _.get(bkTitle, '名称', '') === '' || _.get(bkTitle, '名称', '') === '无')
        $c.find('#h-bk-title-name').addClass('value-none');
      else $c.find('#h-bk-title-name').removeClass('value-none');

      const expPct = (d('契约者.头部.EXP_当前', 0) / Math.max(d('契约者.头部.EXP_升级所需', 50), 1)) * 100;
      $c.find('#bar-exp').css('width', Math.min(expPct, 100) + '%');

      const strActual = d('契约者.属性.实际.STR', 5),
        strBase = d('契约者.属性.基础.STR', 5),
        strBonus = d('契约者.属性.加成.STR', 0),
        strCustom = d('契约者.属性.自定义加成.STR', 0);
      const agiActual = d('契约者.属性.实际.AGI', 5),
        agiBase = d('契约者.属性.基础.AGI', 5),
        agiBonus = d('契约者.属性.加成.AGI', 0),
        agiCustom = d('契约者.属性.自定义加成.AGI', 0);
      const conActual = d('契约者.属性.实际.CON', 5),
        conBase = d('契约者.属性.基础.CON', 5),
        conBonus = d('契约者.属性.加成.CON', 0),
        conCustom = d('契约者.属性.自定义加成.CON', 0);
      const perActual = d('契约者.属性.实际.PER', 5),
        perBase = d('契约者.属性.基础.PER', 5),
        perBonus = d('契约者.属性.加成.PER', 0),
        perCustom = d('契约者.属性.自定义加成.PER', 0);
      const free = d('契约者.属性.未分配属性点', 0),
        softCap = d('契约者.头部.属性软上限', 25);

      const rankMul = getRankMultiplier(d('契约者.头部.阶位', '一阶'));
      const strMod = (strActual - 5) * rankMul;
      const agiMod = (agiActual - 5) * rankMul;
      const conMod = (conActual - 5) * rankMul;
      const perMod = (perActual - 5) * rankMul;

      $c.find('#attr-str').html(
        strActual + modSpan(strMod) + ' <span style="font-size:12px;color:#a09080;">/上限' + softCap + '</span>',
      );
      $c.find('#attr-str-detail').html(
        formatAttrDetail(strBase, strBonus, strCustom, '契约者.属性.基础.STR', '契约者.属性.自定义加成.STR'),
      );
      $c.find('#attr-agi').html(
        agiActual + modSpan(agiMod) + ' <span style="font-size:12px;color:#a09080;">/上限' + softCap + '</span>',
      );
      $c.find('#attr-agi-detail').html(
        formatAttrDetail(agiBase, agiBonus, agiCustom, '契约者.属性.基础.AGI', '契约者.属性.自定义加成.AGI'),
      );
      $c.find('#attr-con').html(
        conActual + modSpan(conMod) + ' <span style="font-size:12px;color:#a09080;">/上限' + softCap + '</span>',
      );
      $c.find('#attr-con-detail').html(
        formatAttrDetail(conBase, conBonus, conCustom, '契约者.属性.基础.CON', '契约者.属性.自定义加成.CON'),
      );
      $c.find('#attr-per').html(
        perActual + modSpan(perMod) + ' <span style="font-size:12px;color:#a09080;">/上限' + softCap + '</span>',
      );
      $c.find('#attr-per-detail').html(
        formatAttrDetail(perBase, perBonus, perCustom, '契约者.属性.基础.PER', '契约者.属性.自定义加成.PER'),
      );
      $c.find('#attr-free').html(editSpan(free, '契约者.属性.未分配属性点'));

      const hpMax = d('契约者.衍生属性.HP_最大', 0),
        hpCur = d('契约者.衍生属性.HP_当前', 0),
        mpMax = d('契约者.衍生属性.MP_最大', 0),
        mpCur = d('契约者.衍生属性.MP_当前', 0),
        spMax = d('契约者.衍生属性.耐力_最大', 0),
        spCur = d('契约者.衍生属性.耐力_当前', 0),
        defVal = d('契约者.衍生属性.防御', 0),
        dodgeVal = d('契约者.衍生属性.闪避值', 0),
        moveVal = d('契约者.衍生属性.移动距离', 0),
        loadCur = d('契约者.衍生属性.负重_当前', 0),
        loadMax = d('契约者.衍生属性.负重_上限', 0);

      const extraHp = d('契约者.衍生属性.HP额外加成', 0);
      const extraMp = d('契约者.衍生属性.MP额外加成', 0);
      const extraSp = d('契约者.衍生属性.耐力额外加成', 0);
      const extraDef = d('契约者.衍生属性.防御额外加成', 0);
      const extraDodge = d('契约者.衍生属性.闪避额外加成', 0);
      const extraMove = d('契约者.衍生属性.移动距离额外加成', 0);
      const extraLoad = d('契约者.衍生属性.负重额外加成', 0);

      $c.find('#der-hp').html(
        editSpan(hpCur, '契约者.衍生属性.HP_当前') +
          ' / ' +
          hpMax +
          (extraHp ? `<span style="font-size:12px;color:#a09080;margin-left:4px;">(+${extraHp})</span>` : ''),
      );
      $c.find('#der-mp').html(
        editSpan(mpCur, '契约者.衍生属性.MP_当前') +
          ' / ' +
          mpMax +
          (extraMp ? `<span style="font-size:12px;color:#a09080;margin-left:4px;">(+${extraMp})</span>` : ''),
      );
      $c.find('#der-sp').html(
        editSpan(spCur, '契约者.衍生属性.耐力_当前') +
          ' / ' +
          spMax +
          (extraSp ? `<span style="font-size:12px;color:#a09080;margin-left:4px;">(+${extraSp})</span>` : ''),
      );
      $c.find('#der-def').html(
        defVal + (extraDef ? `<span style="font-size:12px;color:#a09080;margin-left:4px;">(+${extraDef})</span>` : ''),
      );
      $c.find('#der-dodge').html(
        dodgeVal +
          (extraDodge ? `<span style="font-size:12px;color:#a09080;margin-left:4px;">(+${extraDodge})</span>` : ''),
      );
      $c.find('#der-move').html(
        moveVal +
          'm' +
          (extraMove ? `<span style="font-size:12px;color:#a09080;margin-left:4px;">(+${extraMove})</span>` : ''),
      );
      $c.find('#der-load').html(
        loadCur +
          ' / ' +
          loadMax +
          'kg' +
          (extraLoad ? `<span style="font-size:12px;color:#a09080;margin-left:4px;">(+${extraLoad})</span>` : ''),
      );

      const hpPct = (hpCur / Math.max(hpMax, 1)) * 100,
        mpPct = (mpCur / Math.max(mpMax, 1)) * 100,
        spPct = (spCur / Math.max(spMax, 1)) * 100;
      $c.find('#bar-hp').css('width', Math.min(hpPct, 100) + '%');
      $c.find('#bar-mp').css('width', Math.min(mpPct, 100) + '%');
      $c.find('#bar-sp').css('width', Math.min(spPct, 100) + '%');

      const lifeState = d('契约者.状态.生命状态', '健康'),
        stateColors: Record<string, string> = {
          健康: 'tag-green',
          受伤: 'tag-orange',
          重伤: 'tag-red',
          濒死: 'tag-red',
        };
      $c.find('#state-life')
        .text(lifeState)
        .removeClass()
        .addClass('tag ' + (stateColors[lifeState] || 'tag-gray'));
      $c.find('#eco-up').html(editSpan(d('契约者.经济.UP', 0), '契约者.经济.UP'));

      const ind = d('契约者.个人产业', {});
      const curShop = _.get(ind, '当前店铺', {});
      const shopName = _.get(curShop, '名称', '无');
      let shopHtml = '';
      if (!shopName || shopName === '无') {
        shopHtml = '<span class="empty-hint">暂无店铺</span>';
      } else {
        shopHtml +=
          '<div class="row"><span class="label">店铺名称</span><span class="value" style="color:#e0c080;">' +
          editText(shopName, '契约者.个人产业.当前店铺.名称') +
          '</span></div>';
        shopHtml +=
          '<div class="row"><span class="label">等级/行业</span><span class="value-dim">' +
          editText(_.get(curShop, '等级', ''), '契约者.个人产业.当前店铺.等级') +
          ' | ' +
          editText(_.get(curShop, '所属行业', ''), '契约者.个人产业.当前店铺.所属行业') +
          '</span></div>';
        shopHtml +=
          '<div class="row"><span class="label">租金到期</span><span class="value-dim">' +
          editText(_.get(curShop, '租金到期日', ''), '契约者.个人产业.当前店铺.租金到期日') +
          '</span></div>';
        shopHtml +=
          '<div class="row"><span class="label">雇员状态</span><span class="value-dim">' +
          editText(_.get(curShop, '雇员状态', '无'), '契约者.个人产业.当前店铺.雇员状态') +
          '</span></div>';
        const fac = _.get(curShop, '设施清单', {}),
          facKeys = Object.keys(fac);
        if (facKeys.length > 0) {
          shopHtml += '<div class="sub-section"><div class="sub-title">设施清单</div>';
          facKeys.forEach(k => {
            shopHtml +=
              '<div class="skill-line"><span style="color:#b8a070; font-weight:bold;">' +
              k +
              '</span> <span style="font-size:13px;color:#a09080;">' +
              editText(fac[k], '契约者.个人产业.当前店铺.设施清单.' + k) +
              '</span></div>';
          });
          shopHtml += '</div>';
        }
        const orders = _.get(ind, '代工与订单', {});
        const fUp = _.get(orders, '冻结资金_UP', 0);
        shopHtml +=
          '<div class="sub-section"><div class="sub-title">代工与订单 <span style="font-size:12px;color:#d08a4a;font-weight:normal;float:right;">冻结资金: ' +
          editSpan(fUp, '契约者.个人产业.代工与订单.冻结资金_UP') +
          ' UP</span></div>';
        const ordList = _.get(orders, '进行中订单', {}),
          ordKeys = Object.keys(ordList);
        if (ordKeys.length === 0) {
          shopHtml += '<span class="empty-hint">暂无进行中订单</span>';
        } else {
          ordKeys.forEach(k => {
            const ordDesc = typeof ordList[k] === 'string' ? ordList[k] : JSON.stringify(ordList[k]);
            shopHtml +=
              '<div class="skill-line"><span style="color:#ddd5c8; font-weight:bold;">' +
              k +
              '</span> <br><span style="font-size:13px;color:#a09080;">' +
              ordDesc +
              '</span></div>';
          });
        }
        shopHtml += '</div>';
      }
      $c.find('#industry-info').html(shopHtml);

      let specStates = d('契约者.状态.特殊状态', {}),
        ssHtml = '',
        ssKeys = Object.keys(specStates);
      if (ssKeys.length === 0) ssHtml = '<span class="empty-hint">无</span>';
      else {
        ssKeys.forEach(function (k) {
          ssHtml +=
            '<div class="state-line"><span class="tag tag-red">' +
            k +
            '</span> <span style="font-size:13px;color:#a09080;">' +
            editText(specStates[k] || '', '契约者.状态.特殊状态.' + k) +
            '</span></div>';
        });
      }
      $c.find('#state-special').html(ssHtml);

      $c.find('#season-num').text(d('契约者.赛季信息.当前赛季', 21));
      $c.find('#season-cycle').text(d('契约者.赛季信息.当前副本周期', 0) + ' / 10');
      $c.find('#qual-points').html(editSpan(d('契约者.资格分', 0), '契约者.资格分'));
      const rankVal = d('契约者.排行榜.当前排名', '未上榜'),
        rankPassive = d('契约者.排行榜.排行榜被动', '无');
      if (rankVal === '未上榜') $c.find('#rank-pos').text(rankVal).removeClass().addClass('value-none');
      else $c.find('#rank-pos').text(rankVal).removeClass().addClass('value');
      if (rankPassive === '无' || rankPassive === '')
        $c.find('#rank-passive').text('无').removeClass().addClass('value-none');
      else
        $c.find('#rank-passive')
          .text('判定+' + rankPassive)
          .removeClass()
          .addClass('value');
      const cyclePct = (d('契约者.赛季信息.当前副本周期', 0) / 10) * 100;
      $c.find('#bar-cycle').css('width', Math.min(cyclePct, 100) + '%');

      const job = d('契约者.职业', {});
      $c.find('#job-name').html(editText(_.get(job, '名称', '无'), '契约者.职业.名称'));
      $c.find('#job-quality').html(editText(_.get(job, '稀有度', ''), '契约者.职业.稀有度'));
      $c.find('#job-stage').html(editText(_.get(job, '转职阶段', ''), '契约者.职业.转职阶段'));
      $c.find('#job-lv').html('Lv.' + editSpan(_.get(job, '职业等级', 0), '契约者.职业.职业等级'));
      $c.find('#job-pexp').html(
        editSpan(_.get(job, 'PEXP_当前', 0), '契约者.职业.PEXP_当前') +
          ' / ' +
          editSpan(_.get(job, 'PEXP_升级所需', 0), '契约者.职业.PEXP_升级所需'),
      );
      const mainB = _.get(job, '主属性加成', {}),
        subB = _.get(job, '副属性加成', {});
      $c.find('#job-main-bonus').html(
        editText(_.get(mainB, '属性', '无'), '契约者.职业.主属性加成.属性') +
          ' +' +
          editSpan(_.get(mainB, '值', 0), '契约者.职业.主属性加成.值'),
      );
      $c.find('#job-sub-bonus').html(
        editText(_.get(subB, '属性', '无'), '契约者.职业.副属性加成.属性') +
          ' +' +
          editSpan(_.get(subB, '值', 0), '契约者.职业.副属性加成.值'),
      );

      $c.find('#job-skills').html(renderSkillsHtml(_.get(job, '职业技能', {}), '契约者.职业.职业技能'));
      let jobTraits = _.get(job, '职业特性', {}),
        jtHtml = '',
        jtKeys = Object.keys(jobTraits);
      if (jtKeys.length === 0) jtHtml = '<span class="empty-hint">暂无职业特性</span>';
      else {
        jtKeys.forEach(function (k) {
          jtHtml +=
            '<div class="skill-line"><span style="color:#b8a070; font-weight:bold;">' +
            k +
            '</span> <br><span style="font-size:13px;color:#a09080;">' +
            editText(_.get(jobTraits[k], '效果', ''), '契约者.职业.职业特性.' + k + '.效果') +
            '</span></div>';
        });
      }
      $c.find('#job-traits').html(jtHtml);

      const legacySkills = _.get(job, '传承技能', {});
      const lsKeys = Object.keys(legacySkills);
      let lsHtml = '';
      if (lsKeys.length === 0) {
        lsHtml = '<span class="empty-hint">暂无传承技能</span>';
      } else {
        lsHtml = renderSkillsHtml(legacySkills, '契约者.职业.传承技能');
      }
      $c.find('#job-legacy').html(lsHtml);

      let genSkills = d('契约者.通用技能', {}),
        gsKeys = Object.keys(genSkills),
        gsHtml = '';
      if (gsKeys.length === 0) gsHtml = '<span class="empty-hint">暂无通用技能</span>';
      else {
        gsHtml +=
          '<span style="font-size:13px;color:#6a5a48; margin-bottom:4px; display:block;">(' +
          gsKeys.length +
          '/8)</span>' +
          renderSkillsHtml(genSkills, '契约者.通用技能');
      }
      $c.find('#gen-skills').html(gsHtml);

      $c.find('#equip-list').html(renderEquipHtml(d('契约者.装备', {}), '契约者.装备', '契约者', true));

      /* 背包装备目标 */
      targetOptionsHtml = '<option value="契约者">自己</option>';
      const squad = d('契约者.小队.成员', {}),
        sqKeys = Object.keys(squad);
      sqKeys.forEach(function (memberKey) {
        targetOptionsHtml += `<option value="契约者.小队.成员.${memberKey}">${memberKey}</option>`;
      });
      const contractors = d('契约者.其他契约者', {}),
        conKeys = Object.keys(contractors);
      conKeys.forEach(function (ck) {
        targetOptionsHtml += `<option value="契约者.其他契约者.${ck}">${ck}</option>`;
      });

      $c.find('#bag-list').html(renderBagHtml(d('契约者.背包', {}), '契约者.背包', true));

      /* 副本经历渲染到 dungeon-history */
      let dungeons = d('契约者.副本经历', {}),
        dgHtml = '',
        dgKeys = Object.keys(dungeons);
      if (dgKeys.length === 0) dgHtml = '<span class="empty-hint">暂无副本记录</span>';
      else {
        dgKeys.forEach(function (k) {
          let dg = dungeons[k] || {},
            grade = _.get(dg, '评价等级', ''),
            gradeClass = 'tag-green';
          if (grade === 'S') gradeClass = 'tag-orange';
          else if (grade === 'A') gradeClass = 'tag-purple';
          else if (grade === 'B') gradeClass = 'tag-blue';
          else if (grade === 'C') gradeClass = 'tag-gray';
          else if (grade === 'D') gradeClass = 'tag-red';
          dgHtml +=
            '<div class="skill-line"><span class="tag ' +
            gradeClass +
            '">' +
            grade +
            '</span> <span style="color:#ddd5c8; font-size:14px;">' +
            k +
            '</span> <br><span style="font-size:13px;color:#a09080;">' +
            editText(_.get(dg, '简要说明', ''), '契约者.副本经历.' + k + '.简要说明') +
            '</span></div>';
        });
      }
      $c.find('#dungeon-history').html(dgHtml);

      let relations = d('契约者.人际关系', {}),
        relHtml = '',
        relKeys = Object.keys(relations);
      if (relKeys.length === 0) relHtml = '<span class="empty-hint">暂无关系记录</span>';
      else {
        relKeys.forEach(function (k) {
          let rel = relations[k] || {},
            fav = _.get(rel, '好感度', 0),
            favColor = '#6a9070';
          if (fav < -30) favColor = '#c8483c';
          else if (fav < 0) favColor = '#d08a4a';
          else if (fav < 30) favColor = '#a09080';
          else if (fav < 60) favColor = '#e0c080';
          relHtml +=
            '<div class="skill-line"><span style="color:#ddd5c8; font-size:14px;">' +
            k +
            '</span> <span style="color:' +
            favColor +
            ';">❤ ' +
            editSpan(fav, '契约者.人际关系.' + k + '.好感度') +
            '</span>';
          if (_.get(rel, '关系', '')) {
            relHtml +=
              ' <br><span style="font-size:13px;color:#6a5a48;">' +
              editText(_.get(rel, '关系', ''), '契约者.人际关系.' + k + '.关系') +
              '</span>';
          }
          relHtml += '</div>';
        });
      }
      $c.find('#rel-list').html(relHtml);

      /* ── Tab 2: 副本情报 ── */
      const meta = d('契约者.当前副本元数据', {});
      $c.find('#meta-name').html(editText(_.get(meta, '副本名称', '未生成'), '契约者.当前副本元数据.副本名称'));
      $c.find('#meta-src').html(editText(_.get(meta, '副本来源', '未生成'), '契约者.当前副本元数据.副本来源'));
      const dType = _.get(meta, '副本类型', '未生成'),
        dtClass =
          dType === '和平' ? 'tag-green' : dType === '阵营' ? 'tag-blue' : dType === '血腥' ? 'tag-red' : 'tag-gray';
      $c.find('#meta-type')
        .html(editText(dType, '契约者.当前副本元数据.副本类型'))
        .removeClass()
        .addClass('tag ' + dtClass);
      $c.find('#meta-baselv').html('Lv.' + editSpan(_.get(meta, '基准等级', 1), '契约者.当前副本元数据.基准等级'));
      $c.find('#meta-time').html(editText(_.get(meta, '时间限制', '未生成'), '契约者.当前副本元数据.时间限制'));

      let otherConts = d('契约者.其他契约者名单', {}),
        ocKeys = Object.keys(otherConts),
        ocHtml = '';
      if (ocKeys.length === 0) ocHtml = '<span class="empty-hint">暂无已知其他契约者</span>';
      else {
        ocKeys.forEach(function (k) {
          const c = otherConts[k] || {},
            st = _.get(c, '状态', '存活'),
            stClass = st === '死亡' ? 'tag-red' : 'tag-green',
            fac = _.get(c, '阵营', '未知');
          ocHtml += '<div class="skill-line"><span class="tag ' + stClass + '">' + st + '</span> ';
          if (fac && fac !== '未知') ocHtml += '<span class="tag tag-blue">' + fac + '</span> ';
          ocHtml +=
            '<span style="color:#ddd5c8; font-size:14px; font-weight:bold;">' +
            k +
            '</span> <br><span style="color:#a09080; font-size:13px; padding-left:4px;">Lv.' +
            _.get(c, '等级', 1) +
            '</span>';
          const cTitle = _.get(c, '称号', '无');
          if (cTitle && cTitle !== '无')
            ocHtml += ' <span style="color:#b8a070; font-size:13px;">[' + cTitle + ']</span>';
          ocHtml += '</div>';
        });
      }
      $c.find('#other-conts-list').html(ocHtml);

      let fixedConts = d('契约者.固有角色名单', {}),
        fcKeys = Object.keys(fixedConts),
        fcHtml = '';
      if (fcKeys.length === 0) fcHtml = '<span class="empty-hint">暂无已知固有角色</span>';
      else {
        fcKeys.forEach(function (k) {
          const f = fixedConts[k] || {},
            st = _.get(f, '状态', '存活'),
            stClass = st === '死亡' ? 'tag-red' : 'tag-green',
            lv = _.get(f, '等级', 1);
          fcHtml +=
            '<div class="skill-line"><span class="tag ' +
            stClass +
            '">' +
            st +
            '</span> <span style="color:#ddd5c8; font-size:14px; font-weight:bold;">' +
            k +
            '</span> <br><span style="color:#a09080; font-size:13px; padding-left:4px;">Lv.' +
            lv +
            '</span></div>';
        });
      }
      $c.find('#fixed-conts-list').html(fcHtml);

      let mainQuest = d('契约者.当前副本任务.主线任务', {}),
        mqName = _.get(mainQuest, '名称', ''),
        mqDesc = _.get(mainQuest, '说明', ''),
        mqReward = _.get(mainQuest, '奖励', ''),
        mqStatus = _.get(mainQuest, '状态', '进行中'),
        mqHtml = '';
      if (!mqName || mqName === '') mqHtml = '<span class="empty-hint">暂无主线任务</span>';
      else {
        const mqStClass = mqStatus === '已完成' ? 'tag-green' : mqStatus === '失败' ? 'tag-red' : 'tag-orange';
        mqHtml +=
          '<div class="quest-item"><span class="tag ' +
          mqStClass +
          '">' +
          mqStatus +
          '</span> <span style="color:#ddd5c8; font-size:14px;">' +
          editText(mqName, '契约者.当前副本任务.主线任务.名称') +
          '</span>';
        if (mqDesc) {
          mqHtml +=
            '<div class="quest-desc" style="font-size:14px;">' +
            editText(mqDesc, '契约者.当前副本任务.主线任务.说明') +
            '</div>';
        }
        if (mqReward) {
          mqHtml +=
            '<div class="quest-reward" style="font-size:13px;">奖励: ' +
            editText(mqReward, '契约者.当前副本任务.主线任务.奖励') +
            '</div>';
        }
        mqHtml += '</div>';
      }
      $c.find('#quest-main').html(mqHtml);

      let sideQuests = d('契约者.当前副本任务.支线任务', {}),
        sqHtml2 = '',
        sqKeys2 = Object.keys(sideQuests);
      if (sqKeys2.length === 0) sqHtml2 = '<span class="empty-hint">暂无支线任务</span>';
      else {
        sqKeys2.forEach(function (k) {
          const q = sideQuests[k] || {},
            st = _.get(q, '状态', '进行中'),
            stClass = st === '已完成' ? 'tag-green' : st === '失败' ? 'tag-red' : 'tag-orange',
            desc = _.get(q, '说明', ''),
            reward = _.get(q, '奖励', '');
          sqHtml2 +=
            '<div class="quest-item"><span class="tag ' +
            stClass +
            '">' +
            st +
            '</span> <span style="color:#ddd5c8; font-size:14px;">' +
            k +
            '</span>';
          if (desc) {
            sqHtml2 +=
              '<div class="quest-desc" style="font-size:14px;">' +
              editText(desc, '契约者.当前副本任务.支线任务.' + k + '.说明') +
              '</div>';
          }
          if (reward) {
            sqHtml2 +=
              '<div class="quest-reward" style="font-size:13px;">奖励: ' +
              editText(reward, '契约者.当前副本任务.支线任务.' + k + '.奖励') +
              '</div>';
          }
          sqHtml2 += '</div>';
        });
      }
      $c.find('#quest-side').html(sqHtml2);

      let hiddenQuests = d('契约者.当前副本任务.隐藏任务', {}),
        hqHtml = '',
        hqKeys = Object.keys(hiddenQuests);
      if (hqKeys.length === 0) hqHtml = '<span class="empty-hint">未触发</span>';
      else {
        hqKeys.forEach(function (k) {
          const q = hiddenQuests[k] || {},
            st = _.get(q, '状态', '未触发'),
            stClass = st === '已完成' ? 'tag-green' : st === '进行中' ? 'tag-orange' : 'tag-purple',
            desc = _.get(q, '说明', ''),
            reward = _.get(q, '奖励', '');
          hqHtml +=
            '<div class="quest-item"><span class="tag ' +
            stClass +
            '">' +
            st +
            '</span> <span style="color:#ddd5c8; font-size:14px;">' +
            k +
            '</span>';
          if (desc) {
            hqHtml +=
              '<div class="quest-desc" style="font-size:14px;">' +
              editText(desc, '契约者.当前副本任务.隐藏任务.' + k + '.说明') +
              '</div>';
          }
          if (reward) {
            hqHtml +=
              '<div class="quest-reward" style="font-size:13px;">奖励: ' +
              editText(reward, '契约者.当前副本任务.隐藏任务.' + k + '.奖励') +
              '</div>';
          }
          hqHtml += '</div>';
        });
      }
      $c.find('#quest-hidden').html(hqHtml);

      let worldEvents = d('契约者.当前副本任务.世界事件', {}),
        weHtml = '',
        weKeys = Object.keys(worldEvents);
      if (weKeys.length === 0) weHtml = '<span class="empty-hint">暂无世界事件</span>';
      else {
        weKeys.forEach(function (k) {
          const e = worldEvents[k] || {},
            st = _.get(e, '状态', '进行中'),
            stClass = st === '已结束' ? 'tag-gray' : 'tag-orange',
            desc = _.get(e, '说明', ''),
            reward = _.get(e, '奖励', '');
          weHtml +=
            '<div class="quest-item"><span class="tag ' +
            stClass +
            '">' +
            st +
            '</span> <span style="color:#ddd5c8; font-size:14px;">' +
            k +
            '</span>';
          if (desc) {
            weHtml +=
              '<div class="quest-desc" style="font-size:14px;">' +
              editText(desc, '契约者.当前副本任务.世界事件.' + k + '.说明') +
              '</div>';
          }
          if (reward) {
            weHtml +=
              '<div class="quest-reward" style="font-size:13px;">奖励: ' +
              editText(reward, '契约者.当前副本任务.世界事件.' + k + '.奖励') +
              '</div>';
          }
          weHtml += '</div>';
        });
      }
      $c.find('#quest-world-events').html(weHtml);

      let achieves = d('契约者.当前副本任务.副本成就', {}),
        acHtml = '',
        acKeys = Object.keys(achieves);
      if (acKeys.length === 0) acHtml = '<span class="empty-hint">暂无成就</span>';
      else {
        acKeys.forEach(function (k) {
          const a = achieves[k] || {},
            st = _.get(a, '状态', '未达成'),
            stClass = st === '已达成' ? 'tag-green' : 'tag-gray',
            desc = _.get(a, '说明', ''),
            diff = _.get(a, '难度', ''),
            reward = _.get(a, '奖励', '');
          acHtml += '<div class="quest-item"><span class="tag ' + stClass + '">' + st + '</span> ';
          if (diff) {
            acHtml += '<span style="color:#d08a4a;font-size:13px;">' + diff + '</span> ';
          }
          acHtml += '<span style="color:#ddd5c8; font-size:14px;">' + k + '</span>';
          if (desc) {
            acHtml +=
              '<div class="quest-desc" style="font-size:14px;">' +
              editText(desc, '契约者.当前副本任务.副本成就.' + k + '.说明') +
              '</div>';
          }
          if (reward) {
            acHtml +=
              '<div class="quest-reward" style="font-size:13px;">奖励: ' +
              editText(reward, '契约者.当前副本任务.副本成就.' + k + '.奖励') +
              '</div>';
          }
          acHtml += '</div>';
        });
      }
      $c.find('#quest-achievements').html(acHtml);

      /* ── Tab 3: 实体名单 ── */
      const squadName = d('契约者.小队.名称', '无');
      $c.find('#squad-name').text(squadName);
      if (squadName === '无' || squadName === '') $c.find('#squad-name').removeClass().addClass('value-none');
      else $c.find('#squad-name').removeClass().addClass('value');
      let sqHtml = '';
      if (sqKeys.length === 0) {
        sqHtml = '<span class="empty-hint">暂无小队成员</span>';
        $c.find('#squad-count').text('0').removeClass('value').addClass('value-none');
      } else {
        $c.find('#squad-count').text(sqKeys.length).removeClass('value-none').addClass('value');
        sqKeys.forEach(function (k) {
          sqHtml += renderEntityCard(k, squad[k] || {}, '小队.成员');
        });
      }
      $c.find('#squad-list').html(sqHtml);

      let dungeonChars = d('契约者.副本角色', {}),
        dunKeys = Object.keys(dungeonChars),
        dunHtml = '';
      if (dunKeys.length === 0) {
        dunHtml = '<span class="empty-hint" style="padding-left:4px;">当前无已收录的副本角色</span>';
        $c.find('#dungeon-count').text('0').removeClass('value-danger').addClass('value-none');
      } else {
        $c.find('#dungeon-count').text(dunKeys.length).removeClass('value-none').addClass('value-danger');
        dunKeys.forEach(function (k) {
          dunHtml += renderEntityCard(k, dungeonChars[k] || {}, '副本角色');
        });
      }
      $c.find('#dungeon-list').html(dunHtml);

      let conHtml = '';
      if (conKeys.length === 0) {
        conHtml = '<span class="empty-hint" style="padding-left:4px;">当前无遭遇的其他契约者</span>';
        $c.find('#contractor-count').text('0').removeClass('value').addClass('value-none');
      } else {
        $c.find('#contractor-count').text(conKeys.length).removeClass('value-none').addClass('value');
        conKeys.forEach(function (k) {
          conHtml += renderEntityCard(k, contractors[k] || {}, '其他契约者');
        });
      }
      $c.find('#contractor-list').html(conHtml);

      /* ── Tab 5: 职业树 ── */
      const jobTree = d('契约者.职业.转职树', null);
      let treeHtml = '';
      if (
        !jobTree ||
        Object.keys(jobTree).length === 0 ||
        (_.get(jobTree, '名称', '无') === '无' && Object.keys(_.get(jobTree, '分支', {})).length === 0)
      ) {
        treeHtml =
          '<div style="padding:16px; color:#a09080; text-align:center;"><p>目前尚未加载任何职业转职树数据。</p><p style="font-size:12px; color:#6a5a48;">(注: 当获得职业时，会自动生成路线)</p></div>';
      } else {
        const rootName = _.get(jobTree, '名称', '基础职业');
        treeHtml =
          '<div class="tree-container"><div class="tree-wrapper"><div class="tree"><ul>' +
          renderTreeNode(jobTree, rootName) +
          '</ul></div></div></div>';
        treeHtml += `<div id="modal-overlay"><div id="modal-panel" class="modal-panel"></div></div>`;
      }
      $c.find('#job-tree-content').html(treeHtml);

      /* ── 场景层：顶檐 / 中央铭牌 / 门牌状态 / 底部 HUD ── */
      $c.find('#ceil-real-date').text(d('契约者.当前时间.现实日期', '---'));
      $c.find('#ceil-real-time').text(d('契约者.当前时间.现实时间', '---'));
      $c.find('#ceil-dungeon-time').text(d('契约者.当前时间.副本时间', '不在副本中'));
      $c.find('#ceil-loc').text(d('契约者.当前时间.地点', '未知'));
      $c.find('#ceil-prog').text(d('契约者.当前时间.阶段进度', '0%'));

      $c.find('#plate-name').text(d('契约者.头部.姓名', '---'));
      $c.find('#plate-lv').text('Lv.' + d('契约者.头部.等级', 1));
      $c.find('#plate-rank').text(d('契约者.头部.阶位', '一阶'));
      $c.find('#plate-army').text(d('契约者.头部.军衔', '列兵'));
      $c.find('#plate-cr').text(d('契约者.头部.CR', 3.0));
      $c.find('#plate-att').text(d('契约者.头部.回廊态度', '观察'));
      $c.find('#plate-talent').text(_.get(talent, '名称', '无'));
      $c.find('#plate-blood').text(_.get(blood, '名称', '无'));

      const dunCount = Object.keys(d('契约者.副本角色', {})).length;
      $c.find('#door-status-identity').text('◆ Lv.' + d('契约者.头部.等级', 1) + ' · ' + d('契约者.头部.阶位', '一阶'));
      $c.find('#door-status-entity').text(`小队 ${sqKeys.length} · 副本 ${dunCount} · 契约者 ${conKeys.length}`);
      $c.find('#door-status-entity').toggleClass('danger', dunCount > 0);
      const doorJobName = _.get(job, '名称', '无');
      $c.find('#door-status-jobtree').text(doorJobName && doorJobName !== '无' ? doorJobName : '未就职');
      const doorDgName = _.get(meta, '副本名称', '未生成');
      const dgActive = !!doorDgName && doorDgName !== '未生成' && doorDgName !== '无';
      $c.find('#door-status-dungeon').text(dgActive ? doorDgName : '无活跃副本');
      $c.find('#alert-dungeon').toggleClass('on', dgActive);
      $c.find('#door-status-map').text(d('契约者.头部.军衔', '列兵') + ' · ' + d('契约者.当前世界', '现实'));

      $c.find('#hud-hp').css('width', Math.min(hpPct, 100) + '%');
      $c.find('#hud-hp-num').text(hpCur + '/' + hpMax);
      $c.find('#hud-mp').css('width', Math.min(mpPct, 100) + '%');
      $c.find('#hud-mp-num').text(mpCur + '/' + mpMax);
      $c.find('#hud-sp').css('width', Math.min(spPct, 100) + '%');
      $c.find('#hud-sp-num').text(spCur + '/' + spMax);
      $c.find('#hud-exp').css('width', Math.min(expPct, 100) + '%');
      $c.find('#hud-exp-num').text(d('契约者.头部.EXP_当前', 0) + '/' + d('契约者.头部.EXP_升级所需', 50));
      const hudDanger = lifeState === '重伤' || lifeState === '濒死';
      $c.find('#hud-life').text(lifeState).toggleClass('danger', hudDanger);
      $c.find('.scene-hud').toggleClass('danger', hudDanger);
      $c.find('#hud-up').text(d('契约者.经济.UP', 0));

      bindEditable();

      applyUiStateToDom();

      const allCollapsed =
        $c.find('.group-body:not(.hidden)').length === 0 &&
        $c.find('.section-body:not(.hidden)').length === 0 &&
        $c.find('.entity-body:not(.hidden)').length === 0;
      $c.find('#btn-toggle-all').text(allCollapsed ? '一键展开' : '一键折叠');
    } catch (e) {
      console.error('populateCharacterData执行出错:', e);
    }
  }

  function recalcAllEntities(stat_data: any) {
    let changed = false;
    if (applyAutoLevelAndDerivedStats(stat_data, '契约者')) changed = true;
    ['小队.成员', '其他契约者', '副本角色'].forEach(container => {
      const obj = _.get(stat_data, '契约者.' + container, {});
      Object.keys(obj).forEach(k => {
        if (applyAutoLevelAndDerivedStats(stat_data, '契约者.' + container + '.' + k)) changed = true;
      });
    });
    return changed;
  }

  /* ==================== 模块面板开合（门洞 → 覆盖面板） ==================== */
  const MODULE_TITLES: Record<string, string> = {
    'tab-status': '契 约 者 档 案',
    'tab-dungeon': '副 本 情 报',
    'tab-entity': '实 体 名 单',
    'tab-map': '回 廊 地 图',
    'tab-jobtree': '职 业 树',
  };

  function openModule(target: string) {
    $c.find('.tab-content').removeClass('active');
    $c.find('#' + target).addClass('active');
    $c.find('#module-panel-title').text(MODULE_TITLES[target] || '---');
    $c.find('#module-overlay').fadeIn(160);
  }

  function closeModule() {
    $c.find('#module-overlay').fadeOut(160);
  }

  let updateListener: EventOnReturn | undefined;

  async function init() {
    await waitGlobalInitialized('Mvu');

    try {
      const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
      if (data && data.stat_data) {
        if (recalcAllEntities(data.stat_data)) {
          await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
        }
      }
    } catch (e) {
      console.error('初始化自动升级失败', e);
    }

    try {
      updateListener = eventOn(Mvu.events.VARIABLE_UPDATE_ENDED, async function (vars: any) {
        try {
          if (vars && vars.stat_data) {
            if (recalcAllEntities(vars.stat_data)) {
              await Mvu.replaceMvuData(vars, { type: 'message', message_id: 'latest' });
            }
          }
        } catch (e) {
          console.error('事件更新失败', e);
        }
        populateCharacterData();
      });
    } catch (e) {
      console.error('事件监听绑定失败', e);
    }

    populateCharacterData();

    setTimeout(async () => {
      try {
        const lastMes = $('.mes').last();
        if (lastMes.attr('is_user') !== 'true' && !(window as any)._mvu_syslog_cleared) {
          (window as any)._mvu_syslog_cleared = true;
          try {
            const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
            const logs = _.get(data.stat_data, '系统日志', []);
            if (Array.isArray(logs) && logs.length > 0) {
              _.set(data.stat_data, '系统日志', []);
              await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
            }
          } catch (e) {
            console.error('尝试清空系统日志时发生错误:', e);
          }
        }
      } catch (e) {
        /* 系统日志清空失败不影响状态栏使用 */
      }
    }, 1000);

    /* ==================== 事件绑定 ==================== */
    /* 门洞 / 中央铭牌 → 展开对应模块面板 */
    $c.on('click', '.door, .center-plate', function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      openModule($(this).data('target'));
    });
    $c.on('click', '#module-close', function () {
      closeModule();
    });

    $c.on('click', '#btn-toggle-all', function () {
      const allCollapsed =
        $c.find('.group-body:not(.hidden)').length === 0 &&
        $c.find('.section-body:not(.hidden)').length === 0 &&
        $c.find('.entity-body:not(.hidden)').length === 0;
      if (allCollapsed) {
        _ui.collapsed_groups.clear();
        _ui.collapsed_sections.clear();
        $c.find('.entity-header').each(function () {
          const k = $(this).attr('data-entity-key');
          if (k) _ui.expand_entities.add(k);
        });
        $c.find('.mate-sub-header').each(function () {
          const k = $(this).attr('data-sub-key');
          if (k) _ui.expand_subs.add(k);
        });
      } else {
        $c.find('.group-header').each(function () {
          _ui.collapsed_groups.add('grp:' + $(this).find('.group-title').text().trim());
        });
        $c.find('.section-header').each(function () {
          _ui.collapsed_sections.add('sec:' + $(this).find('.section-title').text().trim());
        });
        _ui.expand_entities.clear();
        _ui.expand_subs.clear();
      }
      applyUiStateToDom();
      persistUiState();
      const nowAll =
        $c.find('.group-body:not(.hidden)').length === 0 &&
        $c.find('.section-body:not(.hidden)').length === 0 &&
        $c.find('.entity-body:not(.hidden)').length === 0;
      $c.find('#btn-toggle-all').text(nowAll ? '一键展开' : '一键折叠');
    });

    $c.on('click', '.group-header', function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      toggleGroup($(this));
    });

    $c.on('click', '.section-header', function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      toggleSection($(this));
    });

    $c.on('click', '.entity-header', function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      toggleEntity($(this));
    });

    $c.on('click', '.mate-sub-header', function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      toggleMateSub($(this));
    });

    /* 职业树弹窗 */
    $c.on('click', '.tree-node', function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      const detailStr = $(this).attr('data-detail');
      if (!detailStr) return;
      try {
        const detailData = JSON.parse(decodeURIComponent(detailStr));
        const nodeName = $(this).find('.node-name').text();
        const html = '<div class="modal-close">×</div>' + buildDetailPanelContent(detailData, nodeName);
        $c.find('#modal-panel').html(html);
        $c.find('#modal-overlay').fadeIn(200);
      } catch (err) {
        console.error('职业详情解析失败', err);
      }
    });

    $c.on('click', '#modal-overlay, #modal-overlay .modal-close', function (this: HTMLElement, e: JQuery.Event) {
      if (e.target === this || $(e.target).hasClass('modal-close')) {
        $c.find('#modal-overlay').fadeOut(200);
      }
    });

    /* 背包删除 */
    $c.on('click', '.btn-delete-bag', async function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      const itemName = $(this).data('itemname');
      if (!confirm('【警告】确认从背包中永久删除 [' + itemName + '] 吗？此操作不可逆！')) return;
      try {
        const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
        _.unset(data.stat_data, '契约者.背包.' + itemName);
        appendSystemLog(data, `你 销毁了背包中的物品: ${itemName}`);
        await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
        populateCharacterData();
      } catch (e2) {
        console.error('物品删除失败', e2);
      }
    });

    /* 脱下装备 */
    $c.on('click', '.btn-unequip', async function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      const slot = $(this).data('slot');
      const targetPath = $(this).data('targetpath');
      const displayName = targetPath === '契约者' ? '你' : targetPath.split('.').pop();

      if (!confirm('确认脱下 ' + displayName + ' [' + slot + '] 的装备吗？')) return;
      try {
        const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
        const eq = _.cloneDeep(_.get(data.stat_data, targetPath + '.装备.' + slot, {}));
        if (eq.名称 && eq.名称 !== '无') {
          const bagPath = '契约者.背包.' + eq.名称;
          const exist = _.get(data.stat_data, bagPath);
          if (exist) {
            eq.数量 = (exist.数量 || 0) + 1;
          } else {
            eq.数量 = 1;
          }
          _.set(data.stat_data, bagPath, eq);

          const emptyEquip = {
            名称: '无',
            类型: '无',
            品质: '无',
            阶位: '无',
            穿戴门槛: '无',
            强化等级: 0,
            伤害骰: '无',
            倍率: 0,
            主属性: '无',
            副属性: '无',
            主属性加成: 0,
            副属性加成: 0,
            装备防御: 0,
            装备闪避: 0,
            负重: 0,
            效果: {},
            描述: '无',
            数量: 1,
          };
          _.set(data.stat_data, targetPath + '.装备.' + slot, emptyEquip);

          applyAutoLevelAndDerivedStats(data.stat_data, targetPath);
          appendSystemLog(data, `${displayName} 脱下了 [${slot}] 的装备: ${eq.名称}`);

          await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
          populateCharacterData();
        }
      } catch (e2) {
        console.error(e2);
      }
    });

    /* 装备穿戴 */
    $c.on('click', '.btn-equip', async function (this: HTMLElement, e: JQuery.Event) {
      e.stopPropagation();
      const itemName = $(this).data('itemname');
      const slot = $(this).siblings('.equip-slot-select').val() as string;
      const targetPath = $(this).siblings('.equip-target-select').val() as string;
      if (!slot || !targetPath) return;

      try {
        const data = Mvu.getMvuData({ type: 'message', message_id: 'latest' });
        const bagItem = _.cloneDeep(_.get(data.stat_data, '契约者.背包.' + itemName));
        if (!bagItem) return;

        if (!isEquippableItem(bagItem)) {
          alert('【系统】[' + itemName + '] 是非装备类物品，无法穿戴！');
          return;
        }

        const oldEq = _.cloneDeep(_.get(data.stat_data, targetPath + '.装备.' + slot));

        const count = bagItem.数量 || 1;
        if (count > 1) {
          _.set(data.stat_data, '契约者.背包.' + itemName + '.数量', count - 1);
          delete bagItem.数量;
        } else {
          _.unset(data.stat_data, '契约者.背包.' + itemName);
          delete bagItem.数量;
        }

        const emptyEquip = {
          名称: '无',
          类型: '无',
          品质: '无',
          阶位: '无',
          穿戴门槛: '无',
          强化等级: 0,
          伤害骰: '无',
          倍率: 0,
          主属性: '无',
          副属性: '无',
          主属性加成: 0,
          副属性加成: 0,
          装备防御: 0,
          装备闪避: 0,
          负重: 0,
          效果: {},
          描述: '无',
          数量: 1,
        };
        const newEq = Object.assign({}, emptyEquip, bagItem);
        if (!newEq.名称 || newEq.名称 === '无') newEq.名称 = itemName;
        delete newEq.装备类型;
        if (newEq.描述_装备 !== undefined) delete newEq.描述_装备;
        _.set(data.stat_data, targetPath + '.装备.' + slot, newEq);

        if (oldEq && oldEq.名称 && oldEq.名称 !== '无') {
          const oldBagPath = '契约者.背包.' + oldEq.名称;
          const exist = _.get(data.stat_data, oldBagPath);
          if (exist) {
            oldEq.数量 = (exist.数量 || 0) + 1;
          } else {
            oldEq.数量 = 1;
          }
          _.set(data.stat_data, oldBagPath, oldEq);
        }

        applyAutoLevelAndDerivedStats(data.stat_data, targetPath);

        const displayName = targetPath === '契约者' ? '你' : targetPath.split('.').pop();
        appendSystemLog(data, `${displayName} 在 [${slot}] 槽位装备了: ${bagItem.名称}`);

        await Mvu.replaceMvuData(data, { type: 'message', message_id: 'latest' });
        populateCharacterData();
      } catch (e2) {
        console.error(e2);
      }
    });
  }

  errorCatched(init)();
  console.info('[wxhl-statusbar] 状态栏已挂载');

  /* 卸载：注销 MVU 监听与全部委托事件，清空 DOM */
  return () => {
    updateListener?.stop();
    $c.off();
    $root.empty().removeClass('wxhl-sb');
    console.info('[wxhl-statusbar] 状态栏已卸载');
  };
}
