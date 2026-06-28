import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@repo/shared-types';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ReportsService } from './reports.service';

@ApiTags('Reports')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('daily-inventory')
  @ApiOperation({ summary: 'Reporte diario de inventario' })
  getDailyInventoryReport() {
    return this.reportsService.getDailyInventoryReport();
  }

  @Get('movements')
  @ApiOperation({ summary: 'Movimientos de los últimos N días' })
  getMovementReport(@Query('days') days?: number) {
    return this.reportsService.getMovementReport(days ? Number(days) : 30);
  }

  @Get('alerts')
  @ApiOperation({ summary: 'Resumen de alertas y tendencias' })
  getAlertSummaryReport(@Query('days') days?: number) {
    return this.reportsService.getAlertSummaryReport(days ? Number(days) : 30);
  }

  @Get('critical-products')
  @ApiOperation({ summary: 'Análisis de productos críticos' })
  getCriticalProductsTrendReport(@Query('days') days?: number) {
    return this.reportsService.getCriticalProductsTrendReport(days ? Number(days) : 30);
  }

  @Get('valuation')
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Valorización del inventario' })
  getInventoryValuationReport() {
    return this.reportsService.getInventoryValuationReport();
  }
}
