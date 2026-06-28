import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { InventoryModule } from '../inventory/inventory.module';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}