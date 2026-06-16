# Despliegue — Quien no corre, vuela

Stack: **Cloudflare Worker** (con *static assets*) + **D1** (base de datos) + **Stripe** (pagos).
Un solo Worker sirve la web (`public/`) y la API (`/api/*`). Todo gratis bajo una cuenta de Cloudflare.

**Ya está desplegado:** https://quien-no-corre-vuela.manuellatourf.workers.dev

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

### Opción: auto-deploy desde GitHub (como tus otros proyectos)
Dashboard → el Worker `quien-no-corre-vuela` → **Settings → Builds → Connect** → repo
`meowrhino/quien-no-corre-vuela`, rama `main`. A partir de ahí, cada `git push` despliega solo.

## Base de datos (D1)
Ya creada (`shop`) y con tablas aplicadas. Si alguna vez hay que recrearlas:
```bash
npm run db:init          # remoto (producción)
npm run db:init:local    # local (desarrollo)
```
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

## Dominio propio
Dashboard → el Worker → **Settings → Domains & Routes → Add → Custom domain**. Si el DNS está en
Cloudflare, HTTPS automático en 1–2 min. (No hace falta tocar `FRONTEND_URL`: el Worker usa el
origen de cada petición.)

## Admin
`https://TU-DOMINIO/admin/` → guarda el `ADMIN_TOKEN` → pedidos, stock, newsletter y mensajes.
