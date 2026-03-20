// src/components/tickets/TicketSidebar.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Skeleton, EmptyState, Button } from '../ui';
import { Search, X, MessageSquare, Volume2, VolumeX, Headphones, Users, Inbox, Smartphone } from 'lucide-react';
import { cn, formatarDataTicket, corStatus } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

const NOTIFICATION_SOUND_URL = 'data:audio/wav;base64,UklGRiQDAABXQVZFZm10IBAAAAABAAEAESsAABErAAABAAgAZGF0YQADAAB/f39/gICBgYKCg4OEhIWFhoaHh4iIiYmKiouLjIyNjY6Oj4+QkJGRkpKTk5SUlZWWlpeXmJiZmZqam5ucnJ2dnp6fn6CgoaGioqOjpKSlpaampqenpqalpKOioaCfnp2cm5qZmJeWlZSTkpGQj46NjIuKiYiHhoWEg4KBgIB/fn19fHt6eXh3dnV0c3JxcHBvcG9wb3BvcHFycnN0dXZ3eHl6e3x9fn+AgYKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TExcXFxcXFxMTDw8LBwL++vby7urm4t7a1tLOysbCvrq2sq6qpqKempaSjoqGgn56dnJuamZiXlpWUk5KRkI+OjYyLiomIh4aFhIKBgH9+fHt6eXd2dXNycXBvbm1sa2pqaWlpaWlqa2tsbW5vcHFyc3R1dnd4eXp7fH1+f4A=';

