import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, Alert, Image, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import MenuLateral from './MenuLateral';

export default function TelaRotinas({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [idRotina, setIdRotina] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [atividadesSistema, setAtividadesSistema] = useState([]);
  
  const [nomeAtividade, setNomeAtividade] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [duracaoMinutos, setDuracaoMinutos] = useState('');
  const [imagemAtividade, setImagemAtividade] = useState(null);
  const [tipoCriacao, setTipoCriacao] = useState('personalizada');
  const [atividadeSistemaSelecionada, setAtividadeSistemaSelecionada] = useState(null);
  const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);
  const [editando, setEditando] = useState(false);

  const [modalNovoVisivel, setModalNovoVisivel] = useState(false);
  const [modalVisualizarVisivel, setModalVisualizarVisivel] = useState(false);
  const [dropdownTipoVisivel, setDropdownTipoVisivel] = useState(false);
  const [dropdownImagemVisivel, setDropdownImagemVisivel] = useState(false);
  const [dropdownSistemaVisivel, setDropdownSistemaVisivel] = useState(false);

  useEffect(() => {
    if (id_usuario) {
      inicializarDados();
    }
  }, [id_usuario]);

  const inicializarDados = async () => {
    await carregarPerfil();
    await carregarAtividadesSistema();
    await carregarDadosRotina();
  };

  const carregarPerfil = async () => {
    try {
      const { data, error } = await supabase.rpc('obter_perfil_usuario', { p_id_usuario: id_usuario });
      if (error) throw error;
      if (data) setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as informações do perfil.');
    }
  };

  const carregarAtividadesSistema = async () => {
    try {
      const { data, error } = await supabase.from('atividades').select('*');
      if (error) throw error;
      if (data) setAtividadesSistema(data);
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível carregar as atividades predefinidas.');
    }
  };

  const carregarDadosRotina = async () => {
    setCarregando(true);
    try {
      let { data: rotinaData, error: errRotina } = await supabase
        .from('rotinas')
        .select('id_rotina, ultima_atualizacao')
        .eq('id_usuario', id_usuario)
        .maybeSingle();

      if (errRotina) throw errRotina;

      let rotinaAtualId = rotinaData?.id_rotina || null;
      const dataHoje = new Date().toISOString().split('T')[0];

      if (!rotinaData) {
        const { data: novaRotina, error: errNovaRotina } = await supabase
          .from('rotinas')
          .insert({ id_usuario: id_usuario, ultima_atualizacao: dataHoje })
          .select()
          .single();
        
        if (errNovaRotina) throw errNovaRotina;
        rotinaAtualId = novaRotina?.id_rotina;
      } else if (rotinaData.ultima_atualizacao !== dataHoje) {
        const { error: errReset } = await supabase
          .from('atividades_rotina')
          .update({ realizado: false })
          .eq('id_rotina', rotinaAtualId);

        if (errReset) throw errReset;

        const { error: errUpdate } = await supabase
          .from('rotinas')
          .update({ ultima_atualizacao: dataHoje })
          .eq('id_rotina', rotinaAtualId);

        if (errUpdate) throw errUpdate;
      }

      if (rotinaAtualId) {
        setIdRotina(rotinaAtualId);

        const { data: dataAtividades, error: errAtividades } = await supabase
          .from('atividades_rotina')
          .select('*')
          .eq('id_rotina', rotinaAtualId)
          .order('horario_inicio', { ascending: true });

        if (errAtividades) throw errAtividades;
        setAtividades(dataAtividades || []);
      }
    } catch (e) {
      console.error('Erro ao carregar rotina:', e.message);
      Alert.alert('Erro', `Falha ao carregar rotina: ${e.message}`);
    } finally {
      setCarregando(false);
    }
  };

  const formatarHorario = (texto) => {
    const numeros = texto.replace(/\D/g, '');
    
    if (numeros.length <= 2) {
      return numeros;
    } else if (numeros.length <= 4) {
      return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
    } else {
      return `${numeros.slice(0, 2)}:${numeros.slice(2, 4)}`;
    }
  };

  const formatarHorarioParaBanco = (horario) => {
    return horario ? horario.trim() : null;
  };

  const formatarHorarioParaExibicao = (horario) => {
    return horario ? horario : '';
  };

  const manipularImagem = async (origem) => {
    setDropdownImagemVisivel(false);
    try {
      let permissao;
      let resultado;

      if (origem === 'camera') {
        permissao = await ImagePicker.requestCameraPermissionsAsync();
        if (permissao.status !== 'granted') throw new Error('É necessário conceder acesso à câmera.');
        resultado = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
      } else {
        permissao = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (permissao.status !== 'granted') throw new Error('É necessário conceder acesso à galeria.');
        resultado = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ImagePicker.MediaTypeOptions.Images, allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
      }

      if (!resultado.canceled && resultado.assets?.length > 0) {
        setImagemAtividade(resultado.assets[0].base64);
      }
    } catch (erro) {
      Alert.alert('Permissão Necessária', erro.message);
    }
  };

  const validarFormulario = () => {
    if (tipoCriacao === 'personalizada' && !nomeAtividade.trim()) {
      Alert.alert('Atenção', 'O nome da atividade personalizada é obrigatório.');
      return false;
    }
    if (tipoCriacao === 'sistema' && !atividadeSistemaSelecionada) {
      Alert.alert('Atenção', 'Selecione uma atividade do sistema.');
      return false;
    }
    if (!idRotina) {
      Alert.alert('Atenção', 'Erro de identificação da rotina. Tente recarregar a tela.');
      return false;
    }
    return true;
  };

  const salvarAtividade = async () => {
    if (!validarFormulario()) return;
    
    setSalvando(true);
    try {
      const nomeFinal = tipoCriacao === 'personalizada' ? nomeAtividade.trim() : atividadeSistemaSelecionada.nome;
      const imagemFinal = imagemAtividade || (tipoCriacao === 'sistema' ? atividadeSistemaSelecionada.imagem : null);

      const dadosInsercao = {
        id_rotina: idRotina,
        nome_personalizado: nomeFinal,
        horario_inicio: formatarHorarioParaBanco(horarioInicio),
        duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos, 10) : null,
        imagem_personalizada: imagemFinal,
        permitir_status: true,
        realizado: false
      };

      const { error } = await supabase.from('atividades_rotina').insert([dadosInsercao]);
      if (error) throw error;
      
      encerrarFormulario();
      await carregarDadosRotina();
    } catch (e) {
      Alert.alert('Erro', 'Ocorreu um erro ao tentar salvar a atividade.');
    } finally {
      setSalvando(false);
    }
  };

  const salvarEdicao = async () => {
    if (!nomeAtividade.trim() || !atividadeSelecionada) {
      Alert.alert('Atenção', 'Preencha o nome da atividade.');
      return;
    }
    
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('atividades_rotina')
        .update({
          nome_personalizado: nomeAtividade.trim(),
          horario_inicio: formatarHorarioParaBanco(horarioInicio),
          duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos, 10) : null,
          imagem_personalizada: imagemAtividade
        })
        .eq('id_atividade_rotina', atividadeSelecionada.id_atividade_rotina);
        
      if (error) throw error;
      
      setEditando(false);
      setModalVisualizarVisivel(false);
      await carregarDadosRotina();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível atualizar a atividade solicitada.');
    } finally {
      setSalvando(false);
    }
  };

  const excluirAtividade = async () => {
    if (!atividadeSelecionada) return;
    
    try {
      const { error } = await supabase
        .from('atividades_rotina')
        .delete()
        .eq('id_atividade_rotina', atividadeSelecionada.id_atividade_rotina);
        
      if (error) throw error;
      
      setModalVisualizarVisivel(false);
      setAtividadeSelecionada(null);
      await carregarDadosRotina();
    } catch (e) {
      Alert.alert('Erro', 'Falha ao tentar remover a atividade.');
    }
  };

  const alternarRealizado = async (item) => {
    try {
      const { error } = await supabase
        .from('atividades_rotina')
        .update({ realizado: !item.realizado })
        .eq('id_atividade_rotina', item.id_atividade_rotina);
        
      if (error) throw error;
      await carregarDadosRotina();
    } catch (e) {
      Alert.alert('Erro', 'Não foi possível alterar o status da atividade.');
    }
  };

  const abrirAtividade = (item) => {
    setAtividadeSelecionada(item);
    setNomeAtividade(item.nome_personalizado || '');
    setHorarioInicio(formatarHorarioParaExibicao(item.horario_inicio));
    setDuracaoMinutos(item.duracao_minutos ? String(item.duracao_minutos) : '');
    setImagemAtividade(item.imagem_personalizada || null);
    setEditando(false);
    setModalVisualizarVisivel(true);
  };

  const encerrarFormulario = () => {
    setNomeAtividade('');
    setHorarioInicio('');
    setDuracaoMinutos('');
    setImagemAtividade(null);
    setTipoCriacao('personalizada');
    setAtividadeSistemaSelecionada(null);
    setModalNovoVisivel(false);
  };

  return (
    <SafeAreaView style={estilos.telaPrincipal}>
      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.iconeBotao}>
            <Ionicons name="arrow-back" size={24} color="#8C77C2" />
          </TouchableOpacity>
          <Text style={estilos.tituloHeader}>Minha Rotina</Text>
        </View>
      </View>

      <FlatList
        data={atividades}
        keyExtractor={(item) => item.id_atividade_rotina.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={estilos.barraAcoes}>
            <Text style={estilos.subtitulo}>Atividades do dia</Text>
            <View style={estilos.iconesDireita}>
              <TouchableOpacity
                style={estilos.iconeBotao}
                onPress={() => {
                  encerrarFormulario();
                  setModalNovoVisivel(true);
                }}
              >
                <Ionicons name="add-circle" size={28} color="#8C77C2" />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={estilos.itemRegistroGrande} activeOpacity={0.8} onPress={() => abrirAtividade(item)}>
            {item.imagem_personalizada ? (
              <Image source={{ uri: `data:image/jpeg;base64,${item.imagem_personalizada}` }} style={estilos.imagemCardGrande} />
            ) : (
              <View style={[estilos.imagemCardGrande, { backgroundColor: '#F0EBF8', justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="image-outline" size={32} color="#8C77C2" />
              </View>
            )}
            
            <View style={estilos.conteudoCardGrande}>
              <View style={estilos.infoRegistro}>
                <Text style={[estilos.tituloRegistro, item.realizado && { textDecorationLine: 'line-through', color: '#999' }]}>
                  {item.nome_personalizado || 'Atividade'}
                </Text>
                {item.horario_inicio ? (
                  <Text style={estilos.dataRegistro}>
                    {formatarHorarioParaExibicao(item.horario_inicio)}
                    {item.duracao_minutos ? ` · ${item.duracao_minutos} min` : ''}
                  </Text>
                ) : item.duracao_minutos ? (
                  <Text style={estilos.dataRegistro}>{item.duracao_minutos} min</Text>
                ) : null}
              </View>

              <TouchableOpacity onPress={() => alternarRealizado(item)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Ionicons 
                  name={item.realizado ? "checkmark-circle" : "ellipse-outline"} 
                  size={28} 
                  color={item.realizado ? "#4CAF50" : "#8C77C2"} 
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          !carregando && <Text style={estilos.textoVazio}>Nenhuma atividade cadastrada na rotina.</Text>
        }
      />

      <MenuLateral
        visivel={menuVisivel}
        aoFechar={() => setMenuVisivel(false)}
        navigation={navigation}
        id_usuario={id_usuario}
        perfil={perfil}
      />

      <Modal visible={modalNovoVisivel} transparent animationType="slide" onRequestClose={encerrarFormulario}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContainer}>
            <View style={estilos.modalHeader}>
              <Ionicons name="add-circle-outline" size={20} color="#8C77C2" />
              <Text style={estilos.modalTitulo}>Nova Atividade</Text>
              <TouchableOpacity onPress={encerrarFormulario}>
                <Ionicons name="close" size={24} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            <Text style={estilos.labelInput}>Tipo de Atividade</Text>
            <TouchableOpacity style={estilos.inputTemaDropdown} onPress={() => setDropdownTipoVisivel(true)}>
              <Text style={estilos.textoDropdownSelecionado}>
                {tipoCriacao === 'personalizada' ? 'Atividade Personalizada' : 'Atividade do Sistema'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#8C77C2" />
            </TouchableOpacity>

            {tipoCriacao === 'personalizada' ? (
              <>
                <TouchableOpacity style={estilos.botaoImagem} onPress={() => setDropdownImagemVisivel(true)}>
                  {imagemAtividade ? (
                    <Image source={{ uri: `data:image/jpeg;base64,${imagemAtividade}` }} style={estilos.imagemSelecionada} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={32} color="#FFF" />
                      <Text style={estilos.textoBotaoImagem}>Selecionar Imagem</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={estilos.inputTema}
                  placeholder="Nome da atividade"
                  placeholderTextColor="#BDBDBD"
                  value={nomeAtividade}
                  onChangeText={setNomeAtividade}
                />
              </>
            ) : (
              <>
                <Text style={estilos.labelInput}>Selecione do Sistema</Text>
                <TouchableOpacity style={estilos.inputTemaDropdown} onPress={() => setDropdownSistemaVisivel(true)}>
                  <Text style={estilos.textoDropdownSelecionado}>
                    {atividadeSistemaSelecionada ? atividadeSistemaSelecionada.nome : 'Toque para escolher...'}
                  </Text>
                  <Ionicons name="list" size={20} color="#8C77C2" />
                </TouchableOpacity>

                {atividadeSistemaSelecionada?.imagem && (
                  <View style={estilos.containerImagemDetalhe}>
                    <Image source={{ uri: `data:image/jpeg;base64,${atividadeSistemaSelecionada.imagem}` }} style={estilos.imagemSelecionada} />
                  </View>
                )}
              </>
            )}

            <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
              <TextInput
                style={[estilos.inputTema, { flex: 1, marginBottom: 0 }]}
                placeholder="Horário (HH:MM)"
                placeholderTextColor="#BDBDBD"
                value={horarioInicio}
                onChangeText={(t) => {
                  const formatado = formatarHorario(t);
                  if (formatado.length <= 5) {
                    setHorarioInicio(formatado);
                  }
                }}
                keyboardType="numeric"
                maxLength={5}
              />
              <TextInput
                style={[estilos.inputTema, { flex: 1, marginBottom: 0 }]}
                placeholder="Duração (min)"
                placeholderTextColor="#BDBDBD"
                value={duracaoMinutos}
                onChangeText={setDuracaoMinutos}
                keyboardType="numeric"
              />
            </View>

            <TouchableOpacity style={estilos.btnSalvar} onPress={salvarAtividade} disabled={salvando}>
              {salvando ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={estilos.txtBtnSalvar}>Salvar atividade</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={dropdownTipoVisivel} transparent animationType="fade" onRequestClose={() => setDropdownTipoVisivel(false)}>
        <TouchableOpacity style={estilos.modalCentralOverlay} activeOpacity={1} onPress={() => setDropdownTipoVisivel(false)}>
          <View style={estilos.modalDropdown}>
            <Text style={estilos.tituloDropdown}>Tipo de Atividade</Text>
            
            <TouchableOpacity style={estilos.opcaoDropdown} onPress={() => { setTipoCriacao('personalizada'); setDropdownTipoVisivel(false); }}>
              <Ionicons name="create-outline" size={20} color="#8C77C2" />
              <Text style={estilos.textoOpcaoDropdown}>Atividade Personalizada</Text>
            </TouchableOpacity>

            <TouchableOpacity style={estilos.opcaoDropdown} onPress={() => { setTipoCriacao('sistema'); setDropdownTipoVisivel(false); }}>
              <Ionicons name="globe-outline" size={20} color="#8C77C2" />
              <Text style={estilos.textoOpcaoDropdown}>Atividade do Sistema</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={dropdownSistemaVisivel} transparent animationType="fade" onRequestClose={() => setDropdownSistemaVisivel(false)}>
        <TouchableOpacity style={estilos.modalCentralOverlay} activeOpacity={1} onPress={() => setDropdownSistemaVisivel(false)}>
          <View style={[estilos.modalDropdown, { maxHeight: '60%' }]}>
            <Text style={estilos.tituloDropdown}>Atividades Disponíveis</Text>
            <ScrollView>
              {atividadesSistema.map((item) => (
                <TouchableOpacity 
                  key={item.id_atividade || item.id} 
                  style={estilos.opcaoDropdown} 
                  onPress={() => { setAtividadeSistemaSelecionada(item); setDropdownSistemaVisivel(false); }}
                >
                  <Text style={estilos.textoOpcaoDropdown}>{item.nome}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={dropdownImagemVisivel} transparent animationType="fade" onRequestClose={() => setDropdownImagemVisivel(false)}>
        <TouchableOpacity style={estilos.modalCentralOverlay} activeOpacity={1} onPress={() => setDropdownImagemVisivel(false)}>
          <View style={estilos.modalDropdown}>
            <Text style={estilos.tituloDropdown}>Escolher Imagem</Text>
            
            <TouchableOpacity style={estilos.opcaoDropdown} onPress={() => manipularImagem('galeria')}>
              <Ionicons name="images-outline" size={20} color="#8C77C2" />
              <Text style={estilos.textoOpcaoDropdown}>Abrir Galeria</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[estilos.opcaoDropdown, { borderBottomWidth: 0 }]} onPress={() => manipularImagem('camera')}>
              <Ionicons name="camera-outline" size={20} color="#8C77C2" />
              <Text style={estilos.textoOpcaoDropdown}>Tirar Foto</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      <Modal visible={modalVisualizarVisivel} transparent animationType="fade" onRequestClose={() => setModalVisualizarVisivel(false)}>
        <View style={estilos.modalCentralOverlay}>
          <View style={estilos.modalCentral}>
            <View style={estilos.modalHeader}>
              <Ionicons name="list-outline" size={18} color="#8C77C2" />
              <Text style={estilos.modalTitulo}>{editando ? 'Editar Atividade' : 'Detalhes'}</Text>
              <TouchableOpacity onPress={() => setModalVisualizarVisivel(false)}>
                <Ionicons name="close" size={22} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            {editando ? (
              <>
                <TouchableOpacity style={estilos.botaoImagem} onPress={() => setDropdownImagemVisivel(true)}>
                  {imagemAtividade ? (
                    <Image source={{ uri: `data:image/jpeg;base64,${imagemAtividade}` }} style={estilos.imagemSelecionada} />
                  ) : (
                    <>
                      <Ionicons name="image-outline" size={32} color="#FFF" />
                      <Text style={estilos.textoBotaoImagem}>Selecionar Imagem</Text>
                    </>
                  )}
                </TouchableOpacity>

                <TextInput
                  style={estilos.inputTema}
                  placeholder="Nome da atividade"
                  placeholderTextColor="#BDBDBD"
                  value={nomeAtividade}
                  onChangeText={setNomeAtividade}
                />
                <View style={{ flexDirection: 'row', gap: 10, marginBottom: 20 }}>
                  <TextInput
                    style={[estilos.inputTema, { flex: 1, marginBottom: 0 }]}
                    placeholder="Horário (HH:MM)"
                    placeholderTextColor="#BDBDBD"
                    value={horarioInicio}
                    onChangeText={(t) => {
                      const formatado = formatarHorario(t);
                      if (formatado.length <= 5) {
                        setHorarioInicio(formatado);
                      }
                    }}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                  <TextInput
                    style={[estilos.inputTema, { flex: 1, marginBottom: 0 }]}
                    placeholder="Duração (min)"
                    placeholderTextColor="#BDBDBD"
                    value={duracaoMinutos}
                    onChangeText={setDuracaoMinutos}
                    keyboardType="numeric"
                  />
                </View>
                <TouchableOpacity style={estilos.btnSalvar} onPress={salvarEdicao} disabled={salvando}>
                  {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.txtBtnSalvar}>Salvar</Text>}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {atividadeSelecionada?.imagem_personalizada && (
                  <View style={estilos.containerImagemDetalhe}>
                    <Image source={{ uri: `data:image/jpeg;base64,${atividadeSelecionada.imagem_personalizada}` }} style={estilos.imagemDetalheOriginal} />
                  </View>
                )}
                <Text style={estilos.temaVisualizacao}>{atividadeSelecionada?.nome_personalizado || 'Atividade'}</Text>
                {atividadeSelecionada?.horario_inicio ? (
                  <Text style={estilos.descricaoVisualizacao}>
                    Início: {formatarHorarioParaExibicao(atividadeSelecionada.horario_inicio)}
                  </Text>
                ) : null}
                {atividadeSelecionada?.duracao_minutos ? (
                  <Text style={estilos.descricaoVisualizacao}>
                    Duração: {atividadeSelecionada.duracao_minutos} minutos
                  </Text>
                ) : null}
                
                <View style={[estilos.botoesVisualizacao, { marginTop: 15 }]}>
                  <TouchableOpacity style={estilos.btnModificar} onPress={() => setEditando(true)}>
                    <Ionicons name="pencil" size={16} color="#8C77C2" />
                    <Text style={estilos.txtBtnModificar}>Editar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={estilos.btnExcluir} onPress={excluirAtividade}>
                    <Ionicons name="trash-outline" size={16} color="#FFF" />
                    <Text style={estilos.txtBtnExcluir}>Excluir</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  telaPrincipal: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 10,
  },
  headerEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tituloHeader: {
    fontSize: 22,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    fontWeight: 'bold',
    marginLeft: 10,
  },
  subtitulo: {
    fontSize: 16,
    fontFamily: 'REM_Bold',
    color: '#333',
  },
  iconeBotao: {
    padding: 5,
  },
  barraAcoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  iconesDireita: {
    flexDirection: 'row',
    gap: 12,
  },
  itemRegistroGrande: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 14,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#8C77C2',
    overflow: 'hidden',
    elevation: 2,
  },
  imagemCardGrande: {
    width: '100%',
    height: 180,
    resizeMode: 'contain',
    backgroundColor: '#F9F9F9',
  },
  conteudoCardGrande: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    justifyContent: 'space-between',
  },
  infoRegistro: {
    flex: 1,
    marginRight: 10,
  },
  tituloRegistro: {
    fontSize: 16,
    fontFamily: 'REM_Bold',
    color: '#333',
    fontWeight: '700',
  },
  dataRegistro: {
    fontSize: 13,
    fontFamily: 'REM_Regular',
    color: '#888',
    marginTop: 4,
  },
  textoVazio: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontFamily: 'REM_Regular',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    minHeight: '45%',
  },
  modalCentralOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCentral: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 20,
    width: '100%',
  },
  modalDropdown: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 20,
    width: '80%',
    elevation: 5,
  },
  tituloDropdown: {
    fontSize: 16,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    marginBottom: 15,
    textAlign: 'center',
  },
  opcaoDropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  textoOpcaoDropdown: {
    fontSize: 15,
    fontFamily: 'REM_Regular',
    color: '#333',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 15,
    gap: 8,
  },
  modalTitulo: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    marginLeft: 8,
  },
  labelInput: {
    fontSize: 13,
    fontFamily: 'REM_Bold',
    color: '#666',
    marginBottom: 6,
  },
  inputTemaDropdown: {
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 12,
  },
  textoDropdownSelecionado: {
    fontSize: 14,
    fontFamily: 'REM_Regular',
    color: '#333',
  },
  botaoImagem: {
    height: 120,
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    overflow: 'hidden',
  },
  textoBotaoImagem: {
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
    fontSize: 14,
    marginTop: 6,
  },
  imagemSelecionada: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  containerImagemDetalhe: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#F9F9F9',
    overflow: 'hidden',
    marginBottom: 15,
  },
  imagemDetalheOriginal: {
    width: '100%',
    height: '100%',
    resizeMode: 'contain',
  },
  inputTema: {
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: 'REM_Regular',
    color: '#333',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 12,
  },
  btnSalvar: {
    backgroundColor: '#8C77C2',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  txtBtnSalvar: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
    fontSize: 15,
  },
  temaVisualizacao: {
    fontSize: 16,
    fontFamily: 'REM_Bold',
    color: '#333',
    marginBottom: 5,
  },
  descricaoVisualizacao: {
    fontSize: 14,
    fontFamily: 'REM_Regular',
    color: '#555',
    lineHeight: 22,
  },
  botoesVisualizacao: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  btnModificar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#8C77C2',
    borderRadius: 12,
    padding: 12,
    flex: 1,
    justifyContent: 'center',
  },
  txtBtnModificar: {
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
    fontSize: 14,
  },
  btnExcluir: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8C77C2',
    borderRadius: 12,
    padding: 12,
    flex: 1.5,
    justifyContent: 'center',
  },
  txtBtnExcluir: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
    fontSize: 14,
  },
});