# Identidades visuais do Mimo — três propostas

Página no app: **Explorar identidades** (`#/identidades`), no menu lateral e em *Mais* no celular.
Cada proposta tem uma demonstração navegável com os dados reais: `#/identidades/editorial`,
`#/identidades/soft` e `#/identidades/bold`. O seletor **A · B · C**, presente em todas as telas,
troca de identidade sem sair do lugar, mesmo no meio de uma revisão.

## Fase 1 — Análise (o que já existia)

- React 19 + Vite + TypeScript, Tailwind 3 com tokens em variáveis CSS (`src/styles/themes.css`), HashRouter, PWA.
- Dados locais em IndexedDB (Dexie) com sincronização opcional via Supabase. Hooks reativos (`useLiveQuery`).
- Flashcards: fila do dia (`services/flashcards/queue.ts`), agendamento de repetição espaçada (`scheduler.ts`,
  variante SM-2 do Anki com etapas em minutos e intervalos em dias) e registro de respostas com desfazer (`studyService.ts`).
- Estatísticas de estudo (`services/study/statsService.ts`) e de cartões (`services/flashcards/stats.ts`).

## Arquitetura: apresentação separada da lógica

```
src/identity/
  registry.ts          metadados das 3 propostas (paleta, fontes, princípios) e rotas
  store.ts             ativa os tokens no <html data-identity> e lembra a última visitada
  model/               MODELOS COMPARTILHADOS, sem nenhum estilo
    home.ts            Início: fila do dia, progresso, sequência, retenção, semana, sugestão
    decks.ts           Baralhos: contagens, maturidade, agrupamento por disciplina, lista de cartões
    review.ts          Revisão: fila, revelar, Certo/Errado, avaliar, desfazer, atalhos de teclado
    stats.ts           Estatísticas: período, ritmo, respostas, constância, previsão, por baralho
    CardContent.tsx    conteúdo do cartão (pergunta, resposta, gabarito, nota) sem moldura
  shared/              navegação, troca de identidade (View Transitions) e ações (criar/editar)
  editorial/ soft/ bold/
    *App.tsx           rotas da identidade
    Shell.tsx          navegação própria (computador e celular)
    Home, Decks, Review, Stats   as telas
    ui.tsx, charts.tsx componentes e gráficos próprios
    *.css              fontes, adaptação das janelas compartilhadas, animações
  ExplorePage.tsx      "Explorar identidades do Mimo"
  demoData.ts          baralhos de exemplo opcionais (e remoção)
```

- **Nada de regra de negócio foi duplicado ou alterado.** As três identidades chamam os mesmos serviços:
  `answerCard`, `undoAnswer`, `buildStudyQueue`, `createDeck`… O banco, a sincronização e o agendamento são os mesmos.
- **Tokens.** As paletas e fontes das propostas estão em `tailwind.config.js` (`ed-*`, `sf-*`, `bd-*`, `font-ed-serif`…).
  Enquanto uma identidade está aberta, `<html data-identity="…">` redefine também os tokens do app atual
  (`--c-*`, `--font-sans`), então as janelas compartilhadas (criar/editar cartão e baralho, avisos) herdam a identidade.
- **Carregamento sob demanda.** Cada identidade é um pacote separado (~11–13 kB gzip) e só baixa as suas fontes.
- **Adotar uma proposta como definitiva:** apontar as rotas `/`, `/flashcards…` e `/estatisticas` para as telas da
  identidade escolhida e promover os tokens dela a padrão. Os modelos compartilhados já cobrem os dados dessas telas.

## Fase 2 — Direção de arte

### A · Editorial — minimalismo sofisticado, elegância e precisão

| | |
| --- | --- |
| Conceito | O estudo como publicação: manchete, sumário, colunas assimétricas, fios finos. Maduro sem ser corporativo. |
| Tipografia | **Newsreader** (serifa com tamanho óptico) para títulos, conteúdo e números (light 300 em 44–88 px); **Inter Tight** em versaletes de 11 px, espaçamento 0,16 em, para rótulos e interface. |
| Paleta | Papel `#F6F3EE` · Tinta `#171513` · Grafite `#5B544C` · Fio `#DCD5CA` · **Bordô `#7B2D4E`** (acento único) · Musgo `#3F5A47` (retenção/acerto). |
| Grade e espaço | 12 colunas; coluna de apoio de 4/12 com fio vertical; seções numeradas (§ 01…); 56–80 px entre seções. |
| Componentes | Sem caixas. Botão retangular tinta → bordô no hover; link com sublinhado que cresce; figuras (número grande + rótulo); medidor de 3 px; sumário com linha pontilhada. |
| Ícones | Lucide com traço de 1,25 px, acompanhando a serifa. |
| Movimento | 400–900 ms, `cubic-bezier(.2,.7,.1,1)`: textos sobem 10 px, fios se desenham da esquerda. |
| Celular | Masthead compacto com A·B·C, barra inferior de texto + ícone fino com traço bordô no ativo, índice em tela cheia. |
| Revisão | A pergunta é uma "citação" de 27–36 px; a resposta entra sob um fio bordô; avaliação em quatro colunas separadas por fios. |

