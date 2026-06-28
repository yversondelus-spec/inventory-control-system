import { SolicitudesModule } from './modules/solicitudes/solicitudes.module';
import { UsersModule } from './modules/users/users.module';
import { BullModule } from '@nestjs/bullmq';
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import * as Joi from 'joi';

import { AppController } from './app.controller';
import { AuditMiddleware } from './common/middleware/audit.middleware';
import { configuration } from './config/configuration';
import { AlertsModule } from './modules/alerts/alerts.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { AuditModule } from './modules/audit/audit.module';
import { AuthModule } from './modules/auth/auth.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { MovementsModule } from './modules/movements/movements.module';
import { ProductsModule } from './modules/products/products.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { UploadsModule } from './modules/uploads/uploads.module';
import { WarehousesModule } from './modules/warehouses/warehouses.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validationSchema: Joi.object({
        NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
        PORT: Joi.number().default(3001),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().min(32).required(),
        JWT_REFRESH_SECRET: Joi.string().min(32).required(),
        REDIS_URL: Joi.string().default('redis://localhost:6379'),
      }),
    }),
    ThrottlerModule.forRoot([
      { name: 'short', ttl: 1000, limit: 10 },
      { name: 'medium', ttl: 10000, limit: 50 },
      { name: 'long', ttl: 60000, limit: 200 },
    ]),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: {
          url: config.get<string>('REDIS_URL'),
        },
      }),
    }),
    PrismaModule,
    QueueModule,
    AuthModule,
    ProductsModule,
    InventoryModule,
    MovementsModule,
    UploadsModule,
    AlertsModule,
    SuppliersModule,
    WarehousesModule,
    ReportsModule,
    AuditModule,
    AnalyticsModule,
    SolicitudesModule,
    UsersModule,
  ],
  controllers: [AppController],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(AuditMiddleware).forRoutes('*');
  }
}