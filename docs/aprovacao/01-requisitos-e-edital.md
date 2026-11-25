# 01 — Requisitos e edital

## 1. Análise dos requisitos

### 1.1 Natureza do produto

- **Uso pessoal e exclusivo** (uma usuária). Nada de multi-inquilino, planos, turmas, painel de professor ou
  cobrança. A segurança continua rigorosa (RLS por `user_id`) para que um link vazado não exponha nada.
- **Ambiente central de preparação até a aprovação**: precisa ser confiável no dia a dia (celular Android, PWA),
  rápido de abrir e sem perder progresso.
- **Funcional de verdade**: todo botão faz algo; todo número vem do banco de dados; nenhum dado fictício
  apresentado como real.
- **Edital como fonte de verdade**: tudo (edital verticalizado, cronograma, pesos, simulado oficial, filtros de
  questões, RAG) deriva do edital cadastrado e versionado.

### 1.2 Requisitos funcionais por módulo (resumo rastreável)

| # | Módulo | Requisitos-chave | Depende de |
| --- | --- | --- | --- |
| 3.1 | Dashboard | saudação, progresso, meta diária, tempo de estudo, disciplinas em andamento, revisões pendentes, questões e % acerto, próximas atividades, calendário, atalhos | todos os módulos (só leitura) |
| 3.2 | Edital verticalizado | hierarquia disciplina → assunto → subtópico; status (não iniciado / estudando / concluído / revisar); data, horas, anotações; vínculos com materiais, questões e flashcards; histórico de revisões; desempenho por item; % por disciplina e geral | edital cadastrado |
| 3.3 | Cronograma | disponibilidade diária, metas, distribuição automática ponderada por peso na prova + desempenho + dificuldade, sessões por assunto, revisões programadas, reorganização de atrasos, calendário semanal/mensal, registro do tempo real | 3.2, 3.11 |
| 3.4 | Materiais | PDFs, apostilas, resumos, mapas mentais, legislação, anotações; organização por disciplina/assunto/subtópico; busca, filtros, vínculo com o edital | 3.2, Storage |
| 3.5 | Sala de estudos com IA | explicar, simplificar, exemplos, resumos, mapas mentais (texto/visual), comparações, dúvidas, exercícios, sugestões de revisão, análise de materiais, adaptação ao nível | 3.4, IA, RAG |
| 3.6 | Banco de questões | filtros (disciplina, assunto, subtópico, dificuldade, banca, fonte, situação); enunciado, alternativas, gabarito, comentário, justificativa de cada incorreta, referência, selo original × IA; favoritar, observar, refazer erradas, não respondidas; alimenta estatísticas e caderno de erros | 3.2 |
| 3.7 | Gerador de questões IA | baseado no edital e no perfil IBAM; 4 alternativas; dificuldade variada; sem ambiguidade; gabarito comentado; todas as alternativas justificadas; referência; selo IA; fila de aprovação configurável | IA, RAG, 3.6 |
| 3.8 | Simulados | completo, por disciplina, por assunto, personalizado, inéditas, provas anteriores; cronômetro, navegação, marcação; correção automática; **formato oficial idêntico ao edital**; nada revelado durante a prova; relatório completo e comparação histórica | 3.6, edital |
| 3.9 | Flashcards | manual, IA, a partir de PDF/texto, vínculo ao edital, edição, baralhos, favoritos, histórico; **FSRS**; filas vencidos/novos/estudo livre; limite diário de novos; pausar/retomar; desfazer | 3.2, IA |
| 3.10 | Caderno de erros | registro automático (questão, disciplina, assunto, data, resposta escolhida, correta, justificativa, observações); categorias (falta de conhecimento, desatenção, interpretação, confusão conceitual); listas de revisão por recorrência | 3.6, 3.8 |
| 3.11 | Estatísticas | horas, questões, % acerto, por disciplina e assunto, evolução semanal/mensal, simulados, dificuldades, dominados, revisões, progresso do edital; gráficos; análise e sugestões da IA | todos |
| 3.12 | Acompanhamento do concurso | inscrição, datas, retificações, publicações, convocações, resultado, títulos, Curso de Formação Inicial, demais etapas; documentos | edital, Storage |

