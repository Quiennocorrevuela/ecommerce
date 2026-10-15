/**
 * pages/calendario.js — línea temporal de ferias/eventos.
 *
 *  - Eventos en scroll horizontal, ordenados viejo (izq) → nuevo (der). Vienen en el HTML.
 *  - Marcador FIJO en el centro (︿ + día + hora): siempre centrado. La hora sólo aparece
 *    cuando el centro coincide con "hoy".
 *  - Al cargar, se centra el momento ACTUAL (hora de España, Europe/Madrid, sin permisos).
 *  - Al desplazarte, el día del marcador cambia al del evento que tengas centrado.
 */
import { mountLayout } from "../core/layout.js";

mountLayout();

const TZ = "Europe/Madrid";
const track = document.querySelector("[data-cal-track]");
const marker = document.querySelector("[data-marker]");
const mDate = document.querySelector("[data-marker-date]");

/** Hoy en España como "YYYY-MM-DD". */
const hoyISO = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());

const ddmm = (iso) => { const [, m, d] = iso.split("-"); return `${d}/${m}`; };

const nowSlotHTML = (hoy) =>
  `<div class="cal-now" data-snap data-now-slot data-fecha="${ddmm(hoy)}" data-iso="${hoy}"></div>`;

/** Los eventos vienen en el HTML, de viejo a nuevo. Falta el hueco de "hoy", que va
    delante del primero que aún no ha acabado (o al final, si ya han pasado todos). */
function ponerHoy() {
  if (!track) return;
  const hoy = hoyISO();
  const siguiente = [...track.querySelectorAll(".evento")].find((ev) => ev.dataset.fin >= hoy);
  if (siguiente) siguiente.insertAdjacentHTML("beforebegin", nowSlotHTML(hoy));
  else track.insertAdjacentHTML("beforeend", nowSlotHTML(hoy));

  // Centra "hoy". Como los carteles no reservan alto hasta cargar, recentramos cuando
  // van cargando (si no, el scroll se calcula sobre un layout colapsado).
  const centrarHoy = () => {
    track.querySelector("[data-now-slot]")?.scrollIntoView({ inline: "center", block: "nearest", behavior: "instant" });
    updateMarker();
  };
  requestAnimationFrame(centrarHoy);
  track.querySelectorAll(".evento-cartel img").forEach((im) => {
    if (!im.complete) im.addEventListener("load", centrarHoy, { once: true });
  });
}

function nearestToCenter() {
  const r = track.getBoundingClientRect();
  const cx = r.left + r.width / 2;
  let best = null, bestD = Infinity;
  track.querySelectorAll("[data-snap]").forEach((el) => {
    const er = el.getBoundingClientRect();
    const d = Math.abs(er.left + er.width / 2 - cx);
    if (d < bestD) { bestD = d; best = el; }
  });
  return best;
}

function updateMarker() {
  const el = nearestToCenter();
  if (!el || !mDate) return;
  track.querySelectorAll(".is-center").forEach((e) => e.classList.remove("is-center"));
  el.classList.add("is-center");
  mDate.textContent = el.dataset.fecha;
  marker.hidden = false;
}

let ticking = false;
track?.addEventListener("scroll", () => {
  if (ticking) return;
  ticking = true;
  requestAnimationFrame(() => { updateMarker(); ticking = false; });
});

// Flechas del marcador: saltan al evento anterior/siguiente (‹ más antiguo, › más nuevo).
function scrollToAdjacent(dir) {
  if (!track) return;
  const snaps = [...track.querySelectorAll("[data-snap]")];
  const i = snaps.indexOf(nearestToCenter());
  snaps[i + dir]?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
}
document.querySelector("[data-cal-prev]")?.addEventListener("click", () => scrollToAdjacent(-1));
document.querySelector("[data-cal-next]")?.addEventListener("click", () => scrollToAdjacent(1));

// Teclado: ← / → mueven al evento anterior/siguiente (natural en portátil sin trackpad).
document.addEventListener("keydown", (e) => {
  if (e.key === "ArrowLeft") { e.preventDefault(); scrollToAdjacent(-1); }
  else if (e.key === "ArrowRight") { e.preventDefault(); scrollToAdjacent(1); }
});

ponerHoy();
