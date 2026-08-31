import React, { useEffect, useState } from 'react';
import { ActivityIndicator, FlatList, Image, SafeAreaView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Alert } from '../lib/popup';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';

const imagemUri = (valor) => {
  if (!valor) return null;
  if (String(valor).startsWith('data:') || String(valor).startsWith('http')) return { uri: String(valor) };
  return { uri: `data:image/jpeg;base64,${valor}` };
};

export default function TelaNotificacao({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const id_logado = route.params?.id_usuario_logado;
  const [abaAtiva, setAbaAtiva] = useState('solicitacoes');
  const [notificacoes, setNotificacoes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarNotificacoes();
  }, [id_logado]);

  const carregarNotificacoes = async () => {
    if (!id_logado) return;
    setCarregando(true);
    try {
      const { data, error } = await supabase
        .from('notificacoes')
        .select(`
          id_notificacao,
          id_usuario_destino,
          id_usuario_origem,
          id_tipo_notificacao,
          visualizada,
          criado_em,
          tipos_notificacao!notificacoes_id_tipo_notificacao_fkey(nome_tipo),
          usuarios!notificacoes_id_usuario_origem_fkey(id_usuario,nome_exibicao,nome_usuario,foto_perfil)
        `)
        .eq('id_usuario_destino', id_logado)
        .order('criado_em', { ascending: false });

      if (error) throw error;

      const { data: amizades, error: erroAmizades } = await supabase
        .from('amizades')
        .select('id_amizade,id_usuario_solicitante,status')
        .eq('id_usuario_solicitado', id_logado);
      if (erroAmizades) throw erroAmizades;

      const amizadesPorUsuario = new Map((amizades || []).map((amizade) => [amizade.id_usuario_solicitante, amizade]));
      const normalizadas = (data || []).map((item) => {
        const tipo = item.tipos_notificacao?.nome_tipo || 'SISTEMA';
        const amizade = amizadesPorUsuario.get(item.id_usuario_origem);
        return {
          ...item,
          tipo,
          id_remetente: item.id_usuario_origem,
          nome_remetente: item.usuarios?.nome_exibicao || item.usuarios?.nome_usuario || 'Usuário',
          foto_remetente: item.usuarios?.foto_perfil || null,
          data_criacao: item.criado_em,
          aceito: amizade?.status === 'aceita',
        };
      });

      setNotificacoes(normalizadas);

      const { error: erroVisualizacao } = await supabase
        .from('notificacoes')
        .update({ visualizada: true, visualizado_em: new Date().toISOString() })
        .eq('id_usuario_destino', id_logado)
        .eq('visualizada', false);
      if (erroVisualizacao) console.error('Erro ao marcar notificações como visualizadas:', erroVisualizacao);
    } catch (error) {
      console.error('Erro ao carregar notificações:', error);
      Alert.alert('Notificações indisponíveis', 'Não foi possível carregar suas notificações agora.');
    } finally {
      setCarregando(false);
    }
  };

  const aceitarSolicitacao = async (id_notificacao, id_remetente) => {
    try {
      const { error } = await supabase.rpc('aceitar_solicitacao_amizade', {
        p_id_notificacao: id_notificacao,
        p_id_logado: id_logado,
        p_id_remetente: id_remetente,
      });
      if (error) throw error;
      setNotificacoes((anteriores) => anteriores.map((item) => (
        item.id_notificacao === id_notificacao ? { ...item, aceito: true } : item
      )));
    } catch (error) {
      console.error('Erro ao aceitar amizade:', error);
      Alert.alert('Erro', 'Não foi possível aceitar a solicitação.');
    }
  };

  const excluirNotificacao = async (id_notificacao) => {
    try {
      const { error } = await supabase
        .from('notificacoes')
        .delete()
        .eq('id_notificacao', id_notificacao)
        .eq('id_usuario_destino', id_logado);
      if (error) throw error;
      setNotificacoes((anteriores) => anteriores.filter((item) => item.id_notificacao !== id_notificacao));
    } catch (error) {
      Alert.alert('Erro', 'Não foi possível excluir a notificação.');
      console.error(error);
    }
  };

  const formatarTempo = (dataStr) => {
    const diff = Math.max(0, new Date() - new Date(dataStr));
    const horas = Math.floor(diff / (1000 * 60 * 60));
    if (horas < 1) return 'Agora';
    if (horas < 24) return `Há ${horas}h`;
    return `Há ${Math.floor(horas / 24)}d`;
  };

  const dadosFiltrados = notificacoes.filter((item) => (
    abaAtiva === 'solicitacoes'
      ? item.tipo === 'SOLICITACAO_AMIZADE'
      : item.tipo !== 'SOLICITACAO_AMIZADE'
  ));

  const renderNotificacao = ({ item }) => {
    const avatar = imagemUri(item.foto_remetente) || require('../assets/default-avatar.png');
    const nome = item.nome_remetente;

    let texto = 'Você recebeu uma nova notificação.';
    if (item.tipo === 'SOLICITACAO_AMIZADE') {
      texto = <><Text style={{ fontWeight: 'bold' }}>{nome}</Text> quer ser seu amigo.</>;
    } else if (item.tipo === 'CURTIDA_POST') {
      texto = <><Text style={{ fontWeight: 'bold' }}>{nome}</Text> curtiu uma publicação sua.</>;
    } else if (item.tipo === 'SALVAMENTO_POST') {
      texto = <><Text style={{ fontWeight: 'bold' }}>{nome}</Text> salvou uma publicação sua.</>;
    } else if (item.tipo === 'COMENTARIO_POST') {
      texto = <><Text style={{ fontWeight: 'bold' }}>{nome}</Text> comentou na sua publicação.</>;
    } else if (item.tipo === 'SISTEMA') {
      texto = 'Você recebeu uma atualização do sistema Orami.';
    }

    return (
      <View style={estilos.cardNotificacao}>
        {item.tipo === 'SISTEMA' ? (
          <View style={estilos.iconeSistema}>
            <MaterialCommunityIcons name="check-decagram" size={32} color="#8C77C2" />
          </View>
        ) : (
          <Image source={avatar} style={estilos.avatar} />
        )}

        <View style={estilos.textContainer}>
          <Text style={estilos.textoNotificacao}>{texto}</Text>
          <View style={estilos.botoesContainer}>
            {item.tipo === 'SOLICITACAO_AMIZADE' && !item.aceito && (
              <TouchableOpacity
                style={estilos.btnAceitar}
                onPress={() => aceitarSolicitacao(item.id_notificacao, item.id_remetente)}
              >
                <Text style={estilos.txtBtnAceitar}>Aceitar solicitação</Text>
              </TouchableOpacity>
            )}
            {item.tipo === 'SOLICITACAO_AMIZADE' && item.aceito && (
              <View style={[estilos.btnAceitar, { backgroundColor: '#E0E0E0' }]}>
                <Text style={[estilos.txtBtnAceitar, { color: '#666' }]}>Aceito</Text>
              </View>
            )}
            <Text style={estilos.tempo}>{formatarTempo(item.data_criacao)}</Text>
          </View>
        </View>

        <TouchableOpacity style={estilos.btnMenu} onPress={() => excluirNotificacao(item.id_notificacao)}>
          <Ionicons name="close" size={22} color="#CCC" />
        </TouchableOpacity>
      </View>
    );
  };

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#8C77C2" />
        </TouchableOpacity>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginLeft: 15 }}>
          <Ionicons name="notifications" size={24} color="#8C77C2" />
          <Text style={[estilos.tituloHeader, { color: cores.titulo || '#8C77C2' }]}>Notificações</Text>
        </View>
      </View>

      <View style={estilos.seletorAbasContainer}>
        <TouchableOpacity style={[estilos.abaBotao, abaAtiva === 'solicitacoes' && estilos.abaAtiva]} onPress={() => setAbaAtiva('solicitacoes')}>
          <Text style={[estilos.textoAba, abaAtiva === 'solicitacoes' && estilos.textoAbaAtivo]}>Solicitações</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[estilos.abaBotao, abaAtiva === 'interacoes' && estilos.abaAtiva]} onPress={() => setAbaAtiva('interacoes')}>
          <Text style={[estilos.textoAba, abaAtiva === 'interacoes' && estilos.textoAbaAtivo]}>Interações e outros</Text>
        </TouchableOpacity>
      </View>

      {carregando ? (
        <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 50 }} />
      ) : (
        <FlatList
          data={dadosFiltrados}
          keyExtractor={(item) => String(item.id_notificacao)}
          renderItem={renderNotificacao}
          contentContainerStyle={{ padding: 15 }}
          ListEmptyComponent={<Text style={{ textAlign: 'center', marginTop: 20, color: '#999', fontFamily: 'REM_Regular' }}>Nenhuma notificação encontrada.</Text>}
        />
      )}
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F8FC', paddingVertical: 50 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 25, paddingBottom: 35, gap: 10 },
  tituloHeader: { fontSize: 23, fontFamily: 'REM_Bold', marginLeft: 8 },
  seletorAbasContainer: { flexDirection: 'row', backgroundColor: '#F1E2FF', borderRadius: 25, marginHorizontal: 20, marginBottom: 10, padding: 4 },
  abaBotao: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  abaAtiva: { backgroundColor: '#FFF', shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2, elevation: 2 },
  textoAba: { fontSize: 14, fontFamily: 'REM_Bold', color: '#8C77C2' },
  textoAbaAtivo: { color: '#8C77C2' },
  cardNotificacao: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 3, elevation: 1 },
  avatar: { width: 45, height: 45, borderRadius: 22.5, marginRight: 12 },
  iconeSistema: { width: 45, height: 45, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  textContainer: { flex: 1 },
  textoNotificacao: { fontSize: 14, color: '#333', lineHeight: 20, fontFamily: 'REM_Regular' },
  tempo: { fontSize: 12, color: '#666', marginTop: 4, fontFamily: 'REM_Regular' },
  botoesContainer: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, gap: 8 },
  btnAceitar: { backgroundColor: '#8C77C2', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15 },
  txtBtnAceitar: { color: '#FFF', fontSize: 12, fontFamily: 'REM_Bold' },
  btnMenu: { marginLeft: 10, marginTop: 2 },
});
