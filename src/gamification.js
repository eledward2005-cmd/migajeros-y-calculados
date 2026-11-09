// Panel académico: puntos de experiencia (XP), niveles, racha de estudio,
// actividad semanal, logros, meta semanal y recomendaciones.
const { programs, getProgram, progressOf, allSteps } = require('./programs');
const bank = require('./exercises');
const { areas, active: activeAreas, byProgramSlug } = require('./data/areas');

const XP = { step: 10, exercise: 5, badge: 50 };
const LEVELS = [
  { min: 0, name: 'Migajero' },
  { min: 60, name: 'Aprendiz' },
  { min: 150, name: 'Calculista' },
  { min: 260, name: 'Analista' },
  { min: 400, name: 'Experto' },
  { min: 560, name: 'Ingeniero UCC' }
];
const WEEKLY_GOALS = [3, 5, 10, 15];

const dayKey = d => {
  const x = new Date(d);
  // Día local de Bogotá (UTC-5) para que la racha coincida con el día del estudiante
  return new Date(x.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
};

function levelFor(xp) {
  let i = LEVELS.length - 1;
  while (i > 0 && xp < LEVELS[i].min) i--;
  const cur = LEVELS[i];
  const next = LEVELS[i + 1] || null;
  const pct = next ? Math.round(((xp - cur.min) / (next.min - cur.min)) * 100) : 100;
  return { number: i + 1, name: cur.name, xp, next: next ? next.min : null, nextName: next ? next.name : null, pct, toNext: next ? next.min - xp : 0 };
}

function streakFrom(days) {
  const set = new Set(days);
  let streak = 0;
  const d = new Date();
  // Si hoy no hay actividad, la racha cuenta desde ayer
  if (!set.has(dayKey(d))) d.setUTCDate(d.getUTCDate() - 1);
  while (set.has(dayKey(d))) { streak++; d.setUTCDate(d.getUTCDate() - 1); }
  return streak;
}

function lastDays(n, counts) {
  const out = [];
  const names = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const k = dayKey(d);
    const local = new Date(d.getTime() - 5 * 3600 * 1000);
    out.push({ key: k, label: names[local.getUTCDay()], count: counts[k] || 0, today: i === 0 });
  }
  return out;
}

