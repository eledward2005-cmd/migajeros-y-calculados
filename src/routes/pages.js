// Páginas del sitio (renderizadas en el servidor con EJS).
const express = require('express');
const { site } = require('../data/site');
const bank = require('../exercises');
const { programs, getProgram, progressOf, findStep, allSteps } = require('../programs');
const { areas, byPage, byProgramSlug, icons } = require('../data/areas');
const { dashboard, courseProgressMap, levelFor, WEEKLY_GOALS } = require('../gamification');
const { search } = require('../search');

// Tema de cada ejercicio (para mostrarlo como etiqueta en el banco)
const topicOfExercise = {};
for (const a of areas) for (const t of a.topics || []) for (const id of t.exercises) topicOfExercise[id] = t.title;

// Búsquedas sugeridas: los temas de cada área (contenido real del sitio),
// agrupados por área y solo si la búsqueda encuentra resultados.
const searchSuggestions = areas.filter(a => !a.soon)
  .map(a => ({ area: a, terms: a.topics.map(t => t.title).filter(t => search(t).length > 0) }))
  .filter(g => g.terms.length);

module.exports = function pagesRouter(db) {
  const r = express.Router();

  // Datos comunes: áreas, íconos y un resumen del nivel del miembro para el encabezado
  r.use(async (req, res, next) => {
    res.locals.areas = areas;
    res.locals.icons = icons;
    res.locals.memberLevel = null;
    if (req.member && req.method === 'GET') {
      try {
        const [rows, attempts, badges] = await Promise.all([db.getStepRows(req.member.id), db.getAttempts(req.member.id), db.getBadges(req.member.id)]);
        const xp = rows.length * 10 + new Set(attempts.filter(a => Number(a.is_correct) === 1).map(a => a.exercise_id)).size * 5 + badges.length * 50;
        res.locals.memberLevel = levelFor(xp);
      } catch (e) { return next(e); }
    }
    next();
  });

  const render = (res, view, data) => res.render(`pages/${view}`, { site, ...data });

  r.get('/', async (req, res, next) => {
    try {
      const dash = req.member ? await dashboard(db, req.member) : null;
      const progress = await courseProgressMap(db, req.member && req.member.id);
      render(res, 'home', { title: 'Inicio | Migajeros&Calculados', active: 'inicio', dash, progress, programs });
    } catch (e) { next(e); }
  });

  // Catálogo: el filtro llega en la URL (?area=calculo|algebra|fisica|mios) y
  // se aplica en el servidor, así funciona sin JavaScript. "mios" solo vale con
  // sesión iniciada; cualquier otro valor muestra "Todas".
  r.get('/challenges', async (req, res, next) => {
    try {
      const progress = await courseProgressMap(db, req.member && req.member.id);
      const filter = catalogFilter(req.query.area, !!req.member);
      render(res, 'courses', { title: 'Cursos | Migajeros y Calculados', active: 'cursos', programs, progress, byProgramSlug, filter });
    } catch (e) { next(e); }
  });

  // Páginas de área (antes "materias"): /matematica, /fisica, /algebra-lineal
  for (const [slug, area] of byPage) {
    r.get(`/${slug}`, async (req, res, next) => {
      try {
        const program = programs.find(p => p.slug === area.programSlug);
        const progress = (await courseProgressMap(db, req.member && req.member.id))[program.id] || null;
        let completed = [];
        let correctIds = new Set();
        if (req.member) {
          completed = await db.getCompletedSteps(req.member.id, program.id);
          correctIds = new Set((await db.getAttempts(req.member.id)).filter(a => Number(a.is_correct) === 1).map(a => a.exercise_id));
        }
        const topics = area.topics.map(t => {
          const section = t.section && program.sections.find(s => s.title === t.section);
          const idea = section && section.steps.find(s => s.title.startsWith('Idea clave'));
          const video = section && section.steps.find(s => s.type === 'VIDEO');
          const stepIds = section ? section.steps.map(s => s.id) : [];
          return {
            ...t, idea: idea ? idea.paragraphs : null, animated: video || null,
            firstStep: section ? section.steps[0].id : null,
            stepsDone: stepIds.filter(id => completed.includes(id)).length, stepsTotal: stepIds.length,
            exDone: t.exercises.filter(id => correctIds.has(id)).length
          };
        });
        render(res, 'area', { title: `${area.name} | Migajeros y Calculados`, active: slug, area, program, progress, topics });
      } catch (e) { next(e); }
    });
  }

  // Banco de ejercicios: formulario interactivo. Con sesión iniciada se
  // cargan y guardan las respuestas del miembro.
  const renderBank = async (req, res, results = {}) => {
    if (req.member) {
      for (const a of await db.getAttempts(req.member.id)) {
        if (!results[a.exercise_id]) results[a.exercise_id] = bank.grade(a.exercise_id, String(a.choice).trim());
      }
    }
    render(res, 'exercises', { title: 'Banco de ejercicios | Migajeros y Calculados', active: 'ejercicios', bank, results, topicOfExercise, filter: bankFilter(req.query.materia) });
  };
  r.get('/banco-de-ejercicios', async (req, res, next) => {
    try { await renderBank(req, res); } catch (e) { next(e); }
  });
  // Envío sin JavaScript: corrige todas las respuestas marcadas de una materia
  r.post('/banco-de-ejercicios', async (req, res, next) => {
    try {
      const results = {};
      for (const [key, value] of Object.entries(req.body)) {
        if (!key.startsWith('r_')) continue;
        const g = bank.grade(key.slice(2), String(value));
        if (!g) continue;
        results[g.id] = g;
        if (req.member) await db.saveAttempt(req.member.id, g.id, g.choice, g.correct);
      }
      res.locals.areas = areas; res.locals.icons = icons;
      await renderBank(req, res, results);
    } catch (e) { next(e); }
  });

  r.get('/ayudas-ucc', (req, res) =>
    render(res, 'ayudas', { title: 'Ayudas UCC | Migajeros y Calculados', active: 'ayudas', sent: req.query.enviado === '1' }));

  r.get('/nosotros', (req, res) =>
    render(res, 'nosotros', { title: 'Nosotros | Migajeros y Calculados', active: 'nosotros' }));

  // Mi progreso: panel académico
  r.get('/profile', async (req, res, next) => {
    try {
      const dash = req.member ? await dashboard(db, req.member) : null;
      render(res, 'profile', { title: 'Mi progreso | Migajeros&Calculados', active: 'progreso', dash, goals: WEEKLY_GOALS, saved: req.query.guardado === '1' });
    } catch (e) { next(e); }
  });

  // Página pública del curso (en Wix: /p-gina-de-programas/<id>)
  r.get('/p-gina-de-programas/:id', async (req, res, next) => {
    try {
      const program = getProgram(req.params.id);
      if (!program) return next();
      let enrolled = false;
      let completed = [];
      if (req.member) {
        enrolled = !!(await db.getEnrollment(req.member.id, program.id));
        completed = await db.getCompletedSteps(req.member.id, program.id);
      }
      const url = `${req.protocol}://${req.get('host')}${req.originalUrl.split('?')[0]}`;
      render(res, 'program', {
        title: `${program.title} | Migajeros y Calculados`, active: 'cursos', program, area: byProgramSlug.get(program.slug),
        stepCount: allSteps(program).length, enrolled, completed, progress: progressOf(program, completed), shareUrl: url
      });
    } catch (e) { next(e); }
  });

  // Vista del participante: temas, pasos, contenido y avance
  r.get('/p-gina-de-programas/:id/participante', async (req, res, next) => {
    try {
      const program = getProgram(req.params.id);
      if (!program) return next();
      if (!req.member) return res.redirect(`/login?next=${encodeURIComponent(req.originalUrl)}`);
      if (!(await db.getEnrollment(req.member.id, program.id))) return res.redirect(`/p-gina-de-programas/${program.id}`);
      const completed = await db.getCompletedSteps(req.member.id, program.id);
      const steps = allSteps(program);
      const requested = req.query.paso && findStep(program, req.query.paso);
      const current = requested ? requested.step : (steps.find(s => !completed.includes(s.id)) || steps[0]);
      const idx = steps.findIndex(s => s.id === current.id);
      const section = program.sections.find(s => s.steps.some(x => x.id === current.id));
      const earned = (await db.getBadges(req.member.id)).some(b => b.badge_id === program.badge.id);
      render(res, 'participant', {
        title: `${program.title} | Migajeros y Calculados`, active: 'cursos', program, area: byProgramSlug.get(program.slug),
        completed, current, section, stepNumber: idx + 1, prev: steps[idx - 1] || null, next: steps[idx + 1] || null,
        progress: progressOf(program, completed), earned
      });
    } catch (e) { next(e); }
  });

  r.get('/buscar', (req, res) => {
    const q = String(req.query.q || '').trim().slice(0, 100);
    render(res, 'search', {
      title: q ? `Resultados para “${q}” | Migajeros y Calculados` : 'Buscar | Migajeros y Calculados',
      active: '', q, results: q ? search(q) : [], suggestions: searchSuggestions
    });
  });

  r.get('/login', (req, res) => {
    if (req.member) return res.redirect(safeNext(req.query.next));
    render(res, 'auth', { title: 'Iniciar sesión | Migajeros y Calculados', active: 'progreso', mode: 'login', next: safeNext(req.query.next), error: null, values: {} });
  });
  r.get('/registro', (req, res) => {
    if (req.member) return res.redirect(safeNext(req.query.next));
    render(res, 'auth', { title: 'Regístrate | Migajeros y Calculados', active: 'progreso', mode: 'signup', next: safeNext(req.query.next), error: null, values: {} });
  });

  return r;
};

// Filtro válido del catálogo de cursos
function catalogFilter(value, logged) {
  const v = String(value || '');
  if (v === 'mios') return logged ? 'mios' : 'todas';
  return areas.some(a => !a.soon && a.slug === v) ? v : 'todas';
}

// Filtro válido del banco de ejercicios (?materia=matematica|fisica|algebra-lineal)
function bankFilter(value) {
  const v = String(value || '');
  return bank.subjects.some(s => s.slug === v) ? v : 'todas';
}

function safeNext(next) {
  const n = String(next || '/profile');
  return n.startsWith('/') && !n.startsWith('//') ? n : '/profile';
}
module.exports.safeNext = safeNext;
