import type { Session } from '@supabase/supabase-js'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import { ehMembroDaEquipe } from './equipe'
import { AuthContexto } from './useAuth'

const ERRO_CONEXAO = 'Não foi possível entrar. Verifique sua conexão e tente novamente.'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [sessao, setSessao] = useState<Session | null>(null)
  const [verificandoSessao, setVerificandoSessao] = useState(true)
  const [equipe, setEquipe] = useState<{ userId: string; liberado: boolean } | null>(null)

  useEffect(() => {
    let ativo = true
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return
      setSessao(data.session)
      setVerificandoSessao(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_evento, novaSessao) => {
      setSessao(novaSessao)
      setVerificandoSessao(false)
    })
    return () => {
      ativo = false
      data.subscription.unsubscribe()
    }
  }, [])

  const userId = sessao?.user.id
  useEffect(() => {
    if (!userId) return
    let ativo = true
    ehMembroDaEquipe(userId).then((liberado) => {
      if (ativo) setEquipe({ userId, liberado })
    })
    return () => {
      ativo = false
    }
  }, [userId])

  const equipeVerificada = !userId || equipe?.userId === userId
  const carregando = verificandoSessao || !equipeVerificada
  const liberado = Boolean(userId && equipe?.userId === userId && equipe.liberado)

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

  return (
    <AuthContexto.Provider value={{ sessao, carregando, liberado, entrar, sair }}>{children}</AuthContexto.Provider>
  )
}
