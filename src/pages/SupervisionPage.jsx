// src/pages/SupervisionPage.jsx
// Supervisão em tempo real — admin vê todos os chats, atendentes, métricas

import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Skeleton } from '../components/ui';
import {
  Users, MessageSquare, Clock, CheckCircle2, AlertCircle,
  Eye, UserPlus, StickyNote, RefreshCw, Inbox,
} from 'lucide-react';
import { cn, formatarDataMensagem } from '../lib/utils';
import api from '../lib/api';
import wsClient from '../lib/websocket';
import toast from 'react-hot-toast';

function MetricCard({ label, valor, icon: Icon, cor }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-[var(--color-text-muted)] font-medium">{label}</span>
        <Icon className={cn('w-4 h-4', cor || 'text-primary')} />
      </div>
      <p className="text-2xl font-semibold text-[var(--color-text)]">{valor}</p>
    </div>
  );
}

export default function SupervisionPage() {
  const queryClient = useQueryClient();
  const [chatSelecionado, setChatSelecionado] = useState(null);
  const [notaTexto, setNotaTexto] = useState('');

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['supervision-dashboard'],
    queryFn: () => api.get('/api/supervision/dashboard'),
    refetchInterval: 5000,
  });

  const { data: chatsData } = useQuery({
    queryKey: ['supervision-chats'],
    queryFn: () => api.get('/api/supervision/chats-ativos'),
    refetchInterval: 5000,
  });

  // WS real-time updates
  useEffect(() => {
    const c1 = wsClient.on('mensagem:nova', () => {
      queryClient.invalidateQueries({ queryKey: ['supervision-chats'] });
      queryClient.invalidateQueries({ queryKey: ['supervision-dashboard'] });
    });
    const c2 = wsClient.on('ticket:novo', () => {
      queryClient.invalidateQueries({ queryKey: ['supervision-chats'] });
      queryClient.invalidateQueries({ queryKey: ['supervision-dashboard'] });
    });
    const c3 = wsClient.on('ticket:atualizado', () => {
      queryClient.invalidateQueries({ queryKey: ['supervision-chats'] });
      queryClient.invalidateQueries({ queryKey: ['supervision-dashboard'] });
    });
    return () => { c1(); c2(); c3(); };
  }, []);

  const resumo = dashboard?.resumo || {};
  const atendentes = dashboard?.atendentes || [];
  const chats = chatsData?.chats || [];

  const handleAssumir = async (ticketId) => {
    try {
      await api.post(`/api/supervision/assumir/${ticketId}`);
      toast.success('Ticket assumido');
      queryClient.invalidateQueries({ queryKey: ['supervision-chats'] });
    } catch (err) { toast.error(err.message || 'Erro'); }
  };

  const handleNotaInterna = async (ticketId) => {
    if (!notaTexto.trim()) return;
    try {
      await api.post(`/api/supervision/nota-interna/${ticketId}`, { texto: notaTexto.trim() });
      toast.success('Nota enviada');
      setNotaTexto('');
      setChatSelecionado(null);
    } catch (err) { toast.error(err.message || 'Erro'); }
  };

  const formatarTempo = (seg) => {
    if (!seg) return '—';
    if (seg < 60) return `${seg}s`;
    if (seg < 3600) return `${Math.floor(seg / 60)}min`;
    return `${Math.floor(seg / 3600)}h${Math.floor((seg % 3600) / 60)}min`;
  };

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-semibold text-[var(--color-text)]">Supervisão</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Monitoramento em tempo real</p>
          </div>
          <button onClick={() => { queryClient.invalidateQueries({ queryKey: ['supervision-dashboard'] }); queryClient.invalidateQueries({ queryKey: ['supervision-chats'] }); }}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>

        {/* Métricas */}
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <MetricCard label="Pendentes" valor={resumo.pendentes || 0} icon={Inbox} cor="text-amber-500" />
            <MetricCard label="Em atendimento" valor={resumo.abertos || 0} icon={MessageSquare} cor="text-primary" />
            <MetricCard label="Aguardando" valor={resumo.aguardando || 0} icon={Clock} cor="text-blue-500" />
            <MetricCard label="Resolvidos (24h)" valor={resumo.resolvidos_24h || 0} icon={CheckCircle2} cor="text-emerald-500" />
            <MetricCard label="TPR médio" valor={formatarTempo(resumo.tpr_medio_seg)} icon={Clock} cor="text-orange-500" />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Atendentes */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                <Users className="w-4 h-4 text-primary" /> Atendentes ({atendentes.length})
              </h2>
            </div>
            <div className="divide-y divide-[var(--color-border)] max-h-80 overflow-y-auto">
              {atendentes.map((a) => (
                <div key={a.id} className="px-4 py-3 flex items-center gap-3">
                  <div className="relative">
                    <Avatar nome={a.nome} size="sm" src={a.avatar_url} />
                    <div className={cn('absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-[var(--color-surface)]',
                      a.online ? 'bg-emerald-500' : 'bg-gray-300')} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--color-text)] truncate">{a.nome}</p>
                    <p className="text-2xs text-[var(--color-text-muted)]">
                      {a.tickets_abertos > 0 ? `${a.tickets_abertos} aberto(s)` : 'Livre'}
                      {a.tickets_aguardando > 0 && ` · ${a.tickets_aguardando} aguardando`}
                    </p>
                  </div>
                  <div className={cn('px-2 py-0.5 rounded-full text-2xs font-medium',
                    a.online ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')}>
                    {a.online ? 'Online' : 'Offline'}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Chats ativos */}
          <div className="lg:col-span-2 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl">
            <div className="px-4 py-3 border-b border-[var(--color-border)]">
              <h2 className="text-sm font-semibold text-[var(--color-text)] flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-primary" /> Chats ativos ({chats.length})
              </h2>
            </div>
            <div className="divide-y divide-[var(--color-border)] max-h-[500px] overflow-y-auto">
              {chats.length === 0 ? (
                <div className="px-4 py-8 text-center text-sm text-[var(--color-text-muted)]">Nenhum chat ativo</div>
              ) : chats.map((chat) => (
                <div key={chat.id} className="px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar nome={chat.contato_nome} size="sm" src={chat.contato_avatar} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-[var(--color-text)] truncate">{chat.contato_nome || chat.contato_telefone}</p>
                        <span className={cn('px-1.5 py-0.5 rounded text-2xs font-medium',
                          chat.status === 'pendente' ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400' :
                          chat.status === 'aberto' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' :
                          'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                        )}>
                          {chat.status}
                        </span>
                      </div>
                      <p className="text-2xs text-[var(--color-text-muted)] truncate">
                        {chat.atendente_nome ? `${chat.atendente_nome} · ` : ''}
                        {chat.ultima_mensagem_preview || 'Sem mensagens'}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <span className="text-2xs text-[var(--color-text-muted)]">{chat.total_mensagens} msgs</span>
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 mt-2 ml-11">
                    <button onClick={() => handleAssumir(chat.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-2xs font-medium bg-primary/10 text-primary hover:bg-primary/20 transition-colors">
                      <UserPlus className="w-3 h-3" /> Assumir
                    </button>
                    <button onClick={() => setChatSelecionado(chatSelecionado === chat.id ? null : chat.id)}
                      className="flex items-center gap-1 px-2 py-1 rounded text-2xs font-medium bg-amber-100 text-amber-700 hover:bg-amber-200 dark:bg-amber-900/20 dark:text-amber-400 transition-colors">
                      <StickyNote className="w-3 h-3" /> Nota interna
                    </button>
                    <a href={`/tickets?chat=${chat.id}`}
                      className="flex items-center gap-1 px-2 py-1 rounded text-2xs font-medium bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)] transition-colors">
                      <Eye className="w-3 h-3" /> Ver chat
                    </a>
                  </div>

                  {/* Nota interna inline */}
                  {chatSelecionado === chat.id && (
                    <div className="flex items-center gap-2 mt-2 ml-11">
                      <input
                        value={notaTexto}
                        onChange={(e) => setNotaTexto(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleNotaInterna(chat.id)}
                        placeholder="Escreva uma nota pro atendente..."
                        className="flex-1 bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-lg px-3 py-1.5 text-xs outline-none focus:border-primary"
                        autoFocus
                      />
                      <Button size="sm" onClick={() => handleNotaInterna(chat.id)} disabled={!notaTexto.trim()}>Enviar</Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
