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
const TABELA = 'doacoes'

export async function listarDoacoes(filtros: FiltrosDoacao): Promise<Doacao[]> {
  let consulta = supabase.from(TABELA).select('*')
  if (filtros.tipo) consulta = consulta.eq('tipo', filtros.tipo)
  if (filtros.status) consulta = consulta.eq('status', filtros.status)
  const { data, error } = await consulta.order('created_at', { ascending: false })
  if (error) throw new ErroRepositorio(ERRO_LEITURA, { cause: error })
  return (data ?? []) as Doacao[]
}

export async function criarDoacao(nova: NovaDoacao): Promise<Doacao> {
  const { data, error } = await supabase.from(TABELA).insert(nova).select().single()
  if (error || !data) throw new ErroRepositorio(ERRO_GRAVACAO, { cause: error })
  return data as Doacao
}

export async function atualizarStatus(id: string, status: StatusDoacao): Promise<void> {
  const { data, error } = await supabase.from(TABELA).update({ status }).eq('id', id).select('id')
  // Com RLS, um update sem permissão não dá erro: só não altera nenhuma linha.
  if (error || !data || data.length === 0) throw new ErroRepositorio(ERRO_GRAVACAO, { cause: error })
}

export async function listarResumo(): Promise<Array<Pick<Doacao, 'tipo' | 'status'>>> {
  const { data, error } = await supabase.from(TABELA).select('tipo, status')
  if (error) throw new ErroRepositorio(ERRO_LEITURA, { cause: error })
  return (data ?? []) as Array<Pick<Doacao, 'tipo' | 'status'>>
}
