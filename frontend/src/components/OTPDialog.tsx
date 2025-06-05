import React, { useState, useEffect } from 'react';
import { Modal, View, Text, TextInput, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getFileOTP } from '../services/api';

interface OTPDialogProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (otp: string) => void;
    fileId: number;
}

export const OTPDialog: React.FC<OTPDialogProps> = ({ visible, onClose, onConfirm, fileId }) => {
    const [otp, setOtp] = useState('');
    const [serverOtp, setServerOtp] = useState<string | null>(null);
    const [timeLeft, setTimeLeft] = useState(90);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (visible) {
            // Obtener OTP del servidor
            getFileOTP(fileId)
                .then(otp => {
                    setServerOtp(otp);
                    setTimeLeft(90);
                })
                .catch(error => {
                    console.error('Error al obtener OTP:', error);
                    Alert.alert('Error', 'No se pudo obtener el código OTP');
                    onClose();
                });

            // Iniciar temporizador
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) clearInterval(timer);
        };
    }, [visible, fileId]);

    const handleConfirm = () => {
        if (otp.length < 6) {
            Alert.alert('Error', 'El código OTP debe tener 6 dígitos');
            return;
        }
        onConfirm(otp);
        setOtp('');
        setServerOtp(null);
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <Text style={styles.title}>Ingrese el código OTP</Text>
                    <Text style={styles.subtitle}>
                        El código OTP es válido por 1.5 minutos
                    </Text>
                    {serverOtp && (
                        <View style={styles.otpContainer}>
                            <Text style={styles.otpLabel}>Código OTP:</Text>
                            <Text style={styles.otpCode}>{serverOtp}</Text>
                            <Text style={styles.timer}>Tiempo restante: {timeLeft}s</Text>
                        </View>
                    )}
                    <TextInput
                        style={styles.input}
                        value={otp}
                        onChangeText={setOtp}
                        placeholder="Ingrese el código de 6 dígitos"
                        keyboardType="number-pad"
                        maxLength={6}
                        secureTextEntry
                    />
                    <View style={styles.buttonContainer}>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonCancel]}
                            onPress={onClose}
                        >
                            <Text style={styles.buttonText}>Cancelar</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.buttonConfirm]}
                            onPress={handleConfirm}
                        >
                            <Text style={styles.buttonText}>Confirmar</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalView: {
        margin: 20,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 35,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
        width: '80%',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        marginBottom: 10,
        textAlign: 'center',
    },
    subtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        textAlign: 'center',
    },
    otpContainer: {
        backgroundColor: '#f0f0f0',
        padding: 15,
        borderRadius: 10,
        marginBottom: 20,
        width: '100%',
        alignItems: 'center',
    },
    otpLabel: {
        fontSize: 16,
        color: '#666',
        marginBottom: 5,
    },
    otpCode: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2196F3',
        letterSpacing: 5,
        marginBottom: 5,
    },
    timer: {
        fontSize: 14,
        color: '#ff4444',
    },
    input: {
        width: '100%',
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 10,
        paddingHorizontal: 15,
        fontSize: 18,
        textAlign: 'center',
        letterSpacing: 5,
        marginBottom: 20,
    },
    buttonContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    button: {
        borderRadius: 10,
        padding: 15,
        elevation: 2,
        minWidth: '45%',
    },
    buttonCancel: {
        backgroundColor: '#ff4444',
    },
    buttonConfirm: {
        backgroundColor: '#2196F3',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
    },
}); 