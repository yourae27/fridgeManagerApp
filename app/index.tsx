import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, RefreshControl, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getFoodItems, deleteFoodItem, updateFoodItem, getWarningDays, addFoodItem, getFavoriteItems, addHistory } from './constants/Storage';
import { useFoodContext } from './context/FoodContext';
import dayjs from 'dayjs';
import PartialUseModal from './components/PartialUseModal';
import EmptyState from './components/EmptyState';
import ModernTabBar from './components/ModernTabBar';
import ModernSearchBar from './components/ModernSearchBar';
import ModernSegmentedControl from './components/ModernSegmentedControl';
import ModernFoodCard from './components/ModernFoodCard';
import { Theme } from './constants/Theme';
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
  // 新增主 tab 状态
  const [mainTab, setMainTab] = useState<'list' | 'profile'>('list');

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

  // 从 Profile 页面移植过来的状态和函数
  const [warningDaysInput, setWarningDaysInput] = useState('');

  useEffect(() => {
    const loadWarningDaysForProfile = async () => {
      try {
        const days = await getWarningDays();
        setWarningDaysInput(days.toString());
      } catch (error) {
        console.error('获取警示时长失败:', error);
      }
    };

    if (mainTab === 'profile') {
      loadWarningDaysForProfile();
    }
  }, [mainTab]);

  const handleWarningDaysUpdate = async () => {
    const days = parseInt(warningDaysInput);
    if (isNaN(days) || days < 0) {
      Alert.alert('错误', '请输入有效的天数');
      return;
    }

    try {
      await setWarningDays(days);
      Alert.alert('成功', '警示时长已更新');
      triggerRefresh();
    } catch (error) {
      console.error('更新警示时长失败:', error);
      Alert.alert('错误', '更新失败，请重试');
    }
  };

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
    const addedDate = dayjs(dateAdded);
    const today = dayjs();
    return today.diff(addedDate, 'day');
  };

  // 处理删除
  const handleDelete = async (id: number) => {
    try {
      const item = foodItems.find(item => item.id === id);
      if (item) {
        await addHistory({
          action_type: 'discard',
          item_name: item.name,
          quantity: item.quantity,
          unit: item.unit,
          storage_type: item.storage_type,
          action_date: new Date().toISOString()
        });
      }
      await deleteFoodItem(id);
      triggerRefresh();
    } catch (error) {
      console.error('删除失败:', error);
      Alert.alert('错误', '删除失败，请重试');
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
      await addHistory({
        action_type: partialUseType === 'use' ? 'use' : 'move',
        item_name: selectedItem.name,
        quantity: quantity,
        unit: selectedItem.unit,
        storage_type: selectedItem.storage_type,
        action_date: new Date().toISOString()
      });

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
      Alert.alert('错误', '操作失败，请重试');
    }
  };

  // 渲染个人中心内容
  const renderProfile = () => {
    return (
      <ScrollView style={styles.profileContainer}>
        {/* 警示时长设置 */}
        <View style={styles.settingItem}>
          <Text style={styles.settingLabel}>警示时长（天）</Text>
          <View style={styles.settingInputContainer}>
            <TextInput
              style={styles.settingInput}
              value={warningDaysInput}
              onChangeText={setWarningDaysInput}
              keyboardType="numeric"
              placeholder="请输入天数"
            />
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleWarningDaysUpdate}
            >
              <Text style={styles.saveButtonText}>保存</Text>
            </TouchableOpacity>
          </View>
          <Text style={styles.settingDescription}>
            当食品保质期剩余天数小于警示时长时，将会显示提醒
          </Text>
        </View>

        {/* 常买清单入口 */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/screens/favorites')}
        >
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>常买清单</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>

        {/* 历史记录入口 */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => router.push('/screens/history')}
        >
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>历史记录</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>

        {/* 评价应用 */}
        <TouchableOpacity
          style={styles.settingItem}
          onPress={() => {
            Alert.alert('提示', '感谢您的支持！');
          }}
        >
          <View style={styles.settingRow}>
            <Text style={styles.settingLabel}>评价应用</Text>
            <Ionicons name="chevron-forward" size={20} color="#999" />
          </View>
        </TouchableOpacity>
      </ScrollView>
    );
  };

  // 渲染物品
  const renderItem = ({ item }: { item: FoodItem }) => {
    return (
      <ModernFoodCard
        item={item}
        onPress={() => handleEdit(item)}
        onUse={() => handlePartialUse(item)}
        onMove={() => handlePartialMove(item)}
      />
    );
  };

  return (
    <View style={styles.container}>
      {mainTab === 'list' ? (
        <>
          {/* 搜索栏 */}
          <ModernSearchBar
            value={searchText}
            onChangeText={setSearchText}
            placeholder="搜索食材..."
          />

          {/* 标签栏 */}
          <ModernSegmentedControl
            segments={[
              { key: 'refrigerated', label: '冷藏' },
              { key: 'frozen', label: '冷冻' },
            ]}
            activeSegment={activeTab}
            onSegmentChange={(key) => setActiveTab(key as 'refrigerated' | 'frozen')}
          />

          <FlatList
            data={foodItems}
            renderItem={renderItem}
            keyExtractor={item => item.id.toString()}
            contentContainerStyle={styles.listContainer}
            refreshControl={
              <RefreshControl
                refreshing={isLoading}
                onRefresh={loadFoodItems}
              />
            }
            ListEmptyComponent={
              isLoading ? null : (
                <EmptyState
                  icon="snow-outline"
                  title={activeTab === 'refrigerated' ? '冷藏空空如也' : '冷冻空空如也'}
                  description={activeTab === 'refrigerated' ? '快去添加食材吧' : '快去添加食材吧'}
                />
              )
            }
          />

          {/* 部分使用模态框 */}
          <PartialUseModal
            visible={partialUseModalVisible}
            onClose={() => setPartialUseModalVisible(false)}
            onConfirm={handlePartialConfirm}
            maxQuantity={selectedItem?.quantity || 0}
            title={partialUseType === 'use' ? '使用部分数量' : '移动部分数量'}
            unit={selectedItem?.unit || undefined}
          />
        </>
      ) : (
        // 个人中心内容
        renderProfile()
      )}

      {/* 底部导航栏 */}
      <ModernTabBar
        activeTab={mainTab}
        onTabChange={setMainTab}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  searchContainer: {
    padding: 16,
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: 'white',
    paddingTop: 8,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    position: 'relative',
  },
  activeTab: {
    borderBottomWidth: 0,
  },
  tabIndicator: {
    position: 'absolute',
    bottom: 0,
    left: '25%',
    right: '25%',
    height: 3,
    backgroundColor: '#4A90E2',
    borderRadius: 1.5,
  },
  tabText: {
    fontSize: 16,
    color: '#666',
  },
  activeTabText: {
    color: '#4A90E2',
    fontWeight: '500',
  },
  listContainer: {
    paddingBottom: Theme.layout.tabBarHeight + Theme.spacing.lg,
  },
  itemCard: {
    backgroundColor: 'white',
    marginBottom: 8,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  itemMain: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemLeft: {
    alignItems: 'center',
    marginRight: 12,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
    backgroundColor: 'white',
  },
  daysText: {
    fontSize: 13,
    fontWeight: '500',
  },
  itemContent: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
    flex: 1, // 让名称可以占据剩余空间
  },
  itemQuantity: {
    fontSize: 15,
    color: '#666',
    marginLeft: 8,
  },
  itemDate: {
    fontSize: 15,
    color: '#999',
  },
  itemActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    gap: 20,
  },
  bottomNavigation: {
    flexDirection: 'row',
    height: 56,
    backgroundColor: 'white',
    borderTopWidth: 1,
    borderTopColor: '#eee',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  navItem: {
    alignItems: 'center',
    width: 80,
  },
  addButton: {
    alignItems: 'center',
    width: 80,
  },
  navText: {
    fontSize: 12,
    marginTop: 4,
    color: '#999',
  },
  profileContainer: {
    flex: 1,
    padding: Theme.spacing.lg,
    backgroundColor: Theme.colors.background,
    paddingBottom: Theme.layout.tabBarHeight + Theme.spacing.lg,
  },
  settingItem: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    marginBottom: Theme.spacing.lg,
    ...Theme.shadows.small,
  },
  settingLabel: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textPrimary,
    marginBottom: Theme.spacing.md,
  },
  settingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Theme.spacing.sm,
  },
  settingInput: {
    flex: 1,
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Theme.spacing.md,
    marginRight: Theme.spacing.md,
    fontSize: Theme.typography.fontSize.lg,
    color: Theme.colors.textPrimary,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  saveButton: {
    backgroundColor: Theme.colors.primary,
    borderRadius: Theme.borderRadius.md,
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    ...Theme.shadows.small,
  },
  saveButtonText: {
    color: Theme.colors.white,
    fontSize: Theme.typography.fontSize.md,
    fontWeight: Theme.typography.fontWeight.semibold,
  },
  settingDescription: {
    fontSize: Theme.typography.fontSize.md,
    color: Theme.colors.textSecondary,
    lineHeight: Theme.typography.lineHeight.relaxed * Theme.typography.fontSize.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default App;

