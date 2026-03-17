// src/components/tickets/TicketSidebar.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { Avatar, Badge, Skeleton, EmptyState } from '../ui';
import { Search, X, MessageSquare, Volume2, VolumeX } from 'lucide-react';
import { cn, formatarDataTicket, corStatus } from '../../lib/utils';
import api from '../../lib/api';

const FILTROS_STATUS = [
  { valor: null, label: 'Todos' },
  { valor: 'pendente', label: 'Pendentes' },
  { valor: 'aberto', label: 'Abertos' },
  { valor: 'aguardando', label: 'Aguardando' },
];

// Som de notificação (base64 curto)
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRiQDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQADAAB/f39/gICBgYKCg4OEhIWFhoaHh4iIiYmKiouLjIyNjY6Oj4+QkJGRkpKTk5SUlZWWlpeXmJiZmZqam5ucnJ2dnp6fn6CgoaGioqOjpKSlpaampqenpqalpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgIB/fn19fHt6eXh3dnV0c3JxcHBvcG9wb3BvcHFycnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TExcXFxcXFxMTDw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIKBgH9+fHt6eXd2dXNycXBvbm1sa2pqaWlpaWlqa2tsbW5vcHFyc3R1dnd4eXp7fH1+f4A=';

export default function TicketSidebar() {
  const { ticketAtivo, selecionarTicket, filtros, setFiltro } = useTicketStore();
  const queryClient = useQueryClient();
  const [buscaLocal, setBuscaLocal] = useState('');
  const [somAtivo, setSomAtivo] = useState(() => localStorage.getItem('notifSom') !== 'false');
  const prevTicketsRef = useRef([]);
  const audioRef = useRef(null);

  // Debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => setFiltro('busca', buscaLocal), 300);
    return () => clearTimeout(timer);
  }, [buscaLocal]);

  // Criar audio element
  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  const { data, isLoading } = useQuery({
    queryKey: ['tickets', filtros],
    queryFn: () => {
      const params = new URLSearchParams();
      if (filtros.status) params.set('status', filtros.status);
      if (filtros.filaId) params.set('fila_id', filtros.filaId);
      if (filtros.busca) params.set('busca', filtros.busca);
      params.set('limite', '50');
      return api.get(`/api/tickets?${params.toString()}`);
    },
    refetchInterval: 3000, // Polling 3s
  });

  const { data: contadores } = useQuery({
    queryKey: ['tickets-contadores'],
    queryFn: () => api.get('/api/tickets/contadores'),
    refetchInterval: 5000,
  });

  const tickets = data?.tickets || [];

  // Notificação sonora quando chega ticket novo ou mensagem não lida
  useEffect(() => {
    if (!somAtivo || tickets.length === 0) return;

    const prevIds = prevTicketsRef.current.map(t => t.id);
    const temNovo = tickets.some(t => !prevIds.includes(t.id));
    
    // Ou se algum ticket existente ganhou mais mensagens não lidas
    const temNaoLida = tickets.some(t => {
      const prev = prevTicketsRef.current.find(p => p.id === t.id);
      return prev && parseInt(t.nao_lidas || 0) > parseInt(prev.nao_lidas || 0);
    });

    if ((temNovo || temNaoLida) && prevTicketsRef.current.length > 0) {
      audioRef.current?.play().catch(() => {});
      // Notificação do browser
      if (Notification.permission === 'granted') {
        const novoTicket = tickets.find(t => !prevIds.includes(t.id));
        if (novoTicket) {
          new Notification('Nova mensagem', {
            body: `${novoTicket.contato_nome}: ${novoTicket.ultima_mensagem_preview || 'Nova conversa'}`,
            icon: '/icon-192.png',
          });
        }
      }
    }

    prevTicketsRef.current = tickets.map(t => ({ id: t.id, nao_lidas: t.nao_lidas }));
  }, [tickets, somAtivo]);

  // Pedir permissão de notificação
  useEffect(() => {
    if (Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  const toggleSom = () => {
    const novo = !somAtivo;
    setSomAtivo(novo);
    localStorage.setItem('notifSom', String(novo));
  };

  return (
    <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-surface)] shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-display font-semibold">Tickets</h2>
          <div className="flex items-center gap-1.5">
            {contadores && (
              <>
                <span className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                  {contadores.pendentes || 0}
                </span>
                <span className="text-xs text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                  {contadores.abertos || 0}
                </span>
              </>
            )}
            <button
              onClick={toggleSom}
              title={somAtivo ? 'Desativar som' : 'Ativar som'}
              className="p-1 rounded hover:bg-[var(--color-surface-elevated)] transition-colors"
            >
              {somAtivo ? <Volume2 className="w-3.5 h-3.5 text-primary" /> : <VolumeX className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />}
            </button>
          </div>
        </div>

        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar ticket, nome ou telefone..."
            value={buscaLocal}
            onChange={(e) => setBuscaLocal(e.target.value)}
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
          />
          {buscaLocal && (
            <button onClick={() => setBuscaLocal('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--color-border)]">
              <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>

        {/* Filtros */}
        <div className="flex gap-1 mt-2 overflow-x-auto scrollbar-thin">
          {FILTROS_STATUS.map(({ valor, label }) => (
            <button
              key={label}
              onClick={() => setFiltro('status', valor)}
              className={cn(
                'px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-all',
                filtros.status === valor
                  ? 'bg-primary text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {isLoading ? (
          <div className="p-3 space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 p-3">
                <Skeleton className="w-10 h-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                </div>
              </div>
            ))}
          </div>
        ) : tickets.length === 0 ? (
          <EmptyState icone={MessageSquare} titulo="Nenhum ticket" descricao="Tickets aparecerão aqui quando chegarem" />
        ) : (
          <div className="py-1">
            {tickets.map((ticket) => (
              <TicketCard key={ticket.id} ticket={ticket} ativo={ticketAtivo?.id === ticket.id} onClick={() => selecionarTicket(ticket)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, ativo, onClick }) {
  const naoLidas = parseInt(ticket.nao_lidas || 0);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-all duration-100 border-l-2',
        ativo
          ? 'bg-primary/5 border-l-primary'
          : naoLidas > 0
            ? 'border-l-primary/50 bg-primary/3 hover:bg-primary/5'
            : 'border-l-transparent hover:bg-[var(--color-surface-elevated)] dark:hover:bg-surface-dark-elevated'
      )}
    >
      <Avatar nome={ticket.contato_nome} src={ticket.contato_avatar} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className={cn('text-sm truncate', naoLidas > 0 ? 'font-bold text-[var(--color-text)]' : 'font-medium text-[var(--color-text)]')}>
            {ticket.contato_nome || ticket.contato_telefone}
          </span>
          <span className="text-2xs text-[var(--color-text-muted)] shrink-0">
            {formatarDataTicket(ticket.ultima_mensagem_em || ticket.criado_em)}
          </span>
        </div>

        <p className={cn('text-xs truncate mt-0.5', naoLidas > 0 ? 'text-[var(--color-text-secondary)] font-medium' : 'text-[var(--color-text-muted)]')}>
          {ticket.ultima_mensagem_preview || 'Sem mensagens'}
        </p>

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={cn('px-1.5 py-0.5 rounded text-2xs font-medium', corStatus(ticket.status))}>
            {ticket.status}
          </span>
          {ticket.fila_nome && (
            <span className="px-1.5 py-0.5 rounded text-2xs font-medium text-white" style={{ backgroundColor: ticket.fila_cor || '#7C3AED' }}>
              {ticket.fila_nome}
            </span>
          )}
          {naoLidas > 0 && (
            <span className="ml-auto w-5 h-5 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center animate-pulse">
              {naoLidas}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}