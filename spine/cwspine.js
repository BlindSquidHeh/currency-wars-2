/* Анимированные сплеш-арты (Spine 4.1): один общий WebGL-контекст рисует персонажей в 2D-холсты карточек. */
(function () {
'use strict';
const BASE = (document.currentScript && document.currentScript.dataset.base) ?? 'spine/';
const DATA = {}, LOADED = {};

// spine/<id>/: spine.json (список частей и текстур) и сами файлы .skel/.atlas/.webp
function loadData(id) {
  const dir = BASE + id + '/';
  return DATA[id] || (DATA[id] = (async () => {
    const m = await (await fetch(dir + 'spine.json')).json();
    const parts = await Promise.all(m.parts.map(async p => ({
      skel: new Uint8Array(await (await fetch(dir + p.skel)).arrayBuffer()),
      atlas: await (await fetch(dir + p.atlas)).text(),
    })));
    return {parts, tex: Object.fromEntries(m.tex.map(t => [t, dir + t]))};
  })().catch(e => { delete DATA[id]; throw e; }));
}

// ---------- общий GL ----------
let GL = null;
function gl() {
  if (GL) return GL;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = new spine.ManagedWebGLRenderingContext(canvas, {alpha: true, premultipliedAlpha: true, antialias: false, preserveDrawingBuffer: true});
  const g = ctx.gl;
  // альфа холста: обычный over; аддитивные/screen/multiply слои (свечение и тени на чёрной подложке)
  // альфу не трогают, иначе на прозрачном фоне от них остаются чёрные квадраты
  const bfs = g.blendFuncSeparate.bind(g);
  g.blendFuncSeparate = (sr, dr) => (dr === g.ONE_MINUS_SRC_ALPHA && sr !== g.DST_COLOR ? bfs(sr, dr, g.ONE, g.ONE_MINUS_SRC_ALPHA) : bfs(sr, dr, g.ZERO, g.ONE));
  const renderer = new spine.SceneRenderer(canvas, ctx, true);
  GL = {canvas, ctx, g, renderer};
  return GL;
}

const loadImg = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });

// cfg: {hide:[имена слотов], show:[...], crop:[cx,cy,w]}
const USED = new Map(); // id -> время последнего показа, для выгрузки текстур
const MAX_LOADED = 20;
function touch(id) {
  id = String(id); USED.set(id, performance.now());
  if (USED.size <= MAX_LOADED) return;
  const busy = new Set([...ACTIVE].map(v => String(v.id || (v.ch && v.ch.id))));
  const old = [...USED].filter(([k]) => !busy.has(k)).sort((a, b) => a[1] - b[1]);
  for (const [k] of old.slice(0, USED.size - MAX_LOADED)) {
    const p = LOADED[k]; USED.delete(k); delete LOADED[k];
    if (p) p.then(ch => Object.values(ch.tex).forEach(t => t.dispose())).catch(() => {});
  }
}
async function loadChar(id) {
  touch(id);
  if (LOADED[id]) return LOADED[id];
  return (LOADED[id] = (async () => {
    const d = await loadData(id);
    const {ctx} = gl();
    const tex = {};
    // мип-карты: большие атласы сильно уменьшаются в карточке, без них картинка «рябит»
    for (const [n, src] of Object.entries(d.tex)) tex[n] = new spine.GLTexture(ctx, await loadImg(src), true);
    const g = ctx.gl;
    const parts = d.parts.map(p => {
      const atlas = new spine.TextureAtlas(p.atlas);
      for (const pg of atlas.pages) { pg.setTexture(tex[pg.name]); tex[pg.name].setFilters(g.LINEAR_MIPMAP_LINEAR, g.LINEAR); }
      const sd = new spine.SkeletonBinary(new spine.AtlasAttachmentLoader(atlas)).readSkeletonData(p.skel);
      const sk = new spine.Skeleton(sd); sk.setToSetupPose(); sk.updateWorldTransform();
      const st = new spine.AnimationState(new spine.AnimationStateData(sd));
      const an = sd.animations.find(a => /^(idle|all|animation|loop|await|male)$/i.test(a.name)) || sd.animations.find(a => /idle/i.test(a.name)) || sd.animations[0];
      if (an) st.setAnimation(0, an.name, true);
      return {sk, st, sd};
    });
    const o = new spine.Vector2(), sz = new spine.Vector2();
    let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
    for (const p of parts) { p.sk.getBounds(o, sz, []); x0 = Math.min(x0, o.x); y0 = Math.min(y0, o.y); x1 = Math.max(x1, o.x + sz.x); y1 = Math.max(y1, o.y + sz.y); }
    return {id, parts, bounds: [x0, y0, x1 - x0, y1 - y0], tex, hidden: null};
  })());
}

