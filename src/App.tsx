import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from './auth/AuthProvider'
import { LoginPage } from './auth/LoginPage'
import { RotaProtegida } from './auth/RotaProtegida'
import { Layout } from './layout/Layout'

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
            <Route path="/doacoes" element={<p>Em construção.</p>} />
            <Route path="/doacoes/nova" element={<p>Em construção.</p>} />
            <Route path="/painel" element={<p>Em construção.</p>} />
          </Route>
          <Route path="*" element={<Navigate to="/doacoes" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}
