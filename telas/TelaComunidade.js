import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  Modal,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import PostCard from '../lib/PostCard';
import { Alert } from '../lib/popup';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Platform } from 'react-native';

const imagemUri = (valor) => {
  if (!valor) return null;
  if (String(valor).startsWith('data:') || String(valor).startsWith('http')) return { uri: String(valor) };
  return { uri: `data:image/jpeg;base64,${valor}` };
};

export default function TelaComunidade({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_comunidade, id_usuario } = route.params || {};

  const [comunidade, setComunidade] = useState(null);
  const [posts, setPosts] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [loadingAcao, setLoadingAcao] = useState(false);
  const [papelUsuario, setPapelUsuario] = useState(null);
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [modalTransferencia, setModalTransferencia] = useState(false);
  const [membrosTransferencia, setMembrosTransferencia] = useState([]);
  const [carregandoTransferencia, setCarregandoTransferencia] = useState(false);

  const ehModerador = papelUsuario === 'moderador' || papelUsuario === 'criador';
  const ehCriador = papelUsuario === 'criador';
  const estaNaComunidade = Boolean(papelUsuario);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', carregarTudo);
    return unsubscribe;
  }, [navigation, id_comunidade, id_usuario]);

  const carregarPapel = async () => {
    if (!id_comunidade || !id_usuario) return;
    const { data, error } = await supabase
      .from('comunidade_membros')
      .select('papel,status')
      .eq('id_comunidade', id_comunidade)
      .eq('id_usuario', id_usuario)
      .eq('status', 'ativo')
      .maybeSingle();
    if (!error) setPapelUsuario(data?.papel || null);
  };

  const carregarTudo = async () => {
    if (!id_comunidade || !id_usuario) return;
    setCarregando(true);
    try {
      const [comunidadeResult, postsResult] = await Promise.all([
        supabase.rpc('obter_dados_comunidade', {
          p_id_comunidade: id_comunidade,
          p_id_usuario: id_usuario,
        }),
        supabase.rpc('obter_posts_comunidade', {
          p_id_comunidade: id_comunidade,
          p_id_usuario: id_usuario,
          p_ordem: 'recentes',
        }),
      ]);

      if (comunidadeResult.error) throw comunidadeResult.error;
      if (postsResult.error) throw postsResult.error;

      setComunidade(comunidadeResult.data?.[0] || null);
      setPosts(postsResult.data || []);
      await carregarPapel();
    } catch (error) {
      console.error('Erro ao carregar comunidade:', error);
      setComunidade(null);
      setPosts([]);
    } finally {
      setCarregando(false);
    }
  };

  const atualizarPostLocal = (id_post, dados) => {
    setPosts((anteriores) => anteriores.map((post) => (post.id_post === id_post ? { ...post, ...dados } : post)));
  };

  const handleCurtir = async (id_post) => {
    try {
      const { data: novoStatus, error } = await supabase.rpc('alternar_curtida_post', {
        p_id_post: id_post,
        p_id_usuario: id_usuario,
      });
      if (error) throw error;
      setPosts((anteriores) => anteriores.map((post) => {
        if (post.id_post !== id_post) return post;
        const qtdAtual = Number(post.qtd_curtidas || 0);
        return { ...post, is_curtido: novoStatus, qtd_curtidas: Math.max(0, qtdAtual + (novoStatus ? 1 : -1)) };
      }));
    } catch (error) {
      console.error('Erro ao curtir:', error);
    }
  };

  const handleSalvar = async (id_post) => {
    try {
      const { data: novoStatus, error } = await supabase.rpc('alternar_salvamento_post', {
        p_id_post: id_post,
        p_id_usuario: id_usuario,
      });
      if (error) throw error;
      atualizarPostLocal(id_post, { is_salvo: novoStatus });
    } catch (error) {
      console.error('Erro ao salvar:', error);
    }
  };

  const denunciarComunidade = () => {
    setMenuVisivel(false);
    Alert.alert(
      'Denunciar comunidade',
      'Deseja enviar esta comunidade para análise da equipe Orami?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Denunciar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('orami_denunciar_comunidade', {
                p_id_denunciante: id_usuario,
                p_id_comunidade: id_comunidade,
                p_descricao: 'Denúncia enviada a partir da comunidade.',
                p_texto_motivo: 'Violação das regras',
              });
              if (error) throw error;
              Alert.alert('Denúncia enviada', 'A comunidade foi encaminhada para análise.');
            } catch (error) {
              console.error('Erro ao denunciar comunidade:', error);
              Alert.alert('Erro', 'Não foi possível registrar a denúncia.');
            }
          },
        },
      ]
    );
  };

  const carregarMembrosTransferencia = async () => {
    setCarregandoTransferencia(true);
    try {
      const { data, error } = await supabase
        .from('comunidade_membros')
        .select(`id_comunidade_membro,id_usuario,papel,status,usuarios!comunidade_membros_id_usuario_fkey(nome_exibicao,nome_usuario,foto_perfil)`)
        .eq('id_comunidade', id_comunidade)
        .eq('status', 'ativo')
        .neq('id_usuario', id_usuario)
        .order('data_entrada', { ascending: true });
      if (error) throw error;
      setMembrosTransferencia(data || []);
      setModalTransferencia(true);
    } catch (error) {
      console.error('Erro ao carregar membros para transferência:', error);
      Alert.alert('Membros indisponíveis', 'Não foi possível carregar os membros para a transferência.');
    } finally {
      setCarregandoTransferencia(false);
    }
  };

  const transferirCriador = (membro) => {
    Alert.alert(
      'Transferir criação',
      `Deseja tornar ${membro.usuarios?.nome_exibicao || membro.usuarios?.nome_usuario || 'este membro'} o novo criador da comunidade?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Transferir',
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc('orami_transferir_criador_comunidade', {
                p_id_comunidade: id_comunidade,
                p_id_usuario_criador: id_usuario,
                p_id_novo_criador: membro.id_usuario,
              });
              if (error) throw error;
              if (!data) throw new Error('Não autorizado');
              setModalTransferencia(false);
              await carregarPapel();
              Alert.alert('Criação transferida', 'Agora você pode sair da comunidade sem excluí-la.');
            } catch (error) {
              console.error('Erro ao transferir criador:', error);
              Alert.alert('Transferência não concluída', 'Não foi possível transferir o cargo de criador.');
            }
          },
        },
      ]
    );
  };

  const confirmarSaida = () => {
    setMenuVisivel(false);

    if (ehCriador) {
      Alert.alert(
        'Você é o criador',
        'Para sair sem encerrar a comunidade, primeiro transfira o cargo de criador para outro membro.',
        [
          { text: 'Cancelar', style: 'cancel' },
          { text: 'Transferir', onPress: carregarMembrosTransferencia },
        ]
      );
      return;
    }

    const mensagem = ehModerador
      ? 'Você está como moderador desta comunidade. Tem certeza que deseja sair? Seu cargo de moderador será encerrado.'
      : 'Tem certeza que deseja sair desta comunidade?';

    Alert.alert(
      ehModerador ? 'Sair como moderador' : 'Sair da comunidade',
      mensagem,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Sair',
          style: 'destructive',
          onPress: async () => {
            setLoadingAcao(true);
            try {
              const { data, error } = await supabase.rpc('orami_sair_comunidade', {
                p_id_comunidade: id_comunidade,
                p_id_usuario: id_usuario,
                p_confirmar_exclusao_se_criador: false,
              });
              if (error) throw error;
              if (!data) throw new Error('Não foi possível sair');
              setPapelUsuario(null);
              setComunidade((anterior) => ({ ...anterior, is_membro: false }));
              Alert.alert('Você saiu', 'Sua participação na comunidade foi encerrada.');
            } catch (error) {
              console.error('Erro ao sair da comunidade:', error);
              Alert.alert('Saída não concluída', 'Não foi possível sair da comunidade agora.');
            } finally {
              setLoadingAcao(false);
            }
          },
        },
      ]
    );
  };

  const handleAlternarMembro = async () => {
    if (estaNaComunidade) {
      confirmarSaida();
      return;
    }

    setLoadingAcao(true);
    try {
      const { data, error } = await supabase.rpc('alternar_membro_comunidade', {
        p_id_comunidade: id_comunidade,
        p_id_usuario: id_usuario,
      });
      if (error) throw error;
      await carregarPapel();
      setComunidade((anterior) => ({
        ...anterior,
        is_membro: data,
        qtd_membros: Math.max(0, Number(anterior?.qtd_membros || 0) + (data ? 1 : -1)),
      }));
    } catch (error) {
      Alert.alert('Ação não concluída', 'Não foi possível processar sua solicitação agora.');
    } finally {
      setLoadingAcao(false);
    }
  };

  if (carregando) {
    return <View style={estilos.loadingContainer}><ActivityIndicator size="large" color="#8C77C2" /></View>;
  }

  if (!comunidade) {
    return (
      <View style={estilos.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={40} color="#8C77C2" />
        <Text style={{ marginTop: 12, color: '#666', fontFamily: 'REM_Medium' }}>Comunidade indisponível.</Text>
        <TouchableOpacity style={{ marginTop: 16 }} onPress={() => navigation.goBack()}>
          <Text style={{ color: '#8C77C2', fontFamily: 'REM_Bold' }}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.container}>
      <FlatList
        data={posts}
        keyExtractor={(item) => String(item.id_post)}
        renderItem={({ item }) => (
          <PostCard
            item={item}
            estilos={estilos}
            cores={cores}
            navigation={navigation}
            idUsuario={id_usuario}
            onCurtir={handleCurtir}
            onSalvar={handleSalvar}
            variant="comunidade"
          />
        )}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={<Text style={estilos.textoListaVazia}>Nenhuma publicação encontrada.</Text>}
        ListHeaderComponent={
          <View>
            <ImageBackground
              source={imagemUri(comunidade.header_base64)}
              style={[estilos.capaComunidade, !comunidade.header_base64 && estilos.capaComunidadeSemImagem]}
            >
              <View style={estilos.botoesTopo}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.btnIconeCapa}>
                  <Ionicons name="arrow-back" size={22} color="#8C77C2" />
                </TouchableOpacity>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                  {ehModerador && (
                    <TouchableOpacity
                      style={estilos.btnIconeCapa}
                      onPress={() => navigation.navigate('TelaEditarComunidade', { comunidade, id_usuario })}
                    >
                      <Ionicons name="pencil" size={20} color="#8C77C2" />
                    </TouchableOpacity>
                  )}
                  <TouchableOpacity style={estilos.btnIconeCapa}>
                    <Ionicons name="search" size={20} color="#8C77C2" />
                  </TouchableOpacity>
                  <TouchableOpacity style={estilos.btnIconeCapa} onPress={() => setMenuVisivel(true)}>
                    <Ionicons name="ellipsis-vertical" size={20} color="#8C77C2" />
                  </TouchableOpacity>
                </View>
              </View>
            </ImageBackground>

            <View style={estilos.infoContainerBranco}>
              <View style={estilos.headerInfos}>
                <View style={estilos.containerFotoPerfil}>
                  {imagemUri(comunidade.foto_base64) ? (
                    <Image source={imagemUri(comunidade.foto_base64)} style={estilos.fotoPerfil} />
                  ) : (
                    <View style={[estilos.fotoPerfil, { backgroundColor: '#21469B' }]} />
                  )}
                </View>
                <View style={estilos.textosTitulo}>
                  <Text style={estilos.nomeComunidade}>{comunidade.nome_comunidade}</Text>
                  <View style={estilos.rowMembrosBtn}>
                    <Text style={estilos.txtMembros}>{comunidade.qtd_membros || 0} Membros</Text>
                    <TouchableOpacity
                      style={estilos.btnJuntarSair}
                      onPress={handleAlternarMembro}
                      disabled={loadingAcao}
                    >
                      {loadingAcao ? (
                        <ActivityIndicator size="small" color="#8C77C2" />
                      ) : (
                        <>
                          {!estaNaComunidade && <Ionicons name="person-add" size={14} color="#8C77C2" style={{ marginRight: 4 }} />}
                          <Text style={estilos.txtBtnJuntar}>{estaNaComunidade ? 'Sair da comunidade' : 'Juntar-se'}</Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
              <Text style={estilos.descComunidade}>{comunidade.descr_comunidade}</Text>
            </View>

            <View style={estilos.containerMeio}>
              <TouchableOpacity
                style={estilos.btnNovoPost}
                onPress={() => navigation.navigate('TelaCriarPost', { id_usuario, id_comunidade })}
              >
                <Ionicons name="add" size={20} color="#8C77C2" />
                <Text style={estilos.txtBtnNovoPost}>Novo post</Text>
              </TouchableOpacity>
            </View>
          </View>
        }
      />

      <Modal visible={menuVisivel} transparent animationType="fade" onRequestClose={() => setMenuVisivel(false)}>
        <TouchableOpacity style={estilos.menuOverlay} activeOpacity={1} onPress={() => setMenuVisivel(false)}>
          <View style={[estilos.menuComunidade, { backgroundColor: cores.superficie || '#FFF' }]}>
            {ehModerador && (
              <TouchableOpacity
                style={estilos.itemMenuComunidade}
                onPress={() => {
                  setMenuVisivel(false);
                  navigation.navigate('TelaConfigComunidade', { id_comunidade, id_usuario });
                }}
              >
                <Ionicons name="settings-outline" size={21} color={cores.icone} />
                <Text style={estilos.textoItemMenuComunidade}>Configurações</Text>
              </TouchableOpacity>
            )}
            {estaNaComunidade && (
              <TouchableOpacity style={estilos.itemMenuComunidade} onPress={confirmarSaida}>
                <Ionicons name="exit-outline" size={21} color="#E67E22" />
                <Text style={[estilos.textoItemMenuComunidade, { color: '#E67E22' }]}>Sair da comunidade</Text>
              </TouchableOpacity>
            )}
            {!ehCriador && (
              <TouchableOpacity style={estilos.itemMenuComunidade} onPress={denunciarComunidade}>
                <Ionicons name="flag-outline" size={21} color="#D35400" />
                <Text style={[estilos.textoItemMenuComunidade, { color: '#D35400' }]}>Denunciar comunidade</Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalTransferencia} transparent animationType="slide" onRequestClose={() => setModalTransferencia(false)}>
        <View style={estilos.transferenciaOverlay}>
          <View style={[estilos.transferenciaCard, { backgroundColor: cores.superficie || '#FFF' }]}>
            <View style={estilos.transferenciaHeader}>
              <View>
                <Text style={[estilos.transferenciaTitulo, { color: cores.texto }]}>Transferir criação</Text>
                <Text style={[estilos.transferenciaSubtitulo, { color: cores.textoSecundario }]}>Selecione um membro ativo para assumir a comunidade.</Text>
              </View>
              <TouchableOpacity onPress={() => setModalTransferencia(false)}>
                <Ionicons name="close" size={25} color={cores.icone} />
              </TouchableOpacity>
            </View>
            {carregandoTransferencia ? (
              <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 30 }} />
            ) : (
              <FlatList
                data={membrosTransferencia}
                keyExtractor={(item) => String(item.id_comunidade_membro)}
                renderItem={({ item }) => (
                  <TouchableOpacity style={estilos.itemTransferencia} onPress={() => transferirCriador(item)}>
                    {imagemUri(item.usuarios?.foto_perfil) ? (
                      <Image source={imagemUri(item.usuarios.foto_perfil)} style={estilos.avatarTransferencia} />
                    ) : (
                      <View style={[estilos.avatarTransferencia, { backgroundColor: '#C6DFFF', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="person" size={20} color="#FFF" />
                      </View>
                    )}
                    <View style={{ flex: 1 }}>
                      <Text style={estilos.nomeTransferencia}>{item.usuarios?.nome_exibicao || item.usuarios?.nome_usuario || 'Membro'}</Text>
                      {!!item.usuarios?.nome_usuario && <Text style={estilos.userTransferencia}>@{item.usuarios.nome_usuario}</Text>}
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#8C77C2" />
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={estilos.textoListaVazia}>Não há outros membros ativos para assumir a criação.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FC', paddingBottom: Platform.OS === 'android' ? 30 : 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8FC' },
  capaComunidade: { height: 210, width: '100%', justifyContent: 'flex-start', paddingTop: 45 },
  capaComunidadeSemImagem: { backgroundColor: '#D9D9D9' },
  botoesTopo: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15 },
  btnIconeCapa: { backgroundColor: 'rgba(255, 255, 255, 0.85)', width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  infoContainerBranco: { backgroundColor: '#FFF', borderTopLeftRadius: 35, borderTopRightRadius: 35, marginTop: -30, paddingHorizontal: 20, paddingBottom: 25 },
  headerInfos: { flexDirection: 'row', alignItems: 'flex-start', marginTop: -30 },
  containerFotoPerfil: { width: 105, height: 105, borderRadius: 52, backgroundColor: '#FFF', padding: 4, marginRight: 15 },
  fotoPerfil: { width: '100%', height: '100%', borderRadius: 45, backgroundColor: '#21469B' },
  textosTitulo: { flex: 1, marginTop: 45 },
  nomeComunidade: { fontSize: 20, fontFamily: 'REM_Bold', color: '#1A1A1A', marginBottom: 4 },
  rowMembrosBtn: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  txtMembros: { fontSize: 13, color: '#555', fontFamily: 'REM_Bold', marginRight: 10 },
  btnJuntarSair: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: '#D3C6F5', paddingVertical: 4, paddingHorizontal: 12, borderRadius: 20 },
  txtBtnJuntar: { color: '#8C77C2', fontFamily: 'REM_Bold', fontSize: 13 },
  descComunidade: { fontSize: 14, color: '#555', lineHeight: 20, marginTop: 15, fontFamily: 'REM_Regular', textAlign: 'justify' },
  containerMeio: { paddingHorizontal: 20, paddingTop: 17, paddingBottom: 15 },
  btnNovoPost: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', backgroundColor: '#FFF', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 25, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  txtBtnNovoPost: { color: '#8C77C2', fontFamily: 'REM_Bold', fontSize: 15, marginLeft: 5 },
  cardPost: { backgroundColor: '#FFF', padding: 15, marginHorizontal: 20, marginBottom: 15, borderRadius: 16, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarPost: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  nomeAutor: { fontFamily: 'REM_Bold', fontSize: 15, color: '#111' },
  tagsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  tagComunidade: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0E6FF', alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, marginTop: 2 },
  txtTagComunidade: { fontSize: 11, color: '#8C77C2', fontFamily: 'REM_Medium', fontWeight: '600' },
  tagAdmin: { backgroundColor: '#F0E6FF', flexDirection: 'row', alignItems: 'center', paddingVertical: 2, paddingHorizontal: 8, borderRadius: 10 },
  txtTag: { fontSize: 11, color: '#8C77C2', fontFamily: 'REM_Medium' },
  textoPost: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 12, fontFamily: 'REM_Regular' },
  imagemPost: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  postFooterEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  postFooterDireita: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  btnAcao: { padding: 2 },
  btnAcaoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 2 },
  txtQtdAcao: { fontSize: 13, fontFamily: 'REM_Medium', color: '#666' },
  textoListaVazia: { textAlign: 'center', marginTop: 20, marginHorizontal: 20, color: '#999', fontFamily: 'REM_Regular' },
  menuOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 105, paddingRight: 15 },
  menuComunidade: { width: 230, borderRadius: 15, padding: 8, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 },
  itemMenuComunidade: { flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 10, borderRadius: 11 },
  textoItemMenuComunidade: { marginLeft: 10, fontFamily: 'REM_Bold', color: '#444', fontSize: 14 },
  transferenciaOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  transferenciaCard: { height: '72%', borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 20 },
  transferenciaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
  transferenciaTitulo: { fontSize: 21, fontFamily: 'REM_Bold' },
  transferenciaSubtitulo: { fontSize: 13, marginTop: 4, maxWidth: 290, lineHeight: 18, fontFamily: 'REM_Regular' },
  itemTransferencia: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  avatarTransferencia: { width: 48, height: 48, borderRadius: 24, marginRight: 12 },
  nomeTransferencia: { fontFamily: 'REM_Bold', color: '#333', fontSize: 15 },
  userTransferencia: { fontFamily: 'REM_Regular', color: '#888', fontSize: 12, marginTop: 2 },
});
