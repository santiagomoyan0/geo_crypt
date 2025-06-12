import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    FlatList,
    TouchableOpacity,
    StyleSheet,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { NavigationProp } from '../types/navigation';
import { getFiles, downloadFile, getFileOTP, getFile } from '../services/api';
import { File } from '../types';
import { OTPDialog } from '../components/OTPDialog';
import * as Location from 'expo-location';
import { getGeohash } from '../services/encryption';

type Props = {
    navigation: NavigationProp;
};

export const FileListScreen: React.FC<Props> = ({ navigation }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [otpDialogVisible, setOtpDialogVisible] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [currentGeohash, setCurrentGeohash] = useState<string>('');

    useEffect(() => {
        loadFiles();
        getCurrentLocation();
    }, []);

    const getCurrentLocation = async () => {
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Error', 'Se requiere permiso de ubicación');
                return;
            }

            const geohash = await getGeohash();
            if (geohash) {
                setCurrentGeohash(geohash);
            }
        } catch (error) {
            console.error('Error al obtener ubicación:', error);
            Alert.alert('Error', 'No se pudo obtener la ubicación');
        }
    };

    const loadFiles = async () => {
        try {
            console.log('📋 Cargando lista de archivos...');
            const response = await getFiles();
            console.log('✅ Archivos cargados:', response.length);
            setFiles(response);
        } catch (error) {
            console.error('❌ Error al cargar archivos:', error);
            Alert.alert('Error', 'No se pudieron cargar los archivos. Por favor, intenta nuevamente.');
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const handleRefresh = () => {
        setRefreshing(true);
        loadFiles();
    };

    const handleDownload = async (file: File) => {
        if (!currentGeohash) {
            // Intentar obtener la ubicación nuevamente
            getCurrentLocation();
            return;
        }
        setSelectedFile(file);
        setOtpDialogVisible(true);
    };

    const handleOTPConfirm = async (otp: string) => {
        if (!selectedFile) return;

        try {
            setOtpDialogVisible(false);
            const filePath = await downloadFile(selectedFile.id, currentGeohash, otp);
            Alert.alert('Éxito', 'Archivo descargado correctamente');
        } catch (error) {
            console.error('Error al descargar archivo:', error);
            Alert.alert('Error', 'No se pudo descargar el archivo');
        }
    };

    const handleFilePress = async (file: File) => {
        try {
            setLoading(true);
            const completeFile = await getFile(file.id);
            navigation.navigate('FileDetails', { file: completeFile });
        } catch (error) {
            console.error('Error al obtener detalles del archivo:', error);
            Alert.alert('Error', 'No se pudieron cargar los detalles del archivo');
        } finally {
            setLoading(false);
        }
    };

    const renderItem = ({ item }: { item: File }) => (
        <TouchableOpacity
            style={styles.fileItem}
            onPress={() => handleFilePress(item)}
        >
            <View style={styles.fileInfo}>
                <Text style={styles.fileName}>{item.filename}</Text>
                <Text style={styles.fileSize}>{formatFileSize(item.size)}</Text>
            </View>
            <Text style={styles.fileType}>{item.mimetype}</Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Cargando archivos...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={files}
                renderItem={renderItem}
                keyExtractor={(item) => item.id.toString()}
                refreshing={refreshing}
                onRefresh={handleRefresh}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Text style={styles.emptyText}>No hay archivos disponibles</Text>
                    </View>
                }
            />
            <TouchableOpacity
                style={styles.uploadButton}
                onPress={() => navigation.navigate('Upload')}
            >
                <Text style={styles.uploadButtonText}>Subir Archivo</Text>
            </TouchableOpacity>
            <OTPDialog
                visible={otpDialogVisible}
                onClose={() => setOtpDialogVisible(false)}
                onConfirm={handleOTPConfirm}
                fileId={selectedFile?.id || 0}
            />
        </View>
    );
};

const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    listContent: {
        flexGrow: 1,
        paddingBottom: 80, // Espacio para el botón de subir
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    loadingText: {
        marginTop: 10,
        fontSize: 16,
        color: '#666',
    },
    fileItem: {
        backgroundColor: 'white',
        padding: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    fileInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 5,
    },
    fileName: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
        flex: 1,
        marginRight: 10,
    },
    fileSize: {
        fontSize: 14,
        color: '#666',
    },
    fileType: {
        fontSize: 14,
        color: '#999',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyText: {
        fontSize: 16,
        color: '#666',
        textAlign: 'center',
    },
    uploadButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        backgroundColor: '#007AFF',
        padding: 15,
        borderRadius: 30,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
    },
    uploadButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
}); 