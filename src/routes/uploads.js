const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const sharp = require('sharp'); // <--- La librería mágica
const { requireAdmin, requireCsrf } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

// Cambiamos diskStorage por memoryStorage para procesar la imagen antes de guardarla
const storage = multer.memoryStorage(); 

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // Subimos el límite a 15MB para que acepte tus fotos pesadas
    files: 5
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes.'));
    }
    return cb(null, true);
  }
});

router.post('/images', requireAdmin, requireCsrf, upload.array('images', 5), async (req, res) => {
  try {
    const files = await Promise.all((req.files || []).map(async (file) => {
      const fileName = `${Date.now()}-${crypto.randomUUID()}.webp`; // Siempre guardamos como .webp
      const filePath = path.join(uploadDir, fileName);

      // --- AQUÍ OCURRE LA MAGIA ---
      await sharp(file.buffer)
        .resize(1080, 1080, { // Forzamos tamaño cuadrado para que no se vea fea
          fit: 'cover',
          position: 'center'
        })
        .webp({ quality: 80 }) // Bajamos peso sin perder calidad visual
        .toFile(filePath);

      const stats = fs.statSync(filePath);

      return {
        url: `/uploads/${fileName}`,
        name: file.originalname,
        size: stats.size, // El nuevo tamaño en KB
        mimeType: 'image/webp'
      };
    }));

    return res.json({ ok: true, files });
  } catch (error) {
    console.error('Error al procesar imagen:', error);
    return res.status(500).json({ ok: false, error: 'Error al optimizar la imagen.' });
  }
});

module.exports = router;
