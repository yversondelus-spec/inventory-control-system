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
    <div className="p-8 space-y-7 bg-gray-50/40 min-h-screen">
      <div>
        <h1 className="text-[22px] font-semibold text-gray-900 tracking-tight">Dashboard ejecutivo</h1>
        <p className="text-gray-500 text-[13px] mt-1">Resumen operacional en tiempo real</p>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <ShieldAlert size={15} className="text-red-500" />
          <h2 className="text-[15px] font-semibold text-gray-900">Insumos críticos</h2>
          <span className="text-[12px] text-gray-400">materiales de embalaje — sin ellos no hay operación</span>
        </div>

        {insumos.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-10 text-center text-gray-400 text-sm">
            No hay insumos marcados como críticos todavía.
          </div>
        ) : (
          <>
            {insumos.filter(p => p.estado === 'QUIEBRE' || p.estado === 'CRITICO').length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-[14px] font-semibold text-gray-900">Requieren atención inmediata</h3>
                    <p className="text-[12px] text-gray-400 mt-0.5">
                      {insumos.filter(p => p.estado === 'QUIEBRE' || p.estado === 'CRITICO').length} insumo{insumos.filter(p => p.estado === 'QUIEBRE' || p.estado === 'CRITICO').length !== 1 ? 's' : ''} en quiebre o stock crítico
                    </p>
                  </div>
                  <span className="text-[11px] font-medium text-red-700 bg-red-50 px-2.5 py-1 rounded-md">
                    acción requerida hoy
                  </span>
                </div>
                <div>
                  {insumos.filter(p => p.estado === 'QUIEBRE' || p.estado === 'CRITICO').map((p) => (
                    <UrgentRow key={p.id} p={p} onClick={() => goToProduct(p.id)} />
                  ))}
                </div>
              </div>
            )}

            {insumos.filter(p => p.estado === 'BAJO' || p.estado === 'NORMAL').length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100">
                  <h3 className="text-[14px] font-semibold text-gray-900">Stock estable</h3>
                  <p className="text-[12px] text-gray-400 mt-0.5">
                    {insumos.filter(p => p.estado === 'BAJO' || p.estado === 'NORMAL').length} insumo{insumos.filter(p => p.estado === 'BAJO' || p.estado === 'NORMAL').length !== 1 ? 's' : ''} sin urgencia
                  </p>
                </div>
                <div className="grid grid-cols-[100px_1fr_90px_120px_90px] px-5 py-2 bg-gray-50/80 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
                  <div>Código</div>
                  <div>Insumo</div>
                  <div className="text-right">Stock</div>
                  <div className="px-3">Cobertura</div>
                  <div className="text-right">Estado</div>
                </div>
                <div className="max-h-80 overflow-y-auto">
                  {insumos.filter(p => p.estado === 'BAJO' || p.estado === 'NORMAL').map((p) => (
                    <DenseRow key={p.id} p={p} onClick={() => goToProduct(p.id)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {eppUniformes.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <HardHat size={14} className="text-gray-400" />
            <h2 className="text-[13px] font-semibold text-gray-500">EPP y Uniformes</h2>
            <span className="text-[12px] text-gray-400">seguimiento de cumplimiento, no bloquea operaciones</span>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <div className="grid grid-cols-[100px_1fr_90px_120px_90px] px-5 py-2 bg-gray-50/80 text-[11px] font-medium text-gray-400 uppercase tracking-wide">
              <div>Código</div>
              <div>Ítem</div>
              <div className="text-right">Stock</div>
              <div className="px-3">Cobertura</div>
              <div className="text-right">Estado</div>
            </div>
            <div className="max-h-72 overflow-y-auto">
              {eppUniformes.map((p) => (
                <DenseRow key={p.id} p={p} onClick={() => goToProduct(p.id)} />
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <KPICard title="Total productos" value={summary?.totalProductos ?? 0}
          subtitle={`${summary?.productosActivos ?? 0} activos`} icon={Package} accent="#185FA5" />
        <KPICard title="Productos críticos" value={summary?.productosCriticos ?? 0}
          subtitle="Criticidad ALTO o CRÍTICO" icon={ShieldAlert} accent="#D85A30" />
        <KPICard title="Quiebre de stock" value={summary?.quiebreStock ?? 0}
          subtitle="Productos sin unidades" icon={TrendingDown} accent="#E24B4A" />
        <KPICard title="Alertas activas" value={summary?.alertasActivas ?? 0}
          subtitle={`${summary?.alertasCriticas ?? 0} críticas`} icon={AlertTriangle} accent="#EF9F27" />
        <KPICard title="Cobertura críticos" value={`${summary?.coberturaPromedio?.toFixed(1) ?? 0} días`}
          subtitle="Stock alto/crítico" icon={Activity} accent="#639922" />
        <KPICard title="Capital inmovilizado"
          value={`$${(summary?.capitalInmovilizado ?? 0).toLocaleString('es-CL')}`}
          subtitle="Valor total del inventario" icon={DollarSign} accent="#534AB7" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[14px] font-semibold text-gray-800 mb-5">Resumen de inventario</h2>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} barSize={32}>
              <XAxis dataKey="name" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #f1f5f9', fontSize: 12 }} cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="value" name="Cantidad" radius={[8, 8, 0, 0]}>
                {barData.map((entry, i) => <Cell key={i} fill={entry.fill} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-[14px] font-semibold text-gray-800 mb-5">Estado del stock</h2>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={56} outerRadius={88} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #f1f5f9', fontSize: 12 }}
                formatter={(value: number) => [`${value} productos`, '']} />
              <Legend iconType="circle" iconSize={8}
                formatter={(value) => <span style={{ fontSize: 12, color: '#4b5563' }}>{value}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Inventario general</h2>
          <p className="text-xs text-gray-400 mt-0.5">Productos no críticos — ordenados por stock más bajo</p>
        </div>
        {productos.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">Sin productos para mostrar.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50/80">
              <tr>
                <th className="text-left px-5 py-2.5 font-medium text-gray-400 text-[11px] uppercase tracking-wide">Código</th>
                <th className="text-left px-5 py-2.5 font-medium text-gray-400 text-[11px] uppercase tracking-wide">Descripción</th>
                <th className="text-left px-5 py-2.5 font-medium text-gray-400 text-[11px] uppercase tracking-wide">Categoría</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-400 text-[11px] uppercase tracking-wide">Stock</th>
                <th className="text-right px-5 py-2.5 font-medium text-gray-400 text-[11px] uppercase tracking-wide">Mínimo</th>
                <th className="text-center px-5 py-2.5 font-medium text-gray-400 text-[11px] uppercase tracking-wide">Cobertura</th>
                <th className="text-center px-5 py-2.5 font-medium text-gray-400 text-[11px] uppercase tracking-wide">Criticidad</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {productos.slice(0, 20).map((p) => {
                const pct = p.stockMinimo > 0 ? (p.stockActual / p.stockMinimo) * 100 : 100;
                const rowColor = p.stockActual <= 0 ? 'bg-red-50' : pct < 100 ? 'bg-yellow-50' : '';
                return (
                  <tr key={p.id} className={`hover:bg-gray-50 transition-colors ${rowColor}`}>
                    <td className="px-5 py-2.5 font-mono text-[11px] text-gray-500">{p.codigoProducto}</td>
                    <td className="px-5 py-2.5 text-gray-800 max-w-xs truncate text-[13px]">{formatDescripcion(p.descripcion)}</td>
                    <td className="px-5 py-2.5">
                      {p.categoria && (
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-medium text-white"
                          style={{ backgroundColor: p.categoria.color ?? '#6366f1' }}>
                          {p.categoria.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-2.5 text-right font-medium text-gray-700 text-[13px]">{p.stockActual} {p.unidadMedida}</td>
                    <td className="px-5 py-2.5 text-right text-gray-400 text-[13px]">{p.stockMinimo} {p.unidadMedida}</td>
                    <td className="px-5 py-2.5 text-center text-gray-400 text-[13px]">
                      {p.stockMinimo > 0 ? `${Math.round((p.stockActual / p.stockMinimo) * 30)}d` : '—'}
                    </td>
                    <td className="px-5 py-2.5 text-center">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-medium"
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
          <div className="px-5 py-3 text-center text-[12px] text-gray-400 border-t border-gray-100">
            Mostrando 20 de {productos.length} productos no críticos · ver todos en Inventario
          </div>
        )}
      </div>
    </div>
  );
}
