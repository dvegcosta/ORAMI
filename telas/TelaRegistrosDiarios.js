import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView,
  TouchableOpacity, FlatList, Modal, TextInput, ActivityIndicator, ScrollView
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
  const [pastaSelecionadaNovo, setPastaSelecionadaNovo] = useState(null);
  const [modalOpcoesPastaVisivel, setModalOpcoesPastaVisivel] = useState(false);
  const [pastaOpcoes, setPastaOpcoes] = useState(null);
  const [editandoNomePasta, setEditandoNomePasta] = useState(false);
  const [novoNomePasta, setNovoNomePasta] = useState('');
  const [modalFiltroVisivel, setModalFiltroVisivel] = useState(false);
  const [filtroOrdem, setFiltroOrdem] = useState('recente');
  const [filtroPeriodo, setFiltroPeriodo] = useState('todos');
  const [filtroPasta, setFiltroPasta] = useState('todas');
  const [filtroTexto, setFiltroTexto] = useState('');


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
        .is('id_pasta', null)
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
          id_pasta: pastaSelecionadaNovo || null,
        });
      if (error) throw error;
      setModalNovoVisivel(false);
      setNovoTema('');
      setNovaDescricao('');
      setPastaSelecionadaNovo(null);
      carregarDados();
    } catch (e) { console.error(e); }
    finally { setSalvando(false); }
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

  const abrirOpcoesPasta = (pasta) => {
    setPastaOpcoes(pasta);
    setNovoNomePasta(pasta.nome);
    setEditandoNomePasta(false);
    setModalOpcoesPastaVisivel(true);
  };

  const renomearPasta = async () => {
    if (!novoNomePasta.trim()) return;
    try {
      const { error } = await supabase
        .from('pastas_registros')
        .update({ nome: novoNomePasta.trim() })
        .eq('id_pasta', pastaOpcoes.id_pasta);
      if (error) throw error;
      setModalOpcoesPastaVisivel(false);
      setEditandoNomePasta(false);
      await carregarDados();
    } catch (e) { console.error(e); }
  };

  const excluirPasta = async () => {
    try {
      const { error } = await supabase
        .from('pastas_registros')
        .update({ status: 'inativo' })
        .eq('id_pasta', pastaOpcoes.id_pasta);
      if (error) throw error;
      setModalOpcoesPastaVisivel(false);
      carregarDados();
    } catch (e) { console.error(e); }
  };

  const registrosFiltrados = registros
  .filter(r => {
    if (!filtroTexto.trim()) return true;
    return r.tema?.toLowerCase().includes(filtroTexto.toLowerCase()) ||
           r.descricao?.toLowerCase().includes(filtroTexto.toLowerCase());
  })
  .filter(r => {
    const data = new Date(r.criado_em);
    const agora = new Date();
    if (filtroPeriodo === 'hoje') {
      return data.toDateString() === agora.toDateString();
    }
    if (filtroPeriodo === 'semana') {
      const seteDias = new Date();
      seteDias.setDate(agora.getDate() - 7);
      return data >= seteDias;
    }
    if (filtroPeriodo === 'mes') {
      const trintaDias = new Date();
      trintaDias.setDate(agora.getDate() - 30);
      return data >= trintaDias;
    }
    return true;
  })
  .sort((a, b) => {
    if (filtroOrdem === 'recente') return new Date(b.criado_em) - new Date(a.criado_em);
    if (filtroOrdem === 'antigo') return new Date(a.criado_em) - new Date(b.criado_em);
    if (filtroOrdem === 'az') return (a.tema || '').localeCompare(b.tema || '');
    if (filtroOrdem === 'za') return (b.tema || '').localeCompare(a.tema || '');
    return 0;
  });

