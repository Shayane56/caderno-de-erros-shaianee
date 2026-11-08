import { Flame, RotateCcw, CircleCheckBig, type LucideIcon } from 'lucide-react';
import type { Priority } from '@/types';

export interface PriorityMeta {
  id: Priority;
  label: string;
  shortLabel: string;
  emoji: string;
  description: string;
  details: string[];
  icon: LucideIcon;
  /** Cor principal (gráficos, marcadores). */
  color: string;
  /** Classes utilitárias para badges. */
  badgeClass: string;
  dotClass: string;
}

export const PRIORITIES: Record<Priority, PriorityMeta> = {
  alta: {
    id: 'alta',
    label: 'Prioridade alta',
    shortLabel: 'Alta',
    emoji: '🔴',
    description: 'Exige atenção imediata.',
    details: [
      'Erros persistentes',
      'Conteúdos ainda não dominados',
      'Dificuldades recorrentes',
      'Assuntos que exigem atenção imediata',
    ],
    icon: Flame,
    color: '#DC2626',
    badgeClass: 'bg-red-50 text-red-700 ring-red-200',
    dotClass: 'bg-red-500',
  },
  media: {
    id: 'media',
    label: 'Prioridade média',
    shortLabel: 'Média',
    emoji: '🟡',
    description: 'Compreendido, mas precisa de reforço.',
    details: [
      'Erros já compreendidos',
      'Conteúdos que precisam de reforço',
      'Assuntos que merecem revisão',
    ],
    icon: RotateCcw,
    color: '#EDA100',
    badgeClass: 'bg-amber-50 text-amber-800 ring-amber-200',
    dotClass: 'bg-amber-400',
  },
  superado: {
    id: 'superado',
    label: 'Superado',
    shortLabel: 'Superado',
    emoji: '🟢',
    description: 'Domínio demonstrado em novas questões.',
    details: [
      'Erros corrigidos',
      'Conteúdos compreendidos',
      'Domínio demonstrado por meio de novas questões',
    ],
    icon: CircleCheckBig,
    color: '#15803D',
    badgeClass: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
    dotClass: 'bg-emerald-500',
  },
};

export const PRIORITY_ORDER: Priority[] = ['alta', 'media', 'superado'];

export function isPriority(value: unknown): value is Priority {
  return value === 'alta' || value === 'media' || value === 'superado';
}
