// Reporte de laboratorio imprimible (se guarda como PDF desde el diálogo de impresión).
import { renderRung } from './ladder.js';

const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const fmtDate = iso => { const [y, m, d] = iso.split('-'); return `${d}/${m}/${y}`; };
const strip = h => h.replace(/<[^>]+>/g, '');

export function buildReport({ level, names, date, images, entries, conclusions }) {
  const io = level.tags.map(t => `<tr><td>%${t.addr}</td><td><b>${t.sym}</b> ${esc(t.short)}</td><td>${esc(t.dev)}</td><td>${t.wiring || '—'}</td></tr>`).join('');
  const retos = entries.map(({ reto, program, tests }) => {
    const ok = tests.filter(t => t.state === 'pass').length;
    return `<section class="rp-reto">
      <div class="rp-k">Reto ${reto.id} · ${esc(reto.topic)}</div>
      <h2>${esc(reto.title)}</h2>
      <h3>Enunciado</h3><p>${esc(reto.text)}</p>
      <p class="rp-goal"><b>Conceptos:</b> ${esc(reto.goal)}</p>
      ${reto.steps ? `<h3>Instrucciones</h3><ol class="rp-steps">${reto.steps.map(s => `<li>${strip(s.text)}</li>`).join('')}</ol>` : ''}
      <h3>Programa Ladder (OB1)</h3>
      <div class="rp-ladder">${program.map((r, i) => renderRung(r, i, false, null)).join('')}</div>
      <h3>Verificación automática · ${ok} de ${tests.length} pruebas correctas</h3>
      <ul class="rp-tests">${tests.map(t => `<li class="${t.state}">${t.state === 'pass' ? '✓' : '✗'} ${esc(t.msg)}</li>`).join('')}</ul>
    </section>`;
  }).join('');
  return `<article class="rp">
    <header class="rp-head">
      <div class="rp-k">Reporte de laboratorio · Automatización con PLC</div>
      <h1>Nivel ${level.n} · ${esc(level.title)}</h1>
      <dl class="rp-meta">
        <div><dt>Estudiante(s)</dt><dd>${esc(names)}</dd></div>
        <div><dt>Fecha</dt><dd>${fmtDate(date)}</dd></div>
        <div><dt>Semana</dt><dd>${esc(level.week)}</dd></div>
        <div><dt>Retos superados</dt><dd>${entries.length} de ${level.retos.length}</dd></div>
      </dl>
      <p>${esc(level.intro)}</p>
    </header>
    <section class="rp-plant">
      <h2>Planta del nivel</h2>
      <div class="rp-figs">${images.map(([src, cap]) => `<figure><img src="${src}" alt="${esc(cap)}"><figcaption>${esc(cap)}</figcaption></figure>`).join('')}</div>
      <h3>Tabla de variables PLC</h3>
      <table class="rp-table"><thead><tr><th>Dirección</th><th>Símbolo</th><th>Dispositivo</th><th>Cableado</th></tr></thead><tbody>${io}</tbody></table>
    </section>
    ${retos}
    <section class="rp-concl"><h2>Conclusiones y observaciones</h2>${conclusions ? conclusions.split(/\n{2,}/).map(p => `<p>${esc(p).replace(/\n/g, '<br>')}</p>`).join('') : '<p class="rp-empty">Sin conclusiones registradas.</p>'}</section>
    <footer class="rp-foot">Generado el ${new Date().toLocaleString('es')} con Laboratorio PLC · Notación S7-1200 · LAD</footer>
  </article>`;
}
