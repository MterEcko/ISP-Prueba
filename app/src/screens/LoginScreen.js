import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  Image,
  Alert,
} from 'react-native';
import { TextInput, Button, Text, Card } from 'react-native-paper';
import { authService } from '../services/api';

export default function LoginScreen({ navigation }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Por favor completa todos los campos');
      return;
    }

    setLoading(true);
    try {
      await authService.login(email, password);
      // La navegación se manejará automáticamente al cambiar el estado de autenticación
    } catch (error) {
      console.error('Error en login:', error);
      Alert.alert(
        'Error de Autenticación',
        error.response?.data?.message || 'Credenciales incorrectas'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <View style={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            {/* Logo */}
            <View style={styles.logoContainer}>
              <Text style={styles.title}>ISP Manager</Text>
              <Text style={styles.subtitle}>Portal del Cliente</Text>
            </View>

            {/* Formulario */}
            <TextInput
              label="Correo Electrónico"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="email" />}
            />

            <TextInput
              label="Contraseña"
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              style={styles.input}
              mode="outlined"
              left={<TextInput.Icon icon="lock" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off' : 'eye'}
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
            >
              Iniciar Sesión
            </Button>

            <Button
              mode="text"
              onPress={() => Alert.alert('Recuperar Contraseña', 'Función próximamente')}
              style={styles.forgotButton}
            >
              ¿Olvidaste tu contraseña?
            </Button>
          </Card.Content>
        </Card>

        <Text style={styles.footer}>
          © 2025 ISP Manager. Todos los derechos reservados.
        </Text>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#3498db',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  card: {
    borderRadius: 12,
    elevation: 4,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#3498db',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  input: {
    marginBottom: 15,
  },
  button: {
    marginTop: 10,
    paddingVertical: 6,
  },
  forgotButton: {
    marginTop: 10,
  },
  footer: {
    textAlign: 'center',
    color: '#fff',
    marginTop: 20,
    fontSize: 12,
  },
});
