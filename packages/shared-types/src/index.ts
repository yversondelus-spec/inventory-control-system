// ─────────────────────────────────────────
// ENUMS como const objects (compatible con Node 24)
// ─────────────────────────────────────────

export const UserRole = {
  ADMINISTRADOR: 'ADMINISTRADOR',
  SUPERVISOR: 'SUPERVISOR',
  OPERADOR: 'OPERADOR',
} as const;
export type UserRole = typeof UserRole[keyof typeof UserRole];

export const Criticidad = {
  CRITICO: 'CRITICO',
  ALTO: 'ALTO',
  MEDIO: 'MEDIO',
  BAJO: 'BAJO',
} as const;
export type Criticidad = typeof Criticidad[keyof typeof Criticidad];

export const TipoMovimiento = {
  ENTRADA: 'ENTRADA',
  SALIDA: 'SALIDA',
  AJUSTE_POSITIVO: 'AJUSTE_POSITIVO',
  AJUSTE_NEGATIVO: 'AJUSTE_NEGATIVO',
  TRANSFERENCIA: 'TRANSFERENCIA',
  DEVOLUCION: 'DEVOLUCION',
  MERMA: 'MERMA',
} as const;
export type TipoMovimiento = typeof TipoMovimiento[keyof typeof TipoMovimiento];

export const TipoAlerta = {
  STOCK_BAJO: 'STOCK_BAJO',
  QUIEBRE_STOCK: 'QUIEBRE_STOCK',
  DIFERENCIA_SAP: 'DIFERENCIA_SAP',
  PRODUCTO_CRITICO: 'PRODUCTO_CRITICO',
  ANOMALIA_CONSUMO: 'ANOMALIA_CONSUMO',
  SOBRECONSUMO: 'SOBRECONSUMO',
  REPOSICION_URGENTE: 'REPOSICION_URGENTE',
  LEAD_TIME_VENCIDO: 'LEAD_TIME_VENCIDO',
  INVENTARIO_PENDIENTE: 'INVENTARIO_PENDIENTE',
} as const;
export type TipoAlerta = typeof TipoAlerta[keyof typeof TipoAlerta];

export const PrioridadAlerta = {
  CRITICA: 'CRITICA',
  ALTA: 'ALTA',
  MEDIA: 'MEDIA',
  BAJA: 'BAJA',
} as const;
export type PrioridadAlerta = typeof PrioridadAlerta[keyof typeof PrioridadAlerta];

export const EstadoAlerta = {
  ACTIVA: 'ACTIVA',
  RECONOCIDA: 'RECONOCIDA',
  RESUELTA: 'RESUELTA',
  DESCARTADA: 'DESCARTADA',
} as const;
export type EstadoAlerta = typeof EstadoAlerta[keyof typeof EstadoAlerta];

export const EstadoUpload = {
  PENDIENTE: 'PENDIENTE',
  PROCESANDO: 'PROCESANDO',
  COMPLETADO: 'COMPLETADO',
  ERROR: 'ERROR',
  PARCIAL: 'PARCIAL',
} as const;
export type EstadoUpload = typeof EstadoUpload[keyof typeof EstadoUpload];

// ─────────────────────────────────────────
// PRODUCTO TYPES
// ─────────────────────────────────────────

export interface Producto {
  id: string;
  codigoProducto: string;
  codigoSap?: string;
  descripcion: string;
  unidadMedida: string;
  categoriaId: string;
  proveedorId?: string;
  stockActual: number;
  stockMinimo: number;
  stockMaximo?: number;
  stockSeguridad: number;
  puntoPedido: number;
  leadTimeDias: number;
  criticidad: Criticidad;
  precioUnitario?: number;
  demandaPromedio?: number;
  diasCobertura?: number;
  ultimoMovimiento?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
  categoria?: Categoria;
  proveedor?: Proveedor;
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  color?: string;
  activo: boolean;
}

export interface Proveedor {
  id: string;
  codigo: string;
  nombre: string;
  contacto?: string;
  email?: string;
  telefono?: string;
  leadTimeDias: number;
  confiabilidad?: number;
  activo: boolean;
}

// ─────────────────────────────────────────
// MOVIMIENTO TYPES
// ─────────────────────────────────────────

export interface Movimiento {
  id: string;
  productoId: string;
  bodegaId?: string;
  tipo: TipoMovimiento;
  cantidad: number;
  cantidadAntes: number;
  cantidadDespues: number;
  fecha: string;
  referencia?: string;
  origen?: string;
  uploadId?: string;
  usuarioId?: string;
  observacion?: string;
  createdAt: string;
}

// ─────────────────────────────────────────
// ALERTA TYPES
// ─────────────────────────────────────────

export interface Alerta {
  id: string;
  productoId: string;
  tipo: TipoAlerta;
  prioridad: PrioridadAlerta;
  estado: EstadoAlerta;
  mensaje: string;
  detalles?: Record<string, unknown>;
  valorActual?: number;
  valorUmbral?: number;
  acknowledgedBy?: string;
  acknowledgedAt?: string;
  resolvedAt?: string;
  createdAt: string;
  updatedAt: string;
  producto?: Pick<Producto, 'id' | 'codigoProducto' | 'descripcion'>;
}

// ─────────────────────────────────────────
// UPLOAD TYPES
// ─────────────────────────────────────────

export interface Upload {
  id: string;
  usuarioId: string;
  nombreArchivo: string;
  tipoArchivo: string;
  tamanoBytes: number;
  estado: EstadoUpload;
  totalRegistros?: number;
  registrosProcesados?: number;
  registrosError?: number;
  errores?: UploadError[];
  metadata?: UploadMetadata;
  procesadoAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UploadError {
  row: number;
  message: string;
  data?: unknown;
}

export interface UploadMetadata {
  columnasDetectadas: string[];
  columnasMapedas: Record<string, string>;
  resumen: {
    productos: number;
    movimientos: number;
    diferencias: number;
  };
}

// ─────────────────────────────────────────
// DASHBOARD TYPES
// ─────────────────────────────────────────

export interface DashboardSummary {
  totalProductos: number;
  productosActivos: number;
  productosCriticos: number;
  productosConAlerta: number;
  stockBajo: number;
  quiebreStock: number;
  capitalInmovilizado: number;
  fillRate: number;
  precisionInventario: number;
  leadTimePromedio: number;
  coberturaPromedio: number;
  alertasActivas: number;
  alertasCriticas: number;
  ultimaActualizacion: string;
}

// ─────────────────────────────────────────
// API RESPONSE TYPES
// ─────────────────────────────────────────

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  timestamp: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
    statusCode: number;
  };
  timestamp: string;
}

// ─────────────────────────────────────────
// FILTER TYPES
// ─────────────────────────────────────────

export interface ProductoFilters {
  search?: string;
  categoriaId?: string;
  criticidad?: Criticidad;
  stockBajo?: boolean;
  conAlerta?: boolean;
  activo?: boolean;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AlertaFilters {
  tipo?: TipoAlerta;
  prioridad?: PrioridadAlerta;
  estado?: EstadoAlerta;
  productoId?: string;
  page?: number;
  limit?: number;
}