'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api-client';
import { AlertTriangle, CheckCircle, Clock, XCircle, ShieldAlert, TrendingDown, Package } from 'lucide-react';

interface Alerta {
  id: string;
  tipo: string;
  prioridad: string;
  estado: string;
  mensaje: string;
  valorActual: number | null;
  valorUmbral: number | null;
  createdAt: string;
  producto: {
    codigoProducto: string;
    descripcion: string;
    stockActual: number;
    unidadMedida: string;
    categoria?: { nombre: string; color: string };
  };
}

const PRIORIDAD_CONFIG: Record<string, { color: string; bg: string; label: string }> = {
  CRITICA: { color: 'text-red-700',    bg: 'bg-red-50 border-red-200',       label: 'Crítica' },
  ALTA:    { color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200', label: 'Alta' },
  MEDIA:   { color: 'text-yellow-700', bg: 'bg-yellow-50 border-yellow-200', label: 'Media' },
  BAJA:    { color: 'text-blue-700',   bg: 'bg-blue-50 border-blue-200',     label: 'Baja' },
};

const TIPO_ICON: Record<string, React.ElementType> = {
  QUIEBRE_STOCK:      TrendingDown,
  STOCK_BAJO:         Package,
  REPOSICION_URGENTE: ShieldAlert,
  PRODUCTO_CRITICO:   AlertTriangle,
  LEAD_TIME_VENCIDO:  Clock,
};

const FILTROS = ['TODAS', 'CRITICA', 'ALTA', 'MEDIA', 'BAJA'];

export default function AlertasPage() {
  const [alertas, setAlertas] = useState<Alerta[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtro, setFiltro] = useState('TODAS');
  const [procesando, setProcesando] = useState<string | null>(null);

  useEffect(() => { fetchAlertas(); }, []);

  async function fetchAlertas() {
    setLoading(true);
    try {
      const res = await api.alerts.list({ estado: 'ACTIVA', limit: 200 });
      const items = res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      setAlertas(Array.isArray(items) ? items : []);
    } catch {
      setAlertas([]);
    } finally {
      setLoading(false);
    }
  }

  async function acknowledge(id: string) {
    setProcesando(id);
    try {
      await api.alerts.acknowledge(id);
      await fetchAlertas();
    } finally {
      setProcesando(null);
    }
  }

  async function resolve(id: string) {
    setProcesando(id);
    try {
      await api.alerts.resolve(id);
      await fetchAlertas();
    } finally {
      setProcesando(null);
    }
  }

  const filtradas = filtro === 'TODAS' ? alertas : alertas.filter(a => a.prioridad === filtro);

  const conteo = {
    CRITICA: alertas.filter(a => a.prioridad === 'CRITICA').length,
    ALTA:    alertas.filter(a => a.prioridad === 'ALTA').length,
    MEDIA:   alertas.filter(a => a.prioridad === 'MEDIA').length,
    BAJA:    alertas.filter(a => a.prioridad === 'BAJA').length,
  };

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Gestión de alertas</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Alertas activas</h1>
          <p className="text-sm text-slate-500 mt-1">{alertas.length} alertas en el sistema</p>
        </div>
        <button onClick={fetchAlertas} className="text-sm text-slate-400 hover:text-slate-600 transition-colors">
          Actualizar
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4">
        {Object.entries(conteo).map(([prioridad, count]) => {
          const cfg = PRIORIDAD_CONFIG[prioridad];
          return (
            <button key={prioridad} onClick={() => setFiltro(filtro === prioridad ? 'TODAS' : prioridad)}
              className={`p-4 rounded-xl border shadow-sm text-left transition-all ${
                filtro === prioridad ? cfg.bg + ' border-2' : 'bg-white border-slate-200 hover:border-slate-300'
              }`}>
              <p className="text-xs font-medium uppercase tracking-[0.2em]" style={{color: cfg.color.split('-')[1]}}>{cfg.label}</p>
              <p className={`text-3xl font-semibold mt-2 ${count > 0 ? cfg.color : 'text-slate-300'}`}>{count}</p>
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 shadow-sm overflow-hidden">
        <div className="px-6 py-3 border-b border-slate-100 flex gap-2 flex-wrap">
          {FILTROS.map(f => (
            <button key={f} onClick={() => setFiltro(f)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filtro === f ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
              }`}>
              {f === 'TODAS'
                ? `Todas (${alertas.length})`
                : `${PRIORIDAD_CONFIG[f]?.label} (${conteo[f as keyof typeof conteo]})`}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-slate-100 rounded-lg" />)}
          </div>
        ) : filtradas.length === 0 ? (
          <div className="px-6 py-12 text-center text-slate-400">
            <CheckCircle size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">
              No hay alertas {filtro !== 'TODAS' ? `de prioridad ${PRIORIDAD_CONFIG[filtro]?.label}` : 'activas'}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {filtradas.map((alerta) => {
              const cfg = PRIORIDAD_CONFIG[alerta.prioridad] ?? PRIORIDAD_CONFIG.BAJA;
              const Icon = TIPO_ICON[alerta.tipo] ?? AlertTriangle;
              const isProcesando = procesando === alerta.id;
              return (
                <div key={alerta.id} className="px-6 py-4 hover:bg-slate-50 transition-colors">
                  <div className="flex items-start gap-4">
                    <div className={`p-2 rounded-lg mt-0.5 ${cfg.bg}`}>
                      <Icon size={16} className={cfg.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${cfg.bg} ${cfg.color}`}>
                          {cfg.label}
                        </span>
                        {alerta.producto?.categoria && (
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: alerta.producto.categoria.color ?? '#6366f1' }}>
                            {alerta.producto.categoria.nombre}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 font-mono">{alerta.producto?.codigoProducto}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{alerta.producto?.descripcion}</p>
                      <p className="text-xs text-slate-500 mt-0.5">{alerta.mensaje}</p>
                      <div className="flex items-center gap-4 mt-1 flex-wrap">
                        <span className="text-xs text-slate-400">
                          Stock actual: <span className="font-medium text-slate-700">{alerta.producto?.stockActual} {alerta.producto?.unidadMedida}</span>
                        </span>
                        {alerta.valorUmbral !== null && (
                          <span className="text-xs text-slate-400">
                            Umbral: <span className="font-medium text-slate-700">{alerta.valorUmbral}</span>
                          </span>
                        )}
                        <span className="text-xs text-slate-400">
                          {new Date(alerta.createdAt).toLocaleDateString('es-CL', {
                            day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
                          })}
                        </span>
                      </div>
                    </div>
                    <div className="flex gap-2 shrink-0">
                      {alerta.estado === 'ACTIVA' && (
                        <button onClick={() => acknowledge(alerta.id)} disabled={isProcesando}
                          className="px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50 transition-colors">
                          Reconocer
                        </button>
                      )}
                      <button onClick={() => resolve(alerta.id)} disabled={isProcesando}
                        className="px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-700 disabled:opacity-50 transition-colors">
                        Resolver
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}