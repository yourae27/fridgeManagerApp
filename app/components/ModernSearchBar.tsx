import React, { useState, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Theme } from '../constants/Theme';

interface ModernSearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  onFocus?: () => void;
  onBlur?: () => void;
}

const ModernSearchBar: React.FC<ModernSearchBarProps> = ({
  value,
  onChangeText,
  placeholder = '搜索食材...',
  onFocus,
  onBlur,
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const animatedValue = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  const handleFocus = () => {
    setIsFocused(true);
    onFocus?.();
    
    Animated.timing(animatedValue, {
      toValue: 1,
      duration: Theme.animations.duration.normal,
      useNativeDriver: false,
    }).start();
  };

  const handleBlur = () => {
    setIsFocused(false);
    onBlur?.();
    
    Animated.timing(animatedValue, {
      toValue: 0,
      duration: Theme.animations.duration.normal,
      useNativeDriver: false,
    }).start();
  };

  const handleClear = () => {
    onChangeText('');
    inputRef.current?.focus();
  };

  const borderColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Theme.colors.border, Theme.colors.primary],
  });

  const backgroundColor = animatedValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Theme.colors.backgroundSecondary, Theme.colors.surface],
  });

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.searchContainer,
          {
            borderColor,
            backgroundColor,
            ...Platform.select({
              ios: Theme.shadows.small,
              android: {
                elevation: isFocused ? 4 : 2,
              },
            }),
          },
        ]}
      >
        <Ionicons
          name="search-outline"
          size={20}
          color={isFocused ? Theme.colors.primary : Theme.colors.textTertiary}
          style={styles.searchIcon}
        />
        
        <TextInput
          ref={inputRef}
          style={styles.searchInput}
          placeholder={placeholder}
          placeholderTextColor={Theme.colors.textTertiary}
          value={value}
          onChangeText={onChangeText}
          onFocus={handleFocus}
          onBlur={handleBlur}
          returnKeyType="search"
          clearButtonMode="never" // 我们使用自定义清除按钮
        />
        
        {value.length > 0 && (
          <TouchableOpacity
            style={styles.clearButton}
            onPress={handleClear}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons
              name="close-circle"
              size={18}
              color={Theme.colors.textTertiary}
            />
          </TouchableOpacity>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.md,
    backgroundColor: Theme.colors.surface,
  },
  
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Theme.spacing.md,
    paddingVertical: Platform.OS === 'ios' ? Theme.spacing.md : Theme.spacing.sm,
    borderRadius: Theme.borderRadius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    minHeight: 48,
  },
  
  searchIcon: {
    marginRight: Theme.spacing.sm,
  },
  
  searchInput: {
    flex: 1,
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.normal,
    color: Theme.colors.textPrimary,
    paddingVertical: 0, // 移除默认的垂直内边距
  },
  
  clearButton: {
    marginLeft: Theme.spacing.sm,
    padding: Theme.spacing.xs,
  },
});

export default ModernSearchBar;
