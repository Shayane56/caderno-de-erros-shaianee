# Projeto Aprovação Saquarema — documentação

Plataforma pessoal de preparação para o **Processo Seletivo Público nº 001/2026 da Prefeitura Municipal de
Saquarema/RJ**, cargo **Agente de Combate às Endemias (ACE)**, banca **IBAM**.

Esta pasta é a memória do projeto entre sessões de desenvolvimento. Antes de qualquer trabalho, leia este arquivo
e o [registro de decisões](decisoes.md).

## Situação atual

| Fase | Situação |
| --- | --- |
| **Fase 1 — Planejamento e arquitetura** | ✅ Documentos entregues · ⚠️ análise do edital **bloqueada** (falta o PDF oficial, ver abaixo) |
| Fase 2 — Fundação | ⏸️ Aguardando autorização |
| Fases 3 a 9 | ⏸️ Não iniciadas |

> **Regra do projeto:** não avançar de fase sem autorização explícita da usuária.

### Pendência bloqueante: o edital

O edital **não chegou** à sessão da Fase 1 (nenhum anexo na conversa, no repositório, no Google Drive ou no
Gmail), e o site da Prefeitura (`www.saquarema.rj.gov.br`) está fora da rede permitida do ambiente de
desenvolvimento. Por isso, **nenhuma disciplina, conteúdo programático, distribuição de questões ou pontuação foi
cadastrada** — seguindo a regra "não inventar informações".

O que já se sabe por fontes secundárias (marcado como *não confirmado*) está em
[01-requisitos-e-edital.md](01-requisitos-e-edital.md#2-edital--o-que-se-sabe-e-o-que-falta). Para destravar,
qualquer uma destas opções serve:

1. Salvar o PDF oficial em `docs/aprovacao/edital/EDITAL-PROCESSO-SELETIVO-001-2026-SAUDE.pdf` e enviar ao repositório; **ou**
2. Liberar `www.saquarema.rj.gov.br` (e `www.ibam-concursos.org.br`, para retificações) na rede do ambiente; **ou**
3. Colocar o PDF no Google Drive e informar o nome do arquivo.

Endereço oficial do PDF (localizado por busca):
`https://www.saquarema.rj.gov.br/wp-content/uploads/2026/11/EDITAL-PROCESSO-SELETIVO-001-2026-SAUDE.pdf`

## Documentos

| Arquivo | Conteúdo |
| --- | --- |
| [01-requisitos-e-edital.md](01-requisitos-e-edital.md) | Análise dos requisitos, situação do edital, roteiro de extração, reaproveitamento do app atual (Mimo) |
| [02-arquitetura.md](02-arquitetura.md) | Arquitetura, estrutura de pastas, IA/RAG, integrações e dependências |
| [03-modelo-de-dados.md](03-modelo-de-dados.md) | Modelo de dados (PostgreSQL/Supabase), segurança (RLS) e armazenamento |
| [04-design-system.md](04-design-system.md) | Paleta, tokens, tipografia, componentes, temas claro/escuro, acessibilidade |
| [05-riscos-e-plano-de-fases.md](05-riscos-e-plano-de-fases.md) | Riscos técnicos e plano detalhado das 9 fases, com critérios de aceite |
| [decisoes.md](decisoes.md) | Registro de decisões técnicas (ADRs) e decisões em aberto |

## Relação com o app existente (Mimo)

Este repositório já contém o **Mimo — Caderno de Erros** (Vite + React + IndexedDB, publicado no GitHub Pages),
com caderno de erros, flashcards (SM-2), banco de 153 questões inéditas, simulados, modo foco e sincronização
opcional via Supabase. O Projeto Aprovação Saquarema será um **novo aplicativo Next.js** na pasta
`aprovacao-saquarema/` (ver [ADR-001](decisoes.md#adr-001)). O Mimo continua funcionando, sem alterações, até a
migração dos dados (importação do backup JSON do Mimo — [ADR-009](decisoes.md#adr-009)).
