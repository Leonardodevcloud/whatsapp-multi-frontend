// src/components/chat/ChatArea.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Button, Skeleton, EmptyState } from '../ui';
import {
  Send, StickyNote, Check, CheckCheck, Clock, AlertCircle,
  MessageSquare, X, Download, Play, Zap,
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
  const [lightbox, setLightbox] = useState(null);
  const [quickReplyAberto, setQuickReplyAberto] = useState(false);
  const [quickReplyIdx, setQuickReplyIdx] = useState(0);
  const chatRef = useRef(null);
  const inputRef = useRef(null);

  // Mensagens com polling 3s
  const { data, isLoading } = useQuery({
    queryKey: ['mensagens', ticketAtivo?.id],
    queryFn: () => api.get(`/api/messages/${ticketAtivo.id}?limite=100`),
    enabled: !!ticketAtivo?.id,
    refetchInterval: 3000,
  });

  const mensagens = data?.mensagens || [];

  // Respostas rápidas
  const { data: respostasRapidas } = useQuery({
    queryKey: ['respostas-rapidas'],
    queryFn: () => api.get('/api/quick-replies'),
  });

  // Filtrar respostas pelo texto digitado
  const quickRepliesFiltradas = (respostasRapidas || []).filter(r => {
    if (!texto.startsWith('/')) return false;
    const busca = texto.slice(1).toLowerCase();
    return r.atalho.toLowerCase().includes(busca) || r.titulo.toLowerCase().includes(busca);
  });

  // Scroll automático
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (mensagens.length > prevCountRef.current && chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
    prevCountRef.current = mensagens.length;
  }, [mensagens.length]);

  // WebSocket
  useEffect(() => {
    if (!ticketAtivo?.id) return;
    const cleanup = wsClient.on('mensagem:nova', (dados) => {
      if (dados.ticket_id === ticketAtivo.id) {
        queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      }
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-contadores'] });
    });
    return cleanup;
  }, [ticketAtivo?.id]);

  // Enviar
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

  // Selecionar resposta rápida
  const selecionarQuickReply = (resposta) => {
    setTexto(resposta.corpo);
    setQuickReplyAberto(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e) => {
    // Navegação nas respostas rápidas
    if (quickReplyAberto && quickRepliesFiltradas.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setQuickReplyIdx((prev) => Math.min(prev + 1, quickRepliesFiltradas.length - 1));
        return;
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setQuickReplyIdx((prev) => Math.max(prev - 1, 0));
        return;
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault();
        selecionarQuickReply(quickRepliesFiltradas[quickReplyIdx]);
        return;
      }
      if (e.key === 'Escape') {
        setQuickReplyAberto(false);
        return;
      }
    }

    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleEnviar();
    }
  };

  // Detectar / pra abrir respostas rápidas
  useEffect(() => {
    if (texto.startsWith('/') && quickRepliesFiltradas.length > 0) {
      setQuickReplyAberto(true);
      setQuickReplyIdx(0);
    } else {
      setQuickReplyAberto(false);
    }
  }, [texto, quickRepliesFiltradas.length]);

  if (!ticketAtivo) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[var(--color-bg)]">
        <EmptyState icone={MessageSquare} titulo="Selecione um ticket" descricao="Escolha uma conversa na lista ao lado" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-bg)] min-w-0">
      {/* Header */}
      <div className="h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Avatar nome={ticketAtivo.contato_nome} src={ticketAtivo.contato_avatar} size="md" />
          <div className="min-w-0">
            <h3 className="text-sm font-semibold truncate">{ticketAtivo.contato_nome || ticketAtivo.contato_telefone}</h3>
            <p className="text-2xs text-[var(--color-text-muted)]">#{ticketAtivo.protocolo}</p>
          </div>
        </div>
        <span className={cn('px-2 py-0.5 rounded text-xs font-medium',
          ticketAtivo.status === 'pendente' ? 'bg-amber-100 text-amber-700' :
          ticketAtivo.status === 'aberto' ? 'bg-blue-100 text-blue-700' :
          'bg-neutral-100 text-neutral-600'
        )}>
          {ticketAtivo.status}
        </span>
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
          mensagens.map((msg) => <ChatBubble key={msg.id} mensagem={msg} onLightbox={setLightbox} />)
        )}
      </div>

      {/* IA */}
      <AiPanel ticketId={ticketAtivo.id} onUsarSugestao={(t) => setTexto(t)} />

      {/* Quick replies popup */}
      {quickReplyAberto && quickRepliesFiltradas.length > 0 && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] max-h-48 overflow-y-auto">
          {quickRepliesFiltradas.map((r, i) => (
            <button
              key={r.id}
              onClick={() => selecionarQuickReply(r)}
              className={cn(
                'w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors',
                i === quickReplyIdx ? 'bg-primary/10' : 'hover:bg-[var(--color-surface-elevated)]'
              )}
            >
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <code className="text-xs font-mono text-primary">{r.atalho}</code>
                  <span className="text-xs font-medium">{r.titulo}</span>
                </div>
                <p className="text-2xs text-[var(--color-text-muted)] truncate mt-0.5">{r.corpo}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Input */}
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
          <button
            onClick={() => setModoNota(!modoNota)}
            title="Nota interna"
            className={cn(
              'w-9 h-9 rounded-lg flex items-center justify-center transition-colors shrink-0',
              modoNota ? 'bg-amber-100 text-amber-700' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
            )}
          >
            <StickyNote className="w-4 h-4" />
          </button>

          <textarea
            ref={inputRef}
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={modoNota ? 'Escreva uma nota interna...' : 'Digite / para respostas rápidas...'}
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

      {/* Lightbox */}
      {lightbox && <Lightbox url={lightbox.url} tipo={lightbox.tipo} onFechar={() => setLightbox(null)} />}
    </div>
  );
}

