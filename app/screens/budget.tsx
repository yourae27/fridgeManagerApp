import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, TextInput, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getMembers, addMember, updateMember, deleteMember } from '../constants/Storage';
import i18n from '../i18n';
import EmptyState from '../components/EmptyState';
import { useSettings } from '../context/SettingsContext';

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
    const { currency } = useSettings();
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
            Alert.alert(i18n.t('common.alert'), i18n.t('common.pleaseInputMemberName'));
            return;
        }

        const existingMember = members.find(m => m.name === newMemberName.trim());
        if (existingMember) {
            Alert.alert(i18n.t('common.alert'), i18n.t('common.memberNameExists'));
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
            Alert.alert(i18n.t('common.error'), i18n.t('common.addMemberFailed'));
        }
    };

    const handleUpdateMember = async (member: Member) => {
        const existingMember = members.find(m => m.name === member.name && m.id !== member.id);
        if (existingMember) {
            Alert.alert(i18n.t('common.alert'), i18n.t('common.memberNameExists'));
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
            Alert.alert(i18n.t('common.error'), i18n.t('common.updateMemberFailed'));
        }
    };

    const handleDeleteMember = async (id: number) => {
        if (id === 1) {
            Alert.alert(i18n.t('common.alert'), i18n.t('common.defaultMemberCannotBeDeleted'));
            return;
        }

        Alert.alert(
            i18n.t('common.confirmDelete'),
            i18n.t('common.confirmDeleteMember'),
            [
                { text: i18n.t('common.cancel'), style: 'cancel' },
                {
                    text: i18n.t('common.delete'),
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteMember(id);
                            loadMembers();
                        } catch (error) {
                            console.error('Failed to delete member:', error);
                            Alert.alert(i18n.t('common.error'), i18n.t('common.deleteMemberFailed'));
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
                                placeholder={i18n.t('common.memberName')}
                            />
                            <TextInput
                                style={styles.editInput}
                                value={editingMember.budget?.toString() || ''}
                                onChangeText={(text) => setEditingMember({ ...editingMember, budget: text ? parseFloat(text) : null })}
                                placeholder={i18n.t('common.budgetAmount')}
                                keyboardType="decimal-pad"
                            />
                            <View style={styles.editButtons}>
                                <TouchableOpacity
                                    style={[styles.editButton, styles.saveButton]}
                                    onPress={() => handleUpdateMember(editingMember)}
                                >
                                    <Text style={styles.editButtonText}>{i18n.t('common.save')}</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[styles.editButton, styles.cancelButton]}
                                    onPress={() => setEditingMember(null)}
                                >
                                    <Text style={styles.editButtonText}>{i18n.t('common.cancel')}</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ) : (
                        <>
                            <Text style={styles.memberName}>{member.name}</Text>
                            <Text style={styles.memberBudget}>
                                {member.budget ? `${i18n.t('common.budget')}: ${currency}${member.budget.toFixed(2)}` : i18n.t('common.noBudget')}
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
                <Text style={styles.addButtonText}>{i18n.t('common.addMember')}</Text>
            </TouchableOpacity>

            {showAddForm && (
                <View style={styles.addForm}>
                    <TextInput
                        style={styles.input}
                        value={newMemberName}
                        onChangeText={setNewMemberName}
                        placeholder={i18n.t('common.memberName')}
                    />
                    <TextInput
                        style={styles.input}
                        value={newMemberBudget}
                        onChangeText={setNewMemberBudget}
                        placeholder={i18n.t('common.budgetAmount')}
                        keyboardType="decimal-pad"
                    />
                    <View style={styles.formButtons}>
                        <TouchableOpacity
                            style={[styles.formButton, styles.submitButton]}
                            onPress={handleAddMember}
                        >
                            <Text style={styles.formButtonText}>{i18n.t('common.confirm')}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.formButton, styles.cancelButton]}
                            onPress={() => setShowAddForm(false)}
                        >
                            <Text style={styles.formButtonText}>{i18n.t('common.cancel')}</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            <View style={styles.memberList}>
                {members.length === 0 && (
                    <EmptyState
                        icon="people-outline"
                        title={i18n.t('common.noMembers')}
                        description={i18n.t('common.addMembersToRecord')}
                    />
                )}
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