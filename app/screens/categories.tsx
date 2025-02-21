import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getCategories, addCategory, deleteCategory, updateCategoryOrder } from '../constants/Storage';
import { Swipeable } from 'react-native-gesture-handler';
import { useCategoryContext } from '../context/CategoryContext';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    runOnJS,
} from 'react-native-reanimated';
import DraggableFlatList, {
    ScaleDecorator,
    RenderItemParams,
} from 'react-native-draggable-flatlist';

export interface Category {
    id: number;
    type: string;     // type: 'income' | 'expense';
    name: string;
    icon: string;
    sort_order: number;
}

const EMOJI_LIST = [
    '💰', '🏠', '🚗', '🍽️', '🛍️', '🎮', '🏥', '💼', '🎁', '📈',
    '✈️', '📚', '🎵', '🎨', '🏋️', '🎯', '🎸', '🎬', '🎪', '🎭',
    '🎨', '🎧', '🎤', '🎹', '🥘', '🍜', '🍱', '🍳', '🍖', '🥗',
    '🥪', '🥤', '☕️', '🍺', '🍷', '🎰', '🎲', '🎳', '🎾', '⚽️'
];

const Categories = () => {
    const { initialTab } = useLocalSearchParams<{ initialTab: 'income' | 'expense' }>();
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>(initialTab || 'expense');
    const [categories, setCategories] = useState<Category[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState(EMOJI_LIST[0]);
    const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const { triggerRefresh } = useCategoryContext();

    const loadCategories = async () => {
        try {
            const data = await getCategories(activeTab);
            setCategories(data);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    useEffect(() => {
        loadCategories();
    }, [activeTab]);

    const handleAddCategory = async () => {
        if (!newCategoryName.trim()) {
            Alert.alert('提示', '请输入分类名称');
            return;
        }

        if (newCategoryName.length > 10) {
            Alert.alert('提示', '分类名称不能超过10个字符');
            return;
        }

        try {
            await addCategory({
                type: activeTab,
                name: newCategoryName.trim(),
                icon: selectedEmoji,
            });
            setNewCategoryName('');
            setSelectedEmoji(EMOJI_LIST[0]);
            setShowAddForm(false);
            loadCategories();
            triggerRefresh();
        } catch (error) {
            console.error('Failed to add category:', error);
            Alert.alert('错误', '添加分类失败');
        }
    };

    const handleDeleteCategory = async (id: number) => {
        try {
            await deleteCategory(id);
            loadCategories();
            triggerRefresh();
        } catch (error) {
            console.error('Failed to delete category:', error);
            Alert.alert('Error', 'Failed to delete category');
        }
    };

    const closeAllSwipeables = () => {
        Object.values(swipeableRefs.current).forEach(ref => {
            ref?.close();
        });
    };

    const renderEmojiPicker = () => (
        <Modal
            visible={showEmojiPicker}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowEmojiPicker(false)}
        >
            <TouchableOpacity
                style={styles.modalOverlay}
                activeOpacity={1}
                onPress={() => setShowEmojiPicker(false)}
            >
                <View style={styles.emojiPickerContainer}>
                    <View style={styles.emojiPickerHeader}>
                        <Text style={styles.emojiPickerTitle}>Select Icon</Text>
                        <TouchableOpacity onPress={() => setShowEmojiPicker(false)}>
                            <Ionicons name="close" size={24} color="#666" />
                        </TouchableOpacity>
                    </View>
                    <FlatList
                        data={EMOJI_LIST}
                        numColumns={8}
                        keyExtractor={(item, index) => index.toString()}
                        renderItem={({ item }) => (
                            <TouchableOpacity
                                style={[
                                    styles.emojiItem,
                                    selectedEmoji === item && styles.selectedEmojiItem
                                ]}
                                onPress={() => {
                                    setSelectedEmoji(item);
                                    setShowEmojiPicker(false);
                                }}
                            >
                                <Text style={styles.emojiItemText}>{item}</Text>
                            </TouchableOpacity>
                        )}
                    />
                </View>
            </TouchableOpacity>
        </Modal>
    );

    const onDragEnd = async ({ data }: { data: Category[] }) => {
        setCategories(data);
        // 更新数据库中的排序
        await updateCategoryOrder(
            data.map((item, index) => ({
                id: item.id,
                sort_order: index
            }))
        );
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => {
        return (
            <ScaleDecorator>
                <Animated.View>
                    <Swipeable
                        ref={ref => {
                            if (ref) {
                                swipeableRefs.current[item.id] = ref;
                            }
                        }}
                        renderRightActions={() => (
                            <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteCategory(item.id)}
                            >
                                <Ionicons name="trash-outline" size={24} color="white" />
                            </TouchableOpacity>
                        )}
                        onSwipeableOpen={() => {
                            Object.entries(swipeableRefs.current).forEach(([key, ref]) => {
                                if (Number(key) !== item.id) {
                                    ref?.close();
                                }
                            });
                        }}
                    >
                        <TouchableOpacity
                            onLongPress={drag}
                            disabled={isActive}
                            style={[
                                styles.categoryItem,
                                isActive && styles.categoryItemActive
                            ]}

                        >
                            <View style={styles.categoryInfo}>
                                <Text style={styles.categoryIcon}>{item.icon}</Text>
                                <Text style={styles.categoryName}>{item.name}</Text>
                            </View>
                            <Ionicons name="menu" size={24} color="#666" />
                        </TouchableOpacity>
                    </Swipeable>
                </Animated.View>
            </ScaleDecorator>
        );
    };

    return (
        <View style={styles.container} onTouchStart={closeAllSwipeables}>
            <View style={styles.tabs}>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
                    onPress={() => setActiveTab('expense')}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'expense' && styles.activeTabText
                    ]}>Expense</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.tab, activeTab === 'income' && styles.activeTab]}
                    onPress={() => setActiveTab('income')}
                >
                    <Text style={[
                        styles.tabText,
                        activeTab === 'income' && styles.activeTabText
                    ]}>Income</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.scrollView}>
                <View style={styles.header}>
                    <Text style={styles.title}>
                        {activeTab === 'income' ? 'Income' : 'Expense'} Categories
                    </Text>
                    <TouchableOpacity
                        style={styles.addButton}
                        onPress={() => setShowAddForm(true)}
                    >
                        <Ionicons name="add" size={24} color="#dc4446" />
                    </TouchableOpacity>
                </View>

                {showAddForm && (
                    <View style={styles.addForm}>
                        <View style={styles.formRow}>
                            <TextInput
                                style={styles.input}
                                placeholder="Category name"
                                value={newCategoryName}
                                onChangeText={setNewCategoryName}
                            />
                            <TouchableOpacity
                                style={styles.emojiButton}
                                onPress={() => setShowEmojiPicker(true)}
                            >
                                <Text style={styles.emojiText}>{selectedEmoji}</Text>
                            </TouchableOpacity>
                        </View>
                        <View style={styles.formButtons}>
                            <TouchableOpacity
                                style={[styles.button, styles.cancelButton]}
                                onPress={() => setShowAddForm(false)}
                            >
                                <Text style={styles.cancelButtonText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.button, styles.saveButton]}
                                onPress={handleAddCategory}
                            >
                                <Text style={styles.saveButtonText}>Save</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                )}
                <View style={styles.list}>
                    <DraggableFlatList
                        data={categories}
                        onDragEnd={onDragEnd}
                        keyExtractor={item => item.id.toString()}
                        renderItem={renderItem}

                    />
                </View>
            </View>
            {renderEmojiPicker()}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    scrollView: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
    },
    title: {
        fontSize: 20,
        fontWeight: '600',
    },
    addButton: {
        padding: 8,
    },
    addForm: {
        backgroundColor: 'white',
        padding: 20,
        margin: 20,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 12,
        borderRadius: 8,
        fontSize: 16,
    },
    emojiButton: {
        width: 48,
        height: 48,
        backgroundColor: '#f5f5f5',
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1,
        borderColor: '#eee',
    },
    emojiText: {
        fontSize: 24,
    },
    formButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    button: {
        flex: 1,
        padding: 12,
        borderRadius: 8,
        alignItems: 'center',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    saveButton: {
        backgroundColor: '#dc4446',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    list: {
        padding: 20,
    },
    categoryItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 12,
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoryIcon: {
        fontSize: 20,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '500',
    },
    deleteButton: {
        backgroundColor: '#dc4446',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
        height: '100%',
        borderRadius: 12,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'white',
        paddingTop: 10,
        paddingHorizontal: 20,
    },
    tab: {
        flex: 1,
        alignItems: 'center',
        paddingVertical: 12,
        borderBottomWidth: 2,
        borderBottomColor: 'transparent',
    },
    activeTab: {
        borderBottomColor: '#dc4446',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: '#dc4446',
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    emojiPickerContainer: {
        width: '90%',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        maxHeight: '80%',
    },
    emojiPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        marginBottom: 16,
    },
    emojiPickerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    emojiItem: {
        width: `${100 / 8}%`,
        aspectRatio: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 8,
    },
    selectedEmojiItem: {
        backgroundColor: '#fff1f1',
        borderRadius: 8,
    },
    emojiItemText: {
        fontSize: 24,
    },
    categoryItemActive: {
        backgroundColor: '#f5f5f5',
        transform: [{ scale: 1.05 }],
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
});

export default Categories; 