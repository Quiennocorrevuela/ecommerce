/**
 * core/layout.js — cabecera y menú compartidos.
 *
 * La cabecera y el menú ya vienen en el HTML (build/paginas.mjs). Aquí solo se abre y
 * se cierra el menú y se pinta el número del carrito. Llamar una vez por página.
 */
import { renderCartBadge } from "./cart.js";

function wire() {
  const menu = document.querySelector("[data-menu]");
  const overlay = document.querySelector("[data-menu-overlay]");
  const open = () => { document.body.classList.add("menu-open"); menu?.setAttribute("aria-hidden", "false"); };
  const close = () => { document.body.classList.remove("menu-open"); menu?.setAttribute("aria-hidden", "true"); };

  document.querySelector("[data-menu-open]")?.addEventListener("click", open);
  document.querySelector("[data-menu-close]")?.addEventListener("click", close);
  overlay?.addEventListener("click", close);
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });
}

export function mountLayout() {
  wire();
  renderCartBadge();
}
