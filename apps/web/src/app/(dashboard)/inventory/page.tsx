'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Package, Search } from 'lucide-react';

interface Producto {
  id: string;
  codigoProducto: string;
  descripcion: string;
  stockActual: number;
  stockMinimo: number;
  puntoPedido: number;
  diasCobertura: number | null;
  criticidad: string;
  unidadMedida: string;
  categoria?: { nombre: string; color: string };
}

const criticidadColor: Record<string, string> = {
  CRITICO: 'bg-red-100 text-red-700',
  ALTO: 'bg-orange-100 text-orange-700',
  MEDIO: 'bg-yellow-100 text-yellow-700',
  BAJO: 'bg-green-100 text-green-700',
};

export default function InventoryPage() {
  const router = useRouter();
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [pendingSearch, setPendingSearch] = useState('');
  const [total, setTotal] = useState(0);
  const [filtroCriticidad, setFiltroCriticidad] = useState<'TODOS' | 'CRITICO' | 'ALTO' | 'MEDIO' | 'BAJO'>('TODOS');

  const productosFiltrados = productos.filter((p) => {
    const matchesSearch = p.descripcion.toLowerCase().includes(search.toLowerCase())
      || p.codigoProducto.toLowerCase().includes(search.toLowerCase());
    const matchesFilter = filtroCriticidad === 'TODOS' ? true : p.criticidad === filtroCriticidad;
    return matchesSearch && matchesFilter;
  });

  const stockCritico = productos.filter((p) => p.stockActual <= p.stockMinimo && ['CRITICO', 'ALTO'].includes(p.criticidad)).length;

  useEffect(() => {
    const timer = setTimeout(() => setSearch(pendingSearch.trim()), 240);
    return () => clearTimeout(timer);
  }, [pendingSearch]);

  useEffect(() => {
    fetchProductos();
  }, [search]);

  async function fetchProductos() {
    setLoading(true);
    try {
      const res = await api.products.list({ search, limit: 50, sortBy: 'codigoProducto', sortOrder: 'asc' });
      const responseData = res.data;
      const items = responseData?.data?.data ?? responseData?.data ?? responseData ?? [];
      const totalCount = responseData?.data?.meta?.total ?? responseData?.meta?.total ?? (Array.isArray(items) ? items.length : 0);
      setProductos(Array.isArray(items) ? items : []);
      setTotal(totalCount);
    } catch (error) {
      console.error(error);
      setProductos([]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-8">
      <div className="mb-6 grid gap-4 lg:grid-cols-[1fr_auto] lg:items-end">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">Inventario</h1>
          <p className="text-sm text-slate-500 mt-2">{total} productos registrados</p>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-sm">
          Listado optimizado y actualizado en tiempo real
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-[1fr_auto] items-end mb-6">
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Total</p>
            <p className="mt-3 text-3xl font-semibold text-slate-900">{total}</p>
            <p className="mt-2 text-sm text-slate-500">Productos registrados</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Bajo mínimo</p>
            <p className="mt-3 text-3xl font-semibold text-amber-700">{stockCritico}</p>
            <p className="mt-2 text-sm text-slate-500">Productos críticos</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">Mostrados</p>
            <p className="mt-3 text-3xl font-semibold text-emerald-700">{productosFiltrados.length}</p>
            <p className="mt-2 text-sm text-slate-500">Productos visibles</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {['TODOS', 'CRITICO', 'ALTO', 'MEDIO', 'BAJO'].map((tipo) => (
            <button key={tipo} onClick={() => setFiltroCriticidad(tipo as any)}
              className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                filtroCriticidad === tipo
                  ? 'bg-slate-900 text-white border-slate-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
              }`}>
              {tipo === 'TODOS' ? 'Todas' : tipo}
            </button>
          ))}
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por código o descripción..."
          value={pendingSearch}
          onChange={(e) => setPendingSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder:text-slate-400 shadow-sm transition focus:border-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-200"
        />
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Código</th>
              <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Descripción</th>
              <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Categoría</th>
              <th className="text-right px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Stock</th>
              <th className="text-right px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Mínimo</th>
              <th className="text-right px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Cobertura</th>
              <th className="text-center px-4 py-4 text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Criticidad</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(7)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-12 text-center text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No se encontraron productos</p>
                </td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id}
                  onClick={() => router.push(`/inventory/${p.id}`)}
                  className="transition-colors hover:bg-slate-50 cursor-pointer">
                  <td className="px-4 py-4 font-mono text-xs text-slate-500">
                    {p.codigoProducto}
                  </td>
                  <td className="px-4 py-4 text-sm text-slate-900 max-w-xs truncate">
                    {p.descripcion}
                  </td>
                  <td className="px-4 py-4">
                    {p.categoria ? (
                      <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                        {p.categoria.nombre}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-400">Sin categoría</span>
                    )}
                  </td>
                  <td className={`px-4 py-4 text-right font-semibold ${
                    p.stockActual <= 0 ? 'text-red-600' :
                    p.stockActual <= p.stockMinimo ? 'text-amber-600' : 'text-slate-900'
                  }`}>
                    {p.stockActual} {p.unidadMedida}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-500">
                    {p.stockMinimo} {p.unidadMedida}
                  </td>
                  <td className="px-4 py-4 text-right text-slate-500">
                    {p.diasCobertura != null ? `${p.diasCobertura}d` : '—'}
                  </td>
                  <td className="px-4 py-4 text-center">
                    <span className={`inline-flex items-center justify-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${criticidadColor[p.criticidad] ?? 'bg-slate-100 text-slate-700'}`}>
                      {p.criticidad}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}