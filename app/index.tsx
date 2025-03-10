import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, RefreshControl, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getFoodItems, deleteFoodItem, updateFoodItem, getWarningDays, addFoodItem } from './constants/Storage';
import { useFoodContext } from './context/FoodContext';
import dayjs from 'dayjs';
import PartialUseModal from './components/PartialUseModal';
import EmptyState from './components/EmptyState';
import i18n from './i18n';

interface FoodItem {
  id: number;
  name: string;
  quantity: number | null;
  unit: string | null;
  storage_type: 'refrigerated' | 'frozen';
  date_added: string;
  expiry_date: string | null;
  opened_date: string | null;
  opened_expiry_days: number | null;
  expiry_days: number | null;
}

const App = () => {
  // 状态管理
  const [activeTab, setActiveTab] = useState<'refrigerated' | 'frozen'>('refrigerated');
  const [searchText, setSearchText] = useState('');
  const [foodItems, setFoodItems] = useState<FoodItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [warningDays, setWarningDays] = useState(3);

  // 模态框状态
  const [partialUseModalVisible, setPartialUseModalVisible] = useState(false);
  const [selectedItem, setSelectedItem] = useState<FoodItem | null>(null);
  const [partialUseType, setPartialUseType] = useState<'use' | 'move'>('use');

  const { refreshTrigger, triggerRefresh } = useFoodContext();

  // 加载食品数据
  const loadFoodItems = async () => {
    try {
      setIsLoading(true);
      const items = await getFoodItems(activeTab, searchText);
      setFoodItems(items as FoodItem[]);
    } catch (error) {
      console.error('加载食品失败:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  // 加载警示天数
  const loadWarningDays = async () => {
    try {
      const days = await getWarningDays();
      setWarningDays(days);
    } catch (error) {
      console.error('加载警示天数失败:', error);
    }
  };

  // 监听标签变化和刷新
  useEffect(() => {
    loadFoodItems();
  }, [activeTab, searchText, refreshTrigger]);

  // 初始加载警示天数
  useEffect(() => {
    loadWarningDays();
  }, []);

  // 计算剩余天数
  const calculateDaysLeft = (expiryDate: string | null, openedDate: string | null, openedExpiryDays: number | null) => {
    if (!expiryDate && !openedDate) return null;

    const today = dayjs();
    let targetDate;

    if (openedDate && openedExpiryDays) {
      // 如果已拆封，计算拆封后的到期日
      targetDate = dayjs(openedDate).add(openedExpiryDays, 'day');
    } else if (expiryDate) {
      // 否则使用到期日
      targetDate = dayjs(expiryDate);
    } else {
      return null;
    }

    return targetDate.diff(today, 'day');
  };

  // 计算存放天数（冷冻食品）
  const calculateDaysStored = (dateAdded: string) => {
    const today = dayjs();
    const addedDate = dayjs(dateAdded);
    return today.diff(addedDate, 'day');
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      await deleteFoodItem(id);
      triggerRefresh();
    } catch (error) {
      console.error('删除食品失败:', error);
    }
  };

  // 处理编辑
  const handleEdit = (item: FoodItem) => {
    router.push({
      pathname: '/screens/addItem',
      params: {
        mode: 'edit',
        ...item
      }
    });
  };

  // 处理部分使用
  const handlePartialUse = (item: FoodItem) => {
    setSelectedItem(item);
    setPartialUseType('use');
    setPartialUseModalVisible(true);
  };

  // 处理部分移动（冷藏到冷冻或冷冻到冷藏）
  const handlePartialMove = (item: FoodItem) => {
    setSelectedItem(item);
    setPartialUseType('move');
    setPartialUseModalVisible(true);
  };

  // 确认部分使用/移动
  const handlePartialConfirm = async (quantity: number) => {
    if (!selectedItem) return;

    try {
      if (partialUseType === 'use') {
        // 部分使用，更新原数量
        const newQuantity = (selectedItem.quantity || 0) - quantity;
        if (newQuantity <= 0) {
          // 如果全部使用，删除该项
          await deleteFoodItem(selectedItem.id);
        } else {
          // 否则更新数量
          await updateFoodItem(selectedItem.id, { quantity: newQuantity });
        }
      } else if (partialUseType === 'move') {
        // 部分移动到另一种存储类型
        // 1. 减少原数量
        const newQuantity = (selectedItem.quantity || 0) - quantity;
        if (newQuantity <= 0) {
          // 如果全部移动，更新存储类型
          await updateFoodItem(selectedItem.id, {
            storage_type: selectedItem.storage_type === 'refrigerated' ? 'frozen' : 'refrigerated',
            quantity: quantity
          });
        } else {
          // 否则保留部分在原存储，并新增到另一个存储
          await updateFoodItem(selectedItem.id, { quantity: newQuantity });

          // 在另一个存储中创建新条目
          await addFoodItem({
            name: selectedItem.name,
            quantity: quantity,
            unit: selectedItem.unit || undefined,
            storage_type: selectedItem.storage_type === 'refrigerated' ? 'frozen' : 'refrigerated',
            date_added: new Date().toISOString().split('T')[0],
            expiry_date: selectedItem.expiry_date || undefined,
            opened_date: selectedItem.opened_date || undefined,
            opened_expiry_days: selectedItem.opened_expiry_days || undefined,
            expiry_days: selectedItem.expiry_days || undefined
          });
        }
      }
      triggerRefresh();
    } catch (error) {
      console.error('操作失败:', error);
    }
  };

  // 渲染食品项
  const renderFoodItem = ({ item }: { item: FoodItem }) => {
    const daysLeft = activeTab === 'refrigerated'
      ? calculateDaysLeft(item.expiry_date, item.opened_date, item.opened_expiry_days)
      : null;

    const daysStored = activeTab === 'frozen'
      ? calculateDaysStored(item.date_added)
      : null;

    const isWarning = daysLeft !== null && daysLeft <= warningDays;

    return (
      <View style={styles.foodItem}>
        {/* 左侧状态指示器 */}
        <View style={[
          styles.statusIndicator,
          activeTab === 'refrigerated'
            ? (isWarning ? styles.warningIndicator : styles.safeIndicator)
            : styles.frozenIndicator
        ]}>
          <Text style={styles.daysText}>
            {activeTab === 'refrigerated'
              ? (daysLeft !== null ? `${daysLeft}天` : '未知')
              : (daysStored !== null ? `${daysStored}天` : '未知')}
          </Text>
        </View>

        {/* 中间信息区 */}
        <View style={styles.foodInfo}>
          <Text style={styles.foodName}>{item.name}</Text>

          {item.quantity && (
            <Text style={styles.foodQuantity}>{item.quantity} {item.unit || ''}</Text>
          )}

          <View style={styles.dateInfo}>
            <Text style={styles.foodDate}>存入: {dayjs(item.date_added).format('YYYY-MM-DD')}</Text>

            {activeTab === 'refrigerated' && item.expiry_date && (
              <Text style={styles.foodDate}>到期: {item.expiry_date}</Text>
            )}

            {activeTab === 'refrigerated' && item.opened_date && (
              <Text style={styles.foodDate}>拆封: {item.opened_date}</Text>
            )}
          </View>
        </View>

        {/* 右侧操作区 */}
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.actionButton} onPress={() => handleEdit(item)}>
            <Ionicons name="pencil" size={18} color="#4A90E2" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash" size={18} color="#FF3B30" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handlePartialMove(item)}>
            <Ionicons
              name={activeTab === 'refrigerated' ? 'snow' : 'thermometer'}
              size={18}
              color="#4A90E2"
            />
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={() => handlePartialUse(item)}>
            <Ionicons name="checkmark-circle" size={18} color="#4CD964" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // 渲染空状态
  const renderEmptyState = () => {
    if (isLoading) {
      return (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color="#4A90E2" />
          <Text style={styles.emptyText}>加载中...</Text>
        </View>
      );
    }

    return (
      <EmptyState
        icon={activeTab === 'refrigerated' ? 'thermometer-outline' : 'snow-outline'}
        title={`冰箱${activeTab === 'refrigerated' ? '冷藏室' : '冷冻室'}空空如也`}
        description="点击底部的+按钮添加食材"
      />
    );
  };

  // 刷新处理
  const handleRefresh = () => {
    setIsRefreshing(true);
    loadFoodItems();
  };

  const renderBottomNavbar = () => (
    <View style={styles.navbar}>
      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/')}
      >
        <Ionicons
          name="home"
          size={24}
          color="#4A90E2"
        />
        <Text style={[styles.navText, { color: '#4A90E2' }]}>首页</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.navItem}
        onPress={() => router.push('/screens/profile')}
      >
        <Ionicons
          name="person"
          size={24}
          color="#999"
        />
        <Text style={styles.navText}>我的</Text>
      </TouchableOpacity>
    </View>
  );

  const handleAddItem = () => {
    router.push('/screens/addItem');
  };

  return (
    <View style={styles.container}>
      {/* 搜索框 */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#666" />
        <TextInput
          style={styles.searchInput}
          placeholder="搜索冰箱中的食材..."
          value={searchText}
          onChangeText={setSearchText}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#666" />
          </TouchableOpacity>
        ) : null}
      </View>

      {/* 冷藏/冷冻切换标签 */}
      <View style={styles.tabs}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'refrigerated' && styles.activeTab]}
          onPress={() => setActiveTab('refrigerated')}
        >
          <Ionicons
            name="thermometer-outline"
            size={20}
            color={activeTab === 'refrigerated' ? '#4A90E2' : '#999'}
          />
          <Text
            style={[styles.tabText, activeTab === 'refrigerated' && styles.activeTabText]}
          >
            冷藏
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'frozen' && styles.activeTab]}
          onPress={() => setActiveTab('frozen')}
        >
          <Ionicons
            name="snow-outline"
            size={20}
            color={activeTab === 'frozen' ? '#4A90E2' : '#999'}
          />
          <Text
            style={[styles.tabText, activeTab === 'frozen' && styles.activeTabText]}
          >
            冷冻
          </Text>
        </TouchableOpacity>
      </View>

      {/* 食品列表 */}
      <FlatList
        data={foodItems}
        renderItem={renderFoodItem}
        keyExtractor={item => item.id.toString()}
        contentContainerStyle={styles.list}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            colors={['#4A90E2']}
          />
        }
      />

      {/* 浮动添加按钮 */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={handleAddItem}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>

      {/* 底部导航栏 */}
      {renderBottomNavbar()}

      {/* 部分使用/移动模态框 */}
      {selectedItem && (
        <PartialUseModal
          visible={partialUseModalVisible}
          onClose={() => setPartialUseModalVisible(false)}
          onConfirm={handlePartialConfirm}
          maxQuantity={selectedItem.quantity || 0}
          title={
            partialUseType === 'use'
              ? '使用部分数量'
              : (activeTab === 'refrigerated' ? '放入冷冻' : '放入冷藏')
          }
          unit={selectedItem.unit || undefined}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 20,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginHorizontal: 16,
    marginVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  tabs: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
    padding: 4,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    gap: 6,
  },
  activeTab: {
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabText: {
    fontSize: 16,
    color: '#999',
  },
  activeTabText: {
    fontWeight: '500',
    color: '#4A90E2',
  },
  list: {
    paddingHorizontal: 16,
    paddingBottom: 80,
  },
  foodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statusIndicator: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  safeIndicator: {
    borderColor: '#4CD964',
  },
  warningIndicator: {
    borderColor: '#FF3B30',
  },
  frozenIndicator: {
    borderColor: '#5AC8FA',
  },
  daysText: {
    fontSize: 12,
    fontWeight: '500',
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 4,
  },
  foodQuantity: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  dateInfo: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  foodDate: {
    fontSize: 12,
    color: '#999',
  },
  actionButtons: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f5f5f5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 100,
  },
  emptyText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4A90E2',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#4A90E2',
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
});

export default App;
