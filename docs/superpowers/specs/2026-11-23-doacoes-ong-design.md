# Design — Sistema de Controle de Doações (ONG Recife)

Data: 2026-11-23

## 1. Intenção e o porquê

Hoje a ONG anota as doações (roupas, alimentos, móveis, brinquedos) num caderno. Consequências:

- ninguém sabe o que já chegou, o que está em triagem e o que já foi entregue;
- o endereço de retirada chega sempre incompleto.

O sistema substitui o caderno por uma aplicação web usada **somente pela equipe da ONG**, que registra cada doação com endereço completo (preenchido a partir do CEP) e acompanha o status de cada uma.

## 2. Objetivos

| # | Requisito | Prioridade |
|---|-----------|-----------|
| R1 | Registrar doação: nome do doador, telefone, tipo (Roupas, Alimentos, Móveis, Brinquedos, Outros) e descrição | Obrigatório |
| R2 | Endereço de retirada a partir do CEP: rua, bairro e cidade preenchidos automaticamente via API pública; número e complemento digitados | Obrigatório |
| R3 | Listar doações com filtro por tipo e por status (Recebida, Em triagem, Entregue), podendo mudar o status | Obrigatório |
| R4 | Mensagem clara quando o CEP for inválido ou não encontrado | Obrigatório |
| R5 | Login para a equipe da ONG | Desejável (será feito) |
| R6 | Painel com quantidade de doações por tipo e por status | Extra (será feito) |

### Não-objetivos
- Formulário público para doadores (decisão do cliente: só a equipe cadastra).
- Cadastro de usuários pelo site (contas criadas pelo administrador no painel do Supabase).
- Papéis/permissões diferentes entre membros da equipe (todos logados têm o mesmo acesso).
- Edição completa ou exclusão de doações (fora do escopo dos requisitos; ver §8).
- Agendamento de retiradas, notificações, app mobile nativo.

### Anti-objetivos (seria falha mesmo "funcionando")
- Dados de doadores (nome, telefone, endereço) acessíveis sem login — o repositório é público, então toda a proteção precisa estar no banco (RLS), nunca só na interface.
- Chaves secretas do Supabase (`service_role`) no código ou no repositório.
- Endereço salvo incompleto: rua/bairro/cidade/UF e número são obrigatórios.
- Interface confusa para equipe não técnica: mensagens em português claro, sem jargão.

## 3. Restrições
- React + TypeScript.
- Supabase (banco Postgres + Auth). Projeto já criado pelo cliente.
- Repositório público no GitHub.
- Publicado na Vercel.
- Processo: testes a cada passo; commits pequenos e frequentes, só com testes passando.
- Um arquivo `DECISOES.md` na raiz explicando cada decisão, mantido ao longo do trabalho.

## 4. Abordagens consideradas

| Abordagem | Prós | Contras |
|-----------|------|---------|
| **A) SPA React (Vite) falando direto com o Supabase, segurança via RLS** — **escolhida** | Menos peças; encaixa nas regras; deploy estático na Vercel; fácil manutenção | A segurança depende de RLS bem configurada (mitigado com teste explícito) |
| B) Next.js com lógica no servidor | Integração nativa com Vercel; mais coisa fica fora do navegador | Complexidade (SSR, sessão em cookies) sem ganho real para poucos usuários |
| C) SPA + API própria em funções da Vercel | Controle total do back-end | Camada redundante: só repassa dados que o Supabase já protege; mais código e testes |

Cliente escolheu **A**.

## 5. Decisões do "como"

### 5.1 Stack
- **Vite + React + TypeScript** (modo strict).
- **React Router** para rotas (`/login`, `/doacoes`, `/doacoes/nova`, `/painel`).
- **@supabase/supabase-js** para banco e autenticação.
- **Vitest + React Testing Library + MSW** (ou mock de `fetch`) para testes unitários e de componente.
- **Playwright** opcional para um teste ponta a ponta do fluxo principal, se o tempo permitir.
- Estilo: CSS simples (CSS Modules ou um arquivo global), sem framework visual pesado. Layout responsivo (a equipe pode usar celular).

