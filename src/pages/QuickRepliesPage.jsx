// src/pages/QuickRepliesPage.jsx
// NOVO: Suporte a foto, vídeo, link, áudio nas respostas rápidas
// Preview da mídia na listagem

import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, EmptyState } from '../components/ui';
import { BookOpen, Plus, Trash2, Edit3, Image, Video, Link2, Mic, X, Play, Send, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import toast from 'react-hot-toast';

// Helper — converter File pra base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function QuickRepliesPage() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ atalho: '', titulo: '', corpo: '', media_url: '', media_tipo: '' });
  const [previewExpandido, setPreviewExpandido] = useState(null);

  // Gravação de áudio
  const [gravando, setGravando] = useState(false);
  const [tempoGravacao, setTempoGravacao] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const { data: respostas } = useQuery({
    queryKey: ['respostas-rapidas'],
    queryFn: () => api.get('/api/quick-replies'),
  });

  const criarMutation = useMutation({
    mutationFn: () => {
      const payload = {
        atalho: form.atalho,
        titulo: form.titulo,
        corpo: form.corpo,
        media_url: form.media_url || null,
        media_tipo: form.media_tipo || null,
      };
      if (editandoId) {
        return api.patch(`/api/quick-replies/${editandoId}`, payload);
      }
      return api.post('/api/quick-replies', payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respostas-rapidas'] });
      fecharModal();
      toast.success(editandoId ? 'Resposta atualizada!' : 'Resposta rápida criada!');
    },
    onError: (err) => toast.error(err.message),
  });

  const deletarMutation = useMutation({
    mutationFn: (id) => api.delete(`/api/quick-replies/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respostas-rapidas'] });
      toast.success('Removida');
    },
  });

  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
    setForm({ atalho: '', titulo: '', corpo: '', media_url: '', media_tipo: '' });
    cancelarGravacao();
  };

  const abrirEditar = (r) => {
    setEditandoId(r.id);
    setForm({
      atalho: r.atalho,
      titulo: r.titulo,
      corpo: r.corpo,
      media_url: r.media_url || '',
      media_tipo: r.media_tipo || '',
    });
    setModalAberto(true);
  };

  // ============ ANEXAR MÍDIA ============
  const handleAnexarImagem = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setForm(f => ({ ...f, media_url: base64, media_tipo: 'imagem' }));
      toast.success('Imagem anexada!');
    } catch { toast.error('Erro ao ler imagem'); }
    e.target.value = '';
  };

  const handleAnexarVideo = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const base64 = await fileToBase64(file);
      setForm(f => ({ ...f, media_url: base64, media_tipo: 'video' }));
      toast.success('Vídeo anexado!');
    } catch { toast.error('Erro ao ler vídeo'); }
    e.target.value = '';
  };

  const handleAnexarLink = () => {
    const url = prompt('Cole a URL do link:');
    if (url && url.startsWith('http')) {
      setForm(f => ({ ...f, media_url: url, media_tipo: 'link' }));
      toast.success('Link adicionado!');
    }
  };

  // ============ GRAVAÇÃO DE ÁUDIO ============
  const iniciarGravacao = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus') ? 'audio/webm;codecs=opus' : 'audio/webm',
      });
      audioChunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) audioChunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach(t => t.stop());
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onload = () => {
          setForm(f => ({ ...f, media_url: reader.result, media_tipo: 'audio' }));
          toast.success('Áudio gravado!');
        };
        reader.readAsDataURL(blob);
      };

      mediaRecorderRef.current = recorder;
      recorder.start();
      setGravando(true);
      setTempoGravacao(0);
      timerRef.current = setInterval(() => setTempoGravacao(t => t + 1), 1000);
    } catch {
      toast.error('Permissão de microfone negada');
    }
  };

  const pararGravacao = () => {
    if (mediaRecorderRef.current?.state === 'recording') mediaRecorderRef.current.stop();
    setGravando(false);
    clearInterval(timerRef.current);
  };

  const cancelarGravacao = () => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream?.getTracks().forEach(t => t.stop());
    }
    setGravando(false);
    clearInterval(timerRef.current);
    audioChunksRef.current = [];
  };

  const removerMidia = () => {
    setForm(f => ({ ...f, media_url: '', media_tipo: '' }));
  };

  const formatarTempo = (s) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  // Renderizar preview de mídia
  const renderPreviewMidia = (mediaUrl, mediaTipo, pequeno = false) => {
    if (!mediaUrl) return null;

    const tamanho = pequeno ? 'w-12 h-12' : 'w-full max-h-40';

    switch (mediaTipo) {
      case 'imagem':
        return (
          <img
            src={mediaUrl}
            alt="Preview"
            className={cn('rounded-lg object-cover', tamanho)}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
        );
      case 'video':
        return (
          <div className={cn('relative rounded-lg overflow-hidden bg-black/10', pequeno ? 'w-12 h-12' : 'w-full h-32')}>
            <video className="w-full h-full object-cover" preload="metadata">
              <source src={mediaUrl} />
            </video>
            <div className="absolute inset-0 flex items-center justify-center bg-black/20">
              <Play className={cn('text-white', pequeno ? 'w-4 h-4' : 'w-8 h-8')} />
            </div>
          </div>
        );
      case 'audio':
        return pequeno ? (
          <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Mic className="w-5 h-5 text-primary" />
          </div>
        ) : (
          <audio controls className="w-full" style={{ maxHeight: '48px' }}>
            <source src={mediaUrl} type="audio/webm" />
            <source src={mediaUrl} type="audio/mpeg" />
          </audio>
        );
      case 'link':
        return pequeno ? (
          <div className="w-12 h-12 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
            <Link2 className="w-5 h-5 text-blue-500" />
          </div>
        ) : (
          <a href={mediaUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 p-2 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-xs hover:underline truncate">
            <Link2 className="w-4 h-4 shrink-0" />
            <span className="truncate">{mediaUrl}</span>
          </a>
        );
      default:
        return null;
    }
  };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-semibold">Respostas rápidas</h1>
          <Button onClick={() => { setEditandoId(null); setForm({ atalho: '', titulo: '', corpo: '', media_url: '', media_tipo: '' }); setModalAberto(true); }}>
            <Plus className="w-4 h-4" /> Nova resposta
          </Button>
        </div>

        <div className="space-y-2">
          {(respostas || []).map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex items-start gap-3">
                {/* Preview de mídia na listagem */}
                {r.media_url && (
                  <div className="shrink-0">
                    {renderPreviewMidia(r.media_url, r.media_tipo, true)}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{r.atalho}</code>
                    <span className="text-sm font-medium">{r.titulo}</span>
                    {r.media_tipo && (
                      <span className="text-2xs bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] px-1.5 py-0.5 rounded">
                        {r.media_tipo === 'imagem' ? '📷' : r.media_tipo === 'video' ? '🎥' : r.media_tipo === 'audio' ? '🎵' : '🔗'} {r.media_tipo}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap line-clamp-3">{r.corpo}</p>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Expandir preview */}
                  {r.media_url && (
                    <button
                      onClick={() => setPreviewExpandido(previewExpandido === r.id ? null : r.id)}
                      className="p-2 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors"
                      title="Ver mídia"
                    >
                      <Eye className="w-4 h-4 text-[var(--color-text-muted)]" />
                    </button>
                  )}
                  <button
                    onClick={() => abrirEditar(r)}
                    className="p-2 rounded-lg hover:bg-[var(--color-surface-elevated)] transition-colors"
                    title="Editar"
                  >
                    <Edit3 className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </button>
                  <button
                    onClick={() => { if (confirm('Remover esta resposta rápida?')) deletarMutation.mutate(r.id); }}
                    className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
                    title="Remover"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Preview expandido */}
              {previewExpandido === r.id && r.media_url && (
                <div className="mt-3 pt-3 border-t border-[var(--color-border)]">
                  {renderPreviewMidia(r.media_url, r.media_tipo, false)}
                </div>
              )}
            </div>
          ))}

          {(respostas || []).length === 0 && (
            <EmptyState icone={BookOpen} titulo="Nenhuma resposta rápida" descricao="Crie atalhos para agilizar o atendimento" />
          )}
        </div>
      </div>

      {/* Modal criar/editar */}
      <Modal
        aberto={modalAberto}
        onFechar={fecharModal}
        titulo={editandoId ? 'Editar resposta rápida' : 'Nova resposta rápida'}
        className="max-w-lg"
      >
        <div className="space-y-3">
          <Input
            label="Atalho"
            placeholder="/saudacao"
            value={form.atalho}
            onChange={(e) => setForm({ ...form, atalho: e.target.value })}
            disabled={!!editandoId}
          />

          <Input
            label="Título"
            placeholder="Saudação inicial"
            value={form.titulo}
            onChange={(e) => setForm({ ...form, titulo: e.target.value })}
          />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Corpo</label>
            <textarea
              value={form.corpo}
              onChange={(e) => setForm({ ...form, corpo: e.target.value })}
              rows={4}
              className="w-full rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
              placeholder="Olá! Seja bem-vindo ao nosso atendimento..."
            />
          </div>

          {/* Mídia — botões de anexo */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Mídia (opcional)</label>

            {/* Preview da mídia selecionada */}
            {form.media_url && (
              <div className="relative">
                {renderPreviewMidia(form.media_url, form.media_tipo, false)}
                <button
                  onClick={removerMidia}
                  className="absolute top-1 right-1 w-6 h-6 rounded-full bg-red-500 text-white flex items-center justify-center hover:bg-red-600 shadow-sm"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Gravação de áudio */}
            {gravando && (
              <div className="flex items-center gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800">
                <button onClick={cancelarGravacao} className="w-8 h-8 rounded-full bg-red-100 text-red-500 flex items-center justify-center hover:bg-red-200 shrink-0">
                  <X className="w-4 h-4" />
                </button>
                <div className="flex-1 flex items-center gap-3">
                  <div className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                  <span className="text-sm font-mono text-red-600">{formatarTempo(tempoGravacao)}</span>
                  <div className="flex-1 h-1 bg-red-200 rounded-full overflow-hidden">
                    <div className="h-full bg-red-500 rounded-full animate-pulse" style={{ width: `${Math.min((tempoGravacao / 120) * 100, 100)}%` }} />
                  </div>
                </div>
                <button onClick={pararGravacao} className="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center hover:bg-primary/90 shrink-0">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Botões de mídia */}
            {!form.media_url && !gravando && (
              <div className="flex items-center gap-2">
                {/* Foto */}
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] text-xs font-medium cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <Image className="w-4 h-4 text-primary" />
                  <span>Foto</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleAnexarImagem} />
                </label>

                {/* Vídeo */}
                <label className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] text-xs font-medium cursor-pointer hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <Video className="w-4 h-4 text-primary" />
                  <span>Vídeo</span>
                  <input type="file" accept="video/*" className="hidden" onChange={handleAnexarVideo} />
                </label>

                {/* Link */}
                <button onClick={handleAnexarLink}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <Link2 className="w-4 h-4 text-primary" />
                  <span>Link</span>
                </button>

                {/* Áudio */}
                <button onClick={iniciarGravacao}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-elevated)] transition-colors">
                  <Mic className="w-4 h-4 text-primary" />
                  <span>Áudio</span>
                </button>
              </div>
            )}
          </div>

          <Button className="w-full" onClick={() => criarMutation.mutate()} loading={criarMutation.isPending}>
            {editandoId ? 'Salvar alterações' : 'Criar'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}
