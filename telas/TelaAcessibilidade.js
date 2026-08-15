import React, { useState, useEffect } from 'react'; 
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase'; 
import { useEstilosTema, useTemaUsuario, usarTema } from '../lib/tema';

export default function TelaAcessibilidade({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {}; 
  const [idUsuarioEfetivo, setIdUsuarioEfetivo] = useState(id_usuario || null);
  const { aplicarAcessibilidadeLocal } = useTemaUsuario(idUsuarioEfetivo);
  
  const [isSystemTheme, setIsSystemTheme] = useState(true);
  const [isMuted, setIsMuted] = useState(false);
  const [isVibrationDisabled, setIsVibrationDisabled] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState('claro');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false); 

  useEffect(() => {
    if (id_usuario) {
      setIdUsuarioEfetivo(id_usuario);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setIdUsuarioEfetivo(data.user.id);
    });
  }, [id_usuario]);

  useEffect(() => {
    const buscarConfiguracoes = async () => {
      if (!idUsuarioEfetivo) return;

      const { data, error } = await supabase.rpc('obter_acessibilidade', { 
        p_id_usuario: idUsuarioEfetivo 
      });

      if (data && data.length > 0) {
        const config = data[0];
        const temaPadraoSistema = config.tema_padrao_sistema ?? true;
        const temaSelecionado = config.tema_selecionado || 'claro';
        const desativarSons = config.desativar_sons ?? false;
        const desativarVibracoes = config.desativar_vibracoes ?? false;

        setIsSystemTheme(temaPadraoSistema);
        setSelectedTheme(temaSelecionado);
        setIsMuted(desativarSons);
        setIsVibrationDisabled(desativarVibracoes);
        aplicarAcessibilidadeLocal({
          temaPadraoSistema,
          temaSelecionado,
          desativarSons,
          desativarVibracoes,
        });
      }
    };
    buscarConfiguracoes();
  }, [idUsuarioEfetivo, aplicarAcessibilidadeLocal]);

  const salvarConfiguracoes = async (novosValores) => {
    if (!idUsuarioEfetivo) return;

    const estadoFinal = {
      sistema: isSystemTheme,
      tema: selectedTheme,
      sons: isMuted,
      vibracoes: isVibrationDisabled,
      ...novosValores 
    };

    aplicarAcessibilidadeLocal({
      temaPadraoSistema: estadoFinal.sistema,
      temaSelecionado: estadoFinal.tema,
      desativarSons: estadoFinal.sons,
      desativarVibracoes: estadoFinal.vibracoes,
    });

    const { error } = await supabase.rpc('salvar_acessibilidade', {
      p_id_usuario: idUsuarioEfetivo,
      p_sistema: estadoFinal.sistema,
      p_tema: estadoFinal.tema,
      p_sons: estadoFinal.sons,
      p_vibracoes: estadoFinal.vibracoes
    });

    if (error) {
      console.error("Erro ao salvar:", error.message);
      return;
    }

    aplicarAcessibilidadeLocal({
      temaPadraoSistema: estadoFinal.sistema,
      temaSelecionado: estadoFinal.tema,
      desativarSons: estadoFinal.sons,
      desativarVibracoes: estadoFinal.vibracoes,
    });
  };

  const selecionarTema = (tema) => {
    setSelectedTheme(tema);
    setIsDropdownOpen(false);
    salvarConfiguracoes({ tema: tema }); 
  };

  return (
    <SafeAreaView style={estilos.container}>
      <TouchableOpacity 
        style={estilos.botaoVoltar} 
        onPress={() => navigation.goBack()}
      >
        <Ionicons name="arrow-back" size={28} color="#8C77C2" />
      </TouchableOpacity>

      <ScrollView contentContainerStyle={estilos.scrollContent}>
        
        <View style={estilos.headerSessao}>
          <View style={estilos.circuloIconePrincipal}>
            <Ionicons name="accessibility" size={30} color="#8C77C2" />
          </View>
          <Text style={estilos.tituloPrincipal}>Acessibilidade</Text>
        </View>

        <View style={estilos.secao}>
          <View style={estilos.tituloSessaoContainer}>
            <Ionicons name="eye-outline" size={24} color={cores.icone} />
            <Text style={estilos.tituloSessao}>Visual</Text>
          </View>

          <View style={estilos.dropdownContainer}>
            <TouchableOpacity 
              style={[estilos.dropdown, isSystemTheme && estilos.dropdownDesabilitado]}
              disabled={isSystemTheme}
              onPress={() => setIsDropdownOpen(!isDropdownOpen)}
            >
              <View style={estilos.row}>
                <Ionicons 
                  name={selectedTheme === 'claro' ? "sunny-outline" : "moon-outline"} 
                  size={20} 
                  color={cores.icone} 
                />
                <Text style={estilos.textoDropdown}>
                  {selectedTheme === 'claro' ? "Tema claro" : "Tema escuro"}
                </Text>
              </View>
              <Ionicons 
                name={isDropdownOpen ? "chevron-up" : "chevron-down"} 
                size={20} 
                color="#8C77C2" 
              />
            </TouchableOpacity>

            {isDropdownOpen && !isSystemTheme && (
              <View style={estilos.opcoesLista}>
                <TouchableOpacity 
                  style={estilos.opcaoItem} 
                  onPress={() => selecionarTema('claro')}
                >
                  <Text style={[estilos.textoOpcao, selectedTheme === 'claro' && estilos.textoAtivo]}>Tema claro</Text>
                  {selectedTheme === 'claro' && <Ionicons name="checkmark" size={18} color="#8C77C2" />}
                </TouchableOpacity>
                
                <View style={estilos.divisor} />
                
                <TouchableOpacity 
                  style={estilos.opcaoItem} 
                  onPress={() => selecionarTema('escuro')}
                >
                  <Text style={[estilos.textoOpcao, selectedTheme === 'escuro' && estilos.textoAtivo]}>Tema escuro</Text>
                  {selectedTheme === 'escuro' && <Ionicons name="checkmark" size={18} color="#8C77C2" />}
                </TouchableOpacity>
              </View>
            )}
          </View>

          <View style={estilos.configRow}>
            <Text style={estilos.labelConfig}>Padrão do sistema</Text>
            <Switch
              trackColor={{ false: '#D1C6E8', true: '#8C77C2' }}
              thumbColor={'#FFFFFF'}
              onValueChange={() => {
                const novoValor = !isSystemTheme;
                setIsSystemTheme(novoValor);
                setIsDropdownOpen(false);
                salvarConfiguracoes({ sistema: novoValor }); 
              }}
              value={isSystemTheme}
            />
          </View>
          <Text style={estilos.descricao}>
            Todas as telas do aplicativo serão exibidas de acordo com o tema padrão do dispositivo
          </Text>
        </View>

        <View style={estilos.secao}>
          <View style={estilos.tituloSessaoContainer}>
            <Ionicons name="volume-high-outline" size={24} color={cores.icone} />
            <Text style={estilos.tituloSessao}>Sensorial</Text>
          </View>

          <View style={estilos.configRow}>
            <Text style={estilos.labelConfig}>Desativar sons</Text>
            <Switch
              trackColor={{ false: '#D1C6E8', true: '#8C77C2' }}
              thumbColor={'#FFFFFF'}
              onValueChange={() => {
                const novoValor = !isMuted;
                setIsMuted(novoValor);
                salvarConfiguracoes({ sons: novoValor });
              }}
              value={isMuted}
            />
          </View>

          <View style={estilos.configRow}>
            <Text style={estilos.labelConfig}>Desativar vibrações</Text>
            <Switch
              trackColor={{ false: '#D1C6E8', true: '#8C77C2' }}
              thumbColor={'#FFFFFF'}
              onValueChange={() => {
                const novoValor = !isVibrationDisabled;
                setIsVibrationDisabled(novoValor);
                salvarConfiguracoes({ vibracoes: novoValor }); 
              }}
              value={isVibrationDisabled}
            />
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  botaoVoltar: {
    padding: 20,
    marginTop: Platform.OS === 'android' ? 40 : 0,
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  headerSessao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 10,
  },
  circuloIconePrincipal: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F0ECF9',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  tituloPrincipal: {
    fontSize: 28,
    fontFamily: 'REM_Bold', 
    color: '#8C77C2',
  },
  secao: {
    marginBottom: 35,
  },
  tituloSessaoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tituloSessao: {
    fontSize: 22,
    fontFamily: 'REM_Bold',
    color: '#555',
    marginLeft: 12,
  },
  dropdownContainer: {
    marginBottom: 20,
    zIndex: 10,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    paddingHorizontal: 15,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  opcoesLista: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 12,
    marginTop: 5,
    overflow: 'hidden',
  },
  opcaoItem: {
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  divisor: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginHorizontal: 10,
  },
  textoOpcao: {
    fontSize: 16,
    color: '#666',
    fontFamily: 'REM_Regular',
  },
  textoAtivo: {
    color: '#8C77C2',
    fontFamily: 'REM_Medium',
  },
  dropdownDesabilitado: {
    backgroundColor: '#F9F9F9',
    opacity: 0.6,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textoDropdown: {
    marginLeft: 10,
    fontSize: 16,
    color: '#444',
    fontFamily: 'REM_Medium',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  labelConfig: {
    fontSize: 17,
    fontFamily: 'REM_Medium',
    color: '#444',
  },
  descricao: {
    fontSize: 13,
    color: '#999',
    fontFamily: 'REM_Regular',
    lineHeight: 18,
    marginTop: 5,
    paddingRight: 40,
  },
});
