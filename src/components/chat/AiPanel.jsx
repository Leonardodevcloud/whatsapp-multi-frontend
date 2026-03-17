// src/components/chat/AiPanel.jsx
// Painel de IA — sugestão de resposta, resumo, sentimento
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button, Skeleton } from '../ui';
import { Sparkles, FileText, Heart, Copy, Check, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '../../lib/utils';
import api from '../../lib/api';
import toast from 'react-hot-toast';

export default function AiPanel({ ticketId, onUsarSugestao }) {
  const [expandido, setExpandido] = useState(false); // Começa fechado
  const [copiado, setCopiado] = useState(false);
  const [abaAi, setAbaAi] = useState('sugestao');

  // Sugestão de resposta
  const { data: sugestaoData, isLoading: loadingSugestao, refetch: refetchSugestao } = useQuery({
    queryKey: ['ai-sugestao', ticketId],
    queryFn: () => api.get(`/api/ai/sugestao/${ticketId}`).catch(() => ({ sugestao: null })),
    enabled: !!ticketId && expandido && abaAi === 'sugestao',
    staleTime: 300000,
    retry: false,
  });

  // Resumo
  const { data: resumoData, isLoading: loadingResumo, refetch: refetchResumo } = useQuery({
    queryKey: ['ai-resumo', ticketId],
    queryFn: () => api.get(`/api/ai/resumo/${ticketId}`).catch(() => ({ resumo: null })),
    enabled: !!ticketId && expandido && abaAi === 'resumo',
    staleTime: 600000,
    retry: false,
  });

  // Sentimento
  const { data: sentimentoData, isLoading: loadingSentimento } = useQuery({
    queryKey: ['ai-sentimento', ticketId],
    queryFn: () => api.get(`/api/ai/sentimento/${ticketId}`).catch(() => null),
    enabled: !!ticketId && expandido && abaAi === 'sentimento',
    staleTime: 300000,
    retry: false,
  });

  const handleCopiar = (texto) => {
    navigator.clipboard.writeText(texto);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 2000);
  };

  const handleUsarSugestao = () => {
    if (sugestaoData?.sugestao && onUsarSugestao) {
      onUsarSugestao(sugestaoData.sugestao);
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
      {/* Header — sempre visível */}
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
              {loadingSugestao ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                </div>
              ) : sugestaoData?.sugestao ? (
                <div className="bg-[var(--color-surface)] border border-primary/20 rounded-lg p-3">
                  <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {sugestaoData.sugestao}
                  </p>
                  <div className="flex items-center gap-2 mt-2">
                    <Button size="sm" className="text-2xs h-7" onClick={handleUsarSugestao}>
                      Usar resposta
                    </Button>
                    <button onClick={() => handleCopiar(sugestaoData.sugestao)}
                      className="flex items-center gap-1 text-2xs text-[var(--color-text-muted)] hover:text-primary transition-colors">
                      {copiado ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      {copiado ? 'Copiado' : 'Copiar'}
                    </button>
                    <button onClick={() => refetchSugestao()}
                      className="text-2xs text-[var(--color-text-muted)] hover:text-primary transition-colors ml-auto">
                      Gerar nova
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Clique para gerar uma sugestão de resposta</p>
                  <Button size="sm" className="text-2xs h-7" onClick={() => refetchSugestao()}>
                    <Sparkles className="w-3 h-3" /> Gerar sugestão
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Resumo */}
          {abaAi === 'resumo' && (
            <div>
              {loadingResumo ? (
                <div className="space-y-1.5">
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-2/3" />
                </div>
              ) : resumoData?.resumo ? (
                <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg p-3">
                  <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap leading-relaxed">
                    {resumoData.resumo}
                  </p>
                  <button onClick={() => refetchResumo()}
                    className="text-2xs text-[var(--color-text-muted)] hover:text-primary transition-colors mt-2">
                    Atualizar resumo
                  </button>
                </div>
              ) : (
                <div className="text-center py-3">
                  <p className="text-xs text-[var(--color-text-muted)] mb-2">Clique para gerar um resumo da conversa</p>
                  <Button size="sm" className="text-2xs h-7" onClick={() => refetchResumo()}>
                    <FileText className="w-3 h-3" /> Gerar resumo
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Sentimento */}
          {abaAi === 'sentimento' && (
            <div>
              {loadingSentimento ? (
                <Skeleton className="h-12 w-full" />
              ) : sentimentoData?.sentimento ? (
                <div className={cn('rounded-lg p-3 flex items-center gap-3', sentimentoCores[sentimentoData.sentimento]?.bg || sentimentoCores.neutro.bg)}>
                  <span className="text-2xl">{sentimentoCores[sentimentoData.sentimento]?.emoji || '😐'}</span>
                  <div>
                    <p className={cn('text-sm font-semibold capitalize', sentimentoCores[sentimentoData.sentimento]?.text)}>
                      {sentimentoData.sentimento}
                    </p>
                    <p className="text-2xs text-[var(--color-text-muted)]">
                      Confiança: {Math.round((sentimentoData.confianca || 0) * 100)}%
                    </p>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-[var(--color-text-muted)]">Sem dados de sentimento</p>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}