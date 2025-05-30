import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { RegisterScreen } from '../screens/RegisterScreen';
import { FileListScreen } from '../screens/FileListScreen';
import { FileDetailsScreen } from '../screens/FileDetailsScreen';
import { UploadScreen } from '../screens/UploadScreen';
import { RootStackParamList } from '../types/navigation';
import { useAuth } from '../contexts/AuthContext';
import { TouchableOpacity, Text } from 'react-native';

const Stack = createNativeStackNavigator<RootStackParamList>();

export const Navigation: React.FC = () => {
    const { isAuthenticated, signOut } = useAuth();

    return (
        <NavigationContainer>
            <Stack.Navigator
                screenOptions={{
                    headerStyle: {
                        backgroundColor: '#007AFF',
                    },
                    headerTintColor: '#fff',
                    headerTitleStyle: {
                        fontWeight: 'bold',
                    },
                }}
            >
                {!isAuthenticated ? (
                    // Rutas de autenticación
                    <>
                        <Stack.Screen
                            name="Login"
                            component={LoginScreen}
                            options={{ headerShown: false }}
                        />
                        <Stack.Screen
                            name="Register"
                            component={RegisterScreen}
                            options={{ headerShown: false }}
                        />
                    </>
                ) : (
                    // Rutas de la aplicación
                    <>
                        <Stack.Screen
                            name="FileList"
                            component={FileListScreen}
                            options={{
                                title: 'Mis Archivos',
                                headerStyle: {
                                    backgroundColor: '#007AFF',
                                },
                                headerTitleStyle: {
                                    fontSize: 18,
                                },
                                headerRight: () => (
                                    <TouchableOpacity
                                        onPress={signOut}
                                        style={{ marginRight: 15 }}
                                    >
                                        <Text style={{ color: '#fff', fontWeight: 'bold' }}>
                                            Cerrar Sesión
                                        </Text>
                                    </TouchableOpacity>
                                ),
                            }}
                        />
                        <Stack.Screen
                            name="FileDetails"
                            component={FileDetailsScreen}
                            options={{ title: 'Detalles del Archivo' }}
                        />
                        <Stack.Screen
                            name="Upload"
                            component={UploadScreen}
                            options={{ title: 'Subir Archivo' }}
                        />
                    </>
                )}
            </Stack.Navigator>
        </NavigationContainer>
    );
}; 