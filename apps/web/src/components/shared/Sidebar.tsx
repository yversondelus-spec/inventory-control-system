'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Package, Upload, Bell, BarChart2, Settings, LogOut, ClipboardList, PlusCircle, Users,
} from 'lucide-react';

const navItems = [
  { href: '/dashboard',   label: 'Dashboard',      icon: LayoutDashboard },
  { href: '/inventory',   label: 'Inventario',      icon: Package },
  { href: '/upload-sap',  label: 'Upload SAP',      icon: Upload },
  { href: '/ingreso',     label: 'Ingreso Manual',  icon: PlusCircle },
  { href: '/alerts',      label: 'Alertas',         icon: Bell },
  { href: '/solicitudes', label: 'Solicitudes',     icon: ClipboardList },
  { href: '/reports',     label: 'Reportes',        icon: BarChart2 },
  { href: '/settings',    label: 'Configuración',   icon: Settings },
  { href: '/usuarios',    label: 'Usuarios',        icon: Users },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  function handleLogout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    router.push('/login');
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col" style={{ backgroundColor: '#0a1628' }}>
      <div className="p-6 border-b" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-white text-sm"
            style={{ backgroundColor: '#1a6ebf' }}>
            AS
          </div>
          <div>
            <h1 className="text-base font-bold text-white tracking-wider">AEROSAN</h1>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)', letterSpacing: '0.05em' }}>
              GROUND HANDLING SERVICES
            </p>
          </div>
        </div>
        <p className="text-xs mt-3 font-medium" style={{ color: 'rgba(255,255,255,0.35)' }}>
          Sistema de Abastecimiento
        </p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link key={item.href} href={item.href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all"
              style={{
                backgroundColor: isActive ? '#1a6ebf' : 'transparent',
                color: isActive ? '#ffffff' : 'rgba(255,255,255,0.55)',
              }}
              onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
              onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t" style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <button onClick={handleLogout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm w-full transition-all"
          style={{ color: 'rgba(255,255,255,0.45)' }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'rgba(255,255,255,0.06)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; }}>
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}