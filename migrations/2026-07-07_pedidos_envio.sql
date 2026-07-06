-- Migración: pedidos guarda zona de envío, dirección (de Stripe) y estado.
-- Solo hace falta en bases creadas ANTES del 2026-07-07 (schema.sql ya trae las columnas).
-- Aplica con:  npm run db:migrate   (remoto)  ·  npm run db:migrate:local  (local)

ALTER TABLE pedidos ADD COLUMN zona TEXT;
ALTER TABLE pedidos ADD COLUMN envio TEXT;
ALTER TABLE pedidos ADD COLUMN estado TEXT NOT NULL DEFAULT 'pendiente';
