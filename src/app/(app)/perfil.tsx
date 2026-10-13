import { Image } from 'expo-image';
import { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Aviso, Botao, Campo, Cartao, Tela, Texto, Titulo } from '@/components/ui';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { enviarImagem, escolherImagem, linksAssinados } from '@/lib/arquivos';
import { calcularIdade } from '@/lib/idade';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';
import type { Foto } from '@/lib/tipos';

const MAXIMO_FOTOS = 6;

const NomesStatus = {
  pendente: 'Verificação pendente',
  aprovado: 'Perfil verificado ✓',
  rejeitado: 'Verificação recusada',
};

export default function Perfil() {
  const { perfil, recarregarPerfil, sair } = useSessao();
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [links, setLinks] = useState<Record<string, string>>({});
  const [bio, setBio] = useState(perfil?.bio ?? '');
  const [bairro, setBairro] = useState(perfil?.bairro ?? '');
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [mensagem, setMensagem] = useState<{ texto: string; tipo: 'erro' | 'sucesso' } | null>(null);

  const carregarFotos = useCallback(async () => {
    if (!perfil) return;
    const { data } = await supabase
      .from('fotos')
      .select('*')
      .eq('perfil_id', perfil.id)
      .order('ordem');
    const lista = data ?? [];
    setFotos(lista);
    setLinks(await linksAssinados('fotos', lista.map((f) => f.caminho)));
  }, [perfil]);

  useEffect(() => {
    carregarFotos();
  }, [carregarFotos]);

  if (!perfil) return null;
  const ehMotorista = perfil.tipo === 'motorista';

  async function adicionarFoto() {
    if (!perfil) return;
    setMensagem(null);
    const imagem = await escolherImagem();
    if (!imagem) return;
    setEnviandoFoto(true);
    try {
      const caminho = await enviarImagem('fotos', perfil.id, imagem);
      const { error } = await supabase
        .from('fotos')
        .insert({ perfil_id: perfil.id, caminho, ordem: fotos.length });
      if (error) throw error;
      await carregarFotos();
    } catch (e) {
      setMensagem({ texto: `Erro ao enviar foto: ${(e as Error).message}`, tipo: 'erro' });
    } finally {
      setEnviandoFoto(false);
    }
  }

  async function removerFoto(foto: Foto) {
    await supabase.from('fotos').delete().eq('id', foto.id);
    await supabase.storage.from('fotos').remove([foto.caminho]);
    await carregarFotos();
  }

  async function salvar() {
    if (!perfil) return;
    setSalvando(true);
    const { error } = await supabase
      .from('perfis')
      .update({ bio: bio.trim() || null, bairro: bairro.trim() || null })
      .eq('id', perfil.id);
    setSalvando(false);
    if (error) {
      setMensagem({ texto: `Erro ao salvar: ${error.message}`, tipo: 'erro' });
      return;
    }
    await recarregarPerfil();
    setMensagem({ texto: 'Perfil atualizado.', tipo: 'sucesso' });
  }

  return (
    <Tela>
      <Titulo>
        {perfil.nome_exibicao}, {calcularIdade(perfil.data_nascimento)}
      </Titulo>
      <Texto fraco>
        {NomesStatus[perfil.status_verificacao]} · {perfil.cidade}
      </Texto>

      {!ehMotorista ? (
        <Cartao>
          <Texto style={{ fontWeight: '700' }}>
            Fotos ({fotos.length}/{MAXIMO_FOTOS})
          </Texto>
          <View style={estilos.grade}>
            {fotos.map((f) => (
              <Pressable
                key={f.id}
                onLongPress={() => removerFoto(f)}
                accessibilityHint="Toque e segure para remover"
                style={estilos.foto}>
                {links[f.caminho] ? (
                  <Image source={{ uri: links[f.caminho] }} style={StyleSheet.absoluteFill} contentFit="cover" />
                ) : null}
              </Pressable>
            ))}
            {fotos.length < MAXIMO_FOTOS ? (
              <Pressable
                onPress={adicionarFoto}
                disabled={enviandoFoto}
                accessibilityRole="button"
                accessibilityLabel="Adicionar foto"
                style={[estilos.foto, estilos.adicionar]}>
                <Text style={estilos.mais}>{enviandoFoto ? '…' : '+'}</Text>
              </Pressable>
            ) : null}
          </View>
          <Texto fraco style={{ fontSize: 12 }}>
            Toque e segure uma foto para removê-la. Fotos são privadas e visíveis só para usuários logados.
          </Texto>
        </Cartao>
      ) : null}

      {!ehMotorista ? (
        <Campo
          rotulo="Sobre mim"
          value={bio}
          onChangeText={setBio}
          multiline
          maxLength={500}
          style={{ minHeight: 90, textAlignVertical: 'top' }}
        />
      ) : null}
      <Campo rotulo="Bairro" value={bairro} onChangeText={setBairro} placeholder="Ex.: Copacabana" />
      {mensagem ? <Aviso texto={mensagem.texto} tipo={mensagem.tipo} /> : null}
      <Botao titulo="Salvar" onPress={salvar} carregando={salvando} />
      <Botao titulo="Sair da conta" variante="perigo" onPress={sair} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  grade: { flexDirection: 'row', flexWrap: 'wrap', gap: Espaco.sm },
  foto: {
    width: '31%',
    aspectRatio: 3 / 4,
    borderRadius: Raio.md,
    overflow: 'hidden',
    backgroundColor: Cores.superficieAlta,
  },
  adicionar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Cores.primaria,
  },
  mais: { color: Cores.primaria, fontSize: 36, fontWeight: '300' },
});
