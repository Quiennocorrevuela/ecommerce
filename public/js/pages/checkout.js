/**
 * pages/checkout.js — carrito + envío por peso + sesión Stripe.
 * El backend revalida precio/stock y RECALCULA el envío por peso (autoritativo).
 */
import { mountLayout } from "../core/layout.js";
import { I18N } from "../core/i18n.js";
import { CONFIG } from "../core/config.js";
import { fetchEnvios, fetchCatalogo, stockVivo, escapeHtml, formatPrice, precioEnvio } from "../core/data.js";
import { getCart, cartTotal, cartWeight, setQty, removeItem, revisarCarrito } from "../core/cart.js";

mountLayout();

const listEl = document.querySelector("[data-carrito]");
const resumenEl = document.querySelector("[data-resumen]");

let envios = [];
let zonaSel = null;

const tituloTxt = (it) => (Array.isArray(it.titulo) ? it.titulo.join(" ") : it.titulo || it.nombre || "");
const zonaActual = () => envios.find((z) => z.zone === zonaSel) || envios[0] || null;
const tienda = `${I18N.pre()}/`;

function render() {
  if (!listEl) return;
  const cart = getCart();

  if (!cart.length) {
    listEl.innerHTML = `<p class="estado">${I18N.s("cart.empty")}</p>`;
    resumenEl.innerHTML = `<p><a href="${tienda}">← ${I18N.s("cart.continue")}</a></p>`;
    return;
  }

  listEl.innerHTML = cart
    .map(
      (it) => `
      <div class="carrito-item" data-id="${escapeHtml(it.id)}">
        ${it.img ? `<img src="${it.img}" alt="">` : "<span></span>"}
        <span class="it-titulo">${escapeHtml(tituloTxt(it))}</span>
        <input class="carrito-qty" type="number" min="1" step="1" value="${it.cantidad}" data-qty aria-label="cantidad" />
        <span>${formatPrice(it.precio * it.cantidad)}
          <button class="carrito-remove" data-remove aria-label="quitar">×</button>
        </span>
      </div>`
    )
    .join("");

  listEl.querySelectorAll(".carrito-item").forEach((row) => {
    const id = row.dataset.id;
    const qty = row.querySelector("[data-qty]");
    qty.addEventListener("change", () => { setQty(id, qty.value); render(); });
    row.querySelector("[data-remove]").addEventListener("click", () => { removeItem(id); render(); });
  });

  const peso = cartWeight();
  const subtotal = cartTotal();
  const envio = precioEnvio(zonaActual(), peso);
  const total = subtotal + envio;

  resumenEl.innerHTML = `
    <div class="fila">
      <label>${I18N.s("cart.zone")}:
        <select data-zona>
          ${envios.map((z) => `<option value="${z.zone}" ${z.zone === zonaSel ? "selected" : ""}>${escapeHtml(I18N.t(z.name))}</option>`).join("")}
        </select>
      </label>
    </div>
    <div class="fila"><span>${I18N.s("cart.weight")}</span><span>${(peso / 1000).toFixed(3).replace(".", ",")} kg</span></div>
    <div class="fila"><span>${I18N.s("cart.subtotal")}</span><span>${formatPrice(subtotal)}</span></div>
    <div class="fila"><span>${I18N.s("cart.shipping")}</span><span>${formatPrice(envio)}</span></div>
    <div class="fila total"><span>${I18N.s("cart.total")}</span><span>${formatPrice(total)}</span></div>
    <button class="btn-pagar" data-pagar>${I18N.s("cart.pay")}</button>
    <p style="margin-top:1rem"><a href="${tienda}">← ${I18N.s("cart.continue")}</a></p>`;

  resumenEl.querySelector("[data-zona]").addEventListener("change", (e) => { zonaSel = e.target.value; render(); });
  resumenEl.querySelector("[data-pagar]").addEventListener("click", pagar);
}

async function pagar(e) {
  const btn = e.currentTarget;
  btn.disabled = true;
  try {
    const res = await fetch(`${CONFIG.API_BASE}/crear-sesion`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ carrito: getCart(), envio: { zona: zonaSel } }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "error");
    window.location.href = data.url;
  } catch (err) {
    console.error(err);
    alert(I18N.s("error.generic") + " " + err.message);
    btn.disabled = false;
  }
}

/** Los avisos de revisarCarrito(), en frases para quien compra. */
function frase(a) {
  if (a.tipo === "desaparecido") return `${a.nombre} ya no está a la venta y se ha quitado de la bolsa.`;
  if (a.tipo === "agotado") return `${a.nombre} se ha agotado y se ha quitado de la bolsa.`;
  if (a.tipo === "menos") return `De ${a.nombre} solo queda${a.quedan === 1 ? "" : "n"} ${a.quedan}: hemos ajustado la cantidad.`;
  if (a.tipo === "precio") return `El precio de ${a.nombre} ha cambiado de ${formatPrice(a.antes)} a ${formatPrice(a.ahora)}.`;
  return "";
}

async function avisosDelCarrito() {
  const [catalogo, stock] = await Promise.all([fetchCatalogo().catch(() => null), stockVivo()]);
  if (!catalogo) return;
  const avisos = await revisarCarrito(catalogo, stock);
  if (!avisos.length) return;
  const caja = document.createElement("div");
  caja.className = "avisos-carrito";
  caja.setAttribute("role", "status");
  caja.innerHTML = `<p><b>La bolsa ha cambiado</b></p><ul>${avisos.map((a) => `<li>${escapeHtml(frase(a))}</li>`).join("")}</ul>`;
  document.querySelector("main")?.prepend(caja);
}

async function init() {
  // Antes de enseñar nada: la bolsa puede tener semanas y el catálogo haber cambiado.
  await avisosDelCarrito();
  try {
    envios = await fetchEnvios();
    zonaSel = (envios.find((z) => z.zone !== "recogida") || envios[0])?.zone || null;
  } catch (err) {
    console.warn("envios:", err);
  }
  render();
}

init();
