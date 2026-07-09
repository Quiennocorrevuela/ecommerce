# Despliegue — Quien no corre, vuela

Stack: **Cloudflare Worker** (con *static assets*) + **D1** (base de datos) + **Stripe** (pagos).
Un solo Worker sirve la web (`public/`) y la API (`/api/*`). Todo gratis bajo una cuenta de Cloudflare.

**En vivo:** https://quiennocorrevuela.com (cuenta de Cloudflare de la clienta).

## Cómo está montado
```
public/        ← la web (HTML, CSS, JS, imágenes, data/*.json). Cloudflare la sirve directa.
src/index.js   ← el Worker. Solo atiende /api/* (Hono). El resto lo sirven los assets.
wrangler.toml  ← config: main, [assets] directory=public, binding D1 (DB → shop).
```

## Redesplegar (cada cambio)
```bash
npm install        # solo la primera vez
npm run deploy     # = npx wrangler deploy  → publica el Worker
```
También: `npm run preview` (maqueta en local, http://localhost:8123) o `npm run dev` (Worker local).

### Auto-deploy desde GitHub (ya conectado)
El Worker está conectado por **Workers Builds** al repo `Quiennocorrevuela/ecommerce` (rama `main`):
cada `git push` despliega solo, sin tocar la CLI. El repo local hace *push doble* → sube a la vez a
`Quiennocorrevuela/ecommerce` (dispara el deploy) y a `meowrhino/quien-no-corre-vuela` (espejo).

## Base de datos (D1)
Ya creada (`shop`) y con tablas aplicadas. Si alguna vez hay que recrearlas:
```bash
npm run db:init          # remoto (producción)
npm run db:init:local    # local (desarrollo)
```
**Migración 2026-07-07** (bases creadas antes de esa fecha): añade `zona`, `envio` y `estado` a `pedidos`:
```bash
npm run db:migrate       # remoto (una sola vez; falla con "duplicate column" si ya está aplicada)
npm run db:migrate:local # local
```

**Backup:** la D1 tiene *Time Travel* (restaura hasta 30 días atrás) y los pedidos/pagos también
están en Stripe. Para un backup manual puntual: `npx wrangler d1 export shop --remote --output=backup.sql`.
Guarda solo lo mutable: `stock`, `pedidos`, `newsletter`, `mensajes`. El catálogo NO está en la BD
(vive en `public/data/*.json`).

## 🔐 Secretos (los metes tú; no van al repo)
```bash
npx wrangler secret put STRIPE_SECRET_KEY      # sk_test_… o sk_live_… (necesario para el pago)
npx wrangler secret put STRIPE_WEBHOOK_SECRET   # whsec_… (del webhook de Stripe)
npx wrangler secret put ADMIN_TOKEN             # string largo inventado → para entrar en /admin/
```
Sin secretos: la web y el catálogo funcionan, newsletter y contacto guardan en D1. Con ellos:
también el pago (Stripe) y el panel `/admin/`.

### Webhook de Stripe
Stripe → Developers → Webhooks → Add endpoint:
`https://TU-DOMINIO/api/stripe-webhook`, evento `checkout.session.completed`. Copia el signing
secret a `STRIPE_WEBHOOK_SECRET`.

### Todo esto se gestiona desde el dashboard de Stripe (sin tocar código)
- **Métodos de pago** (Settings → Payment methods): tarjeta + Apple/Google Pay vienen de serie;
  activa **Bizum**, PayPal, etc. y aparecen solos en el checkout.
- **Cupones** (Products → Coupons → Promotion codes): crea códigos (%, fijo, caducidad, límite de
  usos); el checkout ya muestra el campo "¿tienes un código?".
- **Recibos por email** (Settings → Emails): activa "Successful payments" para que el comprador
  reciba recibo automático (solo en modo live).

## Dominio propio
Dashboard → el Worker → **Settings → Domains & Routes → Add → Custom domain**. Si el DNS está en
Cloudflare, HTTPS automático en 1–2 min. (No hace falta tocar `FRONTEND_URL`: el Worker usa el
origen de cada petición.)

## Admin
`https://TU-DOMINIO/admin/` → guarda el `ADMIN_TOKEN` → pedidos, stock, newsletter y mensajes.
