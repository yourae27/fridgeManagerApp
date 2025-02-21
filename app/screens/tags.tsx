import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getTags, addTag, updateTag, deleteTag } from '../constants/Storage';
import i18n from '../i18n';
import EmptyState from '../components/EmptyState';

interface Tag {
    id: number;
    name: string;
    color: string;
}

const Tags = () => {
    const [tags, setTags] = useState<Tag[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newTagName, setNewTagName] = useState('');
    const [editingTag, setEditingTag] = useState<Tag | null>(null);
    const [selectedColor, setSelectedColor] = useState('#dc4446');

    const colors = ['rgb(84, 18, 19)', 'rgb(182, 31, 32)', 'rgb(37, 83, 18)', 'rgb(18, 78, 80)', 'rgb(17, 15, 79)', 'rgb(193, 160, 32)'];

    const loadTags = async () => {
        try {
            const data = await getTags();
            setTags(data);
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    };

    useEffect(() => {
        loadTags();
    }, []);

    const handleAddTag = async () => {
        if (!newTagName.trim()) {
            Alert.alert('提示', '请输入标签名称');
            return;
        }

        try {
            await addTag({
                name: newTagName.trim(),
                color: selectedColor,
            });
            setNewTagName('');
            setSelectedColor('#dc4446');
            setShowAddForm(false);
            loadTags();
        } catch (error) {
            console.error('Failed to add tag:', error);
            Alert.alert('错误', '添加标签失败');
        }
    };

    const handleUpdateTag = async (tag: Tag) => {
        try {
            await updateTag(tag.id, {
                name: tag.name,
                color: tag.color,
            });
            setEditingTag(null);
            loadTags();
        } catch (error) {
            console.error('Failed to update tag:', error);
            Alert.alert('错误', '更新标签失败');
        }
    };

    const handleDeleteTag = async (id: number) => {
        Alert.alert(
            '确认删除',
            '确定要删除这个标签吗？删除后，相关交易的标签也会被移除。',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteTag(id);
                            loadTags();
                        } catch (error) {
                            console.error('Failed to delete tag:', error);
                            Alert.alert('错误', '删除标签失败');
                        }
                    },
                },
            ]
        );
    };

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddForm(true)}
            >
                <Ionicons name="add-circle-outline" size={24} color="#dc4446" />
                <Text style={styles.addButtonText}>添加新标签</Text>
            </TouchableOpacity>

            {showAddForm && (
                <View style={styles.formCard}>
                    <TextInput
                        style={styles.input}
                        placeholder="标签名称"
                        value={newTagName}
                        onChangeText={setNewTagName}
                    />
                    <View style={styles.colorPicker}>
                        {colors.map(color => (
                            <TouchableOpacity
                                key={color}
                                style={[
                                    styles.colorOption,
                                    { backgroundColor: color },
                                    selectedColor === color && styles.selectedColor,
                                ]}
                                onPress={() => setSelectedColor(color)}
                            />
                        ))}
                    </View>
                    <View style={styles.formButtons}>
                        <TouchableOpacity
                            style={[styles.button, styles.cancelButton]}
                            onPress={() => setShowAddForm(false)}
                        >
                            <Text style={styles.buttonText}>取消</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.button, styles.saveButton]}
                            onPress={handleAddTag}
                        >
                            <Text style={styles.buttonText}>保存</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {tags.length === 0 && (
                <EmptyState
                    icon="pricetags-outline"
                    title="暂无标签"
                    description="点击右上角的加号添加标签"
                />
            )}

            <View style={styles.tagList}>
                {tags.map(tag => (
                    <View key={tag.id} style={styles.tagItem}>
                        {editingTag?.id === tag.id ? (
                            <View style={styles.editForm}>
                                <TextInput
                                    style={styles.input}
                                    value={editingTag.name}
                                    onChangeText={text => setEditingTag({ ...editingTag, name: text })}
                                />
                                <View style={styles.colorPicker}>
                                    {colors.map(color => (
                                        <TouchableOpacity
                                            key={color}
                                            style={[
                                                styles.colorOption,
                                                { backgroundColor: color },
                                                editingTag.color === color && styles.selectedColor,
                                            ]}
                                            onPress={() => setEditingTag({ ...editingTag, color })}
                                        />
                                    ))}
                                </View>
                                <View style={styles.formButtons}>
                                    <TouchableOpacity
                                        style={[styles.button, styles.cancelButton]}
                                        onPress={() => setEditingTag(null)}
                                    >
                                        <Text style={styles.buttonText}>取消</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[styles.button, styles.saveButton]}
                                        onPress={() => handleUpdateTag(editingTag)}
                                    >
                                        <Text style={styles.buttonText}>保存</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.tagContent}>
                                <View style={styles.tagLeft}>
                                    <View style={[styles.tagColor, { backgroundColor: tag.color }]} />
                                    <Text style={styles.tagName}>{tag.name}</Text>
                                </View>
                                <View style={styles.tagActions}>
                                    <TouchableOpacity
                                        onPress={() => setEditingTag(tag)}
                                        style={styles.actionButton}
                                    >
                                        <Ionicons name="pencil" size={20} color="#666" />
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        onPress={() => handleDeleteTag(tag.id)}
                                        style={styles.actionButton}
                                    >
                                        <Ionicons name="trash-outline" size={20} color="#666" />
                                    </TouchableOpacity>
                                </View>
                            </View>
                        )}
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    addButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        padding: 16,
        backgroundColor: 'white',
        marginBottom: 16,
    },
    addButtonText: {
        color: '#dc4446',
        fontSize: 16,
        fontWeight: '500',
    },
    formCard: {
        backgroundColor: 'white',
        padding: 16,
        marginBottom: 16,
        gap: 16,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        fontSize: 16,
    },
    colorPicker: {
        flexDirection: 'row',
        gap: 12,
    },
    colorOption: {
        width: 32,
        height: 32,
        borderRadius: 16,
    },
    selectedColor: {
        borderWidth: 3,
        borderColor: 'white',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    formButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    button: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    saveButton: {
        backgroundColor: '#dc4446',
    },
    cancelButton: {
        backgroundColor: '#666',
    },
    buttonText: {
        color: 'white',
        fontSize: 14,
        fontWeight: '500',
    },
    tagList: {
        backgroundColor: 'white',
        borderRadius: 16,
    },
    tagItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    tagContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    tagLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    tagColor: {
        width: 24,
        height: 24,
        borderRadius: 12,
    },
    tagName: {
        fontSize: 16,
        color: '#333',
    },
    tagActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        padding: 4,
    },
    editForm: {
        gap: 16,
    },
});

export default Tags; 