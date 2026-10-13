import { Image } from 'expo-image';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Cores, Espaco, Raio } from '@/constants/theme';
import { calcularIdade } from '@/lib/idade';
import type { Perfil } from '@/lib/tipos';

/** Cartão da tela Descobrir: toque na esquerda/direita da foto para trocar de foto. */
export function CartaoPerfil({ perfil, fotos }: { perfil: Perfil; fotos: string[] }) {
  const [indice, setIndice] = useState(0);
  const foto = fotos[Math.min(indice, fotos.length - 1)];

  return (
    <View style={estilos.cartao}>
      {foto ? <Image source={{ uri: foto }} style={StyleSheet.absoluteFill} contentFit="cover" /> : null}

      <View style={estilos.toques}>
        <Pressable
          style={{ flex: 1 }}
          accessibilityLabel="Foto anterior"
          onPress={() => setIndice((i) => Math.max(0, i - 1))}
        />
        <Pressable
          style={{ flex: 1 }}
          accessibilityLabel="Próxima foto"
          onPress={() => setIndice((i) => Math.min(fotos.length - 1, i + 1))}
        />
      </View>

      {fotos.length > 1 ? (
        <View style={estilos.indicadores} pointerEvents="none">
          {fotos.map((f, i) => (
            <View key={f} style={[estilos.indicador, i === indice && estilos.indicadorAtivo]} />
          ))}
        </View>
      ) : null}

      <View style={estilos.rodape} pointerEvents="none">
        <Text style={estilos.nome}>
          {perfil.nome_exibicao}, {calcularIdade(perfil.data_nascimento)}
          {perfil.status_verificacao === 'aprovado' ? ' ✓' : ''}
        </Text>
        {perfil.bairro ? <Text style={estilos.bairro}>📍 {perfil.bairro}</Text> : null}
        {perfil.bio ? (
          <Text style={estilos.bio} numberOfLines={3}>
            {perfil.bio}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const estilos = StyleSheet.create({
  cartao: {
    flex: 1,
    minHeight: 420,
    borderRadius: Raio.lg,
    overflow: 'hidden',
    backgroundColor: Cores.superficieAlta,
    justifyContent: 'flex-end',
  },
  toques: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, flexDirection: 'row' },
  indicadores: {
    position: 'absolute',
    top: Espaco.sm,
    left: Espaco.sm,
    right: Espaco.sm,
    flexDirection: 'row',
    gap: Espaco.xs,
  },
  indicador: { flex: 1, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.35)' },
  indicadorAtivo: { backgroundColor: Cores.texto },
  rodape: {
    padding: Espaco.md,
    gap: Espaco.xs,
    backgroundColor: 'rgba(20,8,31,0.72)',
  },
  nome: { color: Cores.texto, fontSize: 26, fontWeight: '800' },
  bairro: { color: Cores.texto, fontSize: 15 },
  bio: { color: Cores.textoSecundario, fontSize: 15, lineHeight: 21 },
});
