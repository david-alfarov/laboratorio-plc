// Nivel 3 · Tanque de llenado (editor libre, planta simulada).
import { hasC, coilWith, box, cmpWith, mathBox } from './editor.js';
import { tankSim } from './sims.js';
const G = (text, check) => ({ text, check });
const pulse = (k = 'S1') => [{ set: { [k]: true }, wait: 150 }, { set: { [k]: false }, wait: 150 }];
const NOSPILL = { fn: ({ sim }) => sim.L < 0.97, msg: 'El tanque nunca rebalsa.' };
const lvl = ({ sim }) => `Nivel del tanque: ${Math.round(sim.L * 100)} %.`;

export const TAGS3 = [
  { addr: 'I0.0', sym: 'S1', short: 'Marcha', dev: 'Pulsador verde', wiring: 'NO', io: 'in' },
  { addr: 'I0.2', sym: 'S3', short: 'Paro', dev: 'Pulsador rojo', wiring: 'NC', io: 'in', stop: true },
  { addr: 'I0.3', sym: 'S4', short: 'Automático', dev: 'Selector 0/1', wiring: 'NO', io: 'in' },
  { addr: 'I0.5', sym: 'S0', short: 'Emergencia', dev: 'Seta enclavable', wiring: 'NC', io: 'in', stop: true },
  { addr: 'I0.6', sym: 'B2', short: 'Nivel bajo', dev: 'Sensor capacitivo al 15 %', wiring: 'NO', io: 'in', sensor: true },
  { addr: 'I0.7', sym: 'B3', short: 'Nivel alto', dev: 'Sensor capacitivo al 85 %', wiring: 'NC', io: 'in', sensor: true },
  { addr: 'IW64', sym: 'B4', short: 'Nivel analógico', dev: 'Transmisor de nivel 4–20 mA (0–27648)', wiring: 'AI', io: 'ain', sensor: true },
  { addr: 'Q0.0', sym: 'P1', short: 'Bomba', dev: 'Bomba de llenado (vía K1)', io: 'out' },
  { addr: 'Q0.1', sym: 'Y1', short: 'Válvula', dev: 'Electroválvula de vaciado', io: 'out' },
  { addr: 'Q0.2', sym: 'H1', short: 'Ciclo', dev: 'Piloto verde de consola', io: 'out' },
];

