import React, { useRef, useEffect, useMemo } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
  Platform,
  ActivityIndicator,
  PanResponder,
} from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import TelaComunidades from './TelaComunidades';
import TelaRecursos from './TelaRecursos';
import TelaHome from './TelaHome';
import TelaGuias from './TelaGuias';
import TelaPerfil from './TelaPerfil';
import { useEstilosTema, useTemaUsuario, usarTema } from '../lib/tema';
import { supabase } from '../lib/supabase';

const Tab = createBottomTabNavigator();
const { width } = Dimensions.get('window');

const TAB_WIDTH = width / 5;
const INDICADOR_LARGURA = 48;

const ROTAS_MENU = [
  'TelaComunidades',
  'TelaRecursos',
  'TelaHome',
  'TelaGuias',
  'TelaPerfil',
];

const TELAS_SEM_MENU = [
  'TelaSegurancaPrivacidade',
  'TelaPost',
  'TelaPesquisa',
  'TelaNotificacao',
  'TelaMinhasComunidades',
  'TelaManualUso',
  'TelaLogin',
  'TelaItensSalvos',
  'TelaInicial',
  'TelaEditarComunidade',
  'TelaCriarPost',
  'TelaConfigUsuario',
  'TelaConfigComunidade',
  'TelaComecinho',
  'TelaComunicacao',
  'TelaCentralAjuda',
  'TelaCadastro',
  'TelaAcessibilidade'
];

const iconeDaRota = (nome) => {
  if (nome === 'TelaComunidades') return 'account-group';
  if (nome === 'TelaRecursos') return 'heart-circle';
  if (nome === 'TelaHome') return 'home-variant';
  if (nome === 'TelaGuias') return 'book-open-page-variant';
  return 'account-circle';
};

