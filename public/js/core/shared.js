/**
 * core/shared.js — utilidades PURAS compartidas por el Worker (src/index.js) y el
 * frontend (core/data.js). Sin dependencias de navegador ni de Workers: solo funciones
 * sobre los datos del catálogo/envíos. Fuente única de verdad para no duplicar lógica
 * (antes estaban copiadas en el servidor y en el front, con riesgo de divergir).
 */

/**
 * Precio de envío de una zona. Dos formatos en data/shipping.json:
 *   - tarifa plana:  { "price": 4.90 }
 *   - por peso:      { "rates": [ { "upTo": <gramos>, "price": <€> }, ... ] }
 * El precio se calcula SIEMPRE aquí (servidor y front usan esta misma función);
 * nunca se acepta del cliente.
 */
export function precioEnvio(zona, gramos = 0) {
  if (!zona) return 0;
  if (Array.isArray(zona.rates)) {
    const tramos = [...zona.rates].sort((a, b) => a.upTo - b.upTo);
    for (const tr of tramos) if (gramos <= tr.upTo) return Number(tr.price) || 0;
    return Number(tramos[tramos.length - 1]?.price) || 0;
  }
  return Number(zona.price) || 0;
}

/** Etiqueta de una zona para el checkout (name string, objeto {es,…}, o el id). */
export function nombreDeZona(zona) {
  if (typeof zona?.name === "string") return zona.name;
  return zona?.name?.es || zona?.zone || "";
}

/** Zona de recogida en mano: "pickup": true o zona llamada "recogida" (no pide dirección). */
export function esZonaRecogida(zona) {
  return zona?.pickup === true || zona?.zone === "recogida";
}
