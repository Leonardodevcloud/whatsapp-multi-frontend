// src/lib/utils.js
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export function cn(...classes) {
  return classes.filter(Boolean).join(' ');
}

export function formatarTelefone(telefone) {
  if (!telefone) return '';
  const limpo = telefone.replace(/\D/g, '');
  if (limpo.length === 13) {
    return `+${limpo.slice(0, 2)} (${limpo.slice(2, 4)}) ${limpo.slice(4, 9)}-${limpo.slice(9)}`;
  }
  return telefone;
}

export function formatarDataRelativa(data) {
  if (!data) return '';
  const d = new Date(data);
  return formatDistanceToNow(d, { addSuffix: true, locale: ptBR });
}

export function formatarDataMensagem(data) {
  if (!data) return '';
  const d = new Date(data);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return `Ontem ${format(d, 'HH:mm')}`;
  return format(d, 'dd/MM HH:mm');
}

export function formatarDataTicket(data) {
  if (!data) return '';
  const d = new Date(data);
  if (isToday(d)) return format(d, 'HH:mm');
  if (isYesterday(d)) return 'Ontem';
  return format(d, 'dd/MM/yy');
}

export function formatarDuracao(segundos) {
  if (!segundos) return '-';
  if (segundos < 60) return `${segundos}s`;
  if (segundos < 3600) return `${Math.floor(segundos / 60)}min`;
  const h = Math.floor(segundos / 3600);
  const m = Math.floor((segundos % 3600) / 60);
  return `${h}h${m > 0 ? ` ${m}min` : ''}`;
}

export function iniciais(nome) {
  if (!nome) return '?';
  return nome
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
    .toUpperCase();
}

export function corStatus(status) {
  const cores = {
    pendente: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
    aberto: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
    aguardando: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
    resolvido: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    fechado: 'bg-neutral-100 text-neutral-500 dark:bg-neutral-800 dark:text-neutral-400',
  };
  return cores[status] || cores.pendente;
}

export function corPrioridade(prioridade) {
  const cores = {
    baixa: 'text-neutral-400',
    normal: 'text-blue-500',
    alta: 'text-orange-500',
    urgente: 'text-red-500',
  };
  return cores[prioridade] || cores.normal;
}
