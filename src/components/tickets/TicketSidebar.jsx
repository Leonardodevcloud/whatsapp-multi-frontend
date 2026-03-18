// src/components/tickets/TicketSidebar.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Skeleton, EmptyState } from '../ui';
import { Search, X, MessageSquare, Volume2, VolumeX, Headphones, Users, Inbox, Smartphone } from 'lucide-react';
import { cn, formatarDataTicket, corStatus } from '../../lib/utils';
import api from '../../lib/api';

// Som de notificação
const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRiQDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQADAAB/f39/gICBgYKCg4OEhIWFhoaHh4iIiYmKiouLjIyNjY6Oj4+QkJGRkpKTk5SUlZWWlpeXmJiZmZqam5ucnJ2dnp6fn6CgoaGioqOjpKSlpaampqenpqalpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgIB/fn19fHt6eXh3dnV0c3JxcHBvcG9wb3BvcHFycnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TExcXFxcXFxMTDw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIKBgH9+fHt6eXd2dXNycXBvbm1sa2pqaWlpaWlqa2tsbW5vcHFyc3R1dnd4eXp7fH1+f4A=';

export default function TicketSidebar() {
  const { ticketAtivo, selecionarTicket, abaAtiva, setAba, filtros, setFiltro } = useTicketStore();
  const usuario = useAuthStore((s) => s.usuario);
  const [buscaLocal, setBuscaLocal] = useState('');
  const [somAtivo, setSomAtivo] = useState(() => localStorage.getItem('notifSom') !== 'false');
  const prevTicketsRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => { audioRef.current = new Audio(NOTIFICATION_SOUND_URL); audioRef.current.volume = 0.5; }, []);

  // Debounce busca
  useEffect(() => {
    const timer = setTimeout(() => setFiltro('busca', buscaLocal), 300);
    return () => clearTimeout(timer);
  }, [buscaLocal]);

  // ===== QUERIES POR ABA =====

  // Meus Chats — chamados atribuídos a mim (aberto/aguardando)
  const { data: meusChatsData } = useQuery({
    queryKey: ['chamados-meus', usuario?.id, filtros.busca],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('usuario_id', usuario?.id);
      params.set('status', 'aberto');
      if (filtros.busca) params.set('busca', filtros.busca);
      params.set('limite', '50');
      return api.get(`/api/tickets?${params.toString()}`);
    },
    enabled: !!usuario?.id,
    refetchInterval: 3000,
  });

  // Meus Chats aguardando
  const { data: meusAguardandoData } = useQuery({
    queryKey: ['chamados-meus-aguardando', usuario?.id],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('usuario_id', usuario?.id);
      params.set('status', 'aguardando');
      params.set('limite', '50');
      return api.get(`/api/tickets?${params.toString()}`);
    },
    enabled: !!usuario?.id,
    refetchInterval: 5000,
  });

  // Fila — chamados pendentes (sem atendente)
  const { data: filaData } = useQuery({
    queryKey: ['chamados-fila', filtros.busca],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('status', 'pendente');
      if (filtros.busca) params.set('busca', filtros.busca);
      params.set('limite', '50');
      return api.get(`/api/tickets?${params.toString()}`);
    },
    refetchInterval: 3000,
  });

  // Em Atendimento — todos os chamados abertos (de todos os atendentes)
  const { data: emAtendimentoData } = useQuery({
    queryKey: ['chamados-atendimento', filtros.busca],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('status', 'aberto');
      if (filtros.busca) params.set('busca', filtros.busca);
      params.set('limite', '50');
      return api.get(`/api/tickets?${params.toString()}`);
    },
    refetchInterval: 5000,
  });

  // Dispositivo Externo — chamados pendentes iniciados pelo celular
  const { data: filasData } = useQuery({
    queryKey: ['filas-lista'],
    queryFn: () => api.get('/api/queues'),
    staleTime: 60000,
  });
  
  const filaDispositivoId = (filasData?.filas || filasData || []).find(f => f.nome === 'Dispositivo Externo')?.id;

  const { data: dispositivoExternoData } = useQuery({
    queryKey: ['chamados-dispositivo-externo', filtros.busca, filaDispositivoId],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set('status', 'pendente');
      params.set('fila_id', filaDispositivoId);
      if (filtros.busca) params.set('busca', filtros.busca);
      params.set('limite', '50');
      return api.get(`/api/tickets?${params.toString()}`);
    },
    enabled: !!filaDispositivoId,
    refetchInterval: 5000,
  });

  const meusChats = [...(meusChatsData?.tickets || []), ...(meusAguardandoData?.tickets || [])];
  const fila = (filaData?.tickets || []).filter(t => !t.fila_nome || t.fila_nome !== 'Dispositivo Externo');
  const emAtendimento = emAtendimentoData?.tickets || [];
  const dispositivoExterno = dispositivoExternoData?.tickets || [];

  // Contagem por aba
  const contMeus = meusChats.length;
  const contFila = fila.length;
  const contAtendimento = emAtendimento.length;
  const contDispositivo = dispositivoExterno.length;

  // Tickets da aba ativa
  const ticketsExibidos = abaAtiva === 'meusChats' ? meusChats : abaAtiva === 'fila' ? fila : abaAtiva === 'dispositivoExterno' ? dispositivoExterno : emAtendimento;

  // Notificação sonora quando chega chamado novo na fila
  useEffect(() => {
    if (!somAtivo || fila.length === 0) return;
    const prevIds = prevTicketsRef.current.map(t => t.id);
    const temNovo = fila.some(t => !prevIds.includes(t.id));
    if (temNovo && prevTicketsRef.current.length > 0) {
      audioRef.current?.play().catch(() => {});
      if (Notification.permission === 'granted') {
        const novoTicket = fila.find(t => !prevIds.includes(t.id));
        if (novoTicket) new Notification('Novo chamado', { body: `${novoTicket.contato_nome}: ${novoTicket.ultima_mensagem_preview || 'Nova conversa'}`, icon: '/icon-192.png' });
      }
    }
    prevTicketsRef.current = fila.map(t => ({ id: t.id }));
  }, [fila, somAtivo]);

  useEffect(() => { if (Notification.permission === 'default') Notification.requestPermission(); }, []);

  const toggleSom = () => { const novo = !somAtivo; setSomAtivo(novo); localStorage.setItem('notifSom', String(novo)); };

  const ABAS = [
    { id: 'meusChats', label: 'Meus Chats', icon: Headphones, count: contMeus },
    { id: 'fila', label: 'Fila', icon: Inbox, count: contFila },
    { id: 'dispositivoExterno', label: 'Externo', icon: Smartphone, count: contDispositivo },
    { id: 'emAtendimento', label: 'Em Atendimento', icon: Users, count: contAtendimento },
  ];

  return (
    <div className="w-80 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-surface)] shrink-0">
      {/* Header */}
      <div className="p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-display font-semibold">Chamados</h2>
          <button onClick={toggleSom} title={somAtivo ? 'Desativar som' : 'Ativar som'}
            className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] transition-colors">
            {somAtivo ? <Volume2 className="w-4 h-4 text-primary" /> : <VolumeX className="w-4 h-4 text-[var(--color-text-muted)]" />}
          </button>
        </div>

        {/* Busca */}
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input type="text" placeholder="Buscar nome ou número..." value={buscaLocal} onChange={(e) => setBuscaLocal(e.target.value)}
            className="w-full h-9 pl-9 pr-8 rounded-lg bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 border-0" />
          {buscaLocal && (
            <button onClick={() => setBuscaLocal('')} className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--color-border)]">
              <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            </button>
          )}
        </div>

        {/* Abas: Meus Chats | Fila | Em Atendimento */}
        <div className="flex bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated rounded-lg p-0.5">
          {ABAS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 py-2 rounded-md text-xs font-medium transition-all relative',
                abaAtiva === id
                  ? 'bg-primary text-white shadow-sm'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text)]'
              )}
            >
              <Icon className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{label}</span>
              {count > 0 && (
                <span className={cn(
                  'min-w-[18px] h-[18px] rounded-full text-2xs font-bold flex items-center justify-center px-1',
                  abaAtiva === id
                    ? 'bg-white/25 text-white'
                    : id === 'fila' ? 'bg-amber-500 text-white animate-pulse' : 'bg-[var(--color-text-muted)]/20 text-[var(--color-text-muted)]'
                )}>
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Lista de chamados */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {ticketsExibidos.length === 0 ? (
          <EmptyState
            icone={abaAtiva === 'fila' ? Inbox : abaAtiva === 'meusChats' ? Headphones : abaAtiva === 'dispositivoExterno' ? Smartphone : Users}
            titulo={abaAtiva === 'fila' ? 'Fila vazia' : abaAtiva === 'meusChats' ? 'Nenhum chat' : abaAtiva === 'dispositivoExterno' ? 'Nenhum externo' : 'Nenhum em atendimento'}
            descricao={abaAtiva === 'fila' ? 'Novos chamados aparecerão aqui' : abaAtiva === 'meusChats' ? 'Aceite um chamado da fila' : abaAtiva === 'dispositivoExterno' ? 'Conversas do celular aparecerão aqui' : 'Nenhum chamado sendo atendido'}
          />
        ) : (
          <div className="py-1">
            {ticketsExibidos.map((ticket) => (
              <ChamadoCard
                key={ticket.id}
                ticket={ticket}
                ativo={ticketAtivo?.id === ticket.id}
                onClick={() => selecionarTicket(ticket)}
                mostrarAtendente={abaAtiva === 'emAtendimento'}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ChamadoCard({ ticket, ativo, onClick, mostrarAtendente }) {
  const naoLidas = parseInt(ticket.nao_lidas || 0);

  return (
    <button
      onClick={onClick}
      className={cn(
        'w-full text-left px-3 py-2.5 flex items-start gap-3 transition-all duration-100 border-l-3',
        ativo
          ? 'bg-primary/8 border-l-primary'
          : naoLidas > 0
            ? 'border-l-primary/60 bg-primary/3 hover:bg-primary/6'
            : 'border-l-transparent hover:bg-[var(--color-surface-elevated)] dark:hover:bg-surface-dark-elevated'
      )}
    >
      <div className="relative">
        <Avatar nome={ticket.contato_nome} src={ticket.contato_avatar} size="md" />
        {naoLidas > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center shadow-sm">
            {naoLidas > 9 ? '9+' : naoLidas}
          </span>
        )}
      </div>

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

        {mostrarAtendente && ticket.atendente_nome && (
          <p className="text-2xs text-primary mt-1 truncate">
            👤 {ticket.atendente_nome}
          </p>
        )}
      </div>
    </button>
  );
}