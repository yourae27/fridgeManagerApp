import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Platform, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useRootNavigationState } from 'expo-router';
import { addFavorite, addTransaction, getFavorites, deleteFavorite, updateTransaction, getCategories, getMembers, getTags, updateFavoriteOrder } from '../constants/Storage';
import { Swipeable } from 'react-native-gesture-handler';
import { useTransactionContext } from '../context/TransactionContext';
import { Category } from './categories';
import { useCategoryContext } from '../context/CategoryContext';
import i18n from '../i18n';
import DateTimePicker from '@react-native-community/datetimepicker';
import DraggableFlatList, { ScaleDecorator } from 'react-native-draggable-flatlist';
import Animated from 'react-native-reanimated';

// 定义收藏记录的类型
export interface FavoriteRecord {
  id: number;
  amount: number;
  category: string;
  categoryIcon: string;
  note: string;
  date: string;
  sort_order: number;
}

interface Tag {
  id: number;
  name: string;
  color: string;
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
    refunded: false,
  });

  const [expenseState, setExpenseState] = useState({
    amount: '0.00',
    selectedCategory: 0,
    note: '',
    member: '我',
    refunded: false,
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
  const [members, setMembers] = useState<string[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [selectedTags, setSelectedTags] = useState<number[]>([]);

  // 从路由参数中获取编辑数据
  const { routes } = useRootNavigationState();
  const params = routes[1].params as any;
  const isEditing = params?.mode === 'edit';
  const [isRefunded, setIsRefunded] = useState(false);

  // 设置初始标签
  useEffect(() => {
    if (params?.mode === 'edit') {
      const targetState = params.type === 'income' ? setIncomeState : setExpenseState;
      targetState({
        amount: params.amount || '0.00',
        selectedCategory: 0, // 将在类别加载后更新
        note: params.note || '',
        member: params.member || '我',
        refunded: params.refunded === 'true' ? true : false,
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
      if (!!params.tags) {
        setSelectedTags(params.tags.split(',').map(Number));
      }

      setIsRefunded(params.refunded === 'true');
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
          refunded: isRefunded,
          tags: selectedTags,
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
          refunded: false,
          tags: selectedTags,
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

  const renderCategoryName = (name: string) => {
    if (name.length <= 4) return name;
    return name.slice(0, 4) + '...';
  };

  const renderTagSection = () => {
    return <View>
      <Text style={styles.sectionTitle}>标签</Text>
      <View style={styles.tagGrid}>
        {tags.map(tag => (
          <TouchableOpacity
            key={tag.id}
            style={[
              styles.tagItem,
              selectedTags.includes(tag.id) && styles.selectedTag,
              { borderColor: tag.color }
            ]}
            onPress={() => {

              setSelectedTags((prev: any) => {
                return prev?.includes(tag.id)
                  ? prev?.filter((id: any) => id !== tag.id)
                  : [...prev, tag.id];
              }
              );
            }}
          >
            <Text style={[
              styles.tagText,
              selectedTags.includes(tag.id) && { color: tag.color }
            ]}>{tag.name}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  }
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
      <Text style={styles.sectionTitle}>{i18n.t('common.category')}</Text>
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
            <Text
              style={styles.categoryName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {renderCategoryName(category.name)}
            </Text>
          </TouchableOpacity>
        ))}
        <TouchableOpacity
          style={[styles.categoryItem, styles.otherCategoryItem]}
          onPress={() => router.push({
            pathname: '/screens/categories',
            params: { initialTab: activeTab }
          })}
        >
          <Ionicons name="add" size={24} color="#dc4446" />
          <Text style={[styles.categoryName, { color: '#dc4446' }]}>
            {i18n.t('common.add')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 日期选择 */}
      <Text style={styles.sectionTitle}>{i18n.t('common.date')}</Text>
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
          textColor="#333"
          accentColor="#dc4446"
          themeVariant="light"
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
      {members.length > 0 && (<View>
        <Text style={styles.sectionTitle}>{i18n.t('common.member')}</Text>
        <View style={styles.memberGrid}>
          {members.map((member) => (
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
        </View></View>)
      }

      {/* 退款状态 */}
      {isEditing && activeTab === 'expense' && (
        <View style={styles.refundedContainer}>
          <Text style={styles.sectionTitle}>{i18n.t('common.refunded')}</Text>
          <TouchableOpacity
            style={styles.refundedOption}
            onPress={() => setIsRefunded(!isRefunded)}
          >
            <View style={styles.refundedCheckbox}>
              {!!isRefunded && (
                <Ionicons name="checkmark" size={16} color="#dc4446" />
              )}
            </View>
            <Text style={styles.refundedText}>{i18n.t('common.refunded')}</Text>
          </TouchableOpacity>
        </View>
      )}

      {activeTab === 'expense' && tags.length > 0 && renderTagSection()}

      {/* 按钮组 */}
      <View style={styles.buttonGroup}>
        <TouchableOpacity
          style={[styles.button, styles.favoriteButton]}
          onPress={addToFavorites}
        >
          <Ionicons name="star-outline" size={20} color="#dc4446" />
          <Text style={styles.favoriteButtonText}>{i18n.t('add.addToFavorites')}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.saveButton]}
          onPress={saveTransaction}
        >
          <Text style={styles.saveButtonText}>{i18n.t('common.save')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );

  const renderFavorites = () => (
    <DraggableFlatList
      data={favorites}
      onDragEnd={async ({ data }) => {
        setFavorites(data);
        await updateFavoriteOrder(
          activeTab,
          data.map((item, index) => ({
            id: item.id,
            sort_order: index
          }))
        );
      }}
      keyExtractor={item => item.id.toString()}
      renderItem={({ item, drag, isActive }) => (
        <ScaleDecorator>
          <Animated.View>
            <Swipeable
              ref={ref => {
                if (ref) {
                  swipeableRefs.current[item.id] = ref;
                }
              }}
              renderRightActions={() => (
                <TouchableOpacity
                  style={styles.deleteAction}
                  onPress={() => handleDeleteFavorite(item.id)}
                >
                  <Ionicons name="trash-outline" size={24} color="white" />
                </TouchableOpacity>
              )}
              onSwipeableOpen={() => {
                Object.entries(swipeableRefs.current).forEach(([key, ref]) => {
                  if (Number(key) !== item.id) {
                    ref?.close();
                  }
                });
              }}
            >
              <TouchableOpacity
                onLongPress={drag}
                disabled={isActive}
                style={[
                  styles.favoriteItem,
                  isActive && styles.favoriteItemActive
                ]}
                onPress={() => {
                  setActiveMode('new');
                  updateCurrentState('amount', item.amount.toString());
                  updateCurrentState('selectedCategory', categories.find(c => c.name === item.category)?.id || 0);
                  updateCurrentState('note', item.note);
                }}
              >
                <View style={styles.favoriteLeft}>
                  <Text style={styles.favoriteIcon}>{item.categoryIcon}</Text>
                  <View>
                    <Text style={styles.favoriteCategory}>{item.category}</Text>
                    <Text style={styles.favoriteNote}>{item.note}</Text>
                  </View>
                </View>
                <Text style={[
                  styles.favoriteAmount,
                  { color: activeTab === 'income' ? '#4CAF50' : '#dc4446' }
                ]}>
                  {activeTab === 'income' ? '+' : '-'}¥{item.amount}
                </Text>
                <Ionicons name="menu" size={24} color="#666" />
              </TouchableOpacity>
            </Swipeable>
          </Animated.View>
        </ScaleDecorator>
      )}
    />
  );

  // 加载成员数据
  const loadMembers = async () => {
    try {
      const data = await getMembers();
      setMembers(data.map(member => member.name));
    } catch (error) {
      console.error('Failed to load members:', error);
    }
  };

  // 在组件加载时获取成员列表
  useEffect(() => {
    loadMembers();
  }, []);

  // 加载标签
  const loadTags = async () => {
    try {
      const data = await getTags();
      setTags(data);
    } catch (error) {
      console.error('Failed to load tags:', error);
    }
  };

  useEffect(() => {
    loadTags();
  }, []);

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
          ]}>{i18n.t('add.new')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.modeButton, activeMode === 'favorites' && styles.activeModeButton]}
          onPress={() => setActiveMode('favorites')}
        >
          <Text style={[
            styles.modeText,
            activeMode === 'favorites' && styles.activeModeText
          ]}>{i18n.t('add.favorites')}</Text>
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
    gap: 4,
    marginBottom: 20,
  },
  categoryItem: {
    width: '24%',
    aspectRatio: 1,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 15,
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
    width: '100%',
    paddingHorizontal: 2,
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
  favoriteItemActive: {
    backgroundColor: '#f5f5f5',
    transform: [{ scale: 1.05 }],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
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
  refundedContainer: {
    marginBottom: 24,
  },
  refundedOption: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  refundedCheckbox: {
    width: 24,
    height: 24,
    borderWidth: 2,
    borderColor: '#dc4446',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  refundedText: {
    fontSize: 16,
    color: '#333',
  },
  refundedBadge: {
    backgroundColor: '#FFF1F1',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
    marginLeft: 8,
  },
  refundedBadgeText: {
    color: '#dc4446',
    fontSize: 12,
  },
  tagGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 24,
  },
  tagItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  selectedTag: {
    backgroundColor: '#fff1f1',
  },
  tagText: {
    fontSize: 14,
    color: '#666',
  },
});

export default Add;