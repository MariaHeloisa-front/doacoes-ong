const OBRIGATORIAS = ['VITE_SUPABASE_URL', 'VITE_SUPABASE_ANON_KEY'] as const

/** Lista as variáveis de ambiente obrigatórias que estão ausentes ou vazias. */
export function variaveisFaltando(env: Record<string, unknown>): string[] {
  return OBRIGATORIAS.filter((nome) => {
    const valor = env[nome]
    return typeof valor !== 'string' || valor.trim() === ''
  })
}

