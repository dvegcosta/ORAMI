import React from 'react';
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { useEstilosTema } from '../lib/tema';

const ManualCard = ({ icone, titulo, descricao, onPress, iconeTipo = 'Ionicons' }) => {
  const estilos = useEstilosTema(estilosBase);
  const renderIcon = () => {
    const props = { name: icone, size: 28, color: "#8C77C2", style: estilos.cardIcon };
    if (iconeTipo === 'MaterialCommunityIcons') return <MaterialCommunityIcons {...props} />;
    if (iconeTipo === 'FontAwesome5') return <FontAwesome5 {...props} />;
    return <Ionicons {...props} />;
  };

  return (
    <TouchableOpacity style={estilos.card} onPress={onPress} activeOpacity={0.7}>
      <View style={estilos.indicadorLateral} />
      <View style={estilos.cardContent}>
        <View style={estilos.cardHeader}>
          {renderIcon()}
          <Text style={estilos.cardTitulo}>{titulo}</Text>
        </View>
        <Text style={estilos.cardDescricao}>{descricao}</Text>
      </View>
    </TouchableOpacity>
  );
};

export default function TelaManualUso({ navigation }) {
  const estilos = useEstilosTema(estilosBase);
  return (
    <SafeAreaView style={estilos.container}>
      <View style={estilos.header}>
        <TouchableOpacity style={estilos.botaoVoltar} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={28} color="#8C77C2" />
        </TouchableOpacity>
        <View style={estilos.tituloContainer}>
          <Ionicons name="book" size={30} color="#8C77C2" style={estilos.iconeTitulo} />
          <Text style={estilos.tituloPrincipal}>Manual de uso</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={estilos.scrollContent} showsVerticalScrollIndicator={false}>
        
        <ManualCard 
          icone="chatbubbles" 
          titulo="O FÓRUM"
          descricao="Aprenda tudo sobre o fórum da Orami"
          onPress={() => console.log('Navegar para Manual Fórum')}
        />

        <ManualCard 
          icone="format-letter-case-upper" 
          iconeTipo="MaterialCommunityIcons"
          titulo="COMUNICAÇÃO"
          descricao="Aprenda a usar nossa ferramenta de comunicação aumentativa alternativa"
          onPress={() => console.log('Navegar para Manual Comunicação')}
        />

        <ManualCard 
          icone="file-text" 
          iconeTipo="FontAwesome5"
          titulo="REGISTRO DE CRISES"
          descricao="Aprenda a usar nossa ferramenta de registro de crises"
          onPress={() => console.log('Navegar para Manual Crises')}
        />

        <ManualCard 
          icone="calendar-outline" 
          titulo="REGISTROS DIÁRIOS"
          descricao="Aprenda a usar nossa ferramenta de registros diários"
          onPress={() => console.log('Navegar para Manual Diários')}
        />

        <ManualCard 
          icone="edit" 
          iconeTipo="FontAwesome5"
          titulo="CRIAR ROTINA"
          descricao="Aprenda a usar nossa ferramenta de organização do dia a dia"
          onPress={() => console.log('Navegar para Manual Rotina')}
        />

      </ScrollView>
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
    marginBottom: 10,
  },
  botaoVoltar: {
    marginTop: 25,
    marginBottom: 20,
  },
  tituloContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  iconeTitulo: {
    marginRight: 10,
    marginTop: 5,
  },
  tituloPrincipal: {
    fontSize: 26,
    color: '#8C77C2',
    fontFamily: 'REM_Bold', 
    marginLeft: 5,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 30,
  },
  card: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 15,
    marginBottom: 18,
    minHeight: 100,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 5,
    overflow: 'hidden',
  },
  indicadorLateral: {
    width: 3,
    backgroundColor: '#8C77C2',
    height: '60%', 
    alignSelf: 'center',
    marginLeft: 12,
    borderRadius: 2,
  },
  cardContent: {
    flex: 1,
    padding: 20,
    justifyContent: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 5,
  },
  cardIcon: {
    marginRight: 12,
  },
  cardTitulo: {
    fontSize: 17,
    color: '#8C77C2',
    fontFamily: 'REM_Bold',
    textTransform: 'uppercase', 
  },
  cardDescricao: {
    fontSize: 14,
    color: '#000',
    fontFamily: 'REM_Regular', 
    lineHeight: 18,
  },
});
