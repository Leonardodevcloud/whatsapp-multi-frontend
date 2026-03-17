// src/components/tickets/TicketPanel.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Button, Badge, EmptyState } from '../ui';
import {
  Phone, Mail, StickyNote, Tag, Clock, User, ArrowRightLeft,
  CheckCircle2, XCircle, Pause, UserPlus, ChevronDown, Copy,
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

  // Detalhes completos do ticket
  const { data: ticket } = useQuery({
    queryKey: ['ticket-detalhe', ticketAtivo?.id],
    queryFn: () => api.get(`/api/tickets/${ticketAtivo.id}`),
    enabled: !!ticketAtivo?.id,
  });

  // Detalhes do contato com histórico
  const { data: contato } = useQuery({
    queryKey: ['contato-detalhe', ticketAtivo?.contato_id],
    queryFn: () => api.get(`/api/contacts/${ticketAtivo.contato_id}`),
    enabled: !!ticketAtivo?.contato_id,
  });

  // Tags disponíveis
  const { data: tagsDisponiveis } = useQuery({
    queryKey: ['tags'],
    queryFn: () => api.get('/api/tags'),
  });

  // Filas
  const { data: filas } = useQuery({
    queryKey: ['filas'],
    queryFn: () => api.get('/api/queues'),
  });

  // Atendentes online
  const { data: atendentesOnline } = useQuery({
    queryKey: ['atendentes-online'],
    queryFn: () => api.get('/api/users/online'),
  });

  const invalidarTudo = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket-detalhe', ticketAtivo?.id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
  };

  // Mutations
  const aceitarMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo.id}/aceitar`),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); toast.success('Ticket aceito!'); },
    onError: (err) => toast.error(err.message),
  });

  const resolverMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo.id}/resolver`),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); toast.success('Ticket resolvido!'); },
    onError: (err) => toast.error(err.message),
  });

  const fecharMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo.id}/fechar`),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); toast.success('Ticket fechado'); },
    onError: (err) => toast.error(err.message),
  });

  const aguardandoMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo.id}/aguardando`),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); },
    onError: (err) => toast.error(err.message),
  });

  const transferirMutation = useMutation({
    mutationFn: ({ fila_id, usuario_id }) => api.post(`/api/tickets/${ticketAtivo.id}/transferir`, { fila_id, usuario_id }),
    onSuccess: (data) => { selecionarTicket(data); invalidarTudo(); toast.success('Ticket transferido!'); },
    onError: (err) => toast.error(err.message),
  });

  const tagMutation = useMutation({
    mutationFn: (tagId) => api.post(`/api/tags/tickets/${ticketAtivo.id}`, { tag_id: tagId }),
    onSuccess: () => { invalidarTudo(); },
  });

  const removerTagMutation = useMutation({
    mutationFn: (tagId) => api.delete(`/api/tags/tickets/${ticketAtivo.id}/${tagId}`),
    onSuccess: () => { invalidarTudo(); },
  });

  if (!ticketAtivo) return null;

  const status = ticket?.status || ticketAtivo.status;
  const isPendente = status === 'pendente';
  const isAberto = status === 'aberto' || status === 'aguardando';

  return (
    <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0 overflow-hidden">
      {/* Ações rápidas */}
      <div className="p-3 border-b border-[var(--color-border)] space-y-2">
        {isPendente && (
          <Button className="w-full" onClick={() => aceitarMutation.mutate()} loading={aceitarMutation.isPending}>
            <UserPlus className="w-4 h-4" /> Aceitar ticket
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
        {[
          { id: 'info', label: 'Info' },
          { id: 'tags', label: 'Tags' },
          { id: 'historico', label: 'Histórico' },
        ].map((aba) => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={cn(
              'flex-1 py-2.5 text-xs font-medium transition-colors border-b-2',
              abaAtiva === aba.id
                ? 'text-primary border-primary'
                : 'text-[var(--color-text-muted)] border-transparent hover:text-[var(--color-text-secondary)]'
            )}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da aba */}
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
                {contato?.email && (
                  <p className="text-xs text-[var(--color-text-muted)] flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" /> {contato.email}
                  </p>
                )}
              </div>
            </div>

            {/* Notas do contato */}
            {contato?.notas && (
              <div className="bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <StickyNote className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  <span className="text-xs font-medium text-[var(--color-text-secondary)]">Notas</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap">{contato.notas}</p>
              </div>
            )}

            {/* Detalhes do ticket */}
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

            {/* Transferir */}
            {isAberto && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Transferir</h4>
                <div className="space-y-1">
                  {(filas || []).filter(f => f.ativo).map((fila) => (
                    <button
                      key={fila.id}
                      onClick={() => transferirMutation.mutate({ fila_id: fila.id })}
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
            {/* Tags do ticket */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Tags do ticket</h4>
              <div className="flex flex-wrap gap-1.5">
                {(ticket?.tags || []).map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => removerTagMutation.mutate(tag.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium text-white hover:opacity-80 transition-opacity"
                    style={{ backgroundColor: tag.cor }}
                    title="Clique para remover"
                  >
                    {tag.nome} <XCircle className="w-3 h-3" />
                  </button>
                ))}
                {(ticket?.tags || []).length === 0 && (
                  <span className="text-xs text-[var(--color-text-muted)]">Nenhuma tag</span>
                )}
              </div>
            </div>

            {/* Adicionar tag */}
            <div>
              <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider mb-2">Adicionar</h4>
              <div className="flex flex-wrap gap-1.5">
                {(tagsDisponiveis || [])
                  .filter((t) => !(ticket?.tags || []).find((tt) => tt.id === t.id))
                  .map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => tagMutation.mutate(tag.id)}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] transition-colors"
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
                    className="w-full text-left p-3 rounded-lg bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated hover:ring-1 hover:ring-primary/30 transition-all"
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">#{t.protocolo}</span>
                      <span className={cn('px-1.5 py-0.5 rounded text-2xs font-medium', corStatus(t.status))}>{t.status}</span>
                    </div>
                    {t.assunto && <p className="text-xs text-[var(--color-text-secondary)] truncate">{t.assunto}</p>}
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
