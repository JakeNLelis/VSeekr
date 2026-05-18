import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, Platform, StyleSheet, View } from 'react-native';

import Ionicons from '@expo/vector-icons/Ionicons';
import { useAuth } from '../../lib/AuthProvider';

export default function TabLayout() {
  const { session, initialized } = useAuth();

  // Show a loading spinner while auth state is being determined.
  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0e0e0e' }}>
        <ActivityIndicator size="large" color="#b6a0ff" />
      </View>
    );
  }

  // If not authenticated, redirect to login. This prevents any tab
  // content from rendering for unauthenticated users.
  if (!session) {
    return <Redirect href="/(auth)/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#b6a0ff', // primary color
        tabBarInactiveTintColor: '#adaaaa', // on-surface-variant
        tabBarStyle: {
          backgroundColor: Platform.select({
            ios: 'rgba(26, 26, 26, 0.7)', // surface-container with opacity for blur
            default: '#1a1a1a', // solid surface-container fallback
          }),
          position: 'absolute',
          borderTopWidth: 0,
          elevation: 0, // Remove android shadow
          height: 60,
          paddingBottom: 10,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Map',
          tabBarIcon: ({ color }) => <Ionicons name="map" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="feed"
        options={{
          title: 'Feed',
          tabBarIcon: ({ color }) => <Ionicons name="list" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="report"
        options={{
          title: 'Report',
          tabBarIcon: ({ color }) => (
            <View style={styles.addBtn}>
              <Ionicons name="add" size={28} color="#0e0e0e" />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="activity"
        options={{
          title: 'Activity',
          tabBarIcon: ({ color }) => <Ionicons name="notifications" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <Ionicons name="person" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  addBtn: {
    backgroundColor: '#b6a0ff',
    borderRadius: 999,
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -25,
    shadowColor: '#b6a0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
  }
});

