import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'

const listarResumo = vi.fn()
vi.mock('../doacoes/repositorio', async () => {
  class ErroRepositorio extends Error {}
  return { listarResumo: () => listarResumo(), ErroRepositorio }
})
const { Painel } = await import('./Painel')
const { ErroRepositorio } = await import('../doacoes/repositorio')

beforeEach(() => {
  listarResumo.mockReset()
})

test('mostra total, contagem por tipo (com rótulo Móveis) e por status', async () => {
  listarResumo.mockResolvedValue([
    { tipo: 'Roupas', status: 'Recebida' },
    { tipo: 'Roupas', status: 'Em triagem' },
    { tipo: 'Moveis', status: 'Entregue' },
  ])
  render(<MemoryRouter><Painel /></MemoryRouter>)
  const total = await screen.findByTestId('total')
  expect(total).toHaveTextContent('3')

  const porTipo = screen.getByRole('region', { name: 'Por tipo' })
  expect(within(porTipo).getByText('Roupas').closest('li')).toHaveTextContent('2')
  expect(within(porTipo).getByText('Móveis').closest('li')).toHaveTextContent('1')
  expect(within(porTipo).getByText('Brinquedos').closest('li')).toHaveTextContent('0')

  const porStatus = screen.getByRole('region', { name: 'Por status' })
  expect(within(porStatus).getByText('Em triagem').closest('li')).toHaveTextContent('1')
})

test('erro ao carregar mostra mensagem', async () => {
  listarResumo.mockRejectedValue(new ErroRepositorio('Não foi possível carregar as doações.'))
  render(<MemoryRouter><Painel /></MemoryRouter>)
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as doações.')
})
