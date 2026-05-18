'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { ArrowLeft, Package, AlertTriangle, TrendingDown, TrendingUp, Activity } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from 'recharts';

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  cantidadAntes: number;
  cantidadDespues: number;
  fecha: string;
  origen: string;
  referencia: string | null;
}

interface Producto {
  id: string;
  codigoProducto: string;
  descripcion: string;
  stockActual: number;
  stockMinimo: number;
  stockSeguridad: number;
  puntoPedido: number;
  leadTimeDias: number;
  criticidad: string;
  unidadMedida: string;
  diasCobertura: number | null;
  ultimoMovimiento: string | null;
  categoria?: { nombre: string; color: string };
  movimientos?: Movimiento[];
  alertas?: { id: string; tipo: string; estado: string; mensaje: string }[];
}

const TIPO_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  AJUSTE_POSITIVO: { label: 'Ajuste +', color: 'text-green-600 bg-green-50', icon: TrendingUp },
  AJUSTE_NEGATIVO: { label: 'Ajuste -', color: 'text-red-600 bg-red-50',   icon: TrendingDown },
  ENTRADA:         { label: 'Entrada',  color: 'text-blue-600 bg-blue-50',  icon: TrendingUp },
  SALIDA:          { label: 'Salida',   color: 'text-orange-600 bg-orange-50', icon: TrendingDown },
  TRANSFERENCIA:   { label: 'Transfer', color: 'text-purple-600 bg-purple-50', icon: Activity },
};

const CRITICIDAD_COLOR: Record<string, string> = {
  CRITICO: 'bg-red-100 text-red-700',
  ALTO:    'bg-orange-100 text-orange-700',
  MEDIO:   'bg-yellow-100 text-yellow-700',
  BAJO:    'bg-green-100 text-green-700',
};

export default function ProductoDetallePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [producto, setProducto] = useState<Producto | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    api.products.get(id)
      .then(res => {
        const data = res.data?.data ?? res.data;
        setProducto(data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="h-32 bg-gray-200 rounded-xl" />
        <div className="h-64 bg-gray-200 rounded-xl" />
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="p-8 text-center text-gray-400">
        <Package size={40} className="mx-auto mb-3 opacity-30" />
        <p>Producto no encontrado</p>
      </div>
    );
  }

  const movimientos = producto.movimientos ?? [];
  const alertasActivas = (producto.alertas ?? []).filter(a => a.estado === 'ACTIVA');

  // Gráfica de stock en el tiempo
  const chartData = movimientos
    .slice()
    .sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime())
    .map(m => ({
      fecha: new Date(m.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit' }),
      stock: m.cantidadDespues,
    }));

  if (chartData.length === 0) {
    chartData.push({ fecha: 'Hoy', stock: producto.stockActual });
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()}
          className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
          <ArrowLeft size={20} className="text-gray-600" />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900">{producto.descripcion}</h1>
            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CRITICIDAD_COLOR[producto.criticidad] ?? ''}`}>
              {producto.criticidad}
            </span>
            {producto.categoria && (
              <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                style={{ backgroundColor: producto.categoria.color ?? '#6366f1' }}>
                {producto.categoria.nombre}
              </span>
            )}
          </div>
          <p className="text-sm text-gray-500 mt-0.5 font-mono">{producto.codigoProducto}</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Stock Actual', value: `${producto.stockActual} ${producto.unidadMedida}`,
            color: producto.stockActual <= producto.stockMinimo ? 'text-orange-600' : 'text-gray-900' },
          { label: 'Stock Mínimo', value: `${producto.stockMinimo} ${producto.unidadMedida}`, color: 'text-gray-900' },
          { label: 'Punto de Pedido', value: `${producto.puntoPedido} ${producto.unidadMedida}`, color: 'text-gray-900' },
          { label: 'Lead Time', value: `${producto.leadTimeDias} días`, color: 'text-gray-900' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* Alertas activas */}
      {alertasActivas.length > 0 && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 space-y-2">
          <div className="flex items-center gap-2 text-orange-700 font-medium text-sm">
            <AlertTriangle size={16} />
            {alertasActivas.length} alerta{alertasActivas.length > 1 ? 's' : ''} activa{alertasActivas.length > 1 ? 's' : ''}
          </div>
          {alertasActivas.map(a => (
            <p key={a.id} className="text-xs text-orange-600 ml-6">{a.mensaje}</p>
          ))}
        </div>
      )}

      {/* Gráfica */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">Historial de stock</h2>
        <ResponsiveContainer width="100%" height={200}>
          <LineChart data={chartData}>
            <XAxis dataKey="fecha" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 12 }} />
            <ReferenceLine y={producto.stockMinimo} stroke="#f97316" strokeDasharray="4 4"
              label={{ value: 'Mín.', fontSize: 10, fill: '#f97316' }} />
            <ReferenceLine y={producto.puntoPedido} stroke="#eab308" strokeDasharray="4 4"
              label={{ value: 'PP', fontSize: 10, fill: '#eab308' }} />
            <Line type="monotone" dataKey="stock" stroke="#1a6ebf" strokeWidth={2}
              dot={{ fill: '#1a6ebf', r: 4 }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
        <div className="flex gap-4 mt-3 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-orange-400 inline-block" /> Mínimo ({producto.stockMinimo})</span>
          <span className="flex items-center gap-1"><span className="w-4 h-0.5 bg-yellow-400 inline-block" /> Punto pedido ({producto.puntoPedido})</span>
        </div>
      </div>

      {/* Movimientos */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">Historial de movimientos</h2>
          <p className="text-xs text-gray-400 mt-0.5">{movimientos.length} movimientos registrados</p>
        </div>

        {movimientos.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            <Activity size={28} className="mx-auto mb-2 opacity-30" />
            <p>Sin movimientos registrados aún</p>
            <p className="text-xs mt-1">Los movimientos aparecerán después del primer Upload SAP</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Fecha</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Tipo</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Cantidad</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Stock antes</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Stock después</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Origen</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {movimientos.slice().sort((a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()).map(m => {
                const cfg = TIPO_CONFIG[m.tipo] ?? TIPO_CONFIG.ENTRADA;
                const Icon = cfg.icon;
                return (
                  <tr key={m.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3 text-gray-500 text-xs">
                      {new Date(m.fecha).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right font-medium text-gray-900">
                      {m.cantidad} {producto.unidadMedida}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-500">{m.cantidadAntes}</td>
                    <td className="px-6 py-3 text-right text-gray-700 font-medium">{m.cantidadDespues}</td>
                    <td className="px-6 py-3 text-xs text-gray-400">{m.origen}</td>
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