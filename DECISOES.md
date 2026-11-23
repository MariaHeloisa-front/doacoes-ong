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

---

## Etapa 2 — Modelo da doação, máscaras e validações

### Tipos e status como lista fixa única
- **Decisão:** os valores aceitos ficam em uma constante TypeScript (`TIPOS`, `STATUS` em `src/dominio/doacao.ts`), e o banco tem um `check` com os mesmos valores.
- **Por quê:** uma única fonte para a interface. Incluir um tipo novo é trocar uma linha aqui e uma no banco, sem migração de `enum` do Postgres (que é chata de alterar).
- **Detalhe:** o valor gravado é `Moveis` (sem acento, para evitar problemas de codificação em filtros e URLs). Na tela aparece "Móveis" (`ROTULO_TIPO`).

### Telefone e CEP gravados só com dígitos
- **Decisão:** a máscara (`(81) 99999-8888`, `50030-230`) existe só na tela. No banco ficam apenas os números.
- **Por quê:** facilita busca, validação e exibição em qualquer formato. Aceita fixo (10 dígitos) e celular (11).

### Número do endereço como texto
- **Por quê:** endereços reais têm "s/n", "120A", "Lote 3".

### Validação no formulário e no banco
- **Decisão:** `validarDoacao` dá mensagens amigáveis por campo, e o banco repete as regras com `check`.
- **Por quê:** o formulário orienta quem digita. O banco garante a integridade mesmo se alguém contornar a tela.
- Espaços nas pontas são removidos. Um campo só com espaços conta como vazio. Complemento vazio vira `null`. UF é convertida para maiúsculas.

---

## Etapa 3 — Busca de endereço pelo CEP

### ViaCEP como principal, BrasilAPI como reserva
- **Decisão:** `buscarCep` (em `src/cep/buscarCep.ts`) consulta primeiro o ViaCEP. Se ele estiver fora do ar (erro de rede, tempo esgotado ou status 5xx), tenta a BrasilAPI.
- **Por quê:** as duas são públicas, gratuitas e sem chave. O ViaCEP é a referência mais usada no Brasil, e a reserva evita que o cadastro trave quando um serviço cai.
- **Importante:** se o ViaCEP responder que o CEP **não existe**, a BrasilAPI não é consultada. "Não existe" é uma resposta, não uma falha.

### Validar antes de ir à internet
- O CEP é normalizado (pontos, traços e espaços são removidos, o que cobre o CEP colado de uma mensagem). Se não sobrarem 8 dígitos, a mensagem é "CEP inválido. Digite os 8 números do CEP.", sem nenhuma chamada de rede.

### Três mensagens, uma para cada situação
| Situação | Mensagem |
|---|---|
| Formato errado | CEP inválido. Digite os 8 números do CEP. |
| CEP não existe | CEP não encontrado. Confira o número ou preencha o endereço manualmente. |
| Serviços fora do ar | Não foi possível consultar o CEP agora. Tente novamente ou preencha o endereço manualmente. |

- **Por quê:** a pessoa precisa saber se o erro é dela (digitação) ou do serviço, e o que fazer em seguida.

### Tempo limite de 5 segundos por serviço
- Evita a tela "Buscando…" parada para sempre em conexão ruim.

### Observações das APIs reais (conferidas em 23/11/2026)
- O ViaCEP responde `{"erro": "true"}` (texto, não booleano) para CEP inexistente. As duas formas são tratadas.
- CEPs gerais de cidade pequena vêm sem rua e sem bairro. Esses campos chegam vazios e a pessoa completa.
- Por isso rua, bairro, cidade e UF continuam editáveis depois da busca.

---

## Etapa 4 — Banco de dados, segurança e acesso aos dados

### Tabela única `doacoes`
- O SQL fica em `supabase/migrations/20261123000000_criar_doacoes.sql` e é aplicado manualmente no SQL Editor (não há Supabase CLI no projeto). Ele pode ser executado de novo sem efeito colateral (`if not exists`, `drop policy if exists`).
- As regras do formulário se repetem no banco com `check`: telefone com 10 ou 11 dígitos, CEP com 8, UF com 2 letras maiúsculas, campos obrigatórios não vazios, tipo e status dentro da lista.
- `criado_por` guarda automaticamente (`auth.uid()`) qual usuário da equipe registrou a doação. Isso permite auditoria futura sem custo agora.
- Índices em `created_at` (ordenação da lista) e em `(tipo, status)` (filtros).

### Segurança com RLS
- **Decisão:** RLS ligada. Usuários `authenticated` podem **ler, cadastrar e alterar**. O papel `anon` (sem login) não tem nenhuma política e ainda perde todos os privilégios (`revoke all`).
- **Sem política de DELETE:** ninguém apaga doações pelo app. Isso evita perder histórico por engano, e apagar não está nos requisitos.
- **Por quê:** o repositório é público e a chave `anon` vai para o navegador. A proteção precisa morar no banco, não na tela.
- **Todos da equipe têm o mesmo acesso:** não há papéis diferentes, porque o requisito não pede.

