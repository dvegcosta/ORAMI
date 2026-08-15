import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  Dimensions,
  Animated,
  Modal,
  Image,
  FlatList,
  ActivityIndicator
} from 'react-native';
import { Ionicons, Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useFocusEffect } from '@react-navigation/native';
import PostCard from '../lib/PostCard';
import { LinearGradient } from 'expo-linear-gradient';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

const { width, height } = Dimensions.get('window');
const MENU_WIDTH = width * 0.75; 

export default function TelaHome({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
 const { id_usuario } = route.params || {};

  const [pesquisa, setPesquisa] = useState('');
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
  
  const [menuVisivel, setMenuVisivel] = useState(false);
  const animacaoMenu = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const animacaoFundo = useRef(new Animated.Value(0)).current;

  const [abaAtiva, setAbaAtiva] = useState('paraVoce'); 
  const [posts, setPosts] = useState([]);
  const [loadingPosts, setLoadingPosts] = useState(false);
  const [notificacoesNaoLidas, setNotificacoesNaoLidas] = useState(0);

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const { data, error } = await supabase.rpc('obter_perfil_usuario', {
          p_id_usuario: id_usuario
        });
        if (data && !error) {
          setPerfil({
            nome: data.nome,
            fotoBase64: data.foto_base64
          });
        }
      } catch (error) {
        console.error("Erro ao carregar perfil na Home:", error);
      }
    };
    carregarPerfil();
  }, [id_usuario]);

