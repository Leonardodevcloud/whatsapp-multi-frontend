// src/components/tickets/TicketPanel.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Button } from '../ui';
import {
  Phone, X, Pencil, Check, ChevronRight, Image, FileText, Video,
  CheckCircle2, XCircle, Pause, Users, Layers, Clock,
  BellOff, Bell, BookOpen, Tag, Copy,
} from 'lucide-react';
import { cn, formatarTelefone, formatarDataRelativa, formatarDuracao, corStatus, corPrioridade } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function TicketPanel({ onFechar }) {
  const ticketAtivo = useTicketStore((s) => s.ticketAtivo);
  const selecionarTicket = useTicketStore((s) => s.selecionarTicket);
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const [editandoNome, setEditandoNome] = useState(false);
  const [novoNome, setNovoNome] = useState('');
  const [silenciado, setSilenciado] = useState(false);
  const [galeriaAberta, setGaleriaAberta] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const nomeInputRef = useRef(null);

  const { data: ticket } = useQuery({
    queryKey: ['ticket-detalhe', ticketAtivo?.id],
    queryFn: () => api.get(`/api/tickets/${ticketAtivo.id}`),
    enabled: !!ticketAtivo?.id,
  });

  const { data: contato, refetch: refetchContato } = useQuery({
    queryKey: ['contato-detalhe', ticketAtivo?.contato_id],
    queryFn: () => api.get(`/api/contacts/${ticketAtivo.contato_id}`),
    enabled: !!ticketAtivo?.contato_id,
  });

  // Mídias do contato (preview — só 8 itens)
  const { data: midiasData } = useQuery({
    queryKey: ['contato-midias', ticketAtivo?.contato_id],
    queryFn: () => api.get(`/api/contacts/${ticketAtivo.contato_id}/midias?limite=8`),
    enabled: !!ticketAtivo?.contato_id,
  });

  // Todas mídias (quando galeria aberta)
  const { data: todasMidiasData } = useQuery({
    queryKey: ['contato-midias-todas', ticketAtivo?.contato_id],
    queryFn: () => api.get(`/api/contacts/${ticketAtivo.contato_id}/midias?limite=200`),
    enabled: !!ticketAtivo?.contato_id && galeriaAberta,
  });

  const { data: tagsDisponiveis } = useQuery({ queryKey: ['tags'], queryFn: () => api.get('/api/tags') });
  const { data: filas } = useQuery({ queryKey: ['filas'], queryFn: () => api.get('/api/queues') });
  const { data: todosUsuarios } = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get('/api/users') });

  const midias = midiasData?.midias || [];
  const totalMidias = midiasData?.total || 0;
  const todasMidias = todasMidiasData?.midias || [];

  const invalidarTudo = () => {
    queryClient.invalidateQueries({ queryKey: ['ticket-detalhe', ticketAtivo?.id] });
    queryClient.invalidateQueries({ queryKey: ['tickets'] });
    queryClient.invalidateQueries({ queryKey: ['chamados-meus'] });
    queryClient.invalidateQueries({ queryKey: ['chamados-fila'] });
    queryClient.invalidateQueries({ queryKey: ['chamados-atendimento'] });
  };

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

  // Salvar nome editado
  const salvarNomeMutation = useMutation({
    mutationFn: (nome) => api.patch(`/api/contacts/${ticketAtivo.contato_id}`, { nome }),
    onSuccess: () => {
      refetchContato();
      invalidarTudo();
      setEditandoNome(false);
      toast.success('Nome atualizado!');
    },
    onError: (err) => toast.error(err.message || 'Erro ao salvar nome'),
  });

  const handleSalvarNome = () => {
    const nome = novoNome.trim();
    if (!nome || nome === (contato?.nome || '')) {
      setEditandoNome(false);
      return;
    }
    salvarNomeMutation.mutate(nome);
  };

  const handleIniciarEdicaoNome = () => {
    setNovoNome(contato?.nome || ticketAtivo.contato_nome || '');
    setEditandoNome(true);
    setTimeout(() => nomeInputRef.current?.focus(), 50);
  };

  useEffect(() => {
    if (editandoNome && nomeInputRef.current) {
      nomeInputRef.current.select();
    }
  }, [editandoNome]);

  if (!ticketAtivo) return null;

  const status = ticket?.status || ticketAtivo.status;
  const isAberto = status === 'aberto' || status === 'aguardando';
  const isPendente = status === 'pendente';
  const atendentes = (todosUsuarios?.usuarios || todosUsuarios || []).filter(u => u.id !== usuario?.id && u.ativo !== false);
  const nomeContato = contato?.nome || ticketAtivo.contato_nome;
  const telefoneContato = contato?.telefone || ticketAtivo.contato_telefone;

  return (
    <div className="w-80 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col shrink-0 overflow-hidden">

      {/* ========== HEADER ========== */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
        <button
          onClick={onFechar}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-[var(--color-text)] transition-colors"
          title="Fechar painel"
        >
          <X className="w-4 h-4" />
        </button>
        <button
          onClick={handleIniciarEdicaoNome}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-primary transition-colors"
          title="Editar contato"
        >
          <Pencil className="w-4 h-4" />
        </button>
      </div>

      {/* ========== CONTEÚDO SCROLLÁVEL ========== */}
      <div className="flex-1 overflow-y-auto scrollbar-thin">

        {/* ========== AVATAR + NOME + TELEFONE ========== */}
        <div className="flex flex-col items-center pt-6 pb-4 px-4">
          {/* Avatar grande */}
          <div className="relative mb-4">
            <Avatar
              nome={nomeContato}
              src={contato?.avatar_url || ticketAtivo.contato_avatar}
              size="xl"
            />
          </div>

          {/* Nome (editável) */}
          {editandoNome ? (
            <div className="flex items-center gap-2 w-full max-w-[220px]">
              <input
                ref={nomeInputRef}
                type="text"
                value={novoNome}
                onChange={(e) => setNovoNome(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSalvarNome();
                  if (e.key === 'Escape') setEditandoNome(false);
                }}
                className="flex-1 text-center text-sm font-semibold bg-[var(--color-surface-elevated)] rounded-lg px-3 py-1.5 outline-none focus:ring-2 focus:ring-primary/30 border border-[var(--color-border)]"
                maxLength={200}
              />
              <button
                onClick={handleSalvarNome}
                disabled={salvarNomeMutation.isPending}
                className="w-7 h-7 rounded-lg bg-primary text-white flex items-center justify-center hover:bg-primary/90 transition-colors shrink-0"
              >
                {salvarNomeMutation.isPending
                  ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
              </button>
            </div>
          ) : (
            <h3
              className="text-base font-semibold text-[var(--color-text)] text-center cursor-pointer hover:text-primary transition-colors truncate max-w-full px-2"
              onClick={handleIniciarEdicaoNome}
              title="Clique para editar"
            >
              {nomeContato || telefoneContato}
            </h3>
          )}

          {/* Telefone */}
          <button
            onClick={() => { navigator.clipboard.writeText(telefoneContato || ''); toast.success('Copiado!'); }}
            className="flex items-center gap-1.5 mt-1.5 text-xs text-[var(--color-text-muted)] hover:text-primary transition-colors group"
          >
            <Phone className="w-3 h-3" />
            <span>{formatarTelefone(telefoneContato)}</span>
            <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        </div>

        {/* ========== MÍDIAS E DOCUMENTOS ========== */}
        <div className="border-t border-[var(--color-border)]">
          <button
            onClick={() => setGaleriaAberta(!galeriaAberta)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors"
          >
            <span className="text-sm font-medium text-[var(--color-text)]">Mídias e documentos</span>
            <div className="flex items-center gap-2">
              {totalMidias > 0 && (
                <span className="text-xs text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-2 py-0.5 rounded-full font-medium">
                  {totalMidias}
                </span>
              )}
              <ChevronRight className={cn('w-4 h-4 text-[var(--color-text-muted)] transition-transform', galeriaAberta && 'rotate-90')} />
            </div>
          </button>

          {/* Grid de thumbnails (preview) */}
          {!galeriaAberta && midias.length > 0 && (
            <div className="px-4 pb-3">
              <div className="grid grid-cols-4 gap-1.5">
                {midias.slice(0, 8).map((m) => (
                  <MidiaThumbnail key={m.id} midia={m} onClick={() => setLightbox(m)} />
                ))}
              </div>
            </div>
          )}

          {!galeriaAberta && midias.length === 0 && (
            <p className="px-4 pb-3 text-xs text-[var(--color-text-muted)]">Nenhuma mídia compartilhada</p>
          )}

          {/* Galeria expandida */}
          {galeriaAberta && (
            <div className="px-4 pb-3">
              <div className="grid grid-cols-4 gap-1.5">
                {(todasMidias.length > 0 ? todasMidias : midias).map((m) => (
                  <MidiaThumbnail key={m.id} midia={m} onClick={() => setLightbox(m)} />
                ))}
              </div>
              {todasMidias.length === 0 && midias.length === 0 && (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-3">Nenhuma mídia</p>
              )}
            </div>
          )}
        </div>

        {/* ========== INFO DO TICKET ========== */}
        <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-2.5">
          <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider">Ticket</h4>
          <InfoRow label="Protocolo" valor={`#${ticket?.protocolo || ticketAtivo.protocolo}`} />
          <InfoRow label="Prioridade">
            <span className={cn('text-xs font-medium', corPrioridade(ticket?.prioridade || 'normal'))}>
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

        {/* ========== AÇÕES RÁPIDAS ========== */}
        {isAberto && (
          <div className="border-t border-[var(--color-border)] px-4 py-3">
            <div className="flex gap-2">
              <button
                onClick={() => resolverMutation.mutate()}
                disabled={resolverMutation.isPending}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 transition-colors disabled:opacity-50"
              >
                <CheckCircle2 className="w-3.5 h-3.5" /> Resolver
              </button>
              <button
                onClick={() => aguardandoMutation.mutate()}
                disabled={aguardandoMutation.isPending}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-amber-500 bg-amber-500/10 hover:bg-amber-500/20 transition-colors"
                title="Aguardando"
              >
                <Pause className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => fecharMutation.mutate()}
                disabled={fecharMutation.isPending}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-red-500 bg-red-500/10 hover:bg-red-500/20 transition-colors"
                title="Fechar"
              >
                <XCircle className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* ========== SILENCIAR + NÃO LIDA ========== */}
        <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              {silenciado ? <BellOff className="w-4 h-4 text-[var(--color-text-muted)]" /> : <Bell className="w-4 h-4 text-[var(--color-text-muted)]" />}
              <span className="text-sm text-[var(--color-text)]">Silenciar</span>
            </div>
            <button
              onClick={() => { setSilenciado(!silenciado); toast.success(silenciado ? 'Notificações ativadas' : 'Conversa silenciada'); }}
              className={cn(
                'w-10 h-5.5 rounded-full relative transition-colors',
                silenciado ? 'bg-primary' : 'bg-[var(--color-border)]'
              )}
            >
              <div className={cn(
                'absolute top-0.5 w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform',
                silenciado ? 'translate-x-5' : 'translate-x-0.5'
              )} />
            </button>
          </div>

          <button
            onClick={() => {
              api.post(`/api/messages/${ticketAtivo.id}/lidas`).catch(() => {});
              toast.success('Marcado como não lida');
            }}
            className="w-full flex items-center gap-2 py-2 px-3 rounded-lg text-sm text-primary bg-primary/5 hover:bg-primary/10 transition-colors font-medium"
          >
            <BookOpen className="w-4 h-4" />
            Marcar como não lida
          </button>
        </div>

        {/* ========== TAGS ========== */}
        <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-2.5">
          <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Tag className="w-3.5 h-3.5" /> Tags
          </h4>
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
          </div>
          {/* Tags disponíveis para adicionar */}
          {(tagsDisponiveis || []).filter((t) => !(ticket?.tags || []).find((tt) => tt.id === t.id)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 pt-1">
              {(tagsDisponiveis || [])
                .filter((t) => !(ticket?.tags || []).find((tt) => tt.id === t.id))
                .map((tag) => (
                  <button
                    key={tag.id}
                    onClick={() => tagMutation.mutate(tag.id)}
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] transition-colors"
                  >
                    <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.cor }} />
                    {tag.nome}
                  </button>
                ))}
            </div>
          )}
          {(ticket?.tags || []).length === 0 && (tagsDisponiveis || []).length === 0 && (
            <span className="text-xs text-[var(--color-text-muted)]">Nenhuma tag</span>
          )}
        </div>

        {/* ========== TRANSFERIR PARA ATENDENTE ========== */}
        {(isPendente || isAberto) && atendentes.length > 0 && (
          <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Transferir para atendente
            </h4>
            <div className="space-y-1 max-h-40 overflow-y-auto">
              {atendentes.map((u) => (
                <button
                  key={u.id}
                  onClick={() => transferirMutation.mutate({ usuario_id: u.id })}
                  disabled={transferirMutation.isPending}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center gap-2"
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

        {/* ========== TRANSFERIR PARA FILA ========== */}
        {(isPendente || isAberto) && (filas || []).filter(f => f.ativo).length > 0 && (
          <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-2">
            <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Transferir para fila
            </h4>
            <div className="space-y-1">
              {(filas || []).filter(f => f.ativo).map((fila) => (
                <button
                  key={fila.id}
                  onClick={() => transferirMutation.mutate({ fila_id: fila.id })}
                  disabled={transferirMutation.isPending}
                  className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-[var(--color-surface-elevated)] transition-colors flex items-center gap-2"
                >
                  <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: fila.cor }} />
                  {fila.nome}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ========== HISTÓRICO DE TICKETS ========== */}
        <div className="border-t border-[var(--color-border)] px-4 py-3 space-y-2">
          <h4 className="text-xs font-semibold text-[var(--color-text-muted)] uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> Histórico
          </h4>
          <div className="space-y-1.5">
            {(contato?.historico_tickets || [])
              .filter((t) => t.id !== ticketAtivo.id)
              .slice(0, 5)
              .map((t) => (
                <button
                  key={t.id}
                  onClick={() => selecionarTicket({ ...ticketAtivo, ...t, contato_id: ticketAtivo.contato_id })}
                  className="w-full text-left p-2.5 rounded-lg bg-[var(--color-surface-elevated)] hover:ring-1 hover:ring-primary/30 transition-all"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-2xs font-mono text-[var(--color-text-muted)]">#{t.protocolo}</span>
                    <span className={cn('px-1.5 py-0.5 rounded text-2xs font-medium', corStatus(t.status))}>{t.status}</span>
                  </div>
                  <p className="text-2xs text-[var(--color-text-muted)]">{formatarDataRelativa(t.criado_em)}</p>
                </button>
              ))}
            {(contato?.historico_tickets || []).filter((t) => t.id !== ticketAtivo.id).length === 0 && (
              <span className="text-xs text-[var(--color-text-muted)]">Sem histórico</span>
            )}
          </div>
        </div>

        {/* Espaçamento final */}
        <div className="h-4" />
      </div>

      {/* ========== LIGHTBOX DE MÍDIA ========== */}
      {lightbox && (
        <div className="fixed inset-0 z-[9999] bg-black/80 flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X className="w-5 h-5" />
          </button>
          <div className="max-w-[90vw] max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
            {lightbox.tipo === 'imagem' || lightbox.tipo === 'sticker' ? (
              <img src={lightbox.media_url} alt="" className="max-w-full max-h-[85vh] object-contain rounded-lg" />
            ) : lightbox.tipo === 'video' ? (
              <video src={lightbox.media_url} controls autoPlay className="max-w-full max-h-[85vh] rounded-lg" />
            ) : (
              <div className="bg-[var(--color-surface)] rounded-xl p-6 text-center">
                <FileText className="w-12 h-12 mx-auto mb-3 text-[var(--color-text-muted)]" />
                <p className="text-sm font-medium mb-3">{lightbox.media_nome || lightbox.corpo || 'Documento'}</p>
                <a href={lightbox.media_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                  Abrir documento
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

/* ========== COMPONENTES AUXILIARES ========== */

function MidiaThumbnail({ midia, onClick }) {
  const isImagem = midia.tipo === 'imagem' || midia.tipo === 'sticker';
  const isVideo = midia.tipo === 'video';

  return (
    <button
      onClick={onClick}
      className="aspect-square rounded-lg overflow-hidden bg-[var(--color-surface-elevated)] hover:opacity-80 transition-opacity relative group"
    >
      {isImagem && midia.media_url ? (
        <img src={midia.media_url} alt="" className="w-full h-full object-cover" loading="lazy" />
      ) : isVideo && midia.media_url ? (
        <>
          <video src={midia.media_url} className="w-full h-full object-cover" muted preload="metadata" />
          <div className="absolute inset-0 flex items-center justify-center bg-black/30">
            <Video className="w-4 h-4 text-white" />
          </div>
        </>
      ) : (
        <div className="w-full h-full flex flex-col items-center justify-center gap-1 p-1">
          <FileText className="w-5 h-5 text-[var(--color-text-muted)]" />
          <span className="text-2xs text-[var(--color-text-muted)] truncate w-full text-center">
            {midia.media_nome || 'doc'}
          </span>
        </div>
      )}
    </button>
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
