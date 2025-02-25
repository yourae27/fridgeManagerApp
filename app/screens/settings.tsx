import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Alert, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import i18n from '../i18n';
import { getSetting, updateSetting } from '../constants/Storage';
import { useSettings } from '../context/SettingsContext';

interface CurrencyOption {
    symbol: string;
}

const Settings = () => {
    const [showCurrencySelector, setShowCurrencySelector] = useState(false);
    const { currency, refreshSettings } = useSettings();

    const currencies: CurrencyOption[] = [
        { symbol: '¥' },
        { symbol: '$' },
        { symbol: '€' },
        { symbol: '£' },
        { symbol: '₩' },
        { symbol: '₹' },
        { symbol: '₽' },
        { symbol: 'HK$' },
        { symbol: 'A$' },
        { symbol: 'C$' },
        { symbol: '฿' },
        { symbol: '₺' },
    ];

    const handleCurrencyChange = async (newCurrency: string) => {
        try {
            await updateSetting('currency', newCurrency);
            refreshSettings();
            setShowCurrencySelector(false);
            Alert.alert(
                i18n.t('settings.success'),
                i18n.t('settings.currencyUpdated'),
                [{ text: 'OK', onPress: () => router.replace('/') }]
            );
        } catch (error) {
            console.error('Failed to update currency:', error);
            Alert.alert(i18n.t('settings.error'), i18n.t('settings.updateFailed'));
        }
    };

    const renderCurrencyItem = ({ item }: { item: CurrencyOption }) => (
        <TouchableOpacity
            style={[
                styles.currencyItem,
                currency === item.symbol && styles.selectedCurrency
            ]}
            onPress={() => handleCurrencyChange(item.symbol)}
        >
            <Text style={[
                styles.currencySymbol,
                currency === item.symbol && styles.selectedCurrencyText
            ]}>
                {item.symbol}
            </Text>
            {currency === item.symbol && (
                <View style={styles.checkmarkBadge}>
                    <Ionicons name="checkmark" size={12} color="white" />
                </View>
            )}
        </TouchableOpacity>
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>{i18n.t('settings.general')}</Text>

                <TouchableOpacity
                    style={styles.settingItem}
                    onPress={() => setShowCurrencySelector(!showCurrencySelector)}
                >
                    <View style={styles.settingLeft}>
                        <Ionicons name="cash-outline" size={24} color="#666" />
                        <Text style={styles.settingText}>{i18n.t('settings.currency')}</Text>
                    </View>
                    <View style={styles.settingRight}>
                        <Text style={styles.settingValue}>{currency}</Text>
                        <Ionicons
                            name={showCurrencySelector ? "chevron-down" : "chevron-forward"}
                            size={20}
                            color="#ccc"
                        />
                    </View>
                </TouchableOpacity>

                {showCurrencySelector && (
                    <View style={styles.currencyGrid}>
                        <FlatList
                            data={currencies}
                            renderItem={renderCurrencyItem}
                            keyExtractor={(item) => item.symbol}
                            numColumns={4}
                            scrollEnabled={false}
                        />
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    section: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        margin: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        color: '#333',
    },
    settingItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    settingText: {
        fontSize: 16,
        color: '#333',
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingValue: {
        fontSize: 16,
        color: '#666',
    },
    currencyGrid: {
        marginTop: 12,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#eee',
    },
    currencyItem: {
        flex: 1,
        height: 60,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 6,
        borderRadius: 8,
        backgroundColor: '#f5f5f5',
        position: 'relative',
    },
    selectedCurrency: {
        backgroundColor: '#fff1f1',
        borderWidth: 1,
        borderColor: '#dc4446',
    },
    currencySymbol: {
        fontSize: 20,
        fontWeight: '600',
        color: '#333',
    },
    selectedCurrencyText: {
        color: '#dc4446',
    },
    checkmarkBadge: {
        position: 'absolute',
        top: 4,
        right: 4,
        backgroundColor: '#dc4446',
        borderRadius: 10,
        width: 20,
        height: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Settings; 