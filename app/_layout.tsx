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
    const init = () => {
      try {
        initDatabase();
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    };
    init();
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
            <Stack.Screen name="index" options={{ title: i18n.t('home.title') }} />
            <Stack.Screen name="screens/add" options={{ title: i18n.t('add.title') }} />
            <Stack.Screen
              name="screens/categories"
              options={{
                title: i18n.t('categories.title'),
                headerTintColor: '#333',
              }}
            />
            <Stack.Screen
              name="screens/profile"
              options={{
                title: i18n.t('profile.profile'),
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
