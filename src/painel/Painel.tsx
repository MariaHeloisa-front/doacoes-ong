import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { ROTULO_TIPO, STATUS, TIPOS } from '../dominio/doacao'
import { ErroRepositorio, listarResumo } from '../doacoes/repositorio'
import { agregar, type Resumo } from './agregar'

interface Item {
  chave: string
  rotulo: string
  valor: number
  /** Link para a lista já filtrada por este item. */
  filtro: string
}

function Bloco({ titulo, itens }: { titulo: string; itens: Item[] }) {
  const maior = Math.max(1, ...itens.map((i) => i.valor))
  const id = `bloco-${titulo.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <section className="cartao bloco-painel" aria-labelledby={id}>
      <h3 id={id}>{titulo}</h3>
      <ul>
        {itens.map((i) => (
          <li key={i.chave}>
            <Link to={`/doacoes?${i.filtro}`} className="linha-painel">
              <span className="rotulo">{i.rotulo}</span>
              <span className="barra" aria-hidden="true">
                <span style={{ width: `${(i.valor / maior) * 100}%` }} />
              </span>
              <strong className="valor">{i.valor}</strong>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function Painel() {
  const [resumo, setResumo] = useState<Resumo | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let atual = true
    listarResumo()
      .then((linhas) => {
        if (atual) setResumo(agregar(linhas))
      })
      .catch((e) => {
        if (atual) setErro(e instanceof ErroRepositorio ? e.message : 'Não foi possível carregar as doações.')
      })
    return () => {
      atual = false
    }
  }, [])

  return (
    <section>
      <h2>Painel</h2>
      {erro ? (
        <p role="alert" className="erro">
          {erro}
        </p>
      ) : !resumo ? (
        <p className="carregando">Carregando…</p>
      ) : (
        <>
          <p className="cartao total">
            Total de doações: <strong data-testid="total">{resumo.total}</strong>
          </p>
          <div className="grade-painel">
            <Bloco
              titulo="Por tipo"
              itens={TIPOS.map((t) => ({
                chave: t,
                rotulo: ROTULO_TIPO[t],
                valor: resumo.porTipo[t],
                filtro: `tipo=${encodeURIComponent(t)}`,
              }))}
            />
            <Bloco
              titulo="Por status"
              itens={STATUS.map((s) => ({
                chave: s,
                rotulo: s,
                valor: resumo.porStatus[s],
                filtro: `status=${encodeURIComponent(s)}`,
              }))}
            />
          </div>
        </>
      )}
    </section>
  )
}
