import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { UserRole } from '@repo/shared-types';
import bcrypt from 'bcryptjs';

import { PrismaService } from '../../prisma/prisma.service';

export interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async validateUser(email: string, password: string) {
    const user = await this.prisma.usuario.findUnique({ where: { email } });
    if (!user || !user.activo) throw new UnauthorizedException('Credenciales inválidas');

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) throw new UnauthorizedException('Credenciales inválidas');

    return user;
  }

  async login(userId: string): Promise<AuthTokens & { user: object }> {
    const user = await this.prisma.usuario.findUniqueOrThrow({ where: { id: userId } });

    await this.prisma.usuario.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });

    const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role as UserRole };

    const accessToken = this.jwt.sign(payload);
    const refreshToken = this.jwt.sign(payload, {
      secret: this.config.get<string>('jwt.refreshSecret'),
      expiresIn: this.config.get<string>('jwt.refreshExpiresIn', '7d'),
    });

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        nombre: user.nombre,
        apellido: user.apellido,
        role: user.role,
      },
    };
  }

  async refresh(refreshToken: string): Promise<AuthTokens> {
    try {
      const payload = this.jwt.verify<JwtPayload>(refreshToken, {
        secret: this.config.get<string>('jwt.refreshSecret'),
      });

      const user = await this.prisma.usuario.findUniqueOrThrow({ where: { id: payload.sub } });
      if (!user.activo) throw new UnauthorizedException();

      const newPayload: JwtPayload = { sub: user.id, email: user.email, role: user.role as UserRole };
      return {
        accessToken: this.jwt.sign(newPayload),
        refreshToken: this.jwt.sign(newPayload, {
          secret: this.config.get<string>('jwt.refreshSecret'),
          expiresIn: '7d',
        }),
      };
    } catch {
      throw new UnauthorizedException('Refresh token inválido o expirado');
    }
  }

  async getProfile(userId: string) {
    return this.prisma.usuario.findUnique({
      where: { id: userId },
      select: {
        id: true, email: true, nombre: true,
        apellido: true, role: true, lastLoginAt: true, createdAt: true,
      },
    });
  }

  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 12);
  }
}
