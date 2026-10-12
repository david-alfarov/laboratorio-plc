// Nivel 2 · Semáforo (editor libre).
import { hasC, coilWith, coilRungs, box } from './editor.js';
const G = (text, check) => ({ text, check });
const pulse = (k = 'S1') => [{ set: { [k]: true }, wait: 150 }, { set: { [k]: false }, wait: 150 }];
const ONE = { fn: ({ out }) => (out.L1 ? 1 : 0) + (out.L2 ? 1 : 0) + (out.L3 ? 1 : 0) <= 1, msg: 'Nunca hay dos luces del semáforo encendidas a la vez.' };
const latch = p => coilWith(p, 'M0.0', '', l => hasC(l, 'NO', 'I0.0') && hasC(l, 'NO', 'M0.0') && hasC(l, 'NO', 'I0.2') && hasC(l, 'NO', 'I0.5'));
const ton = (p, n, f) => { const r = box(p, n); return !!r && r.type === 'TON' && f(r); };

export const TAGS2 = [
  { addr: 'I0.0', sym: 'S1', short: 'Marcha', dev: 'Pulsador verde', wiring: 'NO', io: 'in' },
  { addr: 'I0.1', sym: 'S2', short: 'Peatón', dev: 'Pulsador de solicitud peatonal (poste y consola)', wiring: 'NO', io: 'in' },
  { addr: 'I0.2', sym: 'S3', short: 'Paro', dev: 'Pulsador rojo', wiring: 'NC', io: 'in', stop: true },
  { addr: 'I0.3', sym: 'S4', short: 'Nocturno', dev: 'Selector 0/1', wiring: 'NO', io: 'in' },
  { addr: 'I0.5', sym: 'S0', short: 'Emergencia', dev: 'Seta enclavable', wiring: 'NC', io: 'in', stop: true },
  { addr: 'Q0.0', sym: 'L1', short: 'Rojo', dev: 'Semáforo · luz roja', io: 'out' },
  { addr: 'Q0.1', sym: 'L2', short: 'Ámbar', dev: 'Semáforo · luz ámbar', io: 'out' },
  { addr: 'Q0.2', sym: 'L3', short: 'Verde', dev: 'Semáforo · luz verde', io: 'out' },
  { addr: 'Q0.3', sym: 'H1', short: 'En marcha', dev: 'Piloto verde de consola', io: 'out' },
  { addr: 'Q0.4', sym: 'L4', short: 'Peatón rojo', dev: 'Semáforo peatonal · rojo', io: 'out' },
  { addr: 'Q0.5', sym: 'L5', short: 'Peatón verde', dev: 'Semáforo peatonal · verde', io: 'out' },
];

