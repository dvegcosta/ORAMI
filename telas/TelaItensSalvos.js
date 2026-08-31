import React, { useState, useEffect } from 'react';
import { 
  StyleSheet, Text, View, SafeAreaView, TouchableOpacity, 
  FlatList, ActivityIndicator, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import PostCard from '../lib/PostCard';
import { useEstilosTema, usarTema } from '../lib/tema';

export default function TelaItensSalvos({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};

  const [posts, setPosts] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      carregarPostsSalvos();
    });
    return unsubscribe;
  }, [navigation]);

  const carregarPostsSalvos = async () => {
    if (!id_usuario) return;
    setCarregando(true);
    try {
      const { data: dadosPosts, error: errPosts } = await supabase.rpc('obter_posts_salvos', {
        p_id_usuario: id_usuario
      });
      
      if (errPosts) throw errPosts;
      setPosts(dadosPosts || []);

    } catch (error) {
      console.error("Erro ao carregar posts salvos:", error);
    } finally {
      setCarregando(false);
    }
  };

  const handleCurtir = async (id_post) => {
    try {
      const { data: novoStatus, error } = await supabase.rpc('alternar_curtida_post', {
        p_id_post: id_post,
        p_id_usuario: id_usuario
      });

      if (error) throw error;

      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id_post === id_post) {
          return {
            ...post,
            is_curtido: novoStatus,
            qtd_curtidas: novoStatus ? post.qtd_curtidas + 1 : post.qtd_curtidas - 1
          };
        }
        return post;
      }));
    } catch (error) {
      console.error("Erro ao curtir:", error);
    }
  };

  const handleSalvar = async (id_post) => {
    try {
      const { data: novoStatus, error } = await supabase.rpc('alternar_salvamento_post', {
        p_id_post: id_post,
        p_id_usuario: id_usuario
      });

      if (error) throw error;

      if (!novoStatus) {
        setPosts(prevPosts => prevPosts.filter(post => post.id_post !== id_post));
        return;
      }

      setPosts(prevPosts => prevPosts.map(post => {
        if (post.id_post === id_post) {
          return { ...post, is_salvo: novoStatus };
        }
        return post;
      }));
    } catch (error) {
      console.error("Erro ao salvar:", error);
    }
  };

    return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.headerContainer}>
        <TouchableOpacity style={estilos.backButton} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#8C77C2" />
        </TouchableOpacity>
        
        <View style={estilos.titleRow}>
          <Ionicons name="bookmark" size={32} color="#8C77C2" />
          <Text style={estilos.titleText}>Itens salvos</Text>
        </View>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={posts}
          keyExtractor={(item) => item.id_post.toString()}
          renderItem={({ item }) => (
          <PostCard
            item={item}
            estilos={estilos}
            cores={cores}
            navigation={navigation}
            idUsuario={id_usuario}
            onCurtir={handleCurtir}
            onSalvar={handleSalvar}
            variant="salvos"
          />
        )}
          contentContainerStyle={{ paddingBottom: 20 }}
          ListEmptyComponent={
            <Text style={estilos.textoListaVazia}>
              Nenhum item salvo ainda.
            </Text>
          }
        />
      )}
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAFA',
  },
  headerContainer: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
  },
  backButton: {
    marginBottom: 20,
    alignSelf: 'flex-start',
    paddingTop: Platform.OS === 'android' ? 45 : 15,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#8C77C2',
    marginLeft: 10,
  },
  cardPost: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 3,
  },
  postHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  avatarPost: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  nomeAutor: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  usernameAutor: {
    fontSize: 12,
    color: '#888',
    marginLeft: 4,
  },
  tagsContainer: {
    flexDirection: 'row',
    marginTop: 4,
  },
  tagComunidade: {
    backgroundColor: '#F5F0FF',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  txtTagComunidade: {
    fontSize: 11,
    fontWeight: 'bold',
    color: '#8C77C2',
  },
  textoPost: {
    fontSize: 14,
    color: '#444',
    marginBottom: 10,
    lineHeight: 20,
  },
  imagemPost: {
    width: '100%',
    height: 200,
    borderRadius: 10,
    marginBottom: 10,
  },
  postFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 10,
  },
  postFooterEsquerda: {
    flexDirection: 'row',
  },
  postFooterDireita: {
    flexDirection: 'row',
  },
  btnAcaoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 15,
  },
  btnAcao: {
    marginLeft: 15,
  },
  txtQtdAcao: {
    marginLeft: 5,
    color: '#666',
    fontSize: 14,
  },
  textoListaVazia: {
    textAlign: 'center',
    marginTop: 50,
    color: '#666',
  },
});
