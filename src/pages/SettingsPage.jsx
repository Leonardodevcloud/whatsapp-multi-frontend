// src/pages/SettingsPage.jsx
import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button, Avatar, Input, Modal } from '../components/ui';
import {
  Wifi, WifiOff, QrCode, RefreshCw, LogOut, Clock, Phone,
  Tag, Plus, Pencil, Trash2, GripVertical, Check, X, Users,
  Shield, Headphones, Eye, Camera,
} from 'lucide-react';
import { cn } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import api from '../lib/api';
import wsClient from '../lib/websocket';
import toast from 'react-hot-toast';

const ABAS_CONFIG = [
  { id: 'whatsapp', label: 'WhatsApp', icon: Wifi },
  { id: 'atendentes', label: 'Atendentes', icon: Users },
  { id: 'horario', label: 'Horário', icon: Clock },
  { id: 'motivos', label: 'Motivos', icon: Tag },
];

export default function SettingsPage() {
  const [abaAtiva, setAbaAtiva] = useState('whatsapp');

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-display font-semibold mb-6">Configurações</h1>

        <div className="flex gap-1 mb-6 bg-[var(--color-surface-elevated)] rounded-xl p-1">
          {ABAS_CONFIG.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setAbaAtiva(id)}
              className={cn(
                'flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-all',
                abaAtiva === id
                  ? 'bg-primary/15 text-primary shadow-sm'
                  : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)] hover:bg-[var(--color-surface)]'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {abaAtiva === 'whatsapp' && <WhatsAppSection />}
        {abaAtiva === 'atendentes' && <AtendentesSection />}
        {abaAtiva === 'horario' && <HorarioSection />}
        {abaAtiva === 'motivos' && <MotivosSection />}
      </div>
    </div>
  );
}

// ============================================================
// HEARTBEAT
// ============================================================
const heartbeatStyles = `
@keyframes heartbeat-draw { 0% { stroke-dashoffset: 200; } 100% { stroke-dashoffset: 0; } }
@keyframes heartbeat-glow { 0%,100% { filter: drop-shadow(0 0 2px rgba(34,197,94,0.3)); } 50% { filter: drop-shadow(0 0 8px rgba(34,197,94,0.6)); } }
@keyframes dot-pulse { 0%,100% { opacity: 0.4; transform: scale(0.95); } 50% { opacity: 1; transform: scale(1.05); } }
`;

function HeartbeatAnimation({ conectado }) {
  if (!conectado) return (
    <div className="flex items-center justify-center" style={{ width: 120, height: 50 }}>
      <div className="flex items-center gap-1.5">
        <div className="w-2.5 h-2.5 rounded-full bg-red-400" style={{ animation: 'dot-pulse 1.5s ease-in-out infinite' }} />
        <span className="text-xs font-medium text-red-400">Offline</span>
      </div>
    </div>
  );

  return (
    <div style={{ width: 120, height: 50, animation: 'heartbeat-glow 3s ease-in-out infinite' }}>
      <svg viewBox="0 0 120 50" width="120" height="50">
        <path d="M0 25 L20 25 L28 25 L33 8 L38 42 L43 15 L48 35 L53 25 L70 25 L120 25" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="200" style={{ animation: 'heartbeat-draw 2s linear infinite' }} />
        <circle cx="118" cy="25" r="3" fill="#22c55e" opacity="0.6"><animate attributeName="opacity" values="0.3;1;0.3" dur="2s" repeatCount="indefinite" /></circle>
      </svg>
    </div>
  );
}