### 5.2 Modelo de dados (Supabase / Postgres)

Tabela `doacoes`:

| Coluna | Tipo | Regra |
|--------|------|-------|
| `id` | uuid | PK, `gen_random_uuid()` |
| `created_at` | timestamptz | default `now()` |
| `doador_nome` | text | not null, não vazio |
| `doador_telefone` | text | not null; só dígitos, 10 ou 11 (DDD + número) |
| `tipo` | text | not null; check em ('Roupas','Alimentos','Moveis','Brinquedos','Outros') — exibido com acento na interface |
| `descricao` | text | not null, não vazio |
| `status` | text | not null, default 'Recebida'; check em ('Recebida','Em triagem','Entregue') |
| `cep` | text | not null; 8 dígitos |
| `logradouro` | text | not null |
| `bairro` | text | not null |
| `cidade` | text | not null |
| `uf` | text | not null; 2 letras |
| `numero` | text | not null (texto para aceitar "s/n", "120A") |
| `complemento` | text | nullable |
| `criado_por` | uuid | default `auth.uid()`, referência a `auth.users` |

Tipos como `text` + `check` (e não enum do Postgres) para facilitar evolução; os mesmos valores ficam numa constante TypeScript única.

As restrições no banco duplicam as do formulário de propósito: o formulário dá feedback amigável, o banco garante integridade.

A migração SQL fica versionada em `supabase/migrations/` e é aplicada pelo SQL Editor do painel (não há Supabase CLI instalado).

### 5.3 Segurança (RLS)
- RLS **ativada** em `doacoes`.
- Políticas: `select`, `insert` e `update` permitidos somente para `authenticated`. Nenhuma política para `anon`. Sem `delete`.
- Cadastro público de usuários **desativado** no painel do Supabase (Authentication → Sign In / Providers → desligar "Allow new users to sign up"); contas criadas manualmente pelo administrador.
- Somente a chave `anon` (pública por natureza) vai para o front-end, via variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (em `.env.local`, fora do git; configuradas também na Vercel). `.env.example` documenta as variáveis.
- Verificação (decisão do implementador): script `npm run verificar:rls` que, usando só a URL e a chave `anon` do `.env.local`, tenta ler e inserir **sem login** e confirma que é bloqueado. Roda manualmente contra o projeto real após aplicar a migração; o resultado fica registrado no `DECISOES.md`. **Não** faz parte da suíte automática nem de CI — a suíte de commits roda offline, com Supabase mockado, e não precisa de segredos.

### 5.4 Consulta de CEP (R2, R4)
- Módulo isolado `buscarCep(cep)` que:
  1. normaliza (remove não-dígitos);
  2. valida formato (8 dígitos) → erro "CEP inválido. Digite os 8 números do CEP." **sem** chamar a API;
  3. consulta **ViaCEP** (`https://viacep.com.br/ws/{cep}/json/`); resposta `{ "erro": true }` → "CEP não encontrado. Confira o número ou preencha o endereço manualmente.";
  4. se o ViaCEP falhar (rede/timeout/5xx), tenta **BrasilAPI** (`https://brasilapi.com.br/api/cep/v1/{cep}`) como reserva;
  5. se ambos falharem por indisponibilidade → "Não foi possível consultar o CEP agora. Tente novamente ou preencha o endereço manualmente."
- Retorna um resultado tipado (sucesso com `{logradouro, bairro, cidade, uf}` ou erro com tipo + mensagem).
- No formulário: busca dispara ao completar 8 dígitos (e no blur); mostra "Buscando…"; preenche rua/bairro/cidade/UF; foca no campo número.
- Campos de rua/bairro/cidade/UF ficam **editáveis** após a busca (CEPs gerais de cidade pequena vêm sem rua/bairro; também cobre falha da API). Se a API devolver rua vazia, a pessoa preenche manualmente.