const carregarPostsFeed = async () => {
  setLoadingPosts(true);
  try {
    const rpcName = abaAtiva === 'paraVoce' ? 'obter_posts_para_voce' : 'obter_posts_das_comunidades';
    const { data, error } = await supabase.rpc(rpcName, { p_id_usuario: id_usuario });
    if (error) throw error;
    setPosts(data || []);
  } catch (error) {
    console.error(`Erro ao carregar posts da aba ${abaAtiva}:`, error);
  } finally {
    setLoadingPosts(false);
  }
};

  const carregarContagemNotificacoes = async () => {
    if (!id_usuario) return;
    try {
      const { count, error } = await supabase
        .from('notificacoes')
        .select('id_notificacao', { count: 'exact', head: true })
        .eq('id_usuario_destino', id_usuario)
        .eq('visualizada', false);
      if (error) throw error;
      setNotificacoesNaoLidas(Number(count || 0));
    } catch (error) {
      console.error('Erro ao contar notificações não lidas:', error);
    }
  };

  useEffect(() => {
    carregarPostsFeed();
  }, [abaAtiva, id_usuario]);

  useFocusEffect(
    React.useCallback(() => {
      carregarContagemNotificacoes();

      if (!id_usuario) return undefined;

      let ativo = true;
      const topic = `orami-notificacoes-home-${id_usuario}`;
      let canal = null;

      // A Home permanece montada dentro do Tab Navigator. Ao trocar de aba,
      // um canal antigo pode ainda estar registrado no cliente Supabase.
      // Removemos somente esse tópico antes de criar o novo canal, evitando
      // qualquer tentativa de adicionar callbacks depois de subscribe().
      const canalExistente = supabase
        .getChannels()
        .find((item) => item?.topic === `realtime:${topic}`);

      if (canalExistente) {
        supabase.removeChannel(canalExistente);
      }

      canal = supabase.channel(topic);
      canal.on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notificacoes',
          filter: `id_usuario_destino=eq.${id_usuario}`,
        },
        () => {
          if (ativo) carregarContagemNotificacoes();
        }
      );
      canal.subscribe();

      return () => {
        ativo = false;
        if (canal) {
          supabase.removeChannel(canal);
          canal = null;
        }
      };
    }, [id_usuario])
  );

  const abrirMenu = () => {
    setMenuVisivel(true);
    Animated.parallel([
      Animated.timing(animacaoMenu, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animacaoFundo, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start();
  };

  const fecharMenu = () => {
    Animated.parallel([
      Animated.timing(animacaoMenu, {
        toValue: -MENU_WIDTH,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(animacaoFundo, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      })
    ]).start(() => {
      setMenuVisivel(false);
    });
  };

  const irParaTela = (nomeTela) => {
    fecharMenu();
    navigation.navigate(nomeTela, { id_usuario: id_usuario });
  };

  const handleDesconectar = () => {
    fecharMenu();
    Alert.alert('Desconectar', 'Tem certeza que deseja sair da sua conta agora?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => navigation.replace('TelaLogin'), style: 'destructive' }
    ]);
  };

  const handleCurtir = async (id_post) => {
  try {
    const { data: novoStatus, error } = await supabase.rpc('alternar_curtida_post', {
      p_id_post: id_post,
      p_id_usuario: id_usuario
    });
    if (error) throw error;
    setPosts(prevPosts => prevPosts.map(post => {
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
      p_id_usuario: id_usuario
    });
    if (error) throw error;
    setPosts(prevPosts => prevPosts.map(post => {
      if (post.id_post === id_post) {
        return { ...post, is_salvo: novoStatus };
      }
      return post;
    }));
  } catch (error) {
    console.error("Erro ao salvar:", error);
  }
};

  const handleComentar = (id_post) => {
    navigation.navigate('TelaPost', { 
      id_post: id_post,
      id_usuario_logado: id_usuario,
      focarComentario: true 
    });
  };

  const menuItems = [
    { icone: 'accessibility-outline', texto: 'Acessibilidade', acao: () => irParaTela('TelaAcessibilidade') },
    { icone: 'bookmark-outline', texto: 'Itens salvos', acao: () => irParaTela('TelaItensSalvos') },
    { icone: 'lock-closed-outline', texto: 'Segurança e Privacidade', acao: () => irParaTela('TelaSegurancaPrivacidade') },
    { icone: 'help-circle-outline', texto: 'Central de ajuda', acao: () => irParaTela('TelaCentralAjuda') },
    { icone: 'book-outline', texto: 'Manual de uso', acao: () => irParaTela('TelaManualUso') },
    { icone: 'log-out-outline', texto: 'Desconectar', cor: '#FF6B6B', acao: handleDesconectar },
  ];

  return (
    <SafeAreaView style={estilos.telaPrincipal}>
      
      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
          <TouchableOpacity onPress={abrirMenu} style={estilos.iconeBotao}>
            <Ionicons name="menu" size={28} color="#8C77C2" />
          </TouchableOpacity>
          <Text style={estilos.tituloHeader}>Social</Text>
        </View>

        <View style={estilos.headerDireita}>
          <TouchableOpacity
            style={[estilos.iconeBotao, { position: 'relative' }]}
            onPress={() => navigation.navigate('TelaNotificacao', { id_usuario_logado: id_usuario })}
          >
            <Ionicons name="notifications" size={24} color="#8C77C2" />
            {notificacoesNaoLidas > 0 && (
              <View
                style={{
                  position: 'absolute',
                  top: 0,
                  right: 0,
                  minWidth: 17,
                  height: 17,
                  paddingHorizontal: 4,
                  borderRadius: 9,
                  backgroundColor: '#FF3B30',
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: cores.fundoAlternativo || '#FFF',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 9, fontWeight: '800', lineHeight: 11 }}>
                  {notificacoesNaoLidas > 50 ? '50+' : notificacoesNaoLidas}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          <TouchableOpacity style={estilos.iconeBotao}>
            <Ionicons name="chatbubble-ellipses" size={32} color="#8C77C2" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={estilos.pesquisaContainer}>
        <Feather name="search" size={20} color="#BDBDBD" style={estilos.iconePesquisa} />
        <TextInput
          style={estilos.inputPesquisa}
          placeholder="Pesquisar"
          placeholderTextColor="#BDBDBD"
          value={pesquisa}
          onChangeText={setPesquisa}
        />
      </View>

      <View style={estilos.toggleContainer}>
        <TouchableOpacity
          style={[estilos.toggleButton, abaAtiva === 'paraVoce' && estilos.toggleButtonActive]}
          onPress={() => setAbaAtiva('paraVoce')}
        >
          <Text style={[estilos.toggleText, abaAtiva === 'paraVoce' && estilos.toggleTextActive]}>
            Para você
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[estilos.toggleButton, abaAtiva === 'comunidades' && estilos.toggleButtonActive]}
          onPress={() => setAbaAtiva('comunidades')}
        >
          <Text style={[estilos.toggleText, abaAtiva === 'comunidades' && estilos.toggleTextActive]}>
            Comunidades
          </Text>
        </TouchableOpacity>
      </View>

      {loadingPosts ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" color="#8C77C2" />
        </View>
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id_post.toString()}
          renderItem={({ item }) => (
          <PostCard
            item={item}
            estilos={estilos}
            cores={cores}
            navigation={navigation}
            idUsuario={id_usuario}
            onCurtir={handleCurtir}
            onSalvar={handleSalvar}
            variant="padrao"
          />
        )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 100 }}
          refreshing={loadingPosts}
          onRefresh={carregarPostsFeed}
          ListEmptyComponent={
            <Text style={estilos.textoListaVazia}>
              Nenhum post encontrado.
            </Text>
          }
        />
      )}

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
                onPress={() => {
                    navigation.navigate('TelaPerfil', { id_usuario: id_usuario }); 
                    fecharMenu();
                  }}
              >
                <View style={estilos.linhaRoxaPerfil} />
                
                {perfil.fotoBase64 ? (
                  <Image source={{ uri: `data:image/jpeg;base64,${perfil.fotoBase64}` }} style={estilos.fotoPerfilMenu} />
                ) : (
                  <View style={[estilos.fotoPerfilMenu, estilos.fotoPlaceholder]}>
                    <Ionicons name="person" size={30} color="#FFF" />
                  </View>
                )}

                <View style={estilos.infoPerfilMenu}>
                  <Text style={estilos.nomePerfilMenu} numberOfLines={1}>{perfil.nome}</Text>
                  <Text style={estilos.textoVerPerfil}>Ver perfil</Text>
                </View>

                <Ionicons name="chevron-forward" size={20} color="#999" />
              </TouchableOpacity>

              <View style={estilos.listaOpcoesMenu}>
                {menuItems.map((item, index) => (
                  <TouchableOpacity 
                    key={index} 
                    style={estilos.itemMenu} 
                    activeOpacity={0.7}
                    onPress={item.acao ? item.acao : () => {}}
                  >
                    <Ionicons name={item.icone} size={22} color={item.cor || cores.icone} />
                    <Text style={[estilos.textoItemMenu, item.cor && { color: item.cor }]}>
                      {item.texto}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

            </Animated.View>
          </View>
        </Modal>
      )}
      <TouchableOpacity 
        style={estilos.fabContainer} 
        activeOpacity={0.8}
        onPress={() => navigation.navigate('TelaCriarPost', { id_usuario })}
      >
        <LinearGradient 
          colors={['#9280be', '#886ecc']} 
          style={estilos.fabGradient}
        >
          <Ionicons name="add" size={32} color="#FFFFFF" />
        </LinearGradient>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  telaPrincipal: {
    flex: 1,
    backgroundColor: '#FAFAFC', 
  },
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 10,
  },
  headerEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDireita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15, 
  },
  tituloHeader: {
    fontSize: 22,
    fontFamily: 'REM_Bold', 
    color: '#8C77C2',
    marginLeft: 10,
    fontWeight: 'bold', 
  },
  iconeBotao: {
    padding: 5,
  },
  pesquisaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginTop: 5,
    height: 45,
    borderRadius: 25,
    paddingHorizontal: 15,
    elevation: 2, 
    shadowColor: '#000', 
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  iconePesquisa: {
    marginRight: 10,
  },
  inputPesquisa: {
    flex: 1,
    fontSize: 15,
    color: '#444',
    fontFamily: 'REM_Medium',
  },

  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#EAE2FF',
    borderRadius: 25,
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 15,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  toggleButtonActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleText: {
    fontFamily: 'REM_Medium',
    fontSize: 14,
    color: '#8C77C2',
  },
  toggleTextActive: {
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
  },

  modalOverlay: {
    flex: 1,
    flexDirection: 'row',
  },
  fundoEscuro: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)', 
  },
  painelMenu: {
    width: MENU_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 60, 
    paddingHorizontal: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  perfilMenuContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    position: 'relative',
  },
  linhaRoxaPerfil: {
    position: 'absolute',
    left: -20,
    width: 4,
    height: '100%',
    backgroundColor: '#8C77C2',
    borderTopRightRadius: 5,
    borderBottomRightRadius: 5,
  },
  fotoPerfilMenu: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    marginLeft: 10, 
  },
  fotoPlaceholder: {
    backgroundColor: '#C6DFFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  infoPerfilMenu: {
    flex: 1,
    justifyContent: 'center',
  },
  nomePerfilMenu: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  textoVerPerfil: {
    fontSize: 13,
    color: '#999',
  },
  listaOpcoesMenu: {
    marginTop: 10,
  },
  itemMenu: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    marginBottom: 3,
  },
  textoItemMenu: {
    fontFamily: 'REM_Bold',
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '600',
    color: '#555',
  },
  fabContainer: {
    position: 'absolute',
    right: 30,
    bottom: 130,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderRadius: 30,
  },
  fabGradient: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardPost: {
    backgroundColor: '#FFF',
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    borderRadius: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12
  },
  avatarPost: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12
  },
  nomeAutor: {
    fontFamily: 'REM_Bold',
    fontSize: 15,
    color: '#111'
  },
  tagsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2
  },
  tagComunidade: {
    backgroundColor: '#F0E6FF',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 2,
    paddingHorizontal: 8,
    borderRadius: 10,
    alignSelf: 'flex-start'
  },
  txtTagComunidade: {
    fontSize: 11,
    color: '#8C77C2',
    fontFamily: 'REM_Medium',
    marginLeft: 3
  },
  textoPost: {
    fontSize: 14,
    color: '#444',
    lineHeight: 20,
    marginBottom: 12,
    fontFamily: 'REM_Regular'
  },
  imagemPost: {
    width: '100%',
    height: 200,
    borderRadius: 12,
    marginBottom: 12
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5
  },
  postFooterEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  postFooterDireita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15
  },
  btnAcao: {
    padding: 2
  },
  btnAcaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    padding: 2
  },
  txtQtdAcao: {
    fontSize: 13,
    fontFamily: 'REM_Medium',
    color: '#666'
  },
  textoListaVazia: {
    textAlign: 'center',
    color: '#888',
    marginTop: 20
  }
});
