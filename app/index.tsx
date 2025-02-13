import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, ScrollView, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Link, router } from 'expo-router';
import Stats from './components/Stats';
import HomeList from './components/HomeList';
import i18n from './i18n';
import Profile from './screens/profile';

const App = () => {

  const [activeTab, setActiveTab] = useState('home');

  const renderContent = () => {
    switch (activeTab) {
      case 'stats':
        return <Stats />;
      case 'profile':
        return <Profile />;
      default:
        return <HomeList />;
    }
  };

  return (
    <View style={styles.container}>
      {renderContent()}

      {/* 底部导航栏 */}
      <View style={styles.navbar}>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('home')}
        >
          <Ionicons
            name="home"
            size={24}
            color={activeTab === 'home' ? '#dc4446' : '#999'}
          />
          <Text style={activeTab === 'home' ? styles.activeNavText : styles.navText}>
            {i18n.t('home.title')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('stats')}
        >
          <Ionicons
            name="stats-chart"
            size={24}
            color={activeTab === 'stats' ? '#dc4446' : '#999'}
          />
          <Text style={activeTab === 'stats' ? styles.activeNavText : styles.navText}>
            {i18n.t('home.stats')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.navItem}
          onPress={() => setActiveTab('profile')}
        >
          <Ionicons
            name="person"
            size={24}
            color={activeTab === 'profile' ? '#dc4446' : '#999'}
          />
          <Text style={activeTab === 'profile' ? styles.activeNavText : styles.navText}>
            {i18n.t('home.profile')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* 浮动添加按钮 */}
      <TouchableOpacity
        style={styles.floatingButton}
        onPress={() => router.push('/screens/add')}
      >
        <Text style={styles.floatingButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 24,
    marginTop: 40,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
  },
  buttons: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 24,
  },
  incomeButton: {
    flex: 1,
    backgroundColor: '#dc4446',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  expenseButton: {
    flex: 1,
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#dc4446',
  },
  incomeButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  expenseButtonText: {
    color: '#dc4446',
    fontSize: 16,
    fontWeight: '500',
  },
  transactionSection: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 20,
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  filters: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  activeFilter: {
    backgroundColor: '#fff1f1',
    padding: 4,
    paddingHorizontal: 12,
    borderRadius: 16,
  },
  activeFilterText: {
    color: '#dc4446',
  },
  filterText: {
    color: '#666',
  },
  transactionList: {
    flex: 1,
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: 'white',
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fff1f1',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconText: {
    fontSize: 20,
  },
  transactionInfo: {
    gap: 4,
  },
  transactionType: {
    fontWeight: '500',
  },
  transactionDate: {
    color: '#999',
    fontSize: 14,
  },
  transactionAmount: {
    fontWeight: '500',
    fontSize: 16,
  },
  navbar: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 12,
    backgroundColor: 'white',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 5,
  },
  navItem: {
    alignItems: 'center',
    gap: 4,
  },
  navText: {
    color: '#999',
  },
  activeNavText: {
    color: '#dc4446',
  },
  floatingButton: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#dc4446',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#dc4446',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingButtonText: {
    color: 'white',
    fontSize: 24,
  },
});

export default App;
