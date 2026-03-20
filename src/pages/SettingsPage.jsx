// src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState } from '../components/ui';
import {
  Settings, Wifi, WifiOff, QrCode, RefreshCw, LogOut, Clock,
  Tag, Plus, Pencil, Trash2, GripVertical, Check, X,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/api';
import wsClient from '../lib/websocket';
import toast from 'react-hot-toast';

const ABAS_CONFIG = [
  { id: 'whatsapp', label: 'WhatsApp', icon: Wifi },
  { id: 'motivos', label: 'Motivos de Atendimento', icon: Tag },
];

export default function SettingsPage() {
  const [abaAtiva, setAbaAtiva] = useState('whatsapp');

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-xl font-display font-semibold mb-6">Configurações</h1>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-[var(--color-surface-elevated)] rounded-xl p-1">
          {ABAS_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAbaAtiva(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                abaAtiva === id
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {abaAtiva === 'whatsapp' && <WhatsAppSection />}
        {abaAtiva === 'motivos' && <MotivosSection />}
      </div>
    </div>
  );
}

// ============================================================
// WHATSAPP
// ============================================================
function WhatsAppSection() {
  const [qr, setQr] = useState(null);

  const { data: status, refetch } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status'),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const cleanup = wsClient.on('whatsapp:qr', (dados) => setQr(dados.qr));
    const cleanup2 = wsClient.on('whatsapp:conectado', () => {
      setQr(null);
      refetch();
      toast.success('WhatsApp conectado!');
    });
    return () => { cleanup(); cleanup2(); };
  }, []);

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
              <Clock className="w-3.5 h-3.5" /> {status?.tempoOnline || '—'}
            </span>
          </div>
        </div>
      )}

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

// ============================================================
// MOTIVOS DE ATENDIMENTO
// ============================================================
function MotivosSection() {
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNome, setEditandoNome] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['motivos-config'],
    queryFn: () => api.get('/api/tickets/motivos'),
  });
  const motivos = data?.motivos || [];

  const criarMutation = useMutation({
    mutationFn: (nome) => api.post('/api/tickets/motivos', { nome, ordem: motivos.length }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-config'] });
      setNovoNome('');
      toast.success('Motivo criado!');
    },
    onError: (err) => toast.error(err.message),
  });

  const atualizarMutation = useMutation({
    mutationFn: ({ id, ...dados }) => api.patch(`/api/tickets/motivos/${id}`, dados),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-config'] });
      setEditandoId(null);
      toast.success('Motivo atualizado!');
    },
    onError: (err) => toast.error(err.message),
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/tickets/motivos/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['motivos-config'] });
      toast.success('Motivo removido!');
    },
    onError: (err) => toast.error(err.message),
  });

  const handleCriar = () => {
    if (!novoNome.trim()) return;
    criarMutation.mutate(novoNome.trim());
  };

  const handleSalvarEdicao = () => {
    if (!editandoNome.trim() || !editandoId) return;
    atualizarMutation.mutate({ id: editandoId, nome: editandoNome.trim() });
  };

  const handleToggleAtivo = (motivo) => {
    atualizarMutation.mutate({ id: motivo.id, ativo: !motivo.ativo });
  };

  const handleDeletar = (id) => {
    if (!confirm('Remover este motivo? Se já foi usado em chamados, será desativado em vez de removido.')) return;
    deletarMutation.mutate(id);
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
          <Tag className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h2 className="text-base font-semibold">Motivos de Atendimento</h2>
          <p className="text-sm text-[var(--color-text-muted)]">
            Configure os motivos que o operador seleciona ao fechar um chamado
          </p>
        </div>
      </div>

      {/* Adicionar novo */}
      <div className="flex gap-2 mt-5 mb-5">
        <input
          value={novoNome}
          onChange={(e) => setNovoNome(e.target.value)}
          placeholder="Nome do motivo..."
          onKeyDown={(e) => e.key === 'Enter' && handleCriar()}
          className="flex-1 h-10 rounded-lg bg-[var(--color-surface-elevated)] px-4 text-sm border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
        <Button onClick={handleCriar} loading={criarMutation.isPending} disabled={!novoNome.trim()}>
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-12 rounded-lg bg-[var(--color-surface-elevated)] animate-pulse" />
          ))}
        </div>
      ) : motivos.length === 0 ? (
        <div className="text-center py-10">
          <Tag className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" />
          <p className="text-sm text-[var(--color-text-muted)]">Nenhum motivo cadastrado</p>
          <p className="text-xs text-[var(--color-text-muted)] mt-1">Adicione motivos para que os operadores selecionem ao fechar chamados</p>
        </div>
      ) : (
        <div className="space-y-2">
          {motivos.map((m) => (
            <div
              key={m.id}
              className={cn(
                'flex items-center gap-3 px-4 py-3 rounded-lg border transition-all',
                m.ativo
                  ? 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]'
                  : 'border-dashed border-[var(--color-border)] bg-[var(--color-surface)] opacity-50'
              )}
            >
              <GripVertical className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />

              {editandoId === m.id ? (
                // Modo edição
                <div className="flex-1 flex items-center gap-2">
                  <input
                    value={editandoNome}
                    onChange={(e) => setEditandoNome(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSalvarEdicao();
                      if (e.key === 'Escape') setEditandoId(null);
                    }}
                    autoFocus
                    className="flex-1 h-8 rounded-md bg-[var(--color-surface)] px-3 text-sm border border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                  <button onClick={handleSalvarEdicao} className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/90">
                    <Check className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => setEditandoId(null)} className="p-1.5 rounded-md hover:bg-[var(--color-surface)]">
                    <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  </button>
                </div>
              ) : (
                // Modo visualização
                <>
                  <span className={cn('flex-1 text-sm', m.ativo ? 'text-[var(--color-text)]' : 'text-[var(--color-text-muted)] line-through')}>
                    {m.nome}
                  </span>

                  {!m.ativo && (
                    <span className="text-2xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full font-medium">Desativado</span>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleToggleAtivo(m)}
                      title={m.ativo ? 'Desativar' : 'Ativar'}
                      className={cn(
                        'w-7 h-7 rounded-md flex items-center justify-center transition-colors',
                        m.ativo
                          ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20'
                          : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]'
                      )}
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => { setEditandoId(m.id); setEditandoNome(m.nome); }}
                      title="Editar"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-primary transition-colors"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDeletar(m.id)}
                      title="Remover"
                      className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}

      <p className="text-2xs text-[var(--color-text-muted)] mt-4">
        Estes motivos aparecerão como opções quando o operador fechar um chamado. Isso permite metrificar os tipos de atendimento.
      </p>
    </div>
  );
}
