import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { UserRole } from '@repo/shared-types';

import { Roles } from '../../common/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/products.dto';
import { ProductsService } from './products.service';

@ApiTags('Products')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
  @ApiOperation({ summary: 'Lista paginada de productos con filtros' })
  findAll(@Query() filters: ProductFilterDto) {
    return this.productsService.findMany(filters);
  }

  @Get('critical')
  @ApiOperation({ summary: 'Productos críticos (stock 0 o criticidad CRITICO/ALTO)' })
  findCritical() {
    return this.productsService.findCritical();
  }

  @Get('risk')
  @ApiOperation({ summary: 'Productos en riesgo de desabastecimiento' })
  findAtRisk() {
    return this.productsService.findAtRisk();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Detalle de producto' })
  findOne(@Param('id') id: string) {
    return this.productsService.findById(id);
  }

  @Post()
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Crear producto' })
  create(@Body() dto: CreateProductDto) {
    return this.productsService.create(dto);
  }

  @Put(':id')
  @Roles(UserRole.ADMINISTRADOR, UserRole.SUPERVISOR)
  @ApiOperation({ summary: 'Actualizar producto' })
  update(@Param('id') id: string, @Body() dto: UpdateProductDto) {
    return this.productsService.update(id, dto);
  }

  @Delete(':id')
  @Roles(UserRole.ADMINISTRADOR)
  @ApiOperation({ summary: 'Desactivar producto (soft delete)' })
  remove(@Param('id') id: string) {
    return this.productsService.remove(id);
  }
}
