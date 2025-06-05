import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import * as DocumentPicker from 'expo-document-picker';
import * as Location from 'expo-location';
import { uploadFile } from '../services/api';
import { getGeohash, encryptFile } from '../services/encryption';

export const UploadScreen: React.FC = () => {
    const [loading, setLoading] = useState(false);
    const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        checkLocationServices();
    }, []);

    const checkLocationServices = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            const enabled = await Location.hasServicesEnabledAsync();
            setLocationEnabled(status === 'granted' && enabled);
        } catch (error) {
            console.error('Error al verificar servicios de ubicación:', error);
            setLocationEnabled(false);
        }
    };

    const handleUpload = async () => {
        try {
            setLoading(true);
            console.log('📤 Iniciando proceso de subida de archivo...');
            
            // Verificar servicios de ubicación
            if (!locationEnabled) {
                const enabled = await Location.hasServicesEnabledAsync();
                if (!enabled) {
                    Alert.alert(
                        'Servicios de ubicación desactivados',
                        'Por favor, activa los servicios de ubicación para continuar.',
                        [
                            {
                                text: 'OK',
                                onPress: () => checkLocationServices()
                            }
                        ]
                    );
                    return;
                }
                await checkLocationServices();
                if (!locationEnabled) return;
            }
            
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
                Alert.alert(
                    'Error de ubicación',
                    'No se pudo obtener la ubicación actual. Por favor, asegúrate de que los servicios de ubicación estén activados y vuelve a intentarlo.',
                    [
                        {
                            text: 'Reintentar',
                            onPress: () => {
                                checkLocationServices();
                                handleUpload();
                            }
                        },
                        {
                            text: 'Cancelar',
                            style: 'cancel'
                        }
                    ]
                );
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
            {locationEnabled === false && (
                <Text style={styles.warning}>
                    Los servicios de ubicación están desactivados. Por favor, actívalos para subir archivos.
                </Text>
            )}
            <TouchableOpacity
                style={[styles.button, (loading || locationEnabled === false) && styles.buttonDisabled]}
                onPress={handleUpload}
                disabled={loading || locationEnabled === false}
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
    warning: {
        color: '#ff4444',
        textAlign: 'center',
        marginBottom: 20,
        padding: 10,
        backgroundColor: '#ffe6e6',
        borderRadius: 5,
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