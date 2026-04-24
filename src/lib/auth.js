const crypto = require('crypto');
const jwt = require('jsonwebtoken');

const AUTH_COOKIE = 'airvibes_admin';
const CSRF_COOKIE = 'airvibes_csrf';
const TOKEN_TTL = '12h';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET es obligatorio en producción.');
  }
  return 'dev-airvibes-insecure-secret-change-me';
}

function createCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

function signAdminToken(user, csrfToken) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      csrf: csrfToken
    },
    getJwtSecret(),
    { expiresIn: TOKEN_TTL }
  );
}

function verifyToken(token) {
  return jwt.verify(token, getJwtSecret());
}

function getCookieBaseOptions() {
  const secure = String(process.env.COOKIE_SECURE || '').toLowerCase() === 'true' || process.env.NODE_ENV === 'production';
  return {
    sameSite: 'strict',
    secure,
    path: '/'
  };
}

function setAuthCookies(res, token, csrfToken) {
  const base = getCookieBaseOptions();
  const maxAge = 12 * 60 * 60 * 1000;

  res.cookie(AUTH_COOKIE, token, {
    ...base,
    httpOnly: true,
    maxAge
  });

  res.cookie(CSRF_COOKIE, csrfToken, {
    ...base,
    httpOnly: false,
    maxAge
  });
}

function clearAuthCookies(res) {
  const base = getCookieBaseOptions();
  res.clearCookie(AUTH_COOKIE, base);
  res.clearCookie(CSRF_COOKIE, base);
}

module.exports = {
  AUTH_COOKIE,
  CSRF_COOKIE,
  createCsrfToken,
  signAdminToken,
  verifyToken,
  setAuthCookies,
  clearAuthCookies
};
