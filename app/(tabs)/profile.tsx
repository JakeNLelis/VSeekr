import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  Alert,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Input } from "../../components/ui/Input";
import { Typography } from "../../components/ui/Typography";
import { useAuth } from "../../lib/AuthProvider";
import { supabase } from "../../lib/supabase";

export default function ProfileScreen() {
  const insets = useSafeAreaInsets();
  const { session, signOut } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState({ lost: 0, found: 0 });
  const [contactName, setContactName] = useState('');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [savingContact, setSavingContact] = useState(false);

  const fetchStats = useCallback(async () => {
    const { data } = await supabase
      .from('reports')
      .select('type')
      .eq('user_id', session?.user?.id);
    if (data) {
      const counts = data.reduce(
        (acc, r) => {
          if (r.type === 'lost') acc.lost++;
          if (r.type === 'found') acc.found++;
          return acc;
        },
        { lost: 0, found: 0 },
      );
      setStats(counts);
    }
  }, [session?.user?.id]);

  useEffect(() => {
    if (session?.user?.id) fetchStats();
  }, [session?.user?.id, fetchStats]);

  const fetchProfile = useCallback(async () => {
    if (!session?.user?.id) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('contact_name, contact_phone, contact_email')
      .eq('id', session.user.id)
      .single();
    if (!error && data) {
      setContactName(data.contact_name ?? '');
      setContactPhone(data.contact_phone ?? '');
      setContactEmail(data.contact_email ?? '');
    }
  }, [session?.user?.id]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  async function handleSaveContact() {
    if (!session?.user?.id) return;
    setSavingContact(true);
    const { error } = await supabase.from('profiles').upsert({
      id: session.user.id,
      contact_name: contactName.trim() || null,
      contact_phone: contactPhone.trim() || null,
      contact_email: contactEmail.trim() || null,
    });
    setSavingContact(false);
    if (error) Alert.alert('Error', error.message);
    else Alert.alert('Saved', 'Contact details updated.');
  }

  async function handleLogout() {
    // signOut calls supabase.auth.signOut(); the AuthProvider's
    // onAuthStateChange listener will redirect to /(auth)/login.
    await signOut();
  }

  async function handleDeleteAccount() {
    Alert.alert('Delete Account', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          const { error } = await supabase.rpc('delete_user');
          if (error) Alert.alert('Error', error.message);
          else {
            await signOut();
          }
        },
      },
    ]);
  }

  const email = session?.user?.email || "";
  const username = session?.user?.user_metadata?.username || "Unknown User";

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: Math.max(insets.top, 24) },
        ]}
      >
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <View style={styles.avatarCircle}>
              <Typography variant="h3">
                {email.substring(0, 1).toUpperCase()}
              </Typography>
            </View>
            <View style={styles.onlineBadge} />
          </View>
          <View style={{ flex: 1 }}>
            <Typography variant="h3">{username}</Typography>
            <Typography variant="small">{email}</Typography>
          </View>
          <TouchableOpacity style={styles.editBtn}>
            <Ionicons name="pencil" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <Card style={styles.statsRow}>
          <StatItem label="Items Lost" value={stats.lost} />
          <View style={styles.divider} />
          <StatItem
            label="Found & Returned"
            value={stats.found}
            color="#3fff8b"
          />
        </Card>

        <Section title="Contact Details">
          <View style={styles.contactForm}>
            <Input
              label="Name"
              placeholder="Your name"
              value={contactName}
              onChangeText={setContactName}
            />
            <Input
              label="Phone"
              placeholder="Your phone"
              keyboardType="phone-pad"
              value={contactPhone}
              onChangeText={setContactPhone}
            />
            <Input
              label="Email"
              placeholder="Your email"
              keyboardType="email-address"
              autoCapitalize="none"
              value={contactEmail}
              onChangeText={setContactEmail}
            />
            <Button
              title="Save Contact Details"
              onPress={handleSaveContact}
              loading={savingContact}
              style={styles.contactSaveBtn}
            />
          </View>
        </Section>

        <Section title="Account Settings">
          <ListItem icon="notifications-outline" label="Push Notifications" />
          <ListItem icon="location-outline" label="Frequent Locations" />
          <ListItem icon="lock-closed-outline" label="Privacy & Security" />
        </Section>

        <Section title="Support">
          <ListItem icon="help-circle-outline" label="Help Center" />
          <ListItem
            icon="log-out-outline"
            label="Log Out"
            color="#ff716b"
            onPress={handleLogout}
          />
          <ListItem
            icon="trash-outline"
            label="Delete Account"
            color="#ff716b"
            onPress={handleDeleteAccount}
            last
          />
        </Section>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const StatItem = ({ label, value, color = "#fff" }: any) => (
  <View style={styles.statBox}>
    <Typography variant="h3" color={color}>
      {value}
    </Typography>
    <Typography variant="small">{label}</Typography>
  </View>
);

const Section = ({ title, children }: any) => (
  <View style={{ marginBottom: 32 }}>
    <Typography variant="label">{title}</Typography>
    <Card style={{ padding: 0 }}>{children}</Card>
  </View>
);

const ListItem = ({ icon, label, color = "#fff", onPress, last }: any) => (
  <TouchableOpacity
    style={[styles.listItem, !last && styles.listBorder]}
    onPress={onPress}
  >
    <View style={styles.iconBox}>
      <Ionicons
        name={icon}
        size={20}
        color={color === "#fff" ? "#b6a0ff" : color}
      />
    </View>
    <Typography variant="body" color={color} style={{ flex: 1 }}>
      {label}
    </Typography>
    <Ionicons name="chevron-forward" size={20} color="#484847" />
  </TouchableOpacity>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  scrollContent: { padding: 24 },
  profileHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 32,
  },
  avatarContainer: { position: "relative", marginRight: 16 },
  avatarCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "#262626",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#b6a0ff",
  },
  onlineBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: "#3fff8b",
    borderWidth: 3,
    borderColor: "#0e0e0e",
  },
  editBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1a1a1a",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#262626",
  },
  statsRow: { flexDirection: "row", paddingVertical: 20, marginBottom: 32 },
  statBox: { flex: 1, alignItems: "center" },
  divider: { width: 1, backgroundColor: "#262626" },
  listItem: { flexDirection: "row", alignItems: "center", padding: 16 },
  listBorder: { borderBottomWidth: 1, borderBottomColor: "#262626" },
  contactForm: { padding: 16 },
  contactSaveBtn: { marginTop: 8 },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.05)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
});
