import { ehTipo, type NovaDoacao } from './doacao'

export const MENSAGEM_CEP_INVALIDO = 'CEP inválido. Digite os 8 números do CEP.'

export function apenasDigitos(s: string): string {
  return s.replace(/\D/g, '')
}

export function mascararTelefone(s: string): string {
  const d = apenasDigitos(s).slice(0, 11)
  if (d.length === 0) return ''
  if (d.length <= 2) return `(${d}`
  const ddd = d.slice(0, 2)
  const resto = d.slice(2)
  if (resto.length <= 4) return `(${ddd}) ${resto}`
  const corte = d.length === 11 ? 5 : 4
  return `(${ddd}) ${resto.slice(0, corte)}-${resto.slice(corte)}`
}

export function mascararCep(s: string): string {
  const d = apenasDigitos(s).slice(0, 8)
  return d.length <= 5 ? d : `${d.slice(0, 5)}-${d.slice(5)}`
}

export type FormDoacao = { [K in keyof NovaDoacao]: string }
export type ErrosDoacao = Partial<Record<keyof NovaDoacao, string>>

export function validarDoacao(
  f: FormDoacao,
): { ok: true; dados: NovaDoacao } | { ok: false; erros: ErrosDoacao } {
  const t = (s: string) => s.trim()
  const erros: ErrosDoacao = {}
  const telefone = apenasDigitos(f.doador_telefone)
  const cep = apenasDigitos(f.cep)
  const uf = t(f.uf).toUpperCase()

  if (!t(f.doador_nome)) erros.doador_nome = 'Informe o nome do doador.'
  if (telefone.length < 10 || telefone.length > 11)
    erros.doador_telefone = 'Telefone deve ter DDD + número (10 ou 11 dígitos).'
  if (!ehTipo(f.tipo)) erros.tipo = 'Escolha o tipo da doação.'
  if (!t(f.descricao)) erros.descricao = 'Descreva a doação.'
  if (cep.length !== 8) erros.cep = MENSAGEM_CEP_INVALIDO
  for (const campo of ['logradouro', 'numero', 'bairro', 'cidade'] as const) {
    if (!t(f[campo])) erros[campo] = 'Campo obrigatório.'
  }
  if (!/^[A-Z]{2}$/.test(uf)) erros.uf = 'UF deve ter 2 letras.'

  if (Object.keys(erros).length > 0 || !ehTipo(f.tipo)) return { ok: false, erros }

  return {
    ok: true,
    dados: {
      doador_nome: t(f.doador_nome),
      doador_telefone: telefone,
      tipo: f.tipo,
      descricao: t(f.descricao),
      cep,
      logradouro: t(f.logradouro),
      numero: t(f.numero),
      complemento: t(f.complemento) || null,
      bairro: t(f.bairro),
      cidade: t(f.cidade),
      uf,
    },
  }
}
