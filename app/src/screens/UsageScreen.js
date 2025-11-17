import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { Text, Card, SegmentedButtons, ActivityIndicator } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { clientPortalService } from '../services/api';
import { formatBytes } from '../utils/formatters';

export default function UsageScreen() {
  const [usage, setUsage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState('week');

  useEffect(() => {
    loadUsage();
  }, [period]);

  const loadUsage = async () => {
    try {
      const response = await clientPortalService.getUsageStats(period);
      setUsage(response.data);
    } catch (error) {
      console.error('Error loading usage:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadUsage();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando consumo...</Text>
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
      {/* Selector de período */}
      <View style={styles.periodContainer}>
        <SegmentedButtons
          value={period}
          onValueChange={setPeriod}
          buttons={[
            { value: 'day', label: 'Hoy' },
            { value: 'week', label: 'Semana' },
            { value: 'month', label: 'Mes' },
          ]}
        />
      </View>

      {/* Resumen de consumo */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>Resumen del Período</Text>

          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <Icon name="download" size={32} color="#3498db" />
              <Text style={styles.statLabel}>Descarga</Text>
              <Text style={styles.statValue}>{formatBytes(usage?.download || 0)}</Text>
            </View>

            <View style={styles.statItem}>
              <Icon name="upload" size={32} color="#f39c12" />
              <Text style={styles.statLabel}>Carga</Text>
              <Text style={styles.statValue}>{formatBytes(usage?.upload || 0)}</Text>
            </View>
          </View>

          <View style={styles.totalContainer}>
            <Text style={styles.totalLabel}>Consumo Total</Text>
            <Text style={styles.totalValue}>
              {formatBytes(usage?.totalUsage || 0)}
            </Text>
          </View>

          {usage?.limit && (
            <View style={styles.limitContainer}>
              <Text style={styles.limitText}>
                Límite: {formatBytes(usage.limit)}
              </Text>
              <Text style={styles.remainingText}>
                Restante: {formatBytes(usage.limit - usage.totalUsage)}
              </Text>
            </View>
          )}

          {!usage?.limit && (
            <View style={styles.unlimitedContainer}>
              <Text style={styles.unlimitedText}>✨ Datos Ilimitados</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Promedio diario */}
      {usage?.avgDaily && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.cardTitle}>Promedio Diario</Text>
            <View style={styles.avgContainer}>
              <Icon name="chart-line" size={40} color="#9b59b6" />
              <Text style={styles.avgValue}>{formatBytes(usage.avgDaily)}</Text>
            </View>
          </Card.Content>
        </Card>
      )}

      {/* Consejos */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.cardTitle}>💡 Consejos de Optimización</Text>
          <Text style={styles.tip}>
            • Configura la calidad de video según tu plan
          </Text>
          <Text style={styles.tip}>
            • Programa descargas grandes en horarios nocturnos
          </Text>
          <Text style={styles.tip}>
            • Desactiva actualizaciones automáticas cuando no sea necesario
          </Text>
          <Text style={styles.tip}>
            • Cierra aplicaciones que consumen datos en segundo plano
          </Text>
        </Card.Content>
      </Card>
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
  periodContainer: {
    padding: 15,
  },
  card: {
    margin: 15,
    marginTop: 0,
    borderRadius: 12,
    elevation: 2,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginTop: 4,
  },
  totalContainer: {
    alignItems: 'center',
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: '#ecf0f1',
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  totalValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498db',
  },
  limitContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    padding: 15,
    backgroundColor: '#fff3cd',
    borderRadius: 8,
  },
  limitText: {
    color: '#856404',
    fontWeight: '500',
  },
  remainingText: {
    color: '#856404',
    fontWeight: '500',
  },
  unlimitedContainer: {
    alignItems: 'center',
    marginTop: 15,
    padding: 15,
    backgroundColor: '#d4edda',
    borderRadius: 8,
  },
  unlimitedText: {
    color: '#155724',
    fontSize: 16,
    fontWeight: '500',
  },
  avgContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 15,
  },
  avgValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#9b59b6',
  },
  tip: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
});
