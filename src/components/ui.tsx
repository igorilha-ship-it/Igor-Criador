import type { ReactNode } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type TextInputProps,
  type TextProps,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Cores, Espaco, LarguraMaxima, Raio } from '@/constants/theme';

export function Tela({ children, rolar = true }: { children: ReactNode; rolar?: boolean }) {
  const conteudo = <View style={estilos.conteudo}>{children}</View>;
  return (
    <SafeAreaView style={estilos.tela} edges={['top', 'left', 'right']}>
      {rolar ? (
        <ScrollView contentContainerStyle={estilos.rolagem} keyboardShouldPersistTaps="handled">
          {conteudo}
        </ScrollView>
      ) : (
        conteudo
      )}
    </SafeAreaView>
  );
}

export function Titulo({ style, ...props }: TextProps) {
  return <Text style={[estilos.titulo, style]} {...props} />;
}

export function Texto({ style, fraco, ...props }: TextProps & { fraco?: boolean }) {
  return <Text style={[estilos.texto, fraco && estilos.textoFraco, style]} {...props} />;
}

export function Botao({
  titulo,
  onPress,
  carregando,
  desativado,
  variante = 'primario',
}: {
  titulo: string;
  onPress: () => void;
  carregando?: boolean;
  desativado?: boolean;
  variante?: 'primario' | 'secundario' | 'perigo';
}) {
  const inativo = desativado || carregando;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={inativo}
      style={({ pressed }) => [
        estilos.botao,
        variante === 'secundario' && estilos.botaoSecundario,
        variante === 'perigo' && estilos.botaoPerigo,
        (pressed || inativo) && { opacity: 0.6 },
      ]}>
      {carregando ? (
        <ActivityIndicator color={Cores.texto} />
      ) : (
        <Text style={estilos.botaoTexto}>{titulo}</Text>
      )}
    </Pressable>
  );
}

export function Campo({ rotulo, erro, ...props }: TextInputProps & { rotulo: string; erro?: string }) {
  return (
    <View style={{ gap: Espaco.xs }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <TextInput
        placeholderTextColor={Cores.textoSecundario}
        style={[estilos.campo, erro && { borderColor: Cores.erro }]}
        {...props}
      />
      {erro ? <Text style={estilos.erro}>{erro}</Text> : null}
    </View>
  );
}

export function Opcoes<T extends string>({
  rotulo,
  opcoes,
  valor,
  aoMudar,
}: {
  rotulo: string;
  opcoes: { valor: T; nome: string }[];
  valor: T | T[] | null;
  aoMudar: (v: T) => void;
}) {
  const selecionado = (v: T) => (Array.isArray(valor) ? valor.includes(v) : valor === v);
  return (
    <View style={{ gap: Espaco.xs }}>
      <Text style={estilos.rotulo}>{rotulo}</Text>
      <View style={estilos.opcoes}>
        {opcoes.map((o) => (
          <Pressable
            key={o.valor}
            accessibilityRole="button"
            accessibilityState={{ selected: selecionado(o.valor) }}
            onPress={() => aoMudar(o.valor)}
            style={[estilos.opcao, selecionado(o.valor) && estilos.opcaoAtiva]}>
            <Text style={estilos.opcaoTexto}>{o.nome}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function Confirmacao({
  marcado,
  aoMudar,
  children,
}: {
  marcado: boolean;
  aoMudar: (v: boolean) => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: marcado }}
      onPress={() => aoMudar(!marcado)}
      style={estilos.confirmacao}>
      <View style={[estilos.caixa, marcado && estilos.caixaMarcada]}>
        {marcado ? <Text style={estilos.botaoTexto}>✓</Text> : null}
      </View>
      <Text style={[estilos.texto, { flex: 1 }]}>{children}</Text>
    </Pressable>
  );
}

export function Cartao({ children }: { children: ReactNode }) {
  return <View style={estilos.cartao}>{children}</View>;
}

export function Aviso({ texto, tipo = 'erro' }: { texto: string; tipo?: 'erro' | 'sucesso' | 'info' }) {
  const cor = tipo === 'erro' ? Cores.erro : tipo === 'sucesso' ? Cores.sucesso : Cores.secundaria;
  return (
    <View style={[estilos.aviso, { borderColor: cor }]}>
      <Text style={estilos.texto}>{texto}</Text>
    </View>
  );
}

const estilos = StyleSheet.create({
  tela: { flex: 1, backgroundColor: Cores.fundo },
  rolagem: { flexGrow: 1 },
  conteudo: {
    flex: 1,
    width: '100%',
    maxWidth: LarguraMaxima,
    alignSelf: 'center',
    padding: Espaco.md,
    gap: Espaco.md,
  },
  titulo: { color: Cores.texto, fontSize: 28, fontWeight: '800' },
  texto: { color: Cores.texto, fontSize: 15, lineHeight: 22 },
  textoFraco: { color: Cores.textoSecundario },
  rotulo: { color: Cores.textoSecundario, fontSize: 13, fontWeight: '600' },
  campo: {
    backgroundColor: Cores.superficie,
    borderColor: Cores.borda,
    borderWidth: 1,
    borderRadius: Raio.md,
    color: Cores.texto,
    fontSize: 16,
    paddingHorizontal: Espaco.md,
    paddingVertical: 12,
  },
  erro: { color: Cores.erro, fontSize: 13 },
  botao: {
    backgroundColor: Cores.primaria,
    borderRadius: Raio.total,
    paddingVertical: 14,
    alignItems: 'center',
  },
  botaoSecundario: { backgroundColor: Cores.secundaria },
  botaoPerigo: { backgroundColor: 'transparent', borderWidth: 1, borderColor: Cores.erro },
  botaoTexto: { color: Cores.texto, fontSize: 16, fontWeight: '700' },
  opcoes: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  opcao: {
    borderWidth: 1,
    borderColor: Cores.borda,
    backgroundColor: Cores.superficie,
    borderRadius: Raio.total,
    paddingHorizontal: Espaco.md,
    paddingVertical: Espaco.sm,
  },
  opcaoAtiva: { backgroundColor: Cores.primaria, borderColor: Cores.primaria },
  opcaoTexto: { color: Cores.texto, fontWeight: '600' },
  confirmacao: { flexDirection: 'row', gap: Espaco.sm, alignItems: 'flex-start' },
  caixa: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Cores.primaria,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 1,
  },
  caixaMarcada: { backgroundColor: Cores.primaria },
  cartao: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    padding: Espaco.md,
    gap: Espaco.sm,
    borderWidth: 1,
    borderColor: Cores.borda,
  },
  aviso: {
    borderWidth: 1,
    borderRadius: Raio.md,
    padding: Espaco.md,
    backgroundColor: Cores.superficie,
  },
});
