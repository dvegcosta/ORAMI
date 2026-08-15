import React from 'react';
import { StyleSheet, View, Text } from 'react-native';
import { useEstilosTema } from '../lib/tema';

export default function TelaGuias() {
    const estilos = useEstilosTema(estilosBase);

    return (
        <View style={estilos.container}>
            <Text style={estilos.texto}>Tela de Guias</Text>
        </View>
    );
}

const estilosBase = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
    },
    texto: {
        color: '#000',
        fontFamily: 'REM_Medium',
    },
});
