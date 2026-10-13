import { EmBreve } from '@/components/em-breve';

export default function Mensagens() {
  return (
    <EmBreve
      titulo="Mensagens"
      itens={[
        'Chat privado em tempo real com envio de fotos',
        'Botão "Marcar encontro" com data, hora e local',
        'Oferta de corrida automática para o encontro aceito',
      ]}
    />
  );
}
