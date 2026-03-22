// src/pages/IAConfigPage.jsx
// Configuração da IA — Instruções, Conhecimento, Exemplos, Tags

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Brain, BookOpen, MessageSquare, Tag, Plus, Trash2, Check, X, Edit3,
  RefreshCw, Sparkles, ChevronDown, ChevronUp, ToggleLeft, ToggleRight,
  AlertCircle, CheckCircle2, Clock, Zap,
} from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import toast from 'react-hot-toast';

// ============================================================
// METRIC CARD
// ============================================================
function MetricCard({ label, valor, icon: Icon, cor }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-1">
        <span className="text-2xs text-[var(--color-text-muted)] font-medium">{label}</span>
        <Icon className={cn('w-4 h-4', cor || 'text-primary')} />
      </div>
      <p className="text-xl font-semibold text-[var(--color-text)]">{valor}</p>
    </div>
  );
}

// ============================================================
// TAB: INSTRUÇÕES
// ============================================================
function TabInstrucoes() {
  const qc = useQueryClient();
  const { data: instrucoes = [], isLoading } = useQuery({ queryKey: ['ia-instrucoes'], queryFn: () => api.get('/api/ia/instrucoes') });
  const [editando, setEditando] = useState(null);
  const [novo, setNovo] = useState(false);
  const [form, setForm] = useState({ titulo: '', conteudo: '', ordem: 0 });

  const salvar = useMutation({
    mutationFn: (d) => editando ? api.put(`/api/ia/instrucoes/${editando}`, d) : api.post('/api/ia/instrucoes', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-instrucoes'] }); setEditando(null); setNovo(false); setForm({ titulo: '', conteudo: '', ordem: 0 }); toast.success('Salvo'); },
    onError: (e) => toast.error(e.message),
  });

  const deletar = useMutation({
    mutationFn: (id) => api.delete(`/api/ia/instrucoes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-instrucoes'] }); toast.success('Removido'); },
  });

  const toggleAtivo = useMutation({
    mutationFn: ({ id, ativo }) => api.put(`/api/ia/instrucoes/${id}`, { ativo }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ia-instrucoes'] }),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Instruções gerais</h3>
          <p className="text-2xs text-[var(--color-text-muted)]">Tom de voz, regras, persona da IA</p>
        </div>
        <button onClick={() => { setNovo(true); setEditando(null); setForm({ titulo: '', conteudo: '', ordem: 0 }); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Nova instrução
        </button>
      </div>

      {(novo || editando) && (
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl p-4 mb-4 space-y-3">
          <input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Título (ex: Tom de voz)"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          <textarea value={form.conteudo} onChange={(e) => setForm({ ...form, conteudo: e.target.value })} placeholder="Instruções para a IA (ex: Sempre cumprimente o cliente pelo nome. Nunca prometa prazos.)" rows={4}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={() => salvar.mutate(form)} disabled={!form.titulo || !form.conteudo}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50">Salvar</button>
            <button onClick={() => { setNovo(false); setEditando(null); }}
              className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-elevated)]">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? <p className="text-sm text-[var(--color-text-muted)] py-4">Carregando...</p> :
          instrucoes.length === 0 ? <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">Nenhuma instrução cadastrada</p> :
          instrucoes.map((i) => (
            <div key={i.id} className={cn('border border-[var(--color-border)] rounded-xl p-4 transition-colors', i.ativo ? 'bg-[var(--color-surface)]' : 'bg-[var(--color-surface)] opacity-50')}>
              <div className="flex items-start gap-3">
                <button onClick={() => toggleAtivo.mutate({ id: i.id, ativo: !i.ativo })} className="mt-0.5 shrink-0">
                  {i.ativo ? <ToggleRight className="w-5 h-5 text-primary" /> : <ToggleLeft className="w-5 h-5 text-[var(--color-text-muted)]" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text)]">{i.titulo}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 whitespace-pre-wrap">{i.conteudo}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditando(i.id); setNovo(false); setForm({ titulo: i.titulo, conteudo: i.conteudo, ordem: i.ordem }); }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)]"><Edit3 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /></button>
                  <button onClick={() => { if (confirm('Remover instrução?')) deletar.mutate(i.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ============================================================
// TAB: CONHECIMENTO
// ============================================================
function TabConhecimento() {
  const qc = useQueryClient();
  const { data: itens = [], isLoading } = useQuery({ queryKey: ['ia-conhecimento'], queryFn: () => api.get('/api/ia/conhecimento') });
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ categoria: '', pergunta: '', resposta: '' });

  const salvar = useMutation({
    mutationFn: (d) => editando ? api.put(`/api/ia/conhecimento/${editando}`, d) : api.post('/api/ia/conhecimento', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-conhecimento'] }); setEditando(null); setNovo(false); setForm({ categoria: '', pergunta: '', resposta: '' }); toast.success('Salvo'); },
    onError: (e) => toast.error(e.message),
  });

  const deletar = useMutation({
    mutationFn: (id) => api.delete(`/api/ia/conhecimento/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-conhecimento'] }); toast.success('Removido'); },
  });

  const categorias = [...new Set(itens.map(i => i.categoria).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Base de conhecimento</h3>
          <p className="text-2xs text-[var(--color-text-muted)]">FAQ, produtos, procedimentos que a IA deve saber</p>
        </div>
        <button onClick={() => { setNovo(true); setEditando(null); setForm({ categoria: '', pergunta: '', resposta: '' }); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Novo item
        </button>
      </div>

      {(novo || editando) && (
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl p-4 mb-4 space-y-3">
          <input value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} placeholder="Categoria (ex: Trocas, Frete, Pagamento)"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" list="categorias-list" />
          <datalist id="categorias-list">{categorias.map(c => <option key={c} value={c} />)}</datalist>
          <input value={form.pergunta} onChange={(e) => setForm({ ...form, pergunta: e.target.value })} placeholder="Pergunta do contato (ex: Qual o prazo de troca?)"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          <textarea value={form.resposta} onChange={(e) => setForm({ ...form, resposta: e.target.value })} placeholder="Resposta correta (ex: O prazo de troca é de 7 dias corridos.)" rows={3}
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary resize-none" />
          <div className="flex gap-2">
            <button onClick={() => salvar.mutate(form)} disabled={!form.pergunta || !form.resposta}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50">Salvar</button>
            <button onClick={() => { setNovo(false); setEditando(null); }}
              className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-elevated)]">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? <p className="text-sm text-[var(--color-text-muted)] py-4">Carregando...</p> :
          itens.length === 0 ? <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">Nenhum item na base de conhecimento</p> :
          itens.map((i) => (
            <div key={i.id} className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface)]">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  {i.categoria && <span className="text-2xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary mb-1 inline-block">{i.categoria}</span>}
                  <p className="text-sm font-medium text-[var(--color-text)]">P: {i.pergunta}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1">R: {i.resposta}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditando(i.id); setNovo(false); setForm({ categoria: i.categoria || '', pergunta: i.pergunta, resposta: i.resposta }); }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)]"><Edit3 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /></button>
                  <button onClick={() => { if (confirm('Remover?')) deletar.mutate(i.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ============================================================
// TAB: EXEMPLOS APRENDIDOS
// ============================================================
function TabExemplos() {
  const qc = useQueryClient();
  const [filtro, setFiltro] = useState('pendentes');
  const { data: exemplos = [], isLoading } = useQuery({
    queryKey: ['ia-exemplos', filtro],
    queryFn: () => {
      const params = filtro === 'pendentes' ? '?aprovado=false' : filtro === 'aprovados' ? '?aprovado=true' : '';
      return api.get(`/api/ia/exemplos${params}`);
    },
  });

  const aprovar = useMutation({
    mutationFn: (id) => api.put(`/api/ia/exemplos/${id}/aprovar`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-exemplos'] }); toast.success('Aprovado'); },
  });

  const rejeitar = useMutation({
    mutationFn: (id) => api.put(`/api/ia/exemplos/${id}/rejeitar`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-exemplos'] }); toast.success('Rejeitado'); },
  });

  const deletar = useMutation({
    mutationFn: (id) => api.delete(`/api/ia/exemplos/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-exemplos'] }); toast.success('Removido'); },
  });

  const aprenderAgora = useMutation({
    mutationFn: () => api.post('/api/ia/aprender-agora'),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-exemplos'] }); toast.success('Aprendizado executado'); },
    onError: (e) => toast.error(e.message),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Exemplos aprendidos</h3>
          <p className="text-2xs text-[var(--color-text-muted)]">Pares pergunta/resposta extraídos de tickets fechados</p>
        </div>
        <button onClick={() => aprenderAgora.mutate()} disabled={aprenderAgora.isPending}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20">
          <Zap className="w-3.5 h-3.5" /> {aprenderAgora.isPending ? 'Processando...' : 'Aprender agora'}
        </button>
      </div>

      <div className="flex gap-2 mb-4">
        {[{ k: 'pendentes', l: 'Pendentes', icon: Clock }, { k: 'aprovados', l: 'Aprovados', icon: CheckCircle2 }, { k: 'todos', l: 'Todos', icon: MessageSquare }].map(({ k, l, icon: Ic }) => (
          <button key={k} onClick={() => setFiltro(k)}
            className={cn('flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors',
              filtro === k ? 'bg-primary text-white' : 'bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>
            <Ic className="w-3.5 h-3.5" /> {l}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {isLoading ? <p className="text-sm text-[var(--color-text-muted)] py-4">Carregando...</p> :
          exemplos.length === 0 ? <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">{filtro === 'pendentes' ? 'Nenhum exemplo pendente' : 'Nenhum exemplo encontrado'}</p> :
          exemplos.map((e) => (
            <div key={e.id} className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface)]">
              <div className="flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    {e.tag && <span className="text-2xs font-medium px-2 py-0.5 rounded bg-primary/10 text-primary">{e.tag}</span>}
                    <span className="text-2xs text-[var(--color-text-muted)]">Qualidade: {'★'.repeat(e.qualidade)}{'☆'.repeat(5 - e.qualidade)}</span>
                    <span className="text-2xs text-[var(--color-text-muted)]">{e.origem === 'auto' ? 'Automático' : 'Manual'}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]"><span className="font-medium text-[var(--color-text)]">Contato:</span> {e.pergunta_contato}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1"><span className="font-medium text-[var(--color-text)]">Resposta:</span> {e.resposta_atendente}</p>
                </div>
                <div className="flex gap-1 shrink-0">
                  {!e.aprovado && !e.rejeitado && (
                    <>
                      <button onClick={() => aprovar.mutate(e.id)} title="Aprovar"
                        className="p-1.5 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-900/10"><Check className="w-4 h-4 text-emerald-500" /></button>
                      <button onClick={() => rejeitar.mutate(e.id)} title="Rejeitar"
                        className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"><X className="w-4 h-4 text-red-500" /></button>
                    </>
                  )}
                  {e.aprovado && <span className="text-2xs text-emerald-500 font-medium px-2 py-1">Aprovado</span>}
                  {e.rejeitado && <span className="text-2xs text-red-500 font-medium px-2 py-1">Rejeitado</span>}
                  <button onClick={() => { if (confirm('Remover exemplo?')) deletar.mutate(e.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ============================================================
// TAB: REGRAS DE TAGS
// ============================================================
function TabTagsRegras() {
  const qc = useQueryClient();
  const { data: regras = [], isLoading } = useQuery({ queryKey: ['ia-tags-regras'], queryFn: () => api.get('/api/ia/tags-regras') });
  const [novo, setNovo] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ tag: '', palavras_chave: '', descricao: '', cor: '#7c3aed' });

  const salvar = useMutation({
    mutationFn: (d) => editando ? api.put(`/api/ia/tags-regras/${editando}`, d) : api.post('/api/ia/tags-regras', d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-tags-regras'] }); setEditando(null); setNovo(false); setForm({ tag: '', palavras_chave: '', descricao: '', cor: '#7c3aed' }); toast.success('Salvo'); },
    onError: (e) => toast.error(e.message),
  });

  const deletar = useMutation({
    mutationFn: (id) => api.delete(`/api/ia/tags-regras/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ia-tags-regras'] }); toast.success('Removido'); },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-[var(--color-text)]">Regras de classificação</h3>
          <p className="text-2xs text-[var(--color-text-muted)]">A IA usa essas regras para sugerir tags automaticamente</p>
        </div>
        <button onClick={() => { setNovo(true); setEditando(null); setForm({ tag: '', palavras_chave: '', descricao: '', cor: '#7c3aed' }); }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90">
          <Plus className="w-3.5 h-3.5" /> Nova regra
        </button>
      </div>

      {(novo || editando) && (
        <div className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-xl p-4 mb-4 space-y-3">
          <div className="flex gap-3">
            <input value={form.tag} onChange={(e) => setForm({ ...form, tag: e.target.value })} placeholder="Nome da tag (ex: Troca/Devolução)"
              className="flex-1 bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
            <input type="color" value={form.cor} onChange={(e) => setForm({ ...form, cor: e.target.value })}
              className="w-10 h-10 rounded-lg border border-[var(--color-border)] cursor-pointer" />
          </div>
          <input value={form.palavras_chave} onChange={(e) => setForm({ ...form, palavras_chave: e.target.value })} placeholder="Palavras-chave (separadas por vírgula: troca, defeito, garantia, devolver)"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          <input value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="Descrição (ex: Cliente quer trocar ou devolver produto)"
            className="w-full bg-[var(--color-surface)] border border-[var(--color-border)] rounded-lg px-3 py-2 text-sm outline-none focus:border-primary" />
          <div className="flex gap-2">
            <button onClick={() => salvar.mutate(form)} disabled={!form.tag || !form.palavras_chave}
              className="px-4 py-1.5 rounded-lg bg-primary text-white text-xs font-medium hover:bg-primary/90 disabled:opacity-50">Salvar</button>
            <button onClick={() => { setNovo(false); setEditando(null); }}
              className="px-4 py-1.5 rounded-lg border border-[var(--color-border)] text-xs font-medium hover:bg-[var(--color-surface-elevated)]">Cancelar</button>
          </div>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? <p className="text-sm text-[var(--color-text-muted)] py-4">Carregando...</p> :
          regras.length === 0 ? <p className="text-sm text-[var(--color-text-muted)] py-8 text-center">Nenhuma regra cadastrada</p> :
          regras.map((r) => (
            <div key={r.id} className="border border-[var(--color-border)] rounded-xl p-4 bg-[var(--color-surface)]">
              <div className="flex items-start gap-3">
                <div className="w-3 h-3 rounded-full shrink-0 mt-1" style={{ background: r.cor }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-[var(--color-text)]">{r.tag}</span>
                    <span className="text-2xs text-[var(--color-text-muted)]">{r.acertos} acerto(s)</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)]">{r.descricao}</p>
                  <div className="flex flex-wrap gap-1 mt-1.5">
                    {r.palavras_chave.split(',').map((p, i) => (
                      <span key={i} className="text-2xs px-1.5 py-0.5 rounded bg-[var(--color-surface-elevated)] text-[var(--color-text-muted)]">{p.trim()}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => { setEditando(r.id); setNovo(false); setForm({ tag: r.tag, palavras_chave: r.palavras_chave, descricao: r.descricao || '', cor: r.cor || '#7c3aed' }); }}
                    className="p-1.5 rounded-lg hover:bg-[var(--color-surface-elevated)]"><Edit3 className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /></button>
                  <button onClick={() => { if (confirm('Remover regra?')) deletar.mutate(r.id); }}
                    className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/10"><Trash2 className="w-3.5 h-3.5 text-red-500" /></button>
                </div>
              </div>
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function IAConfigPage() {
  const [tab, setTab] = useState('instrucoes');
  const { data: stats } = useQuery({ queryKey: ['ia-stats'], queryFn: () => api.get('/api/ia/stats'), refetchInterval: 30000 });

  const tabs = [
    { k: 'instrucoes', l: 'Instruções', icon: Brain, desc: 'Tom e regras' },
    { k: 'conhecimento', l: 'Conhecimento', icon: BookOpen, desc: 'FAQ e info' },
    { k: 'exemplos', l: 'Exemplos', icon: MessageSquare, desc: 'Aprendidos' },
    { k: 'tags', l: 'Tags', icon: Tag, desc: 'Classificação' },
  ];

  return (
    <div className="h-full overflow-y-auto p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-[var(--color-text)]">Inteligência artificial</h1>
            <p className="text-xs text-[var(--color-text-muted)]">Configure e treine a IA do Synapse Chat</p>
          </div>
          {stats && !stats.api_configurada && (
            <div className="ml-auto flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-50 dark:bg-amber-900/20 text-amber-600 text-xs">
              <AlertCircle className="w-4 h-4" /> GEMINI_API_KEY não configurada
            </div>
          )}
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
            <MetricCard label="Instruções" valor={stats.instrucoes} icon={Brain} cor="text-primary" />
            <MetricCard label="Conhecimento" valor={stats.conhecimento} icon={BookOpen} cor="text-blue-500" />
            <MetricCard label="Exemplos aprovados" valor={stats.exemplos_aprovados} icon={CheckCircle2} cor="text-emerald-500" />
            <MetricCard label="Pendentes" valor={stats.exemplos_pendentes} icon={Clock} cor="text-amber-500" />
            <MetricCard label="Regras de tags" valor={stats.tags_regras} icon={Tag} cor="text-purple-500" />
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 p-1 bg-[var(--color-surface-elevated)] rounded-xl">
          {tabs.map(({ k, l, icon: Ic, desc }) => (
            <button key={k} onClick={() => setTab(k)}
              className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-medium transition-all',
                tab === k ? 'bg-[var(--color-surface)] text-[var(--color-text)] shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>
              <Ic className="w-4 h-4" />
              <span className="hidden sm:inline">{l}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'instrucoes' && <TabInstrucoes />}
        {tab === 'conhecimento' && <TabConhecimento />}
        {tab === 'exemplos' && <TabExemplos />}
        {tab === 'tags' && <TabTagsRegras />}
      </div>
    </div>
  );
}
