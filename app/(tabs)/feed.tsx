import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View, ActivityIndicator, TouchableOpacity, TextInput } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { CATEGORIES } from '../../lib/constants';
import { Typography } from '../../components/ui/Typography';
import { ReportItem } from '../../components/ReportItem';
import { Chip } from '../../components/ui/Chip';

export default function FeedScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // Filtering states
  const [typeFilter, setTypeFilter] = useState<'all' | 'lost' | 'found'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchReports();
    const channel = supabase.channel('feed-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reports' }, () => {
        fetchReports();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function fetchReports() {
    setLoading(true);
    const { data, error } = await supabase
      .from('reports')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });
      
    if (data && !error) {
      setReports(data);
    }
    setLoading(false);
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
      {showFilters && (
        <TouchableOpacity 
          style={styles.backdrop} 
          activeOpacity={1} 
          onPress={() => setShowFilters(false)} 
        />
      )}
      <SafeAreaView style={styles.safeArea}>
        <View style={[styles.header, { paddingTop: Math.max(insets.top, 16) }]}>
          <View style={styles.headerRow}>
            <View style={{flex: 1}}>
              <Typography variant="h1">Campus Feed</Typography>
              <Typography variant="subtitle">Recent reports around you</Typography>
            </View>
            {isFiltered && (
              <TouchableOpacity style={styles.clearHeaderBtn} onPress={resetFilters}>
                 <Typography variant="small" color="#ff716b" weight="bold">Clear Filters</Typography>
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.searchBar}>
            <Ionicons name="search" size={20} color="#adaaaa" />
            <TextInput 
              style={styles.searchInput}
              placeholder="Search items, locations..."
              placeholderTextColor="#adaaaa"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity 
              style={[styles.filterBtn, showFilters && styles.filterBtnActive]} 
              onPress={() => setShowFilters(!showFilters)}
            >
              <Ionicons name={showFilters ? "options" : "options-outline"} size={20} color="#ffffff" />
            </TouchableOpacity>
          </View>
          
          {showFilters && (
            <TouchableOpacity activeOpacity={1} onPress={() => {}} style={styles.filtersWrapper}>
              <View style={styles.toggleContainer}>
                {(['all', 'lost', 'found'] as const).map((f) => (
                  <Chip 
                    key={f}
                    label={f}
                    active={typeFilter === f}
                    onPress={() => setTypeFilter(f)}
                    style={styles.chip}
                  />
                ))}
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
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

              <TouchableOpacity style={styles.clearAllBtn} onPress={resetFilters}>
                 <Typography variant="small" color="#ff716b" weight="bold">Clear All Filters</Typography>
              </TouchableOpacity>
            </TouchableOpacity>
          )}
        </View>

        <ScrollView style={styles.feedWrapper} contentContainerStyle={styles.feedContent}>
          {loading && <ActivityIndicator size="large" color="#b6a0ff" style={{ marginTop: 40 }} />}
          
          {!loading && filteredReports.length === 0 && (
            <View style={styles.emptyContainer}>
              <Ionicons name="search-outline" size={64} color="#1a1a1a" />
              <Typography style={styles.emptyText}>No reports match your filters.</Typography>
              <TouchableOpacity onPress={resetFilters} style={styles.resetBtn}>
                 <Typography color="#b6a0ff" weight="bold">Clear all filters</Typography>
              </TouchableOpacity>
            </View>
          )}

          {!loading && filteredReports.map((item) => (
            <ReportItem 
              key={item.id}
              item={item}
              onPress={() => router.push({ pathname: '/details/[id]', params: { id: item.id } } as any)}
            />
          ))}

          <View style={{ height: 100 }} />
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0e0e0e',
  },
  safeArea: {
    flex: 1,
    zIndex: 10,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    backgroundColor: '#0e0e0e',
    zIndex: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#1a1a1a',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginBottom: 8,
  },
  clearHeaderBtn: {
    padding: 8,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#131313',
    borderRadius: 12,
    paddingHorizontal: 12,
    height: 48,
    marginTop: 16,
    borderWidth: 1,
    borderColor: '#262626',
  },
  searchInput: {
    flex: 1,
    color: '#fff',
    marginLeft: 10,
    fontSize: 15,
  },
  filterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(182, 160, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(182, 160, 255, 0.3)',
    marginLeft: 8,
  },
  filterBtnActive: {
    backgroundColor: '#b6a0ff',
    borderColor: '#b6a0ff',
  },
  filtersWrapper: {
    backgroundColor: '#131313',
    marginTop: 12,
    borderRadius: 16,
    padding: 12,
    borderWidth: 1,
    borderColor: '#262626',
  },
  toggleContainer: {
    flexDirection: 'row',
    marginTop: 0,
    paddingHorizontal: 0,
  },
  chip: {
    flex: 1,
    alignItems: 'center',
    marginRight: 8,
  },
  categoryScroll: {
    marginTop: 12,
    flexDirection: 'row',
  },
  smallChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: '#1a1a1a',
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#262626',
  },
  smallChipActive: {
    backgroundColor: '#262626',
    borderColor: '#b6a0ff',
  },
  clearAllBtn: {
    marginTop: 12,
    alignSelf: 'center',
    padding: 4,
  },
  feedWrapper: {
    flex: 1,
  },
  feedContent: {
    padding: 24,
  },
  emptyContainer: {
    alignItems: 'center',
    marginTop: 80,
  },
  emptyText: {
    textAlign: 'center',
    marginTop: 16,
    color: '#adaaaa',
  },
  resetBtn: {
    marginTop: 20,
    padding: 10,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },
});
