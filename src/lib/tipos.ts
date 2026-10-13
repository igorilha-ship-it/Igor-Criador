export type TipoConta = 'usuario' | 'anunciante' | 'motorista' | 'admin';
export type StatusAnalise = 'pendente' | 'aprovado' | 'rejeitado';
export type Genero = 'mulher' | 'homem' | 'nao_binario' | 'outro';
export type CategoriaVeiculo = 'economico' | 'conforto' | 'executivo';

export type Perfil = {
  id: string;
  nome_exibicao: string;
  data_nascimento: string;
  genero: Genero;
  interesse: Genero[];
  bio: string | null;
  tipo: TipoConta;
  status_verificacao: StatusAnalise;
  cidade: string;
  bairro: string | null;
};

export type Foto = {
  id: string;
  perfil_id: string;
  caminho: string;
  ordem: number;
};

export const NomesGenero: Record<Genero, string> = {
  mulher: 'Mulher',
  homem: 'Homem',
  nao_binario: 'Não binário',
  outro: 'Outro',
};

export const NomesCategoria: Record<CategoriaVeiculo, string> = {
  economico: 'Econômico',
  conforto: 'Conforto',
  executivo: 'Executivo',
};
