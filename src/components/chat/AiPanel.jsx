// src/components/chat/AiPanel.jsx
import { useState } from 'react';
import { Button, Skeleton } from '../ui';
import { Sparkles, FileText, Heart, Copy, Check, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AiPanel({ ticketId, onUsarSugestao }) {
  const [expandido, setExpandido] = useState(false);
  const [copiado, setCopiado] = useState(false);
  const [abaAi, setAbaAi] = useState('sugestao');

  // Estados manuais (sem useQuery)
  const [sugestao, setSugestao] = useState('');
  const [resumo, setResumo] = useState('');
  const [sentimento, setSentimento] = useState(null);
  const [loading, setLoading] = useState(false);

  // Gerar sugestão
  const gerarSugestao = async () => {
    if (!ticketId || loading) return;
    setLoading(true);
    setSugestao('');
    try {
      const data = await api.get(`/api/ai/sugestao/${ticketId}`);
      setSugestao(data.sugestao || 'Sem sugestão disponível para esta conversa.');
    } catch (err) {
      toast.error('Erro ao gerar sugestão');
      setSugestao('');
    } finally {
      setLoading(false);
    }
  };

  // Gerar resumo
  const gerarResumo = async () => {
    if (!ticketId || loading) return;
    setLoading(true);
    setResumo('');
    try {
      const data = await api.get(`/api/ai/resumo/${ticketId}`);
      setResumo(data.resumo || 'Sem resumo disponível.');
    } catch {
      toast.error('Erro ao gerar resumo');
    } finally {
      setLoading(false);
    }
  };

  // Detectar sentimento
  const detectarSentimento = async () => {
    if (!ticketId || loading) return;
    setLoading(true);
    setSentimento(null);
    try {
      const data = await api.get(`/api/ai/sentimento/${ticketId}`);
      setSentimento(data);
    } catch {
      toast.error('Erro ao analisar sentimento');
    } finally {
      setLoading(false);
    }
  };

  const handleCopiar = (texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleUsarSugestao = () => {
    if (sugestao && onUsarSugestao) {
      onUsarSugestao(sugestao);
      toast.success('Sugestão inserida');
    }
  };

  const sentimentoCores = {
    positivo: { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', emoji: '😊' },
    neutro: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', emoji: '😐' },
    negativo: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-400', emoji: '😤' },
  };

  return (
    <div className="border-t border-primary/20 bg-primary/[0.03] dark:bg-primary/[0.05]">
      <button
        onClick={() => setExpandido(!expandido)}
        className="w-full flex items-center justify-between px-4 py-2 text-xs font-medium text-primary hover:bg-primary/5 transition-colors"
      >
        <div className="flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Assistente IA</span>
        </div>
        {expandido ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
      </button>

      {expandido && (
        <div className="px-4 pb-3">
          {/* Abas */}
          <div className="flex gap-1 mb-2">
            {[
              { id: 'sugestao', label: 'Sugestão', icone: Sparkles },
              { id: 'resumo', label: 'Resumo', icone: FileText },
              { id: 'sentimento', label: 'Sentimento', icone: Heart },
            ].map(({ id, label, icone: Icone }) => (
              <button
                key={id}
                onClick={() => setAbaAi(id)}
                className={cn(
                  'flex items-center gap-1 px-2.5 py-1 rounded-md text-2xs font-medium transition-all',
                  abaAi === id ? 'bg-primary/10 text-primary' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface-elevated)]'
                )}
              >
                <Icone className="w-3 h-3" /> {label}
              </button>
            ))}
          </div>

          {/* Sugestão */}
          {abaAi === 'sugestao' && (
            <div>
              {loading ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ) : sugestao ? (
                <div className="bg-[var(--color-surface)] border border-primary/20 rounded-lg p-3">
                  <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{sugestao}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" className="text-2xs h-7" onClick={handleUsarSugestao}>Usar resposta</Button>
                    <button onClick={() => handleCopiar(sugestao)} className="flex items-center gap-1 text-2xs text-[var(--color-text-muted)] hover:text-primary">
                      {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                    <button onClick={gerarSugestao} className="flex items-center gap-1 text-2xs text-[var(--color-text-muted)] hover:text-primary ml-auto">
                      <RefreshCw className="w-3 h-3" /> Nova
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Gere uma sugestão de resposta com IA</p>
                  <Button size="sm" className="text-2xs h-7" onClick={gerarSugestao}>
                    <Sparkles className="w-3 h-3" /> Gerar sugestão
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Resumo */}
          {abaAi === 'resumo' && (
            <div>
              {loading ? (
                <div className="space-y-1.5"><Skeleton className="h-3 w-full" /><Skeleton className="h-3 w-5/6" /></div>
              ) : resumo ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
                  <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">{resumo}</p>
                  <button onClick={gerarResumo} className="flex items-center gap-1 text-2xs text-[var(--color-text-muted)] hover:text-primary mt-2">
                    <RefreshCw className="w-3 h-3" /> Atualizar
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Gere um resumo da conversa</p>
                  <Button size="sm" className="text-2xs h-7" onClick={gerarResumo}>
                    <FileText className="w-3 h-3" /> Gerar resumo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Sentimento */}
          {abaAi === 'sentimento' && (
            <div>
              {loading ? (
                <Skeleton className="h-12 w-full" />
              ) : sentimento?.sentimento ? (
                <div className={cn('rounded-lg p-3 flex items-center gap-3', sentimentoCores[sentimento.sentimento]?.bg || sentimentoCores.neutro.bg)}>
                  <span className="text-2xl">{sentimentoCores[sentimento.sentimento]?.emoji || '😐'}</span>
                  <div>
                    <p className={cn('text-sm font-semibold capitalize', sentimentoCores[sentimento.sentimento]?.text)}>{sentimento.sentimento}</p>
                    <p className="text-2xs text-[var(--color-text-muted)]">Confiança: {Math.round((sentimento.confianca || 0) * 100)}%</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Analise o sentimento da conversa</p>
                  <Button size="sm" className="text-2xs h-7" onClick={detectarSentimento}>
                    <Heart className="w-3 h-3" /> Analisar sentimento
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}