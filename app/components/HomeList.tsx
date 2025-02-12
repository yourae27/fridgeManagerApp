import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView } from 'react-native';
import { getTransactions, deleteTransaction } from '../constants/Storage';
import { router } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionContext } from '../context/TransactionContext';
import i18n from '../i18n';

interface Transaction {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  categoryIcon: string;
  note: string;
  date: string;
}

interface GroupedTransactions {
  [date: string]: Transaction[];
}

const HomeList = () => {
  const [transactions, setTransactions] = useState<GroupedTransactions>({});
  const { refreshTrigger } = useTransactionContext();
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');

  const loadTransactions = async () => {
    try {
      const data = await getTransactions();

      // 根据过滤条件筛选数据
      const filteredData = data.filter(transaction => {
        if (activeFilter === 'all') return true;
        return transaction.type === activeFilter;
      });

      // 按日期分组
      const grouped = filteredData.reduce((groups: GroupedTransactions, transaction) => {
        const date = transaction.date;
        if (!groups[date]) {
          groups[date] = [];
        }
        groups[date].push(transaction);
        return groups;
      }, {});

      // 对日期进行排序（倒序）
      const sortedGroups = Object.fromEntries(
        Object.entries(grouped).sort((a, b) => {
          return new Date(b[0]).getTime() - new Date(a[0]).getTime();
        })
      );

      setTransactions(sortedGroups);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  useEffect(() => {
    loadTransactions();
  }, [refreshTrigger, activeFilter]);

  // 关闭所有打开的左滑菜单
  const closeAllSwipeables = () => {
    Object.values(swipeableRefs.current).forEach(ref => {
      ref?.close();
    });
  };

  // 监听页面触摸事件来关闭左滑菜单
  useEffect(() => {
    const handleTouchStart = () => {
      closeAllSwipeables();
    };
  }, []);

  const renderRightActions = (transaction: Transaction) => {
    return (
      <View style={styles.actionButtons}>
        <TouchableOpacity
          style={[styles.actionButton, styles.editButton]}
          onPress={() => {
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
              }
            });
          }}
        >
          <Ionicons name="pencil-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={async () => {
            try {
              await deleteTransaction(transaction.id);
              loadTransactions();
            } catch (error) {
              console.error('Failed to delete transaction:', error);
            }
          }}
        >
          <Ionicons name="trash-outline" size={24} color="white" />
        </TouchableOpacity>
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return '今天';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return '昨天';
    } else {
      return date.toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
  };

  return (
    <View style={styles.container} onTouchStart={closeAllSwipeables}>

      <View style={styles.buttons}>
        <TouchableOpacity
          style={styles.expenseButton}
          onPress={() => router.push({
            pathname: '/screens/add',
            params: { initialTab: 'expense' }
          })}
        >
          <Text style={styles.expenseButtonText}>- {i18n.t('common.expense')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.incomeButton}
          onPress={() => router.push({
            pathname: '/screens/add',
            params: { initialTab: 'income' }
          })}
        >
          <Text style={styles.incomeButtonText}>+ {i18n.t('common.income')}</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.transactionSection}>
        <View style={styles.transactionHeader}>
          <Text style={styles.sectionTitle}>近期交易</Text>
          <View style={styles.filters}>
            <TouchableOpacity
              style={[styles.filter, activeFilter === 'all' && styles.activeFilter]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[
                styles.filterText,
                activeFilter === 'all' && styles.activeFilterText
              ]}>全部</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filter, activeFilter === 'income' && styles.activeFilter]}
              onPress={() => setActiveFilter('income')}
            >
              <Text style={[
                styles.filterText,
                activeFilter === 'income' && styles.activeFilterText
              ]}>{i18n.t('common.income')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.filter, activeFilter === 'expense' && styles.activeFilter]}
              onPress={() => setActiveFilter('expense')}
            >
              <Text style={[
                styles.filterText,
                activeFilter === 'expense' && styles.activeFilterText
              ]}>{i18n.t('common.expense')}</Text>
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView
          style={styles.transactionList}
          onScrollBeginDrag={closeAllSwipeables}
        >
          {Object.entries(transactions).map(([date, items]) => (
            <View key={date} style={styles.dateGroup}>
              <Text style={styles.dateHeader}>{formatDate(date)}</Text>
              {items.map(transaction => (
                <Swipeable
                  key={transaction.id}
                  ref={ref => swipeableRefs.current[transaction.id] = ref}
                  renderRightActions={() => renderRightActions(transaction)}
                  onSwipeableWillOpen={() => {
                    // 关闭其他打开的左滑菜单
                    Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
                      if (Number(id) !== transaction.id) {
                        ref?.close();
                      }
                    });
                  }}
                >
                  <View style={styles.transactionItem}>
                    <View style={styles.transactionLeft}>
                      <View style={[
                        styles.transactionIcon,
                        { backgroundColor: transaction.type === 'income' ? '#FFF8E7' : '#FFF1F1' }
                      ]}>
                        <Text style={styles.iconText}>{transaction.categoryIcon}</Text>
                      </View>
                      <View style={[styles.transactionInfo, !transaction.note && styles.transactionInfoCenter]}>
                        <Text style={styles.transactionType}>{transaction.category}</Text>
                        {transaction.note && (
                          <Text style={styles.transactionDate}>
                            {transaction.note}
                          </Text>
                        )}
                      </View>
                    </View>
                    <Text style={[
                      styles.transactionAmount,
                      { color: transaction.type === 'income' ? '#FF9A2E' : '#dc4446' }
                    ]}>
                      {transaction.type === 'income' ? '+' : '-'}¥{transaction.amount.toFixed(2)}
                    </Text>
                  </View>
                </Swipeable>
              ))}
            </View>
          ))}
        </ScrollView>
      </View>
    </View >
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  incomeButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc4446',
  },
  expenseButton: {
    flex: 1,
    backgroundColor: '#dc4446',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  incomeButtonText: {
    color: '#dc4446',
    fontSize: 16,
    fontWeight: '500',
  },
  expenseButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  transactionSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    flex: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  filters: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 2,
    marginBottom: 16,
    padding: 6,
  },
  filter: {
    paddingVertical: 4,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  activeFilter: {
    backgroundColor: '#FFF1F1',
  },
  filterText: {
    color: '#666',
    fontSize: 14,
  },
  activeFilterText: {
    color: '#dc4446',
    fontWeight: '500',
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 12,
    borderColor: '#FFCCCC',
    borderWidth: 1,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  transactionInfo: {
    gap: 4,
  },
  transactionInfoCenter: {
    justifyContent: 'center',
  },
  transactionType: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  transactionDate: {
    color: '#999',
    fontSize: 13,
  },
  transactionAmount: {
    fontWeight: '600',
    fontSize: 17,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: '#999',
  },
  activeNavText: {
    color: '#dc4446',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc4446',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc4446',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 24,
  },
  deleteAction: {
    backgroundColor: '#dc4446',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
  },
  dateGroup: {
    marginBottom: 20,
  },
  dateHeader: {
    fontSize: 14,
    color: '#666',
    marginBottom: 12,
    marginTop: 8,
  },
  actionButtons: {
    flexDirection: 'row',
    width: 160,
    height: '100%',
  },
  actionButton: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#4285f4',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#dc4446',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  transactionNote: {
    color: '#999',
    fontSize: 12,
  },
});

export default HomeList;
