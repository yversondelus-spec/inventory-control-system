import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import type { Job } from 'bullmq';

import { AlertEngineService } from '../../modules/alerts/alert-engine.service';

@Processor('alert-check')
export class AlertCheckProcessor extends WorkerHost {
  private readonly logger = new Logger(AlertCheckProcessor.name);

  constructor(private readonly alertEngine: AlertEngineService) {
    super();
  }

  async process(_job: Job): Promise<void> {
    this.logger.log('Ejecutando chequeo programado de alertas...');
    const result = await this.alertEngine.runFullCheck();
    this.logger.log(`Check completado: ${JSON.stringify(result)}`);
  }
}