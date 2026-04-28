const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const express = require('express');
const multer = require('multer');
const { requireAdmin, requireCsrf } = require('../middleware/auth');

const router = express.Router();

const uploadDir = path.join(process.cwd(), 'uploads');
fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${crypto.randomUUID()}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
    files: 5
  },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith('image/')) {
      return cb(new Error('Solo se permiten imágenes.'));
    }
    return cb(null, true);
  }
});

router.post('/images', requireAdmin, requireCsrf, upload.array('images', 5), (req, res) => {
  const files = (req.files || []).map((file) => ({
    url: `/uploads/${file.filename}`,
    name: file.originalname,
    size: file.size,
    mimeType: file.mimetype
  }));

  return res.json({ ok: true, files });
});

module.exports = router;
