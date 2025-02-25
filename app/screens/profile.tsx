import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, TextInput, Modal, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import i18n from '../i18n';
import { generateExcel } from '../utils/excel';
import EmptyState from '../components/EmptyState';
import * as StoreReview from 'expo-store-review';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface MenuItem {
    id: string;
    title: string;
    icon: string;
    color: string;
    route?: string;
    onPress?: () => void;
    isPremium?: boolean;
}

const PREMIUM_STATUS_KEY = 'premium_status';

const Profile = () => {
    const [showExportModal, setShowExportModal] = useState(false);
    const [email, setEmail] = useState('');
    const [isPremium, setIsPremium] = useState(false);
    const [showPremiumModal, setShowPremiumModal] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        // 检查用户是否已购买高级版
        checkPremiumStatus();
    }, []);

    const checkPremiumStatus = async () => {
        try {
            // 从 AsyncStorage 中读取购买状态
            const status = await AsyncStorage.getItem(PREMIUM_STATUS_KEY);
            setIsPremium(status === 'true');
        } catch (error) {
            console.error('Failed to check premium status:', error);
        }
    };

    const handleSuccessfulPurchase = async () => {
        try {
            // 更新购买状态
            setIsPremium(true);
            await AsyncStorage.setItem(PREMIUM_STATUS_KEY, 'true');

            // 通知用户
            Alert.alert(
                i18n.t('profile.premium.success'),
                i18n.t('profile.premium.enjoyFeatures')
            );

            setShowPremiumModal(false);
        } catch (error) {
            console.error('Failed to handle purchase:', error);
        }
    };

    const handlePurchasePremium = async () => {
        try {
            setIsLoading(true);

            // 模拟购买过程
            setTimeout(() => {
                handleSuccessfulPurchase();
                setIsLoading(false);
            }, 1500);

        } catch (error) {
            console.error('Purchase failed:', error);
            setIsLoading(false);

            Alert.alert(
                i18n.t('profile.premium.failed'),
                i18n.t('profile.premium.tryAgain')
            );
        }
    };

    const handleExport = async () => {
        if (!email.trim() || !email.includes('@')) {
            Alert.alert(i18n.t('common.alert'), i18n.t('profile.export.invalidEmail'));
            return;
        }

        try {
            await generateExcel(email);
            Alert.alert(i18n.t('profile.export.success'), i18n.t('profile.export.sent'));
            setShowExportModal(false);
            setEmail('');
        } catch (error) {
            Alert.alert(i18n.t('common.error'), i18n.t('profile.export.failed'));
        }
    };

    const handleTagsPress = () => {
        if (isPremium) {
            router.push('/screens/tags');
        } else {
            setShowPremiumModal(true);
        }
    };

    const handleRateApp = async () => {
        if (await StoreReview.hasAction()) {
            await StoreReview.requestReview();
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
                <View style={styles.exportModal} onStartShouldSetResponder={() => true}>
                    <Text style={styles.exportTitle}>{i18n.t('profile.export.title')}</Text>
                    <TextInput
                        style={styles.emailInput}
                        placeholder={i18n.t('profile.export.emailPlaceholder')}
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
                            <Text style={styles.exportButtonText}>{i18n.t('common.cancel')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.exportButton, styles.confirmButton]}
                            onPress={handleExport}
                        >
                            <Text style={styles.exportButtonText}>{i18n.t('common.confirm')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const renderPremiumModal = () => (
        <Modal
            visible={showPremiumModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowPremiumModal(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => !isLoading && setShowPremiumModal(false)}
            >
                <View style={styles.premiumModal} onStartShouldSetResponder={() => true}>
                    <Text style={styles.premiumTitle}>{i18n.t('profile.premium.title')}</Text>
                    <Text style={styles.premiumDescription}>{i18n.t('profile.premium.description')}</Text>

                    <View style={styles.premiumFeatures}>
                        <View style={styles.premiumFeatureItem}>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                            <Text style={styles.premiumFeatureText}>{i18n.t('profile.premium.feature1')}</Text>
                        </View>
                        <View style={styles.premiumFeatureItem}>
                            <Ionicons name="checkmark-circle" size={24} color="#4CAF50" />
                            <Text style={styles.premiumFeatureText}>{i18n.t('profile.premium.feature2')}</Text>
                        </View>
                    </View>

                    <TouchableOpacity
                        style={styles.purchaseButton}
                        onPress={handlePurchasePremium}
                        disabled={isLoading}
                    >
                        <Text style={styles.purchaseButtonText}>
                            {isLoading
                                ? i18n.t('common.loading')
                                : i18n.t('profile.premium.purchase')}
                        </Text>
                    </TouchableOpacity>

                    {!isLoading && (
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={() => setShowPremiumModal(false)}
                        >
                            <Text style={styles.closeButtonText}>{i18n.t('common.cancel')}</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const menuItems: MenuItem[] = [
        {
            id: 'budget',
            title: i18n.t('profile.memberBudget'),
            icon: 'people-outline',
            color: '#4CAF50',
            route: '/screens/budget',
        },
        {
            id: 'export',
            title: i18n.t('profile.exportExcel'),
            icon: 'document-outline',
            color: '#2196F3',
            onPress: () => setShowExportModal(true),
        },
        {
            id: 'categories',
            title: i18n.t('profile.manageCategories'),
            icon: 'list-outline',
            color: '#FF9800',
            route: '/screens/categories',
        },
        {
            id: 'tags',
            title: i18n.t('profile.manageTags'),
            icon: 'pricetags-outline',
            color: '#9C27B0',
            onPress: handleTagsPress,
            isPremium: true,
        },
        {
            id: 'settings',
            title: i18n.t('profile.settings'),
            icon: 'settings-outline',
            color: '#607D8B',
            route: '/screens/settings',
        },
        {
            id: 'rate',
            title: i18n.t('profile.rateApp'),
            icon: 'star-outline',
            color: '#F5A623',
            onPress: handleRateApp,
        },
    ];

    return (
        <View style={styles.container}>
            <ScrollView>
                <View style={styles.header}>
                    <View style={styles.avatarContainer}>
                        <Text style={styles.avatarText}>九</Text>
                    </View>
                    <Text style={styles.appName}>NineCents</Text>
                </View>

                <View style={styles.menuSection}>
                    {menuItems.map((item) => (
                        <TouchableOpacity
                            key={item.id}
                            style={styles.menuItem}
                            onPress={item.onPress || (item.route ? () => router.push(item.route as any) : undefined)}
                        >
                            <View style={[styles.menuIcon, { backgroundColor: `${item.color}20` }]}>
                                <Ionicons name={item.icon as any} size={24} color={item.color} />
                            </View>
                            <View style={styles.menuContent}>
                                <View style={styles.menuTitleContainer}>
                                    <Text style={styles.menuTitle}>{item.title}</Text>
                                    {item.isPremium && !isPremium && (
                                        <View style={styles.premiumBadge}>
                                            <Text style={styles.premiumBadgeText}>{i18n.t('profile.premium.badge')}</Text>
                                        </View>
                                    )}
                                </View>
                                <Ionicons name="chevron-forward" size={20} color="#ccc" />
                            </View>
                        </TouchableOpacity>
                    ))}
                </View>
            </ScrollView>

            {renderExportModal()}
            {renderPremiumModal()}
        </View>
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
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: {
        fontSize: 32,
        color: 'white',
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
    menuTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuTitle: {
        fontSize: 16,
        color: '#333',
    },
    premiumBadge: {
        backgroundColor: '#FFD700',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    premiumBadgeText: {
        color: '#333',
        fontSize: 12,
        fontWeight: '500',
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
    premiumModal: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '85%',
        alignSelf: 'center',
    },
    premiumTitle: {
        fontSize: 20,
        fontWeight: '600',
        marginBottom: 12,
        textAlign: 'center',
        color: '#333',
    },
    premiumDescription: {
        fontSize: 16,
        color: '#666',
        marginBottom: 16,
        textAlign: 'center',
    },
    premiumFeatures: {
        marginBottom: 20,
    },
    premiumFeatureItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    premiumFeatureText: {
        fontSize: 16,
        color: '#333',
    },
    purchaseButton: {
        backgroundColor: '#dc4446',
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 12,
    },
    purchaseButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '600',
    },
    closeButton: {
        paddingVertical: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    closeButtonText: {
        color: '#666',
        fontSize: 16,
    },
});

export default Profile;