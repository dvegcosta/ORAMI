import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  Switch,
  ScrollView,
  Platform,
  TextInput,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import { useEstilosTema, usarTema } from '../lib/tema';
import { Alert } from '../lib/popup';

export default function TelaSegurancaPrivacidade({ route, navigation }) {
  const estilos = useEstilosTema(estilosBase);
  const { cores } = usarTema();
  const { id_usuario } = route.params || {};

  const [email, setEmail] = useState('Carregando...');
  
  const [permissoes, setPermissoes] = useState({
    priv_msgs: true,
    not_solicitacao: true,
    not_interacoes: true,
    not_msgs_dm: true,
    not_sistema: true,
  });

  const [modalEmailVisible, setModalEmailVisible] = useState(false);
  const [novoEmail, setNovoEmail] = useState('');
  const [senhaParaEmail, setSenhaParaEmail] = useState('');

  const [modalDesativarVisible, setModalDesativarVisible] = useState(false);
  const [senhaDesativar, setSenhaDesativar] = useState('');
  const [senhaConfirmacao, setSenhaConfirmacao] = useState('');

  const [modalAlterarSenhaVisible, setModalAlterarSenhaVisible] = useState(false);

  const mostrarAlerta = (titulo, mensagem, acaoOk = null) => {
    Alert.alert(titulo, mensagem, [{ text: 'OK', onPress: acaoOk || undefined }]);
  };

  useEffect(() => {
    if (!id_usuario) return;

    const buscarDados = async () => {
      const { data: usuarioData, error: errorUser } = await supabase
        .from('usuarios')
        .select('email')
        .eq('id_usuario', id_usuario)
        .single();

      if (errorUser) throw errorUser;
      if (usuarioData) setEmail(usuarioData.email);

      let { data: permData, error: errorPerm } = await supabase
        .from('configuracoes_usuario')
        .select('permitir_mensagens_amigos,notificacoes_amizade,notificacoes_posts,notificacoes_mensagens,notificacoes_sistema')
        .eq('id_usuario', id_usuario)
        .maybeSingle();

      if (errorPerm) throw errorPerm;

      if (!permData) {
        const { data: novaConfiguracao, error: erroInsert } = await supabase
          .from('configuracoes_usuario')
          .insert([{ id_usuario }])
          .select('permitir_mensagens_amigos,notificacoes_amizade,notificacoes_posts,notificacoes_mensagens,notificacoes_sistema')
          .single();
        if (erroInsert) throw erroInsert;
        permData = novaConfiguracao;
      }

      setPermissoes({
        priv_msgs: Boolean(permData.permitir_mensagens_amigos),
        not_solicitacao: Boolean(permData.notificacoes_amizade),
        not_interacoes: Boolean(permData.notificacoes_posts),
        not_msgs_dm: Boolean(permData.notificacoes_mensagens),
        not_sistema: Boolean(permData.notificacoes_sistema),
      });
    };

    buscarDados();
  }, [id_usuario]);

  const atualizarPermissao = async (campo, valor) => {
    const novasPermissoes = { ...permissoes, [campo]: valor };
    setPermissoes(novasPermissoes);

    const mapaCampos = {
      priv_msgs: 'permitir_mensagens_amigos',
      not_solicitacao: 'notificacoes_amizade',
      not_interacoes: 'notificacoes_posts',
      not_msgs_dm: 'notificacoes_mensagens',
      not_sistema: 'notificacoes_sistema',
    };

    const coluna = mapaCampos[campo];
    const { error } = await supabase
      .from('configuracoes_usuario')
      .update({ [coluna]: valor, atualizado_em: new Date().toISOString() })
      .eq('id_usuario', id_usuario);

    if (error) {
      console.error("Erro ao salvar permissão:", error);
      mostrarAlerta('Configuração não salva', 'Não foi possível salvar essa preferência agora.');
      setPermissoes({ ...permissoes, [campo]: !valor }); 
    }
  };

  const handleSalvarNovoEmail = async () => {
    if (!novoEmail || !senhaParaEmail) {
      mostrarAlerta('Dados incompletos', 'Preencha o novo e-mail e sua senha para continuar.');
      return;
    }

    const { error } = await supabase.rpc('sp_alterar_email', {
      p_id_usuario: id_usuario,
      p_senha: senhaParaEmail,
      novo_email: novoEmail
    });

    if (error) {
      mostrarAlerta('E-mail não alterado', error.message || 'Falha ao alterar e-mail.');
    } else {
      setModalEmailVisible(false);
      mostrarAlerta('E-mail atualizado', 'Seu novo e-mail foi salvo com sucesso.', () => {
        setEmail(novoEmail);
        setNovoEmail('');
        setSenhaParaEmail('');
      });
    }
  };

  const handleConfirmarAlterarSenha = async () => {
    setModalAlterarSenhaVisible(false);
    
    const { error } = await supabase.rpc('sp_solicitar_alteracao_senha', { p_email: email });
    
    if (error) {
      mostrarAlerta('Senha não solicitada', error.message);
    } else {
      mostrarAlerta('Instruções enviadas', 'Enviamos as instruções para o seu e-mail cadastrado.');
    }
  };

  const handleConfirmarDesativacao = async () => {
    if (!senhaDesativar || !senhaConfirmacao) {
      mostrarAlerta('Senha necessária', 'Preencha os dois campos de senha para continuar.');
      return;
    }

    if (senhaDesativar !== senhaConfirmacao) {
      mostrarAlerta('Senhas diferentes', 'As senhas digitadas não coincidem.');
      return;
    }

    const { data: senhaValida, error: erroSenha } = await supabase.rpc('sp_verificar_senha', {
      p_id_usuario: id_usuario,
      p_senha_digitada: senhaDesativar
    });

    if (!senhaValida || erroSenha) {
      mostrarAlerta('Senha incorreta', 'Confira sua senha atual e tente novamente.');
      return;
    }

    const { error } = await supabase.rpc('sp_fluxo_desativar_usuario', { p_id_usuario: id_usuario });
    
    if (error) {
      mostrarAlerta('Conta não desativada', 'Falha ao desativar conta.');
    } else {
      setModalDesativarVisible(false);
      mostrarAlerta('Conta desativada', 'Sua conta foi desativada com sucesso.', () => {
        navigation.replace('TelaLogin');
      });
    }
  };

  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity style={estilos.botaoVoltar} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#8C77C2" />
        </TouchableOpacity>
        <View style={estilos.tituloContainer}>
          <Ionicons name="shield-half" size={32} color="#8C77C2" style={estilos.iconeTitulo} />
          <Text style={estilos.tituloPrincipal}>Segurança e Privacidade</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={estilos.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={estilos.secao}>
          <View style={estilos.tituloSessaoContainer}>
            <Ionicons name="person" size={20} color={cores.icone} />
            <Text style={estilos.tituloSessao}>Conta</Text>
          </View>

          <Text style={estilos.label}>Senha</Text>
          <View style={estilos.linhaInputBotao}>
            <View style={estilos.inputFalso}>
              <Text style={estilos.textoInputFalso}>*************</Text>
            </View>
            <TouchableOpacity onPress={() => setModalAlterarSenhaVisible(true)}>
              <Text style={estilos.linkAlterar}>Alterar</Text>
            </TouchableOpacity>
          </View>

          <Text style={estilos.label}>Email</Text>
          <View style={estilos.linhaInputBotao}>
            <View style={estilos.inputFalso}>
              <Text style={estilos.textoInputFalso} numberOfLines={1}>{email}</Text>
            </View>
            <TouchableOpacity onPress={() => setModalEmailVisible(true)}>
              <Text style={estilos.linkAlterar}>Alterar</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity 
            style={estilos.botaoDesativar} 
            onPress={() => setModalDesativarVisible(true)}
          >
            <Text style={estilos.textoDesativar}>Desativar conta</Text>
          </TouchableOpacity>
        </View>

        <View style={estilos.secao}>
          <View style={estilos.tituloSessaoContainer}>
            <Ionicons name="shield" size={20} color={cores.icone} />
            <Text style={estilos.tituloSessao}>Privacidade</Text>
          </View>
          
          <View style={estilos.configRow}>
            <Switch
              trackColor={{ false: '#D1C6E8', true: '#8C77C2' }}
              thumbColor={'#FFFFFF'}
              onValueChange={(val) => atualizarPermissao('priv_msgs', val)}
              value={permissoes.priv_msgs}
            />
            <Text style={estilos.textoSwitch}>Permitir mensagens de outros usuários</Text>
          </View>
        </View>

        <View style={estilos.secao}>
          <View style={estilos.tituloSessaoContainer}>
            <Ionicons name="notifications" size={20} color={cores.icone} />
            <Text style={estilos.tituloSessao}>Notificações</Text>
          </View>

          <Text style={estilos.subtituloSessao}>Interações no fórum</Text>
          <View style={estilos.configRow}>
            <Switch
              trackColor={{ false: '#D1C6E8', true: '#8C77C2' }}
              thumbColor={'#FFFFFF'}
              onValueChange={(val) => atualizarPermissao('not_solicitacao', val)}
              value={permissoes.not_solicitacao}
            />
            <Text style={estilos.textoSwitch}>Solicitações de amizade</Text>
          </View>
          <View style={estilos.configRow}>
            <Switch
              trackColor={{ false: '#D1C6E8', true: '#8C77C2' }}
              thumbColor={'#FFFFFF'}
              onValueChange={(val) => atualizarPermissao('not_interacoes', val)}
              value={permissoes.not_interacoes}
            />
            <Text style={estilos.textoSwitch}>Respostas às minhas postagens</Text>
          </View>
          <View style={estilos.configRow}>
            <Switch
              trackColor={{ false: '#D1C6E8', true: '#8C77C2' }}
              thumbColor={'#FFFFFF'}
              onValueChange={(val) => atualizarPermissao('not_msgs_dm', val)}
              value={permissoes.not_msgs_dm}
            />
            <Text style={estilos.textoSwitch}>Conversas privadas</Text>
          </View>

          <Text style={[estilos.subtituloSessao, { marginTop: 10 }]}>Recursos</Text>
          <View style={estilos.configRow}>
            <Switch
              trackColor={{ false: '#D1C6E8', true: '#8C77C2' }}
              thumbColor={'#FFFFFF'}
              onValueChange={(val) => atualizarPermissao('not_sistema', val)}
              value={permissoes.not_sistema}
            />
            <Text style={estilos.textoSwitch}>Postagem de novos guias informativos</Text>
          </View>
        </View>

        <View style={estilos.secao}>
          <View style={estilos.tituloSessaoContainer}>
            <Ionicons name="document-text" size={20} color={cores.icone} />
            <Text style={estilos.tituloSessao}>Informações Legais</Text>
          </View>
          <TouchableOpacity style={estilos.linkLegaisContainer}>
            <Text style={estilos.linkLegais}>Termos de Uso</Text>
          </TouchableOpacity>
          <TouchableOpacity style={estilos.linkLegaisContainer}>
            <Text style={estilos.linkLegais}>Política de Privacidade</Text>
          </TouchableOpacity>
        </View>

      </ScrollView>

      <Modal visible={modalAlterarSenhaVisible} transparent={true} animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContent}>
            <Text style={estilos.modalTitulo}>Alterar Senha</Text>
            <Text style={estilos.modalTexto}>
              Um link de recuperação de senha será enviado para {email}. Deseja continuar?
            </Text>
            <View style={estilos.modalBotoes}>
              <TouchableOpacity style={estilos.modalBotaoCancelar} onPress={() => setModalAlterarSenhaVisible(false)}>
                <Text style={estilos.modalBotaoTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.modalBotaoAcao} onPress={handleConfirmarAlterarSenha}>
                <Text style={estilos.modalBotaoTextoAcao}>Enviar E-mail</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalDesativarVisible} transparent={true} animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContent}>
            <Text style={estilos.modalTitulo}>Desativar Conta</Text>
            <Text style={estilos.modalTextoAvisoCritico}>
              Tem certeza absoluta que deseja desativar sua conta? Você será desconectado e seu perfil ficará inacessável.
            </Text>
            <Text style={estilos.modalTexto}>Para sua segurança, informe sua senha atual.</Text>
            
            <TextInput
              style={estilos.inputModal}
              placeholder="Sua senha"
              secureTextEntry
              value={senhaDesativar}
              onChangeText={setSenhaDesativar}
            />
            <TextInput
              style={estilos.inputModal}
              placeholder="Confirme sua senha"
              secureTextEntry
              value={senhaConfirmacao}
              onChangeText={setSenhaConfirmacao}
            />

            <View style={estilos.modalBotoes}>
              <TouchableOpacity style={estilos.modalBotaoCancelar} onPress={() => { 
                setModalDesativarVisible(false); 
                setSenhaDesativar(''); 
                setSenhaConfirmacao(''); 
              }}>
                <Text style={estilos.modalBotaoTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.modalBotaoPerigo} onPress={handleConfirmarDesativacao}>
                <Text style={estilos.modalBotaoTextoPerigo}>Desativar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={modalEmailVisible} transparent={true} animationType="fade">
        <View style={estilos.modalOverlay}>
          <View style={estilos.modalContent}>
            <Text style={estilos.modalTitulo}>Alterar E-mail</Text>
            <TextInput
              style={estilos.inputModal}
              placeholder="Novo e-mail"
              keyboardType="email-address"
              autoCapitalize="none"
              value={novoEmail}
              onChangeText={setNovoEmail}
            />
            <TextInput
              style={estilos.inputModal}
              placeholder="Sua senha atual"
              secureTextEntry
              value={senhaParaEmail}
              onChangeText={setSenhaParaEmail}
            />
            <View style={estilos.modalBotoes}>
              <TouchableOpacity style={estilos.modalBotaoCancelar} onPress={() => { 
                setModalEmailVisible(false); 
                setNovoEmail(''); 
                setSenhaParaEmail(''); 
              }}>
                <Text style={estilos.modalBotaoTextoCancelar}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={estilos.modalBotaoAcao} onPress={handleSalvarNovoEmail}>
                <Text style={estilos.modalBotaoTextoAcao}>Salvar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const estilosBase = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  header: {
    paddingTop: Platform.OS === 'android' ? 40 : 10,
    paddingHorizontal: 20,
    marginBottom: 40,
  },
  botaoVoltar: {
    marginTop: 25,
    marginBottom: 30,
  },
  tituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconeTitulo: {
    marginRight: 10,
  },
  tituloPrincipal: {
    fontSize: 24,
    fontFamily: 'REM_Bold',
    color: '#8C77C2',
    fontWeight: 'bold',
  },
  scrollContent: {
    paddingHorizontal: 25,
    paddingBottom: 40,
  },
  secao: {
    marginBottom: 35,
  },
  tituloSessaoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  tituloSessao: {
    fontSize: 20,
    fontFamily: 'REM_Bold',
    color: '#555',
    marginLeft: 10,
    fontWeight: '600',
  },
  label: {
    fontSize: 14,
    fontFamily: 'REM_Bold',
    color: '#333',
    fontWeight: 'bold',
    marginBottom: 5,
  },
  linhaInputBotao: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  inputFalso: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E8E8E8',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: '#FCFCFC',
    marginRight: 15,
  },
  textoInputFalso: {
    color: '#888',
    fontFamily: 'REM_Regular',
  },
  linkAlterar: {
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
    fontWeight: 'bold',
    fontSize: 15,
  },
  botaoDesativar: {
    backgroundColor: '#cc2828c7', 
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginTop: 10,
  },
  textoDesativar: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
    fontWeight: 'bold',
  },
  configRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  textoSwitch: {
    marginLeft: 12,
    fontSize: 15,
    color: '#444',
    fontFamily: 'REM_Medium',
    flex: 1,
  },
  subtituloSessao: {
    fontSize: 16,
    fontFamily: 'REM_Bold',
    color: '#000',
    fontWeight: 'bold',
    marginBottom: 15,
  },
  linkLegaisContainer: {
    marginBottom: 15,
  },
  linkLegais: {
    fontSize: 16,
    color: '#555',
    fontFamily: 'REM_Medium',
    textDecorationLine: 'underline',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '85%',
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: 20,
    elevation: 5,
  },
  modalTitulo: {
    fontSize: 18,
    fontFamily: 'REM_Bold',
    color: '#333',
    marginBottom: 10,
    fontWeight: 'bold',
  },
  modalTexto: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    fontFamily: 'REM_Regular',
  },
  modalTextoAvisoCritico: {
    fontSize: 14,
    color: '#cc2828c7',
    marginBottom: 15,
    fontFamily: 'REM_Bold',
  },
  inputModal: {
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    fontFamily: 'REM_Regular',
    color: '#000',
  },
  modalBotoes: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 15,
  },
  modalBotaoCancelar: {
    padding: 10,
  },
  modalBotaoTextoCancelar: {
    color: '#888',
    fontFamily: 'REM_Bold',
  },
  modalBotaoPerigo: {
    backgroundColor: '#ECA8A8',
    padding: 10,
    borderRadius: 8,
  },
  modalBotaoTextoPerigo: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
  },
  modalBotaoAcao: {
    backgroundColor: '#8C77C2',
    padding: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  modalBotaoTextoAcao: {
    color: '#FFF',
    fontFamily: 'REM_Bold',
  }
});
