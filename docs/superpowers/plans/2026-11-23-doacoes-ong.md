# Controle de Doações (ONG Recife) — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicação web, só para a equipe logada, que registra doações com endereço completo via CEP, lista/filtra/muda status e mostra um painel de totais.

**Architecture:** SPA Vite + React + TypeScript que conversa direto com o Supabase (Postgres + Auth). Segurança garantida por RLS no banco (só `authenticated`). Consulta de CEP no navegador (ViaCEP com reserva BrasilAPI). Deploy estático na Vercel.

**Tech Stack:** Vite, React 18+, TypeScript strict, React Router, @supabase/supabase-js v2, Vitest, React Testing Library, @testing-library/user-event, jsdom.

**Spec:** `docs/superpowers/specs/2026-11-23-doacoes-ong-design.md`

## Global Constraints

- Toda a interface e mensagens em português claro, sem jargão.
- Valores de tipo gravados: `Roupas`, `Alimentos`, `Moveis`, `Brinquedos`, `Outros` (rótulo na tela: "Móveis"). Status: `Recebida`, `Em triagem`, `Entregue`; padrão `Recebida`.
- Telefone gravado só com dígitos, 10 ou 11. CEP gravado só com dígitos, 8. UF 2 letras maiúsculas.
- Mensagens fixas de CEP:
  - formato: `CEP inválido. Digite os 8 números do CEP.`
  - não encontrado: `CEP não encontrado. Confira o número ou preencha o endereço manualmente.`
  - indisponível: `Não foi possível consultar o CEP agora. Tente novamente ou preencha o endereço manualmente.`
- Só a chave `anon` no front, via `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`. `.env.local` nunca vai pro git.
- Testes automáticos rodam offline (fetch e Supabase mockados).
- Antes de todo commit: `npm test -- --run`, `npm run lint` e `npm run build` passando.
- Commits em Conventional Commits, em português, terminando com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Cada task acrescenta suas decisões ao `DECISOES.md` (seção por etapa: decisão + porquê + alternativa descartada).

## Review Focus

1. **CEP colado com traço/espaço/ponto** (`"50.030-230 "`) → deve ser normalizado e buscado normalmente. Teste na Task 3.
2. **CEP alterado enquanto a busca anterior ainda responde** → a resposta antiga não pode sobrescrever o endereço do CEP novo. Teste na Task 6.
3. **Sessão expirada / erro do Supabase ao salvar ou mudar status** → mensagem amigável, nada de tela branca; status volta ao anterior. Testes nas Tasks 6 e 7.
4. **Clique duplo em "Salvar"** → só uma doação criada. Teste na Task 6.
5. **Campos só com espaços** (nome `"   "`) → tratados como vazios. Teste na Task 2.

---

## Estrutura de arquivos

```
src/
  main.tsx, App.tsx (rotas), estilos.css
  lib/supabase.ts                 cliente Supabase (lê env)
  dominio/doacao.ts               tipos, constantes, rótulos
  dominio/validacao.ts (+ .test)  apenasDigitos, máscaras, validarDoacao
  cep/buscarCep.ts (+ .test)
  doacoes/repositorio.ts (+ .test)
  doacoes/FormularioDoacao.tsx (+ .test)
  doacoes/ListaDoacoes.tsx (+ .test)
  painel/agregar.ts (+ .test), painel/Painel.tsx (+ .test)
  auth/AuthProvider.tsx, auth/RotaProtegida.tsx, auth/LoginPage.tsx (+ tests)
  layout/Layout.tsx               cabeçalho, navegação, "Sair"
supabase/migrations/20261123000000_criar_doacoes.sql
scripts/verificar-rls.mjs
DECISOES.md, README.md, .env.example, vercel.json
```

---

### Task 1: Base do projeto

**Files:** Create: projeto Vite (`react-ts`), `vitest` config em `vite.config.ts`, `src/setupTests.ts`, `.gitignore` (incluir `.env.local`), `.env.example`, `DECISOES.md`, `src/App.test.tsx`

