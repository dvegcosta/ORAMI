import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Platform,
  LayoutAnimation,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

const FAQItem = ({ pergunta, resposta }) => {
  const estilos = useEstilosTema(estilosBase);
  const [aberto, setAberto] = useState(false);

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setAberto(!aberto);
  };

  return (
    <View style={estilos.faqContainer}>
      <TouchableOpacity style={estilos.faqHeader} onPress={toggle} activeOpacity={0.7}>
        <Text style={estilos.faqPergunta}>{pergunta}</Text>
        <Ionicons 
          name={aberto ? "chevron-up" : "chevron-down"} 
          size={20} 
          color="#8C77C2" 
        />
      </TouchableOpacity>
      {aberto && (
        <View style={estilos.faqRespostaContainer}>
          <Text style={estilos.faqResposta}>{resposta}</Text>
        </View>
      )}
    </View>
  );
};

export default function TelaCentralAjuda({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};
  const [mensagem, setMensagem] = useState('');
  const [enviando, setEnviando] = useState(false);

  const handleEnviarSuporte = async () => {
    if (!mensagem.trim()) return;

    setEnviando(true);
    try {
      const { error } = await supabase.rpc('sp_enviar_suporte', {
        p_id_autor: id_usuario,
        p_msg: mensagem.trim()
      });

      if (error) throw error;

      Alert.alert('Mensagem enviada', 'Recebemos sua solicitação. Em breve entraremos em contato.');
      setMensagem('');
    } catch (error) {
      Alert.alert('Suporte indisponível', `Não foi possível enviar sua mensagem: ${error.message}`);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity style={estilos.botaoVoltar} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#8C77C2" />
        </TouchableOpacity>
        <View style={estilos.tituloContainer}>
          <Ionicons name="help-circle" size={32} color="#8C77C2" style={estilos.iconeTitulo} />
          <Text style={estilos.tituloPrincipal}>Central de ajuda</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={estilos.scrollContent} showsVerticalScrollIndicator={false}>
        
        <Text style={estilos.secaoTitulo}>Perguntas Frequentes</Text>
        
        <FAQItem 
          pergunta="O que são os recursos?" 
          resposta="Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua." 
        />
        <FAQItem 
          pergunta="Como criar uma comunidade?" 
          resposta="Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat." 
        />
        <FAQItem 
          pergunta="Como configurar minha comunidade?" 
          resposta="Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur." 
        />
        <FAQItem 
          pergunta="Como usar a ferramenta de comunicação?" 
          resposta="Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum." 
        />

        <View style={estilos.suporteHeader}>
          <Ionicons name="headset-outline" size={24} color={cores.icone} />
          <Text style={estilos.suporteTitulo}>Suporte</Text>
        </View>

        <TextInput
          style={estilos.inputSuporte}
          placeholder="Digite sua mensagem..."
          placeholderTextColor="#999"
          multiline
          value={mensagem}
          onChangeText={setMensagem}
        />

        <TouchableOpacity 
          style={[estilos.botaoEnviar, enviando && { opacity: 0.7 }]} 
          onPress={handleEnviarSuporte}
          disabled={enviando}
        >
          {enviando ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={estilos.textoBotaoEnviar}>Enviar</Text>
          )}
        </TouchableOpacity>

        <Text style={estilos.textoRodape}>
          Você também pode nos contatar pelo email:{'\n'}
          <Text style={estilos.emailLink}>orami.contato@gmail.com</Text>
        </Text>

      </ScrollView>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingHorizontal: 20,
    marginBottom: 30,
  },
  botaoVoltar: {
    marginTop: 25,
    marginBottom: 20,
  },
  tituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    fontFamily: 'REM_Regular',
  },
  iconeTitulo: {
    marginRight: 10,
    marginTop: 5,
  },
  tituloPrincipal: {
    fontSize: 26,
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  secaoTitulo: {
    fontSize: 20,
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
    marginBottom: 20,
  },
  faqContainer: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    marginBottom: 12,
    backgroundColor: '#FFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
  },
  faqPergunta: {
    fontSize: 15,
    color: '#555',
    fontFamily: 'REM_Medium',
    flex: 1,
  },
  faqRespostaContainer: {
    paddingHorizontal: 15,
    paddingBottom: 15,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  faqResposta: {
    fontSize: 14,
    color: '#777',
    lineHeight: 20,
    marginTop: 10,
    fontFamily: 'REM_Medium',
  },
  suporteHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 30,
    marginBottom: 15,
  },
  suporteTitulo: {
    fontSize: 20,
    color: '#555',
    fontFamily: 'REM_Bold',
    marginLeft: 10,
  },
  inputSuporte: {
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 12,
    padding: 15,
    fontFamily: 'REM_Regular',
    height: 50, 
    backgroundColor: '#FCFCFC',
    fontSize: 15,
    color: '#333',
    marginBottom: 15,
  },
  botaoEnviar: {
    backgroundColor: '#8C77C2',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 25,
    alignSelf: 'flex-start',
    marginBottom: 40,
  },
  textoBotaoEnviar: {
    color: '#FFF',
    fontSize: 16,
    fontFamily: 'REM_Bold',
  },
  textoRodape: {
    textAlign: 'center',
    fontSize: 14,
    color: '#555',
    lineHeight: 22,
    fontFamily: 'REM_Regular',
  },
  emailLink: {
    fontFamily: 'REM_Bold',
    color: '#555',
  }
});
