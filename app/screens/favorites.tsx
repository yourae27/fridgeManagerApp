import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Alert, TextInput, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getFavoriteItems, deleteFavoriteItem, updateFavoriteItem, addFavoriteItem } from '../constants/Storage';
import { useFoodContext } from '../context/FoodContext';
import EmptyState from '../components/EmptyState';

interface FavoriteItem {
    id: number;
    name: string;
    quantity: number | null;
    unit: string | null;
    expiry_days: number | null;
    opened_expiry_days: number | null;
}

const Favorites = () => {
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const { refreshTrigger, triggerRefresh } = useFoodContext();

    // 新增和编辑相关状态
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [currentItem, setCurrentItem] = useState<FavoriteItem | null>(null);
    const [itemName, setItemName] = useState('');
    const [itemQuantity, setItemQuantity] = useState('');
    const [itemUnit, setItemUnit] = useState('');
    const [itemExpiryDays, setItemExpiryDays] = useState('');
    const [itemOpenedExpiryDays, setItemOpenedExpiryDays] = useState('');

    // 加载常买清单
    const loadFavorites = async () => {
        try {
            setIsLoading(true);
            const items = await getFavoriteItems();
            setFavorites(items as FavoriteItem[]);
        } catch (error) {
            console.error('加载常买清单失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 监听刷新
    useEffect(() => {
        loadFavorites();
    }, [refreshTrigger]);

    // 删除常买物品
    const handleDelete = (id: number) => {
        Alert.alert(
            '确认删除',
            '确定要从常买清单中删除该物品吗？',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteFavoriteItem(id);
                            triggerRefresh();
                        } catch (error) {
                            console.error('删除常买物品失败:', error);
                            Alert.alert('错误', '删除失败，请重试');
                        }
                    }
                }
            ]
        );
    };

    // 打开编辑模态框
    const handleEdit = (item: FavoriteItem) => {
        setCurrentItem(item);
        setItemName(item.name);
        setItemQuantity(item.quantity ? item.quantity.toString() : '');
        setItemUnit(item.unit || '');
        setItemExpiryDays(item.expiry_days ? item.expiry_days.toString() : '');
        setItemOpenedExpiryDays(item.opened_expiry_days ? item.opened_expiry_days.toString() : '');
        setIsEditing(true);
        setIsModalVisible(true);
    };

    // 打开添加模态框
    const handleAdd = () => {
        setCurrentItem(null);
        setItemName('');
        setItemQuantity('');
        setItemUnit('');
        setItemExpiryDays('');
        setItemOpenedExpiryDays('');
        setIsEditing(false);
        setIsModalVisible(true);
    };

    // 保存常买物品
    const handleSave = async () => {
        if (!itemName.trim()) {
            Alert.alert('提示', '请输入物品名称');
            return;
        }

        try {
            const item = {
                name: itemName.trim(),
                quantity: itemQuantity ? parseFloat(itemQuantity) : null,
                unit: itemUnit.trim() || null,
                expiry_days: itemExpiryDays ? parseInt(itemExpiryDays) : null,
                opened_expiry_days: itemOpenedExpiryDays ? parseInt(itemOpenedExpiryDays) : null
            };

            if (isEditing && currentItem) {
                await updateFavoriteItem(currentItem.id, {
                    name: item.name,
                    quantity: item.quantity || undefined,
                    unit: item.unit || undefined,
                    expiry_days: item.expiry_days || undefined,
                    opened_expiry_days: item.opened_expiry_days || undefined
                });
            } else {
                await addFavoriteItem({
                    name: item.name,
                    quantity: item.quantity || undefined,
                    unit: item.unit || undefined,
                    expiry_days: item.expiry_days || undefined,
                    opened_expiry_days: item.opened_expiry_days || undefined
                });
            }

            setIsModalVisible(false);
            triggerRefresh();
        } catch (error) {
            console.error('保存常买物品失败:', error);
            Alert.alert('错误', '保存失败，请重试');
        }
    };

    // 关闭模态框
    const handleCancel = () => {
        setIsModalVisible(false);
    };

    // 渲染常买物品
    const renderItem = ({ item }: { item: FavoriteItem }) => (
        <TouchableOpacity style={styles.favoriteItem} onPress={() => handleEdit(item)}>
            <View style={styles.favoriteInfo}>
                <Text style={styles.favoriteName}>{item.name}</Text>
                <View style={styles.favoriteDetails}>
                    {item.quantity && item.unit && (
                        <Text style={styles.favoriteQuantity}>{item.quantity} {item.unit}</Text>
                    )}
                    {item.expiry_days && (
                        <Text style={styles.favoriteExpiry}>保质期: {item.expiry_days}天</Text>
                    )}
                    {item.opened_expiry_days && (
                        <Text style={styles.favoriteExpiry}>拆封后: {item.opened_expiry_days}天</Text>
                    )}
                </View>
            </View>

            <TouchableOpacity
                style={styles.deleteButton}
                onPress={() => handleDelete(item.id)}
            >
                <Ionicons name="trash-outline" size={20} color="#FF3B30" />
            </TouchableOpacity>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            {favorites.length === 0 ? (
                <EmptyState
                    icon="cart"
                    title="常买清单为空"
                    description="您的常买清单中还没有物品，点击右上角的加号添加"
                />
            ) : (
                <FlatList
                    data={favorites}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id.toString()}
                    contentContainerStyle={styles.list}
                />
            )}

            <TouchableOpacity style={styles.floatingButton} onPress={handleAdd}>
                <Text style={styles.floatingButtonText}>+</Text>
            </TouchableOpacity>

            {/* 添加/编辑模态框 */}
            <Modal
                visible={isModalVisible}
                transparent={true}
                animationType="slide"
                onRequestClose={handleCancel}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContainer}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>
                                {isEditing ? '编辑常买物品' : '添加常买物品'}
                            </Text>
                            <TouchableOpacity onPress={handleCancel}>
                                <Ionicons name="close" size={24} color="#666" />
                            </TouchableOpacity>
                        </View>

                        <View style={styles.modalForm}>
                            <View style={styles.formGroup}>
                                <Text style={styles.label}>物品名称 *</Text>
                                <TextInput
                                    style={styles.input}
                                    value={itemName}
                                    onChangeText={setItemName}
                                    placeholder="请输入物品名称"
                                />
                            </View>

                            <View style={styles.rowGroup}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>数量</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={itemQuantity}
                                        onChangeText={setItemQuantity}
                                        keyboardType="decimal-pad"
                                        placeholder="数量"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={styles.label}>单位</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={itemUnit}
                                        onChangeText={setItemUnit}
                                        placeholder="如: 个、包、克"
                                    />
                                </View>
                            </View>

                            <View style={styles.rowGroup}>
                                <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                    <Text style={styles.label}>保质期(天)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={itemExpiryDays}
                                        onChangeText={setItemExpiryDays}
                                        keyboardType="number-pad"
                                        placeholder="天数"
                                    />
                                </View>
                                <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                    <Text style={styles.label}>拆封后保质期(天)</Text>
                                    <TextInput
                                        style={styles.input}
                                        value={itemOpenedExpiryDays}
                                        onChangeText={setItemOpenedExpiryDays}
                                        keyboardType="number-pad"
                                        placeholder="天数"
                                    />
                                </View>
                            </View>
                        </View>

                        <View style={styles.modalButtons}>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.cancelButton]}
                                onPress={handleCancel}
                            >
                                <Text style={styles.cancelButtonText}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.modalButton, styles.saveButton]}
                                onPress={handleSave}
                            >
                                <Text style={styles.saveButtonText}>保存</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    list: {
        padding: 16,
    },
    favoriteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    favoriteInfo: {
        flex: 1,
    },
    favoriteName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    favoriteDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    favoriteQuantity: {
        fontSize: 14,
        color: '#666',
    },
    favoriteExpiry: {
        fontSize: 14,
        color: '#666',
    },
    deleteButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    floatingButton: {
        position: 'absolute',
        bottom: 20,
        right: 20,
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#4A90E2',
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: '#4A90E2',
        shadowOffset: {
            width: 0,
            height: 4,
        },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 8,
    },
    floatingButtonText: {
        color: 'white',
        fontSize: 24,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContainer: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    modalForm: {
        marginBottom: 16,
    },
    formGroup: {
        marginBottom: 16,
    },
    rowGroup: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    label: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
    },
    modalButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    modalButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    saveButton: {
        backgroundColor: '#4A90E2',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
});

export default Favorites; 