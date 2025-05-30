import React, { useState } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
    Share,
} from 'react-native';
import * as Location from 'expo-location';
import * as Crypto from 'expo-crypto';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import ngeohash from 'ngeohash';
import { downloadFile, deleteFile } from '../services/api';
import { File } from '../types';
import { NavigationProp, FileDetailsRouteProp } from '../types/navigation';
import { getGeohash, decryptFile } from '../services/encryption';

type Props = {
    navigation: NavigationProp;
    route: FileDetailsRouteProp;
};

export const FileDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { file } = route.params;
    const [loading, setLoading] = useState(false);

    const handleDownload = async () => {
        try {
            setLoading(true);
            console.log('📥 Iniciando descarga del archivo:', file.filename);

            // Obtener geohash
            const geohash = await getGeohash();
            if (!geohash) {
                console.error('❌ No se pudo obtener el geohash');
                Alert.alert('Error', 'No se pudo obtener la ubicación. Por favor, intenta nuevamente.');
                return;
            }

            // Descargar y guardar archivo
            console.log('📥 Descargando archivo del servidor...');
            const savedUri = await downloadFile(file.id, geohash);
            console.log('✅ Archivo guardado en:', savedUri);

            Alert.alert(
                'Éxito',
                'Archivo descargado y guardado correctamente',
                [
                    {
                        text: 'Abrir',
                        onPress: async () => {
                            try {
                                await Sharing.shareAsync(savedUri);
                            } catch (error) {
                                console.error('Error al abrir el archivo:', error);
                                Alert.alert('Error', 'No se pudo abrir el archivo');
                            }
                        }
                    },
                    {
                        text: 'OK',
                        style: 'cancel'
                    }
                ]
            );
        } catch (error: any) {
            console.error('❌ Error en el proceso de descarga:', error);
            if (error.message === 'Guardado cancelado por el usuario') {
                Alert.alert('Información', 'La descarga fue cancelada');
            } else {
                Alert.alert('Error', 'No se pudo descargar el archivo. Por favor, intenta nuevamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            setLoading(true);
            console.log('📤 Iniciando proceso de compartir archivo:', file.filename);

            // Obtener geohash
            const geohash = await getGeohash();
            if (!geohash) {
                console.error('❌ No se pudo obtener el geohash');
                return;
            }

            // Descargar y desencriptar archivo
            const encryptedUri = await downloadFile(file.id, geohash);
            const decryptedUri = await decryptFile(encryptedUri, geohash);

            // Compartir archivo
            await Share.share({
                url: decryptedUri,
                title: file.filename,
            });
            console.log('✅ Archivo compartido exitosamente');
        } catch (error) {
            console.error('❌ Error al compartir el archivo:', error);
            Alert.alert('Error', 'No se pudo compartir el archivo. Por favor, intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            setLoading(true);
            console.log('🗑️ Iniciando eliminación del archivo:', file.filename);

            await deleteFile(file.id);
            console.log('✅ Archivo eliminado exitosamente');
            
            Alert.alert('Éxito', 'Archivo eliminado correctamente');
        } catch (error) {
            console.error('❌ Error al eliminar el archivo:', error);
            Alert.alert('Error', 'No se pudo eliminar el archivo. Por favor, intenta nuevamente.');
        } finally {
            setLoading(false);
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Detalles del Archivo</Text>
            <View style={styles.detailsContainer}>
                <Text style={styles.label}>Nombre:</Text>
                <Text style={styles.value}>{file.filename}</Text>
                
                <Text style={styles.label}>Tamaño:</Text>
                <Text style={styles.value}>{formatFileSize(file.size)}</Text>
                
                <Text style={styles.label}>Tipo:</Text>
                <Text style={styles.value}>{file.mimetype}</Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, styles.downloadButton, loading && styles.buttonDisabled]}
                    onPress={handleDownload}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="white" />
                    ) : (
                        <Text style={styles.buttonText}>Descargar</Text>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.shareButton, loading && styles.buttonDisabled]}
                    onPress={handleShare}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Compartir</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[styles.button, styles.deleteButton, loading && styles.buttonDisabled]}
                    onPress={handleDelete}
                    disabled={loading}
                >
                    <Text style={styles.buttonText}>Eliminar</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    detailsContainer: {
        backgroundColor: 'white',
        padding: 20,
        borderRadius: 10,
        marginBottom: 20,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 5,
    },
    value: {
        fontSize: 18,
        marginBottom: 15,
    },
    buttonContainer: {
        gap: 10,
    },
    button: {
        padding: 15,
        borderRadius: 5,
        alignItems: 'center',
    },
    buttonDisabled: {
        backgroundColor: '#999',
    },
    downloadButton: {
        backgroundColor: '#007AFF',
    },
    shareButton: {
        backgroundColor: '#34C759',
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
}); 