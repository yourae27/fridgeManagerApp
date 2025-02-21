import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import i18n from '../i18n';
import { generateExcel } from '../utils/excel';
import EmptyState from '../components/EmptyState';

interface MenuItem {
    id: string;
    title: string;
    icon: string;
    color: string;
    route?: string;
    onPress?: () => void;
}

const Profile = () => {
    const [showExportModal, setShowExportModal] = useState(false);
    const [email, setEmail] = useState('');
    const [members, setMembers] = useState([]);

    const handleExport = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert('提示', '请输入有效的邮箱地址');
            return;
        }

        try {
            await generateExcel(email);
            Alert.alert('成功', '导出文件已发送到您的邮箱');
            setShowExportModal(false);
            setEmail('');
        } catch (error) {
            Alert.alert('错误', '导出失败，请稍后重试');
        }
    };

    const renderExportModal = () => (
        <Modal
            visible={showExportModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowExportModal(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowExportModal(false)}
            >
                <View style={styles.exportModal}>
                    <Text style={styles.exportTitle}>导出账单</Text>
                    <TextInput
                        style={styles.emailInput}
                        placeholder="请输入邮箱地址"
                        value={email}
                        onChangeText={setEmail}
                        keyboardType="email-address"
                        autoCapitalize="none"
                    />
                    <View style={styles.exportButtons}>
                        <TouchableOpacity
                            style={[styles.exportButton, styles.cancelButton]}
                            onPress={() => setShowExportModal(false)}
                        >
                            <Text style={styles.exportButtonText}>取消</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.exportButton, styles.confirmButton]}
                            onPress={handleExport}
                        >
                            <Text style={styles.exportButtonText}>确认</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const menuItems: MenuItem[] = [
        {
            id: 'budget',
            title: i18n.t('profile.memberBudget'),
            icon: 'wallet-outline',
            color: '#4CAF50',
            route: '/screens/budget'
        },
        {
            id: 'export',
            title: i18n.t('profile.exportExcel'),
            icon: 'download-outline',
            color: '#2196F3',
            onPress: () => setShowExportModal(true)
        },
        {
            id: 'categories',
            title: i18n.t('profile.manageCategories'),
            icon: 'grid-outline',
            color: '#FF9800',
            route: '/screens/categories'
        },
        {
            id: 'tags',
            title: i18n.t('profile.manageTags'),
            icon: 'pricetags-outline',
            color: '#9C27B0',
            route: '/screens/tags'
        },
        {
            id: 'settings',
            title: i18n.t('profile.settings'),
            icon: 'settings-outline',
            color: '#607D8B',
            route: '/screens/settings'
        }
    ];

    const renderMenuItem = (item: MenuItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => {
                if (item.route) {
                    router.push(item.route as any);
                } else if (item.onPress) {
                    item.onPress();
                }
            }}
        >
            <View style={[styles.menuIcon, { backgroundColor: `${item.color}15` }]}>
                <Ionicons name={item.icon as any} size={24} color={item.color} />
            </View>
            <View style={styles.menuContent}>
                <Text style={styles.menuTitle}>{item.title}</Text>
                <Ionicons name="chevron-forward" size={20} color="#999" />
            </View>
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <View style={styles.avatarContainer}>
                    <Text style={styles.avatarText}>NC</Text>
                </View>
                <Text style={styles.appName}>NineCents</Text>
                <Text style={styles.version}>v1.0.0</Text>
            </View>

            <View style={styles.menuSection}>
                {menuItems.map(renderMenuItem)}
            </View>
            {renderExportModal()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: 'white',
        padding: 20,
        alignItems: 'center',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginBottom: 20,
    },
    avatarContainer: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#dc4446',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    avatarText: {
        color: 'white',
        fontSize: 32,
        fontWeight: '600',
    },
    appName: {
        fontSize: 24,
        fontWeight: '600',
        marginBottom: 4,
    },
    version: {
        color: '#666',
        fontSize: 14,
    },
    menuSection: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 12,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 12,
    },
    menuIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    menuContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    menuTitle: {
        fontSize: 16,
        color: '#333',
    },
    exportModal: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        alignSelf: 'center',
    },
    exportTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    emailInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        fontSize: 16,
    },
    exportButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    exportButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    confirmButton: {
        backgroundColor: '#dc4446',
    },
    cancelButton: {
        backgroundColor: '#666',
    },
    exportButtonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Profile;