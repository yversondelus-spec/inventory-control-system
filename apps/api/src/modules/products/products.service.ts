import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';

import type { CreateProductDto, ProductFilterDto, UpdateProductDto } from './dto/products.dto';
import { ProductsRepository } from './products.repository';

@Injectable()
export class ProductsService {
  constructor(private readonly repo: ProductsRepository) {}

  async findMany(filters: ProductFilterDto) {
    return this.repo.findMany(filters);
  }

  async findById(id: string) {
    const product = await this.repo.findById(id);
    if (!product) throw new NotFoundException(`Producto ${id} no encontrado`);
    return product;
  }

  async findCritical() {
    return this.repo.findCritical();
  }

  async findAtRisk() {
    return this.repo.findAtRisk();
  }

  async create(dto: CreateProductDto) {
    // Check unique codigo
    const existing = await this.repo.findMany({
      search: dto.codigoProducto,
      limit: 1,
    });
    if (existing.data.some((p) => p.codigoProducto === dto.codigoProducto)) {
      throw new ConflictException(`Código de producto '${dto.codigoProducto}' ya existe`);
    }

    return this.repo.create(dto);
  }

  async update(id: string, dto: UpdateProductDto) {
    await this.findById(id); // throws if not found
    return this.repo.update(id, dto);
  }

  async remove(id: string) {
    await this.findById(id);
    return this.repo.softDelete(id);
  }

  async getMovements(id: string, days: number = 90) {
    await this.findById(id);
    const since = new Date();
    since.setDate(since.getDate() - days);
    // Delegated to movements module via repository direct query
    return { productId: id, since, days };
  }
}
