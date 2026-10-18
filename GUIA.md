# Cómo actualizar la tienda

Hola, Andrea. Esta guía es para que puedas cambiar la tienda tú misma: añadir un
fanzine, una autora o una feria, cambiar textos, fotos o precios. Todo se hace
con **Visual Studio Code**, un programa gratuito: cambias los archivos en tu
ordenador y, al subirlos, la web se publica sola.

> **La regla de oro**: solo tocas **tres carpetas**: `products/` (los
> fanzines), `authors/` (las autoras) y `data/` (lo demás: nosotras, el
> calendario, los envíos). Lo demás es el código: mejor no tocarlo.
>
> **El stock no va aquí**: va en el panel, `quiennocorrevuela.com/admin/` (punto 6).

Cuando subes un cambio, la web se actualiza sola en **1 o 2 minutos**. Si te
equivocas en algo, la web **no se rompe**: se queda como estaba hasta que lo
arreglas (punto 7).

---

## 0. Antes de empezar (solo la primera vez)

1. Instala **Visual Studio Code**: https://code.visualstudio.com
2. Ábrelo y trae la tienda: a la izquierda, el icono de las ramas (**Source
   Control**) → **Clone Repository** → **Clone from GitHub** → entra con tu
   cuenta → elige `Quiennocorrevuela/ecommerce` → una carpeta de tu ordenador →
   **Open**. Si te pide instalar Git, acepta.

Desde ahí, la tienda es esa carpeta: cada vez que abras VS Code, se abre allí.

3. Instala **Live Server**, para ver los cambios antes de subirlos: a la
   izquierda, el icono de los cuadraditos (**Extensions**), busca `Live Server`
   (la de Ritwick Dey) → **Install**. Abajo a la derecha sale **Go Live**.

Para preparar las fotos, **imgToWeb**: https://meowrhino.github.io/imgToWeb/
(las pasa a `.webp`, del tamaño justo, y las numera `1.webp`, `2.webp`…).
**Ábrelo en Chrome o Firefox**, no en Safari: Safari no sabe hacer `.webp`.
Si un día no está, hay una copia en la tienda: `tools/imgToWeb/index.html`
(ábrelo con Go Live y entra en `/tools/imgToWeb/`).

---

## 1. Cómo está organizado

**Un fanzine, una carpeta.** Todo lo de un fanzine está junto: su texto y sus fotos.

```
products/
  pont-neuf/
    product.json      ← título, autora, precio, peso, ficha, texto
    img/1.webp, 2.webp…   ← sus fotos (la 1 es la portada)
authors/
  mia-sala-patau/
    author.json       ← nombre y bio
    img/1.webp        ← su retrato (si no hay, sale la portada de su primer fanzine)
data/
  site.json           ← qué fanzines salen en la tienda y en qué orden, y las autoras
  about.json          ← el texto de «nosotras»
  events.json         ← el calendario: ferias y presentaciones
  events/<id>.webp    ← el cartel de cada evento
  shipping.json       ← las tarifas de envío
```

**El nombre de la carpeta es la dirección** del fanzine o de la autora: la
carpeta `products/pont-neuf/` es `quiennocorrevuela.com/producto/pont-neuf/`.
Minúsculas, sin tildes ni espacios, con guiones. **Una vez publicado, no lo
cambies**: los pedidos y el stock van por ese nombre.

Los textos van en los tres idiomas, `es`, `ca` y `en`. Si uno se queda vacío,
sale el castellano. Los textos largos son una lista de párrafos:
`["primer párrafo", "segundo párrafo"]`.

---

## 2. Cómo se hace un cambio con VS Code

1. **Antes de nada, trae la última versión**: abajo del todo, las flechas ⟳
   (**Sync**).
2. A la izquierda, abre el archivo (por ejemplo `products/pont-neuf/product.json`)
   y cambia lo que haga falta. Guarda con **Cmd+S**. Si algo sale **subrayado
   en rojo**, hay una coma o unas comillas mal, o un campo mal escrito (punto
   7). Con el ratón encima de un campo, VS Code te dice qué es.
3. **Míralo antes de subirlo**: **Go Live**, abajo a la derecha, abre la tienda
   en el navegador, y cada vez que guardas se recarga sola. Si algo está mal,
   en vez de la tienda sale **qué y dónde**, en rojo. Aquí no hay panel: los
   fanzines salen todos disponibles y no se puede pagar.
4. A la izquierda, el icono de las ramas (**Source Control**): escribe en una
   línea qué has cambiado ("precio de pont neuf") y pulsa **Commit**.
5. Pulsa **Sync Changes** (el mismo botón azul).

Ya está: en 1 o 2 minutos sale en la web.

**Para añadir fotos**: arrástralas a su carpeta `img/` en la columna de la
izquierda de VS Code, y después los pasos 4 y 5.

---

## 3. Añadir un fanzine

1. **Copia la carpeta** de un fanzine parecido dentro de `products/` y ponle
   su nombre (`no-time-left-for-the-square`).
2. **Las fotos**: vacía su `img/` y mete las nuevas, pasadas por imgToWeb, que
   ya salen numeradas. La `1.webp` es la portada.
3. **Cambia los datos** de su `product.json` (la tabla de abajo).
4. **Ponlo en la tienda**: en `data/site.json`, añade su nombre a
   `"products"`, dentro de `"shop"`, donde quieras que salga: el primero de la lista es el primero de
   la tienda.
5. **Ponle unidades** en el panel (punto 6). Hasta entonces sale **agotado**.

