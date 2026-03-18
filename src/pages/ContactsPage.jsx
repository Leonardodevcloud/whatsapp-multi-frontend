// src/pages/ContactsPage.jsx
import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Avatar, Badge, Button, Skeleton, EmptyState } from '../components/ui';
import { Users, Search, Phone, Mail, MessageSquare, Send, X } from 'lucide-react';
import { formatarTelefone, formatarDataRelativa, cn } from '../lib/utils';
import { useTicketStore } from '../stores/ticketStore';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function ContactsPage() {
  const [busca, setBusca] = useState('');
  const [contatoSelecionado, setContatoSelecionado] = useState(null);
  const [iniciarConversa, setIniciarConversa] = useState(false);
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);
  const navigate = useNavigate();
  const { selecionarTicket, setAba } = useTicketStore();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['contatos', busca],
    queryFn: () => api.get(`/api/contacts?busca=${busca}&limite=50`),
  });

  const { data: detalhe } = useQuery({
    queryKey: ['contato-detalhe', contatoSelecionado?.id],
    queryFn: () => api.get(`/api/contacts/${contatoSelecionado.id}`),
    enabled: !!contatoSelecionado?.id,
  });

  const contatos = data?.contatos || [];

  const handleIniciarConversa = async () => {
    if (!mensagem.trim() || !contatoSelecionado?.telefone || enviando) return;
    setEnviando(true);
    try {
      const result = await api.post('/api/whatsapp/iniciar-conversa', {
        telefone: contatoSelecionado.telefone,
        mensagem: mensagem.trim(),
        contato_id: contatoSelecionado.id,
      });
      toast.success('Conversa iniciada!');
      setMensagem('');
      setIniciarConversa(false);
      queryClient.invalidateQueries({ queryKey: ['contato-detalhe'] });
      queryClient.invalidateQueries({ queryKey: ['chamados'] });
      if (result.ticket) {
        setAba('meusChats');
        selecionarTicket(result.ticket);
        navigate('/tickets');
      }
    } catch (err) {
      toast.error(err.message || 'Erro ao iniciar conversa');
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div className="flex h-full">
      {/* Lista */}
      <div className="w-96 border-r border-[var(--color-border)] flex flex-col bg-[var(--color-surface)]">
        <div className="p-4 border-b border-[var(--color-border)]">
          <h1 className="text-lg font-display font-semibold mb-3">Contatos</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone ou email..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full h-9 pl-9 pr-3 rounded-lg bg-[var(--color-surface-elevated)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto scrollbar-thin">
          {isLoading ? (
            <div className="p-3 space-y-2">
              {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3 p-3">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <div className="flex-1 space-y-2"><Skeleton className="h-3.5 w-2/3" /><Skeleton className="h-3 w-1/2" /></div>
                </div>
              ))}
            </div>
          ) : contatos.length === 0 ? (
            <EmptyState icone={Users} titulo="Nenhum contato" descricao="Contatos serão criados automaticamente quando receberem mensagens" />
          ) : (
            contatos.map((c) => (
              <button
                key={c.id}
                onClick={() => { setContatoSelecionado(c); setIniciarConversa(false); }}
                className={cn(
                  'w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-[var(--color-surface-elevated)] transition-colors',
                  contatoSelecionado?.id === c.id && 'bg-primary/5'
                )}
              >
                <Avatar nome={c.nome} src={c.avatar_url} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{c.nome || c.telefone}</p>
                  <p className="text-xs text-[var(--color-text-muted)]">{formatarTelefone(c.telefone)}</p>
                </div>
                <span className="text-xs text-[var(--color-text-muted)]">{c.total_tickets} tickets</span>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Detalhe */}
      <div className="flex-1 overflow-y-auto scrollbar-thin p-6">
        {detalhe ? (
          <div className="max-w-lg space-y-6">
            <div className="flex items-center gap-4">
              <Avatar nome={detalhe.nome} src={detalhe.avatar_url} size="xl" />
              <div className="flex-1">
                <h2 className="text-xl font-display font-semibold">{detalhe.nome || 'Sem nome'}</h2>
                <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1.5 mt-1">
                  <Phone className="w-4 h-4" /> {formatarTelefone(detalhe.telefone)}
                </p>
                {detalhe.email && (
                  <p className="text-sm text-[var(--color-text-muted)] flex items-center gap-1.5 mt-0.5">
                    <Mail className="w-4 h-4" /> {detalhe.email}
                  </p>
                )}
              </div>
              <Button
                onClick={() => setIniciarConversa(!iniciarConversa)}
                className="shrink-0"
                size="sm"
              >
                <MessageSquare className="w-4 h-4" />
                Iniciar conversa
              </Button>
            </div>

            {iniciarConversa && (
              <div className="bg-primary/5 border border-primary/20 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-primary">Nova conversa com {detalhe.nome}</p>
                  <button onClick={() => setIniciarConversa(false)} className="p-1 rounded hover:bg-primary/10">
                    <X className="w-4 h-4 text-[var(--color-text-muted)]" />
                  </button>
                </div>
                <textarea
                  value={mensagem}
                  onChange={(e) => setMensagem(e.target.value)}
                  placeholder="Digite a primeira mensagem..."
                  rows={3}
                  className="w-full resize-none rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] px-3 py-2 text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleIniciarConversa(); } }}
                  autoFocus
                />
                <div className="flex justify-end">
                  <Button onClick={handleIniciarConversa} loading={enviando} disabled={!mensagem.trim()}>
                    <Send className="w-4 h-4" /> Enviar
                  </Button>
                </div>
              </div>
            )}

            {detalhe.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {detalhe.tags.map((t) => (
                  <span key={t.id} className="px-2.5 py-1 rounded-full text-xs font-medium text-white" style={{ backgroundColor: t.cor }}>{t.nome}</span>
                ))}
              </div>
            )}

            {detalhe.notas && (
              <div className="bg-[var(--color-surface-elevated)] rounded-lg p-4">
                <h3 className="text-sm font-semibold mb-2">Notas</h3>
                <p className="text-sm text-[var(--color-text-secondary)] whitespace-pre-wrap">{detalhe.notas}</p>
              </div>
            )}

            <div>
              <h3 className="text-sm font-semibold mb-3">Histórico de tickets ({detalhe.historico_tickets?.length || 0})</h3>
              <div className="space-y-2">
                {(detalhe.historico_tickets || []).map((t) => (
                  <div key={t.id} className="p-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)]">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-mono text-[var(--color-text-muted)]">#{t.protocolo}</span>
                      <Badge>{t.status}</Badge>
                    </div>
                    <p className="text-xs text-[var(--color-text-secondary)] mt-1">{t.atendente_nome || 'Sem atendente'} • {formatarDataRelativa(t.criado_em)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <EmptyState icone={Users} titulo="Selecione um contato" descricao="Escolha um contato na lista para ver os detalhes" />
        )}
      </div>
    </div>
  );
}