### 1.3 Requisitos de IA (transversais)

1. Acesso **contextual** aos dados da usuária (edital, materiais, desempenho, erros) via ferramentas
   controladas pelo servidor — não um chatbot isolado.
2. **RAG** sobre edital, materiais e legislação cadastrados.
3. **Citações obrigatórias** em informação jurídica (lei + artigo), vindas de documento cadastrado.
4. **Proibido inventar** leis, artigos, citações, gabaritos ou referências; reconhecer quando não há base.
5. Questões geradas **sempre identificadas como IA**; nunca apresentadas como oficiais.

### 1.4 Requisitos não funcionais

| Requisito | Como será atendido |
| --- | --- |
| Persistência e progresso entre sessões | PostgreSQL (Supabase) como fonte de verdade; gravações otimistas com confirmação |
| Responsivo, prioridade Android | *mobile-first*, navegação inferior, alvos de toque ≥ 44 px, testes em 360 px |
| PWA instalável | manifesto + service worker (Serwist); cache offline de leitura e fila de revisões offline (Fase 9) |
| Tratamento de erros e carregamento | `error.tsx`/`loading.tsx` por rota, *skeletons*, toasts, mensagens em português |
| Segurança | Supabase Auth; RLS em todas as tabelas; chaves só no servidor; validação Zod em toda entrada |
| Testes | Vitest (regras de negócio puras), testes de banco (RLS), Playwright (fluxos críticos) |
| Documentação | esta pasta + `CLAUDE.md` + comentários nas regras de negócio não óbvias |
| Expansão | módulos por *feature*, domínio puro separado de IO, migrações SQL versionadas |

### 1.5 Fora do escopo (decidido)

Multiusuário, papéis/permissões administrativas, pagamentos, comunidade/ranking, apps nativos de loja,
*scraping* de sites de questões, publicação de questões de terceiros.

---

## 2. Edital — o que se sabe e o que falta

### 2.1 Situação

O PDF oficial **não foi analisado** (motivos no [README](README.md#pendência-bloqueante-o-edital)). Nenhum dado
abaixo foi cadastrado no sistema; servem apenas para orientar o planejamento e **devem ser conferidos** no
documento oficial.

### 2.2 Informações de fontes secundárias (NÃO CONFIRMADAS)

| Informação | Valor divulgado | Fonte | Situação |
| --- | --- | --- | --- |
| Documento | Edital de Processo Seletivo Público nº 001/2026 (Saúde) | site da Prefeitura (título do PDF) | conferir |
| Banca | IBAM — Instituto Brasileiro de Administração Municipal | notícias | conferir |
| Publicação | 10/11/2026 | notícias | conferir |
| Vagas ACE | 84 (4 reservadas a PcD) + cadastro reserva; 217 no total com ACS | notícias | conferir |
| Escolaridade / salário / jornada | Ensino médio completo · R$ 3.242,00 · 40 h semanais | notícias | conferir |
| Inscrições | 17/11/2026 a 22/12/2026, somente pela internet (site do IBAM). **Uma fonte divergente cita 17 a 19/11** | notícias | ⚠️ divergente — conferir |
| Etapas | 1) Prova objetiva (IBAM, eliminatória e classificatória); 2) Análise de títulos (IBAM, classificatória, máx. 8 pontos); 3) Curso de Formação Inicial (Secretaria de Saúde, eliminatório) | notícias | conferir |
| Prova objetiva | 31/01/2027, à tarde: portões 14h–15h, início 15h10, término 18h10 (3 h) | notícias | conferir |
| Estrutura da prova | 40 questões; total de 90 pontos; aprovação com ≥ 54 pontos (60%) e sem zerar disciplina | notícias | conferir (40 questões e 90 pontos implicam **pesos diferentes por disciplina** — ponto crítico) |
| Alternativas | 4 (informado na especificação do projeto) | especificação | conferir |
| Validade | 2 anos, prorrogável uma vez por igual período | notícias | conferir |

**Não encontrado em nenhuma fonte:** disciplinas, número de questões e valor por disciplina, conteúdo
programático, bibliografia/legislação, critérios de desempate, tabela de títulos, carga horária e critérios do
Curso de Formação Inicial, cronograma completo (recursos, gabaritos, resultados, convocações).