const R31 = {
  id: '3.1', short: 'Llenado', topic: 'Sensores a prueba de fallos',
  title: 'Llenado con paro por nivel alto',
  text: 'S1 arranca la bomba P1 y queda en marcha al soltarlo. La bomba se detiene sola al alcanzar el nivel alto B3, o al pulsar S3 o S0. B3 está cableado NC: mientras el agua no lo alcanza, entrega un 1.',
  goal: 'Autorretención con paro automático por sensor y cableado NC en sensores de seguridad.',
  hint: 'B3 se comporta como un pulsador de paro accionado por el agua. Si su cable se corta, la entrada cae a 0 y la bomba se detiene: el tanque no rebalsa por una falla del sensor.',
  devices: ['S1', 'S3', 'S0', 'P1', 'B3'], outputs: ['Q0.0'],
  trace: ['I0.0', 'Q0.0', 'I0.7', 'SIM.L'],
  simInit: { L: 0.05 }, invariant: NOSPILL,
  steps: [
    G('Agrega un segmento: contacto <b>NO %I0.0 (S1)</b> → bobina <b>%Q0.0 (P1)</b>.', p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NO', 'I0.0'))),
    G('Rama en paralelo con S1: contacto <b>NO %Q0.0 (P1)</b>, la autorretención.', p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NO', 'Q0.0'))),
    G('Serie después del paralelo: <b>NO %I0.2 (S3)</b> y <b>NO %I0.5 (S0)</b>.', p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NO', 'I0.2') && hasC(l, 'NO', 'I0.5'))),
    G('En serie, contacto <b>NO %I0.7 (B3)</b>. Con el tanque lleno, B3 entrega 0 y corta la bomba.', p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NO', 'I0.7'))),
    G('Pulsa S1 y observa el nivel en el diagrama de tiempos hasta que B3 detenga la bomba. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 200, expect: { P1: false }, msg: 'Al iniciar, la bomba está parada.' },
    { set: { S1: true }, wait: 150, expect: { P1: true }, msg: 'Al pulsar S1, la bomba arranca.' },
    { set: { S1: false }, wait: 300, expect: { P1: true }, msg: 'Al soltar S1, la bomba sigue en marcha.' },
    { until: ({ out }) => !out.P1, timeout: 12000, check: ({ sim }) => sim.L >= 0.84 && sim.L < 0.9, detail: lvl, msg: 'La bomba se detiene al alcanzar el nivel alto B3.' },
    { set: { S1: true }, wait: 200, expect: { P1: false }, msg: 'Con el tanque lleno, S1 no arranca la bomba.' },
    { set: { S1: false }, setSim: { L: 0.3 }, wait: 200 },
    ...pulse(),
    { set: { S3: true }, wait: 150, expect: { P1: false }, msg: 'S3 detiene la bomba.' },
    { set: { S3: false }, wait: 100 },
    ...pulse(),
    { set: { S0: true }, wait: 150, expect: { P1: false }, msg: 'El paro de emergencia S0 detiene la bomba.' },
    { set: { S0: false }, wait: 100 },
  ],
  diag: p => {
    const d = [];
    if (coilWith(p, 'Q0.0', '', l => hasC(l, 'NC', 'I0.7'))) d.push('B3 está programado con un contacto NC. Como B3 está cableado NC, su bit vale 1 mientras el tanque no está lleno: el NC queda abierto y la bomba nunca arranca. Usa un contacto NO.');
    if (!coilWith(p, 'Q0.0', '', l => hasC(l, null, 'I0.7'))) d.push('El segmento de la bomba no consulta B3 (%I0.7): nada la detiene al llenarse el tanque.');
    return d;
  },
};

const R32 = {
  id: '3.2', short: 'Automático', topic: 'Histéresis con S/R',
  title: 'Control automático de nivel',
  text: 'Con el selector S4 en 1 (modo automático), la válvula Y1 se abre para abastecer al proceso. La bomba arranca cuando el nivel baja de B2 y se detiene al llegar a B3, de modo que el nivel se mantiene entre ambos sensores. Con S4 en 0, bomba y válvula se apagan.',
  goal: 'Control todo-nada con histéresis mediante bobinas Set/Reset.',
  hint: 'Entre B2 y B3 la bomba debe conservar su estado anterior: si viene llenando, sigue; si viene parada, sigue parada. Esa memoria la da el par Set/Reset. Aquí «tanque lleno» es el bit de B3 en 0, que se consulta con un contacto NC.',
  devices: ['S4', 'P1', 'Y1', 'B2', 'B3'], outputs: ['Q0.0', 'Q0.1'],
  trace: ['I0.6', 'I0.7', 'Q0.0', 'Q0.1', 'SIM.L'],
  simInit: { L: 0.5 }, invariant: NOSPILL,
  steps: [
    G('Segmento: <b>NO %I0.3 (S4)</b> → bobina <b>%Q0.1 (Y1)</b>. En automático la válvula abastece al proceso.', p => coilWith(p, 'Q0.1', '', l => hasC(l, 'NO', 'I0.3'))),
    G('Segmento: <b>NO %I0.3 (S4)</b> en serie con <b>NC %I0.6 (B2)</b> → bobina de tipo <b>S</b> en <b>%Q0.0 (P1)</b>. Si el agua baja de B2, su bit cae a 0 y el NC conduce.', p => coilWith(p, 'Q0.0', 'S', l => hasC(l, 'NO', 'I0.3') && hasC(l, 'NC', 'I0.6'))),
    G('Segmento: <b>NC %I0.7 (B3)</b> → bobina de tipo <b>R</b> en <b>%Q0.0 (P1)</b>. Con el tanque lleno, B3 entrega 0 y el NC conduce.', p => coilWith(p, 'Q0.0', 'R', l => hasC(l, 'NC', 'I0.7'))),
    G('Haz clic en B3 y elige <b>Rama en paralelo</b>: contacto <b>NC %I0.3 (S4)</b>. Al salir de automático, la bomba también se apaga.', p => coilWith(p, 'Q0.0', 'R', l => hasC(l, 'NC', 'I0.3'))),
    G('Gira S4 a 1 y observa cómo el nivel oscila entre B2 y B3 en el diagrama de tiempos. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 200, expect: { P1: false, Y1: false }, msg: 'Con S4 en 0, bomba y válvula están apagadas.' },
    { set: { S4: true }, wait: 300, expect: { Y1: true, P1: false }, msg: 'En automático la válvula se abre; con nivel intermedio, la bomba sigue parada.' },
    { until: ({ out }) => out.P1, timeout: 12000, check: ({ sim }) => sim.L < 0.17, detail: lvl, msg: 'Cuando el nivel baja de B2, la bomba arranca.' },
    { wait: 3000, expect: { P1: true }, msg: 'Entre B2 y B3 la bomba sigue llenando (histéresis).' },
    { until: ({ out }) => !out.P1, timeout: 15000, check: ({ sim }) => sim.L >= 0.84 && sim.L < 0.9, detail: lvl, msg: 'Al alcanzar B3, la bomba se detiene.' },
    { wait: 3000, expect: { P1: false }, msg: 'Mientras el nivel baja hacia B2, la bomba sigue parada.' },
    { set: { S4: false }, wait: 200, expect: { P1: false, Y1: false }, msg: 'Al pasar S4 a 0, bomba y válvula se apagan.' },
  ],
  diag: p => {
    const d = [];
    if (coilWith(p, 'Q0.0', '', () => true)) d.push('La bomba usa una bobina normal: sin memoria, se apaga en cuanto el nivel supera B2 y nunca llega a B3. Usa una bobina S para arrancar y otra R para parar.');
    if (coilWith(p, 'Q0.0', 'S', l => hasC(l, 'NO', 'I0.6'))) d.push('El Set de la bomba usa NO %I0.6: arranca cuando hay agua sobre B2, al revés de lo pedido. Usa NC: conduce cuando el nivel baja de B2.');
    if (coilWith(p, 'Q0.0', 'R', l => hasC(l, 'NO', 'I0.7'))) d.push('El Reset de la bomba usa NO %I0.7: como B3 está cableado NC, ese bit vale 1 con el tanque vacío y la bomba se resetea todo el tiempo. Usa NC.');
    return d;
  },
};

const R33 = {
  id: '3.3', short: 'Lote', topic: 'Secuencias por etapas',
  title: 'Ciclo de llenado, mezcla y vaciado',
  text: 'Con S4 en 0, S1 inicia un ciclo por lotes: llenar hasta B3, mezclar durante 5 s y vaciar con Y1 hasta que el nivel baje de B2. El piloto H1 permanece encendido durante todo el ciclo. S3 o S0 cancelan el ciclo en cualquier etapa.',
  goal: 'Secuencia de etapas con marcas, transiciones con Set/Reset y temporizador.',
  hint: 'Cada etapa es una marca: %M0.1 llenado, %M0.2 mezcla y %M0.3 vaciado. Una etapa se activa con su condición de transición y desactiva la anterior. Es la misma lógica que se formaliza con GRAFCET.',
  devices: ['S1', 'S3', 'P1', 'Y1', 'B2', 'B3', 'H1'], outputs: ['Q0.0', 'Q0.1', 'Q0.2'],
  trace: ['M0.1', 'M0.2', 'M0.3', 'T1.ET', 'SIM.L'],
  simInit: { L: 0.05 }, invariant: NOSPILL,
  steps: [
    G('Etapa de llenado: <b>NO %I0.0 (S1)</b> → bobina <b>S %M0.1</b>.', p => coilWith(p, 'M0.1', 'S', l => hasC(l, 'NO', 'I0.0'))),
    G('Transición a mezcla: <b>NO %M0.1</b> y <b>NC %I0.7 (B3)</b> en serie → <b>S %M0.2</b>. Haz clic en esa bobina, elige <b>Bobina en paralelo</b> y asígnale <b>R %M0.1</b>: la etapa nueva se activa y la anterior se apaga en el mismo ciclo.', p => coilWith(p, 'M0.2', 'S', l => hasC(l, 'NO', 'M0.1') && hasC(l, 'NC', 'I0.7')) && coilWith(p, 'M0.1', 'R', l => hasC(l, 'NC', 'I0.7'))),
    G('Mezcla: TON (T1) con IN = <b>NO %M0.2</b> y PT = <b>5</b> s.', p => { const r = box(p, 'T1'); return !!r && hasC(r.IN, 'NO', 'M0.2') && r.PT.value === 5; }),
    G('Transición a vaciado: <b>NO "T1".Q</b> → <b>S %M0.3</b>, con una bobina en paralelo <b>R %M0.2</b>.', p => coilWith(p, 'M0.3', 'S', l => hasC(l, 'NO', 'T1.Q')) && coilWith(p, 'M0.2', 'R', l => hasC(l, 'NO', 'T1.Q'))),
    G('Fin del ciclo: <b>NO %M0.3</b> y <b>NC %I0.6 (B2)</b> → <b>R %M0.3</b>.', p => coilWith(p, 'M0.3', 'R', l => hasC(l, 'NO', 'M0.3') && hasC(l, 'NC', 'I0.6'))),
    G('Salidas: <b>NO %M0.1</b> → <b>%Q0.0 (P1)</b>; <b>NO %M0.3</b> → <b>%Q0.1 (Y1)</b>; y <b>%M0.1, %M0.2 y %M0.3</b> en paralelo → <b>%Q0.2 (H1)</b>.', p => coilWith(p, 'Q0.0', '', l => hasC(l, 'NO', 'M0.1')) && coilWith(p, 'Q0.1', '', l => hasC(l, 'NO', 'M0.3')) && coilWith(p, 'Q0.2', '', l => hasC(l, 'NO', 'M0.1') && hasC(l, 'NO', 'M0.2') && hasC(l, 'NO', 'M0.3'))),
    G('Cancelación: un segmento con <b>NC %I0.2 (S3)</b> y <b>NC %I0.5 (S0)</b> en paralelo → tres bobinas en paralelo <b>R %M0.1</b>, <b>R %M0.2</b> y <b>R %M0.3</b>. Aquí el NC conduce cuando S3 se pulsa o S0 se enclava.', p => ['M0.1', 'M0.2', 'M0.3'].every(m => coilWith(p, m, 'R', l => hasC(l, 'NC', 'I0.2') && hasC(l, 'NC', 'I0.5')))),
    G('Prueba un ciclo completo y una cancelación. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 200, expect: { P1: false, Y1: false, H1: false }, msg: 'Al iniciar, todo está apagado.' },
    ...pulse(),
    { wait: 100, expect: { P1: true, H1: true, Y1: false }, msg: 'S1 inicia el llenado: bomba y H1 encendidas.' },
    { until: ({ out }) => !out.P1, timeout: 12000, check: ({ sim, out }) => sim.L >= 0.84 && !out.Y1 && out.H1, detail: lvl, msg: 'Al alcanzar B3 la bomba se detiene y empieza la mezcla.' },
    { wait: 3500, expect: { Y1: false, P1: false, H1: true }, msg: 'Durante la mezcla, bomba y válvula siguen apagadas.' },
    { wait: 2000, expect: { Y1: true }, msg: 'Tras 5 s de mezcla se abre la válvula.' },
    { until: ({ out }) => !out.Y1, timeout: 25000, check: ({ sim, out }) => sim.L < 0.16 && !out.H1, detail: lvl, msg: 'Al bajar de B2 la válvula se cierra y el ciclo termina.' },
    ...pulse(),
    { wait: 300, expect: { P1: true }, msg: 'S1 inicia un nuevo ciclo.' },
    { set: { S3: true }, wait: 150, expect: { P1: false, Y1: false, H1: false }, msg: 'S3 cancela el ciclo.' },
    { set: { S3: false }, wait: 300, expect: { P1: false, H1: false }, msg: 'Tras cancelar, el ciclo no se reanuda solo.' },
  ],
  diag: p => {
    const d = [];
    if (coilWith(p, 'M0.2', 'S', l => hasC(l, 'NO', 'I0.7'))) d.push('La transición a mezcla usa NO %I0.7: ese bit vale 1 con el tanque vacío, así que la mezcla empieza de inmediato. «Tanque lleno» es NC %I0.7.');
    if (!coilWith(p, 'M0.1', 'R', l => hasC(l, 'NO', 'M0.2') || hasC(l, 'NC', 'I0.7'))) d.push('Ninguna etapa apaga %M0.1: la bomba sigue en marcha durante la mezcla.');
    if (!coilWith(p, 'M0.3', 'R', l => hasC(l, null, 'I0.6'))) d.push('Nada termina la etapa de vaciado: falta el Reset de %M0.3 con NC %I0.6 (B2).');
    return d;
  },
};

const R34 = {
  id: '3.4', short: 'Analógico', topic: 'Señales analógicas', startFrom: '3.2',
  title: 'Control con transmisor analógico',
  text: 'El transmisor B4 mide el nivel de forma continua y el módulo analógico lo entrega en %IW64 como un entero entre 0 (vacío) y 27648 (lleno). Normaliza el valor con NORM_X en %MD0 y escálalo a porcentaje (0 a 100) con SCALE_X en %MD10. En modo automático la bomba debe arrancar cuando el nivel baja de 30 % y detenerse al superar 70 %. El piloto H1 indica alarma de nivel alto por encima de 90 %, en cualquier modo.',
  goal: 'Escalado de una entrada analógica (NORM_X + SCALE_X) y comparadores en lugar de sensores todo-nada.',
  hint: 'NORM_X convierte el rango 0–27648 en un valor entre 0,0 y 1,0; SCALE_X lo lleva a unidades de ingeniería, aquí 0 a 100 %. Con el nivel en %, los umbrales se cambian editando un número, sin mover ningún sensor.',
  devices: ['B4', 'P1', 'Y1', 'H1', 'S4'], outputs: ['Q0.0', 'Q0.1', 'Q0.2'],
  trace: ['IW64', 'MD10', 'Q0.0', 'Q0.2'],
  simInit: { L: 0.5 }, invariant: NOSPILL,
  steps: [
    G('Partes de tu programa del reto 3.2. Haz clic en el contacto <b>NC %I0.6 (B2)</b> del Set de la bomba y elige <b>Eliminar elemento</b>; elimina también el <b>NC %I0.7 (B3)</b> del Reset. Los reemplazará el transmisor analógico.', p => !coilWith(p, 'Q0.0', 'S', l => hasC(l, null, 'I0.6')) && !coilWith(p, 'Q0.0', 'R', l => hasC(l, null, 'I0.7'))),
    G('Pulsa <b>+ NORM_X</b>. Deja EN vacío (siempre habilitado) y completa: MIN = <b>0</b>, VALUE = <b>%IW64</b>, MAX = <b>27648</b>, OUT = <b>%MD0</b>.', p => mathBox(p, 'NORM_X', r => r.MIN.value === 0 && r.VALUE.addr === 'IW64' && r.MAX.value === 27648 && r.OUT.addr === 'MD0')),
    G('Pulsa <b>+ SCALE_X</b>: MIN = <b>0</b>, VALUE = <b>%MD0</b>, MAX = <b>100</b>, OUT = <b>%MD10</b>. Con el PLC en RUN verás el nivel en % debajo de OUT.', p => mathBox(p, 'SCALE_X', r => r.MIN.value === 0 && r.VALUE.addr === 'MD0' && r.MAX.value === 100 && r.OUT.addr === 'MD10')),
    G('En el Set de la bomba, haz clic en <b>NO %I0.3 (S4)</b> y elige <b>Serie a la derecha</b>. En el contacto nuevo elige el tipo <b>CMP</b>: operando <b>%MD10</b>, comparación <b>&lt;=</b>, valor <b>30</b>.', p => coilWith(p, 'Q0.0', 'S', l => hasC(l, 'NO', 'I0.3') && cmpWith(l, 'MD10', '<=', 30))),
    G('En el Reset de la bomba, haz clic en <b>NC %I0.3 (S4)</b> y elige <b>Rama en paralelo</b>: comparador <b>%MD10 &gt;= 70</b>.', p => coilWith(p, 'Q0.0', 'R', l => hasC(l, 'NC', 'I0.3') && cmpWith(l, 'MD10', '>=', 70))),
    G('Agrega un segmento: comparador <b>%MD10 &gt;= 90</b> → bobina <b>%Q0.2 (H1)</b>, la alarma de nivel alto.', p => coilWith(p, 'Q0.2', '', l => cmpWith(l, 'MD10', '>=', 90))),
    G('Gira S4 a 1 y observa en el diagrama de tiempos cómo el nivel en % oscila entre 30 y 70. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 200, expect: { P1: false, Y1: false, H1: false }, msg: 'Con S4 en 0 y nivel al 50 %, todo está apagado.' },
    { setSim: { L: 0.95 }, wait: 200, expect: { H1: true }, msg: 'Con el nivel al 95 %, la alarma H1 se enciende.' },
    { setSim: { L: 0.85 }, wait: 200, expect: { H1: false }, msg: 'Con el nivel al 85 %, la alarma H1 se apaga.' },
    { setSim: { L: 0.5 }, set: { S4: true }, wait: 300, expect: { Y1: true, P1: false }, msg: 'En automático con nivel al 50 %, la válvula abre y la bomba sigue parada.' },
    { until: ({ out }) => out.P1, timeout: 12000, check: ({ sim }) => sim.L > 0.27 && sim.L < 0.31, detail: lvl, msg: 'La bomba arranca cuando el nivel baja de 30 %.' },
    { wait: 2000, expect: { P1: true }, msg: 'Entre 30 % y 70 % la bomba sigue llenando.' },
    { until: ({ out }) => !out.P1, timeout: 15000, check: ({ sim }) => sim.L >= 0.69 && sim.L < 0.73, detail: lvl, msg: 'La bomba se detiene al superar 70 %.' },
    { set: { S4: false }, wait: 200, expect: { P1: false, Y1: false }, msg: 'Al pasar S4 a 0, bomba y válvula se apagan.' },
  ],
  diag: p => {
    const d = [];
    let md0 = false, iw = false;
    p.forEach(r => [r.logic, r.IN].forEach(n => n && (function w(x) { if (x.t === 'cmp' && x.addr === 'MD0') md0 = true; if (x.t === 'cmp' && x.addr === 'IW64') iw = true; (x.items || []).forEach(w); })(n)));
    if (md0) d.push('Comparas %MD0 con un porcentaje, pero %MD0 está normalizado entre 0,0 y 1,0. Compara %MD10, que está en %.');
    if (iw) d.push('Comparas %IW64 directamente: su valor va de 0 a 27648, no de 0 a 100. Compara %MD10.');
    if (mathBox(p, 'SCALE_X', r => r.VALUE.addr === 'IW64')) d.push('SCALE_X recibe %IW64 sin normalizar. Su VALUE debe ser la salida de NORM_X, %MD0.');
    if (p.findIndex(r => r.type === 'SCALE_X') >= 0 && p.findIndex(r => r.type === 'SCALE_X') < p.findIndex(r => r.type === 'NORM_X')) d.push('SCALE_X está antes que NORM_X: en cada ciclo escala el valor del ciclo anterior. Ponlos en orden.');
    if (coilWith(p, 'Q0.0', 'S', l => hasC(l, null, 'I0.6')) || coilWith(p, 'Q0.0', 'R', l => hasC(l, null, 'I0.7'))) d.push('La bomba sigue usando los sensores B2 o B3. En este reto los reemplazan los comparadores de %MD10.');
    return d;
  },
};

export const LEVEL3 = {
  n: 3, title: 'Tanque de llenado', week: 'Semana 3', mode: 'free', plant: 3, tags: TAGS3, retos: [R31, R32, R33, R34],
  sim: tankSim, analog: true,
  intro: 'Proceso continuo con sensores de nivel: paro por sensor con cableado a prueba de fallos, control con histéresis, secuencias por etapas y medición analógica con escalado.',
};
