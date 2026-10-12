// Renderizado SVG de segmentos Ladder con flujo de corriente.
let TAG = {};
export function setTags(tags) { TAG = Object.fromEntries(tags.map(t => [t.addr, t])); }

const CW = 92, CH = 72, RX = 18;
const COL = { ink: '#1d1f20', wire: '#98989b', pwr: '#2a9a56', acc: '#5980a6', acc7: '#416180', muted: '#5d5d60', bg: '#f2f2f3' };
const px = c => RX + c * CW;
const my = r => r * CH + 40;

export function sizeOf(n) {
  if (n.t === 's') { let w = 0, h = 1; for (const i of n.items) { const s = sizeOf(i); w += s.w; h = Math.max(h, s.h); } return { w: Math.max(w, 1), h }; }
  if (n.t === 'p') { let w = 1, h = 0; for (const i of n.items) { const s = sizeOf(i); w = Math.max(w, s.w); h += s.h; } return { w, h: Math.max(h, 1) }; }
  return { w: 1, h: 1 };
}
const L = (x1, y1, x2, y2, on) => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${on ? COL.pwr : COL.wire}" stroke-width="${on ? 3 : 1.5}"/>`;
const T = (x, y, s, o = {}) => `<text x="${x}" y="${y}" text-anchor="${o.a || 'middle'}" font-size="${o.fs || 11}" font-weight="${o.fw || 400}" fill="${o.c || COL.muted}">${s}</text>`;

export function opText(addr) {
  const t = TAG[addr];
  if (t) return { top: '%' + addr, bot: `${t.sym} · ${t.short}` };
  const m = /^([TC]\d+)\.Q$/.exec(addr);
  if (m) return { top: `"${m[1]}".Q`, bot: addr[0] === 'T' ? 'Salida TON' : 'Salida CTU' };
  if (/^MD/.test(addr)) return { top: '%' + addr, bot: 'Real' };
  if (addr[0] === 'M') return { top: '%' + addr, bot: 'Marca' };
  return { top: addr, bot: '' };
}
function labels(x, y, addr, editable) {
  const o = opText(addr);
  return T(x, y - 22, o.top, { fs: 12, fw: 600, c: editable ? COL.acc7 : COL.ink }) + T(x, y + 30, o.bot);
}
const isSel = (sel, slot) => Array.isArray(sel) ? sel.includes(slot) : sel === slot;
const hit = (c, r, slot, sel) => slot ? `<rect class="slot-hit${isSel(sel, slot) ? ' sel' : ''}" data-slot="${slot}" x="${px(c) + 4}" y="${r * CH + 4}" width="${CW - 8}" height="${CH - 2}"/>` : '';

function leaf(n, c, r, o, live, sel) {
  const x = px(c), y = my(r), cx = x + CW / 2;
  const pin = live && n._pin, pout = live && n._pout;
  if (n.t === 'c') {
    const cl = live && n._closed, sc = cl ? COL.pwr : COL.ink;
    o.push(L(x, y, cx - 7, y, pin), L(cx + 7, y, x + CW, y, pout));
    if (cl) o.push(`<rect x="${cx - 7}" y="${y - 13}" width="14" height="26" fill="${COL.pwr}" fill-opacity=".2"/>`);
    o.push(`<line x1="${cx - 7}" y1="${y - 13}" x2="${cx - 7}" y2="${y + 13}" stroke="${sc}" stroke-width="2"/><line x1="${cx + 7}" y1="${y - 13}" x2="${cx + 7}" y2="${y + 13}" stroke="${sc}" stroke-width="2"/>`);
    if (n.kind === 'NC') o.push(`<line x1="${cx - 11}" y1="${y + 12}" x2="${cx + 11}" y2="${y - 12}" stroke="${sc}" stroke-width="1.5"/>`);
    if (n.kind === 'P') o.push(T(cx, y + 4, 'P', { fs: 12, fw: 600, c: sc }));
    o.push(labels(cx, y, n.addr, !!n.slot));
  } else if (n.t === 'coil') {
    const sc = pin ? COL.pwr : COL.ink;
    o.push(L(x, y, cx - 9, y, pin));
    if (pin) o.push(`<circle cx="${cx}" cy="${y}" r="10" fill="${COL.pwr}" fill-opacity=".2"/>`);
    o.push(`<path d="M${cx - 5} ${y - 12} Q${cx - 13} ${y} ${cx - 5} ${y + 12} M${cx + 5} ${y - 12} Q${cx + 13} ${y} ${cx + 5} ${y + 12}" fill="none" stroke="${sc}" stroke-width="2"/>`);
    if (n.ck) o.push(T(cx, y + 4, n.ck, { fs: 12, fw: 600, c: sc }));
    o.push(labels(cx, y, n.addr, !!n.slot));
  } else if (n.t === 'cmp') {
    const cl = live && n._closed, sc = cl ? COL.pwr : COL.ink;
    o.push(L(x, y, cx - 22, y, pin), L(cx + 22, y, x + CW, y, pout));
    o.push(`<rect x="${cx - 22}" y="${y - 15}" width="44" height="30" fill="${cl ? COL.pwr : COL.bg}" fill-opacity="${cl ? 0.2 : 1}" stroke="${sc}" stroke-width="1.5"/>`);
    o.push(T(cx, y + 1, n.op === '<=' ? '&lt;=' : '&gt;=', { fs: 13, fw: 600, c: sc }), T(cx, y + 11, 'Real', { fs: 9, c: COL.muted }));
    o.push(T(cx, y - 22, opText(n.addr).top, { fs: 12, fw: 600, c: COL.acc7 }), T(cx, y + 30, String(n.value), { fs: 11, fw: 600, c: COL.ink }));
  } else if (n.t === 'empty') {
    o.push(L(x, y, cx - 26, y, pin));
    if (n.accept !== 'coil') o.push(L(cx + 26, y, x + CW, y, false));
    o.push(`<rect x="${cx - 26}" y="${y - 16}" width="52" height="32" fill="${COL.bg}" stroke="${COL.acc}" stroke-dasharray="4 3"/>`);
    o.push(T(cx, y + 5, '?', { fs: 16, fw: 600, c: COL.acc7 }), T(cx, y + 30, n.optional ? 'Opcional' : n.accept === 'coil' ? 'Bobina' : 'Contacto', { c: COL.acc7 }));
  }
  o.push(hit(c, r, n.slot, sel));
}

