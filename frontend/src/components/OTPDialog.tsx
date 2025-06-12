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
    const [timeLeft, setTimeLeft] = useState(90);
    const [emailSent, setEmailSent] = useState(false);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (visible && !emailSent) {
            console.log('📧 Iniciando solicitud de OTP por email...');
            // Solicitar envío de OTP por email
            getFileOTP(fileId)
                .then(() => {
                    console.log('✅ Solicitud de OTP enviada exitosamente');
                    setEmailSent(true);
                    setTimeLeft(90);
                    Alert.alert(
                        'Código OTP enviado',
                        'Se ha enviado un código OTP a tu correo electrónico. Por favor, revisa tu bandeja de entrada.'
                    );
                })
                .catch(error => {
                    console.error('❌ Error al solicitar OTP:', error);
                    console.error('Detalles del error:', {
                        message: error.message,
                        response: error.response?.data,
                        status: error.response?.status
                    });
                    Alert.alert('Error', 'No se pudo enviar el código OTP por email');
                    onClose();
                });

            // Iniciar temporizador
            console.log('⏱️ Iniciando temporizador de 90 segundos');
            timer = setInterval(() => {
                setTimeLeft(prev => {
                    if (prev <= 1) {
                        console.log('⏱️ Tiempo de OTP expirado');
                        clearInterval(timer);
                        return 0;
                    }
                    return prev - 1;
                });
            }, 1000);
        }

        return () => {
            if (timer) {
                console.log('🧹 Limpiando temporizador');
                clearInterval(timer);
            }
        };
    }, [visible, fileId, emailSent]);

    const handleConfirm = () => {
        if (otp.length < 6) {
            console.log('❌ OTP inválido: longitud insuficiente');
            Alert.alert('Error', 'El código OTP debe tener 6 dígitos');
            return;
        }
        console.log('🔑 OTP ingresado:', otp);
        console.log('✅ Confirmando OTP...');
        onConfirm(otp);
        setOtp('');
        setEmailSent(false);
    };

    const handleOtpChange = (text: string) => {
        console.log('📝 OTP ingresado:', text);
        setOtp(text);
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
                    {emailSent && (
                        <View style={styles.otpContainer}>
                            <Text style={styles.otpLabel}>Código OTP enviado a tu email</Text>
                            <Text style={styles.timer}>Tiempo restante: {timeLeft}s</Text>
                        </View>
                    )}
                    <TextInput
                        style={styles.input}
                        value={otp}
                        onChangeText={handleOtpChange}
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