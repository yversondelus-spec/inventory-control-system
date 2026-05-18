import { Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';

import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuditMiddleware implements NestMiddleware {
  constructor(private readonly prisma: PrismaService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const writeMethods = ['POST', 'PUT', 'PATCH', 'DELETE'];

    if (writeMethods.includes(req.method)) {
      res.on('finish', async () => {
        if (res.statusCode < 400) {
          try {
            const user = (req as Request & { user?: { id: string } }).user;
            await this.prisma.auditoria.create({
              data: {
                usuarioId: user?.id ?? null,
                accion: req.method,
                entidad: this.extractEntity(req.path),
                entidadId: this.extractEntityId(req.path),
                ip: req.ip ?? null,
                userAgent: req.headers['user-agent'] ?? null,
              },
            });
          } catch {
            // Audit failure should never break the request
          }
        }
      });
    }

    next();
  }

  private extractEntity(path: string): string {
    const parts = path.replace('/api/v1/', '').split('/');
    return parts[0] ?? 'unknown';
  }

  private extractEntityId(path: string): string | null {
    const parts = path.replace('/api/v1/', '').split('/');
    return parts[1] ?? null;
  }
}
