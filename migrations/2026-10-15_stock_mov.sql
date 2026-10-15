-- Migración: el registro del stock (stock_mov). Si ya había stock, entra como
-- una línea "inicial" por producto, para que la suma del registro cuadre.
-- No hace falta lanzarla a mano: el Worker crea la tabla la primera vez que la
-- necesita (ensureRegistro en src/index.js). Está aquí por si se quiere hacer antes:
--   npx wrangler d1 execute shop --remote --file=./migrations/2026-10-15_stock_mov.sql

CREATE TABLE IF NOT EXISTS stock_mov (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  producto_id TEXT NOT NULL,
  talla       TEXT NOT NULL DEFAULT '_',
  cambio      INTEGER NOT NULL,   -- +20 entran, -1 se vende
  motivo      TEXT NOT NULL,      -- inicial | entrada | salida | ajuste | venta
  nota        TEXT,
  pedido_id   TEXT,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT INTO stock_mov (producto_id, talla, cambio, motivo, nota)
SELECT producto_id, talla, cantidad, 'inicial', 'stock al empezar el registro'
  FROM stock WHERE cantidad > 0 AND NOT EXISTS (SELECT 1 FROM stock_mov);
