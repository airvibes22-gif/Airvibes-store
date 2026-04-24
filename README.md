# AirVibes Real App

Base real para **AirVibes Studio + Store** con:

- catálogo público persistido en base de datos
- autenticación admin real desde backend
- cookie HttpOnly + verificación CSRF para rutas sensibles
- subida de imágenes al servidor
- filtros reales de tienda
- links públicos de producto (`/producto/:slug`)
- Studio para crear artes y publicar productos
- carrito y favoritos locales del cliente

## Stack

- **Node.js + Express**
- **Prisma ORM**
- **SQLite** para desarrollo local
- compatible con migración a **PostgreSQL** en producción
- frontend en **HTML/CSS/JS** servido por el mismo backend

## 1. Instalar

```bash
cp .env.example .env
npm install
npx prisma generate
npx prisma migrate dev --name init
npm run seed:admin
npm run dev
```

Abre:

```bash
http://localhost:3000
```

## 2. Variables importantes

Edita tu `.env`:

```env
PORT=3000
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET="pon-aqui-un-secreto-largo-y-unico"
ADMIN_EMAIL="admin@airvibes.local"
ADMIN_PASSWORD="ChangeThisNow123!"
COOKIE_SECURE=false
```

## 3. Flujo

1. Entra como admin.
2. Crea el producto desde Studio.
3. Sube entre 1 y 3 imágenes.
4. Guarda en Store.
5. El producto queda disponible públicamente.
6. Comparte el link público del viewer.

## 4. Seguridad incluida

- contraseña admin **no** vive en el frontend
- cookies con `HttpOnly`, `SameSite=Strict` y `Secure` en producción
- validación de payloads con Zod
- rate limit para login
- Helmet para headers de seguridad
- CSP básica
- sin `innerHTML` con datos del usuario en la UI principal

## 5. Para pasar a producción

### HTTPS

Sirve la app detrás de HTTPS y usa:

```env
NODE_ENV=production
COOKIE_SECURE=true
```

### Base de datos real

Para producción, cambia Prisma a PostgreSQL:

1. En `prisma/schema.prisma` cambia:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

2. En `.env` configura tu cadena de conexión PostgreSQL.
3. Corre migraciones.

### Imágenes

Esta base usa carpeta local `uploads/` para que funcione ya.

Para escalar, cambia esa estrategia por:

- AWS S3
- Cloudflare R2
- Cloudinary

El punto natural para hacer ese cambio es `src/routes/uploads.js`.

## 6. Rutas clave

### Públicas

- `GET /api/products`
- `GET /api/products/slug/:slug`
- `POST /api/products/slug/:slug/view`
- `GET /producto/:slug`

### Admin

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/uploads/images`
- `POST /api/products`
- `PUT /api/products/:id`
- `DELETE /api/products/:id`

## 7. Lo que ya corrige frente al HTML original

- elimina la contraseña expuesta en el cliente
- elimina el catálogo en `localStorage`
- hace que los links públicos funcionen de verdad
- corrige el formato de dinero negativo
- corrige la codificación de enlaces de WhatsApp
- separa filtros por categoría y vista rápida
- evita inflar vistas al marcar favoritos
- permite editar y eliminar productos desde admin

## 8. Siguiente nivel recomendado

Si quieres llevarlo a una versión comercial más fuerte todavía, el siguiente paso sería:

- usuarios clientes reales
- inventario por talla
- órdenes y reservas en DB
- dashboard admin con métricas
- almacenamiento externo para imágenes
- deploy con Docker + PostgreSQL administrado
- auditoría de acciones admin
- recuperación segura de contraseña

