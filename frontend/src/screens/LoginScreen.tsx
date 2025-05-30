import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    TouchableOpacity,
    StyleSheet,
    Alert,
    ActivityIndicator,
} from 'react-native';
import { NavigationProp } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { testConnection } from '../services/api';
import AsyncStorage from '@react-native-async-storage/async-storage';

type Props = {
    navigation: NavigationProp;
};

export const LoginScreen: React.FC<Props> = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isCheckingConnection, setIsCheckingConnection] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const { signIn } = useAuth();

    useEffect(() => {
        checkConnection();
    }, []);

    const checkConnection = async () => {
        try {
            console.log('🔍 Verificando conexión con el servidor...');
            await testConnection();
            console.log('✅ Conexión exitosa');
        } catch (error) {
            console.error('❌ Error de conexión:', error);
            Alert.alert(
                'Error de Conexión',
                'No se pudo conectar con el servidor. Por favor, verifica tu conexión a internet y que el servidor esté funcionando.'
            );
        } finally {
            setIsCheckingConnection(false);
        }
    };

    const handleLogin = async () => {
        if (!username || !password) {
            Alert.alert('Error', 'Por favor, completa todos los campos');
            return;
        }

        try {
            setIsLoading(true);
            console.log('🔑 Iniciando sesión...');
            await signIn({ username, password });
            console.log('✅ Sesión iniciada exitosamente');
        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);
            Alert.alert('Error', 'No se pudo iniciar sesión. Por favor, verifica tus credenciales.');
        } finally {
            setIsLoading(false);
        }
    };

    if (isCheckingConnection) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#007AFF" />
                <Text style={styles.loadingText}>Verificando conexión...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Iniciar Sesión</Text>
            <TextInput
                style={styles.input}
                placeholder="Usuario"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                editable={!isLoading}
            />
            <TextInput
                style={styles.input}
                placeholder="Contraseña"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                editable={!isLoading}
            />
            <TouchableOpacity
                style={[styles.button, isLoading && styles.buttonDisabled]}
                onPress={handleLogin}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Iniciar Sesión</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Register')}
                disabled={isLoading}
            >
                <Text style={styles.linkText}>¿No tienes cuenta? Regístrate</Text>
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
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    input: {
        backgroundColor: 'white',
        padding: 15,
        borderRadius: 5,
        marginBottom: 10,
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
    linkButton: {
        marginTop: 15,
    },
    linkText: {
        color: '#007AFF',
        textAlign: 'center',
    },
}); 