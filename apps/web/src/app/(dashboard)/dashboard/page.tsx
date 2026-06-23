'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import {
  Package, AlertTriangle, TrendingDown, DollarSign, Activity, ShieldAlert,
  HardHat, type LucideIcon,
} from 'lucide-react';
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from 'recharts';

interface Summary {
  totalProductos: number;
  productosActivos: number;
  productosCriticos: number;
  quiebreStock: number;
  stockCritico: number;
  stockBajo: number;
  stockNormal: number;
  alertasActivas: number;
  alertasCriticas: number;
  capitalInmovilizado: number;
  coberturaPromedio: number;
  stockTotal?: number;
  stockEstableUnidades?: number;
  stockEstablePorcentaje?: number;
  solicitudesPendientes?: number;
}

type EstadoCritico = 'QUIEBRE' | 'CRITICO' | 'BAJO' | 'NORMAL';

type ActivityItem = {
  title: string;
  description: string;
  time: string;
  icon: LucideIcon;
  accent: string;
};

const recentActivities: ActivityItem[] = [
  {
    title: 'Stock actualizado',
    description: 'Plástico Gorro 250 x 0.35 MC Transparente',
    time: 'hace 15 min',
    icon: TrendingDown,
    accent: '#185FA5',
  },
  {
    title: 'Solicitud procesada',
    description: 'LA 542 · 15/05/2026',
    time: 'hace 32 min',
    icon: Activity,
    accent: '#10B981',
  },
  {
    title: 'Insumo crítico detectado',
    description: 'Zuncho Plástico Blanco',
    time: 'hace 1 hora',
    icon: AlertTriangle,
    accent: '#EF9F27',
  },
  {
    title: 'Archivo SAP cargado',
    description: 'inventario_19062026.xlsx',
    time: 'hace 2 horas',
    icon: Package,
    accent: '#8B5CF6',
  },
  {
    title: 'Reporte generado',
    description: 'Reporte de Inventario Diario',
    time: 'hace 3 horas',
    icon: ShieldAlert,
    accent: '#0F766E',
  },
];

interface ProductoCritico {
  id: string;
  codigoProducto: string;
  descripcion: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  demandaPromedio: number | null;
  criticidad: string;
  diasCobertura: number | null;
  estado: EstadoCritico;
  categoria?: { nombre: string; color: string } | null;
}

interface Producto {
  id: string;
  codigoProducto: string;
  descripcion: string;
  stockActual: number;
  stockMinimo: number;
  criticidad: string;
  unidadMedida: string;
  diasCobertura: number | null;
  categoria?: { nombre: string; color: string };
}

const CRITICIDAD_COLORS: Record<string, string> = {
  CRITICO: '#ef4444',
  ALTO: '#f97316',
  MEDIO: '#eab308',
  BAJO: '#22c55e',
};

const ESTADO_STYLES: Record<EstadoCritico, {
  border: string; bg: string; text: string; label: string; dot: string; barColor: string;
}> = {
  QUIEBRE: { border: 'border-red-200', bg: 'bg-red-50/60', text: 'text-red-700', label: 'Quiebre de stock', dot: 'bg-red-500', barColor: '#ef4444' },
  CRITICO: { border: 'border-orange-200', bg: 'bg-orange-50/60', text: 'text-orange-700', label: 'Stock crítico', dot: 'bg-orange-500', barColor: '#f97316' },
  BAJO: { border: 'border-amber-200', bg: 'bg-amber-50/50', text: 'text-amber-700', label: 'Bajo mínimo', dot: 'bg-amber-500', barColor: '#d97706' },
  NORMAL: { border: 'border-gray-200', bg: 'bg-white', text: 'text-emerald-700', label: 'Estable', dot: 'bg-emerald-500', barColor: '#10b981' },
};

