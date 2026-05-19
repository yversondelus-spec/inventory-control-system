import { Body, Controller, Get, Param, Post, Put, Query, Request, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { SolicitudesService } from './solicitudes.service';

@ApiTags('Solicitudes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  @Get()
  findAll(@Query() query: Record<string, string>) {
    return this.solicitudesService.findMany({
      estado: query['estado'],
      limit: query['limit'] ? parseInt(query['limit']) : 500,
    });
  }

  @Get('summary')
  getSummary() {
    return this.solicitudesService.getSummary();
  }

  @Post()
  create(@Body() body: any, @Request() req: any) {
    return this.solicitudesService.create({
      ...body,
      creadoPor: req.user?.sub ?? req.user?.id,
    });
  }

  @Post('grupo')
  createGrupo(@Body() body: { items: any[] }, @Request() req: any) {
    const userId = req.user?.sub ?? req.user?.id;
    return this.solicitudesService.createGrupo(
      body.items.map(item => ({ ...item, creadoPor: userId }))
    );
  }

  @Post('generar-desde-alertas')
  generarDesdeAlertas() {
    return this.solicitudesService.createFromAlertas();
  }

  @Put(':id/estado')
  updateEstado(@Param('id') id: string, @Body() body: { estado: string; motivoRechazo?: string }) {
    return this.solicitudesService.updateEstado(id, body.estado as any, body.motivoRechazo);
  }

  @Put('grupo/:grupoId/estado')
  updateEstadoGrupo(@Param('grupoId') grupoId: string, @Body() body: { estado: string; motivoRechazo?: string }) {
    return this.solicitudesService.updateEstadoGrupo(grupoId, body.estado as any, body.motivoRechazo);
  }
}