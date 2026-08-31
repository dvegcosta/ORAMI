import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import { normalizarImagem, uploadImagemBase64, BUCKETS, removerImagemStorage } from '../lib/storage';

const imagemUri = (valor) => normalizarImagem(valor);

const formatarHorario = (valor) => {
  if (!valor) return '';
  const data = new Date(valor);
  if (Number.isNaN(data.getTime())) return '';
  return data.toLocaleTimeString('pt-BR', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export default function TelaConversa({ route, navigation }) {
  const { cores } = usarTema();
  const estilos = useEstilosTema(estilosBase);
  const {
    id_usuario_logado,
    id_usuario_destino,
    id_chat: idChatInformado,
  } = route.params || {};

  const [chat, setChat] = useState(null);
  const [mensagens, setMensagens] = useState([]);
  const [texto, setTexto] = useState('');
  const [imagemSelecionada, setImagemSelecionada] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [perfilDestino, setPerfilDestino] = useState(null);

  const listaRef = useRef(null);
  const canalRef = useRef(null);

  const carregarPerfilDestino = useCallback(async () => {
    if (!id_usuario_destino) return;

    const { data, error } = await supabase
      .from('usuarios')
      .select('id_usuario,nome_exibicao,nome_usuario,foto_perfil')
      .eq('id_usuario', id_usuario_destino)
      .maybeSingle();

    if (!error) setPerfilDestino(data || null);
  }, [id_usuario_destino]);

  const carregarMensagens = useCallback(async (chatId) => {
    const { data, error } = await supabase
      .from('mensagens')
      .select('id_mensagem,id_chat,id_usuario_remetente,conteudo,tipo_mensagem,status,enviado_em,visualizado_em')
      .eq('id_chat', chatId)
      .neq('status', 'removida')
      .order('enviado_em', { ascending: true })
      .order('id_mensagem', { ascending: true })
      .limit(300);

    if (error) throw error;
    setMensagens(data || []);
  }, []);

  const iniciarChat = useCallback(async () => {
    if (!id_usuario_logado || !id_usuario_destino) return;

    setCarregando(true);
    setErro(null);

    try {
      let chatId = idChatInformado;

      if (!chatId) {
        const { data, error } = await supabase.rpc(
          'orami_obter_ou_criar_chat',
          {
            p_id_usuario_logado: id_usuario_logado,
            p_id_usuario_destino: id_usuario_destino,
          }
        );

        if (error) throw error;
        chatId = data;
      }

      if (!chatId) throw new Error('Não foi possível abrir a conversa.');

      setChat({ id_chat: chatId });
      await Promise.all([
        carregarMensagens(chatId),
        carregarPerfilDestino(),
      ]);
    } catch (error) {
      console.error('Erro ao iniciar conversa:', error);
      setErro(error?.message || 'Não foi possível carregar a conversa.');
    } finally {
      setCarregando(false);
    }
  }, [
    id_usuario_logado,
    id_usuario_destino,
    idChatInformado,
    carregarMensagens,
    carregarPerfilDestino,
  ]);

  useEffect(() => {
    iniciarChat();
  }, [iniciarChat]);

  useEffect(() => {
    if (!chat?.id_chat) return undefined;

    const topic = `orami-chat-${chat.id_chat}`;
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
          filter: `id_chat=eq.${chat.id_chat}`,
        },
        (payload) => {
          const novaMensagem = payload.new;
          if (
            !novaMensagem ||
            String(novaMensagem.id_chat) !== String(chat.id_chat)
          ) return;

          setMensagens((anteriores) => {
            const jaExiste = anteriores.some(
              (item) => String(item.id_mensagem) === String(novaMensagem.id_mensagem)
            );
            if (jaExiste) return anteriores;
            return [...anteriores, novaMensagem];
          });
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'mensagens',
          filter: `id_chat=eq.${chat.id_chat}`,
        },
        (payload) => {
          const atualizada = payload.new;
          setMensagens((anteriores) =>
            anteriores
              .map((item) =>
                String(item.id_mensagem) === String(atualizada.id_mensagem)
                  ? atualizada
                  : item
              )
              .filter((item) => item.status !== 'removida')
          );
        }
      )
      .subscribe();

    canalRef.current = canal;

    return () => {
      if (canalRef.current) {
        supabase.removeChannel(canalRef.current);
        canalRef.current = null;
      }
    };
  }, [chat?.id_chat]);

  useEffect(() => {
    if (!mensagens.length) return;
    requestAnimationFrame(() => {
      listaRef.current?.scrollToEnd({ animated: true });
    });
  }, [mensagens.length]);

  const selecionarImagemMensagem = async () => {
    const permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permissao.status !== 'granted') {
      setErro('Precisamos de acesso à galeria para enviar uma imagem.');
      return;
    }

    const resultado = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.7,
      base64: true,
    });

    if (!resultado.canceled && resultado.assets?.[0]?.base64) {
      setImagemSelecionada(resultado.assets[0]);
      setErro(null);
    }
  };

  const enviarMensagem = async () => {
    const conteudo = texto.trim();

    if ((!conteudo && !imagemSelecionada?.base64) || !chat?.id_chat || enviando) {
      return;
    }

    setEnviando(true);
    let imagemEnviada = null;

    try {
      if (imagemSelecionada?.base64) {
        imagemEnviada = await uploadImagemBase64({
          bucket: BUCKETS.MENSAGENS,
          pasta: id_usuario_logado,
          base64: imagemSelecionada.base64,
          mimeType: imagemSelecionada.mimeType || 'image/jpeg',
          nomeBase: 'mensagem',
        });
      }

      const { error } = await supabase
        .from('mensagens')
        .insert({
          id_chat: chat.id_chat,
          id_usuario_remetente: id_usuario_logado,
          conteudo: imagemEnviada?.publicUrl || conteudo,
          tipo_mensagem: imagemEnviada ? 'imagem' : 'texto',
          status: 'enviada',
        });

      if (error) throw error;

      setTexto('');
      setImagemSelecionada(null);
      setErro(null);
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);

      if (imagemEnviada?.publicUrl) {
        await removerImagemStorage(imagemEnviada.publicUrl, BUCKETS.MENSAGENS);
      }

      setErro('Não foi possível enviar a mensagem.');
    } finally {
      setEnviando(false);
    }
  };

  const renderMensagem = ({ item }) => {
    const minha = String(item.id_usuario_remetente) === String(id_usuario_logado);
    const imagemMensagem = item.tipo_mensagem === 'imagem'
      ? imagemUri(item.conteudo)
      : null;

    return (
      <View
        style={[
          estilos.linhaMensagem,
          minha ? estilos.linhaMinha : estilos.linhaOutra,
        ]}
      >
        <View
          style={[
            estilos.bolha,
            minha ? estilos.bolhaMinha : estilos.bolhaOutra,
            item.tipo_mensagem === 'imagem' && estilos.bolhaImagem,
          ]}
        >
          {imagemMensagem ? (
            <Image
              source={imagemMensagem}
              style={estilos.imagemMensagem}
              resizeMode="cover"
            />
          ) : (
            <Text
              style={[
                estilos.textoMensagem,
                minha ? estilos.textoMinha : estilos.textoOutra,
              ]}
            >
              {item.conteudo}
            </Text>
          )}

          <Text
            style={[
              estilos.horarioMensagem,
              minha ? estilos.horarioMinha : estilos.horarioOutra,
            ]}
          >
            {formatarHorario(item.enviado_em)}
          </Text>
        </View>
      </View>
    );
  };

  const fotoDestino = imagemUri(perfilDestino?.foto_perfil);
  const nomeDestino =
    perfilDestino?.nome_exibicao ||
    perfilDestino?.nome_usuario ||
    'Conversa';

  return (
    <SafeAreaView style={estilos.container}>
      <StatusBar
        backgroundColor="#f6f1fc"
        barStyle="dark-content"
        translucent={false}
      />

      <View style={estilos.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={estilos.headerBotao}
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons name="arrow-back" size={27} color={cores.primaria} />
        </TouchableOpacity>

        {fotoDestino ? (
          <Image source={fotoDestino} style={estilos.avatarHeader} />
        ) : (
          <View style={[estilos.avatarHeader, estilos.avatarHeaderPlaceholder]}>
            <Ionicons name="person" size={20} color={cores.primaria} />
          </View>
        )}

        <View style={estilos.infoHeader}>
          <Text style={estilos.nomeHeader} numberOfLines={1}>
            {nomeDestino}
          </Text>

          {!!perfilDestino?.nome_usuario && (
            <Text style={estilos.usernameHeader} numberOfLines={1}>
              @{perfilDestino.nome_usuario}
            </Text>
          )}
        </View>

        <View style={estilos.headerEspaco} />
      </View>

      {erro ? (
        <View style={estilos.estadoCentral}>
          <Ionicons name="alert-circle-outline" size={40} color={cores.perigo} />
          <Text style={estilos.erroTexto}>{erro}</Text>
          <TouchableOpacity onPress={iniciarChat} style={estilos.botaoTentar}>
            <Text style={estilos.botaoTentarTexto}>Tentar novamente</Text>
          </TouchableOpacity>
        </View>
      ) : carregando ? (
        <View style={estilos.estadoCentral}>
          <ActivityIndicator size="large" color={cores.primaria} />
        </View>
      ) : (
        <KeyboardAvoidingView
          style={estilos.conteudo}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={0}
        >
          <FlatList
            ref={listaRef}
            style={estilos.lista}
            data={mensagens}
            keyExtractor={(item) => String(item.id_mensagem)}
            renderItem={renderMensagem}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={[
              estilos.listaMensagens,
              !mensagens.length && estilos.listaMensagensVazia,
            ]}
            ListEmptyComponent={
              <View style={estilos.estadoConversaVazia}>
                <View style={estilos.iconeConversaVazia}>
                  <Ionicons
                    name="chatbubble-outline"
                    size={30}
                    color={cores.primaria}
                  />
                </View>
                <Text style={estilos.tituloConversaVazia}>
                  Comece a conversa
                </Text>
                <Text style={estilos.textoConversaVazia}>
                  Envie uma mensagem para iniciar esta conversa.
                </Text>
              </View>
            }
          />

          <View style={estilos.areaEntrada}>
            {imagemSelecionada?.base64 && (
              <View style={estilos.previewImagemMensagem}>
                <Image
                  source={{
                    uri: `data:image/jpeg;base64,${imagemSelecionada.base64}`,
                  }}
                  style={estilos.previewImagemMensagemImagem}
                />
                <TouchableOpacity
                  style={estilos.removerPreviewMensagem}
                  onPress={() => setImagemSelecionada(null)}
                  accessibilityRole="button"
                  accessibilityLabel="Remover imagem selecionada"
                >
                  <Ionicons name="close-circle" size={22} color="#E74C3C" />
                </TouchableOpacity>
              </View>
            )}

            <View style={estilos.barraDigitacaoArea}>
              <View style={estilos.barraDigitacao}>
                <TouchableOpacity
                  style={estilos.botaoAnexo}
                  onPress={selecionarImagemMensagem}
                  accessibilityRole="button"
                  accessibilityLabel="Adicionar imagem à mensagem"
                >
                  <Ionicons
                    name="image-outline"
                    size={22}
                    color={cores.primaria}
                  />
                </TouchableOpacity>

                <TextInput
                  style={estilos.inputMensagem}
                  value={texto}
                  onChangeText={setTexto}
                  placeholder="Mensagem..."
                  placeholderTextColor={cores.textoTerciario}
                  multiline
                  maxLength={2000}
                  accessibilityLabel="Mensagem"
                  textAlignVertical="center"
                />

                <TouchableOpacity
                  style={[
                    estilos.botaoEnviar,
                    !texto.trim() && !imagemSelecionada?.base64 && estilos.botaoEnviarDesativado,
                  ]}
                  onPress={enviarMensagem}
                  disabled={(!texto.trim() && !imagemSelecionada?.base64) || enviando}
                  accessibilityRole="button"
                  accessibilityLabel="Enviar mensagem"
                >
                  {enviando ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <Ionicons name="send" size={20} color="#FFFFFF" />
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={estilos.areaNavegacaoInferior} />
          </View>
        </KeyboardAvoidingView>
      )}
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
  header: {
    height: 80,
    backgroundColor: '#f6f1fc',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    elevation: 4,
    shadowColor: '#8C77C2',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
  },
  headerBotao: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 4,
  },
  avatarHeader: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginHorizontal: 9,
    backgroundColor: '#ECE8F2',
  },
  avatarHeaderPlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  infoHeader: {
    flex: 1,
    minWidth: 0,
    justifyContent: 'center',
  },
  nomeHeader: {
    fontFamily: 'REM_Bold',
    fontSize: 17,
    color: '#17141D',
  },
  usernameHeader: {
    marginTop: 1,
    fontFamily: 'REM_Medium',
    fontSize: 12,
    color: '#81778D',
  },
  headerEspaco: {
    width: 14,
  },
  conteudo: {
    flex: 1,
    minHeight: 0,
  },
  lista: {
    flex: 1,
  },
  listaMensagens: {
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 18,
  },
  listaMensagensVazia: {
    flexGrow: 1,
  },
  linhaMensagem: {
    width: '100%',
    marginBottom: 10,
  },
  linhaMinha: {
    alignItems: 'flex-end',
  },
  linhaOutra: {
    alignItems: 'flex-start',
  },
  bolha: {
    maxWidth: '79%',
    paddingHorizontal: 15,
    paddingTop: 11,
    paddingBottom: 7,
    borderRadius: 18,
  },
  bolhaMinha: {
    backgroundColor: '#E6D9F8',
    borderBottomRightRadius: 6,
  },
  bolhaOutra: {
    backgroundColor: '#F7F4FA',
    borderBottomLeftRadius: 6,
    borderWidth: 1,
    borderColor: '#EAE5EF',
  },
  bolhaImagem: {
    paddingHorizontal: 7,
    paddingTop: 7,
    overflow: 'hidden',
  },
  imagemMensagem: {
    width: 220,
    height: 220,
    maxWidth: '100%',
    borderRadius: 12,
  },
  textoMensagem: {
    fontFamily: 'REM_Medium',
    fontSize: 15,
    lineHeight: 21,
  },
  textoMinha: {
    color: '#3E3150',
  },
  textoOutra: {
    color: '#48424F',
  },
  horarioMensagem: {
    alignSelf: 'flex-end',
    marginTop: 4,
    fontFamily: 'REM_Regular',
    fontSize: 10,
  },
  horarioMinha: {
    color: '#78678A',
  },
  horarioOutra: {
    color: '#918A98',
  },
  estadoCentral: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },
  erroTexto: {
    marginTop: 12,
    marginBottom: 14,
    fontFamily: 'REM_Medium',
    fontSize: 14,
    color: '#6C6572',
    textAlign: 'center',
  },
  botaoTentar: {
    minHeight: 44,
    paddingHorizontal: 18,
    borderRadius: 14,
    backgroundColor: '#8C77C2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoTentarTexto: {
    color: '#FFFFFF',
    fontFamily: 'REM_Bold',
    fontSize: 14,
  },
  estadoConversaVazia: {
    flex: 1,
    minHeight: 300,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 50,
  },
  iconeConversaVazia: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#EEE9F8',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  tituloConversaVazia: {
    fontFamily: 'REM_Bold',
    fontSize: 17,
    color: '#3E3946',
    marginBottom: 6,
    textAlign: 'center',
  },
  textoConversaVazia: {
    fontFamily: 'REM_Regular',
    fontSize: 13,
    lineHeight: 19,
    color: '#867F8D',
    textAlign: 'center',
  },
  areaEntrada: {
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
  previewImagemMensagem: {
    height: 76,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
    paddingTop: 8,
    position: 'relative',
  },
  previewImagemMensagemImagem: {
    width: 60,
    height: 60,
    borderRadius: 10,
    backgroundColor: '#F1EDF5',
  },
  removerPreviewMensagem: {
    position: 'absolute',
    left: 62,
    top: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
  },
  barraDigitacaoArea: {
    paddingHorizontal: 12,
    paddingTop: 8,
    backgroundColor: '#FFFFFF',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E9E5EE',
  },
  barraDigitacao: {
    minHeight: 52,
    borderRadius: 26,
    backgroundColor: '#F7F3FB',
    borderWidth: 1,
    borderColor: '#E2D9EE',
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 7,
    paddingRight: 6,
  },
  botaoAnexo: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  inputMensagem: {
    flex: 1,
    minHeight: 42,
    maxHeight: 110,
    fontFamily: 'REM_Medium',
    fontSize: 14,
    color: '#3D3746',
    paddingVertical: 10,
    paddingHorizontal: 5,
  },
  botaoEnviar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#8C77C2',
    alignItems: 'center',
    justifyContent: 'center',
  },
  botaoEnviarDesativado: {
    opacity: 0.45,
  },
  areaNavegacaoInferior: {
    height: Platform.OS === 'android' ? 48 : 0,
    width: '100%',
    backgroundColor: '#FFFFFF',
  },
});
