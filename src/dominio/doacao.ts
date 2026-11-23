export const TIPOS = ['Roupas', 'Alimentos', 'Moveis', 'Brinquedos', 'Outros'] as const
export type TipoDoacao = (typeof TIPOS)[number]

export const ROTULO_TIPO: Record<TipoDoacao, string> = {
  Roupas: 'Roupas',
  Alimentos: 'Alimentos',
  Moveis: 'Móveis',
  Brinquedos: 'Brinquedos',
  Outros: 'Outros',
}

export const STATUS = ['Recebida', 'Em triagem', 'Entregue'] as const
export type StatusDoacao = (typeof STATUS)[number]

export function ehTipo(valor: string): valor is TipoDoacao {
  return (TIPOS as readonly string[]).includes(valor)
}

export function ehStatus(valor: string): valor is StatusDoacao {
  return (STATUS as readonly string[]).includes(valor)
}

export interface NovaDoacao {
  doador_nome: string
  doador_telefone: string
  tipo: TipoDoacao
  descricao: string
  cep: string
  logradouro: string
  numero: string
  complemento: string | null
  bairro: string
  cidade: string
  uf: string
}

export interface Doacao extends NovaDoacao {
  id: string
  created_at: string
  status: StatusDoacao
}
