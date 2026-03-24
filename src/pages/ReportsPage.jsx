// src/pages/ReportsPage.jsx
import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Avatar } from '../components/ui';
import { MessageSquare, Clock, Headphones, Users, CalendarDays } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, AreaChart, Area,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────

function fmtDur(seg) {
  if (!seg) return '-';
  seg = Math.round(seg);
  if (seg < 60) return `${seg}s`;
  if (seg < 3600) { const m = Math.floor(seg / 60); const s = seg % 60; return s > 0 ? `${m}m ${s}s` : `${m}m`; }
  const h = Math.floor(seg / 3600); const m = Math.floor((seg % 3600) / 60); const s = seg % 60;
  let r = `${h}h`; if (m > 0) r += ` ${m}m`; if (s > 0) r += ` ${s}s`; return r;
}
function fmtKpi(seg) {
  if (!seg) return '-';
  if (seg < 60) return `${seg}s`;
  if (seg < 3600) return `${Math.floor(seg / 60)}min`;
  const h = Math.floor(seg / 3600); const m = Math.floor((seg % 3600) / 60);
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}
function fmtNum(n) { return (parseInt(n) || 0).toLocaleString('pt-BR'); }
function fmtDia(dia) {
  if (!dia) return '';
  const d = new Date(dia + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function getDatasDefault(dias) {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - dias);
  return { dataInicio: inicio.toISOString().split('T')[0], dataFim: fim.toISOString().split('T')[0] };
}

// ── Tooltip customizado ─────────────────────────────────

function CustomTooltip({ active, payload, label, formatter }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-neutral-900 text-white text-xs px-3 py-2 rounded-lg shadow-xl border border-neutral-700">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: p.color }} />
          <span className="text-neutral-300">{p.name}:</span>
          <span className="font-semibold">{formatter ? formatter(p.value, p.name) : p.value}</span>
        </p>
      ))}
    </div>
  );
}

// ── Página principal ────────────────────────────────────

