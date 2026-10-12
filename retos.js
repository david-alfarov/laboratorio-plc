// Nivel 1 · Fundamentos. Cada reto: enunciado, plantilla Ladder guiada (slots) y pruebas.
const C = id => ({ slot: id, accept: 'contact' });
const Q = id => ({ slot: id, accept: 'coil' });
// Paso de la guía: texto + hueco al que se refiere + respuesta que lo da por completado.
const G = (text, slot, expect) => ({ text, slot, expect });
const NO = addr => ({ kind: 'NO', addr }), NC = addr => ({ kind: 'NC', addr });

function truth(ins, out, fn) {
  const steps = [{ set: { S1: false, S2: false, S4: false }, wait: 50 }];
  const n = ins.length;
  for (let m = 0; m < (1 << n); m++) {
    const set = {};
    ins.forEach((s, i) => { set[s] = !!((m >> (n - 1 - i)) & 1); });
    const exp = fn(...ins.map(s => set[s]));
    steps.push({
      set, wait: 100, expect: { [out]: exp },
      msg: `${ins.map(s => `${s} ${set[s] ? (s === 'S4' ? 'en 1' : 'pulsado') : (s === 'S4' ? 'en 0' : 'sin pulsar')}`).join(', ')}: ${out} ${exp ? 'encendida' : 'apagada'}`,
    });
  }
  return steps;
}

