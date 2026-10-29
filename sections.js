/* Редактор разделов «Базы данных» (часть Редактор.html): броня, аффиксы, противники, химеры, НПС, компаньоны,
   Астрополис, Сварог, узлы, ресурсы, магазины Ахи. Раздел хранится в overrides.json -> sections[путь] целиком,
   сборка (make_site.py, SECTIONS) подставляет его вместо данных игры. Форма строится по самим данным:
   строки — поле или редактор текста, числа, флажки, вложенные списки с добавлением/удалением. */
window.CW_SECTIONS = (function () {
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));

const LIST = {
  'bank.armor': 'Сюжетная броня', 'bank.affix': 'Аффиксы', 'bank.opp': 'Противники', 'bank.chim': 'Химеры',
  'bank.npc': 'НПС', 'pets': 'Компаньоны', 'bank.astro': 'Астрополис (уровни)', 'bank.svarog': 'Сварог (модификации)',
  'bank.nodes.types': 'Узлы: типы', 'bank.nodes.special': 'Узлы: особые', 'bank.nodes.states': 'Узлы: состояния',
  'bank.nodes.rules': 'Узлы: правила забега', 'bank.res': 'Ресурсы забега', 'shops.aha1': 'Магазин Ахи (1)', 'shops.aha2': 'Магазин Ахи (2)',
  'ranks.tiers': 'Ранги 2 сезона', 'ranks.perm': 'Таланты: постоянные', 'ranks.season': 'Таланты 2 сезона',
  's1roles': 'Персонажи 1 сезона (сравнение)', 's1traits': 'Связи 1 сезона',
  'bank.jade': 'Чёрный рынок Яшмы', 'bank.trail': 'Магазин Освоения', 'bank.notes': 'Подписи магазинов и блоков',
  'bank.partner': 'Компаньоны (База данных)', 'oldTraits': 'Устаревшие связи 1 сезона',
  'custom': '★ Свои вкладки сайта',
};
// пустые записи для разделов, где ещё нечего копировать
const NEW = {custom: () => ({title:'Новый раздел', desc:'Описание раздела', icon:'', color:'#e3c27c', view:'cards', items:[{name:'Новая запись', en:'', icon:'', bg:'', color:'', html:'Текст'}]})};
// подписи полей; остальные показываются по имени ключа
const LABEL = {
  name:'Название', en:'Английское название', html:'Описание', desc:'Описание', get:'Что получить', why:'Откуда берётся',
  icon:'Картинка', pic:'Картинка', mons:'Враги', rank:'Ранг', weak:'Уязвимости', lv:'Уровни', n:'Уровень', team:'Отряду', own:'Владельцу',
  line:'Цитата', role:'id персонажа', motto:'Девиз', like:'Похож на', eff:'Эффекты', tea:'Чаепитие', title:'Заголовок', ru:'Текст', items:'Записи', color:'Цвет полосы (#hex)', bg:'Фон карточки', frame:'Рамка',
  cost:'Цена / стоимость', q:'Качество', mod:'Модуль', c:'Цвет (hex)', diff:'Сложность врагов +', rec:'Советуют (id персонажей)', tags:'Метки',
  t:'Тип', k:'Ключ', type:'Тип', img:'Картинка №', order:'Порядок', id:'id', path:'Путь в игре',
  abbr:'Сокращение', rules:'Правила ранга', promo:'Матч вознесения (подранги)', aff:'Аффиксов у врагов', hp:'НР врагов (×, от и до)',
  atk:'Атака врагов (×, от и до)', key:'Ключевой талант', pre:'Сначала нужны (id талантов)', iconPath:'Путь иконки в игре', tag:'Вид',
  removed:'Нет во 2 сезоне', s1:'1 сезон', skills:'Навыки', stars:'Характеристики по звёздам', ranks:'Эйдолоны', lc:'Сигнатура', traits:'Связи (id)',
  view:'Вид раздела: cards — карточки, table — таблица',
  pos:'Позиция (front/back/flex)', expert:'Консультант', layers:'Уровни связи', remarks:'Пояснения', subs:'Варианты правил', kind:'Вид связи',
};
const LONG = new Set(['html', 'desc', 'get', 'why', 'line', 'team', 'own', 'ru', 'text']);
const IMGKEY = new Set(['icon', 'pic', 'bg', 'frame']);

let api = null; // {get(path), set(path, val), base(path), img(key), upload(key, png), rte, status}

const label = (x, i) => {
  if (typeof x === 'string') return x.replace(/<[^>]+>/g, '').slice(0, 70) || '(пусто)';
  if (Array.isArray(x)) return String(x[0] ?? '').slice(0, 70);
  return x.name || x.mod || x.title || x.en || ('#' + (i + 1));
};
const iconOf = x => x && typeof x === 'object' ? (x.icon || x.pic || (x.img != null ? 'chim/' + x.img : '')) : '';

function list(path, q) {
  const L = api.get(path) || [];
  q = (q || '').toLowerCase();
  return L.map((x, i) => ({x, i})).filter(({x}) => !q || JSON.stringify(x).toLowerCase().includes(q));
}

