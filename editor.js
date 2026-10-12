// Operaciones del editor Ladder libre (niveles 2–4) y utilidades para comprobar programas.
let uid = 0;
export const nid = () => 'n' + Date.now().toString(36) + (uid++).toString(36);
export const emptyC = () => ({ t: 'empty', accept: 'contact', slot: nid() });
const emptyCoil = optional => ({ t: 'empty', accept: 'coil', slot: nid(), ...(optional ? { optional: true } : {}) });
const param = kind => ({ t: 'param', kind, value: null, slot: nid() });
const ROOTS = ['logic', 'IN', 'CU', 'R', 'EN'];
const word = () => ({ t: 'word', addr: null, slot: nid() });
export const WORDS = ['IW64', 'MD0', 'MD4', 'MD10'];

function nextName(prog, type, p) {
  const used = new Set(prog.filter(r => r.type === type).map(r => r.name));
  let i = 1; while (used.has(p + i)) i++;
  return p + i;
}
export function newRung(type, prog) {
  if (type === 'TON') return { type: 'TON', name: nextName(prog, 'TON', 'T'), IN: emptyC(), PT: param('time'), out: emptyCoil(true) };
  if (type === 'CTU') return { type: 'CTU', name: nextName(prog, 'CTU', 'C'), CU: emptyC(), R: emptyC(), PV: param('int'), out: emptyCoil(true) };
  if (type === 'NORM_X' || type === 'SCALE_X') return { type, EN: { ...emptyC(), optional: true }, MIN: param('num'), VALUE: word(), MAX: param('num'), OUT: word() };
  return { type: 'coil', logic: emptyC(), out: emptyCoil(false) };
}

function find(n, id, path) {
  if (!n) return null;
  if (n.slot === id) return path.concat([{ node: n }]);
  if (n.items) for (let i = 0; i < n.items.length; i++) {
    const h = find(n.items[i], id, path.concat([{ node: n, idx: i }]));
    if (h) return h;
  }
  return null;
}
export function locate(prog, id) {
  for (let ri = 0; ri < prog.length; ri++) {
    const r = prog[ri];
    if (r.more) for (let i = 0; i < r.more.length; i++) if (r.more[i].slot === id) return { node: r.more[i], parent: null, idx: i, path: [{ node: r.more[i] }], rung: r, ri, key: 'more' };
    for (const k of ['logic', 'IN', 'CU', 'R', 'EN', 'out', 'PT', 'PV', 'MIN', 'VALUE', 'MAX', 'OUT']) {
      const p = find(r[k], id, []);
      if (p) {
        const last = p.length - 1, par = last > 0 ? p[last - 1] : null;
        return { node: p[last].node, parent: par ? par.node : null, idx: par ? par.idx : -1, path: p, rung: r, ri, key: k };
      }
    }
  }
  return null;
}
function replace(L, nn) { if (L.parent) L.parent.items[L.idx] = nn; else if (L.key === 'more') L.rung.more[L.idx] = nn; else L.rung[L.key] = nn; }
function normalize(n) {
  if (!n.items) return n;
  n.items = n.items.map(normalize).flatMap(c => (c.t === n.t ? c.items : [c]));
  return n.items.length === 1 ? n.items[0] : n;
}
function norm(r) { for (const k of ROOTS) if (r[k]) r[k] = normalize(r[k]); }

