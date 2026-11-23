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
