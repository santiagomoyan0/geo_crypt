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
import { getFiles } from '../services/api';
import { File } from '../types';

type Props = {
    navigation: NavigationProp;
};

export const FileListScreen: React.FC<Props> = ({ navigation }) => {
    const [files, setFiles] = useState<File[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    useEffect(() => {
        loadFiles();
    }, []);

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

    const handleFilePress = (file: File) => {
        navigation.navigate('FileDetails', { file });
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