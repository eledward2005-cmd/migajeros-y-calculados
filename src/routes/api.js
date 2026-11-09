// Acciones del sitio: registro e inicio de sesión de miembros, unirse a un
// curso, completar pasos y enviar el formulario "¿Tienes una duda?".
// Todas aceptan formularios HTML normales y peticiones JSON (fetch).
const express = require('express');
const { hashPassword, verifyPassword, setSession, clearSession } = require('../auth');
const { getProgram, setStep } = require('../programs');
const { site } = require('../data/site');
const bank = require('../exercises');
const { XP, WEEKLY_GOALS } = require('../gamification');
const { areas } = require('../data/areas');
const { safeNext } = require('./pages');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const wantsJson = req => req.is('application/json') || (req.get('accept') || '').includes('application/json');
const clean = (v, max) => String(v ?? '').trim().slice(0, max);

module.exports = function apiRouter(db) {
  const r = express.Router();

  // ---------- Miembros ----------
  r.post('/auth/registro', async (req, res, next) => {
    const values = { firstName: clean(req.body.firstName, 100), lastName: clean(req.body.lastName, 100), email: clean(req.body.email, 255).toLowerCase() };
    const password = String(req.body.password || '');
    const nextUrl = safeNext(req.body.next);
    const fail = (status, error) => wantsJson(req)
      ? res.status(status).json({ ok: false, error })
      : res.status(status).render('pages/auth', { site, title: 'Regístrate | Migajeros y Calculados', active: 'progreso', mode: 'signup', next: nextUrl, error, values });
    try {
      if (!values.firstName || !values.lastName) return fail(400, 'Escribe tu nombre y apellido.');
      if (!EMAIL_RE.test(values.email)) return fail(400, 'Escribe un correo válido.');
      if (password.length < 6) return fail(400, 'La contraseña debe tener al menos 6 caracteres.');
      if (await db.findMemberByEmail(values.email)) return fail(409, 'Ya existe una cuenta con ese correo. Inicia sesión.');
      const id = await db.createMember({ ...values, passwordHash: hashPassword(password) });
      setSession(res, id, req.secure);
      return wantsJson(req) ? res.json({ ok: true, next: nextUrl }) : res.redirect(303, nextUrl);
    } catch (e) { next(e); }
  });

  r.post('/auth/login', async (req, res, next) => {
    const email = clean(req.body.email, 255).toLowerCase();
    const password = String(req.body.password || '');
    const nextUrl = safeNext(req.body.next);
    try {
      const member = email && await db.findMemberByEmail(email);
      if (!member || !verifyPassword(password, member.password_hash)) {
        const error = 'Correo o contraseña incorrectos.';
        return wantsJson(req)
          ? res.status(401).json({ ok: false, error })
          : res.status(401).render('pages/auth', { site, title: 'Iniciar sesión | Migajeros y Calculados', active: 'progreso', mode: 'login', next: nextUrl, error, values: { email } });
      }
      setSession(res, member.id, req.secure);
      return wantsJson(req) ? res.json({ ok: true, next: nextUrl }) : res.redirect(303, nextUrl);
    } catch (e) { next(e); }
  });

  r.post('/auth/salir', (req, res) => {
    clearSession(res);
    return wantsJson(req) ? res.json({ ok: true }) : res.redirect(303, '/');
  });

  // ---------- Cursos ----------
  const requireMember = (req, res, next) => {
    if (req.member) return next();
    const back = `/p-gina-de-programas/${req.params.id}`;
    return wantsJson(req)
      ? res.status(401).json({ ok: false, error: 'Inicia sesión para continuar.', login: `/login?next=${encodeURIComponent(back)}` })
      : res.redirect(303, `/login?next=${encodeURIComponent(back)}`);
  };

  r.post('/programas/:id/unirse', requireMember, async (req, res, next) => {
    try {
      const program = getProgram(req.params.id);
      if (!program) return res.status(404).json({ ok: false, error: 'Curso no encontrado' });
      await db.enroll(req.member.id, program.id);
      const to = `/p-gina-de-programas/${program.id}/participante`;
      return wantsJson(req) ? res.json({ ok: true, next: to }) : res.redirect(303, to);
    } catch (e) { next(e); }
  });

  r.post('/programas/:id/salir', requireMember, async (req, res, next) => {
    try {
      const program = getProgram(req.params.id);
      if (!program) return res.status(404).json({ ok: false, error: 'Curso no encontrado' });
      await db.leave(req.member.id, program.id);
      return wantsJson(req) ? res.json({ ok: true }) : res.redirect(303, `/p-gina-de-programas/${program.id}`);
    } catch (e) { next(e); }
  });

  r.post('/programas/:id/pasos/:stepId', requireMember, async (req, res, next) => {
    try {
      const program = getProgram(req.params.id);
      if (!program) return res.status(404).json({ ok: false, error: 'Curso no encontrado' });
      const completed = req.body.completed === undefined ? true : (req.body.completed === true || req.body.completed === 'true');
      const before = await db.getCompletedSteps(req.member.id, program.id);
      const hadBadge = (await db.getBadges(req.member.id)).some(b => b.badge_id === program.badge.id);
      const result = await setStep(db, req.member.id, program, req.params.stepId, completed);
      const xp = (completed && !before.includes(req.params.stepId) ? XP.step : 0) + (result.badgeAwarded && !hadBadge ? XP.badge : 0);
      result.badgeAwarded = result.badgeAwarded && !hadBadge;
      if (wantsJson(req)) return res.json({ ok: true, xp, ...result });
      const nextStep = clean(req.body.nextStep, 36);
      return res.redirect(303, `/p-gina-de-programas/${program.id}/participante?paso=${encodeURIComponent(nextStep || req.params.stepId)}`);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ ok: false, error: e.message });
      next(e);
    }
  });

  // ---------- Banco de ejercicios ----------
  r.post('/ejercicios/:id', async (req, res, next) => {
    try {
      const result = bank.grade(req.params.id, clean(req.body.choice, 1));
      if (!result) return res.status(400).json({ ok: false, error: 'Elige una opción.' });
      let xp = 0;
      if (req.member) {
        const before = (await db.getAttempts(req.member.id)).find(a => a.exercise_id === result.id);
        const wasCorrect = before && Number(before.is_correct) === 1;
        await db.saveAttempt(req.member.id, result.id, result.choice, result.correct);
        if (result.correct && !wasCorrect) xp = XP.exercise;
      }
      res.json({ ok: true, saved: !!req.member, xp, ...result });
    } catch (e) { next(e); }
  });

  r.post('/ejercicios-reiniciar', async (req, res, next) => {
    try {
      const single = bank.getExercise(req.body.exercise);
      const subject = bank.subjects.find(s => s.slug === req.body.subject);
      const ids = single ? [single.id] : (subject ? [subject] : bank.subjects).flatMap(s => s.exercises.map(e => e.id));
      if (req.member) await db.clearAttempts(req.member.id, ids);
      const anchor = single ? `#${single.id}` : (subject ? `#${subject.slug}` : '');
      return wantsJson(req) ? res.json({ ok: true, cleared: ids }) : res.redirect(303, '/banco-de-ejercicios' + anchor);
    } catch (e) { next(e); }
  });

  // ---------- Personalización del panel ----------
  r.post('/perfil/ajustes', async (req, res, next) => {
    if (!req.member) return wantsJson(req) ? res.status(401).json({ ok: false, error: 'Inicia sesión.' }) : res.redirect(303, '/login?next=/profile');
    try {
      const goal = Number(req.body.weeklyGoal);
      const weeklyGoal = WEEKLY_GOALS.includes(goal) ? goal : 5;
      const focusArea = areas.some(a => !a.soon && a.slug === req.body.focusArea) ? req.body.focusArea : null;
      await db.saveSettings(req.member.id, { weeklyGoal, focusArea });
      return wantsJson(req) ? res.json({ ok: true, weeklyGoal, focusArea }) : res.redirect(303, '/profile?guardado=1#ajustes');
    } catch (e) { next(e); }
  });

  // ---------- Formulario "¿Tienes una duda?" (Ayudas UCC) ----------
  r.post('/preguntas', async (req, res, next) => {
    const q = {
      firstName: clean(req.body.firstName, 100), lastName: clean(req.body.lastName, 100),
      email: clean(req.body.email, 255), subject: clean(req.body.subject, 50),
      topic: clean(req.body.topic, 200), question: clean(req.body.question, 5000)
    };
    const errors = {};
    if (!q.firstName) errors.firstName = 'Completa este campo.';
    if (!q.lastName) errors.lastName = 'Completa este campo.';
    if (!EMAIL_RE.test(q.email)) errors.email = 'Escribe un correo válido.';
    if (!site.ayudas.subjects.includes(q.subject)) errors.subject = 'Elige una materia.';
    if (!q.question) errors.question = 'Completa este campo.';
    if (Object.keys(errors).length) {
      return wantsJson(req) ? res.status(400).json({ ok: false, errors }) : res.redirect(303, '/ayudas-ucc#duda');
    }
    try {
      const id = await db.saveQuestion(q);
      return wantsJson(req) ? res.json({ ok: true, id }) : res.redirect(303, '/ayudas-ucc?enviado=1#duda');
    } catch (e) { next(e); }
  });

  return r;
};