**Interfaces:** Produces: scripts `npm test`, `npm run lint`, `npm run build`.

- [ ] **Step 1:** `npm create vite@latest . -- --template react-ts`; instalar `react-router-dom @supabase/supabase-js` e dev `vitest jsdom @testing-library/react @testing-library/jest-dom @testing-library/user-event`. Configurar `test: { environment: 'jsdom', setupFiles: './src/setupTests.ts', globals: true }`. Script `"test": "vitest"`.
- [ ] **Step 2:** Teste fumaça `src/App.test.tsx`: renderiza `<App />` e espera texto `Doações` no documento. Rodar `npm test -- --run` → FAIL.
- [ ] **Step 3:** Trocar o App do template por cabeçalho mínimo "Doações — ONG". Limpar assets do template.
- [ ] **Step 4:** `npm test -- --run && npm run lint && npm run build` → tudo PASS.
- [ ] **Step 5:** `DECISOES.md` com: arquitetura A (e por que não B/C), Vite, Vitest, testes offline. `.env.example` com as duas variáveis vazias.
- [ ] **Step 6:** `git init -b main`; commit `chore: estrutura inicial com Vite, React, TS e Vitest` (inclui `docs/`).

### Task 2: Domínio, máscaras e validação

**Files:** Create: `src/dominio/doacao.ts`, `src/dominio/validacao.ts`, `src/dominio/validacao.test.ts`

**Interfaces — Produces:**
```ts
// doacao.ts
export const TIPOS = ['Roupas','Alimentos','Moveis','Brinquedos','Outros'] as const
export type TipoDoacao = typeof TIPOS[number]
export const ROTULO_TIPO: Record<TipoDoacao, string>   // Moveis → 'Móveis'
export const STATUS = ['Recebida','Em triagem','Entregue'] as const
export type StatusDoacao = typeof STATUS[number]
export interface NovaDoacao { doador_nome: string; doador_telefone: string; tipo: TipoDoacao; descricao: string;
  cep: string; logradouro: string; numero: string; complemento: string | null; bairro: string; cidade: string; uf: string }
export interface Doacao extends NovaDoacao { id: string; created_at: string; status: StatusDoacao }
// validacao.ts
export function apenasDigitos(s: string): string
export function mascararTelefone(s: string): string   // '81999998888' → '(81) 99999-8888'; 10 díg → '(81) 3333-4444'
export function mascararCep(s: string): string        // '50030230' → '50030-230'; parcial ok
export type FormDoacao = { [K in keyof NovaDoacao]: string }   // valores crus do formulário
export type ErrosDoacao = Partial<Record<keyof NovaDoacao, string>>
export function validarDoacao(f: FormDoacao): { ok: true; dados: NovaDoacao } | { ok: false; erros: ErrosDoacao }
```

- [ ] **Step 1: Testes** em `validacao.test.ts`:
  - `apenasDigitos('(81) 9.9-9')` → `'8199'`
  - `mascararTelefone('81999998888')` → `'(81) 99999-8888'`; `mascararTelefone('8133334444')` → `'(81) 3333-4444'`; `mascararTelefone('819')` → `'(81) 9'`
  - `mascararCep('50030230')` → `'50030-230'`; `mascararCep('500')` → `'500'`
  - `validarDoacao` com formulário completo → `ok: true`, `dados.doador_telefone === '81999998888'`, `dados.cep === '50030230'`, `dados.uf === 'PE'` (entrada `'pe'`), `dados.complemento === null` (entrada `''`), strings aparadas
  - nome `'   '` → `erros.doador_nome === 'Informe o nome do doador.'`
  - telefone com 9 dígitos → `erros.doador_telefone === 'Telefone deve ter DDD + número (10 ou 11 dígitos).'`
  - tipo `'Livros'` → `erros.tipo === 'Escolha o tipo da doação.'`
  - descrição vazia → `'Descreva a doação.'`; CEP 7 dígitos → `'CEP inválido. Digite os 8 números do CEP.'`
  - logradouro/bairro/cidade/numero vazios → `'Campo obrigatório.'`; uf `'P'` → `'UF deve ter 2 letras.'`
