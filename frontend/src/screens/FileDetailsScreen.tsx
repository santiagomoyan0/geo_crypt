import React, { useState, useEffect } from 'react';
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
import { downloadFile, deleteFile, getFileOTP } from '../services/api';
import { File } from '../types';
import { NavigationProp, FileDetailsRouteProp } from '../types/navigation';
import { getGeohash, decryptFile } from '../services/encryption';
import { OTPDialog } from '../components/OTPDialog';

type Props = {
    navigation: NavigationProp;
    route: FileDetailsRouteProp;
};

export const FileDetailsScreen: React.FC<Props> = ({ navigation, route }) => {
    const { file } = route.params;
    const [loading, setLoading] = useState(false);
    const [currentGeohash, setCurrentGeohash] = useState<string>('');
    const [otpDialogVisible, setOtpDialogVisible] = useState(false);
    const [locationEnabled, setLocationEnabled] = useState<boolean | null>(null);

    useEffect(() => {
        checkLocationServices();
    }, []);

    const checkLocationServices = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            const enabled = await Location.hasServicesEnabledAsync();
            setLocationEnabled(status === 'granted' && enabled);
            
            if (status === 'granted' && enabled) {
                const geohash = await getGeohash();
                if (geohash) {
                    setCurrentGeohash(geohash);
                }
            }
        } catch (error) {
            console.error('Error al verificar servicios de ubicación:', error);
            setLocationEnabled(false);
        }
    };

    const handleDownload = async () => {
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

        if (!currentGeohash) {
            const geohash = await getGeohash();
            if (geohash) {
                setCurrentGeohash(geohash);
                setOtpDialogVisible(true);
            } else {
                Alert.alert(
                    'Error de ubicación',
                    'No se pudo obtener la ubicación actual. Por favor, asegúrate de que los servicios de ubicación estén activados y vuelve a intentarlo.',
                    [
                        {
                            text: 'Reintentar',
                            onPress: () => checkLocationServices()
                        },
                        {
                            text: 'Cancelar',
                            style: 'cancel'
                        }
                    ]
                );
            }
            return;
        }
        setOtpDialogVisible(true);
    };

    const handleOTPConfirm = async (otp: string) => {
        try {
            setOtpDialogVisible(false);
            setLoading(true);
            const filePath = await downloadFile(file.id, currentGeohash, otp);
            Alert.alert('Éxito', 'Archivo descargado correctamente');
        } catch (error) {
            console.error('Error al descargar archivo:', error);
            Alert.alert('Error', 'No se pudo descargar el archivo');
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        try {
            setLoading(true);
            console.log('📤 Iniciando proceso de compartir archivo:', file.filename);

            if (!currentGeohash) {
                const geohash = await getGeohash();
                if (!geohash) {
                    console.error('❌ No se pudo obtener el geohash');
                    return;
                }
                setCurrentGeohash(geohash);
            }

            // Obtener OTP
            const otp = await getFileOTP(file.id);

            // Descargar y desencriptar archivo
            const encryptedUri = await downloadFile(file.id, currentGeohash, otp);
            const decryptedUri = await decryptFile(encryptedUri, currentGeohash);

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

    const formatFileSize = (bytes: number): string => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Detalles del Archivo</Text>
            <View style={styles.fileInfo}>
                <Text style={styles.label}>Nombre:</Text>
                <Text style={styles.value}>{file.filename}</Text>
                
                <Text style={styles.label}>Tamaño:</Text>
                <Text style={styles.value}>{formatFileSize(file.size)}</Text>
                
                <Text style={styles.label}>Tipo:</Text>
                <Text style={styles.value}>{file.mimetype}</Text>
            </View>

            <View style={styles.buttonContainer}>
                <TouchableOpacity
                    style={[styles.button, loading && styles.buttonDisabled]}
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

            <OTPDialog
                visible={otpDialogVisible}
                onClose={() => setOtpDialogVisible(false)}
                onConfirm={handleOTPConfirm}
                fileId={file.id}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        padding: 20,
        backgroundColor: '#f5f5f5',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    fileInfo: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
    },
    label: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#666',
        marginBottom: 5,
    },
    value: {
        fontSize: 16,
        color: '#333',
        marginBottom: 15,
    },
    buttonContainer: {
        gap: 10,
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
    shareButton: {
        backgroundColor: '#34C759',
    },
    deleteButton: {
        backgroundColor: '#FF3B30',
    },
    buttonText: {
        color: 'white',
        textAlign: 'center',
        fontWeight: 'bold',
    },
}); 