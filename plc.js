// Motor de simulación PLC: evaluación Ladder, TON, CTU, S/R, flancos, pruebas automáticas y revisión de errores.
export function physToInputs(tags, d) {
  const o = {};
  for (let i = 0; i < 8; i++) o['I0.' + i] = false;
  for (const t of tags) {
    if (t.io === 'in') o[t.addr] = t.wiring === 'NC' ? !d[t.sym] : !!d[t.sym];
    else if (t.io === 'ain') o[t.addr] = d[t.sym] || 0;
  }
  return o;
}
export function outputsToSym(tags, Q) {
  const o = {};
  for (const t of tags) if (t.io === 'out') o[t.sym] = !!Q[t.addr];
  return o;
}

export function ev(n, pin, plc) {
  n._pin = pin;
  let p = false;
  if (n.t === 's') { p = pin; for (const it of n.items) p = ev(it, p, plc); }
  else if (n.t === 'p') { for (const it of n.items) p = ev(it, pin, plc) || p; }
  else if (n.t === 'c') {
    const v = plc.read(n.addr);
    if (n.kind === 'P') { const key = n.slot || n.addr; n._closed = v && !plc.E[key]; plc.E[key] = v; }
    else n._closed = n.kind === 'NO' ? v : !v;
    p = pin && n._closed;
  } else if (n.t === 'cmp') {
    const v = plc.num(n.addr);
    n._v = v;
    n._closed = n.op === '<=' ? v <= n.value : v >= n.value;
    p = pin && n._closed;
  } else if (n.t === 'empty' && n.optional) { n._closed = true; p = pin; }
  else { n._closed = false; p = false; }
  n._pout = p;
  return p;
}

export class PLC {
  constructor() { this.reset(); }
  reset() { this.I = {}; this.Q = {}; this.M = {}; this.E = {}; this.T = {}; this.C = {}; this.D = {}; }
  num(a) { return a ? (a[0] === 'I' ? +this.I[a] || 0 : +this.D[a] || 0) : 0; }
  read(a) {
    const c = a[0];
    if (c === 'I') return !!this.I[a];
    if (c === 'Q') return !!this.Q[a];
    if (c === 'M') return !!this.M[a];
    const m = /^([TC]\d+)\.Q$/.exec(a);
    if (m) { const o = (a[0] === 'T' ? this.T : this.C)[m[1]]; return !!(o && o.q); }
    return false;
  }
  coil(n, p) {
    if (!n) return;
    n._pin = p;
    if (n.t !== 'coil' || !n.addr) return;
    const img = n.addr[0] === 'Q' ? this.Q : n.addr[0] === 'M' ? this.M : null;
    if (!img) return;
    if (n.ck === 'S') { if (p) img[n.addr] = true; }
    else if (n.ck === 'R') { if (p) img[n.addr] = false; }
    else img[n.addr] = p;
  }
  execute(prog, now) {
    for (const r of prog) {
      if (r.type === 'coil') { const p = ev(r.logic, true, this); this.coil(r.out, p); if (r.more) for (const m of r.more) this.coil(m, p); }
      else if (r.type === 'NORM_X' || r.type === 'SCALE_X') {
        const en = ev(r.EN, true, this), mn = r.MIN.value, mx = r.MAX.value;
        r._en = en;
        if (en && mn != null && mx != null && mx !== mn && r.VALUE.addr && r.OUT.addr) {
          const v = this.num(r.VALUE.addr);
          this.D[r.OUT.addr] = r.type === 'NORM_X' ? (v - mn) / (mx - mn) : v * (mx - mn) + mn;
        }
        r._val = this.num(r.VALUE.addr); r._out = this.num(r.OUT.addr);
      }
      else if (r.type === 'TON') {
        const inp = ev(r.IN, true, this);
        const pt = r.PT.value != null ? r.PT.value * 1000 : null;
        const t = this.T[r.name] || (this.T[r.name] = { et: 0, q: false, prev: false, start: 0 });
        if (inp) {
          if (!t.prev) t.start = now;
          const el = now - t.start;
          t.et = pt == null ? 0 : Math.min(el, pt);
          t.q = pt != null && el >= pt;
        } else { t.et = 0; t.q = false; }
        t.prev = inp;
        r._in = inp; r._et = t.et; r._pt = pt; r._q = t.q;
        this.coil(r.out, t.q);
      } else if (r.type === 'CTU') {
        const cu = ev(r.CU, true, this), rs = ev(r.R, true, this);
        const c = this.C[r.name] || (this.C[r.name] = { cv: 0, q: false, prev: false });
        const pv = r.PV.value;
        if (rs) c.cv = 0; else if (cu && !c.prev) c.cv = Math.min(c.cv + 1, 32767);
        c.prev = cu;
        c.q = pv != null && c.cv >= pv;
        r._cu = cu; r._r = rs; r._cv = c.cv; r._pv = pv; r._q = c.q;
        this.coil(r.out, c.q);
      }
    }
  }
}

