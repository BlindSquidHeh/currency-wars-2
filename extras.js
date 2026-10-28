/* Дополнительные редакторы (часть Редактор.html): дополнения к любой записи, рамки и характеристики предметов,
   видео навыков (clips/clips.json), анимация персонажа (видео в media/ или spine), свои блоки в любом месте сайта
   и замены надписей. Блоки и замены хранятся в overrides.json -> blocks и texts, сборка (make_site.py) кладёт их на сайт. */
window.CW_EXTRAS = (function () {
'use strict';
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const $ = (s, el = document) => el.querySelector(s);
const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
let api = null; // {img, upload(key, dataUrl), rte, sec, allOf(kind), ovr(), setOvr(fn), clips(), setClips(), status, redraw, pic}

// файл как есть: видео навыков в clips/, анимации и файлы блоков в media/, spine в spine/<id>/
const safeName = n => n.normalize('NFKD').replace(/[^\w\-. ]+/g, '_').replace(/^\.+/, '') || 'file';
async function uploadFile(dir, name, file) {
  const r = await fetch(`/api/file?dir=${encodeURIComponent(dir)}&name=${encodeURIComponent(name)}`, {method:'POST', body:file});
  if (!r.ok) throw new Error(await r.text());
  return dir + '/' + name;
}
const pickFile = (accept, multiple) => new Promise(res => {
  const i = el('input'); i.type = 'file'; i.accept = accept; i.multiple = !!multiple;
  i.onchange = () => res(multiple ? [...i.files] : i.files[0]); i.click();
});
const readUrl = f => new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(f); });

// ---------- дополнения: x.notes = [{title, html, color, pic}] ----------
function notes(x, commit, keyBase) {
  const w = el('div');
  w.append(api.sec('Дополнения и заметки'));
  w.append(el('p', 'hint', 'Свои блоки текста в карточке на сайте: пояснения, советы, личные заметки. У предмета они видны и в подсказке при наведении.'));
  const box = el('div'); w.append(box);
  const draw = () => {
    box.innerHTML = '';
    (x.notes || []).forEach((n, i) => {
      const b = el('div', 'skill');
      b.innerHTML = `<div class="grid" style="margin-bottom:8px;grid-template-columns:minmax(0,1fr) 120px auto">
          <label class="f">Заголовок<input data-n="title" value="${esc(n.title || '')}" placeholder="например: Совет"></label>
          <label class="f">Цвет полосы<input data-n="color" type="color" value="${esc(n.color || '#e3c27c')}"></label>
          <div style="display:flex;gap:6px;align-items:end"><button class="btn" data-a="up" title="Выше">↑</button><button class="btn" data-a="down" title="Ниже">↓</button><button class="btn danger" data-a="del">Удалить</button></div></div>`;
      b.oninput = e => { const k = e.target.dataset.n; if (k) { n[k] = e.target.value; commit(); } };
      b.onclick = e => {
        const a = e.target.dataset.a; if (!a) return;
        if (a === 'del' && confirm('Удалить это дополнение?')) x.notes.splice(i, 1);
        if (a === 'up' && i) x.notes.splice(i - 1, 0, x.notes.splice(i, 1)[0]);
        if (a === 'down' && i < x.notes.length - 1) x.notes.splice(i + 1, 0, x.notes.splice(i, 1)[0]);
        if (!x.notes.length) delete x.notes;
        commit(); draw();
      };
      b.append(api.rte(n.html, v => { n.html = v; commit(); }, 3));
      b.append(api.pic(n.pic ? 'Картинка в дополнении' : 'Картинка (необязательно)', n.pic, `note/${keyBase}_${i}_${Date.now() % 100000}`, k => { if (k) n.pic = k; else delete n.pic; commit(); draw(); }));
      box.append(b);
    });
    const add = el('button', 'btn', '＋ Дополнение');
    add.onclick = () => { (x.notes = x.notes || []).push({title:'', html:'', color:'#e3c27c'}); commit(); draw(); };
    box.append(add);
  };
  draw();
  return w;
}

