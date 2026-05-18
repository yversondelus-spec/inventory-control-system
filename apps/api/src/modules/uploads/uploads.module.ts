import { Module } from '@nestjs/common';
import { AlertsModule } from '../alerts/alerts.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { SapParserService } from './sap-parser/sap-parser.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  imports: [PrismaModule, AlertsModule],
  controllers: [UploadsController],
  providers: [UploadsService, SapParserService],
})
export class UploadsModule {}