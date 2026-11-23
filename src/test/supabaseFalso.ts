import type { Session } from '@supabase/supabase-js'

/** Supabase falso para testes de autenticação. */
export function criarAuthFalso() {
  let ouvinte: ((evento: string, sessao: Session | null) => void) | null = null
  const auth = {
    sessaoAtual: null as Session | null,
    getSession: vi.fn(async () => ({ data: { session: auth.sessaoAtual }, error: null })),
    onAuthStateChange: vi.fn((cb: (evento: string, sessao: Session | null) => void) => {
      ouvinte = cb
      return { data: { subscription: { unsubscribe: vi.fn() } } }
    }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(async () => {
      auth.sessaoAtual = null
      ouvinte?.('SIGNED_OUT', null)
      return { error: null }
    }),
    emitir(evento: string, sessao: Session | null) {
      auth.sessaoAtual = sessao
      ouvinte?.(evento, sessao)
    },
  }
  return auth
}

export const sessaoFalsa = { access_token: 't', user: { id: 'u1', email: 'equipe@ong.org' } } as unknown as Session

/** Tabela `equipe` falsa: `membro` define se o usuário logado está liberado. */
export function criarEquipeFalsa() {
  const equipe = {
    membro: true,
    erro: null as null | { message: string },
    from: vi.fn((tabela: string) => {
      if (tabela !== 'equipe') throw new Error(`tabela inesperada: ${tabela}`)
      return {
        select: () => ({
          eq: (_coluna: string, userId: string) => ({
            maybeSingle: async () => ({
              data: equipe.membro && !equipe.erro ? { user_id: userId } : null,
              error: equipe.erro,
            }),
          }),
        }),
      }
    }),
  }
  return equipe
}
