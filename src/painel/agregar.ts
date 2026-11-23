import { STATUS, TIPOS, type Doacao, type StatusDoacao, type TipoDoacao } from '../dominio/doacao'

export interface Resumo {
  total: number
  porTipo: Record<TipoDoacao, number>
  porStatus: Record<StatusDoacao, number>
}

/** Conta doações por tipo e por status. Todas as categorias aparecem, mesmo com zero. */
export function agregar(linhas: Array<Pick<Doacao, 'tipo' | 'status'>>): Resumo {
  const porTipo = Object.fromEntries(TIPOS.map((t) => [t, 0])) as Record<TipoDoacao, number>
  const porStatus = Object.fromEntries(STATUS.map((s) => [s, 0])) as Record<StatusDoacao, number>
  for (const { tipo, status } of linhas) {
    if (tipo in porTipo) porTipo[tipo]++
    if (status in porStatus) porStatus[status]++
  }
  return { total: linhas.length, porTipo, porStatus }
}
