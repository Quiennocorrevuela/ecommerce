/**
 * core/data.js — utilidades y lo poco que la página pide en vivo.
 *
 * Las páginas ya llegan con el contenido dentro (lo escribe build/build.mjs): aquí solo
 * queda lo que cambia sin publicar, el stock (/api/stock), y el catálogo en JSON
 * (/data/products.json, también del build) para el carrito.
 *
 * Este fichero lo importa también el build (escapeHtml, formatPrice): nada de DOM fuera
 * de las funciones.
 */
import { CONFIG } from "./config.js";
import { precioEnvio } from "./shared.js";
import { I18N } from "./i18n.js";

// Re-exportada desde el módulo compartido para no romper quien la importa de aquí (p. ej. checkout.js).
export { precioEnvio };

// ─── utilidades ──────────────────────────────────────────
export function escapeHtml(str) {
  return String(str ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }[c]));
}

export function formatPrice(eur) {
  return new Intl.NumberFormat("es-ES", {
    style: "currency",
    currency: CONFIG.MONEDA || "EUR",
  }).format(Number(eur) || 0);
}

// ─── catálogo y stock ────────────────────────────────────
async function getJSON(path) {
  const res = await fetch(path, { cache: "no-cache" });
  if (!res.ok) throw new Error(`${path} no disponible (HTTP ${res.status})`);
  return res.json();
}

/** El catálogo que escribe el build: [{id, title, author, price, weight, photos, soldOut, comingSoon}]. */
let catalogoP = null;
export const fetchCatalogo = () => (catalogoP ||= getJSON("/data/products.json"));
export const fetchEnvios = () => getJSON("/data/shipping.json");

/** El stock vivo {id: {talla: n}}, o null si no hay backend (vista previa sin Worker). */
let stockP = null;
export function stockVivo() {
  return (stockP ||= fetch(`${CONFIG.API_BASE}/stock`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null));
}

export const unidades = (stock, id) =>
  Object.values(stock?.[id] || {}).reduce((n, v) => n + Number(v || 0), 0);

/**
 * Las fichas (tarjetas de la tienda y de una autora) llegan dibujadas como disponibles;
 * con el stock vivo, las que no tienen unidades pasan a "agotado". Las marcadas a mano
 * (soldOut en el JSON) ya vienen agotadas del build, y las de "próximamente" no se tocan.
 * Sin backend no se cambia nada: el servidor vuelve a mirar el stock al pagar.
 */
export async function marcarAgotados(root = document) {
  const stock = await stockVivo();
  if (!stock) return;
  const soldout = `<span class="soldout"><span class="dot" aria-hidden="true"></span><span class="txt">${I18N.s("product.soldout")}</span></span>`;
  root.querySelectorAll("a.card[data-id]:not([data-soon])").forEach((card) => {
    if (unidades(stock, card.dataset.id) > 0 || card.classList.contains("is-agotado")) return;
    card.classList.add("is-agotado");
    const precio = card.querySelector(".precio");
    if (precio) precio.innerHTML = soldout;
  });
}
