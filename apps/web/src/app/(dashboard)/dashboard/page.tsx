'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import {
  Package, AlertTriangle, TrendingDown, DollarSign, Activity, ShieldAlert,
  HardHat, ChevronRight, type LucideIcon,
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
}

type EstadoCritico = 'QUIEBRE' | 'CRITICO' | 'BAJO' | 'NORMAL';

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

function KPICard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string;
  icon: LucideIcon; color: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm font-medium text-gray-500">{title}</p>
        <div className={`p-2 rounded-lg ${color}`}>
          <Icon size={18} className="text-white" />
        </div>
      </div>
      <p className="text-3xl font-bold text-gray-900">{value}</p>
      {subtitle && <p className="text-xs text-gray-400 mt-1">{subtitle}</p>}
    </div>
  );
}

function InsumoCard({ p, urgent }: { p: ProductoCritico; urgent: boolean }) {
  const style = ESTADO_STYLES[p.estado];
  const pct = p.stockMinimo > 0 ? Math.min(100, Math.round((p.stockActual / p.stockMinimo) * 100)) : 100;

  return (
    <div
      className={`rounded-2xl border ${style.border} ${style.bg} shadow-sm p-5 flex flex-col gap-3.5 transition-all hover:shadow-md ${
        urgent ? 'ring-1 ring-inset ring-red-100' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] font-mono text-gray-400 tracking-wide">{p.codigoProducto}</p>
          <p className="text-[13.5px] font-semibold text-gray-900 leading-snug mt-1 line-clamp-2" title={p.descripcion}>
            {formatDescripcion(p.descripcion)}
          </p>
        </div>
        <span
          className="shrink-0 px-2 py-1 rounded-lg text-[10px] font-bold tracking-wide"
          style={{ backgroundColor: `${CRITICIDAD_COLORS[p.criticidad]}14`, color: CRITICIDAD_COLORS[p.criticidad] }}
        >
          {p.criticidad}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-bold text-gray-900 tracking-tight leading-none">
          {p.stockActual.toLocaleString('es-CL')}
        </span>
        <span className="text-xs text-gray-400 font-medium">{p.unidadMedida} en stock</span>
      </div>

      <div className="w-full h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${pct}%`, backgroundColor: style.barColor }}
        />
      </div>

      <div className="flex items-center justify-between text-[12px]">
        <span className="text-gray-400">Mín. {p.stockMinimo.toLocaleString('es-CL')} {p.unidadMedida}</span>
        <span className="font-semibold" style={{ color: style.barColor }}>
          {p.diasCobertura !== null ? `${p.diasCobertura}d cobertura` : 'Sin datos'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-2.5 border-t border-gray-100">
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className="text-[12px] font-medium text-gray-500">{style.label}</span>
        {p.demandaPromedio ? (
          <span className="text-[11px] text-gray-300 ml-auto">~{p.demandaPromedio}/día</span>
        ) : null}
      </div>
    </div>
  );
}

