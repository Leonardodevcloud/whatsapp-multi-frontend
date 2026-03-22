// src/components/layout/AppLayout.jsx
// NOVO: Menu horizontal (top bar) + logo com texto "Synapse Chat" + indicador WS

import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { useThemeStore } from '../../stores/themeStore';
import { Avatar } from '../ui';
import {
  MessageSquare, Users, Inbox, BarChart3, Settings, LogOut,
  Sun, Moon, BookOpen, Tag, Wifi, WifiOff, Eye, Sparkles,
  Camera, X, Lock, User,
} from 'lucide-react';
import { SynapseIconSolid } from '../ui/SynapseLogo';
import { cn } from '../../lib/utils';
import { useEffect, useState, useRef } from 'react';
import api from '../../lib/api';
import toast from 'react-hot-toast';
import wsClient from '../../lib/websocket';
import GlobalSearch from './GlobalSearch';

const NAV_ITEMS = [
  { to: '/tickets', icone: MessageSquare, label: 'Chamados' },
  { to: '/contacts', icone: Users, label: 'Contatos' },
  { to: '/quick-replies', icone: BookOpen, label: 'Respostas' },
  { to: '/reports', icone: BarChart3, label: 'Relatórios' },
];

const NAV_ADMIN = [
  { to: '/supervision', icone: Eye, label: 'Supervisão' },
  { to: '/ia-config', icone: Sparkles, label: 'IA' },
  { to: '/settings', icone: Settings, label: 'Config' },
];

export default function AppLayout() {
  const { usuario, logout } = useAuthStore();
  const { tema, toggleTema } = useThemeStore();
  const navigate = useNavigate();
  const [waStatus, setWaStatus] = useState(null);
  const [wsStatus, setWsStatus] = useState('desconectado');
  const [perfilAberto, setPerfilAberto] = useState(false);

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

          {/* Avatar — clicável abre perfil */}
          <button onClick={() => setPerfilAberto(true)} className="ml-1 relative group">
            <Avatar nome={usuario?.nome} src={usuario?.avatar_url} size="sm" online />
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/10 transition-colors" />
          </button>
        </div>
      </header>

      {/* Modal Perfil */}
      {perfilAberto && <PerfilModal usuario={usuario} onFechar={() => setPerfilAberto(false)} />}

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

function PerfilModal({ usuario, onFechar }) {
  const [nome, setNome] = useState(usuario?.nome || '');
  const [senha, setSenha] = useState('');
  const [senhaConfirm, setSenhaConfirm] = useState('');
  const [preview, setPreview] = useState(usuario?.avatar_url || '');
  const [avatarBase64, setAvatarBase64] = useState('');
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef(null);
  const { verificarSessao } = useAuthStore();

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => {
      setPreview(reader.result);
      setAvatarBase64(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSalvar = async () => {
    if (senha && senha.length < 8) { toast.error('Senha mínima 8 caracteres'); return; }
    if (senha && senha !== senhaConfirm) { toast.error('Senhas não conferem'); return; }

    setSalvando(true);
    try {
      const body = {};
      if (nome.trim() !== usuario?.nome) body.nome = nome.trim();
      if (senha) body.senha = senha;
      if (avatarBase64) body.avatar_base64 = avatarBase64;

      if (Object.keys(body).length === 0) { toast('Nenhuma alteração'); setSalvando(false); return; }

      await api.patch('/api/auth/me', body);
      toast.success('Perfil atualizado!');
      await verificarSessao();
      onFechar();
    } catch (err) { toast.error(err.message || 'Erro ao salvar'); }
    setSalvando(false);
  };

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-50" onClick={onFechar} />
      <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-sm bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl shadow-2xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold">Meu perfil</h2>
          <button onClick={onFechar} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]"><X className="w-4 h-4" /></button>
        </div>

        {/* Avatar */}
        <div className="flex justify-center mb-5">
          <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
            {preview ? (
              <img src={preview} alt="" className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-border)]" />
            ) : (
              <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center border-2 border-[var(--color-border)]">
                <span className="text-2xl font-semibold text-primary">{nome?.charAt(0)?.toUpperCase()}</span>
              </div>
            )}
            <div className="absolute inset-0 rounded-full bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
              <Camera className="w-5 h-5 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
          </div>
        </div>

        {/* Nome */}
        <div className="mb-3">
          <label className="text-2xs text-[var(--color-text-muted)] font-medium mb-1 block">Nome</label>
          <div className="relative">
            <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Seu nome"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {/* Email (readonly) */}
        <div className="mb-3">
          <label className="text-2xs text-[var(--color-text-muted)] font-medium mb-1 block">Email</label>
          <input value={usuario?.email || ''} readOnly
            className="w-full h-10 px-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm opacity-50 cursor-not-allowed" />
        </div>

        {/* Senha */}
        <div className="mb-3">
          <label className="text-2xs text-[var(--color-text-muted)] font-medium mb-1 block">Nova senha (opcional)</label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} placeholder="Mínimo 8 caracteres"
              className="w-full h-10 pl-10 pr-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        </div>

        {senha && (
          <div className="mb-3">
            <label className="text-2xs text-[var(--color-text-muted)] font-medium mb-1 block">Confirmar senha</label>
            <input type="password" value={senhaConfirm} onChange={(e) => setSenhaConfirm(e.target.value)} placeholder="Repetir senha"
              className="w-full h-10 px-3 rounded-xl bg-[var(--color-surface-elevated)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
          </div>
        )}

        <button onClick={handleSalvar} disabled={salvando}
          className="w-full h-10 mt-2 rounded-xl bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors disabled:opacity-50">
          {salvando ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </>
  );
}
