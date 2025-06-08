import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Platform,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { router } from 'expo-router';
import { Theme } from '../constants/Theme';

interface TabBarProps {
  activeTab: 'list' | 'profile';
  onTabChange: (tab: 'list' | 'profile') => void;
}

const ModernTabBar: React.FC<TabBarProps> = ({ activeTab, onTabChange }) => {
  const tabs = [
    {
      key: 'list',
      icon: 'home',
      activeIcon: 'home',
      label: '首页',
      color: Theme.colors.primary,
    },
    {
      key: 'add',
      icon: 'add',
      activeIcon: 'add',
      label: '添加',
      color: Theme.colors.white,
      isSpecial: true,
    },
    {
      key: 'profile',
      icon: 'person',
      activeIcon: 'person',
      label: '我的',
      color: Theme.colors.primary,
    },
  ];

  const handleTabPress = (tabKey: string) => {
    if (tabKey === 'add') {
      router.push('/screens/addItem');
    } else {
      onTabChange(tabKey as 'list' | 'profile');
    }
  };

  const renderTab = (tab: any, index: number) => {
    const isActive = activeTab === tab.key;
    const isSpecial = tab.isSpecial;

    if (isSpecial) {
      return (
        <TouchableOpacity
          key={tab.key}
          style={styles.specialTab}
          onPress={() => handleTabPress(tab.key)}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={Theme.colors.gradientPrimary}
            style={styles.specialTabGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={tab.icon}
              size={24}
              color={tab.color}
            />
          </LinearGradient>
          <Text style={styles.specialTabText}>{tab.label}</Text>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity
        key={tab.key}
        style={[styles.tab, isActive && styles.activeTab]}
        onPress={() => handleTabPress(tab.key)}
        activeOpacity={0.7}
      >
        <View style={[styles.tabIconContainer, isActive && styles.activeTabIconContainer]}>
          <Ionicons
            name={isActive ? tab.activeIcon : `${tab.icon}-outline`}
            size={22}
            color={isActive ? Theme.colors.primary : Theme.colors.textTertiary}
          />
          {isActive && <View style={styles.activeIndicator} />}
        </View>
        <Text style={[
          styles.tabText,
          isActive && styles.activeTabText
        ]}>
          {tab.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {Platform.OS === 'ios' ? (
        <BlurView intensity={95} tint="light" style={styles.tabBar}>
          <View style={styles.tabBarContent}>
            {tabs.map(renderTab)}
          </View>
        </BlurView>
      ) : (
        <View style={[styles.tabBar, styles.androidTabBar]}>
          <View style={styles.tabBarContent}>
            {tabs.map(renderTab)}
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  
  tabBar: {
    paddingBottom: Platform.OS === 'ios' ? 34 : Theme.spacing.lg,
    paddingTop: Theme.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Theme.colors.border,
  },
  
  androidTabBar: {
    backgroundColor: Theme.colors.surface,
    ...Theme.shadows.medium,
  },
  
  tabBarContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Theme.spacing.lg,
  },
  
  tab: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.xs,
    paddingHorizontal: Theme.spacing.md,
    minWidth: 60,
  },
  
  activeTab: {
    // 活跃状态的额外样式
  },
  
  tabIconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
    position: 'relative',
  },
  
  activeTabIconContainer: {
    // 活跃图标容器样式
  },
  
  activeIndicator: {
    position: 'absolute',
    bottom: -6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Theme.colors.primary,
  },
  
  tabText: {
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textTertiary,
    textAlign: 'center',
  },
  
  activeTabText: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeight.semibold,
  },
  
  specialTab: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  
  specialTabGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
    ...Theme.shadows.medium,
  },
  
  specialTabText: {
    fontSize: Theme.typography.fontSize.xs,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textTertiary,
    textAlign: 'center',
  },
});

export default ModernTabBar;
