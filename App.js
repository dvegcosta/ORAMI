import React from 'react';
import { Platform, View } from 'react-native';
import { NavigationContainer, DefaultTheme, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import * as SplashScreen from 'expo-splash-screen';
import * as NavigationBar from 'expo-navigation-bar';
import { StatusBar } from 'expo-status-bar';
import { useFonts } from 'expo-font';
import { KronaOne_400Regular } from '@expo-google-fonts/krona-one';
import {
  REM_400Regular,
  REM_700Bold,
  REM_800ExtraBold,
  REM_500Medium
} from '@expo-google-fonts/rem';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import TelaComecinho from './telas/TelaComecinho';
import TelaInicial from './telas/TelaInicial';
import TelaLogin from './telas/TelaLogin';
import TelaCadastro from './telas/TelaCadastro';
import MenuNavegacao, { BarraMenuGlobal } from './telas/MenuNavegacao';
import TelaPesquisa from './telas/TelaPesquisa';
import TelaConfigUsuario from './telas/TelaConfigUsuario';
import TelaAcessibilidade from './telas/TelaAcessibilidade';
import TelaSegurancaPrivacidade from './telas/TelaSegurancaPrivacidade';
import TelaCentralAjuda from './telas/TelaCentralAjuda';
import TelaManualUso from './telas/TelaManualUso';
import TelaCriarPost from './telas/TelaCriarPost';
import TelaMinhasComunidades from './telas/TelaMinhasComunidades';
import TelaConfigComunidade from './telas/TelaConfigComunidade';
import TelaComunidade from './telas/TelaComunidade';
import TelaEditarComunidade from './telas/TelaEditarComunidade';
import TelaPost from './telas/TelaPost';
import TelaPerfil from './telas/TelaPerfil';
import TelaItensSalvos from './telas/TelaItensSalvos';
import TelaNotificacao from './telas/TelaNotificacao';
import TelaRegistrarCrise from './telas/TelaRegistrarCrise';
import TelaComunicacao from './telas/TelaComunicacao';
import TelaCriarRotina from './telas/TelaCriarRotina';
import TelaRegistrosDiarios from './telas/TelaRegistrosDiarios';
import TelaContPasta from './telas/TelaContPasta';
import TelaDM from './telas/TelaDM';
import TelaConversa from './telas/TelaConversa';
import { ProvedorTema, usarTema } from './lib/tema';
import { ProvedorPopup } from './lib/popup';

SplashScreen.preventAutoHideAsync();

const Pilha = createNativeStackNavigator();

function RotasApp() {
  const { temaAtivo, cores } = usarTema();

  const navRef = useNavigationContainerRef();
  const [rotaAtual, setRotaAtual] = React.useState(null);

  React.useEffect(() => {
    if (Platform.OS !== 'android') return;

    NavigationBar.setBackgroundColorAsync(cores.superficie);
    NavigationBar.setButtonStyleAsync(
      temaAtivo === 'escuro' ? 'light' : 'dark'
    );
  }, [cores.superficie, temaAtivo]);

  const temaNavegacao = React.useMemo(
    () => ({
      ...DefaultTheme,
      colors: {
        ...DefaultTheme.colors,
        background: cores.fundoAlternativo,
        card: cores.superficie,
        text: cores.texto,
        border: cores.borda,
        primary: cores.primaria,
        notification: cores.perigo,
      },
      dark: temaAtivo === 'escuro',
    }),
    [cores, temaAtivo]
  );

  return (
    <>
      <StatusBar
        style={temaAtivo === 'escuro' ? 'light' : 'dark'}
      />

      <View style={{ flex: 1 }}>
        <NavigationContainer 
          theme={temaNavegacao}
          ref={navRef} 
          onReady={() => setRotaAtual(navRef.getCurrentRoute())} 
          onStateChange={() => setRotaAtual(navRef.getCurrentRoute())}
        >
          <Pilha.Navigator
            initialRouteName="TelaComecinho"
            screenOptions={{ headerShown: false }}
          >
            <Pilha.Screen
              name="TelaComecinho"
              component={TelaComecinho}
            />

            <Pilha.Screen
              name="TelaInicial"
              component={TelaInicial}
            />

            <Pilha.Screen
              name="TelaLogin"
              component={TelaLogin}
            />

            <Pilha.Screen
              name="TelaCadastro"
              component={TelaCadastro}
            />

            <Pilha.Screen
              name="MenuNavegacao"
              component={MenuNavegacao}
            />

            <Pilha.Screen
              name="TelaPesquisa"
              component={TelaPesquisa}
            />

            <Pilha.Screen
              name="TelaConfigUsuario"
              component={TelaConfigUsuario}
            />

            <Pilha.Screen
              name="TelaAcessibilidade"
              component={TelaAcessibilidade}
            />

            <Pilha.Screen
              name="TelaSegurancaPrivacidade"
              component={TelaSegurancaPrivacidade}
            />

            <Pilha.Screen
              name="TelaCentralAjuda"
              component={TelaCentralAjuda}
            />

            <Pilha.Screen
              name="TelaManualUso"
              component={TelaManualUso}
            />

            <Pilha.Screen
              name="TelaCriarPost"
              component={TelaCriarPost}
            />

            <Pilha.Screen
              name="TelaMinhasComunidades"
              component={TelaMinhasComunidades}
            />

            <Pilha.Screen 
             name="TelaContPasta"
             component={TelaContPasta} 
             />

            <Pilha.Screen
              name="TelaConfigComunidade"
              component={TelaConfigComunidade}
            />

            <Pilha.Screen
              name="TelaComunidade"
              component={TelaComunidade}
            />

            <Pilha.Screen
              name="TelaEditarComunidade"
              component={TelaEditarComunidade}
            />

            <Pilha.Screen
              name="TelaDM"
              component={TelaDM}
            />

            <Pilha.Screen
              name="TelaConversa"
              component={TelaConversa}
            />

            <Pilha.Screen
              name="TelaPost"
              component={TelaPost}
            />

            <Pilha.Screen
              name="TelaPerfil"
              component={TelaPerfil}
            />

            <Pilha.Screen
              name="TelaItensSalvos"
              component={TelaItensSalvos}
            />

            <Pilha.Screen
              name="TelaNotificacao"
              component={TelaNotificacao}
            />

            <Pilha.Screen
              name="TelaRegistrarCrise"
              component={TelaRegistrarCrise}
            />

            <Pilha.Screen
              name="TelaComunicacao"
              component={TelaComunicacao}
            />

            <Pilha.Screen
              name="TelaCriarRotina"
              component={TelaCriarRotina}
            />

            <Pilha.Screen
              name="TelaRegistrosDiarios"
              component={TelaRegistrosDiarios}
            />
          </Pilha.Navigator>

          <BarraMenuGlobal rotaAtual={rotaAtual} />
        </NavigationContainer>
      </View>
    </>
  );
}

export default function App() {
  const [fontsLoaded] = useFonts({
    KronaOne: KronaOne_400Regular,
    REM_Regular: REM_400Regular,
    REM_Medium: REM_500Medium,
    REM_Bold: REM_700Bold,
    REM_ExtraBold: REM_800ExtraBold,
  });

  React.useEffect(() => {
    if (fontsLoaded) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <SafeAreaProvider>
      <ProvedorTema>
        <ProvedorPopup>
          <RotasApp />
        </ProvedorPopup>
      </ProvedorTema>
    </SafeAreaProvider>
  );
}