-- =====================================================================
-- Controle de Doações — tabelas e regras de segurança
--
-- COMO APLICAR:
--   1. No painel do Supabase, abra "SQL Editor" → "New query".
--   2. Cole TODO este arquivo e clique em "Run".
--   3. Deve aparecer "Success. No rows returned".
-- Pode ser executado mais de uma vez sem duplicar nada.
--
-- DEPOIS, para cada pessoa da equipe (já criada em Authentication → Users):
--   insert into public.equipe (user_id)
--   select id from auth.users where email = 'pessoa@exemplo.org'
--   on conflict do nothing;
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1. Lista da equipe: só quem está aqui acessa as doações.
--    Ter uma conta no Supabase NÃO basta (protege mesmo se o cadastro
--    público de usuários ficar ligado por engano).
-- ---------------------------------------------------------------------
create table if not exists public.equipe (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  created_at  timestamptz not null default now()
);

comment on table public.equipe is 'Usuários liberados para usar o sistema de doações.';

alter table public.equipe enable row level security;

-- Cada pessoa só consegue ver o PRÓPRIO registro (o app usa isso para
-- avisar "acesso ainda não liberado"). Ninguém inclui/remove pelo app:
-- a lista é mantida pelo administrador no SQL Editor.
drop policy if exists "membro ve o proprio registro" on public.equipe;
create policy "membro ve o proprio registro"
  on public.equipe for select
  to authenticated
  using (user_id = auth.uid());

revoke all on public.equipe from anon;

-- Função usada pelas regras da tabela de doações.
-- "security definer" permite consultar a lista sem expor a lista inteira.
create or replace function public.eh_equipe()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.equipe where user_id = auth.uid());
$$;

revoke execute on function public.eh_equipe() from public, anon;
grant execute on function public.eh_equipe() to authenticated;


-- ---------------------------------------------------------------------
-- 2. Doações
-- ---------------------------------------------------------------------
create table if not exists public.doacoes (
  id               uuid primary key default gen_random_uuid(),
  created_at       timestamptz not null default now(),

  doador_nome      text not null check (length(trim(doador_nome)) > 0),
  doador_telefone  text not null check (doador_telefone ~ '^\d{10,11}$'),
  tipo             text not null check (tipo in ('Roupas', 'Alimentos', 'Moveis', 'Brinquedos', 'Outros')),
  descricao        text not null check (length(trim(descricao)) > 0),
  status           text not null default 'Recebida'
                     check (status in ('Recebida', 'Em triagem', 'Entregue')),

  cep              text not null check (cep ~ '^\d{8}$'),
  logradouro       text not null check (length(trim(logradouro)) > 0),
  numero           text not null check (length(trim(numero)) > 0),
  complemento      text,
  bairro           text not null check (length(trim(bairro)) > 0),
  cidade           text not null check (length(trim(cidade)) > 0),
  uf               text not null check (uf ~ '^[A-Z]{2}$'),

  criado_por       uuid default auth.uid() references auth.users (id) on delete set null
);

comment on table public.doacoes is 'Doações recebidas pela ONG (uso exclusivo da equipe).';

create index if not exists doacoes_created_at_idx on public.doacoes (created_at desc);
create index if not exists doacoes_tipo_status_idx on public.doacoes (tipo, status);


-- ---------------------------------------------------------------------
-- 3. Segurança (RLS) das doações: só membros da equipe leem, cadastram
--    e mudam status. Visitantes sem login e contas fora da equipe são
--    bloqueados. Não há política de DELETE → ninguém apaga pelo app.
-- ---------------------------------------------------------------------
alter table public.doacoes enable row level security;

drop policy if exists "equipe pode ler doacoes" on public.doacoes;
create policy "equipe pode ler doacoes"
  on public.doacoes for select
  to authenticated
  using (public.eh_equipe());

drop policy if exists "equipe pode cadastrar doacoes" on public.doacoes;
create policy "equipe pode cadastrar doacoes"
  on public.doacoes for insert
  to authenticated
  with check (public.eh_equipe());

drop policy if exists "equipe pode atualizar doacoes" on public.doacoes;
create policy "equipe pode atualizar doacoes"
  on public.doacoes for update
  to authenticated
  using (public.eh_equipe())
  with check (public.eh_equipe());

-- Garantia extra: o papel anônimo não recebe privilégio algum na tabela.
revoke all on public.doacoes from anon;
