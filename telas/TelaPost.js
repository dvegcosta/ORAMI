import React, { useState, useEffect, useRef } from 'react';
import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  Image,
  FlatList,
  ActivityIndicator,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  PanResponder,
  StatusBar,
  Dimensions,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import * as ImagePicker from 'expo-image-picker';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

const {
  width: SCREEN_WIDTH,
  height: SCREEN_HEIGHT,
} = Dimensions.get('window');

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;

export default function TelaPost({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();

  const {
    id_post,
    id_comentario,
    focarComentario,
    id_usuario_logado,
    imagem_base64: imagemPostRota,
  } = route.params;

  const isThread = !!id_comentario;

  const idAtual = isThread
    ? id_comentario
    : id_post;

  const avatarPadrao =
    require('../assets/default-avatar.png');

  const [post, setPost] =
    useState(null);

  const [comentarios, setComentarios] =
    useState([]);

  const [carregando, setCarregando] =
    useState(true);

  const [novoComentario, setNovoComentario] =
    useState('');

  const [imagemComentario, setImagemComentario] =
    useState(null);

  const [enviando, setEnviando] =
    useState(false);

  const [menuVisivel, setMenuVisivel] =
    useState(false);

  const [modalDenunciaVisivel, setModalDenunciaVisivel] =
    useState(false);

  const [modalImagemVisivel, setModalImagemVisivel] =
    useState(false);

  const [motivoDenuncia, setMotivoDenuncia] =
    useState('');

  const [isProcessando, setIsProcessando] =
    useState(false);

  const [escalaImagemModal, setEscalaImagemModal] =
    useState(1);

  const [posicaoImagem, setPosicaoImagem] =
    useState({
      x: 0,
      y: 0,
    });

  const escalaImagemModalRef =
    useRef(1);

  const posicaoImagemRef =
    useRef({
      x: 0,
      y: 0,
    });

  const pinchDistanciaInicialRef =
    useRef(null);

  const escalaPinchInicialRef =
    useRef(1);

  const toqueAnteriorRef =
    useRef(null);

  const posicaoInicialArrastoRef =
    useRef({
      x: 0,
      y: 0,
    });

  const inputRef =
    useRef(null);

  useEffect(() => {
    carregarDados();

    if (focarComentario) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 500);
    }
  }, [idAtual]);

  const carregarDados = async () => {
    try {
      const rpcDetalhes = isThread
        ? 'obter_detalhes_comentario'
        : 'obter_detalhes_post';

      const paramsDetalhes = isThread
        ? {
            p_id_comentario: idAtual,
            p_id_usuario:
              id_usuario_logado,
          }
        : {
            p_id_postagem: idAtual,
            p_id_usuario:
              id_usuario_logado,
          };

      const {
        data: postData,
        error: errorPost,
      } = await supabase.rpc(
        rpcDetalhes,
        paramsDetalhes
      );

      if (errorPost) {
        throw errorPost;
      }

      if (postData) {
        const dadosPost =
          postData[0];

        setPost({
          ...dadosPost,
          imagem_base64:
            dadosPost?.imagem_base64 ||
            imagemPostRota ||
            null,
        });
      }

      const {
        data: comData,
        error: comError,
      } = await supabase.rpc(
        'obter_comentarios_post',
        {
          p_id_post: id_post,
          p_id_usuario:
            id_usuario_logado,
          p_id_comentario_pai:
            isThread
              ? idAtual
              : null,
        }
      );

      if (comError) {
        throw comError;
      }

      setComentarios(
        comData || []
      );
    } catch (error) {
      console.error(
        'Erro ao carregar dados:',
        error
      );
    } finally {
      setCarregando(false);
    }
  };

  const handleSalvar =
    async () => {
      try {
        const rpcSalvar =
          isThread
            ? 'alternar_salvamento_comentario'
            : 'alternar_salvamento_post';

        const paramId =
          isThread
            ? {
                p_id_comentario:
                  idAtual,
              }
            : {
                p_id_post:
                  idAtual,
              };

        const {
          data: novoStatus,
          error,
        } = await supabase.rpc(
          rpcSalvar,
          {
            ...paramId,
            p_id_usuario:
              id_usuario_logado,
          }
        );

        if (error) {
          throw error;
        }

        setPost((prev) => ({
          ...prev,
          is_salvo:
            novoStatus,
          qtd_salvamentos:
            novoStatus
              ? Number(
                  prev.qtd_salvamentos ||
                    0
                ) + 1
              : Math.max(
                  0,
                  Number(
                    prev.qtd_salvamentos ||
                      0
                  ) - 1
                ),
        }));
      } catch (error) {
        console.error(
          'Erro ao salvar:',
          error
        );

        Alert.alert(
          'Publicação não salva',
          'Não foi possível salvar esta publicação agora.'
        );
      }
    };

  const handleCurtir =
    async () => {
      try {
        const rpcCurtir =
          isThread
            ? 'alternar_curtida_comentario'
            : 'alternar_curtida_post';

        const paramId =
          isThread
            ? {
                p_id_comentario:
                  idAtual,
              }
            : {
                p_id_post:
                  idAtual,
              };

        const {
          data: novoStatus,
          error,
        } = await supabase.rpc(
          rpcCurtir,
          {
            ...paramId,
            p_id_usuario:
              id_usuario_logado,
          }
        );

        if (error) {
          throw error;
        }

        setPost((prev) => ({
          ...prev,
          is_curtido:
            novoStatus,
          qtd_curtidas:
            novoStatus
              ? Number(
                  prev.qtd_curtidas ||
                    0
                ) + 1
              : Math.max(
                  0,
                  Number(
                    prev.qtd_curtidas ||
                      0
                  ) - 1
                ),
        }));
      } catch (error) {
        console.error(
          'Erro curtir:',
          error
        );
      }
    };

  const handleCurtirComentario =
    async (
      id_com_alvo
    ) => {
      try {
        const {
          data: novoStatus,
          error,
        } = await supabase.rpc(
          'alternar_curtida_comentario',
          {
            p_id_comentario:
              id_com_alvo,
            p_id_usuario:
              id_usuario_logado,
          }
        );

        if (error) {
          throw error;
        }

        setComentarios(
          (prev) =>
            prev.map(
              (com) => {
                if (
                  com.id_comentario ===
                  id_com_alvo
                ) {
                  return {
                    ...com,
                    is_curtido:
                      novoStatus,
                    qtd_curtidas:
                      novoStatus
                        ? Number(
                            com.qtd_curtidas ||
                              0
                          ) + 1
                        : Math.max(
                            0,
                            Number(
                              com.qtd_curtidas ||
                                0
                            ) - 1
                          ),
                  };
                }

                return com;
              }
            )
        );
      } catch (error) {
        console.error(
          'Erro ao curtir comentário:',
          error
        );
      }
    };

  const handleEnviarComentario =
    async () => {
      if (
        !novoComentario.trim() &&
        !imagemComentario
      ) {
        return;
      }

      setEnviando(true);

      try {
        const {
          error,
        } = await supabase.rpc(
          'adicionar_comentario_post',
          {
            p_id_post:
              id_post,
            p_id_usuario:
              id_usuario_logado,
            p_conteudo:
              novoComentario,
            p_imagem_base64:
              imagemComentario,
            p_id_comentario_pai:
              isThread
                ? idAtual
                : null,
          }
        );

        if (error) {
          throw error;
        }

        setNovoComentario('');
        setImagemComentario(null);

        Keyboard.dismiss();

        carregarDados();
      } catch (error) {
        console.error(
          'Erro detalhado ao comentar:',
          error
        );

        Alert.alert(
          'Comentário não enviado',
          'Não foi possível enviar seu comentário agora.'
        );
      } finally {
        setEnviando(false);
      }
    };

  const selecionarImagem =
    async () => {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker
                .MediaTypeOptions
                .Images,
            allowsEditing:
              true,
            quality: 0.5,
            base64: true,
          }
        );

      if (!result.canceled) {
        setImagemComentario(
          result.assets[0]
            .base64
        );
      }
    };

  const irParaThread = (
    id_comentario_alvo
  ) => {
    navigation.push(
      'TelaPost',
      {
        id_post,
        id_comentario:
          id_comentario_alvo,
        id_usuario_logado,
      }
    );
  };

  const handleExcluirPost =
    async () => {
      setMenuVisivel(false);

      Alert.alert(
        'Excluir Post',
        'Tem certeza que deseja excluir esta postagem definitivamente?',
        [
          {
            text: 'Cancelar',
            style: 'cancel',
          },
          {
            text: 'Excluir',
            style: 'destructive',
            onPress:
              async () => {
                try {
                  const {
                    error,
                  } =
                    await supabase.rpc(
                      'excluir_postagem_definitivo',
                      {
                        p_id_postagem:
                          id_post,
                        p_id_usuario:
                          id_usuario_logado,
                      }
                    );

                  if (error) {
                    throw error;
                  }

                  navigation.goBack();
                } catch (error) {
                  console.error(
                    error
                  );

                  Alert.alert(
                    'Erro',
                    'Não foi possível excluir a postagem.'
                  );
                }
              },
          },
        ]
      );
    };

  /* ==========================================================
     ZOOM / PAN
     ========================================================== */

  const limitarZoom =
    (valor) => {
      return Math.min(
        MAX_ZOOM,
        Math.max(
          MIN_ZOOM,
          valor
        )
      );
    };

  const calcularDistanciaToques =
    (touches) => {
      if (
        !touches ||
        touches.length < 2
      ) {
        return null;
      }

      const primeiro =
        touches[0];

      const segundo =
        touches[1];

      const dx =
        segundo.pageX -
        primeiro.pageX;

      const dy =
        segundo.pageY -
        primeiro.pageY;

      return Math.sqrt(
        dx * dx +
          dy * dy
      );
    };

  const atualizarZoom =
    (novaEscala) => {
      const escala =
        limitarZoom(
          novaEscala
        );

      escalaImagemModalRef.current =
        escala;

      setEscalaImagemModal(
        escala
      );

      if (escala <= 1) {
        posicaoImagemRef.current = {
          x: 0,
          y: 0,
        };

        setPosicaoImagem({
          x: 0,
          y: 0,
        });
      }
    };

  const limitarPosicao =
    (
      x,
      y,
      escala
    ) => {
      if (
        escala <= 1
      ) {
        return {
          x: 0,
          y: 0,
        };
      }

      const limiteX =
        ((SCREEN_WIDTH *
          escala) -
          SCREEN_WIDTH) /
        2;

      const limiteY =
        ((SCREEN_HEIGHT *
          escala) -
          SCREEN_HEIGHT) /
        2;

      return {
        x: Math.max(
          -limiteX,
          Math.min(
            limiteX,
            x
          )
        ),
        y: Math.max(
          -limiteY,
          Math.min(
            limiteY,
            y
          )
        ),
      };
    };

  const atualizarPosicao =
    (x, y) => {
      const posicao =
        limitarPosicao(
          x,
          y,
          escalaImagemModalRef.current
        );

      posicaoImagemRef.current =
        posicao;

      setPosicaoImagem(
        posicao
      );
    };

  const iniciarGestureImagem =
    (event) => {
      const touches =
        event?.nativeEvent
          ?.touches || [];

      if (
        touches.length >= 2
      ) {
        const distancia =
          calcularDistanciaToques(
            touches
          );

        if (
          distancia &&
          distancia > 0
        ) {
          pinchDistanciaInicialRef.current =
            distancia;

          escalaPinchInicialRef.current =
            escalaImagemModalRef.current;
        }

        toqueAnteriorRef.current =
          null;

        return;
      }

      if (
        touches.length === 1 &&
        escalaImagemModalRef.current >
          1
      ) {
        toqueAnteriorRef.current =
          {
            x: touches[0]
              .pageX,
            y: touches[0]
              .pageY,
          };

        posicaoInicialArrastoRef.current =
          {
            ...posicaoImagemRef.current,
          };
      }
    };

  const moverGestureImagem =
    (event) => {
      const touches =
        event?.nativeEvent
          ?.touches || [];

      if (
        touches.length >= 2
      ) {
        const distanciaAtual =
          calcularDistanciaToques(
            touches
          );

        if (
          distanciaAtual &&
          distanciaAtual > 0 &&
          pinchDistanciaInicialRef.current ==
            null
        ) {
          pinchDistanciaInicialRef.current =
            distanciaAtual;

          escalaPinchInicialRef.current =
            escalaImagemModalRef.current;
        }

        const distanciaInicial =
          pinchDistanciaInicialRef.current;

        if (
          !distanciaAtual ||
          !distanciaInicial
        ) {
          return;
        }

        const fator =
          distanciaAtual /
          distanciaInicial;

        const novaEscala =
          escalaPinchInicialRef.current *
          fator;

        atualizarZoom(
          novaEscala
        );

        toqueAnteriorRef.current =
          null;

        return;
      }

      if (
        touches.length === 1 &&
        escalaImagemModalRef.current >
          1 &&
        toqueAnteriorRef.current
      ) {
        const toqueAtual =
          {
            x: touches[0]
              .pageX,
            y: touches[0]
              .pageY,
          };

        const deslocamentoX =
          toqueAtual.x -
          toqueAnteriorRef.current
            .x;

        const deslocamentoY =
          toqueAtual.y -
          toqueAnteriorRef.current
            .y;

        atualizarPosicao(
          posicaoInicialArrastoRef.current
            .x +
            deslocamentoX,
          posicaoInicialArrastoRef.current
            .y +
            deslocamentoY
        );
      }
    };

  const finalizarGestureImagem =
    () => {
      pinchDistanciaInicialRef.current =
        null;

      toqueAnteriorRef.current =
        null;

      if (
        escalaImagemModalRef.current <=
        1.02
      ) {
        atualizarZoom(1);
      }
    };

  const resetarImagemModal =
    () => {
      escalaImagemModalRef.current =
        1;

      escalaPinchInicialRef.current =
        1;

      posicaoImagemRef.current =
        {
          x: 0,
          y: 0,
        };

      setEscalaImagemModal(
        1
      );

      setPosicaoImagem({
        x: 0,
        y: 0,
      });

      pinchDistanciaInicialRef.current =
        null;

      toqueAnteriorRef.current =
        null;
    };

  const abrirModalImagemPost =
    () => {
      resetarImagemModal();

      setModalImagemVisivel(
        true
      );
    };

  const fecharModalImagem =
    () => {
      setModalImagemVisivel(
        false
      );

      resetarImagemModal();
    };

  const abrirComentariosPeloModal =
    () => {
      fecharModalImagem();

      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    };

  const compartilharPost =
    async () => {};

  const pinchResponder =
    useRef(
      PanResponder.create({
        onStartShouldSetPanResponderCapture:
          () => true,

        onMoveShouldSetPanResponderCapture:
          () => true,

        onPanResponderGrant:
          iniciarGestureImagem,

        onPanResponderMove:
          moverGestureImagem,

        onPanResponderRelease:
          finalizarGestureImagem,

        onPanResponderTerminate:
          finalizarGestureImagem,

        onPanResponderTerminationRequest:
          () => false,
      })
    ).current;

  const handleEnviarDenuncia =
    async () => {
      if (
        !motivoDenuncia.trim()
      ) {
        Alert.alert(
          'Atenção',
          'Por favor, descreva o motivo da denúncia.'
        );

        return;
      }

      setIsProcessando(
        true
      );

      try {
        const {
          error,
        } = await supabase.rpc(
          'denunciar_postagem_com_motivo',
          {
            p_id_denunciante:
              id_usuario_logado,
            p_id_postagem:
              id_post,
            p_id_autor:
              post.id_autor,
            p_descricao:
              motivoDenuncia,
            p_texto_motivo:
              'Violação das regras',
          }
        );

        if (error) {
          throw error;
        }

        Alert.alert(
          'Denúncia enviada',
          'Sua denúncia foi registrada e será analisada.'
        );

        setModalDenunciaVisivel(
          false
        );

        setMotivoDenuncia(
          ''
        );
      } catch (error) {
        console.error(
          error
        );

        Alert.alert(
          'Erro',
          'Ocorreu um erro ao enviar a denúncia.'
        );
      } finally {
        setIsProcessando(
          false
        );
      }
    };

  const renderComentario =
    ({
      item,
      index,
    }) => (
      <View
        style={
          estilos.containerComentario
        }
      >
        <View
          style={[
            estilos.linhaConexao,
            {
              bottom:
                index ===
                comentarios.length -
                  1
                  ? '50%'
                  : 0,
            },
          ]}
        />

        <View
          style={
            estilos.cardComentario
          }
        >
          <TouchableOpacity
            onPress={() => {
              navigation.navigate(
                'TelaPerfil',
                {
                  id_perfil:
                    item.id_autor,
                  id_usuario:
                    id_usuario_logado,
                }
              );
            }}
          >
            <Image
              source={
                item.autor_foto
                  ? {
                      uri: `data:image/jpeg;base64,${item.autor_foto}`,
                    }
                  : avatarPadrao
              }
              style={
                estilos.avatarComentario
              }
            />
          </TouchableOpacity>

          <View
            style={
              estilos.conteudoComentario
            }
          >
            <View
              style={
                estilos.headerComentarioInterno
              }
            >
              <TouchableOpacity
                onPress={() => {
                  navigation.navigate(
                    'TelaPerfil',
                    {
                      id_perfil:
                        item.id_autor,
                      id_usuario:
                        id_usuario_logado,
                    }
                  );
                }}
              >
                <Text
                  style={
                    estilos.nomeAutorCom
                  }
                >
                  {item.autor_nome}
                </Text>
              </TouchableOpacity>

              <Text
                style={
                  estilos.usernameCom
                }
              >
                @
                {
                  item.autor_username
                }
              </Text>
            </View>

            <TouchableOpacity
              activeOpacity={0.8}
              onPress={() =>
                irParaThread(
                  item.id_comentario
                )
              }
            >
              <Text
                style={
                  estilos.textoComentario
                }
              >
                {item.conteudo}
              </Text>
            </TouchableOpacity>

            {item.imagem_base64 && (
              <Image
                source={{
                  uri: `data:image/jpeg;base64,${item.imagem_base64}`,
                }}
                style={
                  estilos.imagemComentarioPost
                }
              />
            )}

            <View
              style={
                estilos.acoesComentario
              }
            >
              <TouchableOpacity
                style={
                  estilos.btnAcaoPequeno
                }
                onPress={() =>
                  handleCurtirComentario(
                    item.id_comentario
                  )
                }
              >
                <Ionicons
                  name={
                    item.is_curtido
                      ? 'heart'
                      : 'heart-outline'
                  }
                  size={16}
                  color={
                    item.is_curtido
                      ? '#E74C3C'
                      : cores.icone
                  }
                />

                <Text
                  style={[
                    estilos.txtAcaoPequeno,
                    item.is_curtido && {
                      color:
                        '#E74C3C',
                    },
                  ]}
                >
                  {
                    item.qtd_curtidas ||
                    0
                  }
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={
                  estilos.btnAcaoPequeno
                }
                onPress={() =>
                  irParaThread(
                    item.id_comentario
                  )
                }
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={14}
                  color={
                    cores.icone
                  }
                />

                <Text
                  style={
                    estilos.txtAcaoPequeno
                  }
                >
                  {
                    item.qtd_respostas ||
                    0
                  }
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );

  if (
    carregando ||
    !post
  ) {
    return (
      <View
        style={
          estilos.centro
        }
      >
        <ActivityIndicator
          size="large"
          color="#8C77C2"
        />
      </View>
    );
  }

  const idDoAutorPost =
    post.id_autor ||
    post.id_usuario ||
    post.autor_id;

  const postEhMeu =
    Boolean(
      idDoAutorPost &&
        id_usuario_logado &&
        String(
          idDoAutorPost
        ).trim() ===
          String(
            id_usuario_logado
          ).trim()
    );

  return (
    <SafeAreaView
      style={
        estilos.container
      }
    >
      <View
        style={
          estilos.headerNav
        }
      >
        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color="#8C77C2"
          />
        </TouchableOpacity>

        <Text
          style={
            estilos.tituloNav
          }
        >
          Post
        </Text>

        <View
          style={{
            width: 24,
          }}
        />
      </View>

      <FlatList
        style={{
          flex: 1,
        }}
        data={comentarios}
        keyExtractor={(item) =>
          item.id_comentario.toString()
        }
        renderItem={
          renderComentario
        }
        ListHeaderComponent={
          <View
            style={
              estilos.containerPostPrincipal
            }
          >
            <View
              style={[
                estilos.headerAutor,
                {
                  justifyContent:
                    'space-between',
                  zIndex: 10,
                },
              ]}
            >
              <View
                style={{
                  flexDirection:
                    'row',
                  alignItems:
                    'center',
                  flex: 1,
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    navigation.navigate(
                      'TelaPerfil',
                      {
                        id_perfil:
                          idDoAutorPost,
                        id_usuario:
                          id_usuario_logado,
                      }
                    )
                  }
                >
                  <Image
                    source={
                      post.autor_foto
                        ? {
                            uri: `data:image/jpeg;base64,${post.autor_foto}`,
                          }
                        : avatarPadrao
                    }
                    style={
                      estilos.avatarPost
                    }
                  />
                </TouchableOpacity>

                <View
                  style={{
                    flex: 1,
                  }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      navigation.navigate(
                        'TelaPerfil',
                        {
                          id_perfil:
                            idDoAutorPost,
                          id_usuario:
                            id_usuario_logado,
                        }
                      )
                    }
                  >
                    <Text
                      style={
                        estilos.nomeAutor
                      }
                    >
                      {
                        post.autor_nome
                      }
                    </Text>

                    <Text
                      style={
                        estilos.usernameAutor
                      }
                    >
                      @
                      {
                        post.autor_username
                      }
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={{
                  position:
                    'relative',
                  zIndex: 999,
                }}
              >
                {menuVisivel && (
                  <TouchableOpacity
                    style={
                      estilos.overlayFechaMenu
                    }
                    activeOpacity={1}
                    onPress={() =>
                      setMenuVisivel(
                        false
                      )
                    }
                  />
                )}

                <TouchableOpacity
                  onPress={() =>
                    setMenuVisivel(
                      !menuVisivel
                    )
                  }
                  hitSlop={{
                    top: 10,
                    bottom: 10,
                    left: 10,
                    right: 10,
                  }}
                  style={{
                    padding: 5,
                  }}
                >
                  <Ionicons
                    name="ellipsis-vertical"
                    size={20}
                    color={
                      cores.icone
                    }
                  />
                </TouchableOpacity>

                {menuVisivel && (
                  <View
                    style={{
                      position:
                        'absolute',
                      right: 25,
                      top: 0,
                      backgroundColor:
                        cores.superficie ||
                        '#FFFFFF',
                      borderRadius: 12,
                      padding: 5,
                      elevation: 10,
                      shadowColor:
                        '#000',
                      shadowOffset:
                        {
                          width: 0,
                          height: 2,
                        },
                      shadowOpacity:
                        0.15,
                      shadowRadius:
                        8,
                      minWidth: 160,
                      zIndex: 1000,
                    }}
                  >
                    {postEhMeu ? (
                      <TouchableOpacity
                        style={{
                          flexDirection:
                            'row',
                          alignItems:
                            'center',
                          padding: 12,
                        }}
                        onPress={
                          handleExcluirPost
                        }
                      >
                        <Ionicons
                          name="trash-outline"
                          size={20}
                          color="#E74C3C"
                        />

                        <Text
                          style={{
                            marginLeft: 8,
                            color:
                              '#E74C3C',
                            fontWeight:
                              'bold',
                            fontFamily:
                              'REM',
                          }}
                        >
                          Excluir Post
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        style={{
                          flexDirection:
                            'row',
                          alignItems:
                            'center',
                          padding: 12,
                        }}
                        onPress={() => {
                          setMenuVisivel(
                            false
                          );

                          setModalDenunciaVisivel(
                            true
                          );
                        }}
                      >
                        <Ionicons
                          name="alert-circle-outline"
                          size={20}
                          color="#F39C12"
                        />

                        <Text
                          style={{
                            marginLeft: 8,
                            color:
                              '#F39C12',
                            fontWeight:
                              'bold',
                            fontFamily:
                              'REM',
                          }}
                        >
                          Denunciar Post
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>

            <Text
              style={
                estilos.conteudoPost
              }
            >
              {
                post.conteudo_post
              }
            </Text>

            {post.imagem_base64 && (
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={
                  abrirModalImagemPost
                }
              >
                <Image
                  source={{
                    uri: `data:image/jpeg;base64,${post.imagem_base64}`,
                  }}
                  style={
                    estilos.imagemPost
                  }
                />
              </TouchableOpacity>
            )}

            <View
              style={
                estilos.statsRow
              }
            >
              <Text
                style={
                  estilos.txtStat
                }
              >
                {
                  post.qtd_curtidas ||
                  0
                }{' '}
                curtidas
              </Text>

              <Text
                style={
                  estilos.txtStat
                }
              >
                {
                  post.qtd_comentarios ||
                  0
                }{' '}
                comentários
              </Text>

              <Text
                style={
                  estilos.txtStat
                }
              >
                {
                  post.qtd_salvamentos ||
                  0
                }{' '}
                salvos
              </Text>
            </View>

            <View
              style={
                estilos.acoesRow
              }
            >
              <TouchableOpacity
                onPress={
                  handleCurtir
                }
              >
                <Ionicons
                  name={
                    post.is_curtido
                      ? 'heart'
                      : 'heart-outline'
                  }
                  size={26}
                  color={
                    post.is_curtido
                      ? '#E74C3C'
                      : cores.icone
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() =>
                  inputRef.current?.focus()
                }
              >
                <Ionicons
                  name="chatbubble-outline"
                  size={24}
                  color={
                    cores.icone
                  }
                />
              </TouchableOpacity>

              <View
                style={{
                  flex: 1,
                }}
              />

              <TouchableOpacity
                onPress={
                  handleSalvar
                }
              >
                <Ionicons
                  name={
                    post.is_salvo
                      ? 'bookmark'
                      : 'bookmark-outline'
                  }
                  size={24}
                  color={
                    post.is_salvo
                      ? '#F1C40F'
                      : cores.icone
                  }
                />
              </TouchableOpacity>

              <TouchableOpacity
                onPress={
                  compartilharPost
                }
              >
                <Ionicons
                  name="arrow-redo-outline"
                  size={26}
                  color={
                    cores.icone
                  }
                />
              </TouchableOpacity>
            </View>

            <View
              style={
                estilos.divisorPost
              }
            />
          </View>
        }
      />

      <Modal
        visible={
          modalDenunciaVisivel
        }
        transparent
        animationType="slide"
      >
        <View
          style={{
            flex: 1,
            backgroundColor:
              'rgba(0,0,0,0.5)',
            justifyContent:
              'center',
            alignItems:
              'center',
          }}
        >
          <View
            style={{
              backgroundColor:
                cores.superficie ||
                '#FFFFFF',
              borderRadius: 20,
              padding: 25,
              width: '85%',
            }}
          >
            <Text
              style={{
                fontSize: 18,
                fontWeight:
                  'bold',
                color:
                  cores.texto ||
                  '#333',
                marginBottom:
                  15,
                fontFamily:
                  'REM',
              }}
            >
              Denunciar Postagem
            </Text>

            <Text
              style={{
                fontSize: 14,
                color:
                  cores.textoSecundario ||
                  '#666',
                marginBottom:
                  15,
                fontFamily:
                  'REM',
              }}
            >
              Descreva por que esta
              postagem viola as
              regras da comunidade:
            </Text>

            <TextInput
              style={{
                backgroundColor:
                  cores.fundoAlternativo ||
                  '#F8F7FF',
                borderRadius: 10,
                padding: 15,
                textAlignVertical:
                  'top',
                minHeight: 100,
                color:
                  cores.texto ||
                  '#333',
                fontFamily:
                  'REM',
                marginBottom:
                  20,
              }}
              multiline
              placeholder="Digite o motivo da denúncia..."
              placeholderTextColor="#999"
              value={motivoDenuncia}
              onChangeText={
                setMotivoDenuncia
              }
            />

            <View
              style={{
                flexDirection:
                  'row',
                justifyContent:
                  'flex-end',
              }}
            >
              <TouchableOpacity
                style={{
                  padding: 12,
                  marginRight:
                    10,
                }}
                onPress={() =>
                  setModalDenunciaVisivel(
                    false
                  )
                }
                disabled={
                  isProcessando
                }
              >
                <Text
                  style={{
                    color:
                      '#888',
                    fontWeight:
                      'bold',
                    fontFamily:
                      'REM',
                  }}
                >
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  backgroundColor:
                    '#8C77C2',
                  paddingVertical:
                    12,
                  paddingHorizontal:
                    20,
                  borderRadius: 10,
                  flexDirection:
                    'row',
                  alignItems:
                    'center',
                }}
                onPress={
                  handleEnviarDenuncia
                }
                disabled={
                  isProcessando
                }
              >
                {isProcessando ? (
                  <ActivityIndicator
                    size="small"
                    color="#FFF"
                  />
                ) : (
                  <Text
                    style={{
                      color:
                        '#FFF',
                      fontWeight:
                        'bold',
                      fontFamily:
                        'REM',
                    }}
                  >
                    Enviar
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          modalImagemVisivel
        }
        animationType="fade"
        transparent={false}
        statusBarTranslucent
        presentationStyle="fullScreen"
        onRequestClose={
          fecharModalImagem
        }
      >
        <View
          style={
            estilos.modalImagemTela
          }
        >
          <StatusBar
            hidden={true}
          />

          <View
            style={
              estilos.fundoImagemModal
            }
          />

          <View
            style={
              estilos.topoModalImagem
            }
          >
            <TouchableOpacity
              activeOpacity={0.8}
              style={
                estilos.botaoFecharModal
              }
              onPress={
                fecharModalImagem
              }
              hitSlop={{
                top: 8,
                bottom: 8,
                left: 8,
                right: 8,
              }}
            >
              <Ionicons
                name="close"
                size={27}
                color="#FFFFFF"
              />
            </TouchableOpacity>

            <View
              style={
                estilos.indicadorModal
              }
            >
              <View
                style={
                  estilos.pontoIndicador
                }
              />

              <Text
                style={
                  estilos.textoIndicador
                }
              >
                Imagem da publicação
              </Text>
            </View>

            <View
              style={
                estilos.espacadorTopo
              }
            />
          </View>

          <View
            style={
              estilos.areaImagemTela
            }
            {...pinchResponder.panHandlers}
          >
            {post?.imagem_base64 && (
              <Image
                source={{
                  uri: `data:image/jpeg;base64,${post.imagem_base64}`,
                }}
                resizeMode="contain"
                style={[
                  estilos.imagemModalGrande,
                  {
                    transform: [
                      {
                        translateX:
                          posicaoImagem.x,
                      },
                      {
                        translateY:
                          posicaoImagem.y,
                      },
                      {
                        scale:
                          escalaImagemModal,
                      },
                    ],
                  },
                ]}
              />
            )}

            {escalaImagemModal ===
              1 && (
              <View
                pointerEvents="none"
                style={
                  estilos.avisoZoom
                }
              >
                <View
                  style={
                    estilos.iconeZoom
                  }
                >
                  <Ionicons
                    name="expand-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                </View>

                <Text
                  style={
                    estilos.textoZoom
                  }
                >
                  Use dois dedos para ampliar
                </Text>
              </View>
            )}
          </View>

          <View
            style={
              estilos.containerAcoesModal
            }
          >
            <View
              style={
                estilos.barraAcoesModal
              }
            >
              <TouchableOpacity
                activeOpacity={0.72}
                style={
                  estilos.acaoModal
                }
                onPress={
                  handleCurtir
                }
              >
                <View
                  style={[
                    estilos.iconeAcaoModal,
                    post.is_curtido &&
                      estilos.iconeAcaoAtivaCurtir,
                  ]}
                >
                  <Ionicons
                    name={
                      post.is_curtido
                        ? 'heart'
                        : 'heart-outline'
                    }
                    size={23}
                    color={
                      post.is_curtido
                        ? '#E74C3C'
                        : '#8C77C2'
                    }
                  />
                </View>

                <Text
                  style={[
                    estilos.contagemAcaoModal,
                    post.is_curtido && {
                      color:
                        '#E74C3C',
                    },
                  ]}
                >
                  {Number(
                    post.qtd_curtidas ||
                      0
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.72}
                style={
                  estilos.acaoModal
                }
                onPress={
                  abrirComentariosPeloModal
                }
              >
                <View
                  style={
                    estilos.iconeAcaoModal
                  }
                >
                  <Ionicons
                    name="chatbubble-outline"
                    size={22}
                    color="#8C77C2"
                  />
                </View>

                <Text
                  style={
                    estilos.contagemAcaoModal
                  }
                >
                  {Number(
                    post.qtd_comentarios ||
                      0
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.72}
                style={
                  estilos.acaoModal
                }
                onPress={
                  handleSalvar
                }
              >
                <View
                  style={[
                    estilos.iconeAcaoModal,
                    post.is_salvo &&
                      estilos.iconeAcaoAtivaSalvar,
                  ]}
                >
                  <Ionicons
                    name={
                      post.is_salvo
                        ? 'bookmark'
                        : 'bookmark-outline'
                    }
                    size={22}
                    color={
                      post.is_salvo
                        ? '#D9A900'
                        : '#8C77C2'
                    }
                  />
                </View>

                <Text
                  style={[
                    estilos.contagemAcaoModal,
                    post.is_salvo && {
                      color:
                        '#C79A00',
                    },
                  ]}
                >
                  {Number(
                    post.qtd_salvamentos ||
                      0
                  )}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                activeOpacity={0.72}
                style={
                  estilos.acaoModal
                }
                onPress={
                  compartilharPost
                }
              >
                <View
                  style={
                    estilos.iconeAcaoModal
                  }
                >
                  <Ionicons
                    name="arrow-redo-outline"
                    size={23}
                    color="#8C77C2"
                  />
                </View>

                <Text
                  style={
                    estilos.contagemAcaoModal
                  }
                >
                  {Number(
                    post.qtd_compartilhamentos ||
                      0
                  )}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <KeyboardAvoidingView
        style={
          estilos.keyboardContainer
        }
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : 'height'
        }
        keyboardVerticalOffset={0}
      >
        <View
          style={
            estilos.containerInput
          }
        >
          <TextInput
            ref={inputRef}
            style={
              estilos.input
            }
            placeholder="Publicar sua resposta"
            value={
              novoComentario
            }
            onChangeText={
              setNovoComentario
            }
            multiline
          />

          <TouchableOpacity
            onPress={
              selecionarImagem
            }
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            <Ionicons
              name="camera-outline"
              size={26}
              color={
                cores.icone
              }
            />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={
              handleEnviarComentario
            }
            disabled={
              enviando
            }
            hitSlop={{
              top: 8,
              bottom: 8,
              left: 8,
              right: 8,
            }}
          >
            {enviando ? (
              <ActivityIndicator
                size="small"
                color="#8C77C2"
              />
            ) : (
              <Ionicons
                name="send"
                size={24}
                color="#8C77C2"
              />
            )}
          </TouchableOpacity>
        </View>

        {/* =====================================================
            ESPAÇO RESERVADO PERMANENTEMENTE PARA A PRÉVIA
            DA IMAGEM.

            O espaço NÃO desaparece quando a imagem é removida.
            Apenas o conteúdo interno é alterado.
            ===================================================== */}
        <View
          style={
            estilos.previewImagemSlot
          }
        >
          {imagemComentario && (
            <View
              style={
                estilos.previewImagemContainer
              }
            >
              <Image
                source={{
                  uri: `data:image/jpeg;base64,${imagemComentario}`,
                }}
                style={
                  estilos.previewImagem
                }
              />

              <TouchableOpacity
                style={
                  estilos.btnRemoveImg
                }
                onPress={() =>
                  setImagemComentario(
                    null
                  )
                }
              >
                <Ionicons
                  name="close-circle"
                  size={20}
                  color="red"
                />
              </TouchableOpacity>
            </View>
          )}
        </View>

        {Platform.OS === 'android' && (
          <View
            style={
              estilos.areaInferiorNavegacao
            }
          />
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor:
      '#FFF',
    paddingTop: 50,
    paddingBottom: 0,
  },

  centro: {
    flex: 1,
    justifyContent:
      'center',
    alignItems:
      'center',
  },

  headerNav: {
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    paddingHorizontal: 15,
    height: 60,
    borderBottomWidth: 1,
    borderBottomColor:
      '#F0F0F0',
  },

  tituloNav: {
    fontSize: 20,
    fontFamily:
      'REM_Bold',
    color:
      '#8C77C2',
  },

  containerPostPrincipal: {
    padding: 15,
  },

  headerAutor: {
    flexDirection:
      'row',
    alignItems:
      'center',
    marginBottom: 12,
  },

  avatarPost: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
  },

  nomeAutor: {
    fontFamily:
      'REM_Bold',
    fontSize: 16,
    color:
      '#000',
  },

  usernameAutor: {
    fontFamily:
      'REM_Regular',
    color:
      '#666',
    fontSize: 14,
  },

  conteudoPost: {
    fontFamily:
      'REM_Regular',
    fontSize: 16,
    lineHeight: 22,
    color:
      '#1A1A1A',
    marginBottom: 15,
  },

  imagemPost: {
    width: '100%',
    height: 250,
    borderRadius: 15,
    marginBottom: 15,
  },

  statsRow: {
    flexDirection:
      'row',
    gap: 15,
    marginBottom: 10,
  },

  txtStat: {
    fontFamily:
      'REM_Regular',
    fontSize: 13,
    color:
      '#666',
  },

  acoesRow: {
    flexDirection:
      'row',
    alignItems:
      'center',
    gap: 25,
    paddingVertical: 10,
  },

  divisorPost: {
    height: 1,
    backgroundColor:
      '#EEE',
    marginTop: 10,
  },

  containerComentario: {
    paddingHorizontal:
      15,
    position:
      'relative',
  },

  linhaConexao: {
    position:
      'absolute',
    left: 32,
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor:
      '#F0F0F0',
    zIndex: -1,
  },

  cardComentario: {
    flexDirection:
      'row',
    paddingVertical:
      15,
  },

  avatarComentario: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: 12,
    backgroundColor:
      '#EEE',
  },

  conteudoComentario: {
    flex: 1,
  },

  headerComentarioInterno: {
    flexDirection:
      'row',
    alignItems:
      'center',
    marginBottom: 2,
  },

  nomeAutorCom: {
    fontFamily:
      'REM_Bold',
    fontSize: 14,
    color:
      '#333',
  },

  usernameCom: {
    fontFamily:
      'REM_Regular',
    color:
      '#888',
    fontSize: 12,
    marginLeft: 4,
  },

  textoComentario: {
    fontFamily:
      'REM_Regular',
    fontSize: 14,
    color:
      '#444',
    lineHeight: 18,
  },

  imagemComentarioPost: {
    width: '100%',
    height: 180,
    borderRadius: 10,
    marginTop: 10,
  },

  acoesComentario: {
    flexDirection:
      'row',
    marginTop: 8,
    gap: 20,
  },

  btnAcaoPequeno: {
    flexDirection:
      'row',
    alignItems:
      'center',
  },

  keyboardContainer: {
    flexShrink: 0,
    backgroundColor:
      '#FFF',
  },

  containerInput: {
    flexDirection:
      'row',
    alignItems:
      'center',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor:
      '#EEE',
    backgroundColor:
      '#FFF',
    gap: 15,
  },

  input: {
    flex: 1,
    backgroundColor:
      '#F5F5F5',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: 8,
    maxHeight: 100,
  },

  /*
   * ESTE É O ESPAÇO FIXO.
   *
   * Ele sempre existe, independentemente
   * de imagemComentario ter valor ou não.
   */
  previewImagemSlot: {
    height: 80,
    width: '100%',
    backgroundColor:
      '#FFF',
    justifyContent:
      'center',
    alignItems:
      'center',
    overflow:
      'hidden',
  },

  previewImagemContainer: {
    width: '100%',
    height: 80,
    padding: 10,
    backgroundColor:
      '#F9F9F9',
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  previewImagem: {
    width: 60,
    height: 60,
    borderRadius: 8,
  },

  btnRemoveImg: {
    position:
      'absolute',
    top: 5,
    right: '45%',
  },

  areaInferiorNavegacao: {
    height: 28,
    backgroundColor:
      '#FFF',
    width: '100%',
  },

  txtAcaoPequeno: {
    fontSize: 12,
    marginLeft: 4,
    fontFamily:
      'REM_Medium',
    color:
      '#666',
  },

  overlayFechaMenu: {
    position:
      'absolute',
    top: -5000,
    bottom: -5000,
    left: -5000,
    right: -5000,
    zIndex: 998,
    backgroundColor:
      'transparent',
  },

  modalImagemTela: {
    flex: 1,
    backgroundColor:
      '#08070B',
    position:
      'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },

  fundoImagemModal: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor:
      '#08070B',
  },

  topoModalImagem: {
    position:
      'absolute',
    top:
      Platform.OS ===
      'ios'
        ? 48
        : 32,
    left: 0,
    right: 0,
    height: 56,
    zIndex: 20,
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-between',
    paddingHorizontal: 16,
  },

  botaoFecharModal: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      'rgba(255,255,255,0.09)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.10)',
  },

  indicadorModal: {
    height: 38,
    paddingHorizontal: 15,
    borderRadius: 20,
    backgroundColor:
      'rgba(255,255,255,0.08)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.10)',
    flexDirection:
      'row',
    alignItems:
      'center',
  },

  pontoIndicador: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor:
      '#8C77C2',
    marginRight: 8,
  },

  textoIndicador: {
    color:
      '#FFFFFF',
    fontFamily:
      'REM_Medium',
    fontSize: 12,
  },

  espacadorTopo: {
    width: 44,
    height: 44,
  },

  areaImagemTela: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
    justifyContent:
      'center',
    alignItems:
      'center',
    overflow:
      'hidden',
  },

  imagemModalGrande: {
    width:
      SCREEN_WIDTH,
    height:
      SCREEN_HEIGHT,
  },

  avisoZoom: {
    position:
      'absolute',
    bottom:
      Platform.OS ===
      'ios'
        ? 138
        : 128,
    alignSelf:
      'center',
    flexDirection:
      'row',
    alignItems:
      'center',
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 20,
    backgroundColor:
      'rgba(10,8,14,0.72)',
    borderWidth: 1,
    borderColor:
      'rgba(255,255,255,0.10)',
  },

  iconeZoom: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems:
      'center',
    justifyContent:
      'center',
    backgroundColor:
      '#8C77C2',
    marginRight: 8,
  },

  textoZoom: {
    color:
      'rgba(255,255,255,0.92)',
    fontFamily:
      'REM_Medium',
    fontSize: 11,
  },

  containerAcoesModal: {
    position:
      'absolute',
    left: 0,
    right: 0,
    bottom: 38,
    zIndex: 25,
    alignItems:
      'center',
    justifyContent:
      'center',
    alignContent:
      'center',
    alignSelf:
      'center',
  },

  barraAcoesModal: {
    width:
      '95%',
    minHeight: 76,
    paddingHorizontal: 18,
    paddingTop: 9,
    paddingBottom: 10,
    backgroundColor:
      '#FFFFFF',
    borderTopWidth: 1,
    borderTopColor:
      'rgba(140,119,194,0.14)',
    borderRadius: 0,
    flexDirection:
      'row',
    alignItems:
      'center',
    justifyContent:
      'space-around',
    shadowColor:
      '#000',
    shadowOffset: {
      width: 0,
      height: -5,
    },
    shadowOpacity:
      0.12,
    shadowRadius:
      14,
    elevation: 12,
  },

  acaoModal: {
    flex: 1,
    minHeight: 54,
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  iconeAcaoModal: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems:
      'center',
    justifyContent:
      'center',
  },

  iconeAcaoAtivaCurtir: {
    backgroundColor:
      'rgba(231,76,60,0.08)',
  },

  iconeAcaoAtivaSalvar: {
    backgroundColor:
      'rgba(217,169,0,0.10)',
  },

  contagemAcaoModal: {
    marginTop: -1,
    color:
      '#4A4258',
    fontFamily:
      'REM_Medium',
    fontSize: 11,
  },
});