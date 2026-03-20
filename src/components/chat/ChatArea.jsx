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
  Star, Trash2, XCircle, UserPlus,
} from 'lucide-react';
import { cn, formatarDataMensagem } from '../../lib/utils';
import api from '../../lib/api';
import wsClient from '../../lib/websocket';
import toast from 'react-hot-toast';
import AiPanel from './AiPanel';

// ============ HELPERS ============

// Converter File pra base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Comprimir imagem via canvas antes do upload (item 4)
function comprimirImagem(file, maxWidth = 1280, qualidade = 0.75) {
  return new Promise((resolve) => {
    // Se < 200KB, não comprimir
    if (file.size < 200 * 1024) {
      fileToBase64(file).then(resolve);
      return;
    }
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWidth) {
        height = Math.round((height * maxWidth) / width);
        width = maxWidth;
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0, width, height);
      const base64 = canvas.toDataURL('image/jpeg', qualidade);
      resolve(base64);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      // Fallback — sem compressão
      fileToBase64(file).then(resolve);
    };
    img.src = url;
  });
}

// Criar preview local de arquivo (item 4)
function criarPreviewLocal(file, tipo) {
  if (tipo === 'imagem') return URL.createObjectURL(file);
  if (tipo === 'video') return URL.createObjectURL(file);
  return null;
}

