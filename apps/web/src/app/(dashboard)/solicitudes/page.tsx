'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ClipboardList, CheckCircle, Clock, Send, XCircle, RefreshCw, Zap } from 'lucide-react';

interface Solicitud {
  id: string;
  cantidad: number;
  estado: string;
  prioridad: string;
  notas: string | null;
  createdAt: string;
  producto: {
    codigoProducto: string;
    descripcion: string;
    stockActual: number;
    stockMinimo: number;
    unidadMedida: string;
    criticidad: string;
    categoria?: { nombre: string; color: string };
  };
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDIENTE:  { label: 'Pendiente',  color: 'text-yellow-700 bg-yellow-50 border-yellow-200', icon: Clock },
  ENVIADA:    { label: 'Enviada',    color: 'text-blue-700 bg-blue-50 border-blue-200',       icon: Send },
  EN_PROCESO: { label: 'En proceso', color: 'text-purple-700 bg-purple-50 border-purple-200', icon: RefreshCw },
  COMPLETADA: { label: 'Completada', color: 'text-green-700 bg-green-50 border-green-200',    icon: CheckCircle },
  CANCELADA:  { label: 'Cancelada',  color: 'text-red-700 bg-red-50 border-red-200',          icon: XCircle },
};

const ESTADOS_SIGUIENTES: Record<string, string[]> = {
  PENDIENTE:  ['ENVIADA', 'CANCELADA'],
  ENVIADA:    ['EN_PROCESO', 'CANCELADA'],
  EN_PROCESO: ['COMPLETADA', 'CANCELADA'],
  COMPLETADA: [],
  CANCELADA:  [],
};

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [summary, setSummary] = useState({ pendientes: 0, enviadas: 0, enProceso: 0, completadas: 0 });
  const [loading, setLoading] = useState(true);
  const [generando, setGenerando] = useState(false);
  const [filtro, setFiltro] = useState('TODAS');
  const [procesando, setProcesando] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [solRes, sumRes] = await Promise.all([
        apiClient.get('/solicitudes?limit=200'),
        apiClient.get('/solicitudes/summary'),
      ]);
      const solData = solRes.data?.data ?? solRes.data;
      const items = solData?.data ?? solData ?? [];
      setSolicitudes(Array.isArray(items) ? items : []);
      const sum = sumRes.data?.data ?? sumRes.data;
      setSummary(sum ?? { pendientes: 0, enviadas: 0, enProceso: 0, completadas: 0 });
    } catch {
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }

  async function generarDesdeAlertas() {
    setGenerando(true);
    try {
      const res = await apiClient.post('/solicitudes/generar-desde-alertas');
      const { creadas } = res.data?.data ?? res.data;
      alert(`✅ ${creadas} solicitudes generadas desde alertas activas`);
      await fetchData();
    } catch {
      alert('Error al generar solicitudes');
    } finally {
      setGenerando(false);
    }
  }

  async function cambiarEstado(id: string, estado: string) {
    setProcesando(id);
    try {
      await apiClient.put(`/solicitudes/${id}/estado`, { estado });
      await fetchData();
    } finally {
      setProcesando(null);
    }
  }

  const filtradas = filtro === 'TODAS' ? solicitudes : solicitudes.filter(s => s.estado === filtro);

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Reposición</h1>
          <p className="text-gray-500 text-sm mt-1">Gestión de órdenes de reposición de stock</p>
        </div>
        <button onClick={generarDesdeAlertas} disabled={generando}
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-50"
          style={{ backgroundColor: '#1a6ebf' }}>
          <Zap size={16} />
          {generando ? 'Generando...' : 'Generar desde alertas'}
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pendientes',  value: summary.pendientes,  color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'Enviadas',    value: summary.enviadas,    color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
          { label: 'En proceso',  value: summary.enProceso,   color: 'text-purple-600', bg: 'bg-purple-50 border-purple-200' },
          { label: 'Completadas', value: summary.completadas, color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border p-4 ${k.bg}`}>
            <p className="text-xs font-medium text-gray-500">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-3 border-b border-gray-100 flex gap-2 flex-wrap">
          {['TODAS', 'PENDIENTE', 'ENVIADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'].map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filtro === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}>
              {f === 'TODAS' ? `Todas (${solicitudes.length})` : ESTADO_CONFIG[f]?.label}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay solicitudes</p>
            <p className="text-xs mt-1">Haz click en "Generar desde alertas" para crear solicitudes automáticamente</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Producto</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Categoría</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Stock actual</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Cantidad solicitada</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Prioridad</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Acción</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtradas.map(s => {
                const cfg = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.PENDIENTE;
                const Icon = cfg.icon;
                const siguientes = ESTADOS_SIGUIENTES[s.estado] ?? [];
                return (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900 truncate max-w-xs">{s.producto?.descripcion}</p>
                      <p className="text-xs text-gray-400 font-mono">{s.producto?.codigoProducto}</p>
                    </td>
                    <td className="px-6 py-3">
                      {s.producto?.categoria && (
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                          style={{ backgroundColor: s.producto.categoria.color ?? '#6366f1' }}>
                          {s.producto.categoria.nombre}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-right text-orange-600 font-medium">
                      {s.producto?.stockActual} {s.producto?.unidadMedida}
                    </td>
                    <td className="px-6 py-3 text-right font-bold text-gray-900">
                      {s.cantidad} {s.producto?.unidadMedida}
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                        s.prioridad === 'URGENTE'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-gray-50 text-gray-600 border-gray-200'
                      }`}>
                        {s.prioridad}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                        <Icon size={11} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      {siguientes.length > 0 && (
                        <div className="flex gap-1 justify-center">
                          {siguientes.map(sig => (
                            <button key={sig} onClick={() => cambiarEstado(s.id, sig)}
                              disabled={procesando === s.id}
                              className={`px-2 py-1 rounded text-xs font-medium transition-colors disabled:opacity-50 ${
                                sig === 'CANCELADA'
                                  ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                  : 'bg-gray-900 text-white hover:bg-gray-700'
                              }`}>
                              {ESTADO_CONFIG[sig]?.label}
                            </button>
                          ))}
                        </div>
                      )}
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