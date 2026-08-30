import React, { useState, useEffect } from 'react';
import {
  StyleSheet, Text, View, TouchableOpacity, SafeAreaView, FlatList,
  Dimensions, Modal, TextInput, ScrollView, ActivityIndicator,
  KeyboardAvoidingView, Platform, Alert, BackHandler
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import DateTimePicker from '@react-native-community/datetimepicker';
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
  const [registros, setRegistros] = useState([]);
  const [pastas, setPastas] = useState([]);
  const [pastaAtual, setPastaAtual] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [modalNovoRegistro, setModalNovoRegistro] = useState(false);
  const [modalNovaPasta, setModalNovaPasta] = useState(false);
  const [modalVisualizar, setModalVisualizar] = useState(false);
  
  const [editandoId, setEditandoId] = useState(null);
  const [dataCrise, setDataCrise] = useState('');
  const [mostrarPickerData, setMostrarPickerData] = useState(false);
  const [horarioInicio, setHorarioInicio] = useState('');
  const [duracao, setDuracao] = useState('');
  const [local, setLocal] = useState('');
  const [gatilho, setGatilho] = useState('');
  const [comportamentos, setComportamentos] = useState('');
  const [intensidade, setIntensidade] = useState('');
  const [estrategias, setEstrategias] = useState('');
  const [resultado, setResultado] = useState('');
  const [estadoApos, setEstadoApos] = useState('');
  const [observacoes, setObservacoes] = useState('');
  const [pastaSelecionadaId, setPastaSelecionadaId] = useState(null);

  const [nomePastaNova, setNomePastaNova] = useState('');
  const [registroSelecionado, setRegistroSelecionado] = useState(null);

  // Tratamento do botão de voltar físico do Android
  useEffect(() => {
    const backAction = () => {
      if (pastaAtual !== null) {
        setPastaAtual(null);
        return true; // Impede o comportamento padrão (sair da tela)
      }
      return false; // Permite o comportamento padrão (voltar de tela)
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [pastaAtual]);

  useEffect(() => {
    carregarPerfil();
    carregarDados();
  }, [id_usuario, pastaAtual]);

  const carregarPerfil = async () => {
    try {
      const { data, error } = await supabase.rpc('obter_perfil_usuario', { p_id_usuario: id_usuario });
      if (data && !error) setPerfil({ nome: data.nome, fotoBase64: data.foto_base64 });
    } catch (e) { console.error(e); }
  };

  const carregarDados = async () => {
    setCarregando(true);
    try {
      // Só recarrega as pastas se estiver na raiz para otimizar
      if (pastaAtual === null) {
        const { data: resPastas } = await supabase.from('pasta_reg_crise').select('*').eq('id_usuario', id_usuario);
        setPastas(resPastas || []);
      }

      let queryReg = supabase.from('registros_crise').select('*').eq('id_usuario', id_usuario);
      if (pastaAtual === null) {
        queryReg = queryReg.is('id_pasta', null);
      } else {
        queryReg = queryReg.eq('id_pasta', pastaAtual);
      }
      
      const { data: resReg, error: errReg } = await queryReg.order('criado_em', { ascending: false });
      if (errReg) throw errReg;
      setRegistros(resReg || []);
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  const criarPasta = async () => {
    if (!nomePastaNova.trim()) return;
    try {
      const { error } = await supabase.from('pasta_reg_crise').insert({ id_usuario, nome: nomePastaNova.trim() });
      if (error) throw error;
      setNomePastaNova('');
      setModalNovaPasta(false);
      carregarDados();
    } catch (e) { console.error(e); }
  };

  const excluirPastaAtual = () => {
    Alert.alert(
      "Excluir Pasta",
      "Deseja excluir esta pasta? Os registros dentro dela podem ser apagados ou enviados para a tela principal.",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Excluir pasta e registros", 
          style: "destructive",
          onPress: async () => {
            try {
              // Deleta os registros da pasta primeiro
              await supabase.from('registros_crise').delete().eq('id_pasta', pastaAtual);
              // Deleta a pasta
              const { error } = await supabase.from('pasta_reg_crise').delete().eq('id_pasta', pastaAtual);
              if (error) throw error;
              setPastaAtual(null);
              carregarDados();
            } catch (e) { console.error(e); }
          }
        },
        { 
          text: "Apenas a pasta (manter registros)", 
          onPress: async () => {
            try {
              // Libera os registros para a raiz (null)
              await supabase.from('registros_crise').update({ id_pasta: null }).eq('id_pasta', pastaAtual);
              // Deleta a pasta
              const { error } = await supabase.from('pasta_reg_crise').delete().eq('id_pasta', pastaAtual);
              if (error) throw error;
              setPastaAtual(null);
              carregarDados();
            } catch (e) { console.error(e); }
          }
        }
      ]
    );
  };

  const handleDataChange = (text) => {
    let formatado = text.replace(/\D/g, '');
    if (formatado.length > 2) formatado = formatado.replace(/^(\d{2})(\d)/, '$1/$2');
    if (formatado.length > 5) formatado = formatado.replace(/^(\d{2})\/(\d{2})(\d)/, '$1/$2/$3');
    setDataCrise(formatado.substring(0, 10));
  };

  const onChangePickerData = (event, selectedDate) => {
    setMostrarPickerData(Platform.OS === 'ios');
    if (selectedDate) {
      const dia = String(selectedDate.getDate()).padStart(2, '0');
      const mes = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const ano = selectedDate.getFullYear();
      setDataCrise(`${dia}/${mes}/${ano}`);
    }
  };

  const handleHorarioChange = (text) => {
    let formatado = text.replace(/\D/g, '');
    if (formatado.length > 2) formatado = formatado.replace(/^(\d{2})(\d)/, '$1:$2');
    setHorarioInicio(formatado.substring(0, 5));
  };

  const validarData = (dataString) => {
    if (!dataString) return true;
    const partes = dataString.split('/');
    if (partes.length !== 3) return false;
    
    const dia = parseInt(partes[0], 10);
    const mes = parseInt(partes[1], 10);
    const ano = parseInt(partes[2], 10);
    const anoAtual = new Date().getFullYear();

    const dataObj = new Date(ano, mes - 1, dia);
    return (
      dataObj.getFullYear() === ano &&
      dataObj.getMonth() === mes - 1 &&
      dataObj.getDate() === dia &&
      ano >= 2000 && 
      ano <= anoAtual + 1
    );
  };

  const salvarRegistro = async () => {
    if (dataCrise && !validarData(dataCrise)) {
      Alert.alert("Data inválida", "A data informada não existe ou é irreal.");
      return;
    }

    setSalvando(true);
    try {
      let dataBanco = null;
      if (dataCrise) {
        const partes = dataCrise.split('/');
        dataBanco = `${partes[2]}-${partes[1]}-${partes[0]}`;
      }

      const dadosPayload = {
        id_usuario,
        id_pasta: pastaSelecionadaId,
        data_crise: dataBanco || new Date().toISOString().split('T')[0],
        horario_inicio: horarioInicio ? (horarioInicio.length === 5 ? `${horarioInicio}:00` : horarioInicio) : null,
        duracao_aproximada: duracao ? parseInt(duracao, 10) : null,
        local: local || null,
        possivel_gatilho: gatilho || null,
        comportamentos_observados: comportamentos || null,
        intensidade: intensidade || null,
        estrategias_utilizadas: estrategias || null,
        resultado: resultado || null,
        estado_apos_crise: estadoApos || null,
        observacoes: observacoes || null,
      };

      if (editandoId) {
        const { error } = await supabase.from('registros_crise').update(dadosPayload).eq('id_registro_crise', editandoId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('registros_crise').insert([dadosPayload]);
        if (error) throw error;
      }

      fecharModalNovo();
      carregarDados();
    } catch (e) {
      console.error(e);
    } finally {
      setSalvando(false);
    }
  };

  const excluirRegistro = async (id) => {
    try {
      const { error } = await supabase.from('registros_crise').delete().eq('id_registro_crise', id);
      if (error) throw error;
      setModalVisualizar(false);
      carregarDados();
    } catch (e) { console.error(e); }
  };

  const abrirEdicao = (item) => {
    setEditandoId(item.id_registro_crise);
    let dataForm = '';
    if (item.data_crise) {
      const partes = item.data_crise.split('-');
      if (partes.length === 3) dataForm = `${partes[2]}/${partes[1]}/${partes[0]}`;
    }
    setDataCrise(dataForm);
    setHorarioInicio(item.horario_inicio ? item.horario_inicio.substring(0, 5) : '');
    setDuracao(item.duracao_aproximada !== null ? item.duracao_aproximada.toString() : '');
    setLocal(item.local || '');
    setGatilho(item.possivel_gatilho || '');
    setComportamentos(item.comportamentos_observados || '');
    setIntensidade(item.intensidade || '');
    setEstrategias(item.estrategias_utilizadas || '');
    setResultado(item.resultado || '');
    setEstadoApos(item.estado_apos_crise || '');
    setObservacoes(item.observacoes || '');
    setPastaSelecionadaId(item.id_pasta || null);
    setModalVisualizar(false);
    setModalNovoRegistro(true);
  };

  const fecharModalNovo = () => {
    setEditandoId(null);
    setDataCrise('');
    setHorarioInicio('');
    setDuracao('');
    setLocal('');
    setGatilho('');
    setComportamentos('');
    setIntensidade('');
    setEstrategias('');
    setResultado('');
    setEstadoApos('');
    setObservacoes('');
    setPastaSelecionadaId(null);
    setModalNovoRegistro(false);
  };

  const exportarPDF = async (item) => {
    try {
      const htmlContent = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', sans-serif; padding: 24px; color: #333; }
              h1 { color: #8C77C2; font-size: 24px; border-bottom: 2px solid #EDE0FF; padding-bottom: 8px; }
              .section { margin-bottom: 14px; }
              .label { font-weight: bold; color: #555; font-size: 12px; text-transform: uppercase; }
              .value { font-size: 16px; margin-top: 2px; }
            </style>
          </head>
          <body>
            <h1>Registro de Crise</h1>
            <div class="section"><div class="label">Data</div><div class="value">${item.data_crise ? item.data_crise.split('-').reverse().join('/') : '-'}</div></div>
            <div class="section"><div class="label">Horário de Início</div><div class="value">${item.horario_inicio ? item.horario_inicio.substring(0, 5) : '-'}</div></div>
            <div class="section"><div class="label">Duração Aproximada (min)</div><div class="value">${item.duracao_aproximada !== null ? item.duracao_aproximada : '-'}</div></div>
            <div class="section"><div class="label">Local</div><div class="value">${item.local || '-'}</div></div>
            <div class="section"><div class="label">Possível Gatilho</div><div class="value">${item.possivel_gatilho || '-'}</div></div>
            <div class="section"><div class="label">Comportamentos Observados</div><div class="value">${item.comportamentos_observados || '-'}</div></div>
            <div class="section"><div class="label">Intensidade da Crise</div><div class="value">${item.intensidade || '-'}</div></div>
            <div class="section"><div class="label">Estratégias Utilizadas</div><div class="value">${item.estrategias_utilizadas || '-'}</div></div>
            <div class="section"><div class="label">Resultado</div><div class="value">${item.resultado || '-'}</div></div>
            <div class="section"><div class="label">Estado Após a Crise</div><div class="value">${item.estado_apos_crise || '-'}</div></div>
            <div class="section"><div class="label">Observações Adicionais</div><div class="value">${item.observacoes || '-'}</div></div>
          </body>
        </html>
      `;
      const { uri } = await Print.printToFileAsync({ html: htmlContent });
      await Sharing.shareAsync(uri);
    } catch (e) { console.error(e); }
  };

  const dadosLista = pastaAtual === null 
    ? [...pastas.map(p => ({ ...p, tipo: 'pasta' })), ...registros.map(r => ({ ...r, tipo: 'registro' }))]
    : [...registros.map(r => ({ ...r, tipo: 'registro' }))];

  return (
    <SafeAreaView style={estilos.telaPrincipal}>
      <View style={estilos.headerContainer}>
        <View style={estilos.headerEsquerda}>
          <TouchableOpacity onPress={() => pastaAtual !== null ? setPastaAtual(null) : navigation.goBack()} style={estilos.iconeBotao}>
            <Ionicons name="arrow-back" size={24} color="#8C77C2" />
          </TouchableOpacity>
          <Text style={estilos.tituloHeader}>{pastaAtual === null ? 'Registrar crises' : 'Registros da pasta'}</Text>
        </View>
        
        {/* Botão de apagar pasta se estiver dentro de uma */}
        {pastaAtual !== null && (
          <TouchableOpacity onPress={excluirPastaAtual} style={estilos.iconeBotao}>
            <Ionicons name="trash-outline" size={22} color="#E53935" />
          </TouchableOpacity>
        )}
      </View>

      <FlatList
        data={dadosLista}
        keyExtractor={(item) => (item.tipo === 'pasta' ? `pasta_${item.id_pasta}` : `reg_${item.id_registro_crise}`)}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListHeaderComponent={
          <View style={estilos.barraAcoes}>
            <TouchableOpacity style={estilos.btnFiltrar}>
              <Ionicons name="filter" size={14} color="#8C77C2" />
              <Text style={estilos.txtFiltrar}>Filtrar</Text>
            </TouchableOpacity>
            <View style={estilos.iconesDireita}>
              {pastaAtual === null && (
                <TouchableOpacity style={estilos.iconeBotao} onPress={() => setModalNovaPasta(true)}>
                  <Ionicons name="folder-outline" size={22} color="#8C77C2" />
                </TouchableOpacity>
              )}
              <TouchableOpacity style={estilos.iconeBotao} onPress={() => { fecharModalNovo(); setPastaSelecionadaId(pastaAtual); setModalNovoRegistro(true); }}>
                <Ionicons name="add" size={24} color="#8C77C2" />
              </TouchableOpacity>
            </View>
          </View>
        }
        renderItem={({ item }) => {
          if (item.tipo === 'pasta') {
            return (
              <TouchableOpacity style={estilos.itemRegistro} activeOpacity={0.7} onPress={() => setPastaAtual(item.id_pasta)}>
                <Ionicons name="folder" size={20} color="#8C77C2" />
                <View style={estilos.infoRegistro}>
                  <Text style={estilos.tituloRegistro}>{item.nome}</Text>
                  <Text style={estilos.dataRegistro}>Pasta de registros</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#BDBDBD" />
              </TouchableOpacity>
            );
          }

          const horarioFormatado = item.horario_inicio ? item.horario_inicio.substring(0, 5) : '';
          const dataFormatada = item.data_crise ? item.data_crise.split('-').reverse().join('/') : '';

          return (
            <TouchableOpacity style={estilos.itemRegistro} activeOpacity={0.7} onPress={() => { setRegistroSelecionado(item); setModalVisualizar(true); }}>
              <Ionicons name="document-text-outline" size={20} color="#8C77C2" />
              <View style={estilos.infoRegistro}>
                <Text style={estilos.tituloRegistro}>Registro de Crise</Text>
                <Text style={estilos.dataRegistro}>{dataFormatada}{horarioFormatado ? ` · ${horarioFormatado}` : ''}</Text>
              </View>
              <Ionicons name="ellipsis-vertical" size={18} color="#BDBDBD" />
            </TouchableOpacity>
          );
        }}
        ListEmptyComponent={!carregando && <Text style={estilos.textoVazio}>Nenhum registro encontrado.</Text>}
      />

      <Modal visible={modalNovaPasta} transparent animationType="fade" onRequestClose={() => setModalNovaPasta(false)}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalCentral}>
            <View style={estilos.modalHeader}>
              <Ionicons name="folder" size={20} color="#8C77C2" />
              <Text style={estilos.modalTitulo}>Nova Pasta</Text>
              <TouchableOpacity onPress={() => setModalNovaPasta(false)}>
                <Ionicons name="close" size={22} color="#BDBDBD" />
              </TouchableOpacity>
            </View>
            <TextInput style={estilos.input} placeholder="Nome da pasta" placeholderTextColor="#BDBDBD" value={nomePastaNova} onChangeText={setNomePastaNova} />
            <TouchableOpacity style={estilos.btnSalvar} onPress={criarPasta}>
              <Text style={estilos.txtBtnSalvar}>Criar pasta</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={modalNovoRegistro} transparent animationType="slide" onRequestClose={fecharModalNovo}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={estilos.modalOverlayBottom}>
          <View style={estilos.modalContainerGrande}>
            <View style={estilos.modalHeader}>
              <Ionicons name="document-text-outline" size={20} color="#8C77C2" />
              <Text style={estilos.modalTitulo}>{editandoId ? 'Editar registro' : 'Novo registro'}</Text>
              <TouchableOpacity onPress={fecharModalNovo}>
                <Ionicons name="close" size={24} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 30 }} showsVerticalScrollIndicator={false}>
              <Text style={estilos.labelInput}>Salvar na pasta:</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={estilos.scrollPastas}>
                <TouchableOpacity 
                  style={pastaSelecionadaId === null ? estilos.chipSelecionado : estilos.chipPasta} 
                  onPress={() => setPastaSelecionadaId(null)}>
                  <Text style={pastaSelecionadaId === null ? estilos.textoChipSelecionado : estilos.textoChip}>Nenhuma</Text>
                </TouchableOpacity>
                {pastas.map(p => (
                  <TouchableOpacity 
                    key={p.id_pasta}
                    style={pastaSelecionadaId === p.id_pasta ? estilos.chipSelecionado : estilos.chipPasta} 
                    onPress={() => setPastaSelecionadaId(p.id_pasta)}>
                    <Text style={pastaSelecionadaId === p.id_pasta ? estilos.textoChipSelecionado : estilos.textoChip}>{p.nome}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <View style={estilos.inputComIcone}>
                <TextInput 
                  style={estilos.inputFlex} 
                  placeholder="Data (DD/MM/AAAA)" 
                  placeholderTextColor="#BDBDBD" 
                  value={dataCrise} 
                  onChangeText={handleDataChange} 
                  keyboardType="numeric" 
                  maxLength={10} 
                />
                <TouchableOpacity onPress={() => setMostrarPickerData(true)} style={estilos.iconeInput}>
                  <Ionicons name="calendar-outline" size={22} color="#8C77C2" />
                </TouchableOpacity>
              </View>

              {mostrarPickerData && (
                <DateTimePicker
                  value={new Date()}
                  mode="date"
                  display="default"
                  onChange={onChangePickerData}
                  maximumDate={new Date()}
                />
              )}

              <TextInput style={estilos.input} placeholder="Horário de início (Ex: 18:10)" placeholderTextColor="#BDBDBD" value={horarioInicio} onChangeText={handleHorarioChange} keyboardType="numeric" maxLength={5} />
              <TextInput style={estilos.input} placeholder="Duração aproximada em minutos (Ex: 30)" placeholderTextColor="#BDBDBD" keyboardType="numeric" value={duracao} onChangeText={setDuracao} />
              
              <TextInput style={[estilos.input, { minHeight: 45 }]} multiline placeholder="Local" placeholderTextColor="#BDBDBD" value={local} onChangeText={setLocal} />
              <TextInput style={[estilos.input, { minHeight: 45 }]} multiline placeholder="Possível gatilho" placeholderTextColor="#BDBDBD" value={gatilho} onChangeText={setGatilho} />
              <TextInput style={[estilos.input, { minHeight: 45 }]} multiline placeholder="Comportamentos observados" placeholderTextColor="#BDBDBD" value={comportamentos} onChangeText={setComportamentos} />
              <TextInput style={[estilos.input, { minHeight: 45 }]} multiline placeholder="Intensidade da crise" placeholderTextColor="#BDBDBD" value={intensidade} onChangeText={setIntensidade} />
              <TextInput style={[estilos.input, { minHeight: 45 }]} multiline placeholder="Estratégias utilizadas" placeholderTextColor="#BDBDBD" value={estrategias} onChangeText={setEstrategias} />
              <TextInput style={[estilos.input, { minHeight: 45 }]} multiline placeholder="Resultado" placeholderTextColor="#BDBDBD" value={resultado} onChangeText={setResultado} />
              <TextInput style={[estilos.input, { minHeight: 45 }]} multiline placeholder="Estado após a crise" placeholderTextColor="#BDBDBD" value={estadoApos} onChangeText={setEstadoApos} />
              <TextInput style={[estilos.input, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Observações adicionais" placeholderTextColor="#BDBDBD" multiline value={observacoes} onChangeText={setObservacoes} />

              <TouchableOpacity style={estilos.btnSalvar} onPress={salvarRegistro} disabled={salvando}>
                {salvando ? <ActivityIndicator color="#FFF" /> : <Text style={estilos.txtBtnSalvar}>Salvar registro</Text>}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={modalVisualizar} transparent animationType="fade" onRequestClose={() => setModalVisualizar(false)}>
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContainerGrande}>
            <View style={estilos.modalHeader}>
              <Ionicons name="document-text-outline" size={20} color="#8C77C2" />
              <Text style={estilos.modalTitulo}>Visualização</Text>
              <TouchableOpacity onPress={() => setModalVisualizar(false)}>
                <Ionicons name="close" size={22} color="#BDBDBD" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ paddingBottom: 20 }} showsVerticalScrollIndicator={false}>
              <Text style={estilos.detalheTituloPrincipal}>Registro de Crise</Text>
              <Text style={estilos.detalheTexto}>Data: {registroSelecionado?.data_crise ? registroSelecionado.data_crise.split('-').reverse().join('/') : '-'}</Text>
              <Text style={estilos.detalheTexto}>Horário de início: {registroSelecionado && registroSelecionado.horario_inicio ? registroSelecionado.horario_inicio.substring(0, 5) : '-'}</Text>
              <Text style={estilos.detalheTexto}>Duração aproximada: {registroSelecionado && registroSelecionado.duracao_aproximada != null ? `${registroSelecionado.duracao_aproximada} minutos` : '-'}</Text>
              <Text style={estilos.detalheTexto}>Local: {registroSelecionado?.local || '-'}</Text>
              <Text style={estilos.detalheTexto}>Possível gatilho: {registroSelecionado?.possivel_gatilho || '-'}</Text>
              <Text style={estilos.detalheTexto}>Comportamentos observados: {registroSelecionado?.comportamentos_observados || '-'}</Text>
              <Text style={estilos.detalheTexto}>Intensidade da crise: {registroSelecionado?.intensidade || '-'}</Text>
              <Text style={estilos.detalheTexto}>Estratégias utilizadas: {registroSelecionado?.estrategias_utilizadas || '-'}</Text>
              <Text style={estilos.detalheTexto}>Resultado: {registroSelecionado?.resultado || '-'}</Text>
              <Text style={estilos.detalheTexto}>Estado após a crise: {registroSelecionado?.estado_apos_crise || '-'}</Text>
              <Text style={estilos.detalheTexto}>Observações adicionais: {registroSelecionado?.observacoes || '-'}</Text>

              <TouchableOpacity style={estilos.btnExportar} onPress={() => exportarPDF(registroSelecionado)}>
                <Ionicons name="download-outline" size={18} color="#FFF" />
                <Text style={estilos.txtBtnExportar}>Exportar para PDF</Text>
              </TouchableOpacity>

              <View style={estilos.botoesVisualizacao}>
                <TouchableOpacity style={estilos.btnModificar} onPress={() => abrirEdicao(registroSelecionado)}>
                  <Ionicons name="pencil" size={16} color="#8C77C2" />
                  <Text style={estilos.txtBtnModificar}>Modificar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={estilos.btnExcluir} onPress={() => excluirRegistro(registroSelecionado?.id_registro_crise)}>
                  <Ionicons name="trash-outline" size={16} color="#FFF" />
                  <Text style={estilos.txtBtnExcluir}>Excluir</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <MenuLateral visivel={menuVisivel} aoFechar={() => setMenuVisivel(false)} navigation={navigation} id_usuario={id_usuario} perfil={perfil} />
    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  telaPrincipal: { flex: 1, backgroundColor: '#FAFAFC' },
  headerContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingTop: 55, paddingBottom: 10 },
  headerEsquerda: { flexDirection: 'row', alignItems: 'center' },
  tituloHeader: { fontSize: 22, fontFamily: 'REM_Bold', color: '#8C77C2', marginLeft: 10, fontWeight: 'bold' },
  iconeBotao: { padding: 5 },
  barraAcoes: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 20 },
  btnFiltrar: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#EDE0FF', paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, gap: 6 },
  txtFiltrar: { fontSize: 13, color: '#8C77C2', fontFamily: 'REM_Medium' },
  iconesDireita: { flexDirection: 'row', gap: 12 },
  itemRegistro: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFFFF', marginHorizontal: 20, marginBottom: 10, borderRadius: 12, padding: 14, gap: 12, borderWidth: 1, borderColor: '#F0F0F0', elevation: 1 },
  infoRegistro: { flex: 1 },
  tituloRegistro: { fontSize: 14, fontFamily: 'REM_Bold', color: '#333', fontWeight: '600' },
  dataRegistro: { fontSize: 12, fontFamily: 'REM_Regular', color: '#999', marginTop: 2 },
  textoVazio: { textAlign: 'center', color: '#999', marginTop: 40, fontFamily: 'REM_Regular' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalOverlayBottom: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalCentral: { backgroundColor: '#FFF', borderRadius: 20, padding: 20, width: '100%' },
  modalContainerGrande: { backgroundColor: '#FFF', borderTopLeftRadius: 30, borderTopRightRadius: 30, padding: 24, width: '100%', maxHeight: '85%' },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 8 },
  modalTitulo: { flex: 1, fontSize: 16, fontFamily: 'REM_Bold', color: '#8C77C2', marginLeft: 8 },
  
  labelInput: { fontSize: 14, fontFamily: 'REM_Bold', color: '#555', marginBottom: 8, marginTop: 4 },
  scrollPastas: { flexDirection: 'row', marginBottom: 16 },
  chipPasta: { backgroundColor: '#F0F0F0', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#E0E0E0' },
  chipSelecionado: { backgroundColor: '#8C77C2', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, marginRight: 8, borderWidth: 1, borderColor: '#8C77C2' },
  textoChip: { color: '#555', fontFamily: 'REM_Regular', fontSize: 13 },
  textoChipSelecionado: { color: '#FFF', fontFamily: 'REM_Bold', fontSize: 13 },

  inputComIcone: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FAFAFC', borderRadius: 12, borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 12 },
  inputFlex: { flex: 1, padding: 14, fontSize: 14, fontFamily: 'REM_Regular', color: '#333' },
  iconeInput: { padding: 12 },
  input: { backgroundColor: '#FAFAFC', borderRadius: 12, padding: 14, fontSize: 14, fontFamily: 'REM_Regular', color: '#333', borderWidth: 1, borderColor: '#F0F0F0', marginBottom: 12 },
  
  btnSalvar: { backgroundColor: '#8C77C2', borderRadius: 12, padding: 14, alignItems: 'center', marginTop: 10 },
  txtBtnSalvar: { color: '#FFF', fontFamily: 'REM_Bold', fontSize: 15 },
  detalheTituloPrincipal: { fontSize: 18, fontFamily: 'REM_Bold', color: '#333', marginBottom: 12 },
  detalheTexto: { fontSize: 14, fontFamily: 'REM_Regular', color: '#555', marginBottom: 8, lineHeight: 20 },
  
  btnExportar: { flexDirection: 'row', backgroundColor: '#4CAF50', borderRadius: 12, padding: 14, alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  txtBtnExportar: { color: '#FFF', fontFamily: 'REM_Bold', fontSize: 15 },

  botoesVisualizacao: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 12 },
  btnModificar: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderColor: '#8C77C2', borderRadius: 12, padding: 12, flex: 1, justifyContent: 'center' },
  txtBtnModificar: { color: '#8C77C2', fontFamily: 'REM_Bold', fontSize: 14 },
  btnExcluir: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#E53935', borderRadius: 12, padding: 12, flex: 1, justifyContent: 'center' },
  txtBtnExcluir: { color: '#FFF', fontFamily: 'REM_Bold', fontSize: 14 },
});