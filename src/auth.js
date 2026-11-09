// Sesiones con cookie firmada (HMAC) y contraseñas con scrypt.
// No depende de librerías externas.
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const COOKIE = 'mc_session';
const MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14; // 14 días

function loadSecret() {
  if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
  const file = path.join(__dirname, '..', 'data', '.session-secret');
  try { return fs.readFileSync(file, 'utf8').trim(); } catch {}
  const secret = crypto.randomBytes(32).toString('hex');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, secret);
  return secret;
}
const SECRET = loadSecret();

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('base64url');
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.scryptSync(password, salt, 64);
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  const [alg, saltHex, hashHex] = String(stored).split('$');
  if (alg !== 'scrypt' || !saltHex || !hashHex) return false;
  const hash = crypto.scryptSync(password, Buffer.from(saltHex, 'hex'), 64);
  const expected = Buffer.from(hashHex, 'hex');
  return expected.length === hash.length && crypto.timingSafeEqual(expected, hash);
}

function parseCookies(header = '') {
  const out = {};
  for (const part of header.split(';')) {
    const i = part.indexOf('=');
    if (i > 0) out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
  }
  return out;
}

function setSession(res, memberId, secure) {
  const exp = Date.now() + MAX_AGE_MS;
  const value = `${memberId}.${exp}`;
  res.cookie(COOKIE, `${value}.${sign(value)}`, {
    httpOnly: true, sameSite: 'lax', secure: !!secure, maxAge: MAX_AGE_MS, path: '/'
  });
}

function clearSession(res) {
  res.clearCookie(COOKIE, { path: '/' });
}

function readSession(req) {
  const raw = parseCookies(req.headers.cookie)[COOKIE];
  if (!raw) return null;
  const [id, exp, sig] = raw.split('.');
  if (!id || !exp || !sig) return null;
  const expected = sign(`${id}.${exp}`);
  if (expected.length !== sig.length || !crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig))) return null;
  if (Number(exp) < Date.now()) return null;
  return Number(id);
}

// Middleware: carga el miembro (si hay sesión) en req.member y res.locals.member
function sessionMiddleware(db) {
  return async (req, res, next) => {
    req.member = null;
    const id = readSession(req);
    if (id) {
      try { req.member = await db.findMemberById(id); } catch (e) { return next(e); }
      if (!req.member) clearSession(res);
    }
    res.locals.member = req.member;
    next();
  };
}

module.exports = { hashPassword, verifyPassword, setSession, clearSession, sessionMiddleware };
