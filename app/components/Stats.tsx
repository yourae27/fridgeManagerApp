import React, { useState, useEffect, SetStateAction } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { getTransactions, getMembers, getCategories, getTags, getStats } from '../constants/Storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import EmptyState from './EmptyState';

type StatsType = 'category' | 'member' | 'tag';
type StatsPeriod = 'month' | 'year' | 'custom';

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
  const [customStartDate, setCustomStartDate] = useState(new Date());
  const [customEndDate, setCustomEndDate] = useState(new Date());
  const [datePickerMode, setDatePickerMode] = useState<'start' | 'end'>('start');
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);

  const [monthlyStats, setMonthlyStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    incomeChange: 0,
    expenseChange: 0
  });

  const loadStats = async () => {
    try {
      const result = await getStats(
        period,
        type,
        selectedDate,
        period === 'custom' ? {
          start: customStartDate,
          end: customEndDate
        } : undefined
      );

      setStats(result.stats);
      setMonthlyStats(result.monthlyStats);
      setTotalAmount(result.stats.reduce((sum, item) => sum + item.amount, 0));

    } catch (error) {
      console.error('Failed to load stats:', error);
    }
  };

  useEffect(() => {
    loadStats();
  }, [period, type, selectedDate]);

  const handleDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      setSelectedDate(date);
    }
  };

  const handleCustomDateChange = (event: any, date?: Date) => {
    setShowDatePicker(false);
    if (date) {
      if (datePickerMode === 'start') {
        setCustomStartDate(date);
      } else {
        setCustomEndDate(date);
      }
    }
  };

  const handleCustomDatePanelClicked = (custommode: 'start' | 'end') => {
    setShowDatePicker(!showDatePicker);
    setDatePickerMode(custommode);
  };

  const validateCustomDateRange = () => {
    const diffTime = Math.abs(customEndDate.getTime() - customStartDate.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays > 365) {
      Alert.alert('提示', '时间跨度不能超过一年');
      return false;
    }
    if (customEndDate < customStartDate) {
      Alert.alert('提示', '结束日期不能早于开始日期');
      return false;
    }
    return true;
  };

  useEffect(() => {
    if (period === 'custom') {
      if (validateCustomDateRange()) {
        loadStats();
      }
    }
  }, [customStartDate, customEndDate]);

  const getDateDisplay = () => {
    if (period === 'month') {
      return selectedDate.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
    }
    return selectedDate.getFullYear().toString() + '年';
  };

  const showTransactionDetails = async (itemName: string) => {
    try {
      const result = await getTransactions();
      const filteredTransactions = result.transactions.filter(t => {
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
      <TouchableOpacity
        style={[styles.filterButton, type === 'category' && styles.activeFilterButton]}
        onPress={() => setType('category')}
      >
        <Text style={[styles.filterText, type === 'category' && styles.activeFilterText]}>
          种类
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, type === 'tag' && styles.activeFilterButton]}
        onPress={() => setType('tag')}
      >
        <Text style={[styles.filterText, type === 'tag' && styles.activeFilterText]}>
          标签
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.filterButton, type === 'member' && styles.activeFilterButton]}
        onPress={() => setType('member')}
      >
        <Text style={[styles.filterText, type === 'member' && styles.activeFilterText]}>
          成员
        </Text>
      </TouchableOpacity>
    </View >
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
          {type === 'tag' && (
            <View style={[styles.tagIcon, { backgroundColor: item.color }]} />
          )}
          {type === 'category' && (
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
        <View style={styles.periodButtons}>
          <TouchableOpacity
            style={[styles.periodButton, period === 'month' && styles.activePeriodButton]}
            onPress={() => setPeriod('month')}
          >
            <Text style={[styles.periodText, period === 'month' && styles.activePeriodText]}>
              月度
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 'year' && styles.activePeriodButton]}
            onPress={() => setPeriod('year')}
          >
            <Text style={[styles.periodText, period === 'year' && styles.activePeriodText]}>
              年度
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.periodButton, period === 'custom' && styles.activePeriodButton]}
            onPress={() => setPeriod('custom')}
          >
            <Text style={[styles.periodText, period === 'custom' && styles.activePeriodText]}>
              自定义
            </Text>
          </TouchableOpacity>
        </View>

        <View style={styles.datePickerSection}>
          {period === 'custom' ? (
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateSelectorButton, datePickerMode === 'start' && styles.activeDateButton]}
                onPress={() => handleCustomDatePanelClicked('start')}
              >
                <Text style={styles.dateSelectorText}>
                  {customStartDate.toLocaleDateString('zh-CN')}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>至</Text>
              <TouchableOpacity
                style={[styles.dateSelectorButton, datePickerMode === 'end' && styles.activeDateButton]}
                onPress={() => handleCustomDatePanelClicked('end')}
              >
                <Text style={styles.dateSelectorText}>
                  {customEndDate.toLocaleDateString('zh-CN')}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={[styles.dateSelectorButton, showDatePicker && styles.activeDateButton]}
              onPress={() => setShowDatePicker(!showDatePicker)}
            >
              <Text style={styles.dateSelectorText}>
                {period === 'month'
                  ? selectedDate.toLocaleString('zh-CN', { year: 'numeric', month: 'long' })
                  : `${selectedDate.getFullYear()}年`
                }
              </Text>
              <Ionicons name="calendar-outline" size={20} color="#666" />
            </TouchableOpacity>
          )}
        </View>

        {showDatePicker && (
          <View style={styles.datePickerContainer}>
            <DateTimePicker
              value={period === 'custom' ? (datePickerMode === 'start' ? customStartDate : customEndDate) : selectedDate}
              mode="date"
              display="inline"
              onChange={period === 'custom' ? handleCustomDateChange : handleDateChange}
              maximumDate={new Date()}
              textColor="#333"
              accentColor="#dc4446"
              themeVariant="light"
            />
          </View>
        )}
      </View>

      <View style={styles.statsContainer}>
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
          {stats.length === 0 && (
            <EmptyState
              icon="bar-chart-outline"
              title="暂无统计数据"
              description="添加一些交易记录就能看到统计信息啦"
            />
          )}
        </View>
      </View>

      {renderTransactionModal()}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: '600',
    marginBottom: 20,
  },
  filterRow: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 4,
    alignSelf: 'flex-start',
  },
  filterButton: {
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginRight: 12,
    borderRadius: 20,
  },
  activeFilterButton: {
    backgroundColor: '#dc4446',
  },
  filterText: {
    fontSize: 14,
    color: '#666',
  },
  activeFilterText: {
    color: 'white',
  },
  datePickerSection: {
    marginTop: 16,
  },
  dateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dateSelectorButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  activeDateButton: {
    backgroundColor: '#fff1f1',
    borderColor: '#dc4446',
    borderWidth: 1,
  },
  dateRangeSeparator: {
    color: '#666',
    fontSize: 16,
  },
  dateSelectorText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  datePickerContainer: {
    marginTop: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  periodButtons: {
    flexDirection: 'row',
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    padding: 4,
    alignSelf: 'flex-start',
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
  statsContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderRadius: 16,
    marginBottom: 16,
  }
});

export default Stats; 