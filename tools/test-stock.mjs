/**
 * tools/test-stock.mjs — prueba el stock y su registro contra el Worker en local.
 *
 * Con el Worker levantado así (una D1 local aparte, para no tocar la tuya):
 *   npx wrangler dev --port 8790 --persist-to .wrangler/prueba \
 *     --var ADMIN_TOKEN:tok-pruebas --var STRIPE_WEBHOOK_SECRET:whsec_pruebas \
 *     --var STRIPE_SECRET_KEY:sk_test_pruebas
 * (se puede repetir sobre la misma base) y en otra terminal:
 *   node tools/test-stock.mjs
 *
 * Firma el webhook de Stripe de verdad (HMAC con el mismo secreto) y comprueba
 * que una venta baja el stock y queda apuntada, y que un webhook repetido no
 * descuenta dos veces.
 */
import { createHmac } from "node:crypto";

const BASE = process.env.BASE || "http://127.0.0.1:8790/api";
const AUTH = { Authorization: "Bearer tok-pruebas", "Content-Type": "application/json" };
const ID = "la-mort-i-la-primavera";

let ok = 0, ko = 0;
const comprobar = (nombre, cond, detalle) => {
  if (cond) { ok++; console.log(`  ✓ ${nombre}`); }
  else { ko++; console.log(`  ✗ ${nombre}\n     ${JSON.stringify(detalle)}`); }
};
const stock = async () => (await (await fetch(`${BASE}/stock`)).json())[ID]?._ ?? 0;
const registro = async () => (await fetch(`${BASE}/admin/stock-mov?id=${ID}`, { headers: AUTH })).json();
const mover = (productos, nota) => fetch(`${BASE}/admin/stock-bulk`, {
  method: "POST", headers: AUTH, body: JSON.stringify({ productos, nota }) }).then((r) => r.json());

console.log("registro");
const antes = await stock();
let reg = await registro();
comprobar("sin token → 401", (await fetch(`${BASE}/admin/stock-mov`)).status === 401);
// la primera vez, con lo que había; si se repite la prueba, ya está
comprobar("el registro arranca con lo que había (inicial)",
  reg.some((m) => m.motivo === "inicial") || antes === 0, reg);

await mover([{ id: ID, suma: 20 }], "llegan 20");
comprobar("añadir 20 suma", (await stock()) === antes + 20);
reg = await registro();
comprobar("queda la entrada con su nota", reg[0].motivo === "entrada" && reg[0].cambio === 20 && reg[0].nota === "llegan 20", reg[0]);

await mover([{ id: ID, suma: -(antes + 999) }]);
comprobar("quitar más de lo que hay deja 0", (await stock()) === 0);
reg = await registro();
comprobar("y apunta lo que bajó de verdad", reg[0].motivo === "salida" && reg[0].cambio === -(antes + 20), reg[0]);

await mover([{ id: ID, stockByTalla: { _: 5 } }]);
comprobar("fijar a 5 (formato semilla) queda como ajuste", (await stock()) === 5 && (await registro())[0].motivo === "ajuste");

console.log("venta (webhook firmado)");
const cuerpo = JSON.stringify({
  id: "evt_1", type: "checkout.session.completed",
  data: { object: {
    id: `cs_test_${Date.now()}`, amount_total: 5000, currency: "eur",
    customer_details: { email: "compra@prueba.cat", name: "Ada" },
    metadata: { carrito: JSON.stringify([{ id: ID, cantidad: 2 }]), zona: "recogida" },
  } },
});
const firma = () => {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac("sha256", "whsec_pruebas").update(`${t}.${cuerpo}`).digest("hex")}`;
};
const webhook = () => fetch(`${BASE}/stripe-webhook`, { method: "POST", headers: { "stripe-signature": firma() }, body: cuerpo });

const ventas = async () => (await registro()).filter((m) => m.motivo === "venta").length;
const ventasAntes = await ventas();
comprobar("webhook → 200", (await webhook()).ok);
comprobar("el stock bajó de 5 a 3", (await stock()) === 3);
reg = await registro();
comprobar("la venta queda apuntada con su pedido", reg[0].motivo === "venta" && reg[0].cambio === -2 && /^ord_/.test(reg[0].pedido_id), reg[0]);
await webhook();
comprobar("webhook repetido: el stock no vuelve a bajar", (await stock()) === 3);
comprobar("ni se apunta otra venta", (await ventas()) === ventasAntes + 1);

console.log("sobreventa");
await mover([{ id: ID, stockByTalla: { _: 1 } }]);
const otro = cuerpo.replace(/cs_test_\d+/, `cs_test_${Date.now()}b`);
const firma2 = () => {
  const t = Math.floor(Date.now() / 1000);
  return `t=${t},v1=${createHmac("sha256", "whsec_pruebas").update(`${t}.${otro}`).digest("hex")}`;
};
await fetch(`${BASE}/stripe-webhook`, { method: "POST", headers: { "stripe-signature": firma2() }, body: otro });
const sesion = JSON.parse(otro).data.object.id;
const pedido = (await (await fetch(`${BASE}/admin/historial?limit=20`, { headers: AUTH })).json())
  .find((p) => p.stripe_session_id === sesion);
comprobar("pedir 2 cuando queda 1: el pedido nace como «revisar»", pedido?.estado === "revisar", pedido);
comprobar("y el stock se queda en 0, no en negativo", (await stock()) === 0);
reg = await registro();
comprobar("el registro apunta lo que había de verdad", reg[0].cambio === -1 && /quedaban 1/.test(reg[0].nota), reg[0]);

console.log(ko ? `\n✗ ${ko} fallo(s) de ${ok + ko}` : `\n✓ ${ok} comprobaciones, 0 fallos`);
process.exit(ko ? 1 : 0);
