import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity,
  FlatList, Image, ActivityIndicator, ScrollView, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import MenuLateral from './MenuLateral';

const { width } = Dimensions.get('window');
const CARD_SIZE = (width - 60) / 3;

const buscarPictograma = async (palavra) => {
  try {
    const res = await fetch(`https://api.arasaac.org/v1/pictograms/pt/search/${encodeURIComponent(palavra)}`);
    const data = await res.json();
    if (data && data.length > 0) {
      const id = data[0]._id;
      return `https://static.arasaac.org/pictograms/${id}/${id}_300.png`;
    }
    return null;
  } catch (e) {
    return null;
  }
};

export default function TelaComunicacao({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
  const [categorias, setCategorias] = useState([]);
  const [categoriaSelecionada, setCategoriaSelecionada] = useState(null);
  const [itens, setItens] = useState([]);
  const [frase, setFrase] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [urlsPictogramas, setUrlsPictogramas] = useState({});

  useEffect(() => {
    carregarPerfil();
    carregarCategorias();
  }, []);

  const carregarPerfil = async () => {
    try {
      const { data, error } = await supabase.rpc('obter_perfil_usuario', { p_id_usuario: id_usuario });
      if (data && !error) setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
    } catch (e) { console.error(e); }
  };

  const carregarCategorias = async () => {
    try {
      const { data, error } = await supabase
        .from('comunicacao_categorias')
        .select('*');
      if (error) throw error;
      const cats = data || [];
      setCategorias(cats);
      setCarregando(false);

      cats.forEach((cat) => {
        buscarPictograma(cat.nome).then((url) => {
          if (url) {
            setUrlsPictogramas(prev => ({ ...prev, [cat.id_categoria_comunicacao]: url }));
          }
        });
      });
    } catch (e) { 
      console.error(e);
      setCarregando(false);
    }
  };

  const carregarItens = async (id_categoria) => {
    try {
      const { data, error } = await supabase
        .from('comunicacao_itens')
        .select('*')
        .eq('id_categoria_comunicacao', id_categoria);
      if (error) throw error;
      const lista = data || [];
      setItens(lista);

      lista.forEach((item) => {
        if (!urlsPictogramas[item.id_item_comunicacao]) {
          buscarPictograma(item.palavra).then((url) => {
            if (url) {
              setUrlsPictogramas(prev => ({ ...prev, [item.id_item_comunicacao]: url }));
            }
          });
        }
      });
    } catch (e) { console.error(e); }
  };

  const selecionarCategoria = (categoria) => {
    setCategoriaSelecionada(categoria);
    carregarItens(categoria.id_categoria_comunicacao);
  };

  const deselecionar = () => {
    setCategoriaSelecionada(null);
    setItens([]);
  };

  const adicionarNaFrase = (item) => {
    setFrase(prev => [...prev, { ...item, url: urlsPictogramas[item.id_item_comunicacao] }]);
  };

  const removerDaFrase = (index) => {
    setFrase(prev => prev.filter((_, i) => i !== index)); 
  };

  const falarFrase = () => {
    if (frase.length === 0) return;
    const texto = frase.map(i => i.palavra).join(' ');
    Speech.speak(texto, { language: 'pt-BR', rate: 0.9 });
  };

  const limparFrase = () => {
    setFrase([]);
    Speech.stop();
  };

  const renderCategoria = ({ item }) => {
    const url = urlsPictogramas[item.id_categoria_comunicacao];
    return (
      <TouchableOpacity
        style={estilos.cardItem}
        activeOpacity={0.7}
        onPress={() => selecionarCategoria(item)}
      >
        {url ? (
          <Image source={{ uri: url }} style={estilos.imagemItem} resizeMode="contain" />
        ) : (
          <View style={estilos.placeholderItem}>
            <Ionicons name="grid-outline" size={36} color="#8C77C2" />
          </View>
        )}
        <Text style={estilos.txtItem} numberOfLines={2}>{item.nome}</Text>
      </TouchableOpacity>
    );
  };

  const renderItem = ({ item }) => {
    const url = urlsPictogramas[item.id_item_comunicacao];
    const selecionado = frase.some(f => f.id_item_comunicacao === item.id_item_comunicacao);
    return (
      <TouchableOpacity
        style={[estilos.cardItem, selecionado && estilos.cardItemSelecionado]}
        activeOpacity={0.7}
        onPress={() => adicionarNaFrase(item)}
      >
        {url ? (
          <Image source={{ uri: url }} style={estilos.imagemItem} resizeMode="contain" />
        ) : (
          <View style={estilos.placeholderItem}>
            <Ionicons name="image-outline" size={36} color="#8C77C2" />
          </View>
        )}
        <Text style={estilos.txtItem} numberOfLines={2}>{item.palavra}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={estilos.telaPrincipal}>

      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
          <TouchableOpacity
            onPress={() => categoriaSelecionada ? deselecionar() : navigation.goBack()}
            style={estilos.iconeBotao}
          >
            <Ionicons name="arrow-back" size={24} color="#8C77C2" />
          </TouchableOpacity>
          <Text style={estilos.tituloHeader}>
            {categoriaSelecionada ? categoriaSelecionada.nome : 'Comunicação'}
          </Text>
          <TouchableOpacity style={estilos.iconeBotao}>
            <Ionicons name="help-circle-outline" size={22} color="#8C77C2" />
          </TouchableOpacity>
        </View>
        <TouchableOpacity style={estilos.btnFiltrar}>
          <Ionicons name="filter" size={16} color="#8C77C2" />
          <Text style={estilos.txtFiltrar}>Filtrar</Text>
        </TouchableOpacity>
      </View>

      <View style={estilos.conteudoPrincipal}>
        {carregando && !categoriaSelecionada ? (
          <View style={estilos.containerCarregando}>
            <ActivityIndicator size="large" color="#8C77C2" />
            <Text style={estilos.textoCarregando}>Carregando...</Text>
          </View>
        ) : !categoriaSelecionada ? (
          <FlatList
            data={categorias}
            keyExtractor={(item) => item.id_categoria_comunicacao.toString()}
            numColumns={3}
            contentContainerStyle={estilos.grade}
            renderItem={renderCategoria}
            ListEmptyComponent={
              <Text style={estilos.textoVazio}>Nenhuma categoria disponível.</Text>
            }
          />
        ) : (
          <FlatList
            data={itens}
            keyExtractor={(item) => item.id_item_comunicacao.toString()}
            numColumns={3}
            contentContainerStyle={estilos.grade}
            renderItem={renderItem}
            ListEmptyComponent={
              <Text style={estilos.textoVazio}>Nenhum item nesta categoria.</Text>
            }
          />
        )}
      </View>

      <View style={estilos.barraFrase}>
        <View style={estilos.botoesAcao}>
          <TouchableOpacity style={estilos.btnAcao} onPress={limparFrase}>
            <Ionicons name="trash-outline" size={22} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity 
            style={estilos.btnAcao} 
            onPress={() => frase.length > 0 && removerDaFrase(frase.length - 1)}
          >
            <Ionicons name="close" size={22} color="#666" />
          </TouchableOpacity>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={estilos.scrollFrase}
          contentContainerStyle={{ alignItems: 'center', paddingHorizontal: 8 }}
        >
          {frase.length === 0 ? (
            <Text style={estilos.txtFraseVazia}>Toque nos pictogramas para formar uma frase</Text>
          ) : (
            frase.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={estilos.cardFrase}
                onPress={() => removerDaFrase(index)}
              >
                {item.url ? (
                  <Image source={{ uri: item.url }} style={estilos.imagemFrase} resizeMode="contain" />
                ) : (
                  <View style={[estilos.imagemFrase, { backgroundColor: '#EDE0FF', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={20} color="#8C77C2" />
                  </View>
                )}
                <Text style={estilos.txtFrase} numberOfLines={1}>{item.palavra}</Text>
              </TouchableOpacity>
            ))
          )}
        </ScrollView>

        <View style={estilos.botoesAcao}>
          <TouchableOpacity style={estilos.btnAcao} onPress={falarFrase}>
            <Ionicons name="volume-high-outline" size={22} color="#8C77C2" />
          </TouchableOpacity>
        </View>
      </View>

      <MenuLateral
        visivel={menuVisivel}
        aoFechar={() => setMenuVisivel(false)}
        navigation={navigation}
        id_usuario={id_usuario}
        perfil={perfil}
      />

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
    gap: 6,
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
  btnFiltrar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#EDE0FF',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  txtFiltrar: {
    fontSize: 13,
    color: '#8C77C2',
    fontFamily: 'REM_Medium',
  },
  conteudoPrincipal: {
    flex: 1,
  },
  containerCarregando: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  textoCarregando: {
    fontSize: 14,
    color: '#999',
    fontFamily: 'REM_Regular',
  },
  grade: {
    padding: 10,
  },
  cardItem: {
    width: CARD_SIZE,
    aspectRatio: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    margin: 5,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
    borderWidth: 1,
    borderColor: '#E8E0FF',
    elevation: 1,
  },
  cardItemSelecionado: {
    borderColor: '#8C77C2',
    borderWidth: 2,
    backgroundColor: '#F3EEFF',
  },
  placeholderItem: {
    width: '70%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagemItem: {
    width: '75%',
    aspectRatio: 1,
  },
  txtItem: {
    fontSize: 11,
    fontFamily: 'REM_Medium',
    color: '#333',
    textAlign: 'center',
    marginTop: 4,
  },
  textoVazio: {
    textAlign: 'center',
    color: '#999',
    marginTop: 40,
    fontFamily: 'REM_Regular',
  },
  barraFrase: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    marginHorizontal: 12,
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 8,
    minHeight: 90,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
  },
  botoesAcao: {
    gap: 6,
  },
  btnAcao: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollFrase: {
    flex: 1,
    marginHorizontal: 8,
  },
  txtFraseVazia: {
    fontSize: 12,
    color: '#BDBDBD',
    fontFamily: 'REM_Regular',
    textAlign: 'center',
  },
  cardFrase: {
    alignItems: 'center',
    marginHorizontal: 4,
    width: 60,
  },
  imagemFrase: {
    width: 50,
    height: 50,
    borderRadius: 8,
  },
  txtFrase: {
    fontSize: 10,
    fontFamily: 'REM_Medium',
    color: '#333',
    textAlign: 'center',
    marginTop: 2,
  },
});
