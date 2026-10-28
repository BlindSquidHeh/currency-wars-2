// Правки как разница записей — то же, что build/patch.py (diff/merge), для онлайн-редактора и сайта.
// Онлайн-правки лежат в online.json: {edit: {kind: {id: правка}}, sections: {путь: правка}, deleted: {kind: [id]}}.
window.CW_PATCH = (() => {
  const DEL = '__del__';
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  function diff(a, b) {
    if (same(a, b)) return null;
    if (isObj(a) && isObj(b)) {
      const d = {};
      for (const k in b) { if (!(k in a)) d[k] = b[k]; else { const x = diff(a[k], b[k]); if (x !== null) d[k] = x; } }
      for (const k in a) if (!(k in b)) d[k] = DEL;
      return Object.keys(d).length ? {__d: d} : null;
    }
    if (Array.isArray(a) && Array.isArray(b) && a.length === b.length) {
      const d = {};
      a.forEach((x, i) => { const z = diff(x, b[i]); if (z !== null) d['#' + i] = z; });
      return {__l: d};
    }
    return {__v: b};
  }
  function merge(a, p) {
    if (!p) return a;
    if ('__v' in p) return p.__v;
    if ('__l' in p) {
      if (!Array.isArray(a)) return a;
      const out = a.slice();
      for (const k in p.__l) { const i = +k.slice(1); if (i < out.length) out[i] = merge(out[i], p.__l[k]); }
      return out;
    }
    if ('__d' in p) {
      const out = isObj(a) ? {...a} : {};
      for (const k in p.__d) {
        const z = p.__d[k];
        if (z === DEL) delete out[k];
        else if (isObj(z) && ('__v' in z || '__l' in z || '__d' in z)) out[k] = merge(out[k], z);
        else out[k] = z;
      }
      return out;
    }
    return a;
  }
  const secGet = (D, path) => path.split('.').reduce((o, k) => o && typeof o === 'object' ? o[k] : undefined, D);
  function secSet(D, path, v) { const ks = path.split('.'), last = ks.pop(); for (const k of ks) D = D[k] = D[k] || {}; D[last] = v; }
  // онлайн-правки поверх данных сайта (DB): записи по id, разделы по пути, удалённые
  function applyOnline(DB, O) {
    if (!O) return;
    for (const kind in O.edit || {}) {
      const L = DB[kind]; if (!Array.isArray(L)) continue;
      for (const id in O.edit[kind]) {
        const i = L.findIndex(x => String(x.id) === id);
        if (i >= 0) L[i] = merge(L[i], O.edit[kind][id]); else { const x = merge(undefined, O.edit[kind][id]); if (x) L.push(x); }
      }
    }
    for (const path in O.sections || {}) secSet(DB, path, merge(secGet(DB, path), O.sections[path]));
    if (O.styles) DB.styles = Object.assign({}, DB.styles || {}, O.styles);
    for (const kind in O.deleted || {}) if (Array.isArray(DB[kind])) { const g = new Set(O.deleted[kind].map(String)); DB[kind] = DB[kind].filter(x => !g.has(String(x.id))); }
  }
  return {diff, merge, secGet, secSet, applyOnline};
})();
