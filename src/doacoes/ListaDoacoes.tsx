import { useEffect, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ROTULO_TIPO, STATUS, TIPOS, ehStatus, ehTipo, type Doacao, type StatusDoacao } from '../dominio/doacao'
import { mascararCep, mascararTelefone } from '../dominio/validacao'
import { ErroRepositorio, atualizarStatus, listarDoacoes, type FiltrosDoacao } from './repositorio'

const ERRO_STATUS = 'Não foi possível alterar o status. Tente novamente.'

function enderecoCompleto(d: Doacao): string {
  const partes = [`${d.logradouro}, ${d.numero}`]
  if (d.complemento) partes.push(d.complemento)
  partes.push(`${d.bairro}, ${d.cidade}/${d.uf}`)
  partes.push(`CEP ${mascararCep(d.cep)}`)
  return partes.join(' – ')
}

const classeStatus: Record<StatusDoacao, string> = {
  Recebida: 'status-recebida',
  'Em triagem': 'status-triagem',
  Entregue: 'status-entregue',
}

export function ListaDoacoes() {
  const [params, setParams] = useSearchParams()
  const tipoUrl = params.get('tipo') ?? ''
  const statusUrl = params.get('status') ?? ''
  const tipo = ehTipo(tipoUrl) ? tipoUrl : undefined
  const status = ehStatus(statusUrl) ? statusUrl : undefined

  // Cada resultado guarda a combinação de filtros a que pertence; enquanto o
  // resultado não for da combinação atual, a lista está "carregando".
  const chave = `${tipo ?? ''}|${status ?? ''}`
  const [resultado, setResultado] = useState<{ chave: string; doacoes: Doacao[]; erro: string | null } | null>(null)
  const [erroStatus, setErroStatus] = useState<string | null>(null)
  const carregando = resultado?.chave !== chave
  const doacoes = resultado?.doacoes ?? []
  const erroCarga = resultado?.erro ?? null

  useEffect(() => {
    let atual = true
    const filtros: FiltrosDoacao = {}
    if (tipo) filtros.tipo = tipo
    if (status) filtros.status = status
    const chaveConsulta = `${tipo ?? ''}|${status ?? ''}`
    listarDoacoes(filtros)
      .then((lista) => {
        if (atual) setResultado({ chave: chaveConsulta, doacoes: lista, erro: null })
      })
      .catch((erro) => {
        if (!atual) return
        const mensagem = erro instanceof ErroRepositorio ? erro.message : 'Não foi possível carregar as doações.'
        setResultado({ chave: chaveConsulta, doacoes: [], erro: mensagem })
      })
    // Se o filtro mudar antes da resposta, a resposta antiga é descartada.
    return () => {
      atual = false
    }
  }, [tipo, status])

  function trocarStatusLocal(id: string, novo: StatusDoacao) {
    setResultado((r) => r && { ...r, doacoes: r.doacoes.map((d) => (d.id === id ? { ...d, status: novo } : d)) })
  }

  function mudarFiltro(nome: 'tipo' | 'status', valor: string) {
    const novos = new URLSearchParams(params)
    if (valor) novos.set(nome, valor)
    else novos.delete(nome)
    setParams(novos, { replace: true })
  }

  async function mudarStatus(id: string, novo: StatusDoacao) {
    const anterior = doacoes.find((d) => d.id === id)?.status
    if (!anterior || anterior === novo) return
    setErroStatus(null)
    trocarStatusLocal(id, novo)
    try {
      await atualizarStatus(id, novo)
    } catch {
      trocarStatusLocal(id, anterior)
      setErroStatus(ERRO_STATUS)
    }
  }

  return (
    <section>
      <div className="titulo-secao">
        <h2>Doações</h2>
        <Link className="botao" to="/doacoes/nova">
          + Nova doação
        </Link>
      </div>

      <div className="filtros cartao">
        <label>
          Tipo
          <select value={tipo ?? ''} onChange={(e) => mudarFiltro('tipo', e.target.value)}>
            <option value="">Todos</option>
            {TIPOS.map((t) => (
              <option key={t} value={t}>
                {ROTULO_TIPO[t]}
              </option>
            ))}
          </select>
        </label>
        <label>
          Status
          <select value={status ?? ''} onChange={(e) => mudarFiltro('status', e.target.value)}>
            <option value="">Todos</option>
            {STATUS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>
      </div>

      {erroStatus && (
        <p role="alert" className="erro">
          {erroStatus}
        </p>
      )}

      {carregando ? (
        <p className="carregando">Carregando…</p>
      ) : erroCarga ? (
        <p role="alert" className="erro">
          {erroCarga}
        </p>
      ) : doacoes.length === 0 ? (
        <p className="vazio">Nenhuma doação encontrada com esses filtros.</p>
      ) : (
        <div className="lista">
          {doacoes.map((d) => (
            <article key={d.id} className={`cartao doacao ${classeStatus[d.status]}`}>
              <header>
                <span className="etiqueta">{ROTULO_TIPO[d.tipo]}</span>
                <time dateTime={d.created_at}>{new Date(d.created_at).toLocaleDateString('pt-BR')}</time>
              </header>
              <h3>{d.doador_nome}</h3>
              <p className="telefone">{mascararTelefone(d.doador_telefone)}</p>
              <p className="descricao">{d.descricao}</p>
              <p className="endereco">{enderecoCompleto(d)}</p>
              <div className="mudar-status">
                <span aria-hidden="true">Status</span>
                <select
                  aria-label={`Status da doação de ${d.doador_nome}`}
                  value={d.status}
                  onChange={(e) => {
                    if (ehStatus(e.target.value)) void mudarStatus(d.id, e.target.value)
                  }}
                >
                  {STATUS.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  )
}