- [ ] **Step 2:** `npm test -- --run src/dominio` → FAIL.
- [ ] **Step 3:** Implementar `doacao.ts` e `validacao.ts`.
- [ ] **Step 4:** `npm test -- --run src/dominio` → PASS; lint + build.
- [ ] **Step 5:** `DECISOES.md`: tipos como lista fixa única (sem enum), número como texto, validação duplicada no banco. Commit `feat: modelo de doação, máscaras e validações`.

### Task 3: Busca de CEP

**Files:** Create: `src/cep/buscarCep.ts`, `src/cep/buscarCep.test.ts`

**Interfaces — Produces:**
```ts
export interface EnderecoCep { logradouro: string; bairro: string; cidade: string; uf: string }
export type ErroCep = 'formato' | 'nao_encontrado' | 'indisponivel'
export type ResultadoCep = { ok: true; endereco: EnderecoCep } | { ok: false; erro: ErroCep; mensagem: string }
export async function buscarCep(cep: string, fetchFn: typeof fetch = fetch): Promise<ResultadoCep>
```
ViaCEP: `https://viacep.com.br/ws/{cep}/json/` → campos `logradouro, bairro, localidade, uf`; `{erro: true}` (ou `"true"`) = não encontrado. BrasilAPI: `https://brasilapi.com.br/api/cep/v1/{cep}` → `street, neighborhood, city, state`; 404 = não encontrado. Timeout 5 s por chamada (`AbortSignal.timeout(5000)`). Mensagens: as três das Global Constraints.

- [ ] **Step 1: Testes** (fetch falso via `vi.fn`):
  - `'123'` → `{ok:false, erro:'formato'}` e fetch **não** chamado
  - `' 50.030-230 '` → fetch chamado com URL ViaCEP de `50030230`; retorno ViaCEP `{logradouro:'Rua da Aurora', bairro:'Boa Vista', localidade:'Recife', uf:'PE'}` → `endereco` `{logradouro:'Rua da Aurora', bairro:'Boa Vista', cidade:'Recife', uf:'PE'}`
  - ViaCEP `{erro:true}` → `erro:'nao_encontrado'`, BrasilAPI não chamada
  - ViaCEP rejeita (rede) e BrasilAPI 200 → sucesso mapeado da BrasilAPI
  - ViaCEP 500 e BrasilAPI 404 → `nao_encontrado`
  - ambas rejeitam → `erro:'indisponivel'` com a mensagem fixa
  - `'00000000'` com ViaCEP `{erro:'true'}` → `nao_encontrado`
- [ ] **Step 2:** `npm test -- --run src/cep` → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** PASS; lint + build.
- [ ] **Step 5:** `DECISOES.md`: ViaCEP + BrasilAPI de reserva, validação antes da rede, timeout. Commit `feat: busca de endereço por CEP com ViaCEP e reserva BrasilAPI`.

### Task 4: Banco (migração, RLS) e repositório

**Files:** Create: `supabase/migrations/20261123000000_criar_doacoes.sql`, `src/lib/supabase.ts`, `src/doacoes/repositorio.ts`, `src/doacoes/repositorio.test.ts`, `scripts/verificar-rls.mjs`

**Interfaces — Produces:**
```ts
// lib/supabase.ts
export const supabase: SupabaseClient
// repositorio.ts
export interface FiltrosDoacao { tipo?: TipoDoacao; status?: StatusDoacao }
export class ErroRepositorio extends Error {}            // message já em português amigável
export async function criarDoacao(nova: NovaDoacao): Promise<Doacao>
export async function listarDoacoes(f: FiltrosDoacao): Promise<Doacao[]>   // order created_at desc
export async function atualizarStatus(id: string, status: StatusDoacao): Promise<void>
export async function listarResumo(): Promise<Array<Pick<Doacao, 'tipo' | 'status'>>>
```