// ============================================================
// WHATSAPP
// ============================================================
function WhatsAppSection() {
  const [qr, setQr] = useState(null);
  const { data: status, refetch } = useQuery({ queryKey: ['whatsapp-status'], queryFn: () => api.get('/api/whatsapp/status'), refetchInterval: 5000 });

  useEffect(() => {
    const c1 = wsClient.on('whatsapp:qr', (d) => setQr(d.qr));
    const c2 = wsClient.on('whatsapp:conectado', () => { setQr(null); refetch(); toast.success('WhatsApp conectado!'); });
    return () => { c1(); c2(); };
  }, []);

  useEffect(() => {
    if (status && !status.conectado) api.get('/api/whatsapp/qr').then(d => { if (d.qr) setQr(d.qr); }).catch(() => {});
  }, [status?.conectado]);

  const reconectar = useMutation({ mutationFn: () => api.post('/api/whatsapp/reconectar'), onSuccess: () => { toast.success('Reconexão iniciada'); refetch(); }, onError: (e) => toast.error(e.message) });
  const logout = useMutation({ mutationFn: () => api.post('/api/whatsapp/logout'), onSuccess: () => { toast.success('Logout realizado'); refetch(); }, onError: (e) => toast.error(e.message) });

  const conectado = status?.conectado;
  const formatarTempo = (s) => { if (!s) return '—'; const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60); return h > 0 ? `${h}h ${m}min` : `${m}min`; };

  return (
    <>
      <style>{heartbeatStyles}</style>
      <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden">
        <div className="p-6">
          <div className="flex items-center gap-5">
            <div className="relative shrink-0">
              <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center', conectado ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-red-100 dark:bg-red-900/30')}>
                {conectado ? <Wifi className="w-7 h-7 text-emerald-600" /> : <WifiOff className="w-7 h-7 text-red-500" />}
              </div>
              <div className={cn('absolute -bottom-1 -right-1 w-5 h-5 rounded-full border-2 border-[var(--color-surface)]', conectado ? 'bg-emerald-500' : 'bg-red-400')} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg font-semibold">WhatsApp</h2>
              <div className="flex items-center gap-2 mt-1">
                <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium', conectado ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full', conectado ? 'bg-emerald-500' : 'bg-red-400')} />
                  {conectado ? 'Conectado' : 'Desconectado'}
                </span>
                {conectado && status?.tempoOnline && <span className="text-xs text-[var(--color-text-muted)] flex items-center gap-1"><Clock className="w-3 h-3" /> {formatarTempo(status.tempoOnline)}</span>}
              </div>
            </div>
            <div className="shrink-0"><HeartbeatAnimation conectado={conectado} /></div>
          </div>
        </div>

        {!conectado && qr && (
          <div className="border-t border-[var(--color-border)] px-6 py-8 flex flex-col items-center">
            <div className="bg-white p-4 rounded-2xl shadow-sm"><QRCodeSVG value={qr} size={220} level="M" /></div>
            <p className="text-sm text-[var(--color-text-secondary)] mt-4 font-medium">Escaneie o QR Code com seu WhatsApp</p>
          </div>
        )}

        {!conectado && !qr && (
          <div className="border-t border-[var(--color-border)] px-6 py-8 flex flex-col items-center">
            <QrCode className="w-12 h-12 text-[var(--color-text-muted)] mb-3" />
            <p className="text-sm text-[var(--color-text-muted)]">Clique em reconectar para gerar um QR Code</p>
          </div>
        )}

        <div className="border-t border-[var(--color-border)] px-6 py-4 flex gap-3">
          <Button variant="secondary" className="flex-1" onClick={() => reconectar.mutate()} loading={reconectar.isPending}><RefreshCw className="w-4 h-4" /> Reconectar</Button>
          {conectado && <Button variant="danger" onClick={() => logout.mutate()} loading={logout.isPending}><LogOut className="w-4 h-4" /> Desconectar</Button>}
        </div>
      </div>
    </>
  );
}

