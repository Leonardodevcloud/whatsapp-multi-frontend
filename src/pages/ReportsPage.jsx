// src/pages/ReportsPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Avatar } from '../components/ui';
import { MessageSquare, Clock, Star, CheckCircle2 } from 'lucide-react';
import { cn, formatarDuracao } from '../lib/utils';
import api from '../lib/api';

export default function ReportsPage() {
  const [periodo, setPeriodo] = useState(30);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/reports/dashboard'),
    refetchInterval: 30000,
  });

  const { data: ticketsDia } = useQuery({
    queryKey: ['tickets-dia', periodo],
    queryFn: () => api.get(`/api/reports/tickets-dia?dias=${periodo}`),
  });

  const { data: ticketsFila } = useQuery({
    queryKey: ['tickets-fila'],
    queryFn: () => api.get('/api/reports/tickets-fila'),
  });

  const { data: performance } = useQuery({
    queryKey: ['performance', periodo],
    queryFn: () => api.get(`/api/reports/performance?dias=${periodo}`),
  });

  const { data: csat } = useQuery({
    queryKey: ['csat', periodo],
    queryFn: () => api.get(`/api/reports/csat?dias=${periodo}`),
  });

  const { data: temposResp } = useQuery({
    queryKey: ['tempos-resposta', periodo],
    queryFn: () => api.get(`/api/reports/tempos-resposta?dias=${periodo}`),
  });

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
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-display font-semibold">Relatórios</h1>
          <div className="flex gap-1.5 bg-[var(--color-surface-elevated)] rounded-lg p-1">
            {[7, 15, 30].map((p) => (
              <button key={p} onClick={() => setPeriodo(p)}
                className={cn('px-3 py-1.5 rounded-md text-xs font-medium transition-all',
                  periodo === p ? 'bg-primary text-white' : 'text-[var(--color-text-muted)] hover:text-[var(--color-text)]')}>
                {p}d
              </button>
            ))}
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiCard icone={MessageSquare} label="Tickets hoje" valor={d.tickets_hoje || 0} cor="text-primary" />
          <KpiCard icone={CheckCircle2} label="Resolvidos hoje" valor={d.resolvidos_hoje || 0} cor="text-emerald-500" />
          <KpiCard icone={Clock} label="TPR médio" valor={formatarDuracao(d.tpr_medio_hoje)} cor="text-blue-500" />
          <KpiCard icone={Star} label="CSAT hoje" valor={d.csat_medio_hoje ? `${d.csat_medio_hoje}/5` : '—'} cor="text-amber-500" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <MiniCard label="Pendentes" valor={d.pendentes_total || 0} cor="bg-amber-500" />
          <MiniCard label="Abertos" valor={d.abertos_total || 0} cor="bg-blue-500" />
          <MiniCard label="Aguardando" valor={d.aguardando_total || 0} cor="bg-orange-500" />
          <MiniCard label="Online" valor={d.atendentes_online || 0} cor="bg-emerald-500" />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tickets por dia */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Tickets por dia</h3>
            <div className="flex items-end gap-0.5 h-32">
              {(ticketsDia || []).slice(-periodo).map((dia, i) => {
                const max = Math.max(...(ticketsDia || []).map((x) => parseInt(x.total) || 1));
                const h = Math.max(((parseInt(dia.total) || 0) / max) * 100, 4);
                return (
                  <div key={i} className="flex-1 group relative flex flex-col items-center">
                    <div className="absolute -top-6 bg-neutral-800 text-white text-2xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                      {dia.dia?.slice(5)} — {dia.total}
                    </div>
                    <div className="w-full rounded-sm bg-primary/80 hover:bg-primary transition-colors" style={{ height: `${h}%` }} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Por fila */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Por fila</h3>
            <div className="space-y-3">
              {(ticketsFila || []).map((f) => {
                const max = Math.max(...(ticketsFila || []).map((x) => parseInt(x.total) || 1));
                const pct = ((parseInt(f.total) || 0) / max) * 100;
                return (
                  <div key={f.nome}>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: f.cor }} />
                        <span className="font-medium">{f.nome}</span>
                      </div>
                      <span className="text-[var(--color-text-muted)]">{f.total}</span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--color-surface-elevated)] overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: f.cor }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tempos de resposta */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">Tempo de 1ª resposta</h3>
            <div className="space-y-2.5">
              {(temposResp || []).map((f) => {
                const max = Math.max(...(temposResp || []).map((x) => parseInt(x.total) || 1));
                const pct = ((parseInt(f.total) || 0) / max) * 100;
                return (
                  <div key={f.faixa} className="flex items-center gap-3">
                    <span className="text-xs text-[var(--color-text-muted)] w-16 shrink-0">{f.faixa}</span>
                    <div className="flex-1 h-5 rounded bg-[var(--color-surface-elevated)] overflow-hidden">
                      <div className="h-full rounded bg-blue-500/80 flex items-center pl-2" style={{ width: `${pct}%`, minWidth: '20px' }}>
                        <span className="text-2xs text-white font-medium">{f.total}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CSAT */}
          <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
            <h3 className="text-sm font-semibold mb-4">CSAT</h3>
            {csat?.total > 0 ? (
              <div>
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-3xl font-display font-bold text-amber-500">{csat.media}</span>
                  <div>
                    <div className="flex gap-0.5">
                      {[1,2,3,4,5].map(n => <Star key={n} className={cn('w-4 h-4', n <= Math.round(csat.media) ? 'text-amber-400 fill-amber-400' : 'text-neutral-300')} />)}
                    </div>
                    <span className="text-xs text-[var(--color-text-muted)]">{csat.total} avaliações</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  {[5,4,3,2,1].map(nota => {
                    const t = csat.distribuicao?.find(x => x.avaliacao === nota)?.total || 0;
                    const pct = csat.total > 0 ? (parseInt(t) / csat.total) * 100 : 0;
                    return (
                      <div key={nota} className="flex items-center gap-2">
                        <span className="text-xs w-3 text-right">{nota}</span>
                        <Star className="w-3 h-3 text-amber-400 fill-amber-400" />
                        <div className="flex-1 h-3 rounded-full bg-[var(--color-surface-elevated)] overflow-hidden">
                          <div className="h-full rounded-full bg-amber-400" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="text-xs text-[var(--color-text-muted)] w-6 text-right">{t}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : <p className="text-sm text-[var(--color-text-muted)]">Sem avaliações no período</p>}
          </div>
        </div>

        {/* Performance */}
        <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
          <h3 className="text-sm font-semibold mb-4">Performance dos atendentes</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-[var(--color-text-muted)] border-b border-[var(--color-border)]">
                  <th className="text-left py-2 pr-4">Atendente</th>
                  <th className="text-right py-2 px-3">Tickets</th>
                  <th className="text-right py-2 px-3">Resolvidos</th>
                  <th className="text-right py-2 px-3">TPR</th>
                  <th className="text-right py-2 px-3">Resolução</th>
                  <th className="text-right py-2 px-3">CSAT</th>
                  <th className="text-right py-2 pl-3">Ativos</th>
                </tr>
              </thead>
              <tbody>
                {(performance || []).map(a => (
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0">
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2.5">
                        <Avatar nome={a.nome} size="sm" online={a.online} />
                        <span className="font-medium">{a.nome}</span>
                      </div>
                    </td>
                    <td className="text-right px-3 font-medium">{a.tickets_total}</td>
                    <td className="text-right px-3 text-emerald-600 font-medium">{a.resolvidos}</td>
                    <td className="text-right px-3 text-[var(--color-text-muted)]">{formatarDuracao(a.tpr_medio)}</td>
                    <td className="text-right px-3 text-[var(--color-text-muted)]">{formatarDuracao(a.tr_medio)}</td>
                    <td className="text-right px-3">
                      {a.csat_medio ? <span className="inline-flex items-center gap-1 text-amber-600"><Star className="w-3 h-3 fill-amber-400" />{a.csat_medio}</span> : '—'}
                    </td>
                    <td className="text-right pl-3">{a.tickets_ativos}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function KpiCard({ icone: Icone, label, valor, cor }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-4">
      <div className="flex items-center gap-2 mb-2">
        <Icone className={cn('w-4 h-4', cor)} />
        <span className="text-xs text-[var(--color-text-muted)]">{label}</span>
      </div>
      <p className="text-2xl font-display font-bold">{valor}</p>
    </div>
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
