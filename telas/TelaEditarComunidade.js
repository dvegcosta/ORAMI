import React, {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  StyleSheet,
  Text,
  View,
  SafeAreaView,
  TouchableOpacity,
  TextInput,
  Image,
  ScrollView,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

import { supabase } from '../lib/supabase';
import {
  useEstilosTema,
  usarTema,
} from '../lib/tema';
import {
  normalizarImagem,
  uploadImagemBase64,
  BUCKETS,
  removerImagemStorage,
  isStorageUrl,
} from '../lib/storage';

import { Alert } from '../lib/popup';

export default function TelaEditarComunidade({
  route,
  navigation,
}) {
  const estilos =
    useEstilosTema(estilosBase);

  const { cores } =
    usarTema();

  const { comunidade } =
    route.params;

  const [nome, setNome] =
    useState(
      comunidade.nome_comunidade
    );

  const [desc, setDesc] =
    useState(
      comunidade.descr_comunidade
    );

  const [
    fotoPerfilBase64,
    setFotoPerfilBase64,
  ] = useState(
    comunidade.foto_base64
  );

  const [
    fotoCapaBase64,
    setFotoCapaBase64,
  ] = useState(
    comunidade.header_base64
  );

  const [regras, setRegras] =
    useState([]);

  const [carregandoRegras, setCarregandoRegras] =
    useState(true);

  const [salvando, setSalvando] =
    useState(false);

  const [erroRegras, setErroRegras] =
    useState(null);

  const selecionarImagem =
    async (tipo) => {
      const result =
        await ImagePicker.launchImageLibraryAsync(
          {
            mediaTypes:
              ImagePicker.MediaTypeOptions.Images,
            allowsEditing:
              true,
            quality: 0.7,
            base64: true,
            aspect:
              tipo === 'capa'
                ? [16, 9]
                : [1, 1],
          }
        );

      if (!result.canceled) {
        if (tipo === 'capa') {
          setFotoCapaBase64(
            result.assets[0].base64
          );
        } else {
          setFotoPerfilBase64(
            result.assets[0].base64
          );
        }
      }
    };



  const carregarRegras =
    useCallback(
      async () => {
        setCarregandoRegras(
          true
        );

        setErroRegras(
          null
        );

        try {
          const {
            data,
            error,
          } = await supabase
            .from('regras')
            .select(
              'id_regra,id_comunidade,titulo,descricao,ordem,criado_em,atualizado_em'
            )
            .eq(
              'id_comunidade',
              comunidade.id_comunidade
            )
            .order(
              'ordem',
              {
                ascending:
                  true,
              }
            );

          if (error) {
            throw error;
          }

          setRegras(
            data || []
          );
        } catch (error) {
          console.error(
            'Erro ao carregar regras:',
            error
          );

          setErroRegras(
            'Não foi possível carregar as regras desta comunidade.'
          );
        } finally {
          setCarregandoRegras(
            false
          );
        }
      },
      [
        comunidade.id_comunidade,
      ]
    );

  useEffect(() => {
    carregarRegras();
  }, [carregarRegras]);

  const adicionarRegra =
    () => {
      setRegras(
        (prev) => [
          ...prev,
          {
            id_regra:
              null,
            id_comunidade:
              comunidade.id_comunidade,
            titulo: '',
            descricao: '',
            ordem:
              (prev.length ||
                0) + 1,
            criado_em:
              null,
            atualizado_em:
              null,
            nova: true,
          },
        ]
      );
    };

  const atualizarRegraLocal =
    (
      idRegra,
      campo,
      valor
    ) => {
      setRegras(
        (prev) =>
          prev.map(
            (regra) =>
              regra.id_regra ===
                idRegra ||
              (
                !regra.id_regra &&
                idRegra ===
                  regra.__id_temporario
              )
                ? {
                    ...regra,
                    [campo]:
                      valor,
                  }
                : regra
          )
      );
    };

  const garantirIdentificadorTemporario =
    (regra) => {
      if (
        regra.__id_temporario
      ) {
        return regra;
      }

      return {
        ...regra,
        __id_temporario:
          `nova-regra-${Date.now()}-${Math.random()}`,
      };
    };

  const regrasComIdentificadores =
    regras.map(
      (regra) => {
        if (
          !regra.id_regra &&
          !regra.__id_temporario
        ) {
          return garantirIdentificadorTemporario(
            regra
          );
        }

        return regra;
      }
    );

  useEffect(() => {
    const precisaAtualizar =
      regras.some(
        (regra) =>
          !regra.id_regra &&
          !regra.__id_temporario
      );

    if (
      precisaAtualizar
    ) {
      setRegras(
        regrasComIdentificadores
      );
    }
  }, [
    regras,
    regrasComIdentificadores,
  ]);

  const excluirRegra =
    (regra) => {

      if (!regra.id_regra) {
        setRegras(
          (prev) =>
            prev.filter(
              (item) =>
                item.__id_temporario !==
                regra.__id_temporario
            )
        );

        return;
      }

      Alert.alert(
        'Excluir regra',
        `Tem certeza que deseja excluir a regra "${regra.titulo}"?`,
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
                    await supabase
                      .from(
                        'regras'
                      )
                      .delete()
                      .eq(
                        'id_regra',
                        regra.id_regra
                      )
                      .eq(
                        'id_comunidade',
                        comunidade.id_comunidade
                      );

                  if (error) {
                    throw error;
                  }

                  setRegras(
                    (prev) =>
                      prev.filter(
                        (
                          item
                        ) =>
                          item.id_regra !==
                          regra.id_regra
                      )
                  );

                  await carregarRegras();
                } catch (error) {
                  console.error(
                    'Erro ao excluir regra:',
                    error
                  );

                  Alert.alert(
                    'Regra não excluída',
                    'Não foi possível excluir esta regra agora.'
                  );
                }
              },
          },
        ]
      );
    };

  const handleSalvar =
    async () => {
      if (!nome.trim() || !desc.trim()) {
        Alert.alert(
          'Comunidade incompleta',
          'Nome e descrição são obrigatórios para salvar.'
        );
        return;
      }

      const regrasValidas = regras.filter(
        (regra) => regra.titulo.trim() || regra.descricao.trim()
      );

      const regraIncompleta = regrasValidas.find(
        (regra) => !regra.titulo.trim() || !regra.descricao.trim()
      );

      if (regraIncompleta) {
        Alert.alert(
          'Regra incompleta',
          'Preencha o título e a descrição de todas as regras ou remova a regra que está incompleta.'
        );
        return;
      }

      setSalvando(true);
      let novoIcone = null;
      let novaCapa = null;
      let comunidadeAtualizada = false;

      try {
        let referenciaIcone = fotoPerfilBase64 || null;
        let referenciaCapa = fotoCapaBase64 || null;

        if (fotoPerfilBase64 && !isStorageUrl(fotoPerfilBase64)) {
          novoIcone = await uploadImagemBase64({
            bucket: BUCKETS.COMUNIDADES,
            pasta: `${comunidade.id_comunidade}/icones`,
            base64: fotoPerfilBase64,
            mimeType: 'image/jpeg',
            nomeBase: 'icone',
          });
          referenciaIcone = novoIcone.publicUrl;
        }

        if (fotoCapaBase64 && !isStorageUrl(fotoCapaBase64)) {
          novaCapa = await uploadImagemBase64({
            bucket: BUCKETS.COMUNIDADES,
            pasta: `${comunidade.id_comunidade}/capas`,
            base64: fotoCapaBase64,
            mimeType: 'image/jpeg',
            nomeBase: 'capa',
          });
          referenciaCapa = novaCapa.publicUrl;
        }

        const { error: erroComunidade } = await supabase.rpc('atualizar_comunidade', {
          p_id_comunidade: comunidade.id_comunidade,
          p_nome: nome.trim(),
          p_descr: desc.trim(),
          p_foto_base64: referenciaIcone,
          p_header_base64: referenciaCapa,
        });

        if (erroComunidade) throw erroComunidade;
        comunidadeAtualizada = true;

        for (const regra of regrasValidas) {
          if (!regra.id_regra) {
            const { error } = await supabase
              .from('regras')
              .insert({
                id_comunidade: comunidade.id_comunidade,
                titulo: regra.titulo.trim(),
                descricao: regra.descricao.trim(),
              });
            if (error) throw error;
            continue;
          }

          const { error } = await supabase
            .from('regras')
            .update({
              titulo: regra.titulo.trim(),
              descricao: regra.descricao.trim(),
              atualizado_em: new Date().toISOString(),
            })
            .eq('id_regra', regra.id_regra)
            .eq('id_comunidade', comunidade.id_comunidade);

          if (error) throw error;
        }

        // Remove os objetos antigos somente depois do commit da nova referência.
        if (novoIcone?.publicUrl && comunidade.foto_base64 && comunidade.foto_base64 !== novoIcone.publicUrl) {
          await removerImagemStorage(comunidade.foto_base64, BUCKETS.COMUNIDADES);
        }

        if (novaCapa?.publicUrl && comunidade.header_base64 && comunidade.header_base64 !== novaCapa.publicUrl) {
          await removerImagemStorage(comunidade.header_base64, BUCKETS.COMUNIDADES);
        }

        await carregarRegras();

        Alert.alert(
          'Comunidade atualizada',
          'As informações e regras foram salvas com sucesso.',
          [
            {
              text: 'OK',
              onPress: () => navigation.goBack(),
            },
          ]
        );
      } catch (error) {
        console.error('Erro ao salvar comunidade/regras:', error);

        if (!comunidadeAtualizada) {
          if (novoIcone?.publicUrl) {
            await removerImagemStorage(novoIcone.publicUrl, BUCKETS.COMUNIDADES);
          }
          if (novaCapa?.publicUrl) {
            await removerImagemStorage(novaCapa.publicUrl, BUCKETS.COMUNIDADES);
          }
        }

        Alert.alert(
          'Alterações não salvas',
          error?.message || 'Não foi possível salvar as alterações agora.'
        );
      } finally {
        setSalvando(false);
      }
    };

  return (
    <SafeAreaView
      style={[
        estilos.container,
        {
          backgroundColor:
            cores.fundo ||
            '#FAFAFC',
        },
      ]}
    >

      <View
        style={
          estilos.header
        }
      >
        <TouchableOpacity
          onPress={() =>
            navigation.goBack()
          }
          style={
            estilos.headerBotaoVoltar
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

        <Text
          style={
            estilos.tituloHeader
          }
        >
          Editar Comunidade
        </Text>

        <TouchableOpacity
          onPress={
            handleSalvar
          }
          disabled={
            salvando
          }
          style={
            estilos.headerBotaoSalvar
          }
          accessibilityRole="button"
          accessibilityLabel="Salvar alterações"
        >
          {salvando ? (
            <ActivityIndicator
              size="small"
              color={
                cores.primaria ||
                '#8C77C2'
              }
            />
          ) : (
            <Text
              style={[
                estilos.btnSalvar,
                {
                  color:
                    cores.primaria ||
                    '#8C77C2',
                },
              ]}
            >
              Salvar
            </Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={
          estilos.flex
        }
        behavior={
          Platform.OS ===
          'ios'
            ? 'padding'
            : undefined
        }
      >
        <ScrollView
          style={
            estilos.conteudo
          }
          contentContainerStyle={
            estilos.conteudoInterno
          }
          showsVerticalScrollIndicator={
            false
          }
          keyboardShouldPersistTaps="handled"
        >
          <TouchableOpacity
            style={
              estilos.areaCapa
            }
            onPress={() =>
              selecionarImagem(
                'capa'
              )
            }
            accessibilityRole="button"
            accessibilityLabel="Alterar foto de capa"
          >
            {fotoCapaBase64 ? (
              <Image
                source={normalizarImagem(fotoCapaBase64)}
                style={
                  estilos.imgCapa
                }
              />
            ) : (
              <View
                style={
                  estilos.placeholderCapa
                }
              >
                <Ionicons
                  name="camera"
                  size={30}
                  color="#999"
                />

                <Text
                  style={
                    estilos.textoPlaceholderCapa
                  }
                >
                  Adicionar Capa
                </Text>
              </View>
            )}

            <View
              style={
                estilos.iconCameraOverlay
              }
            >
              <Ionicons
                name="camera-reverse"
                size={20}
                color="#FFF"
              />
            </View>
          </TouchableOpacity>

          <View
            style={
              estilos.areaPerfil
            }
          >
            <TouchableOpacity
              style={
                estilos.btnEditarPerfil
              }
              onPress={() =>
                selecionarImagem(
                  'perfil'
                )
              }
              accessibilityRole="button"
              accessibilityLabel="Alterar foto da comunidade"
            >
              {fotoPerfilBase64 ? (
                <Image
                  source={normalizarImagem(fotoPerfilBase64)}
                  style={
                    estilos.imgPerfil
                  }
                />
              ) : (
                <View
                  style={
                    estilos.placeholderPerfil
                  }
                >
                  <Ionicons
                    name="camera"
                    size={30}
                    color="#999"
                  />
                </View>
              )}

              <View
                style={
                  estilos.iconCameraOverlayPequeno
                }
              >
                <Ionicons
                  name="camera-reverse"
                  size={16}
                  color="#FFF"
                />
              </View>
            </TouchableOpacity>
          </View>

          <View
            style={
              estilos.form
            }
          >
            <Text
              style={
                estilos.label
              }
            >
              Nome da Comunidade
            </Text>

            <TextInput
              style={
                estilos.input
              }
              value={nome}
              onChangeText={
                setNome
              }
              maxLength={50}
              placeholder="Nome da comunidade"
              placeholderTextColor={
                cores.textoTerciario ||
                '#999'
              }
            />

            <Text
              style={
                estilos.label
              }
            >
              Descrição
            </Text>

            <TextInput
              style={[
                estilos.input,
                estilos.inputMulti,
              ]}
              value={desc}
              onChangeText={
                setDesc
              }
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              placeholder="Descrição da comunidade"
              placeholderTextColor={
                cores.textoTerciario ||
                '#999'
              }
            />

            <View
              style={
                estilos.secaoRegras
              }
            >
              <View
                style={
                  estilos.cabecalhoRegras
                }
              >
                <View
                  style={
                    estilos.iconeCabecalhoRegras
                  }
                >
                  <Ionicons
                    name="shield-checkmark-outline"
                    size={22}
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
                      estilos.tituloRegras
                    }
                  >
                    Regras da comunidade
                  </Text>

                  <Text
                    style={
                      estilos.subtituloRegras
                    }
                  >
                    Organize as orientações
                    que aparecerão para
                    todos os membros.
                  </Text>
                </View>

                <View
                  style={
                    estilos.badgeQuantidade
                  }
                >
                  <Text
                    style={
                      estilos.badgeQuantidadeTexto
                    }
                  >
                    {regras.length}
                  </Text>
                </View>
              </View>

              {carregandoRegras ? (
                <View
                  style={
                    estilos.estadoRegras
                  }
                >
                  <ActivityIndicator
                    size="small"
                    color={
                      cores.primaria ||
                      '#8C77C2'
                    }
                  />

                  <Text
                    style={
                      estilos.estadoRegrasTexto
                    }
                  >
                    Carregando regras...
                  </Text>
                </View>
              ) : erroRegras ? (
                <View
                  style={
                    estilos.estadoRegras
                  }
                >
                  <Ionicons
                    name="alert-circle-outline"
                    size={28}
                    color={
                      cores.perigo ||
                      '#E74C3C'
                    }
                  />

                  <Text
                    style={
                      estilos.estadoRegrasErro
                    }
                  >
                    {erroRegras}
                  </Text>

                  <TouchableOpacity
                    style={[
                      estilos.botaoTentarRegras,
                      {
                        backgroundColor:
                          cores.primaria ||
                          '#8C77C2',
                      },
                    ]}
                    onPress={
                      carregarRegras
                    }
                  >
                    <Text
                      style={
                        estilos.textoBotaoTentarRegras
                      }
                    >
                      Tentar novamente
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : regras.length ===
                0 ? (
                <View
                  style={
                    estilos.emptyRegras
                  }
                >
                  <View
                    style={
                      estilos.emptyRegrasIcone
                    }
                  >
                    <Ionicons
                      name="document-text-outline"
                      size={27}
                      color={
                        cores.primaria ||
                        '#8C77C2'
                      }
                    />
                  </View>

                  <Text
                    style={
                      estilos.emptyRegrasTitulo
                    }
                  >
                    Nenhuma regra cadastrada
                  </Text>

                  <Text
                    style={
                      estilos.emptyRegrasTexto
                    }
                  >
                    Adicione regras para deixar
                    as expectativas da comunidade
                    claras para todos.
                  </Text>
                </View>
              ) : (
                <View>
                  {regras.map(
                    (
                      regra,
                      index
                    ) => {
                      const identificador =
                        regra.id_regra ||
                        regra.__id_temporario;

                      return (
                        <View
                          key={
                            identificador
                          }
                          style={
                            estilos.cardRegra
                          }
                        >
                          <View
                            style={
                              estilos.topoCardRegra
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
                                estilos.labelRegra
                              }
                            >
                              REGRA
                            </Text>

                            <TouchableOpacity
                              style={
                                estilos.botaoExcluirRegra
                              }
                              onPress={() =>
                                excluirRegra(
                                  regra
                                )
                              }
                              accessibilityRole="button"
                              accessibilityLabel={`Excluir regra ${index + 1}`}
                            >
                              <Ionicons
                                name="trash-outline"
                                size={19}
                                color={
                                  cores.perigo ||
                                  '#E74C3C'
                                }
                              />
                            </TouchableOpacity>
                          </View>

                          <TextInput
                            style={
                              estilos.inputRegraTitulo
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
                              atualizarRegraLocal(
                                regra.id_regra ||
                                  regra.__id_temporario,
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
                              estilos.inputRegraDescricao
                            }
                            placeholder="Descrição da regra"
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
                              atualizarRegraLocal(
                                regra.id_regra ||
                                  regra.__id_temporario,
                                'descricao',
                                valor
                              )
                            }
                            multiline
                            textAlignVertical="top"
                          />

                          <Text
                            style={
                              estilos.ordemRegra
                            }
                          >
                            Ordem definida automaticamente
                            pela comunidade
                          </Text>
                        </View>
                      );
                    }
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
                  adicionarRegra
                }
                accessibilityRole="button"
                accessibilityLabel="Adicionar nova regra"
              >
                <Ionicons
                  name="add-circle-outline"
                  size={21}
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
                  Adicionar nova regra
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilosBase =
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor:
        '#FAFAFC',
    },

    flex: {
      flex: 1,
    },

    header: {
      minHeight: 72,
      flexDirection:
        'row',
      justifyContent:
        'space-between',
      alignItems:
        'center',
      paddingHorizontal: 16,
      paddingTop:
        Platform.OS ===
        'android'
          ? 50
          : 8,
      paddingBottom: 10,
      backgroundColor:
        '#FFF',
      borderBottomWidth:
        StyleSheet.hairlineWidth,
      borderBottomColor:
        '#E9E5EE',
      elevation: 2,
      shadowColor:
        '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity:
        0.05,
      shadowRadius: 5,
    },

    headerBotaoVoltar: {
      width: 44,
      height: 44,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    headerBotaoSalvar: {
      minWidth: 62,
      minHeight: 44,
      alignItems:
        'flex-end',
      justifyContent:
        'center',
    },

    tituloHeader: {
      flex: 1,
      textAlign:
        'center',
      fontSize: 19,
      fontFamily:
        'REM_Bold',
      color:
        '#333',
    },

    btnSalvar: {
      fontSize: 16,
      fontFamily:
        'REM_Bold',
      color:
        '#8C77C2',
    },

    conteudo: {
      flex: 1,
    },

    conteudoInterno: {
      paddingBottom: 50,
    },

    areaCapa: {
      height: 180,
      width: '100%',
      backgroundColor:
        '#E0E0E0',
      justifyContent:
        'center',
      alignItems:
        'center',
      position:
        'relative',
    },

    imgCapa: {
      width: '100%',
      height: '100%',
    },

    placeholderCapa: {
      alignItems:
        'center',
    },

    textoPlaceholderCapa: {
      color:
        '#999',
      marginTop: 5,
      fontFamily:
        'REM_Medium',
    },

    iconCameraOverlay: {
      position:
        'absolute',
      bottom: 12,
      right: 12,
      backgroundColor:
        'rgba(0,0,0,0.52)',
      padding: 9,
      borderRadius: 20,
    },

    areaPerfil: {
      alignItems:
        'flex-start',
      marginTop: -45,
      paddingHorizontal: 20,
      marginBottom: 20,
      zIndex: 2,
    },

    btnEditarPerfil: {
      width: 100,
      height: 100,
      borderRadius: 50,
      backgroundColor:
        '#FFF',
      padding: 4,
      elevation: 5,
      shadowColor:
        '#000',
      shadowOffset: {
        width: 0,
        height: 3,
      },
      shadowOpacity:
        0.12,
      shadowRadius: 6,
      position:
        'relative',
    },

    imgPerfil: {
      width: '100%',
      height: '100%',
      borderRadius: 50,
    },

    placeholderPerfil: {
      width: '100%',
      height: '100%',
      borderRadius: 46,
      backgroundColor:
        '#EEE',
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    iconCameraOverlayPequeno: {
      position:
        'absolute',
      bottom: 0,
      right: 0,
      backgroundColor:
        '#8C77C2',
      padding: 6,
      borderRadius: 16,
      borderWidth: 2,
      borderColor:
        '#FFF',
    },

    form: {
      paddingHorizontal: 20,
    },

    label: {
      fontSize: 14,
      color:
        '#666',
      fontFamily:
        'REM_Bold',
      marginBottom: 6,
      marginTop: 15,
    },

    input: {
      backgroundColor:
        '#FFF',
      borderWidth: 1,
      borderColor:
        '#E0E0E0',
      borderRadius: 12,
      paddingHorizontal: 15,
      paddingVertical: 13,
      minHeight: 48,
      fontSize: 15,
      fontFamily:
        'REM_Regular',
      color:
        '#000',
    },

    inputMulti: {
      minHeight: 125,
      textAlignVertical:
        'top',
      paddingTop: 13,
    },

    secaoRegras: {
      marginTop: 30,
      paddingTop: 22,
      borderTopWidth:
        StyleSheet.hairlineWidth,
      borderTopColor:
        '#E3DDEB',
      marginBottom: 10,
    },

    cabecalhoRegras: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 18,
    },

    iconeCabecalhoRegras: {
      width: 46,
      height: 46,
      borderRadius: 23,
      backgroundColor:
        'rgba(140,119,194,0.12)',
      alignItems:
        'center',
      justifyContent:
        'center',
      marginRight: 12,
    },

    tituloRegras: {
      fontFamily:
        'REM_Bold',
      fontSize: 17,
      color:
        '#3C3743',
    },

    subtituloRegras: {
      marginTop: 3,
      fontFamily:
        'REM_Regular',
      fontSize: 11,
      lineHeight: 16,
      color:
        '#8B8492',
    },

    badgeQuantidade: {
      minWidth: 32,
      height: 32,
      borderRadius: 16,
      paddingHorizontal: 8,
      backgroundColor:
        '#F0EBF8',
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    badgeQuantidadeTexto: {
      fontFamily:
        'REM_Bold',
      fontSize: 12,
      color:
        '#8C77C2',
    },

    estadoRegras: {
      alignItems:
        'center',
      justifyContent:
        'center',
      paddingVertical: 26,
      paddingHorizontal: 20,
      backgroundColor:
        '#F8F6FB',
      borderRadius: 17,
      marginBottom: 14,
    },

    estadoRegrasTexto: {
      marginTop: 9,
      fontFamily:
        'REM_Medium',
      fontSize: 13,
      color:
        '#756D7E',
    },

    estadoRegrasErro: {
      marginTop: 9,
      marginBottom: 14,
      fontFamily:
        'REM_Medium',
      fontSize: 13,
      lineHeight: 19,
      color:
        '#756D7E',
      textAlign:
        'center',
    },

    botaoTentarRegras: {
      minHeight: 42,
      paddingHorizontal: 17,
      borderRadius: 12,
      justifyContent:
        'center',
      alignItems:
        'center',
    },

    textoBotaoTentarRegras: {
      color:
        '#FFF',
      fontFamily:
        'REM_Bold',
      fontSize: 13,
    },

    emptyRegras: {
      paddingHorizontal: 22,
      paddingVertical: 24,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        '#F8F6FB',
      borderRadius: 17,
      marginBottom: 14,
    },

    emptyRegrasIcone: {
      width: 56,
      height: 56,
      borderRadius: 28,
      alignItems:
        'center',
      justifyContent:
        'center',
      backgroundColor:
        'rgba(140,119,194,0.11)',
      marginBottom: 10,
    },

    emptyRegrasTitulo: {
      fontFamily:
        'REM_Bold',
      fontSize: 14,
      color:
        '#534B5C',
      marginBottom: 5,
    },

    emptyRegrasTexto: {
      fontFamily:
        'REM_Regular',
      fontSize: 12,
      lineHeight: 18,
      color:
        '#8E8696',
      textAlign:
        'center',
    },

    cardRegra: {
      backgroundColor:
        '#FFF',
      borderRadius: 17,
      padding: 15,
      marginBottom: 12,
      borderWidth: 1,
      borderColor:
        '#ECE7F1',
      shadowColor:
        '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity:
        0.04,
      shadowRadius: 5,
      elevation: 2,
    },

    topoCardRegra: {
      flexDirection:
        'row',
      alignItems:
        'center',
      marginBottom: 13,
    },

    numeroRegra: {
      width: 32,
      height: 32,
      borderRadius: 16,
      justifyContent:
        'center',
      alignItems:
        'center',
      marginRight: 10,
    },

    numeroRegraTexto: {
      fontFamily:
        'REM_Bold',
      fontSize: 12,
      color:
        '#FFF',
    },

    labelRegra: {
      flex: 1,
      fontFamily:
        'REM_Bold',
      fontSize: 11,
      letterSpacing: 0.7,
      color:
        '#8A8292',
    },

    botaoExcluirRegra: {
      width: 40,
      height: 40,
      alignItems:
        'center',
      justifyContent:
        'center',
    },

    inputRegraTitulo: {
      minHeight: 46,
      backgroundColor:
        '#FAF9FC',
      borderWidth: 1,
      borderColor:
        '#E9E4EF',
      borderRadius: 11,
      paddingHorizontal: 13,
      fontFamily:
        'REM_Medium',
      fontSize: 14,
      color:
        '#36313D',
      marginBottom: 9,
    },

    inputRegraDescricao: {
      minHeight: 95,
      backgroundColor:
        '#FAF9FC',
      borderWidth: 1,
      borderColor:
        '#E9E4EF',
      borderRadius: 11,
      paddingHorizontal: 13,
      paddingTop: 12,
      fontFamily:
        'REM_Regular',
      fontSize: 13,
      lineHeight: 19,
      color:
        '#36313D',
    },

    ordemRegra: {
      marginTop: 8,
      fontFamily:
        'REM_Regular',
      fontSize: 10,
      color:
        '#A19AA8',
    },

    botaoAdicionarRegra: {
      minHeight: 48,
      borderWidth: 1.5,
      borderStyle:
        'dashed',
      borderRadius: 13,
      alignItems:
        'center',
      justifyContent:
        'center',
      flexDirection:
        'row',
      marginTop: 2,
    },

    textoAdicionarRegra: {
      marginLeft: 8,
      fontFamily:
        'REM_Bold',
      fontSize: 13,
    },
  });