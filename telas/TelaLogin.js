import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase'; 
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

export default function TelaLogin({ navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const [identificador, setIdentificador] = useState(''); 
  const [senha, setSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [carregando, setCarregando] = useState(false);

const handleLogin = async () => {
  if (!identificador || !senha) {
    Alert.alert('Campos incompletos', 'Preencha email ou usuário e senha para entrar.');
    return;
  }

  setCarregando(true);

  try {
  
    const { data: usuarios, error: erroRpc } = await supabase.rpc('autenticar_usuario', {
      p_identificador: identificador.trim(),
    });

    if (erroRpc) throw erroRpc;
    if (!usuarios || usuarios.length === 0) {
      Alert.alert('Usuário não encontrado', 'Confira seus dados e tente novamente.');
      return;
    }

    const emailDoUsuario = usuarios[0].email;


    const { data: authData, error: erroAuth } = await supabase.auth.signInWithPassword({
      email: emailDoUsuario,
      password: senha,
    });

    if (erroAuth) throw erroAuth;

    navigation.replace('MenuNavegacao', { id_usuario: usuarios[0].id_usuario });

  } catch (error) {
    console.error('Erro no login:', error.message);
    Alert.alert('Email ou senha inválidos', 'Confira seus dados e tente novamente.');
  } finally {
    setCarregando(false);
  }
};

  return (
    <LinearGradient
      colors={cores.gradienteInicial}
      locations={[0, 0.28, 0.48, 0.70, 0.96]}
      style={estilos.telaPrincipal}
    >
      <SafeAreaView style={estilos.areaSegura}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={{ flex: 1 }}
        >
          <ScrollView contentContainerStyle={estilos.scrollContainer} showsVerticalScrollIndicator={false}>
            
            <View style={estilos.secaoLogo}>
              <Image
                source={require('../assets/logo.png')}
                style={estilos.logoSmall}
                resizeMode="contain"
              />
              <Text style={estilos.tituloOrami}>ORAMI</Text>
            </View>

            <View style={estilos.containerForm}>
              <Text style={estilos.labelChamada}>Entre com sua conta</Text>
              
              <View style={estilos.inputContainer}>
                <Ionicons name="person-outline" size={22} color="#8B72C2" style={estilos.inputIcon} />
                <TextInput 
                  style={estilos.inputStyle}
                  placeholder="Email ou nome de usuário"
                  placeholderTextColor="#999"
                  autoCapitalize="none"
                  value={identificador}
                  onChangeText={setIdentificador}
                />
              </View>
              
              <View style={estilos.inputContainer}>
                <Ionicons name="lock-closed-outline" size={22} color="#8B72C2" style={estilos.inputIcon} />
                <TextInput 
                  style={estilos.inputStyle}
                  placeholder="Senha"
                  placeholderTextColor="#999"
                  secureTextEntry={!senhaVisivel}
                  value={senha}
                  onChangeText={setSenha}
                />
                <TouchableOpacity onPress={() => setSenhaVisivel(!senhaVisivel)}>
                  <Ionicons 
                    name={senhaVisivel ? "eye-off-outline" : "eye-outline"} 
                    size={22} 
                    color="#999" 
                  />
                </TouchableOpacity>
              </View>

              <TouchableOpacity 
                style={estilos.botaoLoginBorda} 
                activeOpacity={0.7}
                onPress={handleLogin}
                disabled={carregando}
              >
                <View style={estilos.interiorBotaoBranco}>
                  {carregando ? (
                    <ActivityIndicator color="#8C77C2" />
                  ) : (
                    <Text style={estilos.textoBotaoLogin}>Entrar</Text>
                  )}
                </View>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => {}}>
                <Text style={estilos.linkEsqueciSenha}>Esqueci minha senha</Text>
              </TouchableOpacity>
            </View>

            <View style={estilos.containerOu}>
              <View style={estilos.linhaOu} />
              <Text style={estilos.textoOu}>ou</Text>
              <View style={estilos.linhaOu} />
            </View>

            <View style={estilos.secaoRodape}>
              <TouchableOpacity style={estilos.botaoGoogle} activeOpacity={0.8}>
                <View style={estilos.containerIconeGoogle}>
                   <Text style={estilos.googleIconText}>G</Text>
                </View>
                <Text style={estilos.textoBotaoGoogle}>Continuar com o Google</Text>
              </TouchableOpacity>

              <View style={estilos.containerCrieAgora}>
                <Text style={estilos.textoNormal}>Não possui uma conta? </Text>
                <TouchableOpacity onPress={() => navigation.navigate('TelaCadastro')}>
                  <Text style={estilos.linkCrieAgora}>Crie agora.</Text>
                </TouchableOpacity>
              </View>
            </View>

          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilosBase = StyleSheet.create({
  telaPrincipal: {
    flex: 1,
  },
  areaSegura: {
    flex: 1,
    paddingVertical: 80,
  },
  scrollContainer: {
    flexGrow: 1,
    alignItems: 'center',
    paddingHorizontal: 34,
  },
  secaoLogo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logoSmall: {
    width: 145,
    height: 145,
  },
  tituloOrami: {
    fontFamily: 'KronaOne',
    fontSize: 28,
    color: '#8B72C2',
    marginTop: 5,
  },
  containerForm: {
    width: '100%',
    marginBottom: 20,
    marginTop: 10,
  },
  labelChamada: {
    fontFamily: 'REM_Bold',
    fontSize: 20,
    color: '#8B72C2',
    marginBottom: 25,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 60,
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    paddingHorizontal: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
  },
  inputIcon: {
    marginRight: 10,
  },
  inputStyle: {
    flex: 1,
    fontFamily: 'REM_Regular',
    fontSize: 16,
    color: '#333',
  },
  botaoLoginBorda: {
    width: '100%',
    height: 60,
    borderRadius: 18,
    padding: 2,
    backgroundColor: '#8C77C2',
    marginTop: 15,
  },
  interiorBotaoBranco: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoLogin: {
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    fontSize: 18,
  },
  linkEsqueciSenha: {
    fontFamily: 'REM_Medium',
    color: '#8C77C2',
    textAlign: 'center',
    marginTop: 15,
    textDecorationLine: 'underline',
  },
  containerOu: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginBottom: 35,
    marginTop: 10,
  },
  linhaOu: {
    flex: 1,
    height: 1,
    backgroundColor: '#c0c0c0',
  },
  textoOu: {
    marginHorizontal: 15,
    fontFamily: 'REM_Medium',
    color: '#999',
    fontSize: 16,
  },
  secaoRodape: {
    width: '100%',
    alignItems: 'center',
  },
  botaoGoogle: {
    width: '100%',
    height: 60,
    backgroundColor: '#8C77C2',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  containerIconeGoogle: {
    width: 28,
    height: 28,
    backgroundColor: 'rgb(247, 247, 247)',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  googleIconText: {
    color: '#8C77C2',
    fontWeight: '900',
    fontSize: 20,
  },
  textoBotaoGoogle: {
    fontFamily: 'REM_Bold',
    color: '#FFFFFF',
    fontSize: 16,
  },
  containerCrieAgora: {
    flexDirection: 'row',
  },
  textoNormal: {
    fontFamily: 'REM_Medium',
    color: '#666',
  },
  linkCrieAgora: {
    fontFamily: 'REM_Bold',
    color: '#8B72C2',
  }
});
