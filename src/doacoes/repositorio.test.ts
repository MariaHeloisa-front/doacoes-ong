import type { NovaDoacao } from '../dominio/doacao'

// Builder falso e encadeável que imita o supabase-js e registra as chamadas.
type Chamada = [metodo: string, ...args: unknown[]]
const estado: { chamadas: Chamada[]; resultado: { data: unknown; error: unknown } } = {
  chamadas: [],
  resultado: { data: null, error: null },
}

function criarBuilder() {
  const builder: Record<string, unknown> = {}
  for (const metodo of ['select', 'eq', 'order', 'insert', 'update', 'single']) {
    builder[metodo] = (...args: unknown[]) => {
      estado.chamadas.push([metodo, ...args])
      return builder
    }
  }
  builder.then = (resolve: (v: unknown) => unknown, reject: (e: unknown) => unknown) =>
    Promise.resolve(estado.resultado).then(resolve, reject)
  return builder
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (tabela: string) => {
      estado.chamadas.push(['from', tabela])
      return criarBuilder()
    },
  },
}))

const { listarDoacoes, criarDoacao, atualizarStatus, listarResumo, ErroRepositorio } = await import('./repositorio')

const nova: NovaDoacao = {
  doador_nome: 'Maria',
  doador_telefone: '81999998888',
  tipo: 'Roupas',
  descricao: 'Roupas infantis',
  cep: '50030230',
  logradouro: 'Rua da Aurora',
  numero: '120',
  complemento: null,
  bairro: 'Boa Vista',
  cidade: 'Recife',
  uf: 'PE',
}

beforeEach(() => {
  estado.chamadas = []
  estado.resultado = { data: [], error: null }
})

const metodos = () => estado.chamadas.map((c) => c[0])

describe('listarDoacoes', () => {
  test('filtra só por tipo quando só o tipo é informado, mais recentes primeiro', async () => {
    await listarDoacoes({ tipo: 'Roupas' })
    expect(estado.chamadas).toContainEqual(['from', 'doacoes'])
    expect(estado.chamadas).toContainEqual(['select', '*'])
    expect(estado.chamadas).toContainEqual(['eq', 'tipo', 'Roupas'])
    expect(estado.chamadas.filter((c) => c[0] === 'eq')).toHaveLength(1)
    expect(estado.chamadas).toContainEqual(['order', 'created_at', { ascending: false }])
  })

  test('aplica tipo e status juntos', async () => {
    await listarDoacoes({ tipo: 'Moveis', status: 'Entregue' })
    expect(estado.chamadas).toContainEqual(['eq', 'tipo', 'Moveis'])
    expect(estado.chamadas).toContainEqual(['eq', 'status', 'Entregue'])
  })

  test('sem filtros não chama eq', async () => {
    await listarDoacoes({})
    expect(metodos()).not.toContain('eq')
  })

  test('devolve as linhas do banco', async () => {
    estado.resultado = { data: [{ id: 'a' }], error: null }
    await expect(listarDoacoes({})).resolves.toEqual([{ id: 'a' }])
  })

  test('erro do Supabase vira ErroRepositorio com mensagem amigável', async () => {
    estado.resultado = { data: null, error: { message: 'TypeError: Failed to fetch' } }
    const promessa = listarDoacoes({})
    await expect(promessa).rejects.toBeInstanceOf(ErroRepositorio)
    await expect(promessa).rejects.toThrow('Não foi possível carregar as doações.')
  })
})

describe('criarDoacao', () => {
  test('insere sem status e devolve a linha criada', async () => {
    estado.resultado = { data: { ...nova, id: 'x', status: 'Recebida', created_at: 'agora' }, error: null }
    const criada = await criarDoacao(nova)
    const insert = estado.chamadas.find((c) => c[0] === 'insert')
    expect(insert?.[1]).toEqual(nova)
    expect(insert?.[1]).not.toHaveProperty('status')
    expect(metodos()).toEqual(['from', 'insert', 'select', 'single'])
    expect(criada.id).toBe('x')
  })

  test('erro ao salvar vira mensagem amigável', async () => {
    estado.resultado = { data: null, error: { message: 'new row violates row-level security policy' } }
    await expect(criarDoacao(nova)).rejects.toThrow(
      'Não foi possível salvar. Verifique sua conexão e tente novamente.',
    )
  })
})

describe('atualizarStatus', () => {
  test('atualiza só o status da doação indicada', async () => {
    estado.resultado = { data: [{ id: 'id1' }], error: null }
    await atualizarStatus('id1', 'Entregue')
    expect(estado.chamadas).toContainEqual(['update', { status: 'Entregue' }])
    expect(estado.chamadas).toContainEqual(['eq', 'id', 'id1'])
  })

  test('nenhuma linha alterada (sessão expirada / bloqueio da RLS) também é erro', async () => {
    estado.resultado = { data: [], error: null }
    await expect(atualizarStatus('id1', 'Entregue')).rejects.toBeInstanceOf(ErroRepositorio)
  })

  test('erro ao atualizar vira mensagem amigável', async () => {
    estado.resultado = { data: null, error: { message: 'falhou' } }
    await expect(atualizarStatus('id1', 'Entregue')).rejects.toThrow(
      'Não foi possível salvar. Verifique sua conexão e tente novamente.',
    )
  })
})

describe('sessão expirada', () => {
  const MSG = 'Sua sessão expirou. Clique em "Sair" e entre novamente.'

  test('JWT expirado ao salvar mostra mensagem de sessão, não de conexão', async () => {
    estado.resultado = { data: null, error: { code: 'PGRST301', message: 'JWT expired' } }
    await expect(criarDoacao(nova)).rejects.toThrow(MSG)
  })

  test('JWT inválido ao listar também', async () => {
    estado.resultado = { data: null, error: { code: 'PGRST303', message: 'JWT expired' } }
    await expect(listarDoacoes({})).rejects.toThrow(MSG)
  })
})

describe('listarResumo', () => {
  test('busca só tipo e status', async () => {
    estado.resultado = { data: [{ tipo: 'Roupas', status: 'Recebida' }], error: null }
    await expect(listarResumo()).resolves.toEqual([{ tipo: 'Roupas', status: 'Recebida' }])
    expect(estado.chamadas).toContainEqual(['select', 'tipo, status'])
  })
})