// ---------- форма из данных ----------
function node(val, onChange, key) {
  if (Array.isArray(val)) return arr(val, onChange, key);
  if (val && typeof val === 'object') return obj(val, onChange);
  if (typeof val === 'boolean') {
    const l = document.createElement('label'); l.className = 'checks';
    l.innerHTML = '<input type="checkbox">'; const c = l.firstChild; c.checked = val; c.onchange = () => onChange(c.checked); return l;
  }
  if (typeof val === 'number') {
    const i = document.createElement('input'); i.type = 'number'; i.step = 'any'; i.value = val;
    i.oninput = () => i.value !== '' && onChange(+i.value); return i;
  }
  if (val == null) val = '';
  if (LONG.has(key) || /<|\n/.test(val) || String(val).length > 80) return api.rte(val, v => onChange(v), 3);
  const i = document.createElement('input'); i.value = val; i.oninput = () => onChange(i.value); return i;
}
function obj(o, onChange, skip) {
  const g = document.createElement('div'); g.className = 'sx-obj';
  for (const k of Object.keys(o)) {
    if (k === 'path' || (skip && skip.includes(k))) continue; // служебный путь к файлу игры
    const f = document.createElement('label'); f.className = 'f' + (typeof o[k] === 'object' || LONG.has(k) ? ' wide' : '');
    f.append(LABEL[k] || k);
    if (IMGKEY.has(k) && typeof o[k] === 'string') f.append(imgField(o[k], v => { o[k] = v; onChange(o); }));
    else f.append(node(o[k], v => { o[k] = v; onChange(o); }, k));
    g.append(f);
  }
  return g;
}
function arr(a, onChange, key) {
  const w = document.createElement('div'); w.className = 'sx-arr';
  a.forEach((v, i) => {
    const r = document.createElement('div'); r.className = 'sx-it';
    const b = document.createElement('button'); b.className = 'x'; b.type = 'button'; b.title = 'Удалить'; b.textContent = '✕';
    b.onclick = () => { a.splice(i, 1); onChange(a); api.redraw(); };
    r.append(node(v, nv => { a[i] = nv; onChange(a); }, key), b);
    w.append(r);
  });
  const add = document.createElement('button'); add.className = 'btn'; add.type = 'button'; add.textContent = '＋ Добавить';
  add.onclick = () => { a.push(a.length ? blank(a[a.length - 1]) : (key === 'items' ? {name:'', en:'', icon:'', html:''} : '')); onChange(a); api.redraw(); };
  w.append(add);
  return w;
}
// пустая запись той же формы, что и последняя
function blank(x) {
  if (Array.isArray(x)) return x.map(blank);
  if (x && typeof x === 'object') { const o = {}; for (const k in x) o[k] = k === 'id' ? Date.now() % 1e6 : blank(x[k]); return o; }
  return typeof x === 'number' ? 0 : typeof x === 'boolean' ? false : '';
}
function imgField(key, onChange) {
  const w = document.createElement('div'); w.className = 'sx-img';
  const src = api.img(key);
  w.innerHTML = `${src ? `<img src="${src}" alt="">` : '<span class="ph"></span>'}<input value="${esc(key)}" title="Ключ картинки"><button class="btn" type="button">Загрузить PNG…</button><input type="file" accept="image/*" hidden>`;
  const [ , keyIn, btn, file] = w.children;
  keyIn.oninput = () => onChange(keyIn.value);
  btn.onclick = () => file.click();
  file.onchange = () => { const f = file.files[0]; if (!f) return; const r = new FileReader();
    r.onload = async () => { const k = keyIn.value || ('custom/' + Date.now()); await api.upload(k, r.result); if (!keyIn.value) { keyIn.value = k; onChange(k); } api.redraw(); };
    r.readAsDataURL(f); };
  return w;
}

