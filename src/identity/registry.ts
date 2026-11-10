/**
 * Identidades visuais do Mimo (propostas de direção de arte).
 *
 * Cada identidade é só APRESENTAÇÃO: as três leem e gravam os mesmos dados
 * (IndexedDB via Dexie) pelos mesmos serviços e hooks — o agendamento das
 * revisões, a sincronização e as regras de negócio não mudam.
 * A documentação completa da direção de arte está em docs/IDENTIDADES.md.
 */
export type IdentityId = 'editorial' | 'soft' | 'bold';

export interface Swatch {
  name: string;
  hex: string;
  role: string;
}

export interface IdentityMeta {
  id: IdentityId;
  letter: 'A' | 'B' | 'C';
  name: string;
  concept: string;
  summary: string;
  fonts: { display: string; text: string; data: string };
  palette: Swatch[];
  principles: string[];
  /** Cor da barra do navegador (meta theme-color) enquanto a identidade está ativa. */
  browserColor: string;
}

export const IDENTITIES: IdentityMeta[] = [
  {
    id: 'editorial',
    letter: 'A',
    name: 'Editorial',
    concept: 'Minimalismo sofisticado, elegância e precisão.',
    summary:
      'O estudo tratado como uma publicação: manchete, sumário, colunas assimétricas e fios finos. Serifa expressiva para o conteúdo, grotesca precisa para a interface e um único acento bordô.',
    fonts: { display: 'Newsreader', text: 'Newsreader', data: 'Inter Tight' },
    palette: [
      { name: 'Papel', hex: '#F6F3EE', role: 'Fundo' },
      { name: 'Tinta', hex: '#171513', role: 'Texto e fios fortes' },
      { name: 'Grafite', hex: '#5B544C', role: 'Texto secundário' },
      { name: 'Fio', hex: '#DCD5CA', role: 'Divisórias' },
      { name: 'Bordô', hex: '#7B2D4E', role: 'Acento único' },
      { name: 'Musgo', hex: '#3F5A47', role: 'Retenção / acerto' },
    ],
    principles: ['Hierarquia pela tipografia, não por caixas', 'Grade de 12 colunas com coluna de apoio estreita', 'Fios de 1 px e espaço em branco generoso', 'Um acento só, usado para o que pede ação'],
    browserColor: '#F6F3EE',
  },
  {
    id: 'soft',
    letter: 'B',
    name: 'Soft Modern',
    concept: 'Lavanda, superfícies suaves e acolhimento.',
    summary:
      'Uma mesa de estudo calma: superfícies brancas sobre névoa lavanda, cantos arredondados com moderação, sombras naturais e microinterações que respiram. Feita para longas sessões.',
    fonts: { display: 'DM Sans', text: 'DM Sans', data: 'DM Sans' },
    palette: [
      { name: 'Névoa', hex: '#F6F4FB', role: 'Fundo' },
      { name: 'Branco', hex: '#FFFFFF', role: 'Superfícies' },
      { name: 'Lavanda', hex: '#ECE6FC', role: 'Destaques suaves' },
      { name: 'Lilás', hex: '#B9A6F2', role: 'Apoio' },
      { name: 'Violeta', hex: '#6B4FD8', role: 'Ação principal' },
      { name: 'Ameixa', hex: '#2B2540', role: 'Texto' },
    ],
    principles: ['Contraste equilibrado, nunca gritante', 'Raios de 12, 18 e 28 px — um por nível', 'Sombra só para indicar elevação', 'Movimento curto, com desaceleração suave'],
    browserColor: '#F6F4FB',
  },
  {
    id: 'bold',
    letter: 'C',
    name: 'Bold Minimal',
    concept: 'Contraste marcante, tipografia forte e personalidade.',
    summary:
      'Preto, osso e dois sinais de cor. Títulos largos e pesados, números gigantes, geometria de círculos e quadrados e uma grade rígida. Pouca coisa na tela — tudo com presença.',
    fonts: { display: 'Archivo Expanded', text: 'Archivo', data: 'JetBrains Mono' },
    palette: [
      { name: 'Osso', hex: '#EEEBE4', role: 'Fundo' },
      { name: 'Preto', hex: '#0E0E10', role: 'Texto, blocos e bordas' },
      { name: 'Ultravioleta', hex: '#4A2BFF', role: 'Ação principal' },
      { name: 'Sinal', hex: '#FF5A1F', role: 'Urgência e alertas' },
      { name: 'Cinza', hex: '#8B877E', role: 'Texto secundário' },
      { name: 'Lavanda UV', hex: '#D8D1FF', role: 'Preenchimentos' },
    ],
    principles: ['Escala tipográfica extrema: 12 → 160 px', 'Bordas de 2 px, cantos retos', 'Cor só onde há decisão', 'Animações rápidas e com encaixe'],
    browserColor: '#EEEBE4',
  },
];

export function isIdentityId(value: unknown): value is IdentityId {
  return value === 'editorial' || value === 'soft' || value === 'bold';
}

export function getIdentity(id: IdentityId): IdentityMeta {
  return IDENTITIES.find((i) => i.id === id)!;
}

/** Telas implementadas em todas as identidades (mesmo caminho em cada uma). */
export type IdentityScreen = '' | 'baralhos' | 'revisar/todos' | 'estatisticas';

export const IDENTITY_ROOT = '/identidades';

export function identityPath(id: IdentityId, screen = ''): string {
  return `${IDENTITY_ROOT}/${id}${screen ? `/${screen.replace(/^\//, '')}` : ''}`;
}

/** Mesmo lugar em outra identidade: /identidades/editorial/baralhos/x → /identidades/soft/baralhos/x. */
export function switchIdentityPath(pathname: string, search: string, to: IdentityId): string {
  const match = pathname.match(/^\/identidades\/(editorial|soft|bold)(\/.*)?$/);
  const rest = match?.[2] ?? '';
  return `${IDENTITY_ROOT}/${to}${rest}${search}`;
}
