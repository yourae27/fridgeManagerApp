import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions,
} from 'react-native';
import { Theme } from '../constants/Theme';

interface SegmentedControlProps {
  segments: Array<{
    key: string;
    label: string;
    icon?: string;
  }>;
  activeSegment: string;
  onSegmentChange: (key: string) => void;
  style?: any;
}

const ModernSegmentedControl: React.FC<SegmentedControlProps> = ({
  segments,
  activeSegment,
  onSegmentChange,
  style,
}) => {
  const animatedValue = useRef(new Animated.Value(0)).current;
  const segmentWidth = (Dimensions.get('window').width - Theme.spacing.lg * 2) / segments.length;

  useEffect(() => {
    const activeIndex = segments.findIndex(segment => segment.key === activeSegment);
    
    Animated.spring(animatedValue, {
      toValue: activeIndex * segmentWidth,
      useNativeDriver: false,
      tension: 100,
      friction: 8,
    }).start();
  }, [activeSegment, segmentWidth]);

  const renderSegment = (segment: any, index: number) => {
    const isActive = activeSegment === segment.key;
    
    return (
      <TouchableOpacity
        key={segment.key}
        style={[styles.segment, { width: segmentWidth }]}
        onPress={() => onSegmentChange(segment.key)}
        activeOpacity={0.7}
      >
        <Text style={[
          styles.segmentText,
          isActive && styles.activeSegmentText
        ]}>
          {segment.label}
        </Text>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, style]}>
      <View style={styles.segmentedControl}>
        {/* 活跃指示器 */}
        <Animated.View
          style={[
            styles.activeIndicator,
            {
              width: segmentWidth - Theme.spacing.xs,
              transform: [{ translateX: animatedValue }],
            },
          ]}
        />
        
        {/* 分段 */}
        <View style={styles.segmentsContainer}>
          {segments.map(renderSegment)}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: Theme.spacing.lg,
    paddingVertical: Theme.spacing.sm,
    backgroundColor: Theme.colors.surface,
  },
  
  segmentedControl: {
    backgroundColor: Theme.colors.backgroundSecondary,
    borderRadius: Theme.borderRadius.lg,
    padding: Theme.spacing.xs,
    position: 'relative',
    overflow: 'hidden',
  },
  
  segmentsContainer: {
    flexDirection: 'row',
  },
  
  segment: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Theme.spacing.md,
    paddingHorizontal: Theme.spacing.sm,
    zIndex: 2,
  },
  
  segmentText: {
    fontSize: Theme.typography.fontSize.lg,
    fontWeight: Theme.typography.fontWeight.medium,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
  
  activeSegmentText: {
    color: Theme.colors.primary,
    fontWeight: Theme.typography.fontWeight.semibold,
  },
  
  activeIndicator: {
    position: 'absolute',
    top: Theme.spacing.xs,
    bottom: Theme.spacing.xs,
    left: Theme.spacing.xs,
    backgroundColor: Theme.colors.surface,
    borderRadius: Theme.borderRadius.md,
    zIndex: 1,
    ...Theme.shadows.small,
  },
});

export default ModernSegmentedControl;