function form(path, idx, el) {
  const L = clone(api.get(path) || []);
  const x = L[idx];
  if (x === undefined) { el.innerHTML = '<div class="empty">Выберите запись слева.</div>'; return; }
  const edited = api.isEdited(path);
  el.innerHTML = `<div class="fhead"><div><h2>${esc(label(x, idx))}</h2><div style="color:var(--dim)">${esc(LIST[path])} · запись ${idx + 1} из ${L.length}${edited ? ' · раздел изменён' : ''}</div></div>
    <div class="acts">
      <button class="btn" data-a="up" title="Выше">↑</button><button class="btn" data-a="down" title="Ниже">↓</button>
      <button class="btn" data-a="dup">Копия</button>
      ${edited ? '<button class="btn" data-a="reset">Вернуть раздел как в игре</button>' : ''}
      ${path === 'custom' ? '<button class="btn" data-a="json" title="Файл .json: список записей (массив объектов). Все поля записей попадут на сайт">⬆ Записи из JSON…</button><button class="btn" data-a="fld" title="Новое поле (столбец) сразу во всех записях раздела">＋ Поле</button><button class="btn" data-a="exp">⬇ Скачать JSON</button>' : ''}
      <button class="btn danger" data-a="del">Удалить</button></div></div><div id="sxBody"></div>
    <details><summary>Запись целиком (JSON)</summary><textarea id="sxJson" spellcheck="false"></textarea>
      <div style="margin-top:8px"><button class="btn" id="sxJsonApply">Применить JSON</button></div></details>`;
  const commit = v => { L[idx] = v; api.set(path, L); el.querySelector('#sxJson').value = JSON.stringify(v, null, 1); el.querySelector('h2').textContent = label(v, idx); api.relist(); };
  el.querySelector('#sxBody').append(node(x, commit, null));
  el.querySelector('#sxJson').value = JSON.stringify(x, null, 1);
  el.querySelector('#sxJsonApply').onclick = () => { try { commit(JSON.parse(el.querySelector('#sxJson').value)); api.redraw(); } catch (e) { alert('Ошибка в JSON: ' + e.message); } };
  el.querySelector('.acts').onclick = e => {
    const a = (e.target.closest('button') || {}).dataset?.a; if (!a) return;
    if (a === 'del') { if (!confirm('Удалить запись?')) return; L.splice(idx, 1); api.set(path, L); api.select(Math.min(idx, L.length - 1)); }
    if (a === 'dup') { L.splice(idx + 1, 0, clone(x)); api.set(path, L); api.select(idx + 1); }
    if (a === 'up' && idx > 0) { [L[idx - 1], L[idx]] = [L[idx], L[idx - 1]]; api.set(path, L); api.select(idx - 1); }
    if (a === 'down' && idx < L.length - 1) { [L[idx + 1], L[idx]] = [L[idx], L[idx + 1]]; api.set(path, L); api.select(idx + 1); }
    if (a === 'reset') { if (confirm('Убрать все правки этого раздела?')) api.reset(path); }
    if (a === 'fld') { const k = (prompt('Название нового поля (например: Редкость, Цена, Где взять):') || '').trim(); if (!k) return; x.items = (x.items || []).map(it => k in it ? it : {...it, [k]: ''}); L[idx] = x; api.set(path, L); api.redraw(); }
    if (a === 'exp') { const u = URL.createObjectURL(new Blob([JSON.stringify(x.items || [], null, 1)], {type: 'application/json'})); const l = document.createElement('a'); l.href = u; l.download = (x.title || 'razdel') + '.json'; l.click(); setTimeout(() => URL.revokeObjectURL(u), 1000); }
    if (a === 'json') {
      const f = document.createElement('input'); f.type = 'file'; f.accept = '.json,application/json';
      f.onchange = async () => {
        let d; try { d = JSON.parse(await f.files[0].text()); } catch (err) { alert('Это не JSON: ' + err.message); return; }
        const rows = importRows(d); if (!rows.length) { alert('В файле не нашлось списка записей (нужен массив объектов).'); return; }
        const add = (x.items || []).length && confirm(`Найдено записей: ${rows.length}. Добавить к имеющимся (${x.items.length})? «Отмена» — заменить ими все записи раздела.`);
        x.items = add ? [...x.items, ...rows] : rows; if (!x.title || x.title === 'Новый раздел') x.title = f.files[0].name.replace(/\.json$/i, '');
        L[idx] = x; api.set(path, L); api.redraw(); api.relist();
      };
      f.click();
    }
  };
}
// JSON любого вида → записи раздела: массив, {ключ: запись} или первый массив внутри объекта
function importRows(d) {
  if (d && !Array.isArray(d) && typeof d === 'object') { const arrs = Object.values(d).filter(Array.isArray); d = arrs.length ? arrs.sort((a, b) => b.length - a.length)[0] : Object.entries(d).map(([k, v]) => v && typeof v === 'object' ? {id: k, ...v} : {name: k, value: v}); }
  if (!Array.isArray(d)) return [];
  return d.map(r => {
    if (!r || typeof r !== 'object') return {name: String(r ?? '')};
    const pick = (...ks) => { for (const k of ks) for (const kk of Object.keys(r)) if (kk.toLowerCase() === k && typeof r[kk] !== 'object') { const v = r[kk]; delete r[kk]; return v; } return ''; };
    const o = {name: String(pick('name', 'title', 'название', 'имя') || ''), en: String(pick('en', 'name_en', 'english') || ''), icon: String(pick('icon', 'image', 'img', 'картинка') || ''), html: String(pick('html', 'desc', 'description', 'text', 'описание') || '')};
    if (!o.name) { const k = Object.keys(r).find(k => typeof r[k] === 'string'); if (k) { o.name = r[k]; delete r[k]; } }
    return {...o, ...r};
  });
}
function add(path) {
  const L = clone(api.get(path) || []);
  L.push(L.length ? blank(L[L.length - 1]) : NEW[path] ? NEW[path]() : {name:'', html:''});
  api.set(path, L); return L.length - 1;
}

// fields — та же наглядная форма для любой записи (в редакторе персонажей, связей и т.д.: блок «Все поля записи»)
return {LIST, label, iconOf, list, form, add, fields: (o, onChange, skip) => obj(o, onChange, skip), init: a => { api = a; }};
})();
