import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Modal, Image, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

const { width } = Dimensions.get('window');
const MENU_WIDTH = width * 0.75;

export default function MenuLateral({ visivel, aoFechar, navigation, id_usuario, perfil }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();

  const animacaoMenu = useRef(new Animated.Value(-MENU_WIDTH)).current;
  const animacaoFundo = useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visivel) {
      Animated.parallel([
        Animated.timing(animacaoMenu, { toValue: 0, duration: 300, useNativeDriver: true }),
        Animated.timing(animacaoFundo, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(animacaoMenu, { toValue: -MENU_WIDTH, duration: 300, useNativeDriver: true }),
        Animated.timing(animacaoFundo, { toValue: 0, duration: 300, useNativeDriver: true }),
      ]).start();
    }
  }, [visivel]);

  const irParaTela = (nomeTela) => {
    aoFechar();
    navigation.navigate(nomeTela, { id_usuario });
  };

  const handleDesconectar = () => {
    aoFechar();
    Alert.alert('Desconectar', 'Tem certeza que deseja sair da sua conta agora?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Sair', onPress: () => navigation.replace('TelaLogin'), style: 'destructive' }
    ]);
  };

  const menuItems = [
    { icone: 'accessibility-outline',  texto: 'Acessibilidade',        acao: () => irParaTela('TelaAcessibilidade') },
    { icone: 'bookmark-outline',       texto: 'Itens salvos',           acao: () => irParaTela('TelaItensSalvos') },
    { icone: 'lock-closed-outline',    texto: 'Segurança e Privacidade', acao: () => irParaTela('TelaSegurancaPrivacidade') },
    { icone: 'help-circle-outline',    texto: 'Central de ajuda',       acao: () => irParaTela('TelaCentralAjuda') },
    { icone: 'book-outline',           texto: 'Manual de uso',          acao: () => irParaTela('TelaManualUso') },
    { icone: 'log-out-outline',        texto: 'Desconectar',            cor: '#FF6B6B', acao: handleDesconectar },
  ];

  if (!visivel) return null;

  return (
    <Modal transparent visible={visivel} animationType="none" onRequestClose={aoFechar}>
      <View style={estilos.modalOverlay}>

        <Animated.View style={[estilos.fundoEscuro, { opacity: animacaoFundo }]}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={aoFechar} activeOpacity={1} />
        </Animated.View>

        <Animated.View style={[estilos.painelMenu, { transform: [{ translateX: animacaoMenu }] }]}>

          <TouchableOpacity
            style={estilos.perfilMenuContainer}
            activeOpacity={0.7}
            onPress={() => { navigation.navigate('TelaPerfil', { id_usuario }); aoFechar(); }}
          >
            <View style={estilos.linhaRoxaPerfil} />

            {perfil?.fotoBase64 ? (
              <Image source={{ uri: `data:image/jpeg;base64,${perfil.fotoBase64}` }} style={estilos.fotoPerfilMenu} />
            ) : (
              <View style={[estilos.fotoPerfilMenu, estilos.fotoPlaceholder]}>
                <Ionicons name="person" size={30} color="#FFF" />
              </View>
            )}

            <View style={estilos.infoPerfilMenu}>
              <Text style={estilos.nomePerfilMenu} numberOfLines={1}>{perfil?.nome || 'Carregando...'}</Text>
              <Text style={estilos.textoVerPerfil}>Ver perfil</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </TouchableOpacity>

          <View style={estilos.listaOpcoesMenu}>
            {menuItems.map((item, index) => (
              <TouchableOpacity key={index} style={estilos.itemMenu} activeOpacity={0.7} onPress={item.acao}>
                <Ionicons name={item.icone} size={22} color={item.cor || cores.icone} />
                <Text style={[estilos.textoItemMenu, item.cor && { color: item.cor }]}>{item.texto}</Text>
              </TouchableOpacity>
            ))}
          </View>

        </Animated.View>
      </View>
    </Modal>
  );
}

const estilosBase = StyleSheet.create({
  modalOverlay: { flex: 1, flexDirection: 'row' },
  fundoEscuro: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.5)' },
  painelMenu: {
    width: MENU_WIDTH,
    height: '100%',
    backgroundColor: '#FFFFFF',
    borderTopRightRadius: 30,
    borderBottomRightRadius: 30,
    paddingTop: 60,
    paddingHorizontal: 20,
    elevation: 15,
    shadowColor: '#000',
    shadowOffset: { width: 2, height: 0 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
  },
  perfilMenuContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 40, position: 'relative' },
  linhaRoxaPerfil: { position: 'absolute', left: -20, width: 4, height: '100%', backgroundColor: '#8C77C2', borderTopRightRadius: 5, borderBottomRightRadius: 5 },
  fotoPerfilMenu: { width: 60, height: 60, borderRadius: 30, marginRight: 15, marginLeft: 10 },
  fotoPlaceholder: { backgroundColor: '#C6DFFF', justifyContent: 'center', alignItems: 'center' },
  infoPerfilMenu: { flex: 1, justifyContent: 'center' },
  nomePerfilMenu: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
  textoVerPerfil: { fontSize: 13, color: '#999' },
  listaOpcoesMenu: { marginTop: 10 },
  itemMenu: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, marginBottom: 3 },
  textoItemMenu: { fontFamily: 'REM_Bold', fontSize: 16, marginLeft: 10, fontWeight: '600', color: '#555' },
});