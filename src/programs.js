// Cursos (programas en línea): contenido, progreso e insignias.
const programs = require('./data/programs.json');

const byId = new Map(programs.map(p => [p.id, p]));

function getProgram(id) {
  return byId.get(id) || null;
}

function allSteps(program) {
  return program.sections.flatMap(s => s.steps);
}

function findStep(program, stepId) {
  for (const section of program.sections) {
    const i = section.steps.findIndex(s => s.id === stepId);
    if (i >= 0) return { section, step: section.steps[i] };
  }
  return null;
}

function progressOf(program, completedIds) {
  const total = allSteps(program).length;
  const done = allSteps(program).filter(s => completedIds.includes(s.id)).length;
  return { total, done, percent: total ? Math.round((done / total) * 100) : 0, finished: total > 0 && done === total };
}

// Marca o desmarca un paso y, si se completan todos, otorga la insignia del curso
// (igual que la recompensa "ALL_STEPS_COMPLETED" configurada en Wix).
async function setStep(db, memberId, program, stepId, completed) {
  if (!findStep(program, stepId)) throw Object.assign(new Error('Paso no encontrado'), { status: 404 });
  if (!(await db.getEnrollment(memberId, program.id))) {
    throw Object.assign(new Error('Primero únete al curso'), { status: 403 });
  }
  await db.setStepCompleted(memberId, program.id, stepId, completed);
  const completedIds = await db.getCompletedSteps(memberId, program.id);
  const progress = progressOf(program, completedIds);
  let badgeAwarded = false;
  if (progress.finished) {
    await db.markProgramCompleted(memberId, program.id);
    await db.awardBadge(memberId, program.badge.id, program.id);
    badgeAwarded = true;
  }
  return { completedIds, progress, badgeAwarded };
}

function badgeById(id) {
  const p = programs.find(x => x.badge.id === id);
  return p ? { ...p.badge, program: p } : null;
}

module.exports = { programs, getProgram, allSteps, findStep, progressOf, setStep, badgeById };
