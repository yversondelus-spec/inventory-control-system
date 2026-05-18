'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { Save, Search, Settings } from 'lucide-react';

interface Producto {
  id: string;
  codigoProducto: string;
  descripcion: string;
  stockMinimo: number;
  puntoPedido: number;
  leadTimeDias: number;
  stockSeguridad: number;
  criticidad: string;
  categoria?: { nombre: string; color: string };
}

const CRITICIDAD_OPTIONS = ['BAJO', 'MEDIO', 'ALTO', 'CRITICO'];

export default function ConfiguracionPage() {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [editando, setEditando] = useState<Record<string, Partial<Producto>>>({});
  const [guardando, setGuardando] = useState<string | null>(null);
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());

  useEffect(() => { fetchProductos(); }, []);

  async function fetchProductos() {
    setLoading(true);
    try {
      const res = await api.products.list({ limit: 211 });
      const items = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      setProductos(Array.isArray(items) ? items : []);
    } catch { setProductos([]); }
    finally { setLoading(false); }
  }

  function getVal<K extends keyof Producto>(p: Producto, key: K): Producto[K] {
    return (editando[p.id]?.[key] ?? p[key]) as Producto[K];
  }

  function handleChange(id: string, field: keyof Producto, value: string | number) {
    setEditando(prev => ({
      ...prev,
      [id]: { ...prev[id], [field]: value },
    }));
  }

  async function guardar(producto: Producto) {
    const cambios = editando[producto.id];
    if (!cambios || Object.keys(cambios).length === 0) return;

    setGuardando(producto.id);
    try {
      await api.products.update(producto.id, cambios);
      setProductos(prev => prev.map(p => p.id === producto.id ? { ...p, ...cambios } : p));
      setEditando(prev => { const n = { ...prev }; delete n[producto.id]; return n; });
      setSavedIds(prev => new Set([...prev, producto.id]));
      setTimeout(() => setSavedIds(prev => { const n = new Set(prev); n.delete(producto.id); return n; }), 2000);
    } catch { alert('Error al guardar'); }
    finally { setGuardando(null); }
  }

  const filtrados = productos.filter(p =>
    p.codigoProducto.toLowerCase().includes(search.toLowerCase()) ||
    p.descripcion.toLowerCase().includes(search.toLowerCase())
  );

  const tienecambios = (id: string) => editando[id] && Object.keys(editando[id]).length > 0;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
          <p className="text-gray-500 text-sm mt-1">Edita mínimos, puntos de pedido y lead times por producto</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-400">
          <Settings size={14} />
          {productos.length} productos configurables
        </div>
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-sm text-blue-700">
        <strong>Tip:</strong> Edita los valores directamente en la tabla y haz click en <strong>Guardar</strong> por fila.
        Los cambios se aplican inmediatamente y el motor de alertas se actualizará en el próximo Upload SAP.
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input type="text" placeholder="Buscar por código o descripción..."
          value={search} onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900" />
      </div>

      {/* Tabla */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Código</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Descripción</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Categoría</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Criticidad</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Stock Mín.</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Punto Pedido</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Lead Time (días)</th>
              <th className="text-center px-4 py-3 font-medium text-gray-500">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {loading ? (
              [...Array(8)].map((_, i) => (
                <tr key={i}>
                  {[...Array(8)].map((_, j) => (
                    <td key={j} className="px-4 py-3">
                      <div className="h-8 bg-gray-100 rounded animate-pulse" />
                    </td>
                  ))}
                </tr>
              ))
            ) : filtrados.map(p => (
              <tr key={p.id} className={`transition-colors ${tienecambios(p.id) ? 'bg-yellow-50' : 'hover:bg-gray-50'}`}>
                <td className="px-4 py-2 font-mono text-xs text-gray-500">{p.codigoProducto}</td>
                <td className="px-4 py-2 text-gray-900 max-w-xs">
                  <span className="truncate block">{p.descripcion}</span>
                </td>
                <td className="px-4 py-2">
                  {p.categoria && (
                    <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                      style={{ backgroundColor: p.categoria.color ?? '#6366f1' }}>
                      {p.categoria.nombre}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2 text-center">
                  <select
                    value={getVal(p, 'criticidad') as string}
                    onChange={e => handleChange(p.id, 'criticidad', e.target.value)}
                    className="text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400">
                    {CRITICIDAD_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="number" min="0"
                    value={getVal(p, 'stockMinimo') as number}
                    onChange={e => handleChange(p.id, 'stockMinimo', parseInt(e.target.value) || 0)}
                    className="w-20 text-center text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="number" min="0"
                    value={getVal(p, 'puntoPedido') as number}
                    onChange={e => handleChange(p.id, 'puntoPedido', parseInt(e.target.value) || 0)}
                    className="w-20 text-center text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </td>
                <td className="px-4 py-2 text-center">
                  <input type="number" min="1"
                    value={getVal(p, 'leadTimeDias') as number}
                    onChange={e => handleChange(p.id, 'leadTimeDias', parseInt(e.target.value) || 1)}
                    className="w-20 text-center text-xs border border-gray-200 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-gray-400" />
                </td>
                <td className="px-4 py-2 text-center">
                  {savedIds.has(p.id) ? (
                    <span className="text-xs text-green-600 font-medium">✓ Guardado</span>
                  ) : (
                    <button onClick={() => guardar(p)}
                      disabled={!tienecambios(p.id) || guardando === p.id}
                      className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mx-auto
                        ${tienecambios(p.id)
                          ? 'bg-gray-900 text-white hover:bg-gray-700'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'}`}>
                      <Save size={12} />
                      {guardando === p.id ? 'Guardando...' : 'Guardar'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}