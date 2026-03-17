// src/components/tickets/TicketSidebar.jsx
import { useState, useEffect, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { Avatar, Badge, Skeleton, EmptyState } from '../ui';
import { Search, X, Filter, MessageSquare } from 'lucide-react';
import { cn, formatarDataTicket, corStatus } from '../../lib/utils';
import api from '../../lib/api';

const FILTROS_STATUS = [
  { valor: null, label: 'Todos' },
  { valor: 'pendente', label: 'Pendentes' },
  { valor: 'aberto', label: 'Abertos' },
  { valor: 'aguardando', label: 'Aguardando' },
  { valor: 'resolvido', label: 'Resolvidos' },
];

export default function TicketSidebar() {
  const { ticketAtivo, selecionarTicket, filtros, setFiltro } = useTicketStore();
  const [buscaLocal, setBuscaLocal] = useState('');

  // Debounce na busca
  useEffect(() => {
    const timer = setTimeout(() => setFiltro('busca', buscaLocal), 300);
    return () => clearTimeout(timer);
  }, [buscaLocal]);

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
    refetchInterval: 10000,
  });

  const { data: contadores } = useQuery({
    queryKey: ['tickets-contadores'],
    queryFn: () => api.get('/api/tickets/contadores'),
    refetchInterval: 15000,
  });

  const tickets = data?.tickets || [];

  return (
    <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-surface)] shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-display font-semibold">Tickets</h2>
          {contadores && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-amber-600 font-medium bg-amber-50 dark:bg-amber-900/20 px-1.5 py-0.5 rounded">
                {contadores.pendentes || 0}
              </span>
              <span className="text-xs text-blue-600 font-medium bg-blue-50 dark:bg-blue-900/20 px-1.5 py-0.5 rounded">
                {contadores.abertos || 0}
              </span>
            </div>
          )}
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
            <button
              onClick={() => setBuscaLocal('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--color-border)]"
            >
              <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>

        {/* Filtros de status */}
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

      {/* Lista de tickets */}
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
          <EmptyState
            icone={MessageSquare}
            titulo="Nenhum ticket"
            descricao="Tickets aparecerão aqui quando chegarem"
          />
        ) : (
          <div className="py-1">
            {tickets.map((ticket) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                ativo={ticketAtivo?.id === ticket.id}
                onClick={() => selecionarTicket(ticket)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TicketCard({ ticket, ativo, onClick }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-all duration-100 border-l-2',
        ativo
          ? 'bg-primary/5 border-l-primary'
          : 'border-l-transparent hover:bg-[var(--color-surface-elevated)] dark:hover:bg-surface-dark-elevated'
      )}
    >
      <Avatar nome={ticket.contato_nome} src={ticket.contato_avatar} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium truncate text-[var(--color-text)]">
            {ticket.contato_nome || ticket.contato_telefone}
          </span>
          <span className="text-2xs text-[var(--color-text-muted)] shrink-0">
            {formatarDataTicket(ticket.ultima_mensagem_em || ticket.criado_em)}
          </span>
        </div>

        <p className="text-xs text-[var(--color-text-muted)] truncate mt-0.5">
          {ticket.ultima_mensagem_preview || 'Sem mensagens'}
        </p>

        <div className="flex items-center gap-1.5 mt-1.5">
          <span className={cn('px-1.5 py-0.5 rounded text-2xs font-medium', corStatus(ticket.status))}>
            {ticket.status}
          </span>
          {ticket.fila_nome && (
            <span
              className="px-1.5 py-0.5 rounded text-2xs font-medium text-white"
              style={{ backgroundColor: ticket.fila_cor || '#7C3AED' }}
            >
              {ticket.fila_nome}
            </span>
          )}
          {parseInt(ticket.nao_lidas) > 0 && (
            <span className="ml-auto w-5 h-5 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center">
              {ticket.nao_lidas}
            </span>
          )}
        </div>
      </div>
    </button>
  );
}
