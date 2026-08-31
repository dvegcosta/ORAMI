import React, { useRef } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import LottieView from 'lottie-react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useEstilosTema, usarTema } from '../lib/tema';

export default function TelaComecinho({ navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const animation = useRef(null);

  const esperarUmPouco = () => {

    setTimeout(() => {
      navigation.replace('TelaInicial');
    }, 500);
  };

  return (
    <LinearGradient
      colors={cores.gradienteInicial}
      locations={[0, 0.28, 0.48, 0.70, 0.96]}
      style={estilos.container}
    >
      <View style={estilos.conteudo}>
        <LottieView
          ref={animation}
          source={require('../assets/orami-intro.json')}
          autoPlay
          loop={false}
          resizeMode="contain"
          onAnimationFinish={esperarUmPouco}
          style={estilos.animacao}
        />
        <Text style={estilos.titulo}>ORAMI</Text>
      </View>
    </LinearGradient>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
  },
  conteudo: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  animacao: {
    width: 210,
    height: 210,
  },
  titulo: {
    marginTop: 24,
    fontSize: 36,
    fontWeight: 'normal',
    color: '#8B72C2',
    fontFamily: 'KronaOne',
    letterSpacing: 2,
  },
});