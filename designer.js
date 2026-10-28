/* Конструктор карточек стратегий и сред (часть Редактор.html).
   Карточка рисуется настоящим кодом сайта во встроенном окне, а конструктор поверх неё двигает элементы.
   Результат — x.layout = {ar, bg, items:[{t, x, y, w, h, r, o, ...}]}: координаты в % карточки, шрифт в % ширины. */
(function () {
'use strict';
const $ = (s, el = document) => el.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const round = v => Math.round(v * 100) / 100;

const TYPES = {
  text:'Текст', title:'Название', en:'Англ. название', desc:'Описание', tags:'Метки', icon:'Иконка карточки',
  img:'Фото', box:'Подложка', rw:'Награда', stage:'Плашка',
};
const ADD = [
  ['text', 'Текст'], ['img', 'Фото…'], ['rw', 'Награда'], ['stage', 'Плашка'], ['box', 'Подложка'],
  ['title', 'Название'], ['desc', 'Описание'], ['icon', 'Иконка'], ['tags', 'Метки'], ['en', 'Англ. название'],
];
const CSS = `
#dz-wrap{position:fixed;inset:0;z-index:500;background:#07051a;display:grid;grid-template-rows:auto minmax(0,1fr);font:13.5px/1.45 var(--font);color:var(--text)}
#dz-top{display:flex;align-items:center;gap:8px;padding:9px 14px;border-bottom:1px solid var(--line);background:#100c26;flex-wrap:wrap}
#dz-top h2{margin:0 auto 0 0;font:700 17px var(--serif);color:var(--gold)}
#dz-main{display:grid;grid-template-columns:250px minmax(0,1fr) 320px;min-height:0}
#dz-left,#dz-right{overflow:auto;padding:12px;border-right:1px solid var(--line);min-height:0}
#dz-right{border-right:0;border-left:1px solid var(--line)}
#dz-stage{position:relative;min-height:0;background:repeating-conic-gradient(#120e2a 0 25%,#0d0a20 0 50%) 0 0/24px 24px}
#dz-stage iframe{position:absolute;inset:0;width:100%;height:100%;border:0}
.dz-h{margin:14px 0 8px;font:800 11px var(--font);letter-spacing:.14em;text-transform:uppercase;color:var(--gold)}
.dz-h:first-child{margin-top:0}
.dz-add{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.dz-add button,.dz-btn{padding:7px 8px;border-radius:9px;border:1px solid var(--line2);background:var(--panel2);font-weight:700;font-size:12.5px}
.dz-add button:hover,.dz-btn:hover{border-color:var(--gold2)}
.dz-btn.main{background:linear-gradient(180deg,#f2d79b,#d2aa5f);color:#1a1206;border-color:var(--gold)}
.dz-btn:disabled{opacity:.4}
.dz-layer{display:flex;align-items:center;gap:6px;padding:5px 7px;border-radius:8px;cursor:pointer;border:1px solid transparent}
.dz-layer:hover{background:var(--panel)}.dz-layer.on{background:var(--panel3);border-color:var(--line2)}
.dz-layer span{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.dz-layer small{color:var(--dim)}
.dz-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}
.dz-f{display:flex;flex-direction:column;gap:4px;font-size:11.5px;font-weight:700;color:var(--muted)}
.dz-f input,.dz-f select,.dz-f textarea{background:var(--panel);border:1px solid var(--line2);border-radius:8px;padding:6px 8px;outline:none;color:var(--text);font-weight:500;min-width:0;width:100%}
.dz-f textarea{min-height:110px;resize:vertical;font:12.5px/1.45 ui-monospace,Consolas,monospace}
.dz-f input[type=color]{padding:2px;height:32px}
.dz-f input[type=range]{padding:0}
.dz-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:8px}
.dz-tb{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:4px}
.dz-tb button{padding:2px 8px;border-radius:7px;border:1px solid var(--line);background:var(--panel2);font-size:11.5px;font-weight:700}
.dz-note{color:var(--dim);font-size:12px;margin:6px 0}
`;
// стили внутри окна сайта: только карточка, рамки выделения
const IN_CSS = `
body{overflow:hidden !important}
.nav,.hero,main,footer,.totop{visibility:hidden}
.modal{padding:20px !important;align-items:center !important;background:transparent !important;backdrop-filter:none !important}
.mbar{display:none !important}
.mbox{width:auto !important;background:none !important;border:0 !important;box-shadow:0 30px 80px rgba(0,0,0,.6) !important;overflow:visible !important;animation:none !important}
.mbox::before{display:none !important}
.xc-free{width:calc((100vh - 40px) * var(--ar,.712));max-width:calc(100vw - 40px)}
.xc-free .fe{cursor:move}
#dz-sel{position:absolute;pointer-events:none;border:1.5px solid #ffd471;box-shadow:0 0 0 1px rgba(0,0,0,.5);z-index:9999}
#dz-sel i{position:absolute;width:12px;height:12px;background:#ffd471;border:1.5px solid #1a1206;border-radius:3px;pointer-events:auto}
#dz-sel i.rot{border-radius:50%;left:calc(50% - 6px);top:-30px;cursor:grab}
#dz-sel i.rot::after{content:"";position:absolute;left:4px;top:11px;width:1.5px;height:18px;background:#ffd471}
.dz-guide{position:absolute;background:#ff6bd5;z-index:9998;pointer-events:none}
.xc-free .fe.dz-hover{outline:1px dashed rgba(255,212,113,.6)}
`;
const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HPOS = {nw:[0, 0], n:[.5, 0], ne:[1, 0], e:[1, .5], se:[1, 1], s:[.5, 1], sw:[0, 1], w:[0, .5]};

let H = null; // хост: {kind, obj, site, onDone, img, upload, rwFields}
let L = null, sel = -1, hist = [], fut = [], win = null, doc = null;

window.CWDesigner = {open};

function open(host) {
  H = host;
  L = clone(host.obj.layout && host.obj.layout.items ? host.obj.layout : host.site.CW_API.layoutFrom(host.kind, clone(host.obj)));
  sel = -1; hist = []; fut = [];
  if (!$('#dz-style')) { const st = document.createElement('style'); st.id = 'dz-style'; st.textContent = CSS; document.head.append(st); }
  const w = document.createElement('div'); w.id = 'dz-wrap';
  w.innerHTML = `<div id="dz-top"><h2>Конструктор карточки · ${esc(host.obj.name)}</h2>
      <button class="dz-btn" id="dz-undo" title="Ctrl+Z">↶ Отменить</button><button class="dz-btn" id="dz-redo" title="Ctrl+Y">↷ Вернуть</button>
      <button class="dz-btn" id="dz-reset" title="Собрать заново из обычной карточки">Сбросить раскладку</button>
      <button class="dz-btn" id="dz-cancel">Закрыть без изменений</button><button class="dz-btn main" id="dz-ok">Готово</button></div>
    <div id="dz-main">
      <div id="dz-left"><div class="dz-h">Добавить</div><div class="dz-add">${ADD.map(([t, n]) => `<button data-add="${t}">${n}</button>`).join('')}</div>
        <div class="dz-note">Фото можно просто перетащить на карточку.</div>
        <div class="dz-h">Слои (верхний — поверх всех)</div><div id="dz-layers"></div></div>
      <div id="dz-stage"><iframe id="dz-frame" title="карточка"></iframe></div>
      <div id="dz-right"></div>
    </div>
    <input type="file" id="dz-file" accept="image/*" hidden>`;
  document.body.append(w);
  const f = $('#dz-frame');
  f.onload = async () => {
    try { await f.contentWindow.CW_READY; } catch (e) {}
    win = f.contentWindow; doc = f.contentDocument;
    const st = doc.createElement('style'); st.textContent = IN_CSS; doc.head.append(st);
    for (const [k, v] of Object.entries(host.newImg || {})) win.CW_API.setImg(k, v);
    bindStage(); render();
  };
  f.src = 'index.html?designer=' + Date.now() + '#buffs';
  $('#dz-ok').onclick = () => { close(); H.onDone(clone(L)); };
  $('#dz-cancel').onclick = () => { if (!hist.length || confirm('Закрыть без сохранения изменений?')) close(); };
  $('#dz-undo').onclick = undo; $('#dz-redo').onclick = redo;
  $('#dz-reset').onclick = () => { if (!confirm('Собрать раскладку заново из обычной карточки? Ваши элементы пропадут.')) return; push(); L = clone(win.CW_API.layoutFrom(H.kind, cardObj())); sel = -1; render(); };
  $('#dz-left').onclick = e => { const b = e.target.closest('[data-add]'); if (b) add(b.dataset.add); };
  $('#dz-layers').onclick = e => {
    const o = e.target.closest('[data-op]'); const ly = e.target.closest('.dz-layer'); if (!ly) return;
    const i = +ly.dataset.i;
    if (o) return layerOp(i, o.dataset.op);
    select(i);
  };
  $('#dz-file').onchange = () => { const fl = $('#dz-file').files[0]; if (fl) addPhoto(fl); $('#dz-file').value = ''; };
  document.addEventListener('keydown', onKey);
  drawLayers(); drawProps();
}
function close() { document.removeEventListener('keydown', onKey); $('#dz-wrap').remove(); win = doc = null; }

// ---------- история ----------
function push() { hist.push(JSON.stringify(L)); if (hist.length > 100) hist.shift(); fut = []; btns(); }
function undo() { if (!hist.length) return; fut.push(JSON.stringify(L)); L = JSON.parse(hist.pop()); if (sel >= L.items.length) sel = -1; render(); btns(); }
function redo() { if (!fut.length) return; hist.push(JSON.stringify(L)); L = JSON.parse(fut.pop()); render(); btns(); }
function btns() { if ($('#dz-undo')) { $('#dz-undo').disabled = !hist.length; $('#dz-redo').disabled = !fut.length; } }

// ---------- отрисовка карточки (код сайта) ----------
const cardObj = () => { const o = clone(H.obj); delete o.layout; return o; };
function render() {
  if (!win) return;
  const o = clone(H.obj); o.layout = L;
  win.CW_API.preview(H.kind, o);
  const xc = doc.querySelector('.xc-free');
  if (xc) xc.style.setProperty('--ar', L.ar || .712);
  drawLayers(); drawProps(); drawSel(); btns();
}
// быстрое обновление одного элемента без перерисовки всей карточки (при перетаскивании)
function applyBox(i) {
  const e = L.items[i], el = doc.querySelector(`.xc-free [data-el="${i}"]`); if (!el) return;
  Object.assign(el.style, {left:e.x + '%', top:e.y + '%', width:e.w + '%', height:e.h + '%', transform:e.r ? `rotate(${e.r}deg)` : ''});
}
function card() { return doc && doc.querySelector('.xc-free'); }
function drawSel() {
  if (!doc) return;
  doc.querySelectorAll('.dz-guide').forEach(g => g.remove());
  let s = doc.getElementById('dz-sel');
  const xc = card();
  if (sel < 0 || !xc || !L.items[sel]) { if (s) s.remove(); return; }
  if (!s) { s = doc.createElement('div'); s.id = 'dz-sel'; s.innerHTML = HANDLES.map(h => `<i data-h="${h}"></i>`).join('') + '<i class="rot" data-h="rot"></i>'; }
  const box = xc.parentNode; box.style.position = 'relative'; box.append(s);
  const e = L.items[sel], W = xc.offsetWidth, Hh = xc.offsetHeight;
  Object.assign(s.style, {left:xc.offsetLeft + e.x / 100 * W + 'px', top:xc.offsetTop + e.y / 100 * Hh + 'px', width:e.w / 100 * W + 'px', height:e.h / 100 * Hh + 'px', transform:e.r ? `rotate(${e.r}deg)` : ''});
  s.querySelectorAll('i[data-h]').forEach(h => { const p = HPOS[h.dataset.h]; if (!p) return; Object.assign(h.style, {left:`calc(${p[0] * 100}% - 6px)`, top:`calc(${p[1] * 100}% - 6px)`, cursor:h.dataset.h + '-resize'}); });
}
function guide(vert, pct) {
  const xc = card(); if (!xc) return;
  const g = doc.createElement('div'); g.className = 'dz-guide';
  const W = xc.offsetWidth, Hh = xc.offsetHeight;
  Object.assign(g.style, vert ? {left:xc.offsetLeft + pct / 100 * W + 'px', top:xc.offsetTop + 'px', width:'1px', height:Hh + 'px'} : {left:xc.offsetLeft + 'px', top:xc.offsetTop + pct / 100 * Hh + 'px', width:W + 'px', height:'1px'});
  xc.parentNode.append(g);
}

// ---------- мышь на карточке ----------
function bindStage() {
  let drag = null;
  doc.addEventListener('pointerdown', ev => {
    const h = ev.target.closest('#dz-sel i'), fe = ev.target.closest('.xc-free .fe');
    const xc = card(); if (!xc) return;
    if (!h && !fe) { if (ev.target.closest('.xc-free') || !ev.target.closest('.mbox')) { select(-1); } return; }
    ev.preventDefault();
    if (fe && !h) select(+fe.dataset.el);
    const e = L.items[sel]; if (!e) return;
    push();
    drag = {mode:h ? h.dataset.h : 'move', sx:ev.clientX, sy:ev.clientY, o:{...e}, W:xc.offsetWidth, H:xc.offsetHeight, rect:xc.getBoundingClientRect()};
    doc.documentElement.setPointerCapture && ev.target.setPointerCapture(ev.pointerId);
  });
  doc.addEventListener('pointermove', ev => {
    doc.querySelectorAll('.dz-hover').forEach(x => x.classList.remove('dz-hover'));
    const fe = ev.target.closest && ev.target.closest('.xc-free .fe'); if (fe && !drag) fe.classList.add('dz-hover');
    if (!drag) return;
    const e = L.items[sel], o = drag.o, dx = (ev.clientX - drag.sx) / drag.W * 100, dy = (ev.clientY - drag.sy) / drag.H * 100;
    doc.querySelectorAll('.dz-guide').forEach(g => g.remove());
    if (drag.mode === 'move') {
      e.x = o.x + dx; e.y = o.y + dy;
      if (!ev.altKey) snapMove(e);
    } else if (drag.mode === 'rot') {
      const r = drag.rect, cx = r.left + (e.x + e.w / 2) / 100 * r.width, cy = r.top + (e.y + e.h / 2) / 100 * r.height;
      let a = Math.atan2(ev.clientY - cy, ev.clientX - cx) * 180 / Math.PI + 90;
      if (ev.shiftKey) a = Math.round(a / 15) * 15; else if (Math.abs(((a + 540) % 360) - 180) < 3) a = 0;
      e.r = round(((a + 540) % 360) - 180);
    } else {
      const m = drag.mode; let {x, y, w, h} = o;
      if (m.includes('e')) w = o.w + dx;
      if (m.includes('s')) h = o.h + dy;
      if (m.includes('w')) { w = o.w - dx; x = o.x + dx; }
      if (m.includes('n')) { h = o.h - dy; y = o.y + dy; }
      if (ev.shiftKey && m.length === 2) { const k = o.h / o.w; h = w * k * drag.W / drag.H * (drag.H / drag.W); if (m.includes('n')) y = o.y + o.h - h; }
      e.w = Math.max(1, w); e.h = Math.max(1, h); e.x = x; e.y = y;
    }
    e.x = round(e.x); e.y = round(e.y); e.w = round(e.w); e.h = round(e.h);
    applyBox(sel); drawSel(); drawProps(true);
  });
  const up = () => { if (drag) { drag = null; doc.querySelectorAll('.dz-guide').forEach(g => g.remove()); drawProps(); } };
  doc.addEventListener('pointerup', up); doc.addEventListener('pointercancel', up);
  // перетаскивание файла фото прямо на карточку
  doc.addEventListener('dragover', ev => ev.preventDefault());
  doc.addEventListener('drop', ev => {
    ev.preventDefault();
    const fl = ev.dataTransfer.files[0]; if (!fl || !/^image\//.test(fl.type)) return;
    const r = card().getBoundingClientRect();
    addPhoto(fl, (ev.clientX - r.left) / r.width * 100, (ev.clientY - r.top) / r.height * 100);
  });
  doc.addEventListener('dblclick', ev => { const fe = ev.target.closest('.xc-free .fe'); if (fe) { select(+fe.dataset.el); const t = $('#dz-right textarea'); if (t) t.focus(); } });
  doc.addEventListener('keydown', onKey);
  win.addEventListener('resize', drawSel);
}
// прилипание к центру карточки и краям/центрам других элементов (Alt — без прилипания)
function snapMove(e) {
  const T = 0.8, xs = [[50, 'c']], ys = [[50, 'c']];
  L.items.forEach((o, i) => { if (i === sel) return; xs.push([o.x, 'l'], [o.x + o.w, 'r'], [o.x + o.w / 2, 'c']); ys.push([o.y, 't'], [o.y + o.h, 'b'], [o.y + o.h / 2, 'c']); });
  const cx = [[e.x, 0], [e.x + e.w / 2, e.w / 2], [e.x + e.w, e.w]], cy = [[e.y, 0], [e.y + e.h / 2, e.h / 2], [e.y + e.h, e.h]];
  for (const [v, off] of cx) { const m = xs.find(([p]) => Math.abs(p - v) < T); if (m) { e.x = m[0] - off; guide(true, m[0]); break; } }
  for (const [v, off] of cy) { const m = ys.find(([p]) => Math.abs(p - v) < T); if (m) { e.y = m[0] - off; guide(false, m[0]); break; } }
}

// ---------- клавиатура ----------
function onKey(ev) {
  if (!$('#dz-wrap')) return;
  const inField = /INPUT|TEXTAREA|SELECT/.test((ev.target.tagName || '')) && ev.target.ownerDocument === document;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z' && !inField) { ev.preventDefault(); ev.shiftKey ? redo() : undo(); return; }
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y' && !inField) { ev.preventDefault(); redo(); return; }
  if (inField || sel < 0) return;
  const e = L.items[sel], st = ev.shiftKey ? 2 : 0.25;
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'd') { ev.preventDefault(); layerOp(sel, 'dup'); return; }
  if (ev.key === 'Delete' || ev.key === 'Backspace') { ev.preventDefault(); layerOp(sel, 'del'); return; }
  const mv = {ArrowLeft:[-st, 0], ArrowRight:[st, 0], ArrowUp:[0, -st], ArrowDown:[0, st]}[ev.key];
  if (mv) { ev.preventDefault(); push(); e.x = round(e.x + mv[0]); e.y = round(e.y + mv[1]); applyBox(sel); drawSel(); drawProps(true); }
  if (ev.key === 'Escape') select(-1);
}

// ---------- элементы ----------
function select(i) { sel = i; drawSel(); drawLayers(); drawProps(); }
function add(t) {
  if (t === 'img') { $('#dz-file').click(); return; }
  push();
  const base = {text:{html:'Новый текст', fs:3.4, w:60, h:8}, rw:{d:{t:'coin', n:1}, w:14, h:10}, stage:{a:'Когда', b:'Начало партии', w:26, h:6.5},
    box:{bg:'rgba(8,4,30,.3)', rad:2, w:60, h:18}, title:{w:88, h:6}, desc:{w:84, h:20}, icon:{w:22, h:15.5}, tags:{w:80, h:3.5}, en:{w:80, h:3}}[t];
  const e = {t, ...base}; e.x = round(50 - e.w / 2); e.y = round(50 - e.h / 2);
  L.items.push(e); sel = L.items.length - 1; render();
}
async function addPhoto(fl, cx = 50, cy = 50) {
  const url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(fl); });
  const im = await new Promise(res => { const i = new Image(); i.onload = () => res(i); i.src = url; });
  // уменьшаем до 1400 px и сохраняем как PNG
  const k = Math.min(1, 1400 / Math.max(im.width, im.height)), c = document.createElement('canvas');
  c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height);
  const png = c.toDataURL('image/png'), key = 'user/' + Date.now().toString(36);
  await H.upload(key, png); win.CW_API.setImg(key, png);
  push();
  const xc = card(), ar = xc ? xc.offsetWidth / xc.offsetHeight : .712;
  const w = 40, h = w * (c.height / c.width) * ar;
  L.items.push({t:'img', src:key, fit:'contain', x:round(cx - w / 2), y:round(cy - h / 2), w, h:round(h)});
  sel = L.items.length - 1; render();
}
function layerOp(i, op) {
  push();
  const A = L.items;
  if (op === 'del') { A.splice(i, 1); sel = -1; }
  if (op === 'dup') { const c = clone(A[i]); c.x = round(c.x + 2); c.y = round(c.y + 2); A.splice(i + 1, 0, c); sel = i + 1; }
  if (op === 'up' && i < A.length - 1) { [A[i], A[i + 1]] = [A[i + 1], A[i]]; sel = i + 1; }
  if (op === 'down' && i > 0) { [A[i], A[i - 1]] = [A[i - 1], A[i]]; sel = i - 1; }
  if (op === 'top') { A.push(A.splice(i, 1)[0]); sel = A.length - 1; }
  if (op === 'bottom') { A.unshift(A.splice(i, 1)[0]); sel = 0; }
  render();
}
function label(e) {
  if (e.t === 'text') return (e.html || '').replace(/<[^>]+>/g, '').slice(0, 30) || 'Текст';
  if (e.t === 'rw') return 'Награда: ' + ({role:'персонаж', item:'предмет', emblem:'эмблема', trait:'связь', coin:'монеты', gi:'значок', hex:'стратегия', remblem:'случ. эмблемы', chim:'компаньон', arrow:'стрелка', or:'текст'}[e.d.t] || e.d.t);
  if (e.t === 'stage') return `Плашка: ${e.a} — ${e.b}`;
  return TYPES[e.t] || e.t;
}
function drawLayers() {
  const box = $('#dz-layers'); if (!box) return;
  box.innerHTML = L.items.map((e, i) => [e, i]).reverse().map(([e, i]) => `<div class="dz-layer${i === sel ? ' on' : ''}" data-i="${i}"><span>${esc(label(e))}</span>
    <small data-op="up" title="Выше">▲</small><small data-op="down" title="Ниже">▼</small><small data-op="del" title="Удалить" style="color:var(--bad)">✕</small></div>`).join('') || '<div class="dz-note">Пусто — добавьте элементы.</div>';
}

