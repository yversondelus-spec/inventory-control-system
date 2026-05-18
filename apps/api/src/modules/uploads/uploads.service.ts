import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SapParserService } from './sap-parser/sap-parser.service';
import { AlertEngineService } from '../alerts/alert-engine.service';

@Injectable()
export class UploadsService {
  private readonly logger = new Logger(UploadsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sapParser: SapParserService,
    private readonly alertEngine: AlertEngineService,
  ) {}

  private extractDateFromFilename(filename: string): Date {
    const meses: Record<string, number> = {
      'ENERO': 0, 'FEBRERO': 1, 'MARZO': 2, 'ABRIL': 3,
      'MAYO': 4, 'JUNIO': 5, 'JULIO': 6, 'AGOSTO': 7,
      'SEPTIEMBRE': 8, 'OCTUBRE': 9, 'NOVIEMBRE': 10, 'DICIEMBRE': 11,
    };

    const matchEspanol = /(\d{1,2})\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)\s+(\d{4})/i.exec(filename);
    if (matchEspanol) {
      const dia = parseInt(matchEspanol[1]);
      const mes = meses[matchEspanol[2].toUpperCase()];
      const anio = parseInt(matchEspanol[3]);
      return new Date(anio, mes, dia, 12, 0, 0);
    }

    const matchISO = /(\d{4})-(\d{2})-(\d{2})/.exec(filename);
    if (matchISO) {
      return new Date(parseInt(matchISO[1]), parseInt(matchISO[2]) - 1, parseInt(matchISO[3]), 12, 0, 0);
    }

    return new Date();
  }

  async processUpload(file: Express.Multer.File, usuarioId: string) {
    const upload = await this.prisma.upload.create({
      data: {
        usuarioId,
        nombreArchivo: file.originalname,
        tipoArchivo: file.mimetype,
        tamanoBytes: file.size,
        filePath: file.path,
        estado: 'PROCESANDO',
      },
    });

    try {
      const result = await this.sapParser.parse(file.path);
      const fechaArchivo = this.extractDateFromFilename(file.originalname);
      this.logger.log(`Fecha extraída del archivo: ${fechaArchivo.toISOString()}`);

      const codigos = result.data.map((r) => r.codigoSap);
      const productos = await this.prisma.producto.findMany({
        where: {
          OR: [
            { codigoSap: { in: codigos } },
            { codigoProducto: { in: codigos } },
          ],
        },
      });

      const productoMap = new Map<string, typeof productos[0]>();
      for (const p of productos) {
        if (p.codigoSap) productoMap.set(p.codigoSap, p);
        productoMap.set(p.codigoProducto, p);
      }

      let procesados = 0;
      let errores = 0;
      const errorList: Array<{ codigoSap: string; error: string }> = [];
      const updateOps: any[] = [];
      const movimientoOps: any[] = [];

      for (const row of result.data) {
        const producto = productoMap.get(row.codigoSap);

        if (!producto) {
          errorList.push({ codigoSap: row.codigoSap, error: 'Producto no encontrado' });
          errores++;
          continue;
        }

        if (row.stockLibre !== undefined) {
          const stockAnterior = producto.stockActual;
          const nuevoStock = row.stockLibre;

          updateOps.push(
            this.prisma.producto.update({
              where: { id: producto.id },
              data: { stockActual: nuevoStock, ultimoMovimiento: fechaArchivo },
            })
          );

          movimientoOps.push(
            this.prisma.movimiento.create({
              data: {
                productoId: producto.id,
                tipo: nuevoStock >= stockAnterior ? 'AJUSTE_POSITIVO' : 'AJUSTE_NEGATIVO',
                cantidad: Math.abs(nuevoStock - stockAnterior),
                cantidadAntes: stockAnterior,
                cantidadDespues: nuevoStock,
                fecha: fechaArchivo,
                origen: 'SAP_UPLOAD',
                uploadId: upload.id,
                referencia: `Upload SAP: ${file.originalname}`,
              },
            })
          );
          procesados++;
        }
      }

      const batchSize = 20;
      for (let i = 0; i < updateOps.length; i += batchSize) {
        await Promise.all(updateOps.slice(i, i + batchSize));
      }
      for (let i = 0; i < movimientoOps.length; i += batchSize) {
        await Promise.all(movimientoOps.slice(i, i + batchSize));
      }

      const estado = procesados === 0 ? 'ERROR' : errores > 0 ? 'PARCIAL' : 'COMPLETADO';

      await this.prisma.upload.update({
        where: { id: upload.id },
        data: {
          estado,
          totalRegistros: result.total,
          registrosProcesados: procesados,
          registrosError: errores,
          errores: errorList.length > 0 ? errorList : undefined,
          procesadoAt: new Date(),
        },
      });

      this.alertEngine.runFullCheck().catch((e) =>
        this.logger.error(`Error en motor de alertas: ${e.message}`)
      );

      return {
        success: true,
        data: { id: upload.id, estado, totalRegistros: result.total, registrosProcesados: procesados, registrosError: errores },
      };
    } catch (e) {
      this.logger.error(`Error procesando upload: ${(e as Error).message}`);
      await this.prisma.upload.update({
        where: { id: upload.id },
        data: { estado: 'ERROR', errores: [{ error: (e as Error).message }], procesadoAt: new Date() },
      });
      throw e;
    }
  }

  async getUploads() {
    const items = await this.prisma.upload.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    return {
      success: true,
      data: {
        data: items.map((u) => ({
          id: u.id,
          nombreArchivo: u.nombreArchivo,
          estado: u.estado,
          totalFilas: u.totalRegistros,
          filasProcessadas: u.registrosProcesados,
          errores: u.registrosError,
          createdAt: u.createdAt,
        })),
        meta: { total: items.length },
      },
    };
  }
}