# Inventory Control System

Plataforma enterprise de control de inventario y abastecimiento para operaciones logísticas e industriales.

## Stack

| Capa | Tecnología |
|------|-----------|
| Frontend | Next.js 15, TypeScript, TailwindCSS, Shadcn/UI |
| Backend | NestJS, Node.js, TypeScript |
| Base de Datos | Supabase PostgreSQL + Prisma ORM |
| Queue | BullMQ + Redis |
| Analytics | Python FastAPI, Pandas, NumPy |
| Monorepo | Turborepo |
| Deploy | Vercel (web) + Railway (api) |

## Estructura

```
inventory-control-system/
├── apps/
│   ├── web/          # Next.js 15 frontend
│   ├── api/          # NestJS backend
│   └── analytics/    # Python analytics microservice
├── packages/
│   ├── shared-types/ # TypeScript types compartidos
│   ├── ui/           # Componentes UI compartidos
│   ├── eslint-config/
│   └── typescript-config/
└── infrastructure/
    └── docker/
```

## Requisitos

- Node.js >= 20
- npm >= 10
- Docker (para Redis en desarrollo)
- Cuenta Supabase (base de datos)
- Python 3.11+ (para analytics)

## Setup Rápido

### 1. Instalar dependencias
```bash
npm install
```

### 2. Configurar variables de entorno
```bash
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
# → Editar con tus credenciales de Supabase
```

### 3. Levantar Redis (Docker)
```bash
docker-compose -f infrastructure/docker/docker-compose.dev.yml up -d redis
```

### 4. Configurar base de datos
```bash
# Generar Prisma client
npm run db:generate

# Ejecutar migrations
cd apps/api && npx prisma migrate dev --name init

# Seed inicial (usuarios, categorías, productos ejemplo)
cd apps/api && npx ts-node prisma/seed.ts
```

### 5. Iniciar desarrollo
```bash
npm run dev
```

Servicios disponibles:
- **Frontend**: http://localhost:3000
- **API**: http://localhost:3001/api/v1
- **Swagger**: http://localhost:3001/api/docs
- **Analytics**: http://localhost:8001

## Credenciales de prueba (tras el seed)

| Rol | Email | Password |
|-----|-------|----------|
| Administrador | admin@inventorycontrol.com | Admin1234! |
| Supervisor | supervisor@inventorycontrol.com | Super1234! |
| Operador | operador@inventorycontrol.com | Oper1234! |

## Comandos útiles

```bash
# Desarrollo completo
npm run dev

# Solo API
npx turbo run dev --filter=@repo/api

# Solo Web
npx turbo run dev --filter=@repo/web

# Build completo
npm run build

# Tests
npm run test

# Lint
npm run lint

# Prisma Studio (explorar BD)
cd apps/api && npx prisma studio

# Ver logs de Redis
docker logs ics-redis -f
```

## Fases del Roadmap

- **Fase 1** (Semanas 1–6): Upload SAP, Parser, Cálculos, Alertas básicas
- **Fase 2** (Semanas 7–12): Dashboard ejecutivo, Reportes, Multi-usuario
- **Fase 3** (Semanas 13–20): Forecasting, Detección anomalías
- **Fase 4** (Semanas 21–32): IA predictiva, Recomendaciones compra
- **Fase 5** (Semanas 33+): Multi-empresa, SaaS

## Arquitectura de decisiones

Ver `docs/architecture/` para ADRs (Architecture Decision Records).
