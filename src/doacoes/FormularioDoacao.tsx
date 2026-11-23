import { useRef, useState, type FormEvent, type ReactNode } from 'react'
import { buscarCep } from '../cep/buscarCep'
import { ROTULO_TIPO, TIPOS } from '../dominio/doacao'
import {
  MENSAGEM_CEP_INVALIDO,
  apenasDigitos,
  mascararCep,
  mascararTelefone,
  validarDoacao,
  type ErrosDoacao,
  type FormDoacao,
} from '../dominio/validacao'
import { ErroRepositorio, criarDoacao } from './repositorio'

const VAZIO: FormDoacao = {
  doador_nome: '',
  doador_telefone: '',
  tipo: '',
  descricao: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  cidade: '',
  uf: '',
}

const ERRO_SALVAR = 'Não foi possível salvar. Verifique sua conexão e tente novamente.'

type Campo = keyof FormDoacao

interface GrupoProps {
  id: Campo
  rotulo: string
  erro?: string
  obrigatorio?: boolean
  largo?: boolean
  children: ReactNode
}

function Grupo({ id, rotulo, erro, obrigatorio, largo, children }: GrupoProps) {
  return (
    <div className={largo ? 'grupo largo' : 'grupo'}>
      <label htmlFor={id}>
        {rotulo}
        {obrigatorio && <span aria-hidden="true"> *</span>}
      </label>
      {children}
      {erro && (
        <p className="erro-campo" id={`${id}-erro`}>
          {erro}
        </p>
      )}
    </div>
  )
}

