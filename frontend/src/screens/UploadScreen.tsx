import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import { uploadFile } from '../services/api';
import { getGeohash, encryptFile } from '../services/encryption';

export const UploadScreen: React.FC = () => {
    const [loading, setLoading] = useState(false);

    const handleUpload = async () => {
        try {
            setLoading(true);
            console.log('📤 Iniciando proceso de subida de archivo...');
            
            // Seleccionar archivo
            const result = await DocumentPicker.getDocumentAsync({
                type: '*/*',
                copyToCacheDirectory: true,
            });

            if (result.canceled) {
                console.log('❌ Selección de archivo cancelada');
                return;
            }

            console.log('📄 Archivo seleccionado:', result.assets[0].name);

            // Obtener geohash
            const geohash = await getGeohash();
            if (!geohash) {
                console.error('❌ No se pudo obtener el geohash');
                return;
            }

            // Encriptar archivo
            console.log('🔐 Encriptando archivo...');
            const encryptedUri = await encryptFile(result.assets[0].uri, geohash);
            console.log('✅ Archivo encriptado:', encryptedUri);

            // Preparar archivo para subida
            const file = {
                uri: encryptedUri,
                name: 'encrypted_' + result.assets[0].name,
                type: result.assets[0].mimeType,
            };

            // Subir archivo
            console.log('📤 Subiendo archivo al servidor...');
            await uploadFile(file, geohash);
            console.log('✅ Archivo subido exitosamente');
            
            Alert.alert('Éxito', 'Archivo subido y encriptado correctamente');
        } catch (error) {
            console.error('❌ Error en el proceso de subida:', error);
            Alert.alert('Error', 'No se pudo subir el archivo. Por favor, intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Subir Archivo</Text>
            <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleUpload}
                disabled={loading}
            >
                {loading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Seleccionar Archivo</Text>
                )}
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    button: {
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 5,
        marginTop: 10,
    },
    buttonDisabled: {
        backgroundColor: '#999',
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },
}); 