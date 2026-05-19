'use client';

import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import { ClipboardList, CheckCircle, Clock, Send, XCircle, RefreshCw, FileText, Plus, Minus, X } from 'lucide-react';
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
  cantidad: number;
  estado: string;
  prioridad: string;
  notas: string | null;
  createdAt: string;
  producto: Producto;
}

interface ProductoSeleccionado extends Producto {
  cantidadSolicitada: number;
  prioridad: 'URGENTE' | 'NORMAL';
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

function generarNumeroSolicitud(index: number, fecha: string) {
  const d = new Date(fecha);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const num = String(index + 1).padStart(6, '0');
  return `SOL-${year}${month}-${num}`;
}

function agruparPorFecha(solicitudes: Solicitud[]) {
  const grupos: Record<string, Solicitud[]> = {};
  solicitudes.forEach(s => {
    const fecha = new Date(s.createdAt).toLocaleDateString('es-CL', {
      weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
    });
    if (!grupos[fecha]) grupos[fecha] = [];
    grupos[fecha].push(s);
  });
  return grupos;
}

export default function SolicitudesPage() {
  const [modalAbierto, setModalAbierto] = useState(false);
  const [solicitudes, setSolicitudes] = useState<Solicitud[]>([]);
  const [summary, setSummary] = useState({ pendientes: 0, enviadas: 0, enProceso: 0, completadas: 0 });
  const [loading, setLoading] = useState(true);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [seleccionados, setSeleccionados] = useState<Record<string, ProductoSeleccionado>>({});
  const [filtroNivel, setFiltroNivel] = useState<'TODOS' | 'CRITICO' | 'ALTO'>('TODOS');
  const [filtroHistorial, setFiltroHistorial] = useState('TODAS');
  const [procesando, setProcesando] = useState<string | null>(null);
  const [generandoPDF, setGenerandoPDF] = useState(false);
  const [notas, setNotas] = useState('');

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
      setSummary(sumRes.data?.data ?? { pendientes: 0, enviadas: 0, enProceso: 0, completadas: 0 });
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
      alert('⚠️ Debes seleccionar al menos un producto para generar la solicitud.');
      return;
    }
    setProcesando('generar');
    try {
      for (const item of items) {
        await apiClient.post('/solicitudes', {
          productoId: item.id,
          cantidad: item.cantidadSolicitada,
          prioridad: item.prioridad,
          notas,
        });
      }
      setSeleccionados({});
      setNotas('');
      setModalAbierto(false);
      await fetchData();
      alert(`✅ ${items.length} solicitud(es) generada(s) correctamente.`);
    } catch {
      alert('Error al generar solicitudes');
    } finally {
      setProcesando(null);
    }
  }

  function generarPDF(solicitudesGrupo?: Solicitud[]) {
    const items = solicitudesGrupo
      ? solicitudesGrupo.map(s => ({
          ...s.producto,
          cantidadSolicitada: s.cantidad,
          prioridad: s.prioridad as 'URGENTE' | 'NORMAL',
        }))
      : Object.values(seleccionados);

    if (items.length === 0) {
      alert('⚠️ No hay productos para generar el PDF.');
      return;
    }
    setGenerandoPDF(true);

    const doc = new jsPDF();
    const fecha = new Date().toLocaleDateString('es-CL', { day: '2-digit', month: 'long', year: 'numeric' });
    const hora = new Date().toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    const nroSol = solicitudesGrupo
      ? generarNumeroSolicitud(solicitudes.indexOf(solicitudesGrupo[0]), solicitudesGrupo[0].createdAt)
      : `SOL-${new Date().getFullYear()}${String(new Date().getMonth()+1).padStart(2,'0')}-BORRADOR`;

    // Header
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
    doc.text('SOLICITUD DE REPOSICIÓN', 210 - 14, 17, { align: 'right' });
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(nroSol, 210 - 14, 24, { align: 'right' });
    doc.text(`${fecha} — ${hora}`, 210 - 14, 30, { align: 'right' });

    // Línea separadora
    doc.setDrawColor(26, 110, 191);
    doc.setLineWidth(0.5);
    doc.line(14, 42, 196, 42);

    // Info
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.text(`N° Solicitud:`, 14, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(nroSol, 45, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Fecha emisión:`, 14, 56);
    doc.setFont('helvetica', 'bold');
    doc.text(`${fecha}`, 45, 56);
    doc.setFont('helvetica', 'normal');
    doc.text(`Total productos:`, 110, 50);
    doc.setFont('helvetica', 'bold');
    doc.text(`${items.length}`, 145, 50);
    doc.setFont('helvetica', 'normal');
    doc.text(`Urgentes:`, 110, 56);
    doc.setFont('helvetica', 'bold');
    doc.text(`${items.filter(i => i.prioridad === 'URGENTE').length}`, 145, 56);

    if (notas) {
      doc.setFont('helvetica', 'normal');
      doc.text(`Notas:`, 14, 62);
      doc.setFont('helvetica', 'italic');
      doc.text(notas, 35, 62);
    }

    // Tabla
    const urgentes = items.filter(i => i.prioridad === 'URGENTE');
    const normales = items.filter(i => i.prioridad === 'NORMAL');
    const ordenados = [...urgentes, ...normales];

    autoTable(doc, {
      startY: notas ? 68 : 64,
      head: [['#', 'Código', 'Descripción', 'Categoría', 'Stock Actual', 'Stock Mínimo', 'Cant. a Pedir', 'Prioridad']],
      body: ordenados.map((p, i) => [
        i + 1,
        p.codigoProducto,
        p.descripcion,
        p.categoria?.nombre ?? '—',
        `${p.stockActual} ${p.unidadMedida}`,
        `${p.stockMinimo} ${p.unidadMedida}`,
        `${p.cantidadSolicitada} ${p.unidadMedida}`,
        p.prioridad,
      ]),
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [10, 22, 40], textColor: 255, fontStyle: 'bold', fontSize: 8 },
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

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY + 12;
    doc.setDrawColor(200, 200, 200);
    doc.line(14, finalY, 196, finalY);
    doc.setFontSize(7);
    doc.setTextColor(150, 150, 150);
    doc.text('Aerosan Ground Handling Services — Sistema de Abastecimiento WMS', 105, finalY + 5, { align: 'center' });
    doc.text(`Documento generado el ${fecha} a las ${hora} — ${nroSol}`, 105, finalY + 9, { align: 'center' });

    doc.save(`${nroSol}.pdf`);
    setGenerandoPDF(false);
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

  const productosFiltrados = filtroNivel === 'TODOS'
    ? productos
    : productos.filter(p => p.criticidad === filtroNivel);

  const solicitudesFiltradas = filtroHistorial === 'TODAS'
    ? solicitudes
    : solicitudes.filter(s => s.estado === filtroHistorial);

  const grupos = agruparPorFecha(solicitudesFiltradas);
  const cantidadSeleccionada = Object.keys(seleccionados).length;

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Solicitudes de Reposición</h1>
          <p className="text-gray-500 text-sm mt-1">{solicitudes.length} solicitudes en total</p>
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

      {/* Historial */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Historial de Solicitudes</h2>
          <div className="flex gap-2">
            {['TODAS', 'PENDIENTE', 'ENVIADA', 'EN_PROCESO', 'COMPLETADA', 'CANCELADA'].map(f => (
              <button key={f} onClick={() => setFiltroHistorial(f)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filtroHistorial === f ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                }`}>
                {f === 'TODAS' ? `Todas` : ESTADO_CONFIG[f]?.label}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-gray-100 rounded-lg" />)}
          </div>
        ) : Object.keys(grupos).length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <ClipboardList size={32} className="mx-auto mb-2 opacity-30" />
            <p className="text-sm">No hay solicitudes aún</p>
            <p className="text-xs mt-1">Haz click en "Nueva Solicitud" para crear una</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {Object.entries(grupos).map(([fecha, items]) => (
              <div key={fecha}>
                <div className="px-6 py-2 bg-gray-50 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500 capitalize">{fecha}</p>
                  <button onClick={() => generarPDF(items)}
                    className="flex items-center gap-1 px-2 py-1 rounded text-xs text-gray-500 hover:bg-gray-200 transition-colors">
                    <FileText size={12} />
                    PDF del día
                  </button>
                </div>
                <table className="w-full text-sm">
                  <tbody className="divide-y divide-gray-50">
                    {items.map((s, idx) => {
                      const cfg = ESTADO_CONFIG[s.estado] ?? ESTADO_CONFIG.PENDIENTE;
                      const Icon = cfg.icon;
                      const siguientes = ESTADOS_SIGUIENTES[s.estado] ?? [];
                      const nro = generarNumeroSolicitud(solicitudes.indexOf(s), s.createdAt);
                      return (
                        <tr key={s.id} className="hover:bg-gray-50">
                          <td className="px-6 py-3 w-36">
                            <p className="font-mono text-xs font-bold text-blue-600">{nro}</p>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(s.createdAt).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <p className="font-medium text-gray-900 truncate max-w-xs">{s.producto?.descripcion}</p>
                            <p className="text-xs text-gray-400 font-mono">{s.producto?.codigoProducto}</p>
                          </td>
                          <td className="px-4 py-3">
                            {s.producto?.categoria && (
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                                style={{ backgroundColor: s.producto.categoria.color ?? '#6366f1' }}>
                                {s.producto.categoria.nombre}
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3 text-right text-orange-600 font-medium">
                            {s.producto?.stockActual} {s.producto?.unidadMedida}
                          </td>
                          <td className="px-4 py-3 text-right font-bold text-gray-900">
                            {s.cantidad} {s.producto?.unidadMedida}
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${
                              s.prioridad === 'URGENTE'
                                ? 'bg-red-50 text-red-700 border-red-200'
                                : 'bg-gray-50 text-gray-600 border-gray-200'
                            }`}>
                              {s.prioridad}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.color}`}>
                              <Icon size={11} />
                              {cfg.label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
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
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal Nueva Solicitud */}
      {modalAbierto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Nueva Solicitud de Reposición</h2>
                <p className="text-xs text-gray-400 mt-0.5">{productos.length} productos disponibles para reponer</p>
              </div>
              <button onClick={() => { setModalAbierto(false); setSeleccionados({}); setNotas(''); }}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors">
                <X size={18} className="text-gray-500" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-auto p-6 space-y-4">
              {/* Filtros y acciones */}
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
                  {cantidadSeleccionada > 0 ? `${cantidadSeleccionada} producto(s) seleccionado(s)` : 'Ningún producto seleccionado'}
                </span>
              </div>

              {/* Notas */}
              <input value={notas} onChange={e => setNotas(e.target.value)}
                placeholder="Notas adicionales para la solicitud (opcional)..."
                className="w-full px-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />

              {/* Tabla */}
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
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Cantidad a pedir</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Prioridad</th>
                      <th className="text-center px-4 py-3 font-medium text-gray-500">Criticidad</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {productosFiltrados.map(p => {
                      const sel = seleccionados[p.id];
                      const pct = p.stockMinimo > 0 ? (p.stockActual / p.stockMinimo) * 100 : 100;
                      return (
                        <tr key={p.id}
                          onClick={() => toggleSeleccion(p)}
                          className={`cursor-pointer transition-colors ${
                            sel ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'
                          }`}>
                          <td className="px-4 py-3 text-center" onClick={e => e.stopPropagation()}>
                            <input type="checkbox" checked={!!sel}
                              onChange={() => toggleSeleccion(p)} className="rounded" />
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
                                <span className="w-10 text-center font-bold text-gray-900">{sel.cantidadSolicitada}</span>
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

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between bg-gray-50 rounded-b-2xl">
              <button onClick={() => { setModalAbierto(false); setSeleccionados({}); setNotas(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-200 transition-colors">
                Cancelar
              </button>
              <div className="flex gap-3">
                <button onClick={() => generarPDF()}
                  disabled={generandoPDF || cantidadSeleccionada === 0}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 disabled:opacity-40 transition-colors">
                  <FileText size={15} />
                  {generandoPDF ? 'Generando...' : 'Descargar PDF'}
                </button>
                <button onClick={generarSolicitudes}
                  disabled={procesando === 'generar' || cantidadSeleccionada === 0}
                  className="flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-40 transition-colors"
                  style={{ backgroundColor: cantidadSeleccionada === 0 ? '#9ca3af' : '#1a6ebf' }}>
                  <Send size={15} />
                  {procesando === 'generar' ? 'Generando...' : `Generar Solicitud (${cantidadSeleccionada})`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}