import { Injectable } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as XLSX from 'xlsx';

const SAP_COLUMN_MAP: Record<string, string> = {
  'ID de producto': 'codigoSap',
  'Descripción de producto': 'descripcion',
  'Stock en almacén': 'stockLibre',
  'Material': 'codigoSap',
  'Nº material': 'codigoSap',
  'Material Number': 'codigoSap',
  'Cod. Material': 'codigoSap',
  'Texto breve de material': 'descripcion',
  'Denominación de material': 'descripcion',
  'Material Description': 'descripcion',
  'Descripción': 'descripcion',
  'Descripcion': 'descripcion',
  'Libre utilización': 'stockLibre',
  'Stock libre utilización': 'stockLibre',
  'Unrestricted Stock': 'stockLibre',
  'Stock valorado': 'stockTotal',
  'En pedido de compras': 'stockPedido',
  'Cantidad': 'cantidad',
  'Quantity': 'cantidad',
  'Ctd.en UM base': 'cantidad',
  'Fecha de contabilización': 'fechaMovimiento',
  'Posting Date': 'fechaMovimiento',
  'Fecha': 'fechaMovimiento',
  'Fecha Doc.': 'fechaMovimiento',
  'Clase de movimiento': 'claseMovimiento',
  'Movement Type': 'claseMovimiento',
  'Mv.': 'claseMovimiento',
  'UMB': 'unidadMedida',
  'Unidad medida base': 'unidadMedida',
  'Base Unit': 'unidadMedida',
  'UM': 'unidadMedida',
  'Centro': 'centro',
  'Plant': 'centro',
  'Almacén': 'almacen',
  'Storage Location': 'almacen',
  'Alm.': 'almacen',
};

const SAP_MOVEMENT_MAP: Record<string, string> = {
  '101': 'ENTRADA', '102': 'ENTRADA', '161': 'DEVOLUCION',
  '201': 'SALIDA', '261': 'SALIDA',
  '301': 'TRANSFERENCIA', '302': 'TRANSFERENCIA',
  '551': 'MERMA', '552': 'MERMA',
  '701': 'AJUSTE_POSITIVO', '702': 'AJUSTE_NEGATIVO',
  '711': 'AJUSTE_POSITIVO', '712': 'AJUSTE_NEGATIVO',
};

export interface ParsedRow {
  codigoSap: string;
  descripcion?: string;
  stockLibre?: number;
  stockTotal?: number;
  cantidad?: number;
  claseMovimiento?: string;
  tipoMovimiento?: string;
  fechaMovimiento?: Date;
  unidadMedida?: string;
  centro?: string;
  almacen?: string;
}

export interface ParseError {
  row: number;
  message: string;
  data?: unknown;
}

export interface ParseResult {
  data: ParsedRow[];
  total: number;
  processed: number;
  errors: ParseError[];
  columnMapping: Record<string, string>;
  summary: {
    conStock: number;
    conMovimiento: number;
    sinCodigoSap: number;
  };
}

@Injectable()
export class SapParserService {
  async parse(filePath: string): Promise<ParseResult> {
    const ext = path.extname(filePath).toLowerCase();

    if (!['.xlsx', '.xls', '.csv'].includes(ext)) {
      throw new Error(`Formato no soportado: ${ext}. Use .xlsx, .xls o .csv`);
    }

    if (!fs.existsSync(filePath)) {
      throw new Error(`Archivo no encontrado: ${filePath}`);
    }

    const rawData = ext === '.csv' ? this.readCsv(filePath) : this.readExcel(filePath);

    if (rawData.length < 2) {
      throw new Error('El archivo está vacío o solo contiene encabezados');
    }

    // Detectar fila de headers automáticamente (busca en las primeras 10 filas)
    let headerRowIndex = 0;
    for (let i = 0; i < Math.min(rawData.length, 10); i++) {
      const row = rawData[i] as unknown[];
      const rowStr = row.map((c) => String(c ?? '').trim());
      const mapping = this.detectColumns(rowStr);
      if (Object.keys(mapping).length > 0) {
        headerRowIndex = i;
        break;
      }
    }

    const headers = (rawData[headerRowIndex] as unknown[]).map((h) => String(h ?? '').trim());
    const columnMapping = this.detectColumns(headers);
    this.validateRequiredColumns(columnMapping);

    const results: ParsedRow[] = [];
    const errors: ParseError[] = [];

    for (let i = headerRowIndex + 1; i < rawData.length; i++) {
      const rawRow = rawData[i] as unknown[];
      try {
        const row = this.parseRow(rawRow, headers, columnMapping);
        if (row && row.codigoSap) {
          results.push(row);
        } else if (row && !row.codigoSap) {
          errors.push({ row: i + 1, message: 'Fila sin código SAP', data: rawRow });
        }
      } catch (e) {
        errors.push({ row: i + 1, message: (e as Error).message, data: rawRow });
      }
    }

    const deduplicated = this.deduplicateRows(results);

    return {
      data: deduplicated,
      total: rawData.length - headerRowIndex - 1,
      processed: deduplicated.length,
      errors,
      columnMapping,
      summary: {
        conStock: deduplicated.filter((r) => (r.stockLibre ?? 0) > 0).length,
        conMovimiento: deduplicated.filter((r) => r.cantidad !== undefined).length,
        sinCodigoSap: errors.filter((e) => e.message.includes('código SAP')).length,
      },
    };
  }

