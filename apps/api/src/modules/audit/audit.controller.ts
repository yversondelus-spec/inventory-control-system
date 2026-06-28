import { Controller, Get, Query, UseGuards, Header } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@repo/shared-types';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuditService } from './audit.service';

@ApiTags('Audit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR)
@Controller('audit')
export class AuditController {
  constructor(private readonly auditService: AuditService) {}

  @Get('logs')
  @ApiOperation({ summary: 'Obtener registros de auditoría' })
  getAuditLogs(
    @Query('usuarioId') usuarioId?: string,
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    return this.auditService.getAuditLogs({
      usuarioId,
      accion,
      entidad,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
      limit: limit ? Number(limit) : undefined,
      offset: offset ? Number(offset) : undefined,
    });
  }

  @Get('summary')
  @ApiOperation({ summary: 'Resumen de auditoría' })
  getAuditSummary(@Query('days') days?: string) {
    return this.auditService.getAuditSummary(days ? Number(days) : 30);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv')
  @Header('Content-Disposition', 'attachment; filename="auditoria.csv"')
  @ApiOperation({ summary: 'Exportar auditoría a CSV' })
  async exportAuditLogs(
    @Query('usuarioId') usuarioId?: string,
    @Query('accion') accion?: string,
    @Query('entidad') entidad?: string,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.auditService.exportAuditLogs({
      usuarioId,
      accion,
      entidad,
      desde: desde ? new Date(desde) : undefined,
      hasta: hasta ? new Date(hasta) : undefined,
    });
  }
}
