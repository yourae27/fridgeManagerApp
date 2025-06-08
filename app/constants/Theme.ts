import { Platform } from 'react-native';

// 现代化设计系统
export const Colors = {
  // 主色调 - 使用更现代的蓝色系
  primary: '#1677FF',
  primaryLight: '#4096FF',
  primaryDark: '#0958D9',
  primaryAlpha: 'rgba(22, 119, 255, 0.1)',
  
  // 辅助色
  secondary: '#722ED1',
  secondaryLight: '#9254DE',
  secondaryAlpha: 'rgba(114, 46, 209, 0.1)',
  
  // 功能色
  success: '#52C41A',
  successLight: '#73D13D',
  successAlpha: 'rgba(82, 196, 26, 0.1)',
  
  warning: '#FAAD14',
  warningLight: '#FFC53D',
  warningAlpha: 'rgba(250, 173, 20, 0.1)',
  
  error: '#FF4D4F',
  errorLight: '#FF7875',
  errorAlpha: 'rgba(255, 77, 79, 0.1)',
  
  // 中性色
  white: '#FFFFFF',
  black: '#000000',
  
  // 文字色
  textPrimary: '#262626',
  textSecondary: '#595959',
  textTertiary: '#8C8C8C',
  textQuaternary: '#BFBFBF',
  textDisabled: '#D9D9D9',
  
  // 背景色
  background: '#F8FAFC',
  backgroundSecondary: '#F1F5F9',
  surface: '#FFFFFF',
  surfaceSecondary: '#FAFAFA',
  
  // 边框色
  border: '#E2E8F0',
  borderSecondary: '#F1F5F9',
  borderLight: '#F8FAFC',
  
  // 阴影色
  shadow: 'rgba(0, 0, 0, 0.04)',
  shadowMedium: 'rgba(0, 0, 0, 0.08)',
  shadowStrong: 'rgba(0, 0, 0, 0.12)',
  
  // 渐变色
  gradientPrimary: ['#1677FF', '#4096FF'],
  gradientSecondary: ['#722ED1', '#9254DE'],
  gradientSuccess: ['#52C41A', '#73D13D'],
  gradientWarning: ['#FAAD14', '#FFC53D'],
  gradientError: ['#FF4D4F', '#FF7875'],
};

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  xxxxl: 40,
};

export const BorderRadius = {
  xs: 4,
  sm: 6,
  md: 8,
  lg: 12,
  xl: 16,
  xxl: 20,
  xxxl: 24,
  round: 999,
};

export const Typography = {
  // 字体大小
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
    xxxxl: 28,
    xxxxxl: 32,
  },
  
  // 字体粗细
  fontWeight: {
    light: '300' as const,
    normal: '400' as const,
    medium: '500' as const,
    semibold: '600' as const,
    bold: '700' as const,
  },
  
  // 行高
  lineHeight: {
    tight: 1.2,
    normal: 1.4,
    relaxed: 1.6,
    loose: 1.8,
  },
};

export const Shadows = {
  none: {
    shadowColor: 'transparent',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  
  small: {
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 1,
    shadowRadius: 2,
    elevation: 2,
  },
  
  medium: {
    shadowColor: Colors.shadowMedium,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 1,
    shadowRadius: 4,
    elevation: 4,
  },
  
  large: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 8,
  },
  
  floating: {
    shadowColor: Colors.shadowStrong,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 1,
    shadowRadius: 16,
    elevation: 16,
  },
};

export const Layout = {
  // 安全区域
  safeArea: {
    paddingTop: Platform.OS === 'ios' ? 44 : 0,
    paddingBottom: Platform.OS === 'ios' ? 34 : 0,
  },
  
  // 容器
  container: {
    paddingHorizontal: Spacing.lg,
  },
  
  // 导航栏高度
  headerHeight: Platform.OS === 'ios' ? 44 : 56,
  tabBarHeight: Platform.OS === 'ios' ? 83 : 56,
  
  // 屏幕边距
  screenPadding: Spacing.lg,
  
  // 卡片间距
  cardSpacing: Spacing.md,
};

// 动画配置
export const Animations = {
  duration: {
    fast: 150,
    normal: 250,
    slow: 350,
  },
  
  easing: {
    ease: 'ease',
    easeIn: 'ease-in',
    easeOut: 'ease-out',
    easeInOut: 'ease-in-out',
  },
};

// 主题配置
export const Theme = {
  colors: Colors,
  spacing: Spacing,
  borderRadius: BorderRadius,
  typography: Typography,
  shadows: Shadows,
  layout: Layout,
  animations: Animations,
};

export default Theme;
