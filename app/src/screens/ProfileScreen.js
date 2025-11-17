import React, { useState, useEffect } from 'react';
import { View, ScrollView, StyleSheet, Alert } from 'react-native';
import { Text, Card, List, Switch, Button, Divider } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { authService } from '../services/api';

export default function ProfileScreen({ navigation }) {
  const [user, setUser] = useState(null);
  const [emailNotif, setEmailNotif] = useState(true);
  const [smsNotif, setSmsNotif] = useState(false);
  const [paymentReminders, setPaymentReminders] = useState(true);

  useEffect(() => {
    loadUser();
  }, []);

  const loadUser = async () => {
    const currentUser = await authService.getCurrentUser();
    setUser(currentUser);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Cerrar Sesión',
      '¿Estás seguro que deseas cerrar sesión?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Cerrar Sesión',
          onPress: async () => {
            await authService.logout();
            // La navegación se manejará automáticamente al cambiar el estado de autenticación
          },
          style: 'destructive',
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* Información del Usuario */}
      <Card style={styles.card}>
        <Card.Content>
          <View style={styles.profileHeader}>
            <View style={styles.avatar}>
              <Icon name="account" size={60} color="#3498db" />
            </View>
            <Text style={styles.userName}>{user?.name || 'Usuario'}</Text>
            <Text style={styles.userEmail}>{user?.email}</Text>
          </View>
        </Card.Content>
      </Card>

      {/* Información de Cuenta */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Información de Cuenta</Text>

          <List.Item
            title="Correo Electrónico"
            description={user?.email}
            left={() => <List.Icon icon="email" color="#3498db" />}
          />

          <Divider />

          <List.Item
            title="Teléfono"
            description={user?.phone || 'No especificado'}
            left={() => <List.Icon icon="phone" color="#3498db" />}
          />

          <Divider />

          <List.Item
            title="Dirección"
            description={user?.address || 'No especificada'}
            left={() => <List.Icon icon="map-marker" color="#3498db" />}
          />
        </Card.Content>
      </Card>

      {/* Preferencias de Notificaciones */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Notificaciones</Text>

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefTitle}>Notificaciones por Email</Text>
              <Text style={styles.prefDescription}>
                Recibir actualizaciones por correo
              </Text>
            </View>
            <Switch value={emailNotif} onValueChange={setEmailNotif} />
          </View>

          <Divider />

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefTitle}>Notificaciones SMS</Text>
              <Text style={styles.prefDescription}>
                Alertas importantes por mensaje
              </Text>
            </View>
            <Switch value={smsNotif} onValueChange={setSmsNotif} />
          </View>

          <Divider />

          <View style={styles.prefItem}>
            <View style={styles.prefInfo}>
              <Text style={styles.prefTitle}>Recordatorios de Pago</Text>
              <Text style={styles.prefDescription}>
                Antes del vencimiento
              </Text>
            </View>
            <Switch value={paymentReminders} onValueChange={setPaymentReminders} />
          </View>
        </Card.Content>
      </Card>

      {/* Seguridad */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Seguridad</Text>

          <List.Item
            title="Cambiar Contraseña"
            left={() => <List.Icon icon="lock" color="#3498db" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => Alert.alert('Próximamente', 'Función en desarrollo')}
          />
        </Card.Content>
      </Card>

      {/* Acerca de */}
      <Card style={styles.card}>
        <Card.Content>
          <Text style={styles.sectionTitle}>Acerca de</Text>

          <List.Item
            title="Versión"
            description="1.0.0"
            left={() => <List.Icon icon="information" color="#3498db" />}
          />

          <Divider />

          <List.Item
            title="Términos y Condiciones"
            left={() => <List.Icon icon="file-document" color="#3498db" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => Alert.alert('Próximamente', 'Función en desarrollo')}
          />

          <Divider />

          <List.Item
            title="Política de Privacidad"
            left={() => <List.Icon icon="shield-check" color="#3498db" />}
            right={() => <List.Icon icon="chevron-right" />}
            onPress={() => Alert.alert('Próximamente', 'Función en desarrollo')}
          />
        </Card.Content>
      </Card>

      {/* Botón de Cerrar Sesión */}
      <View style={styles.logoutContainer}>
        <Button
          mode="contained"
          onPress={handleLogout}
          icon="logout"
          buttonColor="#e74c3c"
          style={styles.logoutButton}
        >
          Cerrar Sesión
        </Button>
      </View>

      <View style={styles.bottomPadding} />
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
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#ecf0f1',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 5,
  },
  userEmail: {
    fontSize: 16,
    color: '#666',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2c3e50',
    marginBottom: 15,
  },
  prefItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  prefInfo: {
    flex: 1,
  },
  prefTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2c3e50',
  },
  prefDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutContainer: {
    padding: 15,
  },
  logoutButton: {
    paddingVertical: 8,
  },
  bottomPadding: {
    height: 20,
  },
});