// Modo guiado: plantilla + respuestas → programa ejecutable.
function resolveNode(tn, ans) {
  if (tn.slot) {
    const a = ans[tn.slot];
    if (tn.accept === 'contact') return a && a.addr && a.kind ? { t: 'c', kind: a.kind, addr: a.addr, slot: tn.slot } : { t: 'empty', accept: 'contact', slot: tn.slot };
    if (tn.accept === 'coil') return a && a.addr ? { t: 'coil', addr: a.addr, ck: a.coil || '', slot: tn.slot } : { t: 'empty', accept: 'coil', slot: tn.slot };
    return { t: 'param', kind: tn.accept, value: a && a.value != null ? a.value : null, slot: tn.slot };
  }
  if (tn.t === 's' || tn.t === 'p') return { t: tn.t, items: tn.items.map(i => resolveNode(i, ans)) };
  return { ...tn };
}
export const RUNG_KEYS = ['logic', 'out', 'IN', 'PT', 'CU', 'R', 'PV', 'EN', 'MIN', 'VALUE', 'MAX', 'OUT', 'more'];
export function resolveProgram(reto, ans) {
  return reto.rungs.map(r => {
    const o = { type: r.type, name: r.name, comment: r.comment };
    for (const k of RUNG_KEYS) if (r[k]) o[k] = resolveNode(r[k], ans);
    return o;
  });
}
export function collectSlots(reto) {
  const out = {};
  const walk = (n, ri) => { if (n.slot) out[n.slot] = { accept: n.accept, rung: ri }; if (n.items) n.items.forEach(i => walk(i, ri)); };
  reto.rungs.forEach((r, ri) => RUNG_KEYS.forEach(k => r[k] && walk(r[k], ri)));
  return out;
}
export function countEmpty(prog) {
  let n = 0;
  const walk = x => {
    if (!x) return;
    if (x.t === 'empty' && !x.optional) n++;
    if (x.t === 'param' && (x.value == null || isNaN(x.value))) n++;
    if (x.t === 'word' && !x.addr) n++;
    if (x.items) x.items.forEach(walk);
  };
  for (const r of prog) RUNG_KEYS.forEach(k => (Array.isArray(r[k]) ? r[k] : [r[k]]).forEach(walk));
  return n;
}

