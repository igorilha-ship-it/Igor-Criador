import * as ImagePicker from 'expo-image-picker';

import { supabase } from './supabase';

export type Bucket = 'fotos' | 'documentos';

/** Abre a galeria e devolve a imagem escolhida, ou null se o usuário cancelar. */
export async function escolherImagem(): Promise<ImagePicker.ImagePickerAsset | null> {
  const resultado = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    allowsEditing: true,
    quality: 0.8,
  });
  return resultado.canceled ? null : resultado.assets[0];
}

/** Envia a imagem para a pasta do usuário e devolve o caminho salvo. */
export async function enviarImagem(
  bucket: Bucket,
  usuarioId: string,
  imagem: ImagePicker.ImagePickerAsset,
): Promise<string> {
  const tipo = imagem.mimeType ?? 'image/jpeg';
  const extensao = tipo.split('/')[1] ?? 'jpg';
  const caminho = `${usuarioId}/${Date.now()}.${extensao}`;
  const conteudo = await (await fetch(imagem.uri)).arrayBuffer();
  const { error } = await supabase.storage
    .from(bucket)
    .upload(caminho, conteudo, { contentType: tipo });
  if (error) throw error;
  return caminho;
}

/** Gera links temporários (1 hora) para exibir arquivos privados. */
export async function linksAssinados(bucket: Bucket, caminhos: string[]) {
  if (caminhos.length === 0) return {};
  const { data, error } = await supabase.storage.from(bucket).createSignedUrls(caminhos, 3600);
  if (error) throw error;
  return Object.fromEntries(data.map((d) => [d.path, d.signedUrl]));
}