// Calcula todo el panel de un miembro
async function dashboard(db, member) {
  const [enrollments, stepRows, attempts, badgeRows, settingsRow] = await Promise.all([
    db.getEnrollments(member.id), db.getStepRows(member.id), db.getAttempts(member.id),
    db.getBadges(member.id), db.getSettings(member.id)
  ]);
  const settings = { weeklyGoal: settingsRow ? Number(settingsRow.weekly_goal) : 5, focusArea: settingsRow ? settingsRow.focus_area : null };

  // Cursos
  const courses = programs.map(p => {
    const enrolled = enrollments.find(e => e.program_id === p.id);
    const done = stepRows.filter(r => r.program_id === p.id).map(r => r.step_id);
    const progress = progressOf(p, done);
    const nextStep = allSteps(p).find(s => !done.includes(s.id)) || null;
    const lastAt = stepRows.filter(r => r.program_id === p.id).map(r => new Date(r.completed_at).getTime()).sort((a, b) => b - a)[0] || (enrolled ? new Date(enrolled.joined_at).getTime() : 0);
    return { program: p, area: byProgramSlug.get(p.slug), enrolled: !!enrolled, progress, nextStep, lastAt };
  });

  // Ejercicios
  const practice = bank.summarize(attempts);
  const correctIds = new Set(attempts.filter(a => Number(a.is_correct) === 1).map(a => a.exercise_id));

  // XP y nivel
  const xp = stepRows.length * XP.step + correctIds.size * XP.exercise + badgeRows.length * XP.badge;
  const level = levelFor(xp);

  // Actividad (pasos + ejercicios) por día
  const counts = {};
  for (const r of stepRows) { const k = dayKey(r.completed_at); counts[k] = (counts[k] || 0) + 1; }
  for (const a of attempts) { const k = dayKey(a.answered_at); counts[k] = (counts[k] || 0) + 1; }
  const week = lastDays(7, counts);
  const weekTotal = week.reduce((a, d) => a + d.count, 0);
  const streak = streakFrom(Object.keys(counts));

  // Dominio por área: pasos del curso + ejercicios correctos
  const mastery = activeAreas.map(a => {
    const c = courses.find(x => x.program.slug === a.programSlug);
    const exIds = a.topics.flatMap(t => t.exercises);
    const exCorrect = exIds.filter(id => correctIds.has(id)).length;
    const total = c.progress.total + exIds.length;
    const done = c.progress.done + exCorrect;
    const topics = a.topics.map(t => {
      const sec = t.section && c.program.sections.find(s => s.title === t.section);
      const steps = sec ? sec.steps.map(s => s.id) : [];
      const stepsDone = steps.filter(id => stepRows.some(r => r.step_id === id)).length;
      const exDone = t.exercises.filter(id => correctIds.has(id)).length;
      const tot = steps.length + t.exercises.length;
      return { ...t, pct: tot ? Math.round(((stepsDone + exDone) / tot) * 100) : null };
    });
    return { area: a, pct: total ? Math.round((done / total) * 100) : 0, topics };
  });

  // Logros (insignias de curso + logros de estudio)
  const earnedBadgeIds = new Set(badgeRows.map(b => b.badge_id));
  const courseBadges = programs.map(p => ({ ...p.badge, earned: earnedBadgeIds.has(p.badge.id), kind: 'curso', hint: `Completa los ${allSteps(p).length} pasos del curso` }));
  const achievements = [
    { id: 'primer-paso', title: 'Primer paso', description: 'Completaste tu primer paso de un curso.', earned: stepRows.length >= 1, hint: 'Completa 1 paso' },
    { id: 'practicante', title: 'Practicante', description: 'Resolviste bien 5 ejercicios.', earned: correctIds.size >= 5, hint: `${Math.min(correctIds.size, 5)}/5 ejercicios correctos` },
    { id: 'racha-3', title: 'Constancia', description: 'Estudiaste 3 días seguidos.', earned: streak >= 3, hint: `Racha actual: ${streak} día${streak === 1 ? '' : 's'}` },
    { id: 'explorador', title: 'Explorador', description: 'Te uniste a las 3 áreas de estudio.', earned: enrollments.length >= 3, hint: `${enrollments.length}/3 cursos` },
    { id: 'meta', title: 'Meta cumplida', description: 'Cumpliste tu meta semanal.', earned: weekTotal >= settings.weeklyGoal, hint: `${weekTotal}/${settings.weeklyGoal} esta semana` }
  ];

  // Continuar donde quedaste: el curso más reciente sin terminar
  const resume = courses.filter(c => c.enrolled && !c.progress.finished).sort((a, b) => b.lastAt - a.lastAt)[0] || null;

  // Recomendación: área elegida por el estudiante o la de menor dominio
  const pool = mastery.filter(m => m.pct < 100);
  const focus = pool.find(m => m.area.slug === settings.focusArea) || pool.sort((a, b) => a.pct - b.pct)[0] || null;
  let recommendation = null;
  if (focus) {
    const topic = focus.topics.filter(t => t.pct !== null && t.pct < 100).sort((a, b) => a.pct - b.pct)[0] || focus.topics[0];
    recommendation = { area: focus.area, topic };
  }

  return {
    member, settings, courses, practice, xp, level, week, weekTotal, streak, mastery,
    badges: courseBadges, achievements, resume, recommendation,
    stats: {
      steps: stepRows.length, totalSteps: programs.reduce((a, p) => a + allSteps(p).length, 0),
      correct: correctIds.size, totalExercises: bank.total,
      badges: courseBadges.filter(b => b.earned).length + achievements.filter(a => a.earned).length,
      totalBadges: courseBadges.length + achievements.length
    }
  };
}

// Progreso rápido por curso (para tarjetas de catálogo e inicio)
async function courseProgressMap(db, memberId) {
  if (!memberId) return {};
  const rows = await db.getStepRows(memberId);
  const enrollments = await db.getEnrollments(memberId);
  const out = {};
  for (const p of programs) {
    const done = rows.filter(r => r.program_id === p.id).map(r => r.step_id);
    out[p.id] = { ...progressOf(p, done), enrolled: enrollments.some(e => e.program_id === p.id) };
  }
  return out;
}

module.exports = { XP, LEVELS, WEEKLY_GOALS, dashboard, courseProgressMap, levelFor, areas, getProgram };
