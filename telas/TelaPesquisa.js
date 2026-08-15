import React, { useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

const PERGUNTAS = {
  1: {
    titulo: "Qual das opções melhor descreve seu papel em relação à pessoa assistida?",
    multipla: false,
    opcoes: [
      { label: 'Responsável', tag: 'RESPONSAVEL' },
      { label: 'Cuidador', tag: 'CUIDADOR' },
      { label: 'Familiar', tag: 'FAMILIAR' },
      { label: 'Profissional', tag: 'PROFISSIONAL' },
      { label: 'Sou neurodivergente', tag: 'NEURODIVERGENTE' },
      { label: 'Outro', tag: 'OUTRO_PAPEL' }
    ]
  },
  2: {
    titulo: "O aplicativo deve priorizar conteúdos relacionados a qual(is) condição(ões)?",
    multipla: true,
    opcoes: [
      { label: 'TEA (Transtorno do Espectro Autista)', tag: 'TEA' },
      { label: 'TDAH', tag: 'TDAH' },
      { label: 'Dislexia', tag: 'DISLEXIA' },
      { label: 'Outra neurodivergência', tag: 'OUTRA_CONDICAO' },
      { label: 'Ainda não sei / Estou investigando', tag: 'INVESTIGANDO' }
    ]
  },
  3: {
    titulo: "No seu dia a dia, o que mais dificulta para você?",
    multipla: true,
    opcoes: [
      { label: 'Organizar rotina e tarefas', tag: 'ROTINA' },
      { label: 'Lembretes e alertas', tag: 'LEMBRETES' },
      { label: 'Foco e concentração', tag: 'FOCO' },
      { label: 'Regulação emocional', tag: 'EMOCIONAL' },
      { label: 'Comunicação e interação social', tag: 'COMUNICACAO' },
      { label: 'Leitura, escrita e compreensão', tag: 'LEITURA_ESCRITA' },
      { label: 'Acompanhamento de progresso', tag: 'PROGRESSO' },
      { label: 'Ainda não sei', tag: 'NAO_SEI_DIFICULDADE' },
      { label: 'Outro', tag: 'OUTRA_DIFICULDADE' }
    ]
  }
};

export default function TelaPesquisa({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || { id_usuario: null };
  const [etapa, setEtapa] = useState(1);
  const [carregando, setCarregando] = useState(false);
  const [papel, setPapel] = useState(null); 
  const [condicoes, setCondicoes] = useState([]); 
  const [dificuldades, setDificuldades] = useState([]); 

  const irParaProxima = async () => {
    if (etapa < 3) {
      setEtapa(etapa + 1);
    } else {
      await finalizarPesquisa();
    }
  };

  const irParaAnterior = () => {
    if (etapa > 1) {
      setEtapa(etapa - 1);
    }
  };

  const isBotaoDesabilitado = () => {
    if (etapa === 1) return papel === null;
    if (etapa === 2) return condicoes.length === 0;
    if (etapa === 3) return dificuldades.length === 0;
    return true;
  };

  const toggleSelecao = (tag) => {
    if (etapa === 1) {
      setPapel(tag);
    } else if (etapa === 2) {
      setCondicoes(prev => 
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
    } else if (etapa === 3) {
      setDificuldades(prev => 
        prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
      );
    }
  };

  const isSelecionado = (tag) => {
    if (etapa === 1) return papel === tag;
    if (etapa === 2) return condicoes.includes(tag);
    if (etapa === 3) return dificuldades.includes(tag);
    return false;
  };

const finalizarPesquisa = async () => {
  setCarregando(true);

  try {
    if (!id_usuario) {
      console.error('ID do usuário não informado.');

      Alert.alert(
        'Erro',
        'Não foi possível identificar o usuário. Faça login novamente.'
      );

      return;
    }

    const todasAsTags = [
      papel,
      ...condicoes,
      ...dificuldades
    ].filter(Boolean);

    console.log('=================================');
    console.log('FINALIZANDO PESQUISA');
    console.log('ID usuário:', id_usuario);
    console.log('Tags:', todasAsTags);
    console.log('=================================');

    const resultados = await Promise.all(
      todasAsTags.map(async (tag) => {
        try {
          const { data, error } = await supabase.rpc(
            'salvar_tag_usuario',
            {
              p_id_usuario: id_usuario,
              p_nome_tag: tag
            }
          );

          console.log(`Tag: ${tag}`);
          console.log('Data:', data);
          console.log('Error:', error);

          return {
            tag,
            data,
            error
          };

        } catch (error) {

          console.error(`Erro na tag ${tag}:`, error);

          return {
            tag,
            data: null,
            error
          };
        }
      })
    );

    const erros = resultados.filter(
      resultado =>
        resultado.error ||
        !resultado.data ||
        resultado.data.success !== true
    );

    if (erros.length === 0) {

      console.log('Todas as tags foram salvas com sucesso.');

      navigation.replace('TelaConfigUsuario', {
        id_usuario
      });

      return;
    }

    console.error('Erros ao salvar tags:', erros);

    const mensagemErros = erros
      .map((erro) => {
        const mensagem =
          erro.error?.message ||
          erro.data?.error ||
          'Erro desconhecido';

        return `${erro.tag}: ${mensagem}`;
      })
      .join('\n');

    Alert.alert(
      'Erro ao salvar preferências',
      mensagemErros
    );

  } catch (error) {

    console.error(
      'Erro geral ao finalizar pesquisa:',
      error
    );

    Alert.alert(
      'Conexão indisponível',
      'Não conseguimos salvar suas opções agora. Tente novamente em instantes.'
    );

  } finally {
    setCarregando(false);
  }
};

  const porcentagemProgresso = `${(etapa / 3) * 100}%`;

  return (
    <LinearGradient
      colors={cores.gradientePesquisa}
      locations={[0, 0.3, 0.7, 1]}
      style={estilos.telaPrincipal}
    >
      <SafeAreaView style={estilos.areaSegura}>
        <View style={estilos.mainContainer}>
          
          <Text style={estilos.tituloPrincipal}>
            Ajude-nos a personalizar{'\n'}sua experiência
          </Text>

          <View style={estilos.cardPrincipal}>
            
            <View style={estilos.barraProgressoBg}>
              <View style={[estilos.barraProgressoFill, { width: porcentagemProgresso }]} />
            </View>

            <Text style={estilos.tituloPergunta}>{PERGUNTAS[etapa].titulo}</Text>
            {PERGUNTAS[etapa].multipla && (
              <Text style={estilos.subtituloPergunta}>
                Selecione uma ou mais opções:
              </Text>
            )}

            <ScrollView 
              style={estilos.scrollOpcoes}
              contentContainerStyle={estilos.opcoesContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {PERGUNTAS[etapa].opcoes.map((opcao, index) => {
                const selecionado = isSelecionado(opcao.tag);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[estilos.cardOpcao, selecionado && estilos.cardOpcaoSelecionado]}
                    activeOpacity={0.7}
                    onPress={() => toggleSelecao(opcao.tag)}
                  >
                    <View style={[estilos.radioBox, selecionado && estilos.radioBoxSelecionado]}>
                      {selecionado && <View style={estilos.radioBoxInner} />}
                    </View>
                    <Text style={[estilos.textoOpcao, selecionado && estilos.textoOpcaoSelecionado]}>
                      {opcao.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={estilos.botoesContainer}>
              <TouchableOpacity
                style={[estilos.botaoAcao, estilos.botaoVoltar, { opacity: etapa === 1 ? 0 : 1 }]}
                activeOpacity={0.7}
                onPress={irParaAnterior}
                disabled={etapa === 1}
              >
                <Ionicons name="chevron-back" size={20} color="#6C52A3" />
                <Text style={estilos.textoBotaoVoltar}>Voltar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[estilos.botaoAcao, estilos.botaoProximo, isBotaoDesabilitado() && estilos.botaoProximoDesabilitado]}
                activeOpacity={0.8}
                onPress={irParaProxima}
                disabled={isBotaoDesabilitado() || carregando}
              >
                {carregando ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <Text style={estilos.textoBotaoProximo}>
                      {etapa === 3 ? "Continuar" : "Próximo"}
                    </Text>
                    {etapa < 3 && <Ionicons name="chevron-forward" size={20} color="#FFF" />}
                  </>
                )}
              </TouchableOpacity>
            </View>

          </View>

          <Text style={estilos.textoRodape}>
            Seus dados são protegidos conforme{'\n'}nossas diretrizes.
          </Text>

        </View>
      </SafeAreaView>
    </LinearGradient>
  );
}

const estilosBase = StyleSheet.create({
  telaPrincipal: { 
    flex: 1 
  },
  areaSegura: { 
    flex: 1, 
    paddingTop: Platform.OS === 'android' ? 40 : 10 
  },
  mainContainer: { 
    flex: 1, 
    paddingHorizontal: 20, 
    paddingBottom: 55,
    paddingTop: 35,
    justifyContent: 'center'
  },
  tituloPrincipal: {
    fontFamily: 'REM_Bold',
    fontSize: 24,
    color: '#8B72C2',
    textAlign: 'left',  
    marginBottom: 20,
    lineHeight: 28,
    marginLeft: 4
  },
  cardPrincipal: {
    flexShrink: 1, 
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    paddingBottom: 25,
    paddingTop: 25,
    elevation: 4, 
    shadowColor: '#4B3B73', 
    shadowOffset: { width: 0, height: 4 }, 
    shadowOpacity: 0.08, 
    shadowRadius: 15,
    marginBottom: 24
  },
  barraProgressoBg: { 
    height: 4, 
    backgroundColor: '#F0EAF5', 
    borderRadius: 4, 
    marginBottom: 24, 
    overflow: 'hidden' 
  },
  barraProgressoFill: { 
    height: '100%', 
    backgroundColor: '#8B72C2', 
    borderRadius: 4 
  },
  tituloPergunta: { 
    fontFamily: 'REM_Bold', 
    fontSize: 18, 
    fontWeight: 'bold',
    color: '#1A1A1A', 
    marginBottom: 20, 
    lineHeight: 24 
  },
  subtituloPergunta: { 
    fontFamily: 'REM_Medium', 
    fontSize: 14, 
    color: '#888', 
    marginBottom: 16,
    marginTop: -10 
  },
  scrollOpcoes: { 
    flexShrink: 1, 
    width: '100%',
    marginBottom: 10
  },
  opcoesContent: {
    paddingBottom: 5 
  },
  cardOpcao: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#faf5ff', 
    paddingVertical: 14,
    paddingHorizontal: 16, 
    borderRadius: 12, 
    marginBottom: 10, 
    borderWidth: 1, 
    borderColor: '#F3EEF9' 
  },
  cardOpcaoSelecionado: { 
    backgroundColor: '#f1e2ff', 
    borderColor: '#7A62B6', 
    borderWidth: 1.5 
  },
  radioBox: { 
    width: 22, 
    height: 22, 
    borderRadius: 11, 
    borderWidth: 1.5, 
    borderColor: '#6C52A3', 
    marginRight: 16, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  radioBoxSelecionado: { 
    borderColor: '#6C52A3' 
  },
  radioBoxInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#6C52A3'
  },
  textoOpcao: { 
    flex: 1, 
    fontFamily: 'REM_Medium', 
    fontSize: 16, 
    color: '#4C3B73',
    fontWeight: '600'
  },
  textoOpcaoSelecionado: { 
    fontFamily: 'REM_Bold', 
    fontWeight: 'bold' 
  },
  botoesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10
  },
  botaoAcao: {
    flex: 1,
    height: 48,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center'
  },
  botaoVoltar: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: '#8067BE',
    marginRight: 8
  },
  textoBotaoVoltar: {
    fontFamily: 'REM_Bold',
    fontWeight: 'bold',
    color: '#8067BE',
    fontSize: 16,
    marginLeft: 6
  },
  botaoProximo: {
    backgroundColor: '#876FD0',
    marginLeft: 8,
    elevation: 2,
    shadowColor: '#876FD0',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4
  },
  botaoProximoDesabilitado: { 
    backgroundColor: '#C4B5E0', 
    elevation: 0, 
    shadowOpacity: 0 
  },
  textoBotaoProximo: { 
    fontFamily: 'REM_Bold', 
    fontWeight: 'bold',
    color: '#FFFFFF', 
    fontSize: 16,
    marginRight: 6
  },
  textoRodape: {
    textAlign: 'center',
    color: '#8c74be',
    fontSize: 13,
    fontFamily: 'REM_Medium',
    lineHeight: 18,
    paddingHorizontal: 20
  }
});
