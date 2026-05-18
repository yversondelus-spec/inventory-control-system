import { Controller, Get, Param, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { EstadoAlerta, PrioridadAlerta, TipoAlerta } from '@repo/shared-types';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AlertsService } from './alerts.service';

@ApiTags('Alerts')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class AlertsController {
  constructor(private readonly alertsService: AlertsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar alertas con filtros' })
  findAll(@Query() filters: Record<string, string>) {
    return this.alertsService.findMany({
      estado: filters['estado'] as EstadoAlerta | undefined,
      prioridad: filters['prioridad'] as PrioridadAlerta | undefined,
      tipo: filters['tipo'] as TipoAlerta | undefined,
      productoId: filters['productoId'],
      page: filters['page'] ? parseInt(filters['page']) : 1,
      limit: filters['limit'] ? parseInt(filters['limit']) : 20,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de alertas activas por prioridad y tipo' })
  getSummary() {
    return this.alertsService.getSummary();
  }

  @Put(':id/acknowledge')
  @ApiOperation({ summary: 'Reconocer una alerta' })
  acknowledge(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.alertsService.acknowledge(id, req.user.id);
  }

  @Put(':id/resolve')
  @ApiOperation({ summary: 'Resolver una alerta' })
  resolve(@Param('id') id: string) {
    return this.alertsService.resolve(id);
  }

  @Put(':id/dismiss')
  @ApiOperation({ summary: 'Descartar una alerta' })
  dismiss(@Param('id') id: string) {
    return this.alertsService.dismiss(id);
  }
}