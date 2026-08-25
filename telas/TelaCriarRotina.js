import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  FlatList, Modal, TextInput, ActivityIndicator, Image, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import MenuLateral from './MenuLateral';

export default function TelaCriarRotina({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
  const [rotinas, setRotinas] = useState([]);
  const [rotinaSelecionada, setRotinaSelecionada] = useState(null);
  const [atividades, setAtividades] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const [modalAtividadeVisivel, setModalAtividadeVisivel] = useState(false);
  const [modalNovaRotinaVisivel, setModalNovaRotinaVisivel] = useState(false);
  const [nomeRotina, setNomeRotina] = useState('');
  const [salvandoRotina, setSalvandoRotina] = useState(false);

  const [nomeAtividade, setNomeAtividade] = useState('');
  const [horarioInicio, setHorarioInicio] = useState('');
  const [duracao, setDuracao] = useState('');
  const [permitirStatus, setPermitirStatus] = useState(true);
  const [imagemAtividade, setImagemAtividade] = useState(null);
  const [salvandoAtividade, setSalvandoAtividade] = useState(false);

  useEffect(() => {
    carregarPerfil();
    carregarRotinas();
  }, []);

  const carregarPerfil = async () => {
    try {
      const { data, error } = await supabase.rpc('obter_perfil_usuario', { p_id_usuario: id_usuario });
      if (data && !error) setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
    } catch (e) { console.error(e); }
  };

  const carregarRotinas = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('rotinas')
        .select('*')
        .eq('id_usuario', id_usuario);
      if (error) throw error;
      setRotinas(data || []);
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  };

  const carregarAtividades = async (id_rotina) => {
    try {
      const { data, error } = await supabase
        .from('atividades_rotina')
        .select('*')
        .eq('id_rotina', id_rotina);
      if (error) throw error;
      setAtividades(data || []);
    } catch (e) { console.error(e); }
  };

  const selecionarRotina = (rotina) => {
    setRotinaSelecionada(rotina);
    carregarAtividades(rotina.id_rotina);
  };

  const criarRotina = async () => {
    if (!nomeRotina.trim()) return;
    setSalvandoRotina(true);
    try {
      const { data, error } = await supabase
        .from('rotinas')
        .insert({ id_usuario, nome: nomeRotina.trim() })
        .select()
        .single();
      if (error) throw error;
      setModalNovaRotinaVisivel(false);
      setNomeRotina('');
      await carregarRotinas();
      selecionarRotina(data);
    } catch (e) { console.error(e); }
    finally { setSalvandoRotina(false); }
  };

  const excluirRotina = async () => {
    if (!rotinaSelecionada) return;
    try {
      const { error } = await supabase
        .from('rotinas')
        .delete()
        .eq('id_rotina', rotinaSelecionada.id_rotina);
      if (error) throw error;
      setRotinaSelecionada(null);
      setAtividades([]);
      await carregarRotinas();
    } catch (e) { console.error(e); }
  };

  const selecionarImagem = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });
    if (!result.canceled) setImagemAtividade(result.assets[0].base64);
  };

  const salvarAtividade = async () => {
    if (!nomeAtividade.trim()) return;
    setSalvandoAtividade(true);
    try {
      const { error } = await supabase
        .from('atividades_rotina')
        .insert({
          id_rotina: rotinaSelecionada.id_rotina,
          nome_personalizado: nomeAtividade.trim(),
          imagem_personalizada: imagemAtividade || null,
          horario_inicio: horarioInicio || null,
          duracao_minutos: duracao ? parseInt(duracao) : null,
          permitir_status: permitirStatus,
          realizado: false,
        });
      if (error) throw error;
      setModalAtividadeVisivel(false);
      setNomeAtividade('');
      setHorarioInicio('');
      setDuracao('');
      setPermitirStatus(true);
      setImagemAtividade(null);
      await carregarAtividades(rotinaSelecionada.id_rotina);
    } catch (e) { console.error(e); }
    finally { setSalvandoAtividade(false); }
  };

  const excluirAtividade = async (id_atividade_rotina) => {
    try {
      const { error } = await supabase
        .from('atividades_rotina')
        .delete()
        .eq('id_atividade_rotina', id_atividade_rotina);
      if (error) throw error;
      await carregarAtividades(rotinaSelecionada.id_rotina);
    } catch (e) { console.error(e); }
  };

  const toggleRealizado = async (item) => {
    try {
      const { error } = await supabase
        .from('atividades_rotina')
        .update({ realizado: !item.realizado })
        .eq('id_atividade_rotina', item.id_atividade_rotina);
      if (error) throw error;
      await carregarAtividades(rotinaSelecionada.id_rotina);
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={estilos.telaPrincipal}>
      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.iconeBotao}>
            <Ionicons name="arrow-back" size={24} color="#8C77C2" />
          </TouchableOpacity>
          <Ionicons name="create-outline" size={22} color="#8C77C2" style={{ marginRight: 6 }} />
          <Text style={estilos.tituloHeader}>
            {rotinaSelecionada ? 'Rotina atual' : 'Criar rotina'}
          </Text>
        </View>
        {rotinaSelecionada && (
          <View style={estilos.headerDireita}>
            <TouchableOpacity style={estilos.iconeBotao}>
              <Ionicons name="pencil" size={20} color="#8C77C2" />
            </TouchableOpacity>
            <TouchableOpacity style={estilos.iconeBotao} onPress={excluirRotina}>
              <Ionicons name="trash-outline" size={20} color="#8C77C2" />
            </TouchableOpacity>
            <TouchableOpacity style={estilos.iconeBotao} onPress={() => setRotinaSelecionada(null)}>
              <Ionicons name="swap-horizontal-outline" size={20} color="#8C77C2" />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {!rotinaSelecionada ? (
        <View style={estilos.containerSemRotina}>
          {carregando ? (
            <ActivityIndicator size="large" color="#8C77C2" />
          ) : rotinas.length === 0 ? (
            <Text style={estilos.textoVazio}>A rotina criada será exibida neste espaço</Text>
          ) : (
            <FlatList
              data={rotinas}
              keyExtractor={(item) => item.id_rotina.toString()}
              contentContainerStyle={{ padding: 20 }}
              renderItem={({ item }) => (
                <TouchableOpacity style={estilos.itemRotina} onPress={() => selecionarRotina(item)}>
                  <Ionicons name="create-outline" size={20} color="#8C77C2" />
                  <Text style={estilos.txtRotina}>{item.nome}</Text>
                  <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
                </TouchableOpacity>
              )}
            />
          )}
          <TouchableOpacity style={estilos.btnNovaRotina} onPress={() => setModalNovaRotinaVisivel(true)}>
            <Ionicons name="add" size={24} color="#8C77C2" />
          </TouchableOpacity>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <TouchableOpacity style={estilos.btnAdicionarAtividade} onPress={() => setModalAtividadeVisivel(true)}>
            <Ionicons name="add" size={18} color="#8C77C2" />
            <Text style={estilos.txtAdicionarAtividade}>Adicionar atividade</Text>
          </TouchableOpacity>

          <FlatList
            data={atividades}
            keyExtractor={(item) => item.id_atividade_rotina.toString()}
            contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 120 }}
            ListEmptyComponent={<Text style={estilos.textoVazio}>Nenhuma atividade ainda.</Text>}
            renderItem={({ item }) => (
              <View style={estilos.cardAtividade}>
                <TouchableOpacity onPress={() => excluirAtividade(item.id_atividade_rotina)} style={estilos.btnFecharAtividade}>
                  <Ionicons name="close" size={16} color="#BDBDBD" />
                </TouchableOpacity>

                {item.imagem_personalizada ? (
                  <Image source={{ uri: `data:image/jpeg;base64,${item.imagem_personalizada}` }} style={estilos.imagemAtividade} />
                ) : (
                  <View style={[estilos.imagemAtividade, { backgroundColor: '#EDE0FF', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={30} color="#8C77C2" />
                  </View>
                )}

                <View style={estilos.infoAtividade}>
                  <Text style={estilos.nomeAtividade}>{item.nome_personalizado}</Text>
                  {item.horario_inicio && (
                    <Text style={estilos.horarioAtividade}>{item.horario_inicio?.slice(0, 5)}</Text>
                  )}
                  {item.duracao_minutos && (
                    <Text style={estilos.duracaoAtividade}>{item.duracao_minutos}min</Text>
                  )}
                </View>

                {item.permitir_status && (
                  <TouchableOpacity onPress={() => toggleRealizado(item)}>
                    <Ionicons
                      name={item.realizado ? 'checkbox' : 'square-outline'}
                      size={24}
                      color="#8C77C2"
                    />
                  </TouchableOpacity>
                )}
              </View>
            )}
          />

          <View style={estilos.rodapeRotina}>
            <TouchableOpacity style={estilos.btnSalvarRotina}>
              <Ionicons name="checkmark" size={18} color="#FFF" />
              <Text style={estilos.txtBtnSalvar}>Salvar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      <MenuLateral
        visivel={menuVisivel}
        aoFechar={() => setMenuVisivel(false)}
        navigation={navigation}
        id_usuario={id_usuario}
        perfil={perfil}
      />

      {/* Modal nova rotina */}
      <Modal visible={modalNovaRotinaVisivel} transparent animationType="fade" onRequestClose={() => setModalNovaRotinaVisivel(false)}>
        <TouchableOpacity style={estilos.modalOverlay} activeOpacity={1} onPress={() => setModalNovaRotinaVisivel(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={estilos.modalCentral}>
              <View style={estilos.modalHeader}>
                <Ionicons name="create-outline" size={18} color="#8C77C2" />
                <Text style={estilos.modalTitulo}>Nova rotina</Text>
                <TouchableOpacity onPress={() => setModalNovaRotinaVisivel(false)}>
                  <Ionicons name="close" size={22} color="#BDBDBD" />
                </TouchableOpacity>
              </View>
              <TextInput
                style={estilos.input}
                placeholder="Nome da rotina"
                placeholderTextColor="#BDBDBD"
                value={nomeRotina}
                onChangeText={setNomeRotina}
              />
              <TouchableOpacity style={estilos.btnSalvar} onPress={criarRotina} disabled={salvandoRotina}>
                {salvandoRotina ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.txtBtnSalvar}>Criar rotina</Text>}
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Modal nova atividade */}
      <Modal visible={modalAtividadeVisivel} transparent animationType="slide" onRequestClose={() => setModalAtividadeVisivel(false)}>
        <View style={estilos.modalSlideOverlay}>
          <ScrollView style={estilos.modalSlideContainer} showsVerticalScrollIndicator={false}>
            <View style={estilos.modalHeader}>
              <Ionicons name="create-outline" size={18} color="#8C77C2" />
              <Text style={estilos.modalTitulo}>Criando minha rotina</Text>
              <TouchableOpacity onPress={() => setModalAtividadeVisivel(false)}>
                <Ionicons name="close" size={22} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            <TouchableOpacity style={estilos.areaSelecionarImagem} onPress={selecionarImagem}>
              {imagemAtividade ? (
                <Image source={{ uri: `data:image/jpeg;base64,${imagemAtividade}` }} style={estilos.imagemPreview} />
              ) : (
                <View style={estilos.placeholderImagem}>
                  <Ionicons name="image-outline" size={40} color="#8C77C2" />
                  <Text style={{ color: '#8C77C2', fontSize: 12, marginTop: 6, fontFamily: 'REM_Medium' }}>Selecionar imagem</Text>
                </View>
              )}
            </TouchableOpacity>

            <TextInput
              style={estilos.input}
              placeholder="Nome da atividade"
              placeholderTextColor="#BDBDBD"
              value={nomeAtividade}
              onChangeText={setNomeAtividade}
            />

            <TouchableOpacity style={estilos.inputRow}>
              <Ionicons name="time-outline" size={18} color="#BDBDBD" />
              <TextInput
                style={[estilos.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                placeholder="Defina um horário de início"
                placeholderTextColor="#BDBDBD"
                value={horarioInicio}
                onChangeText={setHorarioInicio}
              />
            </TouchableOpacity>

            <TouchableOpacity style={estilos.inputRow}>
              <Ionicons name="timer-outline" size={18} color="#BDBDBD" />
              <TextInput
                style={[estilos.input, { flex: 1, marginBottom: 0, borderWidth: 0 }]}
                placeholder="Defina uma duração"
                placeholderTextColor="#BDBDBD"
                value={duracao}
                onChangeText={setDuracao}
                keyboardType="numeric"
              />
            </TouchableOpacity>

            <TouchableOpacity style={estilos.checkboxRow} onPress={() => setPermitirStatus(!permitirStatus)}>
              <Ionicons name={permitirStatus ? 'checkbox' : 'square-outline'} size={22} color="#8C77C2" />
              <Text style={estilos.txtCheckbox}>Permitir status</Text>
            </TouchableOpacity>

            <TouchableOpacity style={[estilos.btnSalvar, { marginTop: 10 }]} onPress={salvarAtividade} disabled={salvandoAtividade}>
              {salvandoAtividade ? <ActivityIndicator color="#FFF" /> : (
                <>
                  <Ionicons name="checkmark" size={18} color="#FFF" />
                  <Text style={estilos.txtBtnSalvar}>Salvar</Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>
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
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 10,
  },
  headerEsquerda: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerDireita: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  tituloHeader: {
    fontSize: 22,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    fontWeight: 'bold',
  },
  iconeBotao: {
    padding: 5,
  },
  containerSemRotina: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textoVazio: {
    color: '#8C77C2',
    fontFamily: 'REM_Medium',
    fontSize: 15,
    textAlign: 'center',
    opacity: 0.6,
    paddingHorizontal: 40,
  },
  btnNovaRotina: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#EDE0FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemRotina: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 1,
    marginBottom: 10,
  },
  txtRotina: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'REM_Medium',
    color: '#333',
  },
  btnAdicionarAtividade: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  txtAdicionarAtividade: {
    fontSize: 14,
    fontFamily: 'REM_Medium',
    color: '#8C77C2',
  },
  cardAtividade: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 1,
    marginBottom: 12,
    position: 'relative',
  },
  btnFecharAtividade: {
    position: 'absolute',
    top: 8,
    right: 8,
    zIndex: 1,
  },
  imagemAtividade: {
    width: 70,
    height: 70,
    borderRadius: 12,
  },
  infoAtividade: {
    flex: 1,
  },
  nomeAtividade: {
    fontSize: 14,
    fontFamily: 'REM_Bold',
    color: '#333',
    marginBottom: 4,
  },
  horarioAtividade: {
    fontSize: 14,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
  },
  duracaoAtividade: {
    fontSize: 12,
    fontFamily: 'REM_Regular',
    color: '#999',
  },
  rodapeRotina: {
    position: 'absolute',
    bottom: 90,
    right: 20,
  },
  btnSalvarRotina: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#8C77C2',
    borderRadius: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  modalOverlay: {
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
  modalSlideOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalSlideContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    padding: 24,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
    gap: 8,
  },
  modalTitulo: {
    flex: 1,
    fontSize: 16,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    marginLeft: 8,
  },
  input: {
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
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    marginBottom: 12,
    gap: 8,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 12,
  },
  txtCheckbox: {
    fontSize: 14,
    fontFamily: 'REM_Medium',
    color: '#555',
  },
  areaSelecionarImagem: {
    width: '100%',
    height: 160,
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  imagemPreview: {
    width: '100%',
    height: '100%',
  },
  placeholderImagem: {
    flex: 1,
    backgroundColor: '#F3EEFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  btnSalvar: {
    backgroundColor: '#8C77C2',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginBottom: 20,
  },
  txtBtnSalvar: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
    fontSize: 15,
  },
});