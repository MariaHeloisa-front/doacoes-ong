import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const chaveAnon = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

if (!url || !chaveAnon) {
  throw new Error(
    'Configuração ausente: defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY (veja .env.example).',
  )
}

export const supabase = createClient(url, chaveAnon)