export function FormularioDoacao() {
  const [form, setForm] = useState<FormDoacao>(VAZIO)
  const [erros, setErros] = useState<ErrosDoacao>({})
  const [mensagemCep, setMensagemCep] = useState<string | null>(null)
  const [buscandoCep, setBuscandoCep] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [aviso, setAviso] = useState<{ tipo: 'sucesso' | 'erro'; texto: string } | null>(null)

  // Refs: valores que precisam estar atualizados na hora, sem esperar o próximo render.
  const enviandoRef = useRef(false)
  const cepAtualRef = useRef('')
  const cepBuscadoRef = useRef('')
  /** CEP cujo endereço está preenchido nos campos ('' = nenhum, ou digitado à mão). */
  const enderecoDoCepRef = useRef('')
  const numeroRef = useRef<HTMLInputElement>(null)

  function alterar(campo: Campo, valor: string) {
    setForm((f) => ({ ...f, [campo]: valor }))
    setErros((e) => ({ ...e, [campo]: undefined }))
  }

  async function consultarCep(digitos: string) {
    cepBuscadoRef.current = digitos
    setMensagemCep(null)
    setBuscandoCep(true)
    // Endereço preenchido por OUTRO CEP não vale mais: apaga para não salvar endereço errado.
    if (enderecoDoCepRef.current && enderecoDoCepRef.current !== digitos) {
      enderecoDoCepRef.current = ''
      setForm((f) => ({ ...f, logradouro: '', bairro: '', cidade: '', uf: '' }))
    }
    const resultado = await buscarCep(digitos)
    // O CEP pode ter mudado enquanto esperávamos: ignora respostas antigas.
    if (cepAtualRef.current !== digitos) return
    setBuscandoCep(false)
    if (!resultado.ok) {
      setMensagemCep(resultado.mensagem)
      // Permite tentar de novo ao sair do campo.
      cepBuscadoRef.current = ''
      return
    }
    const { logradouro, bairro, cidade, uf } = resultado.endereco
    enderecoDoCepRef.current = digitos
    setForm((f) => ({ ...f, logradouro, bairro, cidade, uf }))
    setErros((e) => ({ ...e, logradouro: undefined, bairro: undefined, cidade: undefined, uf: undefined }))
    numeroRef.current?.focus()
  }

  function alterarCep(valor: string) {
    const digitos = apenasDigitos(valor).slice(0, 8)
    cepAtualRef.current = digitos
    alterar('cep', mascararCep(digitos))
    setMensagemCep(null)
    if (digitos.length < 8) {
      cepBuscadoRef.current = ''
      setBuscandoCep(false)
    } else if (digitos !== cepBuscadoRef.current) {
      void consultarCep(digitos)
    }
  }

  function sairDoCep() {
    const digitos = cepAtualRef.current
    if (digitos.length > 0 && digitos.length < 8) setMensagemCep(MENSAGEM_CEP_INVALIDO)
    else if (digitos.length === 8 && cepBuscadoRef.current !== digitos) void consultarCep(digitos)
  }

  async function enviar(e: FormEvent) {
    e.preventDefault()
    if (enviandoRef.current) return
    setAviso(null)
    const validacao = validarDoacao(form)
    if (!validacao.ok) {
      setErros(validacao.erros)
      return
    }
    enviandoRef.current = true
    setEnviando(true)
    try {
      await criarDoacao(validacao.dados)
      setForm(VAZIO)
      setErros({})
      setMensagemCep(null)
      cepAtualRef.current = ''
      cepBuscadoRef.current = ''
      enderecoDoCepRef.current = ''
      setAviso({ tipo: 'sucesso', texto: 'Doação registrada com sucesso.' })
    } catch (erro) {
      setAviso({ tipo: 'erro', texto: erro instanceof ErroRepositorio ? erro.message : ERRO_SALVAR })
    } finally {
      enviandoRef.current = false
      setEnviando(false)
    }
  }

  const erroCep = erros.cep ?? mensagemCep ?? undefined

  function entrada(campo: Campo) {
    return {
      id: campo,
      name: campo,
      value: form[campo],
      'aria-invalid': erros[campo] ? true : undefined,
      'aria-describedby': erros[campo] ? `${campo}-erro` : undefined,
      onChange: (ev: { target: { value: string } }) => alterar(campo, ev.target.value),
    }
  }

  return (
    <section>
      <h2>Nova doação</h2>
      <form className="cartao formulario" onSubmit={enviar} noValidate>
        <fieldset>
          <legend>Doador e doação</legend>
          <Grupo id="doador_nome" rotulo="Nome do doador" erro={erros.doador_nome} obrigatorio>
            <input {...entrada('doador_nome')} autoComplete="off" />
          </Grupo>
          <Grupo id="doador_telefone" rotulo="Telefone" erro={erros.doador_telefone} obrigatorio>
            <input
              {...entrada('doador_telefone')}
              type="tel"
              inputMode="numeric"
              placeholder="(81) 99999-9999"
              onChange={(ev) => alterar('doador_telefone', mascararTelefone(ev.target.value))}
            />
          </Grupo>
          <Grupo id="tipo" rotulo="Tipo" erro={erros.tipo} obrigatorio>
            <select {...entrada('tipo')}>
              <option value="">Selecione…</option>
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO[t]}
                </option>
              ))}
            </select>
          </Grupo>
          <Grupo id="descricao" rotulo="Descrição" erro={erros.descricao} obrigatorio largo>
            <textarea {...entrada('descricao')} rows={3} placeholder="Ex.: 2 sacos de roupas infantis, tamanhos 4 a 8" />
          </Grupo>
        </fieldset>

        <fieldset>
          <legend>Endereço de retirada</legend>
          <div className="grupo">
            <label htmlFor="cep">
              CEP<span aria-hidden="true"> *</span>
            </label>
            <input
              id="cep"
              name="cep"
              inputMode="numeric"
              placeholder="00000-000"
              value={form.cep}
              aria-invalid={erroCep ? true : undefined}
              aria-describedby={erroCep ? 'cep-erro' : 'cep-dica'}
              onChange={(ev) => alterarCep(ev.target.value)}
              onBlur={sairDoCep}
            />
            {buscandoCep && <p className="dica">Buscando endereço…</p>}
            {erroCep ? (
              <p className="erro-campo" id="cep-erro" role="alert">
                {erroCep}
              </p>
            ) : (
              !buscandoCep && (
                <p className="dica" id="cep-dica">
                  Rua, bairro e cidade são preenchidos automaticamente.
                </p>
              )
            )}
          </div>
          <Grupo id="logradouro" rotulo="Rua" erro={erros.logradouro} obrigatorio largo>
            <input {...entrada('logradouro')} />
          </Grupo>
          <Grupo id="numero" rotulo="Número" erro={erros.numero} obrigatorio>
            <input {...entrada('numero')} ref={numeroRef} placeholder="Ex.: 120 ou s/n" />
          </Grupo>
          <Grupo id="complemento" rotulo="Complemento" erro={erros.complemento}>
            <input {...entrada('complemento')} placeholder="Apto, bloco, ponto de referência" />
          </Grupo>
          <Grupo id="bairro" rotulo="Bairro" erro={erros.bairro} obrigatorio>
            <input {...entrada('bairro')} />
          </Grupo>
          <Grupo id="cidade" rotulo="Cidade" erro={erros.cidade} obrigatorio>
            <input {...entrada('cidade')} />
          </Grupo>
          <Grupo id="uf" rotulo="UF" erro={erros.uf} obrigatorio>
            <input {...entrada('uf')} maxLength={2} onChange={(ev) => alterar('uf', ev.target.value.toUpperCase())} />
          </Grupo>
        </fieldset>

        {aviso && (
          <p role={aviso.tipo === 'erro' ? 'alert' : 'status'} className={aviso.tipo}>
            {aviso.texto}
          </p>
        )}
        <button type="submit" disabled={enviando}>
          {enviando ? 'Salvando…' : 'Salvar doação'}
        </button>
      </form>
    </section>
  )
}
