const express = require('express');
const bcrypt = require('bcrypt');
const rateLimit = require('express-rate-limit');
const { z } = require('zod');
const { prisma } = require('../lib/prisma');
const {
  createCsrfToken,
  signAdminToken,
  setAuthCookies,
  clearAuthCookies
} = require('../lib/auth');
const { attachUser, requireAdmin, requireCsrf } = require('../middleware/auth');

const router = express.Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados intentos. Intenta de nuevo más tarde.' }
});

const loginSchema = z.object({
  email: z.string().trim().email().max(120),
  password: z.string().min(8).max(128)
});

router.get('/me', attachUser, (req, res) => {
  if (!req.user) {
    return res.json({ authenticated: false, user: null });
  }

  return res.json({
    authenticated: true,
    user: {
      id: req.user.sub,
      email: req.user.email,
      role: req.user.role
    }
  });
});

router.post('/login', loginLimiter, async (req, res, next) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de acceso inválidos.' });
    }

    const email = parsed.data.email.toLowerCase();
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: 'Credenciales inválidas.' });
    }

    const csrfToken = createCsrfToken();
    const token = signAdminToken(user, csrfToken);
    setAuthCookies(res, token, csrfToken);

    return res.json({
      ok: true,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    return next(error);
  }
});

router.post('/logout', attachUser, requireAdmin, requireCsrf, (req, res) => {
  clearAuthCookies(res);
  return res.json({ ok: true });
});

module.exports = router;
