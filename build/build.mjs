/* ============================================================
   build.mjs — escribe la tienda en dist/: un HTML por página e
   idioma, con su contenido dentro, más las fotos, el css y el js.

     node build/build.mjs

   Lo lanza solo `wrangler deploy` (y `wrangler dev`) por el [build]
   de wrangler.toml: en Cloudflare, cada push publica. Si algo de los
   JSON está mal, para con un mensaje en castellano y la tienda se
   queda como estaba.
   ============================================================ */
import { readFileSync, writeFileSync, mkdirSync, rmSync, cpSync, existsSync, readdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { crearSitio } from "./paginas.mjs";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const OUT = join(ROOT, "dist");
const errores = [];
const avisos = [];
const error = (donde, que) => errores.push(`${donde}: ${que}`);
const aviso = (donde, que) => avisos.push(`${donde}: ${que}`);

/** Lee un JSON y, si está mal, dice en qué línea: "position 1432" no le dice nada a nadie. */
function leer(rel) {
  const texto = readFileSync(join(ROOT, rel), "utf8");
  try {
    return JSON.parse(texto);
  } catch (e) {
    /* Node no siempre dice la línea (una coma de más da "Unexpected token ']'"):
       entonces se busca una coma antes de ] o }, o una que falta (un valor y, en la
       línea siguiente, otro). Como en semillaEcommerceJSON. */
    const busca = (re) => { const m = re.exec(texto); return m ? texto.slice(0, m.index).split("\n").length : 0; };
    const pos = Number(/position (\d+)/.exec(e.message)?.[1]);
    let linea = Number(/line (\d+)/.exec(e.message)?.[1])
      || (Number.isFinite(pos) ? texto.slice(0, pos).split("\n").length : 0)
      || busca(/,\s*[\]}]/) || busca(/[\d"\]}]\s*\n\s*["{[]/);
    // "Expected ','": Node se da cuenta en la línea siguiente; la coma falta al final de la anterior
    if (/Expected ','/.test(e.message) && linea > 1 && !/,\s*$/.test(texto.split("\n")[linea - 2])) linea--;
    console.error(`\n✗ ${rel} no es un JSON válido${linea ? `, línea ${linea}:\n    ${texto.split("\n")[linea - 1]?.trim()}` : ""}\n`
      + `  Casi siempre es una coma: que falta entre dos cosas, o que sobra después de la última. O unas comillas sin cerrar.\n`);
    process.exit(1);
  }
}
const carpetas = (dir) => (existsSync(join(ROOT, dir))
  ? readdirSync(join(ROOT, dir), { withFileTypes: true }).filter((d) => d.isDirectory()).map((d) => d.name)
  : []);
const existe = (ruta) => existsSync(join(ROOT, ruta.replace(/^\//, "")));
const SLUG = /^[a-z0-9]+(-[a-z0-9]+)*$/;

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
const numero = (x) => typeof x === "number" && Number.isFinite(x);
for (const [lista, dir, todos] of [["shop", "products", products], ["authors", "authors", authors]]) {
  const vistos = new Set();
  for (const id of site.lists?.[lista]?.projects || []) {
    if (!todos.some((x) => x.id === id)) error("data/site.json", `la lista "${lista}" dice "${id}", pero no hay ninguna carpeta ${dir}/${id}/ con su ${dir === "products" ? "product" : "author"}.json`);
    if (vistos.has(id)) error("data/site.json", `"${id}" está dos veces en la lista "${lista}"`);
    vistos.add(id);
  }
  for (const x of todos) {
    if (!SLUG.test(x.id)) error(`${dir}/${x.id}`, "el nombre de la carpeta solo puede llevar minúsculas, números y guiones: es la dirección de la página");
    if (!vistos.has(x.id)) aviso(`${dir}/${x.id}`, `no está en la lista "${lista}" de data/site.json: no sale en la web`);
  }
}
for (const p of products) {
  const d = `products/${p.id}`;
  if (!p.title) error(d, 'falta "title"');
  if (!numero(p.price)) error(d, `"price" tiene que ser un número, con punto y sin comillas: 12.5 (y es ${JSON.stringify(p.price)})`);
  if (!numero(p.weight)) error(d, `"weight" son los gramos, un número sin comillas: 90 (y es ${JSON.stringify(p.weight)})`);
  if (!p.author) error(d, 'falta "author", el nombre de la autora como se ve');
  if (!Array.isArray(p.photos)) error(d, '"photos" tiene que ser una lista: ["1", "2", "3"]');
  for (const n of p.photos || []) {
    if (!existe(`${d}/img/${n}.webp`)) error(d, `"photos" dice "${n}", pero no hay ningún img/${n}.webp (pásala por imgToWeb)`);
  }
}
for (const a of authors) if (!a.name) error(`authors/${a.id}`, 'falta "name"');
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
events.forEach((ev, i) => {
  const d = `data/events.json, evento ${ev.id || i + 1}`;
  if (!ev.id || !SLUG.test(ev.id)) error(d, '"id" en minúsculas y con guiones: es el nombre de su cartel, data/events/<id>.webp');
  if (!FECHA.test(ev.start || "")) error(d, `"start" tiene que ser AAAA-MM-DD (y es "${ev.start ?? ""}")`);
  if (ev.end && !FECHA.test(ev.end)) error(d, `"end" tiene que ser AAAA-MM-DD (y es "${ev.end}")`);
});
shipping.forEach((z, i) => {
  if (!z.zone) error("data/shipping.json", `a la zona ${i + 1} le falta "zone"`);
  if (!Array.isArray(z.rates) && !numero(z.price)) error("data/shipping.json", `la zona "${z.zone}" necesita "rates" (por peso) o "price" (fijo)`);
});

if (errores.length) {
  console.error(`\n✗ La tienda no se publica: hay ${errores.length} cosa(s) que arreglar.\n`);
  for (const e of errores) console.error(`  ✗ ${e}`);
  console.error("");
  process.exit(1);
}

/* ---------- escribir ---------- */
const sitio = crearSitio({ site, about, products, authors, events, fijas, existe });

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
writeFileSync(join(OUT, "data/products.json"), JSON.stringify(sitio.tienda.map((p) => ({
  id: p.id, title: p.title, author: p.author, authorId: p.authorId, price: p.price, weight: p.weight,
  photos: (p.photos || []).map((n) => `/products/${p.id}/img/${n}.webp`),
  ...(p.soldOut ? { soldOut: true } : {}), ...(p.comingSoon ? { comingSoon: true } : {}),
})), null, 1));
writeFileSync(join(OUT, "data/shipping.json"), JSON.stringify(shipping, null, 1));

const rutas = sitio.rutas();
for (const r of rutas) {
  const file = join(OUT, r.ruta, "index.html");
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, r.pintar());
}
writeFileSync(join(OUT, "404.html"), sitio.noEncontrada());

const publicas = rutas.filter((r) => !r.privada);
writeFileSync(join(OUT, "sitemap.xml"),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n`
  + publicas.map((r) => `  <url><loc>${sitio.abs(r.ruta)}</loc></url>`).join("\n") + `\n</urlset>\n`);

console.log(`✓ dist/: ${rutas.length} páginas (${site.langs.length} idiomas) · ${sitio.tienda.length} fanzines · ${sitio.autoras.length} autoras · ${events.length} eventos`);
for (const a of avisos) console.log(`  · ${a}`);
