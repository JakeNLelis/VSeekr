import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Redirect, useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import MapView, { Marker, PROVIDER_GOOGLE } from "../../components/Map";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { Typography } from "../../components/ui/Typography";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";

export default function ReportDetailsScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  const router = useRouter();
  const { session, initialized } = useAuth();

  // Route guard — redirect unauthenticated users to login
  if (initialized && !session) {
    return <Redirect href="/(auth)/login" />;
  }

  const [report, setReport] = useState<any>(null);
  const [comments, setComments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [sending, setSending] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [contactProfile, setContactProfile] = useState<any>(null);
  const [closing, setClosing] = useState(false);

  const fetchReportAndComments = useCallback(
    async (showLoading = false) => {
      try {
        if (showLoading) setLoading(true);
        const { data: reportData } = await supabase
          .from("reports")
          .select("*")
          .eq("id", id)
          .single();
        setReport(reportData);

        if (reportData?.user_id) {
          const { data: profileData } = await supabase
            .from("profiles")
            .select("contact_name, contact_phone, contact_email")
            .eq("id", reportData.user_id)
            .single();
          setContactProfile(profileData || null);
        } else {
          setContactProfile(null);
        }

        const { data: commentsData } = await supabase
          .from("comments")
          .select("*")
          .eq("report_id", id)
          .order("created_at", { ascending: true });
        setComments(commentsData || []);
      } catch (err: any) {
        Alert.alert("Error", err.message);
      } finally {
        if (showLoading) setLoading(false);
      }
    },
    [id],
  );

  useEffect(() => {
    if (id) fetchReportAndComments(true);
  }, [id, fetchReportAndComments]);

  const handlePostComment = async () => {
    const commentText = newComment.trim();
    if (!commentText || !session?.user) return;

    // Optimistic Update: Add comment instantly to the UI
    const tempId = `temp-${Date.now()}`;
    const optimisticComment = {
      id: tempId,
      report_id: id,
      user_id: session.user.id,
      content: commentText,
      created_at: new Date().toISOString(),
    };

    setComments((prev) => [...prev, optimisticComment]);
    setNewComment("");

    try {
      setSending(true);
      const { error } = await supabase.from("comments").insert({
        report_id: id,
        user_id: session.user.id,
        content: commentText,
      });
      if (error) throw error;

      if (report?.user_id && report.user_id !== session.user.id) {
        // Run activities logging in the background
        supabase
          .from("activities")
          .insert({
            user_id: report.user_id,
            target_report_id: id,
            action_type: "commented",
          })
          .then(({ error: actError }) => {
            if (actError)
              console.log("Error inserting activity:", actError.message);
          });

        // Trigger push notifications in the background
        supabase.functions
          .invoke("send-push", {
            body: {
              user_id: report.user_id,
              title: "New comment",
              body: `${session?.user?.user_metadata?.username || "Someone"} commented on your report`,
              data: { route: `/details/${id}` },
            },
          })
          .then(({ error: pushError }) => {
            if (pushError)
              console.log(
                "Error invoking push notification:",
                pushError.message,
              );
          });
      }

      // Re-fetch correct timestamp/id in the background
      await fetchReportAndComments(false);
    } catch (err: any) {
      Alert.alert("Error", err.message);
      // Rollback optimistic update on failure
      setComments((prev) => prev.filter((c) => c.id !== tempId));
      setNewComment(commentText);
    } finally {
      setSending(false);
    }
  };

  const handleCloseReport = async () => {
    if (!report?.id) return;
    setClosing(true);
    const { error } = await supabase
      .from("reports")
      .update({ status: "resolved" })
      .eq("id", report.id);
    setClosing(false);
    if (error) {
      Alert.alert("Error", error.message);
      return;
    }
    setReport((prev: any) => ({ ...prev, status: "resolved" }));
  };

  if (loading || !report) {
    return (
      <View style={[styles.container, { justifyContent: "center" }]}>
        <ActivityIndicator size="large" color="#b6a0ff" />
      </View>
    );
  }

  const imageUrls =
    Array.isArray(report.image_urls) && report.image_urls.length > 0
      ? report.image_urls
      : report.image_url
        ? [report.image_url]
        : [
            "https://images.unsplash.com/photo-1626245995574-d4b6dbbca01e?q=80&w=600",
          ];

  const carouselWidth = Dimensions.get("window").width;
  const isOwner = report?.user_id && report.user_id === session?.user?.id;
  const isClosed = report?.status === "resolved";
  const displayName =
    report?.type === "found"
      ? contactProfile?.contact_name || "Finder"
      : "Anonymous";

  return (
    <SafeAreaView style={styles.container} edges={["top"]}>
      <View style={[styles.backBtnWrapper, { top: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.select({
          ios: insets.top,
          android: 0,
        })}
      >
        <ScrollView>
          <View style={styles.heroWrap}>
            <ScrollView
              horizontal
              pagingEnabled
              showsHorizontalScrollIndicator={false}
              style={styles.heroCarousel}
              onMomentumScrollEnd={(event) => {
                const index = Math.round(
                  event.nativeEvent.contentOffset.x / carouselWidth,
                );
                setActiveImageIndex(index);
              }}
            >
              {imageUrls.map((uri: string, index: number) => (
                <ImageBackground
                  key={`${uri}-${index}`}
                  source={{ uri }}
                  style={[styles.hero, { width: carouselWidth }]}
                />
              ))}
            </ScrollView>
            <LinearGradient
              colors={["transparent", "#0e0e0e"]}
              style={styles.heroOverlay}
            >
              <StatusBadge
                type={report.type}
                style={{ alignSelf: "flex-start", marginBottom: 12 }}
              />
              <Typography variant="h2">{report.item_name}</Typography>
              <View style={styles.userRow}>
                <Ionicons
                  name="person-circle-outline"
                  size={20}
                  color="#adaaaa"
                />
                <Typography variant="small">{displayName}</Typography>
              </View>
              {isClosed && (
                <Typography
                  variant="small"
                  color="#ffb86b"
                  style={styles.closedText}
                >
                  Resolved
                </Typography>
              )}
            </LinearGradient>
          </View>
          {imageUrls.length > 1 && (
            <View style={styles.dotRow}>
              {imageUrls.map((_: string, index: number) => (
                <View
                  key={`dot-${index}`}
                  style={[
                    styles.dot,
                    index === activeImageIndex && styles.dotActive,
                  ]}
                />
              ))}
            </View>
          )}

          <View style={styles.content}>
            {report.type === "found" && (
              <Card style={{ marginBottom: 24 }}>
                <Typography variant="label">Finder Contact</Typography>
                <View style={styles.contactRow}>
                  <Ionicons name="person" size={18} color="#b6a0ff" />
                  <Typography variant="body" style={styles.contactText}>
                    {contactProfile?.contact_name || "Not provided"}
                  </Typography>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="call" size={18} color="#b6a0ff" />
                  <Typography variant="body" style={styles.contactText}>
                    {contactProfile?.contact_phone || "Not provided"}
                  </Typography>
                </View>
                <View style={styles.contactRow}>
                  <Ionicons name="mail" size={18} color="#b6a0ff" />
                  <Typography variant="body" style={styles.contactText}>
                    {contactProfile?.contact_email || "Not provided"}
                  </Typography>
                </View>
              </Card>
            )}

            {isOwner && (
              <Card style={{ marginBottom: 24 }}>
                <Typography variant="label">Report Status</Typography>
                <Typography variant="body" color="#adaaaa">
                  {isClosed ? "Resolved" : "Active"}
                </Typography>
                {!isClosed && (
                  <Button
                    title="Mark as Resolved"
                    onPress={handleCloseReport}
                    loading={closing}
                    variant="outline"
                    style={styles.closeBtn}
                  />
                )}
              </Card>
            )}

            <Card style={{ marginBottom: 24 }}>
              <Typography variant="label">Location</Typography>
              <View style={styles.mapWrap}>
                <MapView
                  provider={PROVIDER_GOOGLE}
                  style={styles.map}
                  scrollEnabled={false}
                  pitchEnabled={false}
                  rotateEnabled={false}
                  zoomEnabled={false}
                  region={{
                    latitude: report.latitude,
                    longitude: report.longitude,
                    latitudeDelta: 0.003,
                    longitudeDelta: 0.003,
                  }}
                >
                  <Marker
                    coordinate={{
                      latitude: report.latitude,
                      longitude: report.longitude,
                    }}
                  >
                    <View style={styles.pin} />
                  </Marker>
                </MapView>
              </View>
              <Typography variant="small" color="#adaaaa">
                {report.location_name || "No specific location description"}
              </Typography>
            </Card>

            <Card style={{ marginBottom: 24 }}>
              <Typography variant="label">Description</Typography>
              <Typography variant="body" color="#adaaaa">
                {report.description || "No description provided."}
              </Typography>
            </Card>

            <Typography variant="label" style={{ marginLeft: 8 }}>
              Comments
            </Typography>
            {comments.map((c) => (
              <View
                key={c.id}
                style={[
                  styles.comment,
                  c.user_id === session?.user?.id && styles.myComment,
                ]}
              >
                <View
                  style={[
                    styles.bubble,
                    c.user_id === session?.user?.id && styles.myBubble,
                  ]}
                >
                  <Typography variant="small" color="#b6a0ff" weight="bold">
                    {c.user_id === session?.user?.id ? "You" : "Anonymous"}
                  </Typography>
                  <Typography variant="body">{c.content}</Typography>
                </View>
              </View>
            ))}
            {comments.length === 0 && (
              <Typography variant="small" style={{ marginLeft: 8 }}>
                No comments yet.
              </Typography>
            )}
          </View>
          <View style={{ height: 120 }} />
        </ScrollView>

        <SafeAreaView edges={["bottom"]} style={styles.inputBar}>
          <View style={styles.inputWrap}>
            <TextInput
              style={styles.input}
              placeholder="Add a comment..."
              placeholderTextColor="#767575"
              value={newComment}
              onChangeText={setNewComment}
            />
            <TouchableOpacity onPress={handlePostComment} disabled={sending}>
              <LinearGradient
                colors={["#b6a0ff", "#7e51ff"]}
                style={styles.sendBtn}
              >
                {sending ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="send" size={16} color="#fff" />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  backBtnWrapper: { position: "absolute", left: 16, zIndex: 10 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(26,26,26,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroWrap: { width: "100%", position: "relative" },
  heroCarousel: { width: "100%" },
  hero: { width: "100%", aspectRatio: 1 },
  heroOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    top: 0,
    justifyContent: "flex-end",
    padding: 24,
  },
  closedText: { marginTop: 8 },
  dotRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 10,
  },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4b4b4b" },
  dotActive: { width: 18, backgroundColor: "#b6a0ff" },
  userRow: { flexDirection: "row", alignItems: "center", marginTop: 8, gap: 6 },
  content: { padding: 16 },
  mapWrap: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    marginVertical: 12,
  },
  map: { flex: 1 },
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: "#b6a0ff",
    borderWidth: 2,
    borderColor: "#fff",
  },
  contactRow: { flexDirection: "row", alignItems: "center", marginTop: 10 },
  contactText: { marginLeft: 10 },
  closeBtn: { marginTop: 12 },
  comment: { flexDirection: "row", marginBottom: 12 },
  myComment: { justifyContent: "flex-end" },
  bubble: {
    backgroundColor: "#1a1a1a",
    padding: 12,
    borderRadius: 16,
    maxWidth: "85%",
  },
  myBubble: { backgroundColor: "#262626" },
  inputBar: {
    borderTopWidth: 1,
    borderTopColor: "#262626",
    padding: 12,
    backgroundColor: "#0e0e0e",
  },
  inputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1a1a1a",
    borderRadius: 24,
    paddingLeft: 16,
    paddingRight: 8,
    height: 52,
  },
  input: { flex: 1, color: "#fff" },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
});
