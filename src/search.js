// Búsqueda del sitio (el menú móvil de Wix incluye un buscador "Buscar...").
// Indexa páginas, temas, ejercicios y pasos de los cursos.
const { site } = require('./data/site');
const exercises = require('./data/exercises.json');
const { programs } = require('./programs');

const normalize = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function buildIndex() {
  const docs = [];
  const add = (title, href, text, kind) => docs.push({ title, href, text, kind, hay: normalize(`${title} ${text}`) });

  add('Inicio', '/', [site.home.kicker, site.home.text, ...site.home.subjects.map(s => `${s.title} ${s.text}`),
    ...site.home.steps.map(s => `${s.title} ${s.text}`)].join(' '), 'Página');
  for (const [slug, s] of Object.entries(site.subjects)) {
    add(s.title, `/${slug}`, [s.intro, ...s.topics.map(t => `${t.title} ${t.text}`)].join(' '), 'Página');
    for (const t of s.topics) add(`${t.title.replace(/^\d+\.\s*/, '')} · ${s.title}`, `/${slug}`, t.text, 'Tema');
  }
  add('Cursos', '/challenges', `${site.courses.title} ${site.courses.text} ${programs.map(p => p.title).join(' ')}`, 'Página');
  add('Banco de ejercicios', '/banco-de-ejercicios', exercises.intro, 'Página');
  for (const subj of exercises.subjects) {
    const slug = { 'Matemática': 'matematica', 'Física': 'fisica', 'Álgebra Lineal': 'algebra-lineal' }[subj.name];
    subj.exercises.forEach((e, i) => add(e.question, `/banco-de-ejercicios#${slug}-${i + 1}`, `${subj.name} ${e.options}`, `Ejercicio · ${subj.name}`));
  }
  const a = site.ayudas;
  add('Ayudas UCC', '/ayudas-ucc', [a.resourcesTitle, ...a.resources.map(r => `${r.title} ${r.text}`), a.text,
    ...a.list.map(l => `${l.label} ${l.text}`), a.formTitle, a.formText].join(' '), 'Página');
  const n = site.nosotros;
  add('Nosotros', '/nosotros', [n.title, n.text, n.howTitle, ...n.how.map(h => `${h.title} ${h.text}`)].join(' '), 'Página');
  for (const p of programs) {
    add(p.title, `/p-gina-de-programas/${p.id}`, `${p.details} ${p.sections.map(s => s.title).join(' ')}`, 'Curso');
  }
  return docs;
}

const index = buildIndex();

function search(query) {
  const terms = normalize(query).split(/\s+/).filter(t => t.length > 1);
  if (!terms.length) return [];
  return index
    .map(d => ({ d, score: terms.reduce((acc, t) => acc + (d.hay.includes(t) ? 1 : 0) + (normalize(d.title).includes(t) ? 2 : 0), 0) }))
    .filter(x => terms.every(t => x.d.hay.includes(t)))
    .sort((a, b) => b.score - a.score)
    .slice(0, 30)
    .map(({ d }) => {
      const plain = d.text;
      const i = normalize(plain).indexOf(terms[0]);
      const start = Math.max(0, i - 60);
      const snippet = (start > 0 ? '…' : '') + plain.slice(start, start + 180) + (plain.length > start + 180 ? '…' : '');
      return { title: d.title, href: d.href, kind: d.kind, snippet };
    });
}

module.exports = { search };
