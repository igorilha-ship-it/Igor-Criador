import { EmBreve } from '@/components/em-breve';

export default function Descobrir() {
  return (
    <EmBreve
      titulo="Descobrir"
      itens={[
        'Cartões de perfis próximos com fotos',
        'Curtir / passar; match quando a curtida for recíproca',
        'Filtros por gênero, idade e bairro',
      ]}
    />
  );
}
