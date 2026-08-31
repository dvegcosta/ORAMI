import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  RefreshControl,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';

const imagemUri = (valor) => {
  if (!valor) return null;
  const texto = String(valor);
  if (texto.startsWith('data:') || texto.startsWith('http://') || texto.startsWith('https://')) return { uri: texto };
  return { uri: `data:image/jpeg;base64,${texto}` };
};

const formatarTempo = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';

  const agora = new Date();
  const diffMs = Math.max(0, agora.getTime() - data.getTime());
  const diffMin = Math.floor(diffMs / 60000);
  const diffHora = Math.floor(diffMin / 60);
  const diffDia = Math.floor(diffHora / 24);

  if (diffMin < 1) return 'agora';
  if (diffMin < 60) return `há ${diffMin} min`;
  if (diffHora < 24) return `há ${diffHora}h`;
  if (diffDia < 7) return `há ${diffDia}d`;

  return data.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
};

export default function TelaDM({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};

  const [conversas, setConversas] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState(false);

  const carregarConversas = useCallback(async (modoAtualizacao = false) => {
    if (!id_usuario) return;
    if (modoAtualizacao) setAtualizando(true);
    else setCarregando(true);

    try {
      const { data, error } = await supabase.rpc('orami_obter_chats_usuario', {
        p_id_usuario: id_usuario,
      });

      if (error) throw error;
      setConversas(data || []);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
      setConversas([]);
    } finally {
      if (modoAtualizacao) setAtualizando(false);
      else setCarregando(false);
    }
  }, [id_usuario]);

  useFocusEffect(
    useCallback(() => {
      carregarConversas();

      if (!id_usuario) return undefined;

      const topic = `orami-dm-${id_usuario}`;
      const anterior = supabase.getChannels().find(
        (channel) => channel?.topic === `realtime:${topic}`
      );
      if (anterior) supabase.removeChannel(anterior);

      const canal = supabase
        .channel(topic)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensagens',
          },
          () => carregarConversas()
        )
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'mensagens',
          },
          () => carregarConversas()
        )
        .subscribe();

      return () => {
        supabase.removeChannel(canal);
      };
    }, [id_usuario, carregarConversas])
  );

  const abrirConversa = (item) => {
    navigation.navigate('TelaConversa', {
      id_usuario_logado: id_usuario,
      id_usuario_destino: item.id_outro_usuario,
      id_chat: item.id_chat,
    });
  };

  const conversasFiltradas = conversas.filter((item) => {
    const texto = pesquisa.trim().toLowerCase();
    if (!texto) return true;

    return (
      String(item.nome_exibicao || '').toLowerCase().includes(texto) ||
      String(item.nome_usuario || '').toLowerCase().includes(texto)
    );
  });

  const renderItem = ({ item }) => {
    const foto = imagemUri(item.foto_perfil);
    const ultimaMensagem = item.ultima_mensagem || 'Conversa iniciada';
    const souRemetente = String(item.id_ultimo_remetente || '') === String(id_usuario || '');

    return (
      <TouchableOpacity
        activeOpacity={0.72}
        style={estilos.cardConversa}
        onPress={() => abrirConversa(item)}
        accessibilityRole="button"
        accessibilityLabel={`Abrir conversa com ${item.nome_exibicao || item.nome_usuario || 'usuário'}`}
      >
        {foto ? (
          <Image source={foto} style={estilos.avatarConversa} />
        ) : (
          <View style={[estilos.avatarConversa, estilos.avatarPlaceholder]}>
            <Ionicons name="person" size={24} color={cores.primaria} />
          </View>
        )}

        <View style={estilos.infoConversa}>
          <View style={estilos.linhaNomeConversa}>
            <Text style={estilos.nomeConversa} numberOfLines={1}>
              {item.nome_exibicao || item.nome_usuario || 'Usuário'}
            </Text>
            <Text style={estilos.horarioConversa}>
              {formatarTempo(item.data_ultima_mensagem)}
            </Text>
          </View>

          <Text style={estilos.previewConversa} numberOfLines={1}>
            {souRemetente ? 'Você: ' : ''}{ultimaMensagem}
          </Text>
        </View>

        <Ionicons
          name="chevron-forward"
          size={19}
          color={cores.textoTerciario}
        />
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={estilos.botaoVoltar}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={28} color={cores.primaria} />
        </TouchableOpacity>

        <View style={estilos.tituloLinha}>
          <View style={estilos.iconeTitulo}>
            <Ionicons
              name="chatbubbles"
              size={28}
              color={cores.primaria}
            />
          </View>
          <Text style={estilos.titulo}>Conversas</Text>
        </View>
      </View>

      <View style={estilos.pesquisaContainer}>
        <Ionicons
          name="search-outline"
          size={21}
          color={cores.primaria}
          style={estilos.iconePesquisa}
        />
        <TextInput
          style={estilos.inputPesquisa}
          placeholder="Pesquisar"
          placeholderTextColor={cores.textoTerciario}
          value={pesquisa}
          onChangeText={setPesquisa}
          returnKeyType="search"
          accessibilityLabel="Pesquisar conversas"
        />
      </View>

      {carregando ? (
        <View style={estilos.estadoCentral}>
          <ActivityIndicator size="large" color={cores.primaria} />
        </View>
      ) : (
        <FlatList
          data={conversasFiltradas}
          keyExtractor={(item) => String(item.id_chat)}
          renderItem={renderItem}
          refreshControl={(
            <RefreshControl
              refreshing={atualizando}
              onRefresh={() => carregarConversas(true)}
              tintColor={cores.primaria}
              colors={[cores.primaria]}
            />
          )}
          contentContainerStyle={[
            estilos.lista,
            conversasFiltradas.length === 0 && estilos.listaVazia,
          ]}
          ListEmptyComponent={(
            <View style={estilos.estadoVazio}>
              <View style={estilos.iconeVazio}>
                <Ionicons
                  name="chatbubbles-outline"
                  size={34}
                  color={cores.primaria}
                />
              </View>
              <Text style={estilos.tituloVazio}>
                Nenhuma conversa ainda
              </Text>
              <Text style={estilos.textoVazio}>
                Quando você conversar com um amigo, a conversa aparecerá aqui.
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: 50,
    paddingHorizontal: 24,
    paddingBottom: 18,
  },
  botaoVoltar: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  tituloLinha: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconeTitulo: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EEE9F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 13,
  },
  titulo: {
    fontFamily: 'REM_Bold',
    fontSize: 30,
    color: '#8C77C2',
    letterSpacing: -0.6,
  },
  pesquisaContainer: {
    marginHorizontal: 26,
    marginBottom: 18,
    height: 46,
    borderWidth: 1.5,
    borderColor: '#D7C9F1',
    borderRadius: 23,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  iconePesquisa: {
    marginRight: 8,
  },
  inputPesquisa: {
    flex: 1,
    fontFamily: 'REM_Medium',
    fontSize: 14,
    color: '#3E3947',
    height: '100%',
  },
  lista: {
    paddingBottom: 90,
  },
  listaVazia: {
    flexGrow: 1,
  },
  cardConversa: {
    minHeight: 84,
    paddingHorizontal: 22,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#EAE7EF',
  },
  avatarConversa: {
    width: 52,
    height: 52,
    borderRadius: 26,
    marginRight: 14,
    backgroundColor: '#F0EDF5',
  },
  avatarPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoConversa: {
    flex: 1,
    minWidth: 0,
    marginRight: 8,
  },
  linhaNomeConversa: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  nomeConversa: {
    flex: 1,
    fontFamily: 'REM_Bold',
    fontSize: 16,
    color: '#1D1A22',
    marginRight: 10,
  },
  horarioConversa: {
    fontFamily: 'REM_Medium',
    fontSize: 11,
    color: '#918A9B',
  },
  previewConversa: {
    fontFamily: 'REM_Regular',
    fontSize: 13,
    color: '#706A78',
  },
  estadoCentral: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  estadoVazio: {
    flex: 1,
    minHeight: 360,
    paddingHorizontal: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconeVazio: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#EEE9F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  tituloVazio: {
    fontFamily: 'REM_Bold',
    fontSize: 18,
    color: '#3D3845',
    textAlign: 'center',
    marginBottom: 7,
  },
  textoVazio: {
    fontFamily: 'REM_Regular',
    fontSize: 14,
    lineHeight: 21,
    color: '#817A89',
    textAlign: 'center',
  },
});