const filtrosAtivos = filtroOrdem !== 'recente' || filtroPeriodo !== 'todos' || filtroTexto.trim();

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
  data={pastaSelecionada 
    ? registrosFiltrados.filter(r => r.id_pasta === pastaSelecionada.id_pasta)
    : registrosFiltrados
  }
        keyExtractor={(item) => item.id_registro_diario.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <>
            <View style={estilos.barraAcoes}>
            <TouchableOpacity
  style={[estilos.btnFiltrar, filtrosAtivos && { backgroundColor: '#8C77C2' }]}
  onPress={() => setModalFiltroVisivel(!modalFiltroVisivel)}
>
  <Ionicons name="filter" size={14} color={filtrosAtivos ? '#FFF' : '#8C77C2'} />
  <Text style={[estilos.txtFiltrar, filtrosAtivos && { color: '#FFF' }]}>Filtrar</Text>
</TouchableOpacity>

              <View style={estilos.iconesDireita}>
                <TouchableOpacity style={estilos.iconeBotao} onPress={() => setModalPastaVisivel(true)}>
                  <Ionicons name="folder-outline" size={22} color="#8C77C2" />
                </TouchableOpacity>

                <TouchableOpacity style={estilos.iconeBotao} onPress={() => setModalNovoVisivel(true)}>
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
                    onPress={() => navigation.navigate('TelaContPasta', { pasta, id_usuario })}
                  >
                    <Ionicons name="folder" size={20} color="#8C77C2" />
                    <Text style={estilos.txtPasta}>{pasta.nome}</Text>
                    <TouchableOpacity onPress={() => abrirOpcoesPasta(pasta)}>
                      <Ionicons name="ellipsis-vertical" size={18} color="#BDBDBD" />
                    </TouchableOpacity>
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

            {pastas.length > 0 && (
              <View style={estilos.secaoPastaModal}>
                <Text style={estilos.labelPastaModal}>Pasta (opcional)</Text>
                <View style={estilos.containerChips}>
                  {pastas.map(p => (
                    <TouchableOpacity
                      key={p.id_pasta}
                      style={[
                        estilos.chipPastaModal,
                        pastaSelecionadaNovo === p.id_pasta && estilos.chipPastaModalSelecionado
                      ]}
                      onPress={() => setPastaSelecionadaNovo(prev => prev === p.id_pasta ? null : p.id_pasta)}
                    >
                      <Ionicons 
                        name="folder" 
                        size={14} 
                        color={pastaSelecionadaNovo === p.id_pasta ? '#FFF' : '#8C77C2'} 
                      />
                      <Text style={[
                        estilos.textoChipModal,
                        pastaSelecionadaNovo === p.id_pasta && estilos.textoChipModalSelecionado
                      ]}>
                        {p.nome}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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

      <Modal visible={modalOpcoesPastaVisivel} transparent animationType="fade" onRequestClose={() => setModalOpcoesPastaVisivel(false)}>
        <View style={estilos.modalCentralOverlay}>
          <View style={estilos.modalCentral}>
            <View style={estilos.modalHeader}>
              <Ionicons name="folder" size={18} color="#8C77C2" />
              <Text style={estilos.modalTitulo}>{pastaOpcoes?.nome}</Text>
              <TouchableOpacity onPress={() => setModalOpcoesPastaVisivel(false)}>
                <Ionicons name="close" size={22} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            {editandoNomePasta ? (
              <>
                <TextInput
                  style={estilos.inputTema}
                  value={novoNomePasta}
                  onChangeText={setNovoNomePasta}
                  placeholder="Novo nome"
                  placeholderTextColor="#BDBDBD"
                />
                <TouchableOpacity style={estilos.btnSalvar} onPress={renomearPasta}>
                  <Text style={estilos.txtBtnSalvar}>Salvar nome</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TouchableOpacity style={estilos.btnOpcaoPasta} onPress={() => setEditandoNomePasta(true)}>
                  <Ionicons name="pencil" size={18} color="#8C77C2" />
                  <Text style={estilos.txtOpcaoPasta}>Renomear pasta</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[estilos.btnOpcaoPasta, { borderTopWidth: 1, borderTopColor: '#F0F0F0' }]} onPress={excluirPasta}>
                  <Ionicons name="trash-outline" size={18} color="#FF6B6B" />
                  <Text style={[estilos.txtOpcaoPasta, { color: '#FF6B6B' }]}>Excluir pasta</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>

<Modal visible={modalFiltroVisivel} transparent animationType="fade" onRequestClose={() => setModalFiltroVisivel(false)}>
  <View style={estilos.modalCentralOverlay}>
    <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalFiltroVisivel(false)} />
    <View style={estilos.modalCentral}>

      <View style={estilos.filtroHeader}>
        <Ionicons name="filter" size={20} color="#8C77C2" />
        <Text style={estilos.filtroTitulo}>Filtrar Registros</Text>
        <TouchableOpacity onPress={() => setModalFiltroVisivel(false)}>
          <Ionicons name="close" size={22} color="#BDBDBD" />
        </TouchableOpacity>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
        <Text style={estilos.tituloFiltro}>Período:</Text>
        <View style={estilos.grupoFiltro}>
          {[
            { key: 'todos', label: 'Todos' },
            { key: 'hoje', label: 'Hoje' },
            { key: 'semana', label: 'Últimos 7 dias' },
            { key: 'mes', label: 'Últimos 30 dias' },
          ].map(op => (
            <TouchableOpacity
              key={op.key}
              style={[estilos.opcaoFiltro, filtroPeriodo === op.key && estilos.opcaoFiltroAtiva]}
              onPress={() => setFiltroPeriodo(op.key)}
            >
              <Text style={[estilos.txtOpcaoFiltro, filtroPeriodo === op.key && estilos.txtOpcaoFiltroAtiva]}>
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={estilos.tituloFiltro}>Ordenar por:</Text>
        <View style={estilos.grupoFiltro}>
          {[
            { key: 'recente', label: 'Mais recente' },
            { key: 'antigo', label: 'Mais antigo' },
            { key: 'az', label: 'A → Z' },
            { key: 'za', label: 'Z → A' },
          ].map(op => (
            <TouchableOpacity
              key={op.key}
              style={[estilos.opcaoFiltro, filtroOrdem === op.key && estilos.opcaoFiltroAtiva]}
              onPress={() => setFiltroOrdem(op.key)}
            >
              <Text style={[estilos.txtOpcaoFiltro, filtroOrdem === op.key && estilos.txtOpcaoFiltroAtiva]}>
                {op.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={estilos.tituloFiltro}>Buscar por tema:</Text>
        <View style={estilos.inputBusca}>
          <Ionicons name="search-outline" size={16} color="#BDBDBD" />
          <TextInput
            style={estilos.inputBuscaTexto}
            placeholder="Ex: família, trabalho..."
            placeholderTextColor="#BDBDBD"
            value={filtroTexto}
            onChangeText={setFiltroTexto}
          />
          {filtroTexto ? (
            <TouchableOpacity onPress={() => setFiltroTexto('')}>
              <Ionicons name="close-circle" size={16} color="#BDBDBD" />
            </TouchableOpacity>
          ) : null}
        </View>
      </ScrollView>

      <View style={estilos.botoesRodapeFiltro}>
        <TouchableOpacity
          style={estilos.btnLimpar}
          onPress={() => {
            setFiltroOrdem('recente');
            setFiltroPeriodo('todos');
            setFiltroTexto('');
          }}
        >
          <Text style={estilos.txtBtnLimpar}>Limpar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={estilos.btnAplicar}
          onPress={() => setModalFiltroVisivel(false)}
        >
          <Text style={estilos.txtBtnAplicar}>Aplicar</Text>
        </TouchableOpacity>
      </View>

    </View>
  </View>
</Modal>

    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  telaPrincipal: { 
    flex: 1, 
    backgroundColor: '#FAFAFC' 
  },
  textoVazio: { 
    textAlign: 'center', 
    color: '#999', 
    marginTop: 40, 
    fontFamily: 'REM_Regular' 
  },
  headerContainer: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingTop: 55, 
    paddingBottom: 10 
  },
  headerEsquerda: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  tituloHeader: { 
    fontSize: 22, 
    fontFamily: 'REM_Bold', 
    color: '#8C77C2', 
    fontWeight: 'bold' 
  },
  iconeBotao: { 
    padding: 5 
  },
  barraAcoes: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    paddingHorizontal: 20, 
    paddingVertical: 20 
  },
  btnFiltrar: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#EDE0FF', 
    paddingHorizontal: 14, 
    paddingVertical: 7, 
    borderRadius: 20, 
    gap: 6 
  },
  txtFiltrar: { 
    fontSize: 13, 
    color: '#8C77C2', 
    fontFamily: 'REM_Medium' 
  },
  iconesDireita: { 
    flexDirection: 'row', 
    gap: 12 
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
    elevation: 1 
  },
  infoRegistro: { 
    flex: 1 
  },
  tituloRegistro: { 
    fontSize: 14, 
    fontFamily: 'REM_Bold', 
    color: '#333', 
    fontWeight: '600' 
  },
  dataRegistro: { 
    fontSize: 12, 
    fontFamily: 'REM_Regular', 
    color: '#999', 
    marginTop: 2 
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
    marginBottom: 10 
  },
  txtPasta: { 
    flex: 1, 
    fontSize: 14, 
    fontFamily: 'REM_Medium', 
    color: '#333' 
  },
  modalOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'flex-end' 
  },
  modalContainer: { 
    backgroundColor: '#FFF', 
    borderTopLeftRadius: 30, 
    borderTopRightRadius: 30, 
    padding: 24, 
    minHeight: '60%' 
  },
  modalCentralOverlay: {
  flex: 1,
  backgroundColor: 'rgba(0,0,0,0.5)',
  justifyContent: 'center',
  alignItems: 'center',
  paddingHorizontal: 16,
},
modalCentral: {
  backgroundColor: '#FFF',
  borderRadius: 20,
  padding: 20,
  width: '100%',
  maxHeight: '80%',
},
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 20, 
    gap: 8 
  },
  modalTitulo: { 
    flex: 1, 
    fontSize: 16, 
    fontFamily: 'REM_Bold', 
    color: '#8C77C2', 
    marginLeft: 8 
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
    marginBottom: 12 
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
    marginBottom: 20 
  },
  secaoPastaModal: { 
    marginBottom: 16 
  },
  labelPastaModal: { 
    fontSize: 13, 
    color: '#999', 
    fontFamily: 'REM_Medium', 
    marginBottom: 8 
  },
  containerChips: { 
    flexDirection: 'row', 
    flexWrap: 'wrap', 
    gap: 8 
  },
  chipPastaModal: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#EDE0FF', 
    paddingHorizontal: 12, 
    paddingVertical: 6, 
    borderRadius: 20 
  },
  chipPastaModalSelecionado: { 
    backgroundColor: '#8C77C2' 
  },
  textoChipModal: { 
    fontSize: 13, 
    fontFamily: 'REM_Medium', 
    color: '#8C77C2' 
  },
  textoChipModalSelecionado: { 
    color: '#FFF' 
  },
  btnOpcaoPasta: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingVertical: 16 
  },
  txtOpcaoPasta: { 
    fontSize: 15, 
    fontFamily: 'REM_Medium', 
    color: '#333' 
  },
  btnSalvar: { 
    backgroundColor: '#8C77C2', 
    borderRadius: 12, 
    padding: 14, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'center', 
    gap: 8 
  },
  txtBtnSalvar: { 
    color: '#FFF', 
    fontFamily: 'REM_Bold', 
    fontSize: 15 
  },
  temaVisualizacao: { 
    fontSize: 16, 
    fontFamily: 'REM_Bold', 
    color: '#333', 
    marginBottom: 10 
  },
  descricaoVisualizacao: { 
    fontSize: 14, 
    fontFamily: 'REM_Regular', 
    color: '#555', 
    lineHeight: 22, 
    marginBottom: 20 
  },
  botoesVisualizacao: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    gap: 10 
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
    justifyContent: 'center' 
  },
  txtBtnModificar: { 
    color: '#8C77C2', 
    fontFamily: 'REM_Bold', 
    fontSize: 14 
  },
  btnExcluir: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 6, 
    backgroundColor: '#8C77C2', 
    borderRadius: 12, 
    padding: 12, 
    flex: 1.5, 
    justifyContent: 'center' 
  },
  txtBtnExcluir: { 
    color: '#FFF', 
    fontFamily: 'REM_Bold', 
    fontSize: 14 
  },

  inputRow: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FAFAFC',
  borderRadius: 12,
  paddingHorizontal: 12,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: '#F0F0F0',
  marginBottom: 16,
  gap: 8,
},
inputInline: {
  flex: 1,
  fontSize: 14,
  fontFamily: 'REM_Regular',
  color: '#333',
  paddingVertical: 10,
},

filtroHeader: {
  flexDirection: 'row',
  alignItems: 'center',
  gap: 10,
  marginBottom: 20,
},
filtroTitulo: {
  flex: 1,
  fontSize: 18,
  fontFamily: 'REM_Bold',
  color: '#8C77C2',
  fontWeight: 'bold',
},
tituloFiltro: {
  fontSize: 14,
  fontFamily: 'REM_Bold',
  color: '#333',
  fontWeight: '700',
  marginBottom: 10,
},
grupoFiltro: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  gap: 8,
  marginBottom: 16,
},
opcaoFiltro: {
  paddingHorizontal: 16,
  paddingVertical: 10,
  borderRadius: 20,
  borderWidth: 1,
  borderColor: '#E0E0E0',
  backgroundColor: '#FAFAFC',
},
opcaoFiltroAtiva: {
  backgroundColor: '#8C77C2',
  borderColor: '#8C77C2',
},
txtOpcaoFiltro: {
  fontSize: 13,
  fontFamily: 'REM_Medium',
  color: '#555',
},
txtOpcaoFiltroAtiva: {
  color: '#FFF',
  fontFamily: 'REM_Bold',
},
inputBusca: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: '#FAFAFC',
  borderRadius: 12,
  paddingHorizontal: 14,
  paddingVertical: 4,
  borderWidth: 1,
  borderColor: '#F0F0F0',
  marginBottom: 20,
  gap: 8,
},
inputBuscaTexto: {
  flex: 1,
  fontSize: 14,
  fontFamily: 'REM_Regular',
  color: '#333',
  paddingVertical: 10,
},
botoesRodapeFiltro: {
  flexDirection: 'row',
  gap: 12,
},
btnLimpar: {
  flex: 1,
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: '#F0F0F0',
  alignItems: 'center',
},
txtBtnLimpar: {
  fontSize: 15,
  fontFamily: 'REM_Bold',
  color: '#555',
},
btnAplicar: {
  flex: 1.5,
  paddingVertical: 14,
  borderRadius: 12,
  backgroundColor: '#8C77C2',
  alignItems: 'center',
},
txtBtnAplicar: {
  fontSize: 15,
  fontFamily: 'REM_Bold',
  color: '#FFF',
},

});