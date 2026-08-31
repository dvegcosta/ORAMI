import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity, TextInput,
  Image, Modal, ScrollView, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useEstilosTema } from '../lib/tema';
import { Alert } from '../lib/popup';

export default function TelaCriarPost({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { id_usuario } = route.params;
  const [perfil, setPerfil] = useState({ nome: '', username: '', foto: null });
  const [texto, setTexto] = useState('');
  const [imagem, setImagem] = useState(null);
  const [permitirCurtidas, setPermitirCurtidas] = useState(true);
  const [permitirComentarios, setPermitirComentarios] = useState(true);
  const [comunidades, setComunidades] = useState([]);
  const [comunidadesSelecionadas, setComunidadesSelecionadas] = useState([]);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    carregarDadosIniciais();
  }, []);

  const carregarDadosIniciais = async () => {
    setCarregando(true);
    try {
      const { data: dataPerfil } = await supabase.rpc('obter_perfil_usuario', { p_id_usuario: id_usuario });
      if (dataPerfil) {
        setPerfil({
          nome: dataPerfil.nome,
          username: dataPerfil.username,
          foto: dataPerfil.foto_base64
        });
      }

      const { data: dataComunidades } = await supabase.rpc('obter_comunidades_usuario', { p_id_usuario: id_usuario });
      if (dataComunidades) {
        setComunidades(dataComunidades);
      }
    } catch (error) {
      console.error("Erro ao carregar comunidades:", error);
    } finally {
      setCarregando(false);
    }
  };

  const selecionarImagem = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permissao.granted === false) return;

    let resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!resultado.canceled) {
      setImagem(resultado.assets[0]); 
    }
  };

  const toggleComunidade = (id_comunidade) => {
    setComunidadesSelecionadas(prev =>
      prev.includes(id_comunidade)
        ? prev.filter(id => id !== id_comunidade)
        : [...prev, id_comunidade]
    );
  };

  const handlePublicar = async () => {
    if (comunidadesSelecionadas.length === 0) {
      Alert.alert('Escolha o público', 'Selecione ao menos uma comunidade para publicar.');
      return;
    }
    if (!texto.trim() && !imagem) {
      Alert.alert('Post vazio', 'Escreva uma mensagem ou selecione uma imagem antes de publicar.');
      return;
    }

    setEnviando(true);
    try {
      const { error } = await supabase.rpc('sp_fluxo_criar_post', {
        p_autor: id_usuario,
        p_conteudo: texto,
        p_img: imagem ? imagem.base64 : null,
        p_comunidades: comunidadesSelecionadas,
        p_permite_curtida: permitirCurtidas,
        p_permite_comentario: permitirComentarios
      });

      if (error) throw error;

      Alert.alert('Publicação criada', 'Seu post já está disponível na comunidade.', [{ text: 'OK', onPress: () => navigation.goBack() }]);
    } catch (error) {
      console.error(error);
      Alert.alert('Publicação não concluída', 'Não foi possível publicar agora. Tente novamente em instantes.');
    } finally {
      setEnviando(false);
    }
  };

  const renderAvataresSelecionados = () => {
    if (comunidadesSelecionadas.length === 0) {
        return (
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={estilos.txtBtnComunidades}>Selecionar comunidades</Text>
            <Ionicons name="chevron-down" size={16} color="#FFF" style={{ marginLeft: 8, marginTop: 2 }} />
          </View>
        );
    }
    
    const selecionadasFull = comunidades.filter(c => comunidadesSelecionadas.includes(c.id_comunidade));
    
    return (
      <View style={estilos.avataresRow}>
        {selecionadasFull.slice(0, 3).map((c, index) => (
          <View key={c.id_comunidade} style={[estilos.miniAvatarContainer, { marginLeft: index > 0 ? -12 : 0 }]}>
            {c.foto_comunidade ? (
              <Image source={{ uri: `data:image/jpeg;base64,${c.foto_comunidade}` }} style={estilos.miniAvatar} />
            ) : (
              <View style={[estilos.miniAvatar, { backgroundColor: '#E0E0E0' }]} />
            )}
          </View>
        ))}
        <Text style={[estilos.txtBtnComunidades, { marginLeft: 8 }]}>
          {selecionadasFull.length} selecionada(s)
        </Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="close" size={24} color="#8C77C2" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeader}>Nova publicação</Text>
      </View>

      <ScrollView style={estilos.conteudo}>
        <View style={estilos.perfilRow}>
          <View style={estilos.perfilInfo}>
            {perfil.foto ? (
              <Image source={{ uri: `data:image/jpeg;base64,${perfil.foto}` }} style={estilos.fotoPerfil} />
            ) : (
              <View style={[estilos.fotoPerfil, { backgroundColor: '#C6DFFF' }]} />
            )}
            <View>
              <Text style={estilos.nomePerfil}>{perfil.nome}</Text>
              <Text style={estilos.usernamePerfil}>{perfil.username}</Text>
            </View>
          </View>
          <TouchableOpacity style={estilos.btnPublicar} onPress={handlePublicar} disabled={enviando}>
            <Text style={estilos.txtPublicar}>{enviando ? '...' : 'Publicar'}</Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={estilos.inputTexto}
          placeholder="O que está acontecendo?"
          multiline
          value={texto}
          onChangeText={setTexto}
        />

        <TouchableOpacity style={estilos.areaImagem} onPress={selecionarImagem}>
          {imagem ? (
            <Image source={{ uri: imagem.uri }} style={estilos.imagemSelecionada} />
          ) : (
            <Ionicons name="image-outline" size={40} color="#E0E0E0" />
          )}
        </TouchableOpacity>

        <View style={estilos.opcoesContainer}>
          <TouchableOpacity style={estilos.opcaoRow} onPress={() => setPermitirCurtidas(!permitirCurtidas)}>
            <Ionicons name={permitirCurtidas ? "checkbox" : "square-outline"} size={22} color="#8C77C2" />
            <Text style={estilos.textoOpcao}>Permitir curtidas</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.opcaoRow} onPress={() => setPermitirComentarios(!permitirComentarios)}>
            <Ionicons name={permitirComentarios ? "checkbox" : "square-outline"} size={22} color="#8C77C2" />
            <Text style={estilos.textoOpcao}>Permitir comentários</Text>
          </TouchableOpacity>
        </View>

        <Text style={estilos.labelSecao}>Público:</Text>
        <TouchableOpacity style={estilos.btnAbrirComunidades} onPress={() => setModalVisivel(true)}>
          {renderAvataresSelecionados()}
        </TouchableOpacity>
      </ScrollView>

      <Modal visible={modalVisivel} transparent animationType="slide">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContent}>
            <View style={estilos.modalHeaderRow}>
              <Text style={estilos.modalTitle}>Selecione as Comunidades</Text>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Ionicons name="close-circle" size={28} color="#8C77C2" />
              </TouchableOpacity>
            </View>

            <ScrollView style={estilos.listaComunidades}>
              {comunidades.map((com) => (
                <TouchableOpacity
                  key={com.id_comunidade}
                  style={estilos.itemComunidade}
                  onPress={() => toggleComunidade(com.id_comunidade)}
                >
                  <View style={estilos.infoComunidadeLista}>
                    {com.foto_comunidade ? (
                      <Image 
                        source={{ uri: `data:image/jpeg;base64,${com.foto_comunidade}` }} 
                        style={estilos.fotoComunidade} 
                      />
                    ) : (
                      <View style={[estilos.fotoComunidade, { backgroundColor: '#EEE', justifyContent: 'center', alignItems: 'center' }]}>
                        <Ionicons name="people" size={20} color="#CCC" />
                      </View>
                    )}
                    <Text style={estilos.nomeComunidadeLista}>{com.nome_comunidade}</Text>
                  </View>
                  <Ionicons
                    name={comunidadesSelecionadas.includes(com.id_comunidade) ? "checkmark-circle" : "ellipse-outline"}
                    size={24}
                    color="#8C77C2"
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#FAFAFC' 
  },
  header: { 
    flexDirection: 'row',
     alignItems: 'center', 
     padding: 20, 
     paddingTop: 60 
  },
  tituloHeader: { 
    fontSize: 20, 
    color: '#8C77C2',
    marginLeft: 15, 
    fontWeight: 'bold' 
  },
  conteudo: { 
    flex: 1, 
    padding: 20, 
    margin: 10, 
    backgroundColor: '#F4F2FA', 
    borderRadius: 15, 
    marginBottom: 60 
  },
  perfilRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  perfilInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  fotoPerfil: { 
    width: 45, 
    height: 45, 
    borderRadius: 22.5, 
    marginRight: 10 
  },
  nomePerfil: { 
    fontSize: 16, 
    fontWeight: 'bold',
    color: '#000' 
  },
  usernamePerfil: { 
    fontSize: 12, 
    color: '#888' 
  },
  btnPublicar: { 
    backgroundColor: '#8C77C2', 
    borderRadius: 20, 
    paddingVertical: 6, 
    paddingHorizontal: 20 
  },
  txtPublicar: { 
    color: '#FFF', 
    fontWeight: 'bold' 
  },
  inputTexto: { 
    fontSize: 18, 
    color: '#333', 
    minHeight: 100, 
    textAlignVertical: 'top', 
    borderLeftColor: '#8C77C2', 
    borderLeftWidth: 2, 
    paddingLeft: 15 
  },
  areaImagem: { 
    width: '100%', 
    height: 200, 
    backgroundColor: '#F0F0F0', 
    borderRadius: 15, 
    justifyContent: 'center', 
    alignItems: 'center', 
    marginVertical: 20 
  },
  imagemSelecionada: { 
    width: '100%', 
    height: '100%', 
    borderRadius: 15 
  },
  opcoesContainer: { 
    gap: 10, 
    marginBottom: 20 
  },
  opcaoRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  textoOpcao: { 
    marginLeft: 8, 
    color: '#666' 
  },
  labelSecao: { 
    fontWeight: 'bold', 
    marginBottom: 10, 
    color: '#444' 
  },
  btnAbrirComunidades: { 
    backgroundColor: '#8C77C2', 
    padding: 12, 
    borderRadius: 15, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  txtBtnComunidades: { 
    color: '#FFF', 
    fontWeight: '600' 
  },
  avataresRow: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  miniAvatarContainer: { 
    width: 24, 
    height: 24, 
    borderRadius: 12, 
    borderWidth: 1, 
    borderColor: '#FFF', 
    overflow: 'hidden' 
  },
  miniAvatar: { 
    width: '100%', 
    height: '100%' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContent: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 25, 
    height: '70%' 
  },
  modalHeaderRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginBottom: 20 
  },
  modalTitle: { 
    fontSize: 18, 
    fontWeight: 'bold', 
    color: '#8C77C2' 
  },
  itemComunidade: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingVertical: 15, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  infoComunidadeLista: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  fotoComunidade: { 
    width: 45, 
    height: 45, 
    borderRadius: 12, 
    marginRight: 15 
  },
  nomeComunidadeLista: { 
    fontSize: 16, 
    color: '#333', 
    fontWeight: '500' 
  }
});
