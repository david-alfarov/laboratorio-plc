// Escena 3D: puesto común (banco, panel con PLC, consola) + planta de cada nivel.
import { SORT } from './sims.js';

export function buildPlant(THREE) {
  const M = (name, color, rough = 0.6, metal = 0, extra = {}) =>
    new THREE.MeshStandardMaterial({ name, color, roughness: rough, metalness: metal, ...extra });
  const m = {
    bench: M('mesa_laminado', 0xd8d4cb, 0.85), benchEdge: M('mesa_canto', 0x55585c, 0.6),
    plate: M('placa_galvanizada', 0xc2c6cb, 0.45, 0.3), alu: M('aluminio', 0xb2b8bf, 0.4, 0.35),
    duct: M('canaleta_gris', 0xa0a5aa, 0.75), housing: M('carcasa_antracita', 0x383b40, 0.55),
    light: M('carcasa_gris_claro', 0xd5d7da, 0.6), rubber: M('goma_negra', 0x222426, 0.85),
    cleat: M('taco_banda', 0x45484c, 0.8), terminal: M('borne_gris', 0x8c9197, 0.6),
    termBlue: M('borne_azul', 0x456c9e, 0.6), steel: M('acero', 0xc6cad0, 0.3, 0.4),
    wire: M('cable_azul', 0x31508a, 0.5), motor: M('pintura_motor', 0x5a7c9e, 0.45, 0.2),
    cardboard: M('carton', 0xb98c5b, 0.9), cardboardDark: M('carton_oscuro', 0x8f6a43, 0.9),
    yellow: M('amarillo_seguridad', 0xe6bd1f, 0.5), red: M('pulsador_rojo', 0xbf302a, 0.4),
    green: M('pulsador_verde', 0x2e9a4b, 0.4), black: M('pulsador_negro', 0x1c1d1f, 0.45),
    white: M('rotulo_blanco', 0xefefec, 0.7), reflector: M('reflector_rojo', 0xa8241c, 0.3),
    asphalt: M('asfalto', 0x3d4044, 0.9), curb: M('vereda', 0xb9bab6, 0.85), pipe: M('tuberia_pvc', 0x9aa0a6, 0.5),
    acrylic: M('acrilico', 0xd6e4ef, 0.1, 0, { transparent: true, opacity: 0.28, depthWrite: false, side: THREE.DoubleSide }),
    water: M('agua', 0x4f86b8, 0.2, 0, { transparent: true, opacity: 0.78 }),
    visor: M('visera_semaforo', 0x383b40, 0.55, 0, { side: THREE.DoubleSide }),
  };
  const glow = (name, off, on) => ({ off: M(name + '_apagado', off, 0.3), on: M(name + '_encendido', on, 0.3, 0, { emissive: on, emissiveIntensity: 1.4 }) });
  const lampG = glow('lente_verde', 0x23432c, 0x5dff8a), lampA = glow('lente_ambar', 0x5a4214, 0xffb11f), lampR = glow('lente_roja', 0x4d1a17, 0xff3d30);
  const ledG = glow('led_verde', 0x1d2e22, 0x48ff7a), ledA = glow('led_ambar', 0x3a2e12, 0xffb11f), ledR = glow('led_rojo', 0x3a1a18, 0xff3d30);

  const common = new THREE.Group(); common.name = 'puesto_comun';
  const box = (name, w, h, d, mat, x, y, z, p = common) => { const o = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat); o.name = name; o.position.set(x, y, z); p.add(o); return o; };
  const cyl = (name, r, h, mat, x, y, z, p = common, seg = 32) => { const o = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat); o.name = name; o.position.set(x, y, z); p.add(o); return o; };
  const dome = (name, r, sy, mat, x, y, z, p) => { const o = new THREE.Mesh(new THREE.SphereGeometry(r, 32, 12, 0, Math.PI * 2, 0, Math.PI / 2), mat); o.name = name; o.position.set(x, y, z); o.scale.y = sy; p.add(o); return o; };
  const grp = (name, p = common) => { const g = new THREE.Group(); g.name = name; p.add(g); return g; };
  const zAxis = o => { o.rotation.x = Math.PI / 2; return o; };
  const xAxis = o => { o.rotation.z = Math.PI / 2; return o; };
  const V = (x, y, z) => new THREE.Vector3(x, y, z);
  const Y0 = 0.04;
  const commonPick = [];
  const pick = (list, dev, ...meshes) => meshes.forEach(o => { o.userData.dev = dev; list.push(o); });

  // ── Banco y panel ─────────────────────────────────────────────
  box('mesa_tablero', 1.24, 0.04, 0.74, m.bench, 0, 0.02, 0);
  box('mesa_canto', 1.242, 0.03, 0.742, m.benchEdge, 0, 0.02, 0);
  const panel = grp('panel_montaje');
  const PX = -0.08;
  box('placa_montaje', 0.84, 0.5, 0.008, m.plate, PX, 0.33, -0.305, panel);
  for (const s of [-1, 1]) {
    box(`perfil_vertical_${s < 0 ? 'izq' : 'der'}`, 0.03, 0.56, 0.03, m.alu, PX + s * 0.435, Y0 + 0.28, -0.305, panel);
    box(`perfil_pie_${s < 0 ? 'izq' : 'der'}`, 0.04, 0.014, 0.2, m.alu, PX + s * 0.435, Y0 + 0.007, -0.29, panel);
  }
  for (const [n, y] of [['sup', 0.53], ['inf', 0.13]]) {
    box(`canaleta_${n}`, 0.8, 0.05, 0.05, m.duct, PX, y, -0.276, panel);
    box(`canaleta_${n}_tapa`, 0.804, 0.054, 0.004, m.duct, PX, y, -0.2495, panel);
  }
  box('riel_din', 0.78, 0.035, 0.0075, m.alu, PX, 0.33, -0.297, panel);
  const ZB = -0.2932, RY = 0.33;
  const wireV = (name, x, y0, y1, z) => cyl(name, 0.0012, Math.abs(y1 - y0), m.wire, x, (y0 + y1) / 2, z, panel, 8);
  box('Q1_interruptor', 0.018, 0.085, 0.068, m.light, -0.462, RY, ZB + 0.034, panel);
  box('Q1_palanca', 0.007, 0.014, 0.012, m.black, -0.462, RY + 0.005, ZB + 0.074, panel);
  box('G1_fuente_24V', 0.07, 0.09, 0.06, m.light, -0.405, RY, ZB + 0.03, panel);
  box('G1_frente', 0.066, 0.06, 0.002, m.housing, -0.405, RY, ZB + 0.061, panel);
  box('G1_led', 0.005, 0.003, 0.002, ledG.on, -0.385, RY + 0.02, ZB + 0.0625, panel);
  wireV('G1_cable_a', -0.425, RY + 0.045, 0.505, ZB + 0.05);
  wireV('G1_cable_b', -0.415, RY + 0.045, 0.505, ZB + 0.05);

  // PLC compacto (diseño genérico)
  const plc = grp('PLC_CPU', panel);
  const PLX = -0.25, D = 0.072, ZF = ZB + D;
  box('plc_carcasa', 0.15, 0.10, D, m.housing, PLX, RY, ZB + D / 2, plc);
  box('plc_frente', 0.146, 0.05, 0.004, m.light, PLX, RY, ZF + 0.001, plc);
  box('plc_bornera_sup', 0.13, 0.016, 0.014, m.rubber, PLX, RY + 0.041, ZF, plc);
  box('plc_bornera_inf', 0.13, 0.016, 0.014, m.rubber, PLX, RY - 0.041, ZF, plc);
  for (let i = 0; i < 14; i++) {
    const x = PLX - 0.0585 + i * 0.009;
    zAxis(cyl(`plc_tornillo_sup_${i}`, 0.0019, 0.003, m.steel, x, RY + 0.041, ZF + 0.0085, plc, 12));
    if (i < 12) wireV(`plc_cable_sup_${i}`, x, RY + 0.049, 0.505, ZF + 0.002);
  }
  for (let i = 0; i < 10; i++) {
    const x = PLX - 0.0405 + i * 0.009;
    zAxis(cyl(`plc_tornillo_inf_${i}`, 0.0019, 0.003, m.steel, x, RY - 0.041, ZF + 0.0085, plc, 12));
    if (i < 8) wireV(`plc_cable_inf_${i}`, x, 0.155, RY - 0.049, ZF + 0.002);
  }
  box('plc_tapa_signal_board', 0.03, 0.036, 0.002, m.housing, PLX + 0.052, RY, ZF + 0.004, plc);
  const ledRun = box('plc_led_run_stop', 0.006, 0.003, 0.002, ledA.on, PLX - 0.062, RY + 0.014, ZF + 0.0035, plc);
  box('plc_led_error', 0.006, 0.003, 0.002, ledR.off, PLX - 0.062, RY + 0.004, ZF + 0.0035, plc);
  box('plc_led_maint', 0.006, 0.003, 0.002, ledA.off, PLX - 0.062, RY - 0.006, ZF + 0.0035, plc);
  const DI = [], DQ = [];
  for (let i = 0; i < 8; i++) DI.push(box(`plc_led_I0_${i}`, 0.0045, 0.003, 0.002, ledG.off, PLX - 0.04 + i * 0.0085, RY + 0.012, ZF + 0.0035, plc));
  for (let i = 0; i < 6; i++) DQ.push(box(`plc_led_Q0_${i}`, 0.0045, 0.003, 0.002, ledG.off, PLX - 0.04 + i * 0.0085, RY - 0.012, ZF + 0.0035, plc));
  for (let i = 0; i < 34; i++) box(`borna_${i}`, 0.0062, 0.058, 0.046, i % 6 === 5 ? m.termBlue : m.terminal, -0.155 + i * 0.0068, RY, ZB + 0.023, panel);
  box('borna_tope', 0.008, 0.044, 0.04, m.housing, -0.155 + 34 * 0.0068 + 0.002, RY, ZB + 0.02, panel);
  const KX = 0.14;
  box('K1_contactor', 0.045, 0.078, 0.075, m.light, KX, RY, ZB + 0.0375, panel);
  box('K1_frente', 0.045, 0.03, 0.004, m.housing, KX, RY + 0.024, ZB + 0.075, panel);
  const k1Ind = box('K1_indicador', 0.014, 0.012, 0.006, m.yellow, KX, RY - 0.008, ZB + 0.076, panel);
  for (let i = 0; i < 3; i++) {
    const x = KX - 0.014 + i * 0.014;
    zAxis(cyl(`K1_tornillo_sup_${i}`, 0.0022, 0.003, m.steel, x, RY + 0.034, ZB + 0.0765, panel, 12));
    zAxis(cyl(`K1_tornillo_inf_${i}`, 0.0022, 0.003, m.steel, x, RY - 0.034, ZB + 0.0765, panel, 12));
    wireV(`K1_cable_sup_${i}`, x, RY + 0.039, 0.505, ZB + 0.06);
    wireV(`K1_cable_inf_${i}`, x, 0.155, RY - 0.039, ZB + 0.06);
  }

  // ── Consola de mando ──────────────────────────────────────────
  const CX = -0.37, CZ = 0.14;
  const prof = new THREE.Shape();
  prof.moveTo(-0.105, 0); prof.lineTo(0.105, 0); prof.lineTo(0.105, 0.11); prof.lineTo(-0.105, 0.05); prof.closePath();
  const cg = new THREE.ExtrudeGeometry(prof, { depth: 0.34, bevelEnabled: false });
  cg.rotateY(Math.PI / 2); cg.translate(-0.17, 0, 0);
  const body = new THREE.Mesh(cg, m.light); body.name = 'consola_cuerpo'; body.position.set(CX, Y0, CZ); common.add(body);
  const slope = grp('consola_frontal');
  slope.position.set(CX, Y0 + 0.08, CZ);
  slope.rotation.x = Math.atan2(0.06, 0.21);
  box('consola_placa', 0.32, 0.003, 0.205, m.housing, 0, 0.002, 0, slope);
  const DY = 0.0035;
  const legend = (name, g) => box(name + '_rotulo', 0.026, 0.0008, 0.008, m.white, 0, 0.0004, 0.024, g);
  const devs = {};
  const pushbutton = (sym, mat, x, z) => {
    const g = grp(sym + '_pulsador', slope); g.position.set(x, DY, z);
    const bz = cyl(sym + '_bisel', 0.0145, 0.005, m.steel, 0, 0.0025, 0, g);
    const pl = cyl(sym + '_boton', 0.011, 0.008, mat, 0, 0.009, 0, g);
    legend(sym, g); pick(commonPick, sym, bz, pl);
    devs[sym] = { g, set: on => { pl.position.y = on ? 0.0055 : 0.009; } };
  };
  const lampDev = (sym, mats, x, z) => {
    const g = grp(sym + '_piloto', slope); g.position.set(x, DY, z);
    cyl(sym + '_bisel', 0.0145, 0.005, m.steel, 0, 0.0025, 0, g);
    const a = cyl(sym + '_lente', 0.0115, 0.005, mats.off, 0, 0.0075, 0, g);
    const b = dome(sym + '_cupula', 0.0115, 0.5, mats.off, 0, 0.01, 0, g);
    legend(sym, g);
    devs[sym] = { g, set: on => { a.material = b.material = on ? mats.on : mats.off; } };
  };
  lampDev('H1', lampG, -0.12, -0.055); lampDev('H2', lampA, -0.065, -0.055); lampDev('H3', lampR, -0.01, -0.055);
  pushbutton('S1', m.green, -0.12, 0.04); pushbutton('S2', m.black, -0.065, 0.04); pushbutton('S3', m.red, -0.01, 0.04);
  {
    const g = grp('S4_selector', slope); g.position.set(0.05, DY, -0.055);
    const bz = cyl('S4_bisel', 0.0145, 0.005, m.steel, 0, 0.0025, 0, g);
    const kb = cyl('S4_base', 0.0125, 0.006, m.black, 0, 0.008, 0, g);
    const kn = box('S4_maneta', 0.006, 0.012, 0.024, m.black, 0, 0.016, 0, g);
    kn.rotation.y = 0.6; legend('S4', g); pick(commonPick, 'S4', bz, kb, kn);
    devs.S4 = { g, set: on => { kn.rotation.y = on ? -0.6 : 0.6; } };
  }
  {
    const g = grp('S0_emergencia', slope); g.position.set(0.115, DY, 0.0);
    cyl('S0_placa_amarilla', 0.032, 0.0015, m.yellow, 0, 0.00075, 0, g);
    const bz = cyl('S0_bisel', 0.017, 0.007, m.black, 0, 0.005, 0, g);
    const mg = grp('S0_seta', g);
    const a = cyl('S0_seta_cuerpo', 0.021, 0.008, m.red, 0, 0.013, 0, mg);
    const b = dome('S0_seta_cupula', 0.021, 0.35, m.red, 0, 0.017, 0, mg);
    pick(commonPick, 'S0', bz, a, b);
    devs.S0 = { g, set: on => { mg.position.y = on ? -0.005 : 0; } };
  }
  common.updateMatrixWorld(true);
  const commonAnchors = {};
  for (const s of ['S4', 'S0', 'H1', 'H2', 'H3']) commonAnchors[s] = devs[s].g.getWorldPosition(V(0, 0, 0)).add(V(0, s === 'S0' ? 0.045 : 0.035, 0));
  for (const s of ['S1', 'S2', 'S3']) commonAnchors[s] = devs[s].g.localToWorld(V(0, 0.002, 0.034));
  commonAnchors.PLC = V(PLX, RY + 0.075, ZF);
  commonAnchors.K1 = V(KX, RY + 0.06, ZB + 0.075);

  // ── Banda transportadora reutilizable ─────────────────────────
  const X0 = -0.14, X1 = 0.42, BZ = 0.14, BT = 0.165, LEN = X1 - X0, BCX = (X0 + X1) / 2;
  const NCL = 8, SP = (LEN - 0.04) / NCL, BV = 0.12;
  function buildBelt(g) {
    for (const s of [-1, 1]) box(`banda_perfil_${s < 0 ? 'tras' : 'del'}`, LEN + 0.02, 0.035, 0.01, m.alu, BCX, BT - 0.012, BZ + s * 0.066, g);
    box('banda_cinta', LEN - 0.04, 0.006, 0.11, m.rubber, BCX, BT - 0.003, BZ, g);
    box('banda_cinta_retorno', LEN - 0.04, 0.004, 0.11, m.rubber, BCX, BT - 0.04, BZ, g);
    for (const [n, x] of [['motriz', X1 - 0.02], ['retorno', X0 + 0.02]]) {
      zAxis(cyl(`banda_tambor_${n}`, 0.0205, 0.11, m.rubber, x, BT - 0.0215, BZ, g));
      zAxis(cyl(`banda_eje_${n}`, 0.006, 0.15, m.alu, x, BT - 0.0215, BZ, g, 16));
    }
    const legH = BT - 0.03 - Y0;
    for (const x of [X0 + 0.03, X1 - 0.03]) for (const s of [-1, 1])
      box(`banda_pata_${x < 0 ? 'a' : 'b'}_${s < 0 ? 'tras' : 'del'}`, 0.02, legH, 0.02, m.alu, x, Y0 + legH / 2, BZ + s * 0.066, g);
    const cleats = [];
    for (let i = 0; i < NCL; i++) cleats.push(box(`banda_taco_${i}`, 0.005, 0.004, 0.1, m.cleat, X0 + 0.02 + i * SP, BT + 0.002, BZ, g));
    box('M1_reductor', 0.05, 0.05, 0.04, m.motor, X1 - 0.02, BT - 0.0215, BZ + 0.094, g);
    zAxis(cyl('M1_motor', 0.022, 0.075, m.motor, X1 - 0.02, BT - 0.0215, BZ + 0.152, g));
    zAxis(cyl('M1_tapa_ventilador', 0.02, 0.014, m.rubber, X1 - 0.02, BT - 0.0215, BZ + 0.196, g));
    box('M1_caja_bornes', 0.028, 0.016, 0.03, m.motor, X1 - 0.02, BT - 0.0215 + 0.03, BZ + 0.15, g);
    const fan = box('M1_marca_giro', 0.032, 0.005, 0.002, m.yellow, X1 - 0.02, BT - 0.0215, BZ + 0.2035, g);
    let off = 0;
    return (dt, run) => {
      if (!run) return;
      off = (off + BV * dt) % SP;
      cleats.forEach((c, i) => { c.position.x = X0 + 0.02 + ((off + i * SP) % (LEN - 0.04)); });
      fan.rotation.z -= dt * 14;
    };
  }
  const tray = (g, name, x, z, w, d) => {
    box(name + '_base', w, 0.006, d, m.duct, x, Y0 + 0.003, z, g);
    box(name + '_pared_a', 0.004, 0.045, d, m.duct, x - w / 2 + 0.002, Y0 + 0.0285, z, g);
    box(name + '_pared_b', 0.004, 0.045, d, m.duct, x + w / 2 - 0.002, Y0 + 0.0285, z, g);
    box(name + '_pared_c', w, 0.045, 0.004, m.duct, x, Y0 + 0.0285, z - d / 2 + 0.002, g);
    box(name + '_pared_d', w, 0.045, 0.004, m.duct, x, Y0 + 0.0285, z + d / 2 - 0.002, g);
  };
  const barrier = (g, sym, x, y) => {
    for (const s of [-1, 1]) {
      box(`${sym}_soporte_${s < 0 ? 'sensor' : 'reflector'}`, 0.008, y - BT + 0.02, 0.008, m.alu, x, (y + BT - 0.02) / 2, BZ + s * 0.079, g);
      box(`${sym}_escuadra_${s < 0 ? 'sensor' : 'reflector'}`, 0.01, 0.01, 0.014, m.alu, x, BT - 0.01, BZ + s * 0.074, g);
    }
    const body = box(`${sym}_sensor`, 0.02, 0.032, 0.016, m.housing, x, y, BZ - 0.079, g);
    box(`${sym}_lente`, 0.012, 0.012, 0.002, m.rubber, x, y, BZ - 0.0705, g);
    const led = box(`${sym}_led`, 0.005, 0.003, 0.005, ledA.off, x, y + 0.0176, BZ - 0.079, g);
    box(`${sym}_reflector`, 0.02, 0.02, 0.004, m.reflector, x, y, BZ + 0.073, g);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, 0.143, 8), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.55, depthWrite: false }));
    beam.rotation.x = Math.PI / 2; beam.position.set(x, y, BZ + 0.0015);
    return { body, led, beam };
  };
  const overhead = (g, sym, x, dx = 0) => {
    const H = BT + 0.11, xp = x + dx;
    box(`${sym}_poste`, 0.01, H - BT + 0.03, 0.01, m.alu, xp, (H + BT - 0.03) / 2, BZ - 0.085, g);
    box(`${sym}_brazo`, 0.01, 0.01, 0.09, m.alu, xp, H, BZ - 0.04, g);
    if (dx) box(`${sym}_travesano`, Math.abs(dx) + 0.01, 0.01, 0.01, m.alu, x + dx / 2, H, BZ, g);
    const body = box(`${sym}_sensor`, 0.018, 0.03, 0.018, m.housing, x, H - 0.02, BZ, g);
    const led = box(`${sym}_led`, 0.005, 0.005, 0.003, ledA.off, x, H - 0.012, BZ + 0.0105, g);
    const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.0012, 0.0012, H - 0.035 - BT, 8), new THREE.MeshBasicMaterial({ color: 0xff3020, transparent: true, opacity: 0.35, depthWrite: false }));
    beam.position.set(x, (H - 0.035 + BT) / 2, BZ);
    return { body, led, beam };
  };

  // ── Nivel 1: banda con contador de cajas ──────────────────────
  function L1() {
    const g = new THREE.Group(); g.name = 'planta_banda';
    const extras = new THREE.Group(); extras.name = 'dinamicos_n1';
    const belt = buildBelt(g);
    const SX = 0.17, B = barrier(g, 'B1', SX, BT + 0.03);
    extras.add(B.beam);
    const pickables = []; pick(pickables, 'B1', B.body);
    const TX = 0.48; tray(g, 'bandeja', TX, BZ, 0.1, 0.13);
    const geo = new THREE.BoxGeometry(0.05, 0.05, 0.05), FLOOR = Y0 + 0.006 + 0.025;
    let boxes = [];
    const mod = {
      group: g, extras, pickables, b1: false,
      anchors: { M1: V(X1 - 0.02, BT + 0.03, BZ + 0.16), B1: V(SX, BT + 0.07, BZ - 0.079) },
      reset() { boxes.forEach(b => extras.remove(b.mesh)); boxes = []; },
      update(dt, s) {
        const run = s.outs.M1;
        belt(dt, run);
        if (run) {
          const minX = boxes.reduce((a, b) => b.state === 'belt' ? Math.min(a, b.mesh.position.x) : a, Infinity);
          if (minX > X0 + 0.04 + 0.16) {
            const mesh = new THREE.Mesh(geo, m.cardboard); mesh.name = 'caja'; mesh.castShadow = mesh.receiveShadow = true;
            mesh.position.set(X0 + 0.04, BT + 0.025, BZ + (Math.random() - 0.5) * 0.02);
            mesh.rotation.y = (Math.random() - 0.5) * 0.15; mesh.scale.setScalar(0.01);
            extras.add(mesh); boxes.push({ mesh, state: 'belt', vy: 0, t: 0 });
          }
        }
        let det = false;
        for (const b of boxes) {
          const p = b.mesh.position;
          if (b.state === 'belt') {
            if (b.mesh.scale.x < 1) b.mesh.scale.setScalar(Math.min(1, b.mesh.scale.x + dt * 6));
            if (run) p.x += BV * dt;
            if (p.x > X1 - 0.01) b.state = 'fall';
            if (Math.abs(p.x - SX) < 0.026) det = true;
          } else if (b.state === 'fall') {
            b.vy -= 9.8 * dt; p.y += b.vy * dt; p.x = Math.min(TX + 0.02, p.x + 0.35 * dt);
            b.mesh.rotation.z = Math.max(-0.35, b.mesh.rotation.z - dt * 4);
            if (p.y <= FLOOR) { p.y = FLOOR; b.state = 'rest'; b.mesh.rotation.z = 0; }
          } else {
            b.t += dt;
            if (b.t > 1.2) b.mesh.scale.setScalar(Math.max(0.001, 1 - (b.t - 1.2) * 4));
            if (b.t > 1.45) b.dead = true;
          }
        }
        boxes = boxes.filter(b => { if (b.dead) extras.remove(b.mesh); return !b.dead; });
        mod.b1 = det; B.beam.visible = !det;
        B.led.material = s.dev.B1 ? ledA.on : ledA.off;
      },
    };
    return mod;
  }

  // ── Nivel 2: maqueta de semáforo ──────────────────────────────
  function L2() {
    const g = new THREE.Group(); g.name = 'planta_semaforo';
    const RX = 0.18, RZ0 = -0.22, RZ1 = 0.36, RL = RZ1 - RZ0, RCZ = (RZ0 + RZ1) / 2;
    box('calzada', 0.26, 0.008, RL, m.asphalt, RX, Y0 + 0.004, RCZ, g);
    box('vereda', 0.1, 0.016, RL, m.curb, RX + 0.18, Y0 + 0.008, RCZ, g);
    for (let i = 0; i < 6; i++) box(`paso_cebra_${i}`, 0.022, 0.001, 0.07, m.white, RX - 0.11 + i * 0.044, Y0 + 0.0085, 0.06, g);
    box('linea_detencion', 0.26, 0.001, 0.008, m.white, RX, Y0 + 0.0085, 0.12, g);
    for (let i = 0; i < 5; i++) { box(`eje_${i}`, 0.006, 0.001, 0.04, m.white, RX, Y0 + 0.0085, 0.17 + i * 0.045, g); if (i < 4) box(`eje_tras_${i}`, 0.006, 0.001, 0.04, m.white, RX, Y0 + 0.0085, -0.2 + i * 0.05, g); }
    const PXs = RX + 0.18, PZ = 0.15, HY = 0.34;
    cyl('poste_base', 0.02, 0.006, m.steel, PXs, Y0 + 0.019, PZ - 0.035, g);
    cyl('poste', 0.009, 0.4, m.steel, PXs, Y0 + 0.016 + 0.2, PZ - 0.035, g, 24);
    box('semaforo_soporte', 0.012, 0.03, 0.03, m.steel, PXs, HY, PZ - 0.02, g);
    box('semaforo_pantalla', 0.1, 0.235, 0.004, m.black, PXs, HY, PZ - 0.006, g);
    box('semaforo_cuerpo', 0.07, 0.205, 0.045, m.housing, PXs, HY, PZ + 0.0185, g);
    const lens = {};
    [['L1', lampR, 0.065], ['L2', lampA, 0], ['L3', lampG, -0.065]].forEach(([sym, mats, dy]) => {
      const ln = zAxis(cyl(`${sym}_lente`, 0.024, 0.006, mats.off, PXs, HY + dy, PZ + 0.044, g));
      const hood = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.032, 24, 1, true, -Math.PI / 2, Math.PI), m.visor);
      hood.name = `${sym}_visera`; hood.rotation.x = Math.PI / 2; hood.position.set(PXs, HY + dy, PZ + 0.057); g.add(hood);
      lens[sym] = { ln, mats };
    });
    // Semáforo peatonal con pulsador de solicitud
    const QX = RX - 0.16, QZ = 0.0, QH = 0.25, QY0 = Y0 + 0.016;
    box('vereda_izq', 0.06, 0.016, RL, m.curb, QX, Y0 + 0.008, RCZ, g);
    cyl('peatonal_base', 0.016, 0.006, m.steel, QX, QY0 + 0.003, QZ, g);
    cyl('peatonal_poste', 0.007, QH, m.steel, QX, QY0 + QH / 2, QZ, g, 20);
    const QY = QY0 + QH + 0.05;
    box('peatonal_cuerpo', 0.05, 0.1, 0.03, m.housing, QX, QY, QZ + 0.005, g);
    for (const [sym, mats, dy] of [['L4', lampR, 0.024], ['L5', lampG, -0.024]]) {
      const ln = box(`${sym}_lente`, 0.034, 0.034, 0.004, mats.off, QX, QY + dy, QZ + 0.021, g);
      box(`${sym}_visera`, 0.04, 0.003, 0.016, m.housing, QX, QY + dy + 0.02, QZ + 0.028, g);
      lens[sym] = { ln, mats };
    }
    const PBY = QY0 + 0.11;
    const pbBox = box('S2_caja_poste', 0.032, 0.046, 0.022, m.yellow, QX, PBY, QZ + 0.018, g);
    const pbBtn = zAxis(cyl('S2_boton_poste', 0.009, 0.008, m.black, QX, PBY + 0.004, QZ + 0.032, g, 20));
    box('S2_rotulo_poste', 0.02, 0.006, 0.001, m.white, QX, PBY - 0.014, QZ + 0.0295, g);
    const pickables = []; pick(pickables, 'S2', pbBox, pbBtn);
    return {
      group: g, extras: new THREE.Group(), pickables,
      anchors: { L1: V(PXs + 0.075, HY + 0.075, PZ + 0.04), L2: V(PXs + 0.075, HY + 0.01, PZ + 0.04), L3: V(PXs + 0.075, HY - 0.055, PZ + 0.04),
        L4: V(QX - 0.06, QY + 0.035, QZ + 0.02), L5: V(QX - 0.06, QY - 0.012, QZ + 0.02), S2: V(QX - 0.05, PBY + 0.01, QZ + 0.03) },
      reset() {},
      update(dt, s) {
        for (const k in lens) lens[k].ln.material = s.outs[k] ? lens[k].mats.on : lens[k].mats.off;
        pbBtn.position.z = QZ + (s.dev.S2 ? 0.029 : 0.032);
      },
    };
  }

  // ── Nivel 3: tanque con bomba y válvula ───────────────────────
  function L3() {
    const g = new THREE.Group(); g.name = 'planta_tanque';
    const extras = new THREE.Group(); extras.name = 'dinamicos_n3';
    box('base_skid', 0.5, 0.01, 0.32, m.plate, 0.16, Y0 + 0.005, 0.15, g);
    const TXc = 0.06, TZ = 0.12, TB = Y0 + 0.11, TH = 0.28, TR = 0.075;
    for (const [i, dx, dz] of [[0, -1, -1], [1, 1, -1], [2, -1, 1], [3, 1, 1]]) box(`tanque_pata_${i}`, 0.014, 0.1, 0.014, m.alu, TXc + dx * 0.05, Y0 + 0.06, TZ + dz * 0.05, g);
    box('tanque_mesa', 0.13, 0.006, 0.13, m.alu, TXc, TB - 0.003, TZ, g);
    cyl('tanque_fondo', TR + 0.003, 0.008, m.steel, TXc, TB + 0.004, TZ, g, 48);
    cyl('tanque_pared', TR, TH, m.acrylic, TXc, TB + 0.008 + TH / 2, TZ, g, 48);
    cyl('tanque_borde', TR + 0.003, 0.006, m.steel, TXc, TB + 0.008 + TH, TZ, g, 48);
    const W0 = TB + 0.008, WH = TH - 0.012;
    const water = cyl('agua', TR - 0.003, 1, m.water, TXc, W0 + 0.05, TZ, g, 48);
    const sensorAt = (sym, frac) => {
      const y = W0 + frac * WH;
      const b = zAxis(cyl(`${sym}_sensor`, 0.008, 0.03, m.housing, TXc, y, TZ + TR + 0.014, g, 24));
      const led = zAxis(cyl(`${sym}_led`, 0.006, 0.003, ledA.off, TXc, y, TZ + TR + 0.0305, g, 16));
      return { b, led, y };
    };
    const SB2 = sensorAt('B2', 0.15), SB3 = sensorAt('B3', 0.85);
    box('deposito', 0.18, 0.07, 0.16, m.light, 0.3, Y0 + 0.01 + 0.035, 0.12, g);
    // Transmisor analógico de nivel B4 sobre el borde del tanque
    const TT = TB + 0.008 + TH + 0.003, BX4 = TXc - 0.045, BZ4 = TZ - 0.035;
    box('B4_soporte', 0.012, 0.006, 0.07, m.alu, BX4, TT + 0.003, BZ4, g);
    cyl('B4_cuerpo', 0.013, 0.03, m.light, BX4, TT + 0.021, BZ4, g, 24);
    cyl('B4_cabezal', 0.016, 0.014, m.housing, BX4, TT + 0.043, BZ4, g, 24);
    const b4Led = box('B4_led', 0.006, 0.004, 0.002, ledG.off, BX4, TT + 0.043, BZ4 + 0.0165, g);
    // Bomba P1
    const PY = Y0 + 0.04, PZp = 0.27;
    box('P1_base', 0.1, 0.012, 0.05, m.housing, 0.32, Y0 + 0.016, PZp, g);
    xAxis(cyl('P1_voluta', 0.026, 0.03, m.motor, 0.28, PY, PZp, g));
    xAxis(cyl('P1_motor', 0.022, 0.07, m.motor, 0.33, PY, PZp, g));
    xAxis(cyl('P1_tapa_ventilador', 0.02, 0.012, m.rubber, 0.371, PY, PZp, g));
    const fan = box('P1_marca_giro', 0.002, 0.005, 0.032, m.yellow, 0.3775, PY, PZp, g);
    const pipe = (name, a, b) => {
      const d = b.clone().sub(a), L = d.length();
      const o = new THREE.Mesh(new THREE.CylinderGeometry(0.007, 0.007, L, 16), m.pipe); o.name = name;
      o.position.copy(a).add(b).multiplyScalar(0.5);
      o.quaternion.setFromUnitVectors(V(0, 1, 0), d.normalize()); g.add(o);
      const e = new THREE.Mesh(new THREE.SphereGeometry(0.0085, 16, 8), m.pipe); e.name = name + '_codo'; e.position.copy(b); g.add(e);
    };
    pipe('tubo_succion', V(0.28, PY, 0.2), V(0.28, PY, PZp - 0.015));
    pipe('tubo_impulsion_a', V(0.28, PY + 0.026, PZp), V(0.28, 0.47, PZp));
    pipe('tubo_impulsion_b', V(0.28, 0.47, PZp), V(TXc, 0.47, PZp));
    pipe('tubo_impulsion_c', V(TXc, 0.47, PZp), V(TXc, 0.47, TZ));
    pipe('tubo_impulsion_d', V(TXc, 0.47, TZ), V(TXc, 0.43, TZ));
    pipe('tubo_descarga_a', V(TXc, TB, TZ), V(TXc, 0.135, TZ));
    pipe('tubo_descarga_b', V(TXc, 0.135, TZ), V(0.25, 0.135, TZ));
    box('Y1_cuerpo', 0.03, 0.026, 0.026, m.steel, 0.15, 0.135, TZ, g);
    box('Y1_bobina', 0.024, 0.03, 0.024, m.black, 0.15, 0.163, TZ, g);
    const yLed = box('Y1_led', 0.006, 0.004, 0.002, ledA.off, 0.15, 0.17, TZ + 0.0125, g);
    const inStream = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 1, 12), m.water); inStream.name = 'chorro_entrada'; extras.add(inStream);
    const outStream = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.015, 12), m.water); outStream.name = 'chorro_salida';
    outStream.position.set(0.25, 0.135 - 0.0075 - 0.007, TZ); extras.add(outStream);
    // Desplazado a la derecha para no tapar el PLC desde la vista general.
    const DX = 0.2;
    g.position.x = extras.position.x = DX;
    const anchors = { B4: V(BX4, TT + 0.07, BZ4), P1: V(0.33, PY + 0.06, PZp), Y1: V(0.15, 0.2, TZ), B2: V(TXc + 0.05, SB2.y + 0.01, TZ + TR + 0.02), B3: V(TXc + 0.05, SB3.y + 0.01, TZ + TR + 0.02) };
    Object.values(anchors).forEach(v => { v.x += DX; });
    return {
      group: g, extras, pickables: [], anchors,
      reset() {},
      update(dt, s) {
        const L = s.sim ? s.sim.state.L : 0, h = Math.max(0.001, L * WH);
        water.scale.y = h; water.position.y = W0 + h / 2; water.visible = L > 0.002;
        inStream.visible = !!s.outs.P1;
        const top = 0.43, len = Math.max(0.001, top - (W0 + h));
        inStream.scale.y = len; inStream.position.set(TXc, top - len / 2, TZ);
        outStream.visible = !!s.outs.Y1 && L > 0.002;
        if (s.outs.P1) fan.rotation.x -= dt * 14;
        yLed.material = s.outs.Y1 ? ledA.on : ledA.off;
        SB2.led.material = s.dev.B2 ? ledA.on : ledA.off;
        SB3.led.material = s.dev.B3 ? ledA.on : ledA.off;
        b4Led.material = s.run ? ledG.on : ledG.off;
      },
    };
  }

  // ── Nivel 4: clasificadora ────────────────────────────────────
  function L4() {
    const g = new THREE.Group(); g.name = 'planta_clasificadora';
    const extras = new THREE.Group(); extras.name = 'dinamicos_n4';
    const belt = buildBelt(g);
    const B2 = barrier(g, 'B2', SORT.XB2, BT + 0.055); extras.add(B2.beam);
    const B1 = overhead(g, 'B1', SORT.XB1, 0.05); extras.add(B1.beam);
    const B3 = overhead(g, 'B3', SORT.XB3); extras.add(B3.beam);
    const XP = SORT.XB1, PYc = BT + 0.025, ZBODY = BZ - 0.13;
    zAxis(cyl('Y1_cilindro', 0.014, 0.09, m.alu, XP, PYc, ZBODY, g));
    box('Y1_soporte', 0.02, PYc - Y0 - 0.014, 0.02, m.alu, XP, (PYc + Y0 - 0.014) / 2, ZBODY, g);
    const rod = zAxis(cyl('Y1_vastago', 0.005, 0.1, m.steel, XP, PYc, ZBODY + 0.05, g, 16));
    const plate = box('Y1_placa', 0.05, 0.03, 0.006, m.yellow, XP, PYc, BZ - 0.075, g);
    tray(g, 'bandeja_lateral', XP, BZ + 0.15, 0.1, 0.09);
    const TX = 0.48; tray(g, 'bandeja_final', TX, BZ, 0.1, 0.13);
    const geoT = new THREE.BoxGeometry(0.05, SORT.HT, 0.05), geoS = new THREE.BoxGeometry(0.05, SORT.HS, 0.05);
    const meshes = new Map();
    return {
      group: g, extras, pickables: [],
      anchors: { M1: V(X1 - 0.02, BT + 0.03, BZ + 0.16), Y1: V(XP, PYc + 0.04, ZBODY), B1: V(SORT.XB1, BT + 0.14, BZ), B2: V(SORT.XB2, BT + 0.09, BZ - 0.079), B3: V(SORT.XB3, BT + 0.14, BZ) },
      reset() { meshes.forEach(o => extras.remove(o)); meshes.clear(); },
      update(dt, s) {
        belt(dt, s.outs.M1);
        const st = s.sim ? s.sim.state : { boxes: [], push: 0 };
        const pz = BZ - 0.075 + st.push * 0.105;
        plate.position.z = pz; rod.position.z = (ZBODY + 0.045 + pz) / 2; rod.scale.y = Math.max(0.2, (pz - ZBODY - 0.045) / 0.1);
        const seen = new Set();
        for (const b of st.boxes) {
          seen.add(b.id);
          let o = meshes.get(b.id);
          const h = b.tall ? SORT.HT : SORT.HS;
          if (!o) { o = new THREE.Mesh(b.tall ? geoT : geoS, b.tall ? m.cardboardDark : m.cardboard); o.name = b.tall ? 'caja_alta' : 'caja_baja'; o.castShadow = o.receiveShadow = true; o.scale.setScalar(0.01); extras.add(o); meshes.set(b.id, o); }
          if (o.scale.x < 1 && b.st === 'belt') o.scale.setScalar(Math.min(1, o.scale.x + dt * 6));
          const floor = Y0 + 0.006 + h / 2;
          if (b.st === 'belt') o.position.set(b.x, BT + h / 2, BZ);
          else if (b.st === 'side') {
            const z = BZ + Math.min(0.15, b.t * 0.45), tf = Math.max(0, b.t - 0.2);
            o.position.set(XP, Math.max(floor, BT + h / 2 - 4.9 * tf * tf), z);
          } else {
            o.position.set(Math.min(TX + 0.02, X1 - 0.01 + 0.35 * b.t), Math.max(floor, BT + h / 2 - 4.9 * b.t * b.t), BZ);
          }
          if (b.t > 1.4) o.scale.setScalar(Math.max(0.001, 1 - (b.t - 1.4) * 3));
        }
        for (const [id, o] of meshes) if (!seen.has(id)) { extras.remove(o); meshes.delete(id); }
        for (const [S, k] of [[B1, 'B1'], [B2, 'B2'], [B3, 'B3']]) { S.led.material = s.dev[k] ? ledA.on : ledA.off; }
        B2.beam.visible = !s.dev.B2;
      },
    };
  }

  const mods = { 1: L1(), 2: L2(), 3: L3(), 4: L4() };
  let cur = 1;
  const api = {
    common, mods, b1: false, pickables: commonPick, anchors: commonAnchors, extras: mods[1].extras,
    setLevel(n) {
      cur = n;
      const root = new THREE.Group(); root.name = `laboratorio_plc_nivel_${n}`;
      root.add(common); root.add(mods[n].group);
      api.pickables = commonPick.concat(mods[n].pickables);
      api.anchors = { ...commonAnchors, ...mods[n].anchors };
      api.extras = mods[n].extras;
      mods[n].reset();
      return root;
    },
    reset() { mods[cur].reset(); },
    update(dt, s) {
      for (const k of ['S1', 'S2', 'S3', 'S4', 'S0']) devs[k].set(!!s.dev[k]);
      for (const k of ['H1', 'H2', 'H3']) devs[k].set(!!s.outs[k]);
      for (let i = 0; i < 8; i++) DI[i].material = s.physIn['I0.' + i] ? ledG.on : ledG.off;
      for (let i = 0; i < 6; i++) DQ[i].material = s.physOut['Q0.' + i] ? ledG.on : ledG.off;
      ledRun.material = s.run ? ledG.on : ledA.on;
      k1Ind.position.z = ZB + 0.076 - (s.outs.M1 || s.outs.P1 ? 0.004 : 0);
      mods[cur].update(dt, s);
      api.b1 = mods[1].b1;
    },
  };
  return api;
}
