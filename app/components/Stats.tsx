import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const Stats = () => {
  const data = {
    labels: ["Jan", "Feb", "Mar", "Apr", "May", "Jun"],
    datasets: [
      {
        data: [6000, 5800, 6500, 6200, 6800, 6400],
        color: () => '#4CAF50',
        strokeWidth: 2
      },
      {
        data: [2000, 2300, 1900, 2400, 2000, 2200],
        color: () => '#FF5252',
        strokeWidth: 2
      }
    ],
    legend: ["Income", "Expenses"]
  };

  return (
    <View style={styles.container}>

      <Text style={styles.statsTitle}>Statistics</Text>
      
      <View style={styles.periodToggle}>
        <TouchableOpacity style={styles.activeToggle}>
          <Text style={styles.activeToggleText}>Month</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.toggle}>
          <Text style={styles.toggleText}>Year</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.chartTitle}>Income vs Expenses</Text>
      <Text style={styles.subtitle}>Monthly Overview</Text>

      <LineChart
        data={data}
        width={Dimensions.get('window').width - 40}
        height={220}
        chartConfig={{
          backgroundColor: '#fff',
          backgroundGradientFrom: '#fff',
          backgroundGradientTo: '#fff',
          decimalPlaces: 0,
          color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
          style: {
            borderRadius: 16
          }
        }}
        style={styles.chart}
        bezier
      />

      <Text style={styles.categoryTitle}>Spending Categories</Text>
      <View style={styles.categoryList}>
        <View style={styles.categoryItem}>
          <View style={styles.categoryLeft}>
            <View style={styles.categoryIcon}>
              <Text>🛍️</Text>
            </View>
            <Text style={styles.categoryName}>Shopping</Text>
          </View>
          <Text style={styles.categoryAmount}>$845.50</Text>
        </View>
        <View style={styles.categoryItem}>
          <View style={styles.categoryLeft}>
            <View style={styles.categoryIcon}>
              <Text>🍽️</Text>
            </View>
            <Text style={styles.categoryName}>Food & Drinks</Text>
          </View>
          <Text style={styles.categoryAmount}>$650.20</Text>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    padding: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 40,
    marginBottom: 20,
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
  statsTitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 16,
  },
  periodToggle: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  toggle: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  activeToggle: {
    backgroundColor: '#4285f4',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  toggleText: {
    color: '#666',
  },
  activeToggleText: {
    color: '#fff',
  },
  chartTitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 24,
    fontWeight: '600',
    marginBottom: 20,
  },
  chart: {
    marginVertical: 8,
    borderRadius: 16,
  },
  statsCards: {
    flexDirection: 'row',
    gap: 16,
    marginVertical: 24,
  },
  statsCard: {
    flex: 1,
    padding: 16,
    borderRadius: 12,
  },
  incomeCard: {
    backgroundColor: '#E8F5E9',
  },
  expenseCard: {
    backgroundColor: '#FFEBEE',
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendText: {
    color: '#4CAF50',
    marginLeft: 4,
  },
  expenseTrend: {
    color: '#FF5252',
  },
  statsLabel: {
    color: '#666',
    marginBottom: 4,
  },
  statsValue: {
    fontSize: 20,
    fontWeight: '600',
  },
  categoryTitle: {
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 16,
  },
  categoryList: {
    gap: 12,
  },
  categoryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
  },
  categoryLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  categoryIcon: {
    width: 40,
    height: 40,
    backgroundColor: '#fff',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryName: {
    fontSize: 16,
  },
  categoryAmount: {
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Stats; 