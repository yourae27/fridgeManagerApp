import { useEffect } from 'react';
import { Stack } from "expo-router";
import { initDatabase } from './constants/Storage';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { TransactionProvider } from './context/TransactionContext';
import { CategoryProvider } from './context/CategoryContext';
import './i18n'; // 导入 i18n 配置
import i18n from './i18n'; // 导入 i18n 配置

export default function RootLayout() {
  useEffect(() => {
    initDatabase();
  }, []);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <TransactionProvider>
        <CategoryProvider>
          <Stack
            screenOptions={{
              headerStyle: {
                backgroundColor: 'white',
              },
              headerTintColor: '#fff',
              headerTitleStyle: {
                fontWeight: 'bold',
              },
            }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="screens/add" />
            <Stack.Screen
              name="screens/categories"
              options={{
                title: 'Categories',
                headerTintColor: '#333',
              }}
            />
            <Stack.Screen
              name="screens/profile"
              options={{
                title: 'profile',
                headerTintColor: '#333',
              }}
            />
            <Stack.Screen
              name="screens/budget"
              options={{
                title: i18n.t('profile.memberBudget'),
                headerTintColor: '#333',
              }}
            />
          </Stack>

        </CategoryProvider>
      </TransactionProvider>
    </GestureHandlerRootView>
  );
}