Fontes consultadas: [PDF oficial — Prefeitura](https://www.saquarema.rj.gov.br/wp-content/uploads/2026/11/EDITAL-PROCESSO-SELETIVO-001-2026-SAUDE.pdf)
(inacessível no ambiente), [IBAM](https://www.ibam-concursos.org.br/),
[Concursos no Brasil](https://concursosnobrasil.com/concursos/rj/2026/11/11/rj-prefeitura-de-saquarema-preenchera-217-vagas-em-processo-seletivo),
[Degrau Cultural](https://degraucultural.com.br/noticia/concurso-saquarema-rj-saiu-edital-para-217-vagas-nivel-medio),
[Conexão Fluminense](https://conexaofluminense.com.br/saquarema-abre-selecao-com-217-vagas-na-saude/),
[Maricá Info](https://maricainfo.com/saude/saquarema-abre-processo-seletivo-com-217-vagas-e-salario-de-r-3-242/),
[Ache Concursos](https://www.acheconcursos.com.br/concursos-rio-de-janeiro/edital-saquarema-rj-2026-abre-concurso-para-agente-de-saude-94572).

### 2.3 Roteiro de extração (quando o PDF chegar)

O edital será convertido em um **arquivo de dados revisável** (`aprovacao-saquarema/data/edital/edital-001-2026.json`),
validado por esquema Zod e carregado no banco por *seed*. Cada item guarda a **página de origem** e, quando
houver dúvida, um campo `conferir` com o motivo — exibido na interface como selo "Conferir no edital".

Checklist de extração (todos obrigatórios; ausência = sinalizar, nunca preencher por suposição):

1. Identificação: número, órgão, banca, data de publicação, hash SHA-256 do PDF.
2. Cargo ACE: código, vagas (ampla/PcD/outras cotas), requisitos, remuneração, jornada, lotação.
3. Cronograma completo, item a item, com datas e horários.
4. Prova objetiva: disciplinas, nº de questões, valor por questão, total, alternativas, duração, mínimo por
   disciplina e geral, critérios de eliminação, desempate.
5. Títulos: lista, comprovação, pontuação por título e máxima.
6. Curso de Formação Inicial: carga horária, frequência mínima, avaliação, caráter.
7. **Conteúdo programático do ACE, literal**, preservando a hierarquia e a pontuação do texto original
   (cada trecho separado por ponto/ponto e vírgula vira um item; nada é reescrito).
8. Bibliografia e legislação citadas (lei, número, ano, artigos quando indicados).
9. Recursos, convocações, documentação exigida e demais etapas.

Depois da extração: **tabela de conferência** (item extraído × página do PDF) para a usuária validar antes de o
edital passar a "vigente". Retificações geram nova versão com *diff* (ver [ADR-007](decisoes.md#adr-007)).

---

## 3. Reaproveitamento do app atual (Mimo)

| Recurso do Mimo | Destino no novo app |
| --- | --- |
| Caderno de erros (prioridade, origem, histórico, Segundo Ciclo) | Migrado via backup JSON. Origens `desconhecimento`/`confusao`/`interpretacao` mapeiam para as categorias do spec; `esquecimento` permanece como categoria extra; "desatenção" passa a existir |
| Flashcards SM-2 (baralhos, lacunas, Certo/Errado, imagens, marca-texto) | Migrados; agendamento convertido para **FSRS** reprocessando o histórico de revisões (`cardReviews`) com `ts-fsrs` |
| 153 questões do banco embutido | Importadas com origem **"gerada por IA"** e `estilo_banca` (nunca como banca real). **Nenhuma é IBAM; 77 têm 5 alternativas, 61 são Certo/Errado e só 15 têm 4 alternativas** → ficam fora do simulado no formato oficial. Assuntos precisam ser remapeados para os itens do edital |
| Questões próprias e respostas | Migradas com origem preservada |
| Simulados, sessões de foco, anotações | Migrados para histórico (estatísticas) |
| Lógica reutilizável | `examParser` (colar prova), `cloze`, `richText`, cálculos estatísticos — portados para `src/domain` com seus testes |