### Armadilha tratada: update bloqueado não dá erro
- Quando a RLS barra um `update` (por exemplo, com a sessão expirada), o Supabase **não devolve erro**: só não altera nenhuma linha. Por isso `atualizarStatus` pede de volta as linhas alteradas e trata "zero linhas" como falha. Sem isso, a tela mostraria o status trocado sem nada ter sido salvo.

### Camada `repositorio.ts`
- Todo acesso ao banco passa por quatro funções (`listarDoacoes`, `criarDoacao`, `atualizarStatus`, `listarResumo`). As telas não falam com o Supabase diretamente.
- **Por quê:** concentra as mensagens de erro amigáveis (`ErroRepositorio`) e facilita testar as telas com dados simulados.
- Filtros por tipo e status são aplicados **no banco** (`eq`), não no navegador. Assim, só trafega o que vai aparecer na tela.

### Verificação da RLS: `npm run verificar:rls`
- Usa só a URL e a chave `anon` do `.env.local`. Sem login, tenta ler, cadastrar e alterar, e precisa ser bloqueado nas três.
- Roda manualmente contra o projeto real e **não** faz parte dos testes automáticos, que continuam offline e sem segredos.
- A prova mais forte é o cadastro, porque com a tabela vazia uma leitura "0 linhas" não diz muito. Vale rodar de novo depois que houver doações cadastradas.

---

## Etapa 5 — Login da equipe e rotas protegidas

### Supabase Auth com e-mail e senha
- **Por quê:** já vem com o Supabase, guarda a sessão no navegador e renova o token sozinho. Não é preciso nenhum serviço extra.
- **Sem cadastro pelo site:** quem administra cria as contas no painel do Supabase, com o cadastro público desligado. Assim ninguém de fora cria conta.
- **Sem "esqueci minha senha" nesta versão:** exigiria configurar envio de e-mail (SMTP) e URLs de retorno. Por enquanto, quem administra redefine a senha pelo painel (passo a passo no README).

### Todas as telas atrás do login
- `RotaProtegida` envolve tudo, exceto `/login`. Sem sessão, a pessoa vai para o login. Enquanto a sessão é verificada, aparece "Carregando…", o que evita piscar a tela de login para quem já está logado.
- Quem já está logado e abre `/login` vai direto para a lista.
- Qualquer endereço desconhecido leva para `/doacoes`.
- **Importante:** isso é conforto de navegação, não segurança. A segurança real está na RLS do banco (etapa 4).

### Mensagens de login
- Senha ou e-mail errados: "E-mail ou senha incorretos." A mensagem não diz qual dos dois está errado, de propósito.
- Falha de rede: "Não foi possível entrar. Verifique sua conexão e tente novamente."
- O botão fica desabilitado ("Entrando…") durante o envio, para evitar cliques repetidos.

### Organização
- `useAuth` fica em um arquivo separado do `AuthProvider`, por exigência do *fast refresh* do Vite (um arquivo de componente deve exportar só componentes).

---

## Etapa 6 — Formulário de cadastro

### Busca do CEP automática
- **Decisão:** a busca dispara sozinha quando o CEP chega a 8 dígitos. Não há botão "buscar". Ao sair do campo com o CEP incompleto, aparece "CEP inválido…".
- **Por quê:** é um passo a menos para a equipe. Quando o endereço chega, o cursor vai direto para "Número", o próximo campo a preencher.
- Durante a busca aparece "Buscando endereço…".

### Endereço continua editável
- Rua, bairro, cidade e UF são preenchidos pela API, mas podem ser corrigidos.
- **Por quê:** CEPs gerais de cidade pequena vêm sem rua e bairro, a API pode estar fora do ar, e às vezes o nome oficial difere do que o doador informa. Travar os campos impediria o cadastro nesses casos.

### Proteção contra resposta atrasada
- **Situação:** a pessoa digita um CEP, percebe o erro e corrige antes da primeira busca responder. Se a resposta antiga chegasse por último, sobrescreveria o endereço certo.
- **Decisão:** cada resposta só é aplicada se o CEP no campo ainda for o mesmo consultado. Existe teste específico, e confirmamos que ele falha sem a proteção.

### Proteção contra clique duplo
- O botão fica desabilitado ("Salvando…") e também há uma trava imediata (`useRef`). O estado do React só se atualiza no próximo render, então dois cliques muito rápidos passariam pela checagem do botão. Teste confirma que só **uma** doação é criada.

### Depois de salvar
- **Sucesso:** a mensagem "Doação registrada com sucesso." aparece e o formulário é limpo, pronto para a próxima doação. Esse é o fluxo comum de quem está registrando várias doações seguidas.
- **Erro:** a mensagem aparece e **os dados digitados são mantidos**, para a pessoa tentar de novo sem redigitar.

### Acessibilidade
- Todo campo tem `<label>` ligado ao input. Erros ficam ligados ao campo (`aria-describedby`, `aria-invalid`). As mensagens de CEP e de erro usam `role="alert"`, para que leitores de tela anunciem.
- Telefone e CEP usam `inputMode="numeric"`, que abre o teclado numérico no celular.
