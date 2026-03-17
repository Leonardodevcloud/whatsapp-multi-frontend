// src/components/chat/ChatArea.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTicketStore } from '../../stores/ticketStore';
import { useAuthStore } from '../../stores/authStore';
import { Avatar, Button, Skeleton, EmptyState } from '../ui';
import {
  Send, StickyNote, Check, CheckCheck, Clock, AlertCircle,
  MessageSquare, X, Download, Play, Zap, Mic, Plus,
  Image, FileText, Video, MapPin, ArrowRightLeft, CheckCircle2, Info, Sparkles,
} from 'lucide-react';
import { cn, formatarDataMensagem } from '../../lib/utils';
import api from '../../lib/api';
import wsClient from '../../lib/websocket';
import toast from 'react-hot-toast';
import AiPanel from './AiPanel';

// Helper — converter File pra base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ChatArea({ onTogglePainel, painelAberto }) {
  const ticketAtivo = useTicketStore((s) => s.ticketAtivo);
  const selecionarTicket = useTicketStore((s) => s.selecionarTicket);
  const usuario = useAuthStore((s) => s.usuario);
  const queryClient = useQueryClient();

  const [texto, setTexto] = useState('');
  const [modoNota, setModoNota] = useState(false);
  const [lightbox, setLightbox] = useState(null);
  const [quickReplyAberto, setQuickReplyAberto] = useState(false);
  const [quickReplyIdx, setQuickReplyIdx] = useState(0);
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const [menuAnexo, setMenuAnexo] = useState(false);
  const [digitando, setDigitando] = useState(null);
  const [enviandoMidia, setEnviandoMidia] = useState(false);
  const [melhorandoTexto, setMelhorandoTexto] = useState(false);
  const chatRef = useRef(null);
  const inputRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerGravacaoRef = useRef(null);

  const { data, isLoading } = useQuery({
    queryKey: ['mensagens', ticketAtivo?.id],
    queryFn: () => api.get(`/api/messages/${ticketAtivo.id}?limite=100`),
    enabled: !!ticketAtivo?.id,
    refetchInterval: 3000,
  });
  const mensagens = data?.mensagens || [];

  const { data: respostasRapidas } = useQuery({
    queryKey: ['respostas-rapidas'],
    queryFn: () => api.get('/api/quick-replies'),
  });

  const quickRepliesFiltradas = (respostasRapidas || []).filter(r => {
    if (!texto.startsWith('/')) return false;
    const busca = texto.slice(1).toLowerCase();
    return r.atalho.toLowerCase().includes(busca) || r.titulo.toLowerCase().includes(busca);
  });

  // Scroll
  const prevCountRef = useRef(0);
  useEffect(() => {
    if (mensagens.length > prevCountRef.current && chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
    prevCountRef.current = mensagens.length;
  }, [mensagens.length]);

  // WebSocket
  useEffect(() => {
    if (!ticketAtivo?.id) return;
    const c1 = wsClient.on('mensagem:nova', (dados) => {
      if (dados.ticket_id === ticketAtivo.id) queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['tickets-contadores'] });
    });
    const c2 = wsClient.on('contato:digitando', (dados) => {
      setDigitando(dados);
      setTimeout(() => setDigitando(null), 5000);
    });
    return () => { c1(); c2(); };
  }, [ticketAtivo?.id]);

  // Enviar texto
  const enviarMutation = useMutation({
    mutationFn: async () => {
      if (modoNota) return api.post(`/api/messages/${ticketAtivo.id}/nota`, { texto: texto.trim() });
      return api.post('/api/whatsapp/enviar', { ticket_id: ticketAtivo.id, texto: texto.trim() });
    },
    onSuccess: () => { setTexto(''); queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] }); queryClient.invalidateQueries({ queryKey: ['tickets'] }); },
    onError: (err) => toast.error(err.message),
  });

  const handleEnviar = () => { if (!texto.trim() || !ticketAtivo) return; enviarMutation.mutate(); };

  // ============ ENVIO DE MÍDIA ============
  const enviarMidia = async (file, tipo) => {
    if (!ticketAtivo || enviandoMidia) return;
    setEnviandoMidia(true);
    setMenuAnexo(false);

    try {
      const base64 = await fileToBase64(file);
      let endpoint, body;

      if (tipo === 'imagem') {
        endpoint = '/api/whatsapp/enviar-imagem';
        body = { ticket_id: ticketAtivo.id, imagem_base64: base64, caption: '' };
      } else if (tipo === 'video') {
        endpoint = '/api/whatsapp/enviar-video';
        body = { ticket_id: ticketAtivo.id, video_base64: base64, caption: '' };
      } else {
        endpoint = '/api/whatsapp/enviar-documento';
        body = { ticket_id: ticketAtivo.id, documento_base64: base64, file_name: file.name };
      }

      await api.post(endpoint, body);
      queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success(`${tipo.charAt(0).toUpperCase() + tipo.slice(1)} enviado!`);
    } catch (err) {
      toast.error(`Erro ao enviar ${tipo}: ${err.message}`);
    } finally {
      setEnviandoMidia(false);
    }
  };

  // ============ GRAVAÇÃO DE ÁUDIO ============
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, { mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm' });
      audioChunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) audioChunksRef.current.push(e.data); };
      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            await api.post('/api/whatsapp/enviar-audio', { ticket_id: ticketAtivo.id, audio_base64: reader.result });
            queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            toast.success('Áudio enviado!');
          } catch { toast.error('Erro ao enviar áudio'); }
        };
        reader.readAsDataURL(blob);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setGravando(true);
      setTempoGravacao(0);
      timerGravacaoRef.current = setInterval(() => setTempoGravacao(t => t + 1), 1000);
    } catch { toast.error('Permissão de microfone negada'); }
  };

  const pararGravacao = () => { mediaRecorderRef.current?.state === 'recording' && mediaRecorderRef.current.stop(); setGravando(false); clearInterval(timerGravacaoRef.current); };
  const cancelarGravacao = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null; mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop(); mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    setGravando(false); clearInterval(timerGravacaoRef.current); audioChunksRef.current = [];
  };

  const formatarTempo = (s) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;

  const selecionarQuickReply = (r) => { setTexto(r.corpo); setQuickReplyAberto(false); inputRef.current?.focus(); };

  const handleKeyDown = (e) => {
    if (quickReplyAberto && quickRepliesFiltradas.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setQuickReplyIdx(i => Math.min(i+1, quickRepliesFiltradas.length-1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setQuickReplyIdx(i => Math.max(i-1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selecionarQuickReply(quickRepliesFiltradas[quickReplyIdx]); return; }
      if (e.key === 'Escape') { setQuickReplyAberto(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); }
  };

  useEffect(() => {
    texto.startsWith('/') && quickRepliesFiltradas.length > 0 ? (setQuickReplyAberto(true), setQuickReplyIdx(0)) : setQuickReplyAberto(false);
  }, [texto, quickRepliesFiltradas.length]);

  // Finalizar chamado
  const finalizarMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo?.id}/resolver`),
    onSuccess: (data) => { selecionarTicket(data); queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo?.id] }); queryClient.invalidateQueries({ queryKey: ['tickets'] }); toast.success('Chamado finalizado!'); },
    onError: (err) => toast.error(err.message),
  });

  // Transferir chamado
  const [menuTransferir, setMenuTransferir] = useState(false);
  const { data: todosUsuarios } = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get('/api/users'), enabled: menuTransferir });

  const transferirMutation = useMutation({
    mutationFn: ({ usuario_id }) => api.post(`/api/tickets/${ticketAtivo?.id}/transferir`, { usuario_id }),
    onSuccess: (data) => { selecionarTicket(data); setMenuTransferir(false); queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo?.id] }); queryClient.invalidateQueries({ queryKey: ['tickets'] }); toast.success('Chamado transferido!'); },
    onError: (err) => toast.error(err.message),
  });

  // Registrar visualização ao abrir chamado da fila
  useEffect(() => {
    if (!ticketAtivo?.id) return;
    if (ticketAtivo.status === 'pendente') {
      api.post(`/api/tickets/${ticketAtivo.id}/visualizar`).catch(() => {});
    }
  }, [ticketAtivo?.id]);

  const atendentesTransferir = (todosUsuarios?.usuarios || todosUsuarios || []).filter(u => u.id !== usuario?.id && u.ativo !== false);

  if (!ticketAtivo) return (<div className="flex-1 flex items-center justify-center bg-[var(--color-bg)]"><EmptyState icone={MessageSquare} titulo="Selecione um chamado" descricao="Escolha um chamado na lista ao lado" /></div>);

  return (
    <div className="flex-1 flex flex-col bg-[var(--color-bg)] min-w-0">
      {/* Header */}
      <div className="h-14 px-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] flex items-center justify-between shrink-0">
        <button onClick={onTogglePainel} className="flex items-center gap-3 min-w-0 hover:opacity-80 transition-opacity">
          <Avatar nome={ticketAtivo.contato_nome} src={ticketAtivo.contato_avatar} size="md" />
          <div className="min-w-0 text-left">
            <h3 className="text-sm font-semibold truncate">{ticketAtivo.contato_nome || ticketAtivo.contato_telefone}</h3>
            <p className="text-2xs text-[var(--color-text-muted)]">
              {digitando?.acao === 'composing' ? <span className="text-green-500 animate-pulse">digitando...</span>
                : digitando?.acao === 'recording' ? <span className="text-red-500 animate-pulse">gravando áudio...</span>
                : `#${ticketAtivo.protocolo}`}
            </p>
          </div>
        </button>

        <div className="flex items-center gap-1">
          {/* Transferir */}
          <div className="relative">
            <button onClick={() => setMenuTransferir(!menuTransferir)} title="Transferir chamado"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)] hover:text-primary transition-colors">
              <ArrowRightLeft className="w-4 h-4" />
            </button>
            {menuTransferir && (
              <div className="absolute right-0 top-10 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg py-2 min-w-[200px] z-50 max-h-60 overflow-y-auto">
                <p className="px-3 py-1 text-2xs text-[var(--color-text-muted)] font-medium uppercase">Transferir para</p>
                {atendentesTransferir.map(u => (
                  <button key={u.id} onClick={() => transferirMutation.mutate({ usuario_id: u.id })}
                    className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-surface-elevated)] flex items-center gap-2">
                    <Avatar nome={u.nome} size="sm" />
                    <span className="truncate">{u.nome}</span>
                  </button>
                ))}
                {atendentesTransferir.length === 0 && <p className="px-3 py-2 text-xs text-[var(--color-text-muted)]">Nenhum atendente</p>}
              </div>
            )}
          </div>

          {/* Finalizar */}
          <button onClick={() => finalizarMutation.mutate()} title="Finalizar chamado" disabled={finalizarMutation.isPending}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-green-50 hover:text-green-600 transition-colors">
            <CheckCircle2 className="w-4 h-4" />
          </button>

          {/* Info panel toggle */}
          <button onClick={onTogglePainel} title="Informações do chamado"
            className={cn('w-8 h-8 rounded-lg flex items-center justify-center transition-colors',
              painelAberto ? 'bg-primary/10 text-primary' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]')}>
            <Info className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Fechar menu transferir */}
      {menuTransferir && <div className="fixed inset-0 z-40" onClick={() => setMenuTransferir(false)} />}

      {/* Mensagens */}
      <div ref={chatRef} className="flex-1 overflow-y-auto scrollbar-thin px-4 py-3 space-y-1">
        {isLoading ? (
          <div className="space-y-3">{Array.from({length:6}).map((_,i) => (<div key={i} className={cn('flex', i%2===0?'justify-start':'justify-end')}><Skeleton className={cn('h-10 rounded-2xl', i%2===0?'w-64':'w-48')} /></div>))}</div>
        ) : mensagens.map((msg) => <ChatBubble key={msg.id} mensagem={msg} onLightbox={setLightbox} />)}
      </div>

      <AiPanel ticketId={ticketAtivo.id} onUsarSugestao={(t) => setTexto(t)} />

      {/* Quick replies */}
      {quickReplyAberto && quickRepliesFiltradas.length > 0 && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] max-h-48 overflow-y-auto">
          {quickRepliesFiltradas.map((r,i) => (
            <button key={r.id} onClick={() => selecionarQuickReply(r)} className={cn('w-full text-left px-4 py-2.5 flex items-start gap-3', i===quickReplyIdx?'bg-primary/10':'hover:bg-[var(--color-surface-elevated)]')}>
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1"><div className="flex items-center gap-2"><code className="text-xs font-mono text-primary">{r.atalho}</code><span className="text-xs font-medium">{r.titulo}</span></div><p className="text-2xs text-[var(--color-text-muted)] truncate mt-0.5">{r.corpo}</p></div>
            </button>
          ))}
        </div>
      )}

      {/* Enviando mídia indicator */}
      {enviandoMidia && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-xs text-[var(--color-text-muted)]">Enviando mídia...</span>
        </div>
      )}

      {/* Input */}
      <div className={cn('border-t px-4 py-3 bg-[var(--color-surface)] shrink-0', modoNota ? 'border-t-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : 'border-[var(--color-border)]')}>
        {modoNota && (<div className="flex items-center gap-1.5 mb-2"><StickyNote className="w-3.5 h-3.5 text-amber-600" /><span className="text-xs font-medium text-amber-600">Nota interna</span></div>)}

        {gravando ? (
          <div className="flex items-center gap-3">
            <button onClick={cancelarGravacao} className="w-9 h-9 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200"><X className="w-4 h-4" /></button>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono text-red-600">{formatarTempo(tempoGravacao)}</span>
              <div className="flex-1 h-1 bg-red-100 rounded-full overflow-hidden"><div className="h-full bg-red-500 rounded-full animate-pulse" style={{width:`${Math.min((tempoGravacao/120)*100,100)}%`}} /></div>
            </div>
            <button onClick={pararGravacao} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90"><Send className="w-4 h-4" /></button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button onClick={() => setModoNota(!modoNota)} title="Nota interna" className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0', modoNota ? 'bg-amber-100 text-amber-700' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]')}><StickyNote className="w-4 h-4" /></button>

            {/* Botão + */}
            <div className="relative shrink-0">
              <button onClick={() => setMenuAnexo(!menuAnexo)} title="Anexar mídia" className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]"><Plus className="w-4 h-4" /></button>
              {menuAnexo && (
                <div className="absolute bottom-12 left-0 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-lg py-2 min-w-[160px] z-50">
                  <p className="px-3 py-1 text-2xs text-[var(--color-text-muted)] font-medium uppercase">Anexar</p>
                  {[
                    { icon: Image, label: 'Foto', accept: 'image/*', tipo: 'imagem' },
                    { icon: Video, label: 'Vídeo', accept: 'video/*', tipo: 'video' },
                    { icon: FileText, label: 'Documento', accept: '.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip', tipo: 'documento' },
                  ].map(({ icon: Icon, label, accept, tipo }) => (
                    <label key={label} className="flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-surface-elevated)]">
                      <Icon className="w-4 h-4 text-primary" /> {label}
                      <input type="file" accept={accept} className="hidden" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) enviarMidia(file, tipo);
                        e.target.value = '';
                      }} />
                    </label>
                  ))}
                </div>
              )}
            </div>

            <textarea ref={inputRef} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={modoNota ? 'Escreva uma nota interna...' : 'Digite / para respostas rápidas...'} rows={1}
              className="flex-1 resize-none rounded-xl bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32 border-0" style={{minHeight:'40px'}} />

            {/* Botão IA — melhorar texto */}
            {texto.trim().length > 3 && (
              <button
                onClick={async () => {
                  if (melhorandoTexto) return;
                  setMelhorandoTexto(true);
                  try {
                    const result = await api.post('/api/ai/melhorar-texto', { texto: texto.trim() });
                    if (result.textoMelhorado && result.textoMelhorado !== texto.trim()) {
                      setTexto(result.textoMelhorado);
                      toast.success('Texto melhorado!');
                    } else {
                      toast('Texto já está bom!', { icon: '👍' });
                    }
                  } catch {
                    toast.error('IA indisponível');
                  } finally {
                    setMelhorandoTexto(false);
                  }
                }}
                disabled={melhorandoTexto}
                title="Melhorar texto com IA"
                className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0 transition-colors',
                  melhorandoTexto ? 'animate-spin text-primary' : 'text-[var(--color-text-muted)] hover:bg-primary/10 hover:text-primary')}
              >
                <Sparkles className="w-4 h-4" />
              </button>
            )}

            {texto.trim() ? (
              <Button size="icon" onClick={handleEnviar} loading={enviarMutation.isPending} disabled={!texto.trim()} className={cn('rounded-xl shrink-0', modoNota && 'bg-amber-500 hover:bg-amber-600')}><Send className="w-4 h-4" /></Button>
            ) : (
              <button onClick={iniciarGravacao} title="Gravar áudio" className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 shrink-0"><Mic className="w-4 h-4" /></button>
            )}
          </div>
        )}
      </div>

      {menuAnexo && <div className="fixed inset-0 z-40" onClick={() => setMenuAnexo(false)} />}
      {lightbox && <Lightbox url={lightbox.url} tipo={lightbox.tipo} onFechar={() => setLightbox(null)} />}
    </div>
  );
}

