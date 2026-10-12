import { PLC, physToInputs, outputsToSym, resolveProgram, collectSlots, countEmpty, runTests, lint } from './plc.js';
import { LEVEL1 } from './retos.js';
import { LEVEL2 } from './nivel2.js';
import { LEVEL3 } from './nivel3.js';
import { LEVEL4 } from './nivel4.js';
import { renderRung, opText, setTags } from './ladder.js';
import * as ED from './editor.js';
import { buildPlant } from './plant3d.js';
import { buildReport } from './report.js';

const LEVELS = [LEVEL1, LEVEL2, LEVEL3, LEVEL4];
const $ = s => document.querySelector(s);
const SVG = (d, w = 14) => `<svg width="${w}" height="${w}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">${d}</svg>`;
const ICON = {
  check: SVG('<path d="M20 6 9 17l-5-5"/>'), x: SVG('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>'), dash: SVG('<path d="M6 12h12"/>'),
  up: SVG('<path d="m18 15-6-6-6 6"/>'), down: SVG('<path d="m6 9 6 6 6-6"/>'),
  trash: SVG('<path d="M3 6h18"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/><path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>'),
};
const KEY = 'plclab.v3';
const store = Object.assign({ level: 1, reto: {}, answers: {}, programs: {}, done: {} }, JSON.parse(localStorage.getItem(KEY) || '{}'));
if (typeof store.reto === 'string') store.reto = { 1: store.reto };
store.programs = store.programs || {};
const save = () => localStorage.setItem(KEY, JSON.stringify(store));

const stage = $('three-d-stage');
const { THREE } = await stage.ready;
const plant = buildPlant(THREE);
let extrasInScene = null;

const MODES = { S1: 'm', S2: 'm', S3: 'm', S4: 't', S0: 't', B1m: 'm' };
const dev = {};
const plc = new PLC();
let level, reto, program, stored, slots, sim = null, results = null, stale = false, selSlot = null, multi = [];
let mode = 'RUN', speed = 'normal', cycle = 0, phase = -1, slowT = 0, simTime = 0, cycleMs = 16;
let physIn = {}, PII = {}, physOut = {};
const free = () => level.mode === 'free';
const ans = () => store.answers[reto.id] || (store.answers[reto.id] = {});
const levelDone = l => l.retos.filter(r => store.done[r.id]).length;

// ── Niveles ─────────────────────────────────────────────────────
function renderLevels() {
  $('#levels').innerHTML = LEVELS.map(l => `<button class="level${l === level ? ' cur' : ''}" data-level="${l.n}"><span class="lv-k">Nivel ${l.n} · ${l.week} · ${levelDone(l)}/${l.retos.length}</span><span class="lv-t">${l.title}</span></button>`).join('');
  const d = levelDone(level), all = d === level.retos.length;
  $('#lvl-k').textContent = `Nivel ${level.n} · ${level.week}`;
  $('#lvl-t').textContent = level.title;
  $('#lvl-p').textContent = all ? 'Todos los retos superados. Ya puedes generar el reporte.' : `${d} de ${level.retos.length} retos superados. El reporte se habilita al superarlos todos.`;
  $('#report-btn').disabled = !all;
}
$('#levels').addEventListener('click', e => { const b = e.target.closest('[data-level]'); if (b) setLevel(+b.dataset.level); });

function setLevel(n) {
  level = LEVELS[n - 1] || LEVEL1;
  store.level = level.n; save();
  setTags(level.tags);
  const root = plant.setLevel(level.n);
  stage.setObject(root);
  if (extrasInScene) stage._scene.remove(extrasInScene);
  extrasInScene = plant.extras; stage._scene.add(extrasInScene);
  buildIO(); buildLabels(); flyTo('general', true);
  $('#add-rung').hidden = !free();
  document.querySelectorAll('#add-rung .an-only').forEach(b => { b.hidden = !level.analog; });
  loadReto(store.reto[level.n] || level.retos[0].id);
}

// ── Reto ────────────────────────────────────────────────────────
function resetPlant() {
  plc.reset();
  for (const k of ['S1', 'S2', 'S3', 'S4', 'S0', 'B1', 'B1m', 'B2', 'B3']) dev[k] = false;
  sim = level.sim ? level.sim(false) : null;
  plant.reset();
  trace = []; frozen = null; $('#tr-freeze').setAttribute('aria-pressed', 'false');
}
function loadReto(id) {
  reto = level.retos.find(r => r.id === id) || level.retos[0];
  store.reto[level.n] = reto.id; save();
  const src = reto.startFrom && store.programs[reto.startFrom];
  if (free() && (!store.programs[reto.id] || (!store.programs[reto.id].length && src && src.length))) {
    store.programs[reto.id] = src ? ED.clone(src) : [];
    save();
  }
  slots = free() ? null : collectSlots(reto);
  resetPlant();
  results = null; stale = false; closePop();
  rebuild(); renderRetos(); renderStatement(); renderResults(); renderLevels();
}
function rebuild() {
  if (free()) { stored = store.programs[reto.id]; program = ED.clone(stored); }
  else program = resolveProgram(reto, ans());
  lastLadder = ''; renderLadder(); renderGuide();
}
function renderRetos() {
  $('#retos').style.gridTemplateColumns = `repeat(${level.retos.length}, minmax(0, 1fr))`;
  $('#retos').innerHTML = level.retos.map(r => `<button class="reto${r.id === reto.id ? ' on' : ''}" data-reto="${r.id}"><span class="reto-id">${r.id}${store.done[r.id] ? `<span class="reto-ok" title="Superado">${ICON.check}</span>` : ''}</span><span class="reto-name">${r.short}</span></button>`).join('');
}
$('#retos').addEventListener('click', e => { const b = e.target.closest('[data-reto]'); if (b) loadReto(b.dataset.reto); });

