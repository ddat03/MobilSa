import React from 'react'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { SafeAreaProvider } from 'react-native-safe-area-context'
import { Text, View } from 'react-native'
import { theme } from './lib/theme'
import { useCart } from './lib/cart'
import { AuthProvider, useAuth } from './lib/auth'

import HomeScreen          from './screens/HomeScreen'
import ProductDetailScreen from './screens/ProductDetailScreen'
import CartScreen          from './screens/CartScreen'
import CheckoutScreen      from './screens/CheckoutScreen'
import AccountScreen       from './screens/AccountScreen'
import LoginScreen         from './screens/LoginScreen'
import RegisterScreen      from './screens/RegisterScreen'
import WhatsAppFloat       from './components/WhatsAppFloat'

const Stack = createNativeStackNavigator()
const Tab   = createBottomTabNavigator()

const STACK_OPTS = {
  headerStyle:      { backgroundColor: theme.white },
  headerTintColor:  theme.gray900,
  headerTitleStyle: { fontWeight: '700' as const, color: theme.gray900 },
  headerShadowVisible: false,
}

function StoreStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTS}>
      <Stack.Screen name="Home"          component={HomeScreen}          options={{ headerShown: false }} />
      <Stack.Screen name="ProductDetail" component={ProductDetailScreen}
        options={({ route }: any) => ({ title: route.params?.name ?? 'Producto' })} />
      <Stack.Screen name="Checkout"      component={CheckoutScreen}      options={{ title: 'Pago', headerShown: false }} />
    </Stack.Navigator>
  )
}

function CartStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTS}>
      <Stack.Screen name="Cart"     component={CartScreen}     options={{ headerShown: false }} />
      <Stack.Screen name="Checkout" component={CheckoutScreen} options={{ headerShown: false }} />
      <Stack.Screen name="Login"    component={LoginScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  )
}

function AccountStack() {
  return (
    <Stack.Navigator screenOptions={STACK_OPTS}>
      <Stack.Screen name="Account"  component={AccountScreen}  options={{ headerShown: false }} />
      <Stack.Screen name="Login"    component={LoginScreen}    options={{ headerShown: false }} />
      <Stack.Screen name="Register" component={RegisterScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
  )
}

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text style={{ fontSize: 20, opacity: focused ? 1 : 0.45 }}>{emoji}</Text>
}

function AppTabs() {
  const { user } = useAuth()
  const count    = useCart(s => s.count())

  return (
    <Tab.Navigator
      screenOptions={{
        headerShown:             false,
        tabBarActiveTintColor:   theme.primary,
        tabBarInactiveTintColor: theme.gray300,
        tabBarStyle: {
          backgroundColor: theme.white,
          borderTopColor:  theme.gray100,
          borderTopWidth:  1,
          paddingBottom:   4,
          height:          58,
          elevation:       12,
          shadowColor:     '#000',
          shadowOpacity:   0.08,
          shadowRadius:    12,
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '700' },
      }}
    >
      <Tab.Screen
        name="Tienda"
        component={StoreStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏪" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Carrito"
        component={CartStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji="🛒" focused={focused} />,
          tabBarBadge: count > 0 ? count : undefined,
          tabBarBadgeStyle: { backgroundColor: theme.secondary },
        }}
      />
      <Tab.Screen
        name="Cuenta"
        component={AccountStack}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon emoji={user ? '👤' : '🔑'} focused={focused} />,
          tabBarLabel: user ? 'Cuenta' : 'Entrar',
        }}
      />
    </Tab.Navigator>
  )
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <NavigationContainer>
          <View style={{ flex: 1 }}>
            <AppTabs />
            <WhatsAppFloat />
          </View>
        </NavigationContainer>
      </AuthProvider>
    </SafeAreaProvider>
  )
}
