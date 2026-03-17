// src/pages/QueuesPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Input, Modal, EmptyState, Avatar } from '../components/ui';
import { Inbox, Plus, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function QueuesPage() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [nome, setNome] = useState('');
  const [cor, setCor] = useState('#7C3AED');

  const { data: filas, isLoading } = useQuery({
    queryKey: ['filas'],
    queryFn: () => api.get('/api/queues'),
  });

  const criarMutation = useMutation({
    mutationFn: () => api.post('/api/queues', { nome, cor }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['filas'] });
      setModalAberto(false);
      setNome('');
      toast.success('Fila criada!');
    },
    onError: (err) => toast.error(err.message),
  });

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-semibold">Filas de atendimento</h1>
          <Button onClick={() => setModalAberto(true)}><Plus className="w-4 h-4" /> Nova fila</Button>
        </div>

        <div className="space-y-3">
          {(filas || []).map((fila) => (
            <div key={fila.id} className="p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)]">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-4 h-4 rounded-full" style={{ backgroundColor: fila.cor }} />
                <h3 className="text-sm font-semibold flex-1">{fila.nome}</h3>
                <span className="text-xs text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded">
                  {fila.tickets_pendentes} pendentes
                </span>
                <span className="text-xs text-blue-600 bg-blue-50 dark:bg-blue-900/20 px-2 py-0.5 rounded">
                  {fila.tickets_abertos} abertos
                </span>
              </div>
              {fila.descricao && <p className="text-xs text-[var(--color-text-muted)] mb-3">{fila.descricao}</p>}
              <div className="flex items-center gap-2">
                <Users className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                <span className="text-xs text-[var(--color-text-muted)]">Atendentes:</span>
                <div className="flex -space-x-1.5">
                  {(fila.atendentes || []).slice(0, 5).map((a) => (
                    <Avatar key={a.id} nome={a.nome} src={a.avatar_url} size="sm" online={a.online} />
                  ))}
                </div>
                {(fila.atendentes || []).length === 0 && <span className="text-xs text-[var(--color-text-muted)]">Nenhum</span>}
              </div>
            </div>
          ))}
          {(filas || []).length === 0 && !isLoading && (
            <EmptyState icone={Inbox} titulo="Nenhuma fila" descricao="Crie filas para organizar os atendimentos" />
          )}
        </div>
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Nova fila">
        <div className="space-y-4">
          <Input label="Nome" value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex: Suporte, Vendas..." />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Cor</label>
            <input type="color" value={cor} onChange={(e) => setCor(e.target.value)} className="w-10 h-10 rounded-lg cursor-pointer" />
          </div>
          <Button className="w-full" onClick={() => criarMutation.mutate()} loading={criarMutation.isPending}>Criar fila</Button>
        </div>
      </Modal>
    </div>
  );
}
