import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../auth/useAuth'

export function Layout() {
  const { sessao, sair } = useAuth()
  return (
    <>
      <header className="cabecalho">
        <h1>Doações — ONG</h1>
        <nav>
          <NavLink to="/doacoes" end>
            Doações
          </NavLink>
          <NavLink to="/doacoes/nova">Nova doação</NavLink>
          <NavLink to="/painel">Painel</NavLink>
        </nav>
        <div className="usuario">
          <span>{sessao?.user.email}</span>
          <button type="button" className="secundario" onClick={sair}>
            Sair
          </button>
        </div>
      </header>
      <main className="conteudo">
        <Outlet />
      </main>
    </>
  )
}
