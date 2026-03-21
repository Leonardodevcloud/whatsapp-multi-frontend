// src/components/layout/AppLayout.jsx
// NOVO: Menu horizontal (top bar) + logo com texto "Synapse Chat" + indicador WS

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Avatar } from '../ui';
import {
  MessageSquare, Users, Inbox, BarChart3, Settings, LogOut,
  Sun, Moon, BookOpen, Tag, Wifi, WifiOff,
} from 'lucide-react';
import { SynapseIconSolid } from '../ui/SynapseLogo';
import { cn } from '../../lib/utils';
import { useEffect, useState } from 'react';
import api from '../../lib/api';
import wsClient from '../../lib/websocket';
import GlobalSearch from './GlobalSearch';

const NAV_ITEMS = [
  { to: '/tickets', icone: MessageSquare, label: 'Chamados' },
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
  const [wsStatus, setWsStatus] = useState('desconectado');

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

  // Observar status do WebSocket
  useEffect(() => {
    const cleanup = wsClient.onStatus((status) => setWsStatus(status));
    return cleanup;
  }, []);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const isAdmin = usuario?.perfil === 'admin';

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      {/* Top bar horizontal */}
      <header className="h-14 bg-[var(--color-surface)] border-b border-[var(--color-border)] flex items-center px-4 shrink-0 gap-4 z-20">
        {/* Logo + Synapse Chat */}
        <div className="flex items-center gap-2.5 shrink-0 mr-2">
          <SynapseIconSolid size={32} />
          <span className="text-[15px] font-display font-semibold tracking-tight text-[var(--color-text)]">
            Synapse Chat
          </span>
        </div>

        {/* Separador */}
        <div className="w-px h-7 bg-[var(--color-border)] shrink-0" />

        {/* Nav principal — horizontal */}
        <nav className="flex items-center gap-0.5 flex-1 overflow-x-auto scrollbar-none">
          {NAV_ITEMS.map(({ to, icone: Icone, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
                  isActive
                    ? 'bg-primary text-white shadow-sm shadow-primary/25'
                    : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]'
                )
              }
            >
              <Icone className="w-4 h-4" />
              <span>{label}</span>
            </NavLink>
          ))}

          {isAdmin && (
            <>
              <div className="w-px h-6 bg-[var(--color-border)] mx-1 shrink-0" />
              {NAV_ADMIN.map(({ to, icone: Icone, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150 whitespace-nowrap',
                      isActive
                        ? 'bg-primary text-white shadow-sm shadow-primary/25'
                        : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)]'
                    )
                  }
                >
                  <Icone className="w-4 h-4" />
                  <span>{label}</span>
                </NavLink>
              ))}
            </>
          )}
        </nav>

        {/* Ações — lado direito */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Status WebSocket (real-time) */}
          <div
            title={
              wsStatus === 'conectado' ? 'Real-time ativo'
              : wsStatus === 'conectando' ? 'Reconectando...'
              : 'Real-time offline'
            }
            className="w-9 h-9 rounded-lg flex items-center justify-center"
          >
            <div className={cn(
              'w-2 h-2 rounded-full transition-colors',
              wsStatus === 'conectado' ? 'bg-emerald-500'
              : wsStatus === 'conectando' ? 'bg-amber-400 animate-pulse'
              : 'bg-red-400'
            )} />
          </div>

          {/* Status WhatsApp */}
          <button
            title={waStatus?.conectado ? 'WhatsApp conectado' : 'WhatsApp desconectado'}
            onClick={() => isAdmin && navigate('/settings/whatsapp')}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            {waStatus?.conectado ? (
              <Wifi className="w-4 h-4 text-emerald-500" />
            ) : (
              <WifiOff className="w-4 h-4 text-red-400 animate-pulse-dot" />
            )}
          </button>

          {/* Dark mode */}
          <button
            onClick={toggleTema}
            title={tema === 'dark' ? 'Modo claro' : 'Modo escuro'}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            {tema === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Logout */}
          <button
            onClick={handleLogout}
            title="Sair"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Avatar */}
          <Avatar nome={usuario?.nome} size="sm" online className="ml-1" />
        </div>
      </header>

      {/* Banner de reconexão — aparece quando WS está offline */}
      {wsStatus !== 'conectado' && (
        <div className={cn(
          'px-4 py-1.5 text-center text-xs font-medium transition-all',
          wsStatus === 'conectando'
            ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
            : 'bg-red-50 text-red-700 dark:bg-red-900/20 dark:text-red-400'
        )}>
          {wsStatus === 'conectando' ? 'Reconectando ao servidor...' : 'Conexão real-time perdida — tentando reconectar'}
        </div>
      )}

      {/* Conteúdo */}
      <main className="flex-1 overflow-hidden">
        <Outlet />
      </main>

      {/* Busca global (Ctrl+K) */}
      <GlobalSearch />
    </div>
  );
}