const BotaoMenu = ({ routeName, isFocused, onPress, paddingBottom }) => {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePress = () => {
    Animated.sequence([
      Animated.timing(scaleValue, { toValue: 0.9, duration: 100, useNativeDriver: true }),
      Animated.timing(scaleValue, { toValue: 1, duration: 150, useNativeDriver: true }),
    ]).start();
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      activeOpacity={0.7}
      style={[
        estilos.botao,
        { paddingBottom: paddingBottom > 0 ? paddingBottom / 1.5 : 0 },
      ]}
    >
      <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
        <MaterialCommunityIcons
          name={iconeDaRota(routeName)}
          size={30}
          color={isFocused ? cores.primaria : cores.textoTerciario}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

export const BarraMenuGlobal = ({ rotaAtual }) => {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const [idUsuario, setIdUsuario] = React.useState(null);
  const [authVerificado, setAuthVerificado] = React.useState(false);
  const translateX = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    let montado = true;

    const carregarUsuario = async () => {
      const { data } = await supabase.auth.getUser();
      if (montado) {
        setIdUsuario(data?.user?.id || null);
        setAuthVerificado(true);
      }
    };

    carregarUsuario();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (montado) {
        setIdUsuario(session?.user?.id || null);
        setAuthVerificado(true);
      }
    });

    return () => {
      montado = false;
      listener?.subscription?.unsubscribe();
    };
  }, []);

  let indiceAtivo = null;

  if (rotaAtual) {
    if (rotaAtual.name === 'TelaPerfil') {
      const idPerfil = rotaAtual.params?.id_perfil;
      if (!idPerfil || idPerfil === idUsuario) {
        indiceAtivo = ROTAS_MENU.indexOf('TelaPerfil');
      }
    } else {
      const indice = ROTAS_MENU.indexOf(rotaAtual.name);
      if (indice >= 0) {
        indiceAtivo = indice;
      }
    }
  }

  useEffect(() => {
    const destino =
      indiceAtivo === null
        ? 0
        : (indiceAtivo * TAB_WIDTH) + (TAB_WIDTH / 2) - (INDICADOR_LARGURA / 2);

    Animated.spring(translateX, {
      toValue: destino,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [indiceAtivo, translateX]);

  // Se não carregou o usuário ou a rota atual estiver na lista de bloqueio, esconde o menu
  if (!authVerificado || !idUsuario) return null;
  if (rotaAtual && TELAS_SEM_MENU.includes(rotaAtual.name)) return null;

  const irParaAba = (nomeRota) => {
    navigation.navigate('MenuNavegacao', {
      id_usuario: idUsuario,
      screen: nomeRota,
      params: { id_usuario: idUsuario },
    });
  };

  const altura = (Platform.OS === 'ios' ? 65 : 55) + insets.bottom;
  
  return (
    <View
      pointerEvents="box-none"
      style={[
        estilos.tabBarContainer,
        { height: altura },
      ]}
    >
      {indiceAtivo !== null && (
        <Animated.View
          style={[
            estilos.indicador,
            { transform: [{ translateX }] },
          ]}
        />
      )}

      {ROTAS_MENU.map((routeName) => {
        const index = ROTAS_MENU.indexOf(routeName);
        return (
          <BotaoMenu
            key={routeName}
            routeName={routeName}
            isFocused={indiceAtivo === index}
            onPress={() => irParaAba(routeName)}
            paddingBottom={insets.bottom}
          />
        );
      })}
    </View>
  );
};

export default function MenuNavegacao({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const idUsuarioParam = route.params?.id_usuario || null;
  const [id_usuario, setIdUsuario] = React.useState(idUsuarioParam);

  useEffect(() => {
    if (idUsuarioParam) {
      setIdUsuario(idUsuarioParam);
      return;
    }

    supabase.auth.getUser().then(({ data }) => {
      if (data?.user?.id) setIdUsuario(data.user.id);
    });
  }, [idUsuarioParam]);

  useTemaUsuario(id_usuario);

  const panResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponderCapture: (_event, gestureState) => {
      const horizontal = Math.abs(gestureState.dx);
      const vertical = Math.abs(gestureState.dy);
      return horizontal > 20 && horizontal > vertical * 1.2;
    },
    onPanResponderRelease: (_event, gestureState) => {
      if (Math.abs(gestureState.dx) < 60) return;

      const state = navigation.getState();
      const menuRoute = state.routes.find((r) => r.key === route.key);
      const childState = menuRoute?.state;
      const indiceAtual = childState?.index ?? 2;

      // CORREÇÃO: Usando a navegação aninhada (nested navigation)
      if (gestureState.dx < 0 && indiceAtual < ROTAS_MENU.length - 1) {
        navigation.navigate('MenuNavegacao', {
          screen: ROTAS_MENU[indiceAtual + 1],
          params: { id_usuario }
        });
      } else if (gestureState.dx > 0 && indiceAtual > 0) {
        navigation.navigate('MenuNavegacao', {
          screen: ROTAS_MENU[indiceAtual - 1],
          params: { id_usuario }
        });
      }
    },
  }), [navigation, route.key, id_usuario]);

  if (!id_usuario) {
    return (
      <View style={estilos.loadingContainer}>
        <ActivityIndicator size="large" color={cores.primaria} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }} {...panResponder.panHandlers}>
      <Tab.Navigator
        initialRouteName={route.params?.screen || 'TelaHome'}
        tabBar={() => null}
        screenOptions={{ headerShown: false }}
      >
        <Tab.Screen name="TelaComunidades" component={TelaComunidades} initialParams={{ id_usuario }} />
        <Tab.Screen name="TelaRecursos" component={TelaRecursos} initialParams={{ id_usuario }} />
        <Tab.Screen name="TelaHome" component={TelaHome} initialParams={{ id_usuario }} />
        <Tab.Screen name="TelaGuias" component={TelaGuias} initialParams={{ id_usuario }} />
        <Tab.Screen name="TelaPerfil" component={TelaPerfil} initialParams={{ id_usuario }} />
      </Tab.Navigator>
    </View>
  );
}

const estilosBase = StyleSheet.create({
  tabBarContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    position: 'absolute',
    bottom: -1,
    width: '100%',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    elevation: 25,
    shadowColor: '#8C77C2',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    borderTopWidth: 1,
    borderTopColor: '#F8F7FF',
    zIndex: 1000,
  },
  botao: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  indicador: {
    position: 'absolute',
    top: 0,
    width: INDICADOR_LARGURA,
    height: 4,
    backgroundColor: '#8C77C2',
    borderRadius: 2,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FAFAFC',
  },
});