// ---------- «Где взять»: свой заголовок и текст вместо стандартного (x.whereTitle, x.where) ----------
function where(x, commit) {
  const w = el('div');
  w.append(api.sec('Где взять'));
  w.append(el('p', 'hint', 'Сейчас в поле текст с сайта: поправьте его, и он заменит стандартный. Свой текст заменяет стандартный в карточке и в подсказке; список «Выдаётся эффектами» остаётся. Общие фразы категорий (например у всей простой экипировки) меняются во вкладке «Блоки и надписи» → «Замена надписей».'));
  const g = el('div', 'grid', `<label class="f">Заголовок блока<input value="${esc(x.whereTitle || '')}" placeholder="как сейчас"></label>`);
  $('input', g).oninput = e => { if (e.target.value) x.whereTitle = e.target.value; else delete x.whereTitle; commit(); };
  w.append(g, api.rte(x.where || api.siteWhere(x), v => { if (v) x.where = v; else delete x.where; commit(); }, 3));
  return w;
}
// ---------- предмет: рамка, цвет обводки, характеристики, рецепт ----------
function itemLook(x, commit) {
  const w = el('div');
  w.append(api.sec('Рамка и обводка иконки'));
  const EQ = (window.CW_THEME && CW_THEME.EQCAT) || {}, def = (EQ[x.cat] || [])[1] || '#7f8494';
  const g = el('div', 'grid');
  g.innerHTML = `<label class="f">Цвет обводки<span class="th-c"><input type="color" value="${esc(x.ec || def)}"><button class="btn" title="Как у категории">↺</button></span></label>`;
  $('input', g).oninput = e => { x.ec = e.target.value; commit(); };
  $('button', g).onclick = () => { delete x.ec; commit(); api.redraw(); };
  w.append(g);
  w.append(api.pic(x.eqframe ? 'Своя рамка этого предмета' : 'Рамка как у категории (меняется в «Оформлении»)', x.eqframe, 'eqframe/' + x.id, k => { if (k) x.eqframe = k; else delete x.eqframe; commit(); api.redraw(); }));
  w.append(el('p', 'hint', 'Рамка — PNG с прозрачной серединой, кладётся поверх иконки. Квадрат, например 256×256.'));
  return w;
}
function itemProps(x, commit) {
  const w = el('div');
  w.append(api.sec('Характеристики и рецепт'));
  const all = api.allOf('items'), TYPES = {};
  for (const i of all) for (const p of i.props || []) TYPES[p.t] = TYPES[p.t] || p.n;
  const box = el('div'); w.append(box);
  const draw = () => {
    box.innerHTML = '';
    (x.props = x.props || []).forEach((p, i) => {
      const r = el('div', 'stgrow');
      r.style.gridTemplateColumns = 'minmax(0,1fr) minmax(0,1fr) 110px 34px';
      r.innerHTML = `<select>${Object.entries(TYPES).map(([t, n]) => `<option value="${esc(t)}"${p.t === t ? ' selected' : ''}>${esc(n)}</option>`).join('')}</select>
        <input value="${esc(p.n || '')}" placeholder="подпись"><input type="number" step="any" value="${p.v ?? ''}" placeholder="значение"><button title="Удалить">✕</button>`;
      const [s, n, v] = r.querySelectorAll('select, input');
      s.onchange = () => { p.t = s.value; p.n = TYPES[s.value]; n.value = p.n; commit(); };
      n.oninput = () => { p.n = n.value; commit(); };
      v.oninput = () => { p.v = v.value === '' ? null : +v.value; commit(); };
      $('button', r).onclick = () => { x.props.splice(i, 1); commit(); draw(); };
      box.append(r);
    });
    const add = el('button', 'btn', '＋ Характеристика');
    add.onclick = () => { const t = Object.keys(TYPES)[0] || 'ExtraAttackAddedRatio1'; x.props.push({t, n:TYPES[t] || 'Сила атаки', v:0}); commit(); draw(); };
    box.append(add);
    const opts = v => `<option value="">—</option>` + all.filter(i => i.id !== x.id && i.type === 'Equipment').sort((a, b) => a.name.localeCompare(b.name, 'ru')).map(i => `<option value="${i.id}"${+v === i.id ? ' selected' : ''}>${esc(i.name)}</option>`).join('');
    const c = el('div', 'grid');
    c.style.marginTop = '12px';
    c.innerHTML = `<label class="f">Рецепт: первый предмет<select>${opts((x.craft || [])[0])}</select></label><label class="f">Рецепт: второй предмет<select>${opts((x.craft || [])[1])}</select></label>
      <label class="f">Особое<span class="checks"><label><input type="checkbox"${x.unique ? ' checked' : ''}> уникальная</label></span></label>`;
    const [a, b] = c.querySelectorAll('select');
    const setCraft = () => { x.craft = [a.value, b.value].filter(Boolean).map(Number); commit(); };
    a.onchange = b.onchange = setCraft;
    $('input[type=checkbox]', c).onchange = e => { x.unique = e.target.checked; commit(); };
    box.append(c);
  };
  draw();
  return w;
}

