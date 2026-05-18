import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Productos reales Bodega de Insumos Aerosan - 15 Abril 2026
// Duplicados consolidados sumando stocks
const rawProducts = [
  // ─── INSUMOS OFICINA (MN) ───────────────────────────────────────
  { codigo: 'MN01020054', descripcion: 'ROLLO PAPEL TERMICO SWABS', stock: 76, cat: 'Insumos Oficina' },
  { codigo: 'MN02010050', descripcion: 'CUCHILLO CARTONERO MAX SEGUR SK10 OLFA', stock: 79, cat: 'Insumos Oficina' },
  { codigo: 'MN02010140', descripcion: 'TONER HP CE285A NEGRO (MAQ P1102 1132)', stock: 1, cat: 'Insumos Oficina' },
  { codigo: 'MN02010151', descripcion: 'TONER CF230A - IMP. LASER JET PRO', stock: 8, cat: 'Insumos Oficina' },
  // ─── MATERIALES EMBALAJE (MS01/MS03/MS04) ──────────────────────
  { codigo: 'MS01010016', descripcion: 'BOLSA GRANDE (BP AD TR SI 090X110X040)', stock: 1637, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010003', descripcion: 'CINTA DE EMBALAJE TRANSPARENTE', stock: 779, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010005', descripcion: 'ESQUINERO DE CARTON', stock: 14174, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010007', descripcion: 'MANTA TERMICA', stock: 70, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010008', descripcion: 'PAÑAL ABSORBENTE', stock: 119, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010011', descripcion: 'PLASTICO BASE 175 X 200 MC TRANSPARENTE', stock: 14, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010012', descripcion: 'PLASTICO GORRO 250 X 0.35 MC TRANSPARENT', stock: 7, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010013', descripcion: 'PLASTICO GORRO 250 X 200 MC TRANSPARENTE', stock: 32, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010015', descripcion: 'STRETCH FILM AMARILLO', stock: 108, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010019', descripcion: 'STRETCH FILM ROJO', stock: 113, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010021', descripcion: 'STRETCH FILM VERDE', stock: 120, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010022', descripcion: 'ZUNCHO PLASTICO BLANCO', stock: 4, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010023', descripcion: 'ZUNCHO PLÁSTICO VERDE', stock: 15, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010024', descripcion: 'FILM STRETCH ROLLO 50*20MIC NAT C50/5', stock: 566, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010026', descripcion: 'CINTA ADH. ROJA 48X100', stock: 627, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010028', descripcion: 'ETIQUETA TRANSTHERM 100X70 AUTOADHESIVA', stock: 32, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010029', descripcion: 'PLASTICO BASE 180 X 0.35MC TRANSPARENTE', stock: 5, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010032', descripcion: 'PLANCHAS DE PLUMAVIT', stock: 1070, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010040', descripcion: 'CINTA AMARILLA 40x38mm', stock: 766, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010041', descripcion: 'BOLSA BP AD TR SI 07X090X040', stock: 151, cat: 'Materiales Embalaje' },
  { codigo: 'MS03010043', descripcion: 'ETIQUETAS ADHESIVAS CELESTES 100X150', stock: 42, cat: 'Materiales Embalaje' },
  { codigo: 'MS03020000', descripcion: 'PALLET MADERA', stock: 500, cat: 'Materiales Embalaje' },
  { codigo: 'MS04040978', descripcion: 'BALL TRANSFER', stock: 2900, cat: 'Materiales Embalaje' },
  // ─── UNIFORMES (MS05) ──────────────────────────────────────────
  { codigo: 'MS05010009', descripcion: 'CAMISA BLANCA - H - T XXL', stock: 7, cat: 'Uniformes' },
  { codigo: 'MS05010010', descripcion: 'CHAQUETA SOFTSHELL - H - T L', stock: 4, cat: 'Uniformes' },
  { codigo: 'MS05010011', descripcion: 'CHAQUETA SOFTSHELL - H - T M', stock: 10, cat: 'Uniformes' },
  { codigo: 'MS05010013', descripcion: 'CHAQUETA SOFTSHELL - H - T XL', stock: 5, cat: 'Uniformes' },
  { codigo: 'MS05010014', descripcion: 'CHAQUETA SOFTSHELL - H - T XXL', stock: 8, cat: 'Uniformes' },
  { codigo: 'MS05010015', descripcion: 'CHAQUETA SOFTSHELL - H - T XXXL', stock: 1, cat: 'Uniformes' },
  { codigo: 'MS05010016', descripcion: 'CHAQUETA SOFTSHELL - M - T L', stock: 9, cat: 'Uniformes' },
  { codigo: 'MS05010017', descripcion: 'CHAQUETA SOFTSHELL - M - T M', stock: 7, cat: 'Uniformes' },
  { codigo: 'MS05010018', descripcion: 'CHAQUETA SOFTSHELL - M - T S', stock: 1, cat: 'Uniformes' },
  { codigo: 'MS05010020', descripcion: 'CONJUNTO PRIMERA CAPA CARGA - T L', stock: 71, cat: 'Uniformes' },  // 61+10
  { codigo: 'MS05010021', descripcion: 'CONJUNTO PRIMERA CAPA CARGA - T M', stock: 75, cat: 'Uniformes' },  // 73+2
  { codigo: 'MS05010022', descripcion: 'CONJUNTO PRIMERA CAPA CARGA - T S', stock: 39, cat: 'Uniformes' },  // 21+18
  { codigo: 'MS05010023', descripcion: 'CONJUNTO PRIMERA CAPA CARGA - T XL', stock: 78, cat: 'Uniformes' },
  { codigo: 'MS05010024', descripcion: 'CONJUNTO PRIMERA CAPA CARGA - T XXL', stock: 13, cat: 'Uniformes' },
  { codigo: 'MS05010025', descripcion: 'CONJUNTO PRIMERA CAPA CARGA - T XXXL', stock: 15, cat: 'Uniformes' }, // 12+3
  { codigo: 'MS05010026', descripcion: 'CUELLO DE POLAR - T ÚNICA', stock: 210, cat: 'Uniformes' },
  { codigo: 'MS05010028', descripcion: 'GORRO DE POLAR - T ÚNICA', stock: 47, cat: 'Uniformes' },
  { codigo: 'MS05010029', descripcion: 'JARDINERA TERMICA - T L', stock: 27, cat: 'Uniformes' },
  { codigo: 'MS05010030', descripcion: 'JARDINERA TERMICA - T M', stock: 17, cat: 'Uniformes' },
  { codigo: 'MS05010032', descripcion: 'JARDINERA TERMICA - T XL', stock: 33, cat: 'Uniformes' },
  { codigo: 'MS05010033', descripcion: 'JARDINERA TERMICA - T XXL', stock: 27, cat: 'Uniformes' },
  { codigo: 'MS05010035', descripcion: 'PANTALON AZUL OPERATIVO - H - T 40', stock: 90, cat: 'Uniformes' },
  { codigo: 'MS05010036', descripcion: 'PANTALON AZUL OPERATIVO - H - T 42', stock: 169, cat: 'Uniformes' },
  { codigo: 'MS05010037', descripcion: 'PANTALON AZUL OPERATIVO - H - T 44', stock: 131, cat: 'Uniformes' },
  { codigo: 'MS05010038', descripcion: 'PANTALON AZUL OPERATIVO - H - T 46', stock: 292, cat: 'Uniformes' },
  { codigo: 'MS05010039', descripcion: 'PANTALON AZUL OPERATIVO - H - T 48', stock: 262, cat: 'Uniformes' },
  { codigo: 'MS05010040', descripcion: 'PANTALON AZUL OPERATIVO - H - T 50', stock: 178, cat: 'Uniformes' },
  { codigo: 'MS05010041', descripcion: 'PANTALON AZUL OPERATIVO - H - T 52', stock: 111, cat: 'Uniformes' },
  { codigo: 'MS05010042', descripcion: 'PANTALON AZUL OPERATIVO - H - T 54', stock: 103, cat: 'Uniformes' },
  { codigo: 'MS05010043', descripcion: 'PANTALON AZUL OPERATIVO - H - T 56', stock: 105, cat: 'Uniformes' },
  { codigo: 'MS05010044', descripcion: 'PANTALON AZUL OPERATIVO - H - T 58', stock: 81, cat: 'Uniformes' },
  { codigo: 'MS05010045', descripcion: 'PANTALON AZUL OPERATIVO - H - T 60', stock: 66, cat: 'Uniformes' },
  { codigo: 'MS05010048', descripcion: 'PANTALON AZUL TACTICO - H - T 46', stock: 7, cat: 'Uniformes' },
  { codigo: 'MS05010050', descripcion: 'PANTALON AZUL TACTICO - H - T 50', stock: 6, cat: 'Uniformes' },
  { codigo: 'MS05010054', descripcion: 'PANTALON AZUL TACTICO - M - T 40', stock: 12, cat: 'Uniformes' },
  { codigo: 'MS05010055', descripcion: 'PANTALON AZUL TACTICO - M - T 42', stock: 9, cat: 'Uniformes' },
  { codigo: 'MS05010056', descripcion: 'PANTALON AZUL TACTICO - M - T 44', stock: 10, cat: 'Uniformes' },
  { codigo: 'MS05010057', descripcion: 'PANTALON AZUL TACTICO - M - T 46', stock: 15, cat: 'Uniformes' },
  { codigo: 'MS05010060', descripcion: 'PANTALON AZUL TACTICO - M - T 52', stock: 1, cat: 'Uniformes' },
  { codigo: 'MS05010061', descripcion: 'PARKA BICOLOR REFLECTANTE - T L', stock: 156, cat: 'Uniformes' }, // 67+89
  { codigo: 'MS05010062', descripcion: 'PARKA BICOLOR REFLECTANTE - T M', stock: 209, cat: 'Uniformes' },
  { codigo: 'MS05010063', descripcion: 'PARKA BICOLOR REFLECTANTE - T S', stock: 58, cat: 'Uniformes' },
  { codigo: 'MS05010064', descripcion: 'PARKA BICOLOR REFLECTANTE - T XL', stock: 160, cat: 'Uniformes' },
  { codigo: 'MS05010065', descripcion: 'PARKA BICOLOR REFLECTANTE - T XS', stock: 1, cat: 'Uniformes' },
  { codigo: 'MS05010066', descripcion: 'PARKA BICOLOR REFLECTANTE - T XXL', stock: 94, cat: 'Uniformes' }, // 18+76
  { codigo: 'MS05010067', descripcion: 'PARKA BICOLOR REFLECTANTE - T XXXL', stock: 35, cat: 'Uniformes' },
  { codigo: 'MS05010068', descripcion: 'PARKA BICOLOR REFLECTANTE - T XXXXL', stock: 23, cat: 'Uniformes' },
  { codigo: 'MS05010069', descripcion: 'PARKA BICOLOR REFLECTANTE - T XXXXXL', stock: 8, cat: 'Uniformes' },
  { codigo: 'MS05010070', descripcion: 'PARKA DE PLUMA AZUL - H - T L', stock: 24, cat: 'Uniformes' },
  { codigo: 'MS05010071', descripcion: 'PARKA DE PLUMA AZUL - H - T M', stock: 19, cat: 'Uniformes' },
  { codigo: 'MS05010072', descripcion: 'PARKA DE PLUMA AZUL - H - T S', stock: 9, cat: 'Uniformes' },
  { codigo: 'MS05010073', descripcion: 'PARKA DE PLUMA AZUL - H - T XL', stock: 9, cat: 'Uniformes' },
  { codigo: 'MS05010074', descripcion: 'PARKA DE PLUMA AZUL - H - T XXL', stock: 12, cat: 'Uniformes' },
  { codigo: 'MS05010075', descripcion: 'PARKA DE PLUMA AZUL - H - T XXXL', stock: 12, cat: 'Uniformes' },
  { codigo: 'MS05010076', descripcion: 'PARKA DE PLUMA AZUL - M - T L', stock: 19, cat: 'Uniformes' },
  { codigo: 'MS05010077', descripcion: 'PARKA DE PLUMA AZUL - M - T M', stock: 17, cat: 'Uniformes' },
  { codigo: 'MS05010078', descripcion: 'PARKA DE PLUMA AZUL - M - T S', stock: 15, cat: 'Uniformes' },
  { codigo: 'MS05010079', descripcion: 'PARKA DE PLUMA AZUL - M - T XL', stock: 15, cat: 'Uniformes' },
  { codigo: 'MS05010080', descripcion: 'POLAR BICOLOR REFLECTANTE - T L', stock: 144, cat: 'Uniformes' },
  { codigo: 'MS05010081', descripcion: 'POLAR BICOLOR REFLECTANTE - T M', stock: 104, cat: 'Uniformes' },
  { codigo: 'MS05010082', descripcion: 'POLAR BICOLOR REFLECTANTE - T S', stock: 41, cat: 'Uniformes' },
  { codigo: 'MS05010083', descripcion: 'POLAR BICOLOR REFLECTANTE - T XL', stock: 60, cat: 'Uniformes' },
  { codigo: 'MS05010084', descripcion: 'POLAR BICOLOR REFLECTANTE - T XXL', stock: 20, cat: 'Uniformes' },
  { codigo: 'MS05010085', descripcion: 'POLAR BICOLOR REFLECTANTE - T XXXL', stock: 10, cat: 'Uniformes' },
  { codigo: 'MS05010086', descripcion: 'POLAR BICOLOR REFLECTANTE - T XXXXL', stock: 17, cat: 'Uniformes' }, // 11+6
  { codigo: 'MS05010087', descripcion: 'POLAR BICOLOR REFLECTANTE - T XXXXXL', stock: 9, cat: 'Uniformes' },
  { codigo: 'MS05010088', descripcion: 'POLERA PIQUE BLANCA MANGA LARGA - T L', stock: 63, cat: 'Uniformes' },
  { codigo: 'MS05010089', descripcion: 'POLERA PIQUE BLANCA MANGA LARGA - T M', stock: 2, cat: 'Uniformes' },
  { codigo: 'MS05010090', descripcion: 'POLERA PIQUE BLANCA MANGA LARGA - T S', stock: 5, cat: 'Uniformes' },
  { codigo: 'MS05010091', descripcion: 'POLERA PIQUE BLANCA MANGA LARGA - T XL', stock: 2, cat: 'Uniformes' },
  { codigo: 'MS05010093', descripcion: 'POLERA PIQUE CELESTE - H - T L', stock: 28, cat: 'Uniformes' },
  { codigo: 'MS05010094', descripcion: 'POLERA PIQUE CELESTE - H - T M', stock: 9, cat: 'Uniformes' },
  { codigo: 'MS05010095', descripcion: 'POLERA PIQUE CELESTE - H - T S', stock: 5, cat: 'Uniformes' },
  { codigo: 'MS05010097', descripcion: 'POLERA PIQUE CELESTE - H - T XXL', stock: 3, cat: 'Uniformes' },
  { codigo: 'MS05010098', descripcion: 'POLERA PIQUE CELESTE - H - T XXXL', stock: 5, cat: 'Uniformes' },
  { codigo: 'MS05010099', descripcion: 'POLERA PIQUE CELESTE - M - T L', stock: 4, cat: 'Uniformes' },
  { codigo: 'MS05010103', descripcion: 'POLERA PIQUE FLUOR MARINO - T L', stock: 777, cat: 'Uniformes' },
  { codigo: 'MS05010104', descripcion: 'POLERA PIQUE FLUOR MARINO - T M', stock: 561, cat: 'Uniformes' }, // 283+278
  { codigo: 'MS05010105', descripcion: 'POLERA PIQUE FLUOR MARINO - T S', stock: 348, cat: 'Uniformes' },
  { codigo: 'MS05010106', descripcion: 'POLERA PIQUE FLUOR MARINO - T XL', stock: 499, cat: 'Uniformes' },
  { codigo: 'MS05010107', descripcion: 'POLERA PIQUE FLUOR MARINO - T XXL', stock: 90, cat: 'Uniformes' },
  { codigo: 'MS05010108', descripcion: 'POLERA PIQUE FLUOR MARINO - T XXXL', stock: 174, cat: 'Uniformes' },
  { codigo: 'MS05010109', descripcion: 'POLERA PIQUE FLUOR MARINO - T XXXXL', stock: 51, cat: 'Uniformes' },
  { codigo: 'MS05010110', descripcion: 'POLERA PIQUE FLUOR MARINO - T XXXXXL', stock: 47, cat: 'Uniformes' },
  { codigo: 'MS05010112', descripcion: 'TRAJE DE AGUA - T M', stock: 22, cat: 'Uniformes' },
  { codigo: 'MS05010114', descripcion: 'TRAJE DE AGUA - T XL', stock: 11, cat: 'Uniformes' },
  { codigo: 'MS05010115', descripcion: 'TRAJE DE AGUA - T XXL', stock: 16, cat: 'Uniformes' },
  { codigo: 'MS05010118', descripcion: 'CHAQUETA CORTAVIENTO AZUL - T M', stock: 17, cat: 'Uniformes' },
  { codigo: 'MS05010119', descripcion: 'CHAQUETA CORTAVIENTO AZUL - T L', stock: 12, cat: 'Uniformes' },
  { codigo: 'MS05010120', descripcion: 'CHAQUETA CORTAVIENTO AZUL - T XL', stock: 7, cat: 'Uniformes' },
  { codigo: 'MS05010121', descripcion: 'CHAQUETA CORTAVIENTO AZUL - T XXL', stock: 4, cat: 'Uniformes' },
  { codigo: 'MS05010122', descripcion: 'CHAQUETA CORTAVIENTO AZUL - T XXXL', stock: 7, cat: 'Uniformes' },
  { codigo: 'MS05010123', descripcion: 'PORTATICA DE BRAZO', stock: 2, cat: 'Uniformes' },
  { codigo: 'MS05010132', descripcion: 'PANTALON TALLA 40', stock: 21, cat: 'Uniformes' }, // 16+5
  { codigo: 'MS05010133', descripcion: 'PANTALON TALLA 42', stock: 21, cat: 'Uniformes' },
  { codigo: 'MS05010134', descripcion: 'PANTALON TALLA 44', stock: 28, cat: 'Uniformes' },
  { codigo: 'MS05010135', descripcion: 'PANTALON TALLA 46', stock: 194, cat: 'Uniformes' },
  { codigo: 'MS05010136', descripcion: 'PANTALON TALLA 48', stock: 14, cat: 'Uniformes' },
  { codigo: 'MS05010137', descripcion: 'PANTALON TALLA 50', stock: 11, cat: 'Uniformes' },
  { codigo: 'MS05010138', descripcion: 'PANTALON TALLA 52', stock: 8, cat: 'Uniformes' },
  { codigo: 'MS05010139', descripcion: 'PANTALON TALLA 54', stock: 3, cat: 'Uniformes' },
  { codigo: 'MS05010140', descripcion: 'PANTALON TALLA 56', stock: 3, cat: 'Uniformes' },
  { codigo: 'MS05010177', descripcion: 'BUZO TERMICO T/S', stock: 36, cat: 'Uniformes' },
  { codigo: 'MS05010178', descripcion: 'BUZO TERMICO T/M', stock: 70, cat: 'Uniformes' },
  { codigo: 'MS05010179', descripcion: 'BUZO TERMICO T/L', stock: 75, cat: 'Uniformes' },
  { codigo: 'MS05010180', descripcion: 'BUZO TERMICO T/XL', stock: 46, cat: 'Uniformes' },
  { codigo: 'MS05010181', descripcion: 'BUZO TERMICO T/XXL', stock: 12, cat: 'Uniformes' },
  { codigo: 'MS05010183', descripcion: 'PRIMERA CAPA CARGA - T XXXXXL', stock: 1, cat: 'Uniformes' },
  { codigo: 'MS05010185', descripcion: 'POLAR ADMINISTRATIVO M - T M', stock: 13, cat: 'Uniformes' }, // 4+9
  { codigo: 'MS05010186', descripcion: 'POLAR ADMINISTRATIVO M - T L', stock: 20, cat: 'Uniformes' },
  { codigo: 'MS05010188', descripcion: 'POLAR ADMINISTRATIVO M - T XXL', stock: 15, cat: 'Uniformes' },
  { codigo: 'MS05010189', descripcion: 'POLAR ADMINISTRATIVO H - T S', stock: 2, cat: 'Uniformes' },
  { codigo: 'MS05010190', descripcion: 'POLAR ADMINISTRATIVO H - T M', stock: 23, cat: 'Uniformes' }, // 13+10
  { codigo: 'MS05010191', descripcion: 'POLAR ADMINISTRATIVO H - T L', stock: 9, cat: 'Uniformes' },
  { codigo: 'MS05010192', descripcion: 'POLAR ADMINISTRATIVO H - T XL', stock: 4, cat: 'Uniformes' },
  { codigo: 'MS05010193', descripcion: 'POLAR ADMINISTRATIVO H - T XXL', stock: 3, cat: 'Uniformes' },
  { codigo: 'MS05010194', descripcion: 'PARKA BICOLOR REFLECTANTE T-6XL', stock: 2, cat: 'Uniformes' },
  { codigo: 'MS05010223', descripcion: 'PANTALÓN TÉRMICO S', stock: 7, cat: 'Uniformes' },
  { codigo: 'MS05010225', descripcion: 'PANTALÓN TÉRMICO L', stock: 4, cat: 'Uniformes' },
  { codigo: 'MS05010241', descripcion: 'CLIP SUJETA GUANTE', stock: 1, cat: 'Uniformes' },
  { codigo: 'MS05010244', descripcion: 'POLAR ADMINISTRATIVO M - T XXXL', stock: 1, cat: 'Uniformes' },
  { codigo: 'MS05010247', descripcion: 'POLERA PIQUE AZUL MANGA CORTA H /TXXXL', stock: 5, cat: 'Uniformes' },
  { codigo: 'MS05010276', descripcion: 'PANTALON AZUL OPERATIVO - H - T 38', stock: 9, cat: 'Uniformes' },
  { codigo: 'MS05010278', descripcion: 'POLAR ADMINISTRATIVO H - T XXXL', stock: 1, cat: 'Uniformes' },
  // ─── EPP (MS06) ────────────────────────────────────────────────
  { codigo: 'MS06010002', descripcion: 'BOTA DE GOMA CUBRECALZADO - T M', stock: 15, cat: 'EPP' },
  { codigo: 'MS06010004', descripcion: 'BOTA DE GOMA CUBRECALZADO - T XL', stock: 16, cat: 'EPP' },
  { codigo: 'MS06010005', descripcion: 'CANILLERA - T L', stock: 154, cat: 'EPP' },
  { codigo: 'MS06010006', descripcion: 'CANILLERA - T M', stock: 59, cat: 'EPP' },
  { codigo: 'MS06010007', descripcion: 'CANILLERA - T S', stock: 13, cat: 'EPP' },
  { codigo: 'MS06010009', descripcion: 'CASCO DE SEGURIDAD AMARILLO', stock: 7, cat: 'EPP' },
  { codigo: 'MS06010010', descripcion: 'CASCO DE SEGURIDAD AZUL', stock: 61, cat: 'EPP' },
  { codigo: 'MS06010011', descripcion: 'CASCO DE SEGURIDAD BLANCO', stock: 20, cat: 'EPP' },
  { codigo: 'MS06010034', descripcion: 'GUANTE DE NITRILO - T L', stock: 35, cat: 'EPP' }, // 20+15
  { codigo: 'MS06010035', descripcion: 'GUANTE DE NITRILO - T M', stock: 60, cat: 'EPP' },
  { codigo: 'MS06010036', descripcion: 'GUANTE DE NITRILO - T S', stock: 40, cat: 'EPP' },
  { codigo: 'MS06010060', descripcion: 'JOCKEY LEGIONARIO', stock: 47, cat: 'EPP' },
  { codigo: 'MS06010069', descripcion: 'PUNTERAS DE SEGURIDAD', stock: 20, cat: 'EPP' },
  { codigo: 'MS06010072', descripcion: 'RODILLERA - T S', stock: 19, cat: 'EPP' },
  { codigo: 'MS06010078', descripcion: 'ZAPATO DE SEGURIDAD - H - T 36', stock: 6, cat: 'EPP' },
  { codigo: 'MS06010079', descripcion: 'ZAPATO DE SEGURIDAD - H - T 37', stock: 4, cat: 'EPP' },
  { codigo: 'MS06010080', descripcion: 'ZAPATO DE SEGURIDAD - H - T 38', stock: 16, cat: 'EPP' },
  { codigo: 'MS06010081', descripcion: 'ZAPATO DE SEGURIDAD - H - T 39', stock: 24, cat: 'EPP' }, // 8+16
  { codigo: 'MS06010082', descripcion: 'ZAPATO DE SEGURIDAD - H - T 40', stock: 16, cat: 'EPP' }, // 13+3
  { codigo: 'MS06010083', descripcion: 'ZAPATO DE SEGURIDAD - H - T 41', stock: 53, cat: 'EPP' },
  { codigo: 'MS06010084', descripcion: 'ZAPATO DE SEGURIDAD - H - T 42', stock: 33, cat: 'EPP' }, // 31+2
  { codigo: 'MS06010085', descripcion: 'ZAPATO DE SEGURIDAD - H - T 43', stock: 36, cat: 'EPP' },
  { codigo: 'MS06010086', descripcion: 'ZAPATO DE SEGURIDAD - H - T 44', stock: 1, cat: 'EPP' },
  { codigo: 'MS06010087', descripcion: 'ZAPATO DE SEGURIDAD - H - T 45', stock: 1, cat: 'EPP' },
  { codigo: 'MS06010088', descripcion: 'ZAPATO DE SEGURIDAD - H - T 46', stock: 6, cat: 'EPP' },
  { codigo: 'MS06010091', descripcion: 'ZAPATO DE SEGURIDAD - M - T 35', stock: 3, cat: 'EPP' }, // 2+1
  { codigo: 'MS06010109', descripcion: 'GUANTE NITRILO X100 UNDS', stock: 20, cat: 'EPP' },
  { codigo: 'MS06010116', descripcion: 'PROTECTOR SOLAR INDIVIDUAL 120G.', stock: 12, cat: 'EPP' },
  { codigo: 'MS06010121', descripcion: 'TRAJE BUZO DESECHABLE BLANCO / RAMPA', stock: 366, cat: 'EPP' },
  { codigo: 'MS06010136', descripcion: 'ZAPATO BOTIN EDELBROCK 170 TALLA 47', stock: 2, cat: 'EPP' },
  { codigo: 'MS06010138', descripcion: 'CASCO DE SEGURIDAD ROJO', stock: 6, cat: 'EPP' },
  { codigo: 'MS06010141', descripcion: 'ZAPATOS DE SEGURIDAD EDELBROCK TALLA 36', stock: 1, cat: 'EPP' },
  { codigo: 'MS06010143', descripcion: 'GUANTE ATOX CHEETAH T- L', stock: 83, cat: 'EPP' },
  { codigo: 'MS06010188', descripcion: 'POLERA M-L PIQUE AZUL M. HOMBRE - T/M', stock: 34, cat: 'EPP' },
  { codigo: 'MS06010189', descripcion: 'POLERA M-L PIQUE AZUL M. HOMBRE - T/L', stock: 9, cat: 'EPP' },
  { codigo: 'MS06010190', descripcion: 'POLERA M-L PIQUE AZUL M. HOMBRE - T/XL', stock: 9, cat: 'EPP' },
  { codigo: 'MS06010191', descripcion: 'POLERA M-L PIQUE AZUL M. HOMBRE - T/XXL', stock: 6, cat: 'EPP' },
  { codigo: 'MS06010192', descripcion: 'POLERA M-C PIQUE AZUL M HOMBRE - TALLA M', stock: 11, cat: 'EPP' },
  { codigo: 'MS06010193', descripcion: 'POLERA M-C PIQUE AZUL M HOMBRE - TALLA L', stock: 5, cat: 'EPP' },
  { codigo: 'MS06010194', descripcion: 'POLERA M-C PIQUE AZUL M HOMBRE - T/ XL', stock: 6, cat: 'EPP' },
  { codigo: 'MS06010195', descripcion: 'POLERA M-C PIQUE AZUL M HOMBRE - T/ XXL', stock: 4, cat: 'EPP' },
  { codigo: 'MS06010210', descripcion: 'BUZO BLANCO DESECHABLE T/S-M-L', stock: 365, cat: 'EPP' },
  { codigo: 'MS06010222', descripcion: 'POLERA M-L PIQUE AZUL MARINO MUJER - T/M', stock: 6, cat: 'EPP' },
  { codigo: 'MS06010223', descripcion: 'POLERA M-L PIQUE AZUL MARINO MUJER - T/L', stock: 12, cat: 'EPP' },
  { codigo: 'MS06010282', descripcion: 'POLERA M-L PIQUE AZUL M. HOMBRE - T/S', stock: 28, cat: 'EPP' },
  { codigo: 'MS06010283', descripcion: 'POLERA M-C PIQUE AZUL M HOMBRE - T/ S', stock: 18, cat: 'EPP' },
  { codigo: 'MS06010287', descripcion: 'POLERA M-C PIQUE AZUL MUJER - T/ M', stock: 4, cat: 'EPP' },
  { codigo: 'MS06010288', descripcion: 'POLERA M-C PIQUE AZUL MUJER - T/ L', stock: 8, cat: 'EPP' },
  { codigo: 'MS06010292', descripcion: 'GUANTE ATOX CHEETAH T- M', stock: 48, cat: 'EPP' },
  { codigo: 'MS06010294', descripcion: 'BOTA DE GOMA CUBRECALZADO - T XXL', stock: 11, cat: 'EPP' },
  { codigo: 'MS06020000', descripcion: 'FONO PROTECTOR AUDITIVO', stock: 116, cat: 'EPP' },
  { codigo: 'MS06020003', descripcion: 'TAPON PROTECTOR AUDITIVO', stock: 55, cat: 'EPP' },
  { codigo: 'MS06030005', descripcion: 'LENTES US EAGLE CLARO', stock: 154, cat: 'EPP' },
  { codigo: 'MS06030006', descripcion: 'LENTES US EAGLE GRIS', stock: 179, cat: 'EPP' },
  { codigo: 'MS06040006', descripcion: 'MASCARILLA QUIRURGICA DE 3 PLIEGUES', stock: 25, cat: 'EPP' },
  { codigo: 'MS06050000', descripcion: 'ARNES DE SEGURIDAD - T L', stock: 8, cat: 'EPP' },
  { codigo: 'MS06070001', descripcion: 'CHALECO REFLECTANTE AMARILLO - T L', stock: 19, cat: 'EPP' },
  { codigo: 'MS06070002', descripcion: 'CHALECO REFLECTANTE AMARILLO - T M', stock: 10, cat: 'EPP' },
  { codigo: 'MS06070004', descripcion: 'CHALECO REFLECTANTE AMARILLO - T XL', stock: 5, cat: 'EPP' },
  { codigo: 'MS06070012', descripcion: 'CHALECO REFLECTANTE AMARILLO - T 2XL', stock: 1, cat: 'EPP' },
];

async function main() {
  console.log('🌱 Cargando productos reales Aerosan - Bodega de Insumos...');

  // Categorías con colores
  const categoriasConfig = [
    { nombre: 'Insumos Oficina', color: '#3b82f6' },
    { nombre: 'Materiales Embalaje', color: '#8b5cf6' },
    { nombre: 'Uniformes', color: '#f59e0b' },
    { nombre: 'EPP', color: '#ef4444' },
  ];

  const categorias: Record<string, string> = {};
  for (const cat of categoriasConfig) {
    const created = await prisma.categoria.upsert({
      where: { nombre: cat.nombre },
      update: { color: cat.color },
      create: { nombre: cat.nombre, color: cat.color, descripcion: `Categoría ${cat.nombre}` },
    });
    categorias[cat.nombre] = created.id;
    console.log(`  ✅ Categoría: ${cat.nombre}`);
  }

  // Bodega Insumos
  const bodega = await prisma.bodega.upsert({
    where: { codigo: 'BOD-INSUMOS' },
    update: {},
    create: { codigo: 'BOD-INSUMOS', nombre: 'Bodega de Insumos', ubicacion: 'Aerosan - Chile' },
  });
  console.log(`  ✅ Bodega: ${bodega.nombre}`);

  // Limpiar productos existentes del seed anterior
  await prisma.producto.deleteMany({
    where: { codigoProducto: { startsWith: 'LUB-' } },
  });
  await prisma.producto.deleteMany({
    where: { codigoProducto: { startsWith: 'REP-' } },
  });

  // Cargar productos reales
  let creados = 0;
  let actualizados = 0;

  for (const p of rawProducts) {
    const catId = categorias[p.cat];
    if (!catId) continue;

    await prisma.producto.upsert({
      where: { codigoProducto: p.codigo },
      update: {
        descripcion: p.descripcion,
        stockActual: p.stock,
        categoriaId: catId,
      },
      create: {
        codigoProducto: p.codigo,
        codigoSap: p.codigo,
        descripcion: p.descripcion,
        unidadMedida: 'UN',
        stockActual: p.stock,
        stockMinimo: 0,
        stockSeguridad: 0,
        puntoPedido: 0,
        leadTimeDias: 21,
        criticidad: 'MEDIO',
        categoriaId: catId,
      },
    });

    creados++;
  }

  console.log(`\n✅ ${creados} productos cargados correctamente`);
  console.log(`📦 Bodega de Insumos Aerosan lista`);
  console.log(`\nResumen por categoría:`);
  for (const cat of categoriasConfig) {
    const count = rawProducts.filter(p => p.cat === cat.nombre).length;
    console.log(`  ${cat.nombre}: ${count} productos`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