// ============================================================
// ATENDENTES — grid 4 cols + modal editar/criar com foto
// ============================================================
function AtendentesSection() {
  const queryClient = useQueryClient();
  const [modalAberto, setModalAberto] = useState(false);
  const [editando, setEditando] = useState(null);
  const [form, setForm] = useState({ nome: '', email: '', senha: '', perfil: 'atendente' });
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [avatarBase64, setAvatarBase64] = useState(null);
  const fileRef = useRef(null);

  const { data: usuarios, isLoading } = useQuery({ queryKey: ['usuarios'], queryFn: () => api.get('/api/users') });

  const criarMutation = useMutation({
    mutationFn: async () => {
      const user = await api.post('/api/auth/usuarios', { ...form, max_tickets: 10 });
      if (avatarBase64 && user?.id) await api.post(`/api/users/${user.id}/avatar`, { avatar_base64: avatarBase64 });
      return user;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }); fecharModal(); toast.success('Atendente criado!'); },
    onError: (e) => toast.error(e.message),
  });

  const editarMutation = useMutation({
    mutationFn: async () => {
      const dados = {};
      if (form.nome) dados.nome = form.nome;
      if (form.email) dados.email = form.email;
      if (form.senha && form.senha.length >= 8) dados.senha = form.senha;
      if (form.perfil) dados.perfil = form.perfil;
      if (avatarBase64) await api.post(`/api/users/${editando.id}/avatar`, { avatar_base64: avatarBase64 });
      if (Object.keys(dados).length > 0) return api.patch(`/api/users/${editando.id}`, dados);
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }); fecharModal(); toast.success('Atendente atualizado!'); },
    onError: (e) => toast.error(e.message),
  });

  const abrirCriar = () => { setEditando(null); setForm({ nome: '', email: '', senha: '', perfil: 'atendente' }); setAvatarPreview(null); setAvatarBase64(null); setModalAberto(true); };
  const abrirEditar = (u) => { setEditando(u); setForm({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil }); setAvatarPreview(u.avatar_url || null); setAvatarBase64(null); setModalAberto(true); };
  const fecharModal = () => { setModalAberto(false); setEditando(null); setAvatarPreview(null); setAvatarBase64(null); };

  const handleFoto = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error('Máximo 5MB'); return; }
    const reader = new FileReader();
    reader.onload = () => { setAvatarPreview(reader.result); setAvatarBase64(reader.result); };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const perfilIcone = { admin: Shield, supervisor: Eye, atendente: Headphones };
  const perfilLabel = { admin: 'Admin', supervisor: 'Supervisor', atendente: 'Atendente' };
  const perfilCor = { admin: 'text-amber-600 bg-amber-100 dark:bg-amber-900/30', supervisor: 'text-blue-600 bg-blue-100 dark:bg-blue-900/30', atendente: 'text-primary bg-primary/10' };

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-base font-semibold">Atendentes</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Gerencie a equipe de atendimento</p>
        </div>
        <Button onClick={abrirCriar}><Plus className="w-4 h-4" /> Novo atendente</Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-40 rounded-2xl bg-[var(--color-surface-elevated)] animate-pulse" />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {(usuarios || []).map((u) => {
            const Icone = perfilIcone[u.perfil] || Headphones;
            return (
              <button
                key={u.id}
                onClick={() => abrirEditar(u)}
                className={cn(
                  'relative bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5 text-center hover:border-primary/40 hover:shadow-sm transition-all',
                  !u.ativo && 'opacity-40'
                )}
              >
                <div className={cn('absolute top-3 right-3 w-2.5 h-2.5 rounded-full', u.online ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600')} />
                <div className="mx-auto mb-3"><Avatar nome={u.nome} src={u.avatar_url} size="xl" /></div>
                <p className="text-sm font-semibold truncate">{u.nome}</p>
                <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-2xs font-medium mt-1.5', perfilCor[u.perfil] || perfilCor.atendente)}>
                  <Icone className="w-3 h-3" /> {perfilLabel[u.perfil] || u.perfil}
                </span>
              </button>
            );
          })}
        </div>
      )}

      <Modal aberto={modalAberto} onFechar={fecharModal} titulo={editando ? 'Editar atendente' : 'Novo atendente'}>
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-3">
            <div className="relative group cursor-pointer" onClick={() => fileRef.current?.click()}>
              {avatarPreview ? (
                <img src={avatarPreview} alt="Avatar" className="w-20 h-20 rounded-2xl object-cover" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center"><Camera className="w-7 h-7 text-primary" /></div>
              )}
              <div className="absolute inset-0 bg-black/30 rounded-2xl flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"><Camera className="w-5 h-5 text-white" /></div>
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleFoto} />
            <button onClick={() => fileRef.current?.click()} className="text-xs text-primary hover:underline">{avatarPreview ? 'Trocar foto' : 'Adicionar foto'}</button>
          </div>

          <Input label="Nome" value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} />
          <Input label="Email" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <Input label={editando ? 'Nova senha (vazio = manter)' : 'Senha'} type="password" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} />

          <div className="space-y-1.5">
            <label className="block text-sm font-medium text-[var(--color-text-secondary)]">Perfil</label>
            <select value={form.perfil} onChange={(e) => setForm({ ...form, perfil: e.target.value })}
              className="w-full h-10 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm">
              <option value="atendente">Atendente</option>
              <option value="supervisor">Supervisor</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <Button className="flex-1" onClick={() => editando ? editarMutation.mutate() : criarMutation.mutate()}
              loading={criarMutation.isPending || editarMutation.isPending}>
              {editando ? 'Salvar alterações' : 'Criar atendente'}
            </Button>
            {editando && editando.ativo && (
              <Button variant="danger" onClick={() => { if (confirm('Desativar?')) { api.patch(`/api/users/${editando.id}`, { ativo: false }).then(() => { queryClient.invalidateQueries({ queryKey: ['usuarios'] }); fecharModal(); toast.success('Desativado'); }); } }}>
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  );
}

