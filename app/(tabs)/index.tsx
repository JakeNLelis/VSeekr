import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, PROVIDER_GOOGLE } from '../../components/Map';

import { ReportItem } from '../../components/ReportItem';
import { Chip } from '../../components/ui/Chip';
import { Typography } from '../../components/ui/Typography';
import { CATEGORIES } from '../../lib/constants';
import { supabase } from '../../lib/supabase';

const SCREEN_HEIGHT = Dimensions.get('window').height;
// Approximate height of the info card so we can offset the map correctly
const INFO_CARD_HEIGHT = 180;

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

  // Currently selected pin state
  const [selectedReport, setSelectedReport] = useState<any>(null);
  // Track the live region deltas so we can offset the camera without changing zoom
  const currentLatDeltaRef = useRef(0.04);
  const currentLonDeltaRef = useRef(0.04);

  // Slide-up animation for the info card
  const cardSlide = useRef(new Animated.Value(INFO_CARD_HEIGHT + 40)).current;

  useEffect(() => {
    fetchReports();
    requestLocation();

    // Setup Supabase Realtime WebSocket subscription
    const channel = supabase
      .channel('map-db-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
        if (payload.new.status === 'active') {
          setReports(prev => [...prev, payload.new]);
        }
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, (payload) => {
        setReports(prev => {
          // If a report is no longer active, remove it from the map
          if (payload.new.status !== 'active') {
            return prev.filter(r => r.id !== payload.new.id);
          }
          // If it exists, update it. If not, add it.
          const exists = prev.some(r => r.id === payload.new.id);
          if (exists) {
            return prev.map(r => r.id === payload.new.id ? payload.new : r);
          }
          return [...prev, payload.new];
        });
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reports' }, (payload) => {
        setReports(prev => prev.filter(r => r.id !== payload.old.id));
      })
      .subscribe();

    return () => { 
      supabase.removeChannel(channel); 
    };
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
        longitudeDelta: 0.04,
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

  // ─── Pin selection ────────────────────────────────────────────────────────────

  function handlePinPress(report: any) {
    setSelectedReport(report);
    setIsSheetCollapsed(false);

    // Slide the info card up
    Animated.spring(cardSlide, {
      toValue: 0,
      useNativeDriver: true,
      friction: 9,
      tension: 80,
    }).start();

    // Shift the map center southward so the pin appears near the top-center of
    // the visible area (above the info card). We preserve BOTH lat and lon deltas
    // exactly so the zoom level never changes.
    const latDelta = currentLatDeltaRef.current;
    const lonDelta = currentLonDeltaRef.current;
    const offsetLat = report.latitude - latDelta * 0.35;

    mapRef.current?.animateToRegion(
      {
        latitude: offsetLat,
        longitude: report.longitude,
        latitudeDelta: latDelta,
        longitudeDelta: lonDelta,
      },
      400,
    );
  }

  function dismissSelection() {
    Animated.timing(cardSlide, {
      toValue: INFO_CARD_HEIGHT + 40,
      duration: 250,
      useNativeDriver: true,
    }).start(() => setSelectedReport(null));
  }

  // ─────────────────────────────────────────────────────────────────────────────

  const filteredReports = reports.filter(r => {
    const matchesType = typeFilter === 'all' || r.type === typeFilter;
    const matchesCategory = !categoryFilter || r.category === categoryFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      !searchQuery ||
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
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={StyleSheet.absoluteFillObject}
          mapType={mapType}
          initialRegion={initialRegion}
          showsUserLocation={true}
          mapPadding={{ top: insets.top + 180, right: 0, bottom: 0, left: 0 }}
          onRegionChangeComplete={(region) => {
            currentLatDeltaRef.current = region.latitudeDelta;
            currentLonDeltaRef.current = region.longitudeDelta;
          }}
          // Tapping the map background dismisses the selected report card
          onPress={() => {
            if (selectedReport) dismissSelection();
            if (showFilters) setShowFilters(false);
          }}
        >
          {filteredReports.map((report) => (
            <Marker
              key={report.id}
              coordinate={{ latitude: report.latitude, longitude: report.longitude }}
              onPress={() => handlePinPress(report)}
              // Suppress the default native callout — we have our own card
              calloutAnchor={{ x: 0.5, y: 0 }}
            >
              <View style={[
                report.type === 'lost' ? styles.mapPinLost : styles.mapPinFound,
                selectedReport?.id === report.id && styles.mapPinSelected,
              ]}>
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

      {/* Filter backdrop */}
      {showFilters && (
        <TouchableOpacity
          style={styles.backdrop}
          activeOpacity={1}
          onPress={() => setShowFilters(false)}
        />
      )}

      {/* Overlay: search + filters + map toggle + bottom sheet */}
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
              <Ionicons name={showFilters ? 'options' : 'options-outline'} size={20} color="#ffffff" />
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

        <TouchableOpacity
          style={styles.mapTypeToggle}
          onPress={() => setMapType(mapType === 'standard' ? 'satellite' : 'standard')}
        >
          <Ionicons name={mapType === 'standard' ? 'earth' : 'map'} size={24} color="#ffffff" />
        </TouchableOpacity>

        {/* ── Nearby Activity sheet (visible when no pin is selected) ── */}
        {!selectedReport && (
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
                  <ReportItem
                    key={item.id}
                    item={item}
                    variant="list"
                    onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id } } as any)}
                  />
                ))}
                {filteredReports.length === 0 && (
                  <View style={styles.emptyContainer}>
                    <Ionicons name="search-outline" size={48} color="#262626" />
                    <Typography variant="body" color="#adaaaa" style={{ marginTop: 12 }}>No results match your filters.</Typography>
                  </View>
                )}
                <View style={{ height: 40 }} />
              </ScrollView>
            )}
          </View>
        )}
      </SafeAreaView>

      {/* ── Selected report info card (slides up when a pin is tapped) ── */}
      {selectedReport && (
        <Animated.View
          style={[styles.infoCard, { transform: [{ translateY: cardSlide }] }]}
          pointerEvents="auto"
        >
          {/* Dismiss handle */}
          <View style={styles.infoCardHandleRow}>
            <View style={{ flex: 1 }} />
            <View style={styles.sheetHandle} />
            <View style={{ flex: 1, alignItems: 'flex-end' }}>
              <TouchableOpacity style={styles.infoCardClose} onPress={dismissSelection}>
                <Ionicons name="close" size={18} color="#adaaaa" />
              </TouchableOpacity>
            </View>
          </View>

          <ReportItem
            item={selectedReport}
            variant="list"
            onPress={() => {
              dismissSelection();
              router.push({ pathname: '/details/[id]', params: { id: selectedReport.id } } as any);
            }}
          />
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0e0e0e' },
  mapTypeToggle: {
    alignSelf: 'flex-end', marginRight: 24, marginBottom: 24,
    backgroundColor: 'rgba(26,26,26,0.9)', width: 48, height: 48,
    borderRadius: 24, justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: '#484847',
  },

  // Pins — vivid colors + white border so they stand out on any map style
  mapPinLost: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF1744',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  pinInnerLost: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    opacity: 0.85,
  },
  mapPinFound: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#00C853',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#ffffff',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.4,
    shadowRadius: 4,
  },
  pinInnerFound: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#ffffff',
    opacity: 0.85,
  },
  // Selected — purple border instead of white
  mapPinSelected: {
    borderColor: '#b6a0ff',
    borderWidth: 3,
  },

  // Overlay
  overlay: { ...StyleSheet.absoluteFillObject, justifyContent: 'space-between', zIndex: 10 },
  header: { paddingHorizontal: 24 },
  searchContainer: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(26, 26, 26, 0.9)', borderRadius: 999,
    paddingHorizontal: 16, height: 52, borderWidth: 1,
    borderColor: 'rgba(72, 72, 71, 0.3)',
  },
  searchInput: { flex: 1, color: '#ffffff', marginLeft: 10, fontSize: 16 },
  clearBtn: { marginRight: 10 },
  filterBtn: {
    width: 36, height: 36, borderRadius: 18,
    backgroundColor: 'rgba(182, 160, 255, 0.1)',
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 1, borderColor: 'rgba(182, 160, 255, 0.3)',
  },
  filterBtnActive: { backgroundColor: '#b6a0ff', borderColor: '#b6a0ff' },
  filtersWrapper: {
    backgroundColor: 'rgba(26, 26, 26, 0.9)', marginTop: 12,
    borderRadius: 16, padding: 12, borderWidth: 1,
    borderColor: 'rgba(72, 72, 71, 0.3)',
  },
  chipsRow: { flexDirection: 'row' },
  categoryRow: { marginTop: 12, flexDirection: 'row' },
  clearAllFilters: { marginTop: 12, alignSelf: 'center', padding: 4 },
  smallChip: {
    paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8,
    backgroundColor: '#1a1a1a', marginRight: 8, borderWidth: 1, borderColor: '#262626',
  },
  smallChipActive: { backgroundColor: '#262626', borderColor: '#b6a0ff' },

  // Nearby activity bottom sheet
  bottomSheet: {
    backgroundColor: 'rgba(14, 14, 14, 0.95)',
    borderTopLeftRadius: 32, borderTopRightRadius: 32,
    padding: 24, borderWidth: 1, borderColor: '#262626',
    borderBottomWidth: 0, maxHeight: '42%',
  },
  bottomSheetCollapsed: { height: 150 },
  sheetHandleContainer: { width: '100%', alignItems: 'center', paddingBottom: 16, marginTop: -8 },
  sheetHandle: { width: 40, height: 4, backgroundColor: '#484847', borderRadius: 2 },
  sheetHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  emptyContainer: { alignItems: 'center', paddingVertical: 40 },

  // Selected report info card
  infoCard: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 20,
    backgroundColor: 'rgba(14, 14, 14, 0.97)',
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    paddingHorizontal: 24,
    paddingBottom: 32,
    paddingTop: 8,
    borderWidth: 1,
    borderColor: '#262626',
    borderBottomWidth: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 20,
  },
  infoCardHandleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingTop: 4,
  },
  infoCardClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#1a1a1a',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#262626',
  },

  loaderContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#0e0e0e' },
  backdrop: { ...StyleSheet.absoluteFillObject, zIndex: 1 },
});
