import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal } from 'react-native';
import { getTransactions, getMembers, getCategories, getTags } from '../constants/Storage';
import { Ionicons } from '@expo/vector-icons';
import i18n from '../i18n';
import DateTimePicker from '@react-native-community/datetimepicker';

type StatsType = 'member' | 'category' | 'tag';
type StatsPeriod = 'month' | 'year';

interface StatItem {
  name: string;
  amount: number;
  icon?: string;
  color?: string;
}

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
  tags?: number[];
}

interface Tag {
  id: number;
  name: string;
  color: string;
}

const Stats = () => {
  const [period, setPeriod] = useState<StatsPeriod>('month');
  const [type, setType] = useState<StatsType>('category');
  const [stats, setStats] = useState<StatItem[]>([]);
  const [totalAmount, setTotalAmount] = useState(0);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [selectedTransactions, setSelectedTransactions] = useState<Transaction[]>([]);
  const [showTransactions, setShowTransactions] = useState(false);
  const [selectedItemName, setSelectedItemName] = useState('');
  const [tags, setTags] = useState<Tag[]>([]);

  const [monthlyStats, setMonthlyStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    incomeChange: 0,
    expenseChange: 0
  });

  const loadStats = async () => {
    try {
      const transactions = await getTransactions();
      const currentDate = new Date();

      // 筛选符合时间范围的交易
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        if (period === 'month') {
          return transactionDate.getMonth() === selectedDate.getMonth() &&
            transactionDate.getFullYear() === selectedDate.getFullYear();
        } else {
          return transactionDate.getFullYear() === selectedDate.getFullYear();
        }
      });

      // 按类型分组统计
      const groupedStats = new Map<string, number>();

      if (type === 'tag') {
        // 加载标签数据
        const tagData = await getTags();
        setTags(tagData);

        // 统计每个标签的支出总额
        filteredTransactions.forEach(t => {
          if (t.type === 'expense' && !t.refunded && t.tags) {
            t.tags.forEach(tagId => {
              const tag = tagData.find(tag => tag.id === tagId);
              if (tag) {
                const currentAmount = groupedStats.get(tag.name) || 0;
                groupedStats.set(tag.name, currentAmount + Math.abs(t.amount));
              }
            });
          }
        });
      } else {
        // 计算当前月份的收支
        const currentMonthTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate.getMonth() === selectedDate.getMonth() &&
            transactionDate.getFullYear() === selectedDate.getFullYear();
        });

        const currentStats = currentMonthTransactions.reduce((acc, t) => {
          if (!t.refunded) {
            if (t.type === 'income') {
              acc.income += Math.abs(t.amount);
            } else {
              acc.expense += Math.abs(t.amount);
            }
          }
          return acc;
        }, { income: 0, expense: 0 });

        // 计算上个月的收支用于计算变化率
        const lastMonth = new Date(selectedDate);
        lastMonth.setMonth(lastMonth.getMonth() - 1);

        const lastMonthTransactions = transactions.filter(t => {
          const transactionDate = new Date(t.date);
          return transactionDate.getMonth() === lastMonth.getMonth() &&
            transactionDate.getFullYear() === lastMonth.getFullYear();
        });

        const lastStats = lastMonthTransactions.reduce((acc, t) => {
          if (!t.refunded) {
            if (t.type === 'income') {
              acc.income += Math.abs(t.amount);
            } else {
              acc.expense += Math.abs(t.amount);
            }
          }
          return acc;
        }, { income: 0, expense: 0 });

        // 计算变化率
        const incomeChange = lastStats.income ? ((currentStats.income - lastStats.income) / lastStats.income) * 100 : 0;
        const expenseChange = lastStats.expense ? ((currentStats.expense - lastStats.expense) / lastStats.expense) * 100 : 0;

        setMonthlyStats({
          balance: currentStats.income - currentStats.expense,
          income: currentStats.income,
          expense: currentStats.expense,
          incomeChange,
          expenseChange
        });

        // 按类型分组统计
        const iconMap = new Map<string, string>();

        if (type === 'category') {
          const categories = await getCategories('expense');
          categories.forEach(c => {
            iconMap.set(c.name, c.icon);
          });
        } else {
          const members = await getMembers();
          members.forEach(m => {
            iconMap.set(m.name, '👤');
          });
        }

        filteredTransactions.forEach(t => {
          if (t.type === 'expense' && !t.refunded) {
            const key = type === 'category' ? t.category : t.member;
            const currentAmount = groupedStats.get(key) || 0;
            groupedStats.set(key, currentAmount + Math.abs(t.amount));
          }
        });
      }

      // 转换为数组并排序
      const statsArray = Array.from(groupedStats.entries())
        .map(([name, amount]) => {
          let icon = '📊';
          let color = '#666';

          if (type === 'tag') {
            const tag = tags.find(t => t.name === name);
            if (tag) {
              color = tag.color;
            }
          }
          // ... 其他类型的图标和颜色处理保持不变

          return {
            name,
            amount,
            icon,
            color,
          };
        })
        .sort((a, b) => b.amount - a.amount);

      const total = statsArray.reduce((sum, item) => sum + item.amount, 0);
      setTotalAmount(total);
      setStats(statsArray);
    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period, type]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
      loadStats();
    }
  };

  const getDateDisplay = () => {
    if (period === 'month') {
      return selectedDate.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
    }
    return selectedDate.getFullYear().toString() + '年';
  };

  const showTransactionDetails = async (itemName: string) => {
    try {
      const transactions = await getTransactions();
      const filteredTransactions = transactions.filter(t => {
        const transactionDate = new Date(t.date);
        const matchDate = period === 'month'
          ? transactionDate.getMonth() === selectedDate.getMonth() &&
          transactionDate.getFullYear() === selectedDate.getFullYear()
          : transactionDate.getFullYear() === selectedDate.getFullYear();

        const matchType = t.type === 'expense' && !t.refunded;
        const matchItem = type === 'category'
          ? t.category === itemName
          : t.member === itemName;

        return matchDate && matchType && matchItem;
      });

      setSelectedTransactions(filteredTransactions);
      setSelectedItemName(itemName);
      setShowTransactions(true);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    }
  };

  const renderFilterChosen = () => {
    return <View style={styles.filterRow}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <TouchableOpacity
          style={[styles.filterButton, type === 'member' && styles.activeFilterButton]}
          onPress={() => setType('member')}
        >
          <Text style={[styles.filterText, type === 'member' && styles.activeFilterText]}>
            Member
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, type === 'category' && styles.activeFilterButton]}
          onPress={() => setType('category')}
        >
          <Text style={[styles.filterText, type === 'category' && styles.activeFilterText]}>
            Category
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, type === 'tag' && styles.activeFilterButton]}
          onPress={() => setType('tag')}
        >
          <Text style={[styles.filterText, type === 'tag' && styles.activeFilterText]}>
            Tag
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  }

  const renderTransactionModal = () => (
    <Modal
      visible={showTransactions}
      transparent={true}
      animationType="slide"
      onRequestClose={() => setShowTransactions(false)}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{selectedItemName}的支出明细</Text>
            <TouchableOpacity onPress={() => setShowTransactions(false)}>
              <Ionicons name="close" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          <ScrollView style={styles.transactionList}>
            {selectedTransactions.map((transaction, index) => (
              <View key={`${transaction.id}-${index}`} style={styles.transactionItem}>
                <View style={styles.transactionLeft}>
                  <Text style={styles.transactionIcon}>{transaction.categoryIcon}</Text>
                  <View>
                    <Text style={styles.transactionCategory}>{transaction.category}</Text>
                    <Text style={styles.transactionDate}>
                      {new Date(transaction.date).toLocaleDateString()}
                    </Text>
                    {transaction.note && (
                      <Text style={styles.transactionNote}>{transaction.note}</Text>
                    )}
                  </View>
                </View>
                <Text style={styles.transactionAmount}>
                  -¥{Math.abs(transaction.amount).toFixed(2)}
                </Text>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  // 渲染统计项
  const renderStatItem = (item: StatItem) => (
    <TouchableOpacity
      style={styles.statItem}
      onPress={() => showTransactionDetails(item.name)}
    >
      <View style={styles.statHeader}>
        <View style={styles.statLeft}>
          {type === 'tag' ? (
            <View style={[styles.tagIcon, { backgroundColor: item.color }]} />
          ) : (
            <Text style={styles.statIcon}>{item.icon}</Text>
          )}
          <Text style={styles.statName}>{item.name}</Text>
        </View>
        <Text style={styles.statAmount}>¥{item.amount.toFixed(2)}</Text>
      </View>
      <View style={styles.progressBarContainer}>
        <View
          style={[
            styles.progressBar,
            type === 'tag' && { backgroundColor: item.color },
            { width: `${(item.amount / totalAmount) * 100}%` }
          ]}
        />
      </View>
      <Text style={styles.percentage}>
        {((item.amount / totalAmount) * 100).toFixed(1)}%
      </Text>
    </TouchableOpacity>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.dateRow}>
          <TouchableOpacity
            style={styles.yearSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.yearText}>{selectedDate.getFullYear()}</Text>
            <Ionicons name="chevron-down" size={20} color="#333" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.monthSelector}
            onPress={() => setShowDatePicker(true)}
          >
            <Text style={styles.monthText}>
              {selectedDate.toLocaleString('en-US', { month: 'long' })}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#333" />
          </TouchableOpacity>
          <View style={styles.periodButtons}>
            <TouchableOpacity
              style={[styles.periodButton, period === 'month' && styles.activePeriodButton]}
              onPress={() => setPeriod('month')}
            >
              <Text style={[styles.periodText, period === 'month' && styles.activePeriodText]}>
                Month
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, period === 'year' && styles.activePeriodButton]}
              onPress={() => setPeriod('year')}
            >
              <Text style={[styles.periodText, period === 'year' && styles.activePeriodText]}>
                Year
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {renderFilterChosen()}

      <View style={styles.categoriesSection}>
        <Text style={styles.sectionTitle}>
          {type === 'category' ? '支出分类' : type === 'member' ? '成员支出' : '标签支出'}
        </Text>
        <View style={styles.statsList}>
          {stats.map((item, index) => (
            <View key={`${item.name}-${index}`}>
              {renderStatItem(item)}
            </View>
          ))}
        </View>
      </View>

      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode={period === 'month' ? 'date' : 'countdown'}
          onChange={handleDateChange}
        />
      )}

      {renderTransactionModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // backgroundColor: 'white',
  },
  header: {
    // margin: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
  },
  filterRow: {
    marginTop: 20,
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginRight: 12,
    borderRadius: 20,
  },
  activeFilterButton: {
    backgroundColor: '#dc4446',
  },
  filterText: {
    fontSize: 16,
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  yearSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
  },
  yearText: {
    fontSize: 16,
    fontWeight: '500',
  },
  monthText: {
    fontSize: 16,
    fontWeight: '500',
  },
  periodButtons: {
    flexDirection: 'row',
    marginLeft: 'auto',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 4,
  },
  periodButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  activePeriodButton: {
    backgroundColor: '#dc4446',
  },
  periodText: {
    fontSize: 14,
    color: '#666',
  },
  activePeriodText: {
    color: 'white',
  },
  statsCards: {
    padding: 20,
  },
  balanceCard: {
    marginBottom: 20,
  },
  balanceLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: '600',
  },
  statsRow: {
    flexDirection: 'row',
    gap: 20,
  },
  statsCard: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 16,
  },
  statsLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  incomeAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#4caf50',
    marginBottom: 8,
  },
  expenseAmount: {
    fontSize: 20,
    fontWeight: '600',
    color: '#dc4446',
    marginBottom: 8,
  },
  changeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  changeIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  changeText: {
    fontSize: 14,
    fontWeight: '500',
  },
  categoriesSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    marginTop: 16,
    gap: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  statsList: {
    backgroundColor: 'white',
    borderRadius: 16,
    gap: 16,
  },
  statItem: {
    gap: 8,
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statIcon: {
    fontSize: 20,
  },
  statName: {
    fontSize: 16,
    color: '#333',
  },
  statAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  progressBarContainer: {
    height: 4,
    backgroundColor: '#f5f5f5',
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#dc4446',
    borderRadius: 2,
  },
  percentage: {
    fontSize: 12,
    color: '#666',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  transactionList: {
    padding: 16,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    fontSize: 24,
  },
  transactionCategory: {
    fontSize: 16,
    color: '#333',
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 14,
    color: '#666',
  },
  transactionNote: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '500',
    color: '#dc4446',
  },
  tagIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

export default Stats; 