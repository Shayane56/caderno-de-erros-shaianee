import { ChartColumnIncreasing, House, Layers, Library, ListChecks, NotebookText, Repeat, Settings, Timer, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Início', shortLabel: 'Início', icon: House, description: 'Seu resumo do dia' },
  { to: '/erros', label: 'Caderno de Erros', shortLabel: 'Erros', icon: NotebookText, description: 'Registros por matéria e tópico' },
  { to: '/segundo-ciclo', label: 'Segundo Ciclo', shortLabel: 'Revisar', icon: Repeat, description: 'Revisão dos erros pendentes' },
  { to: '/questoes', label: 'Banco de Questões', shortLabel: 'Questões', icon: ListChecks, description: 'Resolva questões de todas as bancas' },
  { to: '/flashcards', label: 'Meus Baralhos', shortLabel: 'Cards', icon: Layers, description: 'Flashcards com repetição espaçada' },
  { to: '/estatisticas', label: 'Estatísticas', shortLabel: 'Estatísticas', icon: ChartColumnIncreasing, description: 'Seu progresso e pontos fracos' },
  { to: '/foco', label: 'Modo Foco', shortLabel: 'Foco', icon: Timer, description: 'Sessões de estudo cronometradas' },
  { to: '/materias', label: 'Matérias e Tópicos', shortLabel: 'Matérias', icon: Library, description: 'Estrutura de estudos' },
  { to: '/backup', label: 'Configurações', shortLabel: 'Ajustes', icon: Settings, description: 'Aparência, backup e sincronização' },
];
