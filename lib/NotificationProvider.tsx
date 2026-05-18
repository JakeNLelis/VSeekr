import * as Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from './AuthProvider';
import { supabase } from './supabase';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
  const { session } = useAuth();
  const router = useRouter();
  const [expoPushToken, setExpoPushToken] = useState('');
  const [notification, setNotification] = useState<Notifications.Notification | null>(null);
  const notificationListener = useRef<ReturnType<typeof Notifications.addNotificationReceivedListener>>(undefined);
  const responseListener = useRef<ReturnType<typeof Notifications.addNotificationResponseReceivedListener>>(undefined);
  
  const [toast, setToast] = useState<{ message: string; route?: string } | null>(null);
  const slideAnim = useRef(new Animated.Value(-100)).current;
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (!session?.user?.id) return;

    // Register for push notifications
    registerForPushNotificationsAsync().then(token => {
      if (token) {
        setExpoPushToken(token);
        // Small delay to ensure the Supabase session is fully propagated
        setTimeout(() => saveTokenToProfile(session.user.id, token), 1500);
      }
    });

    // Realtime fallback for in-app toast
    const channel = supabase.channel('activities-realtime')
      .on('postgres_changes', { 
         event: 'INSERT', 
         schema: 'public', 
         table: 'activities',
         filter: `user_id=eq.${session.user.id}`
      }, (payload) => {
         const activity = payload.new as any;
         let message = 'New activity on your report!';
         if (activity.action_type === 'commented') message = 'Someone left a comment on your report!';
         
         // Only show toast if app is in foreground and we haven't already handled it via native
         showToast(message, `/details/${activity.target_report_id}`);
      })
      .subscribe();

    // Listener for when a notification is received while the app is foregrounded
    notificationListener.current = Notifications.addNotificationReceivedListener(notification => {
      setNotification(notification);
    });

    // Listener for when a user taps on a notification
    responseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      if (data?.route) {
        router.push(data.route as any);
      }
    });

    return () => {
      supabase.removeChannel(channel);
      notificationListener.current?.remove();
      responseListener.current?.remove();
    };
  }, [session?.user?.id]);

  const saveTokenToProfile = async (userId: string, token: string) => {
    try {
      // First try to insert, if the row already exists it will be a no-op
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ id: userId, expo_push_token: token })
        .select();

      if (insertError && insertError.code !== '23505') {
        // 23505 = unique violation (row already exists), which is fine
        // Try UPDATE as fallback if INSERT failed for non-conflict reason
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', userId);
        if (updateError) console.error('Error saving push token:', updateError);
      } else if (!insertError) {
        // INSERT succeeded (new profile row created)
        return;
      } else {
        // Row exists (23505), do an update
        const { error: updateError } = await supabase
          .from('profiles')
          .update({ expo_push_token: token })
          .eq('id', userId);
        if (updateError) console.error('Error updating push token:', updateError);
      }
    } catch (err) {
      console.error('Failed to save push token:', err);
    }
  };

  const showToast = (message: string, route?: string) => {
    setToast({ message, route });
    Animated.spring(slideAnim, {
      toValue: Math.max(insets.top, 20) + 10,
      useNativeDriver: true,
      friction: 8,
    }).start();

    setTimeout(() => {
      hideToast();
    }, 4000);
  };

  const hideToast = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 300,
      useNativeDriver: true,
    }).start(() => {
      setTimeout(() => setToast(null), 350);
    });
  };

  return (
    <View style={{ flex: 1 }}>
      {children}
      {toast && (
        <Animated.View style={[styles.toastContainer, { transform: [{ translateY: slideAnim }] }]}>
          <TouchableOpacity 
            style={styles.toastContent}
            activeOpacity={0.9} 
            onPress={() => {
               if (toast.route) router.push(toast.route as any);
               hideToast();
            }}
          >
            <View style={styles.iconBox}>
              <Ionicons name="notifications" size={20} color="#b6a0ff" />
            </View>
            <Text style={styles.toastText}>{toast.message}</Text>
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

async function registerForPushNotificationsAsync() {
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
    
    // Get the projectId from app.json via Constants
    const projectId = 
      Constants.default.expoConfig?.extra?.eas?.projectId || 
      Constants.default.easConfig?.projectId;

    if (!projectId) {
      console.log('Project ID not found in config');
      return;
    }

    try {
      token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
    } catch (e) {
      console.log('Error getting push token', e);
    }
  } else {
    // console.log('Must use physical device for Push Notifications');
  }

  return token;
}

const styles = StyleSheet.create({
  toastContainer: {
    position: 'absolute',
    left: 20,
    right: 20,
    zIndex: 9999,
  },
  toastContent: {
    backgroundColor: 'rgba(26,26,26,0.95)',
    borderRadius: 16,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#b6a0ff',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    borderWidth: 1,
    borderColor: '#3f3f3f',
  },
  iconBox: {
    backgroundColor: 'rgba(182, 160, 255, 0.1)',
    borderRadius: 12,
    padding: 8,
    marginRight: 12,
  },
  toastText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
    flex: 1,
  }
});
