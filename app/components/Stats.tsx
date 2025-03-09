import React, { useState, useEffect, SetStateAction } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, Modal, Alert } from 'react-native';
import { getTransactions, getMembers, getCategories, getTags, getStats } from '../constants/Storage';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import EmptyState from './EmptyState';
import i18n from '../i18n';
import { useSettings } from '../context/SettingsContext';
import { router } from 'expo-router';
import dayjs from 'dayjs';

type StatsType = 'category' | 'member' | 'tag';
type StatsPeriod = 'month' | 'year' | 'custom';
type StatsDataType = 'expense' | 'income';
interface StatItem {
  name: string;
  amount: number;
  icon?: string;
  color?: string;
  id?: number;
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

interface DailyStats {
  income: number;
  expense: number;
}

interface CalendarData {
  [date: string]: DailyStats;
}

const Stats = () => {
  const [period, setPeriod] = useState<StatsPeriod>('month');
  const [type, setType] = useState<StatsType>('category');
  const [dataType, setDataType] = useState<StatsDataType>('expense');
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
  const [showCalendar, setShowCalendar] = useState(false);
  const [calendarData, setCalendarData] = useState<CalendarData>({});
  const [selectedMonth, setSelectedMonth] = useState(new Date());

  const [monthlyStats, setMonthlyStats] = useState({
    balance: 0,
    income: 0,
    expense: 0,
    incomeChange: 0,
    expenseChange: 0
  });

  const { currency } = useSettings();

  const loadStats = async () => {
    try {
      const result = await getStats(
        period,
        type,
        selectedDate,
        period === 'custom' ? {
          start: customStartDate,
          end: customEndDate
        } : undefined,
        dataType
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
  }, [period, type, selectedDate, dataType]);

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

  // const getDateDisplay = () => {
  //   if (period === 'month') {
  //     return selectedDate.toLocaleString('zh-CN', { year: 'numeric', month: 'long' });
  //   }
  //   return selectedDate.getFullYear().toString() + '年';
  // };

  const showTransactionDetails = async (itemName: string) => {
    try {
      const result = await getTransactions({
        type: dataType,
        startDate: customStartDate.toISOString(),
        endDate: customEndDate.toISOString()
      });
      const filteredTransactions = (result.transactions as any)?.filter((t: any) => {
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
    return <View style={styles.filterContainer}>
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.filterButton, type === 'category' && styles.activeFilterButton]}
          onPress={() => setType('category')}
        >
          <Text style={[styles.filterText, type === 'category' && styles.activeFilterText]}>
            {i18n.t('common.category')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, type === 'tag' && styles.activeFilterButton]}
          onPress={() => setType('tag')}
        >
          <Text style={[styles.filterText, type === 'tag' && styles.activeFilterText]}>
            {i18n.t('common.tag')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.filterButton, type === 'member' && styles.activeFilterButton]}
          onPress={() => setType('member')}
        >
          <Text style={[styles.filterText, type === 'member' && styles.activeFilterText]}>
            {i18n.t('common.member')}
          </Text>
        </TouchableOpacity>
      </View >
      <View style={styles.filterRow}>
        <TouchableOpacity
          style={[styles.dataTypeButton]}
          onPress={() => dataType === 'expense' ? setDataType('income') : setDataType('expense')}
        >
          <Text style={[styles.dataTypeText]}>
            {dataType === 'expense' ? i18n.t('common.expense') : i18n.t('common.income')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  };



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
            <Text style={styles.modalTitle}>{selectedItemName}{i18n.t('common.expenseDetail')}</Text>
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
                  -{currency}{Math.abs(transaction.amount).toFixed(2)}
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
      onPress={() => {
        // 计算日期范围
        let startDate: Date, endDate: Date;
        const now = new Date();

        if (period === 'month') {
          // 当月的起止日期

          startDate = dayjs(selectedDate).startOf('month').toDate();
          endDate = dayjs(selectedDate).endOf('month').toDate();
        } else if (period === 'year') {
          // 当年的起止日期
          startDate = dayjs(selectedDate).startOf('year').toDate();
          endDate = dayjs(selectedDate).endOf('year').toDate();
        } else if (period === 'custom') {
          // 自定义日期范围
          startDate = customStartDate;
          endDate = customEndDate;
        } else {
          // 默认使用当月
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        }
        console.log(period, startDate, endDate)
        // 导航到详情页面，传递过滤条件
        const itemId = typeof item.id !== 'undefined' ? item.id.toString() : '';

        router.push({
          pathname: '/screens/statsDetail',
          params: {
            type: type, // 统计类型：category, member, tag
            value: type === 'category' ? item.name : itemId, // 对于分类使用名称，对于成员和标签使用ID
            name: item.name,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            dataType: dataType // expense 或 income
          }
        });
      }}
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
        <Text style={styles.statAmount}>{currency}{item.amount.toFixed(2)}</Text>
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

  // 获取日历数据
  const loadCalendarData = async () => {
    try {
      const startDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1);
      const endDate = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0);
      const { dailyStats } = await getStats('custom', 'category', selectedMonth, {
        start: startDate,
        end: endDate
      }, dataType);
      setCalendarData(dailyStats as any);
    } catch (error) {
      console.error('Failed to load calendar data:', error);
    }
  };

