// Verifica, contra o projeto Supabase REAL, que um visitante SEM LOGIN
// não consegue ler nem cadastrar doações (proteção da RLS).
// Uso: npm run verificar:rls   (lê VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY do .env.local)
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const chave = process.env.VITE_SUPABASE_ANON_KEY
if (!url || !chave) {
  console.error('FALHA: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no .env.local')
  process.exit(1)
}

const anonimo = createClient(url, chave, { auth: { persistSession: false } })
const problemas = []

const leitura = await anonimo.from('doacoes').select('id').limit(1)
if (leitura.error?.code === '42P01' || leitura.error?.message?.includes('does not exist')) {
  console.error('FALHA: a tabela "doacoes" não existe. Rode a migração no SQL Editor primeiro.')
  process.exit(1)
}
if (!leitura.error && (leitura.data?.length ?? 0) > 0) {
  problemas.push('visitante sem login CONSEGUIU LER doações')
}

const insercao = await anonimo.from('doacoes').insert({
  doador_nome: 'Teste RLS',
  doador_telefone: '81999998888',
  tipo: 'Outros',
  descricao: 'Não deveria ser gravado',
  cep: '50030230',
  logradouro: 'Rua Teste',
  numero: '1',
  bairro: 'Centro',
  cidade: 'Recife',
  uf: 'PE',
})
if (!insercao.error) problemas.push('visitante sem login CONSEGUIU CADASTRAR uma doação')

const atualizacao = await anonimo
  .from('doacoes')
  .update({ status: 'Entregue' })
  .neq('id', '00000000-0000-0000-0000-000000000000')
  .select('id')
if (!atualizacao.error && (atualizacao.data?.length ?? 0) > 0) {
  problemas.push('visitante sem login CONSEGUIU ALTERAR doações')
}

if (problemas.length > 0) {
  console.error('FALHA:\n - ' + problemas.join('\n - '))
  process.exit(1)
}
console.log('OK: acesso anônimo bloqueado (leitura, cadastro e alteração).')
console.log(`   leitura → ${leitura.error ? 'erro: ' + leitura.error.message : '0 linhas'}`)
console.log(`   cadastro → erro: ${insercao.error.message}`)