function renderStatement() {
  $('#st-kicker').textContent = `Reto ${reto.id} · ${reto.topic}`;
  $('#st-title').textContent = reto.title;
  $('#st-text').textContent = reto.text;
  $('#st-goal').textContent = reto.goal;
  $('#st-hint').textContent = reto.hint;
  $('#st-from').hidden = !reto.startFrom;
  $('#st-from').textContent = reto.startFrom ? `Este reto parte de tu programa del reto ${reto.startFrom}.` : '';
  $('#guide').hidden = true; guideN = 1;
  $('#hint-btn').textContent = 'Guía paso a paso';
  lastTruth = ''; $('#truth').hidden = !reto.truth; $('#truth').innerHTML = '';
}
$('#hint-btn').onclick = () => { const g = $('#guide'); g.hidden = !g.hidden; $('#hint-btn').textContent = g.hidden ? 'Guía paso a paso' : 'Ocultar guía'; renderGuide(); };
$('#reset-btn').onclick = () => {
  if (free()) store.programs[reto.id] = reto.startFrom && store.programs[reto.startFrom] ? ED.clone(store.programs[reto.startFrom]) : [];
  else store.answers[reto.id] = {};
  save(); results = null; stale = false; closePop(); rebuild(); renderResults();
};

// Guía paso a paso
let guideN = 1;
function stepOk(s) {
  if (s.check) return !!s.check(stored);
  if (!s.slot) return false;
  const a = ans()[s.slot]; if (!a) return false;
  return Object.entries(s.expect).every(([k, v]) => a[k] === v);
}
function renderGuide() {
  const st = reto.steps || [];
  while (guideN < st.length && (st[guideN - 1].slot || st[guideN - 1].check) && stepOk(st[guideN - 1])) guideN++;
  const n = Math.min(guideN, st.length);
  const curIdx = st.findIndex((s, i) => i < n && (s.slot || s.check) && !stepOk(s));
  $('#guide-l').innerHTML = st.slice(0, n).map((s, i) => {
    const ok = (s.slot || s.check) && stepOk(s);
    return `<li class="${ok ? 'ok' : ''}${i === curIdx ? ' cur' : ''}" ${s.slot ? `data-gslot="${s.slot}"` : ''}><span class="g-n">${i + 1}</span><span>${s.text}${s.slot && !ok ? '<span class="g-go">Clic para abrir el hueco en el programa</span>' : ''}</span><span class="g-s">${ok ? ICON.check : ''}</span></li>`;
  }).join('');
  $('#g-next').hidden = $('#g-all').hidden = n >= st.length;
  $('#g-count').textContent = `Paso ${n} de ${st.length}`;
}
$('#g-next').onclick = () => { guideN++; renderGuide(); };
$('#g-all').onclick = () => { guideN = (reto.steps || []).length; renderGuide(); };
$('#guide-l').addEventListener('click', e => {
  const li = e.target.closest('[data-gslot]'); if (!li) return;
  e.stopPropagation();
  const h = document.querySelector(`#ladder [data-slot="${li.dataset.gslot}"]`);
  if (h) openPop(li.dataset.gslot, h.getBoundingClientRect());
});

let lastTruth = '';
function renderTruth() {
  if (!reto.truth) return;
  const { ins, out, fn } = reto.truth;
  const real = outputsToSym(level.tags, physOut)[out];
  const rows = [];
  for (let k = 0; k < (1 << ins.length); k++) {
    const v = ins.map((_, i) => !!((k >> (ins.length - 1 - i)) & 1));
    const cur = ins.every((s, i) => !!dev[s] === v[i]);
    rows.push(`<tr class="${cur ? 'cur' : ''}">${v.map(b => `<td>${b ? 1 : 0}</td>`).join('')}<td><b>${fn(...v) ? 1 : 0}</b></td><td>${cur ? (real ? 1 : 0) : ''}</td></tr>`);
  }
  const html = `<table class="table tt"><thead><tr>${ins.map(s => `<th>${s}</th>`).join('')}<th>${out} esperado</th><th>${out} real</th></tr></thead><tbody>${rows.join('')}</tbody></table>`;
  if (html !== lastTruth) { $('#truth').innerHTML = html; lastTruth = html; }
}

// ── Ladder ──────────────────────────────────────────────────────
let lastLadder = '';
function renderLadder() {
  const sel = multi.length ? multi : selSlot;
  const tools = i => free() ? `<span class="rung-tools"><button data-rup="${i}" title="Subir segmento" ${i === 0 ? 'disabled' : ''}>${ICON.up}</button><button data-rdown="${i}" title="Bajar segmento" ${i === program.length - 1 ? 'disabled' : ''}>${ICON.down}</button><button data-rdel="${i}" title="Eliminar segmento">${ICON.trash}</button></span>` : '';
  let html = program.map((r, i) => renderRung(r, i, mode === 'RUN', sel, { tools: tools(i) })).join('');
  if (!program.length) html = '<p class="ladder-empty">El programa está vacío. Agrega un segmento para empezar.</p>';
  if (html !== lastLadder) { $('#ladder').innerHTML = html; lastLadder = html; }
}
$('#ladder').addEventListener('click', e => {
  const t = e.target.closest('[data-rup],[data-rdown],[data-rdel]');
  if (t) {
    const i = +(t.dataset.rup ?? t.dataset.rdown ?? t.dataset.rdel);
    if (t.dataset.rdel != null) stored.splice(i, 1);
    else { const j = t.dataset.rup != null ? i - 1 : i + 1; [stored[i], stored[j]] = [stored[j], stored[i]]; }
    saveProg(); return;
  }
  const h = e.target.closest('[data-slot]');
  if (!h) return;
  e.stopPropagation();
  const id = h.dataset.slot;
  if (free() && e.shiftKey && selSlot && selSlot !== id) {
    const base = multi.length ? multi : [selSlot];
    const L = ED.locate(stored, id);
    if (L && L.node.t === 'c' && ED.sameSeries(stored, [...base, id])) { multi = [...new Set([...base, id])]; openMulti(h.getBoundingClientRect()); return; }
  }
  multi = [];
  openPop(id, h.getBoundingClientRect());
});
$('#add-rung').addEventListener('click', e => {
  const b = e.target.closest('[data-add]'); if (!b) return;
  stored.push(ED.newRung(b.dataset.add, stored)); saveProg();
});
function saveProg() {
  store.programs[reto.id] = stored; save();
  if (results) stale = true;
  closePop(); rebuild(); renderResults();
}

