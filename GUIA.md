# Cómo actualizar la tienda

Hola, Andrea. Esta guía es para que puedas cambiar la tienda tú misma: añadir un
fanzine, una autora o una feria, cambiar textos, fotos o precios… Todo se hace
desde el navegador, en GitHub, sin instalar nada.

> **La regla de oro**: solo tocas **`public/data/`** (los textos y datos) y
> **`public/img/`** (las fotos). Lo demás es el código: mejor no tocarlo.

Cuando guardas un cambio, la web se actualiza sola en **1 o 2 minutos**.

Lo que **no** está en estos archivos, sino en el panel `/admin/` (con tu clave):
los pedidos, el **stock** de cada fanzine, la newsletter y los mensajes.

---

## 0. Antes de empezar

Tu copia de la tienda está en **https://github.com/Quiennocorrevuela/ecommerce**.
Ahí es donde haces los cambios.

Para preparar las fotos, **imgToWeb**: https://meowrhino.github.io/imgToWeb/
(las pasa a `.webp`, del tamaño justo, y las numera `1.webp`, `2.webp`…).
**Ábrelo en Chrome o Firefox**, no en Safari: Safari no sabe hacer `.webp`.

---

## 1. Cómo está organizado

```
public/data/
  productos.json     ← los fanzines: título, autora, precio, fotos, ficha, texto
  autores.json       ← las autoras: nombre, retrato, bio
  eventos.json       ← el calendario: ferias y presentaciones
  envios.json        ← las tarifas de envío
public/img/
  productos/<fanzine>/   1.webp, 2.webp…  (la 1 es la portada)
  autores/               un retrato por autora
  eventos/               un cartel por evento
```

Cada cosa tiene un **`id`**: su nombre en la web, en minúsculas, sin tildes ni
espacios, con guiones (`la-mort-i-la-primavera`). Es su dirección
(`/producto?id=la-mort-i-la-primavera`) y el nombre de su carpeta de fotos.
**Una vez publicado, no lo cambies**: los pedidos y el stock van por el `id`.

Los textos van en los tres idiomas: `es`, `ca`, `en`. Si uno se queda vacío
(`""`), sale el castellano. Para separar párrafos, `\n\n` dentro del texto.

---

## 2. Cómo se edita un archivo en GitHub

1. Entra en el archivo (por ejemplo `public/data/autores.json`).
2. Pulsa el **lápiz** ✏️ (arriba a la derecha).
3. Cambia lo que quieras.
4. Pulsa **Commit changes…** (botón verde), escribe en una línea qué has
   cambiado ("bio de Sofia") y otra vez **Commit changes**.

**Para subir fotos**: entra en la carpeta (`public/img/productos/<fanzine>/`),
**Add file → Upload files**, arrastra las fotos y **Commit changes**. Para un
fanzine nuevo, prepara en tu ordenador una carpeta con su `id` como nombre y
las fotos dentro, entra en `public/img/productos/` y arrastra la carpeta entera.

---

## 3. Añadir un fanzine

1. Pasa las fotos por imgToWeb y súbelas a `public/img/productos/<id>/`.
2. En `productos.json`, **copia el bloque entero** de un fanzine parecido (desde
   su `{` hasta su `},`), pégalo debajo y cambia los datos.
3. Mientras no esté listo para vender, déjalo con `"activo": false`: sale como
   **próximamente** en la página de su autora, pero no en la tienda ni se puede
   comprar.

| campo | qué es | ejemplo |
|---|---|---|
| `id` | su nombre en la web (ver arriba) | `"no-time-left-for-the-square"` |
| `titulo` | el título; cada elemento, una línea | `["No time left", "for the square"]` |
| `autor` | el nombre de la autora, tal cual se ve | `"Andrea Carilla"` |
| `autorId` | el `id` de la autora en `autores.json` | `"andrea-carilla"` |
| `precio` | en euros, con punto | `14.00` |
| `peso` | en gramos, para calcular el envío | `60` |
| `imgs` | las fotos, en orden; la primera es la portada y la que sale al compartir | `["img/productos/<id>/1.webp", …]` |
| `ficha` | la tabla de datos (editorial, encuadernación, páginas, medidas, año, edición) | ver un fanzine existente |
| `descripcion` | el texto, en `es`, `ca`, `en` | |
| `stockInicial` | cuántos hay **al publicarlo** (la tirada) | `30` |
| `activo` | `true` a la venta · `false` próximamente | `true` |
| `agotado` | opcional: `true` lo marca agotado aunque quede stock | `true` |

> **El stock**: `stockInicial` solo cuenta **la primera vez** que el fanzine
> sale en la web. Después, el stock baja solo con cada venta y se cambia en
> `/admin/` → **stock**, no en el JSON.

## 4. Añadir o cambiar una autora

En `autores.json`, copia un bloque y cambia los datos:

| campo | qué es | ejemplo |
|---|---|---|
| `id` | su nombre en la web | `"mia-sala-patau"` |
| `nombre` | como se ve | `"Mia Sala-Patau"` |
| `foto` | su retrato en `public/img/autores/`; vacío (`""`) = sale la portada de su primer fanzine | `"img/autores/mia-sala-patau.webp"` |
| `bio` | la biografía en `es`, `ca`, `en`; vacía = solo sale su nombre y sus fanzines | |

Sus fanzines salen solos en su página: los que tienen su `id` en `autorId`.

## 5. Añadir una feria o un evento

En `eventos.json`, copia un bloque. El cartel va en `public/img/eventos/`.

| campo | qué es | ejemplo |
|---|---|---|
| `id` | su nombre | `"fiebre-2026"` |
| `titulo` | el nombre del evento | `"Fiebre"` |
| `lugar` | dónde | `"La Casa Encendida, Madrid"` |
| `tipo` | qué es, en `es`, `ca`, `en` | `{ "es": "feria de fotolibros", … }` |
| `fechaInicio`, `fechaFin` | año-mes-día; si es un solo día, la misma fecha | `"2026-09-18"` |
| `cartel` | la imagen | `"img/eventos/fiebre-2026.webp"` |

---

## 6. Si algo va mal

**Casi siempre es una coma.** Entre dos bloques `{ … }` va una coma, y después
del último, no. Entre dos campos, coma; después del último campo de un bloque,
no. Y los textos, siempre entre comillas `"…"`.

- Si cambias `productos.json`, `autores.json` o `envios.json` con un error, **la
  web no se rompe**: no se publica y se queda como estaba. Si al cabo de unos
  minutos tu cambio no sale, es eso.
- Si es `eventos.json`, el calendario sale vacío hasta que lo arregles.

Para encontrar el error: copia el archivo entero en https://jsonlint.com y
pulsa **Validate JSON**: te dice la línea. O vuelve atrás: en GitHub, el
archivo → **History** → tu último cambio, y compáralo con el anterior.

Si no lo encuentras, escríbenos y lo miramos.
