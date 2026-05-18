'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { Package, AlertTriangle, Search } from 'lucide-react';

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
  _count?: { alertas: number };
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
  const [total, setTotal] = useState(0);

  useEffect(() => {
    fetchProductos();
  }, [search]);

  async function fetchProductos() {
    setLoading(true);
    try {
      const res = await api.products.list({ search, limit: 50 });
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inventario</h1>
          <p className="text-gray-500 text-sm mt-1">{total} productos registrados</p>
        </div>
      </div>

      <div className="relative mb-6">
        <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Buscar por código o descripción..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Descripción</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Categoría</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Stock</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Mínimo</th>
              <th className="text-right px-4 py-3 font-medium text-gray-500">Cobertura</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Criticidad</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Alertas</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(5)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-4 bg-gray-100 rounded animate-pulse"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : productos.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-gray-400">
                  <Package size={32} className="mx-auto mb-2 opacity-50" />
                  <p>No se encontraron productos</p>
                </td>
              </tr>
            ) : (
              productos.map((p) => (
                <tr key={p.id}
                  onClick={() => router.push(`/inventory/${p.id}`)}
                  className="hover:bg-gray-50 transition-colors cursor-pointer">
                  <td className="px-4 py-3 font-mono text-xs text-gray-600">
                    {p.codigoProducto}
                  </td>
                  <td className="px-4 py-3 text-gray-900 max-w-xs truncate">
                    {p.descripcion}
                  </td>
                  <td className="px-4 py-3">
                    {p.categoria && (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: p.categoria.color ?? '#6366f1' }}>
                        {p.categoria.nombre}
                      </span>
                    )}
                  </td>
                  <td className={`px-4 py-3 text-right font-medium ${
                    p.stockActual <= 0 ? 'text-red-600' :
                    p.stockActual <= p.stockMinimo ? 'text-orange-600' : 'text-gray-900'
                  }`}>
                    {p.stockActual} {p.unidadMedida}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {p.stockMinimo} {p.unidadMedida}
                  </td>
                  <td className="px-4 py-3 text-right text-gray-500">
                    {p.diasCobertura != null ? `${p.diasCobertura}d` : '—'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${criticidadColor[p.criticidad] ?? ''}`}>
                      {p.criticidad}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {(p._count?.alertas ?? 0) > 0 ? (
                      <span className="flex items-center justify-center gap-1 text-red-500">
                        <AlertTriangle size={14} />
                        {p._count?.alertas}
                      </span>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
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