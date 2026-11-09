// Servidor principal de Migajeros y Calculados (Node.js + Express + EJS).
const path = require('node:path');
const fs = require('node:fs');

// Carga variables de .env si existe (sin dependencias externas)
const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  for (const line of fs.readFileSync(envFile, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}

const crypto = require('node:crypto');
const express = require('express');
const { createDb } = require('./src/db');
const { sessionMiddleware } = require('./src/auth');
const { site } = require('./src/data/site');

// Versión de los archivos CSS y JS: hash corto de su contenido. Se usa como
// ?v=<hash> en las plantillas para que el navegador descargue la versión nueva
// cada vez que cambia el archivo. Se recalcula solo si cambia la fecha de
// modificación (sirve también con "npm run dev").
const assetCache = new Map();
function assetVersion(relPath) {
  const file = path.join(__dirname, 'public', relPath);
  try {
    const { mtimeMs } = fs.statSync(file);
    const cached = assetCache.get(file);
    if (cached && cached.mtimeMs === mtimeMs) return cached.hash;
    const hash = crypto.createHash('sha1').update(fs.readFileSync(file)).digest('hex').slice(0, 10);
    assetCache.set(file, { mtimeMs, hash });
    return hash;
  } catch {
    return '0';
  }
}

async function createApp(db) {
  const app = express();
  app.set('view engine', 'ejs');
  app.set('views', path.join(__dirname, 'views'));
  app.set('trust proxy', 1);
  app.disable('x-powered-by');

  app.use((req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  // Imágenes, fuentes y videos se guardan 7 días en caché. CSS y JS usan
  // "no-cache": el navegador los conserva, pero pregunta al servidor (ETag)
  // si cambiaron antes de usarlos, así nunca muestra estilos viejos.
  app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '7d',
    setHeaders(res, filePath) {
      if (/\.(css|js)$/i.test(filePath)) res.setHeader('Cache-Control', 'no-cache');
    }
  }));
  app.use(express.urlencoded({ extended: false, limit: '50kb' }));
  app.use(express.json({ limit: '50kb' }));
  app.use(sessionMiddleware(db));
  app.use((req, res, next) => {
    res.locals.currentPath = req.path;
    res.locals.assetV = { css: assetVersion('css/styles.css'), js: assetVersion('js/main.js') };
    next();
  });

  app.use('/api', require('./src/routes/api')(db));
  app.use('/', require('./src/routes/pages')(db));

  // Bandeja de preguntas del formulario (reemplaza el panel de Wix Forms).
  // Protegida con ADMIN_TOKEN: /admin/preguntas?token=...
  app.get('/admin/preguntas', async (req, res, next) => {
    const token = process.env.ADMIN_TOKEN;
    if (!token || req.query.token !== token) return res.status(403).send('Acceso restringido. Define ADMIN_TOKEN en .env y usa /admin/preguntas?token=TU_TOKEN');
    try {
      res.render('pages/admin', { site, title: 'Preguntas recibidas', active: '', questions: await db.listQuestions() });
    } catch (e) { next(e); }
  });

  app.use((req, res) => res.status(404).render('pages/notfound', { site, title: 'Página no encontrada | Migajeros y Calculados', active: '' }));
  app.use((err, req, res, next) => {
    console.error(err);
    if (res.headersSent) return next(err);
    res.status(500).render('pages/notfound', { site, title: 'Error | Migajeros y Calculados', active: '', error: true });
  });
  return app;
}

if (require.main === module) {
  (async () => {
    const db = await createDb();
    const app = await createApp(db);
    const port = Number(process.env.PORT || 3000);
    app.listen(port, () => {
      console.log(`Migajeros y Calculados en http://localhost:${port}  (base de datos: ${db.kind})`);
    });
  })().catch(err => {
    console.error('No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  });
}

module.exports = { createApp };
