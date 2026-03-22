// src/pages/ReportsPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Avatar, Skeleton } from '../components/ui';
import { BarChart3, Clock, Users, TrendingUp, Zap, AlertTriangle, CheckCircle2, Lightbulb, ThermometerSun } from 'lucide-react';
import { cn } from '../lib/utils';
import { ResponsiveContainer, AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell } from 'recharts';
import api from '../lib/api';

const PERIODOS = [{ label: '7d', dias: 7 }, { label: '15d', dias: 15 }, { label: '30d', dias: 30 }];

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
  const fmt = (s) => { if (!s && s !== 0) return '—'; if (s < 60) return `${s}s`; if (s < 3600) return `${Math.floor(s / 60)}min`; return `${Math.floor(s / 3600)}h${Math.floor((s % 3600) / 60)}m`; };
  const horaFmt = (h) => `${String(h).padStart(2, '0')}h`;
  const picoMax = (picos || []).reduce((max, p) => p.tickets_media_dia > max.tickets_media_dia ? p : max, { tickets_media_dia: 0, hora: 0 });

  return (
    <div className="h-full overflow-y-auto scrollbar-thin p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-display font-semibold">Relatórios</h1>
            <p className="text-sm text-[var(--color-text-muted)]">Análise completa da operação</p>
          </div>
          <div className="flex gap-1 bg-[var(--color-surface-elevated)] rounded-lg p-1">
            {PERIODOS.map(({ label, dias: d }) => (
              <button key={d} onClick={() => { setDias(d); setAgenteId(null); }}
                className={cn('px-3 py-1.5 rounded-md text-sm font-medium transition-all', dias === d ? 'bg-primary text-white shadow-sm' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>
                {label}
              </button>
            ))}
          </div>
        </div>

        {loadDash ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            <KpiCard label="Tickets hoje" valor={d.tickets_hoje || 0} icon={BarChart3} cor="text-primary" />
            <KpiCard label="Resolvidos" valor={d.resolvidos_hoje || 0} icon={CheckCircle2} cor="text-emerald-500" />
            <KpiCard label="Pendentes" valor={d.pendentes_total || 0} icon={Clock} cor="text-amber-500" />
            <KpiCard label="TPR médio" valor={fmt(d.tpr_medio_hoje)} icon={Zap} cor="text-blue-500" />
            <KpiCard label="Online" valor={d.atendentes_online || 0} icon={Users} cor="text-emerald-500" />
            <KpiCard label="CSAT" valor={d.csat_medio_hoje || '—'} icon={TrendingUp} cor="text-purple-500" />
          </div>
        )}

        {insights?.insights?.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            {insights.insights.map((ins, i) => (
              <div key={i} className={cn('p-4 rounded-xl border', ins.tipo === 'positivo' ? 'bg-emerald-50 dark:bg-emerald-900/10 border-emerald-200 dark:border-emerald-800' : ins.tipo === 'alerta' ? 'bg-amber-50 dark:bg-amber-900/10 border-amber-200 dark:border-amber-800' : 'bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800')}>
                <div className="flex items-start gap-2">
                  {ins.tipo === 'positivo' ? <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" /> : ins.tipo === 'alerta' ? <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" /> : <Lightbulb className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />}
                  <div><p className="text-sm font-semibold">{ins.titulo}</p><p className="text-xs text-[var(--color-text-secondary)] mt-0.5">{ins.descricao}</p></div>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Volume por dia</h3>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={(volumeDia || []).map(d => ({ ...d, dia: new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="dia" tick={{ fontSize: 11 }} stroke="#999" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Area type="monotone" dataKey="total" name="Total" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} strokeWidth={2} />
                  <Area type="monotone" dataKey="resolvidos" name="Resolvidos" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold flex items-center gap-2"><ThermometerSun className="w-4 h-4 text-red-500" /> Picos de atendimento</h3>
              {picoMax.hora !== undefined && <span className="text-xs text-[var(--color-text-muted)]">Pico: {horaFmt(picoMax.hora)}</span>}
            </div>
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(picos || []).filter(p => p.hora >= 7 && p.hora <= 21)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="hora" tickFormatter={horaFmt} tick={{ fontSize: 11 }} stroke="#999" />
                  <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                  <Tooltip formatter={(v, n) => [n === 'tickets_media_dia' ? `${v} tickets/dia` : `${v} atendentes`, n === 'tickets_media_dia' ? 'Média' : 'Recomendado']} contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="tickets_media_dia" name="Média tickets/dia" radius={[4, 4, 0, 0]}>
                    {(picos || []).filter(p => p.hora >= 7 && p.hora <= 21).map((p, i) => (
                      <Cell key={i} fill={p.tickets_media_dia >= picoMax.tickets_media_dia * 0.8 ? '#ef4444' : p.tickets_media_dia >= picoMax.tickets_media_dia * 0.5 ? '#f59e0b' : '#7c3aed'} fillOpacity={0.8} />
                    ))}
                  </Bar>
                  <Bar dataKey="atendentes_recomendados" name="Recomendado" fill="#22c55e" fillOpacity={0.4} radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <p className="text-2xs text-[var(--color-text-muted)] mt-2">Vermelho = pico | Amarelo = moderado | Verde = atendentes recomendados (1 a cada 3 tickets/dia)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Tempo de primeira resposta</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={tempos || []} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                  <XAxis type="number" tick={{ fontSize: 11 }} stroke="#999" />
                  <YAxis dataKey="faixa" type="category" tick={{ fontSize: 11 }} width={80} stroke="#999" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="total" fill="#7c3aed" radius={[0, 4, 4, 0]} fillOpacity={0.8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Tickets últimas 24h</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={(volumeHora || []).map(h => ({ ...h, hora: new Date(h.hora).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) }))}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                  <XAxis dataKey="hora" tick={{ fontSize: 10 }} stroke="#999" interval={2} />
                  <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Bar dataKey="total" name="Total" fill="#7c3aed" radius={[3, 3, 0, 0]} fillOpacity={0.7} />
                  <Bar dataKey="resolvidos" name="Resolvidos" fill="#22c55e" radius={[3, 3, 0, 0]} fillOpacity={0.7} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {filas?.length > 0 && (
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5 mb-6">
            <h3 className="text-sm font-semibold mb-3">Por fila</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {filas.map(f => (
                <div key={f.nome} className="flex items-center gap-3 p-3 rounded-lg bg-[var(--color-surface-elevated)]">
                  <div className="w-3 h-3 rounded-full shrink-0" style={{ background: f.cor || '#7c3aed' }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{f.nome}</p>
                    <p className="text-2xs text-[var(--color-text-muted)]">{f.total || 0} tickets — {f.pendentes || 0} pendentes</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl overflow-hidden mb-6">
          <div className="px-5 py-4 border-b border-[var(--color-border)]">
            <h3 className="text-sm font-semibold">Performance dos atendentes</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--color-border)] bg-[var(--color-surface-elevated)]">
                  <th className="text-left px-5 py-3 text-xs font-medium text-[var(--color-text-muted)]">Atendente</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-muted)]">Tickets</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-muted)]">Resolvidos</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-muted)]">TPR</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-muted)]">TMA</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-muted)]">CSAT</th>
                  <th className="text-center px-3 py-3 text-xs font-medium text-[var(--color-text-muted)]">Ativos</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {(performance || []).map((a) => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] hover:bg-[var(--color-surface-elevated)] transition-colors">
                    <td className="py-2.5 px-5">
                      <div className="flex items-center gap-2.5">
                        <Avatar nome={a.nome} size="sm" online={a.online} src={a.avatar_url} />
                        <span className="font-medium">{a.nome}</span>
                      </div>
                    </td>
                    <td className="text-center px-3">{a.tickets_total}</td>
                    <td className="text-center px-3 text-emerald-600 font-medium">{a.resolvidos}</td>
                    <td className="text-center px-3">{fmt(a.tpr_medio)}</td>
                    <td className="text-center px-3">{fmt(a.tr_medio)}</td>
                    <td className="text-center px-3">{a.csat_medio || '—'}</td>
                    <td className="text-center px-3">{a.tickets_ativos}</td>
                    <td className="px-3">
                      <button onClick={() => setAgenteId(agenteId === a.id ? null : a.id)}
                        className={cn('text-xs px-2 py-1 rounded-md transition-colors', agenteId === a.id ? 'bg-primary text-white' : 'text-primary hover:bg-primary/10')}>
                        Detalhes
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {agenteId && agente?.resumo && (
          <div className="bg-[var(--color-surface)] border border-primary/30 rounded-xl p-5 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <Avatar nome={agente.resumo.nome} size="lg" src={agente.resumo.avatar_url} />
              <div>
                <h3 className="text-base font-semibold">{agente.resumo.nome}</h3>
                <p className="text-xs text-[var(--color-text-muted)]">{agente.resumo.email} — {agente.resumo.perfil}</p>
              </div>
              <button onClick={() => setAgenteId(null)} className="ml-auto text-xs text-[var(--color-text-muted)] hover:text-[var(--color-text)]">Fechar</button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
              <MiniKpi label="Tickets" valor={agente.resumo.tickets_total || 0} />
              <MiniKpi label="Resolvidos" valor={agente.resumo.resolvidos || 0} />
              <MiniKpi label="TPR" valor={fmt(agente.resumo.tpr_medio)} />
              <MiniKpi label="TMA" valor={fmt(agente.resumo.tr_medio)} />
              <MiniKpi label="CSAT" valor={agente.resumo.csat_medio || '—'} />
            </div>
            {agente.por_dia?.length > 0 && (
              <div className="h-40">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={agente.por_dia.map(d => ({ ...d, dia: new Date(d.dia).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) }))}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border-tertiary)" />
                    <XAxis dataKey="dia" tick={{ fontSize: 10 }} stroke="#999" />
                    <YAxis tick={{ fontSize: 11 }} stroke="#999" />
                    <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                    <Area type="monotone" dataKey="total" name="Tickets" stroke="#7c3aed" fill="#7c3aed" fillOpacity={0.15} strokeWidth={2} />
                    <Area type="monotone" dataKey="resolvidos" name="Resolvidos" stroke="#22c55e" fill="#22c55e" fillOpacity={0.1} strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function KpiCard({ label, valor, icon: Icon, cor }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center justify-between mb-2">
        <span className="text-2xs text-[var(--color-text-muted)] font-medium uppercase tracking-wide">{label}</span>
        <Icon className={cn('w-4 h-4', cor || 'text-primary')} />
      </div>
      <p className="text-2xl font-semibold">{valor}</p>
    </div>
  );
}

function MiniKpi({ label, valor }) {
  return (
    <div className="bg-[var(--color-surface-elevated)] rounded-lg p-3 text-center">
      <p className="text-2xs text-[var(--color-text-muted)]">{label}</p>
      <p className="text-lg font-semibold mt-0.5">{valor}</p>
    </div>
  );
}
