  import React, { useState, useEffect } from 'react';
  import {
    StyleSheet, Text, View, TouchableOpacity,
    FlatList, Modal, TextInput, ActivityIndicator, Image, ScrollView, KeyboardAvoidingView, Platform
  } from 'react-native';
  import { SafeAreaView } from 'react-native-safe-area-context';
  import { Ionicons } from '@expo/vector-icons';
  import * as ImagePicker from 'expo-image-picker';
  import * as Notifications from 'expo-notifications';
  import { supabase } from '../lib/supabase';
  import { useEstilosTema, usarTema } from '../lib/tema';
import { normalizarImagem, uploadImagemBase64, BUCKETS, removerImagemStorage, isStorageUrl } from '../lib/storage';
  import MenuLateral from './MenuLateral';
  import { Alert } from '../lib/popup';

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });

  const STORAGE_URL = `${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/public/imgs_rotinas`;

  export default function TelaCriarRotina({ route, navigation }) {
    const estilos = useEstilosTema(estilosBase);
    const { cores } = usarTema();
    const { id_usuario } = route.params || {};
    const [menuVisivel, setMenuVisivel] = useState(false);
    const [perfil, setPerfil] = useState({ nome: 'Carregando...', fotoBase64: null });
    const [carregando, setCarregando] = useState(false);
    const [salvando, setSalvando] = useState(false);
    const [idRotina, setIdRotina] = useState(null);
    const [atividades, setAtividades] = useState([]);
    const [atividadesBase, setAtividadesBase] = useState([]);
    const [nomeAtividade, setNomeAtividade] = useState('');
    const [horarioInicio, setHorarioInicio] = useState('');
    const [duracaoMinutos, setDuracaoMinutos] = useState('');
    const [imagemAtividade, setImagemAtividade] = useState(null);
    const [atividadeSelecionada, setAtividadeSelecionada] = useState(null);
    const [editando, setEditando] = useState(false);
    const [permitirNotificacao, setPermitirNotificacao] = useState(true);
    const [modalNovoVisivel, setModalNovoVisivel] = useState(false);
    const [modalVisualizarVisivel, setModalVisualizarVisivel] = useState(false);
    const [modalImagemVisivel, setModalImagemVisivel] = useState(false);

    useEffect(() => {
      solicitarPermissaoNotificacao();
      inicializarDados();
    }, []);

    const solicitarPermissaoNotificacao = async () => {
      try {
        const { status } = await Notifications.requestPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permissão necessária', 'Ative as notificações para receber lembretes das atividades.');
        }
      } catch (e) {
        
      }
    };

    const agendarNotificacoes = async (listaAtividades) => {
      try {
        await Notifications.cancelAllScheduledNotificationsAsync();
        for (const atividade of listaAtividades) {
          if (!atividade.horario_inicio || !atividade.permitir_status) continue;
          const [horas, minutos] = atividade.horario_inicio.split(':').map(Number);
          if (isNaN(horas) || isNaN(minutos)) continue;
          await Notifications.scheduleNotificationAsync({
            content: {
              title: '⏰ Hora da atividade!',
              body: `${atividade.nome_personalizado} está na hora de começar.`,
              sound: true,
            },
            trigger: {
              hour: horas,
              minute: minutos,
              repeats: true,
            },
          });
        }
      } catch (e) {
        console.log('Notificações não suportadas neste ambiente.');
      }
    };

    const inicializarDados = async () => {
      await carregarPerfil();
      await carregarAtividadesBase();
      await carregarDadosRotina();
    };

    const carregarPerfil = async () => {
      try {
        const { data, error } = await supabase.rpc('obter_perfil_usuario', { p_id_usuario: id_usuario });
        if (error) throw error;
        if (data) setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
      } catch (e) { console.error(e); }
    };

    const carregarAtividadesBase = async () => {
      try {
        const { data, error } = await supabase.from('atividades_base').select('*');
        if (error) throw error;
        setAtividadesBase(data || []);
      } catch (e) { console.error(e); }
    };

    const carregarDadosRotina = async () => {
      setCarregando(true);
      try {
        let { data: rotinaData, error: errRotina } = await supabase
          .from('rotinas')
          .select('*')
          .eq('id_usuario', id_usuario)
          .maybeSingle();

        if (errRotina) throw errRotina;

        const dataHoje = new Date().toISOString().split('T')[0];
        let rotinaAtualId = rotinaData?.id_rotina || null;

        if (!rotinaData) {
          const { data: novaRotina, error: errNova } = await supabase
            .from('rotinas')
            .insert({ id_usuario, ultima_atualizacao: dataHoje })
            .select().single();
          if (errNova) throw errNova;
          rotinaAtualId = novaRotina.id_rotina;
        } else if (rotinaData.ultima_atualizacao !== dataHoje) {
          await supabase.from('atividades_rotina')
            .update({ realizado: false })
            .eq('id_rotina', rotinaAtualId);
          await supabase.from('rotinas')
            .update({ ultima_atualizacao: dataHoje })
            .eq('id_rotina', rotinaAtualId);
        }

        setIdRotina(rotinaAtualId);

        const { data: dataAtividades, error: errAtividades } = await supabase
          .from('atividades_rotina')
          .select('*')
          .eq('id_rotina', rotinaAtualId)
          .order('horario_inicio', { ascending: true });

        if (errAtividades) throw errAtividades;
        const lista = dataAtividades || [];
        setAtividades(lista);
        agendarNotificacoes(lista);
      } catch (e) {
        console.error('Erro ao carregar rotina:', e.message);
      } finally {
        setCarregando(false);
      }
    };

    const formatarHorario = (texto) => {
      const numeros = texto.replace(/\D/g, '');
      if (numeros.length <= 2) return numeros;
      if (numeros.length <= 4) return `${numeros.slice(0, 2)}:${numeros.slice(2)}`;
      return `${numeros.slice(0, 2)}:${numeros.slice(2, 4)}`;
    };

    const manipularImagem = async (origem) => {
      setModalImagemVisivel(false);
      try {
        let resultado;
        if (origem === 'camera') {
          const perm = await ImagePicker.requestCameraPermissionsAsync();
          if (perm.status !== 'granted') return;
          resultado = await ImagePicker.launchCameraAsync({ allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
        } else {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (perm.status !== 'granted') return;
          resultado = await ImagePicker.launchImageLibraryAsync({ 
            mediaTypes: ['images'], 
            allowsEditing: true, 
            aspect: [1, 1], 
            quality: 0.5, 
            base64: true 
          });
        }
        if (!resultado.canceled && resultado.assets?.length > 0) {
          setImagemAtividade(resultado.assets[0].base64);
        }
      } catch (e) { console.error(e); }
    };

    const uploadImagemStorage = async (base64) => {
      if (!base64) return null;
      const upload = await uploadImagemBase64({
        bucket: BUCKETS.ROTINAS,
        pasta: id_usuario,
        base64,
        mimeType: 'image/jpeg',
        nomeBase: 'rotina',
      });
      return upload.publicUrl;
    };

    const adicionarAtividadeBase = async (atividadeBase) => {
      if (!idRotina) return;
      try {
        const { error } = await supabase.from('atividades_rotina').insert({
          id_rotina: idRotina,
          nome_personalizado: atividadeBase.nome,
          imagem_personalizada: atividadeBase.imagem,
          horario_inicio: '08:00',
          duracao_minutos: null,
          permitir_status: true,
          realizado: false,
        });
        if (error) throw error;
        await carregarDadosRotina();
      } catch (e) { console.error(e); }
    };

     const salvarAtividade = async () => {
  if (!nomeAtividade.trim()) return;
  setSalvando(true);
  let novaImagem = null;
  try {
    let urlImagem = null;
    if (imagemAtividade) {
      urlImagem = await uploadImagemStorage(imagemAtividade);
      novaImagem = urlImagem;
    }
    const { error } = await supabase.from('atividades_rotina').insert({
      id_rotina: idRotina,
      nome_personalizado: nomeAtividade.trim(),
      horario_inicio: horarioInicio || '00:00',
      duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos, 10) : null,
      imagem_personalizada: urlImagem,
      permitir_status: permitirNotificacao,
      realizado: false,
    });
    if (error) throw error;
    novaImagem = null;
    encerrarFormulario();
    await carregarDadosRotina();
  } catch (e) {
    console.error(e);
    if (novaImagem) {
      await removerImagemStorage(novaImagem, BUCKETS.ROTINAS);
    }
    Alert.alert('Atividade não salva', 'Não foi possível salvar a atividade agora.');
  }
  finally { setSalvando(false); }
};

    const salvarEdicao = async () => {
      if (!nomeAtividade.trim() || !atividadeSelecionada) return;
      setSalvando(true);
      let novaImagem = null;
      let imagemPersistida = false;

      try {
        let urlImagem = atividadeSelecionada.imagem_personalizada || null;

        if (imagemAtividade && !isStorageUrl(imagemAtividade)) {
          novaImagem = await uploadImagemStorage(imagemAtividade);
          urlImagem = novaImagem;
        } else if (urlImagem && !isStorageUrl(urlImagem)) {
          // Migração transparente de uma imagem antiga que ainda esteja gravada como Base64.
          novaImagem = await uploadImagemStorage(urlImagem);
          urlImagem = novaImagem;
        }

        const { error } = await supabase
          .from('atividades_rotina')
          .update({
            nome_personalizado: nomeAtividade.trim(),
            horario_inicio: horarioInicio || '00:00',
            duracao_minutos: duracaoMinutos ? parseInt(duracaoMinutos, 10) : null,
            imagem_personalizada: urlImagem,
            permitir_status: permitirNotificacao,
          })
          .eq('id_atividade_rotina', atividadeSelecionada.id_atividade_rotina);

        if (error) throw error;
        imagemPersistida = true;

        if (novaImagem && atividadeSelecionada.imagem_personalizada) {
          await removerImagemStorage(atividadeSelecionada.imagem_personalizada, BUCKETS.ROTINAS);
        }

        setEditando(false);
        setModalVisualizarVisivel(false);
        await carregarDadosRotina();
      } catch (e) {
        console.error(e);
        if (novaImagem && !imagemPersistida) await removerImagemStorage(novaImagem, BUCKETS.ROTINAS);
        Alert.alert('Imagem não salva', 'Não foi possível salvar a atividade agora.');
      } finally {
        setSalvando(false);
      }
    };

    const excluirAtividade = async () => {
      if (!atividadeSelecionada) return;
      try {
        const { error } = await supabase
          .from('atividades_rotina')
          .delete()
          .eq('id_atividade_rotina', atividadeSelecionada.id_atividade_rotina);

        if (error) throw error;

        if (atividadeSelecionada.imagem_personalizada) {
          await removerImagemStorage(atividadeSelecionada.imagem_personalizada, BUCKETS.ROTINAS);
        }

        setModalVisualizarVisivel(false);
        setAtividadeSelecionada(null);
        await carregarDadosRotina();
      } catch (e) {
        console.error(e);
        Alert.alert('Atividade não excluída', 'Não foi possível excluir a atividade agora.');
      }
    };

    const alternarRealizado = async (item) => {
      try {
        const { error } = await supabase
          .from('atividades_rotina')
          .update({ realizado: !item.realizado })
          .eq('id_atividade_rotina', item.id_atividade_rotina);
        if (error) throw error;
        await carregarDadosRotina();
      } catch (e) { console.error(e); }
    };

     const abrirAtividade = (item) => {
  setAtividadeSelecionada(item);
  setNomeAtividade(item.nome_personalizado || '');
  setHorarioInicio(item.horario_inicio?.slice(0, 5) || '');
  setDuracaoMinutos(item.duracao_minutos ? String(item.duracao_minutos) : '');
  setImagemAtividade(null);
  setPermitirNotificacao(item.permitir_status ?? true);
  setEditando(false);
  setModalVisualizarVisivel(true);
};

    const encerrarFormulario = () => {
      setNomeAtividade('');
      setHorarioInicio('');
      setDuracaoMinutos('');
      setImagemAtividade(null);
      setPermitirNotificacao(true);
      setModalNovoVisivel(false);
     };

    const imagemAtual = (item) => {
      if (!item || !item.imagem_personalizada) return null;
      return normalizarImagem(item.imagem_personalizada);
    };

    return (
      <SafeAreaView style={estilos.telaPrincipal}>
        <View style={estilos.headerContainer}>
          <View style={estilos.headerEsquerda}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={estilos.iconeBotao}>
              <Ionicons name="arrow-back" size={24} color="#8C77C2" />
            </TouchableOpacity>
            <Text style={estilos.tituloHeader}>Minha Rotina</Text>
          </View>
          <TouchableOpacity style={estilos.iconeBotao} onPress={() => { encerrarFormulario(); setModalNovoVisivel(true); }}>
            <Ionicons name="add" size={26} color="#8C77C2" />
          </TouchableOpacity>
        </View>

        {carregando ? (
          <ActivityIndicator size="large" color="#8C77C2" style={{ marginTop: 50 }} />
        ) : (
          <FlatList
            data={atividades}
            keyExtractor={(item) => item.id_atividade_rotina.toString()}
            contentContainerStyle={{ paddingBottom: 100, paddingTop: 10 }}
            ListHeaderComponent={
              atividadesBase.length > 0 && (
                <View style={estilos.secaoBase}>
                  <Text style={estilos.tituloSecao}>Atividades sugeridas</Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10, paddingHorizontal: 20 }}>
                    {atividadesBase.map((ab) => (
                      <TouchableOpacity key={ab.id_atividade_base} style={estilos.cardBase} onPress={() => adicionarAtividadeBase(ab)}>
                        {ab.imagem ? (
                          <Image source={{ uri: ab.imagem }} style={estilos.imagemBase} resizeMode="contain" />
                        ) : (
                          <View style={[estilos.imagemBase, { backgroundColor: '#EDE0FF', justifyContent: 'center', alignItems: 'center' }]}>
                            <Ionicons name="image-outline" size={24} color="#8C77C2" />
                          </View>
                        )}
                        <Text style={estilos.txtBase} numberOfLines={2}>{ab.nome}</Text>
                        <View style={estilos.btnAddBase}>
                          <Ionicons name="add" size={14} color="#FFF" />
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={estilos.tituloSecao}>Atividades do dia</Text>
                </View>
              )
            }
            renderItem={({ item }) => (
              <TouchableOpacity style={estilos.cardAtividade} activeOpacity={0.8} onPress={() => abrirAtividade(item)}>
                {imagemAtual(item) ? (
                  <Image source={imagemAtual(item)} style={estilos.imagemCard} resizeMode="contain" />
                ) : (
                  <View style={[estilos.imagemCard, { backgroundColor: '#F0EBF8', justifyContent: 'center', alignItems: 'center' }]}>
                    <Ionicons name="image-outline" size={32} color="#8C77C2" />
                  </View>
                )}
                <View style={estilos.infoCard}>
                  <Text style={[estilos.nomeCard, item.realizado && { textDecorationLine: 'line-through', color: '#999' }]}>
                    {item.nome_personalizado}
                  </Text>
                  {item.horario_inicio && (
                    <Text style={estilos.horarioCard}>{item.horario_inicio?.slice(0, 5)}</Text>
                  )}
                  {item.duracao_minutos ? (
                    <Text style={estilos.duracaoCard}>{item.duracao_minutos}min</Text>
                  ) : null}
                </View>
                {item.permitir_status && (
                  <TouchableOpacity onPress={() => alternarRealizado(item)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                    <Ionicons
                      name={item.realizado ? 'checkmark-circle' : 'ellipse-outline'}
                      size={28}
                      color={item.realizado ? '#4CAF50' : '#8C77C2'}
                    />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            )}
            ListEmptyComponent={
              <Text style={estilos.textoVazio}>Nenhuma atividade cadastrada ainda.</Text>
            }
          />
        )}

        <MenuLateral
          visivel={menuVisivel}
          aoFechar={() => setMenuVisivel(false)}
          navigation={navigation}
          id_usuario={id_usuario}
          perfil={perfil}
        />


        <Modal visible={modalNovoVisivel} transparent animationType="slide" onRequestClose={encerrarFormulario}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={estilos.modalOverlay}>
            <View style={estilos.modalContainer}>
              <View style={estilos.modalHeader}>
                <Ionicons name="add-circle-outline" size={20} color="#8C77C2" />
                <Text style={estilos.modalTitulo}>Nova Atividade</Text>
                <TouchableOpacity onPress={encerrarFormulario}>
                  <Ionicons name="close" size={24} color="#BDBDBD" />
                </TouchableOpacity>
              </View>

              <TouchableOpacity style={estilos.areaImagem} onPress={() => setModalImagemVisivel(true)}>
                {imagemAtividade ? (
                  <Image source={{ uri: `data:image/jpeg;base64,${imagemAtividade}` }} style={estilos.imagemPreview} />
                ) : (
                  <View style={estilos.placeholderImagem}>
                    <Ionicons name="camera-outline" size={32} color="#8C77C2" />
                    <Text style={estilos.txtPlaceholder}>Adicionar imagem</Text>
                  </View>
                )}
              </TouchableOpacity>

              <TextInput
                style={estilos.input}
                placeholder="Nome da atividade"
                placeholderTextColor="#BDBDBD"
                value={nomeAtividade}
                onChangeText={setNomeAtividade}
              />

              <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                <View style={[estilos.inputRow, { flex: 1 }]}>
                  <Ionicons name="time-outline" size={16} color="#BDBDBD" />
                  <TextInput
                    style={estilos.inputInline}
                    placeholder="HH:MM"
                    placeholderTextColor="#BDBDBD"
                    value={horarioInicio}
                    onChangeText={(t) => { const f = formatarHorario(t); if (f.length <= 5) setHorarioInicio(f); }}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={[estilos.inputRow, { flex: 1 }]}>
                  <Ionicons name="timer-outline" size={16} color="#BDBDBD" />
                  <TextInput
                    style={estilos.inputInline}
                    placeholder="min"
                    placeholderTextColor="#BDBDBD"
                    value={duracaoMinutos}
                    onChangeText={setDuracaoMinutos}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <TouchableOpacity
  style={estilos.toggleNotificacao}
  onPress={() => setPermitirNotificacao(!permitirNotificacao)}
>
  <Ionicons
    name={permitirNotificacao ? 'notifications' : 'notifications-off-outline'}
    size={20}
    color={permitirNotificacao ? '#8C77C2' : '#BDBDBD'}
  />
  <Text style={[estilos.txtToggle, { color: permitirNotificacao ? '#8C77C2' : '#BDBDBD' }]}>
    {permitirNotificacao ? 'Notificação ativada' : 'Notificação desativada'}
  </Text>
  <Ionicons
    name={permitirNotificacao ? 'checkbox' : 'square-outline'}
    size={22}
    color={permitirNotificacao ? '#8C77C2' : '#BDBDBD'}
  />
</TouchableOpacity>

              <TouchableOpacity style={estilos.btnSalvar} onPress={salvarAtividade} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#FFF" /> : (
                  <>
                    <Ionicons name="checkmark" size={18} color="#FFF" />
                    <Text style={estilos.txtBtnSalvar}>Salvar atividade</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </Modal>


        <Modal visible={modalVisualizarVisivel} transparent animationType="fade" onRequestClose={() => setModalVisualizarVisivel(false)}>
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={estilos.modalCentralOverlay}>
            <TouchableOpacity style={{flex: 1, width: '100%', justifyContent: 'center', alignItems: 'center'}} activeOpacity={1} onPress={() => setModalVisualizarVisivel(false)}>
              <TouchableOpacity activeOpacity={1} onPress={() => {}} style={{width: '100%'}}>
                <View style={estilos.modalCentral}>
                  <View style={estilos.modalHeader}>
                    <Ionicons name="list-outline" size={18} color="#8C77C2" />
                    <Text style={estilos.modalTitulo}>{editando ? 'Editar' : 'Detalhes'}</Text>
                    <TouchableOpacity onPress={() => setModalVisualizarVisivel(false)}>
                      <Ionicons name="close" size={22} color="#BDBDBD" />
                    </TouchableOpacity>
                  </View>

                  {editando ? (
                    <>
                      <TouchableOpacity style={estilos.areaImagem} onPress={() => setModalImagemVisivel(true)}>
                        {imagemAtividade ? (
                          <Image source={{ uri: `data:image/jpeg;base64,${imagemAtividade}` }} style={estilos.imagemPreview} />
                        ) : atividadeSelecionada?.imagem_personalizada ? (
                          <Image source={imagemAtual(atividadeSelecionada)} style={estilos.imagemPreview} resizeMode="contain" />
                        ) : (
                          <View style={estilos.placeholderImagem}>
                            <Ionicons name="camera-outline" size={32} color="#8C77C2" />
                            <Text style={estilos.txtPlaceholder}>Adicionar imagem</Text>
                          </View>
                        )}
                      </TouchableOpacity>

                      <TextInput
                        style={estilos.input}
                        placeholder="Nome da atividade"
                        placeholderTextColor="#BDBDBD"
                        value={nomeAtividade}
                        onChangeText={setNomeAtividade}
                      />

                      <View style={{ flexDirection: 'row', gap: 10, marginBottom: 16 }}>
                        <View style={[estilos.inputRow, { flex: 1 }]}>
                          <Ionicons name="time-outline" size={16} color="#BDBDBD" />
                          <TextInput
                            style={estilos.inputInline}
                            placeholder="HH:MM"
                            placeholderTextColor="#BDBDBD"
                            value={horarioInicio}
                            onChangeText={(t) => { const f = formatarHorario(t); if (f.length <= 5) setHorarioInicio(f); }}
                            keyboardType="numeric"
                            maxLength={5}
                          />
                        </View>
                        <View style={[estilos.inputRow, { flex: 1 }]}>
                          <Ionicons name="timer-outline" size={16} color="#BDBDBD" />
                          <TextInput
                            style={estilos.inputInline}
                            placeholder="min"
                            placeholderTextColor="#BDBDBD"
                            value={duracaoMinutos}
                            onChangeText={setDuracaoMinutos}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      <TouchableOpacity
  style={estilos.toggleNotificacao}
  onPress={() => setPermitirNotificacao(!permitirNotificacao)}
>
  <Ionicons
    name={permitirNotificacao ? 'notifications' : 'notifications-off-outline'}
    size={20}
    color={permitirNotificacao ? '#8C77C2' : '#BDBDBD'}
  />
  <Text style={[estilos.txtToggle, { color: permitirNotificacao ? '#8C77C2' : '#BDBDBD' }]}>
    {permitirNotificacao ? 'Notificação ativada' : 'Notificação desativada'}
  </Text>
  <Ionicons
    name={permitirNotificacao ? 'checkbox' : 'square-outline'}
    size={22}
    color={permitirNotificacao ? '#8C77C2' : '#BDBDBD'}
  />
</TouchableOpacity>

                      <TouchableOpacity style={estilos.btnSalvar} onPress={salvarEdicao} disabled={salvando}>
                        {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.txtBtnSalvar}>Salvar</Text>}
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      {atividadeSelecionada?.imagem_personalizada && (
                        <View style={estilos.containerImagemDetalhe}>
                          <Image source={imagemAtual(atividadeSelecionada)} style={estilos.imagemDetalhe} resizeMode="contain" />
                        </View>
                      )}
                      <Text style={estilos.nomeDetalhe}>{atividadeSelecionada?.nome_personalizado}</Text>
                      {atividadeSelecionada?.horario_inicio && (
                        <Text style={estilos.infoDetalhe}>Início: {atividadeSelecionada.horario_inicio?.slice(0, 5)}</Text>
                      )}
                      {atividadeSelecionada?.duracao_minutos && (
                        <Text style={estilos.infoDetalhe}>Duração: {atividadeSelecionada.duracao_minutos} minutos</Text>
                      )}
                      <View style={[estilos.botoesVisualizacao, { marginTop: 15 }]}>
                        <TouchableOpacity style={estilos.btnModificar} onPress={() => setEditando(true)}>
                          <Ionicons name="pencil" size={16} color="#8C77C2" />
                          <Text style={estilos.txtBtnModificar}>Editar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={estilos.btnExcluir} onPress={excluirAtividade}>
                          <Ionicons name="trash-outline" size={16} color="#FFF" />
                          <Text style={estilos.txtBtnExcluir}>Excluir</Text>
                        </TouchableOpacity>
                      </View>
                    </>
                  )}
                </View>
              </TouchableOpacity>
            </TouchableOpacity>
          </KeyboardAvoidingView>
        </Modal>

        <Modal visible={modalImagemVisivel} transparent animationType="fade" onRequestClose={() => setModalImagemVisivel(false)}>
          <TouchableOpacity style={estilos.modalCentralOverlay} activeOpacity={1} onPress={() => setModalImagemVisivel(false)}>
            <TouchableOpacity activeOpacity={1} onPress={() => {}}>
              <View style={estilos.modalCentral}>
                <Text style={estilos.modalTitulo}>Escolher imagem</Text>
                <TouchableOpacity style={estilos.opcaoImagem} onPress={() => manipularImagem('galeria')}>
                  <Ionicons name="images-outline" size={22} color="#8C77C2" />
                  <Text style={estilos.txtOpcaoImagem}>Abrir galeria</Text>
                </TouchableOpacity>
                <TouchableOpacity style={estilos.opcaoImagem} onPress={() => manipularImagem('camera')}>
                  <Ionicons name="camera-outline" size={22} color="#8C77C2" />
                  <Text style={estilos.txtOpcaoImagem}>Tirar foto</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

      </SafeAreaView>
    );
  }

 const estilosBase = StyleSheet.create({
  telaPrincipal: { 
    flex: 1, 
    backgroundColor: '#FAFAFC' 
  },
  secaoBase: { 
    paddingTop: 10, 
    paddingBottom: 5 
  },
  tituloSecao: { 
    fontSize: 15, 
    fontFamily: 'REM_Bold', 
    color: '#333', 
    paddingHorizontal: 20, 
    marginBottom: 10, 
    marginTop: 5 
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
    justifyContent: 'space-between', 
    paddingHorizontal: 20, 
    paddingTop: 10, 
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
    fontWeight: 'bold', 
    marginLeft: 10 
  },
  iconeBotao: { 
    padding: 5 
  },
  cardBase: { 
    width: 90, 
    alignItems: 'center', 
    backgroundColor: '#FFF', 
    borderRadius: 14, 
    padding: 8, 
    borderWidth: 1, 
    borderColor: '#E8E0FF', 
    elevation: 1, 
    position: 'relative' 
  },
  imagemBase: { 
    width: 60, 
    height: 60, 
    borderRadius: 10 
  },
  txtBase: { 
    fontSize: 11, 
    fontFamily: 'REM_Medium', 
    color: '#333', 
    textAlign: 'center', 
    marginTop: 4 
  },
  btnAddBase: { 
    position: 'absolute', 
    top: 4, 
    right: 4, 
    backgroundColor: '#8C77C2', 
    borderRadius: 8, 
    width: 16, 
    height: 16, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  cardAtividade: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FFFFFF', 
    marginHorizontal: 20, 
    marginBottom: 14, 
    borderRadius: 16, 
    borderWidth: 1.5, 
    borderColor: '#E8E0FF', 
    overflow: 'hidden', 
    elevation: 2, 
    padding: 12, 
    gap: 12 
  },
  imagemCard: { 
    width: 70, 
    height: 70, 
    borderRadius: 12 
  },
  infoCard: { 
    flex: 1 
  },
  nomeCard: { 
    fontSize: 15, 
    fontFamily: 'REM_Bold', 
    color: '#333', 
    fontWeight: '700' 
  },
  horarioCard: { 
    fontSize: 14, 
    fontFamily: 'REM_Bold', 
    color: '#8C77C2', 
    marginTop: 2 
  },
  duracaoCard: { 
    fontSize: 12, 
    fontFamily: 'REM_Regular', 
    color: '#999', 
    marginTop: 2 
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
    padding: 24 
  },
  modalCentralOverlay: { 
    flex: 1, 
    backgroundColor: 'rgba(0,0,0,0.5)', 
    justifyContent: 'center', 
    alignItems: 'center', 
    padding: 20 
  },
  modalCentral: { 
    backgroundColor: '#FFF', 
    borderRadius: 20, 
    padding: 20, 
    width: '100%' 
  },
  modalHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: 16, 
    gap: 8 
  },
  modalTitulo: { 
    flex: 1, 
    fontSize: 16, 
    fontFamily: 'REM_Bold', 
    color: '#8C77C2', 
    marginLeft: 8 
  },
  areaImagem: { 
    width: '100%', 
    height: 140, 
    borderRadius: 16, 
    overflow: 'hidden', 
    marginBottom: 14, 
    borderWidth: 1, 
    borderColor: '#F0F0F0' 
  },
  imagemPreview: { 
    width: '100%', 
    height: '100%' 
  },
  placeholderImagem: { 
    flex: 1, 
    backgroundColor: '#F3EEFF', 
    justifyContent: 'center', 
    alignItems: 'center', 
    gap: 6 
  },
  txtPlaceholder: { 
    fontSize: 13, 
    fontFamily: 'REM_Medium', 
    color: '#8C77C2' 
  },
  opcaoImagem: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 12, 
    paddingVertical: 14, 
    borderBottomWidth: 1, 
    borderBottomColor: '#F0F0F0' 
  },
  txtOpcaoImagem: { 
    fontSize: 15, 
    fontFamily: 'REM_Medium', 
    color: '#333' 
  },
  input: { 
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
  inputRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    backgroundColor: '#FAFAFC', 
    borderRadius: 12, 
    paddingHorizontal: 12, 
    paddingVertical: 4, 
    borderWidth: 1, 
    borderColor: '#F0F0F0', 
    gap: 6 
  },
  inputInline: { 
    flex: 1, 
    fontSize: 14, 
    fontFamily: 'REM_Regular', 
    color: '#333', 
    paddingVertical: 10 
  },
  toggleNotificacao: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    borderRadius: 12,
    paddingHorizontal: 14,
    backgroundColor: '#FAFAFC',
  },
  txtToggle: {
    flex: 1,
    fontSize: 14,
    fontFamily: 'REM_Medium',
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
  containerImagemDetalhe: { 
    width: '100%', 
    height: 160, 
    borderRadius: 12, 
    backgroundColor: '#F9F9F9', 
    overflow: 'hidden', 
    marginBottom: 12 
  },
  imagemDetalhe: { 
    width: '100%', 
    height: '100%' 
  },
  nomeDetalhe: { 
    fontSize: 16, 
    fontFamily: 'REM_Bold', 
    color: '#333', 
    marginBottom: 4 
  },
  infoDetalhe: { 
    fontSize: 14, 
    fontFamily: 'REM_Regular', 
    color: '#555', 
    lineHeight: 22 
  },
});