export const RETOS = [
  {
    id: '1.1', short: 'AND', topic: 'Lógica combinacional',
    title: 'Compuerta AND',
    text: 'La lámpara verde H1 debe encenderse solo mientras S1 y S2 estén pulsados a la vez.',
    goal: 'Contactos NO en serie.',
    hint: 'Dos contactos en serie solo dejan pasar la corriente si ambos están cerrados. Eso es una función AND.',
    steps: [
      G('En el <b>primer hueco</b> coloca un contacto <b>NO</b> con <b>%I0.0 (S1)</b>.', 'a', NO('I0.0')),
      G('En el <b>segundo hueco</b>, en serie con S1, coloca un contacto <b>NO</b> con <b>%I0.1 (S2)</b>.', 'b', NO('I0.1')),
      G('En la <b>bobina</b> asigna la salida <b>%Q0.0 (H1)</b>.', 'c', { addr: 'Q0.0' }),
      G('Activa <b>«Fijar pulsadores»</b>, recorre las cuatro filas de la tabla de verdad y observa dónde se corta la corriente. Después pulsa <b>Verificar</b>.'),
    ],
    devices: ['S1', 'S2', 'H1'],
    truth: { ins: ['S1', 'S2'], out: 'H1', fn: (a, b) => a && b },
    rungs: [{ type: 'coil', comment: 'Lámpara verde H1', logic: { t: 's', items: [C('a'), C('b')] }, out: Q('c') }],
    tests: truth(['S1', 'S2'], 'H1', (a, b) => a && b),
  },
  {
    id: '1.2', short: 'OR', topic: 'Lógica combinacional',
    title: 'Compuerta OR',
    text: 'La lámpara ámbar H2 debe encenderse mientras se pulse S1, S2 o ambos.',
    goal: 'Contactos NO en paralelo.',
    hint: 'Las ramas en paralelo forman una función OR: basta con que una de ellas conduzca.',
    steps: [
      G('En la <b>rama superior</b> coloca un contacto <b>NO</b> con <b>%I0.0 (S1)</b>.', 'a', NO('I0.0')),
      G('En la <b>rama inferior</b>, en paralelo con S1, coloca un contacto <b>NO</b> con <b>%I0.1 (S2)</b>.', 'b', NO('I0.1')),
      G('En la <b>bobina</b> asigna la salida <b>%Q0.1 (H2)</b>.', 'c', { addr: 'Q0.1' }),
      G('Pulsa S1 y S2 por separado y luego juntos: H2 debe encenderse en los tres casos. Después pulsa <b>Verificar</b>.'),
    ],
    devices: ['S1', 'S2', 'H2'],
    truth: { ins: ['S1', 'S2'], out: 'H2', fn: (a, b) => a || b },
    rungs: [{ type: 'coil', comment: 'Lámpara ámbar H2', logic: { t: 'p', items: [C('a'), C('b')] }, out: Q('c') }],
    tests: truth(['S1', 'S2'], 'H2', (a, b) => a || b),
  },
  {
    id: '1.3', short: 'NOT', topic: 'Lógica combinacional',
    title: 'Negación (NOT)',
    text: 'La lámpara roja H3 debe estar encendida en reposo y apagarse mientras se pulse S2.',
    goal: 'Contacto NC en el programa.',
    hint: 'Un contacto NC del programa conduce cuando el bit vale 0. Es independiente del cableado físico del pulsador.',
    steps: [
      G('Coloca un contacto <b>NC</b> con <b>%I0.1 (S2)</b>. S2 está cableado NO: sin pulsar, su entrada vale 0 y el contacto NC conduce.', 'a', NC('I0.1')),
      G('En la <b>bobina</b> asigna la salida <b>%Q0.2 (H3)</b>.', 'b', { addr: 'Q0.2' }),
      G('Comprueba que H3 está encendida en reposo y se apaga mientras mantienes S2. Después pulsa <b>Verificar</b>.'),
    ],
    devices: ['S2', 'H3'],
    truth: { ins: ['S2'], out: 'H3', fn: a => !a },
    rungs: [{ type: 'coil', comment: 'Lámpara roja H3', logic: C('a'), out: Q('b') }],
    tests: truth(['S2'], 'H3', a => !a),
  },
  {
    id: '1.4', short: 'AND+OR', topic: 'Lógica combinacional',
    title: 'Combinación AND + OR',
    text: 'La lámpara ámbar H2 debe encenderse si S1 y S2 están pulsados a la vez, o si el selector S4 está en 1.',
    goal: 'Serie dentro de un paralelo: H2 = (S1 AND S2) OR S4.',
    hint: 'Una serie dentro de un paralelo: la rama superior es el AND y la rama inferior añade el OR.',
    steps: [
      G('En la <b>rama superior, primer hueco</b>, coloca un contacto <b>NO</b> con <b>%I0.0 (S1)</b>.', 'a', NO('I0.0')),
      G('En la <b>rama superior, segundo hueco</b>, en serie con S1, coloca un contacto <b>NO</b> con <b>%I0.1 (S2)</b>. Esta serie es el AND.', 'b', NO('I0.1')),
      G('En la <b>rama inferior</b>, en paralelo con la serie S1–S2, coloca un contacto <b>NO</b> con <b>%I0.3 (S4)</b>. Esta rama es el OR.', 'c', NO('I0.3')),
      G('En la <b>bobina</b> asigna la salida <b>%Q0.1 (H2)</b>.', 'd', { addr: 'Q0.1' }),
      G('Gira S4 y combina S1 y S2 con <b>«Fijar pulsadores»</b> hasta recorrer las ocho filas de la tabla. Después pulsa <b>Verificar</b>.'),
    ],
    devices: ['S1', 'S2', 'S4', 'H2'],
    truth: { ins: ['S1', 'S2', 'S4'], out: 'H2', fn: (a, b, c) => (a && b) || c },
    rungs: [{ type: 'coil', comment: 'Lámpara ámbar H2', logic: { t: 'p', items: [{ t: 's', items: [C('a'), C('b')] }, C('c')] }, out: Q('d') }],
    tests: truth(['S1', 'S2', 'S4'], 'H2', (a, b, c) => (a && b) || c),
  },
  {
    id: '1.5', short: 'Marcha', topic: 'Memoria y seguridad',
    title: 'Marcha/paro con enclavamiento',
    text: 'S1 arranca la banda M1 y la banda sigue en marcha al soltarlo. S3 la detiene y el paro de emergencia S0 la bloquea. S3 y S0 están cableados como contactos NC, como exige la práctica de seguridad.',
    goal: 'Autorretención, contactos NO/NC y cableado a prueba de fallos.',
    hint: 'La autorretención es un contacto de la propia salida en paralelo con la marcha. Los paros cableados NC entregan un 1 mientras no se pulsan.',
    steps: [
      G('En la <b>rama superior</b> coloca un contacto <b>NO</b> con <b>%I0.0 (S1)</b>, el pulsador de marcha.', 'a', NO('I0.0')),
      G('En la <b>rama inferior</b>, en paralelo con S1, coloca un contacto <b>NO</b> con <b>%Q0.3 (M1)</b>. Es la autorretención: cuando el motor arranca, su propio contacto mantiene la corriente al soltar S1.', 'b', NO('Q0.3')),
      G('Después del paralelo, en serie, coloca un contacto <b>NO</b> con <b>%I0.2 (S3)</b>. S3 está cableado NC: sin pulsar entrega un 1 y el contacto NO conduce. Al pulsarlo, el bit cae a 0 y corta el segmento.', 'c', NO('I0.2')),
      G('En serie con S3 coloca un contacto <b>NO</b> con <b>%I0.5 (S0)</b>, por la misma razón: la seta de emergencia también está cableada NC.', 'd', NO('I0.5')),
      G('Pulsa S1 y suéltalo (la banda sigue), pulsa S3 (se detiene), enclava S0 e intenta arrancar. Después pulsa <b>Verificar</b>.'),
    ],
    devices: ['S1', 'S3', 'S0', 'M1'],
    rungs: [{
      type: 'coil', comment: 'Motor de banda M1 con autorretención',
      logic: { t: 's', items: [{ t: 'p', items: [C('a'), C('b')] }, C('c'), C('d')] },
      out: { t: 'coil', addr: 'Q0.3' },
    }],
    tests: [
      { wait: 200, expect: { M1: false }, msg: 'Al iniciar, la banda está parada.' },
      { set: { S1: true }, wait: 200, expect: { M1: true }, msg: 'Al pulsar S1, la banda arranca.' },
      { set: { S1: false }, wait: 300, expect: { M1: true }, msg: 'Al soltar S1, la banda sigue en marcha (enclavamiento).' },
      { set: { S3: true }, wait: 200, expect: { M1: false }, msg: 'Al pulsar S3, la banda se detiene.' },
      { set: { S3: false }, wait: 300, expect: { M1: false }, msg: 'Al soltar S3, la banda sigue parada.' },
      { set: { S1: true }, wait: 200 },
      { set: { S1: false }, wait: 200, expect: { M1: true }, msg: 'S1 vuelve a arrancar la banda.' },
      { set: { S0: true }, wait: 200, expect: { M1: false }, msg: 'El paro de emergencia S0 detiene la banda.' },
      { set: { S1: true }, wait: 200, expect: { M1: false }, msg: 'Con S0 enclavado, S1 no arranca la banda.' },
      { set: { S1: false, S0: false }, wait: 200, expect: { M1: false }, msg: 'Al desenclavar S0, la banda no arranca sola.' },
      { set: { S1: true, S3: true }, wait: 200, expect: { M1: false }, msg: 'Con S1 y S3 pulsados a la vez, prevalece el paro.' },
    ],
  },
  {
    id: '1.8', short: 'TON', topic: 'Temporizadores',
    title: 'Temporizador con retardo a la conexión (TON)',
    text: 'Mantener S2 pulsado durante 3 s enciende H1. Al soltar S2, H1 se apaga y el tiempo vuelve a cero.',
    goal: 'Entrada IN, tiempo PT, salida Q y tiempo transcurrido ET.',
    hint: 'El TON cuenta mientras IN está activa y se reinicia en cuanto IN cae a 0. Q se activa cuando ET alcanza PT.',
    steps: [
      G('En la entrada <b>IN</b> del TON coloca un contacto <b>NO</b> con <b>%I0.1 (S2)</b>.', 'a', NO('I0.1')),
      G('En <b>PT</b> escribe <b>3</b> segundos (T#3s).', 'pt', { value: 3 }),
      G('En la <b>bobina</b> conectada a la salida Q asigna <b>%Q0.0 (H1)</b>.', 'b', { addr: 'Q0.0' }),
      G('Mantén S2 pulsado y mira cómo ET avanza hasta 3,0 s. Suéltalo antes de tiempo para ver cómo se reinicia. Después pulsa <b>Verificar</b>.'),
    ],
    devices: ['S2', 'H1'],
    internal: ['T1.Q'],
    rungs: [{ type: 'TON', name: 'T1', comment: 'Retardo de 3 s para H1', IN: C('a'), PT: { slot: 'pt', accept: 'time' }, out: Q('b') }],
    tests: [
      { wait: 200, expect: { H1: false }, msg: 'Sin pulsar S2, H1 está apagada.' },
      { set: { S2: true }, wait: 2500, expect: { H1: false }, msg: 'A los 2,5 s de pulsar S2, H1 sigue apagada.' },
      { wait: 700, expect: { H1: true }, msg: 'A los 3 s de mantener S2, H1 se enciende.' },
      { set: { S2: false }, wait: 100, expect: { H1: false }, msg: 'Al soltar S2, H1 se apaga.' },
      { set: { S2: true }, wait: 1500 },
      { set: { S2: false }, wait: 200 },
      { set: { S2: true }, wait: 2000, expect: { H1: false }, msg: 'Al soltar S2 el tiempo se reinicia: el TON no acumula.' },
    ],
  },
  {
    id: '1.9', short: 'CTU', topic: 'Contadores',
    title: 'Contador ascendente (CTU)',
    text: 'Con el selector S4 en 1, la banda transporta cajas. El sensor B1 las cuenta y, al llegar a 5, la lámpara roja H3 se enciende y la banda se detiene. S1 reinicia el conteo.',
    goal: 'Flanco ascendente en CU, reinicio R, preselección PV y valor actual CV.',
    hint: 'El CTU suma 1 en cada flanco ascendente de CU. Q se activa cuando CV alcanza PV, y R devuelve CV a 0.',
    steps: [
      G('<b>Segmento 1, primer hueco</b>: coloca un contacto <b>NO</b> con <b>%I0.3 (S4)</b>, la marcha de la banda.', 'a', NO('I0.3')),
      G('<b>Segmento 1, segundo hueco</b>, en serie con S4: coloca un contacto <b>NC</b> con <b>"C1".Q</b>. Mientras no se llega a 5, Q vale 0 y el NC deja girar la banda.', 'b', NC('C1.Q')),
      G('<b>Segmento 2, entrada CU</b>: coloca un contacto <b>NO</b> con <b>%I0.4 (B1)</b>. Cada caja que corta la barrera es un flanco ascendente.', 'c', NO('I0.4')),
      G('<b>Entrada R</b>: coloca un contacto <b>NO</b> con <b>%I0.0 (S1)</b> para reiniciar el conteo.', 'd', NO('I0.0')),
      G('En <b>PV</b> escribe <b>5</b>.', 'pv', { value: 5 }),
      G('En la <b>bobina</b> conectada a la salida Q asigna <b>%Q0.2 (H3)</b>.', 'e', { addr: 'Q0.2' }),
      G('Gira S4 a 1 y observa CV en la caja. Tras la 5.ª caja, pulsa S1 para reiniciar. Después pulsa <b>Verificar</b>.'),
    ],
    devices: ['S4', 'B1', 'S1', 'H3', 'M1'],
    internal: ['C1.Q'],
    rungs: [
      { type: 'coil', comment: 'Motor de banda M1', logic: { t: 's', items: [C('a'), C('b')] }, out: { t: 'coil', addr: 'Q0.3' } },
      { type: 'CTU', name: 'C1', comment: 'Conteo de cajas', CU: C('c'), R: C('d'), PV: { slot: 'pv', accept: 'int' }, out: Q('e') },
    ],
    tests: (() => {
      const pulse = [{ set: { B1: true }, wait: 150 }, { set: { B1: false }, wait: 150 }];
      return [
        { set: { S4: true }, wait: 200, expect: { M1: true, H3: false }, msg: 'Con S4 en 1, la banda gira y H3 está apagada.' },
        ...pulse, ...pulse, ...pulse, ...pulse,
        { wait: 50, expect: { H3: false, M1: true }, msg: 'Tras 4 cajas, H3 sigue apagada y la banda en marcha.' },
        ...pulse,
        { wait: 50, expect: { H3: true, M1: false }, msg: 'Con la 5.ª caja, H3 se enciende y la banda se detiene.' },
        { set: { S1: true }, wait: 150, expect: { H3: false }, msg: 'S1 reinicia el contador y H3 se apaga.' },
        { set: { S1: false }, wait: 200, expect: { M1: true }, msg: 'Tras el reinicio, la banda vuelve a arrancar.' },
      ];
    })(),
  },
];

