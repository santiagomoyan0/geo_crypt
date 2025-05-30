import React, { useState } from 'react';
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

type Props = {
    navigation: NavigationProp;
};

export const RegisterScreen: React.FC<Props> = ({ navigation }) => {
    const [username, setUsername] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { signUp } = useAuth();

    const handleRegister = async () => {
        if (!username || !email || !password) {
            Alert.alert('Error', 'Por favor, completa todos los campos');
            return;
        }

        try {
            setIsLoading(true);
            console.log('📝 Registrando usuario...');
            await signUp({ username, email, password });
            console.log('✅ Usuario registrado exitosamente');
        } catch (error) {
            console.error('❌ Error al registrar usuario:', error);
            Alert.alert(
                'Error de Registro',
                'No se pudo registrar el usuario. Por favor, intenta nuevamente.'
            );
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Registro</Text>
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
                placeholder="Correo electrónico"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
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
                onPress={handleRegister}
                disabled={isLoading}
            >
                {isLoading ? (
                    <ActivityIndicator color="white" />
                ) : (
                    <Text style={styles.buttonText}>Registrarse</Text>
                )}
            </TouchableOpacity>
            <TouchableOpacity
                style={styles.linkButton}
                onPress={() => navigation.navigate('Login')}
                disabled={isLoading}
            >
                <Text style={styles.linkText}>¿Ya tienes cuenta? Inicia sesión</Text>
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