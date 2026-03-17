// src/components/tickets/TicketPanel.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Button } from '../ui';
import {
  Phone, Mail, StickyNote, Clock, User, ArrowRightLeft,
  CheckCircle2, XCircle, Pause, UserPlus, Users, Layers,
} from 'lucide-react';
import { cn, formatarTelefone, formatarDataRelativa, formatarDuracao, corStatus, corPrioridade } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function TicketPanel() {
  const ticketAtivo = useTicketStore((s) => s.ticketAtivo);
  const selecionarTicket = useTicketStore((s) => s.selecionarTicket);
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();
  const [abaAtiva, setAbaAtiva] = useState('info');

  const { data: ticket } = useQuery({
    queryKey: ['ticket-detalhe', ticketAtivo?.id],
    queryFn: () => api.get(`/api/tickets/${ticketAtivo.id}`),
    enabled: !!ticketAtivo?.id,
  });

  const { data: contato } = useQuery({
    queryKey: ['contato-detalhe', ticketAtivo?.contato_id],
    queryFn: () => api.get(`/api/contacts/${ticketAtivo.contato_id}`),
    enabled: !!ticketAtivo?.contato_id,
  });

  const { data: tagsDisponiveis } = useQuery({ queryKey: ['tags'], queryFn: () => api.get('/api/tags') });
  const { data: filas } = useQuery({ queryKey: ['filas'], queryFn: () => api.get('/api/queues') });
  const { data: todosUsuarios } = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get('/api/users') });

  const invalidarTudo = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket-detalhe', ticketAtivo?.id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['tickets-contadores'] });
  };

  const aceitarMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo.id}/aceitar`),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); toast.success('Chamado aceito!'); },
    onError: (err) => toast.error(err.message),
  });

  const resolverMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo.id}/resolver`),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); toast.success('Chamado resolvido!'); },
    onError: (err) => toast.error(err.message),
  });

  const fecharMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo.id}/fechar`),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); toast.success('Chamado fechado'); },
    onError: (err) => toast.error(err.message),
  });

  const aguardandoMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo.id}/aguardando`),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); },
    onError: (err) => toast.error(err.message),
  });

  const transferirMutation = useMutation({
    mutationFn: ({ fila_id, usuario_id }) => api.post(`/api/tickets/${ticketAtivo.id}/transferir`, { fila_id, usuario_id }),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); toast.success('Chamado transferido!'); },
    onError: (err) => toast.error(err.message),
  });

  const tagMutation = useMutation({
    mutationFn: (tagId) => api.post(`/api/tags/tickets/${ticketAtivo.id}`, { tag_id: tagId }),
    onSuccess: () => invalidarTudo(),
  });

  const removerTagMutation = useMutation({
    mutationFn: (tagId) => api.delete(`/api/tags/tickets/${ticketAtivo.id}/${tagId}`),
    onSuccess: () => invalidarTudo(),
  });

  if (!ticketAtivo) return null;

  const status = ticket?.status || ticketAtivo.status;
  const isPendente = status === 'pendente';
  const isAberto = status === 'aberto' || status === 'aguardando';

  // Filtrar atendentes (excluir o atual)
  const atendentes = (todosUsuarios?.usuarios || todosUsuarios || []).filter(u => u.id !== usuario?.id && u.ativo !== false);

  return (
    <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0 overflow-hidden">
      {/* Ações */}
      <div className="p-3 border-b border-[var(--color-border)] space-y-2">
        {isPendente && (
          <Button className="w-full" onClick={() => aceitarMutation.mutate()} loading={aceitarMutation.isPending}>
            <UserPlus className="w-4 h-4" /> Aceitar chamado
          </Button>
        )}
        {isAberto && (
          <div className="flex gap-2">
            <Button variant="secondary" className="flex-1" onClick={() => resolverMutation.mutate()} loading={resolverMutation.isPending}>
              <CheckCircle2 className="w-4 h-4" /> Resolver
            </Button>
            <Button variant="ghost" size="icon" title="Aguardando" onClick={() => aguardandoMutation.mutate()}>
              <Pause className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" title="Fechar" onClick={() => fecharMutation.mutate()}>
              <XCircle className="w-4 h-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Abas */}
      <div className="flex border-b border-[var(--color-border)]">
        {['info', 'tags', 'historico'].map((aba) => (
          <button
            key={aba}
            onClick={() => setAbaAtiva(aba)}
            className={cn(
              'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2 capitalize',
              abaAtiva === aba ? 'text-primary border-primary' : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]'
            )}
          >
            {aba === 'historico' ? 'Histórico' : aba.charAt(0).toUpperCase() + aba.slice(1)}
          </button>
        ))}
      </div>

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">
        {abaAtiva === 'info' && (
          <div className="p-4 space-y-5">
            {/* Contato */}
            <div className="flex items-center gap-3">
              <Avatar nome={contato?.nome || ticketAtivo.contato_nome} size="lg" />
              <div className="min-w-0">
                <p className="text-sm font-semibold truncate">{contato?.nome || ticketAtivo.contato_nome}</p>
                <button
                  onClick={() => { navigator.clipboard.writeText(contato?.telefone || ''); toast.success('Copiado!'); }}
                  className="text-xs text-[var(--color-text-muted)] hover:text-primary flex items-center gap-1"
                >
                  <Phone className="w-3 h-3" />
                  {formatarTelefone(contato?.telefone || ticketAtivo.contato_telefone)}
                </button>
              </div>
            </div>

            {/* Detalhes */}
            <div className="space-y-3">
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Ticket</h4>
              <InfoRow label="Protocolo" valor={`#${ticket?.protocolo || ticketAtivo.protocolo}`} />
              <InfoRow label="Prioridade">
                <span className={cn('font-medium', corPrioridade(ticket?.prioridade || 'normal'))}>
                  {ticket?.prioridade || 'normal'}
                </span>
              </InfoRow>
              <InfoRow label="Atendente" valor={ticket?.atendente_nome || '—'} />
              <InfoRow label="Fila" valor={ticket?.fila_nome || '—'} />
              <InfoRow label="Criado" valor={formatarDataRelativa(ticket?.criado_em)} />
              {ticket?.tempo_primeira_resposta_seg && (
                <InfoRow label="1ª resposta" valor={formatarDuracao(ticket.tempo_primeira_resposta_seg)} />
              )}
              {ticket?.tempo_resolucao_seg && (
                <InfoRow label="Resolução" valor={formatarDuracao(ticket.tempo_resolucao_seg)} />
              )}
            </div>

            {/* Transferir pra Atendente */}
            {(isPendente || isAberto) && atendentes.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5" /> Transferir para atendente
                </h4>
                <div className="space-y-1 max-h-40 overflow-y-auto">
                  {atendentes.map((u) => (
                    <button
                      key={u.id}
                      onClick={() => transferirMutation.mutate({ usuario_id: u.id })}
                      disabled={transferirMutation.isPending}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[var(--color-surface-elevated)] dark:hover:bg-surface-dark-elevated transition-colors flex items-center gap-2"
                    >
                      <Avatar nome={u.nome} size="sm" />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{u.nome}</p>
                        <p className="text-2xs text-[var(--color-text-muted)]">{u.cargo || 'Atendente'}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Transferir pra Fila */}
            {(isPendente || isAberto) && (filas || []).filter(f => f.ativo).length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Transferir para fila
                </h4>
                <div className="space-y-1">
                  {(filas || []).filter(f => f.ativo).map((fila) => (
                    <button
                      key={fila.id}
                      onClick={() => transferirMutation.mutate({ fila_id: fila.id })}
                      disabled={transferirMutation.isPending}
                      className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[var(--color-surface-elevated)] dark:hover:bg-surface-dark-elevated transition-colors flex items-center gap-2"
                    >
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: fila.cor }} />
                      {fila.nome}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {abaAtiva === 'tags' && (
          <div className="p-4 space-y-4">
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Tags do ticket</h4>
              <div className="flex flex-wrap gap-1.5">
                {(ticket?.tags || []).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => removerTagMutation.mutate(tag.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white hover:opacity-80"
                    style={{ backgroundColor: tag.cor }}
                    title="Clique para remover"
                  >
                    {tag.nome} <XCircle className="w-3 h-3" />
                  </button>
                ))}
                {(ticket?.tags || []).length === 0 && <span className="text-xs text-[var(--color-text-muted)]">Nenhuma tag</span>}
              </div>
            </div>
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Adicionar</h4>
              <div className="flex flex-wrap gap-1.5">
                {(tagsDisponiveis || [])
                  .filter((t) => !(ticket?.tags || []).find((tt) => tt.id === t.id))
                  .map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => tagMutation.mutate(tag.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)]"
                    >
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tag.cor }} />
                      {tag.nome}
                    </button>
                  ))}
              </div>
            </div>
          </div>
        )}

        {abaAtiva === 'historico' && (
          <div className="p-4">
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-3">Tickets anteriores</h4>
            <div className="space-y-2">
              {(contato?.historico_tickets || [])
                .filter((t) => t.id !== ticketAtivo.id)
                .map((t) => (
                  <button
                    key={t.id}
                    onClick={() => selecionarTicket({ ...ticketAtivo, ...t, contato_id: ticketAtivo.contato_id })}
                    className="w-full text-left p-3 rounded-lg bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated hover:ring-1 hover:ring-primary/30"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">#{t.protocolo}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-2xs font-medium', corStatus(t.status))}>{t.status}</span>
                    </div>
                    <p className="text-2xs text-[var(--color-text-muted)] mt-1">{formatarDataRelativa(t.criado_em)}</p>
                  </button>
                ))}
              {(contato?.historico_tickets || []).filter((t) => t.id !== ticketAtivo.id).length === 0 && (
                <span className="text-xs text-[var(--color-text-muted)]">Sem histórico</span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function InfoRow({ label, valor, children }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      {children || <span className="text-xs font-medium text-[var(--color-text-secondary)]">{valor}</span>}
    </div>
  );
}