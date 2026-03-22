// src/pages/SettingsPage.jsx
import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, EmptyState } from '../components/ui';
import {
  Settings, Wifi, WifiOff, QrCode, RefreshCw, LogOut, Clock, Phone,
  Tag, Plus, Pencil, Trash2, GripVertical, Check, X, User,
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
// HEARTBEAT ANIMATION CSS
// ============================================================
const heartbeatStyles = `
@keyframes heartbeat-draw {
  0% { stroke-dashoffset: 200; }
  100% { stroke-dashoffset: 0; }
}
@keyframes heartbeat-glow {
  0%, 100% { filter: drop-shadow(0 0 2px rgba(34,197,94,0.3)); }
  50% { filter: drop-shadow(0 0 8px rgba(34,197,94,0.6)); }
}
@keyframes dot-pulse {
  0%, 100% { opacity: 0.4; transform: scale(0.95); }
  50% { opacity: 1; transform: scale(1.05); }
}
`;

function HeartbeatAnimation({ conectado }) {
  if (!conectado) {
    return (
      <div className="flex items-center justify-center" style={{ width: 120, height: 50 }}>
        <div className="flex items-center gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-400" style={{ animation: 'dot-pulse 1.5s ease-in-out infinite' }} />
          <span className="text-xs font-medium text-red-400">Offline</span>
        </div>
      </div>
    );
  }

  return (
    <div style={{ width: 120, height: 50, animation: 'heartbeat-glow 3s ease-in-out infinite' }}>
      <svg viewBox="0 0 120 50" width="120" height="50">
        <path
          d="M0 25 L20 25 L28 25 L33 8 L38 42 L43 15 L48 35 L53 25 L70 25 L120 25"
          fill="none"
          stroke="#22c55e"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="200"
          style={{ animation: 'heartbeat-draw 2s linear infinite' }}
        />
        <circle cx="118" cy="25" r="3" fill="#22c55e" opacity="0.6">
          <animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" />
        </circle>
      </svg>
    </div>
  );
}

// ============================================================
// WHATSAPP — redesign
// ============================================================
function WhatsAppSection() {
  const [qr, setQr] = useState(null);

  const { data: status, refetch } = useQuery({
    queryKey: ['whatsapp-status'],
    queryFn: () => api.get('/api/whatsapp/status'),
    refetchInterval: 5000,
  });

  const { data: perfil } = useQuery({
    queryKey: ['whatsapp-perfil'],
    queryFn: () => api.get('/api/whatsapp/perfil'),
    enabled: !!status?.conectado,
    staleTime: 60000,
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
  const numero = perfil?.numero;
  const nome = perfil?.nome;
  const foto = perfil?.foto;

  const formatarNumero = (num) => {
    if (!num) return '—';
    const limpo = num.replace(/\D/g, '');
    if (limpo.length === 13) return `+${limpo.slice(0,2)} (${limpo.slice(2,4)}) ${limpo.slice(4,9)}-${limpo.slice(9)}`;
    if (limpo.length === 12) return `+${limpo.slice(0,2)} (${limpo.slice(2,4)}) ${limpo.slice(4,8)}-${limpo.slice(8)}`;
    return num;
  };

  const formatarTempo = (seg) => {
    if (!seg) return '—';
    const h = Math.floor(seg / 3600);
    const m = Math.floor((seg % 3600) / 60);
    if (h > 0) return `${h}h ${m}min`;
    return `${m}min`;
  };

  return (
    <>
      <style>{heartbeatStyles}</style>

      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        {/* Header com perfil + heartbeat */}
        <div className="p-6">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative shrink-0">
              {foto ? (
                <img src={foto} alt="Perfil" className="w-16 h-16 rounded-2xl object-cover" onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex'; }} />
              ) : null}
              <div className={cn('w-16 h-16 rounded-2xl items-center justify-center', foto ? 'hidden' : 'flex',
                conectado ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                {conectado ? <Wifi className="w-7 h-7 text-emerald-600" /> : <WifiOff className="w-7 h-7 text-red-500" />}
              </div>
              {/* Status dot */}
              <div className={cn('absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--color-surface)]',
                conectado ? 'bg-emerald-500' : 'bg-red-400')} />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold truncate">{nome || 'WhatsApp'}</h2>
              {numero && (
                <div className="flex items-center gap-1.5 mt-0.5">
                  <Phone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span className="text-sm text-[var(--color-text-secondary)]">{formatarNumero(numero)}</span>
                </div>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium',
                  conectado ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', conectado ? 'bg-emerald-500' : 'bg-red-400')} />
                  {conectado ? 'Conectado' : 'Desconectado'}
                </span>
                {conectado && status?.tempoOnline && (
                  <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1">
                    <Clock className="w-3 h-3" /> {formatarTempo(status.tempoOnline)}
                  </span>
                )}
              </div>
            </div>

            {/* Heartbeat animation */}
            <div className="shrink-0">
              <HeartbeatAnimation conectado={conectado} />
            </div>
          </div>
        </div>

        {/* QR Code area */}
        {!conectado && qr && (
          <div className="border-t border-[var(--color-border)] px-6 py-8">
            <div className="flex flex-col items-center">
              <div className="bg-white p-4 rounded-2xl shadow-sm">
                <QRCodeSVG value={qr} size={220} level="M" />
              </div>
              <p className="text-sm text-[var(--color-text-secondary)] mt-4 font-medium">Escaneie o QR Code com seu WhatsApp</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Abra WhatsApp &gt; Dispositivos vinculados &gt; Vincular dispositivo</p>
            </div>
          </div>
        )}

        {!conectado && !qr && (
          <div className="border-t border-[var(--color-border)] px-6 py-8">
            <div className="flex flex-col items-center">
              <QrCode className="w-12 h-12 text-[var(--color-text-muted)] mb-3" />
              <p className="text-sm text-[var(--color-text-muted)]">Aguardando QR Code...</p>
              <p className="text-xs text-[var(--color-text-muted)] mt-1">Clique em reconectar para gerar um novo</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="border-t border-[var(--color-border)] px-6 py-4 flex gap-3">
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
    </>
  );
}

// ============================================================
// MOTIVOS DE ATENDIMENTO (unchanged)
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
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
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
