// src/pages/ContactsPage.jsx
// Redesign: cards grid, abas contatos/grupos, visualizador de histórico, export PDF

import { useState, useRef, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Avatar, Skeleton, EmptyState } from '../components/ui';
import {
  Users, Search, Phone, MessageSquare, MoreVertical, History,
  X, Download, ChevronDown, UsersRound, User, Hash, Clock, Loader2, Send,
} from 'lucide-react';
import { cn, formatarDataMensagem, formatarDataRelativa } from '../lib/utils';
import { useTicketStore } from '../stores/ticketStore';
import toast from 'react-hot-toast';
import api from '../lib/api';

const PAGE_SIZE = 60;

export default function ContactsPage() {
  const [busca, setBusca] = useState('');
  const [aba, setAba] = useState('contato');
  const [historicoAberto, setHistoricoAberto] = useState(null);
  const [todosContatos, setTodosContatos] = useState([]);
  const [totalGeral, setTotalGeral] = useState(0);
  const [temMais, setTemMais] = useState(false);
  const [carregandoMais, setCarregandoMais] = useState(false);
  const navigate = useNavigate();
  const selecionarTicket = useTicketStore((s) => s.selecionarTicket);

  // Primeira página
  const { isLoading } = useQuery({
    queryKey: ['contatos-page', busca, aba],
    queryFn: async () => {
      const res = await api.get(`/api/contacts?busca=${busca}&tipo=${aba}&limite=${PAGE_SIZE}&offset=0`);
      setTodosContatos(res.contatos || []);
      setTotalGeral(res.total || 0);
      setTemMais(res.temMais || false);
      return res;
    },
  });

  // Carregar mais
  const carregarMais = useCallback(async () => {
    if (carregandoMais || !temMais) return;
    setCarregandoMais(true);
    try {
      const res = await api.get(`/api/contacts?busca=${busca}&tipo=${aba}&limite=${PAGE_SIZE}&offset=${todosContatos.length}`);
      setTodosContatos((prev) => [...prev, ...(res.contatos || [])]);
      setTemMais(res.temMais || false);
    } catch { /* ignore */ }
    finally { setCarregandoMais(false); }
  }, [busca, aba, todosContatos.length, temMais, carregandoMais]);

  const exibidos = todosContatos.length;

  return (
    <div className="h-full flex flex-col bg-[var(--color-bg)]">
      {/* Header fixo */}
      <div className="shrink-0 px-6 pt-6 pb-4 bg-[var(--color-surface)] border-b border-[var(--color-border)]">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-xl font-display font-semibold mb-4">Contatos</h1>

          <div className="flex items-center gap-4">
            {/* Busca */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--color-text-muted)]" />
              <input
                type="text"
                placeholder="Buscar por nome ou telefone..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="w-full h-10 pl-10 pr-4 rounded-xl bg-[var(--color-surface-elevated)] text-sm placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-primary/30 border-0"
              />
              {busca && (
                <button onClick={() => setBusca('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-[var(--color-border)]">
                  <X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                </button>
              )}
            </div>

            {/* Abas */}
            <div className="flex bg-[var(--color-surface-elevated)] rounded-xl p-1 gap-1">
              <button
                onClick={() => setAba('contato')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  aba === 'contato' ? 'bg-primary/15 text-primary shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                )}
              >
                <User className="w-4 h-4" />
                Contatos
              </button>
              <button
                onClick={() => setAba('grupo')}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all',
                  aba === 'grupo' ? 'bg-primary/15 text-primary shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]'
                )}
              >
                <UsersRound className="w-4 h-4" />
                Grupos
              </button>
            </div>

            {/* Contador real */}
            <span className="text-sm text-[var(--color-text-muted)] whitespace-nowrap">
              {exibidos} de {totalGeral.toLocaleString('pt-BR')} {aba === 'grupo' ? 'grupos' : 'contatos'}
            </span>
          </div>
        </div>
      </div>

      {/* Grid de cards */}
      <div className="flex-1 overflow-y-auto scrollbar-thin px-6 py-5">
        <div className="max-w-6xl mx-auto">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="h-32 rounded-xl bg-[var(--color-surface)] animate-pulse" />
              ))}
            </div>
          ) : todosContatos.length === 0 ? (
            <div className="flex items-center justify-center py-20">
              <EmptyState
                icone={aba === 'grupo' ? UsersRound : Users}
                titulo={busca ? 'Nenhum resultado' : aba === 'grupo' ? 'Nenhum grupo' : 'Nenhum contato'}
                descricao={busca ? 'Tente outro termo de busca' : 'Contatos serão criados automaticamente ao receberem mensagens'}
              />
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {todosContatos.map((c) => (
                  <ContatoCard
                    key={c.id}
                    contato={c}
                    isGrupo={aba === 'grupo'}
                    onVerHistorico={() => setHistoricoAberto(c)}
                    onIniciarConversa={async () => {
                      try {
                        const ticket = await api.post('/api/tickets/criar-para-contato', { contato_id: c.id });
                        selecionarTicket(ticket);
                        navigate('/tickets');
                        toast.success('Conversa iniciada');
                      } catch (err) {
                        toast.error(err.message || 'Erro ao iniciar conversa');
                      }
                    }}
                  />
                ))}
              </div>

              {/* Carregar mais */}
              {temMais && (
                <div className="flex justify-center mt-6 pb-4">
                  <button
                    onClick={carregarMais}
                    disabled={carregandoMais}
                    className="h-10 px-6 rounded-xl border border-[var(--color-border)] text-sm font-medium text-[var(--color-text-secondary)] hover:bg-[var(--color-surface-elevated)] hover:border-primary/30 transition-all disabled:opacity-50 flex items-center gap-2"
                  >
                    {carregandoMais ? (
                      <><Loader2 className="w-4 h-4 animate-spin" /> Carregando...</>
                    ) : (
                      <>Carregar mais ({totalGeral - exibidos} restantes)</>
                    )}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Modal Histórico — fullscreen overlay */}
      {historicoAberto && (
        <HistoricoModal
          contato={historicoAberto}
          onFechar={() => setHistoricoAberto(null)}
        />
      )}
    </div>
  );
}