// ── Popover de edición ─────────────────────────────────────────
const pop = $('#pop');
let popKind = 'NO', popCk = '', popRect = null, popCmp = { op: '>=', addr: 'MD10', value: '' };
const KINDS = { NO: '┤ ├', NC: '┤/├', P: '┤P├', CMP: '┤≥├' };
function operands(accept) {
  const ins = level.tags.filter(t => t.io === 'in').map(t => t.addr);
  const outs = level.tags.filter(t => t.io === 'out').map(t => t.addr);
  if (!free()) {
    const marks = (reto.internal || []).filter(a => a[0] === 'M');
    return accept === 'coil' ? [['Salidas', outs], ['Marcas', marks]] : [['Entradas', ins], ['Salidas', outs], ['Internas', reto.internal || []]];
  }
  const marks = Array.from({ length: 8 }, (_, i) => 'M0.' + i);
  const boxes = stored.filter(r => r.type !== 'coil').map(r => r.name + '.Q');
  return accept === 'coil' ? [['Salidas', outs], ['Marcas', marks]] : [['Entradas', ins], ['Salidas', outs], ['Marcas', marks], ['Temporizadores y contadores', boxes]];
}
function placePop(rect) {
  pop.hidden = false;
  const pw = pop.offsetWidth, ph = pop.offsetHeight;
  let x = Math.min(rect.left, innerWidth - pw - 12), y = rect.bottom + 6;
  if (y + ph > innerHeight - 8) y = Math.max(8, rect.top - ph - 6);
  pop.style.left = Math.max(8, x) + 'px'; pop.style.top = y + 'px';
}
function openPop(id, rect, keep) {
  selSlot = id; popRect = rect;
  let node, accept;
  let rungType = null, coilKey = null;
  if (free()) { const L = ED.locate(stored, id); if (!L) return; node = L.node; rungType = L.rung.type; coilKey = L.key; accept = node.t === 'param' ? node.kind : node.t === 'word' ? 'word' : node.t === 'coil' || node.accept === 'coil' ? 'coil' : 'contact'; }
  else { accept = slots[id].accept; node = ans()[id] || {}; }
  const a = free() ? (node.t === 'cmp' ? { kind: 'CMP', op: node.op, addr: node.addr, value: node.value } : node.t === 'c' ? { kind: node.kind, addr: node.addr } : node.t === 'coil' ? { addr: node.addr, coil: node.ck } : node.t === 'param' ? { value: node.value } : {}) : node;
  popKind = keep ? popKind : (a.kind || popKind || 'NO');
  const edges = free() || reto.edges;
  if (popKind === 'P' && !edges) popKind = 'NO';
  if (!keep) {
    popCk = a.coil || '';
    popCmp = a.kind === 'CMP' ? { op: a.op, addr: a.addr, value: a.value } : { op: '>=', addr: 'MD10', value: '' };
  }
  let h = '';
  if (accept === 'contact' || accept === 'coil') {
    const isC = accept === 'contact';
    h += `<div class="pop-h">${isC ? 'Contacto' : 'Bobina'}</div>`;
    const kinds = (edges ? ['NO', 'NC', 'P'] : ['NO', 'NC']).concat(free() && level.analog ? ['CMP'] : []);
    if (isC) h += `<div class="seg pop-seg">${kinds.map(k => `<button data-kind="${k}" aria-pressed="${popKind === k}">${k} <span class="sym">${KINDS[k]}</span></button>`).join('')}</div>`;
    else if (free() || reto.coilKinds) h += `<div class="seg pop-seg">${[['', '( )', 'Normal'], ['S', '(S)', 'Set'], ['R', '(R)', 'Reset']].map(([k, s, l]) => `<button data-ck="${k}" aria-pressed="${popCk === k}">${l} <span class="sym">${s}</span></button>`).join('')}</div>`;
    if (isC && popKind === 'CMP') {
      h += `<div class="seg pop-seg">${['>=', '<='].map(op => `<button data-op="${op}" aria-pressed="${popCmp.op === op}">${op === '>=' ? 'Mayor o igual ≥' : 'Menor o igual ≤'}</button>`).join('')}</div>`;
      h += `<div class="pop-l">${ED.WORDS.map(w => { const o = opText(w); return `<button class="op${popCmp.addr === w ? ' on' : ''}" data-cmpaddr="${w}"><span class="op-a">${o.top}</span><span class="op-s">${o.bot}</span></button>`; }).join('')}</div>`;
      h += `<form class="pop-row" id="pop-cmp"><input class="input" id="pop-cv" type="number" step="any" value="${popCmp.value ?? ''}" placeholder="valor"><button class="btn btn-primary" type="submit">Aplicar</button></form>`;
    } else h += `<div class="pop-l">${operands(accept).filter(([, l]) => l.length).map(([g, l]) => `<div class="op-g">${g}</div>` + l.map(ad => { const o = opText(ad); return `<button class="op${a.addr === ad ? ' on' : ''}" data-addr="${ad}"><span class="op-a">${o.top}</span><span class="op-s">${o.bot}</span></button>`; }).join('')).join('')}</div>`;
    if (free() && isC) {
      const par = ED.ancestorPar(stored, id);
      h += `<div class="pop-acts"><button class="btn btn-secondary" data-act="right">Serie a la derecha</button><button class="btn btn-secondary" data-act="left">Serie a la izquierda</button>${par ? '<button class="btn btn-secondary" data-act="after">Serie después del paralelo</button>' : ''}<button class="btn btn-secondary" data-act="par">Rama en paralelo</button></div>`;
    }
    if (free() && !isC && rungType === 'coil') h += '<div class="pop-acts"><button class="btn btn-secondary" data-act="coilpar">Bobina en paralelo</button></div>';
  } else if (accept === 'word') {
    h += `<div class="pop-h">Operando</div><div class="pop-l">${ED.WORDS.map(w => { const o = opText(w); return `<button class="op${node.addr === w ? ' on' : ''}" data-word="${w}"><span class="op-a">${o.top}</span><span class="op-s">${o.bot}</span></button>`; }).join('')}</div>`;
  } else {
    const isT = accept === 'time';
    h += `<div class="pop-h">${isT ? 'Tiempo preseleccionado (PT)' : accept === 'num' ? 'Valor (MIN / MAX)' : 'Valor de preselección (PV)'}</div>
      <form class="pop-row" id="pop-form"><input class="input" id="pop-val" type="number" ${accept === 'num' ? 'step="any"' : `min="${isT ? 0.1 : 1}" step="${isT ? 0.1 : 1}"`} value="${a.value ?? ''}" placeholder="${isT ? 'segundos' : accept === 'num' ? 'valor' : 'cuentas'}"><span>${isT ? 's' : ''}</span><button class="btn btn-primary" type="submit">Aplicar</button></form>`;
  }
  const canDel = free() && (accept === 'contact' || (accept === 'coil' && coilKey === 'more'));
  h += `<div class="pop-f"><button class="btn btn-ghost" data-clear>${canDel ? 'Eliminar elemento' : 'Quitar'}</button><button class="btn btn-ghost" data-close>Cerrar</button></div>`;
  if (free()) h += '<div class="pop-tip">Mayús + clic en otro contacto de la misma serie para seleccionar varios.</div>';
  pop.innerHTML = h; placePop(rect);
  const f = $('#pop-form');
  if (f) { $('#pop-val').focus(); f.onsubmit = ev => { ev.preventDefault(); const v = parseFloat(String($('#pop-val').value).replace(',', '.')); if (!isNaN(v) && (accept === 'num' || v > 0)) commit(id, { value: accept === 'int' ? Math.round(v) : v }); }; }
  const fc = $('#pop-cmp');
  if (fc) fc.onsubmit = ev => { ev.preventDefault(); const v = parseFloat(String($('#pop-cv').value).replace(',', '.')); if (!isNaN(v)) commit(id, { kind: 'CMP', op: popCmp.op, addr: popCmp.addr, value: v }); };
  renderLadder();
}
function openMulti(rect) {
  popRect = rect;
  pop.innerHTML = `<div class="pop-h">${multi.length} contactos seleccionados</div><p class="pop-tip">Están en la misma serie. Puedes crear una rama en paralelo que abarque a todos.</p><div class="pop-acts"><button class="btn btn-primary" data-act="range">Rama en paralelo a la selección</button></div><div class="pop-f"><button class="btn btn-ghost" data-close>Cancelar</button></div>`;
  placePop(rect); renderLadder();
}
function closePop() { pop.hidden = true; selSlot = null; multi = []; if (program) renderLadder(); }
function commit(id, val) {
  if (free()) {
    const L = ED.locate(stored, id); if (!L) return;
    if (val == null) { if (L.node.t === 'c' || L.node.t === 'cmp' || L.node.accept === 'contact') ED.removeNode(stored, id); else if (L.node.t === 'param') ED.setParam(stored, id, null); else if (L.node.t === 'word') ED.setWord(stored, id, null); else ED.setCoil(stored, id, null); }
    else if (val.word) ED.setWord(stored, id, val.word);
    else if (val.kind) ED.setContact(stored, id, val.kind, val.addr, val);
    else if (val.value != null) ED.setParam(stored, id, val.value);
    else ED.setCoil(stored, id, val.addr, val.coil);
    saveProg(); return;
  }
  if (val) ans()[id] = val; else delete ans()[id];
  save(); if (results) stale = true;
  closePop(); rebuild(); renderResults();
}
function act(kind) {
  let nid = null;
  if (kind === 'range') nid = ED.parallelRange(stored, multi);
  else if (kind === 'coilpar') nid = ED.addCoil(stored, selSlot);
  else if (kind === 'par') nid = ED.addParallel(stored, selSlot);
  else if (kind === 'after') nid = ED.insertSeries(stored, ED.ancestorPar(stored, selSlot), 'right');
  else nid = ED.insertSeries(stored, selSlot, kind);
  saveProg();
  if (nid) requestAnimationFrame(() => { const h = document.querySelector(`#ladder [data-slot="${nid}"]`); if (h) openPop(nid, h.getBoundingClientRect()); });
}
pop.addEventListener('click', e => {
  const k = e.target.closest('[data-kind]'), ck = e.target.closest('[data-ck]'), ad = e.target.closest('[data-addr]'), a2 = e.target.closest('[data-act]');
  const op = e.target.closest('[data-op]'), ca = e.target.closest('[data-cmpaddr]'), wd = e.target.closest('[data-word]');
  if (op || ca) { if (op) popCmp.op = op.dataset.op; if (ca) popCmp.addr = ca.dataset.cmpaddr; const v = $('#pop-cv'); if (v && v.value !== '') popCmp.value = v.value; openPop(selSlot, popRect, true); return; }
  if (wd) { commit(selSlot, { word: wd.dataset.word }); return; }
  const cur = () => { if (free()) { const L = ED.locate(stored, selSlot); return L && (L.node.t === 'c' || L.node.t === 'coil') ? L.node : null; } return ans()[selSlot]; };
  const coilVal = addr => (popCk ? { addr, coil: popCk } : { addr });
  if (a2) act(a2.dataset.act);
  else if (k) { popKind = k.dataset.kind; const a = cur(); if (popKind !== 'CMP' && a && a.addr && a.t !== 'cmp') commit(selSlot, { kind: popKind, addr: a.addr }); else openPop(selSlot, popRect, true); }
  else if (ck) { popCk = ck.dataset.ck; const a = cur(); if (a && a.addr) commit(selSlot, coilVal(a.addr)); else openPop(selSlot, popRect, true); }
  else if (ad) { const isCoil = free() ? (() => { const L = ED.locate(stored, selSlot); return L.node.t === 'coil' || L.node.accept === 'coil'; })() : slots[selSlot].accept === 'coil'; commit(selSlot, isCoil ? coilVal(ad.dataset.addr) : { kind: popKind, addr: ad.dataset.addr }); }
  else if (e.target.closest('[data-clear]')) commit(selSlot, null);
  else if (e.target.closest('[data-close]')) closePop();
});
document.addEventListener('pointerdown', e => { if (!pop.hidden && !pop.contains(e.target) && !e.target.closest('[data-slot],[data-gslot]')) closePop(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { closePop(); closeDlg(); } });

// ── Verificación ────────────────────────────────────────────────
const execProg = () => free() ? ED.clone(stored) : resolveProgram(reto, ans());
$('#verify').onclick = () => {
  const p = execProg(), miss = countEmpty(p);
  results = miss ? { missing: miss } : { list: runTests(reto, p, level) };
  if (!miss && !p.length) results = { missing: 0, empty: true };
  stale = false;
  if (results.list && results.list.every(r => r.state === 'pass')) { store.done[reto.id] = true; save(); renderRetos(); renderLevels(); }
  renderResults();
};
function renderResults() {
  const el = $('#results');
  const n = reto.tests.filter(t => t.expect || t.check || t.until).length + (reto.invariant ? 1 : 0);
  if (!results) { el.innerHTML = `<p class="res-note">Se ejecutan ${n} pruebas automáticas sobre una copia del PLC, con un ciclo de 10 ms${level.sim ? ' y la planta simulada' : ''}.</p>`; return; }
  if (results.empty) { el.innerHTML = '<p class="res-sum fail">El programa está vacío.</p>'; return; }
  if (results.missing) { el.innerHTML = `<p class="res-sum fail">${results.missing > 1 ? `Faltan ${results.missing} elementos` : 'Falta 1 elemento'} por completar (marcados con ?).</p>`; return; }
  const ok = results.list.filter(r => r.state === 'pass').length, all = ok === results.list.length;
  let diag = '';
  if (!all) {
    const d = free() ? [...(reto.diag ? reto.diag(stored) : []), ...lint(stored, level.tags, reto)] : (reto.diag ? reto.diag(ans()) : []);
    diag = `<div class="diag"><div class="diag-h">Diagnóstico</div>${d.length ? `<ul>${d.map(m => `<li>${m}</li>`).join('')}</ul>` : '<p>No reconozco un error típico en este programa. Revisa la prueba que falló en el diagrama de tiempos y compárala con la guía paso a paso.</p>'}</div>`;
  }
  el.innerHTML = `<p class="res-sum ${all ? 'pass' : 'fail'}">${all ? `Reto superado: ${ok} de ${n} pruebas correctas.` : `${ok} de ${n} pruebas correctas.`}${stale ? ' <span class="res-stale">El programa cambió; vuelve a verificar.</span>' : ''}</p>${diag}
    <ol class="res-list">${results.list.map(r => `<li class="${r.state}"><span class="res-i">${r.state === 'pass' ? ICON.check : r.state === 'fail' ? ICON.x : ICON.dash}</span><span>${r.msg}${r.detail ? `<small>${r.detail}</small>` : ''}</span></li>`).join('')}</ol>`;
}

// ── CPU RUN/STOP y ciclo ────────────────────────────────────────
function segSet(sel, attr, val) { document.querySelectorAll(`${sel} [${attr}]`).forEach(b => b.setAttribute('aria-pressed', b.getAttribute(attr) === val)); }
$('#cpu').addEventListener('click', e => {
  const b = e.target.closest('[data-mode]'); if (!b) return;
  mode = b.dataset.mode; segSet('#cpu', 'data-mode', mode);
  if (mode === 'STOP') physOut = {};
  slowT = 0; phase = -1; lastLadder = ''; renderLadder();
});
$('#speed').addEventListener('click', e => {
  const b = e.target.closest('[data-speed]'); if (!b) return;
  speed = b.dataset.speed; segSet('#speed', 'data-speed', speed); slowT = 0; phase = -1;
});

// ── Tabla de variables e imagen de proceso ─────────────────────
let bitCells = [];
function buildIO() {
  $('#io').innerHTML = `<table class="table io"><thead><tr><th>Dirección</th><th>Símbolo</th><th>Dispositivo</th><th>Cableado</th><th>Borne</th></tr></thead><tbody>${level.tags.map(t => {
    const click = t.io === 'in' && (!t.sensor || t.sym === 'B1' && level.n === 1);
    if (t.io === 'ain') return `<tr><td>%${t.addr}</td><td><b>${t.sym}</b> ${t.short}</td><td>${t.dev}</td><td>${t.wiring}</td><td><span class="bit an" data-addr="${t.addr}">0</span></td></tr>`;
    return `<tr class="${click ? 'in' : ''}" ${click ? `data-dev="${t.sym}"` : ''}><td>%${t.addr}</td><td><b>${t.sym}</b> ${t.short}</td><td>${t.dev}</td><td>${t.wiring || '—'}</td><td><span class="bit" data-addr="${t.addr}">0</span></td></tr>`;
  }).join('')}</tbody></table>`;
  bitCells = [...document.querySelectorAll('#io .bit')];
}
const pimgRows = ['Bornes I', 'Imagen I', 'Imagen Q', 'Bornes Q'];
$('#pimg').innerHTML = `<span></span>${[...Array(8)].map((_, i) => `<span class="pi-h">.${i}</span>`).join('')}` +
  pimgRows.map((l, ri) => `<span class="pi-l">${l}</span>${[...Array(8)].map((_, i) => `<span class="pi-b${ri >= 2 && i > 5 ? ' na' : ''}" data-r="${ri}" data-i="${i}"></span>`).join('')}`).join('');
const piCells = [...document.querySelectorAll('#pimg .pi-b')];

// ── Interacción física ─────────────────────────────────────────
let held = null, latchMode = false;
function press(sym, e) {
  if (sym === 'B1') { if (level.n !== 1) return; sym = 'B1m'; }
  if (!MODES[sym]) return;
  if (MODES[sym] === 't' || latchMode || (e && e.shiftKey)) dev[sym] = !dev[sym]; else { dev[sym] = true; held = sym; }
}
$('#latch-btn').onclick = () => {
  latchMode = !latchMode;
  $('#latch-btn').setAttribute('aria-pressed', latchMode);
  if (!latchMode) ['S1', 'S2', 'S3', 'B1m'].forEach(k => dev[k] = false);
};
addEventListener('pointerup', () => { if (held) { dev[held] = false; held = null; } });
addEventListener('pointercancel', () => { if (held) { dev[held] = false; held = null; } });
$('#io').addEventListener('pointerdown', e => { const r = e.target.closest('[data-dev]'); if (r) { e.preventDefault(); press(r.dataset.dev, e); } });
const ray = new THREE.Raycaster();
function pickAt(e) {
  const r = stage.getBoundingClientRect();
  ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), stage._camera);
  const h = ray.intersectObjects(plant.pickables, false);
  return h.length ? h[0].object.userData.dev : null;
}
stage.addEventListener('pointerdown', e => { if (e.button !== 0) return; const d = pickAt(e); if (d) { e.stopPropagation(); press(d, e); } }, true);
stage.addEventListener('pointermove', e => { stage.style.cursor = pickAt(e) ? 'pointer' : ''; });