export default function ReportsPage() {
  const [periodoAtivo, setPeriodoAtivo] = useState(30);
  const [dataInicio, setDataInicio] = useState(() => getDatasDefault(30).dataInicio);
  const [dataFim, setDataFim] = useState(() => getDatasDefault(30).dataFim);

  const handlePeriodo = (dias) => {
    setPeriodoAtivo(dias);
    const d = getDatasDefault(dias);
    setDataInicio(d.dataInicio);
    setDataFim(d.dataFim);
  };

  const handleDataChange = (campo, valor) => {
    setPeriodoAtivo(null);
    if (campo === 'inicio') setDataInicio(valor);
    else setDataFim(valor);
  };

  const qs = `dataInicio=${dataInicio}&dataFim=${dataFim}`;

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', dataInicio, dataFim],
    queryFn: () => api.get(`/api/reports/dashboard?${qs}`),
    refetchInterval: 30000,
  });
  const { data: performance } = useQuery({ queryKey: ['performance', dataInicio, dataFim], queryFn: () => api.get(`/api/reports/performance?${qs}`) });
  const { data: temposResp } = useQuery({ queryKey: ['tempos-resposta', dataInicio, dataFim], queryFn: () => api.get(`/api/reports/tempos-resposta?${qs}`) });
  const { data: contatosUnicos } = useQuery({ queryKey: ['contatos-unicos', dataInicio, dataFim], queryFn: () => api.get(`/api/reports/contatos-unicos?${qs}`) });
  const { data: temposDia } = useQuery({ queryKey: ['tempos-dia', dataInicio, dataFim], queryFn: () => api.get(`/api/reports/tempos-dia?${qs}`) });
  const { data: msgDia } = useQuery({ queryKey: ['mensagens-dia', dataInicio, dataFim], queryFn: () => api.get(`/api/reports/mensagens-dia?${qs}`) });
  const { data: picos } = useQuery({ queryKey: ['picos-horario', dataInicio, dataFim], queryFn: () => api.get(`/api/reports/picos-horario?${qs}`) });

  // Dados formatados para recharts
  const tmaDados = useMemo(() => (temposDia?.por_dia || []).map(r => ({
    dia: fmtDia(r.dia), tma: parseInt(r.tma_medio) || 0, tpr: parseInt(r.tpr_medio) || 0,
  })), [temposDia]);

  const msgDados = useMemo(() => (msgDia?.por_dia || []).map(r => ({
    dia: fmtDia(r.dia), total: parseInt(r.total) || 0, enviadas: parseInt(r.enviadas) || 0, recebidas: parseInt(r.recebidas) || 0,
  })), [msgDia]);

  const picosDados = useMemo(() => (picos || []).map(h => ({
    hora: h.label, chamados: h.chamados || 0, concluidos: h.concluidos || 0, tpr: h.tpr_medio || 0,
  })), [picos]);

  if (isLoading) {
    return (
      <div className="h-full overflow-y-auto p-6">
        <div className="max-w-6xl mx-auto grid grid-cols-4 gap-4">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
        </div>
      </div>
    );
  }

  const d = dashboard || {};

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header + Filtros */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <h1 className="text-xl font-display font-semibold">Relatórios</h1>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-1 bg-[var(--color-surface-elevated)] rounded-lg p-1">
              {[7, 15, 30].map((p) => (
                <button key={p} onClick={() => handlePeriodo(p)}
                  className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                    periodoAtivo === p ? 'bg-primary text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>
                  {p}d
                </button>
              ))}
            </div>
            <div className="flex items-center gap-1.5">
              <CalendarDays className="w-3.5 h-3.5 text-[var(--color-text-muted)]" />
              <input type="date" value={dataInicio} onChange={e => handleDataChange('inicio', e.target.value)}
                className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md px-2 py-1 text-xs" />
              <span className="text-xs text-[var(--color-text-muted)]">—</span>
              <input type="date" value={dataFim} onChange={e => handleDataChange('fim', e.target.value)}
                className="bg-[var(--color-surface-elevated)] border border-[var(--color-border)] rounded-md px-2 py-1 text-xs" />
            </div>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <KpiCard icone={MessageSquare} label="Chamados" valor={d.chamados || 0} cor="text-primary" />
          <KpiCard icone={Users} label="Contatos únicos" valor={contatosUnicos?.total || 0} cor="text-violet-500" />
          <KpiCard icone={Clock} label="TPR médio" valor={fmtKpi(d.tpr_medio)} cor="text-blue-500" />
          <KpiCard icone={Headphones} label="TMA" valor={fmtKpi(d.tma_medio)} cor="text-amber-500" />
          <MiniCard label="Online" valor={d.atendentes_online || 0} cor="bg-emerald-500" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <MiniCard label="Pendentes" valor={d.pendentes || 0} cor="bg-amber-500" />
          <MiniCard label="Em atendimento" valor={d.em_atendimento || 0} cor="bg-blue-500" />
          <MiniCard label="Mensagens" valor={fmtNum(msgDia?.total)} cor="bg-violet-500" />
        </div>

        {/* TMA e TPR por dia */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <h3 className="text-sm font-semibold mb-1">Tempo médio de atendimento</h3>
            <p className="text-xs text-primary font-semibold mb-3">Média geral: {fmtDur(temposDia?.tma_geral)}</p>
            <ResponsiveContainer width="100%" height={tmaDados.length * 32 + 40} minHeight={120}>
              <BarChart data={tmaDados} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tickFormatter={v => fmtDur(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <YAxis type="category" dataKey="dia" width={50} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <Tooltip content={<CustomTooltip formatter={(v) => fmtDur(v)} />} />
                <Bar dataKey="tma" name="TMA" fill="#7C3AED" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <h3 className="text-sm font-semibold mb-1">Tempo de primeira resposta</h3>
            <p className="text-xs text-primary font-semibold mb-3">Média geral: {fmtDur(temposDia?.tpr_geral)}</p>
            <ResponsiveContainer width="100%" height={tmaDados.length * 32 + 40} minHeight={120}>
              <BarChart data={tmaDados} layout="vertical" margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
                <XAxis type="number" tickFormatter={v => fmtDur(v)} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <YAxis type="category" dataKey="dia" width={50} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
                <Tooltip content={<CustomTooltip formatter={(v) => fmtDur(v)} />} />
                <Bar dataKey="tpr" name="TPR" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={14} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Mensagens por dia */}
        <Card>
          <h3 className="text-sm font-semibold mb-1">Quantidade de mensagens</h3>
          <p className="text-xs text-primary font-semibold mb-3">Total: {fmtNum(msgDia?.total)} · Enviadas: {fmtNum(msgDia?.enviadas)} · Recebidas: {fmtNum(msgDia?.recebidas)}</p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={msgDados} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="dia" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip content={<CustomTooltip formatter={(v) => fmtNum(v)} />} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="total" name="Total" fill="#818CF8" radius={[4, 4, 0, 0]} />
              <Bar dataKey="enviadas" name="Enviadas" fill="#6B7280" radius={[4, 4, 0, 0]} />
              <Bar dataKey="recebidas" name="Recebidas" fill="#3B82F6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Pico de atendimento */}
        <Card>
          <h3 className="text-sm font-semibold mb-1">Pico de atendimento</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-3">Chamados abertos por hora (08h — 19h)</p>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={picosDados} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="gradPico" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#7C3AED" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#7C3AED" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
              <XAxis dataKey="hora" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip content={<CustomTooltip formatter={(v, name) => name === 'TPR' ? fmtDur(v) : v} />} />
              <Area type="monotone" dataKey="chamados" name="Chamados" stroke="#7C3AED" strokeWidth={2} fill="url(#gradPico)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Distribuição TPR */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Distribuição — Tempo de 1ª resposta</h3>
          <ResponsiveContainer width="100%" height={(temposResp || []).length * 40 + 20} minHeight={100}>
            <BarChart data={temposResp || []} layout="vertical" margin={{ left: 10, right: 20, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--color-border)" />
              <XAxis type="number" tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <YAxis type="category" dataKey="faixa" width={60} tick={{ fontSize: 10, fill: 'var(--color-text-muted)' }} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="total" name="Chamados" fill="#3B82F6" radius={[0, 4, 4, 0]} barSize={18} label={{ position: 'right', fontSize: 10, fill: 'var(--color-text-muted)' }} />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Performance */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Performance dos atendentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="text-left py-2 pr-4">Atendente</th>
                  <th className="text-right py-2 px-3">Chamados</th>
                  <th className="text-right py-2 px-3">TPR</th>
                  <th className="text-right py-2 px-3">TMA</th>
                  <th className="text-right py-2 pl-3">Ativos</th>
                </tr>
              </thead>
              <tbody>
                {(performance || []).map(a => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-surface-elevated)] transition-colors">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar nome={a.nome} size="sm" online={a.online} src={a.avatar_url} />
                        <span className="font-medium">{a.nome}</span>
                      </div>
                    </td>
                    <td className="text-right px-3 font-medium">{a.chamados}</td>
                    <td className="text-right px-3 text-[var(--color-text-muted)]">{fmtKpi(a.tpr_medio)}</td>
                    <td className="text-right px-3 text-[var(--color-text-muted)]">{fmtKpi(a.tma_medio)}</td>
                    <td className="text-right pl-3">{a.tickets_ativos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </div>
  );
}

// ── Componentes ─────────────────────────────────────────

function Card({ children }) {
  return <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">{children}</div>;
}

function KpiCard({ icone: Icone, label, valor, cor }) {
  return (
    <Card>
      <div className="flex items-center gap-2 mb-2">
        <Icone className={cn('w-4 h-4', cor)} />
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold">{valor}</p>
    </Card>
  );
}

function MiniCard({ label, valor, cor }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-3 flex items-center gap-3">
      <div className={cn('w-3 h-3 rounded-full', cor)} />
      <div>
        <p className="text-lg font-bold">{valor}</p>
        <span className="text-2xs text-[var(--color-text-muted)]">{label}</span>
      </div>
    </div>
  );
}
