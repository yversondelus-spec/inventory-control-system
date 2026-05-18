'use client';

import { useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api-client';
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react';

interface UploadRecord {
  id: string;
  nombreArchivo: string;
  estado: string;
  totalFilas: number | null;
  filasProcessadas: number | null;
  errores: number | null;
  createdAt: string;
}

const ESTADO_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDIENTE:   { label: 'Pendiente',   color: 'text-yellow-600 bg-yellow-50', icon: Clock },
  PROCESANDO:  { label: 'Procesando',  color: 'text-blue-600 bg-blue-50',     icon: Clock },
  COMPLETADO:  { label: 'Completado',  color: 'text-green-600 bg-green-50',   icon: CheckCircle },
  ERROR:       { label: 'Error',       color: 'text-red-600 bg-red-50',       icon: XCircle },
  PARCIAL:     { label: 'Con errores', color: 'text-orange-600 bg-orange-50', icon: AlertCircle },
};

export default function UploadSAPPage() {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [uploads, setUploads] = useState<UploadRecord[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [lastResult, setLastResult] = useState<{ success: boolean; message: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetchHistory();
  }, []);

  async function fetchHistory() {
    try {
      const res = await api.uploads.list();
      const items = res.data?.data?.data?.data ?? res.data?.data?.data ?? res.data?.data ?? res.data ?? [];
      setUploads(Array.isArray(items) ? items : []);
    } catch {
      setUploads([]);
    } finally {
      setLoadingHistory(false);
    }
  }

  async function handleFile(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (!['xlsx', 'xls', 'csv'].includes(ext ?? '')) {
      setLastResult({ success: false, message: 'Solo se aceptan archivos .xlsx, .xls o .csv' });
      return;
    }

    setUploading(true);
    setProgress(0);
    setLastResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.uploads.create(formData, (p) => setProgress(p));
      setLastResult({ success: true, message: `"${file.name}" subido correctamente. Procesando...` });
      setTimeout(fetchHistory, 2000);
    } catch {
      setLastResult({ success: false, message: `Error al subir "${file.name}"` });
    } finally {
      setUploading(false);
      setProgress(0);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
  }

  return (
    <div className="p-8 space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Upload SAP</h1>
        <p className="text-gray-500 text-sm mt-1">Importa inventario desde archivos Excel o CSV exportados de SAP</p>
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all cursor-pointer
          ${dragging ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50 hover:border-gray-300 hover:bg-gray-100'}
          ${uploading ? 'cursor-not-allowed opacity-70' : ''}`}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={onInputChange}
          disabled={uploading}
        />

        <div className="flex flex-col items-center gap-3">
          <div className={`p-4 rounded-full ${dragging ? 'bg-blue-100' : 'bg-white border border-gray-200'}`}>
            <Upload size={28} className={dragging ? 'text-blue-500' : 'text-gray-400'} />
          </div>

          {uploading ? (
            <div className="w-full max-w-xs space-y-2">
              <p className="text-sm font-medium text-gray-700">Subiendo archivo...</p>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-500">{progress}%</p>
            </div>
          ) : (
            <div>
              <p className="text-sm font-medium text-gray-700">
                Arrastra tu archivo aquí o <span className="text-blue-500">haz click para seleccionar</span>
              </p>
              <p className="text-xs text-gray-400 mt-1">Soporta .xlsx, .xls y .csv</p>
            </div>
          )}
        </div>
      </div>

      {lastResult && (
        <div className={`flex items-center gap-3 p-4 rounded-xl text-sm font-medium
          ${lastResult.success ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
          {lastResult.success
            ? <CheckCircle size={18} className="shrink-0" />
            : <XCircle size={18} className="shrink-0" />}
          {lastResult.message}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-gray-800">Historial de cargas</h2>
          <button
            onClick={fetchHistory}
            className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
          >
            Actualizar
          </button>
        </div>

        {loadingHistory ? (
          <div className="p-6 space-y-3 animate-pulse">
            {[...Array(3)].map((_, i) => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
          </div>
        ) : uploads.length === 0 ? (
          <div className="px-6 py-10 text-center text-gray-400 text-sm">
            <FileSpreadsheet size={32} className="mx-auto mb-2 opacity-40" />
            <p>No hay cargas anteriores</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Archivo</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Filas</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Procesadas</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Errores</th>
                <th className="text-right px-6 py-3 font-medium text-gray-500">Fecha</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {uploads.map((u) => {
                const cfg = ESTADO_CONFIG[u.estado] ?? ESTADO_CONFIG['PENDIENTE'];
                const Icon = cfg.icon;
                return (
                  <tr key={u.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-green-500 shrink-0" />
                      <span className="text-gray-800 truncate max-w-xs">{u.nombreArchivo}</span>
                    </td>
                    <td className="px-6 py-3 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        <Icon size={12} />
                        {cfg.label}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-right text-gray-500">{u.totalFilas ?? '—'}</td>
                    <td className="px-6 py-3 text-right text-gray-500">{u.filasProcessadas ?? '—'}</td>
                    <td className={`px-6 py-3 text-right font-medium ${(u.errores ?? 0) > 0 ? 'text-red-500' : 'text-gray-400'}`}>
                      {u.errores ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-right text-gray-400 text-xs">
                      {new Date(u.createdAt).toLocaleDateString('es-CL', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit',
                      })}
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