// ---------- видео навыков и связей: clips/clips.json ----------
const CLIPKIND = {ult:'Сверхспособность', skill:'Навык', talent:'Талант', basic:'Обычная атака', bond:'Связь', other:'В бою'};
function clips(group, x) {
  const w = el('div');
  w.append(api.sec(group === 'roles' ? 'Видео навыков (вкладка «В бою»)' : 'Видео связи'));
  w.append(el('p', 'hint', 'MP4 или WebM. Файл сразу кладётся в папку clips, список сохраняется вместе с правками. На сайте видео появится после сборки.'));
  const C = api.clips(), key = String(x.id);
  const box = el('div'); w.append(box);
  const skills = Object.values(x.skills || {}).flat().map(s => s.name).filter(Boolean);
  const draw = () => {
    box.innerHTML = '';
    const L = (C[group] = C[group] || {})[key] || [];
    L.forEach((c, i) => {
      const b = el('div', 'skill');
      b.style.display = 'grid'; b.style.gridTemplateColumns = '200px minmax(0,1fr)'; b.style.gap = '12px';
      b.innerHTML = `<video src="clips/${esc(c.file)}" muted loop playsinline controls preload="metadata" style="width:200px;border-radius:10px;background:#000"></video>
        <div><div class="grid" style="margin-bottom:8px">
          <label class="f">Вид<select data-c="kind">${Object.entries(CLIPKIND).map(([k, t]) => `<option value="${k}"${c.kind === k ? ' selected' : ''}>${t}</option>`).join('')}</select></label>
          <label class="f">Заголовок<input data-c="title" value="${esc(c.title || '')}"></label>
          ${skills.length ? `<label class="f">Навык<select data-c="skill"><option value="">—</option>${skills.map(s => `<option${c.skill === s ? ' selected' : ''}>${esc(s)}</option>`).join('')}</select></label>` : ''}</div>
          <label class="f">Что происходит в Валютных войнах<textarea data-c="desc" rows="3">${esc(c.desc || '')}</textarea></label>
          <div style="display:flex;gap:6px;margin-top:8px"><span class="hint" style="margin:0;flex:1">${esc(c.file)}</span><button class="btn" data-a="up">↑</button><button class="btn" data-a="rep">Заменить видео…</button><button class="btn danger" data-a="del">Убрать</button></div></div>`;
      b.oninput = b.onchange = e => { const k = e.target.dataset.c; if (k) { if (e.target.value) c[k] = e.target.value; else delete c[k]; api.setClips(C); } };
      b.onclick = async e => {
        const a = e.target.dataset.a; if (!a) return;
        if (a === 'del' && confirm('Убрать видео из карточки? Файл останется в папке clips.')) { L.splice(i, 1); if (!L.length) delete C[group][key]; }
        if (a === 'up' && i) L.splice(i - 1, 0, L.splice(i, 1)[0]);
        if (a === 'rep') { const f = await pickFile('video/mp4,video/webm'); if (!f) return; const nm = `${key}_${Date.now() % 1e7}.${f.name.split('.').pop().toLowerCase()}`; api.status('Загружаю видео…', true); await uploadFile('clips', nm, f); c.file = nm; }
        api.setClips(C); draw();
      };
      box.append(b);
    });
    const add = el('button', 'btn', '＋ Загрузить видео…');
    add.onclick = async () => {
      const fs = await pickFile('video/mp4,video/webm', true); if (!fs || !fs.length) return;
      for (const f of fs) {
        const nm = `${key}_${Date.now() % 1e7}.${f.name.split('.').pop().toLowerCase()}`;
        api.status('Загружаю ' + f.name + '…', true);
        try { await uploadFile('clips', safeName(nm), f); } catch (e) { alert('Не удалось загрузить: ' + e.message); return; }
        ((C[group] = C[group] || {})[key] = C[group][key] || []).push({file:safeName(nm), kind:group === 'roles' ? 'skill' : 'bond', title:f.name.replace(/\.\w+$/, ''), desc:''});
      }
      api.setClips(C); api.status('Видео загружено — соберите сайт', true); draw();
    };
    box.append(add);
  };
  draw();
  return w;
}