// ── Cámara ─────────────────────────────────────────────────────
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const PLANT_VIEW = {
  1: [V3(0.24, 0.42, 0.7), V3(0.17, 0.15, 0.13)],
  2: [V3(0.5, 0.5, 0.8), V3(0.2, 0.22, 0.08)],
  3: [V3(0.62, 0.5, 0.78), V3(0.34, 0.22, 0.16)],
  4: [V3(0.3, 0.5, 0.75), V3(0.16, 0.16, 0.16)],
};
const views = () => ({
  general: [V3(0.42, 0.78, 1.25), V3(-0.02, 0.2, 0.0)],
  plc: [V3(-0.19, 0.4, 0.1), V3(-0.25, 0.32, -0.23)],
  consola: [V3(-0.34, 0.42, 0.46), V3(-0.37, 0.12, 0.12)],
  planta: PLANT_VIEW[level.n],
});
function setCam(k) { const [p, t] = views()[k]; stage._camera.position.copy(p); stage._controls.target.copy(t); stage._controls.update(); }
function flyTo(k, instant) {
  const [p1, t1] = views()[k], c = stage._camera, ctl = stage._controls;
  const p0 = c.position.clone(), t0 = ctl.target.clone(), st = performance.now();
  segSet('#views', 'data-view', k);
  const step = () => {
    const u = instant ? 1 : Math.min(1, (performance.now() - st) / 700), e = u < 0.5 ? 2 * u * u : 1 - Math.pow(-2 * u + 2, 2) / 2;
    c.position.lerpVectors(p0, p1, e); ctl.target.lerpVectors(t0, t1, e); ctl.update();
    if (u < 1) requestAnimationFrame(step);
  };
  step();
}
$('#views').addEventListener('click', e => { const b = e.target.closest('[data-view]'); if (b) flyTo(b.dataset.view); });

