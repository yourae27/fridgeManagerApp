import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { getTransactions, getMembers, getTags, getCategories, deleteTransaction } from '../constants/Storage';
import { Ionicons } from '@expo/vector-icons';
import { Swipeable } from 'react-native-gesture-handler';
import { useTransactionContext } from '../context/TransactionContext';
import i18n from '../i18n';
import { useSettings } from '../context/SettingsContext';
import EmptyState from '../components/EmptyState';

interface Transaction {
    id: number;
    type: 'income' | 'expense';
    amount: number;
    category: string;
    categoryIcon: string;
    note: string;
    date: string;
    member_id: number;
    refunded: boolean;
    tags?: number[];
}

interface Category {
    id: number;
    name: string;
    icon: string;
    type: 'income' | 'expense';
}

interface Tag {
    id: number;
    name: string;
    color: string;
}

interface Member {
    id: number;
    name: string;
    budget: number | null;
}

interface GroupedTransactions {
    [date: string]: Transaction[];
}

const StatsDetail = () => {
    const params = useLocalSearchParams();
    const { currency } = useSettings();
    const { triggerRefresh, refreshTrigger } = useTransactionContext();

    const [transactions, setTransactions] = useState<GroupedTransactions>({});
    const [isLoading, setIsLoading] = useState(true);
    const [members, setMembers] = useState<Member[]>([]);
    const [tags, setTags] = useState<Tag[]>([]);
    const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
    const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);

    const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});

    // 从参数中获取过滤条件
    const filterType = params.type as string;
    const filterValue = params.value as string;
    const filterName = params.name as string;
    const filterStartDate = params.startDate as string;
    const filterEndDate = params.endDate as string;
    const filterDataType = params.dataType as 'expense' | 'income';

    // 添加分页相关状态和常量
    const PAGE_SIZE = 10; // 每页显示的交易数量
    const [page, setPage] = useState(1); // 当前页码
    const [hasMore, setHasMore] = useState(true); // 是否有更多数据

    // 计算每日总计
    const calculateDailyTotal = (items: Transaction[]) => {
        return items.reduce(
            (acc, item) => {
                if (item.type === 'income') {
                    acc.income += Math.abs(item.amount);
                } else {
                    acc.expense += Math.abs(item.amount);
                }
                return acc;
            },
            { income: 0, expense: 0 }
        );
    };

    // 格式化日期显示
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        if (dateString === today.toISOString().split('T')[0]) {
            return i18n.t('common.today');
        } else if (dateString === yesterday.toISOString().split('T')[0]) {
            return i18n.t('common.yesterday');
        } else {
            return dateString;
        }
    };

    // 修改 loadTransactions 函数，支持分页加载
    const loadTransactions = async (pageNum = 1, replace = false) => {
        try {
            setIsLoading(true);

            // 构建过滤条件
            let filter: any = {};

            // 设置日期范围
            if (filterStartDate && filterEndDate) {
                filter.startDate = new Date(filterStartDate).toISOString().split('T')[0];
                filter.endDate = new Date(filterEndDate).toISOString().split('T')[0];
            }

            // 设置数据类型（收入/支出）
            if (filterDataType) {
                filter.type = filterDataType;
            }

            // 根据统计类型设置特定过滤条件
            if (filterType === 'category') {
                filter.category = filterValue;
            } else if (filterType === 'member') {
                const memberId = parseInt(filterValue);
                if (!isNaN(memberId)) {
                    filter.memberIds = [memberId];
                }
            } else if (filterType === 'tag') {
                const tagId = parseInt(filterValue);
                if (!isNaN(tagId)) {
                    filter.tagIds = [tagId];
                }
            }

            console.log('Filter applied:', filter);

            // 获取交易数据，添加分页参数
            const { transactions: fetchedTransactions, hasMore: moreAvailable } = await getTransactions({
                page: pageNum,
                pageSize: PAGE_SIZE,
                ...filter
            });
            setHasMore(moreAvailable);
            console.log('fetchedTransactions', fetchedTransactions);
            const grouped = fetchedTransactions as any;

            if (replace) {
                // 如果是替换，直接设置新数据
                setTransactions(grouped);
            } else {
                // 如果是加载更多，合并数据
                setTransactions(prev => {
                    const newState = { ...prev };
                    Object.entries(grouped).forEach(([date, items]) => {
                        if (newState[date]) {
                            // 检查并过滤掉重复的交易记录
                            const existingIds = new Set(newState[date].map(t => t.id));
                            const uniqueItems = (items as any).filter((item: Transaction) => !existingIds.has(item.id));
                            newState[date] = [...newState[date], ...uniqueItems];
                        } else {
                            newState[date] = items as Transaction[];
                        }
                    });
                    return newState;
                });
            }

            // 更新页码
            setPage(pageNum);
        } catch (error) {
            console.error('Failed to load transactions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    // 加载成员数据
    const loadMembers = async () => {
        try {
            const data = await getMembers();
            setMembers(data);
        } catch (error) {
            console.error('Failed to load members:', error);
        }
    };

    // 加载标签数据
    const loadTags = async () => {
        try {
            const data = await getTags();
            setTags(data);
        } catch (error) {
            console.error('Failed to load tags:', error);
        }
    };

    // 加载分类数据
    const loadCategories = async () => {
        try {
            const categories = await getCategories();
            setIncomeCategories(categories.filter(c => c.type === 'income') as Category[]);
            setExpenseCategories(categories.filter(c => c.type === 'expense') as Category[]);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    // 修改初始化数据的 useEffect
    useEffect(() => {
        const loadData = async () => {
            await loadMembers();
            await loadTags();
            await loadCategories();
            await loadTransactions(1, true); // 加载第一页数据，并替换现有数据
        };
        loadData();
    }, [refreshTrigger]);

    // 获取分类信息
    const getCategoryInfo = (categoryName: string, type: 'income' | 'expense') => {
        const categoryList = type === 'income' ? incomeCategories : expenseCategories;
        return categoryList.find(c => c.name === categoryName);
    };

    // 渲染标签
    const renderTags = (transaction: Transaction) => {
        if (!transaction.tags || transaction.tags.length === 0) return null;

        return (
            <View style={styles.tagContainer}>
                {transaction.tags.map(tagId => {
                    const tag = tags.find(t => t.id === tagId);
                    if (!tag) return null;

                    return (
                        <View
                            key={tagId}
                            style={[styles.tag, { backgroundColor: `${tag.color}20` }]}
                        >
                            <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
                        </View>
                    );
                })}
            </View>
        );
    };

    // 处理编辑交易
    const handleEdit = (transaction: Transaction) => {
        router.push({
            pathname: '/screens/add',
            params: {
                mode: 'edit',
                id: transaction.id,
                type: transaction.type,
                amount: Math.abs(transaction.amount).toString(),
                category: transaction.category,
                categoryIcon: transaction.categoryIcon,
                note: transaction.note || '',
                date: transaction.date,
                initialTab: transaction.type,
                member_id: transaction.member_id,
                refunded: transaction.refunded ? 'true' : 'false',
                tags: transaction.tags?.join(','),
            }
        });
    };

    // 处理删除交易
    const handleDelete = async (id: number) => {
        try {
            await deleteTransaction(id);
            triggerRefresh();

            // 从当前列表中移除已删除的交易
            setTransactions(prev => {
                const newState = { ...prev };
                Object.keys(newState).forEach(date => {
                    newState[date] = newState[date].filter(t => t.id !== id);
                    if (newState[date].length === 0) {
                        delete newState[date];
                    }
                });
                return newState;
            });
        } catch (error) {
            console.error('Failed to delete transaction:', error);
        }
    };

    // 关闭所有打开的滑动菜单
    const closeAllSwipeables = () => {
        Object.values(swipeableRefs.current).forEach(ref => {
            ref?.close();
        });
    };

    // 处理滑动打开
    const handleSwipeOpen = (id: number) => {
        Object.entries(swipeableRefs.current).forEach(([key, ref]) => {
            if (Number(key) !== id) {
                ref?.close();
            }
        });
    };

    // 渲染右侧滑动操作
    const renderRightActions = (transaction: Transaction) => (
        <View style={styles.rightActions}>
            <TouchableOpacity
                style={[styles.actionButton, styles.editButton]}
                onPress={() => handleEdit(transaction)}
            >
                <Ionicons name="pencil" size={20} color="white" />
            </TouchableOpacity>
            <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDelete(transaction.id)}
            >
                <Ionicons name="trash" size={20} color="white" />
            </TouchableOpacity>
        </View>
    );

    // 渲染交易项
    const renderTransactionItem = (transaction: Transaction, index: number) => {
        const categoryInfo = getCategoryInfo(transaction.category, transaction.type);

        const memberName = transaction.member_id === 0
            ? null
            : members.find(m => m.id === transaction.member_id)?.name;

        const uniqueKey = `${transaction.id}`;

        return (
            <Swipeable
                key={uniqueKey}
                ref={ref => {
                    if (ref) {
                        swipeableRefs.current[transaction.id] = ref;
                    }
                }}
                renderRightActions={() => renderRightActions(transaction)}
                onSwipeableOpen={() => handleSwipeOpen(transaction.id)}
            >
                <TouchableOpacity
                    style={styles.transactionItem}
                    onPress={() => handleEdit(transaction)}
                >
                    <View style={styles.transactionLeft}>
                        <View
                            style={[
                                styles.categoryIcon,
                                {
                                    backgroundColor: transaction.type === 'income'
                                        ? '#FFF5E5'
                                        : '#FFF1F1'
                                }
                            ]}
                        >
                            <Text style={styles.iconText}>
                                {categoryInfo?.icon || transaction.categoryIcon || '📊'}
                            </Text>
                        </View>
                        <View style={styles.transactionInfo}>
                            <View style={styles.transactionTitleRow}>
                                <Text style={styles.transactionType}>
                                    {categoryInfo?.name || transaction.category}
                                </Text>
                                <View style={styles.transactionTags}>
                                    {!!memberName && (
                                        <Text style={styles.memberTag}>{memberName}</Text>
                                    )}
                                    {!!transaction.refunded && (
                                        <View style={styles.refundedBadge}>
                                            <Text style={styles.refundedText}>{i18n.t('common.refunded')}</Text>
                                        </View>
                                    )}
                                </View>
                            </View>
                            {transaction.note && (
                                <Text style={styles.transactionNote}>{transaction.note}</Text>
                            )}
                            {transaction.type === 'expense' && renderTags(transaction)}
                        </View>
                    </View>
                    <Text style={[
                        styles.transactionAmount,
                        { color: transaction.type === 'income' ? '#FF9A2E' : '#dc4446' }
                    ]}>
                        {transaction.type === 'income' ? '+' : '-'}{currency}{Math.abs(transaction.amount).toFixed(2)}
                    </Text>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    // 渲染加载中状态
    const renderFooter = () => {
        return (
            <View style={styles.footer}>
                <Text style={styles.footerText}>{i18n.t('common.loading')}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.headerTitle}>
                    {filterName} - {filterDataType === 'income' ? i18n.t('common.income') : i18n.t('common.expense')}
                </Text>
                <Text style={styles.headerSubtitle}>
                    {filterStartDate && filterEndDate
                        ? `${filterStartDate} ${i18n.t('common.to')} ${filterEndDate}`
                        : i18n.t('common.noDate')}
                </Text>
            </View>

            <View style={styles.transactionSection}>
                <ScrollView
                    style={styles.transactionList}
                    onScrollBeginDrag={closeAllSwipeables}
                    onScroll={({ nativeEvent }) => {
                        const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
                        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

                        if (isCloseToBottom && !isLoading && hasMore) {
                            loadTransactions(page + 1); // 加载下一页
                        }
                    }}
                    scrollEventThrottle={400}
                >
                    {Object.keys(transactions).length === 0 && !isLoading ? (
                        <EmptyState
                            icon="receipt-outline"
                            title={i18n.t('common.noTransactions')}
                            description={i18n.t('common.noData')}
                        />
                    ) : (
                        Object.entries(transactions)
                            .sort(([a], [b]) => new Date(b).getTime() - new Date(a).getTime())
                            .map(([date, items]) => (
                                <View key={`date-${date}`} style={styles.dateGroup}>
                                    <View style={styles.dateHeader}>
                                        <Text style={styles.dateText}>{formatDate(date)}</Text>
                                        <View style={styles.dailyTotal}>
                                            {calculateDailyTotal(items).income > 0 && (
                                                <Text style={[styles.dailyTotalText, { color: '#FF9A2E' }]}>
                                                    {i18n.t('common.income')}: {currency}{calculateDailyTotal(items).income.toFixed(2)}
                                                </Text>
                                            )}
                                            {calculateDailyTotal(items).expense > 0 && (
                                                <Text style={[styles.dailyTotalText, { color: '#dc4446' }]}>
                                                    {i18n.t('common.expense')}: {currency}{calculateDailyTotal(items).expense.toFixed(2)}
                                                </Text>
                                            )}
                                        </View>
                                    </View>
                                    {items.map((transaction, index) => (
                                        renderTransactionItem(transaction, index)
                                    ))}
                                </View>
                            ))
                    )}
                    {isLoading && (
                        <View style={styles.footer}>
                            <Text style={styles.footerText}>{i18n.t('common.loading')}</Text>
                        </View>
                    )}
                    {!isLoading && hasMore && (
                        <TouchableOpacity
                            style={styles.loadMoreButton}
                            onPress={() => loadTransactions(page + 1)}
                        >
                            <Text style={styles.loadMoreText}>{i18n.t('common.loadMore')}</Text>
                        </TouchableOpacity>
                    )}
                </ScrollView>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        backgroundColor: 'white',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    transactionSection: {
        flex: 1,
    },
    transactionList: {
        flex: 1,
    },
    dateGroup: {
        marginBottom: 16,
    },
    dateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
    },
    dateText: {
        fontSize: 14,
        fontWeight: '500',
        color: '#666',
    },
    dailyTotal: {
        flexDirection: 'row',
        gap: 8,
    },
    dailyTotalText: {
        fontSize: 12,
        fontWeight: '500',
    },
    transactionItem: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 16,
        marginHorizontal: 16,
        marginVertical: 4,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
        elevation: 2,
    },
    transactionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    categoryIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    iconText: {
        fontSize: 16,
    },
    transactionInfo: {
        flex: 1,
    },
    transactionTitleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transactionType: {
        fontSize: 16,
        fontWeight: '500',
        color: '#333',
    },
    transactionTags: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    memberTag: {
        fontSize: 12,
        color: '#666',
        backgroundColor: '#f0f0f0',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    refundedBadge: {
        backgroundColor: '#FFF1F1',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    refundedText: {
        fontSize: 12,
        color: '#dc4446',
    },
    transactionNote: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    transactionAmount: {
        fontSize: 16,
        fontWeight: '500',
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    tag: {
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 4,
    },
    tagText: {
        fontSize: 12,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        marginRight: 16,
    },
    actionButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
        marginLeft: 8,
    },
    editButton: {
        backgroundColor: '#4CAF50',
    },
    deleteButton: {
        backgroundColor: '#dc4446',
    },
    footer: {
        padding: 16,
        alignItems: 'center',
    },
    footerText: {
        color: '#666',
    },
    loadMoreButton: {
        padding: 16,
        alignItems: 'center',
    },
    loadMoreText: {
        color: '#666',
    },
});

export default StatsDetail; 