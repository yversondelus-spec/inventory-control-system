import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';

import { AlertsModule } from '../modules/alerts/alerts.module';
import { InventoryModule } from '../modules/inventory/inventory.module';
import { AlertCheckProcessor } from './processors/alert-check.processor';
import { SapFileProcessor } from './processors/sap-file.processor';

export const QUEUE_NAMES = {
  SAP_PROCESSING: 'sap-processing',
  ALERT_CHECK: 'alert-check',
  METRICS_RECALC: 'metrics-recalc',
} as const;

@Module({
  imports: [
    BullModule.registerQueue(
      { name: QUEUE_NAMES.SAP_PROCESSING },
      { name: QUEUE_NAMES.ALERT_CHECK },
      { name: QUEUE_NAMES.METRICS_RECALC },
    ),
    InventoryModule,
    AlertsModule,
  ],
  providers: [SapFileProcessor, AlertCheckProcessor],
  exports: [BullModule],
})
export class QueueModule {}
