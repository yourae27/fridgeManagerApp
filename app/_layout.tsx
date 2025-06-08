import { useEffect } from 'react';
import { Stack } from "expo-router";
import { initDatabase } from './constants/Storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import './i18n'; // 导入 i18n 配置
import i18n from './i18n'; // 导入 i18n 配置
import { FoodProvider } from './context/FoodContext';
import { Theme } from './constants/Theme';

export default function RootLayout() {
  useEffect(() => {
    const init = () => {
      try {
        initDatabase();
      } catch (error) {
        console.error('数据库初始化失败:', error);
      }
    };
    init();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FoodProvider>
        <Stack
          screenOptions={{
            headerStyle: {
              backgroundColor: Theme.colors.surface,
            },
            headerTintColor: Theme.colors.textPrimary,
            headerTitleStyle: {
              fontWeight: Theme.typography.fontWeight.semibold,
              fontSize: Theme.typography.fontSize.xl,
              color: Theme.colors.textPrimary,
            },
            headerShadowVisible: false,
            headerBackTitleVisible: false,
          }}>
          <Stack.Screen name="index" options={{ title: '冰箱管家' }} />
          <Stack.Screen name="screens/addItem" options={{ title: '添加食品' }} />
          <Stack.Screen name="screens/favorites" options={{ title: '常买清单' }} />
          <Stack.Screen name="screens/history" options={{ title: '历史记录' }} />
        </Stack>
      </FoodProvider>
    </GestureHandlerRootView>
  );
}
