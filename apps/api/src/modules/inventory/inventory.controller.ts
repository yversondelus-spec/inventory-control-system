import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@repo/shared-types';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { InventoryService } from './inventory.service';

@ApiTags('Inventory')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(private readonly inventoryService: InventoryService) {}

  @Get('summary')
  @ApiOperation({ summary: 'KPIs y resumen ejecutivo del inventario' })
  getSummary() {
    return this.inventoryService.getSummary();
  }

  @Get('critical')
  @ApiOperation({ summary: 'Productos críticos para tarjetas destacadas del Dashboard' })
  getCriticalProducts(@Query('limit') limit?: number) {
    return this.inventoryService.getCriticalProducts(limit ? Number(limit) : undefined);
  }

  @Get('differences')
  @ApiOperation({ summary: 'Diferencias detectadas entre stock físico y SAP' })
  getDifferences(@Query('limit') limit?: number) {
    return this.inventoryService.getDifferences(limit);
  }

  @Post('recalculate')
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Forzar recálculo de métricas de inventario' })
  recalculate() {
    return this.inventoryService.recalculateAllMetrics();
  }
}