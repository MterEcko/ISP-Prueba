import React, { useState, useEffect } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  RefreshControl,
  TouchableOpacity,
  Alert,
} from 'react-native';
import {
  Text,
  Card,
  Chip,
  ActivityIndicator,
  FAB,
  Portal,
  Modal,
  TextInput,
  Button,
} from 'react-native-paper';
import { clientPortalService } from '../services/api';
import {
  formatDateTime,
  getTicketStatusText,
  getTicketStatusColor,
  getTicketPriorityText,
  getTicketPriorityColor,
} from '../utils/formatters';

export default function TicketsScreen({ navigation }) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [newTicket, setNewTicket] = useState({
    subject: '',
    description: '',
    priority: 'medium',
  });

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      const response = await clientPortalService.getTickets();
      setTickets(response.data.tickets);
    } catch (error) {
      console.error('Error loading tickets:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadTickets();
  };

  const handleCreateTicket = async () => {
    if (!newTicket.subject || !newTicket.description) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    try {
      await clientPortalService.createTicket(newTicket);
      Alert.alert('Éxito', 'Ticket creado correctamente');
      setShowModal(false);
      setNewTicket({ subject: '', description: '', priority: 'medium' });
      loadTickets();
    } catch (error) {
      console.error('Error creating ticket:', error);
      Alert.alert('Error', 'No se pudo crear el ticket');
    }
  };

  const renderTicket = ({ item }) => (
    <TouchableOpacity
      onPress={() => navigation.navigate('TicketDetail', { ticket: item })}
    >
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.cardHeader}>
            <Text style={styles.ticketId}>Ticket #{item.id}</Text>
            <View style={styles.badges}>
              <Chip
                style={{
                  backgroundColor: getTicketPriorityColor(item.priority),
                  marginRight: 8,
                }}
                textStyle={{ color: '#fff', fontSize: 11 }}
              >
                {getTicketPriorityText(item.priority)}
              </Chip>
              <Chip
                style={{
                  backgroundColor: getTicketStatusColor(item.status),
                }}
                textStyle={{ color: '#fff', fontSize: 11 }}
              >
                {getTicketStatusText(item.status)}
              </Chip>
            </View>
          </View>

          <Text style={styles.ticketSubject} numberOfLines={2}>
            {item.subject}
          </Text>

          <Text style={styles.ticketDate}>{formatDateTime(item.createdAt)}</Text>
        </Card.Content>
      </Card>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" />
        <Text style={styles.loadingText}>Cargando tickets...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={tickets}
        renderItem={renderTicket}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No tienes tickets</Text>
            <Text style={styles.emptySubtext}>
              Crea tu primer ticket presionando el botón +
            </Text>
          </View>
        }
      />

      <FAB
        style={styles.fab}
        icon="plus"
        onPress={() => setShowModal(true)}
        label="Nuevo Ticket"
      />

      {/* Modal para crear ticket */}
      <Portal>
        <Modal
          visible={showModal}
          onDismiss={() => setShowModal(false)}
          contentContainerStyle={styles.modal}
        >
          <Text style={styles.modalTitle}>Nuevo Ticket de Soporte</Text>

          <TextInput
            label="Asunto *"
            value={newTicket.subject}
            onChangeText={(text) => setNewTicket({ ...newTicket, subject: text })}
            style={styles.input}
            mode="outlined"
          />

          <TextInput
            label="Descripción *"
            value={newTicket.description}
            onChangeText={(text) => setNewTicket({ ...newTicket, description: text })}
            multiline
            numberOfLines={5}
            style={styles.input}
            mode="outlined"
          />

          <View style={styles.modalActions}>
            <Button
              mode="outlined"
              onPress={() => setShowModal(false)}
              style={styles.cancelButton}
            >
              Cancelar
            </Button>
            <Button mode="contained" onPress={handleCreateTicket}>
              Crear Ticket
            </Button>
          </View>
        </Modal>
      </Portal>
    </View>
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
  list: {
    padding: 15,
  },
  card: {
    marginBottom: 15,
    borderRadius: 12,
    elevation: 2,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  ticketId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#3498db',
  },
  badges: {
    flexDirection: 'row',
  },
  ticketSubject: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
    marginBottom: 5,
  },
  ticketDate: {
    fontSize: 12,
    color: '#666',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#999',
  },
  fab: {
    position: 'absolute',
    margin: 16,
    right: 0,
    bottom: 0,
    backgroundColor: '#27ae60',
  },
  modal: {
    backgroundColor: 'white',
    padding: 20,
    margin: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    color: '#2c3e50',
  },
  input: {
    marginBottom: 15,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  cancelButton: {
    marginRight: 10,
  },
});
