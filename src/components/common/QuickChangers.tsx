import { PRIORITIES, PRIORITY_ORDER } from '@/constants/priorities';
import { ORIGINS, ORIGIN_ORDER } from '@/constants/origins';
import type { ErrorRecord, OriginId, Priority } from '@/types';
import { changeOrigin, changePriority } from '@/services/errorService';
import { errorMessage } from '@/services/errors';
import { cn } from '@/utils/cn';
import { OriginBadge, OriginIcon, PriorityBadge } from './Badges';
import { QuickMenu } from './QuickMenu';
import { useToast } from './Toast';

export function PriorityQuickMenu({ record }: { record: ErrorRecord }) {
  const toast = useToast();
  const onSelect = async (priority: Priority) => {
    try {
      await changePriority(record.id, priority);
      toast.success('Classificação atualizada', `Agora: ${PRIORITIES[priority].label}.`);
    } catch (error) {
      toast.error('Não foi possível alterar a prioridade', errorMessage(error));
    }
  };
  return (
    <QuickMenu
      label={`Alterar prioridade (atual: ${PRIORITIES[record.priority].label})`}
      menuTitle="Classificação"
      value={record.priority}
      onSelect={onSelect}
      trigger={<PriorityBadge priority={record.priority} />}
      options={PRIORITY_ORDER.map((id) => ({
        value: id,
        label: PRIORITIES[id].label,
        description: PRIORITIES[id].description,
        icon: <span className={cn('h-2.5 w-2.5 shrink-0 rounded-full', PRIORITIES[id].dotClass)} aria-hidden />,
      }))}
    />
  );
}

export function OriginQuickMenu({ record }: { record: ErrorRecord }) {
  const toast = useToast();
  const onSelect = async (origin: OriginId) => {
    try {
      await changeOrigin(record.id, origin);
      toast.success('Origem do erro atualizada', `Agora: ${ORIGINS[origin].label}.`);
    } catch (error) {
      toast.error('Não foi possível alterar a origem', errorMessage(error));
    }
  };
  return (
    <QuickMenu
      label={`Alterar origem do erro (atual: ${record.origin ? ORIGINS[record.origin].label : 'Não classificado'})`}
      menuTitle="Origem do erro"
      value={record.origin}
      onSelect={onSelect}
      trigger={<OriginBadge origin={record.origin} short />}
      options={ORIGIN_ORDER.map((id) => ({
        value: id,
        label: ORIGINS[id].label,
        description: ORIGINS[id].question,
        icon: <OriginIcon origin={id} size="sm" />,
      }))}
    />
  );
}
