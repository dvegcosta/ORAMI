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

const apenasDigitos = (valor) => (valor || '').replace(/\D/g, '');

const formatarCelular = (valor) => {
  const digitos = apenasDigitos(valor).slice(0, 11);

  if (digitos.length <= 2) return digitos;
  if (digitos.length <= 7) return `(${digitos.slice(0, 2)}) ${digitos.slice(2)}`;
  return `(${digitos.slice(0, 2)}) ${digitos.slice(2, 7)}-${digitos.slice(7)}`;
};

export default function TelaCadastro({ navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();

  const [username, setUsername] = useState('');
  const [nome, setNome] = useState('');
  const [email, setEmail] = useState('');
  const [fone, setFone] = useState('');
  const [dia, setDia] = useState('');
  const [mes, setMes] = useState('');
  const [ano, setAno] = useState('');
  const [senha, setSenha] = useState('');
  const [confirmarSenha, setConfirmarSenha] = useState('');
  const [senhaVisivel, setSenhaVisivel] = useState(false);
  const [confirmarSenhaVisivel, setConfirmarSenhaVisivel] = useState(false);
  const [termosAceitos, setTermosAceitos] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const handleAlterarFone = (valor) => {
    setFone(formatarCelular(valor));
  };

const handleCadastro = async () => {
  if (!username || !nome || !email || !dia || !mes || !ano || !senha) {
    Alert.alert('Campos obrigatórios', 'Preencha todos os dados necessários.');
    return;
  }

  const digitosFone = apenasDigitos(fone);
  if (digitosFone && digitosFone.length !== 11) {
    Alert.alert('Celular incompleto', 'Informe 11 nÃºmeros no formato (xx) xxxxx-xxxx.');
    return;
  }

  if (senha !== confirmarSenha) {
    Alert.alert('Senhas diferentes', 'As senhas não coincidem.');
    return;
  }

  if (!termosAceitos) {
    Alert.alert('Termos de uso', 'Aceite os termos para continuar.');
    return;
  }

  const dataNasc = `${ano}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}`;
  setCarregando(true);

  try {
    const { data: authData, error: erroAuth } = await supabase.auth.signUp({
      email: email.toLowerCase().trim(),
      password: senha,
    });

    if (erroAuth) throw erroAuth;

    const uid = authData.user.id;

    const { data, error } = await supabase.rpc('finalizar_cadastro_usuario', {
      p_id_usuario: uid,
      p_username: username,
      p_nome: nome,
      p_email: email.toLowerCase().trim(),
      p_fone: fone,
      p_data_nasc: dataNasc,
    });

    if (error) throw error;

    if (data.success) {
      navigation.replace('TelaPesquisa', { id_usuario: uid });
    } else {
      Alert.alert('Cadastro não concluído', data.message);
    }
  } catch (error) {
    console.error(error);
    Alert.alert('Erro no cadastro', error.message);
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

            <View style={estilos.cabecalhoForm}>
              <Text style={estilos.subtituloCadastro}>Preencha os campos</Text>
            </View>

            <View style={estilos.containerForm}>

              <View style={estilos.inputContainer}>
                <Ionicons name="person-outline" size={20} color="#8B72C2" style={estilos.inputIcon} />
                <TextInput
                  style={estilos.inputStyle}
                  placeholder="Nome e sobrenome"
                  placeholderTextColor="#999"
                  value={nome}
                  onChangeText={setNome}
                />
              </View>

              <View style={estilos.labelContainer}>
                <Ionicons name="calendar-outline" size={20} color="#8B72C2" style={estilos.labelIcon} />
                <Text style={estilos.labelText}>Data de nascimento</Text>
              </View>

              <View style={estilos.linhaCampos}>
                <View style={[estilos.inputContainer, estilos.campoData]}>
                  <TextInput
                    style={[estilos.inputStyle, { textAlign: 'center' }]}
                    placeholder="Dia"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={2}
                    value={dia}
                    onChangeText={setDia}
                  />
                </View>
                <View style={[estilos.inputContainer, estilos.campoData, { marginHorizontal: 10}]}>
                  <TextInput
                    style={[estilos.inputStyle, { textAlign: 'center' }]}
                    placeholder="Mês"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={2}
                    value={mes}
                    onChangeText={setMes}
                  />
                </View>
                <View style={[estilos.inputContainer, estilos.campoAno]}>
                  <TextInput
                    style={[estilos.inputStyle, { textAlign: 'center' }]}
                    placeholder="Ano"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    maxLength={4}
                    value={ano}
                    onChangeText={setAno}
                  />
                </View>
              </View>
              
              <View style={estilos.inputContainer}>
                <Ionicons name="mail-outline" size={22} color="#8B72C2" style={estilos.inputIcon} />
                <TextInput
                  style={estilos.inputStyle}
                  placeholder="Email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={setEmail}
                />
              </View>

              <View style={estilos.inputContainer}>
                <Ionicons name="call-outline" size={22} color="#8B72C2" style={estilos.inputIcon} />
                <TextInput
                  style={estilos.inputStyle}
                  placeholder="Número de celular (opcional)"
                  placeholderTextColor="#999"
                  keyboardType="phone-pad"
                  maxLength={15}
                  value={fone}
                  onChangeText={handleAlterarFone}
                />
              </View>

              <View style={estilos.inputContainer}>
                <Ionicons name="at-outline" size={20} color="#8B72C2" style={estilos.inputIcon} />
                <TextInput
                  style={estilos.inputStyle}
                  placeholder="Nome de usuário (Ex: lricardo_sp)"
                  placeholderTextColor="#999"
                  value={username}
                  onChangeText={setUsername}
                  autoCapitalize="none"
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
                  <Ionicons name={senhaVisivel ? "eye-off-outline" : "eye-outline"} size={22} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={estilos.inputContainer}>
                <Ionicons name="shield-checkmark-outline" size={22} color="#8B72C2" style={estilos.inputIcon} />
                <TextInput
                  style={estilos.inputStyle}
                  placeholder="Confirmar senha"
                  placeholderTextColor="#999"
                  secureTextEntry={!confirmarSenhaVisivel}
                  value={confirmarSenha}
                  onChangeText={setConfirmarSenha}
                />
                <TouchableOpacity onPress={() => setConfirmarSenhaVisivel(!confirmarSenhaVisivel)}>
                  <Ionicons name={confirmarSenhaVisivel ? "eye-off-outline" : "eye-outline"} size={22} color="#999" />
                </TouchableOpacity>
              </View>

              <View style={estilos.checkboxContainer}>
                <TouchableOpacity onPress={() => setTermosAceitos(!termosAceitos)} style={estilos.checkbox}>
                  <Ionicons name={termosAceitos ? "checkbox" : "square-outline"} size={24} color="#8B72C2" />
                </TouchableOpacity>
                <Text style={estilos.textoCheckbox}>
                  Declaro que li e estou de acordo com os <Text style={estilos.linkTermos}>termos de uso</Text> e a <Text style={estilos.linkTermos}>política de privacidade</Text>.
                </Text>
              </View>

              <TouchableOpacity
                style={estilos.botaoEnviar}
                activeOpacity={0.8}
                onPress={handleCadastro}
                disabled={carregando}
              >
                {carregando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={estilos.textoBotaoEnviar}>Criar conta</Text>
                )}
              </TouchableOpacity>
              
              <View style={estilos.secaoRodape}>
                <View style={estilos.containerVoltarLogin}>
                  <Text style={estilos.textoNormal}>Já tem uma conta? </Text>
                  <TouchableOpacity onPress={() => navigation.navigate('TelaLogin')}>
                    <Text style={estilos.linkVoltarLogin}>Entrar.</Text>
                  </TouchableOpacity>
                </View>
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
  cabecalhoForm: {
    width: '100%',
    marginBottom: 20,
  },
  subtituloCadastro: {
    fontFamily: 'REM_Bold',
    fontSize: 28,
    color: '#8B72C2',
    textAlign: 'left',
    marginBottom: 8,
  },
  containerForm: {
    width: '100%',
  },
  linhaCampos: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-between',
  },
  labelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 4,
  },
  labelIcon: {
    marginRight: 6,
  },
  labelText: {
    fontFamily: 'REM_Medium',
    fontSize: 17,
    color: '#666',
  },
  campoData: {
    flex: 1,
  },
  campoAno: {
    flex: 1.5,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    height: 65,
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
    fontSize: 15,
    color: '#333',
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 5,
    marginBottom: 25,
    paddingRight: 10,
  },
  checkbox: {
    marginRight: 10,
    marginTop: -2,
  },
  textoCheckbox: {
    flex: 1,
    fontFamily: 'REM_Regular',
    color: '#666',
    fontSize: 13,
    lineHeight: 20,
  },
  linkTermos: {
    fontFamily: 'REM_Bold',
    color: '#8B72C2',
    textDecorationLine: 'underline',
  },
  botaoEnviar: {
    width: '100%',
    height: 60,
    backgroundColor: '#8C77C2',
    borderRadius: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
  },
  textoBotaoEnviar: {
    fontFamily: 'REM_Bold',
    color: '#FFFFFF',
    fontSize: 18,
  },
  secaoRodape: {
    width: '100%',
    alignItems: 'center',
    marginTop: 18,
  },
  containerVoltarLogin: {
    flexDirection: 'row',
  },
  textoNormal: {
    fontFamily: 'REM_Medium',
    color: '#666',
    fontSize: 15,
  },
  linkVoltarLogin: {
    fontFamily: 'REM_Bold',
    color: '#8B72C2',
    fontSize: 15,
  }
});
