import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Modal } from 'react-native';
import { getTransactions, deleteTransaction, updateTransaction, getMembers } from '../constants/Storage';
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
  member: string;
  refunded: boolean;
}

interface GroupedTransactions {
  [date: string]: Transaction[];
}

interface DailyTotal {
  income: number;
  expense: number;
}

interface MonthlyTotal {
  income: number;
  expense: number;
}

interface Member {
  id: number;
  name: string;
  budget: number | null;
}

const HomeList = () => {
  const [transactions, setTransactions] = useState<GroupedTransactions>({});
  const { refreshTrigger } = useTransactionContext();
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [monthlyTotal, setMonthlyTotal] = useState<MonthlyTotal>({ income: 0, expense: 0 });
  const [selectedMembers, setSelectedMembers] = useState<string[]>(['我']);
  const [members, setMembers] = useState<Member[]>([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);

  // 计算每日总计
  const calculateDailyTotal = (transactions: Transaction[]): DailyTotal => {
    return transactions.reduce((total, transaction) => {
      if (transaction.refunded) return total;

      if (transaction.type === 'income') {
        total.income += Math.abs(transaction.amount);
      } else {
        total.expense += Math.abs(transaction.amount);
      }
      return total;
    }, { income: 0, expense: 0 });
  };

  // 计算月度总计
  const calculateMonthlyTotal = (data: Transaction[]) => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const total = data.reduce((acc, transaction) => {
      const transactionDate = new Date(transaction.date);
      if (
        transactionDate.getMonth() === currentMonth &&
        transactionDate.getFullYear() === currentYear &&
        !transaction.refunded
      ) {
        if (transaction.type === 'income') {
          acc.income += Math.abs(transaction.amount);
        } else {
          acc.expense += Math.abs(transaction.amount);
        }
      }
      return acc;
    }, { income: 0, expense: 0 });

    setMonthlyTotal(total);
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

  useEffect(() => {
    loadMembers();
  }, []);

  // 计算所有选中成员的统计数据
  const calculateSelectedMembersStats = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const stats = Object.values(transactions)
      .flat()
      .filter(t => {
        const transactionDate = new Date(t.date);
        return (selectedMembers.length === 0 || selectedMembers.includes(t.member)) &&
          t.type === 'expense' &&
          !t.refunded &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalBudget = selectedMembers.length === 0
      ? members.reduce((sum, m) => sum + (m.budget || 0), 0)
      : members
        .filter(m => selectedMembers.includes(m.name))
        .reduce((sum, m) => sum + (m.budget || 0), 0);

    return {
      expenses: stats,
      budget: totalBudget,
      remaining: totalBudget - stats
    };
  };

  const loadTransactions = async () => {
    try {
      const data = await getTransactions();
      calculateMonthlyTotal(data);

      // 根据过滤条件筛选数据
      const filteredData = data.filter(transaction => {
        const typeMatch = activeFilter === 'all' || transaction.type === activeFilter;
        const memberMatch = selectedMembers.length === 0 || selectedMembers.includes(transaction.member);
        return typeMatch && memberMatch;
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
  }, [refreshTrigger, activeFilter, selectedMembers]);

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
                member: transaction.member,
                refunded: transaction.refunded ? 'true' : 'false',
              }
            });
          }}
        >
          <Ionicons name="pencil-outline" size={24} color="white" />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.actionButton, styles.refundButton]}
          onPress={async () => {
            try {
              await updateTransaction(transaction.id, {
                refunded: true
              });
              loadTransactions();
            } catch (error) {
              console.error('Failed to refund transaction:', error);
            }
          }}
        >
          <Ionicons name="arrow-undo-outline" size={24} color="white" />
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

  const renderTransactionItem = (transaction: Transaction) => (
    <View style={styles.transactionItem}>
      <View style={styles.transactionLeft}>
        <View style={[
          styles.transactionIcon,
          { backgroundColor: transaction.type === 'income' ? '#FFF8E7' : '#FFF1F1' }
        ]}>
          <Text style={styles.iconText}>{transaction.categoryIcon}</Text>
        </View>
        <View style={styles.transactionInfo}>
          <View style={styles.transactionTitleRow}>
            <Text style={styles.transactionType}>{transaction.category}</Text>
            <View style={styles.transactionTags}>
              <Text style={styles.memberTag}>{transaction.member}</Text>
              {!!transaction.refunded && (
                <View style={styles.refundedBadge}>
                  <Text style={styles.refundedText}>已退款</Text>
                </View>
              )}
            </View>
          </View>
          {transaction.note && (
            <Text style={styles.transactionNote}>{transaction.note}</Text>
          )}
        </View>
      </View>
      <Text style={[
        styles.transactionAmount,
        { color: transaction.type === 'income' ? '#FF9A2E' : '#dc4446' }
      ]}>
        {transaction.type === 'income' ? '+' : '-'}¥{Math.abs(transaction.amount).toFixed(2)}
      </Text>
    </View>
  );

  const renderMemberSelectorModal = () => (
    <Modal
      visible={showMemberSelector}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowMemberSelector(false)}
    >
      <TouchableOpacity
        style={styles.modalOverlay}
        activeOpacity={1}
        onPress={() => setShowMemberSelector(false)}
      >
        <View style={[styles.memberSelectorModal, {
          top: 160,
          right: 20,
        }]}>
          <TouchableOpacity
            style={[
              styles.memberSelectorItem,
              selectedMembers.length === 0 && styles.selectedMemberItem
            ]}
            onPress={() => {
              setSelectedMembers([]);
              setShowMemberSelector(false);
            }}
          >
            <Text style={[
              styles.memberSelectorItemText,
              selectedMembers.length === 0 && styles.selectedMemberItemText
            ]}>全部成员</Text>
          </TouchableOpacity>
          {members.map(member => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberSelectorItem,
                selectedMembers.includes(member.name) && styles.selectedMemberItem
              ]}
              onPress={() => {
                setSelectedMembers(prev => {
                  const newSelection = prev.includes(member.name)
                    ? prev.filter(m => m !== member.name)
                    : [...prev, member.name];
                  return newSelection;
                });
              }}
            >
              <View style={styles.memberSelectorItemContent}>
                <Text style={[
                  styles.memberSelectorItemText,
                  selectedMembers.includes(member.name) && styles.selectedMemberItemText
                ]}>{member.name}</Text>
                {member.budget && (
                  <Text style={styles.memberBudgetText}>
                    预算: ¥{member.budget.toFixed(2)}
                  </Text>
                )}
              </View>
              {selectedMembers.includes(member.name) && (
                <Ionicons name="checkmark" size={20} color="#dc4446" />
              )}
            </TouchableOpacity>
          ))}
        </View>
      </TouchableOpacity>
    </Modal>
  );

  const renderBudgetSection = () => {
    const stats = calculateSelectedMembersStats();
    if (!stats.budget) return null;

    const progress = (stats.expenses / stats.budget) * 100;
    const displayText = selectedMembers.length === 0
      ? '全部成员'
      : selectedMembers.length === 1
        ? selectedMembers[0]
        : `已选择 ${selectedMembers.length} 人`;

    return (
      <View style={styles.budgetSection}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetTitle}>月预算</Text>
          <TouchableOpacity
            style={styles.memberSelector}
            onPress={() => setShowMemberSelector(true)}
          >
            <Text style={styles.memberSelectorText}>{displayText}</Text>
            <Ionicons name="chevron-down" size={16} color="#333" />
          </TouchableOpacity>
        </View>
        <View style={styles.budgetCard}>
          <Text style={styles.totalBudget}>¥{stats.budget.toFixed(2)}</Text>
          <View style={styles.budgetProgressBar}>
            <View style={[styles.budgetProgress, { width: `${Math.min(progress, 100)}%` }]} />
          </View>
          <View style={styles.budgetDetails}>
            <Text style={styles.budgetDetailText}>
              已使用: ¥{stats.expenses.toFixed(2)}
            </Text>
            <Text style={[
              styles.budgetDetailText,
              stats.remaining && stats.remaining < 0 ? styles.overBudget : null
            ]}>
              剩余: ¥{stats.remaining?.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  const renderButtonGroup = () => {
    return <View style={styles.buttons}>
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
  }

  const renderMonthlyStatsCard = () => {
    return <View style={styles.monthlyStatsCard}>
      <Text style={styles.monthlyStatsTitle}>本月收支</Text>
      <View style={styles.monthlyStatsContent}>
        <View style={styles.monthlyStatsItem}>
          <Text style={styles.monthlyStatsLabel}>收入</Text>
          <Text style={[styles.monthlyStatsAmount, { color: '#FF9A2E' }]}>
            ¥{monthlyTotal.income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.monthlyStatsDivider} />
        <View style={styles.monthlyStatsItem}>
          <Text style={styles.monthlyStatsLabel}>支出</Text>
          <Text style={[styles.monthlyStatsAmount, { color: '#dc4446' }]}>
            ¥{monthlyTotal.expense.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  }

  return (
    <View style={styles.container} onTouchStart={closeAllSwipeables}>
      {/* {renderButtonGroup()} */}
      {renderBudgetSection()}
      {renderMemberSelectorModal()}
      {renderMonthlyStatsCard()}

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
              <View style={styles.dateHeader}>
                <Text style={styles.dateText}>{formatDate(date)}</Text>
                <View style={styles.dailyTotal}>
                  {calculateDailyTotal(items).income > 0 && (
                    <Text style={[styles.dailyTotalText, { color: '#FF9A2E' }]}>
                      收入 ¥{calculateDailyTotal(items).income.toFixed(2)}
                    </Text>
                  )}
                  {calculateDailyTotal(items).expense > 0 && (
                    <Text style={[styles.dailyTotalText, { color: '#dc4446' }]}>
                      支出 ¥{calculateDailyTotal(items).expense.toFixed(2)}
                    </Text>
                  )}
                </View>
              </View>
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
                  {renderTransactionItem(transaction)}
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
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  dateText: {
    fontSize: 14,
    color: '#666',
  },
  dailyTotal: {
    flexDirection: 'row',
    gap: 12,
  },
  dailyTotalText: {
    fontSize: 14,
    fontWeight: '500',
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
    backgroundColor: '#C5CCFE',
    borderTopLeftRadius: 12,
    borderBottomLeftRadius: 12,
  },
  deleteButton: {
    backgroundColor: '#dc4446',
    borderTopRightRadius: 12,
    borderBottomRightRadius: 12,
  },
  refundButton: {
    backgroundColor: '#F1EBB3',
  },
  transactionNote: {
    color: '#999',
    fontSize: 12,
  },
  refundedBadge: {
    backgroundColor: '#dc4446',
    borderRadius: 12,
    paddingHorizontal: 4,
    paddingVertical: 2,
  },
  refundedText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  transactionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  monthlyStatsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
  },
  monthlyStatsTitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 12,
  },
  monthlyStatsContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  monthlyStatsItem: {
    flex: 1,
    alignItems: 'center',
  },
  monthlyStatsDivider: {
    width: 1,
    height: 40,
    backgroundColor: '#eee',
    marginHorizontal: 16,
  },
  monthlyStatsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  monthlyStatsAmount: {
    fontSize: 20,
    fontWeight: '600',
  },
  transactionTags: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  memberTag: {
    fontSize: 12,
    color: '#666',
    backgroundColor: '#f5f5f5',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  memberFilter: {
    marginBottom: 16,
  },
  memberFilterItem: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    marginRight: 8,
  },
  selectedMemberFilter: {
    backgroundColor: '#fff1f1',
  },
  memberFilterText: {
    fontSize: 14,
    color: '#666',
  },
  selectedMemberFilterText: {
    color: '#dc4446',
    fontWeight: '500',
  },
  budgetInfo: {
    marginTop: 4,
  },
  budgetText: {
    fontSize: 12,
    color: '#666',
  },
  remainingText: {
    fontSize: 12,
    color: '#4CAF50',
  },
  overBudget: {
    color: '#dc4446',
  },
  budgetSection: {
    marginBottom: 20,
  },
  budgetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  budgetTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  memberSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff1f1',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
  },
  memberSelectorText: {
    fontSize: 14,
    color: '#dc4446',
  },
  budgetCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
  },
  totalBudget: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  budgetProgressBar: {
    height: 8,
    backgroundColor: '#f5f5f5',
    borderRadius: 4,
    marginBottom: 8,
    overflow: 'hidden',
  },
  budgetProgress: {
    height: '100%',
    backgroundColor: '#dc4446',
    borderRadius: 4,
  },
  budgetDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetDetailText: {
    fontSize: 14,
    color: '#666',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  memberSelectorModal: {
    position: 'absolute',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 8,
    minWidth: 160,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  memberSelectorItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  selectedMemberItem: {
    backgroundColor: '#fff1f1',
  },
  memberSelectorItemText: {
    fontSize: 16,
    color: '#333',
  },
  selectedMemberItemText: {
    color: '#dc4446',
    fontWeight: '500',
  },
  memberBudgetText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  memberSelectorItemContent: {
    flex: 1,
  },
});

export default HomeList;
