import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, Button, Chip, ActivityIndicator, Divider } from 'react-native-paper';
import { clientPortalService } from '../services/api';
import {
  formatCurrency,
  formatDate,
  getInvoiceStatusText,
  getInvoiceStatusColor,
} from '../utils/formatters';

export default function InvoiceDetailScreen({ route, navigation }) {
  const { id } = route.params;
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadInvoiceDetail();
  }, []);

  const loadInvoiceDetail = async () => {
    try {
      const response = await clientPortalService.getInvoiceDetail(id);
      setInvoice(response.data.invoice);
    } catch (error) {
      console.error('Error loading invoice detail:', error);
      Alert.alert('Error', 'No se pudo cargar el detalle de la factura');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = () => {
    Alert.alert(
      'Pagar Factura',
      'Esta función estará disponible próximamente con la integración de pasarelas de pago.'
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando detalle...</Text>
      </View>
    );
  }

  if (!invoice) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Factura no encontrada</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <View>
              <Text style={styles.invoiceNumber}>Factura #{invoice.invoiceNumber}</Text>
              <Text style={styles.date}>{formatDate(invoice.issueDate)}</Text>
            </View>
            <Chip
              style={{
                backgroundColor: getInvoiceStatusColor(invoice.status),
              }}
              textStyle={{ color: '#fff' }}
            >
              {getInvoiceStatusText(invoice.status)}
            </Chip>
          </View>
        </Card.Content>
      </Card>

      {/* Fechas */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Información General</Text>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Fecha de Emisión:</Text>
            <Text style={styles.value}>{formatDate(invoice.issueDate)}</Text>
          </View>

          <View style={styles.infoRow}>
            <Text style={styles.label}>Fecha de Vencimiento:</Text>
            <Text style={styles.value}>{formatDate(invoice.dueDate)}</Text>
          </View>

          {invoice.paymentDate && (
            <View style={styles.infoRow}>
              <Text style={styles.label}>Fecha de Pago:</Text>
              <Text style={styles.value}>{formatDate(invoice.paymentDate)}</Text>
            </View>
          )}
        </Card.Content>
      </Card>

      {/* Conceptos */}
      {invoice.items && invoice.items.length > 0 && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Detalle de Conceptos</Text>

            {invoice.items.map((item, index) => (
              <View key={index} style={styles.item}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemDescription}>{item.description}</Text>
                  <Text style={styles.itemTotal}>
                    {formatCurrency(item.quantity * item.price)}
                  </Text>
                </View>
                <Text style={styles.itemDetail}>
                  {item.quantity} x {formatCurrency(item.price)}
                </Text>
              </View>
            ))}
          </Card.Content>
        </Card>
      )}

      {/* Totales */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Subtotal:</Text>
            <Text style={styles.totalValue}>{formatCurrency(invoice.subtotal)}</Text>
          </View>

          {invoice.tax > 0 && (
            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>IVA ({invoice.taxRate || 16}%):</Text>
              <Text style={styles.totalValue}>{formatCurrency(invoice.tax)}</Text>
            </View>
          )}

          <Divider style={styles.divider} />

          <View style={styles.totalRow}>
            <Text style={styles.grandTotalLabel}>Total:</Text>
            <Text style={styles.grandTotalValue}>
              {formatCurrency(invoice.total)}
            </Text>
          </View>
        </Card.Content>
      </Card>

      {/* Notas */}
      {invoice.notes && (
        <Card style={styles.card}>
          <Card.Content>
            <Text style={styles.sectionTitle}>Notas</Text>
            <Text style={styles.notes}>{invoice.notes}</Text>
          </Card.Content>
        </Card>
      )}

      {/* Botones de acción */}
      {(invoice.status === 'pending' || invoice.status === 'overdue') && (
        <View style={styles.actions}>
          <Button
            mode="contained"
            onPress={handlePayment}
            style={styles.payButton}
            icon="credit-card"
          >
            Pagar Ahora
          </Button>
        </View>
      )}

      <View style={styles.bottomPadding} />
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#e74c3c',
    fontSize: 16,
  },
  card: {
    margin: 15,
    borderRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  invoiceNumber: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  date: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  label: {
    color: '#666',
  },
  value: {
    fontWeight: '500',
    color: '#2c3e50',
  },
  item: {
    marginBottom: 15,
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  itemDescription: {
    flex: 1,
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#3498db',
  },
  itemDetail: {
    fontSize: 14,
    color: '#666',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  totalLabel: {
    fontSize: 16,
    color: '#666',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '500',
  },
  divider: {
    marginVertical: 10,
  },
  grandTotalLabel: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2c3e50',
  },
  grandTotalValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#e74c3c',
  },
  notes: {
    color: '#666',
    lineHeight: 20,
  },
  actions: {
    padding: 15,
  },
  payButton: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 20,
  },
});