export default function TicketSidebar() {
  const ticketAtivo = useTicketStore((s) => s.ticketAtivo);
  const selecionarTicket = useTicketStore((s) => s.selecionarTicket);
  const abaAtiva = useTicketStore((s) => s.abaAtiva);
  const setAba = useTicketStore((s) => s.setAba);
  const filtros = useTicketStore((s) => s.filtros);
  const setFiltro = useTicketStore((s) => s.setFiltro);
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const [buscaLocal, setBuscaLocal] = useState('');
  const [somAtivo, setSomAtivo] = useState(() => localStorage.getItem('notifSom') !== 'false');
  const [criandoChamado, setCriandoChamado] = useState(false);
  const prevTicketsRef = useRef([]);
  const audioRef = useRef(null);

  useEffect(() => {
    audioRef.current = new Audio(NOTIFICATION_SOUND_URL);
    audioRef.current.volume = 0.5;
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => setFiltro('busca', buscaLocal), 300);
    return () => clearTimeout(timer);
  }, [buscaLocal]);

  // Wrapper: selecionar ticket + marcar como lida
  const handleSelecionarTicket = (ticket) => {
    selecionarTicket(ticket);
    const naoLidas = parseInt(ticket.nao_lidas || 0);
    if (naoLidas > 0) {
      api.post(`/api/messages/${ticket.id}/lidas`).then(() => {
        queryClient.invalidateQueries({ queryKey: ['chamados-meus'] });
        queryClient.invalidateQueries({ queryKey: ['chamados-meus-aguardando'] });
        queryClient.invalidateQueries({ queryKey: ['chamados-fila'] });
        queryClient.invalidateQueries({ queryKey: ['chamados-atendimento'] });
        queryClient.invalidateQueries({ queryKey: ['chamados-dispositivo-externo'] });
      }).catch(() => {});
    }
  };

  // Meus Chats
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

  // Fila
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

  // Em Atendimento
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

  // Dispositivo Externo
  const { data: filasData } = useQuery({
    queryKey: ['filas-lista'],
    queryFn: () => api.get('/api/queues'),
    staleTime: 60000,
  });

  const filaDispositivoId = (filasData?.filas || filasData || []).find((f) => f.nome === 'Dispositivo Externo')?.id;

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
  const fila = (filaData?.tickets || []).filter((t) => !t.fila_nome || t.fila_nome !== 'Dispositivo Externo');
  const emAtendimento = emAtendimentoData?.tickets || [];
  const dispositivoExterno = dispositivoExternoData?.tickets || [];

  // Busca contatos
  const { data: contatosBusca } = useQuery({
    queryKey: ['contatos-sidebar-busca', filtros.busca],
    queryFn: () => api.get(`/api/contacts?busca=${filtros.busca}&limite=10`),
    enabled: !!filtros.busca && filtros.busca.length >= 2,
  });

  const todosTicketsTelefones = new Set(
    [...meusChats, ...fila, ...emAtendimento, ...dispositivoExterno].map((t) => t.contato_telefone)
  );
  const contatosSemChamado = (contatosBusca?.contatos || []).filter((c) => !todosTicketsTelefones.has(c.telefone));

  // NOVO: Criar chamado direto sem mensagem — abre chat imediatamente
  const handleIniciarChamadoDireto = async (contato) => {
    if (criandoChamado) return;
    setCriandoChamado(true);
    try {
      const ticket = await api.post('/api/tickets/criar-para-contato', {
        contato_id: contato.id,
      });
      setAba('meusChats');
      selecionarTicket(ticket);
      setBuscaLocal('');
      setFiltro('busca', '');
      queryClient.invalidateQueries({ queryKey: ['chamados-meus'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-fila'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-atendimento'] });
      toast.success('Chamado aberto!');
    } catch (err) {
      toast.error(err.message || 'Erro ao criar chamado');
    } finally {
      setCriandoChamado(false);
    }
  };

  const contMeus = meusChats.length;
  const contFila = fila.length;
  const contAtendimento = emAtendimento.length;
  const contDispositivo = dispositivoExterno.length;

  const ticketsExibidos =
    abaAtiva === 'meusChats' ? meusChats
    : abaAtiva === 'fila' ? fila
    : abaAtiva === 'dispositivoExterno' ? dispositivoExterno
    : emAtendimento;

  // Som de notificação
  useEffect(() => {
    if (!somAtivo || fila.length === 0) return;
    const prevIds = prevTicketsRef.current.map((t) => t.id);
    const temNovo = fila.some((t) => !prevIds.includes(t.id));
    if (temNovo && prevTicketsRef.current.length > 0) {
      audioRef.current?.play().catch(() => {});
      if (Notification.permission === 'granted') {
        const novoTicket = fila.find((t) => !prevIds.includes(t.id));
        if (novoTicket) {
          new Notification('Novo chamado', {
            body: `${novoTicket.contato_nome}: ${novoTicket.ultima_mensagem_preview || 'Nova conversa'}`,
            icon: '/icon-192.png',
          });
        }
      }
    }
    prevTicketsRef.current = fila.map((t) => ({ id: t.id }));
  }, [fila, somAtivo]);

  useEffect(() => {
    if (Notification.permission === 'default') Notification.requestPermission();
  }, []);

  const toggleSom = () => {
    const novo = !somAtivo;
    setSomAtivo(novo);
    localStorage.setItem('notifSom', String(novo));
  };

  const ABAS = [
    { id: 'meusChats', label: 'Meus Chats', icon: Headphones, count: contMeus },
    { id: 'fila', label: 'Fila', icon: Inbox, count: contFila },
    { id: 'dispositivoExterno', label: 'Externo', icon: Smartphone, count: contDispositivo },
    { id: 'emAtendimento', label: 'Em Atendimento', icon: Users, count: contAtendimento },
  ];

  return (
    <div className="w-96 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-surface)] shrink-0">
      <div className="p-3 border-b border-[var(--color-border)]">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-display font-semibold">Chamados</h2>
          <button
            onClick={toggleSom}
            title={somAtivo ? 'Desativar som' : 'Ativar som'}
            className="p-1.5 rounded hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            {somAtivo ? (
              <Volume2 className="w-4 h-4 text-primary" />
            ) : (
              <VolumeX className="w-4 h-4 text-[var(--color-text-muted)]" />
            )}
          </button>
        </div>

        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder="Buscar nome ou número..."
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

        <div className="flex bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated rounded-xl p-1 gap-1">
          {ABAS.map(({ id, label, icon: Icon, count }) => (
            <button
              key={id}
              onClick={() => setAba(id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-2xs font-medium transition-all duration-200 relative',
                abaAtiva === id
                  ? 'bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-surface)]'
              )}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{label}</span>
              {count > 0 && (
                <span
                  className={cn(
                    'min-w-[18px] h-[18px] rounded-full text-2xs font-bold flex items-center justify-center px-1 transition-all duration-200',
                    abaAtiva === id
                      ? 'bg-primary text-white'
                      : id === 'fila'
                        ? 'bg-amber-500 text-white'
                        : 'bg-[var(--color-text-muted)]/15 text-[var(--color-text-muted)]'
                  )}
                >
                  {count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {ticketsExibidos.length === 0 && contatosSemChamado.length === 0 ? (
          <EmptyState
            icone={
              abaAtiva === 'fila'
                ? Inbox
                : abaAtiva === 'meusChats'
                  ? Headphones
                  : abaAtiva === 'dispositivoExterno'
                    ? Smartphone
                    : Users
            }
            titulo={
              abaAtiva === 'fila'
                ? 'Fila vazia'
                : abaAtiva === 'meusChats'
                  ? 'Nenhum chat'
                  : abaAtiva === 'dispositivoExterno'
                    ? 'Nenhum externo'
                    : 'Nenhum em atendimento'
            }
            descricao={
              abaAtiva === 'fila'
                ? 'Novos chamados aparecerão aqui'
                : abaAtiva === 'meusChats'
                  ? 'Aceite um chamado da fila'
                  : abaAtiva === 'dispositivoExterno'
                    ? 'Conversas do celular aparecerão aqui'
                    : 'Nenhum chamado sendo atendido'
            }
          />
        ) : (
          <div className="py-1">
            {ticketsExibidos.map((ticket) => (
              <ChamadoCard
                key={ticket.id}
                ticket={ticket}
                ativo={ticketAtivo?.id === ticket.id}
                onClick={() => handleSelecionarTicket(ticket)}
                mostrarAtendente={abaAtiva === 'emAtendimento'}
              />
            ))}
          </div>
        )}

        {filtros.busca && contatosSemChamado.length > 0 && (
          <div className="border-t border-[var(--color-border)]">
            <p className="px-3 py-2 text-2xs text-[var(--color-text-muted)] uppercase tracking-wide font-medium">
              Contatos — iniciar conversa
            </p>
            {contatosSemChamado.map((c) => (
              <button
                key={c.id}
                onClick={() => handleIniciarChamadoDireto(c)}
                disabled={criandoChamado}
                className="w-full text-left px-3 py-2.5 flex items-center gap-3 hover:bg-[var(--color-surface-elevated)] transition-colors disabled:opacity-50"
              >
                <Avatar nome={c.nome} src={c.avatar_url} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.nome}</p>
                  <p className="text-2xs text-[var(--color-text-muted)]">{c.telefone}</p>
                </div>
                {criandoChamado ? (
                  <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
                ) : (
                  <MessageSquare className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
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
      <Avatar nome={ticket.contato_nome} src={ticket.contato_avatar} size="md" />

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={cn(
              'text-sm truncate',
              naoLidas > 0 ? 'font-bold text-[var(--color-text)]' : 'font-medium text-[var(--color-text)]'
            )}
          >
            {ticket.contato_nome || ticket.contato_telefone}
          </span>
          <span className="text-2xs text-[var(--color-text-muted)] shrink-0">
            {formatarDataTicket(ticket.ultima_mensagem_em || ticket.criado_em)}
          </span>
        </div>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p
            className={cn(
              'text-xs truncate flex-1',
              naoLidas > 0
                ? 'text-[var(--color-text-secondary)] font-medium'
                : 'text-[var(--color-text-muted)]'
            )}
          >
            {ticket.ultima_mensagem_preview || 'Sem mensagens'}
          </p>

          {naoLidas > 0 && (
            <span className="min-w-[20px] h-[20px] rounded-full bg-primary text-white text-2xs font-bold flex items-center justify-center px-1 shrink-0 shadow-sm">
              {naoLidas > 9 ? '9+' : naoLidas}
            </span>
          )}
        </div>

        {mostrarAtendente && ticket.atendente_nome && (
          <p className="text-2xs text-primary mt-1 truncate">👤 {ticket.atendente_nome}</p>
        )}
      </div>
    </button>
  );
}
