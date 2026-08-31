import { supabase } from './supabase';

export const BUCKETS = Object.freeze({
  PERFIL: 'foto_perfil_user',
  COMUNIDADES: 'perfil_comunidades',
  POSTS: 'midias_posts',
  MENSAGENS: 'midias_mensagens',
  ROTINAS: 'imgs_rotinas',
  DOCUMENTOS_CONTEUDOS: 'documentos_conteudos',
  MIDIAS_CONTEUDOS: 'midias_conteudos',
});

export const isStorageUrl = (valor) => {
  if (!valor) return false;
  const texto = String(valor);
  return texto.startsWith('http://') || texto.startsWith('https://');
};

export const isDataUri = (valor) => {
  if (!valor) return false;
  return String(valor).startsWith('data:');
};

export const limparBase64 = (valor) => {
  if (!valor) return null;
  const texto = String(valor);
  if (texto.startsWith('data:')) {
    return texto.split(',')[1] || null;
  }
  return texto.replace(/\s/g, '').replace(/\\/g, '');
};

export const normalizarImagem = (valor) => {
  if (!valor) return null;
  const texto = String(valor);
  if (texto.startsWith('data:') || texto.startsWith('http://') || texto.startsWith('https://')) {
    return { uri: texto };
  }
  return { uri: `data:image/jpeg;base64,${texto}` };
};

const base64ParaUint8Array = (base64) => {
  const limpo = limparBase64(base64);
  if (!limpo) throw new Error('Imagem inválida.');

  const byteCharacters = atob(limpo);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i += 1) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return byteArray;
};

const extensaoPorMime = (mimeType = 'image/jpeg') => {
  const mime = String(mimeType).toLowerCase();
  if (mime.includes('png')) return 'png';
  if (mime.includes('webp')) return 'webp';
  return 'jpg';
};

export const obterUrlPublica = (bucket, caminho) => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(caminho);
  return data?.publicUrl || null;
};

export const uploadImagemBase64 = async ({
  bucket,
  pasta,
  base64,
  mimeType = 'image/jpeg',
  nomeBase = 'imagem',
  upsert = false,
}) => {
  if (!base64) return null;

  const extensao = extensaoPorMime(mimeType);
  const sufixo = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const nomeArquivo = `${nomeBase}-${sufixo}.${extensao}`;
  const caminho = pasta ? `${pasta}/${nomeArquivo}` : nomeArquivo;
  const bytes = base64ParaUint8Array(base64);

  const { error } = await supabase.storage
    .from(bucket)
    .upload(caminho, bytes.buffer, {
      contentType: mimeType,
      upsert,
      cacheControl: '31536000',
    });

  if (error) throw error;

  const publicUrl = obterUrlPublica(bucket, caminho);
  if (!publicUrl) {
    throw new Error('Não foi possível obter a URL da imagem armazenada.');
  }

  return {
    bucket,
    caminho,
    publicUrl,
  };
};

export const removerImagemStorage = async (referencia, bucketEsperado = null) => {
  if (!referencia) return true;

  const texto = String(referencia);

  if (texto.startsWith('data:')) return true;

  let bucket = bucketEsperado;
  let caminho = null;

  if (texto.startsWith('http://') || texto.startsWith('https://')) {
    const marcador = '/storage/v1/object/public/';
    const indice = texto.indexOf(marcador);
    if (indice !== -1) {
      const restante = texto.slice(indice + marcador.length);
      const partes = restante.split('/');
      bucket = bucket || partes.shift();
      caminho = partes.join('/');
    }
  } else if (bucket) {
    caminho = texto;
  }

  if (!bucket || !caminho) return true;

  const { error } = await supabase.storage.from(bucket).remove([caminho]);
  if (error) {
    console.warn('Não foi possível remover a imagem do Storage:', error.message || error);
    return false;
  }

  return true;
};

export const caminhoStorageFromPublicUrl = (url, bucket) => {
  if (!url || !bucket) return null;
  const marcador = `/storage/v1/object/public/${bucket}/`;
  const texto = String(url);
  const indice = texto.indexOf(marcador);
  if (indice === -1) return null;
  return texto.slice(indice + marcador.length);
};