// ============================================================
// MOTIVOS DE ATENDIMENTO
// ============================================================
// ============================================================
// HORÁRIO DE ATENDIMENTO
// ============================================================
const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function HorarioSection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({ queryKey: ['horario-config'], queryFn: () => api.get('/api/whatsapp/horario') });
  const [horarios, setHorarios] = useState([]);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (data?.horarios) setHorarios(data.horarios);
  }, [data]);

  const handleToggle = (idx) => {
    setHorarios(h => h.map((d, i) => i === idx ? { ...d, ativo: !d.ativo } : d));
  };

  const handleChange = (idx, campo, valor) => {
    setHorarios(h => h.map((d, i) => i === idx ? { ...d, [campo]: valor } : d));
  };

  const handleSalvar = async () => {
    setSalvando(true);
    try {
      await api.put('/api/whatsapp/horario', { horarios });
      queryClient.invalidateQueries({ queryKey: ['horario-config'] });
      toast.success('Horário salvo!');
    } catch (e) { toast.error(e.message); }
    setSalvando(false);
  };

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Clock className="w-5 h-5 text-primary" /></div>
        <div>
          <h2 className="text-base font-semibold">Horário de Atendimento</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Fora do horário, a IA responde automaticamente usando a base de conhecimento</p>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 7 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-[var(--color-surface-elevated)] animate-pulse" />)}</div>
      ) : (
        <>
          <div className="space-y-2">
            {horarios.map((d, idx) => (
              <div key={d.dia_semana} className={cn(
                'flex items-center gap-4 px-4 py-3 rounded-lg border transition-all',
                d.ativo ? 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]' : 'border-dashed border-[var(--color-border)] opacity-50'
              )}>
                {/* Toggle */}
                <button onClick={() => handleToggle(idx)}
                  className={cn('w-10 h-6 rounded-full transition-colors relative shrink-0',
                    d.ativo ? 'bg-primary' : 'bg-gray-300 dark:bg-gray-600')}>
                  <span className={cn('absolute top-1 w-4 h-4 rounded-full bg-white transition-all',
                    d.ativo ? 'left-5' : 'left-1')} />
                </button>

                {/* Dia */}
                <span className="text-sm font-medium w-20 shrink-0">{DIAS_SEMANA[d.dia_semana]}</span>

                {/* Horários */}
                {d.ativo ? (
                  <div className="flex items-center gap-2 flex-1">
                    <input type="time" value={d.hora_abertura} onChange={(e) => handleChange(idx, 'hora_abertura', e.target.value)}
                      className="h-9 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                    <span className="text-sm text-[var(--color-text-muted)]">até</span>
                    <input type="time" value={d.hora_fechamento} onChange={(e) => handleChange(idx, 'hora_fechamento', e.target.value)}
                      className="h-9 px-3 rounded-lg bg-[var(--color-surface)] border border-[var(--color-border)] text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" />
                  </div>
                ) : (
                  <span className="text-sm text-[var(--color-text-muted)] italic">Fechado</span>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between mt-5">
            <p className="text-2xs text-[var(--color-text-muted)]">
              Fora do horário, o sistema responde automaticamente com IA e informa que o atendimento retorna no próximo dia útil.
            </p>
            <Button onClick={handleSalvar} loading={salvando}>Salvar horário</Button>
          </div>
        </>
      )}
    </div>
  );
}

function MotivosSection() {
  const queryClient = useQueryClient();
  const [novoNome, setNovoNome] = useState('');
  const [editandoId, setEditandoId] = useState(null);
  const [editandoNome, setEditandoNome] = useState('');

  const { data, isLoading } = useQuery({ queryKey: ['motivos-config'], queryFn: () => api.get('/api/tickets/motivos') });
  const motivos = data?.motivos || [];

  const criar = useMutation({ mutationFn: (n) => api.post('/api/tickets/motivos', { nome: n, ordem: motivos.length }), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['motivos-config'] }); setNovoNome(''); toast.success('Motivo criado!'); }, onError: (e) => toast.error(e.message) });
  const atualizar = useMutation({ mutationFn: ({ id, ...d }) => api.patch(`/api/tickets/motivos/${id}`, d), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['motivos-config'] }); setEditandoId(null); toast.success('Atualizado!'); }, onError: (e) => toast.error(e.message) });
  const deletar = useMutation({ mutationFn: (id) => api.delete(`/api/tickets/motivos/${id}`), onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['motivos-config'] }); toast.success('Removido!'); }, onError: (e) => toast.error(e.message) });

  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center"><Tag className="w-5 h-5 text-primary" /></div>
        <div>
          <h2 className="text-base font-semibold">Motivos de Atendimento</h2>
          <p className="text-sm text-[var(--color-text-muted)]">Motivos que o operador seleciona ao fechar chamados</p>
        </div>
      </div>

      <div className="flex gap-2 mt-5 mb-5">
        <input value={novoNome} onChange={(e) => setNovoNome(e.target.value)} placeholder="Nome do motivo..." onKeyDown={(e) => e.key === 'Enter' && novoNome.trim() && criar.mutate(novoNome.trim())}
          className="flex-1 h-10 rounded-lg bg-[var(--color-surface-elevated)] px-4 text-sm border border-[var(--color-border)] focus:outline-none focus:ring-2 focus:ring-primary/30" />
        <Button onClick={() => novoNome.trim() && criar.mutate(novoNome.trim())} loading={criar.isPending} disabled={!novoNome.trim()}>
          <Plus className="w-4 h-4" /> Adicionar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{Array.from({ length: 3 }).map((_, i) => <div key={i} className="h-12 rounded-lg bg-[var(--color-surface-elevated)] animate-pulse" />)}</div>
      ) : motivos.length === 0 ? (
        <div className="text-center py-10"><Tag className="w-10 h-10 text-[var(--color-text-muted)] mx-auto mb-3" /><p className="text-sm text-[var(--color-text-muted)]">Nenhum motivo cadastrado</p></div>
      ) : (
        <div className="space-y-2">
          {motivos.map((m) => (
            <div key={m.id} className={cn('flex items-center gap-3 px-4 py-3 rounded-lg border transition-all', m.ativo ? 'border-[var(--color-border)] bg-[var(--color-surface-elevated)]' : 'border-dashed border-[var(--color-border)] opacity-50')}>
              <GripVertical className="w-4 h-4 text-[var(--color-text-muted)] shrink-0" />
              {editandoId === m.id ? (
                <div className="flex-1 flex items-center gap-2">
                  <input value={editandoNome} onChange={(e) => setEditandoNome(e.target.value)} autoFocus onKeyDown={(e) => { if (e.key === 'Enter') atualizar.mutate({ id: m.id, nome: editandoNome.trim() }); if (e.key === 'Escape') setEditandoId(null); }}
                    className="flex-1 h-8 rounded-md bg-[var(--color-surface)] px-3 text-sm border border-primary/30 focus:outline-none focus:ring-1 focus:ring-primary" />
                  <button onClick={() => atualizar.mutate({ id: m.id, nome: editandoNome.trim() })} className="p-1.5 rounded-md bg-primary text-white hover:bg-primary/90"><Check className="w-3.5 h-3.5" /></button>
                  <button onClick={() => setEditandoId(null)} className="p-1.5 rounded-md hover:bg-[var(--color-surface)]"><X className="w-3.5 h-3.5 text-[var(--color-text-muted)]" /></button>
                </div>
              ) : (
                <>
                  <span className={cn('flex-1 text-sm', m.ativo ? '' : 'text-[var(--color-text-muted)] line-through')}>{m.nome}</span>
                  {!m.ativo && <span className="text-2xs bg-amber-100 dark:bg-amber-900/30 text-amber-600 px-2 py-0.5 rounded-full font-medium">Desativado</span>}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => atualizar.mutate({ id: m.id, ativo: !m.ativo })} title={m.ativo ? 'Desativar' : 'Ativar'} className={cn('w-7 h-7 rounded-md flex items-center justify-center transition-colors', m.ativo ? 'text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20' : 'text-[var(--color-text-muted)] hover:bg-[var(--color-surface)]')}><Check className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { setEditandoId(m.id); setEditandoNome(m.nome); }} className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-primary"><Pencil className="w-3.5 h-3.5" /></button>
                    <button onClick={() => { if (confirm('Remover?')) deletar.mutate(m.id); }} className="w-7 h-7 rounded-md flex items-center justify-center text-[var(--color-text-muted)] hover:text-red-500"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
