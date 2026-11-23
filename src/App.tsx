import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { RotaProtegida } from './auth/RotaProtegida'
import { FormularioDoacao } from './doacoes/FormularioDoacao'
import { ListaDoacoes } from './doacoes/ListaDoacoes'
import { Layout } from './layout/Layout'
import { Painel } from './painel/Painel'

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route
            element={
              <RotaProtegida>
                <Layout />
              </RotaProtegida>
            }
          >
            <Route path="/doacoes" element={<ListaDoacoes />} />
            <Route path="/doacoes/nova" element={<FormularioDoacao />} />
            <Route path="/painel" element={<Painel />} />
          </Route>
          <Route path="*" element={<Navigate to="/doacoes" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
