import { DarkTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { Cores } from '@/constants/theme';
import { ProvedorSessao, useSessao } from '@/lib/sessao';

SplashScreen.preventAutoHideAsync();

const tema = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    background: Cores.fundo,
    card: Cores.superficie,
    primary: Cores.primaria,
    text: Cores.texto,
    border: Cores.borda,
  },
};

function Navegacao() {
  const { sessao, carregando } = useSessao();

  useEffect(() => {
    if (!carregando) SplashScreen.hideAsync();
  }, [carregando]);

  if (carregando) return null;

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Protected guard={!sessao}>
        <Stack.Screen name="(publico)" />
      </Stack.Protected>
      <Stack.Protected guard={!!sessao}>
        <Stack.Screen name="(app)" />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider value={tema}>
      <ProvedorSessao>
        <StatusBar style="light" />
        <Navegacao />
      </ProvedorSessao>
    </ThemeProvider>
  );
}
