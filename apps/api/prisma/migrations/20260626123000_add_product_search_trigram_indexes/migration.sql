CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_productos_descripcion_trgm
  ON productos USING gin (descripcion gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_producto_trgm
  ON productos USING gin (codigo_producto gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_productos_codigo_sap_trgm
  ON productos USING gin (codigo_sap gin_trgm_ops);