function formatDescripcion(desc: string) {
  return desc
    .toLowerCase()
    .split(' ')
    .map((word) => {
      if (/^\d/.test(word) || word.length <= 2) return word.toUpperCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
}

function KPICard({ title, value, subtitle, icon: Icon, accent }: {
  title: string; value: string | number; subtitle?: string;
  icon: LucideIcon; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium text-gray-500">{title}</p>
        <Icon size={16} style={{ color: accent }} strokeWidth={2} />
      </div>
      <p className="text-[26px] font-semibold text-gray-900 tracking-tight leading-none">{value}</p>
      {subtitle && <p className="text-[12px] text-gray-400 mt-2">{subtitle}</p>}
    </div>
  );
}

function UrgentRow({ p, onClick }: { p: ProductoCritico; onClick: () => void }) {
  const style = ESTADO_STYLES[p.estado];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3.5 border-t border-gray-100 first:border-t-0 hover:bg-gray-50 transition-colors text-left group"
    >
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: style.bg }}
      >
        <span className="text-[15px] font-semibold" style={{ color: style.text }}>
          {p.stockActual}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium text-gray-900 truncate group-hover:text-gray-950">
          {formatDescripcion(p.descripcion)}
        </p>
        <p className="text-[11px] text-gray-400 font-mono mt-0.5">
          {p.codigoProducto} · mín {p.stockMinimo.toLocaleString('es-CL')} {p.unidadMedida}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[13.5px] font-semibold" style={{ color: style.text }}>
          {p.diasCobertura !== null ? `${p.diasCobertura} días` : '—'}
        </p>
        <p className="text-[11px] text-gray-400">cobertura</p>
      </div>
    </button>
  );
}

