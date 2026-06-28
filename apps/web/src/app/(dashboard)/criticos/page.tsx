'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import {
  AlertTriangle, TrendingDown, Zap, ShieldAlert, Wrench,
  type LucideIcon,
} from 'lucide-react';

interface Summary {
  productosCriticos: number;
  quiebreStock: number;
  stockCritico: number;
  alertasActivas: number;
}

type EstadoCritico = 'QUIEBRE' | 'CRITICO' | 'BAJO' | 'NORMAL';

interface ProductoCritico {
  id: string;
  codigoProducto: string;
  descripcion: string;
  unidadMedida: string;
  stockActual: number;
  stockMinimo: number;
  demandaPromedio: number | null;
  criticidad: string;
  diasCobertura: number | null;
  estado: EstadoCritico;
  categoria?: { nombre: string; color: string } | null;
}

const ESTADO_STYLES: Record<EstadoCritico, {
  border: string; bg: string; text: string; label: string; dot: string; barColor: string;
}> = {
  QUIEBRE: { border: 'border-red-200', bg: 'bg-red-50/60', text: 'text-red-700', label: 'Quiebre', dot: 'bg-red-500', barColor: '#ef4444' },
  CRITICO: { border: 'border-orange-200', bg: 'bg-orange-50/60', text: 'text-orange-700', label: 'Crítico', dot: 'bg-orange-500', barColor: '#f97316' },
  BAJO: { border: 'border-amber-200', bg: 'bg-amber-50/50', text: 'text-amber-700', label: 'Bajo', dot: 'bg-amber-500', barColor: '#d97706' },
  NORMAL: { border: 'border-gray-200', bg: 'bg-white', text: 'text-emerald-700', label: 'Estable', dot: 'bg-emerald-500', barColor: '#10b981' },
};

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

function CriticalRow({ p, onClick }: { p: ProductoCritico; onClick: () => void }) {
  const style = ESTADO_STYLES[p.estado];
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 px-5 py-3.5 border-t border-slate-100 first:border-t-0 hover:bg-slate-50 transition-colors text-left group"
    >
      <div
        className="w-11 h-11 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: style.bg }}
      >
        <span className="text-[15px] font-semibold" style={{ color: style.text }}>
          {p.stockActual}
        </span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[13.5px] font-medium text-slate-900 truncate group-hover:text-slate-950">
          {p.descripcion}
        </p>
        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
          {p.codigoProducto} · mín {p.stockMinimo.toLocaleString('es-CL')} {p.unidadMedida}
        </p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <div className="text-right">
          <p className="text-[13.5px] font-semibold" style={{ color: style.text }}>
            {p.diasCobertura !== null ? `${p.diasCobertura} días` : '—'}
          </p>
          <p className="text-[11px] text-slate-400">cobertura</p>
        </div>
        <span
          className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md"
          style={{ color: style.text, backgroundColor: style.bg }}
        >
          {style.label}
        </span>
      </div>
    </button>
  );
}

export default function CriticosPage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [insumos, setInsumos] = useState<ProductoCritico[]>([]);
  const [eppUniformes, setEppUniformes] = useState<ProductoCritico[]>([]);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState<'insumos' | 'epp'>('insumos');

  useEffect(() => {
    Promise.all([
      api.inventory.summary(),
      api.inventory.critical({ limit: 100 }),
    ])
      .then(([summaryRes, criticalRes]) => {
        setSummary(summaryRes.data?.data ?? summaryRes.data);

        const criticalData = criticalRes.data?.data ?? criticalRes.data ?? {};
        setInsumos(Array.isArray(criticalData.insumos) ? criticalData.insumos : []);
        setEppUniformes(Array.isArray(criticalData.eppUniformes) ? criticalData.eppUniformes : []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const goToProduct = (id: string) => router.push(`/inventory/${id}`);

  const productosMostrados = vistaActiva === 'insumos' ? insumos : eppUniformes;
  const totalCriticos = insumos.length + eppUniformes.length;

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

  const countByEstado = {
    quiebre: insumos.filter(p => p.estado === 'QUIEBRE').length + eppUniformes.filter(p => p.estado === 'QUIEBRE').length,
    critico: insumos.filter(p => p.estado === 'CRITICO').length + eppUniformes.filter(p => p.estado === 'CRITICO').length,
    bajo: insumos.filter(p => p.estado === 'BAJO').length + eppUniformes.filter(p => p.estado === 'BAJO').length,
  };

  return (
    <div className="p-8 space-y-7 bg-slate-50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Inventario</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Insumos críticos y alertas</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            {new Date().toLocaleDateString('es-CL', { month: 'numeric', day: 'numeric', year: 'numeric' })}
          </span>
          <button className="inline-flex items-center justify-center rounded-full bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-red-700">
            <Zap size={14} className="mr-2" /> Generar orden
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Insumos críticos"
          value={totalCriticos}
          subtitle="Que requieren acción inmediata"
          icon={AlertTriangle}
          accent="#EF4444"
        />
        <KPICard
          title="Quiebre de stock"
          value={countByEstado.quiebre}
          subtitle="Sin existencias (0 UN)"
          icon={TrendingDown}
          accent="#DC2626"
        />
        <KPICard
          title="Stock crítico"
          value={countByEstado.critico}
          subtitle="Menor a 20% del mínimo"
          icon={ShieldAlert}
          accent="#F97316"
        />
        <KPICard
          title="Stock bajo"
          value={countByEstado.bajo}
          subtitle="Bajo stock mínimo"
          icon={Wrench}
          accent="#FBBF24"
        />
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-6 border-b border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Gestión de críticos</p>
              <p className="text-sm text-slate-500 mt-1">Productos con stock bajo que requieren reposición urgente</p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setVistaActiva('insumos')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  vistaActiva === 'insumos'
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                Insumos ({insumos.length})
              </button>
              <button
                onClick={() => setVistaActiva('epp')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  vistaActiva === 'epp'
                    ? 'bg-slate-950 text-white'
                    : 'bg-slate-100 text-slate-900 hover:bg-slate-200'
                }`}
              >
                EPP/Uniformes ({eppUniformes.length})
              </button>
            </div>
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {productosMostrados.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              No hay {vistaActiva === 'insumos' ? 'insumos' : 'EPP/uniformes'} críticos en este momento.
            </div>
          ) : (
            productosMostrados.map((p) => (
              <CriticalRow key={p.id} p={p} onClick={() => goToProduct(p.id)} />
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            {productosMostrados.length} de {totalCriticos} productos críticos · última actualización hace 2 minutos
          </p>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid gap-4 md:grid-cols-3">
        <button className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow text-left group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-950">Crear solicitud de compra</p>
              <p className="text-xs text-slate-500 mt-2">Generar orden para {countByEstado.quiebre} items en quiebre</p>
            </div>
            <Zap size={20} className="text-amber-500 shrink-0" />
          </div>
        </button>

        <button className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow text-left group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-950">Notificar a proveedores</p>
              <p className="text-xs text-slate-500 mt-2">Enviar alertas para reposición urgente</p>
            </div>
            <AlertTriangle size={20} className="text-orange-500 shrink-0" />
          </div>
        </button>

        <button className="bg-white rounded-[32px] border border-slate-200 p-6 shadow-sm hover:shadow-md transition-shadow text-left group">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900 group-hover:text-slate-950">Ver pronóstico</p>
              <p className="text-xs text-slate-500 mt-2">Proyección de demanda próximos 14 días</p>
            </div>
            <TrendingDown size={20} className="text-blue-500 shrink-0" />
          </div>
        </button>
      </div>
    </div>
  );
}