- [ ] **Step 1: SQL** — tabela `public.doacoes` exatamente como §5.2 do spec (checks: `length(trim(x)) > 0` nos textos obrigatórios, `doador_telefone ~ '^\d{10,11}$'`, `cep ~ '^\d{8}$'`, `uf ~ '^[A-Z]{2}$'`, `tipo in (...)`, `status in (...)`; `criado_por uuid default auth.uid() references auth.users`). `alter table ... enable row level security`; políticas `select`/`insert`/`update` `to authenticated using (true)` / `with check (true)`. Índice em `created_at desc`. Comentário no topo com instruções de aplicação.
- [ ] **Step 2: Testes** do repositório com `vi.mock('../lib/supabase')` devolvendo um builder encadeável falso:
  - `listarDoacoes({tipo:'Roupas'})` chama `.from('doacoes').select('*')`, `.eq('tipo','Roupas')`, **não** chama `.eq('status', …)`, `.order('created_at',{ascending:false})`
  - `listarDoacoes({})` não chama `.eq`
  - `criarDoacao` envia o objeto sem `status` e devolve a linha retornada (`.select().single()`)
  - `atualizarStatus('id1','Entregue')` → `.update({status:'Entregue'}).eq('id','id1')`
  - erro do Supabase → lança `ErroRepositorio` com mensagem `'Não foi possível salvar. Verifique sua conexão e tente novamente.'` (gravação) ou `'Não foi possível carregar as doações.'` (leitura)
- [ ] **Step 3:** FAIL → implementar `lib/supabase.ts` (lança erro claro se env ausente, exceto em testes) e `repositorio.ts` → PASS; lint + build.
- [ ] **Step 4:** `scripts/verificar-rls.mjs` + script `"verificar:rls": "node --env-file=.env.local scripts/verificar-rls.mjs"`: sem login, tenta `select` (espera 0 linhas) e `insert` (espera erro) e imprime `OK: acesso anônimo bloqueado` ou `FALHA: ...` com exit code 1.
- [ ] **Step 5:** `DECISOES.md`: RLS, sem delete, `criado_por`, migração aplicada manualmente. Commit `feat: migração do banco com RLS e repositório de doações`.
- [ ] **Step 6: Hand-off à cliente** — enviar o SQL e o passo a passo: (1) SQL Editor → colar e rodar; (2) Authentication → desligar "Allow new users to sign up"; (3) Authentication → Users → Add user (e-mail + senha, "Auto Confirm"); (4) passar URL e chave `anon` para criar `.env.local`. Depois: rodar `npm run verificar:rls` e registrar resultado no `DECISOES.md` (commit `docs: registra verificação de RLS`). Não bloqueia as Tasks 5–8.

### Task 5: Login e rotas protegidas

**Files:** Create: `src/auth/AuthProvider.tsx`, `src/auth/RotaProtegida.tsx`, `src/auth/LoginPage.tsx`, `src/layout/Layout.tsx`, testes `src/auth/*.test.tsx`; Modify: `src/App.tsx`, `src/App.test.tsx`

**Interfaces — Produces:**
```ts
export function AuthProvider({ children }): JSX.Element   // supabase.auth.getSession + onAuthStateChange
export function useAuth(): { sessao: Session | null; carregando: boolean; entrar(email: string, senha: string): Promise<string | null>; sair(): Promise<void> }
// entrar devolve null em sucesso ou mensagem de erro em português
export function RotaProtegida({ children }): JSX.Element  // carregando → "Carregando…"; sem sessão → <Navigate to="/login" replace />
```
Rotas em `App.tsx`: `/login`; protegidas dentro de `Layout`: `/doacoes` (lista), `/doacoes/nova` (formulário), `/painel`; `/` e desconhecidas → `/doacoes`. Layout: links "Doações", "Nova doação", "Painel" e botão "Sair".

- [ ] **Step 1: Testes** (mock de `supabase.auth`):
  - sem sessão, acessar `/doacoes` → mostra tela de login (campo "E-mail")
  - login com credencial errada (`error` com status 400) → `'E-mail ou senha incorretos.'`
  - login OK → navega para `/doacoes`
  - com sessão, botão "Sair" chama `signOut` e volta ao login
  - botão "Entrar" desabilitado enquanto envia