function node(n, c, r, w, o, live, sel) {
  if (n.t === 's') {
    let x = c;
    n.items.forEach((it, i) => {
      const s = sizeOf(it);
      node(it, x, r, i === n.items.length - 1 ? w - (x - c) : s.w, o, live, sel);
      x += s.w;
    });
    return;
  }
  if (n.t === 'p') {
    let y = r; const ys = [];
    for (const it of n.items) { node(it, c, y, w, o, live, sel); ys.push(y); y += sizeOf(it).h; }
    const a = my(ys[0]), b = my(ys[ys.length - 1]);
    o.push(L(px(c), a, px(c), b, live && n._pin), L(px(c + w), a, px(c + w), b, live && n._pout));
    return;
  }
  leaf(n, c, r, o, live, sel);
  if (w > 1) o.push(L(px(c + 1), my(r), px(c + w), my(r), live && n._pout));
}

const fmtTime = v => Number.isInteger(v) ? `T#${v}s` : (v < 1 ? `T#${Math.round(v * 1000)}ms` : `T#${Math.floor(v)}s${Math.round((v % 1) * 1000)}ms`);

function param(n, c, r, o, sel, fmt) {
  const X0 = px(c + 1) + 8, y = my(r);
  if (n.value == null) {
    o.push(`<rect x="${X0 - 58}" y="${y - 13}" width="46" height="26" fill="${COL.bg}" stroke="${COL.acc}" stroke-dasharray="4 3"/>`, T(X0 - 35, y + 5, '?', { fs: 15, fw: 600, c: COL.acc7 }));
  } else o.push(T(X0 - 10, y + 4, fmt(n.value), { a: 'end', fs: 12, fw: 600, c: COL.acc7 }));
  o.push(L(X0 - 8, y, X0, y, false), hit(c, r, n.slot, sel));
}

const fmtNum = v => (Math.abs(v) < 10 ? v.toFixed(3) : v.toFixed(1));
function word(n, c, r, o, sel, side, live, val) {
  const y = my(r), X = side === 'left' ? px(c + 1) - 2 : px(c) + 2;
  if (!n.addr) o.push(`<rect x="${side === 'left' ? X - 54 : X + 4}" y="${y - 13}" width="50" height="26" fill="${COL.bg}" stroke="${COL.acc}" stroke-dasharray="4 3"/>`, T(side === 'left' ? X - 29 : X + 29, y + 5, '?', { fs: 15, fw: 600, c: COL.acc7 }));
  else {
    o.push(T(X + (side === 'left' ? -8 : 8), y + 4, '%' + n.addr, { a: side === 'left' ? 'end' : 'start', fs: 12, fw: 600, c: COL.acc7 }));
    if (live) o.push(T(X + (side === 'left' ? -8 : 8), y + 18, n.addr[0] === 'I' ? String(Math.round(val)) : fmtNum(val), { a: side === 'left' ? 'end' : 'start', fs: 10, c: COL.muted }));
  }
  o.push(hit(c, r, n.slot, sel));
}
function box(o, X0, X1, Y0, Y1, title, name, pl, pr, frac) {
  o.push(`<rect x="${X0}" y="${Y0}" width="${X1 - X0}" height="${Y1 - Y0}" fill="${COL.bg}" stroke="${COL.ink}" stroke-width="1.5"/>`);
  if (name) o.push(T((X0 + X1) / 2, Y0 - 5, `"${name}"`, { fs: 11, c: COL.ink }));
  o.push(T((X0 + X1) / 2, Y0 + 15, title, { fs: 13, fw: 600, c: COL.ink }));
  for (const [l, r] of pl) o.push(T(X0 + 6, my(r) + 4, l, { a: 'start', c: COL.ink }));
  for (const [l, r] of pr) o.push(T(X1 - 6, my(r) + 4, l, { a: 'end', c: COL.ink }));
  if (frac == null) return;
  const bx0 = X0 + 30, bx1 = X1 - 30, by = Y1 - 14;
  o.push(`<rect x="${bx0}" y="${by}" width="${bx1 - bx0}" height="5" fill="none" stroke="${COL.wire}"/>`);
  if (frac > 0) o.push(`<rect x="${bx0}" y="${by}" width="${(bx1 - bx0) * Math.min(1, frac)}" height="5" fill="${COL.acc}"/>`);
}

