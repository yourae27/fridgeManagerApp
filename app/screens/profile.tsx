import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getWarningDays, setWarningDays } from '../constants/Storage';
import { useFoodContext } from '../context/FoodContext';
import * as StoreReview from 'expo-store-review';

const Profile = () => {
    const [warningDays, setWarningDaysState] = useState('3');
    const [isEditing, setIsEditing] = useState(false);
    const { triggerRefresh } = useFoodContext();

    // 加载警示天数
    useEffect(() => {
        const loadWarningDays = async () => {
            try {
                const days = await getWarningDays();
                setWarningDaysState(days.toString());
            } catch (error) {
                console.error('加载警示天数失败:', error);
            }
        };

        loadWarningDays();
    }, []);

    // 保存警示天数
    const saveWarningDays = async () => {
        try {
            const days = parseInt(warningDays);
            if (isNaN(days) || days < 1) {
                Alert.alert('提示', '请输入有效的天数（至少1天）');
                return;
            }

            await setWarningDays(days);
            setIsEditing(false);
            triggerRefresh();
            Alert.alert('成功', '警示时长已更新');
        } catch (error) {
            console.error('更新警示天数失败:', error);
            Alert.alert('错误', '更新失败，请重试');
        }
    };

    // 跳转到常买清单
    const goToFavorites = () => {
        router.push('/screens/favorites');
    };

    // 评价应用
    const rateApp = async () => {
        if (await StoreReview.hasAction()) {
            await StoreReview.requestReview();
        } else {
            Alert.alert('提示', '当前无法评价应用');
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.card}>
                <TouchableOpacity style={styles.menuItem} onPress={goToFavorites}>
                    <Ionicons name="cart" size={24} color="#4A90E2" />
                    <Text style={styles.menuText}>我的常买清单</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>

                <View style={styles.divider} />

                <View style={styles.menuItem}>
                    <Ionicons name="time" size={24} color="#FF9500" />
                    <Text style={styles.menuText}>警示时长</Text>

                    {isEditing ? (
                        <View style={styles.editContainer}>
                            <TextInput
                                style={styles.dayInput}
                                value={warningDays}
                                onChangeText={setWarningDaysState}
                                keyboardType="number-pad"
                                maxLength={2}
                                autoFocus
                            />
                            <Text style={styles.dayUnit}>天</Text>
                            <TouchableOpacity
                                style={styles.saveButton}
                                onPress={saveWarningDays}
                            >
                                <Text style={styles.saveButtonText}>保存</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.daysContainer}>
                            <Text style={styles.daysText}>{warningDays}天</Text>
                            <TouchableOpacity onPress={() => setIsEditing(true)}>
                                <Ionicons name="pencil" size={16} color="#666" />
                            </TouchableOpacity>
                        </View>
                    )}
                </View>

                <View style={styles.divider} />

                <TouchableOpacity style={styles.menuItem} onPress={rateApp}>
                    <Ionicons name="star" size={24} color="#FF3B30" />
                    <Text style={styles.menuText}>给我的APP评价</Text>
                    <Ionicons name="chevron-forward" size={20} color="#ccc" />
                </TouchableOpacity>
            </View>

            <Text style={styles.version}>冰箱管家 v1.0.0</Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 16,
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 1,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
        elevation: 2,
        marginBottom: 16,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
    },
    menuText: {
        fontSize: 16,
        marginLeft: 12,
        flex: 1,
    },
    divider: {
        height: 1,
        backgroundColor: '#f0f0f0',
        marginHorizontal: 16,
    },
    daysContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    daysText: {
        fontSize: 16,
        color: '#666',
        marginRight: 6,
    },
    editContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    dayInput: {
        width: 40,
        height: 36,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 4,
        textAlign: 'center',
        fontSize: 16,
    },
    dayUnit: {
        marginHorizontal: 8,
        fontSize: 16,
        color: '#666',
    },
    saveButton: {
        backgroundColor: '#4A90E2',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 4,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 14,
    },
    version: {
        textAlign: 'center',
        color: '#999',
        marginTop: 16,
    },
});

export default Profile; 