import { apenasDigitos, mascararCep, mascararTelefone, validarDoacao, type FormDoacao } from './validacao'

const formCompleto: FormDoacao = {
  doador_nome: '  Maria da Silva ',
  doador_telefone: '(81) 99999-8888',
  tipo: 'Roupas',
  descricao: ' 2 sacos de roupas infantis ',
  cep: '50030-230',
  logradouro: 'Rua da Aurora',
  numero: '120',
  complemento: '',
  bairro: 'Boa Vista',
  cidade: 'Recife',
  uf: 'pe',
}

describe('apenasDigitos', () => {
  test('remove tudo que não é dígito', () => {
    expect(apenasDigitos('(81) 9.9-9')).toBe('81999')
  })
})

describe('mascararTelefone', () => {
  test('celular com 11 dígitos', () => {
    expect(mascararTelefone('81999998888')).toBe('(81) 99999-8888')
  })
  test('fixo com 10 dígitos', () => {
    expect(mascararTelefone('8133334444')).toBe('(81) 3333-4444')
  })
  test('parcial enquanto digita', () => {
    expect(mascararTelefone('819')).toBe('(81) 9')
  })
  test('ignora dígitos além de 11', () => {
    expect(mascararTelefone('819999988887')).toBe('(81) 99999-8888')
  })
})

describe('mascararCep', () => {
  test('CEP completo', () => {
    expect(mascararCep('50030230')).toBe('50030-230')
  })
  test('CEP parcial', () => {
    expect(mascararCep('500')).toBe('500')
  })
})

describe('validarDoacao', () => {
  test('formulário completo é normalizado', () => {
    const r = validarDoacao(formCompleto)
    expect(r.ok).toBe(true)
    if (!r.ok) return
    expect(r.dados).toEqual({
      doador_nome: 'Maria da Silva',
      doador_telefone: '81999998888',
      tipo: 'Roupas',
      descricao: '2 sacos de roupas infantis',
      cep: '50030230',
      logradouro: 'Rua da Aurora',
      numero: '120',
      complemento: null,
      bairro: 'Boa Vista',
      cidade: 'Recife',
      uf: 'PE',
    })
  })

  function errosDe(parcial: Partial<FormDoacao>) {
    const r = validarDoacao({ ...formCompleto, ...parcial })
    if (r.ok) throw new Error('esperava erros')
    return r.erros
  }

  test('nome só com espaços é tratado como vazio', () => {
    expect(errosDe({ doador_nome: '   ' }).doador_nome).toBe('Informe o nome do doador.')
  })
  test('telefone com 9 dígitos', () => {
    expect(errosDe({ doador_telefone: '819999988' }).doador_telefone).toBe(
      'Telefone deve ter DDD + número (10 ou 11 dígitos).',
    )
  })
  test('tipo fora da lista', () => {
    expect(errosDe({ tipo: 'Livros' }).tipo).toBe('Escolha o tipo da doação.')
  })
  test('descrição vazia', () => {
    expect(errosDe({ descricao: ' ' }).descricao).toBe('Descreva a doação.')
  })
  test('CEP com 7 dígitos', () => {
    expect(errosDe({ cep: '5003023' }).cep).toBe('CEP inválido. Digite os 8 números do CEP.')
  })
  test('campos de endereço obrigatórios', () => {
    const erros = errosDe({ logradouro: '', bairro: ' ', cidade: '', numero: '' })
    expect(erros.logradouro).toBe('Campo obrigatório.')
    expect(erros.bairro).toBe('Campo obrigatório.')
    expect(erros.cidade).toBe('Campo obrigatório.')
    expect(erros.numero).toBe('Campo obrigatório.')
  })
  test('UF com 1 letra', () => {
    expect(errosDe({ uf: 'P' }).uf).toBe('UF deve ter 2 letras.')
  })
  test('complemento é opcional e não gera erro', () => {
    expect(validarDoacao({ ...formCompleto, complemento: '' }).ok).toBe(true)
  })
})
