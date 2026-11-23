import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, carregando, liberado, sair } = useAuth()
  const location = useLocation()
  if (carregando) return <p className="carregando">Carregando…</p>
  // Guarda de onde a pessoa veio, para voltar para lá depois do login.
  if (!sessao) return <Navigate to="/login" replace state={{ de: location.pathname + location.search }} />
  if (!liberado) {
    return (
      <main className="pagina-login">
        <section className="cartao formulario-login">
          <h1>Acesso ainda não liberado</h1>
          <p>
            Você entrou como <strong>{sessao.user.email}</strong>, mas este usuário ainda não foi incluído na equipe.
            Peça a quem administra o sistema para liberar seu acesso.
          </p>
          <button type="button" onClick={sair}>
            Sair
          </button>
        </section>
      </main>
    )
  }
  return <>{children}</>
}
