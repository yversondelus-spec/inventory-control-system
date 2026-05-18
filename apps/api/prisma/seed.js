"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const prisma = new client_1.PrismaClient();
async function main() {
    console.log('🌱 Seeding database...');
    // ── Categorías ──────────────────────────────────
    const categorias = await Promise.all([
        prisma.categoria.upsert({
            where: { nombre: 'Lubricantes' },
            update: {},
            create: { nombre: 'Lubricantes', descripcion: 'Aceites y grasas industriales', color: '#3b82f6' },
        }),
        prisma.categoria.upsert({
            where: { nombre: 'Repuestos Mecánicos' },
            update: {},
            create: { nombre: 'Repuestos Mecánicos', descripcion: 'Componentes mecánicos', color: '#8b5cf6' },
        }),
        prisma.categoria.upsert({
            where: { nombre: 'Consumibles' },
            update: {},
            create: { nombre: 'Consumibles', descripcion: 'Materiales de consumo general', color: '#22c55e' },
        }),
        prisma.categoria.upsert({
            where: { nombre: 'Eléctricos' },
            update: {},
            create: { nombre: 'Eléctricos', descripcion: 'Componentes eléctricos', color: '#f59e0b' },
        }),
        prisma.categoria.upsert({
            where: { nombre: 'EPP' },
            update: {},
            create: { nombre: 'EPP', descripcion: 'Equipo de protección personal', color: '#ef4444' },
        }),
    ]);
    console.log(`✅ ${categorias.length} categorías creadas`);
    // ── Bodega por defecto ───────────────────────────
    const bodega = await prisma.bodega.upsert({
        where: { codigo: 'BDG-001' },
        update: {},
        create: { codigo: 'BDG-001', nombre: 'Bodega Principal', ubicacion: 'Planta Central' },
    });
    console.log(`✅ Bodega '${bodega.nombre}' creada`);
    // ── Proveedor de ejemplo ─────────────────────────
    const proveedor = await prisma.proveedor.upsert({
        where: { codigo: 'PROV-001' },
        update: {},
        create: {
            codigo: 'PROV-001',
            nombre: 'Distribuciones Industriales S.A.',
            email: 'ventas@distindustrial.com',
            leadTimeDias: 21,
            confiabilidad: 0.92,
        },
    });
    console.log(`✅ Proveedor '${proveedor.nombre}' creado`);
    // ── Usuarios ─────────────────────────────────────
    const passwordHash = await bcryptjs_1.default.hash('Admin1234!', 12);
    const admin = await prisma.usuario.upsert({
        where: { email: 'admin@inventorycontrol.com' },
        update: {},
        create: {
            email: 'admin@inventorycontrol.com',
            nombre: 'Admin',
            apellido: 'Sistema',
            passwordHash,
            role: 'ADMINISTRADOR',
        },
    });
    await prisma.usuario.upsert({
        where: { email: 'supervisor@inventorycontrol.com' },
        update: {},
        create: {
            email: 'supervisor@inventorycontrol.com',
            nombre: 'Carlos',
            apellido: 'Supervisor',
            passwordHash: await bcryptjs_1.default.hash('Super1234!', 12),
            role: 'SUPERVISOR',
        },
    });
    await prisma.usuario.upsert({
        where: { email: 'operador@inventorycontrol.com' },
        update: {},
        create: {
            email: 'operador@inventorycontrol.com',
            nombre: 'María',
            apellido: 'Operadora',
            passwordHash: await bcryptjs_1.default.hash('Oper1234!', 12),
            role: 'OPERADOR',
        },
    });
    console.log(`✅ 3 usuarios creados`);
    // ── Configuración base ───────────────────────────
    const configs = [
        { clave: 'lead_time_default_dias', valor: '21', tipo: 'number', descripcion: 'Lead time por defecto en días' },
        { clave: 'inventario_fisico_frecuencia_dias', valor: '15', tipo: 'number', descripcion: 'Frecuencia inventario físico' },
        { clave: 'stock_seguridad_factor', valor: '1.0', tipo: 'number', descripcion: 'Factor multiplicador stock seguridad' },
        { clave: 'alerta_cobertura_minima_dias', valor: '7', tipo: 'number', descripcion: 'Días mínimos de cobertura para alerta' },
        { clave: 'diferencia_sap_umbral_pct', valor: '5', tipo: 'number', descripcion: 'Umbral % diferencia SAP para alerta' },
    ];
    for (const config of configs) {
        await prisma.configuracion.upsert({
            where: { clave: config.clave },
            update: { valor: config.valor },
            create: config,
        });
    }
    console.log(`✅ Configuración base inicializada`);
    // ── Productos de ejemplo ─────────────────────────
    const lubrCategory = categorias.find((c) => c.nombre === 'Lubricantes');
    const repCategory = categorias.find((c) => c.nombre === 'Repuestos Mecánicos');
    const sampleProducts = [
        {
            codigoProducto: 'LUB-001',
            codigoSap: '000000001001',
            descripcion: 'Aceite Hidráulico ISO 46 - 200L',
            unidadMedida: 'UN',
            categoriaId: lubrCategory.id,
            proveedorId: proveedor.id,
            stockActual: 5,
            stockMinimo: 8,
            stockSeguridad: 6,
            puntoPedido: 14,
            leadTimeDias: 21,
            criticidad: 'CRITICO',
            precioUnitario: 185000,
            demandaPromedio: 0.67,
            diasCobertura: 7.5,
        },
        {
            codigoProducto: 'LUB-002',
            codigoSap: '000000001002',
            descripcion: 'Grasa EP2 - Balde 18kg',
            unidadMedida: 'UN',
            categoriaId: lubrCategory.id,
            proveedorId: proveedor.id,
            stockActual: 22,
            stockMinimo: 5,
            stockSeguridad: 4,
            puntoPedido: 9,
            leadTimeDias: 14,
            criticidad: 'MEDIO',
            precioUnitario: 45000,
            demandaPromedio: 0.28,
            diasCobertura: 78.5,
        },
        {
            codigoProducto: 'REP-001',
            codigoSap: '000000002001',
            descripcion: 'Rodamiento SKF 6205-2RS',
            unidadMedida: 'UN',
            categoriaId: repCategory.id,
            proveedorId: proveedor.id,
            stockActual: 0,
            stockMinimo: 3,
            stockSeguridad: 3,
            puntoPedido: 6,
            leadTimeDias: 21,
            criticidad: 'ALTO',
            precioUnitario: 12500,
            demandaPromedio: 0.15,
            diasCobertura: 0,
        },
    ];
    for (const product of sampleProducts) {
        await prisma.producto.upsert({
            where: { codigoProducto: product.codigoProducto },
            update: {},
            create: product,
        });
    }
    console.log(`✅ ${sampleProducts.length} productos de ejemplo creados`);
    console.log('\n🚀 Seed completado exitosamente!');
    console.log('\n📋 Credenciales:');
    console.log('   Admin:      admin@inventorycontrol.com / Admin1234!');
    console.log('   Supervisor: supervisor@inventorycontrol.com / Super1234!');
    console.log('   Operador:   operador@inventorycontrol.com / Oper1234!');
}
main()
    .catch((e) => { console.error(e); process.exit(1); })
    .finally(() => prisma.$disconnect());
//# sourceMappingURL=seed.js.map