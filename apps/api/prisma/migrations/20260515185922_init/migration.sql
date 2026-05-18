-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR');

-- CreateEnum
CREATE TYPE "Criticidad" AS ENUM ('CRITICO', 'ALTO', 'MEDIO', 'BAJO');

-- CreateEnum
CREATE TYPE "TipoMovimiento" AS ENUM ('ENTRADA', 'SALIDA', 'AJUSTE_POSITIVO', 'AJUSTE_NEGATIVO', 'TRANSFERENCIA', 'DEVOLUCION', 'MERMA');

-- CreateEnum
CREATE TYPE "TipoAlerta" AS ENUM ('STOCK_BAJO', 'QUIEBRE_STOCK', 'DIFERENCIA_SAP', 'PRODUCTO_CRITICO', 'ANOMALIA_CONSUMO', 'SOBRECONSUMO', 'REPOSICION_URGENTE', 'LEAD_TIME_VENCIDO', 'INVENTARIO_PENDIENTE');

-- CreateEnum
CREATE TYPE "PrioridadAlerta" AS ENUM ('CRITICA', 'ALTA', 'MEDIA', 'BAJA');

-- CreateEnum
CREATE TYPE "EstadoAlerta" AS ENUM ('ACTIVA', 'RECONOCIDA', 'RESUELTA', 'DESCARTADA');

-- CreateEnum
CREATE TYPE "EstadoUpload" AS ENUM ('PENDIENTE', 'PROCESANDO', 'COMPLETADO', 'ERROR', 'PARCIAL');

