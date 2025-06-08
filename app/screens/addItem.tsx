import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert, ActivityIndicator, Modal } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { addFoodItem, updateFoodItem, addFavoriteItem, getFavoriteItems, getFoodItems, addHistory } from '../constants/Storage';
import { useFoodContext } from '../context/FoodContext';
import { Theme } from '../constants/Theme';
import ModernSegmentedControl from '../components/ModernSegmentedControl';
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
    const [tempDate, setTempDate] = useState(new Date()); // 用于临时存储日期

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

    // 处理日期选择
    const handleDateChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            // Android 上直接处理选择结果
            const { type } = event;
            if (type === 'set' && selectedDate) {
                // 直接更新对应的日期状态
                if (showDateAdded) {
                    setDateAdded(selectedDate);
                    setShowDateAdded(false);
                } else if (showExpiryDate) {
                    setExpiryDate(selectedDate);
                    setShowExpiryDate(false);
                } else if (showOpenedDate) {
                    setOpenedDate(selectedDate);
                    setShowOpenedDate(false);
                }
            } else if (type === 'dismissed') {
                // 用户取消了选择
                setShowDateAdded(false);
                setShowExpiryDate(false);
                setShowOpenedDate(false);
            }
        } else {
            // iOS 上实时更新临时日期
            if (selectedDate) {
                setTempDate(selectedDate);
            }
        }
    };

    // 确认日期选择
    const handleDateConfirm = (type: 'added' | 'expiry' | 'opened') => {
        switch (type) {
            case 'added':
                setDateAdded(tempDate);
                setShowDateAdded(false);
                break;
            case 'expiry':
                setExpiryDate(tempDate);
                setShowExpiryDate(false);
                break;
            case 'opened':
                setOpenedDate(tempDate);
                setShowOpenedDate(false);
                break;
        }
    };



    // 渲染日期选择器模态框
    const renderDatePicker = (
        visible: boolean,
        onClose: () => void,
        onConfirm: () => void,
        currentDate: Date
    ) => {
        if (Platform.OS === 'android') {
            // Android 使用原生日期选择器
            return visible ? (
                <DateTimePicker
                    value={currentDate}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                />
            ) : null;
        }

        // iOS 使用模态框包装的日期选择器
        return (
            <Modal
                animationType="slide"
                transparent={true}
                visible={visible}
                onRequestClose={onClose}
            >
                <View style={styles.modalOverlay}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <TouchableOpacity onPress={onClose}>
                                <Text style={styles.modalButton}>取消</Text>
                            </TouchableOpacity>
                            <TouchableOpacity onPress={onConfirm}>
                                <Text style={[styles.modalButton, styles.confirmButton]}>确定</Text>
                            </TouchableOpacity>
                        </View>
                        <DateTimePicker
                            value={currentDate}
                            mode="date"
                            display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                            onChange={handleDateChange}
                            locale="zh-CN"
                            style={styles.datePicker}
                            textColor="#000"
                            themeVariant="light"
                        />
                    </View>
                </View>
            </Modal>
        );
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
    const handleSubmit = async (storageType: any) => {
        if (!name) {
            Alert.alert('提示', '请输入物品名称');
            return;
        }

        try {
            const itemData = {
                name,
                quantity: quantity ? parseFloat(quantity) : undefined,
                unit: unit || undefined,
                storage_type: storageType,
                date_added: dayjs(dateAdded).format('YYYY-MM-DD'),
                expiry_date: expiryDate ? dayjs(expiryDate).format('YYYY-MM-DD') : undefined,
                opened_date: openedDate ? dayjs(openedDate).format('YYYY-MM-DD') : undefined,
                opened_expiry_days: openedExpiryDays ? parseInt(openedExpiryDays) : undefined,
                expiry_days: expiryDays ? parseInt(expiryDays) : undefined,
            };

            if (isEditing && params.id) {
                // 编辑现有物品
                await updateFoodItem(parseInt(params.id as string), itemData);
                // 添加编辑历史记录
                await addHistory({
                    action_type: 'edit',
                    item_name: name,
                    quantity: quantity ? parseFloat(quantity) : null,
                    unit: unit || null,
                    storage_type: storageType,
                    action_date: new Date().toISOString()
                });
            } else {
                // 添加新物品
                await addFoodItem(itemData);
                // 添加新增历史记录
                await addHistory({
                    action_type: 'add',
                    item_name: name,
                    quantity: quantity ? parseFloat(quantity) : null,
                    unit: unit || null,
                    storage_type: storageType,
                    action_date: new Date().toISOString()
                });
            }

            triggerRefresh();
            router.back();
        } catch (error) {
            console.error('保存失败:', error);
            Alert.alert('错误', '保存失败，请重试');
        }
    };

    const saveToRefrigerated = () => handleSubmit('refrigerated');
    const saveToFrozen = () => handleSubmit('frozen');

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



    return (
        <ScrollView style={styles.container}>
            {/* Tab 切换器 */}
            <ModernSegmentedControl
                segments={[
                    { key: 'new', label: '新增物品' },
                    { key: 'favorites', label: '常买清单' },
                ]}
                activeSegment={activeTab}
                onSegmentChange={(key) => setActiveTab(key as 'new' | 'favorites')}
            />

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
                            onPress={() => {
                                setTempDate(dateAdded);
                                if (Platform.OS === 'android') {
                                    setShowDateAdded(true);
                                } else {
                                    setShowDateAdded(true);
                                }
                            }}
                        >
                            <Text style={styles.dateText}>{dayjs(dateAdded).format('YYYY/MM/DD')}</Text>
                            <Ionicons name="calendar-outline" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* 到期时间 */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>到期时间</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => {
                                setTempDate(expiryDate || new Date());
                                if (Platform.OS === 'android') {
                                    setShowExpiryDate(true);
                                } else {
                                    setShowExpiryDate(true);
                                }
                            }}
                        >
                            <Text style={[styles.dateText, !expiryDate && styles.placeholderText]}>
                                {expiryDate ? dayjs(expiryDate).format('YYYY/MM/DD') : 'yyyy/mm/dd'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#999" />
                        </TouchableOpacity>
                    </View>

                    {/* 拆封时间 */}
                    <View style={styles.formGroup}>
                        <Text style={styles.label}>拆封时间</Text>
                        <TouchableOpacity
                            style={styles.dateInput}
                            onPress={() => {
                                setTempDate(openedDate || new Date());
                                if (Platform.OS === 'android') {
                                    setShowOpenedDate(true);
                                } else {
                                    setShowOpenedDate(true);
                                }
                            }}
                        >
                            <Text style={[styles.dateText, !openedDate && styles.placeholderText]}>
                                {openedDate ? dayjs(openedDate).format('YYYY/MM/DD') : 'yyyy/mm/dd'}
                            </Text>
                            <Ionicons name="calendar-outline" size={20} color="#999" />
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

            {/* 日期选择器模态框 */}
            {renderDatePicker(
                showDateAdded,
                () => setShowDateAdded(false),
                () => handleDateConfirm('added'),
                tempDate
            )}
            {renderDatePicker(
                showExpiryDate,
                () => setShowExpiryDate(false),
                () => handleDateConfirm('expiry'),
                tempDate
            )}
            {renderDatePicker(
                showOpenedDate,
                () => setShowOpenedDate(false),
                () => handleDateConfirm('opened'),
                tempDate
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: Theme.colors.background,
    },
    form: {
        padding: Theme.spacing.lg,
    },
    formGroup: {
        marginBottom: Theme.spacing.lg,
    },
    rowGroup: {
        flexDirection: 'row',
        marginBottom: Theme.spacing.lg,
    },
    label: {
        fontSize: Theme.typography.fontSize.lg,
        fontWeight: Theme.typography.fontWeight.semibold,
        marginBottom: Theme.spacing.sm,
        color: Theme.colors.textPrimary,
    },
    required: {
        color: Theme.colors.error,
    },
    input: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.lg,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.md,
        fontSize: Theme.typography.fontSize.lg,
        color: Theme.colors.textPrimary,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Theme.colors.border,
        ...Theme.shadows.small,
    },
    dateInput: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.lg,
        paddingVertical: Theme.spacing.md,
        paddingHorizontal: Theme.spacing.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Theme.colors.border,
        ...Theme.shadows.small,
    },
    button: {
        padding: Theme.spacing.lg,
        borderRadius: Theme.borderRadius.lg,
        alignItems: 'center',
        marginBottom: Theme.spacing.lg,
        ...Theme.shadows.small,
    },
    buttonGroup: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: Theme.spacing.md,
    },
    buttonText: {
        fontSize: Theme.typography.fontSize.lg,
        fontWeight: Theme.typography.fontWeight.semibold,
    },
    favoriteButton: {
        backgroundColor: Theme.colors.backgroundSecondary,
        marginBottom: Theme.spacing.lg,
    },
    refrigeratedButton: {
        flex: 1,
        backgroundColor: Theme.colors.surface,
        borderWidth: StyleSheet.hairlineWidth,
        borderColor: Theme.colors.primary,
    },
    frozenButton: {
        flex: 1,
        backgroundColor: Theme.colors.primary,
    },
    refrigeratedButtonText: {
        color: Theme.colors.primary,
        fontSize: Theme.typography.fontSize.lg,
        fontWeight: Theme.typography.fontWeight.semibold,
    },
    frozenButtonText: {
        color: Theme.colors.white,
        fontSize: Theme.typography.fontSize.lg,
        fontWeight: Theme.typography.fontWeight.semibold,
    },
    favoritesContainer: {
        padding: Theme.spacing.lg,
        flex: 1,
    },
    favoritesList: {
        backgroundColor: Theme.colors.surface,
        borderRadius: Theme.borderRadius.xl,
        overflow: 'hidden',
        ...Theme.shadows.small,
    },
    favoriteItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: Theme.spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.border,
    },
    favoriteContent: {
        flex: 1,
    },
    favoriteName: {
        fontSize: Theme.typography.fontSize.lg,
        fontWeight: Theme.typography.fontWeight.semibold,
        color: Theme.colors.textPrimary,
        marginBottom: Theme.spacing.xs,
    },
    favoriteDetails: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    favoriteDetail: {
        fontSize: Theme.typography.fontSize.md,
        color: Theme.colors.textSecondary,
        marginRight: Theme.spacing.md,
    },
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xxxl,
    },
    loadingText: {
        marginTop: Theme.spacing.sm,
        color: Theme.colors.textSecondary,
        fontSize: Theme.typography.fontSize.md,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: Theme.spacing.xxxxl * 2,
    },
    emptyText: {
        marginTop: Theme.spacing.lg,
        fontSize: Theme.typography.fontSize.lg,
        color: Theme.colors.textSecondary,
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: Theme.colors.surface,
        borderTopLeftRadius: Theme.borderRadius.xl,
        borderTopRightRadius: Theme.borderRadius.xl,
        paddingBottom: Platform.OS === 'ios' ? 34 : Theme.spacing.lg,
        maxHeight: '50%',
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: Theme.spacing.lg,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: Theme.colors.border,
        backgroundColor: Theme.colors.backgroundSecondary,
        borderTopLeftRadius: Theme.borderRadius.xl,
        borderTopRightRadius: Theme.borderRadius.xl,
    },
    modalButton: {
        fontSize: Theme.typography.fontSize.xl,
        color: Theme.colors.textSecondary,
        paddingVertical: Theme.spacing.xs,
        paddingHorizontal: Theme.spacing.sm,
    },
    confirmButton: {
        color: Theme.colors.primary,
        fontWeight: Theme.typography.fontWeight.semibold,
    },
    datePicker: {
        height: Platform.OS === 'ios' ? 216 : 200,
        width: '100%',
        backgroundColor: Theme.colors.surface,
    },
    dateText: {
        fontSize: Theme.typography.fontSize.lg,
        color: Theme.colors.textPrimary,
    },
    placeholderText: {
        color: Theme.colors.textTertiary,
    },
});

export default AddItem;