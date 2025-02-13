import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Platform, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useRootNavigationState } from 'expo-router';
import { addFavorite, addTransaction, getFavorites, deleteFavorite, updateTransaction, getCategories } from '../constants/Storage';
import { Swipeable } from 'react-native-gesture-handler';
import { useTransactionContext } from '../context/TransactionContext';
import { Category } from './categories';
import { useCategoryContext } from '../context/CategoryContext';
import i18n from '../i18n';
import DateTimePicker from '@react-native-community/datetimepicker';

// 定义收藏记录的类型
export interface FavoriteRecord {
  id: number;
  amount: number;
  category: string;
  categoryIcon: string;
  note: string;
  date: string;
  created_at: string;
}

const Add = () => {
  const [activeTab, setActiveTab] = useState<'income' | 'expense'>('expense');
  const [activeMode, setActiveMode] = useState<'new' | 'favorites'>('new');

  // 分离收入和支出的状态
  const [incomeState, setIncomeState] = useState({
    amount: '0.00',
    selectedCategory: 0,
    note: '',
    member: '我',
  });

  const [expenseState, setExpenseState] = useState({
    amount: '0.00',
    selectedCategory: 0,
    note: '',
    member: '我',
  });

  // 获取当前激活标签的状态和设置函数
  const currentState = activeTab === 'income' ? incomeState : expenseState;
  const setCurrentState = activeTab === 'income' ? setIncomeState : setExpenseState;

  // 更新状态的辅助函数
  const updateCurrentState = (field: string, value: any) => {
    setCurrentState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // 收藏记录状态
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const { triggerRefresh } = useTransactionContext();
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const { refreshTrigger } = useCategoryContext();
  const members = ['我', '配偶', '子女', '父母', '其他']; // 可以根据需要修改成员列表

  // 从路由参数中获取编辑数据
  const { routes } = useRootNavigationState();
  const params = routes[1].params as any;
  const isEditing = params?.mode === 'edit';

  // 设置初始标签
  useEffect(() => {
    if (params?.mode === 'edit') {
      const targetState = params.type === 'income' ? setIncomeState : setExpenseState;
      targetState({
        amount: params.amount || '0.00',
        selectedCategory: 0, // 将在类别加载后更新
        note: params.note || '',
        member: params.member || '我',
      });
      setActiveTab(params.type as 'income' | 'expense');

      if (params.date) {
        setSelectedDate(new Date(params.date));
      }

      if (params.category) {
        const findAndSetCategory = async () => {
          const cats = await getCategories(params.type);
          const cat = cats.find(c => c.name === params.category);
          if (cat) {
            targetState(prev => ({
              ...prev,
              selectedCategory: cat.id
            }));
          }
        };
        findAndSetCategory();
      }
    } else if (params?.initialTab) {
      setActiveTab(params.initialTab as 'income' | 'expense');
    }
  }, [params]);

  // 加载类别数据
  const loadCategories = async () => {
    try {
      const data = await getCategories(activeTab);
      setCategories(data);
    } catch (error) {
      console.error('Failed to load categories:', error);
    }
  };

  // 当切换收入/支出标签时或类别更新时重新加载类别
  useEffect(() => {
    loadCategories();
  }, [activeTab, refreshTrigger]);

  // 获取收藏列表
  const loadFavorites = async () => {
    try {
      const favs = await getFavorites(activeTab);
      setFavorites(favs);
    } catch (error) {
      console.error('Failed to load favorites:', error);
    }
  };

  // 当切换收入/支出标签时重新加载收藏
  useEffect(() => {
    loadFavorites();
  }, [activeTab]);

  // 添加到收藏
  const addToFavorites = async () => {
    const category = categories.find(c => c.id === currentState.selectedCategory);
    if (!category) return;

    try {
      await addFavorite({
        type: activeTab,
        amount: parseFloat(currentState.amount),
        category: category.name,
        categoryIcon: category.icon,
        note: currentState.note,
        date: new Date().toLocaleDateString(),
      });

      // 重新加载收藏列表
      loadFavorites();
    } catch (error) {
      console.error('Failed to add favorite:', error);
    }
  };

  const formatDate = (date: Date) => {
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      // 使用更友好的日期格式
      return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    }
  };

  // 修改保存函数，使用正确的日期格式
  const saveTransaction = async () => {
    const category = categories.find(c => c.id === currentState.selectedCategory);
    if (!category) return;

    try {
      const transactionAmount = parseFloat(currentState.amount);
      const finalAmount = activeTab === 'income' ?
        Math.abs(transactionAmount) :
        -Math.abs(transactionAmount);

      // 格式化日期为 YYYY-MM-DD 格式
      const formattedDate = selectedDate.toISOString().split('T')[0];

      if (isEditing) {
        await updateTransaction(params.id, {
          type: activeTab,
          amount: finalAmount,
          category: category.name,
          categoryIcon: category.icon,
          note: currentState.note,
          date: formattedDate,
          member: currentState.member,
        });
      } else {
        await addTransaction({
          type: activeTab,
          amount: finalAmount,
          category: category.name,
          categoryIcon: category.icon,
          note: currentState.note,
          date: formattedDate,
          member: currentState.member,
        });
      }
      triggerRefresh();
      router.back();
    } catch (error) {
      console.error('Failed to save transaction:', error);
    }
  };

  const handleDeleteFavorite = async (id: number) => {
    try {
      await deleteFavorite(activeTab, id);
      loadFavorites(); // 重新加载收藏列表
    } catch (error) {
      console.error('Failed to delete favorite:', error);
    }
  };

  const closeAllSwipeables = () => {
    Object.values(swipeableRefs.current).forEach(ref => {
      ref?.close();
    });
  };

  useEffect(() => {
    const handleTouchStart = () => {
      closeAllSwipeables();
    };

  }, []);

  // 添加日期变更处理函数
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setSelectedDate(selectedDate);
    }
    if (showDatePicker && Platform.OS === 'ios') {
      setShowDatePicker(false);
    }
  };

  const renderCreateNew = () => (
    <ScrollView style={styles.scrollView}>
      {/* 金额输入 */}
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>¥</Text>
        <TextInput
          style={styles.amountInput}
          value={currentState.amount}
          onChangeText={(value) => updateCurrentState('amount', value)}
          keyboardType="decimal-pad"
          onFocus={() => currentState.amount === '0.00' &&
            updateCurrentState('amount', '')}
        />
      </View>

      {/* 类别选择 */}
      <Text style={styles.sectionTitle}>Category</Text>
      <View style={styles.categoryGrid}>
        {categories.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              currentState.selectedCategory === category.id && styles.selectedCategory
            ]}
            onPress={() => updateCurrentState('selectedCategory', category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text style={styles.categoryName}>{category.name}</Text>
          </TouchableOpacity>
        ))}
        {/* 添加 Other 按钮 */}
        <TouchableOpacity
          style={[styles.categoryItem, styles.otherCategoryItem]}
          onPress={() => {
            router.push({
              pathname: '/screens/categories',
              params: { initialTab: activeTab }
            });
          }}
        >
          <Text style={styles.categoryIcon}>➕</Text>
          <Text style={styles.categoryName}>Other</Text>
        </TouchableOpacity>
      </View>

      {/* 日期选择 */}
      <Text style={styles.sectionTitle}>Date</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(!showDatePicker)}
      >
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <Ionicons name="calendar-outline" size={20} color="#666" />
      </TouchableOpacity>

      {/* 日期选择器 */}
      {showDatePicker && (
        <DateTimePicker
          value={selectedDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'inline' : 'calendar'}
          onChange={onDateChange}
          maximumDate={new Date()}
        />
      )}

      {/* 备注输入 */}
      <Text style={styles.sectionTitle}>{i18n.t('common.note')}</Text>
      <TextInput
        style={styles.noteInput}
        placeholder={i18n.t('common.note')}
        value={currentState.note}
        onChangeText={(value) => updateCurrentState('note', value)}
        multiline
      />

      {/* 成员选择 */}
      <Text style={styles.sectionTitle}>{i18n.t('common.member')}</Text>
      <View style={styles.memberGrid}>
        {members.map(member => (
          <TouchableOpacity
            key={member}
            style={[
              styles.memberItem,
              currentState.member === member && styles.selectedMember
            ]}
            onPress={() => updateCurrentState('member', member)}
          >
            <Text style={[
              styles.memberText,
              currentState.member === member && styles.selectedMemberText
            ]}>{member}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* 按钮组 */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.favoriteButton]}
          onPress={addToFavorites}
        >
          <Ionicons name="star-outline" size={20} color="#dc4446" />
          <Text style={styles.favoriteButtonText}>Add to Fav</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={saveTransaction}
        >
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderFavorites = () => (
    <ScrollView
      style={styles.scrollView}
      onScrollBeginDrag={closeAllSwipeables}
    >
      {favorites.map(favorite => (
        <Swipeable
          key={favorite.id}
          ref={ref => swipeableRefs.current[favorite.id] = ref}
          renderRightActions={() => (
            <TouchableOpacity
              style={styles.deleteAction}
              onPress={() => handleDeleteFavorite(favorite.id)}
            >
              <Ionicons name="trash-outline" size={24} color="white" />
            </TouchableOpacity>
          )}
          onSwipeableWillOpen={() => {
            // 关闭其他打开的左滑菜单
            Object.entries(swipeableRefs.current).forEach(([id, ref]) => {
              if (Number(id) !== favorite.id) {
                ref?.close();
              }
            });
          }}
        >
          <TouchableOpacity
            style={styles.favoriteItem}
            onPress={() => {
              setActiveMode('new');
              updateCurrentState('amount', favorite.amount.toString());
              updateCurrentState('selectedCategory', categories.find(c => c.name === favorite.category)?.id || 0);
              updateCurrentState('note', favorite.note);
            }}
          >
            <View style={styles.favoriteLeft}>
              <Text style={styles.favoriteIcon}>{favorite.categoryIcon}</Text>
              <View>
                <Text style={styles.favoriteCategory}>{favorite.category}</Text>
                <Text style={styles.favoriteNote}>{favorite.note}</Text>
              </View>
            </View>
            <Text style={[
              styles.favoriteAmount,
              { color: activeTab === 'income' ? '#4CAF50' : '#dc4446' }
            ]}>
              {activeTab === 'income' ? '+' : '-'}¥{favorite.amount}
            </Text>
          </TouchableOpacity>
        </Swipeable>
      ))}
      {favorites.length === 0 && (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No favorites yet</Text>
        </View>
      )}
    </ScrollView>
  );

  return (
    <View style={styles.container} onTouchStart={() => {
      closeAllSwipeables();
    }}>
      {/* 收入支出切换 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'expense' && styles.activeTab]}
          onPress={() => setActiveTab('expense')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'expense' && styles.activeTabText
          ]}>{i18n.t('add.addExpense')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'income' && styles.activeTab]}
          onPress={() => setActiveTab('income')}
        >
          <Text style={[
            styles.tabText,
            activeTab === 'income' && styles.activeTabText
          ]}>{i18n.t('add.addIncome')}</Text>
        </TouchableOpacity>
      </View>

      {/* 创建模式切换 */}
      <View style={styles.modeContainer}>
        <TouchableOpacity
          style={[styles.modeButton, activeMode === 'new' && styles.activeModeButton]}
          onPress={() => setActiveMode('new')}
        >
          <Text style={[
            styles.modeText,
            activeMode === 'new' && styles.activeModeText
          ]}>Create New</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, activeMode === 'favorites' && styles.activeModeButton]}
          onPress={() => setActiveMode('favorites')}
        >
          <Text style={[
            styles.modeText,
            activeMode === 'favorites' && styles.activeModeText
          ]}>Use Favorites</Text>
        </TouchableOpacity>
      </View>

      {activeMode === 'new' ? renderCreateNew() : renderFavorites()}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    paddingHorizontal: 20,
  },
  scrollView: {
    flex: 1,
  },
  tabs: {
    flexDirection: 'row',
    marginTop: 10,
    marginBottom: 20,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 5,
  },
  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: '#dc4446',
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#dc4446',
    fontWeight: '500',
  },
  modeContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  modeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#dc4446',
    alignItems: 'center',
  },
  activeModeButton: {
    backgroundColor: '#fff1f1',
  },
  modeText: {
    color: '#dc4446',
    fontSize: 16,
  },
  activeModeText: {
    fontWeight: '500',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
  },
  currencySymbol: {
    fontSize: 24,
    color: '#333',
    marginRight: 8,
  },
  amountInput: {
    fontSize: 24,
    color: '#333',
    flex: 1,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  categoryItem: {
    width: '23%',
    aspectRatio: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 8,
  },
  otherCategoryItem: {
    backgroundColor: '#fff1f1',
    borderStyle: 'dashed',
    borderWidth: 1,
    borderColor: '#dc4446',
  },
  selectedCategory: {
    backgroundColor: '#f0f6ff',
    borderWidth: 1,
    borderColor: '#4285f4',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
  },
  dateButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: '#333',
  },
  noteInput: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    fontSize: 16,
    color: '#333',
  },
  buttonGroup: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  favoriteButton: {
    backgroundColor: '#fff1f1',
  },
  favoriteButtonText: {
    color: '#dc4446',
    fontSize: 16,
    fontWeight: '500',
  },
  saveButton: {
    backgroundColor: '#dc4446',
  },
  saveButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  favoriteItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    marginBottom: 12,
  },
  favoriteLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  favoriteIcon: {
    fontSize: 24,
    backgroundColor: '#fff',
    padding: 8,
    borderRadius: 8,
  },
  favoriteCategory: {
    fontSize: 16,
    fontWeight: '500',
  },
  favoriteNote: {
    color: '#666',
    fontSize: 14,
  },
  favoriteAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    color: '#666',
    fontSize: 16,
  },
  deleteAction: {
    backgroundColor: '#dc4446',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
    borderRadius: 12,
  },
  datePickerContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    overflow: 'hidden',
  },
  // datePickerIOS: {
  //   height: 300,
  //   backgroundColor: 'white',
  // },
  datePickerButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  datePickerButton: {
    padding: 8,
  },
  datePickerButtonText: {
    color: '#dc4446',
    fontSize: 16,
    fontWeight: '500',
  },
  excludeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 24,
  },
  excludeCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#dc4446',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  excludeText: {
    fontSize: 16,
    color: '#333',
  },
  memberGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 24,
  },
  memberItem: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  selectedMember: {
    backgroundColor: '#fff1f1',
    borderColor: '#dc4446',
  },
  memberText: {
    fontSize: 14,
    color: '#666',
  },
  selectedMemberText: {
    color: '#dc4446',
    fontWeight: '500',
  },
});

export default Add;