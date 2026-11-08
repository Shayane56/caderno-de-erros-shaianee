# Caderno de Erros — Shaiane Carvalho 💗

> *Transformando dificuldades em aprendizado e erros em acertos.*
> *A aprovação também é construída a partir dos erros que você aprende a não repetir.*

Aplicação web (PWA) para registrar, classificar, revisar e acompanhar os erros cometidos na preparação para
concursos públicos. Funciona **offline**, guarda os dados no próprio dispositivo (IndexedDB), pode ser
**instalada** no celular ou no computador e, opcionalmente, **sincroniza** entre dispositivos via Supabase.

---

## Sumário

- [Como iniciar](#como-iniciar)
- [Funcionalidades](#funcionalidades)
- [Flashcards](#flashcards)
- [Como fazer backups](#como-fazer-backups)
- [Instalar como aplicativo (PWA)](#instalar-como-aplicativo-pwa)
- [Publicar na internet](#publicar-na-internet)
- [Sincronização em nuvem](#sincronização-em-nuvem)
- [O que está pronto e o que depende de configuração externa](#o-que-está-pronto-e-o-que-depende-de-configuração-externa)
- [Testes](#testes)
- [Arquitetura](#arquitetura)

## Como iniciar

Pré-requisito: [Node.js](https://nodejs.org) 20 ou superior.

```bash
npm install        # instala as dependências
npm run dev        # ambiente de desenvolvimento → http://localhost:5173
```

Versão de produção (com Service Worker e funcionamento offline):

```bash
npm run build      # gera a pasta dist/
npm run preview    # serve a versão de produção → http://localhost:4173
```

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com recarga automática |
| `npm run build` | Verificação de tipos (TypeScript) + build de produção |
| `npm run preview` | Serve o build de produção localmente |
| `npm test` | Executa os testes automatizados (Vitest + Testing Library) |
| `npm run typecheck` | Verificação de tipos |
| `npm run e2e` | Testes de ponta a ponta em navegador real (requer Playwright) |
| `npm run icons` | Regenera os ícones PNG do PWA (requer Playwright) |

## Funcionalidades

**Painel** — cartões com total de erros, matérias, prioridade alta, média, superados e percentual de
superação; gráficos de erros por matéria, distribuição por prioridade e por origem, evolução ao longo do
tempo e pendentes × superados; últimos registros, matérias e tópicos com mais dificuldades, erros que
precisam de revisão e mensagem motivacional. Todos os números vêm do banco de dados e se atualizam sozinhos.

**Registrar novo erro** — matéria, tópico, descrição, correção, como evitar, prioridade, origem, questão de
referência (opcional), observações (opcional) e data automática. Matérias e tópicos podem ser criados sem sair
do formulário. Validação de todos os campos obrigatórios. Botão *Salvar e registrar outro* para cadastro rápido.

**Classificações** (independentes entre si):

| Prioridade | Origem do erro |
| --- | --- |
| 🔴 Prioridade alta | Desconhecimento |
| 🟡 Prioridade média | Confusão entre conceitos |
| 🟢 Superado | Esquecimento |
| | Erro de interpretação |

Registros antigos ou importados sem origem aparecem como **Não classificado** — nenhuma categoria é atribuída
automaticamente.

**Meus Erros** — organização *Matéria → Tópico → Registros*; ver detalhes, editar, excluir (com
confirmação), alterar prioridade e origem diretamente na lista; pesquisa (descrição, correção, como evitar,
tópico, matéria, observações e referência; sem diferenciar acentos; `"aspas"` para expressões) e filtros
combináveis por matéria, tópico, prioridade, origem e período, com botão para limpar tudo. Os filtros ficam na
URL, então links do painel abrem a lista já filtrada.

**Detalhes do registro** — todas as informações, estratégia de estudo sugerida para a origem do erro e
**histórico completo de alterações** (criação, edições, mudanças de prioridade/origem, revisões, importações e
transferências).

**Meu Segundo Ciclo** — revisão dos erros não superados, separados em prioridade alta e média, com matérias e
tópicos de maior concentração e os erros há mais tempo sem revisão. Em *Revisar erro* a correção fica oculta até
**Revelar correção**; depois é possível manter em prioridade alta, passar para média ou marcar como superado.
Cada revisão é registrada; erros superados permanecem salvos.

**Meus Flashcards (estilo Anki)** — baralhos desenhados como cadernos de espiral (cor, estampa, adesivo,
elástico ou foto de capa) e cartões escritos em folhas de caderno. Detalhes em [Flashcards](#flashcards).

**Minha Evolução** — indicadores, evolução dos registros e dos superados (por dia, semana ou mês), distribuição
por matéria e prioridade, comparação entre dificuldades identificadas e superadas e **análise das origens**
(quantidade, percentual sobre os classificados, origem mais frequente e onde concentrar esforços). O aumento de
registros não é tratado como piora: ele representa dificuldades identificadas.

**Matérias e Tópicos** — criar, renomear e excluir; contagem de erros por matéria e tópico; bloqueio de
duplicações (ignora maiúsculas, acentos e espaços). Ao excluir algo com registros vinculados, as consequências
são exibidas e é preciso escolher entre **transferir** os registros ou **excluí-los** explicitamente (com ponto
de restauração automático).

**Seu nome no caderno** — na primeira abertura em cada aparelho, o app pergunta "Qual é o seu nome?" e passa a
usá-lo no "Bom dia" do Painel, no menu, no título da página e nos backups (dá para trocar em *Backup e
Configurações → Personalização*). Não há login: cada aparelho/navegador tem o seu próprio caderno, então outra
pessoa pode usar o mesmo link no celular dela sem ver os seus dados.

**Mensagens motivacionais** — 35 mensagens; uma por abertura do aplicativo, nunca repetindo a da abertura
anterior (o identificador é guardado no LocalStorage).

**Backup e Configurações** — exportação/importação JSON, pontos de restauração, sincronização em nuvem, estado
do armazenamento, instalação do aplicativo, troca do avatar por fotografia e **Aparência**: 5 temas de cores
(Rosa Premium, Lavanda, Pêssego, Menta e Céu), modo claro/escuro/automático e o estilo padrão das folhas dos
flashcards (papel, cor do papel, letra, tamanho do texto e marca-texto).

**Acessibilidade e responsividade** — menu lateral no computador; navegação inferior com botão central de
registro no celular; testado sem rolagem horizontal de 360 px a 1920 px; gráficos com alternativa em tabela;
navegação por teclado; respeito a *reduzir movimento*.

## Flashcards

Um "Anki" dentro do caderno, em **Meus Flashcards** (menu lateral ou aba **Cards** no celular).

**Tipos de cartão**

| Tipo | Como funciona |
| --- | --- |
| Frente e verso | Pergunta e resposta. Opcional: *também estudar ao contrário* (cria a face inversa). |
| Lacunas | Selecione um trecho e toque em **Lacuna** → `{{c1::trecho}}`. Cada número vira uma face estudada separadamente; **Mesma** esconde vários trechos juntos. Dica opcional: `{{c1::resposta::dica}}`. |
| Certo ou Errado | Afirmação no estilo Cebraspe com gabarito e justificativa. Você responde *Certo*/*Errado* antes de ver o gabarito; se errar, o cartão volta como "Errei". |

Todos aceitam **imagem** na frente e no verso (botão ou **Ctrl+V** com um print) e uma **anotação** no verso.

**Marca-texto e formatação** — barra com negrito (`**texto**`), itálico (`*texto*`), sublinhado (`__texto__`) e
marca-texto em 6 cores (`==texto==` usa a cor padrão; `==verde:texto==`, `==rosa:texto==`…). Atalhos: Ctrl+B,
Ctrl+I, Ctrl+U, Ctrl+H (marca-texto) e Ctrl+Shift+C (lacuna).

**Estudo (repetição espaçada)** — algoritmo SM-2, o mesmo princípio do Anki: cartões novos passam por etapas de
1 e 10 minutos; depois os intervalos crescem em dias conforme a facilidade de cada cartão. Botões **Errei ·
Difícil · Bom · Fácil** mostram o próximo intervalo. Limites diários por baralho (padrão: 20 novos e 200
revisões), dia de estudo que vira às 4h, faces irmãs (inverso/outras lacunas) adiadas para o dia seguinte,
**desfazer** (Ctrl+Z), editar durante o estudo (E) e **Treino livre** para revisar tudo antes da prova sem mexer
no agendamento. Atalhos: espaço revela/“Bom”, 1–4 respondem.

**Integração com o caderno de erros** — botão **Virar flashcard** em cada erro (frente = descrição + questão,
verso = correção, anotação = "como evitar"), e **Transformar erros em cartões** para criar em lote por matéria e
prioridade (sem duplicar). Cada matéria ganha automaticamente o seu baralho.

**Acompanhamento** — contadores do dia (novos · aprendendo · revisar), dias seguidos de estudo, percentual de
acerto nas revisões (30 dias), constância das últimas 4 semanas e, por baralho, cartões novos, aprendendo,
jovens e maduros. Cartões podem ser pesquisados, filtrados, suspensos, reiniciados ou excluídos.

Baralhos, cartões (com imagens e progresso) e respostas entram no **backup JSON** (formato v3; backups antigos
continuam aceitos), nos **pontos de restauração** e na **sincronização em nuvem**.

> Já usa a sincronização? Execute novamente o [docs/supabase.sql](docs/supabase.sql) no Supabase (é seguro
> repetir) para o banco na nuvem aceitar os flashcards.

## Como fazer backups

**Exportar:** *Backup e Configurações → Exportar backup (JSON)*. O arquivo
`caderno-de-erros-backup-AAAA-MM-DD-HHMM.json` contém matérias, tópicos, erros (com prioridades, origens e
datas), histórico de alterações e revisões. Guarde-o no Google Drive, OneDrive, e-mail ou pendrive. O painel
avisa quando o último backup tem mais de 7 dias.

**Importar:** *Backup e Configurações → Importar backup → Selecionar arquivo JSON*. Antes de qualquer
alteração, o aplicativo valida o arquivo e mostra um **resumo** (novos, atualizados, já existentes e itens
inválidos ignorados). Escolha:

- **Mesclar com os dados existentes** (recomendado): nada do que existe é apagado; registros com o mesmo
  identificador ficam com a versão mais recente; matérias/tópicos com o mesmo nome são unificados; erros
  idênticos não são duplicados.
- **Substituir os dados existentes**: exige digitar `SUBSTITUIR` para confirmar. Um **ponto de restauração** é
  criado antes.

**Pontos de restauração:** criados automaticamente antes de substituir dados, excluir matéria/tópico com
registros ou restaurar outro ponto (os 5 mais recentes são mantidos). Podem ser restaurados ou baixados como
JSON.

Arquivos de versões antigas (sem origem do erro, histórico ou revisões) são aceitos; registros sem origem ficam
como *Não classificado*.

## Instalar como aplicativo (PWA)

Depois de abrir o aplicativo publicado (HTTPS) uma vez, ele funciona sem internet.

- **Android / Chrome / Edge:** menu ⋮ → *Instalar aplicativo* (ou botão **Instalar** em *Backup e
  Configurações*).
- **iPhone / iPad (Safari):** botão *Compartilhar* → *Adicionar à Tela de Início*.
- **Computador (Chrome/Edge):** ícone de instalação na barra de endereço.

O modo offline não depende da sincronização em nuvem. Quando houver uma nova versão, aparece o aviso
*Nova versão disponível — Atualizar*; atualizar o aplicativo **não** apaga dados.

## Publicar na internet

O projeto usa caminhos relativos e `HashRouter`, então a pasta `dist/` funciona em qualquer hospedagem
estática (GitHub Pages, Netlify, Vercel, Cloudflare Pages…).

**GitHub Pages (já configurado):** o workflow `.github/workflows/deploy-pages.yml` publica automaticamente a
cada atualização da branch `main`. Para ativar: *Settings → Pages → Build and deployment → Source:
GitHub Actions*. O endereço ficará como `https://SEU-USUARIO.github.io/caderno-de-erros-shaianee/`.

> Os dados ficam no navegador de cada dispositivo **e são separados por endereço**: ao trocar de endereço
> (ou de navegador), exporte um backup e importe no novo local — ou ative a sincronização.

## Sincronização em nuvem

Camada opcional e independente, implementada com Supabase (gratuito): autenticação por e-mail e senha,
sincronização entre dispositivos, resolução de conflitos (a alteração mais recente vence), propagação de
exclusões, unificação de matérias/tópicos duplicados, proteção por segurança em nível de linha (RLS), indicador
de estado real e tratamento de falhas de conexão (alterações ficam pendentes e são reenviadas).

Passo a passo completo: **[docs/SINCRONIZACAO.md](docs/SINCRONIZACAO.md)** · Script do banco:
**[docs/supabase.sql](docs/supabase.sql)**.

## O que está pronto e o que depende de configuração externa

| Recurso | Situação |
| --- | --- |
| Cadastro, edição, exclusão, prioridades e origens | ✅ Completo |
| Matérias e tópicos personalizáveis | ✅ Completo |
| Meus Erros: hierarquia, pesquisa e filtros combinados | ✅ Completo |
| Segundo Ciclo com correção oculta e histórico de revisões | ✅ Completo |
| Painel e Minha Evolução com estatísticas reais | ✅ Completo |
| Banco local IndexedDB com versionamento e migração | ✅ Completo |
| Flashcards com repetição espaçada, lacunas, certo/errado, imagens e marca-texto | ✅ Completo |
| Temas de cores, modo escuro e personalização de baralhos | ✅ Completo |
| Backup JSON (exportar/importar/validar/mesclar/substituir) e pontos de restauração | ✅ Completo |
| PWA instalável e funcionamento offline | ✅ Completo (instalação requer HTTPS ou `localhost`) |
| Publicação automática no GitHub Pages | ⚙️ Requer ativar o Pages no repositório (1 clique) |
| Sincronização em nuvem | ⚙️ Implementada; requer criar um projeto Supabase gratuito e informar URL + chave |

## Testes

```bash
npm test
```

98 testes automatizados (Vitest + React Testing Library + fake-indexeddb) cobrindo: cadastro, edição e
exclusão; validação de formulários (unidade e interface); matérias e tópicos (duplicação, exclusão com
transferência ou em cascata); alteração de prioridade e de origem (serviço e interface); filtros combinados e
pesquisa; Segundo Ciclo (fila, correção oculta, revelar, marcar como superado); cálculos estatísticos;
persistência no IndexedDB (fechar e reabrir o banco); exportação e importação JSON; dados inválidos; migração do
banco v1 → v2 e de backups antigos sem origem; mensagens motivacionais; motor de sincronização (envio inicial,
conflitos, exclusões, falha de conexão e unificação de duplicados); flashcards (algoritmo de repetição espaçada,
lacunas, marca-texto, fila do dia com limites e faces irmãs, desfazer, geração a partir dos erros, backup e
sincronização, telas de estudo e editor).

Teste de ponta a ponta em navegador real (Chromium), incluindo persistência após recarregar, exportação e
importação de arquivos, telas de 360 px a 1920 px, iPhone/Android e funcionamento offline com Service Worker:

```bash
npm i -D playwright && npx playwright install chromium   # apenas na primeira vez
npm run build && npx vite preview --port 4173 &
npm run e2e                                             # capturas de tela em e2e-output/
```

## Arquitetura

```
src/
├── components/
│   ├── cards/        # StatCard, ErrorCard, ErrorListItem
│   ├── charts/       # gráficos (Recharts) com alternativa em tabela
│   ├── common/       # Button, Modal, ConfirmDialog, Toast, Badges, QuickMenu, Avatar…
│   ├── dashboard/    # HeroCard, MotivationCard, DifficultyList, FlashcardsTodayCard
│   ├── flashcards/   # folha do cartão, capa de caderno, editor com marca-texto/lacunas, personalização
│   ├── forms/        # ErrorForm, campos, seletores de prioridade/origem, filtros
│   ├── layout/       # AppLayout, Sidebar, navegação mobile, SyncIndicator, DatabaseGate
│   └── modals/       # formulário de erro (contexto), exclusões com consequências
├── constants/        # prioridades, origens, mensagens motivacionais, navegação, cores
├── database/         # Dexie (IndexedDB): esquema versionado, migrações, rastreio de alterações
├── hooks/            # consultas reativas (useLiveQuery), sincronização, mídia, conexão
├── pages/            # Dashboard, MeusErros, SegundoCiclo, Flashcards, MinhaEvolucao, MateriasTopicos, BackupConfiguracoes
├── routes/           # rotas com carregamento sob demanda
├── services/         # regras de negócio: erros, matérias, tópicos, backup, snapshots, aparência, PWA, sync/, flashcards/
├── test/             # configuração e utilitários de teste
├── types/            # entidades e tipos do domínio
└── utils/            # estatísticas, filtros/pesquisa, validação, datas, texto
```

- **Dados:** toda escrita passa pelos serviços (`src/services`), dentro de transações do IndexedDB, registrando
  histórico e marcando alterações pendentes para a sincronização. A interface lê os dados com consultas
  reativas, por isso indicadores, gráficos e listas se atualizam imediatamente.
- **Versionamento do banco:** `src/database/db.ts` mantém todas as versões do esquema; a migração v1 → v2
  completa campos novos sem descartar registros; a v3 adiciona as tabelas de flashcards. Falhas de abertura (navegação privada, falta de espaço, outra aba
  bloqueando a atualização) são exibidas com orientação, sem apagar dados. O aplicativo solicita
  *armazenamento persistente* ao navegador.
- **Preferências simples** (última mensagem motivacional, último backup, configuração da nuvem, aparência) ficam
  no LocalStorage.
- **Temas:** as cores do Tailwind vêm de variáveis CSS (`src/styles/themes.css`); trocar o tema ou ativar o modo
  escuro muda apenas o atributo `data-theme`/classe `dark` do `<html>`.
- **Tecnologias:** React 19, TypeScript, Vite, Tailwind CSS, Dexie.js, Recharts, Lucide React, React Router,
  vite-plugin-pwa (Workbox), Supabase JS (carregado sob demanda), Vitest e Testing Library.
