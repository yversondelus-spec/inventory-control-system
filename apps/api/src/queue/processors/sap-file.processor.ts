import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { PrismaService } from '../../prisma/prisma.service';
import { AlertEngineService } from '../../modules/alerts/alert-engine.service';
import { InventoryService } from '../../modules/inventory/inventory.service';

export interface SapFileJobData {
  uploadId: string;
  filePath: string;
  userId: string;
}

@Processor('sap-processing')
export class SapFileProcessor extends WorkerHost {
  private readonly logger = new Logger(SapFileProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly inventoryService: InventoryService,
    private readonly alertEngine: AlertEngineService,
  ) {
    super();
  }

  async process(job: Job<SapFileJobData>): Promise<void> {
    const { uploadId, filePath } = job.data;
    this.logger.log(`Procesando upload ${uploadId} — archivo: ${filePath}`);

    try {
      await this.updateUploadStatus(uploadId, 'PROCESANDO');
      await job.updateProgress(5);

      const { SapParserService } = await import('../../modules/uploads/sap-parser/sap-parser.service');
      const parser = new SapParserService();
      const parseResult = await parser.parse(filePath);
      await job.updateProgress(30);

      const BATCH_SIZE = 100;
      let processed = 0;

      for (let i = 0; i < parseResult.data.length; i += BATCH_SIZE) {
        const batch = parseResult.data.slice(i, i + BATCH_SIZE);
        await this.inventoryService.processBatch(
          batch.map((r) => ({
            codigoSap: r.codigoSap,
            stockSap: r.stockLibre ?? 0,
            fecha: r.fechaMovimiento ?? new Date(),
          })),
          uploadId,
        );
        processed += batch.length;
        const progress = 30 + Math.floor((processed / parseResult.data.length) * 40);
        await job.updateProgress(progress);
      }

      await job.updateProgress(75);
      await this.inventoryService.recalculateAllMetrics();

      await job.updateProgress(90);
      const alertResult = await this.alertEngine.runFullCheck();

      await this.updateUploadStatus(uploadId, 'COMPLETADO', {
        totalRegistros: parseResult.total,
        registrosProcesados: parseResult.processed,
        registrosError: parseResult.errors.length,
        errores: parseResult.errors.slice(0, 100),
        procesadoAt: new Date(),
      });

      await job.updateProgress(100);
      this.logger.log(`Upload ${uploadId} completado. Alertas: ${alertResult.created} nuevas`);

    } catch (error) {
      this.logger.error(`Error procesando upload ${uploadId}`, error);
      await this.updateUploadStatus(uploadId, 'ERROR', {
        errores: [{ message: (error as Error).message }],
      });
      throw error;
    }
  }

  private async updateUploadStatus(id: string, estado: string, extra: Record<string, unknown> = {}) {
    await this.prisma.upload.update({
      where: { id },
      data: { estado: estado as never, ...extra },
    });
  }
}