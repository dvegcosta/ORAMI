import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
  ImageBackground,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.75;

export default function TelaComunidades({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};
  const [pesquisa, setPesquisa] = useState('');
  const [suasComunidades, setSuasComunidades] = useState([]);
  const [sugestoes, setSugestoes] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
  const scrollRef = useRef(null);
  const suasComunidadesRef = useRef(0);
  const sugestoesRef = useRef(0);
  
  const [menuVisivel, setMenuVisivel] = useState(false);
  const animacaoMenu = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const animacaoFundo = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    carregarDados();
    carregarPerfil();
  }, []);

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
      console.error("Erro ao carregar perfil nas Comunidades:", error);
    }
  };

  const carregarDados = async () => {
    setCarregando(true);
    try {
      const { data: dataSuas, error: errorSuas } = await supabase.rpc('sp_get_suas_comunidades', {
        p_id_usuario: id_usuario
      });
      if (errorSuas) throw errorSuas;

      console.log('ID USUARIO:', id_usuario);

      const { data: dataSugestoes, error: errorSugestoes } = await supabase.rpc('sp_get_sugestoes_comunidades', {
        p_id_usuario: id_usuario
      });
      if (errorSugestoes) throw errorSugestoes;

      setSuasComunidades(dataSuas || []);
      setSugestoes(dataSugestoes || []);
    } catch (error) {
      Alert.alert('Comunidades indisponíveis', `Não foi possível carregar as comunidades: ${error.message}`);
    } finally {
      setCarregando(false);
    }
  };

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

  const menuItems = [
    { icone: 'accessibility-outline', texto: 'Acessibilidade', acao: () => irParaTela('TelaAcessibilidade') },
    { icone: 'bookmark-outline', texto: 'Itens salvos', acao: () => irParaTela('TelaItensSalvos') },
    { icone: 'lock-closed-outline', texto: 'Segurança e Privacidade', acao: () => irParaTela('TelaSegurancaPrivacidade') },
    { icone: 'help-circle-outline', texto: 'Central de ajuda', acao: () => irParaTela('TelaCentralAjuda') },
    { icone: 'book-outline', texto: 'Manual de uso', acao: () => irParaTela('TelaManualUso') },
    { icone: 'log-out-outline', texto: 'Desconectar', cor: '#FF6B6B', acao: handleDesconectar },
  ];

  const irParaSuasComunidades = () => {
    navigation.navigate('TelaMinhasComunidades', { id_usuario });
  };

  const irParaSugestoes = () => {
    scrollRef.current?.scrollTo({ y: sugestoesRef.current, animated: true });
  };

  const suasComunidadesFiltradas = suasComunidades.filter(c =>
    c.nome_comunidade.toLowerCase().includes(pesquisa.toLowerCase())
  );

  const sugestoesFiltradas = sugestoes.filter(c =>
    c.nome_comunidade.toLowerCase().includes(pesquisa.toLowerCase())
  );

  const renderizarImagem = (base64String) => {
    if (base64String) {
      return { uri: `data:image/jpeg;base64,${base64String}` };
    }
    return null;
  };

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <View style={estilos.tituloContainer}>
          <TouchableOpacity onPress={abrirMenu} style={{ padding: 5 }}>
            <Ionicons name="menu" size={28} color="#8C77C2" />
          </TouchableOpacity>
          <Text style={estilos.tituloPrincipal}>Comunidades</Text>
        </View>
      </View>

      <View style={estilos.pesquisaContainer}>
        <Ionicons name="search" size={20} color="#999" style={estilos.iconePesquisa} />
        <TextInput
          style={estilos.inputPesquisa}
          placeholder="Pesquisar comunidade..."
          placeholderTextColor="#999"
          value={pesquisa}
          onChangeText={setPesquisa}
        />
      </View>

      <View style={estilos.botoesAcaoContainer}>
        <TouchableOpacity style={estilos.botaoCriar} onPress={irParaSuasComunidades}>
          <Ionicons name="people" size={20} color="#FFF" />
          <Text style={estilos.textoBotaoCriar}>Suas comunidades</Text>
        </TouchableOpacity>
        <TouchableOpacity style={estilos.botaoFiltro} onPress={irParaSugestoes}>
          <Text style={estilos.textoBotaoFiltro}>Sugestões</Text>
        </TouchableOpacity>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 50 }} />
      ) : (
        <ScrollView
          ref={scrollRef}
          contentContainerStyle={estilos.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View onLayout={(event) => { suasComunidadesRef.current = event.nativeEvent.layout.y; }}>
            <Text style={estilos.secaoTitulo}>Comunidades que você participa</Text>
            {suasComunidadesFiltradas.length === 0 ? (
              <Text style={estilos.textoVazio}>Nenhuma comunidade encontrada.</Text>
            ) : (
              suasComunidadesFiltradas.map((comunidade) => (
                <View key={comunidade.id_comunidade.toString()} style={estilos.cardSuaComunidadeContainer}>
                  <ImageBackground
                    source={renderizarImagem(comunidade.header_comunidade)}
                    style={estilos.cardSuaComunidadeBg}
                    imageStyle={estilos.cardSuaComunidadeImageStyle}
                    backgroundColor="#E8E8E8"
                  >
                    <View style={estilos.cardOverlay}>
                      <View style={estilos.cardInfoRow}>
                        <View style={estilos.fotoPerfilContainer}>
                          {comunidade.foto_comunidade ? (
                            <Image
                              source={renderizarImagem(comunidade.foto_comunidade)}
                              style={estilos.fotoPerfilComunidade}
                            />
                          ) : (
                            <Ionicons name="people-circle" size={50} color="#CCC" />
                          )}
                        </View>
                        <View style={estilos.textosComunidade}>
                          <Text style={estilos.nomeSuaComunidade} numberOfLines={1}>
                            {comunidade.nome_comunidade}
                          </Text>
                          <Text style={estilos.membrosSuaComunidade}>
                            {comunidade.total_membros} membro(s)
                          </Text>
                        </View>
                      </View>
                      <TouchableOpacity
                        style={estilos.botaoAcessar}
                        onPress={() => navigation.navigate('TelaComunidade', { id_comunidade: comunidade.id_comunidade, id_usuario: id_usuario })}
                      >
                        <Text style={estilos.textoBotaoAcessar}>Acessar</Text>
                      </TouchableOpacity>
                    </View>
                  </ImageBackground>
                </View>
              ))
            )}
          </View>

          <View
            style={estilos.secaoContainer}
            onLayout={(event) => { sugestoesRef.current = event.nativeEvent.layout.y; }}
          >
            <Text style={estilos.secaoTitulo}>Sugestões para você</Text>
            {sugestoesFiltradas.length === 0 ? (
              <Text style={estilos.textoVazio}>Nenhuma sugestão no momento.</Text>
            ) : (
              sugestoesFiltradas.map((comunidade) => (
              <TouchableOpacity onPress={() => navigation.navigate('TelaComunidade', { id_comunidade: comunidade.id_comunidade, id_usuario: id_usuario })}>
                <View key={comunidade.id_comunidade} style={estilos.cardSugestao}>
                  <View style={estilos.cardInfoRow}>
                      <View style={estilos.fotoPerfilContainerSugestao}>
                        {comunidade.foto_comunidade ? (
                          <Image
                            source={renderizarImagem(comunidade.foto_comunidade)}
                            style={estilos.fotoPerfilSugestao}
                          />
                        ) : (
                          <Ionicons name="people-circle" size={40} color="#CCC" />
                        )}
                      </View>
                    <View style={estilos.textosComunidade}>
                      <Text style={estilos.nomeSugestao} numberOfLines={1}>
                        {comunidade.nome_comunidade}
                      </Text>
                      <Text style={estilos.membrosSugestao}>
                        {comunidade.total_membros} membro(s)
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    style={estilos.botaoParticipar}
                    onPress={() => navigation.navigate('TelaComunidade', { id_comunidade: comunidade.id_comunidade, id_usuario: id_usuario })}
                  >
                    <Text style={estilos.textoBotaoParticipar}>Ver comunidade</Text>
                  </TouchableOpacity>
                </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </ScrollView>
      )}

      {menuVisivel && (
        <Modal transparent visible={menuVisivel} animationType="none" onRequestClose={fecharMenu}>
          <View style={estilos.modalOverlayMenu}>
            <Animated.View style={[estilos.fundoEscuroMenu, { opacity: animacaoFundo }]}>
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
                    onPress={item.acao ? item.acao : () => { }}
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
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
    paddingBottom: Platform.OS === 'android' ? 80 : 0,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: Platform.OS === 'android' ? 55 : 30,
    paddingHorizontal: 20,
    marginBottom: 18,
  },
  tituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tituloPrincipal: {
    fontSize: 22,
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
  },
  pesquisaContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 25,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    height: 45,
    marginBottom: 22,
  },
  iconePesquisa: {
    marginRight: 10,
  },
  inputPesquisa: {
    flex: 1,
    fontSize: 15,
    fontFamily: 'REM_Regular',
    color: '#333',
  },
  botoesAcaoContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 20,
    alignItems: 'center',
  },
  botaoCriar: {
    flexDirection: 'row',
    backgroundColor: '#8C77C2',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignItems: 'center',
    marginRight: 10,
  },
  textoBotaoCriar: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
    marginLeft: 5,
    fontSize: 14,
  },
  botaoFiltro: {
    backgroundColor: '#E8E4F2',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    marginRight: 10,
  },
  textoBotaoFiltro: {
    color: '#8C77C2',
    fontFamily: 'REM_Medium',
    fontSize: 13,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  secaoContainer: {
    marginTop: 25,
  },
  secaoTitulo: {
    fontSize: 18,
    color: '#333',
    fontFamily: 'REM_Bold',
    marginBottom: 15,
  },
  textoVazio: {
    color: '#999',
    fontFamily: 'REM_Regular',
    fontStyle: 'italic',
    marginBottom: 20,
  },
  cardSuaComunidadeContainer: {
    height: 140,
    marginBottom: 20,
    borderRadius: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 4,
  },
  cardSuaComunidadeBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardSuaComunidadeImageStyle: {
    borderRadius: 15,
  },
  cardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderBottomLeftRadius: 15,
    borderBottomRightRadius: 15,
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fotoPerfilContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  fotoPerfilComunidade: {
    width: '100%',
    height: '100%',
  },
  textosComunidade: {
    flex: 1,
    paddingRight: 10,
  },
  nomeSuaComunidade: {
    fontSize: 16,
    color: '#FFF',
    fontFamily: 'REM_Bold',
    marginBottom: 2,
  },
  membrosSuaComunidade: {
    fontSize: 13,
    color: '#EEE',
    fontFamily: 'REM_Regular',
  },
  botaoAcessar: {
    backgroundColor: '#8C77C2',
    paddingVertical: 6,
    paddingHorizontal: 15,
    borderRadius: 15,
  },
  textoBotaoAcessar: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
    fontSize: 13,
  },
  cardSugestao: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 12,
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  fotoPerfilContainerSugestao: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    overflow: 'hidden',
  },
  fotoPerfilSugestao: {
    width: '100%',
    height: '100%',
  },
  nomeSugestao: {
    fontSize: 15,
    color: '#333',
    fontFamily: 'REM_Bold',
    marginBottom: 2,
  },
  membrosSugestao: {
    fontSize: 12,
    color: '#777',
    fontFamily: 'REM_Regular',
  },
  botaoParticipar: {
    borderWidth: 1.5,
    borderColor: '#8C77C2',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 15,
  },
  textoBotaoParticipar: {
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
    fontSize: 12,
  },
  modalOverlayMenu: {
    flex: 1,
    flexDirection: 'row',
  },
  fundoEscuroMenu: {
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
    fontFamily: 'REM_Bold',
    color: '#333',
    marginBottom: 4,
  },
  textoVerPerfil: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'REM_Regular',
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
    color: '#555',
  },
});