// скрыть слои фона: обнуляем вложения слотов в setup-позе и после каждого применения анимации
function applyHide(ch, names) {
  const set = new Set(names || []);
  ch.hidden = set;
  for (const p of ch.parts) {
    // слоты, которые раньше были скрыты, а теперь нет: вернуть вложение из setup-позы,
    // иначе неанимированные слои так и остаются пустыми (персонаж «пропадает» после наведения на слои)
    const was = new Set(p.hideIdx || []);
    p.hideIdx = p.sk.slots.map((s, i) => set.has(s.data.name) ? i : -1).filter(i => i >= 0);
    const now = new Set(p.hideIdx);
    for (const i of was) if (!now.has(i)) p.sk.slots[i].setToSetupPose();
  }
}

function update(ch, dt) {
  for (const p of ch.parts) {
    p.st.update(dt); p.st.apply(p.sk);
    if (p.hideIdx) for (const i of p.hideIdx) p.sk.slots[i].attachment = null;
    p.sk.updateWorldTransform();
  }
}

// нарисовать персонажа в 2D-холст; view = [cx, cy, w] в мировых координатах (h берётся из пропорций холста)
function draw(ch, out, view) {
  const {canvas, g, renderer} = gl();
  const W = out.width, H = out.height;
  if (canvas.width < W || canvas.height < H) { canvas.width = Math.max(canvas.width, W); canvas.height = Math.max(canvas.height, H); }
  const cam = renderer.camera;
  const [cx, cy, w, rot = 0] = view;
  g.viewport(0, 0, W, H);
  cam.setViewport(W, H);
  cam.position.x = cx; cam.position.y = cy; cam.zoom = w / W;
  const r = rot * Math.PI / 180; cam.up.set(Math.sin(r), Math.cos(r), 0); // поворот кадра под статичный портрет
  cam.update();
  g.clearColor(0, 0, 0, 0); g.clear(g.COLOR_BUFFER_BIT);
  renderer.begin();
  for (const p of ch.parts) renderer.drawSkeleton(p.sk, false);
  renderer.end();
  const c2 = out.getContext('2d');
  c2.clearRect(0, 0, W, H);
  c2.drawImage(canvas, 0, canvas.height - H, W, H, 0, 0, W, H);
}

// ---------- проигрыватель для набора холстов ----------
const ACTIVE = new Set();
let raf = 0, last = 0;
function loop(t) {
  raf = requestAnimationFrame(loop);
  const dt = Math.min((t - (last || t)) / 1000, 0.1);
  if (t - last < 1000 / 40) return; // ~40 fps достаточно
  last = t;
  const done = new Set();
  for (const v of ACTIVE) {
    if (!v.ch || !v.el.isConnected) { if (!v.el.isConnected) ACTIVE.delete(v); continue; }
    if (!done.has(v.ch)) { update(v.ch, dt); done.add(v.ch); }
    draw(v.ch, v.el, v.view);
  }
  if (!ACTIVE.size) { cancelAnimationFrame(raf); raf = 0; last = 0; }
}
function play(v) { ACTIVE.add(v); if (!raf) raf = requestAnimationFrame(loop); }
function stop(v) { ACTIVE.delete(v); }

// view из конфига: crop задан в долях исходных границ [cx, cy, w] (0..1, y сверху вниз), rot — поворот в градусах
function viewOf(ch, crop, aspect, rot) {
  const [x0, y0, bw, bh] = ch.bounds;
  if (!crop) { const w = Math.max(bw, bh / aspect); return [x0 + bw / 2, y0 + bh / 2, w]; }
  return [x0 + crop[0] * bw, y0 + bh - crop[1] * bh, crop[2] * bw, rot || 0];
}

window.CWS = {loadChar, applyHide, update, draw, play, stop, viewOf, gl};
})();
