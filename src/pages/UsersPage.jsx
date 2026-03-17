// src/pages/UsersPage.jsx
import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Avatar, Button, Badge, Input, Modal, EmptyState } from '../components/ui';
import { Users, Plus, Shield, Headphones, Eye } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import toast from 'react-hot-toast';

export default function UsersPage() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'atendente', max_tickets: 5 });

  const { data: usuarios, isLoading } = useQuery({
    queryKey: ['usuarios'],
    queryFn: () => api.get('/api/users'),
  });

  const criarMutation = useMutation({
    mutationFn: () => api.post('/api/auth/usuarios', { ...form, max_tickets: parseInt(form.max_tickets) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['usuarios'] });
      setModalAberto(false);
      setForm({ nome: '', email: '', senha: '', perfil: 'atendente', max_tickets: 5 });
      toast.success('Atendente criado!');
    },
    onError: (err) => toast.error(err.message),
  });

  const perfilIcone = { admin: Shield, supervisor: Eye, atendente: Headphones };

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-display font-semibold">Atendentes</h1>
          <Button onClick={() => setModalAberto(true)}><Plus className="w-4 h-4" /> Novo atendente</Button>
        </div>

        <div className="space-y-2">
          {(usuarios || []).map((u) => {
            const Icone = perfilIcone[u.perfil] || Headphones;
            return (
              <div key={u.id} className={cn(
                'p-4 rounded-xl bg-[var(--color-surface)] border border-[var(--color-border)] flex items-center gap-4',
                !u.ativo && 'opacity-50'
              )}>
                <Avatar nome={u.nome} src={u.avatar_url} size="lg" online={u.online} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{u.nome}</span>
                    <Icone className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
                  </div>
                  <p className="text-xs text-[var(--color-text-muted)]">{u.email}</p>
                  <div className="flex items-center gap-3 mt-1.5">
                    <span className="text-xs text-[var(--color-text-muted)]">
                      {u.tickets_ativos}/{u.max_tickets_simultaneos} tickets
                    </span>
                    <span className="text-xs text-emerald-600">{u.resolvidos_hoje} resolvidos hoje</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {(u.filas || []).map((f) => (
                    <span key={f.id} className="px-2 py-0.5 rounded text-2xs text-white font-medium" style={{ backgroundColor: f.cor }}>{f.nome}</span>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <Modal aberto={modalAberto} onFechar={() => setModalAberto(false)} titulo="Novo atendente">
        <div className="space-y-3">
          <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label="Senha" type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />
          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Perfil</label>
            <select
              value={form.perfil}
              onChange={(e) => setForm({ ...form, perfil: e.target.value })}
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm"
            >
              <option value="atendente">Atendente</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <Input label="Max tickets simultâneos" type="number" value={form.max_tickets} onChange={(e) => setForm({ ...form, max_tickets: e.target.value })} />
          <Button className="w-full" onClick={() => criarMutation.mutate()} loading={criarMutation.isPending}>Criar atendente</Button>
        </div>
      </Modal>
    </div>
  );
}
