# NEXT STEPS — Quien no corre, vuela

El código está completo y desplegado (2026-07-07). Esto es lo que queda para **abrir la
tienda**, en orden. Nada de esto es programar: son claves, contenido y comprobaciones.

## 1. Stripe (con Andrea)
- [ ] Andrea crea la cuenta de Stripe y verifica el IBAN.
- [ ] manu mete la clave: `npx wrangler secret put STRIPE_SECRET_KEY` (primero la `sk_test_…`).
- [ ] Webhook: Stripe → Developers → Webhooks → Add endpoint →
      `https://quien-no-corre-vuela.manuellatourf.workers.dev/api/stripe-webhook`
      (o el dominio propio), evento `checkout.session.completed` →
      `npx wrangler secret put STRIPE_WEBHOOK_SECRET`.
- [ ] `npx wrangler secret put ADMIN_TOKEN` si aún no está (activa `/admin/`).
- [ ] Dashboard de Stripe: activar **Bizum** (Settings → Payment methods) y **recibos**
      (Settings → Emails → Successful payments). Cupones: Products → Coupons → Promotion codes.

## 2. Contenido (cliente)
- [ ] `public/legal.html`: sustituir los `[CORCHETES]` (nombre fiscal, NIF, dirección, email,
      plazo de preparación).
- [ ] Precios reales en `productos.json`: black-cover, i-am-the-center, no-time-left (placeholder).
- [ ] Pesos reales (`peso`, gramos) y tarifas reales en `envios.json` (ahora estimaciones).
- [ ] Bios de autoras (`autores.json` sigue con TODO).

## 3. Prueba y apertura
- [ ] Compra de prueba en modo test con `gatito` (tarjeta `4242 4242 4242 4242`) → el pedido
      sale en `/admin/tickets.html` con dirección, zona y estado.
- [ ] Borrar `gatito` de `productos.json` (+ su imagen) y push.
- [ ] Cambiar a la clave live (`wrangler secret put STRIPE_SECRET_KEY` con `sk_live_…`) y
      recrear el webhook en modo live.
- [ ] Dominio propio: dashboard → Worker → Settings → Domains & Routes.

## 4. Mantenimiento
- [ ] **Backup automático**: añadir el secret `CLOUDFLARE_API_TOKEN` en GitHub → repo →
      Settings → Secrets → Actions (token custom de Cloudflare: My Profile → API Tokens →
      permiso Account → D1 → Edit). Hasta entonces, el workflow del lunes falla (esperado).
      Este backup cubre también a tatara (comparten la base `shop`).
- [ ] Opcional: conectar Workers Builds (dashboard → Worker → Settings → Builds) para que cada
      push despliegue solo. Ver DEPLOY.md.
- [ ] Limpieza acordada: quitar `WEB_MANU/` y `referencias/` del repo.