// ============================================================
// CARD DO CONTATO
// ============================================================
function ContatoCard({ contato, isGrupo, onVerHistorico, onIniciarConversa }) {
  const [menuAberto, setMenuAberto] = useState(false);
  const totalChamados = parseInt(contato.total_chamados || 0);

  return (
    <div className="relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4 hover:border-primary/30 hover:shadow-md transition-all group">
      {/* Header — avatar + nome */}
      <div className="flex items-start gap-3 mb-3">
        <Avatar nome={contato.nome} src={contato.avatar_url} size="md" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold truncate text-[var(--color-text)]">{contato.nome || contato.telefone}</p>
          <p className="text-xs text-[var(--color-text-muted)] truncate flex items-center gap-1 mt-0.5">
            {isGrupo ? <UsersRound className="w-3 h-3 shrink-0" /> : <Phone className="w-3 h-3 shrink-0" />}
            {contato.telefone}
          </p>
        </div>

        {/* Menu 3 pontinhos */}
        <div className="relative">
          <button
            onClick={() => setMenuAberto(!menuAberto)}
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] opacity-0 group-hover:opacity-100 hover:bg-[var(--color-surface-elevated)] transition-all"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuAberto && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setMenuAberto(false)} />
              <div className="absolute right-0 top-8 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl shadow-xl z-50 py-1.5 min-w-[180px]">
                <button
                  onClick={() => { onIniciarConversa(); setMenuAberto(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-surface-elevated)] flex items-center gap-2.5 transition-colors"
                >
                  <Send className="w-3.5 h-3.5 text-emerald-500" />
                  Iniciar conversa
                </button>
                <button
                  onClick={() => { onVerHistorico(); setMenuAberto(false); }}
                  className="w-full text-left px-3 py-2 text-xs hover:bg-[var(--color-surface-elevated)] flex items-center gap-2.5 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-primary" />
                  Ver histórico de conversas
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-3 text-xs text-[var(--color-text-muted)]">
        <span className={cn(
          'flex items-center gap-1 px-2 py-1 rounded-md font-medium',
          totalChamados > 0 ? 'bg-primary/10 text-primary' : 'bg-[var(--color-surface-elevated)]'
        )}>
          <MessageSquare className="w-3 h-3" />
          {totalChamados} {totalChamados === 1 ? 'chamado' : 'chamados'}
        </span>

        {contato.ultimo_contato && (
          <span className="flex items-center gap-1 truncate">
            <Clock className="w-3 h-3 shrink-0" />
            {formatarDataRelativa(contato.ultimo_contato)}
          </span>
        )}
      </div>

      {/* Tags */}
      {contato.tags && contato.tags.length > 0 && contato.tags[0] !== null && (
        <div className="flex flex-wrap gap-1 mt-2.5">
          {(Array.isArray(contato.tags) ? contato.tags : []).filter(Boolean).slice(0, 3).map((t) => (
            <span key={t.id} className="px-2 py-0.5 rounded-full text-2xs font-medium text-white" style={{ backgroundColor: t.cor }}>
              {t.nome}
            </span>
          ))}
        </div>
      )}

      {/* Click area — card inteiro abre histórico */}
      <button
        onClick={onVerHistorico}
        className="absolute inset-0 rounded-xl z-0"
        aria-label={`Ver histórico de ${contato.nome}`}
      />
    </div>
  );
}

