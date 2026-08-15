import React, { useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Modal,
  Share,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { Alert } from './popup';

const normalizarImagem = (valor) => {
  if (!valor) return null;
  if (String(valor).startsWith('data:') || String(valor).startsWith('http')) {
    return { uri: String(valor) };
  }
  return { uri: `data:image/jpeg;base64,${valor}` };
};

export default function PostCard({
  item,
  estilos,
  cores,
  navigation,
  idUsuario,
  onCurtir,
  onSalvar,
  onExcluirSuccess,
  variant = 'padrao',
}) {
  const isAdmin = variant === 'comunidade';
  const isSalvo = variant === 'salvos';
  const permiteAbrirPerfil = variant !== 'perfil';

  const idDoAutor =
    item.id_usuario_autor ||
    item.id_autor ||
    item.id_usuario ||
    item.usuario_id ||
    item.autor_id;

  const postEhMeu =
    Boolean(idUsuario) &&
    Boolean(idDoAutor) &&
    String(idDoAutor).trim() === String(idUsuario).trim();

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [modalDenunciaVisivel, setModalDenunciaVisivel] = useState(false);
  const [motivoDenuncia, setMotivoDenuncia] = useState('');
  const [isProcessando, setIsProcessando] = useState(false);

  const imagemPost = normalizarImagem(item.imagem_base64 || item.img_post);

  const abrirPost = () => {
    navigation.navigate('TelaPost', {
      id_post: item.id_post,
      id_usuario_logado: idUsuario,
      imagem_base64: item.imagem_base64 || null,
    });
  };

  const abrirPerfil = () => {
    if (!idDoAutor) return;
    navigation.navigate('TelaPerfil', {
      id_perfil: idDoAutor,
      id_usuario: idUsuario,
    });
  };

  const abrirComentarios = () => {
    navigation.navigate('TelaPost', {
      id_post: item.id_post,
      id_usuario_logado: idUsuario,
      imagem_base64: item.imagem_base64 || null,
      focarComentario: true,
    });
  };

  const compartilharPost = async () => {
    try {
      await Share.share({
        message: item.conteudo
          ? `${item.autor_nome || 'Orami'}: ${item.conteudo}`
          : 'Confira esta publicação no Orami.',
      });
    } catch (error) {
      if (error?.message) console.error('Erro ao compartilhar publicação:', error);
    }
  };

  const handleExcluirPost = () => {
    setMenuVisivel(false);
    Alert.alert(
      'Excluir publicação',
      'Tem certeza que deseja excluir esta publicação definitivamente?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('excluir_postagem_definitivo', {
                p_id_postagem: item.id_post,
                p_id_usuario: idUsuario,
              });
              if (error) throw error;
              onExcluirSuccess?.(item.id_post);
            } catch (error) {
              console.error('Erro ao excluir postagem:', error);
              Alert.alert('Erro', 'Não foi possível excluir a publicação.');
            }
          },
        },
      ]
    );
  };

  const handleEnviarDenuncia = async () => {
    if (!motivoDenuncia.trim()) {
      Alert.alert('Atenção', 'Por favor, descreva o motivo da denúncia.');
      return;
    }

    setIsProcessando(true);
    try {
      const { error } = await supabase.rpc('denunciar_postagem_com_motivo', {
        p_id_denunciante: idUsuario,
        p_id_postagem: item.id_post,
        p_id_autor: idDoAutor,
        p_descricao: motivoDenuncia,
        p_texto_motivo: 'Violação das regras',
      });
      if (error) throw error;

      Alert.alert('Denúncia enviada', 'Sua denúncia foi registrada e será analisada.');
      setModalDenunciaVisivel(false);
      setMotivoDenuncia('');
    } catch (error) {
      console.error('Erro ao denunciar postagem:', error);
      Alert.alert('Erro', 'Ocorreu um erro ao enviar a denúncia.');
    } finally {
      setIsProcessando(false);
    }
  };

  const autor = item.autor_foto ? (
    <Image source={normalizarImagem(item.autor_foto)} style={estilos.avatarPost} />
  ) : (
    <View style={[estilos.avatarPost, { backgroundColor: cores.superficieSuave }]} />
  );

  const nomeAutor = (
    <>
      <Text style={estilos.nomeAutor}>{item.autor_nome}</Text>
      {isSalvo && item.autor_username && (
        <Text style={estilos.usernameAutor}>@{item.autor_username}</Text>
      )}
    </>
  );

  const tag = isAdmin ? (
    <View style={estilos.tagsContainer}>
      <View style={estilos.tagAdmin}>
        <Ionicons name="person" size={10} color={cores.primaria} />
        <Text style={[estilos.txtTag, { color: cores.primaria, marginLeft: 3 }]}>admin</Text>
      </View>
    </View>
  ) : isSalvo ? (
    <View style={estilos.tagsContainer}>
      <View style={estilos.tagComunidade}>
        <Text style={estilos.txtTagComunidade}>Ver comunidade</Text>
      </View>
    </View>
  ) : !!item.nomes_comunidades ? (
    <View style={estilos.tagsContainer}>
      <View style={estilos.tagComunidade}>
        <Ionicons name="people" size={10} color={cores.primaria} style={{ marginRight: 7 }} />
        <Text style={estilos.txtTagComunidade} numberOfLines={1}>
          {item.nomes_comunidades}
        </Text>
      </View>
    </View>
  ) : null;

  const qtdCurtidas = Number(item.qtd_curtidas || 0);
  const salvo = isSalvo ? item.is_salvo !== false : Boolean(item.is_salvo);

  return (
    <View style={estilos.cardPost}>
      <Modal
        visible={modalDenunciaVisivel}
        transparent
        animationType="slide"
        onRequestClose={() => {
          if (!isProcessando) setModalDenunciaVisivel(false);
        }}
      >
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' }}>
          <View style={{ backgroundColor: cores.superficie || '#FFF', borderRadius: 22, padding: 24, width: '88%' }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: cores.texto || '#333', marginBottom: 15, fontFamily: 'REM_Regular' }}>
              Denunciar Postagem
            </Text>
            <Text style={{ fontSize: 14, color: cores.textoSecundario || '#666', marginBottom: 15, fontFamily: 'REM_Regular' }}>
              Descreva por que esta postagem viola as regras da comunidade:
            </Text>
            <TextInput
              style={{ backgroundColor: cores.fundoAlternativo || '#F8F7FF', borderRadius: 14, padding: 14, textAlignVertical: 'top', minHeight: 100, color: cores.texto || '#333', fontFamily: 'REM_Regular', marginBottom: 20 }}
              multiline
              placeholder="Digite o motivo da denúncia..."
              placeholderTextColor={cores.textoTerciario}
              value={motivoDenuncia}
              onChangeText={setMotivoDenuncia}
              editable={!isProcessando}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end' }}>
              <TouchableOpacity style={{ padding: 12, marginRight: 10 }} onPress={() => setModalDenunciaVisivel(false)} disabled={isProcessando}>
                <Text style={{ color: '#888', fontWeight: 'bold', fontFamily: 'REM_Regular' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={{ backgroundColor: cores.primaria, paddingVertical: 12, paddingHorizontal: 20, borderRadius: 10, flexDirection: 'row', alignItems: 'center' }}
                onPress={handleEnviarDenuncia}
                disabled={isProcessando}
              >
                {isProcessando ? <ActivityIndicator size="small" color="#FFF" /> : <Text style={{ color: '#FFF', fontWeight: 'bold', fontFamily: 'REM_Regular' }}>Enviar</Text>}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <View style={[estilos.postHeader, { zIndex: 10 }]}>
        {permiteAbrirPerfil ? <TouchableOpacity onPress={abrirPerfil}>{autor}</TouchableOpacity> : autor}

        <View style={{ flex: 1 }}>
          {permiteAbrirPerfil ? (
            <TouchableOpacity onPress={abrirPerfil}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>{nomeAutor}</View>
            </TouchableOpacity>
          ) : (
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>{nomeAutor}</View>
          )}
          {tag}
        </View>

        <View style={{ position: 'relative', zIndex: 999 }}>
          {menuVisivel && (
            <TouchableOpacity
              style={{ position: 'absolute', top: -5000, bottom: -5000, left: -5000, right: -5000, zIndex: 998, backgroundColor: 'transparent' }}
              activeOpacity={1}
              onPress={() => setMenuVisivel(false)}
            />
          )}
          <TouchableOpacity onPress={() => setMenuVisivel(!menuVisivel)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }} style={{ padding: 5 }}>
            <Ionicons name="ellipsis-vertical" size={20} color={cores.icone} />
          </TouchableOpacity>
          {menuVisivel && (
            <View style={{ position: 'absolute', right: 25, top: 0, backgroundColor: cores.superficie || '#FFF', borderRadius: 12, padding: 5, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 8, minWidth: 180, zIndex: 1000 }}>
              {postEhMeu ? (
                <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }} onPress={handleExcluirPost}>
                  <Ionicons name="trash-outline" size={20} color={cores.perigo} />
                  <Text style={{ marginLeft: 8, color: cores.perigo, fontWeight: 'bold', fontFamily: 'REM_Regular' }}>Excluir Post</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
                  onPress={() => {
                    setMenuVisivel(false);
                    setModalDenunciaVisivel(true);
                  }}
                >
                  <Ionicons name="alert-circle-outline" size={20} color={cores.aviso} />
                  <Text style={{ marginLeft: 8, color: cores.aviso, fontWeight: 'bold', fontFamily: 'REM_Regular' }}>Denunciar Post</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.7} onPress={abrirPost}>
        {!!item.conteudo && <Text style={estilos.textoPost}>{item.conteudo}</Text>}
      </TouchableOpacity>

      {imagemPost && (
        <TouchableOpacity activeOpacity={0.9} onPress={abrirPost}>
          <Image source={imagemPost} style={estilos.imagemPost} resizeMode="cover" />
        </TouchableOpacity>
      )}

      <View style={estilos.postFooter}>
        <View style={estilos.postFooterEsquerda}>
          <TouchableOpacity style={estilos.btnAcaoRow} onPress={() => onCurtir(item.id_post)}>
            <Ionicons name={item.is_curtido ? 'heart' : 'heart-outline'} size={22} color={item.is_curtido ? '#E74C3C' : cores.icone} />
            <Text style={estilos.txtQtdAcao}>{qtdCurtidas}</Text>
          </TouchableOpacity>

          <TouchableOpacity style={estilos.btnAcaoRow} onPress={abrirComentarios}>
            <Ionicons name="chatbubble-outline" size={20} color={cores.icone} />
            <Text style={estilos.txtQtdAcao}>{item.qtd_comentarios || 0}</Text>
          </TouchableOpacity>
        </View>

        <View style={estilos.postFooterDireita}>
          <TouchableOpacity style={estilos.btnAcao} onPress={() => onSalvar(item.id_post)}>
            <Ionicons name={salvo ? 'bookmark' : 'bookmark-outline'} size={20} color={salvo ? '#F1C40F' : cores.icone} />
          </TouchableOpacity>
          <TouchableOpacity style={estilos.btnAcao} onPress={compartilharPost}>
            <Ionicons name="arrow-redo-outline" size={22} color={cores.icone} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
