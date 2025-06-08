import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Theme } from '../constants/Theme';
import dayjs from 'dayjs';

interface FoodItem {
  id: number;
  name: string;
  quantity: number;
  unit?: string;
  expiry_date?: string;
  date_added: string;
  opened_date?: string;
  storage_type: 'refrigerated' | 'frozen';
  opened_expiry_days?: number;
}

interface ModernFoodCardProps {
  item: FoodItem;
  onPress?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onUse?: () => void;
  onMove?: () => void;
}

const ModernFoodCard: React.FC<ModernFoodCardProps> = ({
  item,
  onPress,
  onEdit,
  onDelete,
  onUse,
  onMove,
}) => {
  // 计算剩余天数或存储天数
  const calculateDaysLeft = (expiryDate?: string, openedDate?: string, openedExpiryDays?: number) => {
    if (!expiryDate) return null;

    const now = dayjs();
    let targetDate = dayjs(expiryDate);

    // 如果有拆封日期和拆封后保质期，使用更短的那个
    if (openedDate && openedExpiryDays) {
      const openedExpiryDate = dayjs(openedDate).add(openedExpiryDays, 'day');
      if (openedExpiryDate.isBefore(targetDate)) {
        targetDate = openedExpiryDate;
      }
    }

    return targetDate.diff(now, 'day');
  };

  const calculateDaysStored = (dateAdded: string) => {
    return dayjs().diff(dayjs(dateAdded), 'day');
  };

  // 获取状态颜色和图标
  const getStatusInfo = () => {
    if (item.storage_type === 'refrigerated') {
      // 冷藏物品显示剩余天数
      const daysRemaining = calculateDaysLeft(item.expiry_date, item.opened_date, item.opened_expiry_days);

      if (daysRemaining === null) {
        return {
          color: Theme.colors.textTertiary,
          backgroundColor: Theme.colors.backgroundSecondary,
          icon: 'time-outline',
          text: '无期限',
        };
      }

      if (daysRemaining <= 0) {
        return {
          color: Theme.colors.error,
          backgroundColor: Theme.colors.errorAlpha,
          icon: 'warning',
          text: daysRemaining === 0 ? '今天到期' : `过期${Math.abs(daysRemaining)}天`,
        };
      }

      if (daysRemaining <= 3) {
        return {
          color: Theme.colors.warning,
          backgroundColor: Theme.colors.warningAlpha,
          icon: 'alert',
          text: `${daysRemaining}天`,
        };
      }

      return {
        color: Theme.colors.success,
        backgroundColor: Theme.colors.successAlpha,
        icon: 'checkmark-circle',
        text: `${daysRemaining}天`,
      };
    } else {
      // 冷冻物品显示已存入天数
      const daysStored = calculateDaysStored(item.date_added);
      return {
        color: Theme.colors.primary,
        backgroundColor: Theme.colors.primaryAlpha,
        icon: 'snow',
        text: `${daysStored}天`,
      };
    }
  };

  const statusInfo = getStatusInfo();

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View style={styles.card}>
        {/* 左侧状态指示器 */}
        <View style={styles.leftSection}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.backgroundColor }]}>
            <Ionicons
              name={statusInfo.icon as any}
              size={20}
              color={statusInfo.color}
            />
          </View>
          <Text style={[styles.statusText, { color: statusInfo.color }]}>
            {statusInfo.text}
          </Text>
        </View>

        {/* 中间内容区域 */}
        <View style={styles.contentSection}>
          <View style={styles.nameRow}>
            <Text style={styles.itemName} numberOfLines={1}>
              {item.name}
            </Text>
            <Text style={styles.itemQuantity}>
              {item.quantity}{item.unit || '个'}
            </Text>
          </View>
          
          <Text style={styles.itemDate}>
            存入: {dayjs(item.date_added).format('MM/DD')}
            {item.expiry_date && ` • 到期: ${dayjs(item.expiry_date).format('MM/DD')}`}
          </Text>
        </View>

        {/* 右侧操作区域 */}
        <View style={styles.actionsSection}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onUse}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="remove-circle-outline"
              size={22}
              color={Theme.colors.primary}
            />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.actionButton}
            onPress={onMove}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Ionicons
              name="swap-horizontal-outline"
              size={22}
              color={Theme.colors.secondary}
            />
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: Theme.spacing.lg,
    marginVertical: Theme.spacing.xs,
  },
  
  card: {
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.xl,
    padding: Theme.spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    ...Theme.shadows.small,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Theme.colors.border,
  },
  
  leftSection: {
    alignItems: 'center',
    marginRight: Theme.spacing.md,
    minWidth: 60,
  },
  
  statusBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Theme.spacing.xs,
  },
  
  statusText: {
    fontSize: Theme.typography.fontSize.sm,
    fontWeight: Theme.typography.fontWeight.semibold,
    textAlign: 'center',
  },
  
  contentSection: {
    flex: 1,
    marginRight: Theme.spacing.md,
  },
  
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Theme.spacing.xs,
  },
  
  itemName: {
    fontSize: Theme.typography.fontSize.xl,
    fontWeight: Theme.typography.fontWeight.semibold,
    color: Theme.colors.textPrimary,
    flex: 1,
    marginRight: Theme.spacing.sm,
  },
  
  itemQuantity: {
    fontSize: Theme.typography.fontSize.md,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textSecondary,
    backgroundColor: Theme.colors.backgroundSecondary,
    paddingHorizontal: Theme.spacing.sm,
    paddingVertical: Theme.spacing.xs,
    borderRadius: Theme.borderRadius.md,
  },
  
  itemDate: {
    fontSize: Theme.typography.fontSize.md,
    color: Theme.colors.textTertiary,
  },
  
  actionsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Theme.spacing.sm,
  },
  
  actionButton: {
    padding: Theme.spacing.sm,
  },
});

export default ModernFoodCard;