// ============================================================
// MODAL DE HISTÓRICO — visualizador read-only + export
// ============================================================
function HistoricoModal({ contato, onFechar }) {
  const chatRef = useRef(null);

  const { data: detalhes } = useQuery({
    queryKey: ['contato-detalhe', contato.id],
    queryFn: () => api.get(`/api/contacts/${contato.id}`),
  });

  const { data: historicoData, isLoading } = useQuery({
    queryKey: ['contato-historico', contato.id],
    queryFn: () => api.get(`/api/contacts/${contato.id}/historico?limite=500`),
  });

  const mensagens = historicoData?.mensagens || [];
  const tickets = detalhes?.historico_tickets || [];

  // Agrupar mensagens por ticket
  const msgsPorTicket = {};
  mensagens.forEach((m) => {
    if (!msgsPorTicket[m.ticket_id]) msgsPorTicket[m.ticket_id] = [];
    msgsPorTicket[m.ticket_id].push(m);
  });

  // Exportar como texto pra download
  const handleExportarTexto = () => {
    let conteudo = `HISTÓRICO DE CONVERSAS\n`;
    conteudo += `Contato: ${contato.nome || contato.telefone}\n`;
    conteudo += `Telefone: ${contato.telefone}\n`;
    conteudo += `Exportado em: ${new Date().toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}\n`;
    conteudo += `${'='.repeat(60)}\n\n`;

    tickets.forEach((t) => {
      conteudo += `--- Chamado #${t.protocolo} (${t.status}) ---\n`;
      conteudo += `Aberto: ${new Date(t.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}\n`;
      if (t.atendente_nome) conteudo += `Atendente: ${t.atendente_nome}\n`;
      conteudo += `\n`;

      const msgs = msgsPorTicket[t.id] || [];
      msgs.forEach((m) => {
        const hora = new Date(m.criado_em).toLocaleString('pt-BR', { timeZone: 'America/Bahia', hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
        const quem = m.tipo === 'sistema' ? '[SISTEMA]' : m.is_from_me ? `[${m.usuario_nome || 'Atendente'}]` : `[${contato.nome || 'Cliente'}]`;
        const corpo = m.tipo === 'imagem' ? '📷 Imagem' : m.tipo === 'audio' ? '🎵 Áudio' : m.tipo === 'video' ? '🎥 Vídeo' : m.tipo === 'sticker' ? '🎭 Sticker' : m.corpo || '';
        conteudo += `${hora} ${quem} ${corpo}\n`;
      });
      conteudo += `\n`;
    });

    const blob = new Blob([conteudo], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `historico-${(contato.nome || contato.telefone).replace(/[^a-zA-Z0-9]/g, '_')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Imprimir pra PDF (Ctrl+P no browser)
  const handleImprimirPDF = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    let html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Histórico - ${contato.nome || contato.telefone}</title>
    <style>
      body { font-family: 'Segoe UI', sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; color: #333; font-size: 13px; }
      h1 { font-size: 18px; border-bottom: 2px solid #7c3aed; padding-bottom: 8px; color: #7c3aed; }
      h2 { font-size: 14px; margin-top: 24px; color: #666; border-bottom: 1px solid #eee; padding-bottom: 4px; }
      .info { color: #888; font-size: 12px; margin-bottom: 16px; }
      .msg { margin: 4px 0; padding: 6px 10px; border-radius: 8px; }
      .msg-enviada { background: #f3f0ff; margin-left: 40px; }
      .msg-recebida { background: #f8f8f8; margin-right: 40px; }
      .msg-sistema { text-align: center; color: #999; font-size: 11px; font-style: italic; }
      .hora { color: #999; font-size: 10px; }
      .autor { font-weight: 600; font-size: 11px; color: #7c3aed; }
      @media print { body { padding: 0; } }
    </style></head><body>`;

    html += `<h1>${contato.nome || contato.telefone}</h1>`;
    html += `<div class="info">Telefone: ${contato.telefone} • Exportado: ${new Date().toLocaleString('pt-BR')}</div>`;

    tickets.forEach((t) => {
      html += `<h2>#${t.protocolo} — ${t.status}${t.atendente_nome ? ` • ${t.atendente_nome}` : ''}</h2>`;
      const msgs = msgsPorTicket[t.id] || [];
      msgs.forEach((m) => {
        const hora = new Date(m.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        if (m.tipo === 'sistema') {
          html += `<div class="msg msg-sistema">${m.corpo} <span class="hora">${hora}</span></div>`;
        } else {
          const cls = m.is_from_me ? 'msg-enviada' : 'msg-recebida';
          const autor = m.is_from_me ? (m.usuario_nome || 'Atendente') : (contato.nome || 'Cliente');
          const corpo = m.tipo === 'imagem' ? '📷 Imagem' : m.tipo === 'audio' ? '🎵 Áudio' : m.tipo === 'video' ? '🎥 Vídeo' : m.tipo === 'sticker' ? '🎭 Sticker' : (m.corpo || '');
          html += `<div class="msg ${cls}"><span class="autor">${autor}</span> <span class="hora">${hora}</span><br/>${corpo}</div>`;
        }
      });
    });

    html += `</body></html>`;
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center" onClick={onFechar}>
      <div className="bg-[var(--color-bg)] rounded-2xl shadow-2xl w-[700px] max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="shrink-0 px-6 py-4 border-b border-[var(--color-border)] bg-[var(--color-surface)] rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <Avatar nome={contato.nome} src={contato.avatar_url} size="md" />
            <div className="min-w-0">
              <h2 className="text-sm font-semibold truncate">{contato.nome || contato.telefone}</h2>
              <p className="text-xs text-[var(--color-text-muted)]">{contato.telefone} • {mensagens.length} mensagens • {tickets.length} chamados</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleExportarTexto} title="Baixar como texto"
              className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 border border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] transition-colors">
              <Download className="w-3.5 h-3.5" /> TXT
            </button>
            <button onClick={handleImprimirPDF} title="Imprimir / Salvar como PDF"
              className="h-8 px-3 rounded-lg text-xs font-medium flex items-center gap-1.5 bg-primary text-white hover:bg-primary/90 transition-colors">
              <Download className="w-3.5 h-3.5" /> PDF
            </button>
            <button onClick={onFechar} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-[var(--color-surface-elevated)]">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Chat read-only */}
        <div ref={chatRef} className="flex-1 overflow-y-auto scrollbar-thin px-6 py-4 space-y-1">
          {isLoading ? (
            <div className="space-y-3 py-8">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-start' : 'justify-end')}>
                  <div className={cn('h-10 rounded-2xl bg-[var(--color-surface)] animate-pulse', i % 2 === 0 ? 'w-64' : 'w-48')} />
                </div>
              ))}
            </div>
          ) : mensagens.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <MessageSquare className="w-10 h-10 text-[var(--color-text-muted)] mb-3" />
              <p className="text-sm text-[var(--color-text-muted)]">Nenhuma mensagem encontrada</p>
            </div>
          ) : (
            <>
              {/* Renderizar mensagens agrupadas por ticket */}
              {tickets.map((t) => {
                const msgs = msgsPorTicket[t.id] || [];
                if (msgs.length === 0) return null;
                return (
                  <div key={t.id}>
                    {/* Separador de ticket */}
                    <div className="flex items-center gap-3 py-3">
                      <div className="flex-1 h-px bg-[var(--color-border)]" />
                      <span className="text-2xs font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-3 py-1 rounded-full flex items-center gap-1.5">
                        <Hash className="w-3 h-3" />
                        {t.protocolo}
                        <span className={cn(
                          'ml-1 px-1.5 py-0.5 rounded text-2xs font-medium',
                          t.status === 'resolvido' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                          t.status === 'aberto' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                          'bg-[var(--color-surface)] text-[var(--color-text-muted)]'
                        )}>
                          {t.status}
                        </span>
                      </span>
                      <div className="flex-1 h-px bg-[var(--color-border)]" />
                    </div>

                    {msgs.map((msg) => (
                      <MsgReadOnly key={msg.id} msg={msg} nomeContato={contato.nome} />
                    ))}
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MENSAGEM READ-ONLY
// ============================================================
function MsgReadOnly({ msg, nomeContato }) {
  const { tipo, corpo, is_from_me, is_internal, criado_em, usuario_nome, nome_participante, media_url, deletada } = msg;

  if (tipo === 'sistema') {
    return (
      <div className="flex justify-center py-2">
        <span className="text-2xs text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] px-3 py-1 rounded-full">{corpo}</span>
      </div>
    );
  }

  if (is_internal) {
    return (
      <div className="flex justify-end py-0.5">
        <div className="max-w-[70%] rounded-2xl rounded-br-md px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <span className="text-2xs font-medium text-amber-600">Nota — {usuario_nome}</span>
          <p className="text-xs text-amber-900 dark:text-amber-200 mt-0.5">{corpo}</p>
          <span className="text-2xs text-amber-400 block text-right mt-1">{formatarDataMensagem(criado_em)}</span>
        </div>
      </div>
    );
  }

  const enviada = is_from_me;

  // Corpo formatado
  let conteudoVisual = corpo || '';
  if (deletada) conteudoVisual = '🚫 Mensagem apagada';
  else if (tipo === 'imagem') conteudoVisual = media_url ? '📷 Imagem' : corpo || '📷 Imagem';
  else if (tipo === 'audio') conteudoVisual = '🎵 Áudio';
  else if (tipo === 'video') conteudoVisual = '🎥 Vídeo';
  else if (tipo === 'sticker') conteudoVisual = '🎭 Sticker';
  else if (tipo === 'documento') conteudoVisual = corpo || '📄 Documento';
  else if (tipo === 'localizacao') conteudoVisual = '📍 Localização';
  else if (tipo === 'contato') conteudoVisual = corpo || '👤 Contato';

  return (
    <div className={cn('flex py-0.5', enviada ? 'justify-end' : 'justify-start')}>
      <div className={cn(
        'max-w-[70%] rounded-2xl px-3 py-2',
        enviada
          ? 'bg-primary/10 text-[var(--color-text)] rounded-br-md'
          : 'bg-[var(--color-surface-elevated)] text-[var(--color-text)] rounded-bl-md'
      )}>
        {!enviada && (nome_participante || nomeContato) && (
          <span className="text-2xs font-medium text-primary block mb-0.5">{nome_participante || nomeContato}</span>
        )}

        {/* Imagem preview */}
        {tipo === 'imagem' && media_url && (
          <img src={media_url} alt="" className="max-w-full max-h-40 rounded-lg mb-1 object-cover" loading="lazy" onError={(e) => { e.target.style.display = 'none'; }} />
        )}

        <p className={cn('text-xs whitespace-pre-wrap break-words', deletada && 'italic text-[var(--color-text-muted)]')}>
          {conteudoVisual}
        </p>
        <span className="text-2xs text-[var(--color-text-muted)] block text-right mt-0.5">{formatarDataMensagem(criado_em)}</span>
      </div>
    </div>
  );
}
