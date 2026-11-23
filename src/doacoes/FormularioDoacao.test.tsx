import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ResultadoCep } from '../cep/buscarCep'

const buscarCep = vi.fn<(cep: string) => Promise<ResultadoCep>>()
vi.mock('../cep/buscarCep', () => ({ buscarCep: (cep: string) => buscarCep(cep) }))

const criarDoacao = vi.fn()
vi.mock('./repositorio', async () => {
  class ErroRepositorio extends Error {}
  return { criarDoacao: (...a: unknown[]) => criarDoacao(...a), ErroRepositorio }
})

const { FormularioDoacao } = await import('./FormularioDoacao')
const { ErroRepositorio } = await import('./repositorio')

const AURORA: ResultadoCep = {
  ok: true,
  endereco: { logradouro: 'Rua da Aurora', bairro: 'Boa Vista', cidade: 'Recife', uf: 'PE' },
}

beforeEach(() => {
  buscarCep.mockReset()
  criarDoacao.mockReset()
  buscarCep.mockResolvedValue(AURORA)
})

const campo = (rotulo: string) => screen.getByLabelText(rotulo, { exact: false }) as HTMLInputElement

async function preencherTudo(user: ReturnType<typeof userEvent.setup>) {
  await user.type(campo('Nome do doador'), 'Maria da Silva')
  await user.type(campo('Telefone'), '81999998888')
  await user.selectOptions(campo('Tipo'), 'Roupas')
  await user.type(campo('Descrição'), 'Dois sacos de roupas infantis')
  await user.type(campo('CEP'), '50030230')
  await waitFor(() => expect(campo('Rua')).toHaveValue('Rua da Aurora'))
  await user.type(campo('Número'), '120')
}

test('ao completar o CEP, preenche rua, bairro, cidade e UF e foca no número', async () => {
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await user.type(campo('CEP'), '50030230')
  expect(buscarCep).toHaveBeenCalledWith('50030230')
  await waitFor(() => expect(campo('Rua')).toHaveValue('Rua da Aurora'))
  expect(campo('Bairro')).toHaveValue('Boa Vista')
  expect(campo('Cidade')).toHaveValue('Recife')
  expect(campo('UF')).toHaveValue('PE')
  expect(campo('Número')).toHaveFocus()
  expect(campo('CEP')).toHaveValue('50030-230')
})

test('CEP não encontrado mostra mensagem clara', async () => {
  buscarCep.mockResolvedValue({
    ok: false,
    erro: 'nao_encontrado',
    mensagem: 'CEP não encontrado. Confira o número ou preencha o endereço manualmente.',
  })
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await user.type(campo('CEP'), '99999999')
  expect(await screen.findByText('CEP não encontrado. Confira o número ou preencha o endereço manualmente.')).toBeInTheDocument()
})

test('trocar para um CEP não encontrado apaga o endereço do CEP anterior', async () => {
  buscarCep.mockResolvedValueOnce(AURORA).mockResolvedValueOnce({
    ok: false,
    erro: 'nao_encontrado',
    mensagem: 'CEP não encontrado. Confira o número ou preencha o endereço manualmente.',
  })
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await user.type(campo('CEP'), '50030230')
  await waitFor(() => expect(campo('Rua')).toHaveValue('Rua da Aurora'))
  await user.clear(campo('CEP'))
  await user.type(campo('CEP'), '99999999')
  await screen.findByText('CEP não encontrado. Confira o número ou preencha o endereço manualmente.')
  expect(campo('Rua')).toHaveValue('')
  expect(campo('Bairro')).toHaveValue('')
  expect(campo('Cidade')).toHaveValue('')
  expect(campo('UF')).toHaveValue('')
})

test('endereço digitado à mão antes do CEP não é apagado se a busca falhar', async () => {
  buscarCep.mockResolvedValue({
    ok: false,
    erro: 'indisponivel',
    mensagem: 'Não foi possível consultar o CEP agora. Tente novamente ou preencha o endereço manualmente.',
  })
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await user.type(campo('Rua'), 'Rua Manual')
  await user.type(campo('CEP'), '50030230')
  await screen.findByText(/Não foi possível consultar o CEP agora/)
  expect(campo('Rua')).toHaveValue('Rua Manual')
})

