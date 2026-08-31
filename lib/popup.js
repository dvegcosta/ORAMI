import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Alert as NativeAlert, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useEstilosTema } from './tema';

let abrirPopupGlobal = null;

const PopupContext = createContext({
  mostrarPopup: () => {},
});

const normalizarTexto = (texto) => String(texto || '').toLowerCase();

const inferirTipo = (titulo, mensagem, botoes = []) => {
  const texto = `${normalizarTexto(titulo)} ${normalizarTexto(mensagem)}`;
  const temBotaoPerigo = botoes.some((botao) => botao?.style === 'destructive');

  if (temBotaoPerigo || /desconectar|desativar|excluir|privar|denunciar/.test(texto)) return 'perigo';
  if (/sucesso|publicado|atualizada|criada|adicionado|enviada|excluída|excluida/.test(texto)) return 'sucesso';
  if (/atenção|atencao|aviso|termos|negado|permissão|permissao/.test(texto)) return 'aviso';
  if (/erro|falha|incorreto|inválido|invalido|não foi possível|nao foi possivel/.test(texto)) return 'erro';

  return 'info';
};

const obterIcone = (tipo, titulo) => {
  const texto = normalizarTexto(titulo);

  if (/desconectar/.test(texto)) return 'log-out-outline';
  if (/senha|email|acesso/.test(texto)) return 'key-outline';
  if (/comunidade|moderador/.test(texto)) return 'people-outline';
  if (/post|publica/.test(texto)) return 'chatbubble-ellipses-outline';
  if (/perfil|amigo/.test(texto)) return 'person-circle-outline';
  if (/imagem|galeria|permissão|permissao/.test(texto)) return 'image-outline';

  if (tipo === 'sucesso') return 'checkmark-circle-outline';
  if (tipo === 'perigo') return 'warning-outline';
  if (tipo === 'erro') return 'alert-circle-outline';
  if (tipo === 'aviso') return 'information-circle-outline';
  return 'sparkles-outline';
};

const prepararBotoes = (botoes) => {
  if (!Array.isArray(botoes) || botoes.length === 0) {
    return {
      cancelar: null,
      confirmar: { text: 'Entendi' },
    };
  }

  const cancelar = botoes.find((botao) => botao?.style === 'cancel') || null;
  const confirmar = [...botoes].reverse().find((botao) => botao?.style !== 'cancel') || botoes[0];

  return { cancelar, confirmar };
};

export const Alert = {
  alert: (titulo, mensagem, botoes, opcoes) => {
    if (abrirPopupGlobal) {
      abrirPopupGlobal({ titulo, mensagem, botoes, opcoes });
      return;
    }

    NativeAlert.alert(titulo, mensagem, botoes, opcoes);
  },
};

export function ProvedorPopup({ children }) {
  const estilos = useEstilosTema(estilosBase);
  const [popup, setPopup] = useState(null);

  const mostrarPopup = useCallback((configuracao) => {
    setPopup(configuracao);
  }, []);

  useEffect(() => {
    abrirPopupGlobal = mostrarPopup;
    return () => {
      if (abrirPopupGlobal === mostrarPopup) abrirPopupGlobal = null;
    };
  }, [mostrarPopup]);

  const fecharPopup = useCallback((botao) => {
    setPopup(null);
    if (botao?.onPress) {
      setTimeout(() => botao.onPress(), 120);
    }
  }, []);

  const dadosPopup = useMemo(() => {
    if (!popup) return null;

    const tipo = inferirTipo(popup.titulo, popup.mensagem, popup.botoes);
    const { cancelar, confirmar } = prepararBotoes(popup.botoes);

    return {
      tipo,
      cancelar,
      confirmar,
      icone: obterIcone(tipo, popup.titulo),
      titulo: popup.titulo || 'Aviso',
      mensagem: popup.mensagem || '',
    };
  }, [popup]);

  return (
    <PopupContext.Provider value={{ mostrarPopup }}>
      {children}

      <Modal
        visible={!!dadosPopup}
        transparent
        animationType="fade"
        onRequestClose={() => dadosPopup?.cancelar ? fecharPopup(dadosPopup.cancelar) : fecharPopup(dadosPopup?.confirmar)}
      >
        <View style={estilos.overlay}>
          <View style={estilos.card}>
            {dadosPopup && (
              <>
                <View style={[estilos.iconeContainer, estilos[`icone_${dadosPopup.tipo}`]]}>
                  <Ionicons name={dadosPopup.icone} size={34} color="#FFFFFF" />
                </View>

                <Text style={estilos.titulo}>{dadosPopup.titulo}</Text>
                {!!dadosPopup.mensagem && (
                  <Text style={estilos.mensagem}>{dadosPopup.mensagem}</Text>
                )}

                <View style={estilos.botoes}>
                  {dadosPopup.cancelar && (
                    <TouchableOpacity
                      style={estilos.botaoCancelar}
                      activeOpacity={0.75}
                      onPress={() => fecharPopup(dadosPopup.cancelar)}
                    >
                      <Text style={estilos.textoCancelar}>{dadosPopup.cancelar.text || 'Cancelar'}</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      estilos.botaoConfirmar,
                      dadosPopup.tipo === 'perigo' && estilos.botaoPerigo,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => fecharPopup(dadosPopup.confirmar)}
                  >
                    <Text style={estilos.textoConfirmar}>{dadosPopup.confirmar?.text || 'Entendi'}</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </PopupContext.Provider>
  );
}

export function usarPopup() {
  return useContext(PopupContext);
}

const estilosBase = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 26,
  },
  card: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    paddingHorizontal: 22,
    paddingTop: 28,
    paddingBottom: 22,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#F0ECF9',
    shadowColor: '#8C77C2',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 12,
  },
  iconeContainer: {
    width: 66,
    height: 66,
    borderRadius: 33,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 18,
  },
  icone_info: {
    backgroundColor: '#8C77C2',
  },
  icone_sucesso: {
    backgroundColor: '#8C77C2',
  },
  icone_aviso: {
    backgroundColor: '#8C77C2',
  },
  icone_erro: {
    backgroundColor: '#8C77C2',
  },
  icone_perigo: {
    backgroundColor: '#FF6B6B',
  },
  titulo: {
    fontFamily: 'REM_Bold',
    fontSize: 21,
    color: '#8C77C2',
    textAlign: 'center',
    marginBottom: 10,
  },
  mensagem: {
    fontFamily: 'REM_Regular',
    fontSize: 15,
    color: '#555',
    lineHeight: 21,
    textAlign: 'center',
    marginBottom: 24,
  },
  botoes: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  botaoCancelar: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: '#D1C6E8',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  textoCancelar: {
    fontFamily: 'REM_Bold',
    fontSize: 15,
    color: '#8C77C2',
  },
  botaoConfirmar: {
    flex: 1,
    minHeight: 48,
    borderRadius: 16,
    backgroundColor: '#8C77C2',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  botaoPerigo: {
    backgroundColor: '#FF6B6B',
  },
  textoConfirmar: {
    fontFamily: 'REM_Bold',
    fontSize: 15,
    color: '#FFFFFF',
  },
});
