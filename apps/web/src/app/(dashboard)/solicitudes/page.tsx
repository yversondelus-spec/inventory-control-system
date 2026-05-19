'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ClipboardList, CheckCircle, Clock, XCircle, RefreshCw, FileText, Plus, Minus, X, ChevronDown, ChevronUp } from 'lucide-react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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

interface Solicitud {
  id: string;
  grupoId: string;
  cantidad: number;
  estado: string;
  prioridad: string;
  notas: string | null;
  motivoRechazo: string | null;
  createdAt: string;
  producto: Producto;
}

interface GrupoSolicitud {
  grupoId: string;
  estado: string;
  prioridad: string;
  createdAt: string;
  items: Solicitud[];
  notas?: string;
}

interface ProductoSeleccionado extends Producto {
  cantidadSolicitada: number;
  prioridad: 'URGENTE' | 'NORMAL';
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; bg: string; icon: React.ElementType }> = {
  PENDIENTE:         { label: 'Pendiente',           color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', icon: Clock },
  EN_PROCESO_COMPRA: { label: 'En proceso de compra', color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',   icon: RefreshCw },
  COMPLETADA:        { label: 'Completada',           color: 'text-green-700',  bg: 'bg-green-50 border-green-200',  icon: CheckCircle },
  RECHAZADA:         { label: 'Rechazada',            color: 'text-red-700',    bg: 'bg-red-50 border-red-200',      icon: XCircle },
};

const ESTADOS_SIGUIENTES: Record<string, string[]> = {
  PENDIENTE:         ['EN_PROCESO_COMPRA', 'RECHAZADA'],
  EN_PROCESO_COMPRA: ['COMPLETADA', 'RECHAZADA'],
  COMPLETADA:        [],
  RECHAZADA:         [],
};

function agruparSolicitudes(solicitudes: Solicitud[]): GrupoSolicitud[] {
  const grupos: Record<string, GrupoSolicitud> = {};
  solicitudes.forEach(s => {
    const gid = s.grupoId || s.id;
    if (!grupos[gid]) {
      grupos[gid] = {
        grupoId: gid,
        estado: s.estado,
        prioridad: s.prioridad,
        createdAt: s.createdAt,
        notas: s.notas ?? undefined,
        items: [],
      };
    }
    grupos[gid].items.push(s);
    if (s.prioridad === 'URGENTE') grupos[gid].prioridad = 'URGENTE';
  });
  return Object.values(grupos).sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function generarNroSolicitud(index: number, fecha: string) {
  const d = new Date(fecha);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const num = String(index + 1).padStart(6, '0');
  return `SOL-${year}${month}-${num}`;
}

export default function SolicitudesPage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [summary, setSummary] = useState({ pendientes: 0, enProcesoCompra: 0, completadas: 0, rechazadas: 0 });
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [seleccionados, setSeleccionados] = useState<Record<string, ProductoSeleccionado>>({});
  const [filtroNivel, setFiltroNivel] = useState<'TODOS' | 'CRITICO' | 'ALTO'>('TODOS');
  const [filtroHistorial, setFiltroHistorial] = useState('TODOS');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [notas, setNotas] = useState('');
  const [gruposExpandidos, setGruposExpandidos] = useState<Record<string, boolean>>({});
  const [motivoRechazo, setMotivoRechazo] = useState('');
  const [rechazandoGrupo, setRechazandoGrupo] = useState<string | null>(null);

  useEffect(() => { fetchData(); }, []);

  async function fetchData() {
    setLoading(true);
    try {
      const [solRes, sumRes, prodRes] = await Promise.all([
        apiClient.get('/solicitudes?limit=500'),
        apiClient.get('/solicitudes/summary'),
        apiClient.get('/products?limit=500'),
      ]);
      const items = solRes.data?.data?.data ?? solRes.data?.data ?? [];
      setSolicitudes(Array.isArray(items) ? items : []);
      setSummary(sumRes.data?.data ?? { pendientes: 0, enProcesoCompra: 0, completadas: 0, rechazadas: 0 });
      const prods = prodRes.data?.data?.data ?? prodRes.data?.data ?? [];
      const criticos = Array.isArray(prods)
        ? prods.filter((p: Producto) =>
            ['CRITICO', 'ALTO'].includes(p.criticidad) && p.stockActual < p.stockMinimo
          ).sort((a: Producto, b: Producto) => a.stockActual - b.stockActual)
        : [];
      setProductos(criticos);
    } catch {
      setSolicitudes([]);
    } finally {
      setLoading(false);
    }
  }

  function toggleSeleccion(producto: Producto) {
    setSeleccionados(prev => {
      if (prev[producto.id]) {
        const next = { ...prev };
        delete next[producto.id];
        return next;
      }
      return {
        ...prev,
        [producto.id]: {
          ...producto,
          cantidadSolicitada: Math.max(producto.stockMinimo - producto.stockActual, 1),
          prioridad: producto.criticidad === 'CRITICO' ? 'URGENTE' : 'NORMAL',
        },
      };
    });
  }

  function updateCantidad(id: string, delta: number) {
    setSeleccionados(prev => ({
      ...prev,
      [id]: { ...prev[id], cantidadSolicitada: Math.max(1, prev[id].cantidadSolicitada + delta) },
    }));
  }

  function updatePrioridad(id: string, prioridad: 'URGENTE' | 'NORMAL') {
    setSeleccionados(prev => ({ ...prev, [id]: { ...prev[id], prioridad } }));
  }

  async function generarSolicitudes() {
    const items = Object.values(seleccionados);
    if (items.length === 0) {
      alert('⚠️ Selecciona al menos un producto.');
      return;
    }
    setProcesando('generar');
    try {
      await apiClient.post('/solicitudes/grupo', {
        items: items.map(item => ({
          productoId: item.id,
          cantidad: item.cantidadSolicitada,
          prioridad: item.prioridad,
          notas,
        })),
      });
      setSeleccionados({});
      setNotas('');
      setModalAbierto(false);
      await fetchData();
      alert(`✅ Solicitud generada con ${items.length} producto(s).`);
    } catch {
      alert('Error al generar solicitud');
    } finally {
      setProcesando(null);
    }
  }

  async function cambiarEstadoGrupo(grupoId: string, estado: string, motivo?: string) {
    setProcesando(grupoId);
    try {
      await apiClient.put(`/solicitudes/grupo/${grupoId}/estado`, {
        estado,
        motivoRechazo: motivo,
      });
      setRechazandoGrupo(null);
      setMotivoRechazo('');
      await fetchData();
    } catch {
      alert('Error al cambiar estado');
    } finally {
      setProcesando(null);
    }
  }

  function generarPDFGrupo(grupo: GrupoSolicitud, nro: string) {
    const doc = new jsPDF();
    const fecha = new Date(grupo.createdAt).toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    const hora = new Date(grupo.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });

    doc.setFillColor(10, 22, 40);
    doc.rect(0, 0, 210, 38, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('AEROSAN', 14, 16);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text('GROUND HANDLING SERVICES', 14, 23);
    doc.setFontSize(8);
    doc.text('Sistema de Abastecimiento — Control de Stock', 14, 29);
    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.text('SOLICITUD DE REPOSICIÓN', 196, 17, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(nro, 196, 24, { align: 'right' });
    doc.text(`${fecha} — ${hora}`, 196, 30, { align: 'right' });

    doc.setDrawColor(26, 110, 191);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(nro, 45, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° Solicitud:`, 14, 50);
    doc.text(`Fecha:`, 14, 56);
    doc.setFont('helvetica', 'bold');
    doc.text(fecha, 45, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(`Estado:`, 110, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(ESTADO_CONFIG[grupo.estado]?.label ?? grupo.estado, 135, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total productos:`, 110, 56);
    doc.setFont('helvetica', 'bold');
    doc.text(`${grupo.items.length}`, 145, 56);

    if (grupo.notas) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Notas: ${grupo.notas}`, 14, 62);
    }

    const urgentes = grupo.items.filter(i => i.prioridad === 'URGENTE');
    const normales = grupo.items.filter(i => i.prioridad === 'NORMAL');
    const ordenados = [...urgentes, ...normales];

    autoTable(doc, {
      startY: grupo.notas ? 68 : 64,
      head: [['#', 'Código', 'Descripción', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Cant. a Pedir', 'Prioridad']],
      body: ordenados.map((s, i) => [
        i + 1,
        s.producto.codigoProducto,
        s.producto.descripcion,
        s.producto.categoria?.nombre ?? '—',
        `${s.producto.stockActual} ${s.producto.unidadMedida}`,
        `${s.producto.stockMinimo} ${s.producto.unidadMedida}`,
        `${s.cantidad} ${s.producto.unidadMedida}`,
        s.prioridad,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [10, 22, 40], textColor: 255, fontStyle: 'bold' },
      alternateRowStyles: { fillColor: [248, 249, 250] },
      columnStyles: {
        0: { halign: 'center', cellWidth: 8 },
        1: { cellWidth: 24 },
        2: { cellWidth: 52 },
        3: { cellWidth: 22 },
        4: { halign: 'center', cellWidth: 18 },
        5: { halign: 'center', cellWidth: 18 },
        6: { halign: 'center', cellWidth: 20, fontStyle: 'bold' },
        7: { halign: 'center', cellWidth: 18 },
      },
    });

    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Aerosan Ground Handling Services — Sistema de Abastecimiento WMS', 105, finalY + 5, { align: 'center' });
    doc.text(`${nro} — Generado el ${fecha}`, 105, finalY + 9, { align: 'center' });

    doc.save(`${nro}.pdf`);
  }

  const grupos = agruparSolicitudes(solicitudes);
  const gruposFiltrados = filtroHistorial === 'TODOS'
    ? grupos
    : grupos.filter(g => g.estado === filtroHistorial);

  const productosFiltrados = filtroNivel === 'TODOS'
    ? productos
    : productos.filter(p => p.criticidad === filtroNivel);

  const cantidadSeleccionada = Object.keys(seleccionados).length;

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Reposición</h1>
          <p className="text-gray-500 text-sm mt-1">{grupos.length} solicitudes en total</p>
        </div>
        <button onClick={() => setModalAbierto(true)}
          className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium text-white transition-colors"
          style={{ backgroundColor: '#1a6ebf' }}>
          <Plus size={16} />
          Nueva Solicitud
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Pendientes',           value: summary.pendientes,      color: 'text-yellow-600', bg: 'bg-yellow-50 border-yellow-200' },
          { label: 'En proceso de compra', value: summary.enProcesoCompra, color: 'text-blue-600',   bg: 'bg-blue-50 border-blue-200' },
          { label: 'Completadas',          value: summary.completadas,     color: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
          { label: 'Rechazadas',           value: summary.rechazadas,      color: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
        ].map((k, i) => (
          <div key={i} className={`rounded-xl border p-4 ${k.bg}`}>
            <p className="text-xs font-medium text-gray-500">{k.label}</p>
            <p className={`text-3xl font-bold mt-1 ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Historial de Solicitudes</h2>
          <div className="flex gap-2">
            {['TODOS', 'PENDIENTE', 'EN_PROCESO_COMPRA', 'COMPLETADA', 'RECHAZADA'].map(f => (
              <button key={f} onClick={() => setFiltroHistorial(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filtroHistorial === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {f === 'TODOS' ? 'Todas' : ESTADO_CONFIG[f]?.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-lg" />)}
          </div>
        ) : gruposFiltrados.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay solicitudes aún</p>
            <p className="text-xs mt-1">Haz click en "Nueva Solicitud" para crear una</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {gruposFiltrados.map((grupo, idx) => {
              const cfg = ESTADO_CONFIG[grupo.estado] ?? ESTADO_CONFIG.PENDIENTE;
              const Icon = cfg.icon;
              const siguientes = ESTADOS_SIGUIENTES[grupo.estado] ?? [];
              const nro = generarNroSolicitud(grupos.indexOf(grupo), grupo.createdAt);
              const expandido = gruposExpandidos[grupo.grupoId] ?? true;
              const fecha = new Date(grupo.createdAt).toLocaleDateString('es-CL', {
                day: '2-digit', month: 'long', year: 'numeric'
              });
              const hora = new Date(grupo.createdAt).toLocaleTimeString('es-CL', {
                hour: '2-digit', minute: '2-digit'
              });

              return (
                <div key={grupo.grupoId} className="overflow-hidden">
                  {/* Header del grupo */}
                  <div className={`px-6 py-4 flex items-center justify-between ${cfg.bg}`}>
                    <div className="flex items-center gap-4">
                      <button onClick={() => setGruposExpandidos(prev => ({ ...prev, [grupo.grupoId]: !expandido }))}
                        className="p-1 rounded hover:bg-white/50 transition-colors">
                        {expandido ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                      </button>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className={`font-mono text-sm font-bold ${cfg.color}`}>{nro}</span>
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                            <Icon size={11} />
                            {cfg.label}
                          </span>
                          {grupo.prioridad === 'URGENTE' && (
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">URGENTE</span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-0.5">{fecha} — {hora} · {grupo.items.length} producto(s)</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => generarPDFGrupo(grupo, nro)}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 bg-white text-gray-600 hover:bg-gray-50 transition-colors">
                        <FileText size={13} />
                        PDF
                      </button>
                      {siguientes.map(sig => (
                        <button key={sig}
                          onClick={() => sig === 'RECHAZADA' ? setRechazandoGrupo(grupo.grupoId) : cambiarEstadoGrupo(grupo.grupoId, sig)}
                          disabled={procesando === grupo.grupoId}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors disabled:opacity-50 ${
                            sig === 'RECHAZADA'
                              ? 'bg-red-50 text-red-600 hover:bg-red-100 border border-red-200'
                              : 'bg-gray-900 text-white hover:bg-gray-700'
                          }`}>
                          {ESTADO_CONFIG[sig]?.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Modal motivo rechazo */}
                  {rechazandoGrupo === grupo.grupoId && (
                    <div className="px-6 py-3 bg-red-50 border-t border-red-200 flex items-center gap-3">
                      <input value={motivoRechazo}
                        onChange={e => setMotivoRechazo(e.target.value)}
                        placeholder="Motivo del rechazo (opcional)..."
                        className="flex-1 px-3 py-1.5 border border-red-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      <button onClick={() => cambiarEstadoGrupo(grupo.grupoId, 'RECHAZADA', motivoRechazo)}
                        className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700">
                        Confirmar rechazo
                      </button>
                      <button onClick={() => setRechazandoGrupo(null)}
                        className="px-3 py-1.5 bg-gray-100 text-gray-600 rounded-lg text-xs font-medium hover:bg-gray-200">
                        Cancelar
                      </button>
                    </div>
                  )}

                  {/* Items del grupo */}
                  {expandido && (
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-6 py-2 font-medium text-gray-400 text-xs">Producto</th>
                          <th className="text-left px-4 py-2 font-medium text-gray-400 text-xs">Categoría</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Stock actual</th>
                          <th className="text-right px-4 py-2 font-medium text-gray-400 text-xs">Cantidad solicitada</th>
                          <th className="text-center px-4 py-2 font-medium text-gray-400 text-xs">Prioridad</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {grupo.items.map(s => (
                          <tr key={s.id} className="hover:bg-gray-50">
                            <td className="px-6 py-2.5">
                              <p className="font-medium text-gray-900 truncate max-w-xs text-sm">{s.producto?.descripcion}</p>
                              <p className="text-xs text-gray-400 font-mono">{s.producto?.codigoProducto}</p>
                            </td>
                            <td className="px-4 py-2.5">
                              {s.producto?.categoria && (
                                <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                  style={{ backgroundColor: s.producto.categoria.color ?? '#6366f1' }}>
                                  {s.producto.categoria.nombre}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-orange-600 font-medium text-sm">
                              {s.producto?.stockActual} {s.producto?.unidadMedida}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-gray-900 text-sm">
                              {s.cantidad} {s.producto?.unidadMedida}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                                s.prioridad === 'URGENTE' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
                              }`}>
                                {s.prioridad}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal Nueva Solicitud */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nueva Solicitud de Reposición</h2>
                <p className="text-xs text-gray-400 mt-0.5">{productos.length} productos con stock bajo el mínimo</p>
              </div>
              <button onClick={() => { setModalAbierto(false); setSeleccionados({}); setNotas(''); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {(['TODOS', 'CRITICO', 'ALTO'] as const).map(f => (
                    <button key={f} onClick={() => setFiltroNivel(f)}
                      className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                        filtroNivel === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}>
                      {f === 'TODOS' ? `Todos (${productos.length})` : `${f} (${productos.filter(p => p.criticidad === f).length})`}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-gray-500">
                  {cantidadSeleccionada > 0 ? `${cantidadSeleccionada} seleccionado(s)` : 'Ninguno seleccionado'}
                </span>
              </div>

              <input value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Notas adicionales (opcional)..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-center px-4 py-3 font-medium text-gray-500 w-10">
                        <input type="checkbox"
                          checked={productosFiltrados.length > 0 && productosFiltrados.every(p => seleccionados[p.id])}
                          onChange={() => {
                            if (productosFiltrados.every(p => seleccionados[p.id])) {
                              const next = { ...seleccionados };
                              productosFiltrados.forEach(p => delete next[p.id]);
                              setSeleccionados(next);
                            } else {
                              const next = { ...seleccionados };
                              productosFiltrados.forEach(p => {
                                if (!next[p.id]) {
                                  next[p.id] = {
                                    ...p,
                                    cantidadSolicitada: Math.max(p.stockMinimo - p.stockActual, 1),
                                    prioridad: p.criticidad === 'CRITICO' ? 'URGENTE' : 'NORMAL',
                                  };
                                }
                              });
                              setSeleccionados(next);
                            }
                          }}
                          className="rounded" />
                      </th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Producto</th>
                      <th className="text-left px-4 py-3 font-medium text-gray-500">Categoría</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Stock</th>
                      <th className="text-right px-4 py-3 font-medium text-gray-500">Mínimo</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Cantidad</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Prioridad</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Criticidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productosFiltrados.map(p => {
                      const sel = seleccionados[p.id];
                      const pct = p.stockMinimo > 0 ? (p.stockActual / p.stockMinimo) * 100 : 100;
                      return (
                        <tr key={p.id} onClick={() => toggleSeleccion(p)}
                          className={`cursor-pointer transition-colors ${sel ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={!!sel} onChange={() => toggleSeleccion(p)} className="rounded" />
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-xs">{p.descripcion}</p>
                            <p className="text-xs text-gray-400 font-mono">{p.codigoProducto}</p>
                          </td>
                          <td className="px-4 py-3">
                            {p.categoria && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: p.categoria.color ?? '#6366f1' }}>
                                {p.categoria.nombre}
                              </span>
                            )}
                          </td>
                          <td className={`px-4 py-3 text-right font-medium ${pct < 20 ? 'text-red-600' : 'text-orange-600'}`}>
                            {p.stockActual} {p.unidadMedida}
                          </td>
                          <td className="px-4 py-3 text-right text-gray-500">{p.stockMinimo} {p.unidadMedida}</td>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            {sel ? (
                              <div className="flex items-center justify-center gap-2">
                                <button onClick={() => updateCantidad(p.id, -1)}
                                  className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                                  <Minus size={12} />
                                </button>
                                <span className="w-10 text-center font-bold">{sel.cantidadSolicitada}</span>
                                <button onClick={() => updateCantidad(p.id, 1)}
                                  className="w-6 h-6 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center">
                                  <Plus size={12} />
                                </button>
                              </div>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            {sel ? (
                              <select value={sel.prioridad}
                                onChange={e => updatePrioridad(p.id, e.target.value as 'URGENTE' | 'NORMAL')}
                                className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${
                                  sel.prioridad === 'URGENTE' ? 'bg-red-50 text-red-700' : 'bg-gray-50 text-gray-600'
                                }`}>
                                <option value="URGENTE">URGENTE</option>
                                <option value="NORMAL">NORMAL</option>
                              </select>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              p.criticidad === 'CRITICO' ? 'bg-red-50 text-red-700' : 'bg-orange-50 text-orange-700'
                            }`}>
                              {p.criticidad}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setModalAbierto(false); setSeleccionados({}); setNotas(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <button onClick={generarSolicitudes}
                disabled={procesando === 'generar' || cantidadSeleccionada === 0}
                className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-colors"
                style={{ backgroundColor: cantidadSeleccionada === 0 ? '#9ca3af' : '#1a6ebf' }}>
                <Plus size={15} />
                {procesando === 'generar' ? 'Generando...' : `Generar Solicitud (${cantidadSeleccionada} productos)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}