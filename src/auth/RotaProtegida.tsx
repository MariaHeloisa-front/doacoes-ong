import type { ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from './useAuth'

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useAuth()
  const location = useLocation()
  if (carregando) return <p className="carregando">Carregando…</p>
  // Guarda de onde a pessoa veio, para voltar para lá depois do login.
  if (!sessao) return <Navigate to="/login" replace state={{ de: location.pathname + location.search }} />
  return <>{children}</>
}
