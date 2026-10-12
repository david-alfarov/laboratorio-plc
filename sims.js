// Plantas simuladas, compartidas por la escena 3D y las pruebas automáticas.
export function tankSim(test) {
  const s = { L: test ? 0.05 : 0.1 };
  return {
    state: s,
    step(dt, out) {
      if (out.P1) s.L += 0.12 * dt;
      if (out.Y1) s.L -= 0.05 * dt;
      s.L = Math.max(0, Math.min(1, s.L));
    },
    sensors() { return { B2: s.L > 0.15, B3: s.L > 0.85, B4: Math.round(s.L * 27648) }; },
  };
}

export const SORT = { X0: -0.14, X1: 0.42, V: 0.12, SP: 0.2, XB2: 0.06, XB1: 0.2, XB3: 0.38, HT: 0.07, HS: 0.04 };
export function sorterSim(test) {
  const s = { boxes: [], push: 0, pushed: 0, wrong: 0, ends: 0, pat: test ? [1, 0, 1, 1, 0, 0, 1, 0, 1, 0, 0, 1] : null, k: 0, id: 0 };
  return {
    state: s,
    step(dt, out) {
      s.push = Math.max(0, Math.min(1, s.push + (out.Y1 ? 1 : -1) * dt / 0.25));
      const onBelt = s.boxes.filter(b => b.st === 'belt');
      if (out.M1) {
        const minX = onBelt.reduce((a, b) => Math.min(a, b.x), Infinity);
        if (minX > SORT.X0 + 0.04 + SORT.SP - 1e-6) {
          const tall = s.pat ? !!s.pat[s.k++ % s.pat.length] : Math.random() < 0.45;
          s.boxes.push({ id: s.id++, x: SORT.X0 + 0.04, tall, st: 'belt', t: 0 });
        }
      }
      for (const b of s.boxes) {
        if (b.st === 'belt') {
          if (out.M1) b.x += SORT.V * dt;
          if (s.push > 0.5 && Math.abs(b.x - SORT.XB1) < 0.03) { b.st = 'side'; b.t = 0; s.pushed++; if (!b.tall) s.wrong++; }
          else if (b.x > SORT.X1 - 0.01) { b.st = 'end'; b.t = 0; s.ends++; if (b.tall) s.wrong++; }
        } else b.t += dt;
      }
      s.boxes = s.boxes.filter(b => b.st === 'belt' || b.t < 2);
    },
    sensors() {
      const on = (x, f) => s.boxes.some(b => b.st === 'belt' && Math.abs(b.x - x) < 0.026 && f(b));
      return { B1: on(SORT.XB1, () => true), B2: on(SORT.XB2, b => b.tall), B3: on(SORT.XB3, () => true) };
    },
  };
}
