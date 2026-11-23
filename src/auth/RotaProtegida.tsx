import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from './useAuth'

export function RotaProtegida({ children }: { children: ReactNode }) {
  const { sessao, carregando } = useAuth()
  if (carregando) return <p className="carregando">Carregando…</p>
  if (!sessao) return <Navigate to="/login" replace />
  return <>{children}</>
}
