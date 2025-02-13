import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMembers, addMember, updateMember, deleteMember } from '../constants/Storage';
import i18n from '../i18n';

interface Member {
    id: number;
    name: string;
    budget: number | null;
}

const Budget = () => {
    const [members, setMembers] = useState<Member[]>([]);
    const [showAddForm, setShowAddForm] = useState(false);
    const [newMemberName, setNewMemberName] = useState('');
    const [newMemberBudget, setNewMemberBudget] = useState('');
    const [editingMember, setEditingMember] = useState<Member | null>(null);

    const loadMembers = async () => {
        try {
            const data = await getMembers();
            setMembers(data);
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    };

    useEffect(() => {
        loadMembers();
    }, []);

    const handleAddMember = async () => {
        if (!newMemberName.trim()) {
            Alert.alert('提示', '请输入成员名称');
            return;
        }

        const existingMember = members.find(m => m.name === newMemberName.trim());
        if (existingMember) {
            Alert.alert('提示', '该成员名称已存在');
            return;
        }

        try {
            await addMember({
                name: newMemberName.trim(),
                budget: newMemberBudget ? parseFloat(newMemberBudget) : undefined,
            });
            setNewMemberName('');
            setNewMemberBudget('');
            setShowAddForm(false);
            loadMembers();
        } catch (error) {
            console.error('Failed to add member:', error);
            Alert.alert('错误', '添加成员失败');
        }
    };

    const handleUpdateMember = async (member: Member) => {
        const existingMember = members.find(m => m.name === member.name && m.id !== member.id);
        if (existingMember) {
            Alert.alert('提示', '该成员名称已存在');
            return;
        }

        try {
            await updateMember(member.id, {
                name: member.name,
                budget: member.budget,
            });
            setEditingMember(null);
            loadMembers();
        } catch (error) {
            console.error('Failed to update member:', error);
            Alert.alert('错误', '更新成员失败');
        }
    };

    const handleDeleteMember = async (id: number) => {
        if (id === 1) {
            Alert.alert('提示', '默认成员"我"不能删除');
            return;
        }

        Alert.alert(
            '确认删除',
            '确定要删除这个成员吗？删除后，该成员的预算记录也会被删除。',
            [
                { text: '取消', style: 'cancel' },
                {
                    text: '删除',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteMember(id);
                            loadMembers();
                        } catch (error) {
                            console.error('Failed to delete member:', error);
                            Alert.alert('错误', '删除成员失败');
                        }
                    },
                },
            ]
        );
    };

    const renderMemberItem = (member: Member) => {
        const isEditing = editingMember?.id === member.id;

        return (
            <View key={member.id} style={styles.memberItem}>
                <View style={styles.memberInfo}>
                    {isEditing ? (
                        <View style={styles.editForm}>
                            <TextInput
                                style={styles.editInput}
                                value={editingMember.name}
                                onChangeText={(text) => setEditingMember({ ...editingMember, name: text })}
                                placeholder="成员名称"
                            />
                            <TextInput
                                style={styles.editInput}
                                value={editingMember.budget?.toString() || ''}
                                onChangeText={(text) => setEditingMember({ ...editingMember, budget: text ? parseFloat(text) : null })}
                                placeholder="预算金额（可选）"
                                keyboardType="decimal-pad"
                            />
                            <View style={styles.editButtons}>
                                <TouchableOpacity
                                    style={[styles.editButton, styles.saveButton]}
                                    onPress={() => handleUpdateMember(editingMember)}
                                >
                                    <Text style={styles.editButtonText}>保存</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.editButton, styles.cancelButton]}
                                    onPress={() => setEditingMember(null)}
                                >
                                    <Text style={styles.editButtonText}>取消</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.memberName}>{member.name}</Text>
                            <Text style={styles.memberBudget}>
                                {member.budget ? `预算: ¥${member.budget.toFixed(2)}` : '未设置预算'}
                            </Text>
                        </>
                    )}
                </View>
                {!isEditing && (
                    <View style={styles.memberActions}>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => setEditingMember(member)}
                        >
                            <Ionicons name="pencil-outline" size={20} color="#666" />
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.actionButton}
                            onPress={() => handleDeleteMember(member.id)}
                        >
                            <Ionicons name="trash-outline" size={20} color="#dc4446" />
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        );
    };

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowAddForm(true)}
            >
                <Ionicons name="add" size={24} color="white" />
                <Text style={styles.addButtonText}>添加成员</Text>
            </TouchableOpacity>

            {showAddForm && (
                <View style={styles.addForm}>
                    <TextInput
                        style={styles.input}
                        value={newMemberName}
                        onChangeText={setNewMemberName}
                        placeholder="成员名称"
                    />
                    <TextInput
                        style={styles.input}
                        value={newMemberBudget}
                        onChangeText={setNewMemberBudget}
                        placeholder="预算金额（可选）"
                        keyboardType="decimal-pad"
                    />
                    <View style={styles.formButtons}>
                        <TouchableOpacity
                            style={[styles.formButton, styles.submitButton]}
                            onPress={handleAddMember}
                        >
                            <Text style={styles.formButtonText}>确定</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.formButton, styles.cancelButton]}
                            onPress={() => setShowAddForm(false)}
                        >
                            <Text style={styles.formButtonText}>取消</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.memberList}>
                {members.map(renderMemberItem)}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
        padding: 20,
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
    addForm: {
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
        marginBottom: 20,
    },
    input: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    formButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 12,
    },
    formButton: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 8,
    },
    submitButton: {
        backgroundColor: '#dc4446',
    },
    cancelButton: {
        backgroundColor: '#666',
    },
    formButtonText: {
        color: 'white',
        fontSize: 14,
    },
    memberList: {
        gap: 12,
    },
    memberItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: 'white',
        padding: 16,
        borderRadius: 12,
    },
    memberInfo: {
        flex: 1,
    },
    memberName: {
        fontSize: 16,
        fontWeight: '500',
        marginBottom: 4,
    },
    memberBudget: {
        fontSize: 14,
        color: '#666',
    },
    memberActions: {
        flexDirection: 'row',
        gap: 12,
    },
    actionButton: {
        padding: 8,
    },
    editForm: {
        flex: 1,
    },
    editInput: {
        borderWidth: 1,
        borderColor: '#ddd',
        borderRadius: 8,
        padding: 8,
        marginBottom: 8,
    },
    editButtons: {
        flexDirection: 'row',
        justifyContent: 'flex-end',
        gap: 8,
    },
    editButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 6,
    },
    saveButton: {
        backgroundColor: '#4CAF50',
    },
    editButtonText: {
        color: 'white',
        fontSize: 14,
    },
});

export default Budget; 