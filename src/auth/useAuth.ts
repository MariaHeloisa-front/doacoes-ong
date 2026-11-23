import type { Session } from '@supabase/supabase-js'
import { createContext, useContext } from 'react'

export interface ValorAuth {
  sessao: Session | null
  /** `true` enquanto a sessão ou a liberação na equipe estão sendo verificadas. */
  carregando: boolean
  /** `false` quando o usuário está logado mas não está na tabela `equipe`. */
  liberado: boolean
  /** Devolve `null` em caso de sucesso ou a mensagem de erro em português. */
  entrar(email: string, senha: string): Promise<string | null>
  sair(): Promise<void>
}

export const AuthContexto = createContext<ValorAuth | null>(null)

export function useAuth(): ValorAuth {
  const valor = useContext(AuthContexto)
  if (!valor) throw new Error('useAuth precisa estar dentro de <AuthProvider>')
  return valor
}
