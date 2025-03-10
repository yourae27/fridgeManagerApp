import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, TextInput, RefreshControl, ActivityIndicator, Alert, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { getFoodItems, deleteFoodItem, updateFoodItem, getWarningDays, addFoodItem, getFavoriteItems } from './constants/Storage';
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
  const handleDelete = (id: number) => {
    Alert.alert(
      '确认删除',
      '确定要丢弃这个物品吗？',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: async () => {
            try {
              await deleteFoodItem(id);
              triggerRefresh();
            } catch (error) {
              console.error('删除失败:', error);
              Alert.alert('错误', '删除失败，请重试');
            }
          }
        }
      ]
    );
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
    // 根据存储类型不同计算显示的天数
    let daysText = '';
    let circleColor = '';

    if (item.storage_type === 'refrigerated') {
      // 冷藏物品显示剩余天数
      const remainingDays = calculateDaysLeft(item.expiry_date, item.opened_date, item.opened_expiry_days);
      const isExpired = remainingDays !== null && remainingDays <= 0;
      const isWarning = warningDays && remainingDays !== null && remainingDays <= warningDays && remainingDays > 0;

      if (remainingDays !== null) {
        daysText = isExpired ? '已过期' : `${remainingDays}天`;
        // 根据剩余天数设置圆圈颜色
        circleColor = isExpired ? '#dc4446' : isWarning ? '#ff9500' : '#4CAF50';
      }
    } else {
      // 冷冻物品显示已存入天数
      const daysStored = calculateDaysStored(item.date_added);
      daysText = `${daysStored}天`;
      circleColor = '#5AC8FA'; // 冰蓝色
    }

    // 获取对应的图标
    let iconName = 'nutrition-outline';
    if (item.name.includes('牛奶') || item.name.includes('奶')) {
      iconName = 'cafe-outline';
    } else if (item.name.includes('肉')) {
      iconName = 'restaurant-outline';
    } else if (item.name.includes('鱼')) {
      iconName = 'fish-outline';
    }

    return (
      <View style={styles.itemCard}>
        <View style={styles.itemMain}>
          {/* 左侧图标和天数 */}
          <View style={styles.itemLeft}>
            <View style={[styles.iconCircle, { borderColor: circleColor }]}>
              <Ionicons name={iconName as any} size={20} color={circleColor} />
            </View>
            <Text style={[styles.daysText, { color: circleColor }]}>{daysText}</Text>
          </View>

          {/* 中间内容区 */}
          <View style={styles.itemContent}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemDate}>
              存入: {dayjs(item.date_added).format('YYYY-MM-DD')}
              {item.expiry_date && ` 到期: ${dayjs(item.expiry_date).format('YYYY-MM-DD')}`}
            </Text>
          </View>
        </View>

        {/* 底部操作区 */}
        <View style={styles.itemActions}>
          <TouchableOpacity onPress={() => handleEdit(item)}>
            <Ionicons name="pencil-outline" size={20} color="#666" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handleDelete(item.id)}>
            <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handlePartialMove(item)}>
            <Ionicons
              name={item.storage_type === 'refrigerated' ? 'snow-outline' : 'thermometer-outline'}
              size={20}
              color="#5AC8FA"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => handlePartialUse(item)}>
            <Ionicons name="checkmark-circle-outline" size={20} color="#4CAF50" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {mainTab === 'list' ? (
        <>
          {/* 搜索栏 */}
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Ionicons name="search-outline" size={20} color="#999" />
              <TextInput
                style={styles.searchInput}
                placeholder="搜索食材"
                value={searchText}
                onChangeText={setSearchText}
              />
            </View>
          </View>

          {/* 标签栏 */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'refrigerated' && styles.activeTab]}
              onPress={() => setActiveTab('refrigerated')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'refrigerated' && styles.activeTabText
              ]}>冷藏</Text>
              {activeTab === 'refrigerated' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'frozen' && styles.activeTab]}
              onPress={() => setActiveTab('frozen')}
            >
              <Text style={[
                styles.tabText,
                activeTab === 'frozen' && styles.activeTabText
              ]}>冷冻</Text>
              {activeTab === 'frozen' && <View style={styles.tabIndicator} />}
            </TouchableOpacity>
          </View>

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
      <View style={styles.bottomNavigation}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setMainTab('list')}
        >
          <Ionicons
            name="list-outline"
            size={24}
            color={mainTab === 'list' ? '#4A90E2' : '#999'}
          />
          <Text style={[
            styles.navText,
            mainTab === 'list' && { color: '#4A90E2' }
          ]}>列表</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => router.push('/screens/addItem')}
        >
          <Ionicons name="add" size={24} color="#666" />
          <Text style={styles.navText}>添加</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setMainTab('profile')}
        >
          <Ionicons
            name="person-outline"
            size={24}
            color={mainTab === 'profile' ? '#4A90E2' : '#999'}
          />
          <Text style={[
            styles.navText,
            mainTab === 'profile' && { color: '#4A90E2' }
          ]}>我的</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
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
    padding: 12,
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
  itemName: {
    fontSize: 17,
    fontWeight: '500',
    color: '#000',
    marginBottom: 4,
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
    padding: 16,
    backgroundColor: '#f5f5f5',
  },
  settingItem: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  settingInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  settingInput: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 12,
    fontSize: 16,
  },
  saveButton: {
    backgroundColor: '#4A90E2',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '500',
  },
  settingDescription: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
});

export default App;

