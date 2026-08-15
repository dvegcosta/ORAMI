import React, { useState } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity, 
  TextInput, Image, ScrollView, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useEstilosTema } from '../lib/tema';
import { Alert } from '../lib/popup';

export default function TelaEditarComunidade({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { comunidade } = route.params;

  const [nome, setNome] = useState(comunidade.nome_comunidade);
  const [desc, setDesc] = useState(comunidade.descr_comunidade);
  const [fotoPerfilBase64, setFotoPerfilBase64] = useState(comunidade.foto_base64);
  const [fotoCapaBase64, setFotoCapaBase64] = useState(comunidade.header_base64);
  const [salvando, setSalvando] = useState(false);

  const selecionarImagem = async (tipo) => {
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
      aspect: tipo === 'capa' ? [16, 9] : [1, 1],
    });

    if (!result.canceled) {
      if (tipo === 'capa') setFotoCapaBase64(result.assets[0].base64);
      else setFotoPerfilBase64(result.assets[0].base64);
    }
  };

  const handleSalvar = async () => {
    if (!nome.trim() || !desc.trim()) {
      Alert.alert('Comunidade incompleta', 'Nome e descrição são obrigatórios para salvar.');
      return;
    }

    setSalvando(true);
    try {
      const { error } = await supabase.rpc('atualizar_comunidade', {
        p_id_comunidade: comunidade.id_comunidade,
        p_nome: nome,
        p_descr: desc,
        p_foto_base64: fotoPerfilBase64,
        p_header_base64: fotoCapaBase64
      });

      if (error) throw error;
      
      Alert.alert('Comunidade atualizada', 'As alterações foram salvas com sucesso.', [
        { text: 'OK', onPress: () => navigation.goBack() }
      ]);
    } catch (error) {
      console.error(error);
      Alert.alert('Alterações não salvas', 'Não foi possível salvar as alterações agora.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#8C77C2" />
        </TouchableOpacity>
        <Text style={estilos.tituloHeader}>Editar Comunidade</Text>
        <TouchableOpacity onPress={handleSalvar} disabled={salvando}>
          {salvando ? <ActivityIndicator size="small" color="#8C77C2" /> : <Text style={estilos.btnSalvar}>Salvar</Text>}
        </TouchableOpacity>
      </View>

      <ScrollView style={estilos.conteudo}>
        <TouchableOpacity style={estilos.areaCapa} onPress={() => selecionarImagem('capa')}>
          {fotoCapaBase64 ? (
            <Image source={{ uri: `data:image/jpeg;base64,${fotoCapaBase64}` }} style={estilos.imgCapa} />
          ) : (
            <View style={estilos.placeholderCapa}>
              <Ionicons name="camera" size={30} color="#999" />
              <Text style={estilos.textoPlaceholderCapa}>Adicionar Capa</Text>
            </View>
          )}
          <View style={estilos.iconCameraOverlay}>
            <Ionicons name="camera-reverse" size={20} color="#FFF" />
          </View>
        </TouchableOpacity>

        <View style={estilos.areaPerfil}>
          <TouchableOpacity style={estilos.btnEditarPerfil} onPress={() => selecionarImagem('perfil')}>
            {fotoPerfilBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${fotoPerfilBase64}` }} style={estilos.imgPerfil} />
            ) : (
              <View style={estilos.placeholderPerfil}>
                <Ionicons name="camera" size={30} color="#999" />
              </View>
            )}
            <View style={estilos.iconCameraOverlayPequeno}>
              <Ionicons name="camera-reverse" size={16} color="#FFF" />
            </View>
          </TouchableOpacity>
        </View>

        <View style={estilos.form}>
          <Text style={estilos.label}>Nome da Comunidade</Text>
          <TextInput 
            style={estilos.input} 
            value={nome} 
            onChangeText={setNome} 
            maxLength={50}
          />

          <Text style={estilos.label}>Descrição</Text>
          <TextInput 
            style={[estilos.input, estilos.inputMulti]} 
            value={desc} 
            onChangeText={setDesc} 
            multiline
            numberOfLines={4}
          />
        </View>
      </ScrollView>
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
  justifyContent: 'space-between',
  alignItems: 'center',
  padding: 20,
  paddingTop: 60,
  backgroundColor: '#FFF',
  elevation: 2
},
tituloHeader: {
  fontSize: 19,
  fontFamily: 'REM_Bold',
  color: '#333'
},
btnSalvar: {
  fontSize: 16,
  fontWeight: 'bold',
  color: '#8C77C2'
},
conteudo: {
  flex: 1
},
areaCapa: {
  height: 160,
  width: '100%',
  backgroundColor: '#E0E0E0',
  justifyContent: 'center',
  alignItems: 'center'
},
imgCapa: {
  width: '100%',
  height: '100%'
},
placeholderCapa: {
  alignItems: 'center'
},
textoPlaceholderCapa: {
  color: '#999'
},
iconCameraOverlay: {
  position: 'absolute',
  bottom: 10,
  right: 10,
  backgroundColor: 'rgba(0,0,0,0.5)',
  padding: 8,
  borderRadius: 20
},
areaPerfil: {
  alignItems: 'flex-start',
  marginTop: -40,
  paddingHorizontal: 20,
  marginBottom: 20
},
btnEditarPerfil: {
  width: 100,
  height: 100,
  borderRadius: 50,
  backgroundColor: '#FFF',
  padding: 3,
  elevation: 4
},
imgPerfil: {
  width: '100%',
  height: '100%',
  borderRadius: 50
},
placeholderPerfil: {
  width: '100%',
  height: '100%',
  borderRadius: 37,
  backgroundColor: '#EEE',
  justifyContent: 'center',
  alignItems: 'center'
},
iconCameraOverlayPequeno: {
  position: 'absolute',
  bottom: 0,
  right: 0,
  backgroundColor: '#8C77C2',
  padding: 5,
  borderRadius: 15,
  borderWidth: 2,
  borderColor: '#FFF'
},
form: {
  paddingHorizontal: 20
},
label: {
  fontSize: 14,
  color: '#666',
  fontFamily: 'REM_Bold',
  marginBottom: 5,
  marginTop: 15
},
input: {
  backgroundColor: '#FFF',
  borderWidth: 1,
  borderColor: '#E0E0E0',
  borderRadius: 10,
  padding: 15,
  fontSize: 16,
  fontFamily: 'REM_Regular',
  color: '#000'
},
inputMulti: {
  height: 130,
  textAlignVertical: 'top'
}
});
