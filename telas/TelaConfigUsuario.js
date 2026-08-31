import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
  Image,
  useWindowDimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useEstilosTema } from '../lib/tema';
import { normalizarImagem, uploadImagemBase64, BUCKETS, removerImagemStorage, isStorageUrl } from '../lib/storage';
import { Alert } from '../lib/popup';

export default function TelaConfigUsuario({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);

  const idUsuarioParam = route.params?.id_usuario || null; 
  const { width } = useWindowDimensions(); 
  const [idUsuarioEfetivo, setIdUsuarioEfetivo] = useState(idUsuarioParam);
  const [nome, setNome] = useState('');
  const [username, setUsername] = useState('');
  const [sobreMim, setSobreMim] = useState('');
  const [fotoBase64, setFotoBase64] = useState(null);
  const [fotoAnterior, setFotoAnterior] = useState(null);
  
  const [carregandoDados, setCarregandoDados] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (idUsuarioParam) {
      setIdUsuarioEfetivo(idUsuarioParam);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setIdUsuarioEfetivo(data.user.id);
    });
  }, [idUsuarioParam]);

  useEffect(() => {
    const buscarDados = async () => {
      if (!idUsuarioEfetivo) return;

      try {
        const { data, error } = await supabase.rpc('obter_perfil_usuario', {
          p_id_usuario: idUsuarioEfetivo
        });

        if (error) throw error;

        if (data) {
          setNome(data.nome || '');
          setUsername(data.username || '');
          setSobreMim(data.sobre || '');
          if (data.foto_base64) {
            setFotoBase64(data.foto_base64);
            setFotoAnterior(data.foto_base64);
          }
        }
      } catch (error) {
        console.error(error);
        Alert.alert('Perfil indisponível', 'Não foi possível carregar seu perfil agora.');
      } finally {
        setCarregandoDados(false);
      }
    };

    buscarDados();
  }, [idUsuarioEfetivo]);

  const escolherFoto = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
    
    if (permissao.status !== 'granted') {
      Alert.alert('Galeria sem permissão', 'Precisamos de acesso à galeria para alterar sua foto.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1], 
      quality: 0.5, 
      base64: true, 
    });

    if (!resultado.canceled) {
      setFotoBase64(resultado.assets[0].base64);
    }
  };

  const salvarPerfil = async () => {
    if (!nome || !username) {
      Alert.alert('Perfil incompleto', 'Nome de exibição e username são obrigatórios.');
      return;
    }

    setSalvando(true);

    let novaFotoStorage = null;
    try {
      let referenciaFoto = fotoBase64 || null;

      // Fotos novas são enviadas ao Storage antes de persistir a referência no banco.
      if (fotoBase64 && !isStorageUrl(fotoBase64)) {
        const upload = await uploadImagemBase64({
          bucket: BUCKETS.PERFIL,
          pasta: idUsuarioEfetivo,
          base64: fotoBase64,
          mimeType: 'image/jpeg',
          nomeBase: 'perfil',
        });

        referenciaFoto = upload.publicUrl;
        novaFotoStorage = upload.publicUrl;
      }

      const { data, error } = await supabase.rpc('atualizar_perfil_usuario', {
        p_id_usuario: idUsuarioEfetivo,
        p_nome: nome,
        p_username: username,
        p_sobre: sobreMim,
        p_foto_base64: referenciaFoto,
      });

      if (error) throw error;

      if (data.success) {
        // Só removemos a foto anterior depois que a nova referência foi salva com sucesso.
        if (fotoAnterior && fotoAnterior !== referenciaFoto) {
          await removerImagemStorage(fotoAnterior, BUCKETS.PERFIL);
        }

        setFotoAnterior(referenciaFoto);
        setFotoBase64(referenciaFoto);
        navigation.replace('MenuNavegacao', { id_usuario: idUsuarioEfetivo });
      } else {
        Alert.alert('Perfil não atualizado', data.message);
      }
    } catch (error) {
      console.error(error);
      if (novaFotoStorage) {
        await removerImagemStorage(novaFotoStorage, BUCKETS.PERFIL);
      }
      Alert.alert('Conexão indisponível', 'Não foi possível atualizar o perfil agora. Tente novamente em instantes.');
    } finally {
      setSalvando(false);
    }
  };

  if (carregandoDados) {
    return (
      <View style={[estilos.telaPrincipal, estilos.centralizado]}>
        <ActivityIndicator size="large" color="#8C77C2" />
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.telaPrincipal}>
      <View style={[
        estilos.bgCurvoContainer,
        {
          top: 175 - (width * 2), 
          left: - (width / 2),
          width: width * 2,
          height: width * 2,
          borderRadius: width,
        }
      ]}>
        <LinearGradient
          colors={['#8B72C2', '#8B72C2', '#8B72C2']}
          style={[
            estilos.bgCurvoGradient,
            {
              left: width / 2,
              width: width,
            }
          ]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>

      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView contentContainerStyle={estilos.scrollContainer} showsVerticalScrollIndicator={false}>
          
          <View style={estilos.avatarSection}>
            <TouchableOpacity onPress={escolherFoto} activeOpacity={0.8} style={estilos.avatarContainer}>
              {fotoBase64 ? (
                <Image 
                  source={normalizarImagem(fotoBase64)} 
                  style={estilos.avatarImage} 
                />
              ) : (
                <View style={estilos.avatarPlaceholder}>
                  <Ionicons name="person" size={54} color="#ffffff" />
                </View>
              )}
              
              <View style={estilos.editIconContainer}>
                <Ionicons name="camera" size={18} color="#FFFFFF" />
              </View>
            </TouchableOpacity>

            <Text style={estilos.tituloSessao}>Editar Perfil</Text>
            <Text style={estilos.subtituloSessao}>Defina como você deseja aparecer dentro da Orami</Text>
          </View>

          <View style={estilos.formSection}>
            
            <View style={estilos.inputContainer}>
              <Ionicons name="person-outline" size={20} color="#8C77C2" style={estilos.iconeInput} />
              <TextInput 
                style={estilos.inputStyle}
                placeholder="Nome de exibição"
                placeholderTextColor="#A0A0A0"
                value={nome}
                onChangeText={setNome}
              />
            </View>

            <View style={estilos.inputContainer}>
              <Ionicons name="at-outline" size={20} color="#8C77C2" style={estilos.iconeInput} />
              <TextInput 
                style={estilos.inputStyle}
                placeholder="Nome de usuário"
                placeholderTextColor="#A0A0A0"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
              />
            </View>

            <View style={[estilos.inputContainer, estilos.inputAreaContainer]}>
              <Ionicons name="information-circle-outline" size={20} color="#8C77C2" style={estilos.iconeInputArea} />
              <TextInput 
                style={estilos.inputAreaStyle}
                placeholder="Conte um pouco sobre você..."
                placeholderTextColor="#A0A0A0"
                value={sobreMim}
                onChangeText={setSobreMim}
                multiline={true}
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity 
              activeOpacity={0.8}
              onPress={salvarPerfil}
              disabled={salvando}
              style={estilos.botaoSombra}
            >
              <LinearGradient
                colors={['#8C77C2', '#725AA8']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={estilos.botaoGradiente}
              >
                {salvando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={estilos.textoBotaoConcluir}>Salvar Alterações</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  telaPrincipal: {
    flex: 1,
    backgroundColor: '#FAFAFC', 
  },
  centralizado: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  bgCurvoContainer: {
    position: 'absolute',
    overflow: 'hidden',
  },
  bgCurvoGradient: {
    position: 'absolute',
    bottom: 0,
    height: 175,
    opacity: 1,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 28,
    paddingTop: 90,
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 35,
  },
  avatarContainer: {
    width: 170, 
    height: 170,
    borderRadius: 85,
    backgroundColor: '#FFFFFF',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#8C77C2',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    position: 'relative',
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 166,
    height: 165,
    borderRadius: 80,
    backgroundColor: '#D1C6E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
    borderRadius: 80,
  },
  editIconContainer: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: '#8C77C2',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF', 
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  tituloSessao: {
    fontFamily: 'REM_Bold',
    fontSize: 26,
    color: '#333333',
    marginBottom: 6,
  },
  subtituloSessao: {
    fontFamily: 'REM_Medium',
    fontSize: 13,
    color: '#666666',
    opacity: 0.8,
    textAlign: 'center',
  },
  formSection: {
    width: '100%',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    minHeight: 64,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    paddingHorizontal: 18,
    marginBottom: 16,
    borderWidth: 1.5,
    borderColor: '#F0EFF5',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
  },
  iconeInput: {
    marginRight: 12,
  },
  iconeInputArea: {
    marginRight: 12,
    marginTop: 2,
  },
  inputStyle: {
    flex: 1,
    fontFamily: 'REM_Medium',
    fontSize: 16,
    color: '#333333',
    height: '100%',
  },
  inputAreaContainer: {
    alignItems: 'center',
    paddingTop: 18,
    paddingBottom: 18,
    minHeight: 130,
  },
  inputAreaStyle: {
    flex: 1,
    width: '100%',
    fontFamily: 'REM_Medium',
    fontSize: 16,
    color: '#333333',
    lineHeight: 22,
  },
  botaoSombra: {
    marginTop: 20,
    elevation: 6,
    shadowColor: '#8C77C2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    borderRadius: 20,
  },
  botaoGradiente: {
    width: '100%',
    height: 64,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textoBotaoConcluir: {
    fontFamily: 'REM_Bold',
    color: '#FFFFFF',
    fontSize: 18,
    letterSpacing: 0.5,
  }
});