// ── Etiquetas ──────────────────────────────────────────────────
const NAMES = { PLC: 'CPU', K1: 'Contactor' };
let labelEls = {};
const tagOf = k => level.tags.find(t => t.sym === k);
function buildLabels() {
  const keys = Object.keys(plant.anchors).filter(k => tagOf(k) || NAMES[k]);
  $('#labels').innerHTML = keys.map(k => `<div class="lbl${['S1', 'S2', 'S3'].includes(k) ? ' below' : ''}" data-k="${k}"><b>${k}</b><span class="ln"> ${tagOf(k) ? tagOf(k).short : NAMES[k]}</span></div>`).join('');
  labelEls = {};
  document.querySelectorAll('#labels .lbl').forEach(el => {
    labelEls[el.dataset.k] = el;
    el._wf = el.offsetWidth || 70; el.classList.add('compact'); el._wc = el.offsetWidth || 24; el.classList.remove('compact');
  });
}
let showLabels = true;
$('#lbl-btn').onclick = () => { showLabels = !showLabels; $('#labels').hidden = !showLabels; $('#lbl-btn').setAttribute('aria-pressed', showLabels); };
const tmpV = new THREE.Vector3();
function layoutLabels(w, h, outs, cb) {
  const keys = Object.keys(labelEls).sort((a, b) => reto.devices.includes(b) - reto.devices.includes(a));
  const placed = [];
  for (const k of keys) {
    tmpV.copy(plant.anchors[k]).project(stage._camera);
    const el = labelEls[k], hot = reto.devices.includes(k), dn = el.classList.contains('below');
    const x = ((tmpV.x + 1) / 2) * w, y = ((1 - tmpV.y) / 2) * h, H = 20;
    const boxFor = bw => dn ? [x - bw / 2 - 2, y, x + bw / 2 + 2, y + H + 4] : [x - bw / 2 - 2, y - H - 4, x + bw / 2 + 2, y];
    const freeB = b => !placed.some(p => b[0] < p[2] && b[2] > p[0] && b[1] < p[3] && b[3] > p[1]);
    let bx = boxFor(el._wf), compact = false, dy = 0;
    if (!freeB(bx)) { bx = boxFor(el._wc); compact = true; }
    if (hot) while (!freeB(bx) && Math.abs(dy) < 72) { const s = dn ? 22 : -22; dy += s; bx = [bx[0], bx[1] + s, bx[2], bx[3] + s]; }
    const visible = tmpV.z <= 1 && freeB(bx);
    if (visible) placed.push(bx);
    const act = tagOf(k) && tagOf(k).io === 'ain' ? false : k === 'B1' || k === 'B2' || k === 'B3' ? dev[k] : (k in outs ? outs[k] : k === 'K1' ? (outs.M1 || outs.P1) : !!dev[k]);
    cb(k, el, { visible, x, y: y + dy, dn, compact, hot, act: !!act });
  }
}
function updateLabels(outs) {
  if (!showLabels) return;
  const r = stage.getBoundingClientRect();
  layoutLabels(r.width, r.height, outs, (k, el, o) => {
    if (!o.visible) { el.style.display = 'none'; return; }
    el.style.display = '';
    el.classList.toggle('compact', o.compact); el.classList.toggle('act', o.act); el.classList.toggle('hot', o.hot);
    el.style.transform = `translate(${o.x}px, ${o.y}px) translate(-50%, ${o.dn ? '4px' : '-100%'})`;
  });
}

