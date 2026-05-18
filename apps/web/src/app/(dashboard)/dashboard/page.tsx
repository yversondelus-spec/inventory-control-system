'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Package, AlertTriangle, TrendingDown, DollarSign, Activity, ShieldAlert } from 'lucide-react';
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

function KPICard({ title, value, subtitle, icon: Icon, color }: {
  title: string; value: string | number; subtitle?: string;
  icon: React.ElementType; color: string;
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

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [criticos, setCriticos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.inventory.summary()
      .then((res) => setSummary(res.data?.data ?? res.data))
      .catch(console.error);

    api.products.list({ limit: 50 })
      .then((res) => {
        const items = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
        const all = Array.isArray(items) ? items : [];
        const sorted = all
          .filter((p: Producto) => ['CRITICO', 'ALTO'].includes(p.criticidad))
          .sort((a: Producto, b: Producto) => a.stockActual - b.stockActual)
          .slice(0, 8);
        setCriticos(sorted);
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

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Productos Críticos</h2>
          <p className="text-xs text-gray-400 mt-0.5">Ordenados por stock más bajo — requieren atención inmediata</p>
        </div>
        {criticos.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">No hay productos críticos 🎉</div>
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
              {criticos.map((p) => {
                const pct = p.stockMinimo > 0 ? (p.stockActual / p.stockMinimo) * 100 : 100;
                const rowColor = p.stockActual <= 0 ? 'bg-red-50' :
                  pct < 20 ? 'bg-orange-50' :
                  pct < 100 ? 'bg-yellow-50' : '';
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
                    <td className={`px-6 py-3 text-right font-medium ${
                      p.stockActual <= 0 ? 'text-red-600' :
                      pct < 20 ? 'text-orange-600' : 'text-yellow-600'
                    }`}>
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
      </div>
    </div>
  );
}