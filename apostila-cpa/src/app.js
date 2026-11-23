/* Apostila CPA — caderno interativo.
   Views por hash: #inicio, #cap-N (ou o id de uma seção, ex. #c1-s3), #painel.
   O progresso fica no localStorage do navegador (só deste aparelho). */
(function () {
  'use strict';
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const escH = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const D = window.APOSTILA;
  const MODO_PDF = document.documentElement.classList.contains('pdf');
  const LETRAS = 'ABCDE';
  const semMovimento = () => window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------------- armazenamento (tolerante a falhas) ---------------- */
  const CHAVE = 'apostila-cpa-v1';
  let E = { respostas: {}, vistas: {}, prova: '', recorde: 0, treino: false };
  try { const s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (s && typeof s === 'object') E = Object.assign(E, s); } catch (e) { /* sem armazenamento */ }
  const salvar = () => { try { localStorage.setItem(CHAVE, JSON.stringify(E)); } catch (e) { /* ignora */ } };
  // versão do banco de questões: quando as questões são reescritas, o histórico antigo deixa de valer
  const VERSAO_QUESTOES = 2;
  if (E.qv !== VERSAO_QUESTOES) { E.respostas = {}; E.qv = VERSAO_QUESTOES; salvar(); }
  // até a versão 1, as seções eram marcadas como lidas só de rolar a página; agora a marcação é manual
  if (E.mv !== 2) { E.vistas = {}; E.mv = 2; salvar(); }
  // nov/2026: alternativas do capítulo 3 reordenadas; respostas antigas desse capítulo deixam de valer
  if (E.c3v !== 2) { Object.keys(E.respostas).forEach((k) => { if (k.startsWith('c3q')) delete E.respostas[k]; }); E.c3v = 2; salvar(); }

  /* ---------------- catálogo de capítulos ---------------- */
  // Plano pelo programa oficial da CPA (v1.2, vigência 2026). m = módulo; p = prioridade pela análise das últimas provas
  // (alta = tema que apareceu em 2 ou 3 das 3 provas analisadas); r = temas recorrentes.
  const CAPS = [
    { n: 1, m: 1, pd: '1.1', t: 'Sistema Financeiro Nacional', s: 'CMN, BC, CVM, Susep, Previc, bancos, fintechs, ANBIMA, FGC e SPB', tema: 'tema-mar', ico: 'predio' },
    { n: 2, m: 1, pd: '1.2', p: 'alta', r: 'política monetária: Selic, Copom e CDI', t: 'Política econômica e indicadores', s: 'política monetária, fiscal e cambial, Copom, Selic, CDI, IPCA e PIB', tema: 'tema-mar', ico: 'grafico' },
    { n: 3, m: 1, pd: '1.3', r: 'conceitos: Fisher, VPL, TIR, duration, SAC × Price', t: 'Matemática financeira', s: 'juros, Fisher, VP, VF, VPL, TIR, SAC, Price e duration', tema: 'tema-mar', ico: 'calc' },
    { n: 4, m: 1, pd: '1.4', r: 'IMFs, Basileia, investidor qualificado e Código ANBIMA', t: 'Regulação e infraestrutura', s: 'IMFs, Selic, B3, Basileia, investidor qualificado e código ANBIMA', tema: 'tema-mar', ico: 'rede' },
    { n: 5, m: 2, pd: '2.1.1.1', p: 'alta', r: 'debêntures, Tesouro Direto e tributação (IR e IOF)', t: 'Renda fixa', s: 'Tesouro Direto, CDB, LCI, LCA, LCD, debêntures, CRI, CRA, IR e IOF', tema: 'tema-ouro', ico: 'doc' },
    { n: 6, m: 2, pd: '2.1.1.2 a 2.1.1.4', p: 'alta', r: 'ações ON/PN, Novo Mercado, tag along e IR de ações', t: 'Renda variável e COE', s: 'ações, ofertas, eventos, índices, governança e COE', tema: 'tema-ouro', ico: 'velas' },
    { n: 7, m: 2, pd: '2.1.2 a 2.1.4', p: 'media', r: 'características, tributação e resgate', t: 'Fundos de investimento e FII', s: 'Resolução CVM 175, tipos de fundos, taxas, tributação e FII', tema: 'tema-ouro', ico: 'pizza' },
    { n: 8, m: 2, pd: '2.2', p: 'media', r: 'PGBL × VGBL e tributação', t: 'Previdência complementar', s: 'PGBL, VGBL, regimes de tributação, portabilidade e rendas', tema: 'tema-ouro', ico: 'ampulheta' },
    { n: 9, m: 2, pd: '2.3', p: 'alta', r: 'consignado, cartão, cheque especial e encargos', t: 'Produtos de crédito', s: 'empréstimo, financiamento, leasing, cartão, consignado e CDC', tema: 'tema-ouro', ico: 'cartao' },
    { n: 10, m: 2, pd: '2.4 e 2.5', t: 'Serviços bancários e seguros', s: 'conta, Pix, tarifas, câmbio, conta internacional e seguros', tema: 'tema-ouro', ico: 'maquina' },
    { n: 11, m: 3, pd: '3.1 e 3.2', t: 'Finanças pessoais e planejamento', s: 'ciclo de vida, orçamento, reserva, metas e IR da pessoa física', tema: 'tema-coral', ico: 'alvo' },
    { n: 12, m: 3, pd: '3.3 e 3.4.1 a 3.4.4', p: 'alta', r: 'conduta, ética e práticas vedadas', t: 'Suitability, código ANBIMA e ética', s: 'perfil do investidor, suitability, 9 princípios éticos e conflitos', tema: 'tema-coral', ico: 'balanca' },
    { n: 13, m: 3, pd: '3.4.5 a 3.4.7', t: 'PLD, LGPD e crimes de mercado', s: 'lavagem de dinheiro, KYC, LGPD, sigilo, insider e manipulação', tema: 'tema-coral', ico: 'escudo' },
    { n: 14, m: 4, pd: '4.1 a 4.3', r: 'fundos IS × que integram ESG, estratégias e greenwashing', t: 'ESG', s: 'ambiental, social e governança, investimentos e fundos sustentáveis', tema: 'tema-roxo', ico: 'folha' },
    { n: 15, m: 4, pd: '4.4 a 4.7', r: 'Drex, Open Finance, tokenização e adquirente × subadquirente', t: 'Inovação e meios de pagamento', s: 'DeFi, tokenização, Drex, Open Finance, IA, fintechs e arranjos', tema: 'tema-roxo', ico: 'chip' }
  ];
  const MODULOS = { 1: 'Módulo 1 · 20%', 2: 'Módulo 2 · 40%', 3: 'Módulo 3 · 30%', 4: 'Módulo 4 · 10%' };
  const TEMAS_MODULO = { 1: 'tema-mar', 2: 'tema-ouro', 3: 'tema-coral', 4: 'tema-roxo' };
  const PESOS = { 1: [20, 22], 2: [40, 43], 3: [30, 26], 4: [10, 9] }; // [programa oficial, últimas provas analisadas]
  const NOMES_MODULOS = { 1: 'Estrutura e dinâmica do SFN', 2: 'Produtos do mercado financeiro', 3: 'Relacionamento com o cliente', 4: 'Inovação e desenvolvimento de mercado' };
  const ICONES = {
    predio: '<path d="M14 40 50 18l36 22Z"/><path d="M20 44v34M36 44v34M64 44v34M80 44v34M10 82h80"/>',
    grafico: '<path d="M12 80h76M16 70l18-20 16 10 26-30"/><path d="M62 30h14v14"/>',
    calc: '<rect x="24" y="12" width="52" height="76" rx="8"/><rect x="32" y="20" width="36" height="16" rx="3"/><path d="M34 50h4M48 50h4M62 50h4M34 64h4M48 64h4M62 64h4M34 78h4M48 78h18"/>',
    doc: '<path d="M26 10h34l16 16v64H26Z"/><path d="M60 10v16h16"/><circle cx="42" cy="50" r="5"/><circle cx="60" cy="70" r="5"/><path d="M62 46 40 74"/>',
    velas: '<path d="M22 20v60M42 30v50M62 14v62M82 34v40"/><rect x="16" y="34" width="12" height="28" rx="2"/><rect x="36" y="44" width="12" height="20" rx="2"/><rect x="56" y="24" width="12" height="34" rx="2"/><rect x="76" y="42" width="12" height="20" rx="2"/>',
    pizza: '<circle cx="50" cy="50" r="36"/><path d="M50 14v36l30 20"/><path d="M50 50 22 72"/>',
    ampulheta: '<path d="M28 12h44M28 88h44M32 12c0 24 36 26 36 38s-36 14-36 38M68 12c0 24-36 26-36 38s36 14 36 38"/>',
    cartao: '<rect x="12" y="26" width="76" height="50" rx="8"/><path d="M12 42h76M24 62h18"/>',
    alvo: '<circle cx="50" cy="50" r="36"/><circle cx="50" cy="50" r="22"/><circle cx="50" cy="50" r="8"/><path d="M50 50 84 16M74 16h10v10"/>',
    balanca: '<path d="M50 14v70M30 84h40M18 30h64"/><path d="M18 30 8 56h20ZM82 30 72 56h20Z"/>',
    chip: '<rect x="26" y="26" width="48" height="48" rx="6"/><rect x="38" y="38" width="24" height="24" rx="3"/><path d="M38 14v12M50 14v12M62 14v12M38 74v12M50 74v12M62 74v12M14 38h12M14 50h12M14 62h12M74 38h12M74 50h12M74 62h12"/>',
    rede: '<circle cx="50" cy="22" r="10"/><circle cx="22" cy="74" r="10"/><circle cx="78" cy="74" r="10"/><path d="M45 31 27 65M55 31l18 34M32 74h36"/>',
    escudo: '<path d="M50 10 82 22v24c0 22-15 34-32 42-17-8-32-20-32-42V22Z"/><path d="M36 50l10 10 18-22"/>',
    folha: '<path d="M20 80C20 40 46 18 84 16c0 40-22 66-58 66Z"/><path d="M20 80c14-20 30-34 48-44"/>',
    maquina: '<rect x="28" y="10" width="44" height="80" rx="8"/><rect x="36" y="20" width="28" height="20" rx="3"/><path d="M38 52h4M50 52h4M62 52h0M38 64h4M50 64h4M38 76h24"/>'
  };
  const icone = (k) => `<svg viewBox="0 0 100 100" fill="none" stroke="#fff" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONES[k] || ''}</svg>`;

  /* todas as questões (de todos os capítulos disponíveis) */
  const TODAS = [];
  Object.keys(D.capitulos).forEach((n) => D.capitulos[n].questoes.forEach((q) => TODAS.push(Object.assign({ cap: Number(n) }, q))));
  const POR_ID = {}; TODAS.forEach((q) => { POR_ID[q.id] = q; });

  /* ---------------- utilidades de interface ---------------- */
  let tToast;
  function toast(msg) { const t = $('#toast'); if (!t) return; t.textContent = msg; t.classList.add('ver'); clearTimeout(tToast); tToast = setTimeout(() => t.classList.remove('ver'), 2400); }
  function confete() {
    if (semMovimento() || MODO_PDF) return;
    const cores = ['#d9472f', '#13858a', '#f0a12f', '#6550d0', '#23905f'];
    for (let i = 0; i < 26; i++) {
      const c = document.createElement('span'); c.className = 'confete'; c.textContent = ['✦', '★', '●', '✿'][i % 4];
      c.style.left = Math.random() * 100 + 'vw'; c.style.color = cores[i % 5];
      c.style.setProperty('--dx', (Math.random() * 160 - 80) + 'px'); c.style.setProperty('--r', (Math.random() * 720 - 360) + 'deg'); c.style.setProperty('--t', (2 + Math.random() * 1.6) + 's');
      document.body.appendChild(c); setTimeout(() => c.remove(), 4000);
    }
  }

  /* ---------------- estatísticas ---------------- */
  function stats(lista) {
    let resp = 0, ok = 0;
    lista.forEach((q) => { const r = E.respostas[q.id]; if (r) { resp++; if (r.certa) ok++; } });
    return { total: lista.length, resp, ok, pct: resp ? Math.round((ok / resp) * 100) : null };
  }
  const erradas = () => TODAS.filter((q) => E.respostas[q.id] && !E.respostas[q.id].certa);

  /* ---------------- questões ---------------- */
  function htmlQuestao(q, num) {
    const nivel = { facil: 'fácil', medio: 'médio', dificil: 'difícil' }[q.n] || '';
    return `<div class="questao" data-q="${q.id}">
      <div class="cab"><span class="nq">${num}</span><span class="fonte">Inédita · ${q.pd ? 'PD ' + escH(q.pd) : 'Cap. ' + q.cap} · ${escH(q.tema)}</span>${q.nv ? `<span class="cog">${escH(q.nv)}</span>` : ''}<span class="nivel ${q.n}">${nivel}</span></div>
      ${q.ctx ? `<div class="contexto"><b>Contexto</b>${escH(q.ctx)}</div>` : ''}
      <div class="enunciado">${escH(q.q)}</div>
      <ol class="alt">${q.o.map((a, i) => `<li class="alt-i" data-i="${i}" tabindex="0" role="button">${escH(a)}</li>`).join('')}</ol>
      <div class="fb-lugar" aria-live="polite"></div></div>`;
  }
  function aplicarResposta(div, q, i, animar) {
    div.classList.add('respondida');
    const certa = i === q.c;
    div.classList.toggle('acertou', certa); div.classList.toggle('errou', !certa);
    $$('li.alt-i', div).forEach((li, k) => {
      li.classList.remove('certa', 'errada', 'apagada'); li.removeAttribute('tabindex');
      if (k === q.c) li.classList.add('certa'); else if (k === i) li.classList.add('errada'); else li.classList.add('apagada');
    });
    const alts = q.a ? `<ul class="fb-alts">${q.a.map((t, k) => `<li><b>${LETRAS[k]})</b> ${escH(t)}</li>`).join('')}</ul>` : '';
    $('.fb-lugar', div).innerHTML = `<div class="feedback ${certa ? 'ok' : 'no'}">
      <span class="fb-tit">${certa ? 'Isso! Resposta ' + LETRAS[q.c] + '.' : 'Quase. A resposta é ' + LETRAS[q.c] + '.'}</span>
      ${escH(q.e)}${alts}
      <div class="fb-acoes"><button type="button" data-acao="refazer">refazer esta questão</button>${certa ? '' : '<span class="pequeno">anotada no seu caderno de erros</span>'}</div></div>`;
    if (animar && !certa && !semMovimento()) { div.classList.add('treme'); setTimeout(() => div.classList.remove('treme'), 450); }
  }
  function limparResposta(div) {
    div.classList.remove('respondida', 'acertou', 'errou');
    $$('li.alt-i', div).forEach((li) => { li.classList.remove('certa', 'errada', 'apagada'); li.setAttribute('tabindex', '0'); });
    $('.fb-lugar', div).innerHTML = '';
  }
  function montarLista(alvo, lista, opcoes = {}) {
    if (!lista.length) { alvo.innerHTML = `<div class="vazio">${opcoes.vazio || 'Nenhuma questão aqui.'}</div>`; return; }
    alvo.innerHTML = (opcoes.placar !== false ? '<div class="placar"><span>Placar</span><span class="pl-num"></span><span class="pl-barra"><i class="ok"></i><i class="no"></i></span><button type="button" data-acao="zerar">recomeçar</button></div>' : '')
      + lista.map((q, k) => htmlQuestao(q, k + 1)).join('') + '<div class="resultado-q" hidden></div>';
    const sessao = {};
    const respDe = (q) => (opcoes.fresco ? sessao[q.id] : E.respostas[q.id]);
    const statsLocal = () => { let resp = 0, ok = 0; lista.forEach((q) => { const r = respDe(q); if (r) { resp++; if (r.certa) ok++; } }); return { total: lista.length, resp, ok, pct: resp ? Math.round(ok / resp * 100) : null }; };
    const atualizarPlacar = () => {
      const s = statsLocal();
      const pl = $('.placar', alvo);
      if (pl) {
        $('.pl-num', pl).textContent = `${s.ok}/${s.total}`;
        $('.pl-barra .ok', pl).style.width = (s.ok / s.total * 100) + '%';
        $('.pl-barra .no', pl).style.width = ((s.resp - s.ok) / s.total * 100) + '%';
      }
      const res = $('.resultado-q', alvo);
      if (s.resp === s.total) {
        res.hidden = false;
        res.innerHTML = `<b>${s.ok} de ${s.total}</b>${s.pct >= 80 ? 'Excelente! Você está pronta para este assunto.' : s.pct >= 60 ? 'Bom resultado. Revise os erros no caderno e tente de novo.' : 'Volte às pegadinhas e ao mapa mental e refaça. Erro aqui é acerto na prova.'}`;
      } else res.hidden = true;
      atualizarGeral();
      return s;
    };
    lista.forEach((q) => { const r = respDe(q); const div = $(`.questao[data-q="${q.id}"]`, alvo); if (r && div) aplicarResposta(div, q, r.i, false); });
    atualizarPlacar();
    alvo.addEventListener('click', (ev) => {
      const zerar = ev.target.closest('[data-acao="zerar"]');
      if (zerar) { lista.forEach((q) => { if (opcoes.fresco) delete sessao[q.id]; else delete E.respostas[q.id]; const d = $(`.questao[data-q="${q.id}"]`, alvo); if (d) limparResposta(d); }); salvar(); atualizarPlacar(); toast('Placar zerado'); return; }
      const ref = ev.target.closest('[data-acao="refazer"]');
      if (ref) { const div = ref.closest('.questao'); if (opcoes.fresco) delete sessao[div.dataset.q]; else delete E.respostas[div.dataset.q]; salvar(); limparResposta(div); atualizarPlacar(); return; }
      const li = ev.target.closest('li.alt-i'); if (!li) return;
      const div = li.closest('.questao'); if (div.classList.contains('respondida')) return;
      const q = POR_ID[div.dataset.q]; const i = Number(li.dataset.i);
      const ant = E.respostas[q.id];
      const rec = { i, certa: i === q.c, quando: Date.now(), tent: ((ant && ant.tent) || 0) + 1 };
      E.respostas[q.id] = rec; sessao[q.id] = rec;
      salvar(); aplicarResposta(div, q, i, true);
      const s = atualizarPlacar();
      if (s.resp === s.total && s.ok === s.total) confete();
    });
    alvo.addEventListener('keydown', (ev) => { if ((ev.key === 'Enter' || ev.key === ' ') && ev.target.matches('li.alt-i')) { ev.preventDefault(); ev.target.click(); } });
  }

  /* gabarito impresso (modo PDF) */
  function montarListaImpressa(alvo, lista) {
    alvo.innerHTML = lista.map((q, k) => `<div class="questao"><div class="cab"><span class="nq">${k + 1}</span><span class="fonte">Inédita · ${q.pd ? 'PD ' + escH(q.pd) + ' · ' : ''}${escH(q.tema)}</span>${q.nv ? `<span class="cog">${escH(q.nv)}</span>` : ''}</div>
      ${q.ctx ? `<div class="contexto"><b>Contexto</b>${escH(q.ctx)}</div>` : ''}
      <div class="enunciado">${escH(q.q)}</div><ol class="alt">${q.o.map((a) => `<li>${escH(a)}</li>`).join('')}</ol></div>`).join('')
      + `<div class="gabarito-impresso"><h3 class="sem-marca">Gabarito comentado</h3>${lista.map((q, k) => `<div class="gab-item"><b>${k + 1} · ${LETRAS[q.c]}</b> ${escH(q.e)}</div>`).join('')}</div>`;
  }

  /* ---------------- mapa mental ---------------- */
  const CORES_MAPA = ['var(--laranja)', 'var(--teal)', 'var(--roxo)', 'var(--verde)', 'var(--rosa)', 'var(--azul)'];
  const DOODLES = {
    livro: '<path d="M14 18h24v46H18a4 4 0 0 1-4-4Z" fill="currentColor" opacity=".18"/><path d="M14 18h24v46H18a4 4 0 0 1-4-4ZM38 18h24v42a4 4 0 0 1-4 4H38ZM38 18v46" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round"/>',
    apito: '<rect x="10" y="30" width="40" height="22" rx="11" fill="currentColor" opacity=".18"/><rect x="10" y="30" width="40" height="22" rx="11" fill="none" stroke="currentColor" stroke-width="3.5"/><rect x="44" y="24" width="20" height="12" rx="3" fill="none" stroke="currentColor" stroke-width="3.5"/><circle cx="26" cy="41" r="5" fill="currentColor"/>',
    predio: '<path d="M10 30 38 12l28 18Z" fill="currentColor" opacity=".18"/><path d="M10 30 38 12l28 18ZM16 34v26M30 34v26M46 34v26M60 34v26M8 64h60" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>',
    moeda: '<circle cx="38" cy="38" r="24" fill="currentColor" opacity=".18"/><circle cx="38" cy="38" r="24" fill="none" stroke="currentColor" stroke-width="3.5"/><text x="38" y="46" text-anchor="middle" font-family="Kalam, cursive" font-weight="700" font-size="22" fill="currentColor">R$</text>',
    chave: '<circle cx="24" cy="38" r="12" fill="currentColor" opacity=".18"/><circle cx="24" cy="38" r="12" fill="none" stroke="currentColor" stroke-width="3.5"/><path d="M36 38h30M58 38v10M66 38v8" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linecap="round"/>',
    escudo: '<path d="M38 10 62 20v18c0 16-11 24-24 28-13-4-24-12-24-28V20Z" fill="currentColor" opacity=".18"/><path d="M38 10 62 20v18c0 16-11 24-24 28-13-4-24-12-24-28V20ZM28 38l8 8 14-16" fill="none" stroke="currentColor" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>'
  };
  function montarMapa(el) {
    const d = D.mapas[el.dataset.mapa]; if (!d) return;
    el.innerHTML = `<div class="mc"><svg class="mc-setas" aria-hidden="true"><g filter="url(#tremido)"></g></svg>
      <div class="mc-centro"><h3 class="mc-titulo sem-marca">${escH(d.centro)}</h3><span class="mc-sub">${escH(d.sub || '')}</span>${d.extra ? `<span class="mc-extra">${escH(d.extra)}</span>` : ''}</div>
      ${d.ramos.map((r, i) => `<div role="button" tabindex="0" class="mc-ramo e${i % 4}" style="--c:${CORES_MAPA[i % 6]};--area:r${i + 1}" aria-pressed="false">
        <svg class="mc-doodle" viewBox="0 0 76 76" aria-hidden="true" style="color:${CORES_MAPA[i % 6]}">${DOODLES[r.d] || ''}</svg>
        <h4>${escH(r.t)}</h4><ul>${r.i.map((x) => `<li>${escH(x)}</li>`).join('')}</ul></div>`).join('')}
    </div><p class="mc-dica">Toque num ramo para destacar. No Modo treino, os itens somem: toque em cada um para lembrar.</p>`;
    const mc = $('.mc', el), g = $('.mc-setas g', el), titulo = $('.mc-titulo', el);
    const ramos = $$('.mc-ramo', el);
    let primeira = true;
    function desenhar() {
      if (!el.isConnected || !el.offsetWidth) return;
      g.innerHTML = '';
      if (el.offsetWidth < 640) return;
      const base = mc.getBoundingClientRect(), c = titulo.getBoundingClientRect();
      const cx = c.left + c.width / 2 - base.left, cy = c.top + c.height / 2 - base.top;
      ramos.forEach((b, i) => {
        const h = $('h4', b).getBoundingClientRect();
        const esquerda = h.left + h.width / 2 - base.left < cx;
        const tx = esquerda ? h.right - base.left + 6 : h.left - base.left - 6;
        const ty = h.top + h.height / 2 - base.top;
        const sx = cx + (esquerda ? -1 : 1) * Math.min(c.width / 2 + 4, 90);
        const sy = cy + (ty < cy ? -c.height / 2 : c.height / 2) * 0.7;
        const mx = (sx + tx) / 2 + (esquerda ? -14 : 14), my = (sy + ty) / 2 + (ty < cy ? -18 : 18);
        const ang = Math.atan2(ty - my, tx - mx);
        const p1 = [tx - 13 * Math.cos(ang - 0.45), ty - 13 * Math.sin(ang - 0.45)], p2 = [tx - 13 * Math.cos(ang + 0.45), ty - 13 * Math.sin(ang + 0.45)];
        const grupo = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        grupo.setAttribute('class', 'sg'); grupo.dataset.i = i; grupo.style.setProperty('--c', CORES_MAPA[i % 6]);
        grupo.innerHTML = `<path d="M${sx} ${sy} Q ${mx} ${my} ${tx} ${ty}"/><path d="M${p1[0]} ${p1[1]} L${tx} ${ty} L${p2[0]} ${p2[1]}"/>`;
        g.appendChild(grupo);
        if (primeira && !semMovimento() && !MODO_PDF) {
          const linha = grupo.firstChild; const len = linha.getTotalLength();
          linha.style.strokeDasharray = len; linha.style.setProperty('--len', len); linha.style.setProperty('--d', (0.15 + i * 0.14) + 's'); linha.classList.add('linha-anim');
        }
      });
      primeira = false; foco();
    }
    function foco() {
      const i = ramos.findIndex((b) => b.classList.contains('foco'));
      mc.classList.toggle('focado', i >= 0);
      $$('g.sg', g).forEach((x) => x.classList.toggle('acesa', Number(x.dataset.i) === i));
    }
    ramos.forEach((b) => {
      b.addEventListener('click', (ev) => {
        const li = ev.target.closest('li');
        if (document.body.classList.contains('treino') && li) { li.classList.toggle('ver'); return; }
        const ja = b.classList.contains('foco');
        ramos.forEach((x) => { x.classList.remove('foco'); x.setAttribute('aria-pressed', 'false'); });
        if (!ja) { b.classList.add('foco'); b.setAttribute('aria-pressed', 'true'); }
        foco();
      });
      b.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); b.click(); } });
    });
    let t;
    if (window.ResizeObserver) new ResizeObserver(() => { clearTimeout(t); t = setTimeout(desenhar, 60); }).observe(el);
    (document.fonts ? document.fonts.ready : Promise.resolve()).then(() => requestAnimationFrame(desenhar));
    el._desenhar = desenhar;
  }


  /* ---------------- simuladores do capítulo 3 ---------------- */
  const fmtN = (v, d = 2) => (isFinite(v) ? v : 0).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d });
  const brl = (v) => 'R$ ' + fmtN(v);
  const pct = (v, d = 2) => fmtN(v * 100, d) + '%';
  const num = (inp) => { const v = parseFloat(String(inp.value).replace(',', '.')); return isFinite(v) ? v : 0; };
  const campo = (k, rotulo, valor, extra = '') => `<label class="calc-campo"><span>${rotulo}</span><input type="number" inputmode="decimal" data-k="${k}" value="${valor}" ${extra}></label>`;
  const faixa = (k, rotulo, valor, min, max) => `<label class="calc-campo calc-faixa"><span>${rotulo}: <b data-v="${k}">${valor}</b></span><input type="range" data-k="${k}" value="${valor}" min="${min}" max="${max}" step="1"></label>`;

  function calcBola(el) {
    el.innerHTML = `<div class="calc-topo"><span class="calc-selo">Simulador</span><b>Juros simples × compostos</b></div>
      <div class="calc-entradas">${campo('c', 'Capital (R$)', 1000, 'min="1" step="100"')}${campo('i', 'Taxa por período (%)', 10, 'min="0" max="50" step="0.5"')}${faixa('n', 'Períodos', 10, 1, 30)}</div>
      <div class="calc-graf" aria-hidden="true"></div>
      <div class="calc-res" aria-live="polite"></div>`;
    const ler = (k) => num($(`[data-k="${k}"]`, el));
    function atualizar() {
      const C = Math.max(0, ler('c')), i = Math.max(0, ler('i')) / 100, n = Math.round(Math.min(30, Math.max(1, ler('n'))));
      $('[data-v="n"]', el).textContent = n;
      const sim = [], com = [];
      for (let t = 0; t <= n; t++) { sim.push(C * (1 + i * t)); com.push(C * Math.pow(1 + i, t)); }
      const max = com[n] || 1, W = 640, H = 220, base = 190, larg = Math.min(26, (W - 40) / (n + 1) / 2 - 1);
      let barras = '';
      for (let t = 0; t <= n; t++) {
        const x = 30 + (t + 0.5) * ((W - 40) / (n + 1));
        const hs = sim[t] / max * 170, hc = com[t] / max * 170;
        barras += `<rect x="${(x - larg).toFixed(1)}" y="${(base - hs).toFixed(1)}" width="${larg.toFixed(1)}" height="${hs.toFixed(1)}" rx="2" class="b-sim"/><rect x="${x.toFixed(1)}" y="${(base - hc).toFixed(1)}" width="${larg.toFixed(1)}" height="${hc.toFixed(1)}" rx="2" class="b-com"/>`;
        if (n <= 15 || t % 5 === 0) barras += `<text x="${x.toFixed(1)}" y="${base + 16}" text-anchor="middle">${t}</text>`;
      }
      $('.calc-graf', el).innerHTML = `<svg viewBox="0 0 ${W} ${H}"><path d="M20 ${base}H${W - 6}" class="eixo"/>${barras}</svg>
        <p class="calc-leg"><i class="b-sim"></i>simples <i class="b-com"></i>compostos <span>· eixo: períodos</span></p>`;
      const js = sim[n] - C, jc = com[n] - C;
      $('.calc-res', el).innerHTML = `<div class="calc-cards">
        <div><small>Juros simples</small><b>${brl(sim[n])}</b><span>juros de ${brl(js)}<br>M = C × (1 + i × n)</span></div>
        <div class="destaque"><small>Juros compostos</small><b>${brl(com[n])}</b><span>juros de ${brl(jc)}<br>M = C × (1 + i)<sup>${n}</sup></span></div>
        <div><small>Juros sobre juros</small><b>${brl(jc - js)}</b><span>${js > 0 ? 'compostos rendem ' + pct(jc / js - 1, 1) + ' a mais de juros' : 'com 1 período, dão igual'}</span></div></div>`;
    }
    el.addEventListener('input', atualizar); atualizar();
  }

  function calcTaxas(el) {
    el.innerHTML = `<div class="calc-topo"><span class="calc-selo">Simulador</span><b>Conversor de taxas</b></div>
      <div class="calc-tres">
        <div class="calc-bloco" data-b="eq"><h4>1 · Taxa equivalente</h4>${campo('tm', 'Taxa ao mês (%)', 1, 'step="0.1"')}<div class="calc-out"></div></div>
        <div class="calc-bloco" data-b="ne"><h4>2 · Nominal → efetiva</h4>${campo('tn', 'Taxa nominal ao ano (%)', 12, 'step="0.5"')}
          <label class="calc-campo"><span>Capitalização</span><select data-k="k"><option value="12" selected>mensal (12×)</option><option value="4">trimestral (4×)</option><option value="2">semestral (2×)</option><option value="365">diária (365×)</option></select></label><div class="calc-out"></div></div>
        <div class="calc-bloco" data-b="fi"><h4>3 · Fisher</h4>${campo('fn', 'Rendimento nominal (%)', 12, 'step="0.5"')}${campo('fi', 'Inflação (%)', 5, 'step="0.5"')}<div class="calc-out"></div></div>
      </div>`;
    const ler = (k) => num($(`[data-k="${k}"]`, el));
    function atualizar() {
      const tm = ler('tm') / 100, ea = Math.pow(1 + tm, 12) - 1;
      $('[data-b="eq"] .calc-out', el).innerHTML = `<p><small>Equivalente ao ano (compostos)</small><b>${pct(ea)}</b><span>(1 + ${fmtN(tm * 100)}%)¹² − 1</span></p>
        <p><small>Proporcional ao ano (simples)</small><b class="neutro">${pct(tm * 12)}</b><span>${fmtN(tm * 100)}% × 12</span></p>`;
      const tn = ler('tn') / 100, k = Number($('[data-k="k"]', el).value), ip = tn / k, ef = Math.pow(1 + ip, k) - 1;
      $('[data-b="ne"] .calc-out', el).innerHTML = `<p><small>Taxa por período</small><b class="neutro">${pct(ip, k === 365 ? 4 : 2)}</b><span>${fmtN(tn * 100)}% ÷ ${k}</span></p>
        <p><small>Taxa efetiva ao ano</small><b>${pct(ef)}</b><span>(1 + ${pct(ip, k === 365 ? 4 : 2)})<sup>${k}</sup> − 1</span></p>`;
      const fn = ler('fn') / 100, fi = ler('fi') / 100, re = (1 + fn) / (1 + fi) - 1;
      $('[data-b="fi"] .calc-out', el).innerHTML = `<p><small>Taxa real (Fisher)</small><b class="${re < 0 ? 'neg' : ''}">${pct(re)}</b><span>(1 + ${fmtN(fn * 100)}%) ÷ (1 + ${fmtN(fi * 100)}%) − 1</span></p>
        <p><small>“Conta de padaria” (aproximação)</small><b class="neutro">${pct(fn - fi)}</b><span>${re < 0 ? 'real negativa: perdeu poder de compra' : re === 0 ? 'real zero: só preservou o poder de compra' : 'a real é um pouco menor que a subtração'}</span></p>`;
    }
    el.addEventListener('input', atualizar); el.addEventListener('change', atualizar); atualizar();
  }

  function calcAmort(el) {
    el.innerHTML = `<div class="calc-topo"><span class="calc-selo">Simulador</span><b>SAC × Price</b></div>
      <div class="calc-entradas">${campo('p', 'Valor financiado (R$)', 6000, 'min="100" step="500"')}${campo('i', 'Taxa ao mês (%)', 2, 'min="0" max="15" step="0.1"')}${faixa('n', 'Parcelas', 6, 2, 60)}</div>
      <div class="calc-res" aria-live="polite"></div><div class="calc-graf amort" aria-hidden="true"></div>
      <details class="calc-tabela"><summary>Ver a tabela mês a mês</summary><div class="tabela-rolagem"></div></details>`;
    const ler = (k) => num($(`[data-k="${k}"]`, el));
    function sistemas(P, i, n) {
      const sac = [], price = []; let s = P;
      for (let k = 0; k < n; k++) { const j = s * i, a = P / n; sac.push([a + j, j, a]); s -= a; }
      const pmt = i > 0 ? P * i / (1 - Math.pow(1 + i, -n)) : P / n; s = P;
      for (let k = 0; k < n; k++) { const j = s * i, a = pmt - j; price.push([pmt, j, a]); s -= a; }
      return { sac, price };
    }
    function grafico(d, nome, max) {
      const W = 300, base = 150, n = d.length, lw = (W - 20) / n, bw = Math.max(2, lw * 0.7);
      let r = '';
      d.forEach((x, k) => {
        const ha = x[2] / max * 130, hj = x[1] / max * 130, xx = 10 + k * lw + (lw - bw) / 2;
        r += `<rect x="${xx.toFixed(1)}" y="${(base - ha).toFixed(1)}" width="${bw.toFixed(1)}" height="${ha.toFixed(1)}" class="b-amo"/><rect x="${xx.toFixed(1)}" y="${(base - ha - hj).toFixed(1)}" width="${bw.toFixed(1)}" height="${hj.toFixed(1)}" class="b-jur"/>`;
      });
      return `<figure><figcaption>${nome}</figcaption><svg viewBox="0 0 ${W} 160"><path d="M6 ${base}H${W - 4}" class="eixo"/>${r}</svg></figure>`;
    }
    function atualizar() {
      const P = Math.max(0, ler('p')), i = Math.max(0, ler('i')) / 100, n = Math.round(Math.min(60, Math.max(2, ler('n'))));
      $('[data-v="n"]', el).textContent = n;
      const { sac, price } = sistemas(P, i, n);
      const soma = (d, c) => d.reduce((t, x) => t + x[c], 0);
      const js = soma(sac, 1), jp = soma(price, 1);
      $('.calc-res', el).innerHTML = `<div class="calc-cards dois">
        <div><small>SAC · amortização fixa de ${brl(P / n)}</small><b>${brl(sac[0][0])} → ${brl(sac[n - 1][0])}</b><span>1ª e última parcela · juros totais: <strong>${brl(js)}</strong></span></div>
        <div class="destaque"><small>Price · parcela fixa</small><b>${brl(price[0][0])}</b><span>todas as parcelas · juros totais: <strong>${brl(jp)}</strong></span></div></div>
        <p class="calc-nota">${jp - js > 0.005 ? `A Price paga <b>${brl(jp - js)}</b> a mais de juros, mas começa com parcela <b>${brl(sac[0][0] - price[0][0])}</b> menor.` : 'Com taxa zero, os dois sistemas ficam iguais.'}</p>`;
      const max = Math.max(sac[0][0], price[0][0]) || 1;
      $('.calc-graf', el).innerHTML = grafico(sac, 'SAC', max) + grafico(price, 'Price', max) + '<p class="calc-leg"><i class="b-jur"></i>juros <i class="b-amo"></i>amortização</p>';
      $('.calc-tabela .tabela-rolagem', el).innerHTML = `<table class="tabela amort"><thead><tr><th>Mês</th><th>SAC parcela</th><th>juros</th><th>amortiz.</th><th>Price parcela</th><th>juros</th><th>amortiz.</th></tr></thead><tbody>${sac.map((s, k) => `<tr><td>${k + 1}º</td><td>${fmtN(s[0])}</td><td>${fmtN(s[1])}</td><td>${fmtN(s[2])}</td><td>${fmtN(price[k][0])}</td><td>${fmtN(price[k][1])}</td><td>${fmtN(price[k][2])}</td></tr>`).join('')}<tr class="total"><td>Total</td><td>${fmtN(soma(sac, 0))}</td><td>${fmtN(js)}</td><td>${fmtN(soma(sac, 2))}</td><td>${fmtN(soma(price, 0))}</td><td>${fmtN(jp)}</td><td>${fmtN(soma(price, 2))}</td></tr></tbody></table>`;
    }
    el.addEventListener('input', atualizar); atualizar();
  }


  function calcEquiv(el) {
    el.innerHTML = `<div class="calc-topo"><span class="calc-selo">Simulador</span><b>LCI/LCA ou CDB?</b></div>
      <div class="calc-entradas quatro">${campo('cdb', 'CDB (% do CDI)', 102, 'min="0" step="1"')}${campo('lci', 'LCI/LCA (% do CDI, isenta)', 90, 'min="0" step="1"')}${campo('cdi', 'CDI ao ano (%)', 13.65, 'min="0" step="0.05"')}${faixa('d', 'Prazo em dias', 1080, 30, 1800)}</div>
      <div class="calc-res" aria-live="polite"></div>`;
    const ler = (k) => num($(`[data-k="${k}"]`, el));
    const aliq = (d) => (d <= 180 ? 0.225 : d <= 360 ? 0.20 : d <= 720 ? 0.175 : 0.15);
    function atualizar() {
      const cdb = Math.max(0, ler('cdb')) / 100, lci = Math.max(0, ler('lci')) / 100, cdi = Math.max(0, ler('cdi')) / 100;
      const d = Math.round(Math.min(1800, Math.max(30, ler('d'))));
      $('[data-v="d"]', el).textContent = d + (d >= 360 ? ' (≈ ' + fmtN(d / 365, 1) + ' anos)' : '');
      const ir = aliq(d), liq = cdb * (1 - ir), equiv = lci / (1 - ir);
      const anos = d / 365, base = 10000;
      const rCdb = base * (Math.pow(1 + cdi * cdb, anos) - 1), rLci = base * (Math.pow(1 + cdi * lci, anos) - 1);
      const rCdbLiq = rCdb * (1 - ir);
      const ganha = Math.abs(liq - lci) < 0.0005 ? 'empate' : liq > lci ? 'CDB' : 'LCI/LCA';
      $('.calc-res', el).innerHTML = `<div class="calc-cards">
        <div><small>Alíquota de IR no prazo</small><b>${pct(ir, 1)}</b><span>tabela regressiva (${d <= 180 ? 'até 180 dias' : d <= 360 ? '181 a 360 dias' : d <= 720 ? '361 a 720 dias' : 'acima de 720 dias'})</span></div>
        <div><small>CDB depois do IR</small><b>${fmtN(liq * 100, 1)}% do CDI</b><span>${fmtN(cdb * 100, 0)}% × (1 − ${fmtN(ir * 100, 1)}%)</span></div>
        <div class="destaque"><small>CDB que empata com a LCI</small><b>${fmtN(equiv * 100, 1)}% do CDI</b><span>${fmtN(lci * 100, 0)}% ÷ (1 − ${fmtN(ir * 100, 1)}%)</span></div></div>
        <p class="calc-veredito ${ganha === 'CDB' ? 'cdb' : ganha === 'empate' ? '' : 'lci'}">${ganha === 'empate' ? 'Empate técnico.' : `Rende mais: <b>${ganha}</b>.`} Em R$ 10.000 (CDI constante, valores aproximados): CDB rende <b>${brl(rCdbLiq)}</b> líquido; LCI/LCA rende <b>${brl(rLci)}</b>.</p>
        ${d < 180 ? '<p class="calc-nota">Atenção: LCI e LCA sem correção por índice de preços têm prazo mínimo de <b>6 meses</b> (Res. CMN 5.215/2025).</p>' : ''}`;
    }
    el.addEventListener('input', atualizar); atualizar();
  }


  function calcIrrv(el) {
    el.innerHTML = `<div class="calc-topo"><span class="calc-selo">Simulador</span><b>IR na venda de ações</b></div>
      <div class="calc-entradas quatro">${campo('v', 'Total vendido no mês (R$)', 50000, 'min="0" step="1000"')}${campo('l', 'Lucro (ou prejuízo, com −) no mês (R$)', 8000, 'step="100"')}${campo('p', 'Prejuízo acumulado a compensar (R$)', 0, 'min="0" step="100"')}
        <label class="calc-campo"><span>Tipo de operação</span><select data-k="t"><option value="c" selected>Comum (swing trade)</option><option value="d">Day trade</option></select></label></div>
      <div class="calc-res" aria-live="polite"></div>`;
    const ler = (k) => num($(`[data-k="${k}"]`, el));
    function atualizar() {
      const v = Math.max(0, ler('v')), l = ler('l'), p = Math.max(0, ler('p')), day = $('[data-k="t"]', el).value === 'd';
      let html = '';
      if (!day && v <= 20000) {
        html = `<div class="calc-cards dois"><div class="destaque"><small>Resultado</small><b>Isento</b><span>vendas de ações à vista até R$ 20 mil no mês (Lei 11.033, art. 3º)</span></div>
          <div><small>Atenção</small><b>${l < 0 ? 'Prejuízo perdido' : 'Nada a pagar'}</b><span>${l < 0 ? 'prejuízo de mês isento não pode ser compensado depois' : 'o lucro de ' + brl(l) + ' não paga IR'}</span></div></div>`;
      } else if (l <= 0) {
        html = `<div class="calc-cards dois"><div><small>Resultado do mês</small><b>${brl(l)}</b><span>sem lucro, sem imposto</span></div>
          <div class="destaque"><small>Prejuízo a levar para frente</small><b>${brl(p - l)}</b><span>${day ? 'compensa só com lucros de day trade' : 'compensa só com lucros de operações comuns'}, sem prazo</span></div></div>`;
      } else {
        const comp = Math.min(p, l), base = l - comp, aliq = day ? 0.20 : 0.15;
        const ir = base * aliq, ret = day ? l * 0.01 : v * 0.00005, darf = Math.max(0, ir - ret);
        html = `<div class="calc-cards">
          <div><small>Base de cálculo</small><b>${brl(base)}</b><span>lucro ${brl(l)}${comp ? ' − prejuízo compensado ' + brl(comp) : ''}</span></div>
          <div><small>IR (${day ? '20%' : '15%'})</small><b>${brl(ir)}</b><span>${day ? 'day trade' : 'operações comuns'}</span></div>
          <div class="destaque"><small>DARF a pagar</small><b>${brl(darf)}</b><span>já descontada a retenção na fonte de ${brl(ret)} (${day ? '1% do resultado' : '0,005% das vendas'})</span></div></div>
          <p class="calc-nota">O investidor paga por <b>DARF</b> até o último dia útil do mês seguinte. ${p - comp > 0 ? 'Ainda sobra prejuízo de ' + brl(p - comp) + ' para compensar depois.' : ''}</p>`;
      }
      $('.calc-res', el).innerHTML = html + '<p class="calc-nota pequeno">Simulação didática: valores de corretagem e emolumentos já devem estar incluídos no lucro.</p>';
    }
    el.addEventListener('input', atualizar); el.addEventListener('change', atualizar); atualizar();
  }

  function montarCalc(el) {
    const f = { bola: calcBola, taxas: calcTaxas, amort: calcAmort, equiv: calcEquiv, irrv: calcIrrv }[el.dataset.calc]; if (!f) return;
    f(el);
    if (MODO_PDF) {
      $$('input, select', el).forEach((x) => { x.disabled = true; });
      const d = $('details', el); if (d) d.remove();
      el.insertAdjacentHTML('beforeend', '<p class="calc-nota pdf-only">No caderno digital, este simulador é interativo: mude os valores e veja o resultado na hora.</p>');
    }
  }

  /* ---------------- jogo relâmpago ---------------- */
  function montarJogo(el) {
    const J = D.jogos[el.dataset.jogo]; if (!J) return;
    if (MODO_PDF) {
      el.innerHTML = `<p class="jogo-pergunta">Gabarito do desafio: ${escH(J.gabarito || J.pergunta)}</p><ul class="jogo-gab">${J.itens.map((x) => `<li><b>${escH(x[0])}</b>: ${escH(x[1])}</li>`).join('')}</ul>`;
      return;
    }
    let rodadas = [], k = 0, pontos = 0, timer = null, inicio = 0, erros = [];
    const TEMPO = 8000;
    function tela0() {
      el.innerHTML = `<p class="jogo-pergunta">10 rodadas · 8 segundos cada</p><span class="jogo-item">${escH(J.pergunta)}</span>
        <p class="pequeno">Seu recorde: <b>${E.recorde || 0}/10</b></p><button class="btn-mao principal" type="button" data-acao="comecar">Começar o desafio</button>`;
    }
    function rodada() {
      const [nome] = rodadas[k];
      el.innerHTML = `<div class="jogo-topo"><span>Rodada ${k + 1}/10</span><span>${pontos} ponto${pontos === 1 ? '' : 's'}</span></div>
        <div class="jogo-tempo"><i></i></div><p class="jogo-pergunta">${escH(J.pergunta)}</p><span class="jogo-item">${escH(nome)}</span>
        <div class="jogo-ops">${J.opcoes.map((o) => `<button type="button" data-op="${escH(o)}">${escH(o)}</button>`).join('')}</div><p class="jogo-msg" aria-live="polite"></p>`;
      const barra = $('.jogo-tempo i', el); inicio = performance.now();
      cancelAnimationFrame(timer);
      const tick = (t) => { const f = Math.max(0, 1 - (t - inicio) / TEMPO); barra.style.transform = `scaleX(${f})`; if (f <= 0) responder(null); else timer = requestAnimationFrame(tick); };
      timer = requestAnimationFrame(tick);
    }
    function responder(op) {
      cancelAnimationFrame(timer);
      const [nome, certo, porque] = rodadas[k];
      const ok = op === certo; if (ok) pontos++; else erros.push([nome, certo, porque]);
      $$('.jogo-ops button', el).forEach((b) => { b.disabled = true; if (b.dataset.op === certo) b.classList.add('certa'); else if (b.dataset.op === op) b.classList.add('errada'); });
      $('.jogo-msg', el).textContent = (ok ? '✓ ' : op ? '✗ ' : '⏱ Tempo! ') + porque;
      setTimeout(() => { k++; if (k < 10) rodada(); else fim(); }, ok ? 1100 : 2200);
    }
    function fim() {
      const novo = pontos > (E.recorde || 0); if (novo) { E.recorde = pontos; salvar(); }
      el.innerHTML = `<div class="jogo-final"><p class="jogo-pergunta">Resultado</p><b>${pontos}/10</b>
        <p>${novo ? 'Novo recorde!' : 'Recorde: ' + E.recorde + '/10'}</p>
        ${erros.length ? `<ul>${erros.map((e) => `<li><b>${escH(e[0])}</b> → ${escH(e[1])}. ${escH(e[2])}</li>`).join('')}</ul>` : '<p>Gabaritou! Nenhum supervisor te engana mais.</p>'}
        <button class="btn-mao principal" type="button" data-acao="comecar">Jogar de novo</button></div>`;
      if (pontos === 10 || novo) confete();
      atualizarGeral();
    }
    el.addEventListener('click', (ev) => {
      if (ev.target.closest('[data-acao="comecar"]')) {
        rodadas = J.itens.slice().sort(() => Math.random() - 0.5).slice(0, 10); k = 0; pontos = 0; erros = []; rodada(); return;
      }
      const b = ev.target.closest('button[data-op]'); if (b && !b.disabled) responder(b.dataset.op);
    });
    tela0();
  }

  /* ---------------- views ---------------- */
  const VIEWS = { inicio: $('#view-inicio'), painel: $('#view-painel') };
  $$('article.resumo').forEach((a) => { VIEWS['resumo-' + a.dataset.cap] = a.closest('.view'); });
  $$('article.capitulo').forEach((a) => { VIEWS['cap-' + a.dataset.cap] = a.closest('.view'); });
  let viewAtual = '';
  function mostrar(view, alvoId) {
    if (!VIEWS[view]) view = 'inicio';
    Object.entries(VIEWS).forEach(([k, v]) => { if (v) v.hidden = k !== view; });
    if (view !== viewAtual) { viewAtual = view; if (!alvoId) window.scrollTo(0, 0); }
    const cap = view.startsWith('cap-') ? CAPS.find((c) => 'cap-' + c.n === view) : null;
    const res = view.startsWith('resumo-') ? CAPS.find((c) => 'resumo-' + c.n === view) : null;
    $('#b-titulo').textContent = cap ? `Cap. ${cap.n} · ${cap.t}` : res ? `Resumo · Cap. ${res.n}` : view === 'painel' ? 'Meu desempenho' : 'Apostila interativa';
    document.title = cap ? `Cap. ${cap.n} · ${cap.t} · Apostila CPA` : res ? `Resumo do cap. ${res.n} · Apostila CPA` : 'Apostila CPA';
    if (view === 'inicio') montarInicio();
    if (view === 'painel') montarPainel();
    if (cap) { $$('.mapa-caderno', VIEWS[view]).forEach((m) => m._desenhar && requestAnimationFrame(m._desenhar)); }
    if (alvoId) {
      const alvo = document.getElementById(alvoId);
      if (alvo) requestAnimationFrame(() => { alvo.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' }); alvo.classList.add('piscar'); setTimeout(() => alvo.classList.remove('piscar'), 1700); });
    }
    marcarGaveta(view);
    progressoLeitura();
  }
  function rotear() {
    const h = decodeURIComponent((location.hash || '#inicio').slice(1));
    if (VIEWS[h]) return mostrar(h);
    const el = h && document.getElementById(h);
    if (el) { const art = el.closest('article.capitulo'); if (art) return mostrar('cap-' + art.dataset.cap, h); }
    mostrar('inicio');
  }

  /* ---------------- início ---------------- */
  function diasParaProva() {
    if (!E.prova) return null;
    const d = new Date(E.prova + 'T12:00:00'); if (isNaN(d)) return null;
    return Math.ceil((d - new Date()) / 86400000);
  }
  function montarInicio() {
    const s = stats(TODAS);
    const vistasCap = (n) => { const secs = $$(`#cap-${n} section.bloco`); return secs.length ? Math.round(secs.filter((x) => E.vistas[x.id]).length / secs.length * 100) : 0; };
    const lidos = CAPS.filter((c) => D.capitulos[c.n] && vistasCap(c.n) >= 90).length;
    $('#st-caps').textContent = `${lidos}/${CAPS.length}`;
    $('#st-resp').textContent = `${s.resp}/${s.total}`;
    $('#st-pct').textContent = s.pct == null ? '—' : s.pct + '%';
    $('#st-erros').textContent = erradas().length;
    const dias = diasParaProva();
    $('#cont-num').textContent = dias == null ? '?' : dias < 0 ? '✓' : dias;
    $('#cont-tit').textContent = dias == null ? 'Quando é a sua prova?' : dias < 0 ? 'Prova realizada' : dias === 1 ? 'dia para a prova' : 'dias para a prova';
    const inp = $('#data-prova'); if (inp && document.activeElement !== inp) inp.value = E.prova || '';
    const ficha = (c, i) => {
      const ok = !!D.capitulos[c.n];
      const sq = ok ? stats(TODAS.filter((q) => q.cap === c.n)) : null;
      const pv = ok ? vistasCap(c.n) : 0;
      const tag = ok ? 'a' : 'div';
      return `<${tag} class="ficha ${c.tema}${ok ? '' : ' em-breve'}" ${ok ? `href="#cap-${c.n}"` : 'aria-disabled="true"'} style="--rot:${[-1.2, .8, -.6, 1.1][i % 4]}deg">
        <div class="ficha-arte"><span class="ficha-num">${c.n}</span>${icone(c.ico)}${ok ? '' : '<span class="ficha-selo">em breve</span>'}</div>
        <div class="ficha-corpo"><span class="ficha-modulo">programa ${c.pd}${c.p ? ` <b class="prio ${c.p}">${c.p === 'alta' ? '🔥 cai muito' : '⚡ cai bastante'}</b>` : ''}</span><span class="ficha-titulo">${escH(c.t)}</span><span class="ficha-sobre">${escH(c.s)}</span>${c.r ? `<span class="ficha-cai">Mais cobrado: ${escH(c.r)}</span>` : ''}
        ${ok ? `<div class="ficha-barra"><i style="width:${pv}%"></i></div><div class="ficha-info"><span>${pv}% estudado</span><span>${sq.resp}/${sq.total} questões${sq.pct != null ? ' · ' + sq.pct + '%' : ''}</span></div>` : '<div class="ficha-info"><span>próxima etapa</span></div>'}</div></${tag}>`;
    };
    $('#fichas').innerHTML = [1, 2, 3, 4].map((m) => {
      const caps = CAPS.filter((c) => c.m === m);
      const prontos = caps.filter((c) => D.capitulos[c.n]).length;
      const aberto = !!(E.mods && E.mods[m]);
      return `<section class="modulo-grupo ${TEMAS_MODULO[m]}${aberto ? ' aberto' : ''}" aria-label="Módulo ${m}">
        <button type="button" class="modulo-cab" data-mod="${m}" aria-expanded="${aberto}" aria-controls="mod-${m}"><span class="modulo-aba">Módulo ${m}</span>
          <span class="modulo-txt"><b class="modulo-nome">${escH(NOMES_MODULOS[m])}</b>
          <span>${PESOS[m][0]}% do programa · ${PESOS[m][1]}% nas últimas provas · ${prontos} de ${caps.length} capítulos prontos</span>
          <span class="modulo-mini" aria-hidden="true">${caps.map((c) => `<i class="${c.tema}${D.capitulos[c.n] ? ' pronto' : ''}"><em>${c.n}</em>${icone(c.ico)}</i>`).join('')}</span></span>
          <span class="modulo-seta" aria-hidden="true">▾</span><span class="modulo-acao">${aberto ? 'fechar' : 'ver capítulos'}</span></button>
        <div class="fichas" id="mod-${m}"${aberto ? '' : ' hidden'}>${caps.map(ficha).join('')}</div></section>`;
    }).join('');
  }

  /* ---------------- painel ---------------- */
  function montarPainel() {
    const s = stats(TODAS), err = erradas();
    $('#pn-resp').textContent = `${s.resp}/${s.total}`;
    $('#pn-pct').textContent = s.pct == null ? '—' : s.pct + '%';
    $('#pn-erros').textContent = err.length;
    $('#pn-rec').textContent = `${E.recorde || 0}/10`;
    const temas = [];
    TODAS.forEach((q) => { if (!temas.find((t) => t.t === q.tema && t.cap === q.cap)) temas.push({ t: q.tema, cap: q.cap }); });
    $('#pn-temas').innerHTML = temas.map((t) => {
      const st = stats(TODAS.filter((q) => q.tema === t.t && q.cap === t.cap));
      return `<div class="barra-tema"><span>${escH(t.t)} <span class="pequeno">· cap. ${t.cap}</span></span>
        <span class="bt-trilho"><i class="ok" style="width:${st.ok / st.total * 100}%"></i><i class="no" style="width:${(st.resp - st.ok) / st.total * 100}%"></i></span>
        <b>${st.pct == null ? '—' : st.pct + '%'}</b></div>`;
    }).join('');
    const sel = $('#tr-tema');
    if (sel && !sel.dataset.ok) {
      sel.innerHTML = '<option value="">Todos os temas</option>' + temas.map((t) => `<option value="${escH(t.t)}">${escH(t.t)}</option>`).join('');
      sel.dataset.ok = '1';
    }
    const alvoErros = $('#pn-lista-erros'); const novoErros = alvoErros.cloneNode(false); alvoErros.replaceWith(novoErros);
    montarLista(novoErros, err, { fresco: true, vazio: s.resp ? 'Nenhum erro pendente. Cada questão que você errar aparece aqui até você acertar.' : 'Você ainda não respondeu questões. Comece pelo capítulo 1.' });
  }
  function treinoRapido() {
    const tema = $('#tr-tema').value, so = $('#tr-so').value, qtd = Number($('#tr-qtd').value) || 10;
    let base = TODAS.filter((q) => !tema || q.tema === tema);
    if (so === 'erros') base = base.filter((q) => E.respostas[q.id] && !E.respostas[q.id].certa);
    if (so === 'novas') base = base.filter((q) => !E.respostas[q.id]);
    base = base.slice().sort(() => Math.random() - 0.5).slice(0, qtd);
    const alvo = $('#tr-lista');
    const novo = alvo.cloneNode(false); alvo.replaceWith(novo);
    montarLista(novo, base, { fresco: true, vazio: so === 'erros' ? 'Você não tem erros pendentes neste tema.' : 'Nenhuma questão encontrada com esses filtros.' });
    novo.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' });
  }

  /* ---------------- leitura: índice lateral, seções vistas, progresso ---------------- */
  function montarIndices() {
    $$('article.capitulo').forEach((art) => {
      const secs = $$('section.bloco', art);
      const lat = art.parentElement.querySelector('.indice-lateral');
      if (lat) lat.innerHTML = `<h3>Neste capítulo</h3><ol>${secs.map((s) => `<li><a href="#${s.id}" data-sec="${s.id}">${escH($('.sobretitulo', s).textContent.split('·')[0].trim())} ${escH(s.dataset.titulo)}</a></li>`).join('')}</ol><div class="il-prog"></div>`;
    });
    const lista = $('#gaveta-lista');
    lista.innerHTML = `<a class="g-item" href="#inicio" data-view="inicio"><span class="g-num" style="background:var(--coral)">⌂</span><span class="g-nome">Início</span></a>
      <a class="g-item" href="#painel" data-view="painel"><span class="g-num" style="background:var(--verde)">✓</span><span class="g-nome">Meu desempenho<small>caderno de erros e treino</small></span></a>
      <div class="g-separador">Capítulos, na ordem do programa da ANBIMA</div>`
      + CAPS.map((c, i) => {
        const ok = !!D.capitulos[c.n];
        const secs = ok ? $$(`#cap-${c.n} section.bloco`) : [];
        const cab = (i === 0 || CAPS[i - 1].m !== c.m) ? `<div class="g-modulo"><b>Módulo ${c.m}</b> ${escH(NOMES_MODULOS[c.m])} <span>${MODULOS[c.m].split('· ')[1]} da prova</span></div>` : '';
        const item = `<a class="g-item ${c.tema}${ok ? '' : ' bloqueado'}" href="#cap-${c.n}" data-view="cap-${c.n}"><span class="g-num">${c.n}</span><span class="g-nome">${escH(c.t)}<small>programa ${escH(c.pd)}${ok ? '' : ' · em breve'}</small></span></a>`;
        if (!ok) return cab + item;
        return cab + `<div class="g-cap" data-cap="${c.n}"><div class="g-linha">${item}<button class="g-seta" type="button" aria-expanded="false" aria-controls="g-sec-${c.n}" aria-label="Mostrar os tópicos do capítulo ${c.n}">▾</button></div>`
          + `<ul class="g-secoes" id="g-sec-${c.n}" hidden>${document.getElementById('resumo-' + c.n) ? `<li><a href="#resumo-${c.n}"><b>★ Resumo em 2 páginas</b></a></li>` : ''}${secs.map((s) => `<li><a href="#${s.id}" data-sec="${s.id}">${escH(s.dataset.titulo)}</a></li>`).join('')}</ul></div>`;
      }).join('');
    marcarVistas();
  }
  function montarBotoesEstudo() {
    $$('article.capitulo section.bloco').forEach((s) => {
      const div = document.createElement('div');
      div.className = 'marcar-estudo';
      div.innerHTML = `<button type="button" class="btn-estudo" data-sec="${s.id}" aria-pressed="false"><span class="caixinha" aria-hidden="true"></span><span class="txt">Marcar como estudado</span></button>`;
      s.appendChild(div);
    });
    atualizarBotoesEstudo();
  }
  function atualizarBotoesEstudo() {
    $$('.btn-estudo').forEach((b) => {
      const ok = !!E.vistas[b.dataset.sec];
      b.setAttribute('aria-pressed', ok ? 'true' : 'false');
      $('.txt', b).textContent = ok ? 'Estudado! (toque para desmarcar)' : 'Marcar como estudado';
    });
  }
  function marcarVistas() { $$('a[data-sec]').forEach((a) => a.classList.toggle('vista', !!E.vistas[a.dataset.sec])); $$('.il-prog').forEach((p) => { const art = p.closest('.cap-layout').querySelector('article'); const secs = $$('section.bloco', art); p.textContent = `${secs.filter((s) => E.vistas[s.id]).length} de ${secs.length} tópicos estudados`; }); }
  function marcarGaveta(view) { $$('.g-item').forEach((a) => a.classList.toggle('atual', a.dataset.view === view)); }
  // abre os tópicos de um capítulo (ou fecha, se já estiver aberto); com "so", fecha os demais
  function abrirTopicos(n, so) {
    $$('.g-cap').forEach((g) => {
      const alvo = g.dataset.cap === String(n);
      const abrir = alvo ? (so ? true : !g.classList.contains('aberto')) : (so ? false : g.classList.contains('aberto'));
      g.classList.toggle('aberto', abrir);
      $('.g-secoes', g).hidden = !abrir;
      $('.g-seta', g).setAttribute('aria-expanded', abrir ? 'true' : 'false');
      $('.g-seta', g).setAttribute('aria-label', (abrir ? 'Esconder' : 'Mostrar') + ' os tópicos do capítulo ' + g.dataset.cap);
    });
  }
  function progressoLeitura() {
    const bar = $('#b-prog'); if (!bar) return;
    const h = document.documentElement; const max = h.scrollHeight - h.clientHeight;
    bar.style.width = max > 0 ? (h.scrollTop / max * 100) + '%' : '0';
  }
  function observarSecoes() {
    if (!('IntersectionObserver' in window)) return;
    const io = new IntersectionObserver((ents) => {
      ents.forEach((en) => {
        if (!en.isIntersecting) return;
        const id = en.target.id;
        $$('.indice-lateral a').forEach((a) => a.classList.toggle('ativa', a.dataset.sec === id));
      });
    }, { rootMargin: '-35% 0px -55% 0px' });
    $$('article.capitulo section.bloco').forEach((s) => io.observe(s));
  }

  /* ---------------- busca ---------------- */
  let INDICE = null;
  function indexar() {
    INDICE = $$('article.capitulo section.bloco').map((s) => ({ id: s.id, cap: s.closest('article').dataset.cap, titulo: s.dataset.titulo, texto: s.innerText.replace(/\s+/g, ' ') }));
  }
  const semAcento = (t) => t.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  function buscar(termo) {
    const out = $('#busca-resultados'); const t = semAcento(termo.trim());
    if (t.length < 2) { out.innerHTML = ''; return; }
    if (!INDICE) indexar();
    const res = INDICE.map((x) => { const n = semAcento(x.texto); const p = n.indexOf(t); return p < 0 ? null : { x, p, peso: (semAcento(x.titulo).includes(t) ? 0 : 1) }; }).filter(Boolean).sort((a, b) => a.peso - b.peso).slice(0, 12);
    if (!res.length) { out.innerHTML = `<li class="busca-vazio">Nada encontrado para “${escH(termo)}”.</li>`; return; }
    out.innerHTML = res.map(({ x, p }) => {
      const ini = Math.max(0, p - 60); const trecho = x.texto.slice(ini, p + t.length + 90);
      const rel = semAcento(trecho).indexOf(t);
      const marcado = escH(trecho.slice(0, rel)) + '<mark>' + escH(trecho.slice(rel, rel + t.length)) + '</mark>' + escH(trecho.slice(rel + t.length));
      return `<li><a href="#${x.id}"><small>Capítulo ${x.cap}</small><b>${escH(x.titulo)}</b><span>${ini ? '…' : ''}${marcado}…</span></a></li>`;
    }).join('');
  }

  /* ---------------- lupa (ampliar figura) ---------------- */
  let zoom = 1;
  function abrirLupa(fig) {
    const svg = $('svg', fig); if (!svg) return;
    zoom = 1; $('#lupa-folha').style.setProperty('--z', 1);
    $('#lupa-folha').innerHTML = svg.outerHTML; $('#lupa').hidden = false; $('#lupa-fechar').focus();
  }

  /* ---------------- tema claro / escuro ---------------- */
  // Sem escolha salva, segue o aparelho (ou o tema do claude.ai). O botão grava a escolha.
  const raiz = document.documentElement;
  const mqEscuro = window.matchMedia ? matchMedia('(prefers-color-scheme: dark)') : null;
  const temaEfetivo = () => raiz.dataset.theme || (mqEscuro && mqEscuro.matches ? 'dark' : 'light');
  function aplicarTema() {
    if (E.tema === 'light' || E.tema === 'dark') raiz.setAttribute('data-theme', E.tema);
    const ef = temaEfetivo();
    raiz.setAttribute('data-tema-efetivo', ef);
    const b = $('#b-tema'); if (!b) return;
    b.setAttribute('aria-label', ef === 'dark' ? 'Mudar para o tema claro' : 'Mudar para o tema escuro');
    $('#b-tema-txt').textContent = ef === 'dark' ? 'Escuro' : 'Claro';
  }
  function alternarTema() {
    E.tema = temaEfetivo() === 'dark' ? 'light' : 'dark'; salvar(); aplicarTema();
    $$('.mapa-caderno').forEach((m) => m._desenhar && m._desenhar());
    toast(E.tema === 'dark' ? 'Tema escuro' : 'Tema claro');
  }

  /* ---------------- modo treino ---------------- */
  function aplicarTreino() {
    document.body.classList.toggle('treino', !!E.treino);
    $('#b-treino').setAttribute('aria-pressed', E.treino ? 'true' : 'false');
    $$('.mc-ramo li.ver, .frases-resumo .manuscrito.ver, dl.termos dd.ver, table.dicionario .trad.ver').forEach((x) => x.classList.remove('ver'));
  }

  function atualizarGeral() { if (viewAtual === 'inicio') montarInicio(); }

  /* ---------------- início do app ---------------- */
  function iniciar() {
    $$('.mapa-caderno').forEach(montarMapa);
    $$('.jogo[data-jogo]').forEach(montarJogo);
    $$('.calc[data-calc]').forEach(montarCalc);
    $$('.lista-questoes[data-questoes]').forEach((el) => {
      const n = Number(el.dataset.questoes); const lista = TODAS.filter((q) => q.cap === n);
      if (MODO_PDF) montarListaImpressa(el, lista); else montarLista(el, lista);
    });
    if (MODO_PDF) {
      $$('.ce').forEach((c) => c.classList.remove('fechado'));
      $$('.view').forEach((v) => { v.hidden = false; });
      return;
    }
    montarIndices();
    montarBotoesEstudo();
    observarSecoes();
    aplicarTreino();
    aplicarTema();
    $('#b-tema').addEventListener('click', alternarTema);
    if (mqEscuro && mqEscuro.addEventListener) mqEscuro.addEventListener('change', aplicarTema);
    if (window.MutationObserver) new MutationObserver(() => { const ef = temaEfetivo(); if (raiz.getAttribute('data-tema-efetivo') !== ef) raiz.setAttribute('data-tema-efetivo', ef); }).observe(raiz, { attributes: true, attributeFilter: ['data-theme'] });

    document.addEventListener('click', (ev) => {
      const est = ev.target.closest('.btn-estudo');
      if (est) {
        const id = est.dataset.sec;
        if (E.vistas[id]) delete E.vistas[id]; else E.vistas[id] = 1;
        salvar(); atualizarBotoesEstudo(); marcarVistas(); atualizarGeral();
        if (E.vistas[id]) toast('Tópico marcado como estudado');
        return;
      }
      const ce = ev.target.closest('.ce');
      if (ce && ce.classList.contains('fechado')) { ce.classList.remove('fechado'); ce.classList.add('abriu'); return; }
      const fr = ev.target.closest('.treino .frases-resumo .manuscrito'); if (fr) { fr.classList.toggle('ver'); return; }
      const tr = ev.target.closest('.treino dl.termos dd, .treino table.dicionario .trad'); if (tr) { tr.classList.toggle('ver'); return; }
      const fig = ev.target.closest('.figura[data-zoom]'); if (fig && !ev.target.closest('a')) { abrirLupa(fig); return; }
      const link = ev.target.closest('#gaveta a, #busca-resultados a'); if (link) { fecharGaveta(); $('#busca').hidden = true; }
    });
    const gav = $('#gaveta');
    const abrirGaveta = () => {
      const atual = (viewAtual.match(/^(?:cap|resumo)-(\d+)$/) || [])[1];
      abrirTopicos(atual || 0, true);
      gav.hidden = false; $('#b-menu').setAttribute('aria-expanded', 'true'); $('#gaveta-fechar').focus();
    };
    $('#gaveta-lista').addEventListener('click', (ev) => {
      const seta = ev.target.closest('.g-seta');
      if (seta) { ev.preventDefault(); abrirTopicos(seta.closest('.g-cap').dataset.cap, false); }
    });
    function fecharGaveta() { gav.hidden = true; $('#b-menu').setAttribute('aria-expanded', 'false'); }
    $('#b-menu').addEventListener('click', abrirGaveta);
    $('#gaveta-fechar').addEventListener('click', fecharGaveta);
    gav.addEventListener('click', (ev) => { if (ev.target === gav) fecharGaveta(); });
    $('#b-treino').addEventListener('click', () => { E.treino = !E.treino; salvar(); aplicarTreino(); toast(E.treino ? 'Modo treino ligado: respostas escondidas' : 'Modo treino desligado'); });
    const abrirBusca = () => { $('#busca').hidden = false; $('#busca-texto').focus(); };
    $('#b-busca').addEventListener('click', abrirBusca);
    $$('[data-abrir="busca"]').forEach((b) => b.addEventListener('click', abrirBusca));
    $('#busca-fechar').addEventListener('click', () => { $('#busca').hidden = true; });
    $('#busca').addEventListener('click', (ev) => { if (ev.target.id === 'busca') $('#busca').hidden = true; });
    $('#busca-texto').addEventListener('input', (ev) => buscar(ev.target.value));
    $('#busca-sugestoes').innerHTML = ['CMN', 'recondução', 'Previc', 'banco múltiplo', 'FGC', 'SEP', 'valor mobiliário', 'agência de fomento'].map((s) => `<button type="button">${s}</button>`).join('');
    $('#busca-sugestoes').addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (b) { $('#busca-texto').value = b.textContent; buscar(b.textContent); } });
    $('#lupa-fechar').addEventListener('click', () => { $('#lupa').hidden = true; });
    $('#lupa-mais').addEventListener('click', () => { zoom = Math.min(3, zoom + 0.4); $('#lupa-folha').style.setProperty('--z', zoom); });
    $('#lupa-menos').addEventListener('click', () => { zoom = Math.max(1, zoom - 0.4); $('#lupa-folha').style.setProperty('--z', zoom); });
    document.addEventListener('keydown', (ev) => {
      if (ev.key === 'Escape') { fecharGaveta(); $('#busca').hidden = true; $('#lupa').hidden = true; }
      if (ev.key === '/' && !ev.target.closest('input, textarea, select')) { ev.preventDefault(); abrirBusca(); }
    });
    $('#fichas').addEventListener('click', (ev) => {
      const cab = ev.target.closest('.modulo-cab'); if (!cab) return;
      const m = cab.dataset.mod;
      E.mods = E.mods || {};
      if (E.mods[m]) delete E.mods[m]; else E.mods[m] = 1;
      salvar(); montarInicio();
      if (E.mods[m]) requestAnimationFrame(() => { const g = $(`.modulo-cab[data-mod="${m}"]`); if (g) g.scrollIntoView({ behavior: semMovimento() ? 'auto' : 'smooth', block: 'start' }); });
    });
    $('#data-prova').addEventListener('change', (ev) => { E.prova = ev.target.value; salvar(); montarInicio(); });
    $('#tr-ir').addEventListener('click', treinoRapido);
    window.addEventListener('scroll', progressoLeitura, { passive: true });
    window.addEventListener('hashchange', rotear);
    rotear();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
