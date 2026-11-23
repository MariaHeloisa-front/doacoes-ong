import { agregar } from './agregar'

test('sem doações, tudo zerado mas com todas as categorias presentes', () => {
  const r = agregar([])
  expect(r.total).toBe(0)
  expect(r.porTipo).toEqual({ Roupas: 0, Alimentos: 0, Moveis: 0, Brinquedos: 0, Outros: 0 })
  expect(r.porStatus).toEqual({ Recebida: 0, 'Em triagem': 0, Entregue: 0 })
})

test('conta por tipo e por status', () => {
  const r = agregar([
    { tipo: 'Roupas', status: 'Recebida' },
    { tipo: 'Roupas', status: 'Recebida' },
    { tipo: 'Moveis', status: 'Entregue' },
  ])
  expect(r.total).toBe(3)
  expect(r.porTipo.Roupas).toBe(2)
  expect(r.porTipo.Moveis).toBe(1)
  expect(r.porTipo.Alimentos).toBe(0)
  expect(r.porStatus.Recebida).toBe(2)
  expect(r.porStatus['Em triagem']).toBe(0)
  expect(r.porStatus.Entregue).toBe(1)
})
