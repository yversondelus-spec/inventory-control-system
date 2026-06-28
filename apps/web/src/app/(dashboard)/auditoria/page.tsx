'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';
import {
  Activity, Users, Shield, Database, Download, Search, ChevronLeft, ChevronRight,
  type LucideIcon,
} from 'lucide-react';

interface AuditLog {
  id: string;
  usuarioId: string | null;
  usuario?: { id: string; email: string; nombre: string } | null;
  accion: string;
  entidad: string;
  entidadId: string | null;
  ip: string | null;
  userAgent: string | null;
  createdAt: string;
}

interface Summary {
  periodo: string;
  totalAcciones: number;
  byAccion: Record<string, number>;
  byEntidad: Array<{ entidad: string; count: number }>;
  topUsers: Array<{ id: string; nombre: string; email: string; acciones: number }>;
  dailyTrend: Array<{ fecha: string; acciones: number }>;
}

function KPICard({ title, value, subtitle, icon: Icon, accent }: {
  title: string; value: string | number; subtitle?: string;
  icon: LucideIcon; accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
      <div className="flex items-center justify-between mb-3">
        <p className="text-[13px] font-medium text-slate-500">{title}</p>
        <Icon size={16} style={{ color: accent }} strokeWidth={2} />
      </div>
      <p className="text-[26px] font-semibold text-slate-900 tracking-tight leading-none">{value}</p>
      {subtitle && <p className="text-[12px] text-slate-400 mt-2">{subtitle}</p>}
    </div>
  );
}

function ActionBadge({ action }: { action: string }) {
  const colors: Record<string, { bg: string; text: string }> = {
    POST: { bg: 'bg-emerald-50', text: 'text-emerald-700' },
    PUT: { bg: 'bg-blue-50', text: 'text-blue-700' },
    PATCH: { bg: 'bg-purple-50', text: 'text-purple-700' },
    DELETE: { bg: 'bg-red-50', text: 'text-red-700' },
  };
  const color = colors[action] || { bg: 'bg-slate-50', text: 'text-slate-700' };
  return (
    <span className={`inline-block text-[11px] font-medium px-2 py-0.5 rounded-md ${color.bg} ${color.text}`}>
      {action}
    </span>
  );
}