// ── Diagrama de tiempos ────────────────────────────────────────
const TR_WIN = 10000;
let trace = [], frozen = null;
function traceVal(k) {
  if (k === 'SIM.L') return sim ? Math.round(sim.state.L * 100) : 0;
  if (/^MD/.test(k)) return plc.D[k] || 0;
  if (k[0] === 'I') return typeof physIn[k] === 'number' ? physIn[k] : physIn[k] ? 1 : 0;
  if (k[0] === 'Q') return physOut[k] ? 1 : 0;
  if (k[0] === 'M') return plc.M[k] ? 1 : 0;
  const m = /^([TC]\d+)\.(ET|CV)$/.exec(k);
  if (m) { const o = (k[0] === 'T' ? plc.T : plc.C)[m[1]]; return o ? (k[0] === 'T' ? Math.round(o.et) : o.cv) : 0; }
  return 0;
}
function traceMax(k) {
  if (k === 'SIM.L') return 100;
  if (k === 'IW64') return 27648;
  if (k === 'MD0') return 1;
  if (/^MD/.test(k)) return 100;
  const m = /^([TC]\d+)\.(ET|CV)$/.exec(k);
  if (m) { const r = program.find(x => x.name === m[1]); if (k[0] === 'T') return r && r.PT.value ? r.PT.value * 1000 : 3000; return (r && r.PV.value) || 5; }
  return 1;
}
function traceLabel(k) {
  const t = level.tags.find(t => t.addr === k);
  if (t) return [`%${k}`, `${t.sym} · ${t.short}`];
  if (k === 'SIM.L') return ['Nivel', 'Tanque (%)'];
  if (k === 'MD10') return ['%MD10', 'Nivel escalado (%)'];
  const m = /^([TC]\d+)\.(ET|CV)$/.exec(k);
  if (m) return [`"${m[1]}".${m[2]}`, k[0] === 'T' ? 'Tiempo' : 'Cuenta'];
  return [`%${k}`, 'Marca'];
}
function sampleTrace() {
  if (!reto.trace) return;
  const v = reto.trace.map(traceVal), last = trace[trace.length - 1];
  if (!last || v.some((x, i) => x !== last.v[i])) trace.push({ t: simTime, v });
  while (trace.length > 2 && trace[1].t < simTime - TR_WIN - 1000) trace.shift();
}
function renderTrace() {
  const el = $('#trace');
  if (!reto.trace) { el.innerHTML = ''; return; }
  const W = el.clientWidth; if (!W) return;
  const data = frozen ? frozen.data : trace, tEnd = frozen ? frozen.t : simTime;
  const LW = 108, RW = 46, RH = 34, rows = reto.trace, H = rows.length * RH + 20, x0 = LW, x1 = W - RW;
  const sx = t => Math.max(x0, x1 - ((tEnd - t) / TR_WIN) * (x1 - x0));
  const o = [];
  for (let i = 0; i <= 10; i++) {
    const x = x1 - (i * (x1 - x0)) / 10;
    o.push(`<line x1="${x}" y1="0" x2="${x}" y2="${rows.length * RH}" stroke="#1d1f20" stroke-opacity="${i % 5 ? 0.06 : 0.14}"/>`);
    if (i % 2 === 0) o.push(`<text x="${x}" y="${H - 4}" text-anchor="middle" font-size="10" fill="#5d5d60">${i ? `−${i} s` : 'ahora'}</text>`);
  }
  rows.forEach((k, ri) => {
    const top = ri * RH, hi = top + 7, lo = top + RH - 9, mx = traceMax(k), analog = !/^[IQM]\d/.test(k);
    const [a, s] = traceLabel(k);
    o.push(`<text x="0" y="${top + 15}" font-size="12" font-weight="600" fill="#1d1f20">${a}</text><text x="0" y="${top + 28}" font-size="10" fill="#5d5d60">${s}</text>`);
    o.push(`<line x1="${x0}" y1="${lo}" x2="${x1}" y2="${lo}" stroke="#1d1f20" stroke-opacity=".18"/>`);
    const yv = v => lo - Math.min(1, v / mx) * (lo - hi);
    const pts = []; let prevY = null;
    for (const d of data) { const x = sx(d.t), y = yv(d.v[ri]); if (prevY !== null && !analog) pts.push(`${x},${prevY}`); pts.push(`${x},${y}`); prevY = y; }
    if (data.length) pts.push(`${x1},${prevY}`);
    if (pts.length) {
      o.push(`<polygon points="${x0},${lo} ${pts.join(' ')} ${x1},${lo}" fill="#5980a6" fill-opacity=".14"/>`);
      o.push(`<polyline points="${pts.join(' ')}" fill="none" stroke="#416180" stroke-width="1.75" stroke-linejoin="round"/>`);
    }
    const cur = data.length ? data[data.length - 1].v[ri] : 0;
    const txt = /\.ET$/.test(k) ? `${(cur / 1000).toFixed(1)} s` : k === 'SIM.L' ? `${cur} %` : k === 'MD10' ? `${cur.toFixed(1)} %` : /^MD/.test(k) ? cur.toFixed(3) : String(cur);
    o.push(`<text x="${W - 4}" y="${top + RH / 2 + 4}" text-anchor="end" font-size="13" font-weight="600" fill="#416180">${txt}</text>`);
  });
  el.innerHTML = `<svg width="${W}" height="${H}" font-family="Barlow, system-ui, sans-serif">${o.join('')}</svg>`;
}
$('#tr-freeze').onclick = () => {
  frozen = frozen ? null : { data: trace.slice(), t: simTime };
  $('#tr-freeze').setAttribute('aria-pressed', !!frozen);
  renderTrace();
};

