import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addFoodItem, updateFoodItem, addFavoriteItem, getFavoriteItems, getFoodItems } from '../constants/Storage';
import { useFoodContext } from '../context/FoodContext';
import dayjs from 'dayjs';

interface FoodItem {
    id?: number;
    name: string;
    quantity?: number;
    unit?: string;
    storage_type: 'refrigerated' | 'frozen';
    date_added: string;
    expiry_date?: string;
    opened_date?: string;
    opened_expiry_days?: number;
    expiry_days?: number;
}

interface FavoriteItem {
    id: number;
    name: string;
    quantity: number | null;
    unit: string | null;
    expiry_days: number | null;
    opened_expiry_days: number | null;
}

const AddItem = () => {
    const params = useLocalSearchParams();
    const isEditing = params.mode === 'edit';
    const { triggerRefresh } = useFoodContext();

    // Tab 状态
    const [activeTab, setActiveTab] = useState<'new' | 'favorites'>('new');
    // 常买清单数据
    const [favorites, setFavorites] = useState<FavoriteItem[]>([]);
    const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);

    // 表单状态
    const [name, setName] = useState('');
    const [quantity, setQuantity] = useState('');
    const [unit, setUnit] = useState('');
    const [dateAdded, setDateAdded] = useState(new Date());
    const [expiryDate, setExpiryDate] = useState<Date | null>(null);
    const [openedDate, setOpenedDate] = useState<Date | null>(null);
    const [expiryDays, setExpiryDays] = useState('');
    const [openedExpiryDays, setOpenedExpiryDays] = useState('');

    // 日期选择器状态
    const [showDateAdded, setShowDateAdded] = useState(false);
    const [showExpiryDate, setShowExpiryDate] = useState(false);
    const [showOpenedDate, setShowOpenedDate] = useState(false);

    // 加载编辑数据
    useEffect(() => {
        if (isEditing && params.id) {
            // 提取数据，然后更新状态
            const id = params.id as string;
            const name = params.name as string;
            const quantityParam = params.quantity as string;
            const unitParam = params.unit as string;
            const dateAddedParam = params.date_added as string;
            const expiryDateParam = params.expiry_date as string;
            const openedDateParam = params.opened_date as string;
            const expiryDaysParam = params.expiry_days as string;
            const openedExpiryDaysParam = params.opened_expiry_days as string;

            setName(name);
            setQuantity(quantityParam || '');
            setUnit(unitParam || '');
            setDateAdded(new Date(dateAddedParam));

            if (expiryDateParam) {
                setExpiryDate(new Date(expiryDateParam));
            }

            if (openedDateParam) {
                setOpenedDate(new Date(openedDateParam));
            }

            if (expiryDaysParam) {
                setExpiryDays(expiryDaysParam);
            }

            if (openedExpiryDaysParam) {
                setOpenedExpiryDays(openedExpiryDaysParam);
            }
        }
    }, [isEditing]); // 只依赖 isEditing，不再依赖 params

    // 加载常买清单
    const loadFavorites = async () => {
        try {
            setIsLoadingFavorites(true);
            const items = await getFavoriteItems();
            setFavorites(items as FavoriteItem[]);
        } catch (error) {
            console.error('加载常买清单失败:', error);
            Alert.alert('错误', '加载常买清单失败');
        } finally {
            setIsLoadingFavorites(false);
        }
    };

    // 当切换到常买清单 tab 时加载数据
    useEffect(() => {
        if (activeTab === 'favorites') {
            loadFavorites();
        }
    }, [activeTab]);

    // 选择常买物品
    const selectFavoriteItem = (item: FavoriteItem) => {
        setName(item.name);
        setQuantity(item.quantity ? item.quantity.toString() : '');
        setUnit(item.unit || '');

        if (item.expiry_days) {
            setExpiryDays(item.expiry_days.toString());
        }

        if (item.opened_expiry_days) {
            setOpenedExpiryDays(item.opened_expiry_days.toString());
        }

        // 切换回添加物品 tab
        setActiveTab('new');
    };

    // 日期选择处理
    const onDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setShowDateAdded(false);
            setShowExpiryDate(false);
            setShowOpenedDate(false);
        }

        if (selectedDate) {
            if (showDateAdded) {
                setDateAdded(selectedDate);
            } else if (showExpiryDate) {
                setExpiryDate(selectedDate);
            } else if (showOpenedDate) {
                setOpenedDate(selectedDate);
            }
        }
    };

    // 保存到常买清单
    const saveToFavorites = async () => {
        if (!name) {
            Alert.alert('提示', '请输入物品名称');
            return;
        }

        try {
            await addFavoriteItem({
                name,
                quantity: quantity ? parseFloat(quantity) : undefined,
                unit: unit || undefined,
                expiry_days: expiryDays ? parseInt(expiryDays) : undefined,
                opened_expiry_days: openedExpiryDays ? parseInt(openedExpiryDays) : undefined,
            });

            Alert.alert('成功', '已加入常买清单');
            triggerRefresh();
        } catch (error) {
            console.error('添加到常买清单失败:', error);
            Alert.alert('错误', '添加失败，请重试');
        }
    };

    // 通用保存函数
    const saveItem = async (storageType: 'refrigerated' | 'frozen') => {
        if (!name) {
            Alert.alert('提示', '请输入物品名称');
            return;
        }

        const foodItem: FoodItem = {
            name,
            quantity: quantity ? parseFloat(quantity) : undefined,
            unit: unit || undefined,
            storage_type: storageType,
            date_added: dateAdded.toISOString(),
            expiry_date: expiryDate ? expiryDate.toISOString() : undefined,
            opened_date: openedDate ? openedDate.toISOString() : undefined,
            expiry_days: expiryDays ? parseInt(expiryDays) : undefined,
            opened_expiry_days: openedExpiryDays ? parseInt(openedExpiryDays) : undefined,
        };

        try {
            if (isEditing && params.id) {
                await updateFoodItem(parseInt(params.id as string), foodItem);
                Alert.alert('成功', '食品已更新', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            } else {
                await addFoodItem(foodItem);
                Alert.alert('成功', '食品已添加', [
                    { text: 'OK', onPress: () => router.back() }
                ]);
            }
            triggerRefresh();
        } catch (error) {
            console.error('保存食品失败:', error);
            Alert.alert('错误', '保存失败，请重试');
        }
    };

    const saveToRefrigerated = () => saveItem('refrigerated');
    const saveToFrozen = () => saveItem('frozen');

    // 渲染常买清单项
    const renderFavoriteItem = (item: FavoriteItem) => (
        <TouchableOpacity
            key={item.id}
            style={styles.favoriteItem}
            onPress={() => selectFavoriteItem(item)}
        >
            <View style={styles.favoriteContent}>
                <Text style={styles.favoriteName}>{item.name}</Text>
                <View style={styles.favoriteDetails}>
                    {item.quantity && item.unit && (
                        <Text style={styles.favoriteDetail}>
                            {item.quantity} {item.unit}
                        </Text>
                    )}
                    {item.expiry_days && (
                        <Text style={styles.favoriteDetail}>
                            保质期: {item.expiry_days}天
                        </Text>
                    )}
                </View>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
        </TouchableOpacity>
    );

    // 格式化日期显示
    const formatDate = (date: Date | null) => {
        if (!date) return 'yyyy/mm/dd';
        return dayjs(date).format('YYYY/MM/DD');
    };

    return (
        <ScrollView style={styles.container}>
            {/* Tab 切换器 */}
            <View style={styles.tabContainer}>
                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'new' && styles.activeTab
                    ]}
                    onPress={() => setActiveTab('new')}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'new' && styles.activeTabText
                    ]}>新增物品</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[
                        styles.tab,
                        activeTab === 'favorites' && styles.activeTab
                    ]}
                    onPress={() => setActiveTab('favorites')}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'favorites' && styles.activeTabText
                    ]}>常买清单</Text>
                </TouchableOpacity>
            </View>

            {activeTab === 'new' ? (
                <View style={styles.form}>
                    {/* 物品名称 */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>
                            物品名称 <Text style={styles.required}>*</Text>
                        </Text>
                        <TextInput
                            style={styles.input}
                            value={name}
                            onChangeText={setName}
                            placeholder="请输入物品名称"
                            placeholderTextColor="#999"
                        />
                    </View>

                    {/* 数量和单位 */}
                    <View style={styles.rowGroup}>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>数量</Text>
                            <TextInput
                                style={styles.input}
                                value={quantity}
                                onChangeText={setQuantity}
                                keyboardType="numeric"
                                placeholder="数量"
                                placeholderTextColor="#999"
                            />
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                            <Text style={styles.label}>单位</Text>
                            <TextInput
                                style={styles.input}
                                value={unit}
                                onChangeText={setUnit}
                                placeholder="如: 个、包、克"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    {/* 存入时间 */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>存入时间</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowDateAdded(true)}
                        >
                            <Text>{dayjs(dateAdded).format('YYYY/MM/DD')}</Text>
                            <Ionicons name="calendar-outline" size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* 到期时间 */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>到期时间</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowExpiryDate(true)}
                        >
                            <Text>
                                {expiryDate ? dayjs(expiryDate).format('YYYY/MM/DD') : 'yyyy/mm/dd'}
                            </Text>
                            <Ionicons name="calendar-outline" size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* 拆封时间 */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>拆封时间</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => setShowOpenedDate(true)}
                        >
                            <Text>
                                {openedDate ? dayjs(openedDate).format('YYYY/MM/DD') : 'yyyy/mm/dd'}
                            </Text>
                            <Ionicons name="calendar-outline" size={24} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* 保质期和拆封后保质期 */}
                    <View style={styles.rowGroup}>
                        <View style={[styles.formGroup, { flex: 1 }]}>
                            <Text style={styles.label}>保质期(天)</Text>
                            <TextInput
                                style={styles.input}
                                value={expiryDays}
                                onChangeText={setExpiryDays}
                                keyboardType="numeric"
                                placeholder="天数"
                                placeholderTextColor="#999"
                            />
                        </View>
                        <View style={[styles.formGroup, { flex: 1, marginLeft: 12 }]}>
                            <Text style={styles.label}>拆封后保质期(天)</Text>
                            <TextInput
                                style={styles.input}
                                value={openedExpiryDays}
                                onChangeText={setOpenedExpiryDays}
                                keyboardType="numeric"
                                placeholder="天数"
                                placeholderTextColor="#999"
                            />
                        </View>
                    </View>

                    {/* 底部按钮 */}
                    <TouchableOpacity
                        style={[styles.button, styles.favoriteButton]}
                        onPress={saveToFavorites}
                    >
                        <Text style={styles.buttonText}>加入常买清单</Text>
                    </TouchableOpacity>

                    <View style={styles.buttonGroup}>
                        <TouchableOpacity
                            style={[styles.button, styles.refrigeratedButton]}
                            onPress={saveToRefrigerated}
                        >
                            <Text style={styles.refrigeratedButtonText}>放入冷藏</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.button, styles.frozenButton]}
                            onPress={saveToFrozen}
                        >
                            <Text style={styles.frozenButtonText}>放入冷冻</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={styles.favoritesContainer}>
                    {isLoadingFavorites ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color="#4A90E2" />
                            <Text style={styles.loadingText}>加载中...</Text>
                        </View>
                    ) : favorites.length > 0 ? (
                        <View style={styles.favoritesList}>
                            {favorites.map(renderFavoriteItem)}
                        </View>
                    ) : (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="cart-outline" size={64} color="#ccc" />
                            <Text style={styles.emptyText}>暂无常买物品</Text>
                        </View>
                    )}
                </View>
            )}

            {/* 日期选择器 */}
            {(showDateAdded || showExpiryDate || showOpenedDate) && (
                <DateTimePicker
                    value={showDateAdded ? dateAdded : showExpiryDate ? (expiryDate || new Date()) : (openedDate || new Date())}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    onChange={onDateChange}
                />
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#fff',
    },
    tabContainer: {
        flexDirection: 'row',
        margin: 16,
        borderRadius: 8,
        overflow: 'hidden',
        backgroundColor: '#f5f5f5',
    },
    tab: {
        flex: 1,
        paddingVertical: 16,
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
    },
    activeTab: {
        backgroundColor: '#1a1c25',
    },
    tabText: {
        fontSize: 16,
        color: '#333',
    },
    activeTabText: {
        color: '#fff',
    },
    form: {
        padding: 16,
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
        fontWeight: '400',
        marginBottom: 8,
        color: '#000',
    },
    required: {
        color: 'red',
    },
    input: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        fontSize: 16,
        color: '#000',
    },
    dateInput: {
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        paddingVertical: 12,
        paddingHorizontal: 12,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    button: {
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        marginBottom: 16,
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: 12,
    },
    buttonText: {
        color: '#333',
        fontSize: 16,
        fontWeight: '400',
    },
    favoriteButton: {
        backgroundColor: '#f5f5f5',
        marginBottom: 16,
    },
    refrigeratedButton: {
        flex: 1,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#eee',
    },
    frozenButton: {
        flex: 1,
        backgroundColor: '#1a1c25',
    },
    refrigeratedButtonText: {
        color: '#000',
        fontSize: 16,
    },
    frozenButtonText: {
        color: '#fff',
        fontSize: 16,
    },
    favoritesContainer: {
        padding: 16,
        flex: 1,
    },
    favoritesList: {
        backgroundColor: 'white',
        borderRadius: 12,
        overflow: 'hidden',
    },
    favoriteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    favoriteContent: {
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
    },
    favoriteDetail: {
        fontSize: 14,
        color: '#666',
        marginRight: 12,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
    },
    loadingText: {
        marginTop: 8,
        color: '#666',
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 64,
    },
    emptyText: {
        marginTop: 16,
        fontSize: 16,
        color: '#666',
    },
});

export default AddItem; 