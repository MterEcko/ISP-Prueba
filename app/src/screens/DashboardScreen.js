import React, { useState, useEffect } from 'react';
import {
  View,
  ScrollView,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { clientPortalService } from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatters';

export default function DashboardScreen({ navigation }) {
  const [dashboard, setDashboard] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    try {
      const response = await clientPortalService.getDashboard();
      setDashboard(response.data);
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDashboard();
  };

  const getStatusColor = () => {
    if (!dashboard) return '#95a5a6';
    const colors = {
      active: '#27ae60',
      suspended: '#e74c3c',
      pending: '#f39c12',
    };
    return colors[dashboard.status] || '#95a5a6';
  };

  const getStatusText = () => {
    if (!dashboard) return '';
    const texts = {
      active: 'Activo',
      suspended: 'Suspendido',
      pending: 'Pendiente',
    };
    return texts[dashboard.status] || dashboard.status;
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando dashboard...</Text>
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Portal</Text>
        <Text style={styles.headerSubtitle}>Bienvenido de vuelta</Text>
      </View>

      {/* Estado de Cuenta */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.statusHeader}>
            <Text style={styles.cardTitle}>Estado de Cuenta</Text>
            <Chip
              style={{ backgroundColor: getStatusColor() }}
              textStyle={{ color: '#fff' }}
            >
              {getStatusText()}
            </Chip>
          </View>

          <View style={styles.balanceContainer}>
            <Text style={styles.balanceLabel}>Balance Actual</Text>
            <Text
              style={[
                styles.balanceAmount,
                dashboard?.balance < 0 && styles.negativeBalance,
              ]}
            >
              {formatCurrency(dashboard?.balance || 0)}
            </Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Último Pago:</Text>
            <Text style={styles.infoValue}>
              {formatDate(dashboard?.lastPaymentDate)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Suscripción */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Mi Suscripción</Text>

          <View style={styles.subscriptionItem}>
            <Icon name="package-variant" size={24} color="#3498db" />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>Plan Actual</Text>
              <Text style={styles.subscriptionValue}>
                {dashboard?.subscription.planName}
              </Text>
            </View>
          </View>

          <View style={styles.subscriptionItem}>
            <Icon name="speedometer" size={24} color="#3498db" />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>Velocidad</Text>
              <Text style={styles.subscriptionValue}>
                {dashboard?.subscription.speed}
              </Text>
            </View>
          </View>

          <View style={styles.subscriptionItem}>
            <Icon name="cash" size={24} color="#3498db" />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>Precio Mensual</Text>
              <Text style={styles.subscriptionValue}>
                {formatCurrency(dashboard?.subscription.price)}
              </Text>
            </View>
          </View>

          <View style={styles.subscriptionItem}>
            <Icon name="calendar" size={24} color="#3498db" />
            <View style={styles.subscriptionInfo}>
              <Text style={styles.subscriptionLabel}>Próximo Vencimiento</Text>
              <Text style={styles.subscriptionValue}>
                {formatDate(dashboard?.subscription.nextDueDate)}
              </Text>
            </View>
          </View>
        </Card.Content>
      </Card>

      {/* Facturas Pendientes */}
      {dashboard?.pendingInvoices?.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Facturas Pendientes</Text>
              <Chip style={styles.countChip}>
                {dashboard.pendingInvoices.length}
              </Chip>
            </View>

            {dashboard.pendingInvoices.slice(0, 3).map((invoice) => (
              <TouchableOpacity
                key={invoice.id}
                style={styles.invoiceItem}
                onPress={() =>
                  navigation.navigate('InvoiceDetail', { id: invoice.id })
                }
              >
                <View style={styles.invoiceInfo}>
                  <Text style={styles.invoiceNumber}>
                    Factura #{invoice.invoiceNumber}
                  </Text>
                  <Text style={styles.invoiceDate}>
                    {formatDate(invoice.dueDate)}
                  </Text>
                </View>
                <Text style={styles.invoiceAmount}>
                  {formatCurrency(invoice.total)}
                </Text>
              </TouchableOpacity>
            ))}

            <Button
              mode="outlined"
              onPress={() => navigation.navigate('Invoices')}
              style={styles.seeAllButton}
            >
              Ver Todas las Facturas
            </Button>
          </Card.Content>
        </Card>
      )}

      {/* Accesos Rápidos */}
      <View style={styles.quickActions}>
        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Invoices')}
        >
          <Icon name="file-document" size={32} color="#3498db" />
          <Text style={styles.actionText}>Mis Facturas</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Tickets')}
        >
          <Icon name="ticket" size={32} color="#3498db" />
          <Text style={styles.actionText}>Soporte</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Usage')}
        >
          <Icon name="chart-line" size={32} color="#3498db" />
          <Text style={styles.actionText}>Mi Consumo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionCard}
          onPress={() => navigation.navigate('Profile')}
        >
          <Icon name="account" size={32} color="#3498db" />
          <Text style={styles.actionText}>Mi Perfil</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  header: {
    backgroundColor: '#3498db',
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#fff',
  },
  headerSubtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
  },
  card: {
    margin: 15,
    marginTop: 15,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  countChip: {
    backgroundColor: '#e74c3c',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  balanceContainer: {
    marginBottom: 15,
  },
  balanceLabel: {
    fontSize: 14,
    color: '#666',
  },
  balanceAmount: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  negativeBalance: {
    color: '#e74c3c',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  infoLabel: {
    color: '#666',
  },
  infoValue: {
    fontWeight: '500',
  },
  subscriptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  subscriptionInfo: {
    marginLeft: 15,
    flex: 1,
  },
  subscriptionLabel: {
    fontSize: 12,
    color: '#666',
  },
  subscriptionValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  invoiceItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    marginBottom: 10,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontWeight: '500',
  },
  invoiceDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  seeAllButton: {
    marginTop: 10,
  },
  quickActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 10,
    marginBottom: 20,
  },
  actionCard: {
    width: '47%',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    margin: '1.5%',
    alignItems: 'center',
    elevation: 2,
  },
  actionText: {
    marginTop: 10,
    fontSize: 14,
    fontWeight: '500',
    color: '#2c3e50',
  },
});
