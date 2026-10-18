/* ============================================================
   paginas.mjs — las plantillas de la tienda: datos → HTML.

   No toca el disco: lo que necesita saber de él (si existe la foto de
   una autora o el cartel de un evento) se lo pasa build.mjs con
   `existe`. El marcado es el mismo que pintaba antes el JS en el
   navegador; ahora llega hecho, con su contenido, sus meta y una
   dirección por idioma (/, /ca/, /en/). El JS solo añade lo vivo:
   el stock, el carrito, la galería y el calendario centrado en hoy.
   ============================================================ */
import { STRINGS, LABELS } from "../public/js/core/i18n.js";
import { escapeHtml as esc, formatPrice } from "../public/js/core/data.js";
import { entradas } from "./validar.mjs";

const LOCALE = { es: "es-ES", ca: "ca-ES", en: "en-GB" };
const OG_LOCALE = { es: "es_ES", ca: "ca_ES", en: "en_GB" };

/* La transición de la casa (JAMstack, patrones §6c; js/transicion.js): este <script>, inline y
   antes de pintar, tapa la página si se llega de otra de la web (o con atrás). En la vista
   previa la página ya se ha revelado: window.revelada no espera a nada. */
const headScript = (preview) => `<script>{
const html = document.documentElement;
html.classList.add('js');
let back = false;
try {
  const d = JSON.parse(sessionStorage.getItem('transicion'));
  back = !d && performance.getEntriesByType('navigation')[0]?.type === 'back_forward';
  if (d?.carga) html.style.setProperty('--carga', d.carga);   // el color del loader, del dibujo
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches && (back || d)) html.classList.add('tapada');
} catch {}
window.revelada = ${preview ? "false" : "'onpagereveal' in window"} ? new Promise((done) => addEventListener('pagereveal', (e) => {
  const vt = e.viewTransition;
  if (vt && back && html.classList.contains('tapada')) { html.classList.add('tapando'); done(vt); }
  else { vt?.ready.catch(() => {}); vt?.skipTransition(); done(null); }   // saltarla rechaza ready: sin error en la consola
}, { once: true })) : Promise.resolve(null);
}</script>`;

