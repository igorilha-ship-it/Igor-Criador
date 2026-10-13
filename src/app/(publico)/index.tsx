import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';

import { Aviso, Botao, Tela, Texto } from '@/components/ui';
import { Cores, Espaco } from '@/constants/theme';
import { supabaseConfigurado } from '@/lib/supabase';

export default function Boasvindas() {
  return (
    <Tela>
      <View style={estilos.topo}>
        <Text style={estilos.marca}>
          Encontro <Text style={{ color: Cores.primaria }}>RIO</Text>
        </Text>
        <Texto fraco style={estilos.slogan}>
          Conheça pessoas, marque o encontro e chegue lá com motoristas parceiros sob sigilo.
        </Texto>
      </View>

      <View style={estilos.destaques}>
        <Texto>💘 Paquera e perfis verificados</Texto>
        <Texto>💬 Chat privado e agendamento de encontros</Texto>
        <Texto>🚗 Corridas imediatas, agendadas ou ida e volta</Texto>
        <Texto>🔒 Motoristas com termo de confidencialidade</Texto>
      </View>

      {!supabaseConfigurado ? (
        <Aviso texto="Servidor não configurado: preencha EXPO_PUBLIC_SUPABASE_URL e EXPO_PUBLIC_SUPABASE_ANON_KEY no arquivo .env (veja o README)." />
      ) : null}

      <View style={{ gap: Espaco.sm }}>
        <Botao titulo="Criar conta" onPress={() => router.push('/cadastro')} />
        <Botao titulo="Já tenho conta" variante="secundario" onPress={() => router.push('/entrar')} />
      </View>
      <Texto fraco style={{ textAlign: 'center', fontSize: 12 }}>
        Proibido para menores de 18 anos.
      </Texto>
    </Tela>
  );
}

const estilos = StyleSheet.create({
  topo: { marginTop: Espaco.xl * 2, gap: Espaco.sm, alignItems: 'center' },
  marca: { color: Cores.texto, fontSize: 44, fontWeight: '900', letterSpacing: -1 },
  slogan: { textAlign: 'center', fontSize: 17 },
  destaques: { gap: Espaco.sm, marginVertical: Espaco.lg },
});
