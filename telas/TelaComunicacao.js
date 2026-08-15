import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View,
  TouchableOpacity, SafeAreaView, ScrollView
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import MenuLateral from './MenuLateral';

export default function TelaRegistrarCrise({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};


  const [menuVisivel, setMenuVisivel] = useState(false);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });

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
          <Text style={estilos.tituloHeader}>Comunicação</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 100 }}>

      </ScrollView>

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
  telaPrincipal: { flex: 1, backgroundColor: '#FAFAFC' },
  headerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 55,
    paddingBottom: 10,
  },
  headerEsquerda: { flexDirection: 'row', alignItems: 'center' },
  tituloHeader: {
    fontSize: 22, fontFamily: 'REM_Bold',
    color: '#8C77C2', marginLeft: 10, fontWeight: 'bold',
  },
  iconeBotao: { padding: 5 },
});