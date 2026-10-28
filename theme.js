/* Оформление сайта (часть Редактор.html): цвета, карточки стратегий/сред, рамки, картинки интерфейса, свой CSS,
   а также шаблоны раскладок карточек. Хранится в overrides.json -> theme и templates; сборка кладёт theme в DB.theme. */
window.CW_THEME = (function () {
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const COLORS = {gold:['Золото (акценты)', '#e3c27c']};
// стоимости из игры: цвет и рамка; свои стоимости хранятся в theme.costs = {номер: {color}}
const COSTS = {1:'#b4b4b4', 2:'#6cce9f', 3:'#7196ff', 4:'#b48cff', 5:'#ffd471', 7:'#ff7bd5'};
const XC = {Silver:['Стратегия: серебро', '#97a2bd', '#5f6a85', '#343b50', '#eef2fb'], Gold:['Стратегия: золото', '#dcab52', '#9a6a22', '#4f330f', '#ffe6a8'],
  Prismatic:['Стратегия: призма', '#86dcff', '#9a7bff', '#552b97', '#ffd6f5'], buff:['Среда', '#7a5cf0', '#5038c8', '#33228a', '#d4ccff']};
// категории предметов: цвет обводки как в игре; рамку и цвет можно заменить для всей категории (theme.eq) или для одного предмета (в его записи)
const EQCAT = {basic:['Простая', '#7f8494'], advanced:['Продвинутая', '#cfa96a'], privilege:['Особая', '#3ad7ea'], emblem:['Эмблема', '#e2bd67'], mod:['Модуль взлома', '#ff8a5c'],
  food:['Блюдо', '#ffb36b'], trailblaze:['Товар Освоения', '#8fd0ff'], consumable:['Расходник', '#a8a1c9'], forge:['Кузница', '#ff9a5c'], material:['Материал', '#9ad19a'], trash:['Хлам', '#8a8a8a'], crown:['Корона', '#ffd471']};
const PICS = [
  ['Значки стратегий и сред', [['ux/aug_Silver', 'Серебро'], ['ux/aug_Gold', 'Золото'], ['ux/aug_Prismatic', 'Призма'], ['ux/env', 'Среда']]],
  ['Ромбы связей', [['ux/d_None', 'Бронза'], ['ux/d_Silver', 'Серебро'], ['ux/d_Gold', 'Золото'], ['ux/d_Multicolor', 'Призма'], ['ux/d_unique', 'Уникальная'], ['ux/d_black', 'Неактивная']]],
  ['Экипировка', [['ux/priv', 'Значок особой (поверх иконки)']]],
  ['Шапка и прочее', [['ui/banner', 'Баннер'], ['ui/logo', 'Логотип'], ['ux/coin', 'Монета'], ['ui/owl', 'Сова'], ['ui/aha', 'Аха']]],
  ['Иконки вкладок', ['roles', 'traits', 'items', 'augments', 'buffs', 'pets', 'misc', 'nodes', 'armor', 'affix', 'opp', 'npc'].map(k => ['ui/tab_' + k, k])],
];
let api = null; // {theme(), setTheme(t), img(k), upload(k, src), resetImg(k), templates(), setTemplates(t), redraw()}

function form(el) {
  const T = JSON.parse(JSON.stringify(api.theme() || {}));
  const commit = () => api.setTheme(T);
  T.colors = T.colors || {}; T.xc = T.xc || {};
  el.innerHTML = `<div class="fhead"><div><h2>Оформление сайта</h2><div style="color:var(--dim)">Изменения видны на сайте после «Сохранить и собрать сайт».</div></div>
    <div class="acts"><button class="btn danger" id="thReset">Сбросить оформление</button></div></div>
    <h3 class="sec">Стоимости персонажей</h3><p class="hint">Цвет и рамка карточки для каждой стоимости. Можно добавить свою стоимость (например 6 или 8) и назначить её персонажу в его записи («Стоимость для рамки»). Рамку одного персонажа — в том числе отдельно для каждой стоимости, как у Эона Ахи, — задают в записи персонажа.</p>
    <div id="thCosts" class="th-pics"></div><div style="margin-top:8px"><button class="btn" id="thCostAdd">＋ Своя стоимость</button></div>
    <h3 class="sec">Рамки предметов</h3><p class="hint">Цвет обводки и своя рамка-картинка (PNG с прозрачной серединой, кладётся поверх иконки) для всей категории. Рамку и цвет одного предмета — в записи предмета.</p><div id="thEq" class="th-pics"></div>
    <h3 class="sec">Цвета</h3><div class="th-grid" id="thColors"></div>
    <h3 class="sec">Большие карточки стратегий и сред</h3><p class="hint">Градиент из трёх цветов, цвет уголка и, если хотите, своя картинка фона вместо градиента. Фон одной конкретной карточки задаётся в самой записи.</p><div id="thXc"></div>
    <h3 class="sec">Фон страницы</h3><div id="thPage"></div>
    <h3 class="sec">Картинки интерфейса</h3><p class="hint">Загрузите PNG, чтобы заменить картинку игры; «как в игре» — вернуть исходную. Рамку одного персонажа можно задать в его записи.</p><div id="thPics"></div>
    <h3 class="sec">Шаблоны карточек</h3><p class="hint">Шаблон — сохранённая раскладка из конструктора карточек. Сохранять и применять их можно в записи стратегии или среды.</p><div id="thTpl"></div>
    <h3 class="sec">Свой CSS (для опытных)</h3><textarea id="thCss" rows="6" spellcheck="false" style="width:100%;font:13px/1.5 ui-monospace,Consolas,monospace"></textarea>`;
  el.querySelector('#thColors').innerHTML = Object.entries(COLORS).map(([k, [t, d]]) => `<label class="f">${t}<span class="th-c"><input type="color" data-c="${k}" value="${T.colors[k] || d}"><button class="btn" data-cr="${k}" title="Как в игре">↺</button></span></label>`).join('');
  el.querySelector('#thColors').oninput = e => { const k = e.target.dataset.c; if (k) { T.colors[k] = e.target.value; commit(); } };
  el.querySelector('#thColors').onclick = e => { const k = e.target.dataset.cr; if (k) { delete T.colors[k]; commit(); api.redraw(); } };
  T.costs = T.costs || {};
  const CW = el.querySelector('#thCosts');
  const costRow = (k, def, own) => {
    const col = own ? (T.costs[k].color || '#ffffff') : (T.colors['c' + k] || def);
    const p = pic('Стоимость ' + k + (k == 7 ? ' (особая)' : ''), 'ux/cost' + k, 'ux/cost' + k, null, true);
    const b = p.querySelector('.th-b');
    b.insertAdjacentHTML('afterbegin', `<input type="color" value="${col}" title="Цвет стоимости" style="width:40px;height:30px;padding:0;border:1px solid var(--line2);border-radius:8px;background:none">`);
    if (own) b.insertAdjacentHTML('beforeend', '<button class="btn danger" data-a="cdel">✕</button>');
    b.firstChild.oninput = e => { if (own) T.costs[k].color = e.target.value; else T.colors['c' + k] = e.target.value; commit(); };
    p.addEventListener('click', e => { if (e.target.dataset.a === 'cdel' && confirm('Удалить стоимость ' + k + '?')) { delete T.costs[k]; commit(); api.redraw(); } });
    CW.append(p);
  };
  for (const [k, d] of Object.entries(COSTS)) costRow(k, d, false);
  for (const k of Object.keys(T.costs)) costRow(k, '', true);
  el.querySelector('#thCostAdd').onclick = () => {
    const k = (prompt('Номер новой стоимости (например 6 или 8):') || '').trim();
    if (!/^\d{1,2}$/.test(k)) return;
    if (COSTS[k] || T.costs[k]) return alert('Такая стоимость уже есть');
    T.costs[k] = {color:'#ff9a5c'}; commit(); api.redraw();
  };
  T.eq = T.eq || {};
  const EW = el.querySelector('#thEq');
  for (const [cat, [t, d]] of Object.entries(EQCAT)) {
    const o = T.eq[cat] || {};
    const p = pic(t, o.frame, 'theme/eq_' + cat, k => { T.eq[cat] = T.eq[cat] || {}; if (k) T.eq[cat].frame = k; else delete T.eq[cat].frame; if (!Object.keys(T.eq[cat]).length) delete T.eq[cat]; commit(); });
    const b = p.querySelector('.th-b');
    b.insertAdjacentHTML('afterbegin', `<input type="color" value="${o.color || d}" title="Цвет обводки" style="width:40px;height:30px;padding:0;border:1px solid var(--line2);border-radius:8px;background:none">${o.color ? '<button class="btn" data-a="ecr" title="Цвет как в игре">↺</button>' : ''}`);
    b.firstChild.oninput = e => { T.eq[cat] = T.eq[cat] || {}; T.eq[cat].color = e.target.value; commit(); };
    p.addEventListener('click', e => { if (e.target.dataset.a === 'ecr') { delete (T.eq[cat] || {}).color; commit(); api.redraw(); } });
    EW.append(p);
  }
  const xc = el.querySelector('#thXc');
  for (const [q, [t, ...d]] of Object.entries(XC)) {
    const o = T.xc[q] = T.xc[q] || {};
    const row = document.createElement('div'); row.className = 'th-xc';
    row.innerHTML = `<b>${t}</b>${['x1', 'x2', 'x3', 'xb'].map((k, i) => `<label title="${['верх', 'середина', 'низ', 'уголок'][i]}"><input type="color" data-k="${k}" value="${o[k] || d[i]}"></label>`).join('')}
      <span class="th-prev" style="background:linear-gradient(180deg,${o.x1 || d[0]},${o.x2 || d[1]} 42%,${o.x3 || d[2]})"></span>`;
    row.oninput = e => { const k = e.target.dataset.k; if (k) { o[k] = e.target.value; commit(); row.querySelector('.th-prev').style.background = `linear-gradient(180deg,${o.x1 || d[0]},${o.x2 || d[1]} 42%,${o.x3 || d[2]})`; } };
    row.append(pic('Фон картинкой', o.bg, 'theme/xc_' + q, k => { if (k) o.bg = k; else delete o.bg; commit(); }));
    xc.append(row);
  }
  el.querySelector('#thPage').append(pic('Картинка фона', T.pageBg, 'theme/page', k => { if (k) T.pageBg = k; else delete T.pageBg; commit(); }));
  const P = el.querySelector('#thPics');
  for (const [title, keys] of PICS) {
    const g = document.createElement('div'); g.innerHTML = `<div class="hint" style="margin:10px 0 6px;font-weight:700">${title}</div>`;
    const w = document.createElement('div'); w.className = 'th-pics'; g.append(w);
    for (const [k, t] of keys) w.append(pic(t, k, k, null, true));
    P.append(g);
  }
  const tpl = api.templates(), tw = el.querySelector('#thTpl');
  tw.innerHTML = Object.keys(tpl).length ? Object.entries(tpl).map(([n, l]) => `<div class="th-tpl"><b>${esc(n)}</b><small>${(l.items || []).length} элементов</small><button class="btn" data-ren="${esc(n)}">Переименовать</button><button class="btn danger" data-del="${esc(n)}">Удалить</button></div>`).join('') : '<div class="hint">Пока нет шаблонов.</div>';
  tw.onclick = e => {
    const T2 = api.templates(), d = e.target.dataset;
    if (d.del && confirm('Удалить шаблон «' + d.del + '»?')) { delete T2[d.del]; api.setTemplates(T2); api.redraw(); }
    if (d.ren) { const n = prompt('Новое название:', d.ren); if (n && n !== d.ren) { T2[n] = T2[d.ren]; delete T2[d.ren]; api.setTemplates(T2); api.redraw(); } }
  };
  const css = el.querySelector('#thCss'); css.value = T.css || ''; css.oninput = () => { T.css = css.value; commit(); };
  el.querySelector('#thReset').onclick = () => { if (confirm('Убрать все цвета, фоны и свой CSS? Загруженные картинки останутся — их сбрасывают кнопками «как в игре».')) { api.setTheme({}); api.redraw(); } };
}
// поле картинки: fixedKey — заменяем картинку игры с этим ключом; иначе загружаем под defKey и сообщаем ключ через onKey
function pic(title, cur, defKey, onKey, fixed) {
  const w = document.createElement('div'); w.className = 'th-pic';
  const key = fixed ? defKey : cur;
  const src = key ? api.img(key) : '';
  w.innerHTML = `${src ? `<img src="${src}" alt="">` : '<span class="ph"></span>'}<div><small>${esc(title)}</small><div class="th-b"><button class="btn" data-a="up">Загрузить…</button>${fixed || cur ? '<button class="btn" data-a="rs">' + (fixed ? 'как в игре' : 'убрать') + '</button>' : ''}</div></div><input type="file" accept="image/*" hidden>`;
  const file = w.querySelector('input');
  w.onclick = async e => {
    const a = e.target.dataset.a;
    if (a === 'up') file.click();
    if (a === 'rs') { if (fixed) { await api.resetImg(defKey); } else onKey(null); api.redraw(); }
  };
  file.onchange = () => { const f = file.files[0]; if (!f) return; const r = new FileReader();
    r.onload = async () => { await api.upload(defKey, r.result); if (!fixed) onKey(defKey); api.redraw(); };
    r.readAsDataURL(f); };
  return w;
}
// все стоимости: из игры и свои
const costs = () => [...Object.keys(COSTS), ...Object.keys((api.theme() || {}).costs || {})];
return {form, pic, costs, EQCAT, init: a => { api = a; }};
})();