function Lightbox({ url, tipo, onFechar }) {
  useEffect(() => { const h = (e) => { if (e.key==='Escape') onFechar(); }; window.addEventListener('keydown',h); return () => window.removeEventListener('keydown',h); }, [onFechar]);
  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onFechar}>
      <div className="absolute top-4 right-4 flex gap-2 z-10">
        <a href={url} download target="_blank" rel="noopener noreferrer" onClick={e=>e.stopPropagation()} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><Download className="w-5 h-5 text-white" /></a>
        <button onClick={onFechar} className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center"><X className="w-5 h-5 text-white" /></button>
      </div>
      <div onClick={e=>e.stopPropagation()} className="max-w-[90vw] max-h-[90vh]">
        {tipo==='video' ? <video controls autoPlay className="max-w-full max-h-[90vh] rounded-lg"><source src={url}/></video> : <img src={url} alt="Mídia" className="max-w-full max-h-[90vh] object-contain rounded-lg"/>}
      </div>
    </div>
  );
}

function ChatBubble({ mensagem, onLightbox }) {
  const { is_from_me, is_internal, tipo, corpo, criado_em, status_envio, usuario_nome, contato_nome, media_url, nome_participante, nomeParticipante } = mensagem;
  const participante = nome_participante || nomeParticipante;
  if (tipo==='sistema') return (<div className="flex justify-center py-2"><span className="text-2xs text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-3 py-1 rounded-full">{corpo}</span></div>);
  if (is_internal) return (
    <div className="flex justify-end py-0.5"><div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <div className="flex items-center gap-1.5 mb-1"><StickyNote className="w-3 h-3 text-amber-600"/><span className="text-2xs font-medium text-amber-600">Nota — {usuario_nome}</span></div>
      <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap break-words">{corpo}</p>
      <span className="text-2xs text-amber-500 mt-1 block text-right">{formatarDataMensagem(criado_em)}</span>
    </div></div>
  );
  const enviada = is_from_me;
  return (
    <div className={cn('flex py-0.5', enviada?'justify-end':'justify-start')}>
      <div className={cn('max-w-[75%] rounded-2xl overflow-hidden', enviada?'bg-primary text-white rounded-br-md':'bg-[var(--chat-bubble-received)] text-[var(--chat-bubble-received-text)] rounded-bl-md')}>
        {!enviada && (participante||contato_nome) && <span className="text-2xs font-medium text-primary mb-0.5 block px-4 pt-2">{participante||contato_nome}</span>}
        <MediaContent tipo={tipo} corpo={corpo} mediaUrl={media_url} enviada={enviada} onLightbox={onLightbox} mensagemId={mensagem.id} />
        <div className={cn('flex items-center justify-end gap-1 px-4 pb-2', enviada?'text-white/60':'text-[var(--color-text-muted)]')}><span className="text-2xs">{formatarDataMensagem(criado_em)}</span>{enviada && <StatusIcon status={status_envio}/>}</div>
      </div>
    </div>
  );
}

