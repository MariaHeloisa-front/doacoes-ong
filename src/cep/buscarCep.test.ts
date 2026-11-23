import { buscarCep } from './buscarCep'

const MSG_NAO_ENCONTRADO = 'CEP não encontrado. Confira o número ou preencha o endereço manualmente.'
const MSG_INDISPONIVEL =
  'Não foi possível consultar o CEP agora. Tente novamente ou preencha o endereço manualmente.'

function resposta(corpo: unknown, status = 200): Response {
  return new Response(JSON.stringify(corpo), { status, headers: { 'Content-Type': 'application/json' } })
}

const viaCepAurora = { cep: '50030-230', logradouro: 'Rua da Aurora', bairro: 'Boa Vista', localidade: 'Recife', uf: 'PE' }

test('CEP com formato inválido não chama a API', async () => {
  const fetchFn = vi.fn()
  const r = await buscarCep('123', fetchFn)
  expect(r).toEqual({ ok: false, erro: 'formato', mensagem: 'CEP inválido. Digite os 8 números do CEP.' })
  expect(fetchFn).not.toHaveBeenCalled()
})

test('CEP colado com ponto, traço e espaços é normalizado e consultado no ViaCEP', async () => {
  const fetchFn = vi.fn().mockResolvedValue(resposta(viaCepAurora))
  const r = await buscarCep(' 50.030-230 ', fetchFn)
  expect(fetchFn).toHaveBeenCalledTimes(1)
  expect(fetchFn.mock.calls[0][0]).toBe('https://viacep.com.br/ws/50030230/json/')
  expect(r).toEqual({
    ok: true,
    endereco: { logradouro: 'Rua da Aurora', bairro: 'Boa Vista', cidade: 'Recife', uf: 'PE' },
  })
})

test('ViaCEP responde erro: true → não encontrado, sem consultar a BrasilAPI', async () => {
  const fetchFn = vi.fn().mockResolvedValue(resposta({ erro: true }))
  const r = await buscarCep('99999999', fetchFn)
  expect(r).toEqual({ ok: false, erro: 'nao_encontrado', mensagem: MSG_NAO_ENCONTRADO })
  expect(fetchFn).toHaveBeenCalledTimes(1)
})

test('ViaCEP responde erro: "true" (texto) → não encontrado', async () => {
  const fetchFn = vi.fn().mockResolvedValue(resposta({ erro: 'true' }))
  const r = await buscarCep('00000000', fetchFn)
  expect(r).toMatchObject({ ok: false, erro: 'nao_encontrado' })
})

test('ViaCEP fora do ar → usa a BrasilAPI como reserva', async () => {
  const fetchFn = vi
    .fn()
    .mockRejectedValueOnce(new TypeError('Failed to fetch'))
    .mockResolvedValueOnce(
      resposta({ cep: '50030230', state: 'PE', city: 'Recife', neighborhood: 'Boa Vista', street: 'Rua da Aurora' }),
    )
  const r = await buscarCep('50030230', fetchFn)
  expect(fetchFn.mock.calls[1][0]).toBe('https://brasilapi.com.br/api/cep/v1/50030230')
  expect(r).toEqual({
    ok: true,
    endereco: { logradouro: 'Rua da Aurora', bairro: 'Boa Vista', cidade: 'Recife', uf: 'PE' },
  })
})

test('ViaCEP com erro 500 e BrasilAPI 404 → não encontrado', async () => {
  const fetchFn = vi
    .fn()
    .mockResolvedValueOnce(new Response('erro', { status: 500 }))
    .mockResolvedValueOnce(resposta({ message: 'CEP não encontrado' }, 404))
  const r = await buscarCep('99999999', fetchFn)
  expect(r).toEqual({ ok: false, erro: 'nao_encontrado', mensagem: MSG_NAO_ENCONTRADO })
})

test('ViaCEP e BrasilAPI fora do ar → indisponível', async () => {
  const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'))
  const r = await buscarCep('50030230', fetchFn)
  expect(r).toEqual({ ok: false, erro: 'indisponivel', mensagem: MSG_INDISPONIVEL })
  expect(fetchFn).toHaveBeenCalledTimes(2)
})

test('campos ausentes na resposta viram texto vazio (CEP geral de cidade)', async () => {
  const fetchFn = vi.fn().mockResolvedValue(resposta({ cep: '55590-000', localidade: 'Ipojuca', uf: 'PE' }))
  const r = await buscarCep('55590000', fetchFn)
  expect(r).toEqual({ ok: true, endereco: { logradouro: '', bairro: '', cidade: 'Ipojuca', uf: 'PE' } })
})
