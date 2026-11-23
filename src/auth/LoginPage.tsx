import { useState, type FormEvent } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

export function LoginPage() {
  const { sessao, carregando, entrar } = useAuth()
  const location = useLocation()
  const destino = (location.state as { de?: string } | null)?.de ?? '/doacoes'
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  if (carregando) return <p className="carregando">Carregando…</p>
  if (sessao) return <Navigate to={destino} replace />

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (enviando) return
    setErro(null)
    setEnviando(true)
    const mensagem = await entrar(email, senha)
    setEnviando(false)
    if (mensagem) setErro(mensagem)
  }

  return (
    <main className="pagina-login">
      <form className="cartao formulario-login" onSubmit={enviar}>
        <h1>Doações — ONG</h1>
        <p>Acesso exclusivo da equipe.</p>
        <label>
          E-mail
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Senha
          <input
            type="password"
            autoComplete="current-password"
            required
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
          />
        </label>
        {erro && (
          <p role="alert" className="erro">
            {erro}
          </p>
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </main>
  )
}
