import { Controller, Get, Query } from '@nestjs/common';
import { MovementsService } from './movements.service';

@Controller('movements')
export class MovementsController {
  constructor(private readonly movementsService: MovementsService) {}

  @Get()
  getMovements(@Query('limit') limit?: string, @Query('tipo') tipo?: string) {
    return this.movementsService.getMovements(limit ? parseInt(limit) : 100, tipo);
  }

  @Get('summary')
  getSummary() {
    return this.movementsService.getSummary();
  }
}