import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { Cores } from '@/constants/theme';
import { useSessao } from '@/lib/sessao';

function Icone({ simbolo }: { simbolo: string }) {
  return <Text style={{ fontSize: 20 }}>{simbolo}</Text>;
}

export default function LayoutApp() {
  const { perfil } = useSessao();
  const ehMotorista = perfil?.tipo === 'motorista';
  // Motoristas não acessam a rede social (sigilo dos passageiros).
  const social = ehMotorista ? null : undefined;

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: { backgroundColor: Cores.superficie, borderTopColor: Cores.borda },
        tabBarActiveTintColor: Cores.primaria,
        tabBarInactiveTintColor: Cores.textoSecundario,
      }}>
      <Tabs.Screen
        name="index"
        options={{ title: 'Descobrir', href: social, tabBarIcon: () => <Icone simbolo="💘" /> }}
      />
      <Tabs.Screen
        name="anunciantes"
        options={{ title: 'Anunciantes', href: social, tabBarIcon: () => <Icone simbolo="✨" /> }}
      />
      <Tabs.Screen
        name="mensagens"
        options={{ title: 'Mensagens', href: social, tabBarIcon: () => <Icone simbolo="💬" /> }}
      />
      <Tabs.Screen
        name="corridas"
        options={{ title: 'Corridas', tabBarIcon: () => <Icone simbolo="🚗" /> }}
      />
      <Tabs.Screen name="perfil" options={{ title: 'Perfil', tabBarIcon: () => <Icone simbolo="👤" /> }} />
      <Tabs.Screen name="motorista" options={{ href: null }} />
    </Tabs>
  );
}
