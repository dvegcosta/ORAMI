import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Platform,
  ActivityIndicator,
  Image,
  ImageBackground,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
  Keyboard,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import { normalizarImagem, uploadImagemBase64, BUCKETS, removerImagemStorage } from '../lib/storage';
import { Alert } from '../lib/popup';

export default function TelaMinhasComunidades({
  route,
  navigation,
}) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();

  const { id_usuario } = route.params || {};

  const [comunidades, setComunidades] =
    useState([]);

  const [carregando, setCarregando] =
    useState(true);

  const [pesquisa, setPesquisa] =
    useState('');

  const [mostrarPesquisa, setMostrarPesquisa] =
    useState(false);

  const [modalVisivel, setModalVisivel] =
    useState(false);

  const [novaComNome, setNovaComNome] =
    useState('');

  const [novaComDescr, setNovaComDescr] =
    useState('');

  const [novaComCapa, setNovaComCapa] =
    useState(null);

  const [novaComPerfil, setNovaComPerfil] =
    useState(null);

  const [salvando, setSalvando] =
    useState(false);

  const [novasRegras, setNovasRegras] =
    useState([]);

  useEffect(() => {
    carregarComunidades();
  }, []);

  const carregarComunidades = async () => {
    setCarregando(true);

    try {
      const {
        data,
        error,
      } = await supabase.rpc(
        'sp_get_comunidades_criadas',
        {
          p_id_usuario: id_usuario,
        }
      );

      if (error) {
        throw error;
      }

      console.log(
        'Comunidades carregadas:',
        data
      );

      setComunidades(
        data || []
      );
    } catch (error) {
      console.error(
        'Erro ao carregar comunidades:',
        error
      );

      Alert.alert(
        'Comunidades indisponíveis',
        'Não foi possível carregar suas comunidades agora.'
      );
    } finally {
      setCarregando(false);
    }
  };

  const selecionarImagem =
    async (tipo) => {
      const permissao =
        await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (
        permissao.status !==
        'granted'
      ) {
        Alert.alert(
          'Galeria sem permissão',
          'Precisamos de acesso à galeria para selecionar a imagem.'
        );

        return;
      }

      const resultado =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions.Images,
            allowsEditing:
              true,
            aspect:
              tipo === 'capa'
                ? [16, 9]
                : [1, 1],
            quality: 0.5,
            base64: true,
          }
        );

      if (
        !resultado.canceled &&
        resultado.assets?.[0]?.base64
      ) {
        if (tipo === 'capa') {
          setNovaComCapa(
            resultado.assets[0]
              .base64
          );
        } else {
          setNovaComPerfil(
            resultado.assets[0]
              .base64
          );
        }
      }
    };

  const adicionarNovaRegra =
    () => {
      setNovasRegras(
        (prev) => [
          ...prev,
          {
            id_temporario:
              `${Date.now()}-${Math.random()}`,
            titulo: '',
            descricao: '',
          },
        ]
      );
    };

  const atualizarNovaRegra =
    (
      id_temporario,
      campo,
      valor
    ) => {
      setNovasRegras(
        (prev) =>
          prev.map(
            (regra) =>
              regra.id_temporario ===
              id_temporario
                ? {
                    ...regra,
                    [campo]:
                      valor,
                  }
                : regra
          )
      );
    };

  const removerNovaRegra =
    (id_temporario) => {
      setNovasRegras(
        (prev) =>
          prev.filter(
            (regra) =>
              regra.id_temporario !==
              id_temporario
          )
      );
    };

  const extrairIdComunidade =
    (data) => {
      if (
        data === null ||
        data === undefined
      ) {
        return null;
      }

      if (
        typeof data ===
        'number'
      ) {
        return data;
      }

      if (
        typeof data ===
        'string'
      ) {
        return data;
      }

      if (
        Array.isArray(data)
      ) {
        if (!data.length) {
          return null;
        }

        return extrairIdComunidade(
          data[0]
        );
      }

      if (
        typeof data ===
        'object'
      ) {
        return (
          data.id_comunidade ??
          data.id ??
          data.idComunidade ??
          null
        );
      }

      return null;
    };

  const criarComunidade =
    async () => {
      if (!novaComNome.trim() || !novaComDescr.trim()) {
        Alert.alert('Comunidade incompleta', 'Nome e descrição são obrigatórios para criar a comunidade.');
        return;
      }

      const regrasPreenchidas = novasRegras.filter(
        (regra) => regra.titulo.trim() || regra.descricao.trim()
      );

      const regraInvalida = regrasPreenchidas.find(
        (regra) => !regra.titulo.trim() || !regra.descricao.trim()
      );

      if (regraInvalida) {
        Alert.alert('Regra incompleta', 'Preencha o título e a descrição de cada regra ou remova o campo vazio.');
        return;
      }

      setSalvando(true);
      const uploadsCriados = [];
      let midiasPersistidas = false;

      try {
        const { data, error } = await supabase.rpc('sp_criar_comunidade', {
          p_id_criador: id_usuario,
          p_nome: novaComNome.trim(),
          p_descr: novaComDescr.trim(),
          // Não enviamos binário para o banco.
          p_foto: null,
          p_header: null,
        });

        if (error) throw error;

        const idNovaComunidade = extrairIdComunidade(data);
        if (!idNovaComunidade) {
          throw new Error('A criação da comunidade não retornou o id necessário para salvar suas mídias.');
        }

        let referenciaIcone = null;
        let referenciaCapa = null;

        if (novaComPerfil) {
          const upload = await uploadImagemBase64({
            bucket: BUCKETS.COMUNIDADES,
            pasta: `${idNovaComunidade}/icones`,
            base64: novaComPerfil,
            mimeType: 'image/jpeg',
            nomeBase: 'icone',
          });
          referenciaIcone = upload.publicUrl;
          uploadsCriados.push(upload.publicUrl);
        }

        if (novaComCapa) {
          const upload = await uploadImagemBase64({
            bucket: BUCKETS.COMUNIDADES,
            pasta: `${idNovaComunidade}/capas`,
            base64: novaComCapa,
            mimeType: 'image/jpeg',
            nomeBase: 'capa',
          });
          referenciaCapa = upload.publicUrl;
          uploadsCriados.push(upload.publicUrl);
        }

        if (referenciaIcone || referenciaCapa) {
          const { error: erroMidias } = await supabase.rpc('atualizar_comunidade', {
            p_id_comunidade: idNovaComunidade,
            p_nome: novaComNome.trim(),
            p_descr: novaComDescr.trim(),
            p_foto_base64: referenciaIcone,
            p_header_base64: referenciaCapa,
          });
          if (erroMidias) throw erroMidias;
          midiasPersistidas = true;
        }

        for (const regra of regrasPreenchidas) {
          const { error: erroRegra } = await supabase
            .from('regras')
            .insert({
              id_comunidade: idNovaComunidade,
              titulo: regra.titulo.trim(),
              descricao: regra.descricao.trim(),
            });
          if (erroRegra) throw erroRegra;
        }

        Alert.alert(
          'Comunidade criada',
          regrasPreenchidas.length > 0
            ? 'Sua nova comunidade e suas regras já estão prontas.'
            : 'Sua nova comunidade já está pronta.'
        );

        fecharModal();
        carregarComunidades();
      } catch (error) {
        console.error('Erro ao criar comunidade:', error);
        if (!midiasPersistidas) {
          for (const referencia of uploadsCriados) {
            await removerImagemStorage(referencia, BUCKETS.COMUNIDADES);
          }
        }
        Alert.alert(
          'Comunidade não criada',
          error?.message || 'Não foi possível criar a comunidade agora.'
        );
      } finally {
        setSalvando(false);
      }
    };

  const fecharModal =
    () => {
      if (salvando) {
        return;
      }

      setModalVisivel(false);
      setNovaComNome('');
      setNovaComDescr('');
      setNovaComCapa(null);
      setNovaComPerfil(null);
      setNovasRegras([]);
    };

  const renderizarImagem =
    (imgData) => {
      if (!imgData) {
        return null;
      }

      if (
        typeof imgData ===
          'string' &&
        (
          imgData.startsWith(
            'http'
          ) ||
          imgData.startsWith(
            'data:image'
          )
        )
      ) {
        return {
          uri: imgData,
        };
      }

      const base64Limpo =
        String(imgData)
          .replace(
            /\s/g,
            ''
          )
          .replace(
            /\\/g,
            ''
          );

      return {
        uri: `data:image/png;base64,${base64Limpo}`,
      };
    };

  const comunidadesFiltradas =
    comunidades.filter(
      (c) =>
        c.nome_comunidade
          ?.toLowerCase()
          .includes(
            pesquisa
              .toLowerCase()
          )
    );

  return (
    <SafeAreaView
      style={[
        estilos.container,
        {
          backgroundColor:
            cores.fundo ||
            '#FAFAFA',
        },
      ]}
    >
      <View
        style={
          estilos.headerLista
        }
      >
        <TouchableOpacity
          style={
            estilos.botaoVoltarCirculo
          }
          onPress={() =>
            navigation.goBack()
          }
          accessibilityRole="button"
          accessibilityLabel="Voltar"
        >
          <Ionicons
            name="arrow-back"
            size={24}
            color={
              cores.primaria ||
              '#8C77C2'
            }
          />
        </TouchableOpacity>
      </View>

      <View
        style={
          estilos.tituloContainer
        }
      >
        <Text
          style={
            estilos.tituloPrincipal
          }
        >
          Suas comunidades
        </Text>
      </View>

      <View
        style={[
          estilos.containerRoxoBox,
          {
            backgroundColor:
              cores.fundoAlternativo ||
              '#EAE6F7',
          },
        ]}
      >
        <View
          style={
            estilos.barraControlesLista
          }
        >
          <View
            style={[
              estilos.tagContador,
              {
                backgroundColor:
                  cores.primaria ||
                  '#8C77C2',
              },
            ]}
          >
            <Ionicons
              name="people"
              size={16}
              color="#FFF"
              style={{
                marginRight: 5,
              }}
            />

            <Text
              style={
                estilos.textoTagContador
              }
            >
              {
                comunidades.length
              }{' '}
              Criada(s)
            </Text>
          </View>

          <View
            style={
              estilos.botoesAcaoDir
            }
          >
            <TouchableOpacity
              style={
                estilos.botaoCirculoBranco
              }
              onPress={() =>
                setModalVisivel(
                  true
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Criar nova comunidade"
            >
              <Ionicons
                name="add"
                size={24}
                color={
                  cores.primaria ||
                  '#8C77C2'
                }
              />
            </TouchableOpacity>

            <TouchableOpacity
              style={
                estilos.botaoCirculoBranco
              }
              onPress={() =>
                setMostrarPesquisa(
                  !mostrarPesquisa
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Pesquisar comunidades"
            >
              <Ionicons
                name="search"
                size={20}
                color={
                  cores.primaria ||
                  '#8C77C2'
                }
              />
            </TouchableOpacity>
          </View>
        </View>

        {mostrarPesquisa && (
          <TextInput
            style={
              estilos.inputPesquisa
            }
            placeholder="Pesquisar..."
            placeholderTextColor={
              cores.textoTerciario ||
              '#999'
            }
            value={pesquisa}
            onChangeText={
              setPesquisa
            }
          />
        )}

        {carregando ? (
          <ActivityIndicator
            size="large"
            color={
              cores.primaria ||
              '#8C77C2'
            }
            style={{
              marginTop: 50,
            }}
          />
        ) : (
          <ScrollView
            contentContainerStyle={
              estilos.scrollContent
            }
            showsVerticalScrollIndicator={
              false
            }
          >
            {comunidadesFiltradas.length ===
            0 ? (
              <View
                style={
                  estilos.vazioContainer
                }
              >
                <View
                  style={
                    estilos.vazioIcone
                  }
                >
                  <Ionicons
                    name="people-outline"
                    size={34}
                    color={
                      cores.primaria ||
                      '#8C77C2'
                    }
                  />
                </View>

                <Text
                  style={
                    estilos.textoVazioRoxo
                  }
                >
                  Faça parte da essência
                  da Orami criando sua
                  primeira comunidade
                </Text>
              </View>
            ) : (
              comunidadesFiltradas.map(
                (comunidade) => {
                  const imgCapa =
                    comunidade.header_comunidade;

                  const imgPerfil =
                    comunidade.foto_comunidade;

                  return (
                    <View
                      key={
                        comunidade.id_comunidade
                      }
                      style={
                        estilos.cardSuaComunidadeContainer
                      }
                    >
                      <ImageBackground
                        source={
                          renderizarImagem(
                            imgCapa
                          )
                        }
                        style={
                          estilos.cardSuaComunidadeBg
                        }
                        imageStyle={
                          estilos.cardSuaComunidadeImageStyle
                        }
                        backgroundColor={
                          cores.primaria ||
                          '#8C77C2'
                        }
                      >
                        <View
                          style={
                            estilos.cardOverlay
                          }
                        >
                          <View
                            style={
                              estilos.cardInfoRow
                            }
                          >
                            <View
                              style={
                                estilos.fotoPerfilContainer
                              }
                            >
                              {imgPerfil ? (
                                <Image
                                  source={renderizarImagem(
                                    imgPerfil
                                  )}
                                  style={
                                    estilos.fotoPerfilComunidade
                                  }
                                />
                              ) : (
                                <Ionicons
                                  name="people-circle"
                                  size={46}
                                  color="#CCC"
                                />
                              )}
                            </View>

                            <View
                              style={
                                estilos.textosComunidade
                              }
                            >
                              <Text
                                style={
                                  estilos.nomeSuaComunidade
                                }
                                numberOfLines={
                                  1
                                }
                              >
                                {
                                  comunidade.nome_comunidade
                                }
                              </Text>

                              <Text
                                style={
                                  estilos.membrosSuaComunidade
                                }
                              >
                                {
                                  comunidade.total_membros ||
                                  0
                                }{' '}
                                membro(s)
                              </Text>
                            </View>
                          </View>

                          <TouchableOpacity
                            style={[
                              estilos.botaoAcessar,
                              {
                                backgroundColor:
                                  cores.primaria ||
                                  '#8C77C2',
                              },
                            ]}
                            onPress={() =>
                              navigation.navigate(
                                'TelaConfigComunidade',
                                {
                                  id_comunidade:
                                    comunidade.id_comunidade,
                                  id_usuario,
                                }
                              )
                            }
                            accessibilityRole="button"
                            accessibilityLabel={`Abrir ${comunidade.nome_comunidade}`}
                          >
                            <Text
                              style={
                                estilos.textoBotaoAcessar
                              }
                            >
                              Ver
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </ImageBackground>
                    </View>
                  );
                }
              )
            )}
          </ScrollView>
        )}
      </View>

      <Modal
        visible={
          modalVisivel
        }
        animationType="fade"
        transparent
      >
        <KeyboardAvoidingView
          behavior={
            Platform.OS === 'ios'
              ? 'padding'
              : 'height'
          }
          style={
            estilos.modalOverlay
          }
        >
          <TouchableWithoutFeedback
            onPress={
              Keyboard.dismiss
            }
          >
            <View
              style={[
                estilos.modalContent,
                {
                  backgroundColor:
                    cores.superficie ||
                    '#FFF',
                },
              ]}
            >
              <View
                style={
                  estilos.modalPopHeader
                }
              >
                <View>
                  <Text
                    style={
                      estilos.modalPopTitulo
                    }
                  >
                    Nova Comunidade
                  </Text>

                  <Text
                    style={
                      estilos.modalPopSubtitulo
                    }
                  >
                    Crie também as regras
                    que orientarão a sua
                    comunidade.
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={
                    fecharModal
                  }
                  disabled={
                    salvando
                  }
                  accessibilityRole="button"
                >
                  <Ionicons
                    name="close-circle"
                    size={28}
                    color="#d33535"
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                showsVerticalScrollIndicator={
                  false
                }
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  estilos.modalScrollContent
                }
              >
                <Text
                  style={
                    estilos.labelInput
                  }
                >
                  Foto de Capa
                </Text>

                <TouchableOpacity
                  style={
                    estilos.popAreaCapa
                  }
                  onPress={() =>
                    selecionarImagem(
                      'capa'
                    )
                  }
                >
                  {novaComCapa ? (
                    <Image
                      source={renderizarImagem(
                        novaComCapa
                      )}
                      style={
                        estilos.popImgCapa
                      }
                    />
                  ) : (
                    <View
                      style={
                        estilos.popPlaceholderCapa
                      }
                    >
                      <Ionicons
                        name="image-outline"
                        size={30}
                        color={
                          cores.primaria ||
                          '#8C77C2'
                        }
                      />

                      <Text
                        style={
                          estilos.popTextoPlaceholder
                        }
                      >
                        Selecionar capa
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View
                  style={
                    estilos.popRow
                  }
                >
                  <TouchableOpacity
                    style={
                      estilos.popAreaPerfil
                    }
                    onPress={() =>
                      selecionarImagem(
                        'perfil'
                      )
                    }
                  >
                    {novaComPerfil ? (
                      <Image
                        source={renderizarImagem(
                          novaComPerfil
                        )}
                        style={
                          estilos.popImgPerfil
                        }
                      />
                    ) : (
                      <Ionicons
                        name="camera"
                        size={24}
                        color="#FFF"
                      />
                    )}
                  </TouchableOpacity>

                  <View
                    style={{
                      flex: 1,
                    }}
                  >
                    <Text
                      style={
                        estilos.labelInput
                      }
                    >
                      Nome
                    </Text>

                    <TextInput
                      style={
                        estilos.popInput
                      }
                      placeholder="Nome da comunidade"
                      placeholderTextColor={
                        cores.textoTerciario ||
                        '#999'
                      }
                      value={
                        novaComNome
                      }
                      onChangeText={
                        setNovaComNome
                      }
                      maxLength={50}
                    />
                  </View>
                </View>

                <Text
                  style={
                    estilos.labelInput
                  }
                >
                  Descrição
                </Text>

                <TextInput
                  style={[
                    estilos.popInput,
                    estilos.popInputMultine,
                  ]}
                  placeholder="Sobre o que é?"
                  placeholderTextColor={
                    cores.textoTerciario ||
                    '#999'
                  }
                  value={
                    novaComDescr
                  }
                  onChangeText={
                    setNovaComDescr
                  }
                  multiline
                />

                <View
                  style={
                    estilos.secaoRegrasCriacao
                  }
                >
                  <View
                    style={
                      estilos.cabecalhoSecaoRegras
                    }
                  >
                    <View
                      style={
                        estilos.iconeSecaoRegras
                      }
                    >
                      <Ionicons
                        name="shield-checkmark-outline"
                        size={20}
                        color={
                          cores.primaria ||
                          '#8C77C2'
                        }
                      />
                    </View>

                    <View
                      style={{
                        flex: 1,
                      }}
                    >
                      <Text
                        style={
                          estilos.tituloSecaoRegras
                        }
                      >
                        Regras da comunidade
                      </Text>

                      <Text
                        style={
                          estilos.subtituloSecaoRegras
                        }
                      >
                        Defina as orientações
                        que os membros deverão
                        seguir.
                      </Text>
                    </View>
                  </View>

                  {novasRegras.length ===
                  0 ? (
                    <View
                      style={
                        estilos.emptyRegrasCriacao
                      }
                    >
                      <Ionicons
                        name="document-text-outline"
                        size={26}
                        color={
                          cores.primaria ||
                          '#8C77C2'
                        }
                      />

                      <Text
                        style={
                          estilos.emptyRegrasTexto
                        }
                      >
                        Nenhuma regra adicionada
                      </Text>

                      <Text
                        style={
                          estilos.emptyRegrasSubtexto
                        }
                      >
                        Você poderá adicionar
                        regras agora ou editar
                        depois.
                      </Text>
                    </View>
                  ) : (
                    <View>
                      {novasRegras.map(
                        (
                          regra,
                          index
                        ) => (
                          <View
                            key={
                              regra.id_temporario
                            }
                            style={
                              estilos.cardNovaRegra
                            }
                          >
                            <View
                              style={
                                estilos.headerNovaRegra
                              }
                            >
                              <View
                                style={[
                                  estilos.numeroRegra,
                                  {
                                    backgroundColor:
                                      cores.primaria ||
                                      '#8C77C2',
                                  },
                                ]}
                              >
                                <Text
                                  style={
                                    estilos.numeroRegraTexto
                                  }
                                >
                                  {index +
                                    1}
                                </Text>
                              </View>

                              <Text
                                style={
                                  estilos.textoRegraLabel
                                }
                              >
                                Nova regra
                              </Text>

                              <TouchableOpacity
                                onPress={() =>
                                  removerNovaRegra(
                                    regra.id_temporario
                                  )
                                }
                                accessibilityRole="button"
                                accessibilityLabel={`Remover regra ${index + 1}`}
                              >
                                <Ionicons
                                  name="trash-outline"
                                  size={20}
                                  color={
                                    cores.perigo ||
                                    '#E74C3C'
                                  }
                                />
                              </TouchableOpacity>
                            </View>

                            <TextInput
                              style={
                                estilos.regraTituloInput
                              }
                              placeholder="Título da regra"
                              placeholderTextColor={
                                cores.textoTerciario ||
                                '#999'
                              }
                              value={
                                regra.titulo
                              }
                              onChangeText={(
                                valor
                              ) =>
                                atualizarNovaRegra(
                                  regra.id_temporario,
                                  'titulo',
                                  valor
                                )
                              }
                              maxLength={
                                100
                              }
                            />

                            <TextInput
                              style={
                                estilos.regraDescricaoInput
                              }
                              placeholder="Descreva esta regra..."
                              placeholderTextColor={
                                cores.textoTerciario ||
                                '#999'
                              }
                              value={
                                regra.descricao
                              }
                              onChangeText={(
                                valor
                              ) =>
                                atualizarNovaRegra(
                                  regra.id_temporario,
                                  'descricao',
                                  valor
                                )
                              }
                              multiline
                              textAlignVertical="top"
                            />
                          </View>
                        )
                      )}
                    </View>
                  )}

                  <TouchableOpacity
                    style={[
                      estilos.botaoAdicionarRegra,
                      {
                        borderColor:
                          cores.primaria ||
                          '#8C77C2',
                      },
                    ]}
                    onPress={
                      adicionarNovaRegra
                    }
                    accessibilityRole="button"
                    accessibilityLabel="Adicionar regra"
                  >
                    <Ionicons
                      name="add-circle-outline"
                      size={20}
                      color={
                        cores.primaria ||
                        '#8C77C2'
                      }
                    />

                    <Text
                      style={[
                        estilos.textoAdicionarRegra,
                        {
                          color:
                            cores.primaria ||
                            '#8C77C2',
                        },
                      ]}
                    >
                      Adicionar regra
                    </Text>
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    estilos.popBotoesContainer
                  }
                >
                  <TouchableOpacity
                    style={
                      estilos.popBotaoCancelar
                    }
                    onPress={
                      fecharModal
                    }
                    disabled={
                      salvando
                    }
                  >
                    <Text
                      style={
                        estilos.popTextoBotaoCancelar
                      }
                    >
                      Cancelar
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      estilos.popBotaoCriar,
                      {
                        backgroundColor:
                          cores.primaria ||
                          '#8C77C2',
                        opacity:
                          salvando
                            ? 0.7
                            : 1,
                      },
                    ]}
                    onPress={
                      criarComunidade
                    }
                    disabled={
                      salvando
                    }
                  >
                    {salvando ? (
                      <ActivityIndicator
                        color="#FFF"
                      />
                    ) : (
                      <Text
                        style={
                          estilos.popTextoBotaoCriar
                        }
                      >
                        Criar Agora
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}

const estilosBase =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#FAFAFA',
    },

    headerLista: {
      paddingHorizontal: 20,
      paddingTop:
        Platform.OS ===
        'android'
          ? 60
          : 30,
      marginBottom: 10,
    },

    botaoVoltarCirculo: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        '#FFF',
      justifyContent:
        'center',
      alignItems:
        'center',
      elevation: 3,
      shadowColor:
        '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity:
        0.1,
      shadowRadius: 3,
    },

    tituloContainer: {
      alignItems:
        'center',
      marginBottom: 20,
    },

    tituloPrincipal: {
      fontSize: 26,
      color:
        '#8C77C2',
      fontFamily:
        'REM_Bold',
      marginTop: -10,
    },

    containerRoxoBox: {
      flex: 1,
      backgroundColor:
        '#EAE6F7',
      borderRadius: 25,
      paddingHorizontal: 20,
      marginHorizontal: 20,
      paddingTop: 25,
      marginBottom: 55,
    },

    barraControlesLista: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      marginBottom: 20,
    },

    tagContador: {
      flexDirection:
        'row',
      alignItems:
        'center',
      backgroundColor:
        '#8C77C2',
      paddingVertical: 8,
      paddingHorizontal: 14,
      borderRadius: 20,
    },

    textoTagContador: {
      color:
        '#FFF',
      fontFamily:
        'REM_Bold',
      fontSize: 13,
    },

    botoesAcaoDir: {
      flexDirection:
        'row',
    },

    botaoCirculoBranco: {
      width: 42,
      height: 42,
      borderRadius: 21,
      backgroundColor:
        '#FFF',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginLeft: 12,
      elevation: 4,
      shadowColor:
        '#8C77C2',
      shadowOpacity:
        0.2,
      shadowRadius: 4,
    },

    inputPesquisa: {
      backgroundColor:
        '#FFF',
      borderRadius: 15,
      paddingHorizontal: 15,
      height: 45,
      fontFamily:
        'REM_Regular',
      color:
        '#000',
      marginBottom: 15,
      borderWidth: 1,
      borderColor:
        '#D1C4E9',
    },

    scrollContent: {
      paddingBottom: 100,
    },

    vazioContainer: {
      marginTop: 100,
      alignItems:
        'center',
      paddingHorizontal: 20,
    },

    vazioIcone: {
      width: 70,
      height: 70,
      borderRadius: 35,
      backgroundColor:
        'rgba(140,119,194,0.12)',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginBottom: 15,
    },

    textoVazioRoxo: {
      color:
        '#8C77C2',
      fontFamily:
        'REM_Medium',
      fontSize: 16,
      textAlign:
        'center',
      opacity: 0.65,
    },

    cardSuaComunidadeContainer: {
      height: 150,
      marginBottom: 18,
      borderRadius: 20,
      overflow:
        'hidden',
      elevation: 5,
    },

    cardSuaComunidadeBg: {
      flex: 1,
      justifyContent:
        'flex-end',
    },

    cardSuaComunidadeImageStyle: {
      borderRadius: 20,
    },

    cardOverlay: {
      backgroundColor:
        'rgba(0,0,0,0.55)',
      padding: 15,
      flexDirection:
        'row',
      alignItems:
        'center',
    },

    cardInfoRow: {
      flexDirection:
        'row',
      alignItems:
        'center',
      flex: 1,
    },

    fotoPerfilContainer: {
      width: 50,
      height: 50,
      borderRadius: 25,
      backgroundColor:
        '#FFF',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 12,
      overflow:
        'hidden',
    },

    fotoPerfilComunidade: {
      width: '100%',
      height: '100%',
    },

    textosComunidade: {
      flex: 1,
    },

    nomeSuaComunidade: {
      fontSize: 18,
      color:
        '#FFF',
      fontFamily:
        'REM_Bold',
    },

    membrosSuaComunidade: {
      fontSize: 13,
      color:
        '#DDD',
      fontFamily:
        'REM_Regular',
    },

    botaoAcessar: {
      backgroundColor:
        '#8C77C2',
      paddingVertical: 8,
      paddingHorizontal: 18,
      borderRadius: 12,
      minWidth: 55,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    textoBotaoAcessar: {
      color:
        '#FFF',
      fontFamily:
        'REM_Bold',
      fontSize: 14,
    },

    modalOverlay: {
      flex: 1,
      backgroundColor:
        'rgba(0,0,0,0.4)',
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    modalContent: {
      width: '90%',
      backgroundColor:
        '#FFF',
      borderRadius: 30,
      padding: 20,
      maxHeight:
        '88%',
      shadowColor:
        '#000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity:
        0.3,
      shadowRadius: 20,
      elevation: 10,
    },

    modalScrollContent: {
      paddingBottom: 5,
    },

    modalPopHeader: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'flex-start',
      marginBottom: 20,
    },

    modalPopTitulo: {
      fontSize: 22,
      fontFamily:
        'REM_Bold',
      color:
        '#8C77C2',
    },

    modalPopSubtitulo: {
      marginTop: 4,
      paddingRight: 15,
      fontFamily:
        'REM_Regular',
      color:
        '#888',
      fontSize: 12,
      lineHeight: 17,
    },

    labelInput: {
      fontFamily:
        'REM_Bold',
      color:
        '#666',
      fontSize: 14,
      marginBottom: 8,
      marginLeft: 4,
    },

    popAreaCapa: {
      width: '100%',
      height: 120,
      backgroundColor:
        '#F5F2FC',
      borderRadius: 15,
      overflow:
        'hidden',
      borderWidth: 2,
      borderColor:
        '#EAE6F7',
      borderStyle:
        'dashed',
      marginBottom: 15,
    },

    popImgCapa: {
      width: '100%',
      height: '100%',
    },

    popPlaceholderCapa: {
      flex: 1,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    popTextoPlaceholder: {
      color:
        '#8C77C2',
      fontFamily:
        'REM_Medium',
      fontSize: 12,
      marginTop: 5,
    },

    popRow: {
      flexDirection:
        'row',
      alignItems:
        'flex-end',
      marginBottom: 15,
    },

    popAreaPerfil: {
      width: 60,
      height: 60,
      borderRadius: 30,
      backgroundColor:
        '#8C77C2',
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 15,
      overflow:
        'hidden',
      elevation: 3,
    },

    popImgPerfil: {
      width: '100%',
      height: '100%',
    },

    popInput: {
      backgroundColor:
        '#FAFAFA',
      borderWidth: 1,
      borderColor:
        '#EEE',
      borderRadius: 12,
      paddingHorizontal: 15,
      height: 45,
      fontFamily:
        'REM_Regular',
      color:
        '#333',
    },

    popInputMultine: {
      height: 80,
      textAlignVertical:
        'top',
      paddingTop: 12,
      marginBottom: 20,
    },

    secaoRegrasCriacao: {
      marginTop: 3,
      marginBottom: 25,
      paddingTop: 18,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        '#E6E0EE',
    },

    cabecalhoSecaoRegras: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 15,
    },

    iconeSecaoRegras: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor:
        'rgba(140,119,194,0.12)',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 11,
    },

    tituloSecaoRegras: {
      fontFamily:
        'REM_Bold',
      fontSize: 15,
      color:
        '#3D3746',
    },

    subtituloSecaoRegras: {
      marginTop: 2,
      fontFamily:
        'REM_Regular',
      fontSize: 11,
      lineHeight: 16,
      color:
        '#8A8391',
    },

    emptyRegrasCriacao: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 18,
      paddingHorizontal: 15,
      marginBottom: 12,
      borderRadius: 16,
      backgroundColor:
        '#F8F6FB',
    },

    emptyRegrasTexto: {
      marginTop: 8,
      fontFamily:
        'REM_Medium',
      color:
        '#655B72',
      fontSize: 13,
    },

    emptyRegrasSubtexto: {
      marginTop: 4,
      fontFamily:
        'REM_Regular',
      color:
        '#98919F',
      fontSize: 11,
      textAlign:
        'center',
    },

    cardNovaRegra: {
      backgroundColor:
        '#FAF8FD',
      borderRadius: 16,
      padding: 14,
      marginBottom: 10,
      borderWidth: 1,
      borderColor:
        '#EEE8F5',
    },

    headerNovaRegra: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 12,
    },

    numeroRegra: {
      width: 30,
      height: 30,
      borderRadius: 15,
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 9,
    },

    numeroRegraTexto: {
      color:
        '#FFF',
      fontFamily:
        'REM_Bold',
      fontSize: 12,
    },

    textoRegraLabel: {
      flex: 1,
      fontFamily:
        'REM_Bold',
      color:
        '#5A5264',
      fontSize: 13,
    },

    regraTituloInput: {
      backgroundColor:
        '#FFF',
      borderWidth: 1,
      borderColor:
        '#E9E3F0',
      borderRadius: 11,
      paddingHorizontal: 13,
      height: 44,
      fontFamily:
        'REM_Medium',
      color:
        '#34303A',
      marginBottom: 9,
    },

    regraDescricaoInput: {
      backgroundColor:
        '#FFF',
      borderWidth: 1,
      borderColor:
        '#E9E3F0',
      borderRadius: 11,
      paddingHorizontal: 13,
      paddingTop: 12,
      minHeight: 82,
      fontFamily:
        'REM_Regular',
      color:
        '#34303A',
      lineHeight: 19,
    },

    botaoAdicionarRegra: {
      minHeight: 46,
      borderRadius: 13,
      borderWidth: 1.5,
      borderStyle:
        'dashed',
      alignItems:
        'center',
      justifyContent:
        'center',
      flexDirection:
        'row',
    },

    textoAdicionarRegra: {
      marginLeft: 7,
      fontFamily:
        'REM_Bold',
      fontSize: 13,
    },

    popBotoesContainer: {
      flexDirection:
        'row',
      justifyContent:
        'space-between',
    },

    popBotaoCancelar: {
      flex: 1,
      height: 50,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 10,
    },

    popTextoBotaoCancelar: {
      fontFamily:
        'REM_Bold',
      color:
        '#999',
    },

    popBotaoCriar: {
      flex: 2,
      backgroundColor:
        '#8C77C2',
      height: 50,
      borderRadius: 15,
      justifyContent:
        'center',
      alignItems:
        'center',
      elevation: 3,
    },

    popTextoBotaoCriar: {
      fontFamily:
        'REM_Bold',
      color:
        '#FFF',
      fontSize: 16,
    },
  });