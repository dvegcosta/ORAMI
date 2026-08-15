import React, { useState, useEffect } from 'react';
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
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useEstilosTema } from '../lib/tema';
import { Alert } from '../lib/popup';

export default function TelaMinhasComunidades({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { id_usuario } = route.params || {};
  
  const [comunidades, setComunidades] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [pesquisa, setPesquisa] = useState('');
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [novaComNome, setNovaComNome] = useState('');
  const [novaComDescr, setNovaComDescr] = useState('');
  const [novaComCapa, setNovaComCapa] = useState(null); 
  const [novaComPerfil, setNovaComPerfil] = useState(null); 
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarComunidades();
  }, []);

  const carregarComunidades = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase.rpc('sp_get_comunidades_criadas', {
        p_id_usuario: id_usuario
      });
      if (error) throw error;

      console.log("Comunidades carregadas:", data);
      
      setComunidades(data || []);
    } catch (error) {
      Alert.alert('Comunidades indisponíveis', 'Não foi possível carregar suas comunidades agora.');
    } finally {
      setCarregando(false);
    }
  };

  const selecionarImagem = async (tipo) => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissao.status !== 'granted') {
      Alert.alert('Galeria sem permissão', 'Precisamos de acesso à galeria para selecionar a imagem.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: tipo === 'capa' ? [16, 9] : [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets[0].base64) {
      if (tipo === 'capa') setNovaComCapa(resultado.assets[0].base64);
      else setNovaComPerfil(resultado.assets[0].base64);
    }
  };

    const criarComunidade = async () => {
    if (!novaComNome.trim() || !novaComDescr.trim()) {
        Alert.alert('Comunidade incompleta', 'Nome e descrição são obrigatórios para criar a comunidade.');
        return;
    }

    setSalvando(true);
    try {
        const limparBase64 = (str) => {
        if (!str) return null;
        return str.includes(',') ? str.split(',')[1] : str;
        };

        const { data, error } = await supabase.rpc('sp_criar_comunidade', {
        p_id_criador: id_usuario,
        p_nome: novaComNome.trim(),
        p_descr: novaComDescr.trim(),
        p_foto: limparBase64(novaComPerfil), 
        p_header: limparBase64(novaComCapa)  
        });

        if (error) throw error;

        Alert.alert('Comunidade criada', 'Sua nova comunidade já está pronta.');
        fecharModal();
        carregarComunidades(); 
    } catch (error) {
        console.error("Erro na procedure:", error);
        Alert.alert('Comunidade não criada', 'Não foi possível criar a comunidade agora.');
    } finally {
        setSalvando(false);
    }
};

  const fecharModal = () => {
    setModalVisivel(false);
    setNovaComNome('');
    setNovaComDescr('');
    setNovaComCapa(null);
    setNovaComPerfil(null);
  };

    const renderizarImagem = (imgData) => {
        if (!imgData) return null;
        if (typeof imgData === 'string' && (imgData.startsWith('http') || imgData.startsWith('data:image'))) {
        return { uri: imgData };
        }
        const base64Limpo = imgData.replace(/\s/g, '').replace(/\\/g, '');
        
        return { uri: `data:image/png;base64,${base64Limpo}` };
    };

  const comunidadesFiltradas = comunidades.filter(c => 
    c.nome_comunidade?.toLowerCase().includes(pesquisa.toLowerCase())
  );

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.headerLista}>
        <TouchableOpacity style={estilos.botaoVoltarCirculo} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#8C77C2" />
        </TouchableOpacity>
      </View>

      <View style={estilos.tituloContainer}>
        <Text style={estilos.tituloPrincipal}>Suas comunidades</Text>
      </View>

      <View style={estilos.containerRoxoBox}>
        <View style={estilos.barraControlesLista}>
          <View style={estilos.tagContador}>
            <Ionicons name="people" size={16} color="#FFF" style={{marginRight: 5}}/>
            <Text style={estilos.textoTagContador}>{comunidades.length} Criada(s)</Text>
          </View>
          <View style={estilos.botoesAcaoDir}>
            <TouchableOpacity style={estilos.botaoCirculoBranco} onPress={() => setModalVisivel(true)}>
              <Ionicons name="add" size={24} color="#8C77C2" />
            </TouchableOpacity>
            <TouchableOpacity style={estilos.botaoCirculoBranco} onPress={() => setMostrarPesquisa(!mostrarPesquisa)}>
              <Ionicons name="search" size={20} color="#8C77C2" />
            </TouchableOpacity>
          </View>
        </View>

        {mostrarPesquisa && (
          <TextInput
            style={estilos.inputPesquisa}
            placeholder="Pesquisar..."
            placeholderTextColor="#999"
            value={pesquisa}
            onChangeText={setPesquisa}
          />
        )}

        {carregando ? (
          <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 50 }} />
        ) : (
          <ScrollView contentContainerStyle={estilos.scrollContent} showsVerticalScrollIndicator={false}>
            {comunidadesFiltradas.length === 0 ? (
              <View style={estilos.vazioContainer}>
                <Text style={estilos.textoVazioRoxo}>Faça parte da essência da Orami criando sua primeira comunidade</Text>
              </View>
            ) : (
              comunidadesFiltradas.map((comunidade) => {
                const imgCapa = comunidade.header_comunidade;
                const imgPerfil = comunidade.foto_comunidade;
                const fonteCapa = renderizarImagem(imgCapa);
                const fontePerfil = renderizarImagem(imgPerfil);

                return (
                  <View key={comunidade.id_comunidade} style={estilos.cardSuaComunidadeContainer}>
                    <ImageBackground 
                      source={renderizarImagem(imgCapa)} 
                      style={estilos.cardSuaComunidadeBg}
                      imageStyle={estilos.cardSuaComunidadeImageStyle}
                      backgroundColor="#8C77C2"
                    >
                      <View style={estilos.cardOverlay}>
                        <View style={estilos.cardInfoRow}>
                          <View style={estilos.fotoPerfilContainer}>
                            {imgPerfil ? (
                              <Image 
                                source={renderizarImagem(imgPerfil)} 
                                style={estilos.fotoPerfilComunidade}
                              />
                            ) : (
                              <Ionicons name="people-circle" size={46} color="#CCC" />
                            )}
                          </View>
                          <View style={estilos.textosComunidade}>
                            <Text style={estilos.nomeSuaComunidade} numberOfLines={1}>
                                {comunidade.nome_comunidade}
                            </Text>
                            <Text style={estilos.membrosSuaComunidade}>
                                {comunidade.total_membros || 0} membro(s)
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity 
                          style={estilos.botaoAcessar}
                          onPress={() => navigation.navigate('TelaConfigComunidade', { id_comunidade: comunidade.id_comunidade, id_usuario })}
                        >
                          <Text style={estilos.textoBotaoAcessar}>Ver</Text>
                        </TouchableOpacity>
                      </View>
                    </ImageBackground>
                  </View>
                );
              })
            )}
          </ScrollView>
        )}
      </View>

      <Modal visible={modalVisivel} animationType="fade" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={estilos.modalOverlay}
        >
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={estilos.modalContent}>
              <View style={estilos.modalPopHeader}>
                <Text style={estilos.modalPopTitulo}>Nova Comunidade</Text>
                <TouchableOpacity onPress={fecharModal}>
                  <Ionicons name="close-circle" size={28} color="#CCC" />
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={estilos.labelInput}>Foto de Capa</Text>
                <TouchableOpacity style={estilos.popAreaCapa} onPress={() => selecionarImagem('capa')}>
                  {novaComCapa ? (
                    <Image source={renderizarImagem(novaComCapa)} style={estilos.popImgCapa} />
                  ) : (
                    <View style={estilos.popPlaceholderCapa}>
                      <Ionicons name="image-outline" size={30} color="#8C77C2" />
                      <Text style={estilos.popTextoPlaceholder}>Selecionar capa</Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={estilos.popRow}>
                   <TouchableOpacity style={estilos.popAreaPerfil} onPress={() => selecionarImagem('perfil')}>
                      {novaComPerfil ? (
                        <Image source={renderizarImagem(novaComPerfil)} style={estilos.popImgPerfil} />
                      ) : (
                        <Ionicons name="camera" size={24} color="#FFF" />
                      )}
                   </TouchableOpacity>
                   <View style={{flex: 1}}>
                      <Text style={estilos.labelInput}>Nome</Text>
                      <TextInput
                        style={estilos.popInput}
                        placeholder="Nome da comunidade"
                        value={novaComNome}
                        onChangeText={setNovaComNome}
                        maxLength={50}
                      />
                   </View>
                </View>

                <Text style={estilos.labelInput}>Descrição</Text>
                <TextInput
                  style={[estilos.popInput, estilos.popInputMultine]}
                  placeholder="Sobre o que é?"
                  value={novaComDescr}
                  onChangeText={setNovaComDescr}
                  multiline
                />

                <View style={estilos.popBotoesContainer}>
                  <TouchableOpacity style={estilos.popBotaoCancelar} onPress={fecharModal}>
                    <Text style={estilos.popTextoBotaoCancelar}>Cancelar</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    style={estilos.popBotaoCriar} 
                    onPress={criarComunidade}
                    disabled={salvando}
                  >
                    {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.popTextoBotaoCriar}>Criar Agora</Text>}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerLista: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'android' ? 60 : 30,
    marginBottom: 10,
  },
  botaoVoltarCirculo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tituloContainer: {
    alignItems: 'center',
    marginBottom: 20,
  },
  tituloPrincipal: {
    fontSize: 26,
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
    marginTop: -10,
  },
  containerRoxoBox: {
    flex: 1,
    backgroundColor: '#EAE6F7',
    borderRadius: 25,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    paddingTop: 25,
    marginBottom: 55,
  },
  barraControlesLista: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  tagContador: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8C77C2',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 20,
  },
  textoTagContador: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
    fontSize: 13,
  },
  botoesAcaoDir: {
    flexDirection: 'row',
  },
  botaoCirculoBranco: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#FFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    elevation: 4,
    shadowColor: '#8C77C2',
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  inputPesquisa: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    paddingHorizontal: 15,
    height: 45,
    fontFamily: 'REM_Regular',
    color: '#000',
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#D1C4E9',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  vazioContainer: {
    marginTop: 100,
    alignItems: 'center',
  },
  textoVazioRoxo: {
    color: '#8C77C2',
    fontFamily: 'REM_Medium',
    fontSize: 16,
    textAlign: 'center',
    opacity: 0.6,
  },
  cardSuaComunidadeContainer: {
    height: 150,
    marginBottom: 18,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 5,
  },
  cardSuaComunidadeBg: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  cardSuaComunidadeImageStyle: {
    borderRadius: 20,
  },
  cardOverlay: {
    backgroundColor: 'rgba(0,0,0,0.55)',
    padding: 15,
    flexDirection: 'row',
    alignItems: 'center',
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
  },
  nomeSuaComunidade: {
    fontSize: 18,
    color: '#FFF',
    fontFamily: 'REM_Bold',
  },
  membrosSuaComunidade: {
    fontSize: 13,
    color: '#DDD',
    fontFamily: 'REM_Regular',
  },
  botaoAcessar: {
    backgroundColor: '#8C77C2',
    paddingVertical: 8,
    paddingHorizontal: 18,
    borderRadius: 12,
  },
  textoBotaoAcessar: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
    fontSize: 14,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    backgroundColor: '#FFF',
    borderRadius: 30,
    padding: 20,
    maxHeight: '85%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  modalPopHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalPopTitulo: {
    fontSize: 22,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
  },
  labelInput: {
    fontFamily: 'REM_Bold',
    color: '#666',
    fontSize: 14,
    marginBottom: 8,
    marginLeft: 4,
  },
  popAreaCapa: {
    width: '100%',
    height: 120,
    backgroundColor: '#F5F2FC',
    borderRadius: 15,
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: '#EAE6F7',
    borderStyle: 'dashed',
    marginBottom: 15,
  },
  popImgCapa: {
    width: '100%',
    height: '100%',
  },
  popPlaceholderCapa: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  popTextoPlaceholder: {
    color: '#8C77C2',
    fontFamily: 'REM_Medium',
    fontSize: 12,
    marginTop: 5,
  },
  popRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginBottom: 15,
  },
  popAreaPerfil: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#8C77C2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    overflow: 'hidden',
    elevation: 3,
  },
  popImgPerfil: {
    width: '100%',
    height: '100%',
  },
  popInput: {
    backgroundColor: '#FAFAFA',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 45,
    fontFamily: 'REM_Regular',
    color: '#333',
  },
  popInputMultine: {
    height: 80,
    textAlignVertical: 'top',
    paddingTop: 12,
    marginBottom: 25,
  },
  popBotoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  popBotaoCancelar: {
    flex: 1,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  popTextoBotaoCancelar: {
    fontFamily: 'REM_Bold',
    color: '#999',
  },
  popBotaoCriar: {
    flex: 2,
    backgroundColor: '#8C77C2',
    height: 50,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
  },
  popTextoBotaoCriar: {
    fontFamily: 'REM_Bold',
    color: '#FFF',
    fontSize: 16,
  }
});