test('serviço de CEP fora do ar: sair do campo tenta de novo', async () => {
  buscarCep
    .mockResolvedValueOnce({
      ok: false,
      erro: 'indisponivel',
      mensagem: 'Não foi possível consultar o CEP agora. Tente novamente ou preencha o endereço manualmente.',
    })
    .mockResolvedValueOnce(AURORA)
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await user.type(campo('CEP'), '50030230')
  await screen.findByText(/Não foi possível consultar o CEP agora/)
  await user.tab()
  await waitFor(() => expect(campo('Rua')).toHaveValue('Rua da Aurora'))
  expect(buscarCep).toHaveBeenCalledTimes(2)
})

test('CEP incompleto ao sair do campo mostra CEP inválido sem consultar', async () => {
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await user.type(campo('CEP'), '5003023')
  await user.tab()
  expect(await screen.findByText('CEP inválido. Digite os 8 números do CEP.')).toBeInTheDocument()
  expect(buscarCep).not.toHaveBeenCalled()
})

test('resposta atrasada de um CEP antigo não sobrescreve o endereço do CEP novo', async () => {
  let liberarPrimeiro: (r: ResultadoCep) => void = () => {}
  buscarCep
    .mockImplementationOnce(() => new Promise((r) => (liberarPrimeiro = r)))
    .mockResolvedValueOnce({
      ok: true,
      endereco: { logradouro: 'Avenida Boa Viagem', bairro: 'Boa Viagem', cidade: 'Recife', uf: 'PE' },
    })
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await user.type(campo('CEP'), '50030230')
  await user.clear(campo('CEP'))
  await user.type(campo('CEP'), '51020000')
  await waitFor(() => expect(campo('Rua')).toHaveValue('Avenida Boa Viagem'))
  liberarPrimeiro(AURORA)
  await new Promise((r) => setTimeout(r, 0))
  expect(campo('Rua')).toHaveValue('Avenida Boa Viagem')
  expect(campo('Bairro')).toHaveValue('Boa Viagem')
})

test('enviar vazio mostra erros e não salva', async () => {
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await user.click(screen.getByRole('button', { name: 'Salvar doação' }))
  expect(screen.getByText('Informe o nome do doador.')).toBeInTheDocument()
  expect(screen.getByText('Descreva a doação.')).toBeInTheDocument()
  expect(criarDoacao).not.toHaveBeenCalled()
})

test('envio completo salva os dados normalizados, avisa e limpa o formulário', async () => {
  criarDoacao.mockResolvedValue({ id: 'novo' })
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await preencherTudo(user)
  await user.click(screen.getByRole('button', { name: 'Salvar doação' }))
  expect(await screen.findByText('Doação registrada com sucesso.')).toBeInTheDocument()
  expect(criarDoacao).toHaveBeenCalledTimes(1)
  expect(criarDoacao.mock.calls[0][0]).toMatchObject({
    doador_nome: 'Maria da Silva',
    doador_telefone: '81999998888',
    tipo: 'Roupas',
    cep: '50030230',
    logradouro: 'Rua da Aurora',
    numero: '120',
    complemento: null,
    uf: 'PE',
  })
  expect(campo('Nome do doador')).toHaveValue('')
  expect(campo('Rua')).toHaveValue('')
})

test('clique duplo em Salvar cria só uma doação', async () => {
  let liberar: (v: unknown) => void = () => {}
  criarDoacao.mockReturnValue(new Promise((r) => (liberar = r)))
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await preencherTudo(user)
  const botao = screen.getByRole('button', { name: 'Salvar doação' })
  await user.dblClick(botao)
  expect(screen.getByRole('button', { name: 'Salvando…' })).toBeDisabled()
  liberar({ id: 'novo' })
  await screen.findByText('Doação registrada com sucesso.')
  expect(criarDoacao).toHaveBeenCalledTimes(1)
})

test('falha ao salvar mostra a mensagem e mantém os dados digitados', async () => {
  criarDoacao.mockRejectedValue(new ErroRepositorio('Não foi possível salvar. Verifique sua conexão e tente novamente.'))
  const user = userEvent.setup()
  render(<FormularioDoacao />)
  await preencherTudo(user)
  await user.click(screen.getByRole('button', { name: 'Salvar doação' }))
  expect(await screen.findByText('Não foi possível salvar. Verifique sua conexão e tente novamente.')).toBeInTheDocument()
  expect(campo('Nome do doador')).toHaveValue('Maria da Silva')
})
