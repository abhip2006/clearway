import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  Alert,
  StyleSheet,
} from 'react-native';
import { useRoute } from '@react-navigation/native';
import PDFView from 'react-native-pdf';
import { useCapitalCallsStore } from '../store/capital-calls.store';
import { useAuthStore } from '../store/auth.store';
import { syncService } from '../services/sync.service';
import { useScreenAnalytics } from '../hooks/useAnalytics';
import { analyticsService } from '../services/analytics.service';

export function CapitalCallDetailScreen() {
  const route = useRoute<any>();
  const { id } = route.params;
  const capitalCalls = useCapitalCallsStore((state) => state.capitalCalls);
  const authToken = useAuthStore((state) => state.token);

  const [call, setCall] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState(false);
  const [rejecting, setRejecting] = useState(false);

  useScreenAnalytics('CapitalCallDetail');

  useEffect(() => {
    loadCapitalCall();
  }, [id]);

  const loadCapitalCall = async () => {
    try {
      const found = capitalCalls.find((c) => c.id === id);
      if (found) {
        setCall(found);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async () => {
    Alert.alert('Approve Capital Call', 'Are you sure?', [
      { text: 'Cancel', onPress: () => {} },
      {
        text: 'Approve',
        onPress: async () => {
          setApproving(true);
          try {
            await syncService.queueAction('CAPITAL_CALL', call.id, 'UPDATE', {
              status: 'APPROVED',
            });

            useCapitalCallsStore.getState().updateCapitalCall(call.id, {
              status: 'APPROVED',
            });

            analyticsService.trackCapitalCallAction('APPROVE', call.id);
            Alert.alert('Success', 'Capital call approved');
          } catch (error) {
            Alert.alert('Error', 'Failed to approve');
          } finally {
            setApproving(false);
          }
        },
      },
    ]);
  };

  const handleReject = async () => {
    Alert.alert('Reject Capital Call', 'Provide a reason (optional)', [
      { text: 'Cancel' },
      {
        text: 'Reject',
        onPress: async () => {
          setRejecting(true);
          try {
            await syncService.queueAction('CAPITAL_CALL', call.id, 'UPDATE', {
              status: 'REJECTED',
            });

            useCapitalCallsStore.getState().updateCapitalCall(call.id, {
              status: 'REJECTED',
            });

            analyticsService.trackCapitalCallAction('REJECT', call.id);
            Alert.alert('Success', 'Capital call rejected');
          } catch (error) {
            Alert.alert('Error', 'Failed to reject');
          } finally {
            setRejecting(false);
          }
        },
      },
    ]);
  };

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0066FF" />
      </View>
    );
  }

  if (!call) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Capital call not found</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.fundName}>{call.fund}</Text>
        <Text style={styles.amount}>${call.amount.toLocaleString()}</Text>
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          {
            backgroundColor:
              call.status === 'APPROVED'
                ? '#10b981'
                : call.status === 'REJECTED'
                ? '#ef4444'
                : '#f59e0b',
          },
        ]}
      >
        <Text style={styles.statusText}>{call.status}</Text>
      </View>

      {/* Details */}
      <View style={styles.detailsSection}>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Due Date</Text>
          <Text style={styles.value}>
            {new Date(call.dueDate).toLocaleDateString()}
          </Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.label}>Document</Text>
          <TouchableOpacity>
            <Text style={styles.link}>View Document</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Document Viewer */}
      {call.documentUrl && (
        <View style={styles.documentContainer}>
          <PDFView
            source={{ uri: call.documentUrl }}
            style={styles.pdf}
            onError={(error) => console.error('PDF error:', error)}
          />
        </View>
      )}

      {/* Action Buttons */}
      {call.status === 'PENDING' && (
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.button, styles.approveButton]}
            onPress={handleApprove}
            disabled={approving}
          >
            {approving ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Approve</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.rejectButton]}
            onPress={handleReject}
            disabled={rejecting}
          >
            {rejecting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>Reject</Text>
            )}
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
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
    backgroundColor: '#fff',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  fundName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1f2937',
    marginBottom: 8,
  },
  amount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#0066FF',
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    margin: 20,
  },
  statusText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  detailsSection: {
    backgroundColor: '#fff',
    padding: 20,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e5e5e5',
  },
  label: {
    fontSize: 16,
    color: '#6b7280',
  },
  value: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1f2937',
  },
  link: {
    fontSize: 16,
    color: '#0066FF',
    fontWeight: '500',
  },
  documentContainer: {
    height: 400,
    backgroundColor: '#fff',
    marginHorizontal: 20,
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  pdf: {
    flex: 1,
  },
  actionsContainer: {
    flexDirection: 'row',
    padding: 20,
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#10b981',
  },
  rejectButton: {
    backgroundColor: '#ef4444',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    fontSize: 16,
    color: '#ef4444',
  },
});
