import React, { useState } from 'react';
import { View, Text, Modal, StyleSheet, TouchableOpacity, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface PartialUseModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: (quantity: number) => void;
    maxQuantity: number;
    title: string;
    unit?: string;
}

const PartialUseModal = ({ visible, onClose, onConfirm, maxQuantity, title, unit }: PartialUseModalProps) => {
    const [quantity, setQuantity] = useState(maxQuantity > 0 ? (maxQuantity / 2).toString() : '0');

    const handleConfirm = () => {
        const parsedQuantity = parseFloat(quantity);
        if (isNaN(parsedQuantity) || parsedQuantity <= 0 || parsedQuantity > maxQuantity) {
            return;
        }
        onConfirm(parsedQuantity);
        onClose();
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.overlay}>
                <View style={styles.container}>
                    <View style={styles.header}>
                        <Text style={styles.title}>{title}</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.label}>请输入数量：</Text>
                    <View style={styles.inputContainer}>
                        <TextInput
                            style={styles.input}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="decimal-pad"
                            maxLength={10}
                            selectTextOnFocus
                        />
                        {unit && <Text style={styles.unit}>{unit}</Text>}
                    </View>
                    <Text style={styles.hint}>最大可用数量: {maxQuantity} {unit || ''}</Text>

                    <View style={styles.buttons}>
                        <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                            <Text style={styles.cancelButtonText}>取消</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.confirmButton} onPress={handleConfirm}>
                            <Text style={styles.confirmButtonText}>确认</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    container: {
        width: '80%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    label: {
        fontSize: 16,
        marginBottom: 8,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        paddingHorizontal: 12,
    },
    input: {
        flex: 1,
        paddingVertical: 10,
        fontSize: 16,
    },
    unit: {
        fontSize: 16,
        color: '#666',
        marginLeft: 8,
    },
    hint: {
        fontSize: 14,
        color: '#666',
        marginTop: 8,
    },
    buttons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        marginTop: 20,
        gap: 12,
    },
    cancelButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
    },
    confirmButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
        backgroundColor: '#4A90E2',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
    confirmButtonText: {
        color: 'white',
        fontSize: 16,
    },
});

export default PartialUseModal; 