function MediaContent({ tipo, corpo, mediaUrl, enviada, onLightbox, mensagemId }) {
  switch(tipo) {
    case 'imagem': return (<div>{mediaUrl ? <button onClick={()=>onLightbox({url:mediaUrl,tipo:'imagem'})} className="block cursor-pointer"><img src={mediaUrl} alt="Imagem" className="max-w-full max-h-64 object-cover hover:opacity-90" loading="lazy" onError={e=>{e.target.style.display='none'}}/></button> : <div className="px-4 pt-2 flex items-center gap-2"><span>📷</span><span className="text-sm opacity-80">Imagem</span></div>}{corpo&&corpo!=='📷 Imagem'&&<p className="text-sm whitespace-pre-wrap break-words px-4 pt-1">{corpo}</p>}</div>);
    case 'audio': return <AudioBubble corpo={corpo} mediaUrl={mediaUrl} mensagemId={mensagemId} enviada={enviada} />;
    case 'video': return (<div>{mediaUrl ? <button onClick={()=>onLightbox({url:mediaUrl,tipo:'video'})} className="relative block cursor-pointer group"><video preload="metadata" className="max-w-full max-h-48"><source src={mediaUrl}/></video><div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40"><div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center"><Play className="w-6 h-6 text-neutral-800 ml-0.5"/></div></div></button> : <div className="px-4 pt-2 flex items-center gap-2"><span>🎥</span><span className="text-sm opacity-80">Vídeo</span></div>}{corpo&&corpo!=='🎥 Vídeo'&&<p className="text-sm whitespace-pre-wrap break-words px-4 pt-1">{corpo}</p>}</div>);
    case 'documento': return (<div className="px-4 pt-2">{mediaUrl ? <a href={mediaUrl} target="_blank" rel="noopener noreferrer" className={cn('flex items-center gap-3 p-3 rounded-lg', enviada?'bg-white/10 hover:bg-white/20':'bg-black/5 hover:bg-black/10 dark:bg-white/5')}><span className="text-2xl">📄</span><div className="min-w-0 flex-1"><p className="text-sm font-medium truncate">{corpo||'Documento'}</p><p className="text-2xs opacity-60">Clique para baixar</p></div><Download className="w-4 h-4 opacity-60"/></a> : <div className="flex items-center gap-2"><span>📄</span><span className="text-sm opacity-80">{corpo||'Documento'}</span></div>}</div>);
    case 'localizacao': {
      const match = corpo?.match(/([-\d.]+),\s*([-\d.]+)/);
      const lat = match?.[1], lng = match?.[2];
      const mapsUrl = lat&&lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
      return (<div className="px-4 pt-2">{mapsUrl ? <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className={cn('flex items-center gap-3 p-3 rounded-lg cursor-pointer', enviada?'bg-white/10 hover:bg-white/20':'bg-black/5 hover:bg-black/10 dark:bg-white/5')}><MapPin className="w-6 h-6 text-red-500 shrink-0"/><div><p className="text-sm font-medium">Localização</p><p className="text-2xs opacity-70">{lat}, {lng}</p><p className={cn('text-2xs mt-0.5 underline', enviada?'text-white/80':'text-primary')}>Abrir no Google Maps</p></div></a> : <div className={cn('flex items-center gap-2 p-2 rounded-lg', enviada?'bg-white/10':'bg-black/5')}><span className="text-2xl">📍</span><div><p className="text-sm">Localização</p><p className="text-2xs opacity-70">{corpo}</p></div></div>}</div>);
    }
    case 'contato': return (<div className="px-4 pt-2"><div className={cn('flex items-center gap-2 p-2 rounded-lg', enviada?'bg-white/10':'bg-black/5 dark:bg-white/5')}><span className="text-2xl">👤</span><p className="text-sm">{corpo||'Contato'}</p></div></div>);
    case 'sticker': return (<div className="px-4 pt-2">{mediaUrl ? <img src={mediaUrl} alt="Sticker" className="w-32 h-32 object-contain" loading="lazy"/> : <span className="text-4xl">🎭</span>}</div>);
    default: return (<p className="text-sm whitespace-pre-wrap break-words px-4 pt-2">{corpo||'📎 Mídia'}</p>);
  }
}