  private readExcel(filePath: string): unknown[][] {
    const workbook = XLSX.readFile(filePath, { cellDates: true });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) throw new Error('No se encontraron hojas en el archivo Excel');
    const sheet = workbook.Sheets[sheetName];
    if (!sheet) throw new Error('Hoja vacía en el archivo Excel');
    return XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null });
  }

  private readCsv(filePath: string): unknown[][] {
    const content = fs.readFileSync(filePath, 'utf-8');
    const separator = content.includes(';') ? ';' : ',';
    return content
      .split('\n')
      .filter((line) => line.trim())
      .map((line) => line.split(separator).map((cell) => cell.trim().replace(/^"|"$/g, '')));
  }

  private detectColumns(headers: string[]): Record<string, string> {
    const mapping: Record<string, string> = {};
    for (let i = 0; i < headers.length; i++) {
      const header = headers[i]?.trim() ?? '';
      const mapped = SAP_COLUMN_MAP[header];
      if (mapped) mapping[i.toString()] = mapped;
    }
    return mapping;
  }

  private validateRequiredColumns(mapping: Record<string, string>): void {
    const found = Object.values(mapping);
    if (!found.includes('codigoSap')) {
      throw new Error(
        'Columna de código SAP no encontrada. Se esperaba: Material, ID de producto, Nº material, Material Number',
      );
    }
  }

  private parseRow(rawRow: unknown[], _headers: string[], columnMapping: Record<string, string>): ParsedRow | null {
    if (!rawRow || rawRow.every((cell) => cell === null || cell === '')) return null;

    const row: Partial<ParsedRow> = {};

    for (const [indexStr, fieldName] of Object.entries(columnMapping)) {
      const index = parseInt(indexStr);
      const rawValue = rawRow[index];
      if (rawValue === null || rawValue === undefined || rawValue === '') continue;

      switch (fieldName) {
        case 'codigoSap':
          row.codigoSap = String(rawValue).trim();
          break;
        case 'descripcion':
          row.descripcion = String(rawValue).trim();
          break;
        case 'stockLibre':
        case 'stockTotal':
        case 'cantidad':
          row[fieldName] = this.parseNumber(rawValue);
          break;
        case 'fechaMovimiento':
          row.fechaMovimiento = this.parseDate(rawValue);
          break;
        case 'claseMovimiento': {
          const clase = String(rawValue).trim();
          row.claseMovimiento = clase;
          row.tipoMovimiento = SAP_MOVEMENT_MAP[clase] ?? 'ENTRADA';
          break;
        }
        case 'unidadMedida':
          row.unidadMedida = String(rawValue).trim().toUpperCase();
          break;
        case 'centro':
          row.centro = String(rawValue).trim();
          break;
        case 'almacen':
          row.almacen = String(rawValue).trim();
          break;
      }
    }

    if (!row.codigoSap) return null;
    return row as ParsedRow;
  }

  private deduplicateRows(rows: ParsedRow[]): ParsedRow[] {
    const stockMap = new Map<string, ParsedRow>();
    const movements: ParsedRow[] = [];
    for (const row of rows) {
      if (row.claseMovimiento) movements.push(row);
      else stockMap.set(row.codigoSap, row);
    }
    return [...stockMap.values(), ...movements];
  }

  private parseNumber(value: unknown): number {
    if (typeof value === 'number') return value;
    const str = String(value).replace(/\./g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const num = parseFloat(str);
    return isNaN(num) ? 0 : num;
  }

  private parseDate(value: unknown): Date | undefined {
    if (value instanceof Date) return value;
    if (typeof value === 'string') {
      const match = /^(\d{2})\.(\d{2})\.(\d{4})$/.exec(value);
      if (match) return new Date(`${match[3]}-${match[2]}-${match[1]}`);
      const date = new Date(value);
      return isNaN(date.getTime()) ? undefined : date;
    }
    return undefined;
  }
}