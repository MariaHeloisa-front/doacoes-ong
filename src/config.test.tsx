import { render, screen } from '@testing-library/react'
import { ConfiguracaoAusente } from './ConfiguracaoAusente'
import { variaveisFaltando } from './config'

test('aponta as variáveis que faltam', () => {
  expect(variaveisFaltando({})).toEqual(['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'])
  expect(variaveisFaltando({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: '  ' })).toEqual([
    'VITE_SUPABASE_ANON_KEY',
  ])
})

test('nada falta quando as duas estão preenchidas', () => {
  expect(variaveisFaltando({ VITE_SUPABASE_URL: 'https://x.supabase.co', VITE_SUPABASE_ANON_KEY: 'abc' })).toEqual([])
})

test('tela de configuração ausente explica o que fazer', () => {
  render(<ConfiguracaoAusente faltando={['VITE_SUPABASE_ANON_KEY']} />)
  expect(screen.getByRole('heading', { name: 'Sistema não configurado' })).toBeInTheDocument()
  expect(screen.getByText('VITE_SUPABASE_ANON_KEY')).toBeInTheDocument()
  expect(screen.getByText(/Redeploy/)).toBeInTheDocument()
})
