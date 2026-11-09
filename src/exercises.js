// Banco de ejercicios convertido en formulario interactivo.
// Toma los 18 ejercicios del sitio original ("a) …  b) …  c) …" y
// "Respuesta: b) …") y los separa en opciones, respuesta correcta y explicación.
const raw = require('./data/exercises.json');

const SLUGS = ['matematica', 'fisica', 'algebra-lineal'];

function parseOptions(text) {
  return [...text.matchAll(/([a-c])\)\s*(.*?)(?=\s+[a-c]\)\s|$)/g)].map(m => ({ letter: m[1], text: m[2].trim() }));
}

function parseAnswer(text, options) {
  const m = text.match(/^Respuesta:\s*([a-c])\)\s*(.*)$/);
  if (!m) throw new Error(`Respuesta sin formato: ${text}`);
  const letter = m[1];
  let rest = m[2].trim();
  const opt = options.find(o => o.letter === letter);
  if (opt && rest.startsWith(opt.text)) rest = rest.slice(opt.text.length);
  rest = rest.replace(/^[.\s]+/, '');
  return { letter, explanation: rest };
}

const subjects = raw.subjects.map((s, si) => ({
  name: s.name,
  slug: SLUGS[si],
  exercises: s.exercises.map((e, i) => {
    const options = parseOptions(e.options);
    const { letter, explanation } = parseAnswer(e.answer, options);
    return { id: `${SLUGS[si]}-${i + 1}`, question: e.question, options, correct: letter, explanation, answerText: e.answer };
  })
}));

const byId = new Map(subjects.flatMap(s => s.exercises.map(e => [e.id, { ...e, subject: s }])));
const total = byId.size;

function getExercise(id) { return byId.get(id) || null; }

// Corrige una respuesta. Devuelve null si el ejercicio o la letra no existen.
function grade(id, choice) {
  const ex = getExercise(id);
  if (!ex || !ex.options.some(o => o.letter === choice)) return null;
  const correctOpt = ex.options.find(o => o.letter === ex.correct);
  return {
    id, choice, correct: choice === ex.correct, correctLetter: ex.correct,
    correctText: correctOpt ? correctOpt.text : '', explanation: ex.explanation
  };
}

// Resumen por materia a partir de los intentos guardados de un miembro
function summarize(attempts) {
  const map = new Map(attempts.map(a => [a.exercise_id, a]));
  const perSubject = subjects.map(s => {
    const answered = s.exercises.filter(e => map.has(e.id));
    const right = answered.filter(e => Number(map.get(e.id).is_correct) === 1);
    return { name: s.name, slug: s.slug, total: s.exercises.length, answered: answered.length, correct: right.length };
  });
  return {
    perSubject,
    answered: perSubject.reduce((a, s) => a + s.answered, 0),
    correct: perSubject.reduce((a, s) => a + s.correct, 0),
    total
  };
}

module.exports = { title: raw.title, intro: raw.intro, subjects, total, getExercise, grade, summarize };
