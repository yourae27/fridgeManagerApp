import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import i18n from '../i18n';

interface MenuItem {
    id: string;
    title: string;
    icon: string;
    color: string;
    route?: string;
    onPress?: () => void;
}

const Profile = () => {
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
            onPress: () => {
                // TODO: 实现导出功能
            }
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
});

export default Profile;