**Para esconder un fanzine** sin borrarlo (porque aún no está, o para mandar
su página a alguien antes de anunciarlo): en la lista de `data/site.json`,
cambia `"pont-neuf"` por `{ "product": "pont-neuf", "visible": false }`. Su
página sigue en su dirección, pero no sale en la tienda, ni con su autora, ni
en Google. Para que vuelva, otra vez `"pont-neuf"`: no pierde su sitio. Con
una autora, igual: `{ "author": "mia-sala-patau", "visible": false }`.

```json
{
  "$schema": "../../schema/product.json",
  "title": ["No time left", "for the square"],
  "author": "Andrea Carilla",
  "authorId": "andrea-carilla",
  "price": 14.00,
  "weight": 60,
  "details": {
    "publisher": "quien no corre, vuela",
    "binding": { "es": "grapado", "ca": "grapat", "en": "stapled" },
    "pages": 32,
    "size": "148 × 210 mm",
    "year": { "es": "marzo 2026", "ca": "març 2026", "en": "March 2026" },
    "edition": { "es": "1ª edición · 50 copias", "ca": "…", "en": "…" }
  },
  "text": { "es": ["primer párrafo", "segundo"], "ca": ["…"], "en": ["…"] },
  "photos": ["1", "2", "3"]
}
```

| campo | qué es |
|---|---|
| `title` | el título. Si va en dos líneas, una lista: `["No time left", "for the square"]` |
| `author` | el nombre de la autora, tal cual se ve |
| `authorId` | el nombre de la carpeta de la autora en `authors/`. Si aún no tiene página, ponlo igual: su nombre se enlazará solo cuando la añadas |
| `price` | en euros, con punto y sin comillas: `14.00` |
| `weight` | los gramos, para calcular el envío: `60` |
| `details` | la ficha: editorial, encuadernación, páginas, medidas, año y edición. La que no tenga, se borra (o `null`) |
| `text` | el texto, en `es`, `ca` y `en`, como lista de párrafos |
| `photos` | las fotos que salen, **por su número y sin `.webp`**, en orden |
| `comingSoon` | opcional: `true` = **próximamente**. Sale en la página de su autora pero no en la tienda, y no se puede comprar |
| `soldOut` | opcional: `true` = agotado aunque queden unidades |

## 4. Añadir o cambiar una autora

1. Copia la carpeta de otra autora dentro de `authors/` y ponle su nombre
   (`mia-sala-patau`).
2. Su retrato, si lo hay, como `img/1.webp`. Si no hay, sale la portada de su
   primer fanzine.
3. En su `author.json`: `name` (como se ve) y `bio` (en `es`, `ca`, `en`, como
   lista de párrafos).
4. Añade su nombre a la lista `"authors"` de `data/site.json`.

Sus fanzines salen solos en su página: los que tienen su carpeta en `authorId`.

## 5. Añadir una feria o un evento

En `data/events.json`, **copia un bloque que ya esté** (de `{` a `},`, con la
coma) y cambia los datos. El cartel va en `data/events/` con el `id` del evento
como nombre: `data/events/fiebre-2026.webp`.

| campo | qué es | ejemplo |
|---|---|---|
| `id` | su nombre, y el de su cartel | `"fiebre-2026"` |
| `title` | el nombre del evento | `"Fiebre"` |
| `place` | dónde | `"La Casa Encendida, Madrid"` |
| `type` | qué es, en `es`, `ca`, `en` | `{ "es": "feria de fotolibros", … }` |
| `start`, `end` | año-mes-día. Si es un solo día, sin `end` | `"2026-09-18"` |

El orden dentro del archivo da igual: el calendario los ordena por fecha.

---

## 6. El stock y los pedidos: el panel

En **`quiennocorrevuela.com/admin/`**, con tu clave:

- **stock**: cuántos quedan de cada fanzine y cuántos se han vendido. Cuando
  llegan ejemplares, en **Añadir** pones cuántos (`30`), una nota si quieres
  ("la tirada") y **Guardar**. Las ventas se restan solas. Para quitar (uno roto,
  uno regalado), en negativo: `-1`. Cada cambio queda apuntado con su fecha:
  pulsa el nombre de un fanzine para ver su registro.
- **pedidos**: con su dirección y su estado (pendiente → enviado → entregado).
  Escribe el **número de seguimiento** antes de pasarlo a «enviado»: así le llega
  en el correo a quien compró.
  Si uno sale como **revisar**, es que se vendió algo que ya no quedaba (dos
  personas a la vez): mira si lo tienes o escribe a quien compró.
- **newsletter**: las altas. **Descargar CSV** te da la lista para el programa
  con el que mandéis los correos, y **Dar de baja** quita a quien lo pida.
- **mensajes**: lo que os escriben desde «contacto».

---

## 7. Si algo va mal

**Casi siempre es una coma.** Entre dos bloques `{ … }` va una coma, y después
del último, no. Entre dos campos, coma; después del último campo de un bloque,
no. Y los textos, siempre entre comillas `"…"`. VS Code lo subraya en rojo.

Antes de subirlo, **Go Live** te lo dice (punto 2): en vez de la tienda sale
qué falta y dónde. Si aun así subes algo con un error, **la web no se rompe**:
no se publica y se queda como estaba. Lo verás en tres sitios:

- En GitHub, al lado de tu último cambio, una **bolita**: verde, publicado;
  roja, no.
- En tu repo de GitHub, un aviso (**Issues**) que se llama «La tienda no se ha
  publicado», con el error dentro. Se cierra solo cuando lo arreglas.
- En el panel de Cloudflare (Workers → quien-no-corre-vuela → Deployments).

El error sale en castellano, con qué falta y dónde. Por ejemplo:

```
✗ products/pont-neuf: "photos" dice "7", pero no hay ningún img/7.webp
✗ data/site.json: la lista "shop" dice "pont-nef", pero no hay ninguna carpeta products/pont-nef/
```

Si no lo encuentras, escríbenos y lo miramos.
