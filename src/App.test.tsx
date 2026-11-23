import { render, screen } from '@testing-library/react'
import App from './App'

test('mostra o título do sistema de doações', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /Doações/ })).toBeInTheDocument()
})
