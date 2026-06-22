'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import {
  Package, AlertTriangle, TrendingDown, DollarSign, Activity, ShieldAlert,
  type LucideIcon,
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

const ESTADO_STYLES: Record<EstadoCritico, { border: string; bg: string; text: string; label: string; dot: string }> = {
  QUIEBRE: { border: 'border-red-300', bg: 'bg-red-50', text: 'text-red-700', label: 'Quiebre de stock', dot: 'bg-red-500' },
  CRITICO: { border: 'border-orange-300', bg: 'bg-orange-50', text: 'text-orange-700', label: 'Stock crítico', dot: 'bg-orange-500' },
  BAJO: { border: 'border-yellow-300', bg: 'bg-yellow-50', text: 'text-yellow-700', label: 'Bajo mínimo', dot: 'bg-yellow-500' },
  NORMAL: { border: 'border-green-300', bg: 'bg-green-50', text: 'text-green-700', label: 'Estable', dot: 'bg-green-500' },
};

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

function CriticalProductCard({ p }: { p: ProductoCritico }) {
  const style = ESTADO_STYLES[p.estado];
  const pct = p.stockMinimo > 0 ? Math.min(100, Math.round((p.stockActual / p.stockMinimo) * 100)) : 100;

  return (
    <div className={`rounded-xl border-2 ${style.border} ${style.bg} p-5 flex flex-col gap-3`}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-mono text-gray-500">{p.codigoProducto}</p>
          <p className="text-sm font-semibold text-gray-900 leading-snug mt-0.5">{p.descripcion}</p>
        </div>
        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${style.text} ${style.bg} border ${style.border}`}>
          {p.criticidad}
        </span>
      </div>

      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-bold text-gray-900">{p.stockActual.toLocaleString('es-CL')}</span>
        <span className="text-xs text-gray-500">{p.unidadMedida} en stock</span>
      </div>

      {/* Barra de nivel respecto al mínimo */}
      <div className="w-full h-2 rounded-full bg-gray-200 overflow-hidden">
        <div
          className={`h-full rounded-full ${style.dot}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">Mínimo: {p.stockMinimo.toLocaleString('es-CL')} {p.unidadMedida}</span>
        <span className={`font-semibold ${style.text}`}>
          {p.diasCobertura !== null ? `${p.diasCobertura}d cobertura` : 'Sin datos'}
        </span>
      </div>

      <div className="flex items-center gap-1.5 pt-1 border-t border-gray-200/70">
        <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
        <span className={`text-xs font-medium ${style.text}`}>{style.label}</span>
        {p.demandaPromedio ? (
          <span className="text-xs text-gray-400 ml-auto">~{p.demandaPromedio}/día</span>
        ) : null}
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [criticosDestacados, setCriticosDestacados] = useState<ProductoCritico[]>([]);
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

        const criticalItems = criticalRes.data?.data ?? criticalRes.data ?? [];
        setCriticosDestacados(Array.isArray(criticalItems) ? criticalItems : []);

        const items = productsRes.data?.data?.data ?? productsRes.data?.data ?? productsRes.data ?? [];
        const all = Array.isArray(items) ? items : [];
        const isBusinessCritical = (product: Producto) => {
          const desc = product.descripcion.toUpperCase();
          if (desc.includes('PLASTICO BASE') && desc.includes('0.35')) return true;
          if (desc.includes('PLASTICO GORRO')) return true;
          if (desc.includes('MANTA')) return true;
          if (desc.includes('PAÑAL')) return true;
          if (desc.includes('FILM')) return true;
          if (desc.includes('ESQUINERO')) return true;
          if (desc.includes('SKID') && desc.includes('MADERA') && desc.includes('CERTIFICADO')) return true;
          return false;
        };

        const general = all.filter(
          (p: Producto) => !['CRITICO', 'ALTO'].includes(p.criticidad) && !isBusinessCritical(p),
        );
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

      {/* ── INSUMOS CRÍTICOS — sección fija destacada, sin ellos no hay ops ── */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <ShieldAlert size={20} className="text-orange-500" />
          <h2 className="text-lg font-bold text-gray-900">Insumos Críticos</h2>
          <span className="text-xs text-gray-400">— sin estos productos, las operaciones se detienen</span>
        </div>

        {criticosDestacados.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center text-gray-400 text-sm">
            No hay insumos marcados como críticos todavía.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {criticosDestacados.map((p) => <CriticalProductCard key={p.id} p={p} />)}
          </div>
        )}
      </div>

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