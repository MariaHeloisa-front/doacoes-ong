import type { Doacao, NovaDoacao, StatusDoacao, TipoDoacao } from '../dominio/doacao'
import { supabase } from '../lib/supabase'

export interface FiltrosDoacao {
  tipo?: TipoDoacao
  status?: StatusDoacao
}

/** Erro com mensagem já pronta para mostrar à equipe. */
export class ErroRepositorio extends Error {
  constructor(mensagem: string, options?: { cause?: unknown }) {
    super(mensagem, options)
    this.name = 'ErroRepositorio'
  }
}

const ERRO_LEITURA = 'Não foi possível carregar as doações.'
const ERRO_GRAVACAO = 'Não foi possível salvar. Verifique sua conexão e tente novamente.'
const ERRO_SESSAO = 'Sua sessão expirou. Clique em "Sair" e entre novamente.'
const TABELA = 'doacoes'

/** Códigos do PostgREST para token ausente, inválido ou expirado. */
const CODIGOS_SESSAO = new Set(['PGRST301', 'PGRST302', 'PGRST303'])

function erroDe(error: { code?: string; message?: string } | null, padrao: string): ErroRepositorio {
  const sessao = (error?.code && CODIGOS_SESSAO.has(error.code)) || /jwt/i.test(error?.message ?? '')
  return new ErroRepositorio(sessao ? ERRO_SESSAO : padrao, { cause: error })
}

export async function listarDoacoes(filtros: FiltrosDoacao): Promise<Doacao[]> {
  let consulta = supabase.from(TABELA).select('*')
  if (filtros.tipo) consulta = consulta.eq('tipo', filtros.tipo)
  if (filtros.status) consulta = consulta.eq('status', filtros.status)
  const { data, error } = await consulta.order('created_at', { ascending: false })
  if (error) throw erroDe(error, ERRO_LEITURA)
  return (data ?? []) as Doacao[]
}

export async function criarDoacao(nova: NovaDoacao): Promise<Doacao> {
  const { data, error } = await supabase.from(TABELA).insert(nova).select().single()
  if (error || !data) throw erroDe(error, ERRO_GRAVACAO)
  return data as Doacao
}

export async function atualizarStatus(id: string, status: StatusDoacao): Promise<void> {
  const { data, error } = await supabase.from(TABELA).update({ status }).eq('id', id).select('id')
  // Com RLS, um update sem permissão não dá erro: só não altera nenhuma linha.
  if (error || !data || data.length === 0) throw erroDe(error, ERRO_GRAVACAO)
}

export async function listarResumo(): Promise<Array<Pick<Doacao, 'tipo' | 'status'>>> {
  const { data, error } = await supabase.from(TABELA).select('tipo, status')
  if (error) throw erroDe(error, ERRO_LEITURA)
  return (data ?? []) as Array<Pick<Doacao, 'tipo' | 'status'>>
}