function DenseRow({ p, onClick }: { p: ProductoCritico; onClick: () => void }) {
  const style = ESTADO_STYLES[p.estado];
  const pct = p.stockMinimo > 0 ? Math.min(100, Math.round((p.stockActual / p.stockMinimo) * 100)) : 100;

  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-[100px_1fr_90px_120px_90px] items-center px-5 py-2.5 border-t border-gray-100 first:border-t-0 hover:bg-gray-50 transition-colors text-left group"
    >
      <span className="text-[11px] font-mono text-gray-400 truncate">{p.codigoProducto}</span>
      <span className="text-[13px] text-gray-700 truncate pr-2 group-hover:text-gray-900">
        {formatDescripcion(p.descripcion)}
      </span>
      <span className="text-[13px] font-medium text-gray-800 text-right">
        {p.stockActual.toLocaleString('es-CL')} {p.unidadMedida}
      </span>
      <span className="px-3">
        <span className="block h-1 rounded-full bg-gray-100 overflow-hidden">
          <span className="block h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: style.barColor }} />
        </span>
        <span className="text-[11px] mt-1 block" style={{ color: style.barColor }}>
          {p.diasCobertura !== null ? `${p.diasCobertura}d` : '—'}
        </span>
      </span>
      <span className="text-right">
        <span
          className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md"
          style={{ color: style.text, backgroundColor: style.bg }}
        >
          {style.label}
        </span>
      </span>
    </button>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [insumos, setInsumos] = useState<ProductoCritico[]>([]);
  const [eppUniformes, setEppUniformes] = useState<ProductoCritico[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.inventory.summary(),
      api.inventory.critical({ limit: 12 }),
      api.products.list({ limit: 50, sortBy: 'stockActual', sortOrder: 'asc' }),
    ])
      .then(([summaryRes, criticalRes, productsRes]) => {
        setSummary(summaryRes.data?.data ?? summaryRes.data);

        const criticalData = criticalRes.data?.data ?? criticalRes.data ?? {};
        setInsumos(Array.isArray(criticalData.insumos) ? criticalData.insumos : []);
        setEppUniformes(Array.isArray(criticalData.eppUniformes) ? criticalData.eppUniformes : []);

        const items = productsRes.data?.data?.data ?? productsRes.data?.data ?? productsRes.data ?? [];
        const all = Array.isArray(items) ? items : [];
        const general = all.filter((p: Producto) => !['CRITICO', 'ALTO'].includes(p.criticidad));
        setProductos(general);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const goToProduct = (id: string) => router.push(`/inventory/${id}`);

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-64" />
        <div className="grid grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => <div key={i} className="h-32 bg-gray-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const pieData = [
    { name: 'Quiebre (0 UN)', value: summary?.quiebreStock ?? 0, color: '#E24B4A' },
    { name: 'Crítico (<20% mín)', value: summary?.stockCritico ?? 0, color: '#EF9F27' },
    { name: 'Bajo (<mínimo)', value: summary?.stockBajo ?? 0, color: '#FAC775' },
    { name: 'Normal', value: summary?.stockNormal ?? 0, color: '#639922' },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'Total', value: summary?.totalProductos ?? 0, fill: '#185FA5' },
    { name: 'Activos', value: summary?.productosActivos ?? 0, fill: '#639922' },
    { name: 'Críticos', value: summary?.productosCriticos ?? 0, fill: '#EF9F27' },
    { name: 'Quiebre', value: summary?.quiebreStock ?? 0, fill: '#E24B4A' },
    { name: 'Alertas', value: summary?.alertasActivas ?? 0, fill: '#FAC775' },
  ];

  return (
    <div className="p-8 space-y-7 bg-gray-50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Dashboard ejecutivo</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Resumen operacional en tiempo real</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            19 de junio, 2026
          </span>
          <button className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
            Exportar
          </button>
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <KPICard
          title="Stock Total"
          value={summary?.stockTotal?.toLocaleString('es-CL') ?? '0'}
          subtitle="Todas las unidades"
          icon={Package}
          accent="#185FA5"
        />
        <KPICard
          title="Stock Estable"
          value={`${summary?.stockEstableUnidades?.toLocaleString('es-CL') ?? '0'} UN`}
          subtitle={`${summary?.stockEstablePorcentaje?.toFixed(1) ?? '0.0'}% del total`}
          icon={ShieldAlert}
          accent="#22C55E"
        />
        <KPICard
          title="Insumos Críticos"
          value={summary?.productosCriticos ?? 0}
          subtitle="ALTO / CRÍTICO"
          icon={AlertTriangle}
          accent="#EF9F27"
        />
        <KPICard
          title="Cobertura Promedio"
          value={`${summary?.coberturaPromedio?.toFixed(1) ?? '0.0'} días`}
          subtitle="Últimos 30 días"
          icon={Activity}
          accent="#639922"
        />
        <KPICard
          title="Solicitudes pendientes"
          value={summary?.solicitudesPendientes ?? 0}
          subtitle="Por procesar"
          icon={HardHat}
          accent="#0F766E"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.45fr_0.85fr]">
        <div className="space-y-4">
          <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="flex flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between md:px-7">
              <div>
                <p className="text-sm font-semibold text-slate-900">Insumos críticos</p>
                <p className="text-sm text-slate-500 mt-1">Los insumos con menor cobertura están en la parte superior.</p>
              </div>
              <span className="inline-flex items-center rounded-full bg-red-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-red-700">
                Crítico
              </span>
            </div>
            <div className="divide-y divide-slate-100">
              {insumos.length === 0 ? (
                <div className="px-6 py-12 text-center text-slate-400">No hay insumos críticos definidos.</div>
              ) : (
                insumos.map((p) => (
                  <UrgentRow key={p.id} p={p} onClick={() => goToProduct(p.id)} />
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
            <div className="px-6 py-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Stock estable</p>
                  <p className="text-sm text-slate-500 mt-1">Insumos con stock suficiente para operación.</p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.15em] text-emerald-700">
                  Estable
                </span>
              </div>
            </div>
            <div className="grid grid-cols-[110px_1fr_100px_120px_90px] gap-2 px-6 pb-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400">
              <div>Código</div>
              <div>Insumo</div>
              <div className="text-right">Stock</div>
              <div className="text-center">Cobertura</div>
              <div className="text-right">Estado</div>
            </div>
            <div className="max-h-80 overflow-y-auto">
              {insumos.filter(p => p.estado === 'BAJO' || p.estado === 'NORMAL').map((p) => (
                <DenseRow key={p.id} p={p} onClick={() => goToProduct(p.id)} />
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Cobertura de Stock</p>
                <p className="text-sm text-slate-500 mt-1">Basado en el consumo promedio de los últimos 30 días.</p>
              </div>
              <div className="text-right">
                <p className="text-3xl font-semibold text-slate-900">{summary?.coberturaPromedio?.toFixed(1) ?? '0.0'}</p>
                <p className="text-xs uppercase tracking-[0.2em] text-slate-400">días promedio</p>
              </div>
            </div>
            <div className="mt-5 flex flex-col items-center justify-center gap-4 md:flex-row md:items-center">
              <div className="w-full max-w-[240px] h-[240px] mx-auto">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={88} paddingAngle={3} dataKey="value">
                      {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3 w-full">
                {pieData.map((item) => (
                  <div key={item.name} className="flex items-center justify-between rounded-3xl border border-slate-200 bg-slate-50 px-4 py-3">
                    <div className="flex items-center gap-3">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                      <span className="text-sm font-medium text-slate-700">{item.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-slate-900">{item.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Actividad reciente</p>
                <p className="text-sm text-slate-500 mt-1">Acciones y eventos recientes del inventario.</p>
              </div>
              <span className="text-xs uppercase tracking-[0.2em] text-slate-400">últimas 24h</span>
            </div>
            <div className="mt-5 space-y-3">
              {recentActivities.map((item) => (
                <div key={item.title} className="flex items-start gap-3 rounded-3xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl" style={{ backgroundColor: `${item.accent}20` }}>
                    <item.icon size={18} style={{ color: item.accent }} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-slate-900 truncate">{item.title}</p>
                    <p className="text-sm text-slate-500 mt-1 truncate">{item.description}</p>
                  </div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-400">{item.time}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
