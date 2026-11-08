/**
 * Teste de ponta a ponta (navegador real) da aplicação publicada.
 *
 * Uso:
 *   npm run build && npx vite preview --port 4173 &
 *   npm run e2e                      # BASE_URL padrão: http://localhost:4173
 *
 * Requer o pacote "playwright" com Chromium (npx playwright install chromium).
 * Cada cenário usa um perfil de navegador novo (banco IndexedDB vazio).
 * As capturas de tela ficam em ./e2e-output.
 */
import { createRequire } from 'node:module';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require('playwright');
} catch {
  console.error('Pacote "playwright" não encontrado. Instale com: npm i -D playwright && npx playwright install chromium');
  process.exit(1);
}
const { chromium, devices } = playwright;

const BASE = (process.env.BASE_URL ?? 'http://localhost:4173').replace(/\/$/, '');
const OUT = path.resolve('e2e-output');
await mkdir(OUT, { recursive: true });

const results = [];
async function scenario(name, fn) {
  const started = Date.now();
  try {
    await fn();
    results.push({ name, ok: true, ms: Date.now() - started });
    console.log(`✓ ${name}`);
  } catch (error) {
    results.push({ name, ok: false, error: String(error?.stack ?? error) });
    console.error(`✗ ${name}\n  ${String(error?.message ?? error)}`);
  }
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const browser = await chromium.launch();

async function newPage(options = { viewport: { width: 1440, height: 1000 } }, { named = true } = {}) {
  const context = await browser.newContext({ acceptDownloads: true, ...options });
  // Caderno já identificado (a tela de boas-vindas é testada no primeiro cenário).
  if (named) {
    await context.addInitScript(() => {
      const key = 'caderno-erros:profile';
      if (!localStorage.getItem(key)) localStorage.setItem(key, JSON.stringify({ name: 'Shaiane Carvalho', skipped: false }));
    });
  }
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => m.type() === 'error' && errors.push(m.text()));
  return { context, page, errors };
}

const go = (page, route = '/') => page.goto(`${BASE}/#${route}`);

