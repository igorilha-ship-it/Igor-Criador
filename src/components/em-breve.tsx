import { Cartao, Tela, Texto, Titulo } from './ui';

export function EmBreve({ titulo, itens }: { titulo: string; itens: string[] }) {
  return (
    <Tela>
      <Titulo>{titulo}</Titulo>
      <Cartao>
        <Texto fraco>Em construção — próxima etapa do desenvolvimento:</Texto>
        {itens.map((i) => (
          <Texto key={i}>• {i}</Texto>
        ))}
      </Cartao>
    </Tela>
  );
}