function EppUniformeRow({ p }: { p: ProductoCritico }) {
  const style = ESTADO_STYLES[p.estado];
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-gray-50 transition-colors">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${style.dot}`} />
        <span className="text-[13px] text-gray-700 truncate" title={p.descripcion}>
          {formatDescripcion(p.descripcion)}
        </span>
        <span className="text-[11px] text-gray-300 shrink-0">{p.categoria?.nombre}</span>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="text-[13px] font-medium text-gray-600">{p.stockActual} {p.unidadMedida}</span>
        <span className="text-[11px] font-medium" style={{ color: style.barColor }}>
          {p.diasCobertura !== null ? `${p.diasCobertura}d` : '—'}
        </span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
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
    { name: 'Quiebre (0 UN)', value: summary?.quiebreStock ?? 0, color: '#ef4444' },
    { name: 'Crítico (<20% mín)', value: summary?.stockCritico ?? 0, color: '#f97316' },
    { name: 'Bajo (<mínimo)', value: summary?.stockBajo ?? 0, color: '#eab308' },
    { name: 'Normal', value: summary?.stockNormal ?? 0, color: '#22c55e' },
  ].filter(d => d.value > 0);

  const barData = [
    { name: 'Total', value: summary?.totalProductos ?? 0, fill: '#6366f1' },
    { name: 'Activos', value: summary?.productosActivos ?? 0, fill: '#22c55e' },
    { name: 'Críticos', value: summary?.productosCriticos ?? 0, fill: '#f97316' },
    { name: 'Quiebre', value: summary?.quiebreStock ?? 0, fill: '#ef4444' },
    { name: 'Alertas', value: summary?.alertasActivas ?? 0, fill: '#eab308' },
  ];

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard Ejecutivo</h1>
        <p className="text-gray-500 text-sm mt-1">Resumen operacional en tiempo real</p>
      </div>

      {/* ── INSUMOS — categoría Materiales Embalaje, sin esto no hay operación ── */}
      <div>
        <div className="flex items-center gap-2.5 mb-5">
          <div className="p-1.5 rounded-lg bg-red-100">
            <ShieldAlert size={16} className="text-red-600" />
          </div>
          <h2 className="text-[17px] font-bold text-gray-900">Insumos Críticos</h2>
          <span className="text-[13px] text-gray-400">— materiales de embalaje, sin ellos no hay operación</span>
        </div>

        {insumos.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-100 px-6 py-10 text-center text-gray-400 text-sm">
            No hay insumos marcados como críticos todavía.
          </div>
        ) : (
          <div className="space-y-5">
            {insumos.filter((p) => p.estado === 'QUIEBRE' || p.estado === 'CRITICO').length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {insumos.filter((p) => p.estado === 'QUIEBRE' || p.estado === 'CRITICO').map((p) => (
                  <InsumoCard key={p.id} p={p} urgent />
                ))}
              </div>
            )}
            {insumos.filter((p) => p.estado === 'BAJO' || p.estado === 'NORMAL').length > 0 && (
              <details className="group" open={insumos.filter((p) => p.estado === 'QUIEBRE' || p.estado === 'CRITICO').length === 0}>
                <summary className="flex items-center gap-1.5 text-[13px] font-medium text-gray-400 cursor-pointer select-none hover:text-gray-600 mb-3 list-none">
                  <ChevronRight size={14} className="transition-transform group-open:rotate-90" />
                  {insumos.filter((p) => p.estado === 'BAJO' || p.estado === 'NORMAL').length} insumo{insumos.filter((p) => p.estado === 'BAJO' || p.estado === 'NORMAL').length !== 1 ? 's' : ''} con stock estable
                </summary>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {insumos.filter((p) => p.estado === 'BAJO' || p.estado === 'NORMAL').map((p) => (
                    <InsumoCard key={p.id} p={p} urgent={false} />
                  ))}
                </div>
              </details>
            )}
          </div>
        )}
      </div>

      {eppUniformes.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-gray-100 flex items-center gap-2">
            <HardHat size={14} className="text-gray-400" />
            <h3 className="text-[13px] font-semibold text-gray-600">EPP y Uniformes</h3>
            <span className="text-[11px] text-gray-300">— seguimiento de cumplimiento, no bloquea operaciones</span>
            {eppUniformes.filter((p) => ['QUIEBRE', 'CRITICO', 'BAJO'].includes(p.estado)).length > 0 && (
              <span className="ml-auto text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
                {eppUniformes.filter((p) => ['QUIEBRE', 'CRITICO', 'BAJO'].includes(p.estado)).length} requieren atención
              </span>
            )}
          </div>
          <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
            {eppUniformes.map((p) => <EppUniformeRow key={p.id} p={p} />)}
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <KPICard title="Total Productos" value={summary?.totalProductos ?? 0}
          subtitle={`${summary?.productosActivos ?? 0} activos`} icon={Package} color="bg-blue-500" />
        <KPICard title="Productos Críticos" value={summary?.productosCriticos ?? 0}
          subtitle="Criticidad ALTO o CRÍTICO" icon={ShieldAlert} color="bg-orange-500" />
        <KPICard title="Quiebre de Stock" value={summary?.quiebreStock ?? 0}
          subtitle="Productos sin unidades (0 UN)" icon={TrendingDown} color="bg-red-500" />
        <KPICard title="Alertas Activas" value={summary?.alertasActivas ?? 0}
          subtitle={`${summary?.alertasCriticas ?? 0} críticas`} icon={AlertTriangle} color="bg-yellow-500" />
        <KPICard title="Cobertura Críticos" value={`${summary?.coberturaPromedio?.toFixed(1) ?? 0} días`}
          subtitle="Días de stock productos ALTO/CRÍTICO" icon={Activity} color="bg-green-500" />
        <KPICard title="Capital Inmovilizado"
          value={`$${(summary?.capitalInmovilizado ?? 0).toLocaleString('es-CL')}`}
          subtitle="Valor total del inventario" icon={DollarSign} color="bg-purple-500" />
      </div>

      {/* Niveles de stock */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-red-50 rounded-xl border border-red-200 p-4 text-center">
          <p className="text-xs font-medium text-red-500 mb-1">🔴 Quiebre</p>
          <p className="text-2xl font-bold text-red-600">{summary?.quiebreStock ?? 0}</p>
          <p className="text-xs text-red-400 mt-1">Stock = 0</p>
        </div>
        <div className="bg-orange-50 rounded-xl border border-orange-200 p-4 text-center">
          <p className="text-xs font-medium text-orange-500 mb-1">🟠 Crítico</p>
          <p className="text-2xl font-bold text-orange-600">{summary?.stockCritico ?? 0}</p>
          <p className="text-xs text-orange-400 mt-1">Menos del 20% del mínimo</p>
        </div>
        <div className="bg-yellow-50 rounded-xl border border-yellow-200 p-4 text-center">
          <p className="text-xs font-medium text-yellow-600 mb-1">🟡 Bajo</p>
          <p className="text-2xl font-bold text-yellow-700">{summary?.stockBajo ?? 0}</p>
          <p className="text-xs text-yellow-500 mt-1">Bajo el mínimo</p>
        </div>
        <div className="bg-green-50 rounded-xl border border-green-200 p-4 text-center">
          <p className="text-xs font-medium text-green-600 mb-1">🟢 Normal</p>
          <p className="text-2xl font-bold text-green-700">{summary?.stockNormal ?? 0}</p>
          <p className="text-xs text-green-500 mt-1">Stock suficiente</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-6">Resumen de Inventario</h2>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={barData} barSize={36}>
              <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" name="Cantidad" radius={[6, 6, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-base font-semibold text-gray-800 mb-6">Estado del Stock</h2>
          <ResponsiveContainer width="100%" height={240}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }}
                formatter={(value: number) => [`${value} productos`, '']} />
              <Legend iconType="circle" iconSize={10}
                formatter={(value) => <span style={{ fontSize: 13, color: '#374151' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla general — el resto del inventario, sin protagonismo visual */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Inventario General</h2>
          <p className="text-xs text-gray-400 mt-0.5">Productos no críticos — ordenados por stock más bajo</p>
        </div>
        {productos.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">Sin productos para mostrar.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Código</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Descripción</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Categoría</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Stock</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Mínimo</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Cobertura</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Criticidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.slice(0, 20).map((p) => {
                const pct = p.stockMinimo > 0 ? (p.stockActual / p.stockMinimo) * 100 : 100;
                const rowColor = p.stockActual <= 0 ? 'bg-red-50' : pct < 100 ? 'bg-yellow-50' : '';
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${rowColor}`}>
                    <td className="px-6 py-3 font-mono text-xs text-gray-600">{p.codigoProducto}</td>
                    <td className="px-6 py-3 text-gray-900 max-w-xs truncate">{p.descripcion}</td>
                    <td className="px-6 py-3">
                      {p.categoria && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: p.categoria.color ?? '#6366f1' }}>
                          {p.categoria.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-700">
                      {p.stockActual} {p.unidadMedida}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-500">{p.stockMinimo} {p.unidadMedida}</td>
                    <td className="px-6 py-3 text-center text-gray-500">
                      {p.stockMinimo > 0
                        ? `${Math.round((p.stockActual / p.stockMinimo) * 30)}d`
                        : '—'}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{ backgroundColor: `${CRITICIDAD_COLORS[p.criticidad]}20`, color: CRITICIDAD_COLORS[p.criticidad] }}>
                        {p.criticidad}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
        {productos.length > 20 && (
          <div className="px-6 py-3 text-center text-xs text-gray-400 border-t border-gray-100">
            Mostrando 20 de {productos.length} productos no críticos · ver todos en Inventario
          </div>
        )}
      </div>
    </div>
  );
}