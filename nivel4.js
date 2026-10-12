// Nivel 4 · Banda y clasificación (editor libre, planta simulada).
import { hasC, coilWith, box } from './editor.js';
import { sorterSim } from './sims.js';
const G = (text, check) => ({ text, check });
const pulse = (k = 'S1') => [{ set: { [k]: true }, wait: 150 }, { set: { [k]: false }, wait: 150 }];
const motor = p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NO', 'I0.0') && hasC(l, 'NO', 'Q0.0') && hasC(l, 'NO', 'I0.2') && hasC(l, 'NO', 'I0.5'));

export const TAGS4 = [
  { addr: 'I0.0', sym: 'S1', short: 'Marcha', dev: 'Pulsador verde', wiring: 'NO', io: 'in' },
  { addr: 'I0.1', sym: 'S2', short: 'Reinicio', dev: 'Pulsador negro', wiring: 'NO', io: 'in' },
  { addr: 'I0.2', sym: 'S3', short: 'Paro', dev: 'Pulsador rojo', wiring: 'NC', io: 'in', stop: true },
  { addr: 'I0.4', sym: 'B1', short: 'Presencia', dev: 'Fotoeléctrico difuso frente al empujador', wiring: 'NO', io: 'in', sensor: true },
  { addr: 'I0.5', sym: 'S0', short: 'Emergencia', dev: 'Seta enclavable', wiring: 'NC', io: 'in', stop: true },
  { addr: 'I0.6', sym: 'B2', short: 'Altura', dev: 'Barrera a la altura de las cajas altas', wiring: 'NO', io: 'in', sensor: true },
  { addr: 'I0.7', sym: 'B3', short: 'Fin de banda', dev: 'Fotoeléctrico difuso al final', wiring: 'NO', io: 'in', sensor: true },
  { addr: 'Q0.0', sym: 'M1', short: 'Motor', dev: 'Motor de banda (vía K1)', io: 'out' },
  { addr: 'Q0.1', sym: 'Y1', short: 'Empujador', dev: 'Cilindro neumático de desvío', io: 'out' },
  { addr: 'Q0.2', sym: 'H1', short: 'En marcha', dev: 'Piloto verde de consola', io: 'out' },
  { addr: 'Q0.3', sym: 'H2', short: 'Lote bajas', dev: 'Piloto ámbar de consola', io: 'out' },
  { addr: 'Q0.4', sym: 'H3', short: 'Lote altas', dev: 'Piloto rojo de consola', io: 'out' },
];

