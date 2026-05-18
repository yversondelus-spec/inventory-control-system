import { PrismaClient, $Enums } from '@prisma/client';

const prisma = new PrismaClient();

const KEYWORDS_CRITICO = [
  'MANTA', 'FILM', 'PLASTICO', 'PLASTIC', 'GUANTE', 'FAJA',
  'PRECINTO', 'AMARRE', 'STRETCH', 'PALLET', 'ZUNCHO', 'GRAPA',
  'CHALECO', 'ARNES', 'ARNÉS', 'BOTA', 'CASCO',
];

const KEYWORDS_ALTO = [
  'POLERA', 'POLAR', 'PANTALON', 'PANTALÓN', 'ZAPATO', 'CALZADO',
  'UNIFORME', 'CONJUNTO', 'PARKA', 'JOCKEY', 'MASCARA', 'MASCARILLA',
  'LENTE', 'AUDITI', 'TAPON', 'TAPÓN',
];

function clasificar(descripcion: string, categoriaNombre: string): $Enums.Criticidad {
  const desc = descripcion.toUpperCase();
  if (KEYWORDS_CRITICO.some((kw) => desc.includes(kw))) return $Enums.Criticidad.CRITICO;
  if (KEYWORDS_ALTO.some((kw) => desc.includes(kw))) return $Enums.Criticidad.ALTO;
  switch (categoriaNombre) {
    case 'EPP':                 return $Enums.Criticidad.ALTO;
    case 'Uniformes':           return $Enums.Criticidad.ALTO;
    case 'Materiales Embalaje': return $Enums.Criticidad.MEDIO;
    case 'Insumos Oficina':     return $Enums.Criticidad.BAJO;
    default:                    return $Enums.Criticidad.MEDIO;
  }
}

async function main() {
  console.log('🔧 Actualizando criticidad operacional Aerosan...\n');

  const productos = await prisma.producto.findMany({
    where: { activo: true },
    include: { categoria: true },
  });

  const conteo = { CRITICO: 0, ALTO: 0, MEDIO: 0, BAJO: 0 };

  for (const p of productos) {
    const nuevaCriticidad = clasificar(p.descripcion, p.categoria?.nombre ?? '');
    await prisma.producto.update({
      where: { id: p.id },
      data: { criticidad: nuevaCriticidad },
    });
    conteo[nuevaCriticidad]++;
  }

  console.log('📊 Resultado:');
  console.log(`   🔴 CRITICO → ${conteo.CRITICO} productos (paran la ops)`);
  console.log(`   🟠 ALTO    → ${conteo.ALTO} productos (afectan la ops)`);
  console.log(`   🟡 MEDIO   → ${conteo.MEDIO} productos`);
  console.log(`   🟢 BAJO    → ${conteo.BAJO} productos`);
  console.log('\n✅ Listo. Recarga el Dashboard.');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());