-- CreateTable
CREATE TABLE "usuarios" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "apellido" TEXT NOT NULL,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'OPERADOR',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "usuarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categorias" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "color" TEXT DEFAULT '#6366f1',
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categorias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bodegas" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "ubicacion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bodegas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "proveedores" (
    "id" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "contacto" TEXT,
    "email" TEXT,
    "telefono" TEXT,
    "lead_time_dias" INTEGER NOT NULL DEFAULT 21,
    "confiabilidad" DOUBLE PRECISION DEFAULT 0.95,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "proveedores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productos" (
    "id" TEXT NOT NULL,
    "codigo_producto" TEXT NOT NULL,
    "codigo_sap" TEXT,
    "descripcion" TEXT NOT NULL,
    "unidad_medida" TEXT NOT NULL DEFAULT 'UN',
    "categoria_id" TEXT NOT NULL,
    "proveedor_id" TEXT,
    "stock_actual" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock_minimo" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "stock_maximo" DOUBLE PRECISION,
    "stock_seguridad" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "punto_pedido" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lead_time_dias" INTEGER NOT NULL DEFAULT 21,
    "criticidad" "Criticidad" NOT NULL DEFAULT 'MEDIO',
    "precio_unitario" DOUBLE PRECISION,
    "demanda_promedio" DOUBLE PRECISION,
    "dias_cobertura" DOUBLE PRECISION,
    "ultimo_movimiento" TIMESTAMP(3),
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "bodega_id" TEXT,
    "tipo" "TipoMovimiento" NOT NULL,
    "cantidad" DOUBLE PRECISION NOT NULL,
    "cantidad_antes" DOUBLE PRECISION NOT NULL,
    "cantidad_despues" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "referencia" TEXT,
    "origen" TEXT DEFAULT 'MANUAL',
    "upload_id" TEXT,
    "usuario_id" TEXT,
    "observacion" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "movimientos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventario" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "bodega_id" TEXT NOT NULL,
    "stock_fisico" DOUBLE PRECISION NOT NULL,
    "stock_sap" DOUBLE PRECISION NOT NULL,
    "diferencia" DOUBLE PRECISION NOT NULL,
    "fecha_conteo" TIMESTAMP(3) NOT NULL,
    "upload_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sap_diferencias" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "stock_sistema" DOUBLE PRECISION NOT NULL,
    "stock_sap" DOUBLE PRECISION NOT NULL,
    "diferencia" DOUBLE PRECISION NOT NULL,
    "porcentaje_diff" DOUBLE PRECISION NOT NULL,
    "upload_id" TEXT NOT NULL,
    "fecha_deteccion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resuelto" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "sap_diferencias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consumo_historico" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "periodo" TIMESTAMP(3) NOT NULL,
    "tipo_periodo" TEXT NOT NULL,
    "consumo_total" DOUBLE PRECISION NOT NULL,
    "consumo_promedio" DOUBLE PRECISION NOT NULL,
    "consumo_maximo" DOUBLE PRECISION NOT NULL,
    "consumo_minimo" DOUBLE PRECISION NOT NULL,
    "dias_con_movimiento" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consumo_historico_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "alertas" (
    "id" TEXT NOT NULL,
    "producto_id" TEXT NOT NULL,
    "tipo" "TipoAlerta" NOT NULL,
    "prioridad" "PrioridadAlerta" NOT NULL DEFAULT 'MEDIA',
    "estado" "EstadoAlerta" NOT NULL DEFAULT 'ACTIVA',
    "mensaje" TEXT NOT NULL,
    "detalles" JSONB,
    "valor_actual" DOUBLE PRECISION,
    "valor_umbral" DOUBLE PRECISION,
    "acknowledged_by" TEXT,
    "acknowledged_at" TIMESTAMP(3),
    "resolved_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "alertas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uploads" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "nombre_archivo" TEXT NOT NULL,
    "tipo_archivo" TEXT NOT NULL,
    "tamano_bytes" INTEGER NOT NULL,
    "estado" "EstadoUpload" NOT NULL DEFAULT 'PENDIENTE',
    "file_path" TEXT,
    "total_registros" INTEGER,
    "registros_procesados" INTEGER,
    "registros_error" INTEGER,
    "errores" JSONB,
    "metadata" JSONB,
    "procesado_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "uploads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auditoria" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT,
    "accion" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidad_id" TEXT,
    "datos_antes" JSONB,
    "datos_despues" JSONB,
    "ip" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "configuracion" (
    "id" TEXT NOT NULL,
    "clave" TEXT NOT NULL,
    "valor" TEXT NOT NULL,
    "descripcion" TEXT,
    "tipo" TEXT NOT NULL DEFAULT 'string',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuarios_email_key" ON "usuarios"("email");

-- CreateIndex
CREATE INDEX "usuarios_email_idx" ON "usuarios"("email");

-- CreateIndex
CREATE UNIQUE INDEX "categorias_nombre_key" ON "categorias"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "bodegas_codigo_key" ON "bodegas"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "proveedores_codigo_key" ON "proveedores"("codigo");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_producto_key" ON "productos"("codigo_producto");

-- CreateIndex
CREATE UNIQUE INDEX "productos_codigo_sap_key" ON "productos"("codigo_sap");

-- CreateIndex
CREATE INDEX "productos_codigo_producto_idx" ON "productos"("codigo_producto");

-- CreateIndex
CREATE INDEX "productos_codigo_sap_idx" ON "productos"("codigo_sap");

-- CreateIndex
CREATE INDEX "productos_criticidad_idx" ON "productos"("criticidad");

-- CreateIndex
CREATE INDEX "productos_stock_actual_idx" ON "productos"("stock_actual");

-- CreateIndex
CREATE INDEX "productos_categoria_id_idx" ON "productos"("categoria_id");

-- CreateIndex
CREATE INDEX "productos_activo_idx" ON "productos"("activo");

-- CreateIndex
CREATE INDEX "movimientos_producto_id_idx" ON "movimientos"("producto_id");

-- CreateIndex
CREATE INDEX "movimientos_fecha_idx" ON "movimientos"("fecha");

-- CreateIndex
CREATE INDEX "movimientos_tipo_idx" ON "movimientos"("tipo");

-- CreateIndex
CREATE INDEX "movimientos_upload_id_idx" ON "movimientos"("upload_id");

-- CreateIndex
CREATE INDEX "inventario_producto_id_idx" ON "inventario"("producto_id");

-- CreateIndex
CREATE INDEX "inventario_fecha_conteo_idx" ON "inventario"("fecha_conteo");

-- CreateIndex
CREATE INDEX "sap_diferencias_producto_id_idx" ON "sap_diferencias"("producto_id");

-- CreateIndex
CREATE INDEX "sap_diferencias_resuelto_idx" ON "sap_diferencias"("resuelto");

-- CreateIndex
CREATE INDEX "consumo_historico_producto_id_idx" ON "consumo_historico"("producto_id");

-- CreateIndex
CREATE INDEX "consumo_historico_periodo_idx" ON "consumo_historico"("periodo");

-- CreateIndex
CREATE UNIQUE INDEX "consumo_historico_producto_id_periodo_tipo_periodo_key" ON "consumo_historico"("producto_id", "periodo", "tipo_periodo");

-- CreateIndex
CREATE INDEX "alertas_producto_id_idx" ON "alertas"("producto_id");

-- CreateIndex
CREATE INDEX "alertas_estado_idx" ON "alertas"("estado");

-- CreateIndex
CREATE INDEX "alertas_tipo_idx" ON "alertas"("tipo");

-- CreateIndex
CREATE INDEX "alertas_prioridad_idx" ON "alertas"("prioridad");

-- CreateIndex
CREATE INDEX "alertas_created_at_idx" ON "alertas"("created_at");

-- CreateIndex
CREATE INDEX "uploads_estado_idx" ON "uploads"("estado");

-- CreateIndex
CREATE INDEX "uploads_usuario_id_idx" ON "uploads"("usuario_id");

-- CreateIndex
CREATE INDEX "uploads_created_at_idx" ON "uploads"("created_at");

-- CreateIndex
CREATE INDEX "auditoria_usuario_id_idx" ON "auditoria"("usuario_id");

-- CreateIndex
CREATE INDEX "auditoria_entidad_idx" ON "auditoria"("entidad");

-- CreateIndex
CREATE INDEX "auditoria_created_at_idx" ON "auditoria"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "configuracion_clave_key" ON "configuracion"("clave");

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_categoria_id_fkey" FOREIGN KEY ("categoria_id") REFERENCES "categorias"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productos" ADD CONSTRAINT "productos_proveedor_id_fkey" FOREIGN KEY ("proveedor_id") REFERENCES "proveedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_bodega_id_fkey" FOREIGN KEY ("bodega_id") REFERENCES "bodegas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos" ADD CONSTRAINT "movimientos_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_bodega_id_fkey" FOREIGN KEY ("bodega_id") REFERENCES "bodegas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventario" ADD CONSTRAINT "inventario_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sap_diferencias" ADD CONSTRAINT "sap_diferencias_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sap_diferencias" ADD CONSTRAINT "sap_diferencias_upload_id_fkey" FOREIGN KEY ("upload_id") REFERENCES "uploads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consumo_historico" ADD CONSTRAINT "consumo_historico_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_producto_id_fkey" FOREIGN KEY ("producto_id") REFERENCES "productos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "alertas" ADD CONSTRAINT "alertas_acknowledged_by_fkey" FOREIGN KEY ("acknowledged_by") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "uploads" ADD CONSTRAINT "uploads_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE SET NULL ON UPDATE CASCADE;
