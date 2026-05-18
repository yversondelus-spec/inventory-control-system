'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { AlertTriangle, Package, TrendingDown, Download, BarChart2 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';

interface Alerta {
  id: string;
  tipo: string;
  prioridad: string;
  mensaje: string;
  valorActual: number | null;
  valorUmbral: number | null;
  producto: {
    codigoProducto: string;
    descripcion: string;
    stockActual: number;
    unidadMedida: string;
    categoria?: { nombre: string; color: string };
  };
}

interface Producto {
  id: string;
  codigoProducto: string;
  descripcion: string;
  stockActual: number;
  stockMinimo: number;
  unidadMedida: string;
  criticidad: string;
  categoria?: { nombre: string; color: string };
}

interface Movimiento {
  id: string;
  tipo: string;
  cantidad: number;
  cantidadAntes: number;
  cantidadDespues: number;
  fecha: string;
  origen: string;
  referencia?: string;
  producto: {
    codigoProducto: string;
    descripcion: string;
    unidadMedida: string;
    categoria?: { nombre: string; color: string };
  };
}

const TABS = [
  { id: 'alertas',     label: 'Reporte de Alertas',    icon: AlertTriangle },
  { id: 'stock',       label: 'Stock por Categoría',    icon: Package },
  { id: 'movimientos', label: 'Reporte de Movimientos', icon: TrendingDown },
];

const COLORS = ['#6366f1', '#f97316', '#22c55e', '#eab308', '#ef4444', '#8b5cf6'];