// ============================================================
// Lightbox
// ============================================================
function Lightbox({ url, tipo, onFechar }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center animate-fade-in" onClick={onFechar}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <a href={url} download target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}
           className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
          <Download className="w-5 h-5 text-white" />
        </a>
        <button onClick={onFechar} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center">
          <X className="w-5 h-5 text-white" />
        </button>
      </div>
      <div onClick={(e) => e.stopPropagation()} className="max-w-[90vw] max-h-[90vh]">
        {tipo === 'video' ? (
          <video controls autoPlay className="max-w-full max-h-[90vh] rounded-lg"><source src={url} /></video>
        ) : (
          <img src={url} alt="Mídia" className="max-w-full max-h-[90vh] object-contain rounded-lg" />
        )}
      </div>
    </div>
  );
}

// ============================================================
// ChatBubble
// ============================================================
function ChatBubble({ mensagem, onLightbox }) {
  const { is_from_me, is_internal, tipo, corpo, criado_em, status_envio, usuario_nome, contato_nome, media_url, nome_participante, nomeParticipante } = mensagem;
  const participante = nome_participante || nomeParticipante;

  if (tipo === 'sistema') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-2xs text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated px-3 py-1 rounded-full">{corpo}</span>
      </div>
    );
  }

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
      <div className={cn('max-w-[75%] rounded-2xl overflow-hidden',
        enviada ? 'bg-primary text-white rounded-br-md' : 'bg-[var(--chat-bubble-received)] text-[var(--chat-bubble-received-text)] rounded-bl-md'
      )}>
        {!enviada && (participante || contato_nome) && (
          <span className="text-2xs font-medium text-primary mb-0.5 block px-4 pt-2">{participante || contato_nome}</span>
        )}
        <MediaContent tipo={tipo} corpo={corpo} mediaUrl={media_url} enviada={enviada} onLightbox={onLightbox} />
        <div className={cn('flex items-center justify-end gap-1 px-4 pb-2', enviada ? 'text-white/60' : 'text-[var(--color-text-muted)]')}>
          <span className="text-2xs">{formatarDataMensagem(criado_em)}</span>
          {enviada && <StatusIcon status={status_envio} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MediaContent
// ============================================================
function MediaContent({ tipo, corpo, mediaUrl, enviada, onLightbox }) {
  switch (tipo) {
    case 'imagem':
      return (<div>
        {mediaUrl ? (
          <button onClick={() => onLightbox({ url: mediaUrl, tipo: 'imagem' })} className="block cursor-pointer">
            <img src={mediaUrl} alt="Imagem" className="max-w-full max-h-64 object-cover hover:opacity-90 transition-opacity" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
          </button>
        ) : (<div className="px-4 pt-2 flex items-center gap-2"><span className="text-lg">📷</span><span className="text-sm opacity-80">Imagem</span></div>)}
        {corpo && corpo !== '📷 Imagem' && <p className="text-sm whitespace-pre-wrap break-words px-4 pt-1">{corpo}</p>}
      </div>);

    case 'audio':
      return (<div className="px-4 pt-2">
        {mediaUrl ? (<audio controls className="max-w-full" style={{ minWidth: '220px' }}><source src={mediaUrl} type="audio/ogg" /><source src={mediaUrl} type="audio/mpeg" /></audio>)
        : (<div className="flex items-center gap-2"><span className="text-lg">🎵</span><span className="text-sm opacity-80">Áudio</span></div>)}
      </div>);

    case 'video':
      return (<div>
        {mediaUrl ? (
          <button onClick={() => onLightbox({ url: mediaUrl, tipo: 'video' })} className="relative block cursor-pointer group">
            <video preload="metadata" className="max-w-full max-h-48"><source src={mediaUrl} /></video>
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40"><div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-6 h-6 text-neutral-800 ml-0.5" /></div></div>
          </button>
        ) : (<div className="px-4 pt-2 flex items-center gap-2"><span className="text-lg">🎥</span><span className="text-sm opacity-80">Vídeo</span></div>)}
        {corpo && corpo !== '🎥 Vídeo' && <p className="text-sm whitespace-pre-wrap break-words px-4 pt-1">{corpo}</p>}
      </div>);

    case 'documento':
      return (<div className="px-4 pt-2">
        {mediaUrl ? (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className={cn('flex items-center gap-3 p-3 rounded-lg transition-colors', enviada ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5')}>
            <span className="text-2xl">📄</span>
            <div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{corpo || 'Documento'}</p><p className="text-2xs opacity-60">Clique para baixar</p></div>
            <Download className="w-4 h-4 opacity-60" />
          </a>
        ) : (<div className="flex items-center gap-2"><span className="text-lg">📄</span><span className="text-sm opacity-80">{corpo || 'Documento'}</span></div>)}
      </div>);

    case 'localizacao':
      return (<div className="px-4 pt-2"><div className={cn('flex items-center gap-2 p-2 rounded-lg', enviada ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5')}><span className="text-2xl">📍</span><div><p className="text-sm font-medium">Localização</p><p className="text-2xs opacity-70">{corpo}</p></div></div></div>);

    case 'contato':
      return (<div className="px-4 pt-2"><div className={cn('flex items-center gap-2 p-2 rounded-lg', enviada ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5')}><span className="text-2xl">👤</span><p className="text-sm">{corpo || 'Contato'}</p></div></div>);

    case 'sticker':
      return (<div className="px-4 pt-2">{mediaUrl ? (<img src={mediaUrl} alt="Sticker" className="w-32 h-32 object-contain" loading="lazy" />) : (<span className="text-4xl">🎭</span>)}</div>);

    default:
      return (<p className="text-sm whitespace-pre-wrap break-words px-4 pt-2">{corpo || '📎 Mídia'}</p>);
  }
}

function StatusIcon({ status }) {
  switch (status) {
    case 'pendente': return <Clock className="w-3 h-3" />;
    case 'enviada': return <Check className="w-3 h-3" />;
    case 'entregue': return <CheckCheck className="w-3 h-3" />;
    case 'lida': return <CheckCheck className="w-3 h-3 text-blue-300" />;
    case 'erro': return <AlertCircle className="w-3 h-3 text-red-300" />;
    default: return <Check className="w-3 h-3" />;
  }
}