# Controle de Doações — ONG Recife

Sistema web para a equipe da ONG registrar e acompanhar doações (roupas, alimentos, móveis, brinquedos e outros), no lugar do caderno.

- **Cadastro** com nome e telefone do doador, tipo e descrição.
- **Endereço de retirada pelo CEP:** rua, bairro e cidade são preenchidos automaticamente (ViaCEP, com BrasilAPI de reserva). Número e complemento ficam com quem cadastra. CEP inválido ou não encontrado gera uma mensagem clara.
- **Lista** com filtro por tipo e por status (Recebida, Em triagem, Entregue) e troca de status direto no cartão.
- **Login** exclusivo para a equipe.
- **Painel** com a quantidade de doações por tipo e por status.

🌐 **Site publicado:** https://doacoes-ong.vercel.app (acesso só para a equipe)

Stack: React + TypeScript (Vite), Supabase (Postgres + Auth), publicado na Vercel.
Cada decisão técnica está explicada em **[DECISOES.md](DECISOES.md)**.

---

## Rodando localmente

Requisitos: Node.js 20+.

```bash
npm install
cp .env.example .env.local   # preencha com os dados do Supabase (veja abaixo)
npm run dev                  # abre em http://localhost:5173
```

### Variáveis de ambiente

| Variável | Onde encontrar |
|---|---|
| `VITE_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `VITE_SUPABASE_ANON_KEY` | Supabase → Project Settings → API → chave `anon` `public` |

> Use **somente** a chave `anon`. A chave `service_role` nunca deve ir para o front-end nem para o repositório.

### Comandos

| Comando | O que faz |
|---|---|
| `npm run dev` | servidor de desenvolvimento |
| `npm test` | testes em modo observação (`npm test -- --run` roda uma vez) |
| `npm run lint` | verificação de código (oxlint) |
| `npm run build` | checagem de tipos + build de produção em `dist/` |
| `npm run verificar:rls` | confere, no Supabase real, que ninguém sem login lê, cadastra ou altera doações |

Os testes automáticos rodam **sem internet e sem chaves**: a API de CEP e o Supabase são simulados.

---

## Configurando o Supabase (uma vez)

1. **Criar a tabela e as regras de segurança:** no painel do Supabase, abra **SQL Editor → New query**, cole todo o conteúdo de [`supabase/migrations/20261123000000_criar_doacoes.sql`](supabase/migrations/20261123000000_criar_doacoes.sql) e clique em **Run**.
2. **Bloquear cadastro público:** em **Authentication → Sign In / Providers**, desligue **Allow new users to sign up**.
3. **Criar as contas da equipe:** em **Authentication → Users → Add user → Create new user**, informe e-mail e senha e marque **Auto Confirm User**.
4. **Liberar cada pessoa na equipe.** Ter conta não basta: só quem está na tabela `equipe` vê as doações. No **SQL Editor**:
   ```sql
   insert into public.equipe (user_id)
   select id from auth.users where email = 'pessoa@exemplo.org'
   on conflict do nothing;
   ```
   Para **remover** o acesso de alguém: `delete from public.equipe where user_id = (select id from auth.users where email = 'pessoa@exemplo.org');`
   Quem entra sem estar liberado vê a tela "Acesso ainda não liberado".
5. **Conferir a segurança:** com o `.env.local` preenchido, rode `npm run verificar:rls`. O esperado é `OK: acesso anônimo bloqueado`. Se também preencher `VERIFICAR_EMAIL` e `VERIFICAR_SENHA` (de alguém da equipe), o script confere que essa pessoa está liberada.

### Redefinir a senha de alguém da equipe
Ainda não há "esqueci minha senha" no sistema. Quem administra faz assim: **Authentication → Users**, clique no usuário → **Send password recovery** (exige e-mail configurado no Supabase) ou apague o usuário e crie de novo com uma senha nova.

---

## Publicando na Vercel

1. Em [vercel.com/new](https://vercel.com/new), importe este repositório do GitHub. O Vercel detecta o Vite sozinho.
2. Em **Environment Variables**, cadastre `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
3. Clique em **Deploy**.
   > As variáveis entram no momento do build. Se você cadastrar ou alterar alguma **depois** do deploy, vá em **Deployments → ⋯ → Redeploy**. Se faltar alguma, o site mostra a tela "Sistema não configurado" dizendo qual.
4. No Supabase, em **Authentication → URL Configuration**, coloque o endereço gerado pela Vercel em **Site URL**.

O arquivo [`vercel.json`](vercel.json) faz qualquer endereço (`/doacoes`, `/painel`…) abrir o app, para que recarregar a página não dê erro 404.

---

## Estrutura

```
src/
  dominio/      tipos da doação, máscaras e validações
  cep/          busca de endereço pelo CEP
  doacoes/      acesso ao banco, formulário de cadastro e lista
  painel/       contagem e tela do painel
  auth/         login, sessão e rotas protegidas
  layout/       cabeçalho e navegação
  lib/          cliente do Supabase
supabase/migrations/   SQL da tabela e da segurança (RLS)
scripts/               verificação da RLS
docs/superpowers/      design e plano de implementação
```
