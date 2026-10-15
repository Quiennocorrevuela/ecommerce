/**
 * src/seo.js — lo que ven Google y las previsualizaciones (WhatsApp, Instagram, Telegram…).
 *
 * Las páginas las pinta el JS, así que el HTML de public/ llega casi vacío. Antes de
 * servirlo, el Worker le mete en el <head> título, description, canonical y og:* de lo
 * que se está viendo: la ficha de un fanzine (/producto/<id>), una autora (/autor/<id>) o,
 * en el resto, la presentación de la editorial. Todo sale de los mismos JSON del catálogo:
 * un fanzine o una autora nuevos tienen su preview sin tocar este archivo.
 *
 * También sirve /sitemap.xml, hecho al vuelo con esos JSON.
 */
import productos from "../public/data/productos.json";
import autores from "../public/data/autores.json";

const SITE = "Quien no corre, vuela";
const DESCRIPCION =
  "Quien no corre, vuela es un proyecto editorial de autoedición que nace de la necesidad de crear colectivamente, entendiendo lo visual como un espacio de expresión, encuentro y comunicación.";
const PAGINAS = ["/", "/about", "/autores", "/calendario", "/newsletter", "/contacto", "/legal"];

const es = (campo) => (campo && typeof campo === "object" ? campo.es ?? "" : String(campo ?? ""));
/** Primer párrafo, cortado a ~160 letras sin partir palabras. */
function resumen(texto) {
  const p = es(texto).split(/\n\s*\n/)[0].trim();
  return p.length <= 160 ? p : p.slice(0, 157).replace(/\s+\S*$/, "") + "…";
}
const attr = (s) => String(s).replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

function metaDe(url) {
  const [, seccion, ficha] = url.pathname.split("/");
  const id = ficha ? decodeURIComponent(ficha) : url.searchParams.get("id");
  const ruta = ficha ? `/${seccion}` : url.pathname.replace(/\.html$/, "");
  if (ruta === "/producto" && id) {
    const p = productos.find((x) => x.id === id);
    if (p) {
      const titulo = [].concat(p.titulo).join(" ");
      return {
        title: `${titulo} — ${p.autor} · ${SITE}`,
        description: resumen(p.descripcion) || DESCRIPCION,
        image: p.imgs?.[0],
        canonical: `/producto/${encodeURIComponent(id)}`,
      };
    }
  }
  if (ruta === "/autor" && id) {
    const a = autores.find((x) => x.id === id);
    if (a) {
      const obra = productos.find((p) => p.autorId === id && p.imgs?.[0]);
      return {
        title: `${a.nombre} · ${SITE}`,
        description: resumen(a.bio) || `${a.nombre}, autora de ${SITE}.`,
        image: a.foto || obra?.imgs[0],
        canonical: `/autor/${encodeURIComponent(id)}`,
      };
    }
  }
  return { description: DESCRIPCION, canonical: ruta === "/index" ? "/" : ruta };
}

/** Reescribe el <head> de una respuesta HTML de los assets. */
export function conMeta(res, url) {
  if (!(res.headers.get("content-type") || "").includes("text/html")) return res;
  const m = metaDe(url);
  // ponytail: og:image es la foto tal cual (webp, sin recortar a 1200×630). WhatsApp,
  // Telegram e iMessage la enseñan; si alguna red no, generar un jpg por fanzine.
  const imagen = new URL(m.image || "img/logo.webp", url.origin).href;
  const canonical = new URL(m.canonical, url.origin).href;
  let title = m.title || ""; // sin título propio, el og:title es el <title> que ya trae la página
  const tags = [
    `<meta name="description" content="${attr(m.description)}">`,
    `<link rel="canonical" href="${attr(canonical)}">`,
    `<meta property="og:site_name" content="${SITE}">`,
    `<meta property="og:type" content="website">`,
    `<meta property="og:locale" content="es_ES">`,
    `<meta property="og:url" content="${attr(canonical)}">`,
    `<meta property="og:description" content="${attr(m.description)}">`,
    `<meta property="og:image" content="${attr(imagen)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
  ];
  return new HTMLRewriter()
    .on("title", {
      element(el) { if (m.title) el.setInnerContent(m.title); },
      text(t) { if (!m.title) title += t.text; },
    })
    .on("head", {
      element(el) {
        el.onEndTag((end) => {
          end.before(`<meta property="og:title" content="${attr(title || SITE)}">` + tags.join(""), { html: true });
        });
      },
    })
    .transform(res);
}

export function sitemap(origin) {
  const urls = [
    ...PAGINAS,
    ...productos.map((p) => `/producto/${encodeURIComponent(p.id)}`),
    ...autores.map((a) => `/autor/${encodeURIComponent(a.id)}`),
  ];
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${attr(origin + u)}</loc></url>`).join("\n") +
    `\n</urlset>\n`;
  return new Response(xml, { headers: { "content-type": "application/xml; charset=utf-8" } });
}
