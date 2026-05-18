import { Platform } from 'react-native';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';

export async function registerForPushNotificationsAsync(userId: string) {
  let token;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#b6a0ff',
    });
  }

  if (Device.isDevice) {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') {
      console.log('Failed to get push token for push notification!');
      return;
    }
    
    const projectId =
      Constants?.expoConfig?.extra?.eas?.projectId ?? Constants?.easConfig?.projectId;
    
    try {
        if (projectId) {
           token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
        } else {
           token = (await Notifications.getExpoPushTokenAsync()).data;
        }
    } catch (e) {
        token = (await Notifications.getExpoPushTokenAsync()).data;
    }

    if (token) {
        // Upsert to supabase profiles table
        await supabase.from('profiles').upsert({ id: userId, expo_push_token: token });
    }
    
  } else {
    console.log('Must use physical device for Push Notifications');
  }

  return token;
}
