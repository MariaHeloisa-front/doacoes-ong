/** Mostrada no lugar do app quando o deploy está sem as variáveis do Supabase. */
export function ConfiguracaoAusente({ faltando }: { faltando: string[] }) {
  return (
    <main className="pagina-login">
      <section className="cartao formulario-login">
        <h1>Sistema não configurado</h1>
        <p>Faltam as seguintes variáveis de ambiente:</p>
        <ul>
          {faltando.map((nome) => (
            <li key={nome}>
              <code>{nome}</code>
            </li>
          ))}
        </ul>
        <p>
          Cadastre-as na Vercel (Settings → Environment Variables) ou no arquivo <code>.env.local</code>. Na
          Vercel, depois de cadastrar, é preciso fazer um novo deploy (Deployments → ⋯ → Redeploy).
        </p>
      </section>
    </main>
  )
}