export default function AuditPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Filters
  const [filtroAccion, setFiltroAccion] = useState('');
  const [filtroEntidad, setFiltroEntidad] = useState('');
  const [filtroUsuario, setFiltroUsuario] = useState('');
  const [filtroDesde, setFiltroDesde] = useState('');
  const [filtroHasta, setFiltroHasta] = useState('');

  // Pagination
  const [limit] = useState(50);
  const [offset, setOffset] = useState(0);

  useEffect(() => {
    Promise.all([
      api.audit?.summary?.().catch(() => null),
      api.audit?.logs?.({
        accion: filtroAccion || undefined,
        entidad: filtroEntidad || undefined,
        usuarioId: filtroUsuario || undefined,
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
        limit,
        offset,
      }).catch(() => null),
    ])
      .then(([summaryRes, logsRes]) => {
        setSummary(summaryRes?.data?.data ?? summaryRes?.data);
        setLogs(logsRes?.data?.data?.logs ?? logsRes?.data?.logs ?? []);
        setTotal(logsRes?.data?.data?.total ?? logsRes?.data?.total ?? 0);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [filtroAccion, filtroEntidad, filtroUsuario, filtroDesde, filtroHasta, limit, offset]);

  const handleExport = async () => {
    try {
      const res = await api.audit?.export?.({
        accion: filtroAccion || undefined,
        entidad: filtroEntidad || undefined,
        usuarioId: filtroUsuario || undefined,
        desde: filtroDesde || undefined,
        hasta: filtroHasta || undefined,
      });
      const url = window.URL.createObjectURL(new Blob([res?.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = `auditoria_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
    } catch (err) {
      console.error('Error exporting:', err);
    }
  };

  if (loading) {
    return (
      <div className="p-8 animate-pulse space-y-4">
        <div className="h-8 bg-slate-200 rounded w-64" />
        <div className="grid grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => <div key={i} className="h-28 bg-slate-200 rounded-xl" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-7 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Seguridad</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Registro de auditoría</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            {new Date().toLocaleDateString('es-CL', { month: 'numeric', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={handleExport}
            className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 gap-2"
          >
            <Download size={14} /> Exportar CSV
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Total de acciones"
          value={summary?.totalAcciones ?? 0}
          subtitle={summary?.periodo}
          icon={Activity}
          accent="#185FA5"
        />
        <KPICard
          title="Creaciones"
          value={summary?.byAccion.POST ?? 0}
          subtitle="Registros agregados"
          icon={Shield}
          accent="#10B981"
        />
        <KPICard
          title="Modificaciones"
          value={(summary?.byAccion.PUT ?? 0) + (summary?.byAccion.PATCH ?? 0)}
          subtitle="Actualizaciones"
          icon={Database}
          accent="#0891B2"
        />
        <KPICard
          title="Eliminaciones"
          value={summary?.byAccion.DELETE ?? 0}
          subtitle="Registros removidos"
          icon={Users}
          accent="#EF4444"
        />
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Acciones por tipo</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={[
                  { name: 'POST', value: summary?.byAccion.POST ?? 0 },
                  { name: 'PUT', value: summary?.byAccion.PUT ?? 0 },
                  { name: 'PATCH', value: summary?.byAccion.PATCH ?? 0 },
                  { name: 'DELETE', value: summary?.byAccion.DELETE ?? 0 },
                ]}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" fill="#185FA5" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">Tendencia diaria</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={summary?.dailyTrend ?? []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="fecha" style={{ fontSize: '12px' }} />
                <YAxis style={{ fontSize: '12px' }} />
                <Tooltip />
                <Line type="monotone" dataKey="acciones" stroke="#185FA5" dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-6 border-b border-slate-100">
          <p className="text-sm font-semibold text-slate-900">Usuarios más activos</p>
        </div>
        <div className="divide-y divide-slate-100">
          {summary?.topUsers?.map((user) => (
            <div key={user.id} className="px-6 py-4 flex items-center justify-between hover:bg-slate-50">
              <div>
                <p className="text-sm font-medium text-slate-900">{user.nombre}</p>
                <p className="text-xs text-slate-500">{user.email}</p>
              </div>
              <span className="text-sm font-semibold text-slate-900 bg-slate-100 rounded-full px-3 py-1">
                {user.acciones}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Logs Table with Filters */}
      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-6 border-b border-slate-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">Registro de cambios</p>
              <p className="text-sm text-slate-500 mt-1">{total} eventos registrados</p>
            </div>
            <Search size={18} className="text-slate-400" />
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <input
              type="text"
              placeholder="Usuario ID..."
              value={filtroUsuario}
              onChange={(e) => {
                setFiltroUsuario(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
            <select
              value={filtroAccion}
              onChange={(e) => {
                setFiltroAccion(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            >
              <option value="">Todas las acciones</option>
              <option value="POST">POST</option>
              <option value="PUT">PUT</option>
              <option value="PATCH">PATCH</option>
              <option value="DELETE">DELETE</option>
            </select>
            <input
              type="text"
              placeholder="Entidad..."
              value={filtroEntidad}
              onChange={(e) => {
                setFiltroEntidad(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
            <input
              type="date"
              value={filtroDesde}
              onChange={(e) => {
                setFiltroDesde(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
            <input
              type="date"
              value={filtroHasta}
              onChange={(e) => {
                setFiltroHasta(e.target.value);
                setOffset(0);
              }}
              className="px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-950"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Fecha</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Usuario</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Acción</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">Entidad</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">ID</th>
                <th className="px-6 py-3 text-left font-medium text-slate-600">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                    No hay registros de auditoría.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-3 text-slate-900">
                      {new Date(log.createdAt).toLocaleString('es-CL')}
                    </td>
                    <td className="px-6 py-3">
                      <div>
                        <p className="text-slate-900">{log.usuario?.nombre ?? 'Sistema'}</p>
                        <p className="text-xs text-slate-500">{log.usuario?.email ?? 'N/A'}</p>
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      <ActionBadge action={log.accion} />
                    </td>
                    <td className="px-6 py-3 text-slate-600">{log.entidad}</td>
                    <td className="px-6 py-3 font-mono text-slate-600">{log.entidadId ?? '—'}</td>
                    <td className="px-6 py-3 text-slate-600 text-xs">{log.ip ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <p className="text-xs text-slate-500">
            Mostrando {offset + 1} a {Math.min(offset + limit, total)} de {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset(Math.max(0, offset - limit))}
              disabled={offset === 0}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setOffset(offset + limit)}
              disabled={offset + limit >= total}
              className="p-2 rounded-lg border border-slate-200 hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
