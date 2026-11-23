-- =====================================================================
-- Controle de Doações — criação da tabela e das regras de segurança
--
-- COMO APLICAR:
--   1. No painel do Supabase, abra "SQL Editor" → "New query".
--   2. Cole TODO este arquivo e clique em "Run".
--   3. Deve aparecer "Success. No rows returned".
-- Pode ser executado mais de uma vez sem duplicar nada.
-- =====================================================================

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

comment on table public.doacoes is 'Doações recebidas pela ONG (uso exclusivo da equipe logada).';

create index if not exists doacoes_created_at_idx on public.doacoes (created_at desc);
create index if not exists doacoes_tipo_status_idx on public.doacoes (tipo, status);

-- ---------------------------------------------------------------------
-- Segurança (RLS): só usuários logados leem, cadastram e mudam status.
-- Visitantes sem login (papel "anon") não têm NENHUMA política → bloqueados.
-- Não há política de DELETE → ninguém apaga pelo app.
-- ---------------------------------------------------------------------
alter table public.doacoes enable row level security;

drop policy if exists "equipe pode ler doacoes" on public.doacoes;
create policy "equipe pode ler doacoes"
  on public.doacoes for select
  to authenticated
  using (true);

drop policy if exists "equipe pode cadastrar doacoes" on public.doacoes;
create policy "equipe pode cadastrar doacoes"
  on public.doacoes for insert
  to authenticated
  with check (true);

drop policy if exists "equipe pode atualizar doacoes" on public.doacoes;
create policy "equipe pode atualizar doacoes"
  on public.doacoes for update
  to authenticated
  using (true)
  with check (true);

-- Garantia extra: o papel anônimo não recebe privilégio algum na tabela.
revoke all on public.doacoes from anon;
