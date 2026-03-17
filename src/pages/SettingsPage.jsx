// src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Button, EmptyState } from '../components/ui';
import { Settings, Wifi, WifiOff, QrCode, RefreshCw, LogOut, Clock } from 'lucide-react';
import { cn, formatarDuracao } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/api';
import wsClient from '../lib/websocket';
import toast from 'react-hot-toast';

export default function SettingsPage() {
  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-2xl mx-auto space-y-8">
        <h1 className="text-xl font-display font-semibold">Configurações</h1>
        <WhatsAppSection />
      </div>
    </div>
  );
}

function WhatsAppSection() {
  const [qr, setQr] = useState(null);

  const { data: status, refetch } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status'),
    refetchInterval: 5000,
  });

  // Ouvir QR via WebSocket
  useEffect(() => {
    const cleanup = wsClient.on('whatsapp:qr', (dados) => {
      setQr(dados.qr);
    });
    const cleanup2 = wsClient.on('whatsapp:conectado', () => {
      setQr(null);
      refetch();
      toast.success('WhatsApp conectado!');
    });
    return () => { cleanup(); cleanup2(); };
  }, []);

  // Buscar QR se desconectado
  useEffect(() => {
    if (status && !status.conectado) {
      api.get('/api/whatsapp/qr').then((data) => {
        if (data.qr) setQr(data.qr);
      }).catch(() => {});
    }
  }, [status?.conectado]);

  const reconectarMutation = useMutation({
    mutationFn: () => api.post('/api/whatsapp/reconectar'),
    onSuccess: () => { toast.success('Reconexão iniciada'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const logoutMutation = useMutation({
    mutationFn: () => api.post('/api/whatsapp/logout'),
    onSuccess: () => { toast.success('Logout realizado'); refetch(); },
    onError: (err) => toast.error(err.message),
  });

  const conectado = status?.conectado;

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-6">
        {conectado ? (
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center">
            <Wifi className="w-5 h-5 text-emerald-600" />
          </div>
        ) : (
          <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
            <WifiOff className="w-5 h-5 text-red-500 animate-pulse-dot" />
          </div>
        )}
        <div>
          <h2 className="text-base font-semibold">WhatsApp</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            {conectado ? `Conectado • ${status?.usuario?.nome || ''}` : 'Desconectado'}
          </p>
        </div>
      </div>

      {conectado && (
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Número</span>
            <span className="font-medium">{status?.usuario?.numero || '—'}</span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-[var(--color-text-muted)]">Tempo online</span>
            <span className="font-medium flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> {formatarDuracao(status?.tempoOnline)}
            </span>
          </div>
        </div>
      )}

      {/* QR Code */}
      {!conectado && qr && (
        <div className="flex flex-col items-center py-6 mb-6 bg-white rounded-xl">
          <QRCodeSVG value={qr} size={256} level="M" />
          <p className="text-sm text-neutral-500 mt-4">Escaneie o QR Code com seu WhatsApp</p>
          <p className="text-xs text-neutral-400 mt-1">Abra WhatsApp &gt; Dispositivos vinculados &gt; Vincular dispositivo</p>
        </div>
      )}

      {!conectado && !qr && (
        <div className="text-center py-8 mb-6">
          <QrCode className="w-12 h-12 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-text-muted)]">Aguardando QR Code...</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Clique em reconectar para gerar um novo</p>
        </div>
      )}

      {/* Ações */}
      <div className="flex gap-3">
        <Button variant="secondary" className="flex-1" onClick={() => reconectarMutation.mutate()} loading={reconectarMutation.isPending}>
          <RefreshCw className="w-4 h-4" /> Reconectar
        </Button>
        {conectado && (
          <Button variant="danger" onClick={() => logoutMutation.mutate()} loading={logoutMutation.isPending}>
            <LogOut className="w-4 h-4" /> Desconectar
          </Button>
        )}
      </div>
    </div>
  );
}
