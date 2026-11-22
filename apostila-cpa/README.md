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

| Cap. | Assunto | Status |
| --- | --- | --- |
| 1 | Sistema Financeiro Nacional | pronto (fontes conferidas em nov/2026) |
| 2–12 | Economia, matemática financeira, renda fixa, renda variável, fundos, previdência, crédito e seguros, planejamento, conduta e PLD, inovação, meios de pagamento | próximas etapas |

## Como gerar

```bash
python3 build.py          # monta dist/caderno.html, dist/Apostila-CPA-caderno.html e dist/apostila-pdf.html
node build-pdf.cjs        # gera o PDF (precisa de Playwright/Chromium e do pdfunite, do poppler-utils)
```

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
