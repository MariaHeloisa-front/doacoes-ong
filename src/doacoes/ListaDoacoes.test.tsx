import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useEffect } from 'react'
import { MemoryRouter, useLocation } from 'react-router-dom'
import type { Doacao } from '../dominio/doacao'

const listarDoacoes = vi.fn()
const atualizarStatus = vi.fn()
vi.mock('./repositorio', async () => {
  class ErroRepositorio extends Error {}
  return {
    listarDoacoes: (...a: unknown[]) => listarDoacoes(...a),
    atualizarStatus: (...a: unknown[]) => atualizarStatus(...a),
    ErroRepositorio,
  }
})

const { ListaDoacoes } = await import('./ListaDoacoes')
const { ErroRepositorio } = await import('./repositorio')

const base = {
  doador_telefone: '81999998888',
  cep: '50030230',
  logradouro: 'Rua da Aurora',
  numero: '120',
  complemento: null,
  bairro: 'Boa Vista',
  cidade: 'Recife',
  uf: 'PE',
}
const doacoes: Doacao[] = [
  { ...base, id: 'id1', created_at: '2026-11-20T10:00:00Z', doador_nome: 'Maria', tipo: 'Roupas', descricao: 'Roupas infantis', status: 'Recebida' },
  { ...base, id: 'id2', created_at: '2026-11-19T10:00:00Z', doador_nome: 'João', tipo: 'Moveis', descricao: 'Um sofá', status: 'Entregue', complemento: 'Apto 101' },
]

let urlAtual = ''
function EspiaUrl() {
  const loc = useLocation()
  useEffect(() => {
    urlAtual = loc.pathname + loc.search
  }, [loc])
  return null
}

function montar(rota = '/doacoes') {
  return render(
    <MemoryRouter initialEntries={[rota]}>
      <ListaDoacoes />
      <EspiaUrl />
    </MemoryRouter>,
  )
}

beforeEach(() => {
  listarDoacoes.mockReset().mockResolvedValue(doacoes)
  atualizarStatus.mockReset().mockResolvedValue(undefined)
})

const cartaoDe = async (nome: string) => (await screen.findByText(nome)).closest('article') as HTMLElement

test('mostra as doações com rótulo de tipo, telefone formatado e endereço completo', async () => {
  montar()
  const joao = await cartaoDe('João')
  expect(within(joao).getByText('Móveis')).toBeInTheDocument()
  expect(within(joao).getByText('(81) 99999-8888')).toBeInTheDocument()
  expect(within(joao).getByText('Rua da Aurora, 120 – Apto 101 – Boa Vista, Recife/PE – CEP 50030-230')).toBeInTheDocument()
  expect(screen.getByText('Maria')).toBeInTheDocument()
})

test('filtrar por tipo consulta o banco e atualiza a URL', async () => {
  const user = userEvent.setup()
  montar()
  await screen.findByText('Maria')
  await user.selectOptions(screen.getByLabelText('Tipo'), 'Roupas')
  await waitFor(() => expect(listarDoacoes).toHaveBeenLastCalledWith({ tipo: 'Roupas' }))
  expect(urlAtual).toContain('tipo=Roupas')
})

test('filtro vindo da URL é aplicado na primeira consulta', async () => {
  montar('/doacoes?status=Entregue')
  await screen.findByText('Maria')
  expect(listarDoacoes).toHaveBeenCalledWith({ status: 'Entregue' })
  expect(screen.getByLabelText('Status')).toHaveValue('Entregue')
})

test('valor inválido na URL é ignorado', async () => {
  montar('/doacoes?tipo=Livros')
  await screen.findByText('Maria')
  expect(listarDoacoes).toHaveBeenCalledWith({})
})

test('lista vazia mostra mensagem', async () => {
  listarDoacoes.mockResolvedValue([])
  montar()
  expect(await screen.findByText('Nenhuma doação encontrada com esses filtros.')).toBeInTheDocument()
})

test('erro ao carregar mostra mensagem', async () => {
  listarDoacoes.mockRejectedValue(new ErroRepositorio('Não foi possível carregar as doações.'))
  montar()
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível carregar as doações.')
})

test('mudar o status salva no banco e mantém o novo valor', async () => {
  const user = userEvent.setup()
  montar()
  const maria = await cartaoDe('Maria')
  const select = within(maria).getByLabelText('Status da doação de Maria')
  await user.selectOptions(select, 'Em triagem')
  expect(atualizarStatus).toHaveBeenCalledWith('id1', 'Em triagem')
  await waitFor(() => expect(select).toHaveValue('Em triagem'))
  expect(screen.queryByRole('alert')).not.toBeInTheDocument()
})

test('falha ao mudar o status volta ao valor anterior e avisa', async () => {
  atualizarStatus.mockRejectedValue(new ErroRepositorio('falhou'))
  const user = userEvent.setup()
  montar()
  const maria = await cartaoDe('Maria')
  const select = within(maria).getByLabelText('Status da doação de Maria')
  await user.selectOptions(select, 'Entregue')
  expect(await screen.findByRole('alert')).toHaveTextContent('Não foi possível alterar o status. Tente novamente.')
  expect(select).toHaveValue('Recebida')
})
