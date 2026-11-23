import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { AuthContexto } from './useAuth'

const ERRO_CONEXAO = 'Não foi possível entrar. Verifique sua conexão e tente novamente.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [carregando, setCarregando] = useState(true)

  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setCarregando(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      setCarregando(false)
    })
    return () => {
      ativo = false
      data.subscription.unsubscribe()
    }
  }, [])

  async function entrar(email: string, senha: string): Promise<string | null> {
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
      if (!error) return null
      return error.status === 400 ? 'E-mail ou senha incorretos.' : ERRO_CONEXAO
    } catch {
      return ERRO_CONEXAO
    }
  }

  async function sair() {
    await supabase.auth.signOut()
  }

  return <AuthContexto.Provider value={{ sessao, carregando, entrar, sair }}>{children}</AuthContexto.Provider>
}
