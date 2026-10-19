/* ============================================================
   build.mjs — escribe la tienda en dist/: un HTML por página e
   idioma, con su contenido dentro, más las fotos, el css y el js.

     node build/build.mjs

   Lo lanza solo `wrangler deploy` (y `wrangler dev`) por el [build]
   de wrangler.toml: en Cloudflare, cada push publica. Si algo de los
   JSON está mal, para con un mensaje en castellano y la tienda se
   queda como estaba.
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crearSitio } from "./paginas.mjs";
import { leerJSON, revisar } from "./validar.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");

/** Lee un JSON; si está mal, dice en qué línea y para. */
function leer(rel) {
  try {
    return leerJSON(readFileSync(join(ROOT, rel), "utf8"), rel);
  } catch (e) {
    if (!e.json) throw e;
    console.error(`\n✗ ${e.message}\n`);
    process.exit(1);
  }
}
const carpetas = (dir) => (existsSync(join(ROOT, dir))
  ? readdirSync(join(ROOT, dir), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : []);
const existe = (ruta) => existsSync(join(ROOT, ruta.replace(/^\//, "")));

/* ---------- leer ---------- */
const site = leer("data/site.json");
const about = leer("data/about.json");
const events = leer("data/events.json");
const shipping = leer("data/shipping.json");
const products = carpetas("products").filter((id) => existe(`products/${id}/product.json`))
  .map((id) => ({ ...leer(`products/${id}/product.json`), id }));
const authors = carpetas("authors").filter((id) => existe(`authors/${id}/author.json`))
  .map((id) => ({ ...leer(`authors/${id}/author.json`), id }));
const fijas = Object.fromEntries(readdirSync(join(ROOT, "pages")).filter((f) => f.endsWith(".html"))
  .map((f) => [f.replace(/\.html$/, ""), readFileSync(join(ROOT, "pages", f), "utf8")]));

/* ---------- revisar ---------- */
const esquemas = Object.fromEntries(["site", "about", "product", "author", "events", "shipping"].map((t) => [t, leer(`schema/${t}.json`)]));
const { errores, avisos } = revisar({ site, about, products, authors, events, shipping, existe, esquemas });

if (errores.length) {
  console.error(`\n✗ La tienda no se publica: hay ${errores.length} cosa(s) que arreglar.\n`);
  for (const e of errores) console.error(`  ✗ ${e}`);
  console.error("");
  process.exit(1);
}

/* ---------- escribir ---------- */
/* La imagen al compartir (og:image): 1200×630 en JPG, la foto entera sobre blanco. La
   hace sharp y no ffmpeg, porque ffmpeg no está en Workers Builds. Se guardan en
   .cache/og/ (solo se rehacen si cambia la foto) y se copian a dist/ junto a su foto:
   /products/x/img/1.webp → /products/x/img/1.og.jpg. Sin sharp, la foto tal cual. */
const sharp = await import("sharp").then((m) => m.default).catch(() => null);
if (!sharp) console.warn("⚠ sin sharp (npm install): al compartir sale la foto tal cual");
const ogs = new Set();
const og = (src) => (sharp ? (ogs.add(src), src.replace(/\.webp$/, ".og.jpg")) : null);

const sitio = crearSitio({ site, about, products, authors, events, fijas, existe, og });

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });
cpSync(join(ROOT, "public"), OUT, { recursive: true });
for (const p of sitio.tienda) cpSync(join(ROOT, "products", p.id, "img"), join(OUT, "products", p.id, "img"), { recursive: true });
for (const a of sitio.autoras) {
  if (existe(`authors/${a.id}/img`)) cpSync(join(ROOT, "authors", a.id, "img"), join(OUT, "authors", a.id, "img"), { recursive: true });
}
cpSync(join(ROOT, "data/events"), join(OUT, "data/events"), { recursive: true });

/* El catálogo para el Worker (precios y pesos de verdad al pagar) y para el carrito. */
mkdirSync(join(OUT, "data"), { recursive: true });
writeFileSync(join(OUT, "data/products.json"), JSON.stringify(sitio.catalogo(), null, 1));
writeFileSync(join(OUT, "data/shipping.json"), JSON.stringify(shipping, null, 1));

const rutas = sitio.rutas();
for (const r of rutas) {
  const file = join(OUT, r.ruta, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, r.pintar());
}
writeFileSync(join(OUT, "404.html"), sitio.noEncontrada());

for (const src of ogs) {
  const origen = [join(ROOT, src), join(ROOT, "public", src)].find((f) => existsSync(f));
  const cache = join(ROOT, ".cache/og", createHash("sha1").update(src).digest("hex").slice(0, 12) + ".jpg");
  if (!existsSync(cache) || statSync(cache).mtimeMs < statSync(origen).mtimeMs) {
    mkdirSync(dirname(cache), { recursive: true });
    const foto = await sharp(origen).resize(1200 - 96, 630 - 96, { fit: "inside" }).toBuffer(); // 48 px de aire
    await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#fff" } })
      .composite([{ input: foto }]) // centrada
      .jpeg({ quality: 82, mozjpeg: true })
      .toFile(cache);
  }
  cpSync(cache, join(OUT, src.replace(/\.webp$/, ".og.jpg")));
}

const publicas = rutas.filter((r) => !r.privada);
writeFileSync(join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + publicas.map((r) => `  <url><loc>${sitio.abs(r.ruta)}</loc></url>`).join("\n") + `\n</urlset>\n`);

console.log(`✓ dist/: ${rutas.length} páginas, ${ogs.size} imágenes para compartir (${site.langs.length} idiomas) · ${sitio.tienda.length} fanzines · ${sitio.autoras.length} autoras · ${events.length} eventos`);
for (const a of avisos) console.log(`  · ${a}`);
