import { Redirect } from 'expo-router';
import { useAuth } from '../lib/AuthProvider';
import { View, ActivityIndicator } from 'react-native';
import React from 'react';

export default function Index() {
  const { session, initialized } = useAuth();

  if (!initialized) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0e0e0e' }}>
        <ActivityIndicator size="large" color="#b6a0ff" />
      </View>
    );
  }

  if (session) {
    return <Redirect href="/(tabs)" />;
  }

  return <Redirect href="/(auth)/login" />;
}
