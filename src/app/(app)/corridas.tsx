import { router } from 'expo-router';

import { EmBreve } from '@/components/em-breve';
import { Aviso, Botao, Tela, Titulo } from '@/components/ui';
import { useSessao } from '@/lib/sessao';

export default function Corridas() {
  const { perfil } = useSessao();

  if (perfil?.tipo === 'motorista') {
    return (
      <Tela>
        <Titulo>Painel do motorista</Titulo>
        <Aviso
          tipo="info"
          texto="Para receber corridas, complete seu cadastro (CNH, veículo e termo de sigilo). Após aprovação você poderá ficar online."
        />
        <Botao titulo="Completar cadastro de motorista" onPress={() => router.push('/motorista')} />
      </Tela>
    );
  }

  return (
    <EmBreve
      titulo="Corridas"
      itens={[
        'Corrida imediata, agendada ou ida e volta',
        'Categorias Econômico, Conforto e Executivo',
        'Pagamento por Pix ou cartão dentro do app',
        'Acompanhar o motorista no mapa e compartilhar a viagem',
      ]}
    />
  );
}