### 5.5 Formulário de cadastro (R1)
- Campos: nome, telefone (máscara `(81) 99999-9999`), tipo (select), descrição (textarea), CEP (máscara `00000-000`), rua, número, complemento, bairro, cidade, UF.
- Validação no cliente com mensagens em português ao lado de cada campo; botão desabilitado durante envio; mensagem de sucesso e formulário limpo após salvar; mensagem de erro clara se o Supabase falhar.
- Status inicial sempre "Recebida".

### 5.6 Lista (R3)
- Tabela/cartões com: data, doador, telefone, tipo, descrição, endereço resumido, status.
- Filtros por tipo e por status (selects, "Todos" como padrão), aplicados na consulta ao Supabase. Filtros refletidos na URL (query string) para poder recarregar/compartilhar.
- Ordenação: mais recentes primeiro.
- Mudança de status por select na própria linha; atualização otimista com reversão e aviso em caso de erro. Qualquer direção permitida.
- Estado vazio ("Nenhuma doação encontrada com esses filtros") e estado de carregamento.

### 5.7 Login (R5)
- Supabase Auth com e-mail e senha.
- Tela `/login`; demais rotas protegidas — sem sessão redireciona para `/login`.
- Botão "Sair" no cabeçalho.
- Mensagem clara para credenciais incorretas.
- Sem fluxo "esqueci minha senha" nesta versão (decisão do implementador): exigiria configurar SMTP e URLs de redirecionamento no Supabase. O administrador redefine senhas pelo painel do Supabase; procedimento descrito no README.

### 5.8 Painel (R6)
- Rota `/painel`: totais por tipo e por status (contagem geral), em cartões numéricos e/ou barras simples feitas em CSS (sem biblioteca de gráficos).
- Contagem feita a partir de uma consulta leve (`select tipo, status`) agregada no cliente — volume de uma ONG é pequeno; documentado como decisão.

### 5.9 Testes
- Unitários: `buscarCep` (válido, formato inválido, não encontrado, falha do ViaCEP com reserva BrasilAPI, ambos fora), máscaras/validações, agregação do painel.
- Componente: formulário (preenchimento via CEP, mensagens de erro, envio), lista (filtros, troca de status), rota protegida.
- Supabase mockado nos testes de componente; verificação manual/script do RLS contra o projeto real.
- Build (`tsc` + `vite build`) e lint rodando antes de cada commit.

### 5.10 Processo e entregáveis
- Commits pequenos (Conventional Commits em português), cada um com testes passando.
- `DECISOES.md` atualizado a cada etapa.
- `README.md` com: o que é, como rodar, variáveis de ambiente, como aplicar a migração, como criar usuários.
- Repositório público no GitHub via `gh`; deploy na Vercel (SPA com rewrite de rotas para `index.html` em `vercel.json`).

## 6. Dependências do cliente
- URL do projeto Supabase e chave `anon`.
- Aplicar no SQL Editor a migração SQL que entregamos pronta (arquivo em `supabase/migrations/` + instruções passo a passo) e desativar o cadastro público. O implementador não acessa o painel diretamente: tudo que depende do projeto real (migração, RLS, login real) é entregue como passo de hand-off, e o desenvolvimento segue em paralelo com Supabase mockado.
- Criar ao menos um usuário da equipe para testes.
- Repositório público criado na conta GitHub da cliente (MariaHeloisa-front) via `gh`.
- Deploy: a cliente conecta o repositório pelo site da Vercel e cadastra as variáveis `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY` (instruções no README). Sem Vercel CLI.

## 7. Deixado a critério de quem implementa
- Estrutura exata de pastas e nomes de componentes.
- Visual (cores, tipografia), desde que limpo, legível e responsivo.
- Biblioteca de máscara (ou implementação própria simples).
- Paginação da lista: não obrigatória no início; adicionar se necessário.

## 8. Fora do escopo agora, candidatos futuros
- Editar/excluir doação; histórico de mudanças de status; busca por nome do doador; exportar CSV.
