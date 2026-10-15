/**
 * core/ui.js — fragmentos de HTML reutilizables entre páginas.
 */

let toastTimer = null;
/** Muestra un aviso flotante temporal (p.ej. "añadido al carrito"). */
export function toast(msg) {
  let el = document.querySelector(".qnc-toast");
  if (!el) {
    el = document.createElement("div");
    el.className = "qnc-toast";
    document.body.appendChild(el);
  }
  el.textContent = msg;
  // Reinicia la animación aunque ya estuviera visible.
  el.classList.remove("show");
  void el.offsetWidth;
  el.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove("show"), 1600);
}
