# Apostila CPA

Apostila visual e interativa para a certificação CPA da ANBIMA, feita por etapas, um capítulo de cada vez.
A identidade visual segue a da Apostila ACE: caderno pautado, títulos manuscritos e post-its, nas cores petróleo, coral e âmbar. O mascote é o Juca, um cofrinho.

## Entregas

| Arquivo | O que é |
| --- | --- |
| `dist/Apostila-CPA-Cap1-Sistema-Financeiro-Nacional.pdf` | PDF A4 colorido, com capa, sumário, gabarito comentado e fontes |
| `dist/Apostila-CPA-caderno.html` | Caderno digital completo: abra no navegador (o progresso fica salvo nele) |
| `dist/caderno.html` | Mesma página, no formato publicado como Artifact no claude.ai |

O caderno digital tem:

- navegação por capítulos e seções;
- mapas mentais com Modo treino;
- questões corrigidas na hora, com o porquê de cada alternativa;
- caderno de erros;
- treino rápido com filtros;
- desempenho por assunto;
- desafio relâmpago;
- busca;
- contagem regressiva para a prova.

## Status

Plano em 15 capítulos, na ordem do **programa detalhado oficial da CPA** (ANBIMA, v1.2, vigência 2026).
🔥 = tema que mais se repetiu nas 3 provas de julho/2026 (análise de questões lembradas; tendência, não garantia).

| Cap. | Módulo (peso) | Assunto | Status |
| --- | --- | --- | --- |
| 1 | 1 (20%) | Sistema Financeiro Nacional | pronto · cobre todo o item 1.1 do programa |
| 2 | 1 (20%) | Política econômica e indicadores 🔥 | pronto · cobre todo o item 1.2 do programa |
| 3 | 1 (20%) | Matemática financeira | pronto · cobre todo o item 1.3 do programa · 3 simuladores (juros, taxas e SAC × Price) |
| 4 | 1 (20%) | Regulação e infraestrutura de mercado | pronto · cobre todo o item 1.4 (IMFs, Basileia, CVM 30, Código ANBIMA) |
| 5 | 2 (40%) | Renda fixa 🔥 | pronto · cobre todo o item 2.1.1.1 · simulador LCI × CDB |
| 6 | 2 (40%) | Renda variável e COE 🔥 | pronto · itens 2.1.1.2 a 2.1.1.4 · simulador de IR de ações |
| 7 | 2 (40%) | Fundos de investimento e FII | próxima etapa |
| 8 | 2 (40%) | Previdência complementar | |
| 9 | 2 (40%) | Produtos de crédito 🔥 | |
| 10 | 2 (40%) | Serviços bancários e seguros | |
| 11 | 3 (30%) | Finanças pessoais e planejamento | |
| 12 | 3 (30%) | Suitability, código ANBIMA e ética 🔥 | |
| 13 | 3 (30%) | PLD, LGPD e crimes de mercado | |
| 14 | 4 (10%) | ESG | |
| 15 | 4 (10%) | Inovação e meios de pagamento | |

## Como gerar

```bash
python3 build.py                     # monta o caderno e os documentos de PDF de cada capítulo em dist/
node build-pdf.cjs --cap 2           # PDF completo do capítulo 2 (precisa de Playwright/Chromium e do pdfunite)
node build-pdf.cjs --cap 2 --resumo  # PDF do resumo de 2 páginas do capítulo 2
```

Para adicionar um capítulo: crie `capNN.html`, `dados-capNN.js`, `resumoNN.html` e `capa-capNN.html` em `src/`,
inclua o número em `CAPITULOS` (build.py) e em `CAPS` (build-pdf.cjs) e os marcadores `<!--@@CAPNN@@-->` e
`<!--@@RESUMONN@@-->` em `casca.html`.

## Estrutura de `src/`

| Arquivo | O que é |
| --- | --- |
| `estilo.css` | Identidade visual (tokens de cor com modo escuro) |
| `impressao.css` | Ajustes do PDF |
| `casca.html` | Página do caderno: barra, índice, início e desempenho |
| `casca-pdf.html` | Documento do PDF |
| `capNN.html` | Conteúdo de cada capítulo |
| `capa-capNN.html` | Capa e sumário do PDF |
| `dados-capNN.js` | Questões, mapa mental e jogo de cada capítulo |
| `simbolos.html` | Mascote e filtro de traço à mão |
| `app.js` | Interatividade |

Para adicionar um capítulo:

1. Crie `capNN.html`, `dados-capNN.js` e `capa-capNN.html`.
2. Inclua o número em `CAPITULOS`, no `build.py`.
3. Adicione o marcador `<!--@@CAPNN@@-->` em `casca.html`.

Material de estudo independente; não é produzido nem endossado pela ANBIMA. As questões são inéditas. O texto foi escrito do zero, usando o e-book do curso apenas como roteiro de conteúdo.