export function ancestorPar(prog, id) {
  const L = locate(prog, id); if (!L) return null;
  for (let i = L.path.length - 2; i >= 0; i--) if (L.path[i].node.t === 'p') return L.path[i].node.slot || (L.path[i].node.slot = nid());
  return null;
}
export function insertSeries(prog, id, side) {
  const L = locate(prog, id); if (!L) return null;
  const e = emptyC();
  if (L.parent && L.parent.t === 's') L.parent.items.splice(L.idx + (side === 'right' ? 1 : 0), 0, e);
  else replace(L, { t: 's', slot: nid(), items: side === 'right' ? [L.node, e] : [e, L.node] });
  norm(L.rung);
  return e.slot;
}
export function addParallel(prog, id) {
  const L = locate(prog, id); if (!L) return null;
  const e = emptyC();
  if (L.parent && L.parent.t === 'p') L.parent.items.splice(L.idx + 1, 0, e);
  else replace(L, { t: 'p', slot: nid(), items: [L.node, e] });
  norm(L.rung);
  return e.slot;
}
export function sameSeries(prog, ids) {
  const locs = ids.map(i => locate(prog, i));
  return locs.every(l => l && l.parent && l.parent.t === 's' && l.parent === locs[0].parent);
}
export function parallelRange(prog, ids) {
  if (ids.length < 2) return addParallel(prog, ids[0]);
  const locs = ids.map(i => locate(prog, i));
  if (!sameSeries(prog, ids)) return null;
  const par = locs[0].parent, idxs = locs.map(l => l.idx), a = Math.min(...idxs), b = Math.max(...idxs);
  const group = par.items.slice(a, b + 1), e = emptyC();
  par.items.splice(a, b - a + 1, { t: 'p', slot: nid(), items: [group.length > 1 ? { t: 's', slot: nid(), items: group } : group[0], e] });
  norm(locs[0].rung);
  return e.slot;
}
export function removeNode(prog, id) {
  const L = locate(prog, id); if (!L || !ROOTS.includes(L.key)) return;
  if (L.parent) L.parent.items.splice(L.idx, 1); else L.rung[L.key] = L.key === 'EN' ? { ...emptyC(), optional: true } : emptyC();
  norm(L.rung);
}
export function setContact(prog, id, kind, addr, v = {}) { const L = locate(prog, id); if (L) replace(L, kind === 'CMP' ? { t: 'cmp', op: v.op, addr, value: v.value, slot: id } : { t: 'c', kind, addr, slot: id }); }
export function setWord(prog, id, addr) { const L = locate(prog, id); if (L) L.node.addr = addr; }
export function addCoil(prog, id) {
  const L = locate(prog, id); if (!L || L.rung.type !== 'coil') return null;
  const c = emptyCoil(false); L.rung.more = L.rung.more || [];
  L.rung.more.splice(L.key === 'more' ? L.idx + 1 : 0, 0, c);
  return c.slot;
}
export function setCoil(prog, id, addr, ck) {
  const L = locate(prog, id); if (!L) return;
  if (!addr && L.key === 'more') { L.rung.more.splice(L.idx, 1); return; }
  if (!addr && L.key === 'out' && L.rung.more && L.rung.more.length) { L.rung.out = L.rung.more.shift(); return; }
  const opt = L.node.optional ? { optional: true } : {};
  replace(L, addr ? { t: 'coil', addr, ck: ck || '', slot: id, ...opt } : { t: 'empty', accept: 'coil', slot: id, ...opt });
}
export function setParam(prog, id, value) { const L = locate(prog, id); if (L) L.node.value = value; }
export const clone = p => JSON.parse(JSON.stringify(p, (k, v) => (k[0] === '_' ? undefined : v)));

// Comprobaciones para la guía y el diagnóstico.
export function walk(n, f) { if (!n) return; f(n); if (n.items) n.items.forEach(c => walk(c, f)); }
export function hasC(n, kind, addr) { let ok = false; walk(n, x => { if (x.t === 'c' && x.addr === addr && (!kind || x.kind === kind)) ok = true; }); return ok; }
const outsOf = r => [r.out, ...(r.more || [])].filter(o => o && o.t === 'coil');
export const coilRungs = (prog, addr, ck = '') => prog.filter(r => r.type === 'coil' && outsOf(r).some(o => o.addr === addr && (o.ck || '') === ck));
export const coilWith = (prog, addr, ck, f) => coilRungs(prog, addr, ck).some(r => f(r.logic));
export const box = (prog, name) => prog.find(r => r.name === name && r.type !== 'coil');
export const writes = (prog, addr) => prog.some(r => outsOf(r).some(o => o.addr === addr));
export const cmpWith = (n, addr, op, value) => { let ok = false; walk(n, x => { if (x.t === 'cmp' && x.addr === addr && x.op === op && x.value === value) ok = true; }); return ok; };
export const mathBox = (prog, type, f) => prog.some(r => r.type === type && f(r));
