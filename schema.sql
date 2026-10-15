-- schema.sql — esquema D1.
-- El catálogo vive en products/<id>/product.json; aquí solo guardamos lo mutable:
--   • stock      → cantidades por (producto, talla), que bajan con cada venta
--   • stock_mov  → el registro: una línea cada vez que cambia el stock
--   • pedidos    → historial de compras
--
-- Aplica con:  npm run db:init
-- (local)      npm run db:init:local
--
-- Es idempotente (IF NOT EXISTS), así que puedes relanzarlo sin perder datos.
-- Para un reset destructivo, ejecuta DROP TABLE manualmente.

CREATE TABLE IF NOT EXISTS stock (
  producto_id TEXT NOT NULL,
  talla       TEXT NOT NULL DEFAULT '_',
  cantidad    INTEGER NOT NULL DEFAULT 0 CHECK (cantidad >= 0),
  PRIMARY KEY (producto_id, talla)
);

CREATE INDEX IF NOT EXISTS idx_stock_producto ON stock(producto_id);

-- stock_mov → el registro del stock: una línea cada vez que cambia (lo que entra,
-- lo que se vende, lo que se corrige). stock es el número de ahora; esto, de dónde
-- sale. Lo escriben el webhook (ventas) y /admin/stock (entradas y salidas).
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

CREATE INDEX IF NOT EXISTS idx_stock_mov_producto ON stock_mov(producto_id);

CREATE TABLE IF NOT EXISTS pedidos (
  id                 TEXT PRIMARY KEY,
  stripe_session_id  TEXT UNIQUE,
  email              TEXT,
  amount_total       INTEGER,       -- céntimos
  currency           TEXT,
  items              TEXT NOT NULL, -- JSON: [{id, nombre, precio, talla, cantidad}]
  zona               TEXT,          -- zona de envío elegida (data/shipping.json)
  envio              TEXT,          -- JSON: {zona, nombre, direccion, telefono} (de Stripe)
  estado             TEXT NOT NULL DEFAULT 'pendiente', -- pendiente | enviado | entregado | cancelado
  created_at         TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_pedidos_created_at ON pedidos(created_at DESC);

-- newsletter → emails de quien se apunta (UNIQUE evita duplicados)
CREATE TABLE IF NOT EXISTS newsletter (
  email       TEXT PRIMARY KEY,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

-- mensajes → formulario de contacto ("dinos cosas")
CREATE TABLE IF NOT EXISTS mensajes (
  id          TEXT PRIMARY KEY,
  nombre      TEXT,
  email       TEXT,
  texto       TEXT NOT NULL,
  created_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_mensajes_created_at ON mensajes(created_at DESC);
