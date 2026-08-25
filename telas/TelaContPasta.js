import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, FlatList, ActivityIndicator, Modal, TextInput
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema } from '../lib/tema';

export default function TelaConteudoPasta({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { pasta, id_usuario } = route.params || {};
  const [registros, setRegistros] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [modalVisualizarVisivel, setModalVisualizarVisivel] = useState(false);
  const [editando, setEditando] = useState(false);
  const [temaEditado, setTemaEditado] = useState('');
  const [descricaoEditada, setDescricaoEditada] = useState('');
  const [salvando, setSalvando] = useState(false);

  useEffect(() => { carregarRegistros(); }, []);

  const carregarRegistros = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('registros_diarios')
        .select('*')
        .eq('id_usuario', id_usuario)
        .eq('id_pasta', pasta.id_pasta)
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setRegistros(data || []);
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  };

  const abrirRegistro = (item) => {
    setRegistroSelecionado(item);
    setTemaEditado(item.tema || '');
    setDescricaoEditada(item.descricao || '');
    setEditando(false);
    setModalVisualizarVisivel(true);
  };

  const salvarEdicao = async () => {
    if (!descricaoEditada.trim()) return;
    setSalvando(true);
    try {
      const { error } = await supabase
        .from('registros_diarios')
        .update({ tema: temaEditado.trim(), descricao: descricaoEditada.trim() })
        .eq('id_registro_diario', registroSelecionado.id_registro_diario);
      if (error) throw error;
      setEditando(false);
      setModalVisualizarVisivel(false);
      await carregarRegistros();
    } catch (e) { console.error(e); }
    finally { setSalvando(false); }
  };

  const excluirRegistro = async () => {
    try {
      const { error } = await supabase
        .from('registros_diarios')
        .delete()
        .eq('id_registro_diario', registroSelecionado.id_registro_diario);
      if (error) throw error;
      setModalVisualizarVisivel(false);
      setRegistroSelecionado(null);
      await carregarRegistros();
    } catch (e) { console.error(e); }
  };

  return (
    <SafeAreaView style={estilos.telaPrincipal}>
      <View style={estilos.headerContainer}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.iconeBotao}>
          <Ionicons name="arrow-back" size={24} color="#8C77C2" />
        </TouchableOpacity>
        <Ionicons name="folder" size={20} color="#8C77C2" style={{ marginRight: 6 }} />
        <Text style={estilos.tituloHeader}>{pasta.nome}</Text>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={registros}
          keyExtractor={(item) => item.id_registro_diario.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
          renderItem={({ item }) => (
            <TouchableOpacity style={estilos.itemRegistro} activeOpacity={0.7} onPress={() => abrirRegistro(item)}>
              <Ionicons name="calendar-outline" size={20} color="#8C77C2" />
              <View style={estilos.infoRegistro}>
                <Text style={estilos.tituloRegistro}>{item.tema || 'Registro diário'}</Text>
                <Text style={estilos.dataRegistro}>
                  {new Date(item.criado_em).toLocaleDateString('pt-BR')} · {new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                </Text>
              </View>
            </TouchableOpacity>
          )}
          ListEmptyComponent={<Text style={estilos.textoVazio}>Nenhum registro nesta pasta.</Text>}
        />
      )}

      <Modal visible={modalVisualizarVisivel} transparent animationType="fade" onRequestClose={() => setModalVisualizarVisivel(false)}>
        <TouchableOpacity style={estilos.modalCentralOverlay} activeOpacity={1} onPress={() => setModalVisualizarVisivel(false)}>
          <TouchableOpacity activeOpacity={1} onPress={() => {}}>
            <View style={estilos.modalCentral}>
              <View style={estilos.modalHeader}>
                <Ionicons name="calendar-outline" size={18} color="#8C77C2" />
                <Text style={estilos.modalTitulo}>{editando ? 'Editar' : 'Visualização'}</Text>
                <TouchableOpacity onPress={() => setModalVisualizarVisivel(false)}>
                  <Ionicons name="close" size={22} color="#BDBDBD" />
                </TouchableOpacity>
              </View>
              {editando ? (
                <>
                  <TextInput style={estilos.inputTema} placeholder="Tema" placeholderTextColor="#BDBDBD" value={temaEditado} onChangeText={setTemaEditado} />
                  <TextInput style={estilos.inputDescricao} placeholder="Descrição..." placeholderTextColor="#BDBDBD" value={descricaoEditada} onChangeText={setDescricaoEditada} multiline />
                  <TouchableOpacity style={estilos.btnSalvar} onPress={salvarEdicao} disabled={salvando}>
                    {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.txtBtnSalvar}>Salvar</Text>}
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <Text style={estilos.temaVisualizacao}>{registroSelecionado?.tema || 'Registro diário'}</Text>
                  <Text style={estilos.descricaoVisualizacao}>{registroSelecionado?.descricao}</Text>
                  <View style={estilos.botoesVisualizacao}>
                    <TouchableOpacity style={estilos.btnModificar} onPress={() => setEditando(true)}>
                      <Ionicons name="pencil" size={16} color="#8C77C2" />
                      <Text style={estilos.txtBtnModificar}>Modificar</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={estilos.btnExcluir} onPress={excluirRegistro}>
                      <Ionicons name="trash-outline" size={16} color="#FFF" />
                      <Text style={estilos.txtBtnExcluir}>Excluir registro</Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
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

  iconeBotao: {
    padding: 5,
  },

  tituloHeader: {
    fontSize: 22,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    fontWeight: 'bold',
  },

  itemRegistro: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 12,
    padding: 14,
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 1,
  },

  infoRegistro: {
    flex: 1,
  },

  tituloRegistro: {
    fontSize: 14,
    fontFamily: 'REM_Bold',
    color: '#333',
    fontWeight: '600',
  },

  dataRegistro: {
    fontSize: 12,
    fontFamily: 'REM_Regular',
    color: '#999',
    marginTop: 2,
  },

  textoVazio: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontFamily: 'REM_Regular',
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

  inputDescricao: {
    backgroundColor: '#FAFAFC',
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    fontFamily: 'REM_Regular',
    color: '#333',
    borderWidth: 1,
    borderColor: '#F0F0F0',
    minHeight: 150,
    textAlignVertical: 'top',
    marginBottom: 20,
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
    marginBottom: 10,
  },

  descricaoVisualizacao: {
    fontSize: 14,
    fontFamily: 'REM_Regular',
    color: '#555',
    lineHeight: 22,
    marginBottom: 20,
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