/** Registra um erro pelo formulário (criando matéria e tópico se necessário). */
async function registerError(page, { subject, topic, description, priority = 'Prioridade alta', origin = 'Confusão entre conceitos', createSubject = false, createTopic = false }) {
  await page.getByRole('button', { name: 'Registrar novo erro' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Registrar novo erro' });
  await dialog.waitFor();
  if (createSubject) {
    await dialog.getByRole('button', { name: 'Nova matéria' }).click();
    await dialog.getByLabel('Nome da nova matéria').fill(subject);
    await dialog.getByRole('button', { name: 'Criar' }).click();
  } else {
    await dialog.getByLabel('Matéria').selectOption({ label: subject });
  }
  if (createTopic) {
    await dialog.getByRole('button', { name: 'Novo tópico' }).click();
    await dialog.getByLabel('Nome do novo tópico').fill(topic);
    await dialog.getByRole('button', { name: 'Criar' }).click();
  } else {
    await dialog.getByLabel('Tópico').selectOption({ label: topic });
  }
  await dialog.getByLabel('Descrição do erro').fill(description);
  await dialog.getByLabel('Correção ou entendimento correto').fill('Entendimento correto registrado no teste automatizado.');
  await dialog.getByLabel('Como evitar esse erro novamente?').fill('Revisar o conteúdo e resolver novas questões.');
  await dialog.getByText(priority, { exact: true }).click();
  await dialog.getByText(origin, { exact: true }).click();
  await dialog.getByRole('button', { name: 'Salvar registro' }).click();
  await page.getByText('Erro registrado com sucesso!').last().waitFor();
  await dialog.waitFor({ state: 'detached' });
}

// ---------------------------------------------------------------------------
await scenario('Cadastro, validação, persistência após recarregar, revisão e exportação', async () => {
  const { page, errors, context } = await newPage(undefined, { named: false });
  await go(page);
  // Primeira abertura: boas-vindas pedem o nome, que passa a aparecer na saudação.
  const welcome = page.getByRole('dialog', { name: /Boas-vindas/ });
  await welcome.getByLabel('Qual é o seu nome?').fill('Shaiane Carvalho');
  await welcome.getByRole('button', { name: 'Começar' }).click();
  await page.getByRole('heading', { name: /(Bom dia|Boa tarde|Boa noite), Shaiane/ }).waitFor();

  // Validação: salvar vazio exibe mensagens.
  await page.getByRole('button', { name: 'Registrar novo erro' }).first().click();
  const dialog = page.getByRole('dialog', { name: 'Registrar novo erro' });
  await dialog.getByRole('button', { name: 'Salvar registro' }).click();
  for (const msg of ['Selecione ou crie a matéria.', 'Descreva o erro cometido.', 'Escolha a prioridade.', 'Escolha a origem do erro.']) {
    await dialog.getByText(msg).waitFor();
  }
  await dialog.getByRole('button', { name: 'Cancelar' }).click();

  await registerError(page, {
    subject: 'Direito Administrativo',
    topic: 'Atos administrativos',
    description: 'Confundi anulação com revogação do ato administrativo.',
    createSubject: true,
    createTopic: true,
  });
  await registerError(page, {
    subject: 'Direito Administrativo',
    topic: 'Atos administrativos',
    description: 'Esqueci que a revogação produz efeitos ex nunc.',
    priority: 'Prioridade média',
    origin: 'Esquecimento',
  });

  // Indicadores atualizados no painel.
  const total = page.getByRole('link', { name: /Erros registrados/ });
  await total.getByText('2', { exact: true }).waitFor();

  // Persistência após atualizar a página.
  await page.reload();
  await go(page, '/erros');
  await page.getByText('Confundi anulação com revogação do ato administrativo.').waitFor();
  await page.screenshot({ path: path.join(OUT, 'desktop-meus-erros.png'), fullPage: true });

  // Alteração rápida de prioridade e de origem na listagem.
  const card = page.getByRole('article', { name: /Confundi anulação/ });
  await card.getByRole('button', { name: /Alterar prioridade/ }).click();
  await page.getByRole('menuitemradio', { name: /Prioridade média/ }).click();
  await page.getByText('Classificação atualizada').waitFor();
  await card.getByRole('button', { name: /Alterar origem/ }).click();
  await page.getByRole('menuitemradio', { name: /Erro de interpretação/ }).click();
  await page.getByText('Origem do erro atualizada').waitFor();

  // Pesquisa e filtros combinados.
  await page.getByLabel('Pesquisar registros').fill('ex nunc');
  await page.getByText('1 registro', { exact: false }).first().waitFor();
  await page.getByLabel('Pesquisar registros').fill('');
  await page.getByRole('group', { name: 'Filtrar por origem do erro' }).getByRole('button', { name: 'Esquecimento' }).click();
  await page.getByText('Esqueci que a revogação').waitFor();
  await page.getByText('Confundi anulação com revogação').waitFor({ state: 'detached', timeout: 5000 });
  await page.getByRole('button', { name: /Limpar todos os filtros/ }).click();

  // Segundo ciclo: correção oculta, revelar e marcar como superado.
  await go(page, '/segundo-ciclo');
  await page.getByRole('button', { name: /Iniciar revisão/ }).click();
  await page.getByRole('button', { name: 'Revelar correção' }).waitFor();
  assert((await page.getByText('Entendimento correto registrado').count()) === 0, 'Correção deveria estar oculta');
  await page.getByRole('button', { name: 'Revelar correção' }).click();
  await page.getByText('Entendimento correto registrado').first().waitFor();
  await page.screenshot({ path: path.join(OUT, 'desktop-revisao.png'), fullPage: true });
  await page.getByRole('button', { name: 'Marcar como superado' }).click();
  await page.getByRole('button', { name: 'Revelar correção' }).click();
  await page.getByRole('button', { name: /prioridade média/i }).first().click();
  await page.getByText('Revisão concluída!').waitFor();

  // Exportação.
  await go(page, '/backup');
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Exportar backup (JSON)' }).click()]);
  const file = path.join(OUT, 'backup-exportado.json');
  await download.saveAs(file);
  const json = JSON.parse(await readFile(file, 'utf8'));
  assert(json.app === 'caderno-de-erros' && json.errors.length === 2, 'Backup exportado incompleto');
  assert(json.errors.some((e) => e.priority === 'superado'), 'Erro superado ausente no backup');
  assert(json.reviews.length === 2, `Esperadas 2 revisões, obtidas ${json.reviews.length}`);
  assert(json.errors.every((e) => e.origin), 'Origens ausentes no backup');

  await page.screenshot({ path: path.join(OUT, 'desktop-backup.png'), fullPage: true });
  assert(errors.length === 0, `Erros no console: ${errors.join(' | ')}`);
  await context.close();
});

// ---------------------------------------------------------------------------
const sampleBackup = (() => {
  // Dados SOMENTE para o teste automatizado (perfil de navegador temporário).
  const now = Date.now();
  const day = 86_400_000;
  const iso = (offset) => new Date(now - offset * day).toISOString();
  const subjects = [
    ['s-const', 'Direito Constitucional'],
    ['s-adm', 'Direito Administrativo'],
    ['s-port', 'Língua Portuguesa'],
    ['s-rlm', 'Raciocínio Lógico'],
  ].map(([id, name]) => ({ id, name, createdAt: iso(120), updatedAt: iso(120) }));
  const topics = [
    ['t-df', 's-const', 'Direitos fundamentais'],
    ['t-cc', 's-const', 'Controle de constitucionalidade'],
    ['t-atos', 's-adm', 'Atos administrativos'],
    ['t-lic', 's-adm', 'Licitações'],
    ['t-crase', 's-port', 'Crase'],
    ['t-conc', 's-port', 'Concordância verbal'],
    ['t-prop', 's-rlm', 'Proposições'],
  ].map(([id, subjectId, name]) => ({ id, subjectId, name, createdAt: iso(120), updatedAt: iso(120) }));
  const origins = ['desconhecimento', 'confusao', 'esquecimento', 'interpretacao'];
  const priorities = ['alta', 'alta', 'media', 'superado'];
  const errors = Array.from({ length: 28 }, (_, i) => {
    const t = topics[i % topics.length];
    const created = iso(100 - i * 3.4);
    const priority = priorities[i % priorities.length];
    return {
      id: `e2e-${i}`,
      subjectId: t.subjectId,
      topicId: t.id,
      description: `Registro de teste ${i + 1} sobre ${t.name.toLowerCase()}.`,
      correction: `Correção do registro ${i + 1}.`,
      prevention: 'Revisar e resolver questões.',
      priority,
      origin: i % 9 === 0 ? undefined : origins[(i * 7) % 4],
      reference: i % 3 === 0 ? `Banca X ${2020 + (i % 5)} — Q${i + 10}` : '',
      notes: '',
      createdAt: created,
      updatedAt: created,
      lastReviewedAt: null,
      reviewCount: 0,
      resolvedAt: priority === 'superado' ? iso(90 - i * 3) : null,
    };
  });
  return { app: 'caderno-de-erros', formatVersion: 2, exportedAt: new Date().toISOString(), owner: 'teste', subjects, topics, errors, history: [], reviews: [] };
})();
const sampleFile = path.join(OUT, 'amostra-teste.json');
await writeFile(sampleFile, JSON.stringify(sampleBackup));

await scenario('Importação (mesclar e substituir), gráficos e responsividade', async () => {
  const { page, errors, context } = await newPage();
  await go(page, '/backup');
  await page.getByLabel('Selecionar arquivo de backup JSON').setInputFiles(sampleFile);
  await page.getByText('Resumo antes da importação').waitFor();
  await page.getByText(/não classificado/i).first().waitFor();
  await page.getByRole('button', { name: 'Mesclar dados' }).click();
  await page.getByText('Importação concluída').last().waitFor();

  // Reimportar o mesmo arquivo não duplica.
  await page.getByLabel('Selecionar arquivo de backup JSON').setInputFiles(sampleFile);
  await page.getByText('Resumo antes da importação').waitFor();
  await page.getByRole('button', { name: 'Mesclar dados' }).click();
  await page.getByText('Importação concluída').last().waitFor();

  // Arquivo inválido é recusado sem alterar dados.
  const invalid = path.join(OUT, 'invalido.json');
  await writeFile(invalid, '{ isto não é json');
  await page.getByLabel('Selecionar arquivo de backup JSON').setInputFiles(invalid);
  await page.getByText(/não é um JSON válido/).waitFor();

  await go(page);
  const total = page.getByRole('link', { name: /Erros registrados/ });
  await total.getByText('28', { exact: true }).waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'desktop-painel.png'), fullPage: true });
  await go(page, '/evolucao');
  await page.getByText('Onde concentrar seus esforços').waitFor();
  await page.waitForTimeout(600);
  await page.screenshot({ path: path.join(OUT, 'desktop-evolucao.png'), fullPage: true });
  await go(page, '/materias');
  await page.getByText('Direito Constitucional').waitFor();
  await page.screenshot({ path: path.join(OUT, 'desktop-materias.png'), fullPage: true });
  await go(page, '/segundo-ciclo');
  await page.screenshot({ path: path.join(OUT, 'desktop-segundo-ciclo.png'), fullPage: true });

  // Substituir exige confirmação explícita e cria ponto de restauração.
  await go(page, '/backup');
  await page.getByLabel('Selecionar arquivo de backup JSON').setInputFiles(sampleFile);
  await page.getByText('Substituir os dados existentes').click();
  await page.getByRole('button', { name: 'Substituir dados…' }).click();
  const confirm = page.getByRole('dialog', { name: 'Substituir todos os dados?' });
  const confirmButton = confirm.getByRole('button', { name: 'Substituir dados' });
  assert(await confirmButton.isDisabled(), 'Substituição deveria exigir digitação de confirmação');
  await confirm.getByLabel(/Digite SUBSTITUIR/).fill('SUBSTITUIR');
  await confirmButton.click();
  await page.getByText('Importação concluída').last().waitFor();
  await page.getByText('Antes de substituir os dados por um backup').waitFor();

  // Tamanhos de tela: sem rolagem horizontal em nenhuma página.
  const routes = ['/', '/erros', '/segundo-ciclo', '/evolucao', '/materias', '/backup', '/erros/e2e-1', '/segundo-ciclo/revisar/e2e-0'];
  for (const viewport of [
    { width: 360, height: 780 },
    { width: 390, height: 844 },
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
    { width: 1920, height: 1080 },
  ]) {
    await page.setViewportSize(viewport);
    for (const r of routes) {
      await go(page, r);
      await page.waitForTimeout(350);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert(overflow <= 1, `Rolagem horizontal de ${overflow}px em ${r} (${viewport.width}px)`);
    }
  }
  assert(errors.length === 0, `Erros no console: ${errors.join(' | ')}`);
  await context.close();
});

