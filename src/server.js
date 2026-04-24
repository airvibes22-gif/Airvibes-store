require('dotenv').config();
const fs = require('fs');
const path = require('path');
const express = require('express');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const { prisma } = require('./lib/prisma');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const uploadRoutes = require('./routes/uploads');

const app = express();
app.set('trust proxy', 1);
const port = Number(process.env.PORT || 3000);
const publicDir = path.join(process.cwd(), 'public');
const uploadDir = path.join(process.cwd(), 'uploads');

fs.mkdirSync(uploadDir, { recursive: true });

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

app.disable('x-powered-by');

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://cdnjs.cloudflare.com'],
        styleSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'blob:'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
      }
    },
    crossOriginEmbedderPolicy: false
  })
);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use('/uploads', express.static(uploadDir));
app.use(express.static(publicDir, { extensions: ['html'] }));

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'airvibes-api' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/uploads', uploadRoutes);

app.get('/producto/:slug', (_req, res) => {
  res.sendFile(path.join(publicDir, 'index.html'));
});

app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Ruta no encontrada.' });
  }
  return next();
});

app.use((error, _req, res, _next) => {
  console.error(error);

  if (error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(400).json({ error: 'La imagen excede el tamaño permitido (5 MB).' });
  }

  if (error?.message === 'Solo se permiten imágenes.') {
    return res.status(400).json({ error: error.message });
  }

  return res.status(500).json({ error: 'Ocurrió un error inesperado.' });
});

async function start() {
  await prisma.$connect();
  app.listen(port, () => {
    console.log(`AirVibes listo en http://localhost:${port}`);
  });
}

start().catch(async (error) => {
  console.error('No se pudo iniciar el servidor', error);
  await prisma.$disconnect();
  process.exit(1);
});
