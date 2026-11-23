import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { criarAuthFalso, sessaoFalsa } from '../test/supabaseFalso'

const authFalso = criarAuthFalso()
vi.mock('../lib/supabase', () => ({ supabase: { auth: authFalso } }))

const { AuthProvider } = await import('./AuthProvider')
const { RotaProtegida } = await import('./RotaProtegida')
const { LoginPage } = await import('./LoginPage')
const { Layout } = await import('../layout/Layout')

function montar(rotaInicial: string) {
  return render(
    <MemoryRouter initialEntries={[rotaInicial]}>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route path="/doacoes" element={<p>Lista de doações</p>} />
          </Route>
        </Routes>
      </AuthProvider>
    </MemoryRouter>,
  )
}

beforeEach(() => {
  authFalso.sessaoAtual = null
  authFalso.signInWithPassword.mockReset()
})

test('sem sessão, acessar /doacoes leva à tela de login', async () => {
  montar('/doacoes')
  expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
  expect(screen.queryByText('Lista de doações')).not.toBeInTheDocument()
})

test('com sessão, /doacoes mostra o conteúdo protegido', async () => {
  authFalso.sessaoAtual = sessaoFalsa
  montar('/doacoes')
  expect(await screen.findByText('Lista de doações')).toBeInTheDocument()
})

test('credenciais erradas mostram mensagem clara', async () => {
  authFalso.signInWithPassword.mockResolvedValue({
    data: { session: null, user: null },
    error: { message: 'Invalid login credentials', status: 400 },
  })
  montar('/login')
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('E-mail'), 'x@ong.org')
  await user.type(screen.getByLabelText('Senha'), 'errada')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByRole('alert')).toHaveTextContent('E-mail ou senha incorretos.')
})

test('login correto leva para /doacoes', async () => {
  authFalso.signInWithPassword.mockImplementation(async () => {
    authFalso.emitir('SIGNED_IN', sessaoFalsa)
    return { data: { session: sessaoFalsa, user: sessaoFalsa.user }, error: null }
  })
  montar('/login')
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('E-mail'), 'equipe@ong.org')
  await user.type(screen.getByLabelText('Senha'), 'certa')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(await screen.findByText('Lista de doações')).toBeInTheDocument()
  expect(authFalso.signInWithPassword).toHaveBeenCalledWith({ email: 'equipe@ong.org', password: 'certa' })
})

test('botão Entrar fica desabilitado enquanto envia', async () => {
  let liberar: (v: unknown) => void = () => {}
  authFalso.signInWithPassword.mockReturnValue(new Promise((r) => (liberar = r)))
  montar('/login')
  const user = userEvent.setup()
  await user.type(await screen.findByLabelText('E-mail'), 'equipe@ong.org')
  await user.type(screen.getByLabelText('Senha'), 'certa')
  await user.click(screen.getByRole('button', { name: 'Entrar' }))
  expect(screen.getByRole('button', { name: 'Entrando…' })).toBeDisabled()
  liberar({ data: { session: null }, error: { message: 'x', status: 400 } })
  await waitFor(() => expect(screen.getByRole('button', { name: 'Entrar' })).toBeEnabled())
})

test('Sair encerra a sessão e volta para o login', async () => {
  authFalso.sessaoAtual = sessaoFalsa
  montar('/doacoes')
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Sair' }))
  expect(authFalso.signOut).toHaveBeenCalled()
  expect(await screen.findByLabelText('E-mail')).toBeInTheDocument()
})

test('com sessão, abrir /login redireciona para /doacoes', async () => {
  authFalso.sessaoAtual = sessaoFalsa
  montar('/login')
  expect(await screen.findByText('Lista de doações')).toBeInTheDocument()
})
