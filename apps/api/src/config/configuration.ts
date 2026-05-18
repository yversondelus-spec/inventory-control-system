export const configuration = () => ({
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3001', 10),

  database: {
    url: process.env.DATABASE_URL,
    directUrl: process.env.DIRECT_URL,
  },

  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN || '15m',
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },

  analytics: {
    serviceUrl: process.env.ANALYTICS_SERVICE_URL || 'http://localhost:8001',
  },

  upload: {
    maxSizeMb: parseInt(process.env.UPLOAD_MAX_SIZE_MB || '50', 10),
    dest: process.env.UPLOAD_DEST || './uploads',
  },

  cors: {
    allowedOrigins: (process.env.ALLOWED_ORIGINS || 'http://localhost:3000').split(','),
  },

  // Business rules (configurable)
  business: {
    defaultLeadTimeDias: 21,
    inventarioFisicoFrecuenciaDias: 15, // 2 veces por mes
    stockSeguridadFactor: 1.0,
  },
});
