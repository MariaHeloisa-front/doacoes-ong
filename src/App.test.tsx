import { render, screen } from '@testing-library/react'
import { criarAuthFalso, criarEquipeFalsa, sessaoFalsa } from './test/supabaseFalso'

const authFalso = criarAuthFalso()
const equipeFalsa = criarEquipeFalsa()
vi.mock('./lib/supabase', () => ({ supabase: { auth: authFalso, from: equipeFalsa.from } }))
const { default: App } = await import('./App')

beforeEach(() => {
  authFalso.sessaoAtual = null
  window.history.pushState({}, '', '/')
})

test('sem login, a raiz abre a tela de login', async () => {
  render(<App />)
  expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
  expect(screen.getByRole('heading', { name: /Doações/ })).toBeInTheDocument()
})

test('logado, rota desconhecida cai na lista com navegação', async () => {
  authFalso.sessaoAtual = sessaoFalsa
  window.history.pushState({}, '', '/qualquer-coisa')
  render(<App />)
  expect(await screen.findByRole('link', { name: 'Nova doação' })).toBeInTheDocument()
  expect(window.location.pathname).toBe('/doacoes')
})