  useEffect(() => {
    loadCalendarData();
  }, [selectedMonth]);

  const formatMonth = (date: Date) => {
    if (i18n.locale === 'zh') {
      return `${date.getFullYear()}年${date.getMonth() + 1}月`;
    } else {
      const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'long'
      };
      return date.toLocaleDateString(i18n.locale, options);
    }
  };

  const renderCalendarHeader = () => {
    const weekDays = i18n.locale === 'zh'
      ? ['一', '二', '三', '四', '五', '六', '日']
      : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    return (
      <View style={styles.calendarHeader}>
        {weekDays.map(day => (
          <Text key={day} style={styles.weekDayText}>{day}</Text>
        ))}
      </View>
    );
  };

  const renderCalendarDays = () => {
    const daysInMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth() + 1, 0).getDate();
    const firstDayOfMonth = new Date(selectedMonth.getFullYear(), selectedMonth.getMonth(), 1).getDay();
    const days = [];

    // 添加空白天数
    for (let i = 0; i < (firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1); i++) {
      days.push(<View key={`empty-${i}`} style={styles.calendarDay} />);
    }

    // 添加月份天数
    for (let i = 1; i <= daysInMonth; i++) {
      const dateStr = `${selectedMonth.getFullYear()}-${String(selectedMonth.getMonth() + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      const dayData = calendarData[dateStr] || { income: 0, expense: 0 };
      const isToday = new Date().toISOString().split('T')[0] === dateStr;

      days.push(
        <View
          key={i}
          style={[
            styles.calendarDay,
            isToday && styles.today,
            dayData.expense > 0 && styles.expenseDay,
            dayData.income > 0 && styles.incomeDay
          ]}
        >
          <Text style={[styles.dayText, isToday && styles.todayText]}>{i}</Text>
          {dayData.income > 0 && (
            <Text style={styles.incomeText}>+{dayData.income}</Text>
          )}
          {dayData.expense > 0 && (
            <Text style={styles.expenseText}>-{dayData.expense}</Text>
          )}
        </View>
      );
    }

    return <View style={styles.calendarGrid}>{days}</View>;
  };

  const renderCalendarModal = () => (
    <Modal
      visible={showCalendar}
      transparent={true}
      animationType="fade"
      onRequestClose={() => setShowCalendar(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.calendarContainer}>
          <View style={styles.calendarHeader}>
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(selectedMonth);
                newDate.setMonth(newDate.getMonth() - 1);
                setSelectedMonth(newDate);
              }}
            >
              <Ionicons name="chevron-back" size={24} color="#333" />
            </TouchableOpacity>
            <Text style={styles.monthText}>
              {formatMonth(selectedMonth)}
            </Text>
            <TouchableOpacity
              onPress={() => {
                const newDate = new Date(selectedMonth);
                newDate.setMonth(newDate.getMonth() + 1);
                setSelectedMonth(newDate);
              }}
            >
              <Ionicons name="chevron-forward" size={24} color="#333" />
            </TouchableOpacity>
          </View>
          {renderCalendarHeader()}
          {renderCalendarDays()}
          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setShowCalendar(false)}
          >
            <Text style={styles.closeButtonText}>{i18n.t('common.close')}</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerCalendar}>
          <View style={styles.periodButtons}>
            <TouchableOpacity
              style={[styles.periodButton, period === 'month' && styles.activePeriodButton]}
              onPress={() => setPeriod('month')}
            >
              <Text style={[styles.periodText, period === 'month' && styles.activePeriodText]}>
                {i18n.t('common.monthly')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, period === 'year' && styles.activePeriodButton]}
              onPress={() => setPeriod('year')}
            >
              <Text style={[styles.periodText, period === 'year' && styles.activePeriodText]}>
                {i18n.t('common.yearly')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.periodButton, period === 'custom' && styles.activePeriodButton]}
              onPress={() => setPeriod('custom')}
            >
              <Text style={[styles.periodText, period === 'custom' && styles.activePeriodText]}>
                {i18n.t('common.custom')}
              </Text>
            </TouchableOpacity>
          </View>
          {/* <TouchableOpacity
            style={styles.calendarButton}
            onPress={() => setShowCalendar(true)}
          >
            <Ionicons name="calendar-outline" size={24} color="#333" />
          </TouchableOpacity> */}
        </View>
        <View style={styles.datePickerSection}>
          {period === 'custom' ? (
            <View style={styles.dateRow}>
              <TouchableOpacity
                style={[styles.dateSelectorButton, datePickerMode === 'start' && styles.activeDateButton]}
                onPress={() => handleCustomDatePanelClicked('start')}
              >
                <Text style={styles.dateSelectorText}>
                  {customStartDate.toLocaleDateString(i18n.locale)}
                </Text>
                <Ionicons name="calendar-outline" size={20} color="#666" />
              </TouchableOpacity>
              <Text style={styles.dateRangeSeparator}>{i18n.t('common.to')}</Text>
              <TouchableOpacity
                style={[styles.dateSelectorButton, datePickerMode === 'end' && styles.activeDateButton]}
                onPress={() => handleCustomDatePanelClicked('end')}
              >
                <Text style={styles.dateSelectorText}>
                  {customEndDate.toLocaleDateString(i18n.locale)}
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
                  ? selectedDate.toLocaleString(i18n.locale, { year: 'numeric', month: 'long' })
                  : `${selectedDate.getFullYear()}`
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
              title={i18n.t('common.noData')}
              description={i18n.t('common.clickAddButtonToRecord')}
            />
          )}
        </View>
      </View>

      {renderTransactionModal()}
      {/* {renderCalendarModal()} */}
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
  },
  headerCalendar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  calendarButton: {
    padding: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  calendarContainer: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    width: '90%',
    maxHeight: '80%',
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  monthText: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekDayText: {
    flex: 1,
    textAlign: 'center',
    color: '#666',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarDay: {
    width: '14.28%',
    aspectRatio: 1,
    padding: 4,
    alignItems: 'center',
  },
  dayText: {
    fontSize: 16,
    marginBottom: 2,
  },
  today: {
    backgroundColor: '#fff1f1',
    borderRadius: 8,
  },
  todayText: {
    color: '#dc4446',
    fontWeight: '600',
  },
  expenseDay: {
    backgroundColor: '#fff1f1',
  },
  incomeDay: {
    backgroundColor: '#FFF8E7',
  },
  incomeText: {
    fontSize: 10,
    color: '#FF9A2E',
  },
  expenseText: {
    fontSize: 10,
    color: '#dc4446',
  },
  closeButton: {
    marginTop: 16,
    padding: 12,
    backgroundColor: '#dc4446',
    borderRadius: 8,
    alignItems: 'center',
  },
  closeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  filterContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dataTypeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    overflow: 'hidden',
  },
  dataTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#dc4446',
  },
});

export default Stats; 