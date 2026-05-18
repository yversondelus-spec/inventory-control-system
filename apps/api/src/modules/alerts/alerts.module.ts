// alerts.module.ts
import { Module } from '@nestjs/common';

import { AlertEngineService } from './alert-engine.service';
import { AlertsController } from './alerts.controller';
import { AlertsService } from './alerts.service';

export { AlertsModule };

@Module({
  controllers: [AlertsController],
  providers: [AlertsService, AlertEngineService],
  exports: [AlertsService, AlertEngineService],
})
class AlertsModule {}
