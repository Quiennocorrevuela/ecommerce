/**
 * pages/producto.js — ficha de un fanzine.
 * La ficha llega entera en el HTML (build/paginas.mjs). Aquí: la galería (‹ ›, miniaturas
 * y ampliar), el botón de añadir según el stock vivo, y el carrito.
 */
import { mountLayout } from "../core/layout.js";
import { I18N } from "../core/i18n.js";
import { fetchCatalogo, stockVivo, unidades } from "../core/data.js";
import { addToCart } from "../core/cart.js";
import { toast } from "../core/ui.js";

mountLayout();

const root = document.querySelector("[data-producto]");
let p = null;
let idx = 0;

function galeria() {
  const stage = root.querySelector("[data-stage]");
  if (!stage) return;
  const go = (n) => {
    idx = (n + p.photos.length) % p.photos.length;
    stage.src = p.photos[idx];
    const activa = root.querySelectorAll("[data-thumb]");
    activa.forEach((t, i) => t.classList.toggle("on", i === idx));
    activa[idx]?.scrollIntoView({ block: "nearest", inline: "nearest" });
  };
  root.querySelector("[data-prev]")?.addEventListener("click", () => go(idx - 1));
  root.querySelector("[data-next]")?.addEventListener("click", () => go(idx + 1));
  root.querySelectorAll("[data-thumb]").forEach((t) =>
    t.addEventListener("click", () => go(Number(t.dataset.thumb)))
  );
  // Clic en la imagen → ampliar a pantalla completa (lightbox).
  stage.addEventListener("click", () => openLightbox(idx));
}

/** El botón llega como "añadir"; sin unidades en el stock vivo pasa a "agotado". */
async function boton() {
  const btn = root.querySelector("[data-add]");
  if (!btn) return; // próximamente, o agotado a mano en el JSON
  const stock = await stockVivo();
  if (stock && unidades(stock, p.id) <= 0) {
    btn.disabled = true;
    btn.removeAttribute("data-add");
    btn.textContent = I18N.s("product.soldout");
    return;
  }
  btn.addEventListener("click", () => {
    addToCart({ id: p.id, titulo: [].concat(p.title), autor: p.author, precio: p.price, peso: p.weight || 0, img: p.photos[0] || "" });
    toast(I18N.s("product.added"));
  });
}

// ─── lightbox (ampliar imagen) ───────────────────────────
let lbIdx = 0;
function lbSync() {
  const img = document.querySelector(".qnc-lightbox .lb-img");
  if (img) img.src = p.photos[lbIdx];
}
function lbGo(d) { lbIdx = (lbIdx + d + p.photos.length) % p.photos.length; lbSync(); }
function closeLightbox() { document.querySelector(".qnc-lightbox")?.classList.remove("show"); }
function lbKey(e) {
  const ov = document.querySelector(".qnc-lightbox");
  if (!ov || !ov.classList.contains("show")) return;
  if (e.key === "Escape") closeLightbox();
  else if (e.key === "ArrowLeft") lbGo(-1);
  else if (e.key === "ArrowRight") lbGo(1);
}
function openLightbox(startIdx) {
  if (!p?.photos?.length) return;
  lbIdx = startIdx;
  let ov = document.querySelector(".qnc-lightbox");
  if (!ov) {
    ov = document.createElement("div");
    ov.className = "qnc-lightbox";
    ov.innerHTML = `
      <button class="lb-close" type="button" aria-label="cerrar">×</button>
      <button class="lb-nav prev" type="button" aria-label="anterior">‹</button>
      <img class="lb-img" alt="">
      <button class="lb-nav next" type="button" aria-label="siguiente">›</button>`;
    document.body.appendChild(ov);
    ov.querySelector(".lb-close").addEventListener("click", closeLightbox);
    ov.querySelector(".lb-img").addEventListener("click", closeLightbox);
    ov.addEventListener("click", (e) => { if (e.target === ov) closeLightbox(); });
    ov.querySelector(".lb-nav.prev").addEventListener("click", (e) => { e.stopPropagation(); lbGo(-1); });
    ov.querySelector(".lb-nav.next").addEventListener("click", (e) => { e.stopPropagation(); lbGo(1); });
    document.addEventListener("keydown", lbKey);
  }
  ov.querySelectorAll(".lb-nav").forEach((b) => (b.hidden = p.photos.length < 2));
  lbSync();
  ov.classList.add("show");
}

async function init() {
  if (!root) return;
  p = (await fetchCatalogo().catch(() => [])).find((x) => x.id === root.dataset.id);
  if (!p) return;
  galeria();
  boton();
}

init();
