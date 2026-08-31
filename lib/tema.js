import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { Appearance, StyleSheet } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from './supabase';

export const TOKENS = {
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
    xxxl: 32,
  },
  radius: {
    sm: 10,
    md: 14,
    lg: 18,
    xl: 22,
    pill: 999,
  },
  typography: {
    display: 30,
    h1: 24,
    h2: 20,
    h3: 17,
    body: 15,
    bodySmall: 13,
    caption: 11,
  },
};

const CORES_TEMA = {
  claro: {
    fundo: '#F7F5FB',
    fundoAlternativo: '#F3F0F8',
    superficie: '#FFFFFF',
    superficieElevada: '#FFFFFF',
    superficieSuave: '#EEEAF7',
    borda: '#E2DCEA',
    divisor: '#ECE8F2',
    texto: '#24212B',
    textoSecundario: '#625C6F',
    textoTerciario: '#8D8798',
    icone: '#696275',
    sombra: '#2D2740',
    primaria: '#8C77C2',
    primariaForte: '#624191',
    primariaSuave: '#E8E0F5',
    sucesso: '#2E8665',
    perigo: '#C75757',
    aviso: '#B57922',
    info: '#4E6F9F',
    gradienteInicial: ['#D9E7FF', '#F0F3FC', '#FFFFFF', '#F0EAF9', '#DCCEF4'],
    gradientePesquisa: ['#E0EBFD', '#ECEFF9', '#EEE7F7', '#E4D8F2'],
  },
  escuro: {
    fundo: '#121018',
    fundoAlternativo: '#17141F',
    superficie: '#1D1925',
    superficieElevada: '#25202E',
    superficieSuave: '#30273B',
    borda: '#3B3348',
    divisor: '#302A3A',
    texto: '#F7F2FB',
    textoSecundario: '#D1C7DC',
    textoTerciario: '#A79BAF',
    icone: '#C5B9D0',
    sombra: '#000000',
    primaria: '#8C77C2',
    primariaForte: '#C6AFF0',
    primariaSuave: '#382C49',
    sucesso: '#67B994',
    perigo: '#F07A7A',
    aviso: '#E0AF5F',
    info: '#8FB1E4',
    gradienteInicial: ['#17141F', '#1B1824', '#211C2B', '#2B2336', '#352A43'],
    gradientePesquisa: ['#18151F', '#211C29', '#2A2137', '#362A44'],
  },
};

const CONFIG_PADRAO = {
  temaPadraoSistema: true,
  temaSelecionado: 'claro',
  desativarSons: false,
  desativarVibracoes: false,
};

const TemaContext = createContext({
  temaAtivo: 'claro',
  cores: CORES_TEMA.claro,
  configuracao: CONFIG_PADRAO,
  carregarAcessibilidade: async () => {},
  aplicarAcessibilidadeLocal: () => {},
});

const ESTILOS_ESCUROS_EXTRAS_PADRAO = {};

