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
import SupervisionPage from './pages/SupervisionPage';
import IAConfigPage from './pages/IAConfigPage';

import { Skeleton } from './components/ui';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // ============ OTIMIZAÇÕES DE PERFORMANCE ============
      // staleTime alto = dados ficam "frescos" por mais tempo
      // Com WebSocket ativo, as invalidações são cirúrgicas
      // Polling de fallback (refetchInterval nos componentes) cuida do rest
      staleTime: 2000,             // 2s — banco rápido, polling frequente OK
      gcTime: 300000,              // 5 min de cache
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,    // Refetch ao reconectar internet
      // Dados ficam em cache ao trocar de aba e voltar — sem flash de loading
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
      const conectarWS = async () => {
        try {
          // Buscar token via API (cookie httpOnly não é legível por JS)
          const res = await fetch(
            '/api/auth/ws-token',
            { credentials: 'include' }
          );
          if (res.ok) {
            const { token } = await res.json();
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

  // ============ WEBSOCKET → INVALIDAÇÃO GLOBAL ============
  // Eventos WS que afetam múltiplas telas são tratados aqui
  useEffect(() => {
    if (!logado) return;

    // Status de mensagem atualizado (entregue, lida)
    const c1 = wsClient.on('mensagem:status', (dados) => {
      // Atualizar inline se possível, senão invalidar
      if (dados.waMessageId) {
        // Invalidar mensagens do ticket ativo se estiver aberto
        const ticketAtivo = useTicketStore.getState().ticketAtivo;
        if (ticketAtivo) {
          queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
        }
      }
    });

    // Reação em mensagem
    const c2 = wsClient.on('mensagem:reacao', () => {
      const ticketAtivo = useTicketStore.getState().ticketAtivo;
      if (ticketAtivo) {
        queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      }
    });

    // WhatsApp conectado/desconectado
    const c3 = wsClient.on('whatsapp:conectado', () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    });
    const c4 = wsClient.on('whatsapp:desconectado', () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-status'] });
    });

    return () => { c1(); c2(); c3(); c4(); };
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
                <Route path="/supervision" element={<SupervisionPage />} />
                <Route path="/ia-config" element={<IAConfigPage />} />
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
