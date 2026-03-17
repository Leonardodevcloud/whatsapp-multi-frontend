// src/pages/QuickRepliesPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, EmptyState } from '../components/ui';
import { BookOpen, Plus, Trash2, Edit3 } from 'lucide-react';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function QuickRepliesPage() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ atalho: '', titulo: '', corpo: '' });

  const { data: respostas } = useQuery({
    queryKey: ['respostas-rapidas'],
    queryFn: () => api.get('/api/quick-replies'),
  });

  const criarMutation = useMutation({
    mutationFn: () => api.post('/api/quick-replies', form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['respostas-rapidas'] });
      setModalAberto(false);
      setForm({ atalho: '', titulo: '', corpo: '' });
      toast.success('Resposta rápida criada!');
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

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-semibold">Respostas rápidas</h1>
          <Button onClick={() => setModalAberto(true)}><Plus className="w-4 h-4" /> Nova resposta</Button>
        </div>

        <div className="space-y-2">
          {(respostas || []).map((r) => (
            <div key={r.id} className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <code className="text-xs font-mono text-primary bg-primary/10 px-2 py-0.5 rounded">{r.atalho}</code>
                    <span className="text-sm font-medium">{r.titulo}</span>
                  </div>
                  <p className="text-xs text-[var(--color-text-secondary)] whitespace-pre-wrap line-clamp-3">{r.corpo}</p>
                </div>
                <button
                  onClick={() => deletarMutation.mutate(r.id)}
                  className="p-2 rounded-lg hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors ml-2"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
          {(respostas || []).length === 0 && (
            <EmptyState icone={BookOpen} titulo="Nenhuma resposta rápida" descricao="Crie atalhos para agilizar o atendimento" />
          )}
        </div>
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Nova resposta rápida">
        <div className="space-y-3">
          <Input label="Atalho" placeholder="/saudacao" value={form.atalho} onChange={(e) => setForm({ ...form, atalho: e.target.value })} />
          <Input label="Título" placeholder="Saudação inicial" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} />
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
          <Button className="w-full" onClick={() => criarMutation.mutate()} loading={criarMutation.isPending}>Criar</Button>
        </div>
      </Modal>
    </div>
  );
}