const R41 = {
  id: '4.1', short: 'Banda', topic: 'Repaso',
  title: 'Marcha y paro de la banda',
  text: 'S1 arranca la banda M1 y queda en marcha al soltarlo; S3 y S0 la detienen. El piloto H1 indica banda en marcha. Las cajas llegan al azar: altas y bajas.',
  goal: 'Autorretención construida desde cero en el editor libre.',
  hint: 'Es el mismo circuito del reto 1.5: S1 en paralelo con el propio motor, y los paros S3 y S0 en serie con contactos NO porque están cableados NC.',
  devices: ['S1', 'S3', 'S0', 'M1', 'H1'], outputs: ['Q0.0', 'Q0.2'],
  trace: ['I0.0', 'Q0.0', 'I0.6', 'I0.4', 'I0.7'],
  steps: [
    G('Segmento: <b>NO %I0.0 (S1)</b> en paralelo con <b>NO %Q0.0 (M1)</b> → bobina <b>%Q0.0 (M1)</b>.', p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NO', 'I0.0') && hasC(l, 'NO', 'Q0.0'))),
    G('Serie después del paralelo: <b>NO %I0.2 (S3)</b> y <b>NO %I0.5 (S0)</b>.', motor),
    G('Segmento: <b>NO %Q0.0 (M1)</b> → bobina <b>%Q0.2 (H1)</b>.', p => coilWith(p, 'Q0.2', '', l => hasC(l, 'NO', 'Q0.0'))),
    G('Arranca la banda y observa en el diagrama de tiempos cómo B2 solo reacciona a las cajas altas. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 200, expect: { M1: false, H1: false }, msg: 'Al iniciar, la banda está parada.' },
    { set: { S1: true }, wait: 150, expect: { M1: true, H1: true }, msg: 'Al pulsar S1, la banda arranca y H1 se enciende.' },
    { set: { S1: false }, wait: 300, expect: { M1: true }, msg: 'Al soltar S1, la banda sigue en marcha.' },
    { set: { S3: true }, wait: 150, expect: { M1: false, H1: false }, msg: 'S3 detiene la banda.' },
    { set: { S3: false }, wait: 150 },
    ...pulse(),
    { set: { S0: true }, wait: 150, expect: { M1: false }, msg: 'El paro de emergencia S0 detiene la banda.' },
    { set: { S1: true }, wait: 150, expect: { M1: false }, msg: 'Con S0 enclavado, S1 no arranca la banda.' },
    { set: { S1: false, S0: false }, wait: 100 },
  ],
};

const R42 = {
  id: '4.2', short: 'Clasificar', topic: 'Memoria de eventos', startFrom: '4.1',
  title: 'Clasificación de cajas altas',
  text: 'Las cajas altas deben desviarse a la bandeja lateral con el empujador Y1; las bajas siguen hasta el final de la banda. B2 está antes del empujador y solo detecta las cajas altas; B1 detecta cualquier caja frente al empujador. Memoriza cada caja alta al pasar por B2 y, cuando llegue a B1, activa Y1 durante 0,8 s.',
  goal: 'Memoria de evento con flanco P y Set/Reset, y temporizador de impulso.',
  hint: 'El sensor de altura y el empujador están en lugares distintos: entre ambos, el PLC debe recordar qué caja viene. Borra esa memoria en el mismo instante en que empiezas a empujar, para no perder la siguiente caja alta.',
  devices: ['B1', 'B2', 'Y1', 'M1'], outputs: ['Q0.1'],
  trace: ['I0.6', 'M0.1', 'I0.4', 'Q0.1', 'T1.ET'],
  steps: [
    G('Segmento: contacto <b>P %I0.6 (B2)</b> → bobina <b>S %M0.1</b>. Cada caja alta deja una marca.', p => coilWith(p, 'M0.1', 'S', l => hasC(l, null, 'I0.6'))),
    G('Segmento: <b>NO %M0.1</b> y <b>NO %I0.4 (B1)</b> en serie → bobina <b>S %Q0.1 (Y1)</b>.', p => coilWith(p, 'Q0.1', 'S', l => hasC(l, 'NO', 'M0.1') && hasC(l, 'NO', 'I0.4'))),
    G('Haz clic en la bobina de Y1 y elige <b>Bobina en paralelo</b>: asígnale <b>R %M0.1</b>. Con la misma condición, empuja y borra la marca en el mismo ciclo.', p => coilWith(p, 'M0.1', 'R', l => hasC(l, 'NO', 'M0.1') && hasC(l, 'NO', 'I0.4'))),
    G('TON (T1): IN = <b>NO %Q0.1 (Y1)</b>, PT = <b>0,8</b> s.', p => { const r = box(p, 'T1'); return !!r && hasC(r.IN, 'NO', 'Q0.1') && r.PT.value === 0.8; }),
    G('Segmento: <b>NO "T1".Q</b> → bobina <b>R %Q0.1 (Y1)</b>. El empujador se retrae.', p => coilWith(p, 'Q0.1', 'R', l => hasC(l, 'NO', 'T1.Q'))),
    G('Arranca la banda: las cajas altas van a la bandeja lateral y las bajas al final. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 100 }, ...pulse(),
    { wait: 100, expect: { M1: true }, msg: 'S1 arranca la banda.' },
    { until: ({ sim }) => sim.pushed + sim.ends >= 8, timeout: 30000, check: ({ sim }) => sim.wrong === 0, detail: ({ sim }) => `${sim.wrong} caja(s) mal clasificada(s).`, msg: 'Las primeras 8 cajas se clasifican sin errores.' },
    { wait: 10, check: ({ sim }) => sim.pushed >= 4, detail: ({ sim }) => `Se desviaron ${sim.pushed}.`, msg: 'Las cajas altas se desvían a la bandeja lateral.' },
    { set: { S3: true }, wait: 150, expect: { M1: false }, msg: 'S3 detiene la banda.' },
    { set: { S3: false }, wait: 1000 },
  ],
  diag: p => {
    const d = [];
    if (!coilWith(p, 'M0.1', 'R', () => true)) d.push('La marca %M0.1 nunca se borra: después de la primera caja alta, el empujador desvía también las bajas.');
    if (coilWith(p, 'M0.1', 'R', l => hasC(l, null, 'T1.Q'))) d.push('Borras %M0.1 al terminar el empuje, con "T1".Q: si la siguiente caja alta pasa por B2 mientras empujas, su marca se pierde. Bórrala al empezar a empujar.');
    if (!coilWith(p, 'Q0.1', 'R', l => hasC(l, null, 'T1.Q'))) d.push('El empujador nunca se retrae: falta la bobina R de %Q0.1 con "T1".Q.');
    if (coilWith(p, 'Q0.1', '', () => true)) d.push('Y1 usa una bobina normal: se apaga en cuanto la caja deja de estar frente a B1, antes de completar el empuje. Usa S/R con T1.');
    return d;
  },
};

const R43 = {
  id: '4.3', short: 'Lotes', topic: 'Contadores', startFrom: '4.2',
  title: 'Conteo de cajas por lotes',
  text: 'Cuenta las cajas altas desviadas con C1 y las bajas que llegan al final (sensor B3) con C2. Al completar 3 altas se enciende H3; al completar 4 bajas se enciende H2. En ambos casos la banda se detiene hasta que S2 reinicie los contadores.',
  goal: 'Dos CTU, uso de la salida Q del contador como enclavamiento y reinicio común.',
  hint: 'El CTU cuenta flancos ascendentes de CU: cada activación del empujador es una caja alta y cada paso por B3 es una caja baja. La salida Q de cada contador detiene la banda con un contacto NC en el segmento del motor.',
  devices: ['S2', 'B3', 'Y1', 'M1', 'H2', 'H3'], outputs: ['Q0.3', 'Q0.4'],
  trace: ['C1.CV', 'C2.CV', 'Q0.0', 'Q0.4', 'Q0.3'],
  steps: [
    G('Pulsa <b>+ Contador CTU</b> (C1): CU = <b>NO %Q0.1 (Y1)</b>, R = <b>NO %I0.1 (S2)</b>, PV = <b>3</b>. En su bobina de salida asigna <b>%Q0.4 (H3)</b>.', p => { const r = box(p, 'C1'); return !!r && hasC(r.CU, 'NO', 'Q0.1') && hasC(r.R, 'NO', 'I0.1') && r.PV.value === 3 && r.out.addr === 'Q0.4'; }),
    G('Otro CTU (C2): CU = <b>NO %I0.7 (B3)</b>, R = <b>NO %I0.1 (S2)</b>, PV = <b>4</b>. Bobina de salida <b>%Q0.3 (H2)</b>.', p => { const r = box(p, 'C2'); return !!r && hasC(r.CU, 'NO', 'I0.7') && hasC(r.R, 'NO', 'I0.1') && r.PV.value === 4 && r.out.addr === 'Q0.3'; }),
    G('En el segmento del motor M1 añade en serie <b>NC "C1".Q</b> y <b>NC "C2".Q</b>: la banda se detiene con cualquier lote completo.', p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NC', 'C1.Q') && hasC(l, 'NC', 'C2.Q'))),
    G('Arranca la banda, espera un lote completo y reinicia con S2. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 100 }, ...pulse(),
    { wait: 100, expect: { M1: true }, msg: 'S1 arranca la banda.' },
    { until: ({ out }) => !out.M1, timeout: 30000, check: ({ out }) => out.H3 && !out.H2, msg: 'Con la 3.ª caja alta, la banda se detiene y H3 se enciende.' },
    { wait: 600, check: ({ sim }) => sim.pushed === 3 && sim.wrong === 0, detail: ({ sim }) => `Desviadas: ${sim.pushed}; mal clasificadas: ${sim.wrong}.`, msg: 'Las 3 cajas altas se desviaron correctamente.' },
    { set: { S2: true }, wait: 150, expect: { H3: false, H2: false }, msg: 'S2 reinicia los contadores.' },
    { set: { S2: false }, setSim: { pat: [0], k: 0 }, wait: 100 },
    ...pulse(),
    { wait: 100, expect: { M1: true }, msg: 'S1 vuelve a arrancar la banda.' },
    { until: ({ out }) => !out.M1, timeout: 40000, check: ({ out }) => out.H2 && !out.H3, msg: 'Con la 4.ª caja baja al final, la banda se detiene y H2 se enciende.' },
  ],
  diag: p => {
    const d = [];
    if (!coilWith(p, 'Q0.0', '', l => hasC(l, 'NC', 'C1.Q'))) d.push('El segmento del motor no consulta "C1".Q con un contacto NC: la banda no se detiene al completar el lote de altas.');
    const c2 = box(p, 'C2');
    if (c2 && hasC(c2.CU, null, 'I0.4')) d.push('C2 cuenta con B1: ese sensor ve todas las cajas frente al empujador, también las altas. Las bajas se cuentan al final de la banda, con B3.');
    return d;
  },
};

export const LEVEL4 = {
  n: 4, title: 'Banda y clasificación', week: 'Semana 4', mode: 'free', plant: 4, tags: TAGS4, retos: [R41, R42, R43],
  sim: sorterSim,
  intro: 'Proyecto integrador: transporte, detección, clasificación con memoria de eventos y conteo por lotes.',
};