// ---------- анимация персонажа: видео поверх портрета или spine ----------
function roleAnim(x, commit) {
  const w = el('div');
  w.append(api.sec('Анимация персонажа'));
  const b = el('div', 'skill');
  b.innerHTML = `<p class="hint" style="margin:0 0 10px">Видео (WebM с прозрачностью, MP4 или GIF-анимация в WebM) показывается вместо портрета: в карточке играет сразу, в сетке — при наведении. Можно загрузить и spine-анимацию из игры (.skel + .atlas + текстуры): её обрезку потом подбирают во вкладке «Анимации».</p>
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      ${x.anim ? `<video src="${esc(x.anim)}" muted loop autoplay playsinline style="width:120px;height:140px;object-fit:cover;border-radius:10px;background:#000"></video><span class="hint" style="margin:0">${esc(x.anim)}</span>` : '<span class="hint" style="margin:0">Видео не загружено.</span>'}
      <button class="btn" data-a="vid">${x.anim ? 'Заменить видео…' : 'Загрузить видео…'}</button>${x.anim ? '<button class="btn danger" data-a="vdel">Убрать видео</button>' : ''}
      <button class="btn" data-a="spine">Загрузить spine…</button></div>`;
  b.onclick = async e => {
    const a = e.target.dataset.a; if (!a) return;
    if (a === 'vid') {
      const f = await pickFile('video/webm,video/mp4'); if (!f) return;
      api.status('Загружаю видео…', true);
      const nm = safeName(`anim_${x.id}_${Date.now() % 1e7}.${f.name.split('.').pop().toLowerCase()}`);
      try { x.anim = await uploadFile('media', nm, f); } catch (er) { return alert('Не удалось загрузить: ' + er.message); }
      commit(); api.status('Видео загружено — соберите сайт', true); api.redraw();
    }
    if (a === 'vdel') { delete x.anim; commit(); api.redraw(); }
    if (a === 'spine') {
      const fs = await pickFile('.skel,.atlas,.png,.webp,.json', true); if (!fs || !fs.length) return;
      if (!fs.some(f => /\.skel$/i.test(f.name)) || !fs.some(f => /\.atlas$/i.test(f.name))) return alert('Нужны вместе: файл .skel, файл .atlas и текстуры (.png/.webp), на которые ссылается .atlas.');
      const aid = String(x.avatar || x.id);
      api.status('Загружаю spine…', true);
      for (const f of fs) await uploadFile('spine/' + aid, f.name.replace(/[^\w\-. ]+/g, '_'), f);
      const r = await fetch(`/api/spine-pack?id=${aid}&name=${encodeURIComponent(x.name)}`, {method:'POST'});
      if (!r.ok) return alert(await r.text());
      if (x.anim && confirm('Spine загружен. Убрать видео-анимацию, чтобы на сайте играл spine?')) { delete x.anim; commit(); }
      api.status('Spine загружен — подберите обрезку во вкладке «Анимации» и соберите сайт', true); api.redraw();
    }
  };
  w.append(b);
  return w;
}

