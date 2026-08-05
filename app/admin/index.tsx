import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";

import { Button } from "../../components/ui/Button";
import { Card } from "../../components/ui/Card";
import { Typography } from "../../components/ui/Typography";
import { supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/AuthProvider";

export default function AdminDashboardScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { session } = useAuth();
  
  const [activeTab, setActiveTab] = useState<'reports' | 'users'>('reports');
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);

  const fetchReports = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('moderation_reports')
      .select('*, profiles!moderation_reports_reporter_id_fkey(contact_name, contact_email)')
      .eq('status', 'pending')
      .order('created_at', { ascending: false });
      
    if (error) {
      Alert.alert("Error", "Could not fetch reports");
    } else {
      setReports(data || []);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleActionOnReport = async (report: any, action: 'confirmed' | 'dismissed') => {
    try {
      if (action === 'confirmed') {
        // Find offender ID
        let offenderId = null;
        if (report.item_type === 'report') {
          const { data: itemData } = await supabase.from('reports').select('user_id').eq('id', report.reported_item_id).single();
          offenderId = itemData?.user_id;
          await supabase.from('reports').delete().eq('id', report.reported_item_id);
        } else {
          const { data: itemData } = await supabase.from('comments').select('user_id').eq('id', report.reported_item_id).single();
          offenderId = itemData?.user_id;
          await supabase.from('comments').delete().eq('id', report.reported_item_id);
        }

        if (offenderId) {
          // Add strike
          const { data: profile } = await supabase.from('profiles').select('strikes, role').eq('id', offenderId).single();
          if (profile && profile.role !== 'admin') { 
            const newStrikes = (profile.strikes || 0) + 1;
            const isBanned = newStrikes >= 5;
            await supabase.from('profiles').update({ strikes: newStrikes, is_banned: isBanned }).eq('id', offenderId);
          }
        }
      }

      // Update report status
      await supabase.from('moderation_reports').update({ status: action }).eq('id', report.id);
      
      fetchReports();
      Alert.alert("Success", `Report has been ${action}.`);
    } catch (e: any) {
      Alert.alert("Error processing report", e.message);
    }
  };

  const handleSearchUsers = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`contact_name.ilike.%${searchQuery}%,contact_email.ilike.%${searchQuery}%`)
      .limit(10);
      
    if (error) {
      Alert.alert("Error", error.message);
    } else {
      setSearchResults(data || []);
    }
    setSearching(false);
  };

  const updateUserRole = async (userId: string, newRole: string) => {
    const { error } = await supabase.from('profiles').update({ role: newRole }).eq('id', userId);
    if (error) Alert.alert("Error", error.message);
    else handleSearchUsers();
  };

  const toggleBanUser = async (userId: string, currentBanState: boolean) => {
    const { error } = await supabase.from('profiles').update({ is_banned: !currentBanState }).eq('id', userId);
    if (error) Alert.alert("Error", error.message);
    else handleSearchUsers();
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Typography variant="h3" style={{ marginLeft: 16 }}>Admin Dashboard</Typography>
      </View>

      <View style={styles.tabsRow}>
        <TouchableOpacity style={[styles.tab, activeTab === 'reports' && styles.activeTab]} onPress={() => setActiveTab('reports')}>
          <Typography variant="body" color={activeTab === 'reports' ? '#b6a0ff' : '#adaaaa'} weight="bold">Reports</Typography>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tab, activeTab === 'users' && styles.activeTab]} onPress={() => setActiveTab('users')}>
          <Typography variant="body" color={activeTab === 'users' ? '#b6a0ff' : '#adaaaa'} weight="bold">Users</Typography>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        {activeTab === 'reports' ? (
          loading ? (
            <ActivityIndicator size="large" color="#b6a0ff" />
          ) : reports.length === 0 ? (
            <Typography variant="body" color="#adaaaa" style={{textAlign: 'center', marginTop: 40}}>No pending reports.</Typography>
          ) : (
            reports.map(report => (
              <Card key={report.id} style={{ marginBottom: 16 }}>
                <View style={{flexDirection: 'row', justifyContent: 'space-between'}}>
                  <Typography variant="label" color="#ff716b">{report.category}</Typography>
                  <Typography variant="small" color="#adaaaa">{report.item_type.toUpperCase()}</Typography>
                </View>
                <Typography variant="small" style={{marginTop: 8}}>Reporter: {report.profiles?.contact_email || 'Unknown'}</Typography>
                {report.additional_info ? (
                  <Typography variant="body" style={{marginTop: 8, fontStyle: 'italic'}}>"{report.additional_info}"</Typography>
                ) : null}
                <View style={{ flexDirection: 'row', gap: 12, marginTop: 16 }}>
                  <Button title="Confirm Violation" onPress={() => handleActionOnReport(report, 'confirmed')} style={{flex: 1, backgroundColor: '#ff716b'}} />
                  <Button title="Dismiss" variant="outline" onPress={() => handleActionOnReport(report, 'dismissed')} style={{flex: 1}} />
                </View>
              </Card>
            ))
          )
        ) : (
          <View>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder="Search by name or email..."
                placeholderTextColor="#767575"
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearchUsers}
              />
              <Button title="Search" onPress={handleSearchUsers} loading={searching} />
            </View>
            
            {searchResults.map(user => (
              <Card key={user.id} style={{ marginBottom: 12 }}>
                <Typography variant="h3">{user.contact_name || 'No Name'}</Typography>
                <Typography variant="small" color="#adaaaa">{user.contact_email || 'No Email'}</Typography>
                <View style={{flexDirection: 'row', justifyContent: 'space-between', marginTop: 8}}>
                  <Typography variant="small">Role: {user.role}</Typography>
                  <Typography variant="small">Strikes: {user.strikes}</Typography>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
                  {user.role !== 'admin' && (
                    <Button title="Make Admin" onPress={() => updateUserRole(user.id, 'admin')} style={{flex: 1}} />
                  )}
                  {user.role === 'admin' && (
                    <Button title="Remove Admin" variant="outline" onPress={() => updateUserRole(user.id, 'user')} style={{flex: 1}} />
                  )}
                  <Button 
                    title={user.is_banned ? "Unban" : "Ban"} 
                    onPress={() => toggleBanUser(user.id, user.is_banned)} 
                    style={{flex: 1, backgroundColor: user.is_banned ? '#3fff8b' : '#ff716b'}} 
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
        <View style={{height: 100}} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0e0e0e" },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#262626' },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "#1a1a1a", justifyContent: "center", alignItems: "center", borderWidth: 1, borderColor: '#262626' },
  tabsRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#262626' },
  tab: { flex: 1, paddingVertical: 16, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  activeTab: { borderBottomColor: '#b6a0ff' },
  scrollContent: { padding: 16 },
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 24 },
  searchInput: { flex: 1, backgroundColor: '#1a1a1a', borderRadius: 12, paddingHorizontal: 16, color: '#fff', borderWidth: 1, borderColor: '#262626' }
});
