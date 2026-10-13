import type { ImagePickerAsset } from 'expo-image-picker';
import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Aviso, Botao, Campo, Cartao, Confirmacao, Opcoes, Tela, Texto, Titulo } from '@/components/ui';
import { TextoTermoSigilo, VersaoTermoSigilo } from '@/constants/termo-sigilo';
import { Cores, Raio } from '@/constants/theme';
import { enviarImagem, escolherImagem } from '@/lib/arquivos';
import { dataBrParaIso, mascararData } from '@/lib/idade';
import { useSessao } from '@/lib/sessao';
import { supabase } from '@/lib/supabase';
import { NomesCategoria, type CategoriaVeiculo, type StatusAnalise } from '@/lib/tipos';

const opcoesCategoria = (Object.keys(NomesCategoria) as CategoriaVeiculo[]).map((c) => ({
  valor: c,
  nome: NomesCategoria[c],
}));

const anoMinimo = 2012;

export default function CadastroMotorista() {
  const { perfil } = useSessao();
  const [statusAtual, setStatusAtual] = useState<StatusAnalise | null | undefined>(undefined);
  const [cnh, setCnh] = useState('');
  const [validade, setValidade] = useState('');
  const [fotoCnh, setFotoCnh] = useState<ImagePickerAsset | null>(null);
  const [placa, setPlaca] = useState('');
  const [modelo, setModelo] = useState('');
  const [cor, setCor] = useState('');
  const [ano, setAno] = useState('');
  const [categoria, setCategoria] = useState<CategoriaVeiculo>('economico');
  const [assinatura, setAssinatura] = useState('');
  const [aceitou, setAceitou] = useState(false);
  const [erro, setErro] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!perfil) return;
    supabase
      .from('motoristas')
      .select('status')
      .eq('id', perfil.id)
      .maybeSingle()
      .then(({ data }) => setStatusAtual(data?.status ?? null));
  }, [perfil]);

  if (!perfil || statusAtual === undefined) return null;

  if (statusAtual) {
    return (
      <Tela>
        <Titulo>Cadastro de motorista</Titulo>
        <Aviso
          tipo={statusAtual === 'rejeitado' ? 'erro' : statusAtual === 'aprovado' ? 'sucesso' : 'info'}
          texto={
            statusAtual === 'pendente'
              ? 'Cadastro enviado! Nossa equipe está analisando seus documentos.'
              : statusAtual === 'aprovado'
                ? 'Cadastro aprovado. Você já pode ficar online na aba Corridas.'
                : 'Cadastro recusado. Entre em contato com o suporte.'
          }
        />
      </Tela>
    );
  }

  function validar() {
    const validadeIso = dataBrParaIso(validade);
    const anoNumero = Number(ano);
    if (!/^\d{11}$/.test(cnh)) return 'O número da CNH deve ter 11 dígitos.';
    if (!validadeIso || new Date(validadeIso) < new Date()) return 'CNH vencida ou data inválida.';
    if (!fotoCnh) return 'Envie uma foto da CNH.';
    if (!/^[A-Z]{3}\d[A-Z0-9]\d{2}$/.test(placa)) return 'Placa inválida (ex.: ABC1D23).';
    if (!modelo.trim() || !cor.trim()) return 'Informe modelo e cor do veículo.';
    if (!(anoNumero >= anoMinimo && anoNumero <= new Date().getFullYear() + 1))
      return `O veículo deve ser ano ${anoMinimo} ou mais novo.`;
    if (assinatura.trim().split(/\s+/).length < 2) return 'Digite seu nome completo para assinar o termo.';
    if (!aceitou) return 'É preciso aceitar o termo de confidencialidade.';
    return null;
  }

  async function enviar() {
    if (!perfil) return;
    const problema = validar();
    setErro(problema ?? '');
    if (problema || !fotoCnh) return;
    setEnviando(true);
    try {
      const cnhCaminho = await enviarImagem('documentos', perfil.id, fotoCnh);
      const { error: e1 } = await supabase.from('motoristas').insert({
        id: perfil.id,
        cnh_numero: cnh,
        cnh_validade: dataBrParaIso(validade),
        cnh_foto_caminho: cnhCaminho,
      });
      if (e1) throw e1;
      const { error: e2 } = await supabase.from('veiculos').insert({
        motorista_id: perfil.id,
        placa,
        modelo: modelo.trim(),
        cor: cor.trim(),
        ano: Number(ano),
        categoria,
      });
      if (e2) throw e2;
      const { error: e3 } = await supabase.from('termos_sigilo').insert({
        motorista_id: perfil.id,
        versao: VersaoTermoSigilo,
        texto: TextoTermoSigilo,
        nome_assinatura: assinatura.trim(),
      });
      if (e3) throw e3;
      setStatusAtual('pendente');
    } catch (e) {
      setErro(`Não foi possível enviar: ${(e as Error).message}`);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Tela>
      <Titulo>Cadastro de motorista</Titulo>

      <Cartao>
        <Texto style={{ fontWeight: '700' }}>Habilitação</Texto>
        <Campo rotulo="Número da CNH" value={cnh} onChangeText={(t) => setCnh(t.replace(/\D/g, '').slice(0, 11))} keyboardType="number-pad" />
        <Campo
          rotulo="Validade da CNH"
          placeholder="DD/MM/AAAA"
          value={validade}
          onChangeText={(t) => setValidade(mascararData(t))}
          keyboardType="number-pad"
        />
        <Botao
          titulo={fotoCnh ? 'Foto da CNH selecionada ✓' : 'Enviar foto da CNH'}
          variante="secundario"
          onPress={async () => setFotoCnh((await escolherImagem()) ?? fotoCnh)}
        />
        <Texto fraco style={{ fontSize: 12 }}>
          A CNH deve ter a observação “Exerce Atividade Remunerada” (EAR).
        </Texto>
      </Cartao>

      <Cartao>
        <Texto style={{ fontWeight: '700' }}>Veículo</Texto>
        <Campo
          rotulo="Placa"
          value={placa}
          onChangeText={(t) => setPlaca(t.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7))}
          autoCapitalize="characters"
        />
        <Campo rotulo="Modelo" value={modelo} onChangeText={setModelo} placeholder="Ex.: Toyota Corolla" />
        <Campo rotulo="Cor" value={cor} onChangeText={setCor} />
        <Campo rotulo="Ano" value={ano} onChangeText={(t) => setAno(t.replace(/\D/g, '').slice(0, 4))} keyboardType="number-pad" />
        <Opcoes rotulo="Categoria" opcoes={opcoesCategoria} valor={categoria} aoMudar={setCategoria} />
      </Cartao>

      <Cartao>
        <Texto style={{ fontWeight: '700' }}>Termo de confidencialidade</Texto>
        <ScrollView style={estilos.termo} nestedScrollEnabled>
          <Texto style={{ fontSize: 13 }}>{TextoTermoSigilo}</Texto>
        </ScrollView>
        <Campo rotulo="Nome completo (assinatura)" value={assinatura} onChangeText={setAssinatura} autoCapitalize="words" />
        <Confirmacao marcado={aceitou} aoMudar={setAceitou}>
          Li e aceito o Termo de Confidencialidade do Motorista Parceiro.
        </Confirmacao>
      </Cartao>

      {erro ? <Aviso texto={erro} /> : null}
      <Botao titulo="Enviar para análise" onPress={enviar} carregando={enviando} />
    </Tela>
  );
}

const estilos = StyleSheet.create({
  termo: {
    maxHeight: 220,
    backgroundColor: Cores.fundo,
    borderRadius: Raio.md,
    padding: 12,
  },
});
