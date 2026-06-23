'use client';

import { useState, useEffect } from 'react';
import { Save, Search, PackagePlus, ArrowUpCircle, ArrowDownCircle } from 'lucide-react';

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001/api/v1';

const CATEGORIAS = [
  { id: 'cmp7av41l0004ev20pyf63utu', nombre: 'EPP' },
  { id: 'cmp8z2ye50002evjoc0mvfi39', nombre: 'Uniformes' },
  { id: 'cmp8z2y1u0001evjoksk7daxb', nombre: 'Materiales Embalaje' },
  { id: 'cmp8z2xph0000evjocmchzy6s', nombre: 'Insumos Oficina' },
];

const CRITICIDADES = ['CRITICO', 'ALTO', 'MEDIO', 'BAJO'];

export default function IngresoManualPage() {
  const [tab, setTab] = useState<'producto' | 'movimiento'>('producto');
  const [productos, setProductos] = useState<any[]>([]);
  const [busqueda, setBusqueda] = useState('');
  const [loading, setLoading] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);

  const [formProducto, setFormProducto] = useState({
    codigoProducto: '',
    descripcion: '',
    categoriaId: 'cmp7av41l0004ev20pyf63utu',
    stockActual: 0,
    stockMinimo: 50,
    unidadMedida: 'UN',
    criticidad: 'ALTO',
    leadTimeDias: 21,
  });

  const [formMovimiento, setFormMovimiento] = useState({
    productoId: '',
    tipo: 'ENTRADA',
    cantidad: 0,
    observacion: '',
  });

  useEffect(() => {
    if (tab === 'movimiento') fetchProductos();
  }, [tab]);

  async function fetchProductos() {
    const token = localStorage.getItem('access_token');
    const res = await fetch(`${API}/products?limit=500`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const json = await res.json();
    const items = json?.data?.data ?? json?.data ?? [];
    setProductos(Array.isArray(items) ? items : []);
  }

  async function crearProducto() {
    setLoading(true);
    setMensaje(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch(`${API}/products`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formProducto),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message ?? 'Error al crear producto');
      }
      setMensaje({ tipo: 'ok', texto: `Producto "${formProducto.descripcion}" creado correctamente.` });
      setFormProducto({
        codigoProducto: '', descripcion: '',
        categoriaId: 'cmp7av41l0004ev20pyf63utu',
        stockActual: 0, stockMinimo: 50,
        unidadMedida: 'UN', criticidad: 'ALTO', leadTimeDias: 21,
      });
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message ?? 'Error al crear el producto.' });
    }
    setLoading(false);
  }

  async function registrarMovimiento() {
    setLoading(true);
    setMensaje(null);
    try {
      const token = localStorage.getItem('access_token');
      const producto = productos.find(p => p.id === formMovimiento.productoId);
      if (!producto) throw new Error('Selecciona un producto');

      const stockAnterior = producto.stockActual;
      const cantidad = Number(formMovimiento.cantidad);
      const stockNuevo = formMovimiento.tipo === 'ENTRADA'
        ? stockAnterior + cantidad
        : stockAnterior - cantidad;

      if (stockNuevo < 0) throw new Error('Stock insuficiente para la salida');

      const res = await fetch(`${API}/products/${producto.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ stockActual: stockNuevo }),
      });

      if (!res.ok) throw new Error('Error al actualizar stock');

      setMensaje({ tipo: 'ok', texto: `Movimiento registrado. Stock de "${producto.descripcion}" actualizado a ${stockNuevo} ${producto.unidadMedida}.` });
      setFormMovimiento({ productoId: '', tipo: 'ENTRADA', cantidad: 0, observacion: '' });
      setBusqueda('');
      fetchProductos();
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message ?? 'Error al registrar movimiento.' });
    }
    setLoading(false);
  }

  const productosFiltrados = productos.filter(p =>
    p.descripcion?.toLowerCase().includes(busqueda.toLowerCase()) ||
    p.codigoProducto?.toLowerCase().includes(busqueda.toLowerCase())
  );

  return (
    <div className="p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ingreso Manual</h1>
        <p className="text-gray-500 text-sm mt-1">Agrega productos fuera de SAP o registra movimientos manuales</p>
      </div>

      <div className="flex gap-2 border-b border-gray-200">
        <button onClick={() => setTab('producto')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'producto' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <PackagePlus size={16} />
          Nuevo Producto
        </button>
        <button onClick={() => setTab('movimiento')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
            tab === 'movimiento' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-500 hover:text-gray-700'
          }`}>
          <ArrowUpCircle size={16} />
          Movimiento Manual
        </button>
      </div>

      {mensaje && (
        <div className={`px-4 py-3 rounded-lg text-sm font-medium ${
          mensaje.tipo === 'ok'
            ? 'bg-green-50 text-green-700 border border-green-200'
            : 'bg-red-50 text-red-700 border border-red-200'
        }`}>
          {mensaje.texto}
        </div>
      )}

      {tab === 'producto' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-800">Datos del producto</h2>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Código</label>
              <input value={formProducto.codigoProducto}
                onChange={e => setFormProducto({ ...formProducto, codigoProducto: e.target.value })}
                placeholder="Ej: MS09010001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Unidad de medida</label>
              <input value={formProducto.unidadMedida}
                onChange={e => setFormProducto({ ...formProducto, unidadMedida: e.target.value })}
                placeholder="UN, KG, MT..."
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Descripción</label>
            <input value={formProducto.descripcion}
              onChange={e => setFormProducto({ ...formProducto, descripcion: e.target.value })}
              placeholder="Nombre completo del producto"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Categoría</label>
              <select value={formProducto.categoriaId}
                onChange={e => setFormProducto({ ...formProducto, categoriaId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.nombre}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Criticidad</label>
              <select value={formProducto.criticidad}
                onChange={e => setFormProducto({ ...formProducto, criticidad: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {CRITICIDADES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Stock actual</label>
              <input type="number" value={formProducto.stockActual}
                onChange={e => setFormProducto({ ...formProducto, stockActual: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Stock mínimo</label>
              <input type="number" value={formProducto.stockMinimo}
                onChange={e => setFormProducto({ ...formProducto, stockMinimo: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Lead Time (días)</label>
              <input type="number" value={formProducto.leadTimeDias}
                onChange={e => setFormProducto({ ...formProducto, leadTimeDias: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <button onClick={crearProducto}
            disabled={loading || !formProducto.codigoProducto || !formProducto.descripcion}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            <Save size={16} />
            {loading ? 'Guardando...' : 'Crear Producto'}
          </button>
        </div>
      )}

      {tab === 'movimiento' && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-800">Registrar movimiento</h2>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Buscar producto</label>
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input value={busqueda}
                onChange={e => { setBusqueda(e.target.value); setFormMovimiento({ ...formMovimiento, productoId: '' }); }}
                placeholder="Buscar por código o descripción..."
                className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            {busqueda && !formMovimiento.productoId && (
              <div className="mt-1 border border-gray-200 rounded-lg overflow-hidden max-h-48 overflow-y-auto shadow-sm">
                {productosFiltrados.slice(0, 8).map(p => (
                  <button key={p.id}
                    onClick={() => { setFormMovimiento({ ...formMovimiento, productoId: p.id }); setBusqueda(p.descripcion); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <span className="font-medium text-gray-900">{p.descripcion}</span>
                    <span className="text-gray-400 ml-2 text-xs">{p.codigoProducto}</span>
                    <span className="text-blue-600 ml-2 text-xs font-medium">{p.stockActual} {p.unidadMedida}</span>
                  </button>
                ))}
                {productosFiltrados.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">No se encontraron productos</p>
                )}
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Tipo de movimiento</label>
              <div className="flex gap-2">
                <button onClick={() => setFormMovimiento({ ...formMovimiento, tipo: 'ENTRADA' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formMovimiento.tipo === 'ENTRADA'
                      ? 'bg-green-50 border-green-300 text-green-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  <ArrowUpCircle size={16} /> Entrada
                </button>
                <button onClick={() => setFormMovimiento({ ...formMovimiento, tipo: 'SALIDA' })}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium border transition-colors ${
                    formMovimiento.tipo === 'SALIDA'
                      ? 'bg-red-50 border-red-300 text-red-700'
                      : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                  }`}>
                  <ArrowDownCircle size={16} /> Salida
                </button>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Cantidad</label>
              <input type="number" min={1} value={formMovimiento.cantidad}
                onChange={e => setFormMovimiento({ ...formMovimiento, cantidad: Number(e.target.value) })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Observación (opcional)</label>
            <input value={formMovimiento.observacion}
              onChange={e => setFormMovimiento({ ...formMovimiento, observacion: e.target.value })}
              placeholder="Motivo del movimiento..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <button onClick={registrarMovimiento}
            disabled={loading || !formMovimiento.productoId || !formMovimiento.cantidad}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            <Save size={16} />
            {loading ? 'Registrando...' : 'Registrar Movimiento'}
          </button>
        </div>
      )}
    </div>
  );
}
