import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  FlatList, TextInput, Image, ActivityIndicator, Modal, ScrollView, Linking
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import MenuLateral from './MenuLateral';

export default function TelaGuias({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
  const [conteudos, setConteudos] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState('');
  const [categoriaAtiva, setCategoriaAtiva] = useState(null);
  const [conteudoSelecionado, setConteudoSelecionado] = useState(null);
  const [modalVisivel, setModalVisivel] = useState(false);
  const [modalFiltroVisivel, setModalFiltroVisivel] = useState(false);
  const [filtroOrdem, setFiltroOrdem] = useState('recente');

  useEffect(() => {
    carregarPerfil();
    carregarCategorias();
    carregarConteudos();
  }, []);

  const carregarPerfil = async () => {
    try {
      const { data } = await supabase.rpc('obter_perfil_usuario', { p_id_usuario: id_usuario });
      if (data) setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
    } catch (e) { console.error(e); }
  };

  const carregarCategorias = async () => {
    try {
      const { data } = await supabase
        .from('categorias')
        .select('*')
        .eq('status', 'ativo');
      setCategorias(data || []);
    } catch (e) { console.error(e); }
  };

  const carregarConteudos = async () => {
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('conteudos_informativos')
        .select('*, categorias(nome)')
        .eq('status', 'publicado')
        .order('criado_em', { ascending: false });
      if (error) throw error;
      setConteudos(data || []);
    } catch (e) { console.error(e); }
    finally { setCarregando(false); }
  };

  const abrirConteudo = async (item) => {
    setConteudoSelecionado(item);
    setModalVisivel(true);
    await supabase
      .from('conteudos_informativos')
      .update({ quantidade_visualizacoes: (item.quantidade_visualizacoes || 0) + 1 })
      .eq('id_conteudo', item.id_conteudo);
  };

  const conteudosFiltrados = conteudos
    .filter(c => {
      const termoBusca = busca.toLowerCase();
      return !busca || c.titulo?.toLowerCase().includes(termoBusca) || c.resumo?.toLowerCase().includes(termoBusca);
    })
    .filter(c => !categoriaAtiva || c.id_categoria === categoriaAtiva)
    .sort((a, b) => {
      if (filtroOrdem === 'recente') return new Date(b.criado_em) - new Date(a.criado_em);
      if (filtroOrdem === 'antigo') return new Date(a.criado_em) - new Date(b.criado_em);
      if (filtroOrdem === 'visualizacoes') return (b.quantidade_visualizacoes || 0) - (a.quantidade_visualizacoes || 0);
      if (filtroOrdem === 'az') return a.titulo?.localeCompare(b.titulo);
      return 0;
    });

  const filtrosAtivos = filtroOrdem !== 'recente' || categoriaAtiva;

  return (
    <SafeAreaView style={estilos.telaPrincipal}>
      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
          <TouchableOpacity onPress={() => setMenuVisivel(true)} style={estilos.iconeBotao}>
            <Ionicons name="menu" size={28} color="#8C77C2" />
          </TouchableOpacity>
          <Text style={estilos.tituloHeader}>Guias Informativos</Text>
          <Ionicons name="book-outline" size={22} color="#8C77C2" />
        </View>
      </View>

      <View style={estilos.barraBusca}>
        <Ionicons name="search-outline" size={18} color="#BDBDBD" />
        <TextInput
          style={estilos.inputBusca}
          placeholder="Buscar..."
          placeholderTextColor="#BDBDBD"
          value={busca}
          onChangeText={setBusca}
        />
        {busca ? (
          <TouchableOpacity onPress={() => setBusca('')}>
            <Ionicons name="close-circle" size={18} color="#BDBDBD" />
          </TouchableOpacity>
        ) : null}
      </View>

      <View style={estilos.avisoContainer}>
        <Ionicons name="information-circle-outline" size={20} color="#8C77C2" style={{ marginTop: 1 }} />
        <Text style={estilos.txtAviso}>
          Este material tem caráter informativo e não substitui o acompanhamento de profissionais especializados. Sempre que possível, busque orientação adequada para cada situação específica.
        </Text>
      </View>

      <View style={estilos.barraFiltro}>
        <TouchableOpacity
          style={[estilos.btnFiltrar, filtrosAtivos && { backgroundColor: '#8C77C2' }]}
          onPress={() => setModalFiltroVisivel(true)}
        >
          <Ionicons name="filter" size={14} color={filtrosAtivos ? '#FFF' : '#8C77C2'} />
          <Text style={[estilos.txtFiltrar, filtrosAtivos && { color: '#FFF' }]}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={conteudosFiltrados}
          keyExtractor={(item) => item.id_conteudo.toString()}
          contentContainerStyle={{ paddingBottom: 100, paddingTop: 8 }}
          ListEmptyComponent={<Text style={estilos.textoVazio}>Nenhum conteúdo encontrado.</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={estilos.cardConteudo} activeOpacity={0.7} onPress={() => abrirConteudo(item)}>
              <View style={estilos.cardCategoria}>
                <Ionicons name="scale-outline" size={14} color="#8C77C2" />
                <Text style={estilos.txtCategoria}>{item.categorias?.nome?.toUpperCase() || 'GERAL'}</Text>
              </View>
              <View style={estilos.cardConteudoInfo}>
                <View style={{ flex: 1 }}>
                  <Text style={estilos.tituloCard}>{item.titulo}</Text>
                  <Text style={estilos.resumoCard} numberOfLines={2}>{item.resumo}</Text>
                </View>
              </View>
            </TouchableOpacity>
          )}
        />
      )}

      <MenuLateral
        visivel={menuVisivel}
        aoFechar={() => setMenuVisivel(false)}
        navigation={navigation}
        id_usuario={id_usuario}
        perfil={perfil}
      />

      <Modal visible={modalVisivel} transparent animationType="fade" onRequestClose={() => setModalVisivel(false)}>
        <View style={estilos.modalCentralOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalVisivel(false)} />
          <View style={estilos.modalConteudo}>
            <View style={estilos.modalTopBar}>
              <TouchableOpacity onPress={() => setModalVisivel(false)}>
                <Ionicons name="arrow-back" size={24} color="#8C77C2" />
              </TouchableOpacity>
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
              <Text style={estilos.tituloModal}>{conteudoSelecionado?.titulo}</Text>
              <Text style={estilos.avisoModal}>
                Este material tem caráter informativo e não substitui o acompanhamento de profissionais especializados. Sempre que possível, busque orientação adequada para cada situação específica.
              </Text>
              {conteudoSelecionado?.imagem && (
                <Image
                  source={{ uri: conteudoSelecionado.imagem.startsWith('http') ? conteudoSelecionado.imagem : `data:image/jpeg;base64,${conteudoSelecionado.imagem}` }}
                  style={estilos.imagemModal}
                  resizeMode="cover"
                />
              )}
              <Text style={estilos.textoModal}>{conteudoSelecionado?.texto}</Text>
              {conteudoSelecionado?.link_util && (
                <TouchableOpacity style={estilos.btnLink} onPress={() => Linking.openURL(conteudoSelecionado.link_util)}>
                  <Ionicons name="link-outline" size={18} color="#8C77C2" />
                  <Text style={estilos.txtLink}>Acessar link útil</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={modalFiltroVisivel} transparent animationType="fade" onRequestClose={() => setModalFiltroVisivel(false)}>
        <View style={estilos.modalCentralOverlay}>
          <TouchableOpacity style={StyleSheet.absoluteFill} onPress={() => setModalFiltroVisivel(false)} />
          <View style={estilos.modalCentral}>
            <View style={estilos.filtroHeader}>
              <Ionicons name="filter" size={20} color="#8C77C2" />
              <Text style={estilos.filtroTitulo}>Filtrar Guias</Text>
              <TouchableOpacity onPress={() => setModalFiltroVisivel(false)}>
                <Ionicons name="close" size={22} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 8 }}>
              <Text style={estilos.tituloFiltro}>Ordenar por:</Text>
              <View style={estilos.grupoFiltro}>
                {[
                  { key: 'recente', label: 'Mais recente' },
                  { key: 'antigo', label: 'Mais antigo' },
                  { key: 'az', label: 'A → Z' },
                  { key: 'visualizacoes', label: 'Mais vistos' },
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

              <Text style={estilos.tituloFiltro}>Categoria:</Text>
              <View style={estilos.grupoFiltro}>
                <TouchableOpacity
                  style={[estilos.opcaoFiltro, !categoriaAtiva && estilos.opcaoFiltroAtiva]}
                  onPress={() => setCategoriaAtiva(null)}
                >
                  <Text style={[estilos.txtOpcaoFiltro, !categoriaAtiva && estilos.txtOpcaoFiltroAtiva]}>Todas</Text>
                </TouchableOpacity>
                {categorias.map(cat => (
                  <TouchableOpacity
                    key={cat.id_categoria}
                    style={[estilos.opcaoFiltro, categoriaAtiva === cat.id_categoria && estilos.opcaoFiltroAtiva]}
                    onPress={() => setCategoriaAtiva(cat.id_categoria)}
                  >
                    <Text style={[estilos.txtOpcaoFiltro, categoriaAtiva === cat.id_categoria && estilos.txtOpcaoFiltroAtiva]}>
                      {cat.nome}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <View style={estilos.botoesRodapeFiltro}>
              <TouchableOpacity
                style={estilos.btnLimpar}
                onPress={() => { setFiltroOrdem('recente'); setCategoriaAtiva(null); }}
              >
                <Text style={estilos.txtBtnLimpar}>Limpar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.btnAplicar} onPress={() => setModalFiltroVisivel(false)}>
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
  telaPrincipal: { flex: 1, backgroundColor: '#FAFAFC' },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justify: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 10,
  },
  headerEsquerda: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  tituloHeader: {
    fontSize: 22,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    fontWeight: 'bold',
  },
  iconeBotao: { padding: 5 },
  barraBusca: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    gap: 8,
    marginBottom: 14,
    elevation: 1,
  },
  inputBusca: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'REM_Regular',
    color: '#333',
    paddingVertical: 10,
  },
  avisoContainer: {
    backgroundColor: '#F3EEFF',
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  txtAviso: {
    flex: 1,
    fontSize: 13,
    fontFamily: 'REM_Regular',
    color: '#6A5ACD',
    lineHeight: 20,
  },
  barraFiltro: { paddingHorizontal: 20, marginBottom: 10 },
  btnFiltrar: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#EDE0FF',
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 20,
    gap: 6,
  },
  txtFiltrar: { fontSize: 13, color: '#8C77C2', fontFamily: 'REM_Medium' },
  cardConteudo: {
    backgroundColor: '#FFF',
    marginHorizontal: 20,
    marginBottom: 12,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 2,
    shadowColor: '#8C77C2',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
  },
  cardCategoria: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 8,
  },
  txtCategoria: {
    fontSize: 11,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    letterSpacing: 0.8,
  },
  cardConteudoInfo: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
  },
  tituloCard: {
    fontSize: 15,
    fontFamily: 'REM_Bold',
    color: '#333',
    fontWeight: '700',
    marginBottom: 5,
  },
  resumoCard: {
    fontSize: 13,
    fontFamily: 'REM_Regular',
    color: '#888',
    lineHeight: 19,
  },
  textoVazio: {
    textAlign: 'center',
    color: '#999',
    marginTop: 60,
    fontFamily: 'REM_Regular',
    fontSize: 14,
  },
  modalCentralOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalConteudo: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    width: '100%',
    maxHeight: '90%',
    padding: 20,
  },
  modalTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  tituloModal: {
    fontSize: 22,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    fontWeight: 'bold',
    marginBottom: 12,
  },
  avisoModal: {
    fontSize: 13,
    fontFamily: 'REM_Regular',
    color: '#999',
    lineHeight: 20,
    marginBottom: 16,
    fontStyle: 'italic',
  },
  imagemModal: {
    width: '100%',
    height: 200,
    borderRadius: 16,
    marginBottom: 16,
  },
  textoModal: {
    fontSize: 15,
    fontFamily: 'REM_Regular',
    color: '#444',
    lineHeight: 24,
  },
  btnLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 16,
    padding: 14,
    backgroundColor: '#F3EEFF',
    borderRadius: 12,
  },
  txtLink: { fontSize: 14, fontFamily: 'REM_Medium', color: '#8C77C2' },
  modalCentral: {
    backgroundColor: '#FFF',
    borderRadius: 24,
    padding: 20,
    width: '100%',
    maxHeight: '80%',
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
    fontSize: 13,
    fontFamily: 'REM_Bold',
    color: '#333',
    fontWeight: '700',
    marginBottom: 10,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
  botoesRodapeFiltro: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  btnLimpar: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
  },
  txtBtnLimpar: { fontSize: 15, fontFamily: 'REM_Bold', color: '#555' },
  btnAplicar: {
    flex: 1.5,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: '#8C77C2',
    alignItems: 'center',
  },
  txtBtnAplicar: { fontSize: 15, fontFamily: 'REM_Bold', color: '#FFF' },
});