function StatusIcon({ status }) {
  switch(status) {
    case 'pendente': return <Clock className="w-3 h-3"/>;
    case 'enviada': return <Check className="w-3 h-3"/>;
    case 'entregue': return <CheckCheck className="w-3 h-3"/>;
    case 'lida': return <CheckCheck className="w-3 h-3 text-blue-300"/>;
    case 'erro': return <AlertCircle className="w-3 h-3 text-red-300"/>;
    default: return <Check className="w-3 h-3"/>;
  }
}

// AudioBubble — player de áudio com botão de transcrição
function AudioBubble({ corpo, mediaUrl, mensagemId, enviada }) {
  const [transcricao, setTranscricao] = useState(null);
  const [transcrevendo, setTranscrevendo] = useState(false);

  // Se o corpo já tem transcrição (não é emoji de áudio)
  const jaTemTranscricao = corpo && corpo.length > 5 && !corpo.startsWith('🎵');

  const handleTranscrever = async () => {
    if (transcrevendo) return;
    setTranscrevendo(true);
    try {
      let audioBase64 = null;

      if (mediaUrl) {
        if (mediaUrl.startsWith('data:')) {
          // Já é base64
          audioBase64 = mediaUrl;
        } else {
          // Baixar pelo frontend e converter pra base64
          try {
            const resp = await fetch(mediaUrl);
            if (resp.ok) {
              const blob = await resp.blob();
              audioBase64 = await new Promise((resolve) => {
                const reader = new FileReader();
                reader.onload = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
            }
          } catch {
            // Falha no download
          }
        }
      }

      let result;
      if (audioBase64) {
        // Mandar base64 pro backend transcrever
        result = await api.post('/api/ai/transcrever-audio-base64', {
          mensagem_id: mensagemId,
          audio_base64: audioBase64,
        });
      } else {
        // Fallback — tentar pelo backend direto
        result = await api.post(`/api/ai/transcrever-audio/${mensagemId}`);
      }

      setTranscricao(result.transcricao);
      toast.success('Áudio transcrito!');
    } catch (err) {
      toast.error('Erro ao transcrever áudio');
    } finally {
      setTranscrevendo(false);
    }
  };

  const textoTranscrito = transcricao || (jaTemTranscricao ? corpo : null);

  return (
    <div className="px-4 pt-2">
      {mediaUrl ? (
        <audio controls className="max-w-full" style={{ minWidth: '220px' }}>
          <source src={mediaUrl} type="audio/ogg" />
          <source src={mediaUrl} type="audio/mpeg" />
        </audio>
      ) : (
        <div className="flex items-center gap-2">
          <span>🎵</span>
          <span className="text-sm opacity-80">Áudio</span>
        </div>
      )}

      {/* Transcrição */}
      {textoTranscrito ? (
        <div className={cn('mt-1.5 p-2 rounded-lg text-xs italic', enviada ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5')}>
          <span className="opacity-60 text-2xs not-italic">📝 Transcrição:</span>
          <p className="mt-0.5">{textoTranscrito}</p>
        </div>
      ) : (
        <button
          onClick={handleTranscrever}
          disabled={transcrevendo}
          className={cn(
            'mt-1.5 flex items-center gap-1.5 text-2xs transition-colors',
            transcrevendo ? 'opacity-50' : 'opacity-70 hover:opacity-100',
            enviada ? 'text-white/70 hover:text-white' : 'text-[var(--color-text-muted)] hover:text-primary'
          )}
        >
          {transcrevendo ? (
            <>
              <div className="w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Transcrevendo...
            </>
          ) : (
            <>
              <FileText className="w-3 h-3" />
              Transcrever áudio
            </>
          )}
        </button>
      )}
    </div>
  );
}