// src/pages/ReportsPage.jsx — Minimalista
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Skeleton } from '../components/ui';
import {
  BarChart3, Clock, Users, TrendingUp, Zap, AlertTriangle,
  CheckCircle2, Lightbulb, ThermometerSun, Activity,
} from 'lucide-react';
import { cn } from '../lib/utils';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, Cell, Line, ComposedChart,
} from 'recharts';
import api from '../lib/api';

const PERIODOS = [
  { label: '7d', dias: 7 },
  { label: '15d', dias: 15 },
  { label: '30d', dias: 30 },
];

const tooltipStyle = {
  contentStyle: {
    fontSize: 12, borderRadius: 12, border: 'none',
    boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
    padding: '8px 14px',
  },
  cursor: { fill: 'rgba(124,58,237,0.04)' },
};

export default function ReportsPage() {
  const [dias, setDias] = useState(30);
  const [agenteId, setAgenteId] = useState(null);

  const { data: dashboard, isLoading: loadDash } = useQuery({ queryKey: ['report-dash'], queryFn: () => api.get('/api/reports/dashboard') });
  const { data: volumeDia } = useQuery({ queryKey: ['report-vol-dia', dias], queryFn: () => api.get(`/api/reports/tickets-dia?dias=${dias}`) });
  const { data: volumeHora } = useQuery({ queryKey: ['report-vol-hora'], queryFn: () => api.get('/api/reports/tickets-hora') });
  const { data: picos } = useQuery({ queryKey: ['report-picos', dias], queryFn: () => api.get(`/api/reports/picos?dias=${dias}`) });
  const { data: performance } = useQuery({ queryKey: ['report-perf', dias], queryFn: () => api.get(`/api/reports/performance?dias=${dias}`) });
  const { data: tempos } = useQuery({ queryKey: ['report-tempos', dias], queryFn: () => api.get(`/api/reports/tempos-resposta?dias=${dias}`) });
  const { data: filas } = useQuery({ queryKey: ['report-filas'], queryFn: () => api.get('/api/reports/tickets-fila') });
  const { data: insights } = useQuery({ queryKey: ['report-insights', dias], queryFn: () => api.get(`/api/reports/insights?dias=${dias}`), staleTime: 60000 });
  const { data: agente } = useQuery({ queryKey: ['report-agente', agenteId, dias], queryFn: () => api.get(`/api/reports/atendente/${agenteId}?dias=${dias}`), enabled: !!agenteId });

  const d = dashboard || {};
  const fmt = (s) => {
    if (!s && s !== 0) return '—';
    if (s < 60) return `${s}s`;
    if (s < 3600) return `${Math.floor(s / 60)}min`;
    return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`;
  };
  const horaFmt = (h) => `${String(h).padStart(2, '0')}h`;
  const picoMax = (picos || []).reduce((max, p) => p.tickets_media_dia > max.tickets_media_dia ? p : max, { tickets_media_dia: 0, hora: 0 });

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-xl font-display font-semibold">Relatórios</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Visão analítica da operação</p>
          </div>
          <div className="flex gap-0.5 bg-[var(--color-surface-elevated)] rounded-full p-0.5">
            {PERIODOS.map(({ label, dias: d }) => (
              <button key={d} onClick={() => { setDias(d); setAgenteId(null); }}
                className={cn('px-4 py-1.5 rounded-full text-xs font-medium transition-all',
                  dias === d ? 'bg-primary text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* KPI Cards */}
        {loadDash ? (
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-8">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-2xl" />)}</div>
        ) : (
          <div className="grid grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
            <KpiCard label="Tickets" valor={d.tickets_hoje || 0} sub="hoje" cor="#7c3aed" />
            <KpiCard label="Resolvidos" valor={d.resolvidos_hoje || 0} sub="hoje" cor="#22c55e" />
            <KpiCard label="Pendentes" valor={d.pendentes_total || 0} sub="total" cor="#f59e0b" />
            <KpiCard label="TPR" valor={fmt(d.tpr_medio_hoje)} sub="média" cor="#3b82f6" />
            <KpiCard label="Online" valor={d.atendentes_online || 0} sub="agora" cor="#10b981" />
            <KpiCard label="CSAT" valor={d.csat_medio_hoje || '—'} sub="média" cor="#a855f7" />
          </div>
        )}

        {/* Insights IA */}
        {insights?.insights?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-8">
            {insights.insights.map((ins, i) => {
              const cores = { positivo: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', border: 'border-emerald-100 dark:border-emerald-900', icon: CheckCircle2, iconCor: 'text-emerald-500' }, alerta: { bg: 'bg-amber-50 dark:bg-amber-950/30', border: 'border-amber-100 dark:border-amber-900', icon: AlertTriangle, iconCor: 'text-amber-500' }, sugestao: { bg: 'bg-blue-50 dark:bg-blue-950/30', border: 'border-blue-100 dark:border-blue-900', icon: Lightbulb, iconCor: 'text-blue-500' } };
              const c = cores[ins.tipo] || cores.sugestao;
              const Ic = c.icon;
              return (
                <div key={i} className={cn('p-4 rounded-2xl border', c.bg, c.border)}>
                  <Ic className={cn('w-4 h-4 mb-2', c.iconCor)} />
                  <p className="text-sm font-medium leading-tight">{ins.titulo}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] mt-1 leading-relaxed">{ins.descricao}</p>
                </div>
              );
            })}
          </div>
        )}

        {/* Gráficos principais */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Volume por dia */}
          <ChartCard titulo="Volume diário">
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={(volumeDia || []).map(d => ({ ...d, dia: new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }))}>
                <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={8} />
                <YAxis hide />
                <Tooltip {...tooltipStyle} />
                <defs>
                  <linearGradient id="gTotal" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gResolv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.15} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="total" name="Total" stroke="#7c3aed" strokeWidth={2} fill="url(#gTotal)" dot={false} />
                <Area type="monotone" dataKey="resolvidos" name="Resolvidos" stroke="#22c55e" strokeWidth={1.5} fill="url(#gResolv)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Picos — termômetro */}
          <ChartCard titulo="Picos de atendimento" subtitulo={picoMax.hora !== undefined ? `Pico: ${horaFmt(picoMax.hora)}` : ''} icone={ThermometerSun}>
            <ResponsiveContainer width="100%" height={200}>
              <ComposedChart data={(picos || []).filter(p => p.hora >= 7 && p.hora <= 21)}>
                <XAxis dataKey="hora" tickFormatter={horaFmt} axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={8} />
                <YAxis hide />
                <Tooltip {...tooltipStyle} formatter={(v, n) => [n === 'tickets_media_dia' ? `${v}/dia` : `${v} recomendado`, n === 'tickets_media_dia' ? 'Tickets' : 'Atendentes']} />
                <Bar dataKey="tickets_media_dia" name="Tickets/dia" radius={[6, 6, 6, 6]} barSize={16}>
                  {(picos || []).filter(p => p.hora >= 7 && p.hora <= 21).map((p, i) => (
                    <Cell key={i} fill={p.tickets_media_dia >= picoMax.tickets_media_dia * 0.8 ? '#ef4444' : p.tickets_media_dia >= picoMax.tickets_media_dia * 0.5 ? '#f59e0b' : '#7c3aed'} fillOpacity={0.7} />
                  ))}
                </Bar>
                <Line type="monotone" dataKey="atendentes_recomendados" name="Recomendado" stroke="#22c55e" strokeWidth={2} strokeDasharray="4 4" dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-2">
              <LegendDot cor="#ef4444" label="Pico" />
              <LegendDot cor="#f59e0b" label="Moderado" />
              <LegendDot cor="#7c3aed" label="Normal" />
              <LegendDot cor="#22c55e" label="Recomendado" dashed />
            </div>
          </ChartCard>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Tempo resposta */}
          <ChartCard titulo="Primeira resposta">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={tempos || []} layout="vertical" barSize={12}>
                <XAxis type="number" hide />
                <YAxis dataKey="faixa" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#a1a1aa' }} width={70} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="total" fill="#7c3aed" radius={[0, 6, 6, 0]} fillOpacity={0.6} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* 24h */}
          <ChartCard titulo="Últimas 24 horas">
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={(volumeHora || []).map(h => ({ ...h, hora: new Date(h.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }))} barSize={10}>
                <XAxis dataKey="hora" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#a1a1aa' }} interval={2} dy={8} />
                <YAxis hide />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="total" name="Total" fill="#7c3aed" radius={[4, 4, 4, 4]} fillOpacity={0.5} />
                <Bar dataKey="resolvidos" name="Resolvidos" fill="#22c55e" radius={[4, 4, 4, 4]} fillOpacity={0.5} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Filas */}
        {filas?.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
            {filas.map(f => (
              <div key={f.nome} className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--color-surface)] border border-[var(--color-border)]">
                <div className="w-2 h-8 rounded-full" style={{ background: f.cor || '#7c3aed' }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{f.nome}</p>
                  <p className="text-2xs text-[var(--color-text-muted)]">{f.total || 0} tickets</p>
                </div>
                {parseInt(f.pendentes) > 0 && (
                  <span className="text-xs font-medium text-amber-600 bg-amber-50 dark:bg-amber-900/20 px-2 py-0.5 rounded-full">{f.pendentes}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Performance */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl overflow-hidden mb-8">
          <div className="px-6 py-4">
            <h3 className="text-sm font-semibold">Performance individual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-t border-b border-[var(--color-border)]">
                  {['Atendente', 'Tickets', 'Resolvidos', 'TPR', 'TMA', 'CSAT', 'Ativos', ''].map(h => (
                    <th key={h} className={cn('px-4 py-3 text-2xs font-medium text-[var(--color-text-muted)] uppercase tracking-wider', h === 'Atendente' ? 'text-left' : 'text-center')}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(performance || []).map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)]/50 transition-colors">
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar nome={a.nome} size="sm" online={a.online} src={a.avatar_url} />
                        <div>
                          <span className="font-medium text-sm">{a.nome}</span>
                          {a.online && <span className="ml-2 text-2xs text-emerald-500">online</span>}
                        </div>
                      </div>
                    </td>
                    <td className="text-center px-4 font-medium">{a.tickets_total}</td>
                    <td className="text-center px-4"><span className="text-emerald-600 font-medium">{a.resolvidos}</span></td>
                    <td className="text-center px-4 text-[var(--color-text-secondary)]">{fmt(a.tpr_medio)}</td>
                    <td className="text-center px-4 text-[var(--color-text-secondary)]">{fmt(a.tr_medio)}</td>
                    <td className="text-center px-4">{a.csat_medio || '—'}</td>
                    <td className="text-center px-4">{a.tickets_ativos}</td>
                    <td className="px-4">
                      <button onClick={() => setAgenteId(agenteId === a.id ? null : a.id)}
                        className={cn('text-xs px-3 py-1 rounded-full transition-all',
                          agenteId === a.id ? 'bg-primary text-white' : 'text-[var(--color-text-muted)] hover:text-primary hover:bg-primary/5')}>
                        {agenteId === a.id ? 'Fechar' : 'Ver'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhe agente */}
        {agenteId && agente?.resumo && (
          <div className="bg-[var(--color-surface)] border border-primary/20 rounded-2xl p-6 mb-8">
            <div className="flex items-center gap-4 mb-5">
              <Avatar nome={agente.resumo.nome} size="xl" src={agente.resumo.avatar_url} />
              <div className="flex-1">
                <h3 className="text-lg font-semibold">{agente.resumo.nome}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">{agente.resumo.email}</p>
              </div>
              <button onClick={() => setAgenteId(null)} className="text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)] px-3 py-1 rounded-full hover:bg-[var(--color-surface-elevated)]">Fechar</button>
            </div>

            <div className="grid grid-cols-5 gap-3 mb-5">
              <MiniKpi label="Tickets" valor={agente.resumo.tickets_total || 0} />
              <MiniKpi label="Resolvidos" valor={agente.resumo.resolvidos || 0} />
              <MiniKpi label="TPR" valor={fmt(agente.resumo.tpr_medio)} />
              <MiniKpi label="TMA" valor={fmt(agente.resumo.tr_medio)} />
              <MiniKpi label="CSAT" valor={agente.resumo.csat_medio || '—'} />
            </div>

            {agente.por_dia?.length > 0 && (
              <ResponsiveContainer width="100%" height={140}>
                <AreaChart data={agente.por_dia.map(d => ({ ...d, dia: new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }))}>
                  <XAxis dataKey="dia" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#a1a1aa' }} dy={8} />
                  <YAxis hide />
                  <Tooltip {...tooltipStyle} />
                  <defs>
                    <linearGradient id="gAgente" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="total" stroke="#7c3aed" strokeWidth={2} fill="url(#gAgente)" dot={false} />
                  <Area type="monotone" dataKey="resolvidos" stroke="#22c55e" strokeWidth={1.5} fill="none" dot={false} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function ChartCard({ titulo, subtitulo, icone: Icone, children }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-5">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          {Icone && <Icone className="w-4 h-4 text-[var(--color-text-muted)]" />}
          <h3 className="text-sm font-semibold">{titulo}</h3>
        </div>
        {subtitulo && <span className="text-2xs text-[var(--color-text-muted)]">{subtitulo}</span>}
      </div>
      {children}
    </div>
  );
}

function KpiCard({ label, valor, sub, cor }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-1">
        <div className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />
        <span className="text-2xs text-[var(--color-text-muted)] font-medium">{label}</span>
      </div>
      <p className="text-2xl font-semibold tracking-tight">{valor}</p>
      {sub && <p className="text-2xs text-[var(--color-text-muted)] mt-0.5">{sub}</p>}
    </div>
  );
}

function MiniKpi({ label, valor }) {
  return (
    <div className="bg-[var(--color-surface-elevated)] rounded-xl p-3 text-center">
      <p className="text-2xs text-[var(--color-text-muted)]">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{valor}</p>
    </div>
  );
}

function LegendDot({ cor, label, dashed }) {
  return (
    <div className="flex items-center gap-1.5">
      {dashed ? (
        <div className="w-3 h-0 border-t-2 border-dashed" style={{ borderColor: cor }} />
      ) : (
        <div className="w-2 h-2 rounded-full" style={{ background: cor }} />
      )}
      <span className="text-2xs text-[var(--color-text-muted)]">{label}</span>
    </div>
  );
}
