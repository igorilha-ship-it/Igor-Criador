import { router } from 'expo-router';
import { useState } from 'react';

import { Aviso, Botao, Campo, Tela, Texto, Titulo } from '@/components/ui';
import { supabase } from '@/lib/supabase';

export default function Entrar() {
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function entrar() {
    setErro('');
    setEnviando(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha });
    setEnviando(false);
    if (error) setErro('E-mail ou senha incorretos, ou e-mail ainda não confirmado.');
  }

  return (
    <Tela>
      <Titulo>Entrar</Titulo>
      <Campo
        rotulo="E-mail"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        autoComplete="email"
      />
      <Campo rotulo="Senha" value={senha} onChangeText={setSenha} secureTextEntry autoComplete="password" />
      {erro ? <Aviso texto={erro} /> : null}
      <Botao titulo="Entrar" onPress={entrar} carregando={enviando} />
      <Texto fraco style={{ textAlign: 'center' }} onPress={() => router.replace('/cadastro')}>
        Não tem conta? Cadastre-se
      </Texto>
    </Tela>
  );
}
