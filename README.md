# Blush — E-commerce

Plataforma de e-commerce de belleza full-stack con tienda pública, panel de administración y backend REST independiente.

---

## Arquitectura

El proyecto está compuesto por **3 servicios** que corren en paralelo:

| Servicio | Tecnología | Puerto | Descripción |
|---|---|---|---|
| **Tienda** | Next.js 16 | `3000` | Vitrina pública para clientes |
| **Admin** | Next.js 16 | `3001` | Panel de gestión interno |
| **Backend** | Express + Prisma | `4000` | API REST + acceso a PostgreSQL |

```
Cliente
  └─ Tienda (3000)
       └─ /api/* → proxy → Backend (4000) → PostgreSQL
                                ↑
Admin (3001) → /api/admin/* ───┘
```

La tienda cachea todas las páginas durante **24 horas** con ISR. Cada cambio guardado desde el admin invalida automáticamente el cache correspondiente.

---

## Requisitos

- Node.js 18+
- PostgreSQL 14+

---

## Variables de entorno

### `/.env` (Tienda)
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/blush"
BACKEND_URL="http://localhost:4000"
REVALIDATE_SECRET="tu-clave-secreta"
STORE_URL="http://localhost:3000"
```

### `/admin-panel/.env` (Admin)
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/blush"
BACKEND_URL="http://localhost:4000"
REVALIDATE_SECRET="tu-clave-secreta"
STORE_URL="http://localhost:3000"
```

### `/backend/.env` (Backend)
```env
DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/blush"
PORT=4000
```

---

## Instalación

```bash
# Tienda
npm install

# Admin
cd admin-panel && npm install

# Backend
cd backend && npm install
```

---

## Base de datos

```bash
# Crear tablas
npx prisma migrate dev --name init

# Poblar con datos iniciales (desde /data/*.json)
npx tsx prisma/seed.ts
```

---

## Desarrollo

Abrir **3 terminales**:

```bash
# Terminal 1 — Backend (puerto 4000)
cd backend
npm run dev

# Terminal 2 — Tienda (puerto 3000)
npm run dev

# Terminal 3 — Admin (puerto 3001)
cd admin-panel
npm run dev
```

---

## Estructura del proyecto

```
blush-ecomerce/
├── app/                        # Tienda Next.js
│   ├── (store)/                # Rutas públicas
│   │   ├── page.tsx            # Inicio
│   │   ├── products/           # Catálogo y detalle de producto
│   │   ├── collections/        # Colecciones
│   │   ├── cart/               # Carrito
│   │   ├── checkout/           # Checkout
│   │   ├── novedades/          # Novedades
│   │   ├── mas-vendidos/       # Más vendidos
│   │   ├── tutorials/          # Tutoriales
│   │   ├── p/[slug]/           # Páginas CMS dinámicas
│   │   └── policies/[slug]/    # Políticas
│   └── api/
│       ├── orders/             # Proxy → backend
│       ├── settings/           # Proxy → backend
│       └── revalidate/         # Invalidar cache ISR
│
├── admin-panel/                # Panel de administración Next.js
│   └── app/admin/
│       ├── page.tsx            # Dashboard
│       ├── products/           # CRUD productos
│       ├── orders/             # Gestión de pedidos
│       ├── pages/              # CMS páginas
│       ├── home/               # Editor inicio
│       ├── novedades/          # Editor novedades
│       ├── mas-vendidos/       # Editor más vendidos
│       ├── collections/        # Editor colecciones
│       ├── tutorials/          # Editor tutoriales
│       ├── shipping/           # Métodos de envío
│       ├── payments/           # Métodos de pago
│       ├── policies/           # Políticas
│       └── analytics/          # Analíticas
│
├── backend/                    # Servidor Express
│   └── src/
│       ├── index.ts            # Punto de entrada
│       └── routes/
│           ├── products.ts     # CRUD productos (con control de stock)
│           ├── orders.ts       # CRUD pedidos
│           ├── settings.ts     # Configuración global
│           ├── pages.ts        # CRUD páginas CMS
│           └── tutorials.ts    # Tutoriales
│
├── components/store/           # Componentes de la tienda
├── context/CartContext.tsx     # Estado del carrito (localStorage)
├── lib/
│   ├── db.ts                   # Cliente Prisma singleton
│   ├── data.ts                 # Fetchers hacia backend (ISR tags)
│   ├── types.ts                # Tipos TypeScript compartidos
│   └── generated/prisma/       # Cliente Prisma generado
│
├── prisma/
│   ├── schema.prisma           # Modelos de base de datos
│   ├── seed.ts                 # Seed desde /data/*.json
│   └── migrations/             # Historial de migraciones
│
├── data/                       # JSON de referencia para seed inicial
└── public/uploads/             # Imágenes subidas desde el admin
```

---

## Modelos de base de datos

| Modelo | Descripción |
|---|---|
| `Product` | Productos con stock, precio, galería, reseñas |
| `Order` + `OrderItem` | Pedidos con líneas de detalle |
| `Settings` | Configuración global (fila única) |
| `Page` | Páginas CMS con bloques de contenido |
| `Tutorials` | Videos y FAQ (fila única) |
| `NewsletterSubscriber` | Suscriptores |

---

## Cache e invalidación

La tienda usa ISR con tags. El admin invalida automáticamente el cache tras cada cambio:

| Tag | Se invalida cuando... |
|---|---|
| `products` | Se crea, edita o elimina un producto |
| `settings` | Se guarda cualquier configuración |
| `pages` | Se crea, edita o elimina una página CMS |
| `tutorials` | Se actualiza el contenido de tutoriales |

---

## Imágenes

Las imágenes se suben desde el admin y se almacenan en `public/uploads/`. Next.js las sirve optimizadas en **AVIF/WebP** con `sharp`, cacheadas 24 horas.
