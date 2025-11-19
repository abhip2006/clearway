import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useCapitalCallsStore } from '../store/capital-calls.store';
import { syncService } from '../services/sync.service';
import { useScreenAnalytics } from '../hooks/useAnalytics';
import { analyticsService } from '../services/analytics.service';

export function DashboardScreen() {
  const navigation = useNavigation<any>();
  const capitalCalls = useCapitalCallsStore((state) => state.capitalCalls);
  const loading = useCapitalCallsStore((state) => state.loading);
  const setLoading = useCapitalCallsStore((state) => state.setLoading);
  const [refreshing, setRefreshing] = useState(false);

  useScreenAnalytics('Dashboard');

  useEffect(() => {
    loadCapitalCalls();
  }, []);

  const loadCapitalCalls = async () => {
    setLoading(true);
    try {
      await syncService.syncPendingChanges();
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadCapitalCalls();
    setRefreshing(false);
  };

  const handleCapitalCallPress = (call: any) => {
    analyticsService.trackCapitalCallAction('VIEW', call.id);
    navigation.navigate('CapitalCallDetail', { id: call.id });
  };

  const handleCaptureDocument = () => {
    navigation.navigate('DocumentCapture');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'APPROVED':
        return '#10b981';
      case 'REJECTED':
        return '#ef4444';
      case 'PENDING':
        return '#f59e0b';
      default:
        return '#6b7280';
    }
  };

  const renderCapitalCall = ({ item }: any) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleCapitalCallPress(item)}
    >
      <View style={styles.cardHeader}>
        <Text style={styles.fundName}>{item.fund}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>
      <Text style={styles.amount}>${item.amount.toLocaleString()}</Text>
      <Text style={styles.dueDate}>
        Due: {new Date(item.dueDate).toLocaleDateString()}
      </Text>
    </TouchableOpacity>
  );

  if (loading && capitalCalls.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Capital Calls</Text>
        <TouchableOpacity
          style={styles.captureButton}
          onPress={handleCaptureDocument}
        >
          <Text style={styles.captureButtonText}>+ Capture</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={capitalCalls}
        renderItem={renderCapitalCall}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No capital calls yet</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
  },
  captureButton: {
    backgroundColor: '#0066FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  captureButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  listContainer: {
    padding: 16,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  fundName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1f2937',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  amount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#0066FF',
    marginBottom: 4,
  },
  dueDate: {
    fontSize: 14,
    color: '#6b7280',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#9ca3af',
  },
});