// ── Reporte ────────────────────────────────────────────────────
const dlg = $('#rep-dlg');
function closeDlg() { dlg.hidden = true; }
$('#report-btn').onclick = () => {
  $('#rep-lvl').textContent = `Nivel ${level.n} · ${level.title}`;
  const d = new Date(); $('#rep-date').value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  $('#rep-name').value = store.student || '';
  $('#rep-concl').value = (store.concl || {})[level.n] || '';
  dlg.hidden = false; $('#rep-name').focus();
};
$('#rep-cancel').onclick = closeDlg;
function snapshot(view, outs) {
  const cam = stage._camera, ctl = stage._controls, p = cam.position.clone(), t = ctl.target.clone();
  setCam(view);
  stage._renderer.render(stage._scene, cam);
  const src = stage._renderer.domElement, r = stage.getBoundingClientRect();
  const W = 1200, H = Math.round(W * r.height / r.width), k = W / r.width;
  const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
  const g = cv.getContext('2d');
  g.fillStyle = '#e9e9ea'; g.fillRect(0, 0, W, H);
  g.drawImage(src, 0, 0, W, H);
  g.font = `600 ${Math.round(12 * k)}px Barlow, sans-serif`;
  layoutLabels(r.width, r.height, outs, (key, el, o) => {
    if (!o.visible) return;
    const text = o.compact ? key : el.textContent.trim();
    const tw = g.measureText(text).width + 12 * k, th = 18 * k, x = o.x * k - tw / 2, y = o.dn ? o.y * k + 4 * k : o.y * k - th;
    g.fillStyle = 'rgba(242,242,243,.92)'; g.fillRect(x, y, tw, th);
    g.strokeStyle = o.hot ? '#5980a6' : 'rgba(29,31,32,.25)'; g.lineWidth = 1; g.strokeRect(x, y, tw, th);
    g.fillStyle = '#1d1f20'; g.fillText(text, x + 6 * k, y + th - 5 * k);
  });
  cam.position.copy(p); ctl.target.copy(t); ctl.update();
  return cv.toDataURL('image/jpeg', 0.9);
}
$('#rep-form').onsubmit = e => {
  e.preventDefault();
  const names = $('#rep-name').value.trim(), date = $('#rep-date').value;
  if (!names || !date) return;
  const conclusions = $('#rep-concl').value.trim();
  store.student = names; store.concl = { ...(store.concl || {}), [level.n]: conclusions }; save();
  const outs = outputsToSym(level.tags, physOut);
  const images = [[snapshot('general', outs), 'Vista general del puesto de laboratorio'], [snapshot('planta', outs), `Planta del nivel ${level.n}: ${level.title}`]];
  const entries = level.retos.map(r => {
    const p = level.mode === 'free' ? ED.clone(store.programs[r.id] || []) : resolveProgram(r, store.answers[r.id] || {});
    const tests = runTests(r, ED.clone(p), level);
    return { reto: r, program: p, tests };
  });
  $('#report').innerHTML = buildReport({ level, names, date, images, entries, conclusions });
  closeDlg();
  const imgs = [...document.querySelectorAll('#report img')];
  Promise.all(imgs.map(i => i.complete ? 0 : new Promise(r => { i.onload = i.onerror = r; }))).then(() => setTimeout(() => window.print(), 100));
};

