import * as Crypto from 'expo-crypto';
import * as FileSystem from 'expo-file-system';
import * as Location from 'expo-location';
import ngeohash from 'ngeohash';

// Función para verificar si un geohash está dentro del área permitida
export const isWithinAllowedArea = (currentGeohash: string, originalGeohash: string): boolean => {
    try {
        if (!currentGeohash || !originalGeohash) {
            console.error('❌ Geohash inválido:', { currentGeohash, originalGeohash });
            return false;
        }

        // Obtener las coordenadas de ambos geohashes
        const currentCoords = ngeohash.decode(currentGeohash);
        const originalCoords = ngeohash.decode(originalGeohash);

        if (!currentCoords || !originalCoords) {
            console.error('❌ No se pudieron decodificar las coordenadas:', { currentGeohash, originalGeohash });
            return false;
        }

        // Calcular la distancia en kilómetros usando la fórmula de Haversine
        const R = 6371; // Radio de la Tierra en km
        const dLat = (currentCoords.latitude - originalCoords.latitude) * Math.PI / 180;
        const dLon = (currentCoords.longitude - originalCoords.longitude) * Math.PI / 180;
        const a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(originalCoords.latitude * Math.PI / 180) * Math.cos(currentCoords.latitude * Math.PI / 180) * 
            Math.sin(dLon/2) * Math.sin(dLon/2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
        const distance = R * c;

        // La distancia permitida depende de la precisión del geohash
        // Para precisión 7 (que es la que usamos), el área es aproximadamente 76 metros
        const allowedDistance = 0.1; // 100 metros de radio permitido

        console.log('📍 Distancia actual:', distance.toFixed(2), 'km');
        console.log('📍 Distancia permitida:', allowedDistance, 'km');
        console.log('📍 Coordenadas actuales:', currentCoords);
        console.log('📍 Coordenadas originales:', originalCoords);

        return distance <= allowedDistance;
    } catch (error) {
        console.error('❌ Error al verificar ubicación:', error);
        return false;
    }
};

export const getGeohash = async (precision: number = 7): Promise<string | null> => {
    try {
        console.log('📍 Obteniendo ubicación...');
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
            console.error('❌ Permiso de ubicación denegado');
            return null;
        }

        const location = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
        });
        const { latitude, longitude } = location.coords;
        console.log('📍 Ubicación obtenida:', { latitude, longitude });

        const geohash = ngeohash.encode(latitude, longitude, precision);
        console.log('🔑 Geohash generado:', geohash);

        return geohash;
    } catch (error) {
        console.error('❌ Error al obtener geohash:', error);
        return null;
    }
};

// Función para convertir string a Uint8Array
const stringToUint8Array = (str: string): Uint8Array => {
    const encoder = new TextEncoder();
    return encoder.encode(str);
};

// Función para convertir Uint8Array a string
const uint8ArrayToString = (arr: Uint8Array): string => {
    const decoder = new TextDecoder();
    return decoder.decode(arr);
};

// Función para XOR dos Uint8Arrays
const xorArrays = (a: Uint8Array, b: Uint8Array): Uint8Array => {
    const result = new Uint8Array(a.length);
    for (let i = 0; i < a.length; i++) {
        result[i] = a[i] ^ b[i % b.length];
    }
    return result;
};

export const encryptFile = async (fileUri: string, geohash: string): Promise<string> => {
    try {
        console.log('🔐 Iniciando encriptación de archivo...');
        console.log('📁 Leyendo archivo desde:', fileUri);
        
        const fileContent = await FileSystem.readAsStringAsync(fileUri, {
            encoding: FileSystem.EncodingType.Base64,
        });
        console.log('📄 Contenido del archivo leído (primeros 100 caracteres):', fileContent.substring(0, 100));

        console.log('🔑 Generando clave desde geohash:', geohash);
        const key = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            geohash
        );
        console.log('🔑 Clave generada (primeros 100 caracteres):', key.substring(0, 100));

        console.log('🔒 Encriptando contenido...');
        const fileBytes = stringToUint8Array(fileContent);
        const keyBytes = stringToUint8Array(key);
        const encryptedBytes = xorArrays(fileBytes, keyBytes);
        const encryptedContent = btoa(uint8ArrayToString(encryptedBytes));
        console.log('🔒 Contenido encriptado (primeros 100 caracteres):', encryptedContent.substring(0, 100));

        const encryptedUri = FileSystem.documentDirectory + 'encrypted_' + Date.now() + '.txt';
        console.log('💾 Guardando archivo encriptado en:', encryptedUri);
        await FileSystem.writeAsStringAsync(encryptedUri, encryptedContent, {
            encoding: FileSystem.EncodingType.UTF8,
        });

        console.log('✅ Archivo encriptado exitosamente');
        return encryptedUri;
    } catch (error) {
        console.error('❌ Error al encriptar archivo:', error);
        throw error;
    }
};

export const decryptFile = async (encryptedUri: string, geohash: string): Promise<string> => {
    try {
        console.log('🔓 Iniciando desencriptación de archivo...');
        console.log('📁 Leyendo archivo encriptado desde:', encryptedUri);
        
        const encryptedContent = await FileSystem.readAsStringAsync(encryptedUri, {
            encoding: FileSystem.EncodingType.UTF8,
        });
        console.log('📄 Contenido encriptado leído (primeros 100 caracteres):', encryptedContent.substring(0, 100));

        console.log('🔑 Generando clave desde geohash:', geohash);
        const key = await Crypto.digestStringAsync(
            Crypto.CryptoDigestAlgorithm.SHA256,
            geohash
        );
        console.log('🔑 Clave generada (primeros 100 caracteres):', key.substring(0, 100));

        console.log('🔓 Desencriptando contenido...');
        const encryptedBytes = stringToUint8Array(atob(encryptedContent));
        const keyBytes = stringToUint8Array(key);
        const decryptedBytes = xorArrays(encryptedBytes, keyBytes);
        const decryptedContent = uint8ArrayToString(decryptedBytes);
        console.log('🔓 Contenido desencriptado (primeros 100 caracteres):', decryptedContent.substring(0, 100));

        const decryptedUri = FileSystem.documentDirectory + 'decrypted_' + Date.now() + '.txt';
        console.log('💾 Guardando archivo desencriptado en:', decryptedUri);
        await FileSystem.writeAsStringAsync(decryptedUri, decryptedContent, {
            encoding: FileSystem.EncodingType.Base64,
        });

        console.log('✅ Archivo desencriptado exitosamente');
        return decryptedUri;
    } catch (error) {
        console.error('❌ Error al desencriptar archivo:', error);
        throw error;
    }
}; 