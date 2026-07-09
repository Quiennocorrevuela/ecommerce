/**
 * core/shared.js — utilidades PURAS compartidas por el Worker (src/index.js) y el
 * frontend (core/data.js). Sin dependencias de navegador ni de Workers: solo funciones
 * sobre los datos del catálogo/envíos. Fuente única de verdad para no duplicar lógica
 * (antes estaban copiadas en el servidor y en el front, con riesgo de divergir).
 */

/** stockInicial: número → {_: n}; objeto {talla: n} → normalizado; otro → {}. */
export function normalizeStockInicial(si) {
  if (typeof si === "number" && Number.isFinite(si)) return { _: Math.max(0, si) };
  if (si && typeof si === "object") {
    const out = {};
    for (const [k, v] of Object.entries(si)) out[k] = Math.max(0, Number(v) || 0);
    return out;
  }
  return {};
}

/**
 * Precio de envío de una zona. Soporta dos formatos en envios.json:
 *   - tarifa plana:  { "precio": 4.90 }
 *   - por peso:      { "tramos": [ { "hasta": <gramos>, "precio": <€> }, ... ] }
 * El precio se calcula SIEMPRE aquí (servidor y front usan esta misma función);
 * nunca se acepta del cliente.
 */
export function precioEnvio(zona, gramos = 0) {
  if (!zona) return 0;
  if (Array.isArray(zona.tramos)) {
    const tramos = [...zona.tramos].sort((a, b) => a.hasta - b.hasta);
    for (const tr of tramos) if (gramos <= tr.hasta) return Number(tr.precio) || 0;
    return Number(tramos[tramos.length - 1]?.precio) || 0;
  }
  return Number(zona.precio) || 0;
}

/** Etiqueta de una zona para el checkout (nombre string, objeto i18n {es,…}, o el id). */
export function nombreDeZona(zona) {
  if (typeof zona?.nombre === "string") return zona.nombre;
  return zona?.nombre?.es || zona?.zona || "";
}

/** Zona de recogida en mano: flag "recogida": true o zona llamada "recogida" (no pide dirección). */
export function esZonaRecogida(zona) {
  return zona?.recogida === true || zona?.zona === "recogida";
}
