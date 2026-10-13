import { router, useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import { CartaoPerfil } from '@/components/cartao-perfil';
import { Aviso, Botao, Campo, Cartao, Opcoes, Tela, Texto, Titulo } from '@/components/ui';
import { Cores, Espaco, Raio } from '@/constants/theme';
import { linksAssinados } from '@/lib/arquivos';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';
import type { Perfil } from '@/lib/tipos';

type Filtros = { idadeMin: string; idadeMax: string; bairro: string };

const filtrosPadrao: Filtros = { idadeMin: '18', idadeMax: '99', bairro: '' };

const motivosDenuncia = [
  { valor: 'perfil_falso', nome: 'Perfil falso' },
  { valor: 'menor_de_idade', nome: 'Parece menor de idade' },
  { valor: 'fotos_improprias', nome: 'Fotos impróprias' },
  { valor: 'golpe', nome: 'Golpe ou cobrança' },
  { valor: 'outro', nome: 'Outro' },
];

export default function Descobrir() {
  const { perfil } = useSessao();
  const [fila, setFila] = useState<Perfil[]>([]);
  const [fotos, setFotos] = useState<Record<string, string[]>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState('');
  const [tenhoFoto, setTenhoFoto] = useState(true);
  const [filtros, setFiltros] = useState<Filtros>(filtrosPadrao);
  const [editandoFiltros, setEditandoFiltros] = useState(false);
  const [match, setMatch] = useState<Perfil | null>(null);
  const [denunciando, setDenunciando] = useState(false);
  const [motivo, setMotivo] = useState<string | null>(null);
  // Perfis já respondidos nesta sessão, para não voltarem antes de o banco confirmar.
  const respondidos = useRef(new Set<string>());

  const buscar = useCallback(
    async (f: Filtros, substituir: boolean) => {
      if (!perfil) return;
      setErro('');
      const { data, error } = await supabase.rpc('descobrir', {
        idade_min: Number(f.idadeMin) || 18,
        idade_max: Number(f.idadeMax) || 99,
        bairro_filtro: f.bairro.trim() || null,
        limite: 20,
      });
      if (error) {
        setErro(`Não foi possível carregar perfis: ${error.message}`);
        setCarregando(false);
        return;
      }
      const novos = (data as Perfil[]).filter((p) => !respondidos.current.has(p.id));
      if (novos.length === 0) {
        if (substituir) setFila([]);
        setCarregando(false);
        return;
      }
      const { data: listaFotos } = await supabase
        .from('fotos')
        .select('perfil_id, caminho')
        .in('perfil_id', novos.map((p) => p.id))
        .order('ordem');
      const links = await linksAssinados('fotos', (listaFotos ?? []).map((x) => x.caminho));
      const porPerfil: Record<string, string[]> = {};
      for (const x of listaFotos ?? []) {
        if (links[x.caminho]) (porPerfil[x.perfil_id] ??= []).push(links[x.caminho]);
      }
      setFotos((atual) => ({ ...atual, ...porPerfil }));
      setFila((atual) => {
        const base = substituir ? [] : atual;
        const ids = new Set(base.map((p) => p.id));
        return [...base, ...novos.filter((p) => !ids.has(p.id))];
      });
      setCarregando(false);
    },
    [perfil],
  );

  useFocusEffect(
    useCallback(() => {
      if (!perfil) return;
      supabase
        .from('fotos')
        .select('id', { count: 'exact', head: true })
        .eq('perfil_id', perfil.id)
        .then(({ count }) => setTenhoFoto((count ?? 0) > 0));
    }, [perfil]),
  );

  useFocusEffect(
    useCallback(() => {
      buscar(filtros, true);
      // Recarrega ao voltar para a aba; mudanças de filtro chamam `aplicarFiltros`.
    }, [buscar]),
  );

  const atual = fila[0];

  function avancar() {
    const resto = fila.slice(1);
    setFila(resto);
    if (resto.length < 3) buscar(filtros, false);
  }

  async function passar() {
    if (!atual || !perfil) return;
    respondidos.current.add(atual.id);
    avancar();
    await supabase.from('descartes').insert({ de_id: perfil.id, para_id: atual.id });
  }

  async function curtir() {
    if (!atual || !perfil) return;
    const curtido = atual;
    respondidos.current.add(curtido.id);
    avancar();
    const { error } = await supabase.from('curtidas').insert({ de_id: perfil.id, para_id: curtido.id });
    if (error) return;
    const { data } = await supabase
      .from('conversas')
      .select('id')
      .or(
        `and(participante_a.eq.${perfil.id},participante_b.eq.${curtido.id}),` +
          `and(participante_a.eq.${curtido.id},participante_b.eq.${perfil.id})`,
      )
      .maybeSingle();
    if (data) setMatch(curtido);
  }

  async function bloquear() {
    if (!atual || !perfil) return;
    respondidos.current.add(atual.id);
    const alvo = atual.id;
    avancar();
    await supabase.from('bloqueios').insert({ bloqueador_id: perfil.id, bloqueado_id: alvo });
  }

  async function enviarDenuncia() {
    if (!atual || !perfil || !motivo) return;
    const alvo = atual.id;
    respondidos.current.add(alvo);
    setDenunciando(false);
    setMotivo(null);
    avancar();
    await supabase.from('denuncias').insert({ denunciante_id: perfil.id, denunciado_id: alvo, motivo });
    await supabase.from('descartes').insert({ de_id: perfil.id, para_id: alvo });
  }

  function aplicarFiltros() {
    setEditandoFiltros(false);
    setCarregando(true);
    buscar(filtros, true);
  }

  return (
    <Tela rolar={false}>
      <View style={estilos.cabecalho}>
        <Titulo>Descobrir</Titulo>
        <Pressable
          accessibilityRole="button"
          onPress={() => setEditandoFiltros((v) => !v)}
          style={estilos.botaoFiltro}>
          <Text style={estilos.textoFiltro}>⚙️ Filtros</Text>
        </Pressable>
      </View>

      {!tenhoFoto ? (
        <Aviso
          tipo="info"
          texto="Adicione pelo menos uma foto no seu perfil para aparecer para outras pessoas."
        />
      ) : null}

      {editandoFiltros ? (
        <Cartao>
          <View style={{ flexDirection: 'row', gap: Espaco.sm }}>
            <View style={{ flex: 1 }}>
              <Campo
                rotulo="Idade mínima"
                value={filtros.idadeMin}
                keyboardType="number-pad"
                onChangeText={(t) => setFiltros({ ...filtros, idadeMin: t.replace(/\D/g, '').slice(0, 2) })}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Campo
                rotulo="Idade máxima"
                value={filtros.idadeMax}
                keyboardType="number-pad"
                onChangeText={(t) => setFiltros({ ...filtros, idadeMax: t.replace(/\D/g, '').slice(0, 2) })}
              />
            </View>
          </View>
          <Campo
            rotulo="Bairro (opcional)"
            value={filtros.bairro}
            placeholder="Ex.: Botafogo"
            onChangeText={(t) => setFiltros({ ...filtros, bairro: t })}
          />
          <Botao titulo="Aplicar filtros" onPress={aplicarFiltros} />
        </Cartao>
      ) : null}

      {erro ? <Aviso texto={erro} /> : null}

      {carregando ? (
        <View style={estilos.centro}>
          <ActivityIndicator color={Cores.primaria} size="large" />
        </View>
      ) : atual ? (
        <>
          <CartaoPerfil key={atual.id} perfil={atual} fotos={fotos[atual.id] ?? []} />
          <View style={estilos.acoes}>
            <BotaoRedondo simbolo="✕" rotulo="Passar" cor={Cores.textoSecundario} onPress={passar} />
            <BotaoRedondo simbolo="⚑" rotulo="Denunciar ou bloquear" cor={Cores.aviso} pequeno onPress={() => setDenunciando(true)} />
            <BotaoRedondo simbolo="♥" rotulo="Curtir" cor={Cores.primaria} onPress={curtir} />
          </View>
        </>
      ) : (
        <View style={estilos.centro}>
          <Texto style={{ fontSize: 40 }}>🌙</Texto>
          <Texto style={{ textAlign: 'center' }}>Ninguém novo por aqui agora.</Texto>
          <Texto fraco style={{ textAlign: 'center' }}>
            Tente ampliar os filtros ou volte mais tarde.
          </Texto>
        </View>
      )}

      <Modal visible={!!match} transparent animationType="fade" onRequestClose={() => setMatch(null)}>
        <View style={estilos.fundoModal}>
          <View style={estilos.modal}>
            <Text style={estilos.tituloMatch}>Deu match! 💘</Text>
            <Texto style={{ textAlign: 'center' }}>
              Você e {match?.nome_exibicao} curtiram um ao outro.
            </Texto>
            <Botao
              titulo="Enviar mensagem"
              onPress={() => {
                setMatch(null);
                router.push('/mensagens');
              }}
            />
            <Botao titulo="Continuar descobrindo" variante="secundario" onPress={() => setMatch(null)} />
          </View>
        </View>
      </Modal>

      <Modal visible={denunciando} transparent animationType="fade" onRequestClose={() => setDenunciando(false)}>
        <View style={estilos.fundoModal}>
          <View style={estilos.modal}>
            <Titulo style={{ fontSize: 22 }}>Denunciar {atual?.nome_exibicao}</Titulo>
            <Opcoes rotulo="Motivo" opcoes={motivosDenuncia} valor={motivo} aoMudar={setMotivo} />
            <Botao titulo="Enviar denúncia" onPress={enviarDenuncia} desativado={!motivo} />
            <Botao
              titulo="Só bloquear"
              variante="perigo"
              onPress={() => {
                setDenunciando(false);
                bloquear();
              }}
            />
            <Texto fraco style={{ textAlign: 'center' }} onPress={() => setDenunciando(false)}>
              Cancelar
            </Texto>
          </View>
        </View>
      </Modal>
    </Tela>
  );
}

function BotaoRedondo({
  simbolo,
  rotulo,
  cor,
  pequeno,
  onPress,
}: {
  simbolo: string;
  rotulo: string;
  cor: string;
  pequeno?: boolean;
  onPress: () => void;
}) {
  const tamanho = pequeno ? 48 : 64;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={rotulo}
      onPress={onPress}
      style={({ pressed }) => [
        estilos.redondo,
        { width: tamanho, height: tamanho, borderColor: cor },
        pressed && { transform: [{ scale: 0.92 }] },
      ]}>
      <Text style={{ color: cor, fontSize: pequeno ? 20 : 28, fontWeight: '700' }}>{simbolo}</Text>
    </Pressable>
  );
}

const estilos = StyleSheet.create({
  cabecalho: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  botaoFiltro: {
    backgroundColor: Cores.superficie,
    borderColor: Cores.borda,
    borderWidth: 1,
    borderRadius: Raio.total,
    paddingHorizontal: Espaco.md,
    paddingVertical: Espaco.sm,
  },
  textoFiltro: { color: Cores.texto, fontWeight: '600' },
  centro: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: Espaco.sm },
  acoes: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Espaco.lg,
    paddingBottom: Espaco.sm,
  },
  redondo: {
    borderRadius: Raio.total,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Cores.superficie,
  },
  fundoModal: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    padding: Espaco.md,
  },
  modal: {
    backgroundColor: Cores.superficie,
    borderRadius: Raio.lg,
    padding: Espaco.lg,
    gap: Espaco.md,
    width: '100%',
    maxWidth: 420,
    alignSelf: 'center',
  },
  tituloMatch: {
    color: Cores.primaria,
    fontSize: 34,
    fontWeight: '900',
    textAlign: 'center',
  },
});