### B · Soft Modern — lavanda, superfícies suaves e acolhimento

| | |
| --- | --- |
| Conceito | Uma mesa de estudo calma para sessões longas: bem-estar e produtividade, sem infantilizar. |
| Tipografia | **DM Sans** (eixo óptico): títulos semibold com −0,025 em; corpo 14,5–15,5 px; números tabulares. |
| Paleta | Névoa `#F6F4FB` · Branco · Lavanda `#ECE6FC` · Lilás `#B9A6F2` · **Violeta `#6B4FD8`** · Ameixa `#2B2540`; apoios pastel para as respostas: rosa, pêssego, menta, céu. |
| Forma | Raios de 12 (controles), 18 (superfícies) e 28 px (destaques). Sombra em duas camadas com leve tom violeta. |
| Componentes | Superfície, anel de progresso, rosca, chips tonais, segmentado, marca do baralho (monograma sobre a cor escolhida). |
| Ícones | Lucide com traço de 1,75 px e pontas arredondadas, muitas vezes sobre um "azulejo" tonal. |
| Movimento | 260–460 ms com desaceleração: elevação de 2 px no hover, pressão a 98%, o cartão "assenta" ao revelar, pulsação de respiro nos estados vazios. |
| Celular | Barra flutuante com botão central de revisão (com contador); *Mais* em folha inferior com o seletor de identidade. |
| Revisão | Cartão branco grande; a resposta aparece em um painel névoa; quatro pílulas tonais com o intervalo. |

### C · Bold Minimal — contraste marcante, tipografia forte e personalidade

| | |
| --- | --- |
| Conceito | Preto, osso e dois sinais de cor. Pouca coisa na tela — tudo com presença. Ousadia sem excesso. |
| Tipografia | **Archivo** com largura expandida (125%) em peso 800–900 para títulos e números (até 200 px); **JetBrains Mono** em caixa-alta para rótulos e dados. |
| Paleta | Osso `#EEEBE4` · Preto `#0E0E10` · **Ultravioleta `#4A2BFF`** (ação) · **Sinal `#FF5A1F`** (urgência) · Cinza `#625E57` · Lavanda UV `#D8D1FF`. |
| Forma | Bordas de 2 px, cantos retos; círculos e quartos de círculo como elementos gráficos; sombra dura de 4–6 px como único relevo. |
| Componentes | Bloco do número do dia, faixa de métricas em preto, círculo de contagem, barra grossa, alternador em células. |
| Ícones | Conjunto próprio (`bold/icons.tsx`) feito só de quadrados, círculos e retas, traço de 2 px e pontas retas. |
| Movimento | Rápido e com encaixe: deslize de 280 ms, revelação em cortina (`clip-path`), deslocamento de 2 px com sombra dura no hover. |
| Celular | Barra superior preta com A·B·C; barra inferior de cinco células, ativo em bloco ultravioleta; *Mais* em tela cheia preta. |
| Revisão | Contador gigante (01/14), progresso em segmentos, resposta em bloco preto, avaliação em grade 2×2 com o número da tecla. |

## O que é igual nas três

Mesmos dados e as mesmas ações: criar/editar baralho e cartão, revisar (inclusive Certo ou Errado e lacunas),
desfazer, editar durante a revisão, atalhos (espaço, 1–4, E, Ctrl+Z), filtros e períodos. Acessibilidade:
links para pular ao conteúdo, foco visível, `aria-current`, `role="progressbar"`/`meter`, gráficos com descrição,
`prefers-reduced-motion` respeitado.

## Fase 6 — Validação

- `src/pages/__tests__/identities.test.tsx`: revisão nas três identidades grava pelo mesmo agendamento
  (mesmo intervalo de 4 dias para "Fácil" num cartão novo), telas exibem os dados reais, o seletor A·B·C troca a
  identidade mantendo a tela e os baralhos de exemplo são criados e removidos sem tocar nos dados da pessoa.
- Suíte completa, verificação de tipos e build de produção passando.
- Conferência visual em 1440 px e em iPhone 13 (390 px) de Início, Baralhos, Baralho, Revisão (antes e depois de revelar) e Estatísticas.

## Baralhos de exemplo

Opcionais, na página de comparação. Criam quatro baralhos de concurso (Direito Constitucional, Língua Portuguesa,
Informática e Saúde Pública) e simulam duas semanas de estudo chamando o próprio `answerCard` com datas passadas,
então intervalos e estatísticas são produzidos pelo algoritmo real. *Remover exemplos* apaga exatamente esses
baralhos, cartões e respostas, e as disciplinas criadas por eles que continuarem sem uso.