// ---------- свои блоки и замены надписей ----------
const TABS = {guide:'Как играть', roles:'Персонажи', traits:'Связи', items:'Экипировка', augments:'Стратегии', buffs:'Среды', pets:'Компаньоны', misc:'Предметы', nodes:'Узлы', ranks:'Ранги', armor:'Броня', affix:'Аффиксы', opp:'Противники', npc:'НПС'};
const MODALS = {role:['Персонаж', 'roles'], trait:['Связь', 'traits'], item:['Предмет', 'items'], aug:['Стратегия', 'augments'], buff:['Среда', 'buffs'], pet:['Компаньон', null]};
function whereLabel(w) {
  const p = String(w || '').split(':'), pos = p[p.length - 1] === 'top' ? 'вверху' : 'внизу';
  if (p[0] === 'page') return 'Страница, ' + pos;
  if (p[0] === 'tab') return `Вкладка «${TABS[p[1]] || p[1]}», ${pos}`;
  if (p[0] === 'modal') return `Карточка: ${(MODALS[p[1]] || [p[1]])[0]} ${p[2] === '*' ? '(все)' : '#' + p[2]}, ${pos}`;
  return w || '—';
}
function blocksForm(F) {
  const O = api.ovr(), B = O.blocks = O.blocks || [], X = O.texts = O.texts || [];
  const custom = ((O.sections || {}).custom || []).map((c, i) => ['c' + i, c.title || 'Своя вкладка ' + (i + 1)]);
  const tabs = {...TABS, ...Object.fromEntries(custom)};
  F.innerHTML = `<div class="fhead"><div><h2>Блоки и надписи</h2><div style="color:var(--dim)">Свои блоки с любым оформлением в любом месте сайта и замена любых надписей интерфейса. Видно после «Сохранить и собрать сайт».</div></div></div>
    <h3 class="sec">Свои блоки</h3><p class="hint">Блок — это HTML: текст, картинки, видео, кнопки-ссылки, свои стили в &lt;style&gt;. Место: вся страница, любая вкладка (в том числе свои вкладки из «Базы данных») или карточка персонажа, связи, предмета, стратегии, среды, компаньона — одна или все сразу.</p>
    <div id="xbList"></div><button class="btn" id="xbAdd">＋ Новый блок</button>
    <h3 class="sec">Замена надписей</h3><p class="hint">Любая надпись шаблона сайта (заголовки, кнопки, подсказки) заменяется на вашу. Пишите текст точно как на сайте. Данные игры (описания навыков и предметов) правятся в их записях.</p>
    <div id="xtList"></div><button class="btn" id="xtAdd">＋ Замена</button>`;
  const save = () => api.setOvr(o => { o.blocks = B; o.texts = X; });
  const bl = $('#xbList', F);
  const drawB = () => {
    bl.innerHTML = '';
    B.forEach((b, i) => {
      const p = String(b.where || 'page:top').split(':');
      const card = el('div', 'skill');
      const typeSel = `<select data-w="type">${[['page', 'Вся страница'], ['tab', 'Вкладка'], ['modal', 'Карточка']].map(([k, t]) => `<option value="${k}"${p[0] === k ? ' selected' : ''}>${t}</option>`).join('')}</select>`;
      const mid = p[0] === 'tab' ? `<select data-w="tab">${Object.entries(tabs).map(([k, t]) => `<option value="${k}"${p[1] === k ? ' selected' : ''}>${esc(t)}</option>`).join('')}</select>`
        : p[0] === 'modal' ? `<select data-w="mt">${Object.entries(MODALS).map(([k, [t]]) => `<option value="${k}"${p[1] === k ? ' selected' : ''}>${t}</option>`).join('')}</select>
            <input data-w="mid" list="xbIds${i}" value="${esc(p[2] || '*')}" placeholder="* — все, или id" style="width:150px"><datalist id="xbIds${i}">${(MODALS[p[1]] || [])[1] ? api.allOf(MODALS[p[1]][1]).map(y => `<option value="${y.id}">${esc(y.name)}</option>`).join('') : ''}</datalist>` : '';
      card.innerHTML = `<div class="rwf" style="margin-bottom:8px"><b style="flex:0 0 auto">${i + 1}.</b>${typeSel}${mid}
          <select data-w="pos"><option value="top"${p[p.length - 1] === 'top' ? ' selected' : ''}>вверху</option><option value="bottom"${p[p.length - 1] !== 'top' ? ' selected' : ''}>внизу</option></select>
          <label><input type="checkbox" data-f="off"${b.off ? ' checked' : ''}> скрыт</label>
          <button class="btn" data-a="up" style="flex:0 0 auto">↑</button><button class="btn danger" data-a="del" style="flex:0 0 auto">Удалить</button></div>
        <label class="f">Заголовок (необязательно)<input data-f="title" value="${esc(b.title || '')}"></label>
        <div class="tb" style="margin-top:8px;border:1px solid var(--line);border-radius:10px 10px 0 0">
          <button data-ins="p">Абзац</button><button data-ins="card">Карточка</button><button data-ins="cols">Две колонки</button><button data-ins="btn">Кнопка-ссылка</button><button data-ins="style">Стили</button>
          <button data-ins="img">Картинка…</button><button data-ins="video">Видео…</button></div>
        <textarea data-f="html" rows="7" spellcheck="false" style="width:100%;border-radius:0 0 10px 10px;font:13px/1.5 ui-monospace,Consolas,monospace">${esc(b.html || '')}</textarea>
        <div class="hint" style="margin:8px 0 4px">Предпросмотр (стили сайта применятся после сборки):</div><div class="xb-pv" style="padding:12px;border:1px dashed var(--line2);border-radius:10px;min-height:30px;overflow:auto"></div>`;
      const ta = $('textarea', card), pv = $('.xb-pv', card);
      const showPv = () => { pv.innerHTML = (b.title ? `<h3 style="margin:0 0 8px;font-family:var(--serif)">${esc(b.title)}</h3>` : '') + (b.html || ''); };
      showPv();
      const setWhere = () => {
        const g = k => (card.querySelector(`[data-w="${k}"]`) || {}).value;
        const t = g('type'), pos = g('pos') || 'top';
        b.where = t === 'tab' ? `tab:${g('tab') || 'roles'}:${pos}` : t === 'modal' ? `modal:${g('mt') || 'role'}:${(g('mid') || '*').trim() || '*'}:${pos}` : `page:${pos}`;
        save();
      };
      card.oninput = card.onchange = e => {
        const f = e.target.dataset.f, wk = e.target.dataset.w;
        if (f === 'off') { if (e.target.checked) b.off = true; else delete b.off; save(); }
        else if (f) { b[f] = e.target.value; save(); showPv(); }
        if (wk) { setWhere(); if (e.type === 'change' && (wk === 'type' || wk === 'mt')) drawB(); }
      };
      card.onclick = async e => {
        const a = e.target.dataset.a, ins = e.target.dataset.ins;
        if (a === 'del' && confirm('Удалить блок?')) { B.splice(i, 1); save(); drawB(); return; }
        if (a === 'up' && i) { B.splice(i - 1, 0, B.splice(i, 1)[0]); save(); drawB(); return; }
        if (!ins) return;
        let snip = {p:'<p>Текст абзаца</p>\n',
          card:'<div style="border:1px solid rgba(227,194,124,.4);border-radius:14px;padding:14px 18px;background:rgba(227,194,124,.06)">\n  <b style="color:var(--gold)">Заголовок</b>\n  <p>Текст карточки</p>\n</div>\n',
          cols:'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px">\n  <div>Левая колонка</div>\n  <div>Правая колонка</div>\n</div>\n',
          btn:'<a href="#roles" style="display:inline-block;padding:8px 16px;border-radius:10px;background:var(--gold);color:#1a1206;font-weight:700;text-decoration:none">Кнопка</a>\n',
          style:'<style>\n  /* свои стили этого блока */\n  .my-block { color: #fff; }\n</style>\n'}[ins];
        if (ins === 'img' || ins === 'video') {
          const f = await pickFile(ins === 'img' ? 'image/*' : 'video/mp4,video/webm'); if (!f) return;
          api.status('Загружаю файл…', true);
          const nm = safeName(`block_${Date.now() % 1e8}_${f.name}`);
          const src = await uploadFile('media', nm, f);
          snip = ins === 'img' ? `<img src="${src}" alt="" style="max-width:100%;border-radius:12px">\n` : `<video src="${src}" autoplay muted loop playsinline style="max-width:100%;border-radius:12px"></video>\n`;
          api.status('Файл загружен', true);
        }
        const s = ta.selectionStart ?? ta.value.length;
        ta.value = ta.value.slice(0, s) + snip + ta.value.slice(s); b.html = ta.value; save(); showPv(); ta.focus();
      };
      bl.append(card);
    });
  };
  $('#xbAdd', F).onclick = () => { B.push({where:'page:top', title:'', html:'<p>Новый блок</p>'}); save(); drawB(); };
  drawB();
  const tl = $('#xtList', F);
  // подсказки: надписи интерфейса из собранного сайта (вкладки, заголовки, кнопки)
  const caps = new Set(api.siteCaptions());
  F.insertAdjacentHTML('beforeend', `<datalist id="xtCaps">${[...caps].map(c => `<option value="${esc(c)}">`).join('')}</datalist>`);
  const drawT = () => {
    tl.innerHTML = X.length ? '' : '<div class="hint">Пока нет замен.</div>';
    X.forEach((t, i) => {
      const r = el('div', 'stgrow');
      r.style.gridTemplateColumns = 'minmax(0,1fr) minmax(0,1fr) 80px 34px';
      r.innerHTML = `<input data-t="from" list="xtCaps" value="${esc(t.from || '')}" placeholder="начните печатать — подскажу надписи сайта"><input data-t="to" value="${esc(t.to || '')}" placeholder="на что заменить">
        <label class="checks" style="font-size:12px"><input type="checkbox" data-t="off"${t.off ? ' checked' : ''}> выкл.</label><button title="Удалить">✕</button>`;
      r.oninput = r.onchange = e => { const k = e.target.dataset.t; if (!k) return; if (k === 'off') { if (e.target.checked) t.off = true; else delete t.off; } else t[k] = e.target.value; save(); };
      $('button', r).onclick = () => { X.splice(i, 1); save(); drawT(); };
      tl.append(r);
    });
  };
  $('#xtAdd', F).onclick = () => { X.push({from:'', to:''}); save(); drawT(); };
  drawT();
}

return {notes, where, itemLook, itemProps, clips, roleAnim, blocksForm, whereLabel, init: a => { api = a; }};
})();
