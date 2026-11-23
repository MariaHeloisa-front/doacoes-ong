# Decisões do projeto — Controle de Doações (ONG Recife)

Este arquivo registra cada decisão técnica tomada, **por que** foi tomada e o que foi descartado.
É atualizado a cada etapa do desenvolvimento.

Documentos de apoio:
- Design: [docs/superpowers/specs/2026-11-23-doacoes-ong-design.md](docs/superpowers/specs/2026-11-23-doacoes-ong-design.md)
- Plano: [docs/superpowers/plans/2026-11-23-doacoes-ong.md](docs/superpowers/plans/2026-11-23-doacoes-ong.md)

---

## Etapa 1 — Base do projeto

### Arquitetura: SPA React falando direto com o Supabase
- **Decisão:** aplicação de página única (Vite + React + TypeScript) que usa o `supabase-js` direto do navegador. A segurança dos dados fica no próprio banco, com *Row Level Security* (RLS).
- **Por quê:** é o caminho com menos peças para o problema (poucos usuários, CRUD simples). Encaixa nas regras do desafio (React + TS + Supabase + Vercel) e vira um site estático na Vercel, fácil de manter.
- **Descartado:**
  - *Next.js com lógica no servidor:* acrescenta SSR e sessão em cookies sem ganho real aqui.
  - *API própria em funções da Vercel:* seria uma camada que só repassa dados que o Supabase já protege, com mais código e mais testes.
- **Risco e mitigação:** com o repositório público e a chave `anon` exposta no navegador (o que é normal), **toda** a proteção depende da RLS. Por isso existe uma verificação específica (etapa 4).

### Vite como base
- **Por quê:** é o padrão atual para SPA React, com build rápido e saída estática.
- **Descartado:** Create React App (descontinuado).

### Testes: Vitest + React Testing Library
- **Por quê:** o Vitest usa a mesma configuração do Vite. A Testing Library testa o comportamento do jeito que a pessoa usa a tela (rótulos, botões, textos), não detalhes internos.
- **Regra:** os testes automáticos rodam **offline**. A rede (`fetch`) e o Supabase são simulados, para que a suíte seja rápida, previsível e não precise de nenhuma chave.
- **Processo:** antes de cada commit rodam `npm test -- --run`, `npm run lint` (oxlint, que veio no template do Vite) e `npm run build` (inclui a checagem de tipos).

### Variáveis de ambiente
- Só a URL e a chave **anon** do Supabase vão para o front-end (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`). A chave `anon` é pública por natureza; quem protege os dados é a RLS.
- `.env.local` fica fora do git. O `.env.example` documenta o que precisa ser preenchido.
