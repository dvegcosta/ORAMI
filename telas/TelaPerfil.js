import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity, 
  Image, FlatList, ActivityIndicator, Animated, Modal, Dimensions, TextInput
} from 'react-native';
import { Ionicons, FontAwesome5, Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import PostCard from '../lib/PostCard';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Platform } from 'react-native';
import { Alert } from '../lib/popup';

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.75; 

const normalizarStatusAmizade = (perfil) => {
  const status = perfil?.status_amizade || perfil?.amizade_status || perfil?.status_relacao;
  if (status) return status;
  return perfil?.is_amigo ? 'pendente_enviada' : 'nenhuma';
};

const obterBotaoAmizade = (status) => {
  if (status === 'aceita') {
    return { texto: 'Amigos', icone: 'people', ativo: false };
  }
  if (status === 'pendente_enviada' || status === 'pendente') {
    return { texto: 'Solicitação enviada', icone: 'time-outline', ativo: false };
  }
  if (status === 'pendente_recebida') {
    return { texto: 'Aceitar', icone: 'person-add', ativo: true };
  }
  return { texto: 'Amigar', icone: 'person-add', ativo: true };
};

export default function TelaPerfil({ route, navigation }) {
  const { cores } = usarTema();
  const estilos = useEstilosTema(estilosBase, {
    listaPerfilContent: { backgroundColor: cores.fundoAlternativo },
    btnAmigosInativo: { backgroundColor: '#FFF' },
  });
  const id_logado = route.params?.id_usuario;
  const id_alvo = route.params?.id_perfil || id_logado;
  const isMeuPerfil = Boolean(id_alvo && id_logado) && String(id_alvo).trim() === String(id_logado).trim();
  const [amigos, setAmigos] = useState([]);
  const [modalAmigosVisivel, setModalAmigosVisivel] = useState(false);
  const [carregandoAmigos, setCarregandoAmigos] = useState(false);
  const [perfil, setPerfil] = useState(null);
  const [posts, setPosts] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [loadingAcao, setLoadingAcao] = useState(false);
  const [pesquisaVisivel, setPesquisaVisivel] = useState(false);
  const [textoPesquisa, setTextoPesquisa] = useState('');
  const [perfilMenu, setPerfilMenu] = useState({ nome: 'Carregando...', fotoBase64: null });
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [menuAcoesPerfilVisivel, setMenuAcoesPerfilVisivel] = useState(false);
  const animacaoMenu = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const animacaoFundo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      carregarDados();
      carregarPerfilMenu();
    });
    return unsubscribe;
  }, [navigation, id_alvo]);

  const carregarPerfilMenu = async () => {
    try {
      const { data, error } = await supabase.rpc('obter_perfil_usuario', {
        p_id_usuario: id_logado
      });
      if (data && !error) {
        setPerfilMenu({ nome: data.nome, fotoBase64: data.foto_base64 });
      }
    } catch (error) {
      console.error("Erro ao carregar perfil do menu:", error);
    }
  };

  const carregarAmigos = async () => {
    setModalAmigosVisivel(true);
    setCarregandoAmigos(true);
    try {
      const { data, error } = await supabase.rpc('obter_amigos_usuario', {
        p_id_usuario: id_alvo
      });
      if (error) throw error;
      setAmigos(data || []);
    } catch (error) {
      console.error("Erro ao carregar amigos:", error);
      Alert.alert('Amigos indisponíveis', 'Não foi possível carregar a lista de amigos agora.');
    } finally {
      setCarregandoAmigos(false);
    }
  };

  const carregarDados = async () => {
    if (!id_alvo || !id_logado) return;
    setCarregando(true);
    try {
      const { data: dadosPerfil, error: errPerfil } = await supabase.rpc('obter_dados_perfil_view', {
        p_id_alvo: id_alvo,
        p_id_logado: id_logado
      });
      if (errPerfil) throw errPerfil;
      if (dadosPerfil) setPerfil(dadosPerfil[0]);

      const { data: dadosPosts, error: errPosts } = await supabase.rpc('obter_feed_posts_perfil', {
        p_id_alvo: id_alvo,
        p_id_logado: id_logado
      });
      if (errPosts) throw errPosts;
      setPosts(dadosPosts || []);
    } catch (error) {
      console.error("Erro ao carregar perfil:", error);
      Alert.alert('Perfil indisponível', 'Não foi possível carregar os dados do perfil agora.');
    } finally {
      setCarregando(false);
    }
  };

  const abrirMenu = () => {
    setMenuVisivel(true);
    Animated.parallel([
      Animated.timing(animacaoMenu, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.timing(animacaoFundo, { toValue: 1, duration: 300, useNativeDriver: true })
    ]).start();
  };

  const fecharMenu = () => {
    Animated.parallel([
      Animated.timing(animacaoMenu, { toValue: -MENU_WIDTH, duration: 300, useNativeDriver: true }),
      Animated.timing(animacaoFundo, { toValue: 0, duration: 300, useNativeDriver: true })
    ]).start(() => setMenuVisivel(false));
  };

  const irParaTela = (nomeTela) => {
    fecharMenu();
    navigation.navigate(nomeTela, { id_usuario: id_logado });
  };

  const denunciarPerfil = () => {
    setMenuAcoesPerfilVisivel(false);
    Alert.alert(
      'Denunciar perfil',
      'Deseja enviar este perfil para análise da equipe Orami?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Denunciar',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.rpc('orami_denunciar_usuario', {
                p_id_denunciante: id_logado,
                p_id_usuario_denunciado: id_alvo,
                p_descricao: 'Denúncia enviada a partir do perfil.',
                p_texto_motivo: 'Violação das regras',
              });
              if (error) throw error;
              Alert.alert('Denúncia enviada', 'O perfil foi encaminhado para análise.');
            } catch (error) {
              console.error('Erro ao denunciar perfil:', error);
              Alert.alert('Erro', 'Não foi possível registrar a denúncia.');
            }
          },
        },
      ]
    );
  };

  const handleDesconectar = () => {
    fecharMenu();
    Alert.alert('Desconectar', 'Tem certeza que deseja sair da sua conta agora?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => navigation.replace('TelaLogin'), style: 'destructive' }
    ]);
  };

  const menuItems = [
    { icone: 'accessibility-outline', texto: 'Acessibilidade', acao: () => irParaTela('TelaAcessibilidade') },
    { icone: 'bookmark-outline', texto: 'Itens salvos', acao: () => irParaTela('TelaItensSalvos') },
    { icone: 'lock-closed-outline', texto: 'Segurança e Privacidade', acao: () => irParaTela('TelaSegurancaPrivacidade') },
    { icone: 'help-circle-outline', texto: 'Central de ajuda', acao: () => irParaTela('TelaCentralAjuda') },
    { icone: 'book-outline', texto: 'Manual de uso', acao: () => irParaTela('TelaManualUso') },
    { icone: 'log-out-outline', texto: 'Desconectar', cor: '#FF6B6B', acao: handleDesconectar },
  ];

  const handleAlternarAmizade = async () => {
    setLoadingAcao(true);
    try {
      const { data, error } = await supabase.rpc('solicitar_ou_cancelar_amizade', {
        p_id_logado: id_logado,
        p_id_alvo: id_alvo
      });
      if (error) throw error;

      const resultado = Array.isArray(data) ? data[0] : data;
      const statusAmizade = resultado?.status_amizade || 'nenhuma';
      const qtdAmigos = Math.max(0, Number(resultado?.qtd_amigos ?? perfil?.qtd_amigos ?? 0));

      setPerfil(prev => ({
        ...prev,
        status_amizade: statusAmizade,
        is_amigo: statusAmizade === 'aceita',
        qtd_amigos: qtdAmigos
      }));
    } catch (error) {
      console.error("Erro ao alterar amizade:", error);
      Alert.alert('Amizade não atualizada', 'Não foi possível processar a solicitação agora.');
    } finally {
      setLoadingAcao(false);
    }
  };

  const handleCurtir = async (id_post) => {
    try {
      const { data: novoStatus, error } = await supabase.rpc('alternar_curtida_post', {
        p_id_post: id_post,
        p_id_usuario: id_logado
      });
      if (error) throw error;
      setPosts(prev => prev.map(post => {
        if (post.id_post === id_post) {
          return { ...post, is_curtido: novoStatus, qtd_curtidas: novoStatus ? post.qtd_curtidas + 1 : post.qtd_curtidas - 1 };
        }
        return post;
      }));
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  };

  const handleSalvar = async (id_post) => {
    try {
      const { data: novoStatus, error } = await supabase.rpc('alternar_salvamento_post', {
        p_id_post: id_post,
        p_id_usuario: id_logado
      });
      if (error) throw error;
      setPosts(prev => prev.map(post => {
        if (post.id_post === id_post) return { ...post, is_salvo: novoStatus };
        return post;
      }));
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

  const postsFiltrados = posts.filter(post => 
    post.conteudo?.toLowerCase().includes(textoPesquisa.toLowerCase()) ||
    post.nomes_comunidades?.toLowerCase().includes(textoPesquisa.toLowerCase())
  );

    const renderHeader = () => {
    const statusAmizade = normalizarStatusAmizade(perfil);
    const botaoAmizade = obterBotaoAmizade(statusAmizade);
    const botaoAmizadeAtivo = botaoAmizade.ativo && statusAmizade !== 'aceita';

    return (
    <View style={estilos.topContainer}>
      <View style={estilos.headerNav}>
        {isMeuPerfil ? (
          <>
            <View style={estilos.headerLeftGroup}>
              <TouchableOpacity onPress={abrirMenu}>
                <Ionicons name="menu" size={30} color="#FFF" />
              </TouchableOpacity>
              <Text style={estilos.tituloHeader}>Meu perfil</Text>
            </View>
            <TouchableOpacity onPress={() => navigation.navigate('TelaConfigUsuario', { perfil, id_usuario: id_logado })}>
              <FontAwesome5 name="pen" size={20} color="#FFF" />
            </TouchableOpacity>
          </>
        ) : (
          <>
            <View style={estilos.headerLeftGroup}>
              <TouchableOpacity onPress={() => navigation.goBack()}>
                <Ionicons name="arrow-back" size={28} color="#FFF" />
              </TouchableOpacity>
              <Text style={estilos.tituloHeader}>{perfil?.username_perfil}</Text>
            </View>
            <View style={estilos.rightIcons}>
              <TouchableOpacity style={estilos.btnChatNav}>
                <Ionicons name="chatbubble-ellipses" size={28} color="#FFF" />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setMenuAcoesPerfilVisivel(true)}>
                <Ionicons name="ellipsis-vertical" size={24} color="#FFF" />
              </TouchableOpacity>
            </View>
          </>
        )}
      </View>

      <View style={estilos.profileInfoContainer}>
        <View style={estilos.rowSuperior}>
          {perfil?.foto_base64 ? (
            <Image source={{ uri: `data:image/jpeg;base64,${perfil.foto_base64}` }} style={estilos.avatarGrande} />
          ) : (
            <View style={[estilos.avatarGrande, { backgroundColor: '#C6DFFF' }]} />
          )}
          <View style={estilos.colunaDireita}>
            <Text style={estilos.nomePerfil}>{perfil?.nome_perfil}</Text>
            {isMeuPerfil && (
              <Text style={estilos.usernameSubtitulo}>@{perfil?.username_perfil}</Text>
            )}
            <View style={estilos.botoesPerfilRow}>
              <TouchableOpacity style={estilos.containerContadorAmigos} onPress={carregarAmigos}>
                <Ionicons name="people" size={18} color="#FFF" />
                <Text style={estilos.txtContadorAmigos}>
                  {perfil?.qtd_amigos || 0} {perfil?.qtd_amigos === 1 ? 'amigo' : 'amigos'}
                </Text>
              </TouchableOpacity>
              {!isMeuPerfil && (
                <TouchableOpacity 
                  style={[estilos.btnAmigos, botaoAmizadeAtivo ? estilos.btnAmigosAtivo : estilos.btnAmigosInativo]}
                  onPress={handleAlternarAmizade}
                  disabled={loadingAcao}
                >
                  {loadingAcao ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <View style={estilos.conteudoBotaoAmigos}>
                      <Ionicons name={botaoAmizade.icone} size={18} color={botaoAmizadeAtivo ? "#FFF" : "#666"} />
                      <Text
                        style={[estilos.txtBtnAmigos, { color: botaoAmizadeAtivo ? "#FFF" : "#666" }]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {botaoAmizade.texto}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
        <Text style={estilos.bioPerfil}>{perfil?.descr_perfil || "Nenhuma descrição informada."}</Text>
      </View>
    </View>
    );
  };

  if (carregando || !perfil) {
    return (
      <View style={estilos.loadingContainer}>
        <ActivityIndicator size="large" color="#8C77C2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.container}>
      <FlatList
        data={postsFiltrados}
        keyExtractor={item => item.id_post.toString()}
        renderItem={({ item }) => (
          <PostCard
          item={item}
          estilos={estilos}
          cores={cores}
          navigation={navigation}
          idUsuario={id_logado}
          onCurtir={handleCurtir}
          onSalvar={handleSalvar}
          variant="perfil"
        />
        )}
        contentContainerStyle={estilos.listaPerfilContent}
        ListHeaderComponent={
          <>
            {renderHeader()}
            <View style={estilos.whiteWrapper}>
              {isMeuPerfil && (
                <>
                  <View style={estilos.rowAcoesProprias}>
                    <TouchableOpacity style={estilos.btnAcaoBranco} onPress={() => navigation.navigate('TelaCriarPost', { id_usuario: id_logado })}>
                      <Ionicons name="add" size={20} color="#8C77C2" style={{ marginRight: 6 }} />
                      <Text style={estilos.txtBtnAcaoBranco}>Novo post</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.btnAcaoBranco} onPress={() => setPesquisaVisivel(!pesquisaVisivel)}>
                      <Ionicons name="search" size={20} color="#8C77C2" style={{ marginRight: 6 }} />
                      <Text style={estilos.txtBtnAcaoBranco}>Pesquisar</Text>
                    </TouchableOpacity>
                  </View>
                  {pesquisaVisivel && (
                    <View style={estilos.pesquisaContainer}>
                      <Feather name="search" size={20} color="#BDBDBD" style={estilos.iconePesquisa} />
                      <TextInput
                        style={estilos.inputPesquisa}
                        placeholder="Pesquisar nos posts..."
                        placeholderTextColor="#BDBDBD"
                        value={textoPesquisa}
                        onChangeText={setTextoPesquisa}
                      />
                    </View>
                  )}
                </>
              )}
            </View>
          </>
        }
      />

      {menuVisivel && (
        <Modal transparent visible={menuVisivel} animationType="none" onRequestClose={fecharMenu}>
          <View style={estilos.modalOverlay}>
            <Animated.View style={[estilos.fundoEscuro, { opacity: animacaoFundo }]}>
              <TouchableOpacity style={StyleSheet.absoluteFill} onPress={fecharMenu} activeOpacity={1} />
            </Animated.View>
            <Animated.View style={[estilos.painelMenu, { transform: [{ translateX: animacaoMenu }] }]}>
              <TouchableOpacity
                style={estilos.perfilMenuContainer}
                activeOpacity={0.7}
                onPress={() => { fecharMenu(); if (!isMeuPerfil) navigation.navigate('TelaPerfil', { id_usuario: id_logado, id_perfil: id_logado }); }}
              >
                <View style={estilos.linhaRoxaPerfil} />
                {perfilMenu.fotoBase64 ? (
                  <Image source={{ uri: `data:image/jpeg;base64,${perfilMenu.fotoBase64}` }} style={estilos.fotoPerfilMenu} />
                ) : (
                  <View style={[estilos.fotoPerfilMenu, estilos.fotoPlaceholder]}>
                    <Ionicons name="person" size={30} color="#FFF" />
                  </View>
                )}
                <View style={estilos.infoPerfilMenu}>
                  <Text style={estilos.nomePerfilMenu} numberOfLines={1}>{perfilMenu.nome}</Text>
                  <Text style={estilos.textoVerPerfil}>Ver meu perfil</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>
              <View style={estilos.listaOpcoesMenu}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity key={index} style={estilos.itemMenu} activeOpacity={0.7} onPress={item.acao}>
                    <Ionicons name={item.icone} size={22} color={item.cor || cores.icone} />
                    <Text style={[estilos.textoItemMenu, item.cor && { color: item.cor }]}>{item.texto}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </Animated.View>
          </View>
        </Modal>
      )}

      <Modal visible={menuAcoesPerfilVisivel} transparent animationType="fade" onRequestClose={() => setMenuAcoesPerfilVisivel(false)}>
        <TouchableOpacity
          style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'flex-start', alignItems: 'flex-end', paddingTop: 112, paddingRight: 15 }}
          activeOpacity={1}
          onPress={() => setMenuAcoesPerfilVisivel(false)}
        >
          <View style={{ width: 205, backgroundColor: cores.superficie || '#FFF', borderRadius: 15, padding: 8, elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.18, shadowRadius: 8 }}>
            <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 13, paddingHorizontal: 10 }} onPress={denunciarPerfil}>
              <Ionicons name="flag-outline" size={21} color="#D35400" />
              <Text style={{ marginLeft: 10, fontFamily: 'REM_Bold', color: '#D35400', fontSize: 14 }}>Denunciar perfil</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalAmigosVisivel} animationType="slide" transparent={true} onRequestClose={() => setModalAmigosVisivel(false)}>
        <View style={estilos.modalAmigosOverlay}>
          <View style={estilos.modalAmigosContent}>
            <View style={estilos.modalAmigosHeader}>
              <Text style={estilos.modalAmigosTitulo}>Amigos</Text>
              <TouchableOpacity onPress={() => setModalAmigosVisivel(false)}>
                <Ionicons name="close" size={28} color={cores.icone} />
              </TouchableOpacity>
            </View>
            {carregandoAmigos ? (
              <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 20 }} />
            ) : (
              <FlatList
                data={amigos}
                keyExtractor={(item) => item.id_amigo.toString()}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={estilos.itemAmigo}
                    onPress={() => { setModalAmigosVisivel(false); navigation.push('TelaPerfil', { id_usuario: id_logado, id_perfil: item.id_amigo }); }}
                  >
                    {item.foto_base64 ? (
                      <Image source={{ uri: `data:image/jpeg;base64,${item.foto_base64}` }} style={estilos.fotoAmigo} />
                    ) : (
                      <View style={[estilos.fotoAmigo, { backgroundColor: '#C6DFFF', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="person" size={20} color="#FFF" />
                      </View>
                    )}
                    <View>
                      <Text style={estilos.nomeAmigo}>{item.nome_perfil}</Text>
                      <Text style={estilos.userAmigo}>@{item.username_perfil}</Text>
                    </View>
                  </TouchableOpacity>
                )}
                ListEmptyComponent={<Text style={estilos.textoListaVazia}>Nenhum amigo encontrado.</Text>}
              />
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0fb400', paddingBottom: Platform.OS === 'android' ? 95 : 0 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F8F8FC' },
  topContainer: { backgroundColor: '#8C77C2', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 35, borderBottomLeftRadius: 35, borderBottomRightRadius: 35, shadowColor: "#8C77C2", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 8, marginBottom: 10 },
  headerNav: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 30 },
  rightIcons: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  btnChatNav: { marginRight: 5 },
  headerLeftGroup: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tituloHeader: { fontSize: 22, fontFamily: 'REM_Bold', fontWeight: 'bold', color: '#FFF', marginLeft: 5 },
  profileInfoContainer: { paddingBottom: 5, gap: 15 },
  rowSuperior: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  avatarGrande: { width: 90, height: 90, borderRadius: 45, borderWidth: 2, borderColor: '#FFF' },
  colunaDireita: { flex: 1, justifyContent: 'center', gap: 5 },
  nomePerfil: { fontSize: 22, fontFamily: 'REM_Bold', fontWeight: 'bold', color: '#FFF' },
  usernameSubtitulo: { fontSize: 15, fontFamily: 'REM_Medium', color: '#EAE2FF', marginTop: -4, marginBottom: 8 },
  botoesPerfilRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  containerContadorAmigos: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255, 255, 255, 0.2)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, gap: 6 },
  txtContadorAmigos: { fontSize: 14, fontFamily: 'REM_Bold', color: '#FFF' },
  btnAmigos: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, justifyContent: 'center', alignItems: 'center', flexShrink: 1, maxWidth: 170, minHeight: 32 },
  conteudoBotaoAmigos: { flexDirection: 'row', alignItems: 'center', gap: 6, minWidth: 0 },
  btnAmigosInativo: { backgroundColor: '#FFF' },
  btnAmigosAtivo: { backgroundColor: 'rgba(255, 255, 255, 0.2)', borderWidth: 1, borderColor: 'rgba(255, 255, 255, 0.3)' },
  txtBtnAmigos: { fontFamily: 'REM_Bold', fontWeight: 'bold', fontSize: 13, flexShrink: 1 },
  bioPerfil: { fontSize: 15, color: '#EAE2FF', lineHeight: 20, fontFamily: 'REM_Medium', marginTop: 5 },
  whiteWrapper: { paddingHorizontal: 5, paddingTop: 10, backgroundColor: '#2121ad00' },
  listaPerfilContent: { backgroundColor: '#F8F8FC', flexGrow: 1 },
  rowAcoesProprias: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 15, gap: 12 },
  btnAcaoBranco: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', paddingVertical: 14, borderRadius: 20, shadowColor: "#000", shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4, elevation: 2 },
  txtBtnAcaoBranco: { color: '#8C77C2', fontFamily: 'REM_Bold', fontWeight: 'bold', fontSize: 15 },
  pesquisaContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 15, marginBottom: 20, height: 48, borderRadius: 24, paddingHorizontal: 15, elevation: 2, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 4 },
  iconePesquisa: { marginRight: 10 },
  inputPesquisa: { flex: 1, fontSize: 15, color: '#444', fontFamily: 'REM_Medium' },
  cardPost: { backgroundColor: '#FFF', padding: 15, marginHorizontal: 20, marginBottom: 15, borderRadius: 16, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  postHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  avatarPost: { width: 40, height: 40, borderRadius: 20, marginRight: 12 },
  nomeAutor: { fontFamily: 'REM_Bold', fontWeight: 'bold', fontSize: 15, color: '#111' },
  tagsContainer: { flexDirection: 'row', alignItems: 'center', marginTop: 2 },
  tagComunidade: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0E6FF', alignSelf: 'flex-start', paddingVertical: 3, paddingHorizontal: 10, borderRadius: 12, marginTop: 2 },
  txtTagComunidade: { fontSize: 11, color: '#8C77C2', fontFamily: 'REM_Medium', fontWeight: '600' },
  textoPost: { fontSize: 14, color: '#444', lineHeight: 20, marginBottom: 12, fontFamily: 'REM_Regular' },
  imagemPost: { width: '100%', height: 200, borderRadius: 12, marginBottom: 12 },
  postFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 5 },
  postFooterEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  postFooterDireita: { flexDirection: 'row', alignItems: 'center', gap: 15 },
  btnAcao: { padding: 2 },
  btnAcaoRow: { flexDirection: 'row', alignItems: 'center', gap: 5, padding: 2 },
  txtQtdAcao: { fontSize: 13, fontFamily: 'REM_Medium', color: '#666' },
  modalOverlay: { flex: 1, flexDirection: 'row' },
  fundoEscuro: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  painelMenu: { width: MENU_WIDTH, height: '100%', backgroundColor: '#FFFFFF', borderTopRightRadius: 30, borderBottomRightRadius: 30, paddingTop: 60, paddingHorizontal: 20, elevation: 15, shadowColor: '#000', shadowOffset: { width: 2, height: 0 }, shadowOpacity: 0.2, shadowRadius: 10 },
  perfilMenuContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, position: 'relative' },
  linhaRoxaPerfil: { position: 'absolute', left: -20, width: 4, height: '100%', backgroundColor: '#8C77C2', borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  fotoPerfilMenu: { width: 60, height: 60, borderRadius: 30, marginRight: 15, marginLeft: 10 },
  fotoPlaceholder: { backgroundColor: '#C6DFFF', justifyContent: 'center', alignItems: 'center' },
  infoPerfilMenu: { flex: 1, justifyContent: 'center' },
  nomePerfilMenu: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  textoVerPerfil: { fontSize: 13, color: '#999' },
  listaOpcoesMenu: { marginTop: 10 },
  itemMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, marginBottom: 3 },
  textoItemMenu: { fontFamily: 'REM_Bold', fontSize: 16, marginLeft: 10, fontWeight: '600', color: '#555' },
  modalAmigosOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalAmigosContent: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, height: '70%', padding: 20 },
  modalAmigosHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  modalAmigosTitulo: { fontSize: 20, fontFamily: 'REM_Bold', color: '#333' },
  itemAmigo: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  fotoAmigo: { width: 50, height: 50, borderRadius: 25, marginRight: 15 },
  nomeAmigo: { fontSize: 16, fontFamily: 'REM_Bold', color: '#333' },
  userAmigo: { fontSize: 14, color: '#666' },
  textoListaVazia: { textAlign: 'center', marginTop: 20, color: '#999' },
});