export function crearSitio({ site, about, products, authors, events, fijas, existe, og = () => null, preview = false }) {
  const LANGS = site.langs;
  const DEF = site.lang;
  const SITE = site.title;

  /* ---------- idiomas y direcciones ---------- */
  const pre = (l) => (l === DEF ? "" : `/${l}`);
  /** La dirección de una página en un idioma: url("ca", "producto/x/") → /ca/producto/x/ */
  const url = (l, path = "") => `${pre(l)}/${path}`;
  const abs = (p) => site.url.replace(/\/$/, "") + p;
  const s = (key, l) => STRINGS[key]?.[l] ?? STRINGS[key]?.es ?? key;
  const t = (obj, l) => {
    if (obj == null) return "";
    if (typeof obj === "string" || Array.isArray(obj)) return obj;
    return obj[l] ?? obj[DEF] ?? Object.values(obj)[0] ?? "";
  };
  const parrafos = (obj, l) => [].concat(t(obj, l) || []);
  const lineas = (p) => [].concat(p.title);
  const nombre = (p) => lineas(p).join(" ");
  const resumen = (txt) => {
    const p = String(txt || "").replace(/\s+/g, " ").trim();
    return p.length <= 160 ? p : p.slice(0, 157).replace(/\s+\S*$/, "") + "…";
  };

  /* Lo que está en las listas, en su orden. Uno oculto ({ "product": "x", "visible": false })
     tiene su página, con noindex, pero no sale en la tienda, ni con su autora, ni en el sitemap. */
  const deLista = (n, dir, todos) => entradas(site, n, dir)
    .map((e) => { const x = todos.find((y) => y.id === e.id); return x && { ...x, oculto: !e.visible }; }).filter(Boolean);
  const tienda = deLista("shop", "products", products);
  const autoras = deLista("authors", "authors", authors);
  const conPagina = (id) => autoras.some((a) => a.id === id && !a.oculto);

  const foto = (p, n) => `/products/${p.id}/img/${n}.webp`;
  const fotos = (p) => (p.photos || []).map((n) => foto(p, n));
  const retrato = (a) => {
    const propio = `/authors/${a.id}/img/1.webp`;
    if (existe(propio)) return propio;
    const obra = tienda.find((p) => p.authorId === a.id && !p.oculto && p.photos?.length);
    return obra ? foto(obra, obra.photos[0]) : "";
  };
  const cartel = (ev) => (existe(`/data/events/${ev.id}.webp`) ? `/data/events/${ev.id}.webp` : "");

  /* ---------- trozos ---------- */
  const soldoutHTML = (l) =>
    `<span class="soldout"><span class="dot" aria-hidden="true"></span><span class="txt">${s("product.soldout", l)}</span></span>`;

  /** Tarjeta de un fanzine (la tienda y la página de una autora). Sale disponible; si
      no quedan unidades, el JS la pasa a agotado con el stock vivo. */
  function card(p, l) {
    const titulo = lineas(p);
    const imgs = fotos(p);
    const agotado = !p.comingSoon && p.soldOut === true;
    const img = imgs[0]
      ? `<div class="card-img">
        <img src="${imgs[0]}" alt="${esc(titulo.join(" "))}" loading="lazy">
        ${imgs[1] ? `<img class="card-img-alt" src="${imgs[1]}" alt="" loading="lazy">` : ""}
      </div>`
      : `<div class="card-img is-empty">${s("product.soon", l)}</div>`;
    return `
    <a class="card${p.comingSoon ? " is-soon" : ""}${agotado ? " is-agotado" : ""}" href="${url(l, `producto/${p.id}/`)}" data-id="${esc(p.id)}"${p.comingSoon ? " data-soon" : ""}>
      ${img}
      <em class="card-titulo">${titulo.map(esc).join("<br>")}</em>
      <div class="card-meta">
        <span class="autor">${esc(p.author)}</span>
        <span class="precio">${agotado ? soldoutHTML(l) : formatPrice(p.price)}</span>
      </div>
    </a>`;
  }

  const NAV = [
    ["", "nav.tienda"], ["about/", "nav.nosotras"], ["calendario/", "nav.calendario"],
    ["newsletter/", "nav.newsletter"], ["contacto/", "nav.contacto"], ["autores/", "nav.autoras"],
    ["legal/", "nav.legal"],
  ];

  /** Cabecera y menú, los de siempre. El idioma se cambia con enlaces a la misma
      página en el otro idioma. */
  function cabecera(l, path) {
    return `<header class="qnc-header">
      <button class="btn-menu" data-menu-open type="button"><span>${s("menu", l)}</span></button>
      <a class="hdr-logo" href="${url(l)}" aria-label="${SITE}">
        <img src="/img/logo.webp" alt="${SITE}" />
      </a>
      <a class="hdr-cart" href="${url(l, "checkout/")}" aria-label="${s("cart.title", l)}">
        <img src="/img/iconos/carro.webp" alt="" />
        <span class="cart-badge" data-cart-count></span>
      </a>
    </header>

    <nav class="qnc-menu" data-menu aria-hidden="true">
      <button class="menu-close" data-menu-close type="button" aria-label="cerrar">×</button>
      <ul>
        ${NAV.map(([p, key]) => `<li><a href="${url(l, p)}"${p === path ? ' class="is-active"' : ""}>${s(key, l)}</a></li>`).join("")}
      </ul>
      <div class="menu-langs" data-langs>
        ${LANGS.map((x) => `<a href="${url(x, path)}" hreflang="${x}" lang="${x}"${x === l ? ' class="on" aria-current="true"' : ""}>${LABELS[x]}</a>`).join("")}
      </div>
    </nav>
    <div class="menu-overlay" data-menu-overlay></div>`;
  }

  function pagina({ l, path, title, desc, image, js, main, pie = "", noindex = false }) {
    const alts = LANGS.map((x) => `<link rel="alternate" hreflang="${x}" href="${abs(url(x, path))}" />`).join("\n    ");
    // og(foto) da la de 1200×630 que hace build.mjs; si no la hay, se comparte la foto tal cual.
    const foto = image || "/img/logo.webp";
    const ogImg = og(foto);
    return `<!doctype html>
<html lang="${l}">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    ${headScript(preview)}
    <title>${esc(title)}</title>
    <meta name="description" content="${esc(desc)}" />
    ${noindex ? '<meta name="robots" content="noindex" />' : `<link rel="canonical" href="${abs(url(l, path))}" />
    ${alts}
    <link rel="alternate" hreflang="x-default" href="${abs(url(DEF, path))}" />`}
    <meta property="og:site_name" content="${SITE}" />
    <meta property="og:type" content="website" />
    <meta property="og:locale" content="${OG_LOCALE[l]}" />
    <meta property="og:url" content="${abs(url(l, path))}" />
    <meta property="og:title" content="${esc(title)}" />
    <meta property="og:description" content="${esc(desc)}" />
    <meta property="og:image" content="${abs(ogImg || foto)}" />
    ${ogImg ? `<meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    ` : ""}<meta name="twitter:card" content="summary_large_image" />
    <link rel="stylesheet" href="/css/transicion.css" />
    <link rel="stylesheet" href="/css/styles.css" />
    <script src="/js/transicion.js" defer></script>
    <script type="module" src="/js/pages/${js}.js"></script>
  </head>
  <body>
    ${cabecera(l, path)}
    <main${main.clase ? ` class="${main.clase}"` : ""}>
${main.html}
    </main>${pie}
  </body>
</html>
`;
  }

  const titulo = (key, l) => {
    const x = s(key, l);
    return `${x.charAt(0).toUpperCase()}${x.slice(1)} · ${SITE}`;
  };
  const descSitio = (l) => t(site.description, l);

  /* ---------- páginas con datos ---------- */
  const home = (l) => pagina({
    l, path: "", js: "home", title: SITE, desc: descSitio(l),
    main: { html: `      <section class="tienda-grid" data-productos>${tienda.filter((p) => !p.comingSoon && !p.oculto).map((p) => card(p, l)).join("")}</section>` },
  });

  function producto(p, l) {
    const imgs = fotos(p);
    const titulo = lineas(p);
    const multi = imgs.length > 1;
    const galeria = imgs.length
      ? `
    <div class="galeria">
      <div class="galeria-stage">
        ${multi ? `<button class="galeria-nav prev" data-prev aria-label="anterior">‹</button>` : ""}
        <img data-stage src="${imgs[0]}" alt="${esc(titulo.join(" "))}" />
        ${multi ? `<button class="galeria-nav next" data-next aria-label="siguiente">›</button>` : ""}
      </div>
      ${multi ? `<div class="galeria-thumbs">${imgs
        .map((src, i) => `<button class="${i === 0 ? "on" : ""}" data-thumb="${i}" type="button" aria-label="imagen ${i + 1}"><img src="${src}" alt="" loading="lazy"></button>`)
        .join("")}</div>` : ""}
    </div>`
      : `<div class="galeria"><div class="galeria-stage"><div class="card-img is-empty">${s("product.soon", l)}</div></div></div>`;

    const d = p.details || {};
    const filas = [
      ["ficha.editorial", d.publisher], ["ficha.autor", p.author], ["ficha.anio", t(d.year, l)],
      ["ficha.edicion", t(d.edition, l)], ["ficha.encuadernacion", t(d.binding, l)],
      ["ficha.paginas", d.pages != null ? String(d.pages) : ""], ["ficha.medidas", d.size],
    ].filter(([, v]) => v != null && String(v).trim() !== "")
      .map(([k, v]) => `<tr><td class="k">${s(k, l)}</td><td class="v">${esc(v)}</td></tr>`).join("");

    const btn = p.comingSoon ? `<button class="btn-add" disabled>${s("product.soon", l)}</button>`
      : p.soldOut ? `<button class="btn-add" disabled>${s("product.soldout", l)}</button>`
      : `<button class="btn-add" data-add>${s("product.add", l)}</button>`;

    const texto = parrafos(p.text, l);
    const info = `
    <div class="producto-info">
      <table class="ficha"><tbody>${filas}</tbody></table>
      ${btn}
      <h1 class="producto-titulo">${titulo.map(esc).join("<br>")}</h1>
      <div class="producto-meta">
        ${conPagina(p.authorId)
          ? `<a class="autor" href="${url(l, `autor/${p.authorId}/`)}">${esc(p.author)}</a>`
          : `<span class="autor">${esc(p.author)}</span>`}
        <span class="precio">${formatPrice(p.price)}</span>
      </div>
      <div class="producto-desc">${esc(texto.join("\n\n"))}</div>
    </div>`;

    return pagina({
      l, path: `producto/${p.id}/`, js: "producto",
      title: `${nombre(p)} — ${p.author} · ${SITE}`,
      desc: resumen(texto[0]) || descSitio(l), image: imgs[0], noindex: p.oculto,
      main: { html: `      <article class="producto" data-producto data-id="${esc(p.id)}">${galeria + info}</article>` },
    });
  }

  function autora(a, l) {
    const f = retrato(a);
    const bio = parrafos(a.bio, l);
    const obras = tienda.filter((p) => p.authorId === a.id && !p.oculto);
    return pagina({
      l, path: `autor/${a.id}/`, js: "autor",
      title: `${a.name} · ${SITE}`, desc: resumen(bio[0]) || `${a.name}, ${SITE}.`, image: f, noindex: a.oculto,
      main: { html: `      <section class="pagina-info" data-autor>
    <div class="info-foto">${f ? `<img src="${f}" alt="${esc(a.name)}">` : ""}</div>
    <div class="info-texto">
      <p class="lead">${esc(a.name)}</p>
      ${bio.map((x) => `<p>${esc(x)}</p>`).join("")}
    </div></section>
      <section class="tienda-grid" data-obras style="margin-top:2.5rem">${obras.map((p) => card(p, l)).join("")}</section>` },
    });
  }

  const autoresPagina = (l) => pagina({
    l, path: "autores/", js: "autores", title: titulo("nav.autoras", l), desc: descSitio(l),
    main: { html: `      <section class="autores-grid" data-autores>${autoras.filter((a) => !a.oculto).map((a) => {
      const f = retrato(a);
      const img = f
        ? `<div class="card-img"><img src="${f}" alt="${esc(a.name)}" loading="lazy"></div>`
        : `<div class="card-img is-empty">${esc(a.name)}</div>`;
      return `
        <a class="autor-card" href="${url(l, `autor/${a.id}/`)}">
          ${img}
          <em class="autor-nombre">${esc(a.name)}</em>
        </a>`;
    }).join("")}</section>` },
  });

  const aboutPagina = (l) => {
    const ps = parrafos(about, l).length ? parrafos(about, l) : parrafos(about, DEF);
    return pagina({
      l, path: "about/", js: "about", title: titulo("nav.nosotras", l), desc: resumen(ps[0]),
      main: { html: `      <section class="pagina-info">
        <div class="info-foto">
          <img src="/img/sello.webp" alt="${SITE}" />
        </div>
        <div class="info-texto" data-about>${ps.map((x, i) => `<p${i === 0 ? ' class="lead"' : ""}>${esc(x)}</p>`).join("")}</div>
      </section>` },
      // la firma del estudio, solo aquí: es un crédito, no una marca en cada fanzine
      pie: `\n    <footer class="qnc-footer">ecommerce: <a href="https://meowrhino.studio" target="_blank" rel="noopener noreferrer">meowrhino.studio</a></footer>`,
    });
  };

  /* calendario: los eventos de viejo a nuevo; el hueco de "hoy" lo pone el JS al abrir
     la página, porque hoy cambia cada día y la página no */
  function calendario(l) {
    const ddmm = (iso) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };
    const dia = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
    const fmt = (o) => new Intl.DateTimeFormat(LOCALE[l], o);
    const fecha = (ev) => {
      const opts = { day: "numeric", month: "long", year: "numeric" };
      const ini = dia(ev.start);
      if (ev.end && ev.end !== ev.start) {
        const fin = dia(ev.end);
        if (ini.getMonth() === fin.getMonth() && ini.getFullYear() === fin.getFullYear())
          return `${ini.getDate()}–${fin.getDate()} ${fmt({ month: "long", year: "numeric" }).format(ini)}`;
        return `${fmt(opts).format(ini)} – ${fmt(opts).format(fin)}`;
      }
      return fmt(opts).format(ini);
    };
    const tarjetas = [...events].sort((a, b) => a.start.localeCompare(b.start)).map((ev) => {
      const c = cartel(ev);
      return `
    <article class="evento" data-snap data-fecha="${ddmm(ev.start)}" data-iso="${ev.start}" data-fin="${ev.end || ev.start}">
      ${c ? `<div class="evento-cartel"><img src="${c}" alt="${esc(ev.title)}"></div>` : `<div class="evento-cartel evento-cartel--vacio"></div>`}
      <div class="evento-fecha">${fecha(ev)}</div>
      <h3 class="evento-titulo">${esc(ev.title)}</h3>
      <div class="evento-tipo">${esc(t(ev.type, l))}</div>
      <div class="evento-lugar">${esc(ev.place)}</div>
    </article>`;
    }).join("");
    return pagina({
      l, path: "calendario/", js: "calendario", title: titulo("nav.calendario", l), desc: descSitio(l),
      main: { html: `      <div class="cal" data-cal>
        <div class="cal-track" data-cal-track>${tarjetas}</div>
        <div class="cal-marker" data-marker hidden>
          <span class="cal-caret" aria-hidden="true"></span>
          <div class="cal-marker-row">
            <button class="cal-arrow" data-cal-prev type="button" aria-label="anterior">‹</button>
            <span class="cal-date" data-marker-date></span>
            <button class="cal-arrow" data-cal-next type="button" aria-label="siguiente">›</button>
          </div>
        </div>
      </div>` },
    });
  }

  /* ---------- páginas fijas (pages/*.html) ----------
     De cada una se usa su <main>: los textos con data-i18n se ponen en el idioma, las
     rutas pasan a absolutas y los enlaces internos llevan el prefijo del idioma. */
  function fija(nombreFichero, html, l) {
    const main = /<main([^>]*)>([\s\S]*?)<\/main>/.exec(html);
    const clase = /class="([^"]*)"/.exec(main[1])?.[1];
    const tituloFichero = /<title>([^<]*)<\/title>/.exec(html)?.[1] || SITE;
    const cuerpo = main[2]
      .replace(/(<([a-z0-9]+)[^>]*\sdata-i18n="([^"]+)"[^>]*>)[^<]*(<\/\2>)/g, (_, open, _tag, key, close) => `${open}${s(key, l)}${close}`)
      .replace(/data-i18n-ph="([^"]+)"/g, (_, key) => `placeholder="${esc(s(key, l))}"`)
      .replace(/\ssrc="(?!\/|https?:)([^"]+)"/g, ' src="/$1"')
      .replace(/\shref="\/([^"]*)"/g, (_, p) => ` href="${url(l, p)}"`);
    const path = `${nombreFichero}/`;
    const clave = { checkout: "cart.title", newsletter: "nav.newsletter", contacto: "nav.contacto", legal: "nav.legal",
                    gracias: "thanks.title", sorry: "sorry.title" }[nombreFichero];
    return pagina({
      l, path, js: nombreFichero, main: { clase, html: cuerpo.replace(/^\n|\s+$/g, "") },
      title: clave ? titulo(clave, l) : tituloFichero, desc: descSitio(l),
      noindex: ["checkout", "gracias", "sorry"].includes(nombreFichero),
    });
  }

  function noEncontrada() {
    return pagina({
      l: DEF, path: "404/", js: "legal", title: `404 · ${SITE}`, desc: descSitio(DEF), noindex: true,
      main: { clase: "mensaje", html: `      <h1>404</h1>
      ${LANGS.map((l) => `<p lang="${l}"><a href="${url(l)}">← ${s("nav.tienda", l)}</a></p>`).join("\n      ")}` },
    });
  }

  /* ---------- el mapa del sitio ---------- */
  function rutas() {
    const r = [];
    for (const l of LANGS) {
      r.push({ ruta: url(l), pintar: () => home(l) });
      r.push({ ruta: url(l, "about/"), pintar: () => aboutPagina(l) });
      r.push({ ruta: url(l, "autores/"), pintar: () => autoresPagina(l) });
      r.push({ ruta: url(l, "calendario/"), pintar: () => calendario(l) });
      for (const p of tienda) r.push({ ruta: url(l, `producto/${p.id}/`), pintar: () => producto(p, l), privada: p.oculto });
      for (const a of autoras) r.push({ ruta: url(l, `autor/${a.id}/`), pintar: () => autora(a, l), privada: a.oculto });
      for (const [n, html] of Object.entries(fijas)) {
        r.push({ ruta: url(l, `${n}/`), pintar: () => fija(n, html, l), privada: ["checkout", "gracias", "sorry"].includes(n) });
      }
    }
    return r;
  }

  /** El catálogo para el Worker (precios y pesos de verdad al pagar) y para el carrito:
      dist/data/products.json (la vista previa lo da sin escribirlo). */
  const catalogo = () => tienda.map((p) => ({
    id: p.id, title: p.title, author: p.author, authorId: p.authorId, price: p.price, weight: p.weight,
    photos: fotos(p),
    ...(p.soldOut ? { soldOut: true } : {}), ...(p.comingSoon ? { comingSoon: true } : {}),
  }));

  return { rutas, noEncontrada, catalogo, tienda, autoras, abs };
}
