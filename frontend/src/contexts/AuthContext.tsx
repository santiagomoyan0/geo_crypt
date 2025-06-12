import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { login, register, getUserInfo } from '../services/api';
import { AuthResponse, LoginCredentials, RegisterCredentials, User } from '../types/auth';

interface AuthContextData {
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    signIn: (credentials: LoginCredentials) => Promise<void>;
    signUp: (credentials: RegisterCredentials) => Promise<void>;
    signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextData>({} as AuthContextData);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [user, setUser] = useState<User | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadStoredData();
    }, []);

    const loadStoredData = async () => {
        try {
            const token = await AsyncStorage.getItem('token');
            if (token) {
                const userData = await getUserInfo();
                setUser(userData);
            }
        } catch (error) {
            console.error('❌ Error al cargar datos almacenados:', error);
        } finally {
            setLoading(false);
        }
    };

    const signIn = async (credentials: LoginCredentials) => {
        try {
            console.log('🔑 Iniciando sesión...');
            const response = await login(credentials.username, credentials.password);
            await AsyncStorage.setItem('token', response.access_token);
            
            // Fetch user data after successful login
            const userData = await getUserInfo();
            setUser(userData);
            
            console.log('✅ Sesión iniciada exitosamente');
        } catch (error) {
            console.error('❌ Error al iniciar sesión:', error);
            throw error;
        }
    };

    const signUp = async (credentials: RegisterCredentials) => {
        try {
            console.log('📝 Registrando usuario...');
            const response = await register(credentials.username, credentials.email, credentials.password);
            await AsyncStorage.setItem('token', response.access_token);
            setUser(response.user);
            console.log('✅ Usuario registrado exitosamente');
        } catch (error) {
            console.error('❌ Error al registrar usuario:', error);
            throw error;
        }
    };

    const signOut = async () => {
        try {
            console.log('🚪 Cerrando sesión...');
            await AsyncStorage.removeItem('token');
            setUser(null);
            console.log('✅ Sesión cerrada exitosamente');
        } catch (error) {
            console.error('❌ Error al cerrar sesión:', error);
            throw error;
        }
    };

    return (
        <AuthContext.Provider
            value={{
                user,
                isAuthenticated: !!user,
                loading,
                signIn,
                signUp,
                signOut,
            }}
        >
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth debe ser usado dentro de un AuthProvider');
    }
    return context;
}; 