const R21 = {
  id: '2.1', short: 'Marcha', topic: 'Editor libre',
  title: 'Marcha y paro del semáforo',
  text: 'S1 pone en marcha el semáforo y S3 lo detiene; el paro de emergencia S0 también lo detiene. Mientras está en marcha, el piloto H1 está encendido y el semáforo muestra la luz verde L3.',
  goal: 'Construir segmentos desde cero: contactos en serie y en paralelo, y la marca %M0.0 como memoria de «ciclo en marcha».',
  hint: 'Guardar el estado «en marcha» en una marca permite usarlo en todos los segmentos siguientes sin repetir la lógica de marcha y paro.',
  devices: ['S1', 'S3', 'S0', 'H1', 'L3'], outputs: ['Q0.3', 'Q0.2'],
  trace: ['I0.0', 'M0.0', 'Q0.3', 'Q0.2'],
  steps: [
    G('Pulsa <b>+ Contactos y bobina</b> para crear el primer segmento.', p => p.length > 0),
    G('Haz clic en el contacto vacío y elige <b>NO</b> con <b>%I0.0 (S1)</b>. En la bobina asigna la marca <b>%M0.0</b>.', p => coilWith(p, 'M0.0', '', l => hasC(l, 'NO', 'I0.0'))),
    G('Haz clic en S1 y elige <b>Rama en paralelo</b>. En la rama nueva coloca un contacto <b>NO</b> con <b>%M0.0</b>: es la autorretención.', p => coilWith(p, 'M0.0', '', l => hasC(l, 'NO', 'M0.0'))),
    G('Haz clic en S1 y elige <b>Serie después del paralelo</b>. Coloca un contacto <b>NO</b> con <b>%I0.2 (S3)</b>: está cableado NC, así que en reposo vale 1.', p => coilWith(p, 'M0.0', '', l => hasC(l, 'NO', 'I0.2'))),
    G('Haz clic en S3 y elige <b>Serie a la derecha</b>: contacto <b>NO</b> con <b>%I0.5 (S0)</b>.', latch),
    G('Agrega otro segmento: contacto <b>NO %M0.0</b> → bobina <b>%Q0.3 (H1)</b>.', p => coilWith(p, 'Q0.3', '', l => hasC(l, 'NO', 'M0.0'))),
    G('Agrega otro segmento: contacto <b>NO %M0.0</b> → bobina <b>%Q0.2 (L3)</b>.', p => coilWith(p, 'Q0.2', '', l => hasC(l, 'NO', 'M0.0'))),
    G('Pulsa S1, suéltalo, pulsa S3 y enclava S0 para comprobarlo. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 200, expect: { H1: false, L3: false }, msg: 'Al iniciar, el semáforo está apagado.' },
    ...pulse(),
    { wait: 150, expect: { H1: true, L3: true }, msg: 'S1 pone en marcha el ciclo: H1 y la luz verde se encienden.' },
    { set: { S3: true }, wait: 150, expect: { H1: false, L3: false }, msg: 'S3 detiene el ciclo.' },
    { set: { S3: false }, wait: 200, expect: { H1: false }, msg: 'Al soltar S3, el ciclo sigue detenido.' },
    ...pulse(),
    { set: { S0: true }, wait: 150, expect: { H1: false, L3: false }, msg: 'El paro de emergencia S0 detiene el ciclo.' },
    { set: { S1: true }, wait: 150, expect: { H1: false }, msg: 'Con S0 enclavado, S1 no arranca el ciclo.' },
    { set: { S1: false, S0: false }, wait: 150 },
  ],
  diag: p => {
    const d = [];
    if (coilWith(p, 'M0.0', '', l => hasC(l, null, 'I0.0')) && !coilWith(p, 'M0.0', '', l => hasC(l, 'NO', 'M0.0'))) d.push('El segmento de %M0.0 no tiene autorretención: falta un contacto NO de %M0.0 en paralelo con S1.');
    return d;
  },
};

const R22 = {
  id: '2.2', short: 'Secuencia', topic: 'Temporizadores encadenados', startFrom: '2.1',
  title: 'Ciclo verde → ámbar → rojo',
  text: 'Con el ciclo en marcha, el semáforo repite la secuencia verde 5 s → ámbar 2 s → rojo 5 s. Nunca deben encenderse dos luces a la vez. Al detener el ciclo, todas se apagan.',
  goal: 'TON encadenados, reinicio cíclico y salidas mutuamente excluyentes.',
  hint: 'Cada TON arranca cuando termina el anterior. El último, al terminar, corta la entrada del primero: toda la cadena se reinicia en el ciclo siguiente y la secuencia vuelve a empezar.',
  devices: ['S1', 'S3', 'L1', 'L2', 'L3'], outputs: ['Q0.0', 'Q0.1', 'Q0.2'],
  trace: ['T1.ET', 'T2.ET', 'T3.ET', 'Q0.2', 'Q0.1', 'Q0.0'],
  invariant: ONE,
  steps: [
    G('Partes de tu programa del reto 2.1. Pulsa <b>+ Temporizador TON</b> (se llamará T1). En IN coloca <b>NO %M0.0</b> y en PT escribe <b>5</b> s: es el tiempo en verde.', p => ton(p, 'T1', r => hasC(r.IN, 'NO', 'M0.0') && r.PT.value === 5)),
    G('Agrega otro TON (T2): IN = <b>NO "T1".Q</b>, PT = <b>2</b> s (ámbar).', p => ton(p, 'T2', r => hasC(r.IN, 'NO', 'T1.Q') && r.PT.value === 2)),
    G('Agrega otro TON (T3): IN = <b>NO "T2".Q</b>, PT = <b>5</b> s (rojo).', p => ton(p, 'T3', r => hasC(r.IN, 'NO', 'T2.Q') && r.PT.value === 5)),
    G('Vuelve a la entrada de T1, haz clic en %M0.0 y elige <b>Serie a la derecha</b>: contacto <b>NC "T3".Q</b>. Cuando termina el rojo, la cadena se reinicia.', p => ton(p, 'T1', r => hasC(r.IN, 'NC', 'T3.Q'))),
    G('En el segmento de la luz verde L3 añade en serie un contacto <b>NC "T1".Q</b>: verde solo mientras T1 cuenta.', p => coilWith(p, 'Q0.2', '', l => hasC(l, 'NO', 'M0.0') && hasC(l, 'NC', 'T1.Q'))),
    G('Nuevo segmento: <b>NO "T1".Q</b> y <b>NC "T2".Q</b> en serie → bobina <b>%Q0.1 (L2)</b>.', p => coilWith(p, 'Q0.1', '', l => hasC(l, 'NO', 'T1.Q') && hasC(l, 'NC', 'T2.Q'))),
    G('Nuevo segmento: <b>NO "T2".Q</b> → bobina <b>%Q0.0 (L1)</b>. T2.Q sigue en 1 mientras T3 cuenta el rojo.', p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NO', 'T2.Q'))),
    G('Arranca el ciclo y observa en el diagrama de tiempos las tres fases y el reinicio. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 100 }, ...pulse(),
    { wait: 600, expect: { L3: true, L2: false, L1: false }, msg: 'Al arrancar, solo la luz verde está encendida.' },
    { wait: 3900, expect: { L3: true }, msg: 'La luz verde dura 5 s (a los 4,9 s sigue en verde).' },
    { wait: 600, expect: { L2: true, L3: false, L1: false }, msg: 'A los 5 s pasa a ámbar.' },
    { wait: 1400, expect: { L2: true }, msg: 'El ámbar dura 2 s.' },
    { wait: 600, expect: { L1: true, L2: false, L3: false }, msg: 'A los 7 s pasa a rojo.' },
    { wait: 4400, expect: { L1: true }, msg: 'El rojo dura 5 s.' },
    { wait: 700, expect: { L3: true, L1: false }, msg: 'A los 12 s la secuencia vuelve a empezar en verde.' },
    { set: { S3: true }, wait: 150, expect: { L1: false, L2: false, L3: false }, msg: 'Al detener el ciclo, todas las luces se apagan.' },
    { set: { S3: false }, wait: 100 },
  ],
  diag: p => {
    const d = [];
    const t1 = box(p, 'T1');
    if (t1 && !hasC(t1.IN, 'NC', 'T3.Q')) d.push('La entrada de T1 no se corta con "T3".Q: la cadena nunca se reinicia y el semáforo se queda en rojo.');
    if (!coilWith(p, 'Q0.2', '', l => hasC(l, 'NC', 'T1.Q'))) d.push('La luz verde no se apaga cuando termina T1: falta un contacto NC "T1".Q en su segmento.');
    if (!coilWith(p, 'Q0.1', '', l => hasC(l, 'NC', 'T2.Q'))) d.push('El ámbar no se apaga cuando termina T2: falta un contacto NC "T2".Q en su segmento.');
    return d;
  },
};

const R23 = {
  id: '2.3', short: 'Nocturno', topic: 'Osciladores', startFrom: '2.2',
  title: 'Modo nocturno: ámbar intermitente',
  text: 'Con el selector S4 en 1, el semáforo pasa a modo nocturno: solo la luz ámbar parpadea, 0,5 s encendida y 0,5 s apagada. Al volver S4 a 0, se reanuda el ciclo normal desde el verde.',
  goal: 'Oscilador con dos TON y bloqueo de la secuencia normal.',
  hint: 'Dos temporizadores que se reinician mutuamente forman un oscilador: T4 cuenta el tiempo encendido y T5 el apagado. Un contacto NC de S4 bloquea la secuencia normal mientras dura el modo nocturno.',
  devices: ['S1', 'S4', 'L1', 'L2', 'L3'], outputs: ['Q0.0', 'Q0.1', 'Q0.2'],
  trace: ['I0.3', 'T4.ET', 'T5.ET', 'Q0.1', 'Q0.2'],
  invariant: ONE,
  steps: [
    G('En la entrada de <b>T1</b> añade en serie un contacto <b>NC %I0.3 (S4)</b>: la secuencia normal se detiene en modo nocturno.', p => ton(p, 'T1', r => hasC(r.IN, 'NC', 'I0.3'))),
    G('En el segmento de la luz verde L3 añade en serie <b>NC %I0.3 (S4)</b>.', p => coilWith(p, 'Q0.2', '', l => hasC(l, 'NC', 'I0.3'))),
    G('Agrega un TON (T4): IN = <b>NO %M0.0</b> y <b>NO %I0.3 (S4)</b> en serie; PT = <b>0,5</b> s.', p => ton(p, 'T4', r => hasC(r.IN, 'NO', 'M0.0') && hasC(r.IN, 'NO', 'I0.3') && r.PT.value === 0.5)),
    G('Agrega un TON (T5): IN = <b>NO "T4".Q</b>, PT = <b>0,5</b> s.', p => ton(p, 'T5', r => hasC(r.IN, 'NO', 'T4.Q') && r.PT.value === 0.5)),
    G('Vuelve a T4 y añade en serie <b>NC "T5".Q</b>: al terminar T5, T4 se reinicia y el ciclo de parpadeo vuelve a empezar.', p => ton(p, 'T4', r => hasC(r.IN, 'NC', 'T5.Q'))),
    G('En el segmento del ámbar, haz clic en "T1".Q, luego <b>Mayús + clic</b> en "T2".Q y elige <b>Rama en paralelo a la selección</b>. En la rama nueva coloca <b>NO %I0.3 (S4)</b> y en serie <b>NC "T4".Q</b>.', p => coilWith(p, 'Q0.1', '', l => hasC(l, 'NO', 'I0.3') && hasC(l, 'NC', 'T4.Q'))),
    G('Gira S4 a 1 y observa el oscilador T4/T5 en el diagrama de tiempos. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 100 }, ...pulse(),
    { wait: 700, expect: { L3: true }, msg: 'En modo normal, el ciclo arranca en verde.' },
    { set: { S4: true }, wait: 250, expect: { L2: true, L1: false, L3: false }, msg: 'Al pasar S4 a 1, solo el ámbar se enciende.' },
    { wait: 500, expect: { L2: false }, msg: 'A los 0,5 s el ámbar se apaga.' },
    { wait: 500, expect: { L2: true }, msg: 'A los 0,5 s vuelve a encenderse: el parpadeo se repite.' },
    { wait: 3000, expect: { L1: false, L3: false }, msg: 'Durante el modo nocturno, rojo y verde permanecen apagados.' },
    { set: { S4: false }, wait: 400, expect: { L3: true, L2: false }, msg: 'Al volver S4 a 0, el ciclo normal se reanuda en verde.' },
  ],
  diag: p => {
    const d = [];
    const t4 = box(p, 'T4');
    if (t4 && !hasC(t4.IN, 'NC', 'T5.Q')) d.push('T4 no se reinicia con "T5".Q: el ámbar se enciende una sola vez y queda apagado.');
    if (!coilWith(p, 'Q0.2', '', l => hasC(l, 'NC', 'I0.3'))) d.push('La luz verde no está bloqueada por S4: falta NC %I0.3 en su segmento, por eso se enciende en modo nocturno.');
    return d;
  },
};

const SAFE = { fn: o => ONE.fn(o) && !(o.out.L3 && o.out.L5) && !(o.out.L4 && o.out.L5), msg: 'Nunca hay verde vehicular y verde peatonal a la vez, ni dos luces del mismo semáforo encendidas.' };
const R24 = {
  id: '2.4', short: 'Peatonal', topic: 'Solicitud memorizada', startFrom: '2.1',
  title: 'Cruce peatonal a demanda',
  text: 'Con el ciclo en marcha, los vehículos tienen verde y los peatones rojo. Cuando un peatón pulsa S2, el semáforo vehicular pasa a ámbar durante 2 s y después a rojo; en ese momento los peatones tienen verde durante 5 s. Luego se vuelve al verde vehicular hasta la siguiente solicitud. Al detener el ciclo, todo se apaga.',
  goal: 'Memorizar una solicitud con Set/Reset, secuencia temporizada a demanda y varias bobinas en paralelo en un segmento.',
  hint: 'La pulsación del peatón dura un instante, pero la secuencia dura 7 s: por eso se guarda en la marca %M0.1. Mientras esa marca está activa avanza la secuencia; al terminar el cruce, un Reset la borra y todo vuelve al reposo.',
  devices: ['S2', 'L1', 'L2', 'L3', 'L4', 'L5'], outputs: ['Q0.0', 'Q0.1', 'Q0.2', 'Q0.4', 'Q0.5'],
  trace: ['I0.1', 'M0.1', 'T1.ET', 'T2.ET', 'Q0.2', 'Q0.5'],
  invariant: SAFE,
  steps: [
    G('Partes de tu programa del reto 2.1. Agrega un segmento: <b>NO %I0.1 (S2)</b> y <b>NO %M0.0</b> en serie → bobina <b>S %M0.1</b>. La solicitud queda memorizada.', p => coilWith(p, 'M0.1', 'S', l => hasC(l, 'NO', 'I0.1') && hasC(l, 'NO', 'M0.0'))),
    G('Agrega un TON (T1): IN = <b>NO %M0.1</b>, PT = <b>2</b> s. Es el tiempo en ámbar.', p => { const r = box(p, 'T1'); return !!r && hasC(r.IN, 'NO', 'M0.1') && r.PT.value === 2; }),
    G('Agrega un TON (T2): IN = <b>NO "T1".Q</b>, PT = <b>5</b> s. Es el tiempo de cruce.', p => { const r = box(p, 'T2'); return !!r && hasC(r.IN, 'NO', 'T1.Q') && r.PT.value === 5; }),
    G('Agrega un segmento: <b>NO "T2".Q</b> en paralelo con <b>NC %M0.0</b> → bobina <b>R %M0.1</b>. La solicitud se borra al terminar el cruce o al detener el ciclo.', p => coilWith(p, 'M0.1', 'R', l => hasC(l, 'NO', 'T2.Q') && hasC(l, 'NC', 'M0.0'))),
    G('En el segmento de la luz verde <b>L3</b> añade en serie <b>NC %M0.1</b>: el verde vehicular se apaga en cuanto hay una solicitud.', p => coilWith(p, 'Q0.2', '', l => hasC(l, 'NO', 'M0.0') && hasC(l, 'NC', 'M0.1'))),
    G('Agrega un segmento: <b>NO %M0.1</b> y <b>NC "T1".Q</b> en serie → bobina <b>%Q0.1 (L2)</b>, el ámbar.', p => coilWith(p, 'Q0.1', '', l => hasC(l, 'NO', 'M0.1') && hasC(l, 'NC', 'T1.Q'))),
    G('Agrega un segmento: <b>NO "T1".Q</b> → bobina <b>%Q0.0 (L1)</b>. Haz clic en la bobina y elige <b>Bobina en paralelo</b>; asígnale <b>%Q0.5 (L5)</b>. Rojo vehicular y verde peatonal se activan con la misma condición.', p => coilRungs(p, 'Q0.0').some(r => coilRungs([r], 'Q0.5').length && hasC(r.logic, 'NO', 'T1.Q'))),
    G('Agrega un segmento: <b>NO %M0.0</b> y <b>NC "T1".Q</b> → bobina <b>%Q0.4 (L4)</b>, el rojo peatonal.', p => coilWith(p, 'Q0.4', '', l => hasC(l, 'NO', 'M0.0') && hasC(l, 'NC', 'T1.Q'))),
    G('Arranca el ciclo y pulsa S2 en la consola o en el poste peatonal. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 100 }, ...pulse(),
    { wait: 300, expect: { L3: true, L4: true, L5: false, L1: false }, msg: 'Al arrancar: verde vehicular y rojo peatonal.' },
    { wait: 5000, expect: { L3: true, L4: true }, msg: 'Sin solicitud, el verde vehicular se mantiene.' },
    ...pulse('S2'),
    { wait: 200, expect: { L2: true, L3: false, L4: true }, msg: 'Al pulsar S2 pasa a ámbar; los peatones siguen en rojo.' },
    { wait: 1300, expect: { L2: true }, msg: 'El ámbar dura 2 s.' },
    { wait: 600, expect: { L1: true, L5: true, L4: false, L2: false }, msg: 'A los 2 s: rojo vehicular y verde peatonal.' },
    { wait: 4300, expect: { L1: true, L5: true }, msg: 'El cruce peatonal dura 5 s.' },
    { wait: 700, expect: { L3: true, L4: true, L5: false, L1: false }, msg: 'Al terminar el cruce, vuelve el verde vehicular.' },
    { wait: 3000, expect: { L3: true }, msg: 'Sin nueva solicitud, el cruce no se repite.' },
    ...pulse('S2'), { wait: 2500 },
    { set: { S3: true }, wait: 200, expect: { L1: false, L2: false, L3: false, L4: false, L5: false }, msg: 'Al detener el ciclo durante el cruce, todo se apaga.' },
    { set: { S3: false }, wait: 300, expect: { L5: false, L1: false }, msg: 'Al soltar S3, la solicitud no queda pendiente.' },
  ],
  diag: p => {
    const d = [];
    if (!coilWith(p, 'M0.1', 'S', () => true)) d.push('La solicitud del peatón no se memoriza: falta la bobina S de %M0.1. Sin ella, la secuencia se corta al soltar S2.');
    if (!coilWith(p, 'Q0.2', '', l => hasC(l, 'NC', 'M0.1'))) d.push('El verde vehicular no se apaga con la solicitud: falta NC %M0.1 en el segmento de L3.');
    if (!coilWith(p, 'M0.1', 'R', l => hasC(l, 'NC', 'M0.0'))) d.push('Al detener el ciclo la solicitud sigue memorizada y el rojo vehicular queda encendido: añade NC %M0.0 en paralelo en el Reset de %M0.1.');
    return d;
  },
};

export const LEVEL2 = {
  n: 2, title: 'Semáforo', week: 'Semana 2', mode: 'free', plant: 2, tags: TAGS2, retos: [R21, R22, R23, R24],
  intro: 'Editor libre: el estudiante construye cada segmento desde cero. Secuencias temporizadas, encadenamiento de TON, osciladores y un cruce peatonal a demanda.',
};