export function renderRung(r, idx, live, sel, opts = {}) {
  const o = [];
  let W, H;
  if (r.type === 'coil') {
    const s = sizeOf(r.logic);
    const more = r.more || [];
    W = Math.max(s.w, 3) + (more.length ? 2 : 1); H = s.h;
    H = Math.max(H, 1 + more.length);
    const LW = more.length ? W - 2 : W - 1;
    node(r.logic, 0, 0, LW, o, live, sel);
    if (more.length) o.push(L(px(LW), my(0), px(W - 1), my(0), live && r.out._pin));
    leaf(r.out, W - 1, 0, o, live, sel);
    more.forEach((m, i) => leaf(m, W - 1, i + 1, o, live, sel));
    if (more.length) o.push(L(px(W - 1), my(0), px(W - 1), my(more.length), live && r.out._pin));
  } else if (r.type === 'NORM_X' || r.type === 'SCALE_X') {
    const s = sizeOf(r.EN), inW = Math.max(2, s.w), en = s.h;
    W = inW + 4; H = en + 3;
    const X0 = px(inW) + 8, X1 = px(inW + 2) - 8;
    node(r.EN, 0, 0, inW, o, live, sel);
    o.push(L(px(inW), my(0), X0, my(0), live && r.EN._pout));
    box(o, X0, X1, my(0) - 22, my(H - 1) + 22, r.type === 'NORM_X' ? 'NORM_X' : 'SCALE_X', null,
      [['EN', 0], ['MIN', en], ['VALUE', en + 1], ['MAX', en + 2]], [['ENO', 0], ['OUT', en + 1]], null);
    o.push(T((X0 + X1) / 2, my(0) - 7 + 22 + 14, r.type === 'NORM_X' ? 'Int → Real' : 'Real → Real', { fs: 10 }));
    param(r.MIN, inW - 1, en, o, sel, v => String(v));
    word(r.VALUE, inW - 1, en + 1, o, sel, 'left', live, r._val || 0);
    param(r.MAX, inW - 1, en + 2, o, sel, v => String(v));
    word(r.OUT, inW + 2, en + 1, o, sel, 'right', live, r._out || 0);
    o.push(L(X1, my(0), X1 + 16, my(0), live && r._en));
  } else {
    const isT = r.type === 'TON';
    const inputs = isT ? [['IN', r.IN]] : [['CU', r.CU], ['R', r.R]];
    let row = 0, inW = 2; const rows = [];
    for (const [, n] of inputs) { const s = sizeOf(n); rows.push(row); row += s.h; inW = Math.max(inW, s.w); }
    const pRow = row, bx = inW;
    W = bx + 3; H = pRow + 1;
    const X0 = px(bx) + 8, X1 = px(bx + 2) - 8;
    inputs.forEach(([, n], i) => {
      node(n, 0, rows[i], inW, o, live, sel);
      o.push(L(px(inW), my(rows[i]), X0, my(rows[i]), live && n._pout));
    });
    const frac = live ? (isT ? (r._pt ? r._et / r._pt : 0) : (r._pv ? r._cv / r._pv : 0)) : 0;
    box(o, X0, X1, my(0) - 22, my(pRow) + 22, r.type, r.name,
      [...inputs.map(([l], i) => [l, rows[i]]), [isT ? 'PT' : 'PV', pRow]],
      [['Q', 0], [isT ? 'ET' : 'CV', pRow]], frac);
    param(isT ? r.PT : r.PV, bx - 1, pRow, o, sel, isT ? fmtTime : v => String(v));
    const val = !live ? '—' : isT ? `${((r._et || 0) / 1000).toFixed(1)} s` : String(r._cv || 0);
    o.push(T(X1 + 8, my(pRow) + 4, val, { a: 'start', fs: 13, fw: 600, c: COL.acc7 }));
    o.push(L(X1, my(0), px(bx + 2), my(0), live && r._q));
    leaf(r.out, bx + 2, 0, o, live, sel);
  }
  const w = px(W) + 14, h = H * CH + 8;
  const rail = `<line x1="${RX}" y1="4" x2="${RX}" y2="${h - 4}" stroke="${live ? COL.pwr : COL.ink}" stroke-width="3"/>`;
  return `<div class="rung"><div class="rung-head"><span class="rung-n">Segmento ${idx + 1}</span><span class="rung-c">${r.comment || (r.type === 'TON' || r.type === 'CTU' ? `${r.type} ${r.name}` : r.type !== 'coil' ? r.type : '')}</span>${opts.tools || ''}</div><svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" font-family="Barlow, system-ui, sans-serif">${rail}${o.join('')}</svg></div>`;
}
