const express = require('express');
const { z } = require('zod');
const { prisma } = require('../lib/prisma');
const {
  CATEGORIES,
  STATUSES,
  uniqueSlug,
  parseSizes,
  productDto,
  removeLocalUpload
} = require('../lib/helpers');
const { requireAdmin, requireCsrf } = require('../middleware/auth');
const path = require('path');

const router = express.Router();
const uploadDir = path.join(process.cwd(), 'uploads');

const querySchema = z.object({
  category: z.enum(CATEGORIES).optional(),
  inStock: z
    .union([z.string(), z.boolean()])
    .optional()
    .transform((value) => {
      if (value === undefined) return false;
      if (typeof value === 'boolean') return value;
      return value === '1' || value.toLowerCase() === 'true';
    })
});

const createSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().trim().min(2).max(120),
  price: z.number().int().nonnegative(),
  sizes: z.array(z.string().trim().min(1).max(30)).max(15).default([]),
  status: z.enum(STATUSES),
  copy: z.string().trim().max(500).default(''),
  images: z.array(z.string().trim().min(1)).min(1).max(5),
  isPublished: z.boolean().optional().default(true)
});

const updateSchema = z.object({
  category: z.enum(CATEGORIES),
  name: z.string().trim().min(2).max(120),
  price: z.number().int().nonnegative(),
  sizes: z.array(z.string().trim().min(1).max(30)).max(15).default([]),
  status: z.enum(STATUSES),
  copy: z.string().trim().max(500).default(''),
  images: z.array(z.string().trim().min(1)).min(1).max(5).optional(),
  isPublished: z.boolean().optional().default(true)
});

router.get('/', async (req, res, next) => {
  try {
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Filtros inválidos.' });
    }

    const where = { isPublished: true };

    if (parsed.data.category) {
      where.category = parsed.data.category;
    }

    if (parsed.data.inStock) {
      where.status = { not: 'sold' };
    }

    const items = await prisma.product.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { images: true }
    });

    return res.json({ items: items.map(productDto) });
  } catch (error) {
    return next(error);
  }
});

router.get('/slug/:slug', async (req, res, next) => {
  try {
    const item = await prisma.product.findFirst({
      where: {
        slug: req.params.slug,
        isPublished: true
      },
      include: { images: true }
    });

    if (!item) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    return res.json({ item: productDto(item) });
  } catch (error) {
    return next(error);
  }
});

router.post('/slug/:slug/view', async (req, res, next) => {
  try {
    const item = await prisma.product.findFirst({
      where: {
        slug: req.params.slug,
        isPublished: true
      }
    });

    if (!item) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const updated = await prisma.product.update({
      where: { id: item.id },
      data: { views: { increment: 1 } }
    });

    return res.json({ ok: true, views: updated.views });
  } catch (error) {
    return next(error);
  }
});

router.post('/', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de producto inválidos.', details: parsed.error.flatten() });
    }

    const slug = await uniqueSlug(prisma, parsed.data.name);
    const images = parsed.data.images;

    const item = await prisma.product.create({
      data: {
        slug,
        category: parsed.data.category,
        name: parsed.data.name,
        price: parsed.data.price,
        sizesJson: JSON.stringify(parseSizes(parsed.data.sizes)),
        status: parsed.data.status,
        copy: parsed.data.copy,
        coverImage: images[0],
        isPublished: parsed.data.isPublished,
        images: {
          create: images.map((url, index) => ({ url, sortOrder: index }))
        }
      },
      include: { images: true }
    });

    return res.status(201).json({ ok: true, item: productDto(item) });
  } catch (error) {
    return next(error);
  }
});

router.put('/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: 'Datos de producto inválidos.', details: parsed.error.flatten() });
    }

    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { images: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    const newImages = parsed.data.images || existing.images.map((image) => image.url);
    const newSlug = await uniqueSlug(prisma, parsed.data.name, existing.id);

    const item = await prisma.product.update({
      where: { id: existing.id },
      data: {
        slug: newSlug,
        category: parsed.data.category,
        name: parsed.data.name,
        price: parsed.data.price,
        sizesJson: JSON.stringify(parseSizes(parsed.data.sizes)),
        status: parsed.data.status,
        copy: parsed.data.copy,
        coverImage: newImages[0],
        isPublished: parsed.data.isPublished,
        images: {
          deleteMany: {},
          create: newImages.map((url, index) => ({ url, sortOrder: index }))
        }
      },
      include: { images: true }
    });

    const oldImages = existing.images.map((image) => image.url);
    const orphaned = oldImages.filter((url) => !newImages.includes(url));
    orphaned.forEach((url) => removeLocalUpload(url, uploadDir));

    return res.json({ ok: true, item: productDto(item) });
  } catch (error) {
    return next(error);
  }
});

router.delete('/:id', requireAdmin, requireCsrf, async (req, res, next) => {
  try {
    const existing = await prisma.product.findUnique({
      where: { id: req.params.id },
      include: { images: true }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Producto no encontrado.' });
    }

    await prisma.product.delete({ where: { id: existing.id } });
    existing.images.forEach((image) => removeLocalUpload(image.url, uploadDir));

    return res.json({ ok: true });
  } catch (error) {
    return next(error);
  }
});

module.exports = router;
