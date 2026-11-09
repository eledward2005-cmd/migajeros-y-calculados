// Prueba de humo: arranca el servidor con una base de datos temporal y recorre
// todas las páginas y funcionalidades (registro, cursos, pasos, insignia,
// formulario, búsqueda). Uso: npm test
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'migajeros-'));
  process.env.SQLITE_FILE = path.join(tmp, 'test.db');
  process.env.DB_DRIVER = 'sqlite';
  process.env.ADMIN_TOKEN = 'prueba';
  const { createDb } = require('../src/db');
  const { createApp } = require('../server');
  const programs = require('../src/data/programs.json');
  const db = await createDb();
  const app = await createApp(db);
  const server = app.listen(0);
  const base = `http://localhost:${server.address().port}`;
  let cookie = '';
  const req = async (url, opts = {}) => {
    const res = await fetch(base + url, { redirect: 'manual', ...opts, headers: { ...(opts.headers || {}), cookie } });
    const set = res.headers.get('set-cookie');
    if (set) cookie = set.split(';')[0];
    return res;
  };
  const json = (url, body) => req(url, { method: 'POST', headers: { 'content-type': 'application/json', accept: 'application/json' }, body: JSON.stringify(body) });
  let ok = 0;
  const check = (cond, msg) => { assert.ok(cond, msg); ok++; console.log('  ✓', msg); };

  try {
    console.log('Páginas');
    for (const p of ['/', '/challenges', '/matematica', '/fisica', '/algebra-lineal', '/banco-de-ejercicios', '/ayudas-ucc', '/nosotros', '/profile', '/login', '/registro', '/buscar?q=derivada']) {
      const r = await req(p);
      check(r.status === 200, `GET ${p} → 200`);
    }
    for (const prog of programs) check((await req(`/p-gina-de-programas/${prog.id}`)).status === 200, `Página del curso ${prog.slug}`);
    check((await req('/no-existe')).status === 404, 'Página inexistente → 404');

    const home = await (await req('/')).text();
    for (const href of ['/challenges', '/matematica', '/fisica', '/algebra-lineal', '/nosotros', '/banco-de-ejercicios', '/ayudas-ucc', '/profile']) {
      check(home.includes(`href="${href}"`), `El menú enlaza a ${href}`);
    }
    const bank = await (await req('/banco-de-ejercicios')).text();
    check((bank.match(/data-ex="/g) || []).length === 18, 'El banco tiene 18 ejercicios interactivos');
    for (const a of ['/matematica', '/algebra-lineal', '/fisica']) {
      const html = await (await req(a)).text();
      check(html.includes('class="topic-card"'), `La página de área ${a} muestra sus temas`);
    }

    let svgSinTam = 0;
    for (const p of ['/', '/challenges', '/matematica', '/banco-de-ejercicios', `/p-gina-de-programas/${programs[0].id}`]) {
      const html = await (await req(p)).text();
      svgSinTam += (html.match(/<svg\b[^>]*>/g) || []).filter(t => !/\swidth="\d+"/.test(t) || !/\sheight="\d+"/.test(t)).length;
    }
    check(svgSinTam === 0, 'Todos los <svg> tienen width y height por defecto');

    console.log('Filtros sin JavaScript');
    // Tarjetas del catálogo visibles (sin el atributo hidden), por data-area
    const visibleCards = html => (html.match(/<li class="course-card[^"]*"[^>]*>/g) || [])
      .filter(t => !/\shidden(\s|>|=)/.test(t)).map(t => (t.match(/data-area="([^"]+)"/) || [, 'ayuda'])[1]);
    const currentChip = html => (html.match(/<a class="filter-chip[^"]*"[^>]*aria-current="true"[^>]*>([^<]+)</) || [])[1];
    let cat = await (await req('/challenges')).text();
    check(/<a class="filter-chip[^"]*" href="\/challenges\?area=fisica"/.test(cat), 'Los filtros del catálogo son enlaces reales (?area=...)');
    check(currentChip(cat) === 'Todas' && visibleCards(cat).includes('ayuda'), 'En "Todas" aparece la tarjeta "¿No encuentras tu tema?"');
    check(cat.includes('href="/ayudas-ucc#duda"') && cat.includes('¿No encuentras tu tema?'), 'La tarjeta de ayuda enlaza a /ayudas-ucc#duda');
    check(!cat.includes('data-cat-filter="mios"'), 'Sin sesión no aparece "Mis cursos"');
    cat = await (await req('/challenges?area=fisica')).text();
    check(currentChip(cat) === 'Física' && visibleCards(cat).join() === 'fisica', 'Filtrar por Física en el servidor muestra solo Física y marca aria-current');
    check(!visibleCards(cat).includes('ayuda'), 'La tarjeta de ayuda no aparece con otro filtro');
    cat = await (await req('/challenges?area=mios')).text();
    check(currentChip(cat) === 'Todas' && visibleCards(cat).length === 6, 'Sin sesión, ?area=mios muestra todos los cursos');
    const ayudas = await (await req('/ayudas-ucc')).text();
    check(ayudas.includes('id="duda"'), 'Ayudas UCC tiene el ancla #duda');
    let bk = await (await req('/banco-de-ejercicios?materia=fisica')).text();
    const shownSubjects = html => (html.match(/<section class="bank-subject[^>]*>/g) || []).filter(t => !/\shidden(\s|>)/.test(t)).map(t => t.match(/data-subject="([^"]+)"/)[1]);
    check(shownSubjects(bk).join() === 'fisica' && /href="\/banco-de-ejercicios\?materia=fisica"[^>]*aria-current="true"/.test(bk), 'Las pestañas del banco filtran en el servidor (?materia=fisica)');
    check(bk.includes('action="/banco-de-ejercicios?materia=fisica#fisica"'), 'El formulario del banco conserva el filtro al enviarse');
    bk = await (await req('/banco-de-ejercicios?materia=otra')).text();
    check(shownSubjects(bk).length === 3, 'Una materia inválida muestra todas');
    check(home.includes('class="menu-toggle" href="#menu-movil"'), 'El menú del celular es un enlace (funciona sin JavaScript)');

    console.log('Acceso, búsqueda y 404');
    const h1Count = html => (html.match(/<h1[\s>]/g) || []).length;
    for (const p of ['/login', '/registro']) {
      const html = await (await req(p)).text();
      check(html.includes('class="auth-split"') && html.includes('src="/img/monitorias.jpg" alt="Estudiantes') && html.includes('auth-benefits') && h1Count(html) === 1,
        `${p}: dos columnas con foto, beneficios y un solo h1`);
    }
    let sr = await (await req('/buscar')).text();
    check(sr.includes('data-search-suggestions') && sr.includes('href="/buscar?q=La%20derivada"') && h1Count(sr) === 1, '/buscar sin texto muestra el encabezado y las búsquedas sugeridas');
    sr = await (await req('/buscar?q=zzzxq')).text();
    check(sr.includes('data-search-empty') && sr.includes('data-search-suggestions'), 'Una búsqueda sin resultados muestra un aviso y sugerencias');
    sr = await (await req('/buscar?q=derivada')).text();
    check(sr.includes('class="results"') && !sr.includes('data-search-suggestions'), 'Con resultados no se muestran las sugerencias');
    const nf = await req('/no-existe');
    const nfHtml = await nf.text();
    check(nf.status === 404 && nfHtml.includes('action="/buscar"') && nfHtml.includes('id="buscar-404"'), 'La página 404 tiene buscador');
    check(['href="/">Inicio<', 'href="/challenges">Cursos<', 'href="/profile">Mi progreso<'].every(s => nfHtml.includes(s)) && h1Count(nfHtml) === 1,
      'La página 404 tiene los botones Inicio, Cursos y Mi progreso');

    console.log('Caché del navegador');
    const cssV = (home.match(/\/css\/styles\.css\?v=([0-9a-f]{10})"/) || [])[1];
    const jsV = (home.match(/\/js\/main\.js\?v=([0-9a-f]{10})"/) || [])[1];
    check(cssV && jsV, 'styles.css y main.js llevan ?v=<hash del contenido>');
    const cssRes = await req(`/css/styles.css?v=${cssV}`);
    check(cssRes.headers.get('cache-control') === 'no-cache', 'styles.css se envía con Cache-Control: no-cache');
    check((await req(`/js/main.js?v=${jsV}`)).headers.get('cache-control') === 'no-cache', 'main.js se envía con Cache-Control: no-cache');
    check(/max-age=604800/.test((await req('/img/logo.png')).headers.get('cache-control') || ''), 'Las imágenes siguen en caché 7 días');

    console.log('Banco de ejercicios');
    let ex =await (await json('/api/ejercicios/matematica-1', { choice: 'b' })).json();
    check(ex.ok && ex.correct === true && ex.explanation.length > 0, 'Corrige una respuesta correcta y explica por qué');
    ex = await (await json('/api/ejercicios/matematica-1', { choice: 'a' })).json();
    check(ex.ok && ex.correct === false && ex.correctLetter === 'b', 'Corrige una respuesta incorrecta');
    check((await json('/api/ejercicios/matematica-1', { choice: 'z' })).status === 400, 'Rechaza una opción inválida');
    const nojs = await req('/banco-de-ejercicios', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: 'r_fisica-1=a' });
    check(nojs.status === 200 && (await nojs.text()).includes('is-correct'), 'Funciona también sin JavaScript (formulario normal)');

    console.log('Búsqueda');
    const s = await (await req('/buscar?q=determinante')).text();
    check(s.includes('/algebra-lineal') || s.includes('Álgebra'), 'Buscar "determinante" encuentra Álgebra Lineal');

    console.log('Formulario ¿Tienes una duda?');
    let r = await json('/api/preguntas', { firstName: '', email: 'x' });
    check(r.status === 400, 'Rechaza campos vacíos');
    r = await json('/api/preguntas', { firstName: 'Ana', lastName: 'Ruiz', email: 'ana@campusucc.edu.co', subject: 'Física', topic: 'MRUA', question: '¿Qué es la aceleración?' });
    check(r.status === 200 && (await r.json()).ok, 'Guarda una pregunta válida');
    const admin = await (await req('/admin/preguntas?token=prueba')).text();
    check(admin.includes('¿Qué es la aceleración?'), 'La pregunta aparece en /admin/preguntas');
    check((await req('/admin/preguntas')).status === 403, 'Admin sin token → 403');

    console.log('Miembros y cursos');
    const prog = programs.find(p => p.slug === 'matematica');
    r = await req(`/api/programas/${prog.id}/unirse`, { method: 'POST' });
    check(r.status === 303 && r.headers.get('location').startsWith('/login'), 'Unirse sin sesión lleva a iniciar sesión');
    r = await json('/api/auth/registro', { firstName: 'Juan', lastName: 'Prieto', email: 'juan@test.co', password: 'secreto1' });
    check(r.status === 200 && cookie.startsWith('mc_session='), 'Registro crea la sesión');
    const emptyWeek = await (await req('/profile')).text();
    check(emptyWeek.includes('data-week-empty') && !emptyWeek.includes('class="bars"'), 'Sin actividad, el panel muestra un mensaje en lugar de las barras');
    check((await json('/api/auth/registro', { firstName: 'J', lastName: 'P', email: 'juan@test.co', password: 'secreto1' })).status === 409, 'No permite correo repetido');
    r = await json(`/api/programas/${prog.id}/unirse`, {});
    check(r.status === 200, 'Se une al curso de Matemática');
    cat = await (await req('/challenges?area=mios')).text();
    check(currentChip(cat) === 'Mis cursos' && visibleCards(cat).join() === 'calculo', 'Con sesión, "Mis cursos" muestra solo los cursos del estudiante');
    check((await req(`/p-gina-de-programas/${prog.id}/participante`)).status === 200, 'Ve la vista del participante');
    const steps = prog.sections.flatMap(x => x.steps);
    let last;
    for (const st of steps) last = await (await json(`/api/programas/${prog.id}/pasos/${st.id}`, { completed: true })).json();
    check(last.progress.done === steps.length && last.progress.finished, `Completa los ${steps.length} pasos`);
    check(last.badgeAwarded === true && last.xp === 60, 'Gana la insignia "Matemática completada" (+10 XP del paso y +50 XP de la insignia)');
    ex = await (await json('/api/ejercicios/fisica-1', { choice: 'a' })).json();
    check(ex.xp === 5, 'Un ejercicio correcto suma +5 XP');
    ex = await (await json('/api/ejercicios/fisica-1', { choice: 'a' })).json();
    check(ex.xp === 0, 'Repetir el mismo ejercicio no vuelve a sumar XP');
    const profile = await (await req('/profile')).text();
    check(profile.includes('Matemática completada') && profile.includes('100%'), 'El panel muestra 100% en Cálculo y la insignia');
    check(profile.includes('Nivel') && profile.includes('Días de racha') && profile.includes('Dominio por área'), 'El panel muestra nivel, racha y dominio por área');
    check(profile.includes('class="bars"') && !profile.includes('data-week-empty'), 'Con actividad, el panel muestra las barras de la semana');
    r = await json('/api/perfil/ajustes', { weeklyGoal: 10, focusArea: 'fisica' });
    check(r.status === 200, 'Guarda la meta semanal y el área de interés');
    const p2 = await (await req('/profile')).text();
    check(p2.includes('de 10 actividades') && p2.includes('tu área de interés'), 'El panel usa la meta y el área elegidas');
    const homeMember = await (await req('/')).text();
    check(homeMember.includes('Hola, Juan'), 'El inicio saluda al estudiante por su nombre');
    r = await json(`/api/programas/${prog.id}/pasos/${steps[0].id}`, { completed: false });
    check((await r.json()).progress.done === steps.length - 1, 'Puede desmarcar un paso');

    console.log('Sesión');
    await req('/api/auth/salir', { method: 'POST' });
    cookie = '';
    check(!(await (await req('/profile')).text()).includes('Cerrar sesión'), 'Cierra sesión');
    check((await json('/api/auth/login', { email: 'juan@test.co', password: 'mala' })).status === 401, 'Rechaza contraseña incorrecta');
    check((await json('/api/auth/login', { email: 'juan@test.co', password: 'secreto1' })).status === 200, 'Inicia sesión de nuevo');

    console.log(`\nTodo bien: ${ok} comprobaciones.`);
  } catch (e) {
    console.error('\n✗ Falló:', e.message);
    process.exitCode = 1;
  } finally {
    server.close();
    await db.close();
    fs.rmSync(tmp, { recursive: true, force: true });
  }
})();
