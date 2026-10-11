// 假 D1：只实现 wxhl-cygf worker 用到的 SQL 子集（CREATE/INSERT/SELECT/UPDATE/DELETE/COUNT）
// 纪律（沿袭 wxhl-market/fake-d1.mjs）：
// - 认不出的 SQL / WHERE 一律抛错，不静默放过——worker 改了 SQL 而假件装没看见，测试会假绿
// - run() 的变更行数在 result.meta.changes，不是顶层 changes（真 D1 的形状）
// - LIKE 按 SQLite 语义：支持 % 与 _ 通配 + ESCAPE '\'

export function makeFakeD1() {
  const packs = new Map(); // id → row

  const oneLine = sql => sql.replace(/\s+/g, ' ').trim();

  function likeMatch(value, pattern) {
    // 把 LIKE 模式（ESCAPE '\'）转正则：% → .*，_ → .，\x → 字面 x
    let re = '';
    for (let i = 0; i < pattern.length; i++) {
      const ch = pattern[i];
      if (ch === '\\') {
        re += pattern[i + 1].replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        i++;
      } else if (ch === '%') re += '.*';
      else if (ch === '_') re += '.';
      else re += ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }
    // 's' = dotAll；'i' = ASCII 大小写不敏感（真 SQLite/D1 的 LIKE 默认如此）
    return new RegExp(`^${re}$`, 'si').test(String(value ?? ''));
  }

  /** packs 表真实存在的列；WHERE 引用白名单外的列名 = 真 SQLite 的 no such column，抛错。 */
  const PACK_COLUMNS = new Set([
    'id', 'name', 'type', 'version', 'author_name', 'author_discord', 'tags_json', 'description',
    'pack_json', 'manage_hash', 'status', 'downloads', 'entry_count', 'created', 'updated',
  ]);

  /** 校验列名在白名单内（真 SQLite 对未知列报 no such column），返回该列名。 */
  function columnOf(name) {
    if (!PACK_COLUMNS.has(name)) throw new Error(`fakeD1: 未知列「${name}」（真 SQLite 会报 no such column）`);
    return name;
  }

  /** 求值我们 worker 会产生的 WHERE 片段（空白已归一）。认不出就抛错。 */
  function evalWhere(row, whereSql, args) {
    let i = 0;
    const parts = [];
    let depth = 0;
    let buf = '';
    for (const ch of whereSql) {
      if (ch === '(') depth++;
      if (ch === ')') depth--;
      if (depth === 0 && / /.test(ch) && /\s+AND\s+$/i.test(buf + ch)) {
        parts.push(buf.replace(/\s+AND$/i, ''));
        buf = '';
        continue;
      }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());

    return parts.every(part => {
      part = part.trim();
      let m;
      if ((m = part.match(/^(\w+) = '([^']*)'$/))) return row[columnOf(m[1])] === m[2];
      if ((m = part.match(/^(\w+) = \?$/))) return row[columnOf(m[1])] === args[i++];
      if ((m = part.match(/^(\w+) LIKE \? ESCAPE '\\'$/))) return likeMatch(row[columnOf(m[1])], args[i++]);
      if (part.startsWith('(') && part.endsWith(')')) {
        const inner = part.slice(1, -1);
        const conds = inner.split(/\s+OR\s+/i);
        // 参数指针 i 是位置式的：先无条件消费本组全部实参再判断，不能用 .some 的提前退出
        //（否则命中首个条件会少消费参数，后续子句如 tag 会读到错位的实参）。
        const checks = conds.map(cond => {
          const mm = cond.trim().match(/^(\w+) LIKE \? ESCAPE '\\'$/);
          if (!mm) throw new Error(`fakeD1 不认识这个 OR 条件: 「${cond.trim()}」`);
          return { col: columnOf(mm[1]), pattern: args[i++] };
        });
        return checks.some(({ col, pattern }) => likeMatch(row[col], pattern));
      }
      throw new Error(`fakeD1 不认识这个 WHERE 条件: 「${part}」`);
    });
  }

  function selectRows(whereSql, args) {
    // 先用空行校验一遍 WHERE（列白名单/形态）：真 SQLite 对未知列在解析期即报错，与行数无关，
    // 空表时 filter 不会调用 evalWhere，若不预校验就会静默放过。
    evalWhere({}, whereSql, args);
    return [...packs.values()].filter(row => evalWhere(row, whereSql, args));
  }

  return {
    prepare(sql) {
      const flat = oneLine(sql);
      return {
        bind(...args) {
          return {
            async run() {
              if (/^CREATE (TABLE|INDEX)/i.test(flat)) return { success: true, meta: { changes: 0 } };

              let m;
              if ((m = flat.match(/^INSERT INTO packs \([^)]*\) VALUES \(([^)]*)\)$/i))) {
                const [id, name, type, version, author_name, author_discord, tags_json, description, pack_json, manage_hash, entry_count, created, updated] = args;
                if (packs.has(id)) throw new Error(`UNIQUE constraint failed: packs.id`);
                packs.set(id, {
                  id, name, type, version, author_name, author_discord, tags_json, description, pack_json, manage_hash,
                  status: 'published', downloads: 0, entry_count, created, updated,
                });
                return { success: true, meta: { changes: 1 } };
              }

              if ((m = flat.match(/^UPDATE packs SET downloads = downloads \+ 1 WHERE id = \?$/i))) {
                const row = packs.get(args[0]);
                if (row) row.downloads += 1;
                return { success: true, meta: { changes: row ? 1 : 0 } };
              }

              if ((m = flat.match(/^UPDATE packs SET name = \?, type = \?, version = \?, author_name = \?, author_discord = \?, tags_json = \?, description = \?, pack_json = \?, entry_count = \?, updated = \? WHERE id = \? AND manage_hash = \?$/i))) {
                const [name, type, version, author_name, author_discord, tags_json, description, pack_json, entry_count, updated, id, manage_hash] = args;
                const row = packs.get(id);
                if (!row || row.manage_hash !== manage_hash) return { success: true, meta: { changes: 0 } };
                packs.set(id, { ...row, name, type, version, author_name, author_discord, tags_json, description, pack_json, entry_count, updated });
                return { success: true, meta: { changes: 1 } };
              }

              if ((m = flat.match(/^DELETE FROM packs WHERE id = \? AND manage_hash = \?$/i))) {
                const row = packs.get(args[0]);
                if (!row || row.manage_hash !== args[1]) return { success: true, meta: { changes: 0 } };
                packs.delete(args[0]);
                return { success: true, meta: { changes: 1 } };
              }

              if ((m = flat.match(/^DELETE FROM packs WHERE id = \?$/i))) {
                const existed = packs.delete(args[0]);
                return { success: true, meta: { changes: existed ? 1 : 0 } };
              }

              if ((m = flat.match(/^UPDATE packs SET manage_hash = \?, updated = \? WHERE id = \?$/i))) {
                const row = packs.get(args[2]);
                if (!row) return { success: true, meta: { changes: 0 } };
                packs.set(args[2], { ...row, manage_hash: args[0], updated: args[1] });
                return { success: true, meta: { changes: 1 } };
              }

              throw new Error(`fakeD1 不认识这条 SQL（run）: 「${flat}」`);
            },
            async first() {
              let m;
              if (flat.match(/^SELECT \* FROM packs WHERE id = \?$/i)) {
                return packs.get(args[0]) ?? null;
              }
              if ((m = flat.match(/^SELECT COUNT\(\*\) AS total FROM packs WHERE (.+)$/i))) {
                return { total: selectRows(m[1], args).length };
              }
              throw new Error(`fakeD1 不认识这条 SQL（first）: 「${flat}」`);
            },
            async all() {
              let m;
              if ((m = flat.match(/^SELECT [\w, ]+ FROM packs WHERE (.+?) (ORDER BY (updated|downloads) DESC) LIMIT \? OFFSET \?$/i))) {
                const whereArgs = args.slice(0, -2);
                const [limit, offset] = args.slice(-2);
                const rows = selectRows(m[1], whereArgs);
                const key = m[3];
                rows.sort((a, b) => (b[key] > a[key] ? 1 : b[key] < a[key] ? -1 : 0));
                const picked = rows.slice(offset, offset + limit).map(row => {
                  // SELECT 列表只含元数据列；照真 D1 只回这些列
                  const { id, name, type, version, author_name, tags_json, description, downloads, entry_count, updated } = row;
                  return { id, name, type, version, author_name, tags_json, description, downloads, entry_count, updated };
                });
                return { results: picked };
              }
              throw new Error(`fakeD1 不认识这条 SQL（all）: 「${flat}」`);
            },
          };
        },
        // 不带参数的调用（ensureSchema 的 CREATE）
        async run() {
          if (/^CREATE (TABLE|INDEX)/i.test(flat)) return { success: true, meta: { changes: 0 } };
          throw new Error(`fakeD1 不认识这条 SQL（无 bind run）: 「${flat}」`);
        },
      };
    },
  };
}
