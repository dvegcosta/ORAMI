import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View,
  TouchableOpacity, SafeAreaView, FlatList, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { BarChart } from 'react-native-chart-kit';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import MenuLateral from './MenuLateral';

const larguraTela = Dimensions.get('window').width;

export default function TelaRegistrarCrise({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
  const [registros, setRegistros] = useState([
    { id_reg_crise: 1, titulo: 'Registro de Crise', data_criacao: '04/04/2026 · 17:32' },
    { id_reg_crise: 2, titulo: 'Registro de Crise', data_criacao: '04/04/2026 · 17:32' },
    { id_reg_crise: 3, titulo: 'Registro de Crise', data_criacao: '04/04/2026 · 17:32' },
  ]);

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const { data, error } = await supabase.rpc('obter_perfil_usuario', {
          p_id_usuario: id_usuario
        });
        if (data && !error) setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
      } catch (e) { console.error(e); }
    };
    carregarPerfil();
  }, [id_usuario]);

  return (
    <SafeAreaView style={estilos.telaPrincipal}>

      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.iconeBotao}>
            <Ionicons name="arrow-back" size={24} color="#8C77C2" />
          </TouchableOpacity>
          <Text style={estilos.tituloHeader}>Registrar crises</Text>
        </View>
      </View>

      <FlatList
        data={registros}
        keyExtractor={(item) => item.id_reg_crise.toString()}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={estilos.barraAcoes}>
            <TouchableOpacity style={estilos.btnFiltrar}>
              <Ionicons name="filter" size={14} color="#8C77C2" />
              <Text style={estilos.txtFiltrar}>Filtrar</Text>
            </TouchableOpacity>
            <View style={estilos.iconesDireita}>
              <TouchableOpacity style={estilos.iconeBotao}>
                <Ionicons name="folder-outline" size={22} color="#8C77C2" />
              </TouchableOpacity>
              <TouchableOpacity style={estilos.iconeBotao}>
                <Ionicons name="add" size={24} color="#8C77C2" />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={estilos.itemRegistro} activeOpacity={0.7}>
            <Ionicons name="document-text-outline" size={20} color="#8C77C2" />
            <View style={estilos.infoRegistro}>
              <Text style={estilos.tituloRegistro}>{item.titulo}</Text>
              <Text style={estilos.dataRegistro}>{item.data_criacao}</Text>
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
    marginLeft: 10,
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


});