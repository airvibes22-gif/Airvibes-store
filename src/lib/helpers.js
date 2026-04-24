const fs = require('fs');
const path = require('path');

const CATEGORIES = ['select', 'lab', 'essentials'];
const STATUSES = ['available', 'last_unit', 'reserved', 'sold'];

function slugify(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'producto';
}

async function uniqueSlug(prisma, name, currentId) {
  const base = slugify(name);
  let candidate = base;
  let counter = 2;

  while (true) {
    const found = await prisma.product.findUnique({ where: { slug: candidate } });
    if (!found || found.id === currentId) return candidate;
    candidate = `${base}-${counter}`;
    counter += 1;
  }
}

function parseSizes(value) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  return String(value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function safeJsonParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function productDto(product) {
  const images = (product.images || [])
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((item) => item.url);

  return {
    id: product.id,
    slug: product.slug,
    category: product.category,
    name: product.name,
    price: product.price,
    sizes: safeJsonParse(product.sizesJson || '[]', []),
    status: product.status,
    copy: product.copy,
    coverImage: product.coverImage,
    images: images.length ? images : [product.coverImage].filter(Boolean),
    views: product.views,
    isPublished: product.isPublished,
    createdAt: product.createdAt,
    updatedAt: product.updatedAt
  };
}

function removeLocalUpload(fileUrl, uploadDir) {
  if (!fileUrl || typeof fileUrl !== 'string') return;
  if (!fileUrl.startsWith('/uploads/')) return;

  const filename = path.basename(fileUrl);
  const fullPath = path.join(uploadDir, filename);

  try {
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
    }
  } catch (error) {
    console.warn('No se pudo eliminar el archivo local:', fullPath, error.message);
  }
}

module.exports = {
  CATEGORIES,
  STATUSES,
  slugify,
  uniqueSlug,
  parseSizes,
  productDto,
  removeLocalUpload
};
