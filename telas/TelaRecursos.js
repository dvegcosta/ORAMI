import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { LinearGradient } from 'expo-linear-gradient';
import { Alert } from '../lib/popup';
import { useEstilosTema, usarTema } from '../lib/tema';
import MenuLateral from './MenuLateral';

export default function TelaRecursos({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { id_usuario } = route.params || {};

  const [menuVisivel, setMenuVisivel] = useState(false);
  const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });

  useEffect(() => {
    const carregarPerfil = async () => {
      try {
        const { data, error } = await supabase.rpc('obter_perfil_usuario', {
          p_id_usuario: id_usuario
        });
        if (data && !error) {
          setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
        }
      } catch (e) {
        console.error('Erro ao carregar perfil:', e);
      }
    };
    carregarPerfil();
  }, [id_usuario]);

  const { cores } = usarTema();


  const recursos = [
    { id: 1, titulo: 'Registrar crises',   icone: 'document-text-outline', tela: 'TelaRegistrarCrise' },
    { id: 2, titulo: 'Comunicação',        icone: 'text-outline',          tela: 'TelaComunicacao' },
    { id: 3, titulo: 'Criar Rotina',       icone: 'create-outline',        tela: 'TelaCriarRotina' },
    { id: 4, titulo: 'Registros Diários',  icone: 'list-outline',          tela: 'TelaRegistrosDiarios' },
  ];

  return (
    <SafeAreaView style={estilos.telaPrincipal}>
      
   
      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
         
          <TouchableOpacity onPress={() => setMenuVisivel(true)} style={estilos.iconeBotao}>
            <Ionicons name="menu" size={28} color="#8C77C2" />
          </TouchableOpacity>
          <Text style={estilos.tituloHeader}>Recursos</Text>
        </View>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>
        
        <View style={estilos.cardDestaque}>
          <Ionicons name="heart" size={36} color="#8C77C2" style={{ marginBottom: 8 }} />
          <Text style={estilos.textoDestaque}>
            Texto é uma unidade linguística de sentidos que resulta da interação entre quem o produz e o leitor/ouvinte.
          </Text>
        </View>

        <TouchableOpacity style={estilos.linkContainer}
        onPress={() => navigation.navigate('TelaManualUso', { id_usuario })}
        >
            
          <Ionicons name="information-circle-outline" size={16} color="#8C77C2" />
          <Text style={estilos.textoLink}>Ler sobre os recursos</Text>
        </TouchableOpacity>

        <View style={estilos.grade}>
          {recursos.map((recurso) => (
            <TouchableOpacity
              key={recurso.id}
              style={estilos.cardRecurso}
              onPress={() => navigation.navigate(recurso.tela, { id_usuario })}
            >
              <Ionicons name={recurso.icone} size={40} color="#BDBDBD" />
              <Text style={estilos.tituloCard}>{recurso.titulo}</Text>
            </TouchableOpacity>
          ))}
        </View>

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
  telaPrincipal: {
    flex: 1,
    backgroundColor: '#FAFAFC',
  },
  
  headerContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
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
  cardDestaque: {
    backgroundColor: '#F3EEFF',
    margin: 20,
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
  },
  textoDestaque: {
    color: '#8C77C2',
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
    fontFamily: 'REM_Regular',
  },
  linkContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
    gap: 6,
    backgroundColor: '#EDE0FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  textoLink: {
    color: '#8C77C2',
    fontSize: 14,
    fontFamily: 'REM_Medium',
  },

  grade: {
    flexDirection: 'row',
    flexWrap: 'wrap',         
    paddingHorizontal: 12,
    justifyContent: 'center',
    gap: 10,
  },
  cardRecurso: {
    width: '45%',             
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    elevation: 1,
    minHeight: 120,
  },
  tituloCard: {
    fontSize: 14,
    color: '#555',
    fontFamily: 'REM_Medium',
    textAlign: 'center',
  },
});