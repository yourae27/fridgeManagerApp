import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, TextInput, StyleSheet, ScrollView, Platform, Button } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router, useRootNavigationState } from 'expo-router';
import { addFavorite, addTransaction, getFavorites, deleteFavorite, updateTransaction, getCategories } from '../constants/Storage';
import { Swipeable } from 'react-native-gesture-handler';
import { useTransactionContext } from '../context/TransactionContext';
import { Category } from './categories';
import { useCategoryContext } from '../context/CategoryContext';
import DatePicker from 'react-native-date-picker';
import i18n from '../i18n';

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
  const [amount, setAmount] = useState('0.00');
  const [selectedCategory, setSelectedCategory] = useState(0);
  const [note, setNote] = useState('');
  // 收藏记录状态
  const [favorites, setFavorites] = useState<FavoriteRecord[]>([]);
  const { triggerRefresh } = useTransactionContext();
  const swipeableRefs = useRef<{ [key: number]: Swipeable | null }>({});
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const { refreshTrigger } = useCategoryContext();
  const [excludeFromStats, setExcludeFromStats] = useState(false);

  // 从路由参数中获取编辑数据和初始标签
  const { routes } = useRootNavigationState();
  const params = routes[1].params;
  const isEditing = params?.mode === 'edit';

  // 设置初始标签
  useEffect(() => {
    if (params?.initialTab) {
      setActiveTab(params.initialTab as 'income' | 'expense');
    }
  }, [params?.initialTab]);

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
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return;

    try {
      await addFavorite({
        type: activeTab,
        amount: parseFloat(amount),
        category: category.name,
        categoryIcon: category.icon,
        note,
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

  // const renderDatePicker = () => {
  //   if (!showDatePicker) return null;

  //   return (
  //     // <DatePicker
  //     //   modal
  //     //   open={showDatePicker}
  //     //   date={selectedDate}
  //     //   onConfirm={(date) => {
  //     //     setShowDatePicker(false)
  //     //     setSelectedDate(date)
  //     //   }}
  //     //   onCancel={() => {
  //     //     setShowDatePicker(false)
  //     //   }}
  //     // />
  //     <DatePicker date={selectedDate} onDateChange={setSelectedDate} />
  //   );
  // };

  // 修改保存函数，使用正确的日期格式
  const saveTransaction = async () => {
    const category = categories.find(c => c.id === selectedCategory);
    if (!category) return;

    try {
      const transactionAmount = parseFloat(amount);
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
          note,
          date: formattedDate,
          excludeFromStats,
        });
      } else {
        await addTransaction({
          type: activeTab,
          amount: finalAmount,
          category: category.name,
          categoryIcon: category.icon,
          note,
          date: formattedDate,
          excludeFromStats,
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

  const renderCreateNew = () => (
    <ScrollView style={styles.scrollView}>
      {/* 金额输入 */}
      <View style={styles.amountContainer}>
        <Text style={styles.currencySymbol}>¥</Text>
        <TextInput
          style={styles.amountInput}
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          onFocus={() => amount === '0.00' && setAmount('')}
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
              selectedCategory === category.id && styles.selectedCategory
            ]}
            onPress={() => setSelectedCategory(category.id)}
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
      {/* <Text style={styles.sectionTitle}>Date</Text>
      <TouchableOpacity
        style={styles.dateButton}
        onPress={() => setShowDatePicker(true)}
      >
        <Text style={styles.dateText}>{formatDate(selectedDate)}</Text>
        <Ionicons name="calendar-outline" size={20} color="#666" />
      </TouchableOpacity> */}

      {/* <DatePicker date={selectedDate} onDateChange={setSelectedDate} /> */}
      <>
        <Button title="Open" onPress={() => setShowDatePicker(true)} />
        <DatePicker
          modal
          open={showDatePicker}
          date={selectedDate}
          onConfirm={(date) => {
            setShowDatePicker(false)
            setSelectedDate(date)
          }}
          onCancel={() => {
            setShowDatePicker(false)
          }}
        />
      </>

      {/* iOS 显示内联日期选择器 */}
      {/* {Platform.OS === 'ios' && showDatePicker && (
        <View style={styles.datePickerContainer}>
          {renderDatePicker()}
          <View style={styles.datePickerButtons}>
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      )} */}

      {/* Android 显示模态日期选择器 */}
      {/* {Platform.OS === 'android' && showDatePicker && renderDatePicker()} */}

      {/* 备注输入 */}
      <Text style={styles.sectionTitle}>{i18n.t('common.note')}</Text>
      <TextInput
        style={styles.noteInput}
        placeholder={i18n.t('common.note')}
        value={note}
        onChangeText={setNote}
        multiline
      />

      {/* 不计入月度收支选项 */}
      <TouchableOpacity
        style={styles.excludeOption}
        onPress={() => setExcludeFromStats(!excludeFromStats)}
      >
        <View style={styles.excludeCheckbox}>
          {excludeFromStats && (
            <Ionicons name="checkmark" size={16} color="#dc4446" />
          )}
        </View>
        <Text style={styles.excludeText}>{i18n.t('add.excludeFromStats')}</Text>
      </TouchableOpacity>

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
              setAmount(favorite.amount.toString());
              setSelectedCategory(categories.find(c => c.name === favorite.category)?.id || 0);
              setNote(favorite.note);
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
              { color: favorite.amount > 0 ? '#4CAF50' : '#dc4446' }
            ]}>
              {favorite.amount > 0 ? '+' : '-'}¥{favorite.amount}
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
      if (showDatePicker && Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
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
});

export default Add;