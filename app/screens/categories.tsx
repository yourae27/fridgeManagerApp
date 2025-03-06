import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Alert, Modal, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams } from 'expo-router';
import { getCategories, addCategory, deleteCategory, updateCategoryOrder, updateCategory } from '../constants/Storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useCategoryContext } from '../context/CategoryContext';
import DraggableFlatList, {
    ScaleDecorator,
    RenderItemParams,
} from 'react-native-draggable-flatlist';
import EmptyState from '../components/EmptyState';
import i18n from '../i18n';

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
    const params = useLocalSearchParams();
    const initialTab = params.initialTab as string || 'expense';
    const [activeTab, setActiveTab] = useState<'income' | 'expense'>(initialTab as 'income' | 'expense');
    const [categories, setCategories] = useState<Category[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newCategoryName, setNewCategoryName] = useState('');
    const [selectedEmoji, setSelectedEmoji] = useState('💰');
    const [showEmojiPicker, setShowEmojiPicker] = useState(false);
    const { triggerRefresh } = useCategoryContext();
    const swipeableRefs = useRef<any>({});

    // 编辑状态
    const [isEditing, setIsEditing] = useState(false);
    const [editingCategory, setEditingCategory] = useState<Category | null>(null);

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
            Alert.alert(i18n.t('categories.categoryNameRequired'));
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
            Alert.alert(i18n.t('categories.addCategoryFailed'));
        }
    };

    const handleEditCategory = (category: Category) => {
        setIsEditing(true);
        setEditingCategory(category);
        setNewCategoryName(category.name);
        setSelectedEmoji(category.icon);
        setShowAddForm(true);
    };

    const handleSaveEdit = async () => {
        if (!editingCategory || !newCategoryName.trim()) {
            Alert.alert(i18n.t('categories.categoryNameRequired'));
            return;
        }

        try {
            await updateCategory(editingCategory.id, {
                name: newCategoryName.trim(),
                icon: selectedEmoji
            });

            setIsEditing(false);
            setEditingCategory(null);
            setNewCategoryName('');
            setSelectedEmoji(EMOJI_LIST[0]);
            setShowAddForm(false);
            loadCategories();
            triggerRefresh();
        } catch (error) {
            console.error('Failed to update category:', error);
            Alert.alert(i18n.t('categories.updateCategoryFailed'));
        }
    };

    const handleDeleteCategory = async (id: number) => {
        Alert.alert(
            i18n.t('categories.confirmDelete'),
            i18n.t('categories.confirmDeleteMessage'),
            [
                { text: i18n.t('common.cancel'), style: 'cancel' },
                {
                    text: i18n.t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteCategory(id);
                            loadCategories();
                            triggerRefresh();
                        } catch (error) {
                            console.error('Failed to delete category:', error);
                            Alert.alert(i18n.t('categories.deleteCategoryFailed'));
                        }
                    },
                },
            ]
        );
    };

    const handleDragEnd = async ({ data }: { data: Category[] }) => {
        setCategories(data);
        try {
            const updatedItems = data.map((item, index) => ({
                id: item.id,
                sort_order: index,
            }));
            await updateCategoryOrder(updatedItems);
            triggerRefresh();
        } catch (error) {
            console.error('Failed to update category order:', error);
        }
    };

    const closeAllSwipeables = () => {
        Object.values(swipeableRefs.current).forEach((ref: any) => {
            if (ref && ref.close) {
                ref.close();
            }
        });
    };

    const renderItem = ({ item, drag, isActive }: RenderItemParams<Category>) => {
        return (
            <ScaleDecorator>
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
                    <View style={styles.categoryActions}>
                        <TouchableOpacity
                            style={styles.actionIcon}
                            onPress={() => handleEditCategory(item)}
                        >
                            <Ionicons name="pencil" size={20} color="#4A90E2" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionIcon}
                            onPress={() => handleDeleteCategory(item.id)}
                        >
                            <Ionicons name="trash" size={20} color="#dc4446" />
                        </TouchableOpacity>
                        <Ionicons name="menu" size={24} color="#666" />
                    </View>
                </TouchableOpacity>
            </ScaleDecorator>
        );
    };

    const renderAddForm = () => (
        <View style={styles.addForm}>
            <Text style={styles.modalTitle}>
                {isEditing ? i18n.t('categories.editCategory') : i18n.t('categories.addCategory')}
            </Text>
            <View style={styles.formRow}>
                <TextInput
                    style={styles.input}
                    placeholder={i18n.t('categories.categoryName')}
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
                    onPress={() => {
                        setShowAddForm(false);
                        setIsEditing(false);
                        setEditingCategory(null);
                        setNewCategoryName('');
                        setSelectedEmoji(EMOJI_LIST[0]);
                    }}
                >
                    <Text style={styles.cancelButtonText}>{i18n.t('common.cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={[styles.button, styles.saveButton]}
                    onPress={isEditing ? handleSaveEdit : handleAddCategory}
                >
                    <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

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
                        <Text style={styles.emojiPickerTitle}>{i18n.t('categories.selectIcon')}</Text>
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

    return (
        <GestureHandlerRootView style={{ flex: 1 }}>
            <View style={styles.container} onTouchStart={closeAllSwipeables}>
                <View style={styles.tabs}>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
                        onPress={() => setActiveTab('expense')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'expense' && styles.activeTabText
                        ]}>{i18n.t('categories.expense')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.tab, activeTab === 'income' && styles.activeTab]}
                        onPress={() => setActiveTab('income')}
                    >
                        <Text style={[
                            styles.tabText,
                            activeTab === 'income' && styles.activeTabText
                        ]}>{i18n.t('categories.income')}</Text>
                    </TouchableOpacity>
                </View>

                <TouchableOpacity
                    style={styles.addButton}
                    onPress={() => {
                        setIsEditing(false);
                        setEditingCategory(null);
                        setNewCategoryName('');
                        setSelectedEmoji(EMOJI_LIST[0]);
                        setShowAddForm(true);
                    }}
                >
                    <Ionicons name="add" size={24} color="white" />
                    <Text style={styles.addButtonText}>{i18n.t('categories.addCategory')}</Text>
                </TouchableOpacity>

                {showAddForm && renderAddForm()}

                {categories.length === 0 ? (
                    <EmptyState
                        icon="grid-outline"
                        title={i18n.t('categories.noCategories')}
                        description=""
                    />
                ) : (
                    <DraggableFlatList
                        data={categories}
                        onDragEnd={handleDragEnd}
                        keyExtractor={(item) => item.id.toString()}
                        renderItem={renderItem}
                        contentContainerStyle={styles.list}
                    />
                )}

                {renderEmojiPicker()}
            </View>
        </GestureHandlerRootView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
    },
    tabs: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        marginBottom: 20,
        padding: 4,
    },
    tab: {
        flex: 1,
        paddingVertical: 12,
        alignItems: 'center',
        borderRadius: 8,
    },
    activeTab: {
        backgroundColor: '#fff1f1',
    },
    tabText: {
        fontSize: 16,
        color: '#666',
    },
    activeTabText: {
        color: '#dc4446',
        fontWeight: '500',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#dc4446',
        padding: 12,
        borderRadius: 12,
        marginBottom: 20,
    },
    addButtonText: {
        color: 'white',
        fontSize: 16,
        marginLeft: 8,
    },
    list: {
        paddingBottom: 20,
    },
    categoryItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
    },
    categoryItemActive: {
        backgroundColor: '#f0f0f0',
    },
    categoryInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    categoryIcon: {
        fontSize: 24,
    },
    categoryName: {
        fontSize: 16,
        fontWeight: '500',
    },
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    addForm: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 16,
        textAlign: 'center',
    },
    formRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 16,
    },
    input: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    emojiButton: {
        width: 50,
        height: 50,
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
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
    saveButton: {
        backgroundColor: '#dc4446',
    },
    cancelButton: {
        backgroundColor: '#f5f5f5',
    },
    saveButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
    },
    cancelButtonText: {
        color: '#666',
        fontSize: 16,
        fontWeight: '500',
    },
    emojiPickerContainer: {
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 20,
        width: '80%',
        maxHeight: '80%',
    },
    emojiPickerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    emojiPickerTitle: {
        fontSize: 18,
        fontWeight: '600',
    },
    emojiItem: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        margin: 4,
        borderRadius: 8,
    },
    selectedEmojiItem: {
        backgroundColor: '#fff1f1',
    },
    emojiItemText: {
        fontSize: 24,
    },
    categoryActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    actionIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        justifyContent: 'center',
        alignItems: 'center',
    },
});

export default Categories; 