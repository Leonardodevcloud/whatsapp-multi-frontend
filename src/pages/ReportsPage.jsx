// src/pages/ReportsPage.jsx
import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Skeleton, Avatar } from '../components/ui';
import { MessageSquare, Clock, Headphones, Users } from 'lucide-react';
import { cn } from '../lib/utils';
import api from '../lib/api';

// Formatar duração detalhada (ex: 2h 14m 30s)
function fmtDur(seg) {
  if (!seg) return '-';
  seg = Math.round(seg);
  if (seg < 60) return `${seg}s`;
  if (seg < 3600) {
    const m = Math.floor(seg / 60);
    const s = seg % 60;
    return s > 0 ? `${m}m ${s}s` : `${m}m`;
  }
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = seg % 60;
  let r = `${h}h`;
  if (m > 0) r += ` ${m}m`;
  if (s > 0) r += ` ${s}s`;
  return r;
}

// Formatar duração curta para KPIs
function fmtKpi(seg) {
  if (!seg) return '-';
  if (seg < 60) return `${seg}s`;
  if (seg < 3600) return `${Math.floor(seg / 60)}min`;
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

function fmtData(dia) {
  if (!dia) return '';
  const d = new Date(dia + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function fmtNum(n) {
  return (parseInt(n) || 0).toLocaleString('pt-BR');
}

export default function ReportsPage() {
  const [periodo, setPeriodo] = useState(30);

  const { data: dashboard, isLoading } = useQuery({
    queryKey: ['dashboard', periodo],
    queryFn: () => api.get(`/api/reports/dashboard?dias=${periodo}`),
    refetchInterval: 30000,
  });

  const { data: performance } = useQuery({
    queryKey: ['performance', periodo],
    queryFn: () => api.get(`/api/reports/performance?dias=${periodo}`),
  });

  const { data: temposResp } = useQuery({
    queryKey: ['tempos-resposta', periodo],
    queryFn: () => api.get(`/api/reports/tempos-resposta?dias=${periodo}`),
  });

  const { data: contatosUnicos } = useQuery({
    queryKey: ['contatos-unicos', periodo],
    queryFn: () => api.get(`/api/reports/contatos-unicos?dias=${periodo}`),
  });

  const { data: temposDia } = useQuery({
    queryKey: ['tempos-dia', periodo],
    queryFn: () => api.get(`/api/reports/tempos-dia?dias=${periodo}`),
  });

  const { data: msgDia } = useQuery({
    queryKey: ['mensagens-dia', periodo],
    queryFn: () => api.get(`/api/reports/mensagens-dia?dias=${periodo}`),
  });

  const { data: picos } = useQuery({
    queryKey: ['picos-horario', periodo],
    queryFn: () => api.get(`/api/reports/picos-horario?dias=${periodo}`),
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
        {/* Header */}
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

        {/* KPIs principais */}
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
          <HBarChart
            titulo="Tempo médio de atendimento"
            subtitulo={`Média geral: ${fmtDur(temposDia?.tma_geral)}`}
            dados={(temposDia?.por_dia || []).map(r => ({
              label: fmtData(r.dia),
              valor: parseInt(r.tma_medio) || 0,
              display: fmtDur(r.tma_medio),
            }))}
            cor="bg-primary"
          />
          <HBarChart
            titulo="Tempo médio de espera"
            subtitulo={`Média geral: ${fmtDur(temposDia?.tpr_geral)}`}
            dados={(temposDia?.por_dia || []).map(r => ({
              label: fmtData(r.dia),
              valor: parseInt(r.tpr_medio) || 0,
              display: fmtDur(r.tpr_medio),
            }))}
            cor="bg-blue-500"
          />
        </div>

        {/* Mensagens por dia */}
        <Card>
          <h3 className="text-sm font-semibold mb-1">Quantidade de mensagens</h3>
          <p className="text-xs text-primary font-semibold mb-4">
            Total de mensagens: {fmtNum(msgDia?.total)}
          </p>
          <div className="space-y-3">
            {(msgDia?.por_dia || []).map((r) => {
              const total = parseInt(r.total) || 0;
              const enviadas = parseInt(r.enviadas) || 0;
              const recebidas = parseInt(r.recebidas) || 0;
              const maxVal = Math.max(...(msgDia?.por_dia || []).map(x => parseInt(x.total) || 1));
              const pctTotal = (total / maxVal) * 100;
              const pctEnv = (enviadas / maxVal) * 100;
              const pctRec = (recebidas / maxVal) * 100;
              return (
                <div key={r.dia} className="space-y-0.5">
                  <span className="text-2xs text-[var(--color-text-muted)] block mb-0.5">{fmtData(r.dia)}</span>
                  <BarRow cor="bg-blue-400/70" pct={pctTotal} valor={fmtNum(total)} />
                  <BarRow cor="bg-neutral-600 dark:bg-neutral-400" pct={pctEnv} valor={fmtNum(enviadas)} />
                  <BarRow cor="bg-blue-600" pct={pctRec} valor={fmtNum(recebidas)} />
                </div>
              );
            })}
          </div>
          <div className="flex items-center gap-4 mt-4 text-2xs text-[var(--color-text-muted)]">
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-400/70" /> Total</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-neutral-600 dark:bg-neutral-400" /> Enviadas</div>
            <div className="flex items-center gap-1.5"><div className="w-2.5 h-2.5 rounded-sm bg-blue-600" /> Recebidas</div>
          </div>
        </Card>

        {/* Pico de atendimento */}
        <Card>
          <h3 className="text-sm font-semibold mb-1">Pico de atendimento</h3>
          <p className="text-xs text-[var(--color-text-muted)] mb-4">Chamados por hora (08h — 19h)</p>
          <div className="flex items-end gap-1 h-40">
            {(picos || []).map((h) => {
              const max = Math.max(...(picos || []).map(x => x.chamados || 1));
              const pct = Math.max(((h.chamados || 0) / max) * 100, 3);
              return (
                <div key={h.hora} className="flex-1 group relative flex flex-col items-center">
                  <div className="absolute -top-8 bg-neutral-800 text-white text-2xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10">
                    {h.chamados} chamados · {fmtDur(h.tpr_medio)} TPR
                  </div>
                  <div className="w-full rounded-t-sm bg-primary/80 hover:bg-primary transition-colors" style={{ height: `${pct}%` }} />
                  <span className="text-2xs text-[var(--color-text-muted)] mt-1">{h.label?.slice(0, 2)}h</span>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Distribuição tempo de 1ª resposta */}
        <Card>
          <h3 className="text-sm font-semibold mb-4">Distribuição — Tempo de 1ª resposta</h3>
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
                  <tr key={a.id} className="border-b border-[var(--color-border)] last:border-0">
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

// ── Componentes auxiliares ─────────────────────────────

function Card({ children }) {
  return (
    <div className="bg-[var(--color-surface)] border border-[var(--color-border)] rounded-xl p-5">
      {children}
    </div>
  );
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

function HBarChart({ titulo, subtitulo, dados, cor }) {
  const max = Math.max(...dados.map(d => d.valor || 1));
  return (
    <Card>
      <h3 className="text-sm font-semibold mb-1">{titulo}</h3>
      {subtitulo && <p className="text-xs text-primary font-semibold mb-4">{subtitulo}</p>}
      <div className="space-y-2">
        {dados.map((d, i) => {
          const pct = Math.max(((d.valor || 0) / max) * 100, 2);
          return (
            <div key={i} className="flex items-center gap-3">
              <span className="text-2xs text-[var(--color-text-muted)] w-20 shrink-0 text-right">{d.label}</span>
              <div className="flex-1 h-5 rounded bg-[var(--color-surface-elevated)] overflow-hidden">
                <div className={cn('h-full rounded flex items-center justify-end pr-2', cor)} style={{ width: `${pct}%`, minWidth: '40px' }}>
                  <span className="text-2xs text-white font-medium whitespace-nowrap">{d.display}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function BarRow({ cor, pct, valor }) {
  return (
    <div className="h-4 rounded bg-[var(--color-surface-elevated)] overflow-hidden">
      <div className={cn('h-full rounded flex items-center justify-end pr-1.5', cor)} style={{ width: `${Math.max(pct, 2)}%`, minWidth: '30px' }}>
        <span className="text-2xs text-white font-medium">{valor}</span>
      </div>
    </div>
  );
}
