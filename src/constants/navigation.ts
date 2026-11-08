import { DatabaseBackup, LayoutDashboard, Library, NotebookText, Repeat, TrendingUp, type LucideIcon } from 'lucide-react';

export interface NavItem {
  to: string;
  label: string;
  shortLabel: string;
  icon: LucideIcon;
  description: string;
}

export const NAV_ITEMS: NavItem[] = [
  { to: '/', label: 'Painel', shortLabel: 'Painel', icon: LayoutDashboard, description: 'Visão geral do seu caderno' },
  { to: '/erros', label: 'Meus Erros', shortLabel: 'Erros', icon: NotebookText, description: 'Registros por matéria e tópico' },
  { to: '/segundo-ciclo', label: 'Meu Segundo Ciclo', shortLabel: 'Revisar', icon: Repeat, description: 'Revisão inteligente' },
  { to: '/evolucao', label: 'Minha Evolução', shortLabel: 'Evolução', icon: TrendingUp, description: 'Acompanhamento do aprendizado' },
  { to: '/materias', label: 'Matérias e Tópicos', shortLabel: 'Matérias', icon: Library, description: 'Estrutura de estudos' },
  { to: '/backup', label: 'Backup e Configurações', shortLabel: 'Backup', icon: DatabaseBackup, description: 'Exportar, importar e sincronizar' },
];
