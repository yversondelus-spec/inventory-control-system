import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import bcrypt from 'bcryptjs';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll() {
    return this.prisma.usuario.findMany({
      select: {
        id: true, email: true, nombre: true,
        apellido: true, role: true, activo: true,
        lastLoginAt: true, createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(data: { email: string; nombre: string; apellido: string; role: string; password: string }) {
    const passwordHash = await bcrypt.hash(data.password, 12);
    return this.prisma.usuario.create({
      data: {
        email: data.email,
        nombre: data.nombre,
        apellido: data.apellido,
        role: data.role as any,
        passwordHash,
        activo: true,
      },
      select: { id: true, email: true, nombre: true, apellido: true, role: true, activo: true },
    });
  }

  async updateRole(id: string, role: string) {
    return this.prisma.usuario.update({
      where: { id },
      data: { role: role as any },
      select: { id: true, email: true, role: true, activo: true },
    });
  }

  async toggleActive(id: string, activo: boolean) {
    return this.prisma.usuario.update({
      where: { id },
      data: { activo },
      select: { id: true, email: true, activo: true },
    });
  }
}