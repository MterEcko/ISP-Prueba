import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Provider as PaperProvider } from 'react-native-paper';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

// Importar pantallas
import LoginScreen from './src/screens/LoginScreen';
import DashboardScreen from './src/screens/DashboardScreen';
import InvoicesScreen from './src/screens/InvoicesScreen';
import InvoiceDetailScreen from './src/screens/InvoiceDetailScreen';
import TicketsScreen from './src/screens/TicketsScreen';
import TicketDetailScreen from './src/screens/TicketDetailScreen';
import UsageScreen from './src/screens/UsageScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

// Navegación de pestañas principal
function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarIcon: ({ focused, color, size }) => {
          let iconName;

          if (route.name === 'Dashboard') {
            iconName = 'view-dashboard';
          } else if (route.name === 'Invoices') {
            iconName = 'file-document';
          } else if (route.name === 'Tickets') {
            iconName = 'ticket';
          } else if (route.name === 'Usage') {
            iconName = 'chart-line';
          } else if (route.name === 'Profile') {
            iconName = 'account';
          }

          return <Icon name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3498db',
        tabBarInactiveTintColor: 'gray',
        headerShown: false
      })}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{ title: 'Inicio' }}
      />
      <Tab.Screen
        name="Invoices"
        component={InvoicesScreen}
        options={{ title: 'Facturas' }}
      />
      <Tab.Screen
        name="Tickets"
        component={TicketsScreen}
        options={{ title: 'Soporte' }}
      />
      <Tab.Screen
        name="Usage"
        component={UsageScreen}
        options={{ title: 'Consumo' }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{ title: 'Perfil' }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  const checkAuthentication = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      if (token) {
        setIsAuthenticated(true);
      }
    } catch (error) {
      console.error('Error checking authentication:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return null; // O un componente de carga
  }

  return (
    <PaperProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerShown: false }}>
          {!isAuthenticated ? (
            <Stack.Screen name="Login" component={LoginScreen} />
          ) : (
            <>
              <Stack.Screen name="Main" component={MainTabs} />
              <Stack.Screen
                name="InvoiceDetail"
                component={InvoiceDetailScreen}
                options={{
                  headerShown: true,
                  title: 'Detalle de Factura'
                }}
              />
              <Stack.Screen
                name="TicketDetail"
                component={TicketDetailScreen}
                options={{
                  headerShown: true,
                  title: 'Detalle de Ticket'
                }}
              />
            </>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </PaperProvider>
  );
}
