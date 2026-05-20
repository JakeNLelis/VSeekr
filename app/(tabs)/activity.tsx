import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { TouchableOpacity } from "react-native-gesture-handler";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";

// Helper to format timestamps loosely
function timeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  return `${Math.floor(diffInSeconds / 86400)}d ago`;
}

export default function ActivityScreen() {
  const insets = useSafeAreaInsets();
  const { session } = useAuth();
  const user = session?.user;
  const router = useRouter();
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActivities = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from("activities")
        .select(
          `
          *,
          reports (
            id,
            item_name,
            status,
            type
          )
        `,
        )
        .eq("user_id", user?.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setActivities(data || []);
    } catch (err: any) {
      console.log("Error fetching activities:", err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchActivities();
      }
    }, [user, fetchActivities])
  );

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel(`activities-realtime-feed-${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "activities",
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          try {
            const { data, error } = await supabase
              .from("activities")
              .select(
                `
                *,
                reports (
                  id,
                  item_name,
                  status,
                  type
                )
              `,
              )
              .eq("id", payload.new.id)
              .single();

            if (!error && data) {
              setActivities((prev) => {
                if (prev.some((a) => a.id === data.id)) return prev;
                return [data, ...prev];
              });
            }
          } catch (err) {
            console.log("Error handling real-time activity:", err);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchActivities();
  }, [fetchActivities]);

  const navigateToReport = (reportId: string) => {
    if (!reportId) return;
    router.push({ pathname: "/details/[id]", params: { id: reportId } } as any);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <Text style={styles.heroTitle}>Activity</Text>
        <Text style={styles.subtitle}>Stay updated on your items</Text>
      </View>

      <ScrollView
        style={styles.scrollContent}
        contentContainerStyle={styles.scrollContentContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#b6a0ff"
          />
        }
      >
        {loading ? (
          <ActivityIndicator color="#b6a0ff" style={{ marginTop: 40 }} />
        ) : activities.length === 0 ? (
          <Text style={styles.emptyState}>No recent activity to show.</Text>
        ) : (
          activities.map((act) => {
            const report = act.reports;
            if (!report) return null;

            const isNearby = act.action_type === 'nearby_report';

            return (
              <TouchableOpacity
                key={act.id}
                style={[styles.activityCard, styles.activityCardUnread]}
                onPress={() => navigateToReport(report.id)}
              >
                <View style={[styles.iconContainerPrimary, isNearby && styles.iconContainerNearby]}>
                  <Ionicons
                    name={isNearby ? 'location' : 'chatbubble-ellipses'}
                    size={20}
                    color={isNearby ? '#3fff8b' : '#b6a0ff'}
                  />
                </View>
                <View style={styles.cardContent}>
                  {isNearby ? (
                    <Text style={styles.activityText}>
                      A new{' '}
                      <Text style={styles.boldText}>
                        {report.type === 'lost' ? 'Lost' : 'Found'}
                      </Text>{' '}report for{' '}
                      <Text style={styles.boldText}>{report.item_name}</Text>
                      {' '}was posted near your area
                    </Text>
                  ) : (
                    <Text style={styles.activityText}>
                      A user{' '}
                      <Text style={styles.boldText}>{act.action_type}</Text> on
                      your {report.status} report{' '}
                      <Text style={styles.boldText}>{report.item_name}</Text>
                    </Text>
                  )}
                  <Text style={styles.timeText}>{timeAgo(act.created_at)}</Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0e0e0e",
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
  },
  heroTitle: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#ffffff",
    fontFamily: Platform.select({ ios: "System", default: "sans-serif" }),
  },
  subtitle: {
    fontSize: 16,
    color: "#adaaaa",
    marginTop: 8,
  },
  scrollContent: {
    flex: 1,
  },
  scrollContentContainer: {
    padding: 24,
  },
  emptyState: {
    color: "#adaaaa",
    textAlign: "center",
    marginTop: 40,
    fontSize: 16,
  },
  activityCard: {
    flexDirection: "row",
    backgroundColor: "#131313",
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#262626",
    alignItems: "center",
  },
  activityCardUnread: {
    backgroundColor: "#1a1a1a",
    borderColor: "rgba(182, 160, 255, 0.2)",
  },
  iconContainerPrimary: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(182, 160, 255, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  iconContainerNearby: {
    backgroundColor: "rgba(63, 255, 139, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(63, 255, 139, 0.2)",
  },
  cardContent: {
    flex: 1,
  },
  activityText: {
    color: "#ffffff",
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  boldText: {
    fontWeight: "bold",
  },
  timeText: {
    color: "#adaaaa",
    fontSize: 13,
  },
});
