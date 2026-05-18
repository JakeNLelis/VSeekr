import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE } from '../../components/Map';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { ReportItem } from '../../components/ReportItem';
import { Chip } from '../../components/ui/Chip';
import { Typography } from '../../components/ui/Typography';
import { CATEGORIES } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

export default function MapScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const mapRef = useRef<MapView>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  
  // Filtering states
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [isSheetCollapsed, setIsSheetCollapsed] = useState(false);
  const [initialRegion, setInitialRegion] = useState<any>(null);

  useEffect(() => {
    fetchReports();
    requestLocation();
    const channel = supabase.channel('map-db-changes').on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => fetchReports()).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  async function fetchReports() {
    const { data } = await supabase.from('reports').select('*').eq('status', 'active');
    if (data) setReports(data);
  }

  async function requestLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const defaultRegion = { latitude: 10.744323, longitude: 124.791936, latitudeDelta: 0.04, longitudeDelta: 0.04 };
    
    if (status !== 'granted') {
      setInitialRegion(defaultRegion);
      return;
    }

    try {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setInitialRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.04,
        longitudeDelta: 0.04
      });
    } catch (e) { 
      console.log('Location error:', e); 
      setInitialRegion(defaultRegion);
    }
  }

  const resetFilters = () => {
    setTypeFilter('all');
    setCategoryFilter(null);
    setSearchQuery('');
  };

  const filteredReports = reports.filter(r => {
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesCategory = !categoryFilter || r.category === categoryFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery || 
      r.item_name.toLowerCase().includes(query) || 
      (r.description && r.description.toLowerCase().includes(query)) ||
      (r.location_name && r.location_name.toLowerCase().includes(query));
    
    return matchesType && matchesCategory && matchesSearch;
  });

  const isFiltered = typeFilter !== 'all' || categoryFilter !== null || searchQuery !== '';

  return (
    <View style={styles.container}>
      {initialRegion ? (
        <MapView
          ref={mapRef} provider={PROVIDER_GOOGLE} style={StyleSheet.absoluteFillObject} mapType={mapType}
          initialRegion={initialRegion}
          showsUserLocation={true} mapPadding={{ top: insets.top + 180, right: 0, bottom: 0, left: 0 }}
        >
          {filteredReports.map((report) => (
            <Marker
              key={report.id} coordinate={{ latitude: report.latitude, longitude: report.longitude }}
               onCalloutPress={() => router.push({ pathname: '/details/[id]', params: { id: report.id } } as any)}
            >
              <View style={report.type === 'lost' ? styles.mapPinLost : styles.mapPinFound}>
                <View style={report.type === 'lost' ? styles.pinInnerLost : styles.pinInnerFound} />
              </View>
            </Marker>
          ))}
        </MapView>
      ) : (
        <View style={styles.loaderContainer}>
          <ActivityIndicator size="large" color="#b6a0ff" />
        </View>
      )}

      {showFilters && (
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={() => setShowFilters(false)} 
        />
      )}

      <SafeAreaView style={styles.overlay} pointerEvents="box-none">
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]} pointerEvents="box-none">
          <View style={styles.searchContainer} pointerEvents="auto">
            <Ionicons name="search" size={20} color="#adaaaa" />
            <TextInput 
              style={styles.searchInput} 
              placeholder="Search items, locations..." 
              placeholderTextColor="#adaaaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {isFiltered && !showFilters && (
              <TouchableOpacity style={styles.clearBtn} onPress={resetFilters}>
                <Ionicons name="close-circle" size={20} color="#ff716b" />
              </TouchableOpacity>
            )}
            <TouchableOpacity 
              style={[styles.filterBtn, showFilters && styles.filterBtnActive]} 
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name={showFilters ? "options" : "options-outline"} size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          {showFilters && (
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.filtersWrapper}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chipsRow} pointerEvents="auto">
                {(['all', 'lost', 'found'] as const).map(f => (
                  <Chip key={f} label={f} active={typeFilter === f} onPress={() => setTypeFilter(f)} />
                ))}
              </ScrollView>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow} pointerEvents="auto">
                {CATEGORIES.map(cat => (
                  <TouchableOpacity 
                    key={cat} 
                    style={[styles.smallChip, categoryFilter === cat && styles.smallChipActive]} 
                    onPress={() => setCategoryFilter(categoryFilter === cat ? null : cat)}
                  >
                    <Typography variant="small" color={categoryFilter === cat ? '#fff' : '#adaaaa'}>{cat}</Typography>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity style={styles.clearAllFilters} onPress={resetFilters}>
                <Typography variant="small" color="#ff716b" weight="bold">Clear All Filters</Typography>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>

        <View style={{ flex: 1 }} pointerEvents="none" />

        <TouchableOpacity style={styles.mapTypeToggle} onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}>
           <Ionicons name={mapType === 'standard' ? 'earth' : 'map'} size={24} color="#ffffff" />
        </TouchableOpacity>

        <View style={[styles.bottomSheet, isSheetCollapsed && styles.bottomSheetCollapsed]} pointerEvents="auto">
          <TouchableOpacity style={styles.sheetHandleContainer} onPress={() => setIsSheetCollapsed(!isSheetCollapsed)}>
            <View style={styles.sheetHandle} />
          </TouchableOpacity>
          
          <View style={styles.sheetHeader}>
            <Typography variant="h3">Nearby Activity</Typography>
            <Typography variant="small" color="#adaaaa">{filteredReports.length} results</Typography>
          </View>


          {!isSheetCollapsed && (
            <ScrollView showsVerticalScrollIndicator={false}>
              {filteredReports.slice(0, 5).map((item) => (
                <ReportItem key={item.id} item={item} variant="list" onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id } } as any)} />
              ))}
              {filteredReports.length === 0 && (
                <View style={styles.emptyContainer}>
                  <Ionicons name="search-outline" size={48} color="#262626" />
                  <Typography variant="body" color="#adaaaa" style={{marginTop: 12}}>No results match your filters.</Typography>
                </View>
              )}
              <View style={{ height: 40 }} />
            </ScrollView>
          )}
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e0e' },
  mapTypeToggle: { alignSelf: 'flex-end', marginRight: 24, marginBottom: 24, backgroundColor: 'rgba(26,26,26,0.9)', width: 48, height: 48, borderRadius: 24, justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: '#484847' },
  mapPinLost: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(255, 113, 107, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(255, 113, 107, 0.5)' },
  pinInnerLost: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#ff716b' },
  mapPinFound: { width: 24, height: 24, borderRadius: 12, backgroundColor: 'rgba(63, 255, 139, 0.2)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(63, 255, 139, 0.5)' },
  pinInnerFound: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#3fff8b' },
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 10 },
  header: { paddingHorizontal: 24 },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(26, 26, 26, 0.9)', borderRadius: 999, paddingHorizontal: 16, height: 52, borderWidth: 1, borderColor: 'rgba(72, 72, 71, 0.3)' },
  searchInput: { flex: 1, color: '#ffffff', marginLeft: 10, fontSize: 16 },
  clearBtn: { marginRight: 10 },
  filterBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(182, 160, 255, 0.1)', justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: 'rgba(182, 160, 255, 0.3)' },
  filterBtnActive: { backgroundColor: '#b6a0ff', borderColor: '#b6a0ff' },
  filtersWrapper: { backgroundColor: 'rgba(26, 26, 26, 0.9)', marginTop: 12, borderRadius: 16, padding: 12, borderWidth: 1, borderColor: 'rgba(72, 72, 71, 0.3)' },
  chipsRow: { flexDirection: 'row' },
  categoryRow: { marginTop: 12, flexDirection: 'row' },
  clearAllFilters: { marginTop: 12, alignSelf: 'center', padding: 4 },
  smallChip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: '#1a1a1a', marginRight: 8, borderWidth: 1, borderColor: '#262626' },
  smallChipActive: { backgroundColor: '#262626', borderColor: '#b6a0ff' },
  bottomSheet: { backgroundColor: 'rgba(14, 14, 14, 0.95)', borderTopLeftRadius: 32, borderTopRightRadius: 32, padding: 24, borderWidth: 1, borderColor: '#262626', borderBottomWidth: 0, maxHeight: '42%' },
  bottomSheetCollapsed: { height: 150 },
  sheetHandleContainer: { width: '100%', alignItems: 'center', paddingBottom: 16, marginTop: -8 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#484847', borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },
  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0e0e0e' },
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
});
