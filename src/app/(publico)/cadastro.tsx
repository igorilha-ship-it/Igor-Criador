import { router } from 'expo-router';
import { useState } from 'react';

import { Aviso, Botao, Campo, Confirmacao, Opcoes, Tela, Texto, Titulo } from '@/components/ui';
import { calcularIdade, dataBrParaIso, mascararData } from '@/lib/idade';
import { supabase } from '@/lib/supabase';
import { NomesGenero, type Genero, type TipoConta } from '@/lib/tipos';

const opcoesGenero = (Object.keys(NomesGenero) as Genero[]).map((g) => ({ valor: g, nome: NomesGenero[g] }));

const opcoesTipo: { valor: Exclude<TipoConta, 'admin'>; nome: string }[] = [
  { valor: 'usuario', nome: 'Quero conhecer pessoas' },
  { valor: 'anunciante', nome: 'Sou anunciante' },
  { valor: 'motorista', nome: 'Sou motorista' },
];

export default function Cadastro() {
  const [tipo, setTipo] = useState<Exclude<TipoConta, 'admin'>>('usuario');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [nascimento, setNascimento] = useState('');
  const [genero, setGenero] = useState<Genero | null>(null);
  const [interesse, setInteresse] = useState<Genero[]>([]);
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const [erros, setErros] = useState<Record<string, string>>({});
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'erro' | 'sucesso' } | null>(null);
  const [enviando, setEnviando] = useState(false);

  const ehMotorista = tipo === 'motorista';

  function validar() {
    const e: Record<string, string> = {};
    if (nome.trim().length < 2) e.nome = 'Informe como quer ser chamado(a).';
    if (!/^\S+@\S+\.\S+$/.test(email.trim())) e.email = 'E-mail inválido.';
    if (senha.length < 8) e.senha = 'A senha precisa ter pelo menos 8 caracteres.';
    const iso = dataBrParaIso(nascimento);
    if (!iso) e.nascimento = 'Use o formato DD/MM/AAAA.';
    else if (calcularIdade(iso) < 18) e.nascimento = 'O Encontro RIO é exclusivo para maiores de 18 anos.';
    if (!genero) e.genero = 'Escolha uma opção.';
    if (!ehMotorista && interesse.length === 0) e.interesse = 'Escolha pelo menos uma opção.';
    if (!aceitouTermos) e.termos = 'É preciso aceitar os termos para continuar.';
    setErros(e);
    return Object.keys(e).length === 0 ? iso : null;
  }

  async function cadastrar() {
    setMensagem(null);
    const iso = validar();
    if (!iso) return;
    setEnviando(true);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
      password: senha,
      options: {
        data: {
          tipo,
          nome_exibicao: nome.trim(),
          data_nascimento: iso,
          genero,
          interesse: ehMotorista ? [] : interesse,
        },
      },
    });
    setEnviando(false);
    if (error) {
      setMensagem({ texto: `Não foi possível cadastrar: ${error.message}`, tipo: 'erro' });
      return;
    }
    if (!data.session) {
      setMensagem({
        texto: 'Conta criada! Enviamos um link de confirmação para o seu e-mail.',
        tipo: 'sucesso',
      });
    }
  }

  function alternarInteresse(g: Genero) {
    setInteresse((atual) => (atual.includes(g) ? atual.filter((x) => x !== g) : [...atual, g]));
  }

  return (
    <Tela>
      <Titulo>Criar conta</Titulo>
      <Opcoes rotulo="Tipo de conta" opcoes={opcoesTipo} valor={tipo} aoMudar={setTipo} />
      <Campo rotulo="Nome de exibição" value={nome} onChangeText={setNome} erro={erros.nome} />
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
        erro={erros.email}
      />
      <Campo
        rotulo="Senha"
        value={senha}
        onChangeText={setSenha}
        secureTextEntry
        autoComplete="new-password"
        erro={erros.senha}
      />
      <Campo
        rotulo="Data de nascimento"
        placeholder="DD/MM/AAAA"
        value={nascimento}
        onChangeText={(t) => setNascimento(mascararData(t))}
        keyboardType="number-pad"
        erro={erros.nascimento}
      />
      <Opcoes rotulo="Eu sou" opcoes={opcoesGenero} valor={genero} aoMudar={setGenero} />
      {erros.genero ? <Texto style={{ color: '#FF5470', fontSize: 13 }}>{erros.genero}</Texto> : null}
      {!ehMotorista ? (
        <>
          <Opcoes rotulo="Tenho interesse em" opcoes={opcoesGenero} valor={interesse} aoMudar={alternarInteresse} />
          {erros.interesse ? <Texto style={{ color: '#FF5470', fontSize: 13 }}>{erros.interesse}</Texto> : null}
        </>
      ) : null}
      <Confirmacao marcado={aceitouTermos} aoMudar={setAceitouTermos}>
        Declaro ter 18 anos ou mais e aceito os Termos de Uso e a Política de Privacidade (LGPD).
      </Confirmacao>
      {erros.termos ? <Texto style={{ color: '#FF5470', fontSize: 13 }}>{erros.termos}</Texto> : null}
      {mensagem ? <Aviso texto={mensagem.texto} tipo={mensagem.tipo} /> : null}
      <Botao titulo="Cadastrar" onPress={cadastrar} carregando={enviando} />
      <Texto fraco style={{ textAlign: 'center' }} onPress={() => router.replace('/entrar')}>
        Já tem conta? Entrar
      </Texto>
    </Tela>
  );
}
