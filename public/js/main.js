// Interacciones del sitio: menú móvil, submenú "Cursos", formulario de dudas,
// completar pasos de un curso y copiar enlace. Funciona sin JS (degrada a
// formularios y enlaces normales).
(function () {
  'use strict';

  // ---------- Avisos emergentes (+XP, insignias) ----------
  const toastRegion = document.querySelector('[data-toasts]');
  function toast(html, ms = 2600) {
    if (!toastRegion) return;
    const t = document.createElement('div');
    t.className = 'toast';
    t.innerHTML = html;
    toastRegion.appendChild(t);
    setTimeout(() => { t.classList.add('toast--out'); setTimeout(() => t.remove(), 320); }, ms);
  }
  window.mcToast = toast;

  // Controles que solo tienen sentido con JavaScript ("Ver respuesta",
  // "Copiar enlace"): vienen ocultos en el HTML y se muestran aquí.
  document.querySelectorAll('[data-js-only]').forEach(el => { el.hidden = false; });

  // ---------- Menú móvil ----------
  const menu = document.getElementById('menu-movil');
  const toggles = document.querySelectorAll('.menu-toggle');
  // Los botones son enlaces (#menu-movil) para que funcionen sin JavaScript.
  let lastToggle = null;
  const isOpen = () => menu.classList.contains('is-open');
  function openMenu(btn) {
    lastToggle = btn;
    menu.classList.add('is-open');
    document.body.classList.add('menu-open');
    toggles.forEach(t => t.setAttribute('aria-expanded', 'true'));
    menu.querySelector('.mobile-menu__close').focus();
  }
  function closeMenu() {
    menu.classList.remove('is-open');
    document.body.classList.remove('menu-open');
    toggles.forEach(t => t.setAttribute('aria-expanded', 'false'));
    if (lastToggle) lastToggle.focus();
  }
  // Los enlaces con role="button" también se activan con la barra espaciadora
  const onSpace = fn => e => { if (e.key === ' ') { e.preventDefault(); fn(); } };
  toggles.forEach(btn => {
    btn.addEventListener('click', e => { e.preventDefault(); openMenu(btn); });
    btn.addEventListener('keydown', onSpace(() => openMenu(btn)));
  });
  if (menu) {
    const close = menu.querySelector('.mobile-menu__close');
    close.addEventListener('click', e => { e.preventDefault(); closeMenu(); });
    close.addEventListener('keydown', onSpace(closeMenu));
    document.addEventListener('keydown', e => { if (e.key === 'Escape' && isOpen()) closeMenu(); });
    window.addEventListener('resize', () => { if (window.innerWidth > 750 && isOpen()) closeMenu(); });
  }

  // ---------- Submenú "Cursos" (teclado / táctil) ----------
  document.querySelectorAll('.nav-item.has-children').forEach(item => {
    const link = item.querySelector('.nav-btn');
    item.addEventListener('keydown', e => {
      if (e.key === 'Escape') { item.classList.remove('is-open'); link.focus(); }
    });
    // En pantallas táctiles el primer toque abre el submenú
    link.addEventListener('click', e => {
      if (window.matchMedia('(hover: none)').matches && !item.classList.contains('is-open')) {
        e.preventDefault();
        item.classList.add('is-open');
      }
    });
    document.addEventListener('click', e => { if (!item.contains(e.target)) item.classList.remove('is-open'); });
  });

  // ---------- Formulario "¿Tienes una duda?" ----------
  const qform = document.querySelector('form[data-ajax]');
  if (qform) {
    const status = qform.querySelector('.qform__status');
    const submit = qform.querySelector('.qform__submit');
    const setError = (name, msg) => {
      const p = qform.querySelector(`[data-error-for="${name}"]`);
      if (!p) return;
      p.textContent = msg || '';
      p.closest('.qfield').classList.toggle('has-error', !!msg);
      const field = qform.elements[name];
      if (field) field.setAttribute('aria-invalid', msg ? 'true' : 'false');
    };
    const validate = () => {
      const errs = {};
      for (const name of ['firstName', 'lastName', 'question', 'subject']) {
        if (!String(qform.elements[name].value).trim()) errs[name] = name === 'subject' ? 'Elige una materia.' : 'Completa este campo.';
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(qform.elements.email.value.trim())) errs.email = 'Escribe un correo válido.';
      return errs;
    };
    qform.addEventListener('submit', async e => {
      e.preventDefault();
      status.textContent = ''; status.classList.remove('is-error');
      ['firstName', 'lastName', 'email', 'subject', 'question'].forEach(n => setError(n, ''));
      const errs = validate();
      if (Object.keys(errs).length) {
        Object.entries(errs).forEach(([n, m]) => setError(n, m));
        qform.elements[Object.keys(errs)[0]].focus();
        return;
      }
      submit.disabled = true;
      try {
        const res = await fetch(qform.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(Object.fromEntries(new FormData(qform)))
        });
        const data = await res.json();
        if (!res.ok || !data.ok) {
          Object.entries(data.errors || {}).forEach(([n, m]) => setError(n, m));
          throw new Error('No se pudo enviar');
        }
        qform.reset();
        status.textContent = '¡Gracias! Recibimos tu pregunta.';
      } catch {
        status.textContent = 'No pudimos enviar tu pregunta. Revisa los campos e inténtalo de nuevo.';
        status.classList.add('is-error');
      } finally {
        submit.disabled = false;
      }
    });
  }

  // ---------- Completar pasos de un curso ----------
  const stepForm = document.querySelector('form[data-step-form]');
  if (stepForm) {
    const btn = stepForm.querySelector('[data-complete-btn]');
    const completedInput = stepForm.elements.completed;
    stepForm.addEventListener('submit', async e => {
      e.preventDefault();
      const completed = completedInput.value === 'true';
      btn.disabled = true;
      try {
        const res = await fetch(stepForm.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ completed })
        });
        const data = await res.json();
        if (!res.ok || !data.ok) throw new Error(data.error || 'Error');
        const stepId = stepForm.dataset.step;
        const check = document.querySelector(`[data-step-check="${stepId}"]`);
        if (check) check.classList.toggle('is-done', completed);
        const state = document.querySelector(`[data-step-state="${stepId}"]`);
        if (state) state.textContent = completed ? '(completado)' : '';
        const bar = document.querySelector('.participant__progress .progress');
        if (bar) {
          bar.setAttribute('aria-valuenow', data.progress.percent);
          bar.querySelector('span').style.width = data.progress.percent + '%';
        }
        const txt = document.querySelector('[data-progress-text]');
        if (txt) txt.textContent = `${data.progress.done} de ${data.progress.total} pasos`;
        completedInput.value = completed ? 'false' : 'true';
        btn.textContent = completed ? 'Marcar como no completado' : 'Completar paso';
        if (data.xp) toast(`<strong>+${data.xp} XP</strong> Paso completado`);
        if (data.badgeAwarded) {
          document.querySelector('[data-badge-earned]').hidden = false;
          toast('<strong>★ ¡Insignia ganada!</strong> Terminaste el curso', 4000);
        }
        // Pasa al siguiente paso pendiente tras completar
        if (completed) {
          const nextId = stepForm.elements.nextStep.value;
          if (nextId && nextId !== stepId && !data.progress.finished) {
            setTimeout(() => { window.location.search = '?paso=' + encodeURIComponent(nextId); }, 1100);
          }
        }
      } catch (err) {
        let msg = stepForm.querySelector('.step-actions__error');
        if (!msg) { msg = document.createElement('p'); msg.className = 'step-actions__error'; msg.setAttribute('role', 'alert'); stepForm.appendChild(msg); }
        msg.textContent = err.message;
      } finally {
        btn.disabled = false;
      }
    });
  }

  // ---------- Banco de ejercicios (formulario interactivo) ----------
  const bankEl = document.querySelector('[data-bank]');
  if (bankEl) {
    const post = async (url, body) => {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.ok) throw new Error(data.error || 'No se pudo completar la acción. Intenta de nuevo.');
      return data;
    };

    const updateScores = () => {
      const cards = [...bankEl.querySelectorAll('[data-ex]')];
      const answered = cards.filter(c => c.classList.contains('is-correct') || c.classList.contains('is-wrong'));
      const correct = cards.filter(c => c.classList.contains('is-correct'));
      bankEl.querySelector('[data-score-correct]').textContent = correct.length;
      bankEl.querySelector('[data-score-answered]').textContent = answered.length;
      bankEl.querySelector('[data-score-bar]').style.width = Math.round(answered.length / cards.length * 100) + '%';
      bankEl.querySelectorAll('[data-subject]').forEach(sec => {
        sec.querySelector('[data-subject-correct]').textContent = sec.querySelectorAll('.ex-card.is-correct').length;
      });
    };

    const showResult = (card, r) => {
      card.classList.remove('is-correct', 'is-wrong');
      card.classList.add(r.correct ? 'is-correct' : 'is-wrong');
      card.querySelectorAll('.ex-option').forEach(label => {
        const input = label.querySelector('input');
        input.disabled = true;
        label.classList.toggle('is-right', input.value === r.correctLetter);
        label.classList.toggle('is-picked-wrong', input.value === r.choice && !r.correct);
      });
      const fb = card.querySelector('[data-feedback]');
      fb.innerHTML = '';
      const t = document.createElement('p'); t.className = 'ex-feedback__title'; t.textContent = r.correct ? '¡Correcto!' : 'Incorrecto';
      const a = document.createElement('p'); a.textContent = `Respuesta: ${r.correctLetter}) ${r.correctText}.`;
      const w = document.createElement('p'); w.className = 'ex-feedback__why'; w.textContent = r.explanation;
      fb.append(t, a, w);
      fb.hidden = false;
      card.querySelector('[data-check]').hidden = true;
      card.querySelector('[data-retry]').hidden = false;
      card.querySelector('[data-msg]').textContent = '';
    };

    const clearCard = card => {
      card.classList.remove('is-correct', 'is-wrong');
      card.querySelectorAll('.ex-option').forEach(label => {
        const input = label.querySelector('input');
        input.disabled = false; input.checked = false;
        label.classList.remove('is-right', 'is-picked-wrong');
      });
      const fb = card.querySelector('[data-feedback]'); fb.hidden = true; fb.innerHTML = '';
      card.querySelector('[data-check]').hidden = false;
      card.querySelector('[data-retry]').hidden = true;
      card.querySelector('[data-msg]').textContent = '';
    };

    const check = async card => {
      const picked = card.querySelector('input:checked');
      const msg = card.querySelector('[data-msg]');
      if (!picked) { msg.textContent = 'Elige una opción.'; return false; }
      try {
        const r = await post(`/api/ejercicios/${encodeURIComponent(card.dataset.ex)}`, { choice: picked.value });
        showResult(card, r);
        if (r.xp) toast(`<strong>+${r.xp} XP</strong> ¡Respuesta correcta!`);
        else if (r.correct && !r.saved) toast('<strong>¡Correcto!</strong> Inicia sesión para sumar XP');
        return true;
      } catch (err) { msg.textContent = err.message; return false; }
    };

    bankEl.addEventListener('click', async e => {
      const btn = e.target.closest('button');
      if (!btn || !bankEl.contains(btn)) return;
      const card = btn.closest('[data-ex]');
      if (btn.hasAttribute('data-check')) {
        e.preventDefault(); btn.disabled = true;
        await check(card); btn.disabled = false; updateScores();
      } else if (btn.hasAttribute('data-retry')) {
        e.preventDefault();
        try { await post('/api/ejercicios-reiniciar', { exercise: card.dataset.ex }); } catch {}
        clearCard(card); updateScores();
        card.querySelector('input').focus();
      } else if (btn.hasAttribute('data-check-all')) {
        e.preventDefault(); btn.disabled = true;
        const form = btn.closest('form');
        const pending = [...form.querySelectorAll('[data-ex]')].filter(c => !c.classList.contains('is-correct') && !c.classList.contains('is-wrong'));
        let missing = 0;
        for (const c of pending) { if (c.querySelector('input:checked')) await check(c); else { missing++; c.querySelector('[data-msg]').textContent = 'Elige una opción.'; } }
        btn.disabled = false; updateScores();
        if (missing) {
          const first = form.querySelector('[data-ex]:not(.is-correct):not(.is-wrong)');
          if (first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      } else if (btn.hasAttribute('data-reset')) {
        e.preventDefault();
        const sec = btn.closest('[data-subject]');
        try { await post('/api/ejercicios-reiniciar', { subject: sec.dataset.subject }); } catch {}
        sec.querySelectorAll('[data-ex]').forEach(clearCard); updateScores();
        sec.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });

    // Al elegir una opción se borra el aviso "Elige una opción."
    bankEl.addEventListener('change', e => {
      const card = e.target.closest('[data-ex]');
      if (card) card.querySelector('[data-msg]').textContent = '';
    });

    // Filtro por materia. Las pestañas son enlaces (?materia=...) que el
    // servidor ya aplica; con JavaScript se filtra sin recargar.
    const tabs = [...bankEl.querySelectorAll('[data-filter]')];
    const applyFilter = slug => {
      const valid = tabs.some(t => t.dataset.filter === slug) ? slug : 'todas';
      tabs.forEach(t => {
        const on = t.dataset.filter === valid;
        t.classList.toggle('is-active', on);
        if (on) t.setAttribute('aria-current', 'true'); else t.removeAttribute('aria-current');
      });
      bankEl.querySelectorAll('[data-subject]').forEach(sec => { sec.hidden = valid !== 'todas' && sec.dataset.subject !== valid; });
      // Los formularios conservan el filtro al enviarse sin JavaScript
      bankEl.querySelectorAll('[data-ex-form]').forEach(f => {
        const slug = f.closest('[data-subject]').dataset.subject;
        f.setAttribute('action', '/banco-de-ejercicios' + (valid === 'todas' ? '' : '?materia=' + valid) + '#' + slug);
      });
    };
    tabs.forEach(t => t.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // abrir en otra pestaña
      e.preventDefault();
      applyFilter(t.dataset.filter);
      history.replaceState(null, '', t.getAttribute('href'));
      const bar = bankEl.querySelector('[data-bank-bar]');
      window.scrollTo({ top: bar.getBoundingClientRect().top + window.scrollY - 1, behavior: 'smooth' });
    }));
    // Enlaces antiguos con la materia en el ancla (#fisica): se filtra igual.
    // Si el ancla es un ejercicio (#fisica-2) se deja la vista como está.
    const hash = location.hash.slice(1);
    if (hash !== 'todas' && tabs.some(t => t.dataset.filter === hash)) applyFilter(hash);
  }

  // Confirmación antes de salir de un curso (se borra el avance)
  const leave = document.querySelector('form[data-leave-form]');
  if (leave) leave.addEventListener('submit', e => {
    if (!window.confirm('¿Salir del curso? Se borrará tu avance en este curso.')) e.preventDefault();
  });

  // ---------- "Ver respuesta" en los pasos de ejercicio ----------
  document.querySelectorAll('[data-reveal]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-answer]').forEach(p => p.classList.add('is-shown'));
      btn.hidden = true;
    });
  });

  // ---------- Filtro del catálogo de cursos ----------
  // Los filtros son enlaces (/challenges?area=...) que el servidor ya sabe
  // aplicar. Con JavaScript se filtra sin recargar y se actualiza la URL.
  const catalog = document.querySelector('[data-catalog]');
  if (catalog) {
    const chips = [...catalog.querySelectorAll('[data-cat-filter]')];
    const cards = [...catalog.querySelectorAll('.course-card[data-area]')];
    const help = catalog.querySelector('[data-catalog-help]');
    const empty = catalog.querySelector('[data-catalog-empty]');
    chips.forEach(chip => chip.addEventListener('click', e => {
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return; // abrir en otra pestaña
      e.preventDefault();
      const f = chip.dataset.catFilter;
      chips.forEach(c => {
        const on = c === chip;
        c.classList.toggle('is-active', on);
        if (on) c.setAttribute('aria-current', 'true'); else c.removeAttribute('aria-current');
      });
      let shown = 0;
      cards.forEach(card => {
        const show = f === 'todas' || (f === 'mios' ? card.dataset.mine === '1' : card.dataset.area === f);
        card.hidden = !show; if (show) shown++;
      });
      if (help) help.hidden = f !== 'todas';
      if (empty) empty.hidden = shown > 0;
      history.replaceState(null, '', chip.getAttribute('href'));
    }));
  }

  // ---------- Copiar enlace (página del programa) ----------
  document.querySelectorAll('[data-copy]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const fb = btn.parentElement.querySelector('.copy-feedback');
      try {
        await navigator.clipboard.writeText(btn.dataset.copy);
        if (fb) fb.textContent = 'Enlace copiado';
      } catch {
        if (fb) fb.textContent = btn.dataset.copy;
      }
      setTimeout(() => { if (fb) fb.textContent = ''; }, 2500);
    });
  });
})();
