import { supabase } from '../lib/supabase'

/**
 * Diz se o usuário está na lista da equipe (tabela `equipe`).
 * Em caso de falha de rede devolve `true`: a tela não trava e o banco
 * (RLS) continua bloqueando quem não for da equipe.
 */
export async function ehMembroDaEquipe(userId: string): Promise<boolean> {
  try {
    const { data, error } = await supabase.from('equipe').select('user_id').eq('user_id', userId).maybeSingle()
    if (error) return true
    return data !== null
  } catch {
    return true
  }
}
