'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
} from 'recharts';
import {
  TrendingUp, TrendingDown, AlertCircle, CheckCircle, Clock,
  FileText, type LucideIcon,
} from 'lucide-react';

interface KPIData {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  accent: string;
  trend?: number;
}

function KPICard({ data }: { data: KPIData }) {
  const Icon = data.icon;
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium text-slate-500">{data.title}</p>
        <Icon size={16} style={{ color: data.accent }} strokeWidth={2} />
      </div>
      <div className="flex items-end gap-2">
        <p className="text-[26px] font-semibold text-slate-900 tracking-tight leading-none">{data.value}</p>
        {data.trend !== undefined && (
          <span className={`text-[12px] font-medium ${data.trend >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
            {data.trend >= 0 ? '+' : ''}{data.trend}%
          </span>
        )}
      </div>
      {data.subtitle && <p className="text-[12px] text-slate-400 mt-2">{data.subtitle}</p>}
    </div>
  );
}

export default function ReportsPage() {
  const [dailyReport, setDailyReport] = useState<any>(null);
  const [movementReport, setMovementReport] = useState<any>(null);
  const [alertReport, setAlertReport] = useState<any>(null);
  const [criticalReport, setCriticalReport] = useState<any>(null);
  const [valuationReport, setValuationReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'daily' | 'movements' | 'alerts' | 'critical' | 'valuation'>('daily');

  useEffect(() => {
    Promise.all([
      api.reports?.dailyInventory?.().catch(() => null),
      api.reports?.movements?.().catch(() => null),
      api.reports?.alerts?.().catch(() => null),
      api.reports?.criticalProducts?.().catch(() => null),
      api.reports?.valuation?.().catch(() => null),
    ])
      .then(([daily, movements, alerts, critical, valuation]) => {
        setDailyReport(daily?.data?.data ?? daily?.data);
        setMovementReport(movements?.data?.data ?? movements?.data);
        setAlertReport(alerts?.data?.data ?? alerts?.data);
        setCriticalReport(critical?.data?.data ?? critical?.data);
        setValuationReport(valuation?.data?.data ?? valuation?.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-5 gap-4">
          {[...Array(5)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const tabs = [
    { id: 'daily' as const, label: 'Inventario Diario', icon: FileText },
    { id: 'movements' as const, label: 'Movimientos', icon: TrendingUp },
    { id: 'alerts' as const, label: 'Alertas', icon: AlertCircle },
    { id: 'critical' as const, label: 'Productos Críticos', icon: TrendingDown },
    { id: 'valuation' as const, label: 'Valorización', icon: CheckCircle },
  ];

  return (
    <div className="p-8 space-y-7 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Análisis</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Reportes y análisis de inventario</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            {new Date().toLocaleDateString('es-CL', { month: 'numeric', day: 'numeric', year: 'numeric' })}
          </span>
          <button className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
            Exportar PDF
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-slate-950 text-white'
                : 'bg-white text-slate-900 border border-slate-200 hover:bg-slate-100'
            }`}
          >
            <tab.icon size={14} className="inline mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Daily Inventory Tab */}
      {activeTab === 'daily' && dailyReport && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-5">
            <KPICard data={{
              title: 'Total Productos',
              value: dailyReport.totales?.productosTotales ?? 0,
              icon: FileText,
              accent: '#185FA5',
            }} />
            <KPICard data={{
              title: 'Productos Críticos',
              value: dailyReport.totales?.productosCriticos ?? 0,
              subtitle: 'Requieren acción',
              icon: AlertCircle,
              accent: '#EF4444',
            }} />
            <KPICard data={{
              title: 'Activos',
              value: dailyReport.totales?.productosActivos ?? 0,
              icon: CheckCircle,
              accent: '#10B981',
            }} />
            <KPICard data={{
              title: 'Inactivos',
              value: dailyReport.totales?.productosInactivos ?? 0,
              icon: Clock,
              accent: '#6B7280',
            }} />
            <KPICard data={{
              title: 'Capital Inmovilizado',
              value: `$${(dailyReport.summary?.capitalInmovilizado || 0).toLocaleString('es-CL')}`,
              icon: TrendingDown,
              accent: '#7C3AED',
            }} />
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Distribución de Stock por Estado</h3>
            <div className="h-64 flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: 'Quiebre', value: dailyReport.summary?.quiebreStock ?? 0, fill: '#E24B4A' },
                      { name: 'Crítico', value: dailyReport.summary?.stockCritico ?? 0, fill: '#EF9F27' },
                      { name: 'Bajo', value: dailyReport.summary?.stockBajo ?? 0, fill: '#FAC775' },
                      { name: 'Normal', value: dailyReport.summary?.stockNormal ?? 0, fill: '#639922' },
                    ]}
                    dataKey="value"
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, value }) => `${name}: ${value}`}
                    outerRadius={80}
                  />
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Movements Tab */}
      {activeTab === 'movements' && movementReport && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard data={{
              title: 'Total Movimientos',
              value: movementReport.totalMovimientos ?? 0,
              icon: TrendingUp,
              accent: '#185FA5',
            }} />
            <KPICard data={{
              title: 'Entradas',
              value: movementReport.byType?.ENTRADA ?? 0,
              icon: CheckCircle,
              accent: '#10B981',
            }} />
            <KPICard data={{
              title: 'Salidas',
              value: movementReport.byType?.SALIDA ?? 0,
              icon: TrendingDown,
              accent: '#EF4444',
            }} />
            <KPICard data={{
              title: 'Ajustes',
              value: (movementReport.byType?.AJUSTE ?? 0) + (movementReport.byType?.MERMA ?? 0),
              icon: Clock,
              accent: '#F59E0B',
            }} />
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Tendencia de Movimientos</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={movementReport.dailyTrend ?? []}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="fecha" style={{ fontSize: '12px' }} />
                  <YAxis style={{ fontSize: '12px' }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="entradas" fill="#10B981" />
                  <Bar dataKey="salidas" fill="#EF4444" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && alertReport && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-5">
            <KPICard data={{
              title: 'Total Alertas',
              value: alertReport.totalAlertas ?? 0,
              icon: AlertCircle,
              accent: '#EF4444',
            }} />
            <KPICard data={{
              title: 'Resueltas',
              value: alertReport.estado?.resueltas ?? 0,
              icon: CheckCircle,
              accent: '#10B981',
            }} />
            <KPICard data={{
              title: 'Pendientes',
              value: alertReport.estado?.pendientes ?? 0,
              icon: Clock,
              accent: '#F59E0B',
            }} />
            <KPICard data={{
              title: 'Descartadas',
              value: alertReport.estado?.descartadas ?? 0,
              icon: TrendingDown,
              accent: '#6B7280',
            }} />
            <KPICard data={{
              title: 'Tasa de Resolución',
              value: `${alertReport.tasaResolucion}%`,
              icon: CheckCircle,
              accent: '#07B6D4',
            }} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Alertas por Prioridad</h3>
              <div className="space-y-3">
                {Object.entries(alertReport.byPriority || {}).map(([priority, count]) => (
                  <div key={priority} className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">{priority}</span>
                    <span className="font-semibold text-slate-900">{String(count)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Tendencia Diaria</h3>
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={alertReport.dailyTrend ?? []}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="fecha" style={{ fontSize: '11px' }} />
                    <YAxis style={{ fontSize: '11px' }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="alertas" stroke="#EF4444" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Critical Products Tab */}
      {activeTab === 'critical' && criticalReport && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-3">
            <KPICard data={{
              title: 'Productos Críticos',
              value: criticalReport.totalProductosCriticos ?? 0,
              icon: AlertCircle,
              accent: '#EF4444',
            }} />
            <KPICard data={{
              title: 'Máximo de Alertas',
              value: criticalReport.topCritical?.[0]?.alertasCount ?? 0,
              subtitle: 'En un producto',
              icon: TrendingDown,
              accent: '#F97316',
            }} />
            <KPICard data={{
              title: 'Promedio',
              value: criticalReport.topCritical && criticalReport.topCritical.length > 0
                ? (criticalReport.topCritical.reduce((sum: number, p: any) => sum + p.alertasCount, 0) / criticalReport.topCritical.length).toFixed(1)
                : 0,
              subtitle: 'Alertas por producto',
              icon: Clock,
              accent: '#7C3AED',
            }} />
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-6 border-b border-slate-100">
              <p className="text-sm font-semibold text-slate-900">Top 15 Productos Críticos</p>
            </div>
            <div className="max-h-96 overflow-y-auto">
              <div className="divide-y divide-slate-100">
                {criticalReport.topCritical?.map((product: any, idx: number) => (
                  <div key={product.id} className="px-6 py-3 flex items-center justify-between hover:bg-slate-50">
                    <div>
                      <p className="text-sm font-medium text-slate-900">{idx + 1}. {product.descripcion}</p>
                      <p className="text-xs text-slate-500">{product.codigoProducto}</p>
                    </div>
                    <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-700">
                      {product.alertasCount} alertas
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Valuation Tab */}
      {activeTab === 'valuation' && valuationReport && (
        <div className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <KPICard data={{
              title: 'Valor Total Inventario',
              value: `$${(valuationReport.totalValor || 0).toLocaleString('es-CL')}`,
              icon: TrendingUp,
              accent: '#059669',
            }} />
            <KPICard data={{
              title: 'Total Unidades',
              value: (valuationReport.totalUnidades || 0).toLocaleString('es-CL'),
              icon: FileText,
              accent: '#185FA5',
            }} />
            <KPICard data={{
              title: 'Precio Promedio/Unidad',
              value: `$${(valuationReport.promedioPorProducto || 0).toLocaleString('es-CL')}`,
              icon: Clock,
              accent: '#7C3AED',
            }} />
            <KPICard data={{
              title: 'Categorías',
              value: Object.keys(valuationReport.byCategoria || {}).length,
              icon: CheckCircle,
              accent: '#0891B2',
            }} />
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Valor por Categoría</h3>
              <div className="space-y-3">
                {valuationReport.byCategoria?.slice(0, 8).map((cat: any) => (
                  <div key={cat.nombre}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-600">{cat.nombre}</span>
                      <span className="text-xs font-semibold text-slate-900">${(cat.valor || 0).toLocaleString('es-CL')}</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-blue-500"
                        style={{ width: `${Math.min(100, (cat.valor / valuationReport.totalValor) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
              <h3 className="text-sm font-semibold text-slate-900 mb-4">Top 10 Productos por Valor</h3>
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {valuationReport.top10Valor?.map((product: any, idx: number) => (
                  <div key={product.id} className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">{idx + 1}. {product.descripcion}</span>
                    <span className="font-semibold text-slate-900">${(product.stockActual * (product.precioUnitario || 0)).toLocaleString('es-CL')}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
