/* ============================================================
   preview.mjs — la tienda entera sin build, para Live Server
   ------------------------------------------------------------
   Live Server (la extensión de VS Code) sirve la carpeta tal cual, y
   la tienda de verdad no existe hasta que el build la escribe en
   dist/. Esto la pinta al vuelo: lee los JSON y escribe la página
   pedida con las mismas plantillas que el build (paginas.mjs), y
   revisa lo mismo que él (validar.mjs): lo que pararía la publicación
   sale en pantalla en vez de la página.

   Todas las páginas son el index.html de la raíz, con la dirección
   en ?p=:   /?p=/ca/producto/pont-neuf/

   Sin el Worker no hay stock ni pago: los fanzines salen disponibles
   y el carrito se llena, pero no se puede pagar.
   ============================================================ */
import { crearSitio } from "./paginas.mjs";
import { leerJSON, revisar, entradas } from "./validar.mjs";
import { escapeHtml as esc } from "../public/js/core/data.js";

/* La carpeta del index.html: normalmente la raíz, pero si Live Server se abre
   desde una carpeta de más arriba, será una subcarpeta. */
const BASE = location.pathname.replace(/\/index\.html$/, "").replace(/\/$/, "");

const pedir = async (ruta) => {
  const r = await fetch(`${BASE}/${ruta}`, { cache: "no-store" });
  if (!r.ok) throw new Error(`no encuentro ${ruta}`);
  return r.text();
};
const json = async (ruta) => leerJSON(await pedir(ruta), ruta);

/* ¿Existe este fichero? Se pregunta al servidor con HEAD, que no lo baja, y se recuerda. */
const hay = new Map();
const preguntar = (rutas) => Promise.all([...rutas].filter((r) => !hay.has(r)).map(async (r) => {
  try { hay.set(r, (await fetch(`${BASE}/${encodeURI(r)}`, { method: "HEAD", cache: "no-store" })).ok); }
  catch { hay.set(r, false); }
}));

function escribir(html) {
  document.open();
  document.write(html);
  document.close();
}

function pantallaDeError(titulo, texto) {
  escribir(`<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>vista previa — error</title><meta name="viewport" content="width=device-width,initial-scale=1">
<style>body{margin:0;padding:clamp(24px,6vw,80px);font:16px/1.5 Helvetica,Arial,sans-serif;background:#fafafa;color:#4f4f4f}
h1{font-weight:400;font-size:28px;margin:0 0 .6em;color:#b3261e}p{max-width:72ch;white-space:pre-line}</style>
</head><body><h1>${esc(titulo)}</h1><p>${esc(texto)}</p>
<p>Arréglalo, guarda, y esta página se recarga sola.</p></body></html>`);
}

/* Las direcciones de la página, a las de la carpeta: las fotos (products/, authors/,
   data/) están donde en dist/; el css, el js y los logos, en public/; y los enlaces a
   otra página, a ?p=. */
const enLaCarpeta = (html) => html.replace(/(\s(?:href|src))="\/([^"]*)"/g, (_, at, p) => {
  if (/^(products|authors|data)\//.test(p)) return `${at}="${BASE}/${p}"`;
  if (/\.[a-z0-9]+$/i.test(p)) return `${at}="${BASE}/public/${p}"`;
  return `${at}="${BASE}/?p=/${p}"`;
});

async function arrancar() {
  let pedida = new URLSearchParams(location.search).get("p") || "/";
  if (!pedida.startsWith("/")) pedida = "/" + pedida;
  if (!pedida.endsWith("/")) pedida += "/";

  let site, about, events, shipping, products, authors, fijas, esquemas;
  try {
    [site, about, events, shipping] = await Promise.all(
      ["site", "about", "events", "shipping"].map((n) => json(`data/${n}.json`)));
    esquemas = Object.fromEntries(await Promise.all(
      ["site", "about", "product", "author", "events"].map(async (t) => [t, await json(`schema/${t}.json`)])));
    /* El navegador no puede listar carpetas: se leen las de las listas. Una que no
       está, la revisión dice que falta. */
    const leerTodos = (lista, dir, fichero) => Promise.all(entradas(site, lista, dir).map(async ({ id }) => {
      try { return { ...(await json(`${dir}/${id}/${fichero}`)), id }; }
      catch (e) { if (e.json) throw e; return null; }
    })).then((xs) => xs.filter(Boolean));
    [products, authors] = await Promise.all([
      leerTodos("shop", "products", "product.json"), leerTodos("authors", "authors", "author.json")]);
    // Las páginas fijas, las de pages/ (el build las lista; aquí, por su nombre).
    fijas = Object.fromEntries(await Promise.all(["checkout", "contacto", "gracias", "legal", "newsletter", "sorry"]
      .map(async (n) => [n, await pedir(`pages/${n}.html`)])));
  } catch (e) {
    pantallaDeError(e.json ? "Hay un error en un JSON" : "No puedo leer los datos", e.message);
    return;
  }

  /* Las plantillas y la revisión preguntan "¿existe este fichero?" sin esperar, y al
     servidor hay que esperarlo. Así que se pinta en seco apuntando lo que se pregunta,
     se pregunta todo de una vez, y se repite hasta que no queda nada nuevo. */
  const montar = (existe) => {
    const datos = { site, about, products, authors, events, shipping, existe };
    return { sitio: crearSitio({ ...datos, fijas, preview: true }), revision: revisar({ ...datos, esquemas, carpetas: false }) };
  };
  for (let vuelta = 0; vuelta < 4; vuelta++) {
    const nuevas = new Set();
    const { sitio } = montar((r) => { r = r.replace(/^\//, ""); return hay.has(r) ? hay.get(r) : (nuevas.add(r), false); });
    sitio.rutas().find((r) => r.ruta === pedida)?.pintar();
    if (!nuevas.size) break;
    await preguntar(nuevas);
  }
  const { sitio, revision } = montar((r) => hay.get(r.replace(/^\//, "")) === true);

  if (revision.errores.length) {
    pantallaDeError("Esto no se publicaría", revision.errores.join("\n"));
    return;
  }
  const pagina = sitio.rutas().find((r) => r.ruta === pedida);
  if (!pagina) {
    pantallaDeError("Esta página no existe",
      `No hay ninguna página en ${pedida}. Si es un fanzine o una autora, mira que el nombre de la carpeta esté bien escrito y que esté en su lista de data/site.json.`);
    return;
  }

  /* El catálogo y los envíos que el build escribe en dist/data/: el JS de la página los
     pide con fetch, y aquí se le dan sin escribirlos. */
  const vivos = {
    "/data/products.json": sitio.catalogo().map((p) => ({ ...p, photos: p.photos.map((f) => BASE + f) })),
    "/data/shipping.json": shipping,
  };
  const fetchDeVerdad = window.fetch.bind(window);
  window.fetch = (u, o) => {
    const p = new URL(String(u), location.href).pathname;
    return p in vivos ? Promise.resolve(new Response(JSON.stringify(vivos[p]), { headers: { "content-type": "application/json" } }))
      : fetchDeVerdad(u, o);
  };

  escribir(enLaCarpeta(pagina.pintar()));
}

arrancar().catch((e) => pantallaDeError("La vista previa ha fallado", e.message));
