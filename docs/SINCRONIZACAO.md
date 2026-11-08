# Sincronização em nuvem (opcional) — Supabase

O Caderno de Erros funciona **100% localmente** (IndexedDB), inclusive sem internet. A sincronização é uma
camada adicional para acessar os mesmos dados no computador, no tablet e no celular. Se ela não estiver
configurada — ou se a nuvem ficar indisponível — nada muda no uso diário: tudo continua salvo no aparelho e as
alterações pendentes são enviadas quando a conexão voltar.

> O aplicativo **nunca** mostra "Sincronizado" se os dados estiverem apenas no dispositivo. Os estados possíveis
> são: *Salvo neste dispositivo* (sem nuvem), *Nuvem desconectada*, *Sincronizando…*, *N alterações a enviar*,
> *Offline*, *Falha na sincronização* e *Sincronizado às HH:MM* (somente após sucesso real e sem pendências).

## O que você precisa

- Uma conta gratuita no [Supabase](https://supabase.com) (o plano gratuito é suficiente para uso pessoal).
- Cerca de 10 minutos.

## Passo a passo

### 1. Criar o projeto

1. Acesse <https://supabase.com/dashboard> e clique em **New project**.
2. Dê um nome (ex.: `caderno-de-erros`), defina uma senha para o banco e escolha a região mais próxima
   (ex.: *South America (São Paulo)*).
3. Aguarde a criação (1–2 minutos).

### 2. Criar a estrutura do banco

1. No menu lateral, abra **SQL Editor → New query**.
2. Copie **todo** o conteúdo de [`docs/supabase.sql`](./supabase.sql), cole no editor e clique em **Run**.
3. Deve aparecer *Success. No rows returned*.

O script cria a tabela `caderno_records`, ativa a **segurança por linha (RLS)** — cada conta só acessa os
próprios dados — e a função `caderno_push`, que aplica a regra de conflitos.

### 3. Configurar a autenticação

1. Em **Authentication → Sign In / Providers**, mantenha **Email** habilitado.
2. Em **Authentication → URL Configuration**, preencha *Site URL* com o endereço onde o aplicativo está publicado
   (ex.: `https://SEU-USUARIO.github.io/caderno-de-erros-shaianee/`). Isso é usado no link de confirmação
   enviado por e-mail.
3. (Opcional) Se preferir não confirmar o e-mail, desative **Confirm email** em
   *Authentication → Sign In / Providers → Email*.

### 4. Copiar as credenciais públicas

Em **Project Settings → API** (ou *Data API*), copie:

- **Project URL** — algo como `https://abcdefgh.supabase.co`
- **anon public key** — uma chave longa que começa com `eyJ…`

> A *anon key* é pública por definição: ela só permite o que as políticas RLS autorizam. **Nunca** use a
> `service_role key` no aplicativo.

### 5. Ativar no aplicativo

Escolha **uma** das opções:

**A) Pela tela (mais simples)** — em cada dispositivo:

1. Abra **Backup e Configurações → Sincronização em nuvem**.
2. Informe a *URL do projeto* e a *chave pública* e clique em **Salvar configuração**.
3. Na primeira vez, use **Criar conta** (e-mail e senha). Nos demais dispositivos, use **Entrar** com a mesma conta.

**B) Na publicação (fica ativa para todos os acessos)** — crie um arquivo `.env.local` na raiz do projeto
(veja `.env.example`):

```bash
VITE_SUPABASE_URL=https://abcdefgh.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...
```

e gere uma nova versão com `npm run build`. Ao publicar pelo GitHub Actions, cadastre as mesmas variáveis em
**Settings → Secrets and variables → Actions → Variables** do repositório (`VITE_SUPABASE_URL` e
`VITE_SUPABASE_ANON_KEY`).

## Como a sincronização funciona

- **Quando sincroniza:** ao entrar na conta, ao abrir o aplicativo, poucos segundos depois de cada alteração,
  a cada 5 minutos e sempre que a conexão volta. Também há o botão **Sincronizar agora**.
- **Primeira sincronização:** todos os dados já existentes no aparelho são enviados; os dados da nuvem são
  recebidos e mesclados (nada é apagado).
- **Conflitos:** se o mesmo registro for alterado em dois aparelhos, vale a **alteração mais recente**
  (comparação feita registro a registro, no aparelho e no servidor).
- **Exclusões** feitas em um aparelho são propagadas aos demais.
- **Matérias e tópicos com o mesmo nome** criados offline em aparelhos diferentes são **unificados**
  automaticamente (os registros vinculados são preservados).
- **Falhas de conexão:** as alterações continuam salvas localmente como "pendentes" e são reenviadas na
  próxima tentativa.
- **Sair da conta** não apaga nada do aparelho; o caderno continua funcionando no modo local.

## Solução de problemas

| Mensagem | O que fazer |
| --- | --- |
| *A estrutura do banco na nuvem não foi encontrada* | Execute novamente o `docs/supabase.sql` no SQL Editor. |
| *Confirme seu e-mail pelo link enviado* | Abra o e-mail de confirmação do Supabase (verifique o spam). |
| *E-mail ou senha incorretos* | Confira os dados ou crie a conta pela aba **Criar conta**. |
| *Sem conexão com o servidor* | Verifique a internet. Nada foi perdido; a sincronização será retomada. |

Mesmo com a sincronização ativa, continue exportando **backups JSON** periodicamente.
