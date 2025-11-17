import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text, Card, Chip } from 'react-native-paper';
import {
  formatDateTime,
  getTicketStatusText,
  getTicketStatusColor,
  getTicketPriorityText,
  getTicketPriorityColor,
} from '../utils/formatters';

export default function TicketDetailScreen({ route }) {
  const { ticket } = route.params;

  return (
    <ScrollView style={styles.container}>
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.header}>
            <Text style={styles.ticketId}>Ticket #{ticket.id}</Text>
            <View style={styles.badges}>
              <Chip
                style={{
                  backgroundColor: getTicketPriorityColor(ticket.priority),
                  marginRight: 8,
                }}
                textStyle={{ color: '#fff' }}
              >
                {getTicketPriorityText(ticket.priority)}
              </Chip>
              <Chip
                style={{
                  backgroundColor: getTicketStatusColor(ticket.status),
                }}
                textStyle={{ color: '#fff' }}
              >
                {getTicketStatusText(ticket.status)}
              </Chip>
            </View>
          </View>
        </Card.Content>
      </Card>

      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Asunto</Text>
          <Text style={styles.subject}>{ticket.subject}</Text>

          <Text style={styles.sectionTitle}>Descripción</Text>
          <Text style={styles.description}>{ticket.description}</Text>

          <Text style={styles.sectionTitle}>Información</Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>Creado:</Text>
            <Text style={styles.value}>{formatDateTime(ticket.createdAt)}</Text>
          </View>
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
  card: {
    margin: 15,
    borderRadius: 12,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ticketId: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#3498db',
  },
  badges: {
    flexDirection: 'row',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
    marginBottom: 8,
  },
  subject: {
    fontSize: 18,
    fontWeight: '500',
    color: '#2c3e50',
  },
  description: {
    fontSize: 16,
    color: '#666',
    lineHeight: 24,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  label: {
    color: '#666',
  },
  value: {
    fontWeight: '500',
  },
});
