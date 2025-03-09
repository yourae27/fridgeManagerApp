import React, { useEffect, useState, useRef, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ScrollView, Modal, TextInput } from 'react-native';
import { getTransactions, deleteTransaction, updateTransaction, getMembers, getTags, getCategories, getTotalBudget } from '../constants/Storage';
import { router, useFocusEffect } from 'expo-router';
import { Swipeable } from 'react-native-gesture-handler';
import { Ionicons } from '@expo/vector-icons';
import { useTransactionContext } from '../context/TransactionContext';
import i18n from '../i18n';
import EmptyState from './EmptyState';
import { useSettings } from '../context/SettingsContext';

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

interface Tag {
  id: number;
  name: string;
  color: string;
}

interface Category {
  id: number;
  name: string;
  icon: string;
  type: 'income' | 'expense';
}

const HomeList = () => {
  const [transactions, setTransactions] = useState<GroupedTransactions>({});
  const { refreshTrigger } = useTransactionContext();
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});
  const [activeFilter, setActiveFilter] = useState<'all' | 'income' | 'expense'>('all');
  const [monthlyTotal, setMonthlyTotal] = useState<MonthlyTotal>({ income: 0, expense: 0 });
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [showMemberSelector, setShowMemberSelector] = useState(false);
  const [tags, setTags] = useState<Tag[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const PAGE_SIZE = 10;
  const { currency } = useSettings();
  const [incomeCategories, setIncomeCategories] = useState<Category[]>([]);
  const [expenseCategories, setExpenseCategories] = useState<Category[]>([]);
  const [totalBudget, setTotalBudget] = useState<number | null>(null);

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

  // 添加 useFocusEffect 钩子，在页面获得焦点时刷新数据
  useFocusEffect(
    useCallback(() => {
      // 当页面获得焦点时（例如从预算页面返回时）刷新数据
      loadMembers();
      loadTags();
      loadCategories();
      loadTotalBudget();
      return () => {
        // 可选的清理函数
      };
    }, [])
  );

  // 保留现有的 useEffect 钩子
  useEffect(() => {
    loadMembers();
    loadTags();
    loadCategories();
  }, [refreshTrigger]);

  // 计算所有选中成员的统计数据
  const calculateSelectedMembersStats = () => {
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();

    const stats = Object.values(transactions)
      .flat()
      .filter(t => {
        const transactionDate = new Date(t.date);
        return (selectedMembers.length === 0 || selectedMembers.includes(t.member_id)) &&
          t.type === 'expense' &&
          !t.refunded &&
          transactionDate.getMonth() === currentMonth &&
          transactionDate.getFullYear() === currentYear;
      })
      .reduce((sum, t) => sum + Math.abs(t.amount), 0);

    const totalBudget = selectedMembers.length === 0
      ? members.reduce((sum, m) => sum + (m.budget || 0), 0)
      : members
        .filter(m => selectedMembers.includes(m.id))
        .reduce((sum, m) => sum + (m.budget || 0), 0);

    return {
      expenses: stats,
      budget: totalBudget,
      remaining: totalBudget - stats
    };
  };

  const loadTransactions = async (pageNum: number, replace = false) => {
    // 如果正在加载中，直接返回
    if (isLoading) return;

    try {
      setIsLoading(true);

      const { transactions: newTransactions, hasMore: more } = await getTransactions({
        page: pageNum,
        pageSize: PAGE_SIZE,
        filter: activeFilter === 'all' ? undefined : activeFilter,
        memberIds: selectedMembers,
        searchText: searchText
      });

      setHasMore(more);

      // 按日期分组
      // const grouped = newTransactions.reduce((acc: { [key: string]: any[] }, curr: any) => {
      //   const date = curr.date;
      //   if (!acc[date]) {
      //     acc[date] = [];
      //   }
      //   acc[date].push(curr);
      //   return acc;
      // }, {});
      const grouped = newTransactions as any

      if (replace) {
        setTransactions(grouped);
        // 只在刷新时计算月度总计
        calculateMonthlyTotal(Object.values(grouped).flat() as Transaction[]);
      } else {
        setTransactions(prev => {
          const newState = { ...prev };
          Object.entries(grouped).forEach(([date, items]) => {
            if (newState[date]) {
              // 检查并过滤掉重复的交易记录
              const existingIds = new Set(newState[date].map((t: Transaction) => t.id));
              const uniqueItems = (items as Transaction[]).filter(item => !existingIds.has(item.id));
              newState[date] = [...newState[date], ...uniqueItems];
            } else {
              newState[date] = items as Transaction[];
            }
          });
          return newState;
        });
      }

      setPage(pageNum);
    } catch (error) {
      console.error('Failed to load transactions:', error);
    } finally {
      setIsLoading(false);
    }
  };

  // 监听筛选条件变化
  useEffect(() => {
    loadTransactions(1, true);
  }, [activeFilter, selectedMembers, refreshTrigger]);

  // 监听搜索文本变化
  useEffect(() => {
    const debounceTimer = setTimeout(() => {
      loadTransactions(1, true);
    }, 300);

    return () => clearTimeout(debounceTimer);
  }, [searchText]);

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
            handleEdit(transaction);
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
              loadTransactions(page, true);
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
              loadTransactions(page, true);
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
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return i18n.t('common.today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      return i18n.t('common.yesterday');
    } else {
      // 根据当前语言格式化日期
      if (i18n.locale === 'zh') {
        return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`;
      } else {
        // 英文日期格式
        const options: Intl.DateTimeFormatOptions = {
          year: 'numeric',
          month: 'long',
          day: 'numeric'
        };
        return date.toLocaleDateString(i18n.locale, options);
      }
    }
  };

  // 获取交易的标签
  const getTransactionTags = (transaction: Transaction) => {
    if (!transaction.tags) return [];
    return tags.filter(tag => transaction.tags?.includes(tag.id));
  };

  // 渲染标签
  const renderTags = (transaction: Transaction) => {
    if (!transaction.tags || transaction.tags.length === 0) return null;

    const tagData = transaction.tags.map(tagId => {
      const tag = tags.find(t => t.id === tagId);
      return tag || { id: tagId, name: `Tag ${tagId}`, color: '#ccc' };
    });

    // 如果标签总字符数超过5或标签数超过2，只显示前面的标签
    const displayTags = tagData.slice(0, 2);
    const hasMore = tagData.length > 2;

    return (
      <View style={styles.tagContainer}>
        {displayTags.map(tag => (
          <View key={tag.id} style={[styles.tag, { borderColor: tag.color }]}>
            <Text style={[styles.tagText, { color: tag.color }]}>{tag.name}</Text>
          </View>
        ))}
        {hasMore && (
          <Text style={styles.moreTagsText}>+{tagData.length - 2}</Text>
        )}
      </View>
    );
  };

  const renderTransactionItem = (transaction: Transaction, index: number) => {
    // 获取最新的分类信息
    const categoryInfo = getCategoryInfo(transaction.category, transaction.type);

    // 获取成员名称，如果 member_id 为 0，则不显示成员
    const memberName = transaction.member_id === 0
      ? null
      : members.find(m => m.id === transaction.member_id)?.name;

    // 使用组合键确保唯一性
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
              (selectedMembers.length === 0) && styles.selectedMemberItem
            ]}
            onPress={() => {
              setSelectedMembers([]);
              setShowMemberSelector(false);
            }}
          >
            <Text style={[
              styles.memberSelectorItemText,
              (selectedMembers.length === 0) && styles.selectedMemberItemText
            ]}>{i18n.t('common.allMembers')}</Text>
          </TouchableOpacity>
          {members.map(member => (
            <TouchableOpacity
              key={member.id}
              style={[
                styles.memberSelectorItem,
                (selectedMembers.length === 1 && selectedMembers[0] === member.id) && styles.selectedMemberItem
              ]}
              onPress={() => {
                // 单选逻辑
                if (selectedMembers.length === 1 && selectedMembers[0] === member.id) {
                  setSelectedMembers([]);
                } else {
                  setSelectedMembers([member.id]);
                }
                setShowMemberSelector(false);
              }}
            >
              <View style={styles.memberSelectorItemContent}>
                <Text style={[
                  styles.memberSelectorItemText,
                  (selectedMembers.length === 1 && selectedMembers[0] === member.id) && styles.selectedMemberItemText
                ]}>{member.name}</Text>
                {!!member.budget && (
                  <Text style={styles.memberBudgetText}>
                    {i18n.t('common.budget')}: {currency}{member.budget.toFixed(2)}
                  </Text>
                )}
              </View>
              {(selectedMembers.length === 1 && selectedMembers[0] === member.id) && (
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

    const progress = stats.budget ? (stats.expenses / stats.budget) * 100 : 0;
    const displayText = selectedMembers.length === 0
      ? i18n.t('common.allMembers')
      : members.find(m => m.id === selectedMembers[0])?.name || '';

    // 使用总预算或成员预算
    const budgetValue = selectedMembers.length === 0 && totalBudget !== null
      ? totalBudget
      : stats.budget || 0;

    // 检查是否需要显示预算设置提示
    const showBudgetPrompt = (selectedMembers.length === 0 && (totalBudget === null || totalBudget === 0)) ||
      (selectedMembers.length > 0 && !stats.budget);

    return (
      <View style={styles.budgetSection}>
        <View style={styles.budgetHeader}>
          <Text style={styles.budgetTitle}>{i18n.t('common.monthlyBudget')}</Text>
          <TouchableOpacity
            style={styles.memberSelector}
            onPress={() => setShowMemberSelector(true)}
          >
            <Text style={styles.memberSelectorText}>{displayText}</Text>
            <Ionicons name="chevron-down" size={16} color="#333" />
          </TouchableOpacity>
        </View>

        {showBudgetPrompt ? (
          // 显示预算设置提示
          <TouchableOpacity
            style={styles.budgetPromptCard}
            onPress={() => router.push('/screens/budget')}
          >
            <View style={styles.budgetPromptContent}>
              <Ionicons name="alert-circle-outline" size={24} color="#dc4446" />
              <Text style={styles.budgetPromptText}>
                {i18n.t('common.noBudgetPrompt')}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#666" />
          </TouchableOpacity>
        ) : (
          // 显示正常的预算卡片
          <View style={styles.budgetCard}>
            <Text style={styles.totalBudget}>{currency}{budgetValue.toFixed(2)}</Text>
            <View style={styles.budgetProgressBar}>
              <View style={[styles.budgetProgress, { width: `${Math.min(progress, 100)}%` }]} />
            </View>
            <View style={styles.budgetDetails}>
              <Text style={styles.budgetDetailText}>
                {i18n.t('common.used')}: {currency}{stats.expenses.toFixed(2)}
              </Text>
              <Text style={[
                styles.budgetDetailText,
                budgetValue && stats.expenses > budgetValue ? styles.overBudget : null
              ]}>
                {i18n.t('common.remaining')}: {currency}{(budgetValue - stats.expenses).toFixed(2)}
              </Text>
            </View>
          </View>
        )}
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
      <View style={styles.monthlyStatsContent}>
        <View style={styles.monthlyStatsItem}>
          <Text style={styles.monthlyStatsLabel}>{i18n.t('common.monthlyIncome')}</Text>
          <Text style={[styles.monthlyStatsAmount, { color: '#FF9A2E' }]}>
            {currency}{monthlyTotal.income.toFixed(2)}
          </Text>
        </View>
        <View style={styles.monthlyStatsDivider} />
        <View style={styles.monthlyStatsItem}>
          <Text style={styles.monthlyStatsLabel}>{i18n.t('common.monthlyExpense')}</Text>
          <Text style={[styles.monthlyStatsAmount, { color: '#dc4446' }]}>
            {currency}{monthlyTotal.expense.toFixed(2)}
          </Text>
        </View>
      </View>
    </View>
  }

  // 渲染加载更多
  const renderFooter = () => {
    if (!hasMore) return null;
    return (
      <TouchableOpacity
        style={styles.loadMoreButton}
        onPress={() => loadTransactions(page + 1)}
        disabled={isLoading}
      >
        <Text style={styles.loadMoreText}>
          {isLoading ? i18n.t('common.loading') : i18n.t('common.loadMore')}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder={i18n.t('common.search')}
          value={searchText}
          onChangeText={setSearchText}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );

  // 添加获取分类信息的辅助函数
  const getCategoryInfo = (categoryName: string, type: 'income' | 'expense') => {
    // 从缓存中获取分类信息
    const categoryList = type === 'income' ? incomeCategories : expenseCategories;
    return categoryList.find(c => c.name === categoryName);
  };

  // 添加处理左滑打开的函数
  const handleSwipeOpen = (id: number) => {
    // 关闭其他打开的左滑菜单
    Object.entries(swipeableRefs.current).forEach(([key, ref]) => {
      if (Number(key) !== id) {
        ref?.close();
      }
    });
  };

  const loadTotalBudget = async () => {
    try {
      const budget = await getTotalBudget();
      setTotalBudget(budget);
    } catch (error) {
      console.error('Failed to load total budget:', error);
    }
  };
  // 添加处理编辑的函数
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
        tags: transaction.tags?.join(','), // 将 tags 转换为字符串
      }
    });
  };

  useEffect(() => {
    loadTotalBudget();
  }, [refreshTrigger]);

  return (
    <View style={styles.container} onTouchStart={closeAllSwipeables}>
      {/* {renderButtonGroup()} */}
      {renderBudgetSection()}
      {renderMemberSelectorModal()}
      {renderMonthlyStatsCard()}

      <View style={styles.transactionSection}>
        <View style={styles.transactionHeader}>
          <Text style={styles.sectionTitle}>{i18n.t('common.transactionRecord')}</Text>
          <View style={styles.filters}>
            <TouchableOpacity
              style={[styles.filter, activeFilter === 'all' && styles.activeFilter]}
              onPress={() => setActiveFilter('all')}
            >
              <Text style={[
                styles.filterText,
                activeFilter === 'all' && styles.activeFilterText
              ]}>{i18n.t('common.all')}</Text>
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
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearch(!showSearch)}
            >
              <Ionicons
                name={showSearch ? "close" : "search"}
                size={20}
                color="#666"
              />
            </TouchableOpacity>

          </View>
        </View>

        {showSearch && renderSearchBar()}

        <ScrollView
          style={styles.transactionList}
          onScrollBeginDrag={closeAllSwipeables}
          onScroll={({ nativeEvent }) => {
            const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
            const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 20;

            if (isCloseToBottom && !isLoading && hasMore) {
              loadTransactions(page + 1);
            }
          }}
          scrollEventThrottle={400}
        >
          {Object.keys(transactions).length === 0 && (
            <EmptyState
              icon="receipt-outline"
              title={i18n.t('common.noTransactions')}
              description={i18n.t('common.clickAddButtonToRecord')}
            />
          )}
          {Object.entries(transactions)
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
            ))}

          {renderFooter()}
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
  searchButton: {
    padding: 4,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 10,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    padding: 0,
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
    color: '#333',
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
  filters: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 1,
    marginBottom: 16,
    padding: 2,
    borderWidth: 1,
    borderColor: '#eee',
    borderRadius: 16,
  },
  filter: {
    paddingVertical: 4,
    paddingHorizontal: 10,
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
  tagContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  tag: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 1,
    backgroundColor: 'white',
  },
  tagText: {
    fontSize: 10,
  },
  moreTagsText: {
    fontSize: 10,
    color: '#666',
  },
  loadMoreButton: {
    padding: 16,
    alignItems: 'center',
  },
  loadMoreText: {
    color: '#666',
    fontSize: 14,
  },
  categoryIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryIconText: {
    fontSize: 20,
  },
  transactionCategory: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  amountText: {
    fontWeight: '600',
    fontSize: 17,
  },
  budgetPromptCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  budgetPromptContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  budgetPromptText: {
    fontSize: 14,
    color: '#333',
    marginLeft: 8,
    flex: 1,
  },
});

export default HomeList;