export default function ReportesPage() {
  const [tab, setTab] = useState('alertas');
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [movimientos, setMovimientos] = useState<Movimiento[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, [tab]);

  async function fetchData() {
    setLoading(true);
    try {
      if (tab === 'alertas') {
        const res = await api.alerts.list({ estado: 'ACTIVA', limit: 200 });
        const items = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
        setAlertas(Array.isArray(items) ? items : []);
      } else if (tab === 'stock') {
        const res = await api.products.list({ limit: 211 });
        const items = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
        setProductos(Array.isArray(items) ? items : []);
      } else if (tab === 'movimientos') {
        const token = localStorage.getItem('accessToken');
        const res = await fetch('http://localhost:3001/api/v1/movements?limit=200', {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        const items = json?.data?.data ?? json?.data ?? [];
        setMovimientos(Array.isArray(items) ? items : []);
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
  }

  const alertasPorCategoria = alertas.reduce((acc, a) => {
    const cat = a.producto?.categoria?.nombre ?? 'Sin categoría';
    acc[cat] = (acc[cat] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const barDataAlertas = Object.entries(alertasPorCategoria).map(([name, value]) => ({ name, value }));

  const stockPorCategoria = productos.reduce((acc, p) => {
    const cat = p.categoria?.nombre ?? 'Sin categoría';
    if (!acc[cat]) acc[cat] = { nombre: cat, color: p.categoria?.color ?? '#6366f1', total: 0, bajo: 0, productos: 0 };
    acc[cat].total += p.stockActual;
    acc[cat].productos += 1;
    if (p.stockActual <= p.stockMinimo) acc[cat].bajo += 1;
    return acc;
  }, {} as Record<string, { nombre: string; color: string; total: number; bajo: number; productos: number }>);

  const pieData = Object.values(stockPorCategoria).map(c => ({ name: c.nombre, value: c.productos }));

  function exportCSV() {
    if (tab === 'alertas') {
      const rows = [
        ['Código', 'Descripción', 'Categoría', 'Stock Actual', 'Umbral', 'Prioridad', 'Tipo'],
        ...alertas.map(a => [a.producto?.codigoProducto, a.producto?.descripcion, a.producto?.categoria?.nombre ?? '', a.producto?.stockActual, a.valorUmbral, a.prioridad, a.tipo]),
      ];
      downloadCSV(rows, 'reporte-alertas.csv');
    } else if (tab === 'stock') {
      const rows = [
        ['Código', 'Descripción', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Unidad', 'Criticidad'],
        ...productos.map(p => [p.codigoProducto, p.descripcion, p.categoria?.nombre ?? '', p.stockActual, p.stockMinimo, p.unidadMedida, p.criticidad]),
      ];
      downloadCSV(rows, 'reporte-stock.csv');
    } else if (tab === 'movimientos') {
      const rows = [
        ['Fecha', 'Código', 'Producto', 'Categoría', 'Tipo', 'Antes', 'Después', 'Diferencia'],
        ...movimientos.map(m => [
          new Date(m.fecha).toLocaleDateString('es-CL'),
          m.producto?.codigoProducto, m.producto?.descripcion,
          m.producto?.categoria?.nombre ?? '',
          m.tipo, m.cantidadAntes, m.cantidadDespues,
          m.tipo === 'AJUSTE_POSITIVO' ? `+${m.cantidad}` : `-${m.cantidad}`,
        ]),
      ];
      downloadCSV(rows, 'reporte-movimientos.csv');
    }
  }

  function downloadCSV(rows: (string | number | null | undefined)[][], filename: string) {
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes</h1>
          <p className="text-gray-500 text-sm mt-1">Análisis del inventario de Aerosan</p>
        </div>
        <button onClick={exportCSV}
          className="flex items-center gap-2 px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-colors">
          <Download size={16} />
          Exportar CSV
        </button>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => {
          const Icon = t.icon;
          return (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                tab === t.id ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}>
              <Icon size={16} />
              {t.label}
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="animate-pulse space-y-4">
          {[...Array(3)].map((_, i) => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* REPORTE ALERTAS */}
          {tab === 'alertas' && (
            <div className="space-y-6">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-white rounded-xl border border-gray-200 p-5">
                  <p className="text-sm text-gray-500">Total alertas</p>
                  <p className="text-3xl font-bold text-gray-900 mt-1">{alertas.length}</p>
                </div>
                <div className="bg-orange-50 rounded-xl border border-orange-200 p-5">
                  <p className="text-sm text-orange-600">Stock bajo mínimo</p>
                  <p className="text-3xl font-bold text-orange-700 mt-1">{alertas.filter(a => a.tipo === 'STOCK_BAJO').length}</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-200 p-5">
                  <p className="text-sm text-red-600">Reposición urgente</p>
                  <p className="text-3xl font-bold text-red-700 mt-1">{alertas.filter(a => a.tipo === 'REPOSICION_URGENTE').length}</p>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h2 className="text-base font-semibold text-gray-800 mb-4">Alertas por categoría</h2>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={barDataAlertas} barSize={40}>
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6b7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} cursor={{ fill: '#f9fafb' }} />
                    <Bar dataKey="value" name="Alertas" radius={[6, 6, 0, 0]}>
                      {barDataAlertas.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Código</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Producto</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Categoría</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500">Stock</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500">Mínimo</th>
                      <th className="text-center px-6 py-3 font-medium text-gray-500">Tipo</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {alertas.map(a => (
                      <tr key={a.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-mono text-xs text-gray-500">{a.producto?.codigoProducto}</td>
                        <td className="px-6 py-3 text-gray-900 max-w-xs truncate">{a.producto?.descripcion}</td>
                        <td className="px-6 py-3">
                          {a.producto?.categoria && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: a.producto.categoria.color ?? '#6366f1' }}>
                              {a.producto.categoria.nombre}
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-3 text-right font-medium text-orange-600">{a.producto?.stockActual} {a.producto?.unidadMedida}</td>
                        <td className="px-6 py-3 text-right text-gray-500">{a.valorUmbral}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${a.tipo === 'REPOSICION_URGENTE' ? 'bg-red-50 text-red-600' : 'bg-orange-50 text-orange-600'}`}>
                            {a.tipo === 'REPOSICION_URGENTE' ? 'Reposición' : 'Stock Bajo'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORTE STOCK */}
          {tab === 'stock' && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 gap-6">
                <div className="bg-white rounded-xl border border-gray-200 p-6">
                  <h2 className="text-base font-semibold text-gray-800 mb-4">Productos por categoría</h2>
                  <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                      <Pie data={pieData} cx="50%" cy="50%" outerRadius={80} dataKey="value" paddingAngle={3}>
                        {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip contentStyle={{ borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 13 }} />
                      <Legend iconType="circle" iconSize={10} formatter={(v) => <span style={{ fontSize: 13, color: '#374151' }}>{v}</span>} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="space-y-3">
                  {Object.values(stockPorCategoria).map((cat) => (
                    <div key={cat.nombre} className="bg-white rounded-xl border border-gray-200 p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: cat.color }}>{cat.nombre}</span>
                        <span className="text-xs text-gray-400">{cat.productos} productos</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">Stock total: <span className="font-medium text-gray-800">{cat.total.toLocaleString('es-CL')}</span></span>
                        {cat.bajo > 0 && <span className="text-orange-600 font-medium">{cat.bajo} bajo mínimo</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Código</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Descripción</th>
                      <th className="text-left px-6 py-3 font-medium text-gray-500">Categoría</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500">Stock</th>
                      <th className="text-right px-6 py-3 font-medium text-gray-500">Mínimo</th>
                      <th className="text-center px-6 py-3 font-medium text-gray-500">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productos.map(p => (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-mono text-xs text-gray-500">{p.codigoProducto}</td>
                        <td className="px-6 py-3 text-gray-900 max-w-xs truncate">{p.descripcion}</td>
                        <td className="px-6 py-3">
                          {p.categoria && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: p.categoria.color ?? '#6366f1' }}>
                              {p.categoria.nombre}
                            </span>
                          )}
                        </td>
                        <td className={`px-6 py-3 text-right font-medium ${p.stockActual <= p.stockMinimo ? 'text-orange-600' : 'text-gray-900'}`}>
                          {p.stockActual} {p.unidadMedida}
                        </td>
                        <td className="px-6 py-3 text-right text-gray-500">{p.stockMinimo}</td>
                        <td className="px-6 py-3 text-center">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${p.stockActual <= 0 ? 'bg-red-50 text-red-600' : p.stockActual <= p.stockMinimo ? 'bg-orange-50 text-orange-600' : 'bg-green-50 text-green-600'}`}>
                            {p.stockActual <= 0 ? 'Quiebre' : p.stockActual <= p.stockMinimo ? 'Bajo' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* REPORTE MOVIMIENTOS */}
          {tab === 'movimientos' && (
            <div className="space-y-4">
              {movimientos.length === 0 ? (
                <div className="bg-white rounded-xl border border-gray-200 p-12 text-center text-gray-400">
                  <BarChart2 size={40} className="mx-auto mb-3 opacity-30" />
                  <p className="text-base font-medium">Sin movimientos registrados</p>
                  <p className="text-sm mt-1">Sube un archivo SAP para generar movimientos</p>
                </div>
              ) : (
                <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-700">{movimientos.length} movimientos registrados</p>
                  </div>
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Fecha</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Producto</th>
                        <th className="text-left px-6 py-3 font-medium text-gray-500">Categoría</th>
                        <th className="text-center px-6 py-3 font-medium text-gray-500">Tipo</th>
                        <th className="text-right px-6 py-3 font-medium text-gray-500">Antes</th>
                        <th className="text-right px-6 py-3 font-medium text-gray-500">Después</th>
                        <th className="text-right px-6 py-3 font-medium text-gray-500">Diferencia</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {movimientos.map((m) => (
                        <tr key={m.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 text-gray-500 text-xs">{new Date(m.fecha).toLocaleDateString('es-CL')}</td>
                          <td className="px-6 py-3 max-w-xs">
                            <p className="font-medium text-gray-900 truncate">{m.producto?.descripcion}</p>
                            <p className="text-xs text-gray-400">{m.producto?.codigoProducto}</p>
                          </td>
                          <td className="px-6 py-3">
                            {m.producto?.categoria && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white" style={{ backgroundColor: m.producto.categoria.color ?? '#6366f1' }}>
                                {m.producto.categoria.nombre}
                              </span>
                            )}
                          </td>
                          <td className="px-6 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.tipo === 'AJUSTE_POSITIVO' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'}`}>
                              {m.tipo === 'AJUSTE_POSITIVO' ? '▲ Entrada' : '▼ Salida'}
                            </span>
                          </td>
                          <td className="px-6 py-3 text-right text-gray-500">{m.cantidadAntes}</td>
                          <td className="px-6 py-3 text-right text-gray-500">{m.cantidadDespues}</td>
                          <td className={`px-6 py-3 text-right font-medium ${m.tipo === 'AJUSTE_POSITIVO' ? 'text-green-600' : 'text-red-600'}`}>
                            {m.tipo === 'AJUSTE_POSITIVO' ? '+' : '-'}{m.cantidad}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}