- [ ] **Step 2:** FAIL → implementar → PASS; lint + build.
- [ ] **Step 3:** `DECISOES.md`: Supabase Auth e-mail/senha, sem cadastro público, sem "esqueci senha". Commit `feat: login da equipe e rotas protegidas`.

### Task 6: Formulário de cadastro

**Files:** Create: `src/doacoes/FormularioDoacao.tsx`, `src/doacoes/FormularioDoacao.test.tsx`; Modify: `src/App.tsx` (rota `/doacoes/nova`)

**Interfaces — Consumes:** `validarDoacao`, `mascararTelefone`, `mascararCep`, `apenasDigitos` (Task 2); `buscarCep` (Task 3); `criarDoacao`, `ErroRepositorio` (Task 4).

Comportamento: campos com `<label>` (nome, telefone, tipo, descrição, CEP, rua, número, complemento, bairro, cidade, UF). Ao CEP atingir 8 dígitos (e no blur): mostra "Buscando endereço…", chama `buscarCep`, preenche rua/bairro/cidade/UF (continuam editáveis), foca "Número"; em erro mostra `resultado.mensagem` abaixo do CEP (`role="alert"`). Ignorar resposta se o CEP mudou desde a chamada (comparar com valor atual via ref). Submit: `validarDoacao` → erros por campo; senão `criarDoacao`; botão "Salvar doação" desabilitado e texto "Salvando…" durante envio; sucesso → `'Doação registrada com sucesso.'` e formulário limpo; erro → mensagem do `ErroRepositorio`.

- [ ] **Step 1: Testes** (mock de `buscarCep` e `criarDoacao`):
  - digitar CEP `50030230` → campos Rua `Rua da Aurora`, Bairro `Boa Vista`, Cidade `Recife`, UF `PE`
  - `buscarCep` devolve `nao_encontrado` → texto `CEP não encontrado. Confira o número ou preencha o endereço manualmente.` visível
  - CEP `5003023` + blur → `CEP inválido. Digite os 8 números do CEP.`
  - **corrida:** primeira busca resolve depois da segunda (CEP trocado) → campos ficam com o endereço do segundo CEP
  - enviar vazio → mensagens de erro dos campos e `criarDoacao` não chamado
  - envio completo → `criarDoacao` chamado 1x com `doador_telefone:'81999998888'`, `cep:'50030230'`; mensagem de sucesso; campos limpos
  - **duplo clique** em "Salvar doação" → `criarDoacao` chamado 1x
  - `criarDoacao` rejeita com `ErroRepositorio` → mensagem exibida, dados mantidos no formulário
- [ ] **Step 2:** FAIL → implementar → PASS; lint + build.
- [ ] **Step 3:** `DECISOES.md`: campos editáveis após CEP, busca ao completar 8 dígitos, proteção de corrida e duplo envio. Commit `feat: formulário de cadastro de doação com endereço por CEP`.

### Task 7: Lista com filtros e mudança de status

**Files:** Create: `src/doacoes/ListaDoacoes.tsx`, `src/doacoes/ListaDoacoes.test.tsx`; Modify: `src/App.tsx`

**Interfaces — Consumes:** `listarDoacoes`, `atualizarStatus`, `ErroRepositorio` (Task 4); `TIPOS`, `STATUS`, `ROTULO_TIPO` (Task 2); `mascararTelefone`, `mascararCep`.

Comportamento: filtros "Tipo" e "Status" (selects com "Todos") sincronizados com `?tipo=&status=` via `useSearchParams` (valores inválidos na URL são ignorados). Cada item: data (`toLocaleDateString('pt-BR')`), doador, telefone mascarado, rótulo do tipo, descrição, endereço `Rua, número – complemento – bairro, cidade/UF – CEP`, select de status. Troca de status otimista; em erro, volta ao valor anterior e mostra `'Não foi possível alterar o status. Tente novamente.'`. Estados: "Carregando…", vazio `'Nenhuma doação encontrada com esses filtros.'`, erro de carga.

