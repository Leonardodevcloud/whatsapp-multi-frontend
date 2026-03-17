// src/components/layout/GlobalSearch.jsx
import { useState, useEffect, useRef } from 'react';
import { useTicketStore } from '../../stores/ticketStore';
import { Search, X, MessageSquare, Hash } from 'lucide-react';
import { cn, formatarDataMensagem } from '../../lib/utils';
import api from '../../lib/api';

export default function GlobalSearch() {
  const [aberto, setAberto] = useState(false);
  const [query, setQuery] = useState('');
  const [resultados, setResultados] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const selecionarTicket = useTicketStore((s) => s.selecionarTicket);

  // Ctrl+K para abrir
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setAberto(true);
      }
      if (e.key === 'Escape') {
        setAberto(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Focus input quando abre
  useEffect(() => {
    if (aberto) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
      setResultados([]);
    }
  }, [aberto]);

  // Buscar com debounce
  useEffect(() => {
    if (query.length < 3) { setResultados([]); return; }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await api.get(`/api/tickets/busca-texto?q=${encodeURIComponent(query)}&limite=15`);
        setResultados(data.resultados || []);
      } catch {
        setResultados([]);
      } finally {
        setLoading(false);
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelecionar = (resultado) => {
    selecionarTicket({
      id: resultado.ticket_id,
      protocolo: resultado.protocolo,
      status: resultado.status,
      contato_nome: resultado.contato_nome,
      contato_telefone: resultado.contato_telefone,
    });
    setAberto(false);
  };

  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] animate-fade-in">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setAberto(false)} />

      <div className="relative w-full max-w-lg mx-4 bg-[var(--color-surface)] rounded-2xl shadow-2xl border border-[var(--color-border)] overflow-hidden">
        {/* Input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--color-border)]">
          <Search className="w-5 h-5 text-[var(--color-text-muted)] shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar em todas as mensagens..."
            className="flex-1 bg-transparent text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)] focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center px-1.5 py-0.5 text-2xs font-mono text-[var(--color-text-muted)] bg-[var(--color-surface-elevated)] rounded border border-[var(--color-border)]">
            ESC
          </kbd>
        </div>

        {/* Resultados */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin">
          {loading && (
            <div className="p-4 text-center">
              <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
            </div>
          )}

          {!loading && query.length >= 3 && resultados.length === 0 && (
            <div className="p-6 text-center text-sm text-[var(--color-text-muted)]">
              Nenhum resultado para "{query}"
            </div>
          )}

          {resultados.map((r) => (
            <button
              key={r.id}
              onClick={() => handleSelecionar(r)}
              className="w-full text-left px-4 py-3 hover:bg-[var(--color-surface-elevated)] transition-colors flex items-start gap-3 border-b border-[var(--color-border)] last:border-0"
            >
              <MessageSquare className="w-4 h-4 text-[var(--color-text-muted)] mt-0.5 shrink-0" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium">{r.contato_nome || r.contato_telefone}</span>
                  <span className="text-2xs text-[var(--color-text-muted)] font-mono flex items-center gap-0.5">
                    <Hash className="w-2.5 h-2.5" />{r.protocolo}
                  </span>
                  <span className="text-2xs text-[var(--color-text-muted)] ml-auto">{formatarDataMensagem(r.criado_em)}</span>
                </div>
                <p className="text-xs text-[var(--color-text-secondary)] line-clamp-2">
                  {highlightMatch(r.corpo, query)}
                </p>
              </div>
            </button>
          ))}
        </div>

        {query.length < 3 && (
          <div className="p-4 text-center text-xs text-[var(--color-text-muted)]">
            Digite ao menos 3 caracteres para buscar
          </div>
        )}
      </div>
    </div>
  );
}

function highlightMatch(texto, query) {
  if (!texto || !query) return texto;
  const partes = texto.split(new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi'));
  return partes.map((parte, i) =>
    parte.toLowerCase() === query.toLowerCase()
      ? <mark key={i} className="bg-primary/20 text-primary font-medium rounded px-0.5">{parte}</mark>
      : parte
  );
}
