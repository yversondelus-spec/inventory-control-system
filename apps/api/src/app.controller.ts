import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

import { PrismaService } from './prisma/prisma.service';

@ApiTags('Health')
@Controller()
export class AppController {
  constructor(private readonly prisma: PrismaService) {}

  @Get('health')
  @ApiOperation({ summary: 'Liveness check' })
  health() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'inventory-control-api',
    };
  }

  @Get('health/ready')
  @ApiOperation({ summary: 'Readiness check' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ready', timestamp: new Date().toISOString() };
    } catch {
      return { status: 'not_ready', timestamp: new Date().toISOString() };
    }
  }
}