import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  TouchableOpacity,
  SafeAreaView
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEstilosTema, usarTema } from '../lib/tema';

export default function TelaInicial({ navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  return (
    <LinearGradient
      colors={cores.gradienteInicial}
      locations={[0, 0.28, 0.48, 0.70, 0.96]}
      style={estilos.telaPrincipal}
    >
      <SafeAreaView style={estilos.areaSegura}>
        <View style={estilos.secaoSuperior}>
          <Text style={estilos.textoBemVindo}>
            Bem-vindo!
          </Text>

          <View style={estilos.caixaLogo}>
            <Image
              source={require('../assets/logo.png')}
              style={estilos.logo}
              resizeMode="contain"
            />
          </View>

          <Text style={estilos.titulo}>
            ORAMI
          </Text>

          <View style={estilos.linhaDecorativa} />

          <Text style={estilos.subtitulo}>
            Leve, acolhedor e pensado{'\n'}especialmente para você.
          </Text>
        </View>

        <View style={estilos.secaoInferior}>
          <TouchableOpacity
            style={estilos.areaTocavel}
            activeOpacity={0.8}
            onPress={() => navigation?.navigate('TelaLogin')}
          >
            <LinearGradient
              colors={['#7A90D4', '#8C77C2']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={estilos.botaoPrimario}
            >
              <Text style={estilos.textoBotaoPrimario}>
                Entrar
              </Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={estilos.areaTocavelSecundaria}
            activeOpacity={0.7}
            onPress={() => navigation?.navigate('TelaCadastro')}
          >
            <LinearGradient
              colors={['#7A90D4', '#8C77C2']}
              start={{ x: 0, y: 0.5 }}
              end={{ x: 1, y: 0.5 }}
              style={estilos.bordaGradiente}
            >
              <View style={estilos.interiorBotaoTransparente}>
                <Text style={estilos.textoBotaoSecundario}>
                  Cadastrar-se
                </Text>
              </View>
            </LinearGradient>
          </TouchableOpacity>
        </View>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 72,
    paddingHorizontal: 34,
  },
  secaoSuperior: {
    alignItems: 'center',
    marginTop: 40,
  },
  textoBemVindo: {
    fontFamily: 'REM_Bold',
    fontSize: 33,
    color: '#8B72C2',
    marginBottom: 58,
  },
  caixaLogo: {
    width: 185,
    height: 185,
    marginBottom: 30,
  },
  logo: {
    width: '100%',
    height: '100%',
  },
  titulo: {
    fontFamily: 'KronaOne',
    fontSize: 32,
    color: '#8B72C2',
    letterSpacing: 1.3,
    marginBottom: 25,
    textAlign: 'center',
    marginTop: -20,
  },
  linhaDecorativa: {
    width: 40,
    height: 4,
    backgroundColor: '#8C77C2',
    borderRadius: 2,
    marginBottom: 25,
    opacity: 0.5,
  },
  subtitulo: {
    fontFamily: 'REM_Medium',
    fontSize: 16,
    color: '#6B5D7A',
    textAlign: 'center',
    lineHeight: 24,
  },
  secaoInferior: {
    width: '100%',
    paddingBottom: 40,
    gap: 16,
  },
  areaTocavel: {
    width: '100%',
    borderRadius: 16,
    shadowColor: '#8C77C2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  botaoPrimario: {
    height: 60,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoPrimario: {
    fontFamily: 'REM_Bold',
    color: '#FFFFFF',
    fontSize: 18,
  },
  areaTocavelSecundaria: {
    width: '100%',
  },
  bordaGradiente: {
    height: 60,
    borderRadius: 16,
    padding: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  interiorBotaoTransparente: {
    flex: 1,
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoBotaoSecundario: {
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    fontSize: 18,
  },
});
