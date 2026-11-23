import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { ConfiguracaoAusente } from './ConfiguracaoAusente'
import { variaveisFaltando } from './config'

const raiz = createRoot(document.getElementById('root')!)
const faltando = variaveisFaltando(import.meta.env)

if (faltando.length > 0) {
  // Sem as variáveis o cliente do Supabase não pode ser criado: mostra uma
  // explicação em vez de uma tela em branco.
  raiz.render(<ConfiguracaoAusente faltando={faltando} />)
} else {
  // Import dinâmico: o cliente do Supabase só é carregado quando a configuração existe.
  import('./App').then(({ default: App }) =>
    raiz.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  )
}
