'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api-client';
import { useAuthStore } from '@/stores/auth.store';

export default function LoginPage() {
  const router = useRouter();
  const { setAuth } = useAuthStore();
  const [email, setEmail] = useState('admin@inventorycontrol.com');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.auth.login(email, password);
      const { user, accessToken, refreshToken } = res.data.data;
      localStorage.setItem('access_token', accessToken);
      localStorage.setItem('refresh_token', refreshToken);
      setAuth(user, { accessToken, refreshToken });
      router.push('/dashboard');
    } catch {
      setError('Credenciales inválidas. Verifica tu email y contraseña.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="min-h-screen w-full flex items-center justify-center relative"
      style={{
        backgroundImage: 'url(/aerosan-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
      {/* Overlay oscuro */}
      <div className="absolute inset-0" style={{ backgroundColor: 'rgba(10, 22, 40, 0.78)' }} />

      {/* Card */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-3 mb-3">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-white text-lg"
              style={{ backgroundColor: '#1a6ebf' }}>
              AS
            </div>
            <div className="text-left">
              <h1 className="text-2xl font-bold text-white tracking-widest">AEROSAN</h1>
              <p className="text-xs tracking-widest" style={{ color: 'rgba(255,255,255,0.5)' }}>
                GROUND HANDLING SERVICES
              </p>
            </div>
          </div>
          <p className="text-sm mt-2" style={{ color: 'rgba(255,255,255,0.6)' }}>
            Sistema de Control de Inventario
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl p-8" style={{ backgroundColor: 'rgba(255,255,255,0.07)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255,255,255,0.12)' }}>
          <h2 className="text-lg font-semibold text-white mb-6">Iniciar sesión</h2>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2.5 rounded-lg text-sm text-white focus:outline-none"
                style={{
                  backgroundColor: 'rgba(255,255,255,0.08)',
                  border: '1px solid rgba(255,255,255,0.15)',
                }}
                placeholder="correo@aerosan.cl"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.6)' }}>
                Contraseña
              </label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg text-sm text-white focus:outline-none pr-12"
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.08)',
                    border: '1px solid rgba(255,255,255,0.15)',
                  }}
                  placeholder="••••••••"
                  required
                />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-xs"
                  style={{ color: 'rgba(255,255,255,0.4)' }}>
                  {showPass ? 'Ocultar' : 'Ver'}
                </button>
              </div>
            </div>

            {error && (
              <div className="p-3 rounded-lg text-sm" style={{ backgroundColor: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: '1px solid rgba(239,68,68,0.3)' }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 rounded-lg font-medium text-sm text-white transition-all mt-2"
              style={{ backgroundColor: loading ? '#1a4e8a' : '#1a6ebf' }}
            >
              {loading ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: 'rgba(255,255,255,0.25)' }}>
          © 2026 Aerosan Ground Handling Services
        </p>
      </div>
    </div>
  );
}