- [ ] **Step 1: Testes:**
  - carrega e exibe 2 doações (mock) com `Móveis` como rótulo
  - escolher Tipo "Roupas" → `listarDoacoes` chamado com `{tipo:'Roupas'}` e URL contém `tipo=Roupas`
  - iniciar em `/doacoes?status=Entregue` → primeira chamada com `{status:'Entregue'}`
  - URL `?tipo=Livros` → chamada com `{}`
  - lista vazia → mensagem de vazio
  - mudar status para "Em triagem" → `atualizarStatus('id1','Em triagem')`; select mostra o novo valor
  - `atualizarStatus` rejeita → select volta a "Recebida" e mensagem de erro aparece
- [ ] **Step 2:** FAIL → implementar → PASS; lint + build.
- [ ] **Step 3:** `DECISOES.md`: filtros no servidor + URL, atualização otimista, status livre em qualquer direção. Commit `feat: lista de doações com filtros e troca de status`.

### Task 8: Painel

**Files:** Create: `src/painel/agregar.ts`, `src/painel/agregar.test.ts`, `src/painel/Painel.tsx`, `src/painel/Painel.test.tsx`; Modify: `src/App.tsx`

**Interfaces — Produces:**
```ts
export interface Resumo { total: number; porTipo: Record<TipoDoacao, number>; porStatus: Record<StatusDoacao, number> }
export function agregar(linhas: Array<Pick<Doacao, 'tipo' | 'status'>>): Resumo   // todas as chaves presentes, zeradas se não houver
```
**Consumes:** `listarResumo` (Task 4).

Painel: total geral; dois blocos ("Por tipo", "Por status") com rótulo, número e barra CSS de largura proporcional ao maior valor do bloco (`aria-hidden` na barra).

- [ ] **Step 1: Testes:** `agregar([])` → total 0 e todas as chaves 0; `agregar` com 3 linhas (2 Roupas/Recebida, 1 Moveis/Entregue) → `porTipo.Roupas===2`, `porTipo.Moveis===1`, `porStatus['Em triagem']===0`, `total===3`. Componente: mostra `Móveis` e `2` para Roupas; erro de carga → mensagem.
- [ ] **Step 2:** FAIL → implementar → PASS; lint + build.
- [ ] **Step 3:** `DECISOES.md`: agregação no cliente, barras em CSS. Commit `feat: painel com totais por tipo e status`.

### Task 9: Acabamento, GitHub e Vercel

**Files:** Create: `vercel.json`, `README.md`; Modify: `src/estilos.css`, `DECISOES.md`

- [ ] **Step 1:** `vercel.json` com `{"rewrites":[{"source":"/(.*)","destination":"/index.html"}]}`. Estilo limpo e responsivo (formulário em uma coluna no celular; lista em cartões em telas < 640px).
- [ ] **Step 2:** `README.md`: o que é, requisitos atendidos, como rodar (`npm i`, `.env.local`, `npm run dev`), testes, aplicar migração, criar usuário, redefinir senha pelo painel, deploy na Vercel (importar repo, preencher as 2 variáveis), `npm run verificar:rls`.
- [ ] **Step 3:** Verificação completa: `npm test -- --run && npm run lint && npm run build` → PASS. Se `.env.local` existir: `npm run dev` e testar manualmente login → cadastro com CEP real (ex.: `50030230`) → lista/filtro/status → painel.
- [ ] **Step 4:** `git status` confere que `.env.local` não está rastreado. Commit `docs: README e configuração de deploy`.
- [ ] **Step 5:** `gh repo create doacoes-ong --public --source . --push`.
- [ ] **Step 6: Hand-off à cliente:** importar o repositório na Vercel, preencher `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`, e no Supabase (Authentication → URL Configuration) definir o Site URL com o domínio da Vercel. Depois, conferir a URL publicada e registrar no README/`DECISOES.md` (commit `docs: adiciona URL publicada`).
