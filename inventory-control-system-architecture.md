# INVENTORY CONTROL SYSTEM — MASTER ARCHITECTURE DOCUMENT

**Version:** 1.0.0  
**Clasificación:** Enterprise Architecture Blueprint  
**Stack:** Next.js 15 · NestJS · Supabase · Prisma · Python Analytics · BullMQ · Turborepo

---

## TABLA DE CONTENIDOS

1. [Arquitectura Completa del Sistema](#1-arquitectura-completa)
2. [Folder Structure (Monorepo)](#2-folder-structure)
3. [Database Schema](#3-database-schema)
4. [API Architecture](#4-api-architecture)
5. [Backend Architecture (NestJS)](#5-backend-architecture)
6. [Frontend Architecture (Next.js 15)](#6-frontend-architecture)
7. [Analytics Engine (Python)](#7-analytics-engine)
8. [DevOps Strategy](#8-devops-strategy)
9. [Security Strategy](#9-security-strategy)
10. [Scalability Strategy](#10-scalability-strategy)
11. [Performance Strategy](#11-performance-strategy)
12. [SAP Parser Strategy](#12-sap-parser-strategy)
13. [Inventory Calculation Engine](#13-inventory-calculation-engine)
14. [Alert Engine](#14-alert-engine)
15. [Forecasting Engine](#15-forecasting-engine)
16. [Deployment Strategy](#16-deployment-strategy)
17. [Technical Roadmap](#17-technical-roadmap)
18. [Best Practices](#18-best-practices)
19. [Riesgos Técnicos](#19-riesgos-técnicos)
20. [Recomendaciones Enterprise-Grade](#20-recomendaciones-enterprise-grade)

---

## 1. ARQUITECTURA COMPLETA

### Diagrama de Alto Nivel

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE / BROWSER                           │
│                    Next.js 15 (Vercel Edge Network)                 │
└──────────────────────────────┬──────────────────────────────────────┘
                               │ HTTPS / REST / SSE
┌──────────────────────────────▼──────────────────────────────────────┐
│                        API GATEWAY (NestJS)                         │
│              Auth · Rate Limiting · Logging · Validation            │
└──────┬───────────────────────┬──────────────────────────┬───────────┘
       │                       │                          │
┌──────▼──────┐   ┌────────────▼────────┐   ┌────────────▼──────────┐
│  Business   │   │    Queue System     │   │   Analytics Engine    │
│  Logic      │   │  BullMQ + Redis     │   │   Python FastAPI      │
│  Modules    │   │                     │   │   Pandas · NumPy      │
└──────┬──────┘   └────────────┬────────┘   └────────────┬──────────┘
       │                       │                          │
┌──────▼───────────────────────▼──────────────────────────▼──────────┐
│                     Supabase PostgreSQL                             │
│              Prisma ORM · RLS · Audit Logs · Realtime               │
└─────────────────────────────────────────────────────────────────────┘
```

### Flujo Principal de Datos

```
SAP Export (Excel/CSV)
        │
        ▼
  [Upload Service]
   Validación estructura
   Sanitización
        │
        ▼
  [SAP Parser Engine]
   Normalización columnas
   Detección duplicados
   Transformación datos
        │
        ▼
  [Queue: BullMQ]
   Job: process-sap-file
        │
        ▼
  [Inventory Calculator]
   Cálculo métricas
   Actualización stock
   Generación alertas
        │
        ▼
  [Alert Engine]         [Analytics Engine]
  Notificaciones         Forecasting
  Dashboard Updates      Anomalías
        │                      │
        └──────────┬───────────┘
                   ▼
           [PostgreSQL]
           Persistencia
           Historial
                   │
                   ▼
          [Frontend Dashboard]
          KPIs · Gráficos · Alertas
```

---

## 2. FOLDER STRUCTURE

```
inventory-control-system/
│
├── apps/
│   │
│   ├── web/                              # Next.js 15 Frontend
│   │   ├── src/
│   │   │   ├── app/                      # App Router
│   │   │   │   ├── (auth)/
│   │   │   │   │   ├── login/
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── (dashboard)/
│   │   │   │   │   ├── dashboard/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── inventory/
│   │   │   │   │   │   ├── page.tsx
│   │   │   │   │   │   └── [id]/page.tsx
│   │   │   │   │   ├── uploads/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── alerts/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── reports/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   ├── settings/
│   │   │   │   │   │   └── page.tsx
│   │   │   │   │   └── layout.tsx
│   │   │   │   ├── api/                  # API Routes (proxies)
│   │   │   │   └── layout.tsx
│   │   │   ├── components/
│   │   │   │   ├── dashboard/
│   │   │   │   │   ├── KPICard.tsx
│   │   │   │   │   ├── StockChart.tsx
│   │   │   │   │   ├── AlertsFeed.tsx
│   │   │   │   │   └── ConsumptionChart.tsx
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── ProductTable.tsx
│   │   │   │   │   ├── StockBadge.tsx
│   │   │   │   │   └── MovementsLog.tsx
│   │   │   │   ├── uploads/
│   │   │   │   │   ├── FileDropzone.tsx
│   │   │   │   │   ├── FilePreview.tsx
│   │   │   │   │   └── UploadProgress.tsx
│   │   │   │   └── shared/
│   │   │   │       ├── DataTable.tsx
│   │   │   │       └── FilterBar.tsx
│   │   │   ├── hooks/
│   │   │   │   ├── useInventory.ts
│   │   │   │   ├── useAlerts.ts
│   │   │   │   └── useUpload.ts
│   │   │   ├── lib/
│   │   │   │   ├── api-client.ts
│   │   │   │   └── auth.ts
│   │   │   └── stores/
│   │   │       ├── inventory.store.ts
│   │   │       └── alerts.store.ts
│   │   ├── public/
│   │   ├── next.config.ts
│   │   ├── tailwind.config.ts
│   │   └── package.json
│   │
│   ├── api/                              # NestJS Backend
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/
│   │   │   │   │   ├── auth.module.ts
│   │   │   │   │   ├── auth.controller.ts
│   │   │   │   │   ├── auth.service.ts
│   │   │   │   │   ├── strategies/
│   │   │   │   │   │   ├── jwt.strategy.ts
│   │   │   │   │   │   └── local.strategy.ts
│   │   │   │   │   ├── guards/
│   │   │   │   │   │   ├── jwt-auth.guard.ts
│   │   │   │   │   │   └── roles.guard.ts
│   │   │   │   │   └── decorators/
│   │   │   │   │       └── roles.decorator.ts
│   │   │   │   ├── products/
│   │   │   │   │   ├── products.module.ts
│   │   │   │   │   ├── products.controller.ts
│   │   │   │   │   ├── products.service.ts
│   │   │   │   │   ├── products.repository.ts
│   │   │   │   │   └── dto/
│   │   │   │   │       ├── create-product.dto.ts
│   │   │   │   │       ├── update-product.dto.ts
│   │   │   │   │       └── product-filter.dto.ts
│   │   │   │   ├── inventory/
│   │   │   │   │   ├── inventory.module.ts
│   │   │   │   │   ├── inventory.controller.ts
│   │   │   │   │   ├── inventory.service.ts
│   │   │   │   │   ├── inventory.repository.ts
│   │   │   │   │   ├── inventory-calculator.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── uploads/
│   │   │   │   │   ├── uploads.module.ts
│   │   │   │   │   ├── uploads.controller.ts
│   │   │   │   │   ├── uploads.service.ts
│   │   │   │   │   ├── sap-parser/
│   │   │   │   │   │   ├── sap-parser.service.ts
│   │   │   │   │   │   ├── sap-validator.service.ts
│   │   │   │   │   │   ├── sap-normalizer.service.ts
│   │   │   │   │   │   └── column-mapper.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── alerts/
│   │   │   │   │   ├── alerts.module.ts
│   │   │   │   │   ├── alerts.controller.ts
│   │   │   │   │   ├── alerts.service.ts
│   │   │   │   │   ├── alert-engine.service.ts
│   │   │   │   │   └── dto/
│   │   │   │   ├── movements/
│   │   │   │   ├── suppliers/
│   │   │   │   ├── warehouses/
│   │   │   │   ├── reports/
│   │   │   │   │   ├── reports.module.ts
│   │   │   │   │   ├── reports.service.ts
│   │   │   │   │   ├── pdf-generator.service.ts
│   │   │   │   │   └── excel-generator.service.ts
│   │   │   │   └── analytics/
│   │   │   │       ├── analytics.module.ts
│   │   │   │       ├── analytics.controller.ts
│   │   │   │       └── analytics-client.service.ts
│   │   │   ├── queue/
│   │   │   │   ├── processors/
│   │   │   │   │   ├── sap-file.processor.ts
│   │   │   │   │   ├── alert-check.processor.ts
│   │   │   │   │   └── analytics-job.processor.ts
│   │   │   │   └── queue.module.ts
│   │   │   ├── prisma/
│   │   │   │   └── prisma.service.ts
│   │   │   ├── common/
│   │   │   │   ├── filters/
│   │   │   │   │   └── http-exception.filter.ts
│   │   │   │   ├── interceptors/
│   │   │   │   │   ├── logging.interceptor.ts
│   │   │   │   │   └── transform.interceptor.ts
│   │   │   │   ├── middleware/
│   │   │   │   │   └── audit.middleware.ts
│   │   │   │   └── pipes/
│   │   │   │       └── validation.pipe.ts
│   │   │   ├── config/
│   │   │   │   └── configuration.ts
│   │   │   └── main.ts
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── migrations/
│   │   └── package.json
│   │
│   └── analytics/                        # Python FastAPI Microservice
│       ├── src/
│       │   ├── api/
│       │   │   ├── routes/
│       │   │   │   ├── forecasting.py
│       │   │   │   ├── anomalies.py
│       │   │   │   └── calculations.py
│       │   │   └── main.py
│       │   ├── services/
│       │   │   ├── forecast_engine.py
│       │   │   ├── anomaly_detector.py
│       │   │   ├── inventory_calculator.py
│       │   │   └── demand_predictor.py
│       │   ├── models/
│       │   │   └── schemas.py
│       │   └── utils/
│       │       └── data_helpers.py
│       ├── requirements.txt
│       └── Dockerfile
│
├── packages/
│   ├── ui/                               # Shared UI components
│   │   ├── src/
│   │   │   ├── components/
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── shared-types/                     # TypeScript shared types
│   │   ├── src/
│   │   │   ├── inventory.types.ts
│   │   │   ├── product.types.ts
│   │   │   ├── alert.types.ts
│   │   │   ├── sap.types.ts
│   │   │   └── index.ts
│   │   └── package.json
│   │
│   ├── eslint-config/
│   │   ├── index.js
│   │   └── package.json
│   │
│   └── typescript-config/
│       ├── base.json
│       ├── nextjs.json
│       ├── nestjs.json
│       └── package.json
│
├── infrastructure/
│   ├── docker/
│   │   ├── docker-compose.yml
│   │   ├── docker-compose.dev.yml
│   │   └── docker-compose.prod.yml
│   ├── nginx/
│   │   └── nginx.conf
│   └── scripts/
│       ├── setup.sh
│       └── seed.ts
│
├── docs/
│   ├── architecture/
│   ├── api/
│   └── deployment/
│
├── turbo.json
├── package.json
└── README.md
```

---

## 3. DATABASE SCHEMA

### Diagrama Entidad-Relación

```
categorias ──── productos ──── movimientos
                    │               │
                    │           bodegas
                proveedores
                    │
                productos ──── inventario_snapshots
                    │
                    ├──── alertas
                    │
                    └──── consumo_historico

uploads ──── movimientos (origen)
usuarios ──── auditoria
usuarios ──── uploads
usuarios ──── alertas (acknowledged_by)
```

### Schema Prisma Completo

```prisma
// prisma/schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider  = "postgresql"
  url       = env("DATABASE_URL")
  directUrl = env("DIRECT_URL")
}

// ─────────────────────────────────────────
// USUARIOS Y AUTENTICACIÓN
// ─────────────────────────────────────────

enum UserRole {
  ADMINISTRADOR
  SUPERVISOR
  OPERADOR
}

model Usuario {
  id           String    @id @default(cuid())
  email        String    @unique
  nombre       String
  apellido     String
  passwordHash String    @map("password_hash")
  role         UserRole  @default(OPERADOR)
  activo       Boolean   @default(true)
  lastLoginAt  DateTime? @map("last_login_at")
  createdAt    DateTime  @default(now()) @map("created_at")
  updatedAt    DateTime  @updatedAt @map("updated_at")

  uploads   Upload[]
  auditoria Auditoria[]
  alertas   Alerta[]    @relation("AlertaAcknowledgedBy")

  @@map("usuarios")
  @@index([email])
}

// ─────────────────────────────────────────
// ESTRUCTURA ORGANIZACIONAL
// ─────────────────────────────────────────

model Categoria {
  id          String     @id @default(cuid())
  nombre      String     @unique
  descripcion String?
  color       String?    @default("#6366f1")
  activo      Boolean    @default(true)
  createdAt   DateTime   @default(now()) @map("created_at")

  productos Producto[]

  @@map("categorias")
}

model Bodega {
  id          String   @id @default(cuid())
  codigo      String   @unique
  nombre      String
  ubicacion   String?
  activo      Boolean  @default(true)
  createdAt   DateTime @default(now()) @map("created_at")
  updatedAt   DateTime @updatedAt @map("updated_at")

  inventarios  Inventario[]
  movimientos  Movimiento[]

  @@map("bodegas")
}

model Proveedor {
  id               String   @id @default(cuid())
  codigo           String   @unique
  nombre           String
  contacto         String?
  email            String?
  telefono         String?
  leadTimeDias     Int      @default(21) @map("lead_time_dias")
  confiabilidad    Float?   @default(0.95) // 0-1, reliability score
  activo           Boolean  @default(true)
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  productos Producto[]

  @@map("proveedores")
}

// ─────────────────────────────────────────
// PRODUCTOS
// ─────────────────────────────────────────

enum Criticidad {
  CRITICO
  ALTO
  MEDIO
  BAJO
}

model Producto {
  id                String     @id @default(cuid())
  codigoProducto    String     @unique @map("codigo_producto")
  codigoSap         String?    @unique @map("codigo_sap")
  descripcion       String
  unidadMedida      String     @map("unidad_medida")
  categoriaId       String     @map("categoria_id")
  proveedorId       String?    @map("proveedor_id")

  // Stock
  stockActual       Float      @default(0) @map("stock_actual")
  stockMinimo       Float      @default(0) @map("stock_minimo")
  stockMaximo       Float?     @map("stock_maximo")
  stockSeguridad    Float      @default(0) @map("stock_seguridad")
  puntoPedido       Float      @default(0) @map("punto_pedido")

  // Tiempo
  leadTimeDias      Int        @default(21) @map("lead_time_dias")

  // Análisis
  criticidad        Criticidad @default(MEDIO)
  precioUnitario    Float?     @map("precio_unitario")
  demandaPromedio   Float?     @map("demanda_promedio")  // unidades/día
  diasCobertura     Float?     @map("dias_cobertura")
  ultimoMovimiento  DateTime?  @map("ultimo_movimiento")

  activo            Boolean    @default(true)
  createdAt         DateTime   @default(now()) @map("created_at")
  updatedAt         DateTime   @updatedAt @map("updated_at")

  categoria         Categoria        @relation(fields: [categoriaId], references: [id])
  proveedor         Proveedor?       @relation(fields: [proveedorId], references: [id])
  movimientos       Movimiento[]
  inventarios       Inventario[]
  alertas           Alerta[]
  consumoHistorico  ConsumoHistorico[]
  sapDiferencias    SapDiferencia[]

  @@map("productos")
  @@index([codigoProducto])
  @@index([codigoSap])
  @@index([criticidad])
  @@index([stockActual])
  @@index([categoriaId])
}

// ─────────────────────────────────────────
// INVENTARIO Y MOVIMIENTOS
// ─────────────────────────────────────────

enum TipoMovimiento {
  ENTRADA
  SALIDA
  AJUSTE_POSITIVO
  AJUSTE_NEGATIVO
  TRANSFERENCIA
  DEVOLUCION
  MERMA
}

model Movimiento {
  id              String          @id @default(cuid())
  productoId      String          @map("producto_id")
  bodegaId        String?         @map("bodega_id")
  tipo            TipoMovimiento
  cantidad        Float
  cantidadAntes   Float           @map("cantidad_antes")
  cantidadDespues Float           @map("cantidad_despues")
  fecha           DateTime
  referencia      String?         // número OC, nota interna, etc.
  origen          String?         // SAP, MANUAL, SISTEMA
  uploadId        String?         @map("upload_id")
  usuarioId       String?         @map("usuario_id")
  observacion     String?
  createdAt       DateTime        @default(now()) @map("created_at")

  producto  Producto   @relation(fields: [productoId], references: [id])
  bodega    Bodega?    @relation(fields: [bodegaId], references: [id])
  upload    Upload?    @relation(fields: [uploadId], references: [id])

  @@map("movimientos")
  @@index([productoId])
  @@index([fecha])
  @@index([tipo])
  @@index([uploadId])
}

model Inventario {
  id             String   @id @default(cuid())
  productoId     String   @map("producto_id")
  bodegaId       String   @map("bodega_id")
  stockFisico    Float    @map("stock_fisico")
  stockSap       Float    @map("stock_sap")
  diferencia     Float    // stockFisico - stockSap
  fechaConteo    DateTime @map("fecha_conteo")
  uploadId       String?  @map("upload_id")
  createdAt      DateTime @default(now()) @map("created_at")

  producto Producto @relation(fields: [productoId], references: [id])
  bodega   Bodega   @relation(fields: [bodegaId], references: [id])
  upload   Upload?  @relation(fields: [uploadId], references: [id])

  @@map("inventario")
  @@index([productoId])
  @@index([fechaConteo])
}

model SapDiferencia {
  id              String   @id @default(cuid())
  productoId      String   @map("producto_id")
  stockSistema    Float    @map("stock_sistema")
  stockSap        Float    @map("stock_sap")
  diferencia      Float
  porcentajeDiff  Float    @map("porcentaje_diff")
  uploadId        String   @map("upload_id")
  fechaDeteccion  DateTime @default(now()) @map("fecha_deteccion")
  resuelto        Boolean  @default(false)

  producto Producto @relation(fields: [productoId], references: [id])
  upload   Upload   @relation(fields: [uploadId], references: [id])

  @@map("sap_diferencias")
  @@index([productoId])
}

// ─────────────────────────────────────────
// CONSUMO HISTÓRICO Y ANALYTICS
// ─────────────────────────────────────────

model ConsumoHistorico {
  id               String   @id @default(cuid())
  productoId       String   @map("producto_id")
  periodo          DateTime // primer día del período (mes o semana)
  tipoPeriodo      String   @map("tipo_periodo") // DIARIO, SEMANAL, MENSUAL
  consumoTotal     Float    @map("consumo_total")
  consumoPromedio  Float    @map("consumo_promedio")
  consumoMaximo    Float    @map("consumo_maximo")
  consumoMinimo    Float    @map("consumo_minimo")
  diasConMovimiento Int     @map("dias_con_movimiento")
  createdAt        DateTime @default(now()) @map("created_at")

  producto Producto @relation(fields: [productoId], references: [id])

  @@unique([productoId, periodo, tipoPeriodo])
  @@map("consumo_historico")
  @@index([productoId])
  @@index([periodo])
}

// ─────────────────────────────────────────
// ALERTAS
// ─────────────────────────────────────────

enum TipoAlerta {
  STOCK_BAJO
  QUIEBRE_STOCK
  DIFERENCIA_SAP
  PRODUCTO_CRITICO
  ANOMALIA_CONSUMO
  SOBRECONSUMO
  REPOSICION_URGENTE
  LEAD_TIME_VENCIDO
  INVENTARIO_PENDIENTE
}

enum PrioridadAlerta {
  CRITICA
  ALTA
  MEDIA
  BAJA
}

enum EstadoAlerta {
  ACTIVA
  RECONOCIDA
  RESUELTA
  DESCARTADA
}

model Alerta {
  id               String          @id @default(cuid())
  productoId       String          @map("producto_id")
  tipo             TipoAlerta
  prioridad        PrioridadAlerta @default(MEDIA)
  estado           EstadoAlerta    @default(ACTIVA)
  mensaje          String
  detalles         Json?           // datos adicionales como JSON
  valorActual      Float?          @map("valor_actual")
  valorUmbral      Float?          @map("valor_umbral")
  acknowledgedBy   String?         @map("acknowledged_by")
  acknowledgedAt   DateTime?       @map("acknowledged_at")
  resolvedAt       DateTime?       @map("resolved_at")
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")

  producto         Producto        @relation(fields: [productoId], references: [id])
  acknowledgedUser Usuario?        @relation("AlertaAcknowledgedBy", fields: [acknowledgedBy], references: [id])

  @@map("alertas")
  @@index([productoId])
  @@index([estado])
  @@index([tipo])
  @@index([prioridad])
  @@index([createdAt])
}

// ─────────────────────────────────────────
// UPLOADS SAP
// ─────────────────────────────────────────

enum EstadoUpload {
  PENDIENTE
  PROCESANDO
  COMPLETADO
  ERROR
  PARCIAL
}

model Upload {
  id               String       @id @default(cuid())
  usuarioId        String       @map("usuario_id")
  nombreArchivo    String       @map("nombre_archivo")
  tipoArchivo      String       @map("tipo_archivo") // xlsx, csv
  tamanoBytes      Int          @map("tamano_bytes")
  estado           EstadoUpload @default(PENDIENTE)
  filePath         String?      @map("file_path")
  totalRegistros   Int?         @map("total_registros")
  registrosProcesados Int?      @map("registros_procesados")
  registrosError   Int?         @map("registros_error")
  errores          Json?        // array de errores de validación
  metadata         Json?        // columnas detectadas, resumen
  procesadoAt      DateTime?    @map("procesado_at")
  createdAt        DateTime     @default(now()) @map("created_at")
  updatedAt        DateTime     @updatedAt @map("updated_at")

  usuario          Usuario      @relation(fields: [usuarioId], references: [id])
  movimientos      Movimiento[]
  inventarios      Inventario[]
  diferencias      SapDiferencia[]

  @@map("uploads")
  @@index([estado])
  @@index([usuarioId])
  @@index([createdAt])
}

// ─────────────────────────────────────────
// AUDITORÍA
// ─────────────────────────────────────────

model Auditoria {
  id         String   @id @default(cuid())
  usuarioId  String?  @map("usuario_id")
  accion     String   // CREATE, UPDATE, DELETE, LOGIN, UPLOAD, etc.
  entidad    String   // productos, movimientos, etc.
  entidadId  String?  @map("entidad_id")
  datosAntes Json?    @map("datos_antes")
  datosDespues Json?  @map("datos_despues")
  ip         String?
  userAgent  String?  @map("user_agent")
  createdAt  DateTime @default(now()) @map("created_at")

  usuario    Usuario? @relation(fields: [usuarioId], references: [id])

  @@map("auditoria")
  @@index([usuarioId])
  @@index([entidad])
  @@index([createdAt])
}

// ─────────────────────────────────────────
// CONFIGURACIÓN DEL SISTEMA
// ─────────────────────────────────────────

model Configuracion {
  id             String   @id @default(cuid())
  clave          String   @unique
  valor          String
  descripcion    String?
  tipo           String   @default("string") // string, number, boolean, json
  updatedAt      DateTime @updatedAt @map("updated_at")

  @@map("configuracion")
}
```

### SQL: Índices Adicionales y RLS

```sql
-- Row Level Security habilitado en Supabase
ALTER TABLE productos ENABLE ROW LEVEL SECURITY;
ALTER TABLE movimientos ENABLE ROW LEVEL SECURITY;
ALTER TABLE alertas ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE auditoria ENABLE ROW LEVEL SECURITY;

-- Políticas básicas por rol
CREATE POLICY "usuarios_autenticados_pueden_leer_productos"
  ON productos FOR SELECT
  USING (auth.role() = 'authenticated');

-- Índices compuestos para queries frecuentes
CREATE INDEX idx_productos_stock_criticidad
  ON productos(stock_actual, criticidad)
  WHERE activo = true;

CREATE INDEX idx_movimientos_producto_fecha
  ON movimientos(producto_id, fecha DESC);

CREATE INDEX idx_alertas_activas_prioridad
  ON alertas(prioridad, created_at DESC)
  WHERE estado = 'ACTIVA';

-- Función para calcular días de cobertura (computed)
CREATE OR REPLACE FUNCTION calcular_dias_cobertura(
  stock_actual FLOAT,
  demanda_promedio FLOAT
) RETURNS FLOAT AS $$
BEGIN
  IF demanda_promedio <= 0 THEN RETURN NULL; END IF;
  RETURN ROUND((stock_actual / demanda_promedio)::numeric, 1);
END;
$$ LANGUAGE plpgsql IMMUTABLE;
```

---

## 4. API ARCHITECTURE

### Estructura de Endpoints

```
API BASE: /api/v1

AUTH
  POST   /auth/login
  POST   /auth/logout
  POST   /auth/refresh
  GET    /auth/me

PRODUCTOS
  GET    /products                    Lista paginada con filtros
  POST   /products                    Crear producto
  GET    /products/:id                Detalle
  PUT    /products/:id                Actualizar
  DELETE /products/:id                Desactivar (soft delete)
  GET    /products/:id/movements      Historial movimientos
  GET    /products/:id/consumption    Consumo histórico
  GET    /products/:id/forecast       Predicción demanda
  GET    /products/critical           Productos críticos
  GET    /products/risk               Productos en riesgo desabasto

INVENTARIO
  GET    /inventory                   Inventario actual (con filtros)
  GET    /inventory/summary           Resumen ejecutivo KPIs
  GET    /inventory/differences       Diferencias SAP
  POST   /inventory/snapshot          Crear snapshot inventario

MOVIMIENTOS
  GET    /movements                   Lista movimientos (paginada)
  POST   /movements                   Registrar movimiento manual
  GET    /movements/:id               Detalle

UPLOADS
  POST   /uploads                     Subir archivo SAP (multipart)
  GET    /uploads                     Historial uploads
  GET    /uploads/:id                 Estado y resultado del upload
  GET    /uploads/:id/errors          Errores de procesamiento
  DELETE /uploads/:id                 Cancelar upload pendiente

ALERTAS
  GET    /alerts                      Alertas activas (paginadas)
  GET    /alerts/summary              Conteo por tipo/prioridad
  PUT    /alerts/:id/acknowledge      Reconocer alerta
  PUT    /alerts/:id/resolve          Resolver alerta
  PUT    /alerts/:id/dismiss          Descartar alerta

ANALYTICS
  GET    /analytics/dashboard         KPIs dashboard ejecutivo
  GET    /analytics/consumption       Análisis consumo histórico
  GET    /analytics/forecast/:id      Forecast por producto
  GET    /analytics/anomalies         Anomalías detectadas

REPORTES
  POST   /reports/inventory           Reporte inventario (PDF/Excel)
  POST   /reports/movements           Reporte movimientos
  POST   /reports/alerts              Reporte alertas

CONFIGURACIÓN
  GET    /config                      Parámetros del sistema
  PUT    /config/:key                 Actualizar parámetro

USUARIOS (solo ADMINISTRADOR)
  GET    /users
  POST   /users
  PUT    /users/:id
  DELETE /users/:id
```

### Estructura de Respuesta Estándar

```typescript
// Respuesta exitosa
{
  "success": true,
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "timestamp": "2024-01-15T10:30:00Z"
}

// Respuesta error
{
  "success": false,
  "error": {
    "code": "PRODUCT_NOT_FOUND",
    "message": "Producto no encontrado",
    "details": [...],
    "statusCode": 404
  },
  "timestamp": "2024-01-15T10:30:00Z"
}

// Paginación query params
GET /products?page=1&limit=20&sortBy=criticidad&sortOrder=desc&search=codigo&categoria=id&estado=activo
```

---

## 5. BACKEND ARCHITECTURE

### NestJS Módulo Principal

```typescript
// src/app.module.ts
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validationSchema: envSchema }),
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    BullModule.forRootAsync({ useFactory: () => ({ connection: redisConfig }) }),
    PrismaModule,
    AuthModule,
    ProductsModule,
    InventoryModule,
    UploadsModule,
    AlertsModule,
    MovementsModule,
    SuppliersModule,
    WarehousesModule,
    ReportsModule,
    AnalyticsModule,
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*');
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
```

### Inventory Calculator Service

```typescript
// modules/inventory/inventory-calculator.service.ts
@Injectable()
export class InventoryCalculatorService {

  // Demanda Promedio = Consumo Total / Número de Días
  calcularDemandaPromedio(consumoTotal: number, numeroDias: number): number {
    if (numeroDias <= 0) return 0;
    return parseFloat((consumoTotal / numeroDias).toFixed(4));
  }

  // Stock Seguridad = Demanda Promedio Diaria × Tiempo Reposición
  calcularStockSeguridad(demandaPromedioDiaria: number, tiempoReposicion: number): number {
    return parseFloat((demandaPromedioDiaria * tiempoReposicion).toFixed(2));
  }

  // Punto Pedido = (Demanda Promedio × Lead Time) + Stock Seguridad
  calcularPuntoPedido(
    demandaPromedio: number,
    leadTime: number,
    stockSeguridad: number
  ): number {
    return parseFloat(((demandaPromedio * leadTime) + stockSeguridad).toFixed(2));
  }

  // Días de Cobertura = Stock Actual / Demanda Promedio Diaria
  calcularDiasCobertura(stockActual: number, demandaPromedioDiaria: number): number | null {
    if (demandaPromedioDiaria <= 0) return null;
    return parseFloat((stockActual / demandaPromedioDiaria).toFixed(1));
  }

  // Capital Inmovilizado = Suma(Stock × Precio Unitario)
  calcularCapitalInmovilizado(productos: ProductoConPrecio[]): number {
    return productos.reduce((acc, p) => {
      return acc + (p.stockActual * (p.precioUnitario ?? 0));
    }, 0);
  }

  // Fill Rate = (Pedidos Satisfechos / Total Pedidos) × 100
  calcularFillRate(pedidosSatisfechos: number, totalPedidos: number): number {
    if (totalPedidos <= 0) return 100;
    return parseFloat(((pedidosSatisfechos / totalPedidos) * 100).toFixed(2));
  }

  // Precisión Inventario = (1 - |Diferencia SAP| / Stock SAP) × 100
  calcularPrecisionInventario(stockFisico: number, stockSap: number): number {
    if (stockSap <= 0) return 100;
    const diferencia = Math.abs(stockFisico - stockSap);
    return parseFloat(((1 - diferencia / stockSap) * 100).toFixed(2));
  }

  // Evaluación de riesgo de quiebre
  evaluarRiesgoDesabastecimiento(producto: Producto): RiesgoDesabastecimiento {
    const { stockActual, puntoPedido, stockSeguridad, diasCobertura } = producto;

    if (stockActual <= 0) return { nivel: 'QUIEBRE', score: 1.0 };
    if (stockActual <= stockSeguridad) return { nivel: 'CRITICO', score: 0.9 };
    if (stockActual <= puntoPedido) return { nivel: 'ALTO', score: 0.7 };
    if (diasCobertura && diasCobertura < 7) return { nivel: 'MEDIO', score: 0.5 };
    return { nivel: 'NORMAL', score: 0.1 };
  }
}
```

### Queue Processors

```typescript
// queue/processors/sap-file.processor.ts
@Processor('sap-processing')
export class SapFileProcessor {
  constructor(
    private readonly sapParser: SapParserService,
    private readonly inventoryService: InventoryService,
    private readonly alertEngine: AlertEngineService,
    private readonly uploadsService: UploadsService,
  ) {}

  @Process('process-sap-file')
  async handleSapFile(job: Job<SapFileJob>) {
    const { uploadId, filePath, userId } = job.data;

    try {
      await this.uploadsService.updateStatus(uploadId, 'PROCESANDO');

      // 1. Parse y validar
      const parseResult = await this.sapParser.parse(filePath);

      // 2. Procesar en batches de 100 registros
      const batches = chunk(parseResult.data, 100);
      for (const batch of batches) {
        await this.inventoryService.processBatch(batch, uploadId);
        await job.progress(/* progreso */);
      }

      // 3. Recalcular métricas
      await this.inventoryService.recalculateMetrics();

      // 4. Evaluar y generar alertas
      await this.alertEngine.runFullCheck();

      await this.uploadsService.updateStatus(uploadId, 'COMPLETADO', {
        totalRegistros: parseResult.total,
        registrosProcesados: parseResult.processed,
        registrosError: parseResult.errors.length,
      });

    } catch (error) {
      await this.uploadsService.updateStatus(uploadId, 'ERROR', {
        errores: [error.message],
      });
      throw error;
    }
  }
}
```

---

## 6. FRONTEND ARCHITECTURE

### Estructura de Estado Global (Zustand)

```typescript
// stores/inventory.store.ts
interface InventoryStore {
  products: Product[];
  filters: ProductFilters;
  isLoading: boolean;
  summary: InventorySummary | null;

  setFilters: (filters: Partial<ProductFilters>) => void;
  fetchProducts: () => Promise<void>;
  fetchSummary: () => Promise<void>;
}

// stores/alerts.store.ts
interface AlertsStore {
  alerts: Alert[];
  unreadCount: number;
  isPolling: boolean;

  fetchAlerts: () => Promise<void>;
  acknowledgeAlert: (id: string) => Promise<void>;
  startPolling: () => void;
  stopPolling: () => void;
}
```

### Componente Dashboard KPI

```typescript
// components/dashboard/KPICard.tsx
interface KPICardProps {
  title: string;
  value: string | number;
  unit?: string;
  trend?: { value: number; direction: 'up' | 'down'; label: string };
  severity?: 'default' | 'warning' | 'critical' | 'success';
  icon: LucideIcon;
}
```

### Componente FileDropzone (Upload SAP)

```typescript
// components/uploads/FileDropzone.tsx
// - Valida: .xlsx, .csv únicamente
// - Tamaño máximo: 50MB
// - Preview de primeras 5 filas del Excel
// - Detección automática de columnas SAP
// - Barra de progreso con SSE (Server-Sent Events)
// - Manejo de errores con descripción detallada
```

### Server-Sent Events para progreso

```typescript
// hooks/useUploadProgress.ts
export function useUploadProgress(uploadId: string) {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<UploadStatus>('PENDIENTE');

  useEffect(() => {
    const sse = new EventSource(`/api/v1/uploads/${uploadId}/progress`);
    sse.onmessage = (e) => {
      const data = JSON.parse(e.data);
      setProgress(data.progress);
      setStatus(data.status);
      if (data.status === 'COMPLETADO' || data.status === 'ERROR') {
        sse.close();
      }
    };
    return () => sse.close();
  }, [uploadId]);

  return { progress, status };
}
```

---

## 7. ANALYTICS ENGINE

### Python FastAPI Microservice

```python
# apps/analytics/src/api/main.py
from fastapi import FastAPI
from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: conectar DB, cargar modelos ML
    yield
    # Shutdown: cleanup

app = FastAPI(title="Analytics Engine", version="1.0.0", lifespan=lifespan)
```

### Forecast Engine

```python
# services/forecast_engine.py
import pandas as pd
import numpy as np
from sklearn.linear_model import LinearRegression

class ForecastEngine:

    def forecast_demand(
        self,
        historical_data: pd.DataFrame,  # columnas: fecha, consumo
        horizon_days: int = 30
    ) -> ForecastResult:
        """
        Forecasting por producto.
        Métodos: Moving Average, Exponential Smoothing, Linear Regression
        Selecciona automáticamente el mejor método por RMSE.
        """
        df = historical_data.copy()
        df['fecha'] = pd.to_datetime(df['fecha'])
        df = df.sort_values('fecha')

        results = {}

        # Método 1: Moving Average (ventana 7 días)
        results['ma'] = self._moving_average_forecast(df, horizon_days)

        # Método 2: Exponential Smoothing
        results['es'] = self._exponential_smoothing_forecast(df, horizon_days)

        # Método 3: Linear Regression (tendencia)
        results['lr'] = self._linear_regression_forecast(df, horizon_days)

        # Seleccionar mejor método
        best_method = self._select_best_method(df, results)

        return ForecastResult(
            method=best_method,
            forecast=results[best_method],
            confidence_interval=self._calculate_confidence_interval(df, results[best_method]),
            rmse=self._calculate_rmse(df, results[best_method]),
            horizon_days=horizon_days
        )

    def _exponential_smoothing_forecast(
        self, df: pd.DataFrame, horizon: int, alpha: float = 0.3
    ) -> list[float]:
        values = df['consumo'].values
        smoothed = [values[0]]
        for v in values[1:]:
            smoothed.append(alpha * v + (1 - alpha) * smoothed[-1])
        last = smoothed[-1]
        return [last] * horizon
```

### Anomaly Detector

```python
# services/anomaly_detector.py
class AnomalyDetector:

    def detect_consumption_anomalies(
        self, df: pd.DataFrame, sensitivity: float = 2.0
    ) -> list[Anomaly]:
        """
        Detección por Z-Score y IQR.
        sensitivity: número de desviaciones estándar (default 2.0)
        """
        mean = df['consumo'].mean()
        std = df['consumo'].std()

        # Z-Score method
        df['z_score'] = (df['consumo'] - mean) / std
        df['is_anomaly'] = df['z_score'].abs() > sensitivity

        anomalies = []
        for _, row in df[df['is_anomaly']].iterrows():
            direction = 'SOBRECONSUMO' if row['z_score'] > 0 else 'SUBCONSUMO'
            anomalies.append(Anomaly(
                fecha=row['fecha'],
                consumo_real=row['consumo'],
                consumo_esperado=mean,
                desviacion=row['z_score'],
                tipo=direction,
                severidad='ALTA' if abs(row['z_score']) > 3 else 'MEDIA'
            ))

        return anomalies
```

---

## 8. DEVOPS STRATEGY

### Docker Compose (Desarrollo)

```yaml
# infrastructure/docker/docker-compose.dev.yml
version: '3.9'

services:
  redis:
    image: redis:7-alpine
    ports: ['6379:6379']
    volumes: [redis-data:/data]

  analytics:
    build: ../../apps/analytics
    ports: ['8001:8001']
    environment:
      - ENVIRONMENT=development
      - DATABASE_URL=${DATABASE_URL}
    volumes: [../../apps/analytics:/app]
    command: uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8001

volumes:
  redis-data:
```

### CI/CD Pipeline (GitHub Actions)

```yaml
# .github/workflows/ci.yml
name: CI/CD Pipeline

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx turbo run lint test build --filter=!./apps/analytics

  test-analytics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v4
        with: { python-version: '3.11' }
      - run: pip install -r apps/analytics/requirements.txt
      - run: pytest apps/analytics/tests/

  deploy-api:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy NestJS to Railway/Render
        # ... deploy commands

  deploy-web:
    needs: test
    if: github.ref == 'refs/heads/main'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy to Vercel
        uses: amondnet/vercel-action@v25
        with:
          vercel-token: ${{ secrets.VERCEL_TOKEN }}
          vercel-org-id: ${{ secrets.VERCEL_ORG_ID }}
          vercel-project-id: ${{ secrets.VERCEL_PROJECT_ID }}
          vercel-args: '--prod'
```

### Turborepo Config

```json
// turbo.json
{
  "$schema": "https://turbo.build/schema.json",
  "pipeline": {
    "build": {
      "dependsOn": ["^build"],
      "outputs": [".next/**", "dist/**"]
    },
    "test": {
      "dependsOn": ["build"],
      "outputs": ["coverage/**"]
    },
    "lint": {},
    "dev": {
      "cache": false,
      "persistent": true
    },
    "db:generate": {
      "cache": false
    },
    "db:migrate": {
      "cache": false
    }
  }
}
```

---

## 9. SECURITY STRATEGY

### Capas de Seguridad

```
CAPA 1: NETWORK
  ├── HTTPS obligatorio (TLS 1.3)
  ├── CORS configurado por origen
  ├── Rate limiting por IP (ThrottlerModule)
  └── Helmet.js (headers seguridad HTTP)

CAPA 2: AUTENTICACIÓN
  ├── JWT (access token 15min + refresh token 7 días)
  ├── bcrypt para passwords (cost factor 12)
  ├── Refresh token rotation
  └── Invalidación por logout

CAPA 3: AUTORIZACIÓN
  ├── RBAC: ADMINISTRADOR > SUPERVISOR > OPERADOR
  ├── Guards en cada endpoint sensible
  ├── RLS en Supabase (row-level)
  └── Ownership checks en recursos

CAPA 4: INPUT VALIDATION
  ├── class-validator en todos los DTOs
  ├── Sanitización de strings (strip HTML)
  ├── Validación de tipos de archivo (magic bytes)
  ├── Límite tamaño upload (50MB)
  └── Whitelist de columnas SAP aceptadas

CAPA 5: DATOS
  ├── Supabase RLS habilitado
  ├── Prisma previene SQL injection (queries parametrizadas)
  ├── Datos sensibles no retornados en respuestas
  └── Auditoría de todas las acciones

CAPA 6: INFRAESTRUCTURA
  ├── Variables de entorno en Vercel/Railway (nunca en código)
  ├── Secrets rotation policy
  ├── Logs sin datos sensibles (no passwords, no tokens)
  └── Backups automáticos Supabase
```

### Configuración de Roles

```typescript
// Permisos por rol
const PERMISSIONS = {
  ADMINISTRADOR: [
    'users:*', 'products:*', 'inventory:*',
    'uploads:*', 'alerts:*', 'reports:*',
    'config:*', 'audit:read'
  ],
  SUPERVISOR: [
    'products:read', 'products:update',
    'inventory:*', 'uploads:*',
    'alerts:*', 'reports:read', 'movements:*'
  ],
  OPERADOR: [
    'products:read',
    'inventory:read', 'uploads:create',
    'alerts:read', 'alerts:acknowledge',
    'movements:read', 'movements:create'
  ],
} as const;
```

---

## 10. SCALABILITY STRATEGY

### Horizontal Scaling

```
FASE ACTUAL (MVP)
  Single NestJS instance
  Supabase Free/Pro
  Vercel hobby
  Redis single node

FASE CRECIMIENTO
  NestJS → múltiples instancias (PM2 cluster)
  Redis Cluster → alta disponibilidad
  Supabase Pro → connection pooling (PgBouncer)
  CDN assets → Vercel Edge Network

FASE ENTERPRISE
  Kubernetes (GKE/EKS) para API y Analytics
  PostgreSQL read replicas para queries analíticas
  Redis Sentinel → failover automático
  Multi-region deployment
  Event-driven (Kafka/RabbitMQ) para microservicios

MULTITENANCY (Fase 5)
  Schema-per-tenant en PostgreSQL
  Tenant isolation vía RLS
  Subdomain routing por empresa
  Billing/subscription layer (Stripe)
```

### Optimización de Queries

```typescript
// Siempre paginar, nunca cargar todo
// Usar índices en columnas de filtro frecuente
// Cursor-based pagination para listas grandes
// Query específicas, no SELECT *

// Ejemplo: query optimizada de productos críticos
const criticalProducts = await prisma.producto.findMany({
  where: {
    activo: true,
    OR: [
      { stockActual: { lte: prisma.producto.fields.stockMinimo } },
      { criticidad: { in: ['CRITICO', 'ALTO'] } },
    ],
  },
  select: {
    id: true, codigoProducto: true, descripcion: true,
    stockActual: true, stockMinimo: true, puntoPedido: true,
    diasCobertura: true, criticidad: true,
    proveedor: { select: { nombre: true, leadTimeDias: true } },
  },
  orderBy: [{ criticidad: 'asc' }, { stockActual: 'asc' }],
  take: 50,
});
```

---

## 11. PERFORMANCE STRATEGY

### Frontend Performance

```
Next.js 15 optimizaciones:
  ├── Server Components por defecto (menos JS al cliente)
  ├── Streaming con Suspense para datos lentos
  ├── React Query para cache de datos del servidor
  ├── Route-based code splitting (automático)
  ├── Image optimization (next/image)
  └── Prefetching de rutas frecuentes

Tablas de datos:
  ├── Virtualización (@tanstack/virtual) para +1000 filas
  ├── Server-side pagination y sorting
  └── Debounce en búsquedas (300ms)

Estado:
  ├── Zustand (ligero vs Redux)
  ├── Optimistic updates para mejora UX
  └── Revalidación inteligente de datos
```

### Backend Performance

```
NestJS:
  ├── Redis cache para KPIs del dashboard (TTL: 5min)
  ├── Compresión gzip en responses
  ├── Connection pooling Prisma (max: 10 en dev, 25 en prod)
  └── Lazy loading de módulos pesados

Analytics:
  ├── Cálculos batch asíncronos via BullMQ
  ├── Jobs de recálculo en ventanas de baja carga
  ├── Cache de resultados de forecast en Redis
  └── Paginación en todos los endpoints de datos históricos

Base de datos:
  ├── Índices en todas las columnas de filtro
  ├── VACUUM y ANALYZE automatizado (Supabase)
  ├── Particionado futuro de tabla movimientos por mes
  └── Materialized views para métricas agregadas
```

---

## 12. SAP PARSER STRATEGY

### Columnas SAP Esperadas y Mapeo

```typescript
// modules/uploads/sap-parser/column-mapper.ts

// Columnas estándar SAP → nombres internos
const SAP_COLUMN_MAP: Record<string, string> = {
  // Producto
  'Material': 'codigoSap',
  'Texto breve de material': 'descripcion',
  'Denominación de material': 'descripcion',
  'Material Description': 'descripcion',

  // Stock
  'Libre utilización': 'stockLibre',
  'Unrestricted Stock': 'stockLibre',
  'Stock valorado': 'stockTotal',
  'Valuated Stock': 'stockTotal',
  'En pedido de compras': 'stockPedido',

  // Movimientos
  'Cantidad': 'cantidad',
  'Quantity': 'cantidad',
  'Fecha de contabilización': 'fechaMovimiento',
  'Posting Date': 'fechaMovimiento',
  'Clase de movimiento': 'tipoMovimiento',
  'Movement Type': 'tipoMovimiento',

  // Unidades
  'UMB': 'unidadMedida',
  'Base Unit': 'unidadMedida',

  // Centro/Almacén
  'Centro': 'centro',
  'Plant': 'centro',
  'Almacén': 'almacen',
  'Storage Location': 'almacen',
};

// Tipos de movimiento SAP → internos
const SAP_MOVEMENT_TYPES: Record<string, TipoMovimiento> = {
  '101': 'ENTRADA',   // Entrada mercancías OC
  '102': 'ENTRADA',   // Anulación entrada OC
  '201': 'SALIDA',    // Salida a centro coste
  '261': 'SALIDA',    // Salida para orden
  '301': 'TRANSFERENCIA',
  '551': 'MERMA',
  '701': 'AJUSTE_POSITIVO',
  '702': 'AJUSTE_NEGATIVO',
};
```

### Parser Service

```typescript
// modules/uploads/sap-parser/sap-parser.service.ts
@Injectable()
export class SapParserService {

  async parse(filePath: string): Promise<ParseResult> {
    // 1. Detectar formato (xlsx vs csv)
    const ext = path.extname(filePath).toLowerCase();
    const rawData = ext === '.xlsx'
      ? await this.readExcel(filePath)
      : await this.readCsv(filePath);

    // 2. Detectar cabeceras y mapear columnas
    const headers = rawData[0];
    const columnMapping = this.detectColumns(headers);

    // 3. Validar estructura mínima requerida
    this.validateRequiredColumns(columnMapping);

    // 4. Parsear filas
    const results: ParsedRow[] = [];
    const errors: ParseError[] = [];

    for (let i = 1; i < rawData.length; i++) {
      try {
        const row = this.parseRow(rawData[i], columnMapping);
        if (row) results.push(row);
      } catch (e) {
        errors.push({ row: i + 1, message: e.message, data: rawData[i] });
      }
    }

    // 5. Deduplicar
    const deduplicated = this.deduplicateRows(results);

    return {
      data: deduplicated,
      total: rawData.length - 1,
      processed: deduplicated.length,
      errors,
      columnMapping,
      summary: this.generateSummary(deduplicated),
    };
  }

  private detectColumns(headers: string[]): ColumnMapping {
    const mapping: ColumnMapping = {};
    for (const header of headers) {
      const normalized = header?.toString().trim();
      if (SAP_COLUMN_MAP[normalized]) {
        mapping[normalized] = SAP_COLUMN_MAP[normalized];
      }
    }
    return mapping;
  }

  private validateRequiredColumns(mapping: ColumnMapping): void {
    const required = ['codigoSap', 'descripcion'];
    const found = Object.values(mapping);
    const missing = required.filter(col => !found.includes(col));
    if (missing.length > 0) {
      throw new InvalidSapFileError(
        `Columnas requeridas no encontradas: ${missing.join(', ')}`
      );
    }
  }
}
```

---

## 13. INVENTORY CALCULATION ENGINE

### Flujo Completo de Recálculo

```typescript
// modules/inventory/inventory.service.ts

async recalculateAllMetrics(): Promise<void> {
  // 1. Obtener todos los productos activos con historial
  const products = await this.prisma.producto.findMany({
    where: { activo: true },
    include: {
      movimientos: {
        where: { fecha: { gte: subDays(new Date(), 90) } }, // últimos 90 días
        orderBy: { fecha: 'desc' },
      },
    },
  });

  // 2. Procesar en paralelo (batch de 50)
  const batches = chunk(products, 50);
  for (const batch of batches) {
    await Promise.all(batch.map(p => this.recalculateProduct(p)));
  }

  // 3. Actualizar agregados del dashboard
  await this.updateDashboardAggregates();
}

async recalculateProduct(product: ProductoConMovimientos): Promise<void> {
  const movimientosSalida = product.movimientos.filter(
    m => ['SALIDA', 'MERMA'].includes(m.tipo)
  );

  const consumoTotal = movimientosSalida.reduce((sum, m) => sum + m.cantidad, 0);
  const diasConDatos = this.countUniqueDays(movimientosSalida.map(m => m.fecha));
  const numeroDias = Math.max(diasConDatos, 1);

  const demandaPromedio = this.calculator.calcularDemandaPromedio(consumoTotal, numeroDias);
  const leadTime = product.leadTimeDias;
  const stockSeguridad = this.calculator.calcularStockSeguridad(demandaPromedio, leadTime);
  const puntoPedido = this.calculator.calcularPuntoPedido(demandaPromedio, leadTime, stockSeguridad);
  const diasCobertura = this.calculator.calcularDiasCobertura(product.stockActual, demandaPromedio);

  await this.prisma.producto.update({
    where: { id: product.id },
    data: {
      demandaPromedio,
      stockSeguridad,
      puntoPedido,
      diasCobertura,
      updatedAt: new Date(),
    },
  });
}
```

---

## 14. ALERT ENGINE

### Reglas de Alerta

```typescript
// modules/alerts/alert-engine.service.ts
@Injectable()
export class AlertEngineService {

  private readonly ALERT_RULES: AlertRule[] = [
    {
      id: 'QUIEBRE_STOCK',
      check: (p) => p.stockActual <= 0,
      prioridad: 'CRITICA',
      mensaje: (p) => `QUIEBRE DE STOCK: ${p.descripcion} tiene 0 unidades`,
    },
    {
      id: 'STOCK_BAJO',
      check: (p) => p.stockActual > 0 && p.stockActual <= p.stockMinimo,
      prioridad: 'ALTA',
      mensaje: (p) => `Stock bajo: ${p.descripcion} (${p.stockActual} < mínimo ${p.stockMinimo})`,
    },
    {
      id: 'PUNTO_PEDIDO',
      check: (p) => p.stockActual <= p.puntoPedido && p.stockActual > p.stockMinimo,
      prioridad: 'MEDIA',
      mensaje: (p) => `Punto de pedido alcanzado: ${p.descripcion}. Ordenar reposición.`,
    },
    {
      id: 'COBERTURA_CRITICA',
      check: (p) => (p.diasCobertura ?? 999) < p.leadTimeDias,
      prioridad: 'ALTA',
      mensaje: (p) => `Cobertura menor a lead time: ${p.descripcion} (${p.diasCobertura} días < ${p.leadTimeDias} días lead time)`,
    },
  ];

  async runFullCheck(): Promise<AlertCheckResult> {
    const products = await this.prisma.producto.findMany({ where: { activo: true } });
    const existingAlerts = await this.getActiveAlertsMap();

    const newAlerts: CreateAlertDto[] = [];
    const resolvedAlerts: string[] = [];

    for (const product of products) {
      for (const rule of this.ALERT_RULES) {
        const alertKey = `${product.id}:${rule.id}`;
        const shouldAlert = rule.check(product);
        const hasActiveAlert = existingAlerts.has(alertKey);

        if (shouldAlert && !hasActiveAlert) {
          newAlerts.push({
            productoId: product.id,
            tipo: rule.id as TipoAlerta,
            prioridad: rule.prioridad,
            mensaje: rule.mensaje(product),
            valorActual: product.stockActual,
          });
        } else if (!shouldAlert && hasActiveAlert) {
          resolvedAlerts.push(existingAlerts.get(alertKey)!);
        }
      }
    }

    // Crear nuevas alertas y resolver existentes en batch
    await this.prisma.$transaction([
      this.prisma.alerta.createMany({ data: newAlerts }),
      this.prisma.alerta.updateMany({
        where: { id: { in: resolvedAlerts } },
        data: { estado: 'RESUELTA', resolvedAt: new Date() },
      }),
    ]);

    return { created: newAlerts.length, resolved: resolvedAlerts.length };
  }
}
```

---

## 15. FORECASTING ENGINE

### Pipeline de Predicción

```python
# services/forecast_engine.py

class ForecastPipeline:
    """
    Pipeline completo de forecasting:
    1. Preparación de datos
    2. Detección de estacionalidad
    3. Selección de modelo
    4. Entrenamiento y validación
    5. Predicción con intervalos de confianza
    """

    MODELS = {
        'moving_average': MovingAverageModel(window=7),
        'exponential_smoothing': ExponentialSmoothingModel(alpha=0.3),
        'linear_trend': LinearTrendModel(),
        'holt_winters': HoltWintersModel(),  # Para estacionalidad
    }

    def run(
        self,
        product_id: str,
        historical_consumption: pd.DataFrame,
        horizon_days: int = 30,
        lead_time_days: int = 21
    ) -> ForecastResult:

        # 1. Validar datos suficientes (mínimo 30 días)
        if len(historical_consumption) < 30:
            return self._fallback_forecast(historical_consumption, horizon_days)

        # 2. Detectar y manejar outliers
        clean_data = self._remove_outliers(historical_consumption)

        # 3. Evaluar cada modelo (cross-validation rolling window)
        model_scores = {}
        for name, model in self.MODELS.items():
            score = self._cross_validate(model, clean_data)
            model_scores[name] = score

        # 4. Seleccionar mejor modelo (menor RMSE)
        best_model_name = min(model_scores, key=model_scores.get)
        best_model = self.MODELS[best_model_name]

        # 5. Entrenar con todos los datos y predecir
        best_model.fit(clean_data)
        predictions = best_model.predict(horizon_days)

        # 6. Calcular stock seguridad dinámico
        std_demand = clean_data['consumo'].std()
        safety_stock = std_demand * np.sqrt(lead_time_days) * 1.65  # 95% service level

        # 7. Calcular reorder point
        avg_demand = clean_data['consumo'].mean()
        reorder_point = (avg_demand * lead_time_days) + safety_stock

        return ForecastResult(
            product_id=product_id,
            method=best_model_name,
            horizon_days=horizon_days,
            predictions=predictions,
            avg_daily_demand=avg_demand,
            std_daily_demand=std_demand,
            safety_stock=safety_stock,
            reorder_point=reorder_point,
            confidence_80=self._calc_confidence(predictions, 0.80),
            confidence_95=self._calc_confidence(predictions, 0.95),
            rmse=model_scores[best_model_name],
        )
```

---

## 16. DEPLOYMENT STRATEGY

### Arquitectura de Deployment

```
VERCEL (Frontend - Next.js)
  ├── Production: main branch → app.inventorycontrol.com
  ├── Preview: PRs → preview.inventorycontrol.com
  ├── Edge Functions para API routes ligeras
  └── Environment Variables en Vercel Dashboard

RAILWAY / RENDER (Backend - NestJS)
  ├── Dockerfile en apps/api/
  ├── Auto-deploy desde main branch
  ├── Health check: GET /health
  ├── Redis add-on incluido
  └── Environment Variables vía Railway dashboard

SUPABASE (Base de Datos)
  ├── Proyecto dedicado por ambiente
  ├── Migrations via Prisma en CI/CD
  ├── Backups automáticos diarios
  └── Connection pooling: PgBouncer activado

FLY.IO / RAILWAY (Analytics Python)
  ├── Dockerfile en apps/analytics/
  ├── Puerto 8001
  └── Internal network con API NestJS
```

### Variables de Entorno

```bash
# apps/api/.env.production
DATABASE_URL=postgresql://...@db.supabase.co:5432/postgres
DIRECT_URL=postgresql://...@db.supabase.co:5432/postgres
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_SERVICE_KEY=...
REDIS_URL=redis://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
ANALYTICS_SERVICE_URL=https://analytics.internal:8001
UPLOAD_MAX_SIZE_MB=50
ALLOWED_ORIGINS=https://app.inventorycontrol.com

# apps/web/.env.production
NEXT_PUBLIC_API_URL=https://api.inventorycontrol.com/api/v1
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

---

## 17. TECHNICAL ROADMAP

### FASE 1 — MVP Core (Semanas 1–6)

```
Semana 1-2: Fundamentos
  ✓ Setup monorepo Turborepo
  ✓ NestJS boilerplate con Auth (JWT)
  ✓ Prisma schema + Supabase setup
  ✓ Next.js 15 base con layout dashboard
  ✓ Docker Compose desarrollo

Semana 3-4: Parser y Upload SAP
  ✓ SAP Parser Service (Excel/CSV)
  ✓ Column detection y mapping
  ✓ BullMQ queue para procesamiento
  ✓ Upload UI con drag-and-drop
  ✓ Progress SSE

Semana 5-6: Core Inventory
  ✓ Inventory Calculator Service
  ✓ Todas las fórmulas operacionales
  ✓ API endpoints básicos
  ✓ Alert Engine v1 (reglas estáticas)
  ✓ Dashboard KPIs básicos
```

### FASE 2 — Operacional (Semanas 7–12)

```
  → Dashboard ejecutivo completo
  → Gráficos de tendencia (Recharts)
  → Gestión completa de productos
  → Historial de movimientos
  → Reportes PDF y Excel
  → Múltiples usuarios y roles
  → Auditoría completa
  → Búsqueda avanzada y filtros
```

### FASE 3 — Inteligencia (Semanas 13–20)

```
  → Analytics Engine Python deployment
  → Forecasting de demanda
  → Detección anomalías consumo
  → Dashboard de predicciones
  → Alertas inteligentes basadas en ML
  → Histórico de precisión de forecast
```

### FASE 4 — IA Predictiva (Semanas 21–32)

```
  → Modelos ML más sofisticados (Prophet, LSTM)
  → Recomendaciones automáticas de compra
  → Optimización automática de stock seguridad
  → Score de confiabilidad de proveedores
  → Análisis ABC/XYZ automático
```

### FASE 5 — SaaS Escalable (Semanas 33+)

```
  → Multi-empresa (schema isolation)
  → Multi-bodega
  → Subscription management (Stripe)
  → API pública con rate limiting
  → Onboarding automatizado
  → Marketplace de conectores SAP
```

---

## 18. BEST PRACTICES

### TypeScript

```typescript
// 1. Tipos explícitos, nunca `any`
// 2. DTOs con class-validator para toda entrada
// 3. Interfaces para contratos, types para uniones
// 4. Enums para valores fijos de dominio
// 5. Result types para operaciones que pueden fallar

type Result<T, E = Error> =
  | { success: true; data: T }
  | { success: false; error: E };
```

### NestJS

```
1. Un módulo por dominio de negocio
2. Services para lógica, Controllers solo routing
3. Repositories para acceso a datos (separar de Services)
4. DTOs validan TODA entrada (no confiar en frontend)
5. Custom exceptions con códigos de error semánticos
6. Interceptors para transformación estándar de respuestas
7. Guards para autenticación (nunca en Service)
```

### Base de Datos

```
1. Migrations siempre versionadas, nunca editar manualmente
2. Índices en columnas usadas en WHERE, ORDER BY, JOIN
3. Soft delete (activo: boolean) en entidades de negocio
4. Timestamps created_at/updated_at en todas las tablas
5. IDs como CUID (no UUID) — más legibles en logs
6. Transacciones para operaciones multi-tabla
7. Nunca hacer N+1 queries — usar include de Prisma
```

### SAP Parser

```
1. Validar SIEMPRE antes de procesar
2. Loguear filas con error (no romper todo el import)
3. Idempotente: re-procesar el mismo archivo = mismo resultado
4. Preview antes de confirmar import
5. Rollback completo si el job falla a mitad
```

---

## 19. RIESGOS TÉCNICOS

| Riesgo | Probabilidad | Impacto | Mitigación |
|--------|-------------|---------|------------|
| Variabilidad formato SAP entre versiones/clientes | Alta | Alto | Column detection flexible + UI de mapeo manual |
| Performance en tablas con >100K movimientos | Media | Alto | Índices + particionado + paginación cursor-based |
| Precisión del forecast con pocos datos históricos | Alta | Medio | Fallback a promedio simple + indicar confianza |
| Desincronización analytics/API | Media | Medio | Health checks + circuit breaker en AnalyticsClient |
| Over-alerting (fatiga de alertas) | Alta | Medio | Deduplicación, threshold configurables, snooze |
| Archivos SAP malformados o corruptos | Alta | Bajo | Validación robusta + error parcial no bloquea import |
| Costos Supabase en escala | Baja | Alto | Monitorear uso, migrar a self-hosted si >$300/mes |
| Redis single point of failure | Media | Alto | Fase 2: Redis Sentinel. Fallback a DB para jobs críticos |

---

## 20. RECOMENDACIONES ENTERPRISE-GRADE

### Arquitectura

```
1. SEPARACIÓN DE RESPONSABILIDADES
   NestJS orquesta, Python calcula, Supabase persiste.
   Nunca cruzar responsabilidades entre capas.

2. EVENT SOURCING FUTURO
   Diseñar movimientos como eventos inmutables desde el inicio.
   Facilita auditoría, replay y debugging.

3. CQRS LIGHT
   Endpoints de lectura (GET) pueden consultar read replicas.
   Endpoints de escritura van siempre a primary.

4. CONFIGURACIÓN EXTERNALIZADA
   Todo parámetro de negocio en tabla `configuracion`,
   no hardcodeado. Lead time, umbrales alertas, etc.

5. VERSIONADO DE API
   /api/v1/ desde día 1. Facilita romper cambios sin
   afectar clientes existentes.
```

### Operaciones

```
6. OBSERVABILIDAD DESDE DÍA 1
   Logs estructurados JSON (winston).
   Request IDs para trazabilidad end-to-end.
   Métricas de queue (jobs pending/failed).

7. HEALTH CHECKS
   GET /health: liveness
   GET /health/ready: readiness (DB + Redis + Analytics)

8. GRACEFUL SHUTDOWN
   NestJS drena requests activos antes de matar proceso.
   BullMQ completa jobs en ejecución.

9. DOCUMENTACIÓN API AUTOMÁTICA
   Swagger/OpenAPI generado desde decoradores NestJS.
   Disponible en /api/docs en development.

10. TESTING STRATEGY
    Unit tests: calculators, parsers, alert rules
    Integration tests: endpoints con DB de test
    E2E tests: flujos críticos (upload → alertas)
    Target: >80% cobertura en lógica de negocio.
```

### Producto

```
11. IDEMPOTENCIA EN UPLOADS
    Detectar si el mismo archivo ya fue procesado
    (hash SHA256 del archivo). Evitar duplicados.

12. DRY RUN MODE
    Procesar archivo SAP en modo "preview" sin persistir.
    El usuario ve qué cambiaría antes de confirmar.

13. CONFIGURACIÓN DE ALERTAS POR PRODUCTO
    Algunos productos pueden tener umbrales distintos.
    No aplicar reglas genéricas a todos por igual.

14. EXPORTACIÓN EN CONTEXTO
    Cada tabla del frontend debe poder exportarse a Excel
    con los mismos filtros aplicados.

15. ONBOARDING GUIADO
    Wizard para: crear categorías → crear proveedores →
    importar primer archivo SAP → revisar resultados.
    Reduce fricción de adopción.
```

---

## ANEXO: COMANDOS DE INICIO RÁPIDO

```bash
# 1. Clonar y setup inicial
git clone https://github.com/org/inventory-control-system
cd inventory-control-system
npm install

# 2. Setup base de datos
cp apps/api/.env.example apps/api/.env
# → Editar DATABASE_URL con credenciales Supabase
npx turbo run db:generate
npx turbo run db:migrate

# 3. Levantar servicios de desarrollo
docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d
# → Redis en :6379

# 4. Iniciar todos los servicios
npx turbo run dev
# → Web en :3000
# → API en :3001
# → Analytics en :8001

# 5. Seed inicial (categorías, bodega default, admin user)
npx tsx infrastructure/scripts/seed.ts
```

---

*Documento generado para inventory-control-system v1.0.0*  
*Stack: Next.js 15 · NestJS · Supabase · Prisma · Python FastAPI · BullMQ · Turborepo*