// ---------------------------------------------------------------------------
await scenario('Experiência mobile (iPhone e Android)', async () => {
  for (const [label, device] of [
    ['iphone', devices['iPhone 13']],
    ['android', devices['Pixel 7']],
  ]) {
    const { page, errors, context } = await newPage({ ...device });
    await go(page, '/backup');
    await page.getByLabel('Selecionar arquivo de backup JSON').setInputFiles(sampleFile);
    await page.getByRole('button', { name: 'Mesclar dados' }).click();
    await page.getByText('Importação concluída').last().waitFor();
    await go(page);
    await page.getByRole('navigation', { name: 'Navegação principal' }).waitFor();
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(OUT, `${label}-painel.png`), fullPage: true });
    // Menu "Mais" e navegação inferior.
    await page.getByRole('button', { name: 'Mais', exact: true }).click();
    await page.getByRole('dialog', { name: 'Mais opções' }).getByRole('link', { name: /Minha Evolução/ }).click();
    await page.getByRole('heading', { name: 'Minha Evolução' }).waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${label}-evolucao.png`), fullPage: true });
    await page.getByRole('navigation', { name: 'Navegação principal' }).getByRole('link', { name: 'Erros', exact: true }).click();
    await page.getByRole('heading', { name: 'Meus Erros' }).waitFor();
    await page.screenshot({ path: path.join(OUT, `${label}-meus-erros.png`), fullPage: true });
    // Formulário em tela de celular.
    await page.getByRole('button', { name: 'Registrar novo erro' }).last().click();
    await page.getByRole('dialog', { name: 'Registrar novo erro' }).waitFor();
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(OUT, `${label}-formulario.png`) });
    assert(errors.length === 0, `Erros no console (${label}): ${errors.join(' | ')}`);
    await context.close();
  }
});

// ---------------------------------------------------------------------------
await scenario('PWA: manifest, service worker e funcionamento offline', async () => {
  const { page, context } = await newPage();
  await go(page);
  const manifest = await page.evaluate(async () => {
    const link = document.querySelector('link[rel="manifest"]');
    if (!link) return null;
    return (await fetch(link.href)).json();
  });
  assert(manifest && manifest.icons?.length >= 3 && manifest.display === 'standalone', 'Manifest inválido');
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    return !!reg.active;
  });
  await page.reload();
  await page.waitForFunction(() => !!navigator.serviceWorker.controller, null, { timeout: 15000 });
  // Registra um erro e fica offline.
  await registerError(page, {
    subject: 'Língua Portuguesa',
    topic: 'Crase',
    description: 'Usei crase antes de palavra masculina.',
    createSubject: true,
    createTopic: true,
    origin: 'Desconhecimento',
  });
  await context.setOffline(true);
  await page.reload();
  await go(page, '/erros');
  await page.getByText('Usei crase antes de palavra masculina.').waitFor();
  await registerError(page, { subject: 'Língua Portuguesa', topic: 'Crase', description: 'Registro feito sem internet.' });
  await context.setOffline(false);
  await context.close();
});

await browser.close();

const failed = results.filter((r) => !r.ok);
await writeFile(path.join(OUT, 'resultado.json'), JSON.stringify(results, null, 2));
console.log(`\n${results.length - failed.length}/${results.length} cenários aprovados. Capturas em ${OUT}`);
process.exit(failed.length ? 1 : 0);
