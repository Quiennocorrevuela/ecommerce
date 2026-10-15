# Quien no corre, vuela

Tienda online de la editorial de fanzines **Quien no corre, vuela**:
https://quiennocorrevuela.com

Cómo editarla, explicado para Andrea: **[GUIA.md](GUIA.md)**. Esto de aquí es
para quien toque el código.

Un **Cloudflare Worker** sirve la web (`dist/`, la escribe el build) y la API
(`/api/*`) · catálogo en carpetas · **D1** solo para lo que cambia solo (stock,
pedidos, newsletter, mensajes) · **Stripe** para el pago. Trilingüe, una
dirección por idioma: `/`, `/ca/`, `/en/`. Hecha con la receta de
[JAMstack](https://github.com/meowrhino/JAMstack) y el núcleo de tienda de
[semillaEcommerce](https://github.com/meowrhino/semillaEcommerce).

## Estructura

```
products/<id>/       un fanzine: product.json + img/1.webp…   ← lo edita Andrea
authors/<id>/        una autora: author.json + img/1.webp       ← lo edita Andrea
data/                site.json (las listas), about.json, events.json (+ events/<id>.webp),
                     shipping.json                              ← lo edita Andrea
pages/               las páginas fijas (legal, contacto, newsletter, checkout,
                     gracias, sorry): su <main>, el build les pone el resto
build/paginas.mjs    las plantillas: datos → HTML (el mismo marcado que pintaba antes el JS)
build/build.mjs      lee y revisa todo lo de arriba y escribe dist/
public/              lo que se copia tal cual a dist/: css, js, fuentes, logos, admin/, _headers
src/index.js         el Worker: /api/* (Hono) y las direcciones de antes → las nuevas
src/notify.js        avisos por email (apagados mientras EMAIL_TIENDA esté vacío)
schema.sql           las tablas de D1          migrations/   cambios de tablas
tools/test-stock.mjs prueba del stock, el registro, el webhook y la sobreventa
wrangler.toml        [build] lanza el build; [assets] sirve dist/; D1 (DB → shop)
```

`dist/` no se commitea: lo escribe `wrangler deploy` (y `wrangler dev`) antes de
publicar, por el `[build]` de `wrangler.toml`. Si un JSON está mal, el build
para con un mensaje en castellano y no se publica nada.

### Lo que hace el JS en el navegador

Las páginas llegan con el contenido dentro (se leen sin JS). El JS solo pone lo
vivo: el **stock** (`/api/stock`: las tarjetas y el botón pasan a "agotado"), el
**carrito** (localStorage; al abrir el checkout se revisa contra el catálogo y el
stock), la **galería** del fanzine y el **calendario** centrado en hoy.

### La tienda

- **El precio nunca se fía del navegador**: el Worker importa el catálogo que
  escribe el build (`dist/data/products.json`) y lo vuelve a mirar al pagar.
- **El stock no va en el JSON**: se pone en `/admin/stock` (suma `+30`, `-1`) y
  cada cambio queda en `stock_mov`, también las ventas, que el webhook apunta en
  el mismo batch que el pedido. La tabla se crea sola si falta.
- **Webhook**: devuelve 200 si el evento ya estaba registrado (UNIQUE de
  `stripe_session_id`) y **500 ante cualquier otro error**, para que Stripe lo
  reintente: si no, un pedido pagado con D1 caída se perdería.
- **Sobreventa**: si al llegar el pago ya no quedaban unidades, el pedido nace
  como `revisar` (sale así en `/admin/tickets.html`).
- **Carrito largo**: la metadata de Stripe tiene un tope de 500 caracteres; a
  partir de unos diez fanzines distintos el pago se corta con un mensaje claro.
- **Direcciones viejas**: `producto.html?id=x` y `producto?id=x` → `/producto/x/`
  (igual con `autor`), y `about.html` → `/about/`, con un 301 (`src/index.js`).

## Desarrollo

```bash
npm install
npm run build       # escribe dist/ (y revisa los JSON)
npm run preview     # dist/ en http://localhost:8123, sin API (sin stock ni pago)
npm run dev         # el Worker entero (D1 local + Stripe con .dev.vars)
npm run deploy      # publicar a mano (normalmente no hace falta: push = publicado)
```

Prueba del stock y del webhook, con el Worker en local y una D1 aparte:

```bash
npx wrangler dev --port 8790 --persist-to .wrangler/prueba \
  --var ADMIN_TOKEN:tok-pruebas --var STRIPE_WEBHOOK_SECRET:whsec_pruebas \
  --var STRIPE_SECRET_KEY:sk_test_pruebas
node tools/test-stock.mjs
```

## Publicar

El Worker está conectado por **Workers Builds** a `Quiennocorrevuela/ecommerce`
(rama `main`, cuenta de Cloudflare de la clienta): **cada push publica**. El
repo local hace *push doble*: `git push ecommerce main` sube a la vez a
`Quiennocorrevuela/ecommerce` (publica) y a `meowrhino/quien-no-corre-vuela`
(nuestra copia).

### Secretos (no van al repo)

```bash
npx wrangler secret put STRIPE_SECRET_KEY      # sk_test_… o sk_live_…
npx wrangler secret put STRIPE_WEBHOOK_SECRET  # whsec_… del webhook
npx wrangler secret put ADMIN_TOKEN            # la clave de /admin/
```

Webhook de Stripe: Developers → Webhooks → endpoint
`https://quiennocorrevuela.com/api/stripe-webhook`, evento
`checkout.session.completed`. Métodos de pago (Bizum, PayPal…), cupones y
recibos se activan en el dashboard de Stripe, sin tocar código.

### Base de datos (D1 `shop`)

```bash
npm run db:init            # crear las tablas (remoto). db:init:local en local
```

Copia: D1 tiene *Time Travel* (30 días) y los pagos están en Stripe. Copia a mano:
`npx wrangler d1 export shop --remote --output=backup.sql`. Si alguna vez hay que
mover la tienda de cuenta: D1 no se transfiere, se exporta y se importa en la
nueva (`d1 create shop`, nuevo `database_id` en `wrangler.toml`, `d1 execute
--file`), y los tres secretos se vuelven a poner uno a uno.

### Avisos por email

`src/notify.js` manda cuatro: pedido nuevo y mensaje de contacto a la tienda,
confirmación y "pedido enviado" al cliente. **Están apagados** (`EMAIL_TIENDA`
vacío en `wrangler.toml`). Para encenderlos:
`npx wrangler email sending enable quiennocorrevuela.com` (añade SPF y DKIM: si
ya hay un SPF, fusionarlos), verificar el destino con
`npx wrangler email routing addresses create <email>`, rellenar `EMAIL_TIENDA` y
`EMAIL_RESPUESTA` y descomentar `[[send_email]]`. Los avisos al cliente necesitan
Workers Paid o `RESEND_API_KEY`; sin eso fallan solos y se loguean.

### Newsletter

`/newsletter` recoge emails en D1 (sin duplicados) y se ven en
`/admin/newsletter.html`. No manda boletines: se exporta la lista y se usa otra
herramienta. Sin doble opt-in: tenerlo en cuenta en la política de privacidad.

## Pendiente

Para abrir la tienda (nada de esto es programar):

- [ ] Stripe a nombre de Andrea, con su IBAN; claves live y webhook desde su dashboard.
- [ ] Comprobar que el webhook apunta a `https://quiennocorrevuela.com/api/stripe-webhook`
      (estuvo apuntando a un Worker de pruebas que ya no existe: sin esto, los pedidos no
      se registran ni baja el stock).
- [ ] `pages/legal.html`: rellenar los `[CORCHETES]` (nombre fiscal, NIF, dirección).
- [ ] Precios, pesos y tarifas de envío reales.
- [ ] Encender los avisos por email (arriba).
- [ ] Compra de prueba en modo test y, con Andrea delante, una real pequeña que se reembolsa.
- [ ] Quitar a manu de los miembros de Cloudflare y de Stripe; 2FA en la cuenta de Andrea.
- [ ] La fila `gatito` (98 unidades) que quedó en la tabla `stock` de pruebas: no sale en
      ningún sitio, pero se puede borrar con `npx wrangler d1 execute shop --remote
      --command "DELETE FROM stock WHERE producto_id='gatito'"`.

Código (de `semillaEcommerce/TODO.md`, también pendiente allí):

- [ ] Turnstile en `/api/newsletter` y `/api/contacto`, **solo si llega basura**: ya tienen una
      trampa invisible (un campo `web` que una persona deja vacío) que para a los bots tontos · 2 h
- [ ] Reponer stock al devolver: escuchar `charge.refunded` y apuntarlo en el registro · 3 h
- [ ] El carrito en D1 en vez de en la metadata de Stripe (quita el tope de ~10 líneas) · 4 h