// ── Bucle principal ────────────────────────────────────────────
const phEls = [...document.querySelectorAll('#phases .ph')];
let last = performance.now(), ladderT = 0;
function frame(t) {
  const dtMs = Math.min(50, t - last); last = t; simTime += dtMs;
  if (sim) Object.assign(dev, sim.sensors());
  else if (level.n === 1) dev.B1 = plant.b1 || dev.B1m;
  physIn = physToInputs(level.tags, dev);
  if (mode === 'RUN') {
    if (speed === 'normal') {
      PII = { ...physIn }; plc.I = PII; plc.execute(program, simTime); physOut = { ...plc.Q };
      cycle++; phase = -1; cycleMs = cycleMs * 0.9 + dtMs * 0.1;
    } else {
      const P = 1800; slowT = (slowT + dtMs) % P;
      const np = slowT < 600 ? 0 : slowT < 1200 ? 1 : 2;
      if (np !== phase) {
        phase = np;
        if (phase === 0) { PII = { ...physIn }; cycle++; }
        if (phase === 1) { plc.I = PII; plc.execute(program, simTime); }
        if (phase === 2) physOut = { ...plc.Q };
      }
    }
  } else physOut = {};
  const outs = outputsToSym(level.tags, physOut);
  if (sim) sim.step(dtMs / 1000, outs);
  plant.update(dtMs / 1000, { dev, outs, physIn, physOut, run: mode === 'RUN', sim });
  updateLabels(outs);
  sampleTrace();
  ladderT += dtMs;
  if (ladderT > 90) { ladderT = 0; renderLadder(); renderTruth(); renderTrace(); }
  phEls.forEach((el, i) => { el.classList.toggle('on', mode === 'RUN' && (speed === 'normal' || phase === i)); });
  $('#scan-bar').style.transform = `scaleX(${mode === 'RUN' && speed === 'slow' ? slowT / 1800 : 0})`;
  $('#cyc').textContent = cycle.toLocaleString('es');
  $('#ctime').textContent = mode !== 'RUN' ? 'CPU en STOP: no se ejecuta el programa' : speed === 'normal' ? `≈ ${Math.round(cycleMs)} ms por ciclo` : '1,8 s por ciclo (cámara lenta)';
  const src = [physIn, PII, plc.Q, physOut];
  for (const c of piCells) {
    const ri = +c.dataset.r, i = +c.dataset.i, a = (ri < 2 ? 'I0.' : 'Q0.') + i, na = ri >= 2 && i > 5;
    const v = !na && !!src[ri][a];
    c.classList.toggle('one', v); c.textContent = na ? '' : v ? 1 : 0;
  }
  for (const c of bitCells) { const a = c.dataset.addr, v = a[0] === 'I' ? physIn[a] : physOut[a]; c.textContent = typeof v === 'number' ? v : v ? 1 : 0; c.classList.toggle('one', !!v && typeof v !== 'number'); }
}
function tick(t) { try { frame(t); } catch (err) { console.error(err); } requestAnimationFrame(tick); }

setLevel(store.level || 1);
requestAnimationFrame(tick);