export default function ChatArea({ onTogglePainel, painelAberto }) {
  const ticketAtivo = useTicketStore((s) => s.ticketAtivo);
  const selecionarTicket = useTicketStore((s) => s.selecionarTicket);
  const limparTicketAtivo = useTicketStore((s) => s.limparTicketAtivo);
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
  const [modoEncaminhar, setModoEncaminhar] = useState(false);
  const [msgsSelecionadas, setMsgsSelecionadas] = useState(new Set());
  const [modalEncaminhar, setModalEncaminhar] = useState(false);
  const [buscaContato, setBuscaContato] = useState('');
  const [enviandoEncaminhar, setEnviandoEncaminhar] = useState(false);
  const [modalSticker, setModalSticker] = useState(false);
  const [enviandoSticker, setEnviandoSticker] = useState(false);
  const [painelRespostas, setPainelRespostas] = useState(false);
  const [confirmaPuxar, setConfirmaPuxar] = useState(false);
  const [textoPendente, setTextoPendente] = useState('');
  const [midiaPreview, setMidiaPreview] = useState(null); // { url, tipo, nome } — preview local (item 4)
  const [modalFechar, setModalFechar] = useState(false);
  const [motivoSelecionado, setMotivoSelecionado] = useState(null);
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

  // Busca de contatos pra encaminhar
  const { data: contatosEncaminhar } = useQuery({
    queryKey: ['contatos-encaminhar', buscaContato],
    queryFn: () => api.get(`/api/contacts?busca=${buscaContato}&limite=20`),
    enabled: modalEncaminhar && buscaContato.length >= 2,
  });

  // Galeria de stickers — recebidos + favoritos (item 6)
  const { data: stickersGaleria, refetch: refetchStickers } = useQuery({
    queryKey: ['stickers-galeria'],
    queryFn: () => api.get('/api/whatsapp/stickers-galeria?limite=50'),
    enabled: modalSticker,
    staleTime: 30000,
  });

  // Favoritos separados (item 6)
  const { data: stickersFavoritosData, refetch: refetchFavoritos } = useQuery({
    queryKey: ['stickers-favoritos'],
    queryFn: () => api.get('/api/whatsapp/stickers-favoritos'),
    enabled: modalSticker,
    staleTime: 30000,
  });
  const stickersFavoritos = stickersFavoritosData?.stickers || [];
  const favoritosUrls = new Set(stickersFavoritos.map((s) => s.url));

  // Motivos de atendimento (pra modal de fechamento)
  const { data: motivosData } = useQuery({
    queryKey: ['motivos-ativos'],
    queryFn: () => api.get('/api/tickets/motivos/ativos'),
    enabled: modalFechar,
    staleTime: 60000,
  });
  const motivosAtivos = motivosData?.motivos || [];

  const toggleMsgSelecionada = (msgId) => {
    setMsgsSelecionadas((prev) => {
      const novo = new Set(prev);
      if (novo.has(msgId)) novo.delete(msgId);
      else novo.add(msgId);
      return novo;
    });
  };

  const handleEncaminharMultiplas = async (telefoneDestino) => {
    if (msgsSelecionadas.size === 0 || enviandoEncaminhar) return;
    setEnviandoEncaminhar(true);
    try {
      let sucesso = 0;
      for (const msgId of msgsSelecionadas) {
        try {
          await api.post('/api/whatsapp/encaminhar', { mensagem_id: msgId, telefone_destino: telefoneDestino });
          sucesso++;
        } catch { /* ignorar falhas individuais */ }
        await new Promise((r) => setTimeout(r, 300));
      }
      toast.success(`${sucesso} mensagem(ns) encaminhada(s)!`);
      setModoEncaminhar(false);
      setMsgsSelecionadas(new Set());
      setModalEncaminhar(false);
      setBuscaContato('');
    } catch {
      toast.error('Erro ao encaminhar');
    } finally {
      setEnviandoEncaminhar(false);
    }
  };

  // ============ ENVIAR STICKER DA GALERIA ============
  const handleEnviarSticker = async (stickerUrl) => {
    if (!ticketAtivo || enviandoSticker) return;
    setEnviandoSticker(true);
    try {
      await api.post('/api/whatsapp/enviar-sticker', { ticketId: ticketAtivo.id, stickerUrl });
      queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Sticker enviado!');
      setModalSticker(false);
    } catch {
      toast.error('Erro ao enviar sticker');
    } finally {
      setEnviandoSticker(false);
    }
  };

  // ============ FAVORITAR/DESFAVORITAR STICKER (item 6) ============
  const handleFavoritarSticker = async (url) => {
    try {
      await api.post('/api/whatsapp/favoritar-sticker', { url });
      toast.success('Sticker favoritado!');
      refetchFavoritos();
    } catch {
      toast.error('Erro ao favoritar');
    }
  };

  const handleDesfavoritarSticker = async (url) => {
    try {
      await api.delete(`/api/whatsapp/favoritar-sticker?url=${encodeURIComponent(url)}`);
      toast.success('Removido dos favoritos');
      refetchFavoritos();
    } catch {
      toast.error('Erro ao remover');
    }
  };

  const quickRepliesFiltradas = (respostasRapidas || []).filter((r) => {
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
    const c3 = wsClient.on('mensagem:deletada', (dados) => {
      if (dados.ticketId === ticketAtivo.id || dados.ticket_id === ticketAtivo.id) {
        queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      }
    });
    return () => { c1(); c2(); c3(); };
  }, [ticketAtivo?.id]);

  // Enviar texto — OPTIMISTIC UPDATE
  const enviarMutation = useMutation({
    mutationFn: async ({ textoEnvio, isNota }) => {
      if (isNota) return api.post(`/api/messages/${ticketAtivo.id}/nota`, { texto: textoEnvio });
      return api.post('/api/whatsapp/enviar', { ticket_id: ticketAtivo.id, texto: textoEnvio });
    },
    onMutate: async ({ textoEnvio, isNota }) => {
      const queryKey = ['mensagens', ticketAtivo.id];
      await queryClient.cancelQueries({ queryKey });
      const mensagemTemp = {
        id: `temp_${Date.now()}`,
        ticket_id: ticketAtivo.id,
        usuario_id: usuario?.id,
        corpo: textoEnvio,
        tipo: 'texto',
        is_from_me: true,
        is_internal: isNota,
        status_envio: 'pendente',
        criado_em: new Date().toISOString(),
        usuario_nome: usuario?.nome,
      };
      queryClient.setQueryData(queryKey, (old) => {
        if (!old) return old;
        return { ...old, mensagens: [...(old.mensagens || []), mensagemTemp] };
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleEnviar = () => {
    if (!texto.trim() || !ticketAtivo) return;

    const outroAtendente = ticketAtivo.usuario_id && ticketAtivo.usuario_id !== usuario?.id && ticketAtivo.status === 'aberto';
    if (outroAtendente) {
      setTextoPendente(texto.trim());
      setConfirmaPuxar(true);
      return;
    }

    const textoEnvio = texto.trim();
    setTexto('');
    enviarMutation.mutate({ textoEnvio, isNota: modoNota });
  };

  const confirmarPuxarChamado = async () => {
    try {
      await api.post(`/api/tickets/${ticketAtivo.id}/transferir`, { usuario_id: usuario.id });
      if (modoNota) {
        await api.post(`/api/messages/${ticketAtivo.id}/nota`, { texto: textoPendente });
      } else {
        await api.post('/api/whatsapp/enviar', { ticket_id: ticketAtivo.id, texto: textoPendente });
      }
      setTexto('');
      setTextoPendente('');
      setConfirmaPuxar(false);
      queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-meus'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-atendimento'] });
      toast.success('Chamado puxado e mensagem enviada!');
    } catch (err) {
      toast.error(err.message || 'Erro ao puxar chamado');
    }
  };

  // ============ ENVIO DE MÍDIA — com preview local + compressão (item 4) ============
  const enviarMidia = async (file, tipo) => {
    if (!ticketAtivo || enviandoMidia) return;
    setEnviandoMidia(true);
    setMenuAnexo(false);

    // Preview local imediato (item 4)
    const previewUrl = criarPreviewLocal(file, tipo);
    if (previewUrl) {
      setMidiaPreview({ url: previewUrl, tipo, nome: file.name });
    }

    try {
      let base64;
      // Comprimir imagens antes do upload (item 4)
      if (tipo === 'imagem') {
        base64 = await comprimirImagem(file);
      } else {
        base64 = await fileToBase64(file);
      }

      let endpoint, body;
      if (tipo === 'imagem') {
        endpoint = '/api/whatsapp/enviar-imagem';
        body = { ticket_id: ticketAtivo.id, imagem_base64: base64, caption: '' };
      } else if (tipo === 'video') {
        // Avisar se vídeo muito grande
        if (file.size > 16 * 1024 * 1024) {
          toast('Vídeo grande — pode demorar um pouco', { icon: '⏳' });
        }
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
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setMidiaPreview(null);
    }
  };

  // ============ GRAVAÇÃO DE ÁUDIO — OGG preferido (item 5) ============
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Tentar OGG/Opus primeiro (WhatsApp nativo), fallback pra WebM (item 5)
      let mimeType = 'audio/webm;codecs=opus';
      let blobType = 'audio/webm';

      if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
        blobType = 'audio/ogg';
      } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
        blobType = 'audio/webm';
      } else if (MediaRecorder.isTypeSupported('audio/webm')) {
        mimeType = 'audio/webm';
        blobType = 'audio/webm';
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: blobType });

        // Se gravou em webm, tentar re-empacotar como ogg mudando só o MIME no base64
        // A Z-API aceita audio/ogg mesmo que o container seja webm em muitos casos
        const reader = new FileReader();
        reader.onload = async () => {
          try {
            let audioBase64 = reader.result;

            // Forçar MIME type pra audio/ogg no data URI se veio como webm (item 5)
            // Isso ajuda a Z-API a tratar como voice message com duração
            if (blobType === 'audio/webm' && audioBase64.startsWith('data:audio/webm')) {
              audioBase64 = audioBase64.replace('data:audio/webm', 'data:audio/ogg');
            }

            await api.post('/api/whatsapp/enviar-audio', {
              ticket_id: ticketAtivo.id,
              audio_base64: audioBase64,
            });
            queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
            queryClient.invalidateQueries({ queryKey: ['tickets'] });
            toast.success('Áudio enviado!');
          } catch {
            toast.error('Erro ao enviar áudio');
          }
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setGravando(true);
      setTempoGravacao(0);
      timerGravacaoRef.current = setInterval(() => setTempoGravacao((t) => t + 1), 1000);
    } catch {
      toast.error('Permissão de microfone negada');
    }
  };

  const pararGravacao = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setGravando(false);
    clearInterval(timerGravacaoRef.current);
  };

  const cancelarGravacao = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach((t) => t.stop());
    }
    setGravando(false);
    clearInterval(timerGravacaoRef.current);
    audioChunksRef.current = [];
  };

  const formatarTempo = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Selecionar resposta rápida
  const selecionarQuickReply = async (r) => {
    setQuickReplyAberto(false);
    setPainelRespostas(false);

    if (r.media_url && r.media_tipo && ticketAtivo) {
      try {
        if (r.media_tipo === 'imagem') {
          await api.post('/api/whatsapp/enviar-imagem', {
            ticket_id: ticketAtivo.id, imagem_base64: r.media_url, caption: r.corpo || '',
          });
        } else if (r.media_tipo === 'video') {
          await api.post('/api/whatsapp/enviar-video', {
            ticket_id: ticketAtivo.id, video_base64: r.media_url, caption: r.corpo || '',
          });
        } else if (r.media_tipo === 'audio') {
          await api.post('/api/whatsapp/enviar-audio', {
            ticket_id: ticketAtivo.id, audio_base64: r.media_url,
          });
          if (r.corpo) {
            await api.post('/api/whatsapp/enviar', { ticket_id: ticketAtivo.id, texto: r.corpo });
          }
        } else if (r.media_tipo === 'link') {
          const textoComLink = r.corpo ? `${r.corpo}\n\n${r.media_url}` : r.media_url;
          await api.post('/api/whatsapp/enviar', { ticket_id: ticketAtivo.id, texto: textoComLink });
        }
        queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo.id] });
        queryClient.invalidateQueries({ queryKey: ['tickets'] });
        toast.success('Resposta rápida enviada!');
      } catch {
        toast.error('Erro ao enviar resposta rápida');
      }
    } else {
      setTexto(r.corpo);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (quickReplyAberto && quickRepliesFiltradas.length > 0) {
      if (e.key === 'ArrowDown') { e.preventDefault(); setQuickReplyIdx((i) => Math.min(i + 1, quickRepliesFiltradas.length - 1)); return; }
      if (e.key === 'ArrowUp') { e.preventDefault(); setQuickReplyIdx((i) => Math.max(i - 1, 0)); return; }
      if (e.key === 'Enter' || e.key === 'Tab') { e.preventDefault(); selecionarQuickReply(quickRepliesFiltradas[quickReplyIdx]); return; }
      if (e.key === 'Escape') { setQuickReplyAberto(false); return; }
    }
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar(); }
  };

  useEffect(() => {
    texto.startsWith('/') && quickRepliesFiltradas.length > 0
      ? (setQuickReplyAberto(true), setQuickReplyIdx(0))
      : setQuickReplyAberto(false);
  }, [texto, quickRepliesFiltradas.length]);

  // Finalizar chamado — com motivo — optimistic pra ser instantâneo
  const finalizarMutation = useMutation({
    mutationFn: ({ motivoId }) => api.post(`/api/tickets/${ticketAtivo?.id}/resolver`, {
      motivo_id: motivoId || null,
    }),
    onMutate: () => {
      // Fechar modal e limpar tela imediatamente (não esperar API)
      setModalFechar(false);
      setMotivoSelecionado(null);
      limparTicketAtivo();
      toast.success('Chamado fechado!');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['mensagens'] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-meus'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-fila'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-atendimento'] });
    },
    onError: (err) => toast.error(err.message),
  });

  const handleFecharComMotivo = () => {
    finalizarMutation.mutate({ motivoId: motivoSelecionado });
  };

  // Puxar chamado da fila — optimistic update pra ser instantâneo
  const puxarMutation = useMutation({
    mutationFn: () => api.post(`/api/tickets/${ticketAtivo?.id}/aceitar`),
    onMutate: async () => {
      // Optimistic: atualizar o ticket local imediatamente
      const ticketOtimista = { ...ticketAtivo, status: 'aberto', usuario_id: usuario?.id, atendente_nome: usuario?.nome };
      selecionarTicket(ticketOtimista);
    },
    onSuccess: (data) => {
      selecionarTicket(data);
      queryClient.invalidateQueries({ queryKey: ['chamados-meus'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-fila'] });
      queryClient.invalidateQueries({ queryKey: ['chamados-atendimento'] });
      toast.success('Chamado puxado para você!');
    },
    onError: (err) => {
      // Reverter
      selecionarTicket(ticketAtivo);
      toast.error(err.message);
    },
  });

  // Transferir chamado
  const [menuTransferir, setMenuTransferir] = useState(false);
  const { data: todosUsuarios } = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get('/api/users'), enabled: menuTransferir });

  const transferirMutation = useMutation({
    mutationFn: ({ usuario_id }) => api.post(`/api/tickets/${ticketAtivo?.id}/transferir`, { usuario_id }),
    onSuccess: (data) => {
      selecionarTicket(data);
      setMenuTransferir(false);
      queryClient.invalidateQueries({ queryKey: ['mensagens', ticketAtivo?.id] });
      queryClient.invalidateQueries({ queryKey: ['tickets'] });
      toast.success('Chamado transferido!');
    },
    onError: (err) => toast.error(err.message),
  });

  // Registrar visualização ao abrir chamado da fila
  useEffect(() => {
    if (!ticketAtivo?.id) return;
    if (ticketAtivo.status === 'pendente') {
      api.post(`/api/tickets/${ticketAtivo.id}/visualizar`).catch(() => {});
    }
  }, [ticketAtivo?.id]);

  const atendentesTransferir = (todosUsuarios?.usuarios || todosUsuarios || []).filter((u) => u.id !== usuario?.id && u.ativo !== false);

  if (!ticketAtivo) return (
    <div className="flex-1 flex items-center justify-center bg-[var(--color-bg)]">
      <EmptyState icone={MessageSquare} titulo="Selecione um chamado" descricao="Escolha um chamado na lista ao lado" />
    </div>
  );

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
                {atendentesTransferir.map((u) => (
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

          {/* Fechar chamado — vermelho */}
          <button onClick={() => setModalFechar(true)} title="Fechar chamado"
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors">
            <XCircle className="w-4 h-4" />
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
          <div className="space-y-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                <Skeleton className={cn('h-10 rounded-2xl', i % 2 === 0 ? 'w-64' : 'w-48')} />
              </div>
            ))}
          </div>
        ) : (
          <>
            {/* Chat vazio — indicador para novo chamado sem mensagens */}
            {mensagens.length === 0 && !isLoading && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <Send className="w-7 h-7 text-primary" />
                </div>
                <p className="text-sm font-medium text-[var(--color-text-secondary)] mb-1">Nenhuma mensagem ainda</p>
                <p className="text-xs text-[var(--color-text-muted)]">Envie a primeira mensagem pelo campo abaixo</p>
              </div>
            )}

            {mensagens.map((msg) => (
              <div key={msg.id} className={cn('flex items-start gap-2', modoEncaminhar && 'cursor-pointer')} onClick={() => modoEncaminhar && toggleMsgSelecionada(msg.id)}>
                {modoEncaminhar && (
                  <div className="flex items-center pt-2 shrink-0">
                    <div className={cn('w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all',
                      msgsSelecionadas.has(msg.id) ? 'bg-primary border-primary' : 'border-[var(--color-border)]')}>
                      {msgsSelecionadas.has(msg.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                  </div>
                )}
                <div className="flex-1">
                  <ChatBubble
                    mensagem={msg}
                    onLightbox={setLightbox}
                    modoEncaminhar={modoEncaminhar}
                    onIniciarEncaminhar={() => { setModoEncaminhar(true); setMsgsSelecionadas(new Set([msg.id])); }}
                    onFavoritarSticker={handleFavoritarSticker}
                    favoritosUrls={favoritosUrls}
                  />
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Barra de seleção encaminhar */}
      {modoEncaminhar && (
        <div className="border-t border-primary/20 bg-primary/5 px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setModoEncaminhar(false); setMsgsSelecionadas(new Set()); }} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
              <X className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-primary">{msgsSelecionadas.size} mensagem(ns) selecionada(s)</span>
          </div>
          <Button size="sm" onClick={() => setModalEncaminhar(true)} disabled={msgsSelecionadas.size === 0}>
            <ArrowRightLeft className="w-4 h-4" /> Encaminhar
          </Button>
        </div>
      )}

      {/* Modal encaminhar */}
      {modalEncaminhar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => { setModalEncaminhar(false); setBuscaContato(''); }}>
          <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl w-96 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b border-[var(--color-border)]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Encaminhar {msgsSelecionadas.size} mensagem(ns)</h3>
                <button onClick={() => { setModalEncaminhar(false); setBuscaContato(''); }} className="p-1 rounded hover:bg-[var(--color-surface-elevated)]"><X className="w-4 h-4" /></button>
              </div>
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                <input value={buscaContato} onChange={(e) => setBuscaContato(e.target.value)} placeholder="Buscar por nome ou telefone..."
                  className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--color-surface-elevated)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 border-0" autoFocus />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {buscaContato.length < 2 ? (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-8">Digite pelo menos 2 caracteres</p>
              ) : (contatosEncaminhar?.contatos || []).length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-8">Nenhum contato encontrado</p>
              ) : (contatosEncaminhar?.contatos || []).map((c) => (
                <button key={c.id} onClick={() => handleEncaminharMultiplas(c.telefone)} disabled={enviandoEncaminhar}
                  className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-surface-elevated)] transition-colors disabled:opacity-50">
                  <Avatar nome={c.nome} src={c.avatar_url} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{c.nome || c.telefone}</p>
                    <p className="text-2xs text-[var(--color-text-muted)]">{c.telefone}</p>
                  </div>
                  <ArrowRightLeft className="w-4 h-4 text-[var(--color-text-muted)]" />
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <AiPanel ticketId={ticketAtivo.id} onUsarSugestao={(t) => setTexto(t)} />

      {/* ========= BARRA "PUXAR CHAMADO" — aparece no lugar do input quando pendente ========= */}
      {ticketAtivo.status === 'pendente' && (
        <div className="border-t-2 border-primary/30 bg-primary/5 px-6 py-4 shrink-0">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                <UserPlus className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[var(--color-text)]">Chamado na fila</p>
                <p className="text-xs text-[var(--color-text-muted)]">Puxe este chamado para iniciar o atendimento</p>
              </div>
            </div>
            <button
              onClick={() => puxarMutation.mutate()}
              disabled={puxarMutation.isPending}
              className="h-11 px-6 rounded-xl bg-primary text-white font-semibold text-sm hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center gap-2 shrink-0 shadow-sm"
            >
              <UserPlus className="w-4 h-4" />
              {puxarMutation.isPending ? 'Puxando...' : 'Puxar chamado'}
            </button>
          </div>
        </div>
      )}

      {/* Painel ⚡ Respostas Rápidas */}
      {painelRespostas && ticketAtivo.status !== 'pendente' && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] shrink-0">
          <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--color-border)]">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-[var(--color-text)]">Respostas rápidas</span>
            </div>
            <button onClick={() => setPainelRespostas(false)} className="p-1 rounded hover:bg-[var(--color-surface-elevated)]">
              <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
            </button>
          </div>
          <div className="max-h-52 overflow-y-auto">
            {(respostasRapidas || []).length === 0 ? (
              <p className="text-xs text-[var(--color-text-muted)] text-center py-6">Nenhuma resposta rápida cadastrada</p>
            ) : (respostasRapidas || []).map((r) => (
              <button
                key={r.id}
                onClick={() => selecionarQuickReply(r)}
                className="w-full text-left px-4 py-3 flex items-start gap-3 hover:bg-[var(--color-surface-elevated)] border-b border-[var(--color-border)] last:border-b-0 transition-colors"
              >
                <div className="shrink-0 mt-0.5">
                  {r.media_url ? (
                    <img src={r.media_url} alt="" className="w-10 h-10 rounded-lg object-cover" onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Zap className="w-4 h-4 text-primary" />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-[var(--color-text)] truncate">{r.titulo}</span>
                    <code className="text-2xs font-mono text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0">{r.atalho}</code>
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)] line-clamp-2">{r.corpo}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {quickReplyAberto && quickRepliesFiltradas.length > 0 && ticketAtivo.status !== 'pendente' && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] max-h-48 overflow-y-auto">
          {quickRepliesFiltradas.map((r, i) => (
            <button key={r.id} onClick={() => selecionarQuickReply(r)} className={cn('w-full text-left px-4 py-2.5 flex items-start gap-3', i === quickReplyIdx ? 'bg-primary/10' : 'hover:bg-[var(--color-surface-elevated)]')}>
              <Zap className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2"><code className="text-xs font-mono text-primary">{r.atalho}</code><span className="text-xs font-medium">{r.titulo}</span></div>
                <p className="text-2xs text-[var(--color-text-muted)] truncate mt-0.5">{r.corpo}</p>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Enviando mídia — preview local (item 4) */}
      {enviandoMidia && ticketAtivo.status !== 'pendente' && (
        <div className="border-t border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-2 flex items-center gap-3">
          {midiaPreview?.tipo === 'imagem' && midiaPreview?.url && (
            <img src={midiaPreview.url} alt="Preview" className="w-10 h-10 rounded-lg object-cover shrink-0" />
          )}
          {midiaPreview?.tipo === 'video' && midiaPreview?.url && (
            <video src={midiaPreview.url} className="w-10 h-10 rounded-lg object-cover shrink-0" muted />
          )}
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin shrink-0" />
            <span className="text-xs text-[var(--color-text-muted)] truncate">
              Enviando {midiaPreview?.nome || 'mídia'}...
            </span>
          </div>
        </div>
      )}

      {/* Input — esconde quando chamado está na fila (pendente) */}
      {ticketAtivo.status !== 'pendente' && (
      <div className={cn('border-t px-4 py-3 bg-[var(--color-surface)] shrink-0', modoNota ? 'border-t-amber-400 bg-amber-50/50 dark:bg-amber-900/10' : 'border-[var(--color-border)]')}>
        {modoNota && (
          <div className="flex items-center gap-1.5 mb-2">
            <StickyNote className="w-3.5 h-3.5 text-amber-600" />
            <span className="text-xs font-medium text-amber-600">Nota interna</span>
          </div>
        )}

        {gravando ? (
          <div className="flex items-center gap-3">
            <button onClick={cancelarGravacao} className="w-9 h-9 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200">
              <X className="w-4 h-4" />
            </button>
            <div className="flex-1 flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
              <span className="text-sm font-mono text-red-600">{formatarTempo(tempoGravacao)}</span>
              <div className="flex-1 h-1 bg-red-100 rounded-full overflow-hidden">
                <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: `${Math.min((tempoGravacao / 120) * 100, 100)}%` }} />
              </div>
            </div>
            <button onClick={pararGravacao} className="w-10 h-10 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90">
              <Send className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="flex items-end gap-2">
            <button onClick={() => setModoNota(!modoNota)} title="Nota interna"
              className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                modoNota ? 'bg-amber-100 text-amber-700' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]')}>
              <StickyNote className="w-4 h-4" />
            </button>

            {/* Botão ⚡ Respostas Rápidas */}
            <button onClick={() => setPainelRespostas(!painelRespostas)} title="Respostas rápidas"
              className={cn('w-9 h-9 rounded-lg flex items-center justify-center shrink-0',
                painelRespostas ? 'bg-primary/15 text-primary' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]')}>
              <Zap className="w-4 h-4" />
            </button>

            {/* Botão + */}
            <div className="relative shrink-0">
              <button onClick={() => setMenuAnexo(!menuAnexo)} title="Anexar mídia"
                className="w-9 h-9 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]">
                <Plus className="w-4 h-4" />
              </button>
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
                  {/* Botão Sticker */}
                  <button
                    onClick={() => { setMenuAnexo(false); setModalSticker(true); }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-sm cursor-pointer hover:bg-[var(--color-surface-elevated)] text-left"
                  >
                    <span className="w-4 h-4 flex items-center justify-center text-primary">🎭</span> Sticker
                  </button>
                </div>
              )}
            </div>

            <textarea ref={inputRef} value={texto} onChange={(e) => setTexto(e.target.value)} onKeyDown={handleKeyDown}
              placeholder={modoNota ? 'Escreva uma nota interna...' : 'Digite / para respostas rápidas...'}
              rows={1}
              className="flex-1 resize-none rounded-xl bg-[var(--color-surface-elevated)] dark:bg-surface-dark-elevated px-4 py-2.5 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 max-h-32 border-0"
              style={{ minHeight: '40px' }} />

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
              <Button size="icon" onClick={handleEnviar} loading={enviarMutation.isPending} disabled={!texto.trim()}
                className={cn('rounded-xl shrink-0', modoNota && 'bg-amber-500 hover:bg-amber-600')}>
                <Send className="w-4 h-4" />
              </Button>
            ) : (
              <button onClick={iniciarGravacao} title="Gravar áudio"
                className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center hover:bg-primary/90 shrink-0">
                <Mic className="w-4 h-4" />
              </button>
            )}
          </div>
        )}
      </div>
      )}

      {menuAnexo && <div className="fixed inset-0 z-40" onClick={() => setMenuAnexo(false)} />}
      {lightbox && <Lightbox url={lightbox.url} tipo={lightbox.tipo} onFechar={() => setLightbox(null)} />}

      {/* Modal Galeria de Stickers — com abas Favoritos / Recebidos (item 6) */}
      {modalSticker && (
        <StickerGalleryModal
          stickersGaleria={stickersGaleria?.stickers || []}
          stickersFavoritos={stickersFavoritos}
          favoritosUrls={favoritosUrls}
          onEnviar={handleEnviarSticker}
          onFavoritar={handleFavoritarSticker}
          onDesfavoritar={handleDesfavoritarSticker}
          enviando={enviandoSticker}
          onFechar={() => setModalSticker(false)}
        />
      )}

      {/* Modal confirmar puxar chamado */}
      {confirmaPuxar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => setConfirmaPuxar(false)}>
          <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl w-96 p-6" onClick={(e) => e.stopPropagation()}>
            <div className="text-center mb-4">
              <div className="w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center mx-auto mb-3">
                <ArrowRightLeft className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="text-sm font-semibold mb-2">Chamado em atendimento</h3>
              <p className="text-xs text-[var(--color-text-muted)]">
                Este chamado está sendo atendido por <strong className="text-[var(--color-text)]">{ticketAtivo?.atendente_nome || 'outro atendente'}</strong>.
                Tem certeza que deseja puxar para você?
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => { setConfirmaPuxar(false); setTextoPendente(''); }}
                className="flex-1 h-9 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-elevated)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={confirmarPuxarChamado}
                className="flex-1 h-9 rounded-lg bg-primary text-white text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Sim, puxar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal fechar chamado — selecionar motivo */}
      {modalFechar && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={() => { setModalFechar(false); setMotivoSelecionado(null); }}>
          <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl w-[420px] max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-5 border-b border-[var(--color-border)] text-center">
              <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center mx-auto mb-3">
                <XCircle className="w-6 h-6 text-red-500" />
              </div>
              <h3 className="text-sm font-semibold mb-1">Fechar chamado</h3>
              <p className="text-xs text-[var(--color-text-muted)]">Selecione o motivo do atendimento</p>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {motivosAtivos.length === 0 ? (
                <p className="text-xs text-[var(--color-text-muted)] text-center py-4">Nenhum motivo cadastrado. Configure em Configurações.</p>
              ) : (
                motivosAtivos.map((m) => (
                  <button
                    key={m.id}
                    onClick={() => setMotivoSelecionado(m.id)}
                    className={cn(
                      'w-full text-left px-4 py-3 rounded-lg border-2 transition-all text-sm',
                      motivoSelecionado === m.id
                        ? 'border-primary bg-primary/5 text-primary font-medium'
                        : 'border-[var(--color-border)] hover:border-primary/40 hover:bg-[var(--color-surface-elevated)] text-[var(--color-text)]'
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        'w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
                        motivoSelecionado === m.id ? 'border-primary bg-primary' : 'border-[var(--color-text-muted)]'
                      )}>
                        {motivoSelecionado === m.id && <Check className="w-2.5 h-2.5 text-white" />}
                      </div>
                      {m.nome}
                    </div>
                  </button>
                ))
              )}
            </div>

            <div className="p-4 border-t border-[var(--color-border)] flex gap-2">
              <button
                onClick={() => { setModalFechar(false); setMotivoSelecionado(null); }}
                className="flex-1 h-10 rounded-lg border border-[var(--color-border)] text-sm font-medium hover:bg-[var(--color-surface-elevated)] transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleFecharComMotivo}
                disabled={finalizarMutation.isPending}
                className="flex-1 h-10 rounded-lg bg-red-500 text-white text-sm font-medium hover:bg-red-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {finalizarMutation.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <XCircle className="w-4 h-4" />
                    Fechar chamado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============ STICKER GALLERY MODAL — com favoritos (item 6) ============
function StickerGalleryModal({ stickersGaleria, stickersFavoritos, favoritosUrls, onEnviar, onFavoritar, onDesfavoritar, enviando, onFechar }) {
  const [abaSticker, setAbaSticker] = useState('favoritos');

  const stickersExibidos = abaSticker === 'favoritos' ? stickersFavoritos : stickersGaleria;

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center" onClick={onFechar}>
      <div className="bg-[var(--color-surface)] rounded-xl shadow-2xl w-96 max-h-[70vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b border-[var(--color-border)]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold">🎭 Stickers</h3>
            <button onClick={onFechar} className="p-1 rounded hover:bg-[var(--color-surface-elevated)]"><X className="w-4 h-4" /></button>
          </div>
          {/* Abas favoritos / recebidos */}
          <div className="flex bg-[var(--color-surface-elevated)] rounded-lg p-0.5 gap-0.5">
            <button
              onClick={() => setAbaSticker('favoritos')}
              className={cn('flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                abaSticker === 'favoritos' ? 'bg-primary/15 text-primary shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}
            >
              <Star className="w-3 h-3 inline mr-1" /> Favoritos ({stickersFavoritos.length})
            </button>
            <button
              onClick={() => setAbaSticker('recebidos')}
              className={cn('flex-1 py-1.5 rounded-md text-xs font-medium transition-all',
                abaSticker === 'recebidos' ? 'bg-primary/15 text-primary shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}
            >
              Recebidos ({stickersGaleria.length})
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {stickersExibidos.length === 0 ? (
            <div className="text-center py-10">
              <span className="text-4xl block mb-2">{abaSticker === 'favoritos' ? '⭐' : '🎭'}</span>
              <p className="text-xs text-[var(--color-text-muted)]">
                {abaSticker === 'favoritos' ? 'Nenhum sticker favoritado' : 'Nenhum sticker recebido ainda'}
              </p>
              <p className="text-2xs text-[var(--color-text-muted)] mt-1">
                {abaSticker === 'favoritos'
                  ? 'Favorite stickers recebidos com o botão ⭐'
                  : 'Stickers que contatos enviarem aparecerão aqui'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-4 gap-2">
              {stickersExibidos.map((s) => (
                <div key={s.id || s.url} className="relative group">
                  <button
                    onClick={() => onEnviar(s.url)}
                    disabled={enviando}
                    className="aspect-square w-full rounded-lg border border-[var(--color-border)] hover:border-primary hover:bg-primary/5 p-1.5 transition-all disabled:opacity-50 flex items-center justify-center"
                    title="Clique para enviar"
                  >
                    <img src={s.url} alt="Sticker" className="w-full h-full object-contain" loading="lazy" />
                  </button>
                  {/* Botão favoritar/desfavoritar no hover (item 6) */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (favoritosUrls.has(s.url)) {
                        onDesfavoritar(s.url);
                      } else {
                        onFavoritar(s.url);
                      }
                    }}
                    className={cn(
                      'absolute top-0.5 right-0.5 w-5 h-5 rounded-full flex items-center justify-center transition-all',
                      favoritosUrls.has(s.url)
                        ? 'bg-amber-400 text-white opacity-100'
                        : 'bg-black/40 text-white opacity-0 group-hover:opacity-100'
                    )}
                    title={favoritosUrls.has(s.url) ? 'Remover favorito' : 'Favoritar'}
                  >
                    <Star className="w-3 h-3" fill={favoritosUrls.has(s.url) ? 'currentColor' : 'none'} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-[var(--color-border)]">
          <p className="text-2xs text-[var(--color-text-muted)] text-center">Clique em um sticker para enviar</p>
        </div>
      </div>
    </div>
  );
}

// ============ LIGHTBOX ============
function Lightbox({ url, tipo, onFechar }) {
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [onFechar]);

  return (
    <div className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center" onClick={onFechar}>
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

// ============ CHAT BUBBLE — com fix menu encaminhar (item 2) + sticker favoritar (item 6) ============
function ChatBubble({ mensagem, onLightbox, modoEncaminhar, onIniciarEncaminhar, onFavoritarSticker, favoritosUrls }) {
  const { is_from_me, is_internal, tipo, corpo, criado_em, status_envio, usuario_nome, contato_nome, media_url, nome_participante, nomeParticipante, deletada } = mensagem;
  const participante = nome_participante || nomeParticipante;
  const [menuAberto, setMenuAberto] = useState(false);
  const [reacaoAberta, setReacaoAberta] = useState(false);
  const [reacaoLocal, setReacaoLocal] = useState(mensagem.reacao || null);

  if (tipo === 'sistema') return (
    <div className="flex justify-center py-3">
      <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] px-4 py-2 rounded-xl text-center">
        <span className="text-xs text-[var(--color-text-secondary)] font-medium">{corpo}</span>
      </div>
    </div>
  );

  if (is_internal) return (
    <div className="flex justify-end py-0.5">
      <div className="max-w-[75%] rounded-2xl rounded-br-md px-4 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
        <div className="flex items-center gap-1.5 mb-1"><StickyNote className="w-3 h-3 text-amber-600" /><span className="text-2xs font-medium text-amber-600">Nota — {usuario_nome}</span></div>
        <p className="text-sm text-amber-900 dark:text-amber-200 whitespace-pre-wrap break-words">{corpo}</p>
        <span className="text-2xs text-amber-500 mt-1 block text-right">{formatarDataMensagem(criado_em)}</span>
      </div>
    </div>
  );

  const enviada = is_from_me;

  const handleReagir = async (emoji) => {
    setReacaoLocal(emoji);
    setReacaoAberta(false);
    try {
      await api.post('/api/whatsapp/reagir', { mensagem_id: mensagem.id, emoji });
    } catch {
      setReacaoLocal(mensagem.reacao);
      toast.error('Erro ao reagir');
    }
  };

  const handleDeletar = async () => {
    if (!confirm('Apagar esta mensagem?')) return;
    try {
      await api.delete(`/api/whatsapp/deletar-mensagem/${mensagem.id}`);
      toast.success('Mensagem apagada');
      setMenuAberto(false);
    } catch { toast.error('Erro ao apagar'); }
  };

  const [mostrarApagada, setMostrarApagada] = useState(false);
  const deletadaPorContato = deletada && mensagem.deletada_por === 'contato';
  const deletadaPorAtendente = deletada && mensagem.deletada_por === 'atendente';

  const EMOJIS_RAPIDOS = ['👍', '❤️', '😂', '😮', '😢', '🙏'];

  return (
    <div className={cn('flex py-0.5', !modoEncaminhar && 'group', enviada ? 'justify-end' : 'justify-start')}>
      <div className="relative max-w-[75%]">
        {/* Menu de ações (item 2 — fix z-index e backdrop) */}
        {!deletada && !modoEncaminhar && (
          <div className={cn('absolute top-0 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity z-30',
            enviada ? 'left-0 -translate-x-full pr-1' : 'right-0 translate-x-full pl-1')}>
            <button onClick={() => setReacaoAberta(!reacaoAberta)}
              className="p-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]" title="Reagir">
              <span style={{ fontSize: '12px' }}>😊</span>
            </button>
            <button onClick={() => setMenuAberto(!menuAberto)}
              className="p-1 rounded-full bg-[var(--color-surface)] border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]" title="Mais">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="5" r="2" /><circle cx="12" cy="12" r="2" /><circle cx="12" cy="19" r="2" /></svg>
            </button>
          </div>
        )}

        {/* Painel de reações */}
        {reacaoAberta && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setReacaoAberta(false)} />
            <div className={cn('absolute -top-8 flex gap-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-2 py-1 shadow-lg z-50',
              enviada ? 'right-0' : 'left-0')}>
              {EMOJIS_RAPIDOS.map((e) => (
                <button key={e} onClick={() => handleReagir(e)} className="hover:scale-125 transition-transform" style={{ fontSize: '16px' }}>{e}</button>
              ))}
            </div>
          </>
        )}

        {/* Menu dropdown (item 2 — fix: backdrop pra fechar, z-index correto, visual limpo) */}
        {menuAberto && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
            <div className={cn('absolute top-6 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 py-1.5 min-w-[170px]',
              enviada ? 'right-0' : 'left-0')}>
              <button onClick={() => { if (onIniciarEncaminhar) onIniciarEncaminhar(); setMenuAberto(false); }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-surface-elevated)] flex items-center gap-2.5 transition-colors">
                <ArrowRightLeft className="w-3.5 h-3.5" /> Encaminhar
              </button>
              {enviada && !deletada && (
                <button onClick={handleDeletar}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-red-50 dark:hover:bg-red-900/10 flex items-center gap-2.5 text-red-500 transition-colors">
                  <Trash2 className="w-3.5 h-3.5" /> Apagar mensagem
                </button>
              )}
            </div>
          </>
        )}

        {/* Bolha */}
        <div className={cn('rounded-2xl overflow-hidden', enviada ? 'bg-primary text-white rounded-br-md' : 'bg-[var(--chat-bubble-received)] text-[var(--chat-bubble-received-text)] rounded-bl-md')}>
          {!enviada && (participante || contato_nome) && <span className="text-2xs font-medium text-primary mb-0.5 block px-4 pt-2">{participante || contato_nome}</span>}

          {/* Banner mensagem apagada */}
          {deletadaPorContato && (
            <div className="px-4 pt-2">
              <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-2xs italic', enviada ? 'bg-white/10' : 'bg-red-50 dark:bg-red-900/20')}>
                <span>🚫</span>
                <span className={enviada ? 'text-white/70' : 'text-red-600 dark:text-red-400'}>O contato apagou esta mensagem</span>
                <button onClick={() => setMostrarApagada(!mostrarApagada)} className={cn('ml-auto text-2xs underline', enviada ? 'text-white/50 hover:text-white/80' : 'text-red-500 hover:text-red-700')}>
                  {mostrarApagada ? 'Ocultar' : 'Ver original'}
                </button>
              </div>
            </div>
          )}
          {deletadaPorAtendente && (
            <div className="px-4 pt-2">
              <div className={cn('flex items-center gap-2 px-3 py-1.5 rounded-lg text-2xs italic', enviada ? 'bg-white/10' : 'bg-amber-50 dark:bg-amber-900/20')}>
                <span>🚫</span>
                <span className={enviada ? 'text-white/70' : 'text-amber-600 dark:text-amber-400'}>Você apagou esta mensagem</span>
              </div>
            </div>
          )}

          {/* Conteúdo */}
          {(!deletada || mostrarApagada) && (
            <MediaContent
              tipo={tipo}
              corpo={corpo}
              mediaUrl={media_url}
              enviada={enviada}
              onLightbox={onLightbox}
              mensagemId={mensagem.id}
              onFavoritarSticker={onFavoritarSticker}
              favoritosUrls={favoritosUrls}
            />
          )}

          <div className={cn('flex items-center justify-end gap-1 px-4 pb-2', enviada ? 'text-white/60' : 'text-[var(--color-text-muted)]')}>
            <span className="text-2xs">{formatarDataMensagem(criado_em)}</span>
            {enviada && <StatusIcon status={status_envio} />}
          </div>
        </div>

        {/* Reação exibida */}
        {reacaoLocal && (
          <div className={cn('absolute -bottom-3', enviada ? 'right-2' : 'left-2')}>
            <span className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-full px-1.5 py-0.5 shadow-sm" style={{ fontSize: '14px' }}>{reacaoLocal}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ============ MEDIA CONTENT — com fix video (item 3) + sticker favoritar (item 6) ============
function MediaContent({ tipo, corpo, mediaUrl, enviada, onLightbox, mensagemId, onFavoritarSticker, favoritosUrls }) {
  switch (tipo) {
    case 'imagem':
      return (
        <div>
          {mediaUrl ? (
            <button onClick={() => onLightbox({ url: mediaUrl, tipo: 'imagem' })} className="block cursor-pointer">
              <img src={mediaUrl} alt="Imagem" className="max-w-full max-h-64 object-cover hover:opacity-90" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
            </button>
          ) : (
            <div className="px-4 pt-2 flex items-center gap-2"><span>📷</span><span className="text-sm opacity-80">Imagem</span></div>
          )}
          {corpo && corpo !== '📷 Imagem' && <p className="text-sm whitespace-pre-wrap break-words px-4 pt-1">{corpo}</p>}
        </div>
      );

    case 'audio':
      return <AudioBubble corpo={corpo} mediaUrl={mediaUrl} mensagemId={mensagemId} enviada={enviada} />;

    // Video rendering fix (item 3)
    case 'video':
      return (
        <div>
          {mediaUrl ? (
            <button onClick={() => onLightbox({ url: mediaUrl, tipo: 'video' })} className="relative block cursor-pointer group">
              <video
                preload="metadata"
                className="max-w-full max-h-48 rounded-t-2xl bg-black"
                onError={(e) => {
                  // Se <video> falhar, substituir por placeholder clicável
                  e.target.style.display = 'none';
                  const placeholder = e.target.nextElementSibling;
                  if (placeholder) placeholder.style.display = 'flex';
                }}
              >
                <source src={mediaUrl} type="video/mp4" />
                <source src={mediaUrl} type="video/webm" />
                <source src={mediaUrl} type="video/3gpp" />
                <source src={mediaUrl} />
              </video>
              {/* Placeholder se video falhar */}
              <div className="items-center justify-center gap-2 px-6 py-8 bg-black/20" style={{ display: 'none' }}>
                <Play className="w-8 h-8 text-white/80" />
                <span className={cn('text-sm', enviada ? 'text-white/80' : 'text-[var(--color-text-secondary)]')}>Abrir vídeo</span>
              </div>
              {/* Play overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/40 transition-colors">
                <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                  <Play className="w-6 h-6 text-neutral-800 ml-0.5" />
                </div>
              </div>
            </button>
          ) : (
            <div className="px-4 pt-2 flex items-center gap-2"><span>🎥</span><span className="text-sm opacity-80">Vídeo</span></div>
          )}
          {corpo && corpo !== '🎥 Vídeo' && corpo !== '🎬 Video' && <p className="text-sm whitespace-pre-wrap break-words px-4 pt-1">{corpo}</p>}
        </div>
      );

    case 'documento':
      return (
        <div className="px-4 pt-2">
          {mediaUrl ? (
            <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
              className={cn('flex items-center gap-3 p-3 rounded-lg', enviada ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5')}>
              <span className="text-2xl">📄</span>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium truncate">{corpo || 'Documento'}</p>
                <p className="text-2xs opacity-60">Clique para baixar</p>
              </div>
              <Download className="w-4 h-4 opacity-60" />
            </a>
          ) : (
            <div className="flex items-center gap-2"><span>📄</span><span className="text-sm opacity-80">{corpo || 'Documento'}</span></div>
          )}
        </div>
      );

    case 'localizacao': {
      const match = corpo?.match(/([-\d.]+),\s*([-\d.]+)/);
      const lat = match?.[1], lng = match?.[2];
      const mapsUrl = lat && lng ? `https://www.google.com/maps?q=${lat},${lng}` : null;
      return (
        <div className="px-4 pt-2">
          {mapsUrl ? (
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className={cn('flex items-center gap-3 p-3 rounded-lg cursor-pointer', enviada ? 'bg-white/10 hover:bg-white/20' : 'bg-black/5 hover:bg-black/10 dark:bg-white/5')}>
              <MapPin className="w-6 h-6 text-red-500 shrink-0" />
              <div>
                <p className="text-sm font-medium">Localização</p>
                <p className="text-2xs opacity-70">{lat}, {lng}</p>
                <p className={cn('text-2xs mt-0.5 underline', enviada ? 'text-white/80' : 'text-primary')}>Abrir no Google Maps</p>
              </div>
            </a>
          ) : (
            <div className={cn('flex items-center gap-2 p-2 rounded-lg', enviada ? 'bg-white/10' : 'bg-black/5')}>
              <span className="text-2xl">📍</span>
              <div><p className="text-sm">Localização</p><p className="text-2xs opacity-70">{corpo}</p></div>
            </div>
          )}
        </div>
      );
    }

    case 'contato':
      return (
        <div className="px-4 pt-2">
          <div className={cn('flex items-center gap-2 p-2 rounded-lg', enviada ? 'bg-white/10' : 'bg-black/5 dark:bg-white/5')}>
            <span className="text-2xl">👤</span>
            <p className="text-sm">{corpo || 'Contato'}</p>
          </div>
        </div>
      );

    // Sticker com botão favoritar no hover (item 6)
    case 'sticker':
      return (
        <div className="px-4 pt-2 relative group/sticker">
          {mediaUrl ? (
            <>
              <img src={mediaUrl} alt="Sticker" className="w-32 h-32 object-contain" loading="lazy" />
              {/* Botão favoritar no hover (item 6) */}
              {!enviada && onFavoritarSticker && (
                <button
                  onClick={() => onFavoritarSticker(mediaUrl)}
                  className={cn(
                    'absolute top-3 right-5 w-6 h-6 rounded-full flex items-center justify-center transition-all shadow-sm',
                    favoritosUrls?.has(mediaUrl)
                      ? 'bg-amber-400 text-white opacity-100'
                      : 'bg-black/50 text-white opacity-0 group-hover/sticker:opacity-100'
                  )}
                  title={favoritosUrls?.has(mediaUrl) ? 'Já favoritado' : 'Favoritar sticker'}
                >
                  <Star className="w-3.5 h-3.5" fill={favoritosUrls?.has(mediaUrl) ? 'currentColor' : 'none'} />
                </button>
              )}
            </>
          ) : (
            <span className="text-4xl">🎭</span>
          )}
        </div>
      );

    default:
      return (
        <p className="text-sm whitespace-pre-wrap break-words px-4 pt-2">
          <Linkify texto={corpo || '📎 Mídia'} enviada={enviada} />
        </p>
      );
  }
}

// Componente pra tornar links clicáveis
function Linkify({ texto, enviada }) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = texto.split(urlRegex);
  return parts.map((part, i) => {
    if (urlRegex.test(part)) {
      urlRegex.lastIndex = 0;
      return <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={cn('underline break-all', enviada ? 'text-white/90 hover:text-white' : 'text-primary hover:text-primary/80')}>{part}</a>;
    }
    return <span key={i}>{part}</span>;
  });
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

// AudioBubble — player de áudio com transcrição
function AudioBubble({ corpo, mediaUrl, mensagemId, enviada }) {
  const [transcricao, setTranscricao] = useState(null);
  const [transcrevendo, setTranscrevendo] = useState(false);

  const jaTemTranscricao = corpo && corpo.length > 5 && !corpo.startsWith('🎵');

  const handleTranscrever = async () => {
    if (transcrevendo) return;
    setTranscrevendo(true);
    try {
      let audioBase64 = null;

      if (mediaUrl) {
        if (mediaUrl.startsWith('data:')) {
          audioBase64 = mediaUrl;
        } else {
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
          } catch { /* Falha no download */ }
        }
      }

      let result;
      if (audioBase64) {
        result = await api.post('/api/ai/transcrever-audio-base64', {
          mensagem_id: mensagemId,
          audio_base64: audioBase64,
        });
      } else {
        result = await api.post(`/api/ai/transcrever-audio/${mensagemId}`);
      }

      setTranscricao(result.transcricao);
      toast.success('Áudio transcrito!');
    } catch {
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
          <source src={mediaUrl} type="audio/webm" />
        </audio>
      ) : (
        <div className="flex items-center gap-2">
          <span>🎵</span>
          <span className="text-sm opacity-80">Áudio</span>
        </div>
      )}

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
