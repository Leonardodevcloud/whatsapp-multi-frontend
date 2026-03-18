// src/App.jsx
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import { useEffect, useState } from 'react';

import { useAuthStore } from './stores/authStore';
import { useThemeStore } from './stores/themeStore';
import { useTicketStore } from './stores/ticketStore';
import wsClient from './lib/websocket';
import SplashScreen from './components/ui/SplashScreen';

import AppLayout from './components/layout/AppLayout';
import LoginPage from './pages/LoginPage';
import TicketsPage from './pages/TicketsPage';
import ContactsPage from './pages/ContactsPage';
import QueuesPage from './pages/QueuesPage';
import UsersPage from './pages/UsersPage';
import QuickRepliesPage from './pages/QuickRepliesPage';
import SettingsPage from './pages/SettingsPage';
import ReportsPage from './pages/ReportsPage';

import { Skeleton } from './components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

// Rota protegida — redireciona para login se não autenticado
function RotaProtegida() {
  const { logado, carregando } = useAuthStore();

  if (carregando) {
    return <SplashScreen onFinish={() => {}} />;
  }

  if (!logado) return <Navigate to="/login" replace />;

  return <Outlet />;
}

// Rota admin
function RotaAdmin() {
  const usuario = useAuthStore((s) => s.usuario);
  if (usuario?.perfil !== 'admin') return <Navigate to="/tickets" replace />;
  return <Outlet />;
}

export default function App() {
  const { verificarSessao } = useAuthStore();
  const { inicializarTema } = useThemeStore();
  const logado = useAuthStore((s) => s.logado);

  // Inicializar tema
  useEffect(() => {
    inicializarTema();
  }, []);

  // Verificar sessão ao montar
  useEffect(() => {
    verificarSessao();
  }, []);

  // Conectar WebSocket quando logado
  useEffect(() => {
    if (logado) {
      // Para WS auth precisamos do access_token — buscar via cookie não funciona em WS
      // Usar endpoint que retorna token temporário, ou passar via cookie
      // Simplificação: usar fetch para pegar token e conectar WS
      const conectarWS = async () => {
        try {
          const res = await fetch('/api/auth/me', { credentials: 'include' });
          if (res.ok) {
            // Extrair token do cookie (não ideal, mas funciona com same-origin)
            // Em produção, criar endpoint /api/auth/ws-token
            const cookies = document.cookie.split(';').reduce((acc, c) => {
              const [k, v] = c.trim().split('=');
              acc[k] = v;
              return acc;
            }, {});
            const token = cookies['access_token'];
            if (token) wsClient.connect(token);
          }
        } catch {
          // WS opcional — não bloquear app
        }
      };
      conectarWS();

      return () => wsClient.disconnect();
    }
  }, [logado]);

  // Som de notificação — duas notas suaves tipo WhatsApp
  useEffect(() => {
    if (!logado) return;

    let audioCtx = null;

    const tocarSom = () => {
      try {
        if (!audioCtx) audioCtx = new AudioContext();
        const now = audioCtx.currentTime;

        // Nota 1
        const osc1 = audioCtx.createOscillator();
        const gain1 = audioCtx.createGain();
        osc1.connect(gain1);
        gain1.connect(audioCtx.destination);
        osc1.frequency.value = 587; // D5
        osc1.type = 'sine';
        gain1.gain.setValueAtTime(0.06, now);
        gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
        osc1.start(now);
        osc1.stop(now + 0.15);

        // Nota 2 (mais aguda, com delay)
        const osc2 = audioCtx.createOscillator();
        const gain2 = audioCtx.createGain();
        osc2.connect(gain2);
        gain2.connect(audioCtx.destination);
        osc2.frequency.value = 784; // G5
        osc2.type = 'sine';
        gain2.gain.setValueAtTime(0.04, now + 0.12);
        gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc2.start(now + 0.12);
        osc2.stop(now + 0.3);
      } catch {
        // Ignorar se audio não disponível
      }
    };

    const cleanup = wsClient.on('mensagem:nova', (dados) => {
      // Só tocar se a mensagem não é do ticket ativo
      const ticketAtivo = useTicketStore.getState().ticketAtivo;
      if (!ticketAtivo || dados.ticket_id !== ticketAtivo.id) {
        tocarSom();
      }
      // Atualizar título com contador
      document.title = `💬 Nova mensagem — Central Tutts`;
      setTimeout(() => { document.title = 'Central Tutts — WhatsApp'; }, 5000);
    });
    return cleanup;
  }, [logado]);

  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />

          <Route element={<RotaProtegida />}>
            <Route element={<AppLayout />}>
              <Route path="/tickets" element={<TicketsPage />} />
              <Route path="/contacts" element={<ContactsPage />} />
              <Route path="/quick-replies" element={<QuickRepliesPage />} />
              <Route path="/queues" element={<QueuesPage />} />
              <Route path="/reports" element={<ReportsPage />} />

              <Route element={<RotaAdmin />}>
                <Route path="/users" element={<UsersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/settings/whatsapp" element={<SettingsPage />} />
              </Route>

              <Route path="/" element={<Navigate to="/tickets" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/tickets" replace />} />
        </Routes>
      </BrowserRouter>

      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            borderRadius: '12px',
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-border)',
            fontSize: '14px',
          },
        }}
      />
    </QueryClientProvider>
  );
}