// ---------- свойства ----------
const fld = (k, label, v, type = 'number', extra = '') => `<label class="dz-f">${label}<input data-p="${k}" type="${type}" value="${esc(v ?? '')}" ${type === 'number' ? 'step="0.1"' : ''} ${extra}></label>`;
const selF = (k, label, v, opts) => `<label class="dz-f">${label}<select data-p="${k}">${Object.entries(opts).map(([a, b]) => `<option value="${a}"${String(v) === a ? ' selected' : ''}>${b}</option>`).join('')}</select></label>`;
function rgba(hex, a) { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${a})`; }
function hexOf(c) { const m = String(c || '').match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?/); if (!m) return [/^#/.test(c) ? c : '#08041e', 1]; return ['#' + [m[1], m[2], m[3]].map(v => (+v).toString(16).padStart(2, '0')).join(''), m[4] != null ? +m[4] : 1]; }

function drawProps(onlyBox) {
  const P = $('#dz-right'); if (!P) return;
  if (onlyBox && sel >= 0) { const e = L.items[sel]; for (const k of ['x', 'y', 'w', 'h', 'r']) { const i = P.querySelector(`[data-p="${k}"]`); if (i && document.activeElement !== i) i.value = e[k] || 0; } return; }
  if (sel < 0) {
    const [bgc] = hexOf(L.bg && L.bg.startsWith('#') ? L.bg : '#5038c8');
    P.innerHTML = `<div class="dz-h">Карточка</div>
      ${selF('ar', 'Пропорции', String(L.ar || .712), {'0.712':'Как в примерах (900×1263)', '0.6':'Высокая', '0.8':'Чуть шире', '1':'Квадрат', '1.4':'Широкая'})}
      <div class="dz-h">Фон</div>
      <div class="dz-row"><button class="dz-btn" data-bg="default">Стандартный</button><button class="dz-btn" data-bg="photo">Своё фото…</button></div>
      <label class="dz-f" style="margin-top:8px">Цвет фона<input type="color" data-bgc value="${bgc}"></label>
      <div class="dz-note">Выберите элемент на карточке или в списке слоёв. Перетаскивание — сдвиг, квадратики — размер (Shift — с сохранением пропорций), кружок сверху — поворот (Shift — шаг 15°). Стрелки — точный сдвиг, Delete — удалить, Ctrl+D — копия, Alt при перетаскивании — без прилипания.</div>`;
    P.querySelector('[data-p="ar"]').onchange = ev => { push(); L.ar = +ev.target.value; render(); };
    P.onclick = async ev => {
      const b = ev.target.closest('[data-bg]'); if (!b) return;
      if (b.dataset.bg === 'default') { push(); L.bg = 'default'; render(); return; }
      const fl = await pickFile(); if (!fl) return;
      const url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(fl); });
      const key = 'user/' + Date.now().toString(36); const png = await toPng(url, 1400);
      await H.upload(key, png); win.CW_API.setImg(key, png); push(); L.bg = key; render();
    };
    P.querySelector('[data-bgc]').oninput = ev => { push(); L.bg = ev.target.value; render(); };
    return;
  }
  const e = L.items[sel];
  let html = `<div class="dz-h">${esc(TYPES[e.t] || e.t)}</div>
    <div class="dz-grid">${fld('x', 'X, %', e.x)}${fld('y', 'Y, %', e.y)}${fld('w', 'Ширина, %', e.w)}${fld('h', 'Высота, %', e.h)}${fld('r', 'Поворот, °', e.r || 0)}
    <label class="dz-f">Прозрачность<input data-p="o" type="range" min="0.05" max="1" step="0.05" value="${e.o ?? 1}"></label></div>`;
  if (['text', 'title', 'en', 'desc'].includes(e.t)) {
    if (e.t === 'text') html += `<div class="dz-h">Текст</div><div class="dz-tb"><button data-w="v">Число</button><button data-w="c">Акцент</button><button data-w="b">Жирный</button><button data-w="br">Перенос</button></div>
      <label class="dz-f"><textarea data-p="html">${esc(e.html || '')}</textarea></label>`;
    else html += `<div class="dz-note">Текст берётся из карточки (${e.t === 'desc' ? 'описание' : 'название'}) — меняется вместе с данными.</div>`;
    html += `<div class="dz-grid" style="margin-top:8px">${fld('fs', 'Размер шрифта', e.fs || (e.t === 'title' ? 6.4 : e.t === 'en' ? 2.6 : 3.4))}
      ${selF('al', 'Выравнивание', e.al || 'center', {left:'Влево', center:'По центру', right:'Вправо'})}
      ${selF('fw', 'Насыщенность', e.fw || '', {'':'Обычная', '600':'Полужирная', '800':'Жирная'})}
      ${selF('ff', 'Шрифт', e.ff || '', {'':'Manrope', serif:'PT Serif'})}
      <label class="dz-f">Цвет<input type="color" data-p="c" value="${e.c || '#ffffff'}"></label></div>`;
  }
  if (e.t === 'img') html += `<div class="dz-h">Фото</div><div class="dz-grid">${selF('fit', 'Вписать', e.fit || 'contain', {contain:'Целиком', cover:'Заполнить (обрезать)'})}${fld('rad', 'Скругление', e.rad || 0)}</div>
    <div class="dz-row"><button class="dz-btn" data-repl>Заменить фото…</button></div>`;
  if (e.t === 'box') { const [c, a] = hexOf(e.bg); const [bc] = hexOf(e.bc || '#ffffff');
    html += `<div class="dz-h">Подложка</div><div class="dz-grid"><label class="dz-f">Цвет<input type="color" data-bg2 value="${c}"></label>
      <label class="dz-f">Непрозрачность<input type="range" data-ba min="0" max="1" step="0.05" value="${a}"></label>
      ${fld('rad', 'Скругление', e.rad ?? 2)}<label class="dz-f">Рамка<input type="color" data-p="bc" value="${bc}"></label>${fld('bw', 'Толщина рамки', e.bw || 0)}</div>`; }
  if (e.t === 'stage') html += `<div class="dz-h">Плашка</div><div class="dz-grid">${fld('a', 'Подпись', e.a, 'text')}${fld('b', 'Значение', e.b, 'text')}${fld('fs', 'Размер шрифта', e.fs || 3.2)}</div>`;
  if (e.t === 'rw') html += `<div class="dz-h">Награда</div><div id="dz-rw"></div>`;
  html += `<div class="dz-row"><button class="dz-btn" data-op="dup">Копия</button><button class="dz-btn" data-op="top">На передний план</button><button class="dz-btn" data-op="bottom">На задний план</button><button class="dz-btn" data-op="del" style="color:var(--bad)">Удалить</button></div>`;
  P.innerHTML = html;
  if (e.t === 'rw') $('#dz-rw').append(H.rwFields(e.d, () => { push(); render(); }));
  let pushed = false;
  P.oninput = P.onchange = ev => {
    const k = ev.target.dataset.p;
    if (!pushed) { push(); pushed = true; setTimeout(() => pushed = false, 600); }
    if (ev.target.hasAttribute('data-bg2') || ev.target.hasAttribute('data-ba')) { e.bg = rgba(P.querySelector('[data-bg2]').value, P.querySelector('[data-ba]').value); }
    else if (k) { let v = ev.target.value; if (ev.target.type === 'number' || ev.target.type === 'range') v = +v; if (v === '' ) delete e[k]; else e[k] = v; }
    else return;
    if (['x', 'y', 'w', 'h', 'r'].includes(k)) { applyBox(sel); drawSel(); } else { render(); }
  };
  P.onclick = async ev => {
    const op = ev.target.closest('[data-op]'); if (op) return layerOp(sel, op.dataset.op);
    const w = ev.target.closest('[data-w]'); if (w) { const ta = P.querySelector('textarea'); wrap(ta, w.dataset.w); return; }
    if (ev.target.closest('[data-repl]')) {
      const fl = await pickFile(); if (!fl) return;
      const url = await new Promise(res => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(fl); });
      const key = 'user/' + Date.now().toString(36), png = await toPng(url, 1400);
      await H.upload(key, png); win.CW_API.setImg(key, png); push(); e.src = key; render();
    }
  };
}
function wrap(ta, w) {
  const [a, b] = {v:['<b class="v">', '</b>'], c:['<span class="c" data-c="f29e38">', '</span>'], b:['<b>', '</b>'], br:['<br>', '']}[w];
  const s = ta.selectionStart, e = ta.selectionEnd;
  ta.value = ta.value.slice(0, s) + a + ta.value.slice(s, e) + b + ta.value.slice(e);
  ta.dispatchEvent(new Event('input', {bubbles:true})); ta.focus();
}
const pickFile = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = 'image/*'; i.onchange = () => res(i.files[0]); i.click(); });
const toPng = (url, max) => new Promise(res => { const im = new Image(); im.onload = () => { const k = Math.min(1, max / Math.max(im.width, im.height)), c = document.createElement('canvas'); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext('2d').drawImage(im, 0, 0, c.width, c.height); res(c.toDataURL('image/png')); }; im.src = url; });
})();
