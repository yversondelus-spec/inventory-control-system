'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import {
  Package, TrendingUp, Activity, ShieldCheck, ArrowUpRight,
  type LucideIcon,
} from 'lucide-react';

interface Summary {
  totalProductos: number;
  productosActivos: number;
  stockNormal: number;
  stockEstableUnidades: number;
  stockEstablePorcentaje: number;
  coberturaPromedio: number;
}

interface Producto {
  id: string;
  codigoProducto: string;
  descripcion: string;
  stockActual: number;
  stockMinimo: number;
  categoria?: { nombre: string; color: string };
  unidadMedida: string;
  diasCobertura: number | null;
  criticidad: string;
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

function ProductRow({ p, onClick }: { p: Producto; onClick: () => void }) {
  const pct = p.stockMinimo > 0 ? Math.min(100, Math.round((p.stockActual / p.stockMinimo) * 100)) : 100;

  return (
    <button
      onClick={onClick}
      className="w-full grid grid-cols-[100px_1fr_90px_120px_90px] items-center px-5 py-2.5 border-t border-slate-100 first:border-t-0 hover:bg-slate-50 transition-colors text-left group"
    >
      <span className="text-[11px] font-mono text-slate-400 truncate">{p.codigoProducto}</span>
      <span className="text-[13px] text-slate-700 truncate pr-2 group-hover:text-slate-900">
        {p.descripcion}
      </span>
      <span className="text-[13px] font-medium text-slate-800 text-right">
        {p.stockActual.toLocaleString('es-CL')} {p.unidadMedida}
      </span>
      <span className="px-3">
        <span className="block h-1 rounded-full bg-slate-100 overflow-hidden">
          <span className="block h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
        </span>
        <span className="text-[11px] mt-1 block text-emerald-600">
          {p.diasCobertura !== null ? `${p.diasCobertura}d` : '—'}
        </span>
      </span>
      <span className="text-right">
        <span className="inline-block text-[11px] font-medium px-2 py-0.5 rounded-md text-emerald-700 bg-emerald-50">
          Estable
        </span>
      </span>
    </button>
  );
}

export default function StockEstablePage() {
  const router = useRouter();
  const [summary, setSummary] = useState<Summary | null>(null);
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroCategoria, setFiltroCategoria] = useState('');
  const [categorias, setCategorias] = useState<string[]>([]);

  useEffect(() => {
    Promise.all([
      api.inventory.summary(),
      api.products.list({ 
        limit: 500, 
        sortBy: 'stockActual', 
        sortOrder: 'desc',
        estado: 'NORMAL',
      }),
    ])
      .then(([summaryRes, productsRes]) => {
        setSummary(summaryRes.data?.data ?? summaryRes.data);

        const items = productsRes.data?.data?.data ?? productsRes.data?.data ?? productsRes.data ?? [];
        const all = Array.isArray(items) ? items : [];
        
        // Filtrar productos con stock estable (NORMAL)
        const stable = all.filter((p: Producto) => p.criticidad === 'BAJO' || p.criticidad === 'NORMAL');
        setProductos(stable);

        // Extraer categorías únicas
        const cats = [...new Set(stable.map((p: Producto) => p.categoria?.nombre).filter((c): c is string => Boolean(c)))];
        setCategorias(cats);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const goToProduct = (id: string) => router.push(`/inventory/${id}`);

  const productosFiltrados = filtroCategoria 
    ? productos.filter(p => p.categoria?.nombre === filtroCategoria)
    : productos;

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
          <p className="text-[11px] uppercase tracking-[0.3em] text-slate-500">Inventario</p>
          <h1 className="mt-3 text-3xl font-semibold text-slate-950">Stock estable y óptimo</h1>
        </div>
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center">
          <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm text-slate-600 shadow-sm">
            {new Date().toLocaleDateString('es-CL', { month: 'numeric', day: 'numeric', year: 'numeric' })}
          </span>
          <button className="inline-flex items-center justify-center rounded-full bg-slate-950 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-slate-800">
            Exportar
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KPICard
          title="Stock Estable"
          value={`${summary?.stockEstableUnidades?.toLocaleString('es-CL') ?? '0'} UN`}
          subtitle={`${summary?.stockEstablePorcentaje?.toFixed(1) ?? '0.0'}% del total`}
          icon={ShieldCheck}
          accent="#10B981"
        />
        <KPICard
          title="Productos Estables"
          value={summary?.stockNormal ?? 0}
          subtitle="Con cobertura óptima"
          icon={TrendingUp}
          accent="#0891B2"
        />
        <KPICard
          title="Cobertura Promedio"
          value={`${summary?.coberturaPromedio?.toFixed(1) ?? '0.0'} días`}
          subtitle="Stock disponible"
          icon={Activity}
          accent="#7C3AED"
        />
        <KPICard
          title="Activos"
          value={summary?.productosActivos ?? 0}
          subtitle="Total de productos"
          icon={Package}
          accent="#06B6D4"
        />
      </div>

      <div className="bg-white rounded-[32px] border border-slate-200 overflow-hidden shadow-sm">
        <div className="px-6 py-6 border-b border-slate-100">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">Productos con stock estable</p>
              <p className="text-sm text-slate-500 mt-1">{productosFiltrados.length} productos con cobertura óptima</p>
            </div>
            {categorias.length > 0 && (
              <select
                value={filtroCategoria}
                onChange={(e) => setFiltroCategoria(e.target.value)}
                className="px-4 py-2 rounded-lg border border-slate-200 bg-white text-sm text-slate-900 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-950 focus:ring-offset-2"
              >
                <option value="">Todas las categorías</option>
                {categorias.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}
          </div>
        </div>

        <div className="grid grid-cols-[100px_1fr_90px_120px_90px] gap-2 px-6 py-4 text-[11px] font-semibold uppercase tracking-[0.15em] text-slate-400 bg-slate-50">
          <div>Código</div>
          <div>Producto</div>
          <div className="text-right">Stock</div>
          <div className="text-center">Cobertura</div>
          <div className="text-right">Estado</div>
        </div>

        <div className="max-h-[600px] overflow-y-auto">
          {productosFiltrados.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-400">
              No hay productos con stock estable en esta categoría.
            </div>
          ) : (
            productosFiltrados.map((p) => (
              <ProductRow key={p.id} p={p} onClick={() => goToProduct(p.id)} />
            ))
          )}
        </div>

        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50">
          <p className="text-xs text-slate-500 text-center">
            {productosFiltrados.length} de {productos.length} productos · última actualización hace 2 minutos
          </p>
        </div>
      </div>
    </div>
  );
}

