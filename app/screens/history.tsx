import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, FlatList, ActivityIndicator } from 'react-native';
import { getHistory, HistoryRecord } from '../constants/Storage';
import dayjs from 'dayjs';
import { Ionicons } from '@expo/vector-icons';

const History = () => {
    const [history, setHistory] = useState<HistoryRecord[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        loadHistory();
    }, []);

    const loadHistory = async () => {
        try {
            setIsLoading(true);
            const records = await getHistory();
            setHistory(records);
        } catch (error) {
            console.error('加载历史记录失败:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 获取操作类型的描述
    const getActionDescription = (record: HistoryRecord) => {
        const quantity = record.quantity ? `${record.quantity}${record.unit || ''}` : '';
        switch (record.action_type) {
            case 'use':
                return `使用了${quantity}${record.item_name}`;
            case 'discard':
                return `丢弃了${quantity}${record.item_name}`;
            case 'add':
                return `添加了${quantity}${record.item_name}到${record.storage_type === 'refrigerated' ? '冷藏' : '冷冻'}`;
            case 'move':
                return `将${quantity}${record.item_name}从${record.storage_type === 'refrigerated' ? '冷藏移到冷冻' : '冷冻移到冷藏'}`;
            case 'edit':
                return `编辑了${record.item_name}的信息`;
            default:
                return '';
        }
    };

    const renderHistoryItem = ({ item }: { item: HistoryRecord }) => (
        <View style={styles.historyItem}>
            <View style={styles.historyIcon}>
                <Ionicons
                    name={
                        item.action_type === 'use' ? 'checkmark-circle-outline' :
                            item.action_type === 'discard' ? 'trash-outline' :
                                item.action_type === 'add' ? 'add-circle-outline' :
                                    item.action_type === 'edit' ? 'pencil-outline' :
                                        'swap-horizontal-outline'
                    }
                    size={24}
                    color="#666"
                />
            </View>
            <View style={styles.historyContent}>
                <Text style={styles.historyText}>
                    {getActionDescription(item)}
                </Text>
                <Text style={styles.historyDate}>
                    {dayjs(item.action_date).format('YYYY-MM-DD HH:mm')}
                </Text>
            </View>
        </View>
    );

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4A90E2" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <FlatList
                data={history}
                renderItem={renderHistoryItem}
                keyExtractor={item => item.id.toString()}
                contentContainerStyle={styles.listContainer}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContainer: {
        padding: 16,
    },
    historyItem: {
        flexDirection: 'row',
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 8,
    },
    historyIcon: {
        marginRight: 12,
    },
    historyContent: {
        flex: 1,
    },
    historyText: {
        fontSize: 16,
        color: '#333',
        marginBottom: 4,
    },
    historyDate: {
        fontSize: 14,
        color: '#666',
    },
});

export default History; 