// Pruebas sobre una copia aislada del PLC (ciclo de 10 ms), con la planta simulada si el nivel la tiene.
export function runTests(reto, prog, level) {
  const plc = new PLC();
  const dev = {};
  const sim = level.sim ? level.sim(true) : null;
  if (sim && reto.simInit) Object.assign(sim.state, reto.simInit);
  let now = 0, failed = false, inv = null, bad = 0;
  const res = [];
  const ctx = out => ({ out, sim: sim && sim.state, plc });
  let out = {};
  const scan = () => {
    now += 10;
    if (sim) Object.assign(dev, sim.sensors());
    plc.I = physToInputs(level.tags, dev);
    plc.execute(prog, now);
    out = outputsToSym(level.tags, plc.Q);
    if (sim) sim.step(0.01, out);
    // Se tolera un solo ciclo de transición (como en un PLC real, invisible a simple vista).
    if (reto.invariant && inv == null) { bad = reto.invariant.fn(ctx(out)) ? 0 : bad + 1; if (bad >= 3) inv = now; }
  };
  scan();
  for (const st of reto.tests) {
    Object.assign(dev, st.set || {});
    if (sim && st.setSim) Object.assign(sim.state, st.setSim);
    const end = now + (st.wait || 0);
    while (now < end) scan();
    let ok = true, detail = '';
    if (st.until) {
      const lim = now + (st.timeout || 20000);
      while (now < lim && !st.until(ctx(out))) scan();
      if (!st.until(ctx(out))) { ok = false; detail = `No ocurrió en ${(st.timeout || 20000) / 1000} s.`; }
    }
    if (!st.expect && !st.check && !st.until) continue;
    if (failed) { res.push({ msg: st.msg, state: 'skip' }); continue; }
    if (ok && st.expect) {
      const bad = Object.entries(st.expect).filter(([k, v]) => !!out[k] !== v);
      if (bad.length) { ok = false; detail = bad.map(([k, v]) => `${k} vale ${out[k] ? 1 : 0}, se esperaba ${v ? 1 : 0}`).join(' · '); }
    }
    if (ok && st.check && !st.check(ctx(out))) { ok = false; detail = st.detail ? st.detail(ctx(out)) : ''; }
    res.push({ msg: st.msg, state: ok ? 'pass' : 'fail', detail });
    if (!ok) failed = true;
  }
  if (reto.invariant) res.push({ msg: reto.invariant.msg, state: failed ? 'skip' : inv == null ? 'pass' : 'fail', detail: inv != null ? `Falló a los ${(inv / 1000).toFixed(1).replace('.', ',')} s.` : '' });
  return res;
}

// Revisión genérica de errores típicos (editor libre).
const walkT = (n, f) => { if (!n) return; f(n); if (n.items) n.items.forEach(c => walkT(c, f)); };
export function lint(prog, tags, reto) {
  const d = [];
  const T = Object.fromEntries(tags.map(t => [t.addr, t]));
  const name = a => T[a] ? `%${a} (${T[a].sym})` : /^[TC]\d+\.Q$/.test(a) ? `"${a.split('.')[0]}".Q` : '%' + a;
  const w = {};
  prog.forEach((r, i) => [r.out, ...(r.more || [])].forEach(o => { if (o && o.t === 'coil' && !o.ck) (w[o.addr] = w[o.addr] || []).push(i + 1); }));
  for (const [a, l] of Object.entries(w)) if (l.length > 1) d.push(`${name(a)} se escribe con bobinas normales en los segmentos ${l.join(' y ')}: solo cuenta la última. Une las condiciones en un único segmento o usa bobinas S/R.`);
  const seen = new Set();
  prog.forEach(r => {
    if (r.out && r.out.ck === 'R') return;
    ['logic', 'IN', 'CU', 'R'].forEach(k => walkT(r[k], x => {
      if (x.t === 'c' && x.kind === 'NC' && T[x.addr] && T[x.addr].stop && !seen.has(x.addr)) {
        seen.add(x.addr);
        d.push(`El contacto de ${name(x.addr)} es NC, pero ${T[x.addr].sym} está cableado NC: en reposo su bit vale 1 y el contacto queda abierto. Para detener al pulsar, usa un contacto NO.`);
      }
    }));
  });
  const boxes = new Set(prog.filter(r => r.type !== 'coil').map(r => r.name));
  const miss = new Set();
  prog.forEach(r => ['logic', 'IN', 'CU', 'R', 'EN'].forEach(k => walkT(r[k], x => {
    if (x.t === 'c' && /^[TC]\d+\.Q$/.test(x.addr) && !boxes.has(x.addr.split('.')[0])) miss.add(x.addr.split('.')[0]);
  })));
  miss.forEach(n => d.push(`Usas "${n}".Q, pero no hay ningún ${n[0] === 'T' ? 'TON' : 'CTU'} llamado ${n}.`));
  (reto.outputs || []).forEach(a => { if (!prog.some(r => [r.out, ...(r.more || [])].some(o => o && o.t === 'coil' && o.addr === a))) d.push(`Ningún segmento escribe ${name(a)}.`); });
  return d;
}
