import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';
import { Criticidad } from '@repo/shared-types';
import {
  IsBoolean,
  IsEnum,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Min,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @ApiProperty({ example: 'PROD-001' })
  @IsString()
  @MinLength(2)
  codigoProducto: string;

  @ApiPropertyOptional({ example: '000000001001' })
  @IsOptional()
  @IsString()
  codigoSap?: string;

  @ApiProperty({ example: 'Aceite hidráulico ISO 46' })
  @IsString()
  @MinLength(3)
  descripcion: string;

  @ApiPropertyOptional({ example: 'L' })
  @IsOptional()
  @IsString()
  unidadMedida?: string;

  @ApiProperty()
  @IsString()
  categoriaId: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  proveedorId?: string;

  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockActual?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMinimo?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  stockMaximo?: number;

  @ApiPropertyOptional({ example: 21 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  leadTimeDias?: number;

  @ApiPropertyOptional({ enum: Criticidad })
  @IsOptional()
  @IsEnum(Criticidad)
  criticidad?: Criticidad;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  precioUnitario?: number;
}

export class UpdateProductDto extends PartialType(CreateProductDto) {}

export class ProductFilterDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoriaId?: string;

  @ApiPropertyOptional({ enum: Criticidad })
  @IsOptional()
  @IsEnum(Criticidad)
  criticidad?: Criticidad;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  stockBajo?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  conAlerta?: boolean;

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  page?: number = 1;

  @ApiPropertyOptional({ default: 20 })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  limit?: number = 20;

  @ApiPropertyOptional({ default: 'codigoProducto' })
  @IsOptional()
  @IsString()
  sortBy?: string = 'codigoProducto';

  @ApiPropertyOptional({ enum: ['asc', 'desc'], default: 'desc' })
  @IsOptional()
  @IsEnum(['asc', 'desc'])
  sortOrder?: 'asc' | 'desc' = 'desc';
}
