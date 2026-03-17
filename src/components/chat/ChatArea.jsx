// src/components/chat/ChatArea.jsx
import { useState, useEffect, useRef, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Button, Skeleton, EmptyState, Badge } from '../ui';
import {
  Send, Paperclip, Smile, StickyNote, Check, CheckCheck,
  Clock, AlertCircle, MessageSquare, ArrowDown, CornerDownRight,
} from 'lucide-react';
import { cn, formatarDataMensagem } from '../../lib/utils';
import api from '../../lib/api';
import wsClient from '../../lib/websocket';
import toast from 'react-hot-toast';
import AiPanel from './AiPanel';

export default function ChatArea() {
  const ticketAtivo = useTicketStore((s) => s.ticketAtivo);
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const [texto, setTexto] = useState('');
  const [modoNota, setModoNota] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // Buscar mensagens do ticket ativo
  const { data, isLoading } = useQuery({
    queryKey: ['mensagens', ticketAtivo?.id],
    queryFn: () => api.get(`/api/messages/${ticketAtivo.id}?limite=100`),
    enabled: !!ticketAtivo?.id,
    refetchInterval: false,
  });

  const mensagens = data?.mensagens || [];

  // Scroll automático para o final
  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [mensagens.length]);

  // WebSocket — nova mensagem no ticket ativo
  useEffect(() => {
    if (!ticketAtivo?.id) return;

    const cleanup = wsClient.on('mensagem:nova', (dados) => {
      if (dados.ticket_id === ticketAtivo.id) {
        queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    });

    return cleanup;
  }, [ticketAtivo?.id]);

  // Enviar mensagem
  const enviarMutation = useMutation({
    mutationFn: async () => {
      if (modoNota) {
        return api.post(`/api/messages/${ticketAtivo.id}/nota`, { texto: texto.trim() });
      }
      return api.post('/api/whatsapp/enviar', { ticket_id: ticketAtivo.id, texto: texto.trim() });
    },
    onSuccess: () => {
      setTexto('');
      queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEnviar = () => {
    if (!texto.trim() || !ticketAtivo) return;
    enviarMutation.mutate();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  // Se não tem ticket selecionado
  if (!ticketAtivo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg)]">
        <EmptyState
          icone={MessageSquare}
          titulo="Selecione um ticket"
          descricao="Escolha uma conversa na lista ao lado para começar a atender"
        />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-bg)] min-w-0">
      {/* Header do chat */}
      <div className="h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar nome={ticketAtivo.contato_nome} src={ticketAtivo.contato_avatar} size="md" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{ticketAtivo.contato_nome || ticketAtivo.contato_telefone}</h3>
            <p className="text-2xs text-[var(--color-text-muted)]">#{ticketAtivo.protocolo}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={cn('px-2 py-0.5 rounded text-xs font-medium', 
            ticketAtivo.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
            ticketAtivo.status === 'aberto' ? 'bg-blue-100 text-blue-700' :
            'bg-neutral-100 text-neutral-600'
          )}>
            {ticketAtivo.status}
          </span>
        </div>
      </div>

      {/* Mensagens */}
      <div ref={chatRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-1">
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <Skeleton className={cn('h-10 rounded-2xl', i % 2 === 0 ? 'w-64' : 'w-48')} />
              </div>
            ))}
          </div>
        ) : (
          mensagens.map((msg) => <ChatBubble key={msg.id} mensagem={msg} />)
        )}
      </div>

      {/* Painel IA */}
      <AiPanel ticketId={ticketAtivo.id} onUsarSugestao={(texto) => setTexto(texto)} />

      {/* Input de mensagem */}
      <div className={cn(
        'border-t px-4 py-3 bg-[var(--color-surface)] shrink-0',
        modoNota ? 'border-t-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : 'border-[var(--color-border)]'
      )}>
        {modoNota && (
          <div className="flex items-center gap-1.5 mb-2">
            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">Nota interna — não será enviada ao cliente</span>
          </div>
        )}
        <div className="flex items-end gap-2">
          <div className="flex gap-1">
            <button
              onClick={() => setModoNota(!modoNota)}
              title="Nota interna"
              className={cn(
                'w-9 h-9 rounded-lg flex items-center justify-center transition-colors',
                modoNota ? 'bg-amber-100 text-amber-700' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
              )}
            >
              <StickyNote className="w-4.5 h-4.5" />
            </button>
          </div>

          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modoNota ? 'Escreva uma nota interna...' : 'Digite uma mensagem...'}
            rows={1}
            className="flex-1 resize-none rounded-xl bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32 border-0"
            style={{ minHeight: '40px' }}
          />

          <Button
            size="icon"
            onClick={handleEnviar}
            loading={enviarMutation.isPending}
            disabled={!texto.trim()}
            className={cn('rounded-xl shrink-0', modoNota && 'bg-amber-500 hover:bg-amber-600')}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// ChatBubble — bolha de mensagem
// ============================================================
function ChatBubble({ mensagem }) {
  const { is_from_me, is_internal, tipo, corpo, criado_em, status_envio, usuario_nome, contato_nome } = mensagem;

  // Mensagem de sistema
  if (tipo === 'sistema') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-2xs text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated px-3 py-1 rounded-full">
          {corpo}
        </span>
      </div>
    );
  }

  // Nota interna
  if (is_internal) {
    return (
      <div className="flex justify-end py-0.5">
        <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <div className="flex items-center gap-1.5 mb-1">
            <StickyNote className="w-3 h-3 text-amber-600" />
            <span className="text-2xs font-medium text-amber-600">Nota — {usuario_nome}</span>
          </div>
          <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap break-words">{corpo}</p>
          <span className="text-2xs text-amber-500 mt-1 block text-right">{formatarDataMensagem(criado_em)}</span>
        </div>
      </div>
    );
  }

  const enviada = is_from_me;

  return (
    <div className={cn('flex py-0.5', enviada ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-w-[75%] rounded-2xl px-4 py-2',
          enviada
            ? 'bg-primary text-white rounded-br-md'
            : 'bg-[var(--chat-bubble-received)] text-[var(--chat-bubble-received-text)] rounded-bl-md'
        )}
      >
        {!enviada && usuario_nome && (
          <span className="text-2xs font-medium text-primary mb-0.5 block">{contato_nome}</span>
        )}
        <p className="text-sm whitespace-pre-wrap break-words">{corpo || '📎 Mídia'}</p>
        <div className={cn('flex items-center justify-end gap-1 mt-1', enviada ? 'text-white/60' : 'text-[var(--color-text-muted)]')}>
          <span className="text-2xs">{formatarDataMensagem(criado_em)}</span>
          {enviada && <StatusIcon status={status_envio} />}
        </div>
      </div>
    </div>
  );
}

function StatusIcon({ status }) {
  switch (status) {
    case 'pendente':
      return <Clock className="w-3 h-3" />;
    case 'enviada':
      return <Check className="w-3 h-3" />;
    case 'entregue':
      return <CheckCheck className="w-3 h-3" />;
    case 'lida':
      return <CheckCheck className="w-3 h-3 text-blue-300" />;
    case 'erro':
      return <AlertCircle className="w-3 h-3 text-red-300" />;
    default:
      return <Check className="w-3 h-3" />;
  }
}
