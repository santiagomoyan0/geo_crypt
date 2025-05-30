import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LoginCredentials, RegisterCredentials, AuthResponse, File, User } from '../types';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { decryptFile, isWithinAllowedArea } from './encryption';

const API_URL = 'http://192.168.18.4:8088';

const api = axios.create({
    baseURL: API_URL.replace(/\/$/, ''), // Elimina la barra final si existe
    headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
    },
    timeout: 10000, // 10 segundos de timeout
});

// Interceptor para logging de requests
api.interceptors.request.use(
    async (config) => {
        console.log('🚀 Request:', {
            method: config.method,
            url: config.url,
            headers: config.headers,
            data: config.data,
        });
        
        const token = await AsyncStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        console.error('❌ Request Error:', error);
        return Promise.reject(error);
    }
);

// Interceptor para logging de responses
api.interceptors.response.use(
    (response) => {
        console.log('✅ Response:', {
            status: response.status,
            data: response.data,
        });
        return response;
    },
    (error) => {
        console.error('❌ Response Error:', {
            status: error.response?.status,
            data: error.response?.data,
            message: error.message,
            config: {
                url: error.config?.url,
                method: error.config?.method,
            },
        });
        return Promise.reject(error);
    }
);

export const testConnection = async () => {
    try {
        console.log('🔍 Testing connection to:', API_URL);
        const response = await api.get('/');
        console.log('✅ Connection test successful:', response.data);
        return response.data;
    } catch (error) {
        console.error('❌ Connection test failed:', error);
        if (axios.isAxiosError(error)) {
            if (error.code === 'ECONNREFUSED') {
                throw new Error('No se pudo conectar al servidor. Verifica que el backend esté en ejecución.');
            }
            if (error.response) {
                throw new Error(`Error del servidor: ${error.response.status} - ${error.response.data?.detail || error.message}`);
            }
            if (error.request) {
                throw new Error('No se recibió respuesta del servidor. Verifica tu conexión a internet.');
            }
        }
        throw error;
    }
};

export const login = async (username: string, password: string): Promise<AuthResponse> => {
    try {
        console.log('🔑 Iniciando sesión...');
        const response = await api.post<AuthResponse>('/auth/login', { username, password });
        console.log('✅ Sesión iniciada exitosamente');
        return response.data;
    } catch (error) {
        console.error('❌ Error al iniciar sesión:', error);
        throw error;
    }
};

export const register = async (username: string, email: string, password: string): Promise<AuthResponse> => {
    try {
        console.log('📝 Registrando usuario...');
        const response = await api.post<AuthResponse>('/auth/register', { username, email, password });
        console.log('✅ Usuario registrado exitosamente');
        return response.data;
    } catch (error) {
        console.error('❌ Error al registrar usuario:', error);
        throw error;
    }
};

export const getUserInfo = async (): Promise<User> => {
    try {
        console.log('👤 Obteniendo información del usuario...');
        const response = await api.get<User>('/users/me');
        console.log('✅ Información del usuario obtenida');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener información del usuario:', error);
        throw error;
    }
};

export const uploadFile = async (file: any, geohash: string): Promise<File> => {
    try {
        console.log('📤 Subiendo archivo...');
        const formData = new FormData();
        formData.append('file', file);
        formData.append('geohash', geohash);

        const response = await api.post<File>('files/upload', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        console.log('✅ Archivo subido exitosamente');
        return response.data;
    } catch (error) {
        console.error('❌ Error al subir archivo:', error);
        throw error;
    }
};

export const getFiles = async (): Promise<File[]> => {
    try {
        console.log('📋 Obteniendo lista de archivos...');
        const response = await api.get<File[]>('files');
        console.log('✅ Lista de archivos obtenida');
        return response.data;
    } catch (error) {
        console.error('❌ Error al obtener lista de archivos:', error);
        throw error;
    }
};

export const getFile = async (fileId: number): Promise<File> => {
    const response = await api.get(`files/${fileId}`);
    return response.data;
};

async function saveFile(uri: string, filename: string, mimetype: string): Promise<string> {
    if (Platform.OS === "android") {
        const permissions = await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync();
        
        if (permissions.granted) {
            const base64 = await FileSystem.readAsStringAsync(uri, { 
                encoding: FileSystem.EncodingType.Base64 
            });

            const newUri = await FileSystem.StorageAccessFramework.createFileAsync(
                permissions.directoryUri,
                filename,
                mimetype
            );

            await FileSystem.writeAsStringAsync(newUri, base64, { 
                encoding: FileSystem.EncodingType.Base64 
            });

            return newUri;
        } else {
            // Si no se otorgan permisos, compartir el archivo
            await Sharing.shareAsync(uri);
            return uri;
        }
    } else {
        // En iOS, compartir el archivo
        await Sharing.shareAsync(uri);
        return uri;
    }
}

export const downloadFile = async (fileId: number, geohash: string): Promise<string> => {
    try {
        console.log('📥 Descargando archivo...');
        
        // Obtener información del archivo primero
        const fileInfo = await api.get(`files/${fileId}`);
        const { filename, mimetype, geohash: originalGeohash } = fileInfo.data;
        console.log('📋 Información del archivo:', { filename, mimetype, originalGeohash });

        // Verificar si estamos en la ubicación permitida
        if (!isWithinAllowedArea(geohash, originalGeohash)) {
            throw new Error('No puedes descargar este archivo porque no te encuentras en la ubicación permitida. Debes estar dentro de un radio de 100 metros de donde se subió el archivo.');
        }

        const response = await api.get(`files/${fileId}/download`, {
            params: { geohash },
            responseType: 'blob',
        });
        console.log('✅ Archivo descargado exitosamente');

        // Convertir el Blob a base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
                const base64 = reader.result as string;
                resolve(base64.split(',')[1]);
            };
            reader.onerror = reject;
            reader.readAsDataURL(response.data);
        });

        const base64 = await base64Promise;
        console.log('📄 Contenido base64 obtenido (primeros 100 caracteres):', base64.substring(0, 100));
        
        // Guardar temporalmente el archivo encriptado
        const encryptedUri = FileSystem.documentDirectory + 'encrypted_' + Date.now() + '.txt';
        console.log('💾 Guardando archivo encriptado temporalmente en:', encryptedUri);
        await FileSystem.writeAsStringAsync(encryptedUri, base64, {
            encoding: FileSystem.EncodingType.Base64,
        });

        // Desencriptar el archivo
        console.log('🔓 Iniciando desencriptación...');
        const decryptedUri = await decryptFile(encryptedUri, geohash);
        console.log('✅ Archivo desencriptado en:', decryptedUri);

        // Guardar el archivo desencriptado en la ubicación elegida por el usuario
        console.log('💾 Guardando archivo desencriptado...');
        const savedUri = await saveFile(decryptedUri, filename, mimetype);
        console.log('✅ Archivo guardado en:', savedUri);

        // Limpiar archivos temporales
        console.log('🧹 Limpiando archivos temporales...');
        await FileSystem.deleteAsync(encryptedUri);
        await FileSystem.deleteAsync(decryptedUri);
        console.log('✅ Archivos temporales eliminados');

        return savedUri;
    } catch (error) {
        console.error('❌ Error al descargar archivo:', error);
        throw error;
    }
};

export const deleteFile = async (fileId: number): Promise<void> => {
    try {
        console.log('🗑️ Eliminando archivo...');
        await api.delete(`files/${fileId}`);
        console.log('✅ Archivo eliminado exitosamente');
    } catch (error) {
        console.error('❌ Error al eliminar archivo:', error);
        throw error;
    }
}; 