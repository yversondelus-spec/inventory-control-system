'use client';

import { useState, useEffect } from 'react';
import { Users, Plus, Save, X, Shield, UserCheck, UserX } from 'lucide-react';

const ROLES = ['ADMINISTRADOR', 'SUPERVISOR', 'OPERADOR'];

const ROL_COLORS: Record<string, string> = {
  ADMINISTRADOR: 'bg-red-50 text-red-700',
  SUPERVISOR: 'bg-blue-50 text-blue-700',
  OPERADOR: 'bg-gray-50 text-gray-700',
};

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [mensaje, setMensaje] = useState<{ tipo: 'ok' | 'error'; texto: string } | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({
    email: '',
    nombre: '',
    apellido: '',
    role: 'OPERADOR',
    password: '',
  });

  useEffect(() => { fetchUsuarios(); }, []);

  async function fetchUsuarios() {
    setLoading(true);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/users', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      const items = json?.data ?? json ?? [];
      setUsuarios(Array.isArray(items) ? items : []);
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al cargar usuarios.' });
    }
    setLoading(false);
  }

  async function crearUsuario() {
    setSaving(true);
    setMensaje(null);
    try {
      const token = localStorage.getItem('access_token');
      const res = await fetch('${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(form),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err?.error?.message ?? 'Error al crear usuario');
      }
      setMensaje({ tipo: 'ok', texto: `Usuario ${form.email} creado correctamente.` });
      setForm({ email: '', nombre: '', apellido: '', role: 'OPERADOR', password: '' });
      setShowForm(false);
      fetchUsuarios();
    } catch (e: any) {
      setMensaje({ tipo: 'error', texto: e.message });
    }
    setSaving(false);
  }

  async function cambiarRol(id: string, role: string) {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role }),
      });
      fetchUsuarios();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al cambiar rol.' });
    }
  }

  async function toggleActivo(id: string, activo: boolean) {
    try {
      const token = localStorage.getItem('access_token');
      await fetch(`${process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1"}/users/${id}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ activo }),
      });
      fetchUsuarios();
    } catch {
      setMensaje({ tipo: 'error', texto: 'Error al cambiar estado.' });
    }
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 text-sm mt-1">{usuarios.length} usuarios registrados</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
          {showForm ? <X size={16} /> : <Plus size={16} />}
          {showForm ? 'Cancelar' : 'Nuevo Usuario'}
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

      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-2xl">
          <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Users size={18} /> Nuevo Usuario
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Nombre</label>
              <input value={form.nombre}
                onChange={e => setForm({ ...form, nombre: e.target.value })}
                placeholder="Nombre"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Apellido</label>
              <input value={form.apellido}
                onChange={e => setForm({ ...form, apellido: e.target.value })}
                placeholder="Apellido"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Email</label>
            <input value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              placeholder="usuario@aerosan.com"
              type="email"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Contraseña</label>
              <input value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                placeholder="Mínimo 8 caracteres"
                type="password"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Rol</label>
              <select value={form.role}
                onChange={e => setForm({ ...form, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500">
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>
          </div>
          <button onClick={crearUsuario}
            disabled={saving || !form.email || !form.nombre || !form.password}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-lg hover:bg-gray-700 disabled:opacity-50 transition-colors">
            <Save size={16} />
            {saving ? 'Guardando...' : 'Crear Usuario'}
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-gray-400">Cargando usuarios...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Usuario</th>
                <th className="text-left px-6 py-3 font-medium text-gray-500">Email</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Rol</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Estado</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Último acceso</th>
                <th className="text-center px-6 py-3 font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-6 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600">
                        {u.nombre?.[0]}{u.apellido?.[0]}
                      </div>
                      <span className="font-medium text-gray-900">{u.nombre} {u.apellido}</span>
                    </div>
                  </td>
                  <td className="px-6 py-3 text-gray-500">{u.email}</td>
                  <td className="px-6 py-3 text-center">
                    <select value={u.role}
                      onChange={e => cambiarRol(u.id, e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 cursor-pointer ${ROL_COLORS[u.role] ?? 'bg-gray-50 text-gray-700'}`}>
                      {ROLES.map(r => <option key={r}>{r}</option>)}
                    </select>
                  </td>
                  <td className="px-6 py-3 text-center">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      u.activo ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'
                    }`}>
                      {u.activo ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="px-6 py-3 text-center text-gray-400 text-xs">
                    {u.lastLoginAt
                      ? new Date(u.lastLoginAt).toLocaleDateString('es-CL')
                      : 'Nunca'}
                  </td>
                  <td className="px-6 py-3 text-center">
                    <button onClick={() => toggleActivo(u.id, !u.activo)}
                      className={`p-1.5 rounded-lg transition-colors ${
                        u.activo
                          ? 'text-red-400 hover:bg-red-50'
                          : 'text-green-500 hover:bg-green-50'
                      }`}
                      title={u.activo ? 'Desactivar' : 'Activar'}>
                      {u.activo ? <UserX size={16} /> : <UserCheck size={16} />}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
