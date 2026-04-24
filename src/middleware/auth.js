const { AUTH_COOKIE, CSRF_COOKIE, verifyToken } = require('../lib/auth');

function readAuth(req) {
  const token = req.cookies?.[AUTH_COOKIE];
  if (!token) return null;

  try {
    return verifyToken(token);
  } catch {
    return null;
  }
}

function attachUser(req, _res, next) {
  req.user = readAuth(req);
  next();
}

function requireAdmin(req, res, next) {
  const user = readAuth(req);

  if (!user || user.role !== 'admin') {
    return res.status(401).json({ error: 'No autorizado.' });
  }

  req.user = user;
  return next();
}

function requireCsrf(req, res, next) {
  const user = req.user || readAuth(req);
  const csrfHeader = req.get('x-csrf-token');
  const csrfCookie = req.cookies?.[CSRF_COOKIE];

  if (!user || !csrfHeader || !csrfCookie) {
    return res.status(403).json({ error: 'CSRF inválido.' });
  }

  if (user.csrf !== csrfHeader || csrfCookie !== csrfHeader) {
    return res.status(403).json({ error: 'CSRF inválido.' });
  }

  return next();
}

module.exports = {
  attachUser,
  requireAdmin,
  requireCsrf,
  readAuth
};
