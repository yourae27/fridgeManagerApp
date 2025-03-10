import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView, Platform, Alert } from 'react-native';
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

const AddItem = () => {
    const params = useLocalSearchParams();
    const isEditing = params.mode === 'edit';
    const { triggerRefresh } = useFoodContext();

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

    // 保存到冷藏
    const saveToRefrigerated = async () => {
        if (!name.trim()) {
            Alert.alert('提示', '请输入物品名称');
            return;
        }

        try {
            const foodItem: FoodItem = {
                name: name.trim(),
                quantity: quantity ? parseFloat(quantity) : undefined,
                unit: unit.trim() || undefined,
                storage_type: 'refrigerated',
                date_added: dateAdded.toISOString().split('T')[0],
                expiry_date: expiryDate ? expiryDate.toISOString().split('T')[0] : undefined,
                opened_date: openedDate ? openedDate.toISOString().split('T')[0] : undefined,
                expiry_days: expiryDays ? parseInt(expiryDays) : undefined,
                opened_expiry_days: openedExpiryDays ? parseInt(openedExpiryDays) : undefined
            };

            if (isEditing && params.id) {
                await updateFoodItem(parseInt(params.id as string), foodItem);
            } else {
                await addFoodItem(foodItem);
            }

            triggerRefresh();
            router.back();
        } catch (error) {
            console.error('保存到冷藏失败:', error);
            Alert.alert('错误', '保存失败，请重试');
        }
    };

    // 保存到冷冻
    const saveToFrozen = async () => {
        if (!name.trim()) {
            Alert.alert('提示', '请输入物品名称');
            return;
        }

        try {
            const foodItem: FoodItem = {
                name: name.trim(),
                quantity: quantity ? parseFloat(quantity) : undefined,
                unit: unit.trim() || undefined,
                storage_type: 'frozen',
                date_added: dateAdded.toISOString().split('T')[0],
                expiry_date: expiryDate ? expiryDate.toISOString().split('T')[0] : undefined,
                opened_date: openedDate ? openedDate.toISOString().split('T')[0] : undefined,
                expiry_days: expiryDays ? parseInt(expiryDays) : undefined,
                opened_expiry_days: openedExpiryDays ? parseInt(openedExpiryDays) : undefined
            };

            if (isEditing && params.id) {
                await updateFoodItem(parseInt(params.id as string), foodItem);
            } else {
                await addFoodItem(foodItem);
            }

            triggerRefresh();
            router.back();
        } catch (error) {
            console.error('保存到冷冻失败:', error);
            Alert.alert('错误', '保存失败，请重试');
        }
    };

    // 加入常买清单
    const addToFavorites = async () => {
        if (!name.trim()) {
            Alert.alert('提示', '请输入物品名称');
            return;
        }

        try {
            await addFavoriteItem({
                name: name.trim(),
                quantity: quantity ? parseFloat(quantity) : undefined,
                unit: unit.trim() || undefined,
                expiry_days: expiryDays ? parseInt(expiryDays) : undefined,
                opened_expiry_days: openedExpiryDays ? parseInt(openedExpiryDays) : undefined
            });

            Alert.alert('成功', '已加入常买清单');
        } catch (error) {
            console.error('加入常买清单失败:', error);
            Alert.alert('错误', '加入常买清单失败，请重试');
        }
    };

    // 跳转到常买清单
    const goToFavorites = () => {
        router.push('/screens/favorites');
    };

    return (
        <ScrollView style={styles.container}>
            <View style={styles.form}>
                {/* 物品名称 */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>物品名称 *</Text>
                    <TextInput
                        style={styles.input}
                        value={name}
                        onChangeText={setName}
                        placeholder="请输入物品名称"
                    />
                </View>

                {/* 物品数量和单位 */}
                <View style={styles.rowGroup}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>数量</Text>
                        <TextInput
                            style={styles.input}
                            value={quantity}
                            onChangeText={setQuantity}
                            keyboardType="decimal-pad"
                            placeholder="数量"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>单位</Text>
                        <TextInput
                            style={styles.input}
                            value={unit}
                            onChangeText={setUnit}
                            placeholder="如: 个、包、克"
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
                        <Text>{dayjs(dateAdded).format('YYYY-MM-DD')}</Text>
                        <Ionicons name="calendar-outline" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* 到期时间 */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>到期时间</Text>
                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowExpiryDate(true)}
                    >
                        <Text>{expiryDate ? dayjs(expiryDate).format('YYYY-MM-DD') : '选择日期'}</Text>
                        <Ionicons name="calendar-outline" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* 拆封时间 */}
                <View style={styles.formGroup}>
                    <Text style={styles.label}>拆封时间</Text>
                    <TouchableOpacity
                        style={styles.dateInput}
                        onPress={() => setShowOpenedDate(true)}
                    >
                        <Text>{openedDate ? dayjs(openedDate).format('YYYY-MM-DD') : '选择日期'}</Text>
                        <Ionicons name="calendar-outline" size={20} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* 保质期和拆封后保质期 */}
                <View style={styles.rowGroup}>
                    <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                        <Text style={styles.label}>保质期(天)</Text>
                        <TextInput
                            style={styles.input}
                            value={expiryDays}
                            onChangeText={setExpiryDays}
                            keyboardType="number-pad"
                            placeholder="天数"
                        />
                    </View>
                    <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                        <Text style={styles.label}>拆封后保质期(天)</Text>
                        <TextInput
                            style={styles.input}
                            value={openedExpiryDays}
                            onChangeText={setOpenedExpiryDays}
                            keyboardType="number-pad"
                            placeholder="天数"
                        />
                    </View>
                </View>

                {/* 操作按钮组 */}
                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: '#FF9500' }]}
                        onPress={addToFavorites}
                    >
                        <Text style={styles.buttonText}>加入常买清单</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: '#34C759' }]}
                        onPress={goToFavorites}
                    >
                        <Text style={styles.buttonText}>我的常买清单</Text>
                    </TouchableOpacity>
                </View>

                <View style={styles.buttonGroup}>
                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: '#5AC8FA' }]}
                        onPress={saveToRefrigerated}
                    >
                        <Text style={styles.buttonText}>放入冷藏</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, { backgroundColor: '#007AFF' }]}
                        onPress={saveToFrozen}
                    >
                        <Text style={styles.buttonText}>放入冷冻</Text>
                    </TouchableOpacity>
                </View>
            </View>

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
        backgroundColor: '#f5f5f5',
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
        fontWeight: '500',
        marginBottom: 8,
        color: '#333',
    },
    input: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        fontSize: 16,
    },
    dateInput: {
        backgroundColor: 'white',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#ddd',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    buttonGroup: {
        flexDirection: 'row',
        marginBottom: 16,
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
});

export default AddItem; 