const normalizarHex = (valor) => {
  if (typeof valor !== 'string') return valor;
  const texto = valor.trim();
  if (!texto.startsWith('#')) return texto;
  if (texto.length === 4) {
    const [, r, g, b] = texto;
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return texto.toUpperCase();
};

const estiloEhRaiz = (nome) => /container|tela|areaSegura|loading|centro|whiteWrapper/i.test(nome);
const estiloEhSuperficie = (nome) => /card|modal|input|dropdown|painel|menu|header|botao|btn|tab|faq|lista|row|item|post|conteudo|box|wrapper|avatar|perfil|comentario|opcao|secao|area|info/i.test(nome);

const mapearCor = (valor, nomeEstilo, prop, cores) => {
  const cor = normalizarHex(valor);
  if (typeof cor !== 'string' || cor.startsWith('rgba')) return valor;

  const roxosAntigos = new Set(['#8C77C2', '#8B72C2', '#D1C6E8', '#D1C4E9', '#6B5D7A', '#4C3B73']);
  const roxosClaros = new Set(['#F0ECF9', '#EAE2FF', '#F0E6FF', '#F5F0FF', '#E8E4F2', '#EAE6F7', '#FAF5FF', '#F1E2FF', '#F0EAF5', '#F3EEF9', '#F4F2FA']);
  const neutrosClaros = new Set(['#FFFFFF', '#FAFAFA', '#FAFAFC', '#F8F8FC', '#FCFCFC', '#F9F9F9', '#F8F7FF', '#F5F5F5', '#EEEEEE', '#E8E8E8', '#E0E0E0', '#D9D9D9']);
  const textosPrimarios = new Set(['#000000', '#111111', '#1A1A1A', '#333333']);
  const textosSecundarios = new Set(['#444444', '#555555', '#666666']);
  const textosTerciarios = new Set(['#777777', '#888888', '#999999', '#A0A0A0', '#BDBDBD', '#CCCCCC', '#DDDDDD']);

  if (roxosAntigos.has(cor)) {
    if (prop === 'color' || prop === 'placeholderTextColor' || prop === 'borderColor' || prop === 'borderTopColor' || prop === 'borderBottomColor') return cores.primaria;
    if (prop === 'shadowColor') return cores.primaria;
    if (prop === 'backgroundColor') return cores.primaria;
  }

  if (cor === '#E74C3C' || cor === '#FF6B6B') return prop === 'backgroundColor' ? cores.perigo : cores.perigo;
  if (cor === '#F39C12' || cor === '#F1C40F') return cores.aviso;
  if (cor === '#2ECC71') return cores.sucesso;
  if (cor === '#8B72C2') return cores.primaria;

  if (prop === 'backgroundColor') {
    if (neutrosClaros.has(cor)) {
      return estiloEhRaiz(nomeEstilo) && !estiloEhSuperficie(nomeEstilo) ? cores.fundoAlternativo : cores.superficie;
    }
    if (roxosClaros.has(cor) || cor === '#C6DFFF') return cores.superficieSuave;
  }

  if (['borderColor', 'borderTopColor', 'borderBottomColor', 'borderLeftColor', 'borderRightColor'].includes(prop)) {
    if (neutrosClaros.has(cor) || roxosClaros.has(cor) || cor === '#CCCCCC' || cor === '#DDDDDD') return cores.borda;
  }

  if (prop === 'color' || prop === 'placeholderTextColor') {
    if (textosPrimarios.has(cor)) return cores.texto;
    if (textosSecundarios.has(cor)) return cores.textoSecundario;
    if (textosTerciarios.has(cor)) return cores.textoTerciario;
  }

  if (prop === 'shadowColor' && cor === '#000000') return cores.sombra;
  return valor;
};

const aplicarAcabamentoVisual = (nomeEstilo, estilo, cores) => {
  if (!estilo || typeof estilo !== 'object') return estilo;

  const resultado = { ...estilo };
  Object.keys(resultado).forEach((prop) => {
    resultado[prop] = mapearCor(resultado[prop], nomeEstilo, prop, cores);
  });

  if (resultado.fontFamily === 'REM') resultado.fontFamily = 'REM_Regular';
  if (resultado.fontSize && !resultado.fontFamily) resultado.fontFamily = 'REM_Regular';

  const ehTitulo = /titulo|title|nome|header|h1|h2|principal/i.test(nomeEstilo);
  if (ehTitulo && resultado.fontSize && !resultado.fontWeight) resultado.fontWeight = '700';

  if (resultado.fontSize && !resultado.lineHeight) {
    resultado.lineHeight = Math.round(resultado.fontSize * (resultado.fontSize <= 13 ? 1.35 : 1.42));
  }

  if (resultado.backgroundColor && /card|modal|painel|panel|menu|box|post|dropdown/i.test(nomeEstilo)) {
    resultado.borderRadius = resultado.borderRadius || TOKENS.radius.lg;
    if (resultado.shadowOpacity === undefined && resultado.elevation === undefined) {
      resultado.shadowColor = resultado.shadowColor || cores.sombra;
      resultado.shadowOffset = resultado.shadowOffset || { width: 0, height: 4 };
      resultado.shadowOpacity = 0.08;
      resultado.shadowRadius = 10;
      resultado.elevation = 3;
    }
  }

  if (resultado.backgroundColor && /botao|button|btn/i.test(nomeEstilo)) {
    resultado.borderRadius = Math.max(resultado.borderRadius || 0, TOKENS.radius.md);
    resultado.minHeight = Math.max(resultado.minHeight || 0, 44);
  }

  if (/input|campo/i.test(nomeEstilo)) {
    resultado.borderRadius = Math.max(resultado.borderRadius || 0, TOKENS.radius.md);
    if (resultado.height && resultado.height < 44) resultado.height = 44;
  }

  if (/tag|badge|pill/i.test(nomeEstilo)) {
    resultado.borderRadius = TOKENS.radius.pill;
  }

  return resultado;
};

export function ProvedorTema({ children }) {
  const [configuracao, setConfiguracao] = useState(CONFIG_PADRAO);
  const [temaSistema, setTemaSistema] = useState(Appearance.getColorScheme() || 'light');
  const [usuarioCarregado, setUsuarioCarregado] = useState(null);

  useEffect(() => {
    const assinatura = Appearance.addChangeListener(({ colorScheme }) => {
      setTemaSistema(colorScheme || 'light');
    });

    return () => assinatura.remove();
  }, []);

  const aplicarAcessibilidadeLocal = useCallback((novaConfiguracao) => {
    setConfiguracao((atual) => ({ ...atual, ...novaConfiguracao }));
  }, []);

  const carregarAcessibilidade = useCallback(async (idUsuario) => {
    if (!idUsuario) return;

    const idNormalizado = String(idUsuario);
    if (usuarioCarregado === idNormalizado) return;

    const { data, error } = await supabase.rpc('obter_acessibilidade', {
      p_id_usuario: idNormalizado,
    });

    if (error) {
      console.error('Erro ao obter acessibilidade:', error.message);
      return;
    }

    if (data && data.length > 0) {
      const config = data[0];
      setConfiguracao({
        temaPadraoSistema: config.tema_padrao_sistema ?? true,
        temaSelecionado: config.tema_selecionado || 'claro',
        desativarSons: config.desativar_sons ?? false,
        desativarVibracoes: config.desativar_vibracoes ?? false,
      });
    } else {
      setConfiguracao(CONFIG_PADRAO);
    }

    setUsuarioCarregado(idNormalizado);
  }, [usuarioCarregado]);

  const temaAtivo = configuracao.temaPadraoSistema
    ? (temaSistema === 'dark' ? 'escuro' : 'claro')
    : configuracao.temaSelecionado;

  const valor = useMemo(() => ({
    temaAtivo,
    cores: CORES_TEMA[temaAtivo],
    configuracao,
    carregarAcessibilidade,
    aplicarAcessibilidadeLocal,
  }), [temaAtivo, configuracao, carregarAcessibilidade, aplicarAcessibilidadeLocal]);

  return (
    <TemaContext.Provider value={valor}>
      {children}
    </TemaContext.Provider>
  );
}

export function usarTema() {
  return useContext(TemaContext);
}

export function useTemaUsuario(idUsuario) {
  const tema = usarTema();

  useFocusEffect(
    useCallback(() => {
      tema.carregarAcessibilidade(idUsuario);
    }, [idUsuario, tema.carregarAcessibilidade])
  );

  return tema;
}

export function useEstilosTema(estilosBase, estilosEscurosExtras = ESTILOS_ESCUROS_EXTRAS_PADRAO) {
  const { temaAtivo, cores } = usarTema();

  return useMemo(() => {
    const estilos = Object.keys(estilosBase).reduce((resultado, nomeEstilo) => {
      const estilo = StyleSheet.flatten(estilosBase[nomeEstilo]);
      const refinado = aplicarAcabamentoVisual(nomeEstilo, estilo, cores);
      resultado[nomeEstilo] = {
        ...refinado,
        ...(temaAtivo === 'escuro' ? (estilosEscurosExtras[nomeEstilo] || {}) : {}),
      };
      return resultado;
    }, {});

    return StyleSheet.create(estilos);
  }, [temaAtivo, cores, estilosBase, estilosEscurosExtras]);
}
