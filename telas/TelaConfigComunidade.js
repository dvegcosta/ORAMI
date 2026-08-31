import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  SafeAreaView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

const imagemUri = (valor) => {
  if (!valor) return null;
  const texto = String(valor);
  if (texto.startsWith('data:') || texto.startsWith('http://') || texto.startsWith('https://')) {
    return { uri: texto };
  }
  return { uri: `data:image/jpeg;base64,${texto}` };
};

export default function TelaConfigComunidade({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario, id_comunidade } = route.params || {};

  const [abaAtual, setAbaAtual] = useState('membros');
  const [carregando, setCarregando] = useState(true);
  const [semAcesso, setSemAcesso] = useState(false);
  const [membros, setMembros] = useState([]);
  const [pesquisa, setPesquisa] = useState('');
  const [mostrarPesquisa, setMostrarPesquisa] = useState(false);
  const [somenteModeradoresPostam, setSomenteModeradoresPostam] = useState(false);
  const [isPrivada, setIsPrivada] = useState(false);
  const [ehCriador, setEhCriador] = useState(false);
  const [ehModerador, setEhModerador] = useState(false);
  const [carregandoAcao, setCarregandoAcao] = useState(false);
  const [emailNovoMod, setEmailNovoMod] = useState('');
  const [mostrarAdicionarModerador, setMostrarAdicionarModerador] = useState(false);

  useEffect(() => {
    carregarTudo();
  }, [id_usuario, id_comunidade]);

  const carregarTudo = async () => {
    if (!id_usuario || !id_comunidade) {
      setSemAcesso(true);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    try {
      const { data: membroLogado, error: erroMembro } = await supabase
        .from('comunidade_membros')
        .select('papel,status')
        .eq('id_comunidade', id_comunidade)
        .eq('id_usuario', id_usuario)
        .eq('status', 'ativo')
        .maybeSingle();
      if (erroMembro) throw erroMembro;

      if (!membroLogado || !['criador', 'moderador'].includes(membroLogado.papel)) {
        setSemAcesso(true);
        setCarregando(false);
        return;
      }

      setEhCriador(membroLogado.papel === 'criador');
      setEhModerador(membroLogado.papel === 'moderador');
      if (membroLogado.papel !== 'criador') setAbaAtual('membros');

      const { data: comunidade, error: erroComunidade } = await supabase
        .from('comunidades')
        .select('id_comunidade,id_criador_usuario,nome,is_privada,somente_moderadores_postam')
        .eq('id_comunidade', id_comunidade)
        .maybeSingle();
      if (erroComunidade) throw erroComunidade;

      setIsPrivada(Boolean(comunidade?.is_privada));
      setSomenteModeradoresPostam(Boolean(comunidade?.somente_moderadores_postam));

      const { data, error } = await supabase
        .from('comunidade_membros')
        .select(`id_comunidade_membro,id_comunidade,id_usuario,papel,status,data_entrada,usuarios!comunidade_membros_id_usuario_fkey(nome_exibicao,nome_usuario,foto_perfil)`)
        .eq('id_comunidade', id_comunidade)
        .eq('status', 'ativo')
        .order('data_entrada', { ascending: true });
      if (error) throw error;
      setMembros(data || []);
    } catch (error) {
      console.error('Erro ao carregar configuração da comunidade:', error);
      Alert.alert('Dados indisponíveis', 'Não foi possível carregar as configurações da comunidade agora.');
    } finally {
      setCarregando(false);
    }
  };

  const moderadores = useMemo(
    () => membros.filter((membro) => membro.papel === 'criador' || membro.papel === 'moderador'),
    [membros]
  );

  const listaAtual = abaAtual === 'membros' ? membros : moderadores;
  const listaFiltrada = listaAtual.filter((membro) => {
    const nome = membro.usuarios?.nome_exibicao || membro.usuarios?.nome_usuario || '';
    return nome.toLowerCase().includes(pesquisa.toLowerCase());
  });

  const atualizarConfiguracao = async (campo, valor) => {
    if (!ehCriador) return;
    try {
      const { error } = await supabase
        .from('comunidades')
        .update({ [campo]: valor, atualizado_em: new Date().toISOString() })
        .eq('id_comunidade', id_comunidade)
        .eq('id_criador_usuario', id_usuario);
      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar configuração:', error);
      Alert.alert('Configuração não salva', 'Não foi possível salvar essa configuração agora.');
      if (campo === 'somente_moderadores_postam') setSomenteModeradoresPostam((atual) => !atual);
      if (campo === 'is_privada') setIsPrivada((atual) => !atual);
    }
  };

  const confirmarPrivar = () => {
    const novoStatus = !isPrivada;
    Alert.alert(
      novoStatus ? 'Privar comunidade' : 'Tornar pública',
      novoStatus ? 'Tem certeza que deseja privar esta comunidade?' : 'Deseja tornar a comunidade pública?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Confirmar',
          onPress: () => {
            setIsPrivada(novoStatus);
            atualizarConfiguracao('is_privada', novoStatus);
          },
        },
      ]
    );
  };

  const adicionarModerador = async () => {
    const email = emailNovoMod.trim().toLowerCase();
    if (!email) {
      Alert.alert('Email do moderador', 'Digite o email do usuário que deseja tornar moderador.');
      return;
    }

    setCarregandoAcao(true);
    try {
      const { data, error } = await supabase.rpc('orami_promover_moderador_comunidade', {
        p_id_comunidade: id_comunidade,
        p_id_solicitante: id_usuario,
        p_email_usuario: email,
      });
      if (error) throw error;
      if (!data) {
        Alert.alert('Moderador não adicionado', 'O usuário precisa existir e já participar ativamente da comunidade.');
        return;
      }
      setMostrarAdicionarModerador(false);
      setEmailNovoMod('');
      await carregarTudo();
      Alert.alert('Moderador adicionado', 'O usuário agora pode ajudar na moderação da comunidade.');
    } catch (error) {
      console.error('Erro ao adicionar moderador:', error);
      Alert.alert('Moderador não adicionado', 'Não foi possível alterar o papel deste usuário.');
    } finally {
      setCarregandoAcao(false);
    }
  };

  const removerMembro = (membro) => {
    if (!ehCriador && !ehModerador) return;
    const nome = membro.usuarios?.nome_exibicao || membro.usuarios?.nome_usuario || 'este membro';
    Alert.alert(
      'Remover membro',
      `Tem certeza que deseja remover ${nome} da comunidade?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Remover',
          style: 'destructive',
          onPress: async () => {
            setCarregandoAcao(true);
            try {
              const { data, error } = await supabase.rpc('orami_remover_membro_comunidade', {
                p_id_comunidade: id_comunidade,
                p_id_moderador: id_usuario,
                p_id_membro: membro.id_usuario,
              });
              if (error) throw error;
              if (!data) throw new Error('Ação não autorizada');
              setMembros((anteriores) => anteriores.filter((item) => item.id_usuario !== membro.id_usuario));
              Alert.alert('Membro removido', 'O usuário não participa mais da comunidade.');
            } catch (error) {
              console.error('Erro ao remover membro:', error);
              Alert.alert('Remoção não concluída', 'Não foi possível remover este membro.');
            } finally {
              setCarregandoAcao(false);
            }
          },
        },
      ]
    );
  };

  const excluirComunidade = () => {
    Alert.alert(
      'Excluir comunidade',
      'A comunidade será marcada como excluída e todos os vínculos de membros serão encerrados. Essa ação é exclusiva do criador.',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Excluir',
          style: 'destructive',
          onPress: async () => {
            try {
              const { data, error } = await supabase.rpc('orami_sair_comunidade', {
                p_id_comunidade: id_comunidade,
                p_id_usuario: id_usuario,
                p_confirmar_exclusao_se_criador: true,
              });
              if (error) throw error;
              if (!data) throw new Error('Ação não autorizada');
              Alert.alert('Comunidade excluída', 'A comunidade foi encerrada com sucesso.');
              navigation.navigate('TelaMinhasComunidades', { id_usuario });
            } catch (error) {
              console.error('Erro ao excluir comunidade:', error);
              Alert.alert('Comunidade não excluída', 'Não foi possível excluir a comunidade.');
            }
          },
        },
      ]
    );
  };

  const renderizarUsuario = ({ item }) => {
    const nome = item.usuarios?.nome_exibicao || item.usuarios?.nome_usuario || 'Usuário';
    const podeRemover = abaAtual === 'membros' && (ehCriador || ehModerador) && item.papel !== 'criador' && item.id_usuario !== id_usuario;

    return (
      <View style={estilos.usuarioRow}>
        <View style={estilos.usuarioInfo}>
          {imagemUri(item.usuarios?.foto_perfil) ? (
            <Image source={imagemUri(item.usuarios.foto_perfil)} style={estilos.avatar} />
          ) : (
            <View style={estilos.avatarPlaceholder}>
              <Ionicons name="person" size={20} color="#FFF" />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' }}>
              <Text style={estilos.nomeUsuario}>{nome}</Text>
              {item.papel === 'criador' && (
                <View style={estilos.tagCriador}>
                  <Ionicons name="star" size={10} color="#8C77C2" />
                  <Text style={estilos.textoTagCriador}>criador</Text>
                </View>
              )}
              {item.papel === 'moderador' && abaAtual === 'membros' && (
                <View style={estilos.tagModerador}>
                  <Text style={estilos.textoTagModerador}>moderador</Text>
                </View>
              )}
            </View>
            {!!item.usuarios?.nome_usuario && (
              <Text style={estilos.nomeUsuarioSecundario}>@{item.usuarios.nome_usuario}</Text>
            )}
          </View>
        </View>

        {podeRemover ? (
          <TouchableOpacity onPress={() => removerMembro(item)} disabled={carregandoAcao} style={{ padding: 7 }}>
            <Ionicons name="ellipsis-vertical" size={20} color={cores.icone} />
          </TouchableOpacity>
        ) : (
          <View style={{ width: 34 }} />
        )}
      </View>
    );
  };

  if (carregando) {
    return <View style={estilos.loadingContainer}><ActivityIndicator size="large" color="#8C77C2" /></View>;
  }

  if (semAcesso) {
    return (
      <View style={estilos.loadingContainer}>
        <Ionicons name="lock-closed-outline" size={42} color="#8C77C2" />
        <Text style={estilos.acessoNegadoTitulo}>Acesso restrito</Text>
        <Text style={estilos.acessoNegadoTexto}>Somente o criador e os moderadores da comunidade podem acessar esta tela.</Text>
        <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.botaoVoltarTexto}>
          <Text style={estilos.botaoVoltarTextoLabel}>Voltar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity style={estilos.botaoVoltarCirculo} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#8C77C2" />
        </TouchableOpacity>
        <View style={estilos.tituloContainer}>
          <Ionicons name="settings" size={26} color="#8C77C2" />
          <Text style={estilos.titulo}>Configurações</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <View style={estilos.tabsContainer}>
        <TouchableOpacity style={[estilos.tab, abaAtual === 'membros' && estilos.tabAtiva]} onPress={() => setAbaAtual('membros')}>
          <Text style={[estilos.tabTexto, abaAtual === 'membros' && estilos.tabTextoAtivo]}>Membros</Text>
        </TouchableOpacity>
        {ehCriador && (
          <TouchableOpacity style={[estilos.tab, abaAtual === 'configuracoes' && estilos.tabAtiva]} onPress={() => setAbaAtual('configuracoes')}>
            <Text style={[estilos.tabTexto, abaAtual === 'configuracoes' && estilos.tabTextoAtivo]}>Configurações</Text>
          </TouchableOpacity>
        )}
      </View>

      {abaAtual === 'membros' ? (
        <View style={estilos.contentArea}>
          <View style={estilos.listaHeader}>
            <View style={estilos.badgeContainer}>
              <Ionicons name={ehModerador ? 'shield-checkmark' : 'people'} size={16} color="#FFF" />
              <Text style={estilos.badgeTexto}>{`${membros.length} Membros`}</Text>
            </View>
            <View style={estilos.acoesLista}>
              <TouchableOpacity style={estilos.btnAcaoRedondo} onPress={() => setMostrarPesquisa(!mostrarPesquisa)}>
                <Ionicons name="search" size={20} color="#8C77C2" />
              </TouchableOpacity>
            </View>
          </View>

          {mostrarPesquisa && (
            <TextInput style={estilos.inputPesquisa} placeholder="Pesquisar..." value={pesquisa} onChangeText={setPesquisa} />
          )}

          <View style={estilos.cardLista}>
            {carregandoAcao ? <ActivityIndicator size="small" color="#8C77C2" style={{ marginTop: 14 }} /> : null}
            <FlatList
              data={listaFiltrada}
              keyExtractor={(item) => String(item.id_comunidade_membro)}
              renderItem={renderizarUsuario}
              ItemSeparatorComponent={() => <View style={estilos.separador} />}
              contentContainerStyle={{ padding: 10, paddingBottom: 80 }}
              ListEmptyComponent={<Text style={estilos.textoListaVazia}>Nenhum membro encontrado.</Text>}
            />
          </View>
        </View>
      ) : (
        <View style={estilos.configuracoesArea}>
          <View style={estilos.moderadoresBox}>
            <View style={estilos.listaHeader}>
              <View style={estilos.badgeContainer}>
                <Ionicons name="shield" size={16} color="#FFF" />
                <Text style={estilos.badgeTexto}>Moderadores</Text>
              </View>
              <TouchableOpacity style={estilos.btnAcaoRedondo} onPress={() => setMostrarAdicionarModerador(true)}>
                <Ionicons name="add" size={24} color="#8C77C2" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={moderadores}
              keyExtractor={(item) => String(item.id_comunidade_membro)}
              renderItem={renderizarUsuario}
              ItemSeparatorComponent={() => <View style={estilos.separador} />}
              contentContainerStyle={{ padding: 10 }}
              ListEmptyComponent={<Text style={estilos.textoListaVazia}>Nenhum moderador encontrado.</Text>}
            />
          </View>

          <View style={estilos.controlesExtra}>
            <View style={estilos.linhaSwitch}>
              <Switch
                trackColor={{ false: '#CCC', true: '#8C77C2' }}
                thumbColor="#FFF"
                value={somenteModeradoresPostam}
                onValueChange={(valor) => {
                  setSomenteModeradoresPostam(valor);
                  atualizarConfiguracao('somente_moderadores_postam', valor);
                }}
              />
              <Text style={estilos.textoSwitch}>Somente moderadores podem postar</Text>
            </View>

            <TouchableOpacity style={estilos.btnControleSecundario} onPress={confirmarPrivar}>
              <Ionicons name={isPrivada ? 'lock-closed' : 'lock-open'} size={20} color="#8C77C2" />
              <Text style={estilos.textoBtnSecundario}>{isPrivada ? 'Comunidade privada' : 'Privar comunidade'}</Text>
            </TouchableOpacity>

            <TouchableOpacity style={estilos.btnControlePerigo} onPress={excluirComunidade}>
              <Ionicons name="trash-outline" size={20} color="#E74C3C" />
              <Text style={estilos.textoBtnPerigo}>Excluir comunidade</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {mostrarAdicionarModerador && (
        <View style={estilos.inlineOverlay}>
          <View style={estilos.inlineCard}>
            <Text style={estilos.modalTitulo}>Novo moderador</Text>
            <Text style={estilos.modalSub}>Digite o email de um usuário que já participe da comunidade.</Text>
            <TextInput
              style={estilos.inputModal}
              placeholder="Email do usuário"
              keyboardType="email-address"
              autoCapitalize="none"
              value={emailNovoMod}
              onChangeText={setEmailNovoMod}
            />
            <View style={estilos.modalBotoes}>
              <TouchableOpacity style={estilos.btnCancelar} onPress={() => setMostrarAdicionarModerador(false)}>
                <Text style={estilos.txtCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.btnSalvar} onPress={adicionarModerador}>
                <Text style={estilos.txtSalvar}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FAFAFA' },
  loadingContainer: { flex: 1, backgroundColor: '#FAFAFA', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 28 },
  acessoNegadoTitulo: { marginTop: 14, fontFamily: 'REM_Bold', fontSize: 21, color: '#8C77C2' },
  acessoNegadoTexto: { marginTop: 8, textAlign: 'center', color: '#666', fontFamily: 'REM_Regular', lineHeight: 20 },
  botaoVoltarTexto: { marginTop: 20, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 18, backgroundColor: '#8C77C2' },
  botaoVoltarTextoLabel: { color: '#FFF', fontFamily: 'REM_Bold' },
  botaoVoltarCirculo: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 3 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 60, paddingBottom: 20 },
  tituloContainer: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  titulo: { fontSize: 22, color: '#8C77C2', fontFamily: 'REM_Bold' },
  tabsContainer: { flexDirection: 'row', backgroundColor: '#FFF', marginHorizontal: 30, borderRadius: 25, padding: 4, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowOffset: { width: 0, height: 2 }, shadowRadius: 4, marginBottom: 20 },
  tab: { flex: 1, paddingVertical: 10, borderRadius: 20, alignItems: 'center' },
  tabAtiva: { backgroundColor: '#F4F2FA' },
  tabTexto: { color: '#8C77C2', fontFamily: 'REM_Bold', fontSize: 14 },
  tabTextoAtivo: { color: '#6B52A3' },
  contentArea: { backgroundColor: '#F4F2FA', flex: 1, borderRadius: 30, padding: 20, marginHorizontal: 10, marginBottom: 55 },
  configuracoesArea: { flex: 1, paddingHorizontal: 10, paddingBottom: 55 },
  listaHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  badgeContainer: { flexDirection: 'row', backgroundColor: '#8C77C2', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 20, alignItems: 'center', gap: 8 },
  badgeTexto: { color: '#FFF', fontFamily: 'REM_Bold', fontSize: 14 },
  acoesLista: { flexDirection: 'row', gap: 10 },
  btnAcaoRedondo: { backgroundColor: '#FFF', width: 38, height: 38, borderRadius: 19, justifyContent: 'center', alignItems: 'center', elevation: 1 },
  inputPesquisa: { backgroundColor: '#FFF', borderRadius: 15, padding: 10, marginBottom: 15, borderWidth: 1, borderColor: '#E8E8E8', fontFamily: 'REM_Regular' },
  cardLista: { backgroundColor: '#FFF', borderRadius: 15, flex: 1, elevation: 2, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 5 },
  moderadoresBox: { backgroundColor: '#F4F2FA', borderRadius: 24, padding: 18, minHeight: 220 },
  usuarioRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 5 },
  usuarioInfo: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  avatarPlaceholder: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#8C77C2', justifyContent: 'center', alignItems: 'center' },
  avatar: { width: 44, height: 44, borderRadius: 22 },
  nomeUsuario: { fontSize: 15, fontFamily: 'REM_Bold', color: '#333' },
  nomeUsuarioSecundario: { fontSize: 12, color: '#888', fontFamily: 'REM_Regular', marginTop: 2 },
  tagCriador: { flexDirection: 'row', alignItems: 'center', marginLeft: 8, backgroundColor: '#EFE7FF', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 10 },
  textoTagCriador: { marginLeft: 3, color: '#8C77C2', fontFamily: 'REM_Bold', fontSize: 10 },
  tagModerador: { marginLeft: 8, backgroundColor: '#F2F2F2', paddingVertical: 3, paddingHorizontal: 7, borderRadius: 10 },
  textoTagModerador: { color: '#666', fontFamily: 'REM_Bold', fontSize: 10 },
  separador: { height: 1, backgroundColor: '#F0F0F0' },
  controlesExtra: { paddingTop: 18, paddingHorizontal: 10 },
  linhaSwitch: { flexDirection: 'row', alignItems: 'center', marginBottom: 15 },
  textoSwitch: { marginLeft: 10, flex: 1, fontSize: 14, color: '#555', fontFamily: 'REM_Medium' },
  btnControleSecundario: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 20, marginBottom: 10, alignSelf: 'flex-start', elevation: 1 },
  textoBtnSecundario: { color: '#555', fontFamily: 'REM_Bold', marginLeft: 8 },
  btnControlePerigo: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF5F4', paddingVertical: 12, paddingHorizontal: 15, borderRadius: 20, marginTop: 2, alignSelf: 'flex-start', borderWidth: 1, borderColor: '#FFD8D4' },
  textoBtnPerigo: { color: '#E74C3C', fontFamily: 'REM_Bold', marginLeft: 8 },
  inlineOverlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 25 },
  inlineCard: { width: '100%', backgroundColor: '#FFF', borderRadius: 22, padding: 20, elevation: 10 },
  modalTitulo: { fontSize: 19, fontFamily: 'REM_Bold', color: '#8C77C2', marginBottom: 8 },
  modalSub: { fontSize: 13, color: '#666', fontFamily: 'REM_Regular', lineHeight: 18, marginBottom: 18 },
  inputModal: { borderWidth: 1, borderColor: '#CCC', borderRadius: 10, padding: 11, marginBottom: 18, fontFamily: 'REM_Regular' },
  modalBotoes: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10 },
  btnCancelar: { padding: 10 },
  txtCancelar: { color: '#999', fontFamily: 'REM_Bold' },
  btnSalvar: { backgroundColor: '#8C77C2', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 10 },
  txtSalvar: { color: '#FFF', fontFamily: 'REM_Bold' },
  textoListaVazia: { textAlign: 'center', marginTop: 25, marginHorizontal: 20, color: '#999', fontFamily: 'REM_Regular' },
});
