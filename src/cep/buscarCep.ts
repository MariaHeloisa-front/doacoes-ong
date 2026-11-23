import { MENSAGEM_CEP_INVALIDO, apenasDigitos } from '../dominio/validacao'

export interface EnderecoCep {
  logradouro: string
  bairro: string
  cidade: string
  uf: string
}

export type ErroCep = 'formato' | 'nao_encontrado' | 'indisponivel'

export type ResultadoCep =
  | { ok: true; endereco: EnderecoCep }
  | { ok: false; erro: ErroCep; mensagem: string }

const MENSAGENS: Record<ErroCep, string> = {
  formato: MENSAGEM_CEP_INVALIDO,
  nao_encontrado: 'CEP não encontrado. Confira o número ou preencha o endereço manualmente.',
  indisponivel: 'Não foi possível consultar o CEP agora. Tente novamente ou preencha o endereço manualmente.',
}

const TEMPO_LIMITE_MS = 5000

function falha(erro: ErroCep): ResultadoCep {
  return { ok: false, erro, mensagem: MENSAGENS[erro] }
}

const texto = (v: unknown) => (typeof v === 'string' ? v.trim() : '')

/** Resultado de um provedor: endereço, "não existe" ou `null` quando o provedor falhou. */
type Consulta = ResultadoCep | null

async function consultarViaCep(cep: string, fetchFn: typeof fetch): Promise<Consulta> {
  try {
    const res = await fetchFn(`https://viacep.com.br/ws/${cep}/json/`, {
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    })
    if (!res.ok) return null
    const d = await res.json()
    if (d?.erro === true || d?.erro === 'true') return falha('nao_encontrado')
    return {
      ok: true,
      endereco: { logradouro: texto(d.logradouro), bairro: texto(d.bairro), cidade: texto(d.localidade), uf: texto(d.uf) },
    }
  } catch {
    return null
  }
}

async function consultarBrasilApi(cep: string, fetchFn: typeof fetch): Promise<Consulta> {
  try {
    const res = await fetchFn(`https://brasilapi.com.br/api/cep/v1/${cep}`, {
      signal: AbortSignal.timeout(TEMPO_LIMITE_MS),
    })
    if (res.status === 404) return falha('nao_encontrado')
    if (!res.ok) return null
    const d = await res.json()
    return {
      ok: true,
      endereco: { logradouro: texto(d.street), bairro: texto(d.neighborhood), cidade: texto(d.city), uf: texto(d.state) },
    }
  } catch {
    return null
  }
}

/**
 * Busca rua, bairro, cidade e UF de um CEP.
 * Consulta o ViaCEP e, se ele estiver fora do ar, a BrasilAPI.
 */
export async function buscarCep(cep: string, fetchFn: typeof fetch = fetch): Promise<ResultadoCep> {
  const digitos = apenasDigitos(cep)
  if (digitos.length !== 8) return falha('formato')

  return (
    (await consultarViaCep(digitos, fetchFn)) ??
    (await consultarBrasilApi(digitos, fetchFn)) ??
    falha('indisponivel')
  )
}
