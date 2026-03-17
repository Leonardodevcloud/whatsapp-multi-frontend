// src/components/layout/AppLayout.jsx
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Avatar } from '../ui';
import {
  MessageSquare, Users, Inbox, BarChart3, Settings, LogOut,
  Sun, Moon, Zap, BookOpen, Tag, Wifi, WifiOff,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import GlobalSearch from './GlobalSearch';

const NAV_ITEMS = [
  { to: '/tickets', icone: MessageSquare, label: 'Tickets' },
  { to: '/contacts', icone: Users, label: 'Contatos' },
  { to: '/quick-replies', icone: BookOpen, label: 'Respostas' },
  { to: '/queues', icone: Inbox, label: 'Filas' },
  { to: '/reports', icone: BarChart3, label: 'Relatórios' },
];

const NAV_ADMIN = [
  { to: '/users', icone: Users, label: 'Atendentes' },
  { to: '/settings', icone: Settings, label: 'Config' },
];

export default function AppLayout() {
  const { usuario, logout } = useAuthStore();
  const { tema, toggleTema } = useThemeStore();
  const navigate = useNavigate();
  const [waStatus, setWaStatus] = useState(null);

  useEffect(() => {
    const verificar = async () => {
      try {
        const status = await api.get('/api/whatsapp/status');
        setWaStatus(status);
      } catch { /* ignore */ }
    };
    verificar();
    const interval = setInterval(verificar, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = usuario?.perfil === 'admin';

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar de navegação */}
      <aside className="w-[68px] bg-[var(--color-surface)] border-r border-[var(--color-border)] flex flex-col items-center py-4 shrink-0">
        {/* Logo */}
        <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center mb-6">
          <Zap className="w-5 h-5 text-white" />
        </div>

        {/* Nav principal */}
        <nav className="flex-1 flex flex-col items-center gap-1">
          {NAV_ITEMS.map(({ to, icone: Icone, label }) => (
            <NavLink
              key={to}
              to={to}
              title={label}
              className={({ isActive }) =>
                cn(
                  'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150',
                  isActive
                    ? 'bg-primary text-white shadow-lg shadow-primary/25'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]'
                )
              }
            >
              <Icone className="w-5 h-5" />
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="w-6 h-px bg-[var(--color-border)] my-2" />
              {NAV_ADMIN.map(({ to, icone: Icone, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  title={label}
                  className={({ isActive }) =>
                    cn(
                      'w-11 h-11 rounded-xl flex items-center justify-center transition-all duration-150',
                      isActive
                        ? 'bg-primary text-white shadow-lg shadow-primary/25'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]'
                    )
                  }
                >
                  <Icone className="w-5 h-5" />
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Footer sidebar */}
        <div className="flex flex-col items-center gap-2">
          {/* Status WhatsApp */}
          <button
            title={waStatus?.conectado ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
            onClick={() => isAdmin && navigate('/settings/whatsapp')}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            {waStatus?.conectado ? (
              <Wifi className="w-5 h-5 text-emerald-500" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-400 animate-pulse-dot" />
            )}
          </button>

          {/* Dark mode */}
          <button
            onClick={toggleTema}
            title={tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            {tema === 'dark' ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sair"
            className="w-11 h-11 rounded-xl flex items-center justify-center text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-5 h-5" />
          </button>

          {/* Avatar */}
          <Avatar nome={usuario?.nome} size="md" online className="mt-1" />
        </div>
      </aside>

      {/* Conteúdo */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Busca global (Ctrl+K) */}
      <GlobalSearch />
    </div>
  );
}
