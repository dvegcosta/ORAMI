import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import MenuLateral from './MenuLateral';

export default function TelaRegistrosDiarios({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};
  const [menuVisivel, setMenuVisivel] = useState(false);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
  const [registros, setRegistros] = useState([]);
  const [pastas, setPastas] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [modalNovoVisivel, setModalNovoVisivel] = useState(false);
  const [novoTema, setNovoTema] = useState('');
  const [novaDescricao, setNovaDescricao] = useState('');
  const [salvando, setSalvando] = useState(false);
  const [registroSelecionado, setRegistroSelecionado] = useState(null);
  const [modalVisualizarVisivel, setModalVisualizarVisivel] = useState(false);
  const [modalPastaVisivel, setModalPastaVisivel] = useState(false);
  const [nomePasta, setNomePasta] = useState('');
  const [criandoPasta, setCriandoPasta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [temaEditado, setTemaEditado] = useState('');
  const [descricaoEditada, setDescricaoEditada] = useState('');
  const [pastaSelecionada, setPastaSelecionada] = useState(null);

  useEffect(() => {
    carregarPerfil();
    carregarDados();
  }, []);

  const carregarPerfil = async () => {
    try {
      const { data, error } = await supabase.rpc('obter_perfil_usuario', { p_id_usuario: id_usuario });
      if (data && !error) setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
    } catch (e) { console.error(e); }
  };

  const carregarDados = async () => {
  setCarregando(true);
  try {
    const { data: dataRegistros, error: errRegistros } = await supabase
      .from('registros_diarios')
      .select('*')
      .eq('id_usuario', id_usuario)
      .order('criado_em', { ascending: false });

    if (errRegistros) throw errRegistros;
    setRegistros(dataRegistros || []);

    const { data: dataPastas, error: errPastas } = await supabase
      .from('pastas_registros')
      .select('*')
      .eq('id_usuario', id_usuario)
      .eq('tipo_pasta', 'registro_diario')
      .eq('status', 'ativo');

    if (errPastas) throw errPastas;
    setPastas(dataPastas || []);
  } catch (e) {
    console.error(e);
  } finally {
    setCarregando(false);
  }
};

  const salvarRegistro = async () => {
  if (!novaDescricao.trim()) return;
  setSalvando(true);
  try {
    const { error } = await supabase
      .from('registros_diarios')
      .insert({
        id_usuario: id_usuario,
        tema: novoTema.trim() || 'Registro diário',
        descricao: novaDescricao.trim(),
      });
    if (error) throw error;
    setModalNovoVisivel(false);
    setNovoTema('');
    setNovaDescricao('');
    carregarDados();
  } catch (e) {
    console.error(e);
  } finally {
    setSalvando(false);
  }
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
    await carregarDados();
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
    await carregarDados();
  } catch (e) { console.error(e); }
};

const criarPasta = async () => {
  if (!nomePasta.trim()) return;
  setCriandoPasta(true);
  try {
    const { error } = await supabase
      .from('pastas_registros')
      .insert({ 
        id_usuario: id_usuario,
        nome: nomePasta.trim(),
        tipo_pasta: 'registro_diario',
        status: 'ativo'
      });
    if (error) throw error;
    setNomePasta('');
    setModalPastaVisivel(false);
    carregarDados();
  } catch (e) { console.error(e); }
  finally { setCriandoPasta(false); }
};

  return (
    
    
    <SafeAreaView style={estilos.telaPrincipal}>

      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.iconeBotao}>
            <Ionicons name="arrow-back" size={24} color="#8C77C2" />
          </TouchableOpacity>
          <Ionicons name="calendar-outline" size={22} color="#8C77C2" style={{ marginRight: 6 }} />
          <Text style={estilos.tituloHeader}>Registros diários</Text>
        </View>
      </View>

      <FlatList
        data={registros}
        keyExtractor={(item) => item.id_registro_diario.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
       
      ListHeaderComponent={
  <>
    <View style={estilos.barraAcoes}>
      <TouchableOpacity style={estilos.btnFiltrar}>
        <Ionicons name="filter" size={14} color="#8C77C2" />
        <Text style={estilos.txtFiltrar}>Filtrar</Text>
      </TouchableOpacity>

      <View style={estilos.iconesDireita}>
        <TouchableOpacity
          style={estilos.iconeBotao}
          onPress={() => setModalPastaVisivel(true)}
        >
          <Ionicons name="folder-outline" size={22} color="#8C77C2" />
        </TouchableOpacity>

        <TouchableOpacity
          style={estilos.iconeBotao}
          onPress={() => setModalNovoVisivel(true)}
        >
          <Ionicons name="add" size={24} color="#8C77C2" />
        </TouchableOpacity>
      </View>
    </View>

    {pastas.length > 0 && (
      <View style={{ paddingHorizontal: 20, marginBottom: 10 }}>
        {pastas.map((pasta) => (
          <TouchableOpacity
            key={pasta.id_pasta}
            style={estilos.itemPasta}
          >
            <Ionicons name="folder" size={20} color="#8C77C2" />

            <Text style={estilos.txtPasta}>
              {pasta.nome}
            </Text>

            <Ionicons
              name="ellipsis-vertical"
              size={18}
              color="#BDBDBD"
            />
          </TouchableOpacity>
        ))}
      </View>
    )}
  </>
}

        renderItem={({ item }) => (
  <TouchableOpacity style={estilos.itemRegistro} activeOpacity={0.7} onPress={() => abrirRegistro(item)}>
            <Ionicons name="calendar-outline" size={20} color="#8C77C2" />
            <View style={estilos.infoRegistro}>
              <Text style={estilos.tituloRegistro}>{item.tema || 'Registro diário'}</Text>
              <Text style={estilos.dataRegistro}>
                {new Date(item.criado_em).toLocaleDateString('pt-BR')} · {new Date(item.criado_em).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
              </Text>
            </View>
            <TouchableOpacity>
              <Ionicons name="ellipsis-vertical" size={18} color="#BDBDBD" />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={estilos.textoVazio}>Nenhum registro encontrado.</Text>
        }
      />

      <MenuLateral
        visivel={menuVisivel}
        aoFechar={() => setMenuVisivel(false)}
        navigation={navigation}
        id_usuario={id_usuario}
        perfil={perfil}
      />


<Modal visible={modalNovoVisivel} transparent animationType="slide" onRequestClose={() => setModalNovoVisivel(false)}>
  <View style={estilos.modalOverlay}>
    <View style={estilos.modalContainer}>

      <View style={estilos.modalHeader}>
        <Ionicons name="calendar-outline" size={20} color="#8C77C2" />
        <Text style={estilos.modalTitulo}>Registro diário</Text>
        <TouchableOpacity onPress={() => setModalNovoVisivel(false)}>
          <Ionicons name="close" size={24} color="#BDBDBD" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={estilos.inputTema}
        placeholder="Tema (opcional)"
        placeholderTextColor="#BDBDBD"
        value={novoTema}
        onChangeText={setNovoTema}
      />

      <TextInput
        style={estilos.inputDescricao}
        placeholder="Descrição..."
        placeholderTextColor="#BDBDBD"
        value={novaDescricao}
        onChangeText={setNovaDescricao}
        multiline
      />

      <TouchableOpacity style={estilos.btnSalvar} onPress={salvarRegistro} disabled={salvando}>
        {salvando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <>
            <Ionicons name="checkmark" size={18} color="#FFF" />
            <Text style={estilos.txtBtnSalvar}>Salvar registro</Text>
          </>
        )}
      </TouchableOpacity>

    </View>
  </View>
</Modal>

<Modal visible={modalVisualizarVisivel} transparent animationType="fade" onRequestClose={() => setModalVisualizarVisivel(false)}>
  <View style={estilos.modalCentralOverlay}>
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
          <TextInput
            style={estilos.inputTema}
            placeholder="Tema"
            placeholderTextColor="#BDBDBD"
            value={temaEditado}
            onChangeText={setTemaEditado}
          />
          <TextInput
            style={estilos.inputDescricao}
            placeholder="Descrição..."
            placeholderTextColor="#BDBDBD"
            value={descricaoEditada}
            onChangeText={setDescricaoEditada}
            multiline
          />
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
  </View>
</Modal>

<Modal visible={modalPastaVisivel} transparent animationType="fade" onRequestClose={() => setModalPastaVisivel(false)}>
  <View style={estilos.modalCentralOverlay}>
    <View style={estilos.modalCentral}>

      <View style={estilos.modalHeader}>
        <Ionicons name="folder-outline" size={18} color="#8C77C2" />
        <Text style={estilos.modalTitulo}>Nova Pasta</Text>
        <TouchableOpacity onPress={() => setModalPastaVisivel(false)}>
          <Ionicons name="close" size={22} color="#BDBDBD" />
        </TouchableOpacity>
      </View>

      <TextInput
        style={estilos.inputTema}
        placeholder="Nome da pasta"
        placeholderTextColor="#BDBDBD"
        value={nomePasta}
        onChangeText={setNomePasta}
      />

      <TouchableOpacity style={estilos.btnSalvar} onPress={criarPasta} disabled={criandoPasta}>
        {criandoPasta ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.txtBtnSalvar}>Criar pasta</Text>}
      </TouchableOpacity>

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
  },
  iconeBotao: {
    padding: 5,
  },
  barraAcoes: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  btnFiltrar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EDE0FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  txtFiltrar: {
    fontSize: 13,
    color: '#8C77C2',
    fontFamily: 'REM_Medium',
  },
  iconesDireita: {
    flexDirection: 'row',
    gap: 12,
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
    minHeight: '60%',
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

  itemPasta: {
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
txtPasta: {
  flex: 1,
  fontSize: 14,
  fontFamily: 'REM_Medium',
  color: '#333',
},

});