// ── Retos de memoria y flancos ──────────────────────────────────────────────
const SR = {
  id: '1.6', short: 'S/R', topic: 'Memoria',
  title: 'Memoria con Set/Reset',
  text: 'S1 enciende la lámpara verde H1 y queda encendida al soltarlo. S2 la apaga. Si se pulsan los dos a la vez, debe prevalecer el apagado.',
  goal: 'Bobinas S y R, memoria y prioridad por orden de segmentos.',
  hint: 'Una bobina S (Set) pone el bit a 1 y lo deja así; una R (Reset) lo pone a 0. Si ambas escriben en el mismo ciclo, manda el último segmento ejecutado.',
  devices: ['S1', 'S2', 'H1'],
  coilKinds: true,
  rungs: [
    { type: 'coil', comment: 'Encendido de H1', logic: C('a'), out: Q('b') },
    { type: 'coil', comment: 'Apagado de H1', logic: C('c'), out: Q('d') },
  ],
  steps: [
    G('<b>Segmento 1</b>: coloca un contacto <b>NO</b> con <b>%I0.0 (S1)</b>.', 'a', NO('I0.0')),
    G('En la bobina del segmento 1 elige el tipo <b>S</b> y la salida <b>%Q0.0 (H1)</b>. Una bobina S solo escribe un 1; nunca devuelve el bit a 0.', 'b', { addr: 'Q0.0', coil: 'S' }),
    G('<b>Segmento 2</b>: coloca un contacto <b>NO</b> con <b>%I0.1 (S2)</b>.', 'c', NO('I0.1')),
    G('En la bobina del segmento 2 elige el tipo <b>R</b> y la misma salida <b>%Q0.0 (H1)</b>. El Reset va en el último segmento para que gane cuando se pulsan ambos.', 'd', { addr: 'Q0.0', coil: 'R' }),
    G('Con <b>«Fijar pulsadores»</b> deja S1 y S2 pulsados a la vez y comprueba que H1 queda apagada. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 100, expect: { H1: false }, msg: 'En reposo, H1 está apagada.' },
    { set: { S1: true }, wait: 150, expect: { H1: true }, msg: 'Al pulsar S1, H1 se enciende.' },
    { set: { S1: false }, wait: 300, expect: { H1: true }, msg: 'Al soltar S1, H1 sigue encendida (memorizada con Set).' },
    { set: { S2: true }, wait: 150, expect: { H1: false }, msg: 'Al pulsar S2, H1 se apaga (Reset).' },
    { set: { S2: false }, wait: 300, expect: { H1: false }, msg: 'Al soltar S2, H1 sigue apagada.' },
    { set: { S1: true, S2: true }, wait: 150, expect: { H1: false }, msg: 'Con S1 y S2 pulsados a la vez, prevalece el apagado.' },
  ],
};
const FP = {
  id: '1.7', short: 'Flanco', topic: 'Flancos',
  title: 'Flanco ascendente: telerruptor',
  text: 'Cada pulsación de S2 cambia el estado de la lámpara ámbar H2: una pulsación la enciende y la siguiente la apaga. Mantener S2 pulsado no debe hacerla parpadear.',
  goal: 'Contacto de flanco P, marcas %M y lógica XOR.',
  hint: 'Un contacto P conduce solo durante el ciclo en que su bit pasa de 0 a 1. Ese pulso de un ciclo se guarda en una marca y se usa para conmutar la salida.',
  devices: ['S2', 'H2'],
  edges: true,
  internal: ['M0.0'],
  rungs: [
    { type: 'coil', comment: 'Pulso de un ciclo al pulsar S2', logic: C('a'), out: Q('b') },
    { type: 'coil', comment: 'Conmutación de H2', logic: { t: 'p', items: [{ t: 's', items: [C('c'), C('d')] }, { t: 's', items: [C('e'), C('f')] }] }, out: { t: 'coil', addr: 'Q0.1' } },
  ],
  steps: [
    G('<b>Segmento 1</b>: coloca un contacto <b>P</b> (flanco ascendente) con <b>%I0.1 (S2)</b>.', 'a', { kind: 'P', addr: 'I0.1' }),
    G('En la bobina del segmento 1 asigna la marca <b>%M0.0</b>. Valdrá 1 durante un único ciclo por cada pulsación.', 'b', { addr: 'M0.0' }),
    G('<b>Segmento 2, rama superior</b>: contacto <b>NO</b> con <b>%M0.0</b>.', 'c', NO('M0.0')),
    G('En serie, contacto <b>NC</b> con <b>%Q0.1 (H2)</b>. Si llega el pulso y H2 está apagada, se enciende.', 'd', NC('Q0.1')),
    G('<b>Rama inferior</b>: contacto <b>NC</b> con <b>%M0.0</b>.', 'e', NC('M0.0')),
    G('En serie, contacto <b>NO</b> con <b>%Q0.1 (H2)</b>. Sin pulso, H2 conserva su estado.', 'f', NO('Q0.1')),
    G('Pasa el ciclo de scan a <b>Lento</b> y pulsa S2: en el diagrama de tiempos verás %M0.0 en 1 durante un solo ciclo. Después pulsa <b>Verificar</b>.'),
  ],
  tests: [
    { wait: 100, expect: { H2: false }, msg: 'En reposo, H2 está apagada.' },
    { set: { S2: true }, wait: 100, expect: { H2: true }, msg: 'La primera pulsación de S2 enciende H2.' },
    { wait: 600, expect: { H2: true }, msg: 'Mantener S2 pulsado no cambia H2.' },
    { set: { S2: false }, wait: 200, expect: { H2: true }, msg: 'Al soltar S2, H2 sigue encendida.' },
    { set: { S2: true }, wait: 100, expect: { H2: false }, msg: 'La segunda pulsación apaga H2.' },
    { set: { S2: false }, wait: 200 },
    { set: { S2: true }, wait: 100, expect: { H2: true }, msg: 'La tercera pulsación la vuelve a encender.' },
  ],
};
RETOS.splice(RETOS.findIndex(r => r.id === '1.5') + 1, 0, SR, FP);

// ── Diagnóstico de errores típicos ─────────────────────────────────────────
const NM = { 'I0.0': 'S1', 'I0.1': 'S2', 'I0.2': 'S3', 'I0.3': 'S4', 'I0.4': 'B1', 'I0.5': 'S0', 'Q0.0': 'H1', 'Q0.1': 'H2', 'Q0.2': 'H3', 'Q0.3': 'M1', 'M0.0': 'pulso', 'T1.Q': 'T1', 'C1.Q': 'C1' };
const A = ad => ad.includes('.Q') ? '"' + ad.split('.')[0] + '".Q' : `%${ad} (${NM[ad] || ad})`;
const is = (x, kind, addr) => !!x && (!kind || x.kind === kind) && (!addr || x.addr === addr);
function coilMsg(a, s, addr) {
  return a[s] && a[s].addr && a[s].addr !== addr ? [`La bobina escribe ${A(a[s].addr)}, pero el enunciado pide ${A(addr)}.`] : [];
}
const NC_PULSADO = 'Hay un contacto NC. Un NC conduce cuando su bit vale 0, es decir, con el pulsador sin pulsar. Aquí la lámpara debe reaccionar al pulsar, así que necesitas contactos NO.';
const DIAG = {
  '1.1': a => {
    const d = [], cs = [a.a, a.b].filter(Boolean);
    if (cs.some(x => x.kind === 'NC')) d.push(NC_PULSADO);
    if (a.a && a.b && a.a.addr === a.b.addr) d.push(`Los dos contactos leen ${A(a.a.addr)}. Falta el otro pulsador.`);
    if (cs.some(x => !['I0.0', 'I0.1'].includes(x.addr))) d.push('Algún contacto no lee S1 (%I0.0) ni S2 (%I0.1).');
    return d.concat(coilMsg(a, 'c', 'Q0.0'));
  },
  '1.2': a => {
    const d = [], cs = [a.a, a.b].filter(Boolean);
    if (cs.some(x => x.kind === 'NC')) d.push('Hay un contacto NC. Un NC conduce con el pulsador sin pulsar, así que H2 estaría encendida sin tocar nada. Usa contactos NO en las dos ramas.');
    if (a.a && a.b && a.a.addr === a.b.addr) d.push(`Las dos ramas leen ${A(a.a.addr)}. Falta el otro pulsador.`);
    return d.concat(coilMsg(a, 'c', 'Q0.1'));
  },
  '1.3': a => {
    const d = [];
    if (is(a.a, 'NO', 'I0.1')) d.push('Con un contacto NO, H3 se enciende al pulsar S2: justo lo contrario de lo pedido. Un NC conduce mientras el bit de S2 vale 0.');
    if (a.a && a.a.addr !== 'I0.1') d.push(`El contacto lee ${A(a.a.addr)}; el enunciado habla de S2 (%I0.1).`);
    return d.concat(coilMsg(a, 'b', 'Q0.2'));
  },
  '1.4': a => {
    const d = [], top = [a.a, a.b].filter(Boolean);
    if ([a.a, a.b, a.c].some(x => x && x.kind === 'NC')) d.push(NC_PULSADO);
    if (top.some(x => x.addr === 'I0.3')) d.push('S4 está en la rama superior, en serie con S1 o S2. Debe ir en la rama inferior para formar el OR.');
    if (a.c && a.c.addr !== 'I0.3') d.push(`La rama inferior lee ${A(a.c.addr)}. Esa rama es el OR con el selector S4 (%I0.3).`);
    return d.concat(coilMsg(a, 'd', 'Q0.1'));
  },
  '1.5': a => {
    const d = [];
    if (a.a && !is(a.a, 'NO', 'I0.0')) d.push('La rama superior debe ser la marcha: contacto NO con %I0.0 (S1).');
    if (!a.b || a.b.addr !== 'Q0.3') d.push('No hay contacto de %Q0.3 (M1) en paralelo con S1. Sin él no hay autorretención: la banda se detiene en cuanto sueltas S1.');
    else if (a.b.kind === 'NC') d.push('El contacto de M1 en paralelo es NC: conduce con el motor parado, así que la banda arranca sola. La autorretención usa un contacto NO.');
    const paros = [a.c, a.d].filter(Boolean);
    for (const [ad, n] of [['I0.2', 'S3'], ['I0.5', 'S0']]) {
      const x = paros.find(p => p.addr === ad);
      if (x && x.kind === 'NC') d.push(`${n} está programado con un contacto NC. Como ${n} está cableado NC, su entrada vale 1 en reposo y el contacto NC del programa queda abierto: la banda nunca arranca. Usa un contacto NO.`);
      if (!x) d.push(`Falta ${n} (%${ad}) en serie después del paralelo.`);
    }
    return d;
  },
  '1.6': a => {
    const d = [];
    if (a.b && a.b.addr === 'Q0.0' && !a.b.coil) d.push('La bobina del segmento 1 es normal ( ): H1 se apaga en cuanto sueltas S1. Usa una bobina S para memorizar el encendido.');
    if (a.d && a.d.addr === 'Q0.0' && !a.d.coil) d.push('La bobina del segmento 2 es normal ( ). Dos bobinas normales sobre %Q0.0 se pisan: solo cuenta la última. Usa una bobina R.');
    if (a.b && a.b.coil === 'R' && a.d && a.d.coil === 'S') d.push('El Reset está en el segmento 1 y el Set en el 2. Con S1 y S2 a la vez, gana el último segmento ejecutado, es decir, el encendido. Pon el Reset en el segmento 2.');
    if (a.b && a.d && a.b.addr !== a.d.addr) d.push('Set y Reset deben actuar sobre la misma salida, %Q0.0 (H1).');
    return d;
  },
  '1.7': a => {
    const d = [];
    if (a.a && a.a.kind !== 'P') d.push('El contacto de S2 no es de flanco. Mientras mantienes S2, la condición vale 1 en cada ciclo y H2 conmuta unas 60 veces por segundo. Usa un contacto P y pruébalo en modo Lento.');
    if (a.b && a.b.addr !== 'M0.0') d.push('La bobina del segmento 1 debe ser la marca %M0.0: es el pulso que usa el segmento 2.');
    const ok = (u, v, w, x) => is(u, 'NO', 'M0.0') && is(v, 'NC', 'Q0.1') && is(w, 'NC', 'M0.0') && is(x, 'NO', 'Q0.1');
    if (a.c && a.d && a.e && a.f && !ok(a.c, a.d, a.e, a.f) && !ok(a.e, a.f, a.c, a.d)) d.push('El segmento 2 es un XOR entre el pulso y H2: una rama enciende con «pulso Y NO H2» y la otra mantiene con «NO pulso Y H2». Revisa los tipos de contacto.');
    return d;
  },
  '1.8': a => {
    const d = [];
    if (is(a.a, 'NC')) d.push('El contacto de IN es NC: el temporizador cuenta mientras S2 NO está pulsado.');
    if (a.a && a.a.addr !== 'I0.1') d.push(`IN lee ${A(a.a.addr)}; el temporizador debe arrancar con S2 (%I0.1).`);
    if (a.pt && a.pt.value != null && a.pt.value !== 3) d.push(`PT vale ${String(a.pt.value).replace('.', ',')} s; el enunciado pide 3 s.`);
    return d.concat(coilMsg(a, 'b', 'Q0.0'));
  },
  '1.9': a => {
    const d = [];
    if (is(a.b, 'NO', 'C1.Q')) d.push('En el segmento 1, "C1".Q está en un contacto NO: la banda solo giraría con 5 cajas ya contadas. Necesitas NC.');
    if (a.b && a.b.addr !== 'C1.Q') d.push('El segmento 1 no consulta "C1".Q, así que la banda no se detiene al llegar a 5.');
    if (is(a.c, null, 'I0.0') && is(a.d, null, 'I0.4')) d.push('CU y R están intercambiados: CU debe contar las cajas (B1) y R reiniciar con S1.');
    else if (a.c && a.c.addr !== 'I0.4') d.push(`CU lee ${A(a.c.addr)}; debe contar los flancos de B1 (%I0.4).`);
    if (a.pv && a.pv.value != null && a.pv.value !== 5) d.push(`PV vale ${a.pv.value}; el enunciado pide 5 cajas.`);
    return d.concat(coilMsg(a, 'e', 'Q0.2'));
  },
};
const TRACE = {
  '1.1': ['I0.0', 'I0.1', 'Q0.0'], '1.2': ['I0.0', 'I0.1', 'Q0.1'], '1.3': ['I0.1', 'Q0.2'],
  '1.4': ['I0.0', 'I0.1', 'I0.3', 'Q0.1'], '1.5': ['I0.0', 'I0.2', 'I0.5', 'Q0.3'],
  '1.6': ['I0.0', 'I0.1', 'Q0.0'], '1.7': ['I0.1', 'M0.0', 'Q0.1'],
  '1.8': ['I0.1', 'T1.ET', 'Q0.0'], '1.9': ['I0.4', 'C1.CV', 'I0.0', 'Q0.2', 'Q0.3'],
};
for (const r of RETOS) { r.diag = DIAG[r.id]; r.trace = TRACE[r.id]; }

export const TAGS1 = [
  { addr: 'I0.0', sym: 'S1', short: 'Marcha', dev: 'Pulsador verde', wiring: 'NO', io: 'in' },
  { addr: 'I0.1', sym: 'S2', short: 'Pulsador', dev: 'Pulsador negro', wiring: 'NO', io: 'in' },
  { addr: 'I0.2', sym: 'S3', short: 'Paro', dev: 'Pulsador rojo', wiring: 'NC', io: 'in', stop: true },
  { addr: 'I0.3', sym: 'S4', short: 'Selector', dev: 'Selector 0/1', wiring: 'NO', io: 'in' },
  { addr: 'I0.4', sym: 'B1', short: 'Sensor', dev: 'Fotoeléctrico de barrera', wiring: 'NO', io: 'in', sensor: true },
  { addr: 'I0.5', sym: 'S0', short: 'Emergencia', dev: 'Seta enclavable', wiring: 'NC', io: 'in', stop: true },
  { addr: 'Q0.0', sym: 'H1', short: 'Verde', dev: 'Piloto verde', io: 'out' },
  { addr: 'Q0.1', sym: 'H2', short: 'Ámbar', dev: 'Piloto ámbar', io: 'out' },
  { addr: 'Q0.2', sym: 'H3', short: 'Roja', dev: 'Piloto rojo', io: 'out' },
  { addr: 'Q0.3', sym: 'M1', short: 'Motor', dev: 'Motor de banda (vía K1)', io: 'out' },
];
export const LEVEL1 = {
  n: 1, title: 'Fundamentos', week: 'Semana 1', mode: 'guided', plant: 1, tags: TAGS1, retos: RETOS,
  intro: 'Lógica combinacional, memoria, flancos, temporizadores y contadores con un editor guiado: el estudiante completa los huecos de cada segmento.',
};
